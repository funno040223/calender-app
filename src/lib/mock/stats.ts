import type { Habit } from "@/lib/scheduler";
import { DAY_MS, MIN, TZ } from "./jst";
import { dateKeyOf, dayStartOfKey, type HabitMark, type MockData } from "./model";

/** 予定の起床から、この分数までに「起きた」を押せたら予定どおり */
export const WAKE_GRACE_MINUTES = 30;

type Data = Pick<MockData, "wakeLogs" | "habitLogs" | "habits" | "taskBlockLog" | "rewardSpends" | "rewardRates"> &
  Partial<Pick<MockData, "bedLogs" | "eveningEnergy">>;

/** 予定の就寝から、この分数までに「寝る」を押せたら予定どおり */
export const BED_GRACE_MINUTES = 15;
export const bedOnTime = (l: { at: number; plannedBed: number }) => l.at <= l.plannedBed + BED_GRACE_MINUTES * MIN;

/** 習慣の1回ぶん。5分だけは、5分以下の習慣なら1回、ほかは半分 */
export const markValue = (m: HabitMark | undefined, habit: Pick<Habit, "durationMinutes">) =>
  m === "done" || (m === "five" && habit.durationMinutes <= 5) ? 1 : m === "five" ? 0.5 : 0;

/**
 * 習慣の時間を変えるときに、これまでの記録の値を残す。5分以下の習慣の「5分」は1回ぶんなので、
 * 5分より長くするなら「やった」に書き換える（ご褒美と回数がさかのぼって減らないように）
 */
export function keepMarkValues(logs: Data["habitLogs"], habit: Pick<Habit, "id" | "durationMinutes">, nextMinutes: number): Data["habitLogs"] {
  if (habit.durationMinutes > 5 || nextMinutes <= 5) return logs;
  return Object.fromEntries(
    Object.entries(logs).map(([day, marks]) => [day, marks[habit.id] === "five" ? { ...marks, [habit.id]: "done" as const } : marks]),
  );
}

const wakeOk = (l: MockData["wakeLogs"][number]) =>
  l.wokeAt !== undefined && l.plannedWake !== undefined && l.wokeAt <= l.plannedWake + WAKE_GRACE_MINUTES * MIN;

export interface PeriodStats {
  wake: { done: number; total: number };
  routine: { done: number; total: number };
  habit: { done: number; expected: number };
  task: { done: number; total: number };
}

/** 各行の記録を始めた日（0:00）。これより前の日は数えない */
function startsOf(data: Data) {
  const min = (xs: (number | undefined)[]) => Math.min(Infinity, ...xs.map((x) => x ?? Infinity));
  return {
    wake: min(data.wakeLogs.filter((l) => l.plannedWake !== undefined).map((l) => dayStartOfKey(l.date))),
    routine: min(data.wakeLogs.map((l) => dayStartOfKey(l.date))),
    habit: min(Object.keys(data.habitLogs).map((k) => dayStartOfKey(k))),
    task: min(Object.values(data.taskBlockLog).map((b) => dayStartOfKey(dateKeyOf(b.start)))),
  };
}

/** [from, to) の日（0:00）の、予定どおりできた数 */
export function periodStats(data: Data, from: number, to: number, now: number): PeriodStats {
  const st = startsOf(data);
  const last = Math.min(to, (dayStartOfKey(dateKeyOf(now)) ?? now) + DAY_MS);
  const daysFrom = (start: number) => Math.max(0, Math.round((last - Math.max(from, start)) / DAY_MS));
  const inRange = (key: string) => {
    const d = dayStartOfKey(key);
    return d !== undefined && d >= from && d < to;
  };
  const logs = data.wakeLogs.filter((l) => inRange(l.date));
  const tracked = data.habits.filter((h) => h.track);
  const habitDays = daysFrom(st.habit);
  const expected = tracked.reduce(
    (sum, h) => sum + (h.frequency.type === "weekly" ? (h.frequency.times * habitDays) / 7 : h.frequency.type === "daily" ? habitDays : 0),
    0,
  );
  let habitDone = 0;
  for (const [key, marks] of Object.entries(data.habitLogs)) {
    if (!inRange(key)) continue;
    for (const h of tracked) habitDone += markValue(marks[h.id], h);
  }
  const blocks = Object.values(data.taskBlockLog).filter((b) => b.start >= from && b.start < to && b.start <= now);
  return {
    wake: { done: logs.filter(wakeOk).length, total: daysFrom(st.wake) },
    routine: { done: logs.filter((l) => l.routineDoneAt !== undefined).length, total: daysFrom(st.routine) },
    habit: { done: habitDone, expected: Math.round(expected) },
    task: { done: blocks.filter((b) => b.doneAt !== undefined).length, total: blocks.length },
  };
}

/** ご褒美がたまったもと */
export type RewardSource = "wake" | "routine" | "bed" | "habit" | "task" | "log";
export const REWARD_SOURCES: { id: RewardSource; label: string }[] = [
  { id: "wake", label: "起床" },
  { id: "routine", label: "朝ルーティン" },
  { id: "bed", label: "就寝" },
  { id: "habit", label: "習慣" },
  { id: "task", label: "タスク" },
  { id: "log", label: "記録" },
];

/** ご褒美のお金の、もとごとのたまった額（円）。[from, to) を渡せばその間だけ */
export function rewardBreakdown(data: Data, from = -Infinity, to = Infinity): Record<RewardSource, number> {
  const r = data.rewardRates;
  const inRange = (t: number | undefined) => t !== undefined && t >= from && t < to;
  const yen: Record<RewardSource, number> = { wake: 0, routine: 0, bed: 0, habit: 0, task: 0, log: 0 };
  for (const l of data.wakeLogs) {
    if (wakeOk(l) && inRange(l.wokeAt)) yen.wake += r.wake;
    if (inRange(l.routineDoneAt)) yen.routine += r.routine;
    // 記録をつけた（朝の疲れ・睡眠時間）。その日の分として数える
    const day = dayStartOfKey(l.date);
    if (inRange(day)) yen.log += ((l.fatigue !== undefined ? 1 : 0) + (l.sleepMinutes !== undefined ? 1 : 0)) * (r.log ?? 0);
  }
  for (const key of Object.keys(data.eveningEnergy ?? {})) if (inRange(dayStartOfKey(key))) yen.log += r.log ?? 0;
  for (const l of Object.values(data.bedLogs ?? {})) if (inRange(l.at) && bedOnTime(l)) yen.bed += r.bed ?? 0;
  for (const [key, marks] of Object.entries(data.habitLogs)) {
    const day = dayStartOfKey(key);
    if (day === undefined || !inRange(day)) continue;
    // 「記録する」の習慣だけ。消した習慣の記録も、たまった分として残す
    for (const [id, m] of Object.entries(marks)) {
      const h = data.habits.find((x) => x.id === id);
      if (h && !h.track) continue;
      yen.habit += markValue(m, h ?? { durationMinutes: Infinity }) * r.habit;
    }
  }
  for (const b of Object.values(data.taskBlockLog)) if (inRange(b.doneAt)) yen.task += r.task;
  return yen;
}

/** ご褒美のお金の、たまった合計（円）。[from, to) を渡せばその間だけ */
export function rewardEarned(data: Data, from = -Infinity, to = Infinity): number {
  return Math.round(Object.values(rewardBreakdown(data, from, to)).reduce((a, b) => a + b, 0));
}

/** その日（0:00）を含む週の月曜 0:00 */
export const mondayOf = (day: number) => day - ((new Date(day + TZ * MIN).getUTCDay() + 6) % 7) * DAY_MS;

/**
 * [from, to) に始まった作業の枠の、予定の時間と作業した時間（分）。
 * 作業した時間は、進み具合で「予定どおり」「完了」「残り時間を直した」と答えた枠の時間（「できなかった」は数えない）
 */
export function workMinutes(data: Pick<MockData, "taskBlockLog">, from: number, to: number): { worked: number; planned: number } {
  let worked = 0;
  let planned = 0;
  for (const b of Object.values(data.taskBlockLog)) {
    if (b.start < from || b.start >= to) continue;
    const len = (b.end - b.start) / MIN;
    planned += len;
    worked += b.workedMinutes ?? (b.outcome && b.outcome !== "none" ? len : b.counted ? len : 0);
  }
  return { worked: Math.round(worked), planned: Math.round(planned) };
}

/** 予定どおりに寝た夜の数。数えるのは記録を始めた日から、終わった夜（今夜は「寝る」を押したときだけ） */
export function bedStats(data: Pick<MockData, "bedLogs">, from: number, to: number, now: number): { done: number; total: number } {
  const start = Math.min(Infinity, ...Object.keys(data.bedLogs).map((k) => dayStartOfKey(k) ?? Infinity));
  let done = 0;
  let total = 0;
  for (let d = Math.max(from, start); d < to && d <= now; d += DAY_MS) {
    const log = data.bedLogs[dateKeyOf(d)];
    // その日の夜は、翌朝4時までは寝ていないかもしれない
    if (!log && now < d + DAY_MS + 4 * 60 * MIN) continue;
    total++;
    if (log && bedOnTime(log)) done++;
  }
  return { done, total };
}

/** 今週の習慣：月〜日の記録、回数、週の目安（毎日なら7、週○回ならその回数。間隔の習慣は目安なし）、続き具合 */
export function habitWeeks(data: Pick<MockData, "habitLogs" | "habits">, monday: number, now: number) {
  return data.habits
    .filter((h) => h.track)
    .map((habit) => {
      const marks = Array.from({ length: 7 }, (_, i) => data.habitLogs[dateKeyOf(monday + i * DAY_MS)]?.[habit.id]);
      const done = marks.reduce((s, m) => s + markValue(m, habit), 0);
      const target = habit.frequency.type === "daily" ? 7 : habit.frequency.type === "weekly" ? habit.frequency.times : undefined;
      return { habit, marks, done, target, progress: habitProgress(data, habit, now) };
    });
}

/** 使える残り（円）。減らすのは、使った記録だけ */
export const rewardBalance = (data: Data) => rewardEarned(data) - data.rewardSpends.reduce((s, x) => s + x.amount, 0);

/**
 * 習慣の続き具合：連続した日数（毎日の習慣は今日か昨日まで続いている日数、週○回の習慣は続いている週の数）と、
 * 直近2週間の回数と予定の回数（型を守れた割合）
 */
export function habitProgress(
  data: Pick<MockData, "habitLogs">,
  habit: Habit,
  now: number,
): { streak: number; unit: "日" | "週"; done: number; expected: number } {
  const today = dayStartOfKey(dateKeyOf(now)) ?? now;
  const marked = (day: number) => markValue(data.habitLogs[dateKeyOf(day)]?.[habit.id], habit) > 0;
  let done = 0;
  for (let i = 0; i < 14; i++) done += markValue(data.habitLogs[dateKeyOf(today - i * DAY_MS)]?.[habit.id], habit);
  if (habit.frequency.type === "weekly") {
    const times = habit.frequency.times;
    // 今週はまだ途中なので、先週から数える（今週もう達していれば今週も入れる）
    const countWeek = (end: number) => Array.from({ length: 7 }, (_, i) => end - i * DAY_MS).filter(marked).length;
    let streak = countWeek(today) >= times ? 1 : 0;
    for (let w = 1; w < 52 && countWeek(today - w * 7 * DAY_MS) >= times; w++) streak++;
    return { streak, unit: "週", done, expected: times * 2 };
  }
  // 今日まだなら昨日から数える
  let streak = 0;
  for (let i = marked(today) ? 0 : 1; i < 400 && marked(today - i * DAY_MS); i++) streak++;
  return { streak, unit: "日", done, expected: habit.frequency.type === "daily" ? 14 : 0 };
}

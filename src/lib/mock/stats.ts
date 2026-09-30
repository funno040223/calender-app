import type { Habit } from "@/lib/scheduler";
import { DAY_MS, MIN } from "./jst";
import { dateKeyOf, dayStartOfKey, type HabitMark, type MockData } from "./model";

/** 予定の起床から、この分数までに「起きた」を押せたら予定どおり */
export const WAKE_GRACE_MINUTES = 30;

type Data = Pick<MockData, "wakeLogs" | "habitLogs" | "habits" | "taskBlockLog" | "rewardSpends" | "rewardRates">;

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

/** ご褒美のお金の、たまった合計（円）。[from, to) を渡せばその間だけ */
export function rewardEarned(data: Data, from = -Infinity, to = Infinity): number {
  const r = data.rewardRates;
  const inRange = (t: number | undefined) => t !== undefined && t >= from && t < to;
  let yen = 0;
  for (const l of data.wakeLogs) {
    if (wakeOk(l) && inRange(l.wokeAt)) yen += r.wake;
    if (inRange(l.routineDoneAt)) yen += r.routine;
  }
  for (const [key, marks] of Object.entries(data.habitLogs)) {
    const day = dayStartOfKey(key);
    if (day === undefined || !inRange(day)) continue;
    // 「記録する」の習慣だけ。消した習慣の記録も、たまった分として残す
    for (const [id, m] of Object.entries(marks)) {
      const h = data.habits.find((x) => x.id === id);
      if (h && !h.track) continue;
      yen += markValue(m, h ?? { durationMinutes: Infinity }) * r.habit;
    }
  }
  for (const b of Object.values(data.taskBlockLog)) if (inRange(b.doneAt)) yen += r.task;
  return Math.round(yen);
}

/** 使える残り（円）。減らすのは、使った記録だけ */
export const rewardBalance = (data: Data) => rewardEarned(data) - data.rewardSpends.reduce((s, x) => s + x.amount, 0);

/** 1日のマスの状態。full＝できた、part＝一部（5分だけ・枠の一部）、miss＝できなかった、none＝予定がない・記録を始める前 */
export type CellState = "full" | "part" | "miss" | "none";
export interface DayCell {
  state: CellState;
  /** 押したときに出す説明 */
  detail: string;
}
export type GridRow = "wake" | "routine" | "habit" | "task";

/** 日ごと（days は各日の 0:00）の、起床・朝ルーティン・習慣・タスクの枠のマス */
export function dailyGrid(data: Data, days: number[], now: number): Record<GridRow, DayCell[]> {
  const out: Record<GridRow, DayCell[]> = { wake: [], routine: [], habit: [], task: [] };
  const tracked = data.habits.filter((h) => h.track);
  const st = startsOf(data);
  for (const d of days) {
    const key = dateKeyOf(d);
    const future = d > now;
    const log = data.wakeLogs.find((l) => l.date === key);
    out.wake.push(
      future || d < st.wake || log?.plannedWake === undefined
        ? { state: "none", detail: "記録なし" }
        : wakeOk(log)
          ? { state: "full", detail: "予定どおり" }
          : { state: "miss", detail: log.wokeAt === undefined ? "押していない" : "30分より遅い" },
    );
    out.routine.push(
      future || d < st.routine || !log
        ? { state: "none", detail: "記録なし" }
        : log.routineDoneAt !== undefined
          ? { state: "full", detail: "終えた" }
          : { state: "miss", detail: "終えていない" },
    );
    const marks = data.habitLogs[key] ?? {};
    const done = tracked.filter((h) => marks[h.id]);
    const v = tracked.reduce((s, h) => s + markValue(marks[h.id], h), 0);
    out.habit.push(
      future || d < st.habit || tracked.length === 0
        ? { state: "none", detail: "記録なし" }
        : {
            state: v >= 1 ? "full" : v > 0 ? "part" : "miss",
            detail: done.length ? done.map((h) => `${h.name} ${marks[h.id] === "five" ? "5分" : "やった"}`).join("・") : "なし",
          },
    );
    const blocks = Object.values(data.taskBlockLog).filter((b) => b.start >= d && b.start < d + DAY_MS && b.start <= now);
    const n = blocks.filter((b) => b.doneAt !== undefined).length;
    out.task.push(
      blocks.length === 0
        ? { state: "none", detail: "枠なし" }
        : { state: n === blocks.length ? "full" : n > 0 ? "part" : "miss", detail: `${n} / ${blocks.length}` },
    );
  }
  return out;
}

/** 日ごとの、たまった金額と使った金額（円） */
export function dailyReward(data: Data, days: number[]): { day: number; earned: number; spent: number }[] {
  return days.map((d) => ({
    day: d,
    earned: rewardEarned(data, d, d + DAY_MS),
    spent: data.rewardSpends.filter((s) => s.at >= d && s.at < d + DAY_MS).reduce((a, s) => a + s.amount, 0),
  }));
}

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

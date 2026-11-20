import type { Habit } from "@/lib/scheduler";
import { LEGACY_EXERCISE_HABIT, type Exercise, type LifeProjection } from "@/lib/life/model";
import { DAY_MS, MIN, TZ } from "./jst";
import { dateKeyOf, dayStartOfKey, type HabitMark, type MockData, type RewardBank, type RewardSource } from "./model";
import { usedSlotMinutes } from "./progress";
import { allNights, bedOnTimeOf, bedTimeOf, upOnTime } from "./night";

type Data = Pick<MockData, "wakeLogs" | "habitLogs" | "habits" | "taskBlockLog" | "rewardSpends" | "rewardRates"> &
  Partial<Pick<MockData, "sleepLogs" | "eveningEnergy" | "healthSleep" | "dayLogs" | "settings" | "rewardBank">> &
  { lifeExercise?: readonly Exercise[] };

export function withLifeExerciseRewards<T extends Data>(data: T, projection: Pick<LifeProjection, "exercise">) {
  return { ...data, lifeExercise: Object.values(projection.exercise).map(({ value }) => value) };
}

const EXERCISE_REWARD_IDS: Record<Exercise["activity"], string> = {
  strength: LEGACY_EXERCISE_HABIT,
  walking: "habit-walk",
  mobility: "life-mobility",
};

function exerciseReward(data: Data, from: number, to: number) {
  const credited = new Set<string>();
  for (const exercise of data.lifeExercise ?? []) {
    const day = dayStartOfKey(exercise.date);
    if (day === undefined || day < from || day >= to) continue;
    const id = EXERCISE_REWARD_IDS[exercise.activity];
    const mark = data.habitLogs[exercise.date]?.[id];
    const habit = data.habits.find((item) => item.id === id);
    if (mark && (!habit || habit.track && !habit.meal)) continue;
    credited.add(exercise.date + ":" + id);
  }
  return credited.size * data.rewardRates.habit;
}

export interface BedNight {
  /** その夜の計画の日（寝る前の日） */
  key: string;
  day: number;
  /** 活動終了（「寝る」・手で入れた時刻）か、なければヘルスケアの入眠 */
  at: number;
  onTime: boolean;
  source: "health" | "button" | "manual" | "routine";
}

/** 夜ごとの就寝。夜の記録（night.ts）の活動終了、なければヘルスケアの入眠で、予定の就寝と比べる */
export function bedNights(data: Partial<Pick<MockData, "sleepLogs" | "healthSleep" | "dayLogs" | "wakeLogs" | "settings">>): BedNight[] {
  const nights = allNights(data);
  return nights.flatMap((n) => {
    const b = bedTimeOf(n);
    const wakeDay = dayStartOfKey(n.date);
    if (!b || n.plannedBed === undefined || wakeDay === undefined) return [];
    const day = wakeDay - DAY_MS;
    return [{ key: dateKeyOf(day), day, at: b.at, onTime: bedOnTimeOf(n), source: b.source }];
  });
}

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
    wake: min(allNights(data).filter((n) => n.plannedWake !== undefined).map((n) => dayStartOfKey(n.date))),
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
    wake: { done: allNights(data).filter((n) => inRange(n.date) && upOnTime(n)).length, total: daysFrom(st.wake) },
    routine: { done: logs.filter((l) => l.routineDoneAt !== undefined).length, total: daysFrom(st.routine) },
    habit: { done: habitDone, expected: Math.round(expected) },
    task: { done: blocks.filter((b) => b.doneAt !== undefined).length, total: blocks.length },
  };
}

/** ご褒美がたまったもと */
export type { RewardSource } from "./model";
export const REWARD_SOURCES: { id: RewardSource; label: string }[] = [
  { id: "wake", label: "起床" },
  { id: "routine", label: "朝ルーティン" },
  { id: "bed", label: "就寝" },
  { id: "habit", label: "習慣（食事を除く）" },
  { id: "task", label: "タスクの枠" },
  { id: "log", label: "記録" },
];

export const EMPTY_REWARD_BANK: RewardBank = { until: 0, yen: { wake: 0, routine: 0, bed: 0, habit: 0, task: 0, log: 0 } };

/** 繰り越しにする境目：今日の3週間前。記録のいちばん短い保存期限（60日）より十分に新しい */
const BANK_LAG_DAYS = 21;

/**
 * ご褒美のお金の、もとごとのたまった額（円）。[from, to) を渡せばその間だけ。
 * 繰り越し（rewardBank）に入っている分は、全期間（from を渡さない）のときだけ足す。週ごとの内訳は記録から数える
 */
export function rewardBreakdown(data: Data, from = -Infinity, to = Infinity): Record<RewardSource, number> {
  const bank = data.rewardBank ?? EMPTY_REWARD_BANK;
  const yen = rewardBreakdownOfLogs(data, Math.max(from, bank.until), to);
  // Life exercise history remains in its ledger and is never written to the legacy bank.
  yen.habit += exerciseReward(data, from, to);
  if (from === -Infinity) for (const k of Object.keys(yen) as RewardSource[]) yen[k] += bank.yen[k] ?? 0;
  return yen;
}

/**
 * 3週間より前の分を繰り越しに移す（記録が期限で消えても、たまった額が減らないように）。
 * 変わらなければ同じものを返す
 */
export function bankRewards(data: Data, now: number): RewardBank {
  const bank = data.rewardBank ?? EMPTY_REWARD_BANK;
  const cutoff = (dayStartOfKey(dateKeyOf(now)) ?? now) - BANK_LAG_DAYS * DAY_MS;
  if (cutoff <= bank.until) return bank;
  const add = rewardBreakdownOfLogs(data, bank.until, cutoff);
  return { until: cutoff, yen: Object.fromEntries((Object.keys(bank.yen) as RewardSource[]).map((k) => [k, (bank.yen[k] ?? 0) + add[k]])) as RewardBank["yen"] };
}

function rewardBreakdownOfLogs(data: Data, from: number, to: number): Record<RewardSource, number> {
  const r = data.rewardRates;
  const inRange = (t: number | undefined) => t !== undefined && t >= from && t < to;
  const yen: Record<RewardSource, number> = { wake: 0, routine: 0, bed: 0, habit: 0, task: 0, log: 0 };
  // 予定どおり起きた：夜の記録の活動開始で見る（「起きた」か、押す前の朝ルーティンの最初のチェック）
  for (const n of allNights(data)) if (upOnTime(n) && inRange(n.up?.at)) yen.wake += r.wake;
  for (const l of data.wakeLogs) {
    if (inRange(l.routineDoneAt)) yen.routine += r.routine;
    // 記録をつけた（朝の疲れ・睡眠時間）。その日の分として数える
    const day = dayStartOfKey(l.date);
    // 睡眠時間は、ヘルスケアから取り込めた日も記録したことにする
    if (inRange(day)) yen.log += ((l.fatigue !== undefined ? 1 : 0) + (l.sleepMinutes !== undefined || data.healthSleep?.[l.date] ? 1 : 0)) * (r.log ?? 0);
  }
  for (const key of Object.keys(data.eveningEnergy ?? {})) if (inRange(dayStartOfKey(key))) yen.log += r.log ?? 0;
  for (const n of bedNights(data)) if (n.onTime && inRange(n.at)) yen.bed += r.bed ?? 0;
  for (const [key, marks] of Object.entries(data.habitLogs)) {
    const day = dayStartOfKey(key);
    if (day === undefined || !inRange(day)) continue;
    // 「記録する」の習慣だけ（食事は記録だけで、ご褒美にしない）。消した習慣の記録も、たまった分として残す
    for (const [id, m] of Object.entries(marks)) {
      const h = data.habits.find((x) => x.id === id);
      if (h && (!h.track || h.meal)) continue;
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
    planned += (b.end - b.start) / MIN;
    worked += usedSlotMinutes(b);
  }
  return { worked: Math.round(worked), planned: Math.round(planned) };
}

/** 予定どおりに寝た夜の数。数えるのは記録を始めた日から、終わった夜（記録のない夜は翌日の昼から） */
export function bedStats(
  data: Partial<Pick<MockData, "sleepLogs" | "healthSleep" | "dayLogs" | "wakeLogs" | "settings">>,
  from: number,
  to: number,
  now: number,
): { done: number; total: number } {
  const nights = bedNights(data);
  const byKey = new Map(nights.map((n) => [n.key, n]));
  const start = nights[0]?.day ?? Infinity;
  let done = 0;
  let total = 0;
  for (let d = Math.max(from, start); d < to && d <= now; d += DAY_MS) {
    const n = byKey.get(dateKeyOf(d));
    // その日の夜は、まだ寝ていないか、ヘルスケアの記録が届いていないかもしれない（起きてから届く）
    if (!n && now < d + DAY_MS + 12 * 60 * MIN) continue;
    total++;
    if (n?.onTime) done++;
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
    // 月曜始まりの週で数える。今週はまだ途中なので、先週から数える（今週もう達していれば今週も入れる）
    const countWeek = (monday: number) => Array.from({ length: 7 }, (_, i) => monday + i * DAY_MS).filter(marked).length;
    const thisMonday = mondayOf(today);
    let streak = countWeek(thisMonday) >= times ? 1 : 0;
    for (let w = 1; w < 52 && countWeek(thisMonday - w * 7 * DAY_MS) >= times; w++) streak++;
    return { streak, unit: "週", done, expected: times * 2 };
  }
  // 今日まだなら昨日から数える
  let streak = 0;
  for (let i = marked(today) ? 0 : 1; i < 400 && marked(today - i * DAY_MS); i++) streak++;
  return { streak, unit: "日", done, expected: habit.frequency.type === "daily" ? 14 : 0 };
}

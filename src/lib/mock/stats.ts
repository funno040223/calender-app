import type { Habit } from "@/lib/scheduler";
import { DAY_MS, MIN } from "./jst";
import { dateKeyOf, dayStartOfKey, type HabitMark, type MockData } from "./model";

/** 予定の起床から、この分数までに「起きた」を押せたら予定どおり */
export const WAKE_GRACE_MINUTES = 30;

type Data = Pick<MockData, "wakeLogs" | "habitLogs" | "habits" | "taskBlockLog" | "rewardSpends" | "rewardRates">;

/** 習慣の1回ぶん。5分だけは、5分以下の習慣なら1回、ほかは半分 */
export const markValue = (m: HabitMark | undefined, habit: Pick<Habit, "durationMinutes">) =>
  m === "done" || (m === "five" && habit.durationMinutes <= 5) ? 1 : m === "five" ? 0.5 : 0;

const wakeOk = (l: MockData["wakeLogs"][number]) =>
  l.wokeAt !== undefined && l.plannedWake !== undefined && l.wokeAt <= l.plannedWake + WAKE_GRACE_MINUTES * MIN;

export interface PeriodStats {
  /** 数えた日数（記録を始めた日から、今日まで） */
  days: number;
  wake: number;
  routine: number;
  habit: { done: number; expected: number };
  task: { done: number; total: number };
}

/** [from, to) の日（0:00）の、予定どおりできた数 */
export function periodStats(data: Data, from: number, to: number, now: number): PeriodStats {
  const inRange = (key: string) => {
    const d = dayStartOfKey(key);
    return d !== undefined && d >= from && d < to;
  };
  // 記録を始める前の日は数えない（予定の起床時刻・習慣・タスクの枠のどれかを残し始めた日から）
  const started = Math.min(
    ...data.wakeLogs.filter((l) => l.plannedWake !== undefined).map((l) => dayStartOfKey(l.date) ?? Infinity),
    ...Object.keys(data.habitLogs).map((k) => dayStartOfKey(k) ?? Infinity),
    ...Object.values(data.taskBlockLog).map((b) => dayStartOfKey(dateKeyOf(b.start)) ?? Infinity),
    Infinity,
  );
  const first = Math.max(from, started);
  const last = Math.min(to, (dayStartOfKey(dateKeyOf(now)) ?? now) + DAY_MS);
  const days = Math.max(0, Math.round((last - first) / DAY_MS));

  const logs = data.wakeLogs.filter((l) => inRange(l.date) && (dayStartOfKey(l.date) ?? -Infinity) >= first);
  const tracked = data.habits.filter((h) => h.track);
  const expected = tracked.reduce(
    (sum, h) => sum + (h.frequency.type === "weekly" ? (h.frequency.times * days) / 7 : h.frequency.type === "daily" ? days : 0),
    0,
  );
  let habitDone = 0;
  for (const [key, marks] of Object.entries(data.habitLogs)) {
    if (!inRange(key)) continue;
    for (const h of tracked) habitDone += markValue(marks[h.id], h);
  }
  const blocks = Object.values(data.taskBlockLog).filter((b) => b.start >= from && b.start < to && b.start <= now);
  return {
    days,
    wake: logs.filter(wakeOk).length,
    routine: logs.filter((l) => l.routineDoneAt !== undefined).length,
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
    for (const h of data.habits) yen += markValue(marks[h.id], h) * r.habit;
  }
  for (const b of Object.values(data.taskBlockLog)) if (inRange(b.doneAt)) yen += r.task;
  return Math.round(yen);
}

/** 使える残り（円）。減らすのは、使った記録だけ */
export const rewardBalance = (data: Data) => rewardEarned(data) - data.rewardSpends.reduce((s, x) => s + x.amount, 0);

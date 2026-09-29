import type { PlanResult } from "./types";
import { DAY_MS, MIN, localDayStart, localWeekday } from "./time";

export type OutlookStatus = "ok" | "tight" | "late";

export interface WeekOutlook {
  /** 週の月曜 0:00 */
  start: number;
  end: number;
  /** これから（今より後）タスクに使う時間 */
  taskMinutes: number;
  /** これからの空き時間（予定・習慣・タスクのどれも入っていない時間） */
  freeMinutes: number;
  /** 順調／きつい（1日の余白を守れない）／間に合わない（締切に足りないタスクがある） */
  status: OutlookStatus;
  late: { taskId: string; title: string; shortfallMinutes: number }[];
}

const overlap = (a: { start: number; end: number }, from: number, to: number) =>
  Math.max(0, Math.min(a.end, to) - Math.max(a.start, from));

/** 今週と来週の見通し。配置の結果だけから計算する */
export function buildOutlook(input: {
  now: number;
  result: Pick<PlanResult, "blocks" | "freeGaps" | "shortfalls" | "dayPlans">;
  minSlackMinutesPerDay: number;
  tzOffsetMinutes: number;
  weeks?: number;
}): WeekOutlook[] {
  const { now, result, tzOffsetMinutes: tz } = input;
  const today = localDayStart(now, tz);
  const monday = today - ((localWeekday(now, tz) + 6) % 7) * DAY_MS;
  return Array.from({ length: input.weeks ?? 2 }, (_, i) => {
    const start = monday + i * 7 * DAY_MS;
    const end = start + 7 * DAY_MS;
    const from = Math.max(now, start);
    const taskMinutes = result.blocks
      .filter((b) => b.kind === "task")
      .reduce((sum, b) => sum + overlap(b, from, end), 0) / MIN;
    const freeMinutes = result.freeGaps.reduce((sum, g) => sum + overlap(g, from, end), 0) / MIN;
    const daysLeft = result.dayPlans.filter((d) => d.dayStart >= start && d.dayStart < end && d.bed > now).length;
    const late = result.shortfalls
      .filter((s) => s.deadline >= start && s.deadline < end)
      .map((s) => ({ taskId: s.taskId, title: s.title, shortfallMinutes: s.shortfallMinutes }));
    const status: OutlookStatus = late.length ? "late" : freeMinutes < input.minSlackMinutesPerDay * daysLeft ? "tight" : "ok";
    return { start, end, taskMinutes: Math.round(taskMinutes), freeMinutes: Math.round(freeMinutes), status, late };
  });
}

/**
 * 人に連絡してみるかを聞く日：見通しが順調な週の、今日から先で最初の休日（週に1日まで）。
 * 休日がない週や、順調でない週は聞かない
 */
export function contactDays(
  weeks: WeekOutlook[],
  dayPlans: Pick<PlanResult, "dayPlans">["dayPlans"],
  now: number,
  tzOffsetMinutes: number,
): { weekStart: number; dayStart: number }[] {
  const today = localDayStart(now, tzOffsetMinutes);
  return weeks.flatMap((w) => {
    if (w.status !== "ok") return [];
    const d = dayPlans
      .filter((p) => p.holiday && p.dayStart >= Math.max(today, w.start) && p.dayStart < w.end)
      .sort((a, b) => a.dayStart - b.dayStart)[0];
    return d ? [{ weekStart: w.start, dayStart: d.dayStart }] : [];
  });
}

import type { CalendarEvent, RhythmReset } from "@/lib/scheduler";
import { computeDayPlans, latestWakeOfDay } from "@/lib/scheduler/rhythm";
import type { MockData } from "./model";
import { DAY_MS, MIN, dayStartOf } from "./jst";

/** 就寝記録から推定する睡眠。予定が変わったら起床の限界も計算し直す。 */
export function bedtimeSleeps(data: MockData, events: CalendarEvent[], now: number): RhythmReset[] {
  return Object.entries(data.bedLogs).flatMap(([key, log]) => {
    if (log.at > now || log.at < now - 2 * DAY_MS) return [];
    const desired = log.at + data.settings.sleepMinutes * MIN;
    const day = dayStartOf(desired);
    const baseline = computeDayPlans(day - 2 * DAY_MS, data.settings.planningDays + 3, events, data.places, data.settings)[2].wake;
    const limit = latestWakeOfDay(day, events, data.places, data.settings);
    // すでに間に合わない場合は、睡眠を負の長さにせず衝突として表示する。
    let end = Math.max(baseline, desired);
    if (limit > log.at) end = Math.min(end, limit);
    const woke = data.wakeLogs.filter((w) => w.wokeAt !== undefined && w.wokeAt > log.at && w.wokeAt <= now && w.wokeAt < log.at + 2 * DAY_MS).sort((a, b) => a.wokeAt! - b.wokeAt!)[0];
    if (woke) end = woke.wokeAt!;
    // 利用者が入力した睡眠・起床の方を優先する。
    if ((data.rhythmResets ?? []).some((r) => r.mode !== "tired" && r.start < end && r.end > log.at)) return [];
    return [{ id: `bed:${key}`, mode: woke ? "woke" : "sleep", start: log.at, end }];
  });
}

/** 推定睡眠と重なる自動枠を外す。途中までの作業はその時間だけ確認に残す。 */
export function reconcileBedtime(data: MockData, sleeps: RhythmReset[], now: number): MockData {
  const taskBlockLog = { ...data.taskBlockLog };
  for (const sleep of sleeps) {
    for (const [key, b] of Object.entries(taskBlockLog)) {
      if (b.start > now || b.end <= sleep.start || b.start >= sleep.end || b.reviewedAt !== undefined || b.counted) continue;
      if (data.blocks.some((x) => x.pinned && `${x.refId}:${x.start}` === key)) continue;
      taskBlockLog[key] = b.start >= sleep.start ? { ...b, reviewedAt: now, outcome: "none" } : { ...b, end: sleep.start };
    }
  }
  return { ...data, taskBlockLog, blocks: data.blocks.filter((b) => b.pinned || !sleeps.some((r) => b.start < r.end && b.end > r.start)) };
}

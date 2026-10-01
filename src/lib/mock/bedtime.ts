import type { CalendarEvent, RhythmReset } from "@/lib/scheduler";
import { computeDayPlans, latestWakeOfDay } from "@/lib/scheduler/rhythm";
import { dayStartOfKey, type MockData } from "./model";
import { DAY_MS, MIN, dayStartOf } from "./jst";

/** 「今から寝る」で入れた起きる予定のあと、この時間までに「起きた」を押したら、同じ眠りの起床とみなす */
const LATE_WAKE_MINUTES = 6 * 60;

/** 自分で入れた立て直し。「今から寝る」の起きる予定は、「起きた」を押したらその時刻で終える */
export function settledResets(data: Pick<MockData, "rhythmResets" | "wakeLogs">): RhythmReset[] {
  return (data.rhythmResets ?? []).map((r) => {
    if (r.mode !== "sleep") return r;
    const up = data.wakeLogs
      .flatMap((w) => (w.wokeAt !== undefined && w.wokeAt > r.start && w.wokeAt < r.end + LATE_WAKE_MINUTES * MIN ? [w.wokeAt] : []))
      .sort((a, b) => a - b)[0];
    return up === undefined ? r : { ...r, mode: "woke", end: up };
  });
}

/**
 * 「寝る」「起きた」の記録から見積もる睡眠。予定が変わったら起床の限界も計算し直す。
 * 「寝る」を押した夜は、設定の睡眠時間を取れる起床へ送る（固定の予定に間に合う時刻まで）。
 * 「起きた」だけ押した朝は、予定の就寝から起きた時刻までを睡眠とし、起きた時刻からその日を組み直す。
 */
export function bedtimeSleeps(data: MockData, events: CalendarEvent[], now: number): RhythmReset[] {
  const recent = (t: number) => t <= now && t >= now - 2 * DAY_MS;
  // 自分で入れた睡眠・起床のほうを優先する
  const resets = settledResets(data);
  const entered = (start: number, end: number) => resets.some((r) => r.mode !== "tired" && r.start < end && r.end > start);
  /** その日の予定どおりの起床と、前の晩の就寝 */
  const planned = (day: number) => {
    const days = computeDayPlans(day - 2 * DAY_MS, data.settings.planningDays + 3, events, data.places, data.settings);
    return { wake: days[2].wake, bed: days[1].bed };
  };
  const woke = data.wakeLogs.flatMap((w) => (w.wokeAt !== undefined && recent(w.wokeAt) ? [{ date: w.date, at: w.wokeAt }] : []));
  const fromBed = Object.entries(data.bedLogs).flatMap(([key, log]): RhythmReset[] => {
    if (!recent(log.at)) return [];
    const desired = log.at + data.settings.sleepMinutes * MIN;
    const day = dayStartOf(desired);
    const limit = latestWakeOfDay(day, events, data.places, data.settings);
    // すでに間に合わない場合は、睡眠を負の長さにせず衝突として表示する
    let end = Math.max(planned(day).wake, desired);
    if (limit > log.at) end = Math.min(end, limit);
    const up = woke.filter((w) => w.at > log.at && w.at < log.at + 2 * DAY_MS).sort((a, b) => a.at - b.at)[0];
    if (up) end = up.at;
    if (entered(log.at, end)) return [];
    return [{ id: `bed:${key}`, mode: up ? "woke" : "sleep", start: log.at, end }];
  });
  const fromWake = woke.flatMap(({ date, at }): RhythmReset[] => {
    if (fromBed.some((r) => r.end === at)) return [];
    const day = dayStartOfKey(date);
    if (day === undefined) return [];
    const start = planned(day).bed;
    if (start >= at || entered(start, at)) return [];
    return [{ id: `woke:${date}`, mode: "woke", start, end: at }];
  });
  return [...fromBed, ...fromWake];
}

/** 見積もった睡眠と重なる自動の枠を外す。途中までの作業はその時間だけ確認に残す */
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

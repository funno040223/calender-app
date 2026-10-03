import type { CalendarEvent, RhythmReset } from "@/lib/scheduler";
import { computeDayPlans, latestWakeOfDay } from "@/lib/scheduler/rhythm";
import { dateKeyOf, dayStartOfKey, type MockData } from "./model";
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
 * 「寝る」「起きた」とヘルスケアの記録から見積もる睡眠（朝ごとに1つ）。予定が変わったら起床の限界も計算し直す。
 * - 「起きた」を押した朝は、その時刻から組み直す（いちばん優先）
 * - 押していなくても、ヘルスケアの起床が予定より遅ければ（寝坊）、その時刻から組み直す。早い起床では前へは動かさない
 * - 「寝る」を押した夜は、設定の睡眠時間を取れる起床へ送る（固定の予定に間に合う時刻まで）
 * 寝ついた時刻は ヘルスケア → 「寝る」 → 予定の就寝 の順。自分で入れた立て直しがあれば、そちらを使う
 */
export function bedtimeSleeps(data: MockData, events: CalendarEvent[], now: number): RhythmReset[] {
  const recent = (t: number) => t <= now && t >= now - 2 * DAY_MS;
  const resets = settledResets(data);
  const entered = (start: number, end: number) => resets.some((r) => r.mode !== "tired" && r.start < end && r.end > start);
  /** その日の予定どおりの起床と、前の晩の就寝 */
  const planned = (day: number) => {
    const days = computeDayPlans(day - 2 * DAY_MS, data.settings.planningDays + 3, events, data.places, data.settings);
    return { wake: days[2].wake, bed: days[1].bed };
  };
  // 「寝る」を押した夜：起きる日と、見積もった起床
  const beds = Object.entries(data.bedLogs).flatMap(([key, log]) => {
    if (!recent(log.at)) return [];
    const desired = log.at + data.settings.sleepMinutes * MIN;
    const day = dayStartOf(desired);
    const limit = latestWakeOfDay(day, events, data.places, data.settings);
    // すでに間に合わない場合は、睡眠を負の長さにせず衝突として表示する
    let end = Math.max(planned(day).wake, desired);
    if (limit > log.at) end = Math.min(end, limit);
    return [{ key, at: log.at, end, morning: dateKeyOf(end) }];
  });
  const taps = data.wakeLogs.flatMap((w) => (w.wokeAt !== undefined && recent(w.wokeAt) ? [{ morning: w.date, at: w.wokeAt }] : []));
  const nights = Object.entries(data.healthSleep ?? {}).flatMap(([morning, h]) => (h.end > h.start && recent(h.end) ? [{ morning, start: h.start, end: h.end }] : []));
  const mornings = [...new Set([...beds.map((b) => b.morning), ...taps.map((t) => t.morning), ...nights.map((n) => n.morning)])];

  return mornings.flatMap((morning): RhythmReset[] => {
    const day = dayStartOfKey(morning);
    if (day === undefined) return [];
    const bed = beds.find((b) => b.morning === morning);
    const tap = taps.find((t) => t.morning === morning && (!bed || t.at > bed.at));
    const night = nights.find((n) => n.morning === morning);
    const plan = planned(day);
    // 前の晩に予定していた起床（「寝る」を押した夜は見積もり）
    const expected = bed?.end ?? plan.wake;
    const start = night?.start ?? bed?.at ?? plan.bed;
    const id = bed ? `bed:${bed.key}` : tap ? `woke:${morning}` : `health:${morning}`;
    let r: RhythmReset | undefined;
    if (tap) r = { id, mode: "woke", start, end: tap.at, plannedEnd: expected };
    else if (night && night.end > expected) r = { id, mode: "woke", start, end: night.end, plannedEnd: expected };
    else if (bed) r = { id, mode: "sleep", start: bed.at, end: bed.end };
    if (!r || r.start >= r.end || entered(r.start, r.end)) return [];
    return [r];
  });
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

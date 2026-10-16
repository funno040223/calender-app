import type { CalendarEvent, RhythmReset } from "@/lib/scheduler";
import { computeDayPlans, latestWakeOfDay } from "@/lib/scheduler/rhythm";
import { dateKeyOf, dayStartOfKey, type MockData } from "./model";
import { DAY_MS, MIN, dayStartOf } from "./jst";
import { sleepSessions } from "./night";

/** 組み直しに使う立て直しの期間（これより前に終わった眠りは使わない） */
export const RESET_KEEP_DAYS = 60;

/**
 * 「今から立て直す」で入れた眠り。「今から寝る」の起きる予定は、活動開始（「起きた」か朝ルーティンの最初のチェック）でその時刻に終える。
 * 予定の起床（記録したときのもの）は plannedEnd に残す。直近60日の分だけ
 */
export function manualSleeps(data: Pick<MockData, "sleepLogs" | "wakeLogs">, now: number): RhythmReset[] {
  const from = now - RESET_KEEP_DAYS * DAY_MS;
  return sleepSessions(data).flatMap((s): RhythmReset[] => {
    if (!s.manual || !s.bed) return [];
    const start = s.bed.at;
    // その夜の眠りに記録した起床（「起きた」・朝ルーティンの最初のチェック）は、起きる予定からずっと遅くても、その時刻に起きたものとする
    // （計画の起床と記録をそろえる）。昼寝は別の眠りなので、あとの「起きた」とは結びつかない
    const up = s.up && s.up.at > start ? s.up.at : undefined;
    if ((up ?? s.until ?? start) <= from) return [];
    const planned = s.plannedWake !== undefined ? { plannedEnd: s.plannedWake } : {};
    if (up !== undefined) return [{ id: s.id, mode: "woke", start, end: up, ...planned }];
    if (s.until !== undefined && s.until > start) return [{ id: s.id, mode: "sleep", start, end: s.until, ...planned }];
    return [];
  });
}

/**
 * 「寝る」「起きた」とヘルスケアの記録から見積もる、組み直しのための睡眠（朝ごとに1つ）。夜の記録（night.ts）と同じ順で値を使う。
 * - 活動開始（「起きた」、押していなければ朝ルーティンの最初のチェック）がある朝は、その時刻から組み直す
 * - なくても、ヘルスケアの目覚めが予定より遅ければ（寝坊）、その時刻から組み直す。早い目覚めでは前へは動かさない
 * - 「寝る」を押した夜は、設定の睡眠時間を取れる起床へ送る（固定の予定に間に合う時刻まで）
 * 睡眠の始まりは 活動終了（「寝る」） → ヘルスケアの入眠 → 予定の就寝 の順（組み直しで使えないのは、寝床に入ってからなので）。
 * 自分で入れた立て直しがあれば、そちらを使う
 */
export function bedtimeSleeps(data: MockData, events: CalendarEvent[], now: number, resets: RhythmReset[] = manualSleeps(data, now)): RhythmReset[] {
  const recent = (t: number) => t <= now && t >= now - 2 * DAY_MS;
  // 自分で入れた立て直しのない眠り（「寝る」「起きた」「いつ起きた？」・朝ルーティンの最初のチェック）
  const sessions = sleepSessions(data).filter((s) => !s.manual);
  const entered = (start: number, end: number) => resets.some((r) => r.mode !== "tired" && r.start < end && r.end > start);
  /** その日の予定どおりの起床と、前の晩の就寝 */
  const planned = (day: number) => {
    const days = computeDayPlans(day - 2 * DAY_MS, data.settings.planningDays + 3, events, data.places, data.settings);
    return { wake: days[2].wake, bed: days[1].bed };
  };
  // 「寝る」を押した夜：起きる日（その夜の記録の日）と、見積もった起床。
  // 昼過ぎに押しても、その夜の眠りとして翌朝の起床まで（押した日の起床を動かさない）
  const beds = sessions.flatMap((s) => {
    if (!s.bed || !recent(s.bed.at)) return [];
    const log = s.bed;
    const key = dateKeyOf((dayStartOfKey(s.date) ?? log.at) - DAY_MS);
    const desired = log.at + data.settings.sleepMinutes * MIN;
    const day = dayStartOfKey(s.date) ?? dayStartOf(desired);
    const limit = latestWakeOfDay(day, events, data.places, data.settings);
    // すでに間に合わない場合は、睡眠を負の長さにせず衝突として表示する
    let end = Math.max(planned(day).wake, desired);
    if (limit > log.at) end = Math.min(end, limit);
    return [{ key, at: log.at, end, morning: s.date }];
  });
  // 活動開始：「起きた」、押していなければ朝ルーティンの最初のチェック
  const taps = sessions.flatMap((s) => (s.up && recent(s.up.at) ? [{ morning: s.date, at: s.up.at }] : []));
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
    const start = bed?.at ?? night?.start ?? plan.bed;
    const id = bed ? `bed:${bed.key}` : tap ? `woke:${morning}` : `health:${morning}`;
    let r: RhythmReset | undefined;
    if (tap) r = { id, mode: "woke", start, end: tap.at, plannedEnd: expected };
    else if (night && night.end > expected) r = { id, mode: "woke", start, end: night.end, plannedEnd: expected };
    else if (bed) r = { id, mode: "sleep", start: bed.at, end: bed.end };
    if (!r || r.start >= r.end || entered(r.start, r.end)) return [];
    return [r];
  });
}

/**
 * 見積もった睡眠と重なる自動の枠を外す。途中までの作業はその時間だけ確認に残す。
 * 睡眠の始まりを「寝る」や「起きた」で自分が答えた夜は、その間に始まった枠を「できなかった」にする。
 * ヘルスケアだけから見積もった睡眠（遅れて届くことがある）では、自動で決めずに「作業の進み具合」で確認する
 */
export function reconcileBedtime(data: MockData, sleeps: RhythmReset[], now: number): MockData {
  const taskBlockLog = { ...data.taskBlockLog };
  for (const sleep of sleeps) {
    for (const [key, b] of Object.entries(taskBlockLog)) {
      if (b.start > now || b.end <= sleep.start || b.start >= sleep.end || b.reviewedAt !== undefined || b.counted) continue;
      if (data.blocks.some((x) => x.pinned && `${x.refId}:${x.start}` === key)) continue;
      if (b.start >= sleep.start) {
        if (!sleep.id.startsWith("health:")) taskBlockLog[key] = { ...b, reviewedAt: now, outcome: "none" };
      } else taskBlockLog[key] = { ...b, end: sleep.start };
    }
  }
  return { ...data, taskBlockLog, blocks: data.blocks.filter((b) => b.pinned || !sleeps.some((r) => b.start < r.end && b.end > r.start)) };
}

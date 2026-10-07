import type { SupabaseClient } from "@supabase/supabase-js";
import type { CalendarEvent } from "@/lib/scheduler";
import { fetchIcsText } from "@/lib/ical/fetch";
import { parseIcs } from "@/lib/ical/import";
import { nightsFromRows } from "@/lib/health/sleep";
import { dateKeyOf } from "@/lib/mock/model";
import { fromStoredV2, replan, type MockState } from "@/lib/mock/state";

const DAY_MS = 24 * 60 * 60_000;

export type ServerPlan =
  | { ok: true; state: MockState }
  | { ok: false; reason: "data" | "ical"; data?: ReturnType<typeof fromStoredV2> };

/**
 * サーバーで、あるユーザーの配置を組み直す（定期実行と iCal 配信から使う）。
 * 取り込み元の iCal を読み直すので、Google カレンダーの変更も入る。
 * 取り込めなかった元は、前回の結果で補う。前回の結果もなければ組み直さない（予定が欠けたまま組むと、枠がずれるため）
 */
export async function planOnServer(db: SupabaseClient, userId: string, raw: unknown, now: number): Promise<ServerPlan> {
  const stored = fromStoredV2(raw, now);
  if (!stored) return { ok: false, reason: "data" };
  // ヘルスケアの睡眠は health_sleep にだけ届く。アプリを開く前でも寝坊に合わせて組み直せるように、直近の夜を重ねる
  const nights = await recentNights(db, userId, now);
  const data = nights ? { ...stored, healthSleep: { ...stored.healthSleep, ...nights } } : stored;

  const { data: sources, error } = await db.from("ical_sources").select("id, url").eq("user_id", userId);
  if (error || !sources) return { ok: false, reason: "ical", data };

  const events: CalendarEvent[] = [];
  let failed = false;
  for (const s of sources) {
    try {
      const got = parseIcs(await fetchIcsText(s.url), { from: now - 8 * DAY_MS, to: now + 16 * DAY_MS }, 540, `ical-${s.id}`);
      events.push(...got);
      await db.from("ical_sources").update({ last_fetched_at: new Date().toISOString(), last_error: null }).eq("id", s.id);
      // 次に取り込めなかったときのために、前回の結果を残す（0008 の列がなければ、何もしない）
      await db.from("ical_sources").update({ last_events: got }).eq("id", s.id);
    } catch (e) {
      await db
        .from("ical_sources")
        .update({ last_error: e instanceof Error ? e.message : "取り込みに失敗しました。" })
        .eq("id", s.id);
      // 取り込めなかった元は、前回の結果で補って組み直す（1つの失敗で、毎時の組み直しと通知がすべて止まらないように）
      const last = await lastEventsOf(db, s.id);
      if (last) events.push(...last);
      else failed = true;
    }
  }
  if (failed) return { ok: false, reason: "ical", data };
  return { ok: true, state: replan(data, events, now) };
}

/** 前回取り込めた予定。残っていなければ undefined */
async function lastEventsOf(db: SupabaseClient, sourceId: string): Promise<CalendarEvent[] | undefined> {
  try {
    const { data, error } = await db.from("ical_sources").select("last_events").eq("id", sourceId).maybeSingle();
    return !error && Array.isArray(data?.last_events) ? (data.last_events as CalendarEvent[]) : undefined;
  } catch {
    return undefined;
  }
}

/** 直近3日のヘルスケアの睡眠。読めなければ、アプリが持っている分だけで組み直す */
async function recentNights(db: SupabaseClient, userId: string, now: number) {
  try {
    const { data, error } = await db
      .from("health_sleep")
      .select("night, sleep_start, sleep_end, asleep_minutes")
      .eq("user_id", userId)
      .gte("night", dateKeyOf(now - 3 * DAY_MS));
    return !error && data?.length ? nightsFromRows(data) : undefined;
  } catch {
    return undefined;
  }
}

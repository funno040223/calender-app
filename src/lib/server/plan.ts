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
 * 1つでも取り込めなければ組み直さない（予定が欠けたまま組むと、枠がずれるため）
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
      events.push(...parseIcs(await fetchIcsText(s.url), { from: now - DAY_MS, to: now + 16 * DAY_MS }, 540, `ical-${s.id}`));
      await db.from("ical_sources").update({ last_fetched_at: new Date().toISOString(), last_error: null }).eq("id", s.id);
    } catch (e) {
      failed = true;
      await db
        .from("ical_sources")
        .update({ last_error: e instanceof Error ? e.message : "取り込みに失敗しました。" })
        .eq("id", s.id);
    }
  }
  if (failed) return { ok: false, reason: "ical", data };
  return { ok: true, state: replan(data, events, now) };
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

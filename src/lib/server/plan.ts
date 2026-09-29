import type { SupabaseClient } from "@supabase/supabase-js";
import type { CalendarEvent } from "@/lib/scheduler";
import { fetchIcsText } from "@/lib/ical/fetch";
import { parseIcs } from "@/lib/ical/import";
import { fromStoredV2, replan, type MockState } from "@/lib/mock/state";

const DAY_MS = 24 * 60 * 60_000;

export type ServerPlan =
  | { ok: true; state: MockState }
  | { ok: false; reason: "data" | "ical" | "no-sources"; data?: ReturnType<typeof fromStoredV2> };

/**
 * サーバーで、あるユーザーの配置を組み直す（定期実行と iCal 配信から使う）。
 * 取り込み元の iCal を読み直すので、Google カレンダーの変更も入る。
 * 1つでも取り込めなければ組み直さない（予定が欠けたまま組むと、枠がずれるため）
 */
export async function planOnServer(db: SupabaseClient, userId: string, raw: unknown, now: number): Promise<ServerPlan> {
  const data = fromStoredV2(raw, now);
  if (!data) return { ok: false, reason: "data" };

  const { data: sources } = await db.from("ical_sources").select("id, url").eq("user_id", userId);
  if (!sources?.length) return { ok: false, reason: "no-sources", data };

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

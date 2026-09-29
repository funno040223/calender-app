import type { CalendarEvent } from "@/lib/scheduler";
import { fetchIcsText } from "@/lib/ical/fetch";
import { parseIcs } from "@/lib/ical/import";
import { buildNotices } from "@/lib/notify/build";
import { fromStoredV2, planEvents, replan } from "@/lib/mock/state";
import { createAdminClient } from "@/lib/supabase/admin";
import { authorized } from "@/lib/push/cron";

const DAY_MS = 24 * 60 * 60_000;

/**
 * Supabase の pg_cron から毎時呼ばれ、アプリを開いていなくても通知の一覧を新しくする。
 * app_state と取り込み元の iCal から組み直し、push_schedule だけを書き換える
 * （app_state は書かない。画面で編集した内容を上書きしないため）。
 */
export async function POST(request: Request) {
  if (!authorized(request)) return Response.json({ error: "unauthorized" }, { status: 401 });

  const db = createAdminClient();
  const now = Date.now();
  const { data: rows, error } = await db.from("app_state").select("user_id, data");
  if (error) return Response.json({ error: "app_state を読めませんでした。" }, { status: 500 });

  const results: { planned: boolean; notices?: number; reason?: string }[] = [];
  for (const row of rows ?? []) {
    const data = fromStoredV2(row.data, now);
    if (!data) {
      results.push({ planned: false, reason: "data" });
      continue;
    }

    const { data: sources } = await db.from("ical_sources").select("id, url").eq("user_id", row.user_id);
    const events: CalendarEvent[] = [];
    let failed = false;
    for (const s of sources ?? []) {
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
    // 取り込めない予定があるまま組み直すと、通知がずれる。アプリが作った一覧を残す
    if (failed || !sources?.length) {
      results.push({ planned: false, reason: failed ? "ical" : "no-sources" });
      continue;
    }

    const state = replan(data, events, now);
    const items = buildNotices({
      now,
      result: state.result,
      events: planEvents(state, state.classEvents, state.googleEvents),
      places: state.places,
      settings: state.settings,
    });
    const { error: e } = await db
      .from("push_schedule")
      .upsert({ user_id: row.user_id, items, updated_at: new Date().toISOString() });
    results.push(e ? { planned: false, reason: "save" } : { planned: true, notices: items.length });
  }
  return Response.json({ results });
}

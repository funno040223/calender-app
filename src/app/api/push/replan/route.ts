import { buildNotices } from "@/lib/notify/build";
import { planEvents } from "@/lib/mock/state";
import { createAdminClient } from "@/lib/supabase/admin";
import { planOnServer } from "@/lib/server/plan";
import { authorized } from "@/lib/push/cron";

/**
 * Supabase の pg_cron から毎時呼ばれ、アプリを開いていなくても通知の一覧を新しくする。
 * app_state と取り込み元の iCal から組み直し、push_schedule だけを書き換える
 * （app_state は書かない。画面で編集した内容を上書きしないため）。
 * 取り込めない予定があるときは、アプリが作った一覧を残す
 */
export async function POST(request: Request) {
  if (!authorized(request)) return Response.json({ error: "unauthorized" }, { status: 401 });

  const db = createAdminClient();
  const now = Date.now();
  const { data: rows, error } = await db.from("app_state").select("user_id, data");
  if (error) return Response.json({ error: "app_state を読めませんでした。" }, { status: 500 });

  const results: { planned: boolean; notices?: number; reason?: string }[] = [];
  for (const row of rows ?? []) {
    const p = await planOnServer(db, row.user_id, row.data, now);
    if (!p.ok) {
      results.push({ planned: false, reason: p.reason });
      continue;
    }
    const { state } = p;
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

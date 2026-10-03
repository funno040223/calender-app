import { createAdminClient } from "@/lib/supabase/admin";
import { replanPush, type PushReplan } from "@/lib/server/push";
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

  const results: PushReplan[] = [];
  for (const row of rows ?? []) {
    // 1人のデータが壊れていても、ほかの人の組み直しは続ける
    try {
      results.push(await replanPush(db, row.user_id, row.data, now));
    } catch (e) {
      console.warn("組み直しに失敗しました", e instanceof Error ? e.message : e);
      results.push({ planned: false, reason: "error" });
    }
  }
  return Response.json({ results });
}

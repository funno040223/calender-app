import { createAdminClient } from "@/lib/supabase/admin";
import { cleanNotices, isDue, sendPush, type PushTarget } from "@/lib/push/send";
import { authorized } from "@/lib/push/cron";
import { deliverNotice, deliveryLedger } from "@/lib/push/delivery";

const KEEP_SENT_MS = 3 * 24 * 60 * 60_000;

/**
 * Supabase の pg_cron から1分ごとに呼ばれ、時刻が来た通知を送る。
 * ログインではなく CRON_SECRET で確かめる（proxy.ts はこの道を通す）
 */
export async function POST(request: Request) {
  if (!authorized(request)) return Response.json({ error: "unauthorized" }, { status: 401 });

  const db = createAdminClient();
  const now = Date.now();
  const { data: rows, error } = await db.from("push_schedule").select("user_id, items");
  if (error) return Response.json({ error: "通知の一覧を読めませんでした。" }, { status: 500 });

  let sent = 0;
  let failed = 0;
  for (const row of rows ?? []) {
    const due = cleanNotices(row.items).filter((n) => isDue(n, now));
    if (!due.length) continue;

    const { data: subs } = await db.from("push_subscriptions").select("id, endpoint, p256dh, auth").eq("user_id", row.user_id);
    if (!subs?.length) continue;

    const ledger = deliveryLedger(db, row.user_id);
    for (const n of due) {
      for (const sub of subs as PushTarget[]) {
        try {
          const r = await deliverNotice(ledger, sub, n, sendPush);
          if (r === "ok") sent++;
          if (r === "error") failed++;
          if (r === "gone") await db.from("push_subscriptions").delete().eq("id", sub.id);
        } catch {
          failed++;
          console.warn("通知の送信または記録に失敗しました。次回再試行します。");
        }
      }
    }
  }

  await db.from("push_sent").delete().lt("sent_at", new Date(now - KEEP_SENT_MS).toISOString());
  return Response.json({ sent, failed });
}

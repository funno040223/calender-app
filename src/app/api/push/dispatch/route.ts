import { timingSafeEqual } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { cleanNotices, sendPush, type PushTarget } from "@/lib/push/send";

/** 遅れて届いた一覧でも、この時間までは送る */
const GRACE_MS = 10 * 60_000;
const KEEP_SENT_MS = 3 * 24 * 60 * 60_000;

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  const got = request.headers.get("authorization") ?? "";
  if (!secret) return false;
  const a = Buffer.from(got);
  const b = Buffer.from(`Bearer ${secret}`);
  return a.length === b.length && timingSafeEqual(a, b);
}

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
  for (const row of rows ?? []) {
    const due = cleanNotices(row.items).filter((n) => n.at <= now && n.at > now - GRACE_MS);
    if (!due.length) continue;

    const { data: subs } = await db.from("push_subscriptions").select("id, endpoint, p256dh, auth").eq("user_id", row.user_id);
    if (!subs?.length) continue;

    // 先に「送った」と記録できたものだけ送る（1分ごとの呼び出しが重なっても2回送らない）
    const { data: claimed } = await db
      .from("push_sent")
      .upsert(
        due.map((n) => ({ user_id: row.user_id, key: n.key })),
        { onConflict: "user_id,key", ignoreDuplicates: true },
      )
      .select("key");
    const keys = new Set((claimed ?? []).map((c) => c.key as string));

    for (const n of due.filter((x) => keys.has(x.key))) {
      for (const sub of subs as PushTarget[]) {
        const r = await sendPush(sub, { title: n.title, body: n.body, url: n.url, tag: n.key });
        if (r === "ok") sent++;
        if (r === "gone") await db.from("push_subscriptions").delete().eq("id", sub.id);
      }
    }
  }

  await db.from("push_sent").delete().lt("sent_at", new Date(now - KEEP_SENT_MS).toISOString());
  return Response.json({ sent });
}

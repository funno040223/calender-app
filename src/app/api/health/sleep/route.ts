import { createHash } from "node:crypto";
import { HEALTH_TOKEN, parseSleepBody, summarizeSleep } from "@/lib/health/sleep";
import { createAdminClient } from "@/lib/supabase/admin";

/** 本文の大きさの上限（2日ぶんの睡眠の記録なら十分） */
const MAX_BODY = 300_000;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } });

/**
 * iPhone のショートカットが送るヘルスケアの睡眠を受け取り、夜ごとのまとめを保存する。
 * ログインの代わりに Authorization: Bearer <合言葉> で本人を見分ける（DB には SHA-256 だけ）。proxy.ts はこの道を通す。
 * 保存するのは health_sleep だけで、アプリのデータ（app_state）には書かない（開いているアプリの保存とぶつからないように）
 */
export async function POST(request: Request) {
  const token = (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
  if (!HEALTH_TOKEN.test(token)) return json({ error: "合言葉がちがいます。" }, 401);
  const body = await request.text();
  if (body.length > MAX_BODY) return json({ error: "送る記録が多すぎます。" }, 413);

  const db = createAdminClient();
  const hash = createHash("sha256").update(token).digest("hex");
  const { data: owner } = await db.from("health_tokens").select("user_id").eq("token_hash", hash).maybeSingle();
  if (!owner) return json({ error: "合言葉がちがいます。" }, 401);

  const nights = summarizeSleep(parseSleepBody(body));
  if (nights.length) {
    const now = new Date().toISOString();
    const { error } = await db.from("health_sleep").upsert(
      nights.map((n) => ({
        user_id: owner.user_id,
        night: n.night,
        sleep_start: new Date(n.start).toISOString(),
        sleep_end: new Date(n.end).toISOString(),
        asleep_minutes: n.minutes,
        updated_at: now,
      })),
    );
    if (error) return json({ error: "保存できませんでした。" }, 500);
  }
  // ショートカットの画面に出ても分かるように、受け取った夜を返す
  return json({ ok: true, nights: nights.map((n) => ({ night: n.night, minutes: n.minutes })) });
}

import { createHash } from "node:crypto";
import { buildIcs } from "@/lib/ical/export";
import { FEED_TOKEN, feedEvents } from "@/lib/ical/feed";
import { buildClassEvents } from "@/lib/mock/model";
import { createAdminClient } from "@/lib/supabase/admin";
import { planOnServer } from "@/lib/server/plan";

const notFound = () => new Response("Not found", { status: 404 });

/**
 * アプリが組んだ予定の iCal 配信（読み取り専用）。カレンダーアプリが定期的に読みに来る。
 * ログインの代わりに、アドレスに入った推測できない合言葉で本人を見分ける
 * （DB には合言葉そのものではなく SHA-256 だけを置く）。proxy.ts はこの道を通す
 */
export async function GET(_request: Request, ctx: RouteContext<"/api/ical/feed/[token]">) {
  const token = (await ctx.params).token.replace(/\.ics$/, "");
  if (!FEED_TOKEN.test(token)) return notFound();

  const db = createAdminClient();
  const hash = createHash("sha256").update(token).digest("hex");
  const { data: feed } = await db.from("ical_feeds").select("user_id").eq("token_hash", hash).maybeSingle();
  if (!feed) return notFound();

  const { data: row } = await db.from("app_state").select("data").eq("user_id", feed.user_id).maybeSingle();
  if (!row) return notFound();

  const now = Date.now();
  // その場で組み直す。Google カレンダーを読めなかったときは、アプリが最後に保存した配置を使う
  const p = await planOnServer(db, feed.user_id, row.data, now);
  const source = p.ok ? p.state : p.data;
  if (!source) return !p.ok && p.reason !== "data"
    ? new Response("Schedule temporarily unavailable", { status: 503, headers: { "Cache-Control": "private, no-store" } })
    : notFound();
  const classEvents = p.ok ? p.state.classEvents : buildClassEvents(source.courses, source.periods);

  const ics = buildIcs(feedEvents({ blocks: source.blocks, events: source.events, classEvents, now }), "リズム カレンダー", now);
  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex",
    },
  });
}

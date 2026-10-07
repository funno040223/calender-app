import type { CalendarEvent } from "@/lib/scheduler";
import { fetchIcsText } from "@/lib/ical/fetch";
import { parseIcs } from "@/lib/ical/import";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const DAY_MS = 24 * 60 * 60_000;

/**
 * 登録した iCal カレンダーをすべて取り込む。
 * URL はデータベース（ical_sources の url。画面からは読めない列）から、本人を確かめてから secret key で読む。
 * 本文: { from?: number, to?: number }（epoch ミリ秒）
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { from?: unknown; to?: unknown };
  const now = Date.now();
  const from = typeof body.from === "number" ? body.from : now - 8 * DAY_MS;
  const to = typeof body.to === "number" ? body.to : now + 16 * DAY_MS;

  const { data: auth } = await (await createClient()).auth.getUser();
  if (!auth.user) return Response.json({ error: "ログインしてください。" }, { status: 401 });
  const userId = auth.user.id;
  const db = createAdminClient();
  const { data: sources, error } = await db.from("ical_sources").select("id, name, url").eq("user_id", userId).order("created_at");
  if (error) return Response.json({ error: "取り込むカレンダーの一覧を読めませんでした。" }, { status: 500 });

  const events: CalendarEvent[] = [];
  const results: { id: string; name: string; count: number; error?: string }[] = [];
  for (const s of sources ?? []) {
    try {
      const got = parseIcs(await fetchIcsText(s.url), { from, to }, 540, `ical-${s.id}`);
      events.push(...got);
      results.push({ id: s.id, name: s.name, count: got.length });
      await db.from("ical_sources").update({ last_fetched_at: new Date().toISOString(), last_error: null }).eq("id", s.id).eq("user_id", userId);
    } catch (e) {
      const message = e instanceof Error ? e.message : "取り込みに失敗しました。";
      results.push({ id: s.id, name: s.name, count: 0, error: message });
      await db.from("ical_sources").update({ last_error: message }).eq("id", s.id).eq("user_id", userId);
    }
  }
  return Response.json({ sources: results, events, fetchedAt: now });
}

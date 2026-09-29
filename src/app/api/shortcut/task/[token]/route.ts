import { createHash } from "node:crypto";
import { DEFAULT_SETTINGS, parseQuickAdd, type Task } from "@/lib/scheduler";
import { FEED_TOKEN } from "@/lib/ical/feed";
import { formatDeadline, formatMinutes, newId } from "@/lib/mock/jst";
import { createAdminClient } from "@/lib/supabase/admin";

const text = (body: string, status = 200) => new Response(body, { status, headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });

/**
 * iPhone のショートカット（Siri の「タスクを追加」）から、話した文でタスクを足す。
 * ログインの代わりに、アドレスに入った推測できない合言葉で本人を見分ける（DB には SHA-256 だけ）。proxy.ts はこの道を通す。
 * 本文は JSON の {"text": "..."} か、文だけ。返す文はショートカットがそのまま読み上げる
 */
export async function POST(request: Request, ctx: RouteContext<"/api/shortcut/task/[token]">) {
  const token = (await ctx.params).token;
  if (!FEED_TOKEN.test(token)) return text("見つかりません", 404);

  const raw = await request.text();
  let said = raw;
  try {
    const j = JSON.parse(raw) as unknown;
    if (j && typeof j === "object" && "text" in j && typeof j.text === "string") said = j.text;
  } catch {
    // 文だけが送られてきた
  }
  said = said.trim().slice(0, 300);
  if (!said) return text("タスクの名前が聞き取れませんでした", 400);

  const db = createAdminClient();
  const hash = createHash("sha256").update(token).digest("hex");
  const { data: owner } = await db.from("shortcut_tokens").select("user_id").eq("token_hash", hash).maybeSingle();
  if (!owner) return text("見つかりません", 404);
  const { data: row } = await db.from("app_state").select("data").eq("user_id", owner.user_id).maybeSingle();
  const data = row?.data as { tasks?: unknown } | undefined;
  if (!data || !Array.isArray(data.tasks)) return text("アプリのデータが見つかりません", 404);

  const now = Date.now();
  const p = parseQuickAdd(said, now, DEFAULT_SETTINGS.tzOffsetMinutes);
  if (!p.title) return text("タスクの名前が聞き取れませんでした", 400);
  const task: Task = {
    id: newId("task"),
    title: p.title,
    priority: p.priority ?? 2,
    ...(p.deadline !== undefined ? { deadline: p.deadline } : {}),
    ...(p.durationMinutes !== undefined ? { durationMinutes: p.durationMinutes } : {}),
  };
  // アプリを開いたときに組み直す（配置はアプリと毎時の組み直しに任せる）
  const { error } = await db
    .from("app_state")
    .update({ data: { ...data, tasks: [...data.tasks, task] }, updated_at: new Date(now).toISOString() })
    .eq("user_id", owner.user_id);
  if (error) return text("保存できませんでした", 500);

  const parts = [task.deadline !== undefined ? formatDeadline(task.deadline) : "", task.durationMinutes ? formatMinutes(task.durationMinutes) : ""].filter(Boolean);
  return text(`「${task.title}」を追加しました${parts.length ? `（${parts.join("・")}）` : ""}`);
}

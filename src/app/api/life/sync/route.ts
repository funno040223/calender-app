import { MAX_BATCH_EVENTS, MAX_SYNC_BYTES, lifeEventRow, validateLifeBatch } from "@/lib/life/validation";
import type { LifeEvent } from "@/lib/life/model";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "private, no-store" } });

export async function POST(request: Request) {
  const db = await createClient();
  const { data: { user }, error: authError } = await db.auth.getUser();
  if (!user || authError) return json({ error: "ログインしてください。" }, 401);

  if (Number(request.headers.get("content-length")) > MAX_SYNC_BYTES) return json({ error: "一度に送る生活記録が多すぎます。" }, 413);
  let input: { owner?: unknown; revision?: unknown; events?: unknown } | null;
  try {
    const raw = await request.text();
    if (new TextEncoder().encode(raw).length > MAX_SYNC_BYTES) return json({ error: "一度に送る生活記録が多すぎます。" }, 413);
    input = JSON.parse(raw);
  } catch {
    return json({ error: "生活記録を読み込めません。" }, 422);
  }
  const revision = input?.revision;
  const events = input?.events;
  if (input?.owner !== user.id) return json({ error: "ログインした端末の生活記録を開き直してください。" }, 403);
  if (typeof revision !== "number" || !Number.isSafeInteger(revision) || revision < 0
    || !Array.isArray(events) || events.length > MAX_BATCH_EVENTS) return json({ error: "生活記録の同期情報を確認してください。" }, 422);
  const status = validateLifeBatch(events);
  if (status === "unsupported") return json({ error: "生活記録を同期するには、アプリの更新が必要です。" }, 426);
  if (status === "invalid") return json({ error: "生活記録の入力を確認してください。" }, 422);

  try {
    const { data, error } = await createAdminClient().rpc("sync_life_events", {
      p_user: user.id, p_revision: revision, p_entries: (events as LifeEvent[]).map(lifeEventRow),
    });
    if (error || !data) return json({ error: "生活記録を保存できませんでした。" }, 503);
    if (data.status === "unsupported") return json({ ...data, error: "生活記録を同期するには、アプリの更新が必要です。" }, 426);
    return json(data, data.status === "ok" ? 200 : 409);
  } catch {
    return json({ error: "生活記録を同期できませんでした。" }, 503);
  }
}

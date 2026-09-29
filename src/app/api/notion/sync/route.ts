import { readRows } from "@/lib/notion/api";
import { markNotionFetched, ownNotionSource } from "@/lib/notion/source";

/**
 * 登録した Notion の表の行（ID・タイトル・締切・段階）。合言葉は返さない。
 * 本文: { dateProp: string, stageProp?: string }（どの列を読むか。秘密ではないのでアプリのデータに置く）
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { dateProp?: unknown; stageProp?: unknown };
  if (typeof body.dateProp !== "string" || !body.dateProp) return Response.json({ error: "締切の列を選んでください。" }, { status: 400 });
  const src = await ownNotionSource();
  if ("error" in src) return Response.json({ error: src.error }, { status: src.status });
  try {
    const rows = await readRows(src.token, src.databaseId, body.dateProp, typeof body.stageProp === "string" && body.stageProp ? body.stageProp : undefined);
    await markNotionFetched(src.userId);
    return Response.json({ rows, fetchedAt: Date.now() });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Notion から読めませんでした";
    await markNotionFetched(src.userId, message);
    return Response.json({ error: message }, { status: 502 });
  }
}

import { readSchema } from "@/lib/notion/api";
import { markNotionFetched, ownNotionSource } from "@/lib/notion/source";

/** 登録した Notion の表の列（タイトル・日付・段階とその選択肢）。合言葉は返さない */
export async function POST() {
  const src = await ownNotionSource();
  if ("error" in src) return Response.json({ error: src.error }, { status: src.status });
  try {
    return Response.json(await readSchema(src.token, src.databaseId));
  } catch (e) {
    const message = e instanceof Error ? e.message : "Notion から読めませんでした";
    await markNotionFetched(src.userId, message);
    return Response.json({ error: message }, { status: 502 });
  }
}

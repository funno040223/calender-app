import { createClient } from "@/lib/supabase/client";
import { parseDatabaseId } from "@/lib/notion/id";
import type { NotionRow, NotionSchema } from "@/lib/notion/api";

/** Notion の表の登録と取り込み（画面用）。合言葉は登録するときに1回送るだけで、読み出さない */

let client: ReturnType<typeof createClient> | undefined;
const db = () => (client ??= createClient());

export interface NotionStatus {
  lastFetchedAt?: number;
  lastError?: string;
}

/** 登録していなければ null */
export async function loadNotionStatus(): Promise<NotionStatus | null> {
  const { data, error } = await db().from("notion_sources").select("last_fetched_at, last_error").maybeSingle();
  if (error) throw new Error("Notion の設定を読めませんでした。データベースの準備（SQL の実行）が済んでいるか確かめてください。");
  if (!data) return null;
  return { lastFetchedAt: data.last_fetched_at ? Date.parse(data.last_fetched_at) : undefined, lastError: data.last_error ?? undefined };
}

/** 合言葉と表のアドレスを登録する（前の登録は置き換える） */
export async function registerNotion(token: string, databaseUrl: string): Promise<void> {
  const databaseId = parseDatabaseId(databaseUrl);
  if (!databaseId) throw new Error("表のアドレスを確かめてください（Notion で表を開き「リンクをコピー」したもの）。");
  const t = token.trim();
  if (t.length < 20) throw new Error("合言葉を確かめてください。");
  await db().from("notion_sources").delete().not("user_id", "is", null);
  const { error } = await db().from("notion_sources").insert({ token: t, database_id: databaseId });
  if (error) throw new Error("登録できませんでした。データベースの準備（SQL の実行）が済んでいるか確かめてください。");
}

export async function removeNotion(): Promise<void> {
  const { error } = await db().from("notion_sources").delete().not("user_id", "is", null);
  if (error) throw new Error("削除できませんでした。");
}

async function post<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body ?? {}) });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((json as { error?: string }).error ?? "Notion から読めませんでした。");
  return json as T;
}

export const fetchNotionSchema = () => post<NotionSchema>("/api/notion/schema");
export const fetchNotionRows = (dateProp: string, stageProp?: string) =>
  post<{ rows: NotionRow[]; fetchedAt: number }>("/api/notion/sync", { dateProp, stageProp });

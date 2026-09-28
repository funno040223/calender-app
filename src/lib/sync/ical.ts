import type { CalendarEvent } from "@/lib/scheduler";
import { createClient } from "@/lib/supabase/client";
import { normalizeIcsUrl } from "@/lib/ical/source";

/** 取り込むカレンダー。画面では URL は扱わない（登録するときに1回送るだけ） */
export interface IcalSource {
  id: string;
  name: string;
  lastFetchedAt?: number;
  lastError?: string;
}

export interface SyncResult {
  sources: { id: string; name: string; count: number; error?: string }[];
  events: CalendarEvent[];
  fetchedAt: number;
}

let client: ReturnType<typeof createClient> | undefined;
const db = () => (client ??= createClient());

export async function listSources(): Promise<IcalSource[]> {
  const { data, error } = await db().from("ical_sources").select("id, name, last_fetched_at, last_error").order("created_at");
  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    lastFetchedAt: r.last_fetched_at ? Date.parse(r.last_fetched_at) : undefined,
    lastError: r.last_error ?? undefined,
  }));
}

/** 形が正しくなければ、理由を投げる */
export async function addSource(name: string, rawUrl: string): Promise<void> {
  const url = normalizeIcsUrl(rawUrl);
  if (!url) throw new Error("Google カレンダーか iCloud の、https で始まる iCal の URL を入れてください。");
  const { error } = await db().from("ical_sources").insert({ name: name.trim() || "Google カレンダー", url: url.href });
  if (error) throw new Error("登録できませんでした。時間をおいて試してください。");
}

export async function removeSource(id: string): Promise<void> {
  const { error } = await db().from("ical_sources").delete().eq("id", id);
  if (error) throw new Error("削除できませんでした。");
}

export async function syncImports(from: number, to: number): Promise<SyncResult> {
  const res = await fetch("/api/ical/sync", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ from, to }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error ?? "取り込みに失敗しました。");
  return body as SyncResult;
}

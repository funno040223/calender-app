import { createClient } from "@/lib/supabase/client";

/** アプリの予定の iCal 配信：合言葉を作って、その SHA-256 だけを保存する */

let client: ReturnType<typeof createClient> | undefined;
const db = () => (client ??= createClient());

export interface FeedInfo {
  createdAt: number;
}

export async function loadFeed(): Promise<FeedInfo | null> {
  const { data, error } = await db().from("ical_feeds").select("created_at").maybeSingle();
  if (error) throw new Error("配信の設定を読めませんでした。データベースの準備（SQL の実行）が済んでいるか確かめてください。");
  return data ? { createdAt: Date.parse(data.created_at) } : null;
}

function base64url(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** 新しいアドレスを作る（前のアドレスは使えなくなる）。アドレスはこのときだけ返す */
export async function createFeed(): Promise<string> {
  const token = base64url(crypto.getRandomValues(new Uint8Array(32)));
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token)));
  const hash = [...digest].map((b) => b.toString(16).padStart(2, "0")).join("");
  const { data } = await db().auth.getSession();
  const userId = data.session?.user.id;
  if (!userId) throw new Error("ログインしていません");
  const { error } = await db()
    .from("ical_feeds")
    .upsert({ user_id: userId, token_hash: hash, created_at: new Date().toISOString() });
  if (error) throw new Error("配信のアドレスを保存できませんでした。");
  return `${window.location.origin}/api/ical/feed/${token}.ics`;
}

export async function deleteFeed(): Promise<void> {
  const { error } = await db().from("ical_feeds").delete().not("user_id", "is", null);
  if (error) throw new Error("配信を止められませんでした。");
}

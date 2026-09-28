import { createClient } from "@/lib/supabase/client";

/** Supabase の app_state（ユーザーごとに1行の JSON）を読み書きする */

export interface RemoteRow {
  data: unknown;
  updatedAt: number;
}

let client: ReturnType<typeof createClient> | undefined;
const db = () => (client ??= createClient());

async function userId(): Promise<string | undefined> {
  const { data } = await db().auth.getUser();
  return data.user?.id;
}

/** 行がなければ null。通信できなければ例外 */
export async function loadRemote(): Promise<RemoteRow | null> {
  const { data, error } = await db().from("app_state").select("data, updated_at").maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return { data: data.data, updatedAt: Date.parse(data.updated_at) };
}

/** 保存した時刻（サーバーの時計）を返す */
export async function saveRemote(payload: unknown): Promise<number> {
  const id = await userId();
  if (!id) throw new Error("ログインしていません");
  const { data, error } = await db()
    .from("app_state")
    .upsert({ user_id: id, data: payload, version: 2, updated_at: new Date().toISOString() })
    .select("updated_at")
    .single();
  if (error) throw error;
  return Date.parse(data.updated_at);
}

export async function signOut() {
  await db().auth.signOut();
}

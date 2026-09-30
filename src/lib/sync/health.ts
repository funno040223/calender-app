import { createClient } from "@/lib/supabase/client";
import type { HealthSleep } from "@/lib/mock/model";
import { newSecret } from "./feed";

/** ヘルスケアの睡眠の取り込み：ショートカットの合言葉（SHA-256 だけ保存）と、サーバーがまとめた夜ごとの睡眠 */

let client: ReturnType<typeof createClient> | undefined;
const db = () => (client ??= createClient());

export async function loadHealthToken(): Promise<{ createdAt: number } | null> {
  const { data, error } = await db().from("health_tokens").select("created_at").maybeSingle();
  if (error) throw new Error("取り込みの設定を読めませんでした。データベースの準備（SQL の実行）が済んでいるか確かめてください。");
  return data ? { createdAt: Date.parse(data.created_at) } : null;
}

/** 新しい合言葉を作る（前の合言葉は使えなくなる）。合言葉はこのときだけ返す */
export async function createHealthToken(): Promise<string> {
  const { token, hash } = await newSecret();
  const { data } = await db().auth.getSession();
  const userId = data.session?.user.id;
  if (!userId) throw new Error("ログインしていません");
  const { error } = await db().from("health_tokens").upsert({ user_id: userId, token_hash: hash, created_at: new Date().toISOString() });
  if (error) throw new Error("合言葉を保存できませんでした。");
  return token;
}

export async function deleteHealthToken(): Promise<void> {
  const { error } = await db().from("health_tokens").delete().not("user_id", "is", null);
  if (error) throw new Error("取り込みを止められませんでした。");
}

/** 起きた日が fromKey（YYYY-MM-DD）以降の夜 */
export async function loadSleepNights(fromKey: string): Promise<Record<string, HealthSleep>> {
  const { data, error } = await db().from("health_sleep").select("night, sleep_start, sleep_end, asleep_minutes").gte("night", fromKey);
  if (error) throw new Error(error.message);
  return Object.fromEntries(
    (data ?? []).map((r) => [String(r.night), { start: Date.parse(r.sleep_start), end: Date.parse(r.sleep_end), minutes: Number(r.asleep_minutes) }]),
  );
}

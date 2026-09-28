import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * すべてのユーザーの行を読み書きできる Supabase（RLS を通らない）。
 * 通知の送信など、サーバーの定期実行からだけ使う。画面（"use client"）から import しない
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error("SUPABASE_SECRET_KEY が設定されていません。");
  return createSupabaseClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

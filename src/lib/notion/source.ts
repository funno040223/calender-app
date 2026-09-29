import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/**
 * ログインしている本人の Notion の合言葉と表の ID。
 * 合言葉は画面から読めない列なので、本人であることを確かめてから secret key で読む
 */
export async function ownNotionSource(): Promise<{ userId: string; token: string; databaseId: string } | { error: string; status: number }> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { error: "ログインしてください。", status: 401 };
  const { data, error } = await createAdminClient().from("notion_sources").select("token, database_id").eq("user_id", auth.user.id).maybeSingle();
  if (error) return { error: "Notion の設定を読めませんでした。データベースの準備（SQL の実行）が済んでいるか確かめてください。", status: 500 };
  if (!data) return { error: "Notion の表が登録されていません。", status: 404 };
  return { userId: auth.user.id, token: data.token, databaseId: data.database_id };
}

export async function markNotionFetched(userId: string, error?: string) {
  await createAdminClient()
    .from("notion_sources")
    .update(error ? { last_error: error } : { last_fetched_at: new Date().toISOString(), last_error: null })
    .eq("user_id", userId);
}

import { createBrowserClient } from "@supabase/ssr";
import { supabaseEnv } from "./env";

/** ブラウザ（クライアントコンポーネント）から使う Supabase */
export function createClient() {
  const { url, key } = supabaseEnv();
  return createBrowserClient(url, key);
}

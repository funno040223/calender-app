import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseEnv } from "./env";

/** サーバー（サーバーコンポーネント、ルートハンドラー）から使う Supabase。ログイン状態は cookie で受け渡す */
export async function createClient() {
  const { url, key } = supabaseEnv();
  const cookieStore = await cookies();
  return createServerClient(url, key, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (list) => {
        try {
          for (const { name, value, options } of list) cookieStore.set(name, value, options);
        } catch {
          // サーバーコンポーネントからは cookie を書けない。更新は proxy に任せる
        }
      },
    },
  });
}

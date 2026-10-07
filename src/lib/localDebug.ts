/**
 * ローカル検証モード：開発サーバー（next dev）で NEXT_PUBLIC_LOCAL_DEBUG=1 を付けて動かしたときだけ、
 * ログインとサーバー（Supabase）への保存を使わず、この端末の localStorage だけで動かす。
 * 本番ビルド（NODE_ENV=production）では、環境変数が付いていても必ず無効
 */
export const LOCAL_DEBUG = process.env.NODE_ENV !== "production" && process.env.NEXT_PUBLIC_LOCAL_DEBUG === "1";

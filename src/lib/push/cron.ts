import { timingSafeEqual } from "node:crypto";

/** 定期実行（Supabase の pg_cron）からの呼び出しか。Authorization: Bearer <CRON_SECRET> を確かめる */
export function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  const got = request.headers.get("authorization") ?? "";
  if (!secret) return false;
  const a = Buffer.from(got);
  const b = Buffer.from(`Bearer ${secret}`);
  return a.length === b.length && timingSafeEqual(a, b);
}

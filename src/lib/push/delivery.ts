import type { SupabaseClient } from "@supabase/supabase-js";
import type { Notice } from "@/lib/notify/build";
import type { PushPayload, PushTarget } from "./send";

/** 送信中にプロセスが止まっても、次の定期実行で回復できる。送信のタイムアウトより長くする。 */
export const DELIVERY_LEASE_MS = 2 * 60_000;

export interface DeliveryLedger {
  has(key: string): Promise<boolean>;
  claim(key: string, at: string): Promise<boolean>;
  finish(key: string): Promise<void>;
  release(key: string, at: string): Promise<void>;
}

/** 既存の push_sent 表を使う。通常の通知キーは旧版で全端末へ送信済みの記録として残す。 */
export function deliveryLedger(db: SupabaseClient, userId: string): DeliveryLedger {
  return {
    async has(key) {
      const { data, error } = await db.from("push_sent").select("key").eq("user_id", userId).eq("key", key).maybeSingle();
      if (error) throw error;
      return !!data;
    },
    async claim(key, at) {
      const expired = new Date(Date.parse(at) - DELIVERY_LEASE_MS).toISOString();
      const { error: cleanupError } = await db.from("push_sent").delete().eq("user_id", userId).eq("key", key).lt("sent_at", expired);
      if (cleanupError) throw cleanupError;
      const { data, error } = await db.from("push_sent")
        .upsert({ user_id: userId, key, sent_at: at }, { onConflict: "user_id,key", ignoreDuplicates: true }).select("key");
      if (error) throw error;
      return !!data?.length;
    },
    async finish(key) {
      const { error } = await db.from("push_sent").upsert({ user_id: userId, key, sent_at: new Date().toISOString() });
      if (error) throw error;
    },
    async release(key, at) {
      // 期限切れの古い処理が、新しい処理の確保を消さないよう所有時刻も照合する。
      const { error } = await db.from("push_sent").delete().eq("user_id", userId).eq("key", key).eq("sent_at", at);
      if (error) throw error;
    },
  };
}

export type DeliveryResult = "ok" | "gone" | "error" | "skipped";

export async function deliverNotice(
  ledger: DeliveryLedger,
  target: PushTarget,
  notice: Notice,
  send: (target: PushTarget, payload: PushPayload) => Promise<"ok" | "gone" | "error">,
  now = Date.now(),
): Promise<DeliveryResult> {
  const done = `delivered:${target.id}:${notice.key}`;
  const claim = `sending:${target.id}:${notice.key}`;
  if (await ledger.has(notice.key) || await ledger.has(done)) return "skipped";
  const at = new Date(now).toISOString();
  if (!(await ledger.claim(claim, at))) return "skipped";
  try {
    // 確保の直前に別の実行が送信を終えていた場合も、再送しない。
    if (await ledger.has(done)) return "skipped";
    const result = await send(target, { title: notice.title, body: notice.body, url: notice.url, tag: notice.key });
    if (result === "ok") await ledger.finish(done);
    return result;
  } finally {
    // 失敗は送信済みにしない。成功した端末の記録は維持し、失敗した端末だけ次回再送する。
    await ledger.release(claim, at);
  }
}

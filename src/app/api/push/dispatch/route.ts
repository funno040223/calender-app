import { createAdminClient } from "@/lib/supabase/admin";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cleanNotices, heldUntilAwake, isDue, sendPush, type PushTarget } from "@/lib/push/send";
import { awakeSince } from "@/lib/mock/wake";
import { fromStoredV2 } from "@/lib/mock/state";
import { authorized } from "@/lib/push/cron";
import { deliverNotice, deliveryLedger } from "@/lib/push/delivery";

const KEEP_SENT_MS = 3 * 24 * 60 * 60_000;

/**
 * Supabase の pg_cron から1分ごとに呼ばれ、時刻が来た通知を送る。
 * ログインではなく CRON_SECRET で確かめる（proxy.ts はこの道を通す）
 */
export async function POST(request: Request) {
  if (!authorized(request)) return Response.json({ error: "unauthorized" }, { status: 401 });

  const db = createAdminClient();
  const now = Date.now();
  const { data: rows, error } = await db.from("push_schedule").select("user_id, items");
  if (error) return Response.json({ error: "通知の一覧を読めませんでした。" }, { status: 500 });

  let sent = 0;
  let failed = 0;
  for (const row of rows ?? []) {
    let due = cleanNotices(row.items).filter((n) => isDue(n, now));
    // 寝坊した朝は、起きたと分かるまで習慣・タスクの通知を止める
    const dates = [...new Set(due.flatMap((n) => (n.wakeDate ? [n.wakeDate] : [])))];
    if (dates.length) {
      const awake = await awakeTimes(db, row.user_id, dates, now);
      due = due.filter((n) => !heldUntilAwake(n, n.wakeDate ? awake.get(n.wakeDate) : undefined));
    }
    if (!due.length) continue;

    const { data: subs } = await db.from("push_subscriptions").select("id, endpoint, p256dh, auth").eq("user_id", row.user_id);
    if (!subs?.length) continue;

    const ledger = deliveryLedger(db, row.user_id);
    for (const n of due) {
      for (const sub of subs as PushTarget[]) {
        try {
          const r = await deliverNotice(ledger, sub, n, sendPush);
          if (r === "ok") sent++;
          if (r === "error") failed++;
          if (r === "gone") await db.from("push_subscriptions").delete().eq("id", sub.id);
        } catch {
          failed++;
          console.warn("通知の送信または記録に失敗しました。次回再試行します。");
        }
      }
    }
  }

  await db.from("push_sent").delete().lt("sent_at", new Date(now - KEEP_SENT_MS).toISOString());
  return Response.json({ sent, failed });
}

/** その朝に起きていると分かった最初の時刻（朝の記録とヘルスケアの目覚めから）。読めなければ、止めずに送る */
async function awakeTimes(db: SupabaseClient, userId: string, dates: string[], now: number): Promise<Map<string, number | undefined>> {
  const [state, health] = await Promise.all([
    db.from("app_state").select("data").eq("user_id", userId).maybeSingle(),
    db.from("health_sleep").select("night, sleep_end").eq("user_id", userId).in("night", dates),
  ]);
  if (state.error) return new Map(dates.map((d) => [d, -Infinity]));
  // アプリと同じ読み込み（古い形で保存された行も移して読む）
  const data = fromStoredV2(state.data?.data, now) ?? {};
  return new Map(
    dates.map((d) => {
      const h = health.data?.find((x) => x.night === d);
      const end = h ? Date.parse(h.sleep_end) : undefined;
      return [d, awakeSince(data, d, Number.isFinite(end) ? end : undefined)];
    }),
  );
}

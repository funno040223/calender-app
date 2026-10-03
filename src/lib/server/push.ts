import type { SupabaseClient } from "@supabase/supabase-js";
import { buildNotices } from "@/lib/notify/build";
import { contactDaysFor, planEvents, travelAsks } from "@/lib/mock/state";
import { planOnServer } from "./plan";

export type PushReplan = { planned: boolean; notices?: number; reason?: string };

/**
 * あるユーザーの通知の一覧（push_schedule）を、サーバーで組み直して保存する。
 * 毎時の定期実行と、ヘルスケアの睡眠が届いたとき（寝坊に合わせて通知を直す）に使う。app_state は書かない
 */
export async function replanPush(db: SupabaseClient, userId: string, raw: unknown, now: number): Promise<PushReplan> {
  const p = await planOnServer(db, userId, raw, now);
  if (!p.ok) return { planned: false, reason: p.reason };
  const { state } = p;
  const items = buildNotices({
    now,
    result: state.result,
    events: planEvents(state, state.classEvents, state.googleEvents),
    places: state.places,
    settings: state.settings,
    habits: state.habits,
    travelAsks: travelAsks(state, now),
    contactDays: contactDaysFor(state, now).map((c) => c.dayStart),
  });
  const { error } = await db.from("push_schedule").upsert({ user_id: userId, items, updated_at: new Date().toISOString() });
  return error ? { planned: false, reason: "save" } : { planned: true, notices: items.length };
}

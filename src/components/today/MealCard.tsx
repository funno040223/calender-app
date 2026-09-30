"use client";

import { useApp } from "@/components/app/StoreProvider";
import { DAY_MS, MIN, formatTime } from "@/lib/mock/jst";
import { dateKeyOf } from "@/lib/mock/model";
import { Card } from "@/components/ui/controls";

/** 今日の食事：家で食べるか、外で食べるかを選ぶ（選ばなければ、予定の空きから自動で決まる） */
export default function MealCard({ today, now }: { today: number; now: number }) {
  const { state, update } = useApp();
  const key = dateKeyOf(today);
  // 朝食（朝ルーティンのあと）→ 昼食 → 夕食 の順
  const sorted = state.habits.filter((h) => h.meal).sort((a, b) => (a.cue ? -1 : a.windowStart) - (b.cue ? -1 : b.windowStart));
  const blockOf = (id: string) => state.result.blocks.find((x) => x.kind === "habit" && x.refId === id && x.start >= today && x.start < today + DAY_MS);
  // 終わった食事は出さない（置いた枠が終わった、置いていなければ時間帯が過ぎた。朝食は次の食事の時間帯まで）
  const meals = sorted.filter((m, i) => {
    const b = blockOf(m.id);
    if (b) return b.end > now;
    const end = m.cue ? (sorted[i + 1]?.windowStart ?? 12 * 60) : m.windowEnd;
    return now < today + end * MIN;
  });
  if (meals.length === 0) return null;
  const home = new Set(state.mealsAtHome[key] ?? []);
  const out = new Set(state.habitSkips[key] ?? []);
  const choose = (id: string, where: "home" | "out") =>
    update((d) => {
      const h = new Set(d.mealsAtHome[key] ?? []);
      const o = new Set(d.habitSkips[key] ?? []);
      const on = where === "home" ? h.has(id) : o.has(id);
      h.delete(id);
      o.delete(id);
      // もう一度押すと、自動に戻す
      if (!on) (where === "home" ? h : o).add(id);
      return { ...d, mealsAtHome: { ...d.mealsAtHome, [key]: [...h] }, habitSkips: { ...d.habitSkips, [key]: [...o] } };
    });
  const seg = (on: boolean) => `press rounded-md px-3 py-1 text-[13px] ${on ? "bg-surface font-semibold text-fg shadow-sm" : "text-muted"}`;
  return (
    <Card title="今日の食事">
      <ul className="flex flex-col pt-0.5 pb-2">
        {meals.map((m) => {
          const b = blockOf(m.id);
          return (
            <li key={m.id} className="flex items-center gap-3 px-4 py-1.5">
              <span className="min-w-0 flex-1 truncate text-[15px]">{m.name}</span>
              <span className="shrink-0 text-right text-[13px] tabular-nums text-muted">
                {b ? formatTime(b.start) : out.has(m.id) ? "" : home.has(m.id) ? "入らない" : "—"}
              </span>
              <div className="flex shrink-0 rounded-lg bg-surface2 p-0.5">
                <button type="button" aria-pressed={home.has(m.id)} onClick={() => choose(m.id, "home")} className={seg(home.has(m.id))}>
                  家で
                </button>
                <button type="button" aria-pressed={out.has(m.id)} onClick={() => choose(m.id, "out")} className={seg(out.has(m.id))}>
                  外で
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

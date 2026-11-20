"use client";

import { useSearchParams } from "next/navigation";
import { useNow } from "./useNow";
import { updateQuery, selectedDate } from "./navigation";
import { useApp } from "@/components/app/StoreProvider";
import { dateKeyOf } from "@/lib/mock/model";
import { dayStartOf, MIN } from "@/lib/mock/jst";
import { MEAL_SLOTS, type MealSlot } from "@/lib/life/model";
import { useLife } from "@/lib/life/store";
import { Card, inputBase } from "@/components/ui/controls";
import { LifeScreen, Segments, choices, field, inset, choice } from "./Controls";
import { MealPanel } from "./Meals";
import { actualName } from "./MealActual";
import Shopping from "./Shopping";
import Recipes from "./Recipes";
import { mealLabels, mealSlotOf } from "./mealSlot";

const views = ["次の食事", "買い物", "レシピ", "履歴"] as const;
const keys = ["next", "shopping", "recipes", "history"];

export default function MealsScreen() {
  const query = useSearchParams();
  const { state } = useApp();
  const life = useLife();
  const now = useNow();
  const today = dateKeyOf(now);
  const raw = query.get("view");
  const view = raw === "pantry" ? views[1] : views[Math.max(0, keys.indexOf(raw ?? ""))];
  const date = selectedDate(query.get("date"), today);
  const blocks = state.result.blocks
    .filter(
      (b) =>
        b.kind === "habit" &&
        dateKeyOf(b.start) === date &&
        mealSlotOf(state.habits.find((h) => h.id === b.refId)),
    )
    .sort((a, b) => a.start - b.start);
  const next = blocks.find((b) => b.end > now);
  const rawSlot = query.get("slot") as MealSlot;
  const hour = (now - dayStartOf(now)) / MIN / 60;
  const slot = MEAL_SLOTS.includes(rawSlot)
    ? rawSlot
    : (mealSlotOf(state.habits.find((h) => h.id === next?.refId)) ??
      (hour < 11 ? "breakfast" : hour < 15 ? "lunch" : "dinner"));
  const block = blocks.find((b) => mealSlotOf(state.habits.find((h) => h.id === b.refId)) === slot);
  const history = Object.values(life.projection.meals)
    .map((row) => row.value)
    .sort((a, b) => b.date.localeCompare(a.date) || MEAL_SLOTS.indexOf(b.slot) - MEAL_SLOTS.indexOf(a.slot));
  return (
    <LifeScreen title="料理">
      <Segments
        label="料理の表示"
        options={views}
        selected={view}
        onChange={(v) => updateQuery({ view: keys[views.indexOf(v)] })}
      />
      {life.error && (
        <p role="status" className="text-sm">
          {life.error}{" "}
          <button type="button" className={choice(false)} onClick={life.retry}>
            再試行
          </button>
        </p>
      )}
      {view === "買い物" ? (
        <Shopping key={raw} date={today} pantry={raw === "pantry"} />
      ) : view === "レシピ" ? (
        <Recipes />
      ) : (
        <>
          <div className={choices}>
            <label className={field}>
              日付
              <input
                type="date"
                className={inputBase}
                value={date}
                onChange={(e) => {
                  if (e.target.value) updateQuery({ date: e.target.value });
                }}
              />
            </label>
            <label className={field}>
              食事枠
              <select className={inputBase} value={slot} onChange={(e) => updateQuery({ slot: e.target.value })}>
                {MEAL_SLOTS.map((s) => (
                  <option value={s} key={s}>
                    {mealLabels[s]}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <MealPanel
            key={date + slot}
            date={date}
            slot={slot}
            minutes={block ? (block.end - block.start) / MIN : undefined}
          />
          {view === "履歴" && (
            <Card title="食事の履歴">
              <div className={inset}>
                {!history.length && <p>まだ記録がありません。</p>}
                {history.map((m) => (
                  <button
                    type="button"
                    key={m.date + m.slot}
                    className={choice(false)}
                    onClick={() => updateQuery({ date: m.date, slot: m.slot })}
                  >
                    {m.date} · {mealLabels[m.slot]} · {actualName(m)}
                  </button>
                ))}
              </div>
            </Card>
          )}
        </>
      )}
    </LifeScreen>
  );
}

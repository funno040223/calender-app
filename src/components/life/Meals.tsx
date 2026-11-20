"use client";

import Link from "next/link";
import { useState } from "react";
import { allRecipes, mealSuggestions } from "@/lib/life/catalog";
import { mealKey, type Meal, type MealSlot } from "@/lib/life/model";
import { useLife } from "@/lib/life/store";
import { Card, inputBase } from "@/components/ui/controls";
import { choice, choices, inset } from "./Controls";
import Breakfast from "./Breakfast";
import MealActual, { actualName } from "./MealActual";
import { mealLabels } from "./mealSlot";

export function MealPanel({
  date,
  slot,
  minutes,
  compact = false,
}: {
  date: string;
  slot: MealSlot;
  minutes?: number;
  compact?: boolean;
}) {
  const life = useLife();
  const p = life.projection;
  const key = mealKey(date, slot);
  const actual = p.meals[key];
  const plan = p.mealPlans[key]?.value;
  const recipes = allRecipes(p);
  const matching = recipes.filter((r) => r.slots.includes(slot));
  const suggestions = mealSuggestions(p, date, slot, minutes ?? Infinity);
  const [all, setAll] = useState(false);
  const [edit, setEdit] = useState(false);
  const conflict = p.conflicts["meal:" + key];
  if (conflict)
    return (
      <Card title={mealLabels[slot] + " · 記録を確認"}>
        <div className={inset}>
          <p>異なる記録が届きました。残す内容を選んでください。</p>
          {conflict.entries.map((entry) => {
            const m = entry.value as Meal;
            return (
              <button
                type="button"
                key={entry.eventId}
                className={choice(false)}
                onClick={() => life.resolveMeal(m)}
              >
                {actualName(m)} {m.consumptions.map((q) => q.name + " " + q.amount + q.unit).join("・")}
              </button>
            );
          })}
        </div>
      </Card>
    );
  return (
    <>
      {slot === "breakfast" && <Breakfast date={date} />}
      <Card
        title={slot === "breakfast" ? "実食の詳細" : mealLabels[slot]}
        right={minutes !== undefined && <span className="text-sm text-muted">{minutes}分枠</span>}
      >
        <fieldset disabled={!life.ready} className={inset}>
          {slot !== "breakfast" && (
            <>
              <div className={choices}>
                {(all ? matching : suggestions).map((r) => (
                  <button
                    type="button"
                    key={r.id}
                    aria-pressed={plan?.method === "home" && plan.recipeId === r.id}
                    className={choice(plan?.method === "home" && plan.recipeId === r.id)}
                    onClick={() => life.planMeal({ date, slot, method: "home", recipeId: r.id, servings: 1 })}
                  >
                    {r.name}
                    {r.minutes !== undefined && <small className="block">自宅 · {r.minutes}分</small>}
                  </button>
                ))}
                {(["restaurant", "delivery"] as const).map((method, i) => (
                  <button
                    type="button"
                    key={method}
                    aria-pressed={plan?.method === method}
                    className={choice(plan?.method === method)}
                    onClick={() => life.planMeal({ date, slot, method })}
                  >
                    {["外食", "宅配"][i]}
                  </button>
                ))}
              </div>
              {plan?.method === "home" && !compact && (
                <label className="flex flex-wrap items-center gap-2 text-sm">
                  予定の量
                  <select
                    className={inputBase}
                    value={plan.servings ?? 1}
                    onChange={(e) => life.planMeal({ ...plan, servings: Number(e.target.value) })}
                  >
                    {[0.5, 1, 1.5, 2, 3, 4].map((n) => (
                      <option key={n} value={n}>
                        {n}人分
                      </option>
                    ))}
                  </select>
                </label>
              )}
              {!suggestions.length && !all && (
                <p className="text-sm text-muted">
                  家で作れる候補がありません。
                  <Link prefetch={false} href="/meals?view=pantry" className="underline">
                    家にある
                  </Link>{" "}
                  ·{" "}
                  <Link prefetch={false} href="/meals?view=shopping" className="underline">
                    買い足す
                  </Link>
                </p>
              )}
              <div className={choices}>
                <button type="button" className={choice(false)} onClick={() => setAll(!all)}>
                  {all ? "おすすめに戻る" : "全候補"}
                </button>
                {plan && (
                  <span role="status" className="text-sm">
                    予定 ·{" "}
                    {plan.method === "home"
                      ? (recipes.find((r) => r.id === plan.recipeId)?.name ?? "自宅")
                      : plan.method === "delivery"
                        ? "宅配"
                        : "外食"}
                  </span>
                )}
              </div>
            </>
          )}
          {actual && <p className="text-sm">実食 · {actualName(actual.value)}</p>}
          {!compact && (
            <>
              <button type="button" className={choice(false)} aria-expanded={edit} onClick={() => setEdit(!edit)}>
                {edit ? "入力を閉じる" : actual ? "実食を訂正する" : "実食を入力する"}
              </button>
              {edit && (
                <MealActual
                  key={actual?.eventId ?? key}
                  date={date}
                  slot={slot}
                  recipes={[...matching, ...recipes.filter((recipe) => !matching.includes(recipe))]}
                  existing={actual?.value}
                  suggested={plan?.method === "home" ? plan.recipeId : plan?.method}
                  plannedServings={plan?.servings}
                />
              )}
            </>
          )}
        </fieldset>
      </Card>
    </>
  );
}

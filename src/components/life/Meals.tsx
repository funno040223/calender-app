"use client";

import Link from "next/link";
import { useState } from "react";
import { allRecipes, consumptionsFor, findRecipe, lackingText, mealOptions, recipeLacking } from "@/lib/life/catalog";
import { mealKey, type Meal, type MealPlan, type MealSlot } from "@/lib/life/model";
import { useLife } from "@/lib/life/store";
import { Card, btnPrimary, inputBase } from "@/components/ui/controls";
import { choice, choices, inset } from "./Controls";
import Breakfast from "./Breakfast";
import MealActual, { actualName } from "./MealActual";
import { useApp } from "@/components/app/StoreProvider";
import { applyMealChoice, mealHabitOf, mealLabels } from "./mealSlot";

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
  const { state, update } = useApp();
  const p = life.projection;
  const key = mealKey(date, slot);
  const actual = p.meals[key];
  const plan = p.mealPlans[key]?.value;
  const recipes = allRecipes(p);
  const matching = recipes.filter((r) => r.slots.includes(slot));
  const suggestions = mealOptions(p, date, slot, minutes ?? Infinity);
  const planned = plan?.method === "home" ? findRecipe(p, plan.recipeId) : undefined;
  const plannedLacking = planned ? recipeLacking(planned, p, slot) : [];
  const [all, setAll] = useState(false);
  const [edit, setEdit] = useState(false);
  const habit = mealHabitOf(state.habits, slot);
  // 食事の予定を保存し、組み直しにも伝える（食事の枠・自炊の枠が出たり消えたりする）
  const choose = (meal: MealPlan) => {
    life.planMeal(meal);
    if (habit && slot !== "breakfast") update((d) => applyMealChoice(d, date, habit.id, meal.method));
  };
  const ate = () => {
    if (!plan) return;
    const recipe = planned;
    const servings = plan.servings ?? 1;
    life.recordMeal({
      date,
      slot,
      status: plan.method === "home" ? "eaten_home" : "eaten_out",
      ...(plan.method === "home" ? {} : { method: plan.method }),
      ...(recipe ? { recipe: { id: recipe.id, name: recipe.name, servings } } : {}),
      consumptions: recipe ? consumptionsFor(recipe, servings, slot) : [],
    });
  };
  const conflict = p.conflicts["meal:" + key];
  if (conflict)
    return (
      <Card title={mealLabels[slot] + " · 記録が食い違っています"}>
        <div className={inset}>
          <p>残すほうを選んでください。</p>
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
        title={slot === "breakfast" ? "食べたもの" : mealLabels[slot]}
        right={minutes !== undefined && <span className="text-sm text-muted">{minutes}分</span>}
      >
        <fieldset disabled={!life.ready} className={inset}>
          {slot !== "breakfast" && (
            <>
              <div className={choices}>
                {(all ? matching.map((r) => ({ recipe: r, lacking: recipeLacking(r, p, slot) })) : suggestions).map(
                  ({ recipe: r, lacking }) => (
                    <button
                      type="button"
                      key={r.id}
                      aria-pressed={plan?.method === "home" && plan.recipeId === r.id}
                      className={choice(plan?.method === "home" && plan.recipeId === r.id) + " flex-col"}
                      onClick={() => choose({ date, slot, method: "home", recipeId: r.id, servings: 1 })}
                    >
                      {r.name}
                      <small className="block font-normal">
                        {r.minutes !== undefined ? r.minutes + "分" : "家"}
                        {lacking.length > 0 && " · " + lackingText(lacking, p)}
                      </small>
                    </button>
                  ),
                )}
                {(["restaurant", "delivery"] as const).map((method, i) => (
                  <button
                    type="button"
                    key={method}
                    aria-pressed={plan?.method === method}
                    className={choice(plan?.method === method)}
                    onClick={() => choose({ date, slot, method })}
                  >
                    {["外で", "宅配"][i]}
                  </button>
                ))}
              </div>
              {plan?.method === "home" && !compact && (
                <label className="flex flex-wrap items-center gap-2 text-sm">
                  量
                  <select
                    className={inputBase}
                    value={plan.servings ?? 1}
                    onChange={(e) => choose({ ...plan, servings: Number(e.target.value) })}
                  >
                    {[0.5, 1, 1.5, 2, 3, 4].map((n) => (
                      <option key={n} value={n}>
                        {n}人分
                      </option>
                    ))}
                  </select>
                </label>
              )}
              {plannedLacking.length > 0 && (
                <p className="text-sm">
                  足りないもの：{plannedLacking.map((q) => q.name).join("・")}（
                  <Link href="/meals?view=shopping" className="underline">
                    買い物
                  </Link>
                  に出ます）
                </p>
              )}
              {!suggestions.length && !all && (
                <p className="text-sm text-muted">
                  家で作れるものがありません。
                  <Link href="/meals?view=pantry" className="underline">
                    家にある
                  </Link>{" "}
                  ·{" "}
                  <Link href="/meals?view=shopping" className="underline">
                    買い物
                  </Link>
                </p>
              )}
              <div className={choices}>
                <button type="button" className={choice(false)} onClick={() => setAll(!all)}>
                  {all ? "おすすめだけ" : "すべて見る"}
                </button>
                {plan && (
                  <span role="status" className="text-sm">
                    予定 ·{" "}
                    {plan.method === "home"
                      ? (planned?.name ?? "家")
                      : plan.method === "delivery"
                        ? "宅配"
                        : "外で"}
                  </span>
                )}
              </div>
            </>
          )}
          {compact && plan && !actual && (
            <button type="button" className={btnPrimary} onClick={ate}>
              食べた
            </button>
          )}
          {actual && <p className="text-sm">食べた · {actualName(actual.value)}</p>}
          {!compact && (
            <>
              <button type="button" className={choice(false)} aria-expanded={edit} onClick={() => setEdit(!edit)}>
                {edit ? "閉じる" : actual ? "食べたものを直す" : "食べたものを記録"}
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

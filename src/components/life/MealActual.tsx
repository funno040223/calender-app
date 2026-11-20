"use client";

import { useState } from "react";
import type { Meal, MealSlot, Recipe } from "@/lib/life/model";
import { consumptionsFor } from "@/lib/life/catalog";
import { useLife } from "@/lib/life/store";
import { btnPrimary, inputBase } from "@/components/ui/controls";
import { choice, choices, field } from "./Controls";

export function actualName(meal: Meal) {
  if (meal.status === "skipped") return "食べない";
  if (meal.status === "eaten_out") return meal.method === "delivery" ? "宅配" : "外食";
  return meal.recipe?.name ?? "自宅";
}

export default function MealActual({
  date,
  slot,
  recipes,
  existing,
  suggested,
  plannedServings,
}: {
  date: string;
  slot: MealSlot;
  recipes: Recipe[];
  existing?: Meal;
  suggested?: string;
  plannedServings?: number;
}) {
  const life = useLife();
  const [selection, setSelection] = useState(
    existing?.status === "skipped"
      ? "skipped"
      : existing?.status === "eaten_out"
        ? (existing.method ?? "restaurant")
        : (existing?.recipe?.id ?? suggested ?? ""),
  );
  const [servings, setServings] = useState(String(existing?.recipe?.servings ?? plannedServings ?? 1));
  const [amounts, setAmounts] = useState<Record<string, string>>(() =>
    Object.fromEntries((existing?.consumptions ?? []).map((q) => [q.ingredientId, String(q.amount)])),
  );
  const recipe = recipes.find((r) => r.id === selection);
  const sameRecipe = existing?.recipe?.id === selection;
  const quantities = sameRecipe
    ? existing.consumptions
    : recipe
      ? consumptionsFor(recipe, recipe.servings, slot)
      : [];
  const baseServings = sameRecipe ? existing.recipe!.servings : (recipe?.servings ?? 1);
  const [saved, setSaved] = useState(false);
  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        const meal: Meal = {
          date,
          slot,
          status:
            selection === "skipped"
              ? "skipped"
              : selection === "restaurant" || selection === "delivery"
                ? "eaten_out"
                : "eaten_home",
          consumptions: [],
        };
        if (selection === "restaurant" || selection === "delivery") meal.method = selection;
        if (recipe || (existing?.recipe && existing.recipe.id === selection)) {
          const snapshot = recipe ?? existing!.recipe!;
          meal.recipe = { id: snapshot.id, name: snapshot.name, servings: Number(servings) };
          meal.consumptions = quantities
            .map((q) => ({
              ...q,
              amount: Number(amounts[q.ingredientId] ?? (q.amount * Number(servings)) / baseServings),
            }))
            .filter((q) => q.amount > 0);
        }
        setSaved(life.recordMeal(meal));
      }}
    >
      <label className={field}>
        食べたもの
        <select
          className={inputBase}
          value={selection}
          onChange={(event) => {
            setSelection(event.target.value);
            setAmounts({});
            setSaved(false);
          }}
        >
          <option value="" disabled>
            選んでください
          </option>
          {recipes.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
          {existing?.recipe && !recipes.some((r) => r.id === existing.recipe?.id) && (
            <option value={existing.recipe.id}>{existing.recipe.name}</option>
          )}
          <option value="home">家（料理名なし）</option>
          <option value="restaurant">外食</option>
          <option value="delivery">宅配</option>
          <option value="skipped">食べない</option>
        </select>
      </label>
      {(recipe || existing?.recipe?.id === selection) && (
        <>
          <label className={field}>
            食べた量（人分）
            <input
              type="number"
              min="0.5"
              max="100"
              step="any"
              required
              className={inputBase}
              value={servings}
              onChange={(e) => {
                setServings(e.target.value);
                setAmounts({});
                setSaved(false);
              }}
            />
          </label>
          {quantities.map((q) => (
            <label key={q.ingredientId} className={field}>
              {q.name}（{q.unit}）
              <input
                type="number"
                step="any"
                min="0"
                required
                className={inputBase}
                value={amounts[q.ingredientId] ?? (q.amount * Number(servings)) / baseServings}
                onChange={(e) => {
                  setAmounts({ ...amounts, [q.ingredientId]: e.target.value });
                  setSaved(false);
                }}
              />
            </label>
          ))}
        </>
      )}
      <div className={choices}>
        <button className={btnPrimary} disabled={!life.ready || !selection}>
          {existing ? "記録を直す" : "記録する"}
        </button>
        {existing && (
          <button type="button" className={choice(false)} onClick={() => life.undoMeal(date, slot)}>
            記録を取り消す
          </button>
        )}
      </div>
      {saved && (
        <span role="status" className="text-sm">
          保存しました
        </span>
      )}
    </form>
  );
}

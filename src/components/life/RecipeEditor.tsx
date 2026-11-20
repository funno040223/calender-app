"use client";

import { useState } from "react";
import { allRecipes } from "@/lib/life/catalog";
import type { Quantity, Recipe } from "@/lib/life/model";
import { useLife } from "@/lib/life/store";
import { btnPrimary, inputBase } from "@/components/ui/controls";
import { choice, choices, field } from "./Controls";

export default function RecipeEditor({ recipe }: { recipe: Recipe }) {
  const life = useLife();
  const [name, setName] = useState(recipe.name);
  const [time, setTime] = useState(String(recipe.minutes ?? ""));
  const [ingredients, setIngredients] = useState(recipe.ingredients);
  const [saved, setSaved] = useState(false);
  const known = new Map(
    allRecipes(life.projection)
      .flatMap((r) => r.ingredients)
      .map((q) => [q.name, q]),
  );
  const update = (index: number, patch: Partial<Quantity>) =>
    setIngredients((current) => current.map((q, i) => (i === index ? { ...q, ...patch } : q)));
  return (
    <details>
      <summary className="cursor-pointer py-2">料理名・材料を編集</summary>
      <form
        className="flex flex-col gap-2"
        onChange={() => setSaved(false)}
        onSubmit={(event) => {
          event.preventDefault();
          const rows = ingredients.map((q) => ({
            ...q,
            name: q.name.trim(),
            unit: q.unit.trim(),
            ingredientId: known.get(q.name.trim())?.ingredientId ?? q.ingredientId,
          }));
          if (new Set(rows.map((q) => q.ingredientId)).size !== rows.length) {
            event.currentTarget.reportValidity();
            return;
          }
          setSaved(
            life.saveRecipe({
              ...recipe,
              name: name.trim(),
              minutes: time ? Number(time) : undefined,
              ingredients: rows,
            }),
          );
        }}
      >
        <label className={field}>
          料理名
          <input
            required
            value={name}
            maxLength={120}
            className={inputBase}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <label className={field}>
          所要時間（分）
          <input
            type="number"
            min="1"
            max="1440"
            className={inputBase}
            value={time}
            onChange={(e) => setTime(e.target.value)}
          />
        </label>
        {ingredients.map((q, i) => (
          <div className="flex flex-wrap items-end gap-2" key={q.ingredientId}>
            <label className={field}>
              食材名
              <input
                className={inputBase + " w-36"}
                value={q.name}
                required
                maxLength={120}
                onChange={(e) => update(i, { name: e.target.value })}
              />
            </label>
            <label className={field}>
              量
              <input
                type="number"
                step="any"
                min="0.001"
                className={inputBase + " w-20"}
                value={q.amount || ""}
                required
                onChange={(e) => update(i, { amount: Number(e.target.value) })}
              />
            </label>
            <label className={field}>
              単位
              <input
                className={inputBase + " w-20"}
                value={q.unit}
                required
                onChange={(e) => update(i, { unit: e.target.value })}
              />
            </label>
            <button
              className={choice(false)}
              type="button"
              onClick={() => setIngredients((current) => current.filter((_, index) => index !== i))}
            >
              削除
            </button>
          </div>
        ))}
        <div className={choices}>
          <button
            type="button"
            className={choice(false)}
            onClick={() =>
              setIngredients([
                ...ingredients,
                { ingredientId: crypto.randomUUID(), name: "", amount: 1, unit: "g" },
              ])
            }
          >
            材料を追加
          </button>
          <button disabled={!life.ready || !name.trim()} className={btnPrimary}>
            レシピを保存
          </button>
        </div>
        {saved && <p role="status">レシピを保存しました</p>}
      </form>
    </details>
  );
}

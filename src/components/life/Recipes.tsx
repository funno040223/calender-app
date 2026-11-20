"use client";

import { useState } from "react";
import { allRecipes, pantryStatus } from "@/lib/life/catalog";
import { useLife } from "@/lib/life/store";
import { MEAL_SLOTS } from "@/lib/life/model";
import { Card, btnPrimary, inputBase } from "@/components/ui/controls";
import { choice, field, inset } from "./Controls";
import { mealLabels } from "./mealSlot";
import RecipeEditor from "./RecipeEditor";

export default function Recipes() {
  const life = useLife();
  const [name, setName] = useState("");
  const [filter, setFilter] = useState("");
  return (
    <>
      <Card title="レシピを足す">
        <form
          className={inset}
          onSubmit={(e) => {
            e.preventDefault();
            if (
              name.trim() &&
              life.saveRecipe({
                id: crypto.randomUUID(),
                name: name.trim(),
                slots: [...MEAL_SLOTS],
                ingredients: [],
                servings: 1,
              })
            )
              setName("");
          }}
        >
          <label className={field}>
            料理名
            <input className={inputBase} required value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <button className={btnPrimary} disabled={!life.ready || !name.trim()}>
            足す
          </button>
        </form>
      </Card>
      <Card title="レシピ一覧">
        <div className={inset}>
          <label className={field}>
            料理名・食材で探す
            <input
              className={inputBase}
              type="search"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
          </label>
          {allRecipes(life.projection)
            .filter((r) => [r.name, ...r.ingredients.map((q) => q.name)].some((n) => n.includes(filter)))
            .map((r) => (
              <details key={r.id} className="border-b border-line pb-1">
                <summary className="cursor-pointer py-3 font-medium">
                  {r.name} <small className="text-muted">{r.minutes && r.minutes + "分"}</small>
                </summary>
                <div className="flex flex-col gap-2 pb-2 text-sm">
                  <p>
                    {r.slots.map((s) => mealLabels[s]).join("・")} · {r.servings}人分
                  </p>
                  {r.ingredients.length ? (
                    <ul>
                      {r.ingredients.map((q) => (
                        <li key={q.ingredientId}>
                          {q.name} {q.amount}
                          {q.unit} ·{" "}
                          {
                            { available: "家にある", missing: "ない", unknown: "不明" }[
                              pantryStatus(q, life.projection)
                            ]
                          }
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p>材料は未登録</p>
                  )}
                  {r.steps?.map((step) => (
                    <p key={step}>{step}</p>
                  ))}
                  {r.source && (
                    <a className="underline" href={r.source} target="_blank" rel="noreferrer">
                      参照元
                    </a>
                  )}
                  <RecipeEditor key={life.projection.recipes[r.id]?.eventId ?? r.id} recipe={r} />
                  <button
                    type="button"
                    className={choice(false)}
                    onClick={() => life.saveRecipe({ ...r, hidden: true })}
                  >
                    おすすめから外す
                  </button>
                </div>
              </details>
            ))}
          {Object.values(life.projection.recipes)
            .filter((row) => row.value.hidden)
            .map(({ value: r }) => (
              <button
                type="button"
                key={r.id}
                className={choice(false)}
                onClick={() => life.saveRecipe({ ...r, hidden: false })}
              >
                {r.name}をおすすめに戻す
              </button>
            ))}
        </div>
      </Card>
    </>
  );
}

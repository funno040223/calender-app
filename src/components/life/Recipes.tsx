"use client";

import { useState } from "react";
import { allRecipes, amountText, isPantryStaple, lackingText, pantryStatus, recipeLacking } from "@/lib/life/catalog";
import { useLife } from "@/lib/life/store";
import { MEAL_SLOTS } from "@/lib/life/model";
import { Card, btnPrimary, inputBase } from "@/components/ui/controls";
import { choice, choices, field, inset } from "./Controls";
import { mealLabels } from "./mealSlot";
import RecipeEditor from "./RecipeEditor";

const kinds = ["すべて", "今作れる", "ご飯", "麺", "朝食"] as const;

export default function Recipes() {
  const life = useLife();
  const [name, setName] = useState("");
  const [filter, setFilter] = useState("");
  const [kind, setKind] = useState<(typeof kinds)[number]>("すべて");
  const p = life.projection;
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
          <div role="group" aria-label="種類" className={choices}>
            {kinds.map((k) => (
              <button
                type="button"
                key={k}
                aria-pressed={k === kind}
                className={choice(k === kind)}
                onClick={() => setKind(k)}
              >
                {k}
              </button>
            ))}
          </div>
          {allRecipes(p)
            .filter((r) => [r.name, ...r.ingredients.map((q) => q.name)].some((n) => n.includes(filter)))
            .map((r) => ({ r, lacking: r.ingredients.length ? recipeLacking(r, p) : undefined }))
            .filter(({ r, lacking }) => {
              const tags = r.tags ?? [];
              if (kind === "今作れる") return lacking?.length === 0;
              if (kind === "ご飯") return tags.includes("ご飯");
              if (kind === "麺") return tags.includes("パスタ") || tags.includes("うどん");
              if (kind === "朝食") return r.slots.includes("breakfast");
              return true;
            })
            .map(({ r, lacking }) => (
              <details key={r.id} className="border-b border-line pb-1">
                <summary className="cursor-pointer py-3 font-medium">
                  {r.name} <small className="text-muted">{r.minutes && r.minutes + "分"}</small>
                  {lacking && (
                    <small className="block font-normal text-muted">
                      {lacking.length ? lackingText(lacking, p) : "今ある物で作れる"}
                    </small>
                  )}
                </summary>
                <div className="flex flex-col gap-2 pb-2 text-sm">
                  <p>
                    {r.slots.map((s) => mealLabels[s]).join("・")} · {r.servings}人分
                  </p>
                  {r.ingredients.length ? (
                    <ul>
                      {r.ingredients.map((q) => (
                        <li key={q.ingredientId}>
                          {q.name} {amountText(q)}
                          {!isPantryStaple(q.ingredientId) &&
                            " · " + { available: "ある", missing: "ない", unknown: "不明" }[pantryStatus(q, p)]}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p>材料は未登録</p>
                  )}
                  {r.steps && r.steps.length > 0 && (
                    <ol className="list-decimal pl-5">
                      {r.steps.map((step) => (
                        <li key={step}>{step}</li>
                      ))}
                    </ol>
                  )}
                  {r.source && (
                    <a className="underline" href={r.source} target="_blank" rel="noreferrer">
                      参照元
                    </a>
                  )}
                  <RecipeEditor key={p.recipes[r.id]?.eventId ?? r.id} recipe={r} />
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
          {Object.values(p.recipes)
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

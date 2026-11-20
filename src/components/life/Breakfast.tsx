"use client";

import { useLife } from "@/lib/life/store";
import Link from "next/link";
import { BREAKFAST_RECIPES } from "@/lib/life/catalog";
import { Card } from "@/components/ui/controls";
import { choice, choices, inset } from "./Controls";

const foodPaths: Record<string, string> = {
  toast: "M5 11C0 6 6 3 12 3s12 3 7 8v9H5z",
  "banana-yogurt": "M4 8h16l-2 12H6zM3 5h18",
  "onigiri-egg": "M9 4q3-3 6 0l6 12q2 5-4 5H7q-6 0-4-5zM9 16h6v5H9z",
};

export default function Breakfast({ date }: { date: string }) {
  const life = useLife();
  const actual = life.projection.meals[`${date}:breakfast`]?.value;
  if (life.projection.conflicts[`meal:${date}:breakfast`])
    return (
      <Card title="朝食の記録">
        <Link
          className="min-h-11 px-4 py-3 underline"
          href={`/meals?view=history&slot=breakfast&date=${date}`}
        >
          食い違う記録を見る
        </Link>
      </Card>
    );
  const selected = actual?.status === "skipped" ? "食べない" : actual?.recipe?.name;
  return (
    <Card title="朝食">
      <fieldset disabled={!life.ready} className={inset}>
        <legend className="sr-only">朝に食べたもの</legend>
        <div className={choices}>
          {BREAKFAST_RECIPES.map((recipe) => life.projection.recipes[recipe.id]?.value ?? recipe)
            .filter((recipe) => !recipe.hidden)
            .map((recipe) => (
              <button
                type="button"
                key={recipe.id}
                aria-pressed={selected === recipe.name}
                className={choice(selected === recipe.name)}
                onClick={() =>
                  life.recordMeal({
                    date,
                    slot: "breakfast",
                    status: "eaten_home",
                    recipe: { id: recipe.id, name: recipe.name, servings: 1 },
                    consumptions: recipe.ingredients,
                  })
                }
              >
                <svg
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                  className="mx-auto mb-1 size-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d={foodPaths[recipe.id]} />
                </svg>
                {recipe.name}
              </button>
            ))}
          <button
            type="button"
            aria-pressed={selected === "食べない"}
            className={choice(selected === "食べない")}
            onClick={() => life.recordMeal({ date, slot: "breakfast", status: "skipped", consumptions: [] })}
          >
            食べない
          </button>
        </div>
        {actual && (
          <div role="status" className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <span>記録済み · {selected ?? "外で食べた"}</span>
            <button type="button" className={choice(false)} onClick={() => life.undoMeal(date, "breakfast")}>
              取り消す
            </button>
          </div>
        )}
      </fieldset>
      {life.error && (
        <p role="status" className="px-4 pb-3 text-sm">
          {life.error}{" "}
          <button className={choice(false)} onClick={life.retry}>
            もう一度
          </button>
        </p>
      )}
    </Card>
  );
}

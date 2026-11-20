"use client";

import { useRef, useState } from "react";
import {
  allRecipes,
  findRecipe,
  ingredientsFor,
  isPantryStaple,
  pantryItems,
  pantryStatus,
  SHOPPING_TEMPLATES,
  shoppingList,
} from "@/lib/life/catalog";
import { quantityKey, type Quantity } from "@/lib/life/model";
import { useLife } from "@/lib/life/store";
import { Card, btnPrimary, inputBase } from "@/components/ui/controls";
import { choice, choices, field, inset } from "./Controls";

export default function Shopping({ date, pantry = false }: { date: string; pantry?: boolean }) {
  const life = useLife();
  const p = life.projection;
  const recipes = allRecipes(p);
  const [templates, setTemplates] = useState<string[]>([]);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [edit, setEdit] = useState<Record<string, Partial<Quantity>>>({});
  const [last, setLast] = useState<{ id: string; cleared: string[] } | null>(null);
  const submitted = useRef(false);
  const [counts, setCounts] = useState<Record<string, string>>({});
  const [showPantry, setShowPantry] = useState(pantry);
  const [filter, setFilter] = useState("");
  const plans = Object.values(p.mealPlans)
    .map((row) => row.value)
    .filter((m) => m.date >= date && m.method === "home" && !p.meals[m.date + ":" + m.slot]);
  const needed = plans.flatMap((m) => {
    const recipe = findRecipe(p, m.recipeId);
    return recipe ? ingredientsFor(recipe, m.servings ?? 1, m.slot) : [];
  });
  const list = shoppingList(p, {
    planned: needed,
    templates: SHOPPING_TEMPLATES.filter((t) => templates.includes(t.id)).flatMap((t) => t.ingredients),
    known: [...recipes.flatMap((r) => r.ingredients), ...Object.values(p.inventory)],
  });
  const selected = list
    .filter((q) => checked[quantityKey(q)] !== false)
    .map((q) => ({ ...q, ...edit[quantityKey(q)] }));
  const update = (q: Quantity, patch: Partial<Quantity>) =>
    setEdit({ ...edit, [quantityKey(q)]: { ...edit[quantityKey(q)], ...patch } });
  const toggle = (id: string) => {
    setTemplates(templates.includes(id) ? templates.filter((t) => t !== id) : [...templates, id]);
    setChecked({});
    setEdit({});
  };
  const { staples, others } = pantryItems(p, recipes);
  const match = (q: Quantity) => q.name.includes(filter);
  const pantryRow = (q: Quantity, staple: boolean) => {
    const key = quantityKey(q);
    const stock = p.inventory[key];
    const status = pantryStatus(q, p);
    const states = staple ? (["available", "missing"] as const) : (["available", "missing", "unknown"] as const);
    const labels = staple ? ["ある", "切れた"] : ["家にある", "ない", "不明"];
    return (
      <div key={q.ingredientId} className="border-b border-line pb-2">
        <p className="font-medium">
          {q.name}
          {stock && " · " + stock.amount + stock.unit}
        </p>
        <div className={choices}>
          {states.map((s, i) => (
            <button
              type="button"
              key={s}
              className={choice(s === status)}
              aria-pressed={s === status}
              onClick={() =>
                // いつもある物の「ある」は、ふだんの扱い（数があれば数で見る）に戻す。数が0のときだけ「ある」と書く
                life.setPresence(
                  q.ingredientId,
                  staple && s === "available" && (!stock || stock.amount > 0) ? "unknown" : s,
                )
              }
            >
              {labels[i]}
            </button>
          ))}
        </div>
        {!isPantryStaple(q.ingredientId) && (
          <details>
            <summary className="cursor-pointer py-2 text-sm">量を直す</summary>
            <form
              className={choices}
              onSubmit={(e) => {
                e.preventDefault();
                const value = counts[key];
                if (value !== undefined && value !== "" && life.stocktake({ ...q, amount: Number(value) }))
                  setCounts({ ...counts, [key]: "" });
              }}
            >
              <label className={field}>
                {q.name}の量（{q.unit}）
                <input
                  required
                  className={inputBase + " w-28"}
                  value={counts[key] ?? ""}
                  type="number"
                  step="any"
                  min="0"
                  max="1000000"
                  onChange={(e) => setCounts({ ...counts, [key]: e.target.value })}
                />
              </label>
              <button disabled={!life.ready} className={choice(false)}>
                保存
              </button>
            </form>
          </details>
        )}
      </div>
    );
  };
  return (
    <>
      <Card title="買い物">
        <form
          className={inset}
          onSubmit={(event) => {
            event.preventDefault();
            if (submitted.current) return;
            submitted.current = true;
            const id = crypto.randomUUID();
            const purchased = selected.map((q) => (q.expiresOn ? q : { ...q, expiryKind: undefined }));
            if (!life.buy(purchased, id)) {
              submitted.current = false;
              return;
            }
            // 買った物の「ない」を外す（数を記録する物は数で、調味料などはいつもある扱いに戻る）
            const cleared = [...new Set(purchased.map((q) => q.ingredientId))].filter(
              (ingredientId) => p.presence[ingredientId]?.value === "missing",
            );
            for (const ingredientId of cleared) life.setPresence(ingredientId, "unknown");
            setLast({ id, cleared });
            setChecked({});
            setEdit({});
          }}
        >
          <div className={field}>
            <span id="shopping-templates">いつもの買い物（いくつでも）</span>
            <div role="group" aria-labelledby="shopping-templates" className={choices}>
              {SHOPPING_TEMPLATES.map((t) => (
                <button
                  type="button"
                  key={t.id}
                  aria-pressed={templates.includes(t.id)}
                  className={choice(templates.includes(t.id))}
                  onClick={() => toggle(t.id)}
                >
                  {t.name}
                </button>
              ))}
            </div>
          </div>
          {!templates.length && (
            <p className="text-sm text-muted">予定した食事に足りない物と、切れた物を出しています。</p>
          )}
          {!list.length && <p className="text-sm text-muted">買うものはありません。</p>}
          {list.map((q) => {
            const key = quantityKey(q);
            const row = { ...q, ...edit[key] };
            return (
              <div key={key} className="border-b border-line pb-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="flex min-h-11 items-center gap-2">
                    <input
                      type="checkbox"
                      checked={checked[key] !== false}
                      onChange={(e) => setChecked({ ...checked, [key]: e.target.checked })}
                    />
                    {q.name}
                  </label>
                  <label>
                    <input
                      aria-label={q.name + "の買う量"}
                      className={inputBase + " w-20"}
                      disabled={checked[key] === false}
                      required
                      min="0.01"
                      step="any"
                      type="number"
                      value={row.amount || ""}
                      onChange={(e) => update(q, { amount: Number(e.target.value) })}
                    />{" "}
                    {q.unit}
                  </label>
                </div>
                <details>
                  <summary className="cursor-pointer py-2 text-sm text-muted">期限</summary>
                  <div className={choices}>
                    <select
                      aria-label={q.name + "の期限の種類"}
                      className={inputBase}
                      value={row.expiryKind ?? "use-by"}
                      onChange={(e) => update(q, { expiryKind: e.target.value as Quantity["expiryKind"] })}
                    >
                      <option value="use-by">消費期限</option>
                      <option value="best-before">賞味期限</option>
                    </select>
                    <input
                      aria-label={q.name + "の期限"}
                      className={inputBase}
                      type="date"
                      value={row.expiresOn ?? ""}
                      onChange={(e) =>
                        update(q, {
                          expiresOn: e.target.value || undefined,
                          expiryKind: e.target.value ? (row.expiryKind ?? "use-by") : undefined,
                        })
                      }
                    />
                  </div>
                </details>
              </div>
            );
          })}
          <button disabled={!life.ready || !selected.length || !!last} className={btnPrimary}>
            買った{selected.length > 0 && "（" + selected.length + "品）"}
          </button>
          {last && (
            <div role="status" className={choices}>
              買ったことにしました
              <button
                type="button"
                className={choice(false)}
                onClick={() => {
                  if (life.undoPurchase(last.id)) {
                    for (const ingredientId of last.cleared) life.setPresence(ingredientId, "missing");
                    setLast(null);
                    submitted.current = false;
                  }
                }}
              >
                取り消す
              </button>
              <button
                type="button"
                className={choice(false)}
                onClick={() => {
                  setLast(null);
                  submitted.current = false;
                }}
              >
                続けて買う
              </button>
            </div>
          )}
        </form>
      </Card>
      <Card title="家にある食材">
        <div className={inset}>
          <button
            type="button"
            aria-expanded={showPantry}
            className={choice(false)}
            onClick={() => setShowPantry(!showPantry)}
          >
            {showPantry ? "閉じる" : "家にあるものを見る"}
          </button>
          {showPantry && (
            <>
              <label className={field}>
                探す
                <input
                  type="search"
                  className={inputBase}
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                />
              </label>
              <p className="text-sm font-semibold">いつもある物</p>
              <p className="text-sm text-muted">切れたときだけ押す。買った物は数で見ます。</p>
              {staples.filter(match).map((q) => pantryRow(q, true))}
              <p className="pt-2 text-sm font-semibold">そのほか</p>
              {others.filter(match).map((q) => pantryRow(q, false))}
            </>
          )}
        </div>
      </Card>
    </>
  );
}

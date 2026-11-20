"use client";

import { useRef, useState } from "react";
import { allRecipes, ingredientsFor, pantryStatus, SHOPPING_TEMPLATES, shoppingNeeds } from "@/lib/life/catalog";
import { quantityKey, type Quantity } from "@/lib/life/model";
import { useLife } from "@/lib/life/store";
import { Card, btnPrimary, inputBase } from "@/components/ui/controls";
import { choice, choices, field, inset } from "./Controls";

export default function Shopping({ date, pantry = false }: { date: string; pantry?: boolean }) {
  const life = useLife();
  const p = life.projection;
  const recipes = allRecipes(p);
  const [template, setTemplate] = useState("");
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [edit, setEdit] = useState<Record<string, Partial<Quantity>>>({});
  const [last, setLast] = useState("");
  const submitted = useRef(false);
  const [counts, setCounts] = useState<Record<string, string>>({});
  const [showPantry, setShowPantry] = useState(pantry);
  const [filter, setFilter] = useState("");
  const plans = Object.values(p.mealPlans)
    .map((row) => row.value)
    .filter((m) => m.date >= date && m.method === "home" && !p.meals[m.date + ":" + m.slot]);
  const needed = plans.flatMap((m) => {
    const recipe = recipes.find((r) => r.id === m.recipeId);
    return recipe ? ingredientsFor(recipe, m.servings ?? 1, m.slot) : [];
  });
  const known = [
    ...recipes.flatMap((r) => r.ingredients),
    ...SHOPPING_TEMPLATES.flatMap((t) => t.ingredients),
    ...Object.values(p.inventory),
  ];
  // 「ない」にした食材は、予定がなくても買うものに戻す（量は材料の標準の量）
  const missing = [...new Map(known.map((q) => [q.ingredientId, q])).values()].filter(
    (q) => p.presence[q.ingredientId]?.value === "missing" && !needed.some((n) => n.ingredientId === q.ingredientId),
  );
  const templateRows = SHOPPING_TEMPLATES.find((t) => t.id === template)?.ingredients ?? [];
  const templateKeys = new Set(templateRows.map(quantityKey));
  const list = shoppingNeeds(p, [...needed, ...missing], templateRows).filter(
    (q) => templateKeys.has(quantityKey(q)) || p.presence[q.ingredientId]?.value !== "available",
  );
  const selected = list
    .filter((q) => checked[quantityKey(q)] !== false)
    .map((q) => ({ ...q, ...edit[quantityKey(q)] }));
  const ingredients = new Map(
    [
      ...recipes.flatMap((r) => r.ingredients),
      ...SHOPPING_TEMPLATES.flatMap((t) => t.ingredients),
      ...Object.values(p.inventory),
    ].map((q) => [quantityKey(q), q]),
  );
  const update = (q: Quantity, patch: Partial<Quantity>) =>
    setEdit({ ...edit, [quantityKey(q)]: { ...edit[quantityKey(q)], ...patch } });
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
            setLast(id);
            setChecked({});
            setEdit({});
          }}
        >
          <label className={field}>
            いつもの買い物
            <select
              className={inputBase}
              value={template}
              onChange={(event) => {
                setTemplate(event.target.value);
                setChecked({});
                setEdit({});
              }}
            >
              <option value="">予定の食事に必要なもの</option>
              {SHOPPING_TEMPLATES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
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
                  if (life.undoPurchase(last)) {
                    setLast("");
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
                  setLast("");
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
              {[...ingredients.values()]
                .filter((q) => q.name.includes(filter))
                .map((q) => {
                  const stock = p.inventory[quantityKey(q)];
                  const status = pantryStatus(q, p);
                  const key = quantityKey(q);
                  return (
                    <div key={key} className="border-b border-line pb-2">
                      <p className="font-medium">
                        {q.name}
                        {stock && " · " + stock.amount + stock.unit}
                      </p>
                      <div className={choices}>
                        {(["available", "missing", "unknown"] as const).map((s, i) => (
                          <button
                            type="button"
                            key={s}
                            className={choice(s === status)}
                            aria-pressed={s === status}
                            onClick={() => life.setPresence(q.ingredientId, s)}
                          >
                            {["家にある", "ない", "不明"][i]}
                          </button>
                        ))}
                      </div>
                      <details>
                        <summary className="cursor-pointer py-2 text-sm">量を直す</summary>
                        <form
                          className={choices}
                          onSubmit={(e) => {
                            e.preventDefault();
                            const value = counts[key];
                            if (
                              value !== undefined &&
                              value !== "" &&
                              life.stocktake({ ...q, amount: Number(value) })
                            )
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
                    </div>
                  );
                })}
            </>
          )}
        </div>
      </Card>
    </>
  );
}

import { describe, expect, it } from "vitest";
import {
  allRecipes, amountText, findRecipe, isPantryStaple, LEGACY_RECIPES, mealOptions, pantryStatus, RECIPES,
  recipeLacking, SHOPPING_TEMPLATES, shoppingList,
} from "./catalog";
import { quantityKey, type LifeEntry, type LifeEvent, type Quantity } from "./model";
import { projectLife } from "./projection";

const date = "2026-11-24";
const at = "2026-11-24T01:00:00.000Z";
const id = (n: number) => "26000000-1111-4111-a111-" + String(n).padStart(12, "0");
const event = (n: number, entry: LifeEntry): LifeEvent =>
  ({ id: id(n), schemaVersion: 1, deviceId: id(99), occurredAt: at, recordedAt: at, kind: entry.kind, payload: entry.value }) as LifeEvent;
const buy = (n: number, q: Quantity) => event(n, { kind: "purchase", value: { ...q, purchaseId: id(n + 500) } });
const presence = (n: number, ingredientId: string, value: "available" | "missing" | "unknown") =>
  event(n, { kind: "presence", value: { ingredientId, value } });
const q = (recipeId: string, ingredientId: string) => RECIPES.find((r) => r.id === recipeId)!.ingredients.find((x) => x.ingredientId === ingredientId)!;
const template = (tid: string) => SHOPPING_TEMPLATES.find((t) => t.id === tid)!.ingredients;

describe("料理のカタログ", () => {
  it("レシピは1人分で、時間・手順があり、同じ食材は同じ名前・単位で使う", () => {
    const units = new Map<string, string>();
    for (const recipe of RECIPES) {
      expect(recipe.servings).toBe(1);
      expect(recipe.minutes).toBeGreaterThan(0);
      expect(recipe.steps?.length).toBeGreaterThan(0);
      expect(recipe.source).toBeUndefined();
      for (const x of recipe.ingredients) {
        expect(x.ingredientId).not.toBe("cooked-rice");
        expect(units.get(x.ingredientId) ?? x.unit).toBe(x.unit);
        units.set(x.ingredientId, x.unit);
      }
    }
    // 定番の買い物は、調味料以外はレシピと同じ単位（買うと候補に効く）
    for (const t of SHOPPING_TEMPLATES)
      for (const x of t.ingredients) if (!isPantryStaple(x.ingredientId) && units.has(x.ingredientId)) expect(x.unit).toBe(units.get(x.ingredientId));
    expect(RECIPES.filter((r) => r.slots.includes("dinner")).length).toBeGreaterThanOrEqual(20);
    expect(amountText({ amount: 0.5, unit: "小さじ" })).toBe("小さじ1/2");
    expect(amountText({ amount: 100, unit: "g" })).toBe("100g");
  });

  it("前のカタログのレシピは候補に出さないが、ID で引ける", () => {
    const p = projectLife([], date);
    const ids = [...RECIPES, ...LEGACY_RECIPES].map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const old of ["onigiri-egg", "chicken-egg-bowl", "tofu-chili-bowl", "frozen-bento-rice"]) {
      expect(findRecipe(p, old)?.id).toBe(old);
      expect(allRecipes(p).some((r) => r.id === old)).toBe(false);
    }
  });

  it("何も記録がなくても、いつもある物だけで作れる候補と、あと1つで作れる候補が出る", () => {
    const p = projectLife([], date);
    const options = mealOptions(p, date, "dinner", 60);
    const ready = options.filter((o) => !o.lacking.length);
    expect(ready.length).toBeGreaterThan(0);
    for (const o of ready) expect(o.recipe.ingredients.every((x) => pantryStatus(x, p) === "available")).toBe(true);
    expect(options.some((o) => o.lacking.length === 1)).toBe(true);
    expect(options.length).toBeLessThanOrEqual(4);
  });

  it("買ったカット野菜と卵があれば、それを使う料理を先に出し、最近食べたものは後ろにする", () => {
    const veg = { ...q("pork-veg-stirfry", "veg-pack"), amount: 2 };
    const eggs = { ...q("oyakodon", "egg"), amount: 10 };
    const p = projectLife([buy(1, veg), buy(2, eggs)], date);
    const first = mealOptions(p, date, "dinner", 60)[0];
    expect(first.lacking).toEqual([]);
    expect(first.recipe.ingredients.some((x) => x.ingredientId === "veg-pack")).toBe(true);
    const ate = event(3, { kind: "meal", value: { date: "2026-11-23", slot: "dinner", status: "eaten_home",
      recipe: { id: first.recipe.id, name: first.recipe.name, servings: 1 }, consumptions: [] } });
    const next = mealOptions(projectLife([buy(1, veg), buy(2, eggs), ate], date), date, "dinner", 60);
    expect(next[0].recipe.id).not.toBe(first.recipe.id);
  });

  it("いつもある物は「切れた」で足りない扱いになり、調味料は数を見ない", () => {
    const rice = q("oyakodon", "pack-rice");
    const soy = q("pork-don", "soy-sauce");
    expect(pantryStatus(rice, projectLife([], date))).toBe("available");
    expect(pantryStatus(rice, projectLife([presence(1, "pack-rice", "missing")], date))).toBe("missing");
    expect(pantryStatus(soy, projectLife([buy(2, { ...soy, amount: 0.1 })], date))).toBe("available");
    const out = projectLife([presence(3, "soy-sauce", "missing")], date);
    expect(recipeLacking(RECIPES.find((r) => r.id === "pork-don")!, out).map((x) => x.ingredientId)).toEqual(["soy-sauce"]);
    // 切れた調味料は「1本」で買い物に出る
    expect(shoppingList(out, {})).toContainEqual(expect.objectContaining({ ingredientId: "soy-sauce", amount: 1, unit: "本" }));
  });

  it("数えているパックご飯がなくなったら、買い物に箱の量で出る", () => {
    const rice = q("oyakodon", "pack-rice");
    const p = projectLife([
      buy(1, { ...rice, amount: 1 }),
      event(2, { kind: "meal", value: { date, slot: "lunch", status: "eaten_home", consumptions: [rice] } }),
    ], "2026-11-25");
    expect(pantryStatus(rice, p)).toBe("missing");
    expect(shoppingList(p, {})).toContainEqual(expect.objectContaining({ ingredientId: "pack-rice", amount: 10, unit: "パック" }));
  });

  it("予定の食事に足りない分は売り場の単位に切り上げ、いつもある物は出さない", () => {
    const p = projectLife([], date);
    const oyakodon = RECIPES.find((r) => r.id === "oyakodon")!;
    const list = shoppingList(p, { planned: [...oyakodon.ingredients, ...oyakodon.ingredients] });
    const byId = Object.fromEntries(list.map((x) => [x.ingredientId, x.amount]));
    expect(byId).toEqual({ "chicken-thigh": 300, onion: 1, egg: 10 });
  });

  it("定番は、家に半分以上ある物を除いて出す", () => {
    const eggs = { ...template("weekly").find((x) => x.ingredientId === "egg")! };
    const many = projectLife([buy(1, { ...eggs, amount: 6 })], date);
    const few = projectLife([buy(1, { ...eggs, amount: 2 })], date);
    const keys = (p: ReturnType<typeof projectLife>) => shoppingList(p, { templates: template("weekly") }).map(quantityKey);
    expect(keys(many)).not.toContain(quantityKey(eggs));
    expect(keys(few)).toContain(quantityKey(eggs));
    // 冷凍の肉はいつもある扱いでも、補充を選べば出る
    expect(shoppingList(projectLife([], date), { templates: template("freezer") }).map((x) => x.ingredientId))
      .toEqual(expect.arrayContaining(["pork-belly-frozen", "ground-meat-frozen"]));
  });
});

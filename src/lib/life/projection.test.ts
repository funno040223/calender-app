import { describe, expect, it } from "vitest";
import { allRecipes, BREAKFAST_RECIPES, findRecipe, ingredientsFor, mealSuggestions, pantryStatus, shoppingNeeds } from "./catalog";
import { quantityKey, type LifeEntry, type LifeEvent, type Meal, type Quantity } from "./model";
import { projectLife } from "./projection";
import { validateLifeBatch } from "./validation";

const date = "2026-11-20";
const early = "2026-11-20T01:00:00.000Z";
const lunch = "2026-11-20T03:00:00.000Z";
const egg: Quantity = { ingredientId: "egg", name: "卵", amount: 1, unit: "個" };
const id = (number: number) => "25000000-1111-4111-a111-" + String(number).padStart(12, "0");

function actual(number: number, entry: LifeEntry, occurredAt = lunch, targets: number[] = [], canceled = false): LifeEvent {
  const base = { id: id(number), schemaVersion: 1 as const, deviceId: id(99), occurredAt, recordedAt: lunch };
  if (targets.length) {
    return { ...base, kind: "correction", supersedes: id(targets[0]), payload: { entry, targets: targets.map(id), canceled } };
  }
  return { ...base, kind: entry.kind, payload: entry.value } as LifeEvent;
}

function purchase(number: number, amount: number, time = early) {
  return actual(number, { kind: "purchase", value: { ...egg, amount, purchaseId: id(number + 200) } }, time);
}

const meal = (status: Meal["status"], amount = 1): Meal =>
  ({ date, slot: "lunch", status, consumptions: status === "eaten_home" ? [{ ...egg, amount }] : [] });

describe("life ledger", () => {
  it("counts distinct purchases and event replay once, corrects total usage and puts stock back after cancellation", () => {
    const p1 = purchase(1, 2);
    const p2 = purchase(2, 3);
    const ate = actual(3, { kind: "meal", value: meal("eaten_home") });
    const corrected = actual(4, { kind: "meal", value: meal("eaten_home", 2) }, lunch, [3]);
    const skip = actual(5, { kind: "meal", value: meal("skipped") }, lunch, [4]);
    const cancel = actual(6, { kind: "meal", value: meal("skipped") }, lunch, [5], true);
    expect(projectLife([p1, p2, p1, ate], date).inventory[quantityKey(egg)].amount).toBe(4);
    expect(projectLife([corrected, p2, ate, p1, corrected], date).inventory[quantityKey(egg)].amount).toBe(3);
    expect(projectLife([p1, p2, ate, corrected, skip], date).inventory[quantityKey(egg)].amount).toBe(5);
    expect(projectLife([p1, p2, ate, corrected, skip, cancel], date).meals).toEqual({});
  });

  it("surfaces incompatible meal choices and concurrent corrections and resolves all current heads", () => {
    const p = purchase(1, 5);
    const ate = actual(2, { kind: "meal", value: meal("eaten_home") });
    const skip = actual(3, { kind: "meal", value: meal("skipped") });
    const resolved = actual(4, { kind: "meal", value: meal("eaten_home", 2) }, lunch, [2, 3]);
    const left = actual(5, { kind: "meal", value: meal("eaten_home", 3) }, lunch, [4]);
    const right = actual(6, { kind: "meal", value: meal("eaten_out") }, lunch, [4]);
    const key = "meal:" + date + ":lunch";
    const conflict = projectLife([p, ate, skip], date);
    expect(conflict.conflicts[key].entries.map(({ eventId }) => eventId)).toEqual([ate.id, skip.id]);
    expect(conflict.inventory[quantityKey(egg)].amount).toBe(5);
    expect(projectLife([p, ate, skip, resolved], date).inventory[quantityKey(egg)].amount).toBe(3);
    const both = projectLife([p, ate, skip, resolved, left, right], date);
    expect(both.conflicts[key].entries).toHaveLength(2);
    expect(both.inventory[quantityKey(egg)].amount).toBe(5);
  });

  it("never consumes later purchases and excludes only expired use-by lots from available inventory", () => {
    const late = purchase(3, 4, "2026-11-22T00:00:00.000Z");
    const expired = actual(4, { kind: "purchase", value: { ...egg, amount: 8, purchaseId: id(100), expiresOn: date, expiryKind: "use-by" } }, early);
    const bestBefore = actual(5, { kind: "purchase", value: { ...egg, amount: 1, purchaseId: id(101), expiresOn: date, expiryKind: "best-before" } }, early);
    const ate = actual(1, { kind: "meal", value: meal("eaten_home", 2) }, "2026-11-19T03:00:00.000Z");
    expect(projectLife([late, expired, bestBefore, ate], "2026-11-22").inventory[quantityKey(egg)].amount).toBe(5);
  });

  it("keeps exercise rounds and separate meal slots independent and rejects malformed or unknown records", () => {
    const breakfast = actual(5, { kind: "meal", value: { ...meal("eaten_home"), slot: "breakfast" } });
    const dinner = actual(6, { kind: "meal", value: { ...meal("eaten_out"), slot: "dinner" } });
    const exercise = actual(7, { kind: "exercise", value: { roundId: "strength-2026-11-16-1", date, variant: "short", activity: "strength" } });
    expect(projectLife([breakfast, dinner, exercise, exercise], date).meals).toHaveProperty(date + ":breakfast");
    expect(Object.keys(projectLife([breakfast, dinner, exercise, exercise], date).exercise)).toEqual(["strength-2026-11-16-1"]);
    expect(validateLifeBatch([breakfast, dinner, exercise])).toBe("ok");
    expect(validateLifeBatch([exercise, exercise])).toBe("invalid");
    expect(validateLifeBatch([{ ...exercise, schemaVersion: 2 }])).toBe("unsupported");
    expect(validateLifeBatch([{ ...exercise, payload: { date, variant: "short", activity: "strength", roundId: "__proto__" } }])).toBe("invalid");
  });
});

describe("meal selection", () => {
  it("distinguishes unknown inventory, filters availability and merges overlapping planned and staple quantities", () => {
    const projection = projectLife([purchase(1, 3)], date);
    expect(pantryStatus(egg, projection)).toBe("available");
    expect(pantryStatus({ ...egg, amount: 4 }, projection)).toBe("missing");
    expect(pantryStatus({ ...egg, ingredientId: "banana" }, projection)).toBe("unknown");
    // 卵があれば、いつもある物（パックご飯・しょうゆ）と合わせて卵かけご飯が作れる
    expect(mealSuggestions(projection, date, "breakfast", 15).map((recipe) => recipe.id)).toEqual(["tkg"]);
    const recipes = allRecipes(projection);
    expect(recipes.filter((recipe) => recipe.slots.includes("breakfast"))).toHaveLength(BREAKFAST_RECIPES.length);
    // 前のカタログのレシピは一覧に出さないが、ID では引ける
    expect(recipes.some((recipe) => recipe.id === "tofu-egg-cheese")).toBe(false);
    const food = findRecipe(projection, "tofu-egg-cheese")!;
    expect(ingredientsFor(food, 0.5, "dinner")).toContainEqual({ ingredientId: "cooked-rice", name: "ご飯（炊飯済み）", amount: 100, unit: "g" });
    expect(shoppingNeeds(projection, [{ ...egg, amount: 2 }, { ...egg, amount: 2 }], [{ ...egg, amount: 4 }])).toEqual([{ ...egg, amount: 1 }]);
  });
});

it("credits a new exercise only once per activity and day, including overlap with a banked legacy mark", async () => {
  const { rewardBreakdown, withLifeExerciseRewards } = await import("@/lib/mock/stats");
  const { sampleData } = await import("@/lib/mock/state");
  const exercise = (roundId: string, activity: "strength" | "walking", date: string): LifeEntry =>
    ({ kind: "exercise", value: { roundId, date, activity, variant: "short" } });
  const p = actual(2, exercise("first", "strength", date));
  const laterStrength = actual(3, exercise("second", "strength", date));
  const walk = actual(4, exercise("walk", "walking", date));
  const profile = sampleData(Date.parse(lunch));
  const old = {
    ...profile,
    habitLogs: { [date]: { "habit-home-exercise": "done" as const } },
    rewardBank: { ...profile.rewardBank!, until: Date.parse("2026-11-21T00:00:00.000Z") },
  };
  const projection = projectLife([p, p, laterStrength, walk], date);
  const view = withLifeExerciseRewards(old, projection);
  expect(view.habitLogs).toBe(old.habitLogs);
  expect(rewardBreakdown(view).habit - rewardBreakdown(old).habit).toBe(profile.rewardRates.habit);
  expect(rewardBreakdown(withLifeExerciseRewards(profile, projection)).habit - rewardBreakdown(profile).habit).toBe(profile.rewardRates.habit * 2);
});

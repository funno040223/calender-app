import { dateKeyOf } from "@/lib/mock/model";
import { entryKey, eventEntry, mealKey, quantityKey, targetsOf, type LifeEntry, type LifeEvent, type LifeProjection, type Quantity } from "./model";

export function indexHeads(events: LifeEvent[]) {
  const indexed = new Map(events.map((event) => [event.id, event]));
  const superseded = new Set<string>();
  for (const event of indexed.values()) {
    const key = entryKey(eventEntry(event));
    for (const id of targetsOf(event)) {
      const previous = indexed.get(id);
      if (previous && entryKey(eventEntry(previous)) === key) superseded.add(id);
    }
  }

  const heads = new Map<string, LifeEvent[]>();
  for (const event of indexed.values()) {
    if (superseded.has(event.id)) continue;
    const key = entryKey(eventEntry(event));
    const group = heads.get(key);
    if (group) group.push(event);
    else heads.set(key, [event]);
  }
  for (const group of heads.values()) group.sort((a, b) => a.recordedAt.localeCompare(b.recordedAt) || a.id.localeCompare(b.id));
  return heads;
}

type InventoryChange =
  | { type: "purchase" | "stocktake"; at: string; quantity: Quantity }
  | { type: "consume"; at: string; quantity: Quantity };

function projectInventory(changes: InventoryChange[], today: string) {
  const lots = new Map<string, Quantity[]>();
  const priority = { purchase: 0, stocktake: 1, consume: 2 };
  // Within a date, unsettled mealtimes are evaluated after timestamped changes.
  const at = (change: InventoryChange) => change.at.length === 10 ? change.at + "T23:59:59+09:00" : change.at;
  changes.sort((a, b) => Date.parse(at(a)) - Date.parse(at(b)) || priority[a.type] - priority[b.type]);
  for (const change of changes) {
    const quantity = change.quantity;
    const key = quantityKey(quantity);
    const list = lots.get(key) ?? [];
    if (change.type === "stocktake") {
      lots.set(key, [{ ...quantity }]);
    } else if (change.type === "purchase") {
      lots.set(key, [...list, { ...quantity }]);
    } else {
      // Use dated lots first. Recorded consumption never subtracts from a later purchase.
      list.sort((a, b) => (a.expiresOn ?? "9999").localeCompare(b.expiresOn ?? "9999"));
      let remaining = quantity.amount;
      for (const lot of list) {
        const used = Math.min(remaining, lot.amount);
        lot.amount -= used;
        remaining -= used;
        if (remaining <= 0) break;
      }
    }
  }

  const inventory: Record<string, Quantity> = {};
  for (const [key, list] of lots) {
    const available = list.filter((lot) => lot.amount > 1e-8 && !(lot.expiryKind === "use-by" && lot.expiresOn && lot.expiresOn < today));
    const first = [...available].sort((a, b) => (a.expiresOn ?? "9999").localeCompare(b.expiresOn ?? "9999"))[0] ?? list[0];
    inventory[key] = {
      ingredientId: first.ingredientId,
      name: first.name,
      unit: first.unit,
      amount: Math.round(available.reduce((sum, lot) => sum + lot.amount, 0) * 1e6) / 1e6,
      ...(available.length && first.expiresOn ? { expiresOn: first.expiresOn, expiryKind: first.expiryKind } : {}),
    };
  }
  return inventory;
}

export function projectLife(events: LifeEvent[], today = dateKeyOf(Date.now())): LifeProjection {
  const projection: LifeProjection = {
    meals: {}, mealPlans: {}, exercise: {}, purchases: {}, recipes: {}, presence: {},
    inventory: {}, conflicts: {}, exerciseChoices: {}, fatigue: {}, reviews: {},
  };
  const changes: InventoryChange[] = [];
  for (const [key, heads] of indexHeads(events)) {
    // Automatically remembered placements are proposals for a single round.
    // A manual choice takes precedence over any parallel proposals.
    const choice = key.startsWith("exerciseChoice:");
    const manual = choice ? heads.filter((event) => {
      const entry = eventEntry(event);
      return entry.kind === "exerciseChoice" && !entry.value.automatic;
    }) : heads;
    const group = choice && manual.length === 0 ? [...heads].sort((a, b) => a.id.localeCompare(b.id)).slice(0, 1) : manual;
    if (group.length > 1) {
      projection.conflicts[key] = {
        key,
        entries: group.map((event) => ({ eventId: event.id, value: eventEntry(event).value })),
      };
      continue;
    }
    const event = group[0];
    if (event.kind === "correction" && event.payload.canceled) continue;
    const entry: LifeEntry = eventEntry(event);
    const projected = { eventId: event.id };
    switch (entry.kind) {
      case "meal": {
        const meal = entry.value;
        projection.meals[mealKey(meal.date, meal.slot)] = { ...projected, value: meal };
        if (meal.status === "eaten_home") {
          for (const quantity of meal.consumptions) changes.push({ type: "consume", at: event.occurredAt ?? meal.date, quantity });
        }
        break;
      }
      case "mealPlan":
        projection.mealPlans[mealKey(entry.value.date, entry.value.slot)] = { ...projected, value: entry.value };
        break;
      case "exercise":
        projection.exercise[entry.value.roundId] = { ...projected, value: entry.value };
        break;
      case "purchase":
        projection.purchases[key.slice("purchase:".length)] = { ...projected, value: entry.value };
        changes.push({ type: "purchase", at: event.occurredAt ?? event.recordedAt, quantity: entry.value });
        break;
      case "stocktake":
        changes.push({ type: "stocktake", at: entry.value.asOf, quantity: entry.value });
        break;
      case "recipe":
        projection.recipes[entry.value.id] = { ...projected, value: entry.value };
        break;
      case "presence":
        projection.presence[entry.value.ingredientId] = { ...projected, value: entry.value.value };
        break;
      case "exercisePlan":
        projection.exercisePlan = { ...projected, value: entry.value };
        break;
      case "exerciseChoice":
        projection.exerciseChoices[entry.value.roundId] = { ...projected, value: entry.value };
        break;
      case "fatigue":
        projection.fatigue[entry.value.date] = { ...projected, value: entry.value.value };
        break;
      case "reviewGoal":
        projection.reviewGoal = { ...projected, value: entry.value };
        break;
      case "review":
        projection.reviews[entry.value.date] = { ...projected, value: entry.value };
        break;
    }
  }
  projection.inventory = projectInventory(changes, today);
  return projection;
}

import { entryKey, eventEntry, MEAL_SLOTS, targetsOf, type LifeEntry, type LifeEvent } from "./model";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SAFE_KEY = /^(?!__proto__$|constructor$|prototype$)[\w:.-]{1,160}$/;
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const CLOCK = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
export const MAX_BATCH_EVENTS = 100;
export const MAX_SYNC_BYTES = 512_000;
const knownKinds = new Set([
  "purchase", "meal", "exercise", "stocktake", "mealPlan", "recipe", "presence",
  "exercisePlan", "exerciseChoice", "fatigue", "reviewGoal", "review", "correction",
]);

const record = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);
const uuid = (value: unknown): value is string => typeof value === "string" && UUID.test(value);
const key = (value: unknown): value is string => typeof value === "string" && SAFE_KEY.test(value);
const label = (value: unknown): value is string => typeof value === "string" && value.trim().length > 0 && value.length <= 240;
const date = (value: unknown): value is string => typeof value === "string" && DAY.test(value) && Number.isFinite(Date.parse(value))
  && new Date(value).toISOString().slice(0, 10) === value;
const time = (value: unknown): value is string => typeof value === "string" && CLOCK.test(value) && Number.isFinite(Date.parse(value))
  && new Date(value).toISOString() === value;
const num = (value: unknown, min: number, max: number) => typeof value === "number" && Number.isFinite(value) && value >= min && value <= max;
const integer = (value: unknown, min: number, max: number) => Number.isInteger(value) && num(value, min, max);
const slot = (value: unknown) => MEAL_SLOTS.some((s) => s === value);
const optional = (value: unknown, check: (value: unknown) => boolean) => value === undefined || check(value);
const enumOf = (value: unknown, ...options: string[]) => typeof value === "string" && options.includes(value);
const stringList = (value: unknown) => Array.isArray(value) && value.length <= 20 && value.every(label);

const quantity = (value: unknown) => record(value) && key(value.ingredientId) && label(value.name) && label(value.unit)
  && !value.ingredientId.includes(":") && num(value.amount, 0, 1_000_000)
  && (value.expiresOn === undefined ? value.expiryKind === undefined : date(value.expiresOn) && enumOf(value.expiryKind, "use-by", "best-before"));
const quantities = (value: unknown) => Array.isArray(value) && value.length <= MAX_BATCH_EVENTS && value.every(quantity);
const goal = (value: unknown) => enumOf(value, "outings", "shoulder", "pushups");
const recipeInfo = (value: unknown) => record(value) && key(value.id) && label(value.name) && num(value.servings, 0.5, 100);
const detail = (value: unknown) => record(value) && key(value.id) && optional(value.reps, (x) => integer(x, 0, 10_000))
  && optional(value.sets, (x) => integer(x, 0, 100)) && optional(value.loadKg, (x) => num(x, 0, 1_000))
  && optional(value.minutes, (x) => num(x, 0, 1_440))
  && optional(value.seconds, (x) => integer(x, 0, 3_600)) && optional(value.level, (x) => integer(x, 1, 10));
const levels = (value: unknown) => record(value) && Object.keys(value).length <= 20
  && Object.entries(value).every(([id, n]) => key(id) && integer(n, 1, 10));

function validEntry(kind: unknown, value: unknown): boolean {
  if (kind === "reviewGoal") return goal(value);
  if (!record(value)) return false;
  switch (kind) {
    case "purchase":
      return quantity(value) && num(value.amount, 0.000001, 1_000_000) && uuid(value.purchaseId);
    case "stocktake":
      return quantity(value) && time(value.asOf);
    case "meal":
      return date(value.date) && slot(value.slot) && quantities(value.consumptions)
        && optional(value.recipe, recipeInfo)
        && (value.status === "eaten_home" ? value.method === undefined
          : enumOf(value.status, "eaten_out", "skipped") && Array.isArray(value.consumptions) && value.consumptions.length === 0
            && (value.status === "eaten_out" ? optional(value.method, (x) => enumOf(x, "restaurant", "delivery")) : value.method === undefined));
    case "mealPlan":
      return date(value.date) && slot(value.slot) && enumOf(value.method, "home", "restaurant", "delivery")
        && optional(value.recipeId, key) && optional(value.servings, (x) => num(x, 0.5, 100));
    case "exercise":
      return date(value.date) && key(value.roundId) && enumOf(value.variant, "normal", "short")
        && enumOf(value.activity, "walking", "strength", "mobility")
        && optional(value.details, (x) => Array.isArray(x) && x.length <= 25 && x.every(detail))
        && optional(value.feel, (x) => enumOf(x, "easy", "ok", "hard"));
    case "recipe":
      return recipeInfo(value) && Array.isArray(value.slots) && value.slots.length > 0 && value.slots.length <= 3 && value.slots.every(slot)
        && quantities(value.ingredients) && optional(value.minutes, (x) => num(x, 1, 1_440))
        && optional(value.tags, stringList) && optional(value.tools, stringList) && optional(value.steps, stringList)
        && optional(value.hidden, (x) => typeof x === "boolean")
        && optional(value.source, (x) => typeof x === "string" && x.length <= 512 && /^https:\/\//.test(x));
    case "presence":
      return key(value.ingredientId) && enumOf(value.value, "available", "missing", "unknown");
    case "exercisePlan":
      return typeof value.enabled === "boolean" && integer(value.normalMinutes, 5, 120) && integer(value.shortMinutes, 1, Number(value.normalMinutes))
        && integer(value.weeklyTimes, 1, 7) && typeof value.nonConsecutive === "boolean" && date(value.enabledOn)
        && integer(value.windowStart, 0, 1_439) && integer(value.windowEnd, Number(value.windowStart) + 1, 1_440)
        && (!value.nonConsecutive || Number(value.weeklyTimes) <= 4)
        && optional(value.stage, (x) => integer(x, 1, 4)) && optional(value.stageSince, date) && optional(value.levels, levels);
    case "exerciseChoice":
      return key(value.roundId) && enumOf(value.mode, "normal", "short", "skip")
        && (value.mode === "skip" ? value.start === undefined : optional(value.start, (x) => integer(x, 0, 9_999_999_999_999)))
        && optional(value.automatic, (x) => typeof x === "boolean")
        && optional(value.previousStart, (x) => integer(x, 0, 9_999_999_999_999))
        && optional(value.previousMode, (x) => enumOf(x, "normal", "short"));
    case "fatigue":
      return date(value.date) && enumOf(value.value, "low", "strong", "unknown");
    case "review":
      return date(value.date) && goal(value.goal) && enumOf(value.answer, "easy", "usual", "hard", "skip");
    default:
      return false;
  }
}

export function validateLifeEvent(value: unknown): value is LifeEvent {
  if (!record(value) || !uuid(value.id) || value.schemaVersion !== 1 || !uuid(value.deviceId)
    || !(value.occurredAt === null || time(value.occurredAt)) || !time(value.recordedAt)) return false;
  if (value.kind !== "correction") return value.supersedes === undefined && validEntry(value.kind, value.payload);
  const payload = value.payload;
  return uuid(value.supersedes) && record(payload) && Array.isArray(payload.targets) && payload.targets.length > 0
    && payload.targets.length <= MAX_BATCH_EVENTS && payload.targets[0] === value.supersedes
    && payload.targets.every((id) => uuid(id) && id !== value.id) && new Set(payload.targets).size === payload.targets.length
    && optional(payload.canceled, (x) => typeof x === "boolean")
    && record(payload.entry) && validEntry(payload.entry.kind, payload.entry.value);
}

export type LifeValidation = "ok" | "unsupported" | "invalid";

export function validateLifeBatch(events: unknown): LifeValidation {
  if (!Array.isArray(events) || events.length > MAX_BATCH_EVENTS) return "invalid";
  if (events.some((event) => record(event) && (typeof event.schemaVersion === "number" && event.schemaVersion !== 1
    || typeof event.kind === "string" && !knownKinds.has(event.kind)))) return "unsupported";
  if (!events.every(validateLifeEvent)) return "invalid";
  if (new Set(events.map((event) => event.id)).size !== events.length) return "invalid";
  return "ok";
}

export function lifeEntryKey(event: LifeEvent) {
  return entryKey(eventEntry(event));
}

export function lifeEventRow(event: LifeEvent) {
  return { event, group_key: lifeEntryKey(event), targets: targetsOf(event) };
}

export function correctionEntry(entry: LifeEntry, targets: LifeEvent[], canceled = false) {
  return { targets: targets.map((target) => target.id), entry, ...(canceled ? { canceled: true } : {}) };
}

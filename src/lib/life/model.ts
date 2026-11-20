export const MEAL_SLOTS = ["breakfast", "lunch", "dinner"] as const;
export { EXERCISE_REF_PREFIX as LIFE_EXERCISE_PREFIX } from "@/lib/scheduler/exercise";
export const LEGACY_EXERCISE_HABIT = "habit-home-exercise";
export type MealSlot = (typeof MEAL_SLOTS)[number];

export interface Quantity {
  ingredientId: string;
  name: string;
  amount: number;
  unit: string;
  expiresOn?: string;
  expiryKind?: "use-by" | "best-before";
}

export interface Recipe {
  id: string;
  name: string;
  slots: MealSlot[];
  minutes?: number;
  ingredients: Quantity[];
  servings: number;
  tools?: string[];
  tags?: string[];
  source?: string;
  steps?: string[];
  hidden?: boolean;
}

export interface Meal {
  date: string;
  slot: MealSlot;
  status: "eaten_home" | "eaten_out" | "skipped";
  method?: "restaurant" | "delivery";
  recipe?: Pick<Recipe, "id" | "name" | "servings">;
  consumptions: Quantity[];
}

export interface MealPlan {
  date: string;
  slot: MealSlot;
  method: "home" | "restaurant" | "delivery";
  recipeId?: string;
  servings?: number;
}

export interface Exercise {
  date: string;
  roundId: string;
  variant: "normal" | "short";
  activity: "walking" | "strength" | "mobility";
  /** 種目ごとのくわしい記録。level（種目の段階）と seconds は 2026-11-21 に足した（前の記録にはない） */
  details?: { id: string; reps?: number; sets?: number; loadKg?: number; minutes?: number; seconds?: number; level?: number }[];
  /** やってみてどうだったか（任意。段階を上げるかの目安） */
  feel?: "easy" | "ok" | "hard";
}

export interface ExercisePlan {
  enabled: boolean;
  normalMinutes: number;
  shortMinutes: number;
  weeklyTimes: number;
  nonConsecutive: boolean;
  windowStart: number;
  windowEnd: number;
  enabledOn: string;
  /** 道のりの段階（1〜4。なければ1）。週数では上げず、本人が選ぶ */
  stage?: number;
  /** 今の段階にした日 */
  stageSince?: string;
  /** 種目ごとの段階（種目の ID → 1から）。なければ1 */
  levels?: Record<string, number>;
}

export interface ExerciseChoice {
  roundId: string;
  mode: "normal" | "short" | "skip";
  start?: number;
  automatic?: boolean;
  previousStart?: number;
  previousMode?: "normal" | "short";
}

export type ReviewGoal = "outings" | "shoulder" | "pushups";
export interface Review {
  date: string;
  goal: ReviewGoal;
  answer: "easy" | "usual" | "hard" | "skip";
}

export type Presence = "available" | "missing" | "unknown";
export type Fatigue = "low" | "strong" | "unknown";

export interface LifeValues {
  purchase: Quantity & { purchaseId: string };
  meal: Meal;
  exercise: Exercise;
  stocktake: Quantity & { asOf: string };
  mealPlan: MealPlan;
  recipe: Recipe;
  presence: { ingredientId: string; value: Presence };
  exercisePlan: ExercisePlan;
  exerciseChoice: ExerciseChoice;
  fatigue: { date: string; value: Fatigue };
  reviewGoal: ReviewGoal;
  review: Review;
}

export type LifeKind = keyof LifeValues;
export type LifeEntry = { [K in LifeKind]: { kind: K; value: LifeValues[K] } }[LifeKind];
export interface Correction {
  targets: string[];
  entry: LifeEntry;
  canceled?: boolean;
}

interface EventBase {
  id: string;
  schemaVersion: 1;
  occurredAt: string | null;
  recordedAt: string;
  deviceId: string;
}

export type LifeEvent = EventBase & (
  | { [K in LifeKind]: { kind: K; payload: LifeValues[K] } }[LifeKind]
  | { kind: "correction"; supersedes: string; payload: Correction }
);

export interface Projected<T> {
  eventId: string;
  value: T;
}

export interface LifeConflict {
  key: string;
  entries: Projected<LifeEntry["value"]>[];
}

export interface LifeProjection {
  meals: Record<string, Projected<Meal>>;
  mealPlans: Record<string, Projected<MealPlan>>;
  exercise: Record<string, Projected<Exercise>>;
  purchases: Record<string, Projected<LifeValues["purchase"]>>;
  recipes: Record<string, Projected<Recipe>>;
  presence: Record<string, Projected<Presence>>;
  inventory: Record<string, Quantity>;
  conflicts: Record<string, LifeConflict>;
  exercisePlan?: Projected<ExercisePlan>;
  exerciseChoices: Record<string, Projected<ExerciseChoice>>;
  fatigue: Record<string, Projected<Fatigue>>;
  reviewGoal?: Projected<ReviewGoal>;
  reviews: Record<string, Projected<Review>>;
}

export const mealKey = (date: string, slot: MealSlot) => date + ":" + slot;
export const quantityKey = ({ ingredientId, unit }: Pick<Quantity, "ingredientId" | "unit">) => ingredientId + ":" + unit;

export function entryKey(entry: LifeEntry): string {
  switch (entry.kind) {
    case "meal":
    case "mealPlan": return entry.kind + ":" + mealKey(entry.value.date, entry.value.slot);
    case "purchase": return "purchase:" + entry.value.purchaseId + ":" + quantityKey(entry.value);
    case "stocktake": return "stocktake:" + quantityKey(entry.value);
    case "exercise":
    case "exerciseChoice": return entry.kind + ":" + entry.value.roundId;
    case "recipe": return "recipe:" + entry.value.id;
    case "presence": return "presence:" + entry.value.ingredientId;
    case "review":
    case "fatigue": return entry.kind + ":" + entry.value.date;
    case "exercisePlan":
    case "reviewGoal": return entry.kind;
  }
}

export function eventEntry(event: LifeEvent): LifeEntry {
  return event.kind === "correction" ? event.payload.entry : { kind: event.kind, value: event.payload } as LifeEntry;
}

export function targetsOf(event: LifeEvent): string[] {
  return event.kind === "correction" ? event.payload.targets : [];
}

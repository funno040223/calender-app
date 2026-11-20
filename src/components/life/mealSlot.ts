import type { MealSlot } from "@/lib/life/model";
import { wakingDayStart, type DayPlan, type Habit } from "@/lib/scheduler";
import { dateKeyOf } from "@/lib/mock/model";
import { MIN } from "@/lib/mock/jst";

export const mealLabels = { breakfast: "朝食", lunch: "昼食", dinner: "夕食" };
export function mealSlotOf(habit?: Habit): MealSlot | undefined {
  if (!habit?.meal) return;
  if (habit.id === "habit-breakfast" || habit.cue || /朝/.test(habit.name)) return "breakfast";
  if (habit.id === "habit-lunch" || /昼/.test(habit.name)) return "lunch";
  if (habit.id === "habit-dinner" || /夕|夜/.test(habit.name)) return "dinner";
  return habit.windowStart < 10 * 60 ? "breakfast" : habit.windowStart < 16 * 60 ? "lunch" : "dinner";
}

type MealChoice = "home" | "restaurant" | "delivery";
type MealKnobs = { mealsAtHome: Record<string, string[]>; habitSkips: Record<string, string[]> };

/** 食事の習慣（朝食・昼食・夕食のどれか）を探す */
export function mealHabitOf(habits: Habit[], slot: MealSlot) {
  return habits.find((h) => mealSlotOf(h) === slot);
}

/** 家で食べる → mealsAtHome、外で・宅配 → habitSkips に入れて、組み直しに伝える（今日の食事と同じ） */
export function applyMealChoice<T extends MealKnobs>(d: T, key: string, habitId: string, method: MealChoice): T {
  const home = new Set(d.mealsAtHome[key] ?? []);
  const out = new Set(d.habitSkips[key] ?? []);
  home.delete(habitId);
  out.delete(habitId);
  (method === "home" ? home : out).add(habitId);
  return { ...d, mealsAtHome: { ...d.mealsAtHome, [key]: [...home] }, habitSkips: { ...d.habitSkips, [key]: [...out] } };
}

/** 起きている日の始まりと、そこからの分数。0時を過ぎても夕食まで前の日の続き */
export function mealDayOf(
  now: number,
  days: Pick<DayPlan, "dayStart" | "wake" | "bed">[],
  tz: number,
): { dayStart: number; date: string; minutes: number } {
  const dayStart = wakingDayStart(now, days, tz);
  return { dayStart, date: dateKeyOf(dayStart), minutes: Math.floor((now - dayStart) / MIN) };
}

export const slotAtMinutes = (minutes: number): MealSlot => (minutes < 11 * 60 ? "breakfast" : minutes < 15 * 60 ? "lunch" : "dinner");

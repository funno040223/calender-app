import type { MealSlot } from "@/lib/life/model";
import type { Habit } from "@/lib/scheduler";

export const mealLabels = { breakfast: "朝食", lunch: "昼食", dinner: "夕食" };
export function mealSlotOf(habit?: Habit): MealSlot | undefined {
  if (!habit?.meal) return;
  if (habit.id === "habit-breakfast" || habit.cue || /朝/.test(habit.name)) return "breakfast";
  if (habit.id === "habit-lunch" || /昼/.test(habit.name)) return "lunch";
  if (habit.id === "habit-dinner" || /夕|夜/.test(habit.name)) return "dinner";
  return habit.windowStart < 10 * 60 ? "breakfast" : habit.windowStart < 16 * 60 ? "lunch" : "dinner";
}

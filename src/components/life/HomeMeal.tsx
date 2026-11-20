"use client";

import { useApp } from "@/components/app/StoreProvider";
import { DAY_MS, MIN } from "@/lib/mock/jst";
import { useLife } from "@/lib/life/store";
import { mealDayOf, mealSlotOf, slotAtMinutes } from "./mealSlot";
import Breakfast from "./Breakfast";
import { MealPanel } from "./Meals";
import HomeExercise from "./HomeExercise";

/** ホームに出すのは、始まる2時間前から（ほかの時間は料理の画面で選ぶ） */
const MEAL_AHEAD_MS = 2 * 60 * MIN;

export default function HomeMeal({ now, morning }: { now: number; morning: boolean }) {
  const { state } = useApp();
  const life = useLife();
  const { dayStart: today, date, minutes } = mealDayOf(now, state.result.dayPlans, state.settings.tzOffsetMinutes);
  const block = state.result.blocks
    .filter((b) => b.kind === "habit" && b.end > now && b.start < today + DAY_MS && mealSlotOf(state.habits.find((h) => h.id === b.refId)))
    .sort((a, b) => a.start - b.start)[0];
  const next = block && mealSlotOf(state.habits.find((h) => h.id === block.refId));
  const slot = morning && minutes < 12 * 60 ? "breakfast" : (next ?? slotAtMinutes(minutes));
  // 朝食は朝のうち。ほかの食事は、枠の2時間前から枠が終わるまで（記録したあとも、直せるように出したまま）
  const showMeal = slot === "breakfast" ? morning : !!block && block.start - now <= MEAL_AHEAD_MS;
  return (
    <>
      {life.projection.exercisePlan?.value.enabled && <HomeExercise now={now} />}
      {showMeal &&
        (slot === "breakfast" ? (
          <Breakfast date={date} />
        ) : (
          <MealPanel key={date + slot} date={date} slot={slot} minutes={block ? (block.end - block.start) / MIN : undefined} compact />
        ))}
    </>
  );
}

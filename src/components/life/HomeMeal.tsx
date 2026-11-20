"use client";

import dynamic from "next/dynamic";
import { useApp } from "@/components/app/StoreProvider";
import { dateKeyOf } from "@/lib/mock/model";
import { DAY_MS, dayStartOf, MIN } from "@/lib/mock/jst";
import { mealSlotOf } from "./mealSlot";
import Breakfast from "./Breakfast";
import { useLife } from "@/lib/life/store";

const MealPanel = dynamic(() => import("./Meals").then((module) => module.MealPanel));
const HomeExercise = dynamic(() => import("./HomeExercise"));

export default function HomeMeal({ now, morning }: { now: number; morning: boolean }) {
  const { state } = useApp();
  const life = useLife();
  const today = dayStartOf(now);
  const block = state.result.blocks
    .filter(
      (b) =>
        b.kind === "habit" &&
        b.end > now &&
        b.start < today + DAY_MS &&
        mealSlotOf(state.habits.find((h) => h.id === b.refId)),
    )
    .sort((a, b) => a.start - b.start)[0];
  const minutes = Math.floor((now - today) / MIN);
  const next = block && mealSlotOf(state.habits.find((h) => h.id === block.refId));
  const slot =
    morning && minutes < 12 * 60
      ? "breakfast"
      : (next ?? (minutes < 11 * 60 ? "breakfast" : minutes < 15 * 60 ? "lunch" : "dinner"));
  const date = dateKeyOf(today);
  return (
    <>
      {life.projection.exercisePlan?.value.enabled && <HomeExercise now={now} />}
      {slot === "breakfast" ? (
        <Breakfast date={date} />
      ) : (
        <MealPanel
          key={date + slot}
          date={date}
          slot={slot}
          minutes={block ? (block.end - block.start) / MIN : undefined}
          compact
        />
      )}
    </>
  );
}

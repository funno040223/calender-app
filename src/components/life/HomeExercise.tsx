"use client";

import { useApp } from "@/components/app/StoreProvider";
import { dateKeyOf } from "@/lib/mock/model";
import { wakingDayStart } from "@/lib/scheduler";
import { MIN } from "@/lib/mock/jst";
import { ExercisePanel } from "./Exercise";
import ExerciseRoundChoices from "./ExerciseRoundChoices";

export default function HomeExercise({ now }: { now: number }) {
  const { state } = useApp();
  const today = dateKeyOf(wakingDayStart(now, state.result.dayPlans, state.settings.tzOffsetMinutes));
  const round = (state.result.exerciseRounds ?? []).find(
    (r) =>
      r.date === today &&
      (r.status === "confirm" || (r.block && r.block.start <= now + 90 * MIN && r.block.end >= now - 60 * MIN)),
  );
  if (!round) return null;
  return (
    <>
      <ExerciseRoundChoices round={round} />
      <ExercisePanel
        date={today}
        activity="strength"
        roundId={round.roundId}
        minutes={round.block && (round.block.end - round.block.start) / MIN}
      />
    </>
  );
}

import { describe, expect, it } from "vitest";
import { sampleData, replan } from "@/lib/mock/state";
import { jstTime } from "@/lib/mock/jst";
import type { CalendarEvent, Task } from "@/lib/scheduler";
import { defaultExercisePlan, LEGACY_EXERCISE_HABIT, LIFE_EXERCISE_PREFIX, planLifeExercise } from "./placement";
import { projectLife } from "./projection";
import type { ExerciseChoice, LifeProjection } from "./model";

const monday = "2026-11-16";
const roundId = "strength-" + monday + "-1";
const time = (day: number, hour: number, minute = 0) => jstTime(2026, 11, day, hour, minute);
const now = time(16, 10);

function calendar(events: CalendarEvent[] = [], tasks: Task[] = []) {
  return replan({
    ...sampleData(now), courses: [], events: [], tasks, habits: [], blocks: [], rhythmResets: [],
    settings: { ...sampleData(now).settings, minSlackMinutesPerDay: 0 },
  }, events, now);
}

function life(extra: Partial<LifeProjection> = {}): LifeProjection {
  return {
    ...projectLife([]), ...extra,
    exercisePlan: { eventId: "plan", value: { ...defaultExercisePlan(monday), weeklyTimes: 1, windowStart: 18 * 60, windowEnd: 18 * 60 + 30 } },
  };
}

function event(id: string, day: number, minute: number) {
  return { id, title: id, start: time(day, 18, minute), end: time(day, 18, 30), atHome: true };
}

function withChoice(choice: ExerciseChoice) {
  return life({ exerciseChoices: { [roundId]: { eventId: "choice", value: choice } } });
}

describe("exercise placement", () => {
  it("keeps the existing plan until opt-in and protects all normal appointment/task block identities", () => {
    const input = calendar([], [{ id: "task", title: "作業", priority: 3, durationMinutes: 120, deadline: time(17, 12) }]);
    expect(planLifeExercise(input, projectLife([])).calendarBlocks).toBe(input.blocks);
    const planned = planLifeExercise(input, life());
    expect(planned.failed).toBeUndefined();
    const mondayRound = planned.rounds.find((round) => round.roundId === roundId);
    expect(mondayRound).toMatchObject({ status: "normal", date: monday, block: { refId: LIFE_EXERCISE_PREFIX + roundId } });
    expect(planned.calendarBlocks.filter((block) => !block.refId.startsWith(LIFE_EXERCISE_PREFIX))).toEqual(input.blocks);
    expect(planned.result.shortfalls).toEqual(input.result.shortfalls);
  });

  it("shortens into a five-minute gap and leaves a conflicting user pin for confirmation", () => {
    const input = calendar([event("fixed", 16, 5)]);
    const automatic = planLifeExercise(input, life()).rounds.find((round) => round.roundId === roundId);
    expect(automatic).toMatchObject({ status: "short", date: monday, block: { start: time(16, 18), end: time(16, 18, 5) } });
    const pinned = planLifeExercise(input, withChoice({ mode: "normal", roundId, start: time(16, 18) }));
    expect(pinned.rounds.find((round) => round.roundId === roundId)).toMatchObject({ status: "confirm", date: monday });
    expect(pinned.calendarBlocks.some((block) => block.refId === LIFE_EXERCISE_PREFIX + roundId)).toBe(false);
  });

  it("reschedules the same round within its week and does not create another after completion", () => {
    const input = calendar([event("fixed", 16, 0)]);
    const planned = planLifeExercise(input, life());
    expect(planned.rounds.find((round) => round.roundId === roundId)).toMatchObject({ status: "postponed", date: "2026-11-17" });
    const executed = planLifeExercise(input, life({
      exercise: { [roundId]: { eventId: "done", value: { roundId, date: "2026-11-17", variant: "normal", activity: "strength" } } },
    }));
    expect(executed.rounds.find((round) => round.roundId === roundId)).toMatchObject({ status: "completed", date: "2026-11-17" });
    expect(executed.calendarBlocks.some((block) => block.refId === LIFE_EXERCISE_PREFIX + roundId)).toBe(false);
  });

  it("does not choose normal automatically on a strong-fatigue day and protects Sunday to Monday", () => {
    const input = calendar();
    const tired = planLifeExercise(input, life({ fatigue: { [monday]: { eventId: "tired", value: "strong" } } }));
    expect(tired.rounds.find((round) => round.roundId === roundId)).toMatchObject({ status: "short", date: monday });
    const sunday = "2026-11-15";
    const crossWeek = planLifeExercise({ ...input, habitLogs: { [sunday]: { [LEGACY_EXERCISE_HABIT]: "done" } } }, life());
    expect(crossWeek.rounds.find((round) => round.roundId === roundId)).toMatchObject({ status: "postponed", date: "2026-11-17" });
  });
});

it("keeps an automatically remembered active round at the original start across recalculation", () => {
  const input = calendar();
  const initial = planLifeExercise(input, life());
  const saved = initial.automaticChoices.find((choice) => choice.roundId === roundId)!;
  const recalculated = planLifeExercise(input, withChoice(saved), saved.start! + 60_000);
  expect(recalculated.rounds.find((round) => round.roundId === roundId)?.block?.start).toBe(saved.start);
  expect(recalculated.automaticChoices.some((choice) => choice.roundId === roundId)).toBe(false);
});

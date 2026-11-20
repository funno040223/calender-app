import { describe, expect, it } from "vitest";
import { sampleData, replan } from "@/lib/mock/state";
import { dateKeyOf } from "@/lib/mock/model";
import { jstTime } from "@/lib/mock/jst";
import { isExerciseRef, type CalendarEvent, type Task } from "@/lib/scheduler";
import { defaultExercisePlan, exerciseInputOf } from "./exercisePlan";
import { projectLife } from "./projection";
import { LEGACY_EXERCISE_HABIT, type ExercisePlan, type LifeProjection } from "./model";

const monday = "2026-11-16";
const time = (day: number, hour: number, minute = 0) => jstTime(2026, 11, day, hour, minute);
const now = time(16, 10);
const round1 = `strength-${monday}-1`;

function life(extra: Partial<LifeProjection> = {}, plan: Partial<ExercisePlan> = {}): LifeProjection {
  return { ...projectLife([]), ...extra, exercisePlan: { eventId: "plan", value: { ...defaultExercisePlan(monday), ...plan } } };
}

function planWith(projection: LifeProjection, events: CalendarEvent[] = [], tasks: Task[] = [], at = now) {
  const base = sampleData(at);
  const data = { ...base, courses: [], events: [], tasks, blocks: [], settings: { ...base.settings, minSlackMinutesPerDay: 0 } };
  return replan(data, events, at, exerciseInputOf(projection, data.habitLogs));
}

const exerciseBlocks = (s: ReturnType<typeof planWith>) => s.result.blocks.filter((b) => isExerciseRef(b.refId));

describe("運動の回（配置エンジンの中で置く）", () => {
  it("プランがなければ置かず、あれば週の回数だけ、前の「家での運動」の代わりに置く", () => {
    const off = planWith(projectLife([]));
    expect(off.result.exerciseRounds).toBeUndefined();
    const on = planWith(life());
    const thisWeek = (on.result.exerciseRounds ?? []).filter((r) => r.roundId.startsWith(`strength-${monday}`));
    expect(thisWeek).toHaveLength(2);
    expect(on.result.blocks.some((b) => b.refId === LEGACY_EXERCISE_HABIT)).toBe(false);
    // ほかの枠と重ならない
    for (const b of exerciseBlocks(on)) {
      expect(on.result.blocks.some((x) => x !== b && x.start < b.end && b.start < x.end)).toBe(false);
    }
    // 続けての日に置かない
    const days = exerciseBlocks(on).map((b) => dateKeyOf(b.start)).sort();
    for (let i = 1; i < days.length; i++) expect(Date.parse(days[i]) - Date.parse(days[i - 1])).toBeGreaterThan(86_400_000);
  });

  it("やった回は置かず、選んだ時間にはそこへ置き、休むにした回は置かない", () => {
    const done = planWith(life({ exercise: { [round1]: { eventId: "e", value: { date: monday, roundId: round1, variant: "normal", activity: "strength" } } } }));
    expect(done.result.exerciseRounds?.find((r) => r.roundId === round1)?.status).toBe("completed");
    const at = time(17, 20);
    const chosen = planWith(life({ exerciseChoices: { [round1]: { eventId: "c", value: { roundId: round1, mode: "short", start: at } } } }));
    const r = chosen.result.exerciseRounds?.find((x) => x.roundId === round1);
    expect(r?.block?.start).toBe(at);
    expect(r?.block && r.block.end - r.block.start).toBe(5 * 60_000);
    const skipped = planWith(life({ exerciseChoices: { [round1]: { eventId: "c", value: { roundId: round1, mode: "skip" } } } }));
    expect(skipped.result.exerciseRounds?.find((x) => x.roundId === round1)?.status).toBe("skipped");
  });

  it("手で記録した筋トレも、その週の回に数える", () => {
    const manual = planWith(life({ exercise: { m: { eventId: "m", value: { date: "2026-11-17", roundId: "manual:2026-11-17:strength", variant: "normal", activity: "strength" } } } }));
    expect(manual.result.exerciseRounds?.find((r) => r.roundId === round1)?.status).toBe("completed");
  });

  it("疲れが強い日は短いほうだけ", () => {
    const tired = planWith(life({ fatigue: { [monday]: { eventId: "f", value: "strong" } } }, { weeklyTimes: 1 }));
    const r = tired.result.exerciseRounds?.find((x) => x.roundId === round1);
    expect(r?.block && dateKeyOf(r.block.start)).toBe(monday);
    expect(r?.block && r.block.end - r.block.start).toBe(5 * 60_000);
  });

  it("締切に間に合わない作業があれば、自動では置かずに選んでもらう", () => {
    const huge: Task = { id: "t", title: "大きな作業", priority: 3, durationMinutes: 60 * 60, deadline: time(17, 12) };
    const s = planWith(life(), [], [huge]);
    expect(s.result.shortfalls.length).toBeGreaterThan(0);
    const r = s.result.exerciseRounds?.find((x) => x.roundId === round1);
    expect(r?.status).toBe("confirm");
    expect(r?.options.some((o) => o.mode === "skip")).toBe(true);
  });

  it("組み直しは1回だけで済む（前より大きく遅くならない）", () => {
    const t0 = performance.now();
    planWith(projectLife([]));
    const plain = performance.now() - t0;
    const t1 = performance.now();
    planWith(life());
    const withExercise = performance.now() - t1;
    expect(withExercise).toBeLessThan(plain * 3 + 50);
  });
});

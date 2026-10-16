import { describe, expect, it } from "vitest";
import type { Habit } from "@/lib/scheduler";
import { jst } from "@/lib/scheduler/test-helpers";
import { missHabitBlock, replan, sampleData, toData } from "./state";
import { MIN } from "./jst";

const now = jst(2026, 10, 1, 12);
const tidy: Habit = { id: "tidy", name: "片付け", skippable: true, track: true, durationMinutes: 30, windowStart: 10 * 60, windowEnd: 20 * 60, frequency: { type: "daily" } };
const laundry: Habit = { ...tidy, id: "laundry", name: "洗濯", frequency: { type: "interval", minDays: 4, maxDays: 7 } };
const past = (h: Habit) => ({ kind: "habit" as const, refId: h.id, title: h.name, start: now - 90 * MIN, end: now - 60 * MIN });
function data(habit: Habit) {
  return { ...sampleData(now), courses: [], tasks: [], events: [], habits: [habit], blocks: [past(habit)] };
}

describe("習慣の「できなかった」", () => {
  it("その枠を外し、今日の空いている時間に入れ直す", () => {
    const state = replan(missHabitBlock(data(tidy), past(tidy)), [], now);
    expect(state.blocks.some((b) => b.refId === tidy.id && b.start === past(tidy).start)).toBe(false);
    const again = state.blocks.find((b) => b.refId === tidy.id && b.start >= now);
    expect(again).toBeDefined();
    expect(again!.end).toBeLessThanOrEqual(jst(2026, 10, 1, 20));
  });
  it("押さなければ、終わった枠は今日の分として残る", () => {
    const state = replan(data(tidy), [], now);
    expect(state.blocks.some((b) => b.refId === tidy.id && b.start === past(tidy).start)).toBe(true);
    expect(state.blocks.filter((b) => b.refId === tidy.id && b.start >= now && b.start < jst(2026, 10, 2))).toHaveLength(0);
  });
  it("記録しない間隔の習慣は、始まった枠で数え、「できなかった」で取り消す", () => {
    const plain = { ...laundry, track: undefined };
    const first = replan(data(plain), [], now);
    expect(first.habitDone.lastDone[plain.id]).toBe(past(plain).start);
    const state = replan(missHabitBlock(toData(first), past(plain)), [], now);
    expect(state.habitDone.lastDone[plain.id]).toBeUndefined();
    expect(state.blocks.some((b) => b.refId === plain.id && b.start >= now)).toBe(true);
  });
  it("記録する間隔の習慣（洗濯）は、時刻が過ぎただけでは数えず、「やった」を押した日だけ数える", () => {
    expect(replan(data(laundry), [], now).habitDone.lastDone[laundry.id]).toBeUndefined();
    const done = replan({ ...data(laundry), habitLogs: { "2026-10-01": { [laundry.id]: "done" } } }, [], now);
    expect(done.habitDone.lastDone[laundry.id]).toBe(jst(2026, 10, 1));
  });
  it("寝坊して過ぎた洗濯は「やった」にならず、その日の空いている時間に入れ直す", () => {
    const sleptThrough = { ...data(laundry), habitStarts: { [laundry.id]: [past(laundry).start] }, sleepLogs: [{ id: "2026-10-01", date: "2026-10-01", up: { at: now - 30 * MIN, source: "button" as const } }] };
    const state = replan(sleptThrough, [], now);
    expect(state.habitDone.lastDone[laundry.id]).toBeUndefined();
    expect(state.blocks.some((b) => b.refId === laundry.id && b.title === laundry.name && b.start >= now && b.start < jst(2026, 10, 2))).toBe(true);
  });
});

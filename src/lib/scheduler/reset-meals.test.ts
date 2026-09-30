import { expect, it } from "vitest";
import { plan, type Habit } from "./index";
import { baseInput, jst } from "./test-helpers";
import { MIN } from "./time";

const day = jst(2026, 10, 1);
const lunch: Habit = { id: "lunch", name: "昼食", meal: true, skippable: false, durationMinutes: 30, windowStart: 720, windowEnd: 870, frequency: { type: "daily" } };
const dinner: Habit = { ...lunch, id: "dinner", name: "夕食", windowStart: 18 * 60, windowEnd: 21 * 60 };
const breakfast: Habit = { ...lunch, id: "breakfast", name: "朝食", skippable: true, cue: { type: "routine" } };
function afterWake(hour: number) {
  const now = day + hour * 60 * MIN;
  return plan(baseInput(now, { habits: [breakfast, lunch, dinner], rhythmResets: [{ id: "woke", mode: "woke", start: now - 420 * MIN, end: now }] }));
}
it.each([10, 11, 12, 13])("%i時に起きても昼食は14時30分まで、夕食は21時までに終わる", (hour) => {
  const r = afterWake(hour);
  const b = r.blocks.find((b) => b.refId === lunch.id && b.start < day + 24 * 60 * MIN)!;
  expect(b).toBeDefined();
  expect(b.start).toBeGreaterThanOrEqual(day + 720 * MIN);
  expect(b.end).toBeLessThanOrEqual(day + 870 * MIN);
  expect(r.blocks.find((b) => b.refId === dinner.id && b.start < day + 24 * 60 * MIN)!.end).toBeLessThanOrEqual(day + 21 * 60 * MIN);
  if (hour >= 11) expect(r.blocks.some((b) => b.refId === breakfast.id && b.start < day + 24 * 60 * MIN)).toBe(false);
});
it("朝食が入る10時起床では、昼食との開始間隔を3時間確保する", () => {
  const r = afterWake(10);
  const b = r.blocks.find((b) => b.refId === breakfast.id)!;
  const l = r.blocks.find((b) => b.refId === lunch.id)!;
  expect(l.start - b.start).toBeGreaterThanOrEqual(180 * MIN);
});
it("昼食の時間帯を過ぎて起きても、昼食を15時以降へ自動で送らない", () => {
  expect(afterWake(15).blocks.some((b) => b.refId === lunch.id && b.start < day + 24 * 60 * MIN)).toBe(false);
});
it("疲労休止では任意の朝食・作業を省き、昼食と夕食の時刻は維持する", () => {
  const r = plan(baseInput(day + 10 * 60 * MIN, { habits: [breakfast, lunch, dinner], tasks: [{ id: "t", title: "作業", durationMinutes: 60, priority: 2 }], rhythmResets: [{ id: "rest", mode: "tired", start: day + 10 * 60 * MIN, end: day + 23 * 60 * MIN }] }));
  expect(r.blocks.filter((b) => b.start < day + 23 * 60 * MIN && (b.kind === "task" || b.refId === breakfast.id))).toHaveLength(0);
  expect(r.blocks.find((b) => b.refId === lunch.id)!.start).toBe(day + 720 * MIN);
  expect(r.blocks.find((b) => b.refId === dinner.id)!.start).toBe(day + 18 * 60 * MIN);
});
it("寝坊後の身支度も、午後の外出の直前に置く", () => {
  const now = day + 10 * 60 * MIN;
  const r = plan(baseInput(now, { events: [{ id: "out", title: "外出", start: day + 16 * 60 * MIN, end: day + 17 * 60 * MIN, atHome: false, travelMinutes: 30 }], rhythmResets: [{ id: "wake", mode: "woke", start: now - 420 * MIN, end: now }] }));
  expect(r.blocks.find((b) => b.refId === "prep")!.start).toBe(day + (15 * 60 + 30 - 40) * MIN);
});
it("翌日の推定起床は、前夜のずれがあっても出発準備の限界を越えない", () => {
  const now = day + 23 * 60 * MIN;
  const r = plan(baseInput(now, { events: [{ id: "out", title: "外出", start: day + (24 + 7) * 60 * MIN, end: day + (24 + 8) * 60 * MIN, atHome: false, travelMinutes: 30 }], rhythmResets: [{ id: "wake", mode: "woke", start: now - 420 * MIN, end: now }] }));
  expect(r.dayPlans.find((d) => d.dayStart === day + 24 * 60 * MIN)!.wake).toBe(day + (24 * 60 + 7 * 60 - 30 - 15 - 40) * MIN);
});

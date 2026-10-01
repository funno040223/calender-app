import { expect, it } from "vitest";
import type { CalendarEvent } from "@/lib/scheduler";
import { jst } from "@/lib/scheduler/test-helpers";
import { travelBands } from "./related";
import { replan, sampleData } from "./state";

const now = jst(2026, 10, 1, 8);
const out = (id: string, h1: number, m1: number, h2: number, m2: number, extra: Partial<CalendarEvent> = {}): CalendarEvent => ({
  id,
  title: id,
  start: jst(2026, 10, 1, h1, m1),
  end: jst(2026, 10, 1, h2, m2),
  atHome: false,
  travelMinutes: 10,
  ...extra,
});
const bands = (events: CalendarEvent[]) =>
  travelBands(replan({ ...sampleData(now), courses: [], tasks: [], events }, [], now)).map((b) => [b.start, b.end, b.ref.event.id]);

it("外出の前後に片道ずつ移動を出す。家にいる予定には出さない", () => {
  expect(bands([out("a", 13, 0, 15, 0), out("home", 18, 0, 19, 0, { atHome: true })])).toEqual([
    [jst(2026, 10, 1, 12, 50), jst(2026, 10, 1, 13), "a"],
    [jst(2026, 10, 1, 15), jst(2026, 10, 1, 15, 10), "a"],
  ]);
});

it("続く予定の最中には出さず、間の短い移動は1つにまとめる", () => {
  expect(bands([out("a", 13, 0, 15, 0), out("b", 15, 0, 16, 0)]).map(([s, e]) => [s, e])).toEqual([
    [jst(2026, 10, 1, 12, 50), jst(2026, 10, 1, 13)],
    [jst(2026, 10, 1, 16), jst(2026, 10, 1, 16, 10)],
  ]);
  expect(bands([out("a", 13, 0, 15, 0), out("b", 15, 15, 16, 0)]).map(([s, e]) => [s, e])).toContainEqual([jst(2026, 10, 1, 15), jst(2026, 10, 1, 15, 15)]);
});

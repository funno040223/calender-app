// @vitest-environment jsdom
import React from "react";
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { AppContext, type AppContextValue } from "@/components/app/StoreProvider";
import type { Habit } from "@/lib/scheduler";
import { replan, sampleData } from "@/lib/mock/state";
import { jst } from "@/lib/scheduler/test-helpers";
import { BlockRecord } from "./CalendarApp";

const now = jst(2026, 10, 1, 12);
const tidy: Habit = { id: "tidy", name: "片付け", skippable: true, track: true, durationMinutes: 30, windowStart: 10 * 60, windowEnd: 20 * 60, frequency: { type: "daily" } };
const block = { kind: "habit" as const, refId: tidy.id, title: tidy.name, start: now - 60 * 60_000, end: now - 30 * 60_000 };

function show(habit: Habit) {
  const state = replan({ ...sampleData(now), courses: [], tasks: [], events: [], habits: [habit], blocks: [block] }, [], now);
  const value = { state, update: vi.fn(), patch: vi.fn(), notify: vi.fn() } as unknown as AppContextValue;
  render(<AppContext value={value}><BlockRecord block={block} onSkipped={vi.fn()} /></AppContext>);
}
afterEach(cleanup);

it("記録する習慣の終わった枠には「やった」を出す", () => {
  show(tidy);
  expect(screen.getByRole("button", { name: "やった" })).toBeTruthy();
});
it("記録しない習慣には「やった」を出さない（押しても何も数えないため）", () => {
  show({ ...tidy, track: false });
  expect(screen.queryByRole("button", { name: "やった" })).toBeNull();
});

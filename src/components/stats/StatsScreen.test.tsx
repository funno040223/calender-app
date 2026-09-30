// @vitest-environment jsdom
import React, { useEffect, useState } from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { AppContext, type AppContextValue } from "@/components/app/StoreProvider";
import { replan, sampleData } from "@/lib/mock/state";
import type { MockData, TaskBlockLog } from "@/lib/mock/model";
import { jst } from "@/lib/scheduler/test-helpers";
import { MIN } from "@/lib/mock/jst";
import StatsScreen from "./StatsScreen";

const now = jst(2026, 10, 29, 12);
let last: MockData;
const notify = vi.fn();

/** 夜の集中の枠は12回中9回できず、昼は20回中2回だけできなかった */
function withBlocks(d: MockData): MockData {
  const log: Record<string, TaskBlockLog> = {};
  for (let i = 1; i <= 12; i++) {
    const start = jst(2026, 10, 29 - i, 21);
    log[`t:${start}`] = { title: "ES", start, end: start + 60 * MIN, reviewedAt: start, outcome: i <= 9 ? "none" : "planned" };
  }
  for (let i = 1; i <= 20; i++) {
    const start = jst(2026, 10, 29 - i, 10);
    log[`t:${start}`] = { title: "ES", start, end: start + 60 * MIN, reviewedAt: start, outcome: i <= 2 ? "none" : "planned" };
  }
  return { ...d, tasks: [], events: [], courses: [], doneTasks: [{ id: "t", title: "ES", tagId: "tag-focus", doneAt: now - 60 * MIN }], taskBlockLog: log };
}

function Harness({ children, init }: { children: React.ReactNode; init: (d: MockData) => MockData }) {
  const [state, setState] = useState(() => replan(init(sampleData(now)), [], now));
  useEffect(() => {
    last = state;
  }, [state]);
  const value = { state, update: (f: (d: MockData) => MockData) => setState((s) => replan(f(s), [], now)), patch: vi.fn(), notify, openTask: vi.fn() } as unknown as AppContextValue;
  return <AppContext value={value}>{children}</AppContext>;
}
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(now);
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

it("気づきを回数で出し、ボタンで「入れない」時間帯にすると消える", () => {
  render(<Harness init={withBlocks}><StatsScreen /></Harness>);
  expect(screen.getByText("夜（20時〜）の集中の枠は、12回中9回できなかった")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "夜は集中を入れない" }));
  expect(last.avoidWindows.at(-1)).toMatchObject({ start: 20 * 60, end: 28 * 60, tagIds: ["tag-focus"], hard: true });
  expect(notify).toHaveBeenCalledWith("「夜は集中を入れない」にしました");
  expect(screen.queryByText("気づき")).toBeNull();
});

it("はっきりした傾向がなければ、気づきのカードは出さない", () => {
  render(<Harness init={(d) => d}><StatsScreen /></Harness>);
  expect(screen.queryByText("気づき")).toBeNull();
  expect(screen.queryByText(/睡眠/)).toBeNull();
});

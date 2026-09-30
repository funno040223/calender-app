// @vitest-environment jsdom
import React, { useState } from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { AppContext, type AppContextValue } from "@/components/app/StoreProvider";
import { replan, sampleData } from "@/lib/mock/state";
import type { MockData } from "@/lib/mock/model";
import { jst } from "@/lib/scheduler/test-helpers";
import TodayScreen from "./TodayScreen";

// 9:00 起床の日の 8:00（朝のうち）
const now = jst(2026, 10, 6, 8);
const treat = { id: "only", name: "根津神社まで歩く", category: "adventure" as const };

function Harness({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState(() => replan({ ...sampleData(now), tasks: [], events: [], courses: [], treats: [treat] }, [], now));
  const value = {
    state,
    update: (f: (d: MockData) => MockData) => setState((s) => replan(f(s), [], now)),
    patch: (f: (d: MockData) => Partial<MockData>) => setState((s) => ({ ...s, ...f(s) })),
    notify: vi.fn(),
    openTask: vi.fn(),
    sync: "synced",
  } as unknown as AppContextValue;
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

it("朝は今日の楽しみを伏せておき、「起きた」を押すと開く", () => {
  render(<Harness><TodayScreen /></Harness>);
  expect(screen.getByText("起きると、今日の楽しみが開きます")).toBeTruthy();
  expect(screen.queryByText(treat.name)).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "起きた" }));
  expect(screen.getByText(treat.name)).toBeTruthy();
  expect(screen.queryByText("起きると、今日の楽しみが開きます")).toBeNull();
});

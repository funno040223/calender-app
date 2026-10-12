// @vitest-environment jsdom
import React, { useEffect, useState } from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { AppContext, type AppContextValue } from "@/components/app/StoreProvider";
import { replan, sampleData } from "@/lib/mock/state";
import { nightOf, upOnTime } from "@/lib/mock/night";
import type { MockData } from "@/lib/mock/model";
import { jst } from "@/lib/scheduler/test-helpers";
import TodayScreen from "./TodayScreen";

// 9:00 起床の日の 11:00（押し忘れ・寝坊）
const now = jst(2026, 10, 6, 11);
const seen: { state?: MockData } = {};

function Harness({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState(() => replan({ ...sampleData(now), tasks: [], events: [], courses: [] }, [], now));
  useEffect(() => {
    seen.state = state;
  });
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

it("遅れて開いたときは「いつ起きた？」を聞き、予定の時刻を選べば予定どおり起きたことになる", () => {
  render(<Harness><TodayScreen /></Harness>);
  expect(screen.queryByRole("button", { name: "起きた" })).toBeNull();
  expect(screen.getByText("いつ起きた？")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: /9:00\s*予定/ }));
  expect(screen.getByRole("button", { name: "起きた時刻 9:00 を直す" })).toBeTruthy();
  expect(upOnTime(nightOf(seen.state!, "2026-10-06"))).toBe(true);
});

it("記録した起床の時刻は、あとから直せる", () => {
  render(<Harness><TodayScreen /></Harness>);
  fireEvent.click(screen.getByRole("button", { name: /11:00\s*いま/ }));
  fireEvent.click(screen.getByRole("button", { name: "起きた時刻 11:00 を直す" }));
  fireEvent.change(screen.getByLabelText("起きた時刻"), { target: { value: "09:20" } });
  fireEvent.click(screen.getByRole("button", { name: "起きた時刻を記録" }));
  expect(screen.getByRole("button", { name: "起きた時刻 9:20 を直す" })).toBeTruthy();
  expect(seen.state!.wakeLogs.find((l) => l.date === "2026-10-06")?.wokeAt).toBe(jst(2026, 10, 6, 9, 20));
});

it("前の時刻で記録しても、朝のカードを出したままにして疲れを聞く", () => {
  render(<Harness><TodayScreen /></Harness>);
  fireEvent.click(screen.getByRole("button", { name: /9:00\s*予定/ }));
  expect(screen.getByText("今の疲れ")).toBeTruthy();
});

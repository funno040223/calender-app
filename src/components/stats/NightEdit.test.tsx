// @vitest-environment jsdom
import React, { useEffect, useState } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { AppContext, type AppContextValue } from "@/components/app/StoreProvider";
import { replan, sampleData, type MockState } from "@/lib/mock/state";
import type { MockData } from "@/lib/mock/model";
import { nightOf, pressBed, recordUp } from "@/lib/mock/night";
import { jst } from "@/lib/scheduler/test-helpers";
import StatsScreen from "./StatsScreen";

/** 記録の画面の「夜」：押した夜の寝た・起きた時刻を直す（日付はその夜に決まる。FR-S4） */
const now = jst(2026, 10, 16, 12);
let last: MockState;
function Harness({ data }: { data: MockData }) {
  const [state, setState] = useState(() => replan(data, [], now));
  useEffect(() => {
    last = state;
  }, [state]);
  const value = {
    state,
    update: (f: (d: MockData) => MockData) => setState((s) => replan(f(s), [], now)),
    patch: (f: (d: MockData) => Partial<MockData>) => setState((s) => ({ ...s, ...f(s) })),
    notify: vi.fn(),
    openTask: vi.fn(),
    sync: "synced",
  } as unknown as AppContextValue;
  return (
    <AppContext value={value}>
      <StatsScreen />
    </AppContext>
  );
}
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

it("前の夜（10/14）を押して、寝た時刻（前の日の夜）と起きた時刻を直す", () => {
  vi.useFakeTimers();
  vi.setSystemTime(now);
  const logs = recordUp(pressBed([], "2026-10-14", jst(2026, 10, 14, 1), jst(2026, 10, 14, 2)), "2026-10-14", jst(2026, 10, 14, 9), "button", jst(2026, 10, 14, 9), jst(2026, 10, 14, 9));
  render(<Harness data={{ ...sampleData(now), courses: [], tasks: [], events: [], sleepLogs: logs }} />);
  fireEvent.click(screen.getByRole("button", { name: "10/14(水)の夜の時刻を直す" }));
  fireEvent.change(screen.getByLabelText("寝た時刻"), { target: { value: "23:40" } });
  fireEvent.change(screen.getByLabelText("起きた時刻"), { target: { value: "08:15" } });
  fireEvent.click(screen.getByRole("button", { name: "記録" }));
  const n = nightOf(last, "2026-10-14");
  expect(n.bed?.at).toBe(jst(2026, 10, 13, 23, 40));
  expect(n.up?.at).toBe(jst(2026, 10, 14, 8, 15));
  // 予定の起床は記録したときのまま
  expect(n.plannedWake).toBe(jst(2026, 10, 14, 9));
  expect(screen.queryByLabelText("寝た時刻")).toBeNull();
});

// @vitest-environment jsdom
import React, { useState } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { AppContext, type AppContextValue } from "@/components/app/StoreProvider";
import type { MockData } from "@/lib/mock/model";
import { replan, sampleData } from "@/lib/mock/state";
import { jst } from "@/lib/scheduler/test-helpers";
import BedCard from "./BedCard";
import MorningCard from "./MorningCard";

const now = jst(2026, 10, 1, 3);
function Harness({ fixed = false, morning = false }: { fixed?: boolean; morning?: boolean }) {
  const time = morning ? jst(2026, 10, 1, 8) : now;
  const [state, setState] = useState(() => replan({ ...sampleData(time), tasks: [], courses: [], habits: [], blocks: [],
    settings: { ...sampleData(time).settings, routineMinutes: 10, prepMinutes: 40 },
    sleepLogs: morning ? [{ id: "2026-10-01", date: "2026-10-01", bed: { at: now, source: "button" as const }, plannedBed: now - 60 * 60_000 }] : [],
    events: fixed ? [{ id: "out", title: "外出", start: jst(2026, 10, 1, 11), end: jst(2026, 10, 1, 12), atHome: false, travelMinutes: 30 }] : [],
  }, [], time));
  const value = { state, update: (fn: (d: MockData) => MockData) => setState((s) => replan(fn(s), [], time)), patch: vi.fn() } as unknown as AppContextValue;
  return <AppContext value={value}>{morning ? <><MorningCard day={state.result.dayPlans[0]} now={time} /><output aria-label="睡眠の終わり">{state.result.rhythmResets?.[0]?.end}</output></> : <BedCard now={time} />}</AppContext>;
}
afterEach(() => { cleanup(); vi.useRealTimers(); });
it("寝るを押すと起床表示が9時から10時に変わり、取り消すと戻る", () => {
  vi.useFakeTimers(); vi.setSystemTime(now);
  render(<Harness />);
  expect(screen.getByText("9:00")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "寝る" }));
  expect(screen.getByText("10:00")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "取り消す" }));
  expect(screen.getByText("9:00")).toBeTruthy();
});
it("外出に間に合う起床と、短くなる睡眠時間を表示する", () => {
  vi.useFakeTimers(); vi.setSystemTime(now);
  render(<Harness fixed />);
  fireEvent.click(screen.getByRole("button", { name: "寝る" }));
  expect(screen.getByText("9:40")).toBeTruthy();
  expect(screen.getByRole("status").textContent).toContain("6時間40分");
});
it("予定より早く起きたら推定睡眠を終え、朝ルーティンを表示する", () => {
  vi.useFakeTimers(); vi.setSystemTime(jst(2026, 10, 1, 8));
  render(<Harness morning />);
  fireEvent.click(screen.getByRole("button", { name: "起きた" }));
  expect(screen.getByText(/8:00/)).toBeTruthy();
  expect(screen.getByLabelText("睡眠の終わり").textContent).toBe(String(jst(2026, 10, 1, 8)));
});

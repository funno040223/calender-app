// @vitest-environment jsdom
import React, { useEffect, useState } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { AppContext, type AppContextValue } from "@/components/app/StoreProvider";
import type { CalendarEvent } from "@/lib/scheduler";
import { replan, sampleData, type MockState } from "@/lib/mock/state";
import type { MockData } from "@/lib/mock/model";
import { nightOf, recordUp } from "@/lib/mock/night";
import { resetRhythm } from "@/lib/mock/recovery";
import { jst } from "@/lib/scheduler/test-helpers";
import { MIN } from "@/lib/mock/jst";
import TodayScreen from "./TodayScreen";

/** 段階3：立て直しのカードをなくし、「寝る」「起きた」「休む」をふだんの画面に置いた */
let last: MockState;
const task = { id: "t", title: "レポート", durationMinutes: 180, priority: 2 as const, deadline: jst(2026, 10, 14, 23) };
/** 10/13 の朝は 9:00 に「起きた」を押してある */
const base = (now: number, extra: Partial<MockData> = {}): MockData => ({
  ...sampleData(now),
  tasks: [task],
  courses: [],
  habits: [],
  events: [],
  blocks: [],
  sleepLogs: recordUp([], "2026-10-13", jst(2026, 10, 13, 9), "button", jst(2026, 10, 13, 9), jst(2026, 10, 13, 9)),
  ...extra,
});
function Harness({ data, google = [] }: { data: MockData; google?: CalendarEvent[] }) {
  const [state, setState] = useState(() => replan(data, google, Date.now()));
  useEffect(() => {
    last = state;
  }, [state]);
  const value = {
    state,
    update: (f: (d: MockData) => MockData) => setState((s) => replan(f(s), google, Date.now())),
    patch: (f: (d: MockData) => Partial<MockData>) => setState((s) => ({ ...s, ...f(s) })),
    notify: vi.fn(),
    openTask: vi.fn(),
    sync: "synced",
    imports: { state: "idle" },
    initialLoaded: true,
  } as unknown as AppContextValue;
  return (
    <AppContext value={value}>
      <TodayScreen />
    </AppContext>
  );
}
const start = (now: number, data: MockData, google?: CalendarEvent[]) => {
  vi.useFakeTimers();
  vi.setSystemTime(now);
  render(<Harness data={data} google={google} />);
};
const later = (minutes: number) => act(() => vi.advanceTimersByTime(minutes * MIN));
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

it("朝帰り（予定の就寝 2:00 を過ぎて 6:00）：「今から何する？」の「寝る」で、その夜の眠りとして睡眠時間を取れる起床にし、朝のカードで「起きた」を押せる", () => {
  const now = jst(2026, 10, 14, 6);
  start(now, base(now));
  // おやすみのカードは就寝の3時間後まで（FR-D3）
  expect(screen.queryByText("おやすみ")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "寝る" }));
  expect(nightOf(last, "2026-10-14").bed?.at).toBe(now);
  expect(last.result.dayPlans.find((d) => d.dayStart === jst(2026, 10, 14))!.wake).toBe(now + 7 * 60 * MIN);
  expect(screen.getByRole("button", { name: "起きた" })).toBeTruthy();
});

it("昼過ぎに「寝る」：その夜の眠りとして翌朝の起床まで眠るものとし、押した日の起床は動かさない", () => {
  const now = jst(2026, 10, 13, 15);
  start(now, base(now));
  fireEvent.click(screen.getByRole("button", { name: "寝る" }));
  expect(nightOf(last, "2026-10-14").bed?.at).toBe(now);
  expect(last.result.dayPlans.find((d) => d.dayStart === jst(2026, 10, 13))!.wake).toBe(jst(2026, 10, 13, 9));
  expect(last.result.rhythmResets).toContainEqual(expect.objectContaining({ mode: "sleep", start: now, end: jst(2026, 10, 14, 9) }));
});

it("「休む」：選んだ時刻までタスクを入れず、今日の流れで途中で終えられる", () => {
  const now = jst(2026, 10, 13, 14);
  start(now, base(now));
  // 休む前は、今から17時までにタスクが入っている
  expect(last.result.blocks.some((b) => b.kind === "task" && b.start < jst(2026, 10, 13, 17) && b.end > now)).toBe(true);
  fireEvent.click(screen.getByRole("button", { name: "休む" }));
  fireEvent.change(screen.getByLabelText("休む（終わり）"), { target: { value: "17:00" } });
  fireEvent.click(screen.getAllByRole("button", { name: "休む" }).at(-1)!);
  const end = jst(2026, 10, 13, 17);
  expect(last.rhythmResets).toContainEqual(expect.objectContaining({ mode: "tired", end }));
  expect(last.result.blocks.some((b) => b.kind === "task" && b.start < end && b.end > now)).toBe(false);
  later(10);
  fireEvent.click(screen.getByRole("button", { name: "休むのを終える" }));
  expect(last.rhythmResets?.find((r) => r.mode === "tired")?.end).toBe(now + 10 * MIN);
  expect(last.result.blocks.some((b) => b.kind === "task" && b.start < end)).toBe(true);
});

it("寝た時刻は、おやすみのカードで時刻を押して直せる", () => {
  const now = jst(2026, 10, 14, 1, 55);
  start(now, base(now));
  fireEvent.click(screen.getByRole("button", { name: "寝る" }));
  fireEvent.click(screen.getByRole("button", { name: "寝た時刻 1:55 を直す" }));
  fireEvent.change(screen.getByLabelText("寝た時刻"), { target: { value: "01:20" } });
  fireEvent.click(screen.getByRole("button", { name: "寝た時刻を記録" }));
  expect(nightOf(last, "2026-10-14").bed?.at).toBe(jst(2026, 10, 14, 1, 20));
  expect(screen.getByRole("button", { name: "寝た時刻 1:20 を直す" })).toBeTruthy();
});

it("睡眠と重なって間に合わない予定は、お知らせに出す", () => {
  const now = jst(2026, 10, 13, 12);
  const data = resetRhythm(base(now), { id: "s", mode: "sleep", start: now, end: jst(2026, 10, 13, 19) }, now);
  const meeting: CalendarEvent = { id: "m", title: "打ち合わせ", start: jst(2026, 10, 13, 15), end: jst(2026, 10, 13, 16), atHome: true };
  start(now, data, [meeting]);
  expect(screen.getByRole("alert").textContent).toContain("打ち合わせ");
});

it("夜に「今から何する？」の「寝る」：その夜の「寝る」として起床を見積もる", () => {
  const now = jst(2026, 10, 13, 23, 20);
  start(now, base(now));
  fireEvent.click(screen.getByRole("button", { name: "寝る" }));
  expect(nightOf(last, "2026-10-14").bed?.at).toBe(now);
  expect(nightOf(last, "2026-10-14").plannedBed).toBe(jst(2026, 10, 14, 2));
  expect(last.result.dayPlans.find((d) => d.dayStart === jst(2026, 10, 14))!.wake).toBe(jst(2026, 10, 14, 9));
});

it("休んでいる間に「寝る」：過ぎた分の休む時間は残し、寝た時刻で終える", () => {
  const now = jst(2026, 10, 13, 14);
  start(now, base(now));
  fireEvent.click(screen.getByRole("button", { name: "休む" }));
  fireEvent.change(screen.getByLabelText("休む（終わり）"), { target: { value: "17:00" } });
  fireEvent.click(screen.getAllByRole("button", { name: "休む" }).at(-1)!);
  later(60);
  fireEvent.click(screen.getByRole("button", { name: "寝る" }));
  expect(last.rhythmResets?.filter((r) => r.mode === "tired").map((r) => [r.start, r.end])).toEqual([[now, now + 60 * MIN]]);
});

it("朝帰りで 6:00 に「寝る」を押したあとは、見積もった起床（13:00）より前でも、朝のカードで「起きた」を押せる", () => {
  const now = jst(2026, 10, 14, 6);
  start(now, base(now));
  fireEvent.click(screen.getByRole("button", { name: "寝る" }));
  later(4 * 60 + 30);
  fireEvent.click(screen.getByRole("button", { name: "起きた" }));
  expect(nightOf(last, "2026-10-14").up?.at).toBe(jst(2026, 10, 14, 10, 30));
  expect(nightOf(last, "2026-10-14").bed?.at).toBe(now);
});

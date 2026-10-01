// @vitest-environment jsdom
import React, { useEffect, useState } from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { AppContext, type AppContextValue } from "@/components/app/StoreProvider";
import { replan, sampleData } from "@/lib/mock/state";
import type { MockData } from "@/lib/mock/model";
import { jst } from "@/lib/scheduler/test-helpers";
import { MIN } from "@/lib/mock/jst";
import ProgressCard from "./ProgressCard";
import RecoveryCard from "./RecoveryCard";
import WorkNowCard from "./WorkNowCard";
import TodayScreen from "./TodayScreen";

const now = jst(2026, 10, 1, 12);
const task = { id: "t", title: "レポート", durationMinutes: 180, priority: 2 as const };
const block = { kind: "task" as const, refId: task.id, title: task.title, start: now - 60 * MIN, end: now };
let last: MockData;
const openTask = vi.fn();
const notify = vi.fn();
function Harness({ children, init }: { children: React.ReactNode; init?: (d: MockData) => MockData }) {
  const [state, setState] = useState(() => {
    const base = { ...sampleData(now), tasks: [task], courses: [], habits: [], events: [], blocks: [block] };
    return replan(init ? init(base) : base, [], now);
  });
  useEffect(() => { last = state; }, [state]);
  const value = { state, update: (f: (d: MockData) => MockData) => setState((s) => replan(f(s), [], now)), patch: vi.fn(), sync: "synced", imports: { state: "idle" }, openTask, notify, initialLoaded: true } as unknown as AppContextValue;
  return <AppContext value={value}>{children}</AppContext>;
}
beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(now); openTask.mockClear(); });
afterEach(() => { cleanup(); vi.useRealTimers(); window.history.replaceState(null, "", "/"); });

it("予定との差を分単位で確認し、その残り時間を確定できる", () => {
  render(<Harness><ProgressCard now={now} /></Harness>);
  fireEvent.click(screen.getByRole("button", { name: "残りを直す" }));
  fireEvent.click(screen.getByRole("button", { name: "レポートの残りを30分増やす" }));
  expect(screen.getByRole("status").textContent).toContain("30分多く残る");
  fireEvent.change(screen.getByLabelText("残り（分）"), { target: { value: "95" } });
  fireEvent.click(screen.getByRole("button", { name: "この残り時間で確定" }));
  expect(last.tasks[0].remainingMinutes).toBe(95);
  expect(screen.queryByText("作業の進み具合")).toBeNull();
});
it("できなかったを1回押すだけで確認を終え、進捗を増やさない", () => {
  render(<Harness><ProgressCard now={now} /></Harness>);
  fireEvent.click(screen.getByRole("button", { name: "できなかった" }));
  expect(last.tasks[0].remainingMinutes).toBe(180);
  expect(screen.queryByText("作業の進み具合")).toBeNull();
});
it("徹夜後の睡眠を入力し、表示と保存する予定へ反映できる", () => {
  render(<Harness><RecoveryCard now={now} /></Harness>);
  fireEvent.click(screen.getByRole("button", { name: "今から寝る" }));
  fireEvent.change(screen.getByLabelText("立て直しの終了時刻"), { target: { value: "2026-10-01T19:00" } });
  fireEvent.click(screen.getByRole("button", { name: "組み直す" }));
  expect(last.rhythmResets?.[0].end).toBe(jst(2026, 10, 1, 19));
  expect(notify).toHaveBeenCalledWith("組み直しました");
});
it("候補を見るだけでは予定を変更しない", () => {
  render(<Harness><WorkNowCard now={now} /></Harness>);
  const before = last;
  fireEvent.click(screen.getByRole("button", { name: "30分" }));
  expect(screen.getByRole("button", { name: "30分" }).getAttribute("aria-pressed")).toBe("true");
  expect(last).toBe(before);
});
it("旧版の達成リンクを開いても実績や報酬にせずタスクを開く", () => {
  window.history.replaceState(null, "", `/?done=${encodeURIComponent(`t:${block.start}`)}`);
  render(<Harness><TodayScreen /></Harness>);
  expect(openTask).toHaveBeenCalledWith("t");
  expect(last.taskBlockLog[`t:${block.start}`].doneAt).toBeUndefined();
  expect(last.tasks[0].remainingMinutes).toBeUndefined();
});
it("終わった記録する習慣は今日の流れに残り、「やった」を押すと記録して消える", () => {
  const walk = sampleData(now).habits.find((h) => h.id === "habit-walk")!;
  const done = { kind: "habit" as const, refId: walk.id, title: walk.name, start: now - 90 * MIN, end: now - 70 * MIN };
  render(<Harness init={(d) => ({ ...d, habits: [walk], blocks: [block, done] })}><TodayScreen /></Harness>);
  fireEvent.click(screen.getByRole("button", { name: `${walk.name}：やった` }));
  expect(last.habitLogs["2026-10-01"]?.[walk.id]).toBe("done");
  expect(screen.queryByRole("button", { name: `${walk.name}：やった` })).toBeNull();
  expect(notify).toHaveBeenCalledWith("記録しました");
});
it("終わった記録する習慣は「できなかった」でも消え、あとの時間に入れ直す", () => {
  const walk = sampleData(now).habits.find((h) => h.id === "habit-walk")!;
  const missed = { kind: "habit" as const, refId: walk.id, title: walk.name, start: now - 90 * MIN, end: now - 70 * MIN };
  render(<Harness init={(d) => ({ ...d, habits: [walk], blocks: [block, missed] })}><TodayScreen /></Harness>);
  fireEvent.click(screen.getByRole("button", { name: `${walk.name}：できなかった` }));
  expect(last.habitMisses["2026-10-01"]).toEqual([`${walk.id}:${missed.start}`]);
  expect(last.habitLogs["2026-10-01"]?.[walk.id]).toBeUndefined();
  expect(screen.queryByRole("button", { name: `${walk.name}：やった` })).toBeNull();
  expect(notify).toHaveBeenCalledWith("記録しました", { habitId: walk.id });
});
it("食事と入浴は「少しだけ」を出さず、「やった」だけで記録する", () => {
  const lunch = sampleData(now).habits.find((h) => h.id === "habit-lunch")!;
  const ate = { kind: "habit" as const, refId: lunch.id, title: lunch.name, start: now - 60 * MIN, end: now - 30 * MIN };
  render(<Harness init={(d) => ({ ...d, habits: [lunch], blocks: [block, ate] })}><TodayScreen /></Harness>);
  expect(screen.queryByRole("button", { name: `${lunch.name}：少しだけ` })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: `${lunch.name}：やった` }));
  expect(last.habitLogs["2026-10-01"]?.[lunch.id]).toBe("done");
});

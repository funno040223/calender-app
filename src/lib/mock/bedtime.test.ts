import { describe, expect, it } from "vitest";
import { jst } from "@/lib/scheduler/test-helpers";
import type { CalendarEvent } from "@/lib/scheduler";
import { replan, sampleData, toData } from "./state";
import { DAY_MS, MIN } from "./jst";

const at = jst(2026, 10, 1, 3);
function data(events: CalendarEvent[] = []) {
  return { ...sampleData(at), courses: [], tasks: [], habits: [], blocks: [], events,
    settings: { ...sampleData(at).settings, routineMinutes: 10, prepMinutes: 40, sleepMinutes: 420 },
    bedLogs: { "2026-09-30": { at, plannedBed: jst(2026, 10, 1, 2) } } };
}
function wake(events: CalendarEvent[] = []) {
  return replan(data(events), [], at).result.dayPlans.find((d) => d.dayStart === jst(2026, 10, 1))!.wake;
}
describe("寝るの記録から起床を組み直す", () => {
  it("1時間遅く寝たら睡眠7時間を確保して10時に起きる", () => {
    expect(wake()).toBe(jst(2026, 10, 1, 10));
    const state = replan(data(), [], at);
    expect(state.blocks).toContainEqual(expect.objectContaining({ refId: "sleep:bed:2026-09-30", start: at, end: at + 420 * MIN }));
    expect(replan(toData(state), [], at + 60 * MIN).result.dayPlans[0].wake).toBe(at + 420 * MIN);
    expect(replan({ ...data(), bedLogs: {} }, [], at).result.dayPlans[0].wake).toBe(jst(2026, 10, 1, 9));
  });
  it("移動と朝の準備を含め、外出に間に合う9時40分で止める", () => {
    expect(wake([{ id: "out", title: "外出", start: jst(2026, 10, 1, 11), end: jst(2026, 10, 1, 12), atHome: false, travelMinutes: 30 }])).toBe(jst(2026, 10, 1, 9, 40));
  });
  it("早い予定があれば起床を遅らせない。在宅の顔出し会議も準備を確保する", () => {
    expect(wake([{ id: "out", title: "外出", start: jst(2026, 10, 1, 9, 30), end: jst(2026, 10, 1, 10), atHome: false, travelMinutes: 30 }])).toBe(jst(2026, 10, 1, 8, 10));
    expect(wake([{ id: "online", title: "会議", start: jst(2026, 10, 1, 10), end: jst(2026, 10, 1, 11), atHome: true, needsPrep: true }])).toBe(jst(2026, 10, 1, 9, 10));
  });
  it("後から登録した予定と、取り込み予定も起床に反映する", () => {
    const event = { id: "g", title: "会議", start: jst(2026, 10, 1, 9), end: jst(2026, 10, 1, 10), atHome: true };
    const state = replan(data(), [event], at);
    expect(state.result.dayPlans[0].wake).toBe(jst(2026, 10, 1, 8, 40));
  });
  it("明示的に入力した睡眠・実際の起床を寝るの推定で上書きしない", () => {
    const actual = { id: "actual", mode: "woke" as const, start: at, end: jst(2026, 10, 1, 12) };
    expect(replan({ ...data(), rhythmResets: [actual] }, [], actual.end).result.dayPlans[0].wake).toBe(actual.end);
    const wokeAt = jst(2026, 10, 1, 8);
    expect(replan({ ...data(), wakeLogs: [{ date: "2026-10-01", doneStepIds: [], wokeAt }] }, [], wokeAt).result.dayPlans[0].wake).toBe(wokeAt);
  });
  it("前日23時の就寝を翌朝へ結びつけ、予定より早い就寝は起床を早めない", () => {
    const early = jst(2026, 9, 30, 23);
    const state = replan({ ...data(), bedLogs: { "2026-09-30": { at: early, plannedBed: at - 60 * MIN } } }, [], early);
    expect(state.result.dayPlans.find((d) => d.dayStart === jst(2026, 10, 1))!.wake).toBe(jst(2026, 10, 1, 9));
  });
  it("2日前より古い就寝が将来の起床をずらさない", () => {
    expect(replan(data(), [], at + 3 * DAY_MS).result.dayPlans[0].wake).toBe(jst(2026, 10, 4, 9));
  });
  it("就寝前の作業だけ確認に残し、睡眠中の自動作業を未実行にする", () => {
    const task = { id: "t", title: "作業", durationMinutes: 180, priority: 2 as const };
    const before = { kind: "task" as const, refId: "t", title: "作業", start: at - 30 * MIN, end: at + 30 * MIN };
    const missed = { ...before, start: at + 60 * MIN, end: at + 120 * MIN };
    const state = replan({ ...data(), tasks: [task], blocks: [before, missed] }, [], at + 150 * MIN);
    expect(state.taskBlockLog[`t:${before.start}`].end).toBe(at);
    expect(state.taskBlockLog[`t:${missed.start}`].outcome).toBe("none");
    expect(state.tasks[0].remainingMinutes).toBeUndefined();
    expect(state.blocks.some((b) => b.kind === "task" && b.start < at + 420 * MIN)).toBe(false);
  });
});

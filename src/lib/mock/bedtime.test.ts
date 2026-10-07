import { describe, expect, it } from "vitest";
import { jst } from "@/lib/scheduler/test-helpers";
import type { CalendarEvent } from "@/lib/scheduler";
import { replan, sampleData, toData } from "./state";
import type { MockData } from "./model";
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

describe("「起きた」だけを押した朝", () => {
  const morning = (wokeAt: number) => ({ ...data(), bedLogs: {}, wakeLogs: [{ date: "2026-10-01", doneStepIds: [], wokeAt }] });
  it("寝坊したら、起きた時刻から朝ルーティンを置き直す", () => {
    const wokeAt = jst(2026, 10, 1, 11);
    const state = replan(morning(wokeAt), [], wokeAt);
    expect(state.result.dayPlans[0].wake).toBe(wokeAt);
    expect(state.blocks).toContainEqual(expect.objectContaining({ refId: "sleep:woke:2026-10-01", end: wokeAt }));
  });
  it("早く起きた朝も、起きた時刻から始める", () => {
    const wokeAt = jst(2026, 10, 1, 8);
    expect(replan(morning(wokeAt), [], wokeAt).result.dayPlans[0].wake).toBe(wokeAt);
  });
  it("自分で入れた立て直しがあれば、そちらを使う", () => {
    const wokeAt = jst(2026, 10, 1, 11);
    const entered = { id: "r", mode: "woke" as const, start: jst(2026, 10, 1, 4), end: jst(2026, 10, 1, 10, 30) };
    expect(replan({ ...morning(wokeAt), rhythmResets: [entered] }, [], wokeAt).result.dayPlans[0].wake).toBe(entered.end);
  });
});

describe("「今から寝る」で入れた起きる予定と「起きた」", () => {
  const planned = { id: "r", mode: "sleep" as const, start: jst(2026, 10, 1, 4, 32), end: jst(2026, 10, 1, 11, 32) };
  const withTap = (wokeAt: number) => ({ ...data(), bedLogs: {}, rhythmResets: [planned], wakeLogs: [{ date: "2026-10-01", doneStepIds: [], wokeAt }] });
  it("予定より遅く起きたら、押した時刻から組み直す", () => {
    const wokeAt = jst(2026, 10, 1, 12, 21);
    expect(replan(withTap(wokeAt), [], wokeAt).result.dayPlans[0].wake).toBe(wokeAt);
  });
  it("予定より早く起きても、押した時刻から始める", () => {
    const wokeAt = jst(2026, 10, 1, 10);
    expect(replan(withTap(wokeAt), [], wokeAt).result.dayPlans[0].wake).toBe(wokeAt);
  });
  it("昼寝の予定に、ずっとあとの「起きた」を結びつけない", () => {
    const nap = { id: "nap", mode: "sleep" as const, start: jst(2026, 9, 30, 15), end: jst(2026, 9, 30, 16) };
    const wokeAt = jst(2026, 10, 1, 9, 30);
    const state = replan({ ...withTap(wokeAt), rhythmResets: [nap] }, [], wokeAt);
    expect(state.result.rhythmResets?.find((r) => r.id === "nap")?.end).toBe(nap.end);
  });
});

describe("ヘルスケアの睡眠から組み直す", () => {
  const night = (start: number, end: number) => ({ "2026-10-01": { start, end, minutes: Math.round((end - start) / MIN) } });
  const base = (healthSleep: MockData["healthSleep"], extra: Partial<MockData> = {}) => ({ ...data(), bedLogs: {}, healthSleep, ...extra });
  it("「起きた」を押していなくても、寝坊したら起きた時刻から組み直す", () => {
    const end = jst(2026, 10, 1, 11, 20);
    const state = replan(base(night(jst(2026, 10, 1, 3), end)), [], end + 10 * MIN);
    expect(state.result.dayPlans[0].wake).toBe(end);
    expect(state.result.rhythmResets).toContainEqual(expect.objectContaining({ id: "health:2026-10-01", start: jst(2026, 10, 1, 3), plannedEnd: jst(2026, 10, 1, 9) }));
  });
  it("遅れて届いた睡眠と重なる作業の枠は、自動で「できなかった」にせず、確認に残す", () => {
    const end = jst(2026, 10, 1, 11, 20);
    const block = { title: "レポート", start: jst(2026, 10, 1, 9), end: jst(2026, 10, 1, 10) };
    const state = replan(base(night(jst(2026, 10, 1, 3), end), { taskBlockLog: { "t:1": block } }), [], end + 10 * MIN);
    expect(state.taskBlockLog["t:1"].outcome).toBeUndefined();
    expect(state.taskBlockLog["t:1"].reviewedAt).toBeUndefined();
    // 「起きた」を押した朝は、これまでどおり自動で「できなかった」
    const pressed = replan(base(night(jst(2026, 10, 1, 3), end), { taskBlockLog: { "t:1": block }, wakeLogs: [{ date: "2026-10-01", doneStepIds: [], wokeAt: end }] }), [], end + 10 * MIN);
    expect(pressed.taskBlockLog["t:1"].outcome).toBe("none");
  });
  it("予定より早く起きた記録では、予定を前へは動かさない", () => {
    const end = jst(2026, 10, 1, 7);
    expect(replan(base(night(jst(2026, 10, 1, 1), end)), [], end + 60 * MIN).result.dayPlans[0].wake).toBe(jst(2026, 10, 1, 9));
  });
  it("「起きた」を押したら、押した時刻を使い、寝ついた時刻はヘルスケアから取る", () => {
    const wokeAt = jst(2026, 10, 1, 11, 40);
    const state = replan(base(night(jst(2026, 10, 1, 3, 10), jst(2026, 10, 1, 11, 20)), { wakeLogs: [{ date: "2026-10-01", doneStepIds: [], wokeAt }] }), [], wokeAt);
    expect(state.result.dayPlans[0].wake).toBe(wokeAt);
    expect(state.result.rhythmResets).toContainEqual(expect.objectContaining({ start: jst(2026, 10, 1, 3, 10), end: wokeAt }));
  });
  it("「寝る」を押した夜は、見積もりの起床を予定の起床として残す", () => {
    const end = jst(2026, 10, 1, 10, 30);
    const state = replan({ ...data(), healthSleep: night(jst(2026, 10, 1, 3, 20), end) }, [], end + 10 * MIN);
    expect(state.result.dayPlans[0].wake).toBe(end);
    expect(state.result.rhythmResets).toContainEqual(expect.objectContaining({ plannedEnd: jst(2026, 10, 1, 10) }));
  });
});

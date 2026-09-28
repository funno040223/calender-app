import { describe, expect, it } from "vitest";
import { plan } from "./planner";
import type { AvoidWindow, Habit, Tag, Task } from "./types";
import { baseInput, jst } from "./test-helpers";

const focus: Tag = { id: "focus", name: "集中", mode: "focus", defaultMinutes: 90, minChunkMinutes: 60, maxChunkMinutes: 120 };
const report: Task = { id: "t1", title: "レポート", durationMinutes: 120, priority: 2, tagId: "focus" };
const now = jst(2026, 10, 1, 6);
const taskBlocks = (r: ReturnType<typeof plan>) => r.blocks.filter((b) => b.kind === "task");

describe("タスクの配置（減点方式）", () => {
  it("集中系は起きてすぐを避ける", () => {
    // 9:00 起床、9:55 に朝ルーティンと準備が終わる → 10:55 までは減点
    const [b] = taskBlocks(plan(baseInput(now, { tags: [focus], tasks: [report] })));
    expect(b.start).toBe(jst(2026, 10, 1, 11));
    expect(b.end).toBe(jst(2026, 10, 1, 13));
  });

  it("「なるべく避ける」時間帯を外して置く", () => {
    const morning: AvoidWindow = { id: "a1", label: "午前はだるい", start: 9 * 60, end: 12 * 60, hard: false };
    const [b] = taskBlocks(plan(baseInput(now, { tags: [focus], tasks: [report], avoidWindows: [morning] })));
    expect(b.start).toBe(jst(2026, 10, 1, 12));
  });

  it("「入れない」時間帯には置かない。締切がなければ警告も出さない", () => {
    const allDay: AvoidWindow = { id: "a2", label: "終日不可", start: 0, end: 24 * 60, tagIds: ["focus"], hard: true };
    const r = plan(baseInput(now, { tags: [focus], tasks: [report], avoidWindows: [allDay] }));
    expect(taskBlocks(r)).toHaveLength(0);
    expect(r.shortfalls).toHaveLength(0);
  });

  it("締切までに入りきらなければ、足りない時間を警告する", () => {
    const big: Task = { id: "t2", title: "大量の作業", durationMinutes: 600, priority: 2, deadline: jst(2026, 10, 1, 12) };
    const r = plan(baseInput(now, { tasks: [big] }));
    expect(r.shortfalls).toHaveLength(1);
    expect(r.shortfalls[0].shortfallMinutes).toBeGreaterThan(0);
  });

  it("締切を守るために、飛ばしてよい習慣を外す", () => {
    const exercise: Habit = {
      id: "h1",
      name: "運動",
      durationMinutes: 60,
      windowStart: 18 * 60,
      windowEnd: 19 * 60,
      frequency: { type: "daily" },
      skippable: true,
    };
    const events = [
      { id: "e1", title: "在宅作業", start: jst(2026, 10, 1, 8), end: jst(2026, 10, 1, 18) },
      { id: "e2", title: "予定", start: jst(2026, 10, 1, 19), end: jst(2026, 10, 1, 23) },
    ];
    const task: Task = { id: "t3", title: "提出物", durationMinutes: 60, priority: 2, deadline: jst(2026, 10, 1, 20) };
    const r = plan(baseInput(now, { events, habits: [exercise], tasks: [task] }));

    expect(r.shortfalls).toHaveLength(0);
    expect(taskBlocks(r)[0].start).toBe(jst(2026, 10, 1, 18));
    expect(r.skippedHabits).toContainEqual({ habitId: "h1", dayStart: jst(2026, 10, 1), reason: "deadline" });
  });

  it("固定した枠は動かさず、その分だけ残り時間を減らす", () => {
    const pinned = {
      kind: "task" as const,
      refId: "t1",
      title: "レポート",
      start: jst(2026, 10, 2, 15),
      end: jst(2026, 10, 2, 17),
      pinned: true,
    };
    const r = plan(baseInput(now, { tags: [focus], tasks: [report], previousBlocks: [pinned] }));
    expect(taskBlocks(r)).toEqual([pinned]);
  });

  it("外出する予定から帰ったあとは、移動時間と休憩を空ける", () => {
    const univ = { id: "univ", name: "大学", keywords: [], travelMinutes: 45 };
    const intern = { id: "e1", title: "インターン", start: jst(2026, 10, 1, 10), end: jst(2026, 10, 1, 12), location: "大学" };
    const task: Task = { id: "t4", title: "メール返信", durationMinutes: 30, priority: 2, deadline: jst(2026, 10, 1, 14) };
    // 12:00 終了 → 移動45分 → 休憩30分 → 13:15 から
    const [b] = taskBlocks(plan(baseInput(jst(2026, 10, 1, 12), { events: [intern], places: [univ], tasks: [task] })));
    expect(b.start).toBe(jst(2026, 10, 1, 13, 15));
  });

  it("タスクのあとは、タグごとの休憩を空ける", () => {
    const admin: Tag = { id: "admin", name: "事務", mode: "gap", defaultMinutes: 30, minChunkMinutes: 15, maxChunkMinutes: 60, restAfterMinutes: 30 };
    const a: Task = { id: "a", title: "A", durationMinutes: 60, priority: 3, tagId: "admin", deadline: jst(2026, 10, 2) };
    const b: Task = { id: "b", title: "B", durationMinutes: 60, priority: 2, tagId: "admin", deadline: jst(2026, 10, 2) };
    const [ba, bb] = taskBlocks(plan(baseInput(now, { tags: [admin], tasks: [a, b] })));
    expect(bb.start - ba.end).toBeGreaterThanOrEqual(30 * 60_000);
  });

  it("予定に関連するタスクを「直前に寄せる」と、予定の直前に置く", () => {
    const interview = { id: "e9", title: "面接", start: jst(2026, 10, 4, 15), end: jst(2026, 10, 4, 16), location: "Zoom" };
    const prep: Task = { id: "t5", title: "面接対策", durationMinutes: 60, priority: 2, relatedEventId: "e9", timing: "justBefore" };
    const [b] = taskBlocks(plan(baseInput(now, { events: [interview], tasks: [prep] })));
    expect(b.start).toBe(jst(2026, 10, 4, 14));
    expect(b.end).toBe(interview.start);
  });

  it("外出する予定に関連するタスクの締切は、家を出る時刻", () => {
    const univ = { id: "univ", name: "大学", keywords: [], travelMinutes: 45 };
    const exam = { id: "e8", title: "試験", start: jst(2026, 10, 1, 13), end: jst(2026, 10, 1, 15), location: "大学" };
    const study: Task = { id: "t6", title: "試験勉強", durationMinutes: 600, priority: 3, relatedEventId: "e8" };
    const r = plan(baseInput(now, { events: [exam], places: [univ], tasks: [study] }));
    expect(r.shortfalls[0].deadline).toBe(jst(2026, 10, 1, 12, 15));
  });

  it("前回と同じ位置に置けるなら動かさない", () => {
    const before = { kind: "task" as const, refId: "t1", title: "レポート", start: jst(2026, 10, 1, 14), end: jst(2026, 10, 1, 16) };
    const [b] = taskBlocks(plan(baseInput(now, { tags: [focus], tasks: [report], previousBlocks: [before] })));
    expect(b.start).toBe(before.start);
  });
});

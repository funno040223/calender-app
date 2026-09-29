import { describe, expect, it } from "vitest";
import { plan } from "./planner";
import type { AvoidWindow, Task } from "./types";
import { baseInput, jst } from "./test-helpers";

const now = jst(2026, 10, 1, 9);
const settings = { ...baseInput(now).settings, minSlackMinutesPerDay: 0, dailyTaskCapMinutes: 24 * 60, dailyEnergyBudget: 100 };

describe("締切に足りないときの選択肢", () => {
  it("「ほかを後に回す」を選んだタスクは、締切の早いタスクより先に置く", () => {
    // 今日の空きを、朝の2時間ほどだけにする
    const events = [{ id: "e", title: "予定", start: jst(2026, 10, 1, 11, 30), end: jst(2026, 10, 2, 2) }];
    const early: Task = { id: "a", title: "早い締切", durationMinutes: 120, priority: 1, deadline: jst(2026, 10, 1, 20) };
    const important: Task = { id: "b", title: "大事", durationMinutes: 120, priority: 3, deadline: jst(2026, 10, 1, 22) };
    const r0 = plan(baseInput(now, { settings, events, tasks: [early, important] }));
    expect(r0.shortfalls.map((s) => s.taskId)).toEqual(["b"]);
    const r1 = plan(baseInput(now, { settings, events, tasks: [early, { ...important, first: true }] }));
    expect(r1.shortfalls.map((s) => s.taskId)).toEqual(["a"]);
  });

  it("「時間帯の外にも入れる」を選んだタスクは、「入れない」時間帯にも置く", () => {
    const allDay: AvoidWindow = { id: "w", label: "終日", start: 0, end: 24 * 60, hard: true };
    const task: Task = { id: "t", title: "課題", durationMinutes: 60, priority: 2, deadline: jst(2026, 10, 1, 22) };
    expect(plan(baseInput(now, { settings, avoidWindows: [allDay], tasks: [task] })).shortfalls).toHaveLength(1);
    expect(plan(baseInput(now, { settings, avoidWindows: [allDay], tasks: [{ ...task, stretch: true }] })).shortfalls).toHaveLength(0);
  });
});

describe("今日は飛ばす", () => {
  it("飛ばした日には置かず、ほかの日には置く", () => {
    const walk = { id: "walk", name: "散歩", durationMinutes: 20, windowStart: 0, windowEnd: 150, anchor: "wake" as const, frequency: { type: "daily" as const }, skippable: true };
    const r = plan(baseInput(now, { settings, habits: [walk], skipHabitDays: { walk: [jst(2026, 10, 2)] } }));
    const on = (d: number) => r.blocks.filter((b) => b.refId === "walk" && b.start >= jst(2026, 10, d) && b.start < jst(2026, 10, d + 1));
    expect(on(2)).toHaveLength(0);
    expect(on(3)).toHaveLength(1);
  });
});

describe("雨の日を避ける習慣", () => {
  it("洗濯は、間隔の中に雨でない日があれば雨の日を避ける", () => {
    const laundry = { id: "l", name: "洗濯", durationMinutes: 10, windowStart: 9 * 60, windowEnd: 16 * 60, frequency: { type: "interval" as const, minDays: 1, maxDays: 3 }, skippable: false, avoidRain: true };
    const firstDay = (rainy: number[]) =>
      plan(baseInput(now, { settings, habits: [laundry], rainyDays: rainy, habitLastDone: { l: jst(2026, 9, 30, 10) } })).blocks
        .filter((b) => b.refId === "l")
        .map((b) => new Date(b.start + 9 * 3600_000).getUTCDate())[0];
    const dry = firstDay([]);
    expect(firstDay([jst(2026, 10, dry)])).not.toBe(dry);
  });
});

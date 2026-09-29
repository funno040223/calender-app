import { describe, expect, it } from "vitest";
import { jst } from "@/lib/scheduler/test-helpers";
import { replan, sampleData, travelAsks } from "./state";

describe("終わったタスクの枠", () => {
  it("枠の長さを残り時間から一度だけ引く", () => {
    const now = jst(2026, 10, 1, 12);
    const base = sampleData(now);
    const task = { id: "t-report", title: "レポート", durationMinutes: 180, priority: 2 as const };
    const block = { kind: "task" as const, refId: task.id, title: task.title, start: jst(2026, 10, 1, 9), end: jst(2026, 10, 1, 10) };
    const s1 = replan({ ...base, tasks: [task], blocks: [block] }, [], now);
    expect(s1.tasks[0].remainingMinutes).toBe(120);
    const s2 = replan({ ...s1, blocks: [...s1.blocks, block] }, [], now + 60_000);
    expect(s2.tasks[0].remainingMinutes).toBe(120);
  });
});

describe("移動時間を聞く取り込んだ予定", () => {
  it("場所もメモもなく、まだ答えていない7日先までの予定だけ", () => {
    const now = jst(2026, 10, 1, 12);
    const ev = (id: string, over = {}) => ({ id, title: id, start: jst(2026, 10, 2, 13), end: jst(2026, 10, 2, 17), ...over });
    const googleEvents = [
      ev("ask"),
      ev("loc", { location: "大学" }),
      ev("memo", { description: "移動30" }),
      ev("answered"),
      ev("allday", { allDay: true }),
      ev("far", { start: jst(2026, 10, 20, 13), end: jst(2026, 10, 20, 14) }),
    ];
    expect(travelAsks({ googleEvents, importedTravel: { answered: 30 } }, now).map((e) => e.id)).toEqual(["ask"]);
  });
});

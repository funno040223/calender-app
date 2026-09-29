import { describe, expect, it } from "vitest";
import { jst } from "@/lib/scheduler/test-helpers";
import type { ClassEvent } from "@/lib/mock/model";
import { feedEvents } from "./feed";

const now = jst(2026, 10, 1, 12);

describe("feedEvents", () => {
  it("枠・自分の予定・出る回の授業を入れ、範囲の外は入れない", () => {
    const classEvents = [
      { id: "class:c1:2026-10-02", title: "統計学", start: jst(2026, 10, 2, 9), end: jst(2026, 10, 2, 10, 30), attending: true },
      { id: "class:c2:2026-10-02", title: "任意の講義", start: jst(2026, 10, 2, 13), end: jst(2026, 10, 2, 14), attending: false },
    ] as ClassEvent[];
    const got = feedEvents({
      now,
      blocks: [
        { kind: "task", refId: "t1", title: "レポート", start: jst(2026, 10, 1, 14), end: jst(2026, 10, 1, 15) },
        { kind: "habit", refId: "h1", title: "入浴", start: jst(2026, 9, 1, 21), end: jst(2026, 9, 1, 22) },
      ],
      events: [{ id: "e1", title: "歯医者", start: jst(2026, 10, 3, 10), end: jst(2026, 10, 3, 11), location: "駅前" }],
      classEvents,
    });
    expect(got.map((e) => e.title)).toEqual(["レポート", "統計学", "歯医者"]);
    expect(got[0]).toMatchObject({ uid: `block-task-t1-${jst(2026, 10, 1, 14)}@task-rhythm-app`, description: "タスク（リズム カレンダーが配置）" });
    expect(got[2].location).toBe("駅前");
  });
});

import { describe, expect, it } from "vitest";
import { buildOutlook, contactDays, type WeekOutlook } from "./outlook";
import { jst } from "./test-helpers";
import type { DayPlan } from "./types";

// 2026-10-01 は木曜。今週は 9/28（月）〜10/4、来週は 10/5〜10/11
const now = jst(2026, 10, 1, 12);
const day = (d: number, m = 10): DayPlan => ({ dayStart: jst(2026, m, d), wake: jst(2026, m, d, 9), bed: jst(2026, m, d + 1, 2), wakeSource: "default", holiday: true });
const days = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((d) => day(d));
const base = { now, minSlackMinutesPerDay: 120, tzOffsetMinutes: 540 };

describe("buildOutlook", () => {
  it("今週と来週に分け、これからのタスクと空き時間を数える", () => {
    const [w1, w2] = buildOutlook({
      ...base,
      result: {
        dayPlans: days,
        blocks: [
          { kind: "task", refId: "a", title: "A", start: jst(2026, 10, 1, 10), end: jst(2026, 10, 1, 13) }, // 12時より前の1時間は数えない
          { kind: "task", refId: "b", title: "B", start: jst(2026, 10, 6, 10), end: jst(2026, 10, 6, 11) },
        ],
        freeGaps: [{ start: jst(2026, 10, 2, 10), end: jst(2026, 10, 2, 20) }, { start: jst(2026, 10, 7, 10), end: jst(2026, 10, 7, 11) }],
        shortfalls: [],
      },
    });
    expect(w1.start).toBe(jst(2026, 9, 28));
    expect(w1.taskMinutes).toBe(60);
    expect(w1.freeMinutes).toBe(600);
    // 今週の残りは4日 → 余白 2時間 × 4 = 8時間 < 空き 10時間 → 順調
    expect(w1.status).toBe("ok");
    // 来週は空き1時間しかない → きつい
    expect(w2.status).toBe("tight");
    expect(w2.taskMinutes).toBe(60);
  });

  it("締切に足りないタスクがある週は「間に合わない」", () => {
    const [w1] = buildOutlook({
      ...base,
      result: { dayPlans: days, blocks: [], freeGaps: [], shortfalls: [{ taskId: "x", title: "レポート", deadline: jst(2026, 10, 3), shortfallMinutes: 90 }] },
    });
    expect(w1.status).toBe("late");
    expect(w1.late).toEqual([{ taskId: "x", title: "レポート", shortfallMinutes: 90 }]);
  });
});

describe("contactDays", () => {
  const week = (start: number, status: WeekOutlook["status"]): WeekOutlook => ({ start, end: start + 7 * 86_400_000, taskMinutes: 0, freeMinutes: 0, status, late: [] });
  const plans = [
    { ...day(1), holiday: false },
    { ...day(2), holiday: false },
    day(3),
    day(4),
    { ...day(5), holiday: false },
    day(10),
  ];

  it("順調な週の、今日から先で最初の休日だけ", () => {
    const got = contactDays([week(jst(2026, 9, 28), "ok"), week(jst(2026, 10, 5), "ok")], plans, now, 540);
    expect(got).toEqual([
      { weekStart: jst(2026, 9, 28), dayStart: jst(2026, 10, 3) },
      { weekStart: jst(2026, 10, 5), dayStart: jst(2026, 10, 10) },
    ]);
  });

  it("順調でない週には聞かない", () => {
    expect(contactDays([week(jst(2026, 9, 28), "tight"), week(jst(2026, 10, 5), "late")], plans, now, 540)).toEqual([]);
  });
});

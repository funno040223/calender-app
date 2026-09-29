import { describe, expect, it } from "vitest";
import { jst } from "@/lib/scheduler/test-helpers";
import { DEFAULT_REWARD_RATES } from "./model";
import { dailyGrid, dailyReward, periodStats, rewardBalance, rewardEarned } from "./stats";

const ex = { id: "ex", name: "運動", durationMinutes: 5, windowStart: 0, windowEnd: 1440, frequency: { type: "weekly" as const, times: 3 }, skippable: true, track: true };
const walk = { id: "walk", name: "散歩", durationMinutes: 20, windowStart: 0, windowEnd: 150, frequency: { type: "daily" as const }, skippable: true, track: true };
const data = {
  habits: [ex, walk],
  wakeLogs: [
    { date: "2026-10-01", wokeAt: jst(2026, 10, 1, 9, 20), plannedWake: jst(2026, 10, 1, 9), routineDoneAt: jst(2026, 10, 1, 9, 40), doneStepIds: [] },
    { date: "2026-10-02", wokeAt: jst(2026, 10, 2, 10), plannedWake: jst(2026, 10, 2, 9), doneStepIds: [] },
  ],
  habitLogs: { "2026-10-01": { ex: "five" as const, walk: "five" as const }, "2026-10-02": { walk: "done" as const } },
  taskBlockLog: {
    "t:1": { title: "レポート", start: jst(2026, 10, 1, 14), end: jst(2026, 10, 1, 15), doneAt: jst(2026, 10, 1, 14) },
    "t:2": { title: "レポート", start: jst(2026, 10, 2, 14), end: jst(2026, 10, 2, 15) },
  },
  rewardSpends: [{ id: "s", at: jst(2026, 10, 2, 20), amount: 100 }],
  rewardRates: DEFAULT_REWARD_RATES,
};
const now = jst(2026, 10, 2, 22);

describe("予定どおりできた数", () => {
  it("起床は予定の30分以内、習慣の5分だけは5分以下の習慣なら1回", () => {
    const s = periodStats(data, jst(2026, 9, 19), jst(2026, 10, 3), now);
    expect(s.wake).toEqual({ done: 1, total: 2 });
    expect(s.routine).toEqual({ done: 1, total: 2 });
    // 運動 1（5分の習慣）＋ 散歩 0.5 ＋ 散歩 1。予定は 運動 3×2/7 ＋ 散歩 2
    expect(s.habit).toEqual({ done: 2.5, expected: 3 });
    expect(s.task).toEqual({ done: 1, total: 2 });
  });
});

describe("ご褒美のお金", () => {
  it("できたことだけ足し、使った分だけ引く", () => {
    // 起床30 ＋ 朝ルーティン30 ＋ 習慣 (1 + 0.5 + 1)×30 ＋ タスク100
    expect(rewardEarned(data)).toBe(235);
    expect(rewardBalance(data)).toBe(135);
    expect(rewardEarned(data, jst(2026, 10, 2), jst(2026, 10, 3))).toBe(30);
  });
});

describe("日ごとのマスと金額", () => {
  it("できた・一部・できなかった・予定なしを分ける", () => {
    const days = [jst(2026, 10, 1), jst(2026, 10, 2), jst(2026, 10, 3)];
    const g = dailyGrid(data, days, now);
    expect(g.wake.map((c) => c.state)).toEqual(["full", "miss", "none"]);
    expect(g.routine.map((c) => c.state)).toEqual(["full", "miss", "none"]);
    // 1日目は 運動（5分の習慣を5分）＋散歩5分 = 1.5、2日目は散歩 = 1
    expect(g.habit.map((c) => c.state)).toEqual(["full", "full", "none"]);
    expect(g.task.map((c) => c.state)).toEqual(["full", "miss", "none"]);
    expect(dailyReward(data, days)).toEqual([
      { day: days[0], earned: 205, spent: 0 },
      { day: days[1], earned: 30, spent: 100 },
      { day: days[2], earned: 0, spent: 0 },
    ]);
  });
});

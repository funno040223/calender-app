import { describe, expect, it } from "vitest";
import { jst } from "@/lib/scheduler/test-helpers";
import { DEFAULT_REWARD_RATES } from "./model";
import { DAY_MS } from "./jst";
import { bedStats, habitProgress, habitWeeks, keepMarkValues, mondayOf, periodStats, rewardBalance, rewardBreakdown, rewardEarned, workMinutes } from "./stats";

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

  it("就寝（予定の15分後まで）・記録をつけたことも足す", () => {
    const d = {
      ...data,
      rewardSpends: [],
      wakeLogs: [{ date: "2026-10-02", doneStepIds: [], fatigue: 3 as const, sleepMinutes: 420 }],
      eveningEnergy: { "2026-10-02": "normal" as const },
      bedLogs: {
        "2026-10-01": { at: jst(2026, 10, 2, 2, 10), plannedBed: jst(2026, 10, 2, 2) },
        "2026-10-02": { at: jst(2026, 10, 3, 2, 30), plannedBed: jst(2026, 10, 3, 2) },
      },
      habitLogs: {},
      taskBlockLog: {},
    };
    // 就寝30（1日目だけ間に合う）＋ 記録 10×3。タバコはご褒美の対象にしない
    expect(rewardEarned(d)).toBe(60);
  });

  it("習慣の時間を延ばしても消しても、たまった分は減らない。「記録する」でない習慣は数えない", () => {
    const grown = { ...data, habits: [{ ...ex, durationMinutes: 10 }, walk], habitLogs: keepMarkValues(data.habitLogs, ex, 10) };
    expect(rewardEarned(grown)).toBe(235);
    expect(rewardEarned({ ...data, habits: [walk], habitLogs: keepMarkValues(data.habitLogs, ex, Infinity) })).toBe(235);
    expect(rewardEarned({ ...data, habits: [ex, { ...walk, track: false }] })).toBe(235 - 45);
  });
});

describe("週のまとめ", () => {
  it("ご褒美は、もとごとに分けても合計は同じ", () => {
    const day = jst(2026, 10, 1);
    const parts = rewardBreakdown(data, day, day + DAY_MS);
    expect(Math.round(Object.values(parts).reduce((a, b) => a + b, 0))).toBe(rewardEarned(data, day, day + DAY_MS));
    expect(rewardEarned(data, day, day + DAY_MS)).toBe(205);
    expect(parts.task).toBe(DEFAULT_REWARD_RATES.task);
  });

  it("作業した時間は、「できなかった」の枠を数えない", () => {
    const log = {
      "a:1": { title: "a", start: jst(2026, 10, 1, 10), end: jst(2026, 10, 1, 11), outcome: "planned" as const, workedMinutes: 60 },
      "a:2": { title: "a", start: jst(2026, 10, 1, 13), end: jst(2026, 10, 1, 14, 30), outcome: "partial" as const },
      "a:3": { title: "a", start: jst(2026, 10, 1, 16), end: jst(2026, 10, 1, 17), outcome: "none" as const },
      "a:4": { title: "a", start: jst(2026, 10, 1, 19), end: jst(2026, 10, 1, 20) },
    };
    expect(workMinutes({ taskBlockLog: log }, jst(2026, 10, 1), jst(2026, 10, 2))).toEqual({ worked: 150, planned: 270 });
  });

  it("寝た夜は、記録を始めた日から数え、今夜はまだ数えない", () => {
    const bedLogs = {
      "2026-09-29": { at: jst(2026, 9, 30, 1), plannedBed: jst(2026, 9, 30, 1) },
      "2026-09-30": { at: jst(2026, 10, 1, 3), plannedBed: jst(2026, 10, 1, 1) },
    };
    // 10/1 の夜は押していないので数え、10/2 の夜（今夜）はまだ数えない
    expect(bedStats({ bedLogs }, jst(2026, 9, 28), jst(2026, 10, 5), now)).toEqual({ done: 1, total: 3 });
  });

  it("今週の習慣は、月〜日の記録と週の目安を出す", () => {
    const monday = mondayOf(jst(2026, 10, 2));
    expect(monday).toBe(jst(2026, 9, 28));
    const [e, w] = habitWeeks(data, monday, now);
    expect(e.marks.slice(3, 5)).toEqual(["five", undefined]);
    expect(e.done).toBe(1);
    expect(e.target).toBe(3);
    expect(w.done).toBe(1.5);
    expect(w.target).toBe(7);
  });
});

describe("習慣の続き具合", () => {
  it("毎日の習慣は、今日まだでも昨日まで続いている日数を数える", () => {
    const logs = { "2026-09-30": { walk: "done" as const }, "2026-10-01": { walk: "five" as const } };
    const p = habitProgress({ habitLogs: logs }, walk, jst(2026, 10, 2, 8));
    expect(p).toEqual({ streak: 2, unit: "日", done: 1.5, expected: 14 });
  });
});

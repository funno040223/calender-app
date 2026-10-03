import { describe, expect, it } from "vitest";
import { jst } from "@/lib/scheduler/test-helpers";
import { bedOnTimeOf, fallAsleepMinutes, getUpMinutes, nightOf, upOnTime } from "./night";
import { replan, sampleData } from "./state";
import type { MockData } from "./model";

const base = { wakeLogs: [] as MockData["wakeLogs"], bedLogs: {} as MockData["bedLogs"], settings: { sleepMinutes: 420 } as MockData["settings"] };
const health = { "2026-10-02": { start: jst(2026, 10, 2, 1, 35), end: jst(2026, 10, 2, 8, 50), minutes: 410 } };

describe("夜の記録", () => {
  it("活動（寝る・起きた）と睡眠（ヘルスケア）を分けて持ち、その差を出す", () => {
    const n = nightOf(
      {
        ...base,
        bedLogs: { "2026-10-01": { at: jst(2026, 10, 2, 1, 10), plannedBed: jst(2026, 10, 2, 2) } },
        wakeLogs: [{ date: "2026-10-02", doneStepIds: [], wokeAt: jst(2026, 10, 2, 9, 20), plannedWake: jst(2026, 10, 2, 9) }],
        healthSleep: health,
      },
      "2026-10-02",
    );
    expect(n.bed).toEqual({ at: jst(2026, 10, 2, 1, 10), source: "button" });
    expect(n.up).toEqual({ at: jst(2026, 10, 2, 9, 20), source: "button" });
    expect([n.asleep, n.awake]).toEqual([jst(2026, 10, 2, 1, 35), jst(2026, 10, 2, 8, 50)]);
    expect(fallAsleepMinutes(n)).toBe(25);
    expect(getUpMinutes(n)).toBe(30);
    // 睡眠時間はヘルスケアの眠った分（手で直していなければ）
    expect(n.sleep).toEqual({ minutes: 410, source: "health" });
    expect(upOnTime(n)).toBe(true);
    expect(bedOnTimeOf(n)).toBe(true);
  });

  it("手で入れた時刻 → ボタン → 朝ルーティンの最初のチェック の順に使う", () => {
    const routineOnly = nightOf({ ...base, wakeLogs: [{ date: "2026-10-02", doneStepIds: ["a"], routineStartedAt: jst(2026, 10, 2, 9, 40), plannedWake: jst(2026, 10, 2, 9) }] }, "2026-10-02");
    expect(routineOnly.up).toEqual({ at: jst(2026, 10, 2, 9, 40), source: "routine" });
    expect(upOnTime(routineOnly)).toBe(false);
    const manual = nightOf(
      {
        ...base,
        wakeLogs: [{ date: "2026-10-02", doneStepIds: [], wokeAt: jst(2026, 10, 2, 12) }],
        rhythmResets: [{ id: "r", mode: "woke", start: jst(2026, 10, 2, 3), end: jst(2026, 10, 2, 11, 30) }],
      },
      "2026-10-02",
    );
    expect(manual.bed).toEqual({ at: jst(2026, 10, 2, 3), source: "manual" });
    expect(manual.up).toEqual({ at: jst(2026, 10, 2, 11, 30), source: "manual" });
  });

  it("ヘルスケアがない夜は、寝る〜起きたを睡眠時間として出す。目覚めは活動開始には使わない", () => {
    const buttons = nightOf(
      {
        ...base,
        bedLogs: { "2026-10-01": { at: jst(2026, 10, 2, 1), plannedBed: jst(2026, 10, 2, 2) } },
        wakeLogs: [{ date: "2026-10-02", doneStepIds: [], wokeAt: jst(2026, 10, 2, 8, 30) }],
      },
      "2026-10-02",
    );
    expect(buttons.sleep).toEqual({ minutes: 450, source: "button" });
    const healthOnly = nightOf({ ...base, healthSleep: health }, "2026-10-02");
    expect(healthOnly.up).toBeUndefined();
    expect(healthOnly.awake).toBe(jst(2026, 10, 2, 8, 50));
  });
});

describe("朝ルーティンを起床の直後にできなかった日", () => {
  it("最初のチェックの時刻から朝ルーティンを置き、朝食・散歩もそのあとへ組み直す", () => {
    const now = jst(2026, 10, 3, 10, 20);
    const d = sampleData(now);
    const wokeAt = jst(2026, 10, 3, 9);
    const started = jst(2026, 10, 3, 10, 15);
    const state = replan({ ...d, courses: [], tasks: [], events: [], wakeLogs: [{ date: "2026-10-03", doneStepIds: ["step-curtain"], wokeAt, routineStartedAt: started }] }, [], now);
    const routine = state.result.blocks.find((b) => b.refId === "routine" && b.start >= jst(2026, 10, 3) && b.start < jst(2026, 10, 4));
    expect(routine?.start).toBe(started);
    const breakfast = state.result.blocks.find((b) => b.refId === "habit-breakfast" && b.start >= jst(2026, 10, 3) && b.start < jst(2026, 10, 4));
    if (breakfast) expect(breakfast.start).toBeGreaterThanOrEqual(started + d.settings.routineMinutes * 60_000);
  });
  it("「起きた」を押さずに始めたら、最初のチェックを活動開始として組み直す", () => {
    const now = jst(2026, 10, 3, 11);
    const started = jst(2026, 10, 3, 10, 40);
    const d = sampleData(now);
    const state = replan({ ...d, courses: [], tasks: [], events: [], wakeLogs: [{ date: "2026-10-03", doneStepIds: ["step-curtain"], routineStartedAt: started }] }, [], now);
    expect(state.result.dayPlans[0].wake).toBe(started);
  });
});

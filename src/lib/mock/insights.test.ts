import { describe, expect, it } from "vitest";
import { jst } from "@/lib/scheduler/test-helpers";
import { DAY_MS, MIN } from "./jst";
import { dateKeyOf, type DoneTask, type MockData, type TaskBlockLog } from "./model";
import { applyInsightAction, buildInsights } from "./insights";
import { replan, sampleData } from "./state";

const now = jst(2026, 10, 29, 12);
const base = (patch: Partial<MockData> = {}) => replan({ ...sampleData(now), tasks: [], events: [], courses: [], ...patch }, [], now);
const focusTask: DoneTask = { id: "t-focus", title: "ES", tagId: "tag-focus", doneAt: now - DAY_MS, estimateMinutes: 60 };

/** n 日前の h 時からの1時間の枠（t-focus のもの） */
function blocks(list: { daysAgo: number; hour: number; failed: boolean }[]): Record<string, TaskBlockLog> {
  return Object.fromEntries(
    list.map(({ daysAgo, hour, failed }) => {
      const start = jst(2026, 10, 29 - daysAgo, hour);
      return [`t-focus:${start}`, { title: "ES", start, end: start + 60 * MIN, reviewedAt: start + 90 * MIN, outcome: failed ? "none" : "planned" } satisfies TaskBlockLog];
    }),
  );
}

describe("気づき", () => {
  it("夜の集中の枠ができないことが多ければ、回数で出し、「入れない」にできる", () => {
    const night = Array.from({ length: 12 }, (_, i) => ({ daysAgo: i + 1, hour: 21, failed: i < 9 }));
    const day = Array.from({ length: 26 }, (_, i) => ({ daysAgo: (i % 20) + 1, hour: i < 20 ? 10 : 14, failed: i < 5 }));
    const state = base({ doneTasks: [focusTask], taskBlockLog: blocks([...night, ...day]) });
    const found = buildInsights(state, now).find((x) => x.id === "blocks");
    expect(found?.text).toBe("夜（20時〜）の集中の枠は、12回中9回できなかった");
    expect(found?.sub).toBe("ほかの時間は 26回中5回");
    const next = applyInsightAction(state, found!.action!, "avoid-1");
    expect(next.avoidWindows.at(-1)).toMatchObject({ start: 20 * 60, end: 28 * 60, tagIds: ["tag-focus"], hard: true });
    // 「入れない」にしたあとは出さない
    expect(buildInsights(replan(next, [], now), now).some((x) => x.id === "blocks")).toBe(false);
  });

  it("回数が足りなければ、差が大きくても出さない", () => {
    const night = Array.from({ length: 9 }, (_, i) => ({ daysAgo: i + 1, hour: 21, failed: true }));
    const day = Array.from({ length: 26 }, (_, i) => ({ daysAgo: (i % 20) + 1, hour: 10, failed: false }));
    const state = base({ doneTasks: [focusTask], taskBlockLog: blocks([...night, ...day]) });
    expect(buildInsights(state, now).some((x) => x.id === "blocks")).toBe(false);
  });

  it("締切の前日以降に終わることが多ければ、置き方を前倒しにできる", () => {
    const doneTasks: DoneTask[] = Array.from({ length: 6 }, (_, i) => {
      const deadline = jst(2026, 10, 20 + i);
      return { id: `d${i}`, title: "ES", deadline, doneAt: i < 4 ? deadline - 3 * 60 * MIN : deadline - 5 * DAY_MS };
    });
    const state = base({ doneTasks });
    const found = buildInsights(state, now).find((x) => x.id === "deadline");
    expect(found?.text).toBe("終わったタスクの 6件中4件が、締切の前日以降");
    expect(applyInsightAction(state, found!.action!, "x").settings.taskStrategy).toBe("early");
  });

  it("見積もりより長くかかる種類は、何倍かを出す", () => {
    const doneTasks: DoneTask[] = Array.from({ length: 5 }, (_, i) => ({ id: `e${i}`, title: "ES", tagId: "tag-focus", doneAt: now - (i + 1) * DAY_MS, estimateMinutes: 60 }));
    const taskBlockLog = Object.fromEntries(
      doneTasks.map((t, i) => {
        const start = now - (i + 2) * DAY_MS;
        return [`${t.id}:${start}`, { title: "ES", start, end: start + 90 * MIN, reviewedAt: start, outcome: "planned" as const, workedMinutes: 90 }];
      }),
    );
    const found = buildInsights(base({ doneTasks, taskBlockLog }), now).find((x) => x.id === "estimate");
    expect(found?.text).toBe("集中の作業は、見積もりの1.5倍かかっている");
  });

  it("起きてすぐに吸うことが多ければ、場面と倍率を出す", () => {
    const wakeLogs = Array.from({ length: 20 }, (_, i) => ({ date: dateKeyOf(now - (i + 1) * DAY_MS), doneStepIds: [], wokeAt: jst(2026, 10, 28 - i, 9) }));
    // 毎朝起きて30分に1本、ほかは昼と夜にばらけて1本ずつ
    const smokeLogs = wakeLogs.flatMap((l) => [l.wokeAt! + 30 * MIN, l.wokeAt! + 5 * 60 * MIN, l.wokeAt! + 11 * 60 * MIN]);
    const found = buildInsights(base({ wakeLogs, smokeLogs }), now).find((x) => x.id === "smoke");
    expect(found?.text).toBe("吸うことが多いのは、起きて1時間");
    expect(found?.sub).toMatch(/^ふだんの\d+\.\d倍（20本）/);
  });

  it("習慣は、置いた日のうち条件のある日に抜けることが多ければ出す", () => {
    const walk = sampleData(now).habits.find((h) => h.id === "habit-walk")!;
    const dayLogs: MockData["dayLogs"] = {};
    const habitLogs: MockData["habitLogs"] = {};
    for (let i = 1; i <= 24; i++) {
      const key = dateKeyOf(now - i * DAY_MS);
      const away = i % 2 === 0;
      dayLogs[key] = { events: 1, away, habits: [walk.id], meals: {} };
      // 外出の日は12回中10回抜け、家の日は12回中2回だけ抜ける
      const missed = away ? i <= 20 : i <= 3;
      if (!missed) habitLogs[key] = { [walk.id]: "done" };
    }
    const found = buildInsights(base({ habits: [walk], dayLogs, habitLogs }), now).find((x) => x.id === "habit");
    expect(found?.text).toBe("散歩は、外出の日に 12回中10回抜けた");
    expect(found?.sub).toBe("ほかの日は 12回中2回");
  });
});

describe("計画の控え", () => {
  it("今日の予定の数・置いた記録する習慣・食事の時刻を残す", () => {
    const state = replan(sampleData(now), [], now);
    const log = state.dayLogs[dateKeyOf(now)];
    expect(log).toBeDefined();
    expect(typeof log.away).toBe("boolean");
    expect(Array.isArray(log.habits)).toBe(true);
    expect(log.points).toBeTypeOf("number");
  });
});

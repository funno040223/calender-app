import { describe, expect, it } from "vitest";
import { DAY_MS, jstTime } from "./jst";
import { buildClassEvents, classEventsForPlan, dateKeyOf, parseClassEventId, treatFor, treatIndexFor, type Course } from "./model";
import { wakeStreak } from "./night";
import { SAMPLE_PERIODS, SAMPLE_ROUTINE_STEPS, SAMPLE_TREATS } from "./sample";
import { fromStoredV2, migrateV1, sampleData, toData } from "./store";

const course: Course = {
  id: "c1",
  name: "線形代数",
  // 月曜は 10/12（スポーツの日）が大学の休講日なので、火曜で確かめる
  weekday: 2,
  period: 1,
  termStart: "2026-09-29",
  termEnd: "2026-10-20",
  location: "大学",
  optional: false,
  cancelledDates: ["2026-10-06"],
  attendedDates: [],
};

describe("buildClassEvents", () => {
  it("学期の同じ曜日・時限に授業を作り、休講の日は除く", () => {
    const evs = buildClassEvents([course], SAMPLE_PERIODS);
    expect(evs.map((e) => dateKeyOf(e.start))).toEqual(["2026-09-29", "2026-10-13", "2026-10-20"]);
    // 東大の1限は 8:30〜10:15
    expect(evs[0].start).toBe(jstTime(2026, 9, 29, 8, 30));
    expect(evs[0].end).toBe(jstTime(2026, 9, 29, 10, 15));
    expect(parseClassEventId(evs[0].id)).toEqual({ courseId: "c1", date: "2026-09-29" });
  });

  it("時限の代わりに開始・終了の時刻でも作れる", () => {
    const evs = buildClassEvents([{ ...course, period: undefined, startMinute: 13 * 60, endMinute: 15 * 60 }], SAMPLE_PERIODS);
    expect(evs[0].start).toBe(jstTime(2026, 9, 29, 13, 0));
    expect(evs[0].end).toBe(jstTime(2026, 9, 29, 15, 0));
  });

  it("任意参加は、参加する回だけ組み立てに渡す", () => {
    const evs = buildClassEvents([{ ...course, optional: true, attendedDates: ["2026-10-13"] }], SAMPLE_PERIODS);
    expect(evs.map((e) => e.attending)).toEqual([false, true, false]);
    const forPlan = classEventsForPlan(evs);
    expect(forPlan.map((e) => dateKeyOf(e.start))).toEqual(["2026-10-13"]);
    expect(Object.keys(forPlan[0]).sort()).toEqual(["end", "id", "location", "start", "title"]);
  });

  it("時限が登録されていない授業は作らない", () => {
    expect(buildClassEvents([{ ...course, period: 9 }], SAMPLE_PERIODS)).toEqual([]);
  });
});

describe("treatIndexFor", () => {
  it("同じ日は同じ、前の日とは違うものを選ぶ", () => {
    for (const n of [2, 3, 5, 8]) {
      for (let day = 20000; day < 20100; day++) {
        const i = treatIndexFor(day, n, "seed");
        expect(i).toBe(treatIndexFor(day, n, "seed"));
        expect(i).toBeGreaterThanOrEqual(0);
        expect(i).toBeLessThan(n);
        expect(i).not.toBe(treatIndexFor(day - 1, n, "seed"));
      }
    }
  });

  it("1つだけなら毎日それ、空なら選ばない", () => {
    expect(treatIndexFor(123, 1)).toBe(0);
    expect(treatIndexFor(123, 0)).toBe(-1);
    expect(treatFor(jstTime(2026, 9, 28), [])).toBeUndefined();
    expect(treatFor(jstTime(2026, 9, 28), SAMPLE_TREATS)).toBeDefined();
  });
});

describe("wakeStreak", () => {
  const today = jstTime(2026, 9, 28);
  const log = (ms: number) => ({ id: dateKeyOf(ms), date: dateKeyOf(ms), up: { at: ms + 7 * 3600_000, source: "button" as const } });

  it("今日から続けて起きた日を数える", () => {
    expect(wakeStreak({ sleepLogs: [log(today), log(today - DAY_MS), log(today - 3 * DAY_MS)] }, today)).toBe(2);
  });
  it("今日がまだなら昨日までを数える", () => {
    expect(wakeStreak({ sleepLogs: [log(today - DAY_MS), log(today - 2 * DAY_MS)] }, today)).toBe(2);
    // 朝ルーティンを始めただけでは数えない
    expect(wakeStreak({ wakeLogs: [{ date: dateKeyOf(today), doneStepIds: ["a"], routineStartedAt: today + 8 * 3600_000 }] }, today)).toBe(0);
  });
  it("「今から立て直す」の起きたところも、起きた記録に数える", () => {
    const reset = { id: dateKeyOf(today), date: dateKeyOf(today), bed: { at: today, source: "reset" as const }, up: { at: today + 9 * 3600_000, source: "reset" as const } };
    expect(wakeStreak({ sleepLogs: [reset, log(today - DAY_MS)] }, today)).toBe(2);
  });
});

describe("保存データ", () => {
  const now = jstTime(2026, 9, 28, 8);

  it("v1 の予定・タスク・枠・場所・表示を引き継ぎ、新しい項目はサンプルで埋める", () => {
    const v1 = {
      ownEvents: [{ id: "own-1", title: "予定", start: now, end: now + 3600_000 }],
      tasks: [{ id: "t1", title: "タスク", priority: 2 }],
      blocks: [{ kind: "task", refId: "t1", title: "タスク", start: now, end: now + 3600_000, pinned: true }],
      places: [{ id: "p1", name: "図書館", keywords: ["図書館"], travelMinutes: 10 }],
      hiddenCalendars: ["google"],
    };
    const d = migrateV1(v1, now)!;
    expect(d.version).toBe(2);
    expect(d.events).toEqual(v1.ownEvents);
    expect(d.tasks).toEqual(v1.tasks);
    expect(d.blocks).toEqual(v1.blocks);
    expect(d.places).toEqual(v1.places);
    expect(d.hiddenCalendars).toEqual(["google"]);
    expect(d.courses.length).toBeGreaterThan(0);
    expect(d.routineSteps).toEqual(SAMPLE_ROUTINE_STEPS);
  });

  it("v2 は保存したまま読み戻せる", () => {
    const d = sampleData(now);
    expect(fromStoredV2(JSON.parse(JSON.stringify(toData(d))), now)).toEqual(d);
    expect(fromStoredV2({ version: 1 }, now)).toBeUndefined();
  });
});

describe("東大の暦", () => {
  it("大学が授業をしない日（勤労感謝の日・駒場祭・冬季休業）には授業を入れず、授業をする祝日（文化の日）には入れる", async () => {
    const { buildClassEvents } = await import("./model");
    const { UTOKYO_PERIODS, UTOKYO_TERMS } = await import("./utokyo");
    const a = UTOKYO_TERMS.find((t) => t.id === "2026-A")!;
    const course = { id: "c", name: "ゼミ", period: 2, termStart: a.start, termEnd: a.end, optional: false, cancelledDates: [], attendedDates: [] };
    const dates = (weekday: number) => buildClassEvents([{ ...course, weekday }], UTOKYO_PERIODS).map((e) => e.date);
    expect(dates(1)).not.toContain("2026-11-23");
    expect(dates(1)).not.toContain("2026-10-12");
    expect(dates(5)).not.toContain("2026-11-20");
    expect(dates(4)).not.toContain("2026-12-31");
    expect(dates(2)).toContain("2026-11-03");
    // 2限は 10:25〜12:10
    const first = buildClassEvents([{ ...course, weekday: 5 }], UTOKYO_PERIODS)[0];
    expect(first.date).toBe("2026-10-02");
    expect((first.end - first.start) / 60000).toBe(105);
  });
});

describe("今日の楽しみの選び方", () => {
  const treats = [
    { id: "far", name: "遠出", category: "adventure" as const, holidayOnly: true, outdoor: true },
    { id: "walk", name: "散歩", category: "adventure" as const, outdoor: true },
    { id: "home", name: "家で", category: "food" as const },
  ];
  it("休日でなければ「休日だけ」を、雨の日なら「外で」を出さない", () => {
    for (let day = 20000; day < 20060; day++) {
      const ms = day * DAY_MS;
      expect(treatFor(ms, treats, { holiday: false })?.id).not.toBe("far");
      expect(["home"]).toContain(treatFor(ms, treats, { holiday: true, rainy: true })?.id);
    }
  });
  it("合うものがなければ、全部から選ぶ", () => {
    expect(treatFor(0, [treats[0]], { holiday: false, rainy: true })?.id).toBe("far");
  });
});

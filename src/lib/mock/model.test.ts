import { describe, expect, it } from "vitest";
import { DAY_MS, jstTime } from "./jst";
import { buildClassEvents, classEventsForPlan, dateKeyOf, parseClassEventId, treatFor, treatIndexFor, wakeStreak, type Course } from "./model";
import { SAMPLE_PERIODS, SAMPLE_TREATS } from "./sample";
import { fromStoredV2, migrateV1, sampleData, toData } from "./store";

const course: Course = {
  id: "c1",
  name: "線形代数",
  weekday: 1,
  period: 1,
  termStart: "2026-09-28",
  termEnd: "2026-10-19",
  location: "大学",
  optional: false,
  cancelledDates: ["2026-10-05"],
  attendedDates: [],
};

describe("buildClassEvents", () => {
  it("学期の同じ曜日・時限に授業を作り、休講の日は除く", () => {
    const evs = buildClassEvents([course], SAMPLE_PERIODS);
    expect(evs.map((e) => dateKeyOf(e.start))).toEqual(["2026-09-28", "2026-10-12", "2026-10-19"]);
    expect(evs[0].start).toBe(jstTime(2026, 9, 28, 9, 0));
    expect(evs[0].end).toBe(jstTime(2026, 9, 28, 10, 30));
    expect(parseClassEventId(evs[0].id)).toEqual({ courseId: "c1", date: "2026-09-28" });
  });

  it("時限の代わりに開始・終了の時刻でも作れる", () => {
    const evs = buildClassEvents([{ ...course, period: undefined, startMinute: 13 * 60, endMinute: 15 * 60 }], SAMPLE_PERIODS);
    expect(evs[0].start).toBe(jstTime(2026, 9, 28, 13, 0));
    expect(evs[0].end).toBe(jstTime(2026, 9, 28, 15, 0));
  });

  it("任意参加は、参加する回だけ組み立てに渡す", () => {
    const evs = buildClassEvents([{ ...course, optional: true, attendedDates: ["2026-10-12"] }], SAMPLE_PERIODS);
    expect(evs.map((e) => e.attending)).toEqual([false, true, false]);
    const forPlan = classEventsForPlan(evs);
    expect(forPlan.map((e) => dateKeyOf(e.start))).toEqual(["2026-10-12"]);
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
  const log = (ms: number) => ({ date: dateKeyOf(ms), wokeAt: ms + 7 * 3600_000, doneStepIds: [] });

  it("今日から続けて起きた日を数える", () => {
    expect(wakeStreak([log(today), log(today - DAY_MS), log(today - 3 * DAY_MS)], today)).toBe(2);
  });
  it("今日がまだなら昨日までを数える", () => {
    expect(wakeStreak([log(today - DAY_MS), log(today - 2 * DAY_MS)], today)).toBe(2);
    expect(wakeStreak([{ date: dateKeyOf(today), doneStepIds: ["a"] }], today)).toBe(0);
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
    expect(d.routineSteps.map((r) => r.title)).toEqual(["カーテンを開ける", "水を1杯飲む", "顔を洗う", "5分ストレッチ", "今日の予定を見る"]);
  });

  it("v2 は保存したまま読み戻せる", () => {
    const d = sampleData(now);
    expect(fromStoredV2(JSON.parse(JSON.stringify(toData(d))), now)).toEqual(d);
    expect(fromStoredV2({ version: 1 }, now)).toBeUndefined();
  });
});

import { describe, expect, it } from "vitest";
import { plan } from "./planner";
import type { Block, CalendarEvent, Habit, PlanResult } from "./types";
import { baseInput, jst } from "./test-helpers";
import { DAY_MS, MIN, localDayStart } from "./time";
import { BREAKFAST_HABIT, SAMPLE_HABITS, SAMPLE_PLACES, homeExerciseHabit, BATH } from "../mock/sample";
import { buildNotices } from "../notify/build";
import { DEFAULT_SETTINGS } from "./types";

const habit = (id: string) => SAMPLE_HABITS.find((h) => h.id === id)!;
const laundry = habit("habit-laundry");
const tidy = habit("habit-tidy");
const onDay = (r: PlanResult, id: string, dayStart: number) =>
  r.blocks.filter((b) => b.kind === "habit" && b.refId === id && b.start >= dayStart && b.start < dayStart + DAY_MS);

describe("週に何回かの習慣", () => {
  it("毎日組み直しても、月曜始まりの週で回数を超えない", () => {
    const exercise: Habit = { ...homeExerciseHabit("2026-10-01"), track: false };
    const habits = [BATH, exercise];
    const done = new Set<number>();
    let prev: Block[] = [];
    let last: PlanResult | undefined;
    // 10/5（月）〜10/11（日）の朝8時に毎日組み直す。始まった枠をやった日として渡す（state.ts と同じ）
    for (let i = 0; i < 7; i++) {
      const now = jst(2026, 10, 5 + i, 8);
      for (const b of prev) if (b.refId === exercise.id && b.start <= now) done.add(localDayStart(b.start, 540));
      last = plan(baseInput(now, { habits, previousBlocks: prev, habitDoneDays: { [exercise.id]: [...done] } }));
      prev = last.blocks;
    }
    const sunday = onDay(last!, exercise.id, jst(2026, 10, 11)).length;
    expect(done.size + sunday).toBe(3);
  });

  it("今週すでに回数に達していれば、今週は置かない", () => {
    const exercise: Habit = { ...homeExerciseHabit("2026-10-01"), track: false };
    const r = plan(baseInput(jst(2026, 10, 8, 8), { habits: [BATH, exercise], habitDoneDays: { [exercise.id]: [jst(2026, 10, 5), jst(2026, 10, 6), jst(2026, 10, 7)] } }));
    const thisWeek = r.blocks.filter((b) => b.refId === exercise.id && b.start < jst(2026, 10, 12));
    expect(thisWeek).toHaveLength(0);
    expect(r.blocks.filter((b) => b.refId === exercise.id && b.start >= jst(2026, 10, 12) && b.start < jst(2026, 10, 19))).toHaveLength(3);
  });
});

describe("待ち時間のある習慣", () => {
  it("洗濯を回し始めたあとの組み直しでも、干す枠と片付けを残す", () => {
    const sat = jst(2026, 10, 3);
    const first = plan(baseInput(jst(2026, 10, 3, 8), { habits: [laundry, tidy] }));
    const [wash] = onDay(first, laundry.id, sat).filter((b) => b.title === laundry.name);
    expect(wash).toBeDefined();
    const again = plan(baseInput(wash.start + 5 * MIN, { habits: [laundry, tidy], previousBlocks: first.blocks }));
    const hang = onDay(again, laundry.id, sat).filter((b) => b.title === laundry.finish!.title);
    expect(hang.map((b) => b.start)).toEqual([wash.start + 90 * MIN]);
    const tidyNow = onDay(again, tidy.id, sat);
    expect(tidyNow).toHaveLength(1);
    expect(tidyNow[0].start).toBeGreaterThanOrEqual(wash.end);
    expect(tidyNow[0].end).toBeLessThanOrEqual(wash.start + 90 * MIN);
  });

  it("片付けも「今日は飛ばす」に従う", () => {
    const sat = jst(2026, 10, 3);
    const r = plan(baseInput(jst(2026, 10, 3, 8), { habits: [laundry, tidy], skipHabitDays: { [tidy.id]: [sat] } }));
    expect(onDay(r, laundry.id, sat).length).toBeGreaterThan(0);
    expect(onDay(r, tidy.id, sat)).toHaveLength(0);
  });
});

describe("身支度のある日", () => {
  it("朝食と散歩を、朝ルーティン・身支度のあとに置く", () => {
    const day = jst(2026, 10, 1);
    const seminar: CalendarEvent = { id: "e", title: "ゼミ", start: jst(2026, 10, 1, 15), end: jst(2026, 10, 1, 17), location: "大学" };
    const r = plan(baseInput(jst(2026, 10, 1, 6), { habits: [BREAKFAST_HABIT, habit("habit-walk")], events: [seminar], places: SAMPLE_PLACES }));
    const routine = r.blocks.find((b) => b.kind === "routine" && b.start >= day && b.start < day + DAY_MS)!;
    expect(r.dayPlans[0].prep).toBe(true);
    const [breakfast] = onDay(r, BREAKFAST_HABIT.id, day);
    const [walk] = onDay(r, "habit-walk", day);
    expect(breakfast.start).toBeGreaterThanOrEqual(routine.end);
    expect(walk.start).toBeGreaterThanOrEqual(breakfast.end);
  });
});

describe("週に何回かの習慣の記録（state.ts）", () => {
  it("始まった枠の日を残し、次の日の組み直しで数える", async () => {
    const { replan, sampleData } = await import("../mock/state");
    const exercise: Habit = { ...homeExerciseHabit("2026-10-01"), track: false };
    const base = { ...sampleData(jst(2026, 10, 5, 8)), habits: [BATH, exercise], events: [], courses: [], tasks: [] };
    const mon = replan(base, [], jst(2026, 10, 5, 8));
    const monBlock = onDay(mon.result, exercise.id, jst(2026, 10, 5));
    const tue = replan(mon, [], jst(2026, 10, 6, 8));
    expect(monBlock).toHaveLength(1);
    expect(tue.habitDoneDays[exercise.id]).toEqual([jst(2026, 10, 5)]);
  });

  it("「記録する」の習慣は、やった記録で数える", async () => {
    const { replan, sampleData } = await import("../mock/state");
    const exercise = homeExerciseHabit("2026-10-01");
    const habitLogs = { "2026-10-05": { [exercise.id]: "done" as const }, "2026-10-06": { [exercise.id]: "five" as const }, "2026-10-07": { [exercise.id]: "done" as const } };
    const base = { ...sampleData(jst(2026, 10, 8, 8)), habits: [BATH, exercise], events: [], courses: [], tasks: [], habitLogs };
    const r = replan(base, [], jst(2026, 10, 8, 8));
    expect(r.result.blocks.filter((b) => b.refId === exercise.id && b.start < jst(2026, 10, 12))).toHaveLength(0);
  });
});

describe("夜中（0時を過ぎて、まだ寝る前）", () => {
  it("前の日の就寝までを計画に入れ、寝る準備の通知も残す", () => {
    const now = jst(2026, 10, 2, 0, 10);
    const r = plan(baseInput(now));
    expect(r.dayPlans[0].dayStart).toBe(jst(2026, 10, 1));
    expect(r.dayPlans[0].bed).toBe(jst(2026, 10, 2, 2));
    expect(r.freeGaps.some((g) => g.start < jst(2026, 10, 2, 1))).toBe(true);
    const notices = buildNotices({ now, result: r, events: [], places: [], settings: DEFAULT_SETTINGS });
    expect(notices.some((n) => n.key === `bedprep:${jst(2026, 10, 1)}`)).toBe(true);
  });

  it("0時を過ぎてから始めた入浴は前の晩の分。次の晩にも入浴を置く", () => {
    const late: CalendarEvent = { id: "late", title: "打ち合わせ", start: jst(2026, 10, 1, 23), end: jst(2026, 10, 2, 0) };
    const first = plan(baseInput(jst(2026, 10, 1, 20), { habits: [BATH], events: [late] }));
    const [bath] = first.blocks.filter((b) => b.refId === BATH.id && b.start >= jst(2026, 10, 1, 12) && b.start < jst(2026, 10, 2, 9));
    expect(bath.start).toBeGreaterThanOrEqual(jst(2026, 10, 2));
    const mid = plan(baseInput(bath.start + 10 * MIN, { habits: [BATH], events: [late], previousBlocks: first.blocks }));
    const noon = plan(baseInput(jst(2026, 10, 2, 12), { habits: [BATH], events: [late], previousBlocks: mid.blocks }));
    expect(noon.blocks.filter((b) => b.refId === BATH.id && b.start >= jst(2026, 10, 2, 12) && b.start < jst(2026, 10, 3, 9))).toHaveLength(1);
  });

  it("0時過ぎの帰宅は前の日の帰宅。次の日の休日も変えない", () => {
    const cafe: CalendarEvent = { id: "c", title: "バイト", start: jst(2026, 10, 1, 20), end: jst(2026, 10, 2, 0, 30), location: "カフェ" };
    const r = plan(baseInput(jst(2026, 10, 1, 8), { events: [cafe], places: SAMPLE_PLACES }));
    expect(r.dayPlans[0].homeAt).toBe(jst(2026, 10, 2, 0, 50));
    expect(r.dayPlans[1].homeAt).toBeUndefined();
    expect(r.dayPlans[1].holiday).toBe(true);
  });
});

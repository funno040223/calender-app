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
    const cafePlace = { id: "place-cafe", name: "カフェ", keywords: ["カフェ"], travelMinutes: 20 };
    const r = plan(baseInput(jst(2026, 10, 1, 8), { events: [cafe], places: [...SAMPLE_PLACES, cafePlace] }));
    expect(r.dayPlans[0].homeAt).toBe(jst(2026, 10, 2, 0, 50));
    expect(r.dayPlans[1].homeAt).toBeUndefined();
    expect(r.dayPlans[1].holiday).toBe(true);
  });
});

describe("タスクを消したとき", () => {
  it("そのタスクの枠の通知（始まり・どのくらい進んだ？）を一覧から外す", async () => {
    const { replan, sampleData } = await import("../mock/state");
    const { deleteTask } = await import("../mock/notion");
    const now = jst(2026, 10, 1, 8);
    const task = { id: "t1", title: "レポート", priority: 2 as const, durationMinutes: 60, deadline: jst(2026, 10, 3) };
    const s1 = replan({ ...sampleData(now), tasks: [task], events: [], courses: [] }, [], now);
    const notices = (s: typeof s1) => buildNotices({ now, result: s.result, events: [], places: s.places, settings: s.settings, habits: s.habits }).filter((n) => n.key.includes(":t1:"));
    expect(notices(s1).length).toBeGreaterThan(0);
    const s2 = replan(deleteTask(s1, "t1"), [], now + 60_000);
    expect(notices(s2)).toHaveLength(0);
  });
});

describe("先の締切のタスクとあとから入る予定", () => {
  const task = (id: string, days: number) => ({ id, title: id, priority: 2 as const, durationMinutes: 120, deadline: jst(2026, 10, 1) + days * DAY_MS });

  it("締切の2週間前から置く。配置期間より先の締切でも期間の後ろの日に入り（警告なし）、4週間より先はまだ置かない", () => {
    const r = plan(baseInput(jst(2026, 10, 1, 8), { tasks: [task("t20", 20), task("t40", 40)] }));
    const t20 = r.blocks.filter((b) => b.refId === "t20");
    expect(t20.reduce((s, b) => s + (b.end - b.start) / MIN, 0)).toBe(120);
    expect(Math.min(...t20.map((b) => b.start))).toBeGreaterThanOrEqual(jst(2026, 10, 1) + 6 * DAY_MS);
    expect(r.blocks.some((b) => b.refId === "t40")).toBe(false);
    expect(r.shortfalls).toHaveLength(0);
  });

  it("固定したタスクの枠でも、始まる前に予定が重なったら動かす", () => {
    const first = plan(baseInput(jst(2026, 10, 1, 8), { tasks: [task("t", 5)] }));
    const b = first.blocks.find((x) => x.refId === "t")!;
    const pinned = first.blocks.map((x) => (x === b ? { ...x, pinned: true } : x));
    const ev: CalendarEvent = { id: "e", title: "面接", start: b.start, end: b.end };
    const again = plan(baseInput(jst(2026, 10, 1, 8), { tasks: [task("t", 5)], events: [ev], previousBlocks: pinned }));
    const moved = again.blocks.filter((x) => x.refId === "t");
    expect(moved.every((x) => x.end <= ev.start || x.start >= ev.end)).toBe(true);
    expect(moved.reduce((s, x) => s + (x.end - x.start) / MIN, 0)).toBe(120);
  });
});

describe("タスクの枠の最短", () => {
  it("30分より短い枠を作らない（もとが30分以内のタスクはそのまま。長いタスクの短い残りは30分にし、分けたあとに30分未満を残さない）", () => {
    const admin = { id: "a", name: "事務", mode: "gap" as const, defaultMinutes: 30, minChunkMinutes: 15, maxChunkMinutes: 60 };
    const r = plan(baseInput(jst(2026, 10, 1, 8), { tags: [admin], tasks: [
      { id: "s", title: "短い", priority: 2, tagId: "a", durationMinutes: 15, deadline: jst(2026, 10, 3) },
      { id: "l", title: "長い", priority: 2, tagId: "a", durationMinutes: 75, deadline: jst(2026, 10, 3) },
      { id: "r", title: "残り少し", priority: 2, tagId: "a", durationMinutes: 90, remainingMinutes: 15, deadline: jst(2026, 10, 3) },
    ] }));
    const lens = (id: string) => r.blocks.filter((b) => b.refId === id).map((b) => (b.end - b.start) / MIN);
    expect(lens("s")).toEqual([15]);
    expect(lens("l").every((m) => m >= 30)).toBe(true);
    expect(lens("l").reduce((a, b) => a + b, 0)).toBe(75);
    expect(lens("r")).toEqual([30]);
  });
});

describe("タスクの置き方の見直し（2026-10-01）", () => {
  const focus = { id: "f", name: "集中", mode: "focus" as const, defaultMinutes: 120, minChunkMinutes: 60, maxChunkMinutes: 120, restAfterMinutes: 20 };
  const task = (deadline: number) => ({ id: "t", title: "ES", priority: 2 as const, tagId: "f", durationMinutes: 120, deadline });

  it("夕方に出かける日は、身支度を出発の直前に置き、午前中から集中の作業を置ける", () => {
    const party: CalendarEvent = { id: "p", title: "飲み会", start: jst(2026, 10, 1, 18, 45), end: jst(2026, 10, 1, 21), location: "大学" };
    const r = plan(baseInput(jst(2026, 10, 1, 7), { events: [party], places: SAMPLE_PLACES, tags: [focus], tasks: [task(jst(2026, 10, 2))] }));
    expect(r.blocks.find((b) => b.refId === "prep")).toMatchObject({ end: party.start - 10 * MIN });
    const t = r.blocks.filter((b) => b.refId === "t");
    expect(t.length).toBeGreaterThan(0);
    expect(t[0].start).toBeLessThan(jst(2026, 10, 1, 13));
  });

  it("予定の多い日は、体力を答えるまで、最後の予定のあとに集中の作業を置かない", () => {
    const evs: CalendarEvent[] = [
      { id: "a", title: "面談", start: jst(2026, 10, 1, 9, 30), end: jst(2026, 10, 1, 12) },
      { id: "b", title: "面談", start: jst(2026, 10, 1, 13), end: jst(2026, 10, 1, 16) },
      { id: "c", title: "懇親会", start: jst(2026, 10, 1, 16, 30), end: jst(2026, 10, 1, 20) },
    ];
    const r = plan(baseInput(jst(2026, 10, 1, 7), { events: evs, tags: [focus], tasks: [task(jst(2026, 10, 3))] }));
    expect(r.dayPlans[0].eveningFrom).toBe(jst(2026, 10, 1, 20));
    expect(r.blocks.some((b) => b.refId === "t" && b.start >= jst(2026, 10, 1, 20) && b.start < jst(2026, 10, 2, 2))).toBe(false);
    const answered = plan(baseInput(jst(2026, 10, 1, 7), { events: evs, tags: [focus], tasks: [task(jst(2026, 10, 2))], eveningEnergy: { [jst(2026, 10, 1)]: "high" } }));
    expect(answered.blocks.some((b) => b.refId === "t" && b.start >= jst(2026, 10, 1, 20))).toBe(true);
  });

  it("行動ポイントが上限に近い日は避けて、軽い日へ回す", () => {
    const heavy: CalendarEvent = { id: "h", title: "重い予定", start: jst(2026, 10, 1, 13), end: jst(2026, 10, 1, 14), energyCost: 5 };
    const r = plan(baseInput(jst(2026, 10, 1, 7), { events: [heavy], tags: [focus], tasks: [task(jst(2026, 10, 4))] }));
    const t = r.blocks.filter((b) => b.refId === "t");
    expect(t.every((b) => b.start >= jst(2026, 10, 2))).toBe(true);
  });
});

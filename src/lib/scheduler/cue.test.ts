import { describe, expect, it } from "vitest";
import { plan } from "./planner";
import type { CalendarEvent, Habit, Place } from "./types";
import { baseInput, jst } from "./test-helpers";

const now = jst(2026, 10, 1, 6);
const day1 = jst(2026, 10, 1);
const lunch: Habit = {
  id: "lunch",
  name: "昼食",
  durationMinutes: 30,
  windowStart: 12 * 60,
  windowEnd: 13 * 60,
  frequency: { type: "daily" },
  skippable: false,
  meal: true,
};
const cued = (cue: Habit["cue"]): Habit => ({
  id: "c",
  name: "ストレッチ",
  durationMinutes: 5,
  windowStart: 0,
  windowEnd: 24 * 60,
  cue,
  frequency: { type: "daily" },
  skippable: true,
});
const on = (r: ReturnType<typeof plan>, id: string, dayStart: number) =>
  r.blocks.filter((b) => b.refId === id && b.start >= dayStart && b.start < dayStart + 24 * 3600_000).sort((a, b) => a.start - b.start);

describe("きっかけの場面", () => {
  it("食事のあとの習慣は、食事が終わった5分後に置く", () => {
    const r = plan(baseInput(now, { habits: [cued({ type: "habit", habitId: "lunch" }), lunch] }));
    const [meal] = on(r, "lunch", day1);
    const [b] = on(r, "c", day1);
    expect(b.start).toBe(meal.end + 5 * 60_000);
  });

  it("朝ルーティンのあとに置く", () => {
    const r = plan(baseInput(now, { habits: [cued({ type: "routine" })] }));
    const d = r.dayPlans.find((x) => x.dayStart === day1)!;
    expect(on(r, "c", day1)[0].start).toBe(d.wake + (15 + 5) * 60_000);
  });

  it("帰宅後の習慣は、外出のない日には置かない", () => {
    const univ: Place = { id: "u", name: "大学", keywords: [], travelMinutes: 30 };
    const ev: CalendarEvent = { id: "e1", title: "授業", start: jst(2026, 10, 1, 10), end: jst(2026, 10, 1, 17), location: "大学" };
    const r = plan(baseInput(now, { events: [ev], places: [univ], habits: [cued({ type: "home" })] }));
    // 17:30 に帰宅、30分休んで、5分後
    expect(on(r, "c", day1)[0].start).toBe(jst(2026, 10, 1, 18, 5));
    expect(on(r, "c", jst(2026, 10, 2))).toHaveLength(0);
    expect(r.skippedHabits.filter((s) => s.habitId === "c")).toHaveLength(0);
  });

  it("きっかけのあとが埋まっていれば、その日は置かない", () => {
    const busy: CalendarEvent = { id: "e2", title: "会議", start: jst(2026, 10, 1, 12, 30), end: jst(2026, 10, 1, 14) };
    const r = plan(baseInput(now, { events: [busy], habits: [cued({ type: "habit", habitId: "lunch" }), lunch] }));
    const [meal] = on(r, "lunch", day1);
    const b = on(r, "c", day1)[0];
    expect(!b || b.start <= meal.end + 35 * 60_000).toBe(true);
  });

  describe("家での運動（入浴の直前）", () => {
    const bath: Habit = { id: "bath", name: "入浴", durationMinutes: 30, windowStart: -150, windowEnd: -75, anchor: "bed", frequency: { type: "daily" }, skippable: false };
    const ex: Habit = {
      id: "ex",
      name: "家での運動",
      durationMinutes: 5,
      windowStart: 0,
      windowEnd: 24 * 60,
      cue: { type: "beforeHabit", habitId: "bath" },
      frequency: { type: "weekly", times: 3 },
      skippable: true,
      energyCost: 0.5,
    };
    const week = (r: ReturnType<typeof plan>) => r.blocks.filter((b) => b.refId === "ex" && b.start < jst(2026, 10, 8));

    it("週3回、入浴の5分前に終わるように置く", () => {
      const r = plan(baseInput(now, { habits: [ex, bath] }));
      const got = week(r);
      expect(got).toHaveLength(3);
      for (const b of got) {
        const bt = r.blocks.find((x) => x.refId === "bath" && x.start > b.start && x.start - b.start < 3600_000)!;
        expect(b.end).toBe(bt.start - 5 * 60_000);
      }
    });

    it("入浴の前が埋まっていれば、30分前までの空きに置き、それもなければその日は置かない", () => {
      // 1日目の入浴（22:00〜22:30 ごろ）の前を予定で埋める
      const r0 = plan(baseInput(now, { habits: [bath] }));
      const b1 = r0.blocks.find((x) => x.refId === "bath" && x.start < jst(2026, 10, 2, 6))!;
      const busy = { id: "e", title: "電話", start: b1.start - 3 * 3600_000, end: b1.start };
      const r = plan(baseInput(now, { events: [busy], habits: [{ ...ex, frequency: { type: "daily" } }, bath] }));
      const bt = r.blocks.find((x) => x.refId === "bath" && x.start < jst(2026, 10, 2, 6))!;
      const e1 = r.blocks.find((x) => x.refId === "ex" && x.start < jst(2026, 10, 2, 6));
      if (e1) expect(e1.end).toBeLessThanOrEqual(bt.start);
      if (e1) expect(bt.start - e1.end).toBeLessThanOrEqual(35 * 60_000);
    });
  });

  describe("朝と食事の並び", () => {
    const breakfast: Habit = { id: "bf", name: "朝食", durationMinutes: 15, windowStart: 0, windowEnd: 1440, cue: { type: "routine" }, frequency: { type: "daily" }, skippable: true, meal: true };
    const walk: Habit = {
      id: "walk",
      name: "散歩",
      durationMinutes: 20,
      windowStart: 0,
      windowEnd: 150,
      anchor: "wake",
      cue: { type: "habit", habitId: "bf", orElse: { type: "routine" } },
      frequency: { type: "daily" },
      skippable: true,
    };
    const lunch12: Habit = { ...lunch, windowStart: 11 * 60, windowEnd: 14 * 60 + 30 };
    const cook: Habit = { id: "cook", name: "自炊（昼）", durationMinutes: 30, windowStart: 0, windowEnd: 1440, cue: { type: "beforeHabit", habitId: "lunch" }, frequency: { type: "whenEnergy" }, skippable: true, energyCost: 2 };

    it("朝ルーティン → 朝食 → 散歩の順に、あいだを空けずに置く", () => {
      const r = plan(baseInput(now, { habits: [walk, lunch12, breakfast] }));
      const d = r.dayPlans.find((x) => x.dayStart === day1)!;
      const [bf] = on(r, "bf", day1);
      const [w] = on(r, "walk", day1);
      expect(bf.start).toBe(d.wake + 20 * 60_000);
      expect(w.start).toBe(bf.end + 5 * 60_000);
    });

    it("朝食のない日の散歩は、朝ルーティンのあと", () => {
      const r = plan(baseInput(now, { habits: [walk] }));
      const d = r.dayPlans.find((x) => x.dayStart === day1)!;
      expect(on(r, "walk", day1)[0].start).toBe(d.wake + 20 * 60_000);
    });

    it("昼食は朝食の始まりから3時間あける", () => {
      const r = plan(baseInput(now, { habits: [lunch12, breakfast] }));
      const [bf] = on(r, "bf", day1);
      const [l] = on(r, "lunch", day1);
      expect(l.start - bf.start).toBeGreaterThanOrEqual(3 * 3600_000);
    });

    it("自炊は昼食のちょうど5分前に終える", () => {
      const r = plan(baseInput(now, { habits: [lunch12, cook] }));
      const [c] = on(r, "cook", day1);
      const [l] = on(r, "lunch", day1);
      expect(c.end).toBe(l.start - 5 * 60_000);
    });
  });
});

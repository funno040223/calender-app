import { describe, expect, it } from "vitest";
import { plan } from "./planner";
import type { CalendarEvent, Habit, Place, Tag, Task } from "./types";
import { baseInput, jst } from "./test-helpers";

const now = jst(2026, 10, 1, 6);
const day1 = jst(2026, 10, 1);
const univ: Place = { id: "u", name: "大学", keywords: [], travelMinutes: 30 };
const intern: CalendarEvent = { id: "e1", title: "インターン", start: jst(2026, 10, 1, 10), end: jst(2026, 10, 1, 17), location: "大学" };
const focus: Tag = { id: "focus", name: "集中", mode: "focus", defaultMinutes: 60, minChunkMinutes: 60, maxChunkMinutes: 60 };
const admin: Tag = { id: "admin", name: "事務", mode: "gap", defaultMinutes: 30, minChunkMinutes: 15, maxChunkMinutes: 30 };
// 締切は翌日の夜。今夜に入れなくてもほかに空きはある
const tasks: Task[] = [
  { id: "f1", title: "集中の作業", durationMinutes: 60, priority: 3, tagId: "focus", deadline: jst(2026, 10, 2, 22) },
  { id: "a1", title: "事務1", durationMinutes: 30, priority: 3, tagId: "admin", deadline: jst(2026, 10, 2, 22) },
  { id: "a2", title: "事務2", durationMinutes: 30, priority: 3, tagId: "admin", deadline: jst(2026, 10, 2, 22) },
  { id: "a3", title: "事務3", durationMinutes: 30, priority: 3, tagId: "admin", deadline: jst(2026, 10, 2, 22) },
];
const input = (over = {}) => baseInput(now, { events: [intern], places: [univ], tags: [focus, admin], tasks, ...over });

describe("帰宅と夜の体力", () => {
  it("外出した日は、最後の外出から帰る時刻を出す", () => {
    const d = plan(input()).dayPlans.find((x) => x.dayStart === day1)!;
    expect(d.homeAt).toBe(jst(2026, 10, 1, 17, 30));
  });

  it("体力が少ない夜は、帰宅から就寝までタスクを入れない", () => {
    const r = plan(input({ eveningEnergy: { [day1]: "low" } }));
    const d = r.dayPlans.find((x) => x.dayStart === day1)!;
    const tonight = r.blocks.filter((b) => b.kind === "task" && b.start >= d.homeAt! && b.start < d.bed);
    expect(tonight).toEqual([]);
    expect(r.dayEnergy.find((e) => e.dayStart === day1)?.evening).toBe("low");
  });

  it("体力がふつうの夜は、事務系だけを合わせて60分まで", () => {
    const r = plan(input({ eveningEnergy: { [day1]: "normal" } }));
    const d = r.dayPlans.find((x) => x.dayStart === day1)!;
    const tonight = r.blocks.filter((b) => b.kind === "task" && b.start >= d.homeAt! && b.start < d.bed);
    expect(tonight.some((b) => b.refId === "f1")).toBe(false);
    expect(tonight.reduce((sum, b) => sum + (b.end - b.start) / 60_000, 0)).toBeLessThanOrEqual(60);
  });

  it("体力が少ない夜は回復の候補を出すが、16時以降の昼寝は出さない", () => {
    const recoveryOptions = [
      { name: "昼寝", durationMinutes: 30, energy: -1, latestStartMinuteOfDay: 16 * 60 },
      { name: "ゲーム", durationMinutes: 30, energy: -1.5 },
    ];
    const r = plan(input({ eveningEnergy: { [day1]: "low" }, recoveryOptions }));
    expect(r.dayEnergy.find((e) => e.dayStart === day1)?.suggestion?.name).toBe("ゲーム");
  });
});

describe("起床・就寝からの時間帯と雨の日", () => {
  const walk: Habit = {
    id: "walk", name: "散歩", durationMinutes: 20, windowStart: 0, windowEnd: 150, anchor: "wake",
    frequency: { type: "daily" }, skippable: true, rainAlternative: { title: "窓際で光＋家での運動", durationMinutes: 15 },
  };
  const bath: Habit = { id: "bath", name: "入浴", durationMinutes: 30, windowStart: -150, windowEnd: -75, anchor: "bed", frequency: { type: "daily" }, skippable: false };

  it("散歩は朝ルーティンのあと、入浴は就寝の75分前までに終える", () => {
    const r = plan(baseInput(now, { habits: [walk, bath] }));
    const d = r.dayPlans.find((x) => x.dayStart === day1)!;
    const w = r.blocks.find((b) => b.refId === "walk" && b.start < d.bed)!;
    const b = r.blocks.find((x) => x.refId === "bath" && x.start > d.wake && x.start < d.bed)!;
    expect(w.start).toBeGreaterThanOrEqual(d.wake);
    expect(w.start).toBeLessThan(d.wake + 150 * 60_000);
    expect(b.start).toBeGreaterThanOrEqual(d.bed - 150 * 60_000);
    expect(b.end).toBeLessThanOrEqual(d.bed - 75 * 60_000);
  });

  it("雨の日にした日は、散歩を家の中の代わりにする", () => {
    const r = plan(baseInput(now, { habits: [walk], rainyDays: [day1] }));
    const d = r.dayPlans.find((x) => x.dayStart === day1)!;
    const w = r.blocks.find((b) => b.refId === "walk" && b.start < d.bed)!;
    expect(w.title).toBe("窓際で光＋家での運動");
    expect(w.end - w.start).toBe(15 * 60_000);
  });
});

import { describe, expect, it } from "vitest";
import type { Habit } from "@/lib/scheduler";
import { jst } from "@/lib/scheduler/test-helpers";
import { MIN } from "./jst";
import { fromStoredV2, replan, sampleData, toData } from "./state";

/** 2026-10-12：習慣をやったかどうかの持ち方（やった日の控えは保存せず、組み直すたびに決める） */
const now = jst(2026, 10, 1, 12);
const laundry: Habit = { id: "laundry", name: "洗濯", skippable: true, track: true, durationMinutes: 30, windowStart: 10 * 60, windowEnd: 20 * 60, frequency: { type: "interval", minDays: 4, maxDays: 7 } };
const past = (h: Habit, start = now - 90 * MIN) => ({ kind: "habit" as const, refId: h.id, title: h.name, start, end: start + h.durationMinutes * MIN });
const data = (h: Habit, blocks = [past(h)]) => ({ ...sampleData(now), courses: [], tasks: [], events: [], habits: [h], blocks });
const laundryToday = (s: ReturnType<typeof replan>) => s.blocks.filter((b) => b.refId === laundry.id && b.start >= now && b.start < jst(2026, 10, 2));

describe("記録する間隔の習慣（洗濯）の過ぎた枠", () => {
  it("「やった」を押していない過ぎた枠は数えず、次を何日も先へ送らない（同じ日にもう1つは置かない）", () => {
    const next = (s: ReturnType<typeof replan>) => s.blocks.filter((b) => b.refId === laundry.id && b.start >= now).sort((a, b) => a.start - b.start);
    const state = replan(data(laundry), [], now);
    expect(laundryToday(state)).toHaveLength(0);
    // 以前は過ぎた枠をやったとみなして4日あとから置いていた
    expect(next(state)[0].start).toBeLessThan(jst(2026, 10, 5));
    // 組み直しを重ねても同じ
    const again = replan(toData(state), [], now + 5 * MIN);
    expect(next(again)[0].start).toBe(next(state)[0].start);
  });
  it("「やった」を押せば数え、次は間隔をあけて置く", () => {
    const state = replan({ ...data(laundry), habitLogs: { "2026-10-01": { [laundry.id]: "done" } } }, [], now);
    expect(laundryToday(state)).toHaveLength(0);
    expect(state.habitDone.lastDone[laundry.id]).toBe(jst(2026, 10, 1));
  });
});

describe("やった日の控えは保存しない", () => {
  it("以前の行の habitLastDone・habitDoneDays は保存せず、始まった時刻として引き継ぐ（やった日はその日の正午）", () => {
    const row = { ...toData(sampleData(now)), habitLastDone: { x: jst(2026, 9, 29, 10) }, habitDoneDays: { y: [jst(2026, 9, 29)] } } as Record<string, unknown>;
    delete row.habitStarts;
    const d = fromStoredV2(row, now)!;
    expect(d.habitStarts).toEqual({ x: [jst(2026, 9, 29, 10)], y: [jst(2026, 9, 29, 12)] });
    const saved = toData(d) as unknown as Record<string, unknown>;
    expect(saved.habitLastDone).toBeUndefined();
    expect(saved.habitDoneDays).toBeUndefined();
    expect(d.migrations).toContain("2026-10-12-habit-done-derived");
  });

  it("以前の行の habitDoneDays（今週やった日）も、その日の分として引き継ぎ、週の回数を数える", () => {
    const at = jst(2026, 10, 7, 8);
    const plain: Habit = { ...laundry, id: "ex", name: "運動", track: false, frequency: { type: "weekly", times: 3 } };
    const row = { ...toData({ ...sampleData(at), habits: [plain] }), habitDoneDays: { ex: [jst(2026, 10, 5), jst(2026, 10, 6)] } } as Record<string, unknown>;
    delete row.habitStarts;
    const state = replan({ ...fromStoredV2(row, at)!, courses: [], tasks: [], events: [] }, [], at);
    expect(state.habitDone.weekDays.ex).toEqual([jst(2026, 10, 5), jst(2026, 10, 6)]);
  });

  it("寝ていた間の枠は、組み直しの睡眠（直近2日）から外れても、眠りの記録から寝ていたと分かり、やったに戻らない", () => {
    const at = jst(2026, 10, 16, 12);
    const plain: Habit = { ...laundry, track: false, windowStart: 0, windowEnd: 24 * 60 };
    const started = jst(2026, 10, 13, 23, 30);
    const night = { id: "2026-10-14", date: "2026-10-14", bed: { at: jst(2026, 10, 13, 23), source: "button" as const }, up: { at: jst(2026, 10, 14, 8), source: "button" as const } };
    const d = { ...sampleData(at), courses: [], tasks: [], events: [], blocks: [], habits: [plain], habitStarts: { [plain.id]: [started] } };
    expect(replan(d, [], at).habitDone.lastDone[plain.id]).toBe(started);
    expect(replan({ ...d, sleepLogs: [night] }, [], at).habitDone.lastDone[plain.id]).toBeUndefined();
    // ヘルスケアの睡眠だけの夜も同じ
    const health = { "2026-10-14": { start: jst(2026, 10, 13, 23, 10), end: jst(2026, 10, 14, 7), minutes: 460 } };
    expect(replan({ ...d, healthSleep: health }, [], at).habitDone.lastDone[plain.id]).toBeUndefined();
  });

  it("記録しない週の習慣は、始まった枠を数え、あとで「できなかった」にした枠は数え直す", () => {
    const plain: Habit = { ...laundry, id: "ex", name: "運動", track: false, frequency: { type: "weekly", times: 3 } };
    const block = past(plain, jst(2026, 9, 30, 15));
    const first = replan(data(plain, [block]), [], now);
    expect(first.habitStarts[plain.id]).toEqual([block.start]);
    expect(first.habitDone.weekDays[plain.id]).toEqual([jst(2026, 9, 30)]);
    const missed = replan({ ...toData(first), habitMisses: { "2026-09-30": [`${plain.id}:${block.start}`] } }, [], now);
    expect(missed.habitDone.weekDays[plain.id]).toEqual([]);
  });

  it("「記録する」に変えた習慣は、前に始まった枠を数えない", () => {
    const plain = { ...laundry, track: false };
    const first = replan(data(plain), [], now);
    expect(first.habitDone.lastDone[plain.id]).toBe(past(plain).start);
    const tracked = replan({ ...toData(first), habits: [laundry] }, [], now);
    expect(tracked.habitDone.lastDone[laundry.id]).toBeUndefined();
    expect(tracked.habitStarts[laundry.id]).toBeUndefined();
  });
});

describe("夜中の枠と「今日は飛ばす」", () => {
  it("0時を過ぎた枠も、前の日（起きている日）に飛ばしたなら飛ばしたとみなす", () => {
    const plain: Habit = { ...laundry, track: false, windowStart: 0, windowEnd: 24 * 60 };
    const late = past(plain, jst(2026, 10, 1, 1));
    const at = jst(2026, 10, 1, 2);
    const state = replan({ ...data(plain, [late]), habitSkips: { "2026-09-30": [plain.id] } }, [], at);
    expect(state.habitDone.lastDone[plain.id]).toBeUndefined();
    expect(state.blocks.some((b) => b.refId === plain.id && b.start === late.start)).toBe(false);
  });
});

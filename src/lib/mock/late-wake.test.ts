import { describe, expect, it } from "vitest";
import { jst } from "@/lib/scheduler/test-helpers";
import type { Block } from "@/lib/scheduler";
import { DAY_MS, MIN } from "./jst";
import { dateKeyOf } from "./model";
import type { Habit } from "@/lib/scheduler";
import { computeDayPlans } from "@/lib/scheduler";
import { nightOf, plannedOf, recordUp } from "./night";
import { resetRhythm } from "./recovery";
import { pendingWork } from "./progress";
import { anchorOf, missHabitBlock, replan, sampleData, toData, type MockState } from "./state";

/**
 * 段階2：起きた時刻が遅れて分かった（記録した・前の時刻で入れた）日は、実際の起床から朝を組み直す。
 * 見本のデータ、予定の起床 9:00 の日
 */
const day = jst(2026, 10, 13);
const key = dateKeyOf(day);

/** 7時から15分ごとに組み直してきた（起きた記録はまだない）画面の状態 */
function before(until: number): MockState {
  let s = replan(sampleData(jst(2026, 10, 13, 7)), [], jst(2026, 10, 13, 7));
  for (let t = jst(2026, 10, 13, 8); t < until; t += 15 * MIN) s = replan(toData(s), [], t);
  return s;
}
/** 画面で「いつ起きた？」に答えたとき（前の計画を持ったまま組み直す） */
function record(wake: number, at: number): MockState {
  const s = before(at);
  return replan({ ...s, sleepLogs: recordUp(s.sleepLogs, key, wake, "picked", plannedOf(s.result, key).wake, at) }, [], at);
}
const today = (s: MockState) =>
  s.result.blocks.filter((b) => b.start >= day && b.start < day + DAY_MS && !b.refId.startsWith("sleep:")).sort((a, b) => a.start - b.start);
const habitOf = (s: MockState, b: Block) => s.habits.find((h) => h.id === b.refId);

/** 共通の確かめ：朝ルーティンが実際の起床から・重ならない・同じ習慣を2回置かない・過ぎた時間には朝ルーティンと記録する習慣だけ */
function check(s: MockState, wake: number, at: number) {
  const blocks = today(s);
  expect(s.result.dayPlans.find((d) => d.dayStart === day)!.wake).toBe(wake);
  expect(blocks.find((b) => b.refId === "routine")?.start).toBe(wake);
  for (let i = 1; i < blocks.length; i++) expect(blocks[i].start).toBeGreaterThanOrEqual(blocks[i - 1].end);
  const titles = blocks.filter((b) => b.kind === "habit").map((b) => b.title);
  expect(new Set(titles).size).toBe(titles.length);
  for (const b of blocks.filter((x) => x.start < at)) expect(b.kind === "routine" || (b.kind === "habit" && habitOf(s, b)?.track)).toBe(true);
  // 待ち時間のある習慣は、1つ目（回す）のあとに2つ目（干す）
  const wash = blocks.find((b) => b.title === "洗濯を回す");
  const hang = blocks.find((b) => b.title.startsWith("洗濯物を干す"));
  expect(!!wash).toBe(!!hang);
  if (wash && hang) expect(hang.start).toBeGreaterThan(wash.start);
  return blocks;
}
const at = (b: Block[] , title: string) => b.find((x) => x.title === title);

describe("起きた時刻が遅れて分かった日", () => {
  it("A：10:30 起床（予定より90分遅れ）を 10:35 に記録。朝ルーティンと重なる前の計画の枠を外し、朝食・散歩をそのあとへ", () => {
    const s = record(jst(2026, 10, 13, 10, 30), jst(2026, 10, 13, 10, 35));
    const b = check(s, jst(2026, 10, 13, 10, 30), jst(2026, 10, 13, 10, 35));
    expect(s.anchoredWakes[key]).toBe(jst(2026, 10, 13, 10, 30));
    expect(at(b, "朝食")!.start).toBe(jst(2026, 10, 13, 10, 45));
    expect(at(b, "散歩")!.start).toBeGreaterThanOrEqual(at(b, "朝食")!.end);
    expect(at(b, "昼食")!.start - at(b, "朝食")!.start).toBeGreaterThanOrEqual(3 * 60 * MIN);
  });

  it("B：10:30 起床を 12:00 に記録。過ぎた時間に朝ルーティン・散歩を置き（確かめる記録として）、前の計画の片付けなどは外す。朝食は昼食が入らなくなるので置かない", () => {
    const rec = jst(2026, 10, 13, 12);
    const s = record(jst(2026, 10, 13, 10, 30), rec);
    const b = check(s, jst(2026, 10, 13, 10, 30), rec);
    expect(at(b, "朝食")).toBeUndefined();
    expect(at(b, "散歩")!.start).toBe(jst(2026, 10, 13, 10, 45));
    expect(b.some((x) => x.title === "片付け" && x.start < rec)).toBe(false);
    // 組み直しを重ねても同じ（同じ起床では組み直し直さない）
    const later = replan(s, [], rec + 5 * MIN);
    expect(today(later).filter((x) => x.start < rec).map((x) => [x.title, x.start])).toEqual(b.filter((x) => x.start < rec && x.refId !== "routine").map((x) => [x.title, x.start]));
    // 過ぎた散歩を「できなかった」にしたら、過ぎた時間へは置き直さない
    const missed = replan(missHabitBlock(later, at(b, "散歩")!), [], rec + 10 * MIN);
    expect(today(missed).some((x) => x.title === "散歩" && x.start < rec)).toBe(false);
  });

  it("C：11:00 起床を 11:00 に記録。前の計画の干す（回すが寝ていた間）を外す。朝食は昼食が入らなくなるので置かない", () => {
    const rec = jst(2026, 10, 13, 11);
    const s = record(rec, rec);
    const b = check(s, rec, rec);
    expect(at(b, "朝食")).toBeUndefined();
    expect(at(b, "昼食")).toBeDefined();
    expect(at(b, "散歩")!.start).toBeGreaterThanOrEqual(b.find((x) => x.refId === "routine")!.end);
  });

  it("40分のずれ（9:40 起床を 9:45 に記録）は組み直さないが、朝ルーティンと重なる前の計画の枠は残さない", () => {
    const rec = jst(2026, 10, 13, 9, 45);
    const s = record(jst(2026, 10, 13, 9, 40), rec);
    expect(s.anchoredWakes[key]).toBeUndefined();
    const b = today(s);
    const routine = b.find((x) => x.refId === "routine")!;
    expect(routine.start).toBe(jst(2026, 10, 13, 9, 40));
    for (const x of b) if (x !== routine) expect(x.end <= routine.start || x.start >= routine.end).toBe(true);
    for (let i = 1; i < b.length; i++) expect(b[i].start).toBeGreaterThanOrEqual(b[i - 1].end);
  });

  it("予定どおりの朝（予定から30分以内に記録）は、これまでと同じ並び", () => {
    const rec = jst(2026, 10, 13, 9, 12);
    const s = before(rec);
    const data = { ...s, sleepLogs: recordUp(s.sleepLogs, key, jst(2026, 10, 13, 9, 10), "picked", plannedOf(s.result, key).wake, rec) };
    const anchored = replan(data, [], rec);
    // 前の計画を渡さない（＝組み直し直さない）ときと同じ
    const plain = replan(toData(data), [], rec);
    expect(today(anchored).map((x) => [x.title, x.start, x.end])).toEqual(today(plain).map((x) => [x.title, x.start, x.end]));
  });
});

describe("組み直すのは1回だけ・続いている枠は外さない", () => {
  const relayoutAt = (s: MockState, t: number) => !!anchorOf(s, day, t, () => day, computeDayPlans(day, 1, [], s.places, s.settings)[0]?.wake)?.relayout;

  it("「今から寝る」3:00〜7:00 のあと 13:30 に「起きた」：計画の起床も 13:30 になり、組み直すのはそのときだけ", () => {
    const s0 = replan(sampleData(jst(2026, 10, 13, 2)), [], jst(2026, 10, 13, 2));
    const s1 = replan(resetRhythm(s0, { id: "r", mode: "sleep", start: jst(2026, 10, 13, 3), end: jst(2026, 10, 13, 7) }, jst(2026, 10, 13, 3), { wake: jst(2026, 10, 13, 7) }), [], jst(2026, 10, 13, 3));
    const t = jst(2026, 10, 13, 13, 30);
    const s2 = replan({ ...s1, sleepLogs: recordUp(s1.sleepLogs, key, t, "button", plannedOf(s1.result, key).wake, t) }, [], t);
    expect(s2.result.dayPlans.find((d) => d.dayStart === day)!.wake).toBe(t);
    expect(s2.anchoredWakes[key]).toBe(t);
    const s3 = replan(s2, [], jst(2026, 10, 13, 14));
    expect(relayoutAt(s3, jst(2026, 10, 13, 15))).toBe(false);
    // 読み込み直し（前の計画なし）でも、残した起床で組み直さない
    expect(relayoutAt(replan(toData(s3), [], jst(2026, 10, 13, 15)), jst(2026, 10, 13, 15))).toBe(false);
  });

  it("予定どおりの朝（朝ルーティンの最初のチェック 9:02、予定 9:00）は組み直さない", () => {
    const s = before(jst(2026, 10, 13, 9, 2));
    const v = { ...s, wakeLogs: [...s.wakeLogs.filter((l) => l.date !== key), { date: key, doneStepIds: ["x"], routineStartedAt: jst(2026, 10, 13, 9, 2) }] };
    expect(nightOf(v, key).up?.at).toBe(jst(2026, 10, 13, 9, 2));
    expect(relayoutAt(v, jst(2026, 10, 13, 9, 2))).toBe(false);
  });

  it("起床 7:00 を 11:00 に入れても、作業の枠は外さず、進み具合で聞く（今も続いている枠も、今までに終わった枠も。FR-S2）", () => {
    const rec = jst(2026, 10, 13, 11);
    const s = before(rec);
    const withTask = (b: Block) => {
      const prev = replan({ ...s, blocks: [...s.blocks.filter((x) => x.end <= b.start || x.start >= b.end), b] }, [], rec - MIN);
      expect(prev.taskBlockLog[`${b.refId}:${b.start}`]).toBeDefined();
      return replan({ ...prev, sleepLogs: recordUp(prev.sleepLogs, key, jst(2026, 10, 13, 7), "picked", plannedOf(prev.result, key).wake, rec) }, [], rec);
    };
    const running = { kind: "task" as const, refId: "task-sample-mail", title: "メール返信", start: jst(2026, 10, 13, 10, 30), end: jst(2026, 10, 13, 11, 30) };
    const r1 = withTask(running);
    expect(r1.result.blocks).toContainEqual(expect.objectContaining({ refId: running.refId, start: running.start, end: running.end }));
    expect(r1.taskBlockLog[`${running.refId}:${running.start}`]).toBeDefined();
    const ended = { ...running, start: jst(2026, 10, 13, 10), end: rec };
    const r2 = withTask(ended);
    expect(r2.anchoredWakes[key]).toBe(jst(2026, 10, 13, 7));
    // 終わった作業の枠は、計画からは外れても（これまでどおり）、記録に残って「作業の進み具合」で聞く
    expect(r2.taskBlockLog[`${ended.refId}:${ended.start}`]).toBeDefined();
    expect(pendingWork(r2, rec).some((w) => w.entries.some(([k]) => k === `${ended.refId}:${ended.start}`))).toBe(true);
  });

  it("組み直しで外した記録しない習慣は、前の組み直しで残した始まった時刻も消し、やったに数えない", () => {
    const rec = jst(2026, 10, 13, 11);
    const plain: Habit = { id: "plain", name: "ストレッチ", durationMinutes: 20, windowStart: 10 * 60, windowEnd: 20 * 60, skippable: true, frequency: { type: "interval", minDays: 2, maxDays: 4 } };
    const block = { kind: "habit" as const, refId: plain.id, title: plain.name, start: jst(2026, 10, 13, 10), end: jst(2026, 10, 13, 10, 20) };
    const base = { ...sampleData(rec), courses: [], tasks: [], events: [], habits: [plain], blocks: [block], habitStarts: { [plain.id]: [block.start] } };
    expect(replan(base, [], rec).habitDone.lastDone[plain.id]).toBe(block.start);
    const r = replan({ ...base, sleepLogs: recordUp([], key, jst(2026, 10, 13, 7, 30), "picked", jst(2026, 10, 13, 9), rec) }, [], rec);
    expect(r.habitStarts[plain.id] ?? []).toEqual([]);
    expect(r.habitDone.lastDone[plain.id]).toBeUndefined();
  });

  it("前の日に始めた洗濯の干す（1つ目が今日の計画にない）は外さない", () => {
    const at = jst(2026, 10, 13, 10);
    const laundry = sampleData(at).habits.find((h) => h.id === "habit-laundry")!;
    const hang = { kind: "habit" as const, refId: laundry.id, title: laundry.finish!.title, start: jst(2026, 10, 13, 9, 30), end: jst(2026, 10, 13, 10, 30) };
    const r = replan({ ...sampleData(at), courses: [], tasks: [], events: [], habits: [laundry], blocks: [hang] }, [], at);
    expect(r.result.blocks).toContainEqual(expect.objectContaining({ title: hang.title, start: hang.start }));
  });
});

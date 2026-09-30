import { describe, expect, it } from "vitest";
import { plan, estimateMinutes, type Block } from "@/lib/scheduler";
import { baseInput, jst } from "@/lib/scheduler/test-helpers";
import { buildNotices } from "@/lib/notify/build";
import { MIN, DAY_MS } from "./jst";
import { confirmWork, pendingWork } from "./progress";
import { freeNowMinutes, resetRhythm, resetConflicts, startHabitNow, startWorkNow, workNowChoices, workNowGap, workNowHabits } from "./recovery";
import { fromStoredV2, replan, sampleData, toData } from "./state";

const now = jst(2026, 10, 1, 12);
const task = { id: "task", title: "レポート", durationMinutes: 180, priority: 2 as const };
const block: Block = { kind: "task", refId: task.id, title: task.title, start: now - 60 * MIN, end: now };
const key = `${task.id}:${block.start}`;
function data() {
  const d = sampleData(now);
  return { ...d, settings: { ...d.settings, routineMinutes: 0, minSlackMinutesPerDay: 0 }, tasks: [task], courses: [], habits: [], events: [], avoidWindows: [], blocks: [block] };
}

describe("明示的な進捗確認", () => {
  it("翌日も未確認を残し、回答前は残りを減らさない", () => {
    const state = replan(data(), [], now + DAY_MS);
    expect(estimateMinutes(state.tasks[0], undefined)).toBe(180);
    expect(pendingWork(state, now + DAY_MS)[0].expected).toBe(120);
  });
  it("予定どおりの回答だけで一度差し引く", () => {
    const result = confirmWork(data(), task.id, [key], "planned", now);
    expect(result.tasks[0].remainingMinutes).toBe(120);
    expect(confirmWork(result, task.id, [key], "planned", now + MIN).tasks[0].remainingMinutes).toBe(120);
  });
  it("できなかった場合は進捗も報酬も増えない", () => {
    const result = confirmWork(data(), task.id, [key], "none", now);
    expect(result.tasks[0].remainingMinutes).toBe(180);
    expect(result.taskBlockLog[key].doneAt).toBeUndefined();
    expect(pendingWork(result, now)).toHaveLength(0);
  });
  it("想定より多い残り時間と、少ない残り時間を分単位で指定できる", () => {
    expect(confirmWork(data(), task.id, [key], "partial", now, 210).tasks[0].remainingMinutes).toBe(210);
    expect(confirmWork(data(), task.id, [key], "partial", now, 95).tasks[0].remainingMinutes).toBe(95);
  });
  it("残り0で完了、未来の枠は回答に含めない", () => {
    expect(confirmWork(data(), task.id, [key], "partial", now, 0).doneTasks).toHaveLength(1);
    expect(confirmWork(data(), task.id, [key], "done", now - MIN).doneTasks).toHaveLength(0);
  });
  it("旧版の差し引き済み記録は二重に差し引かない", () => {
    const d = { ...data(), tasks: [{ ...task, remainingMinutes: 120 }], taskBlockLog: { [key]: { ...block, counted: true } } };
    expect(pendingWork(d, now)).toHaveLength(0);
    expect(confirmWork(d, task.id, [key], "planned", now).tasks[0].remainingMinutes).toBe(120);
  });
});

describe("生活リズムの立て直し", () => {
  it("徹夜後の睡眠をカレンダーに入れ、その間に自動枠や通知を置かない", () => {
    const r = { id: "sleep", mode: "sleep" as const, start: now, end: now + 7 * 60 * MIN };
    const state = replan(resetRhythm(data(), r, now), [], now);
    expect(state.result.dayPlans[0].wake).toBe(r.end);
    expect(state.blocks.some((b) => b.refId === "sleep:sleep")).toBe(true);
    expect(state.blocks.filter((b) => b.kind !== "routine" && b.start < r.end && b.end > r.start)).toHaveLength(0);
    const notices = buildNotices({ now, result: state.result, events: [], places: [], settings: state.settings });
    expect(notices.filter((n) => n.at >= r.start && n.at < r.end)).toHaveLength(0);
    expect(fromStoredV2(toData(state), now)?.rhythmResets).toEqual([r]);
  });
  it("寝坊した日の食事を起床後に動かす", () => {
    const r = { id: "late", mode: "woke" as const, start: jst(2026, 10, 1, 7), end: jst(2026, 10, 1, 14) };
    const state = replan(resetRhythm({ ...data(), habits: [{ id: "lunch", name: "昼食", durationMinutes: 30, windowStart: 720, windowEnd: 870, meal: true, skippable: false, frequency: { type: "daily" as const } }] }, r, r.end), [], r.end);
    const lunch = state.blocks.find((b) => b.refId === "lunch");
    expect(lunch).toBeDefined();
    expect(lunch!.start).toBeGreaterThanOrEqual(r.end);
    expect(lunch!.end).toBeLessThanOrEqual(jst(2026, 10, 1, 14, 30));
  });
  it("固定予定と固定枠は維持して衝突を報告する", () => {
    const event = { id: "meeting", title: "約束", start: now + MIN, end: now + 60 * MIN, atHome: true };
    const d = { ...data(), events: [event], blocks: [{ ...block, start: now + 90 * MIN, end: now + 120 * MIN, pinned: true }] };
    const r = { id: "sleep", mode: "sleep" as const, start: now, end: now + 7 * 60 * MIN };
    const state = replan(d, [], now);
    expect(resetConflicts(state, r).map((c) => c.title)).toEqual(["約束", "レポート"]);
    const next = replan(resetRhythm(state, r, now), [], now);
    expect(next.events).toEqual([event]);
    expect(next.blocks.some((b) => b.pinned)).toBe(true);
  });
  it("睡眠中に過ぎた自動枠は未実行、睡眠前の枠は未確認にする", () => {
    const r = { id: "sleep", mode: "woke" as const, start: now - 2 * 60 * MIN, end: now };
    const d = resetRhythm(data(), r, now);
    expect(d.taskBlockLog[key].outcome).toBe("none");
    expect(estimateMinutes(d.tasks[0], undefined)).toBe(180);
  });
  it("疲れた日の自動タスクは休止し、本人が選んだ分だけ追加できる", () => {
    const r = { id: "tired", mode: "tired" as const, start: now, end: now + 8 * 60 * MIN };
    const state = replan(resetRhythm(data(), r, now), [], now);
    expect(state.blocks.filter((b) => b.kind === "task" && b.start < r.end)).toHaveLength(0);
    expect(workNowChoices(state, now, 30)[0].minutes).toBe(30);
    const next = replan(startWorkNow(state, task.id, 30, now), [], now);
    expect(next.blocks.filter((b) => b.kind === "task" && b.start < r.end)).toEqual([expect.objectContaining({ start: now, end: now + 30 * MIN, pinned: true })]);
    expect(estimateMinutes(next.tasks[0], undefined)).toBe(180);
  });
  it("選んだ時間が固定予定に重なるなら追加しない（自分で選んだので、作業のあとの休憩は数えない）", () => {
    const state = replan({ ...data(), blocks: [], events: [{ id: "meeting", title: "約束", start: now + 35 * MIN, end: now + 60 * MIN, atHome: true }] }, [], now);
    expect(workNowChoices(state, now, 30)[0].minutes).toBe(30);
    expect(workNowChoices(state, now, 40)).toHaveLength(0);
    expect(startWorkNow(state, task.id, 40, now)).toBe(state);
  });
  it("帰宅後の休憩の間でも、今から作業できる。最初の分数は次の予定・習慣まで", () => {
    const home = { id: "out", title: "外出", start: now - 90 * MIN, end: now - 10 * MIN, location: "大学" };
    const bath = { id: "bath", name: "入浴", durationMinutes: 30, windowStart: 13 * 60, windowEnd: 14 * 60, frequency: { type: "daily" as const }, skippable: false };
    const state = replan({ ...data(), blocks: [], events: [home], habits: [bath] }, [], now);
    const gap = workNowGap(state, now)!;
    expect(gap.start).toBe(now);
    expect(gap.end).toBe(jst(2026, 10, 1, 13));
    expect(freeNowMinutes(gap, now)).toBe(60);
    expect(workNowChoices(state, now, 60)[0].minutes).toBe(60);
  });
  it("5分だけ追加しても予定の総量を15分単位に水増ししない", () => {
    const state = replan(resetRhythm(data(), { id: "rest", mode: "tired", start: now, end: now + 60 * MIN }, now), [], now);
    const next = replan(startWorkNow(state, task.id, 5, now), [], now);
    expect(next.blocks.filter((b) => b.kind === "task").reduce((sum, b) => sum + (b.end - b.start) / MIN, 0)).toBe(180);
  });
  it("日付をまたいだ後も睡眠の終わりまでタスクを入れない", () => {
    const start = jst(2026, 10, 1, 23);
    const end = jst(2026, 10, 2, 10);
    const d = resetRhythm({ ...data(), blocks: [] }, { id: "overnight", mode: "sleep", start, end }, start);
    const state = replan(d, [], jst(2026, 10, 2, 8));
    expect(state.result.dayPlans[0].wake).toBe(end);
    expect(state.blocks.filter((b) => b.kind === "task" && b.start < end)).toHaveLength(0);
  });
  it("再起動で枠が消えていても、睡眠中の未確認記録を未実行にできる", () => {
    const d = { ...data(), blocks: [], taskBlockLog: { [key]: { title: block.title, start: block.start, end: block.end } } };
    const state = resetRhythm(d, { id: "late", mode: "woke", start: now - 120 * MIN, end: now }, now);
    expect(state.taskBlockLog[key].outcome).toBe("none");
    expect(pendingWork(state, now)).toHaveLength(0);
  });
});

describe("配置の予測しやすさ", () => {
  it("2週間より先の締切は待機する", () => {
    const result = plan(baseInput(now, { tasks: [{ ...task, deadline: now + 30 * DAY_MS }] }));
    expect(result.blocks.filter((b) => b.kind === "task")).toHaveLength(0);
  });
  it("30分以内の枠は維持するが、新しい予定との衝突では動かす", () => {
    const near = { ...block, start: now + 15 * MIN, end: now + 75 * MIN };
    const input = baseInput(now, { tasks: [task], previousBlocks: [near] });
    expect(plan(input).blocks).toContainEqual(near);
    const result = plan({ ...input, events: [{ id: "new", title: "急用", start: now + 30 * MIN, end: now + 60 * MIN, atHome: true }] });
    expect(result.blocks).not.toContainEqual(near);
    expect(result.movedBlocks).toContainEqual(near);
  });
});

describe("今から何分できる？の最初の分数", () => {
  it("今からの時間を5分刻みで。作業できる時間でなければなし", () => {
    const gap = { start: jst(2026, 10, 1, 22, 33), end: jst(2026, 10, 1, 23, 30) };
    expect(freeNowMinutes(gap, jst(2026, 10, 1, 22, 33))).toBe(55);
    expect(freeNowMinutes(gap, jst(2026, 10, 1, 23, 27))).toBeUndefined();
    expect(freeNowMinutes(undefined, jst(2026, 10, 1, 21))).toBeUndefined();
    expect(freeNowMinutes({ start: 0, end: jst(2026, 10, 2) }, jst(2026, 10, 1, 12))).toBe(180);
  });
});

describe("今から何する？の習慣", () => {
  it("散歩や自己成長を候補に出し、始めたら今日のあとの枠は外れる。食事・入浴・今日始めたものは出さない", () => {
    const walk = { id: "walk", name: "散歩", durationMinutes: 20, windowStart: 16 * 60, windowEnd: 18 * 60, frequency: { type: "daily" as const }, skippable: true, rainAlternative: { title: "光を浴びる", durationMinutes: 10 } };
    const lunch = { id: "lunch", name: "昼食", durationMinutes: 30, windowStart: 12 * 60, windowEnd: 14 * 60, frequency: { type: "daily" as const }, skippable: false, meal: true };
    const bath = { id: "bath", name: "入浴", durationMinutes: 30, windowStart: -150, windowEnd: -75, anchor: "bed" as const, frequency: { type: "daily" as const }, skippable: false };
    const t = jst(2026, 10, 1, 15);
    const state = replan({ ...data(), blocks: [], tasks: [], habits: [walk, lunch, bath] }, [], t);
    expect(workNowHabits(state, t, 30).map((c) => [c.habit.id, c.minutes])).toEqual([["walk", 20]]);
    const next = replan(startHabitNow(state, "walk", 30, t), [], t);
    const walks = next.blocks.filter((b) => b.refId === "walk" && b.start < jst(2026, 10, 2));
    expect(walks).toEqual([expect.objectContaining({ start: t, end: t + 20 * MIN, pinned: true })]);
    expect(workNowHabits(next, t + 30 * MIN, 30)).toHaveLength(0);
    const rainy = replan({ ...state, rainyDays: ["2026-10-01"] }, [], t);
    expect(workNowHabits(rainy, t, 30).map((c) => [c.title, c.minutes])).toEqual([["光を浴びる", 10]]);
  });
});

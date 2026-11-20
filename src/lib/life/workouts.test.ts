import { describe, expect, it } from "vitest";
import { defaultExercisePlan } from "./exercisePlan";
import type { Exercise, ExercisePlan } from "./model";
import { validateLifeEvent } from "./validation";
import {
  STAGES,
  STRENGTH_MOVES,
  addShoulder,
  addWalk,
  levelOf,
  levelUpReady,
  mondayOf,
  sessionOf,
  stageCheck,
  stageOf,
  walkMinutesBetween,
  weekSummaries,
  withLevel,
  withStage,
} from "./workouts";

const plan = (extra: Partial<ExercisePlan> = {}): ExercisePlan => ({ ...defaultExercisePlan("2026-11-02"), ...extra });
const strength = (date: string, extra: Partial<Exercise> = {}): Exercise => ({
  date,
  roundId: "strength-" + date,
  variant: "normal",
  activity: "strength",
  ...extra,
});
const event = (kind: string, payload: unknown) => ({
  kind,
  id: crypto.randomUUID(),
  schemaVersion: 1,
  deviceId: crypto.randomUUID(),
  occurredAt: null,
  recordedAt: "2026-11-21T02:00:00.000Z",
  payload,
});

describe("プログラムの中身", () => {
  it("どの種目も段階ごとに回数か秒があり、やり方の手順がある", () => {
    for (const m of STRENGTH_MOVES) {
      expect(m.levels.length).toBeGreaterThanOrEqual(3);
      for (const l of m.levels) {
        expect(!!l.reps !== !!l.seconds).toBe(true);
        expect(l.how.length).toBeGreaterThan(0);
      }
    }
    // 腕立ては 壁 → 机 → 低い台 → ひざつき → 床
    expect(STRENGTH_MOVES.find((m) => m.id === "push")!.levels.map((l) => l.name)).toEqual([
      "壁腕立て",
      "机で腕立て",
      "低い台で腕立て",
      "ひざつき腕立て",
      "腕立て伏せ",
    ]);
  });

  it("段階は週の回数と分を少しずつ増やし、有酸素は WHO の週150分以上まで届く", () => {
    for (let i = 1; i < STAGES.length; i++) {
      expect(STAGES[i].minutes).toBeGreaterThanOrEqual(STAGES[i - 1].minutes);
      expect(STAGES[i].walkMinutes).toBeGreaterThan(STAGES[i - 1].walkMinutes);
    }
    expect(STAGES.at(-1)!.walkMinutes).toBeGreaterThanOrEqual(150);
    expect(Math.min(...STAGES.map((s) => s.weeklyTimes))).toBeGreaterThanOrEqual(2);
  });

  it("今日のメニュー：ふつうは5種目を段階のセット数で、短めは腕立てとスクワットを1セット", () => {
    const p = withStage(plan(), STAGES[1], "2026-11-20");
    const normal = sessionOf(p, "normal");
    expect(normal.filter((i) => i.level).map((i) => i.id)).toEqual(["push", "chair", "bridge", "row", "core"]);
    expect(normal.find((i) => i.id === "push")!.dose).toBe("2セット × 10〜15回");
    const short = sessionOf(p, "short").filter((i) => i.level);
    expect(short.map((i) => i.id)).toEqual(["push", "chair"]);
    expect(short[0].dose).toBe("10〜15回");
    // 種目の段階を変えると、その種目だけ変わる
    const up = withLevel(p, "push", 4);
    expect(sessionOf(up, "normal").find((i) => i.id === "push")!.name).toBe("ひざつき腕立て");
    expect(levelOf(up, "chair")).toBe(1);
    expect(levelOf(withLevel(p, "bridge", 99), "bridge")).toBe(3);
  });

  it("段階を変えると、筋トレの回数と長さもそろえる", () => {
    const p = withStage(plan(), STAGES[3], "2026-11-20");
    expect(p).toMatchObject({ stage: 4, stageSince: "2026-11-20", weeklyTimes: 3, normalMinutes: 20, shortMinutes: 5 });
    expect(stageOf(undefined).stage).toBe(1);
  });
});

describe("記録から、いまどこにいるか", () => {
  it("種目の上げどき：その段階の最後の2回が、範囲の上までできたか「楽」。最後が「きつい」なら上げない", () => {
    const p = plan();
    const sets = stageOf(p).sets;
    const top = { id: "push", level: 1, reps: 15, sets: 1 };
    expect(levelUpReady([strength("2026-11-10", { details: [top] })], "push", 1, sets)).toBe(false);
    expect(levelUpReady([strength("2026-11-10", { details: [top] }), strength("2026-11-13", { details: [top] })], "push", 1, sets)).toBe(true);
    const low = { ...top, reps: 9 };
    expect(levelUpReady([strength("2026-11-10", { details: [top] }), strength("2026-11-13", { details: [low] })], "push", 1, sets)).toBe(false);
    const easy = [strength("2026-11-10", { feel: "easy", details: [{ id: "push", level: 1 }] }), strength("2026-11-13", { feel: "easy", details: [{ id: "push", level: 1 }] })];
    expect(levelUpReady(easy, "push", 1, sets)).toBe(true);
    expect(levelUpReady([...easy, strength("2026-11-16", { feel: "hard", details: [{ id: "push", level: 1 }] })], "push", 1, sets)).toBe(false);
    // 前の版の記録（段階なし）は1段階目として読む
    expect(levelUpReady([strength("2026-11-10", { details: [{ id: "push", reps: 15 }] }), strength("2026-11-13", { details: [{ id: "push", reps: 15 }] })], "push", 1, sets)).toBe(true);
    // 秒で数える種目
    const plank = { id: "core", level: 3, seconds: 45, sets: 1 };
    expect(levelUpReady([strength("2026-11-10", { details: [plank] }), strength("2026-11-13", { details: [plank] })], "core", 3, sets)).toBe(true);
    // 最後の段階からは上げない
    expect(levelUpReady(easy.map((r) => ({ ...r, details: [{ id: "bridge", level: 3 }] })), "bridge", 3, sets)).toBe(false);
  });

  it("段階の上げどき：2週間で予定の回数（1回は休んでよい）、最後がきつくない、その段階に2週間いた", () => {
    const today = "2026-11-20";
    const p = plan({ stage: 1, stageSince: "2026-11-06" });
    const three = [strength("2026-11-09"), strength("2026-11-12"), strength("2026-11-18")];
    expect(stageCheck(three, p, today)).toMatchObject({ done: 3, needed: 3, ready: true });
    expect(stageCheck(three.slice(0, 2), p, today).ready).toBe(false);
    expect(stageCheck([...three.slice(0, 2), strength("2026-11-18", { feel: "hard" })], p, today)).toMatchObject({ hard: true, ready: false });
    expect(stageCheck(three, { ...p, stageSince: "2026-11-15" }, today).ready).toBe(false);
    // 古い計画（段階なし）でも読める
    expect(stageCheck(three, plan({ stage: undefined }), today).ready).toBe(true);
    expect(stageCheck(three, plan({ stage: 4 }), today).ready).toBe(false);
  });

  it("歩いた分：記録の分と、習慣の散歩（やった＝その長さ・少しだけ＝5分）を週で足す", () => {
    const walk = addWalk(addWalk(undefined, "2026-11-17", 10), "2026-11-17", 20);
    expect(walk.details).toEqual([{ id: "walk", minutes: 30 }]);
    const old: Exercise = { date: "2026-11-18", roundId: "manual:2026-11-18:walking", variant: "short", activity: "walking" };
    const logs = { "2026-11-16": { "habit-walk": "done" as const }, "2026-11-19": { "habit-walk": "five" as const }, "2026-11-25": { "habit-walk": "done" as const } };
    expect(mondayOf("2026-11-22")).toBe("2026-11-16");
    expect(walkMinutesBetween([walk, old], logs, 20, "2026-11-16", "2026-11-22")).toBe(30 + 5 + 20 + 5);
  });

  it("肩こりほぐしは1日1件の記録に回数を足し、週ごとのまとめに入る", () => {
    const once = addShoulder(undefined, "2026-11-20", "short");
    const twice = addShoulder(once, "2026-11-20", "short");
    expect(twice).toMatchObject({ roundId: "manual:2026-11-20:mobility", activity: "mobility", details: [{ id: "shoulder", reps: 2 }] });
    const weeks = weekSummaries([twice, strength("2026-11-18"), strength("2026-11-10")], {}, 20, "2026-11-20", 2);
    expect(weeks).toEqual([
      { monday: "2026-11-16", strength: 1, walkMinutes: 0, shoulder: 2 },
      { monday: "2026-11-09", strength: 1, walkMinutes: 0, shoulder: 0 },
    ]);
  });
});

describe("記録の形（前の記録も読める）", () => {
  it("段階・種目の段階・秒・感想は省いてよく、入れたときは範囲を確かめる", () => {
    const old = { enabled: true, normalMinutes: 15, shortMinutes: 5, weeklyTimes: 2, nonConsecutive: true, windowStart: 480, windowEnd: 1290, enabledOn: "2026-11-02" };
    expect(validateLifeEvent(event("exercisePlan", old))).toBe(true);
    expect(validateLifeEvent(event("exercisePlan", { ...old, stage: 2, stageSince: "2026-11-20", levels: { push: 3, core: 1 } }))).toBe(true);
    expect(validateLifeEvent(event("exercisePlan", { ...old, stage: 5 }))).toBe(false);
    expect(validateLifeEvent(event("exercisePlan", { ...old, levels: { push: 0 } }))).toBe(false);
    expect(validateLifeEvent(event("exercisePlan", { ...old, levels: { __proto__x: 1, "a b": 2 } }))).toBe(false);
    const record = { date: "2026-11-20", roundId: "strength-2026-11-16-1", variant: "normal", activity: "strength" };
    expect(validateLifeEvent(event("exercise", record))).toBe(true);
    expect(validateLifeEvent(event("exercise", { ...record, feel: "easy", details: [{ id: "core", level: 3, seconds: 40, sets: 2 }] }))).toBe(true);
    expect(validateLifeEvent(event("exercise", { ...record, feel: "great" }))).toBe(false);
    expect(validateLifeEvent(event("exercise", { ...record, details: [{ id: "push", level: 0 }] }))).toBe(false);
  });
});

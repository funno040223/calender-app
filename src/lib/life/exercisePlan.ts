import type { ExerciseInput } from "@/lib/scheduler";
import { dateKeyOf, dayStartOfKey, type MockData } from "@/lib/mock/model";
import { DAY_MS, weekdayOf } from "@/lib/mock/jst";
import { LEGACY_EXERCISE_HABIT, type ExercisePlan, type LifeProjection } from "./model";

/** 初めての計画は道のりの第1段階（週2回・10分・短め5分） */
export function defaultExercisePlan(date: string): ExercisePlan {
  return { enabled: true, normalMinutes: 10, shortMinutes: 5, weeklyTimes: 2, nonConsecutive: true, windowStart: 8 * 60, windowEnd: 21 * 60 + 30, enabledOn: date, stage: 1 };
}

/** カレンダーと通知に出る枠の名前（中身は運動の画面の「今日」） */
export const EXERCISE_TITLES = { normal: "筋トレ（全身）", short: "筋トレ（短め）" };

/** 運動の回の ID（週の月曜と何回目か）。手で記録した分（manual:…）は回に数えない */
const isRoundId = (id: string) => id.startsWith("strength-");

/**
 * 生活記録から、配置エンジンに渡す運動のプランを作る。プランを使っていなければ undefined。
 * 自動で置いた時刻の控え（automatic の選択）は使わない（配置エンジンが前回の位置を覚えている）
 */
export function exerciseInputOf(projection: LifeProjection, habitLogs: MockData["habitLogs"]): ExerciseInput | undefined {
  const plan = projection.exercisePlan?.value;
  if (!plan?.enabled || projection.conflicts.exercisePlan) return undefined;
  const day = (key: string) => dayStartOfKey(key);
  const done: Record<string, number> = {};
  const doneDays: number[] = [];
  const manual: number[] = [];
  for (const { value } of Object.values(projection.exercise)) {
    const d = day(value.date);
    if (value.activity !== "strength" || d === undefined) continue;
    if (isRoundId(value.roundId)) done[value.roundId] = d;
    else manual.push(d);
  }
  // 回の枠の外で記録した筋トレも、その週のまだやっていない回に数える（週の回数をこえた分は日だけ数える）
  for (const d of manual.sort((a, b) => a - b)) {
    const monday = dateKeyOf(d - ((weekdayOf(d) + 6) % 7) * DAY_MS);
    const id = Array.from({ length: plan.weeklyTimes }, (_, i) => `strength-${monday}-${i + 1}`).find((x) => done[x] === undefined);
    if (id) done[id] = d;
    else doneDays.push(d);
  }
  // 前の「家での運動」の習慣で記録した日も、続けての日を避けるのに数える
  for (const [key, marks] of Object.entries(habitLogs)) {
    const d = day(key);
    if (marks[LEGACY_EXERCISE_HABIT] && d !== undefined) doneDays.push(d);
  }
  const choices: ExerciseInput["choices"] = {};
  for (const [roundId, { value }] of Object.entries(projection.exerciseChoices)) {
    if (value.automatic) continue;
    choices[roundId] = { mode: value.mode, ...(value.start !== undefined ? { start: value.start } : {}) };
  }
  const tiredDays = Object.entries(projection.fatigue).flatMap(([key, { value }]) => (value === "strong" && day(key) !== undefined ? [day(key)!] : []));
  const conflicts = Object.keys(projection.conflicts).flatMap((key) => {
    const m = /^(?:exercise|exerciseChoice):(.+)$/.exec(key);
    return m ? [m[1]] : [];
  });
  return {
    normalMinutes: plan.normalMinutes,
    shortMinutes: plan.shortMinutes,
    weeklyTimes: plan.weeklyTimes,
    nonConsecutive: plan.nonConsecutive,
    windowStart: plan.windowStart,
    windowEnd: plan.windowEnd,
    since: day(plan.enabledOn) ?? 0,
    done,
    doneDays,
    choices,
    tiredDays,
    conflicts,
    titles: EXERCISE_TITLES,
  };
}

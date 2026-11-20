import { dayStartOf, DAY_MS, MIN, weekdayOf } from "@/lib/mock/jst";
import { dateKeyOf, dayStartOfKey } from "@/lib/mock/model";
import { planEvents, replan, type MockState } from "@/lib/mock/state";
import { resolveTravel, wakingDayStart, type Block, type DayPlan, type Interval, type PlanResult } from "@/lib/scheduler";
import { intersect, subtract } from "@/lib/scheduler/intervals";
import { ceilToStep } from "@/lib/scheduler/time";
import { LEGACY_EXERCISE_HABIT, LIFE_EXERCISE_PREFIX, type ExerciseChoice, type ExercisePlan, type LifeProjection } from "./model";

export { LEGACY_EXERCISE_HABIT, LIFE_EXERCISE_PREFIX } from "./model";
const ROUND_PREFIX = "strength-";

export interface ExerciseAlternative {
  mode: "normal" | "short" | "skip";
  date: string;
  start?: number;
  end?: number;
  shortfallMinutes: number;
  longestTaskMinutes: number;
  movedBlocks: number;
  movedMinutes: number;
  available: boolean;
}

export interface ExerciseRound {
  roundId: string;
  activity: "strength";
  date: string;
  block?: Block;
  status: "normal" | "short" | "postponed" | "skipped" | "confirm" | "completed";
  alternatives: ExerciseAlternative[];
  originalStart?: number;
  reason?: string;
}

export interface LifeSchedule {
  calendarBlocks: Block[];
  result: PlanResult;
  rounds: ExerciseRound[];
  automaticChoices: ExerciseChoice[];
  failed?: boolean;
}

export function defaultExercisePlan(date: string): ExercisePlan {
  return { enabled: true, normalMinutes: 15, shortMinutes: 5, weeklyTimes: 2,
    nonConsecutive: true, windowStart: 8 * 60, windowEnd: 21 * 60 + 30, enabledOn: date };
}

const duration = (preferences: ExercisePlan, mode: "normal" | "short") =>
  (mode === "normal" ? preferences.normalMinutes : preferences.shortMinutes) * MIN;

const mondayOf = (start: number) => start - ((weekdayOf(start) + 6) % 7) * DAY_MS;
const overlaps = (a: Interval, b: Interval) => a.start < b.end && b.start < a.end;
const blockKey = (block: Block) => block.kind + ":" + block.refId + ":" + block.start + ":" + block.end;
const missed = (result: PlanResult) => result.shortfalls.reduce((sum, task) => sum + task.shortfallMinutes, 0);

function comparePlan(base: PlanResult, result: PlanResult, date: string, mode: ExerciseAlternative["mode"], interval?: Interval): ExerciseAlternative {
  const starts = new Set(result.blocks.map(blockKey));
  const changed = base.blocks.filter((block) => !starts.has(blockKey(block)));
  const remaining = result.blocks.filter((block) => block.kind === "task" && dateKeyOf(block.start) === date);
  return {
    mode, date, ...(interval ?? {}), shortfallMinutes: missed(result),
    longestTaskMinutes: Math.max(0, ...remaining.map((block) => (block.end - block.start) / MIN)),
    movedBlocks: changed.length, movedMinutes: changed.reduce((sum, block) => sum + (block.end - block.start) / MIN, 0), available: true,
  };
}

function increasesShortfall(base: PlanResult, result: PlanResult) {
  const previous = new Map(base.shortfalls.map((item) => [item.taskId, item.shortfallMinutes]));
  return result.shortfalls.some((item) => item.shortfallMinutes > (previous.get(item.taskId) ?? 0));
}

function keepsProtected(base: PlanResult, result: PlanResult, now: number) {
  const actual = new Set(result.blocks.map(blockKey));
  return base.blocks.every((block) => (block.kind === "task" && !block.pinned && block.start > now) || actual.has(blockKey(block)));
}

function enoughSlack(result: PlanResult, day: DayPlan, state: MockState, candidate: Interval) {
  const free = result.exerciseGaps?.afterTasks ?? [];
  const minutes = (gaps: Interval[]) => intersect(gaps, { start: day.wake, end: day.bed })
    .reduce((sum, interval) => sum + (interval.end - interval.start) / MIN, 0);
  const gained = intersect(free, candidate).reduce((sum, interval) => sum + (interval.end - interval.start) / MIN, 0);
  return minutes(free) - gained >= state.settings.minSlackMinutesPerDay;
}

interface Candidate {
  alternative: ExerciseAlternative;
  safe: boolean;
  slack: boolean;
  reserve: Interval;
}

export function planLifeExercise(state: MockState, projection: LifeProjection, now = state.plannedAt): LifeSchedule {
  const unchanged: LifeSchedule = { calendarBlocks: state.blocks, result: state.result, rounds: [], automaticChoices: [] };
  if (projection.conflicts.exercisePlan) return { ...unchanged, failed: true };
  const preferences = projection.exercisePlan?.value;
  if (!preferences?.enabled) return unchanged;
  try {
    return computeExercise(state, projection, preferences, now);
  } catch {
    return { ...unchanged, failed: true };
  }
}

function computeExercise(state: MockState, projection: LifeProjection, preferences: ExercisePlan, now: number): LifeSchedule {
  const reservations: Interval[] = [];
  const blocks: Block[] = [];
  const rounds: ExerciseRound[] = [];
  const automaticChoices: ExerciseChoice[] = [];
  const rerun = (extra: Interval[] = []) => replan(state, state.googleEvents, now, {
    legacyHabitId: LEGACY_EXERCISE_HABIT, reservations: [...reservations, ...extra],
  }).result;
  let result = rerun();
  const days = result.dayPlans;
  const current = wakingDayStart(now, days, state.settings.tzOffsetMinutes);
  const anchor = Math.max(dayStartOfKey(preferences.enabledOn) ?? current, mondayOf(current));
  const completed = Object.values(projection.exercise).map(({ value }) => value);
  const occurred = new Set(completed.filter((value) => value.activity === "strength").map((value) => dayStartOfKey(value.date)));
  // Legacy marks remain history. They can protect adjacent days without being turned into new exercise logs.
  for (const [date, marks] of Object.entries(state.habitLogs)) {
    if (marks[LEGACY_EXERCISE_HABIT]) occurred.add(dayStartOfKey(date));
  }
  const reservedDays = new Map<string, number>();
  for (const { value } of Object.values(projection.exerciseChoices)) {
    if (value.start !== undefined && value.mode !== "skip" && value.start + duration(preferences, value.mode) > now) {
      reservedDays.set(value.roundId, dayStartOf(value.start));
    }
  }
  for (const block of result.blocks) {
    if (block.refId === LEGACY_EXERCISE_HABIT && (block.pinned || block.end > now)) {
      occurred.add(wakingDayStart(block.start, days, state.settings.tzOffsetMinutes));
    }
  }

  const daysOk = (day: number, roundId: string) => {
    if (!preferences.nonConsecutive) return true;
    return [...occurred, ...[...reservedDays].filter(([id]) => id !== roundId).map(([, stamp]) => stamp)]
      .every((stamp) => stamp === undefined || Math.abs(stamp - day) > DAY_MS);
  };

  const fixed = planEvents(state, state.classEvents, state.googleEvents).flatMap((event) => {
    if (event.allDay) return event.awayFromHome ? [{ start: event.start, end: event.end }] : [];
    const travel = resolveTravel(event, state.places, state.settings);
    const pad = travel.atHome ? 0 : travel.minutes * MIN;
    const rest = event.restAfterMinutes ?? (travel.atHome ? 0 : state.settings.restAfterAwayEventMinutes);
    return [{ start: event.start - pad, end: event.end + pad + rest * MIN }];
  });
  const existing = state.blocks.filter((block) => block.refId !== LEGACY_EXERCISE_HABIT || block.pinned || block.start <= now);
  const existingIntervals = existing.map((block) => {
    if (block.kind !== "task") return block;
    const currentTask = state.tasks.find((task) => task.id === block.refId);
    const tag = state.planTags.find((tag) => tag.id === currentTask?.tagId);
    return { start: block.start, end: block.end + (tag?.restAfterMinutes ?? state.settings.breakMinutes) * MIN };
  });

  const protectedAt = (interval: Interval, day: DayPlan) =>
    interval.start >= day.wake && interval.end <= day.bed - state.settings.windDownMinutes * MIN
    && ![...fixed, ...(state.keepFree ?? []), ...(result.rhythmResets ?? []), ...reservations].some((other) => overlaps(interval, other))
    && !result.blocks.some((block) => (block.start <= now || block.pinned) && overlaps(interval, block));

  for (let week = mondayOf(anchor); week <= (days.at(-1)?.dayStart ?? anchor); week += DAY_MS * 7) {
    const weekEnd = week + DAY_MS * 7;
    const weekDays = days.filter((day) => day.dayStart >= Math.max(week, anchor) && day.dayStart < weekEnd);
    if (!weekDays.length) continue;
    for (let index = 0; index < preferences.weeklyTimes; index++) {
      const roundId = ROUND_PREFIX + dateKeyOf(week) + "-" + (index + 1);
      const preferred = week + Math.floor(index * 7 / preferences.weeklyTimes) * DAY_MS;
      const originalStart = preferred + Math.max(preferences.windowStart, Math.min(19 * 60, preferences.windowEnd - preferences.normalMinutes)) * MIN;
      const date = dateKeyOf(preferred);
      const common = { roundId, activity: "strength" as const, date, originalStart };
      const completion = completed.find((item) => item.roundId === roundId);
      if (completion) {
        rounds.push({ ...common, date: completion.date, status: "completed", alternatives: [] });
        continue;
      }
      const skip = comparePlan(result, result, date, "skip");
      const choice = projection.exerciseChoices[roundId]?.value;
      if (choice?.mode === "skip") {
        rounds.push({ ...common, status: "skipped", alternatives: [skip] });
        continue;
      }
      const conflict = projection.conflicts["exercise:" + roundId] || projection.conflicts["exerciseChoice:" + roundId];
      if (conflict) {
        rounds.push({ ...common, status: "confirm", alternatives: [skip], reason: "別の端末の記録を確認してください。" });
        continue;
      }

      const candidateAt = (day: DayPlan, mode: "normal" | "short", start: number): Candidate | undefined => {
        const end = start + duration(preferences, mode);
        const reserve = { start, end };
        if (!daysOk(day.dayStart, roundId) || !protectedAt(reserve, day)) return undefined;
        if (start > now && !result.exerciseGaps?.beforeTasks.some((gap) => start >= gap.start && end <= gap.end)) return undefined;
        const cleanGap = result.exerciseGaps?.afterTasks.some((gap) => start >= gap.start && end <= gap.end);
        const after = cleanGap || start <= now ? result : rerun([reserve]);
        const alternative = comparePlan(result, after, dateKeyOf(day.dayStart), mode, reserve);
        const safe = !existingIntervals.some((block) => overlaps(block, reserve))
          && !increasesShortfall(result, after) && keepsProtected(result, after, now);
        alternative.available = safe;
        const slack = enoughSlack(result, day, state, reserve)
          && alternative.longestTaskMinutes >= comparePlan(result, result, alternative.date, mode).longestTaskMinutes;
        return { reserve, alternative, safe, slack };
      };

      const candidates: Candidate[] = [];
      for (const day of weekDays.filter((day) => day.dayStart >= Math.max(current, preferred))) {
        const window = { start: Math.max(ceilToStep(now + 1, 1), day.dayStart + preferences.windowStart * MIN),
          end: day.dayStart + preferences.windowEnd * MIN };
        for (const mode of ["normal", "short"] as const) {
          const len = duration(preferences, mode);
          const ideal = day.dayStart + (originalStart - preferred);
          const bestStart = (gaps: Interval[]) => {
            const starts = intersect(gaps, window)
              .filter((gap) => ceilToStep(gap.start, 1) + len <= gap.end)
              .map((gap) => Math.max(ceilToStep(gap.start, 1), Math.min(ideal, gap.end - len)))
              .sort((a, b) => Math.abs(a - ideal) - Math.abs(b - ideal) || a - b);
            for (const start of starts) {
              const option = candidateAt(day, mode, start);
              if (option) return option;
            }
            return undefined;
          };
          const finalGaps = result.exerciseGaps?.afterTasks ?? [];
          const option = bestStart(subtract(finalGaps, existingIntervals))
            ?? bestStart(finalGaps) ?? bestStart(result.exerciseGaps?.beforeTasks ?? []);
          if (option) candidates.push(option);
        }
      }
      const acceptable = candidates.filter((candidate) => candidate.safe);
      const sameDay = (item: Candidate) => item.alternative.date === date;
      const normal = (item: Candidate) => item.alternative.mode === "normal";
      const strong = (item: Candidate) => projection.fatigue[item.alternative.date]?.value === "strong";
      const favor = (item: Candidate) => (sameDay(item) ? 0 : 4) + (normal(item) ? 0 : 2) + (item.slack ? 0 : 1);
      const auto = acceptable
        .filter((item) => !normal(item) || !strong(item))
        .sort((a, b) => favor(a) - favor(b) || a.reserve.start - b.reserve.start);
      const hasShortfall = missed(state.result) > 0 || missed(result) > 0;
      let selected = !hasShortfall ? auto.find((item) => item.slack) ?? auto[0] : undefined;
      if (choice?.start !== undefined) {
        const day = weekDays.find((item) => item.dayStart === dayStartOf(choice.start!));
        const finished = choice.start + duration(preferences, choice.mode) <= now;
        const prior = day && !finished ? candidateAt(day, choice.mode, choice.start) : undefined;
        if (prior?.safe && (!choice.automatic || prior.reserve.start <= now || !normal(prior) || !strong(prior))) {
          selected = prior;
        } else if (!choice.automatic || finished || choice.start <= now) {
          selected = undefined;
        }
      } else if (choice) {
        selected = acceptable.find((item) => item.alternative.mode === choice.mode);
      }
      const alternatives = [...candidates.map(({ alternative }) => alternative), skip];

      if (!selected) {
        rounds.push({ ...common, status: choice || hasShortfall ? "confirm" : "skipped", alternatives,
          reason: choice ? "指定の時間と予定が重なっています。" : hasShortfall ? "締切までの作業時間を確認してください。" : "今週は空きが見つかりませんでした。" });
        continue;
      }
      const { reserve, alternative } = selected;
      const placed: Block = {
        ...reserve, kind: "habit", refId: LIFE_EXERCISE_PREFIX + roundId,
        title: alternative.mode === "short" ? "家での運動（短縮）" : "家での運動",
        ...(choice?.start !== undefined && !choice.automatic ? { pinned: true } : {}),
      };
      if ((!choice || choice.automatic) && (choice?.start !== reserve.start || choice?.mode !== alternative.mode)) {
        automaticChoices.push({
          roundId, automatic: true, start: reserve.start, mode: alternative.mode,
          ...(choice?.start !== undefined ? { previousStart: choice.start, previousMode: choice.mode }
            : reserve.start !== originalStart || alternative.mode === "short" ? { previousStart: originalStart, previousMode: "normal" as const } : {}),
        });
      }
      reservations.push(reserve);
      blocks.push(placed);
      reservedDays.set(roundId, dayStartOf(reserve.start));
      const gaps = result.exerciseGaps;
      if (gaps) {
        result = { ...result, exerciseGaps: {
          beforeTasks: subtract(gaps.beforeTasks, [reserve]),
          afterTasks: subtract(gaps.afterTasks, [reserve]),
        } };
      }
      const postponed = alternative.date !== date;
      rounds.push({ ...common, date: alternative.date, block: placed, alternatives,
        status: postponed ? "postponed" : alternative.mode === "short" ? "short" : "normal",
        reason: postponed ? "今週の別の空き時間に移しました。" : alternative.mode === "short" ? "予定に合わせて短い枠を残しました。" : undefined });
    }
  }

  const calendarBlocks = [...existing, ...blocks].sort((a, b) => a.start - b.start);
  return { rounds, calendarBlocks, automaticChoices, result: { ...state.result, blocks: calendarBlocks, freeGaps: subtract(state.result.freeGaps, blocks) } };
}

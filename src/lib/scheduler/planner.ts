import type {
  AvoidWindow,
  Block,
  DayPlan,
  Habit,
  Interval,
  PlanInput,
  PlanResult,
  Shortfall,
  SkippedHabit,
  Tag,
  Task,
  TravelQuestion,
} from "./types";
import { DAY_MS, MIN, ceilToStep, floorMinutesToStep, floorToStep, localDayStart, localWeekday } from "./time";
import { intersect, lengthMinutes, merge, subtract } from "./intervals";
import { computeDayPlans } from "./rhythm";
import { resolveTravel } from "./travel";

const FALLBACK_TASK_MINUTES = 60;
const FALLBACK_TAG: Omit<Tag, "id" | "name"> = {
  mode: "gap",
  defaultMinutes: FALLBACK_TASK_MINUTES,
  minChunkMinutes: 15,
  maxChunkMinutes: 120,
};

/** 事務系のタスクで「長い空き時間を使ってしまう」とみなす長さ（分） */
const LONG_SLOT_MINUTES = 120;

/**
 * 減点方式。「この時間はやりたくない」を減点として足し、いちばん減点の少ない場所に置く。
 * 何も当てはまらない場所は 0 点。
 */
const PENALTY = {
  /** 先の日に回すほど、締切までの余裕が減る */
  perDayLater: 0.3,
  /** 「直前に寄せる」タスクで、締切から離れるほど忘れやすい（1日あたり） */
  perDayBeforeDeadline: 1,
  /** 前回の配置から動かす */
  movedFromBefore: 1,
  /** 集中系を細切れにする */
  focusSplit: 1.5,
  /** 事務系を分ける */
  split: 0.3,
  /** 起きてすぐの集中作業 */
  focusRightAfterWake: 1.5,
  /** 寝る前の集中作業 */
  focusBeforeBed: 1.5,
  /** 事務系で長い空き時間を使ってしまう */
  gapTaskInLongSlot: 0.4,
  /** 「なるべく避ける」時間帯（重なった割合を掛ける。最低でも半分） */
  avoidWindow: 3,
  /** 1日の作業の目安を超える */
  overDailyCap: 2,
};

function avoidIntervalsFor(task: Task, windows: AvoidWindow[], days: DayPlan[], tz: number, hard: boolean): Interval[] {
  const out: Interval[] = [];
  // 最終日の夜は日付をまたぐので、範囲の翌日の日付にも作る
  const dayStarts = [...days.map((d) => d.dayStart), days.at(-1)!.dayStart + DAY_MS];
  for (const w of windows) {
    if (w.hard !== hard) continue;
    if (w.tagIds && (!task.tagId || !w.tagIds.includes(task.tagId))) continue;
    for (const dayStart of dayStarts) {
      if (w.weekdays && !w.weekdays.includes(localWeekday(dayStart, tz))) continue;
      out.push({ start: dayStart + w.start * MIN, end: dayStart + w.end * MIN });
    }
  }
  return out;
}

function overlapMinutes(intervals: Interval[], start: number, end: number): number {
  return intervals.reduce((sum, i) => sum + Math.max(0, Math.min(i.end, end) - Math.max(i.start, start)), 0) / MIN;
}

export function estimateMinutes(task: Task, tag: Pick<Tag, "defaultMinutes"> | undefined): number {
  if (task.remainingMinutes !== undefined) return task.remainingMinutes;
  if (task.durationMinutes !== undefined) return task.durationMinutes;
  if (task.durationRange) return Math.ceil((task.durationRange.min + task.durationRange.max) / 2 / 15) * 15;
  return tag?.defaultMinutes ?? FALLBACK_TASK_MINUTES;
}

export function plan(input: PlanInput): PlanResult {
  const { now, settings: s, places } = input;
  const firstDay = localDayStart(now, s.tzOffsetMinutes);
  // 最終日の就寝を決めるために1日多く計算する
  const allDays = computeDayPlans(firstDay, s.planningDays + 1, input.events, places, s);
  const days = allDays.slice(0, s.planningDays);
  const horizonEnd = days.at(-1)!.bed;

  const dayOf = (t: number): DayPlan | undefined => days.find((d) => t >= d.wake && t < d.bed);
  const dayIndex = (d: DayPlan) => Math.round((d.dayStart - firstDay) / DAY_MS);

  // 始まった枠と固定した枠は残す。朝ルーティンは毎回計算し直す
  const previous = input.previousBlocks.filter((b) => b.kind !== "routine" && b.end > now);
  const kept = previous.filter((b) => b.start <= now || b.pinned);
  const movable = previous.filter((b) => !kept.includes(b));

  const travelQuestions: TravelQuestion[] = [];
  const busy: Interval[] = [];
  /** 予定に関連するタスクの締切（外出なら家を出る時刻） */
  const eventDeadline = new Map<string, number>();
  for (const ev of input.events) {
    if (ev.allDay) continue;
    const t = resolveTravel(ev, places, s);
    const pad = t.atHome ? 0 : t.minutes * MIN;
    eventDeadline.set(ev.id, ev.start - pad);
    const rest = (ev.restAfterMinutes ?? (t.atHome ? 0 : s.restAfterAwayEventMinutes)) * MIN;
    // 予定が終わっても、帰りの移動と休憩が終わるまでは埋まっている
    const end = ev.end + pad + rest;
    if (end <= now || ev.start >= horizonEnd) continue;
    if (t.unknown && ev.location && ev.start > now) travelQuestions.push({ eventId: ev.id, location: ev.location });
    busy.push({ start: ev.start - pad, end });
  }

  const routineBlocks: Block[] = [];
  for (const d of days) {
    const cap = d.leave ?? d.firstEvent?.start ?? Infinity;
    const end = Math.min(d.wake + (s.routineMinutes + s.prepMinutes) * MIN, cap);
    if (end > d.wake && end > now) {
      routineBlocks.push({ kind: "routine", refId: "routine", title: "朝ルーティン・準備", start: d.wake, end });
    }
  }

  const tagOf = (taskId: string) => {
    const task = input.tasks.find((t) => t.id === taskId);
    return { ...FALLBACK_TAG, ...input.tags.find((t) => t.id === task?.tagId) };
  };
  // タスクのあとは、タグごとの休憩を空ける
  const withBreak = (b: Block): Interval =>
    b.kind === "task"
      ? { start: b.start, end: b.end + (tagOf(b.refId).restAfterMinutes ?? s.breakMinutes) * MIN }
      : { start: b.start, end: b.end };

  let free = days
    .map((d) => ({ start: Math.max(d.wake, now), end: d.bed - s.windDownMinutes * MIN }))
    .filter((i) => i.end > i.start);
  free = subtract(free, [...busy, ...[...routineBlocks, ...kept].map(withBreak)]);

  const blocks: Block[] = [...kept, ...routineBlocks];
  const skippedHabits: SkippedHabit[] = [];
  const placedHabits: { block: Block; skippable: boolean }[] = [];

  // ---- 習慣 ----
  const habits = [...input.habits].sort((a, b) => Number(a.skippable) - Number(b.skippable));
  for (const habit of habits) {
    const windowOf = (d: DayPlan): Interval => ({
      start: d.dayStart + habit.windowStart * MIN,
      end: d.dayStart + habit.windowEnd * MIN,
    });
    const hasKept = (d: DayPlan) =>
      kept.some((b) => b.kind === "habit" && b.refId === habit.id && b.start >= d.dayStart && b.start < d.dayStart + DAY_MS);
    const target = chooseHabitDays(habit, days, free, windowOf, hasKept).filter((d) => windowOf(d).end > now);

    for (const d of target) {
      const window = windowOf(d);
      const slots = intersect(free, window);
      const prev = movable.find(
        (b) => b.kind === "habit" && b.refId === habit.id && b.start >= window.start && b.start < window.end,
      );
      const dur = habit.durationMinutes * MIN;
      let start: number | undefined;
      if (prev && slots.some((i) => prev.start >= i.start && prev.start + dur <= i.end)) start = prev.start;
      else {
        for (const i of slots) {
          const st = ceilToStep(i.start);
          if (st + dur <= i.end) {
            start = st;
            break;
          }
        }
      }
      if (start === undefined) {
        skippedHabits.push({ habitId: habit.id, dayStart: d.dayStart, reason: "no_room" });
        continue;
      }
      const block: Block = { kind: "habit", refId: habit.id, title: habit.name, start, end: start + dur };
      blocks.push(block);
      placedHabits.push({ block, skippable: habit.skippable });
      free = subtract(free, [block]);
    }
  }

  // 締切を守るために、飛ばしてよい習慣を1つ外して空きに戻す
  const releaseHabitBefore = (deadline: number): boolean => {
    const idx = placedHabits.findIndex((h) => h.skippable && h.block.start >= now && h.block.start < deadline);
    if (idx < 0) return false;
    const [{ block }] = placedHabits.splice(idx, 1);
    blocks.splice(blocks.indexOf(block), 1);
    free = merge([...free, { start: block.start, end: block.end }]);
    skippedHabits.push({ habitId: block.refId, dayStart: localDayStart(block.start, s.tzOffsetMinutes), reason: "deadline" });
    return true;
  };

  // ---- タスク ----
  const avoidWindows = input.avoidWindows ?? [];
  const focusZonesOf = (d: DayPlan) => ({
    afterWakeEnd: (d.leave ?? d.wake + (s.routineMinutes + s.prepMinutes) * MIN) + s.avoidFocusAfterWakeMinutes * MIN,
    beforeBedStart: d.bed - (s.windDownMinutes + s.avoidFocusBeforeBedMinutes) * MIN,
  });
  const dayLoad = new Map<number, number>();
  const addLoad = (b: Block) => {
    const d = dayOf(b.start);
    if (d) dayLoad.set(d.dayStart, (dayLoad.get(d.dayStart) ?? 0) + (b.end - b.start) / MIN);
  };
  kept.filter((b) => b.kind === "task").forEach(addLoad);

  const shortfalls: Shortfall[] = [];
  const deadlineOf = (task: Task): number | undefined => {
    const related = task.relatedEventId ? eventDeadline.get(task.relatedEventId) : undefined;
    return related !== undefined ? Math.min(related, task.deadline ?? Infinity) : task.deadline;
  };
  const byDeadlineThenPriority = (a: Task, b: Task): number => {
    const da = deadlineOf(a) ?? Infinity;
    const db = deadlineOf(b) ?? Infinity;
    if (da !== db) return da - db;
    if (a.priority !== b.priority) return b.priority - a.priority;
    return a.id.localeCompare(b.id);
  };

  for (const task of [...input.tasks].sort(byDeadlineThenPriority)) {
    const tag = tagOf(task.id);
    const keptMs = kept
      .filter((b) => b.kind === "task" && b.refId === task.id)
      .reduce((sum, b) => sum + (b.end - Math.max(b.start, now)), 0);
    let remaining = estimateMinutes(task, tag) - keptMs / MIN;

    const ownDeadline = deadlineOf(task);
    const beyondHorizon = ownDeadline === undefined || ownDeadline > horizonEnd;
    const deadline = Math.min(ownDeadline ?? horizonEnd, horizonEnd);
    const justBefore = task.timing === "justBefore" && !beyondHorizon;
    const prevStarts = new Set(movable.filter((b) => b.kind === "task" && b.refId === task.id).map((b) => b.start));
    const hardAvoid = avoidIntervalsFor(task, avoidWindows, days, s.tzOffsetMinutes, true);
    const softAvoid = avoidIntervalsFor(task, avoidWindows, days, s.tzOffsetMinutes, false);

    while (remaining > 0) {
      const need = Math.min(remaining, tag.maxChunkMinutes);
      const minLen = Math.min(tag.minChunkMinutes, remaining);
      let best: { start: number; len: number; penalty: number } | undefined;

      for (const iv of subtract(free, hardAvoid)) {
        if (iv.start >= deadline) break;
        const slotEnd = Math.min(iv.end, deadline);
        const d0 = dayOf(iv.start);
        if (!d0) continue;
        const zones = focusZonesOf(d0);

        // 区間の始まりに加えて、減点の境目（避けたい時間帯の前後など）からも試す
        const starts = [ceilToStep(iv.start), ...prevStarts];
        const endsBefore = [slotEnd];
        for (const a of softAvoid) {
          starts.push(ceilToStep(a.end));
          endsBefore.push(a.start);
        }
        if (tag.mode === "focus") {
          starts.push(ceilToStep(zones.afterWakeEnd));
          endsBefore.push(zones.beforeBedStart);
        }
        for (const e of endsBefore) starts.push(floorToStep(e - need * MIN));

        for (const st of new Set(starts)) {
          if (st < iv.start || st >= slotEnd) continue;
          const avail = (slotEnd - st) / MIN;
          const len = avail >= need ? need : floorMinutesToStep(avail);
          if (len < minLen || len <= 0) continue;
          const end = st + len * MIN;

          let penalty = justBefore
            ? ((deadline - end) / DAY_MS) * PENALTY.perDayBeforeDeadline
            : dayIndex(d0) * PENALTY.perDayLater;
          if (prevStarts.size > 0 && !prevStarts.has(st)) penalty += PENALTY.movedFromBefore;
          if (len < need) penalty += tag.mode === "focus" ? PENALTY.focusSplit : PENALTY.split;
          if (tag.mode === "focus") {
            if (st < zones.afterWakeEnd) penalty += PENALTY.focusRightAfterWake;
            if (end > zones.beforeBedStart) penalty += PENALTY.focusBeforeBed;
          } else if (lengthMinutes(iv) > LONG_SLOT_MINUTES) {
            penalty += PENALTY.gapTaskInLongSlot;
          }
          const avoided = overlapMinutes(softAvoid, st, end);
          if (avoided > 0) penalty += PENALTY.avoidWindow * Math.max(0.5, avoided / len);
          if ((dayLoad.get(d0.dayStart) ?? 0) + len > s.dailyTaskCapMinutes) penalty += PENALTY.overDailyCap;

          if (!best || penalty < best.penalty || (penalty === best.penalty && st < best.start)) {
            best = { start: st, len, penalty };
          }
        }
      }

      if (!best) {
        if (!beyondHorizon && releaseHabitBefore(deadline)) continue;
        if (!beyondHorizon) {
          shortfalls.push({ taskId: task.id, title: task.title, deadline, shortfallMinutes: remaining });
        }
        break;
      }

      const block: Block = {
        kind: "task",
        refId: task.id,
        title: task.title,
        start: best.start,
        end: best.start + best.len * MIN,
      };
      blocks.push(block);
      free = subtract(free, [withBreak(block)]);
      addLoad(block);
      remaining -= best.len;
    }
  }

  blocks.sort((a, b) => a.start - b.start);
  return { dayPlans: days, blocks, skippedHabits, shortfalls, travelQuestions };
}

function chooseHabitDays(
  habit: Habit,
  days: DayPlan[],
  free: Interval[],
  windowOf: (d: DayPlan) => Interval,
  hasKept: (d: DayPlan) => boolean,
): DayPlan[] {
  if (habit.frequency.type === "daily") return days.filter((d) => !hasKept(d));

  const chosen: DayPlan[] = [];
  for (let w = 0; w < days.length; w += 7) {
    const week = days.slice(w, w + 7);
    const needed = habit.frequency.times - week.filter(hasKept).length;
    if (needed <= 0) continue;
    const roomy = week
      .filter((d) => !hasKept(d))
      .map((d) => ({ d, room: intersect(free, windowOf(d)).reduce((sum, i) => sum + lengthMinutes(i), 0) }))
      .filter((x) => x.room >= habit.durationMinutes)
      .sort((a, b) => b.room - a.room || a.d.dayStart - b.d.dayStart);
    chosen.push(...roomy.slice(0, needed).map((x) => x.d));
  }
  return chosen.sort((a, b) => a.dayStart - b.dayStart);
}

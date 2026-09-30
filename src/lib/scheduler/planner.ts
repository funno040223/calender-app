import { applyRhythmResets } from "./reset";
import type {
  AvoidWindow,
  Block,
  DayEnergy,
  DayPlan,
  Habit,
  HabitCue,
  Interval,
  PlanInput,
  PlanResult,
  Shortfall,
  SkippedHabit,
  Tag,
  Task,
  TravelQuestion,
} from "./types";
import { CUE_GAP_MINUTES, CUE_SLACK_MINUTES, MEAL_GAP_MINUTES, MEAL_LATE_MINUTES } from "./types";
import { DAY_MS, MIN, ceilToStep, floorMinutesToStep, floorToStep, localDayStart, localWeekday } from "./time";
import { intersect, lengthMinutes, merge, subtract } from "./intervals";
import { DAY_BEGINS_AT_MINUTE, computeDayPlans } from "./rhythm";
import { resolveTravel } from "./travel";

const FALLBACK_TASK_MINUTES = 60;
const FALLBACK_TAG: Omit<Tag, "id" | "name"> = {
  mode: "gap",
  defaultMinutes: FALLBACK_TASK_MINUTES,
  minChunkMinutes: 15,
  maxChunkMinutes: 120,
};

/** すきま時間の候補として返す空き時間の最短の長さ（分） */
const MIN_GAP_MINUTES = 20;
/** 帰宅時に体力が「ふつう」と答えた夜に入れてよい、事務系のタスクの合計 */
const NORMAL_EVENING_TASK_MINUTES = 60;

/** 事務系のタスクで「長い空き時間を使ってしまう」とみなす長さ（分） */
const LONG_SLOT_MINUTES = 120;

/**
 * 減点方式。「この時間はやりたくない」を減点として足し、いちばん減点の少ない場所に置く。
 * 何も当てはまらない場所は 0 点。
 */
const PENALTY = {
  /** 先の日に回すほど、締切までの余裕が減る */
  perDayLater: 0.3,
  /** 前倒し：先の日に回すほど強く減点する（1日あたり） */
  perDayLaterEarly: 2,
  /** 分散：同じタスクをその日にすでに置いた時間（1時間あたり） */
  sameTaskSameDay: 1.5,
  /** 「直前に寄せる」タスクで、締切から離れるほど忘れやすい（1日あたり） */
  perDayBeforeDeadline: 1,
  /** 前回の配置から動かす */
  movedFromBefore: 1,
  /** 食後など、習慣のすぐあとの集中作業 */
  focusAfterHabit: 1.5,
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
  /** 行動ポイントの上限を超える（超えた1ポイントごと） */
  overEnergyPerPoint: 1.5,
};

/** days には、最終日の夜が日付をまたぐ分として範囲の翌日も含めて渡す */
function avoidIntervalsFor(task: Task, windows: AvoidWindow[], days: DayPlan[], tz: number, hard: boolean): Interval[] {
  const out: Interval[] = [];
  for (const w of windows) {
    if (w.hard !== hard) continue;
    if (w.tagIds && (!task.tagId || !w.tagIds.includes(task.tagId))) continue;
    for (const d of days) {
      if (w.weekdays && !w.weekdays.includes(localWeekday(d.dayStart, tz))) continue;
      if (w.dayType === "holiday" && !d.holiday) continue;
      if (w.dayType === "onDay" && d.holiday) continue;
      out.push({ start: d.dayStart + w.start * MIN, end: d.dayStart + w.end * MIN });
    }
  }
  return out;
}

/** 締切がこの日数より先のタスクは、まだ置かない */
export const FAR_TASK_DAYS = 28;

function fitsIn(free: Interval[], start: number, end: number): boolean {
  return free.some((i) => start >= i.start && end <= i.end);
}

/** slots の中で dur 分が入る最初の開始時刻。prefer（前回の位置）が入ればそれを使う */
function findStart(
  slots: Interval[],
  dur: number,
  ok: (start: number) => boolean,
  prefer?: number,
): number | undefined {
  if (prefer !== undefined && fitsIn(slots, prefer, prefer + dur) && ok(prefer)) return prefer;
  for (const i of slots) {
    for (let st = ceilToStep(i.start); st + dur <= i.end; st += 15 * MIN) {
      if (ok(st)) return st;
    }
  }
  return undefined;
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
  const resets = input.rhythmResets ?? [];
  const lookBack = resets.length ? 2 : 0;
  const withHistory = computeDayPlans(firstDay - lookBack * DAY_MS, s.planningDays + 1 + lookBack, input.events, places, s);
  const wakeShifts = applyRhythmResets(withHistory, resets, s);
  const allDays = withHistory.slice(lookBack);
  const sleep = resets.filter((r) => r.mode !== "tired");
  const pauses = resets.filter((r) => r.mode === "tired");
  const overlaps = (a: Interval, b: Interval) => a.start < b.end && a.end > b.start;
  // 夜中（0時を過ぎて、まだ寝る前）は前の日の続き。前の日の就寝までも計画に入れる（今夜の枠と寝る準備の通知を消さない）
  const prevDay = lookBack
    ? withHistory[lookBack - 1]
    : { ...computeDayPlans(firstDay - DAY_MS, 1, input.events, places, s)[0], bed: allDays[0].wake - s.sleepMinutes * MIN };
  const days = [...(prevDay.bed > now ? [prevDay] : []), ...allDays.slice(0, s.planningDays)];
  const planStart = days[0].dayStart;
  const horizonEnd = days.at(-1)!.bed;

  const dayOf = (t: number): DayPlan | undefined => days.find((d) => t >= d.wake && t < d.bed);
  /** その時刻が、どの日（起きている時間）の分か。計画の日の外なら、夜中0時〜4時は前の日の分 */
  const wakingDayOf = (t: number) => dayOf(t)?.dayStart ?? localDayStart(t - DAY_BEGINS_AT_MINUTE * MIN, s.tzOffsetMinutes);
  /** 残した枠のうち、その日の習慣があるか */
  const keptOn = (habitId: string, d: DayPlan) => kept.some((b) => b.kind === "habit" && b.refId === habitId && wakingDayOf(b.start) === d.dayStart);
  const dayIndex = (d: DayPlan) => Math.max(0, Math.round((d.dayStart - firstDay) / DAY_MS));
  /** 朝ルーティン（人に会う日は身支度も）が終わる時刻 */
  const morningEnd = (d: DayPlan) => d.wake + (s.routineMinutes + (d.prep ? s.prepMinutes : 0)) * MIN;

  // 始まった枠と固定した枠は残す。朝ルーティンは毎回計算し直す
  // 当日の終了済み習慣も残す。再計算で食事を再び置いたり、食事間隔を忘れたりしない。
  const previous = input.previousBlocks.filter((b) => b.kind !== "routine" && (b.end > now || (b.kind === "habit" && b.start >= planStart)));
  // 消えたタスク・習慣の枠は、始まっていても固定していても残さない
  const taskIds = new Set(input.tasks.map((t) => t.id));
  const habitIds = new Set(input.habits.map((h) => h.id));
  const exists = (b: Block) => (b.kind === "task" ? taskIds.has(b.refId) : habitIds.has(b.refId));
  let kept = previous.filter((b) => (b.start <= now || b.pinned) && exists(b));

  // ---- 行動ポイント ----
  // 深夜の枠はその日の起きている時間に含めるので、日付ではなく「どの日の枠か」で数える
  const energy = new Map<number, number>();
  const addEnergy = (t: number, points: number) => {
    const k = wakingDayOf(t);
    energy.set(k, (energy.get(k) ?? 0) + points);
  };
  const energyOn = (d: DayPlan) => energy.get(d.dayStart) ?? 0;

  const travelQuestions: TravelQuestion[] = [];
  const busy: Interval[] = [...sleep];
  /** 予定そのもの（移動を含み、帰宅後の休憩は含まない） */
  const eventSpans: Interval[] = [];
  /** 家にいない時間（移動を含む） */
  const away: Interval[] = [];
  /** 外出の予定から家に帰る時刻（終わった予定も含む。帰宅したときに体力を聞くため） */
  const returns: number[] = [];
  /** 予定に関連するタスクの締切（外出なら家を出る時刻） */
  const eventDeadline = new Map<string, number>();
  for (const ev of input.events) {
    if (ev.allDay) {
      // 帰省や旅行のあいだは家にいない。タスクは入れてよいが、自炊・洗濯はせず、食事は外食にする
      if (ev.awayFromHome && ev.end > now && ev.start < horizonEnd) away.push({ start: ev.start, end: ev.end });
      continue;
    }
    const t = resolveTravel(ev, places, s);
    const pad = t.atHome ? 0 : t.minutes * MIN;
    eventDeadline.set(ev.id, ev.start - pad);
    const rest = (ev.restAfterMinutes ?? (t.atHome ? 0 : s.restAfterAwayEventMinutes)) * MIN;
    // 予定が終わっても、帰りの移動と休憩が終わるまでは埋まっている
    const end = ev.end + pad + rest;
    if (ev.start >= planStart && ev.start < horizonEnd) {
      // 今日のうちに終わった予定も、今日の疲れには数える
      const hours = (ev.end - ev.start) / (60 * MIN);
      addEnergy(
        ev.start,
        ev.energyCost ??
          (t.atHome
            ? s.homeEventEnergyPerHour * hours
            : s.awayEventEnergy + s.awayEventEnergyPerHour * (hours + (2 * t.minutes) / 60)),
      );
    }
    if (!t.atHome && ev.start >= planStart && ev.start < horizonEnd) returns.push(ev.end + pad);
    if (end <= now || ev.start >= horizonEnd) continue;
    if (t.unknown && ev.location && ev.start > now) travelQuestions.push({ eventId: ev.id, location: ev.location });
    busy.push({ start: ev.start - pad, end });
    eventSpans.push({ start: ev.start - pad, end: ev.end + pad });
    if (!t.atHome) away.push({ start: ev.start - pad, end: ev.end + pad });
  }

  for (const d of days) {
    // 夜中0時を過ぎてからの帰宅は、前の日の帰宅（次の日の分にはしない）
    const back = returns.filter((r) => r > d.wake && r <= d.bed);
    if (back.length) d.homeAt = Math.max(...back);
  }

  // 直前30分の予定は、固定予定や睡眠と衝突しない限り動かさない。
  // 固定したタスクの枠も、始まる前にあとから予定が重なったら動かす（予定を優先する）
  kept = kept.filter((b) => !(b.kind === "task" && b.pinned && b.start > now && eventSpans.some((v) => overlaps(v, b))));
  const near = previous.filter((b) => !kept.includes(b) && exists(b) && b.start > now && b.start < now + 30 * MIN && !busy.some((v) => overlaps(v, b)) && !pauses.some((v) => overlaps(v, b)) && days.some((d) => b.start >= morningEnd(d) && b.end <= d.bed - s.windDownMinutes * MIN));
  kept = [...kept, ...near];
  // 待ち時間のある習慣（洗濯など）は、始まった枠を残すなら2つ目の枠（干すなど）も残す
  const finishedParents = kept.flatMap((b) => {
    const h = b.kind === "habit" ? input.habits.find((x) => x.id === b.refId) : undefined;
    return h?.finish && b.title === h.name ? [{ block: b, habit: h, finish: h.finish }] : [];
  });
  for (const { block, habit, finish } of finishedParents) {
    const start = block.start + finish.afterStartMinutes * MIN;
    const same = (x: Block) => x.kind === "habit" && x.refId === habit.id && x.title === finish.title && x.start === start;
    if (kept.some(same)) continue;
    kept.push(previous.find(same) ?? { kind: "habit", refId: habit.id, title: finish.title, start, end: start + finish.durationMinutes * MIN });
  }
  const movable = previous.filter((b) => !kept.includes(b));
  const routineBlocks: Block[] = sleep.filter((r) => r.end > firstDay && r.start < horizonEnd).map((r) => ({ kind: "routine", refId: "sleep:" + r.id, title: r.mode === "sleep" ? "睡眠（予定）" : "睡眠（記録）", start: r.start, end: r.end }));
  for (const d of days) {
    const cap = wakeShifts.has(d.dayStart) ? Infinity : d.leave ?? d.firstEvent?.start ?? Infinity;
    // 身支度は、人に会う予定がある日だけ
    const end = Math.min(morningEnd(d), cap);
    if (end > d.wake && end > now && !busy.some((v) => overlaps(v, { start: d.wake, end }))) {
      routineBlocks.push({ kind: "routine", refId: "routine", title: d.prep ? "朝ルーティン・身支度" : "朝ルーティン", start: d.wake, end });
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

  const habitById = new Map(input.habits.map((h) => [h.id, h]));
  const energyPerHourOf = (tag: Pick<Tag, "mode" | "energyPerHour">) => tag.energyPerHour ?? (tag.mode === "focus" ? 1 : 0.5);
  /** 待ち時間のある習慣は、2つ目の枠（干すなど）では数えない */
  const blockEnergy = (b: Block): number => {
    if (b.kind === "task") return (energyPerHourOf(tagOf(b.refId)) * (b.end - b.start)) / (60 * MIN);
    if (b.kind === "habit") {
      const h = habitById.get(b.refId);
      return h && b.title === h.name ? (h.energyCost ?? 0) : 0;
    }
    return 0;
  };
  kept.forEach((b) => addEnergy(b.start, blockEnergy(b)));

  let free = days
    .map((d) => ({ start: Math.max(d.wake, now), end: d.bed - s.windDownMinutes * MIN }))
    .filter((i) => i.end > i.start);
  free = subtract(free, [...busy, ...[...routineBlocks, ...kept].map(withBreak)]);

  const blocks: Block[] = [...kept, ...routineBlocks];
  const skippedHabits: SkippedHabit[] = [];
  const placedHabits: { block: Block; habit: Habit; releasable: boolean }[] = [];
  /** 待ち時間のある習慣の、待ち時間（子の習慣を置く場所） */
  const waits = new Map<string, { dayStart: number; wait: Interval }[]>();
  for (const { block, habit, finish } of finishedParents) {
    const wait = { start: block.end, end: block.start + finish.afterStartMinutes * MIN };
    waits.set(habit.id, [...(waits.get(habit.id) ?? []), { dayStart: dayOf(block.start)?.dayStart ?? localDayStart(block.start, s.tzOffsetMinutes), wait }]);
  }

  const placeHabitBlock = (habit: Habit, block: Block, releasable: boolean) => {
    blocks.push(block);
    placedHabits.push({ block, habit, releasable });
    free = subtract(free, [block]);
    addEnergy(block.start, blockEnergy(block));
  };

  // ---- 外出の日 ----
  // 家にいない時間（移動を含む）が長い日は、自炊や洗濯を入れず、食事は外食・お弁当にする
  const mergedAway = merge(away);
  const outingDays = new Set(
    days
      .filter(
        (d) =>
          intersect(mergedAway, { start: d.wake, end: d.bed }).reduce((sum, i) => sum + lengthMinutes(i), 0) >=
          s.outingDayAwayMinutes,
      )
      .map((d) => d.dayStart),
  );
  const dayIdx = (dayStart: number) => Math.round((dayStart - firstDay) / DAY_MS);

  /**
   * 前回から minDays〜maxDays 日の間隔で置く（洗濯など）。
   * 間隔の中に休日があれば休日の軽い日、なければ最後の2日のうち軽い日。外出の日は、最後の日を過ぎるときだけ使う
   */
  const placeByInterval = (
    habit: Habit,
    minDays: number,
    maxDays: number,
    tryPlaceOn: (d: DayPlan) => boolean,
    windowOf: (d: DayPlan) => Interval,
  ) => {
    const keptDays = kept
      .filter((b) => b.kind === "habit" && b.refId === habit.id && b.title === habit.name)
      .map((b) => dayIdx(localDayStart(b.start, s.tzOffsetMinutes)));
    const lastDone = input.habitLastDone?.[habit.id];
    // 記録がなければ、今日から置いてよいものとする
    let last = keptDays.length
      ? Math.max(...keptDays)
      : lastDone !== undefined
        ? dayIdx(localDayStart(lastDone, s.tzOffsetMinutes))
        : -minDays;
    // 今日から先の日だけ（夜中に前の日の続きがあっても、洗濯などは置かない）
    const list = days.filter((d) => dayIdx(d.dayStart) >= 0);
    for (let guard = 0; guard < list.length; guard++) {
      const from = Math.max(0, last + minDays);
      const to = last + maxDays;
      if (from >= list.length) break;
      const inWindow = list.filter((d) => {
        const i = dayIdx(d.dayStart);
        return i >= from && i <= to && windowOf(d).end > now;
      });
      if (inWindow.length === 0) {
        last = to;
        continue;
      }
      // 洗濯などは雨の日を避ける（外出の日と同じく、最後の日だけの手段にする）
      const unfit = (d: DayPlan) => outingDays.has(d.dayStart) || (!!habit.avoidRain && rainyDays.has(d.dayStart));
      const home = inWindow.filter((d) => !unfit(d));
      const lighter = (a: DayPlan, b: DayPlan) => energyOn(a) - energyOn(b) || a.dayStart - b.dayStart;
      const holidays = home.filter((d) => d.holiday).sort(lighter);
      const late = home.filter((d) => dayIdx(d.dayStart) >= to - 1).sort(lighter);
      const rest = home.filter((d) => !holidays.includes(d) && !late.includes(d)).sort(lighter);
      // 最後の日が範囲の中にあるときだけ、外出の日も最後の手段にする
      const lastResort = inWindow.filter((d) => unfit(d) && dayIdx(d.dayStart) === to);
      // 休日がなければ、間隔の終わりまで待ってから（間隔の終わりが先なら今は置かない）
      const order = holidays.length || to < list.length ? [...holidays, ...late, ...rest, ...lastResort] : [];
      const placed = order.find((d) => tryPlaceOn(d));
      if (!placed) {
        if (to < list.length) skippedHabits.push({ habitId: habit.id, dayStart: list[Math.min(to, list.length - 1)].dayStart, reason: "no_room" });
        last = to;
        continue;
      }
      last = dayIdx(placed.dayStart);
    }
  };

  /** きっかけの場面が終わる時刻（beforeHabit はその習慣が始まる時刻）。その日にその場面がなければ undefined */
  const cueAt = (cue: HabitCue, d: DayPlan): number | undefined => {
    if (cue.type === "routine") return morningEnd(d);
    if (cue.type === "home") return d.homeAt === undefined ? undefined : d.homeAt + s.restAfterAwayEventMinutes * MIN;
    const b = blocks
      .filter((x) => x.kind === "habit" && x.refId === cue.habitId && wakingDayOf(x.start) === d.dayStart)
      .sort((x, y) => x.start - y.start)[0];
    return cue.type === "beforeHabit" ? b?.start : b?.end;
  };
  /** その日に使う場面（なければ orElse をたどる）と、その時刻 */
  const cueOn = (cue: HabitCue | undefined, d: DayPlan): { cue: HabitCue; at: number } | undefined => {
    for (let c = cue; c; c = c.orElse) {
      const at = cueAt(c, d);
      if (at !== undefined) return { cue: c, at };
    }
    return undefined;
  };
  const cueEnd = (cue: HabitCue, d: DayPlan) => cueOn(cue, d)?.at;

  /** 習慣の時間帯。起床・就寝からの分で決めるものもある（朝の散歩、就寝前の入浴） */
  const habitWindow = (habit: Habit, d: DayPlan): Interval => {
    if (habit.meal && !habit.cue && !habit.anchor && wakeShifts.has(d.dayStart)) {
      const shift = Math.max(0, wakeShifts.get(d.dayStart)!);
      return { start: d.dayStart + habit.windowStart * MIN + shift, end: Math.min(d.bed, d.dayStart + habit.windowEnd * MIN + shift) };
    }
    if (habit.cue) {
      const on = cueOn(habit.cue, d);
      if (!on) return { start: d.dayStart, end: d.dayStart };
      const at = on.at;
      if (on.cue.type === "beforeHabit") {
        const end = at - CUE_GAP_MINUTES * MIN;
        return { start: end - (habit.durationMinutes + CUE_SLACK_MINUTES) * MIN, end };
      }
      const start = at + CUE_GAP_MINUTES * MIN;
      return { start, end: start + (habit.durationMinutes + CUE_SLACK_MINUTES) * MIN };
    }
    const base = habit.anchor === "wake" ? d.wake : habit.anchor === "bed" ? d.bed : d.dayStart;
    return { start: base + habit.windowStart * MIN, end: base + habit.windowEnd * MIN };
  };
  const rainyDays = new Set(input.rainyDays ?? []);
  /** 「今日は飛ばす」にした日 */
  const skipped = (habit: Habit, d: DayPlan) => (input.skipHabitDays?.[habit.id]?.includes(d.dayStart) ?? false) || (habit.skippable && pauses.some((r) => r.start < d.bed && r.end > Math.max(now, d.wake)));

  // ---- 習慣 ----
  // 飛ばせないものから置く。待ち時間に入れる子の習慣は最後
  // 朝ルーティンのあとの習慣（朝食）は最初に置き、昼食がそのあと3時間あけて入るようにする。
  // ほかのきっかけのある習慣は、きっかけの習慣（食事など）を置いたあと
  const rank = (h: Habit) => (h.duringHabitId ? 3 : h.cue?.type === "routine" ? -1 : h.cue ? 2 : h.skippable ? 1 : 0);
  const mealIds = new Set(input.habits.filter((h) => h.meal).map((h) => h.id));
  const habits = [...input.habits].sort((a, b) => rank(a) - rank(b));
  // 行動ポイントに余裕がある日だけの習慣（自炊など）は、タスクを置いたあとに置く
  const energyHabits = habits.filter((h) => h.frequency.type === "whenEnergy");
  const onTrackHabits = habits.filter((h) => h.frequency.type === "onTrackHoliday");
  for (const habit of habits) {
    if (habit.frequency.type === "whenEnergy" || habit.frequency.type === "onTrackHoliday") continue;
    const dur = habit.durationMinutes * MIN;
    const prevOf = (window: Interval) =>
      movable.find((b) => b.kind === "habit" && b.refId === habit.id && b.start >= window.start && b.start < window.end)?.start;

    if (habit.duringHabitId) {
      for (const { dayStart, wait } of waits.get(habit.duringHabitId) ?? []) {
        const d = days.find((x) => x.dayStart === dayStart);
        if (wait.end <= now || (d && skipped(habit, d))) continue;
        // 始まった枠の待ち時間に、もう置いてあれば重ねない
        if (kept.some((b) => b.kind === "habit" && b.refId === habit.id && b.start < wait.end && b.end > wait.start)) continue;
        const start = findStart(intersect(free, wait), dur, () => true, prevOf(wait));
        if (start === undefined) {
          skippedHabits.push({ habitId: habit.id, dayStart, reason: "no_room" });
          continue;
        }
        placeHabitBlock(habit, { kind: "habit", refId: habit.id, title: habit.name, start, end: start + dur }, habit.skippable);
      }
      continue;
    }

    const windowOf = (d: DayPlan): Interval => habitWindow(habit, d);

    /** その日の時間帯に置けたら true */
    const tryPlaceOn = (d: DayPlan): boolean => {
      if (skipped(habit, d)) return false;
      const window = windowOf(d);
      // 食事は予定の最中には置かない。予定で時間帯に空きがなければ、外で食べてくるものとして置かない（時間にも数えない）
      const finish = habit.finish;
      // 待ち時間のある作業は、2つ目の枠も空いていて、終わるまで家にいられること
      // 食事は、ほかの食事の始まりから3時間あける
      const meals = habit.meal
        ? blocks.filter((b) => b.kind === "habit" && b.refId !== habit.id && mealIds.has(b.refId) && Math.abs(b.start - window.start) < DAY_MS)
        : [];
      const ok = (st: number) => {
        if (meals.some((b) => Math.abs(b.start - st) < MEAL_GAP_MINUTES * MIN)) return false;
        if (!finish) return true;
        const fStart = st + finish.afterStartMinutes * MIN;
        const fEnd = fStart + finish.durationMinutes * MIN;
        const rest = subtract(free, [{ start: st, end: st + dur }]);
        return fitsIn(rest, fStart, fEnd) && !away.some((a) => a.start < fEnd && a.end > st);
      };
      // 雨の日は、散歩などを家の中でできる代わりにする
      const alt = habit.rainAlternative && rainyDays.has(d.dayStart) ? habit.rainAlternative : undefined;
      const len = alt ? alt.durationMinutes * MIN : dur;
      // きっかけのある習慣は、15分刻みにそろえず、きっかけのちょうど5分後から（直前に置くものは、ちょうど5分前に終える）
      const exact = cueOn(habit.cue, d)?.cue.type === "beforeHabit" ? window.end - len : habit.cue ? window.start : undefined;
      // 食事は家にいない時間（旅行・帰省など）にも置かない
      const room = habit.meal ? subtract(intersect(free, window), mergedAway) : intersect(free, window);
      let start = findStart(room, len, ok, exact ?? prevOf(window));
      // 「家で食べる」にした食事は、時間帯に入らなければ、時間帯の終わりから2時間まで遅らせて置く（寝る準備より前）。
      // 昼食が夜になるような、ありえない時刻には置かない
      if (start === undefined && habit.meal && input.mealAtHomeDays?.[habit.id]?.includes(d.dayStart)) {
        const later = { start: window.start, end: Math.min(window.end + MEAL_LATE_MINUTES * MIN, d.bed - s.windDownMinutes * MIN) };
        start = findStart(subtract(intersect(free, later), mergedAway), len, ok);
      }
      if (start === undefined) return false;
      placeHabitBlock(
        habit,
        { kind: "habit", refId: habit.id, title: alt?.title ?? habit.name, start, end: start + len },
        habit.skippable && !finish,
      );
      if (finish) {
        const fStart = start + finish.afterStartMinutes * MIN;
        placeHabitBlock(
          habit,
          { kind: "habit", refId: habit.id, title: finish.title, start: fStart, end: fStart + finish.durationMinutes * MIN },
          false,
        );
        const list = waits.get(habit.id) ?? [];
        list.push({ dayStart: d.dayStart, wait: { start: start + dur, end: fStart } });
        waits.set(habit.id, list);
      }
      return true;
    };

    if (habit.frequency.type === "interval") {
      placeByInterval(habit, habit.frequency.minDays, habit.frequency.maxDays, tryPlaceOn, windowOf);
      continue;
    }

    const hasKept = (d: DayPlan) => keptOn(habit.id, d);
    // きっかけの場面がない日（帰宅のない日など）には置かない
    const hasCue = (d: DayPlan) => !habit.cue || cueEnd(habit.cue, d) !== undefined;
    const doneBefore = (input.habitDoneDays?.[habit.id] ?? []).filter((t) => t < days[0].dayStart);
    const target = chooseHabitDays(habit, days, free, windowOf, hasKept, energyOn, doneBefore, s.tzOffsetMinutes).filter((d) => hasCue(d) && windowOf(d).end > now);
    for (const d of target) {
      if (!tryPlaceOn(d)) skippedHabits.push({ habitId: habit.id, dayStart: d.dayStart, reason: "no_room" });
    }
  }

  // 締切を守るために、飛ばしてよい習慣を1つ外して空きに戻す
  const releaseHabitBefore = (deadline: number): boolean => {
    // なるべく残す習慣（朝の散歩など）は、ほかに外せるものがないときだけ外す
    const can = (h: (typeof placedHabits)[number]) => h.releasable && h.block.start >= now && h.block.start < deadline;
    let idx = placedHabits.findIndex((h) => can(h) && !h.habit.keepLast);
    if (idx < 0) idx = placedHabits.findIndex(can);
    if (idx < 0) return false;
    const [{ block }] = placedHabits.splice(idx, 1);
    blocks.splice(blocks.indexOf(block), 1);
    free = merge([...free, { start: block.start, end: block.end }]);
    addEnergy(block.start, -blockEnergy(block));
    skippedHabits.push({ habitId: block.refId, dayStart: localDayStart(block.start, s.tzOffsetMinutes), reason: "deadline" });
    return true;
  };

  // ---- タスク ----
  const avoidWindows = input.avoidWindows ?? [];
  const focusZonesOf = (d: DayPlan) => ({
    afterWakeEnd: (d.leave ?? morningEnd(d)) + s.avoidFocusAfterWakeMinutes * MIN,
    beforeBedStart: d.bed - (s.windDownMinutes + s.avoidFocusBeforeBedMinutes) * MIN,
  });
  const dayLoad = new Map<number, number>();
  const addLoad = (b: Block) => {
    const d = dayOf(b.start);
    if (d) dayLoad.set(d.dayStart, (dayLoad.get(d.dayStart) ?? 0) + (b.end - b.start) / MIN);
  };
  kept.filter((b) => b.kind === "task").forEach(addLoad);
  // 食後など、習慣のすぐあとは集中系を避ける（食事は飛ばさないので、ここで一度だけ作る）
  const afterHabit = placedHabits
    .filter((h) => h.habit.avoidFocusAfterMinutes)
    .map((h) => ({ start: h.block.end, end: h.block.end + h.habit.avoidFocusAfterMinutes! * MIN }));
  const dayFreeMinutes = (d: DayPlan) =>
    intersect(free, { start: d.wake, end: d.bed }).reduce((sum, i) => sum + lengthMinutes(i), 0);

  // 帰宅時に答えた体力：少ない夜はタスクを入れず、ふつうの夜は事務系だけを少し
  const evenings = days.flatMap((d) => {
    const level = input.eveningEnergy?.[d.dayStart];
    return level && level !== "high" && d.homeAt !== undefined ? [{ dayStart: d.dayStart, start: d.homeAt, end: d.bed, level }] : [];
  });
  const eveningUsed = new Map<number, number>();
  const eveningOf = (d: DayPlan, t: number) => evenings.find((e) => e.dayStart === d.dayStart && t >= e.start && t < e.end);

  const shortfalls: Shortfall[] = [];
  const deadlineOf = (task: Task): number | undefined => {
    const related = task.relatedEventId ? eventDeadline.get(task.relatedEventId) : undefined;
    return related !== undefined ? Math.min(related, task.deadline ?? Infinity) : task.deadline;
  };
  const byDeadlineThenPriority = (a: Task, b: Task): number => {
    // 「ほかを後に回す」を選んだタスクは、締切の順より先に置く
    if (!!a.first !== !!b.first) return a.first ? -1 : 1;
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
      .reduce((sum, b) => sum + (b.end - b.start), 0);
    // 残り時間から実績を引くのは枠の終了時。途中の枠も全長を予約済みとして差し引く。
    let remaining = Math.max(0, estimateMinutes(task, tag) - keptMs / MIN);

    const ownDeadline = deadlineOf(task);
    // 締切が配置期間（14日）より先でも、4週間以内なら期間の中に置く（締切のないタスクと同じ扱い。間に合わない警告は出さない）
    if (ownDeadline !== undefined && ownDeadline > now + FAR_TASK_DAYS * DAY_MS) continue;
    const beyondHorizon = ownDeadline === undefined || ownDeadline > horizonEnd;
    const deadline = Math.min(ownDeadline ?? horizonEnd, horizonEnd);
    const justBefore = task.timing === "justBefore" && !beyondHorizon;
    const prevStarts = new Set(movable.filter((b) => b.kind === "task" && b.refId === task.id).map((b) => b.start));
    // 「時間帯の外にも入れる」を選んだタスクは、「入れない」時間帯と体力が少ない夜にも置く
    const hardAvoid = task.stretch
      ? []
      : [...avoidIntervalsFor(task, avoidWindows, allDays, s.tzOffsetMinutes, true), ...evenings.filter((e) => e.level === "low" || tag.mode === "focus")];
    hardAvoid.push(...pauses);
    const softAvoid = avoidIntervalsFor(task, avoidWindows, allDays, s.tzOffsetMinutes, false);
    const restMinutes = tag.restAfterMinutes ?? s.breakMinutes;
    // まずは1日の余白を守って置く。締切に間に合わないときだけ余白を削る
    let keepSlack = true;

    while (remaining > 0) {
      const need = Math.min(remaining, tag.maxChunkMinutes);
      const minLen = Math.min(tag.minChunkMinutes, remaining);
      let best: { start: number; len: number; penalty: number } | undefined;
      const freeByDay = new Map(days.map((d) => [d.dayStart, dayFreeMinutes(d)]));

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
          for (const a of afterHabit) starts.push(ceilToStep(a.end));
        }
        for (const e of endsBefore) starts.push(floorToStep(e - need * MIN));

        for (const st of new Set(starts)) {
          if (st < iv.start || st >= slotEnd) continue;
          const avail = (slotEnd - st) / MIN;
          let len = avail >= need ? need : floorMinutesToStep(avail);
          const evening = task.stretch ? undefined : eveningOf(d0, st);
          if (evening) len = Math.min(len, floorMinutesToStep(NORMAL_EVENING_TASK_MINUTES - (eveningUsed.get(evening.dayStart) ?? 0)));
          if (len < minLen || len <= 0) continue;
          const end = st + len * MIN;
          if (keepSlack && (freeByDay.get(d0.dayStart) ?? 0) - len - restMinutes < s.minSlackMinutesPerDay) continue;

          const strategy = s.taskStrategy ?? "standard";
          let penalty = justBefore
            ? ((deadline - end) / DAY_MS) * PENALTY.perDayBeforeDeadline
            : strategy === "early"
              ? dayIndex(d0) * PENALTY.perDayLaterEarly
              : strategy === "spread"
                ? 0
                : dayIndex(d0) * PENALTY.perDayLater;
          // 分散：同じタスクをその日にすでに置いた分だけ減点して、ほかの日へ散らす
          if (strategy === "spread") {
            const sameDay = blocks
              .filter((b) => b.kind === "task" && b.refId === task.id && b.start >= d0.dayStart && b.start < d0.dayStart + DAY_MS)
              .reduce((sum, b) => sum + (b.end - b.start) / MIN, 0);
            penalty += (sameDay / 60) * PENALTY.sameTaskSameDay;
          }
          if (prevStarts.size > 0 && !prevStarts.has(st)) penalty += PENALTY.movedFromBefore;
          if (len < need) penalty += tag.mode === "focus" ? PENALTY.focusSplit : PENALTY.split;
          if (tag.mode === "focus") {
            if (st < zones.afterWakeEnd) penalty += PENALTY.focusRightAfterWake;
            if (end > zones.beforeBedStart) penalty += PENALTY.focusBeforeBed;
            if (overlapMinutes(afterHabit, st, end) > 0) penalty += PENALTY.focusAfterHabit;
          } else if (lengthMinutes(iv) > LONG_SLOT_MINUTES) {
            penalty += PENALTY.gapTaskInLongSlot;
          }
          const avoided = overlapMinutes(softAvoid, st, end);
          if (avoided > 0) penalty += PENALTY.avoidWindow * Math.max(0.5, avoided / len);
          if ((dayLoad.get(d0.dayStart) ?? 0) + len > s.dailyTaskCapMinutes) penalty += PENALTY.overDailyCap;
          // 行動ポイントが上限を超える日は、超えた分だけ減点する（締切に余裕があれば軽い日へ回る）
          const chunkEnergy = (energyPerHourOf(tag) * len) / 60;
          const over = energyOn(d0) + chunkEnergy - s.dailyEnergyBudget;
          if (over > 0) penalty += PENALTY.overEnergyPerPoint * Math.min(over, chunkEnergy);

          if (!best || penalty < best.penalty || (penalty === best.penalty && st < best.start)) {
            best = { start: st, len, penalty };
          }
        }
      }

      if (!best) {
        if (!beyondHorizon && keepSlack) {
          keepSlack = false;
          continue;
        }
        if (!beyondHorizon && releaseHabitBefore(deadline)) {
          keepSlack = true;
          continue;
        }
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
      const d1 = dayOf(block.start);
      const evening = d1 && eveningOf(d1, block.start);
      if (evening) eveningUsed.set(evening.dayStart, (eveningUsed.get(evening.dayStart) ?? 0) + best.len);
      addEnergy(block.start, blockEnergy(block));
      remaining -= best.len;
      keepSlack = true;
    }
  }

  // ---- 余裕のある日だけの習慣（自炊など） ----
  for (const habit of energyHabits) {
    const dur = habit.durationMinutes * MIN;
    const cost = habit.energyCost ?? 0;
    for (const d of days) {
      if (keptOn(habit.id, d)) continue;
      const window = habitWindow(habit, d);
      if (window.end <= now || skipped(habit, d) || outingDays.has(d.dayStart) || energyOn(d) + cost > s.dailyEnergyBudget) continue;
      const prev = movable.find((b) => b.kind === "habit" && b.refId === habit.id && b.start >= window.start && b.start < window.end);
      // 食事の前の自炊などは、食事のちょうど5分前に終える
      const on = cueOn(habit.cue, d);
      const exact = on ? (on.cue.type === "beforeHabit" ? window.end - dur : window.start) : prev?.start;
      const start = findStart(intersect(free, window), dur, () => true, exact);
      if (start === undefined) continue;
      placeHabitBlock(habit, { kind: "habit", refId: habit.id, title: habit.name, start, end: start + dur }, habit.skippable);
    }
  }

  // ---- 見通しが順調な休日だけの習慣（自己成長の時間など） ----
  // 締切に間に合わないタスクが1つでもあれば置かない（まずタスクを片付ける）
  if (shortfalls.length === 0) {
    for (const habit of onTrackHabits) {
      const dur = habit.durationMinutes * MIN;
      for (const d of days.filter((x) => x.holiday)) {
        if (keptOn(habit.id, d)) continue;
        const window = habitWindow(habit, d);
        if (window.end <= now || skipped(habit, d)) continue;
        const prev = movable.find((b) => b.kind === "habit" && b.refId === habit.id && b.start >= window.start && b.start < window.end);
        const start = findStart(intersect(free, window), dur, () => true, prev?.start);
        if (start === undefined) continue;
        placeHabitBlock(habit, { kind: "habit", refId: habit.id, title: habit.name, start, end: start + dur }, habit.skippable);
      }
    }
  }

  blocks.sort((a, b) => a.start - b.start);
  const freeGaps = free.filter((i) => lengthMinutes(i) >= MIN_GAP_MINUTES);

  // 上限を超える日と、帰宅時に体力が少ないと答えた夜は、空き時間に入る発散を1つ提案する
  const dayEnergy: DayEnergy[] = days.map((d) => {
    const used = Math.round(energyOn(d) * 10) / 10;
    const entry: DayEnergy = { dayStart: d.dayStart, used, budget: s.dailyEnergyBudget, outingDay: outingDays.has(d.dayStart) };
    const evening = input.eveningEnergy?.[d.dayStart];
    if (evening) entry.evening = evening;
    const tired = evening === "low" && d.homeAt !== undefined;
    if (used <= s.dailyEnergyBudget && !tired) return entry;
    const from = tired ? Math.max(now, d.homeAt!) : Math.max(now, d.wake);
    for (const opt of input.recoveryOptions ?? []) {
      const startIn = (g: Interval) => ceilToStep(Math.max(g.start, from));
      const gap = freeGaps.find(
        (g) =>
          g.start < d.bed &&
          g.end > from &&
          g.end - startIn(g) >= opt.durationMinutes * MIN &&
          // 夜中0時を過ぎたら、その日の 24:00 以降として比べる（0:00 の昼寝を出さない）
          (opt.latestStartMinuteOfDay === undefined || (startIn(g) - d.dayStart) / MIN <= opt.latestStartMinuteOfDay),
      );
      if (gap) {
        const start = startIn(gap);
        entry.suggestion = { ...opt, start, end: start + opt.durationMinutes * MIN };
        break;
      }
    }
    return entry;
  });

  return { rhythmResets: resets, movedBlocks: movable.filter((b) => b.start >= now && b.start < firstDay + DAY_MS && !blocks.some((x) => x.kind === b.kind && x.refId === b.refId && x.start === b.start && x.end === b.end)), dayPlans: days, blocks, skippedHabits, shortfalls, travelQuestions, freeGaps, dayEnergy };
}

function chooseHabitDays(
  habit: Habit,
  days: DayPlan[],
  free: Interval[],
  windowOf: (d: DayPlan) => Interval,
  hasKept: (d: DayPlan) => boolean,
  energyOn: (d: DayPlan) => number,
  doneBefore: number[],
  tz: number,
): DayPlan[] {
  if (habit.frequency.type === "daily") return days.filter((d) => !hasKept(d));
  if (habit.frequency.type !== "weekly") return [];
  const times = habit.frequency.times;
  // 行動ポイントを使う習慣（洗濯など）は、軽い日から選ぶ
  const heavy = (habit.energyCost ?? 0) > 0;

  // 月曜始まりの週ごとに数える。今週すでにやった日（今日より前）も回数に入れる
  const weekOf = (t: number) => localDayStart(t, tz) - ((localWeekday(t, tz) + 6) % 7) * DAY_MS;
  const weeks = new Map<number, DayPlan[]>();
  for (const d of days) weeks.set(weekOf(d.dayStart), [...(weeks.get(weekOf(d.dayStart)) ?? []), d]);
  const chosen: DayPlan[] = [];
  for (const [weekStart, week] of weeks) {
    const done = new Set(doneBefore.filter((t) => weekOf(t) === weekStart).map((t) => localDayStart(t, tz))).size;
    const needed = times - done - week.filter(hasKept).length;
    if (needed <= 0) continue;
    const roomy = week
      .filter((d) => !hasKept(d))
      .map((d) => ({ d, room: intersect(free, windowOf(d)).reduce((sum, i) => sum + lengthMinutes(i), 0) }))
      .filter((x) => x.room >= habit.durationMinutes)
      .sort((a, b) => (heavy ? energyOn(a.d) - energyOn(b.d) : 0) || b.room - a.room || a.d.dayStart - b.d.dayStart);
    chosen.push(...roomy.slice(0, needed).map((x) => x.d));
  }
  return chosen.sort((a, b) => a.dayStart - b.dayStart);
}

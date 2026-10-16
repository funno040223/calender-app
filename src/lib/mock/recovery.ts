import { estimateMinutes, resolveTravel, type PlanResult, type RhythmReset } from "@/lib/scheduler";
import { DAY_MS, MIN, dayStartOf } from "./jst";
import { dateKeyOf, type MockData } from "./model";
import { pressBed, recordReset } from "./night";
import { captureTaskBlocks } from "./progress";
import { planEvents, rainyDayKeys, type MockState } from "./state";

export function resetConflicts(state: MockState, reset: RhythmReset) {
  if (reset.mode === "tired") return [];
  return [
    ...planEvents(state, state.classEvents, state.googleEvents).filter((e) => !e.allDay).map((e) => {
      const t = resolveTravel(e, state.places, state.settings);
      return { title: e.title, start: e.start - (t.atHome ? 0 : t.minutes * MIN), end: e.end + (t.atHome ? 0 : t.minutes * MIN) };
    }),
    ...state.blocks.filter((b) => b.pinned),
  ].filter((e) => e.start < reset.end && e.end > reset.start);
}

/**
 * 睡眠・休む時間を入れる。今から寝る（sleep）・起きたところ（woke）は眠りの記録に（planned は記録するときの予定の就寝・起床）、
 * 休む（tired）は休む時間に残す
 */
export function resetRhythm(d: MockData, reset: RhythmReset, now: number, planned: { bed?: number; wake?: number } = {}): MockData {
  if (!Number.isFinite(reset.start) || !Number.isFinite(reset.end) || reset.end <= reset.start || reset.end - reset.start > 48 * 60 * MIN) return d;
  d = captureTaskBlocks(d, now);
  const logs = { ...d.taskBlockLog };
  // 睡眠中の自動枠は「できなかった」。睡眠前の途中までの作業は未確認で残す。
  for (const [key, b] of Object.entries(logs)) {
    if (b.start > now || b.end <= reset.start || b.reviewedAt !== undefined || b.counted) continue;
    if (d.blocks.some((x) => x.pinned && `${x.refId}:${x.start}` === key)) continue;
    if (reset.mode !== "tired" && b.start >= reset.start && b.start < reset.end) logs[key] = { ...logs[key], reviewedAt: now, outcome: "none" };
    else if (reset.mode !== "tired" && b.start < reset.start && b.end > reset.start) logs[key] = { ...logs[key], end: reset.start };
    else if (b.start < now && b.end > now) logs[key] = { ...logs[key], end: now };
  }
  // 重なる休む時間は、過ぎた分（新しい時間の始まりまで）だけ残す
  const pauses = trimPauses(d.rhythmResets ?? [], reset.start).filter((r) => r.end > now - 60 * DAY_MS && !(r.start < reset.end && r.end > reset.start));
  return { ...d, taskBlockLog: logs,
    rhythmResets: reset.mode === "tired" ? [...pauses, { ...reset, mode: "tired" }] : pauses,
    sleepLogs: reset.mode === "tired" ? d.sleepLogs : recordReset(d.sleepLogs, { mode: reset.mode, start: reset.start, end: reset.end }, planned, now),
    // 睡眠中に過ぎた食事も組み直す。固定した枠は衝突を表示して維持する。
    blocks: d.blocks.filter((b) => b.pinned || b.end <= Math.min(now, reset.start)),
  };
}

/**
 * 「今から何する？」で使える、今からの時間。自分で「今やる」と決めたので、作業のあとの休憩・帰宅後の休憩は数えない。
 * 守るのは、予定（移動を含む）・今の計画の習慣や朝ルーティン・始まった作業・睡眠・寝る準備だけ
 */
export function workNowGap(state: MockState, now: number): { start: number; end: number } | undefined {
  const r = state.result;
  const day = r.dayPlans.find((d) => now >= d.wake && now < d.bed);
  if (!day) return undefined;
  const hard = [
    ...planEvents(state, state.classEvents, state.googleEvents)
      .filter((e) => !e.allDay)
      .map((e) => {
        const t = resolveTravel(e, state.places, state.settings);
        const pad = t.atHome ? 0 : t.minutes * MIN;
        return { start: e.start - pad, end: e.end + pad };
      }),
    ...r.blocks.filter((b) => b.kind !== "task" || b.pinned || b.start < now),
    ...(r.rhythmResets ?? []).filter((x) => x.mode !== "tired"),
  ];
  if (hard.some((h) => h.start <= now && h.end > now)) return undefined;
  const end = Math.min(day.bed - state.settings.windDownMinutes * MIN, ...hard.filter((h) => h.start > now).map((h) => h.start));
  return end > now ? { start: now, end } : undefined;
}

/** 「今から何する？」に出すタスクの締切（今日から3週間まで。自動で置くのは締切の2週間前からなので、それより先も自分で選べる） */
export const WORK_NOW_DAYS = 21;

/** 「今から何する？」のタスクの候補。締切の近い順にすべて（締切のないものは最後） */
export function workNowChoices(state: MockState, now: number, minutes: number) {
  if (!Number.isFinite(minutes) || minutes < 5 || minutes > 180) return [];
  const gap = workNowGap(state, now);
  if (!gap) return [];
  return [...state.tasks].sort((a, b) => (a.deadline ?? Infinity) - (b.deadline ?? Infinity) || b.priority - a.priority).flatMap((task) => {
    const tag = state.planTags.find((t) => t.id === task.tagId);
    const length = Math.min(minutes, estimateMinutes(task, tag));
    if (length < 5 || now + length * MIN > gap.end) return [];
    if (task.deadline !== undefined && task.deadline > now + WORK_NOW_DAYS * DAY_MS) return [];
    return [{ task, minutes: length, start: now, end: now + length * MIN }];
  });
}

/**
 * 今からできる習慣（散歩・自己成長・家での運動など）。時刻が決まるもの（食事・就寝前の入浴・自炊）、
 * 待ち時間のある作業、今日もう始めた・記録したものは出さない。雨の日は代わりのもの（光を浴びる）
 */
export function workNowHabits(state: MockState, now: number, minutes: number) {
  if (!Number.isFinite(minutes) || minutes < 5 || minutes > 180) return [];
  const gap = workNowGap(state, now);
  if (!gap) return [];
  const today = dayStartOf(now);
  const key = dateKeyOf(now);
  const rainy = rainyDayKeys(state).includes(key);
  const started = (id: string) => !!state.habitLogs[key]?.[id] || state.result.blocks.some((b) => b.kind === "habit" && b.refId === id && b.start >= today && b.start <= now);
  return state.habits.flatMap((h) => {
    if (h.meal || h.anchor === "bed" || h.finish || h.duringHabitId || h.frequency.type === "whenEnergy" || started(h.id)) return [];
    const alt = rainy ? h.rainAlternative : undefined;
    const length = Math.min(minutes, alt?.durationMinutes ?? h.durationMinutes);
    if (length < 5 || now + length * MIN > gap.end) return [];
    return [{ habit: h, title: alt?.title ?? h.name, minutes: length, start: now, end: now + length * MIN }];
  }).slice(0, 3);
}

/** 選んだ習慣を今から始める（今日のあとの枠は、組み直しで外れる） */
export function startHabitNow(state: MockState, habitId: string, minutes: number, now: number): MockData {
  const choice = workNowHabits(state, now, minutes).find((c) => c.habit.id === habitId);
  if (!choice) return state;
  return { ...state, blocks: [...state.blocks, { kind: "habit", refId: habitId, title: choice.title, start: choice.start, end: choice.end, pinned: true }] };
}

export function startWorkNow(state: MockState, taskId: string, minutes: number, now: number): MockData {
  const choice = workNowChoices(state, now, minutes).find((c) => c.task.id === taskId);
  if (!choice) return state;
  return { ...state, blocks: [...state.blocks.filter((b) => b.pinned || b.start < now || b.kind !== "task"),
    { kind: "task", refId: taskId, title: choice.task.title, start: choice.start, end: choice.end, pinned: true }],
  };
}

// ---------- 今から寝る・休む（今日の画面の「今から何する？」と「おやすみ」） ----------

/** 休む時間を at で終える（at より前に始まった分は残し、あとに始まるものは消す） */
function trimPauses<T extends { start: number; end: number }>(pauses: T[], at: number): T[] {
  return pauses.flatMap((r) => (r.end <= at ? [r] : r.start < at ? [{ ...r, end: at }] : []));
}

/**
 * 「今から何する？」の「寝る」：いつ押しても、その夜の眠り（おやすみのカードの「寝る」と同じ。起床を見積もる）。
 * その夜＝今が入っている日（起床〜就寝）、就寝を過ぎていれば（朝帰り・徹夜）就寝を過ぎたいちばん近い日。休んでいる時間はここで終える
 */
export function sleepNow(d: MockData, result: Pick<PlanResult, "dayPlans" | "lastNight">, now: number): MockData {
  const days: { dayStart: number; bed: number; wake?: number }[] = [...result.dayPlans, ...(result.lastNight ? [result.lastNight] : [])];
  const night =
    result.dayPlans.find((x) => now >= x.wake && now < x.bed) ?? days.filter((x) => x.bed <= now).sort((a, b) => b.bed - a.bed)[0];
  if (!night) return d;
  return { ...d, rhythmResets: trimPauses(d.rhythmResets ?? [], now), sleepLogs: pressBed(d.sleepLogs, dateKeyOf(night.dayStart + DAY_MS), now, night.bed) };
}

/** 休む時間を今で終える（まだ始まっていなければ消す）。これからの自動の枠は、今から置き直す */
export function endPause(d: MockData, id: string, now: number): MockData {
  const rhythmResets = (d.rhythmResets ?? []).flatMap((r) => (r.id !== id ? [r] : r.start < now ? [{ ...r, end: Math.min(r.end, now) }] : []));
  return { ...d, rhythmResets, blocks: d.blocks.filter((b) => b.pinned || b.start <= now) };
}

/** 今の休む時間 */
export const activePause = (d: Pick<MockData, "rhythmResets">, now: number) => (d.rhythmResets ?? []).find((r) => r.start <= now && r.end > now);

/** 睡眠と重なって、もう間に合わない予定（お知らせに出す） */
export function sleepConflicts(state: MockState, now: number): { title: string; start: number; end: number }[] {
  return [
    ...(state.result.rhythmResets ?? []).flatMap((r) => resetConflicts(state, r)),
    ...state.result.dayPlans.flatMap((d) => (d.firstEvent && Math.min(d.leave ?? Infinity, d.firstEvent.start) < d.wake ? [d.firstEvent] : [])),
  ].filter((c, i, all) => c.end > now && all.findIndex((x) => x.title === c.title && x.start === c.start) === i);
}

// 夜中（0時を過ぎて、まだ寝る前）は、今夜の就寝まで
export const defaultPauseEnd = (state: MockState, now: number) => {
  const day = state.result.dayPlans.find((d) => now >= d.wake && now < d.bed) ?? state.result.dayPlans.find((d) => d.dayStart === dayStartOf(now));
  return Math.max(now + 30 * MIN, day?.bed ?? dayStartOf(now) + DAY_MS);
};

/** 「今から何する？」の最初の分数：今からの時間（5分刻みで切り捨て、5〜180分）。作業できる時間でなければ undefined */
export function freeNowMinutes(gap: { start: number; end: number } | undefined, now: number): number | undefined {
  if (!gap) return undefined;
  const min = Math.floor((gap.end - now) / 60_000 / 5) * 5;
  return min >= 5 ? Math.min(180, min) : undefined;
}

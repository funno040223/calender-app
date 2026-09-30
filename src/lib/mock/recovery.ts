import { estimateMinutes, resolveTravel, type RhythmReset } from "@/lib/scheduler";
import { DAY_MS, MIN, dayStartOf } from "./jst";
import type { MockData } from "./model";
import { captureTaskBlocks } from "./progress";
import { planEvents, type MockState } from "./state";

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

export function resetRhythm(d: MockData, reset: RhythmReset, now: number): MockData {
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
  return { ...d, taskBlockLog: logs,
    rhythmResets: [...(d.rhythmResets ?? []).filter((r) => r.end > now - 60 * DAY_MS && !(r.start < reset.end && r.end > reset.start)), reset],
    // 睡眠中に過ぎた食事も組み直す。固定した枠は衝突を表示して維持する。
    blocks: d.blocks.filter((b) => b.pinned || b.end <= Math.min(now, reset.start)),
  };
}

/** 他の固定枠と習慣を守り、動かせるタスクだけを除いた「今」の空き時間を調べる。 */
/**
 * 「今から何分できる？」で使える、今からの時間。自分で「今やる」と決めたので、作業のあとの休憩・帰宅後の休憩は数えない。
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

export function workNowChoices(state: MockState, now: number, minutes: number) {
  if (!Number.isFinite(minutes) || minutes < 5 || minutes > 180) return [];
  const gap = workNowGap(state, now);
  if (!gap) return [];
  return [...state.tasks].sort((a, b) => (a.deadline ?? Infinity) - (b.deadline ?? Infinity) || b.priority - a.priority).flatMap((task) => {
    const tag = state.tags.find((t) => t.id === task.tagId);
    const length = Math.min(minutes, estimateMinutes(task, tag));
    if (length < 5 || now + length * MIN > gap.end) return [];
    if (task.deadline !== undefined && task.deadline > now + state.settings.planningDays * DAY_MS) return [];
    return [{ task, minutes: length, start: now, end: now + length * MIN }];
  }).slice(0, 3);
}

export function startWorkNow(state: MockState, taskId: string, minutes: number, now: number): MockData {
  const choice = workNowChoices(state, now, minutes).find((c) => c.task.id === taskId);
  if (!choice) return state;
  return { ...state, blocks: [...state.blocks.filter((b) => b.pinned || b.start < now || b.kind !== "task"),
    { kind: "task", refId: taskId, title: choice.task.title, start: choice.start, end: choice.end, pinned: true }],
  };
}

// 夜中（0時を過ぎて、まだ寝る前）は、今夜の就寝まで
export const defaultPauseEnd = (state: MockState, now: number) => {
  const day = state.result.dayPlans.find((d) => now >= d.wake && now < d.bed) ?? state.result.dayPlans.find((d) => d.dayStart === dayStartOf(now));
  return Math.max(now + 30 * MIN, day?.bed ?? dayStartOf(now) + DAY_MS);
};

/** 「今から何分できる？」の最初の分数：今からの時間（5分刻みで切り捨て、5〜180分）。作業できる時間でなければ undefined */
export function freeNowMinutes(gap: { start: number; end: number } | undefined, now: number): number | undefined {
  if (!gap) return undefined;
  const min = Math.floor((gap.end - now) / 60_000 / 5) * 5;
  return min >= 5 ? Math.min(180, min) : undefined;
}

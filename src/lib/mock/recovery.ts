import { estimateMinutes, resolveTravel, type RhythmReset } from "@/lib/scheduler";
import { DAY_MS, MIN, dayStartOf } from "./jst";
import type { MockData } from "./model";
import { captureTaskBlocks } from "./progress";
import { planEvents, replan, type MockState } from "./state";

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
export function workNowChoices(state: MockState, now: number, minutes: number) {
  if (!Number.isFinite(minutes) || minutes < 5 || minutes > 180) return [];
  const locked = state.blocks.filter((b) => b.kind === "task" && (b.pinned || b.start < now) && b.end > now);
  const base = replan({ ...state, tasks: [], blocks: state.blocks.filter((b) => b.kind !== "task"),
    events: [...state.events, ...locked.map((b) => ({ id: `busy:${b.refId}:${b.start}`, title: b.title, start: b.start, end: b.end, atHome: true as const }))],
  }, state.googleEvents, now);
  const gap = base.result.freeGaps.find((g) => g.start <= now && g.end > now);
  if (!gap) return [];
  return [...state.tasks].sort((a, b) => (a.deadline ?? Infinity) - (b.deadline ?? Infinity) || b.priority - a.priority).flatMap((task) => {
    const tag = state.tags.find((t) => t.id === task.tagId);
    const length = Math.min(minutes, estimateMinutes(task, tag));
    const rest = tag?.restAfterMinutes ?? state.settings.breakMinutes;
    if (length < 5 || now + (length + rest) * MIN > gap.end) return [];
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

export const defaultPauseEnd = (state: MockState, now: number) => Math.max(now + 30 * MIN, state.result.dayPlans.find((d) => d.dayStart === dayStartOf(now))?.bed ?? dayStartOf(now) + DAY_MS);

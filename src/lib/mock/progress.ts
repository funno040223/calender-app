import { estimateMinutes } from "@/lib/scheduler";
import { MIN } from "./jst";
import { taskBlockKey, type MockData, type TaskBlockLog } from "./model";

/**
 * 進み具合で確かめた作業時間（分）。「予定どおり」「完了」と、以前の版で残り時間から引いた枠だけを数える。
 * 「残り時間を直した」枠は、作業した長さが分からないので数えない（実績からの見積もりに使う）
 */
export function confirmedWorkMinutes(b: TaskBlockLog): number {
  return b.workedMinutes ?? (b.outcome === "done" || b.counted ? (b.end - b.start) / MIN : 0);
}

/** 作業した枠の時間（分）。確かめた作業時間に、「残り時間を直した」枠（その枠で作業はした）も枠の長さで足す（記録の画面） */
export function usedSlotMinutes(b: TaskBlockLog): number {
  return b.outcome === "partial" ? (b.end - b.start) / MIN : confirmedWorkMinutes(b);
}

/** タスクごとの、確かめた作業時間の合計（分） */
export function workedByTask(log: Record<string, TaskBlockLog>): Map<string, number> {
  const spent = new Map<string, number>();
  for (const [key, b] of Object.entries(log)) {
    const worked = confirmedWorkMinutes(b);
    if (!worked) continue;
    const id = key.slice(0, key.lastIndexOf(":"));
    spent.set(id, (spent.get(id) ?? 0) + worked);
  }
  return spent;
}

/** 予定の経過は実行とは区別する。未回答の枠を翌日以降も残す。 */
export function captureTaskBlocks(d: MockData, now: number): MockData {
  const logs = { ...d.taskBlockLog };
  for (const b of d.blocks) {
    if (b.kind !== "task" || b.start > now) continue;
    const key = taskBlockKey(b.refId, b.start);
    if (!logs[key]) logs[key] = { title: b.title, start: b.start, end: b.end };
  }
  return { ...d, taskBlockLog: logs };
}

export function pendingWork(d: MockData, now: number) {
  const logs = captureTaskBlocks(d, now).taskBlockLog;
  return d.tasks.flatMap((task) => {
    const entries = Object.entries(logs).filter(([key, l]) =>
      key.slice(0, key.lastIndexOf(":")) === task.id && l.end <= now && !l.counted && l.reviewedAt === undefined,
    );
    if (!entries.length) return [];
    const before = estimateMinutes(task, d.tags.find((t) => t.id === task.tagId));
    const minutes = entries.reduce((sum, [, l]) => sum + Math.round((l.end - l.start) / MIN), 0);
    return [{ task, entries, before, minutes, expected: Math.max(0, before - minutes) }];
  });
}

/** 見えていた枠だけを一度確定。新しい枠や別端末で確定済みの枠は再処理しない。 */
export function confirmWork(d: MockData, taskId: string, keys: string[], outcome: NonNullable<TaskBlockLog["outcome"]>, now: number, remaining?: number): MockData {
  d = captureTaskBlocks(d, now);
  const task = d.tasks.find((t) => t.id === taskId);
  if (!task) return d;
  const entries = keys.flatMap((key) => {
    const l = d.taskBlockLog[key];
    return l && key.slice(0, key.lastIndexOf(":")) === taskId && l.end <= now && !l.counted && l.reviewedAt === undefined ? [[key, l] as const] : [];
  });
  if (!entries.length) return d;
  const before = estimateMinutes(task, d.tags.find((t) => t.id === task.tagId));
  const minutes = entries.reduce((sum, [, l]) => sum + Math.round((l.end - l.start) / MIN), 0);
  const after = outcome === "done" ? 0 : outcome === "none" ? before
    : outcome === "partial" && remaining !== undefined && Number.isFinite(remaining) ? Math.max(0, remaining)
    : Math.max(0, before - minutes);
  const logs = { ...d.taskBlockLog };
  // 一部実行はタスク単位で残り時間を指定する。各枠を丸ごと達成にしない。
  for (const [key, l] of entries) logs[key] = { ...l, reviewedAt: now, outcome,
    workedMinutes: outcome === "planned" ? Math.round((l.end - l.start) / MIN) : undefined,
    doneAt: outcome === "planned" || outcome === "done" ? l.doneAt ?? now : l.doneAt };
  const completed = outcome === "done" || (outcome !== "none" && after === 0);
  return { ...d, taskBlockLog: logs,
    tasks: completed ? d.tasks.filter((t) => t.id !== taskId) : d.tasks.map((t) => t.id === taskId ? { ...t, remainingMinutes: after } : t),
    doneTasks: completed ? [...d.doneTasks, { id: task.id, title: task.title, deadline: task.deadline, tagId: task.tagId, estimateMinutes: task.durationMinutes, doneAt: now }] : d.doneTasks,
    taskChecks: { ...d.taskChecks, [`${taskId}:${now}:${entries[0][0]}`]: { at: now, answer: completed ? "done" : outcome === "none" ? "none" : "adjust", beforeMinutes: before, deltaMinutes: after - Math.max(0, before - minutes) } },
  };
}

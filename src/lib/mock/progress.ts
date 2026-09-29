import { estimateMinutes } from "@/lib/scheduler";
import { MIN } from "./jst";
import { taskBlockKey, type MockData, type TaskBlockLog } from "./model";

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

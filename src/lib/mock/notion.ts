import type { Task } from "@/lib/scheduler";
import type { NotionRow } from "@/lib/notion/api";
import { DAY_MS } from "./jst";
import { NOTION_TASK_PREFIX, dayStartOfKey, type MockData } from "./model";

/** Notion の日付の値を締切の時刻に。日付だけならその日の終わり（翌日 0:00） */
export function notionDeadline(date: string): number | undefined {
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    const day = dayStartOfKey(date);
    return day === undefined ? undefined : day + DAY_MS;
  }
  const t = Date.parse(date);
  return Number.isFinite(t) ? t : undefined;
}

/**
 * Notion の行を、締切のタスクにして取り込む（Notion → アプリの一方向）。
 * - 名前は「企業名 段階」、締切は日付の列。締切が過ぎた行、取り込まない段階、完了にしたタスクは入れない
 * - 前に取り込んだタスクは名前と締切だけ直す（所要時間などアプリで足したものは残す）。表から消えた行のタスクは外す
 */
export function applyNotionRows(d: MockData, rows: NotionRow[], now: number, fetchedAt: number): MockData {
  const cfg = d.notion;
  if (!cfg) return d;
  const ignore = new Set(cfg.ignoreStages);
  const done = new Set(d.doneTasks.map((t) => t.id));
  const wanted = new Map<string, { title: string; deadline: number }>();
  for (const r of rows) {
    if (!r.title || !r.date || (r.stage && ignore.has(r.stage))) continue;
    const deadline = notionDeadline(r.date);
    if (deadline === undefined || deadline <= now) continue;
    const id = `${NOTION_TASK_PREFIX}${r.id}`;
    if (done.has(id)) continue;
    wanted.set(id, { title: [r.title, r.stage].filter(Boolean).join(" "), deadline });
  }
  const kept: Task[] = [];
  for (const t of d.tasks) {
    if (!t.id.startsWith(NOTION_TASK_PREFIX)) kept.push(t);
    else if (wanted.has(t.id)) {
      const w = wanted.get(t.id)!;
      kept.push({ ...t, title: w.title, deadline: w.deadline, deadlineKind: "fixed" });
      wanted.delete(t.id);
    }
  }
  for (const [id, w] of wanted) kept.push({ id, title: w.title, priority: 2, deadline: w.deadline, deadlineKind: "fixed" });
  return { ...d, tasks: kept, notion: { ...cfg, fetchedAt } };
}

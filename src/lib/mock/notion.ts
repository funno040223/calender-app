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
  // 完了にした・消したのと同じ段階だけ飛ばす（次の段階に進んだら、また取り込む）。名前に段階が入っている
  const done = new Set([...d.doneTasks.map((t) => notionKey(t.id, t.title)), ...(cfg.dismissed ?? [])]);
  const seen = new Set<string>();
  const wanted = new Map<string, { title: string; deadline: number; minutes?: number }>();
  for (const r of rows) {
    if (!r.title || !r.date || (r.stage && ignore.has(r.stage))) continue;
    const deadline = notionDeadline(r.date);
    if (deadline === undefined || deadline <= now) continue;
    const id = `${NOTION_TASK_PREFIX}${r.id}`;
    const title = [r.title, r.stage].filter(Boolean).join(" ");
    seen.add(notionKey(id, title));
    if (done.has(notionKey(id, title))) continue;
    wanted.set(id, { title, deadline, minutes: r.stage ? cfg.stageMinutes?.[r.stage] : undefined });
  }
  const kept: Task[] = [];
  for (const t of d.tasks) {
    if (!t.id.startsWith(NOTION_TASK_PREFIX)) kept.push(t);
    else if (wanted.has(t.id)) {
      const w = wanted.get(t.id)!;
      // 所要時間は、自分で決めていなければ（autoDuration が false でなく、範囲も入れていなければ）段階の目安に合わせる
      const auto = t.autoDuration ?? (t.durationMinutes === undefined && !t.durationRange);
      const next: Task = { ...t, title: w.title, deadline: w.deadline, deadlineKind: "fixed" };
      // 段階が変わったら（名前に段階が入っている）別の作業なので、前の段階の残り時間は使わない
      if (t.title !== w.title) delete next.remainingMinutes;
      if (auto) {
        delete next.durationRange;
        delete next.durationMinutes;
        delete next.autoDuration;
        if (w.minutes) Object.assign(next, { durationMinutes: w.minutes, autoDuration: true });
      }
      kept.push(next);
      wanted.delete(t.id);
    }
  }
  for (const [id, w] of wanted)
    kept.push({ id, title: w.title, priority: 2, deadline: w.deadline, deadlineKind: "fixed", ...(w.minutes ? { durationMinutes: w.minutes, autoDuration: true } : {}) });
  // 消した記録は、表にその段階の行があるあいだだけ残す
  const dismissed = cfg.dismissed?.filter((k) => seen.has(k));
  return { ...d, tasks: kept, notion: { ...cfg, dismissed: dismissed?.length ? dismissed : undefined, fetchedAt } };
}

export const notionKey = (id: string, title: string) => `${id}\n${title}`;

/** タスクを消す。Notion から取り込んだタスクは、同じ段階のあいだは取り込み直さない */
export function deleteTask(d: MockData, id: string): MockData {
  const t = d.tasks.find((x) => x.id === id);
  if (!t) return d;
  const tasks = d.tasks.filter((x) => x.id !== id);
  if (!t.id.startsWith(NOTION_TASK_PREFIX) || !d.notion) return { ...d, tasks };
  return { ...d, tasks, notion: { ...d.notion, dismissed: [...new Set([...(d.notion.dismissed ?? []), notionKey(t.id, t.title)])] } };
}

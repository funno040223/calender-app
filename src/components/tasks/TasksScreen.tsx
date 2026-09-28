"use client";

import { estimateMinutes, type Task } from "@/lib/scheduler";
import { useApp } from "@/components/app/StoreProvider";
import { LinkIcon } from "@/components/app/icons";
import { TAGS } from "@/lib/mock/store";
import { MIN, formatDeadline, formatMinutes } from "@/lib/mock/jst";
import { blocksOfTask, eventIndex, formatEventWhen } from "@/lib/mock/related";
import { Group, ScreenHeader } from "@/components/ui/controls";

const PRIORITY_MARK = { 1: "", 2: "!", 3: "!!" } as const;

export default function TasksScreen() {
  const { state, openTask } = useApp();
  const events = eventIndex(state);

  const effectiveDeadline = (t: Task) => {
    const ev = t.relatedEventId ? events.get(t.relatedEventId)?.event : undefined;
    return Math.min(t.deadline ?? Infinity, ev && !ev.allDay ? ev.start : Infinity);
  };
  const sorted = [...state.tasks].sort(
    (a, b) => effectiveDeadline(a) - effectiveDeadline(b) || b.priority - a.priority || a.title.localeCompare(b.title),
  );
  const withDeadline = sorted.filter((t) => effectiveDeadline(t) < Infinity);
  const without = sorted.filter((t) => effectiveDeadline(t) === Infinity);

  const row = (t: Task) => {
    const tag = TAGS.find((g) => g.id === t.tagId);
    const need = estimateMinutes(t, tag);
    const placed = blocksOfTask(state.result.blocks, t.id).reduce((s, b) => s + (b.end - b.start) / MIN, 0);
    const short = state.result.shortfalls.find((s) => s.taskId === t.id);
    const rel = t.relatedEventId ? events.get(t.relatedEventId) : undefined;
    const ratio = need > 0 ? Math.min(1, placed / need) : 1;
    return (
      <button key={t.id} type="button" onClick={() => openTask(t.id)} className="flex w-full items-start gap-3 px-4 py-2.5 text-left active:bg-surface2">
        <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: "var(--cal-task)" }} />
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1 text-[16px]">
            {PRIORITY_MARK[t.priority] && <span className="shrink-0 font-bold text-accent">{PRIORITY_MARK[t.priority]}</span>}
            <span className="truncate">{t.title}</span>
          </p>
          <p className="truncate text-[13px] text-muted">
            {t.deadline ? formatDeadline(t.deadline) : rel ? "予定の前まで" : "締切なし"}
            {tag ? `・${tag.name}` : ""}
            {t.durationMinutes === undefined && !t.durationRange ? "・時間は目安" : ""}
          </p>
          {t.relatedEventId && (
            <p className={`flex items-center gap-1 truncate text-[13px] ${rel ? "text-muted" : "text-accent"}`}>
              <LinkIcon size={11} />
              {rel ? `${rel.event.title} ${formatEventWhen(rel.event)}` : "関連する予定が見つかりません"}
            </p>
          )}
          <div className="mt-1.5 flex items-center gap-2">
            <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-surface2">
              <div className={`h-full rounded-full ${short ? "bg-accent" : "bg-ok"}`} style={{ width: `${ratio * 100}%` }} />
            </div>
            <span className={`shrink-0 text-[12px] tabular-nums ${short ? "text-accent" : "text-muted"}`}>
              {formatMinutes(placed)} / {formatMinutes(need)}
            </span>
          </div>
        </div>
      </button>
    );
  };

  return (
    <div className="h-full overflow-y-auto bg-grouped">
      <ScreenHeader
        title="タスク"
        sub={`${state.tasks.length}件`}
        right={
          <button
            type="button"
            onClick={() => openTask()}
            className="mb-1 rounded-full bg-surface px-3 py-1.5 text-[15px] font-medium text-accent shadow-sm"
          >
            ＋ 新規
          </button>
        }
      />
      <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 pb-8 sm:px-6">
        {state.tasks.length === 0 ? (
          <p className="px-4 py-6 text-center text-[15px] text-muted">タスクはありません。下の入力欄から追加できます。</p>
        ) : (
          <>
            {withDeadline.length > 0 && <Group title="締切が近い順">{withDeadline.map(row)}</Group>}
            {without.length > 0 && <Group title="締切なし">{without.map(row)}</Group>}
            <p className="px-4 text-[12px] text-muted">バーは、必要な時間のうちカレンダーに置けた分です。</p>
          </>
        )}
      </div>
    </div>
  );
}

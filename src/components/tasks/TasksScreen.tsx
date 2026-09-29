"use client";

import Link from "next/link";

import { buildOutlook, estimateMinutes, type OutlookStatus, type Task } from "@/lib/scheduler";
import { useApp } from "@/components/app/StoreProvider";
import { LinkIcon } from "@/components/app/icons";
import { TAGS } from "@/lib/mock/store";
import { completeTask } from "@/lib/mock/state";
import { MIN, TZ, formatDeadline, formatMinutes } from "@/lib/mock/jst";
import { blocksOfTask, eventIndex, formatEventWhen } from "@/lib/mock/related";
import { Group, ScreenHeader } from "@/components/ui/controls";

const PRIORITY_MARK = { 1: "", 2: "!", 3: "!!" } as const;

const STATUS: Record<OutlookStatus, { label: string; cls: string }> = {
  ok: { label: "順調", cls: "bg-ok text-white" },
  tight: { label: "きつい", cls: "bg-[var(--cal-class)] text-white" },
  late: { label: "間に合わない", cls: "bg-accent text-white" },
};

/** 今週と来週：タスクに使う時間と空き時間、順調かどうか */
function Outlook() {
  const { state, openTask } = useApp();
  const weeks = buildOutlook({
    now: state.plannedAt,
    result: state.result,
    minSlackMinutesPerDay: state.settings.minSlackMinutesPerDay,
    tzOffsetMinutes: TZ,
  });
  return (
    <Group title="見通し">
      {weeks.map((w, i) => (
        <div key={w.start} className="flex flex-col gap-1 px-4 py-2.5">
          <Link href="/stats" className="flex items-center gap-3">
            <span className="w-10 shrink-0 text-[15px] font-medium">{i === 0 ? "今週" : "来週"}</span>
            <span className={`shrink-0 rounded-full px-2 py-0.5 text-[12px] font-semibold ${STATUS[w.status].cls}`}>{STATUS[w.status].label}</span>
            <span className="ml-auto text-[13px] tabular-nums text-muted">
              タスク {formatMinutes(w.taskMinutes)}・空き {formatMinutes(w.freeMinutes)}
            </span>
          </Link>
          {w.late.map((l) => (
            <button key={l.taskId} type="button" onClick={() => openTask(l.taskId)} className="ml-13 truncate text-left text-[13px] text-accent">
              {l.title}：{formatMinutes(l.shortfallMinutes)}足りない
            </button>
          ))}
        </div>
      ))}
    </Group>
  );
}

export default function TasksScreen() {
  const { state, openTask, update } = useApp();
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
      <div key={t.id} className="flex w-full items-start gap-1 pl-2 pr-4 active:bg-surface2">
        <button
          type="button"
          aria-label={`「${t.title}」を完了にする`}
          onClick={() => update((d) => completeTask(d, t.id, Date.now()))}
          className="flex h-11 w-9 shrink-0 items-start justify-center pt-3"
        >
          <span className="h-5 w-5 rounded-full border-2" style={{ borderColor: "var(--cal-task)" }} />
        </button>
        <button type="button" onClick={() => openTask(t.id)} className="min-w-0 flex-1 py-2.5 text-left">
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
        </button>
      </div>
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
        <Outlook />
        {state.tasks.length === 0 ? (
          <p className="px-4 py-6 text-center text-[15px] text-muted">タスクはありません。</p>
        ) : (
          <>
            {withDeadline.length > 0 && <Group title="締切が近い順">{withDeadline.map(row)}</Group>}
            {without.length > 0 && <Group title="締切なし">{without.map(row)}</Group>}
          </>
        )}
      </div>
    </div>
  );
}

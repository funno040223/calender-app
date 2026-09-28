"use client";

import type { ReactNode } from "react";
import type { Block, CalendarEvent, Task } from "@/lib/scheduler";
import { formatDate, formatDateTime, formatMinutes, formatTime, MIN, DAY_MS } from "@/lib/mock/jst";
import { blocksOfTask } from "@/lib/mock/related";
import { LinkIcon } from "@/components/app/icons";
import Sheet from "@/components/ui/Sheet";

/** 予定に関連するタスクと、その配置 */
export function RelatedTasks({ tasks, blocks, onOpenTask }: { tasks: Task[]; blocks: Block[]; onOpenTask: (id: string) => void }) {
  if (tasks.length === 0) return null;
  return (
    <section className="flex flex-col gap-1.5">
      <h3 className="flex items-center gap-1 text-[13px] font-medium text-muted">
        <LinkIcon size={12} />
        関連するタスク
      </h3>
      <ul className="flex flex-col divide-y divide-line overflow-hidden rounded-xl bg-surface2">
        {tasks.map((t) => {
          const placed = blocksOfTask(blocks, t.id);
          return (
            <li key={t.id}>
              <button type="button" onClick={() => onOpenTask(t.id)} className="flex w-full items-start gap-2.5 px-3 py-2 text-left active:opacity-70">
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full" style={{ background: "var(--cal-task)" }} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px]">{t.title}</span>
                  {placed.length > 0 ? (
                    placed.map((b) => (
                      <span key={b.start} className="block text-[12px] text-muted">
                        {formatDate(b.start)} {formatTime(b.start)}〜{formatTime(b.end)} に配置
                      </span>
                    ))
                  ) : (
                    <span className="block text-[12px] text-accent">まだ配置できていません</span>
                  )}
                </span>
                <span className="shrink-0 self-center text-[13px] text-accent">編集</span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

const KIND_LABEL: Record<Block["kind"], string> = { task: "タスク", habit: "習慣", routine: "朝ルーティン" };

export function BlockSheet({
  block,
  relatedLabel,
  onTogglePin,
  onEditTask,
  onClose,
}: {
  block: Block;
  /** 関連する予定（「面接 10/4 15:00」） */
  relatedLabel?: string;
  onTogglePin: (block: Block) => void;
  onEditTask: (taskId: string) => void;
  onClose: () => void;
}) {
  return (
    <Sheet title={block.title} onClose={onClose}>
      <div className="flex flex-col gap-3 text-[15px]">
        <p className="text-muted">
          {KIND_LABEL[block.kind]}・{formatDate(block.start)} {formatTime(block.start)}〜{formatTime(block.end)}（
          {formatMinutes((block.end - block.start) / MIN)}）
        </p>
        {relatedLabel && (
          <p className="flex items-center gap-1.5 text-[14px]">
            <LinkIcon size={12} />
            {relatedLabel} の準備
          </p>
        )}
        {block.kind === "routine" ? (
          <p className="text-[14px] text-muted">起床時刻から自動で決まる枠です。予定を変えると動きます。</p>
        ) : (
          <>
            <p className="text-[14px] text-muted">
              {block.pinned
                ? "この枠は固定されています。組み直しても動きません。"
                : "アプリが置いた枠です。ドラッグで動かすと、その位置に固定されます。"}
            </p>
            {block.pinned && (
              <button type="button" onClick={() => onTogglePin(block)} className="rounded-xl bg-surface2 py-2.5 font-medium">
                固定を外して自動に戻す
              </button>
            )}
          </>
        )}
        {block.kind === "task" && (
          <button type="button" onClick={() => onEditTask(block.refId)} className="rounded-xl py-2.5 text-accent hover:bg-surface2">
            タスクを編集
          </button>
        )}
      </div>
    </Sheet>
  );
}

export function ReadonlyEventSheet({
  event,
  sourceLabel,
  onClose,
  children,
}: {
  event: CalendarEvent;
  sourceLabel: string;
  onClose: () => void;
  /** 関連するタスク・授業の操作など */
  children?: ReactNode;
}) {
  const when = event.allDay
    ? event.end - event.start > DAY_MS
      ? `${formatDate(event.start)}〜${formatDate(event.end - DAY_MS)}（終日）`
      : `${formatDate(event.start)}（終日）`
    : `${formatDateTime(event.start)}〜${formatTime(event.end)}`;
  return (
    <Sheet title={event.title} onClose={onClose}>
      <div className="flex flex-col gap-2 text-[15px]">
        <p>{when}</p>
        {event.location && <p className="text-muted">場所：{event.location}</p>}
        {event.description && <p className="whitespace-pre-wrap text-muted">{event.description}</p>}
        <p className="mt-2 text-[13px] text-muted">{sourceLabel}</p>
        {children}
      </div>
    </Sheet>
  );
}

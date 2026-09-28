"use client";

import type { Block, CalendarEvent } from "@/lib/scheduler";
import { formatDate, formatDateTime, formatMinutes, formatTime, MIN, DAY_MS } from "@/lib/mock/jst";
import Sheet from "./Sheet";

const KIND_LABEL: Record<Block["kind"], string> = { task: "タスク", habit: "習慣", routine: "朝ルーティン" };

export function BlockSheet({
  block,
  onTogglePin,
  onDeleteTask,
  onClose,
}: {
  block: Block;
  onTogglePin: (block: Block) => void;
  onDeleteTask: (taskId: string) => void;
  onClose: () => void;
}) {
  return (
    <Sheet title={block.title} onClose={onClose}>
      <div className="flex flex-col gap-3 text-[15px]">
        <p className="text-muted">
          {KIND_LABEL[block.kind]}・{formatDate(block.start)} {formatTime(block.start)}〜{formatTime(block.end)}（
          {formatMinutes((block.end - block.start) / MIN)}）
        </p>
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
          <button type="button" onClick={() => onDeleteTask(block.refId)} className="rounded-xl py-2.5 text-accent hover:bg-surface2">
            このタスクを削除
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
}: {
  event: CalendarEvent;
  sourceLabel: string;
  onClose: () => void;
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
        <p className="mt-2 text-[13px] text-muted">{sourceLabel}の予定は読み取り専用です。</p>
      </div>
    </Sheet>
  );
}

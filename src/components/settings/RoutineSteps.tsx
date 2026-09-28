"use client";

import { useState } from "react";
import { useApp } from "@/components/app/StoreProvider";
import { AddRow, EmptyNote, Group } from "@/components/ui/controls";
import { formatMinutes, newId } from "@/lib/mock/jst";
import type { RoutineStep } from "@/lib/mock/model";

function StepRow({
  step,
  first,
  last,
  onRename,
  onMove,
  onDelete,
}: {
  step: RoutineStep;
  first: boolean;
  last: boolean;
  onRename: (title: string) => void;
  onMove: (dir: -1 | 1) => void;
  onDelete: () => void;
}) {
  const [text, setText] = useState(step.title);
  const [synced, setSynced] = useState(step.title);
  if (synced !== step.title) {
    setSynced(step.title);
    setText(step.title);
  }
  const arrow = "flex h-8 w-8 items-center justify-center rounded-lg text-[15px] text-accent disabled:text-line";
  return (
    <div className="flex min-h-11 items-center gap-1 px-2 py-1">
      <input
        value={text}
        aria-label="手順"
        onChange={(e) => setText(e.target.value)}
        onBlur={() => {
          const t = text.trim();
          if (t && t !== step.title) onRename(t);
          else setText(step.title);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        }}
        className="min-w-0 flex-1 rounded-lg bg-transparent px-2 py-1.5 text-[16px] outline-none focus:bg-surface2"
      />
      <button type="button" className={arrow} disabled={first} onClick={() => onMove(-1)} aria-label="上へ">
        ↑
      </button>
      <button type="button" className={arrow} disabled={last} onClick={() => onMove(1)} aria-label="下へ">
        ↓
      </button>
      <button type="button" className="shrink-0 px-2 text-[14px] text-accent" onClick={onDelete}>
        削除
      </button>
    </div>
  );
}

export default function RoutineSteps() {
  const { state, patch } = useApp();
  const steps = state.routineSteps;
  const set = (fn: (s: RoutineStep[]) => RoutineStep[]) => patch((d) => ({ routineSteps: fn(d.routineSteps) }));

  return (
    <Group
      footer={`「今日」の画面のチェックリストになります。朝ルーティンの時間（${formatMinutes(state.settings.routineMinutes)}）は「基本の設定」で変えられます。`}
    >
      {steps.length === 0 && <EmptyNote>手順はまだありません。</EmptyNote>}
      {steps.map((s, i) => (
        <StepRow
          key={s.id}
          step={s}
          first={i === 0}
          last={i === steps.length - 1}
          onRename={(title) => set((list) => list.map((x) => (x.id === s.id ? { ...x, title } : x)))}
          onMove={(dir) =>
            set((list) => {
              const next = [...list];
              const j = i + dir;
              [next[i], next[j]] = [next[j], next[i]];
              return next;
            })
          }
          onDelete={() => set((list) => list.filter((x) => x.id !== s.id))}
        />
      ))}
      <AddRow onClick={() => set((list) => [...list, { id: newId("step"), title: "新しい手順" }])}>手順を追加</AddRow>
    </Group>
  );
}

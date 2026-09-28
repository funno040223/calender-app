"use client";

import { useState, type FormEvent } from "react";
import { estimateMinutes, parseQuickAdd, type Task } from "@/lib/scheduler";
import { TAGS } from "@/lib/mock/store";
import { TZ, formatDeadline, formatMinutes, newId } from "@/lib/mock/jst";

const DEADLINE_CHIPS = ["今日", "明日", "今週"] as const;
type DeadlineChip = (typeof DEADLINE_CHIPS)[number];
const PRIORITY_LABEL = { 1: "低", 2: "中", 3: "高" } as const;

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={`shrink-0 rounded-full border px-3 py-1 text-[13px] transition-colors ${
        on ? "border-accent bg-accent text-white" : "border-line bg-surface text-fg"
      }`}
    >
      {children}
    </button>
  );
}

export default function QuickAddBar({ onAdd }: { onAdd: (task: Task) => void }) {
  const [text, setText] = useState("");
  const [chip, setChip] = useState<DeadlineChip | undefined>();
  const [tagId, setTagId] = useState<string | undefined>();

  // 入力中の読み取り結果を出すための基準時刻（追加するときは取り直す）
  const [previewNow] = useState(() => Date.now());

  const build = (now: number): Omit<Task, "id"> | undefined => {
    if (!text.trim()) return undefined;
    const parsed = parseQuickAdd(text, now, TZ);
    // チップは「今日まで」などを書いたのと同じ意味。書いた締切よりチップを優先する
    const deadline = chip ? parseQuickAdd(`${chip}まで`, now, TZ).deadline : parsed.deadline;
    return {
      title: parsed.title,
      priority: parsed.priority ?? 2,
      ...(deadline !== undefined ? { deadline } : {}),
      ...(parsed.durationMinutes !== undefined ? { durationMinutes: parsed.durationMinutes } : {}),
      ...(tagId ? { tagId } : {}),
    };
  };

  const preview = build(previewNow);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const task = build(Date.now());
    if (!task) return;
    onAdd({ ...task, id: newId("task") });
    setText("");
    setChip(undefined);
  };

  return (
    <form
      onSubmit={submit}
      className="border-t border-line bg-surface/95 px-3 pt-2 pb-2 backdrop-blur sm:pb-[max(8px,env(safe-area-inset-bottom))]"
    >
      <div className="flex items-center gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="タスクを追加（例：レポート 明日まで 2時間 重要）"
          aria-label="タスクを追加"
          enterKeyHint="done"
          className="min-w-0 flex-1 rounded-full border border-line bg-surface2 px-4 py-2 text-[16px] outline-none focus:border-accent"
        />
        <button
          type="submit"
          disabled={!preview}
          className="shrink-0 rounded-full bg-accent px-4 py-2 text-[15px] font-semibold text-white disabled:opacity-40"
        >
          追加
        </button>
      </div>
      <div className="mt-2 flex items-center gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:none]">
        {DEADLINE_CHIPS.map((c) => (
          <Chip key={c} on={chip === c} onClick={() => setChip(chip === c ? undefined : c)}>
            {c}まで
          </Chip>
        ))}
        <span className="mx-1 h-4 w-px shrink-0 bg-line" />
        {TAGS.map((t) => (
          <Chip key={t.id} on={tagId === t.id} onClick={() => setTagId(tagId === t.id ? undefined : t.id)}>
            {t.name}
          </Chip>
        ))}
      </div>
      {preview && (
        <p className="mt-1.5 truncate px-1 text-[12px] text-muted">
          「{preview.title}」・{preview.deadline ? formatDeadline(preview.deadline) : "締切なし"}・
          {formatMinutes(estimateMinutes({ ...preview, id: "" }, TAGS.find((t) => t.id === preview.tagId) ?? { defaultMinutes: 60 }))}
          {preview.durationMinutes === undefined ? "（目安）" : ""}・優先度{PRIORITY_LABEL[preview.priority]}
        </p>
      )}
    </form>
  );
}

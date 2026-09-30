"use client";

import { useRef, useState, type FormEvent } from "react";
import { estimateMinutes, parseQuickAdd, type Task } from "@/lib/scheduler";
import { useApp } from "@/components/app/StoreProvider";
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
      className={`press shrink-0 rounded-full px-3 py-1 text-[13px] ${on ? "bg-tint font-medium text-on-tint" : "bg-surface2 text-fg"}`}
    >
      {children}
    </button>
  );
}

export default function QuickAddBar({ onAdd }: { onAdd: (task: Task) => void }) {
  const { tags: TAGS, planTags } = useApp().state;
  const [text, setText] = useState("");
  const [chip, setChip] = useState<DeadlineChip | undefined>();
  const [tagId, setTagId] = useState<string | undefined>();

  // 締切と作業の種類のチップは、入力しているときだけ出す（ふだんは画面を広く使う）
  const [focused, setFocused] = useState(false);
  const blurTimer = useRef<number>(undefined);
  const open = focused || !!text || !!chip || !!tagId;

  // 入力中の読み取り結果を出すための基準時刻（追加するときは取り直す）。開いたまま日付が変わっても、入力を始めたときに取り直す
  const [previewNow, setPreviewNow] = useState(() => Date.now());

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
    setTagId(undefined);
  };

  return (
    <form onSubmit={submit} className="px-3 pt-2 pb-1.5">
      <div className="relative">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onFocus={() => {
            window.clearTimeout(blurTimer.current);
            setFocused(true);
            setPreviewNow(Date.now());
          }}
          // チップを押したときに先に閉じないよう、少し待ってから閉じる
          onBlur={() => (blurTimer.current = window.setTimeout(() => setFocused(false), 250))}
          placeholder="タスクを追加"
          aria-label="タスクを追加"
          enterKeyHint="done"
          className="h-10 w-full rounded-full bg-surface2 pr-12 pl-4 text-[16px] outline-none placeholder:text-muted"
        />
        {preview && (
          <button
            type="submit"
            aria-label="追加"
            className="press absolute top-1 right-1 flex h-8 w-8 items-center justify-center rounded-full bg-tint text-on-tint"
          >
            <svg viewBox="0 0 14 14" width="14" height="14" aria-hidden>
              <path d="M7 12V2M2.5 6.5 7 2l4.5 4.5" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}
      </div>
      {open && (
        <div className="mt-2 flex items-center gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:none]">
          {DEADLINE_CHIPS.map((c) => (
            <Chip key={c} on={chip === c} onClick={() => setChip(chip === c ? undefined : c)}>
              {c}まで
            </Chip>
          ))}
          <span className="mx-0.5 h-4 w-px shrink-0 bg-line" />
          {TAGS.map((t) => (
            <Chip key={t.id} on={tagId === t.id} onClick={() => setTagId(tagId === t.id ? undefined : t.id)}>
              {t.name}
            </Chip>
          ))}
        </div>
      )}
      {preview && (
        <p className="mt-1.5 truncate px-2 text-[12px] text-muted">
          「{preview.title}」・{preview.deadline ? formatDeadline(preview.deadline) : "締切なし"}・
          {formatMinutes(estimateMinutes({ ...preview, id: "" }, planTags.find((t) => t.id === preview.tagId) ?? { defaultMinutes: 60 }))}
          {preview.durationMinutes === undefined ? "（目安）" : ""}・優先度{PRIORITY_LABEL[preview.priority]}
        </p>
      )}
    </form>
  );
}

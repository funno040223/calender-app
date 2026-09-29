"use client";

import { useState, type FormEvent } from "react";
import type { Task, TaskTiming } from "@/lib/scheduler";
import type { MockState } from "@/lib/mock/store";
import { DAY_MS, dayStartOf, formatDate, formatMinutes, formatTime, fromInputDateTime, newId, toInputDate, toInputDateTime } from "@/lib/mock/jst";
import { allEventRefs, blocksOfTask, formatEventWhen } from "@/lib/mock/related";
import Sheet from "@/components/ui/Sheet";
import { DangerButton, PrimaryButton, Segmented, Switch, inputCls, inputBase } from "@/components/ui/controls";

type DurationMode = "fixed" | "range" | "unknown";

interface Draft {
  title: string;
  hasDeadline: boolean;
  deadlineKind: "fixed" | "target";
  deadlineDate: string;
  deadlineTime: string;
  mode: DurationMode;
  fixed: string;
  min: string;
  max: string;
  priority: 1 | 2 | 3;
  tagId: string;
  relatedEventId: string;
  timing: TaskTiming;
  first: boolean;
  stretch: boolean;
}

function toDraft(t: Task | undefined, now: number): Draft {
  const dl = t?.deadline;
  // 「その日の終わり」（翌日 0:00）は、日付だけで表す
  const endOfDay = dl !== undefined && dl === dayStartOf(dl);
  const fallbackDay = dayStartOf(now) + DAY_MS;
  return {
    title: t?.title ?? "",
    hasDeadline: dl !== undefined,
    deadlineKind: t?.deadlineKind ?? "fixed",
    deadlineDate: toInputDate(dl === undefined ? fallbackDay - 1 : endOfDay ? dl - 1 : dl),
    deadlineTime: dl === undefined || endOfDay ? "" : toInputDateTime(dl).slice(11),
    mode: t?.durationMinutes !== undefined ? "fixed" : t?.durationRange ? "range" : t ? "unknown" : "fixed",
    fixed: String(t?.durationMinutes ?? 60),
    min: String(t?.durationRange?.min ?? 30),
    max: String(t?.durationRange?.max ?? 90),
    priority: t?.priority ?? 2,
    tagId: t?.tagId ?? "",
    relatedEventId: t?.relatedEventId ?? "",
    timing: t?.timing ?? "soon",
    first: !!t?.first,
    stretch: !!t?.stretch,
  };
}

const PRIORITIES = [
  { value: 1 as const, label: "低" },
  { value: 2 as const, label: "中" },
  { value: 3 as const, label: "高" },
];

function Label({ children }: { children: React.ReactNode }) {
  return <span className="text-[13px] font-medium text-muted">{children}</span>;
}

export default function TaskForm({
  task,
  state,
  onSave,
  onDelete,
  onComplete,
  onClose,
}: {
  task?: Task;
  state: MockState;
  onSave: (task: Task) => void;
  onDelete: (id: string) => void;
  onComplete?: (id: string) => void;
  onClose: () => void;
}) {
  const [d, setD] = useState<Draft>(() => toDraft(task, state.plannedAt));
  const [error, setError] = useState("");
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((prev) => ({ ...prev, [k]: v }));

  const refs = allEventRefs(state);
  const related = refs.find((r) => r.event.id === d.relatedEventId);
  const upcoming = refs
    .filter((r) => !r.event.allDay && r.event.start > state.plannedAt && r.event.start < state.plannedAt + 60 * DAY_MS)
    .sort((a, b) => a.event.start - b.event.start);
  const options = related && !upcoming.includes(related) ? [related, ...upcoming] : upcoming;
  const blocks = task ? blocksOfTask(state.result.blocks, task.id) : [];
  const shortfall = task ? state.result.shortfalls.find((s) => s.taskId === task.id) : undefined;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const title = d.title.trim();
    if (!title) return setError("タイトルを入力してください");

    let deadline: number | undefined;
    if (d.hasDeadline) {
      const day = fromInputDateTime(d.deadlineDate);
      if (day === undefined) return setError("締切の日付を入力してください");
      deadline = d.deadlineTime ? fromInputDateTime(`${d.deadlineDate}T${d.deadlineTime}`) : day + DAY_MS;
    }

    const next: Task = { ...(task ?? {}), id: task?.id ?? newId("task"), title, priority: d.priority };
    delete next.deadline;
    delete next.durationMinutes;
    delete next.durationRange;
    delete next.tagId;
    delete next.relatedEventId;
    delete next.timing;
    if (deadline !== undefined) next.deadline = deadline;
    next.deadlineKind = d.deadlineKind;

    if (d.mode === "fixed") {
      const n = Number(d.fixed);
      if (!Number.isFinite(n) || n <= 0) return setError("所要時間は1分以上で入力してください");
      next.durationMinutes = Math.round(n);
    } else if (d.mode === "range") {
      const min = Number(d.min);
      const max = Number(d.max);
      if (!Number.isFinite(min) || !Number.isFinite(max) || min <= 0 || max < min) {
        return setError("所要時間の幅は「短いとき ≦ 長いとき」で入力してください");
      }
      next.durationRange = { min: Math.round(min), max: Math.round(max) };
    }
    // 所要時間を変えたら、前に計算した残り時間は使わない
    if (task && (task.durationMinutes !== next.durationMinutes || JSON.stringify(task.durationRange) !== JSON.stringify(next.durationRange))) {
      delete next.remainingMinutes;
    }
    if (d.tagId) next.tagId = d.tagId;
    if (d.relatedEventId) next.relatedEventId = d.relatedEventId;
    if (d.timing === "justBefore") next.timing = "justBefore";
    delete next.first;
    delete next.stretch;
    if (d.first) next.first = true;
    if (d.stretch) next.stretch = true;
    onSave(next);
  };


  return (
    <Sheet title={task ? "タスクを編集" : "新規タスク"} onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <input
          className={inputCls}
          placeholder="タイトル"
          aria-label="タイトル"
          value={d.title}
          autoFocus={!task}
          onChange={(e) => set("title", e.target.value)}
        />

        {task && (
          <div className="rounded-xl bg-surface2 px-3 py-2 text-[13px]">
            {blocks.length > 0 ? (
              <ul className="flex flex-col gap-0.5">
                {blocks.map((b) => (
                  <li key={b.start}>
                    {formatDate(b.start)} {formatTime(b.start)}〜{formatTime(b.end)} に配置{b.pinned ? "（固定）" : ""}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted">まだ配置できていません</p>
            )}
            {shortfall && <p className="mt-1 text-accent">締切までに{formatMinutes(shortfall.shortfallMinutes)}足りません</p>}
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <Label>締切</Label>
            <label className="flex items-center gap-2 text-[15px]">
              締切あり
              <input type="checkbox" className="ios-switch" checked={d.hasDeadline} onChange={(e) => set("hasDeadline", e.target.checked)} />
            </label>
          </div>
          {d.hasDeadline && <label className="block text-[14px]">期限の種類<select aria-label="期限の種類" value={d.deadlineKind} onChange={(e) => set("deadlineKind", e.target.value as "fixed" | "target")} className="ml-2 rounded-lg bg-surface2 p-2"><option value="fixed">提出・約束の締切</option><option value="target">自分の目標日</option></select></label>}
          {d.hasDeadline && (
            <div className="grid grid-cols-[1fr_7.5rem] gap-2">
              <input className={inputCls} type="date" aria-label="締切の日付" value={d.deadlineDate} onChange={(e) => set("deadlineDate", e.target.value)} />
              <input
                className={inputCls}
                type="time"
                step={900}
                aria-label="締切の時刻（任意）"
                value={d.deadlineTime}
                onChange={(e) => set("deadlineTime", e.target.value)}
              />
            </div>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>所要時間</Label>
          <Segmented
            label="所要時間の決め方"
            full
            value={d.mode}
            onChange={(v) => set("mode", v)}
            options={[
              { value: "fixed", label: "決まっている" },
              { value: "range", label: "幅がある" },
              { value: "unknown", label: "わからない" },
            ]}
          />
          {d.mode === "fixed" && (
            <label className="flex items-center gap-2 text-[15px]">
              <input className={`${inputBase} w-24`} type="number" inputMode="numeric" min={1} step={15} value={d.fixed} aria-label="所要時間（分）" onChange={(e) => set("fixed", e.target.value)} />
              分
            </label>
          )}
          {d.mode === "range" && (
            <div className="flex items-center gap-2 text-[15px]">
              <input className={`${inputBase} w-20`} type="number" inputMode="numeric" min={1} step={15} value={d.min} aria-label="短いとき（分）" onChange={(e) => set("min", e.target.value)} />
              〜
              <input className={`${inputBase} w-20`} type="number" inputMode="numeric" min={1} step={15} value={d.max} aria-label="長いとき（分）" onChange={(e) => set("max", e.target.value)} />
              分
            </div>
          )}
          <p className="text-[12px] text-muted">
            {d.mode === "range"
              ? "真ん中くらいの時間で計画します"
              : d.mode === "unknown"
                ? `種類の目安（${state.planTags.find((t) => t.id === d.tagId)?.defaultMinutes ?? 60}分）で計画します`
                : "この時間ぶんを締切までに置きます"}
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>優先度</Label>
          <Segmented label="優先度" full value={d.priority} onChange={(v) => set("priority", v)} options={PRIORITIES} />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>種類</Label>
          <Segmented
            label="種類"
            full
            value={d.tagId}
            onChange={(v) => set("tagId", v)}
            options={[{ value: "", label: "なし" }, ...state.tags.map((t) => ({ value: t.id, label: t.name }))]}
          />
          {d.tagId && (
            <p className="text-[12px] text-muted">
              {state.tags.find((t) => t.id === d.tagId)?.mode === "focus" ? "長い空き時間にまとめて置きます" : "予定の合間の短い時間に詰めます"}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>関連する予定（任意）</Label>
          <select className={inputCls} aria-label="関連する予定" value={d.relatedEventId} onChange={(e) => set("relatedEventId", e.target.value)}>
            <option value="">なし</option>
            {d.relatedEventId && !related && <option value={d.relatedEventId}>（見つからない予定）</option>}
            {options.map((r) => (
              <option key={r.event.id} value={r.event.id}>
                {formatEventWhen(r.event)} {r.event.title}
              </option>
            ))}
          </select>
          {d.relatedEventId && !related ? (
            <p className="text-[12px] text-accent">関連する予定が見つかりません</p>
          ) : null}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>置き方</Label>
          <Segmented
            label="置き方"
            full
            value={d.timing}
            onChange={(v) => set("timing", v)}
            options={[
              { value: "soon", label: "早めに片付ける" },
              { value: "justBefore", label: "直前に寄せる" },
            ]}
          />
        </div>

        {/* 締切に足りないときに選んだもの。選んだあとで外せるように、選んでいるときだけ出す */}
        {(task?.first || task?.stretch) && (
          <div className="flex flex-col gap-2">
            {task.first && (
              <label className="flex items-center justify-between gap-3">
                <span className="text-[16px]">ほかを後に回す</span>
                <Switch label="ほかを後に回す" checked={d.first} onChange={(v) => set("first", v)} />
              </label>
            )}
            {task.stretch && (
              <label className="flex items-center justify-between gap-3">
                <span className="text-[16px]">時間帯の外にも入れる</span>
                <Switch label="時間帯の外にも入れる" checked={d.stretch} onChange={(v) => set("stretch", v)} />
              </label>
            )}
          </div>
        )}

        {error && <p className="text-[14px] text-accent">{error}</p>}
        <PrimaryButton>{task ? "保存" : "追加"}</PrimaryButton>
        {task && onComplete && (
          <button type="button" onClick={() => onComplete(task.id)} className="w-full rounded-xl bg-surface2 py-3 text-[16px] font-medium text-ok">
            完了にする
          </button>
        )}
        {task && (
          <DangerButton confirm={`「${task.title}」を削除しますか？`} onClick={() => onDelete(task.id)}>
            タスクを削除
          </DangerButton>
        )}
      </form>
    </Sheet>
  );
}


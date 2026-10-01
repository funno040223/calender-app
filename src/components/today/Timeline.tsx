"use client";

import { useState } from "react";
import { useApp } from "@/components/app/StoreProvider";
import { LinkIcon } from "@/components/app/icons";
import { DAY_MS, dayStartOf, formatTime } from "@/lib/mock/jst";
import { dateKeyOf, type HabitMark } from "@/lib/mock/model";
import { missHabitBlock, rainyDayKeys, releaseKeepFree } from "@/lib/mock/state";
import { allEventRefs, eventIndex, formatEventWhen, tasksByEvent } from "@/lib/mock/related";
import { Card } from "@/components/ui/controls";
import { colorOf, textBtn } from "./parts";

interface TimelineItem {
  key: string;
  title: string;
  start: number;
  end: number;
  color: string;
  sub?: string;
  relatedCount?: number;
  taskId?: string;
  /** 任意参加で参加しない回など、空き時間として扱うもの */
  dim?: boolean;
  /** 終わった習慣で、まだ記録していないもの（「5分」「やった」「できなかった」で消える） */
  past?: boolean;
  /** 枠の下に出す小さなボタン（雨の日の散歩の入れ替えなど） */
  action?: { label: string; ariaLabel?: string; onClick: () => void };
  /** 記録する習慣：「5分」「やった」 */
  record?: { mark?: HabitMark; onMark: (m: HabitMark) => void };
}

export default function Timeline({ now, dayEnd, limit }: { now: number; dayEnd: number; limit?: number }) {
  const { state, openTask, update, notify } = useApp();
  // 狭い画面では、いまと次のいくつかだけ。残りは押すと出す
  const [all, setAll] = useState(false);
  const events = eventIndex(state);
  const related = tasksByEvent(state.tasks, events);
  const items: TimelineItem[] = [];
  const today = dayStartOf(now);

  for (const r of allEventRefs(state)) {
    const ev = r.event;
    if (ev.allDay || ev.end <= now || ev.start >= dayEnd) continue;
    items.push({
      key: `${r.source}:${ev.id}`,
      title: ev.title,
      start: ev.start,
      end: ev.end,
      color: colorOf(r.calendarId),
      sub:
        [r.skipped ? "任意参加・参加しない" : r.source === "class" ? "授業" : r.source === "google" ? "取り込み" : undefined, ev.location]
          .filter(Boolean)
          .join("・") || undefined,
      dim: r.skipped,
      relatedCount: related.get(ev.id)?.length,
    });
  }
  const todayKey = dateKeyOf(now);
  // 雨の日は、予報（雨の確率が高い日）と手で切り替えた日から決める
  const rainy = rainyDayKeys(state).includes(todayKey);
  const keep = (k: string) => k >= dateKeyOf(now - 14 * DAY_MS) && k !== todayKey;
  const toggleRain = () =>
    update((d) => ({
      ...d,
      rainyDays: rainy ? d.rainyDays.filter(keep) : [...d.rainyDays.filter(keep), todayKey],
      notRainyDays: rainy ? [...d.notRainyDays.filter(keep), todayKey] : d.notRainyDays.filter(keep),
    }));
  // 記録する習慣は、流れの中で「5分」「やった」を押す。同じ習慣の2つ目の枠（干すなど）には出さない
  const seen = new Set<string>();
  const mark = (day: string, id: string, m: HabitMark) => {
    const was = state.habitLogs[day]?.[id];
    update((d) => {
      const marks = { ...d.habitLogs[day] };
      if (marks[id] === m) delete marks[id];
      else marks[id] = m;
      return { ...d, habitLogs: { ...d.habitLogs, [day]: marks } };
    });
    if (was !== m) notify("記録しました");
  };
  // できなかった習慣は、入る時間があればあとに入れ直す
  const miss = (b: { refId: string; start: number }) => {
    update((d) => missHabitBlock(d, b));
    notify("記録しました", { habitId: b.refId });
  };
  const blocks = [...state.result.blocks].sort((a, b) => a.start - b.start);
  for (const b of blocks) {
    if (b.start >= dayEnd) continue;
    const habit = b.kind === "habit" ? state.habits.find((h) => h.id === b.refId) : undefined;
    const day = dateKeyOf(b.start);
    const tracked = !!habit?.track && !seen.has(`${day}:${b.refId}`);
    if (tracked) seen.add(`${day}:${b.refId}`);
    const m = tracked ? state.habitLogs[day]?.[b.refId] : undefined;
    // 終わった枠は出さない。ただし、今日の記録する習慣でまだ押していないものは残す
    const past = b.end <= now;
    if (past && !(tracked && m === undefined && b.start >= today)) continue;
    const task = b.kind === "task" ? state.tasks.find((t) => t.id === b.refId) : undefined;
    const rainSwap = habit?.rainAlternative && day === todayKey && b.start > now;
    const rel = task?.relatedEventId ? events.get(task.relatedEventId) : undefined;
    items.push({
      key: `block:${b.kind}:${b.refId}:${b.start}`,
      title: b.title,
      start: b.start,
      end: b.end,
      color: b.kind === "task" ? (rel ? colorOf(rel.calendarId) : "var(--cal-task)") : b.kind === "habit" ? "var(--cal-habit)" : "var(--cal-routine)",
      sub:
        b.kind === "task"
          ? rel
            ? `→ ${rel.event.title} ${formatEventWhen(rel.event)}`
            : "タスク"
          : b.kind === "habit"
            ? "習慣"
            : undefined,
      taskId: task?.id,
      past,
      action: rainSwap
        ? { label: rainy ? `晴れたので「${habit!.name}」に戻す` : "雨なので家の中でやる", onClick: toggleRain }
        : past && tracked && m === undefined
          ? { label: "できなかった", ariaLabel: `${b.title}：できなかった`, onClick: () => miss(b) }
          : undefined,
      record: tracked ? { mark: m, onMark: (v) => mark(day, b.refId, v) } : undefined,
    });
  }
  // 枠を外して空けた時間。押すと、また自動で入るように戻せる
  for (const k of state.keepFree ?? []) {
    if (k.end <= now || k.start >= dayEnd) continue;
    items.push({
      key: `free:${k.id}`,
      title: "空けた時間",
      start: k.start,
      end: k.end,
      color: "var(--muted)",
      dim: true,
      action: { label: "戻す", onClick: () => update((d) => releaseKeepFree(d, k.id)) },
    });
  }
  items.sort((a, b) => a.start - b.start || a.end - b.end);
  const nextIdx = items.findIndex((i) => i.start > now && !i.dim);
  const shown = all || !limit ? items : items.slice(0, Math.max(limit, nextIdx + 1));
  const allDay = allEventRefs(state).filter((r) => r.event.allDay && r.event.start < dayEnd && r.event.end > now);

  return (
    <Card title="今日の流れ">
      {allDay.length > 0 && (
        <div className="flex flex-wrap gap-1.5 px-4 pt-1 pb-2.5">
          {allDay.map((r) => (
            <span key={r.event.id} className="rounded-full px-2.5 py-0.5 text-[13px]" style={{ background: `color-mix(in srgb, ${colorOf(r.calendarId)} 16%, transparent)` }}>
              {r.event.title}
            </span>
          ))}
        </div>
      )}
      {items.length === 0 ? (
        <p className="px-4 pt-1 pb-3.5 text-[14px] text-muted">今日の残りの予定はありません。</p>
      ) : (
        <ol className="flex flex-col pt-0.5 pb-2">
          {shown.map((it, i) => {
            const current = it.start <= now && it.end > now;
            const next = i === nextIdx;
            const text = (
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 text-[15px] font-medium leading-snug">
                  <span className="min-w-0 truncate">{it.title}</span>
                  {it.relatedCount ? (
                    <span className="flex shrink-0 items-center gap-0.5 text-[12px] font-normal text-muted" aria-label={`関連するタスク${it.relatedCount}件`}>
                      <LinkIcon size={11} />
                      {it.relatedCount}
                    </span>
                  ) : null}
                  {current && <span className="shrink-0 rounded-full bg-accent px-1.5 text-[11px] font-semibold leading-[18px] text-white">いま</span>}
                  {next && <span className="shrink-0 rounded-full bg-tint px-1.5 text-[11px] font-semibold leading-[18px] text-on-tint">次</span>}
                </p>
                <p className="truncate text-[12px] text-muted">
                  {formatTime(it.start)}〜{formatTime(it.end)}
                  {it.sub ? `・${it.sub}` : ""}
                </p>
                {it.action && (
                  <button type="button" aria-label={it.action.ariaLabel} onClick={it.action.onClick} className={`${textBtn} mt-1.5`}>
                    {it.action.label}
                  </button>
                )}
              </div>
            );
            const body = (
              <>
                <div className={`w-11 shrink-0 pt-px text-right text-[13px] tabular-nums ${current ? "font-semibold text-fg" : "text-muted"}`}>{formatTime(it.start)}</div>
                <span className={`w-[3px] shrink-0 self-stretch rounded-full ${it.past ? "opacity-40" : ""}`} style={{ background: it.color }} />
                {text}
              </>
            );
            const row = "mx-2 flex items-start gap-3 rounded-xl px-2 py-2";
            const style = current ? { background: `color-mix(in srgb, ${it.color} 9%, transparent)` } : undefined;
            return (
              <li key={it.key} className={it.dim ? "opacity-55" : undefined}>
                {it.taskId ? (
                  <button type="button" onClick={() => openTask(it.taskId)} className={`${row} w-[calc(100%-1rem)] text-left active:bg-surface2`} style={style}>
                    {body}
                  </button>
                ) : (
                  <div className={row} style={style}>
                    {body}
                    {it.record && (
                      <div className="flex shrink-0 gap-1.5 self-center">
                        {(["five", "done"] as const).map((v) => (
                          <button
                            key={v}
                            type="button"
                            aria-pressed={it.record!.mark === v}
                            aria-label={`${it.title}：${v === "five" ? "5分" : "やった"}`}
                            onClick={() => it.record!.onMark(v)}
                            className={`press rounded-full px-2.5 py-1 text-[13px] font-medium ${it.record!.mark === v ? "bg-ok text-white" : "bg-surface2"}`}
                          >
                            {v === "five" ? "5分" : "やった"}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </li>
            );
          })}
          {shown.length < items.length && (
            <li>
              <button type="button" onClick={() => setAll(true)} className="flex w-full items-center gap-1 px-4 pt-1.5 pb-1 text-left text-[14px] font-medium text-tint">
                ほか {items.length - shown.length}件
                <svg viewBox="0 0 12 12" width="11" height="11" aria-hidden className="text-muted">
                  <path d="M2.5 4.5 6 8l3.5-3.5" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </li>
          )}
        </ol>
      )}
    </Card>
  );
}

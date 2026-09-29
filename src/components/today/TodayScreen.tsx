"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { estimateMinutes, type DayPlan, type EveningEnergy, type Habit, type Task } from "@/lib/scheduler";
import { useApp } from "@/components/app/StoreProvider";
import { LinkIcon } from "@/components/app/icons";
import { CALENDARS, type CalendarId } from "@/lib/mock/calendars";
import { DAY_MS, MIN, dayStartOf, formatDate, formatMinutes, formatTime, newId } from "@/lib/mock/jst";
import { TREAT_CATEGORIES, dateKeyOf, dayStartOfKey, treatFor, wakeStreak, taskBlockKey, taskCheckKey, type ContactAnswer, type TaskCheck, type HabitMark, type MorningFatigue, type TaskBlockLog, type WakeLog } from "@/lib/mock/model";
import { TAGS, completeTask, contactDaysFor } from "@/lib/mock/state";
import { allEventRefs, eventIndex, formatEventWhen, tasksByEvent } from "@/lib/mock/related";
import { Group, ScreenHeader } from "@/components/ui/controls";
import Notices, { hasNotices } from "./Notices";

const colorOf = (id: CalendarId) => CALENDARS.find((c) => c.id === id)?.colorVar ?? "var(--muted)";

/** 1分ごとに「今」を進める */
function useNow(): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(t);
  }, []);
  return now;
}

/** 日付をまたいだ時刻には「翌」をつける */
function timeOn(day: number, ms: number) {
  return `${ms >= day + DAY_MS ? "翌" : ""}${formatTime(ms)}`;
}

function SleepCard({ day, today, now }: { day: DayPlan; today: number; now: number }) {
  const toLeave = day.leave !== undefined ? Math.round((day.leave - now) / MIN) : undefined;
  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="rounded-xl bg-surface px-4 py-3">
        <p className="text-[13px] font-medium text-muted">起床</p>
        <p className="text-[34px] font-semibold leading-tight tabular-nums">{formatTime(day.wake)}</p>
      </div>
      <div className="rounded-xl bg-surface px-4 py-3">
        <p className="text-[13px] font-medium text-muted">就寝</p>
        <p className="text-[34px] font-semibold leading-tight tabular-nums">{timeOn(today, day.bed)}</p>
      </div>
      {day.firstEvent && (
        <p className="col-span-2 px-1 text-[13px] text-muted">
          最初の予定は{formatTime(day.firstEvent.start)}「{day.firstEvent.title}」
          {day.leave ? `。${formatTime(day.leave)}に出発` : ""}
          {toLeave !== undefined && toLeave > 0 && toLeave <= 180 && (
            <span className="ml-1 font-semibold text-accent">あと{formatMinutes(toLeave)}</span>
          )}
        </p>
      )}
    </div>
  );
}

function CheckCircle({ on }: { on: boolean }) {
  return (
    <span
      className={`flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border-2 ${on ? "border-ok bg-ok" : "border-line"}`}
    >
      {on && (
        <svg viewBox="0 0 12 12" width="12" height="12" aria-hidden>
          <path d="M2.5 6.2 5 8.5l4.5-5" stroke="white" strokeWidth="1.8" fill="none" strokeLinecap="round" />
        </svg>
      )}
    </span>
  );
}

const FATIGUE_OPTIONS: { value: MorningFatigue; label: string }[] = [
  { value: 1, label: "元気" },
  { value: 2, label: "少し" },
  { value: 3, label: "ふつう" },
  { value: 4, label: "かなり" },
  { value: 5, label: "ぐったり" },
];

function MorningCard({ day, now }: { day?: DayPlan; now: number }) {
  const { state, patch } = useApp();
  const today = dayStartOf(now);
  const key = dateKeyOf(today);
  const log: WakeLog = state.wakeLogs.find((l) => l.date === key) ?? { date: key, doneStepIds: [] };
  const streak = wakeStreak(state.wakeLogs, today);
  const steps = state.routineSteps;

  const setLog = (fn: (l: WakeLog) => WakeLog) =>
    patch((d) => {
      const cur = d.wakeLogs.find((l) => l.date === key) ?? { date: key, doneStepIds: [] };
      const next = fn(cur);
      // 記録は1年ぶんだけ残す
      const rest = d.wakeLogs.filter((l) => l.date !== key);
      return { wakeLogs: [...rest, next].sort((a, b) => a.date.localeCompare(b.date)).slice(-400) };
    });

  const toggleStep = (id: string) =>
    setLog((l) => {
      const done = l.doneStepIds.includes(id) ? l.doneStepIds.filter((x) => x !== id) : [...l.doneStepIds, id];
      const all = steps.length > 0 && steps.every((s) => done.includes(s.id));
      const next: WakeLog = { ...l, doneStepIds: done };
      if (all) next.routineDoneAt = l.routineDoneAt ?? Date.now();
      else delete next.routineDoneAt;
      return next;
    });

  const lateBy = log.wokeAt !== undefined && day ? Math.round((log.wokeAt - day.wake) / MIN) : 0;

  return (
    <Group
      title={
        <span className="flex items-center justify-between">
          朝ルーティン
          {streak > 0 && <span className="font-semibold text-ok">連続 {streak}日</span>}
        </span>
      }
    >
      <div className="px-4 py-3">
        {log.wokeAt === undefined ? (
          <button
            type="button"
            onClick={() => setLog((l) => ({ ...l, wokeAt: Date.now(), plannedWake: day?.wake }))}
            className="w-full rounded-2xl bg-accent py-4 text-[20px] font-bold text-white shadow-sm active:opacity-80"
          >
            起きた
          </button>
        ) : (
          <div className="flex items-center gap-3">
            <CheckCircle on />
            <p className="min-w-0 flex-1 text-[15px]">
              {formatTime(log.wokeAt)}に起きました
              {day && Math.abs(lateBy) >= 5 && (
                <span className="text-muted">（予定より{formatMinutes(Math.abs(lateBy))}{lateBy > 0 ? "遅く" : "早く"}）</span>
              )}
            </p>
            <button
              type="button"
              className="shrink-0 text-[13px] text-muted underline"
              onClick={() =>
                setLog((l) => {
                  const next = { ...l };
                  delete next.wokeAt;
                  delete next.plannedWake;
                  return next;
                })
              }
            >
              取り消す
            </button>
          </div>
        )}
        {log.wokeAt !== undefined && (
          <div className="mt-3">
            <p className="mb-1.5 text-[13px] text-muted">今の疲れ</p>
            <div className="grid grid-cols-5 gap-1.5">
              {FATIGUE_OPTIONS.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => setLog((l) => ({ ...l, fatigue: o.value }))}
                  className={`rounded-xl py-2 text-[13px] font-medium ${log.fatigue === o.value ? "bg-accent text-white" : "bg-surface2"}`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      {steps.length === 0 ? (
        <p className="px-4 py-3 text-[14px] text-muted">
          手順は<Link href="/settings/routine" className="text-accent">設定</Link>で追加できます。
        </p>
      ) : (
        steps.map((s) => {
          const on = log.doneStepIds.includes(s.id);
          return (
            <button
              key={s.id}
              type="button"
              role="checkbox"
              aria-checked={on}
              onClick={() => toggleStep(s.id)}
              className="flex min-h-11 w-full items-center gap-3 px-4 py-2 text-left active:bg-surface2"
            >
              <CheckCircle on={on} />
              <span className={`text-[16px] ${on ? "text-muted line-through" : ""}`}>{s.title}</span>
            </button>
          );
        })
      )}
      {log.routineDoneAt !== undefined && (
        <p className="px-4 py-2.5 text-[14px] font-medium text-ok">{formatTime(log.routineDoneAt)}に朝ルーティンが終わりました</p>
      )}
    </Group>
  );
}

function TreatCard({ today }: { today: number }) {
  const { state } = useApp();
  const treat = treatFor(today, state.treats);
  return (
    <Group title="今日の楽しみ">
      {treat ? (
        <div className="px-4 py-3">
          <p className="text-[12px] font-medium text-muted">{TREAT_CATEGORIES.find((c) => c.id === treat.category)?.label}</p>
          <p className="text-[20px] font-semibold leading-snug">{treat.name}</p>
          {treat.condition && <p className="mt-0.5 text-[13px] text-muted">{treat.condition}</p>}
        </div>
      ) : (
        <p className="px-4 py-3 text-[14px] text-muted">
          <Link href="/settings/treats" className="text-accent">楽しみのリスト</Link>に追加すると、毎日1つ選びます。
        </p>
      )}
    </Group>
  );
}

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
  /** 枠の下に出す小さなボタン（雨の日の散歩の入れ替えなど） */
  action?: { label: string; onClick: () => void };
}

function Timeline({ now, dayEnd }: { now: number; dayEnd: number }) {
  const { state, openTask, update } = useApp();
  const events = eventIndex(state);
  const related = tasksByEvent(state.tasks, events);
  const items: TimelineItem[] = [];

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
  const rainy = state.rainyDays.includes(todayKey);
  const toggleRain = () =>
    update((d) => ({
      ...d,
      rainyDays: rainy ? d.rainyDays.filter((k) => k !== todayKey) : [...d.rainyDays.filter((k) => k >= dateKeyOf(now - 14 * DAY_MS)), todayKey],
    }));
  for (const b of state.result.blocks) {
    if (b.end <= now || b.start >= dayEnd) continue;
    const task = b.kind === "task" ? state.tasks.find((t) => t.id === b.refId) : undefined;
    const habit = b.kind === "habit" ? state.habits.find((h) => h.id === b.refId) : undefined;
    const rainSwap = habit?.rainAlternative && dateKeyOf(b.start) === todayKey && b.start > now;
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
      action: rainSwap ? { label: rainy ? `晴れたので「${habit!.name}」に戻す` : "雨なので家の中でやる", onClick: toggleRain } : undefined,
    });
  }
  items.sort((a, b) => a.start - b.start || a.end - b.end);
  const nextIdx = items.findIndex((i) => i.start > now && !i.dim);
  const allDay = allEventRefs(state).filter((r) => r.event.allDay && r.event.start < dayEnd && r.event.end > now);

  return (
    <Group title="今日の流れ">
      {allDay.length > 0 && (
        <div className="flex flex-wrap gap-1.5 px-4 py-2.5">
          {allDay.map((r) => (
            <span key={r.event.id} className="rounded-md px-2 py-0.5 text-[13px]" style={{ background: `color-mix(in srgb, ${colorOf(r.calendarId)} 18%, transparent)` }}>
              終日：{r.event.title}
            </span>
          ))}
        </div>
      )}
      {items.length === 0 ? (
        <p className="px-4 py-3 text-[14px] text-muted">今日の残りの予定はありません。</p>
      ) : (
        <ol className="flex flex-col py-1">
          {items.map((it, i) => {
            const current = it.start <= now && it.end > now;
            const next = i === nextIdx;
            const body = (
              <>
                <div className="w-12 shrink-0 pt-0.5 text-right text-[13px] tabular-nums text-muted">{formatTime(it.start)}</div>
                <div className="relative flex w-3 shrink-0 justify-center self-stretch">
                  <span className="absolute inset-y-0 w-px bg-line" />
                  <span className="relative mt-1.5 h-2.5 w-2.5 rounded-full ring-2 ring-surface" style={{ background: it.color }} />
                </div>
                <div
                  className={`min-w-0 flex-1 rounded-lg px-2.5 py-1.5 ${next ? "ring-2 ring-accent" : ""}`}
                  style={{ background: `color-mix(in srgb, ${it.color} ${current || next ? 16 : 9}%, transparent)` }}
                >
                  <p className="flex items-center gap-1.5 text-[15px] font-medium">
                    <span className="min-w-0 truncate">{it.title}</span>
                    {it.relatedCount ? (
                      <span className="flex shrink-0 items-center gap-0.5 text-[12px] text-muted" aria-label={`関連するタスク${it.relatedCount}件`}>
                        <LinkIcon size={11} />
                        {it.relatedCount}
                      </span>
                    ) : null}
                    {current && <span className="ml-auto shrink-0 rounded-full bg-accent px-1.5 text-[11px] leading-[18px] text-white">いま</span>}
                    {next && <span className="ml-auto shrink-0 rounded-full bg-accent px-1.5 text-[11px] leading-[18px] text-white">次</span>}
                  </p>
                  <p className="truncate text-[12px] text-muted">
                    {formatTime(it.start)}〜{formatTime(it.end)}
                    {it.sub ? `・${it.sub}` : ""}
                  </p>
                  {it.action && (
                    <button type="button" onClick={it.action.onClick} className="mt-1 text-[13px] font-medium text-accent">
                      {it.action.label}
                    </button>
                  )}
                </div>
              </>
            );
            return (
              <li key={it.key} className={it.dim ? "opacity-55" : undefined}>
                {it.taskId ? (
                  <button type="button" onClick={() => openTask(it.taskId)} className="flex w-full gap-2 px-3 py-1 text-left">
                    {body}
                  </button>
                ) : (
                  <div className="flex gap-2 px-3 py-1">{body}</div>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </Group>
  );
}

function Gaps({ now, day }: { now: number; day: DayPlan }) {
  const { state } = useApp();
  const gaps = state.result.freeGaps
    .filter((g) => g.end > now && g.start < day.bed)
    .map((g) => ({ start: Math.max(g.start, now), end: g.end }))
    .filter((g) => g.end - g.start >= 20 * MIN);
  return (
    <Group title="今日のすきま時間">
      {gaps.length === 0 ? (
        <p className="px-4 py-3 text-[14px] text-muted">今日はまとまった空き時間がありません。</p>
      ) : (
        gaps.map((g) => {
          const len = (g.end - g.start) / MIN;
          return (
            <div key={g.start} className="flex items-center gap-3 px-4 py-2.5">
              <span className="shrink-0 whitespace-nowrap text-[15px] tabular-nums">
                {formatTime(g.start)}〜{formatTime(g.end)}
              </span>
              <span className="min-w-0 flex-1 text-[14px] text-muted">
                {formatMinutes(len)}
              </span>
            </div>
          );
        })
      )}
    </Group>
  );
}

const EVENING_OPTIONS: { value: EveningEnergy; label: string }[] = [
  { value: "high", label: "多い" },
  { value: "normal", label: "ふつう" },
  { value: "low", label: "少ない" },
];

/** 外出した日の夜：帰宅したら残りの体力を聞き、今夜だけ組み直す */
function EveningCard({ day, now }: { day: DayPlan; now: number }) {
  const { state, update } = useApp();
  const [editing, setEditing] = useState(false);
  const key = dateKeyOf(day.dayStart);
  const answer = state.eveningEnergy[key];
  if (day.homeAt === undefined || now < day.homeAt - 60 * MIN || now >= day.bed) return null;
  const choose = (v: EveningEnergy) => {
    // 答えたときの予測も残す（あとで行動ポイントの値を合わせるため）
    const e = state.result.dayEnergy.find((x) => x.dayStart === day.dayStart);
    update((d) => ({
      ...d,
      eveningEnergy: { ...d.eveningEnergy, [key]: v },
      energyChecks: e ? { ...d.energyChecks, [key]: { predicted: e.used, budget: e.budget, at: Date.now() } } : d.energyChecks,
    }));
    setEditing(false);
  };
  const picked = EVENING_OPTIONS.find((o) => o.value === answer);
  return (
    <Group title="おかえりなさい">
      <div className="flex flex-col gap-3 px-4 py-3">
        {picked && !editing ? (
          <div className="flex items-start justify-between gap-3">
            <p className="text-[15px]">
              今夜の体力：<span className="font-semibold">{picked.label}</span>
            </p>
            <button type="button" onClick={() => setEditing(true)} className="shrink-0 text-[14px] text-accent">
              変える
            </button>
          </div>
        ) : (
          <>
            <p className="text-[15px]">残りの体力は？</p>
            <div className="grid grid-cols-3 gap-2">
              {EVENING_OPTIONS.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => choose(o.value)}
                  className={`rounded-xl py-2.5 text-[16px] font-semibold ${o.value === answer ? "bg-accent text-white" : "bg-surface2"}`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </Group>
  );
}

/** 今日の行動ポイント。上限を超える日は、発散の時間を提案する */
function EnergyCard({ today }: { today: number }) {
  const { state } = useApp();
  const e = state.result.dayEnergy.find((x) => x.dayStart === today);
  if (!e) return null;
  const ratio = Math.min(1, e.used / e.budget);
  const over = e.used > e.budget;
  const tired = e.evening === "low";
  return (
    <Group title="今日の行動ポイント">
      <div className="flex flex-col gap-2 px-4 py-3">
        <p className="text-[15px] tabular-nums">
          <span className="text-[22px] font-semibold">{e.used}</span>
          <span className="text-muted"> / {e.budget} ポイント</span>
        </p>
        <div className="h-2 overflow-hidden rounded-full bg-surface2" role="meter" aria-valuenow={e.used} aria-valuemin={0} aria-valuemax={e.budget} aria-label="今日の行動ポイント">
          <div className={`h-full rounded-full ${over ? "bg-accent" : "bg-ok"}`} style={{ width: `${ratio * 100}%` }} />
        </div>
        {tired ? (
          <p className="text-[14px]">
            {e.suggestion ? `${formatTime(e.suggestion.start)}〜 ${e.suggestion.name}` : "今夜は休む"}
          </p>
        ) : over ? (
          <p className="text-[14px]">
            {e.suggestion ? `上限超え・${formatTime(e.suggestion.start)}〜 ${e.suggestion.name}` : "上限超え"}
          </p>
        ) : (
          <p className="text-[13px] text-muted">あと {Math.round((e.budget - e.used) * 10) / 10}</p>
        )}
      </div>
    </Group>
  );
}

/** この日を含む14日間に記録した回数（5分だけは、5分以下の習慣なら1回、ほかは0.5回） */
function countMarks(logs: Record<string, Record<string, HabitMark>>, habit: Habit, lastDay: number): number {
  let n = 0;
  for (let i = 0; i < 14; i++) {
    const m = logs[dateKeyOf(lastDay - i * DAY_MS)]?.[habit.id];
    if (m === "done" || (m === "five" && habit.durationMinutes <= 5)) n += 1;
    else if (m === "five") n += 0.5;
  }
  return n;
}

/** 記録する習慣：やった／5分だけ を押す。押さなければ、やっていない */
function HabitLogCard({ today, now }: { today: number; now: number }) {
  const { state, update } = useApp();
  // 始まったタスクの枠（記録に残っているものと、今の枠）
  const taskRows = new Map<string, TaskBlockLog>();
  for (const [k, l] of Object.entries(state.taskBlockLog)) if (l.start >= today && l.start < today + DAY_MS) taskRows.set(k, l);
  for (const b of state.result.blocks) {
    const k = taskBlockKey(b.refId, b.start);
    if (b.kind === "task" && b.start >= today && b.start <= now && !taskRows.has(k)) taskRows.set(k, { title: b.title, start: b.start, end: b.end });
  }
  const toggleTask = (k: string, l: TaskBlockLog) =>
    update((d) => {
      const cur = d.taskBlockLog[k] ?? l;
      return { ...d, taskBlockLog: { ...d.taskBlockLog, [k]: { ...cur, doneAt: cur.doneAt === undefined ? Date.now() : undefined } } };
    });
  const key = dateKeyOf(today);
  const marks = state.habitLogs[key] ?? {};
  const tracked = new Map(state.habits.filter((h) => h.track).map((h) => [h.id, h]));
  const rows = state.result.blocks
    .filter((b) => b.kind === "habit" && tracked.has(b.refId) && b.start >= today && b.start < today + DAY_MS)
    .sort((a, b) => a.start - b.start)
    .filter((b, i, all) => all.findIndex((x) => x.refId === b.refId) === i);
  if (rows.length === 0 && taskRows.size === 0) return null;
  const mark = (id: string, m: HabitMark) =>
    update((d) => {
      const day = { ...d.habitLogs[key] };
      if (day[id] === m) delete day[id];
      else day[id] = m;
      return { ...d, habitLogs: { ...d.habitLogs, [key]: day } };
    });
  return (
    <Group title="今日の記録">
      <ul className="flex flex-col py-1">
        {[...taskRows]
          .sort((a, b) => a[1].start - b[1].start)
          .map(([k, l]) => (
            <li key={k} className="flex items-center gap-2 px-4 py-2">
              <span className="w-12 shrink-0 text-[13px] tabular-nums text-muted">{formatTime(l.start)}</span>
              <span className="min-w-0 flex-1 truncate text-[15px]">{l.title}</span>
              <button
                type="button"
                aria-pressed={l.doneAt !== undefined}
                onClick={() => toggleTask(k, l)}
                className={`shrink-0 rounded-lg px-3 py-1.5 text-[14px] ${l.doneAt !== undefined ? "bg-accent font-medium text-white" : "bg-surface2"}`}
              >
                やった
              </button>
            </li>
          ))}
        {rows.map((b) => {
          const m = marks[b.refId];
          const btn = (value: HabitMark, label: string) => (
            <button
              type="button"
              aria-pressed={m === value}
              onClick={() => mark(b.refId, value)}
              className={`shrink-0 rounded-lg px-3 py-1.5 text-[14px] ${m === value ? "bg-accent font-medium text-white" : "bg-surface2"}`}
            >
              {label}
            </button>
          );
          return (
            <li key={b.refId} className="flex items-center gap-2 px-4 py-2">
              <span className="w-12 shrink-0 text-[13px] tabular-nums text-muted">{formatTime(b.start)}</span>
              <span className="min-w-0 flex-1 truncate text-[15px]">{b.title}</span>
              <span className="shrink-0 text-[12px] tabular-nums text-muted" aria-label="2週間の回数">
                {countMarks(state.habitLogs, tracked.get(b.refId)!, today)}回
              </span>
              {btn("five", "5分")}
              {btn("done", "やった")}
            </li>
          );
        })}
      </ul>
    </Group>
  );
}

/** 少しずつ増やす習慣（家での運動）：2週間たったら記録を見て、増やすか・きっかけを変えるかを聞く */
function ReviewCard({ today }: { today: number }) {
  const { state, update } = useApp();
  const key = dateKeyOf(today);
  const habit = state.habits.find((h) => {
    const from = h.progression && dayStartOfKey(h.progression.reviewFrom);
    return from !== undefined && today >= from + 14 * DAY_MS;
  });
  if (!habit?.progression) return null;
  const p = habit.progression;
  // 昨日までの2週間
  const done = countMarks(state.habitLogs, habit, today - DAY_MS);
  const planned = habit.frequency.type === "weekly" ? habit.frequency.times * 2 : 14;
  const ratio = done / planned;
  const up = ratio >= 0.8 && habit.durationMinutes < p.maxMinutes;
  const low = ratio < 0.5;
  const finish = (grow: boolean) =>
    update((d) => ({
      ...d,
      habits: d.habits.map((h) =>
        h.id === habit.id
          ? {
              ...h,
              durationMinutes: grow ? Math.min(p.maxMinutes, h.durationMinutes + p.stepMinutes) : h.durationMinutes,
              progression: { ...p, reviewFrom: key },
            }
          : h,
      ),
    }));
  const btn = "rounded-lg px-4 py-2 text-[15px]";
  return (
    <Group title={habit.name}>
      <div className="flex flex-col gap-3 px-4 py-3">
        <p className="text-[15px] tabular-nums">
          2週間で {done} / {planned} 回
        </p>
        <div className="flex flex-wrap gap-2">
          {up && (
            <button type="button" onClick={() => finish(true)} className={`${btn} bg-accent font-medium text-white`}>
              {habit.durationMinutes + p.stepMinutes}分にする
            </button>
          )}
          {low && (
            <Link href="/settings/habits" onClick={() => finish(false)} className={`${btn} bg-accent font-medium text-white`}>
              きっかけを変える
            </Link>
          )}
          <button type="button" onClick={() => finish(false)} className={`${btn} bg-surface2`}>
            このまま
          </button>
        </div>
      </div>
    </Group>
  );
}

/** 残り時間を − ＋ で動かす幅（分） */
const STEP = 30;

/** その日の最後の枠が終わったタスクに「終わった？」。終わった／今日はやってない／残り時間を − ＋ で直して決める */
function TaskCheckCard({ today, now }: { today: number; now: number }) {
  const { state, update } = useApp();
  const key = dateKeyOf(today);
  /** − ＋ で動かした分（タスクの ID → 分） */
  const [delta, setDelta] = useState<Record<string, number>>({});
  // 今日の枠（始まったもの）の最後が終わっていて、このあと今日の枠がなく、まだ答えていないタスク
  const todays = new Map<string, TaskBlockLog[]>();
  for (const [k, b] of Object.entries(state.taskBlockLog)) {
    if (b.start < today || b.start >= today + DAY_MS) continue;
    const id = k.slice(0, k.lastIndexOf(":"));
    todays.set(id, [...(todays.get(id) ?? []), b]);
  }
  const ask = state.tasks.filter((t) => {
    const logs = todays.get(t.id);
    if (!logs || logs.some((l) => l.end > now) || state.taskChecks[taskCheckKey(t.id, key)]) return false;
    return !state.result.blocks.some((b) => b.kind === "task" && b.refId === t.id && b.start > now && b.start < today + DAY_MS);
  });
  if (ask.length === 0) return null;
  const leftOf = (t: Task) => t.remainingMinutes ?? estimateMinutes(t, TAGS.find((g) => g.id === t.tagId));
  const answer = (t: Task, a: TaskCheck["answer"], delta = 0) =>
    update((d) => {
      const before = leftOf(t);
      const check: TaskCheck = { at: Date.now(), answer: a, beforeMinutes: before, ...(a === "adjust" ? { deltaMinutes: delta } : {}) };
      const taskChecks = { ...d.taskChecks, [taskCheckKey(t.id, key)]: check };
      if (a === "done") return completeTask({ ...d, taskChecks }, t.id, Date.now());
      // やっていなければ、今日の枠のぶん引いた残りを戻す
      const back = a === "none" ? (todays.get(t.id) ?? []).filter((l) => l.counted).reduce((s, l) => s + Math.round((l.end - l.start) / MIN), 0) : 0;
      const next = Math.max(15, before + delta + back);
      return { ...d, taskChecks, tasks: d.tasks.map((x) => (x.id === t.id ? { ...x, remainingMinutes: next } : x)) };
    });
  const btn = "shrink-0 rounded-lg px-3 py-1.5 text-[14px] tabular-nums";
  const round = "flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface2 text-[20px] leading-none";
  return (
    <Group title="終わった？">
      <ul className="flex flex-col divide-y divide-line py-1">
        {ask.map((t) => {
          const left = leftOf(t);
          const dm = delta[t.id] ?? 0;
          const next = Math.max(STEP, left + dm);
          const move = (m: number) => setDelta((p) => ({ ...p, [t.id]: Math.max(STEP - left, dm + m) }));
          return (
            <li key={t.id} className="flex flex-col gap-3 px-4 py-3">
              <p className="truncate text-[15px] font-medium">{t.title}</p>
              <div className="flex items-center gap-2">
                <button type="button" aria-label="残りを30分減らす" onClick={() => move(-STEP)} className={round}>
                  −
                </button>
                <div className="min-w-0 flex-1 text-center tabular-nums">
                  <p className="text-[12px] text-muted">残り</p>
                  <p className="text-[17px] font-semibold">
                    {formatMinutes(next)}
                    {dm !== 0 && <span className="ml-1 text-[12px] font-normal text-muted">（予定 {formatMinutes(left)}）</span>}
                  </p>
                </div>
                <button type="button" aria-label="残りを30分増やす" onClick={() => move(STEP)} className={round}>
                  ＋
                </button>
                <button type="button" onClick={() => answer(t, "adjust", next - left)} className={`${btn} bg-surface2 font-medium`}>
                  決定
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => answer(t, "done")} className={`${btn} bg-accent font-medium text-white`}>
                  終わった
                </button>
                <button type="button" onClick={() => answer(t, "none")} className={`${btn} bg-surface2`}>
                  今日はやってない
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </Group>
  );
}

/** 余裕のある週の最初の休日に「連絡してみる？」。答えたらその週はもう出さない */
function ContactCard({ today, now }: { today: number; now: number }) {
  const { state, update } = useApp();
  const c = contactDaysFor(state, now).find((x) => x.dayStart === today);
  if (!c) return null;
  const answer = (a: ContactAnswer) => update((d) => ({ ...d, contactLogs: { ...d.contactLogs, [dateKeyOf(c.weekStart)]: a } }));
  return (
    <Group title="連絡してみる？">
      <div className="flex gap-2 px-4 py-3">
        <button type="button" onClick={() => answer("done")} className="rounded-lg bg-accent px-4 py-2 text-[15px] font-medium text-white">
          連絡した
        </button>
        <button type="button" onClick={() => answer("skip")} className="rounded-lg bg-surface2 px-4 py-2 text-[15px]">
          今週はいい
        </button>
      </div>
    </Group>
  );
}

/** タバコ：押すと時刻を残すだけ。目標や多い少ないは出さない */
function SmokeCard({ today }: { today: number }) {
  const { state, update } = useApp();
  const [undoAt, setUndoAt] = useState<number>();
  useEffect(() => {
    if (undoAt === undefined) return;
    const t = window.setTimeout(() => setUndoAt(undefined), 5000);
    return () => window.clearTimeout(t);
  }, [undoAt]);
  const todays = state.smokeLogs.filter((t) => t >= today && t < today + DAY_MS);
  const add = () => {
    const at = Date.now();
    // 60日より前の記録は捨てる
    update((d) => ({ ...d, smokeLogs: [...d.smokeLogs.filter((t) => t >= at - 60 * DAY_MS), at] }));
    setUndoAt(at);
  };
  const undo = () => {
    update((d) => ({ ...d, smokeLogs: d.smokeLogs.filter((t) => t !== undoAt) }));
    setUndoAt(undefined);
  };
  return (
    <Group title="タバコ">
      <div className="flex items-center gap-3 px-4 py-3">
        {undoAt !== undefined ? (
          <button type="button" onClick={undo} className="shrink-0 rounded-lg bg-surface2 px-4 py-2 text-[15px]">
            取り消す
          </button>
        ) : (
          <button type="button" onClick={add} className="shrink-0 rounded-lg bg-accent px-4 py-2 text-[15px] font-medium text-white">
            吸った
          </button>
        )}
        <p className="min-w-0 text-[13px] tabular-nums text-muted">
          {todays.length > 0 ? `${todays.length}本・${todays.map(formatTime).join(" ")}` : ""}
        </p>
      </div>
    </Group>
  );
}

export default function TodayScreen() {
  const { state, update, openTask, sync } = useApp();
  // タスクの枠の始まりの通知から開いたら、その枠を「やった」にする（サーバーの内容を読んでから）
  useEffect(() => {
    if (sync === "loading") return;
    const key = new URLSearchParams(window.location.search).get("done");
    if (!key) return;
    window.history.replaceState(null, "", "/");
    update((d) => {
      const cur = d.taskBlockLog[key];
      if (cur?.doneAt !== undefined) return d;
      const b = cur ?? d.blocks.find((x) => x.kind === "task" && taskBlockKey(x.refId, x.start) === key);
      if (!b) return d;
      return { ...d, taskBlockLog: { ...d.taskBlockLog, [key]: { title: b.title, start: b.start, end: b.end, doneAt: Date.now() } } };
    });
  }, [sync, update]);
  const now = useNow();
  const today = dayStartOf(now);
  const days = state.result.dayPlans;
  const idx = days.findIndex((d) => d.dayStart === today);
  const day = idx >= 0 ? days[idx] : undefined;
  const dayEnd = Math.max(day?.bed ?? 0, today + DAY_MS);

  const registerPlace = (location: string, minutes: number) =>
    update((d) => ({
      ...d,
      places: [...d.places, { id: newId("place"), name: location, keywords: [location], travelMinutes: minutes }],
    }));

  return (
    <div className="h-full overflow-y-auto bg-grouped">
      <ScreenHeader title="今日" sub={formatDate(today)} width="max-w-5xl" />
      <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 pb-8 sm:px-6 lg:grid lg:grid-cols-2 lg:items-start">
        <div className="flex flex-col gap-6">
          {day && <EveningCard day={day} now={now} />}
          {day && <SleepCard day={day} today={today} now={now} />}
          <EnergyCard today={today} />
          <MorningCard day={day} now={now} />
          <TreatCard today={today} />
          <ContactCard today={today} now={now} />
          <SmokeCard today={today} />
        </div>
        <div className="flex flex-col gap-6">
          <TaskCheckCard today={today} now={now} />
          <ReviewCard today={today} />
          <HabitLogCard today={today} now={now} />
          <Timeline now={now} dayEnd={dayEnd} />
          {hasNotices(state) && (
            <Group title="お知らせ">
              <Notices state={state} onRegisterPlace={registerPlace} onOpenTask={openTask} />
            </Group>
          )}
          {day && <Gaps now={now} day={day} />}
        </div>
      </div>
    </div>
  );
}

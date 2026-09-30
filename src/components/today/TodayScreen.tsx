"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { type DayPlan, type EveningEnergy, type Habit, type PlanResult } from "@/lib/scheduler";
import { useApp } from "@/components/app/StoreProvider";
import { LinkIcon } from "@/components/app/icons";
import { CALENDARS, type CalendarId } from "@/lib/mock/calendars";
import { DAY_MS, MIN, dayStartOf, formatDate, formatMinutes, formatTime, newId } from "@/lib/mock/jst";
import { TREAT_CATEGORIES, dateKeyOf, dayStartOfKey, treatFor, wakeStreak, type ContactAnswer, type HabitMark, type MorningFatigue, type WakeLog } from "@/lib/mock/model";
import { contactDaysFor, rainyDayKeys, releaseKeepFree } from "@/lib/mock/state";
import { allEventRefs, eventIndex, formatEventWhen, tasksByEvent } from "@/lib/mock/related";
import { bedOnTime, keepMarkValues } from "@/lib/mock/stats";
import { BED_PREP_MINUTES } from "@/lib/notify/build";
import { Card, Row, ScreenHeader, btnPrimary, btnSecondary } from "@/components/ui/controls";
import ProgressCard from "./ProgressCard";
import RecoveryCard from "./RecoveryCard";
import WorkNowCard from "./WorkNowCard";
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

const WIDE = "(min-width: 1024px)";
/** 広い画面（2列で並べる）かどうか */
function useWide(): boolean {
  return useSyncExternalStore(
    (cb) => {
      if (typeof window.matchMedia !== "function") return () => {};
      const m = window.matchMedia(WIDE);
      m.addEventListener("change", cb);
      return () => m.removeEventListener("change", cb);
    },
    () => typeof window.matchMedia === "function" && window.matchMedia(WIDE).matches,
    () => false,
  );
}

/** 日付をまたいだ時刻には「翌」をつける */
function timeOn(day: number, ms: number) {
  return `${ms >= day + DAY_MS ? "翌" : ""}${formatTime(ms)}`;
}

/** 「10/1(木)」→「10月1日（木）」 */
const headerDate = (ms: number) => formatDate(ms).replace(/^(\d+)\/(\d+)\((.)\)$/, "$1月$2日（$3）");

const label = "text-[12px] font-medium text-muted";
const bigTime = "text-[30px] font-semibold leading-tight tracking-tight tabular-nums";
const textBtn = "press shrink-0 rounded-full bg-surface2 px-3 py-1 text-[13px] font-medium";

/** 寝る準備の時刻から就寝の3時間後まで（「おやすみ」を出す間）。就寝を過ぎて前の日の計画が外れたら、昨夜の就寝で見る */
function bedDayOf(result: PlanResult, now: number): { dayStart: number; bed: number } | undefined {
  const on = (d: { bed: number }) => now >= d.bed - BED_PREP_MINUTES * MIN && now < d.bed + 3 * 60 * MIN;
  return result.dayPlans.find(on) ?? (result.lastNight && on(result.lastNight) ? result.lastNight : undefined);
}

/** 今日の起床・就寝、最初の予定と出発、行動ポイント */
function DayCard({ day, today, now }: { day: DayPlan; today: number; now: number }) {
  const toLeave = day.leave !== undefined ? Math.round((day.leave - now) / MIN) : undefined;
  // 始まった予定は今日の流れに出るので、ここでは出さない
  const first = day.firstEvent && day.firstEvent.start > now ? day.firstEvent : undefined;
  return (
    <Card>
      <div className="grid grid-cols-2 px-4 pt-3.5 pb-3">
        <div>
          <p className={label}>起床</p>
          <p className={bigTime}>{formatTime(day.wake)}</p>
        </div>
        <div className="border-l border-line pl-4">
          <p className={label}>就寝</p>
          <p className={bigTime}>{timeOn(today, day.bed)}</p>
        </div>
      </div>
      {first && (
        <div className="flex items-start gap-3 px-4 py-2.5">
          <div className="min-w-0 flex-1">
            <p className={label}>最初の予定</p>
            <p className="truncate text-[15px]">
              <span className="tabular-nums">{formatTime(first.start)}</span> {first.title}
            </p>
          </div>
          {day.leave !== undefined && (
            <div className="shrink-0 text-right">
              <p className={label}>出発</p>
              <p className="text-[15px] tabular-nums">
                {formatTime(day.leave)}
                {toLeave !== undefined && toLeave > 0 && toLeave <= 180 && (
                  <span className={`ml-1.5 text-[13px] font-semibold ${toLeave <= 30 ? "text-accent" : "text-muted"}`}>あと{formatMinutes(toLeave)}</span>
                )}
              </p>
            </div>
          )}
        </div>
      )}
      <EnergyLine today={today} />
    </Card>
  );
}

/** 今日の行動ポイント（1行で）。上限を超える日は、発散の時間を提案する */
function EnergyLine({ today }: { today: number }) {
  const { state } = useApp();
  const e = state.result.dayEnergy.find((x) => x.dayStart === today);
  if (!e) return null;
  const ratio = Math.min(1, e.used / e.budget);
  const over = e.used > e.budget;
  const tired = e.evening === "low";
  const note = tired
    ? e.suggestion ? `${formatTime(e.suggestion.start)}〜 ${e.suggestion.name}` : "今夜は休む"
    : over
      ? e.suggestion ? `上限超え・${formatTime(e.suggestion.start)}〜 ${e.suggestion.name}` : "上限超え"
      : undefined;
  return (
    <div className="flex flex-col gap-1.5 px-4 py-3">
      <div className="flex items-center gap-3">
        <span className={`shrink-0 ${label}`}>行動ポイント</span>
        <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-surface2" role="meter" aria-valuenow={e.used} aria-valuemin={0} aria-valuemax={e.budget} aria-label="今日の行動ポイント">
          <div className={`h-full rounded-full ${over ? "bg-accent" : "bg-ok"}`} style={{ width: `${ratio * 100}%` }} />
        </div>
        <span className="shrink-0 text-[14px] tabular-nums">
          <span className="font-semibold">{e.used}</span>
          <span className="text-muted"> / {e.budget}</span>
        </span>
      </div>
      {note && <p className="text-[14px]">{note}</p>}
    </div>
  );
}

function CheckCircle({ on }: { on: boolean }) {
  return (
    <span
      className={`flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border-2 transition-colors ${on ? "border-ok bg-ok" : "border-line"}`}
    >
      {on && (
        <svg viewBox="0 0 12 12" width="12" height="12" aria-hidden>
          <path d="M2.5 6.2 5 8.5l4.5-5" stroke="white" strokeWidth="1.8" fill="none" strokeLinecap="round" />
        </svg>
      )}
    </span>
  );
}

/**
 * 前の夜の睡眠時間。ヘルスケアから取り込めていればその値、まだなら予定の睡眠時間から − ＋（15分ずつ）で合わせて記録する。
 * 手で直した値は、ヘルスケアより優先する
 */
function SleepInput({ value, health, fallback, onChange }: { value?: number; health?: number; fallback: number; onChange: (m: number) => void }) {
  const known = value ?? health;
  const shown = known ?? fallback;
  const step = (d: number) => onChange(Math.min(16 * 60, Math.max(0, shown + d)));
  const round = "press flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface2 text-[20px] leading-none";
  return (
    <div className="flex items-center gap-2">
      <span className={`w-12 shrink-0 ${label}`}>
        睡眠
        {value === undefined && health !== undefined && <span className="block text-[10px] font-normal">ヘルスケア</span>}
      </span>
      <button type="button" aria-label="睡眠を15分減らす" onClick={() => step(-15)} className={round}>
        −
      </button>
      <span className={`min-w-0 flex-1 text-center text-[17px] tabular-nums ${known === undefined ? "text-muted" : "font-semibold"}`}>{formatMinutes(shown)}</span>
      <button type="button" aria-label="睡眠を15分増やす" onClick={() => step(15)} className={round}>
        ＋
      </button>
      {known === undefined && (
        <button type="button" onClick={() => onChange(shown)} className={`${btnPrimary} shrink-0 px-3.5 py-1.5 text-[14px]`}>
          記録
        </button>
      )}
    </div>
  );
}

const FATIGUE_OPTIONS: { value: MorningFatigue; label: string }[] = [
  { value: 1, label: "元気" },
  { value: 2, label: "少し" },
  { value: 3, label: "ふつう" },
  { value: 4, label: "かなり" },
  { value: 5, label: "ぐったり" },
];

/** 今日の楽しみ。休日でなければ遠出を、雨の日なら外でやるものを除いて選ぶ */
function todaysTreat(state: ReturnType<typeof useApp>["state"], today: number, day: DayPlan | undefined) {
  return treatFor(today, state.treats, { holiday: day?.holiday, rainy: rainyDayKeys(state).includes(dateKeyOf(today)) });
}

/** 楽しみの見せ方：種類と条件を小さく */
function TreatText({ treat }: { treat: NonNullable<ReturnType<typeof treatFor>> }) {
  return (
    <>
      <p className="text-[12px] font-medium text-muted">{TREAT_CATEGORIES.find((c) => c.id === treat.category)?.label}</p>
      <p className="text-[17px] font-semibold leading-snug">{treat.name}</p>
      {treat.condition && <p className="mt-0.5 text-[13px] text-muted">{treat.condition}</p>}
    </>
  );
}

/** 朝のうち（起床の2時間前〜4時間後）で、起きた・疲れ・朝ルーティンがまだ終わっていない */
function isMorning(state: ReturnType<typeof useApp>["state"], day: DayPlan | undefined, now: number): boolean {
  const today = dayStartOf(now);
  const wake = day?.wake ?? today + 9 * 60 * MIN;
  if (now < wake - 2 * 60 * MIN || now >= wake + 4 * 60 * MIN) return false;
  const log = state.wakeLogs.find((l) => l.date === dateKeyOf(today));
  const finished =
    log?.wokeAt !== undefined && log.fatigue !== undefined && (state.routineSteps.length === 0 || log.routineDoneAt !== undefined);
  return !finished;
}

function MorningCard({ day, now, compact }: { day?: DayPlan; now: number; compact?: boolean }) {
  const { state, patch } = useApp();
  // 朝が終わったら1行にたたむ（押すと開く）
  const [open, setOpen] = useState(false);
  const today = dayStartOf(now);
  const key = dateKeyOf(today);
  const log: WakeLog = state.wakeLogs.find((l) => l.date === key) ?? { date: key, doneStepIds: [] };
  const streak = wakeStreak(state.wakeLogs, today);
  const steps = state.routineSteps;
  const treat = todaysTreat(state, today, day);

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
  const streakBadge = streak > 0 && <span className="shrink-0 text-[13px] font-semibold text-ok">連続 {streak}日</span>;

  if (compact && !open) {
    return (
      <Card>
        <Row
          label={
            <span className="flex items-center gap-2">
              朝ルーティン
              {streakBadge}
            </span>
          }
          detail={
            log.routineDoneAt !== undefined
              ? `${formatTime(log.routineDoneAt)} 完了`
              : log.wokeAt !== undefined
                ? `${formatTime(log.wokeAt)} 起床`
                : "記録なし"
          }
          onClick={() => setOpen(true)}
        />
      </Card>
    );
  }

  return (
    <Card title="朝ルーティン" right={streakBadge}>
      <div className="flex flex-col gap-3 px-4 pt-2 pb-3.5">
        {log.wokeAt === undefined ? (
          <>
            <button
              type="button"
              onClick={() => setLog((l) => ({ ...l, wokeAt: Date.now(), plannedWake: day?.wake }))}
              className={`${btnPrimary} h-14 w-full rounded-2xl text-[18px] font-bold`}
            >
              起きた
            </button>
            {/* 今日の楽しみは伏せておき、起きたら開く（起き上がるきっかけに） */}
            {treat && <p className="text-center text-[13px] text-muted">起きると、今日の楽しみが開きます</p>}
          </>
        ) : (
          <>
            <div className="flex items-center gap-3">
              <CheckCircle on />
              <p className="min-w-0 flex-1 text-[15px]">
                <span className="tabular-nums">{formatTime(log.wokeAt)}</span>に起きました
                {day && Math.abs(lateBy) >= 5 && (
                  <span className="block text-[13px] text-muted">予定より{formatMinutes(Math.abs(lateBy))}{lateBy > 0 ? "遅く" : "早く"}</span>
                )}
              </p>
              <button
                type="button"
                className={`${textBtn} text-muted`}
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
            <div>
              <p className={`mb-1.5 ${label}`}>今の疲れ</p>
              <div className="grid grid-cols-5 gap-1.5">
                {FATIGUE_OPTIONS.map((o) => (
                  <button
                    key={o.value}
                    type="button"
                    aria-pressed={log.fatigue === o.value}
                    onClick={() => setLog((l) => ({ ...l, fatigue: o.value }))}
                    className={`press rounded-xl py-2 text-[13px] font-medium ${log.fatigue === o.value ? "bg-tint text-on-tint" : "bg-surface2"}`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
            {treat && (
              <div className="reveal rounded-xl bg-surface2 px-3.5 py-3">
                <p className="mb-0.5 text-[12px] font-semibold text-ok">今日の楽しみ</p>
                <TreatText treat={treat} />
              </div>
            )}
            <SleepInput
              value={log.sleepMinutes}
              health={state.healthSleep[key]?.minutes}
              fallback={state.settings.sleepMinutes}
              onChange={(m) => setLog((l) => ({ ...l, sleepMinutes: m }))}
            />
          </>
        )}
      </div>
      {steps.length === 0 ? (
        <p className="px-4 py-3 text-[14px] text-muted">
          手順は<Link href="/settings/routine" className="font-medium text-tint underline underline-offset-2">設定</Link>で追加できます。
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
    </Card>
  );
}

function TreatCard({ today, day }: { today: number; day?: DayPlan }) {
  const { state } = useApp();
  const treat = todaysTreat(state, today, day);
  return (
    <Card title="今日の楽しみ">
      {treat ? (
        <div className="px-4 pt-1 pb-3.5">
          <TreatText treat={treat} />
        </div>
      ) : (
        <p className="px-4 pt-1 pb-3.5 text-[14px] text-muted">
          <Link href="/settings/treats" className="font-medium text-tint underline underline-offset-2">楽しみのリスト</Link>に追加すると、毎日1つ選びます。
        </p>
      )}
    </Card>
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
  /** 終わった習慣で、まだ記録していないもの */
  past?: boolean;
  /** 枠の下に出す小さなボタン（雨の日の散歩の入れ替えなど） */
  action?: { label: string; onClick: () => void };
  /** 記録する習慣：「5分」「やった」 */
  record?: { mark?: HabitMark; onMark: (m: HabitMark) => void };
}

function Timeline({ now, dayEnd, limit }: { now: number; dayEnd: number; limit?: number }) {
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
      action: rainSwap ? { label: rainy ? `晴れたので「${habit!.name}」に戻す` : "雨なので家の中でやる", onClick: toggleRain } : undefined,
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
                  <button type="button" onClick={it.action.onClick} className={`${textBtn} mt-1.5`}>
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
  const from = day.homeAt ?? day.eveningFrom;
  if (from === undefined || now < from - 60 * MIN || now >= day.bed) return null;
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
    <Card title={day.homeAt !== undefined ? "おかえりなさい" : "おつかれさまです"}>
      <div className="flex flex-col gap-2.5 px-4 pt-1 pb-3.5">
        {picked && !editing ? (
          <div className="flex items-center justify-between gap-3">
            <p className="text-[15px]">
              今夜の体力：<span className="font-semibold">{picked.label}</span>
            </p>
            <button type="button" onClick={() => setEditing(true)} className={textBtn}>
              変える
            </button>
          </div>
        ) : (
          <>
            <p className="text-[14px] text-muted">残りの体力は？</p>
            <div className="grid grid-cols-3 gap-2">
              {EVENING_OPTIONS.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => choose(o.value)}
                  className={`press rounded-xl py-2.5 text-[16px] font-semibold ${o.value === answer ? "bg-tint text-on-tint" : "bg-surface2"}`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </Card>
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

/** 少しずつ増やす習慣（家での運動）：2週間たったら記録を見て、増やすか・きっかけを変えるかを聞く */
function ReviewCard({ today }: { today: number }) {
  const { state, update, notify } = useApp();
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
  const finish = (grow: boolean) => {
    update((d) => ({
      ...d,
      habitLogs: grow ? keepMarkValues(d.habitLogs, habit, Math.min(p.maxMinutes, habit.durationMinutes + p.stepMinutes)) : d.habitLogs,
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
    notify(grow ? `${habit.name}を${Math.min(p.maxMinutes, habit.durationMinutes + p.stepMinutes)}分に` : "記録しました");
  };
  return (
    <Card title={habit.name}>
      <div className="flex flex-col gap-3 px-4 pt-1 pb-3.5">
        <p className="text-[15px] tabular-nums">
          2週間で <span className="font-semibold">{done}</span> / {planned} 回
        </p>
        <div className="flex flex-wrap gap-2">
          {up && (
            <button type="button" onClick={() => finish(true)} className={btnPrimary}>
              {habit.durationMinutes + p.stepMinutes}分にする
            </button>
          )}
          {low && (
            <Link href="/settings/habits" onClick={() => finish(false)} className={btnPrimary}>
              きっかけを変える
            </Link>
          )}
          <button type="button" onClick={() => finish(false)} className={btnSecondary}>
            このまま
          </button>
        </div>
      </div>
    </Card>
  );
}

/** 寝る準備の時刻になったら「寝る」。予定どおりに寝られたかを残す（ご褒美になる） */
function BedCard({ now }: { now: number }) {
  const { state, patch } = useApp();
  const day = bedDayOf(state.result, now);
  const key = day ? dateKeyOf(day.dayStart) : "";
  const log = state.bedLogs[key];
  const record = () =>
    day &&
    patch((d) => {
      const at = Date.now();
      return {
        bedLogs: {
          // 記録は1年ぶんだけ残す
          ...Object.fromEntries(Object.entries(d.bedLogs).sort(([a], [b]) => a.localeCompare(b)).slice(-399)),
          [key]: { at, plannedBed: day.bed },
        },
      };
    });
  if (!day) return null;
  // 寝る前に、次の起床と最初の予定を見られるように（アラームを合わせる）
  const next = state.result.dayPlans.find((d) => d.dayStart === day.dayStart + DAY_MS);
  const undo = () =>
    patch((d) => {
      const bedLogs = { ...d.bedLogs };
      delete bedLogs[key];
      return { bedLogs };
    });
  return (
    <Card title="おやすみ">
      <div className="flex items-center gap-3 px-4 pt-1 pb-3.5">
        {log ? (
          <>
            <CheckCircle on />
            <p className="min-w-0 flex-1 text-[15px]">
              <span className="tabular-nums">{formatTime(log.at)}</span>に寝る
              {!bedOnTime(log) && <span className="block text-[13px] text-muted">予定より{formatMinutes(Math.round((log.at - log.plannedBed) / MIN))}遅く</span>}
            </p>
            <button type="button" className={`${textBtn} text-muted`} onClick={undo}>
              取り消す
            </button>
          </>
        ) : (
          <>
            <div className="min-w-0 flex-1">
              <p className={label}>就寝</p>
              <p className={bigTime}>{formatTime(day.bed)}</p>
            </div>
            <button type="button" onClick={record} className={`${btnPrimary} shrink-0 px-7 py-3 text-[16px]`}>
              寝る
            </button>
          </>
        )}
      </div>
      {next && (
        <div className="flex items-start gap-3 px-4 py-2.5">
          <div className="shrink-0">
            <p className={label}>起床</p>
            <p className="text-[15px] font-semibold tabular-nums">{formatTime(next.wake)}</p>
          </div>
          {next.firstEvent && (
            <div className="min-w-0 flex-1 border-l border-line pl-3">
              <p className={label}>最初の予定{next.leave ? `・${formatTime(next.leave)}出発` : ""}</p>
              <p className="truncate text-[15px]">
                <span className="tabular-nums">{formatTime(next.firstEvent.start)}</span> {next.firstEvent.title}
              </p>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

/** 今日の食事：家で食べるか、外で食べるかを選ぶ（選ばなければ、予定の空きから自動で決まる） */
function MealCard({ today, now }: { today: number; now: number }) {
  const { state, update } = useApp();
  const key = dateKeyOf(today);
  // 朝食（朝ルーティンのあと）→ 昼食 → 夕食 の順
  const sorted = state.habits.filter((h) => h.meal).sort((a, b) => (a.cue ? -1 : a.windowStart) - (b.cue ? -1 : b.windowStart));
  const blockOf = (id: string) => state.result.blocks.find((x) => x.kind === "habit" && x.refId === id && x.start >= today && x.start < today + DAY_MS);
  // 終わった食事は出さない（置いた枠が終わった、置いていなければ時間帯が過ぎた。朝食は次の食事の時間帯まで）
  const meals = sorted.filter((m, i) => {
    const b = blockOf(m.id);
    if (b) return b.end > now;
    const end = m.cue ? (sorted[i + 1]?.windowStart ?? 12 * 60) : m.windowEnd;
    return now < today + end * MIN;
  });
  if (meals.length === 0) return null;
  const home = new Set(state.mealsAtHome[key] ?? []);
  const out = new Set(state.habitSkips[key] ?? []);
  const choose = (id: string, where: "home" | "out") =>
    update((d) => {
      const h = new Set(d.mealsAtHome[key] ?? []);
      const o = new Set(d.habitSkips[key] ?? []);
      const on = where === "home" ? h.has(id) : o.has(id);
      h.delete(id);
      o.delete(id);
      // もう一度押すと、自動に戻す
      if (!on) (where === "home" ? h : o).add(id);
      return { ...d, mealsAtHome: { ...d.mealsAtHome, [key]: [...h] }, habitSkips: { ...d.habitSkips, [key]: [...o] } };
    });
  const seg = (on: boolean) => `press rounded-md px-3 py-1 text-[13px] ${on ? "bg-surface font-semibold text-fg shadow-sm" : "text-muted"}`;
  return (
    <Card title="今日の食事">
      <ul className="flex flex-col pt-0.5 pb-2">
        {meals.map((m) => {
          const b = blockOf(m.id);
          return (
            <li key={m.id} className="flex items-center gap-3 px-4 py-1.5">
              <span className="min-w-0 flex-1 truncate text-[15px]">{m.name}</span>
              <span className="shrink-0 text-right text-[13px] tabular-nums text-muted">
                {b ? formatTime(b.start) : out.has(m.id) ? "" : home.has(m.id) ? "入らない" : "—"}
              </span>
              <div className="flex shrink-0 rounded-lg bg-surface2 p-0.5">
                <button type="button" aria-pressed={home.has(m.id)} onClick={() => choose(m.id, "home")} className={seg(home.has(m.id))}>
                  家で
                </button>
                <button type="button" aria-pressed={out.has(m.id)} onClick={() => choose(m.id, "out")} className={seg(out.has(m.id))}>
                  外で
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

/** 余裕のある週の最初の休日に「連絡してみる？」。答えたらその週はもう出さない */
function ContactCard({ today, now }: { today: number; now: number }) {
  const { state, update, notify } = useApp();
  const c = contactDaysFor(state, now).find((x) => x.dayStart === today);
  if (!c) return null;
  const answer = (a: ContactAnswer) => {
    update((d) => ({ ...d, contactLogs: { ...d.contactLogs, [dateKeyOf(c.weekStart)]: a } }));
    notify("記録しました");
  };
  return (
    <Card title="連絡してみる？">
      <div className="flex gap-2 px-4 pt-1 pb-3.5">
        <button type="button" onClick={() => answer("done")} className={btnPrimary}>
          連絡した
        </button>
        <button type="button" onClick={() => answer("skip")} className={btnSecondary}>
          今週はいい
        </button>
      </div>
    </Card>
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
    <Card>
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-semibold">
            タバコ
            {todays.length > 0 && <span className="ml-2 text-[13px] font-normal tabular-nums text-muted">{todays.length}本</span>}
          </p>
          {todays.length > 0 && <p className="truncate text-[12px] tabular-nums text-muted">{todays.map(formatTime).join(" ")}</p>}
        </div>
        {undoAt !== undefined ? (
          <button type="button" onClick={undo} className={`${btnSecondary} shrink-0 py-2 text-muted`}>
            取り消す
          </button>
        ) : (
          <button type="button" onClick={add} className={`${btnSecondary} shrink-0 py-2`}>
            吸った
          </button>
        )}
      </div>
    </Card>
  );
}

export default function TodayScreen() {
  const { state, update, openTask, sync, undo, canUndo } = useApp();
  // 新旧どちらの通知リンクも、開くだけでは実績にしない。
  useEffect(() => {
    if (sync === "loading") return;
    const params = new URLSearchParams(window.location.search);
    const key = params.get("task") ?? params.get("done");
    if (!key) return;
    window.history.replaceState(null, "", "/");
    const id = key.slice(0, key.lastIndexOf(":"));
    if (state.tasks.some((t) => t.id === id)) openTask(id);
  }, [sync, openTask, state.tasks]);
  const now = useNow();
  const today = dayStartOf(now);
  const days = state.result.dayPlans;
  const idx = days.findIndex((d) => d.dayStart === today);
  const day = idx >= 0 ? days[idx] : undefined;
  const dayEnd = Math.max(day?.bed ?? 0, today + DAY_MS);
  const wide = useWide();
  const morning = isMorning(state, day, now);
  // 寝る前は「おやすみ」だけにする（起床・就寝と「今から何する？」は出さない）
  const bedtime = !!bedDayOf(state.result, now);

  const registerPlace = (location: string, minutes: number) =>
    update((d) => ({
      ...d,
      places: [...d.places, { id: newId("place"), name: location, keywords: [location], travelMinutes: minutes }],
    }));

  // 答えや設定が要るもの（作業の進み具合・移動時間・締切に足りないなど）は、いちばん上に。
  // そのあとは今の時間に合わせる：朝は「起きた」と朝ルーティン、夜は「おやすみ」と帰宅時の体力
  const top = (
    <>
      <ProgressCard now={now} />
      <ReviewCard today={today} />
      {hasNotices(state) && (
        <Card title="お知らせ">
          <Notices
            state={state}
            onRegisterPlace={registerPlace}
            onOpenTask={openTask}
            onSetTravel={(id, m) => update((d) => ({ ...d, importedTravel: { ...d.importedTravel, [id]: m } }))}
            onFixShortfall={(id, fix) =>
              update((d) => ({
                ...d,
                tasks: d.tasks.map((t) =>
                  t.id !== id
                    ? t
                    : fix === "first"
                      ? { ...t, first: true }
                      : fix === "stretch"
                        ? { ...t, stretch: true }
                        : t.deadline !== undefined && t.deadlineKind === "target" && !t.relatedEventId
                          ? { ...t, deadline: t.deadline + DAY_MS }
                          : t,
                ),
              }))
            }
          />
        </Card>
      )}
      <BedCard now={now} />
      {day && <EveningCard day={day} now={now} />}
      {morning && <MorningCard day={day} now={now} />}
    </>
  );
  const middle = !bedtime && (
    <>
      {day && <DayCard day={day} today={today} now={now} />}
      <WorkNowCard now={now} />
    </>
  );
  const rest = (
    <>
      <SmokeCard today={today} />
      <MealCard today={today} now={now} />
      {/* 朝のうちは、朝ルーティンのカードで「起きた」を押すと開く */}
      {!morning && <TreatCard today={today} day={day} />}
      <ContactCard today={today} now={now} />
      {!morning && <MorningCard day={day} now={now} compact />}
    </>
  );

  return (
    <div className="h-full overflow-y-auto bg-grouped">
      <ScreenHeader title={headerDate(today)} width="max-w-5xl" />
      {!!state.result.movedBlocks?.length && <div role="status" className="mx-auto max-w-5xl px-4 pb-2 text-[13px] text-muted">予定に合わせて今日の自動枠を{state.result.movedBlocks.length}件変更しました。{state.result.movedBlocks.slice(0, 3).map((b) => `${formatTime(b.start)} ${b.title}`).join("、")}</div>}
      <div className="mx-auto flex max-w-5xl flex-col gap-4 px-4 pt-1 pb-8 sm:px-6 lg:grid lg:grid-cols-2 lg:items-start">
        {wide ? (
          <>
            <div className="flex flex-col gap-4">
              {top}
              {middle}
              {rest}
            </div>
            <div className="flex flex-col gap-4">
              <Timeline now={now} dayEnd={dayEnd} />
              <RecoveryCard now={now} />
            </div>
          </>
        ) : (
          <>
            {top}
            {middle}
            {/* 狭い画面では、今日の流れを上に（いまと次だけ） */}
            <Timeline now={now} dayEnd={dayEnd} limit={5} />
            {rest}
            {/* 崩れた日の立て直しは、ときどき使うものなので下に */}
            <RecoveryCard now={now} />
          </>
        )}
      </div>
      {/* 取り消しは目立たせず、いちばん下に */}
      {canUndo && (
        <div className="mx-auto flex max-w-5xl justify-center px-4 pb-8">
          <button type="button" onClick={undo} className="press rounded-full bg-surface px-3.5 py-1.5 text-[12px] text-muted">
            直前の操作を元に戻す
          </button>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import type { DayPlan } from "@/lib/scheduler";
import { useApp } from "@/components/app/StoreProvider";
import { MIN, dayStartOf, formatMinutes, formatTime } from "@/lib/mock/jst";
import { dateKeyOf, wakeStreak, type MorningFatigue, type WakeLog } from "@/lib/mock/model";
import { Card, Row, btnPrimary } from "@/components/ui/controls";
import { labelCls, textBtn, CheckCircle, todaysTreat, TreatText } from "./parts";

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
      <span className={`w-12 shrink-0 ${labelCls}`}>
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

/** 朝のうち（起床の2時間前〜4時間後）で、起きた・疲れ・朝ルーティンがまだ終わっていない */
export function isMorning(state: ReturnType<typeof useApp>["state"], day: DayPlan | undefined, now: number): boolean {
  const today = dayStartOf(now);
  const wake = day?.wake ?? today + 9 * 60 * MIN;
  if (now < wake - 2 * 60 * MIN || now >= wake + 4 * 60 * MIN) return false;
  const log = state.wakeLogs.find((l) => l.date === dateKeyOf(today));
  const finished =
    log?.wokeAt !== undefined && log.fatigue !== undefined && (state.routineSteps.length === 0 || log.routineDoneAt !== undefined);
  return !finished;
}

export default function MorningCard({ day, now, compact }: { day?: DayPlan; now: number; compact?: boolean }) {
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
              <p className={`mb-1.5 ${labelCls}`}>今の疲れ</p>
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

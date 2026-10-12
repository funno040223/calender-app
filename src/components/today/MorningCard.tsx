"use client";

import { useState } from "react";
import Link from "next/link";
import type { DayPlan } from "@/lib/scheduler";
import { useApp } from "@/components/app/StoreProvider";
import { DAY_MS, MIN, dayStartOf, formatMinutes, formatTime, fromInputTime } from "@/lib/mock/jst";
import { WAKE_CANDIDATE_LABEL, asksWakeTime, wakeCandidates, type WakeCandidate } from "@/lib/mock/wake";
import { SLEEP_SHORTCUT_URL, markHealthAsked } from "@/lib/sync/health";
import { nightOf } from "@/lib/mock/night";
import { dateKeyOf, wakeStreak, type MorningFatigue, type WakeLog, type MockData } from "@/lib/mock/model";
import { Card, Row, btnPrimary, btnSecondary } from "@/components/ui/controls";
import { labelCls, textBtn, CheckCircle, todaysTreat, TreatText } from "./parts";

/**
 * 前の夜の睡眠時間。夜の記録（ヘルスケア、なければ寝る〜起きた）があればその値、まだなら予定の睡眠時間から − ＋（15分ずつ）で合わせて記録する。
 * 手で直した値は、ほかより優先する
 */
function SleepInput({
  value,
  auto,
  fallback,
  onChange,
}: {
  value?: number;
  auto?: { minutes: number; label: string };
  fallback: number;
  onChange: (m: number) => void;
}) {
  const known = value ?? auto?.minutes;
  const shown = known ?? fallback;
  const step = (d: number) => onChange(Math.min(16 * 60, Math.max(0, shown + d)));
  const round = "press flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface2 text-[20px] leading-none";
  return (
    <div className="flex items-center gap-2">
      <span className={`w-12 shrink-0 ${labelCls}`}>
        睡眠
        {value === undefined && auto && <span className="block text-[10px] font-normal">{auto.label}</span>}
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

/**
 * 「いつ起きた？」：遅れて押すとき（押し忘れ・寝坊）と、あとから起きた時刻を直すとき。
 * 候補（予定・ヘルスケア・アプリを開いた・朝ルーティン・タバコ・いま）を1回押すか、時刻を入れる
 */
function WakePicker({ candidates, current, now, onPick }: { candidates: WakeCandidate[]; current?: number; now: number; onPick: (at: number) => void }) {
  const [typed, setTyped] = useState("");
  const typedAt = (ref: number) => {
    const at = fromInputTime(typed, ref, "before");
    return at !== undefined && ref - at < 16 * 60 * MIN ? at : undefined;
  };
  const valid = typedAt(now) !== undefined;
  return (
    <div className="flex flex-col gap-2">
      <p className={labelCls}>いつ起きた？</p>
      <div className="grid grid-cols-3 gap-1.5">
        {candidates.map((c) => {
          const on = current !== undefined && Math.abs(current - c.at) < MIN;
          return (
            <button
              key={c.kind}
              type="button"
              aria-pressed={on}
              onClick={() => onPick(c.kind === "now" ? Date.now() : c.at)}
              className={`press flex flex-col items-center rounded-xl py-1.5 ${on ? "bg-tint text-on-tint" : "bg-surface2"}`}
            >
              <span className="text-[17px] font-semibold tabular-nums">{formatTime(c.at)}</span>
              <span className={`text-[11px] ${on ? "" : "text-muted"}`}>{WAKE_CANDIDATE_LABEL[c.kind]}</span>
            </button>
          );
        })}
      </div>
      <div className="flex items-center gap-2">
        <input
          type="time"
          aria-label="起きた時刻"
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          className="min-w-0 flex-1 rounded-lg border border-line bg-surface2 p-2"
        />
        <button type="button" aria-label="起きた時刻を記録" disabled={!valid} onClick={() => {
            const at = typedAt(Date.now());
            if (at !== undefined) onPick(at);
          }} className={`${btnSecondary} shrink-0 py-2`}>
          記録
        </button>
      </div>
    </div>
  );
}

const FATIGUE_OPTIONS:{ value: MorningFatigue; label: string }[] = [
  { value: 1, label: "元気" },
  { value: 2, label: "少し" },
  { value: 3, label: "ふつう" },
  { value: 4, label: "かなり" },
  { value: 5, label: "ぐったり" },
];

/**
 * 朝のうち（起床の2時間前〜4時間後）で、起きた・疲れ・朝ルーティンがまだ終わっていない。
 * 「起きた」を押すまでは、寝る準備の時刻まで出したままにする（寝坊しても押せば、その時刻から組み直す）
 */
export function isMorning(state: ReturnType<typeof useApp>["state"], day: DayPlan | undefined, now: number): boolean {
  const today = dayStartOf(now);
  const wake = day?.wake ?? today + 9 * 60 * MIN;
  if (now < wake - 2 * 60 * MIN) return false;
  const log = state.wakeLogs.find((l) => l.date === dateKeyOf(today));
  if (log?.wokeAt === undefined) return now < (day?.bed ?? today + DAY_MS) - state.settings.windDownMinutes * MIN;
  if (now >= wake + 4 * 60 * MIN) return false;
  const finished =
    log?.wokeAt !== undefined && log.fatigue !== undefined && (state.routineSteps.length === 0 || log.routineDoneAt !== undefined);
  return !finished;
}

export default function MorningCard({ day, now, compact }: { day?: DayPlan; now: number; compact?: boolean }) {
  const { state, patch, update } = useApp();
  // 朝が終わったら1行にたたむ（押すと開く）
  const [open, setOpen] = useState(false);
  const today = dayStartOf(now);
  const key = dateKeyOf(today);
  const log: WakeLog = state.wakeLogs.find((l) => l.date === key) ?? { date: key, doneStepIds: [] };
  const streak = wakeStreak(state.wakeLogs, today);
  const steps = state.routineSteps;
  const treat = todaysTreat(state, today, day);

  const setLog = (fn: (l: WakeLog) => WakeLog, affectsWake = false) => {
    const change = (d: MockData) => {
      const cur = d.wakeLogs.find((l) => l.date === key) ?? { date: key, doneStepIds: [] };
      const next = fn(cur);
      // 記録は1年ぶんだけ残す
      const rest = d.wakeLogs.filter((l) => l.date !== key);
      return { wakeLogs: [...rest, next].sort((a, b) => a.date.localeCompare(b.date)).slice(-400) };
    };
    if (affectsWake) update((d) => ({ ...d, ...change(d) }));
    else patch(change);
  };

  // 最初のチェックの時刻を朝ルーティンの始まりにする（起床の直後にできなかった日も、そこから朝食・散歩を組み直す）。
  // 「起きた」を押す前に始めたら、そのときの予定の起床も残す（予定どおり起きたかを数える）
  const toggleStep = (id: string) => {
    const done = log.doneStepIds.includes(id) ? log.doneStepIds.filter((x) => x !== id) : [...log.doneStepIds, id];
    const starts = log.routineStartedAt === undefined && done.length > 0;
    const clears = log.routineStartedAt !== undefined && done.length === 0;
    setLog((l) => {
      const next: WakeLog = { ...l, doneStepIds: done };
      const all = steps.length > 0 && steps.every((s) => done.includes(s.id));
      if (all) next.routineDoneAt = l.routineDoneAt ?? Date.now();
      else delete next.routineDoneAt;
      if (starts) {
        next.routineStartedAt = Date.now();
        if (l.plannedWake === undefined && expectedWake !== undefined) next.plannedWake = expectedWake;
      }
      if (clears) {
        delete next.routineStartedAt;
        if (l.wokeAt === undefined) delete next.plannedWake;
      }
      return next;
    }, starts || clears);
  };

  const plannedWake = log.plannedWake ?? day?.wake;
  const night = nightOf(state, key);
  // ヘルスケアの起床で組み直した朝も、前の晩に予定していた起床と比べる（予定どおり起きたか）
  const expectedWake = state.result.rhythmResets?.find((r) => r.plannedEnd !== undefined && dateKeyOf(r.end) === key)?.plannedEnd ?? day?.wake;
  const lateBy = log.wokeAt !== undefined && plannedWake !== undefined ? Math.round((log.wokeAt - plannedWake) / MIN) : 0;
  // 遅れて押すとき（押し忘れ・寝坊）は、いつ起きたかを聞く。記録したあとも、時刻を押すと直せる
  const [editingWake, setEditingWake] = useState(false);
  const askWake = asksWakeTime(now, expectedWake);
  const candidates = wakeCandidates(state, key, log.plannedWake ?? expectedWake, now);
  const pickWake = (at: number) => {
    setLog((l) => ({ ...l, wokeAt: at, plannedWake: l.wokeAt !== undefined ? (l.plannedWake ?? expectedWake) : expectedWake }), true);
    setEditingWake(false);
  };
  // ヘルスケアを取り込んでいて、今朝の分がまだ届いていないとき（ロック中は読めないので、ここから送る）。「起きた」を押す前から出す
  const healthLink = Object.keys(state.healthSleep).length > 0 && !state.healthSleep[key] && log.sleepMinutes === undefined && (
    <a href={SLEEP_SHORTCUT_URL} onClick={markHealthAsked} className={`${textBtn} self-start`}>
      ヘルスケアから読む
    </a>
  );
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
            {askWake ? (
              <WakePicker candidates={candidates} now={now} onPick={pickWake} />
            ) : (
            <button
              type="button"
              onClick={() => setLog((l) => ({ ...l, wokeAt: Date.now(), plannedWake: expectedWake }), true)}
              className={`${btnPrimary} h-14 w-full rounded-2xl text-[18px] font-bold`}
            >
              起きた
            </button>
            )}
            {/* 今日の楽しみは伏せておき、起きたら開く（起き上がるきっかけに） */}
            {treat && <p className="text-center text-[13px] text-muted">起きると、今日の楽しみが開きます</p>}
            {healthLink}
          </>
        ) : (
          <>
            <div className="flex items-center gap-3">
              <CheckCircle on />
              <p className="min-w-0 flex-1 text-[15px]">
                <button
                  type="button"
                  aria-expanded={editingWake}
                  aria-label={`起きた時刻 ${formatTime(log.wokeAt)} を直す`}
                  onClick={() => setEditingWake((v) => !v)}
                  className="press tabular-nums underline decoration-dotted underline-offset-4"
                >
                  {formatTime(log.wokeAt)}
                </button>
                に起きました
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
                    // 朝ルーティンを始めていれば、そのときの予定の起床は残す
                    if (next.routineStartedAt === undefined) delete next.plannedWake;
                    return next;
                  }, true)
                }
              >
                取り消す
              </button>
            </div>
            {editingWake && <WakePicker candidates={candidates} current={log.wokeAt} now={now} onPick={pickWake} />}
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
              auto={night.sleep && night.sleep.source !== "manual" ? { minutes: night.sleep.minutes, label: night.sleep.source === "health" ? "ヘルスケア" : "寝る〜起きた" } : undefined}
              fallback={state.settings.sleepMinutes}
              onChange={(m) => setLog((l) => ({ ...l, sleepMinutes: m }))}
            />
            {healthLink}
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

"use client";

import { useState } from "react";
import Link from "next/link";
import type { DayPlan } from "@/lib/scheduler";
import { useApp } from "@/components/app/StoreProvider";
import { DAY_MS, MIN, dayStartOf, formatMinutes, formatTime, fromInputTime } from "@/lib/mock/jst";
import { WAKE_CANDIDATE_LABEL, asksWakeTime, wakeCandidates, type WakeCandidate } from "@/lib/mock/wake";
import { SLEEP_SHORTCUT_URL, markHealthAsked } from "@/lib/sync/health";
import { bedDayOf } from "./BedCard";
import { dropPlannedWake, nightOf, notePlannedWake, plannedOf, recordUp, undoUp, upRecorded, wakeStreak } from "@/lib/mock/night";
import { dateKeyOf, type MorningFatigue, type WakeLog, type MockData, type SleepLog } from "@/lib/mock/model";
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

/**
 * 朝の疲れ（1 元気 〜 5 ぐったり）のスライダー。指で押した・動かした位置の段に合わせる。
 * 答えるまでつまみは出さない（押した場所で決まる）。iPhone の標準のスライダーは線を押しても動かないので、自前で作る
 */
function FatigueSlider({ value: saved, onChange }: { value?: MorningFatigue; onChange: (v: MorningFatigue) => void }) {
  // 指で動かしている間は記録せず、離したときに記録する（記録すると朝のカードがたたまれることがあるため）
  const [draft, setDraft] = useState<MorningFatigue>();
  const value = draft ?? saved;
  const commit = () => {
    if (draft !== undefined) onChange(draft);
    setDraft(undefined);
  };
  const levelAt = (el: HTMLElement, x: number): MorningFatigue => {
    const r = el.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (x - r.left) / r.width));
    return (Math.round(ratio * 4) + 1) as MorningFatigue;
  };
  const set = (v: number) => onChange(Math.min(5, Math.max(1, v)) as MorningFatigue);
  const pct = value === undefined ? 0 : ((value - 1) / 4) * 100;
  return (
    <div>
      <div
        role="slider"
        tabIndex={0}
        aria-label="今の疲れ"
        aria-valuemin={1}
        aria-valuemax={5}
        aria-valuenow={value}
        aria-valuetext={value === undefined ? "未回答" : `${value}`}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          setDraft(levelAt(e.currentTarget, e.clientX));
        }}
        onPointerMove={(e) => {
          if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
          const v = levelAt(e.currentTarget, e.clientX);
          if (v !== value) setDraft(v);
        }}
        onPointerUp={commit}
        onLostPointerCapture={commit}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight" || e.key === "ArrowUp") set((value ?? 2) + 1);
          if (e.key === "ArrowLeft" || e.key === "ArrowDown") set((value ?? 4) - 1);
        }}
        className="relative mx-3 h-9 cursor-pointer touch-none select-none"
      >
        <div className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-surface2" />
        {value !== undefined && <div className="absolute left-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-tint" style={{ width: `${pct}%` }} />}
        {[0, 25, 50, 75, 100].map((p) => (
          <span key={p} className="absolute top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-line" style={{ left: `${p}%` }} />
        ))}
        {value !== undefined && (
          <span
            className="absolute top-1/2 flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-tint text-[13px] font-semibold text-on-tint shadow tabular-nums"
            style={{ left: `${pct}%` }}
          >
            {value}
          </span>
        )}
      </div>
      <div className="flex justify-between text-[11px] text-muted">
        <span>元気</span>
        <span>ぐったり</span>
      </div>
    </div>
  );
}

/**
 * 朝のうち（起床の2時間前〜4時間後）で、起きた・疲れ・朝ルーティンがまだ終わっていない。
 * 「起きた」を押すまでは、寝る準備の時刻まで出したままにする（寝坊しても押せば、その時刻から組み直す）
 */
export function isMorning(state: ReturnType<typeof useApp>["state"], day: DayPlan | undefined, now: number): boolean {
  const today = dayStartOf(now);
  const wake = day?.wake ?? today + 9 * 60 * MIN;
  const key = dateKeyOf(today);
  const log = state.wakeLogs.find((l) => l.date === key);
  // 起きた記録（「起きた」「いつ起きた？」「今から立て直す」の起きたところ）は夜の記録から見る
  const night = nightOf(state, key);
  // 「寝る」を押したあとは、おやすみのカードが消えたら、見積もった起床より前でも「起きた」を押せるように出す（次に起きるまで）
  const sleeping = !!night.bed && !night.up && !bedDayOf(state.result, now, state.settings.windDownMinutes);
  if (now < wake - 2 * 60 * MIN && !sleeping) return false;
  if (!upRecorded(night)) return now < (day?.bed ?? today + DAY_MS) - state.settings.windDownMinutes * MIN;
  // 前の時刻で記録したとき（押し忘れ・寝坊）も、記録してから2時間は出して、疲れと朝ルーティンを聞く
  const until = Math.max(wake + 4 * 60 * MIN, Math.min((night.upRecordedAt ?? 0) + 2 * 60 * MIN, (day?.bed ?? today + DAY_MS) - state.settings.windDownMinutes * MIN));
  if (now >= until) return false;
  const finished = log?.fatigue !== undefined && (state.routineSteps.length === 0 || log.routineDoneAt !== undefined);
  return !finished;
}

export default function MorningCard({ day, now, compact }: { day?: DayPlan; now: number; compact?: boolean }) {
  const { state, patch, update } = useApp();
  // 朝が終わったら1行にたたむ（押すと開く）
  const [open, setOpen] = useState(false);
  const today = dayStartOf(now);
  const key = dateKeyOf(today);
  const log: WakeLog = state.wakeLogs.find((l) => l.date === key) ?? { date: key, doneStepIds: [] };
  const streak = wakeStreak(state, today);
  const steps = state.routineSteps;
  const treat = todaysTreat(state, today, day);

  const setLog = (fn: (l: WakeLog) => WakeLog, affectsWake = false, sleep?: (logs: SleepLog[]) => SleepLog[]) => {
    const change = (d: MockData) => {
      const cur = d.wakeLogs.find((l) => l.date === key) ?? { date: key, doneStepIds: [] };
      const next = fn(cur);
      // 記録は1年ぶんだけ残す
      const rest = d.wakeLogs.filter((l) => l.date !== key);
      return { wakeLogs: [...rest, next].sort((a, b) => a.date.localeCompare(b.date)).slice(-400), ...(sleep ? { sleepLogs: sleep(d.sleepLogs) } : {}) };
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
    setLog(
      (l) => {
        const next: WakeLog = { ...l, doneStepIds: done };
        const all = steps.length > 0 && steps.every((s) => done.includes(s.id));
        if (all) next.routineDoneAt = l.routineDoneAt ?? Date.now();
        else delete next.routineDoneAt;
        if (starts) next.routineStartedAt = Date.now();
        if (clears) delete next.routineStartedAt;
        return next;
      },
      starts || clears,
      starts ? (logs) => notePlannedWake(logs, key, expectedWake) : clears ? (logs) => dropPlannedWake(logs, key) : undefined,
    );
  };

  // 起きた時刻と予定の起床は、夜の記録（眠りの記録）から
  const night = nightOf(state, key);
  const wokeAt = upRecorded(night) ? night.up?.at : undefined;
  const plannedWake = night.plannedWake ?? day?.wake;
  // ヘルスケアの起床で組み直した朝も、前の晩に予定していた起床と比べる（予定どおり起きたか）
  const expectedWake = plannedOf(state.result, key).wake ?? day?.wake;
  const lateBy = wokeAt !== undefined && plannedWake !== undefined ? Math.round((wokeAt - plannedWake) / MIN) : 0;
  // 遅れて押すとき（押し忘れ・寝坊）は、いつ起きたかを聞く。記録したあとも、時刻を押すと直せる
  const [editingWake, setEditingWake] = useState(false);
  const askWake = asksWakeTime(now, expectedWake);
  const candidates = wakeCandidates(state, key, night.plannedWake ?? expectedWake, now);
  // at がなければ今の時刻（「起きた」）
  const recordWake = (source: "button" | "picked", at?: number) =>
    update((d) => {
      const t = Date.now();
      return { ...d, sleepLogs: recordUp(d.sleepLogs, key, at ?? t, source, expectedWake, t) };
    });
  const pickWake = (at: number) => {
    recordWake("picked", at);
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
              : wokeAt !== undefined
                ? `${formatTime(wokeAt)} 起床`
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
        {wokeAt === undefined ? (
          <>
            {askWake ? (
              <WakePicker candidates={candidates} now={now} onPick={pickWake} />
            ) : (
            <button
              type="button"
              onClick={() => recordWake("button")}
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
                  aria-label={`起きた時刻 ${formatTime(wokeAt)} を直す`}
                  onClick={() => setEditingWake((v) => !v)}
                  className="press tabular-nums underline decoration-dotted underline-offset-4"
                >
                  {formatTime(wokeAt)}
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
                  // 朝ルーティンを始めていれば、そのときの予定の起床は残す
                  update((d) => ({
                    ...d,
                    sleepLogs: undoUp(d.sleepLogs, key, d.wakeLogs.find((l) => l.date === key)?.routineStartedAt !== undefined),
                  }))
                }
              >
                取り消す
              </button>
            </div>
            {editingWake && <WakePicker candidates={candidates} current={wokeAt} now={now} onPick={pickWake} />}
            <div>
              <p className={`mb-1.5 ${labelCls}`}>今の疲れ</p>
              <FatigueSlider value={log.fatigue} onChange={(v) => setLog((l) => ({ ...l, fatigue: v }))} />
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

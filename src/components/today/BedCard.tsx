"use client";

import { useState } from "react";
import type { PlanResult } from "@/lib/scheduler";
import { useApp } from "@/components/app/StoreProvider";
import { DAY_MS, MIN, formatMinutes, formatTime, fromInputTime } from "@/lib/mock/jst";
import { dateKeyOf } from "@/lib/mock/model";
import { bedOnTimeOf, correctBed, nightOf, pressBed, undoBed } from "@/lib/mock/night";
import { Card, btnPrimary, btnSecondary } from "@/components/ui/controls";
import { labelCls, bigTime, textBtn, CheckCircle } from "./parts";

/** 寝る準備の時刻から就寝の3時間後まで（「おやすみ」を出す間）。就寝を過ぎて前の日の計画が外れたら、昨夜の就寝で見る */
export function bedDayOf(result: PlanResult, now: number, windDownMinutes: number): { dayStart: number; bed: number } | undefined {
  const on = (d: { bed: number }) => now >= d.bed - windDownMinutes * MIN && now < d.bed + 3 * 60 * MIN;
  return result.dayPlans.find(on) ?? (result.lastNight && on(result.lastNight) ? result.lastNight : undefined);
}

/** 寝た時刻を直す（時刻を入れて記録） */
function BedTimeInput({ now, onPick }: { now: number; onPick: (at: number) => void }) {
  const [typed, setTyped] = useState("");
  const typedAt = (ref: number) => {
    const at = fromInputTime(typed, ref, "before");
    return at !== undefined && ref - at < 16 * 60 * MIN ? at : undefined;
  };
  return (
    <div className="flex items-center gap-2 px-4 pb-3">
      <input type="time" aria-label="寝た時刻" value={typed} onChange={(e) => setTyped(e.target.value)} className="min-w-0 flex-1 rounded-lg border border-line bg-surface2 p-2" />
      <button
        type="button"
        aria-label="寝た時刻を記録"
        disabled={typedAt(now) === undefined}
        onClick={() => {
          const at = typedAt(Date.now());
          if (at !== undefined) onPick(at);
        }}
        className={`${btnSecondary} shrink-0 py-2`}
      >
        記録
      </button>
    </div>
  );
}

/** 寝る準備の時刻になったら「寝る」。予定どおりに寝られたかを残す（ご褒美になる） */
export default function BedCard({ now }: { now: number }) {
  const { state, update } = useApp();
  const [editing, setEditing] = useState(false);
  const day = bedDayOf(state.result, now, state.settings.windDownMinutes);
  // 眠りの記録は起きる日（翌日）の夜に入れる
  const key = day ? dateKeyOf(day.dayStart + DAY_MS) : "";
  const night = day ? nightOf(state, key) : undefined;
  const log = night?.bed;
  const record = () => day && update((d) => ({ ...d, sleepLogs: pressBed(d.sleepLogs, key, Date.now(), day.bed) }));
  if (!day) return null;
  // 寝る前に、次の起床と最初の予定を見られるように（アラームを合わせる）
  const next = state.result.dayPlans.find((d) => d.dayStart === day.dayStart + DAY_MS);
  const undo = () => update((d) => ({ ...d, sleepLogs: undoBed(d.sleepLogs, key) }));
  return (
    <Card title="おやすみ">
      <div className="flex items-center gap-3 px-4 pt-1 pb-3.5">
        {log ? (
          <>
            <CheckCircle on />
            <p className="min-w-0 flex-1 text-[15px]">
              <button
                type="button"
                aria-expanded={editing}
                aria-label={`寝た時刻 ${formatTime(log.at)} を直す`}
                onClick={() => setEditing((v) => !v)}
                className="press tabular-nums underline decoration-dotted underline-offset-4"
              >
                {formatTime(log.at)}
              </button>
              に寝る
              {night?.plannedBed !== undefined && !bedOnTimeOf(night) && (
                <span className="block text-[13px] text-muted">予定より{formatMinutes(Math.round((log.at - night.plannedBed) / MIN))}遅く</span>
              )}
            </p>
            <button type="button" className={`${textBtn} text-muted`} onClick={undo}>
              取り消す
            </button>
          </>
        ) : (
          <>
            <div className="min-w-0 flex-1">
              <p className={labelCls}>就寝</p>
              <p className={bigTime}>{formatTime(day.bed)}</p>
            </div>
            <button type="button" onClick={record} className={`${btnPrimary} shrink-0 px-7 py-3 text-[16px]`}>
              寝る
            </button>
          </>
        )}
      </div>
      {log && editing && (
        <BedTimeInput
          now={now}
          onPick={(at) => {
            update((d) => ({ ...d, sleepLogs: correctBed(d.sleepLogs, key, at, Date.now()) }));
            setEditing(false);
          }}
        />
      )}
      {next && (
        <div className="flex items-start gap-3 px-4 py-2.5">
          <div className="shrink-0">
            <p className={labelCls}>起床</p>
            <p className="text-[15px] font-semibold tabular-nums">{formatTime(next.wake)}</p>
            {/* 予定に間に合うように起床を止めて、睡眠が設定より短くなる夜 */}
            {log && next.wake - log.at < state.settings.sleepMinutes * MIN && (
              <p role="status" className="text-[12px] text-muted">
                睡眠 {formatMinutes(Math.max(0, Math.round((next.wake - log.at) / MIN)))}
              </p>
            )}
          </div>
          {next.firstEvent && (
            <div className="min-w-0 flex-1 border-l border-line pl-3">
              <p className={labelCls}>最初の予定{next.leave ? `・${formatTime(next.leave)}出発` : ""}</p>
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

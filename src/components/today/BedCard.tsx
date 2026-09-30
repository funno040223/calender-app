"use client";

import type { PlanResult } from "@/lib/scheduler";
import { useApp } from "@/components/app/StoreProvider";
import { DAY_MS, MIN, formatMinutes, formatTime } from "@/lib/mock/jst";
import { dateKeyOf } from "@/lib/mock/model";
import { bedOnTime } from "@/lib/mock/stats";
import { BED_PREP_MINUTES } from "@/lib/notify/build";
import { Card, btnPrimary } from "@/components/ui/controls";
import { labelCls, bigTime, textBtn, CheckCircle } from "./parts";

/** 寝る準備の時刻から就寝の3時間後まで（「おやすみ」を出す間）。就寝を過ぎて前の日の計画が外れたら、昨夜の就寝で見る */
export function bedDayOf(result: PlanResult, now: number): { dayStart: number; bed: number } | undefined {
  const on = (d: { bed: number }) => now >= d.bed - BED_PREP_MINUTES * MIN && now < d.bed + 3 * 60 * MIN;
  return result.dayPlans.find(on) ?? (result.lastNight && on(result.lastNight) ? result.lastNight : undefined);
}

/** 寝る準備の時刻になったら「寝る」。予定どおりに寝られたかを残す（ご褒美になる） */
export default function BedCard({ now }: { now: number }) {
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
              <p className={labelCls}>就寝</p>
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
            <p className={labelCls}>起床</p>
            <p className="text-[15px] font-semibold tabular-nums">{formatTime(next.wake)}</p>
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

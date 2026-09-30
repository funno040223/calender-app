"use client";

import type { DayPlan } from "@/lib/scheduler";
import { useApp } from "@/components/app/StoreProvider";
import { MIN, formatMinutes, formatTime } from "@/lib/mock/jst";
import { Card } from "@/components/ui/controls";
import { timeOn, labelCls, bigTime } from "./parts";

/** 今日の起床・就寝、最初の予定と出発、行動ポイント */
export default function DayCard({ day, today, now }: { day: DayPlan; today: number; now: number }) {
  const toLeave = day.leave !== undefined ? Math.round((day.leave - now) / MIN) : undefined;
  // 始まった予定は今日の流れに出るので、ここでは出さない
  const first = day.firstEvent && day.firstEvent.start > now ? day.firstEvent : undefined;
  return (
    <Card>
      <div className="grid grid-cols-2 px-4 pt-3.5 pb-3">
        <div>
          <p className={labelCls}>起床</p>
          <p className={bigTime}>{formatTime(day.wake)}</p>
        </div>
        <div className="border-l border-line pl-4">
          <p className={labelCls}>就寝</p>
          <p className={bigTime}>{timeOn(today, day.bed)}</p>
        </div>
      </div>
      {first && (
        <div className="flex items-start gap-3 px-4 py-2.5">
          <div className="min-w-0 flex-1">
            <p className={labelCls}>最初の予定</p>
            <p className="truncate text-[15px]">
              <span className="tabular-nums">{formatTime(first.start)}</span> {first.title}
            </p>
          </div>
          {day.leave !== undefined && (
            <div className="shrink-0 text-right">
              <p className={labelCls}>出発</p>
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
        <span className={`shrink-0 ${labelCls}`}>行動ポイント</span>
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

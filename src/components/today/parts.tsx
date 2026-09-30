"use client";

import type { DayPlan } from "@/lib/scheduler";
import { useApp } from "@/components/app/StoreProvider";
import { CALENDARS, type CalendarId } from "@/lib/mock/calendars";
import { DAY_MS, formatTime } from "@/lib/mock/jst";
import { TREAT_CATEGORIES, dateKeyOf, treatFor } from "@/lib/mock/model";
import { rainyDayKeys } from "@/lib/mock/state";

export const colorOf = (id: CalendarId) => CALENDARS.find((c) => c.id === id)?.colorVar ?? "var(--muted)";

/** 日付をまたいだ時刻には「翌」をつける */
export function timeOn(day: number, ms: number) {
  return `${ms >= day + DAY_MS ? "翌" : ""}${formatTime(ms)}`;
}

export const labelCls = "text-[12px] font-medium text-muted";
export const bigTime = "text-[30px] font-semibold leading-tight tracking-tight tabular-nums";
export const textBtn = "press shrink-0 rounded-full bg-surface2 px-3 py-1 text-[13px] font-medium";

export function CheckCircle({ on }: { on: boolean }) {
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

/** 今日の楽しみ。休日でなければ遠出を、雨の日なら外でやるものを除いて選ぶ */
export function todaysTreat(state: ReturnType<typeof useApp>["state"], today: number, day: DayPlan | undefined) {
  return treatFor(today, state.treats, { holiday: day?.holiday, rainy: rainyDayKeys(state).includes(dateKeyOf(today)) });
}

/** 楽しみの見せ方：種類と条件を小さく */
export function TreatText({ treat }: { treat: NonNullable<ReturnType<typeof treatFor>> }) {
  return (
    <>
      <p className="text-[12px] font-medium text-muted">{TREAT_CATEGORIES.find((c) => c.id === treat.category)?.label}</p>
      <p className="text-[17px] font-semibold leading-snug">{treat.name}</p>
      {treat.condition && <p className="mt-0.5 text-[13px] text-muted">{treat.condition}</p>}
    </>
  );
}

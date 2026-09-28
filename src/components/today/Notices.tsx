"use client";

import { useState } from "react";
import type { MockState } from "@/lib/mock/store";
import { formatDate, formatDeadline, formatMinutes } from "@/lib/mock/jst";
import { eventIndex } from "@/lib/mock/related";

export function warningCount(state: MockState) {
  return state.result.shortfalls.length + state.result.travelQuestions.length;
}

function TravelQuestionRow({
  label,
  location,
  unknownMinutes,
  onRegister,
}: {
  label: string;
  location: string;
  unknownMinutes: number;
  onRegister: (location: string, minutes: number) => void;
}) {
  const [minutes, setMinutes] = useState("30");
  return (
    <li className="px-4 py-3 text-[14px]">
      <p>
        {label}場所「{location}」までの移動時間がわかりません（仮に{unknownMinutes}分で計算中）。
      </p>
      <div className="mt-2 flex items-center gap-2">
        <span className="text-muted">片道</span>
        <input
          type="number"
          inputMode="numeric"
          min={0}
          step={5}
          value={minutes}
          aria-label="移動時間（分）"
          onChange={(e) => setMinutes(e.target.value)}
          className="w-16 rounded-lg border border-line bg-surface2 px-2 py-1 text-right text-[16px]"
        />
        <span>分</span>
        <button
          type="button"
          className="ml-auto rounded-lg bg-accent px-3 py-1.5 text-[14px] font-semibold text-white"
          onClick={() => {
            const n = Number(minutes);
            if (Number.isFinite(n) && n >= 0) onRegister(location, Math.round(n));
          }}
        >
          場所を登録
        </button>
      </div>
    </li>
  );
}

/** 足りない時間・わからない移動時間・お休みにした習慣 */
export default function Notices({
  state,
  onRegisterPlace,
  onOpenTask,
}: {
  state: MockState;
  onRegisterPlace: (location: string, minutes: number) => void;
  onOpenTask: (id: string) => void;
}) {
  const { result } = state;
  const events = eventIndex(state);
  const deadlineSkips = result.skippedHabits.filter((s) => s.reason === "deadline");

  if (result.shortfalls.length === 0 && result.travelQuestions.length === 0 && deadlineSkips.length === 0) {
    return <p className="px-4 py-3 text-[14px] text-muted">いまのところ問題はありません。</p>;
  }
  return (
    <ul className="flex flex-col divide-y divide-line">
      {result.shortfalls.map((s) => (
        <li key={s.taskId}>
          <button type="button" onClick={() => onOpenTask(s.taskId)} className="flex w-full gap-3 px-4 py-3 text-left text-[14px] active:bg-surface2">
            <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-accent" />
            <span>
              「{s.title}」は{formatDeadline(s.deadline)}に<strong>{formatMinutes(s.shortfallMinutes)}</strong>
              足りません。予定を減らすか、締切や所要時間を見直してください。
            </span>
          </button>
        </li>
      ))}
      {result.travelQuestions.map((q) => {
        const ev = events.get(q.eventId)?.event;
        return (
          <TravelQuestionRow
            key={q.eventId}
            label={ev ? `${formatDate(ev.start)}「${ev.title}」の` : ""}
            location={q.location}
            unknownMinutes={state.settings.unknownTravelMinutes}
            onRegister={onRegisterPlace}
          />
        );
      })}
      {deadlineSkips.map((s) => (
        <li key={`${s.habitId}-${s.dayStart}`} className="px-4 py-3 text-[14px] text-muted">
          締切を優先して、{formatDate(s.dayStart)}の「{state.habits.find((h) => h.id === s.habitId)?.name ?? "習慣"}」はお休みにしました。
        </li>
      ))}
    </ul>
  );
}

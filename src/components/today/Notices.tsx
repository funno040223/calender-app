"use client";

import { useState } from "react";
import type { MockState } from "@/lib/mock/store";
import { formatDate, formatDeadline, formatMinutes } from "@/lib/mock/jst";
import { eventIndex } from "@/lib/mock/related";
import { travelAsks } from "@/lib/mock/state";

/** 今日の画面に出すお知らせがあるか（なければカードごと出さない） */
export function hasNotices(state: MockState) {
  const r = state.result;
  return r.shortfalls.length + r.travelQuestions.length + travelAsks(state, state.plannedAt).length + r.skippedHabits.filter((s) => s.reason === "deadline").length > 0;
}

export function warningCount(state: MockState) {
  return state.result.shortfalls.length + state.result.travelQuestions.length + travelAsks(state, state.plannedAt).length;
}

const TRAVEL_CHOICES = [0, 15, 30, 45, 60, 90];

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

export type ShortfallFix = "first" | "stretch" | "later";

/** 足りない時間・わからない移動時間・お休みにした習慣 */
export default function Notices({
  state,
  onRegisterPlace,
  onOpenTask,
  onFixShortfall,
  onSetTravel,
}: {
  state: MockState;
  onRegisterPlace: (location: string, minutes: number) => void;
  onOpenTask: (id: string) => void;
  /** 足りないときの選択肢：ほかを後に回す／時間帯の外にも入れる／締切を1日延ばす */
  onFixShortfall?: (taskId: string, fix: ShortfallFix) => void;
  /** 取り込んだ予定の片道の移動時間（0 は家にいる） */
  onSetTravel?: (eventId: string, minutes: number) => void;
}) {
  const { result } = state;
  const events = eventIndex(state);
  const deadlineSkips = result.skippedHabits.filter((s) => s.reason === "deadline");

  const asks = travelAsks(state, state.plannedAt);
  if (result.shortfalls.length === 0 && result.travelQuestions.length === 0 && asks.length === 0 && deadlineSkips.length === 0) {
    return null;
  }
  return (
    <ul className="flex flex-col divide-y divide-line">
      {result.shortfalls.map((s) => {
        const task = state.tasks.find((t) => t.id === s.taskId);
        const fixes: { fix: ShortfallFix; label: string; on: boolean }[] = [
          { fix: "first", label: "ほかを後に回す", on: !!task?.first },
          { fix: "stretch", label: "時間帯の外にも入れる", on: !!task?.stretch },
          ...(task?.deadline !== undefined ? [{ fix: "later" as const, label: "締切を1日延ばす", on: false }] : []),
        ];
        return (
          <li key={s.taskId} className="flex flex-col gap-2 px-4 py-3">
            <button type="button" onClick={() => onOpenTask(s.taskId)} className="flex w-full gap-3 text-left text-[14px]">
              <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-accent" />
              <span>
                「{s.title}」は{formatDeadline(s.deadline)}に<strong>{formatMinutes(s.shortfallMinutes)}</strong>足りません
              </span>
            </button>
            {onFixShortfall && task && (
              <div className="flex flex-wrap gap-2 pl-5">
                {fixes
                  .filter((f) => !f.on)
                  .map((f) => (
                    <button
                      key={f.fix}
                      type="button"
                      onClick={() => onFixShortfall(s.taskId, f.fix)}
                      className="rounded-lg bg-surface2 px-3 py-1.5 text-[13px]"
                    >
                      {f.label}
                    </button>
                  ))}
              </div>
            )}
          </li>
        );
      })}
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
      {onSetTravel &&
        asks.map((e) => (
          <li key={e.id} className="flex flex-col gap-2 px-4 py-3">
            <p className="flex gap-3 text-[14px]">
              <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-accent" />
              <span>
                {formatDate(e.start)}「{e.title}」の移動（片道）は？
              </span>
            </p>
            <div className="flex flex-wrap gap-2 pl-5">
              {TRAVEL_CHOICES.map((m) => (
                <button key={m} type="button" onClick={() => onSetTravel(e.id, m)} className="rounded-lg bg-surface2 px-3 py-1.5 text-[13px] tabular-nums">
                  {m === 0 ? "家にいる" : `${m}分`}
                </button>
              ))}
            </div>
          </li>
        ))}
      {deadlineSkips.map((s) => (
        <li key={`${s.habitId}-${s.dayStart}`} className="px-4 py-3 text-[14px] text-muted">
          締切を優先して、{formatDate(s.dayStart)}の「{state.habits.find((h) => h.id === s.habitId)?.name ?? "習慣"}」はお休みにしました。
        </li>
      ))}
    </ul>
  );
}

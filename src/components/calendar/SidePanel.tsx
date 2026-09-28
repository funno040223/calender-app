"use client";

import { useState } from "react";
import { estimateMinutes, type CalendarEvent, type Task } from "@/lib/scheduler";
import { CALENDARS, type CalendarId } from "@/lib/mock/calendars";
import { HABITS, SETTINGS, TAGS, type MockState } from "@/lib/mock/store";
import { MIN, formatDate, formatDeadline, formatMinutes } from "@/lib/mock/jst";

const PRIORITY_LABEL = { 1: "低", 2: "中", 3: "高" } as const;

function Section({ title, children, badge }: { title: string; children: React.ReactNode; badge?: number }) {
  return (
    <section className="flex flex-col gap-1.5">
      <h3 className="flex items-center gap-2 px-1 text-[13px] font-semibold text-muted">
        {title}
        {badge ? <span className="rounded-full bg-accent px-1.5 text-[11px] leading-[18px] text-white">{badge}</span> : null}
      </h3>
      {children}
    </section>
  );
}

export function warningCount(state: MockState) {
  return state.result.shortfalls.length + state.result.travelQuestions.length;
}

function TravelQuestionRow({
  event,
  location,
  onOpenOwn,
  onRegister,
}: {
  event?: CalendarEvent & { own: boolean };
  location: string;
  onOpenOwn: (id: string) => void;
  onRegister: (location: string, minutes: number) => void;
}) {
  const [minutes, setMinutes] = useState("30");
  return (
    <li className="rounded-xl bg-warn px-3 py-2 text-[13px]">
      <p>
        {event ? `${formatDate(event.start)}「${event.title}」の` : ""}場所「{location}」までの移動時間がわかりません（仮に{SETTINGS.unknownTravelMinutes}分で計算中）。
      </p>
      <div className="mt-1.5 flex items-center gap-2">
        <input
          type="number"
          inputMode="numeric"
          min={0}
          step={5}
          value={minutes}
          aria-label="移動時間（分）"
          onChange={(e) => setMinutes(e.target.value)}
          className="w-16 rounded-md border border-line bg-surface px-2 py-1 text-[14px]"
        />
        <span>分</span>
        <button
          type="button"
          className="rounded-md bg-surface px-2 py-1 font-medium text-accent"
          onClick={() => {
            const n = Number(minutes);
            if (Number.isFinite(n) && n >= 0) onRegister(location, n);
          }}
        >
          場所を登録
        </button>
        {event?.own && (
          <button type="button" className="px-1 py-1 text-muted underline" onClick={() => onOpenOwn(event.id)}>
            予定を開く
          </button>
        )}
      </div>
    </li>
  );
}

export default function SidePanel({
  state,
  hidden,
  onToggleCalendar,
  onDeleteTask,
  onOpenOwn,
  onRegisterPlace,
  onReset,
}: {
  state: MockState;
  hidden: Set<CalendarId>;
  onToggleCalendar: (id: CalendarId) => void;
  onDeleteTask: (id: string) => void;
  onOpenOwn: (id: string) => void;
  onRegisterPlace: (location: string, minutes: number) => void;
  onReset: () => void;
}) {
  const { result } = state;
  const allEvents = [
    ...state.ownEvents.map((e) => ({ ...e, own: true })),
    ...state.classEvents.map((e) => ({ ...e, own: false })),
    ...state.googleEvents.map((e) => ({ ...e, own: false })),
  ];
  const deadlineSkips = result.skippedHabits.filter((s) => s.reason === "deadline");

  const placedMinutes = (task: Task) =>
    result.blocks
      .filter((b) => b.kind === "task" && b.refId === task.id)
      .reduce((sum, b) => sum + (b.end - b.start) / MIN, 0);

  return (
    <div className="flex flex-col gap-5">
      <Section title="カレンダー">
        <ul className="flex flex-col">
          {CALENDARS.map((c) => {
            const on = !hidden.has(c.id);
            return (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => onToggleCalendar(c.id)}
                  className="flex w-full items-center gap-2.5 rounded-lg px-1 py-1.5 text-left text-[15px] hover:bg-surface2"
                  aria-pressed={on}
                >
                  <span
                    className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border-2"
                    style={{ borderColor: c.colorVar, background: on ? c.colorVar : "transparent" }}
                  >
                    {on && (
                      <svg viewBox="0 0 12 12" width="10" height="10" aria-hidden>
                        <path d="M2.5 6.2 5 8.5l4.5-5" stroke="white" strokeWidth="1.8" fill="none" strokeLinecap="round" />
                      </svg>
                    )}
                  </span>
                  <span className={on ? "" : "text-muted"}>{c.name}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </Section>

      <Section title="お知らせ" badge={warningCount(state)}>
        {result.shortfalls.length === 0 && result.travelQuestions.length === 0 && deadlineSkips.length === 0 ? (
          <p className="px-1 text-[13px] text-muted">いまのところ問題はありません。</p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {result.shortfalls.map((s) => (
              <li key={s.taskId} className="rounded-xl bg-warn px-3 py-2 text-[13px]">
                「{s.title}」は{formatDeadline(s.deadline)}に<strong>{formatMinutes(s.shortfallMinutes)}</strong>
                足りません。予定を減らすか、締切や所要時間を見直してください。
              </li>
            ))}
            {result.travelQuestions.map((q) => (
              <TravelQuestionRow
                key={q.eventId}
                event={allEvents.find((e) => e.id === q.eventId)}
                location={q.location}
                onOpenOwn={onOpenOwn}
                onRegister={onRegisterPlace}
              />
            ))}
            {deadlineSkips.map((s) => (
              <li key={`${s.habitId}-${s.dayStart}`} className="rounded-xl bg-surface2 px-3 py-2 text-[13px] text-muted">
                締切を優先して、{formatDate(s.dayStart)}の「{HABITS.find((h) => h.id === s.habitId)?.name}」はお休みにしました。
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title={`タスク（${state.tasks.length}）`}>
        {state.tasks.length === 0 ? (
          <p className="px-1 text-[13px] text-muted">タスクはありません。下の入力欄から追加できます。</p>
        ) : (
          <ul className="flex flex-col divide-y divide-line">
            {[...state.tasks]
              .sort((a, b) => (a.deadline ?? Infinity) - (b.deadline ?? Infinity))
              .map((t) => {
                const tag = TAGS.find((g) => g.id === t.tagId);
                const need = estimateMinutes(t, tag);
                const placed = placedMinutes(t);
                return (
                  <li key={t.id} className="flex items-start gap-2 px-1 py-2">
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full" style={{ background: "var(--cal-task)" }} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[15px]">{t.title}</p>
                      <p className="text-[12px] text-muted">
                        {t.deadline ? formatDeadline(t.deadline) : "締切なし"}・{formatMinutes(need)}・優先度{PRIORITY_LABEL[t.priority]}
                        {tag ? `・${tag.name}` : ""}
                      </p>
                      <p className="text-[12px] text-muted">
                        {placed >= need ? "配置済み" : placed > 0 ? `${formatMinutes(placed)}を配置` : "未配置"}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onDeleteTask(t.id)}
                      className="shrink-0 rounded-md px-2 py-1 text-[13px] text-accent hover:bg-surface2"
                      aria-label={`${t.title}を削除`}
                    >
                      削除
                    </button>
                  </li>
                );
              })}
          </ul>
        )}
      </Section>

      <button
        type="button"
        onClick={onReset}
        className="self-start rounded-lg px-1 py-1 text-[13px] text-muted underline hover:text-fg"
      >
        サンプルに戻す
      </button>
    </div>
  );
}

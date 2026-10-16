"use client";

import { useState } from "react";
import { useApp } from "@/components/app/StoreProvider";
import { Card, btnPrimary, btnSecondary, pillCls } from "@/components/ui/controls";
import { formatDate, formatMinutes, fromInputTime, newId, toInputTime } from "@/lib/mock/jst";
import { replan } from "@/lib/mock/state";
import {
  defaultPauseEnd,
  freeNowMinutes,
  resetRhythm,
  sleepNow,
  startHabitNow,
  startWorkNow,
  workNowChoices,
  workNowGap,
  workNowHabits,
} from "@/lib/mock/recovery";

const PRESETS = [15, 30, 60];
/** タスクの候補は、まず締切の近い3件。残りは「ほか N件」で出す */
const FIRST_TASKS = 3;

/** 「休む」：終わりの時刻を選んで、自動のタスクと飛ばせる習慣を入れない時間にする */
function PauseInput({ now, onPause }: { now: number; onPause: (end: number) => void }) {
  const { state } = useApp();
  const [end, setEnd] = useState(() => toInputTime(defaultPauseEnd(state, now)));
  const at = fromInputTime(end, now, "after");
  return (
    <div className="flex items-center gap-2">
      <input type="time" aria-label="休む（終わり）" value={end} onChange={(e) => setEnd(e.target.value)} className="min-w-0 flex-1 rounded-lg border border-line bg-surface2 p-2" />
      <button type="button" disabled={at === undefined} onClick={() => at !== undefined && onPause(at)} className={`${btnPrimary} shrink-0 py-2`}>
        休む
      </button>
    </div>
  );
}

export default function WorkNowCard({ now }: { now: number }) {
  const { state, update, notify } = useApp();
  const [pausing, setPausing] = useState(false);
  // 押した分だけ候補を出す。数字は打たずに、次の予定・習慣までの空き時間か、よく使う長さから選ぶ
  const [minutes, setMinutes] = useState<number>();
  const [all, setAll] = useState(false);
  const free = freeNowMinutes(workNowGap(state, now), now);
  const options = [...new Set([...PRESETS, ...(free !== undefined ? [free] : [])])].sort((a, b) => a - b);
  const choices = minutes ? workNowChoices(state, now, minutes) : [];
  const shown = all ? choices : choices.slice(0, FIRST_TASKS);
  const habits = minutes ? workNowHabits(state, now, minutes) : [];
  const choose = (m: number) => {
    setMinutes(minutes === m ? undefined : m);
    setAll(false);
  };
  return (
    <Card title="今から何する？">
      <div className="flex flex-col gap-2.5 px-4 pt-1 pb-3.5">
        <div className="grid grid-cols-2 gap-2">
          <button type="button" aria-pressed={pausing} onClick={() => setPausing((v) => !v)} className={pillCls(pausing)}>
            休む
          </button>
          <button
            type="button"
            onClick={() => {
              // いつ押しても、その夜の眠り（起床を見積もる）
              update((d) => sleepNow(d, state.result, Date.now()));
              setPausing(false);
              setMinutes(undefined);
            }}
            className={pillCls(false)}
          >
            寝る
          </button>
        </div>
        {pausing && (
          <PauseInput
            now={now}
            onPause={(end) => {
              update((d) => resetRhythm(d, { id: newId("pause"), mode: "tired", start: Date.now(), end }, Date.now()));
              setPausing(false);
              notify("組み直しました");
            }}
          />
        )}
        <div className="flex flex-wrap gap-2">
          {options.map((m) => (
            <button key={m} type="button" aria-pressed={minutes === m} onClick={() => choose(m)} className={pillCls(minutes === m)}>
              {m === free ? `空き ${formatMinutes(m)}` : formatMinutes(m)}
            </button>
          ))}
        </div>
        {minutes !== undefined && !choices.length && !habits.length && (
          <p role="status" className="text-[14px] text-muted">
            次の予定までに入るものがありません
          </p>
        )}
        {minutes !== undefined &&
          shown.map((c) => (
            <button
              key={c.task.id}
              type="button"
              className={`${btnPrimary} py-3 text-left`}
              onClick={() => {
                update((d) => startWorkNow(replan(d, state.googleEvents, Date.now()), c.task.id, minutes, Date.now()));
                setMinutes(undefined);
                notify(`「${c.task.title}」を始めました`);
              }}
            >
              <span className="block">
                {c.task.title}・{formatMinutes(c.minutes)}を始める
              </span>
              {c.task.deadline !== undefined && <span className="mt-0.5 block text-[13px] font-normal opacity-75">〆{formatDate(c.task.deadline)}</span>}
            </button>
          ))}
        {minutes !== undefined && shown.length < choices.length && (
          <button type="button" onClick={() => setAll(true)} className="flex items-center gap-1 text-left text-[14px] font-medium text-tint">
            ほか {choices.length - shown.length}件
            <svg viewBox="0 0 12 12" width="11" height="11" aria-hidden className="text-muted">
              <path d="M2.5 4.5 6 8l3.5-3.5" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}
        {minutes !== undefined &&
          habits.map((c) => (
            <button
              key={c.habit.id}
              type="button"
              className={`${btnSecondary} py-3 text-left`}
              onClick={() => {
                update((d) => startHabitNow(replan(d, state.googleEvents, Date.now()), c.habit.id, minutes, Date.now()));
                setMinutes(undefined);
                notify(`「${c.title}」を始めました`);
              }}
            >
              {c.title}・{formatMinutes(c.minutes)}を始める
            </button>
          ))}
      </div>
    </Card>
  );
}

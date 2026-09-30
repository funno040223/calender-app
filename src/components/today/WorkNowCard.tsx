"use client";

import { useState } from "react";
import { useApp } from "@/components/app/StoreProvider";
import { Group } from "@/components/ui/controls";
import { formatMinutes } from "@/lib/mock/jst";
import { replan } from "@/lib/mock/state";
import { freeNowMinutes, startHabitNow, startWorkNow, workNowChoices, workNowGap, workNowHabits } from "@/lib/mock/recovery";

const PRESETS = [15, 30, 60];

export default function WorkNowCard({ now }: { now: number }) {
  const { state, update, notify } = useApp();
  // 押した分だけ候補を出す。数字は打たずに、次の予定・習慣までの空き時間か、よく使う長さから選ぶ
  const [minutes, setMinutes] = useState<number>();
  const free = freeNowMinutes(workNowGap(state, now), now);
  const options = [...new Set([...PRESETS, ...(free !== undefined ? [free] : [])])].sort((a, b) => a - b);
  const choices = minutes ? workNowChoices(state, now, minutes) : [];
  const habits = minutes ? workNowHabits(state, now, minutes) : [];
  return <Group title="今から何する？">
    <div className="flex flex-col gap-3 px-4 py-3">
      <div className="flex flex-wrap gap-2">
        {options.map((m) => <button key={m} type="button" aria-pressed={minutes === m} onClick={() => setMinutes(minutes === m ? undefined : m)} className={`rounded-full px-3.5 py-1.5 text-[14px] tabular-nums ${minutes === m ? "bg-accent font-medium text-white" : "bg-surface2"}`}>
          {m === free ? `空き ${formatMinutes(m)}` : formatMinutes(m)}
        </button>)}
      </div>
      {minutes !== undefined && !choices.length && !habits.length && <p role="status" className="text-[14px]">次の予定までに入るものがありません</p>}
      {minutes !== undefined && choices.map((c) => <button key={c.task.id} className="rounded-lg bg-accent px-3 py-3 text-left text-white" onClick={() => {
        update((d) => startWorkNow(replan(d, state.googleEvents, Date.now()), c.task.id, minutes, Date.now())); setMinutes(undefined);
        notify(`「${c.task.title}」を始めました`);
      }}>{c.task.title}・{formatMinutes(c.minutes)}を始める</button>)}
      {minutes !== undefined && habits.map((c) => <button key={c.habit.id} className="rounded-lg bg-surface2 px-3 py-3 text-left" onClick={() => {
        update((d) => startHabitNow(replan(d, state.googleEvents, Date.now()), c.habit.id, minutes, Date.now())); setMinutes(undefined);
        notify(`「${c.title}」を始めました`);
      }}>{c.title}・{formatMinutes(c.minutes)}を始める</button>)}
    </div>
  </Group>;
}

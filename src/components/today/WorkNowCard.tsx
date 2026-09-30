"use client";

import { useState } from "react";
import { useApp } from "@/components/app/StoreProvider";
import { Group } from "@/components/ui/controls";
import { formatMinutes } from "@/lib/mock/jst";
import { replan } from "@/lib/mock/state";
import { freeNowMinutes, startHabitNow, startWorkNow, workNowChoices, workNowGap, workNowHabits } from "@/lib/mock/recovery";

export default function WorkNowCard({ now }: { now: number }) {
  const { state, update } = useApp();
  // 空にして打ち直せるように、入力は文字のまま持つ。最初は次の予定・習慣までの時間（5分刻み、なければ30分）
  const [text, setText] = useState(() => String(freeNowMinutes(workNowGap(state, now), now) ?? 30));
  const minutes = text.trim() ? Number(text) : 0;
  const [show, setShow] = useState(false);
  const choices = show ? workNowChoices(state, now, minutes) : [];
  const habits = show ? workNowHabits(state, now, minutes) : [];
  return <Group title="今から何する？">
    <div className="flex flex-col gap-3 px-4 py-3">
      <label className="text-[14px]">使える時間（分）<input type="number" min="5" max="180" step="5" inputMode="numeric" value={text} onChange={(e) => { setText(e.target.value); setShow(false); }} className="ml-2 w-20 rounded-lg border border-line bg-surface p-2 text-[16px]" /></label>
      <button disabled={!Number.isFinite(minutes) || minutes < 5 || minutes > 180} onClick={() => setShow(true)} className="rounded-lg bg-surface2 px-3 py-2 disabled:opacity-40">候補を見る</button>
      {show && !choices.length && !habits.length && <p role="status" className="text-[14px]">次の予定までに入るものがありません</p>}
      {choices.map((c) => <button key={c.task.id} className="rounded-lg bg-accent px-3 py-3 text-left text-white" onClick={() => {
        update((d) => startWorkNow(replan(d, state.googleEvents, Date.now()), c.task.id, minutes, Date.now())); setShow(false);
      }}>{c.task.title}・{formatMinutes(c.minutes)}を始める</button>)}
      {habits.map((c) => <button key={c.habit.id} className="rounded-lg bg-surface2 px-3 py-3 text-left" onClick={() => {
        update((d) => startHabitNow(replan(d, state.googleEvents, Date.now()), c.habit.id, minutes, Date.now())); setShow(false);
      }}>{c.title}・{formatMinutes(c.minutes)}を始める</button>)}
    </div>
  </Group>;
}

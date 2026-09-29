"use client";

import { useState } from "react";
import { useApp } from "@/components/app/StoreProvider";
import { Group } from "@/components/ui/controls";
import { formatMinutes } from "@/lib/mock/jst";
import { replan } from "@/lib/mock/state";
import { startWorkNow, workNowChoices } from "@/lib/mock/recovery";

export default function WorkNowCard({ now }: { now: number }) {
  const { state, update } = useApp();
  const [minutes, setMinutes] = useState(30);
  const [show, setShow] = useState(false);
  const choices = show ? workNowChoices(state, now, minutes) : [];
  return <Group title="今から何分できる？">
    <div className="flex flex-col gap-3 px-4 py-3">
      <label className="text-[14px]">作業できる時間（分）<input type="number" min="5" max="180" step="5" value={minutes} onChange={(e) => { setMinutes(Number(e.target.value)); setShow(false); }} className="ml-2 w-20 rounded-lg border border-line bg-surface p-2" /></label>
      <button disabled={minutes < 5 || minutes > 180} onClick={() => setShow(true)} className="rounded-lg bg-surface2 px-3 py-2 disabled:opacity-40">候補を見る</button>
      {show && !choices.length && <p role="status" className="text-[14px]">今は作業と休憩が入る空きがありません。時間を短くするか、次の空き時間に試してください。</p>}
      {choices.map((c) => <button key={c.task.id} className="rounded-lg bg-accent px-3 py-3 text-left text-white" onClick={() => {
        update((d) => startWorkNow(replan(d, state.googleEvents, Date.now()), c.task.id, minutes, Date.now())); setShow(false);
      }}>{c.task.title}・{formatMinutes(c.minutes)}を始める</button>)}
    </div>
  </Group>;
}

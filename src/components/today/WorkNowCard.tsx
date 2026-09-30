"use client";

import { useState } from "react";
import { useApp } from "@/components/app/StoreProvider";
import { Group } from "@/components/ui/controls";
import { formatMinutes } from "@/lib/mock/jst";
import { replan } from "@/lib/mock/state";
import { freeNowMinutes, startWorkNow, workNowChoices } from "@/lib/mock/recovery";

export default function WorkNowCard({ now }: { now: number }) {
  const { state, update } = useApp();
  // 空にして打ち直せるように、入力は文字のまま持つ。最初は今の空き時間の長さ（5分刻み、空きでなければ30分）
  const [text, setText] = useState(() => String(freeNowMinutes(state.result.freeGaps, now) ?? 30));
  const minutes = text.trim() ? Number(text) : 0;
  const [show, setShow] = useState(false);
  const choices = show ? workNowChoices(state, now, minutes) : [];
  return <Group title="今から何分できる？">
    <div className="flex flex-col gap-3 px-4 py-3">
      <label className="text-[14px]">作業できる時間（分）<input type="number" min="5" max="180" step="5" inputMode="numeric" value={text} onChange={(e) => { setText(e.target.value); setShow(false); }} className="ml-2 w-20 rounded-lg border border-line bg-surface p-2 text-[16px]" /></label>
      <button disabled={!Number.isFinite(minutes) || minutes < 5 || minutes > 180} onClick={() => setShow(true)} className="rounded-lg bg-surface2 px-3 py-2 disabled:opacity-40">候補を見る</button>
      {show && !choices.length && <p role="status" className="text-[14px]">今は作業と休憩が入る空きがありません。時間を短くするか、次の空き時間に試してください。</p>}
      {choices.map((c) => <button key={c.task.id} className="rounded-lg bg-accent px-3 py-3 text-left text-white" onClick={() => {
        update((d) => startWorkNow(replan(d, state.googleEvents, Date.now()), c.task.id, minutes, Date.now())); setShow(false);
      }}>{c.task.title}・{formatMinutes(c.minutes)}を始める</button>)}
    </div>
  </Group>;
}

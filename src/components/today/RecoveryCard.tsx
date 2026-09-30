"use client";

import { useState } from "react";
import { useApp } from "@/components/app/StoreProvider";
import { Card, btnPrimary } from "@/components/ui/controls";
import { MIN, formatDateTime, fromInputDateTime, newId, toInputDateTime } from "@/lib/mock/jst";
import { defaultPauseEnd, resetConflicts, resetRhythm } from "@/lib/mock/recovery";
import type { RhythmReset } from "@/lib/scheduler";

export default function RecoveryCard({ now }: { now: number }) {
  const { state, update } = useApp();
  const [mode, setMode] = useState<RhythmReset["mode"]>();
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [message, setMessage] = useState("");
  const choose = (value: RhythmReset["mode"]) => {
    setMode(value); setMessage("");
    setStart(toInputDateTime(value === "woke" ? now - state.settings.sleepMinutes * MIN : now));
    setEnd(toInputDateTime(value === "sleep" ? now + state.settings.sleepMinutes * MIN : value === "woke" ? now : defaultPauseEnd(state, now)));
  };
  const st = fromInputDateTime(start), en = fromInputDateTime(end);
  const valid = mode && st !== undefined && en !== undefined && en > st && en - st <= 48 * 60 * MIN && st <= now && (mode !== "woke" || en <= now);
  const draft = valid ? { id: "preview", mode, start: st, end: en } : undefined;
  const conflicts = draft ? resetConflicts(state, draft) : [];
  const apply = () => {
    if (!draft) return;
    update((d) => resetRhythm(d, { ...draft, id: newId("reset") }, Date.now()));
    setMode(undefined); setMessage(draft.mode === "tired" ? "休む時間を確保しました。作業する余裕が出たら、下から選べます。" : "睡眠をカレンダーに反映し、起床から食事・習慣・タスクを組み直しました。");
  };
  const active = (state.result.rhythmResets ?? []).filter((r) => r.end > now).at(-1);
  const remainingConflicts = [
    ...(state.result.rhythmResets ?? []).flatMap((r) => resetConflicts(state, r)),
    ...state.result.dayPlans.flatMap((d) => d.firstEvent && (d.leave ?? d.firstEvent.start) < d.wake ? [d.firstEvent] : []),
  ].filter((c, i, all) => c.end > now && all.findIndex((x) => x.title === c.title && x.start === c.start) === i);
  return <Card title="今から立て直す">
    <div className="flex flex-col gap-3 px-4 pt-1 pb-3.5">
      <div className="grid grid-cols-3 gap-2">{([['sleep', '今から寝る'], ['woke', '起きたところ'], ['tired', '疲れている']] as const).map(([value, label]) =>
        <button key={value} onClick={() => choose(value)} className={`press whitespace-nowrap rounded-xl px-1 py-2 text-[14px] font-medium ${mode === value ? "bg-tint text-on-tint" : "bg-surface2"}`}>{label}</button>)}</div>
      {mode && <>
        {mode !== "tired" && <label className="text-[14px]">{mode === "woke" ? "寝た時刻" : "寝る時刻"}<input aria-label="寝た時刻" type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} className="mt-1 w-full min-w-0 rounded-lg border border-line bg-surface2 p-2" /></label>}
        <label className="text-[14px]">{mode === "tired" ? "自動で作業を入れない時間の終わり" : mode === "woke" ? "起きた時刻" : "起きる予定時刻"}<input aria-label="立て直しの終了時刻" type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} className="mt-1 w-full min-w-0 rounded-lg border border-line bg-surface2 p-2" /></label>
        {!valid && <p role="alert" className="text-[13px]">開始より後、48時間以内の時刻を入力してください。起床の記録は現在までの時刻を選べます。</p>}
        {conflicts.length > 0 && <div role="alert" className="rounded-lg bg-surface2 p-3 text-[14px]">睡眠と重なる固定予定があります。予定の変更はカレンダーから行ってください。<ul>{conflicts.map((c, i) => <li key={i}>{formatDateTime(c.start)} {c.title}</li>)}</ul></div>}
        <button disabled={!valid} onClick={apply} className={btnPrimary}>{conflicts.length ? "衝突を確認して組み直す" : "この時刻で組み直す"}</button>
        <button onClick={() => setMode(undefined)} className="text-[14px] text-muted">閉じる</button>
      </>}
      {active && !mode && <p className="text-[13px]">{formatDateTime(active.end)}まで{active.mode === "tired" ? "自動の作業を休止中" : "睡眠の予定"}</p>}
      {!mode && remainingConflicts.length > 0 && <p role="alert" className="text-[14px]">睡眠・起床と重なる固定予定：{remainingConflicts.map((c) => `${formatDateTime(c.start)} ${c.title}`).join("、")}。カレンダーで確認してください。</p>}
      {message && <p role="status" className="text-[14px]">{message}</p>}
    </div>
  </Card>;
}

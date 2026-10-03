"use client";

import { useState } from "react";
import { useApp } from "@/components/app/StoreProvider";
import { Card, btnPrimary } from "@/components/ui/controls";
import { MIN, formatDateTime, fromInputTime, newId, toInputTime } from "@/lib/mock/jst";
import { defaultPauseEnd, resetConflicts, resetRhythm } from "@/lib/mock/recovery";
import type { RhythmReset } from "@/lib/scheduler";

const MODES = [
  ["sleep", "今から寝る"],
  ["woke", "起きたところ"],
  ["tired", "疲れている"],
] as const;

/** 崩れた日の立て直し：入れた睡眠（または休む時間）から、朝ルーティン・食事・習慣・タスクを組み直す */
export default function RecoveryCard({ now }: { now: number }) {
  const { state, update, notify } = useApp();
  const [mode, setMode] = useState<RhythmReset["mode"]>();
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const choose = (value: RhythmReset["mode"]) => {
    setMode(value);
    setStart(toInputTime(value === "woke" ? now - state.settings.sleepMinutes * MIN : now));
    setEnd(toInputTime(value === "sleep" ? now + state.settings.sleepMinutes * MIN : value === "woke" ? now : defaultPauseEnd(state, now)));
  };
  // 入れるのは時刻だけ。日付は今から決める：起きたところ＝今までに起きて、その前に寝た／今から寝る＝寝てから起きる／疲れている＝今から休む
  let st: number | undefined;
  let en: number | undefined;
  if (mode === "woke") {
    en = fromInputTime(end, now, "before");
    st = en === undefined ? undefined : fromInputTime(start, en - MIN, "before");
  } else if (mode === "sleep") {
    st = fromInputTime(start, now, "before");
    en = st === undefined ? undefined : fromInputTime(end, st, "after");
  } else if (mode === "tired") {
    st = now;
    en = fromInputTime(end, now, "after");
  }
  const valid = mode && st !== undefined && en !== undefined && en > st;
  const draft = valid ? { id: "preview", mode, start: st!, end: en! } : undefined;
  const conflicts = draft ? resetConflicts(state, draft) : [];
  const apply = () => {
    if (!draft) return;
    update((d) => resetRhythm(d, { ...draft, id: newId("reset") }, Date.now()));
    setMode(undefined);
    notify("組み直しました");
  };
  // 「寝る」「起きた」から見積もった睡眠も含める
  const resets = state.result.rhythmResets ?? [];
  const active = resets.filter((r) => r.end > now).at(-1);
  const remainingConflicts = [
    ...resets.flatMap((r) => resetConflicts(state, r)),
    ...state.result.dayPlans.flatMap((d) => (d.firstEvent && (d.leave ?? d.firstEvent.start) < d.wake ? [d.firstEvent] : [])),
  ].filter((c, i, all) => c.end > now && all.findIndex((x) => x.title === c.title && x.start === c.start) === i);
  const input = "mt-1 w-full min-w-0 rounded-lg border border-line bg-surface2 p-2";
  return (
    <Card title="今から立て直す">
      <div className="flex flex-col gap-3 px-4 pt-1 pb-3.5">
        <div className="grid grid-cols-3 gap-2">
          {MODES.map(([value, label]) => (
            <button
              key={value}
              type="button"
              aria-pressed={mode === value}
              onClick={() => (mode === value ? setMode(undefined) : choose(value))}
              className={`press whitespace-nowrap rounded-xl px-1 py-2 text-[14px] font-medium ${mode === value ? "bg-tint text-on-tint" : "bg-surface2"}`}
            >
              {label}
            </button>
          ))}
        </div>
        {mode && (
          <>
            {mode !== "tired" && (
              <label className="text-[14px]">
                {mode === "woke" ? "寝た" : "寝る"}
                <input aria-label="寝た時刻" type="time" value={start} onChange={(e) => setStart(e.target.value)} className={input} />
              </label>
            )}
            <label className="text-[14px]">
              {mode === "tired" ? "休む（終わり）" : mode === "woke" ? "起きた" : "起きる"}
              <input aria-label="立て直しの終了時刻" type="time" value={end} onChange={(e) => setEnd(e.target.value)} className={input} />
            </label>
            {!valid && (
              <p role="alert" className="text-[13px] text-accent">
                時刻を入れてください
              </p>
            )}
            {conflicts.length > 0 && (
              <div role="alert" className="rounded-lg bg-surface2 p-3 text-[14px]">
                重なる予定
                <ul>
                  {conflicts.map((c, i) => (
                    <li key={i}>
                      {formatDateTime(c.start)} {c.title}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <button type="button" disabled={!valid} onClick={apply} className={btnPrimary}>
              組み直す
            </button>
          </>
        )}
        {active && !mode && (
          <p className="text-[13px] text-muted">
            {formatDateTime(active.end)}まで{active.mode === "tired" ? "休む" : "睡眠"}
          </p>
        )}
        {!mode && remainingConflicts.length > 0 && (
          <p role="alert" className="text-[14px]">
            睡眠と重なる予定：{remainingConflicts.map((c) => `${formatDateTime(c.start)} ${c.title}`).join("、")}
          </p>
        )}
      </div>
    </Card>
  );
}

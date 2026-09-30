"use client";

import { useState } from "react";
import { useApp } from "@/components/app/StoreProvider";
import { Card, btnPrimary, btnSecondary } from "@/components/ui/controls";
import { formatDate, formatMinutes } from "@/lib/mock/jst";
import { confirmWork, pendingWork } from "@/lib/mock/progress";

const btn = `${btnSecondary} px-3.5 py-2 text-[14px]`;

export default function ProgressCard({ now }: { now: number }) {
  const { state, update, notify } = useApp();
  const [remaining, setRemaining] = useState<Record<string, string>>({});
  // 残り時間の入力は、押したときだけ開く
  const [editing, setEditing] = useState<string>();
  const pending = pendingWork(state, now);
  if (!pending.length) return null;
  return <Card title="作業の進み具合">
    {pending.map(({ task, entries, minutes, expected }) => {
      const id = entries.map(([k]) => k).join(",");
      const value = remaining[id] ?? String(expected);
      const number = Number(value);
      const valid = value !== "" && Number.isFinite(number) && number >= 0;
      const diff = number - expected;
      const answer = (outcome: "planned" | "partial" | "none" | "done") => {
        update((d) => confirmWork(d, task.id, entries.map(([k]) => k), outcome, Date.now(), number));
        notify(outcome === "done" ? `「${task.title}」を完了` : "記録しました");
      };
      return <div key={id} className="flex flex-col gap-3 px-4 pt-1.5 pb-4">
        <div>
          <p className="text-[16px] font-semibold">{task.title}</p>
          <p className="text-[13px] text-muted">{formatDate(entries[0][1].start)}からの未確認 {entries.length}枠・計{formatMinutes(minutes)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className={`${btnPrimary} px-3.5 py-2 text-[14px]`} onClick={() => answer("planned")}>予定どおりできた</button>
          <button className={btn} onClick={() => answer("none")}>できなかった</button>
          <button className={btn} onClick={() => answer("done")}>タスク完了</button>
          {editing !== id && <button className={btn} onClick={() => setEditing(id)}>残りを直す</button>}
        </div>
        {editing === id && <>
          <p className="text-[13px] text-muted">予定どおりなら残り{formatMinutes(expected)}</p>
          <div className="flex items-center gap-2">
            <button aria-label={`${task.title}の残りを30分減らす`} className={btn} onClick={() => setRemaining((p) => ({ ...p, [id]: String(Math.max(0, (valid ? number : expected) - 30)) }))}>−</button>
            <label className="min-w-0 flex-1 text-[13px]">残り（分）<input type="number" inputMode="numeric" min="0" step="5" value={value} onChange={(e) => setRemaining((p) => ({ ...p, [id]: e.target.value }))} className="mt-1 w-full rounded-lg border border-line bg-surface2 px-2 py-2 text-[16px] outline-none focus:border-tint" /></label>
            <button aria-label={`${task.title}の残りを30分増やす`} className={btn} onClick={() => setRemaining((p) => ({ ...p, [id]: String((valid ? number : expected) + 30) }))}>＋</button>
          </div>
          {valid && <p className="text-[13px]" role="status">{diff === 0 ? "予定どおりの残り時間" : `予定より${formatMinutes(Math.abs(diff))}${diff > 0 ? "多く残る" : "早く終わる見込み"}`}</p>}
          <button disabled={!valid} className={btnPrimary} onClick={() => answer("partial")}>この残り時間で確定</button>
        </>}
      </div>;
    })}
  </Card>;
}

"use client";

import { useEffect, useState } from "react";
import { useApp } from "@/components/app/StoreProvider";
import { DAY_MS, formatTime } from "@/lib/mock/jst";
import { Card, btnSecondary } from "@/components/ui/controls";

/** タバコ：押すと時刻を残すだけ。目標や多い少ないは出さない */
export default function SmokeCard({ today }: { today: number }) {
  const { state, update } = useApp();
  const [undoAt, setUndoAt] = useState<number>();
  useEffect(() => {
    if (undoAt === undefined) return;
    const t = window.setTimeout(() => setUndoAt(undefined), 5000);
    return () => window.clearTimeout(t);
  }, [undoAt]);
  const todays = state.smokeLogs.filter((t) => t >= today && t < today + DAY_MS);
  const add = () => {
    const at = Date.now();
    // 60日より前の記録は捨てる
    update((d) => ({ ...d, smokeLogs: [...d.smokeLogs.filter((t) => t >= at - 60 * DAY_MS), at] }));
    setUndoAt(at);
  };
  const undo = () => {
    update((d) => ({ ...d, smokeLogs: d.smokeLogs.filter((t) => t !== undoAt) }));
    setUndoAt(undefined);
  };
  return (
    <Card>
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-semibold">
            タバコ
            {todays.length > 0 && <span className="ml-2 text-[13px] font-normal tabular-nums text-muted">{todays.length}本</span>}
          </p>
          {todays.length > 0 && <p className="truncate text-[12px] tabular-nums text-muted">{todays.map(formatTime).join(" ")}</p>}
        </div>
        {undoAt !== undefined ? (
          <button type="button" onClick={undo} className={`${btnSecondary} shrink-0 py-2 text-muted`}>
            取り消す
          </button>
        ) : (
          <button type="button" onClick={add} className={`${btnSecondary} shrink-0 py-2`}>
            吸った
          </button>
        )}
      </div>
    </Card>
  );
}

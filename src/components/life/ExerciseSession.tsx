"use client";

import dynamic from "next/dynamic";
import type { SessionItem } from "@/lib/life/workouts";
import { summary } from "./Controls";

const MoveDemo = dynamic(() => import("./MovementGuide").then((m) => m.MoveDemo));

/** やり方（図があれば図、手順、気をつけること） */
export function HowTo({ how, point, figure }: { how: string[]; point?: string; figure?: string }) {
  return (
    <div className="flex flex-col gap-2 pb-2">
      {figure && <MoveDemo id={figure} />}
      <ol className="list-decimal space-y-1 pl-5 text-sm">
        {how.map((h) => (
          <li key={h}>{h}</li>
        ))}
      </ol>
      {point && <p className="text-sm text-muted">{point}</p>}
    </div>
  );
}

function Check({ on }: { on: boolean }) {
  return (
    <span
      aria-hidden
      className={`flex size-7 items-center justify-center rounded-full border-2 ${on ? "border-tint bg-tint text-on-tint" : "border-line"}`}
    >
      {on && (
        <svg viewBox="0 0 16 16" width="14" height="14">
          <path d="M3 8.5l3.2 3L13 4.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </span>
  );
}

/** 今日やる種目の一覧。onToggle があれば、終わった種目に印をつけられる（印は記録の手がかりだけ。押さなくてよい） */
export function SessionList({
  items,
  checked,
  onToggle,
}: {
  items: SessionItem[];
  checked?: ReadonlySet<string>;
  onToggle?: (id: string) => void;
}) {
  return (
    <ol className="flex flex-col divide-y divide-line">
      {items.map((item, i) => (
        <li key={item.id} className="py-1">
          <div className="flex items-center gap-2">
            {onToggle ? (
              <button
                type="button"
                className="press flex size-11 shrink-0 items-center justify-center"
                aria-pressed={!!checked?.has(item.id)}
                aria-label={`${item.name}をやった`}
                onClick={() => onToggle(item.id)}
              >
                <Check on={!!checked?.has(item.id)} />
              </button>
            ) : (
              <span className="flex size-11 shrink-0 items-center justify-center text-sm text-muted tabular-nums">{i + 1}</span>
            )}
            <div className="min-w-0 flex-1">
              <div className="font-medium">{item.name}</div>
              <div className="text-sm text-muted tabular-nums">{item.dose}</div>
            </div>
          </div>
          <details className="pl-13">
            <summary className={summary + " text-tint"}>やり方</summary>
            <HowTo how={item.how} point={item.point} figure={item.figure} />
          </details>
        </li>
      ))}
    </ol>
  );
}

"use client";

import { CALENDARS, type CalendarId } from "@/lib/mock/calendars";

/** 表示するカレンダーの切り替え */
export default function CalendarToggles({
  hidden,
  onToggle,
}: {
  hidden: Set<CalendarId>;
  onToggle: (id: CalendarId) => void;
}) {
  return (
    <section className="flex flex-col gap-1.5">
      <h3 className="px-1 text-[13px] font-semibold text-muted">カレンダー</h3>
      <ul className="flex flex-col">
        {CALENDARS.map((c) => {
          const on = !hidden.has(c.id);
          return (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => onToggle(c.id)}
                className="flex w-full items-center gap-2.5 rounded-lg px-1 py-1.5 text-left text-[15px] hover:bg-surface2"
                aria-pressed={on}
              >
                <span
                  className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border-2"
                  style={{ borderColor: c.colorVar, background: on ? c.colorVar : "transparent" }}
                >
                  {on && (
                    <svg viewBox="0 0 12 12" width="10" height="10" aria-hidden>
                      <path d="M2.5 6.2 5 8.5l4.5-5" stroke="white" strokeWidth="1.8" fill="none" strokeLinecap="round" />
                    </svg>
                  )}
                </span>
                <span className={on ? "" : "text-muted"}>{c.name}</span>
              </button>
            </li>
          );
        })}
      </ul>
      <p className="mt-2 px-1 text-[12px] leading-relaxed text-muted">
        点線の枠はアプリが置いたタスク・習慣です。ドラッグで動かすと固定されます。予定を押すと、関連するタスクがまとめて強調されます。
      </p>
    </section>
  );
}

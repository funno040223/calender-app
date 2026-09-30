"use client";

import { useApp } from "@/components/app/StoreProvider";
import { CALENDARS } from "@/lib/mock/calendars";
import { Group } from "@/components/ui/controls";

/** 選べる色（iPhone の標準の色） */
export const CALENDAR_PALETTE = ["#007aff", "#5856d6", "#af52de", "#ff2d55", "#ff3b30", "#ff9500", "#ffcc00", "#34c759", "#30b0c7", "#a2845e", "#8e8e93"];

/** カレンダーごとの色。選ばなければ初期の色（ダークモードでは少し明るい色） */
export default function CalendarColors() {
  const { state, update } = useApp();
  const setColor = (id: string, color: string | undefined) =>
    update((d) => {
      const calendarColors = { ...d.calendarColors };
      if (color) calendarColors[id as keyof typeof calendarColors] = color;
      else delete calendarColors[id as keyof typeof calendarColors];
      return { ...d, calendarColors };
    });
  return (
    <Group>
      {CALENDARS.map((c) => {
        const current = state.calendarColors[c.id];
        return (
          <div key={c.id} className="flex flex-col gap-2 px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full" style={{ background: c.colorVar }} />
              <span className="flex-1 text-[16px]">{c.name}</span>
              {current && (
                <button type="button" onClick={() => setColor(c.id, undefined)} className="text-[13px] font-medium text-tint">
                  初期の色
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={`${c.name}の色`}>
              {CALENDAR_PALETTE.map((hex) => (
                <button
                  key={hex}
                  type="button"
                  role="radio"
                  aria-checked={current === hex}
                  aria-label={hex}
                  onClick={() => setColor(c.id, hex)}
                  className={`h-7 w-7 rounded-full ${current === hex ? "ring-2 ring-fg ring-offset-2 ring-offset-surface" : ""}`}
                  style={{ background: hex }}
                />
              ))}
            </div>
          </div>
        );
      })}
    </Group>
  );
}

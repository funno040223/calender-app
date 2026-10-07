import type { CalendarEvent, Place, Settings } from "./types";
import { MIN } from "./time";
import { intersect, lengthMinutes, merge } from "./intervals";
import { resolveTravel } from "./travel";

/** 1日の予定の重さ。「外出の日」「予定の多い日」はここだけで決める */
export interface DayLoad {
  /** 外出の日：家にいない時間が設定の長さ以上、または終日の予定で家にいない。自炊・洗濯を入れない */
  outing: boolean;
  /** 予定の多い日：外出の日、時刻のある予定が3つ以上、または予定が合わせて4時間以上。夜の扱い・翌日の見方に使う */
  heavy: boolean;
}

export const HEAVY_DAY_EVENTS = 3;
export const HEAVY_DAY_HOURS = 4;

/** from〜to（その日の起きている時間、なければ1日）の予定から、その日の重さを決める */
export function dayLoadOf(events: CalendarEvent[], places: Place[], s: Settings, from: number, to: number): DayLoad {
  const away = [];
  let timedCount = 0;
  let timedMs = 0;
  for (const ev of events) {
    if (ev.allDay) {
      // 帰省や旅行のあいだは家にいない
      if (ev.awayFromHome && ev.end > from && ev.start < to) away.push({ start: ev.start, end: ev.end });
      continue;
    }
    if (ev.start >= to || ev.end <= from) continue;
    timedCount++;
    timedMs += Math.min(ev.end, to) - Math.max(ev.start, from);
    const t = resolveTravel(ev, places, s);
    if (!t.atHome) away.push({ start: ev.start - t.minutes * MIN, end: ev.end + t.minutes * MIN });
  }
  const awayMinutes = intersect(merge(away), { start: from, end: to }).reduce((sum, i) => sum + lengthMinutes(i), 0);
  const outing = awayMinutes >= s.outingDayAwayMinutes;
  return { outing, heavy: outing || timedCount >= HEAVY_DAY_EVENTS || timedMs / (60 * MIN) >= HEAVY_DAY_HOURS };
}

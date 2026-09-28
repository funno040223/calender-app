import type { CalendarEvent, DayPlan, Place, Settings, WakeSource } from "./types";
import { DAY_MS, MIN, minuteOfDay } from "./time";
import { resolveTravel } from "./travel";

/** これより前に始まる予定は、その日の「最初の予定」として扱わない */
const DAY_BEGINS_AT_MINUTE = 4 * 60;

type RawWake =
  | { kind: "away"; wake: number; leave: number; first: CalendarEvent }
  | { kind: "home"; latest: number; first: CalendarEvent }
  | { kind: "none" };

function firstEventOf(dayStart: number, events: CalendarEvent[]): CalendarEvent | undefined {
  const from = dayStart + DAY_BEGINS_AT_MINUTE * MIN;
  const to = dayStart + DAY_MS;
  let first: CalendarEvent | undefined;
  for (const ev of events) {
    if (ev.allDay || ev.start < from || ev.start >= to) continue;
    if (!first || ev.start < first.start) first = ev;
  }
  return first;
}

function rawWakeOf(dayStart: number, events: CalendarEvent[], places: Place[], s: Settings): RawWake {
  const first = firstEventOf(dayStart, events);
  if (!first) return { kind: "none" };
  const travel = resolveTravel(first, places, s);
  if (travel.atHome) return { kind: "home", latest: first.start - s.homeWakeLeadMinutes * MIN, first };
  const leave = first.start - travel.minutes * MIN;
  return { kind: "away", wake: leave - (s.routineMinutes + s.prepMinutes) * MIN, leave, first };
}

function wakeTimeOf(raw: RawWake): number | undefined {
  if (raw.kind === "away") return raw.wake;
  if (raw.kind === "home") return raw.latest;
  return undefined;
}

/** 前後でいちばん近い「予定のある日」の起床時刻（0時からの分）の平均 */
function neighborMinuteOfDay(raws: RawWake[], i: number, s: Settings): number | undefined {
  const found: number[] = [];
  for (let j = i - 1; j >= 0; j--) {
    const t = wakeTimeOf(raws[j]);
    if (t !== undefined) {
      found.push(minuteOfDay(t, s.tzOffsetMinutes));
      break;
    }
  }
  for (let j = i + 1; j < raws.length; j++) {
    const t = wakeTimeOf(raws[j]);
    if (t !== undefined) {
      found.push(minuteOfDay(t, s.tzOffsetMinutes));
      break;
    }
  }
  if (found.length === 0) return undefined;
  return Math.round(found.reduce((a, b) => a + b, 0) / found.length);
}

/**
 * firstDay から count 日分の起床・就寝の時刻を計算する。
 * 最終日の就寝は翌日の予定がわからないため、同じ時刻に起きる前提で置く。
 */
export function computeDayPlans(
  firstDay: number,
  count: number,
  events: CalendarEvent[],
  places: Place[],
  s: Settings,
): DayPlan[] {
  const dayStarts = Array.from({ length: count }, (_, i) => firstDay + i * DAY_MS);
  const raws = dayStarts.map((d) => rawWakeOf(d, events, places, s));

  const wakes: { wake: number; source: WakeSource }[] = raws.map((raw, i) => {
    const dayStart = dayStarts[i];
    const neighbor = neighborMinuteOfDay(raws, i, s);
    if (raw.kind === "away") return { wake: raw.wake, source: "away" };
    if (raw.kind === "home") {
      // 在宅でも、前後の日に合わせた時刻（なければ既定の時刻）のほうが早ければそちらに起きる
      const smoothed = dayStart + (neighbor ?? s.defaultWakeMinuteOfDay) * MIN;
      if (smoothed >= raw.latest) return { wake: raw.latest, source: "home" };
      return { wake: smoothed, source: neighbor === undefined ? "default" : "neighbors" };
    }
    if (neighbor !== undefined) return { wake: dayStart + neighbor * MIN, source: "neighbors" };
    return { wake: dayStart + s.defaultWakeMinuteOfDay * MIN, source: "default" };
  });

  if (s.fixedWakeMode) {
    for (let w = 0; w < count; w += 7) {
      const week = wakes.slice(w, w + 7);
      const earliest = Math.min(...week.map((x, k) => (x.wake - dayStarts[w + k]) / MIN));
      week.forEach((x, k) => {
        const fixed = dayStarts[w + k] + earliest * MIN;
        if (fixed < x.wake) {
          x.wake = fixed;
          x.source = "fixed";
        }
      });
    }
  }

  return dayStarts.map((dayStart, i) => {
    const raw = raws[i];
    const nextWake = i + 1 < count ? wakes[i + 1].wake : wakes[i].wake + DAY_MS;
    return {
      dayStart,
      wake: wakes[i].wake,
      bed: nextWake - s.sleepMinutes * MIN,
      leave: raw.kind === "away" ? raw.leave : undefined,
      firstEvent: raw.kind === "none" ? undefined : raw.first,
      wakeSource: wakes[i].source,
    };
  });
}

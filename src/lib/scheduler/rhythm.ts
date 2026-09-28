import type { CalendarEvent, DayPlan, Place, Settings, WakeSource } from "./types";
import { DAY_MS, MIN } from "./time";
import { resolveTravel } from "./travel";

/** これより前に始まる予定は、その日の「最初の予定」として扱わない */
const DAY_BEGINS_AT_MINUTE = 4 * 60;

type RawWake =
  | { kind: "away"; required: number; leave: number; first: CalendarEvent }
  | { kind: "home"; required: number; first: CalendarEvent }
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

/** その日に遅くともこの時刻には起きていないといけない、という時刻を求める */
function rawWakeOf(dayStart: number, events: CalendarEvent[], places: Place[], s: Settings): RawWake {
  const first = firstEventOf(dayStart, events);
  if (!first) return { kind: "none" };
  const travel = resolveTravel(first, places, s);
  if (travel.atHome) return { kind: "home", required: first.start - s.homeWakeLeadMinutes * MIN, first };
  const leave = first.start - travel.minutes * MIN;
  return { kind: "away", required: leave - (s.routineMinutes + s.prepMinutes) * MIN, leave, first };
}

/**
 * 隣り合う日の起床時刻の差が maxShift 分を超えないように、早いほうへだけ寄せる。
 * 早めるだけなので、予定に間に合わなくなることはない。
 */
function limitDailyShift(minutes: number[], maxShift: number): number[] {
  const out = [...minutes];
  for (let i = 1; i < out.length; i++) out[i] = Math.min(out[i], out[i - 1] + maxShift);
  for (let i = out.length - 2; i >= 0; i--) out[i] = Math.min(out[i], out[i + 1] + maxShift);
  return out;
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

  // 0:00 からの分。予定から決まる時刻と既定の時刻の早いほうに、遅くとも起きる
  const cap = s.defaultWakeMinuteOfDay;
  const base = raws.map((raw, i) => (raw.kind === "none" ? cap : Math.min((raw.required - dayStarts[i]) / MIN, cap)));
  // 早起きの日があれば前後の日も少しずつ早め、睡眠の時刻が日によって大きくずれないようにする
  const limited = limitDailyShift(base, s.maxWakeShiftMinutesPerDay);

  const wakes: { wake: number; source: WakeSource }[] = raws.map((raw, i) => {
    const wake = dayStarts[i] + limited[i] * MIN;
    if (limited[i] < base[i]) return { wake, source: "neighbors" };
    if (raw.kind !== "none" && base[i] < cap) return { wake, source: raw.kind };
    return { wake, source: "default" };
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
    const dayEnd = dayStart + DAY_MS;
    const holiday = !events.some((ev) => !ev.play && !ev.allDay && ev.start < dayEnd && ev.end > dayStart);
    const nextWake = i + 1 < count ? wakes[i + 1].wake : wakes[i].wake + DAY_MS;
    return {
      dayStart,
      wake: wakes[i].wake,
      bed: nextWake - s.sleepMinutes * MIN,
      leave: raw.kind === "away" ? raw.leave : undefined,
      firstEvent: raw.kind === "none" ? undefined : raw.first,
      wakeSource: wakes[i].source,
      holiday,
    };
  });
}

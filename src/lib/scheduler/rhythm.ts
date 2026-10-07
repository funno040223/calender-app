import type { CalendarEvent, DayPlan, Place, Settings, WakeSource } from "./types";
import { DAY_MS, MIN, localDayStart } from "./time";
import { needsPrep, resolveTravel } from "./travel";

/** これより前に始まる予定は、その日の「最初の予定」として扱わない */
export const DAY_BEGINS_AT_MINUTE = 4 * 60;

/**
 * その時刻が、どの日（起きている時間）の分か。「今日」の区切りはここだけで決める。
 * 計画の日（起床〜就寝）の中ならその日、外なら 0:00〜4:00 は前の日の続き、それ以外は暦の日。
 * 配置と、「やった」などの記録の日付けで同じ数え方をする（0時を過ぎてやったことも、起きていた日の分になる）
 */
export function wakingDayStart(t: number, days: Pick<DayPlan, "dayStart" | "wake" | "bed">[], tzOffsetMinutes: number): number {
  return days.find((d) => t >= d.wake && t < d.bed)?.dayStart ?? localDayStart(t - DAY_BEGINS_AT_MINUTE * MIN, tzOffsetMinutes);
}

type RawWake =
  | {
      /** 起床を決める予定が、外出か在宅か */
      kind: "away" | "home";
      /** 遅くともこの時刻には起きていないといけない（その日の予定のうち、いちばん早いもの） */
      required: number;
      /** 最初の予定が外出なら、家を出る時刻 */
      leave?: number;
      first: CalendarEvent;
      /** 身支度の要る予定があるか。身支度は1日1回で、いちばん早い予定の前に置く */
      prep: boolean;
      prepAt?: number;
      prepEvent?: CalendarEvent;
      prepAway?: boolean;
    }
  | { kind: "none" };

function eventsOf(dayStart: number, events: CalendarEvent[]): CalendarEvent[] {
  const from = dayStart + DAY_BEGINS_AT_MINUTE * MIN;
  const to = dayStart + DAY_MS;
  return events.filter((ev) => !ev.allDay && ev.start >= from && ev.start < to).sort((a, b) => a.start - b.start);
}

/** その日に遅くともこの時刻には起きていないといけない、という時刻を求める */
function rawWakeOf(dayStart: number, events: CalendarEvent[], places: Place[], s: Settings): RawWake {
  const todays = eventsOf(dayStart, events);
  if (!todays.length) return { kind: "none" };
  const first = todays[0];
  let kind: "away" | "home" = "home";
  let required = Infinity;
  let leave: number | undefined;
  let prepAt: number | undefined;
  let prepEvent: CalendarEvent | undefined;
  let prepAway = false;
  for (const ev of todays) {
    const travel = resolveTravel(ev, places, s);
    let req: number;
    let prepGoal: number | undefined;
    if (travel.atHome) {
      // オンラインで顔を出す予定は、外出と同じく身支度の時間を取る
      const prep = needsPrep(ev, travel);
      const lead = prep ? s.routineMinutes + s.prepMinutes : Math.max(s.homeWakeLeadMinutes, s.routineMinutes);
      req = ev.start - lead * MIN;
      if (prep) prepGoal = ev.start;
    } else {
      const out = ev.start - travel.minutes * MIN;
      if (ev === first) leave = out;
      req = out - (s.routineMinutes + s.prepMinutes) * MIN;
      prepGoal = out;
    }
    if (req < required) {
      required = req;
      kind = travel.atHome ? "home" : "away";
    }
    if (prepGoal !== undefined && (prepAt === undefined || prepGoal < prepAt)) {
      prepAt = prepGoal;
      prepEvent = ev;
      prepAway = !travel.atHome;
    }
  }
  return { kind, required, leave, first, prep: prepAt !== undefined, prepAt, prepEvent, prepAway };
}

/** 食事などをずらさず、固定予定に間に合う最も遅い起床を求める。 */
export function latestWakeOfDay(dayStart: number, events: CalendarEvent[], places: Place[], s: Settings): number {
  return rawWakeOf(dayStart, events, places, s).kind === "none"
    ? Infinity
    : Math.min(...eventsOf(dayStart, events).map((e) => (rawWakeOf(dayStart, [e], places, s) as { required: number }).required));
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
 * 起床の差を抑える計算で、計算の範囲の外まで見る日数。
 * 範囲の頭で区切ると、早起きの翌日（範囲に入っていない日の影響）や週の途中から数え直した日で、起床が急に変わってしまう。
 * 予定だけから決める（実際の起床・就寝の記録は見ない）ので、1日だけの寝坊や夜更かしは、そのあとの日の予定の起床に響かない
 */
const RAMP_DAYS = 8;

/**
 * firstDay から count 日分の起床・就寝の時刻を計算する。
 * 前後 RAMP_DAYS 日も含めて計算してから範囲を切り出す（毎日の差の上限と、月曜始まりの週のそろえが範囲の端で途切れないように）。
 */
export function computeDayPlans(
  firstDay: number,
  count: number,
  events: CalendarEvent[],
  places: Place[],
  s: Settings,
): DayPlan[] {
  return computeRange(firstDay - RAMP_DAYS * DAY_MS, count + 2 * RAMP_DAYS, events, places, s).slice(RAMP_DAYS, RAMP_DAYS + count);
}

function computeRange(
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
    // 月曜始まりの週ごとに、いちばん早い起床にそろえる
    const weekOf = (dayStart: number) => Math.floor((dayStart + s.tzOffsetMinutes * MIN) / DAY_MS + 3) / 7;
    for (let w = 0; w < count; ) {
      let end = w + 1;
      while (end < count && Math.floor(weekOf(dayStarts[end])) === Math.floor(weekOf(dayStarts[w]))) end++;
      const week = wakes.slice(w, end);
      const earliest = Math.min(...week.map((x, k) => (x.wake - dayStarts[w + k]) / MIN));
      week.forEach((x, k) => {
        const fixed = dayStarts[w + k] + earliest * MIN;
        if (fixed < x.wake) {
          x.wake = fixed;
          x.source = "fixed";
        }
      });
      w = end;
    }
  }

  return dayStarts.map((dayStart, i) => {
    const raw = raws[i];
    const dayEnd = dayStart + DAY_MS;
    // 前の晩から0時を少し過ぎるだけの予定では、休日でなくしない
    // 帰省や旅行など、終日の予定で家にいない日も、休日にはしない（休日だけの楽しみが出ないように）
    const holiday =
      !events.some((ev) => !ev.play && !ev.allDay && ev.start < dayEnd && ev.end > dayStart + DAY_BEGINS_AT_MINUTE * MIN) &&
      !events.some((ev) => ev.allDay && ev.awayFromHome && ev.start < dayEnd && ev.end > dayStart);
    const nextWake = i + 1 < count ? wakes[i + 1].wake : wakes[i].wake + DAY_MS;
    return {
      dayStart,
      wake: wakes[i].wake,
      bed: nextWake - s.sleepMinutes * MIN,
      leave: raw.kind === "none" ? undefined : raw.leave,
      firstEvent: raw.kind === "none" ? undefined : raw.first,
      wakeSource: wakes[i].source,
      holiday,
      prep: raw.kind !== "none" && raw.prep,
      ...(raw.kind !== "none" && raw.prepAt !== undefined ? { prepAt: raw.prepAt, prepEvent: raw.prepEvent, prepAway: raw.prepAway } : {}),
    };
  });
}

import ICAL from "ical.js";
import type { CalendarEvent } from "@/lib/scheduler";

const MIN = 60_000;
/** 1つの繰り返しの予定を展開する回数の上限（壊れたデータで止まらなくならないように） */
const MAX_OCCURRENCES = 20_000;

export interface IcsRange {
  from: number;
  to: number;
}

type ICALTime = InstanceType<typeof ICAL.Time>;
type ICALEvent = InstanceType<typeof ICAL.Event>;

/**
 * iCal の時刻を epoch ミリ秒にする。
 * 終日（日付だけ）とタイムゾーンのない時刻は、ローカル時刻（tzOffsetMinutes）の壁時計として読む。
 */
function toMs(t: ICALTime, tzOffsetMinutes: number): number {
  const offset = tzOffsetMinutes * MIN;
  if (t.isDate) return Date.UTC(t.year, t.month - 1, t.day) - offset;
  if (t.zone === ICAL.Timezone.localTimezone) {
    return Date.UTC(t.year, t.month - 1, t.day, t.hour, t.minute, t.second) - offset;
  }
  return t.toUnixTime() * 1000;
}

function toEvent(item: ICALEvent, start: ICALTime, end: ICALTime, id: string, tz: number): CalendarEvent {
  return {
    id,
    title: item.summary || "（タイトルなし）",
    start: toMs(start, tz),
    end: toMs(end, tz),
    allDay: start.isDate || undefined,
    location: item.location || undefined,
    description: item.description || undefined,
  };
}

const isCancelled = (e: ICALEvent) => String(e.component.getFirstPropertyValue("status") ?? "").toUpperCase() === "CANCELLED";

/**
 * Google カレンダーなどの iCal テキストから、range と重なる予定を取り出す。
 * 繰り返しの予定は1回ずつに展開し、除外日（EXDATE）と個別に変更した回（RECURRENCE-ID）を反映する。
 */
export function parseIcs(text: string, range: IcsRange, tzOffsetMinutes = 540, idPrefix = "ical"): CalendarEvent[] {
  const root = ICAL.Component.fromString(text);
  for (const tz of root.getAllSubcomponents("vtimezone")) ICAL.TimezoneService.register(tz);

  const masters: ICALEvent[] = [];
  const exceptions: ICALEvent[] = [];
  for (const v of root.getAllSubcomponents("vevent")) {
    const ev = new ICAL.Event(v);
    (ev.isRecurrenceException() ? exceptions : masters).push(ev);
  }
  // 個別に変更した回は、元の繰り返しの予定にひも付ける
  const orphans: ICALEvent[] = [];
  for (const ex of exceptions) {
    const master = masters.find((m) => m.uid === ex.uid && m.isRecurring());
    if (master) master.relateException(ex);
    else orphans.push(ex);
  }

  const out: CalendarEvent[] = [];
  const overlaps = (e: CalendarEvent) => e.end > range.from && e.start < range.to;

  for (const ev of [...masters, ...orphans]) {
    if (!ev.isRecurring()) {
      if (isCancelled(ev)) continue;
      const e = toEvent(ev, ev.startDate, ev.endDate, `${idPrefix}-${ev.uid}`, tzOffsetMinutes);
      if (overlaps(e)) out.push(e);
      continue;
    }
    const it = ev.iterator();
    for (let n = 0, t = it.next(); t && n < MAX_OCCURRENCES; t = it.next(), n++) {
      if (toMs(t, tzOffsetMinutes) >= range.to) break;
      const d = ev.getOccurrenceDetails(t);
      if (isCancelled(d.item)) continue;
      const e = toEvent(d.item, d.startDate, d.endDate, `${idPrefix}-${ev.uid}-${toMs(t, tzOffsetMinutes)}`, tzOffsetMinutes);
      if (overlaps(e)) out.push(e);
    }
    // 範囲より後の回を、範囲の中へ移したもの（元の日時が範囲より後）も入れる
    for (const ex of exceptions) {
      if (ex.uid !== ev.uid || !ex.recurrenceId || isCancelled(ex)) continue;
      const original = toMs(ex.recurrenceId, tzOffsetMinutes);
      if (original < range.to) continue;
      const e = toEvent(ex, ex.startDate, ex.endDate, `${idPrefix}-${ev.uid}-${original}`, tzOffsetMinutes);
      if (overlaps(e)) out.push(e);
    }
  }
  return out.sort((a, b) => a.start - b.start);
}

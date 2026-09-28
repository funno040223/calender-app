import ICAL from "ical.js";

const MIN = 60_000;

export interface ExportEvent {
  /** 配信のたびに変わらない ID。購読側はこれで同じ予定かを判断する */
  uid: string;
  title: string;
  start: number;
  end: number;
  allDay?: boolean;
  location?: string;
  description?: string;
}

function dateOnly(ms: number, tzOffsetMinutes: number) {
  const d = new Date(ms + tzOffsetMinutes * MIN);
  return ICAL.Time.fromData({ year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate(), isDate: true });
}

/**
 * アプリの予定を iCal 形式にする（iOS のカレンダーなどから読み取り専用で購読する用）。
 * 時刻は UTC で書き、終日の予定だけローカルの日付で書く。
 */
export function buildIcs(events: ExportEvent[], calendarName: string, now: number, tzOffsetMinutes = 540): string {
  const cal = new ICAL.Component(["vcalendar", [], []]);
  cal.updatePropertyWithValue("prodid", "-//task-rhythm-app//JA");
  cal.updatePropertyWithValue("version", "2.0");
  cal.updatePropertyWithValue("calscale", "GREGORIAN");
  cal.updatePropertyWithValue("x-wr-calname", calendarName);
  const stamp = ICAL.Time.fromJSDate(new Date(now), true);

  for (const e of events) {
    const v = new ICAL.Component("vevent");
    const ev = new ICAL.Event(v);
    ev.uid = e.uid;
    ev.summary = e.title;
    ev.startDate = e.allDay ? dateOnly(e.start, tzOffsetMinutes) : ICAL.Time.fromJSDate(new Date(e.start), true);
    ev.endDate = e.allDay ? dateOnly(e.end, tzOffsetMinutes) : ICAL.Time.fromJSDate(new Date(e.end), true);
    if (e.location) ev.location = e.location;
    if (e.description) ev.description = e.description;
    v.updatePropertyWithValue("dtstamp", stamp);
    cal.addSubcomponent(v);
  }
  return cal.toString();
}

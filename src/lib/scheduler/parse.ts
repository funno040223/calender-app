import { DAY_MS, MIN, localDayStart, localWeekday } from "./time";

export interface ParsedTask {
  title: string;
  /** その日の終わり（翌日 0:00）までに終える */
  deadline?: number;
  durationMinutes?: number;
  priority?: 1 | 2 | 3;
}

const WEEKDAYS = "日月火水木金土";
const UNTIL = "(?:まで(?:に)?)?";

function toHalfWidthDigits(s: string): string {
  return s.replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0)).replace(/／/g, "/");
}

/** クイック追加の文から、締切・所要時間・優先度を決まった言い方だけ読み取る */
export function parseQuickAdd(text: string, now: number, tzOffsetMinutes: number): ParsedTask {
  let rest = toHalfWidthDigits(text);
  const take = (re: RegExp): RegExpMatchArray | null => {
    const m = rest.match(re);
    if (m) rest = rest.replace(m[0], " ");
    return m;
  };

  const today = localDayStart(now, tzOffsetMinutes);
  const endOfDay = (offsetDays: number) => today + (offsetDays + 1) * DAY_MS;
  const weekday = localWeekday(now, tzOffsetMinutes);

  let durationMinutes: number | undefined;
  let m = take(/(\d+(?:\.\d+)?)\s*時間\s*(\d+)\s*分/);
  if (m) durationMinutes = Math.round(Number(m[1]) * 60) + Number(m[2]);
  else if ((m = take(/(\d+(?:\.\d+)?)\s*時間(半)?/))) durationMinutes = Math.round(Number(m[1]) * 60) + (m[2] ? 30 : 0);
  else if ((m = take(/(\d+)\s*分/))) durationMinutes = Number(m[1]);
  if (durationMinutes !== undefined) take(/くらい|ぐらい|程度|ほど/);

  let deadline: number | undefined;
  if ((m = take(new RegExp(`(\\d{1,2})[/月](\\d{1,2})日?${UNTIL}`)))) {
    const offset = tzOffsetMinutes * MIN;
    const year = new Date(now + offset).getUTCFullYear();
    let dayStart = Date.UTC(year, Number(m[1]) - 1, Number(m[2])) - offset;
    if (dayStart < today) dayStart = Date.UTC(year + 1, Number(m[1]) - 1, Number(m[2])) - offset;
    deadline = dayStart + DAY_MS;
  } else if (take(new RegExp(`(?:明後日|あさって)${UNTIL}`))) deadline = endOfDay(2);
  else if (take(new RegExp(`(?:明日|あした)${UNTIL}`))) deadline = endOfDay(1);
  else if (take(new RegExp(`(?:今日|きょう)(?:中)?${UNTIL}`))) deadline = endOfDay(0);
  else if ((m = take(new RegExp(`(来週の?)?([${WEEKDAYS}])曜日?${UNTIL}`)))) {
    const target = WEEKDAYS.indexOf(m[2]);
    // アプリの週表示と同じ月曜始まり。次の曜日にさらに7日を足すと、金曜→来週月曜が再来週になる。
    const diff = m[1]
      ? 7 - ((weekday + 6) % 7) + ((target + 6) % 7)
      : (target - weekday + 7) % 7;
    deadline = endOfDay(diff);
  } else if (take(new RegExp(`来週(?:中)?${UNTIL}`))) deadline = endOfDay(((7 - weekday) % 7) + 7);
  else if (take(new RegExp(`今週(?:中)?${UNTIL}`))) deadline = endOfDay((7 - weekday) % 7);

  let priority: ParsedTask["priority"];
  if (take(/大至急|至急|急ぎ|重要|大事|[!！]+/)) priority = 3;
  else if (take(/いつでも|暇なとき|余裕があれば/)) priority = 1;

  const title =
    rest
      .replace(/\s+/g, " ")
      .replace(/^[、。,，\s]+|[、。,，\s]+$/g, "")
      .replace(/^(に|を)\s*/, "")
      .trim() || text.trim();

  return { title, deadline, durationMinutes, priority };
}

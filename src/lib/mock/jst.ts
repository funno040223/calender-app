import { DAY_MS, MIN, localDayStart, localWeekday } from "@/lib/scheduler/time";
import { DEFAULT_SETTINGS } from "@/lib/scheduler";

/** 画面はいつも日本時間で表示する（端末のタイムゾーンに左右されない） */
export const TZ = DEFAULT_SETTINGS.tzOffsetMinutes;
const OFFSET = TZ * MIN;

export { DAY_MS, MIN };

export const dayStartOf = (ms: number) => localDayStart(ms, TZ);
/** 0 = 日曜 */
export const weekdayOf = (ms: number) => localWeekday(ms, TZ);

/**
 * FullCalendar は timeZone: "UTC" で動かし、日本時間の壁時計の値を UTC として渡す。
 * こうすると端末の設定に関係なく、日本時間の目盛りで表示される。
 */
export const toFc = (ms: number) => new Date(ms + OFFSET);
export const fromFc = (d: Date) => d.getTime() - OFFSET;

const pad = (n: number) => String(n).padStart(2, "0");
const parts = (ms: number) => {
  const d = new Date(ms + OFFSET);
  return {
    y: d.getUTCFullYear(),
    mo: d.getUTCMonth() + 1,
    d: d.getUTCDate(),
    h: d.getUTCHours(),
    mi: d.getUTCMinutes(),
    wd: d.getUTCDay(),
  };
};

export const WEEKDAY_JA = "日月火水木金土";

/** 日本時間の年月日時分 → epoch ミリ秒 */
export const jstTime = (y: number, mo: number, d: number, h = 0, mi = 0) => Date.UTC(y, mo - 1, d, h, mi) - OFFSET;

/** <input type="datetime-local"> 用 */
export function toInputDateTime(ms: number): string {
  const p = parts(ms);
  return `${p.y}-${pad(p.mo)}-${pad(p.d)}T${pad(p.h)}:${pad(p.mi)}`;
}
export function toInputDate(ms: number): string {
  return toInputDateTime(ms).slice(0, 10);
}
export function fromInputDateTime(s: string): number | undefined {
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/);
  if (!m) return undefined;
  return jstTime(Number(m[1]), Number(m[2]), Number(m[3]), Number(m[4] ?? 0), Number(m[5] ?? 0));
}

export function formatTime(ms: number): string {
  const p = parts(ms);
  return `${p.h}:${pad(p.mi)}`;
}
export function formatDate(ms: number): string {
  const p = parts(ms);
  return `${p.mo}/${p.d}(${WEEKDAY_JA[p.wd]})`;
}
export function formatDateTime(ms: number): string {
  return `${formatDate(ms)} ${formatTime(ms)}`;
}
/** 締切（その日の終わり＝翌日 0:00）を「9/29(火)まで」のように表す */
export function formatDeadline(ms: number): string {
  const p = parts(ms);
  if (p.h === 0 && p.mi === 0) return `${formatDate(ms - 1)}まで`;
  return `${formatDateTime(ms)}まで`;
}
export function formatMinutes(min: number): string {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  if (h === 0) return `${m}分`;
  return m === 0 ? `${h}時間` : `${h}時間${m}分`;
}

export function newId(prefix: string): string {
  const rand =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return `${prefix}-${Date.now().toString(36)}-${rand}`;
}

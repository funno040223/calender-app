export const MIN = 60_000;
export const DAY_MS = 24 * 60 * MIN;

/** ms を含むローカル日付の 0:00 を epoch ミリ秒で返す */
export function localDayStart(ms: number, tzOffsetMinutes: number): number {
  const offset = tzOffsetMinutes * MIN;
  return Math.floor((ms + offset) / DAY_MS) * DAY_MS - offset;
}

/** ローカル時刻での 0:00 からの分 */
export function minuteOfDay(ms: number, tzOffsetMinutes: number): number {
  return Math.round((ms - localDayStart(ms, tzOffsetMinutes)) / MIN);
}

/** 0 = 日曜 */
export function localWeekday(ms: number, tzOffsetMinutes: number): number {
  return new Date(ms + tzOffsetMinutes * MIN).getUTCDay();
}

/** step 分の区切りに切り上げる（日本時間はずれが15分の倍数なので、epoch 基準で揃う） */
export function ceilToStep(ms: number, stepMinutes = 15): number {
  const step = stepMinutes * MIN;
  return Math.ceil(ms / step) * step;
}

export function floorToStep(ms: number, stepMinutes = 15): number {
  const step = stepMinutes * MIN;
  return Math.floor(ms / step) * step;
}

export function floorMinutesToStep(minutes: number, stepMinutes = 15): number {
  return Math.floor(minutes / stepMinutes) * stepMinutes;
}

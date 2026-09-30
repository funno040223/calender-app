import type { DayPlan, RhythmReset, Settings } from "./types";
import { DAY_MS, MIN } from "./time";

/** 実際の起床を出発点にする。翌日も睡眠枠が足りなければ起床を後ろへ送る。 */
export function applyRhythmResets(days: DayPlan[], resets: RhythmReset[], settings: Settings, latestWake: (dayStart: number) => number = () => Infinity): Map<number, number> {
  const shifts = new Map<number, number>();
  for (let i = 0; i < days.length; i++) {
    const d = days[i];
    const original = d.wake;
    const sleep = resets.filter((r) => r.mode !== "tired" && r.end >= d.dayStart && r.end < d.dayStart + DAY_MS).sort((a, b) => b.end - a.end)[0];
    if (sleep) d.wake = sleep.end;
    else if (i > 0 && shifts.has(days[i - 1].dayStart)) d.wake = Math.min(latestWake(d.dayStart), Math.max(d.wake, days[i - 1].bed + settings.sleepMinutes * MIN));
    if (sleep || d.wake !== original) {
      shifts.set(d.dayStart, d.wake - original);
      // 起きた直後が就寝時刻になる破綻を避ける。元の就寝へ戻せる日は戻す。
      d.bed = Math.max(d.bed, d.wake + (settings.routineMinutes + settings.windDownMinutes + 60) * MIN);
    }
  }
  return shifts;
}

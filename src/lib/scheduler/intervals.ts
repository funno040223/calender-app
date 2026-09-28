import type { Interval } from "./types";
import { MIN } from "./time";

export function lengthMinutes(i: Interval): number {
  return (i.end - i.start) / MIN;
}

export function merge(intervals: Interval[]): Interval[] {
  const sorted = intervals.filter((i) => i.end > i.start).sort((a, b) => a.start - b.start);
  const out: Interval[] = [];
  for (const i of sorted) {
    const last = out.at(-1);
    if (last && i.start <= last.end) last.end = Math.max(last.end, i.end);
    else out.push({ ...i });
  }
  return out;
}

/** free から busy と重なる部分を取り除く */
export function subtract(free: Interval[], busy: Interval[]): Interval[] {
  const cuts = merge(busy);
  const out: Interval[] = [];
  for (const f of free) {
    let cur = f.start;
    for (const b of cuts) {
      if (b.end <= cur) continue;
      if (b.start >= f.end) break;
      if (b.start > cur) out.push({ start: cur, end: b.start });
      cur = Math.max(cur, b.end);
      if (cur >= f.end) break;
    }
    if (cur < f.end) out.push({ start: cur, end: f.end });
  }
  return out;
}

export function intersect(free: Interval[], window: Interval): Interval[] {
  return free
    .map((f) => ({ start: Math.max(f.start, window.start), end: Math.min(f.end, window.end) }))
    .filter((i) => i.end > i.start);
}

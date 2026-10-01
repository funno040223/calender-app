import { resolveTravel, type Block, type CalendarEvent, type Task } from "@/lib/scheduler";
import { merge, subtract } from "@/lib/scheduler/intervals";
import type { CalendarId } from "./calendars";
import type { MockState } from "./store";
import { planEvents } from "./state";
import { MIN, formatDate, formatTime } from "./jst";

/** 予定の出どころ。own は自分で入れた予定（編集できる） */
export type EventSource = "own" | "class" | "google";

export interface EventRef {
  event: CalendarEvent;
  source: EventSource;
  calendarId: CalendarId;
  /** 任意参加の授業で、参加しない回（組み立てでは空き時間として扱う） */
  skipped?: boolean;
}

export function allEventRefs(state: Pick<MockState, "events" | "classEvents" | "googleEvents">): EventRef[] {
  return [
    ...state.events.map((e) => ({ event: e as CalendarEvent, source: "own" as const, calendarId: (e.calendarId ?? "own") as CalendarId })),
    ...state.classEvents.map((e) => ({
      event: e as CalendarEvent,
      source: "class" as const,
      calendarId: "class" as const,
      ...(e.attending ? {} : { skipped: true }),
    })),
    ...state.googleEvents.map((e) => ({ event: e, source: "google" as const, calendarId: "google" as const })),
  ];
}

export function eventIndex(state: Pick<MockState, "events" | "classEvents" | "googleEvents">): Map<string, EventRef> {
  return new Map(allEventRefs(state).map((r) => [r.event.id, r]));
}

/** 予定ごとの関連するタスク（予定が見つからないタスクは含めない） */
export function tasksByEvent(tasks: Task[], events: Map<string, EventRef>): Map<string, Task[]> {
  const out = new Map<string, Task[]>();
  for (const t of tasks) {
    if (!t.relatedEventId || !events.has(t.relatedEventId)) continue;
    const list = out.get(t.relatedEventId) ?? [];
    list.push(t);
    out.set(t.relatedEventId, list);
  }
  return out;
}

export function blocksOfTask(blocks: Block[], taskId: string): Block[] {
  return blocks.filter((b) => b.kind === "task" && b.refId === taskId);
}

/** 「10/4(日) 15:00」（終日なら日付だけ） */
export function formatEventWhen(ev: CalendarEvent): string {
  return ev.allDay ? `${formatDate(ev.start)}（終日）` : `${formatDate(ev.start)} ${formatTime(ev.start)}`;
}

/** 関連する予定でまとめて強調するときの印 */
export const groupKeyOf = (eventId: string) => `ev:${eventId}`;

/** カレンダーの枠に出す短い形「面接 10/4 15:00」 */
export function formatEventShort(ev: CalendarEvent): string {
  const d = formatDate(ev.start).replace(/\(.\)$/, "");
  return ev.allDay ? `${ev.title} ${d}` : `${ev.title} ${d} ${formatTime(ev.start)}`;
}

/** 移動の時間：その帯と、行き先の予定 */
export interface TravelBand {
  start: number;
  end: number;
  /** 帯を押したときに開く予定（行きは行き先、帰りは出てきた予定） */
  ref: EventRef;
}

/**
 * 外出する予定の前後の移動。配置と同じく、予定の開始の前と終わりのあとに片道ずつ取る。
 * 予定の最中には描かず、続く予定の間で重なる移動は1つにまとめる。見えている予定（show が true）の分だけ
 */
export function travelBands(
  state: Pick<MockState, "events" | "classEvents" | "googleEvents" | "importedTravel" | "places" | "settings">,
  show: (ref: EventRef) => boolean = () => true,
): TravelBand[] {
  const index = eventIndex(state);
  const events = planEvents(state, state.classEvents, state.googleEvents).filter((e) => !e.allDay);
  const legs: TravelBand[] = [];
  for (const e of events) {
    const ref = index.get(e.id);
    if (!ref || ref.skipped || !show(ref)) continue;
    const t = resolveTravel(e, state.places, state.settings);
    if (t.atHome || t.minutes <= 0) continue;
    legs.push({ start: e.start - t.minutes * MIN, end: e.start, ref }, { start: e.end, end: e.end + t.minutes * MIN, ref });
  }
  const during = events.map((e) => ({ start: e.start, end: e.end }));
  return merge(subtract(merge(legs), during)).map((band) => ({
    ...band,
    ref: legs.find((l) => l.start < band.end && l.end > band.start)!.ref,
  }));
}

import type { Block, CalendarEvent, Task } from "@/lib/scheduler";
import type { CalendarId } from "./calendars";
import type { MockState } from "./store";
import { formatDate, formatTime } from "./jst";

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

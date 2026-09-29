"use client";

import { useMemo, type Ref } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin, { type DateClickArg, type EventResizeDoneArg } from "@fullcalendar/interaction";
import jaLocale from "@fullcalendar/core/locales/ja";
import type {
  DatesSetArg,
  DateSelectArg,
  DayHeaderContentArg,
  EventClickArg,
  EventContentArg,
  EventDropArg,
  EventHoveringArg,
  EventInput,
  EventMountArg,
} from "@fullcalendar/core";
import type { Block, CalendarEvent } from "@/lib/scheduler";
import type { CalendarId } from "@/lib/mock/calendars";
import type { MockState } from "@/lib/mock/store";
import { DAY_MS, MIN, WEEKDAY_JA, formatTime, fromFc, toFc } from "@/lib/mock/jst";
import { allEventRefs, eventIndex, formatEventShort, groupKeyOf, tasksByEvent, type EventRef, type EventSource } from "@/lib/mock/related";
import { LinkIcon } from "@/components/app/icons";
import { SMOKE_CUTOFF_MINUTES } from "@/lib/notify/build";

export type { EventSource };

type Extended = (
  | { type: "event"; source: EventSource; eventId: string; location?: string; relatedCount?: number }
  | { type: "block"; block: Block; relatedLabel?: string }
  | { type: "sleep" }
) & {
  /** 関連する予定とタスクのまとまり。強調するときに使う */
  group?: string;
};

export interface CalendarViewProps {
  state: MockState;
  hidden: Set<CalendarId>;
  initialView: string;
  onDatesSet: (arg: DatesSetArg) => void;
  onCreate: (start: number, end: number, allDay: boolean) => void;
  onEventClick: (source: EventSource, eventId: string) => void;
  onOwnEventChange: (id: string, start: number, end: number, allDay: boolean) => void;
  onBlockClick: (block: Block) => void;
  onBlockChange: (block: Block, start: number, end: number) => void;
  /** 何もないところを押したとき。true を返したら新規作成しない */
  onEmptyClick: () => boolean;
  onHoverGroup: (group: string | undefined) => void;
  ref?: Ref<FullCalendar>;
}

const BLOCK_CAL: Record<Block["kind"], CalendarId> = { task: "task", habit: "habit", routine: "routine" };

function eventToInput({ event: ev, source, calendarId, skipped }: EventRef, relatedCount: number): EventInput {
  const own = source === "own";
  return {
    id: `${source}:${ev.id}`,
    title: ev.title,
    start: toFc(ev.start),
    end: toFc(ev.end),
    allDay: !!ev.allDay,
    editable: own,
    classNames: ["ev", `cal-${calendarId}`, own ? "" : "is-readonly", skipped ? "is-optional" : ""],
    extendedProps: {
      type: "event",
      source,
      eventId: ev.id,
      location: ev.location,
      ...(relatedCount > 0 ? { relatedCount, group: groupKeyOf(ev.id) } : {}),
    } satisfies Extended,
  };
}

function RelatedBadge({ n }: { n: number }) {
  return (
    <span className="ev-link" aria-label={`関連するタスク${n}件`}>
      <LinkIcon />
      {n}
    </span>
  );
}

function PinIcon() {
  return (
    <svg className="ev-pin" viewBox="0 0 16 16" width="10" height="10" aria-label="固定" role="img">
      <path
        fill="currentColor"
        d="M10.5 1.5 14.5 5.5l-1.4 1.4-.7-.7-2.6 2.6.3 2.9-1.4 1.4L6 10.4l-3.3 3.3-.7-.7L5.3 9.7 2.6 7l1.4-1.4 2.9.3 2.6-2.6-.7-.7z"
      />
    </svg>
  );
}

function renderEventContent(arg: EventContentArg) {
  const ext = arg.event.extendedProps as Extended;
  if (ext.type === "sleep") {
    return <div className="sleep-label">{arg.event.title}</div>;
  }
  const pinned = ext.type === "block" && ext.block.pinned;
  const related = ext.type === "event" && ext.relatedCount ? <RelatedBadge n={ext.relatedCount} /> : null;
  const isMonthDot = arg.view.type === "dayGridMonth" && !arg.event.allDay;
  if (isMonthDot) {
    return (
      <div className="ev-dot-row">
        <span className="ev-dot" />
        <span className="ev-title">{arg.event.title}</span>
        {pinned && <PinIcon />}
        {related}
        <span className="ev-dot-time">{arg.timeText}</span>
      </div>
    );
  }
  return (
    <div className="ev-inner">
      <div className="ev-title">
        {pinned && <PinIcon />}
        {arg.event.title}
        {related}
      </div>
      {ext.type === "block" && ext.relatedLabel && <div className="ev-rel">→ {ext.relatedLabel}</div>}
      {!arg.event.allDay && arg.timeText && <div className="ev-time">{arg.timeText}</div>}
      {ext.type === "event" && ext.location && !arg.event.allDay && <div className="ev-loc">{ext.location}</div>}
    </div>
  );
}

function renderDayHeader(arg: DayHeaderContentArg) {
  const wd = WEEKDAY_JA[arg.date.getUTCDay()];
  if (arg.view.type === "dayGridMonth") return <span className="dh-wd">{wd}</span>;
  return (
    <div className="dh">
      <span className="dh-wd">{wd}</span>
      <span className={`dh-num${arg.isToday ? " is-today" : ""}`}>{arg.date.getUTCDate()}</span>
    </div>
  );
}

export default function CalendarView(props: CalendarViewProps) {
  const { state, hidden, ref } = props;

  const events = useMemo(() => {
    const out: EventInput[] = [];
    const index = eventIndex(state);
    const related = tasksByEvent(state.tasks, index);
    for (const ref of allEventRefs(state)) {
      if (!hidden.has(ref.calendarId)) out.push(eventToInput(ref, related.get(ref.event.id)?.length ?? 0));
    }

    const relatedOfTask = new Map<string, EventRef>();
    for (const t of state.tasks) {
      const ref = t.relatedEventId ? index.get(t.relatedEventId) : undefined;
      if (ref) relatedOfTask.set(t.id, ref);
    }

    for (const b of state.result.blocks) {
      const cal = BLOCK_CAL[b.kind];
      if (hidden.has(cal)) continue;
      const rel = b.kind === "task" ? relatedOfTask.get(b.refId) : undefined;
      const relEvent: CalendarEvent | undefined = rel?.event;
      out.push({
        id: `block:${b.kind}:${b.refId}:${b.start}`,
        title: b.title,
        start: toFc(b.start),
        end: toFc(b.end),
        allDay: false,
        // 朝ルーティンは起床時刻から決まるので動かせない
        editable: b.kind !== "routine",
        classNames: ["ev", `cal-${cal}`, "is-block", b.pinned ? "is-pinned" : "", rel ? `rel-${rel.calendarId}` : ""],
        extendedProps: {
          type: "block",
          block: b,
          ...(relEvent ? { relatedLabel: formatEventShort(relEvent), group: groupKeyOf(relEvent.id) } : {}),
        } satisfies Extended,
      });
    }

    // 睡眠（その日の就寝 → 翌日の起床）
    const days = state.result.dayPlans;
    const sleep = state.settings.sleepMinutes * MIN;
    if (days.length > 0) {
      const bands = [{ start: days[0].wake - sleep, end: days[0].wake }];
      days.forEach((d, i) => bands.push({ start: d.bed, end: days[i + 1]?.wake ?? d.bed + sleep }));
      for (const band of bands) {
        out.push({
          id: `sleep:${band.start}`,
          title: `睡眠 ${formatTime(band.start)}〜${formatTime(band.end)}`,
          start: toFc(band.start),
          end: toFc(band.end),
          display: "background",
          classNames: ["sleep-band"],
          extendedProps: { type: "sleep" } satisfies Extended,
        });
      }
      // 就寝の3時間前から：タバコを控える時間
      for (const d of days) {
        const from = d.bed - SMOKE_CUTOFF_MINUTES * MIN;
        out.push({
          id: `nosmoke:${d.dayStart}`,
          title: `${formatTime(from)}〜 タバコはここまで`,
          start: toFc(from),
          end: toFc(d.bed),
          display: "background",
          classNames: ["nosmoke-band"],
          extendedProps: { type: "sleep" } satisfies Extended,
        });
      }
    }
    return out;
  }, [state, hidden]);

  const handleSelect = (arg: DateSelectArg) => {
    arg.view.calendar.unselect();
    props.onCreate(fromFc(arg.start), fromFc(arg.end), arg.allDay);
  };

  const handleDateClick = (arg: DateClickArg) => {
    if (props.onEmptyClick()) return;
    const start = fromFc(arg.date);
    if (arg.allDay) props.onCreate(start, start + DAY_MS, true);
    else props.onCreate(start, start + 60 * MIN, false);
  };

  const handleClick = (arg: EventClickArg) => {
    const ext = arg.event.extendedProps as Extended;
    if (ext.type === "event") props.onEventClick(ext.source, ext.eventId);
    else if (ext.type === "block") props.onBlockClick(ext.block);
  };

  const handleChange = (arg: EventDropArg | EventResizeDoneArg) => {
    const ext = arg.event.extendedProps as Extended;
    const ev = arg.event;
    if (!ev.start) return arg.revert();
    const start = fromFc(ev.start);
    if (ext.type === "event" && ext.source === "own") {
      const end = ev.end ? fromFc(ev.end) : start + (ev.allDay ? DAY_MS : 60 * MIN);
      props.onOwnEventChange(ext.eventId, start, end, ev.allDay);
    } else if (ext.type === "block") {
      // タスクや習慣の枠は終日には置けない
      if (ev.allDay) return arg.revert();
      const end = ev.end ? fromFc(ev.end) : start + (ext.block.end - ext.block.start);
      props.onBlockChange(ext.block, start, end);
    } else {
      arg.revert();
    }
  };

  const handleMount = (arg: EventMountArg) => {
    const g = (arg.event.extendedProps as Extended).group;
    if (g) arg.el.dataset.g = g;
  };
  const handleEnter = (arg: EventHoveringArg) => {
    const g = (arg.event.extendedProps as Extended).group;
    if (g) props.onHoverGroup(g);
  };
  const handleLeave = () => props.onHoverGroup(undefined);

  const nowFc = toFc(Date.now());
  const scrollTime = `${String(Math.max(0, nowFc.getUTCHours() - 1)).padStart(2, "0")}:00:00`;

  return (
    <FullCalendar
      ref={ref}
      plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
      locale={jaLocale}
      timeZone="UTC"
      now={() => toFc(Date.now())}
      firstDay={1}
      initialView={props.initialView}
      views={{ timeGrid3Day: { type: "timeGrid", duration: { days: 3 } } }}
      headerToolbar={false}
      height="100%"
      events={events}
      eventContent={renderEventContent}
      dayHeaderContent={renderDayHeader}
      // 月表示の日付は「1日」ではなく「1」だけにする（時間表示の終日欄には何も出さない）
      dayCellContent={(arg) => arg.dayNumberText.replace("日", "")}
      datesSet={props.onDatesSet}
      nowIndicator
      selectable
      selectMirror
      selectMinDistance={5}
      selectLongPressDelay={350}
      eventLongPressDelay={350}
      editable
      eventResizableFromStart
      snapDuration="00:15:00"
      slotDuration="00:30:00"
      slotLabelInterval="01:00"
      slotLabelFormat={{ hour: "numeric", minute: "2-digit", hour12: false }}
      eventTimeFormat={{ hour: "numeric", minute: "2-digit", hour12: false }}
      scrollTime={scrollTime}
      scrollTimeReset={false}
      allDayText="終日"
      dayMaxEvents
      fixedWeekCount={false}
      expandRows={false}
      select={handleSelect}
      dateClick={handleDateClick}
      eventClick={handleClick}
      eventDrop={handleChange}
      eventResize={handleChange}
      eventDidMount={handleMount}
      eventMouseEnter={handleEnter}
      eventMouseLeave={handleLeave}
    />
  );
}

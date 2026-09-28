"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import type FullCalendar from "@fullcalendar/react";
import type { DatesSetArg } from "@fullcalendar/core";
import type { Block } from "@/lib/scheduler";
import { sameBlock, type OwnEvent } from "@/lib/mock/store";
import type { CalendarId } from "@/lib/mock/calendars";
import { useApp } from "@/components/app/StoreProvider";
import { eventIndex, formatEventShort, groupKeyOf, tasksByEvent } from "@/lib/mock/related";
import { parseClassEventId } from "@/lib/mock/model";
import { formatDate } from "@/lib/mock/jst";
import CalendarView, { type EventSource } from "./CalendarView";
import CalendarToggles from "./CalendarToggles";
import EventForm from "./EventForm";
import { BlockSheet, ReadonlyEventSheet, RelatedTasks } from "./InfoSheet";
import Sheet from "@/components/ui/Sheet";

// 1日だけの表示は横長で見にくいので、最小は3日表示にする
const VIEWS = [
  { id: "timeGrid3Day", label: "3日" },
  { id: "timeGridWeek", label: "週" },
  { id: "dayGridMonth", label: "月" },
] as const;

type Editing = { event: OwnEvent; isNew: boolean };
type Viewing = { kind: "block"; block: Block } | { kind: "event"; source: EventSource; eventId: string };

function titleOf(arg: DatesSetArg): { year: string; month: string } {
  // timeZone: "UTC" で動かしているので、UTC の値がそのまま日本時間の日付
  const d = arg.view.currentStart;
  return { year: `${d.getUTCFullYear()}年`, month: `${d.getUTCMonth() + 1}月` };
}

/** 関連する予定とタスクのまとまりを強調し、ほかを薄くする */
function FocusStyle({ group }: { group?: string }) {
  if (!group) return null;
  const sel = `[data-g="${CSS.escape(group)}"]`;
  return (
    <style>{`
.app-cal .fc .fc-event.ev:not(${sel}) { opacity: 0.35; }
.app-cal .fc .fc-event.ev${sel} { box-shadow: 0 0 0 1.5px var(--stripe, var(--c)); z-index: 3; }
`}</style>
  );
}

export default function CalendarApp() {
  const { state, update, setHidden, openTask } = useApp();
  const calRef = useRef<FullCalendar>(null);
  const [initialView] = useState(() =>
    window.matchMedia("(max-width: 639px)").matches ? "timeGrid3Day" : "timeGridWeek",
  );
  const [view, setView] = useState<string>(initialView);
  const [title, setTitle] = useState({ year: "", month: "" });
  const [editing, setEditing] = useState<Editing | null>(null);
  const [viewing, setViewing] = useState<Viewing | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [focusGroup, setFocusGroup] = useState<string>();
  const [hoverGroup, setHoverGroup] = useState<string>();

  const hidden = useMemo(() => new Set(state.hiddenCalendars), [state.hiddenCalendars]);
  const events = useMemo(() => eventIndex(state), [state]);
  const related = useMemo(() => tasksByEvent(state.tasks, events), [state.tasks, events]);
  const api = () => calRef.current?.getApi();

  const onDatesSet = useCallback((arg: DatesSetArg) => {
    setTitle(titleOf(arg));
    setView(arg.view.type);
  }, []);

  /** 押した予定・枠が属するまとまり（関連するタスクがなければなし） */
  const groupOfEvent = (eventId: string) => (related.has(eventId) ? groupKeyOf(eventId) : undefined);
  const groupOfBlock = (b: Block) => {
    if (b.kind !== "task") return undefined;
    const rel = state.tasks.find((t) => t.id === b.refId)?.relatedEventId;
    return rel && events.has(rel) ? groupKeyOf(rel) : undefined;
  };

  // ---- 予定 ----
  const openOwn = (id: string) => {
    const ev = state.events.find((e) => e.id === id);
    if (ev) setEditing({ event: ev, isNew: false });
  };
  const saveEvent = (ev: OwnEvent) => {
    update((d) => {
      const exists = d.events.some((e) => e.id === ev.id);
      return { ...d, events: exists ? d.events.map((e) => (e.id === ev.id ? ev : e)) : [...d.events, ev] };
    });
    setEditing(null);
  };
  const deleteEvent = (id: string) => {
    update((d) => ({ ...d, events: d.events.filter((e) => e.id !== id) }));
    setEditing(null);
  };
  const moveEvent = (id: string, start: number, end: number, allDay: boolean) => {
    update((d) => ({
      ...d,
      events: d.events.map((e) => {
        if (e.id !== id) return e;
        const next: OwnEvent = { ...e, start, end };
        if (allDay) next.allDay = true;
        else delete next.allDay;
        return next;
      }),
    }));
  };

  // ---- 授業の1回ぶん ----
  const editOccurrence = (eventId: string, fn: (c: { cancelled: Set<string>; attended: Set<string> }, date: string) => void) => {
    const ref = parseClassEventId(eventId);
    if (!ref) return;
    update((d) => ({
      ...d,
      courses: d.courses.map((c) => {
        if (c.id !== ref.courseId) return c;
        const sets = { cancelled: new Set(c.cancelledDates), attended: new Set(c.attendedDates) };
        fn(sets, ref.date);
        return { ...c, cancelledDates: [...sets.cancelled].sort(), attendedDates: [...sets.attended].sort() };
      }),
    }));
  };
  const cancelClass = (eventId: string) => {
    editOccurrence(eventId, (s, date) => {
      s.cancelled.add(date);
      s.attended.delete(date);
    });
    setViewing(null);
  };
  const setAttending = (eventId: string, on: boolean) =>
    editOccurrence(eventId, (s, date) => {
      if (on) s.attended.add(date);
      else s.attended.delete(date);
    });

  // ---- 枠（タスク・習慣） ----
  const moveBlock = (block: Block, start: number, end: number) => {
    update((d) => ({
      ...d,
      blocks: d.blocks.map((b) => (sameBlock(b, block) ? { ...b, start, end, pinned: true } : b)),
    }));
  };
  const unpinBlock = (block: Block) => {
    update((d) => ({ ...d, blocks: d.blocks.map((b) => (sameBlock(b, block) ? { ...b, pinned: false } : b)) }));
    setViewing(null);
  };

  const editTask = (id: string) => {
    setViewing(null);
    setEditing(null);
    openTask(id);
  };

  const toggleCalendar = (id: CalendarId) =>
    setHidden(hidden.has(id) ? state.hiddenCalendars.filter((c) => c !== id) : [...state.hiddenCalendars, id]);

  const viewingEvent = viewing?.kind === "event" ? events.get(viewing.eventId)?.event : undefined;
  const viewingClass = viewing?.kind === "event" && viewing.source === "class" ? state.classEvents.find((e) => e.id === viewing.eventId) : undefined;
  const relatedList = (eventId: string) => (
    <RelatedTasks tasks={related.get(eventId) ?? []} blocks={state.result.blocks} onOpenTask={editTask} />
  );
  const viewingBlockRel = (() => {
    if (viewing?.kind !== "block" || viewing.block.kind !== "task") return undefined;
    const rel = state.tasks.find((t) => t.id === viewing.block.refId)?.relatedEventId;
    const ev = rel ? events.get(rel)?.event : undefined;
    return ev ? formatEventShort(ev) : undefined;
  })();

  const toggles = <CalendarToggles hidden={hidden} onToggle={toggleCalendar} />;

  return (
    <div className="flex h-full flex-col overflow-hidden bg-bg text-fg">
      <FocusStyle group={hoverGroup ?? focusGroup} />
      <header className="flex items-center gap-2 border-b border-line px-3 pt-[max(8px,env(safe-area-inset-top))] pb-2 sm:pt-3">
        <button
          type="button"
          onClick={() => setPanelOpen(true)}
          className="rounded-lg p-1.5 text-accent lg:hidden"
          aria-label="表示するカレンダーを選ぶ"
        >
          <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>
            <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
        <h1 className="min-w-0 flex-1 truncate text-[20px] font-bold tracking-tight sm:text-[24px]">
          <span className="hidden sm:inline">{title.year}</span>
          {title.month}
        </h1>
        <div className="flex shrink-0 items-center">
          <button type="button" onClick={() => api()?.prev()} className="rounded-lg px-1.5 py-1 text-[20px] text-accent sm:px-2" aria-label="前へ">
            ‹
          </button>
          <button type="button" onClick={() => api()?.today()} className="rounded-lg px-1 py-1 text-[15px] text-accent sm:px-2">
            今日
          </button>
          <button type="button" onClick={() => api()?.next()} className="rounded-lg px-1.5 py-1 text-[20px] text-accent sm:px-2" aria-label="次へ">
            ›
          </button>
        </div>
        <div className="flex shrink-0 rounded-lg bg-surface2 p-0.5" role="tablist" aria-label="表示の切り替え">
          {VIEWS.map((v) => (
            <button
              key={v.id}
              type="button"
              role="tab"
              aria-selected={view === v.id}
              onClick={() => api()?.changeView(v.id)}
              className={`rounded-md px-2.5 py-1 text-[13px] font-medium ${
                view === v.id ? "bg-surface text-fg shadow-sm" : "text-muted"
              }`}
            >
              {v.label}
            </button>
          ))}
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside className="hidden w-56 shrink-0 overflow-y-auto border-r border-line px-3 py-4 lg:block">{toggles}</aside>
        <main className="app-cal min-h-0 min-w-0 flex-1">
          <CalendarView
            ref={calRef}
            state={state}
            hidden={hidden}
            initialView={initialView}
            onDatesSet={onDatesSet}
            onCreate={(start, end, allDay) =>
              setEditing({ event: { id: "", title: "", start, end, ...(allDay ? { allDay } : {}) }, isNew: true })
            }
            onEventClick={(source, eventId) => {
              setFocusGroup(groupOfEvent(eventId));
              if (source === "own") openOwn(eventId);
              else setViewing({ kind: "event", source, eventId });
            }}
            onOwnEventChange={moveEvent}
            onBlockClick={(block) => {
              setFocusGroup(groupOfBlock(block));
              setViewing({ kind: "block", block });
            }}
            onBlockChange={moveBlock}
            onEmptyClick={() => {
              if (!focusGroup) return false;
              setFocusGroup(undefined);
              return true;
            }}
            onHoverGroup={setHoverGroup}
          />
        </main>
      </div>

      {panelOpen && (
        <Sheet title="表示するカレンダー" side="left" onClose={() => setPanelOpen(false)}>
          {toggles}
        </Sheet>
      )}
      {editing && (
        <EventForm
          key={`${editing.event.id}:${editing.event.start}`}
          initial={editing.event}
          isNew={editing.isNew}
          onSave={saveEvent}
          onDelete={deleteEvent}
          onClose={() => setEditing(null)}
          extra={editing.isNew ? undefined : relatedList(editing.event.id)}
        />
      )}
      {viewing?.kind === "block" && (
        <BlockSheet
          block={viewing.block}
          relatedLabel={viewingBlockRel}
          onTogglePin={unpinBlock}
          onEditTask={editTask}
          onClose={() => setViewing(null)}
        />
      )}
      {viewingEvent && viewing?.kind === "event" && (
        <ReadonlyEventSheet
          event={viewingEvent}
          sourceLabel={
            viewing.source === "google"
              ? "Google から取り込んだ予定は読み取り専用です。"
              : "時間割から作った授業です。曜日や時刻は設定の「時間割」で変えられます。"
          }
          onClose={() => setViewing(null)}
        >
          {viewingClass?.optional && (
            <label className="flex items-center justify-between gap-3 rounded-xl bg-surface2 px-3 py-2.5">
              <span className="min-w-0">
                <span className="block text-[15px]">この回は参加する</span>
                <span className="block text-[12px] text-muted">
                  任意参加です。参加しない回は空き時間として扱い、タスクを置くことがあります。
                </span>
              </span>
              <input
                type="checkbox"
                className="ios-switch"
                checked={viewingClass.attending}
                onChange={(e) => setAttending(viewingClass.id, e.target.checked)}
              />
            </label>
          )}
          {relatedList(viewingEvent.id)}
          {viewingClass && (
            <button
              type="button"
              onClick={() => {
                if (window.confirm(`${formatDate(viewingClass.start)}の「${viewingClass.title}」を休講にします。よろしいですか？`)) cancelClass(viewingClass.id);
              }}
              className="rounded-xl py-2.5 text-[16px] text-accent hover:bg-surface2"
            >
              この回を休講にする
            </button>
          )}
        </ReadonlyEventSheet>
      )}
    </div>
  );
}

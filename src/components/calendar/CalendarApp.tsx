"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import type FullCalendar from "@fullcalendar/react";
import type { DatesSetArg } from "@fullcalendar/core";
import type { Block, Task } from "@/lib/scheduler";
import { useMockStore, sameBlock, type OwnEvent } from "@/lib/mock/store";
import type { CalendarId } from "@/lib/mock/calendars";
import { WEEKDAY_JA, newId } from "@/lib/mock/jst";
import CalendarView, { type EventSource } from "./CalendarView";
import EventForm from "./EventForm";
import { BlockSheet, ReadonlyEventSheet } from "./InfoSheet";
import QuickAddBar from "./QuickAddBar";
import SidePanel, { warningCount } from "./SidePanel";
import Sheet from "./Sheet";

const VIEWS = [
  { id: "timeGridDay", label: "日" },
  { id: "timeGridWeek", label: "週" },
  { id: "dayGridMonth", label: "月" },
] as const;

type Editing = { event: OwnEvent; isNew: boolean };
type Viewing = { kind: "block"; block: Block } | { kind: "event"; source: EventSource; eventId: string };

function titleOf(arg: DatesSetArg): { year: string; rest: string; weekday: string } {
  // timeZone: "UTC" で動かしているので、UTC の値がそのまま日本時間の日付
  const d = arg.view.currentStart;
  const year = `${d.getUTCFullYear()}年`;
  const month = `${d.getUTCMonth() + 1}月`;
  if (arg.view.type === "timeGridDay") {
    return { year, rest: `${month}${d.getUTCDate()}日`, weekday: `（${WEEKDAY_JA[d.getUTCDay()]}）` };
  }
  return { year, rest: month, weekday: "" };
}

export default function CalendarApp() {
  const { state, update, setHidden, reset } = useMockStore();
  const calRef = useRef<FullCalendar>(null);
  const [initialView] = useState(() =>
    window.matchMedia("(max-width: 639px)").matches ? "timeGridDay" : "timeGridWeek",
  );
  const [view, setView] = useState<string>(initialView);
  const [title, setTitle] = useState({ year: "", rest: "", weekday: "" });
  const [editing, setEditing] = useState<Editing | null>(null);
  const [viewing, setViewing] = useState<Viewing | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);

  const hidden = useMemo(() => new Set(state.hiddenCalendars), [state.hiddenCalendars]);
  const api = () => calRef.current?.getApi();

  const onDatesSet = useCallback((arg: DatesSetArg) => {
    setTitle(titleOf(arg));
    setView(arg.view.type);
  }, []);

  // ---- 予定 ----
  const openOwn = (id: string) => {
    const ev = state.ownEvents.find((e) => e.id === id);
    if (ev) {
      setPanelOpen(false);
      setEditing({ event: ev, isNew: false });
    }
  };
  const saveEvent = (ev: OwnEvent) => {
    update((d) => {
      const exists = d.ownEvents.some((e) => e.id === ev.id);
      return { ...d, ownEvents: exists ? d.ownEvents.map((e) => (e.id === ev.id ? ev : e)) : [...d.ownEvents, ev] };
    });
    setEditing(null);
  };
  const deleteEvent = (id: string) => {
    update((d) => ({ ...d, ownEvents: d.ownEvents.filter((e) => e.id !== id) }));
    setEditing(null);
  };
  const moveEvent = (id: string, start: number, end: number, allDay: boolean) => {
    update((d) => ({
      ...d,
      ownEvents: d.ownEvents.map((e) => {
        if (e.id !== id) return e;
        const next: OwnEvent = { ...e, start, end };
        if (allDay) next.allDay = true;
        else delete next.allDay;
        return next;
      }),
    }));
  };

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

  // ---- タスク ----
  const addTask = (task: Task) => update((d) => ({ ...d, tasks: [...d.tasks, task] }));
  const deleteTask = (id: string) => {
    update((d) => ({ ...d, tasks: d.tasks.filter((t) => t.id !== id) }));
    setViewing(null);
  };

  const registerPlace = (location: string, minutes: number) =>
    update((d) => ({
      ...d,
      places: [...d.places, { id: newId("place"), name: location, keywords: [location], travelMinutes: minutes }],
    }));

  const toggleCalendar = (id: CalendarId) =>
    setHidden(hidden.has(id) ? state.hiddenCalendars.filter((c) => c !== id) : [...state.hiddenCalendars, id]);

  const doReset = () => {
    if (window.confirm("予定・タスク・固定した枠をすべてサンプルの状態に戻します。よろしいですか？")) {
      reset();
      setPanelOpen(false);
    }
  };

  const viewingEvent =
    viewing?.kind === "event"
      ? (viewing.source === "class" ? state.classEvents : state.googleEvents).find((e) => e.id === viewing.eventId)
      : undefined;
  const warnings = warningCount(state);

  const panel = (
    <SidePanel
      state={state}
      hidden={hidden}
      onToggleCalendar={toggleCalendar}
      onDeleteTask={deleteTask}
      onOpenOwn={openOwn}
      onRegisterPlace={registerPlace}
      onReset={doReset}
    />
  );

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-bg text-fg">
      <header className="flex items-center gap-2 border-b border-line px-3 pt-[max(8px,env(safe-area-inset-top))] pb-2">
        <button
          type="button"
          onClick={() => setPanelOpen(true)}
          className="relative rounded-lg p-1.5 text-accent md:hidden"
          aria-label="カレンダーとタスクを開く"
        >
          <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>
            <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          {warnings > 0 && (
            <span className="absolute -right-0.5 -top-0.5 min-w-4 rounded-full bg-accent px-1 text-center text-[10px] leading-4 text-white">
              {warnings}
            </span>
          )}
        </button>
        <h1 className="min-w-0 flex-1 truncate text-[20px] font-bold tracking-tight sm:text-[24px]">
          <span className="hidden sm:inline">{title.year}</span>
          {title.rest}
          <span className="hidden sm:inline">{title.weekday}</span>
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
        <aside className="hidden w-64 shrink-0 overflow-y-auto border-r border-line px-3 py-4 md:block">{panel}</aside>
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
            onEventClick={(source, eventId) =>
              source === "own" ? openOwn(eventId) : setViewing({ kind: "event", source, eventId })
            }
            onOwnEventChange={moveEvent}
            onBlockClick={(block) => setViewing({ kind: "block", block })}
            onBlockChange={moveBlock}
          />
        </main>
      </div>

      <QuickAddBar onAdd={addTask} />

      {panelOpen && (
        <Sheet title="カレンダーとタスク" side="left" onClose={() => setPanelOpen(false)}>
          {panel}
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
        />
      )}
      {viewing?.kind === "block" && (
        <BlockSheet block={viewing.block} onTogglePin={unpinBlock} onDeleteTask={deleteTask} onClose={() => setViewing(null)} />
      )}
      {viewingEvent && viewing?.kind === "event" && (
        <ReadonlyEventSheet
          event={viewingEvent}
          sourceLabel={viewing.source === "google" ? "Google から取り込んだ" : "授業"}
          onClose={() => setViewing(null)}
        />
      )}
    </div>
  );
}

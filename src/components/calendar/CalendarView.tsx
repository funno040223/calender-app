"use client";

import { useCallback, useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState, type Ref } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin, { type DateClickArg, type EventResizeDoneArg } from "@fullcalendar/interaction";
import jaLocale from "@fullcalendar/core/locales/ja";
import type {
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
  /** 月表示：タスクの締切（締切の日に出す） */
  | { type: "deadline"; taskId: string }
) & {
  /** 関連する予定とタスクのまとまり。強調するときに使う */
  group?: string;
};

/** 3日・週は、横に長く並べた日を指で動かす（1日ずつ止まる）。月はふつうの月表示 */
export type CalendarMode = "day3" | "week" | "month";

export interface CalendarHandle {
  prev: () => void;
  next: () => void;
  today: () => void;
}

/** 横に並べておく日数と、今見ている日の前に置く日数。端に近づいたら並べ直す */
const STRIP_DAYS = 42;
const STRIP_LEAD = 14;
const STRIP_EDGE = 5;
/** 3日・週：30分の高さ（px）。ピンチで変え、端末ごとに覚える */
const SLOT_KEY = "task-rhythm:slot-height";
const SLOT_DEFAULT = 34;
const SLOT_MIN = 20;
const SLOT_MAX = 90;
const clampSlot = (h: number) => Math.min(SLOT_MAX, Math.max(SLOT_MIN, h));
function readSlot(): number {
  try {
    const v = Number(window.localStorage.getItem(SLOT_KEY));
    return v >= SLOT_MIN && v <= SLOT_MAX ? v : SLOT_DEFAULT;
  } catch {
    return SLOT_DEFAULT;
  }
}

/** 月表示：縦に並べておく週の数と、今見ている週の前に置く週の数 */
const MONTH_WEEKS = 26;
const MONTH_LEAD = 9;
const MONTH_EDGE = 2;
/** 画面の高さに入れる週の数（1週の高さ＝画面の高さ ÷ これ） */
const MONTH_ROWS = 6;

const todayFcNow = () => {
  const n = toFc(Date.now());
  return Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate());
};

/** その日を含む週の月曜（FullCalendar の日付） */
const mondayOf = (dayFc: number) => dayFc - ((new Date(dayFc).getUTCDay() + 6) % 7) * DAY_MS;
/** その日の月の1日 */
const firstOfMonth = (dayFc: number) => {
  const d = new Date(dayFc);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1);
};

export interface CalendarViewProps {
  state: MockState;
  hidden: Set<CalendarId>;
  mode: CalendarMode;
  /** 見出しに出す年と月（見ている範囲の最初の日） */
  onTitle: (t: { year: string; month: string }) => void;
  onCreate: (start: number, end: number, allDay: boolean) => void;
  onEventClick: (source: EventSource, eventId: string) => void;
  onOwnEventChange: (id: string, start: number, end: number, allDay: boolean) => void;
  onBlockClick: (block: Block) => void;
  onBlockChange: (block: Block, start: number, end: number) => void;
  /** 何もないところを押したとき。true を返したら新規作成しない */
  onEmptyClick: () => boolean;
  onHoverGroup: (group: string | undefined) => void;
  /** 月表示で日付を押したとき（その日の3日表示・週表示へ） */
  onPickDay: (dayStart: number) => void;
  /** 月表示でタスクの締切を押したとき */
  onDeadlineClick: (taskId: string) => void;
  /** 3日・週を、この日（日本時間の 0:00）から見せる。なければ今日 */
  initialDay?: number;
  /** 1回押して選んでいる予定・枠（もう1回押すと詳しく開く） */
  selectedId?: string;
  ref?: Ref<CalendarHandle>;
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
  if (ext.type === "deadline") {
    return (
      <div className="ev-inner">
        <div className="ev-title">〆 {arg.event.title}</div>
      </div>
    );
  }
  const pinned = ext.type === "block" && ext.block.pinned;
  const related = ext.type === "event" && ext.relatedCount ? <RelatedBadge n={ext.relatedCount} /> : null;
  const isMonthDot = arg.view.type === "dayGridStrip" && !arg.event.allDay;
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
  if (arg.view.type === "dayGridStrip") return <span className="dh-wd">{wd}</span>;
  return (
    <div className="dh">
      <span className="dh-wd">{wd}</span>
      <span className={`dh-num${arg.isToday ? " is-today" : ""}`}>{arg.date.getUTCDate()}</span>
    </div>
  );
}

export default function CalendarView(props: CalendarViewProps) {
  const { state, hidden, ref, mode } = props;
  // 見出しの年月は、変わったときだけ知らせる（スクロールのたびに画面全体を描き直さないため）
  const lastTitle = useRef("");
  const propsOnTitle = props.onTitle;
  const onTitle = useCallback(
    (t: { year: string; month: string }) => {
      const k = t.year + t.month;
      if (k === lastTitle.current) return;
      lastTitle.current = k;
      propsOnTitle(t);
    },
    [propsOnTitle],
  );
  const strip = mode !== "month";
  const monthMode = mode === "month";
  const monthRef = useRef<HTMLDivElement>(null);
  const [mAnchor, setMAnchor] = useState(() => mondayOf(firstOfMonth(todayFcNow())) - MONTH_LEAD * 7 * DAY_MS);
  const [rowH, setRowH] = useState(0);
  const pendingRow = useRef<number | null>(MONTH_LEAD);
  const visible = mode === "week" ? 7 : 3;
  const fcRef = useRef<FullCalendar>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const api = () => fcRef.current?.getApi();

  /** 日本時間の 0:00（FullCalendar の日付）を、その日の番号にする */
  const todayFc = useMemo(() => {
    const now = toFc(Date.now());
    return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  }, []);
  /** 最初に見る日：3日は今日、週はその週の月曜 */
  const homeDay = useCallback(() => {
    if (mode !== "week") return todayFc;
    const wd = new Date(todayFc).getUTCDay();
    return todayFc - ((wd + 6) % 7) * DAY_MS;
  }, [mode, todayFc]);
  const [anchor, setAnchor] = useState(() => {
    if (props.initialDay === undefined) return homeDay() - STRIP_LEAD * DAY_MS;
    const f = toFc(props.initialDay);
    let day = Date.UTC(f.getUTCFullYear(), f.getUTCMonth(), f.getUTCDate());
    if (mode === "week") day -= ((new Date(day).getUTCDay() + 6) % 7) * DAY_MS;
    return day - STRIP_LEAD * DAY_MS;
  });
  const [col, setCol] = useState(0);
  const axis = useRef(44);
  const pendingScroll = useRef<number | null>(STRIP_LEAD);
  const didScrollTime = useRef(false);

  const setTitleFor = useCallback(
    (dayFc: number) => {
      const d = new Date(dayFc);
      onTitle({ year: `${d.getUTCFullYear()}年`, month: `${d.getUTCMonth() + 1}月` });
    },
    [onTitle],
  );

  // 1日の幅は、画面の幅から時刻の列を引いて、3日（週は7日）で割る
  useLayoutEffect(() => {
    if (!strip) return;
    const el = wrapRef.current;
    if (!el) return;
    const measure = () => setCol(Math.max(40, (el.clientWidth - axis.current) / visible));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [strip, visible]);

  // 並べ直したあと・幅が変わったあとは、見ていた日に戻す（ぴったり止める仕組みは一時止める）
  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!strip || !el || col === 0 || pendingScroll.current === null) return;
    const idx = pendingScroll.current;
    pendingScroll.current = null;
    el.style.scrollSnapType = "none";
    el.scrollLeft = idx * col;
    requestAnimationFrame(() => (el.style.scrollSnapType = ""));
    setTitleFor(anchor + idx * DAY_MS);
    // 縦は、最初だけ今の1時間前から見せる
    if (!didScrollTime.current) {
      didScrollTime.current = true;
      const hour = Math.max(0, toFc(Date.now()).getUTCHours() - 1);
      const row = el.querySelector<HTMLElement>(`.fc-timegrid-slot-lane[data-time="${String(hour).padStart(2, "0")}:00:00"]`);
      const head = el.querySelector<HTMLElement>(".fc-col-header")?.offsetHeight ?? 0;
      if (row) el.scrollTop = Math.max(0, row.getBoundingClientRect().top - el.getBoundingClientRect().top + el.scrollTop - head - 8);
    }
  }, [strip, col, anchor, setTitleFor]);

  const firstVisibleIdx = () => {
    const el = wrapRef.current;
    return el && col > 0 ? Math.round(el.scrollLeft / col) : STRIP_LEAD;
  };

  /** 端に近づいたら、今見ている日を真ん中寄りにして並べ直す */
  const recenterIfNeeded = useCallback(() => {
    const el = wrapRef.current;
    if (!el || col === 0) return;
    const idx = Math.round(el.scrollLeft / col);
    if (idx >= STRIP_EDGE && idx <= STRIP_DAYS - visible - STRIP_EDGE) return;
    const first = anchor + idx * DAY_MS;
    pendingScroll.current = STRIP_LEAD;
    setAnchor(first - STRIP_LEAD * DAY_MS);
  }, [anchor, col, visible]);

  useEffect(() => {
    if (strip) api()?.gotoDate(new Date(anchor));
  }, [strip, anchor]);

  // 時刻の列の実際の幅に合わせて、1日の幅を直す
  useEffect(() => {
    const el = wrapRef.current;
    if (!strip || !el || col === 0) return;
    api()?.updateSize();
    const a = el.querySelector<HTMLElement>(".fc-timegrid-axis")?.getBoundingClientRect().width;
    if (a && Math.abs(a - axis.current) > 1) {
      axis.current = a;
      pendingScroll.current = firstVisibleIdx();
      setCol(Math.max(40, (el.clientWidth - a) / visible));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [strip, col, visible]);

  // ---- ピンチで1時間あたりの高さを変える（指の間の時刻がずれないように縦の位置も合わせる） ----
  const [slotH, setSlotH] = useState(readSlot);
  const slotRef = useRef(slotH);
  useEffect(() => {
    const el = wrapRef.current;
    if (!strip || !el) return;
    let pinch: { d0: number; h0: number; y: number; top0: number; left0: number } | null = null;
    const dist = (t: TouchList) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
    /** 時刻の欄が始まる位置（日付の見出しと終日の欄は伸び縮みしないので、ここから下だけを拡大する） */
    const gridTop = () => {
      const body = el.querySelector<HTMLElement>(".fc-timegrid-body");
      return body ? body.getBoundingClientRect().top - el.getBoundingClientRect().top + el.scrollTop : 0;
    };
    /**
     * 予定・枠・睡眠の帯・今の線の位置（上と下からの距離）を、拡大を始めたときに控える。
     * 拡大の間はこれを同じ割合で伸ばし、時刻の目盛りと一緒に動かす（FullCalendar の描き直しは終わってから）
     */
    let marks: { el: HTMLElement; top: number; bottom: number | null }[] = [];
    let marksH = 0;
    const takeMarks = () => {
      marksH = slotRef.current;
      marks = [
        ...el.querySelectorAll<HTMLElement>(
          ".fc-timegrid-event-harness, .fc-timegrid-bg-harness, .fc-timegrid-now-indicator-line, .fc-timegrid-now-indicator-arrow",
        ),
      ].map((m) => {
        const cs = getComputedStyle(m);
        const bottom = parseFloat(cs.bottom);
        return { el: m, top: parseFloat(cs.top), bottom: Number.isFinite(bottom) ? bottom : null };
      });
    };
    const relayout = () => {
      marks = [];
      api()?.updateSize();
    };
    /** ピンチを始めた点の時刻が、指の下から動かないように縦の位置を合わせる */
    const apply = (h: number, focusY: number, top0: number, h0: number) => {
      const g = gridTop();
      const at = top0 + focusY - g;
      slotRef.current = h;
      el.style.setProperty("--slot-h", `${h}px`);
      const r = marksH > 0 ? h / marksH : 1;
      for (const m of marks) {
        m.el.style.top = `${m.top * r}px`;
        if (m.bottom !== null) m.el.style.bottom = `${m.bottom * r}px`;
      }
      el.scrollTop = g + at * (h / h0) - focusY;
    };
    const save = () => {
      setSlotH(slotRef.current);
      try {
        window.localStorage.setItem(SLOT_KEY, String(Math.round(slotRef.current)));
      } catch {
        // 覚えられなくても、今の画面では使える
      }
    };
    const onStart = (e: TouchEvent) => {
      if (e.touches.length !== 2) return;
      const rect = el.getBoundingClientRect();
      pinch = {
        d0: dist(e.touches),
        h0: slotRef.current,
        y: (e.touches[0].clientY + e.touches[1].clientY) / 2 - rect.top,
        top0: el.scrollTop,
        left0: el.scrollLeft,
      };
      // ピンチの間はスクロールと、1日ずつ止める仕組みを止める（拡大・縮小とぶつからないように）
      el.style.scrollSnapType = "none";
      el.style.overflow = "hidden";
      takeMarks();
    };
    const onMove = (e: TouchEvent) => {
      if (!pinch || e.touches.length !== 2) return;
      e.preventDefault();
      el.scrollLeft = pinch.left0;
      apply(clampSlot(pinch.h0 * (dist(e.touches) / pinch.d0)), pinch.y, pinch.top0, pinch.h0);
    };
    const onEnd = (e: TouchEvent) => {
      if (!pinch || e.touches.length >= 2) return;
      const left = pinch.left0;
      pinch = null;
      el.style.overflow = "";
      // 横の位置を1日の境目にそろえてから、止める仕組みを戻す
      const c = el.clientWidth > 0 && col > 0 ? col : 1;
      el.scrollLeft = Math.round(left / c) * c;
      requestAnimationFrame(() => (el.style.scrollSnapType = ""));
      relayout();
      save();
    };
    // iPhone の画面全体の拡大を止める
    const onGesture = (e: Event) => e.preventDefault();
    // パソコンのトラックパッドのピンチ（Ctrl＋スクロール）
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey) return;
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const h0 = slotRef.current;
      if (marks.length === 0) takeMarks();
      apply(clampSlot(h0 * Math.exp(-e.deltaY * 0.005)), e.clientY - rect.top, el.scrollTop, h0);
      window.clearTimeout(wheelTimer);
      wheelTimer = window.setTimeout(() => {
        relayout();
        save();
      }, 200);
    };
    let wheelTimer = 0;
    el.addEventListener("touchstart", onStart, { passive: true });
    el.addEventListener("touchmove", onMove, { passive: false });
    el.addEventListener("touchend", onEnd);
    el.addEventListener("touchcancel", onEnd);
    el.addEventListener("gesturestart", onGesture);
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      el.removeEventListener("touchstart", onStart);
      el.removeEventListener("touchmove", onMove);
      el.removeEventListener("touchend", onEnd);
      el.removeEventListener("touchcancel", onEnd);
      el.removeEventListener("gesturestart", onGesture);
      el.removeEventListener("wheel", onWheel);
      window.clearTimeout(wheelTimer);
    };
  }, [strip, col]);

  // ---- 上下に動かしている間は、左右に動かさない（iPhone は向きを固定しないので、指が少し斜めだと横にずれる） ----
  /** "y" のあいだは横のスクロールを止めている。touching は指が画面に触れているか、scrolledAt は最後に動いた時刻 */
  const axisLock = useRef<{ axis?: "x" | "y"; touching: boolean; scrolledAt: number }>({ touching: false, scrolledAt: 0 });
  useEffect(() => {
    const el = wrapRef.current;
    if (!strip || !el) return;
    let start: { x: number; y: number } | null = null;
    let endTimer = 0;
    const onStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) {
        start = null;
        return;
      }
      start = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      window.clearTimeout(endTimer);
      // 向きは動き始めてから決め直す（横の止めは、横に動かしたときに外す）
      axisLock.current.axis = undefined;
      axisLock.current.touching = true;
    };
    const onMove = (e: TouchEvent) => {
      if (!start || axisLock.current.axis || e.touches.length !== 1) return;
      const dx = Math.abs(e.touches[0].clientX - start.x);
      const dy = Math.abs(e.touches[0].clientY - start.y);
      if (Math.max(dx, dy) < 8) return;
      axisLock.current.axis = dy > dx ? "y" : "x";
      el.style.overflowX = axisLock.current.axis === "y" ? "hidden" : "";
    };
    const onEnd = (e: TouchEvent) => {
      if (e.touches.length > 0) return;
      axisLock.current.touching = false;
      start = null;
      // 惰性で動いていなければ、ここで止まったものとして片付ける（指を置いている間は、並べ直さずに待っていた）
      window.clearTimeout(endTimer);
      endTimer = window.setTimeout(() => {
        if (Date.now() - axisLock.current.scrolledAt > 150) settleRef.current();
      }, 200);
    };
    el.addEventListener("touchstart", onStart, { passive: true });
    el.addEventListener("touchmove", onMove, { passive: true });
    el.addEventListener("touchend", onEnd);
    el.addEventListener("touchcancel", onEnd);
    return () => {
      el.removeEventListener("touchstart", onStart);
      el.removeEventListener("touchmove", onMove);
      el.removeEventListener("touchend", onEnd);
      el.removeEventListener("touchcancel", onEnd);
      window.clearTimeout(endTimer);
      el.style.overflowX = "";
    };
  }, [strip]);

  /**
   * 動きが止まったときの片付け：横の止めを外し、日の途中なら境目へ、端に近ければ並べ直す。
   * 指を置いている間はしない（iPhone は指で動かしている途中に位置を変えると、元の位置に戻して日付だけ入れ替わり、何日も飛ぶ）
   */
  const settle = () => {
    const el = wrapRef.current;
    if (!el || col === 0 || axisLock.current.touching) return;
    axisLock.current.axis = undefined;
    el.style.overflowX = "";
    // 止まる仕組みが効かずに日の途中で止まったら、近いほうの日の境目まで動かす
    const off = el.scrollLeft / col;
    if (Math.abs(off - Math.round(off)) * col > 1) {
      el.scrollTo({ left: Math.round(off) * col, behavior: "smooth" });
      return;
    }
    recenterIfNeeded();
  };
  const settleRef = useRef(settle);
  useLayoutEffect(() => {
    settleRef.current = settle;
  });

  const scrollEndTimer = useRef<number | undefined>(undefined);
  const handleScroll = () => {
    const el = wrapRef.current;
    if (!el || col === 0) return;
    setTitleFor(anchor + Math.round(el.scrollLeft / col) * DAY_MS);
    axisLock.current.scrolledAt = Date.now();
    window.clearTimeout(scrollEndTimer.current);
    scrollEndTimer.current = window.setTimeout(settle, 180);
  };

  const scrollToDay = (dayFc: number) => {
    const el = wrapRef.current;
    if (!el) return;
    const idx = Math.round((dayFc - anchor) / DAY_MS);
    if (idx < STRIP_EDGE || idx > STRIP_DAYS - visible - STRIP_EDGE) {
      pendingScroll.current = STRIP_LEAD;
      setAnchor(dayFc - STRIP_LEAD * DAY_MS);
      return;
    }
    el.scrollTo({ left: idx * col, behavior: "smooth" });
  };

  // ---- 月：週を縦に並べ、指で上下に動かす（1週ずつ止まる） ----
  useLayoutEffect(() => {
    if (!monthMode) return;
    const el = monthRef.current;
    if (!el) return;
    const measure = () => setRowH(Math.max(56, (el.clientHeight - 28) / MONTH_ROWS));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [monthMode]);

  /** 画面の真ん中あたりの週から、見出しの月を決める */
  const monthTitleAt = useCallback(
    (row: number) => {
      const d = new Date(mAnchor + (row + 2) * 7 * DAY_MS + 3 * DAY_MS);
      onTitle({ year: `${d.getUTCFullYear()}年`, month: `${d.getUTCMonth() + 1}月` });
    },
    [mAnchor, onTitle],
  );

  useLayoutEffect(() => {
    const el = monthRef.current;
    if (!monthMode || !el || rowH === 0 || pendingRow.current === null) return;
    const row = pendingRow.current;
    pendingRow.current = null;
    el.style.scrollSnapType = "none";
    el.scrollTop = row * rowH;
    requestAnimationFrame(() => (el.style.scrollSnapType = ""));
    monthTitleAt(row);
  }, [monthMode, rowH, mAnchor, monthTitleAt]);

  useEffect(() => {
    if (monthMode) api()?.gotoDate(new Date(mAnchor));
  }, [monthMode, mAnchor]);

  const monthScrollEnd = useRef<number | undefined>(undefined);
  const handleMonthScroll = () => {
    const el = monthRef.current;
    if (!el || rowH === 0) return;
    const row = Math.round(el.scrollTop / rowH);
    monthTitleAt(row);
    window.clearTimeout(monthScrollEnd.current);
    monthScrollEnd.current = window.setTimeout(() => {
      const r = Math.round(el.scrollTop / rowH);
      if (r >= MONTH_EDGE && r <= MONTH_WEEKS - MONTH_ROWS - MONTH_EDGE) return;
      pendingRow.current = MONTH_LEAD;
      setMAnchor(mAnchor + (r - MONTH_LEAD) * 7 * DAY_MS);
    }, 180);
  };

  /** その月の1日を含む週を、いちばん上に出す */
  const scrollToMonth = (dayFc: number) => {
    const el = monthRef.current;
    if (!el) return;
    const row = Math.round((mondayOf(firstOfMonth(dayFc)) - mAnchor) / (7 * DAY_MS));
    if (row < MONTH_EDGE || row > MONTH_WEEKS - MONTH_ROWS - MONTH_EDGE) {
      pendingRow.current = MONTH_LEAD;
      setMAnchor(mondayOf(firstOfMonth(dayFc)) - MONTH_LEAD * 7 * DAY_MS);
      return;
    }
    el.scrollTo({ top: row * rowH, behavior: "smooth" });
  };
  /** 見出しの月（画面の真ん中あたりの週）から、前後の月へ */
  const shiftMonth = (by: number) => {
    const el = monthRef.current;
    if (!el || rowH === 0) return;
    const d = new Date(mAnchor + (Math.round(el.scrollTop / rowH) + 2) * 7 * DAY_MS + 3 * DAY_MS);
    scrollToMonth(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + by, 1));
  };

  useImperativeHandle(ref, () => ({
    prev: () => (strip ? wrapRef.current?.scrollBy({ left: -visible * col, behavior: "smooth" }) : shiftMonth(-1)),
    next: () => (strip ? wrapRef.current?.scrollBy({ left: visible * col, behavior: "smooth" }) : shiftMonth(1)),
    today: () => (strip ? scrollToDay(homeDay()) : scrollToMonth(todayFcNow())),
  }));

  const events = useMemo(() => {
    const out: EventInput[] = [];
    const index = eventIndex(state);
    const related = tasksByEvent(state.tasks, index);
    for (const ref of allEventRefs(state)) {
      // 月表示は見渡すための画面：時刻の予定は文字にせず、日付の下の点（件数）だけにする
      if (mode === "month" && !ref.event.allDay) continue;
      if (!hidden.has(ref.calendarId)) out.push(eventToInput(ref, related.get(ref.event.id)?.length ?? 0));
    }

    if (mode === "month") {
      const late = new Set(state.result.shortfalls.map((x) => x.taskId));
      if (!hidden.has("task")) {
        for (const t of state.tasks) {
          if (t.deadline === undefined) continue;
          const f = toFc(t.deadline);
          const day = new Date(Date.UTC(f.getUTCFullYear(), f.getUTCMonth(), f.getUTCDate()));
          out.push({
            id: `deadline:${t.id}`,
            title: t.title,
            start: day,
            allDay: true,
            editable: false,
            classNames: ["ev", "cal-task", "is-deadline", late.has(t.id) ? "is-late" : ""],
            extendedProps: { type: "deadline", taskId: t.id } satisfies Extended,
          });
        }
      }
      return out.map((e) => (e.id && e.id === props.selectedId ? { ...e, classNames: [...((e.classNames as string[]) ?? []), "is-selected"] } : e));
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
    return out.map((e) => (e.id && e.id === props.selectedId ? { ...e, classNames: [...((e.classNames as string[]) ?? []), "is-selected"] } : e));
  }, [state, hidden, props.selectedId, mode]);

  /** 月表示：日ごとの時刻の予定の件数（日付の下に点で出す） */
  const timedCount = useMemo(() => {
    const m = new Map<string, number>();
    if (mode !== "month") return m;
    for (const ref of allEventRefs(state)) {
      if (ref.event.allDay || hidden.has(ref.calendarId) || ref.skipped) continue;
      const k = toFc(ref.event.start).toISOString().slice(0, 10);
      m.set(k, (m.get(k) ?? 0) + 1);
    }
    return m;
  }, [state, hidden, mode]);

  const handleSelect = (arg: DateSelectArg) => {
    arg.view.calendar.unselect();
    props.onCreate(fromFc(arg.start), fromFc(arg.end), arg.allDay);
  };

  const handleDateClick = (arg: DateClickArg) => {
    if (props.onEmptyClick()) return;
    // 月表示で日付を押したら、その日から見る（終日の予定は、日をまたいで長押し・ドラッグで作る）
    if (!strip) return props.onPickDay(fromFc(arg.date));
    const start = fromFc(arg.date);
    if (arg.allDay) props.onCreate(start, start + DAY_MS, true);
    else props.onCreate(start, start + 60 * MIN, false);
  };

  const handleClick = (arg: EventClickArg) => {
    const ext = arg.event.extendedProps as Extended;
    if (ext.type === "event") props.onEventClick(ext.source, ext.eventId);
    else if (ext.type === "block") props.onBlockClick(ext.block);
    else if (ext.type === "deadline") props.onDeadlineClick(ext.taskId);
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

  const calendar = (
    <FullCalendar
      ref={fcRef}
      plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
      locale={jaLocale}
      timeZone="UTC"
      now={() => toFc(Date.now())}
      firstDay={1}
      initialView={strip ? "timeGridStrip" : "dayGridStrip"}
      initialDate={new Date(strip ? anchor : mAnchor)}
      views={{
        timeGridStrip: { type: "timeGrid", duration: { days: STRIP_DAYS } },
        dayGridStrip: { type: "dayGrid", duration: { weeks: MONTH_WEEKS } },
      }}
      headerToolbar={false}
      height="auto"
      stickyHeaderDates
      events={events}
      eventContent={renderEventContent}
      dayHeaderContent={renderDayHeader}
      // 月表示の日付は「1日」ではなく「1」だけにする（時間表示の終日欄には何も出さない）
      dayCellContent={(arg) => {
        const num = arg.dayNumberText.replace("日", "");
        if (strip) return num;
        // 週が途切れずに続くので、1日には月も出す
        const label = arg.date.getUTCDate() === 1 ? `${arg.date.getUTCMonth() + 1}/1` : num;
        const n = timedCount.get(arg.date.toISOString().slice(0, 10)) ?? 0;
        return (
          <span className="mc">
            <span className={`mc-num${arg.date.getUTCDate() === 1 ? " is-first" : ""}`}>{label}</span>
            {n > 0 && (
              <span className="mc-dots" aria-label={`予定${n}件`}>
                {"•".repeat(Math.min(n, 4))}
                {n > 4 ? "+" : ""}
              </span>
            )}
          </span>
        );
      }}
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
      dayMaxEventRows={2}
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

  if (monthMode) {
    return (
      <div ref={monthRef} className="cal-month" style={{ ["--row" as string]: `${rowH}px` }} onScroll={handleMonthScroll}>
        {rowH > 0 && calendar}
      </div>
    );
  }
  return (
    <div
      ref={wrapRef}
      className="cal-strip"
      style={{
        ["--col" as string]: `${col}px`,
        ["--axis" as string]: `${axis.current}px`,
        ["--strip-days" as string]: STRIP_DAYS,
        ["--slot-h" as string]: `${slotH}px`,
      }}
      onScroll={handleScroll}
    >
      {col > 0 && calendar}
    </div>
  );
}

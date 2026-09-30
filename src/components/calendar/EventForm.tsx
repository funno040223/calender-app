"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import type { OwnEvent } from "@/lib/mock/store";
import { OWN_CALENDARS, type OwnCalendarId } from "@/lib/mock/calendars";
import { DAY_MS, dayStartOf, fromInputDateTime, newId, toInputDate, toInputDateTime } from "@/lib/mock/jst";
import Sheet from "@/components/ui/Sheet";
import { DangerButton } from "@/components/ui/controls";

interface Draft {
  calendarId: OwnCalendarId;
  title: string;
  allDay: boolean;
  /** 日付（"2026-10-01"）と時刻（"13:00"）を分けて持つ。時刻の予定は、終わりが始まりより前なら翌日とみなす */
  date: string;
  startTime: string;
  endTime: string;
  /** 終わりの日。終日の予定と、24時間以上の予定でだけ使う */
  endDate: string;
  multiDay: boolean;
  location: string;
  description: string;
  travelMinutes: string;
  atHome: boolean;
  /** 在宅でも顔を出す予定（身支度の時間を取る） */
  needsPrep: boolean;
  awayFromHome: boolean;
}

function toDraft(ev: OwnEvent): Draft {
  return {
    calendarId: ev.calendarId ?? "own",
    title: ev.title,
    allDay: !!ev.allDay,
    date: toInputDate(ev.start),
    startTime: toInputDateTime(ev.start).slice(11),
    endTime: toInputDateTime(ev.end).slice(11),
    // 終日の終わりは「翌日 0:00」なので、画面では最終日を出す
    endDate: toInputDate(ev.allDay ? ev.end - DAY_MS : ev.end),
    multiDay: !ev.allDay && ev.end - ev.start >= DAY_MS,
    location: ev.location ?? "",
    description: ev.description ?? "",
    travelMinutes: ev.travelMinutes === undefined ? "" : String(ev.travelMinutes),
    atHome: !!ev.atHome,
    needsPrep: !!ev.needsPrep,
    awayFromHome: !!ev.awayFromHome,
  };
}

const inputCls =
  "w-full min-w-0 rounded-lg border border-line bg-surface2 px-3 py-2 text-[16px] outline-none focus:border-tint";

export default function EventForm({
  initial,
  isNew,
  onSave,
  onDelete,
  onClose,
  extra,
}: {
  /** 関連するタスクなど、フォームの下に出すもの */
  extra?: ReactNode;
  initial: OwnEvent;
  isNew: boolean;
  onSave: (ev: OwnEvent) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}) {
  const [d, setD] = useState<Draft>(() => toDraft(initial));
  const [error, setError] = useState("");
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((prev) => ({ ...prev, [k]: v }));

  const toggleAllDay = (allDay: boolean) => {
    if (allDay) setD({ ...d, allDay, endDate: d.endDate < d.date ? d.date : d.endDate });
    // 終日の予定の時刻は 0:00 なので、そのままだと 0:00〜0:00 の24時間になる
    else {
      const fromAllDay = d.allDay && d.startTime === "00:00" && d.endTime === "00:00";
      setD({ ...d, allDay, startTime: fromAllDay || !d.startTime ? "09:00" : d.startTime, endTime: fromAllDay || !d.endTime ? "10:00" : d.endTime, endDate: d.date, multiDay: false });
    }
  };

  /** 日付を変えたら、何日かにわたる予定は終わりの日も同じ日数ずらす */
  const setDate = (v: string) => {
    const before = fromInputDateTime(d.date);
    const after = fromInputDateTime(v);
    const end = fromInputDateTime(d.endDate);
    if (!(d.allDay || d.multiDay) || before === undefined || after === undefined || end === undefined) return set("date", v);
    setD({ ...d, date: v, endDate: toInputDate(end + (after - before)) });
  };

  /** 始まりの時刻を変えたら、長さを保って終わりも動かす */
  const setStartTime = (v: string) => {
    const before = fromInputDateTime(`${d.date}T${d.startTime}`);
    const after = fromInputDateTime(`${d.date}T${v}`);
    const end = fromInputDateTime(`${d.multiDay ? d.endDate : d.date}T${d.endTime}`);
    if (before === undefined || after === undefined || end === undefined || d.multiDay) return set("startTime", v);
    const len = (end > before ? end : end + DAY_MS) - before;
    setD({ ...d, startTime: v, endTime: toInputDateTime(after + len).slice(11) });
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    let start: number | undefined;
    let end: number | undefined;
    if (d.allDay) {
      start = fromInputDateTime(d.date);
      const last = fromInputDateTime(d.endDate || d.date);
      end = last === undefined ? undefined : dayStartOf(last) + DAY_MS;
    } else {
      start = fromInputDateTime(`${d.date}T${d.startTime}`);
      end = fromInputDateTime(`${d.multiDay ? d.endDate : d.date}T${d.endTime}`);
      // 23:00〜1:00 のように終わりが前なら、翌日の時刻
      if (!d.multiDay && start !== undefined && end !== undefined && end <= start) end += DAY_MS;
    }
    if (start === undefined || end === undefined) return setError("日時を入力してください");
    if (end <= start) return setError("終了は開始より後にしてください");
    const travel = d.travelMinutes.trim() === "" ? undefined : Number(d.travelMinutes);
    if (travel !== undefined && (!Number.isFinite(travel) || travel < 0)) return setError("移動時間は0以上の数で入力してください");

    const ev: OwnEvent = {
      id: initial.id || newId("own"),
      calendarId: d.calendarId,
      title: d.title.trim() || "新規予定",
      start,
      end,
      ...(d.allDay ? { allDay: true } : {}),
      ...(d.location.trim() ? { location: d.location.trim() } : {}),
      ...(d.description.trim() ? { description: d.description.trim() } : {}),
      ...(travel !== undefined ? { travelMinutes: travel } : {}),
      ...(d.atHome ? { atHome: true } : {}),
      ...(!d.allDay && d.needsPrep ? { needsPrep: true } : {}),
      ...(d.allDay && d.awayFromHome ? { awayFromHome: true } : {}),
    };
    onSave(ev);
  };

  return (
    <Sheet title={isNew ? "新規予定" : "予定を編集"} onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-3">
        <input
          className={inputCls}
          placeholder="タイトル"
          aria-label="タイトル"
          value={d.title}
          autoFocus={isNew}
          onChange={(e) => set("title", e.target.value)}
        />
        <div className="flex items-center justify-between text-[15px]">
          カレンダー
          <div className="flex rounded-lg bg-surface2 p-0.5" role="radiogroup" aria-label="カレンダー">
            {OWN_CALENDARS.map((c) => (
              <button
                key={c.id}
                type="button"
                role="radio"
                aria-checked={d.calendarId === c.id}
                onClick={() => set("calendarId", c.id)}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-[14px] ${
                  d.calendarId === c.id ? "bg-surface font-medium shadow-sm" : "text-muted"
                }`}
              >
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: c.colorVar }} />
                {c.name}
              </button>
            ))}
          </div>
        </div>
        {!d.allDay && (
          <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 text-[15px]">
            <input className={inputCls} type="time" step={300} aria-label="開始" value={d.startTime} onChange={(e) => setStartTime(e.target.value)} />
            <span className="text-muted">〜</span>
            <input className={inputCls} type="time" step={300} aria-label="終了" value={d.endTime} onChange={(e) => set("endTime", e.target.value)} />
          </div>
        )}
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 text-[15px]">
          <input className={inputCls} type="date" aria-label="日付" value={d.date} onChange={(e) => setDate(e.target.value)} />
          <label className="flex items-center gap-2">
            終日
            <input type="checkbox" className="ios-switch" checked={d.allDay} onChange={(e) => toggleAllDay(e.target.checked)} />
          </label>
        </div>
        {(d.allDay || d.multiDay) && (
          <label className="grid grid-cols-[4.5em_1fr] items-center gap-2 text-[15px]">
            終わりの日
            <input className={inputCls} type="date" value={d.endDate} onChange={(e) => set("endDate", e.target.value)} />
          </label>
        )}
        {d.allDay && (
          <label className="flex items-center justify-between gap-3 text-[15px]">
            <span>家にいない（帰省・旅行など）</span>
            <input type="checkbox" className="ios-switch" checked={d.awayFromHome} onChange={(e) => set("awayFromHome", e.target.checked)} />
          </label>
        )}
        <input className={inputCls} placeholder="場所" aria-label="場所" value={d.location} onChange={(e) => set("location", e.target.value)} />
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-[13px] text-muted">
            移動時間（分・任意）
            <input
              className={inputCls}
              type="number"
              inputMode="numeric"
              min={0}
              step={5}
              placeholder="自動"
              value={d.travelMinutes}
              onChange={(e) => set("travelMinutes", e.target.value)}
            />
          </label>
          <label className="flex items-center justify-between gap-2 self-end rounded-lg border border-line px-3 py-2 text-[15px]">
            在宅
            <input type="checkbox" className="ios-switch" checked={d.atHome} onChange={(e) => set("atHome", e.target.checked)} />
          </label>
        </div>
        <label className="flex items-center justify-between gap-2 rounded-lg border border-line px-3 py-2 text-[15px]">
          <span>顔を出す（身支度をする）</span>
          <input type="checkbox" className="ios-switch" checked={d.needsPrep} onChange={(e) => set("needsPrep", e.target.checked)} />
        </label>
        <textarea
          className={`${inputCls} min-h-20`}
          placeholder="メモ"
          aria-label="メモ"
          value={d.description}
          onChange={(e) => set("description", e.target.value)}
        />
        {extra}
        {error && <p className="text-[14px] text-accent">{error}</p>}
        <button type="submit" className="press rounded-xl bg-tint py-2.5 text-[16px] font-semibold text-on-tint">
          {isNew ? "追加" : "保存"}
        </button>
        {!isNew && (
          <DangerButton confirm={`「${initial.title}」を削除しますか？`} onClick={() => onDelete(initial.id)}>
            予定を削除
          </DangerButton>
        )}
      </form>
    </Sheet>
  );
}

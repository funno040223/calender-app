"use client";

import { useState, type FormEvent } from "react";
import type { OwnEvent } from "@/lib/mock/store";
import { OWN_CALENDARS, type OwnCalendarId } from "@/lib/mock/calendars";
import { DAY_MS, MIN, dayStartOf, fromInputDateTime, newId, toInputDate, toInputDateTime } from "@/lib/mock/jst";
import Sheet from "./Sheet";

interface Draft {
  calendarId: OwnCalendarId;
  title: string;
  allDay: boolean;
  start: string;
  end: string;
  location: string;
  description: string;
  travelMinutes: string;
  atHome: boolean;
}

function toDraft(ev: OwnEvent): Draft {
  return {
    calendarId: ev.calendarId ?? "own",
    title: ev.title,
    allDay: !!ev.allDay,
    start: ev.allDay ? toInputDate(ev.start) : toInputDateTime(ev.start),
    // 終日の終わりは「翌日 0:00」なので、画面では最終日を出す
    end: ev.allDay ? toInputDate(ev.end - DAY_MS) : toInputDateTime(ev.end),
    location: ev.location ?? "",
    description: ev.description ?? "",
    travelMinutes: ev.travelMinutes === undefined ? "" : String(ev.travelMinutes),
    atHome: !!ev.atHome,
  };
}

const inputCls =
  "w-full min-w-0 rounded-lg border border-line bg-surface2 px-3 py-2 text-[16px] outline-none focus:border-accent";

export default function EventForm({
  initial,
  isNew,
  onSave,
  onDelete,
  onClose,
}: {
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
    const s = fromInputDateTime(d.start) ?? initial.start;
    const e = fromInputDateTime(d.end) ?? initial.end;
    if (allDay) {
      setD({ ...d, allDay, start: toInputDate(s), end: toInputDate(Math.max(s, e - (d.allDay ? 0 : MIN))) });
    } else {
      const day = dayStartOf(s);
      setD({ ...d, allDay, start: toInputDateTime(day + 9 * 60 * MIN), end: toInputDateTime(day + 10 * 60 * MIN) });
    }
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    let start = fromInputDateTime(d.start);
    let end = fromInputDateTime(d.end);
    if (start === undefined || end === undefined) return setError("日時を入力してください");
    if (d.allDay) {
      start = dayStartOf(start);
      end = dayStartOf(end) + DAY_MS;
    }
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
        <label className="flex items-center justify-between text-[15px]">
          終日
          <input type="checkbox" className="ios-switch" checked={d.allDay} onChange={(e) => toggleAllDay(e.target.checked)} />
        </label>
        <label className="grid grid-cols-[3.5em_1fr] items-center gap-2 text-[15px]">
          開始
          <input
            className={inputCls}
            type={d.allDay ? "date" : "datetime-local"}
            step={900}
            value={d.start}
            onChange={(e) => set("start", e.target.value)}
          />
        </label>
        <label className="grid grid-cols-[3.5em_1fr] items-center gap-2 text-[15px]">
          終了
          <input
            className={inputCls}
            type={d.allDay ? "date" : "datetime-local"}
            step={900}
            value={d.end}
            onChange={(e) => set("end", e.target.value)}
          />
        </label>
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
        <textarea
          className={`${inputCls} min-h-20`}
          placeholder="メモ"
          aria-label="メモ"
          value={d.description}
          onChange={(e) => set("description", e.target.value)}
        />
        {error && <p className="text-[14px] text-accent">{error}</p>}
        <button type="submit" className="rounded-xl bg-accent py-2.5 text-[16px] font-semibold text-white">
          {isNew ? "追加" : "保存"}
        </button>
        {!isNew && (
          <button
            type="button"
            onClick={() => onDelete(initial.id)}
            className="rounded-xl py-2.5 text-[16px] text-accent hover:bg-surface2"
          >
            予定を削除
          </button>
        )}
      </form>
    </Sheet>
  );
}

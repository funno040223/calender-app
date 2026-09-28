"use client";

import { useState } from "react";
import { useApp } from "@/components/app/StoreProvider";
import { AddRow, EmptyNote, Group, Row, Segmented, Switch, TimeInput, inputCls } from "@/components/ui/controls";
import { DAY_MS, WEEKDAY_JA, dayStartOf, formatDate, newId } from "@/lib/mock/jst";
import { courseTimes, dateKeyOf, dayStartOfKey, formatMinuteOfDay, hhmmToMinutes, minutesToHHMM, type Course, type Period } from "@/lib/mock/model";
import EditSheet, { Field, upsert } from "./EditSheet";

/** 月曜はじまりの曜日の並び */
const WEEK = [1, 2, 3, 4, 5, 6, 0];

function PeriodsGroup() {
  const { state, update } = useApp();
  const periods = [...state.periods].sort((a, b) => a.number - b.number);
  const setPeriod = (number: number, patch: Partial<Period>) =>
    update((d) => ({ ...d, periods: d.periods.map((p) => (p.number === number ? { ...p, ...patch } : p)) }));
  const used = (n: number) => state.courses.filter((c) => c.period === n).length;

  return (
    <Group title="時限" footer="授業の「時限」はこの時刻で予定になります。時限に合わないゼミなどは、授業ごとに時刻を指定できます。">
      {periods.map((p) => (
        <div key={p.number} className="flex min-h-11 items-center gap-2 px-4 py-1.5">
          <span className="w-10 shrink-0 text-[16px] font-medium">{p.number}限</span>
          <TimeInput label={`${p.number}限の開始`} value={p.start} onCommit={(v) => setPeriod(p.number, { start: v })} />
          <span className="text-muted">〜</span>
          <TimeInput label={`${p.number}限の終了`} value={p.end} onCommit={(v) => setPeriod(p.number, { end: v })} />
          <button
            type="button"
            className="ml-auto shrink-0 px-1 text-[14px] text-accent"
            aria-label={`${p.number}限を削除`}
            onClick={() => {
              const n = used(p.number);
              if (n > 0 && !window.confirm(`${p.number}限を使っている授業が${n}件あります。削除すると、その授業は予定に出なくなります。よろしいですか？`)) return;
              update((d) => ({ ...d, periods: d.periods.filter((x) => x.number !== p.number) }));
            }}
          >
            削除
          </button>
        </div>
      ))}
      <AddRow
        onClick={() => {
          const last = periods.at(-1);
          const start = last ? last.end + 10 : 9 * 60;
          update((d) => ({ ...d, periods: [...d.periods, { number: (last?.number ?? 0) + 1, start, end: start + 90 }] }));
        }}
      >
        時限を追加
      </AddRow>
    </Group>
  );
}

interface Draft {
  name: string;
  weekday: number;
  mode: "period" | "time";
  period: number;
  start: string;
  end: string;
  termStart: string;
  termEnd: string;
  location: string;
  optional: boolean;
  cancelledDates: string[];
}

function CourseForm({ course, onClose }: { course?: Course; onClose: () => void }) {
  const { state, update } = useApp();
  const periods = [...state.periods].sort((a, b) => a.number - b.number);
  const [d, setD] = useState<Draft>(() => {
    const today = dayStartOf(Date.now());
    return {
      name: course?.name ?? "",
      weekday: course?.weekday ?? 1,
      mode: course && course.period === undefined ? "time" : "period",
      period: course?.period ?? periods[0]?.number ?? 1,
      start: minutesToHHMM(course?.startMinute ?? 13 * 60),
      end: minutesToHHMM(course?.endMinute ?? 15 * 60),
      termStart: course?.termStart ?? dateKeyOf(today),
      termEnd: course?.termEnd ?? dateKeyOf(today + 15 * 7 * DAY_MS),
      location: course?.location ?? "",
      optional: course?.optional ?? false,
      cancelledDates: course?.cancelledDates ?? [],
    };
  });
  const [error, setError] = useState("");
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((p) => ({ ...p, [k]: v }));

  const save = () => {
    if (!d.name.trim()) return setError("科目名を入力してください");
    const from = dayStartOfKey(d.termStart);
    const to = dayStartOfKey(d.termEnd);
    if (from === undefined || to === undefined || to < from) return setError("学期の終了日は開始日以降にしてください");
    const next: Course = {
      id: course?.id ?? newId("course"),
      name: d.name.trim(),
      weekday: d.weekday,
      termStart: d.termStart,
      termEnd: d.termEnd,
      optional: d.optional,
      cancelledDates: d.cancelledDates,
      attendedDates: d.optional ? (course?.attendedDates ?? []) : [],
      ...(d.location.trim() ? { location: d.location.trim() } : {}),
    };
    if (d.mode === "period") {
      if (!periods.some((p) => p.number === d.period)) return setError("時限を選んでください");
      next.period = d.period;
    } else {
      const s = hhmmToMinutes(d.start);
      const e = hhmmToMinutes(d.end);
      if (s === undefined || e === undefined || e <= s) return setError("終了は開始より後の時刻にしてください");
      next.startMinute = s;
      next.endMinute = e;
    }
    update((data) => ({ ...data, courses: upsert(data.courses, next) }));
    onClose();
  };

  return (
    <EditSheet
      title={course ? "授業を編集" : "授業を追加"}
      isNew={!course}
      error={error}
      onSave={save}
      onDelete={() => {
        update((data) => ({ ...data, courses: data.courses.filter((c) => c.id !== course?.id) }));
        onClose();
      }}
      deleteConfirm={`「${course?.name}」を時間割から削除しますか？`}
      onClose={onClose}
    >
      <Field label="科目名">
        <input className={inputCls} value={d.name} autoFocus={!course} onChange={(e) => set("name", e.target.value)} placeholder="例：ゼミ" />
      </Field>
      <Field label="曜日">
        <Segmented label="曜日" full value={d.weekday} onChange={(v) => set("weekday", v)} options={WEEK.map((w) => ({ value: w, label: WEEKDAY_JA[w] }))} />
      </Field>
      <Field label="時刻" help={d.mode === "time" ? "時限に合わないゼミなどは、時刻を直接指定します" : undefined}>
        <Segmented
          label="時刻の決め方"
          full
          value={d.mode}
          onChange={(v) => set("mode", v)}
          options={[
            { value: "period", label: "時限で選ぶ" },
            { value: "time", label: "時刻を指定" },
          ]}
        />
        {d.mode === "period" ? (
          <select className={inputCls} aria-label="時限" value={d.period} onChange={(e) => set("period", Number(e.target.value))}>
            {periods.map((p) => (
              <option key={p.number} value={p.number}>
                {p.number}限（{formatMinuteOfDay(p.start)}〜{formatMinuteOfDay(p.end)}）
              </option>
            ))}
          </select>
        ) : (
          <div className="flex items-center gap-2">
            <input className={inputCls} type="time" step={300} aria-label="開始" value={d.start} onChange={(e) => set("start", e.target.value)} />
            <span className="text-muted">〜</span>
            <input className={inputCls} type="time" step={300} aria-label="終了" value={d.end} onChange={(e) => set("end", e.target.value)} />
          </div>
        )}
      </Field>
      <Field label="学期">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          <input className={inputCls} type="date" aria-label="学期の開始日" value={d.termStart} onChange={(e) => set("termStart", e.target.value)} />
          <span className="text-muted">〜</span>
          <input className={inputCls} type="date" aria-label="学期の終了日" value={d.termEnd} onChange={(e) => set("termEnd", e.target.value)} />
        </div>
      </Field>
      <Field label="場所" help="「場所」に登録した名前を含めると、移動時間がわかります">
        <input className={inputCls} value={d.location} onChange={(e) => set("location", e.target.value)} placeholder="例：大学 3号館" />
      </Field>
      <label className="flex items-center justify-between gap-3">
        <span>
          <span className="block text-[16px]">任意参加</span>
          <span className="block text-[12px] text-muted">参加する回だけを予定として扱います（カレンダーの予定から回ごとに切り替え）</span>
        </span>
        <Switch label="任意参加" checked={d.optional} onChange={(v) => set("optional", v)} />
      </label>
      {d.cancelledDates.length > 0 && (
        <Field label="休講にした日">
          <ul className="flex flex-col divide-y divide-line rounded-lg bg-surface2">
            {d.cancelledDates.map((date) => (
              <li key={date} className="flex items-center justify-between px-3 py-2 text-[15px]">
                {formatDate(dayStartOfKey(date) ?? 0)}
                <button type="button" className="text-[14px] text-accent" onClick={() => set("cancelledDates", d.cancelledDates.filter((x) => x !== date))}>
                  休講を取り消す
                </button>
              </li>
            ))}
          </ul>
        </Field>
      )}
    </EditSheet>
  );
}

export default function Timetable() {
  const { state } = useApp();
  const [editing, setEditing] = useState<{ course?: Course } | null>(null);
  const courses = [...state.courses].sort((a, b) => {
    const wa = (a.weekday + 6) % 7;
    const wb = (b.weekday + 6) % 7;
    return wa - wb || (courseTimes(a, state.periods)?.start ?? 0) - (courseTimes(b, state.periods)?.start ?? 0);
  });
  const today = dayStartOf(state.plannedAt);

  return (
    <>
      <Group title="授業・ゼミ" footer="授業はカレンダーの予定を押すと、その回だけ休講にできます。">
        {courses.length === 0 && <EmptyNote>授業はまだありません。</EmptyNote>}
        {courses.map((c) => {
          const t = courseTimes(c, state.periods);
          const time = t ? `${formatMinuteOfDay(t.start)}〜${formatMinuteOfDay(t.end)}` : "時刻が未設定";
          const ended = (dayStartOfKey(c.termEnd) ?? Infinity) < today;
          return (
            <Row
              key={c.id}
              leading={<span className="w-6 shrink-0 text-center text-[15px] font-semibold">{WEEKDAY_JA[c.weekday]}</span>}
              label={
                <span className="flex items-center gap-1.5">
                  <span className="truncate">{c.name}</span>
                  {c.optional && <span className="shrink-0 rounded bg-surface2 px-1.5 text-[11px] text-muted">任意</span>}
                </span>
              }
              sub={`${c.period !== undefined ? `${c.period}限 ` : ""}${time}${c.location ? `・${c.location}` : ""}${ended ? "・学期終了" : ""}`}
              onClick={() => setEditing({ course: c })}
            />
          );
        })}
        <AddRow onClick={() => setEditing({})}>授業を追加</AddRow>
      </Group>
      <PeriodsGroup />
      {editing && <CourseForm key={editing.course?.id ?? "new"} course={editing.course} onClose={() => setEditing(null)} />}
    </>
  );
}


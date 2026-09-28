"use client";

import { useState } from "react";
import type { AvoidWindow } from "@/lib/scheduler";
import { useApp } from "@/components/app/StoreProvider";
import { AddRow, Chip, EmptyNote, Group, Row, Segmented, inputCls } from "@/components/ui/controls";
import { TAGS } from "@/lib/mock/store";
import { WEEKDAY_JA, newId } from "@/lib/mock/jst";
import { formatMinuteOfDay, hhmmToMinutes, minutesToHHMM, spanFrom } from "@/lib/mock/model";
import EditSheet, { Field, upsert } from "./EditSheet";

const WEEK = [1, 2, 3, 4, 5, 6, 0];
type DayType = "all" | "holiday" | "onDay";
const DAY_TYPES: { value: DayType; label: string }[] = [
  { value: "all", label: "毎日" },
  { value: "holiday", label: "休日だけ" },
  { value: "onDay", label: "オンの日だけ" },
];

function AvoidForm({ win, onClose }: { win?: AvoidWindow; onClose: () => void }) {
  const { update } = useApp();
  const [label, setLabel] = useState(win?.label ?? "");
  const [weekdays, setWeekdays] = useState<number[]>(win?.weekdays ?? []);
  const [start, setStart] = useState(minutesToHHMM(win?.start ?? 22 * 60));
  const [end, setEnd] = useState(minutesToHHMM(win?.end ?? 24 * 60));
  const [tagIds, setTagIds] = useState<string[]>(win?.tagIds ?? []);
  const [hard, setHard] = useState(win?.hard ?? false);
  const [dayType, setDayType] = useState<DayType>(win?.dayType ?? "all");
  const [error, setError] = useState("");

  const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  const save = () => {
    const s = hhmmToMinutes(start);
    const e = hhmmToMinutes(end);
    if (s === undefined || e === undefined) return setError("時刻を入力してください");
    const span = spanFrom(s, e);
    const next: AvoidWindow = {
      id: win?.id ?? newId("avoid"),
      label: label.trim() || "避けたい時間",
      start: span.start,
      end: span.end,
      hard,
      ...(weekdays.length > 0 && weekdays.length < 7 ? { weekdays: [...weekdays].sort() } : {}),
      ...(tagIds.length > 0 ? { tagIds } : {}),
      ...(dayType !== "all" ? { dayType } : {}),
    };
    update((d) => ({ ...d, avoidWindows: upsert(d.avoidWindows, next) }));
    onClose();
  };

  return (
    <EditSheet
      title={win ? "避けたい時間帯を編集" : "避けたい時間帯を追加"}
      isNew={!win}
      error={error}
      onSave={save}
      onDelete={() => {
        update((d) => ({ ...d, avoidWindows: d.avoidWindows.filter((w) => w.id !== win?.id) }));
        onClose();
      }}
      deleteConfirm={`「${win?.label}」を削除しますか？`}
      onClose={onClose}
    >
      <Field label="名前">
        <input className={inputCls} value={label} autoFocus={!win} onChange={(e) => setLabel(e.target.value)} placeholder="例：夜は作業しない" />
      </Field>
      <Field label="時間" help="終わりが始まりより前なら、翌日の時刻です">
        <div className="flex items-center gap-2">
          <input className={inputCls} type="time" step={300} aria-label="始まり" value={start} onChange={(e) => setStart(e.target.value)} />
          <span className="text-muted">〜</span>
          <input className={inputCls} type="time" step={300} aria-label="終わり" value={end} onChange={(e) => setEnd(e.target.value)} />
        </div>
      </Field>
      <Field label="曜日" help={weekdays.length === 0 || weekdays.length === 7 ? "選ばなければ毎日" : undefined}>
        <div className="flex flex-wrap gap-1.5">
          {WEEK.map((w) => (
            <Chip key={w} on={weekdays.includes(w)} onClick={() => setWeekdays(toggle(weekdays, w))}>
              {WEEKDAY_JA[w]}
            </Chip>
          ))}
        </div>
      </Field>
      <Field label="対象の日" help="休日は「遊び」以外の予定がない日、オンの日はそれ以外の日です">
        <Segmented label="対象の日" full value={dayType} onChange={setDayType} options={DAY_TYPES} />
      </Field>
      <Field label="対象のタスク" help={tagIds.length === 0 ? "選ばなければ、すべてのタスク" : undefined}>
        <div className="flex flex-wrap gap-1.5">
          {TAGS.map((t) => (
            <Chip key={t.id} on={tagIds.includes(t.id)} onClick={() => setTagIds(toggle(tagIds, t.id))}>
              {t.name}
            </Chip>
          ))}
        </div>
      </Field>
      <Field label="強さ" help={hard ? "この時間には入れません" : "ほかに場所がないときだけ入れます"}>
        <Segmented
          label="強さ"
          full
          value={hard ? "hard" : "soft"}
          onChange={(v) => setHard(v === "hard")}
          options={[
            { value: "soft", label: "なるべく避ける" },
            { value: "hard", label: "入れない" },
          ]}
        />
      </Field>
    </EditSheet>
  );
}

function summary(w: AvoidWindow): string {
  const days = w.weekdays ? [...w.weekdays].sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7)).map((d) => WEEKDAY_JA[d]).join("") : "毎日";
  const type = w.dayType === "holiday" ? "・休日だけ" : w.dayType === "onDay" ? "・オンの日だけ" : "";
  const tags = w.tagIds?.length ? `・${w.tagIds.map((id) => TAGS.find((t) => t.id === id)?.name ?? "?").join("、")}` : "";
  return `${days}${type}・${formatMinuteOfDay(w.start)}〜${formatMinuteOfDay(w.end)}${tags}`;
}

export default function AvoidWindows() {
  const { state } = useApp();
  const [editing, setEditing] = useState<{ win?: AvoidWindow } | null>(null);
  return (
    <>
      <Group footer="タスクを置くときに、この時間を避けます。予定や習慣には影響しません。">
        {state.avoidWindows.length === 0 && <EmptyNote>まだありません。</EmptyNote>}
        {state.avoidWindows.map((w) => (
          <Row key={w.id} label={w.label} sub={summary(w)} detail={w.hard ? "入れない" : "なるべく避ける"} onClick={() => setEditing({ win: w })} />
        ))}
        <AddRow onClick={() => setEditing({})}>時間帯を追加</AddRow>
      </Group>
      {editing && <AvoidForm key={editing.win?.id ?? "new"} win={editing.win} onClose={() => setEditing(null)} />}
    </>
  );
}

"use client";

import type { Settings } from "@/lib/scheduler";
import { useApp } from "@/components/app/StoreProvider";
import { FieldRow, Group, NumberInput, Segmented, Switch, TimeInput } from "@/components/ui/controls";
import { formatMinutes } from "@/lib/mock/jst";

type NumKey = {
  [K in keyof Settings]-?: Settings[K] extends number ? K : never;
}[keyof Settings];

interface MinutesField {
  key: NumKey;
  label: string;
  min?: number;
  max?: number;
  step?: number;
}

/** 行動ポイント（分ではなくポイントで入れる項目） */
const ENERGY_FIELDS: MinutesField[] = [
  { key: "dailyEnergyBudget", label: "1日の上限", min: 1, max: 30, step: 0.5 },
  { key: "awayEventEnergy", label: "外出1回", max: 10, step: 0.5 },
  { key: "awayEventEnergyPerHour", label: "外出1時間", max: 5, step: 0.5 },
  { key: "homeEventEnergyPerHour", label: "在宅の予定1時間", max: 5, step: 0.5 },
];

const GROUPS: { title: string; fields: MinutesField[] }[] = [
  {
    title: "睡眠と朝",
    fields: [
      { key: "sleepMinutes", label: "寝床の時間", min: 240, max: 720, step: 15 },
      { key: "routineMinutes", label: "朝ルーティン", max: 180 },
      { key: "prepMinutes", label: "身支度（人に会う日）", max: 180 },
      { key: "homeWakeLeadMinutes", label: "在宅の予定の前の余裕", max: 240 },
      { key: "maxWakeShiftMinutesPerDay", label: "起床時刻のずれの上限", max: 240, step: 15 },
    ],
  },
  {
    title: "1日の量",
    fields: [
      { key: "dailyTaskCapMinutes", label: "タスクの量の目安", min: 30, max: 960, step: 30 },
      { key: "outingDayAwayMinutes", label: "外出の日とみなす長さ", min: 60, max: 960, step: 30 },
      { key: "minSlackMinutesPerDay", label: "残しておく余白", max: 600, step: 15 },
    ],
  },
  {
    title: "休憩",
    fields: [
      { key: "breakMinutes", label: "タスクのあとの休憩", max: 120 },
      { key: "restAfterAwayEventMinutes", label: "外出から帰ったあとの休憩", max: 180 },
    ],
  },
];

export default function BasicSettings() {
  const { state, update } = useApp();
  const s = state.settings;
  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => update((d) => ({ ...d, settings: { ...d.settings, [k]: v } }));

  const minutesRow = (f: MinutesField) => (
    <FieldRow key={f.key} label={f.label}>
      <NumberInput label={f.label} value={s[f.key]} min={f.min ?? 0} max={f.max} step={f.step ?? 5} onCommit={(v) => v !== undefined && set(f.key, v)} />
      <span className="whitespace-nowrap text-[13px] text-muted">分{s[f.key] >= 60 ? `（${formatMinutes(s[f.key])}）` : ""}</span>
    </FieldRow>
  );

  return (
    <>
      <Group title="起床">
        <FieldRow label="いつもの起床時刻">
          <TimeInput label="いつもの起床時刻" value={s.defaultWakeMinuteOfDay} onCommit={(v) => set("defaultWakeMinuteOfDay", v)} />
        </FieldRow>
        <FieldRow label="1週間の起床をそろえる">
          <Switch label="1週間の起床をそろえる" checked={s.fixedWakeMode} onChange={(v) => set("fixedWakeMode", v)} />
        </FieldRow>
      </Group>
      <Group title="タスクの置き方">
        <div className="px-4 py-3">
          <Segmented
            label="タスクの置き方"
            full
            value={s.taskStrategy ?? "standard"}
            onChange={(v) => set("taskStrategy", v)}
            options={[
              { value: "standard", label: "ふつう" },
              { value: "early", label: "前倒し" },
              { value: "spread", label: "分散" },
            ]}
          />
        </div>
      </Group>
      <Group title="行動ポイント">
        {ENERGY_FIELDS.map((f) => (
          <FieldRow key={f.key} label={f.label}>
            <NumberInput label={f.label} value={s[f.key]} min={f.min ?? 0} max={f.max} step={f.step} onCommit={(v) => v !== undefined && set(f.key, v)} />
            <span className="whitespace-nowrap text-[13px] text-muted">ポイント</span>
          </FieldRow>
        ))}
      </Group>
      {GROUPS.map((g) => (
        <Group key={g.title} title={g.title}>
          {g.fields.map(minutesRow)}
        </Group>
      ))}
      <p className="px-4 text-[12px] text-muted">変えるとすぐに、カレンダーと「今日」の計画を組み直します。</p>
    </>
  );
}

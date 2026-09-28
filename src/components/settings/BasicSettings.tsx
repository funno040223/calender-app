"use client";

import type { Settings } from "@/lib/scheduler";
import { useApp } from "@/components/app/StoreProvider";
import { FieldRow, Group, NumberInput, Switch, TimeInput } from "@/components/ui/controls";
import { formatMinutes } from "@/lib/mock/jst";

type NumKey = {
  [K in keyof Settings]: Settings[K] extends number ? K : never;
}[keyof Settings];

interface MinutesField {
  key: NumKey;
  label: string;
  help: string;
  min?: number;
  max?: number;
  step?: number;
}

/** 行動ポイント（分ではなくポイントで入れる項目） */
const ENERGY_FIELDS: MinutesField[] = [
  { key: "dailyEnergyBudget", label: "1日の上限", help: "これを超える日は、ずらせる作業を軽い日へ回し、発散を提案します", min: 1, max: 30, step: 0.5 },
  { key: "awayEventEnergy", label: "外出1回", help: "外出する予定1回ごとのポイント", max: 10, step: 0.5 },
  { key: "awayEventEnergyPerHour", label: "外出1時間", help: "外出する予定の1時間ごと（行き帰りの移動を含む）", max: 5, step: 0.5 },
  { key: "homeEventEnergyPerHour", label: "在宅の予定1時間", help: "オンラインなど在宅の予定の1時間ごと", max: 5, step: 0.5 },
];

const GROUPS: { title: string; fields: MinutesField[] }[] = [
  {
    title: "睡眠と朝",
    fields: [
      { key: "sleepMinutes", label: "睡眠時間", help: "就寝は、次の日の起床時刻からこの時間を引いて決めます", min: 240, max: 720, step: 15 },
      { key: "routineMinutes", label: "朝ルーティン", help: "起きてからの朝ルーティンにかける時間", max: 180 },
      { key: "prepMinutes", label: "出かける準備", help: "朝ルーティンのあと、家を出るまでの身支度", max: 180 },
      { key: "homeWakeLeadMinutes", label: "在宅の予定の前の余裕", help: "在宅の予定しかない日は、最初の予定のこの時間前に起きます", max: 240 },
      { key: "maxWakeShiftMinutesPerDay", label: "起床時刻のずれの上限", help: "前の日との起床時刻の差をこの時間までにします（早めるほうへそろえます）", max: 240, step: 15 },
    ],
  },
  {
    title: "1日の量",
    fields: [
      { key: "dailyTaskCapMinutes", label: "タスクの量の目安", help: "1日にタスクを入れる量。超えそうなら別の日を優先します", min: 30, max: 960, step: 30 },
      { key: "outingDayAwayMinutes", label: "外出の日とみなす長さ", help: "家にいない時間（移動を含む）がこれ以上の日は、自炊と洗濯を入れず、食事は外食・お弁当にします", min: 60, max: 960, step: 30 },
      { key: "minSlackMinutesPerDay", label: "残しておく余白", help: "何も入れない時間を1日にこれだけ残します。締切に間に合わないときだけ削ります", max: 600, step: 15 },
    ],
  },
  {
    title: "休憩",
    fields: [
      { key: "breakMinutes", label: "タスクのあとの休憩", help: "タスクの枠のあとに空ける時間（種類ごとの設定があればそちら）", max: 120 },
      { key: "restAfterAwayEventMinutes", label: "外出から帰ったあとの休憩", help: "外出する予定から帰ったあとに空ける時間", max: 180 },
    ],
  },
];

export default function BasicSettings() {
  const { state, update } = useApp();
  const s = state.settings;
  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => update((d) => ({ ...d, settings: { ...d.settings, [k]: v } }));

  const minutesRow = (f: MinutesField) => (
    <FieldRow key={f.key} label={f.label} help={f.help}>
      <NumberInput label={f.label} value={s[f.key]} min={f.min ?? 0} max={f.max} step={f.step ?? 5} onCommit={(v) => v !== undefined && set(f.key, v)} />
      <span className="whitespace-nowrap text-[13px] text-muted">分{s[f.key] >= 60 ? `（${formatMinutes(s[f.key])}）` : ""}</span>
    </FieldRow>
  );

  return (
    <>
      <Group title="起床">
        <FieldRow label="いつもの起床時刻" help="予定がない日はこの時刻に起きます。予定がある日も、遅くともこの時刻には起きます">
          <TimeInput label="いつもの起床時刻" value={s.defaultWakeMinuteOfDay} onCommit={(v) => set("defaultWakeMinuteOfDay", v)} />
        </FieldRow>
        <FieldRow label="1週間の起床をそろえる" help="オンにすると、1週間でいちばん早い日の起床時刻に毎日そろえます">
          <Switch label="1週間の起床をそろえる" checked={s.fixedWakeMode} onChange={(v) => set("fixedWakeMode", v)} />
        </FieldRow>
      </Group>
      <Group title="行動ポイント" footer="習慣ごとのポイント（洗濯 1、自炊 2、散歩 -1 など）は「習慣」の設定で変えられます。タスクは集中系が1時間1、事務系が1時間0.5です。">
        {ENERGY_FIELDS.map((f) => (
          <FieldRow key={f.key} label={f.label} help={f.help}>
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

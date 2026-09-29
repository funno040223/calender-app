"use client";

import { useState } from "react";
import { buildOutlook } from "@/lib/scheduler";
import { useApp } from "@/components/app/StoreProvider";
import { DAY_MS, MIN, TZ, dayStartOf, formatDate, formatMinutes, formatTime, newId } from "@/lib/mock/jst";
import type { RewardRates } from "@/lib/mock/model";
import { periodStats, rewardBalance, rewardEarned, type PeriodStats } from "@/lib/mock/stats";
import { Group, NumberInput, Row, ScreenHeader, Segmented, inputBase } from "@/components/ui/controls";

const yen = (n: number) => `¥${Math.round(n).toLocaleString("ja-JP")}`;
const STATUS = {
  ok: { label: "順調", cls: "bg-ok text-white" },
  tight: { label: "きつい", cls: "bg-[var(--cal-class)] text-white" },
  late: { label: "間に合わない", cls: "bg-accent text-white" },
};

/** ご褒美のお金：たまった分から、使った分を引いた残り。使ったら金額を記録する */
function Reward() {
  const { state, update } = useApp();
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  // 「今」は組み直した時刻（描くたびに Date.now() を呼ばない）
  const today = dayStartOf(state.plannedAt);
  const monday = today - ((new Date(today + TZ * MIN).getUTCDay() + 6) % 7) * DAY_MS;
  const spend = () => {
    const n = Math.round(Number(amount));
    if (!Number.isFinite(n) || n <= 0) return;
    update((d) => ({ ...d, rewardSpends: [...d.rewardSpends, { id: newId("spend"), at: Date.now(), amount: n, note: note.trim() || undefined }] }));
    setAmount("");
    setNote("");
  };
  const recent = [...state.rewardSpends].sort((a, b) => b.at - a.at).slice(0, 5);
  return (
    <Group title="ご褒美">
      <div className="flex items-end justify-between px-4 pt-3">
        <p className="text-[34px] font-bold tabular-nums leading-none">{yen(rewardBalance(state))}</p>
        <p className="text-[13px] tabular-nums text-muted">今週 +{yen(rewardEarned(state, monday, monday + 7 * DAY_MS))}</p>
      </div>
      <div className="flex items-center gap-2 px-4 py-3">
        <input
          className={`${inputBase} w-24 text-right`}
          type="number"
          inputMode="numeric"
          placeholder="円"
          aria-label="使った金額"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        <input className={`${inputBase} flex-1`} placeholder="メモ" aria-label="メモ" value={note} onChange={(e) => setNote(e.target.value)} />
        <button type="button" onClick={spend} className="shrink-0 rounded-lg bg-accent px-3 py-2 text-[15px] font-medium text-white">
          使った
        </button>
      </div>
      {recent.map((s) => (
        <Row key={s.id} label={s.note ?? "ご褒美"} sub={formatDate(s.at)} detail={`−${yen(s.amount)}`}>
          <button
            type="button"
            aria-label="取り消す"
            onClick={() => update((d) => ({ ...d, rewardSpends: d.rewardSpends.filter((x) => x.id !== s.id) }))}
            className="shrink-0 px-1 text-[18px] leading-none text-muted"
          >
            ×
          </button>
        </Row>
      ))}
    </Group>
  );
}

function Meter({ label, done, total, prev }: { label: string; done: number; total: number; prev?: { done: number; total: number } }) {
  const r = total > 0 ? Math.min(1, done / total) : 0;
  const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));
  return (
    <div className="flex flex-col gap-1.5 px-4 py-2.5">
      <div className="flex items-baseline gap-2">
        <span className="flex-1 text-[15px]">{label}</span>
        <span className="text-[15px] font-semibold tabular-nums">
          {fmt(done)} / {total}
        </span>
        {prev && prev.total > 0 && (
          <span className="w-16 text-right text-[12px] tabular-nums text-muted" aria-label="その前の2週間">
            前 {fmt(prev.done)}/{prev.total}
          </span>
        )}
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-surface2" role="meter" aria-label={label} aria-valuenow={done} aria-valuemin={0} aria-valuemax={total}>
        <div className="h-full rounded-full bg-ok" style={{ width: `${r * 100}%` }} />
      </div>
    </div>
  );
}

/** 直近2週間（とその前の2週間）に、予定どおりできた数 */
function Adherence() {
  const { state } = useApp();
  const now = state.plannedAt;
  const end = dayStartOf(now) + DAY_MS;
  const cur = periodStats(state, end - 14 * DAY_MS, end, now);
  const prev = periodStats(state, end - 28 * DAY_MS, end - 14 * DAY_MS, now);
  const items: { label: string; get: (s: PeriodStats) => { done: number; total: number } }[] = [
    { label: "起床", get: (s) => ({ done: s.wake, total: s.days }) },
    { label: "朝ルーティン", get: (s) => ({ done: s.routine, total: s.days }) },
    { label: "習慣", get: (s) => ({ done: s.habit.done, total: s.habit.expected }) },
    { label: "タスクの枠", get: (s) => s.task },
  ];
  return (
    <Group title="直近2週間">
      <div className="py-1">
        {items.map((it) => (
          <Meter key={it.label} label={it.label} {...it.get(cur)} prev={it.get(prev)} />
        ))}
      </div>
    </Group>
  );
}

/** 今週・来週の見通しを、日ごとに */
function OutlookDetail() {
  const { state, openTask } = useApp();
  const [week, setWeek] = useState(0);
  const weeks = buildOutlook({ now: state.plannedAt, result: state.result, minSlackMinutesPerDay: state.settings.minSlackMinutesPerDay, tzOffsetMinutes: TZ });
  const w = weeks[week];
  const overlap = (a: { start: number; end: number }, from: number, to: number) => Math.max(0, Math.min(a.end, to) - Math.max(a.start, from));
  const from0 = state.plannedAt;
  const days = Array.from({ length: 7 }, (_, i) => w.start + i * DAY_MS);
  return (
    <Group title="見通し">
      <div className="flex items-center gap-3 px-4 pt-3">
        <Segmented
          label="週"
          value={week}
          onChange={setWeek}
          options={[
            { value: 0, label: "今週" },
            { value: 1, label: "来週" },
          ]}
        />
        <span className={`shrink-0 whitespace-nowrap rounded-full px-2 py-0.5 text-[12px] font-semibold ${STATUS[w.status].cls}`}>{STATUS[w.status].label}</span>
      </div>
      <p className="px-4 pt-2 text-[13px] tabular-nums text-muted">
        タスク {formatMinutes(w.taskMinutes)}・空き {formatMinutes(w.freeMinutes)}
      </p>
      <ul className="flex flex-col py-2">
        {days.map((d) => {
          const to = d + DAY_MS;
          const from = Math.max(d, from0);
          const task = state.result.blocks.filter((b) => b.kind === "task").reduce((s, b) => s + overlap(b, from, to), 0) / MIN;
          const free = state.result.freeGaps.reduce((s, g) => s + overlap(g, from, to), 0) / MIN;
          const due = state.tasks.filter((t) => t.deadline !== undefined && t.deadline >= d && t.deadline < to);
          const past = to <= from0;
          return (
            <li key={d} className={`flex flex-col gap-1 px-4 py-1.5 ${past ? "opacity-40" : ""}`}>
              <div className="flex items-baseline gap-3 text-[14px] tabular-nums">
                <span className="w-16 shrink-0 font-medium">{formatDate(d)}</span>
                <span className="flex-1 text-muted">タスク {formatMinutes(Math.round(task))}</span>
                <span className="text-muted">空き {formatMinutes(Math.round(free))}</span>
              </div>
              {due.map((t) => {
                const late = w.late.find((l) => l.taskId === t.id);
                return (
                  <button key={t.id} type="button" onClick={() => openTask(t.id)} className={`ml-19 truncate text-left text-[13px] ${late ? "text-accent" : ""}`}>
                    〆 {formatTime(t.deadline!)} {t.title}
                    {late ? ` ・${formatMinutes(late.shortfallMinutes)}足りない` : ""}
                  </button>
                );
              })}
            </li>
          );
        })}
      </ul>
    </Group>
  );
}

/** ご褒美の金額（1回あたり） */
function Rates() {
  const { state, update } = useApp();
  const set = (k: keyof RewardRates) => (v: number | undefined) =>
    update((d) => ({ ...d, rewardRates: { ...d.rewardRates, [k]: v ?? 0 } }));
  const rows: { k: keyof RewardRates; label: string }[] = [
    { k: "wake", label: "起床" },
    { k: "routine", label: "朝ルーティン" },
    { k: "habit", label: "習慣" },
    { k: "task", label: "タスクの枠" },
  ];
  return (
    <Group title="金額（1回）">
      {rows.map((r) => (
        <Row key={r.k} label={r.label}>
          <NumberInput label={`${r.label}の金額`} value={state.rewardRates[r.k]} onCommit={set(r.k)} step={10} max={10000} />
          <span className="text-[15px] text-muted">円</span>
        </Row>
      ))}
    </Group>
  );
}

export default function StatsScreen() {
  return (
    <div className="h-full overflow-y-auto bg-grouped">
      <ScreenHeader title="記録" width="max-w-5xl" />
      <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 pb-8 sm:px-6 lg:grid lg:grid-cols-2 lg:items-start">
        <div className="flex flex-col gap-6">
          <Reward />
          <Adherence />
        </div>
        <div className="flex flex-col gap-6">
          <OutlookDetail />
          <Rates />
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useApp } from "@/components/app/StoreProvider";
import { DAY_MS, MIN, TZ, dayStartOf, formatDate, formatMinutes, formatTime, newId } from "@/lib/mock/jst";
import { dateKeyOf } from "@/lib/mock/model";
import { dailyGrid, dailyReward, periodStats, rewardBalance, rewardEarned, type CellState, type GridRow, type PeriodStats } from "@/lib/mock/stats";
import { Group, Row, ScreenHeader, inputBase } from "@/components/ui/controls";

const yen = (n: number) => `¥${Math.round(n).toLocaleString("ja-JP")}`;

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

const CELL_CLS: Record<CellState, string> = {
  full: "bg-ok",
  part: "bg-ok/40",
  miss: "bg-line",
  none: "bg-transparent border border-dashed border-line",
};
const ROWS: { key: GridRow; label: string; get: (s: PeriodStats) => { done: number; total: number } }[] = [
  { key: "wake", label: "起床", get: (s) => s.wake },
  { key: "routine", label: "朝ルーティン", get: (s) => s.routine },
  { key: "habit", label: "習慣", get: (s) => ({ done: s.habit.done, total: s.habit.expected }) },
  { key: "task", label: "タスク", get: (s) => s.task },
];
const fmtN = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

/** 直近14日の達成カレンダー（4行 × 14日）。右に2週間の数と、その前の2週間の数 */
function Adherence() {
  const { state } = useApp();
  const [picked, setPicked] = useState<{ row: GridRow; i: number }>();
  const now = state.plannedAt;
  const end = dayStartOf(now) + DAY_MS;
  const days = Array.from({ length: 14 }, (_, i) => end - (14 - i) * DAY_MS);
  const grid = dailyGrid(state, days, now);
  const cur = periodStats(state, end - 14 * DAY_MS, end, now);
  const prev = periodStats(state, end - 28 * DAY_MS, end - 14 * DAY_MS, now);
  const pickedRow = picked && ROWS.find((r) => r.key === picked.row);
  return (
    <Group title="直近2週間">
      <div className="flex flex-col gap-2 px-4 py-3">
        <div className="grid grid-cols-[5.25rem_1fr_3rem] items-end gap-x-2 text-[11px] tabular-nums text-muted">
          <span />
          <div className="grid grid-cols-14 gap-[2px]">
            {days.map((d, i) => (
              <span key={d} className="text-center">
                {i % 2 === 1 || i === 13 ? new Date(d + TZ * MIN).getUTCDate() : ""}
              </span>
            ))}
          </div>
          <span />
        </div>
        {ROWS.map((r) => {
          const c = r.get(cur);
          const p = r.get(prev);
          return (
            <div key={r.key} className="grid grid-cols-[5.25rem_1fr_3rem] items-center gap-x-2">
              <span className="whitespace-nowrap text-[13px]">{r.label}</span>
              <div className="grid grid-cols-14 gap-[2px]">
                {grid[r.key].map((cell, i) => (
                  <button
                    key={i}
                    type="button"
                    aria-label={`${formatDate(days[i])} ${r.label} ${cell.detail}`}
                    onClick={() => setPicked(picked?.row === r.key && picked.i === i ? undefined : { row: r.key, i })}
                    className={`aspect-square rounded-[4px] ${CELL_CLS[cell.state]} ${picked?.row === r.key && picked.i === i ? "ring-2 ring-fg" : ""}`}
                  />
                ))}
              </div>
              <span className="text-right text-[12px] tabular-nums">
                <span className="font-semibold">
                  {fmtN(c.done)}/{c.total}
                </span>
                {p.total > 0 && (
                  <span className="block whitespace-nowrap text-[11px] text-muted">
                    前 {fmtN(p.done)}/{p.total}
                  </span>
                )}
              </span>
            </div>
          );
        })}
        <p className="min-h-5 text-[13px] tabular-nums">
          {picked && pickedRow ? `${formatDate(days[picked.i])} ${pickedRow.label}：${grid[picked.row][picked.i].detail}` : ""}
        </p>
        <div className="flex flex-wrap gap-3 text-[12px] text-muted">
          {(
            [
              ["full", "できた"],
              ["part", "一部"],
              ["miss", "まだ"],
              ["none", "予定なし"],
            ] as const
          ).map(([k, l]) => (
            <span key={k} className="flex items-center gap-1">
              <span className={`inline-block h-3 w-3 rounded-[3px] ${CELL_CLS[k]}`} />
              {l}
            </span>
          ))}
        </div>
      </div>
    </Group>
  );
}

/** 日ごとの、たまった金額（上）と使った金額（下）。1本の軸（円） */
function RewardChart() {
  const { state } = useApp();
  const [picked, setPicked] = useState<number>();
  const end = dayStartOf(state.plannedAt) + DAY_MS;
  const days = Array.from({ length: 14 }, (_, i) => end - (14 - i) * DAY_MS);
  const data = dailyReward(state, days);
  const W = 336;
  const H = 150;
  const top = 14;
  const bottomPad = 18;
  const up = Math.max(10, ...data.map((d) => d.earned));
  const down = Math.max(0, ...data.map((d) => d.spent));
  // 使った日がなければ、下の余白は取らない
  const plotH = H - top - bottomPad;
  const zeroY = top + plotH * (down > 0 ? up / (up + down) : 1);
  const scale = (zeroY - top) / up;
  const slot = W / days.length;
  const bw = Math.min(16, slot - 4);
  const maxI = data.reduce((m, d, i) => (d.earned > data[m].earned ? i : m), 0);
  const bar = (x: number, h: number, dir: 1 | -1, cls: string, key: string) => {
    if (h <= 0) return null;
    const r = Math.min(4, h);
    // データの端だけ丸く、軸の側は四角
    const y0 = zeroY;
    const y1 = zeroY - dir * h;
    const d =
      dir === 1
        ? `M${x},${y0} V${y1 + r} Q${x},${y1} ${x + r},${y1} H${x + bw - r} Q${x + bw},${y1} ${x + bw},${y1 + r} V${y0} Z`
        : `M${x},${y0} V${y1 - r} Q${x},${y1} ${x + r},${y1} H${x + bw - r} Q${x + bw},${y1} ${x + bw},${y1 - r} V${y0} Z`;
    return <path key={key} d={d} className={cls} />;
  };
  const p = picked !== undefined ? data[picked] : undefined;
  return (
    <Group title="ご褒美の推移">
      <div className="px-4 py-3">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="日ごとのたまった金額と使った金額">
          <line x1={0} x2={W} y1={zeroY} y2={zeroY} className="stroke-line" strokeWidth={1} />
          {data.map((d, i) => {
            const x = i * slot + (slot - bw) / 2;
            return (
              <g key={d.day} onClick={() => setPicked(picked === i ? undefined : i)} className="cursor-pointer">
                <rect x={i * slot} y={0} width={slot} height={H} fill="transparent" />
                {picked === i && <rect x={i * slot + 1} y={top - 4} width={slot - 2} height={plotH + 8} rx={4} className="fill-surface2" />}
                {bar(x, d.earned * scale, 1, "fill-ok", "e")}
                {bar(x, d.spent * scale, -1, "fill-muted", "s")}
                {(i % 2 === 1 || i === days.length - 1) && (
                  <text x={i * slot + slot / 2} y={H - 4} textAnchor="middle" className="fill-muted text-[10px] tabular-nums">
                    {new Date(d.day + TZ * MIN).getUTCDate()}
                  </text>
                )}
              </g>
            );
          })}
          {data[maxI].earned > 0 && (
            <text x={maxI * slot + slot / 2} y={zeroY - data[maxI].earned * scale - 4} textAnchor="middle" className="fill-fg text-[10px] font-semibold tabular-nums">
              {yen(data[maxI].earned)}
            </text>
          )}
        </svg>
        <p className="min-h-5 pt-1 text-[13px] tabular-nums">
          {p ? `${formatDate(p.day)}　+${yen(p.earned)}${p.spent ? `　−${yen(p.spent)}` : ""}` : ""}
        </p>
        <div className="flex gap-3 text-[12px] text-muted">
          <span className="flex items-center gap-1">
            <span className="inline-block h-3 w-3 rounded-[3px] bg-ok" />
            たまった
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-3 w-3 rounded-[3px] bg-muted" />
            使った
          </span>
        </div>
      </div>
    </Group>
  );
}

/** 棒グラフ（1本の軸）。いちばん高い棒にだけ値を書き、押すと下に詳しく出す */
function Columns({
  values,
  labels,
  details,
  label,
  format = String,
}: {
  values: number[];
  /** 軸の下の文字（空文字は書かない） */
  labels: string[];
  details: string[];
  label: string;
  /** いちばん高い棒に書く値の形 */
  format?: (v: number) => string;
}) {
  const [picked, setPicked] = useState<number>();
  const W = 336;
  const H = 120;
  const top = 14;
  const base = H - 18;
  const max = Math.max(1, ...values);
  const slot = W / values.length;
  const bw = Math.min(16, slot - 2);
  const maxI = values.indexOf(Math.max(...values));
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={label}>
        <line x1={0} x2={W} y1={base} y2={base} className="stroke-line" strokeWidth={1} />
        {values.map((v, i) => {
          const h = (v / max) * (base - top);
          const x = i * slot + (slot - bw) / 2;
          const r = Math.min(4, h);
          return (
            <g key={i} onClick={() => setPicked(picked === i ? undefined : i)} className="cursor-pointer">
              <rect x={i * slot} y={0} width={slot} height={H} fill="transparent" />
              {picked === i && <rect x={i * slot + 0.5} y={top - 4} width={slot - 1} height={base - top + 8} rx={3} className="fill-surface2" />}
              {h > 0 && (
                <path
                  d={`M${x},${base} V${base - h + r} Q${x},${base - h} ${x + r},${base - h} H${x + bw - r} Q${x + bw},${base - h} ${x + bw},${base - h + r} V${base} Z`}
                  className="fill-ok"
                />
              )}
              {labels[i] && (
                <text x={i * slot + slot / 2} y={H - 4} textAnchor="middle" className="fill-muted text-[10px] tabular-nums">
                  {labels[i]}
                </text>
              )}
            </g>
          );
        })}
        {values[maxI] > 0 && (
          <text x={maxI * slot + slot / 2} y={base - (values[maxI] / max) * (base - top) - 4} textAnchor="middle" className="fill-fg text-[10px] font-semibold tabular-nums">
            {format(values[maxI])}
          </text>
        )}
      </svg>
      <p className="min-h-5 pt-1 text-[13px] tabular-nums">{picked !== undefined ? details[picked] : ""}</p>
    </div>
  );
}

/** 睡眠：直近14日の、朝に記録した睡眠時間 */
function Sleep() {
  const { state } = useApp();
  const end = dayStartOf(state.plannedAt) + DAY_MS;
  const days = Array.from({ length: 14 }, (_, i) => end - (14 - i) * DAY_MS);
  const minutes = days.map((d) => state.wakeLogs.find((l) => l.date === dateKeyOf(d))?.sleepMinutes);
  const recorded = minutes.filter((m): m is number => m !== undefined);
  const avg = recorded.length ? recorded.reduce((a, b) => a + b, 0) / recorded.length : undefined;
  return (
    <Group title="睡眠（直近2週間）">
      <div className="flex flex-col gap-2 px-4 py-3">
        <p className="flex items-baseline gap-3 tabular-nums">
          <span className="text-[22px] font-semibold">{avg === undefined ? "—" : formatMinutes(Math.round(avg / 5) * 5)}</span>
          <span className="text-[13px] text-muted">平均・{recorded.length}日分</span>
        </p>
        <Columns
          label="日ごとの睡眠時間"
          values={minutes.map((m) => m ?? 0)}
          labels={days.map((d, i) => (i % 2 === 1 || i === 13 ? String(new Date(d + TZ * MIN).getUTCDate()) : ""))}
          details={days.map((d, i) => `${formatDate(d)} ${minutes[i] === undefined ? "記録なし" : formatMinutes(minutes[i]!)}`)}
          format={(v) => formatMinutes(v)}
        />
      </div>
    </Group>
  );
}

/** タバコ：直近14日の、時間帯ごとの本数と、日ごとの本数 */
function Smoking() {
  const { state } = useApp();
  const end = dayStartOf(state.plannedAt) + DAY_MS;
  const from = end - 14 * DAY_MS;
  const logs = state.smokeLogs.filter((t) => t >= from && t < end);
  const prev = state.smokeLogs.filter((t) => t >= from - 14 * DAY_MS && t < from).length;
  const hourOf = (t: number) => new Date(t + TZ * MIN).getUTCHours();
  const byHour = Array.from({ length: 24 }, (_, h) => logs.filter((t) => hourOf(t) === h).length);
  const days = Array.from({ length: 14 }, (_, i) => from + i * DAY_MS);
  const byDay = days.map((d) => logs.filter((t) => t >= d && t < d + DAY_MS).length);
  const avg = (n: number) => (Math.round((n / 14) * 10) / 10).toFixed(1);
  return (
    <Group title="タバコ（直近2週間）">
      <div className="flex flex-col gap-3 px-4 py-3">
        <p className="flex items-baseline gap-3 tabular-nums">
          <span className="text-[22px] font-semibold">{logs.length}本</span>
          <span className="text-[13px] text-muted">1日 {avg(logs.length)}本</span>
          {prev > 0 && <span className="ml-auto text-[12px] text-muted">前の2週間 1日 {avg(prev)}本</span>}
        </p>
        <div>
          <p className="text-[12px] text-muted">時間帯</p>
          <Columns
            label="時間帯ごとの本数"
            values={byHour}
            labels={byHour.map((_, h) => (h % 3 === 0 ? String(h) : ""))}
            details={byHour.map((n, h) => `${h}時台 ${n}本`)}
          />
        </div>
        <div>
          <p className="text-[12px] text-muted">日ごと</p>
          <Columns
            label="日ごとの本数"
            values={byDay}
            labels={days.map((d, i) => (i % 2 === 1 || i === 13 ? String(new Date(d + TZ * MIN).getUTCDate()) : ""))}
            details={days.map((d, i) => {
              const times = logs.filter((t) => t >= d && t < d + DAY_MS).map(formatTime);
              return `${formatDate(d)} ${byDay[i]}本${times.length ? `（${times.join(" ")}）` : ""}`;
            })}
          />
        </div>
      </div>
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
          <RewardChart />
          <Adherence />
        </div>
        <div className="flex flex-col gap-6">
          <Sleep />
          <Smoking />
        </div>
      </div>
    </div>
  );
}

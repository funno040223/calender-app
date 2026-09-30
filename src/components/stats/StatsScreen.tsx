"use client";

import { useState } from "react";
import Link from "next/link";
import { useApp } from "@/components/app/StoreProvider";
import { INSIGHT_DAYS, applyInsightAction, buildInsights } from "@/lib/mock/insights";
import { DAY_MS, MIN, TZ, dayStartOf, formatDate, formatMinutes, newId } from "@/lib/mock/jst";
import { dateKeyOf, type HabitMark } from "@/lib/mock/model";
import {
  REWARD_SOURCES,
  bedStats,
  habitWeeks,
  mondayOf,
  periodStats,
  rewardBalance,
  rewardBreakdown,
  rewardEarned,
  workMinutes,
  type RewardSource,
} from "@/lib/mock/stats";
import { Card, Row, ScreenHeader, btnPrimary, btnSecondary, inputBase } from "@/components/ui/controls";

const yen = (n: number) => `¥${Math.round(n).toLocaleString("ja-JP")}`;

/** 気づき：予定と実際を重ねて見つけた傾向。はっきりしたものがなければ出さない */
function Insights() {
  const { state, update, notify } = useApp();
  // 「今」は組み直した時刻（描くたびに Date.now() を呼ばない）
  const list = buildInsights(state, state.plannedAt);
  if (!list.length) return null;
  return (
    <Card title="気づき" right={<span className="shrink-0 text-[12px] text-muted">直近{INSIGHT_DAYS / 7}週間</span>}>
      {list.map((i) => (
        <div key={i.id} className="flex flex-col gap-0.5 px-4 py-3">
          <p className="text-[12px] font-medium text-muted">{i.topic}</p>
          <p className="text-[15px] leading-snug">{i.text}</p>
          {i.sub && <p className="text-[13px] tabular-nums text-muted">{i.sub}</p>}
          {i.action &&
            (i.action.type === "link" ? (
              <Link href={i.action.href} className={`${btnSecondary} mt-2 self-start py-1.5 text-[14px]`}>
                {i.action.label}
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => {
                  const action = i.action!;
                  update((d) => applyInsightAction(d, action, newId("avoid")));
                  notify(`「${action.label}」にしました`);
                }}
                className={`${btnSecondary} mt-2 self-start py-1.5 text-[14px]`}
              >
                {i.action.label}
              </button>
            ))}
        </div>
      ))}
    </Card>
  );
}

/** 数を「3」「3.5」のように */
const fmtN = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));
const dayNum = (d: number) => String(new Date(d + TZ * MIN).getUTCDate());
const label = "text-[12px] font-medium text-muted";
const WEEKDAYS = ["月", "火", "水", "木", "金", "土", "日"];

/** 今週（月曜から）と先週の、予定どおり起きた・寝た日、習慣の回数、作業した時間 */
function Summary() {
  const { state } = useApp();
  const now = state.plannedAt;
  const monday = mondayOf(dayStartOf(now));
  const week = (from: number) => {
    const to = from + 7 * DAY_MS;
    const p = periodStats(state, from, to, now);
    return { wake: p.wake, bed: bedStats(state, from, to, now), habit: p.habit.done, work: workMinutes(state, from, Math.min(to, now)).worked };
  };
  const cur = week(monday);
  const prev = week(monday - 7 * DAY_MS);
  const ratio = (c: { done: number; total: number }) => (c.total ? `${c.done} / ${c.total}日` : "—");
  const tiles = [
    { label: "予定どおり起きた", value: ratio(cur.wake), prev: ratio(prev.wake) },
    { label: "予定どおり寝た", value: ratio(cur.bed), prev: ratio(prev.bed) },
    { label: "習慣", value: `${fmtN(cur.habit)}回`, prev: `${fmtN(prev.habit)}回` },
    { label: "作業した時間", value: cur.work ? formatMinutes(cur.work) : "0分", prev: prev.work ? formatMinutes(prev.work) : "0分" },
  ];
  return (
    <Card title="今週" right={<span className="shrink-0 text-[12px] tabular-nums text-muted">{formatDate(monday)}〜</span>}>
      <div className="grid grid-cols-2 gap-2 px-4 pt-1 pb-4">
        {tiles.map((t) => (
          <div key={t.label} className="rounded-xl bg-surface2 px-3 py-2.5">
            <p className={label}>{t.label}</p>
            <p className="text-[20px] font-semibold leading-snug tabular-nums">{t.value}</p>
            <p className="text-[12px] tabular-nums text-muted">先週 {t.prev}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}

const SOURCE_COLOR: Record<RewardSource, string> = {
  wake: "var(--cal-routine)",
  routine: "var(--cal-own)",
  bed: "var(--cal-google)",
  habit: "var(--cal-habit)",
  task: "var(--cal-task)",
  log: "var(--cal-class)",
};

/** ご褒美のお金：残り、今週たまった分の内訳、使ったら金額を記録する */
function Reward() {
  const { state, update } = useApp();
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  // 使ったときだけ、金額の入力を開く
  const [spending, setSpending] = useState(false);
  // 「今」は組み直した時刻（描くたびに Date.now() を呼ばない）
  const monday = mondayOf(dayStartOf(state.plannedAt));
  const spend = () => {
    const n = Math.round(Number(amount));
    if (!Number.isFinite(n) || n <= 0) return;
    update((d) => ({ ...d, rewardSpends: [...d.rewardSpends, { id: newId("spend"), at: Date.now(), amount: n, note: note.trim() || undefined }] }));
    setAmount("");
    setNote("");
    setSpending(false);
  };
  const byWeek = rewardBreakdown(state, monday, monday + 7 * DAY_MS);
  const parts = REWARD_SOURCES.map((s) => ({ ...s, yen: Math.round(byWeek[s.id]) })).filter((s) => s.yen > 0);
  // 合計は1回だけ丸める（残高と同じ数え方）
  const weekTotal = rewardEarned(state, monday, monday + 7 * DAY_MS);
  const recent = [...state.rewardSpends].sort((a, b) => b.at - a.at).slice(0, 5);
  return (
    <Card title="ご褒美">
      <div className="flex flex-col gap-3 px-4 pt-1 pb-3.5">
        <div className="flex items-end gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[34px] font-bold leading-none tracking-tight tabular-nums">{yen(rewardBalance(state))}</p>
            <p className="mt-1.5 text-[13px] tabular-nums text-muted">今週 +{yen(weekTotal)}</p>
          </div>
          {!spending && (
            <button type="button" onClick={() => setSpending(true)} className={`${btnSecondary} shrink-0 py-2`}>
              使った
            </button>
          )}
        </div>
        {parts.length > 0 && (
          <div>
            <div className="flex h-2 gap-0.5 overflow-hidden rounded-full" role="img" aria-label={`今週の内訳：${parts.map((p) => `${p.label} ${yen(p.yen)}`).join("、")}`}>
              {parts.map((p) => (
                <span key={p.id} style={{ flex: p.yen, background: SOURCE_COLOR[p.id] }} />
              ))}
            </div>
            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
              {parts.map((p) => (
                <span key={p.id} className="flex items-center gap-1 text-[12px] tabular-nums text-muted">
                  <span className="h-2 w-2 rounded-sm" style={{ background: SOURCE_COLOR[p.id] }} />
                  {p.label} {yen(p.yen)}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
      {spending && (
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
          <button type="button" onClick={spend} className={`${btnPrimary} shrink-0 py-2`}>
            記録
          </button>
        </div>
      )}
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
    </Card>
  );
}

/** 習慣の1日ぶんの点：やった＝塗る、5分＝薄く、まだ＝枠、これからの日＝点線 */
function HabitDot({ mark, future, today, name }: { mark?: HabitMark; future: boolean; today: boolean; name: string }) {
  const cls = mark === "done" ? "bg-ok" : mark === "five" ? "bg-ok/40" : future ? "border border-dashed border-line" : today ? "border-[1.5px] border-muted/60" : "border border-line";
  return (
    <span className="flex w-6 justify-center">
      <span className={`h-3.5 w-3.5 rounded-full ${cls}`} aria-label={`${name}：${mark === "done" ? "やった" : mark === "five" ? "5分" : future ? "これから" : "記録なし"}`} role="img" />
    </span>
  );
}

/** 今週の習慣：月〜日の点、回数と週の目安、続き具合 */
function Habits() {
  const { state } = useApp();
  const now = state.plannedAt;
  const today = dayStartOf(now);
  const monday = mondayOf(today);
  const rows = habitWeeks(state, monday, now);
  if (!rows.length) return null;
  return (
    <Card title="習慣" right={<span className="shrink-0 text-[12px] text-muted">今週</span>}>
      <div className="px-4 pt-1 pb-3.5">
        <div className="flex items-center text-[11px] text-muted">
          <span className="min-w-0 flex-1" />
          {WEEKDAYS.map((w) => (
            <span key={w} className="w-6 text-center">
              {w}
            </span>
          ))}
          <span className="w-14 shrink-0" />
        </div>
        <ul className="mt-1 flex flex-col gap-2.5">
          {rows.map(({ habit, marks, done, target, progress }) => (
            <li key={habit.id} className="flex items-center">
              <div className="min-w-0 flex-1 pr-2">
                <p className="truncate text-[14px]">{habit.name}</p>
                {progress.streak > 1 && (
                  <p className="text-[11px] font-medium text-ok">
                    連続 {progress.streak}
                    {progress.unit}
                  </p>
                )}
              </div>
              {marks.map((m, i) => {
                const d = monday + i * DAY_MS;
                return <HabitDot key={i} mark={m} future={d > today} today={d === today} name={`${habit.name} ${WEEKDAYS[i]}曜`} />;
              })}
              <span className="w-14 shrink-0 text-right text-[13px] tabular-nums">
                {fmtN(done)}
                {target !== undefined && <span className="text-muted"> / {target}</span>}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </Card>
  );
}

/** 作業：週ごとの作業した時間と予定（6週）、最近終わったタスク */
function Work() {
  const { state } = useApp();
  const now = state.plannedAt;
  const monday = mondayOf(dayStartOf(now));
  const weeks = Array.from({ length: 6 }, (_, i) => monday - (5 - i) * 7 * DAY_MS).map((from) => ({
    from,
    ...workMinutes(state, from, Math.min(from + 7 * DAY_MS, now)),
  }));
  const max = Math.max(60, ...weeks.map((w) => Math.max(w.planned, w.worked)));
  const hours = (m: number) => fmtN(Math.round(m / 6) / 10);
  const done = [...state.doneTasks].filter((t) => t.doneAt >= now - 56 * DAY_MS).sort((a, b) => b.doneAt - a.doneAt).slice(0, 5);
  if (!weeks.some((w) => w.planned) && !done.length) return null;
  return (
    <Card title="作業">
      <div className="px-4 pt-1 pb-3.5">
        <div className="flex h-28 items-end gap-2" role="img" aria-label={`週ごとの作業した時間：${weeks.map((w) => `${formatDate(w.from)}の週 ${hours(w.worked)}時間（予定 ${hours(w.planned)}時間）`).join("、")}`}>
          {weeks.map((w, i) => (
            <div key={w.from} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1">
              <span className="text-[11px] tabular-nums text-muted">{w.worked ? hours(w.worked) : ""}</span>
              <div className="relative w-full max-w-7 flex-1">
                {w.planned > 0 && <div className="absolute inset-x-0 bottom-0 rounded-md border border-line" style={{ height: `${(w.planned / max) * 100}%` }} />}
                {w.worked > 0 && <div className="absolute inset-x-1 bottom-0 rounded-[5px]" style={{ height: `${(w.worked / max) * 100}%`, background: "var(--cal-task)" }} />}
                {/* 予定のない週は、目盛りの線だけ */}
                {w.planned === 0 && <div className="absolute inset-x-1 bottom-0 h-px bg-line" />}
              </div>
              <span className={`text-[11px] tabular-nums ${i === 5 ? "font-semibold text-fg" : "text-muted"}`}>{i === 5 ? "今週" : dayNum(w.from)}</span>
            </div>
          ))}
        </div>
        <div className="mt-2 flex gap-3 text-[12px] text-muted">
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-sm" style={{ background: "var(--cal-task)" }} />
            作業した（時間）
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-sm border border-line" />
            予定
          </span>
        </div>
      </div>
      {done.length > 0 && (
        <div className="px-4 py-3">
          <p className={`mb-1.5 ${label}`}>終わったタスク</p>
          <ul className="flex flex-col gap-1">
            {done.map((t) => (
              <li key={`${t.id}:${t.doneAt}`} className="flex items-baseline gap-3 text-[14px]">
                <span className="min-w-0 flex-1 truncate">{t.title}</span>
                <span className="shrink-0 text-[12px] tabular-nums text-muted">{formatDate(t.doneAt)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}

const FATIGUE_LABEL = ["", "元気", "少し", "ふつう", "かなり", "ぐったり"];

/** 朝の疲れ：直近14日の点（濃いほど疲れている） */
function Fatigue() {
  const { state } = useApp();
  const end = dayStartOf(state.plannedAt) + DAY_MS;
  const days = Array.from({ length: 14 }, (_, i) => end - (14 - i) * DAY_MS);
  const values = days.map((d) => state.wakeLogs.find((l) => l.date === dateKeyOf(d))?.fatigue);
  if (!values.some((v) => v !== undefined)) return null;
  const color = "var(--cal-google)";
  return (
    <Card title="朝の疲れ" right={<span className="shrink-0 text-[12px] text-muted">14日</span>}>
      <div className="px-4 pt-1 pb-3.5">
        <div className="flex justify-between">
          {days.map((d, i) => {
            const v = values[i];
            return (
              <div key={d} className="flex w-5 flex-col items-center gap-1">
                <span
                  role="img"
                  aria-label={`${formatDate(d)} ${v ? FATIGUE_LABEL[v] : "記録なし"}`}
                  className={`h-4 w-4 rounded-full ${v ? "" : "border border-line"}`}
                  style={v ? { background: color, opacity: 0.18 + 0.2 * (v - 1) } : undefined}
                />
                <span className="text-[10px] tabular-nums text-muted">{i % 2 === 1 ? dayNum(d) : ""}</span>
              </div>
            );
          })}
        </div>
        <div className="mt-1.5 flex items-center justify-end gap-1.5 text-[11px] text-muted">
          元気
          {[1, 2, 3, 4, 5].map((v) => (
            <span key={v} className="h-2.5 w-2.5 rounded-full" style={{ background: color, opacity: 0.18 + 0.2 * (v - 1) }} />
          ))}
          ぐったり
        </div>
      </div>
    </Card>
  );
}

/** タバコ：直近14日の吸った時刻（1つの点が1本）。多い少ないは評価しない */
function Smoking() {
  const { state } = useApp();
  const end = dayStartOf(state.plannedAt) + DAY_MS;
  const from = end - 14 * DAY_MS;
  const logs = state.smokeLogs.filter((t) => t >= from && t < end);
  const prev = state.smokeLogs.filter((t) => t >= from - 14 * DAY_MS && t < from).length;
  const avg = (n: number) => (Math.round((n / 14) * 10) / 10).toFixed(1);
  const days = Array.from({ length: 14 }, (_, i) => from + i * DAY_MS);
  const L = 30;
  const W = 290;
  const rowH = 11;
  const x = (t: number) => L + ((t - dayStartOf(t)) / DAY_MS) * W;
  return (
    <Card title="タバコ" right={<span className="shrink-0 text-[12px] text-muted">14日</span>}>
      <div className="flex flex-col gap-2 px-4 pt-1 pb-3.5">
        <p className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 tabular-nums">
          <span className="text-[20px] font-semibold">{logs.length}本</span>
          <span className="text-[13px] text-muted">1日 {avg(logs.length)}本</span>
          {prev > 0 && <span className="text-[12px] text-muted">前の2週間 1日 {avg(prev)}本</span>}
        </p>
        <svg viewBox={`0 0 ${L + W + 4} ${days.length * rowH + 16}`} className="w-full" role="img" aria-label="14日の吸った時刻">
          {[0, 6, 12, 18, 24].map((h) => (
            <g key={h}>
              <line x1={L + (h / 24) * W} x2={L + (h / 24) * W} y1={0} y2={days.length * rowH} style={{ stroke: "var(--line)" }} strokeWidth={0.6} />
              <text x={L + (h / 24) * W} y={days.length * rowH + 12} textAnchor={h === 24 ? "end" : "middle"} fontSize={10} style={{ fill: "var(--muted)" }}>
                {h}
              </text>
            </g>
          ))}
          {days.map((d, i) => (
            <g key={d}>
              {i % 2 === 1 && (
                <text x={0} y={i * rowH + 8.5} fontSize={10} style={{ fill: "var(--muted)" }}>
                  {formatDate(d).replace(/\(.\)$/, "")}
                </text>
              )}
              {logs
                .filter((t) => t >= d && t < d + DAY_MS)
                .map((t) => (
                  <circle key={t} cx={x(t)} cy={i * rowH + 5.5} r={3} style={{ fill: "var(--fg)", opacity: 0.55 }} />
                ))}
            </g>
          ))}
        </svg>
      </div>
    </Card>
  );
}

export default function StatsScreen() {
  return (
    <div className="h-full overflow-y-auto bg-grouped">
      <ScreenHeader title="記録" width="max-w-5xl" />
      <div className="mx-auto flex max-w-5xl flex-col gap-4 px-4 pt-1 pb-8 sm:px-6 lg:grid lg:grid-cols-2 lg:items-start">
        <div className="flex flex-col gap-4">
          <Insights />
          <Summary />
          <Reward />
          <Habits />
        </div>
        <div className="flex flex-col gap-4">
          <Work />
          <Fatigue />
          <Smoking />
        </div>
      </div>
    </div>
  );
}

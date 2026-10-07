import { dayLoadOf, resolveTravel, type AvoidWindow, type CalendarEvent, type TaskStrategy } from "@/lib/scheduler";
import { DAY_MS, MIN, TZ, dayStartOf } from "./jst";
import { dateKeyOf, dayStartOfKey, type MockData } from "./model";
import { planEvents, type MockState } from "./state";
import { bedNights } from "./stats";
import { workedByTask } from "./progress";
import { intersect, merge } from "@/lib/scheduler/intervals";

/**
 * 記録の画面の「気づき」：予定と実際を重ねて、自分では気づきにくい傾向を探す。
 * 1人ぶんの少ない記録なので、比べるどちらも回数が足り、差がはっきりしているときだけ出す（割合ではなく回数で見せる）
 */

export type InsightAction =
  | { type: "avoid"; label: string; window: Omit<AvoidWindow, "id"> }
  | { type: "strategy"; label: string; value: TaskStrategy }
  | { type: "link"; label: string; href: string };

export interface Insight {
  id: string;
  /** 小さな見出し */
  topic: string;
  text: string;
  sub?: string;
  action?: InsightAction;
}

/** 見る期間（直近4週間） */
export const INSIGHT_DAYS = 28;
/** 比べるどちらも、これだけの回数がないと出さない */
export const MIN_SAMPLES = 10;
/** 見積もり・締切は、終わったタスクがこれだけないと出さない */
export const MIN_TASKS = 5;

interface Count {
  n: number;
  k: number;
}
const rate = (c: Count) => (c.n ? c.k / c.n : 0);
const count = <T,>(xs: T[], hit: (x: T) => boolean): Count => ({ n: xs.length, k: xs.filter(hit).length });
/** a の率が b よりはっきり高い：どちらも回数が足り、a が4割以上で、b より25ポイント以上高い */
const clearlyHigher = (a: Count, b: Count, min = MIN_SAMPLES) => a.n >= min && b.n >= min && rate(a) >= 0.4 && rate(a) - rate(b) >= 0.25;
const ofN = (c: Count) => `${c.n}回中${c.k}回`;
const hourOf = (t: number) => new Date(t + TZ * MIN).getUTCHours();
const round1 = (n: number) => (Math.round(n * 10) / 10).toFixed(1);
const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
};

/** 時間帯（「入れない」時間帯にするときの 0時からの分） */
const BANDS = [
  { id: "morning", label: "午前", start: 4 * 60, end: 12 * 60 },
  { id: "afternoon", label: "午後", start: 12 * 60, end: 17 * 60 },
  { id: "evening", label: "夕方（17〜20時）", start: 17 * 60, end: 20 * 60 },
  { id: "night", label: "夜（20時〜）", start: 20 * 60, end: 28 * 60 },
] as const;
const bandOf = (t: number) => {
  const m = ((hourOf(t) - 4 + 24) % 24) * 60 + 4 * 60;
  return BANDS.find((b) => m >= b.start && m < b.end)!;
};

const STRATEGY_LABEL: Record<TaskStrategy, string> = { standard: "ふつう", early: "前倒し", spread: "分散" };
const WEEKDAY = ["日", "月", "火", "水", "木", "金", "土"];

/** 期間の中の、進み具合を答えたタスクの枠 */
function reviewed(state: MockState, from: number, to: number) {
  return Object.entries(state.taskBlockLog).flatMap(([key, b]) =>
    b.outcome && b.start >= from && b.start < to ? [{ ...b, taskId: key.slice(0, key.lastIndexOf(":")) }] : [],
  );
}

const tagOf = (state: MockState, taskId: string) =>
  state.tasks.find((t) => t.id === taskId)?.tagId ?? state.doneTasks.find((t) => t.id === taskId)?.tagId;

/** 崩れやすい枠：時間帯（と作業の種類）ごとの「できなかった」の多さ */
function blockInsight(state: MockState, from: number, to: number): Insight | undefined {
  const blocks = reviewed(state, from, to).map((b) => ({ ...b, band: bandOf(b.start), tag: tagOf(state, b.taskId) }));
  const failed = (b: { outcome?: string }) => b.outcome === "none";
  let best: { diff: number; group: Count; base: Count; band: (typeof BANDS)[number]; tagId?: string } | undefined;
  for (const band of BANDS) {
    for (const tagId of [undefined, ...state.tags.map((t) => t.id)]) {
      const pool = tagId ? blocks.filter((b) => b.tag === tagId) : blocks;
      const group = count(pool.filter((b) => b.band.id === band.id), failed);
      const base = count(pool.filter((b) => b.band.id !== band.id), failed);
      const diff = rate(group) - rate(base);
      // 同じ差なら、作業の種類を絞ったほう（記録があるほう）を選ぶ。ほかの種類まで止めない
      if (clearlyHigher(group, base) && (!best || diff > best.diff || (diff === best.diff && tagId && !best.tagId))) best = { diff, group, base, band, tagId };
    }
  }
  if (!best) return undefined;
  const tag = state.tags.find((t) => t.id === best.tagId);
  const window = { label: `${best.band.label}${tag ? `の${tag.name}` : ""}`, start: best.band.start, end: best.band.end, hard: true, ...(tag ? { tagIds: [tag.id] } : {}) };
  // もう「入れない」にしてあれば出さない
  const already = state.avoidWindows.some(
    (w) => w.hard && w.start === window.start && w.end === window.end && !w.weekdays?.length && (w.tagIds ?? []).join() === (window.tagIds ?? []).join(),
  );
  if (already) return undefined;
  const band = best.band.label.replace(/（.*）/, "");
  return {
    id: "blocks",
    topic: "崩れやすい枠",
    text: `${best.band.label}の${tag ? tag.name : "タスク"}の枠は、${ofN(best.group)}できなかった`,
    sub: `ほかの時間は ${ofN(best.base)}`,
    action: { type: "avoid", label: `${band}は${tag ? tag.name : "タスク"}を入れない`, window },
  };
}

/** 見積もりのずれ：終わったタスクの、作業した時間 ÷ 見積もり（種類ごとの中央値） */
function estimateInsight(state: MockState, from: number): Insight | undefined {
  const spent = workedByTask(state.taskBlockLog);
  let best: { ratio: number; n: number; tag: string } | undefined;
  for (const tag of state.tags) {
    const ratios = state.doneTasks
      .filter((t) => t.doneAt >= from && t.tagId === tag.id && t.estimateMinutes && spent.get(t.id))
      .map((t) => spent.get(t.id)! / t.estimateMinutes!);
    if (ratios.length < MIN_TASKS) continue;
    const ratio = median(ratios);
    if ((ratio >= 1.3 || ratio <= 0.75) && (!best || Math.abs(Math.log(ratio)) > Math.abs(Math.log(best.ratio)))) best = { ratio, n: ratios.length, tag: tag.name };
  }
  if (!best) return undefined;
  return {
    id: "estimate",
    topic: "見積もり",
    text: `${best.tag}の作業は、見積もりの${round1(best.ratio)}倍${best.ratio > 1 ? "かかっている" : "で終わっている"}`,
    sub: `終わった${best.n}件の真ん中の値`,
  };
}

/** 締切との距離：終わったタスクのうち、締切の前日以降に終わったもの */
function deadlineInsight(state: MockState, from: number): Insight | undefined {
  const done = state.doneTasks.filter((t) => t.deadline !== undefined && t.doneAt >= from);
  if (done.length < MIN_TASKS) return undefined;
  // 日付だけの締切（翌日 0:00）は、その前の日が締切の日
  const late = count(done, (t) => t.doneAt >= dayStartOf(t.deadline! - 1) - DAY_MS);
  if (rate(late) < 0.5) return undefined;
  const strategy = state.settings.taskStrategy ?? "standard";
  return {
    id: "deadline",
    topic: "締切",
    text: `終わったタスクの ${late.n}件中${late.k}件が、締切の前日以降`,
    sub: `今の置き方：${STRATEGY_LABEL[strategy]}`,
    ...(strategy !== "early" ? { action: { type: "strategy" as const, label: "置き方を「前倒し」にする", value: "early" as const } } : {}),
  };
}

/** 外出した日か、時刻のある予定が3つ以上ある日 */
function busyDays(state: MockState, events: CalendarEvent[], days: number[]): Set<number> {
  const out = new Set<number>();
  for (const d of days) {
    const log = state.dayLogs[dateKeyOf(d)];
    const heavy = log ? (log.heavy ?? (log.away || log.events >= 3)) : dayLoadOf(events, state.places, state.settings, d, d + DAY_MS).heavy;
    if (heavy) out.add(d);
  }
  return out;
}

/** 予定の多い日の翌日：枠の「できなかった」と朝の疲れ */
function nextDayInsight(state: MockState, events: CalendarEvent[], from: number, today: number): Insight | undefined {
  const days = Array.from({ length: Math.round((today - from) / DAY_MS) }, (_, i) => from + i * DAY_MS);
  const busy = busyDays(state, events, [from - DAY_MS, ...days]);
  const afterBusy = (d: number) => busy.has(d - DAY_MS);
  const blocks = reviewed(state, from, today);
  const failed = (b: { outcome?: string }) => b.outcome === "none";
  const group = count(blocks.filter((b) => afterBusy(dayStartOf(b.start))), failed);
  const base = count(blocks.filter((b) => !afterBusy(dayStartOf(b.start))), failed);
  const fatigue = (after: boolean) =>
    days.filter((d) => afterBusy(d) === after).flatMap((d) => state.wakeLogs.find((l) => l.date === dateKeyOf(d))?.fatigue ?? []);
  const fa = fatigue(true);
  const fb = fatigue(false);
  const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
  const tired = fa.length >= MIN_SAMPLES && fb.length >= MIN_SAMPLES && avg(fa) - avg(fb) >= 0.8;
  const tiredText = `朝の疲れ ${round1(avg(fa))}（ふだん ${round1(avg(fb))}）`;
  if (clearlyHigher(group, base)) {
    return {
      id: "nextday",
      topic: "予定の多い日の翌日",
      text: `外出や予定の多い日の翌日は、枠が ${ofN(group)}できなかった`,
      sub: `ふだんの日は ${ofN(base)}${tired ? `・${tiredText}` : ""}`,
    };
  }
  if (!tired) return undefined;
  return {
    id: "nextday",
    topic: "予定の多い日の翌日",
    text: `外出や予定の多い日の翌朝は、${tiredText}`,
    sub: `1 元気〜5 ぐったり・${fa.length}日と${fb.length}日の平均`,
  };
}

interface Span {
  start: number;
  end: number;
}
/** 重なりをまとめて、[from, to) に切る */
const union = (spans: Span[], from: number, to: number): Span[] => intersect(merge(spans), { start: from, end: to });

/** タバコの場面：場面ごとの「1時間あたりの本数」が、起きている時間全体の何倍か */
function smokeInsight(state: MockState, events: CalendarEvent[], from: number, now: number): Insight | undefined {
  const logs = state.smokeLogs.filter((t) => t >= from && t < now);
  if (logs.length < MIN_SAMPLES * 2) return undefined;
  const first = Math.max(from, dayStartOf(Math.min(...logs)));
  const awakeMinutes = ((now - first) / MIN) * ((24 * 60 - state.settings.sleepMinutes) / (24 * 60));
  const overall = logs.length / awakeMinutes;
  const timed = events.filter((e) => !e.allDay);
  const pad = (e: CalendarEvent) => {
    const t = resolveTravel(e, state.places, state.settings);
    return t.atHome ? 0 : t.minutes * MIN;
  };
  const worked = reviewed(state, from, now).filter((b) => b.outcome !== "none");
  const meals = Object.values(state.dayLogs).flatMap((l) =>
    Object.entries(l.meals).map(([id, start]) => ({ start, dur: (state.habits.find((h) => h.id === id)?.durationMinutes ?? 30) * MIN })),
  );
  const H = 60 * MIN;
  const scenes: { label: string; spans: Span[] }[] = [
    { label: "予定の前（出発まで1時間）", spans: timed.map((e) => ({ start: e.start - pad(e) - H, end: e.start - pad(e) })) },
    { label: "予定のあと1時間", spans: timed.map((e) => ({ start: e.end, end: e.end + pad(e) + H })) },
    { label: "作業の枠の途中", spans: worked.map((b) => ({ start: b.start, end: b.end })) },
    { label: "作業のあと30分", spans: worked.map((b) => ({ start: b.end, end: b.end + 30 * MIN })) },
    { label: "食事のあと30分", spans: meals.map((m) => ({ start: m.start + m.dur, end: m.start + m.dur + 30 * MIN })) },
    { label: "起きて1時間", spans: state.wakeLogs.flatMap((l) => (l.wokeAt ? [{ start: l.wokeAt, end: l.wokeAt + H }] : [])) },
    { label: "寝る前1時間", spans: bedNights(state).map((b) => ({ start: b.at - H, end: b.at })) },
  ];
  const found = scenes
    .map((s) => {
      const spans = union(s.spans, first, now);
      const minutes = spans.reduce((a, x) => a + (x.end - x.start) / MIN, 0);
      const n = logs.filter((t) => spans.some((x) => t >= x.start && t < x.end)).length;
      return { label: s.label, n, minutes, times: minutes ? n / minutes / overall : 0 };
    })
    .filter((s) => s.n >= 8 && s.minutes >= 5 * 60 && s.times >= 1.5)
    .sort((a, b) => b.times - a.times)
    .slice(0, 2);
  if (!found.length) return undefined;
  const [top, second] = found;
  return {
    id: "smoke",
    topic: "タバコの場面",
    text: `吸うことが多いのは、${top.label}`,
    sub: `ふだんの${round1(top.times)}倍（${top.n}本）${second ? `・${second.label} ${round1(second.times)}倍` : ""}`,
  };
}

/** 習慣が抜けやすい条件：置いた日のうち、記録がなかった日（外出の日・予定の多い日・雨の日・曜日） */
function habitInsight(state: MockState, from: number, today: number): Insight | undefined {
  const days = Object.entries(state.dayLogs).flatMap(([k, log]) => {
    const d = dayStartOfKey(k);
    return d !== undefined && d >= from && d < today ? [{ d, k, log }] : [];
  });
  let best: { diff: number; habit: string; cond: string; group: Count; base: Count } | undefined;
  for (const h of state.habits.filter((x) => x.track)) {
    const placed = days.filter((x) => x.log.habits.includes(h.id));
    const missed = (x: (typeof placed)[number]) => state.habitLogs[x.k]?.[h.id] === undefined;
    const conds: { label: string; is: (x: (typeof placed)[number]) => boolean }[] = [
      { label: "外出の日", is: (x) => x.log.away },
      { label: "予定の多い日", is: (x) => x.log.events >= 3 },
      { label: "雨の日", is: (x) => !!x.log.rainy },
      ...WEEKDAY.map((w, i) => ({ label: `${w}曜`, is: (x: (typeof placed)[number]) => new Date(x.d + TZ * MIN).getUTCDay() === i })),
    ];
    for (const c of conds) {
      const group = count(placed.filter(c.is), missed);
      const base = count(placed.filter((x) => !c.is(x)), missed);
      const diff = rate(group) - rate(base);
      if (clearlyHigher(group, base) && (!best || diff > best.diff)) best = { diff, habit: h.name, cond: c.label, group, base };
    }
  }
  if (!best) return undefined;
  return {
    id: "habit",
    topic: "習慣が抜けやすい日",
    text: `${best.habit}は、${best.cond}に ${ofN(best.group)}抜けた`,
    sub: `ほかの日は ${ofN(best.base)}`,
    action: { type: "link", label: "習慣を見直す", href: "/settings/habits" },
  };
}

/** 直近4週間の気づき（出せるものだけ） */
export function buildInsights(state: MockState, now: number): Insight[] {
  const today = dayStartOf(now);
  const from = today - INSIGHT_DAYS * DAY_MS;
  // 見積もりと締切は、終わったタスクが少ないので8週間を見る
  const longFrom = today - 2 * INSIGHT_DAYS * DAY_MS;
  const events = planEvents(state, state.classEvents, state.googleEvents);
  return [
    blockInsight(state, from, now),
    nextDayInsight(state, events, from, today),
    deadlineInsight(state, longFrom),
    estimateInsight(state, longFrom),
    smokeInsight(state, events, from, now),
    habitInsight(state, from, today),
  ].filter((x): x is Insight => !!x);
}

/** 気づきのボタンを押したときの変更 */
export function applyInsightAction(d: MockData, action: InsightAction, id: string): MockData {
  if (action.type === "avoid") return { ...d, avoidWindows: [...d.avoidWindows, { id, ...action.window }] };
  if (action.type === "strategy") return { ...d, settings: { ...d.settings, taskStrategy: action.value } };
  return d;
}

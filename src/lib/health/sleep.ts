/**
 * iPhone のショートカットが送るヘルスケアの睡眠の記録を読み、夜ごとにまとめる（画面にもサーバーにも依存しない）。
 * 送り方はショートカットで作りやすい「開始|終了|値」の行（JSON の lines か、そのままの文字）。{start, end, value} の並びも読む
 */

export type SleepKind = "asleep" | "awake" | "inBed";

export interface SleepSample {
  start: number;
  end: number;
  kind: SleepKind;
}

export interface SleepNight {
  /** 起きた日（日本時間の YYYY-MM-DD） */
  night: string;
  /** 寝ついた時刻と起きた時刻 */
  start: number;
  end: number;
  /** 眠っていた時間（分）。重なった記録（iPhone と Apple Watch など）は1回ぶんに数える */
  minutes: number;
}

/** 合言葉（32バイトの base64url） */
export const HEALTH_TOKEN = /^[A-Za-z0-9_-]{43}$/;
/** 一度に読む記録の数の上限 */
const MAX_SAMPLES = 5000;
/** これより短い眠り（昼寝など）は夜にしない */
const MIN_NIGHT_MINUTES = 120;
/** 眠りのあいだに、これより長く起きていたら別の眠りにする */
const SESSION_GAP_MINUTES = 60;

const JST = 9 * 60 * 60 * 1000;
const MIN = 60 * 1000;
const keyOf = (t: number) => new Date(t + JST).toISOString().slice(0, 10);

/** 時刻の文字。ISO 8601（タイムゾーンつき）はそのまま、つかない「2026/10/01 2:13」などは日本時間として読む */
export function parseTime(s: string): number | undefined {
  const t = s.trim();
  if (!t) return undefined;
  if (/(Z|[+-]\d{2}:?\d{2})$/.test(t)) {
    const v = Date.parse(t);
    return Number.isFinite(v) ? v : undefined;
  }
  const m = t.match(/(\d{4})\D+(\d{1,2})\D+(\d{1,2})\D+?(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (!m) return undefined;
  const [, y, mo, d, h, mi, sec] = m.map(Number);
  const v = Date.UTC(y, mo - 1, d, h, mi, sec || 0) - JST;
  return Number.isFinite(v) ? v : undefined;
}

/** 睡眠の値（数字は HealthKit の値。文字は日本語・英語のどちらも） */
export function sleepKind(v: unknown): SleepKind | undefined {
  if (typeof v === "number" || (typeof v === "string" && /^\d+$/.test(v.trim()))) {
    const n = Number(v);
    return n === 0 ? "inBed" : n === 2 ? "awake" : n === 1 || (n >= 3 && n <= 5) ? "asleep" : undefined;
  }
  if (typeof v !== "string") return undefined;
  const s = v.trim();
  if (/覚醒|起きて|awake/i.test(s)) return "awake";
  if (/ベッド|in\s*bed|床/i.test(s)) return "inBed";
  if (/睡眠|コア|深い|レム|asleep|core|deep|rem|sleep/i.test(s)) return "asleep";
  return undefined;
}

function sample(start: unknown, end: unknown, value: unknown): SleepSample | undefined {
  const s = typeof start === "number" ? start : typeof start === "string" ? parseTime(start) : undefined;
  const e = typeof end === "number" ? end : typeof end === "string" ? parseTime(end) : undefined;
  const kind = sleepKind(value);
  if (s === undefined || e === undefined || !kind || e <= s || e - s > 24 * 60 * MIN) return undefined;
  return { start: s, end: e, kind };
}

/** 送られてきた本文を記録の並びにする（読めない行は捨てる） */
export function parseSleepBody(body: string): SleepSample[] {
  let lines: string[] | undefined;
  let rows: unknown[] | undefined;
  try {
    const j: unknown = JSON.parse(body);
    if (typeof j === "string") lines = j.split(/\r?\n/);
    else if (Array.isArray(j)) rows = j;
    else if (j && typeof j === "object") {
      const o = j as Record<string, unknown>;
      if (typeof o.lines === "string") lines = o.lines.split(/\r?\n/);
      else if (Array.isArray(o.lines)) lines = o.lines.filter((x): x is string => typeof x === "string");
      else if (Array.isArray(o.samples)) rows = o.samples;
    }
  } catch {
    lines = body.split(/\r?\n/);
  }
  const out: SleepSample[] = [];
  for (const r of rows ?? []) {
    if (!r || typeof r !== "object") continue;
    const o = r as Record<string, unknown>;
    const x = sample(o.start, o.end, o.value);
    if (x) out.push(x);
  }
  for (const line of lines ?? []) {
    const parts = line.split(/\s*[|\t]\s*/);
    if (parts.length < 3) continue;
    const x = sample(parts[0], parts[1], parts.slice(2).join(" "));
    if (x) out.push(x);
  }
  return out.slice(0, MAX_SAMPLES);
}

/** 眠っていた記録を夜ごとにまとめる。起きた日ごとに、いちばん長く眠った1回を残す */
export function summarizeSleep(samples: SleepSample[]): SleepNight[] {
  const asleep = samples.filter((s) => s.kind === "asleep").sort((a, b) => a.start - b.start);
  // 重なりをまとめる
  const spans: { start: number; end: number }[] = [];
  for (const s of asleep) {
    const last = spans.at(-1);
    if (last && s.start <= last.end) last.end = Math.max(last.end, s.end);
    else spans.push({ start: s.start, end: s.end });
  }
  // 起きていた時間が短ければ、同じ眠りの続き
  const sessions: { start: number; end: number; minutes: number }[] = [];
  for (const x of spans) {
    const last = sessions.at(-1);
    const minutes = (x.end - x.start) / MIN;
    if (last && x.start - last.end <= SESSION_GAP_MINUTES * MIN) {
      last.end = x.end;
      last.minutes += minutes;
    } else sessions.push({ ...x, minutes });
  }
  const nights = new Map<string, SleepNight>();
  for (const s of sessions) {
    if (s.minutes < MIN_NIGHT_MINUTES) continue;
    const night = keyOf(s.end);
    const prev = nights.get(night);
    if (!prev || s.minutes > prev.minutes) nights.set(night, { night, start: s.start, end: s.end, minutes: Math.round(s.minutes) });
  }
  return [...nights.values()].sort((a, b) => a.night.localeCompare(b.night));
}

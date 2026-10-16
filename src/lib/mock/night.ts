import type { PlanResult } from "@/lib/scheduler";
import { DAY_MS, MIN } from "./jst";
import { dateKeyOf, dayStartOfKey, type DateKey, type MockData, type SleepLog, type SleepMark } from "./model";

/**
 * 夜の記録：起きた日ごとに、その夜の時刻を1つにまとめる。
 * 「活動」（寝床に入った・起きて動き出した）と「睡眠」（ヘルスケアの入眠・目覚め）を分けて持ち、その差も見られるようにする。
 * 寝た・起きた時刻と、そのときの予定の就寝・起床は、眠りの記録（sleepLogs）にだけ置き、ここを通して読み書きする。
 * どの場面（組み直し・ご褒美・記録の画面・朝のカード・通知）も、ここで決めた値を使う
 */

/** 値の出どころ。manual＝「今から立て直す」で入れた時刻、button＝「寝る」「起きた」「いつ起きた？」、routine＝朝ルーティンの最初のチェック、health＝ヘルスケア */
export type NightSource = "manual" | "button" | "routine" | "health";

export interface NightTime {
  at: number;
  source: NightSource;
}

export interface Night {
  /** 起きた日 */
  date: DateKey;
  /** 前の晩に予定していた就寝と、その朝に予定していた起床 */
  plannedBed?: number;
  plannedWake?: number;
  /** 活動終了（寝床に入った）：「寝る」か「今から立て直す」で入れた寝た時刻（あとから入れたほう） */
  bed?: NightTime;
  /** 活動開始（起きて動き出した）：「起きた」「いつ起きた？」か「今から立て直す」で入れた起きた時刻 → 朝ルーティンの最初のチェック */
  up?: NightTime;
  /** 起きた時刻を記録した時刻（前の時刻で記録しても、朝のカードをしばらく出す） */
  upRecordedAt?: number;
  /** ヘルスケアの入眠（寝ついた）と目覚め */
  asleep?: number;
  awake?: number;
  /** 睡眠時間（分）：手で直した値 → ヘルスケア → 活動終了〜活動開始（どちらも手かボタンのとき） */
  sleep?: { minutes: number; source: "manual" | "health" | "button" };
}

/** 予定どおりかを見る猶予（分）。起床・就寝とも同じ */
export const ON_TIME_GRACE_MINUTES = 30;

type NightData = Partial<Pick<MockData, "sleepLogs" | "wakeLogs" | "healthSleep" | "dayLogs" | "settings">>;

// ---------- 眠りの記録を読む ----------

const startOf = (s: SleepLog) => s.bed?.at ?? s.up?.at ?? s.until ?? s.plannedWake ?? Infinity;
/** 起きた日 date の眠りの記録（寝た時刻の早い順）。最初のものがその夜の眠りで、ほかは昼寝など */
const logsOf = (logs: SleepLog[] | undefined, date: DateKey) =>
  (logs ?? []).filter((s) => s.date === date).sort((a, b) => startOf(a) - startOf(b));
/** 起きた日 date のその夜の眠り */
const nightLogOf = (logs: SleepLog[] | undefined, date: DateKey) => logsOf(logs, date)[0];
const timeOf = (m: SleepMark): NightTime => ({ at: m.at, source: m.source === "reset" ? "manual" : "button" });

/** 1回の眠り（組み直しで使う形） */
export interface SleepSession {
  id: string;
  /** 起きた日 */
  date: DateKey;
  bed?: NightTime;
  up?: NightTime;
  /** 「今から寝る」で入れた起きる予定 */
  until?: number;
  plannedBed?: number;
  plannedWake?: number;
  /** 「今から立て直す」で入れた時刻を含む（組み直しでは、見積もりより先にこちらを使う） */
  manual: boolean;
}

function sessionOf(s: SleepLog, routine: number | undefined): SleepSession {
  const up: NightTime | undefined = s.up ? timeOf(s.up) : routine !== undefined ? { at: routine, source: "routine" } : undefined;
  return {
    id: s.id,
    date: s.date,
    ...(s.bed ? { bed: timeOf(s.bed) } : {}),
    ...(up ? { up } : {}),
    ...(s.until !== undefined ? { until: s.until } : {}),
    ...(s.plannedBed !== undefined ? { plannedBed: s.plannedBed } : {}),
    ...(s.plannedWake !== undefined ? { plannedWake: s.plannedWake } : {}),
    manual: s.bed?.source === "reset" || s.up?.source === "reset",
  };
}

/** 起きた日 date の眠り。朝ルーティンの最初のチェックは、その夜の活動開始の代わりにする */
function sessionsOn(data: NightData, date: DateKey): SleepSession[] {
  const list = logsOf(data.sleepLogs, date);
  const routine = data.wakeLogs?.find((l) => l.date === date)?.routineStartedAt;
  if (!list.length) return routine === undefined ? [] : [sessionOf({ id: date, date }, routine)];
  return list.map((s, i) => sessionOf(s, i === 0 ? routine : undefined));
}

/** 記録のある眠りをすべて（起きた日の古い順。組み直しで使う） */
export function sleepSessions(data: NightData): SleepSession[] {
  const dates = new Set([
    ...(data.sleepLogs ?? []).map((s) => s.date),
    ...(data.wakeLogs ?? []).filter((l) => l.routineStartedAt !== undefined).map((l) => l.date),
  ]);
  return [...dates].sort().flatMap((d) => sessionsOn(data, d));
}

/** 起きた日 date の夜の記録 */
export function nightOf(data: NightData, date: DateKey): Night {
  const day = dayStartOfKey(date);
  const prevKey = day === undefined ? undefined : dateKeyOf(day - DAY_MS);
  const main = nightLogOf(data.sleepLogs, date);
  const s = sessionsOn(data, date)[0];
  const wake = data.wakeLogs?.find((l) => l.date === date);
  const health = data.healthSleep?.[date];
  const { bed, up } = s ?? {};

  const plannedWake = s?.plannedWake;
  const sleepMinutes = data.settings?.sleepMinutes;
  const plannedBed =
    s?.plannedBed ??
    (prevKey ? data.dayLogs?.[prevKey]?.bed : undefined) ??
    (plannedWake !== undefined && sleepMinutes !== undefined ? plannedWake - sleepMinutes * MIN : undefined);

  const fromActivity =
    bed && up && bed.source !== "health" && up.source !== "routine" && up.at > bed.at ? Math.round((up.at - bed.at) / MIN) : undefined;
  const sleep =
    wake?.sleepMinutes !== undefined
      ? { minutes: wake.sleepMinutes, source: "manual" as const }
      : health
        ? { minutes: health.minutes, source: "health" as const }
        : fromActivity !== undefined
          ? { minutes: fromActivity, source: "button" as const }
          : undefined;

  return {
    date,
    ...(plannedBed !== undefined ? { plannedBed } : {}),
    ...(plannedWake !== undefined ? { plannedWake } : {}),
    ...(bed ? { bed } : {}),
    ...(up ? { up } : {}),
    ...(main?.up?.recordedAt !== undefined ? { upRecordedAt: main.up.recordedAt } : {}),
    ...(health ? { asleep: health.start, awake: health.end } : {}),
    ...(sleep ? { sleep } : {}),
  };
}

/** 記録のある夜をすべて（起きた日の古い順） */
export function allNights(data: NightData): Night[] {
  const dates = new Set<DateKey>([
    ...(data.wakeLogs ?? []).map((l) => l.date),
    ...Object.keys(data.healthSleep ?? {}),
    ...(data.sleepLogs ?? []).map((s) => s.date),
  ]);
  return [...dates].sort().map((d) => nightOf(data, d));
}

/** 起きたことを記録した（「起きた」「いつ起きた？」「今から立て直す」）。朝ルーティンの最初のチェックだけでは数えない */
export const upRecorded = (n: Night) => n.up !== undefined && n.up.source !== "routine";

/** 起きたことを続けて記録した日数。今日がまだなら昨日までを数える */
export function wakeStreak(data: NightData, today: number): number {
  const woke = (day: number) => upRecorded(nightOf(data, dateKeyOf(day)));
  let day = woke(today) ? today : today - DAY_MS;
  let n = 0;
  while (n < 1000 && woke(day)) {
    n++;
    day -= DAY_MS;
  }
  return n;
}

/**
 * 今の計画での、起きた日 date の予定の起床と、前の晩の予定の就寝（記録するときに残す）。
 * 起床は、ヘルスケア・「起きた」で組み直す前に予定していた起床があればそれ
 */
export function plannedOf(
  result: Pick<PlanResult, "dayPlans"> & Partial<Pick<PlanResult, "rhythmResets" | "lastNight">>,
  date: DateKey,
): { bed?: number; wake?: number } {
  const day = dayStartOfKey(date);
  if (day === undefined) return {};
  const wake =
    result.rhythmResets?.find((r) => r.plannedEnd !== undefined && dateKeyOf(r.end) === date)?.plannedEnd ??
    result.dayPlans.find((d) => d.dayStart === day)?.wake;
  const prev = day - DAY_MS;
  const bed = result.dayPlans.find((d) => d.dayStart === prev)?.bed ?? (result.lastNight?.dayStart === prev ? result.lastNight.bed : undefined);
  return { ...(bed !== undefined ? { bed } : {}), ...(wake !== undefined ? { wake } : {}) };
}

// ---------- 眠りの記録を書く ----------

const isEmpty = (s: SleepLog) => !s.bed && !s.up && s.until === undefined && s.plannedBed === undefined && s.plannedWake === undefined;
const sortLogs = (logs: SleepLog[]) => [...logs].sort((a, b) => a.date.localeCompare(b.date) || startOf(a) - startOf(b));

/** 起きた日 date のその夜の眠りを書き換える（なければ作る。空になったら消す）。fn には写しを渡す */
function editNight(logs: SleepLog[], date: DateKey, fn: (s: SleepLog) => SleepLog): SleepLog[] {
  const cur = nightLogOf(logs, date);
  const next = fn(cur ? { ...cur } : { id: date, date });
  const rest = cur ? logs.filter((s) => s !== cur) : logs;
  return sortLogs(isEmpty(next) ? rest : [...rest, next]);
}

/** 「寝る」：起きる日 date の夜に、寝た時刻と、そのときの予定の就寝を残す */
export function pressBed(logs: SleepLog[], date: DateKey, at: number, plannedBed: number): SleepLog[] {
  return editNight(logs, date, (s) => ({ ...s, bed: { at, source: "button", recordedAt: at }, plannedBed }));
}

/** 寝た時刻を取り消す（「今から寝る」で入れた起きる予定も消す） */
export function undoBed(logs: SleepLog[], date: DateKey): SleepLog[] {
  return editNight(logs, date, (s) => {
    delete s.bed;
    delete s.plannedBed;
    delete s.until;
    if (!s.up) delete s.plannedWake;
    return s;
  });
}

/**
 * 「起きた」「いつ起きた？」：起きた時刻を残す。初めて記録するときは、そのときの予定の起床も残す
 * （直すときは、最初に残した予定のまま）
 */
export function recordUp(
  logs: SleepLog[],
  date: DateKey,
  at: number,
  source: "button" | "picked",
  expectedWake: number | undefined,
  now: number,
): SleepLog[] {
  return editNight(logs, date, (s) => {
    const plannedWake = s.up ? (s.plannedWake ?? expectedWake) : (expectedWake ?? s.plannedWake);
    const next: SleepLog = { ...s, up: { at, source, recordedAt: now } };
    if (plannedWake !== undefined) next.plannedWake = plannedWake;
    return next;
  });
}

/** 寝た時刻を直す（おやすみのカードで時刻を押して）。予定の就寝はそのまま */
export function correctBed(logs: SleepLog[], date: DateKey, at: number, now: number): SleepLog[] {
  return editNight(logs, date, (s) => ({ ...s, bed: { at, source: s.bed?.source === "reset" ? "reset" : "picked", recordedAt: now } }));
}

/**
 * 起きた時刻を取り消す。「起きたところ」で入れた眠りなら、寝た時刻も一緒に消す。
 * 朝ルーティンを始めていれば（keepPlanned）、そのときの予定の起床は残す
 */
export function undoUp(logs: SleepLog[], date: DateKey, keepPlanned: boolean): SleepLog[] {
  return editNight(logs, date, (s) => {
    if (s.up?.source === "reset" && s.bed?.source === "reset" && s.until === undefined) {
      delete s.bed;
      delete s.plannedBed;
    }
    delete s.up;
    if (!keepPlanned && s.until === undefined) delete s.plannedWake;
    return s;
  });
}

/** 「起きた」を押す前に朝ルーティンを始めたとき：そのときの予定の起床を残す */
export function notePlannedWake(logs: SleepLog[], date: DateKey, wake: number | undefined): SleepLog[] {
  if (wake === undefined || nightLogOf(logs, date)?.plannedWake !== undefined) return logs;
  return editNight(logs, date, (s) => ({ ...s, plannedWake: wake }));
}

/** 朝ルーティンのチェックをすべて外したとき：起きた記録がなければ、残した予定の起床も消す */
export function dropPlannedWake(logs: SleepLog[], date: DateKey): SleepLog[] {
  const cur = nightLogOf(logs, date);
  if (!cur || cur.plannedWake === undefined || cur.up || cur.until !== undefined) return logs;
  return editNight(logs, date, (s) => {
    delete s.plannedWake;
    return s;
  });
}

/**
 * 「今から立て直す」の今から寝る（sleep：寝た時刻と起きる予定）・起きたところ（woke：寝た・起きた時刻）。以前の版の記録を移すときにも使う。
 * 起きる日のその夜の眠りに書き込む。重なる「今から立て直す」だけの眠りは、新しいほうに置き換える。
 * planned は記録するときの予定（今から寝るは、入れた起きる予定を予定の起床にする）
 */
export function recordReset(
  logs: SleepLog[],
  reset: { mode: "sleep" | "woke"; start: number; end: number },
  planned: { bed?: number; wake?: number } = {},
  now?: number,
): SleepLog[] {
  const date = dateKeyOf(reset.end);
  const mark = (at: number): SleepMark => ({ at, source: "reset", ...(now !== undefined ? { recordedAt: now } : {}) });
  const onlyReset = (s: SleepLog) => s.bed?.source === "reset" && (!s.up || s.up.source === "reset");
  const overlaps = (s: SleepLog) => {
    const end = s.up?.at ?? s.until;
    return s.bed !== undefined && end !== undefined && s.bed.at < reset.end && end > reset.start;
  };
  const target = nightLogOf(logs, date);
  const rest = logs.filter((s) => s !== target && !(onlyReset(s) && overlaps(s)));
  const next: SleepLog = target ? { ...target } : { id: date, date };
  next.bed = mark(reset.start);
  if (reset.mode === "woke") {
    next.up = mark(reset.end);
    delete next.until;
  } else next.until = reset.end;
  const plannedBed = next.plannedBed ?? planned.bed;
  const plannedWake = reset.mode === "sleep" ? (planned.wake ?? next.plannedWake) : (next.plannedWake ?? planned.wake);
  if (plannedBed !== undefined) next.plannedBed = plannedBed;
  if (plannedWake !== undefined) next.plannedWake = plannedWake;
  return sortLogs([...rest, next]);
}

/** 予定どおり起きた：活動開始が予定の起床から30分以内（ヘルスケアの目覚めは使わない。目が覚めても起き上がったとは限らないため） */
export const upOnTime = (n: Night) =>
  n.up !== undefined && n.plannedWake !== undefined && n.up.at <= n.plannedWake + ON_TIME_GRACE_MINUTES * MIN;

/**
 * 就寝の判定に使う時刻：活動終了、なければヘルスケアの入眠。
 * 入眠は寝床に入ったあとなので、入眠が間に合っていれば寝床に入るのも間に合っている
 */
export const bedTimeOf = (n: Night): NightTime | undefined => n.bed ?? (n.asleep !== undefined ? { at: n.asleep, source: "health" } : undefined);

/** 予定どおり寝た：活動終了（なければ入眠）が予定の就寝から30分以内 */
export const bedOnTimeOf = (n: Night) => {
  const b = bedTimeOf(n);
  return b !== undefined && n.plannedBed !== undefined && b.at <= n.plannedBed + ON_TIME_GRACE_MINUTES * MIN;
};

/** 寝つくまで（活動終了 → 入眠）と、起き上がるまで（目覚め → 活動開始）の分。両方の記録がある夜だけ */
export const fallAsleepMinutes = (n: Night) =>
  n.bed && n.asleep !== undefined && n.asleep >= n.bed.at ? Math.round((n.asleep - n.bed.at) / MIN) : undefined;
export const getUpMinutes = (n: Night) =>
  n.up && n.awake !== undefined && n.up.at >= n.awake ? Math.round((n.up.at - n.awake) / MIN) : undefined;

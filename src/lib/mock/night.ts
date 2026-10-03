import { DAY_MS, MIN } from "./jst";
import { dateKeyOf, dayStartOfKey, type DateKey, type MockData } from "./model";

/**
 * 夜の記録：起きた日ごとに、その夜の時刻を1つにまとめる。
 * 「活動」（寝床に入った・起きて動き出した）と「睡眠」（ヘルスケアの入眠・目覚め）を分けて持ち、その差も見られるようにする。
 * どの場面（組み直し・ご褒美・記録の画面・朝のカード）も、ここで決めた値を使う
 */

/** 値の出どころ。手で入れた値 → ボタン（「寝る」「起きた」） → 朝ルーティンの最初のチェック → ヘルスケア の順に優先する */
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
  /** 活動終了（寝床に入った）：「今から立て直す」で入れた寝た時刻 → 「寝る」 */
  bed?: NightTime;
  /** 活動開始（起きて動き出した）：「今から立て直す」で入れた起きた時刻 → 「起きた」 → 朝ルーティンの最初のチェック */
  up?: NightTime;
  /** ヘルスケアの入眠（寝ついた）と目覚め */
  asleep?: number;
  awake?: number;
  /** 睡眠時間（分）：手で直した値 → ヘルスケア → 活動終了〜活動開始（どちらも手かボタンのとき） */
  sleep?: { minutes: number; source: "manual" | "health" | "button" };
}

/** 予定どおりかを見る猶予（分）。起床・就寝とも同じ */
export const ON_TIME_GRACE_MINUTES = 30;

type NightData = Pick<MockData, "wakeLogs" | "bedLogs"> &
  Partial<Pick<MockData, "healthSleep" | "dayLogs" | "rhythmResets" | "settings">>;

/** 起きた日 date の夜の記録 */
export function nightOf(data: NightData, date: DateKey): Night {
  const day = dayStartOfKey(date);
  const prevKey = day === undefined ? undefined : dateKeyOf(day - DAY_MS);
  const wake = data.wakeLogs.find((l) => l.date === date);
  const bedLog = prevKey ? data.bedLogs[prevKey] : undefined;
  const health = data.healthSleep?.[date];
  // 自分で入れた立て直し（その朝に終わるもの）。起きたところ＝寝た・起きた時刻、今から寝る＝寝た時刻
  const manual = (data.rhythmResets ?? []).filter((r) => r.mode !== "tired" && dateKeyOf(r.end) === date).sort((a, b) => b.end - a.end)[0];

  const bed: NightTime | undefined = manual
    ? { at: manual.start, source: "manual" }
    : bedLog
      ? { at: bedLog.at, source: "button" }
      : undefined;
  const up: NightTime | undefined =
    manual?.mode === "woke"
      ? { at: manual.end, source: "manual" }
      : wake?.wokeAt !== undefined
        ? { at: wake.wokeAt, source: "button" }
        : wake?.routineStartedAt !== undefined
          ? { at: wake.routineStartedAt, source: "routine" }
          : undefined;

  const plannedWake = wake?.plannedWake;
  const sleepMinutes = data.settings?.sleepMinutes;
  const plannedBed =
    bedLog?.plannedBed ??
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
    ...(health ? { asleep: health.start, awake: health.end } : {}),
    ...(sleep ? { sleep } : {}),
  };
}

/** 記録のある夜をすべて（起きた日の古い順） */
export function allNights(data: NightData): Night[] {
  const dates = new Set<DateKey>([
    ...data.wakeLogs.map((l) => l.date),
    ...Object.keys(data.healthSleep ?? {}),
    ...Object.keys(data.bedLogs).flatMap((k) => {
      const d = dayStartOfKey(k);
      return d === undefined ? [] : [dateKeyOf(d + DAY_MS)];
    }),
    ...(data.rhythmResets ?? []).filter((r) => r.mode !== "tired").map((r) => dateKeyOf(r.end)),
  ]);
  return [...dates].sort().map((d) => nightOf(data, d));
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

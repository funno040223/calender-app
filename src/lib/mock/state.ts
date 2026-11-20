import { RESET_KEEP_DAYS, bedtimeSleeps, manualSleeps, reconcileBedtime } from "./bedtime";
import { nightOf, recordReset, sleepSessions } from "./night";
import { captureTaskBlocks, planTagsOf } from "./progress";
import { DEFAULT_SETTINGS, computeDayPlans, buildOutlook, contactDays, plan, wakingDayStart, type CalendarEvent, type EveningEnergy, type ExerciseInput, type Habit, type PlanResult, type Settings, type Tag } from "@/lib/scheduler";
import { buildClassEvents, classEventsForPlan, dateKeyOf, dayStartOfKey, type ClassEvent, type Course, type ContactAnswer, type DoneTask, RAIN_THRESHOLD, type HabitMark, type TaskCheck, type DayLog, type HealthSleep, type MockData, type RewardBank, type RewardRates, type RewardSpend, type SleepLog, type SleepMark, type TiredPause, type WakeLog, type TaskBlockLog, CONTACT_ANSWERS, DEFAULT_REWARD_RATES, HABIT_MARKS } from "./model";
import { EMPTY_REWARD_BANK, bankRewards } from "./stats";
import { DAY_MS, MIN, dayStartOf } from "./jst";
// 前の「家での運動」の習慣。運動のプランを使うあいだは置かない
import { LEGACY_EXERCISE_HABIT } from "@/lib/life/model";
import { UTOKYO_TERMS } from "./utokyo";
import {
  SAMPLE_RECOVERY_OPTIONS,
  SAMPLE_AVOID_WINDOWS,
  SAMPLE_HABITS,
  SAMPLE_PERIODS,
  SAMPLE_PLACES,
  SAMPLE_ROUTINE_STEPS,
  SAMPLE_TAGS,
  SAMPLE_TREATS,
  MONDAY_CLASS,
  BATH,
  GROWTH_HABIT,
  BREAKFAST_HABIT,
  COOK_CUES,
  WALK_CUE,
  homeExerciseHabit,
  WALK_TIMES,
  buildSampleCourses,
  buildSampleOwnEvents,
  buildSampleTasks,
} from "./sample";

/** 保存するデータの読み書きと、組み直し。画面（store.ts）とサーバー（定期実行）の両方から使う */

export interface MockState extends MockData {
  /** 時間割から作った授業の予定（任意参加で参加しない回も含む。表示用） */
  classEvents: ClassEvent[];
  googleEvents: CalendarEvent[];
  result: PlanResult;
  plannedAt: number;
  /** 配置に使った作業の種類（所要時間の目安は、実績がたまれば実績の中央値） */
  planTags: Tag[];
  /**
   * 組み直しで決めた、習慣をやった日（保存しない）。lastDone＝間隔の習慣の最後にやった時刻、
   * weekDays＝週に何回かの習慣の今日より前にやった日（直近14日、その日の 0:00）
   */
  habitDone: { lastDone: Record<string, number>; weekDays: Record<string, number[]> };
}

export { LEARN_MIN_SAMPLES, learnedMinutes, planTagsOf } from "./progress";

/** タスクの種類の初期値 */
/** 作業の種類の初期値（保存したデータの tags がなければこれ） */
export const TAGS = SAMPLE_TAGS;

export const DATA_KEYS = [
  "version",
  "rhythmResets",
  "keepFree",
  "settings",
  "places",
  "periods",
  "courses",
  "habits",
  "avoidWindows",
  "treats",
  "routineSteps",
  "tasks",
  "events",
  "blocks",
  "wakeLogs",
  "habitStarts",
  "anchoredWakes",
  "sleepLogs",
  "dayLogs",
  "healthSleep",
  "hiddenCalendars",
  "eveningEnergy",
  "rainyDays",
  "notRainyDays",
  "weatherPlace",
  "notion",
  "rainForecast",
  "energyChecks",
  "smokeLogs",
  "habitLogs",
  "contactLogs",
  "taskBlockLog",
  "rewardSpends",
  "doneTasks",
  "importedTravel",
  "tags",
  "habitSkips",
  "habitMisses",
  "mealsAtHome",
  "calendarColors",
  "taskChecks",
  "rewardRates",
  "rewardBank",
  "migrations",
] as const satisfies readonly (keyof MockData)[];

/** MockData の項目を足して DATA_KEYS に入れ忘れると、ここで型エラーになる（黙って保存されなくなるのを防ぐ） */
export const ALL_DATA_KEYS_LISTED: [Exclude<keyof MockData, (typeof DATA_KEYS)[number]>] extends [never] ? true : never = true;

/** 日本時間で動かすので、タイムゾーンは設定で変えられない */
const normalizeSettings = (s: Partial<Settings> | undefined): Settings => ({
  ...DEFAULT_SETTINGS,
  ...s,
  tzOffsetMinutes: DEFAULT_SETTINGS.tzOffsetMinutes,
});

export function sampleData(now: number): MockData {
  return {
    version: 2,
    rhythmResets: [],
    keepFree: [],
    // 新しいアカウント（見本）も、本人の使い方に合わせた初期値で始める：朝ルーティン10分・起床のご褒美50円
    settings: { ...normalizeSettings(undefined), routineMinutes: 10 },
    places: SAMPLE_PLACES,
    periods: SAMPLE_PERIODS,
    courses: buildSampleCourses(now),
    habits: [...SAMPLE_HABITS, BREAKFAST_HABIT, homeExerciseHabit(dateKeyOf(now))],
    avoidWindows: SAMPLE_AVOID_WINDOWS,
    treats: SAMPLE_TREATS,
    routineSteps: SAMPLE_ROUTINE_STEPS,
    tasks: buildSampleTasks(now),
    events: buildSampleOwnEvents(now),
    blocks: [],
    wakeLogs: [],
    habitStarts: {},
    anchoredWakes: {},
    sleepLogs: [],
    dayLogs: {},
    healthSleep: {},
    hiddenCalendars: [],
    eveningEnergy: {},
    rainyDays: [],
    notRainyDays: [],
    energyChecks: {},
    smokeLogs: [],
    habitLogs: {},
    contactLogs: {},
    taskBlockLog: {},
    rewardSpends: [],
    doneTasks: [],
    importedTravel: {},
    tags: SAMPLE_TAGS,
    habitSkips: {},
    habitMisses: {},
    mealsAtHome: {},
    calendarColors: {},
    taskChecks: {},
    rewardRates: { ...DEFAULT_REWARD_RATES, wake: 50 },
    rewardBank: EMPTY_REWARD_BANK,
    migrations: [...MIGRATIONS],
  };
}

/** 2026-09-29 のすり合わせ：朝の散歩はなるべく残す、順調な休日に自己成長の枠を置く */
/** 2026-09-29 の作る順3：散歩のあとに家での運動（5分から） */
/** 2026-09-29 の作る順3：家での運動は入浴の直前に（汗を流せるように） */
/** 雨の日の散歩は光を浴びるだけに、余裕がある朝は朝食を */
const MIGRATIONS = [
  "2026-09-29-walk-keeplast",
  "2026-09-29-growth",
  "2026-09-29-home-exercise",
  "2026-09-29-exercise-before-bath",
  "2026-09-29-rain-light-only",
  "2026-09-29-breakfast",
  "2026-09-29-breakfast-after-walk",
  "2026-09-30-morning-meals",
  "2026-09-30-laundry-30",
  "2026-09-30-laundry-avoid-rain",
  "2026-09-30-track-more",
  "2026-10-01-utokyo-periods",
  "2026-10-01-personal-setup",
  "2026-10-01-treats-adventure",
  "2026-10-01-track-meals-bath",
  "2026-10-01-routine-no-drink",
  // 寝た・起きた時刻を眠りの記録（sleepLogs）にまとめた（bedLogs・wakeLogs の起きた時刻・立て直しの睡眠から。fromStoredV2 で移す）
  "2026-10-12-sleep-logs",
  // やった日の控え（habitLastDone・habitDoneDays）を保存しないようにした（組み直すたびに決める。fromStoredV2 で読まない）
  "2026-10-12-habit-done-derived",
] as const;

/** 以前の初期値のままの朝ルーティン・楽しみ（このままなら 2026-10-01 に聞いた中身に置き換える） */
const OLD_ROUTINE_IDS = "step-curtain,step-water,step-wash-face,step-stretch,step-check-plan";
const OLD_TREAT_IDS = "treat-bread,treat-coffee-good,treat-sweets,treat-game,treat-video,treat-manga,treat-brew,treat-snack,treat-music";
/** 2026-10-01 に入れた好物だけのリスト（このままなら、ちょっとした冒険を足したリストに置き換える） */
const FAVORITES_TREAT_IDS = "treat-kanikama,treat-cocoa,treat-banana-shake,treat-sweet-drink,treat-pasta,treat-huikoro,treat-sukiyaki";

/** 以前の初期値の時限（9:00 から90分）。このままなら東大の時限に置き換える */
const OLD_SAMPLE_PERIODS = [
  [1, 9 * 60, 10 * 60 + 30],
  [2, 10 * 60 + 40, 12 * 60 + 10],
  [3, 13 * 60, 14 * 60 + 30],
  [4, 14 * 60 + 40, 16 * 60 + 10],
  [5, 16 * 60 + 20, 17 * 60 + 50],
  [6, 18 * 60, 19 * 60 + 30],
];

const TRACK_MORE = ["habit-walk", GROWTH_HABIT.id, "habit-tidy", "habit-laundry", "habit-cook-lunch", "habit-cook-dinner"];
/** 食事と入浴も、やったかどうかを記録する（やらない日もあるので、始まっただけでは数えない） */
const TRACK_MEALS_BATH = [BREAKFAST_HABIT.id, "habit-lunch", "habit-dinner", "habit-bath"];
/** 2026-10-01 に入れた朝ルーティン。このままなら「好きな飲み物を作る」を外す（飲まない日もあってよい） */
const DRINK_ROUTINE_IDS = "step-stretch-bed,step-curtain,step-water,step-drink";

function migrate(d: MockData, now: number): MockData {
  const done = new Set(d.migrations);
  let habits = d.habits;
  if (!done.has("2026-09-29-walk-keeplast")) habits = habits.map((h) => (h.id === "habit-walk" ? { ...h, keepLast: true } : h));
  if (!done.has("2026-09-29-growth") && !habits.some((h) => h.id === GROWTH_HABIT.id)) habits = [...habits, GROWTH_HABIT];
  const exercise = homeExerciseHabit(dateKeyOf(now));
  if (!done.has("2026-09-29-home-exercise") && !habits.some((h) => h.id === exercise.id)) habits = [...habits, exercise];
  if (!done.has("2026-09-29-rain-light-only"))
    habits = habits.map((h) =>
      h.id === "habit-walk" && h.rainAlternative?.title === "窓際で光を浴びる＋家での運動" ? { ...h, rainAlternative: WALK_TIMES.rainAlternative } : h,
    );
  // 散歩のあとに置くように、散歩の次に並べる
  if (!done.has("2026-09-29-breakfast") && !habits.some((h) => h.id === BREAKFAST_HABIT.id)) {
    const i = habits.findIndex((h) => h.id === "habit-walk");
    habits = i < 0 ? [...habits, BREAKFAST_HABIT] : [...habits.slice(0, i + 1), BREAKFAST_HABIT, ...habits.slice(i + 1)];
  }
  if (!done.has("2026-09-29-breakfast-after-walk"))
    habits = habits.map((h) =>
      h.id === BREAKFAST_HABIT.id && !h.cue && h.anchor === "wake" ? { ...h, ...BREAKFAST_HABIT, anchor: undefined, name: h.name, durationMinutes: h.durationMinutes } : h,
    );
  // 2026-09-30：朝ルーティン → 朝食 → 散歩、昼食は12時から（朝食から3時間あける）、自炊は食事の直前に。初期値のままのものだけ
  if (!done.has("2026-09-30-morning-meals"))
    habits = habits.map((h) => {
      if (h.id === "habit-lunch" && h.windowStart === 11 * 60) return { ...h, windowStart: 12 * 60 };
      if (h.id === BREAKFAST_HABIT.id && h.cue?.type === "habit" && h.cue.habitId === "habit-walk") return { ...h, cue: BREAKFAST_HABIT.cue, meal: true };
      if (h.id === "habit-walk" && !h.cue && h.anchor === "wake") return { ...h, cue: WALK_CUE };
      const cook = COOK_CUES[h.id as keyof typeof COOK_CUES];
      if (cook && !h.cue) return { ...h, cue: cook };
      return h;
    });
  // 干すときに取り込みもするので30分に（初期値のままのものだけ）
  if (!done.has("2026-09-30-laundry-30"))
    habits = habits.map((h) =>
      h.id === "habit-laundry" && h.finish?.title === "洗濯物を干す" && h.finish.durationMinutes === 15
        ? { ...h, finish: { ...h.finish, title: "洗濯物を干す・取り込む", durationMinutes: 30 } }
        : h,
    );
  if (!done.has("2026-09-30-laundry-avoid-rain")) habits = habits.map((h) => (h.id === "habit-laundry" ? { ...h, avoidRain: true } : h));
  // ご褒美をためる方法を増やす：散歩・自己成長・片付け・洗濯・自炊も「記録する」にする
  if (!done.has("2026-09-30-track-more")) habits = habits.map((h) => (TRACK_MORE.includes(h.id) ? { ...h, track: true } : h));
  if (!done.has("2026-10-01-track-meals-bath")) habits = habits.map((h) => (TRACK_MEALS_BATH.includes(h.id) ? { ...h, track: true } : h));
  // 散歩のあとに置いていた最初の版を、入浴の直前に移す（自分で変えたきっかけはそのまま）
  if (!done.has("2026-09-29-exercise-before-bath"))
    habits = habits.map((h) => {
      if (h.id !== exercise.id || h.cue?.type !== "habit" || h.cue.habitId !== "habit-walk") return h;
      const { cueFallback: _drop, ...rest } = h as Habit & { cueFallback?: unknown };
      void _drop;
      return { ...rest, cue: exercise.cue, energyCost: exercise.energyCost };
    });
  // 東大（情報理工）に合わせて、初期値のままの時限を東大の標準にする（自分で変えた時限はそのまま）
  let periods = d.periods;
  if (
    !done.has("2026-10-01-utokyo-periods") &&
    periods.length === OLD_SAMPLE_PERIODS.length &&
    [...periods].sort((a, b) => a.number - b.number).every((p, i) => p.number === OLD_SAMPLE_PERIODS[i][0] && p.start === OLD_SAMPLE_PERIODS[i][1] && p.end === OLD_SAMPLE_PERIODS[i][2])
  )
    periods = SAMPLE_PERIODS;
  // 2026-10-01 に聞いた生活に合わせる（初期値のままのものだけ）：朝ルーティン・楽しみ・本郷キャンパス・月曜3・4限の授業・起床のご褒美
  let { routineSteps, treats, places, courses, settings, rewardRates } = d;
  if (!done.has("2026-10-01-personal-setup")) {
    if (routineSteps.map((s) => s.id).join() === OLD_ROUTINE_IDS) {
      routineSteps = SAMPLE_ROUTINE_STEPS;
      if (settings.routineMinutes === 15) settings = { ...settings, routineMinutes: 10 };
    }
    if (treats.map((t) => t.id).join() === OLD_TREAT_IDS) treats = SAMPLE_TREATS;
    places = places.map((p) => (p.id === "place-univ" && p.name === "大学" ? { ...p, ...SAMPLE_PLACES[0], travelMinutes: p.travelMinutes } : p));
    const a = UTOKYO_TERMS.find((t) => t.id === "2026-A");
    if (courses.length === 0 && a) courses = [{ ...MONDAY_CLASS, termStart: a.start, termEnd: a.end }];
    // 起きるのを後押しする（起床のご褒美を 30円 → 50円。自分で変えた額はそのまま）
    if (rewardRates.wake === 30) rewardRates = { ...rewardRates, wake: 50 };
  }
  // 朝ルーティンは起き上がって光と水まで。好きな飲み物は、飲む日だけ（楽しみのリストにもある）
  if (!done.has("2026-10-01-routine-no-drink") && routineSteps.map((s) => s.id).join() === DRINK_ROUTINE_IDS)
    routineSteps = routineSteps.filter((s) => s.id !== "step-drink");
  // 好物だけのリストを、いつもから少し外れた楽しみ（本郷の近くのちょっとした冒険・好物のひとひねり）に広げる
  if (!done.has("2026-10-01-treats-adventure") && treats.map((t) => t.id).join() === FAVORITES_TREAT_IDS) treats = SAMPLE_TREATS;
  return { ...d, habits, periods, routineSteps, treats, places, courses, settings, rewardRates, migrations: [...new Set([...d.migrations, ...MIGRATIONS])] };
}

const isRecord = (x: unknown): x is Record<string, unknown> => !!x && typeof x === "object" && !Array.isArray(x);

function parseHabitLogs(x: unknown): MockData["habitLogs"] {
  if (!isRecord(x)) return {};
  return Object.fromEntries(
    Object.entries(x).flatMap(([day, v]) => {
      if (!isRecord(v)) return [];
      const marks = Object.entries(v).filter((e): e is [string, HabitMark] => HABIT_MARKS.includes(e[1] as HabitMark));
      return marks.length ? [[day, Object.fromEntries(marks)]] : [];
    }),
  );
}

const EVENING_LEVELS: EveningEnergy[] = ["high", "normal", "low"];

/**
 * 眠りの設計（2026-09-29）に合わせて、初期値のままの散歩と入浴の時間帯を、起床・就寝からの時間帯に移す。
 * 自分で時間帯を変えたものはそのまま
 */
function migrateHabit(h: Habit): Habit {
  if (h.anchor) return h;
  if (h.id === "habit-bath" && h.windowStart === 20 * 60 && h.windowEnd === 23 * 60 + 30) {
    return { ...h, windowStart: BATH.windowStart, windowEnd: BATH.windowEnd, anchor: BATH.anchor };
  }
  if (h.id === "habit-walk" && h.windowStart === 10 * 60 && h.windowEnd === 18 * 60) return { ...h, ...WALK_TIMES };
  return h;
}

const isArray = (v: unknown): v is unknown[] => Array.isArray(v);
const arr = <T,>(v: unknown, fallback: T[]): T[] => (isArray(v) ? (v as T[]) : fallback);

const finite = (x: unknown): x is number => typeof x === "number" && Number.isFinite(x);
const SLEEP_SOURCES: SleepMark["source"][] = ["button", "picked", "reset"];
const isMark = (x: unknown): x is SleepMark =>
  isRecord(x) && finite(x.at) && SLEEP_SOURCES.includes(x.source as SleepMark["source"]) && (x.recordedAt === undefined || finite(x.recordedAt));
const isReset = (x: unknown): x is { id: string; mode: string; start: number; end: number } =>
  isRecord(x) && typeof x.id === "string" && finite(x.start) && finite(x.end) && x.end > x.start && x.end - x.start <= 48 * 60 * MIN;

/** 記録しない習慣の、始まった枠の時刻を残す日数 */
export const HABIT_START_KEEP_DAYS = 60;

/**
 * 記録しない習慣の、始まった枠の時刻。以前の行（habitStarts がない）は、控えから引き継ぐ：
 * habitLastDone は最後に始まった枠の時刻、habitDoneDays はやった日（0:00）なので、その日の正午を始まった時刻とする
 * （その日の分として数え、夜中の睡眠とも重ならない）
 */
function parseHabitStarts(v: unknown, legacyLastDone: unknown, legacyDoneDays: unknown): Record<string, number[]> {
  const out: Record<string, number[]> = {};
  if (isRecord(v)) {
    for (const [id, ts] of Object.entries(v)) if (Array.isArray(ts)) out[id] = ts.filter(finite);
    return out;
  }
  const add = (id: string, t: unknown) => {
    if (finite(t)) out[id] = [...new Set([...(out[id] ?? []), t])].sort((a, b) => a - b);
  };
  if (isRecord(legacyLastDone)) for (const [id, t] of Object.entries(legacyLastDone)) add(id, t);
  if (isRecord(legacyDoneDays)) for (const [id, days] of Object.entries(legacyDoneDays)) if (Array.isArray(days)) for (const day of days) if (finite(day)) add(id, day + 12 * 60 * MIN);
  return out;
}

/** 眠りの記録の上限（1日1〜2件で1年あまり。保存は pruneOldLogs で400日） */
const SLEEP_LOG_MAX = 500;

function parseSleepLogs(v: unknown): SleepLog[] {
  return arr<unknown>(v, [])
    // 昼寝の記録（以前の版の nap）は捨てる（昼の休みは「休む」だけにした）
    .filter((x) => !(isRecord(x) && x.nap === true))
    .map((x) => {
      if (!isRecord(x) || !("nap" in x)) return x;
      const { nap: _nap, ...rest } = x;
      void _nap;
      return rest;
    })
    .filter(
      (x): x is SleepLog =>
        isRecord(x) &&
        typeof x.id === "string" &&
        typeof x.date === "string" &&
        /^\d{4}-\d{2}-\d{2}$/.test(x.date) &&
        (x.bed === undefined || isMark(x.bed)) &&
        (x.up === undefined || isMark(x.up)) &&
        [x.until, x.plannedBed, x.plannedWake].every((t) => t === undefined || finite(t)),
    )
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-SLEEP_LOG_MAX);
}

/**
 * 以前の形の記録（「寝る」の bedLogs、wakeLogs の起きた時刻と予定の起床、立て直しの sleep・woke）を、眠りの記録に移す。
 * 以前の版で保存された行にだけ残っている（今の版は保存しない）ので、残っていれば毎回移す。眠りの記録にもうある日は、そちらを使う
 */
export function withLegacySleep(logs: SleepLog[], d: Partial<Record<string, unknown>>): SleepLog[] {
  const byDate = new Map<string, SleepLog>();
  const night = (date: string) => byDate.get(date) ?? byDate.set(date, { id: date, date }).get(date)!;
  for (const l of arr<unknown>(d.wakeLogs, [])) {
    if (!isRecord(l) || typeof l.date !== "string") continue;
    if (finite(l.wokeAt)) night(l.date).up = { at: l.wokeAt, source: "button", ...(finite(l.wokeRecordedAt) ? { recordedAt: l.wokeRecordedAt } : {}) };
    if (finite(l.plannedWake)) night(l.date).plannedWake = l.plannedWake;
  }
  if (isRecord(d.bedLogs)) {
    for (const [key, b] of Object.entries(d.bedLogs)) {
      const day = dayStartOfKey(key);
      if (day === undefined || !isRecord(b) || !finite(b.at) || !finite(b.plannedBed)) continue;
      const n = night(dateKeyOf(day + DAY_MS));
      n.bed = { at: b.at, source: "button" };
      n.plannedBed = b.plannedBed;
    }
  }
  let legacy = [...byDate.values()];
  // その朝の活動開始（「起きた」・朝ルーティンの最初のチェック）。これより後に入れた立て直し（昼寝）は移さずに捨てる
  // （夜の記録を置き換えないため。ヘルスケアの目覚めは使わない）
  const rawWake = arr<unknown>(d.wakeLogs, []).filter(isRecord);
  const dayUp = (date: string) => {
    const times = [legacy.find((s) => s.date === date)?.up?.at, rawWake.find((l) => l.date === date)?.routineStartedAt].filter(finite);
    return times.length ? Math.min(...times) : undefined;
  };
  // 立て直しは、以前の読み方（自分で入れた時刻を優先し、同じ朝なら終わりの遅いほう）になるように古い順に重ねる
  const resets = arr<unknown>(d.rhythmResets, []).filter(isReset).filter((r): r is typeof r & { mode: "sleep" | "woke" } => r.mode === "sleep" || r.mode === "woke");
  for (const r of resets.sort((a, b) => a.end - b.end)) {
    const up = dayUp(dateKeyOf(r.end));
    if (up !== undefined && up <= r.start) continue;
    legacy = recordReset(legacy, r);
  }
  // 立て直しで入れた起床の朝は、予定の起床・就寝を計画の控え（前の日の予定の就寝。就寝＝翌日の起床 − 睡眠時間）から補う
  const dayLogs = isRecord(d.dayLogs) ? d.dayLogs : {};
  const sleepMinutes = isRecord(d.settings) && finite(d.settings.sleepMinutes) ? d.settings.sleepMinutes : DEFAULT_SETTINGS.sleepMinutes;
  legacy = legacy.map((n) => {
    const day = dayStartOfKey(n.date);
    const prev = day === undefined ? undefined : dayLogs[dateKeyOf(day - DAY_MS)];
    const bed = isRecord(prev) && finite(prev.bed) ? prev.bed : undefined;
    if (n.up?.source !== "reset" || bed === undefined) return n;
    return { ...n, plannedBed: n.plannedBed ?? bed, plannedWake: n.plannedWake ?? bed + sleepMinutes * MIN };
  });
  if (!legacy.length) return logs;
  const have = new Set(logs.map((s) => s.date));
  return [...logs, ...legacy.filter((s) => !have.has(s.date))].sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * 以前の版（眠りの記録を知らない。iPhone に開いたままの古い画面など）が保存した行には sleepLogs がない。
 * その行を読むときは、この端末にある眠りの記録のうち、行にない夜を残す（行にある夜は行のほう）。
 * 何も残さなければ同じものを返す
 */
export function keepLocalSleep(raw: unknown, remote: MockData, local: Pick<MockData, "sleepLogs">): MockData {
  if (!isRecord(raw) || "sleepLogs" in raw) return remote;
  const when = (m: SleepMark | undefined) => (m ? (m.recordedAt ?? m.at) : -Infinity);
  let changed = false;
  const byId = new Map(remote.sleepLogs.map((s) => [s.id, s]));
  for (const l of local.sleepLogs) {
    const r = byId.get(l.id);
    // 行にない夜（昼寝を含む）は、この端末のものを残す
    if (!r) {
      byId.set(l.id, l);
      changed = true;
      continue;
    }
    // 両方にある夜は、寝た・起きた時刻ごとに、あとから記録したほう（この端末の「いつ起きた？」で直した時刻など）
    const next = { ...r };
    if (when(l.bed) > when(r.bed)) Object.assign(next, { bed: l.bed, ...(l.plannedBed !== undefined ? { plannedBed: l.plannedBed } : {}), ...(l.until !== undefined ? { until: l.until } : {}) });
    if (when(l.up) > when(r.up)) Object.assign(next, { up: l.up, ...(l.plannedWake !== undefined ? { plannedWake: l.plannedWake } : {}) });
    if (next.bed !== r.bed || next.up !== r.up) {
      byId.set(l.id, next);
      changed = true;
    }
  }
  return changed ? { ...remote, sleepLogs: [...byId.values()].sort((a, b) => a.date.localeCompare(b.date)) } : remote;
}

/** 保存された v2 のデータ。欠けている項目はサンプルで補う */
export function fromStoredV2(raw: unknown, now: number): MockData | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const d = raw as Partial<Record<keyof MockData, unknown>>;
  if (d.version !== 2) return undefined;
  const s = sampleData(now);
  return migrate({
    version: 2,
    settings: normalizeSettings(d.settings as Partial<Settings> | undefined),
    places: arr(d.places, s.places),
    periods: arr(d.periods, s.periods),
    courses: arr<Course>(d.courses, s.courses).map((c) => ({
      ...c,
      optional: !!c.optional,
      cancelledDates: arr(c.cancelledDates, []),
      attendedDates: arr(c.attendedDates, []),
    })),
    habits: arr<Habit>(d.habits, s.habits).map(migrateHabit),
    avoidWindows: arr(d.avoidWindows, s.avoidWindows),
    treats: arr(d.treats, s.treats),
    routineSteps: arr(d.routineSteps, s.routineSteps),
    tasks: arr(d.tasks, s.tasks),
    events: arr(d.events, s.events),
    blocks: arr(d.blocks, []),
    wakeLogs: arr<unknown>(d.wakeLogs, []).filter(isRecord).map((l) => {
      // 起きた時刻と予定の起床は眠りの記録へ移した
      const { wokeAt: _a, wokeRecordedAt: _b, plannedWake: _c, ...rest } = l;
      void [_a, _b, _c];
      return rest as unknown as WakeLog;
    }),
    sleepLogs: withLegacySleep(parseSleepLogs(d.sleepLogs), d),
    // 以前保存していた habitLastDone・habitDoneDays は、組み直すたびに決めるので読まない。
    // 記録しない習慣の最後に始まった枠（habitLastDone の値）だけは、始まった時刻として引き継ぐ
    anchoredWakes: isRecord(d.anchoredWakes)
      ? Object.fromEntries(Object.entries(d.anchoredWakes).filter((e): e is [string, number] => /^\d{4}-\d{2}-\d{2}$/.test(e[0]) && finite(e[1])))
      : {},
    habitStarts: parseHabitStarts(d.habitStarts, (raw as Record<string, unknown>).habitLastDone, (raw as Record<string, unknown>).habitDoneDays),
    dayLogs: isRecord(d.dayLogs)
      ? Object.fromEntries(
          Object.entries(d.dayLogs).filter(
            (e): e is [string, DayLog] =>
              isRecord(e[1]) && typeof e[1].events === "number" && typeof e[1].away === "boolean" && Array.isArray(e[1].habits) && isRecord(e[1].meals),
          ),
        )
      : {},
    healthSleep: isRecord(d.healthSleep)
      ? Object.fromEntries(
          Object.entries(d.healthSleep).filter(
            (e): e is [string, HealthSleep] =>
              isRecord(e[1]) && [e[1].start, e[1].end, e[1].minutes].every((x) => typeof x === "number" && Number.isFinite(x)),
          ),
        )
      : {},
    hiddenCalendars: arr(d.hiddenCalendars, []),
    eveningEnergy:
      d.eveningEnergy && typeof d.eveningEnergy === "object" && !Array.isArray(d.eveningEnergy)
        ? Object.fromEntries(
            Object.entries(d.eveningEnergy as Record<string, unknown>).filter(
              (e): e is [string, EveningEnergy] => EVENING_LEVELS.includes(e[1] as EveningEnergy),
            ),
          )
        : {},
    rainyDays: arr<unknown>(d.rainyDays, []).filter((x): x is string => typeof x === "string"),
    notRainyDays: arr<unknown>(d.notRainyDays, []).filter((x): x is string => typeof x === "string"),
    notion:
      isRecord(d.notion) && typeof d.notion.dateProp === "string"
        ? {
            dateProp: d.notion.dateProp,
            stageProp: typeof d.notion.stageProp === "string" ? d.notion.stageProp : undefined,
            ignoreStages: arr<unknown>(d.notion.ignoreStages, []).filter((x): x is string => typeof x === "string"),
            stageMinutes: isRecord(d.notion.stageMinutes)
              ? Object.fromEntries(Object.entries(d.notion.stageMinutes).filter((e): e is [string, number] => typeof e[1] === "number" && e[1] > 0))
              : undefined,
            dismissed: arr<unknown>(d.notion.dismissed, []).filter((x): x is string => typeof x === "string"),
            fetchedAt: typeof d.notion.fetchedAt === "number" ? d.notion.fetchedAt : undefined,
          }
        : undefined,
    weatherPlace:
      isRecord(d.weatherPlace) && typeof d.weatherPlace.name === "string" && typeof d.weatherPlace.lat === "number" && typeof d.weatherPlace.lon === "number"
        ? { name: d.weatherPlace.name, lat: d.weatherPlace.lat, lon: d.weatherPlace.lon }
        : undefined,
    rainForecast:
      isRecord(d.rainForecast) && typeof d.rainForecast.fetchedAt === "number" && isRecord(d.rainForecast.days)
        ? {
            fetchedAt: d.rainForecast.fetchedAt,
            days: Object.fromEntries(Object.entries(d.rainForecast.days).filter((e): e is [string, number] => typeof e[1] === "number")),
          }
        : undefined,
    energyChecks:
      d.energyChecks && typeof d.energyChecks === "object" && !Array.isArray(d.energyChecks)
        ? (d.energyChecks as MockData["energyChecks"])
        : {},
    smokeLogs: arr<unknown>(d.smokeLogs, [])
      .filter((x): x is number => typeof x === "number" && Number.isFinite(x))
      .sort((a, b) => a - b),
    habitLogs: parseHabitLogs(d.habitLogs),
    taskBlockLog: isRecord(d.taskBlockLog)
      ? Object.fromEntries(
          Object.entries(d.taskBlockLog).filter(
            (e): e is [string, TaskBlockLog] => isRecord(e[1]) && typeof e[1].start === "number" && typeof e[1].end === "number",
          ),
        )
      : {},
    rewardSpends: arr<unknown>(d.rewardSpends, []).filter(
      (x): x is RewardSpend => isRecord(x) && typeof x.id === "string" && typeof x.at === "number" && typeof x.amount === "number",
    ),
    doneTasks: arr<unknown>(d.doneTasks, []).filter(
      (x): x is DoneTask => isRecord(x) && typeof x.id === "string" && typeof x.title === "string" && typeof x.doneAt === "number",
    ),
    // 作業の種類は ID ごとに初期値へ重ねる（新しい項目が増えても欠けないように）
    tags: SAMPLE_TAGS.map((t) => {
      const saved = arr<unknown>(d.tags, []).find((x): x is Partial<Tag> => isRecord(x) && x.id === t.id);
      return saved ? { ...t, ...saved, id: t.id, mode: t.mode } : t;
    }),
    habitSkips: isRecord(d.habitSkips)
      ? Object.fromEntries(
          Object.entries(d.habitSkips).flatMap(([k, v]) => (Array.isArray(v) ? [[k, v.filter((x): x is string => typeof x === "string")]] : [])),
        )
      : {},
    habitMisses: isRecord(d.habitMisses)
      ? Object.fromEntries(
          Object.entries(d.habitMisses).flatMap(([k, v]) => (Array.isArray(v) ? [[k, v.filter((x): x is string => typeof x === "string")]] : [])),
        )
      : {},
    mealsAtHome: isRecord(d.mealsAtHome)
      ? Object.fromEntries(
          Object.entries(d.mealsAtHome).flatMap(([k, v]) => (Array.isArray(v) ? [[k, v.filter((x): x is string => typeof x === "string")]] : [])),
        )
      : {},
    calendarColors: isRecord(d.calendarColors)
      ? Object.fromEntries(Object.entries(d.calendarColors).filter((e): e is [string, string] => typeof e[1] === "string" && /^#[0-9a-f]{6}$/i.test(e[1])))
      : {},
    importedTravel: isRecord(d.importedTravel)
      ? Object.fromEntries(Object.entries(d.importedTravel).filter((e): e is [string, number] => typeof e[1] === "number" && e[1] >= 0))
      : {},
    taskChecks: isRecord(d.taskChecks)
      ? Object.fromEntries(Object.entries(d.taskChecks).filter((e): e is [string, TaskCheck] => isRecord(e[1]) && typeof e[1].at === "number"))
      : {},
    // 「疲れている」だけ。寝た・起きた時刻（以前の sleep・woke）は眠りの記録へ移した
    rhythmResets: arr<unknown>(d.rhythmResets, []).filter((x): x is TiredPause => isReset(x) && x.mode === "tired"),
    keepFree: arr<unknown>(d.keepFree, []).filter((x): x is NonNullable<MockData["keepFree"]>[number] =>
      isRecord(x) && typeof x.id === "string" && typeof x.start === "number" && Number.isFinite(x.start) && typeof x.end === "number" && Number.isFinite(x.end) && x.end > x.start && (x.taskId === undefined || typeof x.taskId === "string")),
    rewardBank: parseRewardBank(d.rewardBank),
    rewardRates: { ...DEFAULT_REWARD_RATES, ...(isRecord(d.rewardRates) ? (d.rewardRates as Partial<RewardRates>) : {}) },
    contactLogs: isRecord(d.contactLogs)
      ? Object.fromEntries(Object.entries(d.contactLogs).filter((e): e is [string, ContactAnswer] => CONTACT_ANSWERS.includes(e[1] as ContactAnswer)))
      : {},
    migrations: arr<unknown>(d.migrations, []).filter((x): x is string => typeof x === "string"),
  }, now);
}

/**
 * v1（カレンダーだけの試作）からの移行。自分の予定・タスク・枠・場所・表示の設定は引き継ぎ、
 * 時間割・習慣・楽しみなどの新しい項目はサンプルで埋める。
 */
export function migrateV1(raw: unknown, now: number): MockData | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const d = raw as Record<string, unknown>;
  if (!isArray(d.ownEvents) || !isArray(d.tasks) || !isArray(d.blocks)) return undefined;
  const s = sampleData(now);
  return {
    ...s,
    events: d.ownEvents as MockData["events"],
    tasks: d.tasks as MockData["tasks"],
    blocks: d.blocks as MockData["blocks"],
    places: arr(d.places, s.places),
    hiddenCalendars: arr(d.hiddenCalendars, []),
  };
}

export function toData(state: MockData): MockData {
  const out: Record<string, unknown> = {};
  for (const k of DATA_KEYS) out[k] = state[k];
  return out as unknown as MockData;
}

/** plan() に渡す予定（自分の予定・授業・取り込んだ予定）。通知もこれを使う */
export function planEvents(data: Pick<MockData, "events" | "importedTravel">, classEvents: ClassEvent[], googleEvents: CalendarEvent[]): CalendarEvent[] {
  return [
    ...data.events.map((e) => ({ ...e, play: e.calendarId === "play" })),
    ...classEventsForPlan(classEvents),
    // 取り込んだ予定は、自分で付けた移動時間があればそれを使う
    ...googleEvents.map((e) => (data.importedTravel[e.id] !== undefined ? { ...e, travelMinutes: data.importedTravel[e.id] } : e)),
  ];
}

/**
 * エンジンで組み直す。配置のロジックはすべて plan() に任せる。
 * exercise は運動のプラン（生活記録から作る）。"unknown" は、プランを使っているが記録を読めなかったとき（前の習慣も置かない）
 */
export function replan(data: MockData, googleEvents: CalendarEvent[], now: number, exercise?: ExerciseInput | "unknown"): MockState {
  const classEvents = buildClassEvents(data.courses, data.periods);
  const events = planEvents(data, classEvents, googleEvents);
  // 「寝る」「起きた」の記録から見積もった睡眠（自分で入れた立て直しのほうが優先）
  const resets = [...manualSleeps(data, now), ...(data.rhythmResets ?? []).filter((r) => r.end > now - RESET_KEEP_DAYS * DAY_MS)];
  const sleeps = bedtimeSleeps(data, events, now, resets);
  const asleep = [...resets.filter((r) => r.mode !== "tired"), ...sleeps];
  // 「今日は飛ばす」にした習慣：その日には置かず、もう始まっている枠も外す。「できなかった」にした枠も外す（あとに入れ直す）
  const skipDays = byHabit(data.habitSkips);
  const missed = new Set(Object.values(data.habitMisses).flat());
  // 飛ばした日は「起きている日」で見る（夜中の枠は前の日の分。画面で記録・飛ばすときと同じ）
  // 画面（今日の流れ・カレンダー）と同じく、前回の計画の起床〜就寝で日を分ける（計画の外は、予定から決めた起床・就寝）
  const today0 = dayStartOfKey(dateKeyOf(now))!;
  const knownDays = [
    ...((data as Partial<MockState>).result?.dayPlans ?? []),
    ...computeDayPlans(today0 - (HABIT_START_KEEP_DAYS + 1) * DAY_MS, HABIT_START_KEEP_DAYS + 3, events, data.places, data.settings),
  ];
  const wakingDayOf = (t: number) => dayStartOfKey(dateKeyOf(wakingDayStart(t, knownDays, data.settings.tzOffsetMinutes)))!;
  const isSkipped = (b: Pick<MockData["blocks"][number], "kind" | "refId" | "start">) =>
    b.kind === "habit" && ((skipDays[b.refId] ?? []).includes(wakingDayOf(b.start)) || missed.has(`${b.refId}:${b.start}`));
  // やっていない枠：飛ばした・できなかった・寝ていた間の枠
  // 寝ていた時間は、組み直しの睡眠（直近2日の見積もりを含む）に加えて、眠りの記録とヘルスケアの睡眠からも見る
  // （habitStarts を残す60日のあいだ、あとから「寝ていた」と分かった枠がやったに戻らないように）
  const slept = [
    ...asleep,
    ...sleepSessions(data).flatMap((x) => {
      const end = x.up?.at ?? x.until ?? (x.bed ? x.bed.at + data.settings.sleepMinutes * MIN : undefined);
      return x.bed && end !== undefined && end > x.bed.at ? [{ start: x.bed.at, end }] : [];
    }),
    ...Object.values(data.healthSleep).map((h) => ({ start: h.start, end: h.end })),
  ];
  const notDone = (b: Pick<MockData["blocks"][number], "kind" | "refId" | "start" | "end">) =>
    isSkipped(b) || slept.some((r) => b.start < r.end && b.end > r.start);
  // 記録しない習慣は、始まった枠をもって「やった」とみなす。始まった時刻だけを事実として残し（habitStarts）、
  // やったかどうかは毎回ここで決め直す（あとから寝ていたと分かった枠・飛ばした枠は数えない）
  // 起きた時刻が分かった日：新しい朝ルーティンと重なる前の計画の枠は外す（planner）。予定の起床から大きくずれた朝は、
  // 実際の起床から朝を組み直し（段階2）、起床から今までに前の計画が置いた自動の習慣を外す（作業の枠は「作業の進み具合」で聞くので残す）
  const anchorDay = wakingDayOf(now);
  const anchor = anchorOf(data, anchorDay, now, wakingDayOf, computeDayPlans(anchorDay, 1, events, data.places, data.settings)[0]?.wake);
  const dropped = new Set(anchor?.dropped ?? []);
  const droppedKeys = new Set([...dropped].map((b) => `${b.refId}:${b.start}`));
  const given = data.blocks;
  if (anchor?.relayout) {
    // 組み直した起床を残す（同じ起床で何度も組み直さない）
    data = { ...data, blocks: data.blocks.filter((b) => !dropped.has(b)), anchoredWakes: { ...data.anchoredWakes, [dateKeyOf(anchor.dayStart)]: anchor.wake } };
  }
  const startsFrom = now - HABIT_START_KEEP_DAYS * DAY_MS;
  const starts = new Map<string, Set<number>>();
  const addStart = (id: string, t: number) => {
    if (t < startsFrom || t > now) return;
    (starts.get(id) ?? starts.set(id, new Set()).get(id)!).add(t);
  };
  // 「記録する」に変えた習慣の分は捨てる（記録で数えるので）
  const plainIds = new Set(data.habits.filter((h) => !h.track).map((h) => h.id));
  // 組み直しで外した枠は、始まっていてもやったに数えない
  for (const [id, ts] of Object.entries(data.habitStarts)) if (plainIds.has(id)) for (const t of ts) if (!droppedKeys.has(`${id}:${t}`)) addStart(id, t);
  for (const b of data.blocks) {
    const h = data.habits.find((x) => x.id === b.refId);
    if (b.kind === "habit" && h && !h.track && !dropped.has(b) && (b.title === h.name || b.title === h.rainAlternative?.title)) addStart(h.id, b.start);
  }
  const habitStarts = Object.fromEntries([...starts].map(([id, ts]) => [id, [...ts].sort((a, b) => a - b)]));
  const doneStarts = (h: Habit) =>
    (habitStarts[h.id] ?? []).filter((t) => !notDone({ kind: "habit", refId: h.id, start: t, end: t + h.durationMinutes * MIN }));
  // 「記録する」習慣は「やった」を押した日だけ（時刻が過ぎただけで数えると、寝坊して過ぎた枠も「やった」になり、次が何日も先へ送られる）
  const markedDays = (h: Habit) => Object.keys(data.habitLogs).filter((k) => data.habitLogs[k]?.[h.id]).flatMap((k) => dayStartOfKey(k) ?? []);
  // 間隔で置く習慣（洗濯など）の最後にやった日・時刻と、週に何回かの習慣の今日より前にやった日（直近14日）。保存せず、ここで決める
  const today = dayStartOfKey(dateKeyOf(now))!;
  const habitLastDone: Record<string, number> = {};
  const doneForPlan: Record<string, number[]> = {};
  for (const h of data.habits) {
    if (h.frequency.type === "interval") {
      const last = Math.max(-Infinity, ...(h.track ? markedDays(h) : doneStarts(h)));
      if (Number.isFinite(last)) habitLastDone[h.id] = last;
    } else if (h.frequency.type === "weekly") {
      const days = new Set(h.track ? markedDays(h) : doneStarts(h).map(wakingDayOf));
      doneForPlan[h.id] = [...days].filter((t) => t < today && t >= today - 14 * DAY_MS).sort((a, b) => a - b);
    }
  }
  data = captureTaskBlocks({ ...data, habitStarts }, now);
  const planTags = planTagsOf(data);
  data = reconcileBedtime(data, sleeps, now);
  // この組み直しで1つ目（回すなど）を外した（寝ていた・組み直しで外した）待ち時間のある習慣は、2つ目（干すなど）も外す。
  // 前の日に始めた・手で動かした1つ目（もともとないもの）では外さない
  const removed = given.filter((b) => dropped.has(b) || !data.blocks.includes(b));
  for (const b of data.blocks) {
    const h = b.kind === "habit" ? data.habits.find((x) => x.id === b.refId) : undefined;
    if (!h?.finish || b.title !== h.finish.title || b.title === h.name || b.pinned || dropped.has(b)) continue;
    const parentStart = b.start - h.finish.afterStartMinutes * MIN;
    if (removed.some((x) => x.refId === h.id && x.title === h.name && x.start === parentStart)) dropped.add(b);
  }
  const result = plan({
    now,
    ...(exercise && exercise !== "unknown" ? { exercise } : {}),
    rhythmResets: [...resets, ...sleeps],
    // 朝ルーティンを始めた時刻（最初のチェック）。起床の直後でなく、ここから置く
    routineStarts: Object.fromEntries(
      data.wakeLogs.flatMap((l) => {
        const day = dayStartOfKey(l.date);
        return l.routineStartedAt !== undefined && day !== undefined ? [[day, l.routineStartedAt]] : [];
      }),
    ),
    keepFree: data.keepFree,
    settings: data.settings,
    events,
    places: data.places,
    habits: exercise ? data.habits.map((habit) => habit.id === LEGACY_EXERCISE_HABIT
      ? { ...habit, frequency: { type: "weekly", times: 0 } } : habit) : data.habits,
    tags: planTags,
    tasks: data.tasks,
    avoidWindows: data.avoidWindows,
    recoveryOptions: SAMPLE_RECOVERY_OPTIONS,
    habitLastDone,
    habitDoneDays: doneForPlan,
    previousBlocks: data.blocks.filter((b) => !isSkipped(b) && !dropped.has(b)
      && (!exercise || b.refId !== LEGACY_EXERCISE_HABIT || b.pinned || b.start <= now)),
    ...(anchor ? { anchor: { dayStart: anchor.dayStart, keep: anchor.keep, relayout: anchor.relayout } } : {}),
    eveningEnergy: Object.fromEntries(
      Object.entries(data.eveningEnergy).flatMap(([k, v]) => {
        const day = dayStartOfKey(k);
        return day === undefined ? [] : [[day, v]];
      }),
    ),
    rainyDays: rainyDayKeys(data, now).flatMap((k) => dayStartOfKey(k) ?? []),
    skipHabitDays: skipDays,
    mealAtHomeDays: byHabit(data.mealsAtHome),
  });
  data = captureDayLog(data, result, events, now);
  data = pruneOldLogs({ ...data, rewardBank: bankRewards(data, now) }, now);
  return { ...toData(data), classEvents, googleEvents, blocks: result.blocks, result, plannedAt: now, planTags, habitDone: { lastDone: habitLastDone, weekDays: doneForPlan } };
}

/** 予定の起床からこれ以上ずれた朝だけ、実際の起床から朝を組み直す（1時間までは大きなずれとしない。2026-10-13 に決めた） */
export const ANCHOR_AFTER_MINUTES = 60;

/**
 * 起きた時刻が分かった日（その日の活動開始＝夜の記録の up が今より前）。keep＝その日の記録・確認の済んだ枠。
 * relayout＝実際の起床から朝を組み直す（段階2）：予定の起床から60分より大きくずれていて、まだその起床で組み直していない
 * （anchoredWakes に残した起床と違う）とき。そのときの dropped＝起床から今までに収まる、前の計画の自動の習慣
 * （固定・記録の済んだもの、今も続いている枠、作業の枠は除く）と、その1つ目を外した待ち時間のある習慣の2つ目（干すなど）
 */
export function anchorOf(
  data: MockData,
  dayStart: number,
  now: number,
  wakingDayOf: (t: number) => number,
  plannedWake: number | undefined,
): { dayStart: number; wake: number; relayout: boolean; dropped: MockData["blocks"]; keep: string[] } | undefined {
  const key = dateKeyOf(dayStart);
  const night = nightOf(data, key);
  const up = night.up?.at;
  if (up === undefined || up > now) return undefined;
  const planned = night.plannedWake ?? plannedWake;
  const relayout = planned !== undefined && Math.abs(up - planned) > ANCHOR_AFTER_MINUTES * MIN && data.anchoredWakes[key] !== up;
  const dayEnd = dayStart + DAY_MS + 4 * 60 * MIN;
  const recorded = (b: MockData["blocks"][number]) => {
    const k = `${b.refId}:${b.start}`;
    if (b.kind === "task") return data.taskBlockLog[k]?.reviewedAt !== undefined || data.taskBlockLog[k]?.doneAt !== undefined;
    return b.kind === "habit" && data.habitLogs[dateKeyOf(wakingDayOf(b.start))]?.[b.refId] !== undefined;
  };
  const onDay = data.blocks.filter((b) => b.start >= dayStart && b.start < dayEnd && wakingDayOf(b.start) === dayStart);
  const keep = onDay.filter(recorded).map((b) => `${b.refId}:${b.start}`);
  if (!relayout) return { dayStart, wake: up, relayout, dropped: [], keep };
  // 作業の枠は外さない（起床から記録するまでの作業は「作業の進み具合」で聞く。FR-S2）
  const dropped = onDay.filter((b) => b.kind === "habit" && b.start >= up && b.end <= now && !b.pinned && !recorded(b));
  // 1つ目（回すなど）を外したら、その2つ目（干すなど）も外す（今も続いていても、1つ目をしていないので）
  const children = onDay.filter((b) => {
    const h = b.kind === "habit" ? data.habits.find((x) => x.id === b.refId) : undefined;
    if (!h?.finish || b.title !== h.finish.title || b.pinned || recorded(b) || dropped.includes(b)) return false;
    const parentStart = b.start - h.finish.afterStartMinutes * MIN;
    return dropped.some((x) => x.refId === h.id && x.title === h.name && x.start === parentStart);
  });
  return { dayStart, wake: up, relayout, dropped: [...dropped, ...children], keep };
}

/** 日ごとの記録を残す日数。ご褒美は3週間より前の分を繰り越してあるので、消えても減らない */
const LOG_KEEP_DAYS = 400;

/** 上限なく増える記録の、古い分を捨てる（1行の JSON を小さく保つ）。何も捨てなければ同じものを返す */
export function pruneOldLogs(d: MockData, now: number): MockData {
  const from = now - LOG_KEEP_DAYS * DAY_MS;
  const fromKey = dateKeyOf(from);
  const byKey = <T,>(r: Record<string, T>) => {
    const entries = Object.entries(r);
    const kept = entries.filter(([k]) => k >= fromKey);
    return kept.length === entries.length ? r : Object.fromEntries(kept);
  };
  const upTo = <T,>(xs: T[], keep: (x: T) => boolean) => (xs.every(keep) ? xs : xs.filter(keep));
  const next: MockData = {
    ...d,
    habitLogs: byKey(d.habitLogs),
    eveningEnergy: byKey(d.eveningEnergy),
    energyChecks: byKey(d.energyChecks),
    contactLogs: byKey(d.contactLogs),
    anchoredWakes: byKey(d.anchoredWakes),
    smokeLogs: upTo(d.smokeLogs, (t) => t >= from),
    wakeLogs: upTo(d.wakeLogs, (l) => l.date >= fromKey),
    sleepLogs: upTo(d.sleepLogs, (l) => l.date >= fromKey),
    doneTasks: upTo(d.doneTasks, (t) => t.doneAt >= from),
    taskBlockLog: Object.values(d.taskBlockLog).every((b) => b.start >= from) ? d.taskBlockLog : Object.fromEntries(Object.entries(d.taskBlockLog).filter(([, b]) => b.start >= from)),
  };
  return (Object.keys(next) as (keyof MockData)[]).every((k) => next[k] === d[k]) ? d : next;
}

function parseRewardBank(v: unknown): RewardBank {
  if (!isRecord(v) || typeof v.until !== "number" || !Number.isFinite(v.until) || !isRecord(v.yen)) return EMPTY_REWARD_BANK;
  const y = v.yen;
  const num = (k: string) => (typeof y[k] === "number" && Number.isFinite(y[k]) ? (y[k] as number) : 0);
  return { until: v.until, yen: { wake: num("wake"), routine: num("routine"), bed: num("bed"), habit: num("habit"), task: num("task"), log: num("log") } };
}

/** 計画の控えを残す日数 */
const DAY_LOG_DAYS = 120;

/**
 * 今日の計画の控えを残す（予定の数・外出・雨・行動ポイント・置いた習慣と食事の時刻）。
 * 習慣は一度でも置いたものを残し（飛ばした日も「置いた日」に数える）、食事は今の置き方にする
 */
export function captureDayLog(data: MockData, result: PlanResult, events: CalendarEvent[], now: number): MockData {
  const today = dayStartOf(now);
  const end = today + DAY_MS;
  const key = dateKeyOf(today);
  const todays = events.filter((e) => !e.allDay && e.start >= today && e.start < end);
  const energy = result.dayEnergy.find((x) => x.dayStart === today);
  const plan = result.dayPlans.find((x) => x.dayStart === today);
  const prev = data.dayLogs[key];
  const habits = new Set(prev?.habits ?? []);
  const meals: Record<string, number> = {};
  for (const b of result.blocks) {
    if (b.kind !== "habit" || b.start < today || b.start >= end) continue;
    const h = data.habits.find((x) => x.id === b.refId);
    if (h?.track) habits.add(h.id);
    if (h?.meal && meals[h.id] === undefined) meals[h.id] = b.start;
  }
  const next: DayLog = {
    events: todays.length,
    away: plan?.outing ?? false,
    ...(plan?.heavy !== undefined ? { heavy: plan.heavy } : {}),
    rainy: rainyDayKeys(data, now).includes(key),
    ...(energy ? { points: energy.used, budget: energy.budget } : {}),
    ...(plan ? { bed: plan.bed } : {}),
    habits: [...habits].sort(),
    meals,
  };
  if (prev && JSON.stringify(prev) === JSON.stringify(next)) return data;
  const from = dateKeyOf(today - DAY_LOG_DAYS * DAY_MS);
  const kept = Object.entries(data.dayLogs).filter(([k]) => k >= from && k !== key);
  return { ...data, dayLogs: Object.fromEntries([...kept, [key, next]]) };
}


/** 「連絡してみる？」を聞く日（まだ答えていない週だけ）。今日の画面と朝のまとめの通知で使う */
export function contactDaysFor(state: MockState, now: number): { weekStart: number; dayStart: number }[] {
  const tz = state.settings.tzOffsetMinutes;
  const weeks = buildOutlook({ now, result: state.result, minSlackMinutesPerDay: state.settings.minSlackMinutesPerDay, tzOffsetMinutes: tz });
  return contactDays(weeks, state.result.dayPlans, now, tz)
    .filter((c) => !state.contactLogs[dateKeyOf(c.weekStart)]);
}

/** タスクを完了にする：一覧と配置から外し、完了の記録に移す */
/**
 * タスクの枠を1つ外して、その時間は空けておく（タスクも習慣も自動では入れない）。
 * 外した分の作業は、組み直しで別の時間に入る。終わって1日たった空き時間は捨てる
 */
export function keepBlockFree(d: MockData, block: { start: number; end: number; refId?: string }, id: string, now: number): MockData {
  const entry = { id, start: block.start, end: block.end, ...(block.refId ? { taskId: block.refId } : {}) };
  return { ...d, keepFree: [...(d.keepFree ?? []).filter((k) => k.end > now - DAY_MS), entry] };
}

/** 習慣の枠を「できなかった」にする。やっていない扱いにし、入る時間があればあとに入れ直す */
export function missHabitBlock(d: MockData, block: { refId: string; start: number }): MockData {
  const day = dateKeyOf(block.start);
  // 記録は60日ぶんだけ残す
  const kept = Object.entries(d.habitMisses).filter(([k]) => k >= dateKeyOf(block.start - 60 * DAY_MS));
  return { ...d, habitMisses: { ...Object.fromEntries(kept), [day]: [...new Set([...(d.habitMisses[day] ?? []), `${block.refId}:${block.start}`])] } };
}

/** 空けた時間を戻す（また自動で入るようにする） */
export function releaseKeepFree(d: MockData, id: string): MockData {
  return { ...d, keepFree: (d.keepFree ?? []).filter((k) => k.id !== id) };
}

export function completeTask(d: MockData, id: string, now: number): MockData {
  const t = d.tasks.find((x) => x.id === id);
  if (!t) return d;
  const done: DoneTask = { id: t.id, title: t.title, deadline: t.deadline, tagId: t.tagId, estimateMinutes: t.durationMinutes, doneAt: now };
  return { ...d, tasks: d.tasks.filter((x) => x.id !== id), doneTasks: [...d.doneTasks, done] };
}

/**
 * 移動時間を聞く取り込んだ予定：場所も移動時間のメモもなく、まだ答えていない7日先までの時刻の予定。
 * 場所のない予定は「家にいる」扱いになり、外出でも移動を考えずにタスクが入るため
 */
export function travelAsks(state: Pick<MockState, "googleEvents" | "importedTravel">, now: number): CalendarEvent[] {
  return [...state.googleEvents].sort((a, b) => a.start - b.start).filter(
    (e) =>
      !e.allDay &&
      !e.location?.trim() &&
      e.travelMinutes === undefined &&
      !e.atHome &&
      !/移動\s*\d/.test(e.description ?? "") &&
      state.importedTravel[e.id] === undefined &&
      e.start > now &&
      e.start < now + 7 * DAY_MS,
  );
}

/** 予報がこれより古いときは使わない（アプリを開かない間に、外れているかもしれない） */
export const FORECAST_FRESH_MS = 24 * 60 * 60_000;

/** 雨の日：手で雨にした日と、予報の雨の確率が RAIN_THRESHOLD 以上の日。晴れたので戻した日は除く。古い予報は使わない */
export function rainyDayKeys(data: Pick<MockData, "rainyDays" | "notRainyDays" | "rainForecast">, now = Date.now()): string[] {
  const fresh = data.rainForecast && now - data.rainForecast.fetchedAt <= FORECAST_FRESH_MS;
  const forecast = Object.entries(fresh ? (data.rainForecast?.days ?? {}) : {})
    .filter(([, p]) => p >= RAIN_THRESHOLD)
    .map(([k]) => k);
  const not = new Set(data.notRainyDays);
  return [...new Set([...data.rainyDays, ...forecast])].filter((k) => !not.has(k));
}

/** 日付 → 習慣の ID の記録を、習慣の ID → その日の 0:00 にする */
function byHabit(rec: Record<string, string[]>): Record<string, number[]> {
  const out: Record<string, number[]> = {};
  for (const [key, ids] of Object.entries(rec)) {
    const day = dayStartOfKey(key);
    if (day === undefined) continue;
    for (const id of ids) (out[id] ??= []).push(day);
  }
  return out;
}

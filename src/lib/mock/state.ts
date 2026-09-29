import { DEFAULT_SETTINGS, buildOutlook, contactDays, plan, type CalendarEvent, type EveningEnergy, type Habit, type PlanResult, type Settings } from "@/lib/scheduler";
import { buildClassEvents, classEventsForPlan, dateKeyOf, dayStartOfKey, type ClassEvent, type Course, type ContactAnswer, type HabitMark, type MockData, type RewardRates, type RewardSpend, type TaskBlockLog, CONTACT_ANSWERS, DEFAULT_REWARD_RATES, HABIT_MARKS, taskBlockKey } from "./model";
import { DAY_MS } from "./jst";
import {
  SAMPLE_RECOVERY_OPTIONS,
  SAMPLE_AVOID_WINDOWS,
  SAMPLE_HABITS,
  SAMPLE_PERIODS,
  SAMPLE_PLACES,
  SAMPLE_ROUTINE_STEPS,
  SAMPLE_TAGS,
  SAMPLE_TREATS,
  BATH,
  GROWTH_HABIT,
  BREAKFAST_HABIT,
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
}

/** タスクの種類（まだ編集画面はないので固定） */
export const TAGS = SAMPLE_TAGS;

const DATA_KEYS = [
  "version",
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
  "habitLastDone",
  "hiddenCalendars",
  "eveningEnergy",
  "rainyDays",
  "energyChecks",
  "smokeLogs",
  "habitLogs",
  "contactLogs",
  "taskBlockLog",
  "rewardSpends",
  "rewardRates",
  "migrations",
] as const satisfies readonly (keyof MockData)[];

/** 日本時間で動かすので、タイムゾーンは設定で変えられない */
const normalizeSettings = (s: Partial<Settings> | undefined): Settings => ({
  ...DEFAULT_SETTINGS,
  ...s,
  tzOffsetMinutes: DEFAULT_SETTINGS.tzOffsetMinutes,
});

export function sampleData(now: number): MockData {
  return {
    version: 2,
    settings: normalizeSettings(undefined),
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
    habitLastDone: {},
    hiddenCalendars: [],
    eveningEnergy: {},
    rainyDays: [],
    energyChecks: {},
    smokeLogs: [],
    habitLogs: {},
    contactLogs: {},
    taskBlockLog: {},
    rewardSpends: [],
    rewardRates: DEFAULT_REWARD_RATES,
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
] as const;

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
  // 散歩のあとに置いていた最初の版を、入浴の直前に移す（自分で変えたきっかけはそのまま）
  if (!done.has("2026-09-29-exercise-before-bath"))
    habits = habits.map((h) => {
      if (h.id !== exercise.id || h.cue?.type !== "habit" || h.cue.habitId !== "habit-walk") return h;
      const { cueFallback: _drop, ...rest } = h as Habit & { cueFallback?: unknown };
      void _drop;
      return { ...rest, cue: exercise.cue, energyCost: exercise.energyCost };
    });
  return { ...d, habits, migrations: [...new Set([...d.migrations, ...MIGRATIONS])] };
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
    wakeLogs: arr(d.wakeLogs, []),
    habitLastDone:
      d.habitLastDone && typeof d.habitLastDone === "object" && !Array.isArray(d.habitLastDone)
        ? (d.habitLastDone as Record<string, number>)
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
export function planEvents(data: Pick<MockData, "events">, classEvents: ClassEvent[], googleEvents: CalendarEvent[]): CalendarEvent[] {
  return [
    ...data.events.map((e) => ({ ...e, play: e.calendarId === "play" })),
    ...classEventsForPlan(classEvents),
    ...googleEvents,
  ];
}

/** エンジンで組み直す。配置のロジックはすべて plan() に任せる */
export function replan(data: MockData, googleEvents: CalendarEvent[], now: number): MockState {
  const classEvents = buildClassEvents(data.courses, data.periods);
  // 間隔で置く習慣は、始まった枠をもって「やった」とみなす（実績の記録は第2段階）
  const habitLastDone = { ...data.habitLastDone };
  for (const b of data.blocks) {
    const h = data.habits.find((x) => x.id === b.refId);
    if (b.kind === "habit" && h?.frequency.type === "interval" && b.title === h.name && b.start <= now) {
      habitLastDone[h.id] = Math.max(habitLastDone[h.id] ?? 0, b.start);
    }
  }
  // 始まったタスクの枠を記録に残す（組み直すと過ぎた枠は消えるため。予定どおりできたかを数える）
  const taskBlockLog = Object.fromEntries(Object.entries(data.taskBlockLog).filter(([, l]) => l.start >= now - 60 * DAY_MS));
  for (const b of data.blocks) {
    if (b.kind !== "task" || b.start > now) continue;
    const key = taskBlockKey(b.refId, b.start);
    if (!taskBlockLog[key]) taskBlockLog[key] = { title: b.title, start: b.start, end: b.end };
  }
  data = { ...data, habitLastDone, taskBlockLog };
  const result = plan({
    now,
    settings: data.settings,
    events: planEvents(data, classEvents, googleEvents),
    places: data.places,
    habits: data.habits,
    tags: TAGS,
    tasks: data.tasks,
    avoidWindows: data.avoidWindows,
    recoveryOptions: SAMPLE_RECOVERY_OPTIONS,
    habitLastDone,
    previousBlocks: data.blocks,
    eveningEnergy: Object.fromEntries(
      Object.entries(data.eveningEnergy).flatMap(([k, v]) => {
        const day = dayStartOfKey(k);
        return day === undefined ? [] : [[day, v]];
      }),
    ),
    rainyDays: data.rainyDays.flatMap((k) => dayStartOfKey(k) ?? []),
  });
  return { ...toData(data), classEvents, googleEvents, blocks: result.blocks, result, plannedAt: now };
}


/** 「連絡してみる？」を聞く日（まだ答えていない週だけ）。今日の画面と朝のまとめの通知で使う */
export function contactDaysFor(state: MockState, now: number): { weekStart: number; dayStart: number }[] {
  const tz = state.settings.tzOffsetMinutes;
  const weeks = buildOutlook({ now, result: state.result, minSlackMinutesPerDay: state.settings.minSlackMinutesPerDay, tzOffsetMinutes: tz });
  return contactDays(weeks, state.result.dayPlans, now, tz)
    .filter((c) => !state.contactLogs[dateKeyOf(c.weekStart)]);
}

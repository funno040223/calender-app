import { DEFAULT_SETTINGS, plan, type CalendarEvent, type EveningEnergy, type Habit, type PlanResult, type Settings } from "@/lib/scheduler";
import { buildClassEvents, classEventsForPlan, dayStartOfKey, type ClassEvent, type Course, type MockData } from "./model";
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
    habits: SAMPLE_HABITS,
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
  };
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
  return {
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
  };
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
  data = { ...data, habitLastDone };
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


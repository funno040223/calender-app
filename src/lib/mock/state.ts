import { captureTaskBlocks } from "./progress";
import { DEFAULT_SETTINGS, buildOutlook, contactDays, plan, type CalendarEvent, type EveningEnergy, type Habit, type PlanResult, type Settings, type Tag } from "@/lib/scheduler";
import { buildClassEvents, classEventsForPlan, dateKeyOf, dayStartOfKey, type ClassEvent, type Course, type ContactAnswer, type DoneTask, RAIN_THRESHOLD, type HabitMark, type TaskCheck, type MockData, type RewardRates, type RewardSpend, type BedLog, type TaskBlockLog, CONTACT_ANSWERS, DEFAULT_REWARD_RATES, HABIT_MARKS } from "./model";
import { DAY_MS, MIN } from "./jst";
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
}

/** 実績の目安を使うのに必要な、終わったタスクの数 */
export const LEARN_MIN_SAMPLES = 3;

/**
 * 作業の種類ごとの、実際にかかった時間の中央値（分）と件数。
 * 終わったタスクについて、作業したと確かめた枠の長さを足したものを「かかった時間」とする
 */
export function learnedMinutes(data: Pick<MockData, "doneTasks" | "taskBlockLog">): Record<string, { minutes: number; samples: number }> {
  const spent = new Map<string, number>();
  for (const [key, b] of Object.entries(data.taskBlockLog)) {
    // 「予定どおりできた」「完了」で確かめた枠と、以前の版で残り時間から引いた枠だけを、作業した時間として数える
    const worked = b.workedMinutes ?? (b.outcome === "done" || b.counted ? (b.end - b.start) / MIN : 0);
    if (!worked) continue;
    const id = key.slice(0, key.lastIndexOf(":"));
    spent.set(id, (spent.get(id) ?? 0) + worked);
  }
  const byTag = new Map<string, number[]>();
  for (const t of data.doneTasks) {
    const m = spent.get(t.id);
    if (!t.tagId || !m) continue;
    byTag.set(t.tagId, [...(byTag.get(t.tagId) ?? []), m]);
  }
  return Object.fromEntries(
    [...byTag].map(([tag, xs]) => {
      const s = [...xs].sort((a, b) => a - b);
      const mid = s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
      return [tag, { minutes: Math.round(mid / 15) * 15 || 15, samples: s.length }];
    }),
  );
}

/** 配置に使う作業の種類：実績が LEARN_MIN_SAMPLES 件以上あれば、所要時間の目安を実績の中央値にする */
export function planTagsOf(data: Pick<MockData, "tags" | "doneTasks" | "taskBlockLog">): Tag[] {
  const learned = learnedMinutes(data);
  return data.tags.map((t) => (learned[t.id]?.samples >= LEARN_MIN_SAMPLES ? { ...t, defaultMinutes: learned[t.id].minutes } : t));
}

/** タスクの種類の初期値 */
/** 作業の種類の初期値（保存したデータの tags がなければこれ） */
export const TAGS = SAMPLE_TAGS;

const DATA_KEYS = [
  "version",
  "rhythmResets",
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
  "habitDoneDays",
  "bedLogs",
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
  "mealsAtHome",
  "calendarColors",
  "taskChecks",
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
    rhythmResets: [],
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
    habitDoneDays: {},
    bedLogs: {},
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
    mealsAtHome: {},
    calendarColors: {},
    taskChecks: {},
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
  "2026-09-30-morning-meals",
  "2026-09-30-laundry-30",
  "2026-09-30-laundry-avoid-rain",
  "2026-09-30-track-more",
] as const;

const TRACK_MORE = ["habit-walk", GROWTH_HABIT.id, "habit-tidy", "habit-laundry", "habit-cook-lunch", "habit-cook-dinner"];

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
    habitDoneDays: isRecord(d.habitDoneDays)
      ? Object.fromEntries(
          Object.entries(d.habitDoneDays).map(([id, v]) => [id, Array.isArray(v) ? v.filter((t): t is number => typeof t === "number") : []]),
        )
      : {},
    bedLogs: isRecord(d.bedLogs)
      ? Object.fromEntries(
          Object.entries(d.bedLogs).filter(
            (e): e is [string, BedLog] => isRecord(e[1]) && typeof e[1].at === "number" && typeof e[1].plannedBed === "number" && typeof e[1].smokeFree === "boolean",
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
    rhythmResets: arr<unknown>(d.rhythmResets, []).filter((x): x is NonNullable<MockData["rhythmResets"]>[number] =>
      isRecord(x) && typeof x.id === "string" && ["sleep", "woke", "tired"].includes(String(x.mode)) && typeof x.start === "number" && Number.isFinite(x.start) && typeof x.end === "number" && Number.isFinite(x.end) && x.end > x.start && x.end - x.start <= 48 * 60 * MIN),
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
  // 「今日は飛ばす」にした習慣：その日には置かず、もう始まっている枠も外す
  const skipDays = byHabit(data.habitSkips);
  const isSkipped = (b: MockData["blocks"][number]) =>
    b.kind === "habit" && (skipDays[b.refId] ?? []).some((day) => b.start >= day && b.start < day + DAY_MS);
  // 週に何回かの習慣は、今週やった日を数える（「記録する」の習慣は記録、ほかは始まった枠）
  const today = dayStartOfKey(dateKeyOf(now))!;
  const habitDoneDays: Record<string, number[]> = {};
  const doneForPlan: Record<string, number[]> = {};
  for (const h of data.habits) {
    if (h.frequency.type !== "weekly") continue;
    const recent = Array.from({ length: 14 }, (_, i) => today - (i + 1) * DAY_MS);
    if (h.track) {
      doneForPlan[h.id] = recent.filter((day) => data.habitLogs[dateKeyOf(day)]?.[h.id]);
      continue;
    }
    const days = new Set((data.habitDoneDays[h.id] ?? []).filter((t) => t >= recent.at(-1)!));
    for (const b of data.blocks) {
      if (b.kind === "habit" && b.refId === h.id && b.start <= now && !isSkipped(b) && (b.title === h.name || b.title === h.rainAlternative?.title)) {
        days.add(dayStartOfKey(dateKeyOf(b.start))!);
      }
    }
    habitDoneDays[h.id] = [...days].sort((a, b) => a - b);
    doneForPlan[h.id] = habitDoneDays[h.id].filter((t) => t < today);
  }
  data = captureTaskBlocks({ ...data, habitLastDone, habitDoneDays }, now);
  const planTags = planTagsOf(data);
  const result = plan({
    now,
    rhythmResets: data.rhythmResets,
    settings: data.settings,
    events: planEvents(data, classEvents, googleEvents),
    places: data.places,
    habits: data.habits,
    tags: planTags,
    tasks: data.tasks,
    avoidWindows: data.avoidWindows,
    recoveryOptions: SAMPLE_RECOVERY_OPTIONS,
    habitLastDone,
    habitDoneDays: doneForPlan,
    previousBlocks: data.blocks.filter((b) => !isSkipped(b)),
    eveningEnergy: Object.fromEntries(
      Object.entries(data.eveningEnergy).flatMap(([k, v]) => {
        const day = dayStartOfKey(k);
        return day === undefined ? [] : [[day, v]];
      }),
    ),
    rainyDays: rainyDayKeys(data).flatMap((k) => dayStartOfKey(k) ?? []),
    skipHabitDays: skipDays,
    mealAtHomeDays: byHabit(data.mealsAtHome),
  });
  return { ...toData(data), classEvents, googleEvents, blocks: result.blocks, result, plannedAt: now, planTags };
}


/** 「連絡してみる？」を聞く日（まだ答えていない週だけ）。今日の画面と朝のまとめの通知で使う */
export function contactDaysFor(state: MockState, now: number): { weekStart: number; dayStart: number }[] {
  const tz = state.settings.tzOffsetMinutes;
  const weeks = buildOutlook({ now, result: state.result, minSlackMinutesPerDay: state.settings.minSlackMinutesPerDay, tzOffsetMinutes: tz });
  return contactDays(weeks, state.result.dayPlans, now, tz)
    .filter((c) => !state.contactLogs[dateKeyOf(c.weekStart)]);
}

/** タスクを完了にする：一覧と配置から外し、完了の記録に移す */
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

/** 雨の日：手で雨にした日と、予報の雨の確率が RAIN_THRESHOLD 以上の日。晴れたので戻した日は除く */
export function rainyDayKeys(data: Pick<MockData, "rainyDays" | "notRainyDays" | "rainForecast">): string[] {
  const forecast = Object.entries(data.rainForecast?.days ?? {})
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

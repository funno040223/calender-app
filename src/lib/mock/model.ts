import type { AvoidWindow, Block, CalendarEvent, EveningEnergy, Habit, Place, Settings, Tag, Task } from "@/lib/scheduler";
import type { CalendarId, OwnCalendarId } from "./calendars";
import { DAY_MS, MIN, TZ, fromInputDateTime, toInputDate, weekdayOf } from "./jst";

/**
 * 保存する内容の形。サーバーを作るときは、ここの配列がそれぞれ1つの表になる
 * （settings, places, periods, courses, habits, avoid_windows, treats, routine_steps,
 *  tasks, events, blocks, wake_logs）。配列の並び順はそのまま表示の順（DB では position 列）。
 */

/** 日付だけの値（日本時間）。"2026-09-28" の形。DB の DATE 列に合わせる */
export type DateKey = string;

/**
 * 自分で入れた予定。calendarId で「予定」「遊び」を分ける（未指定は「予定」）。
 * 「遊び」の予定しかない日は、エンジンが休日として扱う。
 */
export type OwnEvent = CalendarEvent & { calendarId?: OwnCalendarId };

/** 時限（1限 9:00–10:30 など）。number が時限の番号で、表の主キー */
export interface Period {
  number: number;
  /** 0時からの分 */
  start: number;
  end: number;
}

/**
 * 時間割の授業。学期の間、毎週同じ曜日にある。
 * 時刻は時限（period）か、時限に合わないゼミなどは開始・終了の時刻（startMinute / endMinute）で決める。
 */
export interface Course {
  id: string;
  name: string;
  /** 0 = 日曜 */
  weekday: number;
  /** Period.number。未指定なら startMinute / endMinute を使う */
  period?: number;
  /** 0時からの分 */
  startMinute?: number;
  endMinute?: number;
  termStart: DateKey;
  termEnd: DateKey;
  location?: string;
  /** 任意参加。参加する回（attendedDates）だけを予定として組み立てに使う */
  optional: boolean;
  /** 休講にした日 */
  cancelledDates: DateKey[];
  /** 任意参加の授業で「この回は参加する」にした日 */
  attendedDates: DateKey[];
}

/** 時間割から作った1回ぶんの授業 */
export interface ClassEvent extends CalendarEvent {
  courseId: string;
  date: DateKey;
  optional: boolean;
  /** 出る回か。任意参加で参加しない回は、空き時間として扱い組み立てに渡さない */
  attending: boolean;
}

/** 授業の時刻（0時からの分）。時限が見つからなければ undefined */
export function courseTimes(c: Course, periods: Period[]): { start: number; end: number } | undefined {
  if (c.period !== undefined) {
    const p = periods.find((x) => x.number === c.period);
    return p ? { start: p.start, end: p.end } : undefined;
  }
  if (c.startMinute === undefined || c.endMinute === undefined || c.endMinute <= c.startMinute) return undefined;
  return { start: c.startMinute, end: c.endMinute };
}

export type TreatCategory = "food" | "hobby" | "reward";

export const TREAT_CATEGORIES: { id: TreatCategory; label: string }[] = [
  { id: "food", label: "食べ物・飲み物" },
  { id: "hobby", label: "趣味・娯楽" },
  { id: "reward", label: "小さなご褒美" },
];

/** 今日の楽しみの候補 */
export interface Treat {
  id: string;
  name: string;
  category: TreatCategory;
  /** ご褒美の条件（「朝ルーティンが終わったら」など） */
  condition?: string;
}

/** 朝ルーティンの手順 */
export interface RoutineStep {
  id: string;
  title: string;
}

/** その日の朝の記録。date が主キー */
export interface WakeLog {
  date: DateKey;
  /** 「起きた」を押した時刻 */
  wokeAt?: number;
  /** 「起きた」を押したときの、予定の起床時刻（予定どおり起きられたかを数える） */
  plannedWake?: number;
  /** 朝ルーティンの手順をすべて終えた時刻 */
  routineDoneAt?: number;
  doneStepIds: string[];
  /** 「起きた」のあとに答えた、朝の疲れ（1 元気 〜 5 ぐったり）。行動ポイントの値を合わせる正解に使う */
  fatigue?: MorningFatigue;
}

export interface TaskBlockLog {
  title: string;
  start: number;
  end: number;
  doneAt?: number;
  /** 旧版で差し引き済みの記録。新しい実績は reviewedAt と outcome で管理する */
  counted?: boolean;
  reviewedAt?: number;
  outcome?: "planned" | "partial" | "none" | "done";
  workedMinutes?: number;
}
export interface DoneTask {
  id: string;
  title: string;
  deadline?: number;
  tagId?: string;
  /** 登録したときの見積もり（分） */
  estimateMinutes?: number;
  doneAt: number;
}
export interface TaskCheck {
  at: number;
  /** done 終わった／adjust 予定の残りに対して巻いた・予定どおり・かかっている／none 今日はやってない */
  answer: "done" | "adjust" | "none";
  /** 予定の残りに足した分（巻いたらマイナス、予定どおりは0） */
  deltaMinutes?: number;
  /** 答える前の予定の残り（分） */
  beforeMinutes?: number;
}
export const taskCheckKey = (taskId: string, day: DateKey) => `${taskId}:${day}`;
export interface RewardSpend {
  id: string;
  at: number;
  amount: number;
  note?: string;
}
/** 1回あたりの円。起床は予定の30分以内に「起きた」、習慣は「記録する」の習慣（5分だけは半分） */
export interface RewardRates {
  wake: number;
  routine: number;
  habit: number;
  task: number;
}
export const DEFAULT_REWARD_RATES: RewardRates = { wake: 30, routine: 30, habit: 30, task: 100 };
export const taskBlockKey = (refId: string, start: number) => `${refId}:${start}`;

export type HabitMark = "done" | "five";
export type ContactAnswer = "done" | "skip";
export const CONTACT_ANSWERS: ContactAnswer[] = ["done", "skip"];
export const HABIT_MARKS: HabitMark[] = ["done", "five"];

export type MorningFatigue = 1 | 2 | 3 | 4 | 5;

/** 帰宅時に体力を答えたときの、行動ポイントの予測（あとで値を合わせるための記録） */
export interface EnergyCheck {
  /** 答えた時点のその日の行動ポイント（予測） */
  predicted: number;
  budget: number;
  at: number;
}

export interface MockData {
  rhythmResets?: import("@/lib/scheduler").RhythmReset[];
  version: 2;
  settings: Settings;
  places: Place[];
  periods: Period[];
  courses: Course[];
  habits: Habit[];
  avoidWindows: AvoidWindow[];
  treats: Treat[];
  routineSteps: RoutineStep[];
  tasks: Task[];
  /** 自分で入れた予定 */
  events: OwnEvent[];
  /** 前回の配置（固定した枠を含む）。次の組み直しに渡す */
  blocks: Block[];
  wakeLogs: WakeLog[];
  /** 間隔で置く習慣（洗濯など）を最後にした時刻。習慣の ID → epoch ミリ秒 */
  habitLastDone: Record<string, number>;
  /** 表示だけの設定（DB では settings に入れる） */
  hiddenCalendars: CalendarId[];
  /** 帰宅したときに答えた残りの体力（日付 → 答え）。今夜の組み方に使い、記録としても残す */
  eveningEnergy: Record<DateKey, EveningEnergy>;
  /** 雨の日にした日。散歩を家の中の代わりにする */
  rainyDays: DateKey[];
  /** 帰宅時の答えと、そのときの予測。答えと eveningEnergy を比べて値を合わせる */
  energyChecks: Record<DateKey, EnergyCheck>;
  /** タバコを吸った時刻（epoch ミリ秒、古い順）。就寝前の本数を、あとで疲れの予測の材料にする */
  smokeLogs: number[];
  /** 習慣をやったかの記録（日付 → 習慣の ID → やった／5分だけ）。押していない日は、やっていない */
  habitLogs: Record<DateKey, Record<string, HabitMark>>;
  /** 「連絡してみる？」への答え（週の月曜の日付 → 連絡した／今週はいい）。答えた週はもう聞かない */
  contactLogs: Record<DateKey, ContactAnswer>;
  /**
   * 始まったタスクの枠の記録（"タスクの ID:開始の epoch ミリ秒" → 枠）。doneAt は「やった」の時刻
   * （予定どおり実行・完了を明示した時刻）。旧版の報酬記録も保持する
   */
  taskBlockLog: Record<string, TaskBlockLog>;
  /** 「終わった」と答えたタスク（一覧と配置からは外す。締切までに終えたかを数える） */
  doneTasks: DoneTask[];
  /** その日の最後の枠のあとに聞いた「終わった？」の答え（"タスクの ID:日付" → 答え）。見積もりを合わせる材料 */
  taskChecks: Record<string, TaskCheck>;
  /** 「今日は飛ばす」にした習慣（日付 → 習慣の ID）。その日には置かない */
  habitSkips: Record<DateKey, string[]>;
  /** 作業の種類（集中・事務）。1回の長さや休憩を設定で変えられる */
  tags: Tag[];
  /** カレンダーの色を変えたもの（カレンダーの ID → #rrggbb）。なければ初期の色 */
  calendarColors: Partial<Record<CalendarId, string>>;
  /** 取り込んだ予定に自分で付けた片道の移動時間（予定の ID → 分。0 は家にいる）。場所のない予定を外出として扱う */
  importedTravel: Record<string, number>;
  /** ご褒美のお金を使った記録 */
  rewardSpends: RewardSpend[];
  /** ご褒美のお金の金額（円） */
  rewardRates: RewardRates;
  /** 済ませたデータの移行の名前（同じ移行を2回しないため） */
  migrations: string[];
}

// ---------- 日付 ----------

export const dateKeyOf = (ms: number): DateKey => toInputDate(ms);
export const dayStartOfKey = (key: DateKey): number | undefined => fromInputDateTime(key);
/** 日本時間の 1970-01-01 からの日数 */
export const dayNumberOf = (ms: number) => Math.floor((ms + TZ * MIN) / DAY_MS);

// ---------- 授業 ----------

/** 1つの学期がこれより長く入力されても、この日数までしか作らない */
const MAX_TERM_DAYS = 400;

export const classEventId = (courseId: string, date: DateKey) => `class:${courseId}:${date}`;

export function parseClassEventId(id: string): { courseId: string; date: DateKey } | undefined {
  const m = id.match(/^class:(.+):(\d{4}-\d{2}-\d{2})$/);
  return m ? { courseId: m[1], date: m[2] } : undefined;
}

/** 時間割から授業の予定を作る（休講の日は除く） */
export function buildClassEvents(courses: Course[], periods: Period[]): ClassEvent[] {
  const out: ClassEvent[] = [];
  for (const c of courses) {
    const times = courseTimes(c, periods);
    const from = dayStartOfKey(c.termStart);
    const to = dayStartOfKey(c.termEnd);
    if (!times || from === undefined || to === undefined) continue;
    const last = Math.min(to, from + MAX_TERM_DAYS * DAY_MS);
    const cancelled = new Set(c.cancelledDates);
    const attended = new Set(c.attendedDates);
    let day = from + ((c.weekday - weekdayOf(from) + 7) % 7) * DAY_MS;
    for (; day <= last; day += 7 * DAY_MS) {
      const key = dateKeyOf(day);
      if (cancelled.has(key)) continue;
      out.push({
        id: classEventId(c.id, key),
        title: c.name,
        start: day + times.start * MIN,
        end: day + times.end * MIN,
        ...(c.location ? { location: c.location } : {}),
        courseId: c.id,
        date: key,
        optional: c.optional,
        attending: !c.optional || attended.has(key),
      });
    }
  }
  return out;
}

/** 組み立てに渡す授業（任意参加で参加しない回は除き、エンジンの形に戻す） */
export function classEventsForPlan(events: ClassEvent[]): CalendarEvent[] {
  return events
    .filter((e) => e.attending)
    .map(({ id, title, start, end, location }) => ({ id, title, start, end, ...(location ? { location } : {}) }));
}

// ---------- 今日の楽しみ ----------

function hashString(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function permutation(n: number, seed: number): number[] {
  const rand = mulberry32(seed);
  const p = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [p[i], p[j]] = [p[j], p[i]];
  }
  return p;
}

/**
 * 日付ごとに決まる「今日の楽しみ」の番号。n 日ごとに並びを変えて全部を一巡し、
 * 2つ以上あれば前の日と同じものにはならない。
 */
export function treatIndexFor(dayNumber: number, n: number, seedText = ""): number {
  if (n <= 0) return -1;
  if (n === 1) return 0;
  const base = hashString(seedText);
  if (n === 2) return permutation(2, base)[((dayNumber % 2) + 2) % 2];
  const cycle = Math.floor(dayNumber / n);
  const pos = dayNumber - cycle * n;
  const permOf = (c: number) => permutation(n, (base ^ Math.imul(c, 0x9e3779b1)) >>> 0);
  const p = permOf(cycle);
  // 並びの切り替わりで、前の並びの最後と同じものが続かないようにする（n ≥ 3 なので前の最後は入れ替えの影響を受けない）
  if (p[0] === permOf(cycle - 1)[n - 1]) [p[0], p[1]] = [p[1], p[0]];
  return p[pos];
}

export function treatFor(dayStart: number, treats: Treat[]): Treat | undefined {
  const i = treatIndexFor(dayNumberOf(dayStart), treats.length, treats.map((t) => t.id).join("|"));
  return i < 0 ? undefined : treats[i];
}

// ---------- 起床の記録 ----------

/** 「起きた」を続けて記録した日数。今日がまだなら昨日までを数える */
export function wakeStreak(logs: WakeLog[], today: number): number {
  const woke = new Set(logs.filter((l) => l.wokeAt !== undefined).map((l) => l.date));
  let day = woke.has(dateKeyOf(today)) ? today : today - DAY_MS;
  let n = 0;
  while (woke.has(dateKeyOf(day))) {
    n++;
    day -= DAY_MS;
  }
  return n;
}

// ---------- 時刻の入力 ----------

const pad = (n: number) => String(n).padStart(2, "0");

/** 0時からの分 → "HH:MM"（24時を超えた分は翌日の時刻にする） */
export function minutesToHHMM(min: number): string {
  const m = ((Math.round(min) % 1440) + 1440) % 1440;
  return `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
}

export function hhmmToMinutes(s: string): number | undefined {
  const m = s.match(/^(\d{1,2}):(\d{2})/);
  if (!m) return undefined;
  const v = Number(m[1]) * 60 + Number(m[2]);
  return v >= 0 && v < 1440 ? v : undefined;
}

/** "9:00" の形（表示用。24時を超えたら「翌」をつける） */
export function formatMinuteOfDay(min: number): string {
  const next = min >= 1440 ? "翌" : "";
  const m = ((Math.round(min) % 1440) + 1440) % 1440;
  return `${next}${Math.floor(m / 60)}:${pad(m % 60)}`;
}

/** 開始と終了の時刻から、終了が開始以前なら翌日とみなした幅を返す */
export function spanFrom(start: number, end: number): { start: number; end: number } {
  return { start, end: end <= start ? end + 1440 : end };
}

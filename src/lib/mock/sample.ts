import type { AvoidWindow, RecoveryOption, CalendarEvent, Habit, Place, Tag, Task } from "@/lib/scheduler";
import { dateKeyOf, type Course, type OwnEvent, type Period, type RoutineStep, type Treat } from "./model";
import { DAY_MS, MIN, dayStartOf, weekdayOf } from "./jst";

/** 画面確認用のサンプルデータ。日付は「今日」を基準に作る */

export const SAMPLE_PLACES: Place[] = [
  { id: "place-univ", name: "大学", keywords: ["大学", "キャンパス"], travelMinutes: 10 },
  { id: "place-cafe", name: "カフェ", keywords: ["カフェ", "バイト先"], travelMinutes: 20 },
];

export const SAMPLE_TAGS: Tag[] = [
  { id: "tag-focus", name: "集中", mode: "focus", defaultMinutes: 90, minChunkMinutes: 60, maxChunkMinutes: 120, restAfterMinutes: 20 },
  { id: "tag-admin", name: "事務", mode: "gap", defaultMinutes: 30, minChunkMinutes: 15, maxChunkMinutes: 60 },
];

/** 生活の中身の議論で決めた習慣。最初は少なめにして、続いたら足す */
export const SAMPLE_HABITS: Habit[] = [
  // 昼食は30分で十分。食後30分の休憩は集中系だけ避ける（合わせて1時間）。多少遅れてもよいので幅は広め
  {
    id: "habit-lunch",
    name: "昼食",
    durationMinutes: 30,
    windowStart: 11 * 60,
    windowEnd: 14 * 60 + 30,
    frequency: { type: "daily" },
    skippable: false,
    avoidFocusAfterMinutes: 30,
    meal: true,
  },
  {
    id: "habit-dinner",
    name: "夕食",
    durationMinutes: 60,
    windowStart: 18 * 60,
    windowEnd: 20 * 60 + 30,
    frequency: { type: "daily" },
    skippable: false,
    avoidFocusAfterMinutes: 60,
    meal: true,
  },
  { id: "habit-bath", name: "入浴", durationMinutes: 30, windowStart: 20 * 60, windowEnd: 23 * 60 + 30, frequency: { type: "daily" }, skippable: false },
  // 今は散歩が運動の代わり。続いたら家での運動15分を足す
  {
    id: "habit-walk",
    name: "散歩",
    durationMinutes: 20,
    windowStart: 10 * 60,
    windowEnd: 18 * 60,
    frequency: { type: "daily" },
    skippable: true,
    energyCost: -1,
  },
  // 自炊は、行動ポイントに余裕がある日だけ（外出の多い日には入れない）
  {
    id: "habit-cook-lunch",
    name: "自炊（昼）",
    durationMinutes: 30,
    windowStart: 10 * 60 + 30,
    windowEnd: 12 * 60 + 30,
    frequency: { type: "whenEnergy" },
    skippable: true,
    energyCost: 2,
  },
  {
    id: "habit-cook-dinner",
    name: "自炊（夕）",
    durationMinutes: 45,
    windowStart: 17 * 60,
    windowEnd: 19 * 60 + 30,
    frequency: { type: "whenEnergy" },
    skippable: true,
    energyCost: 2,
  },
  {
    id: "habit-laundry",
    name: "洗濯を回す",
    durationMinutes: 10,
    windowStart: 9 * 60,
    windowEnd: 16 * 60,
    frequency: { type: "interval", minDays: 4, maxDays: 7 },
    skippable: false,
    finish: { title: "洗濯物を干す", durationMinutes: 15, afterStartMinutes: 90 },
    energyCost: 1,
  },
  {
    id: "habit-tidy",
    name: "片付け",
    durationMinutes: 30,
    windowStart: 0,
    windowEnd: 24 * 60,
    frequency: { type: "daily" },
    skippable: true,
    duringHabitId: "habit-laundry",
    energyCost: 0.5,
  },
];

/** 行動ポイントが上限を超える日に提案する発散 */
export const SAMPLE_RECOVERY_OPTIONS: RecoveryOption[] = [
  { name: "ゲーム・動画", durationMinutes: 30, energy: -1.5 },
  { name: "昼寝・ごろごろする", durationMinutes: 30, energy: -1 },
];

export const SAMPLE_AVOID_WINDOWS: AvoidWindow[] = [
  { id: "avoid-holiday-morning", label: "休日の午前", start: 9 * 60, end: 12 * 60, hard: false, dayType: "holiday" },
];

const at = (day: number, h: number, mi = 0) => day + (h * 60 + mi) * MIN;

export const SAMPLE_PERIODS: Period[] = [
  { number: 1, start: 9 * 60, end: 10 * 60 + 30 },
  { number: 2, start: 10 * 60 + 40, end: 12 * 60 + 10 },
  { number: 3, start: 13 * 60, end: 14 * 60 + 30 },
  { number: 4, start: 14 * 60 + 40, end: 16 * 60 + 10 },
  { number: 5, start: 16 * 60 + 20, end: 17 * 60 + 50 },
  { number: 6, start: 18 * 60, end: 19 * 60 + 30 },
];

/** 時間割（本人のゼミ）。学期は今週の月曜から15週間 */
export function buildSampleCourses(now: number): Course[] {
  const today = dayStartOf(now);
  const monday = today - ((weekdayOf(today) + 6) % 7) * DAY_MS;
  const termStart = dateKeyOf(monday);
  const termEnd = dateKeyOf(monday + (15 * 7 - 1) * DAY_MS);
  const seminar = (id: string, name: string, weekday: number, startH: number, endH: number, optional = false): Course => ({
    id,
    name,
    weekday,
    startMinute: startH * 60,
    endMinute: endH * 60,
    termStart,
    termEnd,
    location: "大学",
    optional,
    cancelledDates: [],
    attendedDates: [],
  });
  return [
    seminar("course-seminar-wed", "ゼミ", 3, 13, 15),
    seminar("course-seminar-fri", "ゼミ", 5, 15, 17),
    seminar("course-seminar-tue", "ゼミ（任意参加）", 2, 15, 17, true),
  ];
}

export const SAMPLE_TREATS: Treat[] = [
  { id: "treat-bread", name: "好きなパン屋のパン", category: "food" },
  { id: "treat-coffee-good", name: "ちょっといいコーヒー", category: "food" },
  { id: "treat-sweets", name: "コンビニの新作スイーツ", category: "food" },
  { id: "treat-game", name: "ゲーム30分", category: "hobby" },
  { id: "treat-video", name: "好きな動画を1本", category: "hobby" },
  { id: "treat-manga", name: "漫画を1話", category: "hobby" },
  { id: "treat-brew", name: "コーヒーを淹れる", category: "reward", condition: "朝ルーティンが終わったら" },
  { id: "treat-snack", name: "おやつ", category: "reward", condition: "集中の枠が終わったら" },
  { id: "treat-music", name: "好きな音楽を1曲", category: "reward", condition: "洗濯を干したら" },
];

export const SAMPLE_ROUTINE_STEPS: RoutineStep[] = [
  { id: "step-curtain", title: "カーテンを開ける" },
  { id: "step-water", title: "水を1杯飲む" },
  { id: "step-wash-face", title: "顔を洗う" },
  { id: "step-stretch", title: "5分ストレッチ" },
  { id: "step-check-plan", title: "今日の予定を見る" },
];

/** Google から取り込んだ予定（読み取り専用） */
export function buildGoogleEvents(now: number): CalendarEvent[] {
  const today = dayStartOf(now);
  const d = (n: number) => today + n * DAY_MS;
  return [
    { id: "google-dentist", title: "歯医者", start: at(d(2), 15), end: at(d(2), 16), location: "駅前デンタルクリニック" },
    { id: "google-circle", title: "サークル ミーティング", start: at(d(4), 19), end: at(d(4), 20), location: "Zoom" },
    { id: "google-birthday", title: "友だちの誕生日", start: d(5), end: d(6), allDay: true },
  ];
}

export function buildSampleOwnEvents(now: number): OwnEvent[] {
  const today = dayStartOf(now);
  const d = (n: number) => today + n * DAY_MS;
  // 次の土曜日（今日が土曜なら今日）
  const saturday = d((6 - weekdayOf(today) + 7) % 7);
  return [
    { id: "own-sample-job", title: "アルバイト", start: at(d(1), 17), end: at(d(1), 21), location: "カフェ" },
    { id: "own-sample-shopping", title: "買い物", start: at(d(3), 11), end: at(d(3), 12), location: "駅前", travelMinutes: 15 },
    { id: "own-sample-interview", title: "面接", start: at(d(4), 10), end: at(d(4), 11), location: "渋谷のオフィス", travelMinutes: 40 },
    { id: "own-sample-online", title: "オンライン面談", start: at(d(6), 14), end: at(d(6), 15), atHome: true, description: "Zoom のリンクはメール参照" },
    { id: "own-sample-trip", title: "帰省", start: d(8), end: d(11), allDay: true, awayFromHome: true },
    {
      id: "own-sample-aquarium",
      calendarId: "play",
      title: "友だちと水族館",
      start: at(saturday, 11),
      end: at(saturday, 16),
      location: "品川の水族館",
      travelMinutes: 40,
    },
  ];
}

export function buildSampleTasks(now: number): Task[] {
  const today = dayStartOf(now);
  const endOf = (n: number) => today + (n + 1) * DAY_MS;
  return [
    { id: "task-sample-slides", title: "発表スライド作成", deadline: endOf(1), durationMinutes: 480, priority: 3, tagId: "tag-focus" },
    { id: "task-sample-mail", title: "メール返信", deadline: endOf(1), durationMinutes: 30, priority: 2, tagId: "tag-admin" },
    { id: "task-sample-report", title: "線形代数のレポート", deadline: endOf(3), durationMinutes: 180, priority: 3, tagId: "tag-focus" },
    { id: "task-sample-cv", title: "履歴書を書く", deadline: endOf(6), durationMinutes: 120, priority: 2, tagId: "tag-focus" },
    {
      id: "task-sample-interview-prep",
      title: "面接対策",
      durationMinutes: 90,
      priority: 3,
      tagId: "tag-focus",
      relatedEventId: "own-sample-interview",
      timing: "justBefore",
    },
    { id: "task-sample-docs", title: "奨学金の書類を出す", durationMinutes: 15, priority: 1, tagId: "tag-admin" },
  ];
}

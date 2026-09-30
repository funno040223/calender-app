import type { AvoidWindow, RecoveryOption, CalendarEvent, Habit, Place, Tag, Task } from "@/lib/scheduler";
import { dateKeyOf, type Course, type OwnEvent, type Period, type RoutineStep, type Treat } from "./model";
import { DAY_MS, MIN, dayStartOf, weekdayOf } from "./jst";
import { UTOKYO_PERIODS } from "./utokyo";

/** 画面確認用のサンプルデータ。日付は「今日」を基準に作る */

/** 東大 本郷キャンパス（家から片道10分） */
export const SAMPLE_PLACES: Place[] = [
  { id: "place-univ", name: "本郷キャンパス", keywords: ["本郷", "東大", "大学", "キャンパス", "研究室"], travelMinutes: 10 },
];

export const SAMPLE_TAGS: Tag[] = [
  { id: "tag-focus", name: "集中", mode: "focus", defaultMinutes: 90, minChunkMinutes: 60, maxChunkMinutes: 120, restAfterMinutes: 20 },
  { id: "tag-admin", name: "事務", mode: "gap", defaultMinutes: 30, minChunkMinutes: 30, maxChunkMinutes: 60 },
];

/** 生活の中身の議論で決めた習慣。最初は少なめにして、続いたら足す */
/** 入浴：就寝の150〜75分前（30分で入り、就寝の約90分前に終える） */
export const BATH = {
  id: "habit-bath",
  name: "入浴",
  durationMinutes: 30,
  windowStart: -150,
  windowEnd: -75,
  anchor: "bed",
  frequency: { type: "daily" },
  skippable: false,
} as const satisfies Habit;

/** 散歩：起床から150分のうち（朝ルーティンのすぐあと）。日の光を浴びて体内時計を合わせる。雨の日は光を浴びるだけ（運動は夜の家での運動にまとめる） */
export const WALK_TIMES = {
  windowStart: 0,
  windowEnd: 150,
  anchor: "wake",
  rainAlternative: { title: "窓際で光を浴びる", durationMinutes: 10 },
} as const satisfies Partial<Habit>;

/**
 * 家での運動：5分・週3回から始め、2週間ごとに見直して5分ずつ増やす（20分まで。週3回20分で疲れが減る：Puetz 2008）。
 * 汗を流せるように入浴の直前に置く。入浴は就寝の約90分前に終わるので、眠りは妨げない（Stutz 2019）。
 * 行動ポイントを少し使うことにして、軽い日から選ぶ
 */
export const homeExerciseHabit = (reviewFrom: string): Habit => ({
  id: "habit-home-exercise",
  name: "家での運動",
  durationMinutes: 5,
  windowStart: 0,
  windowEnd: 24 * 60,
  cue: { type: "beforeHabit", habitId: BATH.id },
  energyCost: 0.5,
  frequency: { type: "weekly", times: 3 },
  skippable: true,
  track: true,
  progression: { stepMinutes: 5, maxMinutes: 20, reviewFrom },
});

/** 朝食：朝ルーティンのあと、時間に余裕がある日だけ。昼食は朝食から3時間あける（食事なので） */
export const BREAKFAST_HABIT: Habit = {
  id: "habit-breakfast",
  name: "朝食",
  durationMinutes: 15,
  windowStart: 0,
  windowEnd: 24 * 60,
  cue: { type: "routine" },
  frequency: { type: "daily" },
  skippable: true,
  meal: true,
};

/** 散歩は朝食のあと。朝食のない日は朝ルーティンのあと（起きてから空けない） */
export const WALK_CUE = { type: "habit", habitId: "habit-breakfast", orElse: { type: "routine" } } as const satisfies Habit["cue"];
/** 自炊は、その食事のちょうど前に */
export const COOK_CUES = {
  "habit-cook-lunch": { type: "beforeHabit", habitId: "habit-lunch" },
  "habit-cook-dinner": { type: "beforeHabit", habitId: "habit-dinner" },
} as const satisfies Record<string, Habit["cue"]>;

/** 自己成長の時間：タスクの見通しが順調な休日だけ、仮でもカレンダーに置く */
export const GROWTH_HABIT: Habit = {
  id: "habit-growth",
  track: true,
  name: "自己成長（読書・勉強など）",
  durationMinutes: 90,
  windowStart: 10 * 60,
  windowEnd: 20 * 60,
  frequency: { type: "onTrackHoliday" },
  skippable: true,
};

export const SAMPLE_HABITS: Habit[] = [
  // 昼食は30分で十分。食後30分の休憩は集中系だけ避ける（合わせて1時間）。多少遅れてもよいので幅は広め
  {
    id: "habit-lunch",
    name: "昼食",
    durationMinutes: 30,
    windowStart: 12 * 60,
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
  // 入浴は就寝の約90分前に終える（体温が下がるときに眠くなる）
  { ...BATH },
  // 散歩のあとに家での運動（homeExerciseHabit）を置く
  {
    id: "habit-walk",
    track: true,
    name: "散歩",
    durationMinutes: 20,
    ...WALK_TIMES,
    cue: WALK_CUE,
    frequency: { type: "daily" },
    skippable: true,
    keepLast: true,
    energyCost: -1,
  },
  // 自炊は、行動ポイントに余裕がある日だけ（外出の多い日には入れない）
  {
    id: "habit-cook-lunch",
    track: true,
    name: "自炊（昼）",
    durationMinutes: 30,
    windowStart: 10 * 60 + 30,
    windowEnd: 12 * 60 + 30,
    cue: COOK_CUES["habit-cook-lunch"],
    frequency: { type: "whenEnergy" },
    skippable: true,
    energyCost: 2,
  },
  {
    id: "habit-cook-dinner",
    track: true,
    name: "自炊（夕）",
    durationMinutes: 45,
    windowStart: 17 * 60,
    windowEnd: 19 * 60 + 30,
    cue: COOK_CUES["habit-cook-dinner"],
    frequency: { type: "whenEnergy" },
    skippable: true,
    energyCost: 2,
  },
  {
    id: "habit-laundry",
    track: true,
    name: "洗濯を回す",
    durationMinutes: 10,
    windowStart: 9 * 60,
    windowEnd: 16 * 60,
    frequency: { type: "interval", minDays: 4, maxDays: 7 },
    skippable: false,
    // 干すときに、前の洗濯物の取り込みも一緒にする
    finish: { title: "洗濯物を干す・取り込む", durationMinutes: 30, afterStartMinutes: 90 },
    // 天気予報で雨の日は避ける
    avoidRain: true,
    energyCost: 1,
  },
  {
    id: "habit-tidy",
    track: true,
    name: "片付け",
    durationMinutes: 30,
    windowStart: 0,
    windowEnd: 24 * 60,
    frequency: { type: "daily" },
    skippable: true,
    duringHabitId: "habit-laundry",
    energyCost: 0.5,
  },
  GROWTH_HABIT,
];

/** 行動ポイントが上限を超える日に提案する発散 */
export const SAMPLE_RECOVERY_OPTIONS: RecoveryOption[] = [
  // 根拠は docs/research/fatigue-recovery-research.md。ゲーム・動画は疲れが取れないので候補にしない
  // 昼寝は10〜20分、15時まで（30分だと起きた直後にぼんやりが残り、遅いと夜の眠気が減る）
  { name: "昼寝（20分まで）", durationMinutes: 20, energy: -1, latestStartMinuteOfDay: 15 * 60 },
  // 10分ほどの小休憩で疲れが減る（Albulescu 2022）。画面は見ない
  { name: "少し歩く・ストレッチ（画面を見ない）", durationMinutes: 10, energy: -0.5 },
  { name: "横になって目を閉じる（画面を見ない）", durationMinutes: 10, energy: -0.5 },
];

export const SAMPLE_AVOID_WINDOWS: AvoidWindow[] = [
  { id: "avoid-holiday-morning", label: "休日の午前", start: 9 * 60, end: 12 * 60, hard: false, dayType: "holiday" },
];

const at = (day: number, h: number, mi = 0) => day + (h * 60 + mi) * MIN;

/** 時限は東大の標準（1コマ105分） */
export const SAMPLE_PERIODS: Period[] = UTOKYO_PERIODS;

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

/**
 * 今日の楽しみ：いつもの暮らしから少しだけ外れた、体によくて面白いこと。本郷の近くのちょっとした冒険と、好物のひとひねり。
 * 好きなもの（2026-10-01 に聞いた）：カニカマ、牛乳から作る甘い飲み物、すき焼き・パスタ・ホイコーロー
 */
export const SAMPLE_TREATS: Treat[] = [
  { id: "treat-nezu", name: "根津神社まで歩いて、境内をひと回り", category: "adventure", outdoor: true },
  { id: "treat-shinobazu", name: "不忍池を1周する", category: "adventure", outdoor: true },
  { id: "treat-yanaka", name: "谷中銀座で気になるものを1つ買う", category: "adventure", outdoor: true, holidayOnly: true },
  { id: "treat-rikugien", name: "六義園の庭を歩く", category: "adventure", outdoor: true, holidayOnly: true },
  { id: "treat-koishikawa", name: "小石川植物園で季節の植物を見る", category: "adventure", outdoor: true, holidayOnly: true },
  { id: "treat-jimbocho", name: "神保町の古本屋で1冊だけ選ぶ", category: "adventure", holidayOnly: true },
  { id: "treat-new-station", name: "降りたことのない駅で降りて15分歩く", category: "adventure", outdoor: true, holidayOnly: true },
  { id: "treat-other-way", name: "いつもと違う道で帰る", category: "adventure", outdoor: true },
  { id: "treat-sento", name: "近くの銭湯に行く", category: "adventure" },
  { id: "treat-cafe-new", name: "喫茶店で、頼んだことのない飲み物を頼む", category: "adventure" },
  { id: "treat-milk-twist", name: "いつもの牛乳ドリンクを変えてみる（ほうじ茶ラテ・きなこミルクなど）", category: "food" },
  { id: "treat-frozen-banana", name: "冷凍バナナで、砂糖なしのシェイクを作る", category: "food" },
  { id: "treat-kanikama-dish", name: "カニカマで1品作る（天津飯・サラダなど）", category: "food" },
  { id: "treat-season-fruit", name: "季節の果物を1つ買って食べる", category: "food" },
  { id: "treat-new-veg", name: "買ったことのない野菜を1つ試す", category: "food" },
  { id: "treat-photo-theme", name: "テーマを決めて写真を1枚撮る（今日は「丸いもの」など）", category: "hobby" },
  { id: "treat-moon", name: "夜、月や星を探して5分眺める", category: "hobby", outdoor: true },
  { id: "treat-room-change", name: "部屋の1か所だけ模様替えする", category: "hobby" },
  { id: "treat-letter", name: "はがきか手紙を1通書く", category: "hobby" },
  { id: "treat-sukiyaki", name: "すき焼き", category: "reward", condition: "今週が順調なら、週末に" },
  { id: "treat-sweet-drink", name: "好きな甘い飲み物を買う", category: "reward", condition: "予定どおり起きたら" },
  { id: "treat-kanikama", name: "カニカマ", category: "reward", condition: "集中の枠が終わったら" },
];

/**
 * 朝ルーティン（10分）。アラームのあと布団の中で体を動かすのを起き上がる合図にし、光と水で目を覚まし、好きな飲み物を楽しみにする。
 * 顔を洗うなどは身支度に入れる
 */
export const SAMPLE_ROUTINE_STEPS: RoutineStep[] = [
  { id: "step-stretch-bed", title: "布団の中で大きく伸びをして起き上がる" },
  { id: "step-curtain", title: "カーテンを開けて光を浴びる" },
  { id: "step-water", title: "水を1杯飲む" },
  { id: "step-drink", title: "好きな飲み物を作る" },
];

/** 今季（2026年度 A セメスター）の授業：月曜3・4限を続けて（名前はあとで直す） */
export const MONDAY_CLASS: Omit<Course, "termStart" | "termEnd"> = {
  id: "course-mon34",
  name: "月3・4限の授業",
  weekday: 1,
  startMinute: 13 * 60,
  endMinute: 16 * 60 + 40,
  location: "本郷キャンパス",
  optional: false,
  cancelledDates: [],
  attendedDates: [],
};

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

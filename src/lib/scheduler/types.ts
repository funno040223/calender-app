/** epoch ミリ秒の区間 [start, end) */
export interface Interval {
  start: number;
  end: number;
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: number;
  end: number;
  allDay?: boolean;
  location?: string;
  description?: string;
  /** 予定ごとに入力した移動時間（分）。場所の登録より優先する */
  travelMinutes?: number;
  /** 在宅の予定として扱うか。未指定なら場所から判断する */
  atHome?: boolean;
  /** 予定（外出なら帰宅）のあとに空ける休憩（分）。未指定なら設定の値 */
  restAfterMinutes?: number;
  /** 「遊び」の予定。遊び以外の予定がない日は休日になる */
  play?: boolean;
  /** この予定で使う行動ポイント。未指定なら外出・在宅と長さから計算する */
  energyCost?: number;
  /** 終日の予定で、その間ずっと家にいない（帰省・旅行など）。外出の日と同じに扱う */
  awayFromHome?: boolean;
}

export interface Place {
  id: string;
  name: string;
  /** 予定の場所にこの語が含まれていれば、この場所とみなす */
  keywords: string[];
  travelMinutes: number;
}

export interface Settings {
  /** UTC からのずれ（分）。日本時間なら 540 */
  tzOffsetMinutes: number;
  planningDays: number;
  sleepMinutes: number;
  prepMinutes: number;
  routineMinutes: number;
  /** 在宅の日、最初の予定の何分前までに起きるか */
  homeWakeLeadMinutes: number;
  /** 就寝前に作業を入れない時間（分） */
  windDownMinutes: number;
  /** 遅くともこの時刻には起きる（0時からの分）。予定がない日の起床時刻 */
  defaultWakeMinuteOfDay: number;
  /** 隣り合う日の起床時刻の差の上限（分）。睡眠の時刻を日によって大きくずらさない */
  maxWakeShiftMinutesPerDay: number;
  /** 登録のない場所へ行くときに仮に置く移動時間（分） */
  unknownTravelMinutes: number;
  /** タスクの枠のあとに空ける休憩（分）。タグで上書きできる */
  breakMinutes: number;
  /** 外出する予定から帰ったあとに空ける休憩（分） */
  restAfterAwayEventMinutes: number;
  /** 1週間の起床時刻をいちばん早い日にそろえる */
  fixedWakeMode: boolean;
  /** 朝ルーティンが終わってからこの分数は、集中系のタスクを避ける */
  avoidFocusAfterWakeMinutes: number;
  /** 作業を終える時刻の前のこの分数は、集中系のタスクを避ける */
  avoidFocusBeforeBedMinutes: number;
  /** 1日にタスクを入れる量の目安（分）。超えると減点する */
  dailyTaskCapMinutes: number;
  /** 何も入れない余白を1日にこれだけ残す（分）。締切に間に合わないときだけ削る */
  minSlackMinutesPerDay: number;
  /** 1日に使ってよい行動ポイント。超える日は重い作業を避け、発散を提案する */
  dailyEnergyBudget: number;
  /** 外出する予定1回あたりのポイント */
  awayEventEnergy: number;
  /** 外出する予定の1時間あたりのポイント（行き帰りの移動を含む） */
  awayEventEnergyPerHour: number;
  /** 在宅の予定の1時間あたりのポイント */
  homeEventEnergyPerHour: number;
  /** 家にいない時間（移動を含む）がこの分数以上の日は「外出の日」。自炊や洗濯を入れない */
  outingDayAwayMinutes: number;
}

/** 「この時間はやりたくない」時間帯 */
export interface AvoidWindow {
  id: string;
  label: string;
  /** 0 = 日曜。未指定なら毎日 */
  weekdays?: number[];
  /** 0時からの分。24時を超えてもよい */
  start: number;
  end: number;
  /** 未指定ならすべてのタスクが対象 */
  tagIds?: string[];
  /** true: 入れない / false: なるべく避ける */
  hard: boolean;
  /** holiday: 休日だけ / onDay: オンの日だけ。未指定なら両方 */
  dayType?: "holiday" | "onDay";
}

export const DEFAULT_SETTINGS: Settings = {
  tzOffsetMinutes: 540,
  planningDays: 14,
  sleepMinutes: 7 * 60,
  prepMinutes: 40,
  routineMinutes: 15,
  homeWakeLeadMinutes: 20,
  windDownMinutes: 30,
  defaultWakeMinuteOfDay: 9 * 60,
  maxWakeShiftMinutesPerDay: 30,
  unknownTravelMinutes: 60,
  breakMinutes: 10,
  restAfterAwayEventMinutes: 30,
  fixedWakeMode: false,
  avoidFocusAfterWakeMinutes: 60,
  avoidFocusBeforeBedMinutes: 120,
  dailyTaskCapMinutes: 360,
  minSlackMinutesPerDay: 120,
  dailyEnergyBudget: 10,
  awayEventEnergy: 2,
  awayEventEnergyPerHour: 0.5,
  homeEventEnergyPerHour: 0.5,
  outingDayAwayMinutes: 360,
};

/** whenEnergy: 行動ポイントに余裕がある日だけ（自炊など） */
/** interval: 前回から minDays〜maxDays 日の間隔で（洗濯など） */
export type HabitFrequency =
  | { type: "daily" }
  | { type: "weekly"; times: number }
  | { type: "whenEnergy" }
  | { type: "interval"; minDays: number; maxDays: number };

export interface Habit {
  id: string;
  name: string;
  durationMinutes: number;
  /** 時間帯の幅（0時からの分）。24時を超えてもよい */
  windowStart: number;
  windowEnd: number;
  frequency: HabitFrequency;
  /** 締切が迫ったときに飛ばしてよいか（食事・入浴は false） */
  skippable: boolean;
  /** このあとの分数は集中系のタスクを避ける（食後など） */
  avoidFocusAfterMinutes?: number;
  /**
   * 待ち時間のある作業の2つ目の枠（洗濯を回す → 待つ → 干す）。
   * 1つ目の開始から afterStartMinutes 後に始める。その間は家にいる必要がある
   */
  finish?: { title: string; durationMinutes: number; afterStartMinutes: number };
  /** この習慣の待ち時間の中に置く（洗濯の待ち時間に片付けなど）。頻度は親に合わせる */
  duringHabitId?: string;
  /** 1回あたりの行動ポイント。マイナスは回復（散歩、発散など） */
  energyCost?: number;
  /** 食事。外出の日に外にいる時間と重なるときは、外食・お弁当として置く */
  meal?: boolean;
}

/** focus: 長い空き時間に置く / gap: 予定の合間の短い空き時間に詰める */
export type PlacementMode = "focus" | "gap";

export interface Tag {
  id: string;
  name: string;
  mode: PlacementMode;
  defaultMinutes: number;
  minChunkMinutes: number;
  maxChunkMinutes: number;
  /** このタグのタスクのあとに空ける休憩（分）。未指定なら設定の値 */
  restAfterMinutes?: number;
  /** 1時間あたりの行動ポイント。未指定なら集中系 1、事務系 0.5 */
  energyPerHour?: number;
}

/** soon: 早めに片付ける / justBefore: 締切の直前に寄せる（面接対策など） */
export type TaskTiming = "soon" | "justBefore";

export interface Task {
  id: string;
  title: string;
  deadline?: number;
  durationMinutes?: number;
  durationRange?: { min: number; max: number };
  /** 今からやるべき残り時間（分）。実績から計算した値があればこれを使う */
  remainingMinutes?: number;
  /** 3 が高い */
  priority: 1 | 2 | 3;
  tagId?: string;
  /** 関連する予定。締切はその予定の開始（外出なら家を出る時刻）になる */
  relatedEventId?: string;
  /** 未指定なら soon */
  timing?: TaskTiming;
}

export type BlockKind = "task" | "habit" | "routine";

export interface Block {
  kind: BlockKind;
  refId: string;
  title: string;
  start: number;
  end: number;
  /** ドラッグで動かした枠。組み直しで動かさない */
  pinned?: boolean;
}

export type WakeSource = "away" | "home" | "neighbors" | "default" | "fixed";

export interface DayPlan {
  /** その日の 0:00（ローカル時刻） */
  dayStart: number;
  wake: number;
  /** その日の夜の就寝時刻（翌日の起床時刻 − 睡眠時間） */
  bed: number;
  leave?: number;
  firstEvent?: CalendarEvent;
  wakeSource: WakeSource;
  /** 遊び以外の予定がない日 */
  holiday: boolean;
}

export interface TravelQuestion {
  eventId: string;
  location: string;
}

export interface Shortfall {
  taskId: string;
  title: string;
  deadline: number;
  shortfallMinutes: number;
}

/** 発散・休憩の候補（上限を超える日に提案する） */
export interface RecoveryOption {
  name: string;
  durationMinutes: number;
  /** 回復するポイント（マイナスの値） */
  energy: number;
}

export interface DayEnergy {
  dayStart: number;
  used: number;
  budget: number;
  /** 家にいない時間が長い「外出の日」 */
  outingDay: boolean;
  /** 上限を超える日の、発散の提案（空き時間に入るもの） */
  suggestion?: RecoveryOption & { start: number; end: number };
}

export interface SkippedHabit {
  habitId: string;
  dayStart: number;
  reason: "no_room" | "deadline";
}

export interface PlanInput {
  now: number;
  settings: Settings;
  /** 自分で入れた予定、取り込んだ Google の予定、授業 */
  events: CalendarEvent[];
  places: Place[];
  habits: Habit[];
  tags: Tag[];
  tasks: Task[];
  avoidWindows?: AvoidWindow[];
  recoveryOptions?: RecoveryOption[];
  /** 間隔で置く習慣（洗濯など）を最後にした時刻 */
  habitLastDone?: Record<string, number>;
  /** 前回の配置。始まった枠と固定した枠はそのまま残す */
  previousBlocks: Block[];
}

export interface PlanResult {
  dayPlans: DayPlan[];
  blocks: Block[];
  skippedHabits: SkippedHabit[];
  shortfalls: Shortfall[];
  travelQuestions: TravelQuestion[];
  /** 配置し終わったあとに残った空き時間（すきま時間の候補） */
  freeGaps: Interval[];
  /** 日ごとの行動ポイント */
  dayEnergy: DayEnergy[];
}

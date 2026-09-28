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
  /** 前後の日から決められないときの起床時刻（0時からの分） */
  defaultWakeMinuteOfDay: number;
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
}

export const DEFAULT_SETTINGS: Settings = {
  tzOffsetMinutes: 540,
  planningDays: 14,
  sleepMinutes: 7 * 60,
  prepMinutes: 40,
  routineMinutes: 15,
  homeWakeLeadMinutes: 20,
  windDownMinutes: 30,
  defaultWakeMinuteOfDay: 7 * 60,
  unknownTravelMinutes: 60,
  breakMinutes: 10,
  restAfterAwayEventMinutes: 30,
  fixedWakeMode: false,
  avoidFocusAfterWakeMinutes: 60,
  avoidFocusBeforeBedMinutes: 120,
  dailyTaskCapMinutes: 360,
};

export type HabitFrequency = { type: "daily" } | { type: "weekly"; times: number };

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
  /** 前回の配置。始まった枠と固定した枠はそのまま残す */
  previousBlocks: Block[];
}

export interface PlanResult {
  dayPlans: DayPlan[];
  blocks: Block[];
  skippedHabits: SkippedHabit[];
  shortfalls: Shortfall[];
  travelQuestions: TravelQuestion[];
}

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
  /** 身支度（人に見せられる格好にする時間）が要る予定か。未指定なら、外出する予定と会議のリンクがある予定 */
  needsPrep?: boolean;
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

export type TaskStrategy = "standard" | "early" | "spread";

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
  /**
   * タスクの置き方。standard：先の日ほど少し減点（今まで）／early：前倒し（できるだけ早い日に詰める）／
   * spread：分散（同じタスクを同じ日にまとめず、締切までの日に散らす）
   */
  taskStrategy?: TaskStrategy;
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
  | { type: "interval"; minDays: number; maxDays: number }
  /** タスクの見通しが順調な（締切に間に合わないタスクがない）休日だけ（自己成長の時間など） */
  | { type: "onTrackHoliday" };

/**
 * きっかけの場面。習慣をその直後（CUE_GAP_MINUTES 後）に置く。
 * routine: 朝ルーティンのあと、habit: 食事などの習慣のあと、home: 外出から帰って休んだあと、
 * beforeHabit: その習慣の直前（入浴の前の運動など。CUE_GAP_MINUTES 前に終える）
 */
export type HabitCue = (
  | { type: "routine" }
  | { type: "habit"; habitId: string }
  | { type: "home" }
  | { type: "beforeHabit"; habitId: string }
) & {
  /** その日にこの場面がなければ、代わりに使う場面（朝食のない日の散歩は、朝ルーティンのあと） */
  orElse?: HabitCue;
};

/** 食事どうしの始まりは、この分数より近づけない（朝食と昼食が続かないように） */
export const MEAL_GAP_MINUTES = 180;
/** 「家で食べる」にした食事を、時間帯の終わりから遅らせてよい分数 */
export const MEAL_LATE_MINUTES = 120;

/** きっかけから習慣の始まりまで（分）。通知もこの時刻に送る */
export const CUE_GAP_MINUTES = 5;
/** きっかけのあと、この分数までに始められなければその日は置かない */
export const CUE_SLACK_MINUTES = 30;

export interface Habit {
  id: string;
  name: string;
  durationMinutes: number;
  /**
   * 時間帯の幅（分）。anchor がなければ0時からの分（24時を超えてもよい）。
   * anchor が "wake" なら起床からの分、"bed" なら就寝からの分（前はマイナス）
   */
  windowStart: number;
  windowEnd: number;
  anchor?: "wake" | "bed";
  /** きっかけの場面。あれば時間帯（windowStart・windowEnd・anchor）より優先する */
  cue?: HabitCue;
  frequency: HabitFrequency;
  /** 今日の画面で「やった／5分」を記録する（配置には使わない） */
  track?: boolean;
  /**
   * 少しずつ増やす（家での運動など）。reviewFrom（日付 YYYY-MM-DD）から2週間たったら記録を見て、
   * できていれば stepMinutes 増やすかを聞く（maxMinutes まで）。配置には使わない
   */
  progression?: { stepMinutes: number; maxMinutes: number; reviewFrom: string };
  /** 締切が迫ったときに飛ばしてよいか（食事・入浴・洗濯は false） */
  skippable: boolean;
  /** 飛ばしてよい習慣のうち、なるべく残すもの（朝の散歩など）。締切のために外すときは最後にする */
  keepLast?: boolean;
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
  /** 食事。予定の最中には置かず、予定で時間帯に空きがなければ外で食べるものとして置かない */
  meal?: boolean;
  /** 雨の日の代わり（散歩 → 家の中でできること）。雨の日に指定した日だけ、この名前と長さで置く */
  rainAlternative?: { title: string; durationMinutes: number };
  /** 雨の日を避ける（洗濯など）。間隔の中に雨でない日がなければ、最後の日だけ雨の日にも置く */
  avoidRain?: boolean;
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
  /** 外部の締切は自動延長しない。未指定も外部の締切として扱う */
  deadlineKind?: "fixed" | "target";
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
  /** true: 所要時間を取り込みの目安で入れた（Notion の段階ごとの目安）。false: 取り込んだタスクの所要時間を自分で決めた（上書きしない） */
  autoDuration?: boolean;
  /** 締切に足りないときに選んだ「ほかを後に回す」：締切の順より先に置く */
  first?: boolean;
  /** 締切に足りないときに選んだ「時間帯の外にも入れる」：「入れない」時間帯と、体力が少ない夜にも置く（睡眠は削らない） */
  stretch?: boolean;
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
  /** 朝に身支度の時間を取る日（最初の予定が外出か、人に顔を出す予定） */
  prep?: boolean;
  /** 身支度は1日1回。身支度の要る予定のうち、いちばん早いものの前に置く（外出なら家を出る時刻、在宅の会議なら始まり）。予定の最初でなくてもよい */
  prepAt?: number;
  prepEvent?: CalendarEvent;
  /** その予定が外出か */
  prepAway?: boolean;
  /** 外出の日（dayload.ts） */
  outing?: boolean;
  /** 予定の多い日（dayload.ts） */
  heavy?: boolean;
  /** 外出した日の、最後の外出から家に帰る時刻（帰りの移動を含む） */
  homeAt?: number;
  /** 予定の多い日（外出の日を含む）の、夜の始まり（最後の予定が終わる時刻）。体力を答えるまでは、そのあとに集中の作業を入れない */
  eveningFrom?: number;
}

/** 帰宅したときに答える、残りの体力 */
export type EveningEnergy = "high" | "normal" | "low";

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
  /** この時刻（0時からの分）より後には提案しない（夕方以降の昼寝は夜の眠気を減らすため） */
  latestStartMinuteOfDay?: number;
}

export interface DayEnergy {
  dayStart: number;
  used: number;
  budget: number;
  /** 家にいない時間が長い「外出の日」 */
  outingDay: boolean;
  /** 上限を超える日（または帰宅時に体力が少ないと答えた日）の、発散の提案（空き時間に入るもの） */
  suggestion?: RecoveryOption & { start: number; end: number };
  /** 帰宅時に答えた残りの体力 */
  evening?: EveningEnergy;
}

export interface SkippedHabit {
  habitId: string;
  dayStart: number;
  reason: "no_room" | "deadline";
}

export interface PlanInput {
  rhythmResets?: RhythmReset[];
  /** 朝ルーティンを始めた時刻（その日の 0:00 → 時刻）。起床の直後でなく、ここから朝ルーティンを置く */
  routineStarts?: Record<number, number>;
  /** 「この時間は空ける」にした時間。タスクも習慣も自動では入れない（予定と同じく埋まっている扱い） */
  keepFree?: Interval[];
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
  /** 週に何回かの習慣を、今日より前にやった日（その日の 0:00） */
  habitDoneDays?: Record<string, number[]>;
  /** 前回の配置。始まった枠と固定した枠はそのまま残す */
  previousBlocks: Block[];
  /**
   * 起きた時刻が分かった（記録した・直した）日。新しい朝ルーティンと重なる前の計画の自動の枠は外す。
   * relayout のときは、実際の起床から朝を組み直す：過ぎていても朝ルーティンと朝の流れの記録する習慣を置く。
   * keep は外さない枠（記録・確認の済んだもの。refId:start）
   */
  anchor?: { dayStart: number; keep: string[]; relayout?: boolean };
  /** 帰宅時に答えた残りの体力（日の 0:00 → 答え）。帰宅から就寝までのタスクの入れ方が変わる */
  eveningEnergy?: Record<number, EveningEnergy>;
  /** 雨の日にした日（日の 0:00）。rainAlternative のある習慣を代わりのものにする */
  rainyDays?: number[];
  /** 「今日は飛ばす」にした習慣（習慣の ID → その日の 0:00）。その日には置かない */
  skipHabitDays?: Record<string, number[]>;
  /** 「家で食べる」にした食事（習慣の ID → その日の 0:00）。時間帯に入らなければ、時間帯の終わりから2時間まで遅らせて置く */
  mealAtHomeDays?: Record<string, number[]>;
}

export interface PlanResult {
  rhythmResets?: RhythmReset[];
  movedBlocks?: Block[];
  dayPlans: DayPlan[];
  blocks: Block[];
  skippedHabits: SkippedHabit[];
  shortfalls: Shortfall[];
  travelQuestions: TravelQuestion[];
  /** 配置し終わったあとに残った空き時間（すきま時間の候補） */
  freeGaps: Interval[];
  /** 日ごとの行動ポイント */
  dayEnergy: DayEnergy[];
  /**
   * 前の日の就寝。0時を過ぎて寝る日は、就寝の時刻を過ぎると前の日が dayPlans から外れるので、
   * 「おやすみ」（就寝の3時間後まで）を出し続けるために残す
   */
  lastNight?: { dayStart: number; bed: number };
}

/** 実際の睡眠、これから取る睡眠、疲れた日の作業休止。時刻は日をまたげる */
export interface RhythmReset extends Interval {
  id: string;
  mode: "sleep" | "woke" | "tired";
  /** 記録（ヘルスケア・「起きた」）で起床を決めたとき、その前に予定していた起床。「予定どおり起きた」に使う（配置には使わない） */
  plannedEnd?: number;
}

/**
 * 運動のプログラム（家で・道具なし）。画面とテストで使う中身と、記録から「いまどこにいるか」を出す計算。
 *
 * ねらい（本人の困りごと）と根拠：
 * - 体力不足：早歩きなど「話せるが歌えない」強さの有酸素を、週150〜300分へ少しずつ（WHO 2020）。
 *   早歩きとゆっくり歩きを3分ずつ交互にする歩き方（信州大のインターバル速歩）は、歩くだけより持久力が伸びやすい。
 * - 体脂肪：減らす主役は食事。運動だけで減る量は小さいが、筋トレは減量中の筋肉を守り、歩くことは体重を戻りにくくする。
 *   お腹だけ・腕だけを狙って脂肪を落とすことはできない（Vispute 2011 ほか）。
 * - 肩こり（机作業）：長く同じ姿勢でいないこと（50〜60分ごとに立つ）と、背中・肩の筋トレ（引く動き）が、
 *   ストレッチだけより痛みを減らしやすい（Andersen 2008、職場での運動のメタ分析 Louw 2017）。
 * - 筋トレ：全身を週2回以上（WHO）。初心者は 8〜12回 × 1〜3セット、週2〜3回（ACSM 2009）。
 *   上げどきは「目標より多くできた日が2回続いたら」（ACSM の 2-for-2 の考え方）。週数がたっただけでは上げない。
 *
 * 医療の助言ではない。痛み・しびれ・胸の痛み・いつもと違う息苦しさがあれば止める。
 */
import type { Exercise, ExercisePlan } from "./model";

export interface MoveLevel {
  name: string;
  /** MovementGuide の図の ID（なければ手順の文だけ） */
  figure?: string;
  how: string[];
  /** 気をつけること */
  point?: string;
  reps?: [number, number];
  seconds?: [number, number];
  /** 左右それぞれ */
  perSide?: boolean;
}

export type StrengthId = "push" | "chair" | "bridge" | "row" | "core";

export interface StrengthMove {
  id: StrengthId;
  name: string;
  /** 使う場所 */
  part: string;
  why: string;
  /** 重さ（kg）も記録する */
  load?: boolean;
  levels: MoveLevel[];
}

export const STRENGTH_MOVES: StrengthMove[] = [
  {
    id: "push",
    name: "腕立て",
    part: "胸・腕・肩",
    why: "押す力。お腹に力を入れて体をまっすぐ保つので、体幹も使います。",
    levels: [
      {
        name: "壁腕立て",
        figure: "push",
        reps: [10, 15],
        how: ["壁から腕1本分はなれて立ち、肩の高さで両手を壁につく", "頭からかかとまで一直線のまま、ひじを曲げて胸を壁に近づける", "壁を押して戻る（下ろすのに2秒）"],
      },
      {
        name: "机で腕立て",
        figure: "desk-push",
        reps: [8, 12],
        how: ["動かない机やキッチン台の縁に、肩幅より少し広く手をつく", "足を後ろに引き、頭からかかとまで一直線にする", "胸を縁に近づけて、押して戻る"],
        point: "机が動かないことを先に確かめる。キャスター付きの椅子は使わない",
      },
      {
        name: "低い台で腕立て",
        figure: "desk-push",
        reps: [8, 12],
        how: ["ベッドの縁や階段の2〜3段目など、ひざくらいの高さの動かない台に手をつく", "体を一直線にしたまま胸を台に近づけ、押して戻る"],
        point: "腰が落ちたり、お尻が上がったりしたら、その回で終わりにする",
      },
      {
        name: "ひざつき腕立て",
        figure: "knee-push",
        reps: [6, 12],
        how: ["床にひざをつき、手を肩の真下より少し外につく", "ひざから頭までを一直線にする", "胸を床に近づけて、押して戻る"],
        point: "ひざの下にタオルを敷くと痛くない",
      },
      {
        name: "腕立て伏せ",
        figure: "floor-push",
        reps: [5, 12],
        how: ["手を肩幅より少し広くつき、つま先で体を支える", "頭からかかとまで一直線のまま、胸を床のこぶし1つ上まで下ろす", "押して戻る"],
        point: "腰が落ちてきたら、残りはひざをついて続けてよい",
      },
    ],
  },
  {
    id: "chair",
    name: "スクワット",
    part: "太もも・お尻",
    why: "いちばん大きな筋肉。体力と、ふだん使うエネルギーにいちばん効きます。階段や坂も楽になります。",
    levels: [
      {
        name: "椅子から立つ",
        figure: "chair",
        reps: [8, 15],
        how: ["キャスターのない椅子を壁につけて置き、浅く座る", "足を肩幅に開き、腕を胸の前で組んで立ち上がる", "2〜3秒かけてゆっくり座る"],
      },
      {
        name: "椅子にふれるスクワット",
        figure: "squat",
        reps: [10, 15],
        how: ["椅子の前に立ち、お尻を後ろに引きながらしゃがむ", "お尻が座面に軽くふれたら立つ（座りこまない）", "ひざはつま先と同じ向きにする"],
      },
      {
        name: "スクワット",
        figure: "squat",
        reps: [10, 20],
        how: ["足を肩幅に開き、腕を前に伸ばしてバランスをとる", "楽に行ける深さまで、お尻を後ろに引いてしゃがむ", "かかとで床を押して立つ"],
      },
      {
        name: "スプリットスクワット",
        figure: "split",
        reps: [6, 12],
        perSide: true,
        how: ["足を前後に大きく開き、後ろはつま先立ち。壁や椅子に手を添えてよい", "後ろのひざを床に近づけるように、まっすぐ下がる", "前の足のかかとで押して戻る。左右とも"],
      },
      {
        name: "リュックを背負ってスプリットスクワット",
        figure: "split",
        reps: [8, 12],
        perSide: true,
        how: ["本や水を入れたリュック（3〜5kg）を背負う", "スプリットスクワットと同じように下がって戻る。左右とも"],
      },
    ],
  },
  {
    id: "bridge",
    name: "ブリッジ",
    part: "お尻・太ももの裏",
    why: "座りっぱなしで弱りやすいところ。腰を支え、歩くのも楽になります。",
    levels: [
      {
        name: "ヒップブリッジ",
        figure: "bridge",
        reps: [10, 15],
        how: ["仰向けでひざを曲げ、足の裏を床につける", "お尻をしめて、肩からひざが一直線になるまで上げる", "ゆっくり下ろす"],
        point: "腰を反らさない。お尻で持ち上げる",
      },
      {
        name: "上で止めるブリッジ",
        figure: "bridge",
        reps: [10, 15],
        how: ["ヒップブリッジで上げたところで2秒止める", "3秒かけて下ろす"],
      },
      {
        name: "片脚ブリッジ",
        figure: "single-bridge",
        reps: [6, 12],
        perSide: true,
        how: ["片脚を伸ばして浮かせ、もう片方の足で床を押してお尻を上げる", "ゆっくり下ろす。左右とも"],
        point: "腰が傾かない高さまででよい",
      },
    ],
  },
  {
    id: "row",
    name: "リュックを引く",
    part: "背中・肩の後ろ",
    why: "引く動き。机に向かう姿勢で弱る背中を鍛え、肩こりの予防にも役立ちます。",
    load: true,
    levels: [
      {
        name: "軽いリュックを引く（2〜3kg）",
        figure: "row",
        reps: [10, 15],
        perSide: true,
        how: ["本や水のペットボトルを入れたリュックを用意する", "机や椅子の座面に片手をつき、背中をまっすぐにして前に倒す", "ひじを後ろに引いてリュックを脇腹へ。肩をすくめない", "2秒かけて下ろす。左右とも"],
      },
      {
        name: "リュックを引く（5kg前後）",
        figure: "row",
        reps: [8, 12],
        perSide: true,
        how: ["2Lのペットボトル2本くらいを入れる", "引き方は同じ。上で肩甲骨を寄せる"],
      },
      {
        name: "重いリュックを引く（7kg前後）",
        figure: "row",
        reps: [8, 12],
        perSide: true,
        how: ["本や水を足して重くする", "上で1秒止めてから下ろす"],
        point: "リュックの持ち手が切れそうなら、底を持つ",
      },
    ],
  },
  {
    id: "core",
    name: "体幹",
    part: "お腹・背中",
    why: "上体起こしの腹筋運動ではなく、体をまっすぐ保つ動きにします。首や腰を何度も丸めずにすみ、腕立てやスクワットの姿勢も安定します。",
    levels: [
      {
        name: "デッドバグ",
        figure: "deadbug",
        reps: [6, 10],
        perSide: true,
        how: ["仰向けで腕を天井へ伸ばし、ひざを90度に曲げて上げる", "腰を床に軽く押しつけたまま、右腕と左脚をゆっくり床へ近づける", "戻して反対側。息は止めない"],
      },
      {
        name: "ひざつきプランク",
        figure: "knee-plank",
        seconds: [20, 40],
        how: ["うつ伏せから、ひじを肩の真下につく", "ひざをついたまま、ひざから頭までを一直線にして止める"],
        point: "息を止めない。腰が反ったら終わり",
      },
      {
        name: "プランク",
        figure: "plank",
        seconds: [20, 45],
        how: ["ひじを肩の真下につき、つま先で体を支える", "頭からかかとまで一直線にして止める"],
        point: "お尻が上がる・腰が落ちる前にやめる",
      },
      {
        name: "プランクと横向きプランク",
        figure: "plank",
        seconds: [30, 60],
        how: ["プランクで止める", "続けて横向きに寝てひじをつき、ひざをついたまま腰を上げる（左右20〜30秒）"],
      },
    ],
  },
];

export const moveOf = (id: string) => STRENGTH_MOVES.find((m) => m.id === id);

/** 記録に残る種目の名前（前の版の ID も読む） */
export const EXERCISE_NAMES: Record<string, string> = {
  ...Object.fromEntries(STRENGTH_MOVES.map((m) => [m.id, m.name])),
  march: "歩く・足踏み",
  calf: "ふくらはぎ伸ばし",
  walk: "歩く",
  shoulder: "肩こりほぐし",
};

/** 体をあたためる・ゆるめる（筋トレの前後） */
export const WARMUP = { id: "march", name: "その場で足踏み", figure: "march", dose: "1〜2分", how: ["腕を大きく振り、ももを軽く上げて足踏みする"] };
export const COOLDOWN = { id: "calf", name: "ふくらはぎ伸ばし", figure: "calf", dose: "左右20秒", how: ["壁に手を添え、片脚を後ろへ引く", "後ろのかかとを床につけたまま、反動をつけずに止める。左右とも"] };

// ---- 肩こりほぐし ----

export interface ShoulderStep {
  id: string;
  name: string;
  dose: string;
  how: string[];
}

/** 座ったままできる2分の版（作業の区切りに） */
export const SHOULDER_DESK: ShoulderStep[] = [
  { id: "chin", name: "あごを引く", dose: "5秒 × 5回", how: ["背すじを伸ばし、目線はまっすぐのまま、あごを真後ろへ引く（二重あごを作るように）", "5秒止めて戻す"] },
  { id: "blade", name: "肩甲骨を寄せる", dose: "3秒 × 10回", how: ["ひじを軽く曲げ、肩を下げたまま左右の肩甲骨を寄せる", "3秒止めて戻す"] },
  { id: "twist", name: "背中をひねる", dose: "左右5回", how: ["腕を胸の前で組み、腰は前に向けたまま、胸ごと右へひねる", "戻して左へ。ゆっくり"] },
  { id: "neck", name: "首の横を伸ばす", dose: "左右20秒", how: ["右手で座面の端を持ち、頭を左へ傾ける", "首の右側が軽く伸びるところで止める。反対も"] },
];

/** 立って・床でもやる5分の版 */
export const SHOULDER_FULL: ShoulderStep[] = [
  { id: "roll", name: "肩を後ろへ回す", dose: "10回", how: ["肩を耳に近づけて、後ろへ大きく回して下ろす"] },
  ...SHOULDER_DESK.slice(0, 2),
  { id: "chest", name: "ドア枠で胸を開く", dose: "30秒 × 2回", how: ["ドア枠にひじから手のひらまでをつける（ひじは肩の高さ）", "片足を前に出し、胸の前が伸びるところで止める"] },
  { id: "wall", name: "壁で腕を上げ下げ", dose: "8回", how: ["壁に背中・お尻・頭をつけて立ち、腕を「W」の形で壁につける", "壁から離れない範囲で腕を上へすべらせ、ゆっくり戻す"] },
  { id: "yt", name: "うつ伏せで腕を上げる", dose: "Y・T 各5回", how: ["うつ伏せで、親指を上に向けて腕を「Y」の形に伸ばす", "肩甲骨を下げたまま腕を少し浮かせ、2秒止める。「T」の形でも"] },
  SHOULDER_DESK[3],
];

// ---- 有酸素（体力・脂肪） ----

export interface CardioOption {
  id: string;
  name: string;
  dose: string;
  how: string;
}

export const CARDIO_OPTIONS: CardioOption[] = [
  { id: "brisk", name: "早歩き", dose: "10〜30分", how: "少し息がはずむが、話はできる速さ。歌うのはきつい、くらい。" },
  { id: "commute", name: "通学を早歩きに", dose: "往復20分", how: "大学への行き帰り（片道10分）を早歩きにすると、それだけで20分になります。" },
  { id: "interval", name: "早歩きの波", dose: "3分 × 3〜5回", how: "3分速く歩いて、3分ゆっくり歩く。これを繰り返す。体力がいちばん伸びやすい歩き方です。" },
  { id: "stairs", name: "階段を使う", dose: "1〜3階分", how: "大学や駅でエレベーターの代わりに。短くても息がはずむ強さになります。" },
  { id: "home", name: "雨の日は家で", dose: "10分", how: "腕を大きく振って足踏み3分 → 階段の1段で踏み台昇降2分。これを2回。" },
];

// ---- 段階（道のり） ----

export interface Stage {
  stage: number;
  name: string;
  weeks: string;
  goal: string;
  weeklyTimes: number;
  minutes: number;
  shortMinutes: number;
  sets: number;
  rest: string;
  /** 1週間の有酸素の目安（分） */
  walkMinutes: number;
  walk: string;
}

export const STAGES: Stage[] = [
  {
    stage: 1,
    name: "慣れる",
    weeks: "1〜2週目",
    goal: "動きを覚える。きつくない回数で、とにかく続ける",
    weeklyTimes: 2,
    minutes: 10,
    shortMinutes: 5,
    sets: 1,
    rest: "種目のあいだに30秒〜1分",
    walkMinutes: 60,
    walk: "散歩や通学のうち10分を、少し速く歩く（週6回ほど）",
  },
  {
    stage: 2,
    name: "習慣にする",
    weeks: "3〜5週目",
    goal: "セットを2回に。決まった曜日に体が動くようにする",
    weeklyTimes: 2,
    minutes: 15,
    shortMinutes: 5,
    sets: 2,
    rest: "2種目を交互に。セットのあいだ30秒〜1分",
    walkMinutes: 90,
    walk: "早歩きを15〜20分、週5回ほど",
  },
  {
    stage: 3,
    name: "体力をつける",
    weeks: "6〜9週目",
    goal: "セットを3回に。種目の段階を1つずつ上げる。早歩きは週150分",
    weeklyTimes: 2,
    minutes: 20,
    shortMinutes: 5,
    sets: 3,
    rest: "セットのあいだ1分",
    walkMinutes: 150,
    walk: "早歩き30分を週5回。うち1回は「早歩きの波」",
  },
  {
    stage: 4,
    name: "続ける",
    weeks: "10週目〜",
    goal: "週3回にして、体が慣れたら種目の段階を上げ続ける",
    weeklyTimes: 3,
    minutes: 20,
    shortMinutes: 5,
    sets: 3,
    rest: "セットのあいだ1分",
    walkMinutes: 200,
    walk: "早歩きを週150〜300分。週1〜2回は「早歩きの波」か階段",
  },
];

export const stageOf = (plan?: Pick<ExercisePlan, "stage">): Stage => STAGES.find((s) => s.stage === plan?.stage) ?? STAGES[0];
export const levelOf = (plan: Pick<ExercisePlan, "levels"> | undefined, id: string) => {
  const move = moveOf(id);
  const n = plan?.levels?.[id] ?? 1;
  return move ? Math.min(Math.max(1, n), move.levels.length) : 1;
};

/** 段階を変えたときの計画（筋トレの回数と長さもそろえる） */
export function withStage(plan: ExercisePlan, stage: Stage, today: string): ExercisePlan {
  return {
    ...plan,
    stage: stage.stage,
    stageSince: today,
    weeklyTimes: plan.nonConsecutive ? Math.min(stage.weeklyTimes, 4) : stage.weeklyTimes,
    normalMinutes: stage.minutes,
    shortMinutes: Math.min(stage.shortMinutes, stage.minutes),
  };
}

export function withLevel(plan: ExercisePlan, id: string, level: number): ExercisePlan {
  return { ...plan, levels: { ...plan.levels, [id]: level } };
}

// ---- 今日のメニュー ----

export interface SessionItem {
  id: string;
  name: string;
  level?: number;
  dose: string;
  how: string[];
  point?: string;
  figure?: string;
  reps?: [number, number];
  seconds?: [number, number];
  sets?: number;
}

export function doseOf(level: Pick<MoveLevel, "reps" | "seconds" | "perSide">, sets: number) {
  const amount = level.seconds ? `${level.seconds[0]}〜${level.seconds[1]}秒` : level.reps ? `${level.reps[0]}〜${level.reps[1]}回` : "";
  return `${sets > 1 ? `${sets}セット × ` : ""}${amount}${level.perSide ? "（左右とも）" : ""}`;
}

/** 短めの日にやる種目（腕立てとスクワットを1セットずつ） */
export const SHORT_MOVES: StrengthId[] = ["push", "chair"];

/** 段階と種目の段階から、今日やる筋トレの中身を作る */
export function sessionOf(plan: ExercisePlan | undefined, variant: Exercise["variant"]): SessionItem[] {
  const stage = stageOf(plan);
  const sets = variant === "short" ? 1 : stage.sets;
  const moves = STRENGTH_MOVES.filter((m) => variant === "normal" || SHORT_MOVES.includes(m.id));
  return [
    { ...WARMUP, dose: variant === "short" ? "1分" : WARMUP.dose },
    ...moves.map((m): SessionItem => {
      const level = levelOf(plan, m.id);
      const l = m.levels[level - 1];
      return { id: m.id, name: l.name, level, dose: doseOf(l, sets), how: l.how, point: l.point, figure: l.figure, reps: l.reps, seconds: l.seconds, sets };
    }),
    COOLDOWN,
  ];
}

// ---- 記録から、いまどこにいるか ----

const DAY = 86_400_000;
const keyMs = (key: string) => Date.parse(key + "T00:00:00Z");
export const addDays = (key: string, n: number) => new Date(keyMs(key) + n * DAY).toISOString().slice(0, 10);
/** その日の週の月曜（YYYY-MM-DD） */
export const mondayOf = (key: string) => addDays(key, -((new Date(keyMs(key)).getUTCDay() + 6) % 7));
export const daysBetween = (from: string, to: string) => Math.round((keyMs(to) - keyMs(from)) / DAY);

const strengthDone = (records: Exercise[]) => records.filter((r) => r.activity === "strength").sort((a, b) => b.date.localeCompare(a.date));

/**
 * 種目の段階を上げてよいか：その段階でやった最後の2回が、どちらも
 * 「楽だった」か、範囲のいちばん上の回数（秒）を段階のセット数だけできた。最後が「きつい」なら上げない
 */
export function levelUpReady(records: Exercise[], id: string, level: number, sets: number): boolean {
  const move = moveOf(id);
  if (!move || level >= move.levels.length) return false;
  const target = move.levels[level - 1];
  const top = target.seconds?.[1] ?? target.reps?.[1] ?? Infinity;
  const recent = strengthDone(records).filter((r) => r.details?.some((d) => d.id === id && (d.level ?? 1) === level)).slice(0, 2);
  if (recent.length < 2 || recent[0].feel === "hard") return false;
  return recent.every((r) => {
    const d = r.details!.find((x) => x.id === id)!;
    const amount = target.seconds ? d.seconds : d.reps;
    return r.feel === "easy" || (amount !== undefined && amount >= top && (d.sets ?? 1) >= sets);
  });
}

export interface StageCheck {
  /** 直近14日の筋トレの回数 */
  done: number;
  needed: number;
  /** 最後の2回のどちらかが「きつい」 */
  hard: boolean;
  /** 今の段階にしてからの日数（分からなければ undefined） */
  daysIn?: number;
  ready: boolean;
}

/**
 * 次の段階をすすめてよいか（自動では上げない。すすめるだけ）：
 * 2週間で筋トレを予定の回数（1回は休んでよい）でき、最後の2回が「きつい」でなく、今の段階に2週間いた
 */
export function stageCheck(records: Exercise[], plan: ExercisePlan | undefined, today: string): StageCheck {
  const stage = stageOf(plan);
  const from = addDays(today, -13);
  const all = strengthDone(records);
  const done = all.filter((r) => r.date >= from && r.date <= today).length;
  const needed = Math.max(2, (plan?.weeklyTimes ?? stage.weeklyTimes) * 2 - 1);
  const hard = all.slice(0, 2).some((r) => r.feel === "hard");
  const daysIn = plan?.stageSince ? daysBetween(plan.stageSince, today) : undefined;
  const ready = stage.stage < STAGES.length && done >= needed && !hard && (daysIn === undefined || daysIn >= 13);
  return { done, needed, hard, daysIn, ready };
}

/** 記録の中の歩いた分（くわしく入れていない前の記録は、ふつう20分・短め5分とみなす） */
export const walkMinutesOfRecord = (r: Exercise) => {
  const sum = (r.details ?? []).reduce((s, d) => s + (d.minutes ?? 0), 0);
  return sum > 0 ? sum : r.variant === "normal" ? 20 : 5;
};

/** 習慣の「散歩」の記録（朝の散歩）も歩いた分に数える */
export const WALK_HABIT_ID = "habit-walk";

/** from〜to（両端を含む）に歩いた分。習慣の散歩は「やった」で durationMinutes、「少しだけ」で5分 */
export function walkMinutesBetween(
  records: Exercise[],
  habitLogs: Record<string, Record<string, "done" | "five">>,
  walkHabitMinutes: number,
  from: string,
  to: string,
): number {
  const fromRecords = records
    .filter((r) => r.activity === "walking" && r.date >= from && r.date <= to)
    .reduce((s, r) => s + walkMinutesOfRecord(r), 0);
  const fromHabit = Object.entries(habitLogs)
    .filter(([key]) => key >= from && key <= to)
    .reduce((s, [, marks]) => s + (marks[WALK_HABIT_ID] === "done" ? walkHabitMinutes : marks[WALK_HABIT_ID] === "five" ? 5 : 0), 0);
  return fromRecords + fromHabit;
}

/** 肩こりほぐしの記録（1日1件。回数は details の shoulder の reps） */
export const shoulderRoundOf = (date: string) => `manual:${date}:mobility`;
export const shoulderTimesOf = (r: Exercise | undefined) => (r ? (r.details?.find((d) => d.id === "shoulder")?.reps ?? 1) : 0);
/** 歩いた記録（1日1件。分は details の walk の minutes） */
export const walkRoundOf = (date: string) => `manual:${date}:walking`;

/** その記録に、肩こりほぐしを1回足したもの */
export function addShoulder(existing: Exercise | undefined, date: string, variant: Exercise["variant"]): Exercise {
  const times = (existing?.details?.find((d) => d.id === "shoulder")?.reps ?? 0) + 1;
  const others = (existing?.details ?? []).filter((d) => d.id !== "shoulder");
  return { date, roundId: shoulderRoundOf(date), activity: "mobility", variant: existing?.variant === "normal" ? "normal" : variant, details: [...others, { id: "shoulder", reps: times }] };
}

/** その記録に、歩いた分を足したもの */
export function addWalk(existing: Exercise | undefined, date: string, minutes: number): Exercise {
  const before = existing ? walkMinutesOfRecord(existing) : 0;
  const others = (existing?.details ?? []).filter((d) => d.id !== "walk" && !d.minutes);
  return { date, roundId: walkRoundOf(date), activity: "walking", variant: "normal", details: [...others, { id: "walk", minutes: Math.min(before + minutes, 1440) }] };
}

export interface WeekSummary {
  monday: string;
  strength: number;
  walkMinutes: number;
  shoulder: number;
}

/** 直近の週ごとのまとめ（新しい週から） */
export function weekSummaries(
  records: Exercise[],
  habitLogs: Record<string, Record<string, "done" | "five">>,
  walkHabitMinutes: number,
  today: string,
  weeks: number,
): WeekSummary[] {
  const thisMonday = mondayOf(today);
  return Array.from({ length: weeks }, (_, i) => {
    const monday = addDays(thisMonday, -7 * i);
    const sunday = addDays(monday, 6);
    const inWeek = records.filter((r) => r.date >= monday && r.date <= sunday);
    return {
      monday,
      strength: inWeek.filter((r) => r.activity === "strength").length,
      walkMinutes: walkMinutesBetween(records, habitLogs, walkHabitMinutes, monday, sunday),
      shoulder: inWeek.filter((r) => r.activity === "mobility").reduce((s, r) => s + shoulderTimesOf(r), 0),
    };
  });
}

import { resolveTravel, type CalendarEvent, type Habit, type Place, type PlanResult, type Settings } from "@/lib/scheduler";
import { formatDate, formatTime } from "@/lib/mock/jst";

/** 1件の通知。サーバーが at の時刻に送る。key は同じ通知を2回送らないための名前 */
export interface Notice {
  key: string;
  at: number;
  title: string;
  body: string;
  /** 押したときに開く画面 */
  url: string;
}

export interface NoticeInput {
  now: number;
  result: Pick<PlanResult, "dayPlans" | "blocks" | "shortfalls"> & Partial<Pick<PlanResult, "dayEnergy" | "travelQuestions">>;
  /** plan() に渡した予定（自分の予定・授業・取り込んだ予定） */
  events: CalendarEvent[];
  places: Place[];
  settings: Settings;
  /** きっかけがあって記録する習慣は、本文を「まず5分」にする */
  habits?: Pick<Habit, "id" | "cue" | "track">[];
  /** 移動時間を聞く取り込んだ予定（場所のないもの）。登録のない場所は result.travelQuestions から聞く */
  travelAsks?: Pick<CalendarEvent, "id" | "title" | "start">[];
  /** 「連絡してみる？」を朝のまとめに添える日（その日の 0:00） */
  contactDays?: number[];
  /** 予定の何分前に知らせるか */
  leadMinutes?: number;
  /** どこまで先の通知を作るか */
  horizonMs?: number;
}

const MIN = 60_000;
export const NOTICE_LEAD_MINUTES = 15;
export const NOTICE_HORIZON_MS = 48 * 60 * MIN;
/** タバコの区切り（就寝の何分前）。就寝前4時間以内の喫煙は睡眠を悪くする（Spadola 2019）。まずは3時間から */
export const SMOKE_CUTOFF_MINUTES = 180;
/** 寝る準備の合図（就寝の何分前） */
export const BED_PREP_MINUTES = 30;
/** Apple Watch の充電を始める合図（就寝の何分前）。寝るときに満タンにして、睡眠を記録する。外出から帰るのがこれより遅い日は、帰宅の時刻に */
export const WATCH_CHARGE_MINUTES = 120;

/**
 * 配置の結果から、これから送る通知を作る。
 * - 予定の15分前（外出する予定は、家を出る時刻の15分前）
 * - 習慣とタスクの枠の始まり（朝ルーティンは毎朝のまとめに含める）
 * - 毎朝、起床の時刻にその日のまとめ
 * - 人に会う日は、身支度を始める時刻に知らせる
 * - 外出した日は、帰宅の時刻に残りの体力を聞く（答えていなければ）
 * - 就寝の3時間前に「タバコはここまで」、30分前に「寝る準備」（Apple Watch をつける）
 * - 就寝の2時間前（帰宅がそれより遅ければ帰宅の時刻）に、Apple Watch の充電
 * 就寝から次の起床までに入るものは送らない（毎朝のまとめは起床の時刻ちょうどなので送る）
 */
export function buildNotices(input: NoticeInput): Notice[] {
  const { now, result, events, places, settings } = input;
  const lead = (input.leadMinutes ?? NOTICE_LEAD_MINUTES) * MIN;
  const until = now + (input.horizonMs ?? NOTICE_HORIZON_MS);
  const days = [...result.dayPlans].sort((a, b) => a.dayStart - b.dayStart);
  const quiet = days.slice(0, -1).map((d, i) => ({ start: d.bed, end: days[i + 1].wake }));
  const isQuiet = (t: number) => quiet.some((q) => t >= q.start && t < q.end);

  const out: Notice[] = [];
  const add = (n: Notice) => {
    if (n.at > now && n.at <= until && !isQuiet(n.at)) out.push(n);
  };

  for (const ev of events) {
    if (ev.allDay) continue;
    const travel = resolveTravel(ev, places, settings);
    const leave = !travel.atHome && travel.minutes > 0 ? ev.start - travel.minutes * MIN : undefined;
    add({
      key: `event:${ev.id}:${ev.start}`,
      at: (leave ?? ev.start) - lead,
      title: leave ? `${formatTime(leave)} に出発：${ev.title}` : `${formatTime(ev.start)} から：${ev.title}`,
      body: leave
        ? `あと${lead / MIN}分で家を出る時刻です（移動 ${travel.minutes}分）。`
        : `あと${lead / MIN}分で始まります。`,
      url: "/",
    });
  }

  // 移動時間が分からない予定は、すぐに1回だけ聞く（寝ている時間なら、次に組み直したときに起きている時刻で）。
  // まとめて何件も届かないように、いちばん早い予定の分だけ送る（答えたら次の予定の分が届く）
  const asks = [
    ...(input.travelAsks ?? []).map((e) => ({ id: e.id, label: `${formatDate(e.start)}「${e.title}」` })),
    ...(result.travelQuestions ?? []).map((q) => {
      const ev = events.find((e) => e.id === q.eventId);
      return { id: q.eventId, label: ev ? `${formatDate(ev.start)}「${ev.title}」（${q.location}）` : q.location };
    }),
  ];
  if (asks[0]) add({ key: `travel:${asks[0].id}`, at: now + MIN, title: "移動時間は？", body: `${asks[0].label}${asks.length > 1 ? ` ほか${asks.length - 1}件` : ""}`, url: "/" });

  // タスクは、その日の最後の枠が終わったら「終わった？」と聞く（押すと今日の画面で答える）
  const lastOfDay = new Map<string, (typeof result.blocks)[number]>();
  for (const b of result.blocks) {
    if (b.kind !== "task") continue;
    const day = days.find((d) => b.start >= d.dayStart && b.start < d.dayStart + 24 * 60 * MIN)?.dayStart ?? 0;
    const k = `${b.refId}:${day}`;
    const cur = lastOfDay.get(k);
    if (!cur || b.end > cur.end) lastOfDay.set(k, b);
  }
  for (const [k, b] of lastOfDay) add({ key: `check:${k}`, at: b.end, title: b.title, body: "終わった？", url: "/" });

  const cued = new Set((input.habits ?? []).filter((h) => h.cue && h.track).map((h) => h.id));
  for (const b of result.blocks) {
    if (b.kind === "routine") continue;
    add({
      key: `block:${b.kind}:${b.refId}:${b.start}`,
      at: b.start,
      title: b.title,
      body: b.kind === "habit" && cued.has(b.refId) ? "まず5分" : `${formatTime(b.start)}〜${formatTime(b.end)}`,
      // タスクの枠は、通知から開いたら「やった」にする
      url: b.kind === "task" ? `/?done=${encodeURIComponent(`${b.refId}:${b.start}`)}` : "/",
    });
  }

  for (const d of days) {
    const end = d.dayStart + 24 * 60 * MIN;
    const todays = events.filter((e) => !e.allDay && e.start >= d.dayStart && e.start < end);
    const tasks = result.blocks.filter((b) => b.kind === "task" && b.start >= d.dayStart && b.start < end);
    const first = [...todays].sort((a, b) => a.start - b.start)[0];
    const parts = [
      todays.length ? `予定${todays.length}件（最初は ${formatTime(first.start)} ${first.title}）` : "予定なし",
      tasks.length ? `タスクの枠${tasks.length}つ` : "",
      d.leave ? `${formatTime(d.leave)} に出発` : "",
      result.shortfalls.length ? `締切に間に合わないタスクが${result.shortfalls.length}件あります` : "",
      input.contactDays?.includes(d.dayStart) ? "連絡してみる？" : "",
    ].filter(Boolean);
    add({ key: `morning:${d.dayStart}`, at: d.wake, title: "おはようございます", body: parts.join("・"), url: "/" });
  }

  for (const d of days) {
    // 身支度：朝ルーティンが終わったら始める（家を出る時刻・顔を出す予定の開始まで）
    const goal = d.leave ?? d.firstEvent?.start;
    if (d.prep && goal !== undefined) {
      add({
        key: `prep:${d.dayStart}`,
        at: goal - settings.prepMinutes * MIN,
        title: "身支度を始める",
        body: d.leave ? `出発 ${formatTime(d.leave)}` : `${formatTime(goal)} から：${d.firstEvent?.title ?? ""}`,
        url: "/",
      });
    }
    const answered = result.dayEnergy?.find((e) => e.dayStart === d.dayStart)?.evening;
    if (d.homeAt !== undefined && !answered && d.homeAt < d.bed) {
      add({
        key: `home:${d.dayStart}`,
        at: d.homeAt,
        title: "おかえりなさい",
        body: "残りの体力は？",
        url: "/?checkin=1",
      });
    }
    add({
      key: `smoke:${d.dayStart}`,
      at: d.bed - SMOKE_CUTOFF_MINUTES * MIN,
      title: "今日のタバコはここまで",
      body: `就寝 ${formatTime(d.bed)}`,
      url: "/",
    });
    const charge = d.bed - WATCH_CHARGE_MINUTES * MIN;
    add({
      key: `watch:${d.dayStart}`,
      at: d.homeAt !== undefined && d.homeAt > charge && d.homeAt < d.bed ? d.homeAt : charge,
      title: "Apple Watch を充電",
      body: `就寝 ${formatTime(d.bed)}`,
      url: "/",
    });
    add({
      key: `bedprep:${d.dayStart}`,
      at: d.bed - BED_PREP_MINUTES * MIN,
      title: "寝る準備の時間です",
      body: `Apple Watch をつける・スマホは充電場所へ。就寝 ${formatTime(d.bed)}`,
      url: "/",
    });
  }

  return out.sort((a, b) => a.at - b.at || a.key.localeCompare(b.key));
}

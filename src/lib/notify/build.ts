import { resolveTravel, type CalendarEvent, type Place, type PlanResult, type Settings } from "@/lib/scheduler";
import { formatTime } from "@/lib/mock/jst";

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
  result: Pick<PlanResult, "dayPlans" | "blocks" | "shortfalls"> & Partial<Pick<PlanResult, "dayEnergy">>;
  /** plan() に渡した予定（自分の予定・授業・取り込んだ予定） */
  events: CalendarEvent[];
  places: Place[];
  settings: Settings;
  /** 予定の何分前に知らせるか */
  leadMinutes?: number;
  /** どこまで先の通知を作るか */
  horizonMs?: number;
}

const MIN = 60_000;
export const NOTICE_LEAD_MINUTES = 15;
export const NOTICE_HORIZON_MS = 48 * 60 * MIN;
/** タバコの区切り（就寝の何分前） */
export const SMOKE_CUTOFF_MINUTES = 120;
/** 寝る準備の合図（就寝の何分前） */
export const BED_PREP_MINUTES = 30;

/**
 * 配置の結果から、これから送る通知を作る。
 * - 予定の15分前（外出する予定は、家を出る時刻の15分前）
 * - 習慣とタスクの枠の始まり（朝ルーティンは毎朝のまとめに含める）
 * - 毎朝、起床の時刻にその日のまとめ
 * - 外出した日は、帰宅の時刻に残りの体力を聞く（答えていなければ）
 * - 就寝の2時間前に「タバコはここまで」、30分前に「寝る準備」
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

  for (const b of result.blocks) {
    if (b.kind === "routine") continue;
    add({
      key: `block:${b.kind}:${b.refId}:${b.start}`,
      at: b.start,
      title: b.title,
      body: `${formatTime(b.start)}〜${formatTime(b.end)}`,
      url: "/",
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
    ].filter(Boolean);
    add({ key: `morning:${d.dayStart}`, at: d.wake, title: "おはようございます", body: parts.join("・"), url: "/" });
  }

  for (const d of days) {
    const answered = result.dayEnergy?.find((e) => e.dayStart === d.dayStart)?.evening;
    if (d.homeAt !== undefined && !answered && d.homeAt < d.bed) {
      add({
        key: `home:${d.dayStart}`,
        at: d.homeAt,
        title: "おかえりなさい",
        body: "残りの体力を教えてください。今夜の予定をそれに合わせます。",
        url: "/?checkin=1",
      });
    }
    add({
      key: `smoke:${d.dayStart}`,
      at: d.bed - SMOKE_CUTOFF_MINUTES * MIN,
      title: "今日のタバコはここまで",
      body: `就寝は ${formatTime(d.bed)}。寝つきのために、ここからは吸わずに過ごしましょう。`,
      url: "/",
    });
    add({
      key: `bedprep:${d.dayStart}`,
      at: d.bed - BED_PREP_MINUTES * MIN,
      title: "寝る準備の時間です",
      body: `歯みがきをして、スマホを充電場所へ。就寝は ${formatTime(d.bed)}。`,
      url: "/",
    });
  }

  return out.sort((a, b) => a.at - b.at || a.key.localeCompare(b.key));
}

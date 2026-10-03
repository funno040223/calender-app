import { describe, expect, it } from "vitest";
import { plan } from "./planner";
import type { AvoidWindow, Habit, Tag, Task } from "./types";
import { baseInput, jst } from "./test-helpers";

const focus: Tag = { id: "focus", name: "集中", mode: "focus", defaultMinutes: 90, minChunkMinutes: 60, maxChunkMinutes: 120 };
const report: Task = { id: "t1", title: "レポート", durationMinutes: 120, priority: 2, tagId: "focus" };
const now = jst(2026, 10, 1, 6);
const taskBlocks = (r: ReturnType<typeof plan>) => r.blocks.filter((b) => b.kind === "task");

describe("昨夜の就寝", () => {
  it("0時を過ぎて就寝の時刻を過ぎても、昨夜の就寝を残す（「おやすみ」を出し続ける）", () => {
    const late = { ...baseInput(jst(2026, 10, 1, 2, 30)), settings: { ...baseInput(now).settings, sleepMinutes: 7 * 60 } };
    const r = plan(late);
    // 起床 9:00 − 7時間 = 2:00 に寝る予定。2:30 には前の日の計画は外れるが、就寝は残る
    expect(r.dayPlans.some((d) => d.dayStart === jst(2026, 9, 30))).toBe(false);
    expect(r.lastNight).toEqual({ dayStart: jst(2026, 9, 30), bed: jst(2026, 10, 1, 2) });
  });
});

describe("タスクの配置（減点方式）", () => {
  it("集中系は起きてすぐを避ける", () => {
    // 9:00 起床、9:15 に朝ルーティンが終わる（予定がない日は身支度なし）→ 10:15 までは減点
    const [b] = taskBlocks(plan(baseInput(now, { tags: [focus], tasks: [report] })));
    expect(b.start).toBe(jst(2026, 10, 1, 10, 15));
    expect(b.end).toBe(jst(2026, 10, 1, 12, 15));
  });

  it("空けた時間には置かず、外した分は別の時間に入れ直す。固定した枠も外す", () => {
    const freed = { start: jst(2026, 10, 1, 10, 15), end: jst(2026, 10, 1, 12, 15) };
    const r = plan(baseInput(now, { tags: [focus], tasks: [report], keepFree: [freed] }));
    const bs = taskBlocks(r);
    expect(bs.reduce((m, b) => m + (b.end - b.start) / 60_000, 0)).toBe(120);
    expect(bs.every((b) => b.end <= freed.start || b.start >= freed.end)).toBe(true);
    expect(r.blocks.every((b) => b.end <= freed.start || b.start >= freed.end)).toBe(true);
    const pinned = { kind: "task" as const, refId: report.id, title: report.title, ...freed, pinned: true };
    const again = taskBlocks(plan(baseInput(now, { tags: [focus], tasks: [report], keepFree: [freed], previousBlocks: [pinned] })));
    expect(again.some((b) => b.start === freed.start)).toBe(false);
  });

  it("「なるべく避ける」時間帯を外して置く", () => {
    const morning: AvoidWindow = { id: "a1", label: "午前はだるい", start: 9 * 60, end: 12 * 60, hard: false };
    const [b] = taskBlocks(plan(baseInput(now, { tags: [focus], tasks: [report], avoidWindows: [morning] })));
    expect(b.start).toBe(jst(2026, 10, 1, 12));
  });

  it("「入れない」時間帯には置かない。締切がなければ警告も出さない", () => {
    const allDay: AvoidWindow = { id: "a2", label: "終日不可", start: 0, end: 24 * 60, tagIds: ["focus"], hard: true };
    const r = plan(baseInput(now, { tags: [focus], tasks: [report], avoidWindows: [allDay] }));
    expect(taskBlocks(r)).toHaveLength(0);
    expect(r.shortfalls).toHaveLength(0);
  });

  it("締切までに入りきらなければ、足りない時間を警告する", () => {
    const big: Task = { id: "t2", title: "大量の作業", durationMinutes: 600, priority: 2, deadline: jst(2026, 10, 1, 12) };
    const r = plan(baseInput(now, { tasks: [big] }));
    expect(r.shortfalls).toHaveLength(1);
    expect(r.shortfalls[0].shortfallMinutes).toBeGreaterThan(0);
  });

  it("締切を守るために、飛ばしてよい習慣を外す", () => {
    const exercise: Habit = {
      id: "h1",
      name: "運動",
      durationMinutes: 60,
      windowStart: 18 * 60,
      windowEnd: 19 * 60,
      frequency: { type: "daily" },
      skippable: true,
    };
    const events = [
      { id: "e1", title: "在宅作業", start: jst(2026, 10, 1, 8), end: jst(2026, 10, 1, 18) },
      { id: "e2", title: "予定", start: jst(2026, 10, 1, 19), end: jst(2026, 10, 1, 23) },
    ];
    const task: Task = { id: "t3", title: "提出物", durationMinutes: 60, priority: 2, deadline: jst(2026, 10, 1, 20) };
    const r = plan(baseInput(now, { events, habits: [exercise], tasks: [task] }));

    expect(r.shortfalls).toHaveLength(0);
    expect(taskBlocks(r)[0].start).toBe(jst(2026, 10, 1, 18));
    expect(r.skippedHabits).toContainEqual({ habitId: "h1", dayStart: jst(2026, 10, 1), reason: "deadline" });
  });

  it("固定した枠は動かさず、その分だけ残り時間を減らす", () => {
    const pinned = {
      kind: "task" as const,
      refId: "t1",
      title: "レポート",
      start: jst(2026, 10, 2, 15),
      end: jst(2026, 10, 2, 17),
      pinned: true,
    };
    const r = plan(baseInput(now, { tags: [focus], tasks: [report], previousBlocks: [pinned] }));
    expect(taskBlocks(r)).toEqual([pinned]);
  });

  it("消したタスク・習慣の枠は、固定していても始まっていても残さない", () => {
    const pinned = { kind: "task" as const, refId: "gone", title: "消したタスク", start: jst(2026, 10, 2, 15), end: jst(2026, 10, 2, 17), pinned: true };
    const started = { kind: "habit" as const, refId: "gone-habit", title: "やめた習慣", start: jst(2026, 10, 1, 5), end: jst(2026, 10, 1, 7) };
    const r = plan(baseInput(now, { tags: [focus], tasks: [report], previousBlocks: [pinned, started] }));
    expect(r.blocks.some((b) => b.refId === "gone" || b.refId === "gone-habit")).toBe(false);
    expect(taskBlocks(r).every((b) => b.refId === "t1")).toBe(true);
  });

  it("外出する予定から帰ったあとは、移動時間と休憩を空ける", () => {
    const univ = { id: "univ", name: "大学", keywords: [], travelMinutes: 45 };
    const intern = { id: "e1", title: "インターン", start: jst(2026, 10, 1, 10), end: jst(2026, 10, 1, 12), location: "大学" };
    const task: Task = { id: "t4", title: "メール返信", durationMinutes: 30, priority: 2, deadline: jst(2026, 10, 1, 14) };
    // 12:00 終了 → 移動45分 → 休憩30分 → 13:15 から
    const [b] = taskBlocks(plan(baseInput(jst(2026, 10, 1, 12), { events: [intern], places: [univ], tasks: [task] })));
    expect(b.start).toBe(jst(2026, 10, 1, 13, 15));
  });

  it("タスクのあとは、タグごとの休憩を空ける", () => {
    const admin: Tag = { id: "admin", name: "事務", mode: "gap", defaultMinutes: 30, minChunkMinutes: 15, maxChunkMinutes: 60, restAfterMinutes: 30 };
    const a: Task = { id: "a", title: "A", durationMinutes: 60, priority: 3, tagId: "admin", deadline: jst(2026, 10, 2) };
    const b: Task = { id: "b", title: "B", durationMinutes: 60, priority: 2, tagId: "admin", deadline: jst(2026, 10, 2) };
    const [ba, bb] = taskBlocks(plan(baseInput(now, { tags: [admin], tasks: [a, b] })));
    expect(bb.start - ba.end).toBeGreaterThanOrEqual(30 * 60_000);
  });

  it("予定に関連するタスクを「直前に寄せる」と、予定の直前に置く", () => {
    const interview = { id: "e9", title: "面接", start: jst(2026, 10, 4, 15), end: jst(2026, 10, 4, 16), location: "Zoom" };
    const prep: Task = { id: "t5", title: "面接対策", durationMinutes: 60, priority: 2, relatedEventId: "e9", timing: "justBefore" };
    const [b] = taskBlocks(plan(baseInput(now, { events: [interview], tasks: [prep] })));
    expect(b.start).toBe(jst(2026, 10, 4, 14));
    expect(b.end).toBe(interview.start);
  });

  it("外出する予定に関連するタスクの締切は、家を出る時刻", () => {
    const univ = { id: "univ", name: "大学", keywords: [], travelMinutes: 45 };
    const exam = { id: "e8", title: "試験", start: jst(2026, 10, 1, 13), end: jst(2026, 10, 1, 15), location: "大学" };
    const study: Task = { id: "t6", title: "試験勉強", durationMinutes: 600, priority: 3, relatedEventId: "e8" };
    const r = plan(baseInput(now, { events: [exam], places: [univ], tasks: [study] }));
    expect(r.shortfalls[0].deadline).toBe(jst(2026, 10, 1, 12, 15));
  });

  it("前回と同じ位置に置けるなら動かさない", () => {
    const before = { kind: "task" as const, refId: "t1", title: "レポート", start: jst(2026, 10, 1, 14), end: jst(2026, 10, 1, 16) };
    const [b] = taskBlocks(plan(baseInput(now, { tags: [focus], tasks: [report], previousBlocks: [before] })));
    expect(b.start).toBe(before.start);
  });
});

describe("生活の中身から決めた配置", () => {
  const onlyEvening: AvoidWindow = { id: "x", label: "夜だけ空いている", start: 0, end: 19 * 60, tagIds: ["focus"], hard: true };
  const dinner: Habit = {
    id: "dinner",
    name: "夕食",
    durationMinutes: 60,
    windowStart: 18 * 60,
    windowEnd: 19 * 60,
    frequency: { type: "daily" },
    skippable: false,
    avoidFocusAfterMinutes: 60,
  };
  const focus90: Task = { ...report, durationMinutes: 90 };

  it("食後すぐは集中系を避ける", () => {
    // 19:00 から置けるが、夕食 18:00〜19:00 のあと1時間は避けて 20:00 から
    const [b] = taskBlocks(plan(baseInput(now, { tags: [focus], tasks: [focus90], habits: [dinner], avoidWindows: [onlyEvening] })));
    expect(b.start).toBe(jst(2026, 10, 1, 20));
  });

  it("「休日の午前」は、遊び以外の予定がない日だけ避ける", () => {
    const holidayMorning: AvoidWindow = { id: "h", label: "休日の午前", start: 9 * 60, end: 12 * 60, hard: false, dayType: "holiday" };
    // 予定がない日は休日 → 午前を避けて 12:00 から
    const [off] = taskBlocks(plan(baseInput(now, { tags: [focus], tasks: [report], avoidWindows: [holidayMorning] })));
    expect(off.start).toBe(jst(2026, 10, 1, 12));

    // 遊び以外の予定がある日はオンの日 → 午前も使う（起きてすぐを避けて 10:15 から）
    const work = { id: "w", title: "オンライン授業", start: jst(2026, 10, 1, 20), end: jst(2026, 10, 1, 21) };
    const r = plan(baseInput(now, { tags: [focus], tasks: [report], events: [work], avoidWindows: [holidayMorning] }));
    expect(r.dayPlans[0].holiday).toBe(false);
    expect(taskBlocks(r)[0].start).toBe(jst(2026, 10, 1, 10, 15));

    // 遊びの予定しかない日は休日のまま
    const play = { ...work, id: "p", title: "友だちと夕食", play: true };
    expect(plan(baseInput(now, { events: [play] })).dayPlans[0].holiday).toBe(true);
  });

  describe("1日の余白", () => {
    // 10:00〜19:00 と 22:00〜翌1:00 が埋まっていて、空きは 19:00〜22:00 と 1:00〜1:30 だけ
    const events = [
      // 顔を出す予定なので、朝は 9:00〜9:55 が朝ルーティンと身支度で埋まる
      { id: "a", title: "在宅作業", start: jst(2026, 10, 1, 10), end: jst(2026, 10, 1, 19), needsPrep: true },
      { id: "b", title: "夜の予定", start: jst(2026, 10, 1, 22), end: jst(2026, 10, 2, 1) },
    ];
    const chore: Task = { id: "c", title: "資料整理", durationMinutes: 120, priority: 2 };

    it("余白が2時間残らない日には入れない", () => {
      const [b] = taskBlocks(plan(baseInput(now, { events, tasks: [chore] })));
      expect(b.start).toBeGreaterThanOrEqual(jst(2026, 10, 2));
    });

    it("締切に間に合わないときだけ余白を削る", () => {
      const due: Task = { ...chore, deadline: jst(2026, 10, 2) };
      const r = plan(baseInput(now, { events, tasks: [due] }));
      expect(r.shortfalls).toHaveLength(0);
      expect(taskBlocks(r)[0].start).toBe(jst(2026, 10, 1, 19));
    });
  });

  describe("待ち時間のある作業（洗濯）", () => {
    const laundry: Habit = {
      id: "laundry",
      name: "洗濯を回す",
      durationMinutes: 10,
      windowStart: 9 * 60,
      windowEnd: 18 * 60,
      frequency: { type: "weekly", times: 1 },
      skippable: false,
      finish: { title: "洗濯物を干す", durationMinutes: 15, afterStartMinutes: 90 },
    };
    const tidy: Habit = {
      id: "tidy",
      name: "片付け",
      durationMinutes: 30,
      windowStart: 0,
      windowEnd: 24 * 60,
      frequency: { type: "daily" },
      skippable: true,
      duringHabitId: "laundry",
    };
    const habitBlocks = (r: ReturnType<typeof plan>) => r.blocks.filter((b) => b.kind === "habit");

    it("回してから90分後に干す枠を置き、待ち時間に片付けを入れる", () => {
      const r = plan(baseInput(now, { habits: [laundry, tidy] }));
      const hb = habitBlocks(r);
      // 月曜始まりの週ごとに1回（10/1〜4、10/5〜11、10/12〜14）
      const starts = hb.filter((b) => b.title === "洗濯を回す");
      expect(starts).toHaveLength(3);
      for (const st of starts) {
        const hang = hb.find((b) => b.title === "洗濯物を干す" && b.start === st.start + 90 * 60_000);
        expect(hang).toBeDefined();
        const t = hb.find((b) => b.title === "片付け" && b.start >= st.end && b.end <= hang!.start);
        expect(t).toBeDefined();
      }
    });

    it("回してから干すまでの間は、家にいない時間を避ける", () => {
      const univ = { id: "univ", name: "大学", keywords: [], travelMinutes: 45 };
      // 11:00〜12:00 に大学 → 10:15〜12:45 は家にいない（帰宅後の休憩で 13:15 まで埋まる）
      const cls = { id: "e", title: "授業", start: jst(2026, 10, 1, 11), end: jst(2026, 10, 1, 12), location: "大学" };
      const settings = { ...baseInput(now).settings, planningDays: 1 };
      const r = plan(baseInput(now, { settings, events: [cls], places: [univ], habits: [laundry] }));
      expect(habitBlocks(r).find((b) => b.title === "洗濯を回す")?.start).toBe(jst(2026, 10, 1, 13, 15));
    });
  });

  it("配置し終わったあとの空き時間を、すきま時間の候補として返す", () => {
    const r = plan(baseInput(now, { tags: [focus], tasks: [report] }));
    expect(r.freeGaps.length).toBeGreaterThan(0);
    for (const g of r.freeGaps) expect(g.end - g.start).toBeGreaterThanOrEqual(20 * 60_000);
    // タスクの枠とは重ならない
    const [b] = taskBlocks(r);
    expect(r.freeGaps.some((g) => g.start < b.end && g.end > b.start)).toBe(false);
  });
});

describe("行動ポイント", () => {
  // 在宅で1時間だけの予定に、重さ（行動ポイント）を直接つけて、その日を「しんどい日」にする
  const heavyOn = (day: number, points: number) => ({
    id: `heavy-${day}`,
    title: "重い予定",
    start: jst(2026, 10, day, 20),
    end: jst(2026, 10, day, 21),
    energyCost: points,
  });

  it("予定・タスク・習慣のポイントを日ごとに数える", () => {
    const univ = { id: "univ", name: "大学", keywords: [], travelMinutes: 10 };
    // 大学 13:00〜15:00：外出 2 ＋ 0.5 ×（2時間 ＋ 行き帰り20分）
    const zemi = { id: "z", title: "ゼミ", start: jst(2026, 10, 1, 13), end: jst(2026, 10, 1, 15), location: "大学" };
    const r = plan(baseInput(now, { events: [zemi], places: [univ] }));
    expect(r.dayEnergy[0].used).toBeCloseTo(2 + 0.5 * (2 + 20 / 60), 1);
    expect(r.dayEnergy[0].budget).toBe(10);
  });

  it("洗濯のように疲れる週ごとの習慣は、軽い日を選ぶ", () => {
    const laundry: Habit = {
      id: "laundry",
      name: "洗濯を回す",
      durationMinutes: 10,
      windowStart: 9 * 60,
      windowEnd: 18 * 60,
      frequency: { type: "weekly", times: 1 },
      skippable: false,
      energyCost: 1,
    };
    const settings = { ...baseInput(now).settings, planningDays: 7 };
    // 10/5（月）〜10/10 は重く、10/11 だけ軽い
    const events = [5, 6, 7, 8, 9, 10].map((d) => heavyOn(d, 8));
    const r = plan(baseInput(jst(2026, 10, 5, 6), { settings, events, habits: [laundry] }));
    const b = r.blocks.find((x) => x.refId === "laundry")!;
    expect(b.start).toBeGreaterThanOrEqual(jst(2026, 10, 11));
  });

  it("上限を超える日は、締切に余裕があるタスクを軽い日へ回す", () => {
    const task: Task = { id: "t", title: "資料整理", durationMinutes: 120, priority: 2, deadline: jst(2026, 10, 4) };
    const r = plan(baseInput(now, { events: [heavyOn(1, 9.5)], tasks: [task] }));
    expect(taskBlocks(r)[0].start).toBeGreaterThanOrEqual(jst(2026, 10, 2));
  });

  it("自炊のような「余裕がある日だけ」の習慣は、上限を超えない日にだけ入る", () => {
    const cook: Habit = {
      id: "cook",
      name: "自炊",
      durationMinutes: 45,
      windowStart: 17 * 60,
      windowEnd: 19 * 60,
      frequency: { type: "whenEnergy" },
      skippable: true,
      energyCost: 2,
    };
    const settings = { ...baseInput(now).settings, planningDays: 2 };
    const r = plan(baseInput(now, { settings, events: [heavyOn(1, 9)], habits: [cook] }));
    const cooks = r.blocks.filter((b) => b.refId === "cook");
    expect(cooks).toHaveLength(1);
    expect(cooks[0].start).toBeGreaterThanOrEqual(jst(2026, 10, 2));
  });

  it("上限を超える日は、空き時間に入る発散を提案する", () => {
    const recoveryOptions = [{ name: "ゲーム・動画", durationMinutes: 30, energy: -1.5 }];
    const r = plan(baseInput(now, { events: [heavyOn(1, 12)], recoveryOptions }));
    const today = r.dayEnergy[0];
    expect(today.used).toBeGreaterThan(today.budget);
    expect(today.suggestion?.name).toBe("ゲーム・動画");
    expect(today.suggestion!.end - today.suggestion!.start).toBe(30 * 60_000);
    // 軽い日には提案しない
    expect(r.dayEnergy[1].suggestion).toBeUndefined();
  });
});

describe("洗濯の間隔と外出の日", () => {
  const laundry: Habit = {
    id: "laundry",
    name: "洗濯を回す",
    durationMinutes: 10,
    windowStart: 9 * 60,
    windowEnd: 16 * 60,
    frequency: { type: "interval", minDays: 4, maxDays: 7 },
    skippable: false,
    energyCost: 1,
  };
  const starts = (r: ReturnType<typeof plan>, id = "laundry") =>
    r.blocks.filter((b) => b.refId === id && b.title === "洗濯を回す").map((b) => b.start);
  const dayNo = (ms: number) => Math.floor((ms - jst(2026, 10, 1)) / 86_400_000);
  // 在宅の短い予定（オンの日にするため）
  const onDay = (day: number) => ({ id: `on${day}`, title: "オンライン授業", start: jst(2026, 10, day, 20), end: jst(2026, 10, day, 21) });
  // 移動を含めて家にいない時間が長い日（外出の日）
  const outing = (day: number) => ({
    id: `out${day}`,
    title: "一日外出",
    start: jst(2026, 10, day, 10),
    end: jst(2026, 10, day, 17),
    location: "駅前",
    travelMinutes: 30,
  });

  it("前回から4〜7日の間隔を守る", () => {
    const r = plan(baseInput(now, { habits: [laundry] }));
    const days = starts(r).map(dayNo);
    expect(days.length).toBeGreaterThanOrEqual(2);
    for (let i = 1; i < days.length; i++) {
      expect(days[i] - days[i - 1]).toBeGreaterThanOrEqual(4);
      expect(days[i] - days[i - 1]).toBeLessThanOrEqual(7);
    }
  });

  it("間隔の中に休日があれば休日にする", () => {
    // 前回は 9/28 → 10/2〜10/5 のうち、10/2〜10/4 はオンの日、10/5 だけ休日
    const events = [2, 3, 4].map(onDay);
    const r = plan(baseInput(now, { events, habits: [laundry], habitLastDone: { laundry: jst(2026, 9, 28, 10) } }));
    expect(dayNo(starts(r)[0])).toBe(4);
  });

  it("家にいられる日なら、家での予定がある日にも入れる（行動ポイントの軽い順、同じなら早い日）", () => {
    // 前回は 9/28 → 10/2〜10/5。どの日も家でのオンライン授業がある
    const events = [1, 2, 3, 4, 5, 6, 7].map(onDay);
    const r = plan(baseInput(now, { events, habits: [laundry], habitLastDone: { laundry: jst(2026, 9, 28, 10) } }));
    expect(dayNo(starts(r)[0])).toBe(1);
  });

  // 大学など、少しだけ出かける日（外出の日ではない）
  const campus = (day: number) => ({ id: `c${day}`, title: "ゼミ", start: jst(2026, 10, day, 13), end: jst(2026, 10, day, 15), location: "大学", travelMinutes: 10 });
  // 洗濯の時間帯（9〜16時）がまるごと外出でふさがる日
  const allDay = (day: number) => ({ ...outing(day), id: `all${day}`, start: jst(2026, 10, day, 8, 30), end: jst(2026, 10, day, 17) });
  const last = { laundry: jst(2026, 9, 28, 10) };

  it("家にいられる日を、少しでも出かける日より先に選ぶ", () => {
    const events = [2, 3, 5].map(campus);
    const r = plan(baseInput(now, { events, habits: [laundry], habitLastDone: last }));
    expect(dayNo(starts(r)[0])).toBe(3);
  });

  it("間隔の中が雨の日と外出の日だけでも飛ばさず、条件のいい日（家にいられる雨の日）に入れる", () => {
    const rainy = { ...laundry, avoidRain: true };
    const events = [outing(2), outing(3)];
    const rainyDays = [2, 3, 4, 5].map((d) => jst(2026, 10, d));
    const r = plan(baseInput(now, { events, rainyDays, habits: [rainy], habitLastDone: last }));
    expect(dayNo(starts(r)[0])).toBe(3);
  });

  it("間隔の中にどうしても入らなければ、そのあとで入れられるいちばん早い日に入れる", () => {
    const events = [2, 3, 4, 5].map(allDay);
    const r = plan(baseInput(now, { events, habits: [laundry], habitLastDone: last }));
    expect(dayNo(starts(r)[0])).toBe(5);
  });

  it("外出の日には、自炊も洗濯も入れない", () => {
    const cook: Habit = {
      id: "cook",
      name: "自炊（夕）",
      durationMinutes: 45,
      windowStart: 17 * 60,
      windowEnd: 20 * 60,
      frequency: { type: "whenEnergy" },
      skippable: true,
      energyCost: 2,
    };
    // 10/1 は外出の日だが、行動ポイントは低くしておく（ポイントではなく外出の日の決まりで外れることを確かめる）
    const settings = { ...baseInput(now).settings, planningDays: 2 };
    const out = { ...outing(1), energyCost: 1 };
    const r = plan(baseInput(now, { settings, events: [out], habits: [laundry, cook] }));
    expect(r.dayEnergy[0].outingDay).toBe(true);
    expect(r.blocks.filter((b) => b.refId === "cook").map((b) => dayNo(b.start))).toEqual([1]);
    expect(starts(r).map(dayNo)).toEqual([1]);
  });

  it("予定の最中には食事を置かず、空きがなければ外で食べるものとして置かない", () => {
    const lunch: Habit = {
      id: "lunch",
      name: "昼食",
      durationMinutes: 30,
      windowStart: 11 * 60,
      windowEnd: 14 * 60 + 30,
      frequency: { type: "daily" },
      skippable: false,
      meal: true,
    };
    const settings = { ...baseInput(now).settings, planningDays: 2 };
    const r = plan(baseInput(now, { settings, events: [outing(1)], habits: [lunch] }));
    const meals = r.blocks.filter((b) => b.refId === "lunch");
    // 外出の日は、予定の時間と重なる食事を置かない。次の日は家で
    expect(meals.every((m) => !r.dayPlans.some((d) => d.homeAt !== undefined && m.start >= d.dayStart && m.start < d.dayStart + 86_400_000 && m.start < d.homeAt!))).toBe(true);
    expect(meals.at(-1)!.title).toBe("昼食");
  });
});

describe("帰省・旅行のような終日の予定", () => {
  const cook: Habit = {
    id: "cook",
    name: "自炊（夕）",
    durationMinutes: 45,
    windowStart: 17 * 60,
    windowEnd: 20 * 60,
    frequency: { type: "whenEnergy" },
    skippable: true,
    energyCost: 2,
  };
  const dinner: Habit = {
    id: "dinner",
    name: "夕食",
    durationMinutes: 60,
    windowStart: 18 * 60,
    windowEnd: 20 * 60 + 30,
    frequency: { type: "daily" },
    skippable: false,
    meal: true,
  };
  const settings = { ...baseInput(now).settings, planningDays: 4 };
  // 10/2〜10/3 の2日間（終わりは 10/4 0:00）
  const trip = { id: "trip", title: "帰省", start: jst(2026, 10, 2), end: jst(2026, 10, 4), allDay: true };

  it("「家にいない」にした日は外出の日になり、自炊をせず、食事も置かない", () => {
    const r = plan(baseInput(now, { settings, events: [{ ...trip, awayFromHome: true }], habits: [cook, dinner] }));
    expect(r.dayEnergy.map((d) => d.outingDay)).toEqual([false, true, true, false]);
    const cookDays = r.blocks.filter((b) => b.refId === "cook").map((b) => new Date(b.start + 9 * 3600e3).getUTCDate());
    expect(cookDays).toEqual([1, 4]);
    const dinners = r.blocks.filter((b) => b.refId === "dinner").map((b) => b.title);
    expect(dinners).toEqual(["夕食", "夕食"]);
  });

  it("印がない終日の予定（誕生日など）は、ふだんどおり", () => {
    const r = plan(baseInput(now, { settings, events: [trip], habits: [cook] }));
    expect(r.dayEnergy.every((d) => !d.outingDay)).toBe(true);
    expect(r.blocks.filter((b) => b.refId === "cook")).toHaveLength(4);
  });
});

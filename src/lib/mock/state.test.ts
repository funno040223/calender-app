import { describe, expect, it } from "vitest";
import { jst } from "@/lib/scheduler/test-helpers";
import { fromStoredV2, learnedMinutes, planTagsOf, rainyDayKeys, replan, sampleData, travelAsks } from "./state";

describe("終わったタスクの枠", () => {
  it("未回答の枠は時間が過ぎても残り時間から引かない", () => {
    const now = jst(2026, 10, 1, 12);
    const base = sampleData(now);
    const task = { id: "t-report", title: "レポート", durationMinutes: 180, priority: 2 as const };
    const block = { kind: "task" as const, refId: task.id, title: task.title, start: jst(2026, 10, 1, 9), end: jst(2026, 10, 1, 10) };
    const s1 = replan({ ...base, tasks: [task], blocks: [block] }, [], now);
    expect(s1.tasks[0].remainingMinutes).toBeUndefined();
    const s2 = replan({ ...s1, blocks: [...s1.blocks, block] }, [], now + 60_000);
    expect(s2.tasks[0].remainingMinutes).toBeUndefined();
  });
});

describe("移動時間を聞く取り込んだ予定", () => {
  it("場所もメモもなく、まだ答えていない7日先までの予定だけ", () => {
    const now = jst(2026, 10, 1, 12);
    const ev = (id: string, over = {}) => ({ id, title: id, start: jst(2026, 10, 2, 13), end: jst(2026, 10, 2, 17), ...over });
    const googleEvents = [
      ev("ask"),
      ev("loc", { location: "大学" }),
      ev("memo", { description: "移動30" }),
      ev("answered"),
      ev("allday", { allDay: true }),
      ev("far", { start: jst(2026, 10, 20, 13), end: jst(2026, 10, 20, 14) }),
    ];
    expect(travelAsks({ googleEvents, importedTravel: { answered: 30 } }, now).map((e) => e.id)).toEqual(["ask"]);
  });
});

describe("実績からの所要時間の目安", () => {
  it("終わったタスクの、終わった枠の長さの中央値。3件以上で目安にする", () => {
    const log = (id: string, h: number, len: number) => ({
      [`${id}:${h}`]: { title: id, start: h * 3600_000, end: h * 3600_000 + len * 60_000, counted: true },
    });
    const done = (id: string) => ({ id, title: id, tagId: "tag-focus", doneAt: 0 });
    const data = {
      tags: sampleData(0).tags,
      doneTasks: [done("a"), done("b")],
      taskBlockLog: { ...log("a", 1, 60), ...log("a", 3, 60), ...log("b", 5, 180) },
    };
    expect(learnedMinutes(data)["tag-focus"]).toEqual({ minutes: 150, samples: 2 });
    expect(planTagsOf(data).find((t) => t.id === "tag-focus")?.defaultMinutes).toBe(90);
    const three = { ...data, doneTasks: [...data.doneTasks, done("c")], taskBlockLog: { ...data.taskBlockLog, ...log("c", 7, 240) } };
    expect(planTagsOf(three).find((t) => t.id === "tag-focus")?.defaultMinutes).toBe(180);
  });
});

describe("雨の日", () => {
  it("予報の雨の確率が60%以上の日と、手で雨にした日。晴れたので戻した日は除く", () => {
    const got = rainyDayKeys({
      rainyDays: ["2026-10-03"],
      notRainyDays: ["2026-10-02"],
      rainForecast: { fetchedAt: 0, days: { "2026-10-01": 70, "2026-10-02": 80, "2026-10-04": 30 } },
    });
    expect(got.sort()).toEqual(["2026-10-01", "2026-10-03"]);
  });
});

it("散歩・自己成長・片付け・洗濯・自炊を「記録する」にする（1回だけ）", () => {
  const now = Date.UTC(2026, 9, 1, 3);
  const old = { ...sampleData(now), migrations: [] as string[] };
  old.habits = old.habits.map((h) => ({ ...h, track: h.id === "habit-home-exercise" ? true : undefined }));
  const d = fromStoredV2(old, now)!;
  const tracked = d.habits.filter((h) => h.track).map((h) => h.id).sort();
  expect(tracked).toEqual([
    "habit-bath",
    "habit-breakfast",
    "habit-cook-dinner",
    "habit-cook-lunch",
    "habit-dinner",
    "habit-growth",
    "habit-home-exercise",
    "habit-laundry",
    "habit-lunch",
    "habit-tidy",
    "habit-walk",
  ]);
  // 自分でオフにしたあとは、もう一度オンにしない
  const off = { ...d, habits: d.habits.map((h) => (h.id === "habit-walk" ? { ...h, track: undefined } : h)) };
  expect(fromStoredV2(off, now)!.habits.find((h) => h.id === "habit-walk")?.track).toBeUndefined();
});

describe("2026-10-01 の生活に合わせた移し替え", () => {
  it("初期値のままの朝ルーティン・楽しみ・場所を置き換え、月曜3・4限を入れ、自分で変えたものはそのまま", async () => {
    const { fromStoredV2, sampleData } = await import("./state");
    const old = {
      ...sampleData(Date.now()),
      migrations: [],
      courses: [],
      routineSteps: ["step-curtain", "step-water", "step-wash-face", "step-stretch", "step-check-plan"].map((id) => ({ id, title: id })),
      treats: [{ id: "mine", name: "自分で足したもの", category: "food" as const }],
      places: [{ id: "place-univ", name: "大学", keywords: ["大学", "キャンパス"], travelMinutes: 12 }],
      settings: { ...sampleData(Date.now()).settings, routineMinutes: 15 },
      rewardRates: { ...sampleData(Date.now()).rewardRates, wake: 30 },
    };
    const d = fromStoredV2(JSON.parse(JSON.stringify(old)), Date.now())!;
    expect(d.routineSteps.map((s) => s.id)).toEqual(["step-stretch-bed", "step-curtain", "step-water"]);
    expect(d.settings.routineMinutes).toBe(10);
    expect(d.treats.map((t) => t.id)).toEqual(["mine"]);
    expect(d.places[0]).toMatchObject({ name: "本郷キャンパス", travelMinutes: 12 });
    expect(d.courses.map((c) => [c.name, c.weekday, c.startMinute, c.termStart, c.termEnd])).toEqual([["月3・4限の授業", 1, 13 * 60, "2026-10-02", "2027-02-04"]]);
    expect(d.rewardRates.wake).toBe(50);
  });
});

it("10/1 の朝ルーティンのままなら「好きな飲み物を作る」を外す。自分で変えた朝ルーティンはそのまま", () => {
  const now = Date.UTC(2026, 9, 1, 3);
  const withDrink = [
    { id: "step-stretch-bed", title: "布団の中で大きく伸びをして起き上がる" },
    { id: "step-curtain", title: "カーテンを開けて光を浴びる" },
    { id: "step-water", title: "水を1杯飲む" },
    { id: "step-drink", title: "好きな飲み物を作る" },
  ];
  const old = { ...sampleData(now), routineSteps: withDrink, migrations: sampleData(now).migrations.filter((m) => m !== "2026-10-01-routine-no-drink") };
  expect(fromStoredV2(old, now)!.routineSteps.map((s) => s.id)).toEqual(["step-stretch-bed", "step-curtain", "step-water"]);
  const own = { ...old, routineSteps: [...withDrink, { id: "mine", title: "ストレッチ" }] };
  expect(fromStoredV2(own, now)!.routineSteps).toHaveLength(5);
});

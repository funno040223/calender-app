import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS, type DayPlan } from "@/lib/scheduler";
import { jst } from "@/lib/scheduler/test-helpers";
import { buildNotices, type NoticeInput } from "./build";

const day = (d: number, wakeH: number, bedH: number): DayPlan => ({
  dayStart: jst(2026, 10, d),
  wake: jst(2026, 10, d, wakeH),
  bed: jst(2026, 10, d, bedH),
  wakeSource: "default",
  holiday: false,
});

function input(overrides: Partial<NoticeInput> = {}): NoticeInput {
  return {
    now: jst(2026, 10, 1, 6),
    result: { dayPlans: [day(1, 8, 25), day(2, 8, 25), day(3, 8, 25)], blocks: [], shortfalls: [] },
    events: [],
    places: [{ id: "p1", name: "大学", keywords: ["キャンパス"], travelMinutes: 45 }],
    settings: DEFAULT_SETTINGS,
    ...overrides,
  };
}

describe("buildNotices", () => {
  it("在宅の予定は15分前、外出の予定は家を出る15分前に知らせる", () => {
    const home = { id: "a", title: "オンライン面談", start: jst(2026, 10, 1, 13), end: jst(2026, 10, 1, 14) };
    const away = { id: "b", title: "ゼミ", start: jst(2026, 10, 1, 16), end: jst(2026, 10, 1, 17), location: "キャンパス" };
    const got = buildNotices(input({ events: [home, away] })).filter((n) => n.key.startsWith("event:"));
    expect(got.map((n) => n.at)).toEqual([jst(2026, 10, 1, 12, 45), jst(2026, 10, 1, 15)]);
    expect(got[1].title).toBe("15:15 に出発：ゼミ");
  });

  it("習慣とタスクの枠は始まりに知らせ、朝ルーティンは知らせない", () => {
    const blocks = [
      { kind: "routine" as const, refId: "r", title: "朝ルーティン", start: jst(2026, 10, 1, 8), end: jst(2026, 10, 1, 8, 15) },
      { kind: "task" as const, refId: "t1", title: "レポート", start: jst(2026, 10, 1, 10), end: jst(2026, 10, 1, 11) },
    ];
    const got = buildNotices(input({ result: { ...input().result, blocks } })).filter((n) => n.key.startsWith("block:"));
    expect(got).toHaveLength(1);
    expect(got[0]).toMatchObject({ at: jst(2026, 10, 1, 10), title: "レポート", body: "10:00〜11:00" });
  });

  it("きっかけのある習慣は「まず5分」と知らせる", () => {
    const blocks = [{ kind: "habit" as const, refId: "h1", title: "ストレッチ", start: jst(2026, 10, 1, 13, 5), end: jst(2026, 10, 1, 13, 10) }];
    const habits = [{ id: "h1", cue: { type: "habit" as const, habitId: "lunch" }, track: true }];
    const [n] = buildNotices(input({ result: { ...input().result, blocks }, habits })).filter((x) => x.key.startsWith("block:"));
    expect(n).toMatchObject({ at: jst(2026, 10, 1, 13, 5), title: "ストレッチ", body: "まず5分" });
  });

  it("連絡してみる日は、朝のまとめに添える", () => {
    const got = buildNotices(input({ contactDays: [jst(2026, 10, 2)] })).filter((n) => n.key.startsWith("morning:"));
    expect(got.find((n) => n.at === jst(2026, 10, 2, 8))?.body).toContain("連絡してみる？");
    expect(got.find((n) => n.at === jst(2026, 10, 1, 8))?.body).not.toContain("連絡してみる？");
  });

  it("毎朝、起床の時刻にまとめを送る", () => {
    const ev = { id: "a", title: "授業", start: jst(2026, 10, 2, 10, 40), end: jst(2026, 10, 2, 12, 10) };
    const got = buildNotices(input({ events: [ev] })).filter((n) => n.key.startsWith("morning:"));
    expect(got.map((n) => n.at)).toEqual([jst(2026, 10, 1, 8), jst(2026, 10, 2, 8)]);
    expect(got[1].body).toContain("予定1件（最初は 10:40 授業）");
  });

  it("人に会う日は、身支度を始める時刻に知らせる", () => {
    const d1 = { ...day(1, 8, 25), prep: true, leave: jst(2026, 10, 1, 9, 30) };
    const got = buildNotices(input({ result: { dayPlans: [d1, day(2, 8, 25), day(3, 8, 25)], blocks: [], shortfalls: [] } }));
    const prep = got.filter((n) => n.key.startsWith("prep:"));
    expect(prep.map((n) => [n.at, n.body])).toEqual([[jst(2026, 10, 1, 8, 50), "出発 9:30"]]);
  });

  it("タスクは枠ごとの終了時に進捗を確認する", () => {
    const t = (id: string, h: number) => ({ kind: "task" as const, refId: id, title: "レポート", start: jst(2026, 10, 1, h), end: jst(2026, 10, 1, h + 1) });
    const blocks = [t("a", 10), t("a", 14), t("b", 16), { ...t("a", 11), start: jst(2026, 10, 2, 11), end: jst(2026, 10, 2, 12) }];
    const got = buildNotices(input({ result: { ...input().result, blocks } })).filter((n) => n.key.startsWith("check:"));
    expect(got.map((n) => n.at)).toEqual([jst(2026, 10, 1, 11), jst(2026, 10, 1, 15), jst(2026, 10, 1, 17), jst(2026, 10, 2, 12)]);
    expect(got[0].body).toBe("どのくらい進んだ？");
  });

  it("移動時間が分からない予定は、すぐに1回だけ聞く", () => {
    const got = buildNotices(input({ now: jst(2026, 10, 1, 9), travelAsks: [{ id: "g1", title: "富士通", start: jst(2026, 10, 1, 13) }] })).filter((n) => n.key.startsWith("travel:"));
    expect(got).toHaveLength(1);
    expect(got[0]).toMatchObject({ key: "travel:g1", at: jst(2026, 10, 1, 9, 1), title: "移動時間は？" });
    expect(got[0].body).toContain("富士通");
  });

  it("Apple Watch の充電は就寝の2時間前、帰宅がそれより遅い日は帰宅の時刻に", () => {
    const late = { ...day(2, 8, 25), homeAt: jst(2026, 10, 2, 23, 30) };
    const got = buildNotices(input({ result: { ...input().result, dayPlans: [day(1, 8, 25), late, day(3, 8, 25)] } })).filter((n) => n.key.startsWith("watch:"));
    expect(got.map((n) => n.at)).toEqual([jst(2026, 10, 1, 23), jst(2026, 10, 2, 23, 30)]);
  });

  it("就寝の3時間前にタバコの区切り、30分前に寝る準備を送る", () => {
    const got = buildNotices(input()).filter((n) => /^(smoke|bedprep):/.test(n.key));
    expect(got.map((n) => [n.key.split(":")[0], n.at])).toEqual([
      ["smoke", jst(2026, 10, 1, 22)],
      ["bedprep", jst(2026, 10, 2, 0, 30)],
      ["smoke", jst(2026, 10, 2, 22)],
      ["bedprep", jst(2026, 10, 3, 0, 30)],
    ]);
  });

  it("外出した日は帰宅の時刻に体力を聞き、答えたあとは聞かない", () => {
    const days = [{ ...day(1, 8, 25), homeAt: jst(2026, 10, 1, 18) }, day(2, 8, 25), day(3, 8, 25)];
    const ask = (dayEnergy?: { dayStart: number; used: number; budget: number; outingDay: boolean; evening?: "low" }[]) =>
      buildNotices(input({ result: { dayPlans: days, blocks: [], shortfalls: [], dayEnergy } })).filter((n) => n.key.startsWith("home:"));
    expect(ask().map((n) => n.at)).toEqual([jst(2026, 10, 1, 18)]);
    expect(ask([{ dayStart: jst(2026, 10, 1), used: 5, budget: 10, outingDay: true, evening: "low" }])).toEqual([]);
  });

  it("就寝から次の起床までと、過ぎた時刻と、48時間より先は送らない", () => {
    const events = [
      { id: "late", title: "夜の配信", start: jst(2026, 10, 2, 2), end: jst(2026, 10, 2, 3) },
      { id: "past", title: "もう始まった", start: jst(2026, 10, 1, 6, 10), end: jst(2026, 10, 1, 7) },
      { id: "far", title: "先の予定", start: jst(2026, 10, 3, 12), end: jst(2026, 10, 3, 13) },
      { id: "allday", title: "終日", start: jst(2026, 10, 1), end: jst(2026, 10, 2), allDay: true },
    ];
    expect(buildNotices(input({ events })).filter((n) => n.key.startsWith("event:"))).toEqual([]);
  });
});

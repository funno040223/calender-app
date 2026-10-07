import { describe, expect, it } from "vitest";
import { jst } from "@/lib/scheduler/test-helpers";
import { DAY_MS } from "./jst";
import { dateKeyOf, DEFAULT_REWARD_RATES } from "./model";
import { DATA_KEYS, fromStoredV2, replan, sampleData, toData } from "./state";
import { bankRewards, rewardBalance, rewardEarned } from "./stats";

const now = jst(2026, 10, 3, 12);

describe("保存項目の一覧・読み込み・見本が、そろっている", () => {
  it("見本のデータは、保存項目をすべて持つ（なくてよいのは、あとから設定で入る3つだけ）", () => {
    const optional = ["weatherPlace", "notion", "rainForecast"];
    expect(Object.keys(sampleData(now)).sort()).toEqual(DATA_KEYS.filter((k) => !optional.includes(k)).sort());
  });

  it("保存して読み直しても、保存項目が欠けない", () => {
    const stored = JSON.parse(JSON.stringify(toData(sampleData(now))));
    const loaded = fromStoredV2(stored, now)!;
    for (const k of Object.keys(sampleData(now))) expect(Object.keys(loaded)).toContain(k);
  });
});

describe("ご褒美の残高は、記録の保存期限が切れても減らない", () => {
  const withLogs = () => {
    const d = sampleData(now);
    const old = jst(2026, 7, 1);
    return {
      ...d,
      rewardRates: DEFAULT_REWARD_RATES,
      taskBlockLog: { "t:1": { title: "レポート", start: old, end: old + 3600_000, doneAt: old + 1800_000 } },
      wakeLogs: [{ date: dateKeyOf(old), wokeAt: old, plannedWake: old, routineDoneAt: old + 600_000, doneStepIds: [] }],
    };
  };

  it("3週間より前の分は繰り越しに入り、記録が消えても合計が同じ", () => {
    const d = withLogs();
    const before = rewardEarned(d);
    expect(before).toBeGreaterThan(0);
    const banked = { ...d, rewardBank: bankRewards(d, now) };
    expect(rewardEarned(banked)).toBe(before);
    // 記録のほうは消える
    const expired = { ...banked, taskBlockLog: {}, wakeLogs: [] };
    expect(rewardEarned(expired)).toBe(before);
    expect(rewardBalance(expired)).toBe(before);
  });

  it("金額の設定を変えても、繰り越した分は変わらない", () => {
    const d = withLogs();
    const banked = { ...d, rewardBank: bankRewards(d, now) };
    const before = rewardEarned(banked);
    expect(rewardEarned({ ...banked, rewardRates: { ...DEFAULT_REWARD_RATES, task: 9999 } })).toBe(before);
  });

  it("繰り越しは二重に数えない（もう一度繰り越しても同じ）", () => {
    const d = withLogs();
    const once = bankRewards(d, now);
    const again = bankRewards({ ...d, rewardBank: once }, now + DAY_MS);
    expect(rewardEarned({ ...d, rewardBank: again })).toBe(rewardEarned(d));
  });

  it("組み直すたびに繰り越され、保存して読み直しても残る", () => {
    const d = withLogs();
    const state = replan(d, [], now);
    expect(state.rewardBank.until).toBeGreaterThan(0);
    const loaded = fromStoredV2(JSON.parse(JSON.stringify(toData(state))), now)!;
    expect(loaded.rewardBank).toEqual(state.rewardBank);
  });
});

describe("古い記録を畳む", () => {
  it("400日より前の記録を捨て、新しいものと、ご褒美の合計は残る", async () => {
    const { pruneOldLogs } = await import("./state");
    const d = sampleData(now);
    const old = now - 500 * DAY_MS;
    const recent = now - 10 * DAY_MS;
    const data = { ...d, habitLogs: { [dateKeyOf(old)]: { a: "done" as const }, [dateKeyOf(recent)]: { a: "done" as const } }, smokeLogs: [old, recent] };
    const out = pruneOldLogs(data, now);
    expect(Object.keys(out.habitLogs)).toEqual([dateKeyOf(recent)]);
    expect(out.smokeLogs).toEqual([recent]);
    expect(pruneOldLogs(out, now)).toBe(out);
  });
});

describe("東大の暦の、年度の切れ目", () => {
  it("2026年度のAセメスターは 2027-02-04 までで、そのあとは授業を作らず、学期の初期値もない", async () => {
    const { buildClassEvents } = await import("./model");
    const { UTOKYO_PERIODS, UTOKYO_TERMS, currentSemester } = await import("./utokyo");
    const a = UTOKYO_TERMS.find((t) => t.id === "2026-A")!;
    expect(a.end).toBe("2027-02-04");
    const course = { id: "c", name: "ゼミ", weekday: 4, period: 2, termStart: a.start, termEnd: a.end, optional: false, cancelledDates: [], attendedDates: [] };
    const dates = buildClassEvents([course], UTOKYO_PERIODS).map((e) => e.date);
    expect(dates.at(-1)! <= "2027-02-04").toBe(true);
    expect(currentSemester("2027-02-04")?.id).toBe("2026-A");
    // 暦が切れた日。翌年度の暦を足すまでは、学期の初期値がない（呼ぶ側が今日から15週にする）
    expect(currentSemester("2027-02-05")).toBeUndefined();
  });
});

describe("天気", () => {
  it("1日より古い予報は、雨の日に使わない。手で雨にした日は残る", async () => {
    const { rainyDayKeys } = await import("./state");
    const data = { rainyDays: ["2026-10-05"], notRainyDays: [], rainForecast: { fetchedAt: now - 2 * 60 * 60_000, days: { "2026-10-04": 80 } } };
    expect(rainyDayKeys(data, now)).toEqual(["2026-10-05", "2026-10-04"]);
    expect(rainyDayKeys({ ...data, rainForecast: { ...data.rainForecast, fetchedAt: now - 25 * 60 * 60_000 } }, now)).toEqual(["2026-10-05"]);
  });
});

describe("新しいアカウント（見本）の初期値", () => {
  it("朝ルーティン10分・起床のご褒美50円で始まる", () => {
    const d = sampleData(now);
    expect(d.settings.routineMinutes).toBe(10);
    expect(d.rewardRates.wake).toBe(50);
  });
});

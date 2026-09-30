import { describe, expect, it } from "vitest";
import { parseSleepBody, parseTime, sleepKind, summarizeSleep } from "./sleep";

const jst = (d: number, h: number, mi = 0) => Date.UTC(2026, 9, d, h - 9, mi);

describe("ヘルスケアの睡眠を読む", () => {
  it("時刻は ISO 8601 と、タイムゾーンのない日本の書き方を読む", () => {
    expect(parseTime("2026-10-01T02:13:00+09:00")).toBe(jst(1, 2, 13));
    expect(parseTime("2026/10/01 2:13")).toBe(jst(1, 2, 13));
    expect(parseTime("2026年10月1日 2:13")).toBe(jst(1, 2, 13));
    expect(parseTime("きのう")).toBeUndefined();
  });

  it("値は日本語・英語・数字のどれでも分ける", () => {
    expect(sleepKind("睡眠中（コア）")).toBe("asleep");
    expect(sleepKind("レム")).toBe("asleep");
    expect(sleepKind("ベッドにいる")).toBe("inBed");
    expect(sleepKind("覚醒")).toBe("awake");
    expect(sleepKind("Deep")).toBe("asleep");
    expect(sleepKind(2)).toBe("awake");
    expect(sleepKind("4")).toBe("asleep");
    expect(sleepKind("歩数")).toBeUndefined();
  });

  it("JSON の lines・そのままの行・{start,end,value} の並びを読み、読めない行は捨てる", () => {
    const lines = "2026-10-01T02:10:00+09:00|2026-10-01T04:00:00+09:00|コア\nこわれた行\n2026-10-01T04:00:00+09:00|2026-10-01T04:05:00+09:00|覚醒";
    expect(parseSleepBody(JSON.stringify({ lines }))).toHaveLength(2);
    expect(parseSleepBody(lines)).toHaveLength(2);
    expect(parseSleepBody(JSON.stringify({ samples: [{ start: "2026-10-01T02:10:00+09:00", end: "2026-10-01T04:00:00+09:00", value: 3 }] }))).toHaveLength(1);
  });
});

describe("夜ごとにまとめる", () => {
  it("途中で目が覚めた時間を除き、重なった記録は1回に数え、起きた日の夜にする", () => {
    const samples = [
      { start: jst(1, 2, 10), end: jst(1, 5), kind: "asleep" as const },
      // Apple Watch と iPhone の重なり
      { start: jst(1, 4), end: jst(1, 5), kind: "asleep" as const },
      { start: jst(1, 5), end: jst(1, 5, 20), kind: "awake" as const },
      { start: jst(1, 5, 20), end: jst(1, 8, 50), kind: "asleep" as const },
      { start: jst(1, 1, 40), end: jst(1, 9), kind: "inBed" as const },
    ];
    expect(summarizeSleep(samples)).toEqual([{ night: "2026-10-01", start: jst(1, 2, 10), end: jst(1, 8, 50), minutes: 170 + 210 }]);
  });

  it("昼寝（2時間より短い眠り）は夜にしない", () => {
    const samples = [
      { start: jst(1, 2), end: jst(1, 9), kind: "asleep" as const },
      { start: jst(1, 14), end: jst(1, 14, 40), kind: "asleep" as const },
    ];
    expect(summarizeSleep(samples).map((n) => n.minutes)).toEqual([420]);
  });
});

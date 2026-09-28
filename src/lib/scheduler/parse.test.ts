import { describe, expect, it } from "vitest";
import { parseQuickAdd } from "./parse";
import { jst } from "./test-helpers";

// 2026-09-28（月）の正午
const now = jst(2026, 9, 28, 12);
const parse = (text: string) => parseQuickAdd(text, now, 540);

describe("クイック追加の読み取り", () => {
  it("曜日の締切と所要時間", () => {
    expect(parse("金曜までにレポート、3時間くらい")).toEqual({
      title: "レポート",
      deadline: jst(2026, 10, 3),
      durationMinutes: 180,
      priority: undefined,
    });
  });

  it("明日と分", () => {
    const r = parse("明日 買い物 30分");
    expect(r.title).toBe("買い物");
    expect(r.deadline).toBe(jst(2026, 9, 30));
    expect(r.durationMinutes).toBe(30);
  });

  it("日付と優先度", () => {
    const r = parse("10/5 課題提出 至急");
    expect(r.title).toBe("課題提出");
    expect(r.deadline).toBe(jst(2026, 10, 6));
    expect(r.priority).toBe(3);
  });

  it("「1時間半」", () => {
    expect(parse("1時間半 読書").durationMinutes).toBe(90);
  });

  it("来週の曜日", () => {
    expect(parse("来週の水曜 面談準備").deadline).toBe(jst(2026, 10, 8));
  });

  it("全角数字", () => {
    expect(parse("１０月５日までに課題").deadline).toBe(jst(2026, 10, 6));
  });

  it("何も読み取れなければ全文がタスク名", () => {
    expect(parse("部屋の掃除")).toEqual({ title: "部屋の掃除", deadline: undefined, durationMinutes: undefined, priority: undefined });
  });
});

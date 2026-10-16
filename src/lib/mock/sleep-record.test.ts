import { describe, expect, it } from "vitest";
import { jst } from "@/lib/scheduler/test-helpers";
import { manualSleeps } from "./bedtime";
import { DAY_MS, MIN } from "./jst";
import type { MockData } from "./model";
import { nightOf, pressBed, recordUp, upOnTime } from "./night";
import { resetRhythm } from "./recovery";
import { fromStoredV2, keepLocalSleep, replan, sampleData, toData } from "./state";

/** 2026-10-12 の眠りの記録の見直し（古い版の保存・読み込みの上限） */
const base = (now: number): MockData => ({
  ...sampleData(now),
  courses: [],
  tasks: [],
  habits: [],
  events: [],
  blocks: [],
  settings: { ...sampleData(now).settings, sleepMinutes: 420 },
});
const wake = (start: number, end: number) => ({ id: "r", mode: "woke" as const, start, end });

describe("昼寝の記録はなくした", () => {
  it("その日にまだ起きた記録がなければ、起きたところはその日の眠り（寝坊）として起床を動かす", () => {
    const now = jst(2026, 10, 1, 14, 10);
    const state = replan(resetRhythm(base(now), wake(jst(2026, 10, 1, 3), jst(2026, 10, 1, 14)), now), [], now);
    expect(state.result.dayPlans.find((x) => x.dayStart === jst(2026, 10, 1))!.wake).toBe(jst(2026, 10, 1, 14));
  });

  it("前の版で保存した昼寝（nap）は読まずに捨てる", () => {
    const now = jst(2026, 10, 6, 12);
    const night = { id: "2026-10-05", date: "2026-10-05", up: { at: jst(2026, 10, 5, 9), source: "button" } };
    const napLog = { id: "2026-10-05:x", date: "2026-10-05", nap: true, bed: { at: jst(2026, 10, 5, 14), source: "reset" }, until: jst(2026, 10, 5, 15) };
    const d = fromStoredV2({ ...toData(base(now)), sleepLogs: [night, napLog, { ...night, id: "2026-10-04", date: "2026-10-04", nap: false }] }, now)!;
    expect(d.sleepLogs.map((x) => x.id)).toEqual(["2026-10-04", "2026-10-05"]);
    expect(d.sleepLogs.every((x) => !("nap" in x))).toBe(true);
  });

  it("以前の形の立て直しで、その朝起きたあとに入れたもの（昼寝）は移さず、夜の記録を置き換えない", () => {
    const now = jst(2026, 10, 6, 12);
    const row = {
      ...JSON.parse(JSON.stringify(base(now))),
      sleepLogs: undefined,
      wakeLogs: [{ date: "2026-10-05", doneStepIds: [], wokeAt: jst(2026, 10, 5, 9) }],
      rhythmResets: [{ id: "r", mode: "woke", start: jst(2026, 10, 5, 14), end: jst(2026, 10, 5, 15) }],
    };
    const d = fromStoredV2(row, now)!;
    expect(nightOf(d, "2026-10-05").up).toEqual({ at: jst(2026, 10, 5, 9), source: "button" });
    expect(d.sleepLogs).toHaveLength(1);
  });
});

describe("ヘルスケアの目覚めは「もう起きていた」に数えない（目が覚めても起き上がったとは限らない）", () => {
  const health = { "2026-10-01": { start: jst(2026, 10, 1, 1), end: jst(2026, 10, 1, 7), minutes: 360 } };
  it("時計が 7:00 の目覚めを記録した朝でも、起きたところ 7:30〜11:00 は寝坊として起床を 11:00 にする", () => {
    const now = jst(2026, 10, 1, 11, 10);
    const d = { ...base(now), healthSleep: health };
    const after = resetRhythm(d, wake(jst(2026, 10, 1, 7, 30), jst(2026, 10, 1, 11)), now);
    expect(nightOf(after, "2026-10-01").up).toEqual({ at: jst(2026, 10, 1, 11), source: "manual" });
    expect(replan(after, [], now).result.dayPlans.find((x) => x.dayStart === jst(2026, 10, 1))!.wake).toBe(jst(2026, 10, 1, 11));
  });
  it("以前の形から移すときも同じ", () => {
    const now = jst(2026, 10, 6, 12);
    const row = {
      ...JSON.parse(JSON.stringify(base(now))),
      sleepLogs: undefined,
      healthSleep: health,
      rhythmResets: [{ id: "r", mode: "woke", start: jst(2026, 10, 1, 7, 30), end: jst(2026, 10, 1, 11) }],
    };
    const d = fromStoredV2(row, now)!;
    expect(nightOf(d, "2026-10-01").up?.at).toBe(jst(2026, 10, 1, 11));
  });
});

describe("以前の形からの移し方", () => {
  it("立て直しで入れた起床の朝は、計画の控えから予定の起床・就寝を補い、予定どおり起きたに数えられる", () => {
    const now = jst(2026, 10, 6, 12);
    const row = {
      ...JSON.parse(JSON.stringify(base(now))),
      sleepLogs: undefined,
      dayLogs: { "2026-10-02": { events: 0, away: false, habits: [], meals: {}, bed: jst(2026, 10, 3, 2) } },
      rhythmResets: [{ id: "r", mode: "woke", start: jst(2026, 10, 3, 2, 30), end: jst(2026, 10, 3, 9, 10) }],
    };
    const n = nightOf(fromStoredV2(row, now)!, "2026-10-03");
    expect(n.plannedBed).toBe(jst(2026, 10, 3, 2));
    expect(n.plannedWake).toBe(jst(2026, 10, 3, 9));
    expect(upOnTime(n)).toBe(true);
  });
});

describe("以前の版が保存した行", () => {
  it("眠りの記録がない行を読んでも、この端末の眠りの記録のうち行にない夜を残す", () => {
    const now = jst(2026, 10, 6, 12);
    const local = { ...base(now), sleepLogs: pressBed([], "2026-10-05", jst(2026, 10, 4, 23), jst(2026, 10, 5)) };
    const oldRow = { ...toData(base(now)) } as Record<string, unknown>;
    delete oldRow.sleepLogs;
    const loaded = fromStoredV2(oldRow, now)!;
    expect(keepLocalSleep(oldRow, loaded, local).sleepLogs).toEqual(local.sleepLogs);
    // 今の版が保存した行（消した記録も含めて行のとおり）はそのまま
    const newRow = toData(base(now));
    const fresh = fromStoredV2(newRow, now)!;
    expect(keepLocalSleep(newRow, fresh, local)).toBe(fresh);
  });

  it("行にも同じ夜があれば、寝た・起きた時刻ごとにあとから記録したほう", () => {
    const now = jst(2026, 10, 6, 12);
    const oldRow = {
      ...toData(base(now)),
      wakeLogs: [{ date: "2026-10-05", doneStepIds: [], wokeAt: jst(2026, 10, 5, 9) }],
      bedLogs: { "2026-10-04": { at: jst(2026, 10, 4, 23, 30), plannedBed: jst(2026, 10, 5) } },
    } as Record<string, unknown>;
    delete oldRow.sleepLogs;
    // この端末：同じ夜の起床を「いつ起きた？」で 8:30 に直した（あとから記録）
    const logs = recordUp(pressBed([], "2026-10-05", jst(2026, 10, 4, 23), jst(2026, 10, 5)), "2026-10-05", jst(2026, 10, 5, 8, 30), "picked", undefined, jst(2026, 10, 5, 10));
    const got = keepLocalSleep(oldRow, fromStoredV2(oldRow, now)!, { sleepLogs: logs });
    const n = nightOf(got, "2026-10-05");
    expect(n.up?.at).toBe(jst(2026, 10, 5, 8, 30));
    // 寝た時刻はどちらも記録した時刻が分からない「寝る」なので、寝た時刻の遅い行のほう
    expect(n.bed?.at).toBe(jst(2026, 10, 4, 23, 30));
  });
});

describe("読み込みと組み直しの上限", () => {
  it("日付の形が違う記録は読まず、多すぎる記録は新しいほうだけ読む", () => {
    const now = jst(2026, 10, 6, 12);
    const many = Array.from({ length: 600 }, (_, i) => {
      const date = new Date(jst(2025, 1, 1) + i * DAY_MS + 9 * 3600_000).toISOString().slice(0, 10);
      return { id: date, date, up: { at: jst(2025, 1, 1) + i * DAY_MS + 8 * 60 * MIN, source: "button" } };
    });
    const row = { ...toData(base(now)), sleepLogs: [...many, { id: "x", date: "10/06", up: { at: now, source: "button" } }] };
    const got = fromStoredV2(row, now)!.sleepLogs;
    expect(got).toHaveLength(500);
    expect(got.some((s) => s.date === "10/06")).toBe(false);
    expect(got.at(-1)?.date).toBe(many.at(-1)!.date);
  });

  it("60日より前に終わった立て直しは、組み直しに使わない", () => {
    const now = jst(2026, 10, 6, 12);
    const old = resetRhythm(base(now), wake(jst(2026, 7, 1, 3), jst(2026, 7, 1, 10)), jst(2026, 7, 1, 10));
    const recent = resetRhythm(old, wake(jst(2026, 10, 5, 3), jst(2026, 10, 5, 10)), jst(2026, 10, 5, 10));
    expect(manualSleeps(recent, now).map((r) => r.end)).toEqual([jst(2026, 10, 5, 10)]);
  });
});

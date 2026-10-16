import { describe, expect, it } from "vitest";
import { jst } from "@/lib/scheduler/test-helpers";
import { fromStoredV2, sampleData, toData } from "./state";
import { allNights, bedOnTimeOf, nightOf, upOnTime, wakeStreak } from "./night";
import { bedNights, periodStats, rewardBreakdown } from "./stats";

/**
 * 2026-10-12：寝た・起きた時刻を眠りの記録（sleepLogs）にまとめた。
 * 以前の形（bedLogs・wakeLogs の起きた時刻と予定の起床・立て直しの sleep と woke）で保存された行を読んでも、
 * 夜の記録・予定どおり起きた／寝た・ご褒美・連続日数が、移す前と同じになること
 */
const now = jst(2026, 10, 6, 12);

function oldRow() {
  const s = sampleData(now);
  const raw = {
    ...s,
    // 移す前の版で保存した行
    migrations: s.migrations.filter((m) => m !== "2026-10-12-sleep-logs"),
    rewardBank: { until: 0, yen: { wake: 0, routine: 0, bed: 0, habit: 0, task: 0, log: 0 } },
    dayLogs: { "2026-10-03": { events: 0, away: false, habits: [], meals: {}, bed: jst(2026, 10, 4) } },
    healthSleep: { "2026-10-02": { start: jst(2026, 10, 2, 1), end: jst(2026, 10, 2, 8), minutes: 400 } },
    bedLogs: {
      "2026-09-30": { at: jst(2026, 9, 30, 23, 40), plannedBed: jst(2026, 10, 1) },
      "2026-10-02": { at: jst(2026, 10, 3, 1, 30), plannedBed: jst(2026, 10, 3) },
      "2026-10-05": { at: jst(2026, 10, 5, 23), plannedBed: jst(2026, 10, 6) },
    },
    wakeLogs: [
      { date: "2026-10-01", doneStepIds: [], wokeAt: jst(2026, 10, 1, 8, 50), wokeRecordedAt: jst(2026, 10, 1, 8, 50), plannedWake: jst(2026, 10, 1, 9), fatigue: 2 },
      { date: "2026-10-02", doneStepIds: ["a"], routineStartedAt: jst(2026, 10, 2, 9, 40), plannedWake: jst(2026, 10, 2, 9) },
      { date: "2026-10-03", doneStepIds: [], wokeAt: jst(2026, 10, 3, 11), plannedWake: jst(2026, 10, 3, 9) },
      { date: "2026-10-04", doneStepIds: [], wokeAt: jst(2026, 10, 4, 8, 20), plannedWake: jst(2026, 10, 4, 8), sleepMinutes: 380 },
    ],
    rhythmResets: [
      { id: "r1", mode: "woke", start: jst(2026, 10, 3, 3), end: jst(2026, 10, 3, 10, 30) },
      { id: "r2", mode: "sleep", start: jst(2026, 10, 4, 1), end: jst(2026, 10, 4, 8) },
      { id: "r3", mode: "sleep", start: jst(2026, 10, 5, 2), end: jst(2026, 10, 5, 9) },
      { id: "r4", mode: "tired", start: jst(2026, 10, 5, 14), end: jst(2026, 10, 5, 16) },
    ],
  };
  const { sleepLogs: _new, ...row } = JSON.parse(JSON.stringify(raw)) as Record<string, unknown>;
  void _new;
  return row;
}

/** 移す前の版で同じ行から出した値（その版の nightOf・bedNights・rewardBreakdown・periodStats・wakeStreak） */
const BEFORE = {
  nights: [
    {"date": "2026-10-01", "plannedBed": 1790780400000, "plannedWake": 1790812800000, "bed": {"at": 1790779200000, "source": "button"}, "up": {"at": 1790812200000, "source": "button"}, "sleep": {"minutes": 550, "source": "button"}, "upOnTime": true, "bedOnTime": true},
    {"date": "2026-10-02", "plannedBed": 1790874000000, "plannedWake": 1790899200000, "up": {"at": 1790901600000, "source": "routine"}, "asleep": 1790870400000, "awake": 1790895600000, "sleep": {"minutes": 400, "source": "health"}, "upOnTime": false, "bedOnTime": true},
    {"date": "2026-10-03", "plannedBed": 1790953200000, "plannedWake": 1790985600000, "bed": {"at": 1790964000000, "source": "manual"}, "up": {"at": 1790991000000, "source": "manual"}, "sleep": {"minutes": 450, "source": "button"}, "upOnTime": false, "bedOnTime": false},
    {"date": "2026-10-04", "plannedBed": 1791039600000, "plannedWake": 1791068400000, "bed": {"at": 1791043200000, "source": "manual"}, "up": {"at": 1791069600000, "source": "button"}, "sleep": {"minutes": 380, "source": "manual"}, "upOnTime": true, "bedOnTime": false},
    {"date": "2026-10-05", "bed": {"at": 1791133200000, "source": "manual"}, "upOnTime": false, "bedOnTime": false},
    {"date": "2026-10-06", "plannedBed": 1791212400000, "bed": {"at": 1791208800000, "source": "button"}, "upOnTime": false, "bedOnTime": true},
  ],
  bedNights: [
    {"key": "2026-09-30", "day": 1790694000000, "at": 1790779200000, "onTime": true, "source": "button"},
    {"key": "2026-10-01", "day": 1790780400000, "at": 1790870400000, "onTime": true, "source": "health"},
    {"key": "2026-10-02", "day": 1790866800000, "at": 1790964000000, "onTime": false, "source": "manual"},
    {"key": "2026-10-03", "day": 1790953200000, "at": 1791043200000, "onTime": false, "source": "manual"},
    {"key": "2026-10-05", "day": 1791126000000, "at": 1791208800000, "onTime": true, "source": "button"},
  ],
  reward: {"wake": 100, "routine": 0, "bed": 90, "habit": 0, "task": 0, "log": 30},
  period: {"wake": {"done": 2, "total": 4}, "routine": {"done": 0, "total": 4}, "habit": {"done": 0, "expected": 0}, "task": {"done": 0, "total": 0}},
  streak: 2,
  n5: {"date": "2026-10-05", "bed": {"at": 1791133200000, "source": "manual"}},
};

describe("以前の形の記録を眠りの記録に移す", () => {
  const d = fromStoredV2(oldRow(), now)!;
  const strip = <T extends object>(n: T) => {
    const { upRecordedAt: _drop, ...rest } = n as T & { upRecordedAt?: number };
    void _drop;
    return rest;
  };

  it("以前の項目は残さず、眠りの記録と「疲れている」だけになる", () => {
    const saved = toData(d) as unknown as Record<string, unknown>;
    expect(saved.bedLogs).toBeUndefined();
    expect(d.wakeLogs.some((l) => "wokeAt" in l || "plannedWake" in l || "wokeRecordedAt" in l)).toBe(false);
    expect(d.rhythmResets?.map((r) => r.mode)).toEqual(["tired"]);
    expect(d.sleepLogs.map((s) => s.date)).toEqual(["2026-10-01", "2026-10-02", "2026-10-03", "2026-10-04", "2026-10-05", "2026-10-06"]);
    expect(d.migrations).toContain("2026-10-12-sleep-logs");
  });

  it("夜の記録（寝た・起きた時刻、予定の就寝・起床、睡眠時間）が移す前と同じ", () => {
    expect(allNights(d).map((n) => ({ ...strip(n), upOnTime: upOnTime(n), bedOnTime: bedOnTimeOf(n) }))).toEqual(BEFORE.nights);
    expect(nightOf(d, "2026-10-05")).toEqual(BEFORE.n5);
    // 起きた時刻を記録した時刻も移す
    expect(nightOf(d, "2026-10-01").upRecordedAt).toBe(jst(2026, 10, 1, 8, 50));
  });

  it("予定どおり寝た夜・ご褒美・今週のまとめ・連続日数が移す前と同じ", () => {
    expect(bedNights(d)).toEqual(BEFORE.bedNights);
    expect(rewardBreakdown(d)).toEqual(BEFORE.reward);
    expect(periodStats(d, jst(2026, 9, 28), jst(2026, 10, 5), now)).toEqual(BEFORE.period);
    expect(wakeStreak(d, jst(2026, 10, 4))).toBe(BEFORE.streak);
  });

  it("移したあとに保存して読み直しても同じ（2回目は移さない）", () => {
    const again = fromStoredV2(JSON.parse(JSON.stringify(toData(d))), now)!;
    expect(again.sleepLogs).toEqual(d.sleepLogs);
  });

  it("以前の版がまた保存した行も、眠りの記録にない日だけ移す", () => {
    const row = { ...oldRow(), sleepLogs: [{ id: "2026-10-01", date: "2026-10-01", up: { at: jst(2026, 10, 1, 7), source: "picked" } }] };
    const got = fromStoredV2(row, now)!;
    expect(nightOf(got, "2026-10-01").up?.at).toBe(jst(2026, 10, 1, 7));
    expect(nightOf(got, "2026-10-06").bed?.at).toBe(jst(2026, 10, 5, 23));
  });
});

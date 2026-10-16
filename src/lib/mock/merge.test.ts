import { describe, expect, it } from "vitest";
import { jst } from "@/lib/scheduler/test-helpers";
import { fingerprints, mergeConflict } from "./merge";
import { sampleData } from "./state";
import { nightOf, pressBed, recordUp } from "./night";

const now = jst(2026, 10, 3, 12);
const base = sampleData(now);

describe("2台・オフラインで変えたときの合わせ方", () => {
  it("片方だけ変えた項目は、その変更を使う", () => {
    const local = { ...base, habitLogs: { "2026-10-03": { a: "done" as const } } };
    const remote = { ...base, smokeLogs: [now] };
    const merged = mergeConflict(fingerprints(base), local, remote);
    expect(merged.habitLogs).toEqual(local.habitLogs);
    expect(merged.smokeLogs).toEqual([now]);
  });

  it("両方で記録を足したら、両方残る（同じ日の同じ習慣は、サーバーのほう）", () => {
    const local = { ...base, habitLogs: { "2026-10-03": { a: "done" as const, b: "five" as const } }, smokeLogs: [1, 2] };
    const remote = { ...base, habitLogs: { "2026-10-03": { a: "five" as const }, "2026-10-02": { a: "done" as const } }, smokeLogs: [2, 3] };
    const merged = mergeConflict(fingerprints(base), local, remote);
    expect(merged.habitLogs).toEqual({ "2026-10-03": { a: "five", b: "five" }, "2026-10-02": { a: "done" } });
    expect(merged.smokeLogs).toEqual([1, 2, 3]);
  });

  it("ID のある一覧は、足した分を両方残す", () => {
    const sp = (id: string) => ({ id, at: now, amount: 100 });
    const merged = mergeConflict(fingerprints(base), { ...base, rewardSpends: [sp("a")] }, { ...base, rewardSpends: [sp("b")] });
    expect(merged.rewardSpends.map((x) => x.id).sort()).toEqual(["a", "b"]);
  });

  it("眠りの記録は、夜ごとに両方残す（同じ夜は、サーバーのほう）", () => {
    const local = { ...base, sleepLogs: pressBed(base.sleepLogs, "2026-10-04", jst(2026, 10, 3, 23, 50), jst(2026, 10, 4)) };
    const remote = { ...base, sleepLogs: recordUp(base.sleepLogs, "2026-10-03", jst(2026, 10, 3, 9), "button", jst(2026, 10, 3, 9), now) };
    const merged = mergeConflict(fingerprints(base), local, remote);
    expect(nightOf(merged, "2026-10-03").up?.at).toBe(jst(2026, 10, 3, 9));
    expect(nightOf(merged, "2026-10-04").bed?.at).toBe(jst(2026, 10, 3, 23, 50));
  });

  it("同じ夜の「寝る」と「起きた」を別々の端末で押しても、両方残る", () => {
    const local = { ...base, sleepLogs: pressBed(base.sleepLogs, "2026-10-04", jst(2026, 10, 3, 23, 50), jst(2026, 10, 4)) };
    const remote = { ...base, sleepLogs: recordUp(base.sleepLogs, "2026-10-04", jst(2026, 10, 4, 9), "button", jst(2026, 10, 4, 9), jst(2026, 10, 4, 9)) };
    for (const [a, b] of [[local, remote], [remote, local]]) {
      const n = nightOf(mergeConflict(fingerprints(base), a, b), "2026-10-04");
      expect(n.up?.at).toBe(jst(2026, 10, 4, 9));
      expect(n.bed?.at).toBe(jst(2026, 10, 3, 23, 50));
    }
  });

  it("同じ夜の寝た時刻を両方で変えたら、あとから記録したほうを使う", () => {
    const local = { ...base, sleepLogs: pressBed(base.sleepLogs, "2026-10-04", jst(2026, 10, 3, 23), jst(2026, 10, 4)) };
    const remote = { ...base, sleepLogs: pressBed(base.sleepLogs, "2026-10-04", jst(2026, 10, 3, 23, 40), jst(2026, 10, 4)) };
    for (const [a, b] of [[local, remote], [remote, local]]) {
      expect(nightOf(mergeConflict(fingerprints(base), a, b), "2026-10-04").bed?.at).toBe(jst(2026, 10, 3, 23, 40));
    }
  });

  it("片方で「いつ起きた？」で直し、もう片方で別の夜に「寝る」：両方残る。同じ夜を両方で直したら、あとから直したほう", () => {
    const synced = { ...base, sleepLogs: recordUp([], "2026-10-03", jst(2026, 10, 3, 9), "button", jst(2026, 10, 3, 9), jst(2026, 10, 3, 9)) };
    const fixedOnA = { ...synced, sleepLogs: recordUp(synced.sleepLogs, "2026-10-03", jst(2026, 10, 3, 8, 30), "picked", undefined, jst(2026, 10, 3, 11)) };
    const bedOnB = { ...synced, sleepLogs: pressBed(synced.sleepLogs, "2026-10-04", jst(2026, 10, 3, 23, 50), jst(2026, 10, 4)) };
    const merged = mergeConflict(fingerprints(synced), fixedOnA, bedOnB);
    expect(nightOf(merged, "2026-10-03").up?.at).toBe(jst(2026, 10, 3, 8, 30));
    expect(nightOf(merged, "2026-10-04").bed?.at).toBe(jst(2026, 10, 3, 23, 50));
    const fixedOnB = { ...synced, sleepLogs: recordUp(synced.sleepLogs, "2026-10-03", jst(2026, 10, 3, 8, 45), "picked", undefined, jst(2026, 10, 3, 10)) };
    expect(nightOf(mergeConflict(fingerprints(synced), fixedOnA, fixedOnB), "2026-10-03").up?.at).toBe(jst(2026, 10, 3, 8, 30));
    expect(nightOf(mergeConflict(fingerprints(synced), fixedOnB, fixedOnA), "2026-10-03").up?.at).toBe(jst(2026, 10, 3, 8, 30));
  });

  it("夜ごとの指紋がない前の指紋（更新前に保存）でも、もう片方の「取り消す」を戻さない", () => {
    const synced = { ...base, sleepLogs: pressBed([], "2026-10-04", jst(2026, 10, 3, 23, 50), jst(2026, 10, 4)) };
    const old = Object.fromEntries(Object.entries(fingerprints(synced)).filter(([k]) => !k.startsWith("sleepLogs:") && k !== "sleepLogs#entries"));
    const undone = { ...synced, sleepLogs: [] };
    const merged = mergeConflict(old, { ...synced, smokeLogs: [now] }, undone);
    expect(merged.sleepLogs).toEqual([]);
    expect(merged.smokeLogs).toEqual([now]);
  });

  it("組み直した起床の印は、2台で別の日に付けても両方残る", () => {
    const local = { ...base, anchoredWakes: { "2026-10-02": jst(2026, 10, 2, 11) } };
    const remote = { ...base, anchoredWakes: { "2026-10-03": jst(2026, 10, 3, 10) } };
    expect(mergeConflict(fingerprints(base), local, remote).anchoredWakes).toEqual({ ...local.anchoredWakes, ...remote.anchoredWakes });
  });

  it("jsonb で項目の並びが変わっても、同じ値なら変更とみなさない", () => {
    const reordered = JSON.parse(JSON.stringify(base), (_k, v) => (v && typeof v === "object" && !Array.isArray(v) ? Object.fromEntries(Object.entries(v).reverse()) : v));
    expect(fingerprints(reordered)).toEqual(fingerprints(base));
  });

  it("前に合わせた記録がなくても、記録を失わない", () => {
    const local = { ...base, smokeLogs: [1] };
    const remote = { ...base, smokeLogs: [2] };
    expect(mergeConflict(undefined, local, remote).smokeLogs).toEqual([1, 2]);
  });
});

import { describe, expect, it } from "vitest";
import { jst } from "@/lib/scheduler/test-helpers";
import { fingerprints, mergeConflict } from "./merge";
import { sampleData } from "./state";

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

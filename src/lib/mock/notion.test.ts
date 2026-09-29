import { describe, expect, it } from "vitest";
import { jst } from "@/lib/scheduler/test-helpers";
import { applyNotionRows, notionDeadline } from "./notion";
import { sampleData } from "./state";

describe("Notion の締切の取り込み", () => {
  const now = jst(2026, 10, 1, 12);
  const base = { ...sampleData(now), tasks: [{ id: "mine", title: "自分のタスク", priority: 2 as const }], doneTasks: [], notion: { dateProp: "締切", stageProp: "段階", ignoreStages: ["落選"] } };

  it("日付だけならその日の終わり、時刻があればその時刻", () => {
    expect(notionDeadline("2026-10-05")).toBe(jst(2026, 10, 6));
    expect(notionDeadline("2026-10-05T18:00:00.000+09:00")).toBe(jst(2026, 10, 5, 18));
  });

  it("名前は「企業名 段階」。過ぎた締切・取り込まない段階は入れず、消えた行は外し、アプリで足した所要時間は残す", () => {
    const rows = [
      { id: "a", title: "A社", date: "2026-10-05", stage: "ES" },
      { id: "b", title: "B社", date: "2026-09-20", stage: "ES" },
      { id: "c", title: "C社", date: "2026-10-07", stage: "落選" },
    ];
    const d1 = applyNotionRows(base, rows, now, now);
    expect(d1.tasks.map((t) => t.title)).toEqual(["自分のタスク", "A社 ES"]);
    const withDuration = { ...d1, tasks: d1.tasks.map((t) => (t.id === "notion-a" ? { ...t, durationMinutes: 120 } : t)) };
    const d2 = applyNotionRows(withDuration, [{ id: "a", title: "A社", date: "2026-10-06", stage: "Webテスト" }], now, now);
    expect(d2.tasks.find((t) => t.id === "notion-a")).toMatchObject({ title: "A社 Webテスト", deadline: jst(2026, 10, 7), durationMinutes: 120 });
    expect(applyNotionRows(d2, [], now, now).tasks.map((t) => t.id)).toEqual(["mine"]);
  });
});

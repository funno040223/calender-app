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

  it("段階ごとの目安の時間を所要時間に入れ、自分で変えた所要時間は上書きしない", () => {
    const cfg = { ...base, notion: { ...base.notion, stageMinutes: { ES: 120, SPI: 60 } } };
    const d1 = applyNotionRows(cfg, [{ id: "a", title: "A社", date: "2026-10-05", stage: "ES" }], now, now);
    expect(d1.tasks.find((t) => t.id === "notion-a")).toMatchObject({ durationMinutes: 120, autoDuration: true });
    // 段階が変われば目安も変わる
    const d2 = applyNotionRows(d1, [{ id: "a", title: "A社", date: "2026-10-05", stage: "SPI" }], now, now);
    expect(d2.tasks.find((t) => t.id === "notion-a")?.durationMinutes).toBe(60);
    // 自分で変えたら（autoDuration が外れる）、そのまま
    const mine = { ...d2, tasks: d2.tasks.map((t) => (t.id === "notion-a" ? { ...t, durationMinutes: 90, autoDuration: undefined } : t)) };
    const d3 = applyNotionRows(mine, [{ id: "a", title: "A社", date: "2026-10-05", stage: "ES" }], now, now);
    expect(d3.tasks.find((t) => t.id === "notion-a")?.durationMinutes).toBe(90);
  });

  it("完了にした段階だけ飛ばし、次の段階に進んだら取り込む", async () => {
    const { completeTask } = await import("./state");
    const d1 = applyNotionRows(base, [{ id: "a", title: "A社", date: "2026-10-05", stage: "ES" }], now, now);
    const done = completeTask(d1, "notion-a", now);
    expect(applyNotionRows(done, [{ id: "a", title: "A社", date: "2026-10-05", stage: "ES" }], now, now).tasks.some((t) => t.id === "notion-a")).toBe(false);
    const next = applyNotionRows(done, [{ id: "a", title: "A社", date: "2026-10-12", stage: "一次面接" }], now, now);
    expect(next.tasks.find((t) => t.id === "notion-a")?.title).toBe("A社 一次面接");
  });

  it("範囲やわからないにした所要時間は上書きせず、段階が変わったら前の残り時間を使わない", () => {
    const cfg = { ...base, notion: { ...base.notion, stageMinutes: { ES: 120, 面接: 60 } } };
    const d1 = applyNotionRows(cfg, [{ id: "a", title: "A社", date: "2026-10-05", stage: "ES" }], now, now);
    const ranged = { ...d1, tasks: d1.tasks.map((t) => (t.id === "notion-a" ? { ...t, durationMinutes: undefined, durationRange: { min: 30, max: 60 }, autoDuration: false } : t)) };
    const d2 = applyNotionRows(ranged, [{ id: "a", title: "A社", date: "2026-10-05", stage: "ES" }], now, now);
    expect(d2.tasks.find((t) => t.id === "notion-a")).toMatchObject({ durationRange: { min: 30, max: 60 } });
    expect(d2.tasks.find((t) => t.id === "notion-a")?.durationMinutes).toBeUndefined();
    const worked = { ...d1, tasks: d1.tasks.map((t) => (t.id === "notion-a" ? { ...t, remainingMinutes: 30 } : t)) };
    const d3 = applyNotionRows(worked, [{ id: "a", title: "A社", date: "2026-10-12", stage: "面接" }], now, now);
    expect(d3.tasks.find((t) => t.id === "notion-a")).toMatchObject({ durationMinutes: 60 });
    expect(d3.tasks.find((t) => t.id === "notion-a")?.remainingMinutes).toBeUndefined();
  });
});

describe("取り込んだタスクを消したとき", () => {
  const now = jst(2026, 10, 1, 12);
  const base = { ...sampleData(now), tasks: [], doneTasks: [], notion: { dateProp: "締切", stageProp: "段階", ignoreStages: [] } };
  it("同じ段階のあいだは取り込み直さず、次の段階に進んだら取り込む", async () => {
    const { deleteTask } = await import("./notion");
    const d1 = applyNotionRows(base, [{ id: "a", title: "A社", date: "2026-10-05", stage: "ES" }], now, now);
    const gone = deleteTask(d1, "notion-a");
    const again = applyNotionRows(gone, [{ id: "a", title: "A社", date: "2026-10-05", stage: "ES" }], now, now);
    expect(again.tasks.some((t) => t.id === "notion-a")).toBe(false);
    const next = applyNotionRows(again, [{ id: "a", title: "A社", date: "2026-10-12", stage: "面接" }], now, now);
    expect(next.tasks.find((t) => t.id === "notion-a")?.title).toBe("A社 面接");
    expect(next.notion?.dismissed).toBeUndefined();
  });
});

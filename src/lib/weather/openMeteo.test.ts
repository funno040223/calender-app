import { expect, it } from "vitest";
import { dailyRainChance } from "./openMeteo";

it("夜中だけの雨では、その日を雨の日にしない（6時〜22時の最大）", () => {
  const times = ["2026-10-03T02:00", "2026-10-03T08:00", "2026-10-03T14:00", "2026-10-03T23:00", "2026-10-04T10:00"];
  expect(dailyRainChance(times, [90, 20, 40, 95, 70])).toEqual({ "2026-10-03": 40, "2026-10-04": 70 });
  expect(dailyRainChance(times, [90, null, null, 95, null])).toEqual({});
});

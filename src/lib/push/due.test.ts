import { expect, it } from "vitest";
import { cleanNotices, isDue } from "./send";

const at = Date.parse("2026-10-01T03:00:00Z");
const MIN = 60_000;

it("ふつうの通知は、時刻から10分まで送る", () => {
  expect(isDue({ at }, at - 1)).toBe(false);
  expect(isDue({ at }, at + 9 * MIN)).toBe(true);
  expect(isDue({ at }, at + 11 * MIN)).toBe(false);
});

it("期限のある通知は、止まっていた間に過ぎても、期限までは復旧後に届ける", () => {
  const n = { at, until: at + 15 * MIN };
  expect(isDue(n, at + 14 * MIN)).toBe(true);
  expect(isDue(n, at + 16 * MIN)).toBe(false);
});

it("保存された一覧の期限は、数のときだけ残す", () => {
  const items = cleanNotices([
    { key: "a", at, title: "A", until: at + 1 },
    { key: "b", at, title: "B", until: "x" },
  ]);
  expect(items[0].until).toBe(at + 1);
  expect(items[1].until).toBeUndefined();
});

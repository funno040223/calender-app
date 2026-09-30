import { afterEach, expect, it, vi } from "vitest";
import { closeGoneTaskNotices } from "./close";

afterEach(() => vi.unstubAllGlobals());

it("なくなったタスクの通知だけ閉じる", async () => {
  const make = (tag: string) => ({ tag, close: vi.fn() });
  const list = [make("check:t1:100"), make("block:task:t1:100"), make("check:t10:100"), make("block:habit:h:100"), make("check:notion-ab:100")];
  vi.stubGlobal("navigator", { serviceWorker: { getRegistration: async () => ({ getNotifications: async () => list }) } });
  await closeGoneTaskNotices(new Set(["t10"]));
  expect(list.map((n) => n.close.mock.calls.length)).toEqual([1, 1, 0, 0, 1]);
});

import { afterEach, describe, expect, it, vi } from "vitest";
import { readRows } from "./api";

const page = (id: string, props: Record<string, unknown>) => ({ id, properties: { 名前: { type: "title", title: [{ plain_text: "A社" }] }, ...props } });
const respond = (...bodies: unknown[]) => {
  const fetch = vi.fn();
  for (const b of bodies) fetch.mockResolvedValueOnce(new Response(JSON.stringify(b), { status: 200 }));
  vi.stubGlobal("fetch", fetch);
};
afterEach(() => vi.unstubAllGlobals());

describe("Notion の表の行", () => {
  it("選んだ列を読む", async () => {
    respond({ results: [page("a-1", { 締切: { type: "date", date: { start: "2026-10-05" } }, 段階: { type: "select", select: { name: "ES" } } })], has_more: false });
    expect(await readRows("t", "db", "締切", "段階")).toEqual([{ id: "a1", title: "A社", date: "2026-10-05", stage: "ES" }]);
  });

  it("締切・段階の列が表にない（名前を変えた）ときは、エラーにしてタスクを消させない", async () => {
    respond({ results: [page("a", { 期日: { type: "date", date: { start: "2026-10-05" } } })], has_more: false });
    await expect(readRows("t", "db", "締切")).rejects.toThrow("締切の列");
    respond({ results: [page("a", { 締切: { type: "date", date: { start: "2026-10-05" } } })], has_more: false });
    await expect(readRows("t", "db", "締切", "段階")).rejects.toThrow("段階の列");
  });

  it("日付が空の行だけなら、エラーにしない", async () => {
    respond({ results: [page("a", { 締切: { type: "date", date: null } })], has_more: false });
    expect(await readRows("t", "db", "締切")).toHaveLength(1);
  });

  it("1000行で読み切れないときはエラー", async () => {
    const more = { results: [page("a", { 締切: { type: "date", date: null } })], has_more: true, next_cursor: "c" };
    respond(...Array.from({ length: 10 }, () => more));
    await expect(readRows("t", "db", "締切")).rejects.toThrow("1000行");
  });
});

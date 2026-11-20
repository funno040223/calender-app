// @vitest-environment jsdom
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { currentUserId } from "@/lib/sync/remote";
import type { LifeEvent } from "./model";
import { resetLifeLocalSession, useLife } from "./store";

vi.mock("@/lib/sync/remote", () => ({ currentUserId: vi.fn() }));
vi.mock("@/lib/localDebug", () => ({ LOCAL_DEBUG: false }));

const owner = "52b00ced-1111-4111-a111-100000000001";
const quantity = { ingredientId: "egg", name: "卵", amount: 2, unit: "個" };
const calls = vi.fn<typeof fetch>();

beforeEach(() => {
  vi.mocked(currentUserId).mockResolvedValue(owner);
  vi.stubGlobal("fetch", calls);
  calls.mockRejectedValue(new Error("offline"));
});

afterEach(() => {
  cleanup();
  resetLifeLocalSession();
  localStorage.clear();
  calls.mockReset();
  vi.unstubAllGlobals();
});

it("preserves one atomic purchase after reload, then retries the same event IDs after a revision conflict", async () => {
  const first = renderHook(() => useLife());
  await waitFor(() => expect(first.result.current.ready).toBe(true));
  const purchaseId = crypto.randomUUID();
  const lines = [quantity, { ...quantity, ingredientId: "bread", name: "食パン" }];
  act(() => {
    expect(first.result.current.buy(lines, purchaseId)).toBe(true);
    expect(first.result.current.buy(lines, purchaseId)).toBe(true);
    expect(first.result.current.buy([quantity], purchaseId)).toBe(false);
  });
  const packet = Object.keys(localStorage).find((key) => key.endsWith(purchaseId))!;
  const original = JSON.parse(localStorage.getItem(packet)!) as LifeEvent[];
  expect(original).toHaveLength(2);

  first.unmount();
  resetLifeLocalSession();
  const second = renderHook(() => useLife());
  await waitFor(() => expect(second.result.current.projection.inventory["egg:個"].amount).toBe(2));
  const requests: { owner: string; revision: number; events: LifeEvent[] }[] = [];
  calls.mockImplementation(async (_, init) => {
    const body = JSON.parse(String(init?.body));
    requests.push(body);
    return body.revision === 0
      ? Response.json({ status: "revision_conflict", revision: 1, events: [] }, { status: 409 })
      : Response.json({ status: "ok", revision: 2, events: original });
  });
  act(() => second.result.current.retry());
  await waitFor(() => expect(second.result.current.syncStatus).toBe("saved"));
  expect(requests.map(({ revision, events, owner }) => ({ revision, ids: events.map((event) => event.id), owner }))).toEqual([
    { revision: 0, owner, ids: original.map((event) => event.id) },
    { revision: 1, owner, ids: original.map((event) => event.id) },
  ]);
  expect(localStorage.getItem(packet)).toBeNull();
  expect(second.result.current.projection.inventory["egg:個"].amount).toBe(2);
});

it("isolates another login after a same-tab logout", async () => {
  const first = renderHook(() => useLife());
  await waitFor(() => expect(first.result.current.ready).toBe(true));
  act(() => { first.result.current.buy([quantity]); });
  first.unmount();
  resetLifeLocalSession();
  vi.mocked(currentUserId).mockResolvedValue("c8e00ced-1111-4111-a111-100000000002");
  const next = renderHook(() => useLife());
  await waitFor(() => expect(next.result.current.ready).toBe(true));
  expect(next.result.current.projection.inventory).toEqual({});
});

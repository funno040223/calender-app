import { beforeEach, expect, it, vi } from "vitest";
import { POST } from "./route";

const owner = "cd0a31dc-1111-4111-a111-100000000001";
const { getUser, rpc } = vi.hoisted(() => ({ getUser: vi.fn(), rpc: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: { getUser } }) }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({ rpc }) }));

const event = {
  id: "cd0a31dc-1111-4111-a111-100000000002",
  deviceId: "cd0a31dc-1111-4111-a111-100000000003",
  schemaVersion: 1, kind: "meal",
  occurredAt: null, recordedAt: "2026-11-20T00:00:00.000Z",
  payload: { date: "2026-11-20", slot: "dinner", status: "skipped", consumptions: [] },
};

function request(body: unknown) {
  return new Request("https://local.test/api/life/sync", { method: "POST", body: JSON.stringify(body) });
}

beforeEach(() => {
  vi.clearAllMocks();
  getUser.mockResolvedValue({ data: { user: { id: owner } } });
  rpc.mockResolvedValue({ data: { status: "ok", revision: 1, events: [event] } });
});

it("binds writes to the authenticated owner and rejects stale account or unknown schema", async () => {
  const invalidOwner = await POST(request({ owner: "other", revision: 0, events: [event] }));
  expect(invalidOwner.status).toBe(403);
  const unknown = await POST(request({ owner, revision: 0, events: [{ ...event, schemaVersion: 2 }] }));
  expect(unknown.status).toBe(426);
  const badDate = await POST(request({ owner, revision: 0, events: [{ ...event, payload: { ...event.payload, date: "2026-11-31" } }] }));
  expect(badDate.status).toBe(422);
  expect(rpc).not.toHaveBeenCalled();
});

it("calls one atomic RPC and returns a private delta on revision conflict", async () => {
  rpc.mockResolvedValue({ data: { status: "revision_conflict", revision: 2, events: [event] } });
  const response = await POST(request({ owner, revision: 1, events: [event] }));
  expect(response.status).toBe(409);
  expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  expect(await response.json()).toEqual({ status: "revision_conflict", revision: 2, events: [event] });
  expect(rpc).toHaveBeenCalledExactlyOnceWith("sync_life_events", {
    p_user: owner, p_revision: 1, p_entries: [{ event, group_key: "meal:2026-11-20:dinner", targets: [] }],
  });
});

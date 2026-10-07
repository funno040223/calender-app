import { afterEach, expect, it, vi } from "vitest";
import { authorized } from "@/lib/push/cron";
import { POST as healthPost } from "./health/sleep/route";
import { POST as dispatchPost } from "./push/dispatch/route";
import { POST as replanPost } from "./push/replan/route";

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => { throw new Error("DB に触れてはいけない"); } }));
vi.mock("@/lib/server/push", () => ({ replanPush: vi.fn() }));

afterEach(() => vi.unstubAllEnvs());

const req = (auth?: string) => new Request("https://example.test/api", { method: "POST", headers: auth ? { authorization: auth } : {}, body: "" });

it("CRON_SECRET が合うときだけ、定期実行として認める", () => {
  vi.stubEnv("CRON_SECRET", "secret-value");
  expect(authorized(req("Bearer secret-value"))).toBe(true);
  expect(authorized(req("Bearer secret-valuf"))).toBe(false);
  expect(authorized(req("Bearer short"))).toBe(false);
  expect(authorized(req())).toBe(false);
});

it("CRON_SECRET が未設定なら、空の合言葉でも認めない", () => {
  vi.stubEnv("CRON_SECRET", "");
  expect(authorized(req("Bearer "))).toBe(false);
  expect(authorized(req(""))).toBe(false);
});

it("通知の送信・組み直しの道は、合言葉がなければ DB に触れる前に 401", async () => {
  vi.stubEnv("CRON_SECRET", "secret-value");
  expect((await dispatchPost(req())).status).toBe(401);
  expect((await dispatchPost(req("Bearer wrong"))).status).toBe(401);
  expect((await replanPost(req("Bearer wrong"))).status).toBe(401);
});

it("ヘルスケアの道は、形の合わない合言葉を DB に触れる前に 401", async () => {
  expect((await healthPost(req())).status).toBe(401);
  expect((await healthPost(req("Bearer not-a-token"))).status).toBe(401);
});

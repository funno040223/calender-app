import { expect, it, vi } from "vitest";
import { DELIVERY_LEASE_MS, deliverNotice, type DeliveryLedger } from "./delivery";
import type { PushTarget } from "./send";

const notice = { key: "event:one", at: 1000, title: "Appointment", body: "Soon", url: "/" };
const target: PushTarget = { id: "phone", endpoint: "https://example.invalid", p256dh: "test", auth: "test" };
const now = Date.parse("2026-10-01T03:00:00Z");

function memoryLedger() {
  const rows = new Map<string, string>();
  const ledger: DeliveryLedger = {
    has: async (key) => rows.has(key),
    claim: async (key, at) => {
      const old = rows.get(key);
      if (old && Date.parse(at) - Date.parse(old) <= DELIVERY_LEASE_MS) return false;
      rows.set(key, at);
      return true;
    },
    finish: async (key) => { rows.set(key, new Date(now).toISOString()); },
    release: async (key, at) => { if (rows.get(key) === at) rows.delete(key); },
  };
  return { rows, ledger };
}

it("一時エラーになった端末だけ再試行し、成功した端末には二重送信しない", async () => {
  const { ledger } = memoryLedger();
  const laptop = { ...target, id: "laptop" };
  const send = vi.fn().mockResolvedValueOnce("ok").mockResolvedValueOnce("error").mockResolvedValueOnce("ok");
  expect(await deliverNotice(ledger, target, notice, send, now)).toBe("ok");
  expect(await deliverNotice(ledger, laptop, notice, send, now)).toBe("error");
  expect(await deliverNotice(ledger, target, notice, send, now + 60000)).toBe("skipped");
  expect(await deliverNotice(ledger, laptop, notice, send, now + 60000)).toBe("ok");
  expect(send).toHaveBeenCalledTimes(3);
});

it("重なった定期実行は同じ端末に同時送信しない", async () => {
  const { ledger } = memoryLedger();
  let finish!: (value: "ok") => void;
  const send = vi.fn(() => new Promise<"ok">((r) => { finish = r; }));
  const first = deliverNotice(ledger, target, notice, send, now);
  await vi.waitFor(() => expect(send).toHaveBeenCalledOnce());
  expect(await deliverNotice(ledger, target, notice, send, now + 1)).toBe("skipped");
  finish("ok");
  expect(await first).toBe("ok");
  expect(send).toHaveBeenCalledOnce();
});

it("処理が停止して残った確保は期限後に回復する", async () => {
  const { rows, ledger } = memoryLedger();
  rows.set(`sending:${target.id}:${notice.key}`, new Date(now).toISOString());
  const send = vi.fn().mockResolvedValue("ok");
  expect(await deliverNotice(ledger, target, notice, send, now + 60000)).toBe("skipped");
  expect(await deliverNotice(ledger, target, notice, send, now + DELIVERY_LEASE_MS + 1)).toBe("ok");
});

it("旧版ですでに送信した通知は再送しない", async () => {
  const { rows, ledger } = memoryLedger();
  rows.set(notice.key, new Date(now).toISOString());
  const send = vi.fn();
  expect(await deliverNotice(ledger, target, notice, send, now)).toBe("skipped");
  expect(send).not.toHaveBeenCalled();
});

it("送信が例外で終わっても確保を解放する", async () => {
  const { rows, ledger } = memoryLedger();
  const send = vi.fn().mockRejectedValueOnce(new Error("network")).mockResolvedValueOnce("ok");
  await expect(deliverNotice(ledger, target, notice, send, now)).rejects.toThrow("network");
  expect(rows.size).toBe(0);
  expect(await deliverNotice(ledger, target, notice, send, now + 60000)).toBe("ok");
});

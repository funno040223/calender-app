// @vitest-environment jsdom
import React from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { act, cleanup, render, renderHook, screen } from "@testing-library/react";
import { currentUserId, loadRemote, saveRemote, type RemoteRow } from "@/lib/sync/remote";
import { syncImports } from "@/lib/sync/ical";
import { sampleData } from "./state";
import { useMockStore } from "./store";
import AppShell from "@/components/app/AppShell";

vi.mock("@/lib/sync/remote", () => ({ loadRemote: vi.fn(), saveRemote: vi.fn(), currentUserId: vi.fn() }));
vi.mock("@/lib/sync/ical", () => ({ syncImports: vi.fn() }));
vi.mock("@/lib/sync/push", () => ({ saveSchedule: vi.fn().mockResolvedValue(undefined) }));
vi.mock("next/navigation", () => ({ usePathname: () => "/" }));

const now = Date.parse("2026-10-01T03:00:00Z");
const importedKey = "task-rhythm:mock:v2:imported";
const cached = [{ id: "ical-old", title: "Existing appointment", start: now + 3600000, end: now + 7200000 }];

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(now);
  vi.clearAllMocks();
  localStorage.clear();
  vi.mocked(loadRemote).mockResolvedValue({ data: sampleData(now), updatedAt: now });
  vi.mocked(saveRemote).mockResolvedValue(now);
  vi.mocked(currentUserId).mockResolvedValue("me");
  vi.mocked(syncImports).mockResolvedValue({ sources: [], events: [], fetchedAt: now });
});
afterEach(() => { cleanup(); vi.useRealTimers(); });

it("直前の手動変更を戻して再計算する", async () => {
  const { result } = renderHook(() => useMockStore());
  await act(async () => { await vi.advanceTimersByTimeAsync(0); });
  const title = result.current.state.tasks[0].title;
  act(() => result.current.update((d) => ({ ...d, tasks: d.tasks.map((t, i) => i === 0 ? { ...t, title: "変更後" } : t) })));
  expect(result.current.canUndo).toBe(true);
  expect(result.current.state.tasks[0].title).toBe("変更後");
  act(() => result.current.undo());
  expect(result.current.state.tasks[0].title).toBe(title);
  expect(result.current.canUndo).toBe(false);
});

it("初回のサーバー応答まで編集画面を表示せず、応答後に表示する", async () => {
  let resolve!: (row: RemoteRow) => void;
  vi.mocked(loadRemote).mockReturnValue(new Promise<RemoteRow>((r) => { resolve = r; }));
  render(<AppShell><button>記録する</button></AppShell>);
  await act(async () => { await vi.advanceTimersByTimeAsync(0); });
  expect(screen.queryByRole("button", { name: "記録する" })).toBeNull();
  expect(screen.getByRole("status").textContent).toContain("読み込み中");
  await act(async () => { resolve({ data: sampleData(now), updatedAt: now }); });
  expect(screen.getByRole("button", { name: "記録する" })).toBeTruthy();
});

it("初回同期に失敗しても、端末の控えで編集を開始できる", async () => {
  vi.mocked(loadRemote).mockRejectedValue(new Error("offline"));
  const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
  const { result } = renderHook(() => useMockStore());
  await act(async () => { await vi.advanceTimersByTimeAsync(0); });
  expect(result.current.initialLoaded).toBe(true);
  expect(result.current.sync).toBe("offline");
  warn.mockRestore();
});

it("一部の取り込み失敗では予定とキャッシュを保持し、成功後に更新する", async () => {
  localStorage.setItem(importedKey, JSON.stringify(cached));
  vi.mocked(syncImports).mockResolvedValue({
    sources: [{ id: "old", name: "Calendar", count: 0, error: "timeout" }, { id: "new", name: "Other", count: 0 }],
    events: [], fetchedAt: now,
  });
  const { result } = renderHook(() => useMockStore());
  await act(async () => { await vi.advanceTimersByTimeAsync(0); });
  expect(result.current.imports.state).toBe("error");
  expect(result.current.state.googleEvents).toEqual(cached);
  expect(JSON.parse(localStorage.getItem(importedKey)!)).toEqual(cached);
  const fresh = [{ ...cached[0], title: "Updated appointment" }];
  vi.mocked(syncImports).mockResolvedValue({ sources: [{ id: "old", name: "Calendar", count: 1 }], events: fresh, fetchedAt: now });
  await act(async () => { await result.current.refreshImports(); });
  expect(result.current.imports.state).toBe("done");
  expect(result.current.state.googleEvents).toEqual(fresh);
  expect(JSON.parse(localStorage.getItem(importedKey)!)).toEqual(fresh);
});

it("取り込み元を全件削除した場合はサンプルを追加せず空にする", async () => {
  localStorage.setItem(importedKey, JSON.stringify(cached));
  const { result } = renderHook(() => useMockStore());
  await act(async () => { await vi.advanceTimersByTimeAsync(0); });
  expect(result.current.state.googleEvents).toEqual([]);
  expect(JSON.parse(localStorage.getItem(importedKey)!)).toEqual([]);
});

it("取り込みが終わる直前の変更も、サーバーに保存する", async () => {
  let resolveImport!: (v: Awaited<ReturnType<typeof syncImports>>) => void;
  vi.mocked(syncImports).mockReturnValue(new Promise((r) => { resolveImport = r; }));
  const { result } = renderHook(() => useMockStore());
  await act(async () => { await vi.advanceTimersByTimeAsync(0); });
  vi.mocked(saveRemote).mockClear();
  act(() => result.current.update((d) => ({ ...d, tasks: d.tasks.map((t, i) => (i === 0 ? { ...t, title: "取り込み中の変更" } : t)) })));
  await act(async () => { await vi.advanceTimersByTimeAsync(300); });
  await act(async () => { resolveImport({ sources: [], events: [], fetchedAt: now }); });
  await act(async () => { await vi.advanceTimersByTimeAsync(5000); });
  expect(saveRemote).toHaveBeenCalled();
  expect((vi.mocked(saveRemote).mock.calls.at(-1)![0] as { tasks: { title: string }[] }).tasks[0].title).toBe("取り込み中の変更");
});

it("サーバーを読み直している間は、通知の一覧を置かない", async () => {
  const { saveSchedule } = await import("@/lib/sync/push");
  const { result } = renderHook(() => useMockStore());
  await act(async () => { await vi.advanceTimersByTimeAsync(5000); });
  vi.mocked(saveSchedule).mockClear();
  let resolvePull!: (row: RemoteRow) => void;
  vi.mocked(loadRemote).mockReturnValue(new Promise<RemoteRow>((r) => { resolvePull = r; }));
  await act(async () => { document.dispatchEvent(new Event("visibilitychange")); });
  act(() => result.current.update((d) => ({ ...d, tasks: d.tasks.slice(1) })));
  await act(async () => { await vi.advanceTimersByTimeAsync(8000); });
  expect(saveSchedule).not.toHaveBeenCalled();
  await act(async () => { resolvePull({ data: sampleData(now), updatedAt: now }); });
  await act(async () => { await vi.advanceTimersByTimeAsync(5000); });
  expect(saveSchedule).toHaveBeenCalled();
});

it("別の人の控えが残っている端末で新しいアカウントに入っても、その控えを送らず見本のデータから始める", async () => {
  const other = { ...sampleData(now), tasks: [{ id: "secret", title: "前の人の予定", priority: 2 as const }] };
  localStorage.setItem("task-rhythm:mock:v2", JSON.stringify(other));
  localStorage.setItem("task-rhythm:mock:v2:owner", "someone-else");
  vi.mocked(loadRemote).mockResolvedValue(null);
  const { result } = renderHook(() => useMockStore());
  await act(async () => { await vi.advanceTimersByTimeAsync(0); });
  const sent = vi.mocked(saveRemote).mock.calls.at(-1)?.[0] as { tasks: { id: string }[] };
  expect(sent.tasks.some((t) => t.id === "secret")).toBe(false);
  expect(result.current.state.tasks.some((t) => t.id === "secret")).toBe(false);
  expect(localStorage.getItem("task-rhythm:mock:v2:owner")).toBe("me");
});

it("同じ人の控えなら、サーバーにまだ行がなければ控えを送る（前からの動き）", async () => {
  const mine = { ...sampleData(now), tasks: [{ id: "mine", title: "自分の予定", priority: 2 as const }] };
  localStorage.setItem("task-rhythm:mock:v2", JSON.stringify(mine));
  localStorage.setItem("task-rhythm:mock:v2:owner", "me");
  vi.mocked(loadRemote).mockResolvedValue(null);
  renderHook(() => useMockStore());
  await act(async () => { await vi.advanceTimersByTimeAsync(0); });
  const sent = vi.mocked(saveRemote).mock.calls.at(-1)?.[0] as { tasks: { id: string }[] };
  expect(sent.tasks.some((t) => t.id === "mine")).toBe(true);
});

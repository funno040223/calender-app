"use client";

import { useEffect, useSyncExternalStore } from "react";
import { LOCAL_DEBUG } from "@/lib/localDebug";
import { dateKeyOf } from "@/lib/mock/model";
import { currentUserId } from "@/lib/sync/remote";
import {
  entryKey, eventEntry, mealKey, quantityKey, type Exercise, type ExerciseChoice, type ExercisePlan, type Fatigue,
  type LifeEntry, type LifeEvent, type Meal, type MealPlan, type MealSlot, type Presence, type Quantity, type Recipe,
  type Review, type ReviewGoal,
} from "./model";
import { indexHeads, projectLife } from "./projection";
import { correctionEntry, MAX_BATCH_EVENTS, MAX_SYNC_BYTES, validateLifeBatch, validateLifeEvent } from "./validation";

export const LIFE_STORAGE_PREFIX = "task-rhythm:life:";
const PREFIX = LIFE_STORAGE_PREFIX;
const DEVICE_KEY = PREFIX + "device";
const EMPTY_PROJECTION = projectLife([]);
const INITIAL = { ready: false, syncStatus: "loading", error: undefined, projection: EMPTY_PROJECTION } as const;
type SyncStatus = "loading" | "saved" | "pending" | "offline" | "blocked" | "local";
type Snapshot = { ready: boolean; syncStatus: SyncStatus; error?: string; projection: ReturnType<typeof projectLife> };
type Cache = { revision: number; events: LifeEvent[] };
type Packet = { key: string; events: LifeEvent[] };

const listeners = new Set<() => void>();
let snapshot: Snapshot = INITIAL;
let owner: string | undefined;
let deviceId: string | undefined;
let currentEvents: LifeEvent[] = [];
let timer: number | undefined;
let syncing = false;
let generation = 0;
let started = 0;
let expiryDay: string | undefined;
const byteLength = (value: string) => new TextEncoder().encode(value).length;

const prefixOf = () => PREFIX + owner + ":";
const cacheKey = () => prefixOf() + "cache";
const queuePrefix = () => prefixOf() + "write:";
const listen = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
const getSnapshot = () => snapshot;
const getServerSnapshot = () => INITIAL;

/**
 * ログアウトの前に、まだ送れていない生活記録を送ってみる。送れなかった件数を返す（ログアウトで消えるので、確かめてもらう）
 */
export async function flushLifeBeforeSignOut(): Promise<number> {
  if (!owner || LOCAL_DEBUG) return 0;
  try {
    if (readQueue().length) await sync();
    return readQueue().reduce((n, packet) => n + packet.events.length, 0);
  } catch {
    return 0;
  }
}

export function resetLifeLocalSession() {
  generation++;
  owner = undefined;
  deviceId = undefined;
  if (timer !== undefined) window.clearTimeout(timer);
  timer = undefined;
  publish("loading", undefined, []);
}

function publish(syncStatus: SyncStatus, error?: string, events?: LifeEvent[]) {
  const today = dateKeyOf(Date.now());
  if (events) currentEvents = events;
  const projection = events || expiryDay !== today ? projectLife(currentEvents, today) : snapshot.projection;
  expiryDay = today;
  snapshot = { ready: !!owner && !!deviceId, syncStatus, error, projection };
  listeners.forEach((listener) => listener());
}

function checkedEvents(events: unknown): LifeEvent[] {
  if (!Array.isArray(events) || !events.every(validateLifeEvent)) throw new Error("保存した生活記録を読むには、アプリの更新が必要です。");
  return events;
}

function readCache(): Cache {
  const raw = localStorage.getItem(cacheKey());
  if (!raw) return { revision: 0, events: [] };
  const value = JSON.parse(raw);
  if (!Number.isSafeInteger(value.revision) || value.revision < 0) throw new Error("生活記録の同期情報を読み込めません。");
  return { revision: value.revision, events: checkedEvents(value.events) };
}

function readQueue(): Packet[] {
  const packets: Packet[] = [];
  for (const key of Object.keys(localStorage)) {
    if (!key.startsWith(queuePrefix())) continue;
    const raw = localStorage.getItem(key);
    if (raw === null) continue;
    const events = checkedEvents(JSON.parse(raw));
    if (!events.length || events.length > MAX_BATCH_EVENTS) throw new Error("この端末の未同期記録を読み込めませんでした。");
    packets.push({ key, events });
  }
  const byEvent = new Map(packets.flatMap((packet) => packet.events.map((event) => [event.id, packet] as const)));
  const ordered: Packet[] = [];
  const visited = new Set<Packet>();
  const add = (packet: Packet) => {
    if (visited.has(packet)) return;
    visited.add(packet);
    for (const event of packet.events) {
      if (event.kind !== "correction") continue;
      for (const target of event.payload.targets) {
        const parent = byEvent.get(target);
        if (parent) add(parent);
      }
    }
    ordered.push(packet);
  };
  for (const packet of packets) add(packet);
  return ordered;
}

function union(...arrays: LifeEvent[][]): LifeEvent[] {
  return [...new Map(arrays.flat().map((event) => [event.id, event])).values()];
}

function readLocal() {
  const cache = readCache();
  const packets = readQueue();
  return { cache, packets, events: union(cache.events, packets.flatMap((packet) => packet.events)) };
}

function later(ms = 400) {
  if (timer !== undefined) window.clearTimeout(timer);
  timer = window.setTimeout(() => { timer = undefined; void sync(); }, ms);
}

async function sync() {
  if (!owner || syncing || LOCAL_DEBUG) return;
  const session = generation;
  syncing = true;
  try {
    // A revision conflict downloads the other device's append batch before retrying
    // the same pending IDs. Limit retries per session to avoid a tight loop.
    for (let attempt = 0; attempt < 4; attempt++) {
      const local = readLocal();
      const packets: Packet[] = [];
      const events: LifeEvent[] = [];
      let bytes = 512;
      for (const packet of local.packets) {
        if (events.length + packet.events.length > MAX_BATCH_EVENTS) break;
        bytes += byteLength(JSON.stringify(packet.events));
        if (bytes > MAX_SYNC_BYTES) break;
        packets.push(packet);
        events.push(...packet.events);
      }
      const response = await fetch("/api/life/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ owner, revision: local.cache.revision, events }),
        signal: AbortSignal.timeout(8_000),
      });
      if (generation !== session) return;
      const body = await response.json();
      if (generation !== session) return;
      if (response.status === 409 && body.status === "reset") {
        localStorage.removeItem(cacheKey());
        continue;
      }
      if (response.status !== 409 && !response.ok) {
        if ([403, 413, 422, 426].includes(response.status)) {
          publish("blocked", body.error ?? "生活記録を確認してください。");
          return;
        }
        throw new Error("生活記録を同期できませんでした。");
      }
      if (body.status === "id_conflict" || body.status === "invalid_target" || body.status === "unsupported") {
        publish("blocked", body.status === "unsupported" ? "生活記録を同期するには、アプリの更新が必要です。" : "生活記録の同期時に競合が見つかりました。");
        return;
      }
      if (!["ok", "revision_conflict"].includes(body.status) || !Number.isSafeInteger(body.revision)
        || body.revision < local.cache.revision) throw new Error("生活記録の同期情報を読み込めません。");
      if (!Array.isArray(body.events) || !body.events.every(validateLifeEvent)) {
        publish("blocked", "生活記録を同期するには、アプリの更新が必要です。");
        return;
      }
      const received: LifeEvent[] = body.events;
      const latest = readCache();
      // Another tab may have advanced the cache while this request was in flight.
      if (latest.revision <= body.revision) {
        const cache: Cache = { revision: body.revision, events: union(local.cache.events, received, body.status === "ok" ? events : []) };
        localStorage.setItem(cacheKey(), JSON.stringify(cache));
      }
      if (body.status === "ok") packets.forEach((packet) => localStorage.removeItem(packet.key));
      const updated = readLocal();
      publish(updated.packets.length ? "pending" : "saved", undefined, updated.events);
      if (!updated.packets.length) return;
    }
    later(1_200);
  } catch (error) {
    if (session === generation) publish(navigator.onLine ? "pending" : "offline", error instanceof Error ? error.message : "生活記録を同期できませんでした。");
  } finally {
    syncing = false;
    if (session !== generation && owner) later();
  }
}

function loadLocal() {
  try {
    const local = readLocal();
    publish(LOCAL_DEBUG ? "local" : local.packets.length ? "pending" : "loading", undefined, local.events);
    void sync();
  } catch (error) {
    publish("blocked", error instanceof Error ? error.message : "生活記録を読み込めません。");
  }
}

function onStorage(event: StorageEvent) {
  if (!owner || (event.key !== null && event.key !== DEVICE_KEY && !event.key.startsWith(prefixOf()))) return;
  if (!localStorage.getItem(DEVICE_KEY)) {
    resetLifeLocalSession();
    return;
  }
  loadLocal();
}

async function initialize() {
  const session = generation;
  try {
    const signedIn = await currentUserId();
    if (session !== generation) return;
    if (!signedIn) {
      resetLifeLocalSession();
      publish("blocked", "ログインして生活記録を開いてください。", []);
      return;
    }
    if (owner && signedIn !== owner) resetLifeLocalSession();
    const id = localStorage.getItem(DEVICE_KEY) ?? crypto.randomUUID();
    localStorage.setItem(DEVICE_KEY, id);
    owner = signedIn;
    deviceId = id;
    loadLocal();
  } catch {
    if (session === generation || !owner) publish("blocked", "この端末の生活記録を開けませんでした。");
  }
}

function start() {
  if (started++ === 0) {
    void initialize();
    window.addEventListener("online", retry);
    window.addEventListener("storage", onStorage);
    document.addEventListener("visibilitychange", onVisible);
  }
  return () => {
    if (--started !== 0) return;
    window.removeEventListener("online", retry);
    window.removeEventListener("storage", onStorage);
    document.removeEventListener("visibilitychange", onVisible);
  };
}

function retry() {
  if (!owner) void initialize();
  else loadLocal();
}

function onVisible() {
  if (document.visibilityState === "visible") void initialize();
}

interface WriteOptions {
  resolve?: boolean;
  cancel?: boolean;
  id?: string;
  actualTime?: boolean;
  initialOnly?: boolean;
  automaticOnly?: boolean;
  atomic?: boolean;
}

function saveEntries(entries: LifeEntry[], options: WriteOptions = {}) {
  if (!owner || !deviceId || !entries.length || entries.length > MAX_BATCH_EVENTS) return false;
  try {
    const local = readLocal();
    if (options.id) {
      const receipts = local.events.filter((event) => event.kind === "purchase" && event.payload.purchaseId === options.id);
      if (receipts.length) {
        const expected = new Map(entries.filter((entry) => entry.kind === "purchase").map(({ value }) => [quantityKey(value), value]));
        const matches = receipts.length === expected.size && receipts.every((event) => {
          if (event.kind !== "purchase") return false;
          const stored = event.payload;
          const requested = expected.get(quantityKey(stored));
          return !!requested && stored.name === requested.name && stored.amount === requested.amount
            && stored.expiresOn === requested.expiresOn && stored.expiryKind === requested.expiryKind;
        });
        if (!matches) publish(snapshot.syncStatus, "同じ購入の内容が変更されています。");
        return matches;
      }
    }
    const indexed = indexHeads(local.events);
    const recordedAt = new Date().toISOString();
    const events: LifeEvent[] = entries.flatMap((entry): LifeEvent[] => {
      const heads = indexed.get(entryKey(entry)) ?? [];
      const latest = heads[0];
      if (options.automaticOnly && heads.some((event) => {
        const existing = eventEntry(event);
        return existing.kind === "exerciseChoice" && !existing.value.automatic && !(event.kind === "correction" && event.payload.canceled);
      })) return [];
      if (heads.length > 1 && !options.resolve) return [];
      if (options.initialOnly && latest && !(latest.kind === "correction" && latest.payload.canceled)) return [];
      if (options.cancel && (!latest || latest.kind === "correction" && latest.payload.canceled)) return [];
      if (heads.length === 1 && !options.cancel && !(latest.kind === "correction" && latest.payload.canceled)
        && JSON.stringify(eventEntry(latest)) === JSON.stringify(entry)) return [];
      const actualDay = entry.kind === "meal" || entry.kind === "exercise" ? entry.value.date : dateKeyOf(Date.now());
      const occurredAt = latest ? latest.occurredAt
        : options.actualTime && (entry.kind === "exercise" || actualDay === dateKeyOf(Date.now())) ? recordedAt : null;
      const base = { id: crypto.randomUUID(), schemaVersion: 1 as const, recordedAt, occurredAt, deviceId: deviceId! };
      if (heads.length) return [{ ...base, kind: "correction", supersedes: latest.id, payload: correctionEntry(entry, heads, options.cancel) }];
      return [{ ...base, kind: entry.kind, payload: entry.value } as LifeEvent];
    });
    if (!events.length || options.atomic && events.length !== entries.length) return false;
    if (validateLifeBatch(events) !== "ok") {
      publish(snapshot.syncStatus, "記録の入力を確認してください。");
      return false;
    }
    // One purchase writes all of its lines under one key. A later retry reuses those IDs.
    const packetKey = queuePrefix() + (options.id ?? events[0].id);
    const encoded = JSON.stringify(events);
    if (byteLength(encoded) > MAX_SYNC_BYTES - 512) {
      publish(snapshot.syncStatus, "一度に保存する生活記録が多すぎます。");
      return false;
    }
    localStorage.setItem(packetKey, encoded);
    publish(LOCAL_DEBUG ? "local" : "pending", undefined, union(local.events, events));
    if (!LOCAL_DEBUG) later();
    return true;
  } catch (error) {
    publish(snapshot.syncStatus, error instanceof Error ? error.message : "この端末に生活記録を保存できませんでした。");
    return false;
  }
}

const actions = {
  retry,
  recordMeal: (meal: Meal) => saveEntries([{ kind: "meal", value: meal }], { actualTime: true }),
  resolveMeal: (meal: Meal) => saveEntries([{ kind: "meal", value: meal }], { resolve: true, actualTime: true }),
  undoMeal: (date: string, slot: MealSlot) => {
    const value = snapshot.projection.meals[mealKey(date, slot)]?.value;
    return value ? saveEntries([{ kind: "meal", value }], { cancel: true }) : false;
  },
  planMeal: (meal: MealPlan) => saveEntries([{ kind: "mealPlan", value: meal }], { resolve: true }),
  saveRecipe: (recipe: Recipe) => saveEntries([{ kind: "recipe", value: recipe }], { resolve: true }),
  setPresence: (ingredientId: string, value: Presence) => saveEntries([{ kind: "presence", value: { ingredientId, value } }], { resolve: true }),
  buy: (lines: Quantity[], purchaseId = crypto.randomUUID()) => {
    if (new Set(lines.map(quantityKey)).size !== lines.length) return false;
    return saveEntries(lines.map((line) => ({ kind: "purchase", value: { ...line, purchaseId } })), { id: purchaseId, actualTime: true, atomic: true });
  },
  undoPurchase: (purchaseId: string) => {
    if (Object.keys(snapshot.projection.conflicts).some((key) => key.startsWith("purchase:" + purchaseId + ":"))) return false;
    const items = Object.values(snapshot.projection.purchases).filter(({ value }) => value.purchaseId === purchaseId);
    return saveEntries(items.map(({ value }) => ({ kind: "purchase", value })), { cancel: true, atomic: true });
  },
  stocktake: (line: Quantity) => saveEntries([{ kind: "stocktake", value: { ...line, asOf: new Date().toISOString() } }], { resolve: true }),
  completeExercise: (exercise: Exercise) => saveEntries([{ kind: "exercise", value: exercise }], { actualTime: true, initialOnly: true }),
  resolveExercise: (exercise: Exercise) => saveEntries([{ kind: "exercise", value: exercise }], { resolve: true, actualTime: true }),
  undoExercise: (roundId: string) => {
    const value = snapshot.projection.exercise[roundId]?.value;
    return value ? saveEntries([{ kind: "exercise", value }], { cancel: true }) : false;
  },
  saveExercisePlan: (plan: ExercisePlan) => saveEntries([{ kind: "exercisePlan", value: plan }], { resolve: true }),
  setExerciseChoice: (choice: ExerciseChoice) => saveEntries([{ kind: "exerciseChoice", value: choice }], { resolve: true }),
  undoExerciseChoice: (roundId: string) => {
    const value = snapshot.projection.exerciseChoices[roundId]?.value;
    if (value?.automatic && value.previousStart !== undefined && value.previousMode) {
      return saveEntries([{ kind: "exerciseChoice", value: { roundId, start: value.previousStart, mode: value.previousMode } }], { resolve: true });
    }
    return value ? saveEntries([{ kind: "exerciseChoice", value }], { cancel: true }) : false;
  },
  setFatigue: (date: string, value: Fatigue) => saveEntries([{ kind: "fatigue", value: { date, value } }], { resolve: true }),
  setReviewGoal: (goal: ReviewGoal) => saveEntries([{ kind: "reviewGoal", value: goal }], { resolve: true }),
  saveReview: (review: Review) => saveEntries([{ kind: "review", value: review }], { resolve: true }),
};

export function useLife() {
  const state = useSyncExternalStore(listen, getSnapshot, getServerSnapshot);
  useEffect(start, []);
  return { ...state, ...actions };
}

import type { MockData } from "./model";
import { DATA_KEYS } from "./state";

/** 項目ごとの変更を見分けるための指紋。jsonb は項目の並びを変えるので、並びに関係なく同じ値なら同じ指紋にする */
export type Fingerprints = Record<string, string>;

function stable(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(stable).join(",")}]`;
  if (v && typeof v === "object") {
    const o = v as Record<string, unknown>;
    return `{${Object.keys(o)
      .filter((k) => o[k] !== undefined)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${stable(o[k])}`)
      .join(",")}}`;
  }
  return JSON.stringify(v) ?? "null";
}

/** 文字列の指紋（cyrb53）。衝突は気にしない程度の長さ */
function hash(text: string): string {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < text.length; i++) {
    const ch = text.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}

export function fingerprints(d: Partial<MockData>): Fingerprints {
  return Object.fromEntries(DATA_KEYS.map((k) => [k, hash(stable(d[k]))]));
}

const isRecord = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const keyOf = (x: unknown): string | undefined =>
  isRecord(x) ? (typeof x.id === "string" ? x.id : typeof x.date === "string" ? x.date : undefined) : undefined;

/** 両方で変えた項目：足した分は両方残し、同じものを変えていたら、あとから保存したサーバーのほうを使う */
function union(local: unknown, remote: unknown): unknown {
  if (Array.isArray(local) && Array.isArray(remote)) {
    if (local.every((x) => typeof x === "number") && remote.every((x) => typeof x === "number")) {
      return [...new Set([...local, ...remote])].sort((a, b) => a - b);
    }
    if (local.every((x) => typeof x === "string") && remote.every((x) => typeof x === "string")) return [...new Set([...local, ...remote])];
    if ([...local, ...remote].every((x) => keyOf(x) !== undefined)) {
      const byKey = new Map(local.map((x) => [keyOf(x)!, x]));
      for (const x of remote) byKey.set(keyOf(x)!, x);
      return [...byKey.values()];
    }
    return remote;
  }
  if (isRecord(local) && isRecord(remote)) {
    const out: Record<string, unknown> = { ...local };
    for (const [k, v] of Object.entries(remote)) out[k] = isRecord(out[k]) && isRecord(v) ? { ...(out[k] as object), ...v } : Array.isArray(out[k]) && Array.isArray(v) ? union(out[k], v) : v;
    return out;
  }
  return remote;
}

/**
 * この端末にまだ送っていない変更があるまま、サーバーが先に変わっていたときの、項目ごとの合わせ方。
 * base は前に合わせたときの指紋。片方だけ変えた項目はその変更を使い、両方で変えた項目は union で合わせる。
 * 基本は、あとから保存したほうの内容（サーバー）を残し、この端末で足した記録だけを失わない
 */
export function mergeConflict(base: Fingerprints | undefined, local: MockData, remote: MockData): MockData {
  const lf = fingerprints(local);
  const rf = fingerprints(remote);
  const out: Record<string, unknown> = {};
  for (const k of DATA_KEYS) {
    const l = local[k];
    const r = remote[k];
    if (lf[k] === rf[k]) out[k] = r;
    else if (base && lf[k] === base[k]) out[k] = r;
    else if (base && rf[k] === base[k]) out[k] = l;
    else if (k === "migrations") out[k] = [...new Set([...(l as string[]), ...(r as string[])])];
    else out[k] = union(l, r);
  }
  return out as unknown as MockData;
}

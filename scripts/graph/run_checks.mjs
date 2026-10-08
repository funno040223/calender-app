// 検証①〜⑤（＋端点の欠け）を graph.json に対して実行する。checks.cypher と同じ内容。
import fs from "node:fs";
import { execSync } from "node:child_process";

const ROOT = process.cwd();
const graphPath = process.argv[2] ?? "docs/graph/data/graph.json";
const outPath = process.argv[3] ?? "docs/graph/data/check_report.json";
const g = JSON.parse(fs.readFileSync(graphPath, "utf8"));

// 出典の実在確認は、抽出スクリプトとは別に、ここで独自に求める
const SRC_RE = /\.(ts|tsx|mts|mjs|js|css|sql)$/;
const EXTRA = new Set(["package.json", "tsconfig.json", ".env.example"]);
const files = execSync("git ls-files", { cwd: ROOT, encoding: "utf8" })
  .split("\n").filter(Boolean)
  .filter((f) => (SRC_RE.test(f) || EXTRA.has(f)) && !f.endsWith("package-lock.json"));
const lineCount = {};
const countLines = (f) => {
  if (f in lineCount) return lineCount[f];
  try {
    const t = fs.readFileSync(`${ROOT}/${f}`, "utf8");
    lineCount[f] = t.length === 0 ? 0 : t.replace(/\n$/, "").split("\n").length;
  } catch { lineCount[f] = null; }
  return lineCount[f];
};

const nodes = g.nodes, edges = g.edges;
const byId = new Map(nodes.map((n) => [n.id, n]));
const report = { generated: new Date().toISOString(), counts: { nodes: nodes.length, edges: edges.length }, checks: {} };

// ①
const modFiles = new Set(nodes.filter((n) => n.label === "Module").map((n) => n.file));
const c1 = files.filter((f) => !modFiles.has(f));
report.checks["1_all_files_are_modules"] = { pass: c1.length === 0, source_files: files.length, missing: c1 };

// ②
const need = ["id", "source", "file", "line_start", "line_end"];
const bad2 = [];
for (const n of nodes) {
  const miss = [...need, "label", "name"].filter((k) => n[k] === undefined || n[k] === null || n[k] === "");
  if (n.source && !["static", "llm"].includes(n.source)) miss.push("source(invalid)");
  if (miss.length) bad2.push({ kind: "node", id: n.id, missing: miss });
}
for (const e of edges) {
  const miss = [...need, "type", "from", "to"].filter((k) => e[k] === undefined || e[k] === null || e[k] === "");
  if (e.source && !["static", "llm"].includes(e.source)) miss.push("source(invalid)");
  if (miss.length) bad2.push({ kind: "edge", id: e.id, missing: miss });
}
const EDGE_TYPES = new Set(["IMPORTS", "DEFINES", "CALLS", "USES", "IMPLEMENTS", "PART_OF", "DEPENDS_ON", "CONFIGURED_BY"]);
const badType = edges.filter((e) => !EDGE_TYPES.has(e.type)).map((e) => ({ kind: "edge", id: e.id, missing: [`type(${e.type})`] }));
report.checks["2_required_attributes"] = { pass: bad2.length + badType.length === 0, count: bad2.length + badType.length, items: [...bad2, ...badType].slice(0, 200) };

// ③
const bad3 = [];
for (const x of [...nodes.map((n) => ({ ...n, kind: "node" })), ...edges.map((e) => ({ ...e, kind: "edge" }))]) {
  if (!x.file) continue;
  const total = countLines(x.file);
  if (total === null) { bad3.push({ kind: x.kind, id: x.id, file: x.file, why: "file not found" }); continue; }
  if (!(Number.isInteger(x.line_start) && Number.isInteger(x.line_end))) { bad3.push({ kind: x.kind, id: x.id, why: "line not integer" }); continue; }
  if (x.line_start < 1 || x.line_end < x.line_start || x.line_end > total)
    bad3.push({ kind: x.kind, id: x.id, file: x.file, line_start: x.line_start, line_end: x.line_end, file_lines: total, why: "range invalid" });
}
report.checks["3_sources_valid"] = { pass: bad3.length === 0, count: bad3.length, items: bad3.slice(0, 200) };

// 端点の欠け（⑤ C1 と static 側）
const dangling = [];
for (const e of edges) {
  for (const k of ["from", "to"]) if (!byId.has(e[k])) dangling.push({ edge: e.id, type: e.type, source: e.source, end: k, id: e[k] });
}
report.checks["6_dangling_endpoints"] = { pass: dangling.length === 0, count: dangling.length, items: dangling.slice(0, 300) };

// ④
const deg = new Map();
for (const e of edges) { deg.set(e.from, (deg.get(e.from) ?? 0) + 1); deg.set(e.to, (deg.get(e.to) ?? 0) + 1); }
const orphans = nodes.filter((n) => !deg.get(n.id)).map((n) => ({ label: n.label, id: n.id, file: n.file, source: n.source }));
report.checks["4_orphans"] = { count: orphans.length, items: orphans };

// ⑤
const norm = (s) => String(s).replace(/[\s_'"`]/g, "");
const tokens = (s) => new Set(String(s).match(/[A-Za-z0-9]+/g) ?? []);
// 値の比較：数値は、定数が算術式（4 * 60 など）なら計算して一致を見る。それ以外は、値に含まれる語・数がすべて定数の値の中にあるか
const valueMatches = (value, text) => {
  if (norm(text).includes(norm(typeof value === "object" ? JSON.stringify(value) : value))) return true;
  if (typeof value === "number" && /^[\d\s*+\-/().]+$/.test(text.replace(/_/g, ""))) {
    try { return Math.abs(Function(`"use strict";return (${text.replace(/_/g, "")})`)() - value) < 1e-9; } catch { /* 続行 */ }
  }
  const have = tokens(text);
  return [...tokens(typeof value === "object" ? JSON.stringify(value) : value)].every((t) => have.has(t));
};
const conflicts = [];
for (const d of dangling) if (d.source === "llm") conflicts.push({ rule: "C1", edge: d.edge, detail: `${d.end} → ${d.id} がグラフにない` });
for (const e of edges) {
  if (e.source !== "llm" || e.type !== "IMPLEMENTS") continue;
  const a = byId.get(e.from);
  if (!a || a.source !== "static") continue;
  if (e.file !== a.file || e.line_start < a.line_start || e.line_end > a.line_end)
    conflicts.push({ rule: "C2", edge: e.id, detail: `エッジの出典 ${e.file}:${e.line_start}-${e.line_end} が ${a.id}（${a.file}:${a.line_start}-${a.line_end}）の外` });
}
for (const n of nodes) {
  if (n.source !== "llm" || n.label !== "Setting" || !n.const_ref) continue;
  const c = byId.get(n.const_ref);
  if (!c) conflicts.push({ rule: "C3", node: n.id, detail: `const_ref ${n.const_ref} がない` });
  else if (n.value !== undefined && n.value !== null && !valueMatches(n.value, c.value_text ?? ""))
    conflicts.push({ rule: "C3", node: n.id, detail: `value=${JSON.stringify(n.value)} が ${c.id} の値（${(c.value_text ?? "").slice(0, 80)}）と一致しない` });
}
report.checks["5_conflicts"] = { count: conflicts.length, items: conflicts };

fs.writeFileSync(outPath, JSON.stringify(report, null, 1));
const P = (b) => (b ? "PASS" : "FAIL");
const c = report.checks;
console.log(`nodes=${nodes.length} edges=${edges.length} source_files=${files.length}`);
console.log(`① 全ソースファイルが Module : ${P(c["1_all_files_are_modules"].pass)} (欠け ${c1.length})`);
console.log(`② 必須属性の欠け          : ${P(c["2_required_attributes"].pass)} (${c["2_required_attributes"].count} 件)`);
console.log(`③ 出典と行範囲            : ${P(c["3_sources_valid"].pass)} (${bad3.length} 件)`);
console.log(`④ 孤立ノード              : ${orphans.length} 件（一覧は ${outPath}）`);
console.log(`⑤ static/llm の矛盾       : ${conflicts.length} 件`);
console.log(`⑥ 端点の欠け              : ${P(c["6_dangling_endpoints"].pass)} (${dangling.length} 件)`);
const ok = c["1_all_files_are_modules"].pass && c["2_required_attributes"].pass && c["3_sources_valid"].pass;
process.exit(ok ? 0 : 1);

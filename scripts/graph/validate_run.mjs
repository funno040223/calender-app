// 抽出役の出力（docs/graph/runs/<batch>.json）を、結合する前に検査する。抽出役自身も実行して直せる。
import fs from "node:fs";
import { execSync } from "node:child_process";
const [file] = process.argv.slice(2);
const run = JSON.parse(fs.readFileSync(file, "utf8"));
const st = JSON.parse(fs.readFileSync("docs/graph/data/static.json", "utf8"));
const seedAreas = JSON.parse(fs.readFileSync("docs/graph/seed_areas.json", "utf8")).map((a) => a.id);
const seedInt = JSON.parse(fs.readFileSync("docs/graph/seed_integrations.json", "utf8"));
const staticById = new Map(st.nodes.map((n) => [n.id, n]));
const tracked = new Set(execSync("git ls-files", { encoding: "utf8" }).split("\n"));
const lines = (f) => fs.readFileSync(f, "utf8").replace(/\n$/, "").split("\n").length;
const errs = [], warns = [];
const LLM_LABELS = ["Feature", "Rule", "Setting", "Integration"];
const own = new Map();
for (const n of run.nodes ?? []) {
  const where = `node ${n.id}`;
  if (!LLM_LABELS.includes(n.label)) errs.push(`${where}: label が不正 (${n.label})`);
  if (!n.id?.startsWith(n.label?.toLowerCase() + ":")) errs.push(`${where}: id の接頭辞が label と合わない`);
  if (n.label === "Integration" && !seedInt.includes(n.id)) errs.push(`${where}: Integration は seed_integrations.json の id だけ使える`);
  if (n.label === "Feature" && seedAreas.includes(n.id)) errs.push(`${where}: 領域（seed_areas.json）は作らず、参照だけする`);
  for (const k of ["name", "description", "file", "line_start", "line_end", "confidence", "evidence"]) if (n[k] === undefined || n[k] === "") errs.push(`${where}: ${k} がない`);
  if (n.label === "Setting" && n.const_ref && !staticById.has(n.const_ref)) errs.push(`${where}: const_ref ${n.const_ref} が静的ノードにない`);
  if (n.label === "Setting" && n.const_ref && (n.value === undefined)) errs.push(`${where}: const_ref があるのに value がない`);
  if (n.file) {
    if (!tracked.has(n.file)) errs.push(`${where}: file ${n.file} が git にない`);
    else { const t = lines(n.file); if (!(n.line_start >= 1 && n.line_end >= n.line_start && n.line_end <= t)) errs.push(`${where}: 行範囲 ${n.line_start}-${n.line_end} が不正（${n.file} は ${t} 行）`); }
  }
  if (own.has(n.id)) errs.push(`${where}: id が重複`);
  own.set(n.id, n);
}
const labelOf = (id) => staticById.get(id)?.label ?? own.get(id)?.label ?? (seedAreas.includes(id) ? "Feature" : seedInt.includes(id) ? "Integration" : null);
const RULES = {
  IMPLEMENTS: [["Module", "Function", "Type", "Constant", "Table", "Route"], ["Feature", "Rule", "Setting"]],
  PART_OF: [["Feature", "Rule", "Setting"], ["Feature"]],
  DEPENDS_ON: [["Feature"], ["Feature", "Integration"]],
  CONFIGURED_BY: [["Feature", "Rule"], ["Setting"]],
};
const seen = new Set();
for (const e of run.edges ?? []) {
  const where = `edge ${e.type} ${e.from} -> ${e.to}`;
  if (!RULES[e.type]) { errs.push(`${where}: type が不正`); continue; }
  const a = labelOf(e.from), b = labelOf(e.to);
  if (!a) errs.push(`${where}: from がグラフにない`); else if (!RULES[e.type][0].includes(a)) errs.push(`${where}: from のラベル ${a} はこの種類で使えない`);
  if (!b) errs.push(`${where}: to がグラフにない`); else if (!RULES[e.type][1].includes(b)) errs.push(`${where}: to のラベル ${b} はこの種類で使えない`);
  for (const k of ["file", "line_start", "line_end"]) if (e[k] === undefined) errs.push(`${where}: ${k} がない`);
  if (e.file && tracked.has(e.file)) {
    const t = lines(e.file);
    if (!(e.line_start >= 1 && e.line_end >= e.line_start && e.line_end <= t)) errs.push(`${where}: 行範囲 ${e.line_start}-${e.line_end} が不正（${e.file} は ${t} 行）`);
  } else if (e.file) errs.push(`${where}: file ${e.file} が git にない`);
  if (e.type === "IMPLEMENTS" && staticById.has(e.from)) {
    const s = staticById.get(e.from);
    if (e.file !== s.file || e.line_start < s.line_start || e.line_end > s.line_end) errs.push(`${where}: 出典 ${e.file}:${e.line_start}-${e.line_end} が ${s.id} の範囲 ${s.file}:${s.line_start}-${s.line_end} の外（矛盾 C2）`);
  }
  const key = `${e.type}|${e.from}|${e.to}`;
  if (seen.has(key)) warns.push(`${where}: 重複`); seen.add(key);
}
// 参照されないノード
const used = new Set((run.edges ?? []).flatMap((e) => [e.from, e.to]));
for (const n of run.nodes ?? []) if (!used.has(n.id)) warns.push(`node ${n.id}: エッジがない（孤立）`);
const cnt = (a, k) => a.reduce((o, x) => ((o[x[k]] = (o[x[k]] ?? 0) + 1), o), {});
console.log(`nodes ${run.nodes?.length ?? 0} ${JSON.stringify(cnt(run.nodes ?? [], "label"))} / edges ${run.edges?.length ?? 0} ${JSON.stringify(cnt(run.edges ?? [], "type"))}`);
for (const w of warns.slice(0, 30)) console.log("WARN", w);
for (const e of errs.slice(0, 60)) console.log("ERROR", e);
console.log(errs.length ? `NG: エラー ${errs.length} 件` : "OK");
process.exit(errs.length ? 1 : 0);

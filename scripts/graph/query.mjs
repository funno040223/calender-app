// graph.json の読み取り専用の検索（評価役向け。Neo4j の読み取り専用接続の代わり）。
// 使い方：
//   node scripts/graph/query.mjs stats
//   node scripts/graph/query.mjs node <id>            ノードと、その出入りのエッジ
//   node scripts/graph/query.mjs find <部分文字列> [label]   id・name・description の検索
//   node scripts/graph/query.mjs list <label> [source]  ノード一覧（id / name / file:line）
//   node scripts/graph/query.mjs edges <type> [source]  エッジ一覧
//   node scripts/graph/query.mjs sample <label> <n> [seed]  llm ノードの無作為抽出
import fs from "node:fs";
const g = JSON.parse(fs.readFileSync(process.env.GRAPH ?? "docs/graph/data/graph.json", "utf8"));
const byId = new Map(g.nodes.map((n) => [n.id, n]));
const [cmd, a, b, c] = process.argv.slice(2);
const fmt = (n) => `${n.id}  [${n.source}] ${n.name}  ${n.file}:${n.line_start}-${n.line_end}`;
const efmt = (e) => `${e.type} [${e.source}] ${e.from} -> ${e.to}  ${e.file}:${e.line_start}-${e.line_end}`;
if (cmd === "stats") {
  const cnt = (arr, f) => arr.reduce((o, x) => ((o[f(x)] = (o[f(x)] ?? 0) + 1), o), {});
  console.log(cnt(g.nodes, (n) => `${n.source}/${n.label}`), cnt(g.edges, (e) => `${e.source}/${e.type}`));
} else if (cmd === "node") {
  const n = byId.get(a); if (!n) { console.log("なし"); process.exit(1); }
  console.log(JSON.stringify(n, null, 1));
  for (const e of g.edges) if (e.from === a || e.to === a) console.log(" ", efmt(e));
} else if (cmd === "find") {
  const q = a.toLowerCase();
  for (const n of g.nodes) if ((!b || n.label === b) && `${n.id} ${n.name} ${n.description ?? ""}`.toLowerCase().includes(q)) console.log(fmt(n));
} else if (cmd === "list") {
  for (const n of g.nodes) if (n.label === a && (!b || n.source === b)) console.log(fmt(n));
} else if (cmd === "edges") {
  for (const e of g.edges) if (e.type === a && (!b || e.source === b)) console.log(efmt(e));
} else if (cmd === "sample") {
  let s = Number(c ?? 1) || 1; const rnd = () => ((s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296);
  const pool = g.nodes.filter((n) => n.source === "llm" && (a === "*" || n.label === a));
  for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
  for (const n of pool.slice(0, Number(b ?? 5))) console.log(fmt(n));
} else console.log("コマンド: stats | node | find | list | edges | sample");

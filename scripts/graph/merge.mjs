// static.json ＋ 領域 seed ＋ docs/graph/runs/*.json（llm 抽出）＋ docs/graph/fixes.json（修正の上書き）→ graph.json
import fs from "node:fs";
const st = JSON.parse(fs.readFileSync("docs/graph/data/static.json", "utf8"));
const seed = JSON.parse(fs.readFileSync("docs/graph/seed_areas.json", "utf8"));
const nodes = new Map(st.nodes.map((n) => [n.id, n]));
const edges = new Map(st.edges.map((e) => [e.id, e]));
const modLines = (f) => nodes.get(`module:${f}`)?.line_end ?? 1;
for (const a of seed) nodes.set(a.id, { id: a.id, label: "Feature", name: a.name, source: "llm", file: a.file, line_start: 1, line_end: modLines(a.file), description: `領域：${a.name}`, confidence: "high", evidence: "画面・ディレクトリ構成から決めた最上位の領域（代表ファイルを出典にした）", area: true });
const addEdge = (e, batch) => {
  const id = `${e.type}:${e.from}->${e.to}`;
  if (edges.has(id)) { const x = edges.get(id); (x.also_seen ??= []).push({ batch, file: e.file, line_start: e.line_start, line_end: e.line_end }); return; }
  edges.set(id, { id, type: e.type, from: e.from, to: e.to, source: "llm", file: e.file, line_start: e.line_start, line_end: e.line_end, batch, ...(e.note ? { note: e.note } : {}) });
};
const addNode = (n, batch) => {
  if (nodes.has(n.id)) { const x = nodes.get(n.id); (x.also_seen ??= []).push({ batch, file: n.file, line_start: n.line_start, line_end: n.line_end, description: n.description }); return; }
  nodes.set(n.id, { ...n, source: "llm", batch });
};
const runs = fs.readdirSync("docs/graph/runs").filter((f) => /^b\d+_.*\.json$/.test(f)).sort();
for (const f of runs) {
  const r = JSON.parse(fs.readFileSync(`docs/graph/runs/${f}`, "utf8"));
  const batch = f.replace(/\.json$/, "");
  for (const n of r.nodes ?? []) addNode(n, batch);
  for (const e of r.edges ?? []) addEdge(e, batch);
}
// 修正の上書き（評価後の修正ラウンドで使う）
if (fs.existsSync("docs/graph/fixes.json")) {
  const fx = JSON.parse(fs.readFileSync("docs/graph/fixes.json", "utf8"));
  // ノードの併合：from を into に寄せる（エッジの付け替え・重複と自己ループの除去・元の id を merged_from に残す）
  for (const [from, into] of Object.entries(fx.merge_nodes ?? {})) {
    const a = nodes.get(from), b = nodes.get(into);
    if (!a || !b) { console.warn("merge: ノードなし", from, into); continue; }
    (b.merged_from ??= []).push({ id: from, name: a.name, file: a.file, line_start: a.line_start, line_end: a.line_end });
    nodes.delete(from);
    for (const [k, e] of [...edges]) {
      if (e.from !== from && e.to !== from) continue;
      edges.delete(k);
      const ne = { ...e, from: e.from === from ? into : e.from, to: e.to === from ? into : e.to };
      if (ne.from === ne.to) continue;
      const nid = `${ne.type}:${ne.from}->${ne.to}`;
      if (!edges.has(nid)) edges.set(nid, { ...ne, id: nid });
    }
  }
  for (const id of fx.remove_nodes ?? []) { nodes.delete(id); for (const [k, e] of edges) if (e.from === id || e.to === id) edges.delete(k); }
  for (const id of fx.remove_edges ?? []) edges.delete(id);
  for (const [id, patch] of Object.entries(fx.patch_nodes ?? {})) if (nodes.has(id)) Object.assign(nodes.get(id), patch); else console.warn("patch: ノードなし", id);
  for (const n of fx.add_nodes ?? []) nodes.set(n.id, { source: "llm", batch: "fixes", ...n });
  for (const e of fx.add_edges ?? []) addEdge(e, "fixes");
}
const out = { generated: new Date().toISOString(), nodes: [...nodes.values()], edges: [...edges.values()] };
fs.writeFileSync("docs/graph/data/graph.json", JSON.stringify(out));
const cnt = (a, k) => a.reduce((o, x) => ((o[`${x.source}/${x[k]}`] = (o[`${x.source}/${x[k]}`] ?? 0) + 1), o), {});
console.log("runs", runs.length, "nodes", out.nodes.length, cnt(out.nodes, "label"), "edges", out.edges.length, cnt(out.edges, "type"));

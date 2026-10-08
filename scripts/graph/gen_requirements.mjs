// graph.json から docs/requirements/as-is.md を機械的に作る（グラフにない記述は書かない）。
import fs from "node:fs";
const g = JSON.parse(fs.readFileSync("docs/graph/data/graph.json", "utf8"));
const rep = JSON.parse(fs.readFileSync("docs/graph/data/check_report.json", "utf8"));
const rounds = [1, 2, 3].map((n) => JSON.parse(fs.readFileSync(`docs/graph/reviews/round${n}.json`, "utf8")));
const byId = new Map(g.nodes.map((n) => [n.id, n]));
const seedAreas = JSON.parse(fs.readFileSync("docs/graph/seed_areas.json", "utf8")).map((a) => a.id);
const esc = (s) => String(s ?? "").replace(/\|/g, "\\|").replace(/\n/g, " ");
const src = (n) => `${n.file}:${n.line_start}${n.line_end !== n.line_start ? "-" + n.line_end : ""}`;
const ns = (id) => id.split(":")[1].split("/")[0];

// 修正後に再評価していないノード（評価の指摘で直したもの）
const corrected = new Map([
  ["setting:planner/max-wake-shift", "round1 #5：所属を起床の計算に修正（再評価なし）"],
  ["rule:weather/stale-forecast-ignored", "round2：重複する rule:weather/stale-forecast（境界の誤り）を併合（再評価なし）"],
  ["rule:habits/morning-order", "round2：「直後」を「5分後」に修正（再評価なし）"],
  ["setting:planner/evening-from-minute", "round3：境界（17:00を含む）・帰宅時刻・就寝前の条件を修正（再評価なし）"],
]);
const mark = (n) => (corrected.has(n.id) ? " †" : n.confidence && n.confidence !== "high" ? " △" : "");

// 木の組み立て
const partOf = new Map();
for (const e of g.edges) if (e.type === "PART_OF") (partOf.get(e.from) ?? partOf.set(e.from, []).get(e.from)).push(e);
const primaryParent = (n) => {
  const ps = (partOf.get(n.id) ?? []).map((e) => byId.get(e.to)).filter(Boolean);
  return ps.find((p) => ns(p.id) === ns(n.id)) ?? ps[0] ?? null;
};
const kids = new Map();
const rootless = [];
for (const n of g.nodes.filter((n) => n.source === "llm" && ["Feature", "Rule", "Setting"].includes(n.label) && !n.area)) {
  const p = primaryParent(n);
  if (p) (kids.get(p.id) ?? kids.set(p.id, []).get(p.id)).push(n); else rootless.push(n);
}
const cmp = (a, b) => a.id.localeCompare(b.id);
const out = [];
const counters = { FR: 0, BR: 0, ST: 0 };
const feId = new Map(), ruleId = new Map(), stId = new Map();
const impl = (id) => g.edges.filter((e) => e.type === "IMPLEMENTS" && e.to === id && e.from).length;
const cfg = new Map();
for (const e of g.edges) if (e.type === "CONFIGURED_BY") (cfg.get(e.from) ?? cfg.set(e.from, []).get(e.from)).push(e.to);
const deps = new Map();
for (const e of g.edges) if (e.type === "DEPENDS_ON") (deps.get(e.from) ?? deps.set(e.from, []).get(e.from)).push(e);

const seen = new Set();
function renderFeature(f, depth) {
  if (seen.has(f.id)) return; seen.add(f.id);
  const code = `FR-${String(++counters.FR).padStart(3, "0")}`; feId.set(f.id, code);
  out.push(`${"#".repeat(Math.min(6, 3 + depth))} ${code} ${f.name}${mark(f)}`, "", `- ノード：\`${f.id}\`　出典：\`${src(f)}\``, f.area ? "" : `- ${esc(f.description)}`);
  const d = deps.get(f.id) ?? [];
  if (d.length) out.push(`- 前提：${d.map((e) => `\`${e.to}\`（\`${src(e)}\`）`).join("、")}`);
  out.push("");
  const ks = (kids.get(f.id) ?? []).sort(cmp);
  const rules = ks.filter((k) => k.label === "Rule"), sets = ks.filter((k) => k.label === "Setting"), subs = ks.filter((k) => k.label === "Feature");
  if (rules.length) {
    out.push("| ID | 業務ルール | ノード | 出典 | 関連する設定 |", "|---|---|---|---|---|");
    for (const r of rules) {
      const c = `BR-${String(++counters.BR).padStart(4, "0")}`; ruleId.set(r.id, c);
      const cs = (cfg.get(r.id) ?? []).map((s) => `\`${s}\``).join(" ");
      out.push(`| ${c} | ${esc(r.name)}${mark(r)} | \`${r.id}\` | \`${src(r)}\` | ${cs} |`);
    }
    out.push("");
  }
  if (sets.length) {
    out.push("| ID | 設定・調整値 | 値 | ノード | 出典 |", "|---|---|---|---|---|");
    for (const s of sets) {
      const c = `ST-${String(++counters.ST).padStart(3, "0")}`; stId.set(s.id, c);
      const v = s.value === undefined ? "—" : typeof s.value === "object" ? JSON.stringify(s.value) : String(s.value);
      out.push(`| ${c} | ${esc(s.name)}${mark(s)} | ${esc(v).slice(0, 80)} | \`${s.id}\` | \`${src(s)}\` |`);
    }
    out.push("");
  }
  for (const sf of subs) renderFeature(sf, depth + 1);
}

const areas = seedAreas.map((id) => byId.get(id));
const body = [];
const saved = out.splice(0);
for (const a of areas) renderFeature(a, 0);
for (const n of rootless.filter((n) => n.label === "Feature")) renderFeature(n, 0);
const bodyLines = out.splice(0);

// 外部連携・データ
const ints = g.nodes.filter((n) => n.label === "Integration").sort(cmp);
const intRows = ints.map((n) => `| \`${n.id}\` | ${esc(n.name)}${mark(n)} | ${esc(n.description)} | \`${src(n)}\` | ${g.edges.filter((e) => e.type === "DEPENDS_ON" && e.to === n.id).length} |`);
const tables = g.nodes.filter((n) => n.label === "Table").sort(cmp);
const tblRows = tables.map((n) => `| \`${n.id}\` | \`${src(n)}\` | ${g.edges.filter((e) => e.type === "USES" && e.to === n.id).map((e) => e.from).filter((x, i, a) => a.indexOf(x) === i).length} |`);
const routes = g.nodes.filter((n) => n.label === "Route").sort((a, b) => a.name.localeCompare(b.name));
const routeRows = routes.map((n) => `| ${n.route_kind} | \`${n.name}\` | ${(n.methods ?? []).join(",") || "—"} | \`${n.file}\` |`);

// 要確認
const todo = [];
for (const [k, v] of rounds.entries()) for (const s of v.sampled.filter((s) => s.verdict !== "正しい")) todo.push(`| round${k + 1} | \`${s.id}\` | ${s.verdict} | ${esc(s.reason).slice(0, 220)} | ${corrected.has(s.id) || s.verdict ? (g.nodes.some((n) => n.id === s.id) ? (corrected.has(s.id) ? "修正済み・再評価なし" : "未対応") : "グラフから除去（併合・削除）") : ""} |`);
const meds = g.nodes.filter((n) => n.source === "llm" && n.confidence && n.confidence !== "high").sort(cmp);
const medRows = meds.map((n) => `| \`${n.id}\` | ${n.confidence} | ${esc(n.evidence).slice(0, 160)} | \`${src(n)}\` |`);
const conf = rep.checks["5_conflicts"].items;

const cnt = (arr, f) => arr.reduce((o, x) => ((o[f(x)] = (o[f(x)] ?? 0) + 1), o), {});
const head = `# 現状機能の要件定義書（As-Is）— task-rhythm-app

> このファイルは \`scripts/graph/gen_requirements.mjs\` が \`docs/graph/data/graph.json\`（ナレッジグラフ）から機械的に作ったものです。手で直さず、グラフ（\`docs/graph/\`）を直して作り直してください。
> すべての項目に、グラフのノード id と出典（ファイル:行）が付いています。出典のない記述は含めていません。

## 0. この文書の読み方

- **範囲**：リポジトリのコード（src/・supabase/・public/・scripts/・設定）から読み取れる現状の機能。目的・背景・今後の予定は、コードに根拠がないため書いていません。
- **凡例**：FR＝機能、BR＝業務ルール、ST＝設定・調整値。各行の「ノード」は \`docs/graph/data/graph.json\` の id、「出典」は \`ファイル:開始行-終了行\`。
- **マーク**：△＝抽出時の確信が medium（根拠が間接的・他ファイル依存など）。†＝評価の指摘を受けて修正したが、修正後の再評価をしていない（要確認事項の 11.1）。
- **根拠の強さ**：意味ノード（FR/BR/ST）は LLM がコードを読んで抽出し、評価役（独立）が3ラウンドでノード60件・エッジ20本を抜き取って検証した。全件を人が確かめたものではない。評価結果は \`docs/graph/review.md\`。
- **構成**：2 機能領域（各領域に機能・ルール・設定）、3 外部連携、4 データ（表）、5 画面・API、6 検証の結果、7 要確認事項。

## 1. グラフの規模

| 種別 | 件数 |
|---|---|
${Object.entries(cnt(g.nodes, (n) => `${n.label}（${n.source}）`)).map(([k, v]) => `| ${k} | ${v} |`).join("\n")}
${Object.entries(cnt(g.edges, (e) => `${e.type}（${e.source}）`)).map(([k, v]) => `| エッジ ${k} | ${v} |`).join("\n")}

## 2. 機能領域ごとの要件
`;
const doc = [head, ...bodyLines,
  "## 3. 外部連携", "", "| ノード | 名前 | 内容 | 出典 | 依存する機能の数 |", "|---|---|---|---|---|", ...intRows, "",
  "## 4. データ（Supabase の表）", "", "表の存在と出典は静的解析（source=static）。各表を使う関数の数を併記。表ごとの意味（RLS の方針など）は、上の領域のルール（\`rule:auth/…\` など）を参照。", "", "| ノード | 出典 | 使う関数・モジュールの数 |", "|---|---|---|", ...tblRows, "",
  "## 5. 画面と API（Route）", "", "静的解析（Next.js のファイル規約）による。画面・API が実現する機能は、各領域の「出典」の欄から辿れる。", "", "| 種別 | パス | メソッド | ファイル |", "|---|---|---|---|", ...routeRows, "",
  "## 6. 検証の結果（run_checks）", "",
  `- ① 全ソースファイルが Module：${rep.checks["1_all_files_are_modules"].pass ? "合格" : "不合格"}（対象 ${rep.checks["1_all_files_are_modules"].source_files} ファイル）`,
  `- ② 必須属性の欠け：${rep.checks["2_required_attributes"].pass ? "合格（0件）" : "不合格"}`,
  `- ③ 出典ファイルの実在と行範囲：${rep.checks["3_sources_valid"].pass ? "合格（0件）" : "不合格"}`,
  `- ④ 孤立ノード：${rep.checks["4_orphans"].count} 件`,
  `- ⑤ static と llm の矛盾：${conf.length} 件（原因は \`docs/graph/open_issues.md\`）`,
  "",
  "## 7. 要確認事項", "",
  "### 7.1 評価で「誤り」「根拠不足」とされた要素", "",
  "評価役が抜き取りで見つけた指摘。修正後は再評価していない（3ラウンドで打ち切ったため）。", "",
  "| ラウンド | ノード／エッジ | 判定 | 理由 | 現在の扱い |", "|---|---|---|---|---|", ...todo, "",
  "### 7.2 抽出時の確信が medium の要素", "", `${meds.length} 件。本文では △ を付けている。根拠が間接的、または実体が別のファイルにある。`, "",
  "| ノード | 確信 | 理由（抽出時の記述） | 出典 |", "|---|---|---|---|", ...medRows, "",
  "### 7.3 その他", "",
  "- 評価で、同じ内容のノードの重複が残っていると指摘された組：\`rewards/habit\` と \`rewards/habit-tracked-only\`、\`ical-export-feed\` と \`ical/feed-endpoint\`（併合していない）。",
  "- 画面の文言とコードの食い違い（評価役の指摘）：iCal 配信の期間はコード上 15 日先（\`src/lib/ical/feed.ts:8,18\`）だが、設定画面の文言は「14日先」（\`src/components/settings/Feed.tsx:55\`）。",
  "- 他の未解決事項は \`docs/graph/open_issues.md\`。", ""];
fs.mkdirSync("docs/requirements", { recursive: true });
fs.writeFileSync("docs/requirements/as-is.md", doc.join("\n"));
console.log("as-is.md", doc.join("\n").length, "文字", counters, "rootless", rootless.length, "unrendered features", g.nodes.filter((n) => n.label === "Feature" && !seen.has(n.id)).length);

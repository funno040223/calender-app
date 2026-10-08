// LLM 抽出のバッチ割りと、各バッチに渡す入力（静的ノードの一覧）の生成。
import fs from "node:fs";
const g = JSON.parse(fs.readFileSync("docs/graph/data/static.json", "utf8"));
const mods = g.nodes.filter((n) => n.label === "Module").map((n) => n.file);
const S = "src/lib/scheduler/", M = "src/lib/mock/";
const pick = (...pats) => mods.filter((f) => pats.some((p) => (p instanceof RegExp ? p.test(f) : f === p || (p.endsWith("/") && f.startsWith(p)))));
const B = {
  b01_scheduler_core: pick(S + "planner.ts", S + "planner.test.ts", S + "types.ts", S + "dayload.ts", S + "intervals.ts", S + "time.ts", S + "travel.ts", S + "index.ts"),
  b02_scheduler_rest: pick(S).filter((f) => !B_has("b01", f)),
  b03_mock_model: pick(M + "model.ts", M + "model.test.ts", M + "sample.ts", M + "state.ts", M + "state.test.ts", M + "jst.ts", M + "calendars.ts", M + "utokyo.ts"),
  b04_mock_store: pick(M + "store.ts", M + "store.test.tsx", M + "merge.ts", M + "merge.test.ts", M + "bedtime.ts", M + "bedtime.test.ts", M + "night.ts", M + "night.test.ts"),
  b05_mock_analysis: pick(M + "insights.ts", M + "insights.test.ts", M + "stats.ts", M + "stats.test.ts", M + "progress.ts", M + "recovery.ts", M + "recovery.test.ts", M + "related.ts", M + "related.test.ts", M + "notion.ts", M + "notion.test.ts", M + "habit-miss.test.ts", M + "review-2026-10-03.test.ts"),
  b06_lib_services: pick("src/lib/ical/", "src/lib/health/", "src/lib/notify/", "src/lib/notion/", "src/lib/push/", "src/lib/weather/", "src/lib/server/", "src/lib/supabase/", "src/lib/sync/", "src/lib/appPath.ts", "src/lib/appPath.test.ts", "src/lib/localDebug.ts", "src/lib/review-regression.test.ts", "src/proxy.ts"),
  b07_app_infra: pick("src/app/", "public/sw.js", "scripts/make-icons.mjs", "supabase/", "package.json", "tsconfig.json", "next.config.ts", "eslint.config.mjs", "postcss.config.mjs", "vitest.config.mts", ".env.example"),
  b08_components_today: pick("src/components/today/"),
  b09_components_calendar: pick("src/components/calendar/"),
  b10_components_settings: pick("src/components/settings/"),
  b11_components_misc: pick("src/components/tasks/", "src/components/stats/", "src/components/app/", "src/components/ui/"),
};
function B_has(_, f) { return [S + "planner.ts", S + "planner.test.ts", S + "types.ts", S + "dayload.ts", S + "intervals.ts", S + "time.ts", S + "travel.ts", S + "index.ts"].includes(f); }
const all = Object.values(B).flat();
const dup = all.filter((f, i) => all.indexOf(f) !== i), miss = mods.filter((f) => !all.includes(f));
if (dup.length || miss.length) { console.error("dup", dup, "missing", miss); process.exit(1); }
fs.mkdirSync("docs/graph/runs/input", { recursive: true });
for (const [name, files] of Object.entries(B)) {
  let out = `# バッチ ${name}（${files.length} ファイル）\n\n各ファイルの静的ノード（id / 行範囲）。意味ノードのエッジは、ここにある id を参照すること。\n\n`;
  for (const f of files) {
    const m = g.nodes.find((n) => n.id === `module:${f}`);
    out += `## ${f}  (kind=${m.kind}, ${m.loc} 行, id=${m.id})\n`;
    for (const n of g.nodes.filter((n) => n.file === f && n.label !== "Module" && n.label !== "Route")) {
      out += `- ${n.id}  L${n.line_start}-${n.line_end}${n.label === "Constant" ? "  = " + n.value_text.slice(0, 80) : ""}\n`;
    }
    for (const n of g.nodes.filter((n) => n.file === f && n.label === "Route")) out += `- ${n.id}  (${n.route_kind} ${n.methods?.join(",") ?? ""})\n`;
    out += "\n";
  }
  fs.writeFileSync(`docs/graph/runs/input/${name}.md`, out);
  console.log(name, files.length, files.reduce((a, f) => a + g.nodes.find((n) => n.id === `module:${f}`).loc, 0), "loc");
}
fs.writeFileSync("docs/graph/data/batches.json", JSON.stringify(B, null, 1));

// 評価の指摘を graph に反映する修正（docs/graph/fixes.json）を作る。merge.mjs が fixes.json を最後に適用する。
// 実行：node scripts/graph/merge.mjs（fixes なしの素の結合）→ node scripts/graph/make_fixes.mjs → node scripts/graph/merge.mjs
import fs from "node:fs";
const round = process.argv[2] ?? "r1";
const g = JSON.parse(fs.readFileSync("docs/graph/data/graph.json", "utf8"));
const has = (id) => g.nodes.some((n) => n.id === id);
const fx = { merge_nodes: {}, patch_nodes: {}, add_nodes: [], add_edges: [], remove_edges: [] };

// (1) 同じ設定項目の重複：id の末尾が同じ Setting、または同じ const_ref を持つ Setting をひとつにまとめる（D-14）
const PRIORITY = ["planner", "rhythm", "night", "progress", "tasks", "notifications", "recovery", "calendar", "settings"];
const rank = (id) => { const i = PRIORITY.indexOf(id.split(":")[1].split("/")[0]); return i < 0 ? 99 : i; };
const groups = new Map();
for (const n of g.nodes.filter((n) => n.label === "Setting")) {
  for (const k of [`slug:${n.id.split("/").pop()}`, n.const_ref ? `const:${n.const_ref}` : null].filter(Boolean)) (groups.get(k) ?? groups.set(k, []).get(k)).push(n.id);
}
for (const ids of groups.values()) {
  if (ids.length < 2) continue;
  const canon = [...ids].sort((a, b) => rank(a) - rank(b) || a.localeCompare(b))[0];
  for (const id of ids) if (id !== canon && !fx.merge_nodes[id]) fx.merge_nodes[id] = canon;
}
// (2) 同じ意味の Rule の重複（手で確認したもの）
const dupRules = { "rule:planner/keep-free-no-autofill": "rule:planner/keep-free-busy", "rule:notifications/replan-does-not-write-app-state": "rule:notifications/replan-writes-schedule-only" };
for (const [a, b] of Object.entries(dupRules)) if (has(a) && has(b)) fx.merge_nodes[a] = b;

// (0) round0：どのバッチも作らなかった Integration（結合時の端点の欠けの解消）
fx.add_nodes.push(
  { id: "integration:open-meteo", label: "Integration", name: "Open-Meteo（天気予報・地名検索の外部 API）", description: "地名の検索（geocoding）と雨の確率の予報を、認証なしの外部 API から取得する。", file: "src/lib/weather/openMeteo.ts", line_start: 14, line_end: 42, confidence: "high", evidence: "geocoding-api.open-meteo.com と api.open-meteo.com へ fetch している" },
  { id: "integration:browser-storage", label: "Integration", name: "ブラウザの localStorage（端末内の控え）", description: "画面側の保存の控えと所有者の記録を localStorage に持つ。", file: "src/lib/mock/store.ts", line_start: 24, line_end: 43, confidence: "high", evidence: "localStorage の読み書き・削除を行っている" },
);
// (3) 評価 round1 #5：max-wake-shift の所属は起床の計算
fx.remove_edges.push("PART_OF:setting:planner/max-wake-shift->feature:planner/morning-routine-prep");
const tpl = (type, from, to, file, ls, le, note) => ({ type, from, to, file, line_start: ls, line_end: le, note });
fx.add_edges.push(tpl("PART_OF", "setting:planner/max-wake-shift", "feature:rhythm/wake-calc", "src/lib/scheduler/rhythm.ts", 133, 133, "評価 round1 #5 の指摘による所属の修正"));
fx.add_edges.push(tpl("CONFIGURED_BY", "rule:rhythm/daily-shift-limit", "setting:planner/max-wake-shift", "src/lib/scheduler/rhythm.ts", 133, 133, "評価 round1 #5：ルールと設定を結ぶ"));

// (4) 評価 round1 の漏れ：Notion API のタイムアウト
fx.add_nodes.push({ id: "setting:notion/api-timeout", label: "Setting", name: "Notion API 呼び出しのタイムアウト（15秒）", description: "Notion API の呼び出しは15秒で打ち切る（AbortSignal.timeout(15_000)）。", file: "src/lib/notion/api.ts", line_start: 12, line_end: 12, confidence: "high", evidence: "fetch の signal に 15_000 ミリ秒のタイムアウトを渡している", value: 15000 });
fx.add_edges.push(tpl("IMPLEMENTS", "fn:src/lib/notion/api.ts#call", "setting:notion/api-timeout", "src/lib/notion/api.ts", 12, 12));
fx.add_edges.push(tpl("PART_OF", "setting:notion/api-timeout", "feature:notion/read-table", "src/lib/notion/api.ts", 12, 12));

// (5) 評価 round1 の漏れ：API の Route から機能へ。Route が属する Module が IMPLEMENTS している Feature を Route にも付ける（派生）
for (const r of g.nodes.filter((n) => n.label === "Route" && n.route_kind === "api")) {
  const inFile = new Set(g.nodes.filter((n) => n.file === r.file && n.source === "static").map((n) => n.id));
  const targets = [...new Set(g.edges.filter((e) => e.type === "IMPLEMENTS" && inFile.has(e.from)).map((e) => e.to))];
  const feats = targets.filter((t) => g.nodes.find((n) => n.id === t)?.label === "Feature");
  for (const t of feats.length ? feats : targets.slice(0, 3)) fx.add_edges.push(tpl("IMPLEMENTS", r.id, t, r.file, r.line_start, r.line_end, "派生：Route の Module が実現している意味ノードを Route にも付けた"));
}

// (6) 評価 round2 の指摘
fx.merge_nodes["rule:weather/stale-forecast"] = "rule:weather/stale-forecast-ignored"; // 誤り：境界（24時間を超えたら）。実装側のノードに併合
fx.patch_nodes["rule:habits/morning-order"] = { description: "朝ルーティン → 朝食 → 散歩の順に、それぞれ前の場面の終わりの5分後（CUE_GAP_MINUTES）に置く。朝食がない日の散歩は朝ルーティンの終わりの5分後。", evidence: "テスト（cue.test.ts:118-131）と types.ts:111・planner.ts:422 から。評価 round2 の指摘で「直後」を「5分後」に修正" };
fx.remove_edges.push("CONFIGURED_BY:rule:planner/energy-day-used->setting:planner/daily-energy-budget"); // 根拠不足：上限で挙動が変わるのは別の提案処理
fx.add_nodes.push(
  { id: "rule:habits/delete-keeps-marks", label: "Rule", name: "習慣を消すとき、5分以下の習慣の「少しだけ」の記録を「やった」に書き換えて、たまったご褒美が減らないようにする", description: "習慣の削除時に keepMarkValues(…, Infinity) で、少しだけ（半分のご褒美）の記録を「やった」の値に直してから消す。", file: "src/components/settings/Habits.tsx", line_start: 183, line_end: 188, confidence: "high", evidence: "評価 round2 の指摘。keepMarkValues を削除の経路で呼んでいる" },
  { id: "integration:ical-js", label: "Integration", name: "ical.js（iCal の読み取り・書き出しのライブラリ）", description: "iCal の読み取り（繰り返しの展開・タイムゾーンの登録）と配信用の書き出しに使う外部パッケージ。", file: "src/lib/ical/import.ts", line_start: 1, line_end: 48, confidence: "high", evidence: "package.json の依存と import.ts・export.ts での使用。評価 round2 の指摘" },
);
fx.add_edges.push(
  tpl("IMPLEMENTS", "fn:src/components/settings/Habits.tsx#HabitForm", "rule:habits/delete-keeps-marks", "src/components/settings/Habits.tsx", 183, 188),
  tpl("PART_OF", "rule:habits/delete-keeps-marks", "feature:habits", "src/components/settings/Habits.tsx", 183, 188),
  tpl("IMPLEMENTS", "fn:src/lib/mock/state.ts#rainyDayKeys", "rule:weather/stale-forecast-ignored", "src/lib/mock/state.ts", 726, 727),
  tpl("DEPENDS_ON", "feature:ical", "integration:ical-js", "src/lib/ical/import.ts", 1, 48),
);
for (const r of ["rule:planner/hold-task-count", "rule:planner/keep-finished-habit-today", "rule:rewards/bank-carries-confirmed", "rule:quick-add/weekday-deadline", "rule:notifications/quiet-hours"])
  fx.add_edges.push(tpl("IMPLEMENTS", "module:src/lib/review-regression.test.ts", r, "src/lib/review-regression.test.ts", 10, 57, "テストと対応するルールのつながり（評価 round2 の指摘）"));
for (const r of ["rule:timetable/skip-cancelled-and-closed-days", "rule:timetable/course-optional-attendance"])
  fx.add_edges.push(tpl("IMPLEMENTS", "module:src/lib/mock/model.test.ts", r, "src/lib/mock/model.test.ts", 22, 49, "テストと対応するルールのつながり（評価 round2 の指摘）"));

// (7) 評価 round3 の指摘（第3ラウンドで打ち切ったため、この修正は再評価していない）
fx.patch_nodes["setting:planner/evening-from-minute"] = { description: "予定の多い日（heavy）で、最後の外出から家に着く時刻（予定の終わり＋帰りの移動、または homeAt）が17:00以降（ちょうどを含む）かつ就寝より前なら、その時刻から夜とする（eveningFrom）。", evidence: "planner.ts:343 の条件 last >= dayStart + EVENING_FROM_MINUTE && last < bed。評価 round3 の指摘で修正", corrected_after_round3: true, line_start: 34, line_end: 34 };
fx.add_nodes.push(
  { id: "integration:sharp", label: "Integration", name: "sharp（アイコン画像の生成ライブラリ）", description: "アプリのアイコンの PNG を SVG から作る（scripts/make-icons.mjs）。package.json の依存には書かれていない。", file: "scripts/make-icons.mjs", line_start: 2, line_end: 25, confidence: "high", evidence: "make-icons.mjs が sharp を import して resize・png している。評価 round3 の指摘" },
  { id: "rule:auth/no-delete-push-schedule", label: "Rule", name: "通知の一覧（push_schedule）は、画面（本人）からは削除できない", description: "push_schedule には select・insert・update の方針だけがあり、delete の方針がないため、本人の権限では消せない。", file: "supabase/migrations/0003_push.sql", line_start: 46, line_end: 62, confidence: "high", evidence: "push_schedule の create policy が読む・作る・更新するの3つだけ。評価 round3 の指摘" },
);
fx.add_edges.push(
  tpl("DEPENDS_ON", "feature:pwa", "integration:sharp", "scripts/make-icons.mjs", 2, 25, "評価 round3 の指摘"),
  tpl("IMPLEMENTS", "module:supabase/migrations/0003_push.sql", "rule:auth/no-delete-push-schedule", "supabase/migrations/0003_push.sql", 46, 62),
  tpl("PART_OF", "rule:auth/no-delete-push-schedule", "feature:auth", "supabase/migrations/0003_push.sql", 46, 62),
);
fs.writeFileSync("docs/graph/fixes.json", JSON.stringify(fx, null, 1));
console.log(round, "merge", Object.keys(fx.merge_nodes).length, "add_edges", fx.add_edges.length, "add_nodes", fx.add_nodes.length);

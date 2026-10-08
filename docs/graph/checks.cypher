// 検証クエリ（Neo4j 用）。JSON 代替では scripts/graph/run_checks.mjs が同じ内容を実行する。
// パラメータ：$files = ソースファイルのパス一覧、$lines = {パス: 行数}（scripts/run_checks.sh が作る）
//
// 「矛盾」（⑤）の定義：
//   C1 llm のエッジの端点が、グラフに存在しない id を指している
//   C2 llm の IMPLEMENTS が、static ノードと別のファイル、または static ノードの行範囲の外を出典にしている
//   C3 llm の Setting が const_ref で指す Constant が存在しない、または value が Constant の value_text に含まれない

// ① 全ソースファイルが Module として登録済み（結果が 0 行なら合格）
UNWIND $files AS f
OPTIONAL MATCH (m:Module {file: f})
WITH f, m WHERE m IS NULL
RETURN f AS missing_module;

// ② 必須属性の欠け（0 件なら合格）。ノード
MATCH (n)
WHERE n.id IS NULL OR n.name IS NULL OR n.source IS NULL OR NOT n.source IN ['static','llm']
   OR n.file IS NULL OR n.line_start IS NULL OR n.line_end IS NULL
RETURN labels(n) AS labels, n.id AS id;
// ② エッジ
MATCH ()-[r]->()
WHERE r.id IS NULL OR r.source IS NULL OR NOT r.source IN ['static','llm']
   OR r.file IS NULL OR r.line_start IS NULL OR r.line_end IS NULL
RETURN type(r) AS type, r.id AS id;

// ③ 出典ファイルが実在し行範囲が妥当（0 件なら合格）
MATCH (n)
WHERE NOT n.file IN $files
   OR n.line_start < 1 OR n.line_end < n.line_start OR n.line_end > $lines[n.file]
RETURN n.id AS id, n.file AS file, n.line_start AS s, n.line_end AS e;
MATCH ()-[r]->()
WHERE NOT r.file IN $files
   OR r.line_start < 1 OR r.line_end < r.line_start OR r.line_end > $lines[r.file]
RETURN r.id AS id, r.file AS file, r.line_start AS s, r.line_end AS e;

// ④ 孤立ノード（エッジが 1 本もないノード）の一覧
MATCH (n) WHERE NOT (n)--()
RETURN labels(n)[0] AS label, n.id AS id, n.file AS file;

// ⑤ static と llm の矛盾
// C2
MATCH (a)-[r:IMPLEMENTS {source:'llm'}]->(t)
WHERE a.source = 'static' AND (r.file <> a.file OR r.line_start < a.line_start OR r.line_end > a.line_end)
RETURN 'C2' AS rule, r.id AS edge, a.id AS static_node, r.file AS edge_file, a.file AS node_file;
// C3
MATCH (s:Setting {source:'llm'}) WHERE s.const_ref IS NOT NULL
OPTIONAL MATCH (c:Constant {id: s.const_ref})
WITH s, c WHERE c IS NULL OR NOT replace(replace(c.value_text,' ',''),'_','') CONTAINS replace(replace(toString(s.value),' ',''),'_','')
RETURN 'C3' AS rule, s.id AS setting, s.const_ref AS const_ref, s.value AS value, c.value_text AS static_value;
// C1（端点の欠け。JSON 代替では ⑥ の dangling と同じ処理）
// Neo4j ではエッジが端点なしに存在できないため、投入時（import.cypher）に MATCH できなかった行を数える。

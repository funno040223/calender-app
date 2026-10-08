# 意味ノード抽出の指示（LLM 抽出役向け）

あなたは task-rhythm-app（個人用カレンダー PWA）のコードから、**機能・業務ルール・設定・外部連携**を取り出す抽出役です。
ソースコードは**読み取りのみ**。書いてよいのは `docs/graph/runs/<バッチ名>.json` と `docs/graph/runs/<バッチ名>.md` だけです。

## 読むもの
1. `docs/graph/schema.md`（スキーマ。特に §2 意味ノード、§3 エッジ）
2. `docs/graph/runs/input/<バッチ名>.md`（担当ファイルと、その静的ノードの id・行範囲の一覧）
3. 担当ファイルのソース本体（**全部読む**。テストは期待値＝仕様の証拠として使う）
4. `docs/graph/seed_areas.json`（最上位の「領域」Feature。作らず参照だけ）と `docs/graph/seed_integrations.json`（使える Integration の id）

**読んではいけないもの**：`CLAUDE.md`、`AGENTS.md`、`README.md`、`docs/` の文書。要件定義書の根拠はコードだけにするため。
コード内のコメントは根拠にしてよいが、コードと食い違うときはコードを優先する。

## 作るもの（JSON）
```json
{
  "batch": "<バッチ名>",
  "nodes": [
    {"id":"rule:planner/laundry-interval","label":"Rule","name":"洗濯は4〜7日の間隔で入れる",
     "description":"日本語1〜2文。何を・どの条件で",
     "file":"src/lib/scheduler/planner.ts","line_start":120,"line_end":140,
     "confidence":"high","evidence":"根拠の短い言い換え（コードの引用ではない）"},
    {"id":"setting:planner/task-lead-days","label":"Setting","name":"…","description":"…","file":"…","line_start":1,"line_end":1,
     "confidence":"high","evidence":"…","const_ref":"const:src/lib/scheduler/planner.ts#TASK_LEAD_DAYS","value":14}
  ],
  "edges": [
    {"type":"IMPLEMENTS","from":"fn:src/lib/scheduler/planner.ts#planDays","to":"rule:planner/laundry-interval","file":"src/lib/scheduler/planner.ts","line_start":300,"line_end":330},
    {"type":"PART_OF","from":"rule:planner/laundry-interval","to":"feature:planner","file":"…","line_start":1,"line_end":1}
  ]
}
```

### 規則
- **label は Feature / Rule / Setting / Integration の4つだけ**。Module・Function・Type・Constant・Table・Route は作らない（静的ノードの id を参照するだけ）。
- **id**：`<label小文字>:<領域>/<英小文字ケバブ>`（例 `feature:today/morning-card`、`rule:habits/skip-when-rain`）。領域はバッチの主題から選ぶ。Integration は seed_integrations.json の id をそのまま使う（他のバッチも同じ id を作ることがある。結合時にまとまる）。
- **最上位の領域**（seed_areas.json の id）は作らない。Feature は何かの領域か他の Feature に `PART_OF` でぶら下げる。Rule・Setting も `PART_OF` で Feature にぶら下げる。
- **粒度**：Feature＝ユーザーが「できること・見えるもの」（1画面の1カード、1つの計算など）。Rule＝「〜のとき〜する／しない」と1文で書ける判定・制約・数値条件。Setting＝ユーザーが設定画面で変えられる項目、または調整用の定数、環境変数。
- **すべてのノードに、コード上の根拠（file・line_start・line_end）が要る**。根拠のないこと、推測、一般論は書かない。確信が低いものは `confidence` を `medium` / `low` にして、`evidence` に理由を書く。
- **エッジの `file/line_*` はその関係の根拠の場所**。`IMPLEMENTS` の from が静的ノードのときは、**その静的ノードの行範囲の内側**を出典にすること（外側だと矛盾として検出される）。Module から張る場合は、そのファイルの中なら範囲は自由。
- **担当の非テストファイルは、最低1つの `IMPLEMENTS` を持たせる**（設定やスタイルだけのファイルも、何を実現するかを書く）。テストファイルは、検証している Rule・Feature に `IMPLEMENTS`（from=テストの Module か Function）で結ぶ。
- 重要な Rule・数値条件は取りこぼさない。ただし似たものを細切れにしすぎず、1ノード＝1つの判断にする。1つの関数に Rule が3〜8個あるのは普通。
- Setting の `const_ref` は、対応する Constant が静的ノードにあるときだけ書く（なければ省略）。`value` は、コードに書いてある値そのもの（数・文字列）。
- 使えるエッジ：IMPLEMENTS / PART_OF / DEPENDS_ON / CONFIGURED_BY。向きと両端のラベルは schema.md §3 のとおり（`validate_run.mjs` が検査する）。
- `DEPENDS_ON` は Feature → Feature / Integration。その機能が別の機能の結果や外部サービスを前提にしていることがコードで確認できるときだけ。

## 出力の前に必ず
```
node scripts/graph/validate_run.mjs docs/graph/runs/<バッチ名>.json
```
を実行し、`OK` になるまで直す（WARN の孤立も、可能なら解消する）。

## `docs/graph/runs/<バッチ名>.md`
作業の記録（短く）：読んだファイル、迷った判断、確信が低いもの、担当外に関係がありそうなもの。

## 最後にメインへ返す内容（要約のみ。200字以内、日本語）
ノード・エッジの件数、validate の結果、確信が低いものの数と主な理由。**ノードの全文は返さない**（ファイルに保存済みのため）。

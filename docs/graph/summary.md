# 調査のまとめ（2026-10-08）

task-rhythm-app（リズム カレンダー）のコードからナレッジグラフを作り、それを根拠に現状機能の要件定義書を作った調査の記録。詳細は各ファイルへ。

## 1. 目的と結果

| 目的 | 結果 |
|---|---|
| リポジトリのナレッジグラフを構築する | 完了。ノード2,466・エッジ7,808（JSON） |
| グラフを根拠に現状機能の要件定義書を作る | 完了。`docs/requirements/as-is.md`（機能290・業務ルール939・設定149） |
| 完了条件：検証①〜③の合格 | 達成 |
| 完了条件：④⑤の各件に原因または未確定の注記 | 達成（`open_issues.md`） |
| 完了条件：最新ラウンドの評価で「誤り」0件 | **未達**（第3ラウンドで1件。3ラウンドで打ち切り） |

## 2. 方法

1. **環境確認**：Docker・Neo4j・Neo4j 用 MCP・Python ドライバ・`NEO4J_*` 環境変数がいずれもなく、JSON で代替（D-01）。
2. **スキーマ**：構造ノード（Module・Function・Type・Constant・Table・Route）は静的解析、意味ノード（Feature・Rule・Setting・Integration）は LLM。エッジは8種（IMPORTS・DEFINES・CALLS・USES・IMPLEMENTS・PART_OF・DEPENDS_ON・CONFIGURED_BY）。全ノード・エッジに `source`・`file`・`line_start`・`line_end`。
3. **検証を先に作成**：`checks.cypher`、`scripts/run_checks.sh`（①全ファイルが Module ②必須属性 ③出典と行範囲 ④孤立 ⑤矛盾。＋端点の欠け）。
4. **構築**：静的部分は TypeScript コンパイラ API（型チェッカーで呼び出し先を宣言まで解決）。意味部分は Sonnet のサブエージェント11体が、ファイル群ごと（11バッチ）に抽出。結合は `merge.mjs`。
5. **評価**：Opus のサブエージェントが、構築の経緯を知らない状態で、毎ラウンド別の乱数の種（101・202・303）から抜き取り（ノード20件、2・3回目はエッジ10本も）。評価役は修正しない。
6. **修正**：指摘を `make_fixes.mjs`（→ `fixes.json`）で反映して検証を再実行（3ラウンド）。
7. **要件定義書**：`gen_requirements.mjs` がグラフから機械的に生成（グラフにない記述は書かない）。

## 3. 数字

| 種別 | 件数 |
|---|---|
| Module 204（lib 62・component 53・test 40・page 22・sql 9・api 8・config 7・css 1・worker 1・script 1） | |
| Function 508 / Type 126 / Constant 197 / Table 9 / Route 30 | 静的 |
| Feature 290 / Rule 939 / Setting 149 / Integration 14 | LLM |
| 静的エッジ：DEFINES 872・USES 1,156・CALLS 1,243・IMPORTS 616 | |
| LLM エッジ：IMPLEMENTS 2,155・PART_OF 1,392・CONFIGURED_BY 213・DEPENDS_ON 161 | |
| LLM ノードの確信度 | high 1,337／medium 55 |

評価（ノード60・エッジ20を抜き取り）：

| ラウンド | 誤り | 根拠不足 | 漏れ |
|---|---|---|---|
| 1 | 1 | 0 | 3 |
| 2 | 2 | 1 | 4 |
| 3 | 1 | 0 | 2 |

誤りの型は、境界（以上／超える）、「直後」と「5分後」、所属の推測など細部に偏る。数値・条件の内容そのものの誤りは少ない。

## 4. 現状機能の概観（グラフから）

意味ノードが多い領域（機能／ルール／設定）：自動配置 planner（35／165／41）、カレンダー（33／94／21）、今日の画面（29／92／5）、保存と同期（19／76／6）、習慣（8／64／0）、通知（14／42／10）、iCal（13／40／7）、Notion（12／35／7）、記録（15／33／0）、睡眠と夜の記録（8／32／2）。

外部連携（Integration）：supabase-auth・supabase-db・supabase-pg-cron・web-push・ical-import・ical-export-feed・notion-api・apple-shortcuts-health・service-worker・fullcalendar・open-meteo・browser-storage・ical-js・sharp。

データ（表）：app_state・ical_sources・push_subscriptions・push_schedule・push_sent・ical_feeds・notion_sources・health_tokens・health_sleep。

## 5. 見つかった不整合・注意点

- iCal 配信の期間：コード15日先（`src/lib/ical/feed.ts:8,18`）、設定画面の文言「14日先」（`src/components/settings/Feed.tsx:55`）。
- `sharp` を `scripts/make-icons.mjs` が import しているが、`package.json` の依存にない（`next` の間接依存に頼る）。
- 通知の一覧 `push_schedule` には delete の方針がなく、画面（本人）からは消せない（`supabase/migrations/0003_push.sql`）。
- 親を持たない Feature が1件（`feature:app/shell`）。

## 6. 限界・未解決

- Neo4j では動かしていない。`import.cypher` は `node scripts/graph/to_cypher.mjs` で生成できる（未試験、git には載せていない）。
- モデルの版：指定は Sonnet 4.6・Opus 4.8 だが、ツールでは別名のみ指定可。Opus は 5.5 と確認、Sonnet は未確認。
- 評価は抜き取りで全数検証ではない。同種の細部の誤りが残っている可能性がある。
- 最新ラウンドの誤り1件（`setting:planner/evening-from-minute`）は修正したが再評価していない。
- 同内容の重複ノード2組（`rewards/habit` と `rewards/habit-tracked-only`、`ical-export-feed` と `ical/feed-endpoint`）は併合していない。
- 静的解析で取れていないもの：props 経由で渡された関数の呼び出し、文字列でしか指していない参照。
- 要件定義書に目的・背景・今後の予定はない（コードに根拠がないため）。

## 7. ファイルの案内

| ファイル | 内容 |
|---|---|
| `docs/requirements/as-is.md` | 現状機能の要件定義書（第7章が要確認事項） |
| `docs/graph/schema.md` | スキーマ |
| `docs/graph/decisions.md` | 判断19件とその理由 |
| `docs/graph/review.md` | 評価3ラウンドの結果と修正 |
| `docs/graph/open_issues.md` | 完了条件の達成状況、未解決事項 |
| `docs/graph/data/graph.json` | グラフ本体 |
| `docs/graph/runs/`・`reviews/` | 抽出役・評価役の出力全文 |
| `scripts/graph/`・`scripts/run_checks.sh` | 構築・検証・生成のスクリプト |

## 8. 再実行

```bash
node scripts/graph/extract_static.mjs   # 静的部分（static.json）
node scripts/graph/merge.mjs            # 静的＋LLM＋fixes → graph.json
scripts/run_checks.sh                   # 検証①〜⑤
node scripts/graph/gen_requirements.mjs # as-is.md を作り直す
node scripts/graph/query.mjs find 洗濯   # グラフを検索
```

意味ノードの抽出をやり直す場合は `docs/graph/extraction_prompt.md` と `docs/graph/runs/input/` を使う。

# ナレッジグラフ スキーマ（task-rhythm-app）

保存先：Neo4j が使えないため JSON（`docs/graph/data/graph.json`）。理由は decisions.md D-01。
同じ構成を Neo4j に入れるための `docs/graph/data/import.cypher` を `scripts/graph/to_cypher.mjs` が生成する。

## 1. 対象ファイル（「ソースファイル」の定義）
`git ls-files` のうち、拡張子が `ts tsx mts mjs js css sql` のもの、および `package.json` `tsconfig.json` `.env.example`。
除外：`*.md`（文書）、`package-lock.json`、画像、`.claude/`、`.gitignore`。
全部 Module になる（検証①）。テストファイルも Module（`kind=test`）。

## 2. ノード
共通の必須属性：`id` `label` `name` **`source`**（`static` | `llm`）**`file`** **`line_start`** **`line_end`**。

### 構造ノード（`source=static`。TypeScript コンパイラ API と正規表現で取る）
| ラベル | 意味 | id の形 | 追加属性 |
|---|---|---|---|
| Module | ソースファイル1つ | `module:<パス>` | `kind`（page/api/component/lib/test/css/sql/config/script/worker）, `loc`, `external_imports` |
| Function | 最上位の関数・アロー関数の const・クラスのメソッド（React コンポーネントも含む） | `fn:<パス>#<名前>` | `exported`, `is_component`, `signature` |
| Type | interface / type / enum / class | `type:<パス>#<名前>` | `exported`, `type_kind` |
| Constant | 最上位の const（関数以外）で、export されたものか大文字の名前のもの | `const:<パス>#<名前>` | `exported`, `value_text`（先頭200字） |
| Table | SQL の `create table` | `table:<名前>` | — |
| Route | Next.js のファイル規約の画面・API | `route:<種別>:<パス>` | `route_kind`（page/api）, `methods` |

### 意味ノード（`source=llm`。モジュール単位で LLM が読んで取る）
| ラベル | 意味 | id の形 |
|---|---|---|
| Feature | ユーザーから見える機能・振る舞い（階層を持つ。最上位は「領域」） | `feature:<スラッグ>` |
| Rule | 業務ルール・判定条件・制約（「〜のときは〜」と書けるもの） | `rule:<スラッグ>` |
| Setting | ユーザーが変えられる設定、調整用の定数、環境変数 | `setting:<スラッグ>` |
| Integration | 外部サービス・外部のしくみ（Supabase・Web Push・Notion 等） | `integration:<スラッグ>` |

LLM ノードの追加属性：`description`（日本語1〜2文）、`evidence`（根拠の引用ではなく短い言い換え）、`confidence`（high/medium/low）。
`file` `line_start` `line_end` は、そのノードの主な根拠の場所（複数にまたがる場合は代表1か所。残りは IMPLEMENTS エッジが持つ）。
Setting は、対応する定数があれば `const_ref`（Constant の id）と `value`（コードに書かれている値）を持つ。

## 3. エッジ（8種類）
共通の必須属性：`id` `type` `from` `to` **`source`** **`file`** **`line_start`** **`line_end`**（その関係の根拠の場所）。

| # | 種類 | 向き | 取り方 |
|---|---|---|---|
| 1 | IMPORTS | Module → Module | static（import / export from / 動的 import） |
| 2 | DEFINES | Module → Function / Type / Constant / Table / Route | static |
| 3 | CALLS | Function(Module) → Function | static（型チェッカーで解決。JSX の `<Foo/>` も含む） |
| 4 | USES | Function(Module) → Type / Constant / Table | static（識別子の参照。Table は `.from("名前")`） |
| 5 | IMPLEMENTS | Module / Function / Type / Constant / Table / Route → Feature / Rule / Setting | llm（コードが意味ノードを実現している） |
| 6 | PART_OF | Feature → Feature、Rule → Feature、Setting → Feature | llm（構成・所属） |
| 7 | DEPENDS_ON | Feature → Feature / Integration | llm（その機能が別の機能・外部のしくみを前提にする） |
| 8 | CONFIGURED_BY | Feature / Rule → Setting | llm（設定・定数で挙動が変わる） |

## 4. static と llm の取り分け
- **static**：ファイル・関数・型・定数・表・画面の存在、import、呼び出し、参照。コードから機械的に決まるものは LLM に任せない。
- **llm**：機能・ルール・設定の意味づけと、その階層・依存。機械的には決まらない。
- LLM は構造ノードを**作らない**（既存の id を参照するだけ）。参照先がない id は検証⑤で矛盾として出る。

## 5. 検証（`docs/graph/checks.cypher`、`scripts/run_checks.sh`）
① 全ソースファイルが Module / ② 必須属性の欠け 0 / ③ 出典ファイルが実在し行範囲が妥当 / ④ 孤立ノード一覧 / ⑤ static と llm の矛盾一覧。
矛盾の定義は checks.cypher の冒頭に書く。

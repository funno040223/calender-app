# 判断の記録

| ID | 判断 | 理由 |
|---|---|---|
| D-01 | Neo4j ではなく JSON（`docs/graph/data/graph.json`）で構築する | この環境に Docker・Neo4j・Neo4j 用 MCP・Python ドライバ・`NEO4J_*` の環境変数がいずれもない（確認コマンドの結果：docker 未インストール、`import neo4j` 失敗、Java も無し）。指示の「使えない環境なら JSON で代替」に従う。Neo4j を使えるようになったときのため、同じ構成の `import.cypher` を生成する。検証は Cypher（`checks.cypher`）と同じ内容を JSON 上で実行する `scripts/graph/run_checks.mjs` で行う |
| D-02 | 「読み取り専用の Neo4j」の代わりに、評価役には `scripts/graph/query.mjs`（graph.json を読むだけ）を渡す | D-01 の代替。評価役が書き換えられないよう、ツールは読み取りだけにする |
| D-03 | サブエージェントのモデルは `sonnet`（抽出）・`opus`（評価）で指定する | 指示は「Sonnet 4.6」「Opus 4.8」だが、このツールで指定できるのはモデル名の別名だけで、版は選べない。実際に動いた版は各 run の記録に残す |
| D-04 | 構造ノードの抽出は TypeScript コンパイラ API（型チェッカーつき）で行う | import 先・呼び出し先を名前の一致ではなく宣言まで解決でき、誤った CALLS を避けられる。TS 以外（SQL）は正規表現 |
| D-05 | Function は最上位の関数・アロー関数 const・クラスのメソッドだけ。入れ子の関数はその外側の関数に含める | 入れ子まで取るとノードが増えすぎ、意味づけの単位としても細かすぎる |
| D-06 | Constant は「export されたもの」か「大文字の名前のもの」だけ | 調整用の定数・表（PENALTY など）は取りたいが、ローカルの const まで取るとノイズになる |
| D-07 | 「ソースファイル」はコード・スタイル・SQL・設定（schema.md §1）。文書（*.md）は対象外 | 要件定義書の根拠はコードにする。CLAUDE.md などの文書は LLM に根拠として使わせない（文書と実装のずれを検出できなくなるため） |
| D-08 | テストファイルも Module にする（`kind=test`） | テストは仕様の証拠になる（期待値が書かれている）。ただし Feature の出典はまず実装側を使い、テストは補強に使う |
| D-09 | エッジ8種：IMPORTS / DEFINES / CALLS / USES / IMPLEMENTS / PART_OF / DEPENDS_ON / CONFIGURED_BY | 構造4＋意味4。「Table への書き込み」は USES に含める（読み書きの区別は静的には安定して取れない） |
| D-10 | 意味ノードは Feature / Rule / Setting / Integration の4種 | 要件定義書の章立て（機能・業務ルール・設定・外部連携）にそのまま対応する |
| D-11 | 意味ノードの出典は代表1か所を `file/line` に持ち、他の根拠は IMPLEMENTS エッジが持つ | 複数ファイルにまたがる機能を1行の範囲では表せない |
| D-12 | 最上位の Feature（領域）は、画面とディレクトリ構成から先に決めて抽出役に渡す（schema 内の seed） | 抽出をモジュール単位に分けると、領域の名前がばらばらになるため。seed は `docs/graph/seed_areas.json` |
| D-13 | 矛盾（検証⑤）の定義は checks.cypher 冒頭の3種 | static の事実と食い違う llm の主張を機械的に見つけられるものに限る |
| D-14 | 同じ設定項目の重複 Setting は、id の末尾（スラッグ）が同じか `const_ref` が同じものを1つに併合する（優先順：planner > rhythm > night > progress > tasks > notifications > recovery > calendar > settings）。併合前の id は `merged_from` に残す。同じ意味の Rule の重複は手で確認して併合 | 評価 round1 で、モジュール単位の抽出のため同じ設定が別の領域名で作られ、ルール→設定→画面のたどりが途切れる指摘が出た。併合して辺をつなぎ直した（`scripts/graph/make_fixes.mjs`） |
| D-15 | 矛盾 C3（Setting の値と定数の値の食い違い）の比較は、数値は算術式を計算して比べ、それ以外は語・数の包含で比べる | 最初の文字列比較は `4 * 60` と `240` のような同値を矛盾と誤判定した（25件中21件が誤検出）。検査側の誤りなので検査を直した（D-13 の定義は変えていない） |
| D-16 | API の Route には、同じファイル内の関数が IMPLEMENTS している Feature を Route にも IMPLEMENTS で付ける（`note` に「派生」と書く） | 評価 round1 で API の Route が意味ノードにつながらない指摘。抽出役は関数側に付けていたため、機械的に Route へ写した。内容の新しい主張は足していない |
| D-17 | 抽出役が誰も作らなかった Integration（open-meteo・browser-storage）は、修正（fixes）で作る | 結合時に端点の欠け（検証⑥）が8件出たため。出典はコード上の fetch 先と localStorage の使用箇所 |
| D-18 | 評価役には毎ラウンド違う乱数の種で20件を抜き取らせる（round1=101、round2=202…）。round2 以降はエッジも10本抜き取らせる | 修正した箇所だけが良く見える偏りを避ける |
| D-19 | 1回目の評価役が利用上限（429）で止まり、再実行した2回目は応答が止まって（600秒）結果が書き出されなかったため、再開（SendMessage）して round1 の結果を得た。round2 以降は「途中でも先に書き出す」指示を足した | 評価の中身には影響しない（構築の経緯は渡していない） |

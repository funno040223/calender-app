# b06_lib_services 抽出メモ

## 読んだファイル
担当43ファイルすべて（src/lib の appPath・health・ical・localDebug・notify・notion・push・server・supabase・sync・weather、src/proxy.ts と各テスト）。docs・CLAUDE.md は読んでいない。

## 件数
ノード154（Feature 32 / Rule 97 / Setting 25）、エッジ505。validate_run.mjs は OK（警告なし）。

## 迷った判断・確信が低いもの（medium）
- rule:auth/session-auto-extend：延長の判断は Supabase ライブラリ側で、proxy.ts にはコメントと cookie 反映しかない。
- rule:sync/save-returns-server-time：「サーバーの時計」かどうかは DB 側（担当外）に依存。
- rule:ical/feed-regenerate-invalidates-old：upsert による置き換えからの推定。照合はフィード API 側（担当外）。
- feature:notifications/morning-summary-group：朝のまとめの規則を束ねるための分け方で、独立した画面機能ではない。

## 設計メモ
- 領域（feature:ical など）への PART_OF は直接ぶら下げず、小さな Feature を挟んだ。
- Setting は const_ref ありの定数と、環境変数（VAPID・CRON_SECRET・SUPABASE_SECRET_KEY・NEXT_PUBLIC_LOCAL_DEBUG・接続先）。ユーザーが設定画面で変える項目は担当ファイルにはない（寝る準備の時間 windDownMinutes は scheduler 側）。
- review-regression.test.ts は複数領域にまたがるため、planner・rewards・quick-add の領域と server-plan・quiet-hours に結んだ（担当外の Rule が別バッチにある可能性）。

## 担当外に関係がありそうなもの
- /api/ical/feed・/api/health/sleep・/api/push/dispatch・/api/push/replan・/api/notion/* の API ルート（b07）。合言葉の照合と health_sleep への書き込みはそちら。
- replan の中身（state.ts の replan・planEvents・contactDaysFor）は b04。
- ShortCut の合言葉入力画面・通知設定画面は b10。

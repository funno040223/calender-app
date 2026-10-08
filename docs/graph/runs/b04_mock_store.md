# b04_mock_store 作業記録

## 読んだファイル（すべて全文）
bedtime.ts / bedtime.test.ts / merge.ts / merge.test.ts / night.ts / night.test.ts / store.ts / store.test.tsx
（schema.md、runs/input/b04_mock_store.md、seed_areas.json、seed_integrations.json、validate_run.mjs も確認。CLAUDE.md などの文書は読んでいない）

## 結果
Feature 15 / Rule 65 / Setting 8、エッジ 276（IMPLEMENTS 167、PART_OF 88、DEPENDS_ON 11、CONFIGURED_BY 10）。validate_run は OK（警告なし）。

## 迷った判断
- 領域は `night`（bedtime.ts・night.ts）と `sync`（merge.ts・store.ts）。親は seed の feature:night / feature:sync / feature:rhythm / feature:planner / feature:notifications / feature:ical / feature:health-sleep。
- 睡眠時間の設定（setting:night/sleep-minutes）は対応する定数がないので const_ref なし。
- LATE_WAKE_MINUTES は `6 * 60` なので value は 360。STALE_MS・IMPORT_EVERY_MS も分・ミリ秒に直した数値（600000、900000）。
- テストは Module から IMPLEMENTS で、検証している Rule・Feature に結んだ。store.test の AppShell の描画の検証は「初回の応答まで編集を出さない」Rule（initialLoaded）に結んだ。
- 取り込み範囲（8日前〜16日先）は定数がないので、Setting にせず Rule にした。

## 確信が低いもの
- rule:sync/notice-close-gone-task（medium）：closeGoneTaskNotices の中身はこのバッチ外。関数名と引数からの判断。

## 担当外に関係がありそうなもの
- 朝ルーティンを最初のチェックから置き、朝食・散歩をそのあとにする処理（`PlanInput.routineStarts`、night.test の65〜75行が検証）は planner 側の Rule。
- `latestWakeOfDay`・`computeDayPlans`（rhythm.ts）、`buildNotices`（notify/build.ts）、`syncImports`（sync/ical.ts）、`saveSchedule`（sync/push.ts）、`closeGoneTaskNotices`（notify/close.ts）、`replan`・`DATA_KEYS`・`fromStoredV2`（state.ts）。
- 本バッチの feature:night/night-record は seed の feature:night（領域）の子。feature:night の IMPLEMENTS は他のバッチ（記録の画面や朝のカード）が持つはず。

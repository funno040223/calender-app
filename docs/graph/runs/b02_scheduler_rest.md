# b02_scheduler_rest 抽出記録

読んだファイル：outlook.ts / parse.ts / reset.ts / rhythm.ts / test-helpers.ts と、テスト8本（cue・evening・outlook・parse・reset-meals・review2・rhythm・shortfall）。schema.md、入力一覧、seed_areas.json、seed_integrations.json も読んだ。Setting の既定値（睡眠7時間・起床9:00・差30分など）は types.ts を grep で確かめて description に書いた。

## 方針
- 実装が担当内にある rhythm.ts・reset.ts・outlook.ts・parse.ts は、関数・定数から Rule へ IMPLEMENTS を張った（出典は静的ノードの行範囲の内側）。
- planner.ts の振る舞い（習慣のきっかけ、帰宅時の体力、食事、タスクの置き方など）はこのバッチにソースがないため、テストの期待値を根拠に Rule を作り、テストの Module から IMPLEMENTS を張った。実装側（planner.ts の関数）からの IMPLEMENTS は担当バッチで足す必要がある。
- 領域の Feature は seed を参照するだけにし、Feature/Rule/Setting は PART_OF でぶら下げた。

## 迷った点・確信が低いもの
- `feature:planner/test-fixtures`（test-helpers.ts）は利用者に見える機能ではないが、ルールにより IMPLEMENTS が必要なため作った（medium）。
- Setting の一部（default-wake・sleep-minutes など）は、設定画面で変えられることを rhythm.ts だけからは確認していない（settings オブジェクトのキーであることだけ確認）。
- `setting:planner/task-strategy` はテストの根拠のみ。

## 担当外に関係がありそうなもの
- 同じ Rule が planner.ts 側のバッチでも作られる可能性が高い（id は `rule:habits/…`・`rule:planner/…`）。結合時に重複を確認したい（例：keep-last、on-track-holiday、min-task-block、meal-at-home、帰宅時の体力）。
- `needsPrep`・`resolveTravel`（travel.ts）、`localDayStart`（time.ts）は静的に呼ばれるだけで、身支度の要否判定などの Rule は travel.ts のバッチ側。
- `rule:notifications/deleted-task-clears-notices` は notify/build.ts と mock/notion.ts の deleteTask に関係する。

# b01_scheduler_core 抽出記録

## 読んだファイル（全文）
src/lib/scheduler/ の dayload.ts / index.ts / intervals.ts / planner.ts / planner.test.ts / time.ts / travel.ts / types.ts。
あわせて docs/graph/schema.md、runs/input/b01_scheduler_core.md、seed_areas.json、seed_integrations.json。

## 結果
ノード 202（Feature 27・Rule 136・Setting 39）、エッジ 596。validate_run.mjs は OK（WARN なし）。

## 判断メモ
- 最上位の領域は `feature:planner` だけを参照し、配下の Feature を `feature:planner/…` で作った。
- Setting は、調整用の定数（const_ref あり）と、Settings 型の各項目（DEFAULT_SETTINGS の既定値を value に入れ、const_ref は省略）に分けた。
- IMPLEMENTS の出典は、静的ノードの行範囲の内側に収めた（`plan` は 138-821）。
- planner.ts の `plan` は1関数に Rule が非常に多いので、判断1つ＝Rule 1つで分けた。重複気味のもの（task-lead-window と beyond-horizon-no-warning など）は行範囲が違うので別にした。

## 確信が低い（medium）
- habit-today-onward（独立した判断かが曖昧）
- habit-releasable（待ち時間のある親の条件が複雑）
- optional-meal-yields（押し出し判定の式が複雑で意図は推定）
- sleep-resets-busy（睡眠の扱いは reset.ts に依存）
- just-before-timing（直前寄せの判定と減点が別行で重複気味）

## 担当外に関係がありそうなもの
- reset.ts（applyRhythmResets）・rhythm.ts（computeDayPlans, latestWakeOfDay, wakingDayStart）：起床・就寝の決め方、睡眠の記録による組み直し。planner はこれらに依存する（DEPENDS_ON は feature:rhythm / feature:recovery を張らず、担当バッチ側に任せた）。
- test-helpers.ts（baseInput, jst）：テスト用の入力。
- 設定画面で実際にどの Settings 項目が変えられるか（UI 側のバッチで確認が必要）。Setting の説明は型の項目の意味に基づく。

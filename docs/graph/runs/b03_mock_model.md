# b03_mock_model 抽出の記録

## 読んだファイル
src/lib/mock/model.ts, calendars.ts, jst.ts, utokyo.ts, sample.ts, state.ts, model.test.ts, state.test.ts（全部）。
あわせて schema.md、input/b03_mock_model.md、seed_areas.json、seed_integrations.json。

## 結果
- Feature 39 / Rule 116 / Setting 16、エッジ 462（PART_OF 171・IMPLEMENTS 275・CONFIGURED_BY 10・DEPENDS_ON 6）。validate は OK（警告なし）。
- 領域（seed_areas）は参照だけ。新しい Feature は timetable / today / night / health-sleep / rewards / habits / planner / insights / tasks / ical / weather / notion / calendar / settings / sync / stats / recovery の下にぶら下げた。

## 迷った判断
- 読み込みの検査（fromStoredV2）は、項目ごとに Rule を作らず、1つの `rule:sync/drop-invalid-entries` にまとめ、色・Notion・天気・立て直し・タバコなど意味のあるものだけ別 Rule にした。
- 移行（MIGRATIONS）は「初期値のままのものだけ置き換える」を共通 Rule にし、内容ごとの Rule は個別に残した。
- 初期の習慣の定義（sample.ts）は、時間帯・頻度・きっかけに条件があるものを Rule にし、調整用の初期値（作業の種類・ご褒美の金額・避ける時間帯・時限・学期・休講日）は Setting にした。
- Setting の一部（時限・学期・休講日）は、値が表なので const_ref を付けなかった。

## 確信が低いもの（medium）
- rule:today/treat-reward-conditions：条件は文字で持つだけで、判定は担当外。
- rule:today/routine-wash-face-in-prep、rule:planner/no-screen-recovery：コメント由来の設計意図。
- rule:habits/meal-outside-is-skip：型のコメントのみ。配置側の処理は担当外。
- rule:tasks/unreviewed-block-not-subtracted、rule:tasks/learned-minutes-median：実装（progress.ts）は担当外で、テストの期待値だけが根拠。
- setting:planner/avoid-holiday-morning：何を避ける枠かは配置側。

## 担当外に関係がありそうなもの
- `src/lib/mock/progress.ts`（captureTaskBlocks・planTagsOf・learnedMinutes）、`bedtime.ts`、`stats.ts`（bankRewards）、`store.ts`（model.test.ts はここから fromStoredV2 などを読む）。
- 設定画面側の習慣・ご褒美・天気の画面、通知（`notify/build.ts`）。同じ Feature（rewards・weather・notion・habits）を別バッチが別 id で作る可能性あり。

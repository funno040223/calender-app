# b05_mock_analysis 作業記録

## 読んだファイル
insights.ts / notion.ts / progress.ts / recovery.ts / related.ts / stats.ts と、テスト7本（habit-miss, insights, notion, recovery, related, review-2026-10-03, stats）。全文を読んだ。

## 結果
ノード143（Feature 32・Rule 100・Setting 11）、エッジ405。validate_run.mjs は OK（WARN なし）。確信 high 121、medium 22。

## 迷った判断
- recovery.ts の「今から何する？」は、画面の主題が今日の画面なので id の領域を `today` にした（`feature:today/work-now` など）。立て直し本体は `recovery`。
- 作業の進み具合（progress.ts）は `feature:progress/work-review` を作り、`feature:today` の下に置いた。所要時間の目安（`learned-minutes`）は `feature:tasks` の下。
- 気づきの「入れない時間帯」「タスクの置き方」は設定そのものの実装が担当外のため、気づきのボタン側の根拠で Setting（`setting:tasks/avoid-windows` は medium、`setting:tasks/task-strategy` は high）にした。他バッチと id が重なる可能性あり。
- `setting:rewards/rates` は rewardRates を読む箇所だけが根拠（設定画面は担当外）で medium。
- `setting:notion/stage-minutes` / `ignore-stages` は cfg を読む箇所が根拠。設定画面側は担当外。

## 確信が低いもの（medium、22件）
主にテストだけが根拠で、実装が担当外のもの：
`rule:planner/task-lead-days-wait`、`rule:planner/keep-near-block-unless-conflict`、`rule:recovery/tired-pauses-auto-tasks`、`rule:recovery/no-notices-during-sleep`、`rule:recovery/meals-after-late-wake`、`rule:recovery/sleep-across-midnight`、`rule:today/work-now-no-padding`、`rule:sync/data-keys-complete`、`rule:sync/prune-old-logs`、`rule:rewards/bank-on-replan`、`rule:timetable/calendar-ends-2027-02`、`rule:weather/stale-forecast`、`rule:settings/new-account-defaults`、`feature:habits/miss` と配下の4ルール、`feature:insights/day-log`。ほかに `rule:notion/fixed-deadline`、`setting:rewards/rates`、`setting:tasks/avoid-windows`。

## 担当外に関係がありそうなもの
- state.ts：`missHabitBlock`・`replan`・`captureDayLog`・`pruneOldLogs`・`rainyDayKeys`・`fromStoredV2`（上のテスト由来のルールの本当の実装）
- night.ts：`ON_TIME_GRACE_MINUTES`・`bedTimeOf`・`upOnTime`（起床・就寝の「予定どおり」判定）
- planner.ts：2週間前から置く・30分以内の枠の維持
- utokyo.ts：`UTOKYO_TERMS`・`currentSemester`
- lib/notion/api.ts：`NotionRow`（Notion 連携）

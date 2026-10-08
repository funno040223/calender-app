# b11_components_misc 作業記録

## 読んだファイル（12）
src/components/app/{AppShell,AppShellLoader,OfflineNotice,ServiceWorker,StoreProvider,icons}.tsx、
src/components/stats/{StatsScreen,StatsScreen.test}.tsx、src/components/tasks/{TaskForm,TasksScreen}.tsx、
src/components/ui/{Sheet,controls}.tsx（icons は先頭のみ。残りは入力一覧の行範囲で確認）。

## 件数
ノード105（Feature 28 / Rule 72 / Setting 5）、エッジ287。validate は OK、警告なし。

## 判断メモ
- 全画面の枠（`feature:app/shell`）と共通部品（`feature:ui/shared-parts`）は seed の領域に当てはまらないため、枠だけ親なし（PART_OF なし）。共通部品は枠にぶら下げた。結合時に親を決めてほしい。
- 天気・Notion・ヘルスケアの自動取り込みは AppShell にあるので、`feature:weather/auto-refresh`、`feature:notion/auto-import`、`feature:health-sleep/auto-read` を作って、それぞれの領域に PART_OF した。
- 記録画面のテスト（StatsScreen.test.tsx）は期待値から Rule（夜の集中を入れない、回数表示）を起こした。気づきの計算本体は insights.ts（担当外）。
- 「まだ先」（締切の2週間前まで置かない）は AppShell と TasksScreen の両方にあり、`rule:tasks/lead-days-defer` に両方から IMPLEMENTS。`TASK_LEAD_DAYS` の Setting は planner 側のバッチが作るはずなので、こちらでは作らず CONFIGURED_BY も張っていない。

## 確信が低いもの（medium、4件）
- `setting:app/calendar-colors`：読んでいるのは AppShell だけで、設定画面側はこのバッチの外。
- `setting:tasks/min-slack-minutes-per-day`：同上（設定画面は担当外）。
- `rule:stats/insight-shows-counts`：文の組み立ては insights.ts。テストの期待文だけが根拠。
- `rule:stats/smoking-no-evaluation`：コメントと表示の形からの判断。

## 担当外に関係がありそうなもの
- `@/lib/mock/insights.ts`（気づきの閾値）、`@/lib/mock/stats.ts`（週・ご褒美・習慣の集計）、`@/lib/mock/night.ts`、`@/lib/sync/health.ts`・`notion.ts`、`@/lib/weather/openMeteo.ts`、`public/sw.js`。

# 評価の結果（review.md）

評価役：Opus（このツールで指定できる別名 `opus`。実際の版は 5.5 と確認できた。ご指定の 4.8 とは異なる。decisions.md D-03）。構築の経緯は渡さず、schema.md・検証結果・読み取り専用の検索・ソースコードだけを渡した。評価役は修正しない。各ラウンドの全文は `docs/graph/reviews/round<N>.md`。

## ラウンド別の結果

| ラウンド | 抜き取り | 正しい | **誤り** | 根拠不足 | グラフにない（漏れ） | 乱数の種 |
|---|---|---|---|---|---|---|
| 1 | ノード20 | 19 | **1** | 0 | 3 | 101 |
| 2 | ノード20＋エッジ10 | 27 | **2** | 1 | 4 | 202 |
| 3 | ノード20＋エッジ10 | 29 | **1** | 0 | 2 | 303 |

**最新ラウンド（3）の誤りは1件。完了条件「最新ラウンドで誤りが0件」は未達**（3ラウンドで打ち切り。理由と扱いは open_issues.md）。

## 誤り・根拠不足と、その後の修正

### ラウンド1

- **誤り** `setting:planner/max-wake-shift`（src/lib/scheduler/types.ts:115 / src/lib/scheduler/rhythm.ts:133）：値30と説明は正しいが、所属が feature:planner/morning-routine-prep（朝ルーティンと身支度の配置）になっており、使っているのは起床計算（rhythm.ts:133 limitDailyShift）。同じ設定が setting:rhythm/max-wake-shift・setting:settings/max-wake-shift と3重にあり、ルールからの CONFIGURED_BY はこのノードに来ていない。

修正：
- #5 setting:planner/max-wake-shift：所属を feature:rhythm/wake-calc に修正し、ルール rule:rhythm/daily-shift-limit から CONFIGURED_BY を付けた。同じ設定項目の重複 Setting を26件併合（D-14）
- 漏れ：Notion API のタイムアウト（setting:notion/api-timeout を追加）、API の Route から機能へのつながり（8本の Route に IMPLEMENTS を派生、D-16）、同一設定の分断（併合で解消）

### ラウンド2

- **誤り** `rule:weather/stale-forecast`（src/lib/mock/state.ts:722-731）：説明は「取得から24時間以上たったものは使わず」だが、実装は now - fetchedAt <= FORECAST_FRESH_MS（24時間）を新しいとみなすので、ちょうど24時間の予報は使う（境界の違い）。また実装へのエッジがなく、rule:weather/stale-forecast-ignored（state.ts:726-727）と同じ内容の重複。
- **誤り** `rule:habits/morning-order`（src/lib/scheduler/cue.test.ts:118-131, src/lib/scheduler/types.ts:111, src/lib/scheduler/planner.ts:422）：説明は「朝食は朝ルーティンの直後」「朝食がない日の散歩は朝ルーティンの直後」としているが、テストの朝ルーティンは15分（DEFAULT_SETTINGS.routineMinutes）で、朝食は起床+20分＝朝ルーティンの終わりの5分後（CUE_GAP_MINUTES）。朝食なしの散歩も同じく5分後で、散歩だけ5分後とする説明は食い違う。
- **根拠不足** `CONFIGURED_BY:rule:planner/energy-day-used->setting:planner/daily-energy-budget`（src/lib/scheduler/planner.ts:793-797）：ルール（使ったポイントを小数1桁に丸め、外出の日と体力を添える）の挙動は dailyEnergyBudget で変わらない。上限は entry.budget に写されるだけで、上限で挙動が変わるのは直後の発散の提案（798行〜）のほう。

修正：
- rule:weather/stale-forecast：境界（24時間を超えたら）が違い、実装側 rule:weather/stale-forecast-ignored と重複 → 後者に併合し rainyDayKeys から IMPLEMENTS を付けた
- rule:habits/morning-order：「直後」→「前の場面の終わりの5分後」に説明を修正
- CONFIGURED_BY rule:planner/energy-day-used → setting:planner/daily-energy-budget：根拠不足のためエッジを削除
- 漏れ：回帰テスト・授業テストからルールへのつながり7本、rule:habits/delete-keeps-marks、integration:ical-js を追加

### ラウンド3

- **誤り** `setting:planner/evening-from-minute`（src/lib/scheduler/planner.ts:34,335-344）：値 1020（17:00）と所属は正しいが、境界と対象が違う。コードは last >= dayStart+17:00（17:00ちょうども含む）で、last は予定の終わりに帰りの移動を足した時刻と homeAt の最大、さらに就寝より前に限る。説明は「17:00より後に終わると」で、ちょうどの扱いと移動込み・就寝前の条件が抜けている（定数のコメント自体も「これより後」と書いており、コードと食い違う）。

修正：
- setting:planner/evening-from-minute：境界（17:00を含む）・帰宅時刻基準・就寝前の条件を説明に反映（再評価なし）
- 漏れ：integration:sharp、rule:auth/no-delete-push-schedule を追加（再評価なし）
- 同内容の重複2組（rewards/habit と rewards/habit-tracked-only、ical-export-feed と ical/feed-endpoint）は併合していない（open_issues.md）

## 評価の総評（評価役の記述の要旨）

- 説明・数値・条件の正確さは高い。誤りは「境界（以上／超える）」「直後と5分後」「所属の推測」のような細部に偏る。
- 最も多い問題は同じ意味のノードの重複（モジュール単位で抽出したため）。
- 抜き取りの誤りは、出典がテストだけで実装が担当外にあるノード（medium）に多い。

# b08_components_today 作業記録

- 読んだもの：schema.md、runs/input/b08_components_today.md、seed_areas.json、seed_integrations.json、担当19ファイル全部（src/components/today/*）。CLAUDE.md 等の文書は読んでいない。
- 結果：Feature 20 / Rule 71 / Setting 4。Integration は apple-shortcuts-health への DEPENDS_ON のみ（ノードは作っていない）。
- 迷った判断
  - 今日の画面のカードごとに Feature を1つ作り、feature:today（領域）へ PART_OF。DayCard 内の EnergyLine、MorningCard 内の SleepInput・手順チェックは別 Feature にした。
  - 設定画面の値（windDownMinutes・sleepMinutes 等）は他バッチと id が衝突しやすいため Setting にせず、Rule の説明文にだけ書いた。Setting は担当ファイルの定数（TRAVEL_CHOICES・PRESETS・FIRST_TASKS・WIDE）だけ。
  - テストは `it` が静的ノードにないため、Module から IMPLEMENTS（行範囲はテスト本体）。
- 確信が低いもの：なし（全 high）。ただし DEPENDS_ON の feature:tasks / feature:habits / feature:planner は import や参照の間接的な根拠。
- 担当外で関係しそうなもの：`@/lib/mock/progress`（confirmWork・pendingWork）、`recovery`（resetRhythm・workNow*）、`stats`（bedOnTime）、`state`（contactDaysFor・missHabitBlock・travelAsks）、`night`（nightOf）。これらの Rule（30分猶予・夜の記録の優先順位など）は該当バッチ側で抽出される想定。

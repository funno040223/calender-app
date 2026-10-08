# b09_components_calendar 作業記録

## 読んだファイル（全文）
- src/components/calendar/CalendarApp.tsx
- src/components/calendar/CalendarToggles.tsx
- src/components/calendar/CalendarView.tsx
- src/components/calendar/EventForm.tsx
- src/components/calendar/InfoSheet.tsx
- src/components/calendar/QuickAddBar.tsx
- 参照のみ：docs/graph/schema.md、runs/input/b09_components_calendar.md、seed_areas.json、seed_integrations.json、extraction_prompt.md

## 結果
- ノード 115（Feature 23 / Rule 75 / Setting 17）、エッジ 277。validate_run.mjs は OK（WARN なし）。
- 階層：feature:calendar（領域）の下に Feature、その下に Rule / Setting。QuickAddBar だけ feature:quick-add（領域）の下。
- Integration は seed の `integration:fullcalendar`（3日・週・月の表示）と `integration:browser-storage`（ピンチの高さの記録）を DEPENDS_ON で参照。

## 迷った判断・確信が低いもの
- `rule:calendar/block-record-started-task-to-today`（medium）：「started」は組み直した時刻との比較で、今日の画面のどのカードかはコードに書かれていない。
- `rule:calendar/fc-utc-shift`（medium）：FullCalendar へ渡す日時のずらし量は jst.ts 側で、ここでは toFc/fromFc の利用だけ。
- `setting:calendar/nosmoke-cutoff-view`（medium）：定数 SMOKE_CUTOFF_MINUTES は notify/build.ts にあり、この Setting は参照側の見え方。値 180 は定義側で確認。
- `setting:calendar/imported-travel-choices`、`snap-minutes` は定数でなくコード内の直書きなので const_ref なし。
- `setting:calendar/slot-storage-key` は設定画面の項目ではなく調整用の定数（保存キー）として Setting にした。

## 担当外に関係がありそうなもの
- 授業・休講・任意参加の出欠の意味づけ（`courses` の `cancelledDates` / `attendedDates`）は src/lib/mock の時間割まわり（feature:timetable）。
- 枠の「できなかった」「今日は飛ばす」「この時間は空ける」の実体は src/lib/mock/state.ts（`missHabitBlock`・`keepBlockFree`）。
- 移動の帯の計算は src/lib/mock/related.ts の `travelBands`、予定とタスクの関連づけは `eventIndex`・`tasksByEvent`。
- クイック追加の文の読み取りは src/lib/scheduler/parse.ts（feature:quick-add 本体）、`importedTravel` の反映は planEvents 側。

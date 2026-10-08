# b07_app_infra 作業記録

読んだもの：extraction_prompt / schema / input / seed、担当54ファイルの本体（globals.css は構造の見出しと主要部分のみ精読。ほかは全文）。
結果：ノード126（Feature 26・Rule 74・Setting 16・Integration 10）、エッジ345、validate OK。

## 迷った判断
- 基盤（ビルド・lint・型・テスト、全体の見た目の土台）に当たる領域が seed_areas にない。`feature:infra/dev-tooling` と `feature:pwa/ui-foundation` を暫定で `feature:pwa` の下に置いた。結合時に付け替えてよい。
- `feature:app/shell-layout`（(app)/layout.tsx）は `feature:sync` の下に仮置き（AppShell の中身は担当外）。
- 設定の16ページは `feature:settings/section-pages` にまとめ、対応する領域（ical・notion・notifications・health-sleep・weather・habits・rewards・timetable・calendar/event-colors）へ追加で IMPLEMENTS。
- `setting:pwa/shell-pages` の value は配列なので説明文字列にした。
- globals.css のカレンダー系スタイルは `feature:calendar/*`（swipe-strip・time-axis・month-overview・travel-bands・sleep-bands・event-colors）に分けた。他バッチの CalendarView 側と重複しうる。

## 確信が低い（medium 11前後）
- コメントだけが根拠：accent-red-sparingly、selected-event-ring（2回押しの動きはCSSにない）、no-signup-in-app（Supabase 側の設定は担当外）。
- 実体が担当外のファイルにある：no-double-send（deliverNotice）、notion/source-required、sw-register-in-root-layout、color-defaults（上書きの仕組み）、token-setup。
- 仮置きの親：ui-foundation、shell-layout、cascade-on-user-delete。

## 担当外に関係がありそうなもの
- `src/lib/push/delivery.ts`（重複排除）、`src/lib/server/push.ts`（replanPush）、`src/lib/notion/source.ts`、`src/proxy.ts`（合言葉の道を通す条件）、`src/components/app/AppShell.tsx`（カレンダーの色の上書き）。

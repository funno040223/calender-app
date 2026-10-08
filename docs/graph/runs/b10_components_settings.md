# b10_components_settings 作業記録

読んだファイル：src/components/settings/ の20ファイルすべて（テストなし）。schema.md・seed_areas.json・seed_integrations.json・入力一覧も参照。

結果：ノード108（Feature 23 / Rule 61 / Setting 24）、エッジ273。validate_run.mjs は OK（WARN なし）。

領域の付け替え：ical・notion・weather・rewards・notifications・health-sleep・timetable・habits の設定UIは、設定画面ではなくそれぞれの領域 Feature の下（例 feature:ical/source-list）に置いた。設定画面固有のもの（基本・避けたい時間帯・色・場所・作業の種類・楽しみ・朝ルーティン）は feature:settings 配下。

確信が medium のもの：
- setting:notifications/notice-lead-minutes、setting:settings/learn-min-samples、setting:weather/rain-threshold：画面に値を出しているだけで、画面から変える入力はない（定数で決まる）。
- setting:timetable/utokyo-terms：value は文言で示した（学期表の中身は utokyo.ts 側）。
- rule:ical/feed-content-scope：配信内容は画面の説明文が根拠で、実際の配信処理は担当外。
- rule:settings/learned-minutes-used-when-enough-samples：実績の使い方は注記が根拠で、実際の適用は担当外。
- rule:timetable/course-default-term：currentSemester の戻り値の意味は担当外。

担当外に関係がありそうなもの：基本の設定の各数値（睡眠・朝・1日の量・休憩・行動ポイント）の既定値と使われ方は scheduler・mock/model 側。避けたい時間帯の spanFrom の挙動（日またぎ）は mock/model.ts。tags の learnedMinutes は mock/state.ts。

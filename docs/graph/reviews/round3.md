# ナレッジグラフ評価 第3回

抜き取り：ノード20件（`sample '*' 20 303`、領域の Feature は含まれず差し替えなし）＋ エッジ10本（IMPLEMENTS 3・PART_OF 3・DEPENDS_ON 2・CONFIGURED_BY 2）。

| 結果 | 件数 |
|---|---|
| 正しい | 29 |
| 誤り | 1 |
| 根拠不足 | 0 |
| グラフにないもの | 2 |

## 抜き取り（ノード）

| # | id | 判定 | 出典 | 理由 | 正しい内容 |
|---|---|---|---|---|---|
| 1 | `feature:notion/register` | 正しい | src/lib/sync/notion.ts:16-49 | registerNotion が表のアドレスと合言葉を確かめ、既存行を消してから insert（置き換え）、removeNotion で削除、fetchNotionSchema/Rows が /api/notion/* 経由で列と行を取る。説明・IMPLEMENTS・DEPENDS_ON（Supabase・Notion API）とも一致。 |  |
| 2 | `rule:habits/edit-preserves-hidden-options` | 正しい | src/components/settings/Habits.tsx:130-149 | 保存時に habit.rainAlternative・habit.progression・habit.avoidRain を元の習慣から next にそのまま写している（各行にコメントあり）。 |  |
| 3 | `rule:recovery/sleep-blocks-failed` | 正しい | src/lib/mock/recovery.ts:22-26 | mode が tired 以外で、立て直しの範囲 [start,end) に始まった未回答のタスク枠を outcome:"none" にし、固定（pinned）の枠は continue で除く。テスト recovery.test.ts:80-85 も同じ振る舞いを確かめる。対象は now までに始まった枠だけ（説明には書かれていないが矛盾ではない）。 |  |
| 4 | `feature:ui/shared-parts` | 正しい | src/components/ui/controls.tsx:1-371 | ボタンのクラス・ScreenHeader・Group・Card・Row・Segmented・Switch・NumberInput・TimeInput 等の共通部品が並ぶファイル（371行）で、IMPLEMENTS の各行範囲も定義位置と合う。 |  |
| 5 | `rule:sync/calendar-color-hex` | 正しい | src/lib/mock/state.ts:440-442 | calendarColors の値を typeof string かつ /^#[0-9a-f]{6}$/i に合うものだけ残している（大文字小文字は問わない）。 |  |
| 6 | `rule:rewards/habit-tracked-only` | 正しい | src/lib/mock/model.ts:177-179; src/lib/mock/stats.ts:36-37,155-161 | 型のコメントと、実際の計算 rewardBreakdownOfLogs（!h.track \|\| h.meal なら除外、markValue で「少しだけ」は0.5）の両方で確認できる。ただし 5分以下の習慣の「少しだけ」は1回ぶん（markValue）という例外は書かれていない。また実装本体（stats.ts:153-162）は別ノード rule:rewards/habit が持っており、同じ規則が2つのノードに分かれている（重複）。 |  |
| 7 | `rule:today/worknow-first-tasks` | 正しい | src/components/today/WorkNowCard.tsx:11-12,22,61-63 | FIRST_TASKS=3 で choices.slice(0,3)、shown.length < choices.length のとき「ほか N件」ボタンを出し、押すと全件。 |  |
| 8 | `rule:planner/rain-alternative` | 正しい | src/lib/scheduler/planner.ts:495-497,512 | rainAlternative があり rainyDays に含まれる日は、長さを alt.durationMinutes、題名を alt.title にして置く。 |  |
| 9 | `rule:notion/sync-needs-date-column` | 正しい | src/components/settings/Notion.tsx:247-255; src/app/api/notion/sync/route.ts:10 | 「同期する」ボタンは status && cfg?.dateProp のときだけ描画、段階の列は「なし」を選べる。API 側も dateProp がなければ400で、規則を裏づける。 |  |
| 10 | `setting:planner/evening-from-minute` | 誤り | src/lib/scheduler/planner.ts:34,335-344 | 値 1020（17:00）と所属は正しいが、境界と対象が違う。コードは last >= dayStart+17:00（17:00ちょうども含む）で、last は予定の終わりに帰りの移動を足した時刻と homeAt の最大、さらに就寝より前に限る。説明は「17:00より後に終わると」で、ちょうどの扱いと移動込み・就寝前の条件が抜けている（定数のコメント自体も「これより後」と書いており、コードと食い違う）。 | 予定の多い日（heavy）で、最後の外出から家に着く時刻（予定の終わり＋帰りの移動、または homeAt）が 17:00 以降（17:00ちょうどを含む）かつ就寝より前なら、その時刻を eveningFrom（夜の始まり）にする。 |
| 11 | `feature:progress/learned-minutes` | 正しい | src/lib/mock/progress.ts:30-59 | 終わったタスクごとに確かめた作業時間を合計し、作業の種類ごとの中央値（15分単位に丸め、最低15分）を出し、3件以上で planTagsOf が defaultMinutes を置き換える。 |  |
| 12 | `integration:ical-export-feed` | 正しい | src/app/api/ical/feed/[token]/route.ts:10-42 | 合言葉の SHA-256 で本人を見分け、その場で組み直して text/calendar を返す GET。説明は正しいが、同じ範囲の feature:ical/feed-endpoint と実質同じもので、Integration（外部のしくみ）としては自前の API を重複して表している。 |  |
| 13 | `feature:insights/smoke-scenes` | 正しい | src/lib/mock/insights.ts:199-242 | 7つの場面ごとに1分あたり本数を起きている時間全体の率で割った倍率を出し、文面は「吸うことが多いのは〜」「ふだんのX倍」で評価を添えない。挙げた場面の例もコードと一致。 |  |
| 14 | `rule:health-sleep/save-error-500` | 正しい | src/app/api/health/sleep/route.ts:42 | health_sleep の upsert で error があれば {error:"保存できませんでした。"} を 500 で返す。そのあとの組み直しの失敗は受け取りを成功のまま（44-52行）で、「upsert のエラーのときだけ」と合う。 |  |
| 15 | `rule:planner/habit-window` | 正しい | src/lib/scheduler/planner.ts:412-427 | cue があれば cueOn で場面から（beforeHabit は場面の前）、なければ anchor wake/bed/なし（dayStart）に windowStart・windowEnd を足す。 |  |
| 16 | `rule:notion/source-required` | 正しい | src/app/api/notion/sync/route.ts:11-12; src/lib/notion/source.ts:8-16 | ownNotionSource が {error,status} を返したらその内容とステータスで返す。説明どおり。名前は「未登録」だけを挙げるが、実際は未ログイン（401）・DB エラー（500）・未登録（404）をまとめて返す（狭い言い方だが誤りではない）。 |  |
| 17 | `setting:planner/planning-days` | 正しい | src/lib/scheduler/types.ts:44,108; src/lib/scheduler/planner.ts:144,154 | Settings.planningDays、既定値14で、plan が allDays.slice(0, planningDays) で配置期間を決める。設定画面からは変えられない調整値だが、Setting の定義（調整用の定数）に入る。PART_OF が task-placement だけなのはやや狭い（習慣の配置にも効く）。 |  |
| 18 | `rule:sync/migration-personal-setup` | 正しい | src/lib/mock/state.ts:254-267 | 2026-10-01-personal-setup で、古い初期の手順なら朝ルーティンを置き換え（15分なら10分に）、楽しみを置き換え、place-univ を本郷キャンパスに（移動時間は残す）、授業が空なら月3・4限を 2026-A で追加、起床のご褒美30円を50円に。 |  |
| 19 | `rule:timetable/skip-when-not-attending` | 正しい | src/lib/mock/related.ts:14-27; src/lib/mock/model.ts:386,396 | attending が偽の授業回に skipped を付ける。attending は任意参加でない授業では常に真（model.ts:386）、配置に渡すのは attending の回だけ（model.ts:396）なので「組み立てでは空き時間」も正しい。ただし配置側の実装（model.ts の該当関数）への IMPLEMENTS はない。 |  |
| 20 | `rule:auth/health-sleep-read-only-for-user` | 正しい | supabase/migrations/0007_health_sleep.sql:1-3,47-52 | health_sleep には select の RLS ポリシーしかなく、ほかのマイグレーションにも書き込みのポリシーはない。書き込みは createAdminClient（secret key）の /api/health/sleep だけ。 |  |

## 抜き取り（エッジ）

| # | id | 判定 | 出典 | 理由 | 正しい内容 |
|---|---|---|---|---|---|
| 1 | `IMPLEMENTS fn:src/lib/scheduler/planner.ts#plan -> rule:planner/outing-no-cook` | 正しい | src/lib/scheduler/planner.ts:440,761 | energyHabits（frequency whenEnergy）の配置で outingDays.has(d.dayStart) なら continue。 |  |
| 2 | `IMPLEMENTS module:src/lib/mock/recovery.test.ts -> rule:progress/remaining-by-outcome` | 正しい | src/lib/mock/recovery.test.ts:30-38 | 「できなかった」で残りが見積もりのまま（180）、「残り時間を直す」で指定値（210・95）になることを確かめるテスト。 |  |
| 3 | `IMPLEMENTS module:src/lib/mock/night.test.ts -> rule:night/get-up-gap` | 正しい | src/lib/mock/night.test.ts:25; src/lib/mock/night.ts:127-128 | 目覚め 8:50・活動開始 9:20 で getUpMinutes が30を返すことを確かめる。規則の条件（up >= awake のときだけ）は night.ts と一致。 |  |
| 4 | `PART_OF rule:planner/habit-anchor -> feature:planner/habit-placement` | 正しい | src/lib/scheduler/types.ts:170-176 | Habit 型の windowStart/windowEnd/anchor の定義で、習慣の配置の一部として妥当。 |  |
| 5 | `PART_OF rule:calendar/quick-add-default-priority-mid -> feature:calendar/quick-add-bar` | 正しい | src/components/calendar/QuickAddBar.tsx:46 | priority: parsed.priority ?? 2 がクイック追加の build の中にある。 |  |
| 6 | `PART_OF rule:notion/failure-keeps-tasks -> feature:notion/auto-import` | 正しい | src/components/app/AppShell.tsx:146-149 | 自動取り込みの fetchNotionRows が失敗したら console.warn だけでタスクは更新しない。 |  |
| 7 | `DEPENDS_ON feature:sync/app-state -> integration:supabase-db` | 正しい | src/lib/sync/remote.ts:27-47 | loadRemote/saveRemote が Supabase の app_state を select/upsert する。 |  |
| 8 | `DEPENDS_ON feature:notion/auto-import -> integration:notion-api` | 正しい | src/components/app/AppShell.tsx:146-147; src/app/api/notion/sync/route.ts:14 | fetchNotionRows が /api/notion/sync を呼び、そこで readRows（Notion API）を使う。 |  |
| 9 | `CONFIGURED_BY feature:calendar/event-colors -> setting:calendar/color-defaults` | 正しい | src/app/globals.css:27-34 | --cal-own〜--cal-travel の既定の色を定義しており、予定の色はこれで決まる。 |  |
| 10 | `CONFIGURED_BY rule:auth/local-debug-bypass -> setting:auth/local-debug` | 正しい | src/proxy.ts:16-17; src/lib/localDebug.ts:6 | LOCAL_DEBUG（本番以外で NEXT_PUBLIC_LOCAL_DEBUG=1）のときログイン確認をせず /login は / へ。 |  |

## グラフにない機能・依存

| # | 種類 | 内容 | 根拠 |
|---|---|---|---|
| 1 | Integration | 画像処理ライブラリ sharp（アプリのアイコンの PNG を SVG から作る）。scripts/make-icons.mjs が import しているが package.json の依存に書かれておらず（next の間接依存に頼っている）、Integration ノードも feature:pwa/app-icons からの DEPENDS_ON もない。static の Module の external_imports には sharp が出ている。 | scripts/make-icons.mjs:2,22-25; package.json:12-25 |
| 2 | Rule | 通知の一覧 push_schedule には delete のポリシーがなく、画面（本人）からは消せない（select・insert・update だけ）。app_state には同じ趣旨の rule:auth/no-delete-app-state があるが、push_schedule の分はなく、rule:auth/rls-owner-only も「消せるかは表ごと」とだけ書いている。 | supabase/migrations/0003_push.sql:46-62 |

## 総評

- 抜き取り30件（ノード20・エッジ10）のうち正しい29件・誤り1件・根拠不足0件。誤りは `setting:planner/evening-from-minute` の境界（コードは17:00ちょうどを含む `>=`、移動込みの帰宅時刻・就寝前の条件つき）だけで、数値・所属は正しい。
- 出典の行範囲はほぼすべて正確で、IMPLEMENTS・PART_OF・DEPENDS_ON・CONFIGURED_BY の向きと対象にも食い違いはなかった。
- 気になる点は誤りではなく重複：`rule:rewards/habit-tracked-only` と `rule:rewards/habit`、`integration:ical-export-feed` と `feature:ical/feed-endpoint` が同じ内容を別ノードで持つ。
- グラフにないものは、コメント・テスト名・外部パッケージ・fetch 先・環境変数・表と RLS・Route を総当たりで照らしても2件（sharp の依存、push_schedule の削除不可）しか見つからず、網羅性は高い。
- 次に直すなら、境界の言い回し（以上／より後）の点検と、同じ規則の重複ノードの統合。


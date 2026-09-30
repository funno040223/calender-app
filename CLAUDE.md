@AGENTS.md

# task-rhythm-app（リズム カレンダー）

予定と生活リズムから空き時間を毎日計算し、習慣とタスクを自動で配置する、自分専用のカレンダー PWA。Notion カレンダーから完全に移行する前提。
要件定義（詳しい決定事項）: https://claude.ai/code/artifact/4e06e940-4b39-4e3b-a5d7-496e8f0b7f1b

## ユーザーとの進め方
- **返答は日本語**。専門用語は避け、要点を先に書く。報告は短く
- **トークンを節約する**：ファイルは grep で絞って必要な部分だけ読む。画面の確認は文字（find / get_page_text / JS）で行い、スクリーンショットは最小限。チェックはまとめて1回。質問はまとめて聞く
- 実装は Claude、動作確認と判断はユーザー。**コミットは頼まれたとき**（「適宜コミット」と言われたら区切りごとに）。push・公開など外に出す操作は事前に確認する
- 秘密の値（Supabase の鍵、iCal の非公開 URL、パスワード）は**チャットに貼らせない**。値は表示せずに確かめる
- アカウント作成・パスワード入力・Supabase の SQL の実行はユーザーが行う（SQL はファイルを用意して `open -e ファイル` → ⌘A ⌘C → SQL Editor で Run と案内する）
- **この Mac では `pbcopy` が効かない**（クリップボードが空になる）。値をコピーしてもらうときは、ファイルをテキストエディットで開くか、画面に出してよい値（公開鍵など）だけ表示する。ターミナルから手で選択すると次の行（`Mac…$` のプロンプト）まで混ざりやすい

## 技術構成
- Next.js 16（App Router, TypeScript）+ React 19 + Tailwind v4 + FullCalendar 6。**middleware は proxy.ts という名前**（Next 16）
- Supabase：Auth（メールとパスワード。新規登録はダッシュボードでのみ）、Postgres。`.env.local` に `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`（git に載らない。見本は `.env.example`）
- 公開予定：Vercel（無料）。定期実行は Supabase の pg_cron、通知は Web Push の予定
- 時刻はすべて日本時間（tzOffsetMinutes 540）。FullCalendar は timeZone "UTC" に +9h ずらした値を渡している（`src/lib/mock/jst.ts`）

## コマンド
- `npm run dev`（開発。ブラウザ確認は `.claude/launch.json` の "dev"）/ `npm test`（Vitest）/ `npm run lint` / `npx tsc --noEmit -p .` / `npm run build`
- **開発サーバーを動かしたまま `npm run build` しない**（開発サーバーが壊れる）。止めてからビルドし、終わったら起動し直す
- 古い `.next/types` が型エラーを出したら削除してよい
- 画面の確認で既存のデータを汚したくないときは、`http://xxx.localhost:3000` のような別のオリジンを使う（localStorage が分かれる。ただしログインも別になる）

## 構成
- `src/lib/scheduler/` 配置エンジン（純粋な TS、画面や DB に依存しない。テストあり）
  - `rhythm.ts` 起床・就寝：その日の必要な起床（外出＝家を出る時刻−朝ルーティン−準備、在宅＝開始20分前）と既定 9:00 の早いほう。隣の日との差は1日30分まで（早めるほうへだけ寄せる）。就寝＝翌日の起床−7時間
  - `planner.ts` 配置：予定（移動・帰宅後の休憩）→ 朝ルーティン → 習慣（飛ばせない → 飛ばせる → 待ち時間の子）→ タスク（締切・関連する予定の早い順）→ 自炊など「余裕がある日だけ」の習慣。**タスクは減点方式**（減点の表は `PENALTY`。置き方は設定の `taskStrategy`：ふつう／前倒し／分散）。入りきらなければ 余白を削る → 飛ばせる習慣を外す → 警告。タスクの枠は30分から（`MIN_TASK_BLOCK_MINUTES`。短い残りも30分にし、分けたあとに30分未満を残さない。「今から何する？」で自分で選ぶ分は別）。タスクは締切の2週間前から置く（`TASK_LEAD_DAYS`。配置期間より先の締切でも、その日が期間の中なら置き、警告は出さない）。固定したタスクの枠も、始まる前に予定が重なったら動かす
  - 週に何回かの習慣は月曜始まりの週で数え、今週やった日（`habitDoneDays`、「記録する」の習慣は `habitLogs`）を引く。夜中（0時〜就寝）は前の日の続きとして計画し、計画の日の外の 0:00〜4:00 は前の日の分として数える
  - 行動ポイント（1日の上限10）、洗濯などの間隔（4〜7日、休日優先）、外出の日（家にいない時間が6時間以上、または終日の予定で「家にいない」）には自炊と洗濯を入れず。食事は予定の最中（移動・家にいない時間を含む）に置かず、空きがなければ外で食べるものとして置かない（今日の画面の「今日の食事」で家で・外でを選べる。家で＝時間帯の終わりから2時間まで遅らせて置く `mealsAtHome`・`MEAL_LATE_MINUTES`、外で＝`habitSkips`）
  - `parse.ts` クイック追加の文の読み取り（決まった言い方だけ。AI は第3段階）
  - `outlook.ts` 今週・来週の見通し（タスクの時間・空き時間、順調／きつい／間に合わない）。タスク画面の上に出す
  - 習慣：時間帯は時刻か起床から（anchor "wake"）か就寝まで（"bed"）、優先度3段階（skippable＋keepLast）、雨の日の代わり（rainAlternative）、頻度「順調な休日」（onTrackHoliday＝締切に足りないタスクがないときの休日だけ）
  - 帰宅時の体力（eveningEnergy：low はタスクなし、normal は事務系60分まで）、身支度は人に会う日だけ（DayPlan.prep。外出か会議リンクか予定の needsPrep）、DayPlan.homeAt＝最後の外出から帰る時刻
- 取り込んだ予定に場所がないと「家にいる」扱いになる。予定を開いて「移動（片道）」を選ぶと外出として扱う（`importedTravel`、`planEvents` で上書き）
- `src/lib/ical/` iCal の読み取り（ical.js。繰り返し・除外・変更回・終日・タイムゾーン）と書き出し、URL の許可リスト（Google・iCloud の https のみ）
- `src/lib/mock/` 画面のデータ（`model.ts` 型、`state.ts` 読み込み・移行・組み直し（画面とサーバーで共通）、`store.ts` 画面用の保存と同期、`sample.ts` 初期データ）。データの移行は `state.ts` の MIGRATIONS で1回だけ
- `src/lib/sync/` Supabase との同期（`remote.ts` app_state、`ical.ts` 取り込み元）
- `src/lib/supabase/` クライアント（ブラウザ用・サーバー用・`admin.ts` secret key 用）。`src/lib/server/plan.ts` サーバーでの組み直し（取り込みも）
- `src/lib/notify/build.ts` 通知の一覧（予定の15分前・身支度の開始・枠の始まり・毎朝のまとめ・帰宅時の体力・就寝3時間前のタバコ・30分前の寝る準備。就寝〜起床は送らない）
- `src/components/calendar/CalendarView.tsx`：3日・週は横に長く並べた日を指で動かす（1日ずつ止まる、端で並べ直す）。月は週を縦に途切れずに並べる（1週ずつ止まる、見渡し用：終日の予定と締切〆だけ文字、時刻の予定は点、日付を押すと3日表示へ）。ピンチ（Ctrl＋スクロール）で30分の高さ 20〜90px、予定も同時に伸び縮み。1回目のタップは選ぶだけ、同じものをもう1回で詳しく開く（iPhone は1タップで2回届くので500ms以内の2回目は無視）。iPhone の注意：指を置いている間に scrollLeft を変えると日付だけ入れ替わって何日も飛ぶ（並べ直し・日の境目へ寄せるのは指を離して止まってから）。overflow-x を切り替えると横の位置が0に戻ることがある（そのため今は、純正カレンダーと同じく横の枠（.cal-strip）の中に縦の枠（FullCalendar 自身の時刻の欄のスクロール）を入れ、向きの判定はしない。時刻の目盛りは外に出した .cal-axis を縦の枠に合わせて動かす）
- 根拠の資料：`docs/research/fatigue-recovery-research.md`（回復・睡眠・喫煙・疲れのモデル）
- `public/sw.js` 電波がなくても開けるように、主な画面と部品を控える（**中身を変えたら VERSION を上げる**。画面を増やしたら SHELL に足す）。登録は `src/components/app/ServiceWorker.tsx`（本番だけ）。本番の形での確認は `.claude/launch.json` の "prod"（ポート3001、先に `npm run build`）。アイコンは `node scripts/make-icons.mjs`
- `src/proxy.ts` ログインの確認と自動延長。未ログインはページ→/login、API→401
- 作業の種類（`tags`、初期値は `SAMPLE_TAGS` に ID ごとに重ねる）とカレンダーの色（`calendarColors`、AppShell で `--cal-<id>` を上書き）は設定で変えられる
- `src/app/(app)/` 画面：`/` 今日、`/calendar`、`/tasks`、`/stats`（記録：ご褒美のお金とその推移・直近14日の達成カレンダー・タバコの時間帯と日ごとの本数・見通しの日ごとの詳細。計算は `src/lib/mock/stats.ts`）、`/settings/*`。`src/app/login/`、`src/app/api/ical/sync/`
- `supabase/migrations/` SQL（`setup.sql` は 0001+0002 をまとめたもの。**ユーザーが実行済み**）

## データと安全
- アプリのデータはユーザーごとに1行の JSON（`app_state`）。localStorage（`task-rhythm:mock:v2`）は控え。開いたときにサーバーを読み、変更は約0.8秒後に保存、戻ってきたときに読み直す（後から保存したほうが残る）
- iCal の非公開 URL は `ical_sources`（本人だけ読める。DB でも URL の形を確認）。取り込みはサーバーが DB から URL を読んで行い、画面には URL を返さない。開いたときと、15分以上たって戻ってきたときに取り込む
- どちらの表も RLS で本人だけ。未ログインでは読めず書けないことを確認済み
- 通知（`supabase/migrations/0003_push.sql`、実行済み）：`push_subscriptions`（端末）、`push_schedule`（これから送る通知の一覧。アプリが組み直すたびに `src/lib/notify/build.ts` で作って保存。48時間分）、`push_sent`（送った記録。secret key だけが触る）。予定の15分前（外出は家を出る15分前）・習慣とタスクの枠の始まり・起床時刻に毎朝のまとめ。就寝〜起床は送らない
- 送信：Supabase の pg_cron（ジョブ名 `push-dispatch`、1分ごと）が pg_net で `/api/push/dispatch` を呼ぶ。合言葉は Vault の `push_cron_secret`。登録の SQL は `supabase/local/0004_cron.sql`（**git に載せない**。合言葉入り）。dispatch は proxy のログイン確認を通さず、`CRON_SECRET` で確かめる
- iCal 配信（`0004_ical_feeds.sql`、実行済み）：`/api/ical/feed/<合言葉>.ics`。DB には合言葉の SHA-256 だけ（`ical_feeds`）。アドレスは作ったときに1度だけ画面に出す。読みに来るたびに `src/lib/server/plan.ts` で組み直し、枠・自分の予定・出る回の授業を返す（Google の予定は入れない）。7日前〜14日先
- Notion（`0005_notion_sources.sql`、**ユーザーの実行待ち**）：選考の表の締切をタスクに取り込む（一方向）。合言葉と表の ID は `notion_sources`（合言葉の列は画面から読めない。`/api/notion/schema`・`/api/notion/sync` が本人を確かめて secret key で読む）。列の選び方は app_state の `notion`、行→タスクは `src/lib/mock/notion.ts`（ID は `notion-<行>`。段階ごとの目安の時間 `stageMinutes` を所要時間に入れ `autoDuration`、自分で変えたら上書きしない）、取り込みは AppShell で開いたときと30分ごと
- 毎時5分に pg_cron（`push-replan`）が `/api/push/replan` を呼び、app_state と iCal から組み直して push_schedule だけを書き換える（app_state は書かない）。組み直しの処理は `src/lib/mock/state.ts`（画面とサーバーで共通。store.ts は画面用）。iCal を1つでも取り込めなかった回は、アプリが作った一覧を残す

## 状況（2026-09-30 時点）
- GitHub の非公開リポジトリ `funno040223/calender-app`（origin）。`main` と `feat/screens` は同じ内容で、作業は `feat/screens` でして `git branch -f main feat/screens` で揃える。push は Claude が行ってよい（実機で確かめるために頼まれている。`git push origin main feat/screens`。トークン認証。Mac のキーチェーンに保存済み）。レビュー用のブランチ `fix/review-2026-09-30`（別のモデルのレビュー）は取り込み済み。コミットの作者はこのリポジトリだけ `funno040223`（GitHub の noreply アドレス）に設定済み。**作者が GitHub と結びついていないと Vercel の無料プランは公開を止める**
- 公開先：https://calender-app-umber.vercel.app（Vercel の funno チームの `calender-app`。`main` を公開）。環境変数は6つ（Supabase の URL・publishable key、`NEXT_PUBLIC_VAPID_PUBLIC_KEY`、`VAPID_PRIVATE_KEY`、`CRON_SECRET`、`SUPABASE_SECRET_KEY`）。**`NEXT_PUBLIC_` の付くものは Config の種類で作る**（Secret だと編集できなくなる）。値を変えたら Redeploy が必要。値の貼り付けでターミナルの文字（`Mac…$`）が混ざった事故があった
- iPhone：ホーム画面に追加して使用中。通知は届くことを確認済み。Google カレンダーは今は使っていない（取り込みは1件登録済み。予定は Notion から移し、今後はアプリに入れる）
- 要件定義書（Claude Docs）：https://claude.ai/code/artifact/4e06e940-4b39-4e3b-a5d7-496e8f0b7f1b 。構成は 概要 → なぜ作るか（As Is／To Be の図）→ 原因と打ち手（ロジックツリー）→ ロードマップ → 仕様 → 技術 → すり合わせで決まったこと → 矛盾と未決事項
- 完了：ステップ1〜10（配置エンジン、画面、ログイン、Supabase、取り込み、公開、iPhone 対応、通知と定期実行、iCal 配信）。作る順1（眠りに入る流れ、帰宅時の体力と夜の組み直し）、作る順2（見通し、身支度の合図、出発までの残り時間）。画面の改善（説明文を削った、カレンダーのスワイプ・縦スクロールの月・ピンチ、予定の編集は時刻と日付を分けた）
- 作る順3（実装済み・iPhone で確認中）：習慣のきっかけ（`Habit.cue`：朝ルーティンのあと・食事のあと・帰宅後・入浴の前。場面の5分後／5分前に置き、30分以内に入らない日は置かない）、「記録する」（`track`）習慣は今日の画面で「やった／5分」（`habitLogs`）と2週間の回数、通知は「まず5分」。家での運動（5分・週3回・入浴の直前、`progression` で2週間ごとに +5分を聞く、20分まで）、朝の並びは 朝ルーティン → 朝食（余裕がある日だけ）→ 散歩（朝食がなければ朝ルーティンのあと。`cue.orElse`）。食事どうしは始まりを3時間あける（`MEAL_GAP_MINUTES`）、昼食は12:00〜14:30、自炊は食事の5分前に終える（`beforeHabit`）、雨の日の散歩は光を浴びる10分だけ、タバコの記録（`smokeLogs`、今日の本数と時刻だけ）。「2週間の挑戦」は作らないと決めた（回数が少なく、1人の2週間の前後比較は当てにならない。効き目は行動ポイントの見直しのときに記録から確かめる）。作る順4（実装済み）：見通しが順調な週の、今日から先で最初の休日に、今日の画面と朝のまとめで「連絡してみる？」（名前は出さない。`contactLogs` に週ごとの答え、`contactDays` は `outlook.ts`）。人付き合いの次の案（人ごとの頻度・誘う文・誕生日・勉強会）は未着手。記録とご褒美（実装済み）：タスクの枠は始まりの通知から開く（`/?done=<タスクID:開始>`）か今日の画面の「やった」で達成（`taskBlockLog`。過ぎた枠は組み直しで消えるので replan で残す）、起床は「起きた」のときの `plannedWake` から30分以内（記録は「起きた」を押したときだけ。iPhone のショートカットでアラームを止めたらアプリを開くが、ホーム画面のアプリではなく Safari で開く）、ご褒美は `rewardRates`（円）で足すだけ、使ったら `rewardSpends`。タスクの実績（2026-09-30 のレビューで作り直し）：予定が過ぎただけでは作業したことにしない（通知を開いただけでも達成にしない）。終わった枠は今日の画面の「作業の進み具合」（`ProgressCard`、`src/lib/mock/progress.ts`）で 予定どおりできた／できなかった／タスク完了／残り時間を直して確定 と答え、答えたときだけ残り時間を減らす（`taskBlockLog` の `reviewedAt`・`outcome`・`workedMinutes`）。実績からの所要時間の目安は、確かめた作業時間の中央値（3件以上。`planTagsOf`）。崩れた日の立て直し（`RecoveryCard`・`src/lib/mock/recovery.ts`・`scheduler/reset.ts`：今から寝る／起きたところ／疲れている）、「今から何する？」（`WorkNowCard`）、期限の種類（`deadlineKind`：提出・約束の締切／自分の目標日。延ばせるのは目標日だけ）。設計は `docs/design/2026-09-30-recovery-and-progress.md`、レビューと修正の記録は `docs/reviews/`
- ご褒美（2026-09-30 追加）：散歩・自己成長・片付け・洗濯・自炊も「記録する」（移行 `2026-09-30-track-more`）、「寝る」（今日の画面に寝る準備の時刻から出る `BedCard`、`bedLogs`。予定の15分後までで就寝、寝る前3時間吸っていなければタバコ）、記録をつけた（朝の疲れ・睡眠時間・帰宅時の体力、各10円）。金額は設定の「ご褒美の金額」（`/settings/rewards`）。見通しの日ごとの内訳はタスク画面で週を押すと開く（記録のページからは外した）
- 行動ポイントは未決：今の値のまま試用し、記録（朝の疲れ5段階 `wakeLogs[].fatigue`、帰宅時の体力 `eveningEnergy`、そのときの予測 `energyChecks`）で2〜4週間後に部品ごとに係数を推定する（疲れの持ち越しと睡眠負債を入れる）。基礎の疲れは入れない
- 睡眠の記録：Apple Watch（就寝の2時間前〈帰宅が遅ければ帰宅時〉に「充電」、30分前の寝る準備で「つける」の通知あり）。睡眠時間は朝のカードで入れる（`wakeLogs[].sleepMinutes`、記録ページに直近2週間）
- 天気（実装済み）：設定の「天気」で場所（`weatherPlace`）を選ぶと、AppShell が3時間ごとに Open-Meteo から雨の確率（`rainForecast`）を取る。60%以上は雨の日（`rainyDayKeys`、手の切り替えは `rainyDays`・`notRainyDays`）。洗濯は `avoidRain` で雨の日を避ける
- 2026-09-30 に足したもの：作業の進み具合・立て直し・今から何分できる？・期限の種類（レビューの取り込み）、締切に足りないときの選択肢、移動時間の分からない取り込み予定を聞く、作業の種類とカレンダーの色の設定、カレンダーの枠からの記録と「今日は飛ばす」、習慣の連続日数、実績からの所要時間、睡眠時間の記録、天気予報、今日の食事（家で・外で。食事は予定の最中に置かない）、Notion の締切の取り込み、タスクの置き方（ふつう・前倒し・分散）。Siri からの追加は作ってから消した（名前をリマインダーや音楽と取り違える）。要件定義書の項目は、見送ったもの（大きすぎるタスクの着手枠・人付き合いの次の案・AI）を除いて実装済み
- 2026-09-30 の2回目のレビュー（`docs/reviews/2026-09-30-2.md`）は全件対応済み。`supabase/migrations/0006_private_ical_url_and_server_time.sql`（iCal の URL を画面から読めなくする・保存時刻をサーバーの時計に）は**ユーザーの実行待ち**。Supabase の「新規登録を許可」がオフかも未確認
- 未決：夜中（日付が変わったあと）にタスクを置いてよいか（今は就寝前ならいい）。使わなくなった表 `shortcut_tokens` を消す SQL は `supabase/local/drop_shortcut_tokens.sql`（git に載せない。実行はユーザー）
- 睡眠アラーム：ショートカットでは睡眠アラームのオン・オフしかできず、時刻は変えられない。代わりに「寝る準備」の通知に起床時刻を出し、自分で合わせる。すきま時間の一覧は消し、「今から何する？」の分に今の空き時間の長さを最初から入れる（`freeNowMinutes`）。今日の画面は、答えが要るもの（作業の進み具合・2週間の見直し・お知らせ）をいちばん上、「今から何する？」（タスクと、散歩・自己成長などの習慣の候補）を起床・就寝のすぐ下、立て直しをいちばん下に置く
- 気づいている未対応：外出の予定が夜中を越えるような極端な場合の起床計算、同時に2台で編集すると後から保存したほうが残る

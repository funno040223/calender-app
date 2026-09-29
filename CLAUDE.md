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
  - `planner.ts` 配置：予定（移動・帰宅後の休憩）→ 朝ルーティン → 習慣（飛ばせない → 飛ばせる → 待ち時間の子）→ タスク（締切・関連する予定の早い順）→ 自炊など「余裕がある日だけ」の習慣。**タスクは減点方式**（減点の表は `PENALTY`）。入りきらなければ 余白を削る → 飛ばせる習慣を外す → 警告
  - 行動ポイント（1日の上限10）、洗濯などの間隔（4〜7日、休日優先）、外出の日（家にいない時間が6時間以上、または終日の予定で「家にいない」）には自炊と洗濯を入れず、重なる食事は「外食・お弁当」
  - `parse.ts` クイック追加の文の読み取り（決まった言い方だけ。AI は第3段階）
- `src/lib/ical/` iCal の読み取り（ical.js。繰り返し・除外・変更回・終日・タイムゾーン）と書き出し、URL の許可リスト（Google・iCloud の https のみ）
- `src/lib/mock/` 画面のデータ（`model.ts` 型、`store.ts` 保存と同期と `plan()` の呼び出し、`sample.ts` 初期データ）
- `src/lib/sync/` Supabase との同期（`remote.ts` app_state、`ical.ts` 取り込み元）
- `src/lib/supabase/` クライアント（ブラウザ用・サーバー用）
- `public/sw.js` 電波がなくても開けるように、主な画面と部品を控える（**中身を変えたら VERSION を上げる**。画面を増やしたら SHELL に足す）。登録は `src/components/app/ServiceWorker.tsx`（本番だけ）。本番の形での確認は `.claude/launch.json` の "prod"（ポート3001、先に `npm run build`）。アイコンは `node scripts/make-icons.mjs`
- `src/proxy.ts` ログインの確認と自動延長。未ログインはページ→/login、API→401
- `src/app/(app)/` 画面：`/` 今日、`/calendar`、`/tasks`、`/settings/*`。`src/app/login/`、`src/app/api/ical/sync/`
- `supabase/migrations/` SQL（`setup.sql` は 0001+0002 をまとめたもの。**ユーザーが実行済み**）

## データと安全
- アプリのデータはユーザーごとに1行の JSON（`app_state`）。localStorage（`task-rhythm:mock:v2`）は控え。開いたときにサーバーを読み、変更は約0.8秒後に保存、戻ってきたときに読み直す（後から保存したほうが残る）
- iCal の非公開 URL は `ical_sources`（本人だけ読める。DB でも URL の形を確認）。取り込みはサーバーが DB から URL を読んで行い、画面には URL を返さない。開いたときと、15分以上たって戻ってきたときに取り込む
- どちらの表も RLS で本人だけ。未ログインでは読めず書けないことを確認済み
- 通知（`supabase/migrations/0003_push.sql`、実行済み）：`push_subscriptions`（端末）、`push_schedule`（これから送る通知の一覧。アプリが組み直すたびに `src/lib/notify/build.ts` で作って保存。48時間分）、`push_sent`（送った記録。secret key だけが触る）。予定の15分前（外出は家を出る15分前）・習慣とタスクの枠の始まり・起床時刻に毎朝のまとめ。就寝〜起床は送らない
- 送信：Supabase の pg_cron（ジョブ名 `push-dispatch`、1分ごと）が pg_net で `/api/push/dispatch` を呼ぶ。合言葉は Vault の `push_cron_secret`。登録の SQL は `supabase/local/0004_cron.sql`（**git に載せない**。合言葉入り）。dispatch は proxy のログイン確認を通さず、`CRON_SECRET` で確かめる

## 状況（2026-09-29 時点）
- GitHub の非公開リポジトリ `funno040223/calender-app`（origin）。`main` と `feat/screens` は同じ内容。push はユーザーが自分の端末で行う（トークン認証。Mac のキーチェーンに保存済み）。コミットの作者はこのリポジトリだけ `funno040223`（GitHub の noreply アドレス）に設定済み。**作者が GitHub と結びついていないと Vercel の無料プランは公開を止める**
- 公開先：https://calender-app-umber.vercel.app（Vercel の funno チームの `calender-app`。`main` を公開。7kf1 のほうのプロジェクトは削除した）。環境変数は6つ（Supabase の URL・publishable key、`NEXT_PUBLIC_VAPID_PUBLIC_KEY`、`VAPID_PRIVATE_KEY`、`CRON_SECRET`、`SUPABASE_SECRET_KEY`）。**`NEXT_PUBLIC_` の付くものは Config の種類で作る**（Secret だと編集できなくなる）。値を変えたら Redeploy が必要。Supabase の Site URL / Redirect URLs も設定済み。iPhone の Safari でもログインとデータの表示を確認済み
- 完了：要件定義・設計、配置エンジン、画面（今日・カレンダー3日/週/月・タスク・設定）、ログイン必須、Supabase への保存、Google カレンダーの取り込み（ユーザーの実カレンダーを1件登録済み）、公開（ステップ7）、iPhone 対応（ステップ8。ホーム画面に追加・機内モードでの表示と、戻ったときの保存を確認済み）、通知（ステップ9の前半。iPhone に届くことを確認済み）
- 残り（完成まで）：
  9. 後半：サーバーでの組み直し（毎時。app_state と iCal から plan() を動かし、push_schedule だけを書き換える。app_state は書かない）
  10. アプリの予定の iCal 配信（推測できないトークン付き URL、読み取り専用）
  11. 1〜2週間使って調整
- 第2段階以降：しんどさの記録で行動ポイントを合わせる、通知から実績を答える、朝ルーティンの記録の活用、iOS ショートカット・Siri、iPhone の「睡眠」（アラーム）の就寝・起床時刻をこの計算に合わせる（ショートカットで毎日設定する案）、発散の候補の編集、自炊の日の切り替え、天気で洗濯の日を選ぶ、AI での所要時間の推定と文の読み取り、ほかの配置戦略
- 気づいている未対応：配置が「外出の予定が夜中を越える」ような極端な場合の起床計算、行動ポイントの値は見積もり（上限を8に下げる案を提示済み・未決）、同時に2台で編集すると後から保存したほうが残る

# ナレッジグラフ評価 round2

評価日：2026-10-08。対象：docs/graph/data/graph.json（ノード2463・エッジ7797）。抽出：`sample '*' 20 202`（領域の Feature は含まれず差し替えなし）＋ llm エッジ10本（IMPLEMENTS 4・PART_OF 2・DEPENDS_ON 2・CONFIGURED_BY 2、種 777 の無作為抽出）。

## 要約

| 区分 | 件数 |
|---|---|
| 正しい | 27（ノード 18・エッジ 9） |
| 誤り | 2 |
| 根拠不足 | 1 |
| グラフにないもの | 4 |

## 作業1：ノード（20件）

| # | id | 判定 | 出典 | 理由 | 正しい内容（誤りのみ） |
|---|---|---|---|---|---|
| 1 | `rule:habits/after-midnight-bath-is-last-night` | 正しい | src/lib/scheduler/review2.test.ts:113-121 | テストは0時過ぎに置かれた入浴のあと、翌日昼の組み直しで次の晩（10/2 12:00〜10/3 9:00）に入浴が1件あることを確かめており、説明と一致する。実装側（planner の起きている日の数え方）への IMPLEMENTS はなく、テストだけが出典。 |  |
| 2 | `rule:weather/stale-forecast` | 誤り | src/lib/mock/state.ts:722-731 | 説明は「取得から24時間以上たったものは使わず」だが、実装は now - fetchedAt <= FORECAST_FRESH_MS（24時間）を新しいとみなすので、ちょうど24時間の予報は使う（境界の違い）。また実装へのエッジがなく、rule:weather/stale-forecast-ignored（state.ts:726-727）と同じ内容の重複。 | 取得から24時間を超えた予報は使わない（24時間ちょうどまでは使う）。手で雨にした日（rainyDays）は残り、notRainyDays の日は除く。実装は rainyDayKeys（state.ts:725-732）。 |
| 3 | `feature:calendar/related-focus` | 正しい | src/components/calendar/CalendarApp.tsx:34-44,58,183 | FocusStyle が選んだまとまり以外を opacity 0.35 にし、まとまりに輪郭を付ける。group は hoverGroup ?? focusGroup で、押す・重ねるの両方に対応しており説明どおり。 |  |
| 4 | `rule:notifications/watch-charge` | 正しい | src/lib/notify/build.ts:168-175 | charge = bed - WATCH_CHARGE_MINUTES、homeAt が charge より後かつ bed より前なら homeAt を使う。説明と一致。 |  |
| 5 | `rule:habits/form-interval-range` | 正しい | src/components/settings/Habits.tsx:41,64-65,139-144 | valid は1以上、hi > 60 と lo > hi を弾き、初期値は 4・7。説明と一致。 |  |
| 6 | `setting:calendar/imported-travel-choices` | 正しい | src/components/calendar/CalendarApp.tsx:345-351 | 取り込んだ予定の「移動（片道）」の選択肢 [10,15,20,30,45,60,90] 分がその場に書かれている（ほかに「場所から」「家にいる」）。 |  |
| 7 | `rule:today/evening-card-window` | 正しい | src/components/today/EveningCard.tsx:23-24,40 | from = homeAt ?? eveningFrom、now < from-60分 または now >= bed なら出さない。見出しも homeAt の有無で切り替わり、説明と一致。 |  |
| 8 | `feature:app/shell-layout` | 正しい | src/app/(app)/layout.tsx:3-5, src/components/app/AppShellLoader.tsx:6-12 | レイアウトが AppShellLoader で子を包み、AppShell は ssr:false で読み込む。説明は正しいが、ブラウザだけで描画する根拠は AppShellLoader 側にあり、rule:app/shell-browser-only と内容が重なる。所属が feature:sync で feature:app/shell ではない点はやや不自然。 |  |
| 9 | `rule:planner/allday-away` | 正しい | src/lib/scheduler/planner.ts:209-213 | 終日の予定で awayFromHome かつ end > now・start < horizonEnd なら away に入れて continue（busy には入れない＝タスクは入れられる）。テスト planner.test.ts:475-488 とも一致。 |  |
| 10 | `feature:planner/public-api` | 正しい | src/lib/scheduler/index.ts:1-7 | types と plan・computeDayPlans・resolveTravel・parseQuickAdd・buildOutlook・dayLoadOf などを再公開しており説明どおり。 |  |
| 11 | `rule:notifications/subscription-constraints` | 正しい | supabase/migrations/0003_push.sql:6-15 | endpoint は ^https:// かつ1000字以内、p256dh 200・auth 100・device 100 の上限、unique(user_id, endpoint)。説明と一致。 |  |
| 12 | `rule:planner/habit-today-onward` | 正しい | src/lib/scheduler/planner.ts:538, 369 | 週の回数などの習慣は windowOf(d).end > now の日だけを対象にする。間隔の習慣も placeByInterval 内（369行）で同じ判定がある。 |  |
| 13 | `rule:habits/morning-order` | 誤り | src/lib/scheduler/cue.test.ts:118-131, src/lib/scheduler/types.ts:111, src/lib/scheduler/planner.ts:422 | 説明は「朝食は朝ルーティンの直後」「朝食がない日の散歩は朝ルーティンの直後」としているが、テストの朝ルーティンは15分（DEFAULT_SETTINGS.routineMinutes）で、朝食は起床+20分＝朝ルーティンの終わりの5分後（CUE_GAP_MINUTES）。朝食なしの散歩も同じく5分後で、散歩だけ5分後とする説明は食い違う。 | 朝ルーティン → 朝食 → 散歩の順に、それぞれ前の場面の終わりの5分後（CUE_GAP_MINUTES）に置く。朝食がない日の散歩は朝ルーティンの終わりの5分後。 |
| 14 | `rule:night/late-wake-tap-closes-sleep` | 正しい | src/lib/mock/bedtime.ts:6-21 | mode が sleep の立て直しだけ、start より後で end+6時間（LATE_WAKE_MINUTES）より前の最も早い wokeAt ?? routineStartedAt を終わりにして mode を woke にする。説明と一致。 |  |
| 15 | `feature:pwa/offline-notice` | 正しい | src/components/app/OfflineNotice.tsx:5-27 | online/offline イベントと navigator.onLine で、オフラインのときだけ「この端末の控えを表示…つながったら保存」を出す。 |  |
| 16 | `rule:planner/travel-question-queue` | 正しい | src/lib/scheduler/planner.ts:233, src/lib/scheduler/travel.ts:35 | resolveTravel が場所を特定できないとき unknown=true、場所があり start > now の予定を travelQuestions に入れる。説明と一致。 |  |
| 17 | `feature:planner/energy-habits` | 正しい | src/lib/scheduler/planner.ts:439-441, 754-770 | whenEnergy の習慣はほかの習慣とタスクのあとで、外出の日でなく energyOn+cost が dailyEnergyBudget 以下の日だけ置く。説明どおり。 |  |
| 18 | `rule:weather/refresh-conditions` | 正しい | src/components/app/AppShell.tsx:32-34,121-134 | sync が loading でなく場所があり、取得中でなく、前回取得から3時間・前回試行から10分たったときだけ取る。10分ごとに check。説明と一致。 |  |
| 19 | `feature:notion/column-config` | 正しい | src/lib/mock/model.ts:119-131 | NotionConfig は dateProp・stageProp・ignoreStages・stageMinutes・dismissed・fetchedAt を持つ。締切・段階の列、取り込まない段階、消したタスクという説明と一致。 |  |
| 20 | `rule:night/bed-never-earlier-than-planned-wake` | 正しい | src/lib/mock/bedtime.ts:47 | end = Math.max(planned(day).wake, desired) で、予定の起床より早くしない。テスト bedtime.test.ts:43-47 も同じ。 |  |

## 作業1：エッジ（10本）

| # | id | 判定 | 出典 | 理由 | 正しい内容（誤りのみ） |
|---|---|---|---|---|---|
| 1 | `IMPLEMENTS:const:src/lib/health/sleep.ts#SESSION_GAP_MINUTES->setting:health-sleep/session-gap-minutes` | 正しい | src/lib/health/sleep.ts:34-38 | SESSION_GAP_MINUTES = 150 で、これより長く起きていたら別の眠りにする。設定ノードの説明と値（150分）が一致。 |  |
| 2 | `IMPLEMENTS:fn:src/components/today/MorningCard.tsx#MorningCard->rule:today/morning-late-note` | 正しい | src/components/today/MorningCard.tsx:125-129,183-184 | MorningCard が lateBy を計算し、\|lateBy\| >= 5 のとき「予定より◯分遅く／早く」を出す。関係は正しいが、5分の判定はエッジの出典範囲外（183行）。 |  |
| 3 | `IMPLEMENTS:fn:src/components/calendar/CalendarView.tsx#CalendarView->rule:calendar/routine-block-not-draggable` | 正しい | src/components/calendar/CalendarView.tsx:700-701 | editable: b.kind !== "routine" で朝ルーティンの枠を動かせなくしている。 |  |
| 4 | `IMPLEMENTS:fn:src/lib/mock/insights.ts#smokeInsight->feature:insights/smoke-scenes` | 正しい | src/lib/mock/insights.ts:199-242 | 場面ごとの1時間あたりの本数を全体と比べ、倍率と本数だけを出す（評価の文はない）。 |  |
| 5 | `PART_OF:rule:today/routine-wash-face-in-prep->feature:today/morning-routine-steps` | 正しい | src/lib/mock/sample.ts:263-266 | 朝ルーティンの初期手順のコメントに「顔を洗うなどは身支度に入れる」とあり、朝ルーティンの手順への所属は妥当。 |  |
| 6 | `PART_OF:rule:notifications/push-ttl-30min->feature:notifications/web-push-send` | 正しい | src/lib/push/send.ts:31-35 | sendNotification の { TTL: 30 * 60, urgency: "high" } で、送信機能の一部。 |  |
| 7 | `DEPENDS_ON:feature:insights/habit-miss->feature:insights/day-log` | 正しい | src/lib/mock/insights.ts:245-262 | habitInsight は state.dayLogs（置いた習慣・away・events・rainy）を材料にしている。 |  |
| 8 | `DEPENDS_ON:feature:notifications/web-push-send->integration:web-push` | 正しい | src/lib/push/send.ts:1,17-43 | web-push パッケージと VAPID の鍵で送っている。 |  |
| 9 | `CONFIGURED_BY:rule:calendar/quick-add-chip-overrides-text->setting:calendar/quick-add-deadline-chips` | 正しい | src/components/calendar/QuickAddBar.tsx:41-43 | チップを選んでいれば `${chip}まで` を読んだ締切を、文中の締切より優先する。チップの選択肢で結果が変わる。 |  |
| 10 | `CONFIGURED_BY:rule:planner/energy-day-used->setting:planner/daily-energy-budget` | 根拠不足 | src/lib/scheduler/planner.ts:793-797 | ルール（使ったポイントを小数1桁に丸め、外出の日と体力を添える）の挙動は dailyEnergyBudget で変わらない。上限は entry.budget に写されるだけで、上限で挙動が変わるのは直後の発散の提案（798行〜）のほう。 |  |

## 作業2：グラフにない機能・依存

| # | 種類 | 内容 | 根拠 |
|---|---|---|---|
| 1 | Edge | 回帰テスト7件（進行中の60分タスクが伸びない・済んだ昼食を同じ日に置き直さない・60日の記録の削除でご褒美が減らない・「来週金曜／来週月曜」の締切・取り込み元なしでもサーバーで組める・最初の起床より前は通知しない）を持つテストファイルから、どのルールへも IMPLEMENTS がない。対応するルール（rule:planner/hold-task-count、rule:planner/keep-finished-habit-today、rule:rewards/bank-carries-confirmed、rule:quick-add/weekday-deadline、rule:notifications/quiet-hours など）はあるのに、テストとの関係が抜けている | src/lib/review-regression.test.ts:10-57 |
| 2 | Edge | 授業の組み立てのテスト4件（同じ曜日・時限に作り休講の日は除く／時刻指定でも作れる／任意参加は参加する回だけ／時限がない授業は作らない）から、rule:timetable/skip-cancelled-and-closed-days・rule:timetable/course-optional-attendance などへの IMPLEMENTS がない（同じファイルのほかのテストはつながっている） | src/lib/mock/model.test.ts:22-49 |
| 3 | Rule | 習慣を消すとき、5分以下の習慣の「少しだけ」の記録を「やった」に書き換えて、たまったご褒美が減らないようにする（keepMarkValues(…, Infinity)）。rule:stats/keep-mark-values は「時間を延ばすとき」だけを書いており、rule:habits/delete-detaches-dependents にもこの点がない | src/components/settings/Habits.tsx:183-188, src/lib/mock/stats.ts:43-48 |
| 4 | Integration | ical.js（iCal の読み取り・繰り返しの展開・VTIMEZONE の登録と、配信用の書き出し）。外部パッケージとして使っているが、FullCalendar・Web Push と違って Integration ノードがない（integration:ical-import / ical-export-feed は Google・iCloud とカレンダーアプリ側の連携として書かれている） | package.json:20, src/lib/ical/import.ts:1,47-48, src/lib/ical/export.ts:25-35 |

探索の方法：意味ノードにつながっていない exported 関数・定数の洗い出し（ページの薄い Page 関数と notionKey だけ）、画面（Route）ごとの機能、環境変数10個・外部パッケージ・fetch 先・SQL の表9つと 0006/0008 の変更、テスト316件の名前と Rule の照合、ライブラリの主要ファイルで Rule・Setting の出典に入っていない行の確認。

## 総評

- 抜き取り30件中27件が正しく、説明・数値・出典はおおむねコードで確かめられる。網羅性も高く、探索で見つかった抜けは4件（うち2件はテストとルールのつながりの欠け）にとどまった。
- 誤りの2件は、境界（「24時間以上」と「24時間を超えた」）と、テストの期待値から読み取った間隔（朝食は朝ルーティンの直後ではなく5分後）の取り違え。テストだけを出典にしたルールは、実装の値と照らす確認が要る。
- 同じ内容のノードの重複が見られる（rule:weather/stale-forecast と stale-forecast-ignored、feature:rewards/bank と reward-bank、feature:app/shell-layout と rule:app/shell-browser-only）。テスト由来のルールを実装由来のルールに寄せると整理できる。
- CONFIGURED_BY には、値を写しているだけで挙動が変わらない関係が混じる（rule:planner/energy-day-used → daily-energy-budget）。
- エッジの出典行が判定の箇所を外していることがある（MorningCard の5分の判定は183行で、出典は125-129行）。

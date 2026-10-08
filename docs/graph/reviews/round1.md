# ナレッジグラフ評価 round1

対象：`docs/graph/data/graph.json`（llm ノード 1,414 件）。抜き取りは `sample '*' 20 101`（領域の Feature は含まれず、差し替えなし）。

## 作業1：抜き取り評価（20件）

| # | id | 判定 | 出典 | 理由 |
|---|---|---|---|---|
| 1 | feature:planner/replan | 正しい | src/lib/mock/state.ts:497-588 | 授業・睡眠・飛ばした習慣を整えて plan() を呼ぶ。画面（store.ts）とサーバー（server/plan.ts:51）の両方から呼ばれる |
| 2 | rule:health-sleep/valid-numbers-only | 正しい | src/lib/mock/state.ts:349-356 | start・end・minutes がすべて有限の数の夜だけ残す |
| 3 | rule:planner/keep-free-no-autofill | 正しい | src/lib/mock/model.ts:259-260 | コメントどおりで、実体は planner.ts:198-199。ただし実体側の IMPLEMENTS がなく、rule:planner/keep-free-busy と重複 |
| 4 | rule:insights/day-log-rewrite-same-day | 正しい | src/lib/mock/state.ts:632-661 | 同じなら何もしない・今日以外は残す。細部：習慣は前の控えに足していき、120日より前は消える |
| 5 | setting:planner/max-wake-shift | **誤り** | types.ts:115 / rhythm.ts:133 | 値30は正しいが、所属が「朝ルーティンと身支度の配置」。使っているのは起床計算。同じ設定が3つのノードに分かれ、ルールからの CONFIGURED_BY は別のノードに付いている |
| 6 | setting:planner/cue-gap | 正しい | types.ts:162, planner.ts:418-423 | 5分後に始め、beforeHabit は5分前に終える |
| 7 | rule:notifications/test-own-devices-only | 正しい | src/app/api/push/test/route.ts:6-16 | RLS のクライアントで読み、0件は400、gone は削除 |
| 8 | feature:calendar/imported-travel | 正しい | src/components/calendar/CalendarApp.tsx:328-354 | Google の予定に「移動（片道）」の選択があり importedTravel に保存 |
| 9 | rule:sync/new-id-format | 正しい | src/lib/mock/jst.ts:94-100 | 接頭辞-時刻36進-8字。所属 feature:sync はやや遠い |
| 10 | rule:today/morning-fatigue-levels | 正しい | src/components/today/MorningCard.tsx:55-61 | 1〜5の5段階 |
| 11 | setting:ical/feed-future-days | 正しい | src/lib/ical/feed.ts:8,18 | 15日。※コードの画面文言（Feed.tsx:55「14日先」）とは食い違う（グラフの問題ではない） |
| 12 | feature:ical/feed-settings | 正しい | src/components/settings/Feed.tsx:8-109 | 作成・作り直し・停止・1回だけ表示 |
| 13 | rule:sync/load-timeout-fallback | 正しい | src/lib/mock/store.ts:136,271,300-302 | 6秒で打ち切り offline にして続ける |
| 14 | feature:today/work-now-habits | 正しい | src/lib/mock/recovery.ts:79-105 | 除外条件つきで最大3件、選ぶと固定の枠 |
| 15 | rule:habits/form-cue-choices | 正しい | src/components/settings/Habits.tsx:86-129 | 朝ルーティン・帰宅後・食事のあと・就寝基準か食事の前。同じきっかけなら元の cue を残す |
| 16 | rule:night/late-wake-tap-closes-sleep | 正しい | src/lib/mock/bedtime.ts:6-21 | 終わり+6時間までの最も早い活動開始で終え、woke にする |
| 17 | setting:health-sleep/max-samples | 正しい | src/lib/health/sleep.ts:31,125 | 5000件で切る |
| 18 | setting:planner/unknown-travel-minutes | 正しい | types.ts:116, travel.ts:35 | 既定60分 |
| 19 | feature:notifications/test-send | 正しい | route.ts:4-18, sync/push.ts:68, settings/Notifications.tsx:69 | 設定のボタンから本人の端末へ |
| 20 | feature:notifications/build-schedule | 正しい | src/lib/notify/build.ts:57-187 | 列挙した種類を buildNotices が集める |

誤りの正しい内容（#5）：PART_OF は feature:rhythm/wake-calc。rule:rhythm/daily-shift-limit から CONFIGURED_BY される1つの Setting にまとめる（設定画面 BasicSettings.tsx:36 で変更可）。

## 作業2：グラフにないもの（3件）

| 種類 | 内容 | 根拠 |
|---|---|---|
| Setting | Notion API 呼び出しのタイムアウト（15秒）。iCal・サーバー読み込みのタイムアウトは Setting になっているのにこれだけない | src/lib/notion/api.ts:12 |
| Edge | API の Route ノード7件から機能への IMPLEMENTS が1本もない（画面の Route は持つ） | src/app/api/push/dispatch/route.ts:12-47 ほか |
| Edge | 同じ設定キーの Setting が planner/・rhythm/・settings/ に分かれ、互いに結ばれていない。設定画面の項目からルールへたどれない（重複は15種） | BasicSettings.tsx:36, rhythm.ts:133 |

集計：正しい 19 / 誤り 1 / 根拠不足 0 / 漏れ 3

## 総評
- 説明・数値・条件の正確さは高い。抜き取りでは内容の食い違いはなく、出典の行範囲もおおむね合っている。網羅も厚く、関数・画面・SQL・環境変数の漏れはほぼ見つからなかった。
- いちばん多い問題は同じ意味のノードの重複。抽出の単位（モジュールごと）で同じ設定・ルールが別の名前空間に作られている（Setting の重複15種、keep-free-no-autofill と keep-free-busy、replan-writes-schedule-only と replan-does-not-write-app-state など）。
- 重複の結果、ルール → 設定 → 画面のつながりが途切れ、所属（PART_OF）も推測で付いたものがある（max-wake-shift、new-id-format → sync、app/shell-layout → sync）。
- API の Route ノードが意味ノードにつながっていない。
- C3 の矛盾4件（PENALTY など）は value の書き方（JSON とソースの文字列）の違いで、内容の誤りではない。

# 現状機能の要件定義書（As-Is）— task-rhythm-app

> このファイルは `scripts/graph/gen_requirements.mjs` が `docs/graph/data/graph.json`（ナレッジグラフ）から機械的に作ったものです。手で直さず、グラフ（`docs/graph/`）を直して作り直してください。
> すべての項目に、グラフのノード id と出典（ファイル:行）が付いています。出典のない記述は含めていません。

## 0. この文書の読み方

- **範囲**：リポジトリのコード（src/・supabase/・public/・scripts/・設定）から読み取れる現状の機能。目的・背景・今後の予定は、コードに根拠がないため書いていません。
- **凡例**：FR＝機能、BR＝業務ルール、ST＝設定・調整値。各行の「ノード」は `docs/graph/data/graph.json` の id、「出典」は `ファイル:開始行-終了行`。
- **マーク**：△＝抽出時の確信が medium（根拠が間接的・他ファイル依存など）。†＝評価の指摘を受けて修正したが、修正後の再評価をしていない（要確認事項の 11.1）。
- **根拠の強さ**：意味ノード（FR/BR/ST）は LLM がコードを読んで抽出し、評価役（独立）が3ラウンドでノード60件・エッジ20本を抜き取って検証した。全件を人が確かめたものではない。評価結果は `docs/graph/review.md`。
- **構成**：2 機能領域（各領域に機能・ルール・設定）、3 外部連携、4 データ（表）、5 画面・API、6 検証の結果、7 要確認事項。

## 1. グラフの規模

| 種別 | 件数 |
|---|---|
| Module（static） | 204 |
| Table（static） | 9 |
| Function（static） | 508 |
| Route（static） | 30 |
| Constant（static） | 197 |
| Type（static） | 126 |
| Feature（llm） | 290 |
| Setting（llm） | 149 |
| Rule（llm） | 939 |
| Integration（llm） | 14 |
| エッジ DEFINES（static） | 872 |
| エッジ USES（static） | 1156 |
| エッジ CALLS（static） | 1243 |
| エッジ IMPORTS（static） | 616 |
| エッジ PART_OF（llm） | 1392 |
| エッジ IMPLEMENTS（llm） | 2155 |
| エッジ CONFIGURED_BY（llm） | 213 |
| エッジ DEPENDS_ON（llm） | 161 |

## 2. 機能領域ごとの要件

### FR-001 今日の画面

- ノード：`feature:today`　出典：`src/components/today/TodayScreen.tsx:1-171`


| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0001 | 「おやすみ」は寝る準備から就寝の3時間後まで出す | `rule:today/bed-card-window` | `src/components/today/BedCard.tsx:11-15` |  |
| BR-0002 | 予定の就寝より遅い寝る記録は遅れた分を出す | `rule:today/bed-late-note` | `src/components/today/BedCard.tsx:53` |  |
| BR-0003 | 寝る前に次の日の起床と最初の予定を見せる | `rule:today/bed-next-wake-first-event` | `src/components/today/BedCard.tsx:37-38` |  |
| BR-0004 | 寝るを押すと押した時刻と予定の就寝を残す | `rule:today/bed-record-plan` | `src/components/today/BedCard.tsx:23-44` |  |
| BR-0005 | 予定に合わせて起床が早まる夜は短くなる睡眠時間を出す | `rule:today/bed-short-sleep-status` | `src/components/today/BedCard.tsx:76-81` |  |
| BR-0006 | 連絡の質問は余裕のある週の最初の休日だけ、答えたらその週は出さない | `rule:today/contact-first-holiday` | `src/components/today/ContactCard.tsx:8-16` |  |
| BR-0007 | 最初の予定は始まるまでだけ出す | `rule:today/day-first-event-until-start` | `src/components/today/DayCard.tsx:12-13` |  |
| BR-0008 | 出発まで3時間以内なら「あと◯分」を出し、30分以内は強調する | `rule:today/day-leave-countdown` | `src/components/today/DayCard.tsx:39-41` |  |
| BR-0009 | 体力が少ない日・上限超えの日は提案を添える | `rule:today/energy-over-budget-suggestion` | `src/components/today/DayCard.tsx:55-64` |  |
| BR-0010 | 帰宅の1時間前から就寝まで体力を聞く | `rule:today/evening-card-window` | `src/components/today/EveningCard.tsx:22-37` |  |
| BR-0011 | 帰宅時の体力は3段階 | `rule:today/evening-energy-options` | `src/components/today/EveningCard.tsx:11-15` |  |
| BR-0012 | 体力を答えたときの予測も残す | `rule:today/evening-record-prediction` | `src/components/today/EveningCard.tsx:25-34` |  |
| BR-0013 | 終わった食事は出さない | `rule:today/meal-hide-finished` | `src/components/today/MealCard.tsx:15-22` |  |
| BR-0014 | 食事は朝食（きっかけ付き）→昼食→夕食の順に並べる | `rule:today/meal-order-breakfast-first` | `src/components/today/MealCard.tsx:12-13` |  |
| BR-0015 | 食事の時刻欄は置いた枠・外・入らないで出し分ける | `rule:today/meal-time-label` | `src/components/today/MealCard.tsx:46` |  |
| BR-0016 | 家で・外では排他で、もう一度押すと自動に戻る | `rule:today/meal-toggle-home-out` | `src/components/today/MealCard.tsx:25-35` |  |
| BR-0017 | 朝が終わったら朝ルーティンを1行にたたむ | `rule:today/morning-compact` | `src/components/today/MorningCard.tsx:136-159` |  |
| BR-0018 | 朝の疲れは5段階 | `rule:today/morning-fatigue-levels` | `src/components/today/MorningCard.tsx:55-61` |  |
| BR-0019 | 今朝のヘルスケア睡眠が未着ならそこから読むリンクを出す | `rule:today/morning-health-link` | `src/components/today/MorningCard.tsx:130-135` |  |
| BR-0020 | 予定の起床との差が5分以上なら遅れ・早さを出す | `rule:today/morning-late-note` | `src/components/today/MorningCard.tsx:125-129` |  |
| BR-0021 | 起床・始まりに関わる更新は再計画、それ以外は保存だけ | `rule:today/morning-recompute-on-wake` | `src/components/today/MorningCard.tsx:90-100` |  |
| BR-0022 | 最初のチェックの時刻を朝ルーティンの始まりにする | `rule:today/morning-routine-start-first-check` | `src/components/today/MorningCard.tsx:102-123` |  |
| BR-0023 | 今日の楽しみは朝は伏せ、「起きた」を押すと開く | `rule:today/morning-treat-reveal` | `src/components/today/MorningCard.tsx:173-224` |  |
| BR-0024 | 朝のカードは起床の2時間前から、起きた・疲れ・手順が終わるまで出す | `rule:today/morning-window` | `src/components/today/MorningCard.tsx:63-77` |  |
| BR-0025 | 締切を優先してお休みにした習慣を知らせる | `rule:today/notices-deadline-skip` | `src/components/today/Notices.tsx:158-162` |  |
| BR-0026 | 足りないときの直しはタスクの設定に反映する | `rule:today/notices-fix-apply` | `src/components/today/TodayScreen.tsx:78-107` |  |
| BR-0027 | お知らせは1件もなければ出さない | `rule:today/notices-hide-when-empty` | `src/components/today/Notices.tsx:9-13` |  |
| BR-0028 | 取り込んだ予定の移動を選択肢で聞く | `rule:today/notices-imported-travel-ask` | `src/components/today/Notices.tsx:140-157` |  |
| BR-0029 | 足りないタスクには3つの直し方を出す | `rule:today/notices-shortfall-fixes` | `src/components/today/Notices.tsx:94-125` |  |
| BR-0030 | 移動時間のわからない場所は片道の分を入れて登録する | `rule:today/notices-travel-register` | `src/components/today/Notices.tsx:21-64` |  |
| BR-0031 | 警告の件数は不足・移動質問・移動確認の合計 | `rule:today/notices-warning-count` | `src/components/today/Notices.tsx:15-17` |  |
| BR-0032 | 作業の答えは4つ | `rule:today/progress-answers` | `src/components/today/ProgressCard.tsx:25-38` |  |
| BR-0033 | 未確認の作業がなければ作業の進み具合を出さない | `rule:today/progress-hide-when-none` | `src/components/today/ProgressCard.tsx:16-17` |  |
| BR-0034 | 残り時間は30分刻みで直せ、予定との差を出す | `rule:today/progress-remaining-edit` | `src/components/today/ProgressCard.tsx:40-49` |  |
| BR-0035 | モードごとに初期の時刻を入れる | `rule:today/recovery-default-times` | `src/components/today/RecoveryCard.tsx:22-26` |  |
| BR-0036 | 立て直しは3つのモード | `rule:today/recovery-modes` | `src/components/today/RecoveryCard.tsx:10-14` |  |
| BR-0037 | 睡眠と重なる予定を知らせる | `rule:today/recovery-show-conflicts` | `src/components/today/RecoveryCard.tsx:42-55` |  |
| BR-0038 | 入れるのは時刻だけで、日付は今から決める | `rule:today/recovery-time-to-date` | `src/components/today/RecoveryCard.tsx:27-39` |  |
| BR-0039 | 終わりが始まりより後でないと組み直せない | `rule:today/recovery-valid-range` | `src/components/today/RecoveryCard.tsx:40-41` |  |
| BR-0040 | 2週間の記録の数え方 | `rule:today/review-count-marks` | `src/components/today/ReviewCard.tsx:11-20` |  |
| BR-0041 | 増やすと習慣の時間と記録を更新し、見直し日を今日に進める | `rule:today/review-finish` | `src/components/today/ReviewCard.tsx:38-53` |  |
| BR-0042 | 実績率が8割以上なら増やす案、5割未満ならきっかけ変更の案 | `rule:today/review-thresholds` | `src/components/today/ReviewCard.tsx:32-37` |  |
| BR-0043 | 習慣の見直しは見直し日から14日たったら出す | `rule:today/review-two-weeks` | `src/components/today/ReviewCard.tsx:26-30` |  |
| BR-0044 | 睡眠時間は手入力→夜の記録→予定の睡眠時間の順で採る | `rule:today/sleep-input-priority` | `src/components/today/MorningCard.tsx:14-53` |  |
| BR-0045 | タバコの記録は60日分だけ残す | `rule:today/smoke-keep-60days` | `src/components/today/SmokeCard.tsx:20-21` |  |
| BR-0046 | タバコは時刻を残すだけで評価しない | `rule:today/smoke-record-only` | `src/components/today/SmokeCard.tsx:8-36` |  |
| BR-0047 | 押した直後の5秒だけ取り消せる | `rule:today/smoke-undo-window` | `src/components/today/SmokeCard.tsx:11-27` |  |
| BR-0048 | 日付をまたいだ時刻には「翌」をつける | `rule:today/time-next-day-prefix` | `src/components/today/parts.tsx:12-15` |  |
| BR-0049 | 終日の予定は流れの上にチップで出す | `rule:today/timeline-allday-chips` | `src/components/today/Timeline.tsx:145-157` |  |
| BR-0050 | 参加しない任意の予定は薄く出す | `rule:today/timeline-dim-skipped` | `src/components/today/Timeline.tsx:51-56` |  |
| BR-0051 | 空けた時間はまた自動で入るように戻せる | `rule:today/timeline-keep-free-restore` | `src/components/today/Timeline.tsx:129-141` |  |
| BR-0052 | 狭い画面では、いまと次を含むところまでに絞る | `rule:today/timeline-limit-next` | `src/components/today/Timeline.tsx:143-144` |  |
| BR-0053 | 終わった記録する習慣は「できなかった」で消え、入れ直す | `rule:today/timeline-miss-rebook` | `src/components/today/Timeline.tsx:81-85` |  |
| BR-0054 | いまの枠に「いま」、次の枠に「次」の印をつける | `rule:today/timeline-now-next-marker` | `src/components/today/Timeline.tsx:163-177` |  |
| BR-0055 | 雨の日は散歩などを家の中で入れ替えられる | `rule:today/timeline-rain-swap` | `src/components/today/Timeline.tsx:59-68` |  |
| BR-0056 | 終わった予定・枠は出さない | `rule:today/timeline-skip-past` | `src/components/today/Timeline.tsx:44-96` |  |
| BR-0057 | タスクの枠を押すとタスクを開き、関連予定を示す | `rule:today/timeline-task-opens` | `src/components/today/Timeline.tsx:97-114` |  |
| BR-0058 | 記録する習慣は日ごとに最初の枠にだけ記録ボタンを出す | `rule:today/timeline-track-once-per-day` | `src/components/today/Timeline.tsx:69-93` |  |
| BR-0059 | 外出の前後の移動を流れに出す | `rule:today/timeline-travel-bands` | `src/components/today/Timeline.tsx:124-128` |  |
| BR-0060 | 答えが要るカードを上に、寝る前はおやすみだけにする | `rule:today/today-card-order` | `src/components/today/TodayScreen.tsx:66-130` |  |
| BR-0061 | 「今」は1分ごとに進める | `rule:today/today-clock-minute` | `src/components/today/TodayScreen.tsx:22-30` |  |
| BR-0062 | 今日の流れの終わりは就寝か翌日0時の遅いほう | `rule:today/today-day-end` | `src/components/today/TodayScreen.tsx:66` |  |
| BR-0063 | 予定に合わせて動かした枠の件数を知らせる | `rule:today/today-moved-blocks-notice` | `src/components/today/TodayScreen.tsx:135` |  |
| BR-0064 | 通知リンクは開くだけで、実績にしない | `rule:today/today-notification-link` | `src/components/today/TodayScreen.tsx:51-60` |  |
| BR-0065 | 直前の操作を元に戻すボタンをいちばん下に出す | `rule:today/today-undo-last` | `src/components/today/TodayScreen.tsx:161-168` |  |
| BR-0066 | 広い画面では2列に分ける | `rule:today/today-wide-two-columns` | `src/components/today/TodayScreen.tsx:32-159` | `setting:today/wide-breakpoint` |
| BR-0067 | 楽しみは日の種類と雨で絞って選ぶ | `rule:today/treat-select-by-day` | `src/components/today/parts.tsx:35-38` |  |
| BR-0068 | 入るものがなければその旨を出す | `rule:today/worknow-empty` | `src/components/today/WorkNowCard.tsx:38-42` |  |
| BR-0069 | タスクの候補はまず3件、残りは「ほか N件」 | `rule:today/worknow-first-tasks` | `src/components/today/WorkNowCard.tsx:11-22` | `setting:today/work-now-first-tasks` |
| BR-0070 | 今から何分かは、よく使う長さと今の空き時間から選ぶ | `rule:today/worknow-options` | `src/components/today/WorkNowCard.tsx:16-27` |  |
| BR-0071 | 候補を押すと組み直して今から始める | `rule:today/worknow-start` | `src/components/today/WorkNowCard.tsx:43-83` |  |

| ID | 設定・調整値 | 値 | ノード | 出典 |
|---|---|---|---|---|
| ST-001 | 取り込み予定の移動の選択肢（分） | [0,15,30,45,60,90] | `setting:today/travel-choices` | `src/components/today/Notices.tsx:19` |
| ST-002 | 2列にする画面幅 | (min-width: 1024px) | `setting:today/wide-breakpoint` | `src/components/today/TodayScreen.tsx:32` |
| ST-003 | 今から何する？で最初に出すタスク数 | 3 | `setting:today/work-now-first-tasks` | `src/components/today/WorkNowCard.tsx:12` |
| ST-004 | 「今から何する？」のよく使う長さ（分） | [15,30,60] | `setting:today/work-now-presets` | `src/components/today/WorkNowCard.tsx:10` |

#### FR-002 作業の進み具合に答える

- ノード：`feature:progress/work-review`　出典：`src/lib/mock/progress.ts:61-113`
- 終わったタスクの枠について 予定どおり／できなかった／完了／残り時間を直す のどれかを答えると、答えたときだけ残り時間を減らして記録する。

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0072 | 一度答えた枠、まだ終わっていない枠は処理しない | `rule:progress/answer-once` | `src/lib/mock/progress.ts:87-96` |  |
| BR-0073 | 過ぎたタスク枠を記録に残し、答えるまで翌日以降も未回答で残す | `rule:progress/capture-unanswered-blocks` | `src/lib/mock/progress.ts:61-70` |  |
| BR-0074 | 残りが0になったら完了タスクへ移す | `rule:progress/complete-when-zero` | `src/lib/mock/progress.ts:107-111` |  |
| BR-0075 | 未回答の枠は、終わっていて、まだ数えていない・答えていないものだけ | `rule:progress/pending-unanswered-only` | `src/lib/mock/progress.ts:77-84` |  |
| BR-0076 | 予定どおり・完了と答えた枠だけ、作業した時間・達成を記録する | `rule:progress/planned-counts-worked` | `src/lib/mock/progress.ts:102-106` |  |
| BR-0077 | 答えによって残り時間を決める | `rule:progress/remaining-by-outcome` | `src/lib/mock/progress.ts:97-101` |  |

#### FR-003 おやすみ（寝るボタン）

- ノード：`feature:today/bed-card`　出典：`src/components/today/BedCard.tsx:17-95`
- 寝る準備の時刻から就寝3時間後まで、就寝時刻と「寝る」ボタンを出し、押した時刻と予定の就寝を記録する。次の日の起床と最初の予定も見せる。
- 前提：`feature:night`（`src/components/today/BedCard.tsx:53`）

#### FR-004 連絡してみる？

- ノード：`feature:today/contact-card`　出典：`src/components/today/ContactCard.tsx:8-29`
- 余裕のある週の最初の休日に、連絡したか今週はいいかを答えるカード。

#### FR-005 「連絡してみる？」の答え

- ノード：`feature:today/contact-prompt`　出典：`src/lib/mock/state.ts:664-671`
- 週ごとに、連絡した／今週はいい、の答えを記録し、答えた週はもう聞かない。

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0078 | 「連絡してみる？」はまだ答えていない週だけ聞く | `rule:today/contact-once-per-week` | `src/lib/mock/state.ts:665-671` |  |

#### FR-006 今日の楽しみ

- ノード：`feature:today/daily-treat`　出典：`src/lib/mock/model.ts:72-93`
- 日付ごとに1つ、候補の中から決まった「今日の楽しみ」を選ぶ。種類（小さな冒険・食べ物・趣味・小さなご褒美）、休日だけ・外でという条件を持つ。

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0079 | 合う楽しみがなければ全部の中から選ぶ | `rule:today/treat-fallback-all` | `src/lib/mock/model.ts:453-454` |  |
| BR-0080 | 「休日だけ」の楽しみは休日でない日には出さない | `rule:today/treat-holiday-only` | `src/lib/mock/model.ts:451-453` |  |
| BR-0081 | 「外で」の楽しみは雨の日には出さない | `rule:today/treat-outdoor-not-rainy` | `src/lib/mock/model.ts:451-453` |  |
| BR-0082 | ご褒美の楽しみには条件の文が付く △ | `rule:today/treat-reward-conditions` | `src/lib/mock/sample.ts:258-260` |  |
| BR-0083 | 今日の楽しみは日ごとに決まり、全部を一巡し、前の日と同じにならない | `rule:today/treat-rotation` | `src/lib/mock/model.ts:432-448` |  |

#### FR-007 今日の起床・就寝・最初の予定

- ノード：`feature:today/day-card`　出典：`src/components/today/DayCard.tsx:9-50`
- 今日の起床と就寝の時刻、最初の予定と出発時刻（あと何分）、行動ポイントを1枚にまとめて見せる。

#### FR-008 今日の行動ポイント表示

- ノード：`feature:today/energy-line`　出典：`src/components/today/DayCard.tsx:52-80`
- 今日の行動ポイントの使用量と上限を1行のメーターで見せ、体力が少ない日や上限超えの日は提案を添える。
- 前提：`feature:planner`（`src/components/today/DayCard.tsx:55`）

#### FR-009 帰宅時の体力の質問

- ノード：`feature:today/evening-card`　出典：`src/components/today/EveningCard.tsx:17-68`
- 外出した日の夜に帰宅したら残りの体力（多い・ふつう・少ない）を聞き、その夜だけ組み直す入力にする。

#### FR-010 今日の画面のカード構成

- ノード：`feature:today/layout`　出典：`src/components/today/TodayScreen.tsx:49-171`
- 今日の画面のカードを、答えが要るもの→今の時間のもの→今日の流れ→そのほかの順に並べ、広い画面では2列にする。

#### FR-011 今日の食事（家で・外で）

- ノード：`feature:today/meal-card`　出典：`src/components/today/MealCard.tsx:8-62`
- 今日の朝・昼・夕の食事ごとに、家で食べるか外で食べるかを選ぶ。選ばなければ予定の空きから自動で決まる。
- 前提：`feature:habits`（`src/components/today/MealCard.tsx:13-14`）

#### FR-012 朝ルーティンのカード

- ノード：`feature:today/morning-card`　出典：`src/components/today/MorningCard.tsx:79-262`
- 「起きた」の記録、今の疲れ、睡眠時間、朝ルーティンの手順チェックをまとめたカード。朝が終わると1行にたたまれる。
- 前提：`integration:apple-shortcuts-health`（`src/components/today/MorningCard.tsx:131-135`）、`feature:night`（`src/components/today/MorningCard.tsx:126`）

#### FR-013 朝ルーティンの手順チェック

- ノード：`feature:today/morning-routine-checklist`　出典：`src/components/today/MorningCard.tsx:235-259`
- 設定した手順を1つずつチェックし、全部終われば完了時刻を残す。手順がなければ設定へ案内する。

#### FR-014 朝ルーティンの手順

- ノード：`feature:today/morning-routine-steps`　出典：`src/lib/mock/sample.ts:263-271`
- 朝ルーティンは手順の一覧で、初期は布団の中の伸び→カーテンと光→水の3つ。

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0084 | 顔を洗うなどは朝ルーティンに入れず、身支度に入れる △ | `rule:today/routine-wash-face-in-prep` | `src/lib/mock/sample.ts:263-266` |  |

#### FR-015 お知らせ（足りない時間・移動時間・お休み習慣）

- ノード：`feature:today/notices`　出典：`src/components/today/Notices.tsx:68-165`
- 締切に足りないタスク、移動時間のわからない予定、締切を優先してお休みにした習慣を一覧で知らせ、その場で直せるようにする。
- 前提：`feature:planner`（`src/components/today/Notices.tsx:89-91`）

#### FR-016 作業の進み具合

- ノード：`feature:today/progress-card`　出典：`src/components/today/ProgressCard.tsx:11-53`
- 終わった作業の枠について、予定どおり・できなかった・完了・残り時間を直して確定のいずれかで答えるカード。
- 前提：`feature:tasks`（`src/components/today/ProgressCard.tsx:7`）

#### FR-017 今から立て直す

- ノード：`feature:today/recovery-card`　出典：`src/components/today/RecoveryCard.tsx:16-120`
- 今から寝る・起きたところ・疲れている、のいずれかと時刻を入れて、そこから日の計画を組み直すカード。
- 前提：`feature:recovery`（`src/components/today/RecoveryCard.tsx:7`）

#### FR-018 習慣の2週間の見直し

- ノード：`feature:today/review-card`　出典：`src/components/today/ReviewCard.tsx:22-78`
- 少しずつ増やす習慣について、2週間の実績を見て時間を増やすか・きっかけを変えるか・このままかを選ぶカード。
- 前提：`feature:habits`（`src/components/today/ReviewCard.tsx:26-29`）

#### FR-019 今日の画面の共通部品

- ノード：`feature:today/shared-parts`　出典：`src/components/today/parts.tsx:10-49`
- 今日の画面のカードで共有する色の引き当て・時刻表示・チェック円・楽しみの文の部品。

#### FR-020 睡眠時間の入力

- ノード：`feature:today/sleep-input`　出典：`src/components/today/MorningCard.tsx:14-53`
- 前の夜の睡眠時間を15分刻みの−＋で合わせて記録する。夜の記録の値があればそれを初期値にする。

#### FR-021 タバコの記録

- ノード：`feature:today/smoke-card`　出典：`src/components/today/SmokeCard.tsx:8-50`
- 「吸った」を押すと時刻だけを残し、今日の本数と時刻を小さく見せる。目標や多い少ないは出さない。

#### FR-022 今日の流れ

- ノード：`feature:today/timeline`　出典：`src/components/today/Timeline.tsx:33-242`
- 今日のこれからの予定・授業・取り込み予定・自動で置いた枠・移動・空けた時間を時刻順に並べ、いまと次を示す。
- 前提：`feature:weather`（`src/components/today/Timeline.tsx:61`）、`feature:habits`（`src/components/today/Timeline.tsx:89-98`）

#### FR-023 移動時間の質問行

- ノード：`feature:today/travel-question`　出典：`src/components/today/Notices.tsx:21-64`
- 場所の移動時間がわからないとき、片道の分を入れて場所として登録する行。

#### FR-024 今日の楽しみ

- ノード：`feature:today/treat-card`　出典：`src/components/today/TreatCard.tsx:9-25`
- 今日の楽しみを1つ見せる。リストが空なら追加を案内する。
- 前提：`feature:weather`（`src/components/today/parts.tsx:37`）

#### FR-025 今日の楽しみが開くときのアニメーション

- ノード：`feature:today/treat-reveal-animation`　出典：`src/app/globals.css:120-133`
- 少し下から浮かんで現れる。

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0085 | 動きを減らす設定のときは、今日の楽しみが開くアニメをしない | `rule:app/respect-reduced-motion` | `src/app/globals.css:120-138` |  |

#### FR-026 「起きた」の連続日数

- ノード：`feature:today/wake-streak`　出典：`src/lib/mock/model.ts:460-470`
- 「起きた」を押した日が何日続いているかを数える。

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0086 | 連続日数は今日がまだなら昨日から数える | `rule:today/wake-streak-count` | `src/lib/mock/model.ts:461-470` |  |

#### FR-027 今から何する？（今からできるタスクを選ぶ）

- ノード：`feature:today/work-now`　出典：`src/lib/mock/recovery.ts:38-77`
- 今からの空き時間と分数に入るタスクを締切の近い順に候補に出し、選んだら固定の枠にする。

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0087 | 選んだタスクは固定の枠にし、今より後の自動のタスク枠は外す | `rule:today/start-work-now-pins` | `src/lib/mock/recovery.ts:107-113` |  |
| BR-0088 | 締切が3週間以内のタスクだけ、自動で置く前でも選べる | `rule:today/work-now-deadline-window` | `src/lib/mock/recovery.ts:62-74` | `setting:today/work-now-days` |
| BR-0089 | 選んだ分数と見積もりの短いほうで、空きに収まるものだけ | `rule:today/work-now-fit` | `src/lib/mock/recovery.ts:71-73` |  |
| BR-0090 | 空き時間の終わりは、寝る準備の前か次の固定の始まり | `rule:today/work-now-gap-end` | `src/lib/mock/recovery.ts:58-59` |  |
| BR-0091 | 今の空き時間は、予定・今の計画・始まった作業・睡眠を守る | `rule:today/work-now-gap-protects` | `src/lib/mock/recovery.ts:37-57` |  |
| BR-0092 | 分数は5〜180分だけ受け付ける | `rule:today/work-now-minutes-range` | `src/lib/mock/recovery.ts:67` |  |
| BR-0093 | 5分だけ追加しても予定の総量を15分単位に水増ししない △ | `rule:today/work-now-no-padding` | `src/lib/mock/recovery.test.ts:117-121` |  |
| BR-0094 | 候補は締切の近い順、同じなら優先度の高い順 | `rule:today/work-now-order` | `src/lib/mock/recovery.ts:70` |  |

| ID | 設定・調整値 | 値 | ノード | 出典 |
|---|---|---|---|---|
| ST-005 | 今から何する？に出すタスクの締切（3週間） | 21 | `setting:today/work-now-days` | `src/lib/mock/recovery.ts:62-63` |

##### FR-028 今から何する？の最初の分数

- ノード：`feature:today/free-now-minutes`　出典：`src/lib/mock/recovery.ts:121-126`
- 今からの空き時間を5分刻みで切り捨てて、最初の分数にする。

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0095 | 最初の分数は5〜180分。作業できる時間でなければなし | `rule:today/free-now-minutes-range` | `src/lib/mock/recovery.ts:122-126` |  |

#### FR-029 今から何する？

- ノード：`feature:today/work-now-card`　出典：`src/components/today/WorkNowCard.tsx:14-87`
- 押した分（よく使う長さと今の空き時間）から、いま始められるタスクと習慣の候補を出し、押すと今から始める。
- 前提：`feature:tasks`（`src/components/today/WorkNowCard.tsx:8`）

#### FR-030 今から何する？の習慣の候補

- ノード：`feature:today/work-now-habits`　出典：`src/lib/mock/recovery.ts:79-105`
- 今からできる習慣（散歩・自己成長・家での運動など）を最大3つ候補に出し、選ぶと今から固定の枠にする。
- 前提：`feature:weather`（`src/lib/mock/recovery.ts:89`）、`feature:habits`（`src/lib/mock/recovery.ts:91`）

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0096 | 選んだ習慣は今から固定の枠にする | `rule:today/start-habit-now-pins` | `src/lib/mock/recovery.ts:100-105` |  |
| BR-0097 | 時刻の決まる習慣・待ち時間のある作業・今日始めたものは出さない | `rule:today/work-now-habits-excluded` | `src/lib/mock/recovery.ts:79-92` |  |
| BR-0098 | 習慣の候補は最大3つ | `rule:today/work-now-habits-limit` | `src/lib/mock/recovery.ts:97` |  |
| BR-0099 | 雨の日は習慣の代わり（光を浴びる）を出す | `rule:today/work-now-habits-rain` | `src/lib/mock/recovery.ts:89-94` |  |

### FR-031 カレンダー画面

- ノード：`feature:calendar`　出典：`src/components/calendar/CalendarApp.tsx:1-454`


| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0100 | 任意参加で参加しない授業の回は、薄く点線で出す | `rule:calendar/optional-class-dashed` | `src/app/globals.css:400-408` |  |
| BR-0101 | 選んだ予定・枠は赤い輪郭で示す（1回押して選び、もう1回で開く） △ | `rule:calendar/selected-event-ring` | `src/app/globals.css:388-391` |  |

| ID | 設定・調整値 | 値 | ノード | 出典 |
|---|---|---|---|---|
| ST-006 | 月表示で端に近づいたとみなす週数 | 2 | `setting:calendar/month-edge` | `src/components/calendar/CalendarView.tsx:76` |
| ST-007 | 月表示で今の週の前に置く週数 | 9 | `setting:calendar/month-lead` | `src/components/calendar/CalendarView.tsx:75` |
| ST-008 | 月表示で画面に入れる週数 | 6 | `setting:calendar/month-rows` | `src/components/calendar/CalendarView.tsx:78` |
| ST-009 | 月表示で縦に並べておく週数 | 26 | `setting:calendar/month-weeks` | `src/components/calendar/CalendarView.tsx:74` |
| ST-010 | 30分の高さの初期値（px） | 34 | `setting:calendar/slot-default` | `src/components/calendar/CalendarView.tsx:60` |
| ST-011 | 30分の高さの上限（px） | 90 | `setting:calendar/slot-max` | `src/components/calendar/CalendarView.tsx:62` |
| ST-012 | 30分の高さの下限（px） | 20 | `setting:calendar/slot-min` | `src/components/calendar/CalendarView.tsx:61` |
| ST-013 | 30分の高さを覚える保存キー | task-rhythm:slot-height | `setting:calendar/slot-storage-key` | `src/components/calendar/CalendarView.tsx:59` |
| ST-014 | ドラッグで動く刻み | — | `setting:calendar/snap-minutes` | `src/components/calendar/CalendarView.tsx:871-873` |
| ST-015 | 横に並べておく日数 | 42 | `setting:calendar/strip-days` | `src/components/calendar/CalendarView.tsx:55` |
| ST-016 | 端に近づいたとみなす日数 | 5 | `setting:calendar/strip-edge` | `src/components/calendar/CalendarView.tsx:57` |
| ST-017 | 並べ直したとき今の日の前に置く日数 | 14 | `setting:calendar/strip-lead` | `src/components/calendar/CalendarView.tsx:56` |
| ST-018 | 同じタップとみなす時間（ミリ秒） | 500 | `setting:calendar/tap-repeat-ignore-ms` | `src/components/calendar/CalendarApp.tsx:32` |

#### FR-032 枠・予定の見せ方

- ノード：`feature:calendar/block-display`　出典：`src/components/calendar/CalendarView.tsx:118-205`
- タスク・習慣・朝ルーティンの枠を種類の色で出し、固定の印や関連する予定の名前を添える。

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0102 | タスク枠に関連する予定の名前を出す | `rule:calendar/block-shows-related-event` | `src/components/calendar/CalendarView.tsx:692-706` |  |
| BR-0103 | 枠は種類ごとのカレンダーの色（タスク・習慣・朝ルーティン） | `rule:calendar/blocks-colored-by-kind` | `src/components/calendar/CalendarView.tsx:118` |  |
| BR-0104 | 固定された枠には固定の印 | `rule:calendar/pinned-icon` | `src/components/calendar/CalendarView.tsx:149-158` |  |
| BR-0105 | 朝ルーティンは動かせない | `rule:calendar/routine-block-not-draggable` | `src/components/calendar/CalendarView.tsx:700-701` |  |

#### FR-033 枠をドラッグして固定

- ノード：`feature:calendar/block-drag-pin`　出典：`src/components/calendar/CalendarApp.tsx:147-156`
- タスク・習慣の枠をドラッグすると、その位置に固定され自動配置で動かなくなる。固定は解除できる。

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0106 | タスク・習慣の枠は終日に置けない | `rule:calendar/block-not-allday` | `src/components/calendar/CalendarView.tsx:801-805` |  |
| BR-0107 | 枠をドラッグすると固定される | `rule:calendar/drag-pins-block` | `src/components/calendar/CalendarApp.tsx:146-157` |  |

#### FR-034 枠からの記録（やった・できなかった・飛ばす・空ける）

- ノード：`feature:calendar/block-record`　出典：`src/components/calendar/CalendarApp.tsx:374-454`
- カレンダーの枠から習慣の「やった／少しだけ／できなかった」、「今日は飛ばす」、タスクの「この時間は空ける」を行う。

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0108 | 「少しだけ」は許す習慣だけ | `rule:calendar/block-record-five-if-allowed` | `src/components/calendar/CalendarApp.tsx:412-416` |  |
| BR-0109 | 始まっていないタスク枠は「この時間は空ける」 | `rule:calendar/block-record-free-unstarted-task` | `src/components/calendar/CalendarApp.tsx:381-394` |  |
| BR-0110 | 習慣の「やった／少しだけ」は始まった枠だけ | `rule:calendar/block-record-habit-done-only-started` | `src/components/calendar/CalendarApp.tsx:401-421` |  |
| BR-0111 | 終わった未記録の「記録する」習慣は「できなかった」を出す | `rule:calendar/block-record-miss-tracked` | `src/components/calendar/CalendarApp.tsx:422-434` |  |
| BR-0112 | 飛ばせる習慣・食事は終わる前なら「今日は飛ばす／外で食べる」 | `rule:calendar/block-record-skip-today` | `src/components/calendar/CalendarApp.tsx:435-453` |  |
| BR-0113 | 始まったタスク枠は今日の画面で進み具合を確認 △ | `rule:calendar/block-record-started-task-to-today` | `src/components/calendar/CalendarApp.tsx:377-395` |  |
| BR-0114 | 記録の日付は起きている日で決める | `rule:calendar/block-record-waking-day` | `src/components/calendar/CalendarApp.tsx:399-400` |  |

#### FR-035 タスク・習慣の枠の詳細シート

- ノード：`feature:calendar/block-sheet`　出典：`src/components/calendar/InfoSheet.tsx:50-98`
- 枠を開くと種類・日時・長さ・関連する予定を見せ、固定の解除やタスクの編集、記録ボタンを出す。

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0115 | 「タスクを編集」はタスクの枠だけ | `rule:calendar/block-sheet-edit-task-only-task` | `src/components/calendar/InfoSheet.tsx:90-94` |  |
| BR-0116 | 固定を外すボタンは固定された枠だけ、朝ルーティンには出さない | `rule:calendar/block-sheet-pin-release-not-routine` | `src/components/calendar/InfoSheet.tsx:80-89` |  |
| BR-0117 | 関連する予定があれば「〜の準備」と添える | `rule:calendar/block-sheet-related-event` | `src/components/calendar/InfoSheet.tsx:74-79` |  |

#### FR-036 カレンダーの種類と色

- ノード：`feature:calendar/calendar-kinds`　出典：`src/lib/mock/calendars.ts:1-23`
- 予定・遊び・授業・タスク・習慣・朝ルーティン・Google（取り込み）の7種類があり、それぞれに名前と色を持つ。表示するか、色を変えるかを設定できる。

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0118 | 自分で予定を入れるカレンダーは「予定」と「遊び」だけ | `rule:calendar/own-calendars-only-two` | `src/lib/mock/calendars.ts:3-4` |  |
| BR-0119 | カレンダーの色は #rrggbb の形だけ読む | `rule:sync/calendar-color-hex` | `src/lib/mock/state.ts:440-442` |  |

| ID | 設定・調整値 | 値 | ノード | 出典 |
|---|---|---|---|---|
| ST-019 | カレンダーの色 | — | `setting:calendar/colors` | `src/lib/mock/model.ts:325-326` |
| ST-020 | 表示しないカレンダー | — | `setting:calendar/hidden` | `src/lib/mock/model.ts:286-287` |

#### FR-037 表示するカレンダーの切り替え

- ノード：`feature:calendar/calendar-toggles`　出典：`src/components/calendar/CalendarToggles.tsx:6-48`
- カレンダーごとに表示のオン・オフを切り替える。広い画面は左の列、狭い画面は左から出るシートに出す。

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0120 | 非表示にしたカレンダーは予定・枠・移動を出さない | `rule:calendar/hidden-calendars-not-shown` | `src/components/calendar/CalendarView.tsx:658-691` |  |
| BR-0121 | 点線の枠はアプリが置いたものと説明する | `rule:calendar/toggle-hint-text` | `src/components/calendar/CalendarToggles.tsx:43-45` |  |
| BR-0122 | 非表示に入っていないカレンダーを表示中とみなす | `rule:calendar/toggle-on-off-semantics` | `src/components/calendar/CalendarToggles.tsx:17-21` |  |

#### FR-038 授業の1回ぶんの操作

- ノード：`feature:calendar/class-occurrence`　出典：`src/components/calendar/CalendarApp.tsx:120-144`
- 時間割から作った授業の回ごとに、任意参加の出欠の切り替えと休講にできる。

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0123 | 授業を休講にすると出席の記録も外れる | `rule:calendar/class-cancel-clears-attendance` | `src/components/calendar/CalendarApp.tsx:133-139` |  |
| BR-0124 | 任意参加の授業だけ「この回は参加する」を出す | `rule:calendar/class-optional-attend-toggle` | `src/components/calendar/CalendarApp.tsx:312-326` |  |

#### FR-039 月表示のタスク締切の印

- ノード：`feature:calendar/deadline-marks`　出典：`src/components/calendar/CalendarView.tsx:661-681`
- 月表示で締切の日に「〆 タスク名」を出し、押すとそのタスクを開く。配置が足りない締切は遅れの印をつける。

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0125 | 配置できずに足りないタスクの締切は遅れの印 | `rule:calendar/deadline-late-mark` | `src/components/calendar/CalendarView.tsx:662-675` |  |
| BR-0126 | 日付だけの締切は翌日0:00の前の日に出す | `rule:calendar/deadline-shown-day-before-midnight` | `src/components/calendar/CalendarView.tsx:665-672` |  |

#### FR-040 予定の種類ごとの色

- ノード：`feature:calendar/event-colors`　出典：`src/app/globals.css:27-36`
- 自分・楽しみ・授業・タスク・習慣・朝ルーティン・Google・移動の色を変数で持ち、予定のチップはその色を薄く混ぜて出す。ダークモードでは別の色。
- 前提：`integration:fullcalendar`（`src/app/globals.css:333-360`）

| ID | 設定・調整値 | 値 | ノード | 出典 |
|---|---|---|---|---|
| ST-021 | 予定のチップの濃さ（通常17%・アプリが置いた枠11%・固定した枠22%） | 17% / 11% / 22% | `setting:calendar/chip-tint-percent` | `src/app/globals.css:20-22` |
| ST-022 | カレンダーの色の初期値 △ | — | `setting:calendar/color-defaults` | `src/app/globals.css:27-34` |

#### FR-041 予定の入力フォーム

- ノード：`feature:calendar/event-form`　出典：`src/components/calendar/EventForm.tsx:53-238`
- タイトル・カレンダー・日時・終日・場所・移動時間・在宅・身支度・メモを入れる予定の編集シート。

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0127 | 終日の終わりは最終日の翌日0:00で持つ | `rule:calendar/event-form-allday-end-exclusive` | `src/components/calendar/EventForm.tsx:38-39` |  |
| BR-0128 | 終日をやめたら 9:00〜10:00 に直す | `rule:calendar/event-form-allday-toggle-defaults` | `src/components/calendar/EventForm.tsx:73-81` |  |
| BR-0129 | 題名が空なら「新規予定」 | `rule:calendar/event-form-default-title` | `src/components/calendar/EventForm.tsx:123` |  |
| BR-0130 | 削除は既存の予定だけ、確認つき | `rule:calendar/event-form-delete-only-existing` | `src/components/calendar/EventForm.tsx:230-234` |  |
| BR-0131 | 終了が開始以前なら翌日の時刻とみなす | `rule:calendar/event-form-end-next-day` | `src/components/calendar/EventForm.tsx:111-113` |  |
| BR-0132 | 開始の時刻を変えたら長さを保って終了も動かす | `rule:calendar/event-form-keeps-length-on-start-change` | `src/components/calendar/EventForm.tsx:92-99` |  |
| BR-0133 | 予定は自分のカレンダーのどれかに入れる | `rule:calendar/event-form-own-calendars` | `src/components/calendar/EventForm.tsx:32` |  |
| BR-0134 | 「顔を出す」は時刻の予定だけ、「家にいない」は終日だけ保存 | `rule:calendar/event-form-prep-only-timed-and-away-only-allday` | `src/components/calendar/EventForm.tsx:131-132` |  |
| BR-0135 | 複数日・終日の予定は日付を変えたら終わりの日も同じ日数ずらす | `rule:calendar/event-form-shifts-end-date-with-date` | `src/components/calendar/EventForm.tsx:83-90` |  |
| BR-0136 | 移動時間が空なら「自動」 | `rule:calendar/event-form-travel-blank-auto` | `src/components/calendar/EventForm.tsx:117` |  |
| BR-0137 | 入力の検証（日時必須・終了が後・移動は0以上） | `rule:calendar/event-form-validation` | `src/components/calendar/EventForm.tsx:114-118` |  |

#### FR-042 予定の日時の表記

- ノード：`feature:calendar/event-label`　出典：`src/lib/mock/related.ts:52-64`
- 「10/4(日) 15:00」（終日は日付と「終日」）、カレンダーの枠用の「面接 10/4 15:00」の短い形を作る。関連する予定の強調には予定ごとの印を使う。

#### FR-043 予定の出どころ（自分・授業・Google）をまとめて扱う

- ノード：`feature:calendar/event-sources`　出典：`src/lib/mock/related.ts:8-34`
- 自分で入れた予定・授業・Google の予定を1つの一覧にし、予定の ID から探せるようにする。授業で出ない回は参加しない印をつける。
- 前提：`integration:ical-import`（`src/lib/mock/related.ts:28`）

#### FR-044 取り込んだ予定の移動（片道）の指定

- ノード：`feature:calendar/imported-travel`　出典：`src/components/calendar/CalendarApp.tsx:328-355`
- Google から取り込んだ予定を開いて、移動の片道分を選ぶ。場所がないと家にいる扱いなので、外出として扱わせるのに使う。

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0138 | 移動（片道）の指定は Google 取り込み予定だけ | `rule:calendar/imported-travel-only-google` | `src/components/calendar/CalendarApp.tsx:328-355` |  |

| ID | 設定・調整値 | 値 | ノード | 出典 |
|---|---|---|---|---|
| ST-023 | 移動（片道）の選択肢（分） | — | `setting:calendar/imported-travel-choices` | `src/components/calendar/CalendarApp.tsx:347-351` |

#### FR-045 日本時間での日時の表示と入力

- ノード：`feature:calendar/jst-display`　出典：`src/lib/mock/jst.ts:1-100`
- 画面はいつも日本時間で動き、日時・時刻・日付・締切・分を決まった形で表示し、入力欄の値と相互に変換する。
- 前提：`integration:fullcalendar`（`src/lib/mock/jst.ts:14-19`）

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0139 | 画面はいつも日本時間で表示し、端末のタイムゾーンに左右されない | `rule:calendar/always-jst` | `src/lib/mock/jst.ts:4-6` |  |
| BR-0140 | 日付だけの値は日本時間の「YYYY-MM-DD」 | `rule:calendar/date-key-jst` | `src/lib/mock/model.ts:12-13` |  |
| BR-0141 | 締切の0:00は前の日の終わりとして「〇/〇(曜)まで」と表す | `rule:calendar/deadline-label` | `src/lib/mock/jst.ts:81-86` |  |
| BR-0142 | FullCalendar には日本時間の壁時計の値を UTC として渡す | `rule:calendar/fullcalendar-utc-shift` | `src/lib/mock/jst.ts:14-19` |  |
| BR-0143 | 時刻だけの入力は、基準の時刻に対して前か後でいちばん近い日時にする | `rule:calendar/input-time-day-pick` | `src/lib/mock/jst.ts:58-68` |  |

#### FR-046 分単位の時刻の入力と表示

- ノード：`feature:calendar/minute-of-day-format`　出典：`src/lib/mock/model.ts:472-499`
- 0時からの分と「HH:MM」の文字を相互に変換し、24時を超える分は翌日の時刻として扱う。

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0144 | HH:MM は0:00〜23:59のものだけ読む | `rule:calendar/hhmm-valid-range` | `src/lib/mock/model.ts:482-487` |  |
| BR-0145 | 24時を超える分は翌日の時刻として扱い、表示には「翌」を付ける | `rule:calendar/minutes-over-24h-next-day` | `src/lib/mock/model.ts:476-494` |  |
| BR-0146 | 終了が開始以前なら翌日の終了とみなす | `rule:calendar/span-end-before-start-next-day` | `src/lib/mock/model.ts:496-499` |  |

#### FR-047 月表示の日付セル

- ノード：`feature:calendar/month-day-cells`　出典：`src/components/calendar/CalendarView.tsx:759-769`
- 日付の下に時刻の予定の件数を点で出す。1日には「月/1」と出し、点がない日も高さをそろえる。

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0147 | 月表示の点は4つまで、5件以上は＋ | `rule:calendar/month-dots-cap` | `src/components/calendar/CalendarView.tsx:759-769` |  |
| BR-0148 | 月表示の1日には「月/1」と出す | `rule:calendar/month-first-day-label` | `src/components/calendar/CalendarView.tsx:849-850` |  |

#### FR-048 月表示：見渡すための画面

- ノード：`feature:calendar/month-overview`　出典：`src/app/globals.css:626-680`
- 日付の下に時刻の予定の件数を点で、締切は〆で出す。週を縦に途切れずに並べ、1週ずつ止まる。
- 前提：`integration:fullcalendar`（`src/app/globals.css:626-680`）

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0149 | 締切は タスクの色、遅れたものは赤の太字 | `rule:calendar/deadline-late-red` | `src/app/globals.css:636-645` |  |
| BR-0150 | 月表示は1週ずつ止まり、曜日の見出しは固定 | `rule:calendar/month-snaps-per-week` | `src/app/globals.css:647-672` |  |

#### FR-049 月表示（週を縦に連ねる）

- ノード：`feature:calendar/month-view`　出典：`src/components/calendar/CalendarView.tsx:73-78`
- 週を縦に途切れずに並べ、1週ずつ止まる見渡し用の月表示。日付を押すとその日の3日・週表示へ移る。
- 前提：`integration:fullcalendar`（`src/components/calendar/CalendarView.tsx:73-78`）

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0151 | 月表示は終日の予定だけ文字で出す | `rule:calendar/month-hides-timed-events` | `src/components/calendar/CalendarView.tsx:655-658` |  |
| BR-0152 | 月表示で日付を押すとその日の3日・週表示へ | `rule:calendar/month-pick-day-jump` | `src/components/calendar/CalendarApp.tsx:240-243` |  |
| BR-0153 | 月表示の見出しは画面の真ん中あたりの週で決める | `rule:calendar/month-title-from-middle-week` | `src/components/calendar/CalendarView.tsx:587-594` |  |
| BR-0154 | 月表示は1週ずつ止まり、端で並べ直す | `rule:calendar/month-weeks-snap-and-recenter` | `src/components/calendar/CalendarView.tsx:595-624` | `setting:calendar/month-weeks` `setting:calendar/month-lead` `setting:calendar/month-edge` `setting:calendar/month-rows` |

#### FR-050 自分の予定の作成・編集・削除・ドラッグ

- ノード：`feature:calendar/own-event-edit`　出典：`src/components/calendar/CalendarApp.tsx:91-117`
- 空き時間や日付を押して予定を作り、押して編集・削除し、ドラッグやリサイズで動かせる。

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0155 | 空き時間を押すと60分、終日欄は終日の予定を作る | `rule:calendar/create-by-tap-60min` | `src/components/calendar/CalendarView.tsx:776-783` |  |
| BR-0156 | 予定の保存は既存なら置き換え、なければ追加 | `rule:calendar/event-delete-and-save-upsert` | `src/components/calendar/CalendarApp.tsx:95-105` |  |
| BR-0157 | ドラッグ後の予定は終日の印を引き継ぐ | `rule:calendar/event-drag-allday-flag` | `src/components/calendar/CalendarApp.tsx:106-117` |  |
| BR-0158 | 動かせるのは自分の予定だけ | `rule:calendar/only-own-events-editable` | `src/components/calendar/CalendarView.tsx:120-129` |  |

#### FR-051 ピンチで30分の高さを変える

- ノード：`feature:calendar/pinch-zoom`　出典：`src/components/calendar/CalendarView.tsx:332-450`
- 2本指のピンチやCtrl＋スクロールで30分の高さを変え、予定も同時に伸び縮みする。高さは端末に覚える。
- 前提：`integration:browser-storage`（`src/components/calendar/CalendarView.tsx:332-450`）

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0159 | Ctrl＋スクロールもピンチとして扱う | `rule:calendar/ctrl-wheel-is-pinch` | `src/components/calendar/CalendarView.tsx:420-433` |  |
| BR-0160 | ピンチの高さは20〜90pxに収め、端末に覚える | `rule:calendar/pinch-clamp-and-persist` | `src/components/calendar/CalendarView.tsx:63-71` | `setting:calendar/slot-default` `setting:calendar/slot-min` `setting:calendar/slot-max` |
| BR-0161 | ピンチ中は横縦スクロールと1日ずつ止める仕組みを止める | `rule:calendar/pinch-freezes-scroll` | `src/components/calendar/CalendarView.tsx:385-417` |  |
| BR-0162 | ピンチの点の時刻が指の下から動かないよう縦位置を合わせる | `rule:calendar/pinch-keeps-focus-time` | `src/components/calendar/CalendarView.tsx:347-376` |  |

#### FR-052 読み取り専用の予定シート

- ノード：`feature:calendar/readonly-event-sheet`　出典：`src/components/calendar/InfoSheet.tsx:100-128`
- 取り込んだ予定や授業の日時・場所・説明・出どころを見せるシート。関連するタスクと操作を下に並べる。

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0163 | 終日は日付だけ、複数日は期間で出す | `rule:calendar/readonly-sheet-when-text` | `src/components/calendar/InfoSheet.tsx:112-116` |  |
| BR-0164 | 取り込み予定・授業は読み取り専用と出す | `rule:calendar/readonly-source-label` | `src/components/calendar/CalendarApp.tsx:303-311` |  |

#### FR-053 関連する予定とタスクの強調

- ノード：`feature:calendar/related-focus`　出典：`src/components/calendar/CalendarApp.tsx:33-44`
- 予定を押す・重ねると、関連するタスクの枠までまとめて強調し、ほかを薄くする。

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0165 | 関連するタスクがある予定にはまとまりと件数の印 | `rule:calendar/event-group-for-related` | `src/components/calendar/CalendarView.tsx:130-147` |  |
| BR-0166 | 関連するまとまり以外は薄く、まとまりは枠で強調 | `rule:calendar/focus-group-dim` | `src/components/calendar/CalendarApp.tsx:33-44` |  |
| BR-0167 | タスク枠は関連する予定があるときだけまとまりを持つ | `rule:calendar/task-block-group-needs-related-event` | `src/components/calendar/CalendarApp.tsx:84-88` |  |

#### FR-054 予定に関連するタスクの一覧

- ノード：`feature:calendar/related-tasks`　出典：`src/components/calendar/InfoSheet.tsx:11-46`
- 予定の詳細に、その予定に関連するタスクと配置された日時、編集ボタンを並べる。

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0168 | 配置がないタスクは「まだ配置できていません」 | `rule:calendar/related-tasks-unplaced-warning` | `src/components/calendar/InfoSheet.tsx:12-40` |  |

#### FR-055 睡眠と、就寝3時間前からのタバコを控える時間の帯

- ノード：`feature:calendar/sleep-bands`　出典：`src/app/globals.css:517-535`
- 睡眠は淡い紫の帯、タバコを控える時間はそれより薄い帯で背景に出す。
- 前提：`feature:rhythm`（`src/app/globals.css:517-535`）

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0169 | 就寝の3時間前から就寝までは「タバコはここまで」の帯 | `rule:calendar/nosmoke-band-before-bed` | `src/components/calendar/CalendarView.tsx:742-754` | `setting:notifications/smoke-cutoff-minutes` |
| BR-0170 | 睡眠の帯は就寝から翌日の起床まで | `rule:calendar/sleep-band-from-bed-to-next-wake` | `src/components/calendar/CalendarView.tsx:725-741` |  |

#### FR-056 3日・週の横めくり表示

- ノード：`feature:calendar/strip-view`　出典：`src/components/calendar/CalendarView.tsx:54-57`
- 横に42日ぶん並べた日を指で動かして1日ずつ止まる。端に近づくと並べ直して途切れなく見せる。
- 前提：`integration:fullcalendar`（`src/components/calendar/CalendarView.tsx:54-57`）

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0171 | FullCalendar には +9時間ずらした日本時間を渡す △ | `rule:calendar/fc-utc-shift` | `src/components/calendar/CalendarView.tsx:829-830` |  |
| BR-0172 | 指を置いている間は並べ直さない | `rule:calendar/settle-not-while-touching` | `src/components/calendar/CalendarView.tsx:532-546` |  |
| BR-0173 | 日の途中で止まったら近い日の境目へ寄せる | `rule:calendar/settle-snap-to-day` | `src/components/calendar/CalendarView.tsx:538-544` |  |
| BR-0174 | 端に近づいたら並べ直す | `rule:calendar/strip-recenter-near-edge` | `src/components/calendar/CalendarView.tsx:304-312` | `setting:calendar/strip-days` `setting:calendar/strip-lead` `setting:calendar/strip-edge` |
| BR-0175 | 表示する日数は3日・週は7日 | `rule:calendar/visible-days-by-mode` | `src/components/calendar/CalendarView.tsx:274-284` |  |
| BR-0176 | 週表示は月曜始まりで、最初はその週の月曜 | `rule:calendar/week-home-monday` | `src/components/calendar/CalendarView.tsx:244-249` |  |

#### FR-057 3日・週表示：横に日をめくり、縦に時間を動かす

- ノード：`feature:calendar/swipe-strip`　出典：`src/app/globals.css:537-577`
- 横の枠の中に縦の枠を入れ、指の向きで片方だけが動く。横は1日ずつぴったり止まる。
- 前提：`integration:fullcalendar`（`src/app/globals.css:537-577`）

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0177 | ピンチの間は縦も横も動かさない | `rule:calendar/pinch-locks-scroll` | `src/app/globals.css:573-576` |  |
| BR-0178 | 30分の高さはピンチで変える（既定2.6em） | `rule:calendar/slot-height-pinch` | `src/app/globals.css:677-680` |  |
| BR-0179 | 3日・週は1日ずつ止まる | `rule:calendar/strip-snaps-per-day` | `src/app/globals.css:537-566` |  |

| ID | 設定・調整値 | 値 | ノード | 出典 |
|---|---|---|---|---|
| ST-024 | 30分の枠の高さ（既定 2.6em） | 2.6em | `setting:calendar/slot-height` | `src/app/globals.css:677-680` |

#### FR-058 1回目は選ぶ・2回目で開く

- ノード：`feature:calendar/tap-select`　出典：`src/components/calendar/CalendarApp.tsx:60-75`
- 予定や枠を1回押すと選ぶだけで、同じものをもう1回押すと詳しく開く。1回目は関連する予定・タスクを光らせる。
- 前提：`feature:calendar/related-focus`（`src/components/calendar/CalendarApp.tsx:77-90`）

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0180 | 何もない所を押すと選択を解く（作成より先） | `rule:calendar/empty-click-clears-selection` | `src/components/calendar/CalendarApp.tsx:264-269` |  |
| BR-0181 | 同じものをもう1回押すと開く | `rule:calendar/second-tap-opens` | `src/components/calendar/CalendarApp.tsx:62-75` | `setting:calendar/tap-repeat-ignore-ms` |

#### FR-059 外に出した時刻の目盛り

- ノード：`feature:calendar/time-axis`　出典：`src/app/globals.css:578-625`
- 時刻の目盛りが横に流れないよう外に置き、縦の枠に合わせて動かす。

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0182 | 時刻の目盛りは縦の枠のスクロールに合わせて動く | `rule:calendar/axis-follows-vertical-scroll` | `src/components/calendar/CalendarView.tsx:487-504` |  |
| BR-0183 | 縦は最初だけ今の1時間前から見せる | `rule:calendar/initial-scroll-hour-before-now` | `src/components/calendar/CalendarView.tsx:505-514` |  |

#### FR-060 移動の帯

- ノード：`feature:calendar/travel-band`　出典：`src/components/calendar/CalendarView.tsx:711-723`
- 外出する予定の前後の移動を「移動」の帯で出し、押すとその予定を開く。

#### FR-061 移動の帯（カレンダーと今日の流れの縞）

- ノード：`feature:calendar/travel-bands`　出典：`src/lib/mock/related.ts:66-97`
- 外出する予定の前後に片道ずつ移動の時間帯を作り、押したときに開く予定とセットで返す。

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0184 | 帯を押すと関連する予定を開く（行きは行き先、帰りは出てきた予定） | `rule:calendar/travel-band-opens-event` | `src/lib/mock/related.ts:94-96` |  |
| BR-0185 | 外出の予定の前と後に片道ずつ移動を取る | `rule:calendar/travel-before-after` | `src/lib/mock/related.ts:90` |  |
| BR-0186 | 予定の最中には出さず、間の短い移動は1つにまとめる | `rule:calendar/travel-not-during-events` | `src/lib/mock/related.ts:92-93` |  |
| BR-0187 | 終日の予定・家にいる予定・移動のない予定・参加しない授業・非表示の予定には出さない | `rule:calendar/travel-skip` | `src/lib/mock/related.ts:83-89` |  |

#### FR-062 3日・週・月の表示切り替え

- ノード：`feature:calendar/view-modes`　出典：`src/components/calendar/CalendarApp.tsx:21-25`
- ヘッダーのタブで3日・週・月を切り替え、前へ・今日・次へで移動する。1日だけの表示は作らず最小は3日。

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0188 | 狭い画面は3日、広い画面は週で開く | `rule:calendar/default-view-by-width` | `src/components/calendar/CalendarApp.tsx:49-50` |  |

### FR-063 タスク画面

- ノード：`feature:tasks`　出典：`src/components/tasks/TasksScreen.tsx:1-189`


| ID | 設定・調整値 | 値 | ノード | 出典 |
|---|---|---|---|---|
| ST-025 | タスクを入れない時間帯 △ | — | `setting:tasks/avoid-windows` | `src/lib/mock/insights.ts:93-97` |

#### FR-064 実績からの所要時間の目安

- ノード：`feature:progress/learned-minutes`　出典：`src/lib/mock/progress.ts:30-59`
- 終わったタスクの確かめた作業時間の中央値を、作業の種類ごとの所要時間の目安にして、配置に使う。
- 前提：`feature:progress/work-review`（`src/lib/mock/progress.ts:38-39`）

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0189 | 確かめた作業時間は予定どおり・完了・旧版の数え済みの枠だけ | `rule:progress/confirmed-work-minutes` | `src/lib/mock/progress.ts:5-11` |  |
| BR-0190 | 目安は中央値を15分単位に丸め、最小15分 | `rule:progress/learned-median-15min` | `src/lib/mock/progress.ts:46-52` |  |
| BR-0191 | 件数が足りる種類だけ、配置の目安を置き換える | `rule:progress/learned-min-samples-apply` | `src/lib/mock/progress.ts:55-59` |  |

| ID | 設定・調整値 | 値 | ノード | 出典 |
|---|---|---|---|---|
| ST-026 | 実績の目安を使うのに必要な件数（3件） | 3 | `setting:progress/learn-min-samples` | `src/lib/mock/progress.ts:30-31` |

#### FR-065 タスクを完了にする

- ノード：`feature:tasks/complete-task`　出典：`src/lib/mock/state.ts:673-701`
- タスクを一覧と配置から外し、見積もり・締切・作業の種類を付けて完了の記録に移す。

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0192 | 完了の記録は ID・題名が文字、完了時刻が数のものだけ読む | `rule:sync/done-task-shape` | `src/lib/mock/state.ts:417-419` |  |
| BR-0193 | タスクの完了は、一覧から外して完了の記録に移す。なければ何もしない | `rule:tasks/complete-moves-to-done` | `src/lib/mock/state.ts:696-701` |  |

#### FR-066 実績からの所要時間の目安

- ノード：`feature:tasks/learned-duration`　出典：`src/lib/mock/state.test.ts:34-50`
- 終わったタスクの、終わった枠の長さの中央値を、作業の種類ごとの標準の所要時間の目安にする。

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0194 | 実績の目安は終わったタスクの作業時間の中央値で、3件以上で使う △ | `rule:tasks/learned-minutes-median` | `src/lib/mock/state.test.ts:34-49` |  |

#### FR-067 見通しのカード

- ノード：`feature:tasks/outlook-card`　出典：`src/components/tasks/TasksScreen.tsx:19-54`
- 今週と来週について、タスクに使う時間と空き時間、順調・きつい・間に合わないを出す。間に合わないタスクは足りない時間つきで並べ、押すとそのタスクを開く。
- 前提：`feature:planner`（`src/components/tasks/TasksScreen.tsx:24-29`）

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0195 | 見通しは 順調・きつい・間に合わない の3つで見せる | `rule:tasks/outlook-three-status` | `src/components/tasks/TasksScreen.tsx:13-17` |  |
| BR-0196 | 押した週だけ、日ごとの内訳を開く | `rule:tasks/outlook-week-expands-days` | `src/components/tasks/TasksScreen.tsx:22-23` |  |

##### FR-068 見通しの日ごとの内訳

- ノード：`feature:tasks/outlook-days`　出典：`src/components/tasks/TasksScreen.tsx:56-91`
- 週の7日それぞれについて、置いたタスクの時間、空き時間、その日の締切のタスクを出す。

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0197 | 日付だけの締切は前の日の分として出す | `rule:tasks/date-only-deadline-previous-day` | `src/components/tasks/TasksScreen.tsx:69-84` |  |
| BR-0198 | 今日の内訳は今から先だけ数え、過ぎた日は薄くする | `rule:tasks/outlook-days-from-now` | `src/components/tasks/TasksScreen.tsx:59-72` |  |

#### FR-069 作業の進み具合の記録

- ノード：`feature:tasks/progress-record`　出典：`src/lib/mock/model.ts:141-170`
- 始まったタスクの枠ごとの記録（開始・終了・結果・作業時間）と、その日の最後の枠のあとの「終わった？」の答えを残す。

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0199 | 枠の結果は予定どおり・一部・なし・完了のいずれかで持つ | `rule:tasks/block-outcomes` | `src/lib/mock/model.ts:141-151` |  |
| BR-0200 | 「終わった？」の答えは終わった・調整・やってないの3つ | `rule:tasks/check-answers` | `src/lib/mock/model.ts:161-170` |  |
| BR-0201 | 答えていない枠は、時間が過ぎても残り時間から引かない △ | `rule:tasks/unreviewed-block-not-subtracted` | `src/lib/mock/state.test.ts:5-16` |  |

#### FR-070 予定に関連するタスク

- ノード：`feature:tasks/related-events`　出典：`src/lib/mock/related.ts:36-50`
- タスクに結びつけた関連する予定ごとにタスクをまとめ、予定から関連するタスクと枠を探せるようにする。

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0202 | 予定が見つからないタスクは関連に含めない | `rule:tasks/related-event-must-exist` | `src/lib/mock/related.ts:36-40` |  |

#### FR-071 タスクの編集フォーム

- ノード：`feature:tasks/task-form`　出典：`src/components/tasks/TaskForm.tsx:66-349`
- タスクのタイトル・締切・所要時間・優先度・種類・関連する予定・置き方を入力し、追加・保存・完了・削除できるシート。
- 前提：`feature:notion`（`src/components/tasks/TaskForm.tsx:139`）

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0203 | 締切は時刻を空にすると、その日の終わり（翌日0:00）になる | `rule:tasks/form-deadline-date-only-means-end-of-day` | `src/components/tasks/TaskForm.tsx:33-36` |  |
| BR-0204 | 期限は「提出・約束の締切」か「自分の目標日」を選べる | `rule:tasks/form-deadline-kind` | `src/components/tasks/TaskForm.tsx:213` |  |
| BR-0205 | タスクの削除は確認してから行う | `rule:tasks/form-delete-confirm` | `src/components/tasks/TaskForm.tsx:336-345` |  |
| BR-0206 | 所要時間を変えたら、前に計算した残り時間と取り込みの目安を外す | `rule:tasks/form-duration-change-resets-remaining` | `src/components/tasks/TaskForm.tsx:136-141` |  |
| BR-0207 | 所要時間の計画のされ方を、選んだ決め方に合わせて短く示す | `rule:tasks/form-duration-hint` | `src/components/tasks/TaskForm.tsx:256-262` |  |
| BR-0208 | 所要時間は決まっている・幅がある・わからないから選び、不正な値は保存しない | `rule:tasks/form-duration-validation` | `src/components/tasks/TaskForm.tsx:124-135` |  |
| BR-0209 | 「ほかを後に回す」「時間帯の外にも入れる」は選んであるときだけ出して外せる | `rule:tasks/form-first-stretch-switches` | `src/components/tasks/TaskForm.tsx:145-148` |  |
| BR-0210 | 優先度は低・中・高の3段階で、新規は中 | `rule:tasks/form-priority-default` | `src/components/tasks/TaskForm.tsx:56-60` |  |
| BR-0211 | 関連する予定の候補は、終日でない今後60日の予定 | `rule:tasks/form-related-event-choices` | `src/components/tasks/TaskForm.tsx:91-96` |  |
| BR-0212 | 種類で、置き方の方針を短く示す | `rule:tasks/form-tag-hint` | `src/components/tasks/TaskForm.tsx:279-283` |  |
| BR-0213 | 置き方は「早めに片付ける」か「直前に寄せる」 | `rule:tasks/form-timing` | `src/components/tasks/TaskForm.tsx:144` |  |
| BR-0214 | タイトルが空なら保存できない | `rule:tasks/form-title-required` | `src/components/tasks/TaskForm.tsx:104-105` |  |

##### FR-072 タスクの配置の一覧と「空ける」

- ノード：`feature:tasks/form-placements`　出典：`src/components/tasks/TaskForm.tsx:165-203`
- 編集中のタスクが置かれた日時の一覧を出し、これから先の枠は「空ける」で外して、その時間を空けておける（「戻す」で元に戻す）。置けていなければその旨と、締切に足りない時間を示す。

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0215 | 「空ける」はこれから始まる枠だけに出す | `rule:tasks/form-keep-free-future-only` | `src/components/tasks/TaskForm.tsx:98` |  |

#### FR-073 タスクの一覧

- ノード：`feature:tasks/task-list`　出典：`src/components/tasks/TasksScreen.tsx:93-189`
- タスクを、締切が近い順と締切なしの2つのカードに並べる。1行ごとに完了の丸、期限・種類・所要時間、関連する予定、置けた状況を出す。
- 前提：`feature:planner`（`src/components/tasks/TasksScreen.tsx:109-114`）

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0216 | 一覧の丸を押すとタスクを完了にして知らせる | `rule:tasks/complete-from-list` | `src/components/tasks/TasksScreen.tsx:124-134` |  |
| BR-0217 | 実質の締切は、締切と関連する予定の開始の早いほう | `rule:tasks/effective-deadline` | `src/components/tasks/TasksScreen.tsx:97-100` |  |
| BR-0218 | タスクが0件なら「タスクはありません。」と出す | `rule:tasks/empty-message` | `src/components/tasks/TasksScreen.tsx:178-180` |  |
| BR-0219 | 締切の2週間前になるまでは「まだ先」と出す | `rule:tasks/lead-days-defer` | `src/components/tasks/TasksScreen.tsx:113-121` |  |
| BR-0220 | 1行には 期限・種類・所要時間、高優先度の「!」、関連する予定を出す | `rule:tasks/row-labels` | `src/components/tasks/TasksScreen.tsx:137-150` |  |
| BR-0221 | 置けた状況は 足りない > まだ先 > 予定 x / y の順で出す | `rule:tasks/row-status-text` | `src/components/tasks/TasksScreen.tsx:115-121` |  |
| BR-0222 | 並び順は 実質の締切 → 優先度の高い順 → タイトル | `rule:tasks/sort-order` | `src/components/tasks/TasksScreen.tsx:101-105` |  |

#### FR-074 作業の種類（集中・事務）

- ノード：`feature:tasks/work-tags`　出典：`src/lib/mock/sample.ts:13-16`
- 作業の種類ごとに、標準の所要時間・1回の長さの下限と上限・休憩を設定できる。初期は「集中」と「事務」の2つ。

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0223 | 作業の種類は ID ごとに初期値へ重ね、ID と種別は初期値のままにする | `rule:sync/tags-overlay` | `src/lib/mock/state.ts:420-424` |  |

| ID | 設定・調整値 | 値 | ノード | 出典 |
|---|---|---|---|---|
| ST-027 | 作業の種類の初期値 | [{"id":"tag-focus","mode":"focus","defaultMinutes":90},{"id":"tag-admin","mode": | `setting:tasks/default-tags` | `src/lib/mock/sample.ts:13-16` |

### FR-075 記録画面

- ノード：`feature:stats`　出典：`src/components/stats/StatsScreen.tsx:1-490`


| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0224 | 週は月曜始まり | `rule:stats/week-starts-monday` | `src/lib/mock/stats.ts:172-173` |  |

#### FR-076 予定どおりに寝た夜の数

- ノード：`feature:stats/bed-nights`　出典：`src/lib/mock/stats.ts:10-33`
- 夜ごとの就寝（「寝る」を押した時刻か、なければヘルスケアの入眠）を予定の就寝と比べ、予定どおりに寝た夜と夜の数を数える。
- 前提：`feature:night`（`src/lib/mock/stats.ts:5`）、`feature:health-sleep`（`src/lib/mock/stats.ts:24-33`）

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0225 | 夜は記録を始めた日から数え、今夜はまだ数えない | `rule:stats/bed-count-from-first-night` | `src/lib/mock/stats.ts:190-210` |  |
| BR-0226 | 予定の就寝の分かる夜だけ数える | `rule:stats/bed-night-needs-planned-bed` | `src/lib/mock/stats.ts:23-33` |  |
| BR-0227 | 予定の就寝の30分以内に寝たら予定どおり | `rule:stats/bed-on-time` | `src/lib/mock/stats.ts:10-11` |  |

#### FR-077 朝の疲れのカード

- ノード：`feature:stats/fatigue-card`　出典：`src/components/stats/StatsScreen.tsx:317-354`
- 直近14日の朝の疲れ（5段階）を点で出す。濃いほど疲れている。

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0228 | 疲れの記録が14日に1件もなければカードを出さない | `rule:stats/fatigue-hidden-when-none` | `src/components/stats/StatsScreen.tsx:322-323` |  |

#### FR-078 習慣の続き具合（連続日数・週数と直近2週間の回数）

- ノード：`feature:stats/habit-progress`　出典：`src/lib/mock/stats.ts:227-253`
- 連続した日数（毎日の習慣）か週の数（週○回の習慣）と、直近2週間の回数・予定の回数を出す。

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0229 | 毎日の習慣の連続は、今日まだなら昨日から数える | `rule:stats/streak-daily` | `src/lib/mock/stats.ts:249-252` |  |
| BR-0230 | 週○回の習慣は、月曜始まりの週で、今週もう達していれば今週も入れて数える | `rule:stats/streak-weekly` | `src/lib/mock/stats.ts:240-247` |  |

#### FR-079 今週の習慣のカード

- ノード：`feature:stats/habit-week-card`　出典：`src/components/stats/StatsScreen.tsx:209-255`
- 習慣ごとに月〜日の点（やった・少しだけ・記録なし・これから）と、今週の回数・週の目安を出す。
- 前提：`feature:habits`（`src/components/stats/StatsScreen.tsx:215`）

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0231 | 習慣の点は やった＝塗り、少しだけ＝薄く、これから＝点線で区別する | `rule:stats/habit-dot-states` | `src/components/stats/StatsScreen.tsx:200-207` |  |
| BR-0232 | 連続は2以上のときだけ出す | `rule:stats/habit-streak-shown-over-one` | `src/components/stats/StatsScreen.tsx:234-239` |  |
| BR-0233 | 習慣がなければカードを出さない | `rule:stats/habits-hidden-when-none` | `src/components/stats/StatsScreen.tsx:216` |  |

#### FR-080 今週の習慣（月〜日の記録と週の目安）

- ノード：`feature:stats/habit-weeks`　出典：`src/lib/mock/stats.ts:212-222`
- 「記録する」習慣ごとに、月〜日の記録、今週の回数、週の目安（毎日なら7、週○回ならその回数、間隔の習慣は目安なし）、続き具合を出す。

#### FR-081 気づきのカード

- ノード：`feature:stats/insights-card`　出典：`src/components/stats/StatsScreen.tsx:26-61`
- 予定と実際の差から見つけた傾向を、画面の上に出す。直近の週数も添える。
- 前提：`feature:insights`（`src/components/stats/StatsScreen.tsx:30`）

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0234 | 気づきにはボタンかリンクを添えられる | `rule:stats/insight-action` | `src/components/stats/StatsScreen.tsx:39-56` |  |
| BR-0235 | 夜（20時〜）に集中の枠が崩れるなら「入れない」時間帯にできる | `rule:stats/insight-avoid-night-focus` | `src/components/stats/StatsScreen.test.tsx:50-54` |  |
| BR-0236 | 気づきは割合でなく「12回中9回」の回数で見せる △ | `rule:stats/insight-shows-counts` | `src/components/stats/StatsScreen.test.tsx:47-49` |  |
| BR-0237 | 気づきがなければカードを出さない | `rule:stats/insights-hidden-when-empty` | `src/components/stats/StatsScreen.tsx:30-31` |  |

#### FR-082 夜のカード

- ノード：`feature:stats/night-card`　出典：`src/components/stats/StatsScreen.tsx:356-418`
- 直近7日について、寝床に入った・起きた時刻（縦線）と眠っていた時間（帯）を並べ、寝つくまでと起き上がるまでの時間を出す。
- 前提：`feature:night`（`src/components/stats/StatsScreen.tsx:364`）

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0238 | 夜の記録が1つもなければカードを出さない | `rule:stats/night-hidden-when-none` | `src/components/stats/StatsScreen.tsx:365` |  |
| BR-0239 | 夜のグラフは前の日の21時から当日15時までを見せる | `rule:stats/night-window` | `src/components/stats/StatsScreen.tsx:366-368` |  |

#### FR-083 予定どおりできた数のまとめ

- ノード：`feature:stats/period-summary`　出典：`src/lib/mock/stats.ts:50-97`
- 期間ごとに、予定どおり起きた日・朝ルーティンをした日・習慣の回数・作業した枠の数を、予定の数と並べて数える。
- 前提：`feature:night`（`src/lib/mock/stats.ts:62`）

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0240 | 記録を始めた日より前は数えない | `rule:stats/count-from-first-record` | `src/lib/mock/stats.ts:58-67` |  |
| BR-0241 | 習慣の予定の回数は、毎日なら日数、週○回なら日数×回数÷7、間隔の習慣は0 | `rule:stats/habit-expected` | `src/lib/mock/stats.ts:79-84` |  |
| BR-0242 | 習慣の時間を延ばすとき、これまでの「少しだけ」を「やった」に書き換えて回数が減らないようにする | `rule:stats/keep-mark-values` | `src/lib/mock/stats.ts:39-48` |  |
| BR-0243 | 習慣の1回ぶん：「やった」は1、「少しだけ」は5分以下の習慣なら1、ほかは0.5 | `rule:stats/mark-value` | `src/lib/mock/stats.ts:35-37` |  |
| BR-0244 | タスクの枠は、達成の時刻がある枠を達成として数える | `rule:stats/task-block-done` | `src/lib/mock/stats.ts:90-95` |  |

#### FR-084 ご褒美のお金のカード

- ノード：`feature:stats/reward-card`　出典：`src/components/stats/StatsScreen.tsx:112-197`
- ご褒美の残り、今週たまった額と内訳、使った金額の記録（直近5件、取り消し可）を出す。
- 前提：`feature:rewards`（`src/components/stats/StatsScreen.tsx:129-139`）

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0245 | 使った記録は新しい順に5件だけ出し、取り消せる | `rule:stats/reward-recent-five` | `src/components/stats/StatsScreen.tsx:133` |  |
| BR-0246 | 使った金額は正の数だけ記録する | `rule:stats/reward-spend-input` | `src/components/stats/StatsScreen.tsx:121-128` |  |
| BR-0247 | 今週の内訳は、たまった額がある出どころだけを帯にする | `rule:stats/reward-week-breakdown` | `src/components/stats/StatsScreen.tsx:129-132` |  |

#### FR-085 タバコを吸った時刻の記録

- ノード：`feature:stats/smoke-log`　出典：`src/lib/mock/model.ts:301-302`
- タバコを吸った時刻（古い順）を残し、就寝前の本数をあとで疲れの予測の材料にする。

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0248 | タバコの記録は有限の数だけを古い順に並べて読む | `rule:stats/smoke-logs-sorted` | `src/lib/mock/state.ts:403-405` |  |

#### FR-086 タバコのカード

- ノード：`feature:stats/smoking-card`　出典：`src/components/stats/StatsScreen.tsx:420-468`
- 直近14日の吸った時刻を点（1点＝1本）で出し、本数と1日の平均を示す。多い少ないは評価しない。

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0249 | タバコの本数は評価せず、点と数字だけを出す △ | `rule:stats/smoking-no-evaluation` | `src/components/stats/StatsScreen.tsx:420` |  |
| BR-0250 | 前の2週間の平均は、吸った記録があるときだけ並べる | `rule:stats/smoking-prev-two-weeks` | `src/components/stats/StatsScreen.tsx:426-439` |  |

#### FR-087 今週のまとめカード

- ノード：`feature:stats/summary-card`　出典：`src/components/stats/StatsScreen.tsx:69-101`
- 今週（月曜から）と先週を並べて、予定どおり起きた日・寝た日、習慣の回数、作業した時間を出す。
- 前提：`feature:night`（`src/components/stats/StatsScreen.tsx:77`）

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0251 | 対象の日がない割合は「—」にする | `rule:stats/no-data-dash` | `src/components/stats/StatsScreen.tsx:81` |  |
| BR-0252 | 今週の作業した時間は今までの分だけ数える | `rule:stats/this-week-work-until-now` | `src/components/stats/StatsScreen.tsx:77` |  |

#### FR-088 作業のカード

- ノード：`feature:stats/work-card`　出典：`src/components/stats/StatsScreen.tsx:257-313`
- 直近6週の作業した時間と予定の時間を棒で並べ、最近終わったタスクを出す。
- 前提：`feature:tasks`（`src/components/stats/StatsScreen.tsx:268`）

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0253 | 終わったタスクは直近8週の新しい5件を出す | `rule:stats/done-tasks-recent` | `src/components/stats/StatsScreen.tsx:268` |  |
| BR-0254 | 予定も終わったタスクもなければカードを出さない | `rule:stats/work-hidden-when-empty` | `src/components/stats/StatsScreen.tsx:269` |  |
| BR-0255 | 作業は直近6週を週ごとに並べる | `rule:stats/work-six-weeks` | `src/components/stats/StatsScreen.tsx:262-266` |  |

#### FR-089 作業した時間と予定の時間

- ノード：`feature:stats/work-minutes`　出典：`src/lib/mock/stats.ts:175-188`
- 期間内に始まった作業の枠の、予定の時間と作業した時間を分で出す。
- 前提：`feature:progress/work-review`（`src/lib/mock/stats.ts:4`）

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0256 | 記録の画面の作業時間は、残り時間を直した枠も枠の長さで数える | `rule:progress/slot-minutes-include-partial` | `src/lib/mock/progress.ts:13-16` |  |
| BR-0257 | 「できなかった」の枠は作業した時間に数えない | `rule:stats/work-excludes-failed` | `src/lib/mock/stats.ts:175-188` |  |

### FR-090 設定画面

- ノード：`feature:settings`　出典：`src/components/settings/SettingsScreen.tsx:1-90`


#### FR-091 ログアウトとサンプルに戻す

- ノード：`feature:settings/account-and-data`　出典：`src/components/settings/SettingsScreen.tsx:63-86`
- 設定の下部で、同期の状態を表示し、ログアウトとデータをサンプルの状態に戻す操作を提供する。どちらも確認の文言を挟む。
- 前提：`integration:supabase-auth`（`src/components/settings/SettingsScreen.tsx:67-73`）、`integration:browser-storage`（`src/components/settings/SettingsScreen.tsx:70-71`）

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0258 | ログアウトでは通知の登録解除と端末の控えの削除を行う | `rule:settings/logout-clears-device` | `src/components/settings/SettingsScreen.tsx:65-74` |  |
| BR-0259 | 「サンプルに戻す」は予定・タスク・設定をすべて消す | `rule:settings/reset-to-sample` | `src/components/settings/SettingsScreen.tsx:80-85` |  |
| BR-0260 | 同期の状態を4通りで表示する | `rule:settings/sync-status-label` | `src/components/settings/SettingsScreen.tsx:13-18` |  |

#### FR-092 避けたい時間帯の設定

- ノード：`feature:settings/avoid-windows`　出典：`src/components/settings/AvoidWindows.tsx:19-134`
- タスクを入れたくない時間帯を、名前・時間・曜日・対象の日・対象のタスク・強さで登録・編集・削除する。

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0261 | 曜日が未選択または7曜日すべてなら曜日の限定をしない | `rule:settings/avoid-all-weekdays-means-everyday` | `src/components/settings/AvoidWindows.tsx:44` |  |
| BR-0262 | 対象の日は毎日・休日だけ・オンの日だけから選ぶ | `rule:settings/avoid-day-type` | `src/components/settings/AvoidWindows.tsx:12-17` |  |
| BR-0263 | 避けたい時間帯の既定は22:00〜24:00、名前は空なら「避けたい時間」 | `rule:settings/avoid-defaults` | `src/components/settings/AvoidWindows.tsx:24-40` |  |
| BR-0264 | 避けたい時間帯の強さは「なるべく避ける」か「入れない」 | `rule:settings/avoid-strength` | `src/components/settings/AvoidWindows.tsx:96-107` |  |

#### FR-093 基本の設定

- ノード：`feature:settings/basic`　出典：`src/components/settings/BasicSettings.tsx:56-109`
- 起床・タスクの置き方・行動ポイント・睡眠と朝・1日の量・休憩の数値を1ページで変える。変えるとすぐにカレンダーと「今日」の計画を組み直す。

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0265 | 基本の設定を変えると計画をすぐ組み直す | `rule:settings/basic-change-replans` | `src/components/settings/BasicSettings.tsx:59-106` |  |

| ID | 設定・調整値 | 値 | ノード | 出典 |
|---|---|---|---|---|
| ST-028 | 予定ごとの行動ポイント | — | `setting:settings/event-energy` | `src/components/settings/BasicSettings.tsx:23-25` |
| ST-029 | 残しておく余白 | — | `setting:settings/min-slack` | `src/components/settings/BasicSettings.tsx:44` |
| ST-030 | 外出から帰ったあとの休憩 | — | `setting:settings/rest-after-away` | `src/components/settings/BasicSettings.tsx:51` |

#### FR-094 カレンダーの色の設定

- ノード：`feature:settings/calendar-colors`　出典：`src/components/settings/CalendarColors.tsx:10-54`
- カレンダーの種類ごとに、11色のパレットから色を選ぶ。選ばなければ初期の色（ダークモードでは少し明るい色）のままで、「初期の色」で戻せる。

| ID | 設定・調整値 | 値 | ノード | 出典 |
|---|---|---|---|---|
| ST-031 | 選べるカレンダーの色（11色） | ["#007aff","#5856d6","#af52de","#ff2d55","#ff3b30","#ff9500","#ffcc00","#34c759" | `setting:settings/calendar-palette` | `src/components/settings/CalendarColors.tsx:7-8` |

#### FR-095 設定項目の編集シート

- ノード：`feature:settings/edit-sheet`　出典：`src/components/settings/EditSheet.tsx:7-56`
- 設定の1項目を開いて編集するシート。保存を押すまで元のデータは変えず、既存の項目にだけ削除ボタン（確認つき）を出す。入力欄は見出しつきの共通部品を使う。

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0266 | 削除ボタンは既存の項目にだけ出す | `rule:settings/edit-sheet-delete-existing-only` | `src/components/settings/EditSheet.tsx:36-41` |  |
| BR-0267 | 同じIDの項目は置き換え、なければ末尾に足す | `rule:settings/upsert-by-id` | `src/components/settings/EditSheet.tsx:59-61` |  |

#### FR-096 設定の一覧

- ノード：`feature:settings/home-list`　出典：`src/components/settings/SettingsScreen.tsx:25-61`
- 設定を「予定」「生活のリズム」「朝」「記録」「通知」の5つのグループに分け、各項目に件数や現在の値を添えて並べ、押すと各設定ページへ移る。
- 前提：`integration:supabase-db`（`src/components/settings/SettingsScreen.tsx:64`）

#### FR-097 初期データ（見本）

- ノード：`feature:settings/initial-data`　出典：`src/lib/mock/sample.ts:6-328`
- 新しいアカウントと、足りない項目を補うための見本のデータ。習慣・時限・授業・楽しみ・朝ルーティン・予定・タスクを持つ。日付は今日を基準に作る。

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0268 | 新しいアカウントは本人の使い方に合わせた初期値で始める | `rule:settings/new-account-defaults` | `src/lib/mock/state.ts:105-150` |  |
| BR-0269 | 見本の場所は本郷キャンパス（家から片道10分） | `rule:settings/sample-place-hongo` | `src/lib/mock/sample.ts:8-11` |  |

#### FR-098 場所の設定

- ノード：`feature:settings/places`　出典：`src/components/settings/Places.tsx:16-79`
- よく行く場所を、名前・キーワード・片道の移動時間で登録・編集・削除する。予定の場所の文字からキーワードで場所を見つけ、移動時間を決めるための設定。

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0270 | 場所のキーワードは読点・カンマ・空白で区切る | `rule:settings/place-keywords-split` | `src/components/settings/Places.tsx:10-14` |  |
| BR-0271 | 場所の名前は必須で、片道の移動時間は0以上 | `rule:settings/place-travel-minutes-nonneg` | `src/components/settings/Places.tsx:20-27` |  |

#### FR-099 朝ルーティンの手順の設定

- ノード：`feature:settings/routine-steps`　出典：`src/components/settings/RoutineSteps.tsx:60-90`
- 朝ルーティンの手順（「今日」のチェックリスト）を追加・名前変更・並べ替え・削除する。

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0272 | 手順の名前は空にできず、端の手順は動かせない | `rule:settings/routine-step-edit` | `src/components/settings/RoutineSteps.tsx:37-87` |  |

#### FR-100 設定項目の一覧（16項目）

- ノード：`feature:settings/section-catalog`　出典：`src/components/settings/sections.ts:1-20`
- 設定項目は、カレンダー・時間割・場所・習慣・避けたい時間帯・基本・朝ルーティン・楽しみ・配信・作業の種類・Notion・天気・色・通知・ご褒美・ヘルスケアの16項目で、それぞれ題名と短い説明を持つ。

#### FR-101 設定の各ページの枠

- ノード：`feature:settings/section-page`　出典：`src/components/settings/SettingsSection.tsx:22-60`
- どの設定ページも、戻るボタンつきの見出しと、項目ごとの本体部品を同じ枠で表示する。項目ごとの部品は一覧表で選ぶ。

#### FR-102 設定の各項目の画面（16項目）

- ノード：`feature:settings/section-pages`　出典：`src/app/(app)/settings/page.tsx:3-5`
- 設定を基本・習慣・場所・通知・Notion・天気・ヘルスケアなど16の項目ごとの画面に分け、それぞれ SettingsSection に項目名を渡して出す。

#### FR-103 楽しみのリストの設定

- ノード：`feature:settings/treats`　出典：`src/components/settings/Treats.tsx:71-99`
- 「今日の楽しみ」の候補を、種類ごとに内容・条件・休日だけ・外で楽しむで登録・編集・削除する。毎日1つを選び、朝は「起きた」を押すと開く。

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0273 | 条件の欄は「ご褒美」の種類のときだけ使う | `rule:settings/treat-condition-reward-only` | `src/components/settings/Treats.tsx:19-56` |  |
| BR-0274 | 「休日だけ」は予定のない日に、「外で楽しむ」は雨でない日にだけ出す | `rule:settings/treat-flags` | `src/components/settings/Treats.tsx:57-77` |  |

#### FR-104 作業の種類ごとの設定

- ノード：`feature:settings/work-kinds`　出典：`src/components/settings/Tags.tsx:10-42`
- 作業の種類（集中・事務など）ごとに、所要時間の目安・1回の最短と最長・終わったあとの休憩を設定し、実績からの時間（件数）も確かめられる。

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0275 | 実績が一定件数以上あれば、所要時間のないタスクに実績を使う △ | `rule:settings/learned-minutes-used-when-enough-samples` | `src/components/settings/Tags.tsx:24-29` | `setting:progress/learn-min-samples` |
| BR-0276 | 1回の最短は最長を超えず、最長は最短を下回らない | `rule:settings/tag-chunk-min-max-consistent` | `src/components/settings/Tags.tsx:20-33` |  |
| BR-0277 | 種類ごとの休憩が未設定なら基本の休憩を使う | `rule:settings/tag-rest-defaults-to-break` | `src/components/settings/Tags.tsx:22` | `setting:planner/break-minutes` |

| ID | 設定・調整値 | 値 | ノード | 出典 |
|---|---|---|---|---|
| ST-032 | 作業の種類ごとの目安時間・1回の長さ・休憩 | — | `setting:settings/tag-durations` | `src/components/settings/Tags.tsx:18-23` |

### FR-105 自動配置（予定・習慣・タスクの配置）

- ノード：`feature:planner`　出典：`src/lib/scheduler/planner.ts:1-856`


| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0278 | 0時を過ぎた帰宅は前の日の帰宅。次の日の休日は変えない | `rule:planner/after-midnight-return-belongs-to-previous-day` | `src/lib/scheduler/review2.test.ts:123-130` |  |
| BR-0279 | 行動ポイントが上限に近い日は避けて、軽い日へ回す | `rule:planner/avoid-near-energy-cap-days` | `src/lib/scheduler/review2.test.ts:213-218` |  |
| BR-0280 | 予定の多い日は、体力を答えるまで、最後の予定のあとに集中の作業を置かない | `rule:planner/busy-day-no-evening-focus` | `src/lib/scheduler/review2.test.ts:200-211` |  |
| BR-0281 | 「ほかを後に回す」を選んだタスクは、締切の早いタスクより先に置く | `rule:planner/first-flag-goes-first` | `src/lib/scheduler/shortfall.test.ts:10-19` |  |
| BR-0282 | 外出した日は、最後の外出から帰る時刻を DayPlan.homeAt に出す | `rule:planner/home-time-of-last-outing` | `src/lib/scheduler/evening.test.ts:22-25` |  |
| BR-0283 | 30分以内の枠は維持するが、新しい予定と衝突したら動かす △ | `rule:planner/keep-near-block-unless-conflict` | `src/lib/mock/recovery.test.ts:143-150` |  |
| BR-0284 | 帰宅時の体力が少ない夜は、帰宅から就寝までタスクを入れない | `rule:planner/low-energy-evening-no-tasks` | `src/lib/scheduler/evening.test.ts:27-33` |  |
| BR-0285 | 「家で食べる」にした食事は、予定で時間帯に入らなくても、遅らせて置く | `rule:planner/meal-at-home-delay` | `src/lib/scheduler/shortfall.test.ts:51-60` |  |
| BR-0286 | 食事を遅らせるのは時間帯の終わりから2時間まで。昼食を夜に置くことはない | `rule:planner/meal-delay-limit-2h` | `src/lib/scheduler/shortfall.test.ts:62-67` |  |
| BR-0287 | タスクの枠は30分から（もともと30分以内のタスクはそのまま。長いタスクの短い残りは30分にし、分けたあとに30分未満を残さない） | `rule:planner/min-task-block-30` | `src/lib/scheduler/review2.test.ts:172-184` |  |
| BR-0288 | 帰宅時の体力がふつうの夜は、事務系のタスクだけを合わせて60分まで | `rule:planner/normal-energy-evening-admin-limit` | `src/lib/scheduler/evening.test.ts:35-41` |  |
| BR-0289 | 夕方に出かける日は、身支度を出発の直前に置き、午前中から集中の作業を置ける | `rule:planner/outing-evening-focus-in-morning` | `src/lib/scheduler/review2.test.ts:191-198` |  |
| BR-0290 | 固定したタスクの枠も、始まる前に予定が重なったら動かす | `rule:planner/pinned-block-moves-on-overlap` | `src/lib/scheduler/review2.test.ts:159-168` |  |
| BR-0291 | 0時を過ぎてまだ寝る前なら、前の日の就寝までを計画に入れ、寝る準備の通知も残す | `rule:planner/plan-until-bed-after-midnight` | `src/lib/scheduler/review2.test.ts:103-111` |  |
| BR-0292 | 「遊び」の予定しかない日は休日として扱う | `rule:planner/play-calendar-is-holiday` | `src/lib/mock/model.ts:15-19` |  |
| BR-0293 | 朝が在宅でも、夕方に外出する日は出発の前に身支度を置く | `rule:planner/prep-before-evening-outing` | `src/lib/scheduler/evening.test.ts:123-131` |  |
| BR-0294 | 身支度は、外出する予定・会議リンクのある予定・身支度が要るとした予定の日だけ取り、出発の直前に置く | `rule:planner/prep-only-for-meeting-or-outing` | `src/lib/scheduler/evening.test.ts:81-94` |  |
| BR-0295 | 寝坊したあとも、身支度は午後の外出の直前に置く | `rule:planner/prep-right-before-afternoon-outing-after-late-wake` | `src/lib/scheduler/reset-meals.test.ts:38-42` |  |
| BR-0296 | 体力が少ない夜は回復の候補を出すが、昼寝は16時以降には出さない | `rule:planner/recovery-suggestion-no-late-nap` | `src/lib/scheduler/evening.test.ts:43-50` |  |
| BR-0297 | 「時間帯の外にも入れる」を選んだタスクは、「入れない」時間帯にも置く | `rule:planner/stretch-ignores-avoid-windows` | `src/lib/scheduler/shortfall.test.ts:21-26` |  |
| BR-0298 | 2週間より先の締切のタスクはまだ置かない △ | `rule:planner/task-lead-days-wait` | `src/lib/mock/recovery.test.ts:139-142` |  |
| BR-0299 | タスクは締切の2週間前から置く。配置期間より先の締切でも期間の中の日なら置き（警告なし）、4週間より先はまだ置かない | `rule:planner/task-lead-two-weeks` | `src/lib/scheduler/review2.test.ts:150-157` |  |
| BR-0300 | タスクの置き方：前倒しは最初の日に詰め、分散は別々の日に散らす | `rule:planner/task-strategy-placement` | `src/lib/scheduler/shortfall.test.ts:70-80` | `setting:planner/task-strategy` |
| BR-0301 | 登録のない場所の予定は、移動時間を聞く対象にする | `rule:travel/unknown-place-question` | `src/lib/scheduler/rhythm.test.ts:85-89` |  |

| ID | 設定・調整値 | 値 | ノード | 出典 |
|---|---|---|---|---|
| ST-033 | 休日の午前の避ける時間帯（9〜12時） △ | [{"id":"avoid-holiday-morning","label":"休日の午前","start":540,"end":720,"hard":fals | `setting:planner/avoid-holiday-morning` | `src/lib/mock/sample.ts:199-201` |
| ST-034 | 1日に残す余白の最低時間（初期値 120分） | — | `setting:planner/min-slack-minutes-per-day` | `src/lib/scheduler/outlook.ts:46` |

#### FR-106 前回の枠の引き継ぎ

- ノード：`feature:planner/block-retention`　出典：`src/lib/scheduler/planner.ts:179-263`
- 始まった枠・固定した枠は残し、動かす枠も前回の位置を優先する。

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0302 | 消えたタスク・習慣の枠は、始まっていても固定していても残さない | `rule:planner/drop-removed-blocks` | `src/lib/scheduler/planner.ts:182-186` |  |
| BR-0303 | 当日の終了済みの習慣は残す（食事を二重に置かない） | `rule:planner/keep-finished-habit-today` | `src/lib/scheduler/planner.ts:179-181` |  |
| BR-0304 | 直前30分以内の枠は、衝突しない限り動かさない | `rule:planner/keep-near-blocks` | `src/lib/scheduler/planner.ts:250-251` |  |
| BR-0305 | 始まった枠と固定した枠は残す | `rule:planner/keep-started-blocks` | `src/lib/scheduler/planner.ts:179-186` |  |
| BR-0306 | 動いた枠を movedBlocks として返す | `rule:planner/moved-blocks-report` | `src/lib/scheduler/planner.ts:820` |  |
| BR-0307 | 固定したタスクの枠も、始まる前に予定が重なれば動かす | `rule:planner/pinned-task-vs-event` | `src/lib/scheduler/planner.ts:245-247` |  |
| BR-0308 | 睡眠の記録・予定は埋まっている時間として扱い、疲れた日の休止はタスクを避ける △ | `rule:planner/sleep-resets-busy` | `src/lib/scheduler/planner.ts:147-148` |  |

#### FR-107 連絡してみる日の決定

- ノード：`feature:planner/contact-prompt`　出典：`src/lib/scheduler/outlook.ts:51-69`
- 見通しが順調な週の、今日から先で最初の休日を、人に連絡してみるか聞く日として週に1日だけ選ぶ。
- 前提：`feature:planner/outlook`（`src/lib/scheduler/outlook.ts:62-63`）

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0309 | 連絡の日は、今日から先でいちばん早い休日を週に1日 | `rule:outlook/contact-first-holiday` | `src/lib/scheduler/outlook.ts:64-67` |  |
| BR-0310 | 連絡を聞くのは、見通しが順調な週だけ | `rule:outlook/contact-only-ok-weeks` | `src/lib/scheduler/outlook.ts:62-63` |  |

#### FR-108 配置エンジンの入出力の型と既定設定

- ノード：`feature:planner/data-model`　出典：`src/lib/scheduler/types.ts:1-396`
- 予定・場所・設定・習慣・タスク・枠・日の計画などの型と、設定の既定値、食事・きっかけの定数を定義する。

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0311 | 日の計画は 起床・就寝・外出・休日・身支度・帰宅・夜の始まり を持つ | `rule:planner/day-plan-fields` | `src/lib/scheduler/types.ts:268-294` |  |
| BR-0312 | 遊び（play）の予定しかない日は休日になる | `rule:planner/holiday-play-events` | `src/lib/scheduler/types.ts:21-22` |  |
| BR-0313 | 起床・就寝のずれは 睡眠（sleep）・起きた（woke）・疲れた（tired）で表す | `rule:planner/rhythm-reset-modes` | `src/lib/scheduler/types.ts:390-396` |  |

#### FR-109 外出の日・予定の多い日の判定

- ノード：`feature:planner/day-load`　出典：`src/lib/scheduler/dayload.ts:17-37`
- 家にいない時間と予定の数・長さから、1日が外出の日か予定の多い日かをここだけで決める。
- 前提：`feature:planner/travel-resolution`（`src/lib/scheduler/dayload.ts:31`）

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0314 | 家にいない終日の予定のあいだは家にいない時間とする | `rule:planner/allday-away` | `src/lib/scheduler/planner.ts:209-213` |  |
| BR-0315 | 終日の予定で「家にいない」にしたものは外出の時間に数える | `rule:planner/dayload-allday-away` | `src/lib/scheduler/dayload.ts:23-27` |  |
| BR-0316 | その日の起きている時間に重なる分だけを数える | `rule:planner/dayload-clip-window` | `src/lib/scheduler/dayload.ts:28-30` |  |
| BR-0317 | 外出する予定は前後の移動も家にいない時間に含める | `rule:planner/dayload-travel-counts` | `src/lib/scheduler/dayload.ts:31-32` |  |
| BR-0318 | 予定の多い日 ＝ 外出の日・予定3つ以上・合わせて4時間以上 | `rule:planner/heavy-day` | `src/lib/scheduler/dayload.ts:36` | `setting:planner/heavy-day-events` `setting:planner/heavy-day-hours` |
| BR-0319 | 外出の日・予定の多い日は dayload.ts の判定を使う | `rule:planner/outing-day-from-dayload` | `src/lib/scheduler/planner.ts:328-333` |  |
| BR-0320 | 家にいない時間が設定の長さ以上なら外出の日 | `rule:planner/outing-day-threshold` | `src/lib/scheduler/dayload.ts:34-35` | `setting:planner/outing-day-away-minutes` |

| ID | 設定・調整値 | 値 | ノード | 出典 |
|---|---|---|---|---|
| ST-035 | 予定の多い日とみなす予定の数 | 3 | `setting:planner/heavy-day-events` | `src/lib/scheduler/dayload.ts:14` |
| ST-036 | 予定の多い日とみなす予定の合計時間（時間） | 4 | `setting:planner/heavy-day-hours` | `src/lib/scheduler/dayload.ts:15` |
| ST-037 | 外出の日とみなす家にいない時間（分） | 360 | `setting:planner/outing-day-away-minutes` | `src/lib/scheduler/types.ts:128` |

#### FR-110 行動ポイント

- ノード：`feature:planner/energy-points`　出典：`src/lib/scheduler/planner.ts:188-304`
- 予定・タスク・習慣ごとに1日のポイントを数え、上限に近い日・超える日を避ける。

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0321 | 日ごとの使ったポイントは1桁に丸め、外出の日と答えた体力を添える | `rule:planner/energy-day-used` | `src/lib/scheduler/planner.ts:793-797` |  |
| BR-0322 | 予定の行動ポイントは、外出か在宅かと長さから計算する | `rule:planner/event-energy` | `src/lib/scheduler/planner.ts:220-230` | `setting:planner/away-event-energy` `setting:planner/away-event-energy-per-hour` `setting:planner/home-event-energy-per-hour` |
| BR-0323 | 行動ポイントが上限を超える・上限の6割を超える日は減点する | `rule:planner/task-energy-penalty` | `src/lib/scheduler/planner.ts:707-712` | `setting:planner/daily-energy-budget` `setting:planner/near-energy-ratio` `setting:planner/penalty-weights` |
| BR-0324 | タスクのポイントは、タグの1時間あたり（集中系1・事務系0.5）×長さ | `rule:planner/task-energy-per-hour` | `src/lib/scheduler/planner.ts:293-303` |  |
| BR-0325 | 深夜の枠は、日付ではなく起きている日で数える | `rule:planner/waking-day-energy` | `src/lib/scheduler/planner.ts:189-195` |  |

| ID | 設定・調整値 | 値 | ノード | 出典 |
|---|---|---|---|---|
| ST-038 | 外出する予定1回のポイント | 2 | `setting:planner/away-event-energy` | `src/lib/scheduler/types.ts:125` |
| ST-039 | 外出する予定の1時間あたりのポイント | 0.5 | `setting:planner/away-event-energy-per-hour` | `src/lib/scheduler/types.ts:126` |
| ST-040 | 1日の行動ポイントの上限 | 10 | `setting:planner/daily-energy-budget` | `src/lib/scheduler/types.ts:124` |
| ST-041 | 在宅の予定の1時間あたりのポイント | 0.5 | `setting:planner/home-event-energy-per-hour` | `src/lib/scheduler/types.ts:127` |
| ST-042 | 行動ポイントを少しずつ避け始める割合 | 0.6 | `setting:planner/near-energy-ratio` | `src/lib/scheduler/planner.ts:86` |

##### FR-111 発散・休憩の提案

- ノード：`feature:planner/recovery-suggestion`　出典：`src/lib/scheduler/planner.ts:792-818`
- 上限を超えた日や帰宅時に体力が少ない夜に、空き時間へ入る回復の候補を1つ出す。
- 前提：`feature:planner/free-gaps`（`src/lib/scheduler/planner.ts:802-804`）

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0326 | 上限を超える日と、帰宅時に体力が少ない夜は、発散を1つ提案する | `rule:planner/energy-suggestion` | `src/lib/scheduler/planner.ts:792-818` |  |
| BR-0327 | 発散の候補には、これより後に始めない時刻がある | `rule:planner/suggestion-latest-start` | `src/lib/scheduler/planner.ts:805-809` |  |

#### FR-112 帰宅時の体力による夜の配置

- ノード：`feature:planner/evening-energy`　出典：`src/lib/scheduler/planner.ts:579-588`
- 帰宅時の体力の答え（high/normal/low）と予定の多い日の夜で、夜に置くタスクを制限する。
- 前提：`feature:planner/day-load`（`src/lib/scheduler/planner.ts:336-337`）、`feature:planner/energy-points`（`src/lib/scheduler/planner.ts:624`）

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0328 | 予定の多い日で最後の予定が17時以降に終わるなら、そこからを夜とする | `rule:planner/evening-from-last-event` | `src/lib/scheduler/planner.ts:335-344` | `setting:planner/evening-from-minute` |
| BR-0329 | 体力が「高い」夜は制限しない | `rule:planner/evening-high-no-limit` | `src/lib/scheduler/planner.ts:585` |  |
| BR-0330 | 帰宅時の体力が「少ない」夜にはタスクを置かない | `rule:planner/evening-low-no-task` | `src/lib/scheduler/planner.ts:579-588` |  |
| BR-0331 | 体力が「ふつう」の夜は事務系だけを60分まで | `rule:planner/evening-normal-limit` | `src/lib/scheduler/planner.ts:666-669` | `setting:planner/normal-evening-task` |
| BR-0332 | 予定の多い日の夜は、答えるまで「ふつう」として扱う | `rule:planner/evening-unanswered-normal` | `src/lib/scheduler/planner.ts:581-586` |  |

| ID | 設定・調整値 | 値 | ノード | 出典 |
|---|---|---|---|---|
| ST-043 | 夜の始まりとみなす時刻（0時からの分） † | 1020 | `setting:planner/evening-from-minute` | `src/lib/scheduler/planner.ts:34` |
| ST-044 | 体力「ふつう」の夜に入れる事務系タスクの合計（分） | 60 | `setting:planner/normal-evening-task` | `src/lib/scheduler/planner.ts:42` |

#### FR-113 帰宅時の体力の記録

- ノード：`feature:planner/evening-energy-record`　出典：`src/lib/mock/model.ts:250-255`
- 帰宅したときに答えた残りの体力と、そのときの行動ポイントの予測・上限を残し、あとで値を合わせる材料にする。

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0333 | 帰宅時の体力は high・normal・low の3段階だけ読む | `rule:planner/evening-levels` | `src/lib/mock/state.ts:365-372` |  |

#### FR-114 予定・移動・帰宅後の休憩の確保

- ノード：`feature:planner/event-blocking`　出典：`src/lib/scheduler/planner.ts:197-243`
- 予定の前後の移動と休憩を埋まっている時間にし、予定に関連するタスクの締切を決める。
- 前提：`feature:planner/travel-resolution`（`src/lib/scheduler/planner.ts:214`）

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0334 | 予定のあとは、帰りの移動と休憩が終わるまで埋まっている | `rule:planner/event-after-rest` | `src/lib/scheduler/planner.ts:214-219` | `setting:planner/rest-after-away-event` |
| BR-0335 | 外出する予定の移動を含む時間は、家にいない時間に数える | `rule:planner/event-busy-and-away` | `src/lib/scheduler/planner.ts:232-237` |  |
| BR-0336 | 帰宅時刻は最後の外出から帰る時刻（0時を過ぎたら前の日の分） | `rule:planner/home-at` | `src/lib/scheduler/planner.ts:239-243` |  |
| BR-0337 | 「この時間は空ける」は予定と同じ埋まっている扱い | `rule:planner/keep-free-busy` | `src/lib/scheduler/planner.ts:198-199` |  |
| BR-0338 | 空けた時間に重なる、始まっていない枠は外す | `rule:planner/keep-free-unpin` | `src/lib/scheduler/planner.ts:248-249` |  |
| BR-0339 | 関連する予定があるタスクの締切は、その予定に着くための出発時刻 | `rule:planner/related-event-deadline` | `src/lib/scheduler/planner.ts:214-216` |  |
| BR-0340 | 予定ごとに帰宅後の休憩を上書きできる | `rule:planner/rest-after-override` | `src/lib/scheduler/types.ts:19-20` |  |
| BR-0341 | 登録のない場所の予定は、移動時間を聞く | `rule:planner/travel-question-queue` | `src/lib/scheduler/planner.ts:233` |  |

| ID | 設定・調整値 | 値 | ノード | 出典 |
|---|---|---|---|---|
| ST-045 | 外出から帰ったあとの休憩（分） | 30 | `setting:planner/rest-after-away-event` | `src/lib/scheduler/types.ts:118` |

#### FR-115 すきま時間の候補

- ノード：`feature:planner/free-gaps`　出典：`src/lib/scheduler/planner.ts:789-790`
- 配置し終わったあとの空き時間のうち一定の長さ以上を候補として返す。

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0342 | 配置後の空き時間のうち20分以上を、すきま時間の候補にする | `rule:planner/free-gaps` | `src/lib/scheduler/planner.ts:790` | `setting:planner/min-gap` |

| ID | 設定・調整値 | 値 | ノード | 出典 |
|---|---|---|---|---|
| ST-046 | すきま時間の候補の最短（分） | 20 | `setting:planner/min-gap` | `src/lib/scheduler/planner.ts:40` |

#### FR-116 習慣の配置

- ノード：`feature:planner/habit-placement`　出典：`src/lib/scheduler/planner.ts:432-542`
- 飛ばせない習慣から順に、時間帯・頻度・雨・食事などの条件に合わせて置く。
- 前提：`feature:planner/event-blocking`（`src/lib/scheduler/planner.ts:321-326`）

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0343 | 習慣の時間帯は起床から（wake）か就寝から（bed）の分でも指定できる | `rule:planner/habit-anchor` | `src/lib/scheduler/types.ts:170-176` |  |
| BR-0344 | 習慣の頻度は 毎日・週N回・余裕がある日だけ・間隔・順調な休日 の5種類 | `rule:planner/habit-frequency-kinds` | `src/lib/scheduler/types.ts:133-139` |  |
| BR-0345 | 習慣は 朝ルーティンのあとの習慣→飛ばせない→飛ばせる→きっかけのある→待ち時間の子 の順に置く | `rule:planner/habit-order` | `src/lib/scheduler/planner.ts:432-438` |  |
| BR-0346 | 習慣は 少しずつ増やす設定（progression）を持てる | `rule:planner/habit-progression` | `src/lib/scheduler/types.ts:182-186` |  |
| BR-0347 | 飛ばせる習慣だけが、締切のために外せる △ | `rule:planner/habit-releasable` | `src/lib/scheduler/planner.ts:510-514` |  |
| BR-0348 | 習慣の置き場所がなければ no_room として記録する | `rule:planner/habit-room` | `src/lib/scheduler/planner.ts:538-541` |  |
| BR-0349 | 「今日は飛ばす」にした日と、疲れた日の飛ばせる習慣は置かない | `rule:planner/habit-skip-day` | `src/lib/scheduler/planner.ts:428-430` |  |
| BR-0350 | 習慣は「飛ばせる」「なるべく残す」を持つ | `rule:planner/habit-skippable-flags` | `src/lib/scheduler/types.ts:187-190` |  |
| BR-0351 | 習慣は時間帯が終わった日・過去の時刻には置かない △ | `rule:planner/habit-today-onward` | `src/lib/scheduler/planner.ts:538` |  |
| BR-0352 | 「記録する」習慣は今日の画面で記録する（配置には使わない） | `rule:planner/habit-track-flag` | `src/lib/scheduler/types.ts:180-181` |  |
| BR-0353 | 習慣の時間帯は時刻・起床から・就寝からで決める | `rule:planner/habit-window` | `src/lib/scheduler/planner.ts:412-427` |  |
| BR-0354 | 雨の日は習慣を代わりのもの（家の中でできること）にする | `rule:planner/rain-alternative` | `src/lib/scheduler/planner.ts:495-497` |  |

##### FR-117 きっかけのある習慣

- ノード：`feature:planner/cue-habits`　出典：`src/lib/scheduler/planner.ts:393-427`
- 朝ルーティン・別の習慣・帰宅・直前の習慣といった場面の直後（直前）に習慣を置く。

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0355 | きっかけの場面がない日には習慣を置かない | `rule:planner/cue-absent-no-place` | `src/lib/scheduler/planner.ts:535-538` |  |
| BR-0356 | きっかけのある習慣は15分刻みにせず、きっかけのちょうど5分後（前なら5分前に終える）に置く | `rule:planner/cue-exact-start` | `src/lib/scheduler/planner.ts:498-499` | `setting:planner/cue-gap` |
| BR-0357 | きっかけは 朝ルーティンの終わり・帰宅後の休憩のあと・別の習慣の終わり（始まり） | `rule:planner/cue-moment` | `src/lib/scheduler/planner.ts:393-401` |  |
| BR-0358 | その日にきっかけの場面がなければ、代わりの場面（orElse）を使う | `rule:planner/cue-or-else` | `src/lib/scheduler/planner.ts:402-410` |  |
| BR-0359 | きっかけの時間帯は、5分後から習慣の長さ＋30分まで | `rule:planner/cue-window` | `src/lib/scheduler/planner.ts:412-424` | `setting:planner/cue-gap` `setting:planner/cue-slack` |

| ID | 設定・調整値 | 値 | ノード | 出典 |
|---|---|---|---|---|
| ST-047 | きっかけから習慣の始まりまでの間（分） | 5 | `setting:planner/cue-gap` | `src/lib/scheduler/types.ts:162` |
| ST-048 | きっかけのあと習慣を始められる猶予（分） | 30 | `setting:planner/cue-slack` | `src/lib/scheduler/types.ts:164` |

##### FR-118 余裕のある日だけの習慣（自炊など）

- ノード：`feature:planner/energy-habits`　出典：`src/lib/scheduler/planner.ts:754-770`
- タスクを置いたあと、行動ポイントに余裕があり外出の日でない日だけ置く。
- 前提：`feature:planner/task-placement`（`src/lib/scheduler/planner.ts:439-441`）、`feature:planner/day-load`（`src/lib/scheduler/planner.ts:761`）

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0360 | 余裕のある日だけの習慣は、タスクを置いたあとに置く | `rule:planner/energy-habit-after-tasks` | `src/lib/scheduler/planner.ts:439-443` |  |
| BR-0361 | 余裕のある日だけの習慣は、行動ポイントの上限を超えない日にだけ置く | `rule:planner/energy-habit-cond` | `src/lib/scheduler/planner.ts:754-761` | `setting:planner/daily-energy-budget` |
| BR-0362 | 外出の日には自炊（余裕のある日だけの習慣）を入れない | `rule:planner/outing-no-cook` | `src/lib/scheduler/planner.ts:761` |  |

##### FR-119 間隔で置く習慣（洗濯など）

- ノード：`feature:planner/interval-habits`　出典：`src/lib/scheduler/planner.ts:346-391`
- 前回から min〜max 日の間隔の中で、条件のいい日を選んで置く。
- 前提：`feature:planner/day-load`（`src/lib/scheduler/planner.ts:331-332`）

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0363 | avoidRain の習慣は雨の日を避ける | `rule:planner/habit-avoid-rain` | `src/lib/scheduler/types.ts:206-207` |  |
| BR-0364 | 間隔の中では 家にいられる日→少し出かける日→雨の日→外出の日 の順に選ぶ | `rule:planner/interval-day-penalty` | `src/lib/scheduler/planner.ts:370-376` |  |
| BR-0365 | 間隔の中に入らなければ、そのあと入れられる最初の日に入れる | `rule:planner/interval-fallback` | `src/lib/scheduler/planner.ts:384` |  |
| BR-0366 | どの日にも置けなければ no_room として記録して打ち切る | `rule:planner/interval-no-room` | `src/lib/scheduler/planner.ts:385-388` |  |
| BR-0367 | 間隔の習慣は今日から先の日だけに置く | `rule:planner/interval-today-onward` | `src/lib/scheduler/planner.ts:367-369` |  |
| BR-0368 | 前回から minDays〜maxDays 日の間隔の中に入れる | `rule:planner/interval-window` | `src/lib/scheduler/planner.ts:357-383` |  |

##### FR-120 食事の配置

- ノード：`feature:planner/meal-placement`　出典：`src/lib/scheduler/planner.ts:470-509`
- 食事は予定の最中・家にいない時間に置かず、食事どうしを間隔をあけて置く。

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0369 | 食事の習慣は予定の最中に置かない | `rule:planner/habit-meal-flag` | `src/lib/scheduler/types.ts:201-203` |  |
| BR-0370 | 「家で食べる」にした食事は時間帯の終わりから2時間まで遅らせて置く | `rule:planner/meal-at-home-late` | `src/lib/scheduler/planner.ts:503-508` | `setting:planner/meal-late` `setting:planner/wind-down-minutes` |
| BR-0371 | 食事どうしは始まりを3時間あける | `rule:planner/meal-gap` | `src/lib/scheduler/planner.ts:474-478` | `setting:planner/meal-gap` |
| BR-0372 | 食事は予定の最中・家にいない時間に置かない | `rule:planner/meal-not-in-event` | `src/lib/scheduler/planner.ts:470-501` |  |
| BR-0373 | 任意の朝食は、必須の食事を押し出さない △ | `rule:planner/optional-meal-yields` | `src/lib/scheduler/planner.ts:479-488` | `setting:planner/meal-gap` |

| ID | 設定・調整値 | 値 | ノード | 出典 |
|---|---|---|---|---|
| ST-049 | 食事どうしの始まりの最小間隔（分） | 180 | `setting:planner/meal-gap` | `src/lib/scheduler/types.ts:157` |
| ST-050 | 「家で食べる」食事を遅らせてよい分数 | 120 | `setting:planner/meal-late` | `src/lib/scheduler/types.ts:159` |

##### FR-121 順調な休日だけの習慣

- ノード：`feature:planner/on-track-habits`　出典：`src/lib/scheduler/planner.ts:772-787`
- 締切に足りないタスクがないときだけ、休日に置く習慣。
- 前提：`feature:planner/task-placement`（`src/lib/scheduler/planner.ts:772-774`）

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0374 | 順調な休日だけの習慣は、締切に足りないタスクがなく、休日のときだけ置く | `rule:planner/on-track-holiday` | `src/lib/scheduler/planner.ts:772-787` |  |

##### FR-122 待ち時間のある習慣（洗濯を回す→干す）

- ノード：`feature:planner/wait-time-habits`　出典：`src/lib/scheduler/planner.ts:252-262`
- 1つ目の枠の何分後に2つ目の枠を置き、その待ち時間に子の習慣を置く。

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0375 | 待ち時間の中に、子の習慣（片付けなど）を置く | `rule:planner/wait-time-child` | `src/lib/scheduler/planner.ts:448-462` |  |
| BR-0376 | 始まった枠を残すなら、2つ目の枠（干すなど）も残す | `rule:planner/wait-time-keep-second` | `src/lib/scheduler/planner.ts:252-262` |  |
| BR-0377 | 待ち時間のある習慣は2つ目の枠も空いていて、終わるまで家にいられるときだけ置く | `rule:planner/wait-time-parent` | `src/lib/scheduler/planner.ts:489-494` |  |
| BR-0378 | 待ち時間のある習慣は、1つ目の開始から指定分後に2つ目の枠を置く | `rule:planner/wait-time-second-block` | `src/lib/scheduler/planner.ts:515-525` |  |

##### FR-123 週に何回かの習慣

- ノード：`feature:planner/weekly-habits`　出典：`src/lib/scheduler/planner.ts:823-856`
- 月曜始まりの週ごとに回数を数え、空きの多い日（重い習慣は軽い日）へ回数ぶん置く。

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0379 | 毎日の習慣は、残してある日以外の毎日に置く | `rule:planner/habit-daily` | `src/lib/scheduler/planner.ts:823-833` |  |
| BR-0380 | 週に何回かの習慣は月曜始まりの週で数え、今週やった日を引く | `rule:planner/weekly-by-monday-week` | `src/lib/scheduler/planner.ts:839-847` |  |
| BR-0381 | 週の習慣は空きの多い日（重い習慣は軽い日）から選ぶ | `rule:planner/weekly-room-order` | `src/lib/scheduler/planner.ts:836-855` |  |

#### FR-124 時間区間の演算

- ノード：`feature:planner/interval-algebra`　出典：`src/lib/scheduler/intervals.ts:1-41`
- 区間の長さ・併合・差し引き・窓との共通部分を求め、空き時間の計算に使う。

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0382 | 窓と重なる部分だけを残す | `rule:planner/interval-intersect` | `src/lib/scheduler/intervals.ts:37-41` |  |
| BR-0383 | 区間の長さはミリ秒の差を分に直す | `rule:planner/interval-length` | `src/lib/scheduler/intervals.ts:4-6` |  |
| BR-0384 | 重なる・接する区間は1つにまとめる | `rule:planner/interval-merge` | `src/lib/scheduler/intervals.ts:8-17` |  |
| BR-0385 | 空きから埋まっている区間を引くと、残りの空きだけが返る | `rule:planner/interval-subtract` | `src/lib/scheduler/intervals.ts:19-35` |  |

#### FR-125 日本時間の日付・時刻の計算

- ノード：`feature:planner/jst-time`　出典：`src/lib/scheduler/time.ts:1-33`
- タイムゾーンのずれ（分）から日の 0:00・0時からの分・曜日・15分刻みの丸めを計算する。

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0386 | 日の始まりはタイムゾーンのずれを足してから日単位で切り捨てる | `rule:planner/local-day-start` | `src/lib/scheduler/time.ts:4-8` |  |
| BR-0387 | 曜日は 0 = 日曜で、ずれを足した日付から求める | `rule:planner/local-weekday` | `src/lib/scheduler/time.ts:15-18` |  |
| BR-0388 | 0時からの分は日の始まりからの差を四捨五入する | `rule:planner/minute-of-day` | `src/lib/scheduler/time.ts:10-13` |  |
| BR-0389 | 15分の区切りに丸める（既定15分） | `rule:planner/step-rounding` | `src/lib/scheduler/time.ts:20-33` |  |

| ID | 設定・調整値 | 値 | ノード | 出典 |
|---|---|---|---|---|
| ST-051 | タイムゾーンのずれ（分） | 540 | `setting:planner/tz-offset-minutes` | `src/lib/scheduler/types.ts:107` |

#### FR-126 「この時間は空ける」

- ノード：`feature:planner/keep-free`　出典：`src/lib/mock/state.ts:673-694`
- タスクの枠を外した時間を空けておき、自動ではタスクも習慣も入れない。戻すと自動で入るようになる。

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0390 | 空けた時間は終わって1日たったら捨てる | `rule:planner/keep-free-expires` | `src/lib/mock/state.ts:673-681` |  |

#### FR-127 朝ルーティンと身支度の配置

- ノード：`feature:planner/morning-routine-prep`　出典：`src/lib/scheduler/planner.ts:164-281`
- 朝ルーティンを毎回計算し直して置き、人に会う日は出発の直前に身支度を置く。
- 前提：`feature:planner/travel-resolution`（`src/lib/scheduler/travel.ts:38-42`）

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0391 | 朝の準備が終わる時刻は、身支度が続く日は身支度まで | `rule:planner/morning-end` | `src/lib/scheduler/planner.ts:173-177` |  |
| BR-0392 | 身支度が要る予定 ＝ 予定ごとの指定→外出する予定→会議のリンクがある予定 | `rule:planner/needs-prep` | `src/lib/scheduler/travel.ts:38-42` |  |
| BR-0393 | 身支度は出発の直前に置く（朝ルーティンのすぐあとに出る日は続けて置く） | `rule:planner/prep-before-departure` | `src/lib/scheduler/planner.ts:166-172` | `setting:planner/prep-minutes` |
| BR-0394 | 身支度は人に会う日だけ置く | `rule:planner/prep-only-meeting-days` | `src/lib/scheduler/planner.ts:267-281` |  |
| BR-0395 | 朝ルーティンは毎回計算し直し、予定・睡眠と重なるときは置かない | `rule:planner/routine-recalc` | `src/lib/scheduler/planner.ts:265-274` | `setting:planner/routine-minutes` |
| BR-0396 | 朝ルーティンは起床から、最初のチェックの時刻があればその時刻から始める | `rule:planner/routine-start` | `src/lib/scheduler/planner.ts:163-165` |  |
| BR-0397 | 起床時刻の由来は 外出・在宅・隣の日・既定・固定 の5種類 | `rule:planner/wake-source-kinds` | `src/lib/scheduler/types.ts:266` |  |

| ID | 設定・調整値 | 値 | ノード | 出典 |
|---|---|---|---|---|
| ST-052 | 予定がない日の起床時刻（0時からの分） | 540 | `setting:planner/default-wake-minute` | `src/lib/scheduler/types.ts:114` |
| ST-053 | 起床時刻を1週間そろえる | false | `setting:planner/fixed-wake-mode` | `src/lib/scheduler/types.ts:119` |
| ST-054 | 在宅の日の起床の余裕（分） | 20 | `setting:planner/home-wake-lead-minutes` | `src/lib/scheduler/types.ts:112` |
| ST-055 | 身支度の時間（分） | 40 | `setting:planner/prep-minutes` | `src/lib/scheduler/types.ts:110` |
| ST-056 | 朝ルーティンの時間（分） | 15 | `setting:planner/routine-minutes` | `src/lib/scheduler/types.ts:111` |

#### FR-128 今週・来週の見通し

- ノード：`feature:planner/outlook`　出典：`src/lib/scheduler/outlook.ts:22-49`
- 配置の結果だけから、週ごとにこれから使うタスク時間・空き時間・順調／きつい／間に合わないを計算する。

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0398 | タスク時間と空き時間は、今より後の分だけ数える | `rule:outlook/count-from-now` | `src/lib/scheduler/outlook.ts:36-40` |  |
| BR-0399 | 日付だけの締切（翌日0:00）は、その前の日の週に数える | `rule:outlook/deadline-date-previous-week` | `src/lib/scheduler/outlook.ts:43-44` |  |
| BR-0400 | 締切に足りないタスクがある週は「間に合わない」 | `rule:outlook/late-when-shortfall` | `src/lib/scheduler/outlook.ts:42-46` |  |
| BR-0401 | 空き時間が1日の余白×残り日数に足りなければ「きつい」 | `rule:outlook/tight-when-free-below-slack` | `src/lib/scheduler/outlook.ts:41-46` | `setting:planner/min-slack-minutes-per-day` |
| BR-0402 | 見通しの週は月曜始まりで、既定は今週と来週 | `rule:outlook/weeks-from-monday` | `src/lib/scheduler/outlook.ts:31-35` |  |

#### FR-129 夜中は前の日の続き

- ノード：`feature:planner/overnight-day`　出典：`src/lib/scheduler/planner.ts:150-156`
- 0時を過ぎてまだ寝る前の時間は前の日として計画し、前の日の就寝を返す。
- 前提：`feature:planner/morning-routine-prep`（`src/lib/scheduler/planner.ts:144-146`）

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0403 | 前の日の就寝を lastNight として返す | `rule:planner/last-night-return` | `src/lib/scheduler/planner.ts:820` |  |
| BR-0404 | 夜中（0時を過ぎてまだ寝る前）は前の日の続きとして計画する | `rule:planner/overnight-prev-day` | `src/lib/scheduler/planner.ts:150-156` |  |

| ID | 設定・調整値 | 値 | ノード | 出典 |
|---|---|---|---|---|
| ST-057 | 睡眠時間（分） | 420 | `setting:planner/sleep-minutes` | `src/lib/scheduler/types.ts:109` |

#### FR-130 配置エンジンの公開窓口

- ノード：`feature:planner/public-api`　出典：`src/lib/scheduler/index.ts:1-7`
- scheduler の型と主要関数（配置・起床計算・移動・クイック追加・見通し・日の重さ）をまとめて公開する。

#### FR-131 行動ポイントが上限を超える日の回復の提案

- ノード：`feature:planner/recovery-options`　出典：`src/lib/mock/sample.ts:189-197`
- 行動ポイントが上限を超える日に、疲れを減らす小さな休憩を提案する。昼寝・少し歩く・横になるの3つ。

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0405 | 昼寝は20分まで、15時までに始める | `rule:planner/nap-limit` | `src/lib/mock/sample.ts:191-193` |  |
| BR-0406 | ゲーム・動画は疲れが取れないので回復の候補にしない △ | `rule:planner/no-screen-recovery` | `src/lib/mock/sample.ts:190-197` |  |

#### FR-132 組み直し

- ノード：`feature:planner/replan`　出典：`src/lib/mock/state.ts:497-588`
- 保存したデータから授業の予定・睡眠・飛ばした習慣などを整え、配置エンジンで計画を作り直す。画面とサーバーの定期実行の両方で使う。
- 前提：`feature:timetable`（`src/lib/mock/state.ts:499`）、`feature:night`（`src/lib/mock/state.ts:502`）、`feature:weather`（`src/lib/mock/state.ts:581`）

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0407 | 前回の配置は、飛ばした枠を除いて次の組み直しに渡す | `rule:planner/previous-blocks-minus-skipped` | `src/lib/mock/state.ts:574` |  |
| BR-0408 | 自分で入れた立て直しを優先し、「疲れている」は寝ていた間に数えない | `rule:planner/sleep-resets-priority` | `src/lib/mock/state.ts:501-504` |  |

#### FR-133 締切に足りない警告と立て直しの手順

- ノード：`feature:planner/shortfall-warning`　出典：`src/lib/scheduler/planner.ts:545-557`
- 締切までに入りきらないときは、余白を削る→飛ばせる習慣を外す→警告の順に対処する。

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0409 | 期間より先の締切のタスクは置けなくても警告を出さない | `rule:planner/beyond-horizon-no-warning-fail` | `src/lib/scheduler/planner.ts:720-733` |  |
| BR-0410 | 締切を守るために、飛ばしてよい習慣を1つ外す | `rule:planner/release-skippable-habit` | `src/lib/scheduler/planner.ts:545-557` |  |
| BR-0411 | 締切に入りきらなければ足りない分を警告として返す | `rule:planner/shortfall-record` | `src/lib/scheduler/planner.ts:729-732` |  |
| BR-0412 | 置けないときは 余白を削る→飛ばせる習慣を外す→警告 の順 | `rule:planner/slack-relax-then-release` | `src/lib/scheduler/planner.ts:720-733` |  |

#### FR-134 タスクの自動配置

- ノード：`feature:planner/task-placement`　出典：`src/lib/scheduler/planner.ts:559-752`
- 締切・優先度の順にタスクを空き時間へ置く。置き場所は減点の少ない所を選ぶ。
- 前提：`feature:planner/event-blocking`（`src/lib/scheduler/planner.ts:307-309`）、`feature:planner/habit-placement`（`src/lib/scheduler/planner.ts:573-575`）、`feature:planner/shortfall-warning`（`src/lib/scheduler/planner.ts:725-731`）、`feature:planner/interval-algebra`（`src/lib/scheduler/planner.ts:309`）、`feature:planner/jst-time`（`src/lib/scheduler/planner.ts:140`）

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0413 | 食後など、習慣のすぐあとは集中系を避ける | `rule:planner/after-habit-avoid` | `src/lib/scheduler/planner.ts:572-575` |  |
| BR-0414 | 配置期間より先の締切は期間の中に置き、足りなくても警告しない | `rule:planner/beyond-horizon-no-warning` | `src/lib/scheduler/planner.ts:617-618` |  |
| BR-0415 | 1日のタスク量の目安を超えると減点する | `rule:planner/daily-cap-penalty` | `src/lib/scheduler/planner.ts:703-706` | `setting:planner/daily-task-cap` `setting:planner/penalty-weights` |
| BR-0416 | 1日の余白を残して置き、締切に間に合わないときだけ削る | `rule:planner/daily-slack` | `src/lib/scheduler/planner.ts:629-630` | `setting:planner/min-slack-per-day` |
| BR-0417 | 集中系は起きてすぐ・寝る前・食後を避ける | `rule:planner/focus-zone-penalty` | `src/lib/scheduler/planner.ts:694-697` | `setting:planner/penalty-weights` `setting:planner/avoid-focus-after-wake` `setting:planner/avoid-focus-before-bed` |
| BR-0418 | 集中を避ける時間帯の決め方 | `rule:planner/focus-zones-definition` | `src/lib/scheduler/planner.ts:561-565` | `setting:planner/avoid-focus-after-wake` `setting:planner/avoid-focus-before-bed` `setting:planner/wind-down-minutes` |
| BR-0419 | 空き時間は 起床（または今）から 就寝の30分前 まで | `rule:planner/free-window` | `src/lib/scheduler/planner.ts:306-309` | `setting:planner/wind-down-minutes` |
| BR-0420 | 事務系タスクは長い空き時間を使わない | `rule:planner/gap-task-long-slot` | `src/lib/scheduler/planner.ts:698-700` | `setting:planner/long-slot` `setting:planner/penalty-weights` |
| BR-0421 | すでに置いたタスクの時間を残り時間から引く | `rule:planner/hold-task-count` | `src/lib/scheduler/planner.ts:607-611` |  |
| BR-0422 | 「直前に寄せる」タスクは締切に近いほど減点が小さい △ | `rule:planner/just-before-timing` | `src/lib/scheduler/planner.ts:619` |  |
| BR-0423 | 前回と違う位置は減点 | `rule:planner/moved-from-before-penalty` | `src/lib/scheduler/planner.ts:692` | `setting:planner/penalty-weights` |
| BR-0424 | 分けたあとに30分未満の残りを作らない | `rule:planner/no-short-leftover` | `src/lib/scheduler/planner.ts:670-673` | `setting:planner/min-task-block` |
| BR-0425 | 前回の位置から動かすと減点する | `rule:planner/prefer-previous-position` | `src/lib/scheduler/planner.ts:620` | `setting:planner/penalty-weights` |
| BR-0426 | タスクの締切には関連する予定の出発時刻を使う | `rule:planner/related-event-deadline-use` | `src/lib/scheduler/planner.ts:591-594` |  |
| BR-0427 | 余白を守る間は、置くと余白が足りない日には入れない | `rule:planner/slack-check` | `src/lib/scheduler/planner.ts:675` | `setting:planner/min-slack-per-day` |
| BR-0428 | タスクを分けると減点（集中系は強く） | `rule:planner/split-penalty` | `src/lib/scheduler/planner.ts:693` | `setting:planner/penalty-weights` |
| BR-0429 | 「時間帯の外にも入れる」を選んだタスクは入れない時間帯と夜の制限も使う | `rule:planner/stretch-option` | `src/lib/scheduler/planner.ts:622-624` |  |
| BR-0430 | タグは 集中（長い空き時間に置く）か 事務（短い空き時間に詰める） | `rule:planner/tag-placement-mode` | `src/lib/scheduler/types.ts:210-224` |  |
| BR-0431 | タスクのあとにはタグごとの休憩を空ける | `rule:planner/task-break` | `src/lib/scheduler/planner.ts:287-291` | `setting:planner/break-minutes` |
| BR-0432 | 期限は 外部の締切（fixed・未指定）と 自分の目標日（target）がある | `rule:planner/task-deadline-kind` | `src/lib/scheduler/types.ts:229-235` |  |
| BR-0433 | 締切に足りないときに選べる「ほかを後に回す（first）」と「時間帯の外にも入れる（stretch）」 | `rule:planner/task-first-stretch` | `src/lib/scheduler/types.ts:248-251` |  |
| BR-0434 | タスクは締切の2週間前から置く | `rule:planner/task-lead-window` | `src/lib/scheduler/planner.ts:614-626` | `setting:planner/task-lead-days` |
| BR-0435 | タスクの枠は30分から（短いタスクはそのまま） | `rule:planner/task-min-block` | `src/lib/scheduler/planner.ts:632-639` | `setting:planner/min-task-block` |
| BR-0436 | タスクは「後に回す」→締切の近い順→優先度の高い順で置く | `rule:planner/task-order` | `src/lib/scheduler/planner.ts:590-603` |  |

| ID | 設定・調整値 | 値 | ノード | 出典 |
|---|---|---|---|---|
| ST-058 | 朝の準備のあと集中を避ける時間（分） | 60 | `setting:planner/avoid-focus-after-wake` | `src/lib/scheduler/types.ts:120` |
| ST-059 | 作業を終える前に集中を避ける時間（分） | 120 | `setting:planner/avoid-focus-before-bed` | `src/lib/scheduler/types.ts:121` |
| ST-060 | タスクのあとの休憩（分） | 10 | `setting:planner/break-minutes` | `src/lib/scheduler/types.ts:117` |
| ST-061 | 1日のタスク量の目安（分） | 360 | `setting:planner/daily-task-cap` | `src/lib/scheduler/types.ts:122` |
| ST-062 | タグが見つからないときの既定のタグ | {"mode":"gap","defaultMinutes":60,"minChunkMinutes":30,"maxChunkMinutes":120} | `setting:planner/fallback-tag` | `src/lib/scheduler/planner.ts:26-31` |
| ST-063 | 長い空き時間とみなす長さ（分） | 120 | `setting:planner/long-slot` | `src/lib/scheduler/planner.ts:45` |
| ST-064 | 1日に残す余白（分） | 120 | `setting:planner/min-slack-per-day` | `src/lib/scheduler/types.ts:123` |
| ST-065 | タスクの枠の最短（分） | 30 | `setting:planner/min-task-block` | `src/lib/scheduler/planner.ts:37` |
| ST-066 | タスク配置の減点の表 | {"perDayLater":0.3,"perDayLaterEarly":2,"sameTaskSameDay":1.5,"perDayBeforeDeadl | `setting:planner/penalty-weights` | `src/lib/scheduler/planner.ts:51-84` |
| ST-067 | 配置する日数 | 14 | `setting:planner/planning-days` | `src/lib/scheduler/types.ts:108` |
| ST-068 | タスクを置き始める日数（締切の何日前から） | 14 | `setting:planner/task-lead-days` | `src/lib/scheduler/planner.ts:105` |
| ST-069 | 就寝前に作業を入れない時間（分） | 30 | `setting:planner/wind-down-minutes` | `src/lib/scheduler/types.ts:113` |

##### FR-135 「この時間はやりたくない」時間帯

- ノード：`feature:planner/avoid-windows`　出典：`src/lib/scheduler/planner.ts:89-102`
- 入れない（hard）となるべく避ける（soft）の2種類の時間帯を、曜日・休日/オンの日・作業の種類で絞って使う。

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0437 | 避けたい時間帯は曜日・休日/オンの日・作業の種類で絞れる | `rule:planner/avoid-window-scope` | `src/lib/scheduler/planner.ts:89-102` |  |
| BR-0438 | 避けたい時間帯は、入れない（hard）となるべく避ける（soft） | `rule:planner/avoid-window-types` | `src/lib/scheduler/types.ts:90-104` |  |
| BR-0439 | 「入れない」時間帯・体力が低い夜・疲れた日にはタスクを置かない | `rule:planner/hard-avoid` | `src/lib/scheduler/planner.ts:622-625` |  |
| BR-0440 | 「なるべく避ける」時間帯に重なると減点する | `rule:planner/soft-avoid-penalty` | `src/lib/scheduler/planner.ts:701-702` | `setting:planner/penalty-weights` |

##### FR-136 タスクの所要時間の見積もり

- ノード：`feature:planner/task-estimate`　出典：`src/lib/scheduler/planner.ts:131-136`
- 残り時間、所要時間、範囲の中間、タグの既定、固定の60分の順で所要時間を決める。
- 前提：`feature:planner/task-placement`（`src/lib/scheduler/planner.ts:611`）

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0441 | 所要時間は 残り時間→所要時間→範囲の中間→タグの既定→60分 の順で決める | `rule:planner/estimate-order` | `src/lib/scheduler/planner.ts:131-136` | `setting:planner/fallback-task-minutes` |

| ID | 設定・調整値 | 値 | ノード | 出典 |
|---|---|---|---|---|
| ST-070 | 所要時間が決まっていないタスクの既定（分） | 60 | `setting:planner/fallback-task-minutes` | `src/lib/scheduler/planner.ts:25` |

##### FR-137 タスクの置き方（ふつう・前倒し・分散）

- ノード：`feature:planner/task-strategy`　出典：`src/lib/scheduler/planner.ts:677-691`
- 設定の taskStrategy で、先の日に回す減点・同じタスクの同日集中の減点を切り替える。

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0442 | 直前に寄せるタスクは締切までの日数で減点する | `rule:planner/just-before-penalty` | `src/lib/scheduler/planner.ts:678-680` |  |
| BR-0443 | 分散では同じタスクをその日にすでに置いた分だけ減点する | `rule:planner/spread-same-day` | `src/lib/scheduler/planner.ts:685-691` | `setting:planner/task-strategy` `setting:planner/penalty-weights` |
| BR-0444 | 置き方によって先の日の減点が変わる | `rule:planner/strategy-penalties` | `src/lib/scheduler/planner.ts:677-684` | `setting:planner/task-strategy` `setting:planner/penalty-weights` |

| ID | 設定・調整値 | 値 | ノード | 出典 |
|---|---|---|---|---|
| ST-071 | タスクの置き方（taskStrategy） | standard | `setting:planner/task-strategy` | `src/lib/scheduler/types.ts:82-86` |

#### FR-138 配置の検証用の共通入力 △

- ノード：`feature:planner/test-fixtures`　出典：`src/lib/scheduler/test-helpers.ts:3-20`
- 日本時間の日時を epoch ミリ秒にする関数と、既定の設定・空の予定などを持つ配置の入力を、テストで共通に使えるようにする。

#### FR-139 移動時間と在宅・外出の判断

- ノード：`feature:planner/travel-resolution`　出典：`src/lib/scheduler/travel.ts:18-36`
- 予定ごとの入力・メモ・場所の登録の順に移動時間を決め、場所がなければ「移動時間を聞く」扱いにする。

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0445 | 在宅の指定がある予定は、移動なしの在宅として扱う | `rule:planner/travel-at-home-flag` | `src/lib/scheduler/travel.ts:20` |  |
| BR-0446 | 予定のメモに「移動30」と書くとその分数を移動時間にする | `rule:planner/travel-note` | `src/lib/scheduler/travel.ts:22-23` |  |
| BR-0447 | 場所がない・オンライン（URL・Zoom など）は在宅 | `rule:planner/travel-online-is-home` | `src/lib/scheduler/travel.ts:28-29` |  |
| BR-0448 | 場所の名前かキーワードが予定の場所に含まれていればその場所とみなす | `rule:planner/travel-place-keyword` | `src/lib/scheduler/travel.ts:31-34` |  |
| BR-0449 | 移動時間は 予定ごとの入力→メモの「移動N」→場所の登録 の順に決める | `rule:planner/travel-priority` | `src/lib/scheduler/travel.ts:18-36` |  |
| BR-0450 | 登録のない場所は仮の移動時間を置き、移動時間を聞く対象にする | `rule:planner/travel-unknown` | `src/lib/scheduler/travel.ts:35` | `setting:planner/unknown-travel-minutes` |

| ID | 設定・調整値 | 値 | ノード | 出典 |
|---|---|---|---|---|
| ST-072 | 登録のない場所への仮の移動時間（分） | 60 | `setting:planner/unknown-travel-minutes` | `src/lib/scheduler/types.ts:116` |

### FR-140 起床・就寝リズムの計算

- ノード：`feature:rhythm`　出典：`src/lib/scheduler/rhythm.ts:1-182`


| ID | 設定・調整値 | 値 | ノード | 出典 |
|---|---|---|---|---|
| ST-073 | 1日の始まり（4:00） | 240 | `setting:rhythm/day-begins-at` | `src/lib/scheduler/rhythm.ts:5-6` |

#### FR-141 固定の予定に間に合う最も遅い起床

- ノード：`feature:rhythm/latest-wake`　出典：`src/lib/scheduler/rhythm.ts:80-85`
- 食事などをずらさずに、その日の各予定に間に合う最も遅い起床時刻を返す（予定がなければ無限大）。立て直しで起床を後ろへ送る上限に使う。

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0451 | 起床を後ろへ送るときの上限は、各予定に間に合う最も遅い時刻 | `rule:rhythm/latest-wake-for-fixed-events` | `src/lib/scheduler/rhythm.ts:80-85` |  |

#### FR-142 日ごとの起床・就寝時刻の計算

- ノード：`feature:rhythm/wake-calc`　出典：`src/lib/scheduler/rhythm.ts:105-182`
- 予定・移動・既定の起床から、日ごとの起床・就寝・出発・身支度・休日の判定を計算する。前後の日も含めて計算してから範囲を切り出す。

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0452 | 就寝は翌日の起床から睡眠時間を引いた時刻 | `rule:rhythm/bed-from-next-wake` | `src/lib/scheduler/rhythm.ts:169-173` | `setting:planner/sleep-minutes` |
| BR-0453 | 隣の日との起床の差は1日30分まで（早めるほうへだけ寄せる） | `rule:rhythm/daily-shift-limit` | `src/lib/scheduler/rhythm.ts:87-96` | `setting:planner/max-wake-shift` |
| BR-0454 | 1週間そろえる設定のときは、月曜始まりの週のいちばん早い起床にそろえる | `rule:rhythm/fixed-wake-per-week` | `src/lib/scheduler/rhythm.ts:142-159` | `setting:planner/fixed-wake-mode` |
| BR-0455 | 予定のない日は休日（帰省など終日で家にいない日は休日にしない） | `rule:rhythm/holiday-when-no-events` | `src/lib/scheduler/rhythm.ts:164-168` |  |
| BR-0456 | 起床の差の上限は、計算の範囲の前後8日も見て決める | `rule:rhythm/ramp-outside-range` | `src/lib/scheduler/rhythm.ts:98-117` | `setting:rhythm/ramp-days` |
| BR-0457 | 起床は、予定から決まる時刻と既定の起床の早いほう | `rule:rhythm/wake-capped-by-default` | `src/lib/scheduler/rhythm.ts:129-131` | `setting:rhythm/default-wake` |
| BR-0458 | 起床の理由（外出・在宅・前後の日・既定・固定）を残す | `rule:rhythm/wake-source` | `src/lib/scheduler/rhythm.ts:135-140` |  |

| ID | 設定・調整値 | 値 | ノード | 出典 |
|---|---|---|---|---|
| ST-074 | 隣の日との起床の差の上限（分） † | 30 | `setting:planner/max-wake-shift` | `src/lib/scheduler/types.ts:115` |
| ST-075 | 既定の起床時刻（初期値 9:00） | — | `setting:rhythm/default-wake` | `src/lib/scheduler/rhythm.ts:129-130` |
| ST-076 | 起床の差を見る範囲の外側の日数（8日） | 8 | `setting:rhythm/ramp-days` | `src/lib/scheduler/rhythm.ts:98-103` |

##### FR-143 予定から決まる「遅くともこの時刻に起きる」の計算

- ノード：`feature:rhythm/required-wake`　出典：`src/lib/scheduler/rhythm.ts:40-78`
- その日の予定ごとに、外出か在宅か・家を出る時刻・身支度の要否を判定し、いちばん早い必要起床時刻を求める。

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0459 | 外出する予定は、家を出る時刻から朝ルーティンと準備の分だけ前に起きる | `rule:rhythm/away-event-wake` | `src/lib/scheduler/rhythm.ts:61-66` | `setting:planner/prep-minutes` `setting:planner/routine-minutes` |
| BR-0460 | いちばん早く起きなければならない予定が起床を決める | `rule:rhythm/earliest-event-decides-wake` | `src/lib/scheduler/rhythm.ts:51-70` |  |
| BR-0461 | 在宅の予定は、開始の少し前に起きる（身支度が要る在宅の予定は外出なみ） | `rule:rhythm/home-event-wake` | `src/lib/scheduler/rhythm.ts:55-60` | `setting:rhythm/home-wake-lead` `setting:planner/prep-minutes` `setting:planner/routine-minutes` |
| BR-0462 | 4時前に始まる予定はその日の予定に数えない | `rule:rhythm/ignore-early-morning-events` | `src/lib/scheduler/rhythm.ts:34-38` | `setting:rhythm/day-begins-at` |
| BR-0463 | 身支度は1日1回、身支度の要る予定のうちいちばん早いものの前 | `rule:rhythm/prep-once-before-earliest` | `src/lib/scheduler/rhythm.ts:71-75` |  |
| BR-0464 | メモの「移動30」を移動時間として読む | `rule:travel/memo-travel-minutes` | `src/lib/scheduler/rhythm.test.ts:79-83` |  |

| ID | 設定・調整値 | 値 | ノード | 出典 |
|---|---|---|---|---|
| ST-077 | 在宅の予定の前の余裕（初期値 20分） | — | `setting:rhythm/home-wake-lead` | `src/lib/scheduler/rhythm.ts:58` |

#### FR-144 「起きている日」の数え方

- ノード：`feature:rhythm/waking-day`　出典：`src/lib/scheduler/rhythm.ts:8-15`
- 時刻がどの日の分かを1か所で決める。計画の日（起床〜就寝）の中ならその日、外なら0〜4時は前の日、それ以外は暦の日。

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0465 | 起床〜就寝の中ならその日、外なら4時前は前の日 | `rule:rhythm/waking-day-boundary` | `src/lib/scheduler/rhythm.ts:13-15` | `setting:rhythm/day-begins-at` |

### FR-145 習慣

- ノード：`feature:habits`　出典：`src/components/settings/Habits.tsx:1-465`


| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0466 | 0時を過ぎてから始めた入浴は前の晩の分。次の晩にも入浴を置く | `rule:habits/after-midnight-bath-is-last-night` | `src/lib/scheduler/review2.test.ts:113-121` |  |
| BR-0467 | 起床・就寝からの時間帯：散歩は起床から150分以内、入浴は就寝の150〜75分前に収める | `rule:habits/anchor-wake-bed-windows` | `src/lib/scheduler/evening.test.ts:60-69` |  |
| BR-0468 | 雨を避ける間隔の習慣（洗濯）は、間隔の中に雨でない日があれば雨の日を避ける | `rule:habits/avoid-rain-interval` | `src/lib/scheduler/shortfall.test.ts:39-48` |  |
| BR-0469 | 自炊は食事のちょうど5分前に終える | `rule:habits/cook-before-meal` | `src/lib/scheduler/cue.test.ts:140-145` |  |
| BR-0470 | 食事のあとのきっかけの習慣は、食事の終わりの5分後に置く | `rule:habits/cue-after-meal` | `src/lib/scheduler/cue.test.ts:32-37` |  |
| BR-0471 | 朝ルーティンのあとのきっかけの習慣は、起床+朝ルーティン+5分後に置く | `rule:habits/cue-after-routine` | `src/lib/scheduler/cue.test.ts:39-43` |  |
| BR-0472 | 帰宅後のきっかけの習慣は、外出のない日には置かない | `rule:habits/cue-home-only-outing-days` | `src/lib/scheduler/cue.test.ts:45-53` |  |
| BR-0473 | きっかけのあとが埋まっていれば、その日は置かない | `rule:habits/cue-skip-when-busy` | `src/lib/scheduler/cue.test.ts:55-61` |  |
| BR-0474 | 習慣を消すとき、5分以下の習慣の「少しだけ」の記録を「やった」に書き換えて、たまったご褒美が減らないようにする | `rule:habits/delete-keeps-marks` | `src/components/settings/Habits.tsx:183-188` |  |
| BR-0475 | 家での運動は週3回、入浴の5分前に終わるように置く | `rule:habits/exercise-before-bath` | `src/lib/scheduler/cue.test.ts:79-87` |  |
| BR-0476 | 入浴の直前が埋まっていれば、30分前までの空きに置き、それもなければその日は置かない | `rule:habits/exercise-before-bath-fallback` | `src/lib/scheduler/cue.test.ts:89-99` |  |
| BR-0477 | 締切のために習慣を外すときは、「なるべく残す」習慣を最後にする | `rule:habits/keep-last-when-dropping` | `src/lib/scheduler/evening.test.ts:96-109` |  |
| BR-0478 | 食事どうしは、始まりを3時間あける | `rule:habits/meal-gap-3h` | `src/lib/scheduler/cue.test.ts:133-138` |  |
| BR-0479 | 遅く起きても、昼食は14:30まで、夕食は21時までの時間帯を守る | `rule:habits/meal-windows-after-late-wake` | `src/lib/scheduler/reset-meals.test.ts:14-22` |  |
| BR-0480 | 朝は 朝ルーティン → 朝食 → 散歩 の順に、あいだを空けずに置く † | `rule:habits/morning-order` | `src/lib/scheduler/cue.test.ts:118-131` |  |
| BR-0481 | 昼食の時間帯を過ぎて起きても、昼食を15時以降へ自動で送らない | `rule:habits/no-lunch-after-window` | `src/lib/scheduler/reset-meals.test.ts:29-31` |  |
| BR-0482 | 「順調な休日」の習慣は、締切に間に合わないタスクがない休日にだけ置く | `rule:habits/on-track-holiday-only` | `src/lib/scheduler/evening.test.ts:111-119` |  |
| BR-0483 | 雨の日にした日は、習慣を雨の日の代わり（タイトルと長さ）に差し替える | `rule:habits/rain-alternative` | `src/lib/scheduler/evening.test.ts:71-77` |  |
| BR-0484 | 「今日は飛ばす」にした日には、その習慣（と片付けなど子の習慣）を置かない | `rule:habits/skip-today` | `src/lib/scheduler/review2.test.ts:58-63` |  |
| BR-0485 | 週に何回かの習慣は、始まった枠の日をやった日として数える | `rule:habits/started-block-counts-as-done` | `src/lib/scheduler/review2.test.ts:81-90` |  |
| BR-0486 | 「記録する」習慣は、やった記録（やった・少しだけ）で週の回数を数える | `rule:habits/tracked-count-by-log` | `src/lib/scheduler/review2.test.ts:92-99` |  |
| BR-0487 | 洗濯のように待ち時間のある習慣は、回し始めたあとの組み直しでも干す枠と片付けを残す | `rule:habits/waiting-follow-up-kept` | `src/lib/scheduler/review2.test.ts:44-56` |  |
| BR-0488 | 週に何回かの習慣は月曜始まりの週で数え、毎日組み直しても回数を超えない | `rule:habits/weekly-count-monday-week` | `src/lib/scheduler/review2.test.ts:17-40` |  |

#### FR-146 習慣の追加・編集・削除フォーム

- ノード：`feature:habits/habit-editor`　出典：`src/components/settings/Habits.tsx:43-386`
- 習慣の名前・所要時間・時間帯の決め方（時刻／起床から／就寝まで／きっかけ）・頻度・締切が迫ったときの扱い・記録・食事・行動ポイント・休憩・待ち時間のあとの2つ目の作業・待ち時間に行う親の習慣を設定する。

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0489 | 習慣を消すと、待ち時間の子はふつうの習慣になり、きっかけは次の場面か朝ルーティンに替わる | `rule:habits/delete-detaches-dependents` | `src/components/settings/Habits.tsx:184-196` |  |
| BR-0490 | この画面で変えない設定（雨の日の代わり・少しずつ増やす・雨を避ける）は編集後も残す | `rule:habits/edit-preserves-hidden-options` | `src/components/settings/Habits.tsx:130-149` |  |
| BR-0491 | 就寝までの時間帯は「何分前」で入力し、保存では負の値にする | `rule:habits/form-bed-anchor-negated` | `src/components/settings/Habits.tsx:59-106` |  |
| BR-0492 | きっかけには朝ルーティン・食事のあと・帰宅後・入浴などの前を選べる | `rule:habits/form-cue-choices` | `src/components/settings/Habits.tsx:45-129` |  |
| BR-0493 | ほかの習慣の待ち時間に行う習慣は時間帯・頻度を持たない | `rule:habits/form-during-habit` | `src/components/settings/Habits.tsx:80-100` |  |
| BR-0494 | 習慣の行動ポイントは-10〜10 | `rule:habits/form-energy-range` | `src/components/settings/Habits.tsx:150-154` |  |
| BR-0495 | 2つ目の作業は1つ目が終わってから始まる | `rule:habits/form-finish-after-duration` | `src/components/settings/Habits.tsx:160-166` |  |
| BR-0496 | 間隔の習慣は最短≦最長で1〜60日 | `rule:habits/form-interval-range` | `src/components/settings/Habits.tsx:139-144` |  |
| BR-0497 | 締切が迫ったときの扱いは飛ばさない／なるべく残す／飛ばしてよい | `rule:habits/form-keep-mapping` | `src/components/settings/Habits.tsx:68-119` |  |
| BR-0498 | 習慣は名前と1分以上の所要時間が必要 | `rule:habits/form-name-duration-required` | `src/components/settings/Habits.tsx:91-94` |  |
| BR-0499 | このあとの休憩は0以上、0なら保存しない | `rule:habits/form-rest-after` | `src/components/settings/Habits.tsx:155-159` |  |
| BR-0500 | 2つ目の作業をやめると、待ち時間に入れていた習慣は親から外れる | `rule:habits/form-stop-finish-clears-children` | `src/components/settings/Habits.tsx:170-180` |  |
| BR-0501 | 週の回数は1〜7回 | `rule:habits/form-weekly-times-range` | `src/components/settings/Habits.tsx:132-136` |  |
| BR-0502 | 時間帯は所要時間より短くできず、起床・就寝基準は24時間以内 | `rule:habits/form-window-fits-duration` | `src/components/settings/Habits.tsx:107-108` |  |

#### FR-147 習慣の一覧

- ノード：`feature:habits/habit-list`　出典：`src/components/settings/Habits.tsx:388-452`
- 習慣を、頻度・時間帯・所要時間・2つ目の作業・記録・飛ばし方をまとめた要約つきで並べる。「記録する」習慣には連続日数と2週間の回数を右に出す。
- 前提：`feature:habits/habit-editor`（`src/components/settings/Habits.tsx:449`）

#### FR-148 習慣をやったかの記録

- ノード：`feature:habits/habit-record`　出典：`src/lib/mock/model.ts:198-207`
- 日付ごと・習慣ごとに、「やった」か「少しだけ」を記録する。押していない日はやっていない。

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0503 | 「少しだけ」は食事でなく、飛ばせて、5分より長い習慣にだけ出す | `rule:habits/allows-five` | `src/lib/mock/model.ts:203-207` |  |
| BR-0504 | 「記録する」間隔習慣の最後にやった日は「やった」を押した日だけ | `rule:habits/interval-last-done-tracked` | `src/lib/mock/state.ts:513-523` |  |
| BR-0505 | 記録しない間隔習慣は、始まった枠を「やった」とみなす | `rule:habits/interval-last-done-untracked` | `src/lib/mock/state.ts:524-529` |  |
| BR-0506 | 習慣の記録は「やった」「少しだけ」だけを読み、空の日は捨てる | `rule:habits/valid-marks-only` | `src/lib/mock/state.ts:278-287` |  |
| BR-0507 | 週に何回かの習慣は、直近14日のやった日を数える | `rule:habits/weekly-done-days` | `src/lib/mock/state.ts:530-549` |  |

#### FR-149 初期の習慣の定義

- ノード：`feature:habits/initial-habits`　出典：`src/lib/mock/sample.ts:18-187`
- 最初に持つ習慣（昼食・夕食・入浴・散歩・自炊・洗濯・片付け・自己成長・朝食・家での運動）の時間帯・頻度・きっかけ・行動ポイントを決める。

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0508 | 入浴は就寝の150〜75分前に30分（就寝の約90分前に終える） | `rule:habits/bath-window` | `src/lib/mock/sample.ts:18-30` |  |
| BR-0509 | 朝食（15分）は朝ルーティンのあと、時間に余裕がある日だけ | `rule:habits/breakfast-when-room` | `src/lib/mock/sample.ts:59-71` |  |
| BR-0510 | 自炊はその食事のちょうど前に置く | `rule:habits/cook-just-before-meal` | `src/lib/mock/sample.ts:75-79` |  |
| BR-0511 | 自炊は行動ポイントに余裕がある日だけ置く | `rule:habits/cook-when-energy` | `src/lib/mock/sample.ts:134-158` |  |
| BR-0512 | 自己成長の枠（90分）は見通しが順調な休日だけ置く | `rule:habits/growth-on-track-holiday` | `src/lib/mock/sample.ts:81-91` |  |
| BR-0513 | 家での運動は入浴の直前に置く | `rule:habits/home-exercise-before-bath` | `src/lib/mock/sample.ts:41-44` |  |
| BR-0514 | 家での運動は5分・週3回から、2週間ごとに5分ずつ増やして20分まで | `rule:habits/home-exercise-progression` | `src/lib/mock/sample.ts:40-57` |  |
| BR-0515 | 洗濯は雨の日を避ける | `rule:habits/laundry-avoid-rain` | `src/lib/mock/sample.ts:170-171` |  |
| BR-0516 | 洗濯を始めた90分後に、干す・取り込む30分を置く | `rule:habits/laundry-finish-block` | `src/lib/mock/sample.ts:168-169` |  |
| BR-0517 | 洗濯は4〜7日の間隔で、9〜16時に10分 | `rule:habits/laundry-interval` | `src/lib/mock/sample.ts:159-173` |  |
| BR-0518 | 昼食は12:00〜14:30に30分、夕食は18:00〜20:30に60分。食後は集中系を避ける | `rule:habits/lunch-dinner-windows` | `src/lib/mock/sample.ts:94-118` |  |
| BR-0519 | 片付け（30分）は洗濯の待ち時間に置く | `rule:habits/tidy-during-laundry` | `src/lib/mock/sample.ts:174-185` |  |
| BR-0520 | 散歩は朝食のあと。朝食がない日は朝ルーティンのあとに置く | `rule:habits/walk-after-breakfast` | `src/lib/mock/sample.ts:73-74` |  |
| BR-0521 | 散歩は起床から150分以内。雨の日は窓際で光を浴びる10分に替える | `rule:habits/walk-rain-alternative` | `src/lib/mock/sample.ts:32-38` |  |

#### FR-150 習慣の「できなかった」 △

- ノード：`feature:habits/miss`　出典：`src/lib/mock/habit-miss.test.ts:15-47`
- 終わった習慣の枠で「できなかった」を押すと、その枠を外し、入る時間があれば今日のあと、なければ次の日以降に入れ直す。

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0522 | 寝坊して過ぎた洗濯は「やった」にならず、その日の空きに入れ直す △ | `rule:habits/overslept-laundry-replanned` | `src/lib/mock/habit-miss.test.ts:41-46` |  |
| BR-0523 | 記録する間隔の習慣（洗濯）は「やった」を押した日だけ数える △ | `rule:habits/tracked-interval-counts-on-done` | `src/lib/mock/habit-miss.test.ts:36-40` |  |
| BR-0524 | 押さなければ、終わった枠は今日の分として残る △ | `rule:habits/unmarked-slot-stays` | `src/lib/mock/habit-miss.test.ts:23-27` |  |
| BR-0525 | 記録しない間隔の習慣は始まった枠で数え、「できなかった」で取り消す △ | `rule:habits/untracked-interval-counts-on-start` | `src/lib/mock/habit-miss.test.ts:28-35` |  |

#### FR-151 習慣の枠の「できなかった」

- ノード：`feature:habits/miss-block`　出典：`src/lib/mock/state.ts:683-689`
- 終わった枠を「できなかった」にし、やっていない扱いにして、入る時間があればあとに入れ直す。

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0526 | 「できなかった」の記録は日付ごとに「習慣ID:開始時刻」で持ち、60日ぶんだけ残す | `rule:habits/miss-record-60-days` | `src/lib/mock/state.ts:686-688` |  |

#### FR-152 「今日は飛ばす」と食事の家で・外で

- ノード：`feature:habits/skip-today`　出典：`src/lib/mock/model.ts:317-322`
- 習慣を今日は飛ばす記録を日付ごとに持つ。食事は「家で食べる」を別に持ち、「外で」は飛ばす扱い。

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0527 | 食事を「外で」にした日は飛ばす扱い。「家で食べる」は別の記録 △ | `rule:habits/meal-outside-is-skip` | `src/lib/mock/model.ts:321-322` |  |
| BR-0528 | やっていない枠は、飛ばした枠・できなかった枠・寝ていた間の枠 | `rule:habits/not-done-blocks` | `src/lib/mock/state.ts:511-512` |  |
| BR-0529 | 「今日は飛ばす」「できなかった」にした習慣の枠は外して入れ直す | `rule:habits/skip-block-removed` | `src/lib/mock/state.ts:505-510` |  |

### FR-153 睡眠と夜の記録

- ノード：`feature:night`　出典：`src/lib/mock/night.ts:1-128`


#### FR-154 「寝る」の記録

- ノード：`feature:night/bed-record`　出典：`src/lib/mock/model.ts:191-196`
- 「寝る」を押した時刻と、押したときの予定の就寝時刻を、その日の日付ごとに1件持つ。

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0530 | 「寝る」の記録は押した時刻と予定の就寝がどちらも数のものだけ読む | `rule:night/bed-log-shape-check` | `src/lib/mock/state.ts:357-363` |  |

#### FR-155 「寝る」「起きた」とヘルスケアから起床を組み直す

- ノード：`feature:night/bedtime-replan`　出典：`src/lib/mock/bedtime.ts:31-77`
- 「寝る」「起きた」の記録とヘルスケアの睡眠から、朝ごとに1つの睡眠を見積もり、その起床から日の計画を組み直す。
- 前提：`feature:rhythm`（`src/lib/mock/bedtime.ts:37-45`）、`feature:health-sleep`（`src/lib/mock/bedtime.ts:56`）

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0531 | 活動開始の記録があれば、その時刻から組み直す | `rule:night/activity-start-wins` | `src/lib/mock/bedtime.ts:51-71` |  |
| BR-0532 | 早く寝ても起床は予定より前へ動かさない | `rule:night/bed-never-earlier-than-planned-wake` | `src/lib/mock/bedtime.ts:47` |  |
| BR-0533 | 「寝る」だけ押した朝は、睡眠として見積もる | `rule:night/bed-only-sleep-estimate` | `src/lib/mock/bedtime.ts:73` |  |
| BR-0534 | 「寝る」を押した夜は、押した時刻に睡眠時間を足した起床へ送る | `rule:night/bed-tap-wake-estimate` | `src/lib/mock/bedtime.ts:41-50` | `setting:planner/sleep-minutes` |
| BR-0535 | 見積もり起床は、固定の予定に間に合う時刻を上限にする | `rule:night/bed-wake-limited-by-fixed-events` | `src/lib/mock/bedtime.ts:45-48` |  |
| BR-0536 | ヘルスケアの目覚めが予定より遅いときだけ、その時刻から組み直す | `rule:night/health-late-wake-replan` | `src/lib/mock/bedtime.ts:72` |  |
| BR-0537 | 「今から寝る」の予定は、そのあとの「起きた」で終える | `rule:night/late-wake-tap-closes-sleep` | `src/lib/mock/bedtime.ts:9-21` | `setting:night/late-wake-minutes` |
| BR-0538 | 自分で入れた立て直しがあれば自動の見積もりは作らない | `rule:night/manual-reset-wins` | `src/lib/mock/bedtime.ts:34` |  |
| BR-0539 | 前の晩に予定していた起床を残す | `rule:night/planned-wake-kept` | `src/lib/mock/bedtime.ts:66-72` |  |
| BR-0540 | 2日以内の記録だけで組み直す | `rule:night/recent-two-days` | `src/lib/mock/bedtime.ts:32` |  |
| BR-0541 | 睡眠の始まりは「寝る」→ヘルスケアの入眠→予定の就寝の順に使う | `rule:night/sleep-start-priority` | `src/lib/mock/bedtime.ts:68` |  |

| ID | 設定・調整値 | 値 | ノード | 出典 |
|---|---|---|---|---|
| ST-078 | 「今から寝る」の起きる予定から起きたとみなす猶予（6時間） | 360 | `setting:night/late-wake-minutes` | `src/lib/mock/bedtime.ts:7` |

##### FR-156 見積もった睡眠と重なる枠の整理

- ノード：`feature:night/bedtime-reconcile`　出典：`src/lib/mock/bedtime.ts:84-96`
- 見積もった睡眠と重なる自動の枠を外し、途中までのタスクの作業は確認に残す。

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0542 | 「寝る」「起きた」に答えた夜は、睡眠中に始まった枠を「できなかった」にする | `rule:night/answered-sleep-miss` | `src/lib/mock/bedtime.ts:90-91` |  |
| BR-0543 | 睡眠の前から始まった枠は、睡眠の始まりで切る | `rule:night/cut-block-at-sleep-start` | `src/lib/mock/bedtime.ts:92` |  |
| BR-0544 | 見積もった睡眠と重なる自動の枠は外す | `rule:night/drop-auto-blocks-in-sleep` | `src/lib/mock/bedtime.ts:95` |  |
| BR-0545 | ヘルスケアだけの睡眠と重なる枠は自動で決めず確認に残す | `rule:night/health-only-sleep-confirm` | `src/lib/mock/bedtime.ts:91` |  |
| BR-0546 | 固定したタスクの枠は睡眠と重なっても作業ログを変えない | `rule:night/pinned-task-blocks-kept` | `src/lib/mock/bedtime.ts:89` |  |
| BR-0547 | 確認済み・数えた・未来・重ならない枠は整理しない | `rule:night/reviewed-blocks-untouched` | `src/lib/mock/bedtime.ts:88` |  |

#### FR-157 夜の記録（起きた日ごとに1つにまとめる）

- ノード：`feature:night/night-record`　出典：`src/lib/mock/night.ts:42-92`
- 起きた日ごとに、活動（寝床に入った・起き上がった）と睡眠（ヘルスケアの入眠・目覚め）を分けて持ち、どの場面も同じ値を使う。
- 前提：`feature:health-sleep`（`src/lib/mock/night.ts:47`）

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0548 | 記録のある夜はすべて、起きた日の古い順に出す | `rule:night/all-nights-dates` | `src/lib/mock/night.ts:95-106` |  |
| BR-0549 | 前の日の「寝る」は、次の朝の夜の記録に結びつける | `rule:night/bed-belongs-to-next-morning` | `src/lib/mock/night.ts:44-46` |  |
| BR-0550 | その朝に終わる自分の立て直しのうち、最後に終わるものを手入力とみなす | `rule:night/manual-reset-latest` | `src/lib/mock/night.ts:48-49` |  |
| BR-0551 | 予定の就寝は 「寝る」を押したときの予定 → 計画の控え → 予定の起床−睡眠時間 の順 | `rule:night/planned-bed-fallback` | `src/lib/mock/night.ts:65-70` | `setting:planner/sleep-minutes` |
| BR-0552 | 寝る〜起きたで睡眠時間を出す条件 | `rule:night/sleep-from-activity-conditions` | `src/lib/mock/night.ts:72-73` |  |
| BR-0553 | 睡眠時間は 手で直した値 → ヘルスケア → 寝る〜起きた の順に使う | `rule:night/sleep-minutes-priority` | `src/lib/mock/night.ts:74-81` |  |
| BR-0554 | 夜の時刻は 手で入れた値 → ボタン → 朝ルーティン の順に使う | `rule:night/source-priority` | `src/lib/mock/night.ts:49-63` |  |

##### FR-158 予定どおり起きた・寝たの判定

- ノード：`feature:night/on-time-judge`　出典：`src/lib/mock/night.ts:108-122`
- 夜の記録から、予定の起床・就寝に対して猶予内だったかを判定する。ご褒美・今週のまとめ・気づきが共通で使う。

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0555 | 予定どおり寝た：活動終了（なければ入眠）が予定の就寝から30分以内 | `rule:night/bed-on-time` | `src/lib/mock/night.ts:112-122` | `setting:night/on-time-grace` |
| BR-0556 | 予定どおり起きた：活動開始が予定の起床から30分以内 | `rule:night/up-on-time` | `src/lib/mock/night.ts:108-110` | `setting:night/on-time-grace` |

| ID | 設定・調整値 | 値 | ノード | 出典 |
|---|---|---|---|---|
| ST-079 | 予定どおりかを見る猶予（30分） | 30 | `setting:night/on-time-grace` | `src/lib/mock/night.ts:36` |

##### FR-159 寝つくまで・起き上がるまでの差

- ノード：`feature:night/sleep-gaps`　出典：`src/lib/mock/night.ts:124-128`
- 活動の記録とヘルスケアの記録の差から、寝つくまでと起き上がるまでの分を出す（記録の画面の「夜」のカードに使う）。

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0557 | 寝つくまで＝寝床に入った時刻から入眠までの分（両方ある夜だけ） | `rule:night/fall-asleep-gap` | `src/lib/mock/night.ts:124-126` |  |
| BR-0558 | 起き上がるまで＝ヘルスケアの目覚めから活動開始までの分（両方ある夜だけ） | `rule:night/get-up-gap` | `src/lib/mock/night.ts:127-128` |  |

#### FR-160 朝の記録

- ノード：`feature:night/wake-record`　出典：`src/lib/mock/model.ts:101-117`
- その日の朝の記録。「起きた」を押した時刻、前の晩の予定の起床、朝ルーティンの最初のチェックと完了、終えた手順、朝の疲れ、眠った時間を持つ。

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0559 | 朝の疲れは1（元気）〜5（ぐったり）で答える | `rule:night/morning-fatigue-scale` | `src/lib/mock/model.ts:112-114` |  |
| BR-0560 | 「起きた」を押したとき、前の晩に予定していた起床時刻も残す | `rule:night/planned-wake-recorded` | `src/lib/mock/model.ts:105-106` |  |
| BR-0561 | 朝ルーティンは最初のチェックの時刻から始めたものとして組み直す | `rule:night/routine-starts-at-first-check` | `src/lib/mock/state.ts:556-562` |  |

### FR-161 ご褒美

- ノード：`feature:rewards`　出典：`src/components/settings/Rewards.tsx:1-30`


| ID | 設定・調整値 | 値 | ノード | 出典 |
|---|---|---|---|---|
| ST-080 | ご褒美の金額 △ | — | `setting:rewards/rates` | `src/lib/mock/stats.ts:138-141` |

#### FR-162 使える残りのご褒美

- ノード：`feature:rewards/balance`　出典：`src/lib/mock/stats.ts:224-225`
- たまった合計から、使った記録の合計を引く。使った記録だけが減らす。

#### FR-163 ご褒美の繰り越し

- ノード：`feature:rewards/bank`　出典：`src/lib/mock/stats.ts:110-136`
- 3週間より前の分を繰り越しにまとめ、記録が保存期限で消えてもたまった額が減らないようにする。

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0562 | 金額の設定を変えても、繰り越した分は変わらない | `rule:rewards/bank-independent-of-rates` | `src/lib/mock/stats.ts:126-136` |  |
| BR-0563 | 組み直すたびに繰り越され、保存して読み直しても残る △ | `rule:rewards/bank-on-replan` | `src/lib/mock/review-2026-10-03.test.ts:61-67` |  |
| BR-0564 | 繰り越しは二重に数えず、変わらなければ同じものを返す | `rule:rewards/bank-once` | `src/lib/mock/stats.ts:126-136` |  |
| BR-0565 | 繰り越しの分は、期間を指定しない（全期間の）合計にだけ足す | `rule:rewards/bank-only-all-time` | `src/lib/mock/stats.ts:115-124` |  |

| ID | 設定・調整値 | 値 | ノード | 出典 |
|---|---|---|---|---|
| ST-081 | 繰り越しにする境目（3週間） | 21 | `setting:rewards/bank-lag-days` | `src/lib/mock/stats.ts:112-113` |

#### FR-164 ご褒美のお金（もとごとのたまった額）

- ノード：`feature:rewards/breakdown`　出典：`src/lib/mock/stats.ts:99-170`
- 起床・朝ルーティン・就寝・習慣・タスクの枠・記録のもとごとに、金額の設定を使ってたまった額（円）を数える。期間を渡せばその間だけ。
- 前提：`feature:health-sleep`（`src/lib/mock/stats.ts:148-149`）

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0566 | 予定どおりに寝たら就寝のご褒美 | `rule:rewards/bed` | `src/lib/mock/stats.ts:152` |  |
| BR-0567 | 合計は四捨五入した円 | `rule:rewards/earned-rounded` | `src/lib/mock/stats.ts:167-170` |  |
| BR-0568 | 習慣のご褒美は「記録する」習慣だけ。食事は除く | `rule:rewards/habit` | `src/lib/mock/stats.ts:153-162` |  |
| BR-0569 | 記録をつけたら記録のご褒美 | `rule:rewards/log` | `src/lib/mock/stats.ts:146-151` |  |
| BR-0570 | 朝ルーティンを終えたら朝ルーティンのご褒美 | `rule:rewards/routine` | `src/lib/mock/stats.ts:144-145` |  |
| BR-0571 | 作業した枠（達成の時刻がある）ごとにタスクのご褒美 | `rule:rewards/task` | `src/lib/mock/stats.ts:163` |  |
| BR-0572 | 予定どおり起きたら起床のご褒美 | `rule:rewards/wake` | `src/lib/mock/stats.ts:142-143` |  |

#### FR-165 ご褒美の金額

- ノード：`feature:rewards/earning-rates`　出典：`src/lib/mock/model.ts:177-190`
- 起床・朝ルーティン・習慣・タスク・就寝・記録の6種類に、1回あたりの円を決める。

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0573 | 就寝のご褒美は予定の30分後までに活動を終えたとき | `rule:rewards/bed-within-30-after` | `src/lib/mock/model.ts:177-180` |  |
| BR-0574 | 習慣のご褒美は「記録する」習慣だけで、少しだけは半分、食事は除く | `rule:rewards/habit-tracked-only` | `src/lib/mock/model.ts:177-179` |  |
| BR-0575 | 記録のご褒美は朝の疲れ・睡眠時間・帰宅時の体力を答えたとき | `rule:rewards/log-answers` | `src/lib/mock/model.ts:179-180` |  |
| BR-0576 | 見本（新しいアカウント）の起床のご褒美は50円 | `rule:rewards/new-account-wake-50` | `src/lib/mock/state.ts:146` |  |
| BR-0577 | タバコはご褒美の対象にしない | `rule:rewards/no-smoking-reward` | `src/lib/mock/model.ts:180-181` |  |
| BR-0578 | 起床のご褒美は予定の30分以内に活動を始めたとき | `rule:rewards/wake-within-30` | `src/lib/mock/model.ts:177-179` |  |
| BR-0579 | ご褒美の金額は初期値に重ねて読む | `rule:sync/reward-rates-merge` | `src/lib/mock/state.ts:454` |  |

| ID | 設定・調整値 | 値 | ノード | 出典 |
|---|---|---|---|---|
| ST-082 | ご褒美の金額の初期値 | {"wake":30,"routine":30,"habit":30,"task":100,"bed":30,"log":10} | `setting:rewards/default-rates` | `src/lib/mock/model.ts:190` |

#### FR-166 ご褒美の金額の設定

- ノード：`feature:rewards/rate-settings`　出典：`src/components/settings/Rewards.tsx:17-30`
- 起床・朝ルーティン・習慣・タスク・就寝・記録の6種類について、1回あたりのご褒美の円を設定する。

#### FR-167 ご褒美の繰り越し

- ノード：`feature:rewards/reward-bank`　出典：`src/lib/mock/model.ts:211-221`
- 確定した分を、もとごとに足し合わせて残す。記録の保存期限が切れても、たまった額が減らない。

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0580 | 確定した分は繰り越して残し、保存期限が切れても減らない | `rule:rewards/bank-carries-confirmed` | `src/lib/mock/model.ts:333-337` |  |
| BR-0581 | 繰り越しの読み込みで不正なら空にし、欠けた項目は0にする | `rule:rewards/bank-parse` | `src/lib/mock/state.ts:618-623` |  |

#### FR-168 ご褒美のお金を使った記録

- ノード：`feature:rewards/spending`　出典：`src/lib/mock/model.ts:171-176`
- ご褒美を使った日時・金額・メモを残す。

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0582 | 使った記録は ID・時刻・金額が正しい形のものだけ読む | `rule:sync/reward-spend-shape` | `src/lib/mock/state.ts:414-416` |  |

### FR-169 通知

- ノード：`feature:notifications`　出典：`src/lib/notify/build.ts:1-187`


| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0583 | タスクを消すと、そのタスクの枠の通知（始まり・進み具合）を一覧から外す | `rule:notifications/deleted-task-clears-notices` | `src/lib/scheduler/review2.test.ts:134-144` |  |
| BR-0584 | 通知や戻り先の行き先はアプリ内の場所だけ通す | `rule:notifications/open-only-in-app-path` | `src/lib/appPath.ts:5-7` |  |

| ID | 設定・調整値 | 値 | ノード | 出典 |
|---|---|---|---|---|
| ST-083 | CRON_SECRET（定期実行の合言葉） | — | `setting:infra/env-cron-secret` | `.env.example:14-15` |
| ST-084 | VAPID_PRIVATE_KEY（通知の秘密鍵） | — | `setting:infra/env-vapid-private-key` | `.env.example:10-12` |
| ST-085 | NEXT_PUBLIC_VAPID_PUBLIC_KEY（通知の公開鍵） | — | `setting:infra/env-vapid-public-key` | `.env.example:10-11` |

#### FR-170 これから送る通知の一覧を作る

- ノード：`feature:notifications/build-schedule`　出典：`src/lib/notify/build.ts:46-187`
- 配置の結果から、予定の事前通知・枠の始まり・毎朝のまとめ・身支度・帰宅時の体力・タバコの区切り・Apple Watch の充電・寝る準備などの通知を、時刻順の一覧にする。

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0585 | 就寝の準備の時間に、就寝と起床の時刻を添えて知らせる | `rule:notifications/bed-prep` | `src/lib/notify/build.ts:176-184` |  |
| BR-0586 | 習慣とタスクの枠は始まりに知らせ、朝ルーティンは知らせない | `rule:notifications/block-start` | `src/lib/notify/build.ts:107-118` |  |
| BR-0587 | 帰宅時（または夜の始まり）に、残りの体力を聞く | `rule:notifications/evening-energy-ask` | `src/lib/notify/build.ts:150-160` |  |
| BR-0588 | 予定の15分前（外出する予定は家を出る15分前）に知らせる | `rule:notifications/event-lead` | `src/lib/notify/build.ts:73-88` | `setting:notifications/lead-minutes` |
| BR-0589 | きっかけのある記録習慣は「まず5分」と知らせる | `rule:notifications/habit-first-five-minutes` | `src/lib/notify/build.ts:105-114` |  |
| BR-0590 | 48時間より先と過ぎた時刻の通知は作らない | `rule:notifications/horizon-limit` | `src/lib/notify/build.ts:60-71` | `setting:notifications/horizon-ms` |
| BR-0591 | 毎朝の起床の時刻にその日のまとめを知らせる | `rule:notifications/morning-summary` | `src/lib/notify/build.ts:120-133` |  |
| BR-0592 | 身支度は人に会う日だけ、置いた枠の始まりに知らせる | `rule:notifications/prep-start` | `src/lib/notify/build.ts:136-149` |  |
| BR-0593 | 就寝から次の起床までは通知を送らない（毎朝のまとめは除く） | `rule:notifications/quiet-hours` | `src/lib/notify/build.ts:61-71` |  |
| BR-0594 | 就寝の3時間前に「今日のタバコはここまで」を知らせる | `rule:notifications/smoke-cutoff` | `src/lib/notify/build.ts:161-168` | `setting:notifications/smoke-cutoff-minutes` |
| BR-0595 | タスクの枠の通知はそのタスクを開く（開くだけでは達成にしない） | `rule:notifications/task-notice-opens-task` | `src/lib/notify/build.ts:115-117` |  |
| BR-0596 | タスクの枠が終わったら「どのくらい進んだ？」と聞く | `rule:notifications/task-progress-check` | `src/lib/notify/build.ts:100-104` |  |
| BR-0597 | 移動時間が分からない予定は、いちばん早い1件分だけをすぐ聞く | `rule:notifications/travel-time-ask-once` | `src/lib/notify/build.ts:89-99` |  |
| BR-0598 | Apple Watch の充電は就寝の2時間前、帰宅がそれより遅い日は帰宅の時刻 | `rule:notifications/watch-charge` | `src/lib/notify/build.ts:168-175` | `setting:notifications/watch-charge-minutes` |

| ID | 設定・調整値 | 値 | ノード | 出典 |
|---|---|---|---|---|
| ST-086 | どこまで先の通知を作るか（48時間） | 48 * 60 * MIN | `setting:notifications/horizon-ms` | `src/lib/notify/build.ts:40` |
| ST-087 | 予定の何分前に知らせるか（15分） | 15 | `setting:notifications/lead-minutes` | `src/lib/notify/build.ts:39` |
| ST-088 | タバコの区切り（就寝の180分前） | 180 | `setting:notifications/smoke-cutoff-minutes` | `src/lib/notify/build.ts:41-42` |
| ST-089 | Apple Watch の充電を始める合図（就寝の120分前） | 120 | `setting:notifications/watch-charge-minutes` | `src/lib/notify/build.ts:43-44` |

##### FR-171 朝のまとめの内容 △

- ノード：`feature:notifications/morning-summary-group`　出典：`src/lib/notify/build.ts:120-133`
- 朝のまとめに含める情報（予定・タスクの枠・出発・間に合わない件数・連絡の促し）の組み立て。

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0599 | 連絡してみる日は朝のまとめに添える | `rule:notifications/contact-day-in-morning` | `src/lib/notify/build.ts:130` |  |

#### FR-172 消した・終えたタスクの通知を通知センターから閉じる

- ノード：`feature:notifications/close-gone-task`　出典：`src/lib/notify/close.ts:1-15`
- タスクを消したり終えたりしたとき、すでに届いている「始まり」「どのくらい進んだ？」の通知を閉じて、通知センターに残さない。
- 前提：`integration:service-worker`（`src/lib/notify/close.ts:7-11`）

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0600 | 存在しなくなったタスクの通知だけ閉じる | `rule:notifications/close-only-removed-task-notices` | `src/lib/notify/close.ts:1-14` |  |

#### FR-173 定期実行からの呼び出しの確認

- ノード：`feature:notifications/cron-auth`　出典：`src/lib/push/cron.ts:3-11`
- Supabase の pg_cron からの呼び出しかを、Authorization: Bearer <CRON_SECRET> で確かめる。
- 前提：`integration:supabase-pg-cron`（`src/lib/push/cron.ts:3`）

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0601 | 合言葉が未設定なら全て拒否し、一定時間で比較する | `rule:notifications/cron-secret-required` | `src/lib/push/cron.ts:4-11` | `setting:notifications/cron-secret` |

| ID | 設定・調整値 | 値 | ノード | 出典 |
|---|---|---|---|---|
| ST-090 | 定期実行の合言葉（CRON_SECRET） | — | `setting:notifications/cron-secret` | `src/lib/push/cron.ts:4-6` |

#### FR-174 通知を端末ごとに二重送信なく送る

- ノード：`feature:notifications/delivery`　出典：`src/lib/push/delivery.ts:15-68`
- 通知の送信を、端末ごとの記録（送信中・送信済み）で管理し、一時エラーの端末だけ再送、成功した端末には二重送信しない。重なった定期実行でも同時送信しない。
- 前提：`integration:web-push`（`src/lib/push/delivery.ts:46-68`）、`integration:supabase-db`（`src/lib/push/delivery.ts:16-42`）

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0602 | 旧版で送信済みの通知キーは再送しない | `rule:notifications/legacy-sent-key-skip` | `src/lib/push/delivery.ts:15-55` |  |
| BR-0603 | 成功した端末には二重送信せず、失敗した端末だけ次回再送する | `rule:notifications/no-resend-to-delivered-device` | `src/lib/push/delivery.ts:53-66` |  |
| BR-0604 | 例外でも確保を解放する（所有時刻が一致するときだけ） | `rule:notifications/release-claim-always` | `src/lib/push/delivery.ts:36-67` |  |
| BR-0605 | 送信中は確保して重なった実行の同時送信を防ぐ | `rule:notifications/sending-lease-prevents-overlap` | `src/lib/push/delivery.ts:23-31` | `setting:notifications/delivery-lease-ms` |

| ID | 設定・調整値 | 値 | ノード | 出典 |
|---|---|---|---|---|
| ST-091 | 送信中の確保の有効時間（2分） | 2 * 60_000 | `setting:notifications/delivery-lease-ms` | `src/lib/push/delivery.ts:5-6` |

#### FR-175 いつ送るか（時刻の窓）

- ノード：`feature:notifications/delivery-timing`　出典：`src/lib/push/send.ts:66-72`
- 通知を送ってよい時間の窓を決める。時刻が来ていて、遅れても指定の期限（なければ時刻から10分）までは送る。

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0606 | 時刻が来ていて、期限（なければ時刻から10分）を過ぎていない通知を送る | `rule:notifications/due-window` | `src/lib/push/send.ts:69-72` | `setting:notifications/grace-ms` |
| BR-0607 | 遅れても、知らせる意味がなくなる時刻までは送る | `rule:notifications/late-delivery-until` | `src/lib/notify/build.ts:12-16` |  |

| ID | 設定・調整値 | 値 | ノード | 出典 |
|---|---|---|---|---|
| ST-092 | 遅れて届いた一覧でも送る猶予（10分） | 10 * 60_000 | `setting:notifications/grace-ms` | `src/lib/push/send.ts:66-67` |

#### FR-176 時刻が来た通知を送る（1分ごと）

- ノード：`feature:notifications/dispatch`　出典：`src/app/api/push/dispatch/route.ts:8-47`
- pg_cron から1分ごとに呼ばれ、push_schedule の中で時刻が来たものを、その人の端末すべてへ送る。
- 前提：`integration:supabase-pg-cron`（`src/app/api/push/dispatch/route.ts:8-11`）、`integration:web-push`（`src/app/api/push/dispatch/route.ts:33`）、`integration:supabase-db`（`src/app/api/push/dispatch/route.ts:17`）

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0608 | 通知の送信・組み直しは CRON_SECRET が合うときだけ受ける | `rule:auth/cron-secret-required` | `src/app/api/push/dispatch/route.ts:8-14` |  |
| BR-0609 | 送った通知の記録は、画面（本人）からは読めず書けない | `rule:auth/server-only-table-push-sent` | `supabase/migrations/0003_push.sql:64-72` |  |
| BR-0610 | 同じ通知を同じ端末に2回送らない △ | `rule:notifications/no-double-send` | `src/app/api/push/dispatch/route.ts:29-34` |  |
| BR-0611 | 送った記録は3日たったら消す | `rule:notifications/prune-sent-log` | `src/app/api/push/dispatch/route.ts:45` | `setting:notifications/keep-sent-days` |
| BR-0612 | 宛先がなくなった端末の登録は消す | `rule:notifications/remove-gone-subscription` | `src/app/api/push/dispatch/route.ts:36` |  |
| BR-0613 | 送信や記録に失敗しても止めず、次の回に再試行する | `rule:notifications/retry-on-failure` | `src/app/api/push/dispatch/route.ts:37-40` |  |
| BR-0614 | 時刻が来た通知だけを、購読端末があるユーザーにだけ送る | `rule:notifications/send-only-due` | `src/app/api/push/dispatch/route.ts:22-28` |  |
| BR-0615 | 通知を受け取る端末は https の宛先だけ・同じ端末は1回だけ | `rule:notifications/subscription-constraints` | `supabase/migrations/0003_push.sql:6-15` |  |

| ID | 設定・調整値 | 値 | ノード | 出典 |
|---|---|---|---|---|
| ST-093 | 送った記録を残す期間（3日） | 259200000 | `setting:notifications/keep-sent-days` | `src/app/api/push/dispatch/route.ts:6` |

#### FR-177 通知の一覧の組み直し（毎時）

- ノード：`feature:notifications/hourly-replan`　出典：`src/app/api/push/replan/route.ts:5-30`
- アプリを開いていなくても、app_state と取り込み元の iCal から通知の一覧を組み直し、push_schedule だけを書き換える。
- 前提：`integration:supabase-pg-cron`（`src/app/api/push/replan/route.ts:5-9`）、`feature:ical`（`src/app/api/push/replan/route.ts:7-9`）

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0616 | 1人のデータが壊れていても、ほかの人の組み直しは続ける | `rule:notifications/replan-isolated-per-user` | `src/app/api/push/replan/route.ts:20-28` |  |
| BR-0617 | 組み直しで書くのは push_schedule だけ、app_state は書かない | `rule:notifications/replan-writes-schedule-only` | `src/app/api/push/replan/route.ts:5-10` |  |
| BR-0618 | 通知の一覧は配列で、200000バイトまで | `rule:notifications/schedule-size-limit` | `supabase/migrations/0003_push.sql:40-44` |  |

#### FR-178 通知の一覧をサーバーで組み直して保存する

- ノード：`feature:notifications/server-replan`　出典：`src/lib/server/push.ts:8-28`
- 毎時の定期実行と、ヘルスケアの睡眠が届いたとき（寝坊に合わせて通知を直す）に、サーバーで配置を組み直し、通知の一覧を push_schedule に保存する。
- 前提：`feature:sync/server-plan`（`src/lib/server/push.ts:13-14`）、`integration:supabase-db`（`src/lib/server/push.ts:26`）、`integration:supabase-pg-cron`（`src/lib/server/push.ts:10`）

#### FR-179 通知の設定

- ノード：`feature:notifications/settings`　出典：`src/components/settings/Notifications.tsx:8-85`
- 知らせる内容（予定の前・習慣とタスクの枠の始まり・毎朝のまとめ）を示し、この端末の通知をオン・オフし、テスト通知を送れる。
- 前提：`integration:web-push`（`src/components/settings/Notifications.tsx:6`）

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0619 | 通知をオンにするにはホーム画面に追加したアプリから開く必要がある | `rule:notifications/needs-home-screen` | `src/components/settings/Notifications.tsx:49-62` |  |
| BR-0620 | テスト通知とオフの操作は、通知がオンのときだけ出す | `rule:notifications/test-and-off-only-when-on` | `src/components/settings/Notifications.tsx:64-82` |  |

#### FR-180 この端末の通知の登録・解除とテスト送信

- ノード：`feature:notifications/subscribe`　出典：`src/lib/sync/push.ts:4-86`
- 通知の許可を聞いて端末を登録し、サーバーに購読情報（端末名つき）を保存する。解除・テスト通知・通知の一覧の保存もできる。
- 前提：`integration:web-push`（`src/lib/sync/push.ts:42-58`）、`integration:supabase-db`（`src/lib/sync/push.ts:51-57`）、`integration:service-worker`（`src/lib/sync/push.ts:47-48`）

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0621 | iPhone はホーム画面に追加したアプリでないと通知を受け取れない | `rule:notifications/ios-needs-home-screen` | `src/lib/sync/push.ts:18-26` |  |
| BR-0622 | 通知の許可はボタンを押した操作の中で聞く | `rule:notifications/permission-asked-on-tap` | `src/lib/sync/push.ts:41-46` |  |

#### FR-181 テスト通知を送る

- ノード：`feature:notifications/test-send`　出典：`src/app/api/push/test/route.ts:4-18`
- 設定画面の「テスト通知を送る」から、ログイン中の本人の端末にだけ通知を送る。
- 前提：`integration:web-push`（`src/app/api/push/test/route.ts:13`）、`integration:supabase-db`（`src/app/api/push/test/route.ts:7`）

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0623 | テスト通知はログイン中の本人の端末だけ。端末がなければエラー | `rule:notifications/test-own-devices-only` | `src/app/api/push/test/route.ts:4-16` |  |

#### FR-182 端末に Web Push を送る

- ノード：`feature:notifications/web-push-send`　出典：`src/lib/push/send.ts:27-43`
- VAPID の鍵で端末の購読先に通知を送る。結果は送れた・端末が通知を止めた（登録を消してよい）・エラーの3つ。
- 前提：`integration:web-push`（`src/lib/push/send.ts:28-43`）

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0624 | 404・410 は端末が通知を止めたとして登録を消してよい合図にする | `rule:notifications/gone-device-removable` | `src/lib/push/send.ts:27-42` |  |
| BR-0625 | 通知の有効時間は30分、緊急度は高 | `rule:notifications/push-ttl-30min` | `src/lib/push/send.ts:31-34` |  |
| BR-0626 | 画面が保存した一覧は、形と長さを確かめてから使う | `rule:notifications/sanitize-saved-schedule` | `src/lib/push/send.ts:45-64` |  |

| ID | 設定・調整値 | 値 | ノード | 出典 |
|---|---|---|---|---|
| ST-094 | 通知の鍵（NEXT_PUBLIC_VAPID_PUBLIC_KEY・VAPID_PRIVATE_KEY） | — | `setting:notifications/vapid-keys` | `src/lib/push/send.ts:19-21` |
| ST-095 | 送り先に伝える連絡先（VAPID_SUBJECT） | https://calender-app-umber.vercel.app | `setting:notifications/vapid-subject` | `src/lib/push/send.ts:22-23` |

#### FR-183 通知の表示と、押したときの動き

- ノード：`feature:pwa/push-display`　出典：`public/sw.js:96-131`
- サーバーから届いた通知を表示し、押すと開いているアプリに切り替える（なければ開く）。
- 前提：`integration:service-worker`（`public/sw.js:96-131`）、`integration:web-push`（`public/sw.js:96-98`）

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0627 | 通知を押したら、開いているアプリに切り替える | `rule:pwa/notification-click-focus-existing` | `public/sw.js:117-130` |  |
| BR-0628 | 通知を押して開く場所は、同じアプリの中だけ | `rule:pwa/notification-url-same-app-only` | `public/sw.js:110-111` |  |

### FR-184 iCal の取り込みと配信

- ノード：`feature:ical`　出典：`src/lib/ical/import.ts:1-93`

- 前提：`integration:ical-js`（`src/lib/ical/import.ts:1-48`）

#### FR-185 アプリの予定を iCal 形式に書き出す

- ノード：`feature:ical/export-ics`　出典：`src/lib/ical/export.ts:21-46`
- iOS のカレンダーなどから読み取り専用で購読できる iCal を作る。カレンダー名・予定の題名・時刻・場所・説明を書く。
- 前提：`integration:ical-export-feed`（`src/lib/ical/export.ts:21-46`）

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0629 | 予定の ID は配信のたびに変わらない | `rule:ical/export-stable-uid` | `src/lib/ical/export.ts:5-8` |  |
| BR-0630 | 時刻は UTC で、終日の予定だけローカルの日付で書く | `rule:ical/export-time-format` | `src/lib/ical/export.ts:16-24` |  |

#### FR-186 アプリが組んだ予定を iCal として配信する（API）

- ノード：`feature:ical/feed-endpoint`　出典：`src/app/api/ical/feed/[token]/route.ts:10-42`
- 合言葉入りのアドレスを読みに来たら、その場で組み直して、枠・自分の予定・授業を iCal で返す。
- 前提：`integration:ical-export-feed`（`src/app/api/ical/feed/[token]/route.ts:10-42`）、`integration:supabase-db`（`src/app/api/ical/feed/[token]/route.ts:21-25`）、`feature:planner`（`src/app/api/ical/feed/[token]/route.ts:28-30`）

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0631 | iCal 配信は、アドレスの合言葉の SHA-256 で本人を見分け、合わなければ404 | `rule:auth/feed-token-hashed-lookup` | `src/app/api/ical/feed/[token]/route.ts:16-22` |  |
| BR-0632 | 配信に入るのは、枠・自分の予定・授業（Google の予定は入れない） | `rule:ical/feed-contents` | `src/app/api/ical/feed/[token]/route.ts:27-34` |  |
| BR-0633 | 配信の合言葉は SHA-256 だけを保存し、1人1つ | `rule:ical/feed-hash-only-one-per-user` | `supabase/migrations/0004_ical_feeds.sql:1-9` |  |
| BR-0634 | 配信は本人用なので、保存させず検索にも載せない | `rule:ical/feed-private-and-noindex` | `src/app/api/ical/feed/[token]/route.ts:35-41` |  |
| BR-0635 | 配信は読まれるたびに組み直し、取れなければ最後の保存を使う | `rule:ical/feed-rebuild-on-read` | `src/app/api/ical/feed/[token]/route.ts:24-33` |  |

#### FR-187 配信する予定を選ぶ

- ノード：`feature:ical/feed-events`　出典：`src/lib/ical/feed.ts:12-36`
- iCal で配信する予定を、アプリが組んだ枠・アプリで入れた予定・時間割の授業から作り、開始の早い順にする。

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0636 | 枠の説明に種類と「リズム カレンダーが配置」を付ける | `rule:ical/feed-block-label` | `src/lib/ical/feed.ts:10-27` |  |
| BR-0637 | Google カレンダーから取り込んだ予定は配信しない | `rule:ical/feed-excludes-google` | `src/lib/ical/feed.ts:12-15` |  |
| BR-0638 | 配信範囲の外の予定は入れない | `rule:ical/feed-range` | `src/lib/ical/feed.ts:18` | `setting:ical/feed-past-days` `setting:ical/feed-future-days` |

| ID | 設定・調整値 | 値 | ノード | 出典 |
|---|---|---|---|---|
| ST-096 | 配信する未来の範囲（15日先） | 15 * DAY_MS | `setting:ical/feed-future-days` | `src/lib/ical/feed.ts:6-8` |
| ST-097 | 配信する過去の範囲（7日前） | 7 * DAY_MS | `setting:ical/feed-past-days` | `src/lib/ical/feed.ts:5-7` |

#### FR-188 配信アドレスの発行と停止

- ノード：`feature:ical/feed-secret-url`　出典：`src/lib/sync/feed.ts:3-47`
- iCal 配信の合言葉を作ってアドレスにし、DB には合言葉の SHA-256 だけを保存する。アドレスは作ったときの1回だけ返し、作り直すと前のアドレスは使えなくなる。配信は停止できる。
- 前提：`integration:supabase-db`（`src/lib/sync/feed.ts:32-42`）、`integration:ical-export-feed`（`src/lib/sync/feed.ts:41`）

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0639 | アドレスを作り直すと前のものは使えなくなる △ | `rule:ical/feed-regenerate-invalidates-old` | `src/lib/sync/feed.ts:31-42` |  |
| BR-0640 | 配信アドレスの合言葉は32バイトの base64url（43文字） | `rule:ical/feed-token-format` | `src/lib/ical/feed.ts:38-39` |  |
| BR-0641 | 合言葉は推測できない乱数で、保存するのはハッシュだけ | `rule:ical/feed-token-random-hash-only` | `src/lib/sync/feed.ts:24-29` |  |

#### FR-189 カレンダーへの配信（iCal フィード）の設定

- ノード：`feature:ical/feed-settings`　出典：`src/components/settings/Feed.tsx:8-109`
- アプリが組んだ枠・自分の予定・出る授業を、iPhone や Google のカレンダーに購読させるためのアドレスを作る・作り直す・やめる。アドレスは作った直後の画面に1度だけ表示する。
- 前提：`integration:ical-export-feed`（`src/components/settings/Feed.tsx:6`）

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0642 | 配信するのは枠・自分の予定・出る授業で、Google の予定は入れない △ | `rule:ical/feed-content-scope` | `src/components/settings/Feed.tsx:53-56` |  |
| BR-0643 | 配信をやめてもアプリの中の予定は消えない | `rule:ical/feed-stop-keeps-app-events` | `src/components/settings/Feed.tsx:84-102` |  |
| BR-0644 | 配信アドレスは作った直後にだけ表示する | `rule:ical/feed-url-shown-once` | `src/components/settings/Feed.tsx:62-74` |  |

#### FR-190 iCal の予定を取り込んで1回ずつに展開する

- ノード：`feature:ical/import-parse`　出典：`src/lib/ical/import.ts:43-93`
- Google カレンダーなどの iCal テキストから、指定の期間と重なる予定を取り出し、開始の早い順の予定にする。
- 前提：`integration:ical-import`（`src/lib/ical/import.ts:43-93`）

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0645 | キャンセルされた予定は取り込まない | `rule:ical/import-cancelled-skipped` | `src/lib/ical/import.ts:41` |  |
| BR-0646 | 除外日と個別に変更した回を反映する | `rule:ical/import-exceptions` | `src/lib/ical/import.ts:57-63` |  |
| BR-0647 | 繰り返しの予定は1回ずつに展開する | `rule:ical/import-expand-recurring` | `src/lib/ical/import.ts:75-82` | `setting:ical/max-occurrences` |
| BR-0648 | 終日・タイムゾーンのない時刻は日本時間の壁時計として読む | `rule:ical/import-local-wall-clock` | `src/lib/ical/import.ts:16-27` |  |
| BR-0649 | 元の日時が範囲より後でも、移した先が範囲内なら取り込む | `rule:ical/import-moved-later-occurrence` | `src/lib/ical/import.ts:83-90` |  |
| BR-0650 | 指定の期間と重なる予定だけを取り込む | `rule:ical/import-range-overlap` | `src/lib/ical/import.ts:66` |  |
| BR-0651 | タイトルがなければ「（タイトルなし）」にし、場所・説明も取り込む | `rule:ical/import-untitled-and-details` | `src/lib/ical/import.ts:29-39` |  |

| ID | 設定・調整値 | 値 | ノード | 出典 |
|---|---|---|---|---|
| ST-098 | 1つの繰り返しの予定を展開する回数の上限（20000回） | 20000 | `setting:ical/max-occurrences` | `src/lib/ical/import.ts:5-6` |

#### FR-191 サーバーで iCal を安全に取りに行く

- ノード：`feature:ical/server-fetch`　出典：`src/lib/ical/fetch.ts:7-51`
- 登録された iCal の URL をサーバーから取得する。許可した配信元だけに接続し、失敗時は画面に出せる日本語の理由を返す（URL は含めない）。
- 前提：`integration:ical-import`（`src/lib/ical/fetch.ts:7-51`）

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0652 | 取り込みの失敗理由に URL を含めない | `rule:ical/fetch-error-hides-url` | `src/lib/ical/fetch.ts:7` |  |
| BR-0653 | 転送は自分でたどり、行く前に許可した配信元か確かめる | `rule:ical/fetch-follow-redirects-manually` | `src/lib/ical/fetch.ts:11-43` | `setting:ical/fetch-max-redirects` |
| BR-0654 | Google のログイン画面へ転送されたら非公開アドレスを確かめるよう案内する | `rule:ical/fetch-google-login-hint` | `src/lib/ical/fetch.ts:33-37` |  |
| BR-0655 | 大きすぎる iCal は取り込まない | `rule:ical/fetch-size-limit` | `src/lib/ical/fetch.ts:47-49` | `setting:ical/fetch-max-bytes` |

| ID | 設定・調整値 | 値 | ノード | 出典 |
|---|---|---|---|---|
| ST-099 | 取り込める iCal の大きさの上限（5MB） | 5 * 1024 * 1024 | `setting:ical/fetch-max-bytes` | `src/lib/ical/fetch.ts:3` |
| ST-100 | 転送をたどる最大回数（3回） | 3 | `setting:ical/fetch-max-redirects` | `src/lib/ical/fetch.ts:5` |
| ST-101 | iCal の取得のタイムアウト（10秒） | 10000 | `setting:ical/fetch-timeout-ms` | `src/lib/ical/fetch.ts:4` |

#### FR-192 iCal の取り込み元の登録と管理

- ノード：`feature:ical/source-list`　出典：`src/components/settings/CalendarSources.tsx:54-122`
- iCal の非公開アドレスを名前つきで登録し、一覧で取り込みの結果（取り込み時刻と件数、または失敗の理由）を確かめ、削除や「今すぐ取り込む」ができる。
- 前提：`integration:ical-import`（`src/components/settings/CalendarSources.tsx:7`）

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0656 | 「今すぐ取り込む」は取り込み元があるときだけ出し、取り込み中は押せない | `rule:ical/import-now-visible-when-sources` | `src/components/settings/CalendarSources.tsx:114-118` |  |
| BR-0657 | 取り込み元を削除すると取り込んだ予定もカレンダーから消える | `rule:ical/source-remove-deletes-events` | `src/components/settings/CalendarSources.tsx:100-108` |  |
| BR-0658 | 取り込み元の状態は失敗理由・最終取り込み時刻と件数・未取り込みで示す | `rule:ical/source-status-display` | `src/components/settings/CalendarSources.tsx:88-93` |  |
| BR-0659 | 非公開アドレスはパスワード管理に保存されない普通の欄で受け取る | `rule:ical/source-url-plain-input` | `src/components/settings/CalendarSources.tsx:38-48` |  |

#### FR-193 取り込み元の URL の確認

- ノード：`feature:ical/source-validation`　出典：`src/lib/ical/source.ts:4-18`
- 入力された iCal の URL を確かめ、取りに行ける https の URL にする。許可していない配信元は取り込めない。

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0660 | 許可した配信元の https だけを受け付ける | `rule:ical/source-https-allowlist-only` | `src/lib/ical/source.ts:1-18` | `setting:ical/allowed-hosts` |

| ID | 設定・調整値 | 値 | ノード | 出典 |
|---|---|---|---|---|
| ST-102 | 取り込める iCal の配信元（Google・iCloud） | calendar.google.com, *.icloud.com | `setting:ical/allowed-hosts` | `src/lib/ical/source.ts:1-2` |

#### FR-194 取り込む iCal の登録・削除・取り込みの実行（画面用）

- ノード：`feature:ical/sources-registry`　出典：`src/lib/sync/ical.ts:5-55`
- 取り込むカレンダーの一覧・登録・削除と、期間を指定したサーバー取り込みの呼び出し。画面には URL を渡さず、登録するときに1回送るだけ。
- 前提：`integration:supabase-db`（`src/lib/sync/ical.ts:22-44`）、`integration:ical-import`（`src/lib/sync/ical.ts:46-55`）

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0661 | 登録時に URL を確かめ、形が正しくなければ理由を示す | `rule:ical/add-validates-url` | `src/lib/sync/ical.ts:33-39` |  |
| BR-0662 | 取り込み元の URL は画面で扱わない | `rule:ical/url-hidden-from-screen` | `src/lib/sync/ical.ts:5-31` |  |

#### FR-195 登録した iCal をすべて取り込む（API）

- ノード：`feature:ical/sync-endpoint`　出典：`src/app/api/ical/sync/route.ts:9-42`
- 本人を確かめたあと、サーバーが DB から URL を読み、すべての iCal を読み取って予定の一覧と結果（件数・エラー）を返す。
- 前提：`integration:supabase-auth`（`src/app/api/ical/sync/route.ts:20`）、`integration:supabase-db`（`src/app/api/ical/sync/route.ts:24`）、`integration:ical-import`（`src/app/api/ical/sync/route.ts:31`）

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0663 | iCal の取り込みはログイン中の本人だけ（未ログインは401） | `rule:auth/ical-sync-requires-login` | `src/app/api/ical/sync/route.ts:20-21` |  |
| BR-0664 | 取り込みに失敗した元は、前回の結果で補って組み直す | `rule:ical/last-events-fallback` | `supabase/migrations/0008_ical_last_events.sql:1-4` |  |
| BR-0665 | 1つの取り込みに失敗しても、ほかは続ける | `rule:ical/sync-continue-on-failure` | `src/app/api/ical/sync/route.ts:27-40` |  |
| BR-0666 | 取り込む期間の既定は、今から8日前〜16日先 | `rule:ical/sync-default-window` | `src/app/api/ical/sync/route.ts:13-18` |  |
| BR-0667 | 取り込める iCal の URL は Google カレンダーと iCloud の https だけ | `rule:ical/url-allowlist` | `supabase/migrations/0002_ical_sources.sql:8-10` |  |
| BR-0668 | iCal の非公開 URL は画面（ブラウザ）から読めない | `rule:ical/url-hidden-from-browser` | `supabase/migrations/0006_private_ical_url_and_server_time.sql:1-7` |  |

#### FR-196 取り込んだ予定の移動時間を聞く

- ノード：`feature:ical/travel-ask`　出典：`src/lib/mock/state.ts:703-719`
- 場所のない取り込み予定は「家にいる」扱いになるので、移動時間を聞き、答えがあればそれを使う。

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0669 | 取り込んだ予定は、自分で付けた移動時間があればそれを使う | `rule:ical/imported-travel-override` | `src/lib/mock/state.ts:487-495` |  |
| BR-0670 | 移動時間を聞くのは、場所も移動のメモもなく、まだ答えていない7日先までの時刻つきの予定 | `rule:ical/travel-ask-conditions` | `src/lib/mock/state.ts:703-719` |  |

### FR-197 Notion の締切の取り込み

- ノード：`feature:notion`　出典：`src/lib/mock/notion.ts:1-77`


| ID | 設定・調整値 | 値 | ノード | 出典 |
|---|---|---|---|---|
| ST-103 | 取り込まない段階 | — | `setting:notion/ignore-stages` | `src/lib/mock/notion.ts:24` |
| ST-104 | 段階ごとの目安の時間 | — | `setting:notion/stage-minutes` | `src/lib/mock/notion.ts:37-56` |

#### FR-198 Notion の行を締切のタスクにして取り込む（一方向）

- ノード：`feature:notion/apply-rows`　出典：`src/lib/mock/notion.ts:16-66`
- Notion の表の行から「企業名 段階」というタスクを作り、既存の取り込み済みタスクは名前と締切だけ直す。Notion からアプリへの一方向だけ。
- 前提：`integration:notion-api`（`src/lib/mock/notion.ts:2`）

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0671 | 取り込んだタスクの作業の種類は基本「集中」 | `rule:notion/default-focus-tag` | `src/lib/mock/notion.ts:39-41` |  |
| BR-0672 | 表から消えた行のタスクは外す | `rule:notion/drop-vanished-rows` | `src/lib/mock/notion.ts:42-45` |  |
| BR-0673 | 取り込んだ締切は動かせない締切にする △ | `rule:notion/fixed-deadline` | `src/lib/mock/notion.ts:48` |  |
| BR-0674 | 取り込み済みのタスクは名前と締切だけ直し、アプリで足した所要時間は残す | `rule:notion/keep-app-edits` | `src/lib/mock/notion.ts:46-57` |  |
| BR-0675 | 名前・日付がない行、取り込まない段階、過ぎた締切、完了・削除した段階は入れない | `rule:notion/skip-rows` | `src/lib/mock/notion.ts:29-36` |  |
| BR-0676 | 段階が変わったら前の段階の残り時間を使わない | `rule:notion/stage-change-resets-remaining` | `src/lib/mock/notion.ts:49-50` |  |
| BR-0677 | タスク名は「企業名 段階」 | `rule:notion/title-with-stage` | `src/lib/mock/notion.ts:34-35` |  |

#### FR-199 Notion の締切の自動の取り込み

- ノード：`feature:notion/auto-import`　出典：`src/components/app/AppShell.tsx:136-154`
- Notion の列が選ばれていれば、開いたときと30分ごとに表の行を取り込み、タスクに反映する。
- 前提：`integration:notion-api`（`src/components/app/AppShell.tsx:146-147`）

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0678 | Notion を読めなければ前のタスクのままにする | `rule:notion/failure-keeps-tasks` | `src/components/app/AppShell.tsx:148-149` |  |
| BR-0679 | Notion は日付の列を選んであり、30分以上たったときだけ取り込む | `rule:notion/import-conditions` | `src/components/app/AppShell.tsx:141-154` |  |

#### FR-200 Notion の表の読み方

- ノード：`feature:notion/column-config`　出典：`src/lib/mock/model.ts:119-131`
- 表のどの列を締切・段階として読むか、段階ごとにタスクにするか、取り込んだタスクを消したかを持つ。

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0680 | アプリで消した取り込みのタスクは、同じ段階のあいだは取り込み直さない | `rule:notion/dismissed-not-reimported` | `src/lib/mock/model.ts:125-127` |  |
| BR-0681 | 取り込まない段階に書いたもの以外はタスクにする | `rule:notion/ignore-stages` | `src/lib/mock/model.ts:121-122` |  |
| BR-0682 | 段階ごとの目安の作業時間を、取り込んだタスクの所要時間にする | `rule:notion/stage-minutes` | `src/lib/mock/model.ts:123-125` |  |
| BR-0683 | Notion の設定は締切の列があるときだけ読み、正の目安時間だけ残す | `rule:sync/notion-config-valid` | `src/lib/mock/state.ts:375-387` |  |

| ID | 設定・調整値 | 値 | ノード | 出典 |
|---|---|---|---|---|
| ST-105 | Notion の列の選び方 | — | `setting:notion/column-mapping` | `src/lib/mock/model.ts:119-129` |
| ST-106 | Notion から取り込んだタスクの ID の頭 | notion- | `setting:notion/task-id-prefix` | `src/lib/mock/model.ts:130-131` |

#### FR-201 Notion の連携設定

- ノード：`feature:notion/connection-settings`　出典：`src/components/settings/Notion.tsx:28-287`
- Notion の連携の合言葉と表のアドレスを登録し、締切の列・段階の列を選び、段階ごとにタスクとして取り込むか・目安の時間を決め、同期や登録の解除を行う。
- 前提：`integration:notion-api`（`src/components/settings/Notion.tsx:17-25`）

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0684 | 段階ごとに「タスク」か「入れない」を選べる | `rule:notion/ignore-stage` | `src/components/settings/Notion.tsx:186-213` |  |
| BR-0685 | 「同期する」で読んだ行をタスクに反映し件数を表示する | `rule:notion/manual-sync-applies-rows` | `src/components/settings/Notion.tsx:73-80` |  |
| BR-0686 | Notion の登録をやめると取り込んだタスクも外す | `rule:notion/remove-deletes-imported-tasks` | `src/components/settings/Notion.tsx:256-284` |  |
| BR-0687 | 同期は締切の列を選んでからでないとできない | `rule:notion/sync-needs-date-column` | `src/components/settings/Notion.tsx:165-255` |  |
| BR-0688 | 連携の合言葉は伏せ字で受け取り、登録したら欄を空にする | `rule:notion/token-input-masked` | `src/components/settings/Notion.tsx:63-132` |  |

| ID | 設定・調整値 | 値 | ノード | 出典 |
|---|---|---|---|---|
| ST-107 | 締切の列と段階の列の選択 | — | `setting:notion/column-choice` | `src/components/settings/Notion.tsx:150-181` |

#### FR-202 Notion の日付を締切の時刻にする

- ノード：`feature:notion/deadline-parse`　出典：`src/lib/mock/notion.ts:6-14`
- Notion の日付の値を締切の時刻に変える。

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0689 | 日付だけの締切はその日の終わり（翌日0時） | `rule:notion/date-only-end-of-day` | `src/lib/mock/notion.ts:7-14` |  |

#### FR-203 取り込んだタスクを消したとき、同じ段階では取り込み直さない

- ノード：`feature:notion/delete-task`　出典：`src/lib/mock/notion.ts:70-77`
- Notion から取り込んだタスクを消すと、同じ段階のあいだは取り込み直さない。次の段階に進んだら、また取り込む。ふつうのタスクはそのまま消す。

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0690 | 消した記録は、表にその段階の行があるあいだだけ残す | `rule:notion/dismissed-until-stage-changes` | `src/lib/mock/notion.ts:64-65` |  |

#### FR-204 本人の Notion の合言葉と表の ID を読む

- ノード：`feature:notion/own-source`　出典：`src/lib/notion/source.ts:4-23`
- ログイン中の本人であることを確かめてから、画面から読めない合言葉の列を secret key で読む。取り込みの結果（最後の取得時刻・エラー）を記録する。
- 前提：`integration:supabase-auth`（`src/lib/notion/source.ts:9-11`）、`integration:supabase-db`（`src/lib/notion/source.ts:12`）

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0691 | ログインなし・未登録・読み込み失敗を分けて返す | `rule:notion/own-source-errors` | `src/lib/notion/source.ts:11-14` |  |
| BR-0692 | 取り込みの成功は時刻を更新してエラーを消し、失敗はエラーを残す | `rule:notion/record-fetch-status` | `src/lib/notion/source.ts:18-23` |  |

#### FR-205 Notion の表の列と行を読む

- ノード：`feature:notion/read-table`　出典：`src/lib/notion/api.ts:1-89`
- Notion の表から、タイトル・日付・段階（セレクト／ステータス）の列と、行ごとの締切と段階を読む。サーバーだけで使い、合言葉は画面に出さない。Notion からアプリへの一方向。
- 前提：`integration:notion-api`（`src/lib/notion/api.ts:1-18`）

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0693 | 合言葉違い・表なしなどを日本語で伝える | `rule:notion/api-error-messages` | `src/lib/notion/api.ts:14-16` |  |
| BR-0694 | 選んだ列が表から消えたときはエラーにして、前のタスクを消させない | `rule:notion/missing-column-keeps-tasks` | `src/lib/notion/api.ts:55-58` |  |
| BR-0695 | 表の行は最大1000行まで。超えたらエラー | `rule:notion/row-limit-1000` | `src/lib/notion/api.ts:51-85` |  |
| BR-0696 | 表の列はタイトル・日付・セレクトとステータスを分けて拾う | `rule:notion/schema-columns` | `src/lib/notion/api.ts:28-39` |  |
| BR-0697 | アーカイブ・ごみ箱の行は読まない | `rule:notion/skip-archived-rows` | `src/lib/notion/api.ts:65` |  |

| ID | 設定・調整値 | 値 | ノード | 出典 |
|---|---|---|---|---|
| ST-108 | Notion API 呼び出しのタイムアウト（15秒） | 15000 | `setting:notion/api-timeout` | `src/lib/notion/api.ts:12` |
| ST-109 | Notion API のバージョン（2022-06-28） | 2022-06-28 | `setting:notion/api-version` | `src/lib/notion/api.ts:3-4` |

#### FR-206 Notion の表を登録して取り込む（画面用）

- ノード：`feature:notion/register`　出典：`src/lib/sync/notion.ts:5-49`
- 合言葉と表のアドレスを登録（前の登録は置き換え）・削除し、表の列と行をサーバー経由で取得する。
- 前提：`integration:notion-api`（`src/lib/sync/notion.ts:47-49`）、`integration:supabase-db`（`src/lib/sync/notion.ts:24-38`）

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0698 | 表のアドレスか ID から32桁の ID を取り出す | `rule:notion/parse-database-id` | `src/lib/notion/id.ts:1-6` |  |
| BR-0699 | 表のアドレスが読めない・合言葉が短すぎる登録は受け付けない | `rule:notion/register-validation` | `src/lib/sync/notion.ts:23-33` |  |
| BR-0700 | 合言葉は登録するときに1回送るだけで、読み出さない | `rule:notion/token-write-only` | `src/lib/sync/notion.ts:5-21` |  |

#### FR-207 Notion の表の行を読む（API）

- ノード：`feature:notion/rows-endpoint`　出典：`src/app/api/notion/sync/route.ts:4-22`
- 選んだ締切の列（と段階の列）に従って、行の ID・タイトル・締切・段階を返す。
- 前提：`integration:notion-api`（`src/app/api/notion/sync/route.ts:14`）

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0701 | 締切の列が選ばれていなければ400 | `rule:notion/date-column-required` | `src/app/api/notion/sync/route.ts:9-10` |  |
| BR-0702 | Notion から読めなかったら、理由を記録して502を返す | `rule:notion/error-recorded-and-502` | `src/app/api/notion/sync/route.ts:13-21` |  |
| BR-0703 | 連携が登録されていなければ、本人の確認結果のエラーをそのまま返す △ | `rule:notion/source-required` | `src/app/api/notion/sync/route.ts:11-12` |  |

#### FR-208 Notion の表の列を読む（API）

- ノード：`feature:notion/schema-endpoint`　出典：`src/app/api/notion/schema/route.ts:4-15`
- 登録した表のタイトル・日付・段階の列とその選択肢を返す。合言葉は返さない。
- 前提：`integration:notion-api`（`src/app/api/notion/schema/route.ts:9`）

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0704 | Notion の合言葉は画面に返さない | `rule:notion/never-return-token` | `src/app/api/notion/schema/route.ts:4-9` |  |
| BR-0705 | Notion の連携は1人1つで、合言葉は20〜200文字・表の ID は32桁の16進 | `rule:notion/source-constraints` | `supabase/migrations/0005_notion_sources.sql:5-13` |  |
| BR-0706 | Notion の合言葉は画面から読めない（登録・作り直し・削除はできる） | `rule:notion/token-hidden-from-browser` | `supabase/migrations/0005_notion_sources.sql:38-41` |  |

### FR-209 ヘルスケアの睡眠の取り込み

- ノード：`feature:health-sleep`　出典：`src/lib/health/sleep.ts:1-159`


#### FR-210 ヘルスケアの睡眠の自動の読み込み

- ノード：`feature:health-sleep/auto-read`　出典：`src/components/app/AppShell.tsx:156-190`
- ショートカットが送った夜ごとの睡眠のまとめを、開いたときと画面に戻ってきたときに読み、60日ぶんを残す。
- 前提：`integration:apple-shortcuts-health`（`src/components/app/AppShell.tsx:156`）

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0707 | ショートカットを動かして戻ったらすぐ読み、8秒後にもう一度読む | `rule:health-sleep/force-read-after-shortcut` | `src/components/app/AppShell.tsx:175-182` |  |
| BR-0708 | 睡眠の記録は60日ぶんだけ残し、変わらなければ更新しない | `rule:health-sleep/keep-60-days` | `src/components/app/AppShell.tsx:163-169` |  |
| BR-0709 | 睡眠は10分に1回まで読む | `rule:health-sleep/read-throttle` | `src/components/app/AppShell.tsx:160-164` |  |

#### FR-211 保存された夜ごとの睡眠を画面とサーバーで同じ形に戻す

- ノード：`feature:health-sleep/load-nights`　出典：`src/lib/health/sleep.ts:152-159`
- health_sleep の行（起きた日・眠り始め・終わり・眠った分）を、起きた日ごとのまとめに変換する。画面とサーバーの両方で使う。
- 前提：`integration:supabase-db`（`src/lib/health/sleep.ts:152-159`）

#### FR-212 ヘルスケアの睡眠の夜ごとのまとめ

- ノード：`feature:health-sleep/nightly-summary`　出典：`src/lib/mock/model.ts:241-248`
- iPhone のショートカットが送り、サーバーがまとめた睡眠を、起きた日ごとの寝ついた時刻・起きた時刻・眠った分として持つ。
- 前提：`integration:apple-shortcuts-health`（`src/lib/mock/model.ts:241`）

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0710 | 「眠り」の記録だけ数え、重なりは1回ぶんにする | `rule:health-sleep/asleep-only-and-overlap-merge` | `src/lib/health/sleep.ts:130-131` |  |
| BR-0711 | 眠った時間は途中で目が覚めた時間を除く | `rule:health-sleep/minutes-exclude-awake` | `src/lib/mock/model.ts:245-247` |  |
| BR-0712 | 2時間より短い眠り（昼寝）は夜にしない | `rule:health-sleep/nap-not-a-night` | `src/lib/health/sleep.ts:143-145` | `setting:health-sleep/min-night-minutes` |
| BR-0713 | 夜は起きた日に付け、同じ日はいちばん長い眠りを残す | `rule:health-sleep/night-is-wake-day-longest` | `src/lib/health/sleep.ts:145-148` |  |
| BR-0714 | 起きていた時間が短ければ同じ眠りの続き（寝ついた時刻を後ろにずらさない） | `rule:health-sleep/short-wake-same-sleep` | `src/lib/health/sleep.ts:132-141` | `setting:health-sleep/session-gap-minutes` |
| BR-0715 | ヘルスケアの睡眠は3つの値が有限の数のものだけ読む | `rule:health-sleep/valid-numbers-only` | `src/lib/mock/state.ts:349-356` |  |

| ID | 設定・調整値 | 値 | ノード | 出典 |
|---|---|---|---|---|
| ST-110 | 夜とみなす最短の眠り（120分） | 120 | `setting:health-sleep/min-night-minutes` | `src/lib/health/sleep.ts:32-33` |
| ST-111 | 眠りを分ける起きていた時間（150分） | 150 | `setting:health-sleep/session-gap-minutes` | `src/lib/health/sleep.ts:34-38` |

#### FR-213 ショートカットが送る睡眠の記録を読み取る

- ノード：`feature:health-sleep/parse-body`　出典：`src/lib/health/sleep.ts:83-126`
- iPhone のショートカットが送る「開始\|終了\|値」の行（JSON の lines・samples、そのままの文字）を睡眠の記録の並びにし、読めない行は捨てる。
- 前提：`integration:apple-shortcuts-health`（`src/lib/health/sleep.ts:5-8`）

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0716 | 午前・午後・AM・PM の書き方も読む | `rule:health-sleep/12-hour-notation` | `src/lib/health/sleep.ts:50-53` |  |
| BR-0717 | 本文は JSON の lines・samples・生の行のどれでも読み、区切りは「\|」「｜」タブ | `rule:health-sleep/body-formats` | `src/lib/health/sleep.ts:88-126` |  |
| BR-0718 | 時刻のない日付だけの値は読まない | `rule:health-sleep/date-without-time-rejected` | `src/lib/health/sleep.ts:47-48` |  |
| BR-0719 | 終了が開始以前・24時間を超える・読めない記録は捨てる | `rule:health-sleep/drop-invalid-samples` | `src/lib/health/sleep.ts:74-80` |  |
| BR-0720 | タイムゾーンのない時刻は日本時間として読む | `rule:health-sleep/time-without-zone-is-jst` | `src/lib/health/sleep.ts:44-58` |  |
| BR-0721 | 睡眠の値を「眠り・覚醒・ベッド」に分ける | `rule:health-sleep/value-classification` | `src/lib/health/sleep.ts:60-72` |  |

| ID | 設定・調整値 | 値 | ノード | 出典 |
|---|---|---|---|---|
| ST-112 | 一度に読む睡眠の記録の上限（5000件） | 5000 | `setting:health-sleep/max-samples` | `src/lib/health/sleep.ts:30-31` |

##### FR-214 読めなかったときの手がかりを返す

- ノード：`feature:health-sleep/inspect-unread`　出典：`src/lib/health/sleep.ts:87-126`
- 何行届いて何件読めたか、読めなかった最初の行（120字まで）、JSON のキーを返し、ショートカットの作りを直す手がかりにする。

#### FR-215 ヘルスケアの睡眠を受け取り、夜ごとに保存する（API）

- ノード：`feature:health-sleep/receive-endpoint`　出典：`src/app/api/health/sleep/route.ts:12-66`
- ショートカットが送った睡眠の行を読み、夜ごとのまとめにして health_sleep へ保存し、通知の一覧も組み直す。
- 前提：`integration:apple-shortcuts-health`（`src/app/api/health/sleep/route.ts:12-17`）、`integration:supabase-db`（`src/app/api/health/sleep/route.ts:23-41`）

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0722 | 睡眠のまとめは本人は読むだけ、書くのはサーバー | `rule:auth/health-sleep-read-only-for-user` | `supabase/migrations/0007_health_sleep.sql:1-3` |  |
| BR-0723 | ヘルスケアの受け口は、形の合わない合言葉を DB に触れる前に401 | `rule:auth/health-token-checked-before-db` | `src/app/api/health/sleep/route.ts:18-26` |  |
| BR-0724 | 本文は300000文字まで。超えたら413 | `rule:health-sleep/body-size-limit` | `src/app/api/health/sleep/route.ts:6-21` | `setting:health-sleep/max-body` |
| BR-0725 | 睡眠のまとめは起きた日ごとに1行・時刻と分の範囲を制約 | `rule:health-sleep/night-row-constraints` | `supabase/migrations/0007_health_sleep.sql:34-45` |  |
| BR-0726 | 睡眠が届いたら通知の一覧をすぐ組み直す。失敗しても受け取りは成功 | `rule:health-sleep/replan-after-receipt` | `src/app/api/health/sleep/route.ts:44-53` |  |
| BR-0727 | 応答に、受け取った夜・読めた数・読めなかった最初の行を載せる | `rule:health-sleep/response-diagnostics` | `src/app/api/health/sleep/route.ts:54-65` |  |
| BR-0728 | 保存に失敗したら500 | `rule:health-sleep/save-error-500` | `src/app/api/health/sleep/route.ts:42` |  |
| BR-0729 | 書くのは health_sleep と通知の一覧だけ。app_state は書かない | `rule:health-sleep/write-scope` | `src/app/api/health/sleep/route.ts:12-16` |  |

| ID | 設定・調整値 | 値 | ノード | 出典 |
|---|---|---|---|---|
| ST-113 | 受け取る本文の上限（300000） | 300000 | `setting:health-sleep/max-body` | `src/app/api/health/sleep/route.ts:7` |
| ST-114 | ヘルスケアの合言葉（43文字） △ | — | `setting:health-sleep/token-setup` | `src/app/api/health/sleep/route.ts:18-19` |

#### FR-216 アプリを開いたときにショートカット「睡眠を送る」を動かす

- ノード：`feature:health-sleep/shortcut-launch`　出典：`src/lib/sync/health.ts:40-60`
- iPhone はロック中にヘルスケアを読めないので、アプリを開いているときにショートカットを呼べるようにする。動かしたことを覚え、戻ってきたら間をあけず読み直す。
- 前提：`integration:apple-shortcuts-health`（`src/lib/sync/health.ts:40-41`）、`integration:browser-storage`（`src/lib/sync/health.ts:42-60`）

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0730 | ショートカットを動かして10分以内の戻りだけ、すぐ読み直す（1回だけ） | `rule:health-sleep/asked-within-10-minutes` | `src/lib/sync/health.ts:42-60` |  |

| ID | 設定・調整値 | 値 | ノード | 出典 |
|---|---|---|---|---|
| ST-115 | 呼び出すショートカットの名前（睡眠を送る） | 睡眠を送る | `setting:health-sleep/shortcut-name` | `src/lib/sync/health.ts:40-41` |

#### FR-217 ヘルスケア取り込みの合言葉の発行・停止

- ノード：`feature:health-sleep/token`　出典：`src/lib/sync/health.ts:11-31`
- 設定画面から睡眠を送るための合言葉を作る（前の合言葉は使えなくなる）、停止する、登録済みか確かめる。合言葉はサーバーに SHA-256 だけを保存し、作ったときにしか画面に出さない。
- 前提：`integration:supabase-db`（`src/lib/sync/health.ts:18-26`）

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0731 | ショートカットの合言葉は32バイトの base64url（43文字） | `rule:health-sleep/token-format` | `src/lib/health/sleep.ts:28-29` |  |
| BR-0732 | 合言葉は SHA-256 だけ保存し、再発行すると前のものは使えない | `rule:health-sleep/token-hash-only` | `src/lib/sync/health.ts:17-26` |  |

#### FR-218 睡眠の取り込みの合言葉の管理

- ノード：`feature:health-sleep/token-settings`　出典：`src/components/settings/Health.tsx:10-122`
- iPhone のショートカットからヘルスケアの睡眠を送るための合言葉を作る・作り直す・やめる。送り先 URL と Authorization の値を一度だけ表示し、最後に届いた夜の時刻と睡眠時間を確かめられる。
- 前提：`integration:apple-shortcuts-health`（`src/components/settings/Health.tsx:9`）

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0733 | 最後に届いた夜の寝ついた時刻・起きた時刻・睡眠時間を表示する | `rule:health-sleep/show-last-night` | `src/components/settings/Health.tsx:53-69` |  |
| BR-0734 | 取り込みをやめるとショートカットから送っても受け取らなくなる | `rule:health-sleep/stop-import-rejects` | `src/components/settings/Health.tsx:101-119` |  |
| BR-0735 | 合言葉を作り直すと今の合言葉は使えなくなる | `rule:health-sleep/token-regenerate-invalidates-old` | `src/components/settings/Health.tsx:29-41` |  |
| BR-0736 | 合言葉は作った直後にだけ表示する | `rule:health-sleep/token-shown-once` | `src/components/settings/Health.tsx:70-92` |  |

### FR-219 天気と雨の日

- ノード：`feature:weather`　出典：`src/lib/weather/openMeteo.ts:1-46`


#### FR-220 天気予報の自動の取り直し

- ノード：`feature:weather/auto-refresh`　出典：`src/components/app/AppShell.tsx:114-134`
- 場所が設定されていれば、開いたときと一定間隔ごとに雨の確率を取り直して保存する。
- 前提：`integration:open-meteo`（`src/components/app/AppShell.tsx:126-127`）

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0737 | 天気を取れなければ前の予報のままにする | `rule:weather/failure-keeps-previous` | `src/components/app/AppShell.tsx:128-129` |  |
| BR-0738 | 天気は場所があり同期が済んでいて、間隔が空いたときだけ取る | `rule:weather/refresh-conditions` | `src/components/app/AppShell.tsx:121-134` |  |

| ID | 設定・調整値 | 値 | ノード | 出典 |
|---|---|---|---|---|
| ST-116 | 天気予報を取り直す間隔（3時間） | 10800000 | `setting:weather/refresh-interval` | `src/components/app/AppShell.tsx:32` |

#### FR-221 天気の場所と予報の保存

- ノード：`feature:weather/place-and-forecast`　出典：`src/lib/mock/model.ts:133-137`
- 設定で選んだ場所（名前・緯度・経度）と、最後に取った予報（日付ごとの雨の確率の最大）を保存する。

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0739 | 天気の場所と予報は形が正しいものだけ読む | `rule:sync/weather-shape-check` | `src/lib/mock/state.ts:388-398` |  |

| ID | 設定・調整値 | 値 | ノード | 出典 |
|---|---|---|---|---|
| ST-117 | 天気を取る場所 | — | `setting:weather/place` | `src/lib/mock/model.ts:296-297` |

#### FR-222 天気の場所を市区町村の名前から探す

- ノード：`feature:weather/place-search`　出典：`src/lib/weather/openMeteo.ts:10-19`
- Open-Meteo の検索で、市区町村名から候補の場所（最大5件、都道府県などつき）を出す。
- 前提：`integration:open-meteo`（`src/lib/weather/openMeteo.ts:14-15`）

#### FR-223 天気の場所と雨の確率の確認

- ノード：`feature:weather/place-settings`　出典：`src/components/settings/Weather.tsx:11-80`
- 天気予報の場所を市区町村名で検索して選び、今後7日間の雨の確率と「雨」の判定を確かめる。
- 前提：`integration:open-meteo`（`src/components/settings/Weather.tsx:8`）

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0740 | 場所を変える・やめると予報を消して取り直す | `rule:weather/place-change-resets-forecast` | `src/components/settings/Weather.tsx:26-40` |  |
| BR-0741 | 雨の確率が閾値以上の日には「雨」と表示する | `rule:weather/rain-label-at-threshold` | `src/components/settings/Weather.tsx:69-74` | `setting:weather/rain-threshold` |

#### FR-224 場所ごとの日ごとの雨の確率を取る

- ノード：`feature:weather/rain-chance`　出典：`src/lib/weather/openMeteo.ts:37-46`
- Open-Meteo から16日分の時間ごとの雨の確率を取り、日付（日本時間）ごとの活動する時間帯の最大％にする。
- 前提：`integration:open-meteo`（`src/lib/weather/openMeteo.ts:38-46`）

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0742 | 1日の雨の確率は活動する時間帯の最大値 | `rule:weather/daily-max-in-active-hours` | `src/lib/weather/openMeteo.ts:24-35` | `setting:weather/active-hours` |
| BR-0743 | 予報は16日分を日本時間で取る | `rule:weather/forecast-16-days` | `src/lib/weather/openMeteo.ts:37-41` |  |

| ID | 設定・調整値 | 値 | ノード | 出典 |
|---|---|---|---|---|
| ST-118 | 雨を数える活動する時間帯（6時〜22時） | { from: 6, to: 22 } | `setting:weather/active-hours` | `src/lib/weather/openMeteo.ts:21-22` |

#### FR-225 雨の日の判定

- ノード：`feature:weather/rainy-days`　出典：`src/lib/mock/state.ts:724-732`
- 手で雨にした日と、予報の雨の確率が閾値以上の日を雨の日とし、晴れたので戻した日は除く。

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0744 | 雨の日は、手で雨にした日と予報の雨の確率が閾値以上の日から、戻した日を除く | `rule:weather/rainy-day-keys` | `src/lib/mock/state.ts:724-732` | `setting:weather/rain-threshold` |
| BR-0745 | 24時間より古い予報は使わない † | `rule:weather/stale-forecast-ignored` | `src/lib/mock/state.ts:726-727` | `setting:weather/forecast-fresh-ms` |

| ID | 設定・調整値 | 値 | ノード | 出典 |
|---|---|---|---|---|
| ST-119 | 予報を使う鮮度の上限（24時間） | 86400000 | `setting:weather/forecast-fresh-ms` | `src/lib/mock/state.ts:721-722` |
| ST-120 | 雨の日にする雨の確率（%） | 60 | `setting:weather/rain-threshold` | `src/lib/mock/model.ts:138-139` |

### FR-226 保存と同期

- ノード：`feature:sync`　出典：`src/lib/sync/remote.ts:1-51`


| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0746 | 見本のデータは保存項目をすべて持ち、保存して読み直しても欠けない △ | `rule:sync/data-keys-complete` | `src/lib/mock/review-2026-10-03.test.ts:10-21` |  |
| BR-0747 | 新しい ID は「接頭辞-時刻（36進）-乱数8桁」 | `rule:sync/new-id-format` | `src/lib/mock/jst.ts:94-100` |  |

| ID | 設定・調整値 | 値 | ノード | 出典 |
|---|---|---|---|---|
| ST-121 | SUPABASE_SECRET_KEY（サーバー専用の鍵） | — | `setting:infra/env-supabase-secret-key` | `.env.example:17-18` |
| ST-122 | NEXT_PUBLIC_SUPABASE_URL（Supabase の接続先） | — | `setting:infra/env-supabase-url` | `.env.example:4-5` |

#### FR-227 全画面共通の枠（読み込み・保存データの用意） △

- ノード：`feature:app/shell-layout`　出典：`src/app/(app)/layout.tsx:3-5`
- (app) 配下の全画面を AppShell で包む。保存データ（localStorage）と画面幅を使うのでブラウザだけで描画する。

#### FR-228 アプリのデータをサーバーに読み書きする

- ノード：`feature:sync/app-state`　出典：`src/lib/sync/remote.ts:4-51`
- Supabase の app_state（ユーザーごとに1行の JSON、version 2）を読み書きし、ログアウトする。保存した時刻を返す。
- 前提：`integration:supabase-db`（`src/lib/sync/remote.ts:27-47`）

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0748 | ログイン中の人の ID は通信せずに保存してあるログインから読む | `rule:sync/current-user-from-stored-session` | `src/lib/sync/remote.ts:19-24` |  |
| BR-0749 | ローカル検証モードではサーバーを読み書きしない | `rule:sync/local-debug-skips-server` | `src/lib/sync/remote.ts:21-37` | `setting:auth/local-debug` |
| BR-0750 | ログインしていないと保存できない | `rule:sync/save-requires-login` | `src/lib/sync/remote.ts:38-39` |  |
| BR-0751 | 保存した時刻を返す △ | `rule:sync/save-returns-server-time` | `src/lib/sync/remote.ts:35-46` |  |

#### FR-229 アプリのデータをユーザーごとに1行（JSON）で持つ

- ノード：`feature:sync/app-state-store`　出典：`supabase/migrations/0001_app_state.sql:1-9`
- user_id を主キーに、データ全体を jsonb で1行に保存する表と、その版・更新時刻。
- 前提：`integration:supabase-db`（`supabase/migrations/0001_app_state.sql:4-9`）

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0752 | app_state はアプリから削除できない | `rule:auth/no-delete-app-state` | `supabase/migrations/0001_app_state.sql:29` |  |
| BR-0753 | どの表も、本人の行しか読み書きできない | `rule:auth/rls-owner-only` | `supabase/migrations/0001_app_state.sql:11-27` |  |
| BR-0754 | ユーザーを消すと、その人の行はすべて消える △ | `rule:sync/cascade-on-user-delete` | `supabase/migrations/0001_app_state.sql:4-9` |  |
| BR-0755 | app_state の保存時刻は端末ではなくサーバーの時計 | `rule:sync/server-clock-updated-at` | `supabase/migrations/0006_private_ical_url_and_server_time.sql:9-24` |  |

#### FR-230 2台・オフラインで変えたときの項目ごとの合わせ方

- ノード：`feature:sync/conflict-merge`　出典：`src/lib/mock/merge.ts:64-83`
- この端末の未送信の変更とサーバー側の変更が重なったとき、項目ごとの指紋で、片方だけの変更はそのまま使い、両方の変更は足した記録を失わないように合わせる。

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0756 | 両方で変えた項目は足した分を両方残す | `rule:sync/merge-both-changed-union` | `src/lib/mock/merge.ts:42-80` |  |
| BR-0757 | 一覧は、数・文字列は和集合、ID か日付のあるものは同じキーでサーバー優先で両方残す | `rule:sync/merge-list-union` | `src/lib/mock/merge.ts:44-55` |  |
| BR-0758 | 適用済みの移行の一覧は、両方を足す | `rule:sync/merge-migrations-union` | `src/lib/mock/merge.ts:79` |  |
| BR-0759 | 前に合わせた記録がなくても、記録を失わない | `rule:sync/merge-no-base-no-loss` | `src/lib/mock/merge.ts:77-80` |  |
| BR-0760 | 片方だけ変えた項目は、その変更を使う | `rule:sync/merge-one-side-changed` | `src/lib/mock/merge.ts:76-78` |  |
| BR-0761 | 辞書は、キーごとに重ね、同じキーはサーバー優先にする | `rule:sync/merge-record-overlay` | `src/lib/mock/merge.ts:56-61` |  |

##### FR-231 項目ごとの指紋

- ノード：`feature:sync/fingerprints`　出典：`src/lib/mock/merge.ts:4-36`
- データの各項目の内容から短い指紋を作り、項目が変わったかを見分ける（2台の合わせ方に使う）。

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0762 | 並びが違っても同じ値なら同じ指紋にする | `rule:sync/fingerprint-order-insensitive` | `src/lib/mock/merge.ts:7-18` |  |

#### FR-232 データの移行

- ノード：`feature:sync/data-migrations`　出典：`src/lib/mock/state.ts:152-274`
- 新しい初期値や設計の変更を、名前を付けた移行として、保存データに1回だけかける。

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0763 | 自己成長・家での運動・朝食が無ければ足し、運動は入浴の直前にする | `rule:sync/migration-add-habits` | `src/lib/mock/state.ts:199-216` |  |
| BR-0764 | 初期値のままの入浴・散歩の時間帯を、起床・就寝からの時間帯に移す | `rule:sync/migration-bath-walk-windows` | `src/lib/mock/state.ts:291-302` |  |
| BR-0765 | 朝ルーティンが前の版のままなら「好きな飲み物を作る」を外す | `rule:sync/migration-drink-step` | `src/lib/mock/state.ts:268-270` |  |
| BR-0766 | 移行は初期値のままのものだけ書き換え、自分で変えたものはそのまま | `rule:sync/migration-initial-only` | `src/lib/mock/state.ts:254-272` |  |
| BR-0767 | 洗濯の「干す」を30分（取り込みも）にし、雨の日を避ける | `rule:sync/migration-laundry` | `src/lib/mock/state.ts:227-234` |  |
| BR-0768 | 朝ルーティン→朝食→散歩の並び、昼食は12時から、自炊は食事の直前に直す | `rule:sync/migration-morning-meals` | `src/lib/mock/state.ts:217-226` |  |
| BR-0769 | データの移行は名前を残し、1回だけかける | `rule:sync/migration-once` | `src/lib/mock/state.ts:197-199` |  |
| BR-0770 | 時限が以前の初期値（9:00から90分）のままなら東大の時限に置き換える | `rule:sync/migration-periods` | `src/lib/mock/state.ts:246-253` |  |
| BR-0771 | 初期の朝ルーティン・楽しみ・場所・授業・起床の額を、聞いた生活に合わせる | `rule:sync/migration-personal-setup` | `src/lib/mock/state.ts:254-267` |  |
| BR-0772 | 散歩・自己成長・片付け・洗濯・自炊・食事・入浴を「記録する」にする（1回だけ） | `rule:sync/migration-track-habits` | `src/lib/mock/state.ts:190-237` |  |
| BR-0773 | 好物だけの楽しみのリストなら、ちょっとした冒険を足したリストにする | `rule:sync/migration-treats` | `src/lib/mock/state.ts:271-272` |  |

#### FR-233 保存データの読み込みと補完

- ノード：`feature:sync/load-and-validate`　出典：`src/lib/mock/state.ts:307-460`
- 保存されたデータを v2 の形として読み、欠けた項目は見本で補い、不正な記録は捨てて、移行をかける。

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0774 | 形が不正な記録は読み込みで捨てる | `rule:sync/drop-invalid-entries` | `src/lib/mock/state.ts:333-458` |  |
| BR-0775 | 欠けている項目は見本のデータで補う | `rule:sync/missing-from-sample` | `src/lib/mock/state.ts:312-330` |  |
| BR-0776 | 保存データは version が 2 のものだけ読む | `rule:sync/version-2-only` | `src/lib/mock/state.ts:308-311` |  |

#### FR-234 古い記録の整理

- ノード：`feature:sync/log-pruning`　出典：`src/lib/mock/state.ts:590-616`
- 上限なく増える日々の記録の古い分を捨て、1行の JSON を小さく保つ。

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0777 | 400日より古い日々の記録を捨てる。何も捨てなければ同じものを返す | `rule:sync/prune-old-logs` | `src/lib/mock/state.ts:593-616` | `setting:sync/log-keep-days` |

| ID | 設定・調整値 | 値 | ノード | 出典 |
|---|---|---|---|---|
| ST-123 | 日ごとの記録を残す日数 | 400 | `setting:sync/log-keep-days` | `src/lib/mock/state.ts:590-591` |

#### FR-235 画面用のデータ保管（useMockStore）

- ノード：`feature:sync/mock-store`　出典：`src/lib/mock/store.ts:186-447`
- 画面が使うデータの保管。ブラウザの控えとサーバーの内容を合わせ、変更のたびに組み直し、保存・取り込み・通知の一覧の送信・元に戻すをまとめて受け持つ。

##### FR-236 取り込み予定の更新

- ノード：`feature:sync/ical-refresh`　出典：`src/lib/mock/store.ts:213-233`
- 登録した iCal カレンダーを取り込み直して、外部予定として計画に反映する。
- 前提：`integration:ical-import`（`src/lib/mock/store.ts:218`）、`feature:ical`（`src/lib/mock/store.ts:218`）

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0778 | 取り込み元が1つもなければ、外部予定は空にする | `rule:sync/import-empty-clears` | `src/lib/mock/store.ts:213` |  |
| BR-0779 | 取り込みに1つでも失敗したら、直前の予定・控え・通知を置き換えない | `rule:sync/import-failure-keeps-previous` | `src/lib/mock/store.ts:219-223` |  |
| BR-0780 | 取り込んだ予定はサーバーの app_state に入れない | `rule:sync/import-not-persisted` | `src/lib/mock/store.ts:225-228` |  |
| BR-0781 | 戻ってきたとき、15分以上たっていれば iCal も取り込み直す | `rule:sync/import-on-visible-after-interval` | `src/lib/mock/store.ts:344` | `setting:sync/import-every` |
| BR-0782 | iCal の取り込み範囲は、8日前から16日先まで | `rule:sync/import-range` | `src/lib/mock/store.ts:218` |  |

| ID | 設定・調整値 | 値 | ノード | 出典 |
|---|---|---|---|---|
| ST-124 | 取り込み直す間隔（15分） | 900000 | `setting:sync/import-every` | `src/lib/mock/store.ts:78` |

##### FR-237 端末の控え（localStorage）

- ノード：`feature:sync/local-cache`　出典：`src/lib/mock/store.ts:18-98`
- すぐ開くために、データ・取り込んだ予定・同期の目印をブラウザの localStorage に控える。
- 前提：`integration:browser-storage`（`src/lib/mock/store.ts:49-67`）

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0783 | 控えは v2 を読み、なければ v1 から移行し、壊れていれば見本から始める | `rule:sync/cache-load-order` | `src/lib/mock/store.ts:49-59` |  |
| BR-0784 | ログアウトしたら、この端末の控えをすべて消す | `rule:sync/logout-clears-cache` | `src/lib/mock/store.ts:21-28` |  |

##### FR-238 通知の一覧をサーバーに置く

- ノード：`feature:sync/notice-upload`　出典：`src/lib/mock/store.ts:357-386`
- 組み直すたびに、これから送る通知の一覧を作ってサーバーに置く（送るのはサーバー側の定期実行）。
- 前提：`feature:notifications`（`src/lib/mock/store.ts:366-375`）

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0785 | なくなったタスクの通知は閉じる △ | `rule:sync/notice-close-gone-task` | `src/lib/mock/store.ts:376` |  |
| BR-0786 | 前回と同じ通知の一覧は送らない | `rule:sync/notice-skip-duplicate` | `src/lib/mock/store.ts:377-382` |  |
| BR-0787 | サーバーを読み直している間は、通知の一覧を置かない | `rule:sync/notice-wait-while-pulling` | `src/lib/mock/store.ts:361-365` | `setting:sync/notice-delay` |

| ID | 設定・調整値 | 値 | ノード | 出典 |
|---|---|---|---|---|
| ST-125 | 通知の一覧を送るまでの待ち（3秒） | 3000 | `setting:sync/notice-delay` | `src/lib/mock/store.ts:128-129` |

##### FR-239 変更のたびの組み直し

- ノード：`feature:sync/replan-on-change`　出典：`src/lib/mock/store.ts:405-437`
- 予定・タスク・設定などを変えたら必ず配置を組み直す。配置に関係しない変更は組み直さない。
- 前提：`feature:planner`（`src/lib/mock/store.ts:420`）

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0788 | 配置に関係しない変更は組み直さない | `rule:sync/patch-no-replan` | `src/lib/mock/store.ts:432-437` |  |
| BR-0789 | 枠の同一判定は、種類・参照先・開始時刻の一致 | `rule:sync/same-block-identity` | `src/lib/mock/store.ts:451-452` |  |
| BR-0790 | しばらく開いていなかったら、戻ったときに今の時刻で組み直す | `rule:sync/stale-replan` | `src/lib/mock/store.ts:389-403` | `setting:sync/stale-ms` |

| ID | 設定・調整値 | 値 | ノード | 出典 |
|---|---|---|---|---|
| ST-126 | 戻ってきたとき組み直す経過時間（10分） | 600000 | `setting:sync/stale-ms` | `src/lib/mock/store.ts:74-75` |

##### FR-240 見本のデータに戻す

- ノード：`feature:sync/reset-sample`　出典：`src/lib/mock/store.ts:439-442`
- データを見本の初期データで組み直す。

##### FR-241 サーバーとの読み込み・保存

- ノード：`feature:sync/server-sync`　出典：`src/lib/mock/store.ts:235-355`
- 開いたとき・戻ってきたときにサーバー（Supabase の app_state）の内容を読み、変えた内容は少し待って保存する。
- 前提：`integration:supabase-db`（`src/lib/mock/store.ts:241`）、`integration:supabase-auth`（`src/lib/mock/store.ts:257`）、`feature:sync/conflict-merge`（`src/lib/mock/store.ts:281`）

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0791 | 両方で変えていたら、項目ごとに合わせてサーバーにも送る | `rule:sync/both-changed-merge` | `src/lib/mock/store.ts:277-285` |  |
| BR-0792 | 初回のサーバーの応答（か諦め）が済むまで、編集できる状態にしない | `rule:sync/initial-load-gate` | `src/lib/mock/store.ts:304-307` |  |
| BR-0793 | サーバーにまだ無いか端末が新しいときは、端末の内容を送る | `rule:sync/initial-send-local` | `src/lib/mock/store.ts:295-299` |  |
| BR-0794 | サーバーの応答が遅いときは、数秒で端末の控えで使い始める | `rule:sync/load-timeout-fallback` | `src/lib/mock/store.ts:271` | `setting:sync/load-timeout` |
| BR-0795 | サーバーを読み終えるまでは保存しない | `rule:sync/no-save-before-first-read` | `src/lib/mock/store.ts:201-202` |  |
| BR-0796 | オンラインに戻ったら、オフラインだった分を送る | `rule:sync/online-retry` | `src/lib/mock/store.ts:346-348` |  |
| BR-0797 | 別の人の控えは使わず、見本のデータから始める | `rule:sync/owner-mismatch-fresh` | `src/lib/mock/store.ts:254-267` |  |
| BR-0798 | ログインしている人の ID を控えの持ち主として残す | `rule:sync/owner-stamp` | `src/lib/mock/store.ts:268-269` |  |
| BR-0799 | 読み込みに失敗しても、端末の控えで編集を始められる | `rule:sync/pull-failure-offline` | `src/lib/mock/store.ts:300-307` |  |
| BR-0800 | サーバーが前に合わせたあとで変わったか／端末に未送信の変更があるかで分ける | `rule:sync/remote-changed-check` | `src/lib/mock/store.ts:272-275` |  |
| BR-0801 | サーバーだけが変わっていたら、サーバーの内容を使う | `rule:sync/remote-only-adopt` | `src/lib/mock/store.ts:286-294` |  |
| BR-0802 | サーバーや取り込みから来た変化は保存し直さない（未送信の変更があれば送り直す） | `rule:sync/remote-origin-no-resave` | `src/lib/mock/store.ts:321-329` |  |
| BR-0803 | 変更から少し待ってサーバーに保存する | `rule:sync/save-debounce` | `src/lib/mock/store.ts:319-332` | `setting:sync/save-delay` |
| BR-0804 | 保存に失敗したら、未送信として残してオフライン表示にする | `rule:sync/save-failure-retry` | `src/lib/mock/store.ts:244-248` |  |
| BR-0805 | アプリに戻ってきたら、サーバーを読み直す | `rule:sync/visible-repull` | `src/lib/mock/store.ts:340-345` |  |

| ID | 設定・調整値 | 値 | ノード | 出典 |
|---|---|---|---|---|
| ST-127 | サーバーの読み込みを待つ長さ（6秒） | 6000 | `setting:sync/load-timeout` | `src/lib/mock/store.ts:135-136` |
| ST-128 | 変更を保存するまでの待ち（0.8秒） | 800 | `setting:sync/save-delay` | `src/lib/mock/store.ts:127` |

##### FR-242 直前の操作を元に戻す

- ノード：`feature:sync/undo`　出典：`src/lib/mock/store.ts:405-430`
- 変更の直前の状態を1つ控え、元に戻すと組み直す。

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0806 | 自動の変更は「元に戻す」の対象にしない | `rule:sync/auto-update-not-undoable` | `src/lib/mock/store.ts:406-421` |  |
| BR-0807 | サーバーの内容を取り込んだら、元に戻す控えを捨てる | `rule:sync/undo-cleared-on-remote` | `src/lib/mock/store.ts:279-289` |  |

#### FR-243 保存するデータの形

- ノード：`feature:sync/save-data-shape`　出典：`src/lib/mock/model.ts:6-340`
- ユーザーごとに1行の JSON で持つ内容。設定・場所・時限・授業・習慣・楽しみ・タスク・予定・枠・各種の記録・ご褒美などの項目を持つ。

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0808 | 日本時間で動かすので、タイムゾーンは設定で変えられない | `rule:sync/jst-fixed` | `src/lib/mock/state.ts:98-103` |  |
| BR-0809 | 保存する項目は DATA_KEYS にすべて並べ、入れ忘れは型エラーにする | `rule:sync/save-all-keys` | `src/lib/mock/state.ts:95-96` |  |
| BR-0810 | 保存では DATA_KEYS の項目だけを取り出し、組み立て結果は保存しない | `rule:sync/save-only-keys` | `src/lib/mock/state.ts:481-485` |  |

#### FR-244 サーバーで、あるユーザーの配置を組み直す

- ノード：`feature:sync/server-plan`　出典：`src/lib/server/plan.ts:15-52`
- 定期実行と iCal 配信から使う。取り込み元の iCal を読み直し、ヘルスケアの直近の睡眠を重ねて、アプリと同じ処理で配置を組み直す。
- 前提：`integration:supabase-db`（`src/lib/server/plan.ts:20-52`）、`integration:ical-import`（`src/lib/server/plan.ts:30-38`）、`feature:health-sleep`（`src/lib/server/plan.ts:23-25`）

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0811 | 取り込めなかった元は前回の結果で補い、前回もなければ組み直さない | `rule:sync/server-ical-fallback-last-events` | `src/lib/server/plan.ts:17-51` |  |
| BR-0812 | サーバーの取り込みは8日前から16日先まで | `rule:sync/server-import-window` | `src/lib/server/plan.ts:34` |  |
| BR-0813 | 直近3日のヘルスケアの睡眠を重ねて組み直す | `rule:sync/server-overlay-recent-health-sleep` | `src/lib/server/plan.ts:23-25` |  |
| BR-0814 | 保存データが読めなければ組み直さない | `rule:sync/server-plan-needs-valid-data` | `src/lib/server/plan.ts:21-22` |  |
| BR-0815 | 取り込めた予定は次の失敗に備えて前回の結果として残す | `rule:sync/server-save-last-events` | `src/lib/server/plan.ts:35-38` |  |

#### FR-245 v1（カレンダーだけの試作）からの移行

- ノード：`feature:sync/v1-migration`　出典：`src/lib/mock/state.ts:462-479`
- v1 の自分の予定・タスク・枠・場所・表示の設定は引き継ぎ、新しい項目は見本のデータで埋める。

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0816 | v1 からは予定・タスク・枠・場所・表示を引き継ぎ、残りは見本で埋める | `rule:sync/v1-keeps-user-data` | `src/lib/mock/state.ts:466-479` |  |

### FR-246 ログインと認証

- ノード：`feature:auth`　出典：`src/proxy.ts:1-59`


| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0817 | 通知の一覧（push_schedule）は、画面（本人）からは削除できない | `rule:auth/no-delete-push-schedule` | `supabase/migrations/0003_push.sql:46-62` |  |

| ID | 設定・調整値 | 値 | ノード | 出典 |
|---|---|---|---|---|
| ST-129 | NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY（公開してよい鍵） | — | `setting:infra/env-supabase-publishable-key` | `.env.example:7-8` |

#### FR-247 ローカル検証モード

- ノード：`feature:auth/local-debug-mode`　出典：`src/lib/localDebug.ts:1-6`
- ログインとサーバー（Supabase）への保存を使わず、この端末の localStorage だけで動かす検証用の動作モード。

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0818 | 本番ビルドではローカル検証モードは必ず無効 | `rule:auth/local-debug-disabled-in-production` | `src/lib/localDebug.ts:4-6` | `setting:auth/local-debug` |

| ID | 設定・調整値 | 値 | ノード | 出典 |
|---|---|---|---|---|
| ST-130 | ローカル検証モード（NEXT_PUBLIC_LOCAL_DEBUG） | 1 | `setting:auth/local-debug` | `src/lib/localDebug.ts:1-6` |

#### FR-248 ログイン画面

- ノード：`feature:auth/login-form`　出典：`src/app/login/LoginForm.tsx:8-71`
- メールアドレスとパスワードだけのログイン。ログイン後は元の画面（?next=）へ戻る。アカウントはここでは作れない。
- 前提：`integration:supabase-auth`（`src/app/login/LoginForm.tsx:21`）

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0819 | ログイン失敗の理由を言い分ける | `rule:auth/login-error-messages` | `src/app/login/LoginForm.tsx:73-85` |  |
| BR-0820 | ログイン後に戻す先は同じアプリの中だけ | `rule:auth/login-redirect-same-app-only` | `src/app/login/LoginForm.tsx:27-28` |  |
| BR-0821 | アプリからは新規登録できない △ | `rule:auth/no-signup-in-app` | `src/app/login/LoginForm.tsx:8` |  |

#### FR-249 すべてのページの前でログインを確かめる

- ノード：`feature:auth/login-guard`　出典：`src/proxy.ts:5-54`
- ページの前で動き、ログインを確かめる。未ログインならページはログイン画面へ、API は 401 にし、期限が近ければ自動で延長する。
- 前提：`integration:supabase-auth`（`src/proxy.ts:19-37`）

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0822 | ローカル検証モードではログインを確かめない | `rule:auth/local-debug-bypass` | `src/proxy.ts:16-17` | `setting:auth/local-debug` |
| BR-0823 | ログイン済みで /login を開いたらトップへ | `rule:auth/logged-in-skips-login-page` | `src/proxy.ts:50-52` |  |
| BR-0824 | 画像・ビルド済みのファイル・service worker などにはログイン確認を動かさない | `rule:auth/proxy-skips-static-assets` | `src/proxy.ts:56-59` |  |
| BR-0825 | 定期実行・配信・ヘルスケアの呼び出しはログイン確認を通さない | `rule:auth/public-paths-skip-login-check` | `src/proxy.ts:11-15` |  |
| BR-0826 | ログインの有効期限が近ければ自動で延長する △ | `rule:auth/session-auto-extend` | `src/proxy.ts:5-32` |  |
| BR-0827 | 未ログインはページならログイン画面、API なら 401 | `rule:auth/unauthenticated-redirect` | `src/proxy.ts:40-49` |  |
| BR-0828 | getUser で本物のログインか確かめる | `rule:auth/verify-with-getuser` | `src/proxy.ts:34-37` |  |

#### FR-250 ログインページ（/login）

- ノード：`feature:auth/login-page`　出典：`src/app/login/page.tsx:5-16`
- ログインフォームだけを中央に置いたページ。戻り先の読み取りのため Suspense で包む。

#### FR-251 Supabase への3種類の接続（ブラウザ・サーバー・管理者）

- ノード：`feature:auth/supabase-clients`　出典：`src/lib/supabase/env.ts:1-11`
- ブラウザ用（公開鍵）、サーバー用（cookie でログイン状態を受け渡す）、管理者用（secret key、RLS を通らない）の接続を作る。
- 前提：`integration:supabase-auth`（`src/lib/supabase/env.ts:1-11`）、`integration:supabase-db`（`src/lib/supabase/env.ts:1-11`）

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0829 | 管理者の接続はサーバーの定期実行などからだけ使い、画面から読み込まない | `rule:auth/admin-client-server-only` | `src/lib/supabase/admin.ts:3-12` | `setting:auth/supabase-secret-key` |
| BR-0830 | 接続先が設定されていなければ、書く場所を示してエラーにする | `rule:auth/missing-env-error` | `src/lib/supabase/env.ts:5-9` |  |
| BR-0831 | サーバー側の接続はログイン状態を cookie で受け渡す | `rule:auth/server-client-cookie-session` | `src/lib/supabase/server.ts:5-21` |  |

| ID | 設定・調整値 | 値 | ノード | 出典 |
|---|---|---|---|---|
| ST-131 | Supabase の secret key（SUPABASE_SECRET_KEY） | — | `setting:auth/supabase-secret-key` | `src/lib/supabase/admin.ts:3-11` |
| ST-132 | Supabase の接続先（NEXT_PUBLIC_SUPABASE_URL・NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY） | — | `setting:auth/supabase-url-and-key` | `src/lib/supabase/env.ts:3-4` |

### FR-252 PWA・オフライン

- ノード：`feature:pwa`　出典：`public/sw.js:1-131`

- 前提：`integration:sharp`（`scripts/make-icons.mjs:2-25`）

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0832 | ルートの画面でログイン前も含め Service Worker の部品を差し込む △ | `rule:pwa/sw-register-in-root-layout` | `src/app/layout.tsx:22-31` |  |

#### FR-253 開発の仕組み（ビルド・lint・型・テスト）

- ノード：`feature:infra/dev-tooling`　出典：`package.json:5-11`
- Next.js のビルドと開発サーバー、ESLint、TypeScript、Vitest、Tailwind（PostCSS）の設定。

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0833 | lint は Next.js の core-web-vitals と typescript の設定に従い、.next などは対象外 | `rule:infra/eslint-next-config` | `eslint.config.mjs:5-16` |  |
| BR-0834 | 「@/」は src/ を指す | `rule:infra/path-alias-at` | `tsconfig.json:21-23` |  |
| BR-0835 | TypeScript は strict で、出力はしない（型の検査だけ） | `rule:infra/typescript-strict` | `tsconfig.json:7-8` |  |

| ID | 設定・調整値 | 値 | ノード | 出典 |
|---|---|---|---|---|
| ST-133 | 開発中の印（左下の N）を出さない | false | `setting:infra/dev-indicator-off` | `next.config.ts:4-5` |

#### FR-254 アプリのアイコンの生成

- ノード：`feature:pwa/app-icons`　出典：`scripts/make-icons.mjs:1-25`
- 墨色の地に朝ルーティン・タスク・習慣の予定が並び赤い「いま」の線が横切る絵から、各サイズの PNG を作る。

#### FR-255 ホーム画面に追加して単独のアプリとして開く

- ノード：`feature:pwa/install-to-home`　出典：`src/app/manifest.ts:3-21`
- 名前・アイコン・開き方（standalone）を定め、iPhone でも枠なしで開けるようにする。

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0836 | 画面の言語は日本語 | `rule:app/language-ja` | `src/app/layout.tsx:24` |  |
| BR-0837 | 画面は端末の幅いっぱい・切り欠きまで使い、バーの色はライト／ダークに合わせる | `rule:app/viewport-safe-area-and-theme-color` | `src/app/layout.tsx:12-20` |  |
| BR-0838 | アイコンは192・512の通常と、512の maskable を用意 | `rule:pwa/maskable-icon` | `src/app/manifest.ts:15-19` |  |
| BR-0839 | ホーム画面からは単独のアプリ画面（standalone）で開く | `rule:pwa/standalone-display` | `src/app/manifest.ts:10-13` |  |

#### FR-256 電波がなくても画面を開ける

- ノード：`feature:pwa/offline-cache`　出典：`public/sw.js:22-94`
- 開いたときに主な画面とその部品をまとめて控え、電波がないときは控えから画面を出す。
- 前提：`integration:service-worker`（`public/sw.js:54-94`）

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0840 | 控えの名前に版を入れ、古い版の控えは消す | `rule:pwa/cache-versioned` | `public/sw.js:1-20` |  |
| BR-0841 | 画面は通信を先にし、取れなければ控え、それもなければオフライン表示（503） | `rule:pwa/pages-network-first` | `public/sw.js:66-94` |  |
| BR-0842 | API とほかのサイトへの通信は控えに触れない | `rule:pwa/skip-api-and-other-origins` | `public/sw.js:56-59` |  |
| BR-0843 | ログイン画面へ回された応答は画面の控えにしない | `rule:pwa/skip-redirected-login` | `public/sw.js:38` |  |
| BR-0844 | 版つきの部品（/_next/static、/icons）は控えを先に使う | `rule:pwa/static-parts-cache-first` | `public/sw.js:61-75` |  |
| BR-0845 | sw.js はいつも最新を読ませる | `rule:pwa/sw-no-store-header` | `next.config.ts:6-17` |  |
| BR-0846 | 控え直しは10分に1回まで・同時に1つだけ | `rule:pwa/warm-throttle` | `public/sw.js:22-52` | `setting:pwa/warm-interval-minutes` |

| ID | 設定・調整値 | 値 | ノード | 出典 |
|---|---|---|---|---|
| ST-134 | 開いたときにまとめて控える画面の一覧（SHELL） | 21画面（/ /calendar /tasks /stats /settings と設定の16項目） | `setting:pwa/shell-pages` | `public/sw.js:4-5` |
| ST-135 | Service Worker の版（VERSION） | v16 | `setting:pwa/sw-version` | `public/sw.js:3` |
| ST-136 | 控え直しの最短間隔（10分） | 600000 | `setting:pwa/warm-interval-minutes` | `public/sw.js:24-27` |

#### FR-257 オフラインのお知らせ

- ノード：`feature:pwa/offline-notice`　出典：`src/components/app/OfflineNotice.tsx:14-27`
- 電波がないときだけ、この端末の控えを表示していて、つながったら保存する旨を画面の下に出す。

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0847 | オフラインのときだけお知らせを出す | `rule:pwa/offline-notice-only-offline` | `src/components/app/OfflineNotice.tsx:16-21` |  |

#### FR-258 サービスワーカーの登録と控え直し

- ノード：`feature:pwa/service-worker-registration`　出典：`src/components/app/ServiceWorker.tsx:6-27`
- 電波がなくても開けるようにする仕組み（/sw.js）を登録し、画面が変わるたびに控え直しを頼む。
- 前提：`integration:service-worker`（`src/components/app/ServiceWorker.tsx:15`）

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0848 | サービスワーカーは本番でだけ登録する | `rule:pwa/sw-production-only` | `src/components/app/ServiceWorker.tsx:6-14` |  |
| BR-0849 | 画面を切り替えたら控え直しを頼む（ログイン画面とオフラインを除く） | `rule:pwa/sw-rewarm-on-navigation` | `src/components/app/ServiceWorker.tsx:6-24` |  |

#### FR-259 全体の見た目の土台（色・ダークモード・iOS 風の部品） △

- ノード：`feature:pwa/ui-foundation`　出典：`src/app/globals.css:1-178`
- iOS のカレンダーに近い配色の変数、端末の設定に合わせたダークモード、スイッチ・押した沈み・カードの影などの共通部品。

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0850 | 赤は「いま」と、足りない・間に合わないなどの知らせだけに使う △ | `rule:app/accent-red-sparingly` | `src/app/globals.css:8-13` |  |
| BR-0851 | ダークモードは端末の設定に合わせる | `rule:app/dark-mode-follows-device` | `src/app/globals.css:3-70` |  |
| BR-0852 | ダークモードではカードの影を出さない | `rule:app/hide-card-shadow-in-dark` | `src/app/globals.css:110-118` |  |
| BR-0853 | iPhone の日付・時刻の欄は自分の幅を持たず、枠からはみ出させない | `rule:app/ios-date-inputs-no-own-width` | `src/app/globals.css:98-108` |  |

### FR-260 気づき（予定と実際の差の分析）

- ノード：`feature:insights`　出典：`src/lib/mock/insights.ts:1-299`


| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0854 | 進み具合に答えた枠だけを材料にする | `rule:insights/answered-blocks-only` | `src/lib/mock/insights.ts:66-71` |  |
| BR-0855 | a が b よりはっきり高いときだけ差とみなす | `rule:insights/clearly-higher` | `src/lib/mock/insights.ts:41-42` |  |
| BR-0856 | 割合ではなく「12回中9回」の回数で見せる | `rule:insights/count-display` | `src/lib/mock/insights.ts:43` |  |

#### FR-261 気づきのボタンを押したときの変更

- ノード：`feature:insights/apply-action`　出典：`src/lib/mock/insights.ts:294-299`
- 「入れない」ボタンは入れない時間帯を足し、「前倒し」ボタンはタスクの置き方を変える。リンクは何も変えない。

#### FR-262 崩れやすい枠の気づき

- ノード：`feature:insights/blocks`　出典：`src/lib/mock/insights.ts:77-107`
- 時間帯（と作業の種類）ごとの「できなかった」の多さを比べ、飛び抜けて多い枠を見つけて、その時間帯にその種類のタスクを入れないボタンを出す。
- 前提：`feature:progress/work-review`（`src/lib/mock/insights.ts:67-71`）

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0857 | 同じ差なら作業の種類を絞ったほうを選ぶ | `rule:insights/blocks-prefer-tag` | `src/lib/mock/insights.ts:87-88` |  |
| BR-0858 | すでに「入れない」にしてあれば出さない | `rule:insights/blocks-skip-if-avoided` | `src/lib/mock/insights.ts:94-98` |  |
| BR-0859 | 時間帯は午前・午後・夕方・夜に分ける | `rule:insights/time-bands` | `src/lib/mock/insights.ts:52-61` |  |

#### FR-263 直近4週間の気づきの一覧を作る

- ノード：`feature:insights/build`　出典：`src/lib/mock/insights.ts:278-292`
- 崩れやすい枠・予定の多い日の翌日・締切・見積もり・タバコの場面・習慣の抜けやすさの6種類から、出せるものだけを並べる。

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0860 | 見積もり・締切は8週間を見る | `rule:insights/long-window` | `src/lib/mock/insights.ts:281-287` |  |

| ID | 設定・調整値 | 値 | ノード | 出典 |
|---|---|---|---|---|
| ST-137 | 比べる回数の下限（10回） | 10 | `setting:insights/min-samples` | `src/lib/mock/insights.ts:31` |
| ST-138 | 終わったタスクの下限（5件） | 5 | `setting:insights/min-tasks` | `src/lib/mock/insights.ts:33` |
| ST-139 | 気づきを見る期間（28日） | 28 | `setting:insights/window-days` | `src/lib/mock/insights.ts:29` |

#### FR-264 その日の計画の控え

- ノード：`feature:insights/day-log`　出典：`src/lib/mock/model.ts:211-239`
- 予定の数・外出の日か・予定の多い日か・雨か・行動ポイントと上限・予定の就寝・置いた記録する習慣・食事の時刻を、日ごとに残す。記録の画面の気づきと行動ポイントの見直しに使い、画面には出さない。
- 前提：`feature:planner`（`src/lib/mock/state.ts:632-637`）

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0861 | 控えには、その日に一度でも置いた「記録する」習慣を残す | `rule:insights/day-log-habits-once` | `src/lib/mock/state.ts:629-631` |  |
| BR-0862 | 控えの食事の時刻は、今の置き方（その日の最初の枠）にする | `rule:insights/day-log-meals-current` | `src/lib/mock/state.ts:641-647` |  |
| BR-0863 | 控えはその日のうちは書き直し、日が変わったら残す。同じなら何もしない | `rule:insights/day-log-rewrite-same-day` | `src/lib/mock/state.ts:648-661` |  |

| ID | 設定・調整値 | 値 | ノード | 出典 |
|---|---|---|---|---|
| ST-140 | 計画の控えを残す日数 | 120 | `setting:insights/day-log-days` | `src/lib/mock/state.ts:625-626` |

#### FR-265 締切との距離の気づき

- ノード：`feature:insights/deadline`　出典：`src/lib/mock/insights.ts:131-145`
- 終わったタスクの半数以上が締切の前日以降に終わっているとき、件数を示し、置き方を「前倒し」にするボタンを出す。

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0864 | 終わったタスクの半数以上が前日以降なら出す | `rule:insights/deadline-late-half` | `src/lib/mock/insights.ts:132-136` |  |
| BR-0865 | 置き方が前倒しでなければ「前倒し」へ変えるボタンを出す | `rule:insights/deadline-offer-early` | `src/lib/mock/insights.ts:137-143` |  |

#### FR-266 見積もりのずれの気づき

- ノード：`feature:insights/estimate`　出典：`src/lib/mock/insights.ts:110-128`
- 作業の種類ごとに、かかった時間÷見積もりの中央値を出し、ずれが大きい種類を「見積もりの1.5倍かかっている」のように示す。
- 前提：`feature:progress/work-review`（`src/lib/mock/insights.ts:111`）

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0866 | 見積もりより1.3倍以上か0.75倍以下で、5件以上あるとき出す | `rule:insights/estimate-thresholds` | `src/lib/mock/insights.ts:113-120` | `setting:insights/min-tasks` |

#### FR-267 習慣が抜けやすい日の気づき

- ノード：`feature:insights/habit-miss`　出典：`src/lib/mock/insights.ts:245-275`
- 「記録する」習慣を置いた日のうち、記録がなかった日が、外出・予定の多い日・雨の日・曜日のどれかで飛び抜けて多いときに示し、習慣の見直しへのリンクを出す。
- 前提：`feature:habits`（`src/lib/mock/insights.ts:251`）、`feature:insights/day-log`（`src/lib/mock/insights.ts:246-249`）

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0867 | 抜けやすさは外出・予定3つ以上・雨・曜日で比べる | `rule:insights/habit-conditions` | `src/lib/mock/insights.ts:254-266` |  |
| BR-0868 | 記録する習慣を置いた日に記録がなければ「抜けた」 | `rule:insights/habit-missed-definition` | `src/lib/mock/insights.ts:251-253` |  |

#### FR-268 予定の多い日の翌日の気づき

- ノード：`feature:insights/next-day`　出典：`src/lib/mock/insights.ts:159-189`
- 外出や予定の多い日の翌日に、枠が「できなかった」になりやすいこと、または朝の疲れが高いことを示す。
- 前提：`feature:planner`（`src/lib/mock/insights.ts:152`）

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0869 | 外出した日か予定の多い日を「忙しい日」とする | `rule:insights/busy-day` | `src/lib/mock/insights.ts:147-156` |  |
| BR-0870 | 翌朝の疲れが0.8以上高いとき疲れの気づきを出す | `rule:insights/next-day-fatigue` | `src/lib/mock/insights.ts:167-188` |  |

#### FR-269 タバコの場面の気づき

- ノード：`feature:insights/smoke-scenes`　出典：`src/lib/mock/insights.ts:199-242`
- 場面（予定の前後・作業中・食事のあと・起きて1時間・寝る前1時間など）ごとの1時間あたりの本数が、起きている時間全体の何倍かを出す。評価は添えない。
- 前提：`feature:night`（`src/lib/mock/insights.ts:222`）

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0871 | 基準は起きている時間あたりの本数 | `rule:insights/smoke-awake-baseline` | `src/lib/mock/insights.ts:202-204` |  |
| BR-0872 | 吸った記録が20本以上あるときだけ出す | `rule:insights/smoke-min-logs` | `src/lib/mock/insights.ts:200-201` | `setting:insights/min-samples` |
| BR-0873 | 場面は8本以上・合計5時間以上・1.5倍以上で、上位2つまで | `rule:insights/smoke-scene-thresholds` | `src/lib/mock/insights.ts:231-233` |  |

### FR-270 崩れた日の立て直し

- ノード：`feature:recovery`　出典：`src/lib/mock/recovery.ts:1-126`

- 前提：`feature:notifications`（`src/lib/mock/recovery.test.ts:58-59`）

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0874 | 寝坊した日の食事は起床後に動かす △ | `rule:recovery/meals-after-late-wake` | `src/lib/mock/recovery.test.ts:62-69` |  |
| BR-0875 | 立て直しの睡眠の間は自動の枠も通知も置かない △ | `rule:recovery/no-notices-during-sleep` | `src/lib/mock/recovery.test.ts:52-61` |  |
| BR-0876 | 休止の既定の終わりは今夜の就寝（最短で30分後） | `rule:recovery/pause-end-default` | `src/lib/mock/recovery.ts:115-119` |  |
| BR-0877 | 立て直しの記録は種類と時間が妥当なものだけ読む | `rule:recovery/reset-record-valid` | `src/lib/mock/state.ts:449-452` |  |
| BR-0878 | 日付をまたぐ睡眠でも、終わりまでタスクを入れない △ | `rule:recovery/sleep-across-midnight` | `src/lib/mock/recovery.test.ts:122-129` |  |
| BR-0879 | 疲労休止（疲れている）では、任意の朝食とタスクを省き、昼食と夕食の時刻は維持する | `rule:recovery/tired-mode-drops-optional` | `src/lib/scheduler/reset-meals.test.ts:32-37` |  |
| BR-0880 | 疲れた日は自動のタスクを置かず、本人が選んだ分だけ追加できる △ | `rule:recovery/tired-pauses-auto-tasks` | `src/lib/mock/recovery.test.ts:86-94` |  |

#### FR-271 立て直しと固定予定・固定枠の衝突を報告する

- ノード：`feature:recovery/conflicts`　出典：`src/lib/mock/recovery.ts:7-16`
- 立て直しの期間と重なる予定（移動を含む）と固定した枠を一覧にする。疲れた日は報告なし。

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0881 | 衝突の対象は終日でない予定（移動込み）と固定した枠 | `rule:recovery/conflict-sources` | `src/lib/mock/recovery.ts:8-15` |  |

#### FR-272 立て直しを確定する（今から寝る・起きた・疲れている）

- ノード：`feature:recovery/reset-rhythm`　出典：`src/lib/mock/recovery.ts:18-35`
- 立て直しの期間を記録し、その間の自動の枠を整理して、組み直しに渡す。

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0882 | 立て直しの前から続く枠は、始まりか今で切る | `rule:recovery/cut-spanning-blocks` | `src/lib/mock/recovery.ts:27-28` |  |
| BR-0883 | 固定した枠と、立て直し前に終わった枠だけ残して組み直す | `rule:recovery/reset-keep-blocks` | `src/lib/mock/recovery.ts:32-33` |  |
| BR-0884 | 重なる立て直しは新しいものに置き換え、60日より古いものは捨てる | `rule:recovery/reset-replace-overlap` | `src/lib/mock/recovery.ts:31` |  |
| BR-0885 | 立て直しの時間は、終わりが始まりより後で48時間以内 | `rule:recovery/reset-valid-range` | `src/lib/mock/recovery.ts:19` |  |
| BR-0886 | 睡眠中に始まる自動枠は「できなかった」にする | `rule:recovery/sleep-blocks-failed` | `src/lib/mock/recovery.ts:22-26` |  |

#### FR-273 実際の起床を出発点に起床・就寝をずらす

- ノード：`feature:recovery/rhythm-reset`　出典：`src/lib/scheduler/reset.ts:4-20`
- 「起きた」などの記録（リズムのリセット）から、その日の起床・就寝を実際の時刻に合わせ、翌日以降の睡眠枠が足りなければ起床を後ろへ送る。

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0887 | 起床がずれた日の就寝は、起床の直後にならないよう下限を置く | `rule:recovery/bed-after-wake-minimum` | `src/lib/scheduler/reset.ts:13-17` | `setting:planner/routine-minutes` `setting:planner/wind-down-minutes` |
| BR-0888 | 前の日がずれたら、翌日の起床を睡眠時間を取れる時刻まで後ろへ送る | `rule:recovery/next-day-wake-pushed` | `src/lib/scheduler/reset.ts:12` | `setting:planner/sleep-minutes` |
| BR-0889 | 疲れ以外のリセットの終わりを、その日の起床にする | `rule:recovery/wake-follows-actual-reset` | `src/lib/scheduler/reset.ts:10-11` |  |

### FR-274 時間割（授業）

- ノード：`feature:timetable`　出典：`src/lib/mock/utokyo.ts:1-72`


| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0890 | 2026年度のAセメスターは2027-02-04まで。そのあとは授業を作らず学期の初期値もない △ | `rule:timetable/calendar-ends-2027-02` | `src/lib/mock/review-2026-10-03.test.ts:84-97` |  |
| BR-0891 | 参加しない授業の回は空き時間として扱う | `rule:timetable/skip-when-not-attending` | `src/lib/mock/related.ts:14-27` |  |

| ID | 設定・調整値 | 値 | ノード | 出典 |
|---|---|---|---|---|
| ST-141 | 1つの学期から作る日数の上限 | 400 | `setting:timetable/max-term-days` | `src/lib/mock/model.ts:351-352` |

#### FR-275 時間割から授業の予定を作る

- ノード：`feature:timetable/class-events`　出典：`src/lib/mock/model.ts:361-391`
- 時間割の授業ごとに、学期の間の毎週同じ曜日へ1回ぶんの授業の予定を作る。休講日などは除き、任意参加の授業は出る回かどうかを持たせる。

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0892 | 授業の予定の ID は「class:授業ID:日付」 | `rule:timetable/class-id-format` | `src/lib/mock/model.ts:354-359` |  |
| BR-0893 | 授業の時刻は時限か開始・終了の時刻で決め、決まらなければ授業を作らない | `rule:timetable/class-time-resolution` | `src/lib/mock/model.ts:64-71` |  |
| BR-0894 | 任意参加の授業は参加する回だけ組み立てに渡す | `rule:timetable/optional-attending-only` | `src/lib/mock/model.ts:394-398` |  |
| BR-0895 | 見本の時間割の学期は今週の月曜から15週間 | `rule:timetable/sample-term-15-weeks` | `src/lib/mock/sample.ts:208-213` |  |
| BR-0896 | 休講にした日と大学が授業をしない日には授業を入れない | `rule:timetable/skip-cancelled-and-closed-days` | `src/lib/mock/model.ts:374-376` |  |
| BR-0897 | 授業は学期の初日以降の最初の該当曜日から毎週入れる | `rule:timetable/weekly-recurrence` | `src/lib/mock/model.ts:372-373` |  |

#### FR-276 授業・ゼミの追加・編集・削除

- ノード：`feature:timetable/course-editor`　出典：`src/components/settings/Timetable.tsx:70-255`
- 授業を、科目名・曜日・時限か時刻の指定・学期（東大の S1・S2・A1・A2 などの期間）・場所・任意参加・休講日で登録し、曜日と開始時刻の順に一覧する。
- 前提：`feature:timetable/period-editor`（`src/components/settings/Timetable.tsx:251`）

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0898 | 休講にした日は一覧から取り消せる | `rule:timetable/course-cancelled-dates` | `src/components/settings/Timetable.tsx:198-211` |  |
| BR-0899 | 新しい授業の学期は今の学期（または次の学期）の期間を初期値にする △ | `rule:timetable/course-default-term` | `src/components/settings/Timetable.tsx:74-90` |  |
| BR-0900 | 学期が終わった授業には「学期終了」と出す | `rule:timetable/course-ended-label` | `src/components/settings/Timetable.tsx:232-244` |  |
| BR-0901 | 任意参加の授業は参加する回だけを予定として扱う | `rule:timetable/course-optional-attendance` | `src/components/settings/Timetable.tsx:105-107` |  |
| BR-0902 | 学期の終了日は開始日以降でなければならない | `rule:timetable/course-term-end-after-start` | `src/components/settings/Timetable.tsx:94-98` |  |
| BR-0903 | 時刻指定の授業は、終了が開始より後でなければならない | `rule:timetable/course-time-end-after-start` | `src/components/settings/Timetable.tsx:110-119` |  |

#### FR-277 時限の時刻の設定

- ノード：`feature:timetable/period-editor`　出典：`src/components/settings/Timetable.tsx:14-54`
- 時限（1限・2限…）ごとに開始・終了時刻を変え、時限を追加・削除する。

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0904 | 時限を追加すると、最後の時限の終了の10分後から90分の枠になる | `rule:timetable/period-add-default` | `src/components/settings/Timetable.tsx:43-51` |  |
| BR-0905 | 使っている時限を消すときは、授業が予定に出なくなると警告する | `rule:timetable/period-delete-warns-used` | `src/components/settings/Timetable.tsx:33-38` |  |

#### FR-278 東大（情報理工）の暦

- ノード：`feature:timetable/utokyo-calendar`　出典：`src/lib/mock/utokyo.ts:3-72`
- 東京大学大学院情報理工学系研究科の時限・学期（ターム）・授業をしない日をデータとして持つ。2026年度だけが入っていて、翌年度は足す前提。

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0906 | 今の学期は、今日を含むか、これから来る S か A | `rule:timetable/current-semester` | `src/lib/mock/utokyo.ts:69-72` |  |
| BR-0907 | 標準授業日程で授業日の祝日（4/29・11/3）は授業をしない日に入れない | `rule:timetable/holidays-with-class` | `src/lib/mock/utokyo.ts:38-42` |  |

| ID | 設定・調整値 | 値 | ノード | 出典 |
|---|---|---|---|---|
| ST-142 | 大学が授業をしない日の一覧 | — | `setting:timetable/utokyo-no-class-days` | `src/lib/mock/utokyo.ts:38-67` |
| ST-143 | 東大の標準の時限（1〜6限、各105分） | — | `setting:timetable/utokyo-periods` | `src/lib/mock/utokyo.ts:9-17` |
| ST-144 | 授業の学期（S1・S2・S・A1・A2・A）と授業期間 | — | `setting:timetable/utokyo-terms` | `src/lib/mock/utokyo.ts:28-36` |

### FR-279 クイック追加（文の読み取り）

- ノード：`feature:quick-add`　出典：`src/lib/scheduler/parse.ts:1-70`


| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0908 | 「M/D」「M月D日」の締切はその日の終わりまで。過ぎた日付は来年 | `rule:quick-add/date-deadline` | `src/lib/scheduler/parse.ts:39-44` |  |
| BR-0909 | 所要時間は「N時間M分」「N時間（半）」「N分」を読む | `rule:quick-add/duration` | `src/lib/scheduler/parse.ts:31-36` |  |
| BR-0910 | 全角数字と「／」は半角にそろえてから読む | `rule:quick-add/fullwidth-digits` | `src/lib/scheduler/parse.ts:14-20` |  |
| BR-0911 | 優先度は言葉で決める（急ぎ系は高、暇なときは低） | `rule:quick-add/priority-words` | `src/lib/scheduler/parse.ts:58-60` |  |
| BR-0912 | 今日・明日・明後日はその日の終わりを締切にする | `rule:quick-add/relative-day-deadline` | `src/lib/scheduler/parse.ts:45-47` |  |
| BR-0913 | 読み取った部分を除いた残りがタスク名。空なら全文 | `rule:quick-add/title-remainder` | `src/lib/scheduler/parse.ts:62-67` |  |
| BR-0914 | 「まで」「までに」は付けても付けなくても同じ | `rule:quick-add/until-suffix` | `src/lib/scheduler/parse.ts:12` |  |
| BR-0915 | 「来週」「今週」は週末（日曜の終わり）を締切にする | `rule:quick-add/week-deadline` | `src/lib/scheduler/parse.ts:55-56` |  |
| BR-0916 | 曜日の締切は月曜始まりで数え、「来週の曜日」は来週の同じ曜日 | `rule:quick-add/weekday-deadline` | `src/lib/scheduler/parse.ts:48-54` |  |

#### FR-280 タスクのクイック追加バー

- ノード：`feature:calendar/quick-add-bar`　出典：`src/components/calendar/QuickAddBar.tsx:25-119`
- 1行の入力でタスクを追加する。締切（今日・明日・今週まで）と作業の種類のチップを選べ、読み取り結果の見込みを下に出す。

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0917 | 締切チップは文中の締切より優先する | `rule:calendar/quick-add-chip-overrides-text` | `src/components/calendar/QuickAddBar.tsx:42-43` | `setting:calendar/quick-add-deadline-chips` |
| BR-0918 | チップは入力中だけ出す | `rule:calendar/quick-add-chips-only-while-typing` | `src/components/calendar/QuickAddBar.tsx:31-34` |  |
| BR-0919 | 優先度が読み取れなければ中（2） | `rule:calendar/quick-add-default-priority-mid` | `src/components/calendar/QuickAddBar.tsx:46` | `setting:calendar/quick-add-priority-labels` |
| BR-0920 | 空の入力では追加しない | `rule:calendar/quick-add-empty-no-submit` | `src/components/calendar/QuickAddBar.tsx:55-63` |  |
| BR-0921 | 基準時刻は入力を始めたとき・追加するときに取り直す | `rule:calendar/quick-add-fresh-now` | `src/components/calendar/QuickAddBar.tsx:36-37` |  |
| BR-0922 | 追加前に読み取り結果と所要時間の目安を見せる | `rule:calendar/quick-add-preview-estimate` | `src/components/calendar/QuickAddBar.tsx:110-117` |  |

| ID | 設定・調整値 | 値 | ノード | 出典 |
|---|---|---|---|---|
| ST-145 | クイック追加の締切チップ | 今日,明日,今週 | `setting:calendar/quick-add-deadline-chips` | `src/components/calendar/QuickAddBar.tsx:8` |
| ST-146 | 優先度の表示名 | 1:低,2:中,3:高 | `setting:calendar/quick-add-priority-labels` | `src/components/calendar/QuickAddBar.tsx:10` |

### FR-281 アプリ全体の枠（タブ・お知らせ・タスク編集）

- ノード：`feature:app/shell`　出典：`src/components/app/AppShell.tsx:77-353`
- 全画面の外側にあり、画面の切り替えタブ、画面下のお知らせ、タスク編集シート、背景の取り込みをまとめて受け持つ。
- 前提：`feature:sync`（`src/components/app/AppShell.tsx:230-232`）

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0923 | サーバーの状態が決まるまで入力・記録の画面を出さない | `rule:app/loading-gate` | `src/components/app/AppShell.tsx:230-241` |  |
| BR-0924 | 設定・記録の画面ではタスクのクイック追加欄を出さない | `rule:app/quick-add-hidden-on-settings-stats` | `src/components/app/AppShell.tsx:201-202` |  |
| BR-0925 | アプリの枠はブラウザだけで描画する | `rule:app/shell-browser-only` | `src/components/app/AppShellLoader.tsx:6-12` |  |

| ID | 設定・調整値 | 値 | ノード | 出典 |
|---|---|---|---|---|
| ST-147 | 取り込みに失敗したとき次に試すまで（10分） | 600000 | `setting:app/background-retry-interval` | `src/components/app/AppShell.tsx:34` |

#### FR-282 画面の共通の入り口（useApp）

- ノード：`feature:app/app-context`　出典：`src/components/app/StoreProvider.tsx:6-19`
- 画面の部品が、保存データ・更新・タスク編集シートを開く・お知らせを出す、をどこからでも使えるようにする。

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0926 | useApp は枠の中でしか使えない | `rule:app/use-app-inside-shell-only` | `src/components/app/StoreProvider.tsx:15-19` |  |

#### FR-283 選んだカレンダーの色を画面全体に反映する

- ノード：`feature:app/calendar-colors-apply`　出典：`src/components/app/AppShell.tsx:192-200`
- 設定で選んだ色を、全画面で使う色の変数（--cal-<id>）に上書きする。選んでいなければ初期の色に戻す。

| ID | 設定・調整値 | 値 | ノード | 出典 |
|---|---|---|---|---|
| ST-148 | カレンダーごとの表示色 △ | — | `setting:app/calendar-colors` | `src/components/app/AppShell.tsx:196` |

#### FR-284 画面の切り替えタブ（今日・カレンダー・タスク・記録・設定）

- ノード：`feature:app/tab-navigation`　出典：`src/components/app/AppShell.tsx:23-29`
- 5つの画面を、広い画面では左のナビ、スマホでは下のタブで切り替える。いまの画面を強調表示する。

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0927 | 今日のタブに警告の件数を出す | `rule:app/today-tab-warning-badge` | `src/components/app/AppShell.tsx:68-75` |  |

##### FR-285 タブのアイコン

- ノード：`feature:app/tab-icons`　出典：`src/components/app/icons.tsx:1-65`
- タブ・ナビに使う今日・カレンダー・タスク・記録・設定のアイコンと、リンクのアイコンを描く。

#### FR-286 タスクの追加・編集・完了・削除をシートで受ける

- ノード：`feature:app/task-edit-host`　出典：`src/components/app/AppShell.tsx:203-223`
- どの画面からでもタスクの編集シートを開け、保存・追加・完了・削除のあとにお知らせを出す。枠を空ける・戻す操作も受け付ける。
- 前提：`feature:tasks/task-form`（`src/components/app/AppShell.tsx:333-350`）

#### FR-287 操作のあとに出るお知らせと「元に戻す」

- ノード：`feature:app/toast-undo`　出典：`src/components/app/AppShell.tsx:81-109`
- 追加・保存・完了・削除のあと、画面の下に短いお知らせを出し、直前の操作を元に戻せる。数秒で自動で消える。

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0928 | 次の操作をしたら前のお知らせを消す | `rule:app/toast-cleared-on-next-operation` | `src/components/app/AppShell.tsx:93-108` |  |
| BR-0929 | 元に戻せるときだけ「元に戻す」を出す | `rule:app/undo-button-only-when-undoable` | `src/components/app/AppShell.tsx:281-294` |  |

| ID | 設定・調整値 | 値 | ノード | 出典 |
|---|---|---|---|---|
| ST-149 | お知らせを出しておく時間（5秒） | 5000 | `setting:app/toast-ms` | `src/components/app/AppShell.tsx:39` |

##### FR-288 お知らせに「次はいつ入るか」を添える

- ノード：`feature:app/toast-next-placement`　出典：`src/components/app/AppShell.tsx:41-66`
- タスクの追加・保存や習慣の「できなかった」のあと、お知らせに、そのタスク・習慣が次に配置された日時（今日／明日／日付 ＋ 開始時刻）を出す。

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0930 | できなかった習慣は、これから先の最初の枠を「次は」と出す | `rule:app/habit-next-block-only-future` | `src/components/app/AppShell.tsx:49-52` |  |
| BR-0931 | 入らないタスクは理由を短く出す | `rule:app/task-placement-fallback-label` | `src/components/app/AppShell.tsx:55-66` |  |

#### FR-289 画面の共通の部品

- ノード：`feature:ui/shared-parts`　出典：`src/components/ui/controls.tsx:1-371`
- ボタン・入力欄・一覧・カード・シートなど、全画面で使う見た目の部品。

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0932 | 危険なボタンは確認のダイアログで「はい」と答えたときだけ実行する | `rule:ui/danger-confirm` | `src/components/ui/controls.tsx:325` |  |
| BR-0933 | 数の入力は欄を離れるか Enter で確定し、範囲に丸める | `rule:ui/number-input-commit` | `src/components/ui/controls.tsx:248-263` |  |
| BR-0934 | 押せる行にだけ右の「›」を出す | `rule:ui/row-clickable-chevron` | `src/components/ui/controls.tsx:120-130` |  |
| BR-0935 | 画面の見出しはスクロールしても上に残す | `rule:ui/screen-header-sticky` | `src/components/ui/controls.tsx:32-33` |  |
| BR-0936 | 選択肢が5つ以上なら3列で折り返す | `rule:ui/segmented-columns` | `src/components/ui/controls.tsx:163-165` |  |
| BR-0937 | 時刻の入力は欄を離れたときに確定し、不正なら元に戻す | `rule:ui/time-input-commit` | `src/components/ui/controls.tsx:301-305` |  |

##### FR-290 下から出るシート

- ノード：`feature:ui/sheet`　出典：`src/components/ui/Sheet.tsx:5-52`
- 画面の下から出るシート。広い画面では中央のダイアログ、左から出る版もある。外の暗い部分を押すか Esc で閉じる。

| ID | 業務ルール | ノード | 出典 | 関連する設定 |
|---|---|---|---|---|
| BR-0938 | シートは Esc・背景・「×」のどれでも閉じられる | `rule:ui/sheet-close` | `src/components/ui/Sheet.tsx:17-46` |  |
| BR-0939 | シートはスマホでは下から、広い画面では中央に出す | `rule:ui/sheet-layout-by-width` | `src/components/ui/Sheet.tsx:25-29` |  |

## 3. 外部連携

| ノード | 名前 | 内容 | 出典 | 依存する機能の数 |
|---|---|---|---|---|
| `integration:apple-shortcuts-health` | iPhone ショートカット（ヘルスケアの睡眠） | iPhone のショートカットがヘルスケアの睡眠分析を HTTP で送ってくる連携。 | `src/app/api/health/sleep/route.ts:12-17` | 7 |
| `integration:browser-storage` | ブラウザの localStorage（端末内の控え） | 画面側の保存の控えと所有者の記録を localStorage に持つ。 | `src/lib/mock/store.ts:24-43` | 4 |
| `integration:fullcalendar` | FullCalendar | カレンダー表示の部品。スタイルはこの部品のクラス名に合わせて上書きしている。 | `src/app/globals.css:180-190` | 6 |
| `integration:ical-export-feed` | iCal の配信 | アプリが組んだ予定を、カレンダーアプリが読みに来る iCal として返す仕組み。 | `src/app/api/ical/feed/[token]/route.ts:10-42` | 4 |
| `integration:ical-import` | iCal の取り込み（Google・iCloud） | 登録した iCal の URL から予定を読み取る外部連携。 | `src/app/api/ical/sync/route.ts:1-42` | 8 |
| `integration:ical-js` | ical.js（iCal の読み取り・書き出しのライブラリ） | iCal の読み取り（繰り返しの展開・タイムゾーンの登録）と配信用の書き出しに使う外部パッケージ。 | `src/lib/ical/import.ts:1-48` | 1 |
| `integration:notion-api` | Notion API | Notion の表の列と行を読む外部サービス。 | `src/app/api/notion/sync/route.ts:1-22` | 7 |
| `integration:open-meteo` | Open-Meteo（天気予報・地名検索の外部 API） | 地名の検索（geocoding）と雨の確率の予報を、認証なしの外部 API から取得する。 | `src/lib/weather/openMeteo.ts:14-42` | 4 |
| `integration:service-worker` | Service Worker（ブラウザの仕組み） | 画面の部品の控えと通知の表示を担うブラウザの仕組み。 | `public/sw.js:1-131` | 5 |
| `integration:sharp` | sharp（アイコン画像の生成ライブラリ） | アプリのアイコンの PNG を SVG から作る（scripts/make-icons.mjs）。package.json の依存には書かれていない。 | `scripts/make-icons.mjs:2-25` | 1 |
| `integration:supabase-auth` | Supabase Auth（ログイン） | メールとパスワードでのログインと、サーバー側でのログイン中ユーザーの確認に使う外部サービス。 | `src/app/login/LoginForm.tsx:21` | 7 |
| `integration:supabase-db` | Supabase Postgres（データベース） | アプリのデータ・取り込み元・通知・睡眠などを保存する Postgres。行レベルセキュリティで本人だけが読み書きできる。 | `supabase/migrations/0001_app_state.sql:4-27` | 20 |
| `integration:supabase-pg-cron` | Supabase pg_cron（定期実行） | 1分ごと・毎時に API を呼ぶ定期実行。CRON_SECRET を合言葉にして通知の送信と組み直しを動かす。 | `src/app/api/push/dispatch/route.ts:8-13` | 4 |
| `integration:web-push` | Web Push（通知の配信） | 端末の購読情報へ通知を送る仕組み。VAPID の鍵を環境変数で持つ。 | `src/app/api/push/dispatch/route.ts:1-47` | 7 |

## 4. データ（Supabase の表）

表の存在と出典は静的解析（source=static）。各表を使う関数の数を併記。表ごとの意味（RLS の方針など）は、上の領域のルール（`rule:auth/…` など）を参照。

| ノード | 出典 | 使う関数・モジュールの数 |
|---|---|---|
| `table:app_state` | `supabase/migrations/0001_app_state.sql:4-9` | 7 |
| `table:health_sleep` | `supabase/migrations/0007_health_sleep.sql:34-45` | 4 |
| `table:health_tokens` | `supabase/migrations/0007_health_sleep.sql:5-9` | 5 |
| `table:ical_feeds` | `supabase/migrations/0004_ical_feeds.sql:5-9` | 5 |
| `table:ical_sources` | `supabase/migrations/0002_ical_sources.sql:5-14` | 9 |
| `table:notion_sources` | `supabase/migrations/0005_notion_sources.sql:5-13` | 6 |
| `table:push_schedule` | `supabase/migrations/0003_push.sql:40-44` | 4 |
| `table:push_sent` | `supabase/migrations/0003_push.sql:65-70` | 3 |
| `table:push_subscriptions` | `supabase/migrations/0003_push.sql:6-15` | 5 |

## 5. 画面と API（Route）

静的解析（Next.js のファイル規約）による。画面・API が実現する機能は、各領域の「出典」の欄から辿れる。

| 種別 | パス | メソッド | ファイル |
|---|---|---|---|
| page | `/` | — | `src/app/(app)/page.tsx` |
| api | `/api/health/sleep` | POST | `src/app/api/health/sleep/route.ts` |
| api | `/api/ical/feed/[token]` | GET | `src/app/api/ical/feed/[token]/route.ts` |
| api | `/api/ical/sync` | POST | `src/app/api/ical/sync/route.ts` |
| api | `/api/notion/schema` | POST | `src/app/api/notion/schema/route.ts` |
| api | `/api/notion/sync` | POST | `src/app/api/notion/sync/route.ts` |
| api | `/api/push/dispatch` | POST | `src/app/api/push/dispatch/route.ts` |
| api | `/api/push/replan` | POST | `src/app/api/push/replan/route.ts` |
| api | `/api/push/test` | POST | `src/app/api/push/test/route.ts` |
| page | `/calendar` | — | `src/app/(app)/calendar/page.tsx` |
| page | `/login` | — | `src/app/login/page.tsx` |
| page | `/settings` | — | `src/app/(app)/settings/page.tsx` |
| page | `/settings/avoid` | — | `src/app/(app)/settings/avoid/page.tsx` |
| page | `/settings/basic` | — | `src/app/(app)/settings/basic/page.tsx` |
| page | `/settings/calendars` | — | `src/app/(app)/settings/calendars/page.tsx` |
| page | `/settings/colors` | — | `src/app/(app)/settings/colors/page.tsx` |
| page | `/settings/feed` | — | `src/app/(app)/settings/feed/page.tsx` |
| page | `/settings/habits` | — | `src/app/(app)/settings/habits/page.tsx` |
| page | `/settings/health` | — | `src/app/(app)/settings/health/page.tsx` |
| page | `/settings/notifications` | — | `src/app/(app)/settings/notifications/page.tsx` |
| page | `/settings/notion` | — | `src/app/(app)/settings/notion/page.tsx` |
| page | `/settings/places` | — | `src/app/(app)/settings/places/page.tsx` |
| page | `/settings/rewards` | — | `src/app/(app)/settings/rewards/page.tsx` |
| page | `/settings/routine` | — | `src/app/(app)/settings/routine/page.tsx` |
| page | `/settings/tags` | — | `src/app/(app)/settings/tags/page.tsx` |
| page | `/settings/timetable` | — | `src/app/(app)/settings/timetable/page.tsx` |
| page | `/settings/treats` | — | `src/app/(app)/settings/treats/page.tsx` |
| page | `/settings/weather` | — | `src/app/(app)/settings/weather/page.tsx` |
| page | `/stats` | — | `src/app/(app)/stats/page.tsx` |
| page | `/tasks` | — | `src/app/(app)/tasks/page.tsx` |

## 6. 検証の結果（run_checks）

- ① 全ソースファイルが Module：合格（対象 204 ファイル）
- ② 必須属性の欠け：合格（0件）
- ③ 出典ファイルの実在と行範囲：合格（0件）
- ④ 孤立ノード：0 件
- ⑤ static と llm の矛盾：4 件（原因は `docs/graph/open_issues.md`）

## 7. 要確認事項

### 7.1 評価で「誤り」「根拠不足」とされた要素

評価役が抜き取りで見つけた指摘。修正後は再評価していない（3ラウンドで打ち切ったため）。

| ラウンド | ノード／エッジ | 判定 | 理由 | 現在の扱い |
|---|---|---|---|---|
| round1 | `setting:planner/max-wake-shift` | 誤り | 値30と説明は正しいが、所属が feature:planner/morning-routine-prep（朝ルーティンと身支度の配置）になっており、使っているのは起床計算（rhythm.ts:133 limitDailyShift）。同じ設定が setting:rhythm/max-wake-shift・setting:settings/max-wake-shift と3重にあり、ルールからの CONFIGURED_BY はこのノードに | 修正済み・再評価なし |
| round2 | `rule:weather/stale-forecast` | 誤り | 説明は「取得から24時間以上たったものは使わず」だが、実装は now - fetchedAt <= FORECAST_FRESH_MS（24時間）を新しいとみなすので、ちょうど24時間の予報は使う（境界の違い）。また実装へのエッジがなく、rule:weather/stale-forecast-ignored（state.ts:726-727）と同じ内容の重複。 | グラフから除去（併合・削除） |
| round2 | `rule:habits/morning-order` | 誤り | 説明は「朝食は朝ルーティンの直後」「朝食がない日の散歩は朝ルーティンの直後」としているが、テストの朝ルーティンは15分（DEFAULT_SETTINGS.routineMinutes）で、朝食は起床+20分＝朝ルーティンの終わりの5分後（CUE_GAP_MINUTES）。朝食なしの散歩も同じく5分後で、散歩だけ5分後とする説明は食い違う。 | 修正済み・再評価なし |
| round2 | `CONFIGURED_BY:rule:planner/energy-day-used->setting:planner/daily-energy-budget` | 根拠不足 | ルール（使ったポイントを小数1桁に丸め、外出の日と体力を添える）の挙動は dailyEnergyBudget で変わらない。上限は entry.budget に写されるだけで、上限で挙動が変わるのは直後の発散の提案（798行〜）のほう。 | グラフから除去（併合・削除） |
| round3 | `setting:planner/evening-from-minute` | 誤り | 値 1020（17:00）と所属は正しいが、境界と対象が違う。コードは last >= dayStart+17:00（17:00ちょうども含む）で、last は予定の終わりに帰りの移動を足した時刻と homeAt の最大、さらに就寝より前に限る。説明は「17:00より後に終わると」で、ちょうどの扱いと移動込み・就寝前の条件が抜けている（定数のコメント自体も「これより後」と書いており、コードと食い違う）。 | 修正済み・再評価なし |

### 7.2 抽出時の確信が medium の要素

55 件。本文では △ を付けている。根拠が間接的、または実体が別のファイルにある。

| ノード | 確信 | 理由（抽出時の記述） | 出典 |
|---|---|---|---|
| `feature:app/shell-layout` | medium | レイアウトが AppShellLoader で子を包んでいる。AppShell の中身は担当外 | `src/app/(app)/layout.tsx:3-5` |
| `feature:habits/miss` | medium | テストの期待値。実装は担当外（state.ts） | `src/lib/mock/habit-miss.test.ts:15-47` |
| `feature:notifications/morning-summary-group` | medium | 朝のまとめの本文を組む部分。ルールの束ねとして分けたもので、独立した画面機能ではない。 | `src/lib/notify/build.ts:120-133` |
| `feature:planner/test-fixtures` | medium | jst と baseInput（既定の設定、空の配列） | `src/lib/scheduler/test-helpers.ts:3-20` |
| `feature:pwa/ui-foundation` | medium | 全体の CSS 変数と共通クラス。どの領域にも属さないため基盤の機能の下に置く | `src/app/globals.css:1-178` |
| `rule:app/accent-red-sparingly` | medium | コメントのみ。守られているかは各所の使い方に依存 | `src/app/globals.css:8-13` |
| `rule:auth/no-signup-in-app` | medium | フォームがログインの呼び出ししか持たない。新規登録を禁止する設定自体は Supabase 側で担当外 | `src/app/login/LoginForm.tsx:8` |
| `rule:auth/session-auto-extend` | medium | コメントが延長を述べ、setAll が cookie を反映する。延長自体の判断は Supabase ライブラリ側で、このコードには出ない。 | `src/proxy.ts:5-32` |
| `rule:calendar/block-record-started-task-to-today` | medium | 「started」は組み直した時刻(plannedAt)との比較。今日の画面のどのカードかはコードに書かれていない | `src/components/calendar/CalendarApp.tsx:377-395` |
| `rule:calendar/fc-utc-shift` | medium | timeZone=UTC と toFc/fromFc の利用から。ずらす量は jst.ts 側 | `src/components/calendar/CalendarView.tsx:829-830` |
| `rule:calendar/selected-event-ring` | medium | is-selected のスタイル。2回押しの動きはコメントのみ | `src/app/globals.css:388-391` |
| `rule:habits/meal-outside-is-skip` | medium | コメントが対応を述べる。配置側の処理は担当外のため中程度 | `src/lib/mock/model.ts:321-322` |
| `rule:habits/overslept-laundry-replanned` | medium | テストの期待値 | `src/lib/mock/habit-miss.test.ts:41-46` |
| `rule:habits/tracked-interval-counts-on-done` | medium | テストの期待値 | `src/lib/mock/habit-miss.test.ts:36-40` |
| `rule:habits/unmarked-slot-stays` | medium | テストの期待値 | `src/lib/mock/habit-miss.test.ts:23-27` |
| `rule:habits/untracked-interval-counts-on-start` | medium | テストの期待値 | `src/lib/mock/habit-miss.test.ts:28-35` |
| `rule:ical/feed-content-scope` | medium | 配信内容を説明する文言（実際の配信処理は担当外） | `src/components/settings/Feed.tsx:53-56` |
| `rule:ical/feed-regenerate-invalidates-old` | medium | コメントと upsert の挙動。行の置き換えで前のハッシュが消えることからの推定で、サーバー側の照合は担当外。 | `src/lib/sync/feed.ts:31-42` |
| `rule:notifications/no-double-send` | medium | deliverNotice に台帳を渡している。重複排除の中身は担当外のファイル | `src/app/api/push/dispatch/route.ts:29-34` |
| `rule:notion/fixed-deadline` | medium | deadlineKind に fixed を入れている。意味は担当外 | `src/lib/mock/notion.ts:48` |
| `rule:notion/source-required` | medium | 分岐のみ。ステータスの中身は担当外のファイル | `src/app/api/notion/sync/route.ts:11-12` |
| `rule:planner/habit-releasable` | medium | 待ち時間のある親は1つ目の枠だけ releasable でない、という条件の読み取りが複雑 | `src/lib/scheduler/planner.ts:510-514` |
| `rule:planner/habit-today-onward` | medium | 時間帯の終わりが今より前の日を除く処理で、独立した判断かが曖昧 | `src/lib/scheduler/planner.ts:538` |
| `rule:planner/just-before-timing` | medium | just-before の判定と減点が別の行にあり、重複気味 | `src/lib/scheduler/planner.ts:619` |
| `rule:planner/keep-near-block-unless-conflict` | medium | テストの期待値。実装は担当外 | `src/lib/mock/recovery.test.ts:143-150` |
| `rule:planner/no-screen-recovery` | medium | 根拠はコメントの設計意図。候補のないことから導く | `src/lib/mock/sample.ts:190-197` |
| `rule:planner/optional-meal-yields` | medium | 押し出し判定の条件式が複雑で、意図は推定 | `src/lib/scheduler/planner.ts:479-488` |
| `rule:planner/sleep-resets-busy` | medium | 睡眠記録の扱いは reset.ts 側に依存するので、この1か所では全体が分からない | `src/lib/scheduler/planner.ts:147-148` |
| `rule:planner/task-lead-days-wait` | medium | テストの期待値。実装は担当外（planner.ts） | `src/lib/mock/recovery.test.ts:139-142` |
| `rule:pwa/sw-register-in-root-layout` | medium | RootLayout の子に ServiceWorker を置いている。登録の条件は担当外のファイル | `src/app/layout.tsx:22-31` |
| `rule:recovery/meals-after-late-wake` | medium | テストの期待値。実装は担当外 | `src/lib/mock/recovery.test.ts:62-69` |
| `rule:recovery/no-notices-during-sleep` | medium | テストの期待値。実装は担当外 | `src/lib/mock/recovery.test.ts:52-61` |
| `rule:recovery/sleep-across-midnight` | medium | テストの期待値 | `src/lib/mock/recovery.test.ts:122-129` |
| `rule:recovery/tired-pauses-auto-tasks` | medium | テストの期待値。配置側の実装は担当外 | `src/lib/mock/recovery.test.ts:86-94` |
| `rule:rewards/bank-on-replan` | medium | テストの期待値。実装は担当外 | `src/lib/mock/review-2026-10-03.test.ts:61-67` |
| `rule:settings/learned-minutes-used-when-enough-samples` | medium | 実績が閾値以上のときの注記 | `src/components/settings/Tags.tsx:24-29` |
| `rule:stats/insight-shows-counts` | medium | テストの期待文。文の組み立ては別のモジュール | `src/components/stats/StatsScreen.test.tsx:47-49` |
| `rule:stats/smoking-no-evaluation` | medium | 関数の説明コメントに『評価しない』とあり、表示にも評価要素がない | `src/components/stats/StatsScreen.tsx:420` |
| `rule:sync/cascade-on-user-delete` | medium | 外部キーの指定。全表で同じ形 | `supabase/migrations/0001_app_state.sql:4-9` |
| `rule:sync/data-keys-complete` | medium | テストの期待値。実装は担当外（state.ts） | `src/lib/mock/review-2026-10-03.test.ts:10-21` |
| `rule:sync/notice-close-gone-task` | medium | closeGoneTaskNotices にタスクの ID の集合を渡す（関数名による判断） | `src/lib/mock/store.ts:376` |
| `rule:sync/save-returns-server-time` | medium | upsert の select で updated_at を読み返す。サーバーの時計かどうかは DB 側（担当外）に依存する。 | `src/lib/sync/remote.ts:35-46` |
| `rule:tasks/learned-minutes-median` | medium | テストの期待値（2件は150分で未適用、3件で180分）。実装は担当外のため中程度 | `src/lib/mock/state.test.ts:34-49` |
| `rule:tasks/unreviewed-block-not-subtracted` | medium | テストが期待値として確かめている。実装は担当外のため中程度 | `src/lib/mock/state.test.ts:5-16` |
| `rule:timetable/calendar-ends-2027-02` | medium | テストの期待値。実装は担当外 | `src/lib/mock/review-2026-10-03.test.ts:84-97` |
| `rule:timetable/course-default-term` | medium | currentSemester による初期値と、終了済みの学期の非表示 | `src/components/settings/Timetable.tsx:74-90` |
| `rule:today/routine-wash-face-in-prep` | medium | コメントによる設計意図で、手順の一覧にそれらがないことと合う | `src/lib/mock/sample.ts:263-266` |
| `rule:today/treat-reward-conditions` | medium | 条件は文字列として定義されているだけ。判定は担当外のため確信は中程度 | `src/lib/mock/sample.ts:258-260` |
| `rule:today/work-now-no-padding` | medium | テストの期待値 | `src/lib/mock/recovery.test.ts:117-121` |
| `setting:app/calendar-colors` | medium | state.calendarColors を読んでいる。設定画面側はこのバッチの外 | `src/components/app/AppShell.tsx:196` |
| `setting:calendar/color-defaults` | medium | CSS に既定値がある。上書きの仕組みは担当外 | `src/app/globals.css:27-34` |
| `setting:health-sleep/token-setup` | medium | 形検査の条件。値そのものは DB にハッシュで持つ | `src/app/api/health/sleep/route.ts:18-19` |
| `setting:planner/avoid-holiday-morning` | medium | 避ける時間帯の定義で hard が偽。何を避けるかは配置側のため中程度 | `src/lib/mock/sample.ts:199-201` |
| `setting:rewards/rates` | medium | rewardRates を読んで足している。設定画面は担当外 | `src/lib/mock/stats.ts:138-141` |
| `setting:tasks/avoid-windows` | medium | 気づきが avoidWindows に追加し、重複を調べている。設定画面側は担当外 | `src/lib/mock/insights.ts:93-97` |

### 7.3 その他

- 評価で、同じ内容のノードの重複が残っていると指摘された組：`rewards/habit` と `rewards/habit-tracked-only`、`ical-export-feed` と `ical/feed-endpoint`（併合していない）。
- 画面の文言とコードの食い違い（評価役の指摘）：iCal 配信の期間はコード上 15 日先（`src/lib/ical/feed.ts:8,18`）だが、設定画面の文言は「14日先」（`src/components/settings/Feed.tsx:55`）。
- 他の未解決事項は `docs/graph/open_issues.md`。

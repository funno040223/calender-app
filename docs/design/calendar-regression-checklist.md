# カレンダー回帰確認表

2026-11-20 作成。現行コードと [生活管理アプリ要件](life-management-requirements.md) を照合した手動確認用チェックリスト。実行結果はこの文書の作成時点ではすべて未実施。コードの行参照は確認対象であり、動作を実機で確認した証拠ではない。

## 状態の読み方

- **既存挙動**：現行コードに実装がある。確認操作と期待結果を記載。実行結果は未実施。
- **新規受入**：要件書にある改修後の期待。現行コードでの実装確認はしていない。
- **未実施**：手動操作・受入確認をまだ実行していない。実施後に結果・端末・日付を追記する。

## 既存挙動の回帰

| 状態 | 観点・元コード | 再現できる操作 | 期待結果 | 実施 |
|---|---|---|---|---|
| 既存挙動 | 初期表示・表示モード [CalendarApp.tsx:20-25, 46-55](../../src/components/calendar/CalendarApp.tsx)、[CalendarView.tsx:46, 232-254](../../src/components/calendar/CalendarView.tsx) | スマートフォン幅とPC幅でカレンダーを開き、3日・週・月を順に選ぶ | スマートフォンは3日、PCは週が初期表示。1日表示はなく、3日・週・月に切り替わる。 | 未実施 |
| 既存挙動 | 日付移動・月から日へ [CalendarApp.tsx:195-228, 234-244](../../src/components/calendar/CalendarApp.tsx)、[CalendarView.tsx:298-316, 532-571, 762-789](../../src/components/calendar/CalendarView.tsx) | 3日・週の時刻欄で指を左右にスワイプし、指を離す。続けて‹／›／今日を押す。月表示で日付セルを押す | 3日・週とも横スワイプで1日ずつ前後し、日付の境目に止まる。表示窓はそれぞれ3日・7日のまま、見出しの日付が追従する。月の日付を選ぶとスマートフォンは3日、PCは週表示で選択日を含む範囲を表示する。 | 未実施 |
| 既存挙動 | 月の縦送り [CalendarView.tsx:574-643, 895-899](../../src/components/calendar/CalendarView.tsx) | 月表示を上下にスワイプし、複数週を移動して止める | 週単位でスナップして縦に移動し、画面中央付近の月に見出しが追従する。月の境界をまたいでも週が連続する。 | 未実施 |
| 既存挙動 | 3日・週のピンチ [CalendarView.tsx:332-450](../../src/components/calendar/CalendarView.tsx) | 3日・週表示の時間欄で二本指を広げてから縮める。PCはCtrl+トラックパッド操作も試す | 1時間の表示高さが拡大・縮小し、指の間の時刻が位置を保つ。操作終了後の倍率が保存され、横の日付位置は意図せず変わらない。 | 未実施 |
| 既存挙動 | 予定の新規作成・終日・日跨ぎ [CalendarView.tsx:771-788, 864-887](../../src/components/calendar/CalendarView.tsx)、[CalendarApp.tsx:247-249, 280-289](../../src/components/calendar/CalendarApp.tsx)、[EventForm.tsx:73-134, 168-193](../../src/components/calendar/EventForm.tsx) | 空き時間をドラッグして予定を作成。フォームで23:00開始・01:00終了を入力して保存。別に終日予定も作成する | 23:00〜01:00は翌日01:00までの2時間として保存。終日予定は終了日を含む。保存後カレンダーに表示され、再度開いて値が残る。 | 未実施 |
| 既存挙動 | 予定の編集・削除・移動・長さ変更 [CalendarApp.tsx:90-117, 251-257, 280-289](../../src/components/calendar/CalendarApp.tsx)、[CalendarView.tsx:793-808, 864-888](../../src/components/calendar/CalendarView.tsx)、[EventForm.tsx:91-134, 230-233](../../src/components/calendar/EventForm.tsx) | 自分の予定を開いてタイトルを変更し保存。カレンダー上で予定をドラッグして移動し、端をドラッグして長さを変更。最後に削除を確認 | 編集内容・移動時刻・変更後の開始終了時刻が保存される。削除確認を承認した予定だけが一覧から消える。 | 未実施 |
| 既存挙動 | カレンダー表示切替 [CalendarApp.tsx:164-165, 179, 231-279](../../src/components/calendar/CalendarApp.tsx)、[CalendarToggles.tsx:8-43](../../src/components/calendar/CalendarToggles.tsx) | スマートフォンはヘッダーのカレンダー選択、PCは左欄から一つのカレンダーをオフ／オンにする | オフにしたカレンダーの項目だけ隠れ、再度オンにすると戻る。 | 未実施 |
| 既存挙動 | タスク・習慣枠の選択、固定 [CalendarApp.tsx:59-75, 146-165, 258-270](../../src/components/calendar/CalendarApp.tsx)、[CalendarView.tsx:779-789, 864-887](../../src/components/calendar/CalendarView.tsx)、[InfoSheet.tsx:39-91](../../src/components/calendar/InfoSheet.tsx) | タスク枠を一度押し、関連予定の強調を確認してから同じ枠をもう一度押す。枠をドラッグし、情報シートで固定解除 | 1回目は枠と関連項目を強調、2回目は詳細を開く。ドラッグした枠は固定され、固定解除で自動配置に戻る。 | 未実施 |
| 既存挙動 | 月の締切・期限切れタスク [CalendarView.tsx:657-680, 779-789](../../src/components/calendar/CalendarView.tsx) | 締切のあるタスクを月表示で確認し、締切の表示を押す | 月表示に締切が表示され、押すと該当タスクを開く。期限切れ状態も識別できる。 | 未実施 |
| 既存挙動 | 予定と関連タスク [CalendarApp.tsx:78-88, 167-176, 251-256, 280-289](../../src/components/calendar/CalendarApp.tsx)、[InfoSheet.tsx:11-37](../../src/components/calendar/InfoSheet.tsx) | タスクと関連付けた予定を一度押し、関連タスクの強調を確認。予定詳細を開き関連タスクの編集を選ぶ | 対応する予定・タスクだけが強調され、詳細から関連タスクを編集できる。 | 未実施 |
| 既存挙動 | 外部予定・授業の読み取り専用と操作 [CalendarApp.tsx:119-144, 302-367](../../src/components/calendar/CalendarApp.tsx)、[InfoSheet.tsx:94-129](../../src/components/calendar/InfoSheet.tsx) | 取り込んだGoogle予定を開く。任意参加授業では参加を切り替え、別の授業で休講を選ぶ | Google予定は読み取り専用で、移動時間・関連タスクを扱える。任意参加の状態が変わり、休講操作は対象の回に限定される。 | 未実施 |
| 既存挙動 | タスク枠・習慣枠の記録 [CalendarApp.tsx:373-453](../../src/components/calendar/CalendarApp.tsx)、[BlockRecord.test.tsx:22-28](../../src/components/calendar/BlockRecord.test.tsx) | 開始済みのタスク・記録対象習慣、未来の枠をそれぞれ開く | タスクは今日の画面への導線。習慣は設定に応じて「少しだけ／やった／できなかった」または「今日は飛ばす」を出す。テストコードでは記録する習慣の「やった」表示と、記録しない習慣では表示しないことを確認している。 | 未実施（自動テストの記述あり） |
| 既存挙動 | 予定フォームの日時検証 [EventForm.tsx:91-134](../../src/components/calendar/EventForm.tsx) | 同日23:00開始・01:00終了を入力。次に同日09:00〜09:00を試す。複数日予定を有効にして終了日を開始日より前にし、移動時間に-5を入力する | 同日で終了時刻が開始以前（23:00〜01:00、09:00〜09:00）の場合は翌日扱い（後者は24時間）。複数日予定の終了日が開始日以前なら「終了は開始より後にしてください」、負の移動時間なら「移動時間は0以上の数で入力してください」と表示し保存しない。 | 未実施 |

## 改修後の新規受入

| 状態 | 要件・根拠 | 再現できる操作 | 期待結果 | 実施 |
|---|---|---|---|---|
| 新規受入 | 新ナビ内の予定入口、カレンダー／タスク切替と既存URL維持 [life-management-requirements.md:36-47, 139-140](life-management-requirements.md) | スマートフォンで予定タブを開き、表示された見出しからカレンダー／タスクを切替。既存のカレンダーURL・タスクURL・通知やホーム画面の直リンクも個別に開く | 予定タブはカレンダーから開く。見出し操作でタスクへ切替可能。既存リンクは従来どおり対象画面を開き、ブラウザの戻るも成立する。 | 未実施 |
| 新規受入 | 既存2タップ詳細と生活詳細の1操作導線 [CalendarApp.tsx:59-75, 251-270](../../src/components/calendar/CalendarApp.tsx)、[life-management-requirements.md:30, 47, 146-147](life-management-requirements.md) | 通常の予定・タスク枠を一度押して関連項目の強調を確認し、同じ項目を再度押す。次に食事・運動枠を一度押す | 一般の予定・タスクは既存どおり1回目で関連項目の強調、同じ項目への2回目で詳細を開く。食事・運動枠は例外の直行導線として1操作で対応する専用詳細を開き、タップによる強調状態と衝突しない。 | 未実施 |
| 新規受入 | 横スワイプの日付送りと画面切替の干渉 [life-management-requirements.md:47](life-management-requirements.md) | 新ナビで予定画面を開く。カレンダーの3日・週表示上を左右にスワイプして日付を送る。カレンダー領域外の画面切替ジェスチャーも別に試す | カレンダー上の左右スワイプは既存どおり日付送りとして扱い、ホーム等への画面切替と誤認しない。領域外では新ナビの画面切替が働く。表示日・見出しは一致する。 | 未実施 |
| 新規受入 | 固定予定を守り、生活枠と作業枠の二重配置を防止 [life-management-requirements.md:104-106, 146](life-management-requirements.md) | 外部予定の時刻を延長し、固定予定・作業枠・生活枠の配置を再計算する | 固定予定は動かず、同じ時間を複数の枠が使わない。運動は週内で優先し、競合時は短縮・別日候補と理由を確認できる。 | 未実施 |
| 新規受入 | 料理の意向と実食を分離 [life-management-requirements.md:67, 147](life-management-requirements.md) | 夕食枠を外食に変更し、翌日に実食を追記する。予定変更だけの場合も試す | 外食への変更だけでは在庫を消費しない。翌日の実食は一度だけ集計に反映され、後から訂正できる。 | 未実施 |
| 新規受入 | 運動短縮完了・再配置・複数端末 [life-management-requirements.md:29-30, 149](life-management-requirements.md) | 運動枠で5分版を完了し、予定を再編成後にPCで開く。同じ操作を再送する | 完了・報酬・運動回数は一度だけ記録され、予定変更後も実績が保持される。詳細入力なしの完了だけでは負荷増量を提案しない。 | 未実施 |
| 新規受入 | 既存ユーザーの継続利用 [life-management-requirements.md:58, 151](life-management-requirements.md) | 新機能を使わない既存データで通知から予定を開き、タスク追加・取り消し・外部連携・睡眠記録を操作する | 従来の機能と記録が保たれ、通知リンクも対象を開く。新画面を利用しなくても主要操作を続けられる。 | 未実施 |
| 新規受入 | 詳細から戻ったときの文脈維持 [life-management-requirements.md:152](life-management-requirements.md) | スマートフォンで週を計画し、対象の食事・運動詳細を開いて戻る | 元の予定画面と選択日へ戻り、表示期間を失わない。 | 未実施 |

## 未実施記録

本表の全項目は未実施。実施時は各行の「実施」を `OK / NG / 保留（理由）` に置き換え、日付・端末（OS／ブラウザー）・再現に使ったデータをこの節または行に追記する。自動テストがある行も、実機操作を実施した意味にはしない。

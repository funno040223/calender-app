# 疲労回復リサーチ & 疲労スコアモデル仕様

> このドキュメントは疲労見積もりアプリの設計根拠です。
> - 「根拠」列の略記: メタ=メタ分析 / RCT / 実験=小規模実験 / 観察=観察研究 / ガイド=公的ガイドライン / 仮定=設計上の仮定（実証根拠なし）
> - **§4 の係数はすべて仮定**。実装では設定値（config）として外出しし、ユーザーデータで推定・更新すること。

## 0. 対象ユーザー像

- 20代大学生、運動不足・低体力、座り仕事中心の終日外出が多い
- 体を動かすと疲れる / 頭脳作業ではあまり疲れない
- 帰宅後に疲れて何もできず、寝床でスマホ → 夜更かし
- 予定なし日は一日だるい
- 起床9時基準、カフェインなし、喫煙あり（食後・就寝前）

## 1. 設計の三原則（研究からの結論）

1. **負荷ゼロの日 ≠ 回復最大の日**。低強度運動の継続、仕事からの心理的切り離し、コントロール感（自分で予定を決めている感覚）が疲労低下・活力向上と関連する。
2. **日をまたぐ持ち越しの主役は睡眠負債**。一晩の長時間睡眠では完全に返済されず、本人は自覚しにくい。
3. **Banister型の構造は流用可、係数は流用不可**。一般定数は避けるべきとされる。ACWR は採用しない。

## 2. 回復方法の効果（実装で使う値）

| 方法 | 効果 | 推奨条件 | 根拠 | 出典 |
|---|---|---|---|---|
| 短い昼寝 | 認知 g=0.18、覚醒度 0.29 | 10〜20分、15時まで。30分は起床直後に睡眠慣性 | メタ（ほぼ実験室）+ 実験 | Dutheil 2021; Brooks & Lack 2006 |
| 目を閉じて休む（非睡眠） | 20分休息は一時的回復のみ。昼寝より劣る | — | 実験(n=10) | Hayashi 2004 |
| 10分以内の小休憩 | 活力 d=0.36、疲労 d=0.35 | 長いほど成績効果↑ | メタ | Albulescu 2022 |
| 軽い運動（その場） | 活力↑（疲労改善は弛緩法と差なし） | 20分程度 | RCT | Bennett 2021 |
| 入浴 | 入眠潜時短縮 | 40〜42.5℃、就寝1〜2h前、10分〜 | メタ（時刻部分は2研究36人のみ） | Haghayegh 2019; 厚労省2023 |
| 瞑想 | 睡眠の質：能動的対照比で効果なし | — | メタ（弱） | Rusch 2019 |
| 自然 | 気分：ポジティブ中程度↑、ネガティブ小↓ | 5分〜 | メタ（疲労そのものではない） | McMahan & Estes 2015 |
| 朝の日光 | 体内時計のリセット | 起床後すぐ | ガイド | 厚労省2023 |
| 趣味（熟達） | 消耗感の低さと関連 | — | 観察 | Sonnentag & Fritz 2007 |
| ショート動画・ゲーム | 夜間スマホ→就寝遅延・日中の疲れ。罪悪感があると回復効果↓ | 寝床で使わない | 観察 | Brautsch 2023; Reinecke 2014 |

### 回復経験（Bennett 2018 メタ, 54サンプル N=26,592）

| 回復経験 | 最も強い関連 | アプリでの入力例 |
|---|---|---|
| 心理的切り離し | 疲労↓（最強） | 夜：「今日は仕事を忘れられたか 1〜5」 |
| リラックス | 疲労↓ | 入浴・弛緩法の実施有無 |
| 熟達 | 消耗↓ | 新しいこと・挑戦をしたか |
| コントロール | 活力↑（最強） | 「自分で決めた予定があったか」 |

## 3. 持ち越し・睡眠・運動・喫煙の知見

| 項目 | 知見 | 根拠 | 出典 |
|---|---|---|---|
| 睡眠制限 | 6h以下×14日で最大2晩徹夜相当の注意低下、自覚乏しい | 実験 | Van Dongen 2003 |
| 累積過剰覚醒 | 注意の抜けは 1日約15.84hを超える覚醒の累計にほぼ比例 | 実験 | Van Dongen 2003 |
| 回復睡眠 | 4h×5晩の後、10hの回復睡眠でも一部低下が残る | 実験 | Banks 2010 |
| 翌日活動量 | 3〜4hの削減は活動量↓。3h未満の自主的削減は翌日MVPAと関連なし | 実験/観察 | PNAS 2025 |
| 運動開始 | 週3回20分×6週で活力+20%、疲労 −65%（低強度）/ −49%（中強度） | RCT(n=36) | Puetz 2008 |
| 運動継続 | 疲労 g=−0.37、活力 g=0.42 | メタ | Wender 2022 |
| 運動と睡眠 | その日の運動は当夜の睡眠と関連せず、16週で睡眠+46分（不眠の中高年） | 観察 | Baron 2013 |
| 夜の運動 | 就寝1h以内に終わる激しい運動以外は睡眠を害さない | メタ | Stutz 2019 |
| 運動直後に疲れが増えるか | **直接データなし**（Banisterは初期低下を予測＝理論） | 理論 | — |
| 就寝前ニコチン | 就寝前4h以内：睡眠効率 −1.74pt、夜中の覚醒 +6分 | 観察(785人) | Spadola 2019 |
| 禁煙時 | 離脱による睡眠悪化は1〜3日がピーク、最長約3週間 | レビュー | Jaehne 2009 ほか |

## 4. 疲労スコアモデル仕様（**係数はすべて仮定**）

### 4.1 状態変数

```
fatigue[t]     : 体の疲労（数日単位で減衰）
fitness[t]     : 体力（42日指数平均。負荷の重み付けを下げる）
sleep_debt[t]  : 睡眠負債（累積過剰覚醒ベース、返済は遅い）
sleepiness[t]  : 当日の眠気 = f(sleep_debt, 体内時計(起床9時基準))
```

### 4.2 更新式

```
decay_f = exp(-1 / TAU_FATIGUE)          # TAU_FATIGUE 初期値 7日（仮定）
decay_c = exp(-1 / TAU_FITNESS)          # TAU_FITNESS 初期値 42日（Banisterの慣用値）

load[t]      = W_PHYS(fitness) * phys_load[t] + W_OUTING * outing_hours[t]
recovery[t]  = R_DETACH * detachment[t] + R_CONTROL * control[t]
             + R_NAP * nap_ok[t] + R_LIGHT_ACTIVITY * light_activity[t]

fatigue[t]   = fatigue[t-1] * decay_f + load[t] - recovery[t]
fitness[t]   = fitness[t-1] * decay_c + phys_load[t] * (1 - decay_c)

excess_wake  = max(0, wake_hours[t] - 15.84)
sleep_debt[t]= sleep_debt[t-1] + excess_wake - REPAY_RATE * max(0, sleep_hours[t] - baseline_sleep)
               # REPAY_RATE < 1 : 一晩で完済させない（Banks 2010の定性的知見）
```

### 4.3 入力項目

| 区分 | 項目 | 取得方法 | 根拠 |
|---|---|---|---|
| 足す | 身体負荷 | 歩数 or きつさ(1-10)×分 | Banister（構造のみ） |
| 足す | 外出拘束時間 | 時間 | **仮定（根拠弱）** |
| 足す(眠気) | 就寝前4h以内の喫煙 | Yes/No → 翌日の眠気にペナルティ | Spadola 2019 |
| 足す(眠気) | 寝床でのスマホ | Yes/No | Brautsch 2023 |
| 引く | 昼寝 10〜20分・15時まで | nap_ok=1。約2時間眠気を下げる | Brooks & Lack 2006 |
| 引く | 切り離し(1-5)、コントロール感(1-5) | 夜に入力 | Bennett 2018 |
| 引く | 軽い運動・散歩 | 分 | Puetz 2008 |
| 睡眠の質 | 入浴（就寝1〜2h前） | Yes/No（疲労を直接は引かない） | Haghayegh 2019 |
| 正解データ | 朝の主観疲労 0〜10 | 毎朝1回 | — |

### 4.4 実装上の要件

1. **係数は config に外出し**し、朝の主観疲労（正解ラベル）を使ってユーザーごとに推定・更新する（例：ベイズ更新や正則化回帰）。
2. **負荷ゼロの日を回復最大にしない**。予定なし日の推奨は「散歩20分＋自分で決めた予定1つ」。
3. **ACWR は使わない**。急増の警告は「直近7日の負荷が個人平均＋SDを超えたか」の単純ルール。
4. **推定の不確かさを表示**。データの少ない最初の2〜4週間は幅を広く出す。
5. 推奨メッセージには出典キー（例：`brooks2006`）を紐づけ、根拠の強さ（メタ/RCT/観察/仮定）を表示できるようにする。

## 5. 出典

- Dutheil F, et al. (2021). Effects of a Short Daytime Nap on the Cognitive Performance: A Systematic Review and Meta-Analysis. IJERPH. https://www.mdpi.com/1660-4601/18/19/10212
- Brooks A, Lack L. (2006). A brief afternoon nap following nocturnal sleep restriction: which nap duration is most recuperative? Sleep. https://pubmed.ncbi.nlm.nih.gov/16796222/
- Hayashi M, Chikazawa Y, Hori T. (2004). Short nap versus short rest: recuperative effects during VDT work. Ergonomics. https://www.tandfonline.com/doi/abs/10.1080/00140130412331293346
- Albulescu P, et al. (2022). "Give me a break!" micro-breaks meta-analysis. PLOS ONE. https://journals.plos.org/plosone/article?id=10.1371%2Fjournal.pone.0272460
- Bennett AA, et al. (2021). An experimental test of resource recovery from physical and relaxation work break activities. https://pubmed.ncbi.nlm.nih.gov/34723446
- Haghayegh S, et al. (2019). Before-bedtime passive body heating by warm shower or bath to improve sleep. Sleep Med Rev. https://www.sciencedirect.com/science/article/abs/pii/S1087079218301552
- 厚生労働省 (2023). 健康づくりのための睡眠ガイド2023. https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/kenkou_iryou/kenkou/suimin/index.html
- Rusch HL, et al. (2019). The effect of mindfulness meditation on sleep quality. Ann NY Acad Sci. https://nyaspubs.onlinelibrary.wiley.com/doi/10.1111/nyas.13996
- McMahan EA, Estes D. (2015). The effect of contact with natural environments on positive and negative affect. J Positive Psychology. https://www.tandfonline.com/doi/abs/10.1080/17439760.2014.994224
- Sonnentag S, Fritz C. (2007). The Recovery Experience Questionnaire. J Occup Health Psychol. https://pubmed.ncbi.nlm.nih.gov/17638488/
- Bennett AA, Bakker AB, Field JG. (2018). Recovery from work-related effort: A meta-analysis. J Organ Behav. https://repub.eur.nl/pub/105021
- Wendsche J, Lohmann-Haislah A. (2017). A Meta-Analysis on Antecedents and Outcomes of Detachment from Work. https://www.ncbi.nlm.nih.gov/pmc/articles/PMC5233687/
- Brautsch LAS, et al. (2023). Digital media use and sleep in late adolescence and young adulthood. Sleep Med Rev. https://pubmed.ncbi.nlm.nih.gov/36638702/
- Reinecke L, Hartmann T, Eden A. (2014). The Guilty Couch Potato. J Communication. https://academic.oup.com/joc/article-abstract/64/4/569/4086016
- The Fitness–Fatigue Model: What's in the Numbers? (2022). IJSPP. https://journals.humankinetics.com/view/journals/ijspp/17/5/article-p810.xml
- Impellizzeri FM, et al. (2020). Acute:Chronic Workload Ratio: Conceptual Issues and Fundamental Pitfalls. IJSPP. https://www.semanticscholar.org/paper/ede5743a426fd6429d28f8505500a3f771dbcf8b
- Borbély AA, et al. (2016). The two-process model of sleep regulation: a reappraisal. J Sleep Res. https://doi.org/10.1111/jsr.12371
- Van Dongen HPA, et al. (2003). The Cumulative Cost of Additional Wakefulness. Sleep. https://academic.oup.com/sleep/article-abstract/26/2/117/2709164
- Banks S, et al. (2010). Neurobehavioral Dynamics Following Chronic Sleep Restriction. Sleep. https://pmc.ncbi.nlm.nih.gov/articles/PMC2910531
- (2025). Sleep duration and timing are associated with next-day physical activity. PNAS. https://www.pnas.org/doi/10.1073/pnas.2420846122
- Daily associations between sleep and physical activity: A systematic review and meta-analysis (2021). Sleep Med Rev. https://www.sciencedirect.com/science/article/abs/pii/S1087079221000113
- Baron KG, Reid KJ, Zee PC. (2013). Exercise to improve sleep in insomnia. J Clin Sleep Med. https://pubmed.ncbi.nlm.nih.gov/23946713/
- Kredlow MA, et al. (2015). The effects of physical activity on sleep: a meta-analytic review. J Behav Med. https://link.springer.com/article/10.1007/s10865-015-9617-6
- Stutz J, Eiholzer R, Spengler CM. (2019). Effects of Evening Exercise on Sleep in Healthy Participants. Sports Med. https://link.springer.com/article/10.1007/s40279-018-1015-0
- Puetz TW, Flowers SS, O'Connor PJ. (2008). RCT of aerobic exercise training on energy and fatigue in sedentary young adults. Psychother Psychosom. https://pubmed.ncbi.nlm.nih.gov/18277063/
- The Effect of Chronic Exercise on Energy and Fatigue States: SR & MA of RCTs (2022). https://www.ncbi.nlm.nih.gov/pmc/articles/PMC9206544/
- Spadola CE, et al. (2019). Evening intake of alcohol, caffeine, and nicotine. Sleep. https://academic.oup.com/sleep/article/42/11/zsz136/5535848
- Jaehne A, et al. (2009). Effects of nicotine on sleep during consumption, withdrawal and replacement therapy. Sleep Med Rev. https://pubmed.ncbi.nlm.nih.gov/19345124/

> 注：著者名・年のうち一部（Wender 2022、Atoui 2021、IJSPP 2022論文の著者）は検索結果で未確認のため、上ではタイトル表記にしている。論文等で引用する際はリンク先で確認すること。

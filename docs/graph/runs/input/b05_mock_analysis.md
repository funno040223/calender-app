# バッチ b05_mock_analysis（13 ファイル）

各ファイルの静的ノード（id / 行範囲）。意味ノードのエッジは、ここにある id を参照すること。

## src/lib/mock/habit-miss.test.ts  (kind=test, 47 行, id=module:src/lib/mock/habit-miss.test.ts)
- fn:src/lib/mock/habit-miss.test.ts#past  L10-10
- fn:src/lib/mock/habit-miss.test.ts#data  L11-13

## src/lib/mock/insights.test.ts  (kind=test, 102 行, id=module:src/lib/mock/insights.test.ts)
- fn:src/lib/mock/insights.test.ts#base  L9-9
- fn:src/lib/mock/insights.test.ts#blocks  L13-20

## src/lib/mock/insights.ts  (kind=lib, 299 行, id=module:src/lib/mock/insights.ts)
- type:src/lib/mock/insights.ts#InsightAction  L14-17
- type:src/lib/mock/insights.ts#Insight  L19-26
- const:src/lib/mock/insights.ts#INSIGHT_DAYS  L29-29  = 28
- const:src/lib/mock/insights.ts#MIN_SAMPLES  L31-31  = 10
- const:src/lib/mock/insights.ts#MIN_TASKS  L33-33  = 5
- type:src/lib/mock/insights.ts#Count  L35-38
- fn:src/lib/mock/insights.ts#rate  L39-39
- fn:src/lib/mock/insights.ts#count  L40-40
- fn:src/lib/mock/insights.ts#clearlyHigher  L42-42
- fn:src/lib/mock/insights.ts#ofN  L43-43
- fn:src/lib/mock/insights.ts#hourOf  L44-44
- fn:src/lib/mock/insights.ts#round1  L45-45
- fn:src/lib/mock/insights.ts#median  L46-49
- const:src/lib/mock/insights.ts#BANDS  L52-57  = [ { id: "morning", label: "午前", start: 4 * 60, end: 12 * 60 }, { id: "afternoon"
- fn:src/lib/mock/insights.ts#bandOf  L58-61
- const:src/lib/mock/insights.ts#STRATEGY_LABEL  L63-63  = { standard: "ふつう", early: "前倒し", spread: "分散" }
- const:src/lib/mock/insights.ts#WEEKDAY  L64-64  = ["日", "月", "火", "水", "木", "金", "土"]
- fn:src/lib/mock/insights.ts#reviewed  L67-71
- fn:src/lib/mock/insights.ts#tagOf  L73-74
- fn:src/lib/mock/insights.ts#blockInsight  L77-107
- fn:src/lib/mock/insights.ts#estimateInsight  L110-128
- fn:src/lib/mock/insights.ts#deadlineInsight  L131-145
- fn:src/lib/mock/insights.ts#busyDays  L148-156
- fn:src/lib/mock/insights.ts#nextDayInsight  L159-189
- type:src/lib/mock/insights.ts#Span  L191-194
- fn:src/lib/mock/insights.ts#union  L196-196
- fn:src/lib/mock/insights.ts#smokeInsight  L199-242
- fn:src/lib/mock/insights.ts#habitInsight  L245-275
- fn:src/lib/mock/insights.ts#buildInsights  L278-292
- fn:src/lib/mock/insights.ts#applyInsightAction  L295-299

## src/lib/mock/notion.test.ts  (kind=test, 87 行, id=module:src/lib/mock/notion.test.ts)

## src/lib/mock/notion.ts  (kind=lib, 77 行, id=module:src/lib/mock/notion.ts)
- fn:src/lib/mock/notion.ts#notionDeadline  L7-14
- fn:src/lib/mock/notion.ts#applyNotionRows  L21-66
- fn:src/lib/mock/notion.ts#notionKey  L68-68
- fn:src/lib/mock/notion.ts#deleteTask  L71-77

## src/lib/mock/progress.ts  (kind=lib, 113 行, id=module:src/lib/mock/progress.ts)
- fn:src/lib/mock/progress.ts#confirmedWorkMinutes  L9-11
- fn:src/lib/mock/progress.ts#usedSlotMinutes  L14-16
- fn:src/lib/mock/progress.ts#workedByTask  L19-28
- const:src/lib/mock/progress.ts#LEARN_MIN_SAMPLES  L31-31  = 3
- fn:src/lib/mock/progress.ts#learnedMinutes  L37-53
- fn:src/lib/mock/progress.ts#planTagsOf  L56-59
- fn:src/lib/mock/progress.ts#captureTaskBlocks  L62-70
- fn:src/lib/mock/progress.ts#pendingWork  L72-85
- fn:src/lib/mock/progress.ts#confirmWork  L88-113

## src/lib/mock/recovery.test.ts  (kind=test, 178 行, id=module:src/lib/mock/recovery.test.ts)
- fn:src/lib/mock/recovery.test.ts#data  L14-17

## src/lib/mock/recovery.ts  (kind=lib, 126 行, id=module:src/lib/mock/recovery.ts)
- fn:src/lib/mock/recovery.ts#resetConflicts  L7-16
- fn:src/lib/mock/recovery.ts#resetRhythm  L18-35
- fn:src/lib/mock/recovery.ts#workNowGap  L42-60
- const:src/lib/mock/recovery.ts#WORK_NOW_DAYS  L63-63  = 21
- fn:src/lib/mock/recovery.ts#workNowChoices  L66-77
- fn:src/lib/mock/recovery.ts#workNowHabits  L83-98
- fn:src/lib/mock/recovery.ts#startHabitNow  L101-105
- fn:src/lib/mock/recovery.ts#startWorkNow  L107-113
- fn:src/lib/mock/recovery.ts#defaultPauseEnd  L116-119
- fn:src/lib/mock/recovery.ts#freeNowMinutes  L122-126

## src/lib/mock/related.test.ts  (kind=test, 33 行, id=module:src/lib/mock/related.test.ts)
- fn:src/lib/mock/related.test.ts#out  L8-16
- fn:src/lib/mock/related.test.ts#bands  L17-18

## src/lib/mock/related.ts  (kind=lib, 97 行, id=module:src/lib/mock/related.ts)
- type:src/lib/mock/related.ts#EventSource  L9-9
- type:src/lib/mock/related.ts#EventRef  L11-17
- fn:src/lib/mock/related.ts#allEventRefs  L19-30
- fn:src/lib/mock/related.ts#eventIndex  L32-34
- fn:src/lib/mock/related.ts#tasksByEvent  L37-46
- fn:src/lib/mock/related.ts#blocksOfTask  L48-50
- fn:src/lib/mock/related.ts#formatEventWhen  L53-55
- fn:src/lib/mock/related.ts#groupKeyOf  L58-58
- fn:src/lib/mock/related.ts#formatEventShort  L61-64
- type:src/lib/mock/related.ts#TravelBand  L67-72
- fn:src/lib/mock/related.ts#travelBands  L78-97

## src/lib/mock/review-2026-10-03.test.ts  (kind=test, 114 行, id=module:src/lib/mock/review-2026-10-03.test.ts)

## src/lib/mock/stats.test.ts  (kind=test, 149 行, id=module:src/lib/mock/stats.test.ts)

## src/lib/mock/stats.ts  (kind=lib, 253 行, id=module:src/lib/mock/stats.ts)
- type:src/lib/mock/stats.ts#Data  L7-8
- fn:src/lib/mock/stats.ts#bedOnTime  L11-11
- type:src/lib/mock/stats.ts#BedNight  L13-21
- fn:src/lib/mock/stats.ts#bedNights  L24-33
- fn:src/lib/mock/stats.ts#markValue  L36-37
- fn:src/lib/mock/stats.ts#keepMarkValues  L43-48
- type:src/lib/mock/stats.ts#PeriodStats  L51-56
- fn:src/lib/mock/stats.ts#startsOf  L59-67
- fn:src/lib/mock/stats.ts#periodStats  L70-97
- const:src/lib/mock/stats.ts#REWARD_SOURCES  L101-108  = [ { id: "wake", label: "起床" }, { id: "routine", label: "朝ルーティン" }, { id: "bed", 
- const:src/lib/mock/stats.ts#EMPTY_REWARD_BANK  L110-110  = { until: 0, yen: { wake: 0, routine: 0, bed: 0, habit: 0, task: 0, log: 0 } }
- const:src/lib/mock/stats.ts#BANK_LAG_DAYS  L113-113  = 21
- fn:src/lib/mock/stats.ts#rewardBreakdown  L119-124
- fn:src/lib/mock/stats.ts#bankRewards  L130-136
- fn:src/lib/mock/stats.ts#rewardBreakdownOfLogs  L138-165
- fn:src/lib/mock/stats.ts#rewardEarned  L168-170
- fn:src/lib/mock/stats.ts#mondayOf  L173-173
- fn:src/lib/mock/stats.ts#workMinutes  L179-188
- fn:src/lib/mock/stats.ts#bedStats  L191-210
- fn:src/lib/mock/stats.ts#habitWeeks  L213-222
- fn:src/lib/mock/stats.ts#rewardBalance  L225-225
- fn:src/lib/mock/stats.ts#habitProgress  L231-253


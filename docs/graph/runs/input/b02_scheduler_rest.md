# バッチ b02_scheduler_rest（13 ファイル）

各ファイルの静的ノード（id / 行範囲）。意味ノードのエッジは、ここにある id を参照すること。

## src/lib/scheduler/cue.test.ts  (kind=test, 147 行, id=module:src/lib/scheduler/cue.test.ts)
- fn:src/lib/scheduler/cue.test.ts#cued  L18-27
- fn:src/lib/scheduler/cue.test.ts#on  L28-29

## src/lib/scheduler/evening.test.ts  (kind=test, 132 行, id=module:src/lib/scheduler/evening.test.ts)
- fn:src/lib/scheduler/evening.test.ts#input  L19-19

## src/lib/scheduler/outlook.test.ts  (kind=test, 68 行, id=module:src/lib/scheduler/outlook.test.ts)
- fn:src/lib/scheduler/outlook.test.ts#day  L8-8

## src/lib/scheduler/outlook.ts  (kind=lib, 69 行, id=module:src/lib/scheduler/outlook.ts)
- type:src/lib/scheduler/outlook.ts#OutlookStatus  L4-4
- type:src/lib/scheduler/outlook.ts#WeekOutlook  L6-17
- fn:src/lib/scheduler/outlook.ts#overlap  L19-20
- fn:src/lib/scheduler/outlook.ts#buildOutlook  L23-49
- fn:src/lib/scheduler/outlook.ts#contactDays  L55-69

## src/lib/scheduler/parse.test.ts  (kind=test, 48 行, id=module:src/lib/scheduler/parse.test.ts)
- fn:src/lib/scheduler/parse.test.ts#parse  L7-7

## src/lib/scheduler/parse.ts  (kind=lib, 70 行, id=module:src/lib/scheduler/parse.ts)
- type:src/lib/scheduler/parse.ts#ParsedTask  L3-9
- const:src/lib/scheduler/parse.ts#WEEKDAYS  L11-11  = "日月火水木金土"
- const:src/lib/scheduler/parse.ts#UNTIL  L12-12  = "(?:まで(?:に)?)?"
- fn:src/lib/scheduler/parse.ts#toHalfWidthDigits  L14-16
- fn:src/lib/scheduler/parse.ts#parseQuickAdd  L19-70

## src/lib/scheduler/reset-meals.test.ts  (kind=test, 47 行, id=module:src/lib/scheduler/reset-meals.test.ts)
- fn:src/lib/scheduler/reset-meals.test.ts#afterWake  L10-13

## src/lib/scheduler/reset.ts  (kind=lib, 20 行, id=module:src/lib/scheduler/reset.ts)
- fn:src/lib/scheduler/reset.ts#applyRhythmResets  L5-20

## src/lib/scheduler/review2.test.ts  (kind=test, 219 行, id=module:src/lib/scheduler/review2.test.ts)
- fn:src/lib/scheduler/review2.test.ts#habit  L10-10
- fn:src/lib/scheduler/review2.test.ts#onDay  L13-14

## src/lib/scheduler/rhythm.test.ts  (kind=test, 169 行, id=module:src/lib/scheduler/rhythm.test.ts)

## src/lib/scheduler/rhythm.ts  (kind=lib, 182 行, id=module:src/lib/scheduler/rhythm.ts)
- const:src/lib/scheduler/rhythm.ts#DAY_BEGINS_AT_MINUTE  L6-6  = 4 * 60
- fn:src/lib/scheduler/rhythm.ts#wakingDayStart  L13-15
- type:src/lib/scheduler/rhythm.ts#RawWake  L17-32
- fn:src/lib/scheduler/rhythm.ts#eventsOf  L34-38
- fn:src/lib/scheduler/rhythm.ts#rawWakeOf  L41-78
- fn:src/lib/scheduler/rhythm.ts#latestWakeOfDay  L81-85
- fn:src/lib/scheduler/rhythm.ts#limitDailyShift  L91-96
- const:src/lib/scheduler/rhythm.ts#RAMP_DAYS  L103-103  = 8
- fn:src/lib/scheduler/rhythm.ts#computeDayPlans  L109-117
- fn:src/lib/scheduler/rhythm.ts#computeRange  L119-182

## src/lib/scheduler/shortfall.test.ts  (kind=test, 81 行, id=module:src/lib/scheduler/shortfall.test.ts)

## src/lib/scheduler/test-helpers.ts  (kind=lib, 20 行, id=module:src/lib/scheduler/test-helpers.ts)
- fn:src/lib/scheduler/test-helpers.ts#jst  L4-6
- fn:src/lib/scheduler/test-helpers.ts#baseInput  L8-20


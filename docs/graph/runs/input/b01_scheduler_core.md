# バッチ b01_scheduler_core（8 ファイル）

各ファイルの静的ノード（id / 行範囲）。意味ノードのエッジは、ここにある id を参照すること。

## src/lib/scheduler/dayload.ts  (kind=lib, 37 行, id=module:src/lib/scheduler/dayload.ts)
- type:src/lib/scheduler/dayload.ts#DayLoad  L7-12
- const:src/lib/scheduler/dayload.ts#HEAVY_DAY_EVENTS  L14-14  = 3
- const:src/lib/scheduler/dayload.ts#HEAVY_DAY_HOURS  L15-15  = 4
- fn:src/lib/scheduler/dayload.ts#dayLoadOf  L18-37

## src/lib/scheduler/index.ts  (kind=lib, 7 行, id=module:src/lib/scheduler/index.ts)

## src/lib/scheduler/intervals.ts  (kind=lib, 41 行, id=module:src/lib/scheduler/intervals.ts)
- fn:src/lib/scheduler/intervals.ts#lengthMinutes  L4-6
- fn:src/lib/scheduler/intervals.ts#merge  L8-17
- fn:src/lib/scheduler/intervals.ts#subtract  L20-35
- fn:src/lib/scheduler/intervals.ts#intersect  L37-41

## src/lib/scheduler/planner.test.ts  (kind=test, 489 行, id=module:src/lib/scheduler/planner.test.ts)
- fn:src/lib/scheduler/planner.test.ts#taskBlocks  L9-9

## src/lib/scheduler/planner.ts  (kind=lib, 856 行, id=module:src/lib/scheduler/planner.ts)
- const:src/lib/scheduler/planner.ts#FALLBACK_TASK_MINUTES  L25-25  = 60
- const:src/lib/scheduler/planner.ts#FALLBACK_TAG  L26-31  = { mode: "gap", defaultMinutes: FALLBACK_TASK_MINUTES, minChunkMinutes: 30, maxCh
- const:src/lib/scheduler/planner.ts#EVENING_FROM_MINUTE  L34-34  = 17 * 60
- const:src/lib/scheduler/planner.ts#MIN_TASK_BLOCK_MINUTES  L37-37  = 30
- const:src/lib/scheduler/planner.ts#MIN_GAP_MINUTES  L40-40  = 20
- const:src/lib/scheduler/planner.ts#NORMAL_EVENING_TASK_MINUTES  L42-42  = 60
- const:src/lib/scheduler/planner.ts#LONG_SLOT_MINUTES  L45-45  = 120
- const:src/lib/scheduler/planner.ts#PENALTY  L51-84  = { /** 先の日に回すほど、締切までの余裕が減る */ perDayLater: 0.3, /** 前倒し：先の日に回すほど強く減点する（1日あたり） */ 
- const:src/lib/scheduler/planner.ts#NEAR_ENERGY_RATIO  L86-86  = 0.6
- fn:src/lib/scheduler/planner.ts#avoidIntervalsFor  L89-102
- const:src/lib/scheduler/planner.ts#TASK_LEAD_DAYS  L105-105  = 14
- fn:src/lib/scheduler/planner.ts#fitsIn  L107-109
- fn:src/lib/scheduler/planner.ts#findStart  L112-125
- fn:src/lib/scheduler/planner.ts#overlapMinutes  L127-129
- fn:src/lib/scheduler/planner.ts#estimateMinutes  L131-136
- fn:src/lib/scheduler/planner.ts#plan  L138-821
- fn:src/lib/scheduler/planner.ts#chooseHabitDays  L823-856

## src/lib/scheduler/time.ts  (kind=lib, 33 行, id=module:src/lib/scheduler/time.ts)
- const:src/lib/scheduler/time.ts#MIN  L1-1  = 60_000
- const:src/lib/scheduler/time.ts#DAY_MS  L2-2  = 24 * 60 * MIN
- fn:src/lib/scheduler/time.ts#localDayStart  L5-8
- fn:src/lib/scheduler/time.ts#minuteOfDay  L11-13
- fn:src/lib/scheduler/time.ts#localWeekday  L16-18
- fn:src/lib/scheduler/time.ts#ceilToStep  L21-24
- fn:src/lib/scheduler/time.ts#floorToStep  L26-29
- fn:src/lib/scheduler/time.ts#floorMinutesToStep  L31-33

## src/lib/scheduler/travel.ts  (kind=lib, 42 行, id=module:src/lib/scheduler/travel.ts)
- const:src/lib/scheduler/travel.ts#ONLINE  L3-3  = /https?:\/\/|zoom|meet\.google|teams|webex|オンライン|online/i
- const:src/lib/scheduler/travel.ts#MEETING_LINK  L5-5  = /zoom\.us|meet\.google|teams\.microsoft|teams\.live|webex/i
- const:src/lib/scheduler/travel.ts#TRAVEL_NOTE  L7-7  = /移動\s*(\d+)/
- type:src/lib/scheduler/travel.ts#TravelInfo  L9-14
- const:src/lib/scheduler/travel.ts#HOME  L16-16  = { atHome: true, minutes: 0, unknown: false }
- fn:src/lib/scheduler/travel.ts#resolveTravel  L19-36
- fn:src/lib/scheduler/travel.ts#needsPrep  L39-42

## src/lib/scheduler/types.ts  (kind=lib, 396 行, id=module:src/lib/scheduler/types.ts)
- type:src/lib/scheduler/types.ts#Interval  L2-5
- type:src/lib/scheduler/types.ts#CalendarEvent  L7-29
- type:src/lib/scheduler/types.ts#Place  L31-37
- type:src/lib/scheduler/types.ts#TaskStrategy  L39-39
- type:src/lib/scheduler/types.ts#Settings  L41-87
- type:src/lib/scheduler/types.ts#AvoidWindow  L90-104
- const:src/lib/scheduler/types.ts#DEFAULT_SETTINGS  L106-129  = { tzOffsetMinutes: 540, planningDays: 14, sleepMinutes: 7 * 60, prepMinutes: 40,
- type:src/lib/scheduler/types.ts#HabitFrequency  L133-139
- type:src/lib/scheduler/types.ts#HabitCue  L146-154
- const:src/lib/scheduler/types.ts#MEAL_GAP_MINUTES  L157-157  = 180
- const:src/lib/scheduler/types.ts#MEAL_LATE_MINUTES  L159-159  = 120
- const:src/lib/scheduler/types.ts#CUE_GAP_MINUTES  L162-162  = 5
- const:src/lib/scheduler/types.ts#CUE_SLACK_MINUTES  L164-164  = 30
- type:src/lib/scheduler/types.ts#Habit  L166-208
- type:src/lib/scheduler/types.ts#PlacementMode  L211-211
- type:src/lib/scheduler/types.ts#Tag  L213-224
- type:src/lib/scheduler/types.ts#TaskTiming  L227-227
- type:src/lib/scheduler/types.ts#Task  L229-252
- type:src/lib/scheduler/types.ts#BlockKind  L254-254
- type:src/lib/scheduler/types.ts#Block  L256-264
- type:src/lib/scheduler/types.ts#WakeSource  L266-266
- type:src/lib/scheduler/types.ts#DayPlan  L268-294
- type:src/lib/scheduler/types.ts#EveningEnergy  L297-297
- type:src/lib/scheduler/types.ts#TravelQuestion  L299-302
- type:src/lib/scheduler/types.ts#Shortfall  L304-309
- type:src/lib/scheduler/types.ts#RecoveryOption  L312-319
- type:src/lib/scheduler/types.ts#DayEnergy  L321-331
- type:src/lib/scheduler/types.ts#SkippedHabit  L333-337
- type:src/lib/scheduler/types.ts#PlanInput  L339-369
- type:src/lib/scheduler/types.ts#PlanResult  L371-388
- type:src/lib/scheduler/types.ts#RhythmReset  L391-396


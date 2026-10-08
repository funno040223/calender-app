# バッチ b03_mock_model（8 ファイル）

各ファイルの静的ノード（id / 行範囲）。意味ノードのエッジは、ここにある id を参照すること。

## src/lib/mock/calendars.ts  (kind=lib, 23 行, id=module:src/lib/mock/calendars.ts)
- type:src/lib/mock/calendars.ts#CalendarId  L1-1
- type:src/lib/mock/calendars.ts#OwnCalendarId  L4-4
- type:src/lib/mock/calendars.ts#CalendarDef  L6-11
- const:src/lib/mock/calendars.ts#CALENDARS  L13-21  = [ { id: "own", name: "予定", colorVar: "var(--cal-own)" }, { id: "play", name: "遊び
- const:src/lib/mock/calendars.ts#OWN_CALENDARS  L23-23  = CALENDARS.filter((c): c is CalendarDef & { id: OwnCalendarId } => c.id === "own"

## src/lib/mock/jst.ts  (kind=lib, 100 行, id=module:src/lib/mock/jst.ts)
- const:src/lib/mock/jst.ts#TZ  L5-5  = DEFAULT_SETTINGS.tzOffsetMinutes
- const:src/lib/mock/jst.ts#OFFSET  L6-6  = TZ * MIN
- fn:src/lib/mock/jst.ts#dayStartOf  L10-10
- fn:src/lib/mock/jst.ts#weekdayOf  L12-12
- fn:src/lib/mock/jst.ts#toFc  L18-18
- fn:src/lib/mock/jst.ts#fromFc  L19-19
- fn:src/lib/mock/jst.ts#pad  L21-21
- fn:src/lib/mock/jst.ts#parts  L22-32
- const:src/lib/mock/jst.ts#WEEKDAY_JA  L34-34  = "日月火水木金土"
- fn:src/lib/mock/jst.ts#jstTime  L37-37
- fn:src/lib/mock/jst.ts#toInputDateTime  L40-43
- fn:src/lib/mock/jst.ts#toInputDate  L44-46
- fn:src/lib/mock/jst.ts#fromInputDateTime  L47-51
- fn:src/lib/mock/jst.ts#toInputTime  L54-57
- fn:src/lib/mock/jst.ts#fromInputTime  L62-68
- fn:src/lib/mock/jst.ts#formatTime  L70-73
- fn:src/lib/mock/jst.ts#formatDate  L74-77
- fn:src/lib/mock/jst.ts#formatDateTime  L78-80
- fn:src/lib/mock/jst.ts#formatDeadline  L82-86
- fn:src/lib/mock/jst.ts#formatMinutes  L87-92
- fn:src/lib/mock/jst.ts#newId  L94-100

## src/lib/mock/model.test.ts  (kind=test, 148 行, id=module:src/lib/mock/model.test.ts)

## src/lib/mock/model.ts  (kind=lib, 499 行, id=module:src/lib/mock/model.ts)
- type:src/lib/mock/model.ts#DateKey  L13-13
- type:src/lib/mock/model.ts#OwnEvent  L19-19
- type:src/lib/mock/model.ts#Period  L22-27
- type:src/lib/mock/model.ts#Course  L33-52
- type:src/lib/mock/model.ts#ClassEvent  L55-61
- fn:src/lib/mock/model.ts#courseTimes  L64-71
- type:src/lib/mock/model.ts#TreatCategory  L73-73
- const:src/lib/mock/model.ts#TREAT_CATEGORIES  L75-80  = [ { id: "adventure", label: "小さな冒険" }, { id: "food", label: "食べ物・飲み物" }, { id: "
- type:src/lib/mock/model.ts#Treat  L83-93
- type:src/lib/mock/model.ts#RoutineStep  L96-99
- type:src/lib/mock/model.ts#WakeLog  L102-117
- type:src/lib/mock/model.ts#NotionConfig  L119-129
- const:src/lib/mock/model.ts#NOTION_TASK_PREFIX  L131-131  = "notion-"
- type:src/lib/mock/model.ts#WeatherPlace  L133-137
- const:src/lib/mock/model.ts#RAIN_THRESHOLD  L139-139  = 60
- type:src/lib/mock/model.ts#TaskBlockLog  L141-151
- type:src/lib/mock/model.ts#DoneTask  L152-160
- type:src/lib/mock/model.ts#TaskCheck  L161-169
- fn:src/lib/mock/model.ts#taskCheckKey  L170-170
- type:src/lib/mock/model.ts#RewardSpend  L171-176
- type:src/lib/mock/model.ts#RewardRates  L182-189
- const:src/lib/mock/model.ts#DEFAULT_REWARD_RATES  L190-190  = { wake: 30, routine: 30, habit: 30, task: 100, bed: 30, log: 10 }
- type:src/lib/mock/model.ts#BedLog  L192-196
- fn:src/lib/mock/model.ts#taskBlockKey  L197-197
- type:src/lib/mock/model.ts#HabitMark  L199-199
- type:src/lib/mock/model.ts#ContactAnswer  L200-200
- const:src/lib/mock/model.ts#CONTACT_ANSWERS  L201-201  = ["done", "skip"]
- const:src/lib/mock/model.ts#HABIT_MARKS  L202-202  = ["done", "five"]
- fn:src/lib/mock/model.ts#allowsFive  L207-207
- type:src/lib/mock/model.ts#MorningFatigue  L209-209
- type:src/lib/mock/model.ts#RewardSource  L216-216
- type:src/lib/mock/model.ts#RewardBank  L217-221
- type:src/lib/mock/model.ts#DayLog  L223-239
- type:src/lib/mock/model.ts#HealthSleep  L242-248
- type:src/lib/mock/model.ts#EnergyCheck  L250-255
- type:src/lib/mock/model.ts#MockData  L257-340
- fn:src/lib/mock/model.ts#dateKeyOf  L344-344
- fn:src/lib/mock/model.ts#dayStartOfKey  L345-345
- fn:src/lib/mock/model.ts#dayNumberOf  L347-347
- const:src/lib/mock/model.ts#MAX_TERM_DAYS  L352-352  = 400
- fn:src/lib/mock/model.ts#classEventId  L354-354
- fn:src/lib/mock/model.ts#parseClassEventId  L356-359
- fn:src/lib/mock/model.ts#buildClassEvents  L362-391
- fn:src/lib/mock/model.ts#classEventsForPlan  L394-398
- fn:src/lib/mock/model.ts#hashString  L402-409
- fn:src/lib/mock/model.ts#mulberry32  L411-420
- fn:src/lib/mock/model.ts#permutation  L422-430
- fn:src/lib/mock/model.ts#treatIndexFor  L436-448
- fn:src/lib/mock/model.ts#treatFor  L451-456
- fn:src/lib/mock/model.ts#wakeStreak  L461-470
- fn:src/lib/mock/model.ts#pad  L474-474
- fn:src/lib/mock/model.ts#minutesToHHMM  L477-480
- fn:src/lib/mock/model.ts#hhmmToMinutes  L482-487
- fn:src/lib/mock/model.ts#formatMinuteOfDay  L490-494
- fn:src/lib/mock/model.ts#spanFrom  L497-499

## src/lib/mock/sample.ts  (kind=lib, 328 行, id=module:src/lib/mock/sample.ts)
- const:src/lib/mock/sample.ts#SAMPLE_PLACES  L9-11  = [ { id: "place-univ", name: "本郷キャンパス", keywords: ["本郷", "東大", "大学", "キャンパス", "研究
- const:src/lib/mock/sample.ts#SAMPLE_TAGS  L13-16  = [ { id: "tag-focus", name: "集中", mode: "focus", defaultMinutes: 90, minChunkMinu
- const:src/lib/mock/sample.ts#BATH  L20-30  = { id: "habit-bath", name: "入浴", durationMinutes: 30, windowStart: -150, windowEn
- const:src/lib/mock/sample.ts#WALK_TIMES  L33-38  = { windowStart: 0, windowEnd: 150, anchor: "wake", rainAlternative: { title: "窓際で
- fn:src/lib/mock/sample.ts#homeExerciseHabit  L45-57
- const:src/lib/mock/sample.ts#BREAKFAST_HABIT  L60-71  = { id: "habit-breakfast", name: "朝食", durationMinutes: 15, windowStart: 0, window
- const:src/lib/mock/sample.ts#WALK_CUE  L74-74  = { type: "habit", habitId: "habit-breakfast", orElse: { type: "routine" } } as co
- const:src/lib/mock/sample.ts#COOK_CUES  L76-79  = { "habit-cook-lunch": { type: "beforeHabit", habitId: "habit-lunch" }, "habit-co
- const:src/lib/mock/sample.ts#GROWTH_HABIT  L82-91  = { id: "habit-growth", track: true, name: "自己成長（読書・勉強など）", durationMinutes: 90, w
- const:src/lib/mock/sample.ts#SAMPLE_HABITS  L93-187  = [ // 昼食は30分で十分。食後30分の休憩は集中系だけ避ける（合わせて1時間）。多少遅れてもよいので幅は広め { id: "habit-lunch", na
- const:src/lib/mock/sample.ts#SAMPLE_RECOVERY_OPTIONS  L190-197  = [ // 根拠は docs/research/fatigue-recovery-research.md。ゲーム・動画は疲れが取れないので候補にしない // 昼寝
- const:src/lib/mock/sample.ts#SAMPLE_AVOID_WINDOWS  L199-201  = [ { id: "avoid-holiday-morning", label: "休日の午前", start: 9 * 60, end: 12 * 60, ha
- fn:src/lib/mock/sample.ts#at  L203-203
- const:src/lib/mock/sample.ts#SAMPLE_PERIODS  L206-206  = UTOKYO_PERIODS.map((p) => ({ ...p }))
- fn:src/lib/mock/sample.ts#buildSampleCourses  L209-232
- const:src/lib/mock/sample.ts#SAMPLE_TREATS  L238-261  = [ { id: "treat-nezu", name: "根津神社まで歩いて、境内をひと回り", category: "adventure", outdoor:
- const:src/lib/mock/sample.ts#SAMPLE_ROUTINE_STEPS  L267-271  = [ { id: "step-stretch-bed", title: "布団の中で大きく伸びをして起き上がる" }, { id: "step-curtain",
- const:src/lib/mock/sample.ts#MONDAY_CLASS  L274-284  = { id: "course-mon34", name: "月3・4限の授業", weekday: 1, startMinute: 13 * 60, endMin
- fn:src/lib/mock/sample.ts#buildSampleOwnEvents  L286-307
- fn:src/lib/mock/sample.ts#buildSampleTasks  L309-328

## src/lib/mock/state.test.ts  (kind=test, 122 行, id=module:src/lib/mock/state.test.ts)

## src/lib/mock/state.ts  (kind=lib, 743 行, id=module:src/lib/mock/state.ts)
- type:src/lib/mock/state.ts#MockState  L32-40
- const:src/lib/mock/state.ts#TAGS  L46-46  = SAMPLE_TAGS
- const:src/lib/mock/state.ts#DATA_KEYS  L48-93  = [ "version", "rhythmResets", "keepFree", "settings", "places", "periods", "cours
- const:src/lib/mock/state.ts#ALL_DATA_KEYS_LISTED  L96-96  = true
- fn:src/lib/mock/state.ts#normalizeSettings  L99-103
- fn:src/lib/mock/state.ts#sampleData  L105-150
- const:src/lib/mock/state.ts#MIGRATIONS  L156-173  = [ "2026-09-29-walk-keeplast", "2026-09-29-growth", "2026-09-29-home-exercise", "
- const:src/lib/mock/state.ts#OLD_ROUTINE_IDS  L176-176  = "step-curtain,step-water,step-wash-face,step-stretch,step-check-plan"
- const:src/lib/mock/state.ts#OLD_TREAT_IDS  L177-177  = "treat-bread,treat-coffee-good,treat-sweets,treat-game,treat-video,treat-manga,t
- const:src/lib/mock/state.ts#FAVORITES_TREAT_IDS  L179-179  = "treat-kanikama,treat-cocoa,treat-banana-shake,treat-sweet-drink,treat-pasta,tre
- const:src/lib/mock/state.ts#OLD_SAMPLE_PERIODS  L182-189  = [ [1, 9 * 60, 10 * 60 + 30], [2, 10 * 60 + 40, 12 * 60 + 10], [3, 13 * 60, 14 * 
- const:src/lib/mock/state.ts#TRACK_MORE  L191-191  = ["habit-walk", GROWTH_HABIT.id, "habit-tidy", "habit-laundry", "habit-cook-lunch
- const:src/lib/mock/state.ts#TRACK_MEALS_BATH  L193-193  = [BREAKFAST_HABIT.id, "habit-lunch", "habit-dinner", "habit-bath"]
- const:src/lib/mock/state.ts#DRINK_ROUTINE_IDS  L195-195  = "step-stretch-bed,step-curtain,step-water,step-drink"
- fn:src/lib/mock/state.ts#migrate  L197-274
- fn:src/lib/mock/state.ts#isRecord  L276-276
- fn:src/lib/mock/state.ts#parseHabitLogs  L278-287
- const:src/lib/mock/state.ts#EVENING_LEVELS  L289-289  = ["high", "normal", "low"]
- fn:src/lib/mock/state.ts#migrateHabit  L295-302
- fn:src/lib/mock/state.ts#isArray  L304-304
- fn:src/lib/mock/state.ts#arr  L305-305
- fn:src/lib/mock/state.ts#fromStoredV2  L308-460
- fn:src/lib/mock/state.ts#migrateV1  L466-479
- fn:src/lib/mock/state.ts#toData  L481-485
- fn:src/lib/mock/state.ts#planEvents  L488-495
- fn:src/lib/mock/state.ts#replan  L498-588
- const:src/lib/mock/state.ts#LOG_KEEP_DAYS  L591-591  = 400
- fn:src/lib/mock/state.ts#pruneOldLogs  L594-616
- fn:src/lib/mock/state.ts#parseRewardBank  L618-623
- const:src/lib/mock/state.ts#DAY_LOG_DAYS  L626-626  = 120
- fn:src/lib/mock/state.ts#captureDayLog  L632-662
- fn:src/lib/mock/state.ts#contactDaysFor  L666-671
- fn:src/lib/mock/state.ts#keepBlockFree  L678-681
- fn:src/lib/mock/state.ts#missHabitBlock  L684-689
- fn:src/lib/mock/state.ts#releaseKeepFree  L692-694
- fn:src/lib/mock/state.ts#completeTask  L696-701
- fn:src/lib/mock/state.ts#travelAsks  L707-719
- const:src/lib/mock/state.ts#FORECAST_FRESH_MS  L722-722  = 24 * 60 * 60_000
- fn:src/lib/mock/state.ts#rainyDayKeys  L725-732
- fn:src/lib/mock/state.ts#byHabit  L735-743

## src/lib/mock/utokyo.ts  (kind=lib, 72 行, id=module:src/lib/mock/utokyo.ts)
- const:src/lib/mock/utokyo.ts#UTOKYO_PERIODS  L10-17  = [ { number: 1, start: 8 * 60 + 30, end: 10 * 60 + 15 }, { number: 2, start: 10 *
- type:src/lib/mock/utokyo.ts#Term  L19-26
- const:src/lib/mock/utokyo.ts#UTOKYO_TERMS  L29-36  = [ { id: "2026-S1", label: "S1", start: "2026-04-06", end: "2026-06-03" }, { id: 
- const:src/lib/mock/utokyo.ts#UTOKYO_NO_CLASS_DAYS  L43-67  = new Set([ // ゴールデンウィーク（5/4 みどりの日・5/5 こどもの日・5/6 振替休日） "2026-05-04", "2026-05-05",
- fn:src/lib/mock/utokyo.ts#currentSemester  L70-72


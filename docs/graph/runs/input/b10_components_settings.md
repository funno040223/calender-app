# バッチ b10_components_settings（20 ファイル）

各ファイルの静的ノード（id / 行範囲）。意味ノードのエッジは、ここにある id を参照すること。

## src/components/settings/AvoidWindows.tsx  (kind=component, 134 行, id=module:src/components/settings/AvoidWindows.tsx)
- const:src/components/settings/AvoidWindows.tsx#WEEK  L11-11  = [1, 2, 3, 4, 5, 6, 0]
- type:src/components/settings/AvoidWindows.tsx#DayType  L12-12
- const:src/components/settings/AvoidWindows.tsx#DAY_TYPES  L13-17  = [ { value: "all", label: "毎日" }, { value: "holiday", label: "休日だけ" }, { value: "
- fn:src/components/settings/AvoidWindows.tsx#AvoidForm  L19-110
- fn:src/components/settings/AvoidWindows.tsx#summary  L112-117
- fn:src/components/settings/AvoidWindows.tsx#AvoidWindows  L119-134

## src/components/settings/BasicSettings.tsx  (kind=component, 109 行, id=module:src/components/settings/BasicSettings.tsx)
- type:src/components/settings/BasicSettings.tsx#NumKey  L8-10
- type:src/components/settings/BasicSettings.tsx#MinutesField  L12-18
- const:src/components/settings/BasicSettings.tsx#ENERGY_FIELDS  L21-26  = [ { key: "dailyEnergyBudget", label: "1日の上限", min: 1, max: 30, step: 0.5 }, { ke
- const:src/components/settings/BasicSettings.tsx#GROUPS  L28-54  = [ { title: "睡眠と朝", fields: [ { key: "sleepMinutes", label: "寝床の時間", min: 240, ma
- fn:src/components/settings/BasicSettings.tsx#BasicSettings  L56-109

## src/components/settings/CalendarColors.tsx  (kind=component, 54 行, id=module:src/components/settings/CalendarColors.tsx)
- const:src/components/settings/CalendarColors.tsx#CALENDAR_PALETTE  L8-8  = ["#007aff", "#5856d6", "#af52de", "#ff2d55", "#ff3b30", "#ff9500", "#ffcc00", "#
- fn:src/components/settings/CalendarColors.tsx#CalendarColors  L11-54

## src/components/settings/CalendarSources.tsx  (kind=component, 122 行, id=module:src/components/settings/CalendarSources.tsx)
- fn:src/components/settings/CalendarSources.tsx#AddForm  L10-52
- fn:src/components/settings/CalendarSources.tsx#CalendarSources  L54-122

## src/components/settings/EditSheet.tsx  (kind=component, 61 行, id=module:src/components/settings/EditSheet.tsx)
- fn:src/components/settings/EditSheet.tsx#EditSheet  L8-45
- fn:src/components/settings/EditSheet.tsx#Field  L48-56
- fn:src/components/settings/EditSheet.tsx#upsert  L59-61

## src/components/settings/Feed.tsx  (kind=component, 109 行, id=module:src/components/settings/Feed.tsx)
- fn:src/components/settings/Feed.tsx#Feed  L8-109

## src/components/settings/Habits.tsx  (kind=component, 465 行, id=module:src/components/settings/Habits.tsx)
- type:src/components/settings/Habits.tsx#Draft  L12-38
- fn:src/components/settings/Habits.tsx#num  L40-40
- fn:src/components/settings/Habits.tsx#valid  L41-41
- fn:src/components/settings/Habits.tsx#HabitForm  L43-386
- fn:src/components/settings/Habits.tsx#summary  L388-422
- fn:src/components/settings/Habits.tsx#progressLabel  L425-428
- fn:src/components/settings/Habits.tsx#Habits  L430-452
- fn:src/components/settings/Habits.tsx#refersTo  L454-455
- fn:src/components/settings/Habits.tsx#withoutCue  L458-465

## src/components/settings/Health.tsx  (kind=component, 122 行, id=module:src/components/settings/Health.tsx)
- fn:src/components/settings/Health.tsx#Health  L10-122

## src/components/settings/Notifications.tsx  (kind=component, 85 行, id=module:src/components/settings/Notifications.tsx)
- fn:src/components/settings/Notifications.tsx#Notifications  L8-85

## src/components/settings/Notion.tsx  (kind=component, 287 行, id=module:src/components/settings/Notion.tsx)
- fn:src/components/settings/Notion.tsx#Notion  L28-287

## src/components/settings/Places.tsx  (kind=component, 79 行, id=module:src/components/settings/Places.tsx)
- fn:src/components/settings/Places.tsx#splitKeywords  L10-14
- fn:src/components/settings/Places.tsx#PlaceForm  L16-56
- fn:src/components/settings/Places.tsx#Places  L58-79

## src/components/settings/Rewards.tsx  (kind=component, 30 行, id=module:src/components/settings/Rewards.tsx)
- const:src/components/settings/Rewards.tsx#ROWS  L7-14  = [ { k: "wake", label: "起床" }, { k: "routine", label: "朝ルーティン" }, { k: "habit", l
- fn:src/components/settings/Rewards.tsx#Rewards  L17-30

## src/components/settings/RoutineSteps.tsx  (kind=component, 90 行, id=module:src/components/settings/RoutineSteps.tsx)
- fn:src/components/settings/RoutineSteps.tsx#StepRow  L9-58
- fn:src/components/settings/RoutineSteps.tsx#RoutineSteps  L60-90

## src/components/settings/SettingsScreen.tsx  (kind=component, 90 行, id=module:src/components/settings/SettingsScreen.tsx)
- const:src/components/settings/SettingsScreen.tsx#SYNC_LABEL  L13-18  = { loading: "サーバーから読み込み中…", synced: "サーバーに保存済み", saving: "保存中…", offline: "サーバーに接
- fn:src/components/settings/SettingsScreen.tsx#SettingsScreen  L20-90

## src/components/settings/SettingsSection.tsx  (kind=component, 60 行, id=module:src/components/settings/SettingsSection.tsx)
- const:src/components/settings/SettingsSection.tsx#BODY  L22-39  = { calendars: CalendarSources, notifications: Notifications, feed: Feed, tags: Ta
- fn:src/components/settings/SettingsSection.tsx#SettingsSection  L41-60

## src/components/settings/Tags.tsx  (kind=component, 42 行, id=module:src/components/settings/Tags.tsx)
- fn:src/components/settings/Tags.tsx#Tags  L10-42

## src/components/settings/Timetable.tsx  (kind=component, 256 行, id=module:src/components/settings/Timetable.tsx)
- const:src/components/settings/Timetable.tsx#WEEK  L12-12  = [1, 2, 3, 4, 5, 6, 0]
- fn:src/components/settings/Timetable.tsx#PeriodsGroup  L14-54
- type:src/components/settings/Timetable.tsx#Draft  L56-68
- fn:src/components/settings/Timetable.tsx#CourseForm  L70-214
- fn:src/components/settings/Timetable.tsx#Timetable  L216-255

## src/components/settings/Treats.tsx  (kind=component, 99 行, id=module:src/components/settings/Treats.tsx)
- fn:src/components/settings/Treats.tsx#TreatForm  L10-69
- fn:src/components/settings/Treats.tsx#Treats  L71-99

## src/components/settings/Weather.tsx  (kind=component, 80 行, id=module:src/components/settings/Weather.tsx)
- fn:src/components/settings/Weather.tsx#Weather  L11-80

## src/components/settings/sections.ts  (kind=component, 20 行, id=module:src/components/settings/sections.ts)
- type:src/components/settings/sections.ts#SectionId  L1-1
- const:src/components/settings/sections.ts#SECTIONS  L3-20  = { calendars: { title: "Google カレンダー", summary: "iCal で予定を取り込む" }, timetable: { t


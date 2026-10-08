# バッチ b11_components_misc（12 ファイル）

各ファイルの静的ノード（id / 行範囲）。意味ノードのエッジは、ここにある id を参照すること。

## src/components/app/AppShell.tsx  (kind=component, 353 行, id=module:src/components/app/AppShell.tsx)
- const:src/components/app/AppShell.tsx#TABS  L23-29  = [ { href: "/", label: "今日", Icon: TodayIcon }, { href: "/calendar", label: "カレンダ
- const:src/components/app/AppShell.tsx#WEATHER_REFRESH_MS  L32-32  = 3 * 60 * 60 * 1000
- const:src/components/app/AppShell.tsx#RETRY_MS  L34-34  = 10 * 60 * 1000
- fn:src/components/app/AppShell.tsx#isActive  L36-36
- const:src/components/app/AppShell.tsx#TOAST_MS  L39-39  = 5000
- fn:src/components/app/AppShell.tsx#whenOf  L42-46
- fn:src/components/app/AppShell.tsx#habitPlacementOf  L49-52
- fn:src/components/app/AppShell.tsx#placementOf  L55-66
- fn:src/components/app/AppShell.tsx#Badge  L68-75
- fn:src/components/app/AppShell.tsx#AppShell  L77-353

## src/components/app/AppShellLoader.tsx  (kind=component, 16 行, id=module:src/components/app/AppShellLoader.tsx)
- fn:src/components/app/AppShellLoader.tsx#AppShellLoader  L14-16

## src/components/app/OfflineNotice.tsx  (kind=component, 27 行, id=module:src/components/app/OfflineNotice.tsx)
- fn:src/components/app/OfflineNotice.tsx#subscribe  L5-12
- fn:src/components/app/OfflineNotice.tsx#OfflineNotice  L15-27

## src/components/app/ServiceWorker.tsx  (kind=component, 27 行, id=module:src/components/app/ServiceWorker.tsx)
- fn:src/components/app/ServiceWorker.tsx#ServiceWorker  L10-27

## src/components/app/StoreProvider.tsx  (kind=component, 19 行, id=module:src/components/app/StoreProvider.tsx)
- type:src/components/app/StoreProvider.tsx#AppContextValue  L6-11
- const:src/components/app/StoreProvider.tsx#AppContext  L13-13  = createContext<AppContextValue | null>(null)
- fn:src/components/app/StoreProvider.tsx#useApp  L15-19

## src/components/app/icons.tsx  (kind=component, 65 行, id=module:src/components/app/icons.tsx)
- fn:src/components/app/icons.tsx#TodayIcon  L15-22
- fn:src/components/app/icons.tsx#CalendarIcon  L24-31
- fn:src/components/app/icons.tsx#TasksIcon  L33-39
- fn:src/components/app/icons.tsx#StatsIcon  L41-47
- fn:src/components/app/icons.tsx#SettingsIcon  L49-56
- fn:src/components/app/icons.tsx#LinkIcon  L59-65

## src/components/stats/StatsScreen.test.tsx  (kind=test, 60 行, id=module:src/components/stats/StatsScreen.test.tsx)
- fn:src/components/stats/StatsScreen.test.tsx#withBlocks  L17-28
- fn:src/components/stats/StatsScreen.test.tsx#Harness  L30-37

## src/components/stats/StatsScreen.tsx  (kind=component, 490 行, id=module:src/components/stats/StatsScreen.tsx)
- fn:src/components/stats/StatsScreen.tsx#yen  L24-24
- fn:src/components/stats/StatsScreen.tsx#Insights  L27-61
- fn:src/components/stats/StatsScreen.tsx#fmtN  L64-64
- fn:src/components/stats/StatsScreen.tsx#dayNum  L65-65
- const:src/components/stats/StatsScreen.tsx#WEEKDAYS  L67-67  = ["月", "火", "水", "木", "金", "土", "日"]
- fn:src/components/stats/StatsScreen.tsx#Summary  L70-101
- const:src/components/stats/StatsScreen.tsx#SOURCE_COLOR  L103-110  = { wake: "var(--cal-routine)", routine: "var(--cal-own)", bed: "var(--cal-google)
- fn:src/components/stats/StatsScreen.tsx#Reward  L113-197
- fn:src/components/stats/StatsScreen.tsx#HabitDot  L200-207
- fn:src/components/stats/StatsScreen.tsx#Habits  L210-255
- fn:src/components/stats/StatsScreen.tsx#Work  L258-313
- const:src/components/stats/StatsScreen.tsx#FATIGUE_LABEL  L315-315  = ["", "元気", "少し", "ふつう", "かなり", "ぐったり"]
- fn:src/components/stats/StatsScreen.tsx#Fatigue  L318-354
- fn:src/components/stats/StatsScreen.tsx#Nights  L360-418
- fn:src/components/stats/StatsScreen.tsx#Smoking  L421-468
- fn:src/components/stats/StatsScreen.tsx#StatsScreen  L470-490

## src/components/tasks/TaskForm.tsx  (kind=component, 350 行, id=module:src/components/tasks/TaskForm.tsx)
- type:src/components/tasks/TaskForm.tsx#DurationMode  L12-12
- type:src/components/tasks/TaskForm.tsx#Draft  L14-30
- fn:src/components/tasks/TaskForm.tsx#toDraft  L32-54
- const:src/components/tasks/TaskForm.tsx#PRIORITIES  L56-60  = [ { value: 1 as const, label: "低" }, { value: 2 as const, label: "中" }, { value:
- fn:src/components/tasks/TaskForm.tsx#Label  L62-64
- fn:src/components/tasks/TaskForm.tsx#TaskForm  L66-349

## src/components/tasks/TasksScreen.tsx  (kind=component, 189 行, id=module:src/components/tasks/TasksScreen.tsx)
- const:src/components/tasks/TasksScreen.tsx#STATUS  L13-17  = { ok: { label: "順調", cls: "bg-ok/15 text-ok" }, tight: { label: "きつい", cls: "bg-
- fn:src/components/tasks/TasksScreen.tsx#Outlook  L20-54
- fn:src/components/tasks/TasksScreen.tsx#OutlookDays  L57-91
- fn:src/components/tasks/TasksScreen.tsx#TasksScreen  L93-189

## src/components/ui/Sheet.tsx  (kind=component, 52 行, id=module:src/components/ui/Sheet.tsx)
- fn:src/components/ui/Sheet.tsx#Sheet  L6-52

## src/components/ui/controls.tsx  (kind=component, 371 行, id=module:src/components/ui/controls.tsx)
- const:src/components/ui/controls.tsx#inputBase  L7-7  = "min-w-0 rounded-lg border border-line bg-surface2 px-3 py-2 text-[16px] outline
- const:src/components/ui/controls.tsx#inputCls  L8-8  = `w-full ${inputBase}`
- const:src/components/ui/controls.tsx#btnPrimary  L11-11  = "press rounded-xl bg-tint px-4 py-2.5 text-[15px] font-semibold text-on-tint dis
- const:src/components/ui/controls.tsx#btnSecondary  L13-13  = "press rounded-xl bg-surface2 px-4 py-2.5 text-[15px] font-medium text-fg disabl
- fn:src/components/ui/controls.tsx#pillCls  L15-16
- fn:src/components/ui/controls.tsx#ScreenHeader  L19-43
- fn:src/components/ui/controls.tsx#Group  L46-56
- fn:src/components/ui/controls.tsx#Card  L59-85
- fn:src/components/ui/controls.tsx#Chevron  L87-93
- fn:src/components/ui/controls.tsx#Row  L96-131
- fn:src/components/ui/controls.tsx#FieldRow  L134-144
- fn:src/components/ui/controls.tsx#Segmented  L146-185
- fn:src/components/ui/controls.tsx#Switch  L187-197
- fn:src/components/ui/controls.tsx#Chip  L200-213
- fn:src/components/ui/controls.tsx#NumberInput  L219-282
- fn:src/components/ui/controls.tsx#TimeInput  L285-317
- fn:src/components/ui/controls.tsx#DangerButton  L320-332
- fn:src/components/ui/controls.tsx#PrimaryButton  L334-355
- fn:src/components/ui/controls.tsx#EmptyNote  L357-359
- fn:src/components/ui/controls.tsx#AddRow  L362-371


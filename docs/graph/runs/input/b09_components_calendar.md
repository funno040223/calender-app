# バッチ b09_components_calendar（6 ファイル）

各ファイルの静的ノード（id / 行範囲）。意味ノードのエッジは、ここにある id を参照すること。

## src/components/calendar/CalendarApp.tsx  (kind=component, 454 行, id=module:src/components/calendar/CalendarApp.tsx)
- const:src/components/calendar/CalendarApp.tsx#VIEWS  L21-25  = [ { id: "day3", label: "3日" }, { id: "week", label: "週" }, { id: "month", label:
- type:src/components/calendar/CalendarApp.tsx#Editing  L27-27
- type:src/components/calendar/CalendarApp.tsx#Viewing  L28-28
- const:src/components/calendar/CalendarApp.tsx#TAP_REPEAT_IGNORE_MS  L32-32  = 500
- fn:src/components/calendar/CalendarApp.tsx#FocusStyle  L35-44
- fn:src/components/calendar/CalendarApp.tsx#CalendarApp  L46-371
- fn:src/components/calendar/CalendarApp.tsx#BlockRecord  L374-454

## src/components/calendar/CalendarToggles.tsx  (kind=component, 48 行, id=module:src/components/calendar/CalendarToggles.tsx)
- fn:src/components/calendar/CalendarToggles.tsx#CalendarToggles  L6-48

## src/components/calendar/CalendarView.tsx  (kind=component, 937 行, id=module:src/components/calendar/CalendarView.tsx)
- type:src/components/calendar/CalendarView.tsx#Extended  L29-40
- fn:src/components/calendar/CalendarView.tsx#timeScroller  L43-43
- type:src/components/calendar/CalendarView.tsx#CalendarMode  L46-46
- type:src/components/calendar/CalendarView.tsx#CalendarHandle  L48-52
- const:src/components/calendar/CalendarView.tsx#STRIP_DAYS  L55-55  = 42
- const:src/components/calendar/CalendarView.tsx#STRIP_LEAD  L56-56  = 14
- const:src/components/calendar/CalendarView.tsx#STRIP_EDGE  L57-57  = 5
- const:src/components/calendar/CalendarView.tsx#SLOT_KEY  L59-59  = "task-rhythm:slot-height"
- const:src/components/calendar/CalendarView.tsx#SLOT_DEFAULT  L60-60  = 34
- const:src/components/calendar/CalendarView.tsx#SLOT_MIN  L61-61  = 20
- const:src/components/calendar/CalendarView.tsx#SLOT_MAX  L62-62  = 90
- fn:src/components/calendar/CalendarView.tsx#clampSlot  L63-63
- fn:src/components/calendar/CalendarView.tsx#readSlot  L64-71
- const:src/components/calendar/CalendarView.tsx#MONTH_WEEKS  L74-74  = 26
- const:src/components/calendar/CalendarView.tsx#MONTH_LEAD  L75-75  = 9
- const:src/components/calendar/CalendarView.tsx#MONTH_EDGE  L76-76  = 2
- const:src/components/calendar/CalendarView.tsx#MONTH_ROWS  L78-78  = 6
- fn:src/components/calendar/CalendarView.tsx#todayFcNow  L80-83
- fn:src/components/calendar/CalendarView.tsx#mondayOf  L86-86
- fn:src/components/calendar/CalendarView.tsx#firstOfMonth  L88-91
- type:src/components/calendar/CalendarView.tsx#CalendarViewProps  L93-116
- const:src/components/calendar/CalendarView.tsx#BLOCK_CAL  L118-118  = { task: "task", habit: "habit", routine: "routine" }
- fn:src/components/calendar/CalendarView.tsx#eventToInput  L120-138
- fn:src/components/calendar/CalendarView.tsx#RelatedBadge  L140-147
- fn:src/components/calendar/CalendarView.tsx#PinIcon  L149-158
- fn:src/components/calendar/CalendarView.tsx#renderEventContent  L160-205
- fn:src/components/calendar/CalendarView.tsx#renderDayHeader  L207-216
- fn:src/components/calendar/CalendarView.tsx#CalendarView  L218-937

## src/components/calendar/EventForm.tsx  (kind=component, 238 行, id=module:src/components/calendar/EventForm.tsx)
- type:src/components/calendar/EventForm.tsx#Draft  L10-28
- fn:src/components/calendar/EventForm.tsx#toDraft  L30-48
- fn:src/components/calendar/EventForm.tsx#EventForm  L53-238

## src/components/calendar/InfoSheet.tsx  (kind=component, 128 行, id=module:src/components/calendar/InfoSheet.tsx)
- fn:src/components/calendar/InfoSheet.tsx#RelatedTasks  L11-46
- const:src/components/calendar/InfoSheet.tsx#KIND_LABEL  L48-48  = { task: "タスク", habit: "習慣", routine: "朝ルーティン" }
- fn:src/components/calendar/InfoSheet.tsx#BlockSheet  L50-98
- fn:src/components/calendar/InfoSheet.tsx#ReadonlyEventSheet  L100-128

## src/components/calendar/QuickAddBar.tsx  (kind=component, 119 行, id=module:src/components/calendar/QuickAddBar.tsx)
- const:src/components/calendar/QuickAddBar.tsx#DEADLINE_CHIPS  L8-8  = ["今日", "明日", "今週"] as const
- type:src/components/calendar/QuickAddBar.tsx#DeadlineChip  L9-9
- const:src/components/calendar/QuickAddBar.tsx#PRIORITY_LABEL  L10-10  = { 1: "低", 2: "中", 3: "高" } as const
- fn:src/components/calendar/QuickAddBar.tsx#Chip  L12-23
- fn:src/components/calendar/QuickAddBar.tsx#QuickAddBar  L25-119


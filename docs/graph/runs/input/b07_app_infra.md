# バッチ b07_app_infra（54 ファイル）

各ファイルの静的ノード（id / 行範囲）。意味ノードのエッジは、ここにある id を参照すること。

## .env.example  (kind=config, 18 行, id=module:.env.example)

## eslint.config.mjs  (kind=config, 18 行, id=module:eslint.config.mjs)

## next.config.ts  (kind=config, 21 行, id=module:next.config.ts)

## package.json  (kind=config, 40 行, id=module:package.json)

## postcss.config.mjs  (kind=config, 7 行, id=module:postcss.config.mjs)

## public/sw.js  (kind=worker, 131 行, id=module:public/sw.js)
- const:public/sw.js#VERSION  L3-3  = "v16"
- const:public/sw.js#SHELL  L5-5  = ["/", "/calendar", "/tasks", "/stats", "/settings", "/settings/basic", "/setting
- const:public/sw.js#PAGES  L6-6  = `pages-${VERSION}`
- const:public/sw.js#ASSETS  L7-7  = `assets-${VERSION}`
- fn:public/sw.js#warm  L32-52
- fn:public/sw.js#cacheFirst  L69-75
- fn:public/sw.js#networkFirst  L77-94

## scripts/make-icons.mjs  (kind=script, 25 行, id=module:scripts/make-icons.mjs)

## src/app/(app)/calendar/page.tsx  (kind=page, 5 行, id=module:src/app/(app)/calendar/page.tsx)
- fn:src/app/(app)/calendar/page.tsx#Page  L3-5
- route:page:/calendar  (page )

## src/app/(app)/layout.tsx  (kind=lib, 5 行, id=module:src/app/(app)/layout.tsx)
- fn:src/app/(app)/layout.tsx#AppLayout  L3-5

## src/app/(app)/page.tsx  (kind=page, 5 行, id=module:src/app/(app)/page.tsx)
- fn:src/app/(app)/page.tsx#Page  L3-5
- route:page:/  (page )

## src/app/(app)/settings/avoid/page.tsx  (kind=page, 5 行, id=module:src/app/(app)/settings/avoid/page.tsx)
- fn:src/app/(app)/settings/avoid/page.tsx#Page  L3-5
- route:page:/settings/avoid  (page )

## src/app/(app)/settings/basic/page.tsx  (kind=page, 5 行, id=module:src/app/(app)/settings/basic/page.tsx)
- fn:src/app/(app)/settings/basic/page.tsx#Page  L3-5
- route:page:/settings/basic  (page )

## src/app/(app)/settings/calendars/page.tsx  (kind=page, 5 行, id=module:src/app/(app)/settings/calendars/page.tsx)
- fn:src/app/(app)/settings/calendars/page.tsx#Page  L3-5
- route:page:/settings/calendars  (page )

## src/app/(app)/settings/colors/page.tsx  (kind=page, 5 行, id=module:src/app/(app)/settings/colors/page.tsx)
- fn:src/app/(app)/settings/colors/page.tsx#Page  L3-5
- route:page:/settings/colors  (page )

## src/app/(app)/settings/feed/page.tsx  (kind=page, 5 行, id=module:src/app/(app)/settings/feed/page.tsx)
- fn:src/app/(app)/settings/feed/page.tsx#Page  L3-5
- route:page:/settings/feed  (page )

## src/app/(app)/settings/habits/page.tsx  (kind=page, 5 行, id=module:src/app/(app)/settings/habits/page.tsx)
- fn:src/app/(app)/settings/habits/page.tsx#Page  L3-5
- route:page:/settings/habits  (page )

## src/app/(app)/settings/health/page.tsx  (kind=page, 5 行, id=module:src/app/(app)/settings/health/page.tsx)
- fn:src/app/(app)/settings/health/page.tsx#Page  L3-5
- route:page:/settings/health  (page )

## src/app/(app)/settings/notifications/page.tsx  (kind=page, 5 行, id=module:src/app/(app)/settings/notifications/page.tsx)
- fn:src/app/(app)/settings/notifications/page.tsx#Page  L3-5
- route:page:/settings/notifications  (page )

## src/app/(app)/settings/notion/page.tsx  (kind=page, 5 行, id=module:src/app/(app)/settings/notion/page.tsx)
- fn:src/app/(app)/settings/notion/page.tsx#Page  L3-5
- route:page:/settings/notion  (page )

## src/app/(app)/settings/page.tsx  (kind=page, 5 行, id=module:src/app/(app)/settings/page.tsx)
- fn:src/app/(app)/settings/page.tsx#Page  L3-5
- route:page:/settings  (page )

## src/app/(app)/settings/places/page.tsx  (kind=page, 5 行, id=module:src/app/(app)/settings/places/page.tsx)
- fn:src/app/(app)/settings/places/page.tsx#Page  L3-5
- route:page:/settings/places  (page )

## src/app/(app)/settings/rewards/page.tsx  (kind=page, 5 行, id=module:src/app/(app)/settings/rewards/page.tsx)
- fn:src/app/(app)/settings/rewards/page.tsx#Page  L3-5
- route:page:/settings/rewards  (page )

## src/app/(app)/settings/routine/page.tsx  (kind=page, 5 行, id=module:src/app/(app)/settings/routine/page.tsx)
- fn:src/app/(app)/settings/routine/page.tsx#Page  L3-5
- route:page:/settings/routine  (page )

## src/app/(app)/settings/tags/page.tsx  (kind=page, 5 行, id=module:src/app/(app)/settings/tags/page.tsx)
- fn:src/app/(app)/settings/tags/page.tsx#Page  L3-5
- route:page:/settings/tags  (page )

## src/app/(app)/settings/timetable/page.tsx  (kind=page, 5 行, id=module:src/app/(app)/settings/timetable/page.tsx)
- fn:src/app/(app)/settings/timetable/page.tsx#Page  L3-5
- route:page:/settings/timetable  (page )

## src/app/(app)/settings/treats/page.tsx  (kind=page, 5 行, id=module:src/app/(app)/settings/treats/page.tsx)
- fn:src/app/(app)/settings/treats/page.tsx#Page  L3-5
- route:page:/settings/treats  (page )

## src/app/(app)/settings/weather/page.tsx  (kind=page, 5 行, id=module:src/app/(app)/settings/weather/page.tsx)
- fn:src/app/(app)/settings/weather/page.tsx#Page  L3-5
- route:page:/settings/weather  (page )

## src/app/(app)/stats/page.tsx  (kind=page, 5 行, id=module:src/app/(app)/stats/page.tsx)
- fn:src/app/(app)/stats/page.tsx#Page  L3-5
- route:page:/stats  (page )

## src/app/(app)/tasks/page.tsx  (kind=page, 5 行, id=module:src/app/(app)/tasks/page.tsx)
- fn:src/app/(app)/tasks/page.tsx#Page  L3-5
- route:page:/tasks  (page )

## src/app/api/api-auth.test.ts  (kind=test, 38 行, id=module:src/app/api/api-auth.test.ts)
- fn:src/app/api/api-auth.test.ts#req  L12-12

## src/app/api/health/sleep/route.ts  (kind=api, 66 行, id=module:src/app/api/health/sleep/route.ts)
- const:src/app/api/health/sleep/route.ts#MAX_BODY  L7-7  = 300_000
- fn:src/app/api/health/sleep/route.ts#json  L9-10
- fn:src/app/api/health/sleep/route.ts#POST  L17-66
- route:api:/api/health/sleep  (api POST)

## src/app/api/ical/feed/[token]/route.ts  (kind=api, 42 行, id=module:src/app/api/ical/feed/[token]/route.ts)
- fn:src/app/api/ical/feed/[token]/route.ts#notFound  L8-8
- fn:src/app/api/ical/feed/[token]/route.ts#GET  L15-42
- route:api:/api/ical/feed/[token]  (api GET)

## src/app/api/ical/sync/route.ts  (kind=api, 42 行, id=module:src/app/api/ical/sync/route.ts)
- const:src/app/api/ical/sync/route.ts#DAY_MS  L7-7  = 24 * 60 * 60_000
- fn:src/app/api/ical/sync/route.ts#POST  L14-42
- route:api:/api/ical/sync  (api POST)

## src/app/api/notion/schema/route.ts  (kind=api, 15 行, id=module:src/app/api/notion/schema/route.ts)
- fn:src/app/api/notion/schema/route.ts#POST  L5-15
- route:api:/api/notion/schema  (api POST)

## src/app/api/notion/sync/route.ts  (kind=api, 22 行, id=module:src/app/api/notion/sync/route.ts)
- fn:src/app/api/notion/sync/route.ts#POST  L8-22
- route:api:/api/notion/sync  (api POST)

## src/app/api/push/dispatch/route.ts  (kind=api, 47 行, id=module:src/app/api/push/dispatch/route.ts)
- const:src/app/api/push/dispatch/route.ts#KEEP_SENT_MS  L6-6  = 3 * 24 * 60 * 60_000
- fn:src/app/api/push/dispatch/route.ts#POST  L12-47
- route:api:/api/push/dispatch  (api POST)

## src/app/api/push/replan/route.ts  (kind=api, 30 行, id=module:src/app/api/push/replan/route.ts)
- fn:src/app/api/push/replan/route.ts#POST  L11-30
- route:api:/api/push/replan  (api POST)

## src/app/api/push/test/route.ts  (kind=api, 18 行, id=module:src/app/api/push/test/route.ts)
- fn:src/app/api/push/test/route.ts#POST  L5-18
- route:api:/api/push/test  (api POST)

## src/app/globals.css  (kind=css, 680 行, id=module:src/app/globals.css)

## src/app/layout.tsx  (kind=lib, 31 行, id=module:src/app/layout.tsx)
- const:src/app/layout.tsx#metadata  L5-10  = { title: "リズム カレンダー", description: "予定に合わせて、タスクと生活のリズムを自動で組み立てるカレンダー", // iPhone
- const:src/app/layout.tsx#viewport  L12-20  = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: [ { 
- fn:src/app/layout.tsx#RootLayout  L22-31

## src/app/login/LoginForm.tsx  (kind=lib, 85 行, id=module:src/app/login/LoginForm.tsx)
- fn:src/app/login/LoginForm.tsx#LoginForm  L9-71
- fn:src/app/login/LoginForm.tsx#loginErrorMessage  L74-85

## src/app/login/page.tsx  (kind=page, 16 行, id=module:src/app/login/page.tsx)
- const:src/app/login/page.tsx#metadata  L5-5  = { title: "ログイン | リズム カレンダー" }
- fn:src/app/login/page.tsx#LoginPage  L7-16
- route:page:/login  (page )

## src/app/manifest.ts  (kind=lib, 21 行, id=module:src/app/manifest.ts)
- fn:src/app/manifest.ts#manifest  L4-21

## supabase/migrations/0001_app_state.sql  (kind=sql, 29 行, id=module:supabase/migrations/0001_app_state.sql)
- table:app_state  L4-9

## supabase/migrations/0002_ical_sources.sql  (kind=sql, 39 行, id=module:supabase/migrations/0002_ical_sources.sql)
- table:ical_sources  L5-14

## supabase/migrations/0003_push.sql  (kind=sql, 72 行, id=module:supabase/migrations/0003_push.sql)
- table:push_subscriptions  L6-15
- table:push_schedule  L40-44
- table:push_sent  L65-70

## supabase/migrations/0004_ical_feeds.sql  (kind=sql, 32 行, id=module:supabase/migrations/0004_ical_feeds.sql)
- table:ical_feeds  L5-9

## supabase/migrations/0005_notion_sources.sql  (kind=sql, 41 行, id=module:supabase/migrations/0005_notion_sources.sql)
- table:notion_sources  L5-13

## supabase/migrations/0006_private_ical_url_and_server_time.sql  (kind=sql, 24 行, id=module:supabase/migrations/0006_private_ical_url_and_server_time.sql)
- fn:supabase/migrations/0006_private_ical_url_and_server_time.sql#app_state_set_updated_at  L10-19

## supabase/migrations/0007_health_sleep.sql  (kind=sql, 52 行, id=module:supabase/migrations/0007_health_sleep.sql)
- table:health_tokens  L5-9
- table:health_sleep  L34-45

## supabase/migrations/0008_ical_last_events.sql  (kind=sql, 4 行, id=module:supabase/migrations/0008_ical_last_events.sql)

## supabase/setup.sql  (kind=sql, 68 行, id=module:supabase/setup.sql)

## tsconfig.json  (kind=config, 34 行, id=module:tsconfig.json)

## vitest.config.mts  (kind=config, 8 行, id=module:vitest.config.mts)


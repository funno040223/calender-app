# バッチ b06_lib_services（43 ファイル）

各ファイルの静的ノード（id / 行範囲）。意味ノードのエッジは、ここにある id を参照すること。

## src/lib/appPath.test.ts  (kind=test, 10 行, id=module:src/lib/appPath.test.ts)

## src/lib/appPath.ts  (kind=lib, 7 行, id=module:src/lib/appPath.ts)
- fn:src/lib/appPath.ts#appPath  L5-7

## src/lib/health/sleep.test.ts  (kind=test, 76 行, id=module:src/lib/health/sleep.test.ts)
- fn:src/lib/health/sleep.test.ts#jst  L4-4

## src/lib/health/sleep.ts  (kind=lib, 159 行, id=module:src/lib/health/sleep.ts)
- type:src/lib/health/sleep.ts#SleepKind  L10-10
- type:src/lib/health/sleep.ts#SleepSample  L12-16
- type:src/lib/health/sleep.ts#SleepNight  L18-26
- const:src/lib/health/sleep.ts#HEALTH_TOKEN  L29-29  = /^[A-Za-z0-9_-]{43}$/
- const:src/lib/health/sleep.ts#MAX_SAMPLES  L31-31  = 5000
- const:src/lib/health/sleep.ts#MIN_NIGHT_MINUTES  L33-33  = 120
- const:src/lib/health/sleep.ts#SESSION_GAP_MINUTES  L38-38  = 150
- const:src/lib/health/sleep.ts#JST  L41-41  = TZ * MIN
- const:src/lib/health/sleep.ts#NEWLINE  L42-42  = /\r?\n|\r|\u2028/
- fn:src/lib/health/sleep.ts#parseTime  L45-58
- fn:src/lib/health/sleep.ts#sleepKind  L61-72
- fn:src/lib/health/sleep.ts#sample  L74-80
- fn:src/lib/health/sleep.ts#parseSleepBody  L83-85
- fn:src/lib/health/sleep.ts#inspectSleepBody  L88-126
- fn:src/lib/health/sleep.ts#summarizeSleep  L129-150
- fn:src/lib/health/sleep.ts#nightsFromRows  L153-159

## src/lib/ical/export.ts  (kind=lib, 46 行, id=module:src/lib/ical/export.ts)
- const:src/lib/ical/export.ts#MIN  L3-3  = 60_000
- type:src/lib/ical/export.ts#ExportEvent  L5-14
- fn:src/lib/ical/export.ts#dateOnly  L16-19
- fn:src/lib/ical/export.ts#buildIcs  L25-46

## src/lib/ical/feed.test.ts  (kind=test, 27 行, id=module:src/lib/ical/feed.test.ts)

## src/lib/ical/feed.ts  (kind=lib, 39 行, id=module:src/lib/ical/feed.ts)
- const:src/lib/ical/feed.ts#DAY_MS  L5-5  = 24 * 60 * 60_000
- const:src/lib/ical/feed.ts#FEED_PAST_MS  L7-7  = 7 * DAY_MS
- const:src/lib/ical/feed.ts#FEED_FUTURE_MS  L8-8  = 15 * DAY_MS
- const:src/lib/ical/feed.ts#KIND_LABEL  L10-10  = { task: "タスク", habit: "習慣", routine: "朝ルーティン" }
- fn:src/lib/ical/feed.ts#feedEvents  L16-36
- const:src/lib/ical/feed.ts#FEED_TOKEN  L39-39  = /^[A-Za-z0-9_-]{43}$/

## src/lib/ical/fetch.test.ts  (kind=test, 23 行, id=module:src/lib/ical/fetch.test.ts)
- const:src/lib/ical/fetch.test.ts#GOOGLE  L4-4  = "https://calendar.google.com/calendar/ical/x/private-y/basic.ics"

## src/lib/ical/fetch.ts  (kind=lib, 51 行, id=module:src/lib/ical/fetch.ts)
- const:src/lib/ical/fetch.ts#MAX_BYTES  L3-3  = 5 * 1024 * 1024
- const:src/lib/ical/fetch.ts#TIMEOUT_MS  L4-4  = 10_000
- const:src/lib/ical/fetch.ts#MAX_REDIRECTS  L5-5  = 3
- fn:src/lib/ical/fetch.ts#fetchIcsText  L8-51

## src/lib/ical/ical.test.ts  (kind=test, 201 行, id=module:src/lib/ical/ical.test.ts)
- fn:src/lib/ical/ical.test.ts#jst  L6-6
- const:src/lib/ical/ical.test.ts#GOOGLE_LIKE  L9-65  = [ "BEGIN:VCALENDAR", "PRODID:-//Google Inc//Google Calendar 70.9054//EN", "VERSI

## src/lib/ical/import.ts  (kind=lib, 93 行, id=module:src/lib/ical/import.ts)
- const:src/lib/ical/import.ts#MIN  L4-4  = 60_000
- const:src/lib/ical/import.ts#MAX_OCCURRENCES  L6-6  = 20_000
- type:src/lib/ical/import.ts#IcsRange  L8-11
- type:src/lib/ical/import.ts#ICALTime  L13-13
- type:src/lib/ical/import.ts#ICALEvent  L14-14
- fn:src/lib/ical/import.ts#toMs  L20-27
- fn:src/lib/ical/import.ts#toEvent  L29-39
- fn:src/lib/ical/import.ts#isCancelled  L41-41
- fn:src/lib/ical/import.ts#parseIcs  L47-93

## src/lib/ical/source.ts  (kind=lib, 18 行, id=module:src/lib/ical/source.ts)
- const:src/lib/ical/source.ts#ALLOWED_HOSTS  L2-2  = [/^calendar\.google\.com$/, /^([a-z0-9-]+\.)?icloud\.com$/]
- fn:src/lib/ical/source.ts#normalizeIcsUrl  L8-18

## src/lib/localDebug.ts  (kind=lib, 6 行, id=module:src/lib/localDebug.ts)
- const:src/lib/localDebug.ts#LOCAL_DEBUG  L6-6  = process.env.NODE_ENV !== "production" && process.env.NEXT_PUBLIC_LOCAL_DEBUG ===

## src/lib/notify/build.test.ts  (kind=test, 128 行, id=module:src/lib/notify/build.test.ts)
- fn:src/lib/notify/build.test.ts#day  L6-12
- fn:src/lib/notify/build.test.ts#input  L14-23

## src/lib/notify/build.ts  (kind=lib, 187 行, id=module:src/lib/notify/build.ts)
- type:src/lib/notify/build.ts#Notice  L5-17
- type:src/lib/notify/build.ts#NoticeInput  L19-36
- const:src/lib/notify/build.ts#MIN  L38-38  = 60_000
- const:src/lib/notify/build.ts#NOTICE_LEAD_MINUTES  L39-39  = 15
- const:src/lib/notify/build.ts#NOTICE_HORIZON_MS  L40-40  = 48 * 60 * MIN
- const:src/lib/notify/build.ts#SMOKE_CUTOFF_MINUTES  L42-42  = 180
- const:src/lib/notify/build.ts#WATCH_CHARGE_MINUTES  L44-44  = 120
- fn:src/lib/notify/build.ts#buildNotices  L57-187

## src/lib/notify/close.test.ts  (kind=test, 12 行, id=module:src/lib/notify/close.test.ts)

## src/lib/notify/close.ts  (kind=lib, 15 行, id=module:src/lib/notify/close.ts)
- fn:src/lib/notify/close.ts#closeGoneTaskNotices  L5-15

## src/lib/notion/api.test.ts  (kind=test, 35 行, id=module:src/lib/notion/api.test.ts)
- fn:src/lib/notion/api.test.ts#page  L4-4
- fn:src/lib/notion/api.test.ts#respond  L5-9

## src/lib/notion/api.ts  (kind=lib, 89 行, id=module:src/lib/notion/api.ts)
- const:src/lib/notion/api.ts#API  L3-3  = "https://api.notion.com/v1"
- const:src/lib/notion/api.ts#VERSION  L4-4  = "2022-06-28"
- fn:src/lib/notion/api.ts#call  L7-18
- type:src/lib/notion/api.ts#NotionSchema  L20-24
- type:src/lib/notion/api.ts#Prop  L26-26
- fn:src/lib/notion/api.ts#readSchema  L29-39
- type:src/lib/notion/api.ts#NotionRow  L41-47
- type:src/lib/notion/api.ts#Page  L49-49
- fn:src/lib/notion/api.ts#readRows  L52-89

## src/lib/notion/id.ts  (kind=lib, 6 行, id=module:src/lib/notion/id.ts)
- fn:src/lib/notion/id.ts#parseDatabaseId  L2-6

## src/lib/notion/source.ts  (kind=lib, 23 行, id=module:src/lib/notion/source.ts)
- fn:src/lib/notion/source.ts#ownNotionSource  L8-16
- fn:src/lib/notion/source.ts#markNotionFetched  L18-23

## src/lib/push/cron.ts  (kind=lib, 11 行, id=module:src/lib/push/cron.ts)
- fn:src/lib/push/cron.ts#authorized  L4-11

## src/lib/push/delivery.test.ts  (kind=test, 70 行, id=module:src/lib/push/delivery.test.ts)
- fn:src/lib/push/delivery.test.ts#memoryLedger  L9-23

## src/lib/push/delivery.ts  (kind=lib, 68 行, id=module:src/lib/push/delivery.ts)
- const:src/lib/push/delivery.ts#DELIVERY_LEASE_MS  L6-6  = 2 * 60_000
- type:src/lib/push/delivery.ts#DeliveryLedger  L8-13
- fn:src/lib/push/delivery.ts#deliveryLedger  L16-42
- type:src/lib/push/delivery.ts#DeliveryResult  L44-44
- fn:src/lib/push/delivery.ts#deliverNotice  L46-68

## src/lib/push/due.test.ts  (kind=test, 26 行, id=module:src/lib/push/due.test.ts)
- const:src/lib/push/due.test.ts#MIN  L5-5  = 60_000

## src/lib/push/send.ts  (kind=lib, 72 行, id=module:src/lib/push/send.ts)
- type:src/lib/push/send.ts#PushTarget  L7-12
- type:src/lib/push/send.ts#PushPayload  L14-14
- fn:src/lib/push/send.ts#configure  L17-25
- fn:src/lib/push/send.ts#sendPush  L28-43
- fn:src/lib/push/send.ts#cleanNotices  L46-64
- const:src/lib/push/send.ts#GRACE_MS  L67-67  = 10 * 60_000
- fn:src/lib/push/send.ts#isDue  L70-72

## src/lib/review-regression.test.ts  (kind=test, 58 行, id=module:src/lib/review-regression.test.ts)

## src/lib/server/plan.test.ts  (kind=test, 45 行, id=module:src/lib/server/plan.test.ts)
- fn:src/lib/server/plan.test.ts#fakeDb  L13-25

## src/lib/server/plan.ts  (kind=lib, 76 行, id=module:src/lib/server/plan.ts)
- const:src/lib/server/plan.ts#DAY_MS  L9-9  = 24 * 60 * 60_000
- type:src/lib/server/plan.ts#ServerPlan  L11-13
- fn:src/lib/server/plan.ts#planOnServer  L20-52
- fn:src/lib/server/plan.ts#lastEventsOf  L55-62
- fn:src/lib/server/plan.ts#recentNights  L65-76

## src/lib/server/push.ts  (kind=lib, 28 行, id=module:src/lib/server/push.ts)
- type:src/lib/server/push.ts#PushReplan  L6-6
- fn:src/lib/server/push.ts#replanPush  L12-28

## src/lib/supabase/admin.ts  (kind=lib, 12 行, id=module:src/lib/supabase/admin.ts)
- fn:src/lib/supabase/admin.ts#createAdminClient  L7-12

## src/lib/supabase/client.ts  (kind=lib, 8 行, id=module:src/lib/supabase/client.ts)
- fn:src/lib/supabase/client.ts#createClient  L5-8

## src/lib/supabase/env.ts  (kind=lib, 11 行, id=module:src/lib/supabase/env.ts)
- fn:src/lib/supabase/env.ts#supabaseEnv  L2-11

## src/lib/supabase/server.ts  (kind=lib, 21 行, id=module:src/lib/supabase/server.ts)
- fn:src/lib/supabase/server.ts#createClient  L6-21

## src/lib/sync/feed.ts  (kind=lib, 47 行, id=module:src/lib/sync/feed.ts)
- fn:src/lib/sync/feed.ts#db  L6-6
- type:src/lib/sync/feed.ts#FeedInfo  L8-10
- fn:src/lib/sync/feed.ts#loadFeed  L12-16
- fn:src/lib/sync/feed.ts#base64url  L18-22
- fn:src/lib/sync/feed.ts#newSecret  L25-29
- fn:src/lib/sync/feed.ts#createFeed  L32-42
- fn:src/lib/sync/feed.ts#deleteFeed  L44-47

## src/lib/sync/health.ts  (kind=lib, 60 行, id=module:src/lib/sync/health.ts)
- fn:src/lib/sync/health.ts#db  L9-9
- fn:src/lib/sync/health.ts#loadHealthToken  L11-15
- fn:src/lib/sync/health.ts#createHealthToken  L18-26
- fn:src/lib/sync/health.ts#deleteHealthToken  L28-31
- fn:src/lib/sync/health.ts#loadSleepNights  L34-38
- const:src/lib/sync/health.ts#SLEEP_SHORTCUT_URL  L41-41  = `shortcuts://run-shortcut?name=${encodeURIComponent("睡眠を送る")}`
- const:src/lib/sync/health.ts#ASKED_KEY  L42-42  = "task-rhythm:health-asked"
- fn:src/lib/sync/health.ts#markHealthAsked  L44-50
- fn:src/lib/sync/health.ts#takeHealthAsked  L52-60

## src/lib/sync/ical.ts  (kind=lib, 55 行, id=module:src/lib/sync/ical.ts)
- type:src/lib/sync/ical.ts#IcalSource  L6-11
- type:src/lib/sync/ical.ts#SyncResult  L13-17
- fn:src/lib/sync/ical.ts#db  L20-20
- fn:src/lib/sync/ical.ts#listSources  L22-31
- fn:src/lib/sync/ical.ts#addSource  L34-39
- fn:src/lib/sync/ical.ts#removeSource  L41-44
- fn:src/lib/sync/ical.ts#syncImports  L46-55

## src/lib/sync/notion.ts  (kind=lib, 49 行, id=module:src/lib/sync/notion.ts)
- fn:src/lib/sync/notion.ts#db  L8-8
- type:src/lib/sync/notion.ts#NotionStatus  L10-13
- fn:src/lib/sync/notion.ts#loadNotionStatus  L16-21
- fn:src/lib/sync/notion.ts#registerNotion  L24-33
- fn:src/lib/sync/notion.ts#removeNotion  L35-38
- fn:src/lib/sync/notion.ts#post  L40-45
- fn:src/lib/sync/notion.ts#fetchNotionSchema  L47-47
- fn:src/lib/sync/notion.ts#fetchNotionRows  L48-49

## src/lib/sync/push.ts  (kind=lib, 86 行, id=module:src/lib/sync/push.ts)
- fn:src/lib/sync/push.ts#db  L7-7
- fn:src/lib/sync/push.ts#userId  L9-14
- type:src/lib/sync/push.ts#PushSupport  L16-16
- fn:src/lib/sync/push.ts#pushSupport  L19-26
- fn:src/lib/sync/push.ts#currentSubscription  L28-31
- fn:src/lib/sync/push.ts#keyBytes  L33-39
- fn:src/lib/sync/push.ts#subscribePush  L42-58
- fn:src/lib/sync/push.ts#unsubscribePush  L60-65
- fn:src/lib/sync/push.ts#sendTestPush  L67-72
- fn:src/lib/sync/push.ts#saveSchedule  L74-77
- fn:src/lib/sync/push.ts#deviceName  L79-86

## src/lib/sync/remote.ts  (kind=lib, 51 行, id=module:src/lib/sync/remote.ts)
- type:src/lib/sync/remote.ts#RemoteRow  L6-9
- fn:src/lib/sync/remote.ts#db  L12-12
- fn:src/lib/sync/remote.ts#userId  L14-17
- fn:src/lib/sync/remote.ts#currentUserId  L20-24
- fn:src/lib/sync/remote.ts#loadRemote  L27-33
- fn:src/lib/sync/remote.ts#saveRemote  L36-47
- fn:src/lib/sync/remote.ts#signOut  L49-51

## src/lib/weather/openMeteo.test.ts  (kind=test, 8 行, id=module:src/lib/weather/openMeteo.test.ts)

## src/lib/weather/openMeteo.ts  (kind=lib, 46 行, id=module:src/lib/weather/openMeteo.ts)
- type:src/lib/weather/openMeteo.ts#PlaceCandidate  L5-8
- fn:src/lib/weather/openMeteo.ts#searchPlaces  L11-19
- const:src/lib/weather/openMeteo.ts#ACTIVE_HOURS  L22-22  = { from: 6, to: 22 }
- fn:src/lib/weather/openMeteo.ts#dailyRainChance  L25-35
- fn:src/lib/weather/openMeteo.ts#fetchRainChance  L38-46

## src/proxy.ts  (kind=lib, 59 行, id=module:src/proxy.ts)
- fn:src/proxy.ts#proxy  L10-54
- const:src/proxy.ts#config  L56-59  = { // 画像やビルド済みのファイルには動かさない matcher: ["/((?!_next/static|_next/image|favicon.ico|m


# バッチ b04_mock_store（8 ファイル）

各ファイルの静的ノード（id / 行範囲）。意味ノードのエッジは、ここにある id を参照すること。

## src/lib/mock/bedtime.test.ts  (kind=test, 136 行, id=module:src/lib/mock/bedtime.test.ts)
- fn:src/lib/mock/bedtime.test.ts#data  L9-13
- fn:src/lib/mock/bedtime.test.ts#wake  L14-16

## src/lib/mock/bedtime.ts  (kind=lib, 96 行, id=module:src/lib/mock/bedtime.ts)
- const:src/lib/mock/bedtime.ts#LATE_WAKE_MINUTES  L7-7  = 6 * 60
- fn:src/lib/mock/bedtime.ts#settledResets  L10-21
- fn:src/lib/mock/bedtime.ts#bedtimeSleeps  L31-77
- fn:src/lib/mock/bedtime.ts#reconcileBedtime  L84-96

## src/lib/mock/merge.test.ts  (kind=test, 42 行, id=module:src/lib/mock/merge.test.ts)

## src/lib/mock/merge.ts  (kind=lib, 83 行, id=module:src/lib/mock/merge.ts)
- type:src/lib/mock/merge.ts#Fingerprints  L5-5
- fn:src/lib/mock/merge.ts#stable  L7-18
- fn:src/lib/mock/merge.ts#hash  L21-32
- fn:src/lib/mock/merge.ts#fingerprints  L34-36
- fn:src/lib/mock/merge.ts#isRecord  L38-38
- fn:src/lib/mock/merge.ts#keyOf  L39-40
- fn:src/lib/mock/merge.ts#union  L43-62
- fn:src/lib/mock/merge.ts#mergeConflict  L69-83

## src/lib/mock/night.test.ts  (kind=test, 83 行, id=module:src/lib/mock/night.test.ts)

## src/lib/mock/night.ts  (kind=lib, 128 行, id=module:src/lib/mock/night.ts)
- type:src/lib/mock/night.ts#NightSource  L11-11
- type:src/lib/mock/night.ts#NightTime  L13-16
- type:src/lib/mock/night.ts#Night  L18-33
- const:src/lib/mock/night.ts#ON_TIME_GRACE_MINUTES  L36-36  = 30
- type:src/lib/mock/night.ts#NightData  L38-39
- fn:src/lib/mock/night.ts#nightOf  L42-92
- fn:src/lib/mock/night.ts#allNights  L95-106
- fn:src/lib/mock/night.ts#upOnTime  L109-110
- fn:src/lib/mock/night.ts#bedTimeOf  L116-116
- fn:src/lib/mock/night.ts#bedOnTimeOf  L119-122
- fn:src/lib/mock/night.ts#fallAsleepMinutes  L125-126
- fn:src/lib/mock/night.ts#getUpMinutes  L127-128

## src/lib/mock/store.test.tsx  (kind=test, 174 行, id=module:src/lib/mock/store.test.tsx)

## src/lib/mock/store.ts  (kind=lib, 452 行, id=module:src/lib/mock/store.ts)
- const:src/lib/mock/store.ts#STORAGE_KEY  L18-18  = "task-rhythm:mock:v2"
- const:src/lib/mock/store.ts#KEY_PREFIX  L19-19  = "task-rhythm:"
- fn:src/lib/mock/store.ts#clearLocalData  L22-28
- const:src/lib/mock/store.ts#V1_STORAGE_KEY  L29-29  = "task-rhythm:mock:v1"
- const:src/lib/mock/store.ts#OWNER_KEY  L31-31  = `${STORAGE_KEY}:owner`
- fn:src/lib/mock/store.ts#readOwner  L33-39
- fn:src/lib/mock/store.ts#writeOwner  L41-47
- fn:src/lib/mock/store.ts#loadData  L49-59
- fn:src/lib/mock/store.ts#saveData  L61-67
- fn:src/lib/mock/store.ts#initialState  L69-72
- const:src/lib/mock/store.ts#STALE_MS  L75-75  = 10 * 60_000
- const:src/lib/mock/store.ts#IMPORTED_KEY  L77-77  = `${STORAGE_KEY}:imported`
- const:src/lib/mock/store.ts#IMPORT_EVERY_MS  L78-78  = 15 * 60_000
- const:src/lib/mock/store.ts#DAY  L79-79  = 24 * 60 * 60_000
- fn:src/lib/mock/store.ts#readImported  L82-90
- fn:src/lib/mock/store.ts#writeImported  L91-98
- type:src/lib/mock/store.ts#ImportStatus  L100-105
- fn:src/lib/mock/store.ts#withTimeout  L107-121
- type:src/lib/mock/store.ts#SyncStatus  L124-124
- const:src/lib/mock/store.ts#EDITED_AT_KEY  L126-126  = `${STORAGE_KEY}:editedAt`
- const:src/lib/mock/store.ts#SAVE_DELAY_MS  L127-127  = 800
- const:src/lib/mock/store.ts#NOTICE_DELAY_MS  L129-129  = 3000
- const:src/lib/mock/store.ts#REMOTE_AT_KEY  L132-132  = `${STORAGE_KEY}:remoteAt`
- const:src/lib/mock/store.ts#SYNCED_AT_KEY  L133-133  = `${STORAGE_KEY}:syncedAt`
- const:src/lib/mock/store.ts#BASE_KEY  L134-134  = `${STORAGE_KEY}:base`
- const:src/lib/mock/store.ts#LOAD_TIMEOUT_MS  L136-136  = 6000
- fn:src/lib/mock/store.ts#readNumber  L138-144
- fn:src/lib/mock/store.ts#writeNumber  L145-151
- fn:src/lib/mock/store.ts#readBase  L152-159
- fn:src/lib/mock/store.ts#markSynced  L161-169
- fn:src/lib/mock/store.ts#readEditedAt  L171-177
- fn:src/lib/mock/store.ts#writeEditedAt  L178-184
- fn:src/lib/mock/store.ts#useMockStore  L191-447
- type:src/lib/mock/store.ts#MockStore  L449-449
- fn:src/lib/mock/store.ts#sameBlock  L451-452


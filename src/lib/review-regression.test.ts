import { expect, it } from 'vitest';
import { plan } from './scheduler/planner';
import { baseInput, jst } from './scheduler/test-helpers';
import { parseQuickAdd } from './scheduler/parse';
import { replan, sampleData } from './mock/state';
import { rewardBalance } from './mock/stats';
import { planOnServer } from './server/plan';
import { buildNotices } from './notify/build';

it('active 60 minute task must not grow to 90 minutes at half time', () => {
  const now = jst(2026,10,1,10,30);
  const r = plan(baseInput(now, {
    tasks: [{ id:'t', title:'Task', priority:2, durationMinutes:60 }],
    previousBlocks: [{ kind:'task', refId:'t', title:'Task', start:jst(2026,10,1,10), end:jst(2026,10,1,11) }],
  }));
  expect(r.blocks.filter(b=>b.kind==='task').reduce((s,b)=>s+(b.end-b.start)/60000,0)).toBe(60);
});

it('completed daily lunch must not be scheduled again on the same day', () => {
  const now = jst(2026,10,1,13);
  const r = plan(baseInput(now, {
    habits: [{id:'lunch', name:'Lunch', durationMinutes:30, windowStart:720, windowEnd:870, frequency:{type:'daily'}, skippable:false, meal:true}],
    previousBlocks:[{kind:'habit',refId:'lunch',title:'Lunch',start:jst(2026,10,1,12),end:jst(2026,10,1,12,30)}],
  }));
  expect(r.blocks.filter(b=>b.refId==='lunch' && b.start>=now && b.start<jst(2026,10,2))).toHaveLength(0);
});

it('earned reward must survive 60 day log retention', () => {
  const now = jst(2026,10,1,13);
  const old = now - 61*86400000;
  const d = {...sampleData(now), tasks:[], courses:[], habits:[], events:[], blocks:[], taskBlockLog:{['t:'+old]:{title:'Task',start:old,end:old+3600000,doneAt:old+3600000,counted:true}}};
  expect(rewardBalance(replan(d, [], now))).toBe(rewardBalance(d));
});

it('next Friday from Monday must refer to the following calendar week', () => {
  const r = parseQuickAdd('来週金曜まで レポート', jst(2026,9,28,12), 540);
  expect(r.deadline).toBe(jst(2026,10,10));
});

it('next Monday from Friday must not jump two calendar weeks', () => {
  const r = parseQuickAdd('来週月曜まで レポート', jst(2026,10,2,12), 540);
  expect(r.deadline).toBe(jst(2026,10,6));
});

it('server planning must work without imported calendars', async () => {
  const now = jst(2026,10,1,13);
  const db = {
    from: () => ({ select: () => ({ eq: async () => ({ data: [], error: null }) }) }),
    rpc: async () => ({ data: { revision: 0, events: [] }, error: null }),
  };
  const r = await planOnServer(db as never, 'test-user', sampleData(now), now);
  expect(r.ok).toBe(true);
});

it('notices must be quiet before the first planned wake', () => {
  const now = jst(2026,10,1,3);
  const input = baseInput(now, {events:[{id:'night',title:'Night event',start:jst(2026,10,1,3,30),end:jst(2026,10,1,4),atHome:true}]});
  const result = plan(input);
  const notices = buildNotices({now,result,events:input.events,settings:input.settings,places:[]});
  expect(notices.filter(n=>n.at < result.dayPlans[0].wake)).toHaveLength(0);
});

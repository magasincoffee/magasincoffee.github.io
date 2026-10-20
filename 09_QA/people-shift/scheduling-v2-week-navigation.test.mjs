import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

const read=path=>readFile(new URL('../../'+path,import.meta.url),'utf8');

test('Manager schedules Monday–Sunday in calendar weeks, including month boundaries',async()=>{
  const window={};vm.runInNewContext(await read('05_MANAGER/SchedulingV2/week-navigation-v1.js'),{window,Date,Intl},{timeout:1000});
  const nav=window.MAGASIN_SCHEDULING_V2_WEEK_NAV;
  assert.equal(nav.weekStart('2026-10-20'),'2026-10-19');
  assert.equal(nav.weekStart('2026-10-25'),'2026-10-19');
  assert.equal(nav.nextWeek('2026-10-20'),'2026-10-26');
  assert.equal(nav.dateOffset('2026-10-26',6),'2026-11-01');
  assert.equal(nav.shiftWeek('2026-10-26',1),'2026-11-02');
  assert.equal(nav.shiftWeek('2027-01-01',-1),'2026-12-21');
  assert.equal(nav.rangeLabel('2026-10-26'),'T2 26/10/2026 – CN 01/11/2026');
  for(const invalid of ['2026-02-30','2026-13-01','2026-10-2','bad',''])assert.equal(nav.weekStart(invalid),'');
  assert.equal(nav.shiftWeek('2026-10-26',1.5),'');
});

test('Weekly controls select the next planning week without changing server permissions',async()=>{
 const [html,js,adapter]=await Promise.all([
   read('05_MANAGER/SchedulingV2/index.html'),
   read('05_MANAGER/SchedulingV2/schedule-v2.js'),
   read('05_MANAGER/SchedulingV2/read-adapter-v1.js')
 ]);
 for(const id of ['sv2PrevWeek','sv2CurrentWeek','sv2UpcomingWeek','sv2NextWeek','sv2WeekRange','sv2Week'])
   assert.match(html,new RegExp('id="'+id+'"'));
 assert.ok(html.indexOf('week-navigation-v1.js')<html.indexOf('schedule-v2.js'));
 assert.match(js,/weekNav\.nextWeek\(\)/);
 assert.match(js,/weekNav\.rangeLabel/);
 assert.match(js,/updateWeekUI/);
 assert.match(js,/weekNav\.shiftWeek/);
 assert.match(js,/magasin:scheduling-v2-week-loaded/);
 assert.doesNotMatch(js,/\.rpc\(|publish_schedule_generation|replace_schedule_generation_assignments|create_schedule_generation/);
 assert.match(adapter,/STORE_NOT_ALLOWED/);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync('05_MANAGER/SchedulingV2/coverage-core-v1.js','utf8');
const sandbox={module:{exports:{}},Date,Set,Object,Array,Number,String};
vm.runInNewContext(source,sandbox);
const {calculate}=sandbox.module.exports;
const storeId='CN1',weekStart='2026-10-26';
const d=(work_date,start_time,end_time,target_headcount,demand_source='RECURRING',store_id=storeId)=>({work_date,start_time,end_time,target_headcount,demand_source,store_id});
const s=(work_date,start_time,end_time,user_id,source='DRAFT',store_id=storeId)=>({work_date,start_time,end_time,user_id,source,store_id});
const cell=(r,hr,i=0)=>r.rows.find(x=>x.start===hr).days[i];
test('30-minute Mon-Sun grid 05:00–22:00 and half-open coverage',()=>{
 const r=calculate({storeId,weekStart,demand:[d(weekStart,'05:00','06:00',1)],shifts:[s(weekStart,'05:00','05:30','FT1')],stage:'DRAFT'});
 assert.equal(r.rows.length,34);assert.equal(r.rows[0].start,'05:00');assert.equal(r.rows.at(-1).end,'22:00');
 assert.equal(r.rows[0].days.length,7);assert.equal(r.rows[0].days[6].date,'2026-11-01');
 assert.equal(cell(r,'05:00').status,'ENOUGH');assert.equal(cell(r,'05:30').status,'SHORTAGE');assert.equal(cell(r,'06:00').status,'UNCONFIGURED');
 assert.equal(r.summary.shortage,1);assert.equal(r.summary.enough,1);
});
test('unique employee count, explicit zero override and never combine draft with published',()=>{
 const r=calculate({storeId,weekStart,demand:[d(weekStart,'08:00','08:30',2),d(weekStart,'08:30','09:00',0,'WEEK_OVERRIDE')],shifts:[s(weekStart,'08:00','09:00','FT1'),s(weekStart,'08:00','08:30','FT1'),s(weekStart,'08:00','08:30','FT2','OFFICIAL')],stage:'DRAFT'});
 assert.equal(r.mode,'DRAFT');assert.equal(cell(r,'08:00').assigned,1);assert.equal(cell(r,'08:00').status,'SHORTAGE');
 assert.equal(cell(r,'08:30').status,'EXCESS');assert.equal(cell(r,'08:30').target,0);
 const published=calculate({storeId,weekStart,demand:[d(weekStart,'08:00','08:30',2)],shifts:[s(weekStart,'08:00','08:30','FT1'),s(weekStart,'08:00','08:30','FT2','OFFICIAL')],stage:'PUBLISHED'});
 assert.equal(published.mode,'OFFICIAL');assert.equal(cell(published,'08:00').assigned,1);
});
test('week-only override changes week two, never weeks one and three',()=>{
 const make=(week,target)=>calculate({storeId,weekStart:week,demand:[d(week,'18:00','22:00',target,target===4?'WEEK_OVERRIDE':'RECURRING')],shifts:[s(week,'18:00','22:00','FT1')],stage:'DRAFT'});
 assert.deepEqual([make('2026-10-26',2),make('2026-11-02',4),make('2026-11-09',2)].map(r=>cell(r,'18:00').target),[2,4,2]);
});
test('overlapping demand is a conflict, never silently added or picked',()=>{
 const r=calculate({storeId,weekStart,demand:[d(weekStart,'08:00','10:00',2),d(weekStart,'09:00','11:00',1)],shifts:[],stage:'NONE'});
 assert.equal(cell(r,'09:00').status,'CONFLICT');assert.equal(r.summary.conflict,2);
});
test('unconfigured demand is unknown, not zero-demand or enough',()=>{
 const r=calculate({storeId,weekStart,demand:[],shifts:[s(weekStart,'08:00','09:00','FT1')],stage:'DRAFT'});
 assert.equal(r.hasDemand,false);assert.equal(r.summary.inspected,0);assert.equal(cell(r,'08:00').status,'UNCONFIGURED');assert.equal(cell(r,'08:00').assigned,1);
});
test('fail closed on cross-store, week, invalid slots and untrusted schedule source',()=>{
 const p={storeId,weekStart,demand:[],shifts:[],stage:'NONE'};
 assert.throws(()=>calculate({...p,demand:[d(weekStart,'08:00','09:00',2,'RECURRING','CN2')]}),/SCOPE/);
 assert.throws(()=>calculate({...p,weekStart:'2026-10-27'}),/MONDAY/);
 assert.throws(()=>calculate({...p,demand:[d('2026-11-02','08:00','09:00',2)]}),/SCOPE/);
 assert.throws(()=>calculate({...p,demand:[d(weekStart,'08:15','09:00',2)]}),/SLOT/);
 assert.throws(()=>calculate({...p,shifts:[s(weekStart,'08:00','09:00','FT1','ARCHIVED')]}),/UNKNOWN_SCHEDULE_SOURCE/);
});
test('coverage remains read-only with server-managed scope',()=>{
 const html=fs.readFileSync('05_MANAGER/SchedulingV2/index.html','utf8'),ui=fs.readFileSync('05_MANAGER/SchedulingV2/coverage-ui-v1.js','utf8');
 assert.match(html,/coverage-core-v1\.js/);assert.match(html,/coverage-ui-v1\.js/);
 assert.match(ui,/list_workforce_effective_weekly_staffing_v1/);assert.match(ui,/reader\.week\(s\.storeId,s\.weekStart\)/);
 assert.match(ui,/STORE_NOT_ALLOWED/);assert.match(ui,/my!==serial/);
 assert.doesNotMatch(ui,/replace_workforce_weekly_overrides_v1|publish_schedule_generation|create_schedule_generation|\.from\(/);
 assert.match(fs.readFileSync('05_MANAGER/SchedulingV2/weekly-override-ui-v1.js','utf8'),/magasin:workforce-weekly-demand-saved/);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {runInNewContext} from 'node:vm';

const read=path=>readFileSync(new URL('../../'+path,import.meta.url),'utf8');
const navSource=read('05_MANAGER/SchedulingV2/week-navigation-v1.js');
const opSource=read('05_MANAGER/SchedulingV2/draft-operations-v1.js');

test('#506 P2: Vietnam date/week is stable across browser OS timezones and midnight',()=>{
 const script=[
  "const vm=require('node:vm');",
  "class Clock extends Date{constructor(...args){super(...(args.length?args:['2026-10-25T17:05:00Z']));}}",
  'const window={};',
  'vm.runInNewContext('+JSON.stringify(navSource)+',{window,Date:Clock,Intl});',
  'const n=window.MAGASIN_SCHEDULING_V2_WEEK_NAV;',
  "console.log(JSON.stringify({today:n.todayVN(),current:n.currentWeek(),next:n.nextWeek(),sun:n.weekStart('2026-11-01'),year:n.shiftWeek('2027-01-01',-1),range:n.rangeLabel('2026-10-26')}));"
 ].join('\n');
 let expected=null;
 for(const timezone of ['UTC','Asia/Ho_Chi_Minh','America/Los_Angeles','Pacific/Auckland','Pacific/Kiritimati','America/Santiago']){
  const r=spawnSync(process.execPath,['-e',script],{env:{...process.env,TZ:timezone},encoding:'utf8',timeout:5000});
  assert.equal(r.status,0,timezone+': '+r.stderr);
  const out=JSON.parse(r.stdout.trim());
  assert.deepEqual(out,{today:'2026-10-26',current:'2026-10-26',next:'2026-11-02',
   sun:'2026-10-26',year:'2026-12-21',range:'T2 26/10/2026 – CN 01/11/2026'},timezone);
  if(expected)assert.deepEqual(out,expected);else expected=out;
 }
});

test('#506 P2: draft/release UI uses canonical week navigation and date-only bounds',()=>{
 const edit=read('05_MANAGER/SchedulingV2/editor-ui-v1.js');
 const bar=read('05_MANAGER/SchedulingV2/release-bar-v1.js');
 const service=read('05_MANAGER/SchedulingV2/draft-editor-v1.js');
 for(const source of [edit,bar]){
  assert.match(source,/weekNav\.weekStart\(week\.value\)/);
  assert.doesNotMatch(source,/getFullYear\(\)|getMonth\(\)|getDay\(\)|setDate\(/);
 }
 assert.match(edit,/dateInput\.min=scopeAtOpen\.weekStart/);
 assert.match(edit,/dateInput\.max=weekNav\.dateOffset\(scopeAtOpen\.weekStart,6\)/);
 assert.match(service,/INVALID_TIME_SLOT/);
 assert.match(service,/OUTSIDE_WEEK/);
 assert.doesNotMatch(opSource,/Math\.round\(\(shift-week\)\/86400000\)/);
 assert.match(opSource,/getUTCDay\(\)!==1/);
});

const scope={storeId:'CN1',weekStart:'2026-10-26',operation:'add'};
const assignment={user_id:'employee-1',work_date:'2026-10-26',start_time:'05:00',end_time:'05:30'};
function harness(){
 const calls=[];
 const client={rpc:async(name,args)=>{
  calls.push({name,args});
  if(name==='list_schedule_generations')return {data:[{id:'gen-1',status:'DRAFT'}]};
  if(name==='get_schedule_generation_assignments')return {data:[]};
  if(name==='list_employee_workforce_profiles_v1')return {data:[{
   employee_id:'employee-1',profile_status:'ACTIVE',employee_role:'STAFF',priority_store_ids:['CN1']
  }]};
  if(name==='get_cross_store_weekly_plan_v1')return {data:[]};
  if(name==='replace_schedule_generation_assignments')return {data:1};
  if(name==='validate_schedule_generation_v1')return {data:{valid:true,violations:[],warnings:[]}};
  throw Error('Unexpected RPC '+name);
 }};
 const window={MAGASIN_SCHEDULING_V2_CONTEXT:{actor:async()=>({role:'STORE_MANAGER'}),
  stores:async()=>[{id:'CN1'}],client:()=>client}};
 runInNewContext(opSource,{window,Date,Error,Number,String,Array,Object});
 return {apply:window.MAGASIN_SCHEDULING_V2_DRAFT_OPERATIONS.apply,calls};
}

test('#506 P2: rejects cross-week, malformed days and invalid Mondays without writing',async()=>{
 for(const [week,day] of [
  ['2026-10-26','2026-10-25'],['2026-10-26','2026-11-02'],
  ['2026-10-27','2026-10-27'],['2026-10-26','2026-10-32'],
  ['2026-02-30','2026-03-02'],['2026-10-26','2026-10-26T01:00:00Z']
 ]){
  const h=harness();
  await assert.rejects(h.apply({...scope,weekStart:week,assignment:{...assignment,work_date:day}}),/OUTSIDE_WEEK/);
  assert.equal(h.calls.some(x=>x.name==='replace_schedule_generation_assignments'),false,week+' '+day);
 }
 const h=harness();
 const res=await h.apply({...scope,assignment:{...assignment,work_date:'2026-11-01',start_time:'21:30',end_time:'22:00'}});
 assert.equal(res.saved,true);
 assert.equal(h.calls.filter(x=>x.name==='replace_schedule_generation_assignments').length,1);
});

test('#506 P2: existing draft time editing rejects quarter-hour / before 05 / after 22 before RPC',async()=>{
 const source=read('05_MANAGER/SchedulingV2/draft-editor-v1.js');
 const calls=[];
 const window={MAGASIN_SCHEDULING_V2_CONTEXT:{actor:async()=>({role:'STORE_MANAGER'}),stores:async()=>[{id:'CN1'}],
  client:()=>({rpc:async(name,args)=>{calls.push(name);throw Error('UNEXPECTED_RPC_'+name)}})}};
 runInNewContext(source,{window,Date,Error,Number,String,Array,Object});
 const save=window.MAGASIN_SCHEDULING_V2_DRAFT_EDITOR.saveTime;
 const base={storeId:'CN1',weekStart:'2026-10-26',index:0,userId:'employee-1',workDate:'2026-10-26',
   originalStart:'06:00',originalEnd:'10:00'};
 for(const [startTime,endTime,workDate,regex] of [
  ['04:30','06:00','2026-10-26',/INVALID_TIME_SLOT/],
  ['07:15','08:00','2026-10-26',/INVALID_TIME_SLOT/],
  ['21:30','22:30','2026-10-26',/INVALID_TIME_SLOT/],
  ['06:00','06:45','2026-10-26',/INVALID_TIME_SLOT/],
  ['05:00','05:30','2026-11-02',/OUTSIDE_WEEK/]
 ]){
  await assert.rejects(save({...base,startTime,endTime,workDate}),regex);
 }
 assert.deepEqual(calls,[]);
});

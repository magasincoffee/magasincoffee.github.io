import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import {runInNewContext} from 'node:vm';
const source=await readFile(new URL('../../05_MANAGER/SchedulingV2/release-workflow-v1.js',import.meta.url),'utf8');
const params={storeId:'CN1',weekStart:'2026-10-19'};
function mock({status='DRAFT',valid=true,allowed=true,preview=true,changed=false,warnings=[{code:'STAFFING_SHORTAGE'}]}={}){
 let stage=status,reads=0;const calls=[];
 const ctx={actor:async()=>({role:'OWNER'}),stores:async()=>allowed?[{id:'CN1'}]:[],client:()=>({rpc:async(name,args)=>{
  calls.push({name,args});
  if(name==='list_schedule_generations'){reads++;if(changed&&reads>1)stage='REVIEWED';return {data:[{id:'gen-1',status:stage}]}}
  if(name==='validate_schedule_generation_v1')return {data:{valid,violations:valid?[]:[{code:'OFFICIAL_SCHEDULE_OVERLAP'}],warnings}};
  if(name==='review_schedule_generation'){stage='REVIEWED';return {data:{status:'REVIEWED'}}}
  if(name==='publish_schedule_generation'){stage='PUBLISHED';return {data:{published:true,inserted_schedule_count:2}}}
  throw Error(name);
 }})};
 const window={MAGASIN_SCHEDULING_V2_CONTEXT:ctx,MAGASIN_SCHEDULING_V2_RELEASE_PREVIEW_ENABLED:preview,location:{search:'?release-preview'}};
 runInNewContext(source,{window,Date,String,Number,Object,Array,Error,URLSearchParams});
 return {workflow:window.MAGASIN_SCHEDULING_V2_RELEASE_WORKFLOW,calls};
}
test('staffing shortage warnings do not block review',async()=>{const h=mock();const result=await h.workflow.review({...params,confirmed:true});assert.equal(result.approved,true);assert.equal(result.warnings.length,1);assert.ok(h.calls.some(x=>x.name==='review_schedule_generation'))});
test('hard violations block review without writing approval',async()=>{const h=mock({valid:false});const result=await h.workflow.review({...params,confirmed:true});assert.equal(result.approved,false);assert.equal(h.calls.some(x=>x.name==='review_schedule_generation'),false)});
test('reviewed schedule can publish despite staffing warning',async()=>{const h=mock({status:'REVIEWED'});const result=await h.workflow.publish({...params,confirmed:true});assert.equal(result.published,true);assert.equal(result.insertedScheduleCount,2);assert.ok(h.calls.some(x=>x.name==='publish_schedule_generation'))});
test('publication is blocked for draft or hard failures',async()=>{for(const opts of [{status:'DRAFT'},{status:'REVIEWED',valid:false}]){const h=mock(opts);if(opts.status==='DRAFT')await assert.rejects(h.workflow.publish({...params,confirmed:true}),/PUBLISH_REQUIRES_REVIEW/);else assert.equal((await h.workflow.publish({...params,confirmed:true})).published,false);assert.equal(h.calls.some(x=>x.name==='publish_schedule_generation'),false)}});
test('confirmation is mandatory before review/publish',async()=>{const h=mock({status:'REVIEWED'});await assert.rejects(h.workflow.publish(params),/PUBLISH_CONFIRMATION_REQUIRED/);await assert.rejects(h.workflow.review(params),/REVIEW_CONFIRMATION_REQUIRED/);assert.equal(h.calls.length,0)});
test('preview guard rejects mutations even if called directly',async()=>{const h=mock({preview:false});await assert.rejects(h.workflow.review({...params,confirmed:true}),/RELEASE_PREVIEW_DISABLED/);await assert.rejects(h.workflow.publish({...params,confirmed:true}),/RELEASE_PREVIEW_DISABLED/);assert.equal(h.calls.length,0)});
test('unpermitted store and changed generation fail closed',async()=>{const forbidden=mock({allowed:false});await assert.rejects(forbidden.workflow.validate(params),/STORE_NOT_ALLOWED/);const changed=mock({changed:true});await assert.rejects(changed.workflow.review({...params,confirmed:true}),/GENERATION_CHANGED/);assert.equal(changed.calls.some(x=>x.name==='review_schedule_generation'),false)});
test('invalid Monday scoped date is rejected',async()=>{const h=mock();await assert.rejects(h.workflow.validate({...params,weekStart:'2026-10-20'}),/WEEK_MUST_START_MONDAY/);assert.equal(h.calls.length,0)});

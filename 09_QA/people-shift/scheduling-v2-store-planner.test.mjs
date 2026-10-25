import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import {runInNewContext} from 'node:vm';
const src=await readFile(new URL('../../05_MANAGER/SchedulingV2/store-planner-v1.js',import.meta.url),'utf8');
function create({available=true,eligible=true,other=false,previous=false,canRead=true,withTimestamps=false,sameType=false,scopeMismatch=false,staleAuto=false,staleManual=false,validAuto=false,ft8=false,unclassified=false}={}){const calls=[],row={id:'a1',generation_id:'gen1',store_id:'CN1',user_id:'u0',work_date:'2026-10-19',start_time:'06:00',end_time:'10:00'};let current=previous?[row,...(staleAuto?[{...row,id:'legacy-saturday',user_id:'u1',work_date:'2026-10-24',note:'V2_STORE_SCOPED_PROPOSAL'}]:[]),...(staleManual?[{...row,id:'manual-saturday',work_date:'2026-10-24',note:'MANAGER_DIRECT_FROM_AVAILABILITY'}]:[]),...(validAuto?[{...row,id:'valid-auto',user_id:'u1',note:'V2_STORE_SCOPED_PROPOSAL'}]:[])]:[];let generation=previous?[{id:'gen1',status:'DRAFT'}]:[];
 const ctx={actor:async()=>({role:'STORE_MANAGER'}),stores:async()=>canRead?[{id:'CN1'}]:[],client:()=>({rpc:async(name,args)=>{calls.push({name,args});switch(name){case 'list_schedule_generations':return {data:generation};case 'list_workforce_effective_weekly_staffing_v1':return {data:[{store_id:'CN1',work_date:'2026-10-19',start_time:'06:00',end_time:'10:00',target_headcount:ft8?1:2},...(ft8?[{store_id:'CN1',work_date:'2026-10-19',start_time:'10:00',end_time:'14:00',target_headcount:1}]:[]),{store_id:'CN2',work_date:'2026-10-19',start_time:'06:00',end_time:'10:00',target_headcount:5}]};case 'list_employee_employment_types_v1':return {data:[{employee_id:'u1',employment_type:'FULL_TIME'},{employee_id:'u2',employment_type:unclassified?'UNKNOWN':sameType?'FULL_TIME':'PART_TIME'}]};case 'list_employee_workforce_profiles_v1':return {data:eligible?[{employee_id:'u1',employee_role:'STAFF',profile_status:'ACTIVE',priority_store_ids:['CN1']},{employee_id:'u2',employee_role:'STAFF',profile_status:'ACTIVE',priority_store_ids:['CN1']}]:[]};case 'get_manager_weekly_availability':return {data:available?[{availability_id:'av1',user_id:'u1',work_date:'2026-10-19',start_time:'06:00',end_time:ft8?'14:00':'10:00',availability_type:'PREFERRED'},{availability_id:'av2',user_id:'u2',work_date:'2026-10-19',start_time:'06:00',end_time:'10:00',availability_type:'AVAILABLE'}]:[]};case 'list_workforce_registration_order_v1':return withTimestamps?{data:[{availability_id:'av1',registered_at:'2026-10-18T10:00:00+07:00'},{availability_id:scopeMismatch?'foreign-av':'av2',registered_at:'2026-10-17T09:00:00+07:00'}]}:{data:null,error:{code:'PGRST202'}};case 'get_cross_store_weekly_plan_v1':return {data:other?[{user_id:'u1',work_date:'2026-10-19',start_time:'05:00',end_time:'09:00',generation_id:'external'}]:[]};case 'get_schedule_generation_assignments':return {data:current};case 'create_schedule_generation':generation=[{id:'gen1',status:'DRAFT'}];return {data:'gen1'};case 'apply_schedule_v2_auto_proposals_533':{
 const oldIds=new Set(args.p_obsolete_ids);
 current=[...current.filter(r=>!oldIds.has(String(r.id))),
   ...args.p_additions.map((r,i)=>({...r,id:'new-'+i}))];
 return {data:{saved:true,added:args.p_additions.length,
   removed:args.p_obsolete_ids.length,valid:true,violations:[],
   warnings:[{code:'STAFFING_SHORTAGE'}]}};}default:throw Error('Unexpected RPC: '+name)}}})};
 const window={MAGASIN_SCHEDULING_V2_CONTEXT:ctx,MAGASIN_SCHEDULING_V2_AUTO_PREVIEW_ENABLED:true,location:{search:'?auto-preview'}};runInNewContext(src,{window,Error,Date,Number,String,Array,Map,Set,Object,JSON,URLSearchParams,Math});return {planner:window.MAGASIN_SCHEDULING_V2_STORE_PLANNER,calls,current:()=>current}
}
test('preview only selects chosen store and does not modify data',async()=>{const h=create();const p=await h.planner.preview({storeId:'CN1',weekStart:'2026-10-19'});assert.equal(p.proposals.length,2);assert.ok(p.proposals.every(r=>r.store_id==='CN1'));assert.equal(h.calls.some(c=>c.name==='apply_schedule_v2_auto_proposals_533'),false)});
test('existing manually assigned shift remains, proposal fills remainder',async()=>{const h=create({previous:true});const p=await h.planner.preview({storeId:'CN1',weekStart:'2026-10-19'});assert.equal(p.proposals.length,1);const result=await h.planner.apply(p,{confirmed:true});assert.equal(result.saved,true);assert.equal(h.current().length,2);assert.equal(h.current()[0].user_id,'u0')});
test('cross store conflicts remove candidate without blocking shortage warning',async()=>{const h=create({other:true});const p=await h.planner.preview({storeId:'CN1',weekStart:'2026-10-19'});assert.equal(p.proposals.length,1);assert.equal(p.shortages.length,1);assert.equal(p.shortages[0].missing_headcount,1)});
test('unconfigured staffing or forbidden store fails closed',async()=>{const h=create({canRead:false});await assert.rejects(h.planner.preview({storeId:'CN1',weekStart:'2026-10-19'}),/STORE_NOT_ALLOWED/)});
test('confirmation required and unchanged preview does not write if denied',async()=>{const h=create();const p=await h.planner.preview({storeId:'CN1',weekStart:'2026-10-19'});await assert.rejects(h.planner.apply(p),/CONFIRMATION_REQUIRED/);assert.equal(h.calls.some(c=>c.name==='apply_schedule_v2_auto_proposals_533'),false)});
test('additive save to new draft creates generation, preserves configured warnings',async()=>{const h=create();const p=await h.planner.preview({storeId:'CN1',weekStart:'2026-10-19'});const r=await h.planner.apply(p,{confirmed:true});assert.equal(r.saved,true);assert.equal(r.added,2);assert.equal(r.warnings[0].code,'STAFFING_SHORTAGE');assert.ok(h.calls.some(c=>c.name==='create_schedule_generation'));assert.ok(h.calls.some(c=>c.name==='apply_schedule_v2_auto_proposals_533'))});

test('confirmed FT-before-PT priority takes precedence over availability preference',async()=>{const h=create();const p=await h.planner.preview({storeId:'CN1',weekStart:'2026-10-19'});assert.equal(p.proposals[0].user_id,'u1');assert.equal(p.proposals[1].user_id,'u2');assert.equal(p.priorityStatus,'FT_FIRST_PT_SECOND');assert.equal(p.registrationOrderStatus,'NOT_VERIFIED_MISSING_TIMESTAMP')});

test('preferred availability precedes timestamp among same FT group',async()=>{const h=create({withTimestamps:true,sameType:true});const p=await h.planner.preview({storeId:'CN1',weekStart:'2026-10-19'});assert.equal(p.registrationOrderStatus,'VERIFIED_CREATED_AT');assert.equal(p.proposals[0].user_id,'u1','preferred availability precedes earlier registration within FT');assert.equal(p.proposals[1].user_id,'u2')});
test('FT remains higher priority than earlier PT, even with server timestamps',async()=>{const h=create({withTimestamps:true});const p=await h.planner.preview({storeId:'CN1',weekStart:'2026-10-19'});assert.equal(p.registrationOrderStatus,'VERIFIED_CREATED_AT');assert.equal(p.proposals[0].user_id,'u1');assert.equal(p.proposals[1].user_id,'u2')});
test('unscoped timestamp response is rejected before any draft write',async()=>{const h=create({withTimestamps:true,scopeMismatch:true});await assert.rejects(h.planner.preview({storeId:'CN1',weekStart:'2026-10-19'}),/REGISTRATION_TIMESTAMP_SCOPE_MISMATCH/);assert.equal(h.calls.some(c=>c.name==='apply_schedule_v2_auto_proposals_533'),false)});

test('deleted Saturday availability invalidates old V2 proposal but retains manager direct shift',async()=>{
 const h=create({previous:true,staleAuto:true,staleManual:true});
 const p=await h.planner.preview({storeId:'CN1',weekStart:'2026-10-19'});
 assert.equal(p.obsoleteAutoCount,1);
 assert.equal(p.proposals.length,1);
 const done=await h.planner.apply(p,{confirmed:true});
 assert.equal(done.saved,true);
 assert.equal(done.removed,1);
 assert.equal(h.current().some(r=>r.id==='legacy-saturday'||(r.work_date==='2026-10-24'&&r.note==='V2_STORE_SCOPED_PROPOSAL')),false);
 assert.equal(h.current().filter(r=>r.work_date==='2026-10-24'&&r.note==='MANAGER_DIRECT_FROM_AVAILABILITY').length,1);
});
test('V2 stale auto shift is removed even when no new proposals can be added',async()=>{
 const h=create({previous:true,staleAuto:true,available:false});
 const p=await h.planner.preview({storeId:'CN1',weekStart:'2026-10-19'});
 assert.equal(p.proposals.length,0);
 assert.equal(p.obsoleteAutoCount,1);
 const saved=await h.planner.apply(p,{confirmed:true});
 assert.equal(saved.saved,true);
 assert.equal(saved.added,0);
 assert.equal(saved.removed,1);
 assert.equal(h.current().length,1);
 assert.equal(h.current()[0].user_id,'u0');
});

test('only delta RPC is called, preserving existing manager shift identity on rerun',async()=>{
 const h=create({previous:true,staleAuto:true,staleManual:true});
 const proposal=await h.planner.preview({storeId:'CN1',weekStart:'2026-10-19'});
 const done=await h.planner.apply(proposal,{confirmed:true});
 assert.equal(done.saved,true);
 const delta=h.calls.find(x=>x.name==='apply_schedule_v2_auto_proposals_533');
 assert.ok(delta,'must use surgical delta writer rather than bulk replacement');
 assert.deepEqual(Array.from(delta.args.p_obsolete_ids),['legacy-saturday']);
 assert.equal(delta.args.p_expected_rows.length,3);
 assert.equal(delta.args.p_confirmed,true);
 assert.equal(h.calls.some(x=>x.name==='replace_schedule_generation_assignments'),false);
 assert.equal(h.current().find(x=>x.id==='manual-saturday')?.note,'MANAGER_DIRECT_FROM_AVAILABILITY');
});

test('#533 FT8: one contiguous 06-14 shift spans adjacent 06-10 and 10-14 demand before PT',async()=>{
 const h=create({ft8:true});
 const p=await h.planner.preview({storeId:'CN1',weekStart:'2026-10-19'});
 assert.equal(p.proposals.length,1);
 assert.equal(p.proposals[0].user_id,'u1');
 assert.equal(p.proposals[0].start_time,'06:00');
 assert.equal(p.proposals[0].end_time,'14:00');
 assert.equal(p.proposals[0].note,'V2_STORE_SCOPED_PROPOSAL');
 assert.equal(h.calls.some(x=>x.name==='apply_schedule_v2_auto_proposals_533'),false,'preview remains read-only');
});
test('#533 confirmed replan removes still-valid tagged auto shifts but never deletes Manager shift',async()=>{
 const h=create({previous:true,validAuto:true});
 const p=await h.planner.preview({storeId:'CN1',weekStart:'2026-10-19'});
 assert.deepEqual(Array.from(p.obsoleteAutoIds),['valid-auto']);
 const r=await h.planner.apply(p,{confirmed:true});
 assert.equal(r.saved,true);
 assert.equal(r.removed,1);
 assert.ok(h.current().some(x=>x.id==='a1'),'manual/unknown shift identity retained');
 assert.equal(h.current().some(x=>x.id==='valid-auto'),false);
 const call=h.calls.find(x=>x.name==='apply_schedule_v2_auto_proposals_533');
 assert.ok(call);
 assert.equal(call.args.p_confirmed,true);
});
test('#533 FT/PT missing classification is not guessed or assigned',async()=>{
 const h=create({unclassified:true});
 const p=await h.planner.preview({storeId:'CN1',weekStart:'2026-10-19'});
 assert.equal(p.proposals.length,1);
 assert.equal(p.proposals[0].user_id,'u1');
 assert.equal(p.shortages[0].missing_headcount,1);
});

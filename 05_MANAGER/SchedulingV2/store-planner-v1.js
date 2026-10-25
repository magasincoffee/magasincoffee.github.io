(()=>{'use strict';if(window.MAGASIN_SCHEDULING_V2_STORE_PLANNER)return;
const fail=c=>{throw Error(c)},hm=x=>String(x||'').slice(0,5),min=x=>{const m=hm(x).match(/^(\d{2}):(\d{2})$/);return m?Number(m[1])*60+Number(m[2]):NaN},day=x=>String(x||'').slice(0,10);
const offset=(week,n)=>{const d=new Date(week+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10)};
const sig=rows=>JSON.stringify(rows.map(r=>[String(r.id||''),String(r.user_id||''),day(r.work_date),hm(r.start_time),hm(r.end_time),String(r.note||'')]));
const ctx=()=>{const c=window.MAGASIN_SCHEDULING_V2_CONTEXT;if(!c?.actor||!c?.stores||!c?.client)fail('MANAGER_CONTEXT_NOT_READY');return c};
const shape=r=>({user_id:r.user_id,store_id:r.store_id,work_date:day(r.work_date),start_time:hm(r.start_time),end_time:hm(r.end_time),skill_code:r.skill_code||null,skill_level:Number(r.skill_level||0),score:Number(r.score||0),warning:r.warning||null,note:r.note||'MANAGER_DIRECT_FROM_AVAILABILITY',status:'DRAFT'});
const eligible=(p,storeId)=>String(p.profile_status||'').toUpperCase()==='ACTIVE'&&['STAFF','EMPLOYEE'].includes(String(p.employee_role||'').toUpperCase())&&Array.isArray(p.priority_store_ids)&&p.priority_store_ids.map(String).includes(String(storeId));
async function snapshot(storeId,weekStart){
 const week=day(weekStart),d=new Date(week+'T12:00:00Z');if(!/^\d{4}-\d{2}-\d{2}$/.test(week)||!Number.isFinite(d.getTime())||d.getUTCDay()!==1)fail('INVALID_WEEK');
 const c=ctx();await c.actor({force:true});const stores=await c.stores({force:true});if(!stores.some(s=>String(s.id)===String(storeId)))fail('STORE_NOT_ALLOWED');
 const rpc=(name,args)=>c.client().rpc(name,args);
 const responses=await Promise.all([rpc('list_schedule_generations',{p_store_id:storeId,p_week_start:week}),rpc('list_workforce_recurring_staffing_requirements_v1',{}),rpc('list_employee_workforce_profiles_v1',{}),rpc('get_manager_weekly_availability',{p_store_id:storeId,p_week_start:week}),rpc('get_cross_store_weekly_plan_v1',{p_week_start:week}),rpc('list_employee_employment_types_v1',{}),rpc('list_workforce_registration_order_v1',{p_store_id:storeId,p_week_start:week})]);
 // A missing staged RPC retains the old transparent warning, not a false tie-break.
 // Any actual permission or server failure is fatal; never guess a timestamp.
 const timestampResponse=responses.pop();
 for(const r of responses)if(r.error)throw r.error;
 if(timestampResponse.error&&!['PGRST202','42883'].includes(String(timestampResponse.error.code||'')))throw timestampResponse.error;
 const [gens,requirements,profiles,availability,plan,employment]=responses.map(r=>Array.isArray(r.data)?r.data:[]);
 const activeAvailability=availability.filter(r=>['AVAILABLE','PREFERRED'].includes(String(r.availability_type||'').toUpperCase()));
 const timestampRows=timestampResponse.error?[]:timestampResponse.data;
 if(!timestampResponse.error&&!Array.isArray(timestampRows))fail('REGISTRATION_TIMESTAMP_DATA_INVALID');
 const knownIds=new Set(availability.map(r=>String(r.availability_id||'')));
 const registeredAt=new Map();
 for(const row of timestampRows){
   const id=String(row.availability_id||''),at=Date.parse(String(row.registered_at||''));
   if(!knownIds.has(id)||registeredAt.has(id))fail('REGISTRATION_TIMESTAMP_SCOPE_MISMATCH');
   if(Number.isFinite(at))registeredAt.set(id,at);
 }
 const registrationVerified=!timestampResponse.error&&activeAvailability.length>0
   &&activeAvailability.every(a=>registeredAt.has(String(a.availability_id||'')));
 const employmentById=new Map(employment.map(r=>[String(r.employee_id),String(r.employment_type||'').toUpperCase()]));
 const employmentRank=code=>code==='FULL_TIME'?0:code==='PART_TIME'?1:2;
 const active=gens.filter(g=>['DRAFT','REVIEWED'].includes(String(g.status||'').toUpperCase()));
 if(active.length>1)fail('MULTIPLE_ACTIVE_GENERATIONS');if(active.length&&String(active[0].status).toUpperCase()!=='DRAFT')fail('REVIEWED_DRAFT_LOCKED');
 if(!active.length&&gens.some(g=>String(g.status||'').toUpperCase()==='PUBLISHED'))fail('PUBLISHED_WEEK_LOCKED');
 const gen=active[0]||null;let originals=[];
 if(gen){const q=await rpc('get_schedule_generation_assignments',{p_generation_id:gen.id});if(q.error)throw q.error;originals=Array.isArray(q.data)?q.data:fail('DRAFT_DATA_INVALID')}
 if(originals.some(r=>String(r.store_id||storeId)!==String(storeId)))fail('STORE_MISMATCH');
 return {c,rpc,week,storeId,gen,originals,requirements:requirements.filter(r=>String(r.store_id)===String(storeId)&&Number(r.day_of_week)>=1&&Number(r.day_of_week)<=7&&Number(r.target_headcount)>0&&min(r.end_time)>min(r.start_time)),people:profiles.filter(p=>eligible(p,storeId)).map(p=>({...p,employment_type:employmentById.get(String(p.employee_id||p.user_id))||'UNKNOWN'})),availability:activeAvailability,registeredAt,registrationVerified,other:plan.filter(r=>!gen||String(r.generation_id||'')!==String(gen.id))}
}
// Candidate priority: FT before PT, then earlier immutable availability.created_at
// within the same employment group if every scoped timestamp is verified.
// No timestamps or unavailable staged RPC -> visible warning, draft only.
function build(s){
 // V2 formerly appended new proposals without dropping obsolete V2-generated shifts.
 // A generated shift whose whole interval is no longer registered is stale.
 // Keep manual or unknown-origin shifts untouched.
 const obsolete=s.originals.filter(r=>String(r.note||'')==='V2_STORE_SCOPED_PROPOSAL'&&(!s.people.some(p=>String(p.employee_id||p.user_id)===String(r.user_id))||!s.availability.some(a=>
   String(a.user_id)===String(r.user_id)&&day(a.work_date)===day(r.work_date)
   &&min(a.start_time)<=min(r.start_time)&&min(a.end_time)>=min(r.end_time))));
 if(obsolete.some(r=>!r.id))fail('OBSOLETE_AUTO_ASSIGNMENT_ID_MISSING');
 const obsoleteIds=new Set(obsolete.map(r=>String(r.id)));
 const kept=s.originals.filter(r=>!obsoleteIds.has(String(r.id)));
 const existing=kept.map(shape),working=existing.map(r=>({...r})),proposed=[],shortages=[];
 const needs=[...s.requirements].sort((a,b)=>Number(a.day_of_week)-Number(b.day_of_week)||min(a.start_time)-min(b.start_time));
 const byId=new Map(s.people.map(p=>[String(p.employee_id||p.user_id),p]));
 function allFor(uid,date){return [...working,...s.other].filter(r=>String(r.user_id)===String(uid)&&day(r.work_date)===date)}
 for(const r of needs){const workDate=offset(s.week,Number(r.day_of_week)-1),start=min(r.start_time),end=min(r.end_time),target=Math.floor(Number(r.target_headcount));
 if(!Number.isFinite(start)||!Number.isFinite(end)||target<1)continue;
 const covering=new Set(working.filter(a=>day(a.work_date)===workDate&&min(a.start_time)<=start&&min(a.end_time)>=end).map(a=>String(a.user_id)));
 let missing=Math.max(0,target-covering.size);
 while(missing>0){
 const candidates=s.availability.filter(a=>day(a.work_date)===workDate&&min(a.start_time)<=start&&min(a.end_time)>=end).map(a=>{const uid=String(a.user_id||''),p=byId.get(uid);if(!p||covering.has(uid))return null;const shifts=allFor(uid,workDate);if(shifts.length>=2||shifts.some(x=>min(x.start_time)<end&&start<min(x.end_time)))return null;const currentWeek=working.filter(x=>String(x.user_id)===uid).length;const priority=p.priority_store_ids.map(String).indexOf(String(s.storeId));return {uid,p,employmentRank:String(p.employment_type)==='FULL_TIME'?0:String(p.employment_type)==='PART_TIME'?1:2,registeredAt:s.registeredAt.get(String(a.availability_id||'')),prefer:String(a.availability_type).toUpperCase()==='PREFERRED'?0:1,priority,currentWeek}}).filter(Boolean).sort((a,b)=>a.employmentRank-b.employmentRank||(s.registrationVerified?a.registeredAt-b.registeredAt:0)||a.prefer-b.prefer||a.currentWeek-b.currentWeek||a.priority-b.priority||a.uid.localeCompare(b.uid));
 if(!candidates.length)break;
 const {uid}=candidates[0];const newRow=shape({user_id:uid,store_id:s.storeId,work_date:workDate,start_time:hm(r.start_time),end_time:hm(r.end_time),note:'V2_STORE_SCOPED_PROPOSAL'});proposed.push(newRow);working.push(newRow);covering.add(uid);missing--;
 }
 if(missing>0)shortages.push({work_date:workDate,start_time:hm(r.start_time),end_time:hm(r.end_time),missing_headcount:missing,target_headcount:target});
 }
 return {storeId:s.storeId,weekStart:s.week,generationId:s.gen?.id||null,originalSignature:sig(s.originals),existingCount:s.originals.length,obsoleteAutoIds:[...obsoleteIds],obsoleteAutoCount:obsolete.length,proposals:proposed,shortages,priorityStatus:'FT_FIRST_PT_SECOND',registrationOrderStatus:s.registrationVerified?'VERIFIED_CREATED_AT':'NOT_VERIFIED_MISSING_TIMESTAMP'};
}
async function preview({storeId,weekStart}){const snapshotValue=await snapshot(storeId,weekStart);if(!snapshotValue.requirements.length)fail('STORE_DEMAND_NOT_CONFIGURED');return build(snapshotValue)}
async function apply(previewValue,{confirmed=false}={}){if(window.MAGASIN_SCHEDULING_V2_AUTO_PREVIEW_ENABLED!==true||!new URLSearchParams(window.location.search).has('auto-preview'))fail('AUTO_PREVIEW_DISABLED');if(confirmed!==true)fail('CONFIRMATION_REQUIRED');
 const s=await snapshot(previewValue?.storeId,previewValue?.weekStart);const latest=build(s);
 if(latest.originalSignature!==previewValue.originalSignature||latest.generationId!==previewValue.generationId||JSON.stringify(latest.proposals)!==JSON.stringify(previewValue.proposals)||JSON.stringify(latest.obsoleteAutoIds)!==JSON.stringify(previewValue.obsoleteAutoIds))fail('PLAN_STALE_REPREVIEW_REQUIRED');
 if(!latest.proposals.length&&!latest.obsoleteAutoCount)return {saved:false,added:0,removed:0,shortages:latest.shortages,reason:'NO_CHANGES_REQUIRED'};
 let generationId=s.gen?.id;
 if(!generationId){const created=await s.rpc('create_schedule_generation',{p_store_id:s.storeId,p_week_start:s.week,p_algorithm_version:'V2_STORE_SCOPED_V1'});if(created.error)throw created.error;generationId=created.data;if(!generationId)fail('DRAFT_CREATION_FAILED')}
 const current=await s.rpc('get_schedule_generation_assignments',{p_generation_id:generationId});if(current.error)throw current.error;
 const rows=Array.isArray(current.data)?current.data:fail('DRAFT_DATA_INVALID');
 if(sig(rows)!==previewValue.originalSignature)fail('DRAFT_CHANGED_BEFORE_SAVE');
 // Send only the intended auto-proposal delta, not a rewrite of every old row.
 // The server compares the whole immutable draft fingerprint under a week lock.
 // Existing manual rows, including historical staff/store-priority exceptions,
 // remain unchanged (same row IDs and all fields).
 const expected=rows.map(r=>({
   id:String(r.id),user_id:String(r.user_id),store_id:String(r.store_id),
   work_date:day(r.work_date),start_time:hm(r.start_time),end_time:hm(r.end_time),
   note:String(r.note||''),status:String(r.status||'DRAFT')
 })).sort((a,b)=>a.id.localeCompare(b.id));
 const save=await s.rpc('apply_schedule_v2_auto_proposals_532',{
   p_generation_id:generationId,p_expected_rows:expected,
   p_obsolete_ids:latest.obsoleteAutoIds,p_additions:latest.proposals,p_confirmed:true
 });if(save.error)throw save.error;
 const outcome=save.data||{};
 if(Number(outcome.added)!==latest.proposals.length||Number(outcome.removed)!==latest.obsoleteAutoCount)
   fail('AUTO_PROPOSAL_DELTA_RESULT_MISMATCH');
 return {saved:true,generationId,added:Number(outcome.added),removed:Number(outcome.removed),
   shortages:latest.shortages,valid:outcome.valid===true,
   violations:Array.isArray(outcome.violations)?outcome.violations:[],
   warnings:Array.isArray(outcome.warnings)?outcome.warnings:[]}
}
window.MAGASIN_SCHEDULING_V2_STORE_PLANNER=Object.freeze({preview,apply});
})();
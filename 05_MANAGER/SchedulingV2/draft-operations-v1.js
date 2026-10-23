(()=>{'use strict';if(window.MAGASIN_SCHEDULING_V2_DRAFT_OPERATIONS)return;
const hm=v=>String(v||'').slice(0,5),mins=v=>{const m=/^(\d{2}):(\d{2})$/.exec(hm(v));if(!m)return NaN;const h=Number(m[1]),min=Number(m[2]);return h>=0&&h<24&&min>=0&&min<60?h*60+min:NaN};
const fail=c=>{throw Error(c)};
const same=(a,b)=>String(a||'')===String(b||'');
const date=d=>String(d||'').slice(0,10);
// Date-only is a calendar key in Vietnam business time, never a local timestamp.
const calendarDay=value=>{const text=String(value||'');if(!/^\d{4}-\d{2}-\d{2}$/.test(text))return null;
 const d=new Date(text+'T12:00:00Z');return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===text?d:null;};
async function apply({storeId,weekStart,operation,index,expected,assignment}){
 if(!['add','replace','remove'].includes(operation))fail('INVALID_OPERATION');
 const ctx=window.MAGASIN_SCHEDULING_V2_CONTEXT;if(!ctx?.client||!ctx?.actor||!ctx?.stores)fail('MANAGER_CONTEXT_NOT_READY');
 await ctx.actor({force:true});const allowed=await ctx.stores({force:true});if(!allowed.some(x=>same(x.id,storeId)))fail('STORE_NOT_ALLOWED');
 const rpc=(name,args)=>ctx.client().rpc(name,args);
 const gens=await rpc('list_schedule_generations',{p_store_id:storeId,p_week_start:weekStart});if(gens.error)throw gens.error;
 const active=(Array.isArray(gens.data)?gens.data:[]).filter(x=>['DRAFT','REVIEWED'].includes(String(x.status||'').toUpperCase()));
 if(active.length!==1||String(active[0].status).toUpperCase()!=='DRAFT')fail('EDIT_REQUIRES_SINGLE_DRAFT');
 const generationId=active[0].id;
 const loaded=await rpc('get_schedule_generation_assignments',{p_generation_id:generationId});if(loaded.error)throw loaded.error;
 const rows=Array.isArray(loaded.data)?loaded.data:fail('INVALID_DRAFT_DATA');
 if(rows.some(r=>!same(r.store_id||storeId,storeId)))fail('STORE_MISMATCH');
 if(operation!=='add'){if(!Number.isInteger(index)||index<0||index>=rows.length)fail('SHIFT_NOT_FOUND');
   const old=rows[index];if(!expected||!same(old.id,expected.id)||!same(old.user_id,expected.user_id)||date(old.work_date)!==date(expected.work_date)||hm(old.start_time)!==hm(expected.start_time)||hm(old.end_time)!==hm(expected.end_time))fail('DRAFT_HAS_CHANGED')}
 if(operation==='add'||operation==='replace'){if(!assignment?.user_id||!/^\d{4}-\d{2}-\d{2}$/.test(date(assignment.work_date))||!Number.isFinite(mins(assignment.start_time))||mins(assignment.end_time)<=mins(assignment.start_time))fail('INVALID_ASSIGNMENT');
  const week=calendarDay(weekStart),shift=calendarDay(assignment.work_date);
  if(!week||week.getUTCDay()!==1||!shift||(shift-week)/86400000<0||(shift-week)/86400000>6)fail('OUTSIDE_WEEK');
  const q=await rpc('list_employee_workforce_profiles_v1');if(q.error)throw q.error;
  const eligible=(Array.isArray(q.data)?q.data:[]).some(p=>same(p.employee_id||p.user_id,assignment.user_id)&&String(p.profile_status||'').toUpperCase()==='ACTIVE'&&['STAFF','EMPLOYEE'].includes(String(p.employee_role||'').toUpperCase())&&Array.isArray(p.priority_store_ids)&&p.priority_store_ids.some(id=>same(id,storeId)));
  if(!eligible)fail('EMPLOYEE_NOT_ELIGIBLE');
  const from=mins(assignment.start_time),to=mins(assignment.end_time);
  if(from<300||to>1320||from%30!==0||to%30!==0)fail('INVALID_TIME_SLOT');
 }
 const converted=r=>({user_id:r.user_id,store_id:storeId,work_date:date(r.work_date),start_time:hm(r.start_time),end_time:hm(r.end_time),skill_code:r.skill_code||null,skill_level:Number(r.skill_level||0),score:Number(r.score||0),warning:r.warning||null,status:'DRAFT',note:r.note||'MANAGER_DIRECT_FROM_AVAILABILITY'});
 const next=rows.map(converted);if(operation==='remove')next.splice(index,1);
 if(operation==='add'||operation==='replace'){const value=converted(assignment);if(operation==='add')next.push(value);else next[index]={...next[index],...value}}
 for(const r of next){if(!r.user_id||mins(r.end_time)<=mins(r.start_time))fail('INVALID_DRAFT_ASSIGNMENTS');
 const day=next.filter(q=>same(q.user_id,r.user_id)&&date(q.work_date)===date(r.work_date));if(day.length>2)fail('MAX_TWO_ASSIGNMENTS_PER_EMPLOYEE_DAY');
 if(day.some(q=>q!==r&&mins(r.start_time)<mins(q.end_time)&&mins(q.start_time)<mins(r.end_time)))fail('DRAFT_SHIFT_OVERLAP')}
 const plan=await rpc('get_cross_store_weekly_plan_v1',{p_week_start:weekStart});if(plan.error)throw plan.error;
 const other=(Array.isArray(plan.data)?plan.data:[]).filter(r=>!same(r.generation_id,generationId));
 for(const r of next){const ext=other.filter(q=>same(q.user_id,r.user_id)&&date(q.work_date)===date(r.work_date));if(ext.some(q=>mins(r.start_time)<mins(q.end_time)&&mins(q.start_time)<mins(r.end_time)))fail('CROSS_STORE_SHIFT_OVERLAP');
 const within=next.filter(q=>same(q.user_id,r.user_id)&&date(q.work_date)===date(r.work_date)).length;
 if(ext.length+within>2)fail('MAX_TWO_ASSIGNMENTS_PER_EMPLOYEE_DAY')}
 const result=await rpc('replace_schedule_generation_assignments',{p_generation_id:generationId,p_assignments:next});if(result.error)throw result.error;
 const validation=await rpc('validate_schedule_generation_v1',{p_generation_id:generationId});if(validation.error)throw validation.error;
 return {saved:true,valid:!!validation.data?.valid,violations:validation.data?.violations||[],warnings:validation.data?.warnings||[]}
}
window.MAGASIN_SCHEDULING_V2_DRAFT_OPERATIONS=Object.freeze({apply});
})();
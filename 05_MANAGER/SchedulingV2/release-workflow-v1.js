(()=>{'use strict';
if(window.MAGASIN_SCHEDULING_V2_RELEASE_WORKFLOW)return;
const fail=code=>{throw Error(code)};
const statusOf=r=>String(r?.status||'').toUpperCase();
const normalizeDate=value=>{const text=String(value||'');if(!/^\d{4}-\d{2}-\d{2}$/.test(text))fail('INVALID_WEEK');const d=new Date(text+'T12:00:00');if(!Number.isFinite(d.getTime())||d.getDay()!==1)fail('WEEK_MUST_START_MONDAY');return text};
const allowedPreview=()=>window.MAGASIN_SCHEDULING_V2_RELEASE_PREVIEW_ENABLED===true&&new URLSearchParams(window.location.search).has('release-preview');
const context=()=>{const ctx=window.MAGASIN_SCHEDULING_V2_CONTEXT;if(!ctx?.actor||!ctx?.stores||!ctx?.client)fail('MANAGER_CONTEXT_NOT_READY');return ctx};
async function read({storeId,weekStart}){const ctx=context(),week=normalizeDate(weekStart);await ctx.actor({force:true});const stores=await ctx.stores({force:true});if(!stores.some(s=>String(s.id)===String(storeId)))fail('STORE_NOT_ALLOWED');
 const result=await ctx.client().rpc('list_schedule_generations',{p_store_id:storeId,p_week_start:week});if(result.error)throw result.error;
 const generations=(Array.isArray(result.data)?result.data:[]).filter(r=>['DRAFT','REVIEWED','PUBLISHED'].includes(statusOf(r)));
 if(generations.length>1)fail('MULTIPLE_ACTIVE_GENERATIONS');
 return {ctx,week,storeId,generation:generations[0]||null,status:statusOf(generations[0])||'NONE'}
}
async function checkedValidation(state){if(!['DRAFT','REVIEWED'].includes(state.status))fail('GENERATION_NOT_VALIDATABLE');
 const q=await state.ctx.client().rpc('validate_schedule_generation_v1',{p_generation_id:state.generation.id});if(q.error)throw q.error;
 const result=q.data;if(!result||typeof result.valid!=='boolean')fail('VALIDATION_RESULT_INVALID');
 return {valid:result.valid,violations:Array.isArray(result.violations)?result.violations:[],warnings:Array.isArray(result.warnings)?result.warnings:[]}
}
async function current(state,expectedStatus){const latest=await read({storeId:state.storeId,weekStart:state.week});if(String(latest.generation?.id)!==String(state.generation?.id)||latest.status!==expectedStatus)fail('GENERATION_CHANGED');return latest}
async function validate(params){if(!allowedPreview())fail('RELEASE_PREVIEW_DISABLED');return checkedValidation(await read(params))}
async function review(params){if(!allowedPreview())fail('RELEASE_PREVIEW_DISABLED');if(params.confirmed!==true)fail('REVIEW_CONFIRMATION_REQUIRED');
 const state=await read(params);if(state.status!=='DRAFT')fail('REVIEW_REQUIRES_DRAFT');
 const result=await checkedValidation(state);if(!result.valid) return {approved:false,...result};
 await current(state,'DRAFT');
 const q=await state.ctx.client().rpc('review_schedule_generation',{p_generation_id:state.generation.id,p_decision:'APPROVED'});if(q.error)throw q.error;
 if(!['REVIEWED','PUBLISHED'].includes(statusOf(q.data)))fail('REVIEW_NOT_CONFIRMED');
 return {approved:true,status:statusOf(q.data),warnings:result.warnings,violations:[]}
}
async function publish(params){if(!allowedPreview())fail('RELEASE_PREVIEW_DISABLED');if(params.confirmed!==true)fail('PUBLISH_CONFIRMATION_REQUIRED');
 const state=await read(params);if(state.status!=='REVIEWED')fail('PUBLISH_REQUIRES_REVIEW');
 const result=await checkedValidation(state);if(!result.valid)return {published:false,...result};
 await current(state,'REVIEWED');
 const q=await state.ctx.client().rpc('publish_schedule_generation',{p_generation_id:state.generation.id});if(q.error)throw q.error;
 if(q.data?.published!==true)return {published:false,valid:false,violations:Array.isArray(q.data?.validation?.violations)?q.data.validation.violations:[],warnings:Array.isArray(q.data?.validation?.warnings)?q.data.validation.warnings:[],reason:'PUBLISH_REJECTED'};
 return {published:true,alreadyPublished:q.data?.already_published===true,insertedScheduleCount:Number(q.data?.inserted_schedule_count||0),warnings:result.warnings,violations:[]}
}
window.MAGASIN_SCHEDULING_V2_RELEASE_WORKFLOW=Object.freeze({read,validate,review,publish});
})();
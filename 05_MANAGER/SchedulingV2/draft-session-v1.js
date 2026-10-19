(()=>{'use strict';if(window.MAGASIN_SCHEDULING_V2_DRAFT_SESSION)return;
const fail=c=>{throw Error(c)};
async function create({storeId,weekStart,confirmed=false}){
 if(window.MAGASIN_SCHEDULING_V2_AUTO_PREVIEW_ENABLED!==true||!new URLSearchParams(window.location.search).has('auto-preview'))fail('AUTO_PREVIEW_DISABLED');if(confirmed!==true)fail('CONFIRMATION_REQUIRED');
 const ctx=window.MAGASIN_SCHEDULING_V2_CONTEXT;if(!ctx?.actor||!ctx?.stores||!ctx?.client)fail('MANAGER_CONTEXT_NOT_READY');await ctx.actor({force:true});const stores=await ctx.stores({force:true});if(!stores.some(s=>String(s.id)===String(storeId)))fail('STORE_NOT_ALLOWED');
 const d=new Date(String(weekStart)+'T12:00:00Z');if(!/^\d{4}-\d{2}-\d{2}$/.test(String(weekStart))||!Number.isFinite(d.getTime())||d.getUTCDay()!==1)fail('INVALID_WEEK');
 const rpc=(name,args)=>ctx.client().rpc(name,args);
 const [runs,requirements]=await Promise.all([rpc('list_schedule_generations',{p_store_id:storeId,p_week_start:weekStart}),rpc('list_workforce_recurring_staffing_requirements_v1',{})]);for(const r of [runs,requirements])if(r.error)throw r.error;
 if((Array.isArray(runs.data)?runs.data:[]).some(r=>['DRAFT','REVIEWED','PUBLISHED'].includes(String(r.status||'').toUpperCase())))fail('GENERATION_ALREADY_EXISTS');
 const demand=(Array.isArray(requirements.data)?requirements.data:[]).some(r=>String(r.store_id)===String(storeId)&&Number(r.target_headcount)>0);
 if(!demand)fail('STORE_DEMAND_NOT_CONFIGURED');
 const result=await rpc('create_schedule_generation',{p_store_id:storeId,p_week_start:weekStart,p_algorithm_version:'V2_MANAGER_DIRECT'});if(result.error)throw result.error;if(!result.data)fail('DRAFT_CREATION_FAILED');
 return {generationId:result.data,created:true}
}
window.MAGASIN_SCHEDULING_V2_DRAFT_SESSION=Object.freeze({create});
})();
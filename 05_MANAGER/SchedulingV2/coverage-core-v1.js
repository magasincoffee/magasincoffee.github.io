(()=>{'use strict';
const pad=n=>String(n).padStart(2,'0');
const dateRe=/^\d{4}-\d{2}-\d{2}$/;
function dateAt(week,index){
 const d=new Date(week+'T12:00:00Z');
 if(!dateRe.test(week)||!Number.isFinite(d.getTime())||d.toISOString().slice(0,10)!==week||d.getUTCDay()!==1)throw Error('COVERAGE_INVALID_MONDAY');
 d.setUTCDate(d.getUTCDate()+index);return d.toISOString().slice(0,10);
}
function mins(t){
 const m=/^(\d{2}):(\d{2})(?::00)?$/.exec(String(t||''));if(!m)return NaN;
 const h=Number(m[1]),mm=Number(m[2]);return h<=23&&mm<=59?h*60+mm:NaN;
}
const hm=m=>pad(Math.floor(m/60))+':'+pad(m%60);
function windows(rows,store,week,kind){
 if(!Array.isArray(rows))throw Error('COVERAGE_INVALID_'+kind);
 const days=Array.from({length:7},(_,i)=>dateAt(week,i));
 return rows.map(r=>{
  const day=String(r.work_date||'').slice(0,10),start=mins(r.start_time),end=mins(r.end_time);
  if(!days.includes(day)|| (r.store_id!=null&&String(r.store_id)!==String(store)) ||
    !Number.isInteger(start)||!Number.isInteger(end)||start<300||end>1320||start>=end||start%30||end%30)
    throw Error('COVERAGE_INVALID_'+kind+'_SCOPE_OR_SLOT');
  if(kind==='DEMAND'){
   const count=Number(r.target_headcount);
   if(!Number.isInteger(count)||count<0||count>20)throw Error('COVERAGE_INVALID_HEADCOUNT');
   return {day,start,end,count,source:String(r.demand_source||'')};
  }
  const id=String(r.user_id||r.employee_id||'');if(!id)throw Error('COVERAGE_MISSING_USER');
  return {day,start,end,id,source:String(r.source||'').toUpperCase()};
 });
}
function calculate({storeId,weekStart,demand,shifts,stage}={}){
 if(!storeId)throw Error('COVERAGE_STORE_REQUIRED');
 const dates=Array.from({length:7},(_,i)=>dateAt(weekStart,i));
 const needs=windows(demand,storeId,weekStart,'DEMAND'),assignments=windows(shifts,storeId,weekStart,'SHIFT');
 if(assignments.some(s=>s.source!=='DRAFT'&&s.source!=='OFFICIAL'))throw Error('COVERAGE_UNKNOWN_SCHEDULE_SOURCE');
 const draftMode=['DRAFT','REVIEWED'].includes(String(stage||'').toUpperCase());
 const mode=draftMode?'DRAFT':assignments.some(x=>x.source==='OFFICIAL')?'OFFICIAL':assignments.some(x=>x.source==='DRAFT')?'DRAFT':'NONE';
 const selected=assignments.filter(x=>x.source===mode);
 const summary={shortage:0,enough:0,excess:0,conflict:0,notConfigured:0,zero:0,inspected:0};
 const rows=Array.from({length:34},(_,idx)=>{
  const start=300+idx*30,end=start+30;
  const days=dates.map(day=>{
   const matching=needs.filter(n=>n.day===day&&n.start<=start&&n.end>=end);
   const ids=new Set(selected.filter(s=>s.day===day&&s.start<=start&&s.end>=end).map(s=>s.id));
   let status,target=null;
   if(matching.length>1){status='CONFLICT';summary.conflict++}
   else if(!matching.length){status='UNCONFIGURED';summary.notConfigured++}
   else{
    target=matching[0].count;summary.inspected++;
    if(target===0&&ids.size===0){status='ZERO';summary.zero++}
    else if(ids.size<target){status='SHORTAGE';summary.shortage++}
    else if(ids.size>target){status='EXCESS';summary.excess++}
    else{status='ENOUGH';summary.enough++}
   }
   return {date:day,status,target,assigned:ids.size,demandSource:matching.length===1?matching[0].source:null};
  });
  return {start:hm(start),end:hm(end),days};
 });
 return {storeId:String(storeId),weekStart,mode,summary,hasDemand:needs.length>0,rows};
}
const api=Object.freeze({calculate});
if(typeof module!=='undefined'&&module.exports)module.exports=api;
if(typeof window!=='undefined')window.MAGASIN_SCHEDULING_V2_COVERAGE_CORE=api;
})();
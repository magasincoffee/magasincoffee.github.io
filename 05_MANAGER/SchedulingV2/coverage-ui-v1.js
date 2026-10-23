(()=>{'use strict';
const core=window.MAGASIN_SCHEDULING_V2_COVERAGE_CORE;
const table=document.getElementById('sv2Table'),store=document.getElementById('sv2Store'),week=document.getElementById('sv2Week');
if(!core||!table||!store||!week||window.MAGASIN_SCHEDULING_V2_COVERAGE)return;
const headers=()=>table.querySelectorAll('thead th');
let serial=0;
function clear(){
 table.querySelectorAll('.sv2-roster-shortage').forEach(el=>el.remove());
}
const scope=()=>({storeId:store.value,weekStart:window.MAGASIN_SCHEDULING_V2_WEEK_NAV?.weekStart?.(week.value)||''});
function intervals(result,day){
 const short=[];
 for(const slot of result.rows){
  const cell=slot.days[day];
  if(cell.status!=='SHORTAGE')continue;
  const missing=cell.target-cell.assigned;
  const previous=short.at(-1);
  if(previous&&previous.end===slot.start&&previous.missing===missing)previous.end=slot.end;
  else short.push({start:slot.start,end:slot.end,missing});
 }
 return short;
}
function render(result){
 clear();
 // Only actual shortages appear INSIDE the existing seven day columns.
 // The authoritative staffing calculation stays internal; no second panel,
 // comparison table, per-half-hour roster row, or position/skill gate.
 const ths=headers();
 for(let day=0;day<7;day++){
  const short=intervals(result,day);
  if(!short.length||!ths[day+1])continue;
  const max=Math.max(...short.map(x=>x.missing));
  const badge=document.createElement('span');
  badge.className='sv2-roster-shortage';
  badge.dataset.sv2ShortageDay=String(day);
  badge.textContent='Thiếu tối đa '+max+' người';
  const details=short.map(x=>x.start+'–'+x.end+': thiếu '+x.missing+' người').join('; ');
  const date=result.rows[0]?.days[day]?.date||'';
  badge.title=date+' · '+details;
  badge.setAttribute('aria-label','Thiếu nhân sự ngày '+date+': '+details);
  ths[day+1].append(badge);
 }
}
async function load(){
 const my=++serial,s=scope();clear();
 if(!s.storeId||!s.weekStart)return;
 try{
  const ctx=window.MAGASIN_SCHEDULING_V2_CONTEXT,reader=window.MAGASIN_SCHEDULING_V2_READ_ADAPTER;
  if(!ctx?.actor||!ctx?.stores||!ctx?.client||!reader?.week)throw Error('CONTEXT_NOT_READY');
  await ctx.actor({force:true});
  const stores=await ctx.stores({force:true});
  if(!stores.some(x=>String(x.id)===String(s.storeId)))throw Error('STORE_NOT_ALLOWED');
  const [demand,shifts]=await Promise.all([
   ctx.client().rpc('list_workforce_effective_weekly_staffing_v1',{p_store_id:s.storeId,p_week_start:s.weekStart}),
   reader.week(s.storeId,s.weekStart)
  ]);
  if(my!==serial||scope().storeId!==s.storeId||scope().weekStart!==s.weekStart)return;
  if(demand.error)throw demand.error;
  render(core.calculate({storeId:s.storeId,weekStart:s.weekStart,demand:demand.data,shifts:shifts.rows,stage:shifts.stage}));
 }catch(_){
  if(my===serial)clear(); // fail closed: never display stale or estimated shortages
 }
}
for(const input of [store,week])input.addEventListener('change',()=>{serial++;clear()});
document.addEventListener('magasin:scheduling-v2-week-loaded',load);
document.addEventListener('magasin:workforce-weekly-demand-saved',load);
window.MAGASIN_SCHEDULING_V2_COVERAGE=Object.freeze({reload:load,mode:'roster-shortage-only'});
})();
(()=>{
'use strict';
// P1: one editable table, two explicit scopes. No SQL, no write without
// previously authorized server RPC and optimistic fingerprint check.
const ui=window.MAGASIN_SCHEDULING_V2_DEMAND_UI;
const store=document.getElementById('sv2DemandStore'),rows=document.getElementById('sv2DemandRows');
const save=document.getElementById('sv2DemandSave'),add=document.getElementById('sv2AddBand');
const status=document.getElementById('sv2DemandStatus'),heading=document.querySelector('.sv2-roster .sv2-heading h2');
const nav=window.MAGASIN_SCHEDULING_V2_WEEK_NAV;
if(!ui||!store||!rows||!save||!add||!status||!heading||!nav)return;
const controls=document.createElement('section');
controls.id='sv2UnifiedDemandMode';controls.className='sv2-unified-mode';
controls.setAttribute('aria-label','Chế độ thiết lập nhu cầu nhân sự');
controls.innerHTML='<div class="sv2-unified-options" role="group" aria-label="Loại nhu cầu">'+
'<button type="button" id="sv2ModeRecurring" aria-pressed="true">Mẫu cố định · Lặp mỗi tuần</button>'+
'<button type="button" id="sv2ModeWeekly" aria-pressed="false">Điều chỉnh riêng một tuần</button></div>'+
'<label class="sv2-unified-week" id="sv2UnifiedWeekLabel" hidden>Tuần áp dụng (thứ Hai) '+
'<input id="sv2UnifiedWeek" type="date" aria-describedby="sv2UnifiedWeekHint"></label>'+
'<p id="sv2UnifiedWeekHint">Mẫu cố định được áp dụng lại hằng tuần cho từng chi nhánh.</p>';
document.querySelector('.sv2-demand-controls')?.insertAdjacentElement('afterend',controls);
const recurringBtn=document.getElementById('sv2ModeRecurring'),weeklyBtn=document.getElementById('sv2ModeWeekly');
const week=document.getElementById('sv2UnifiedWeek'),weekLabel=document.getElementById('sv2UnifiedWeekLabel');
week.value=nav.nextWeek();
const text=(value)=>String(value??'');
const hm=value=>text(value).slice(0,5);
const min=value=>{const m=/^(\d{2}):(\d{2})$/.exec(hm(value));return m?Number(m[1])*60+Number(m[2]):NaN};
const validBand=(a,b)=>Number.isInteger(min(a))&&Number.isInteger(min(b))&&min(a)>=300&&min(b)<=1320&&min(b)>min(a)&&min(a)%30===0&&min(b)%30===0;
const weekStart=()=>nav.weekStart(week.value)||'';
const dateAdd=(monday,i)=>{const d=new Date(monday+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+i);return d.toISOString().slice(0,10)};
const key=r=>[text(r.work_date).slice(0,10),hm(r.start_time),hm(r.end_time)].join('|');
const clean=r=>({work_date:text(r.work_date).slice(0,10),start_time:hm(r.start_time),end_time:hm(r.end_time),target_headcount:Number(r.target_headcount)});
const mapped=items=>new Map((items||[]).map(item=>{const r=clean(item);return [key(r),r]}));
const signature=map=>JSON.stringify([...map].sort(([a],[b])=>a.localeCompare(b)));
// Fail closed on malformed, out-of-scope or duplicated server override records,
// even when a future RPC response is unexpectedly inconsistent.
const validOverrides=(items,selected,monday)=>{
 if(!Array.isArray(items)||items.length>1500)return false;
 const maxDay=dateAdd(monday,6),seen=new Set();
 for(const item of items){
  const day=text(item?.work_date),target=item?.target_headcount;
  if(!/^\d{4}-\d{2}-\d{2}$/.test(day)||day<monday||day>maxDay||
   (item?.store_id!=null&&text(item.store_id)!==selected)||
   !validBand(item?.start_time,item?.end_time)||
   !Number.isInteger(target)||target<0||target>20)return false;
  const k=key(item);
  if(seen.has(k))return false;
  seen.add(k);
 }
 return true;
};
let mode='recurring',current=null,base=new Map(),before=new Map(),changes=new Map(),extra=new Set(),saving=false,serial=0;
const changed=()=>signature(before)!==signature(changes);
const dirty=()=>saving||changed();
function buttons(){
 if(mode!=='weekly')return;
 save.textContent='Lưu điều chỉnh riêng tuần';save.disabled=!current||saving||!changed();
 add.disabled=!current||saving;
}
function render(){
 if(mode!=='weekly')return;
 rows.replaceChildren();
 if(!current){
  const tr=rows.insertRow(),td=tr.insertCell();td.colSpan=8;td.textContent='Chưa tải được định mức tuần. Chọn chi nhánh và tuần.';buttons();return;
 }
 const bands=new Set([...base.values(),...changes.values()].map(x=>x.start_time+'|'+x.end_time));
 for(const k of extra)bands.add(k);
 const sorted=[...bands].sort((a,b)=>min(a.split('|')[0])-min(b.split('|')[0])||min(a.split('|')[1])-min(b.split('|')[1]));
 if(!sorted.length){const tr=rows.insertRow(),td=tr.insertCell();td.colSpan=8;td.textContent='Chưa có mẫu cố định. Có thể thêm khung riêng cho tuần này.';}
 for(const band of sorted){
  const [start,end]=band.split('|'),tr=document.createElement('tr'),th=document.createElement('th');
  th.scope='row';th.textContent=start+'–'+end;tr.append(th);
  for(let i=0;i<7;i++){
   const date=dateAdd(current.week,i),k=key({work_date:date,start_time:start,end_time:end});
   const inherited=base.get(k)?.target_headcount??0,selected=changes.get(k)?.target_headcount??inherited;
   const td=document.createElement('td'),input=document.createElement('input');
   input.type='number';input.min='0';input.max='20';input.step='1';input.value=String(selected);
   input.setAttribute('aria-label','Nhu cầu riêng '+date+' '+start+'–'+end+'; mẫu lặp '+inherited);
   td.dataset.demandSource=changes.has(k)?'WEEK_OVERRIDE':'RECURRING';
   if(changes.has(k))td.className='sv2-unified-overridden';
   input.addEventListener('change',()=>{
    const n=Number(input.value);
    if(!Number.isInteger(n)||n<0||n>20){input.value=String(selected);status.textContent='Chỉ nhập số nguyên từ 0 đến 20.';return;}
    if(n===inherited)changes.delete(k);
    else changes.set(k,{work_date:date,start_time:start,end_time:end,target_headcount:n});
    status.textContent=changed()?'Có điều chỉnh riêng tuần chưa lưu.':'Đang kế thừa mẫu cố định.';
    buttons();
    setTimeout(render,0);
   });
   td.append(input);tr.append(td);
  }
  rows.append(tr);
 }
 buttons();
}
async function load(){
 const selected=store.value,monday=weekStart(),mine=++serial;
 if(mode!=='weekly')return;
 current=null;render();
 if(!selected||!monday){status.textContent='Hãy chọn chi nhánh và tuần (thứ Hai).';return;}
 if(saving)return;
 status.textContent='Đang tải định mức cố định và điều chỉnh riêng tuần…';
 try{
  const ctx=window.MAGASIN_SCHEDULING_V2_CONTEXT;
  if(!ctx?.actor||!ctx?.stores||!ctx?.client)throw Error('MANAGER_CONTEXT_NOT_READY');
  await ctx.actor({force:true});
  const allowed=await ctx.stores({force:true});
  if(!allowed.some(s=>String(s.id)===selected))throw Error('STORE_NOT_ALLOWED');
  const [recur,res,eff]=await Promise.all([
   ctx.client().rpc('list_workforce_recurring_staffing_requirements_v1',{}),
   ctx.client().rpc('get_workforce_weekly_override_state_v1',{p_store_id:selected,p_week_start:monday}),
   ctx.client().rpc('list_workforce_effective_weekly_staffing_v1',{p_store_id:selected,p_week_start:monday})
  ]);
  if(mine!==serial||mode!=='weekly'||store.value!==selected||weekStart()!==monday)return;
  for(const call of [recur,res,eff])if(call.error)throw call.error;
  const state=res.data||{};
  if(String(state.store_id)!==selected||String(state.week_start)!==monday||
    !Array.isArray(state.overrides)||!/^[0-9a-f]{32}$/.test(text(state.fingerprint)))throw Error('WEEK_OVERRIDE_STATE_INVALID');
  if(!validOverrides(state.overrides,selected,monday))throw Error('WEEK_OVERRIDE_STATE_INVALID');
  if(!Array.isArray(eff.data)||eff.data.some(x=>String(x.store_id)!==selected||
     !Array.from({length:7},(_,i)=>dateAdd(monday,i)).includes(text(x.work_date).slice(0,10))||
     !validBand(x.start_time,x.end_time)||
     !Number.isInteger(x.target_headcount)||x.target_headcount<0||x.target_headcount>20))
    throw Error('WEEK_OVERRIDE_SCOPE_INVALID');
  if(!Array.isArray(recur.data))throw Error('RECURRING_REQUIREMENTS_INVALID');
  base=mapped(recur.data.filter(x=>String(x.store_id)===selected&&Number(x.day_of_week)>=1&&Number(x.day_of_week)<=7)
     .map(x=>({...x,work_date:dateAdd(monday,Number(x.day_of_week)-1)})));
  before=mapped(state.overrides);changes=mapped(state.overrides);extra=new Set();
  current={store:selected,week:monday,fingerprint:state.fingerprint};
  render();status.textContent='Đã tải tuần '+monday+'. Ô được tô màu là điều chỉnh riêng; các ô khác kế thừa mẫu lặp.';
 }catch(e){
  if(mine!==serial)return;
  current=null;before=new Map();changes=new Map();extra=new Set();render();
  status.textContent='Không tải được điều chỉnh tuần: '+String(e?.message||e)+'. Không lưu khi thiếu quyền hoặc dữ liệu.';
 }
}
function addBand(){
 if(!current||saving)return;
 const a=hm(document.getElementById('sv2BandStart').value),b=hm(document.getElementById('sv2BandEnd').value);
 if(!validBand(a,b)){status.textContent='Chỉ chọn 05:00–22:00, bước 30 phút.';return;}
 extra.add(a+'|'+b);render();status.textContent='Đã thêm khung riêng. Chọn số người cần cho ngày áp dụng.';
}
async function saveWeekly(){
 if(!current||saving||!changed())return;
 if(current.store!==store.value||current.week!==weekStart()){status.textContent='Chi nhánh/tuần đã đổi; tải lại trước khi lưu.';return;}
 const scope={...current};
 if(!window.confirm('Chỉ lưu định mức cho tuần '+scope.week+' tại chi nhánh đang chọn? Mẫu cố định và các tuần khác không đổi.'))return;
 saving=true;buttons();status.textContent='Đang lưu điều chỉnh riêng tuần…';
 try{
  const ctx=window.MAGASIN_SCHEDULING_V2_CONTEXT;
  await ctx.actor({force:true});
  const allowed=await ctx.stores({force:true});
  if(!allowed.some(s=>String(s.id)===scope.store))throw Error('STORE_NOT_ALLOWED');
  const res=await ctx.client().rpc('replace_workforce_weekly_overrides_v1',{
   p_store_id:scope.store,p_week_start:scope.week,
   p_overrides:[...changes.values()],p_expected_fingerprint:scope.fingerprint
  });
  if(res.error)throw res.error;
  saving=false;await load();status.textContent='Đã lưu riêng tuần '+scope.week+'. Mẫu cố định không thay đổi.';
  document.dispatchEvent(new CustomEvent('magasin:workforce-weekly-demand-saved',{
   detail:{storeId:scope.store,weekStart:scope.week}
  }));
 }catch(e){
  saving=false;buttons();status.textContent='Lưu thất bại: '+String(e?.message||e)+'. Kiểm tra quyền hoặc tải lại nếu có sửa đổi đồng thời.';
 }
}
function switchMode(next){
 if(next===mode)return;
 if(next==='weekly'&&ui.isDirty()&&!window.confirm('Mẫu lặp có thay đổi chưa lưu. Chuyển chế độ mà không lưu?'))return;
 if(next==='recurring'&&dirty()&&!window.confirm('Bỏ điều chỉnh riêng tuần chưa lưu?'))return;
 mode=next;serial++;
 recurringBtn.setAttribute('aria-pressed',String(next==='recurring'));
 weeklyBtn.setAttribute('aria-pressed',String(next==='weekly'));
 weekLabel.hidden=next!=='weekly';
 heading.textContent=next==='weekly'?'Nhu cầu cho tuần đã chọn':'Nhu cầu cố định trong tuần';
 document.getElementById('sv2UnifiedWeekHint').textContent=next==='weekly'
   ?'Chỉ những ô thay đổi mới ghi đè trong tuần này. Mẫu lặp của chi nhánh không bị sửa.'
   :'Mẫu cố định được áp dụng lại hằng tuần cho từng chi nhánh.';
 ui.setMode(next);
 if(next==='weekly')load();
 else{current=null;before=new Map();changes=new Map();extra=new Set();}
}
recurringBtn.addEventListener('click',()=>switchMode('recurring'));
weeklyBtn.addEventListener('click',()=>switchMode('weekly'));
store.addEventListener('change',event=>{
 if(mode!=='weekly')return;
 if(saving||(dirty()&&!window.confirm('Bỏ điều chỉnh tuần chưa lưu để chuyển chi nhánh?'))){
  event.stopImmediatePropagation();store.value=current?.store||'';return;
 }
 setTimeout(load,0);
},true);
week.addEventListener('change',()=>{
 if(mode!=='weekly')return;
 const monday=weekStart();
 if(!monday){status.textContent='Tuần không hợp lệ.';week.value=current?.week||nav.nextWeek();return;}
 if(saving||(dirty()&&!window.confirm('Bỏ điều chỉnh tuần chưa lưu để chuyển tuần?'))){
  week.value=current?.week||nav.nextWeek();return;
 }
 week.value=monday;load();
});
add.addEventListener('click',event=>{
 if(mode!=='weekly')return;event.preventDefault();event.stopImmediatePropagation();addBand();
},true);
save.addEventListener('click',event=>{
 if(mode!=='weekly')return;event.preventDefault();event.stopImmediatePropagation();saveWeekly();
},true);
window.MAGASIN_SCHEDULING_V2_UNIFIED_WEEKLY=Object.freeze({
 isDirty:dirty,load,mode:()=>mode,
 scope:()=>({...current}),source:'single-demand-table-authorized-weekly-overrides'
});
})();

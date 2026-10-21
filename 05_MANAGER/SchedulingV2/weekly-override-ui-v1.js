(()=>{'use strict';
if(window.MAGASIN_SCHEDULING_V2_WEEKLY_DEMAND)return;
const roster=document.querySelector('.sv2-roster'),store=document.getElementById('sv2Store'),week=document.getElementById('sv2Week');
if(!roster||!store||!week)return;
const panel=document.createElement('section');panel.id='sv2WeeklyDemand';panel.className='sv2-weekly-demand';
panel.innerHTML='<header><h2>Nhu cầu nhân sự riêng tuần này</h2><p>Mặc định kế thừa mẫu cố định. Chỉ những ô đã chỉnh được ghi đè trong đúng tuần đang chọn.</p></header>'+
'<div class="sv2-weekly-tools"><label>Bắt đầu <select id="sv2WeekBandStart"></select></label><label>Kết thúc <select id="sv2WeekBandEnd"></select></label><button id="sv2WeekAdd" type="button">Thêm khung</button><small>05:00–22:00 · 30 phút · giờ Việt Nam</small></div>'+
'<p id="sv2WeekDemandStatus" role="status">Đang chờ chọn chi nhánh và tuần.</p><div class="sv2-weekly-scroll"><table id="sv2WeekDemandTable"><thead><tr><th>Khung giờ</th><th>T2</th><th>T3</th><th>T4</th><th>T5</th><th>T6</th><th>T7</th><th>CN</th></tr></thead><tbody id="sv2WeekDemandRows"></tbody></table></div>'+
'<footer><span>Mẫu cố định và các tuần khác luôn được giữ nguyên.</span><button id="sv2WeekDemandSave" type="button" disabled>Lưu riêng tuần này</button></footer>';
roster.insertAdjacentElement('afterend',panel);
const $=id=>document.getElementById(id),status=$('sv2WeekDemandStatus'),body=$('sv2WeekDemandRows'),save=$('sv2WeekDemandSave');
const pad=n=>String(n).padStart(2,'0'),hm=v=>String(v||'').slice(0,5);
const minutes=s=>{const m=/^(\d{2}):(\d{2})$/.exec(s||'');return m?Number(m[1])*60+Number(m[2]):NaN};
const clock=n=>pad(Math.floor(n/60))+':'+pad(n%60);
function options(id,min,max,def){const s=$(id);for(let n=min;n<=max;n+=30){const o=document.createElement('option');o.value=clock(n);o.textContent=o.value;o.selected=o.value===def;s.append(o)}}
options('sv2WeekBandStart',300,1290,'05:00');options('sv2WeekBandEnd',330,1320,'09:00');
const dateAdd=(week,i)=>{const d=new Date(week+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+i);return d.toISOString().slice(0,10)};
const key=r=>[String(r.work_date).slice(0,10),hm(r.start_time),hm(r.end_time)].join('|');
const normalize=r=>({work_date:String(r.work_date).slice(0,10),start_time:hm(r.start_time),end_time:hm(r.end_time),target_headcount:Number(r.target_headcount)});
const mapping=rows=>new Map((rows||[]).map(r=>{const x=normalize(r);return[key(x),x]}));
const signature=m=>JSON.stringify([...m].sort(([a],[b])=>a.localeCompare(b)));
let current=null,base=new Map(),before=new Map(),changes=new Map(),extra=new Set(),request=0,saving=false;
const changed=()=>signature(before)!==signature(changes);
function enabled(){save.disabled=!current||saving||!changed();$('sv2WeekAdd').disabled=!current||saving}
function render(){
 body.replaceChildren();if(!current){const tr=body.insertRow();tr.insertCell().colSpan=8;tr.cells[0].textContent='Chưa tải nhu cầu tuần.';enabled();return}
 const bands=new Set([...base.values(),...changes.values()].map(x=>x.start_time+'|'+x.end_time));for(const x of extra)bands.add(x);
 const list=[...bands].sort((a,b)=>minutes(a.split('|')[0])-minutes(b.split('|')[0])||minutes(a.split('|')[1])-minutes(b.split('|')[1]));
 if(!list.length){const row=body.insertRow();row.insertCell().colSpan=8;row.cells[0].textContent='Chưa có nhu cầu cố định. Có thể thêm khung riêng cho tuần này.'}
 for(const band of list){const [start,end]=band.split('|'),row=document.createElement('tr'),h=document.createElement('th');h.scope='row';h.textContent=start+'–'+end;row.append(h);
  for(let i=0;i<7;i++){const date=dateAdd(current.week,i),k=key({work_date:date,start_time:start,end_time:end}),reference=base.get(k)?.target_headcount??0,chosen=changes.get(k)?.target_headcount??reference;
   const cell=document.createElement('td'),input=document.createElement('input');
   input.type='number';input.min='0';input.max='20';input.step='1';input.value=String(chosen);input.setAttribute('aria-label','Ngày '+date+' khung '+start+' đến '+end);
   if(changes.has(k))cell.className='sv2-weekly-changed';
   input.addEventListener('change',()=>{const n=Number(input.value);
    if(!Number.isInteger(n)||n<0||n>20){input.value=String(chosen);status.textContent='Chỉ nhập số nguyên từ 0 đến 20.';return}
    if(n===reference)changes.delete(k);else changes.set(k,{work_date:date,start_time:start,end_time:end,target_headcount:n});
    render();status.textContent=changed()?'Có điều chỉnh riêng tuần chưa lưu.':'Tất cả ô đang kế thừa mẫu cố định.';
   });cell.append(input);row.append(cell)
  }body.append(row)
 }
 enabled();
}
function selectedWeek(){return window.MAGASIN_SCHEDULING_V2_WEEK_NAV?.weekStart?.(week.value)||''}
async function load(){
 const storeId=store.value,weekStart=selectedWeek(),my=++request;
 if(!storeId||!weekStart){current=null;render();status.textContent='Hãy chọn chi nhánh và tuần.';return}
 if(current&&changed()&&(current.store!==storeId||current.week!==weekStart)&&!window.confirm('Bỏ thay đổi chưa lưu ở tuần trước?')){
  status.textContent='Thay đổi chưa lưu. Hãy trở về tuần/chi nhánh cũ để lưu trước.';return
 }
 if(saving)return;current=null;render();status.textContent='Đang tải mẫu cố định và nhu cầu riêng tuần…';
 try{
  const ctx=window.MAGASIN_SCHEDULING_V2_CONTEXT;
  if(!ctx?.client||!ctx?.actor||!ctx?.stores)throw Error('MANAGER_CONTEXT_NOT_READY');
  await ctx.actor();const allowed=await ctx.stores();if(!allowed.some(x=>String(x.id)===storeId))throw Error('STORE_NOT_ALLOWED');
  const client=ctx.client();
  const res=await Promise.all([
   client.rpc('list_workforce_recurring_staffing_requirements_v1',{}),
   client.rpc('get_workforce_weekly_override_state_v1',{p_store_id:storeId,p_week_start:weekStart}),
   client.rpc('list_workforce_effective_weekly_staffing_v1',{p_store_id:storeId,p_week_start:weekStart})
  ]);
  if(my!==request)return;for(const x of res)if(x.error)throw x.error;
  const raw=res[1].data||{},effective=res[2].data||[];
  if(raw.store_id!==storeId||raw.week_start!==weekStart||!Array.isArray(raw.overrides)||!/^[0-9a-f]{32}$/.test(raw.fingerprint||''))throw Error('WEEK_OVERRIDE_STATE_INVALID');
  if(!Array.isArray(effective)||effective.some(x=>String(x.store_id)!==storeId||!Array.from({length:7},(_,i)=>dateAdd(weekStart,i)).includes(String(x.work_date).slice(0,10))))throw Error('WEEK_OVERRIDE_SCOPE_INVALID');
  base=mapping((res[0].data||[]).filter(x=>String(x.store_id)===storeId&&Number(x.day_of_week)>=1&&Number(x.day_of_week)<=7).map(x=>({...x,work_date:dateAdd(weekStart,Number(x.day_of_week)-1)})));
  before=mapping(raw.overrides);changes=mapping(raw.overrides);extra=new Set();current={store:storeId,week:weekStart,fingerprint:raw.fingerprint};
  render();status.textContent='Đã tải. Ô nền màu là điều chỉnh tuần này; các ô còn lại kế thừa mẫu cố định.';
 }catch(e){if(my!==request)return;current=null;render();status.textContent='Không tải được nhu cầu tuần: '+String(e?.message||e)}
}
$('sv2WeekAdd').addEventListener('click',()=>{
 if(!current)return;const a=$('sv2WeekBandStart').value,b=$('sv2WeekBandEnd').value;
 if(!(minutes(a)>=300&&minutes(b)<=1320&&minutes(b)>minutes(a)&&minutes(a)%30===0&&minutes(b)%30===0)){status.textContent='Khung giờ phải nằm trong 05:00–22:00, bước 30 phút.';return}
 extra.add(a+'|'+b);render();status.textContent='Đã thêm khung cho tuần này. Nhập nhu cầu của ngày cần sửa.';
});
save.addEventListener('click',async()=>{
 if(!current||saving||!changed())return;
 if(current.store!==store.value||current.week!==selectedWeek()){status.textContent='Tuần/chi nhánh đã thay đổi. Tải lại trước khi lưu.';return}
 const old={...current};if(!window.confirm('Chỉ lưu định mức tuần '+old.week+'? Các tuần khác không bị đổi.'))return;
 saving=true;enabled();status.textContent='Đang lưu riêng tuần…';
 try{
  const r=await window.MAGASIN_SCHEDULING_V2_CONTEXT.client().rpc('replace_workforce_weekly_overrides_v1',{
   p_store_id:old.store,p_week_start:old.week,p_overrides:[...changes.values()],p_expected_fingerprint:old.fingerprint});
  if(r.error)throw r.error;saving=false;await load();status.textContent='Đã lưu riêng tuần '+old.week+'. Mẫu cố định không đổi.';
 }catch(e){saving=false;enabled();status.textContent='Lưu thất bại: '+String(e?.message||e)+'. Hãy tải lại nếu đã có quản lý khác sửa.'}
});
document.addEventListener('magasin:scheduling-v2-week-loaded',load);
store.addEventListener('change',load);week.addEventListener('change',load);
window.MAGASIN_SCHEDULING_V2_WEEKLY_DEMAND=Object.freeze({reload:load,mode:'server-scoped-weekly-overrides'});
})();

(()=>{'use strict';
if(window.__MAGASIN_CROSS_STORE_MASTER_V1__)return;
window.__MAGASIN_CROSS_STORE_MASTER_V1__=true;

const U='https://menvbzlsncmpuvnaifxa.supabase.co',K='sb_publishable_HsvCS6HDZnCDInd9PUoh0g_V34wJVqx';
const DAYS=['T2','T3','T4','T5','T6','T7','CN'];
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const hm=v=>String(v||'').slice(0,5);
const toDate=s=>new Date(String(s).slice(0,10)+'T00:00:00Z');
const add=(s,n)=>{const d=toDate(s);d.setUTCDate(d.getUTCDate()+Number(n||0));return d.toISOString().slice(0,10)};
let sb=null,pending=false,queued=false;
const client=()=>{const ctx=window.MAGASIN_MANAGER_WORKFORCE_CONTEXT;if(!ctx?.client)throw Error('MANAGER_CONTEXT_NOT_READY');return ctx.client()};
const scheduleApi=()=>window.MAGASIN_MANAGER_SCHEDULE_DRAFT;
const mount=()=>document.getElementById('xstoreMasterMount');
function ensureCss(){
 if(document.getElementById('xstore-master-v1-css'))return;
 const s=document.createElement('style');s.id='xstore-master-v1-css';
 s.textContent='.xsm{margin-top:12px;border:1px solid var(--m-border-default,#EAECF0);border-radius:14px;background:#fff;padding:14px;box-shadow:var(--m-shadow-sm,0 1px 2px rgba(16,24,40,.06));font-family:var(--m-font-sans,"Segoe UI",Roboto,Arial,sans-serif)}.xsm-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;flex-wrap:wrap}.xsm-head h3{margin:0;font-size:17px}.xsm-summary{display:flex;gap:7px;flex-wrap:wrap}.xsm-badge{font-size:10px;font-weight:900;padding:5px 8px;border-radius:999px;background:#eef5ff;color:#235dba}.xsm-warn{background:#fff5d6;color:#825f00}.xsm-stores{display:grid;gap:12px;margin-top:12px}.xsm-store{border:1px solid #dfe7ef;border-radius:12px;overflow:hidden}.xsm-store-head{display:flex;justify-content:space-between;gap:10px;align-items:center;padding:10px 12px;background:#f7f9fc}.xsm-store-title{display:flex;align-items:center;gap:8px;flex-wrap:wrap}.xsm-table-wrap{overflow:auto}.xsm-table{width:100%;border-collapse:collapse;min-width:980px}.xsm-table th,.xsm-table td{padding:8px;border-bottom:1px solid #eef2f6;border-right:1px solid #f2f4f7;text-align:left;vertical-align:top;font-size:11px}.xsm-table th{background:#fbfcfe;color:#667085;white-space:nowrap}.xsm-table th:first-child,.xsm-table td:first-child{position:sticky;left:0;background:#fff;z-index:1;min-width:150px}.xsm-shift{display:block;margin:2px 0;padding:4px 6px;border-radius:7px;background:#eef7ff;color:#174d82;font-weight:800;white-space:nowrap}.xsm-shift[data-source="OFFICIAL"]{background:#e9f6ee;color:#236d48}.xsm-empty{padding:14px;color:#667085;font-size:12px}.xsm-loading{padding:12px;background:#f8fafc;border-radius:10px;color:#667085;font-size:12px}.xsm-priority-note{font-size:11px;color:#667085;margin-top:4px}@media(max-width:700px){.xsm{padding:10px}.xsm-store-head{align-items:flex-start;flex-direction:column}.xsm-store-head .btn{width:100%}}';
 document.head.appendChild(s);
}
function groupRows(rows,week){
 const byUser=new Map();
 for(const r of rows){
  const key=String(r.user_id||'');
  if(!byUser.has(key))byUser.set(key,{name:r.employee_name||'Nhân viên',days:Array.from({length:7},()=>[])});
  const idx=Math.round((toDate(String(r.work_date).slice(0,10))-toDate(week))/86400000);
  if(idx>=0&&idx<7)byUser.get(key).days[idx].push(r);
 }
 return [...byUser.values()].sort((a,b)=>String(a.name).localeCompare(String(b.name),'vi'));
}
function storeHtml(store,plan,availability,week){
 const rows=plan.filter(r=>String(r.store_id)===String(store.id));
 const people=groupRows(rows,week);
 const availCount=availability.filter(a=>Array.isArray(a.priority_store_ids)&&a.priority_store_ids.map(String).includes(String(store.id))).length;
 const draftCount=rows.filter(r=>String(r.plan_source)==='DRAFT').length;
 const officialCount=rows.filter(r=>String(r.plan_source)==='OFFICIAL').length;
 const body=people.length?'<div class="xsm-table-wrap"><table class="xsm-table"><thead><tr><th>Nhân viên</th>'+DAYS.map((d,i)=>'<th>'+d+'<br><span style="font-weight:500">'+esc(add(week,i).slice(8,10)+'/'+add(week,i).slice(5,7))+'</span></th>').join('')+'</tr></thead><tbody>'+people.map(p=>'<tr><td><b>'+esc(p.name)+'</b></td>'+p.days.map(list=>'<td>'+list.sort((a,b)=>hm(a.start_time).localeCompare(hm(b.start_time))).map(r=>'<span class="xsm-shift" data-source="'+esc(r.plan_source)+'">'+esc(hm(r.start_time))+'–'+esc(hm(r.end_time))+(r.plan_source==='OFFICIAL'?' · Đã phát hành':'')+'</span>').join('')+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>':'<div class="xsm-empty">Chưa có ca nào trong tuần này.</div>';
 return '<section class="xsm-store"><div class="xsm-store-head"><div><div class="xsm-store-title"><b>'+esc(store.code)+' · '+esc(store.name)+'</b><span class="xsm-badge">''+availCount+' đăng ký phù hợp</span><span class="xsm-badge">''+draftCount+' ca nháp</span><span class="xsm-badge">''+officialCount+' ca chính thức</span></div><div class="xsm-priority-note">Nhân sự chỉ được xếp tại cửa hàng đã được Quản lý đưa vào danh sách ưu tiên.</div></div><button class="btn" type="button" data-xsm-open="'+esc(store.id)+'">Mở lịch '+esc(store.code)+'</button></div>'+body+'</section>';
}
async function refresh(){
 const m=mount();if(!m)return;
 if(pending){queued=true;return}
 pending=true;queued=false;ensureCss();m.dataset.xstoreLoading='1';m.innerHTML='<div class="xsm-loading">Đang tải tổng lịch CN1–CN4…</div>';
 try{
  const api=scheduleApi(),st=api?.getState?.()||{},week=st.week;
  if(!week){m.innerHTML='<div class="xsm-loading">Chưa xác định tuần đang xếp lịch.</div>';return}
  const [storesQ,planQ,avQ]=await Promise.all([
    client().rpc('get_manager_accessible_stores'),
    client().rpc('get_cross_store_weekly_plan_v1',{p_week_start:week}),
    client().rpc('get_cross_store_weekly_availability_v1',{p_week_start:week})
  ]);
  if(storesQ.error)throw storesQ.error;if(planQ.error)throw planQ.error;if(avQ.error)throw avQ.error;
  const stores=(Array.isArray(storesQ.data)?storesQ.data:[]).filter(s=>s?.id&&String(s.status||'ACTIVE').toUpperCase()==='ACTIVE');
  const plan=Array.isArray(planQ.data)?planQ.data:[];
  const availability=Array.isArray(avQ.data)?avQ.data:[];
  const unconfigured=new Set(availability.filter(a=>!Array.isArray(a.priority_store_ids)||!a.priority_store_ids.length).map(a=>String(a.user_id))).size;
  const current=mount();if(!current)return;
  current.dataset.xstoreReady='1';
  current.innerHTML='<section class="xsm"><div class="xsm-head"><div><h3>Tổng lịch 4 cửa hàng</h3><div class="muted" style="margin-top:4px">Một tuần vận hành chung · xem CN1–CN4 cùng lúc. Hệ thống chỉ tạo lịch nháp; Quản lý vẫn kiểm tra, chỉnh sửa và phát hành.</div></div><div class="xsm-summary"><span class="xsm-badge">'+esc(week)+'</span><span class="xsm-badge">'+availability.length+' đăng ký thời gian</span>'+(unconfigured?'<span class="xsm-badge xsm-warn">'+unconfigured+' nhân viên chưa có ưu tiên cửa hàng</span>':'')+'</div></div><div id="xstoreAutomationMount"></div><div class="xsm-stores">'+stores.map(s=>storeHtml(s,plan,availability,week)).join('')+'</div></section>';
  current.querySelectorAll('[data-xsm-open]').forEach(b=>b.addEventListener('click',()=>document.dispatchEvent(new CustomEvent('magasin:manager-schedule-open',{detail:{storeId:b.dataset.xsmOpen,week}}))));
  document.dispatchEvent(new CustomEvent('magasin:xstore-master-rendered',{detail:{week,stores:stores.map(s=>({...s})),availabilityCount:availability.length,unconfiguredEmployeeCount:unconfigured}}));
 }catch(e){
  const current=mount();if(current)current.innerHTML='<div class="xsm-loading">Không tải được tổng lịch 4 cửa hàng. '+esc(String(e?.message||e?.code||''))+'</div>';
 }finally{
  pending=false;
  if(queued){queued=false;setTimeout(refresh,0)}
 }
}
function sync(){
 const m=mount();if(!m)return;
 if(m.dataset.xstoreReady==='1'||m.dataset.xstoreLoading==='1')return;
 void refresh();
}
function boot(){
 ensureCss();
 const panel=document.getElementById('panel-publish');
 if(!panel)return;
 const obs=new MutationObserver(()=>sync());
 obs.observe(panel,{childList:true,subtree:true});
 sync();
 document.addEventListener('magasin:schedule-published',()=>setTimeout(refresh,0));
}
window.MAGASIN_CROSS_STORE_MASTER={refresh};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
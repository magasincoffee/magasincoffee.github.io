(()=>{'use strict';
if(window.__MAGASIN_MANAGER_WORKFORCE_UI2_011__)return;
window.__MAGASIN_MANAGER_WORKFORCE_UI2_011__=true;
window.__MAGASIN_MANAGER_WORKFORCE_UI_CONSOLIDATED_V1__=true;

const labels={dashboard:'🏠 Hôm nay',staff:'👥 Nhân viên',workforce:'📅 Xếp lịch',schedule:'🗓 Lịch làm',swap:'🔄 Đổi / cho ca',attendance:'⏱ Chấm công','payroll-self-check':'💰 Công / Lương'};
const allowed=new Set(Object.keys(labels));
const routable=new Set([...allowed,'tasks']); // hidden legacy SOP compatibility route; not primary navigation
const alias={'cham-cong':'attendance','doi-ca':'swap','nhan-su':'staff','cong-luong':'payroll-self-check','payroll':'payroll-self-check'};
const sourceNames={
  shift:'Swap / Give approvals',
  attendance:'Attendance review',
  availability:'Availability',
  schedule:'Lịch chính thức',
  staff:'Nhân viên',
  payroll:'Công / Lương'
};
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function normalize(v){const s=String(v||'').replace(/^#/,'').trim().toLowerCase();return alias[s]||s}
function renameNav(){for(const [view,label] of Object.entries(labels)){document.querySelectorAll('[data-view="'+view+'"]').forEach(b=>b.textContent=label)}}
function hideDeprecated(){
 for(const view of ['kpi','academy'])document.querySelectorAll('[data-view="'+view+'"]').forEach(b=>{b.hidden=true;b.setAttribute('aria-hidden','true');b.tabIndex=-1});
 for(const view of ['tasks','settings'])document.querySelectorAll('[data-view="'+view+'"]').forEach(b=>{b.hidden=true;b.setAttribute('aria-hidden','true');b.tabIndex=-1});
 document.querySelector('[data-tab="demand"]')?.remove();
 document.getElementById('panel-demand')?.remove();
}
function stateApi(key){
 const map={
  shift:window.MAGASIN_MANAGER_SHIFT_CHANGE,
  attendance:window.MAGASIN_MANAGER_ATTENDANCE_REVIEW,
  availability:window.MAGASIN_MANAGER_AVAILABILITY,
  schedule:window.MAGASIN_MANAGER_OFFICIAL_SCHEDULE,
  staff:window.MAGASIN_MANAGER_STAFF_PROJECTION,
  payroll:window.MAGASIN_MANAGER_PAYROLL_SELF_CHECK
 };
 return map[key]||null;
}
function readState(key){
 const api=stateApi(key);
 if(!api?.getState)return {connection:'NOT_CONNECTED',loading:false,error:null,data:null};
 try{
  const data=api.getState();
  return {connection:'CONNECTED',loading:!!data?.loading,error:data?.error||data?.lastError||null,data};
 }catch(e){return {connection:'ERROR',loading:false,error:e?.message||String(e),data:null}}
}
function pendingAttendance(rows){return (rows||[]).filter(r=>['SUBMITTED','NEEDS_REVIEW'].includes(String(r?.status||'').toUpperCase())).length}
function actionModel(){
 const shift=readState('shift'),attendance=readState('attendance'),availability=readState('availability'),schedule=readState('schedule');
 const swapCount=(shift.data?.swaps||[]).length+(shift.data?.gives||[]).length;
 const attendanceCount=pendingAttendance(attendance.data?.rows);
 const availabilityRows=availability.data?.rows||[];
 const scheduleRows=schedule.data?.rows||[];
 return [
  {
   key:'shift',route:'swap',label:'Đổi / cho ca',priority:swapCount>0?'high':'normal',
   state:shift.connection!=='CONNECTED'?shift.connection:shift.loading?'LOADING':shift.error?'ERROR':swapCount?'ACTION_REQUIRED':'EMPTY',
   value:shift.connection==='CONNECTED'&&!shift.loading&&!shift.error?String(swapCount):'—',
   detail:shift.error?'Không tải được yêu cầu canonical.':swapCount?swapCount+' yêu cầu đã qua bước Employee và chờ Manager xử lý.':'Không có yêu cầu Swap/Give chờ Manager.'
  },
  {
   key:'attendance',route:'attendance',label:'Attendance review',priority:attendanceCount>0?'high':'normal',
   state:attendance.connection!=='CONNECTED'?attendance.connection:attendance.loading?'LOADING':attendance.error?'ERROR':attendanceCount?'ACTION_REQUIRED':'EMPTY',
   value:attendance.connection==='CONNECTED'&&!attendance.loading&&!attendance.error?String(attendanceCount):'—',
   detail:attendance.error?'Không tải được attendance canonical.':attendanceCount?attendanceCount+' bản ghi raw attendance cần review explicit.':'Không có attendance cần review trong state hiện tại.'
  },
  {
   key:'availability',route:'workforce',label:'Availability tuần',priority:'normal',
   state:availability.connection!=='CONNECTED'?availability.connection:availability.loading?'LOADING':availability.error?'ERROR':availabilityRows.length?'READY':'EMPTY',
   value:availability.connection==='CONNECTED'&&!availability.loading&&!availability.error?String(availabilityRows.length):'—',
   detail:availability.error?'Không tải được availability canonical.':availabilityRows.length?availabilityRows.length+' đăng ký availability canonical đã tải.':'Chưa có đăng ký availability trong state hiện tại.'
  },
  {
   key:'schedule',route:'schedule',label:'Lịch chính thức',priority:'normal',
   state:schedule.connection!=='CONNECTED'?schedule.connection:schedule.loading?'LOADING':schedule.error?'ERROR':scheduleRows.length?'READY':'EMPTY',
   value:schedule.connection==='CONNECTED'&&!schedule.loading&&!schedule.error?String(scheduleRows.length):'—',
   detail:schedule.error?'Không tải được lịch canonical.':scheduleRows.length?scheduleRows.length+' ca APPROVED đang có trong reader hiện tại.':'Chưa có ca APPROVED trong state hiện tại.'
  },
  {
   key:'tasks',route:null,label:'Task / SOP',priority:'normal',state:'NOT_CONNECTED',value:'—',
   detail:'Không có nguồn Task / SOP canonical đã kết nối cho Manager Today.'
  }
 ];
}
function card(x){
 const tone=x.state==='ACTION_REQUIRED'?'danger':x.state==='ERROR'?'error':x.state==='NOT_CONNECTED'?'muted':x.state==='LOADING'?'loading':'neutral';
 const action=x.route?'<button type="button" class="manager-action-link" data-workforce-jump="'+esc(x.route)+'">Mở '+esc(labels[x.route].replace(/^\S+\s/,''))+'</button>':'<span class="manager-action-link disabled" aria-disabled="true">Không có route canonical</span>';
 return '<article class="manager-action-card '+tone+'" data-action-source="'+esc(x.key)+'" data-action-state="'+esc(x.state)+'"><div class="manager-action-top"><div><span class="manager-action-label">'+esc(x.label)+'</span><strong>'+esc(x.value)+'</strong></div><span class="manager-action-state">'+esc(x.state)+'</span></div><p>'+esc(x.detail)+'</p>'+action+'</article>';
}
function ensureTodayCss(){
 if(document.getElementById('manager-ui2-today-css'))return;
 const s=document.createElement('style');s.id='manager-ui2-today-css';s.textContent=`
#view-dashboard.manager-today-v2{min-width:0}
.manager-today-hero{display:flex;justify-content:space-between;gap:16px;align-items:flex-start;margin-bottom:16px}
.manager-today-hero h1{margin:0;color:#101828;font-size:28px;line-height:36px}
.manager-today-hero p{margin:5px 0 0;color:#667085;max-width:720px;line-height:20px}
.manager-today-refresh{min-height:40px;border:1px solid #d0d5dd;border-radius:10px;background:#fff;padding:0 14px;font-weight:750;cursor:pointer}
.manager-today-refresh:focus-visible,.manager-action-link:focus-visible{outline:2px solid #2f6fde;outline-offset:2px}
.manager-action-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
.manager-action-card{min-width:0;padding:16px;border:1px solid #e4e7ec;border-radius:14px;background:#fff;box-shadow:0 1px 2px rgba(16,24,40,.04)}
.manager-action-card.danger{border-color:#f1b8b4;background:#fff8f7}.manager-action-card.error{border-color:#f3c7c3;background:#fef3f2}.manager-action-card.loading{border-style:dashed}.manager-action-card.muted{background:#f9fafb}
.manager-action-top{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}.manager-action-top>div{display:grid;gap:2px}.manager-action-label{color:#667085;font-size:12px;font-weight:700}.manager-action-top strong{font-size:28px;line-height:34px;color:#101828}.manager-action-state{font-size:10px;font-weight:800;letter-spacing:.04em;padding:5px 8px;border-radius:999px;background:#f2f4f7;color:#475467}
.manager-action-card p{min-height:38px;color:#667085;font-size:12px;line-height:18px}.manager-action-link{min-height:40px;border:1px solid #d0d5dd;border-radius:10px;background:#fff;color:#344054;padding:0 12px;font-weight:750;cursor:pointer}.manager-action-link.disabled{display:inline-flex;align-items:center;opacity:.65;cursor:not-allowed}
.manager-today-note{margin-top:14px;padding:12px 14px;border:1px solid #d8e5f4;border-radius:12px;background:#eff6ff;color:#344054;font-size:12px;line-height:18px}
@media(max-width:900px){.manager-action-grid{grid-template-columns:1fr}}
@media(max-width:520px){.manager-today-hero{flex-direction:column}.manager-today-hero h1{font-size:23px;line-height:30px}.manager-today-refresh,.manager-action-link{min-height:44px}.manager-today-refresh{width:100%}.manager-action-card{padding:14px}}
`;document.head.appendChild(s);
}
function renderToday(){
 const root=document.getElementById('view-dashboard');if(!root)return;
 ensureTodayCss();root.classList.add('manager-today-v2');root.dataset.workforceTodayCanonical='1';
 const model=actionModel();
 const overall=model.some(x=>x.state==='ERROR')?'error':model.some(x=>x.state==='LOADING')?'loading':model.some(x=>x.state==='ACTION_REQUIRED')?'attention':'ready';
 root.dataset.actionCenterState=overall;
 root.innerHTML='<div class="manager-today-hero"><div><h1>Action Center</h1><p>Ưu tiên vận hành từ các Manager reader đã có. Không có doanh thu/KPI, deadline, owner hay pending count giả.</p></div><button type="button" class="manager-today-refresh" data-manager-today-refresh>↻ Làm mới canonical state</button></div><div class="manager-action-grid">'+model.map(card).join('')+'</div><div class="manager-today-note">Today chỉ đọc state và điều hướng. Mọi approve/review/publish vẫn diễn ra trong module canonical tương ứng với authority hiện hữu.</div>';
 root.querySelector('[data-manager-today-refresh]')?.addEventListener('click',()=>refreshToday());
}
async function refreshToday(){
 const root=document.getElementById('view-dashboard');if(!root)return;
 root.dataset.actionCenterState='loading';renderToday();
 const readers=['shift','attendance','availability','schedule'].map(stateApi).filter(x=>x?.refresh);
 const results=await Promise.allSettled(readers.map(x=>Promise.resolve().then(()=>x.refresh())));
 renderToday();
 return results;
}
function activate(view){
 const v=normalize(view);if(!routable.has(v))return false;
 const b=document.querySelector('.sidebar [data-view="'+v+'"]')||document.querySelector('[data-view="'+v+'"]');if(!b)return false;
 b.click();
 if(v==='dashboard')setTimeout(()=>{renderToday();void refreshToday()},0);
 return true;
}
function legacyTopRoute(){
 try{
  let w=window;for(let i=0;i<6&&w.parent&&w.parent!==w;i++)w=w.parent;
  const p=String(w.location.pathname||'').replace(/\/+$/,'').toLowerCase();
  if(p==='/05_manager/cong-viec')return 'tasks';
 }catch(_){}
 return null;
}
function applyHash(attempt=0){
 const compat=legacyTopRoute();
 const v=compat||normalize(location.hash)||'dashboard';
 if(!routable.has(v)){history.replaceState(null,'',location.pathname+location.search+'#dashboard');return activate('dashboard')}
 if(!activate(v)&&attempt<12)setTimeout(()=>applyHash(attempt+1),60);
}
function consolidate(){renameNav();hideDeprecated();renderToday();applyHash()}
document.addEventListener('click',e=>{
 const jump=e.target.closest?.('[data-workforce-jump]');if(jump){e.preventDefault();activate(jump.dataset.workforceJump);return}
 const nav=e.target.closest?.('[data-view]');if(nav&&allowed.has(normalize(nav.dataset.view))){
   const next='#'+normalize(nav.dataset.view);if(location.hash!==next)history.pushState({managerView:normalize(nav.dataset.view)},'',next);
 }
},true);
window.addEventListener('popstate',()=>applyHash());
window.addEventListener('hashchange',()=>applyHash());
document.addEventListener('magasin:shift-swap-resolved',()=>{if(document.getElementById('view-dashboard')?.classList.contains('active'))void refreshToday()});
document.addEventListener('magasin:shift-give-resolved',()=>{if(document.getElementById('view-dashboard')?.classList.contains('active'))void refreshToday()});
document.addEventListener('magasin:schedule-published',()=>{if(document.getElementById('view-dashboard')?.classList.contains('active'))void refreshToday()});
window.MAGASIN_MANAGER_TODAY_V2={refresh:refreshToday,getState:()=>({cards:actionModel(),uiState:document.getElementById('view-dashboard')?.dataset.actionCenterState||'unknown'})};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',consolidate,{once:true});else consolidate();
for(const ms of [50,250,1000])setTimeout(()=>{renameNav();hideDeprecated();renderToday()},ms);
})();
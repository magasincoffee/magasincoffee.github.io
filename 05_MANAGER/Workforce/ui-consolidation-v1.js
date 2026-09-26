(()=>{'use strict';
if(window.__MAGASIN_MANAGER_WORKFORCE_UI_CONSOLIDATED_V1__)return;
window.__MAGASIN_MANAGER_WORKFORCE_UI_CONSOLIDATED_V1__=true;

const labels={
  dashboard:'⌂ Hôm nay',
  staff:'◎ Nhân viên',
  workforce:'▦ Xếp lịch',
  schedule:'▤ Lịch làm',
  swap:'⇄ Đổi / cho ca',
  attendance:'◷ Chấm công',
  'payroll-self-check':'₫ Công / Lương'
};
const allowed=new Set(['dashboard','staff','workforce','schedule','swap','attendance','payroll-self-check']);
const alias={'cham-cong':'attendance','doi-ca':'swap','nhan-su':'staff','cong-luong':'payroll-self-check','payroll':'payroll-self-check'};
const pendingAttendance=new Set(['NORMAL','NEEDS_REVIEW']);
const todayState={phase:'idle',error:null,missing:[],shift:null,attendance:null,schedule:null,lastRefresh:null,inFlight:false};

function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function normalize(v){const s=String(v||'').replace(/^#/,'').trim().toLowerCase();return alias[s]||s}
function sourceButton(view){return document.querySelector('[data-view="'+CSS.escape(view)+'"]')}
function renameNav(){for(const [view,label] of Object.entries(labels)){const b=sourceButton(view);if(b)b.textContent=label}}
function hideDeprecated(){
 for(const view of ['kpi','academy']){const b=sourceButton(view);if(b){b.hidden=true;b.setAttribute('aria-hidden','true');b.tabIndex=-1}}
 for(const view of ['tasks','settings']){const b=sourceButton(view);if(b){b.hidden=true;b.setAttribute('aria-hidden','true');b.tabIndex=-1}}
 document.querySelector('[data-tab="demand"]')?.remove();
 document.getElementById('panel-demand')?.remove();
}

function ensureToday(){
 const root=document.getElementById('view-dashboard');if(!root)return null;
 root.classList.add('manager-today-v2');
 root.dataset.workforceTodayCanonical='1';
 if(root.querySelector('[data-manager-action-center]'))return root;
 root.innerHTML=
  '<section class="manager-today-v2__hero">'+
    '<div><div class="manager-today-v2__eyebrow">Manager · Hôm nay</div><h2>Action Center</h2>'+
    '<p>Chỉ tổng hợp trạng thái từ các reader/module canonical đã có. Không suy diễn KPI, doanh thu, deadline, owner hoặc số việc chưa có nguồn xác minh.</p></div>'+
    '<button type="button" class="m-button m-button--secondary btn manager-today-v2__refresh" data-manager-today-refresh>↻ Làm mới</button>'+
  '</section>'+
  '<div class="manager-action-center" data-manager-action-center>'+
    '<section class="manager-action-center__main"><div class="manager-action-center__head"><div><h3>Cần xử lý</h3><p>Ưu tiên theo trạng thái canonical hiện đọc được.</p></div><span class="m-badge" data-manager-today-summary>—</span></div><div class="manager-action-list" data-manager-action-list></div></section>'+
    '<aside class="manager-action-center__aside"><div class="manager-action-center__head"><div><h3>Đi nhanh</h3><p>Mở module hiện hữu; Today không có writer riêng.</p></div></div>'+
      '<div class="manager-quick-links">'+
        '<button type="button" class="manager-quick-link" data-manager-today-jump="staff"><span>Nhân viên</span><span aria-hidden="true">→</span></button>'+
        '<button type="button" class="manager-quick-link" data-manager-today-jump="schedule"><span>Lịch đã phát hành</span><span aria-hidden="true">→</span></button>'+
        '<button type="button" class="manager-quick-link" data-manager-today-jump="payroll-self-check"><span>Công / Lương</span><span aria-hidden="true">→</span></button>'+
      '</div>'+
      '<div class="manager-today-v2__truth-note">Swap/Give, Attendance và Scheduling được refresh qua chính module canonical hiện hữu. Nếu module chưa sẵn sàng, trạng thái hiển thị NOT_CONNECTED thay vì dựng dữ liệu.</div>'+
    '</aside>'+
  '</div>'+
  '<div class="manager-today-state" data-manager-today-status data-state="loading" role="status" aria-live="polite">Đang kết nối các nguồn vận hành canonical…</div>';
 root.querySelector('[data-manager-today-refresh]')?.addEventListener('click',()=>refreshToday());
 root.querySelectorAll('[data-manager-today-jump]').forEach(b=>b.addEventListener('click',()=>activate(b.dataset.managerTodayJump)));
 return root;
}

function badge(text,tone='info'){
 const cls=tone==='danger'?'m-status-badge--danger':tone==='attention'?'m-status-badge--warning':tone==='ok'?'m-status-badge--success':'m-status-badge--info';
 return '<span class="m-badge '+cls+' manager-action-card__status">'+esc(text)+'</span>';
}
function actionCard({view,icon,title,detail,status,tone='info',connected=true}){
 const tag=connected?'button':'div';
 const attrs=connected?' type="button" data-manager-today-jump="'+esc(view)+'"':' aria-disabled="true"';
 return '<'+tag+attrs+' class="manager-action-card" data-tone="'+esc(tone)+'" data-manager-action-source="'+esc(view)+'" data-connected="'+String(connected)+'">'+
   '<span class="manager-action-card__icon" aria-hidden="true">'+esc(icon)+'</span>'+
   '<span class="manager-action-card__copy"><span class="manager-action-card__title">'+esc(title)+'</span><span class="manager-action-card__detail">'+esc(detail)+'</span></span>'+
   badge(status,tone)+'</'+tag+'>';
}

function schedulePresentation(s){
 if(!s)return {tone:'info',status:'NOT_CONNECTED',detail:'Module xếp lịch chưa sẵn sàng.',connected:false};
 const status=String(s.generationStatus||'NONE').toUpperCase();
 const availability=Array.isArray(s.availability)?s.availability.length:0;
 if(status==='CONFLICT')return {tone:'danger',status:'CẦN XỬ LÝ',detail:'Có xung đột phiên xếp lịch canonical. Mở Xếp lịch để tải lại và xử lý.',connected:true};
 if(status==='REVIEWED')return {tone:'attention',status:'SẴN SÀNG',detail:'Lịch đã review và đang chờ phát hành. Availability đã đọc: '+availability+' bản ghi.',connected:true};
 if(status==='DRAFT')return {tone:'info',status:'DRAFT',detail:'Đang có bản nháp canonical. Availability đã đọc: '+availability+' bản ghi.',connected:true};
 if(status==='PUBLISHED')return {tone:'ok',status:'ĐÃ PHÁT HÀNH',detail:'Lịch tuần đã phát hành. Availability đã đọc: '+availability+' bản ghi.',connected:true};
 return {tone:'info',status:'CHƯA CÓ DRAFT',detail:'Chưa có phiên xếp lịch cho tuần mục tiêu. Availability đã đọc: '+availability+' bản ghi.',connected:true};
}

function renderToday(){
 const root=ensureToday();if(!root)return;
 root.dataset.managerTodayState=todayState.phase;
 const list=root.querySelector('[data-manager-action-list]');
 const statusBox=root.querySelector('[data-manager-today-status]');
 const summary=root.querySelector('[data-manager-today-summary]');
 if(!list||!statusBox||!summary)return;

 if(todayState.phase==='loading'){
   list.innerHTML='<div class="manager-today-state" data-state="loading">Đang tải Swap/Give, Attendance và Scheduling từ các module canonical…</div>';
   summary.textContent='Đang tải';
   statusBox.dataset.state='loading';
   statusBox.textContent='Đang làm mới Action Center. Không hiển thị số cũ như truth trong lúc tải.';
   return;
 }

 const shift=todayState.shift;
 const attendance=todayState.attendance;
 const schedule=schedulePresentation(todayState.schedule);
 const cards=[];
 let attentionCount=0;

 if(!shift){
   cards.push(actionCard({view:'swap',icon:'⇄',title:'Đổi / cho ca',detail:'Reader Swap/Give chưa kết nối trong runtime hiện tại.',status:'NOT_CONNECTED',tone:'info',connected:false}));
 }else if(shift.error){
   cards.push(actionCard({view:'swap',icon:'⇄',title:'Đổi / cho ca',detail:'Không tải được yêu cầu canonical: '+shift.error,status:'LỖI',tone:'danger'}));attentionCount++;
 }else{
   const swaps=Array.isArray(shift.swaps)?shift.swaps.length:0,gives=Array.isArray(shift.gives)?shift.gives.length:0,total=swaps+gives;
   if(total)attentionCount+=total;
   cards.push(actionCard({view:'swap',icon:'⇄',title:'Đổi / cho ca',detail:total?swaps+' đổi ca · '+gives+' cho ca đã tới trạng thái Manager xử lý.':'Không có yêu cầu Swap/Give canonical chờ Manager.',status:total?total+' CHỜ':'TRỐNG',tone:total?'attention':'ok'}));
 }

 if(!attendance){
   cards.push(actionCard({view:'attendance',icon:'◷',title:'Review chấm công',detail:'Reader Attendance review chưa kết nối trong runtime hiện tại.',status:'NOT_CONNECTED',tone:'info',connected:false}));
 }else if(attendance.error){
   cards.push(actionCard({view:'attendance',icon:'◷',title:'Review chấm công',detail:'Không tải được attendance canonical: '+attendance.error,status:'LỖI',tone:'danger'}));attentionCount++;
 }else{
   const rows=Array.isArray(attendance.rows)?attendance.rows:[],pending=rows.filter(r=>pendingAttendance.has(String(r.status||'').toUpperCase())).length;
   if(pending)attentionCount+=pending;
   cards.push(actionCard({view:'attendance',icon:'◷',title:'Review chấm công',detail:pending?pending+' bản ghi raw attendance đang cần Manager review.':'Không có attendance canonical cần review.',status:pending?pending+' CHỜ':'TRỐNG',tone:pending?'attention':'ok'}));
 }

 if(!todayState.schedule){
   cards.push(actionCard({view:'workforce',icon:'▦',title:'Xếp lịch tuần',detail:schedule.detail,status:schedule.status,tone:schedule.tone,connected:false}));
 }else{
   if(['CONFLICT','REVIEWED'].includes(String(todayState.schedule.generationStatus||'').toUpperCase()))attentionCount++;
   cards.push(actionCard({view:'workforce',icon:'▦',title:'Xếp lịch tuần',detail:schedule.detail,status:schedule.status,tone:schedule.tone,connected:schedule.connected}));
 }

 list.innerHTML=cards.join('');
 list.querySelectorAll('[data-manager-today-jump]').forEach(b=>b.addEventListener('click',()=>activate(b.dataset.managerTodayJump)));
 summary.textContent=attentionCount?String(attentionCount)+' tín hiệu':'Không có ngoại lệ';

 const missing=todayState.missing.length;
 if(todayState.phase==='error'){
   statusBox.dataset.state='error';
   statusBox.textContent='Một hoặc nhiều nguồn canonical không refresh được. Action Center đã fail closed và không giữ số liệu cũ. '+(todayState.error||'');
 }else if(missing){
   statusBox.dataset.state='not-connected';
   statusBox.textContent='NOT_CONNECTED: '+todayState.missing.join(', ')+'. Các nguồn còn lại vẫn hiển thị canonical state của chính chúng.';
 }else{
   statusBox.dataset.state='ready';
   statusBox.textContent=attentionCount?'Có trạng thái cần mở module để xử lý. Today chỉ deep-link, không thực hiện approve/review/publish.':'Không có ngoại lệ chờ xử lý từ các nguồn canonical đã kết nối.';
 }
}

function snapshot(api){
 try{return typeof api?.getState==='function'?api.getState():null}catch(_){return null}
}
function shiftSnapshot(){
 const api=window.MAGASIN_MANAGER_SHIFT_CHANGE;if(!api)return null;
 const direct=snapshot(api);if(direct)return direct;
 const root=document.getElementById('view-swap');
 if(!root)return {swaps:[],gives:[],loading:false,error:null,message:''};
 const msg=root.querySelector('#mSwapMsg')?.textContent||'';
 const error=/Không tải được yêu cầu/i.test(msg)?msg:null;
 return {
  swaps:[...root.querySelectorAll('.js-swap-approve')].map(x=>({id:x.dataset.id||null})),
  gives:[...root.querySelectorAll('.js-give-approve')].map(x=>({id:x.dataset.id||null})),
  loading:false,error,message:msg
 };
}
function attendanceSnapshot(){
 const api=window.MAGASIN_MANAGER_ATTENDANCE_REVIEW;if(!api)return null;
 const direct=snapshot(api)||{};
 const root=document.getElementById('view-attendance');
 const errorText=root?.querySelector('.mar-state.error')?.textContent||'';
 return {...direct,error:direct.error||errorText||null};
}

async function refreshToday(){
 ensureToday();
 if(todayState.inFlight)return;
 todayState.inFlight=true;todayState.phase='loading';todayState.error=null;todayState.missing=[];renderToday();
 const modules=[
   ['Swap/Give',()=>window.MAGASIN_MANAGER_SHIFT_CHANGE],
   ['Attendance',()=>window.MAGASIN_MANAGER_ATTENDANCE_REVIEW],
   ['Scheduling',()=>window.MAGASIN_MANAGER_SCHEDULE_DRAFT]
 ];
 const errors=[];
 for(const [name,get] of modules){
   const api=get();
   if(!api||typeof api.refresh!=='function'){todayState.missing.push(name);continue}
   try{await api.refresh()}catch(e){errors.push(name+': '+String(e?.message||e))}
 }
 todayState.shift=shiftSnapshot();
 todayState.attendance=attendanceSnapshot();
 todayState.schedule=snapshot(window.MAGASIN_MANAGER_SCHEDULE_DRAFT);
 if(todayState.shift?.error)errors.push('Swap/Give: '+todayState.shift.error);
 if(todayState.attendance?.error)errors.push('Attendance: '+todayState.attendance.error);
 todayState.lastRefresh=new Date().toISOString();
 todayState.error=errors.join(' · ')||null;
 todayState.phase=errors.length?'error':todayState.missing.length?'not-connected':'ready';
 todayState.inFlight=false;renderToday();
}

function activate(view){
 const v=normalize(view);if(!allowed.has(v))return false;
 const b=sourceButton(v);if(!b)return false;
 b.click();
 return true;
}
function applyHash(attempt=0){
 const v=normalize(location.hash);if(!v)return;
 if(!allowed.has(v)){history.replaceState(null,'',location.pathname+location.search);return}
 if(!activate(v)&&attempt<12)setTimeout(()=>applyHash(attempt+1),60);
}
function consolidate(){
 renameNav();hideDeprecated();ensureToday();applyHash();
 if(document.getElementById('view-dashboard')?.classList.contains('active'))void refreshToday();
}

document.addEventListener('click',e=>{
 const jump=e.target.closest?.('[data-workforce-jump],[data-manager-today-jump]');
 if(jump){
   e.preventDefault();
   activate(jump.dataset.workforceJump||jump.dataset.managerTodayJump);
   return;
 }
 const nav=e.target.closest?.('[data-view]');
 if(nav&&allowed.has(normalize(nav.dataset.view))){
   history.replaceState(null,'','#'+normalize(nav.dataset.view));
   if(normalize(nav.dataset.view)==='dashboard')setTimeout(()=>refreshToday(),0);
 }
},true);

for(const eventName of ['magasin:shift-swap-resolved','magasin:shift-give-resolved','magasin:schedule-published']){
 document.addEventListener(eventName,()=>{if(document.getElementById('view-dashboard')?.classList.contains('active'))setTimeout(()=>refreshToday(),0)});
}
window.addEventListener('hashchange',()=>{applyHash();if(normalize(location.hash)==='dashboard')setTimeout(()=>refreshToday(),0)});

window.MAGASIN_MANAGER_TODAY_V2={
 refresh:refreshToday,
 getState:()=>({
   phase:todayState.phase,error:todayState.error,missing:[...todayState.missing],
   shift:todayState.shift?{...todayState.shift,swaps:(todayState.shift.swaps||[]).map(x=>({...x})),gives:(todayState.shift.gives||[]).map(x=>({...x}))}:null,
   attendance:todayState.attendance?{...todayState.attendance,rows:(todayState.attendance.rows||[]).map(x=>({...x}))}:null,
   schedule:todayState.schedule?{...todayState.schedule,availability:(todayState.schedule.availability||[]).map(x=>({...x})),assignments:(todayState.schedule.assignments||[]).map(x=>({...x}))}:null,
   lastRefresh:todayState.lastRefresh
 }),
 render:renderToday,
 activate
};

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',consolidate,{once:true});else consolidate();
for(const ms of [50,250,1000])setTimeout(consolidate,ms);
})();
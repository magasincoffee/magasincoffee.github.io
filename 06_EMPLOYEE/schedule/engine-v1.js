(()=>{'use strict';
const C=globalThis.MAGASIN_CORE;if(!C)return;
const host=()=>document.getElementById('employeeApp');
const doc=()=>host()?.contentDocument||null;
const esc=C.security.escapeHtml,hm=C.time.time5,fmt=C.date.formatDate,add=C.date.addDays,mon=C.date.monday,mins=C.time.minutes;
const DAYS=['Thứ Hai','Thứ Ba','Thứ Tư','Thứ Năm','Thứ Sáu','Chủ Nhật'];
const ERROR_COPY={
  AUTH_REQUIRED:'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
  EMPLOYEE_NOT_ACTIVE:'Tài khoản hiện không thể xem lịch làm.',
  WEEK_START_MUST_BE_MONDAY:'Không thể xác định tuần lịch. Vui lòng tải lại.'
};
let state={rows:[],week:mon(),ready:false,error:null,loading:false,notice:null,actionPending:new Set()};
let requestSeq=0,pending=null;

const css='<style id="employee-schedule-engine-v1-css">'+
'.employee-schedule-engine{--sch-blue:#1d6fd6;--sch-ink:#17243a;--sch-muted:#66758b;--sch-line:#dbe5f0;--sch-soft:#f5f9fe}'+
'.employee-schedule-engine .schedule-hero{display:flex;justify-content:space-between;gap:16px;align-items:flex-start;padding:2px 0 16px;border-bottom:1px solid var(--sch-line)}'+
'.employee-schedule-engine .schedule-hero h2{margin:0;color:var(--sch-ink);font-size:24px;line-height:1.2}.employee-schedule-engine .schedule-hero p{margin:6px 0 0;color:var(--sch-muted);font-size:13px;line-height:1.5}'+
'.employee-schedule-engine .schedule-official{display:inline-flex;align-items:center;gap:6px;border:1px solid #b9d5f5;background:#edf6ff;color:#195ba8;border-radius:999px;padding:7px 10px;font-size:12px;font-weight:800;white-space:nowrap}'+
'.employee-schedule-engine .schedule-context{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:10px;margin:14px 0}'+
'.employee-schedule-engine .schedule-context-card{border:1px solid var(--sch-line);background:#fbfdff;border-radius:13px;padding:12px 13px}.employee-schedule-engine .schedule-context-card strong{display:block;color:var(--sch-ink);font-size:13px}.employee-schedule-engine .schedule-context-card span{display:block;color:var(--sch-muted);font-size:12px;margin-top:4px;line-height:1.45}'+
'.employee-schedule-engine .schedule-week-nav{display:flex;gap:7px;flex-wrap:wrap;align-items:center;margin:12px 0}.employee-schedule-engine .schedule-week-nav button{border:1px solid var(--sch-line);border-radius:10px;background:#fff;padding:8px 11px;font:inherit;font-size:12px;font-weight:750;color:#31445e;cursor:pointer;min-height:38px}.employee-schedule-engine .schedule-week-nav button[aria-current="true"]{background:#eaf4ff;border-color:#a8cdf5;color:#155da8}.employee-schedule-engine .schedule-week-nav button:disabled{opacity:.58;cursor:not-allowed}'+
'.employee-schedule-engine .schedule-statusline{display:flex;justify-content:space-between;align-items:center;gap:10px;margin:8px 0 12px}.employee-schedule-engine .schedule-statusline .pill{font-size:12px}.employee-schedule-engine .schedule-notice{display:none;margin:8px 0 12px;padding:10px 12px;border-radius:10px;border:1px solid #e4d39a;background:#fff9e8;color:#715611;font-size:12px;line-height:1.45}.employee-schedule-engine .schedule-notice.open{display:block}'+
'.employee-schedule-engine .days{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:9px;align-items:start}.employee-schedule-engine .day{min-width:0;border:1px solid var(--sch-line);border-radius:13px;background:#fff;padding:10px;box-shadow:0 3px 10px rgba(31,55,82,.04)}.employee-schedule-engine .day.today{border-color:#95c5f3;box-shadow:0 0 0 2px rgba(56,140,220,.08)}'+
'.employee-schedule-engine .day-head{display:flex;align-items:flex-start;justify-content:space-between;gap:6px;margin-bottom:9px}.employee-schedule-engine .dow{font-weight:850;color:var(--sch-ink);font-size:12px}.employee-schedule-engine .date{font-size:11px;color:var(--sch-muted);margin-top:2px}.employee-schedule-engine .today-tag{display:inline-flex;border-radius:999px;background:#e8f4ff;color:#1765b4;padding:3px 6px;font-size:9px;font-weight:900}'+
'.employee-schedule-engine .shift{border:1px solid #dbe6f2;border-radius:11px;background:#f9fbfe;padding:9px;margin-top:8px;overflow:hidden}.employee-schedule-engine .shift.morning-yellow{background:#fff9e6;border-color:#eadb96}.employee-schedule-engine .shift.afternoon-red{background:#fff2f2;border-color:#efc3c3}.employee-schedule-engine .shift.evening-cyan{background:#eefafa;border-color:#b4dddd}.employee-schedule-engine .shift-time{font-size:13px;font-weight:900;color:var(--sch-ink)}.employee-schedule-engine .shift-store{font-size:11px;color:#53657d;margin-top:4px;line-height:1.35}.employee-schedule-engine .shift-status{display:inline-flex;margin-top:7px;border-radius:999px;background:#e8f5ed;color:#197044;padding:3px 6px;font-size:9px;font-weight:850}.employee-schedule-engine .shift-actions{display:flex;gap:5px;flex-wrap:wrap;margin-top:8px}.employee-schedule-engine .shift-actions button{flex:1 1 auto;border:1px solid #ccdbea;border-radius:8px;background:#fff;padding:6px 7px;font:inherit;font-size:10px;font-weight:800;color:#2f5279;cursor:pointer;min-height:31px}.employee-schedule-engine .shift-actions button.primary-action{background:#eaf4ff;border-color:#b2d2f5;color:#155da8}.employee-schedule-engine .shift-actions button:disabled{opacity:.55;cursor:not-allowed}'+
'.employee-schedule-engine .schedule-day-empty{color:#8794a6;font-size:11px;padding:10px 2px 4px}.employee-schedule-engine .schedule-week-empty,.employee-schedule-engine .schedule-error{grid-column:1/-1;border:1px dashed #c9d8e8;border-radius:14px;background:#fbfdff;padding:28px 18px;text-align:center;color:#53657d}.employee-schedule-engine .schedule-error{border-style:solid;border-color:#efc3c3;background:#fff5f5;color:#873b3b}.employee-schedule-engine .schedule-error button{margin-top:12px;border:1px solid #d9a9a9;border-radius:9px;background:#fff;padding:8px 11px;font:inherit;font-weight:800;color:#873b3b;cursor:pointer}'+
'.employee-schedule-engine .schedule-skeleton{grid-column:1/-1;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.employee-schedule-engine .schedule-skeleton span{height:112px;border-radius:13px;background:linear-gradient(90deg,#eef3f8 25%,#f8fbfe 37%,#eef3f8 63%);background-size:400% 100%;animation:schedPulse 1.3s ease infinite}@keyframes schedPulse{0%{background-position:100% 0}100%{background-position:0 0}}'+
'.employee-schedule-engine .schedule-availability{display:flex;align-items:center;justify-content:space-between;gap:14px;margin-top:14px;border:1px solid #d8e6f3;background:#f7fbff;border-radius:13px;padding:12px 13px}.employee-schedule-engine .schedule-availability strong{display:block;color:var(--sch-ink);font-size:12px}.employee-schedule-engine .schedule-availability p{margin:4px 0 0;color:var(--sch-muted);font-size:11px;line-height:1.45}.employee-schedule-engine .schedule-availability button{border:1px solid #bfd6ef;background:#fff;color:#205c98;border-radius:9px;padding:8px 10px;font:inherit;font-size:11px;font-weight:800;cursor:pointer;white-space:nowrap}'+
'@media(max-width:960px){.employee-schedule-engine .days{grid-template-columns:repeat(2,minmax(0,1fr))}}'+
'@media(max-width:600px){.employee-schedule-engine .schedule-hero{display:block}.employee-schedule-engine .schedule-official{margin-top:10px}.employee-schedule-engine .schedule-context{grid-template-columns:1fr}.employee-schedule-engine .days{grid-template-columns:1fr}.employee-schedule-engine .day{padding:11px}.employee-schedule-engine .schedule-day-empty{padding:3px 0 1px}.employee-schedule-engine .schedule-skeleton{grid-template-columns:1fr}.employee-schedule-engine .schedule-skeleton span:nth-child(n+3){display:none}.employee-schedule-engine .schedule-availability{align-items:flex-start;flex-direction:column}.employee-schedule-engine .schedule-availability button{width:100%;min-height:40px}.employee-schedule-engine .shift-actions button{min-height:38px;font-size:11px}.employee-schedule-engine .schedule-week-nav button{flex:1 1 auto}}'+
'</style>';

function errorCode(e){
  const message=String(e?.message||'')+' '+String(e?.code||'');
  for(const code of Object.keys(ERROR_COPY))if(message.includes(code))return code;
  return 'SCHEDULE_READ_FAILED';
}
function friendlyError(e){return ERROR_COPY[errorCode(e)]||'Không thể tải lịch làm lúc này. Vui lòng thử lại.'}
function ensureCss(d){if(d&&!d.getElementById('employee-schedule-engine-v1-css'))d.head.insertAdjacentHTML('beforeend',css)}
function ensureShell(d){
  const panel=d?.querySelector('#view-schedule .schedule-main-panel');if(!panel)return null;
  panel.classList.add('employee-schedule-engine');
  if(panel.dataset.scheduleShell==='sched03')return panel;
  panel.dataset.scheduleShell='sched03';
  panel.innerHTML=
    '<div class="schedule-hero"><div><h2>Lịch làm chính thức</h2><p>Chỉ hiển thị ca đã được phát hành và hiện đang thuộc về bạn.</p></div><span class="schedule-official">✓ Lịch chính thức</span></div>'+
    '<div class="schedule-context"><div class="schedule-context-card"><strong>Hôm nay</strong><span id="employeeScheduleToday">—</span></div><div class="schedule-context-card"><strong>Nguồn lịch</strong><span>work_schedules · chỉ ca APPROVED của tài khoản hiện tại</span></div></div>'+
    '<div class="schedule-week-nav" data-schedule-week-nav="1"><button type="button" data-schedule-week="prev">← Trước</button><button type="button" data-schedule-week="today">Tuần này</button><button type="button" data-schedule-week="next">Tuần sau →</button></div>'+
    '<div class="schedule-statusline"><span class="pill">Đang tải…</span></div>'+
    '<div class="schedule-notice" role="status" aria-live="polite"></div>'+
    '<div class="days" aria-live="polite"></div>'+
    '<div class="schedule-availability"><div><strong>Đăng ký thời gian có thể làm ≠ lịch chính thức</strong><p>Availability chỉ là thời gian bạn có thể nhận ca. Ca chỉ trở thành lịch làm khi đã được quản lý phát hành và xuất hiện ở phía trên.</p></div><button type="button" data-schedule-availability>Đăng ký Availability</button></div>';
  return panel;
}
function identity(d){
  const p=globalThis.MAGASIN_EMPLOYEE?.profile;if(!p||!d)return;
  const n=p.full_name||p.username||'Nhân viên';
  const r=C.roles.label[String(p.role||'STAFF').toUpperCase()]||String(p.role||'STAFF');
  d.querySelector('.header-user-text strong')?.replaceChildren(d.createTextNode(n));
  d.querySelector('.header-user-text span')?.replaceChildren(d.createTextNode(r));
  const a=d.querySelector('.header-avatar');if(a)a.textContent=n.charAt(0).toUpperCase();
}
function setNotice(d,text){
  state.notice=text||null;
  const box=d?.querySelector('#view-schedule .schedule-notice');if(!box)return;
  box.textContent=state.notice||'';
  box.classList.toggle('open',!!state.notice);
}
function isApproved(r){return String(r?.status||'').toUpperCase()==='APPROVED'&&!!r?.schedule_id}
function actionEligibility(r){
  const today=C.date.dateKey();
  const date=String(r.work_date||'').slice(0,10);
  return {attendance:date<=today,giveSwap:date>=today};
}
function actionHtml(r){
  const eligible=actionEligibility(r),id=esc(r.schedule_id);
  let out='<div class="shift-actions">';
  if(eligible.attendance)out+='<button type="button" class="primary-action" data-schedule-action="attendance" data-schedule-id="'+id+'">Chấm công</button>';
  if(eligible.giveSwap){
    out+='<button type="button" data-schedule-action="give" data-schedule-id="'+id+'">Cho ca</button>';
    out+='<button type="button" data-schedule-action="swap" data-schedule-id="'+id+'">Đổi ca</button>';
  }
  return out+'</div>';
}
function updateNav(d){
  const current=mon(),next=add(current,7);
  d?.querySelectorAll('[data-schedule-week]').forEach(b=>{
    const action=b.dataset.scheduleWeek;
    const active=(action==='today'&&state.week===current)||(action==='next'&&state.week===next);
    b.setAttribute('aria-current',active?'true':'false');
    b.disabled=state.loading;
  });
}
function paint(d){
  if(!d||!d.body)return;
  ensureCss(d);ensureShell(d);identity(d);updateNav(d);
  const days=d.querySelector('#view-schedule .days');if(!days)return;
  const pill=d.querySelector('#view-schedule .pill');
  const todayEl=d.getElementById('employeeScheduleToday');
  if(todayEl)todayEl.textContent=fmt(C.date.dateKey())+' · '+(DAYS[C.date.weekDays(mon()).indexOf(C.date.dateKey())]||'Hôm nay');
  const label='Tuần '+fmt(state.week)+'–'+fmt(add(state.week,6));
  if(state.loading){
    days.innerHTML='<div class="schedule-skeleton" data-schedule-loading="1"><span></span><span></span><span></span></div>';
    if(pill)pill.textContent='Đang tải · '+label;updateNav(d);return;
  }
  if(state.error){
    days.innerHTML='<div data-schedule-error="1" class="schedule-error"><b>Không tải được lịch làm</b><div style="margin-top:6px">'+esc(state.error)+'</div><button type="button" data-schedule-retry>Thử lại</button></div>';
    if(pill)pill.textContent='Cần tải lại · '+label;updateNav(d);return;
  }
  const weekRows=state.rows.filter(isApproved);
  if(!weekRows.length){
    days.innerHTML='<div data-schedule-empty="1" class="schedule-week-empty"><b>Tuần này chưa có ca được phát hành.</b><div style="margin-top:6px">Khi quản lý publish lịch, ca chính thức của bạn sẽ xuất hiện tại đây.</div></div>';
    if(pill)pill.textContent='0 ca · '+label;updateNav(d);return;
  }
  days.replaceChildren(...C.date.weekDays(state.week).map((date,i)=>{
    const el=d.createElement('div');el.className='day'+(date===C.date.dateKey()?' today':'');el.dataset.scheduleDate=date;
    el.innerHTML='<div class="day-head"><div><div class="dow">'+DAYS[i]+'</div><div class="date">'+fmt(date)+'</div></div>'+(date===C.date.dateKey()?'<span class="today-tag">HÔM NAY</span>':'')+'</div>';
    const rows=weekRows.filter(r=>String(r.work_date).slice(0,10)===date).sort((a,b)=>mins(a.start_time)-mins(b.start_time)||mins(a.end_time)-mins(b.end_time));
    if(!rows.length){el.insertAdjacentHTML('beforeend','<div class="schedule-day-empty">Không có ca</div>');return el}
    for(const r of rows){
      const sh=d.createElement('article'),k=C.time.shiftKind(r.start_time);
      sh.className='shift '+(k==='morning'?'morning-yellow':k==='afternoon'?'afternoon-red':'evening-cyan');
      sh.dataset.scheduleId=String(r.schedule_id);
      sh.dataset.scheduleStatus='APPROVED';
      sh.innerHTML='<div class="shift-time">'+esc(hm(r.start_time))+'–'+esc(hm(r.end_time))+'</div>'+
        '<div class="shift-store">'+esc(r.store_code||r.store_name||'Cửa hàng')+'</div>'+
        '<span class="shift-status">Đã phát hành</span>'+actionHtml(r);
      el.appendChild(sh);
    }
    return el;
  }));
  if(pill)pill.textContent=weekRows.length+' ca · '+label;
  updateNav(d);
}
async function readWeek(week){
  const q=await C.supabase.rpc('list_my_approved_schedules_v2',{p_week_start:week});
  if(q.error)throw q.error;
  return (Array.isArray(q.data)?q.data:[]).filter(isApproved);
}
async function refresh(){
  const d=doc();if(!d||!d.body)return;
  bind(d);ensureShell(d);
  const requestedWeek=state.week||mon();state.week=requestedWeek;
  if(pending?.week===requestedWeek)return pending.promise;
  const seq=++requestSeq;state.loading=true;state.error=null;state.notice=null;state.rows=[];paint(d);
  C.ui.setLoading?.(d.body,true);
  const run=(async()=>{
    try{
      const rows=await readWeek(requestedWeek);
      if(seq!==requestSeq||requestedWeek!==state.week)return;
      state.rows=rows;state.error=null;state.loading=false;state.ready=true;paint(d);
      globalThis.MAGASIN_EMPLOYEE?.events?.emit?.('schedule-loaded',{rows:state.rows.map(r=>({...r})),week:requestedWeek});
    }catch(e){
      if(seq!==requestSeq||requestedWeek!==state.week)return;
      state.rows=[];state.error=friendlyError(e);state.loading=false;paint(d);
    }finally{
      if(seq===requestSeq&&doc()===d&&d.body)C.ui.setLoading?.(d.body,false);
    }
  })();
  pending={week:requestedWeek,promise:run};try{return await run}finally{if(pending?.promise===run)pending=null}
}
async function preflight(scheduleId){
  const row=state.rows.find(r=>String(r.schedule_id)===String(scheduleId));
  if(!row)return null;
  const week=mon(String(row.work_date).slice(0,10));
  let fresh;
  try{fresh=await readWeek(week)}catch(_){
    setNotice(doc(),'Chưa thể xác minh lại ca này. Vui lòng thử lại.');
    return null;
  }
  if(week===state.week){state.rows=fresh;paint(doc())}
  const current=fresh.find(r=>String(r.schedule_id)===String(scheduleId))||null;
  if(!current){
    setNotice(doc(),'Lịch vừa thay đổi. Ca này không còn thuộc lịch chính thức của bạn.');
    globalThis.MAGASIN_EMPLOYEE?.events?.emit?.('schedule-stale',{schedule_id:String(scheduleId),week});
    return null;
  }
  return {row:current,week};
}
async function openAction(action,scheduleId){
  const key=action+':'+scheduleId;if(state.actionPending.has(key))return;
  state.actionPending.add(key);
  const d=doc();d?.querySelectorAll('[data-schedule-id="'+CSS.escape(String(scheduleId))+'"] [data-schedule-action]').forEach(b=>b.disabled=true);
  try{
    const current=await preflight(scheduleId);if(!current)return;
    setNotice(d,null);
    if(action==='attendance'){
      d?.defaultView?.showView?.('attendance');
      await globalThis.MAGASIN_EMPLOYEE?.attendance?.openSchedule?.(current.row.schedule_id,current.week);
      return;
    }
    if(action==='give'||action==='swap'){
      d?.defaultView?.showView?.('swap');
      const api=globalThis.MAGASIN_EMPLOYEE?.swap;
      if(action==='give')await api?.openGive?.(current.row.schedule_id,current.week);
      else await api?.openSwap?.(current.row.schedule_id,current.week);
    }
  }finally{
    state.actionPending.delete(key);
    d?.querySelectorAll('[data-schedule-id="'+CSS.escape(String(scheduleId))+'"] [data-schedule-action]').forEach(b=>b.disabled=false);
  }
}
function openAvailability(){
  const d=doc();if(!d)return;
  d.defaultView?.showView?.('dashboard');
  setTimeout(()=>globalThis.MAGASIN_EMPLOYEE?.availability?.open?.(),0);
}
function bind(d){
  if(!d||!d.body||d.body.dataset.employeeScheduleEngine==='1')return;
  d.body.dataset.employeeScheduleEngine='1';
  d.addEventListener('click',e=>{
    const weekButton=e.target.closest?.('[data-schedule-week]');
    if(weekButton){
      const action=weekButton.dataset.scheduleWeek;
      state.week=action==='prev'?add(state.week,-7):action==='next'?add(mon(),7):mon();
      state.notice=null;void refresh();return;
    }
    if(e.target.closest?.('[data-schedule-retry]')){void refresh();return}
    if(e.target.closest?.('[data-schedule-availability]')){openAvailability();return}
    const actionButton=e.target.closest?.('[data-schedule-action][data-schedule-id]');
    if(actionButton){void openAction(actionButton.dataset.scheduleAction,actionButton.dataset.scheduleId);return}
    const a=e.target.closest?.('a,[data-view]');if(a?.dataset?.view==='schedule')setTimeout(()=>{void refresh()},0);
  },true);
}
function bootFrame(attempt=0){const d=doc();if(!d?.body){if(attempt<20)setTimeout(()=>bootFrame(attempt+1),25);return}bind(d);ensureShell(d);void refresh()}
function init(){const f=host();if(!f||f.dataset.scheduleEngine==='1')return;f.dataset.scheduleEngine='1';f.addEventListener('load',()=>bootFrame(),{once:false});bootFrame()}
globalThis.MAGASIN_EMPLOYEE=globalThis.MAGASIN_EMPLOYEE||{};
globalThis.MAGASIN_EMPLOYEE.schedule={
  refresh,
  openAction,
  getRows:()=>state.rows.map(r=>({...r})),
  getWeek:()=>state.week,
  getTodayRows:()=>state.rows.filter(r=>String(r.work_date).slice(0,10)===C.date.dateKey()),
  getState:()=>({week:state.week,loading:state.loading,error:state.error,notice:state.notice,rowCount:state.rows.length})
};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
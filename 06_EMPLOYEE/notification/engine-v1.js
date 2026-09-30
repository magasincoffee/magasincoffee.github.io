(()=>{'use strict';
const C=globalThis.MAGASIN_CORE;if(!C)return;
const host=()=>document.getElementById('employeeApp');
const doc=()=>host()?.contentDocument||null;
const esc=C.security.escapeHtml;
const panel=()=>doc()?.getElementById('view-notice');
let state={loading:false,error:null,rows:[],ready:false};
function when(v){
  if(!v)return '';
  try{return new Intl.DateTimeFormat('vi-VN',{timeZone:'Asia/Ho_Chi_Minh',day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(v))}
  catch(_){return ''}
}
function icon(type){
  const t=String(type||'');
  if(t.startsWith('SCHEDULE_'))return '📅';
  if(t.startsWith('ATTENDANCE_')||t==='CLOCK_OUT_REMINDER')return '⏱';
  if(t.startsWith('SHIFT_SWAP_'))return '🔄';
  if(t.startsWith('SHIFT_GIVE_'))return '→';
  return '🔔';
}
function timeline(){return panel()?.querySelector('.timeline')||null}
function render(){
  const root=timeline();if(!root)return;
  if(state.loading){root.innerHTML='<div class="timeline-item employee-people-state info" data-notification-loading="1" role="status"><b>Đang tải thông báo…</b></div>';return}
  if(state.error){
    root.innerHTML='<div class="timeline-item employee-people-state error" data-notification-error="1" role="alert"><b>Không thể tải thông báo lúc này.</b><div class="muted" style="margin-top:5px">Vui lòng thử lại.</div><button class="m-button m-button--secondary" type="button" data-notification-retry style="margin-top:10px">Thử lại</button></div>';
    root.querySelector('[data-notification-retry]')?.addEventListener('click',()=>refresh());
    return;
  }
  if(!state.rows.length){
    root.innerHTML='<div class="timeline-item employee-people-state empty" data-notification-empty="1"><b>Bạn chưa có thông báo nào.</b><div class="muted" style="margin-top:5px">Các thay đổi về lịch làm, chấm công, đổi ca và cho ca sẽ hiển thị tại đây.</div></div>';
    return;
  }
  root.innerHTML=state.rows.map(r=>'<div class="timeline-item" data-notification-id="'+esc(r.id||'')+'"><div style="display:flex;gap:10px;align-items:flex-start"><div aria-hidden="true" style="font-size:20px;line-height:1">'+icon(r.event_type)+'</div><div style="min-width:0;flex:1"><b>'+esc(r.title||'Thông báo')+'</b><div style="margin-top:4px">'+esc(r.message||'')+'</div><div class="muted" style="margin-top:6px;font-size:11px">'+esc(when(r.available_at||r.created_at))+'</div></div></div></div>').join('');
}
async function refresh(){
  if(state.loading)return;
  state.loading=true;state.error=null;render();
  try{
    const q=await C.supabase.rpc('list_my_notifications_v1',{p_limit:50});
    if(q.error)throw q.error;
    state.rows=Array.isArray(q.data)?q.data:[];state.error=null;state.ready=true;
  }catch(e){state.rows=[];state.error=String(e?.code||e?.message||'NOTIFICATION_REQUEST_FAILED');state.ready=true}
  finally{state.loading=false;render()}
}
function init(){
  const f=host();if(!f||f.dataset.notificationEngine==='1')return;
  f.dataset.notificationEngine='1';
  f.addEventListener('load',refresh);
  if(f.contentDocument)refresh();
}
globalThis.MAGASIN_EMPLOYEE=globalThis.MAGASIN_EMPLOYEE||{};
globalThis.MAGASIN_EMPLOYEE.notification={refresh,get state(){return {loading:state.loading,error:state.error,rows:state.rows.map(x=>({...x})),ready:state.ready}}};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
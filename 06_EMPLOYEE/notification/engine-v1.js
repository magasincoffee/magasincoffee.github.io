(()=>{'use strict';
const C=globalThis.MAGASIN_CORE;if(!C)return;
const host=()=>document.getElementById('employeeApp');
const doc=()=>host()?.contentDocument||null;
const esc=C.security.escapeHtml;
const panel=()=>doc()?.getElementById('view-notice');
let loading=false;

function when(v){
  if(!v)return '';
  try{
    return new Intl.DateTimeFormat('vi-VN',{
      timeZone:'Asia/Ho_Chi_Minh',day:'2-digit',month:'2-digit',
      hour:'2-digit',minute:'2-digit',hour12:false
    }).format(new Date(v));
  }catch(_){return String(v)}
}
function icon(type){
  const t=String(type||'');
  if(t.startsWith('SCHEDULE_'))return '📅';
  if(t.startsWith('ATTENDANCE_')||t==='CLOCK_OUT_REMINDER')return '⏱';
  if(t.startsWith('SHIFT_SWAP_'))return '🔄';
  if(t.startsWith('SHIFT_GIVE_'))return '→';
  return '🔔';
}
function render(rows,error=''){
  const root=panel();if(!root)return;
  const timeline=root.querySelector('.timeline');if(!timeline)return;
  if(error){
    timeline.innerHTML=`<div class="timeline-item"><b>Không tải được thông báo</b><div class="muted" style="margin-top:5px">${esc(error)}</div></div>`;
    return;
  }
  if(!rows.length){
    timeline.innerHTML='<div class="timeline-item"><b>Chưa có thông báo mới.</b><div class="muted" style="margin-top:5px">Các thay đổi lịch, chấm công, đổi ca và cho ca sẽ hiển thị tại đây.</div></div>';
    return;
  }
  timeline.innerHTML=rows.map(r=>`<div class="timeline-item" data-notification-id="${esc(r.id||'')}"><div style="display:flex;gap:10px;align-items:flex-start"><div aria-hidden="true" style="font-size:20px;line-height:1">${icon(r.event_type)}</div><div style="min-width:0;flex:1"><b>${esc(r.title||'Thông báo')}</b><div style="margin-top:4px">${esc(r.message||'')}</div><div class="muted" style="margin-top:6px;font-size:11px">${esc(when(r.available_at||r.created_at))}</div></div></div></div>`).join('');
}
async function refresh(){
  if(loading)return;loading=true;
  try{
    const q=await C.supabase.rpc('list_my_notifications_v1',{p_limit:50});
    if(q.error)throw q.error;
    render(Array.isArray(q.data)?q.data:[]);
  }catch(e){render([],e?.message||e?.code||'UNKNOWN')}
  finally{loading=false}
}
function init(){
  const f=host();if(!f||f.dataset.notificationEngine==='1')return;
  f.dataset.notificationEngine='1';
  f.addEventListener('load',refresh);
  if(f.contentDocument)refresh();
}
globalThis.MAGASIN_EMPLOYEE=globalThis.MAGASIN_EMPLOYEE||{};
globalThis.MAGASIN_EMPLOYEE.notification={refresh};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
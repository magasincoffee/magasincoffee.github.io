(()=>{'use strict';
const C=globalThis.MAGASIN_CORE;if(!C)return;
const host=()=>document.getElementById('employeeApp'),d=()=>host()?.contentDocument||null;
const esc=C.security.escapeHtml,hm=C.time.time5,fmt=C.date.formatDate;
let mode='swap',state={my:[],candidates:[],swapHistory:[],incomingSwaps:[],giveHistory:[],profile:null,week:C.date.monday(),selectedScheduleId:null};

function panel(){return d()?.getElementById('view-swap')}
function show(t){const x=panel(),e=x?.querySelector('#swapResult');if(e){e.textContent=t;e.classList.add('open')}}
function myShiftOptions(){return state.my.map(r=>`<option value="${esc(r.schedule_id||'')}"${String(r.schedule_id)===String(state.selectedScheduleId)?' selected':''}>${esc(fmt(r.work_date))} · ${esc(hm(r.start_time))}–${esc(hm(r.end_time))} · ${esc(r.store_code||r.store_name||'')}</option>`).join('')}
function statusBadge(status){const s=String(status||'').toUpperCase();return s==='APPROVED'?'green':s.startsWith('REJECTED')||s==='CANCELLED'?'red':s==='PENDING_MANAGER'||s==='PEER_ACCEPTED'?'blue':'amber'}
function statusLabel(status){return ({PENDING_RECIPIENT:'Chờ người nhận',PENDING_MANAGER:'Đã đồng ý nhận ca · Chờ quản lý duyệt',APPROVED:'Đã duyệt',REJECTED_RECIPIENT:'Người nhận từ chối',REJECTED_MANAGER:'Quản lý từ chối',PENDING:'Chờ người kia đồng ý',PEER_ACCEPTED:'Người kia đã đồng ý · Chờ quản lý',REJECTED:'Đã từ chối',CANCELLED:'Đã hủy'})[String(status||'').toUpperCase()]||String(status||'')}

async function loadProfile(){
  if(state.profile)return state.profile;
  try{
    state.profile=await C.supabase.getProfile?.()||null;
  }catch(_){state.profile=null}
  return state.profile;
}

async function loadMy(week=state.week||C.date.monday(),selectedScheduleId=state.selectedScheduleId){
  state.week=week||C.date.monday();
  const q=await C.supabase.rpc('list_my_approved_schedules_v2',{p_week_start:state.week});
  if(q.error){
    state.my=[];state.selectedScheduleId=null;
    C.ui.toast('Không thể tải lịch chính thức để đổi/cho ca. Vui lòng thử lại.','error');
  }else{
    state.my=(Array.isArray(q.data)?q.data:[]).filter(r=>String(r.status||'APPROVED').toUpperCase()==='APPROVED');
    if(selectedScheduleId&&state.my.some(r=>String(r.schedule_id)===String(selectedScheduleId)))state.selectedScheduleId=selectedScheduleId;
    else if(selectedScheduleId){
      state.selectedScheduleId=null;
      show('Ca này không còn thuộc lịch chính thức của bạn. Lịch đã được làm mới.');
    }else state.selectedScheduleId=state.my[0]?.schedule_id||null;
  }
  const x=panel(),card=x?.querySelector('.swap-card');
  if(card){
    card.querySelector('.employeeSwapSchedule')?.remove();
    const wrap=x.ownerDocument.createElement('div');
    wrap.className='field employeeSwapSchedule';
    wrap.innerHTML=`<label>Ca chính thức của tôi</label><select id="employeeRequesterSchedule">${myShiftOptions()}</select><div class="muted" style="margin-top:5px">Danh sách được tải lại từ lịch đã phát hành hiện tại.</div>`;
    card.appendChild(wrap);
    const select=wrap.querySelector('#employeeRequesterSchedule');
    select?.addEventListener('change',()=>{state.selectedScheduleId=select.value||null;void loadCandidates()});
  }
  await loadCandidates();
  await loadHistory();
  return !!state.selectedScheduleId;
}
async function loadCandidates(){
  const x=panel(),sel=x?.querySelector('#employeeRequesterSchedule'),box=x?.querySelector('#employeeSwapTarget');
  if(!sel||!box)return;
  const name=mode==='give'?'list_shift_give_candidates_v1':'list_shift_swap_candidates_v1';
  const args=mode==='give'?{p_schedule_id:sel.value||null}:{p_requester_schedule_id:sel.value||null};
  const q=await C.supabase.rpc(name,args);
  if(q.error){state.candidates=[];box.innerHTML='<option value="">Không thể tải người/ca phù hợp</option>';C.ui.toast('Không thể tải người/ca phù hợp lúc này.','error');return}
  state.candidates=Array.isArray(q.data)?q.data:[];
  box.innerHTML=state.candidates.length
    ?state.candidates.map(r=>mode==='give'
      ?`<option value="${esc(r.user_id)}">${esc(r.user_name)} · ${esc(fmt(r.work_date))} · ${esc(hm(r.start_time))}–${esc(hm(r.end_time))}</option>`
      :`<option value="${esc(r.schedule_id)}">${esc(r.user_name)} · ${esc(fmt(r.work_date))} · ${esc(hm(r.start_time))}–${esc(hm(r.end_time))}</option>`).join('')
    :'<option value="">Không có người/ca phù hợp</option>';
}

async function submit(){
  const x=panel(),req=x?.querySelector('#employeeRequesterSchedule'),target=x?.querySelector('#employeeSwapTarget'),reason=x?.querySelector('#employeeSwapReason');
  if(!req?.value||!target?.value)return show(mode==='give'?'Vui lòng chọn ca của bạn và người nhận.':'Vui lòng chọn ca của bạn và ca muốn đổi.');
  const reasonText=String(reason?.value||'').trim();
  if(!reasonText)return show(mode==='give'?'Vui lòng nhập lý do cho ca.':'Vui lòng nhập lý do đổi ca.');
  const rpcName=mode==='give'?'submit_shift_give_request':'submit_shift_swap_request';
  const args=mode==='give'
    ?{p_schedule_id:req.value,p_recipient_user_id:target.value,p_reason:reasonText}
    :{p_requester_schedule_id:req.value,p_target_schedule_id:target.value,p_reason:reasonText};
  const q=await C.supabase.rpc(rpcName,args);
  if(q.error)return show(mode==='give'?'Không thể gửi yêu cầu cho ca. Dữ liệu ca có thể vừa thay đổi.':'Không thể gửi yêu cầu đổi ca. Dữ liệu ca có thể vừa thay đổi.');
  const message=mode==='give'?'Đã gửi yêu cầu cho ca. Chờ người nhận đồng ý.':'Đã gửi yêu cầu đổi ca. Chờ người kia đồng ý.';
  show(message);C.ui.toast(message,'success');await loadHistory();
}

async function respondSwap(id,accept){
  const q=await C.supabase.rpc('respond_shift_swap_request',{p_swap_id:id,p_accept:!!accept});
  if(q.error){C.ui.toast('Không thể xử lý yêu cầu đổi ca lúc này.','error');return}
  C.ui.toast(accept?'Đã đồng ý đổi ca. Yêu cầu đang chờ quản lý duyệt.':'Đã từ chối đổi ca.',accept?'success':'info');
  await loadMy();
}

async function respondGive(id,accept){
  const q=await C.supabase.rpc('respond_shift_give_request',{p_give_id:id,p_accept:!!accept});
  if(q.error){C.ui.toast('Không thể xử lý yêu cầu cho ca lúc này.','error');return}
  C.ui.toast(accept?'Đã đồng ý nhận ca. Yêu cầu đang chờ quản lý duyệt.':'Đã từ chối nhận ca.',accept?'success':'info');
  await loadHistory();
}

async function loadHistory(){
  await loadProfile();
  const [swapQ,incomingQ,giveQ]=await Promise.all([
    C.supabase.rpc('list_my_shift_swaps_v2'),
    C.supabase.rpc('list_my_incoming_shift_swaps_v1'),
    C.supabase.rpc('list_my_shift_gives_v1')
  ]);
  state.swapHistory=swapQ.error?[]:(Array.isArray(swapQ.data)?swapQ.data:[]);
  state.incomingSwaps=incomingQ.error?[]:(Array.isArray(incomingQ.data)?incomingQ.data:[]);
  state.giveHistory=giveQ.error?[]:(Array.isArray(giveQ.data)?giveQ.data:[]);
  renderHistory();
}

function renderHistory(){
  const x=panel(),box=x?.querySelector('#historyList');if(!box)return;
  const rows=[];
  for(const r of state.incomingSwaps){
    const pending=String(r.status||'').toUpperCase()==='PENDING';
    const actions=pending
      ?`<div style="display:flex;gap:6px;margin-top:8px"><button class="btn secondary js-swap-peer-reject" data-id="${esc(r.id)}">Từ chối</button><button class="btn primary js-swap-peer-accept" data-id="${esc(r.id)}">Đồng ý đổi ca</button></div>`
      :'';
    const incomingLabel=String(r.status||'').toUpperCase()==='PEER_ACCEPTED'
      ?'Đã đồng ý · Chờ quản lý duyệt'
      :statusLabel(r.status);
    rows.push(`<div class="history-item"><div><b>Đổi ca gửi đến bạn · ${esc(fmt(r.target_date))} · ${esc(hm(r.target_start))}–${esc(hm(r.target_end))}</b><div class="muted">Từ ${esc(r.requester_name||'Nhân viên')} · ca đối ứng ${esc(fmt(r.requester_date))} · ${esc(hm(r.requester_start))}–${esc(hm(r.requester_end))} · ${esc(r.store_code||'')} · ${esc(r.reason||'')}</div>${actions}</div><span class="badge ${statusBadge(r.status)}">${esc(incomingLabel)}</span></div>`);
  }
  for(const r of state.giveHistory){
    const incoming=state.profile?.id&&String(r.recipient_id)===String(state.profile.id);
    const actions=incoming&&String(r.status).toUpperCase()==='PENDING_RECIPIENT'
      ?`<div style="display:flex;gap:6px;margin-top:8px"><button class="btn secondary js-give-reject" data-id="${esc(r.id)}">Từ chối</button><button class="btn primary js-give-accept" data-id="${esc(r.id)}">Đồng ý nhận ca</button></div>`:'';
    rows.push(`<div class="history-item"><div><b>Cho ca · ${esc(fmt(r.work_date))} · ${esc(hm(r.start_time))}–${esc(hm(r.end_time))}</b><div class="muted">${incoming?'Từ '+esc(r.giver_name||'Nhân viên'):'Cho '+esc(r.recipient_name||'Nhân viên')} · ${esc(r.store_code||'')} · ${esc(r.reason||'')}</div>${actions}</div><span class="badge ${statusBadge(r.status)}">${esc(statusLabel(r.status))}</span></div>`);
  }
  for(const r of state.swapHistory){
    rows.push(`<div class="history-item"><div><b>Đổi ca · ${esc(fmt(r.requester_date))} · ${esc(hm(r.requester_start))}–${esc(hm(r.requester_end))} · ${esc(r.store_code||'')}</b><div class="muted">${esc(r.target_user_name||'')} · ${esc(r.target_date?fmt(r.target_date):'')} · ${esc(r.reason||'')}</div></div><span class="badge ${statusBadge(r.status)}">${esc(statusLabel(r.status))}</span></div>`);
  }
  box.innerHTML=rows.length?rows.join(''):'<div class="empty">Chưa có yêu cầu đổi/cho ca.</div>';
  box.querySelectorAll('.js-swap-peer-accept').forEach(b=>b.addEventListener('click',()=>respondSwap(b.dataset.id,true)));
  box.querySelectorAll('.js-swap-peer-reject').forEach(b=>b.addEventListener('click',()=>respondSwap(b.dataset.id,false)));
  box.querySelectorAll('.js-give-accept').forEach(b=>b.addEventListener('click',()=>respondGive(b.dataset.id,true)));
  box.querySelectorAll('.js-give-reject').forEach(b=>b.addEventListener('click',()=>respondGive(b.dataset.id,false)));
}
function openForm(nextMode,scheduleId=null,week=null){
  mode=nextMode==='give'?'give':'swap';
  if(week)state.week=week;
  if(scheduleId)state.selectedScheduleId=scheduleId;
  const x=panel();if(!x)return;
  x.querySelector('#swapChoices')?.setAttribute('style','display:none');
  x.querySelector('#swapForm')?.classList.add('open');
  const title=x.querySelector('#swapFormTitle'),sub=x.querySelector('#swapFormSub'),partner=x.querySelector('#partnerTitle');
  if(title)title.textContent=mode==='give'?'Cho ca':'Đổi ca';
  if(sub)sub.textContent=mode==='give'?'Chọn ca chính thức của bạn và người sẽ nhận ca.':'Chọn ca chính thức của bạn và ca muốn đổi.';
  if(partner)partner.textContent=mode==='give'?'Người nhận ca':'Ca muốn đổi';
  const label=x.querySelector('#employeeSwapTarget')?.closest('.field')?.querySelector('label');
  if(label)label.textContent=mode==='give'?'Nhân viên nhận ca':'Nhân viên / ca đối ứng';
  void loadMy(state.week,state.selectedScheduleId);
}
function back(){const x=panel();if(!x)return;x.querySelector('#swapChoices')?.setAttribute('style','');x.querySelector('#swapForm')?.classList.remove('open')}

function configure(x){
  if(!x||x.dataset.employeeSwapEngine==='1')return;
  x.dataset.employeeSwapEngine='1';
  x.querySelectorAll('[onclick^="openSwapForm"]').forEach(b=>{
    const old=b.getAttribute('onclick')||'';
    b.removeAttribute('onclick');
    b.addEventListener('click',()=>openForm(old.includes("'give'")?'give':'swap'));
  });
  x.querySelectorAll('[onclick="backToSwapChoices()"]').forEach(b=>{b.removeAttribute('onclick');b.addEventListener('click',back)});
  x.querySelector('[onclick="sendSwapRequest()"]')?.removeAttribute('onclick');
  x.querySelector('#swapForm .swap-actions .btn.primary')?.addEventListener('click',submit);
}

function renderForm(){
  const x=panel();if(!x)return;
  const cards=x.querySelectorAll('.swap-card'),card=cards[1];if(!card)return;
  const firstField=card.querySelector('.field');
  if(firstField&&!x.querySelector('#employeeSwapTarget')){
    const wrap=x.ownerDocument.createElement('div');wrap.className='field';
    wrap.innerHTML='<label>Nhân viên / ca đối ứng</label><select id="employeeSwapTarget"><option value="">Chọn</option></select>';
    card.insertBefore(wrap,firstField);
  }
  if(!x.querySelector('#employeeSwapReason')){
    const wrap=x.ownerDocument.createElement('div');wrap.className='field';
    wrap.innerHTML='<label>Lý do <span aria-hidden="true">*</span></label><input id="employeeSwapReason" type="text" required placeholder="Bắt buộc nhập lý do">';
    card.appendChild(wrap);
  }
  const h=x.querySelector('.history-head h3');if(h)h.textContent='Yêu cầu đổi / cho ca';
  configure(x);
}

function init(){
  const f=host();if(!f||f.dataset.swapEngine==='1')return;
  f.dataset.swapEngine='1';
  f.addEventListener('load',()=>{renderForm();loadHistory()});
  if(f.contentDocument){renderForm();loadHistory()}
}
globalThis.MAGASIN_EMPLOYEE=globalThis.MAGASIN_EMPLOYEE||{};
globalThis.MAGASIN_EMPLOYEE.swap={refresh:()=>{renderForm();return loadMy(state.week||C.date.monday(),state.selectedScheduleId)},openGive:(scheduleId,week)=>openForm('give',scheduleId,week),openSwap:(scheduleId,week)=>openForm('swap',scheduleId,week),getSelectedScheduleId:()=>state.selectedScheduleId,getWeek:()=>state.week};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
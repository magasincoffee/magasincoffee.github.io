(()=>{'use strict';
const C=globalThis.MAGASIN_CORE;if(!C)return;
const host=()=>document.getElementById('employeeApp'),d=()=>host()?.contentDocument||null,esc=C.security.escapeHtml,hm=C.time.time5;
const DATE_RE=/^\d{4}-\d{2}-\d{2}$/,TIME_RE=/^(?:[01]\d|2[0-3]):[0-5]\d$/;
const DAY_NAMES=['Thứ Hai','Thứ Ba','Thứ Tư','Thứ Năm','Thứ Sáu','Thứ Bảy','Chủ Nhật'];
const SLOT_STEP=30,SLOT_LAST_START=23*60;
const timeFromMinutes=value=>{const m=Math.max(0,Math.min(23*60+30,Number(value)||0));return `${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`};
const calendarSlots=()=>Array.from({length:(SLOT_LAST_START/SLOT_STEP)+1},(_,i)=>i*SLOT_STEP);
const rowId=row=>String(row?.id||'');
const findRow=id=>state.rows.find(r=>rowId(r)===String(id||''))||null;
let state={week:null,today:null,registration:'REGISTRATION_CLOSED',policyReason:'UNINITIALIZED',rows:[],savePending:false,deletePending:new Set(),editingId:null,calendarDrag:null,uiState:'idle'};

const options=sel=>{let s='';for(let m=0;m<1440;m+=30){const v=`${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`;s+=`<option value="${v}"${v===hm(sel)?' selected':''}>${v}</option>`}return s};
const panel=x=>(x||d())?.getElementById('weeklyRegistrationPanel')||null;
const bandKind=value=>{
  const kind=String(C.time.shiftKind?.(value)||'neutral');
  return ['morning','afternoon','evening'].includes(kind)?kind:'neutral';
};
function launcherState(){
  const open=state.registration==='REGISTRATION_OPEN';
  if(!open)return {key:'closed',label:'Xem thời gian đã đăng ký',primary:false,hint:'Đăng ký tuần sau đã đóng. Bạn vẫn có thể xem các khoảng thời gian đã lưu.'};
  if(state.rows.length)return {key:'saved',label:'Xem / sửa đăng ký',primary:false,hint:'Đã lưu '+state.rows.length+' khoảng thời gian có thể làm. Bạn có thể sửa trước khi đăng ký đóng.'};
  return {key:'empty',label:'Đăng ký ngay',primary:true,hint:'Chưa có thời gian có thể làm cho tuần sau. Đây là dữ liệu để Quản lý xếp lịch, chưa phải lịch làm chính thức.'};
}
function syncLauncher(x=d()){
  if(!x)return;
  const ctas=[...x.querySelectorAll('[data-schedule-availability]')],card=x.querySelector('.employee-schedule-secondary'),hint=x.getElementById('availabilityActionHint');
  const view=launcherState();
  for(const cta of ctas){
    cta.textContent=view.label;
    cta.dataset.availabilityCtaState=view.key;
    cta.className='m-button '+(view.primary?'m-button--primary':'m-button--secondary');
  }
  if(card)card.dataset.availabilityCtaState=view.key;
  if(hint)hint.textContent=view.hint;
}

function derivePolicy(){
  const today=C.date.dateKey?.();
  if(!DATE_RE.test(String(today||'')))return {today:null,targetWeek:null,registration:'REGISTRATION_CLOSED',reason:'INVALID_DATE_CONTEXT'};
  const currentMonday=C.date.monday(today),targetWeek=C.date.addDays(currentMonday,7),sunday=C.date.addDays(currentMonday,6);
  if(!DATE_RE.test(String(currentMonday||''))||!DATE_RE.test(String(targetWeek||'')))return {today,targetWeek:null,registration:'REGISTRATION_CLOSED',reason:'INVALID_WEEK_CONTEXT'};
  return {today,targetWeek,registration:today===sunday?'REGISTRATION_CLOSED':'REGISTRATION_OPEN',reason:null};
}
function syncPolicy(){
  const p=derivePolicy();
  const changed=state.week!==p.targetWeek;
  state.today=p.today;state.week=p.targetWeek;state.registration=p.registration;state.policyReason=p.reason;
  updateContext();
  return changed;
}
function targetDays(){return state.week?C.date.weekDays(state.week):[]}
function isTargetDate(value){return targetDays().includes(String(value||'').slice(0,10))}
function closedMessage(){return state.policyReason?'Không xác định được tuần đăng ký. Vui lòng tải lại trang.':'Đăng ký lịch tuần sau đã đóng vào Chủ Nhật. Bạn vẫn có thể xem các khoảng đã đăng ký.'}
function weekLabel(){
  const days=targetDays();
  if(!days.length)return 'Tuần tới · chưa xác định';
  return `Tuần tới · ${C.date.formatDate(days[0])} – ${C.date.formatDate(days[6])}`;
}
function emitAvailabilityState(){
  globalThis.MAGASIN_EMPLOYEE?.events?.emit?.('availability-loaded',{
    week:state.week,
    registration:state.registration,
    rows:state.rows.map(r=>({...r})),
    uiState:state.uiState
  });
}
function setUiState(kind,text,retry=false){
  state.uiState=kind||'idle';
  const x=d(),p=panel(x),msg=x?.getElementById('quickRegMsg'),button=p?.querySelector('[data-availability-retry]');
  if(p){
    p.dataset.availabilityState=state.uiState;
    p.setAttribute('aria-busy',String(state.uiState==='loading'||state.uiState==='submitting'));
  }
  if(msg&&text!=null)msg.textContent=String(text);
  if(button)button.hidden=!retry;
}
function updateContext(){
  const x=d();if(!x)return;
  const week=x.getElementById('availabilityWeekLabel'),policy=x.getElementById('availabilityPolicyLabel'),p=panel(x);
  if(week)week.textContent=weekLabel();
  if(policy){
    const open=state.registration==='REGISTRATION_OPEN';
    policy.textContent=open?'Đang mở · Có thể chỉnh sửa':'Đã đóng · Chỉ xem';
    policy.className='m-badge '+(open?'m-status-badge--success':'m-status-badge--neutral');
  }
  if(p)p.dataset.availabilityReadonly=String(state.registration!=='REGISTRATION_OPEN');
  syncLauncher(x);
}
function renderDayOptions(x){
  const day=x?.getElementById('quickRegDay');if(!day)return;
  const key=state.week||'';
  if(day.dataset.availabilityWeek===key)return;
  day.innerHTML=state.week?targetDays().map((k,i)=>`<option value="${k}">${DAY_NAMES[i]} · ${C.date.formatDate(k)}</option>`).join(''):'';
  day.dataset.availabilityWeek=key;
}
function applyRegistrationState(x=d()){
  if(!x)return;
  const closed=state.registration!=='REGISTRATION_OPEN';
  updateContext();
  for(const id of ['quickRegDay','quickRegStart','quickRegEnd','saveReg']){
    const el=x.getElementById(id);
    if(el)el.disabled=closed||(id==='saveReg'&&state.savePending);
  }
  x.querySelectorAll('[data-av-delete],[data-av-resize-start],[data-av-resize-end],[data-av-slot]').forEach(b=>{
    if('disabled' in b)b.disabled=closed||state.savePending||state.deletePending.has(String(b.dataset.avDelete||''));
    b.setAttribute('aria-disabled',String(closed||state.savePending));
  });
  const msg=x.getElementById('quickRegMsg');
  if(msg&&closed&&state.uiState!=='error')msg.textContent=closedMessage();
}

function open(){
  const x=d();if(!x)return;
  x.defaultView?.showView?.('schedule');
  const p=panel(x);if(!p)return;
  p.classList.add('open');p.setAttribute('aria-hidden','false');
  void prepare(x).then(()=>x.getElementById('quickRegDay')?.focus?.());
}
function close(){
  const x=d(),p=panel(x);if(!p)return;
  p.classList.remove('open');p.setAttribute('aria-hidden','true');
  x?.querySelector('[data-schedule-availability]')?.focus?.();
}
async function prepare(x){
  if(!x)return false;
  syncPolicy();
  const st=x.getElementById('quickRegStart'),en=x.getElementById('quickRegEnd');
  if(st&&!st.dataset.engineBound){st.innerHTML=options('06:00');st.dataset.engineBound='1'}
  if(en&&!en.dataset.engineBound){en.innerHTML=options('12:00');en.dataset.engineBound='1'}
  renderDayOptions(x);
  setUiState('loading','Đang tải thời gian có thể làm tuần sau…');
  applyRegistrationState(x);
  return load({preserveLoading:true});
}
async function load(options={}){
  const x=d();if(!x)return false;
  const weekChanged=syncPolicy();
  if(weekChanged)renderDayOptions(x);
  applyRegistrationState(x);
  if(!options.preserveLoading)setUiState('loading','Đang làm mới thời gian có thể làm tuần sau…');
  if(!state.week){
    state.rows=[];renderSummary();
    setUiState('error','Không xác định được tuần đăng ký. Vui lòng tải lại trang.',true);
    emitAvailabilityState();
    return false;
  }
  const q=await C.supabase.rpc('get_my_availability',{p_week_start:state.week});
  if(q.error){
    state.rows=[];renderSummary();applyRegistrationState(x);
    setUiState('error','Không thể tải thời gian có thể làm lúc này. Vui lòng thử lại.',true);
    C.ui.toast('Không tải được đăng ký lịch lúc này.','error');
    emitAvailabilityState();
    return false;
  }
  state.rows=(Array.isArray(q.data)?q.data:[]).filter(r=>isTargetDate(r.work_date));
  renderSummary();applyRegistrationState(x);
  setUiState('ready',state.registration==='REGISTRATION_OPEN'?'Đang mở đăng ký tuần kế tiếp.':'Đăng ký đã đóng. Các khoảng hiện có ở chế độ chỉ xem.');
  emitAvailabilityState();
  return true;
}
async function retry(){return prepare(d())}

function ensureSelectValue(select,value){
  if(!select||!value)return;
  if(![...select.options].some(o=>o.value===value)){const option=select.ownerDocument.createElement('option');option.value=value;option.textContent=value;select.append(option)}
  select.value=value;
}
function resetEditorMode(){state.editingId=null;const button=d()?.getElementById('saveReg');if(button)button.textContent='Đăng ký'}
function selectEditor(id,workDate,startTime,endTime,focus=true){
  const x=d();if(!x)return false;renderDayOptions(x);
  const day=x.getElementById('quickRegDay'),start=x.getElementById('quickRegStart'),end=x.getElementById('quickRegEnd'),button=x.getElementById('saveReg');
  if(day)day.value=workDate||day.value;ensureSelectValue(start,hm(startTime));ensureSelectValue(end,hm(endTime));
  state.editingId=id||null;if(button)button.textContent=state.editingId?'Lưu thay đổi':'Đăng ký';if(focus)day?.focus?.({preventScroll:true});return true;
}
function rangeError(day,start,end){
  if(!day||!isTargetDate(day))return 'Ngày đăng ký phải thuộc đúng tuần kế tiếp.';
  if(!TIME_RE.test(String(start||''))||!TIME_RE.test(String(end||'')))return 'Giờ đăng ký không hợp lệ.';
  if(C.time.minutes(end)<=C.time.minutes(start))return 'Giờ kết thúc phải sau giờ bắt đầu.';
  return null;
}
async function persistRange(id,day,start,end,successCopy){
  const x=d();if(!x)return false;syncPolicy();renderDayOptions(x);applyRegistrationState(x);
  if(state.registration!=='REGISTRATION_OPEN'){setUiState('readonly',closedMessage());return false}
  if(state.savePending){setUiState('submitting','Đang lưu đăng ký, vui lòng chờ.');return false}
  const invalid=rangeError(day,start,end);if(invalid){setUiState('error',invalid);return false}
  state.savePending=true;applyRegistrationState(x);setUiState('submitting',id?'Đang lưu thay đổi trên lịch…':'Đang lưu khoảng thời gian…');
  try{
    const q=await C.supabase.rpc('save_my_availability',{p_availability_id:id||null,p_work_date:day,p_start_time:start,p_end_time:end,p_availability_type:'AVAILABLE',p_preferred_store_id:null,p_note:null});
    if(q.error)throw q.error;C.ui.toast(id?'Đã cập nhật thời gian có thể làm.':'Đã lưu thời gian có thể làm.','success');
    const ok=await load();resetEditorMode();if(ok)setUiState('success',successCopy||(id?'Đã cập nhật khoảng thời gian trực tiếp trên lịch.':'Đã lưu khoảng thời gian có thể làm. Mỗi khoảng có hiệu lực ngay khi được lưu.'));return ok;
  }catch(_){setUiState('error',id?'Không thể cập nhật thời gian có thể làm. Vui lòng thử lại.':'Đăng ký thất bại. Vui lòng thử lại.',true);return false}
  finally{state.savePending=false;applyRegistrationState(x)}
}
async function applyCalendarDrop(date,time){
  const drag=state.calendarDrag;state.calendarDrag=null;if(!drag)return false;const row=findRow(drag.id);if(!row)return false;
  let workDate=String(row.work_date).slice(0,10),start=hm(row.start_time),end=hm(row.end_time);const target=C.time.minutes(time),duration=C.time.minutes(end)-C.time.minutes(start);
  if(drag.mode==='move'){workDate=date;start=time;const endMinutes=target+duration;if(endMinutes>23*60+30){setUiState('error','Không thể di chuyển khoảng thời gian vượt quá cuối ngày.');return false}end=timeFromMinutes(endMinutes)}
  else if(drag.mode==='resize-start')start=time;
  else if(drag.mode==='resize-end')end=timeFromMinutes(Math.min(23*60+30,target+SLOT_STEP));
  const invalid=rangeError(workDate,start,end);if(invalid){setUiState('error',invalid);return false}
  return persistRange(row.id,workDate,start,end,drag.mode==='move'?'Đã di chuyển khoảng thời gian trên lịch.':'Đã thay đổi độ dài khoảng thời gian trên lịch.');
}
function bindCalendar(box){
  const closed=state.registration!=='REGISTRATION_OPEN';
  box.querySelectorAll('[data-av-slot]').forEach(slot=>{
    const openEditor=()=>{if(closed||state.savePending)return;const start=slot.dataset.avSlotTime,date=slot.dataset.avSlotDate,startMinutes=C.time.minutes(start),end=timeFromMinutes(Math.min(23*60+30,startMinutes+60));selectEditor(null,date,start,end,true);setUiState('ready','Đã chọn '+date+' · '+start+'–'+end+'. Điều chỉnh nếu cần rồi bấm Đăng ký.')};
    slot.addEventListener('click',openEditor);slot.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();openEditor()}});
    slot.addEventListener('dragover',e=>{if(state.calendarDrag&&!closed)e.preventDefault()});
    slot.addEventListener('drop',e=>{if(state.calendarDrag&&!closed){e.preventDefault();void applyCalendarDrop(slot.dataset.avSlotDate,slot.dataset.avSlotTime)}});
  });
  box.querySelectorAll('[data-av-card]').forEach(card=>{
    card.addEventListener('click',e=>{if(e.target.closest('[data-av-delete],[data-av-resize-start],[data-av-resize-end]'))return;const row=findRow(card.dataset.avCard);if(row)selectEditor(row.id,String(row.work_date).slice(0,10),hm(row.start_time),hm(row.end_time),true)});
    card.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&!e.target.closest('button')){e.preventDefault();card.click()}});
    card.addEventListener('dragstart',e=>{if(closed||e.target.closest('[data-av-resize-start],[data-av-resize-end]'))return;state.calendarDrag={id:card.dataset.avCard,mode:'move'};e.dataTransfer?.setData('text/plain','availability-move')});
    card.addEventListener('dragend',()=>{state.calendarDrag=null});
  });
  box.querySelectorAll('[data-av-resize-start]').forEach(handle=>handle.addEventListener('dragstart',e=>{if(closed){e.preventDefault();return}e.stopPropagation();state.calendarDrag={id:handle.dataset.avResizeStart,mode:'resize-start'};e.dataTransfer?.setData('text/plain','availability-resize-start')}));
  box.querySelectorAll('[data-av-resize-end]').forEach(handle=>handle.addEventListener('dragstart',e=>{if(closed){e.preventDefault();return}e.stopPropagation();state.calendarDrag={id:handle.dataset.avResizeEnd,mode:'resize-end'};e.dataTransfer?.setData('text/plain','availability-resize-end')}));
  box.querySelectorAll('[data-av-delete]').forEach(b=>b.addEventListener('click',e=>{e.stopPropagation();void remove(b.dataset.avDelete,b)}));
}
function renderSummary(){
  const x=d();if(!x)return;const box=x.querySelector('#weeklyRegistrationPanel .week-summary');if(!box)return;
  const days=targetDays(),closed=state.registration!=='REGISTRATION_OPEN',slots=calendarSlots();box.classList.add('availability-calendar-root');
  const dayHtml=days.map((k,i)=>{
    const rows=state.rows.filter(r=>String(r.work_date).slice(0,10)===k).sort((a,b)=>C.time.minutes(a.start_time)-C.time.minutes(b.start_time));
    const slotHtml=slots.map((m,slotIndex)=>{const t=timeFromMinutes(m),label=t.endsWith(':00')?t:'';return `<button type="button" class="availability-calendar-slot" style="grid-row:${slotIndex+1}" data-av-slot data-av-slot-date="${esc(k)}" data-av-slot-time="${esc(t)}" aria-label="${esc(DAY_NAMES[i]+' '+C.date.formatDate(k)+' '+t)}"${closed?' disabled':''}><span>${esc(label)}</span></button>`}).join('');
    const cardHtml=rows.map(r=>{const id=rowId(r),start=hm(r.start_time),end=hm(r.end_time),startLine=Math.floor(C.time.minutes(start)/SLOT_STEP)+1,endLine=Math.max(startLine+1,Math.ceil(C.time.minutes(end)/SLOT_STEP)+1),band=bandKind(start);return `<article class="miniShift availability-calendar-card" data-time-band="${esc(band)}" data-av-card="${esc(id)}" style="grid-row:${startLine}/${endLine}" tabindex="0" draggable="${closed?'false':'true'}" aria-label="Thời gian có thể làm ${esc(start)} đến ${esc(end)}"><button type="button" class="availability-resize-handle availability-resize-start" data-av-resize-start="${esc(id)}" draggable="${closed?'false':'true'}" aria-label="Kéo để đổi giờ bắt đầu"${closed?' disabled':''}></button><div class="availability-card-copy"><b>${esc(start)}–${esc(end)}</b><span>Thời gian có thể làm</span></div><button type="button" class="availability-card-delete" data-av-delete="${esc(id)}" aria-label="Xóa ${esc(start)}–${esc(end)}"${closed?' disabled':''}>×</button><button type="button" class="availability-resize-handle availability-resize-end" data-av-resize-end="${esc(id)}" draggable="${closed?'false':'true'}" aria-label="Kéo để đổi giờ kết thúc"${closed?' disabled':''}></button></article>`}).join('');
    return `<section class="availability-calendar-day" data-av-day="${esc(k)}"><header><b>${esc(DAY_NAMES[i])}</b><span>${esc(C.date.formatDate(k))}</span></header><div class="availability-calendar-timeline">${slotHtml}${cardHtml}</div></section>`;
  }).join('');
  box.innerHTML=`<div class="availability-calendar-help"><b>Lịch thời gian có thể làm</b><span>Chạm ô giờ để thêm. Chạm khoảng đã lưu để sửa. Trên máy tính có thể kéo khoảng để di chuyển và kéo mép để đổi giờ. Đây không phải lịch làm chính thức.</span></div><div class="availability-calendar-wrap" role="region" aria-label="Lịch đăng ký thời gian có thể làm tuần kế tiếp" tabindex="0"><div class="availability-calendar" data-availability-calendar>${dayHtml}</div></div>`;
  bindCalendar(box);applyRegistrationState(x);
}

async function register(event){
  const x=d();if(!x)return false;const day=x.getElementById('quickRegDay')?.value,start=x.getElementById('quickRegStart')?.value,end=x.getElementById('quickRegEnd')?.value;
  const button=event?.currentTarget||x.getElementById('saveReg');if(button)button.disabled=true;const editingId=state.editingId;
  const ok=await persistRange(editingId,day,start,end,editingId?'Đã cập nhật khoảng thời gian có thể làm.':'Đã lưu khoảng thời gian có thể làm. Mỗi khoảng có hiệu lực ngay khi được lưu.');
  if(button&&button.isConnected)button.disabled=state.registration!=='REGISTRATION_OPEN'||state.savePending;return ok;
}

async function remove(id,button){
  const x=d();if(!x||!id)return;
  syncPolicy();applyRegistrationState(x);
  if(state.registration!=='REGISTRATION_OPEN'){setUiState('readonly',closedMessage());return}
  const row=state.rows.find(r=>String(r.id)===String(id));
  if(!row||!isTargetDate(row.work_date)){setUiState('error','Khoảng đăng ký không thuộc tuần kế tiếp hiện tại.',true);return}
  const key=String(id);if(state.deletePending.has(key)){setUiState('submitting','Đang xóa đăng ký, vui lòng chờ.');return}
  if(!confirm('Xóa khoảng thời gian đã đăng ký này?'))return;
  state.deletePending.add(key);if(button)button.disabled=true;setUiState('submitting','Đang xóa khoảng thời gian…');
  try{
    const q=await C.supabase.rpc('delete_my_availability',{p_availability_id:id});
    if(q.error)throw q.error;if(q.data!==true)throw new Error('DELETE_NOT_CONFIRMED');
    C.ui.toast('Đã xóa khoảng thời gian có thể làm.','success');
    if(String(state.editingId||'')===key)resetEditorMode();
    const ok=await load();
    if(ok)setUiState('success','Đã xóa khoảng thời gian. Giá trị hiện tại đã được tải lại.');
  }catch(_){
    setUiState('error','Không thể xóa thời gian có thể làm. Vui lòng thử lại.',true);
    C.ui.toast('Không thể xóa đăng ký lịch.','error');
  }finally{
    state.deletePending.delete(key);
    if(button&&button.isConnected)button.disabled=false;
    applyRegistrationState(x);
  }
}

function wire(x,selector,fn){
  const b=x.querySelector(selector);if(!b||b.dataset.engineBound)return;
  b.removeAttribute('onclick');b.dataset.engineBound='1';b.addEventListener('click',fn);
}
function bind(){
  const x=d();if(!x?.body)return;
  syncPolicy();
  x.body.dataset.employeeAvailabilityEngine='1';
  wire(x,'[data-schedule-availability]',open);
  wire(x,'#weeklyRegistrationPanel [data-availability-close="header"]',close);
  wire(x,'#weeklyRegistrationPanel button[onclick="quickRegister()"]',register);
  wire(x,'#weeklyRegistrationPanel [data-availability-close="back"]',close);
  wire(x,'#weeklyRegistrationPanel [data-availability-retry]',retry);
}
function init(){
  const f=host();if(!f||f.dataset.availabilityEngine==='1')return;
  f.dataset.availabilityEngine='1';
  f.addEventListener('load',()=>{bind();void prepare(f.contentDocument)},{once:false});
  if(f.contentDocument){bind();void prepare(f.contentDocument)}
}

syncPolicy();
globalThis.MAGASIN_EMPLOYEE=globalThis.MAGASIN_EMPLOYEE||{};
globalThis.MAGASIN_EMPLOYEE.availability={
  refresh:load,syncLauncher,open,close,remove,
  getRows:()=>state.rows.slice(),
  getWeek:()=>state.week,
  getRegistrationState:()=>state.registration,
  getPolicy:()=>({today:state.today,targetWeek:state.week,registration:state.registration,reason:state.policyReason}),
  getUiState:()=>state.uiState,
  getEditingId:()=>state.editingId
};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
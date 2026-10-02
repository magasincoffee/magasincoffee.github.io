(()=>{'use strict';
const C=globalThis.MAGASIN_CORE;if(!C)return;
const host=()=>document.getElementById('employeeApp'),d=()=>host()?.contentDocument||null,esc=C.security.escapeHtml,hm=C.time.time5;
const DATE_RE=/^\d{4}-\d{2}-\d{2}$/,TIME_RE=/^(?:[01]\d|2[0-3]):[0-5]\d$/;
const DAY_NAMES=['Thứ Hai','Thứ Ba','Thứ Tư','Thứ Năm','Thứ Sáu','Thứ Bảy','Chủ Nhật'];
let state={week:null,today:null,registration:'REGISTRATION_CLOSED',policyReason:'UNINITIALIZED',rows:[],savePending:false,deletePending:new Set(),uiState:'idle'};

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
  const cta=x.querySelector('[data-schedule-availability]'),card=x.querySelector('.employee-schedule-secondary'),hint=x.getElementById('availabilityActionHint');
  const view=launcherState();
  if(cta){
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
  x.querySelectorAll('[data-av-delete]').forEach(b=>{b.disabled=closed||state.deletePending.has(String(b.dataset.avDelete||''))});
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

function renderSummary(){
  const x=d();if(!x)return;const box=x.querySelector('#weeklyRegistrationPanel .week-summary');if(!box)return;
  const days=targetDays();
  const closed=state.registration!=='REGISTRATION_OPEN';
  box.innerHTML=days.map((k,i)=>{
    const rows=state.rows.filter(r=>String(r.work_date).slice(0,10)===k).sort((a,b)=>C.time.minutes(a.start_time)-C.time.minutes(b.start_time));
    return `<div class="mini"><h4>${DAY_NAMES[i]}</h4><div class="date">${C.date.formatDate(k)}</div>${rows.length?rows.map(r=>{const band=bandKind(r.start_time);return `<div class="miniShift" data-time-band="${esc(band)}"><b>${esc(hm(r.start_time))}–${esc(hm(r.end_time))}</b><br><span>Thời gian có thể làm</span>${r.id?`<br><button type="button" data-av-delete="${esc(r.id)}"${closed?' disabled':''}>Xóa</button>`:''}</div>`}).join(''):'<div class="muted" style="margin-top:17px">Chưa đăng ký</div>'}</div>`;
  }).join('');
  box.querySelectorAll('[data-av-delete]').forEach(b=>b.addEventListener('click',()=>remove(b.dataset.avDelete,b)));
}

async function register(event){
  const x=d();if(!x)return;
  syncPolicy();renderDayOptions(x);applyRegistrationState(x);
  if(state.registration!=='REGISTRATION_OPEN'){setUiState('readonly',closedMessage());return}
  if(state.savePending){setUiState('submitting','Đang lưu đăng ký, vui lòng chờ.');return}
  const day=x.getElementById('quickRegDay')?.value,start=x.getElementById('quickRegStart')?.value,end=x.getElementById('quickRegEnd')?.value;
  if(!day||!isTargetDate(day)){setUiState('error','Ngày đăng ký phải thuộc đúng tuần kế tiếp.');return}
  if(!TIME_RE.test(String(start||''))||!TIME_RE.test(String(end||''))){setUiState('error','Giờ đăng ký không hợp lệ.');return}
  if(C.time.minutes(end)<=C.time.minutes(start)){setUiState('error','Giờ kết thúc phải sau giờ bắt đầu.');return}
  const button=event?.currentTarget||x.getElementById('saveReg');
  state.savePending=true;if(button)button.disabled=true;setUiState('submitting','Đang lưu khoảng thời gian…');
  try{
    const q=await C.supabase.rpc('save_my_availability',{p_availability_id:null,p_work_date:day,p_start_time:start,p_end_time:end,p_availability_type:'AVAILABLE',p_preferred_store_id:null,p_note:null});
    if(q.error)throw q.error;
    C.ui.toast('Đã lưu thời gian có thể làm.','success');
    const ok=await load();
    if(ok)setUiState('success','Đã lưu khoảng thời gian có thể làm. Mỗi khoảng có hiệu lực ngay khi được lưu.');
  }catch(_){
    setUiState('error','Đăng ký thất bại. Vui lòng thử lại.',true);
  }finally{
    state.savePending=false;
    if(button&&button.isConnected)button.disabled=false;
    applyRegistrationState(x);
  }
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
  const x=d();if(!x?.body||x.body.dataset.employeeAvailabilityEngine==='1')return;
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
  refresh:load,open,close,remove,
  getRows:()=>state.rows.slice(),
  getWeek:()=>state.week,
  getRegistrationState:()=>state.registration,
  getPolicy:()=>({today:state.today,targetWeek:state.week,registration:state.registration,reason:state.policyReason}),
  getUiState:()=>state.uiState
};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
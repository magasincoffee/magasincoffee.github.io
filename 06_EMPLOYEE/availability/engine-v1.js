(()=>{'use strict';
const C=globalThis.MAGASIN_CORE;if(!C)return;
const host=()=>document.getElementById('employeeApp'),d=()=>host()?.contentDocument||null,esc=C.security.escapeHtml,hm=C.time.time5;
const DATE_RE=/^\d{4}-\d{2}-\d{2}$/,TIME_RE=/^(?:[01]\d|2[0-3]):[0-5]\d$/;
const DAY_NAMES=['Thứ Hai','Thứ Ba','Thứ Tư','Thứ Năm','Thứ Sáu','Thứ Bảy','Chủ Nhật'];
let state={week:null,today:null,registration:'REGISTRATION_CLOSED',policyReason:'UNINITIALIZED',rows:[],stores:[],savePending:false,deletePending:new Set()};

const options=sel=>{let s='';for(let m=0;m<1440;m+=30){const v=`${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`;s+=`<option value="${v}"${v===hm(sel)?' selected':''}>${v}</option>`}return s};

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
  return changed;
}
function targetDays(){return state.week?C.date.weekDays(state.week):[]}
function isTargetDate(value){return targetDays().includes(String(value||'').slice(0,10))}
function closedMessage(){return state.policyReason?'Không xác định được tuần đăng ký. Vui lòng tải lại trang.':'Đăng ký lịch tuần sau đã đóng vào Chủ Nhật. Bạn vẫn có thể xem các khoảng đã đăng ký.'}
function setMessage(text){const msg=d()?.getElementById('quickRegMsg');if(msg)msg.textContent=text||''}

function renderDayOptions(x){
  const day=x?.getElementById('quickRegDay');if(!day)return;
  const key=state.week||'';
  if(day.dataset.availabilityWeek===key)return;
  day.innerHTML=state.week?targetDays().map((k,i)=>`<option value="${k}">${DAY_NAMES[i]} · ${C.date.formatDate(k)}</option>`).join(''):'';
  day.dataset.availabilityWeek=key;
}
function renderStoreOptions(x){
  const select=x?.getElementById('quickRegStore');if(!select)return;
  const signature=state.stores.map(s=>`${s.id||''}:${s.code||''}`).join('|');
  if(select.dataset.availabilityStores===signature)return;
  if(!state.stores.length){
    select.innerHTML='<option value="">Không có chi nhánh khả dụng</option>';
  }else{
    select.innerHTML=state.stores.map(s=>`<option value="${esc(s.code)}">${esc(s.code)}${s.name?` · ${esc(s.name)}`:''}</option>`).join('');
  }
  select.dataset.availabilityStores=signature;
}
function applyRegistrationState(x=d()){
  if(!x)return;
  const closed=state.registration!=='REGISTRATION_OPEN';
  for(const id of ['quickRegDay','quickRegStart','quickRegEnd','quickRegStore','saveReg']){
    const el=x.getElementById(id);if(el)el.disabled=closed||(id==='quickRegStore'&&!state.stores.length)||(id==='saveReg'&&state.savePending);
  }
  x.querySelectorAll('[data-av-delete]').forEach(b=>{b.disabled=closed||state.deletePending.has(String(b.dataset.avDelete||''))});
  const msg=x.getElementById('quickRegMsg');
  if(msg&&closed)msg.textContent=closedMessage();
  else if(msg&&/đã đóng vào Chủ Nhật|Không xác định được tuần đăng ký/.test(msg.textContent||''))msg.textContent='';
}

function open(){const x=d();if(!x)return;const p=x.getElementById('weeklyRegistrationPanel');if(p)p.classList.add('open');prepare(x)}
function close(){const x=d();const p=x?.getElementById('weeklyRegistrationPanel');if(p)p.classList.remove('open')}

async function prepare(x){
  if(!x)return;
  syncPolicy();
  const st=x.getElementById('quickRegStart'),en=x.getElementById('quickRegEnd');
  if(st&&!st.dataset.engineBound){st.innerHTML=options('06:00');st.dataset.engineBound='1'}
  if(en&&!en.dataset.engineBound){en.innerHTML=options('12:00');en.dataset.engineBound='1'}
  renderDayOptions(x);
  state.stores=await C.stores.active().catch(()=>[]);
  state.stores=state.stores.filter(s=>s&&s.id&&s.code&&(!s.status||String(s.status).toUpperCase()==='ACTIVE'));
  renderStoreOptions(x);
  applyRegistrationState(x);
  await load();
}

async function load(){
  const x=d();if(!x)return;
  const weekChanged=syncPolicy();
  if(weekChanged)renderDayOptions(x);
  applyRegistrationState(x);
  if(!state.week){state.rows=[];renderSummary();return}
  const q=await C.supabase.rpc('get_my_availability',{p_week_start:state.week});
  if(q.error){C.ui.toast('Không tải được đăng ký lịch: '+q.error.message,'error');return}
  state.rows=(Array.isArray(q.data)?q.data:[]).filter(r=>isTargetDate(r.work_date));
  renderSummary();
  applyRegistrationState(x);
}

function renderSummary(){
  const x=d();if(!x)return;const box=x.querySelector('#weeklyRegistrationPanel .week-summary');if(!box)return;
  const days=targetDays(),storeName=id=>state.stores.find(s=>String(s.id)===String(id))?.code||state.stores.find(s=>String(s.id)===String(id))?.name||'Chi nhánh';
  const closed=state.registration!=='REGISTRATION_OPEN';
  box.innerHTML=days.map((k,i)=>{const rows=state.rows.filter(r=>String(r.work_date).slice(0,10)===k).sort((a,b)=>C.time.minutes(a.start_time)-C.time.minutes(b.start_time));return `<div class="mini"><h4>${DAY_NAMES[i]}</h4><div class="date">${C.date.formatDate(k)}</div>${rows.length?rows.map(r=>`<div class="miniShift"><b>${esc(hm(r.start_time))}–${esc(hm(r.end_time))}</b><br>${esc(storeName(r.preferred_store_id))}<br><span>Đã đăng ký</span>${r.id?`<br><button type="button" data-av-delete="${esc(r.id)}"${closed?' disabled':''} style="margin-top:6px;border:1px solid #e2b5b0;background:#fff;color:#9d3f30;border-radius:7px;padding:4px 7px;font:inherit;cursor:pointer">Xóa</button>`:''}</div>`).join(''):'<div class="muted" style="margin-top:17px">Chưa đăng ký</div>'}</div>`}).join('');
  box.querySelectorAll('[data-av-delete]').forEach(b=>b.addEventListener('click',()=>remove(b.dataset.avDelete,b)));
}

async function register(event){
  const x=d();if(!x)return;
  syncPolicy();renderDayOptions(x);applyRegistrationState(x);
  const msg=x.getElementById('quickRegMsg');
  if(state.registration!=='REGISTRATION_OPEN'){if(msg)msg.textContent=closedMessage();return}
  if(state.savePending){if(msg)msg.textContent='Đang lưu đăng ký, vui lòng chờ.';return}
  const day=x.getElementById('quickRegDay')?.value,start=x.getElementById('quickRegStart')?.value,end=x.getElementById('quickRegEnd')?.value,store=x.getElementById('quickRegStore')?.value;
  if(!day||!isTargetDate(day)){if(msg)msg.textContent='Ngày đăng ký phải thuộc đúng tuần kế tiếp.';return}
  if(!TIME_RE.test(String(start||''))||!TIME_RE.test(String(end||''))){if(msg)msg.textContent='Giờ đăng ký không hợp lệ.';return}
  if(C.time.minutes(end)<=C.time.minutes(start)){if(msg)msg.textContent='Giờ kết thúc phải sau giờ bắt đầu.';return}
  const button=event?.currentTarget||x.getElementById('saveReg');
  state.savePending=true;if(button)button.disabled=true;
  try{
    if(!state.stores.length){
      state.stores=await C.stores.active().catch(()=>[]);
      state.stores=state.stores.filter(s=>s&&s.id&&s.code&&(!s.status||String(s.status).toUpperCase()==='ACTIVE'));
      renderStoreOptions(x);
    }
    const target=state.stores.find(s=>String(s.code)===String(store));
    if(!target){if(msg)msg.textContent='Không tìm thấy chi nhánh đang hoạt động.';return}
    const q=await C.supabase.rpc('save_my_availability',{p_availability_id:null,p_work_date:day,p_start_time:start,p_end_time:end,p_availability_type:'AVAILABLE',p_preferred_store_id:target.id,p_note:null});
    if(q.error)throw q.error;
    if(msg)msg.textContent='Đã đăng ký lịch làm.';
    C.ui.toast('Đã lưu đăng ký lịch làm.','success');
    await load();
  }catch(e){
    if(msg)msg.textContent='Đăng ký thất bại: '+(e.message||e);
  }finally{
    state.savePending=false;
    if(button&&button.isConnected)button.disabled=false;
    applyRegistrationState(x);
  }
}

async function remove(id,button){
  const x=d();if(!x||!id)return;
  syncPolicy();applyRegistrationState(x);
  const msg=x.getElementById('quickRegMsg');
  if(state.registration!=='REGISTRATION_OPEN'){if(msg)msg.textContent=closedMessage();return}
  const row=state.rows.find(r=>String(r.id)===String(id));
  if(!row||!isTargetDate(row.work_date)){if(msg)msg.textContent='Khoảng đăng ký không thuộc tuần kế tiếp hiện tại.';return}
  const key=String(id);if(state.deletePending.has(key)){if(msg)msg.textContent='Đang xóa đăng ký, vui lòng chờ.';return}
  if(!confirm('Xóa khoảng thời gian đã đăng ký này?'))return;
  state.deletePending.add(key);if(button)button.disabled=true;
  try{
    const q=await C.supabase.rpc('delete_my_availability',{p_availability_id:id});
    if(q.error)throw q.error;if(q.data!==true)throw new Error('DELETE_NOT_CONFIRMED');
    if(msg)msg.textContent='Đã xóa khoảng thời gian.';
    C.ui.toast('Đã xóa khoảng thời gian đăng ký.','success');
    await load();
  }catch(e){
    if(msg)msg.textContent='Xóa thất bại: '+(e.message||e);
    C.ui.toast('Không thể xóa đăng ký lịch.','error');
  }finally{
    state.deletePending.delete(key);
    if(button&&button.isConnected)button.disabled=false;
    applyRegistrationState(x);
  }
}

async function finish(){syncPolicy();const msg=d()?.getElementById('quickRegMsg');if(msg)msg.textContent=state.registration==='REGISTRATION_OPEN'?'Đã hoàn thành đăng ký lịch làm.':closedMessage();if(state.registration==='REGISTRATION_OPEN')C.ui.toast('Đã hoàn thành đăng ký lịch.','success')}

function wire(x,selector,fn){const b=x.querySelector(selector);if(!b||b.dataset.engineBound)return;b.removeAttribute('onclick');b.dataset.engineBound='1';b.addEventListener('click',fn)}
function bind(){const x=d();if(!x?.body||x.body.dataset.employeeAvailabilityEngine==='1')return;x.body.dataset.employeeAvailabilityEngine='1';wire(x,'[onclick="openWeeklyRegistration()"]',open);wire(x,'#weeklyRegistrationPanel button[onclick="closeWeeklyRegistration()"]',close);wire(x,'#weeklyRegistrationPanel button[onclick="quickRegister()"]',register);wire(x,'#weeklyRegistrationPanel button[onclick="finishQuickRegistration()"]',finish)}
function init(){const f=host();if(!f||f.dataset.availabilityEngine==='1')return;f.dataset.availabilityEngine='1';f.addEventListener('load',()=>{bind();prepare(f.contentDocument)},{once:false});if(f.contentDocument){bind();prepare(f.contentDocument)}}

syncPolicy();
globalThis.MAGASIN_EMPLOYEE=globalThis.MAGASIN_EMPLOYEE||{};
globalThis.MAGASIN_EMPLOYEE.availability={
  refresh:load,open,close,remove,
  getRows:()=>state.rows.slice(),
  getWeek:()=>state.week,
  getRegistrationState:()=>state.registration,
  getPolicy:()=>({today:state.today,targetWeek:state.week,registration:state.registration,reason:state.policyReason})
};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
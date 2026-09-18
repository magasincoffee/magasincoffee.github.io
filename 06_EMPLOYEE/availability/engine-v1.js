(()=>{'use strict';
const C=globalThis.MAGASIN_CORE;if(!C)return;
const host=()=>document.getElementById('employeeApp'),d=()=>host()?.contentDocument||null,esc=C.security.escapeHtml,hm=C.time.time5;
const STORE_CODES=['CN1','CN2','CN3','CN4'],DAY_NAMES=['Thứ Hai','Thứ Ba','Thứ Tư','Thứ Năm','Thứ Sáu','Thứ Bảy','Chủ Nhật'];
const TYPES={AVAILABLE:'Có thể làm',PREFERRED:'Ưu tiên',UNAVAILABLE:'Không thể làm / Off'};
let state={week:C.date.addDays(C.date.monday(),7),rows:[],stores:[]};

const options=sel=>{let s='';for(let m=0;m<1440;m+=30){const v=`${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`;s+=`<option value="${v}"${v===hm(sel)?' selected':''}>${v}</option>`}return s};
const typeLabel=v=>TYPES[String(v||'AVAILABLE').toUpperCase()]||String(v||'AVAILABLE');
const weekTitle=()=>{const ds=C.date.weekDays(state.week);return `${C.date.formatDate(ds[0])} – ${C.date.formatDate(ds[6])}`};

function open(){const x=d();if(!x)return;const p=x.getElementById('weeklyRegistrationPanel');if(p)p.classList.add('open');prepare(x)}
function close(){const x=d();const p=x?.getElementById('weeklyRegistrationPanel');if(p)p.classList.remove('open')}

function ensureV2Controls(x){
 const panel=x.getElementById('weeklyRegistrationPanel');if(!panel)return;
 const head=panel.querySelector('.weekly-reg-head');
 if(head&&!x.getElementById('availabilityWeekControls')){
  const box=x.createElement('div');box.id='availabilityWeekControls';box.style.cssText='display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin-top:7px';
  box.innerHTML='<button type="button" class="btn secondary" data-av-week="prev">← Tuần trước</button><button type="button" class="btn secondary" data-av-week="next">Tuần sau →</button><span class="badge blue" id="availabilityWeekLabel"></span>';
  head.firstElementChild?.appendChild(box);
 }
 const form=panel.querySelector('.form');
 if(form&&!x.getElementById('quickRegType')){
  form.style.gridTemplateColumns='1.2fr .9fr .9fr 1fr 1fr auto';
  const field=x.createElement('div');field.className='field';field.innerHTML='<label>Loại đăng ký</label><select id="quickRegType"><option value="AVAILABLE">Có thể làm</option><option value="PREFERRED">Ưu tiên</option><option value="UNAVAILABLE">Không thể làm / Off</option></select>';
  const submit=form.querySelector('button[onclick="quickRegister()"],button[data-av-register]');
  if(submit)form.insertBefore(field,submit);else form.appendChild(field);
 }
 if(panel&&!x.getElementById('availabilityAllDayNote')){
  const note=x.createElement('div');note.id='availabilityAllDayNote';note.className='muted';note.style.cssText='margin-top:8px;font-size:11px';
  note.textContent='Có thể đăng ký nhiều khoảng trong cùng ngày. “Cả Ngày” chưa có giờ chuẩn đã duyệt nên hãy chọn giờ bắt đầu/kết thúc cụ thể.';
  panel.querySelector('#quickRegMsg')?.insertAdjacentElement('afterend',note);
 }
 const label=x.getElementById('availabilityWeekLabel');if(label)label.textContent='Tuần '+weekTitle();
 panel.querySelectorAll('[data-av-week]').forEach(b=>{if(b.dataset.engineBound)return;b.dataset.engineBound='1';b.addEventListener('click',async()=>{state.week=C.date.addDays(state.week,b.dataset.avWeek==='prev'?-7:7);await prepare(x)})});
}

function populateDays(x){
 const day=x.getElementById('quickRegDay');if(!day)return;
 const previous=day.value;
 day.innerHTML=C.date.weekDays(state.week).map((k,i)=>`<option value="${k}">${DAY_NAMES[i]} · ${C.date.formatDate(k)}</option>`).join('');
 if([...day.options].some(o=>o.value===previous))day.value=previous;
}

async function prepare(x){
 if(!x)return;
 ensureV2Controls(x);
 const st=x.getElementById('quickRegStart'),en=x.getElementById('quickRegEnd');
 if(st&&!st.dataset.engineBound){st.innerHTML=options('06:00');st.dataset.engineBound='1'}
 if(en&&!en.dataset.engineBound){en.innerHTML=options('12:00');en.dataset.engineBound='1'}
 populateDays(x);
 if(!state.stores.length)state.stores=await C.stores.active().catch(()=>[]);
 const select=x.getElementById('quickRegStore');
 if(select&&!select.dataset.engineBound){
  const stores=state.stores.length?state.stores:STORE_CODES.map(code=>({code}));
  select.innerHTML=stores.map(s=>`<option value="${esc(s.code)}">${esc(s.code)}${s.name?` · ${esc(s.name)}`:''}</option>`).join('');
  select.dataset.engineBound='1'
 }
 const label=x.getElementById('availabilityWeekLabel');if(label)label.textContent='Tuần '+weekTitle();
 await load()
}

async function load(){
 const x=d();if(!x)return;
 const q=await C.supabase.rpc('get_my_availability',{p_week_start:state.week});
 if(q.error){C.ui.toast('Không tải được đăng ký lịch: '+q.error.message,'error');return}
 state.rows=Array.isArray(q.data)?q.data:[];
 renderSummary()
}

async function removeAvailability(id){
 if(!id)return;
 const q=await C.supabase.rpc('delete_my_availability',{p_availability_id:id});
 const x=d(),msg=x?.getElementById('quickRegMsg');
 if(q.error||q.data===false){if(msg)msg.textContent='Không thể xóa đăng ký: '+(q.error?.message||'UNKNOWN');return}
 if(msg)msg.textContent='Đã xóa khoảng đăng ký.';
 C.ui.toast('Đã xóa khoảng đăng ký.','success');
 await load()
}

function renderSummary(){
 const x=d();if(!x)return;
 const box=x.querySelector('#weeklyRegistrationPanel .week-summary');if(!box)return;
 const days=C.date.weekDays(state.week);
 const storeName=id=>{if(!id)return'Không theo chi nhánh';const s=state.stores.find(s=>String(s.id)===String(id));return s?.code||s?.name||'Chi nhánh'};
 box.innerHTML=days.map((k,i)=>{
  const rows=state.rows.filter(r=>String(r.work_date).slice(0,10)===k).sort((a,b)=>C.time.minutes(a.start_time)-C.time.minutes(b.start_time));
  return `<div class="mini"><h4>${DAY_NAMES[i]}</h4><div class="date">${C.date.formatDate(k)}</div>${rows.length?rows.map(r=>{const id=r.id||r.availability_id||'';return `<div class="miniShift" data-av-row="${esc(id)}"><b>${esc(hm(r.start_time))}–${esc(hm(r.end_time))}</b><br>${esc(typeLabel(r.availability_type))}<br>${esc(storeName(r.preferred_store_id))}${id?`<br><button type="button" class="btn secondary" data-av-delete="${esc(id)}" style="margin-top:6px;padding:4px 7px;min-height:0;font-size:10px">Xóa</button>`:''}</div>`}).join(''):'<div class="muted" style="margin-top:17px">Chưa đăng ký</div>'}</div>`
 }).join('');
 box.querySelectorAll('[data-av-delete]').forEach(b=>b.addEventListener('click',()=>removeAvailability(b.dataset.avDelete)))
}

async function register(){
 const x=d();if(!x)return;
 const day=x.getElementById('quickRegDay')?.value,start=x.getElementById('quickRegStart')?.value,end=x.getElementById('quickRegEnd')?.value,store=x.getElementById('quickRegStore')?.value,type=x.getElementById('quickRegType')?.value||'AVAILABLE',msg=x.getElementById('quickRegMsg');
 if(!day||!start||!end)return;
 if(C.time.minutes(end)<=C.time.minutes(start)){if(msg)msg.textContent='Giờ kết thúc phải sau giờ bắt đầu.';return}
 if(!state.stores.length)state.stores=await C.stores.active().catch(()=>[]);
 const target=state.stores.find(s=>String(s.code)===String(store));
 if(type!=='UNAVAILABLE'&&!target){if(msg)msg.textContent='Không tìm thấy chi nhánh.';return}
 const q=await C.supabase.rpc('save_my_availability',{
  p_availability_id:null,
  p_work_date:day,
  p_start_time:start,
  p_end_time:end,
  p_availability_type:type,
  p_preferred_store_id:type==='UNAVAILABLE'?null:target?.id||null,
  p_note:null
 });
 if(q.error){if(msg)msg.textContent='Đăng ký thất bại: '+q.error.message;return}
 if(msg)msg.textContent='Đã đăng ký lịch làm và cập nhật ngay bên dưới.';
 C.ui.toast('Đã lưu đăng ký lịch làm.','success');
 await load()
}

async function finish(){
 const msg=d()?.getElementById('quickRegMsg');
 if(msg)msg.textContent=`Đã hoàn thành đăng ký tuần này: ${state.rows.length} khoảng.`;
 C.ui.toast('Đã hoàn thành đăng ký lịch.','success')
}
function wire(x,selector,fn){const b=x.querySelector(selector);if(!b||b.dataset.engineBound)return;b.removeAttribute('onclick');b.dataset.engineBound='1';b.addEventListener('click',fn)}
function bind(){
 const x=d();if(!x||x.body.dataset.employeeAvailabilityEngine==='1')return;
 x.body.dataset.employeeAvailabilityEngine='1';
 wire(x,'[onclick="openWeeklyRegistration()"]',open);
 wire(x,'#weeklyRegistrationPanel button[onclick="closeWeeklyRegistration()"]',close);
 const reg=x.querySelector('#weeklyRegistrationPanel button[onclick="quickRegister()"]');if(reg)reg.dataset.avRegister='1';
 wire(x,'#weeklyRegistrationPanel button[onclick="quickRegister()"]',register);
 wire(x,'#weeklyRegistrationPanel button[onclick="finishQuickRegistration()"]',finish)
}
function init(){
 const f=host();if(!f||f.dataset.availabilityEngine==='1')return;
 f.dataset.availabilityEngine='1';
 f.addEventListener('load',()=>{bind();prepare(f.contentDocument)},{once:false});
 if(f.contentDocument){bind();prepare(f.contentDocument)}
}
globalThis.MAGASIN_EMPLOYEE=globalThis.MAGASIN_EMPLOYEE||{};
globalThis.MAGASIN_EMPLOYEE.availability={refresh:load,open,close,remove:removeAvailability,getState:()=>({...state,rows:state.rows.map(x=>({...x}))})};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
(()=>{'use strict';
const C=globalThis.MAGASIN_CORE;if(!C)return;
const host=()=>document.getElementById('employeeApp'),doc=()=>host()?.contentDocument||null;
const IDS=['profileFullName','profileUsername','profilePhone','profileRole','profileStatus','profilePrimaryStore','profileLevel','profileJoinDate'];
let state={loading:false,error:null,row:null,ready:false};
const roleText=v=>({STAFF:'Nhân viên',EMPLOYEE:'Nhân viên'}[String(v||'').toUpperCase()]||String(v||'—'));
const statusText=v=>({ACTIVE:'Đang hoạt động',PENDING:'Chờ duyệt',INACTIVE:'Ngưng hoạt động'}[String(v||'').toUpperCase()]||String(v||'—'));
const safeCode=e=>{const s=String(e?.message||e?.code||'PROFILE_REQUEST_FAILED');const m=s.match(/[A-Z][A-Z0-9_]{2,80}/);return m?m[0]:'PROFILE_REQUEST_FAILED'};
const validProjectionRow=r=>!!r&&!!String(r.employee_id||'').trim()&&['STAFF','EMPLOYEE'].includes(String(r.employee_role||'').toUpperCase())&&String(r.profile_status||'').toUpperCase()==='ACTIVE';
function el(id){return doc()?.getElementById(id)||null}
function setValue(id,value){const x=el(id);if(x)x.value=value==null||value===''?'—':String(value)}
function clearValues(){for(const id of IDS)setValue(id,'—')}
function ensureCss(d){
  if(!d||d.getElementById('magasin-ui-v2-employee-people-css'))return;
  const link=d.createElement('link');link.id='magasin-ui-v2-employee-people-css';link.rel='stylesheet';link.href='/02_CORE/ui/magasin-ui-v2-employee-people.css?v=20260926-ui2-009';d.head.appendChild(link);
}
function ensureUi(){
  const d=doc(),view=d?.getElementById('view-profile');if(!d||!view)return false;
  ensureCss(d);view.classList.add('employee-profile-v2');
  view.querySelector('.profile-main')?.classList.add('employee-people-card');
  view.querySelector('.security-link-panel')?.classList.add('employee-people-card');
  return true;
}
function ensureStateBox(){
  const d=doc(),root=d?.querySelector('#view-profile .profile-main');if(!d||!root)return null;
  let box=d.getElementById('profileProjectionState');
  if(!box){box=d.createElement('div');box.id='profileProjectionState';box.className='employee-people-state';box.setAttribute('role','status');box.setAttribute('aria-live','polite');root.appendChild(box)}
  return box;
}
function setUiState(name){const v=doc()?.getElementById('view-profile');if(v)v.dataset.profileUiState=name}
function setStateMessage(text,type='info'){
  const box=ensureStateBox();if(!box)return;
  box.dataset.tone=type;box.className='employee-people-state '+type;box.textContent=text;
}
function updateHeader(row){
  const d=doc();if(!d)return;
  const strong=d.querySelector('.header-user-text strong'),span=d.querySelector('.header-user-text span'),avatar=d.querySelector('.header-avatar'),fallback=d.getElementById('profileAvatarFallback');
  if(strong)strong.textContent=row?.full_name||'Nhân viên';
  if(span)span.textContent=roleText(row?.employee_role);
  const initial=String(row?.full_name||row?.username||'N').trim().charAt(0).toUpperCase()||'N';
  if(avatar&&!avatar.querySelector('img'))avatar.textContent=initial;
  if(fallback)fallback.textContent=initial;
}
function render(){
  ensureUi();
  if(state.loading){setUiState('loading');clearValues();setStateMessage('Đang tải hồ sơ vận hành canonical từ máy chủ…','info');return}
  if(state.error){setUiState('error');clearValues();setStateMessage('Không thể tải hồ sơ. Mã: '+state.error,'error');return}
  const r=state.row;
  if(!r){setUiState('empty');clearValues();setStateMessage('Không có hồ sơ vận hành hợp lệ.','error');return}
  setValue('profileFullName',r.full_name);
  setValue('profileUsername',r.username);
  setValue('profilePhone',r.phone);
  setValue('profileRole',roleText(r.employee_role));
  setValue('profileStatus',statusText(r.profile_status));
  setValue('profilePrimaryStore',r.primary_store_code?(r.primary_store_code+(r.primary_store_name?' · '+r.primary_store_name:'')):(r.primary_store_name||'Chưa có nguồn chuẩn'));
  setValue('profileLevel',r.employee_level||'Chưa có nguồn chuẩn');
  setValue('profileJoinDate',r.join_date||'Chưa có nguồn chuẩn');
  updateHeader(r);setUiState('ready');
  setStateMessage('Hồ sơ này là projection chỉ đọc từ nguồn vận hành canonical. Chỉ các trường operational allowlist được hiển thị.','success');
}
async function refresh(){
  ensureUi();state.loading=true;state.error=null;render();
  const q=await C.supabase.rpc('get_my_employee_profile_v1');
  if(q.error){state.loading=false;state.row=null;state.error=safeCode(q.error);render();return}
  const row=Array.isArray(q.data)?q.data[0]:q.data;
  if(row&&!validProjectionRow(row)){state.loading=false;state.row=null;state.error='PROFILE_PROJECTION_INVALID';render();return}
  state.loading=false;state.error=null;state.row=row||null;render();
}
function init(){
  const h=host();if(!h)return;
  state.ready=true;
  if(h.contentDocument?.readyState==='complete'||h.contentDocument?.readyState==='interactive')refresh();
  h.addEventListener('load',refresh);
}
const E=globalThis.MAGASIN_EMPLOYEE=globalThis.MAGASIN_EMPLOYEE||{};
E.profileProjection={refresh,get state(){return state}};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
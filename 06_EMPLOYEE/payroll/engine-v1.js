(()=>{'use strict';
const C=globalThis.MAGASIN_CORE;if(!C)return;
const host=()=>document.getElementById('employeeApp'),doc=()=>host()?.contentDocument||null;
const esc=C.security.escapeHtml;
let state={loading:false,error:null,rows:[],ready:false};
const safeCode=e=>{const s=String(e?.message||e?.code||'PAYROLL_REQUEST_FAILED');const m=s.match(/[A-Z][A-Z0-9_]{2,80}/);return m?m[0]:'PAYROLL_REQUEST_FAILED'};
const stateText=v=>({ESTIMATED:'Ước tính',REVIEWED:'Đã review',FINALIZED:'Đã chốt',PAID:'Đã thanh toán'}[String(v||'').toUpperCase()]||String(v||'—'));
const minutesText=v=>{const n=Number(v);if(!Number.isInteger(n)||n<0)return '—';const h=Math.floor(n/60),m=n%60;return m?h+' giờ '+m+' phút':h+' giờ'};
const PAYROLL_STATES=new Set(['ESTIMATED','REVIEWED','FINALIZED','PAID']);
const validProjectionRow=r=>!!r&&!!String(r.payroll_entry_id||'').trim()&&!!String(r.period_start||'').trim()&&!!String(r.period_end||'').trim()&&!!String(r.payroll_revision||'').trim()&&PAYROLL_STATES.has(String(r.state||'').toUpperCase())&&Number.isInteger(Number(r.confirmed_work_item_count))&&Number(r.confirmed_work_item_count)>=0&&Number.isInteger(Number(r.confirmed_work_minutes))&&Number(r.confirmed_work_minutes)>=0;
function ensureCss(d){
  if(!d||d.getElementById('magasin-ui-v2-employee-people-css'))return;
  const link=d.createElement('link');link.id='magasin-ui-v2-employee-people-css';link.rel='stylesheet';link.href='/02_CORE/ui/magasin-ui-v2-employee-people.css?v=20260926-ui2-009';d.head.appendChild(link);
}
function ensureUi(){
  const d=doc();if(!d?.body)return false;
  ensureCss(d);
  if(!d.querySelector('.nav [data-view="payroll"]')){
    const nav=d.querySelector('.nav'),profile=nav?.querySelector('[data-view="profile"]');
    if(nav){
      const a=d.createElement('a');a.dataset.view='payroll';a.textContent='💰 Lương';
      a.addEventListener('click',e=>{e.preventDefault();activate(a);void refresh()});
      if(profile)nav.insertBefore(a,profile);else nav.appendChild(a);
    }
  }
  if(!d.getElementById('view-payroll')){
    const view=d.createElement('section');view.id='view-payroll';view.className='page-view employee-payroll-v2';view.dataset.payrollUiState='idle';
    view.innerHTML='<div class="employee-people-card employee-payroll-card"><div class="employee-people-intro"><div><div class="employee-people-eyebrow">Lương · Self-check</div><h2>Tự kiểm tra lương</h2><p>Projection payroll canonical của chính tài khoản đang đăng nhập. Màn hình này chỉ đọc và không có quyền review/finalize/paid.</p></div><button class="m-button m-button--secondary btn secondary" type="button" id="employeePayrollRefresh">Làm mới</button></div><div id="employeePayrollRoot" aria-live="polite"></div></div>';
    const profile=d.getElementById('view-profile');
    if(profile?.parentNode)profile.parentNode.insertBefore(view,profile);else d.querySelector('.page-wrap')?.appendChild(view);
    d.getElementById('employeePayrollRefresh')?.addEventListener('click',()=>refresh());
  }
  return true;
}
function activate(link){
  const d=doc();if(!d)return;
  d.querySelectorAll('.page-view').forEach(x=>x.classList.remove('active'));
  d.getElementById('view-payroll')?.classList.add('active');
  d.querySelectorAll('.nav a').forEach(x=>x.classList.remove('active'));link?.classList.add('active');
  const title=d.getElementById('headerPageTitle'),sub=d.getElementById('pageSub');
  if(title)title.textContent='Lương';if(sub)sub.textContent='Payroll self-check chỉ đọc';
  d.defaultView?.scrollTo?.(0,0);
}
function render(){
  if(!ensureUi())return;
  const d=doc(),view=d?.getElementById('view-payroll'),root=d?.getElementById('employeePayrollRoot');if(!root||!view)return;
  if(state.loading){view.dataset.payrollUiState='loading';root.innerHTML='<div class="employee-people-state info" data-payroll-loading="1" role="status">Đang tải payroll canonical từ máy chủ…</div>';return}
  if(state.error){
    view.dataset.payrollUiState='error';
    root.innerHTML='<div class="employee-people-state error" data-payroll-error="1" role="alert"><strong>Không thể tải payroll.</strong><span>Mã: '+esc(state.error)+'</span><button class="m-button m-button--secondary" type="button" data-payroll-retry>Thử lại</button></div>';
    root.querySelector('[data-payroll-retry]')?.addEventListener('click',()=>refresh());
    return;
  }
  if(!state.rows.length){view.dataset.payrollUiState='empty';root.innerHTML='<div class="payroll-self-grid"><div class="employee-people-state empty" data-payroll-empty="1"><strong>Chưa có payroll entry canonical cho tài khoản này.</strong><span>Khi máy chủ có projection hợp lệ, kỳ lương sẽ xuất hiện tại đây.</span></div><div class="payroll-self-note">Số tiền chưa hiển thị vì chưa có canonical monetary evaluator. Attendance amount/rate cũ không phải payroll truth.</div></div>';return}
  view.dataset.payrollUiState='ready';
  const rows=state.rows.map(r=>{
    const st=String(r.state||'').toUpperCase(),klass=st.toLowerCase();
    return '<article class="employee-payroll-entry"><div class="employee-payroll-entry__head"><div><span>Kỳ payroll</span><strong>'+esc(r.period_start)+' → '+esc(r.period_end)+'</strong><small>'+esc(r.confirmed_work_item_count)+' bản ghi giờ công đã xác nhận</small></div><span class="payroll-state '+esc(klass)+'">'+esc(stateText(st))+'</span></div><div class="employee-payroll-facts"><div><span>Giờ công xác nhận</span><strong>'+esc(minutesText(r.confirmed_work_minutes))+'</strong></div><div><span>Revision</span><strong>'+esc(r.payroll_revision)+'</strong></div></div></article>';
  }).join('');
  root.innerHTML='<div class="payroll-self-grid"><div class="payroll-self-note">ESTIMATED không bao giờ được trình bày như FINALIZED. Số tiền chưa hiển thị vì chưa có canonical monetary evaluator.</div><div class="employee-payroll-list">'+rows+'</div></div>';
}
async function refresh(){
  if(!ensureUi())return;
  state.loading=true;state.error=null;state.rows=[];render();
  const q=await C.supabase.rpc('get_my_payroll_self_check_v1');
  state.loading=false;
  if(q.error){state.error=safeCode(q.error);state.rows=[];render();return}
  const rows=Array.isArray(q.data)?q.data:[];
  if(rows.some(r=>!validProjectionRow(r))){state.error='PAYROLL_PROJECTION_INVALID';state.rows=[];state.ready=true;render();return}
  state.error=null;state.rows=rows;state.ready=true;render();
}
function boot(attempt=0){
  if(!ensureUi()){if(attempt<20)setTimeout(()=>boot(attempt+1),25);return}
  render();
}
function init(){
  const f=host();if(!f||f.dataset.payrollSelfCheckEngine==='1')return;
  f.dataset.payrollSelfCheckEngine='1';f.addEventListener('load',()=>boot(),{once:false});boot();
}
const E=globalThis.MAGASIN_EMPLOYEE=globalThis.MAGASIN_EMPLOYEE||{};
E.payrollSelfCheck={refresh,get state(){return {loading:state.loading,error:state.error,rows:state.rows.map(x=>({...x})),ready:state.ready}}};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
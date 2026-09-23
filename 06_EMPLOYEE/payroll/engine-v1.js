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
  if(!d||d.getElementById('employee-payroll-self-check-v1-css'))return;
  const s=d.createElement('style');s.id='employee-payroll-self-check-v1-css';
  s.textContent='.payroll-self-grid{display:grid;gap:12px}.payroll-self-note{padding:11px 13px;border:1px solid #d8e5f4;background:#f2f7fd;border-radius:11px;color:#42556d;font-size:12px}.payroll-self-table-wrap{overflow:auto}.payroll-self-table{width:100%;border-collapse:collapse}.payroll-self-table th,.payroll-self-table td{padding:10px 8px;border-bottom:1px solid #dbe4ef;text-align:left;font-size:12px;white-space:nowrap}.payroll-self-table th{color:#718199}.payroll-state{display:inline-flex;padding:5px 8px;border-radius:999px;font-size:10px;font-weight:900}.payroll-state.estimated{background:#fff0cb;color:#936000}.payroll-state.reviewed{background:#e7f0ff;color:#235dba}.payroll-state.finalized{background:#e3f3ea;color:#176d49}.payroll-state.paid{background:#eee5ff;color:#6741a5}.payroll-self-status{padding:11px 13px;border-radius:11px;font-size:12px}.payroll-self-status.info{background:#eef7ff;color:#235dba}.payroll-self-status.error{background:#fff0f0;color:#9a3838}.payroll-self-status.ok{background:#e3f3ea;color:#176d49}@media(max-width:600px){.payroll-self-table th,.payroll-self-table td{padding:8px 6px}}';
  d.head.appendChild(s);
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
    const view=d.createElement('section');view.id='view-payroll';view.className='page-view';
    view.innerHTML='<div class="panel"><div class="section-head"><div><h2>Tự kiểm tra lương</h2><div class="muted">Payroll canonical của chính tài khoản đang đăng nhập.</div></div><button class="btn secondary" type="button" id="employeePayrollRefresh">Làm mới</button></div><div id="employeePayrollRoot"></div></div>';
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
  if(title)title.textContent='Lương';if(sub)sub.textContent='Tự kiểm tra payroll';
  d.defaultView?.scrollTo?.(0,0);
}
function render(){
  if(!ensureUi())return;
  const root=doc()?.getElementById('employeePayrollRoot');if(!root)return;
  if(state.loading){root.innerHTML='<div class="payroll-self-status info">Đang tải payroll từ máy chủ…</div>';return}
  if(state.error){root.innerHTML='<div class="payroll-self-status error">Không thể tải payroll. Mã: '+esc(state.error)+'</div>';return}
  if(!state.rows.length){root.innerHTML='<div class="payroll-self-grid"><div class="payroll-self-status ok">Chưa có payroll entry canonical cho tài khoản này.</div><div class="payroll-self-note">Không hiển thị số tiền khi chưa có canonical monetary evaluator. Attendance amount/rate cũ không phải payroll truth.</div></div>';return}
  const rows=state.rows.map(r=>{
    const st=String(r.state||'').toUpperCase(),klass=st.toLowerCase();
    return '<tr><td>'+esc(r.period_start)+' → '+esc(r.period_end)+'</td><td>'+esc(minutesText(r.confirmed_work_minutes))+'</td><td>'+esc(r.confirmed_work_item_count)+'</td><td><span class="payroll-state '+esc(klass)+'">'+esc(stateText(st))+'</span></td><td>'+esc(r.payroll_revision)+'</td></tr>';
  }).join('');
  root.innerHTML='<div class="payroll-self-grid"><div class="payroll-self-note">Trạng thái được hiển thị đúng theo payroll canonical. ESTIMATED không bao giờ được trình bày như FINALIZED. Số tiền chưa hiển thị vì chưa có canonical monetary evaluator.</div><div class="payroll-self-table-wrap"><table class="payroll-self-table"><thead><tr><th>Kỳ</th><th>Giờ công xác nhận</th><th>Số bản ghi</th><th>Trạng thái</th><th>Revision</th></tr></thead><tbody>'+rows+'</tbody></table></div></div>';
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
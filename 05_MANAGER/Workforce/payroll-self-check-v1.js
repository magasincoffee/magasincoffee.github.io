(()=>{'use strict';
const SB_URL='https://menvbzlsncmpuvnaifxa.supabase.co',SB_KEY='sb_publishable_HsvCS6HDZnCDInd9PUoh0g_V34wJVqx';
let clientInstance=null,busy=false;
let state={stores:[],storeId:null,rows:[],loading:false,error:null,message:''};
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const stateText=v=>({ESTIMATED:'Ước tính',REVIEWED:'Đã review',FINALIZED:'Đã chốt',PAID:'Đã thanh toán'}[String(v||'').toUpperCase()]||String(v||'—'));
const minutesText=v=>{const n=Number(v);if(!Number.isInteger(n)||n<0)return '—';const h=Math.floor(n/60),m=n%60;return m?h+' giờ '+m+' phút':h+' giờ'};
const errorCode=e=>{const s=String(e?.message||e?.code||'PAYROLL_VIEW_FAILED');const m=s.match(/[A-Z][A-Z0-9_]{2,80}/);return m?m[0]:'PAYROLL_VIEW_FAILED'};
function client(){
 if(clientInstance)return clientInstance;
 const maker=window.supabase?.createClient;if(!maker)throw Error('PAYROLL_SUPABASE_UNAVAILABLE');
 clientInstance=maker(SB_URL,SB_KEY,{auth:{autoRefreshToken:true,persistSession:true,detectSessionInUrl:true}});
 return clientInstance;
}
function ensureCss(){
 if(document.getElementById('manager-payroll-self-check-v1-css'))return;
 const s=document.createElement('style');s.id='manager-payroll-self-check-v1-css';
 s.textContent='.mgr-payroll-head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap}.mgr-payroll-actions{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.mgr-payroll-table-wrap{overflow:auto}.mgr-payroll-table{width:100%;border-collapse:collapse}.mgr-payroll-table th,.mgr-payroll-table td{padding:10px 8px;border-bottom:1px solid #eef2f6;text-align:left;font-size:12px;white-space:nowrap}.mgr-payroll-table th{color:#617793}.mgr-payroll-state{display:inline-flex;padding:5px 8px;border-radius:999px;font-size:10px;font-weight:800}.mgr-payroll-state.estimated{background:#fff6d8;color:#876900}.mgr-payroll-state.reviewed{background:#e9f1ff;color:#2f6fde}.mgr-payroll-state.finalized{background:#e6f4ed;color:#2d9665}.mgr-payroll-state.paid{background:#eee5ff;color:#6741a5}.mgr-payroll-note{margin-top:12px;padding:11px 13px;border:1px solid #d8e5f4;background:#f2f7fd;border-radius:11px;color:#42556d;font-size:12px}.mgr-payroll-status{margin-top:12px;padding:11px 13px;border-radius:11px;font-size:12px}.mgr-payroll-status.error{background:#fff0f0;color:#9a3838}.mgr-payroll-status.ok{background:#e6f4ed;color:#176d49}@media(max-width:800px){.mgr-payroll-actions{width:100%}.mgr-payroll-actions select{flex:1;min-width:0}}';
 document.head.appendChild(s);
}
function ensureUi(){
 ensureCss();
 let btn=document.querySelector('.nav [data-view="payroll-self-check"]');
 if(!btn){
   btn=document.createElement('button');btn.dataset.view='payroll-self-check';btn.textContent='💰 Payroll';
   btn.addEventListener('click',()=>{activate();void refresh()});
   const att=document.querySelector('.nav [data-view="attendance"]');
   if(att?.parentNode)att.parentNode.insertBefore(btn,att.nextSibling);else document.querySelector('.nav')?.appendChild(btn);
 }
 if(!document.getElementById('view-payroll-self-check')){
   const view=document.createElement('section');view.className='view';view.id='view-payroll-self-check';
   view.innerHTML='<section class="card"><div class="mgr-payroll-head"><div><h2 style="margin:0">Payroll · đọc theo phạm vi</h2><div class="muted" style="margin-top:5px">Read-only payroll state + confirmed work minutes. Không cấp quyền review/finalize.</div></div><div class="mgr-payroll-actions"><select class="btn" id="mgrPayrollStore"></select><button class="btn" id="mgrPayrollRefresh">Làm mới</button></div></div><div id="mgrPayrollRoot"></div></section>';
   document.querySelector('.content')?.appendChild(view);
   document.getElementById('mgrPayrollStore')?.addEventListener('change',e=>{state.storeId=e.target.value||null;void loadRows()});
   document.getElementById('mgrPayrollRefresh')?.addEventListener('click',()=>refresh());
 }
 return true;
}
function activate(){
 ensureUi();
 document.querySelectorAll('.view').forEach(x=>x.classList.remove('active'));document.getElementById('view-payroll-self-check')?.classList.add('active');
 document.querySelectorAll('.nav button').forEach(x=>x.classList.toggle('active',x.dataset.view==='payroll-self-check'));
 const t=document.getElementById('pageTitle'),s=document.getElementById('pageSub');if(t)t.textContent='Payroll';if(s)s.textContent='Read-only theo phạm vi cửa hàng';
 document.getElementById('sidebar')?.classList.remove('open');
}
function render(){
 ensureUi();
 const root=document.getElementById('mgrPayrollRoot'),select=document.getElementById('mgrPayrollStore');if(!root||!select)return;
 select.innerHTML=state.stores.map(x=>'<option value="'+esc(x.id)+'"'+(String(x.id)===String(state.storeId||'')?' selected':'')+'>'+esc(x.code||x.name||x.id)+' · '+esc(x.name||'Cửa hàng')+'</option>').join('')||'<option value="">Không có cửa hàng được phép</option>';
 if(state.loading){root.innerHTML='<div class="mgr-payroll-status">Đang tải payroll từ máy chủ…</div>';return}
 if(state.error){root.innerHTML='<div class="mgr-payroll-status error">Không thể tải payroll. Mã: '+esc(state.error)+'</div>';return}
 if(!state.rows.length){root.innerHTML='<div class="mgr-payroll-status ok">Không có payroll entry trong phạm vi cửa hàng này.</div><div class="mgr-payroll-note">Manager chỉ có read-only PAYROLL_READ store-scoped. PAYROLL_REVIEW và mọi state transition vẫn yêu cầu explicit permission riêng và không được TASK-104 cấp.</div>';return}
 const rows=state.rows.map(r=>{const st=String(r.state||'').toUpperCase();return '<tr><td>'+esc(r.employee_name||'Nhân viên')+'</td><td>'+esc(r.period_start)+' → '+esc(r.period_end)+'</td><td>'+esc(minutesText(r.confirmed_work_minutes))+'</td><td>'+esc(r.confirmed_work_item_count)+'</td><td><span class="mgr-payroll-state '+esc(st.toLowerCase())+'">'+esc(stateText(st))+'</span></td><td>'+esc(r.payroll_revision)+'</td></tr>'}).join('');
 root.innerHTML='<div class="mgr-payroll-note">Chỉ hiển thị payroll canonical trong store scope. Không hiển thị monetary amount/pay-rate/pay-rule internals.</div><div class="mgr-payroll-table-wrap"><table class="mgr-payroll-table"><thead><tr><th>Nhân viên</th><th>Kỳ</th><th>Giờ công xác nhận</th><th>Số bản ghi</th><th>Trạng thái</th><th>Revision</th></tr></thead><tbody>'+rows+'</tbody></table></div>';
}
async function loadStores(){
 const q=await client().rpc('get_manager_accessible_stores');if(q.error)throw q.error;
 state.stores=(Array.isArray(q.data)?q.data:[]).filter(x=>x?.id&&String(x.status||'ACTIVE').toUpperCase()==='ACTIVE');
 if(!state.storeId||!state.stores.some(x=>String(x.id)===String(state.storeId)))state.storeId=state.stores[0]?.id||null;
}
async function loadRows(){
 if(!state.storeId){state.rows=[];state.error=null;state.loading=false;render();return}
 state.loading=true;state.error=null;state.rows=[];render();
 const q=await client().rpc('list_scoped_payroll_self_check_v1',{p_store_id:state.storeId});
 state.loading=false;
 if(q.error){state.error=errorCode(q.error);state.rows=[];render();return}
 state.error=null;state.rows=Array.isArray(q.data)?q.data:[];render();
}
async function refresh(){
 if(busy)return;busy=true;
 try{if(!state.stores.length)await loadStores();await loadRows()}catch(e){state.loading=false;state.rows=[];state.error=errorCode(e);render()}finally{busy=false}
}
function boot(){ensureUi();render()}
window.MAGASIN_MANAGER_PAYROLL_SELF_CHECK={refresh,getState:()=>({storeId:state.storeId,stores:state.stores.map(x=>({...x})),rows:state.rows.map(x=>({...x})),error:state.error})};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
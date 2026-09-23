(()=>{'use strict';
if(window.__MAGASIN_MANAGER_STAFF_PROJECTION_V1__)return;
window.__MAGASIN_MANAGER_STAFF_PROJECTION_V1__=true;
const SB_URL='https://menvbzlsncmpuvnaifxa.supabase.co',SB_KEY='sb_publishable_HsvCS6HDZnCDInd9PUoh0g_V34wJVqx';
let sb=null,busy=false;
let state={stores:[],storeId:null,rows:[],loading:false,error:null,message:''};
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const errorCode=e=>{const s=String(e?.message||e?.code||'PROFILE_VIEW_FAILED');const m=s.match(/[A-Z][A-Z0-9_]{2,80}/);return m?m[0]:'PROFILE_VIEW_FAILED'};
const client=()=>sb||(sb=window.supabase.createClient(SB_URL,SB_KEY,{auth:{autoRefreshToken:true,persistSession:true,detectSessionInUrl:true}}));
const view=()=>document.getElementById('view-staff');
function ensureCss(){
 if(document.getElementById('manager-staff-projection-v1-css'))return;
 const s=document.createElement('style');s.id='manager-staff-projection-v1-css';
 s.textContent='.msp-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;flex-wrap:wrap}.msp-actions{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.msp-table-wrap{overflow:auto}.msp-table{width:100%;border-collapse:collapse;min-width:720px}.msp-table th,.msp-table td{padding:10px 8px;border-bottom:1px solid #eef2f6;text-align:left;font-size:12px}.msp-table th{color:var(--muted)}.msp-state{margin-top:12px;padding:11px 13px;border-radius:11px;font-size:12px}.msp-state.info{background:#eef7ff;color:#235dba}.msp-state.ok{background:#e6f4ed;color:#176d49}.msp-state.error{background:#fff0f0;color:#9a3838}@media(max-width:800px){.msp-actions{width:100%}.msp-actions select{flex:1;min-width:0}}';
 document.head.appendChild(s);
}
function ensureUi(){
 const root=view();if(!root)return false;
 ensureCss();
 if(root.dataset.canonicalStaffProjection==='1')return true;
 root.dataset.canonicalStaffProjection='1';
 root.innerHTML='<section class="card"><div class="msp-head"><div><h2 style="margin:0">Nhân viên</h2><div class="muted" style="margin-top:5px">Projection vận hành read-only theo phạm vi cửa hàng canonical.</div></div><div class="msp-actions"><select class="btn" id="mspStore"></select><button class="btn" id="mspRefresh">Làm mới</button></div></div><div id="mspRoot"></div></section>';
 root.querySelector('#mspStore')?.addEventListener('change',e=>{state.storeId=e.target.value||null;void loadRows()});
 root.querySelector('#mspRefresh')?.addEventListener('click',()=>refresh());
 return true;
}
function render(){
 if(!ensureUi())return;
 const root=document.getElementById('mspRoot'),select=document.getElementById('mspStore');if(!root||!select)return;
 select.innerHTML=state.stores.map(x=>'<option value="'+esc(x.id)+'"'+(String(x.id)===String(state.storeId||'')?' selected':'')+'>'+esc(x.code||x.name||x.id)+' · '+esc(x.name||'Cửa hàng')+'</option>').join('')||'<option value="">Không có cửa hàng được phép</option>';
 if(state.loading){root.innerHTML='<div class="msp-state info">Đang tải projection nhân viên từ máy chủ…</div>';return}
 if(state.error){root.innerHTML='<div class="msp-state error">Không thể tải danh sách nhân viên. Mã: '+esc(state.error)+'</div>';return}
 if(!state.rows.length){root.innerHTML='<div class="msp-state ok">Không có nhân viên trong phạm vi cửa hàng đã chọn.</div>';return}
 const rows=state.rows.map(r=>'<tr><td><b>'+esc(r.full_name||r.username||'Nhân viên')+'</b><div class="muted">'+esc(r.username||'—')+'</div></td><td>'+esc(r.phone||'—')+'</td><td>'+esc(r.employee_level||'Chưa có nguồn chuẩn')+'</td><td>'+esc(r.primary_store_code||r.primary_store_name||'Chưa có nguồn chuẩn')+'</td><td>'+esc(r.profile_status||'—')+'</td><td>'+esc(r.join_date||'Chưa có nguồn chuẩn')+'</td></tr>').join('');
 root.innerHTML='<div class="msp-state info">Chỉ hiển thị các trường vận hành do TASK-101 projection trả về; không suy diễn email, rate, join date hoặc pay rule.</div><div class="msp-table-wrap"><table class="msp-table"><thead><tr><th>Nhân viên</th><th>Điện thoại</th><th>Cấp</th><th>Chi nhánh chính</th><th>Trạng thái</th><th>Ngày vào</th></tr></thead><tbody>'+rows+'</tbody></table></div>';
}
async function loadStores(){
 const q=await client().rpc('get_manager_accessible_stores');if(q.error)throw q.error;
 state.stores=(Array.isArray(q.data)?q.data:[]).filter(x=>x?.id&&String(x.status||'ACTIVE').toUpperCase()==='ACTIVE');
 if(!state.storeId||!state.stores.some(x=>String(x.id)===String(state.storeId)))state.storeId=state.stores[0]?.id||null;
}
async function loadRows(){
 if(!state.storeId){state.rows=[];state.loading=false;state.error=null;render();return}
 state.loading=true;state.error=null;state.rows=[];render();
 const q=await client().rpc('list_employee_profile_projection_v1',{p_store_id:state.storeId});
 state.loading=false;
 if(q.error){state.rows=[];state.error=errorCode(q.error);render();return}
 state.rows=Array.isArray(q.data)?q.data:[];state.error=null;render();
}
async function refresh(){
 if(busy||!ensureUi())return;busy=true;
 try{if(!state.stores.length)await loadStores();await loadRows()}
 catch(e){state.loading=false;state.rows=[];state.error=errorCode(e);render()}
 finally{busy=false}
}
document.addEventListener('click',e=>{if(e.target.closest?.('[data-view="staff"]'))setTimeout(()=>refresh(),0)},true);
window.MAGASIN_MANAGER_STAFF_PROJECTION={refresh,getState:()=>({storeId:state.storeId,rows:state.rows.map(x=>({...x})),loading:state.loading,error:state.error})};
})();
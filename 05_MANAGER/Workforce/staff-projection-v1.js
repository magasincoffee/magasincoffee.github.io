(()=>{'use strict';
if(window.__MAGASIN_MANAGER_STAFF_PROJECTION_V1__)return;
window.__MAGASIN_MANAGER_STAFF_PROJECTION_V1__=true;
const SB_URL='https://menvbzlsncmpuvnaifxa.supabase.co',SB_KEY='sb_publishable_HsvCS6HDZnCDInd9PUoh0g_V34wJVqx';
let sb=null,busy=false;
let state={stores:[],rows:[],editId:null,loading:false,error:null};
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const errorCode=e=>{const s=String(e?.message||e?.code||'PROFILE_VIEW_FAILED');const m=s.match(/[A-Z][A-Z0-9_]{2,80}/);return m?m[0]:'PROFILE_VIEW_FAILED'};
const validProjectionRow=r=>!!r&&!!String(r.employee_id||'').trim()&&['STAFF','EMPLOYEE'].includes(String(r.employee_role||'').toUpperCase())&&!!String(r.profile_status||'').trim()&&Array.isArray(r.priority_store_ids)&&Array.isArray(r.priority_store_codes);
const client=()=>{const ctx=window.MAGASIN_MANAGER_WORKFORCE_CONTEXT;if(!ctx?.client)throw Error('MANAGER_CONTEXT_NOT_READY');return ctx.client()};
const view=()=>document.getElementById('view-staff');
function ensureCss(){
 if(document.getElementById('manager-staff-projection-v1-css'))return;
 const s=document.createElement('style');s.id='manager-staff-projection-v1-css';
 s.textContent='.msp-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;flex-wrap:wrap}.msp-actions{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.msp-table-wrap{overflow:auto}.msp-table{width:100%;border-collapse:collapse;min-width:860px}.msp-table th,.msp-table td{padding:10px 8px;border-bottom:1px solid #eef2f6;text-align:left;font-size:12px;vertical-align:middle}.msp-table th{color:var(--muted)}.msp-state{margin-top:12px;padding:11px 13px;border-radius:11px;font-size:12px}.msp-state.info{background:#eef7ff;color:#235dba}.msp-state.ok{background:#e6f4ed;color:#176d49}.msp-state.error{background:#fff0f0;color:#9a3838}.msp-priority{font-weight:800;color:#0f4778}.msp-edit{margin:14px 0;padding:14px;border:1px solid #cfe1eb;border-radius:13px;background:#f8fcfd}.msp-priority-grid{display:grid;grid-template-columns:repeat(4,minmax(150px,1fr));gap:8px;margin-top:10px}.msp-field{display:grid;gap:5px}.msp-field label{font-size:10px;font-weight:900;color:var(--muted);text-transform:uppercase}.msp-field select{height:40px;border:1px solid #ccd9e4;border-radius:9px;background:#fff;padding:0 8px}.msp-edit-actions{display:flex;gap:8px;justify-content:flex-end;margin-top:10px}@media(max-width:800px){.msp-priority-grid{grid-template-columns:1fr 1fr}.msp-actions{width:100%}}@media(max-width:520px){.msp-priority-grid{grid-template-columns:1fr}}';
 document.head.appendChild(s);
}
function ensureUi(){
 const root=view();if(!root)return false;ensureCss();
 if(root.dataset.canonicalStaffProjection==='2')return true;
 root.dataset.canonicalStaffProjection='3';root.classList.add('wf-role-page');
 root.innerHTML='<section class="card"><div class="msp-head wf-section-head"><div><h2 class="wf-section-title">Nhân viên</h2><div class="wf-section-copy">Một Workforce Profile canonical dùng chung cho Quản lý, Nhân viên và bộ xếp lịch. Quản lý là bên duy nhất thiết lập Store Priority.</div></div><div class="msp-actions"><button class="btn" id="mspRefresh">Làm mới</button></div></div><div id="mspRoot"></div></section>';
 root.querySelector('#mspRefresh')?.addEventListener('click',()=>refresh());
 return true;
}
const storeOptions=(value,slot)=>'<option value="">'+(slot===1?'— Chọn chi nhánh chính —':'— Không sử dụng —')+'</option>'+state.stores.map(s=>'<option value="'+esc(s.id)+'"'+(String(s.id)===String(value||'')?' selected':'')+'>'+esc(s.code)+' · '+esc(s.name)+'</option>').join('');
function editHtml(row){
 if(!row)return '';
 const ids=Array.isArray(row.priority_store_ids)?row.priority_store_ids:[];
 return '<div class="msp-edit" data-msp-editor="'+esc(row.employee_id)+'"><b>'+esc(row.full_name||row.username||'Nhân viên')+'</b><div class="muted" style="margin-top:4px">Ưu tiên 1 là chi nhánh chính. Các vị trí sau là chi nhánh phụ theo thứ tự giảm dần. Bỏ khỏi danh sách = không được xếp vào chi nhánh đó.</div><div class="msp-priority-grid">'+[0,1,2,3].map(i=>'<div class="msp-field"><label>Ưu tiên '+(i+1)+(i===0?' · Chính':'')+'</label><select data-msp-priority="'+(i+1)+'">'+storeOptions(ids[i],i+1)+'</select></div>').join('')+'</div><div class="msp-edit-actions"><button class="btn" data-msp-cancel>Hủy</button><button class="btn primary" data-msp-save>Lưu ưu tiên chi nhánh</button></div><div class="msp-state info" data-msp-msg>Quản lý quyết định thứ tự này theo hồ sơ làm việc của nhân viên.</div></div>';
}
function render(){
 if(!ensureUi())return;
 const root=document.getElementById('mspRoot');if(!root)return;
 if(state.loading){root.innerHTML='<div class="msp-state wf-state" data-state="LOADING">Đang tải Workforce Profile canonical…</div>';return}
 if(state.error){root.innerHTML='<div class="msp-state wf-state" data-state="ERROR">Không thể tải Workforce Profile. Mã: '+esc(state.error)+'</div>';return}
 const edit=state.rows.find(r=>String(r.employee_id)===String(state.editId||''));
 const rows=state.rows.map(r=>{const codes=Array.isArray(r.priority_store_codes)?r.priority_store_codes.filter(Boolean):[];return '<tr><td><b>'+esc(r.full_name||r.username||'Nhân viên')+'</b><div class="muted">@'+esc(r.username||'—')+'</div></td><td>'+esc(r.phone||'—')+'</td><td>'+esc(r.profile_status||'—')+'</td><td><div class="msp-priority">'+esc(codes.length?codes.join(' → '):'Chưa thiết lập')+'</div><div class="muted">'+esc(codes.length?'Ưu tiên 1 = chi nhánh chính':'Chưa đủ điều kiện xếp lịch cross-store')+'</div></td><td><button class="btn" data-msp-edit="'+esc(r.employee_id)+'">Thiết lập</button></td></tr>'}).join('');
 root.innerHTML=(edit?editHtml(edit):'')+'<div class="msp-state wf-state" data-state="READY">Store Priority là authority của Quản lý. Employee và Auto Schedule đọc cùng canonical truth này.</div><div class="msp-table-wrap"><table class="msp-table"><thead><tr><th>Nhân viên</th><th>Điện thoại</th><th>Trạng thái</th><th>Ưu tiên chi nhánh</th><th>Thao tác</th></tr></thead><tbody>'+rows+'</tbody></table></div>';
 bind();
}
function bind(){
 const root=document.getElementById('mspRoot');if(!root)return;
 root.querySelectorAll('[data-msp-edit]').forEach(b=>b.addEventListener('click',()=>{state.editId=b.dataset.mspEdit;render();root.querySelector('[data-msp-editor] select')?.focus()}));
 root.querySelector('[data-msp-cancel]')?.addEventListener('click',()=>{state.editId=null;render()});
 root.querySelector('[data-msp-save]')?.addEventListener('click',savePriority);
}
async function loadStores(){
 state.stores=await window.MAGASIN_MANAGER_WORKFORCE_CONTEXT.stores();
}
async function loadRows(){
 state.loading=true;state.error=null;render();
 const q=await client().rpc('list_employee_workforce_profiles_v1');
 state.loading=false;
 if(q.error){state.rows=[];state.error=errorCode(q.error);render();return}
 const rows=Array.isArray(q.data)?q.data:[];
 if(rows.some(r=>!validProjectionRow(r))){state.rows=[];state.error='PROFILE_PROJECTION_INVALID';render();return}
 state.rows=rows;state.error=null;render();
}
async function savePriority(){
 const editor=document.querySelector('[data-msp-editor]');if(!editor||busy)return;
 const employeeId=editor.dataset.mspEditor,msg=editor.querySelector('[data-msp-msg]');
 const values=[...editor.querySelectorAll('[data-msp-priority]')].map(x=>x.value||'');
 if(!values[0]){if(msg){msg.className='msp-state error';msg.textContent='Phải chọn chi nhánh ưu tiên 1 (chi nhánh chính).'}return}
 let gap=false,seenEmpty=false;for(const v of values){if(!v)seenEmpty=true;else if(seenEmpty)gap=true}
 if(gap){if(msg){msg.className='msp-state error';msg.textContent='Thứ tự ưu tiên phải liên tục; không được bỏ trống ở giữa.'}return}
 const ids=values.filter(Boolean);
 if(new Set(ids).size!==ids.length){if(msg){msg.className='msp-state error';msg.textContent='Một chi nhánh không thể xuất hiện hai lần.'}return}
 busy=true;editor.querySelector('[data-msp-save]').disabled=true;
 if(msg){msg.className='msp-state info';msg.textContent='Đang lưu ưu tiên chi nhánh…'}
 try{
  const q=await client().rpc('set_employee_store_priority_profile_v1',{p_employee_id:employeeId,p_store_ids:ids});
  if(q.error)throw q.error;
  state.editId=null;await loadRows();
 }catch(e){
  if(msg&&msg.isConnected){msg.className='msp-state error';msg.textContent='Không thể lưu. Mã: '+errorCode(e);editor.querySelector('[data-msp-save]').disabled=false}
 }finally{busy=false}
}
async function refresh(){
 if(busy||!ensureUi())return;busy=true;
 try{if(!state.stores.length)await loadStores();busy=false;await loadRows()}
 catch(e){busy=false;state.loading=false;state.rows=[];state.error=errorCode(e);render()}
}
document.addEventListener('click',e=>{if(e.target.closest?.('[data-view="staff"]'))setTimeout(()=>refresh(),0)},true);
window.MAGASIN_MANAGER_STAFF_PROJECTION={refresh,getState:()=>({rows:state.rows.map(x=>({...x})),stores:state.stores.map(x=>({...x})),loading:state.loading,error:state.error})};
})();
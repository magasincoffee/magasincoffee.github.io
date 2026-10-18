(()=>{'use strict';
if(window.__MAGASIN_MANAGER_STAFF_PROJECTION_V1__)return;
window.__MAGASIN_MANAGER_STAFF_PROJECTION_V1__=true;
const SB_URL='https://menvbzlsncmpuvnaifxa.supabase.co',SB_KEY='sb_publishable_HsvCS6HDZnCDInd9PUoh0g_V34wJVqx';
let sb=null,busy=false;
let state={stores:[],rows:[],editId:null,loading:false,error:null,search:'',statusFilter:'ALL',employmentTypes:new Map(),employmentReady:false,employmentNotice:'',lifecycleReady:false,lifecycleRights:new Map(),lifecycleEditId:null};
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const errorCode=e=>{const s=String(e?.message||e?.code||'PROFILE_VIEW_FAILED');const m=s.match(/[A-Z][A-Z0-9_]{2,80}/);return m?m[0]:'PROFILE_VIEW_FAILED'};
const validProjectionRow=r=>!!r&&!!String(r.employee_id||'').trim()&&['STAFF','EMPLOYEE'].includes(String(r.employee_role||'').toUpperCase())&&!!String(r.profile_status||'').trim()&&Array.isArray(r.priority_store_ids)&&Array.isArray(r.priority_store_codes);
const client=()=>{const ctx=window.MAGASIN_MANAGER_WORKFORCE_CONTEXT;if(!ctx?.client)throw Error('MANAGER_CONTEXT_NOT_READY');return ctx.client()};
const view=()=>document.getElementById('view-staff');
function ensureCss(){
 if(document.getElementById('manager-staff-projection-v1-css'))return;
 const s=document.createElement('style');s.id='manager-staff-projection-v1-css';
 s.textContent='.msp-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;flex-wrap:wrap}.msp-actions{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.msp-actions select{min-height:38px;padding:6px 9px;border:1px solid #ccd9e4;border-radius:9px;background:#fff}.msp-search{min-height:38px;max-width:280px;width:100%;padding:8px 10px;border:1px solid #ccd9e4;border-radius:9px}.msp-table-wrap{overflow:auto}.msp-table{width:100%;border-collapse:collapse;min-width:860px}.msp-table th,.msp-table td{padding:10px 8px;border-bottom:1px solid #eef2f6;text-align:left;font-size:12px;vertical-align:middle}.msp-table th{color:var(--muted)}.msp-state{margin-top:12px;padding:11px 13px;border-radius:11px;font-size:12px}.msp-state.info{background:#eef7ff;color:#235dba}.msp-state.ok{background:#e6f4ed;color:#176d49}.msp-state.error{background:#fff0f0;color:#9a3838}.msp-priority{font-weight:800;color:#0f4778}.msp-edit{margin:14px 0;padding:14px;border:1px solid #cfe1eb;border-radius:13px;background:#f8fcfd}.msp-priority-grid{display:grid;grid-template-columns:repeat(4,minmax(150px,1fr));gap:8px;margin-top:10px}.msp-field{display:grid;gap:5px}.msp-field label{font-size:10px;font-weight:900;color:var(--muted);text-transform:uppercase}.msp-field select{height:40px;border:1px solid #ccd9e4;border-radius:9px;background:#fff;padding:0 8px}.msp-edit-actions{display:flex;gap:8px;justify-content:flex-end;margin-top:10px}@media(max-width:800px){.msp-priority-grid{grid-template-columns:1fr 1fr}.msp-actions{width:100%}}@media(max-width:520px){.msp-priority-grid{grid-template-columns:1fr}}';
 s.textContent+='.msp-modal-layer{position:fixed;inset:0;z-index:10020;display:flex;justify-content:center;align-items:center;padding:16px}.msp-modal-backdrop{position:absolute;inset:0;background:rgba(15,23,42,.48)}.msp-modal-dialog{position:relative;z-index:1;background:#fff;width:min(960px,100%);max-height:calc(100dvh - 32px);overflow:auto;border-radius:16px;box-shadow:0 25px 65px rgba(0,0,0,.22);outline:none}.msp-modal-head{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 18px;border-bottom:1px solid #e4e9ef;position:sticky;top:0;background:#fff;z-index:2}.msp-modal-head h3{font-size:17px;margin:0}.msp-modal-dialog .msp-edit{margin:0;border:0;border-radius:0;background:#fff;padding:18px}.msp-modal-dialog .msp-priority-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.msp-modal-close{min-width:42px;min-height:42px}.msp-modal-dialog :focus-visible{outline:2px solid #088b9b;outline-offset:2px}body.msp-modal-open{overflow:hidden}@media(max-width:600px){.msp-modal-layer{padding:8px}.msp-modal-dialog{max-height:calc(100dvh - 16px);border-radius:12px}.msp-modal-dialog .msp-priority-grid{grid-template-columns:1fr}.msp-modal-dialog .msp-edit{padding:12px}.msp-modal-head{padding:10px 12px}}';
 document.head.appendChild(s);
}
function ensureUi(){
 const root=view();if(!root)return false;ensureCss();
 if(root.dataset.canonicalStaffProjection==='2')return true;
 root.dataset.canonicalStaffProjection='3';root.classList.add('wf-role-page');
 root.innerHTML='<section class="card"><div class="msp-head wf-section-head"><div><h2 class="wf-section-title">Nhân viên</h2><div class="wf-section-copy">Một Workforce Profile canonical dùng chung cho Quản lý, Nhân viên và bộ xếp lịch. Quản lý là bên duy nhất thiết lập Store Priority.</div></div><div class="msp-actions"><input class="msp-search" id="mspSearch" type="search" aria-label="Tìm nhân viên" placeholder="Tìm tên, tài khoản, số điện thoại…"><select id="mspStatusFilter" aria-label="Lọc theo trạng thái nhân viên"><option value="ALL">Tất cả trạng thái</option><option value="ACTIVE">Đang làm việc</option><option value="INACTIVE">Đã nghỉ việc</option><option value="PENDING">Chờ kích hoạt</option></select><button class="btn" id="mspRefresh">Làm mới</button></div></div><div id="mspRoot"></div></section>';
 root.querySelector('#mspRefresh')?.addEventListener('click',()=>refresh());
 root.querySelector('#mspSearch')?.addEventListener('input',e=>{state.search=String(e.target.value||'');render()});
 root.querySelector('#mspStatusFilter')?.addEventListener('change',e=>{state.statusFilter=String(e.target.value||'ALL');render()});
 return true;
}
const storeOptions=(value,slot)=>'<option value="">'+(slot===1?'— Chọn chi nhánh chính —':'— Không sử dụng —')+'</option>'+state.stores.map(s=>'<option value="'+esc(s.id)+'"'+(String(s.id)===String(value||'')?' selected':'')+'>'+esc(s.code)+' · '+esc(s.name)+'</option>').join('');
function editHtml(row){
 if(!row)return '';
 const ids=Array.isArray(row.priority_store_ids)?row.priority_store_ids:[];
 return '<div class="msp-edit" data-msp-editor="'+esc(row.employee_id)+'"><b>'+esc(row.full_name||row.username||'Nhân viên')+'</b><div class="muted" style="margin-top:4px">Ưu tiên 1 là chi nhánh chính. Các vị trí sau là chi nhánh phụ theo thứ tự giảm dần. Bỏ khỏi danh sách = không được xếp vào chi nhánh đó.</div><div class="msp-priority-grid">'+[0,1,2,3].map(i=>'<div class="msp-field"><label>Ưu tiên '+(i+1)+(i===0?' · Chính':'')+'</label><select data-msp-priority="'+(i+1)+'">'+storeOptions(ids[i],i+1)+'</select></div>').join('')+'</div><div class="msp-field" style="margin-top:12px"><label for="mspEmploymentType">Loại nhân viên FT/PT</label><select id="mspEmploymentType" '+(state.employmentReady?'':'disabled')+'><option value="">Chưa phân loại</option><option value="FULL_TIME"'+(state.employmentTypes.get(String(row.employee_id))==='FULL_TIME'?' selected':'')+'>FT · Full-time</option><option value="PART_TIME"'+(state.employmentTypes.get(String(row.employee_id))==='PART_TIME'?' selected':'')+'>PT · Part-time</option></select><span role="status">'+esc(state.employmentReady?'':'Chức năng FT/PT chưa được bật ở backend.')+'</span></div><div class="msp-edit-actions"><button class="btn" data-msp-cancel>Hủy</button><button class="btn primary" data-msp-save>Lưu thay đổi</button></div><div class="msp-state info" data-msp-msg>Quản lý quyết định thứ tự này theo hồ sơ làm việc của nhân viên.</div></div>';
}
const employmentLabel=id=>({FULL_TIME:'FT · Full-time',PART_TIME:'PT · Part-time'})[state.employmentTypes.get(String(id))]||'Chưa phân loại';
function lifecycleEditorHtml(row){
 if(!row)return '';
 const target=String(row.profile_status).toUpperCase()==='ACTIVE'?'INACTIVE':'ACTIVE';
 return '<div class="msp-edit" data-msp-lifecycle-editor="'+esc(row.employee_id)+'"><b>'+esc(row.full_name||row.username||'Nhân viên')+'</b><p>Chuyển trạng thái sang '+(target==='INACTIVE'?'Đã nghỉ việc':'Đang làm việc')+'. Lịch làm việc và chấm công cũ được giữ nguyên; cần kiểm tra các ca tương lai.</p><label for="mspLifecycleReason">Lý do (3–300 ký tự)</label><textarea id="mspLifecycleReason" maxlength="300" rows="3" style="display:block;width:100%;padding:10px;border:1px solid #ccd9e4;border-radius:9px" required></textarea><div class="msp-edit-actions"><button class="btn" type="button" data-msp-lifecycle-cancel>Hủy</button><button class="btn primary" type="button" data-msp-lifecycle-save data-target="'+target+'">Xác nhận '+(target==='INACTIVE'?'nghỉ việc':'khôi phục')+'</button></div><div data-msp-lifecycle-message class="msp-state info" role="status">Thao tác được kiểm tra quyền lần nữa ở backend.</div></div>';
}
function modalHtml(content,kind){
 if(!content)return '';
 const title=kind==='lifecycle'?'Nghỉ việc / Khôi phục':'Thiết lập nhân viên';
 return '<div class="msp-modal-layer" data-msp-modal-layer><div class="msp-modal-backdrop" data-msp-modal-close aria-hidden="true"></div><div class="msp-modal-dialog" role="dialog" aria-modal="true" aria-labelledby="mspModalTitle" tabindex="-1"><div class="msp-modal-head"><h3 id="mspModalTitle">'+title+'</h3><button type="button" class="btn msp-modal-close" data-msp-modal-close aria-label="Đóng cửa sổ">✕</button></div>'+content+'</div></div>';
}
function closeModal(){
 if(busy)return;
 const id=state.lifecycleEditId||state.editId;
 const kind=state.lifecycleEditId?'lifecycle':'edit';
 state.editId=null;state.lifecycleEditId=null;render();
 const buttons=document.querySelectorAll(kind==='lifecycle'?'[data-msp-lifecycle-open]':'[data-msp-edit]');
 for(const button of buttons)if((kind==='lifecycle'?button.dataset.mspLifecycleOpen:button.dataset.mspEdit)===id){button.focus();break}
}
document.addEventListener('keydown',e=>{
 const layer=document.querySelector('[data-msp-modal-layer]');
 if(!layer)return;
 if(e.key==='Escape'){e.preventDefault();closeModal();return}
 if(e.key!=='Tab')return;
 const items=[...layer.querySelectorAll('button:not([disabled]),select:not([disabled]),textarea:not([disabled]),input:not([disabled]),[tabindex="0"]')].filter(el=>el.getClientRects().length);
 if(!items.length)return;
 const first=items[0],last=items[items.length-1];
 if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}
 else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}
});
function render(){
 if(!ensureUi())return;
 const root=document.getElementById('mspRoot');if(!root)return;
 if(state.loading){root.innerHTML='<div class="msp-state wf-state" data-state="LOADING">Đang tải Workforce Profile canonical…</div>';return}
 if(state.error){root.innerHTML='<div class="msp-state wf-state" data-state="ERROR">Không thể tải Workforce Profile. Mã: '+esc(state.error)+'</div>';return}
 const edit=state.rows.find(r=>String(r.employee_id)===String(state.editId||''));
 const lifeEdit=state.rows.find(r=>String(r.employee_id)===String(state.lifecycleEditId||''));
 const keyword=state.search.trim().toLocaleLowerCase('vi');
 const filtered=keyword?state.rows.filter(r=>[r.full_name,r.username,r.phone].some(v=>String(v||'').toLocaleLowerCase('vi').includes(keyword))):state.rows;
 const visible=filtered.filter(r=>state.statusFilter==='ALL'||String(r.profile_status||'').toUpperCase()===state.statusFilter);
 const rows=visible.map(r=>{const codes=Array.isArray(r.priority_store_codes)?r.priority_store_codes.filter(Boolean):[];return '<tr><td><b>'+esc(r.full_name||r.username||'Nhân viên')+'</b><div class="muted">@'+esc(r.username||'—')+'</div></td><td>'+esc(r.phone||'—')+'</td><td>'+esc(r.profile_status||'—')+'</td><td>'+esc(employmentLabel(r.employee_id))+'</td><td><div class="msp-priority">'+esc(codes.length?codes.join(' → '):'Chưa thiết lập')+'</div><div class="muted">'+esc(codes.length?'Ưu tiên 1 = chi nhánh chính':'Chưa đủ điều kiện xếp lịch cross-store')+'</div></td><td><button class="btn" data-msp-edit="'+esc(r.employee_id)+'">Thiết lập</button>'+(['ACTIVE','INACTIVE'].includes(String(r.profile_status||'').toUpperCase())?'<button class="btn" data-msp-lifecycle-open="'+esc(r.employee_id)+'" type="button" '+(state.lifecycleReady&&state.lifecycleRights.get(String(r.employee_id))===true?'':'disabled')+'>'+(String(r.profile_status).toUpperCase()==='ACTIVE'?'Nghỉ việc':'Khôi phục')+'</button>':'')+'</td></tr>'}).join('');
 root.innerHTML='<div class="msp-state wf-state" data-state="READY">Store Priority là authority của Quản lý. Employee và Auto Schedule đọc cùng canonical truth này.</div><div class="msp-table-wrap"><table class="msp-table"><thead><tr><th>Nhân viên</th><th>Điện thoại</th><th>Trạng thái</th><th>FT/PT</th><th>Ưu tiên chi nhánh</th><th>Thao tác</th></tr></thead><tbody>'+(rows||'<tr><td colspan="6">Không tìm thấy nhân viên phù hợp.</td></tr>')+'</tbody></table></div>'+modalHtml(lifeEdit?lifecycleEditorHtml(lifeEdit):edit?editHtml(edit):'',lifeEdit?'lifecycle':'edit');
 document.body.classList.toggle('msp-modal-open',!!(edit||lifeEdit));
 const search=document.getElementById('mspSearch');if(search&&search.value!==state.search)search.value=state.search;
 const statusSelect=document.getElementById('mspStatusFilter');if(statusSelect&&statusSelect.value!==state.statusFilter)statusSelect.value=state.statusFilter;
 bind();
}
function bind(){
 const root=document.getElementById('mspRoot');if(!root)return;
 root.querySelectorAll('[data-msp-edit]').forEach(b=>b.addEventListener('click',()=>{state.lifecycleEditId=null;state.editId=b.dataset.mspEdit;render();root.querySelector('[data-msp-modal-layer] [data-msp-editor] select')?.focus()}));
 root.querySelector('[data-msp-cancel]')?.addEventListener('click',closeModal);
 root.querySelector('[data-msp-save]')?.addEventListener('click',saveStaffChanges);

 root.querySelectorAll('[data-msp-lifecycle-open]').forEach(b=>b.addEventListener('click',()=>{state.editId=null;state.lifecycleEditId=b.dataset.mspLifecycleOpen;render();root.querySelector('#mspLifecycleReason')?.focus()}));
 root.querySelector('[data-msp-lifecycle-cancel]')?.addEventListener('click',closeModal);
 root.querySelectorAll('[data-msp-modal-close]').forEach(b=>b.addEventListener('click',closeModal));
 root.querySelector('[data-msp-lifecycle-save]')?.addEventListener('click',saveLifecycle);
}
async function loadStores(){
 state.stores=await window.MAGASIN_MANAGER_WORKFORCE_CONTEXT.stores();
}
async function loadEmploymentTypes(){
 let q;try{q=await client().rpc('list_employee_employment_types_v1')}catch(e){q={error:e}}
 state.employmentReady=!q?.error&&Array.isArray(q.data);
 state.employmentTypes=new Map((state.employmentReady?q.data:[]).filter(x=>x&&x.employee_id).map(x=>[String(x.employee_id),String(x.employment_type)]));
}
async function loadLifecycleRights(){
 let q;try{q=await client().rpc('list_employee_lifecycle_controls_v1')}catch(e){q={error:e}}
 state.lifecycleReady=!q?.error&&Array.isArray(q.data);
 state.lifecycleRights=new Map((state.lifecycleReady?q.data:[]).filter(x=>x&&x.employee_id).map(x=>[String(x.employee_id),x.can_manage===true]));
}
async function saveLifecycle(){
 const editor=document.querySelector('[data-msp-lifecycle-editor]');if(!editor||busy||!state.lifecycleReady)return;
 const employeeId=editor.dataset.mspLifecycleEditor,target=editor.querySelector('[data-msp-lifecycle-save]')?.dataset.target;
 const reason=String(editor.querySelector('#mspLifecycleReason')?.value||'').trim();
 const msg=editor.querySelector('[data-msp-lifecycle-message]');
 if(reason.length<3||reason.length>300){if(msg){msg.className='msp-state error';msg.textContent='Lý do phải có từ 3 đến 300 ký tự.'}return}
 if(!state.lifecycleRights.get(String(employeeId)))return;
 busy=true;const btn=editor.querySelector('[data-msp-lifecycle-save]');if(btn)btn.disabled=true;
 try{const q=await client().rpc('set_employee_lifecycle_status_v1',{p_employee_id:employeeId,p_new_status:target,p_reason:reason});
 if(q.error)throw q.error;
 state.lifecycleEditId=null;await loadLifecycleRights();await loadRows();}
 catch(e){if(msg&&msg.isConnected){msg.className='msp-state error';msg.textContent='Không thể đổi trạng thái: '+errorCode(e)}if(btn?.isConnected)btn.disabled=false}
 finally{busy=false}
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
async function saveStaffChanges(){
 const editor=document.querySelector('[data-msp-editor]');if(!editor||busy)return;
 const employeeId=editor.dataset.mspEditor,msg=editor.querySelector('[data-msp-msg]');
 const current=state.rows.find(r=>String(r.employee_id)===String(employeeId));if(!current)return;
 const values=[...editor.querySelectorAll('[data-msp-priority]')].map(x=>x.value||'');
 const original=Array.isArray(current.priority_store_ids)?current.priority_store_ids.map(String):[];
 const ids=values.filter(Boolean),priorityChanged=JSON.stringify(ids)!==JSON.stringify(original);
 const kind=editor.querySelector('#mspEmploymentType')?.value||'';
 const originalKind=state.employmentTypes.get(String(employeeId))||'';
 const typeChanged=kind!==originalKind;
 if(!priorityChanged&&!typeChanged){if(msg){msg.className='msp-state info';msg.textContent='Không có thay đổi để lưu.'}return}
 if(priorityChanged){
  if(!values[0]){if(msg){msg.className='msp-state error';msg.textContent='Phải chọn chi nhánh chính.'}return}
  let gap=false,seenEmpty=false;for(const v of values){if(!v)seenEmpty=true;else if(seenEmpty)gap=true}
  if(gap||new Set(ids).size!==ids.length){if(msg){msg.className='msp-state error';msg.textContent=gap?'Thứ tự ưu tiên phải liên tục.':'Một chi nhánh không thể xuất hiện hai lần.'}return}
 }
 if(typeChanged&&(!state.employmentReady||!['FULL_TIME','PART_TIME'].includes(kind))){
  if(msg){msg.className='msp-state error';msg.textContent='Không thể lưu FT/PT: hãy chọn FT hoặc PT và xác nhận backend khả dụng.'}return
 }
 busy=true;const button=editor.querySelector('[data-msp-save]');if(button)button.disabled=true;
 if(msg){msg.className='msp-state info';msg.textContent='Đang lưu thay đổi…'}
 let prioritySaved=false,typeSaved=false;
 try{
  if(priorityChanged){const r=await client().rpc('set_employee_store_priority_profile_v1',{p_employee_id:employeeId,p_store_ids:ids});if(r.error)throw r.error;prioritySaved=true}
  if(typeChanged){const r=await client().rpc('set_employee_employment_type_v1',{p_employee_id:employeeId,p_employment_type:kind});if(r.error)throw r.error;typeSaved=true}
  state.editId=null;
  if(typeSaved)await loadEmploymentTypes();
  await loadRows();
 }catch(e){
  if(prioritySaved||typeSaved){
   try{if(typeSaved)await loadEmploymentTypes();await loadRows()}catch(_){}
  }
  const message='Không thể lưu tất cả thay đổi. '+(prioritySaved?'Ưu tiên chi nhánh đã lưu; ':'')+(typeSaved?'FT/PT đã lưu; ':'')+'mã lỗi: '+errorCode(e)+'. Kiểm tra lại trước khi thử lại.';
  const activeMsg=document.querySelector('[data-msp-editor] [data-msp-msg]')||msg;
  if(activeMsg?.isConnected){activeMsg.className='msp-state error';activeMsg.textContent=message}
  if(button?.isConnected)button.disabled=false;
 }finally{busy=false}
}
async function refresh(){
 if(busy||!ensureUi())return;busy=true;
 try{if(!state.stores.length)await loadStores();await loadEmploymentTypes();await loadLifecycleRights();busy=false;await loadRows()}
 catch(e){busy=false;state.loading=false;state.rows=[];state.error=errorCode(e);render()}
}
document.addEventListener('click',e=>{if(e.target.closest?.('[data-view="staff"]'))setTimeout(()=>refresh(),0)},true);
window.MAGASIN_MANAGER_STAFF_PROJECTION={refresh,getState:()=>({rows:state.rows.map(x=>({...x})),stores:state.stores.map(x=>({...x})),loading:state.loading,error:state.error})};
})();
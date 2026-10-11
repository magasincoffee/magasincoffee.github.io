(()=>{'use strict';
if(window.__MAGASIN_MANAGER_STAFF_PROJECTION_V1__)return;
window.__MAGASIN_MANAGER_STAFF_PROJECTION_V1__=true;
const SB_URL='https://menvbzlsncmpuvnaifxa.supabase.co',SB_KEY='sb_publishable_HsvCS6HDZnCDInd9PUoh0g_V34wJVqx';
let sb=null,busy=false;
let state={stores:[],rows:[],editId:null,loading:false,error:null,employmentTypes:new Map(),employmentTypeReady:false};
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const errorCode=e=>{const s=String(e?.message||e?.code||'PROFILE_VIEW_FAILED');const m=s.match(/[A-Z][A-Z0-9_]{2,80}/);return m?m[0]:'PROFILE_VIEW_FAILED'};
const validProjectionRow=r=>!!r&&!!String(r.employee_id||'').trim()&&['STAFF','EMPLOYEE'].includes(String(r.employee_role||'').toUpperCase())&&!!String(r.profile_status||'').trim()&&Array.isArray(r.priority_store_ids)&&Array.isArray(r.priority_store_codes);
const client=()=>{const ctx=window.MAGASIN_MANAGER_WORKFORCE_CONTEXT;if(!ctx?.client)throw Error('MANAGER_CONTEXT_NOT_READY');return ctx.client()};
const view=()=>document.getElementById('view-staff');
function ensureCss(){
 if(document.getElementById('manager-staff-projection-v1-css'))return;
 const s=document.createElement('style');s.id='manager-staff-projection-v1-css';
 s.textContent='.msp-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;flex-wrap:wrap}.msp-actions{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.msp-table-wrap{overflow:auto}.msp-table{width:100%;border-collapse:collapse;min-width:860px}.msp-table th,.msp-table td{padding:10px 8px;border-bottom:1px solid #eef2f6;text-align:left;font-size:12px;vertical-align:middle}.msp-table th{color:var(--muted)}.msp-state{margin-top:12px;padding:11px 13px;border-radius:11px;font-size:12px}.msp-state.info{background:#eef7ff;color:#235dba}.msp-state.ok{background:#e6f4ed;color:#176d49}.msp-state.error{background:#fff0f0;color:#9a3838}.msp-priority{font-weight:800;color:#0f4778}.msp-edit{margin:14px 0;padding:14px;border:1px solid #cfe1eb;border-radius:13px;background:#f8fcfd}.msp-priority-grid{display:grid;grid-template-columns:repeat(4,minmax(150px,1fr));gap:8px;margin-top:10px}.msp-field{display:grid;gap:5px}.msp-field label{font-size:10px;font-weight:900;color:var(--muted);text-transform:uppercase}.msp-field select{height:40px;border:1px solid #ccd9e4;border-radius:9px;background:#fff;padding:0 8px}.msp-edit-actions{display:flex;gap:8px;justify-content:flex-end;margin-top:10px}@media(max-width:800px){.msp-priority-grid{grid-template-columns:1fr 1fr}.msp-actions{width:100%}}@media(max-width:520px){.msp-priority-grid{grid-template-columns:1fr}}';
 s.textContent+='.msp-type-editor{margin-top:15px;padding:12px;border:1px solid #d9e5ef;border-radius:10px;background:#fff}.msp-type-row{display:flex;align-items:end;gap:10px;flex-wrap:wrap;margin-top:9px}.msp-type-row select{min-width:170px;height:40px;border:1px solid #ccd9e4;border-radius:9px;padding:0 8px}.msp-type-editor h3{font-size:14px;margin:0}.msp-type-note{margin-top:9px;font-size:12px}.msp-type-summary{font-weight:700}.msp-type-row .btn:disabled{opacity:.5;cursor:not-allowed;background:#e8eef3;color:#5d6d7b;border-color:#d1dce4}';
 s.textContent+='.msp-inline-row{background:#f4fafe}.msp-inline-row td{vertical-align:top;border-bottom:2px solid #d5e9f4}.msp-icon-edit{min-width:38px;min-height:38px;padding:7px;font-size:17px}.msp-icon-edit:focus-visible{outline:2px solid #088b9b;outline-offset:2px}.msp-inline-row select{min-height:38px;max-width:100%;min-width:0;width:100%;border:1px solid #ccd9e4;border-radius:8px;background:#fff;padding:0 6px}.msp-inline-field{display:grid;gap:5px;font-size:11px;font-weight:700}.msp-inline-priority{display:grid;grid-template-columns:repeat(2,minmax(105px,1fr));gap:7px}.msp-inline-actions{display:grid;gap:7px;min-width:110px}.msp-inline-actions .btn{font-size:12px;padding:8px;white-space:nowrap;min-height:36px}.msp-inline-actions button:disabled{opacity:.5;cursor:not-allowed}.msp-inline-note,.msp-type-note{margin-top:7px;font-size:11px;line-height:1.5;font-weight:400}.msp-editing-label{display:inline-block;margin-top:7px;color:#167187;font-weight:800;font-size:10px}@media(max-width:800px){.msp-table-wrap{overflow:visible}.msp-table{display:block;min-width:0}.msp-table thead{display:none}.msp-table tbody{display:grid;gap:10px}.msp-table tr{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:5px;border:1px solid #dce8ef;border-radius:10px;padding:10px}.msp-table td{display:block;min-width:0;border-bottom:0;padding:5px;overflow-wrap:anywhere}.msp-table td::before{content:attr(data-label);display:block;color:var(--muted);font-size:10px;font-weight:700;margin-bottom:3px}.msp-inline-row td[data-label="Ưu tiên chi nhánh"],.msp-inline-row td[data-label="Thao tác"]{grid-column:1/-1}.msp-inline-actions{display:flex;flex-wrap:wrap}.msp-inline-priority{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:520px){.msp-table tr{grid-template-columns:minmax(0,1fr)}.msp-inline-row td[data-label="Ưu tiên chi nhánh"],.msp-inline-row td[data-label="Thao tác"]{grid-column:1}}';
 document.head.appendChild(s);
}
function ensureUi(){
 const root=view();if(!root)return false;ensureCss();
 if(root.dataset.canonicalStaffProjection==='3')return true;
 root.dataset.canonicalStaffProjection='3';root.classList.add('wf-role-page');
 root.innerHTML='<section class="card"><div class="msp-head wf-section-head"><div><h2 class="wf-section-title">Nhân viên</h2><div class="wf-section-copy">Một Workforce Profile canonical dùng chung cho Quản lý, Nhân viên và bộ xếp lịch. Quản lý là bên duy nhất thiết lập Store Priority.</div></div><div class="msp-actions"><button class="btn" id="mspRefresh">Làm mới</button></div></div><div id="mspRoot"></div></section>';
 root.querySelector('#mspRefresh')?.addEventListener('click',()=>refresh());
 return true;
}
const employmentTypeLabel=v=>String(v||'').toUpperCase()==='FULL_TIME'?'FT · Full-time':String(v||'').toUpperCase()==='PART_TIME'?'PT · Part-time':'Chưa phân loại';
const storeOptions=(value,slot)=>'<option value="">'+(slot===1?'— Chọn chi nhánh chính —':'— Không sử dụng —')+'</option>'+state.stores.map(s=>'<option value="'+esc(s.id)+'"'+(String(s.id)===String(value||'')?' selected':'')+'>'+esc(s.code)+' · '+esc(s.name)+'</option>').join('');
function editHtml(row){
 if(!row)return '';
 const id=esc(row.employee_id),name=esc(row.full_name||row.username||'Nhân viên'),ids=Array.isArray(row.priority_store_ids)?row.priority_store_ids:[];
 const t=String(state.employmentTypes.get(String(row.employee_id))||'').toUpperCase(),ready=state.employmentTypeReady;
 const type='<label class="msp-inline-field">Loại nhân viên<select data-msp-employment aria-label="Loại nhân viên của '+name+'"><option value="">Chưa phân loại</option><option value="FULL_TIME"'+(t==='FULL_TIME'?' selected':'')+'>FT · Full-time</option><option value="PART_TIME"'+(t==='PART_TIME'?' selected':'')+'>PT · Part-time</option></select></label><div data-msp-type-msg class="msp-type-note" role="status" aria-live="polite">'+(ready?'Chọn loại rồi bấm Lưu FT/PT.':'Chưa thể lưu FT/PT. Bạn chỉ đang chọn xem trước vì hệ thống chưa hỗ trợ hoặc chưa cấp quyền.')+'</div>';
 const stores='<div class="msp-inline-priority">'+[0,1,2,3].map(n=>'<label class="msp-inline-field">Ưu tiên '+(n+1)+'<select data-msp-priority="'+(n+1)+'" aria-label="Ưu tiên '+(n+1)+' của '+name+'">'+storeOptions(ids[n],n+1)+'</select></label>').join('')+'</div><div class="msp-inline-note" data-msp-msg role="status" aria-live="polite">Ưu tiên 1 là chi nhánh chính. Không bỏ trống ở giữa.</div>';
 return '<tr class="msp-inline-row" data-msp-editor="'+id+'" data-msp-row="'+id+'"><td data-label="Nhân viên"><b>'+name+'</b><div class="muted">@'+esc(row.username||'—')+'</div><span class="msp-editing-label">Đang sửa</span></td><td data-label="Điện thoại">'+esc(row.phone||'—')+'</td><td data-label="Trạng thái">'+esc(row.profile_status||'—')+'</td><td data-label="FT/PT">'+type+'</td><td data-label="Ưu tiên chi nhánh">'+stores+'</td><td data-label="Thao tác"><div class="msp-inline-actions"><button type="button" class="btn primary" data-msp-type-save'+(ready?'':' disabled')+'>Lưu FT/PT</button><button type="button" class="btn primary" data-msp-save>Lưu ưu tiên</button><button type="button" class="btn" data-msp-cancel>Hủy</button></div><div class="msp-inline-note">Lưu từng mục riêng để báo đúng kết quả.</div></td></tr>';
}
function render(){
 if(!ensureUi())return;
 const root=document.getElementById('mspRoot');if(!root)return;
 if(state.loading){root.innerHTML='<div class="msp-state wf-state" data-state="LOADING">Đang tải Workforce Profile canonical…</div>';return}
 if(state.error){root.innerHTML='<div class="msp-state wf-state" data-state="ERROR">Không thể tải Workforce Profile. Mã: '+esc(state.error)+'</div>';return}

 const rows=state.rows.map(r=>{if(String(r.employee_id)===String(state.editId||''))return editHtml(r);const codes=Array.isArray(r.priority_store_codes)?r.priority_store_codes.filter(Boolean):[];return '<tr><td data-label="Nhân viên"><b>'+esc(r.full_name||r.username||'Nhân viên')+'</b><div class="muted">@'+esc(r.username||'—')+'</div></td><td data-label="Điện thoại">'+esc(r.phone||'—')+'</td><td data-label="Trạng thái">'+esc(r.profile_status||'—')+'</td><td data-label="FT/PT" class="msp-type-summary">'+esc(employmentTypeLabel(state.employmentTypes.get(String(r.employee_id))))+'</td><td data-label="Ưu tiên chi nhánh"><div class="msp-priority">'+esc(codes.length?codes.join(' → '):'Chưa thiết lập')+'</div><div class="muted">'+esc(codes.length?'Ưu tiên 1 = chi nhánh chính':'Chưa đủ điều kiện xếp lịch cross-store')+'</div></td><td data-label="Thao tác"><button class="btn msp-icon-edit" data-msp-edit="'+esc(r.employee_id)+'" type="button" aria-label="Sửa nhân viên '+esc(r.full_name||r.username||'')+'" title="Sửa nhân viên">✏️</button></td></tr>'}).join('');
 root.innerHTML='<div class="msp-state wf-state" data-state="READY">Store Priority là authority của Quản lý. Employee và Auto Schedule đọc cùng canonical truth này.</div><div class="msp-table-wrap"><table class="msp-table"><thead><tr><th>Nhân viên</th><th>Điện thoại</th><th>Trạng thái</th><th>FT/PT</th><th>Ưu tiên chi nhánh</th><th>Thao tác</th></tr></thead><tbody>'+rows+'</tbody></table></div>';
 bind();
}
function bind(){
 const root=document.getElementById('mspRoot');if(!root)return;
 root.querySelectorAll('[data-msp-edit]').forEach(b=>b.addEventListener('click',()=>{state.editId=b.dataset.mspEdit;render();root.querySelector('[data-msp-employment]')?.focus({preventScroll:true})}));
 root.querySelector('[data-msp-cancel]')?.addEventListener('click',()=>{const prev=state.editId;state.editId=null;render();[...root.querySelectorAll('[data-msp-edit]')].find(x=>x.dataset.mspEdit===prev)?.focus({preventScroll:true})});
 root.querySelector('[data-msp-save]')?.addEventListener('click',savePriority);
 root.querySelector('[data-msp-type-save]')?.addEventListener('click',saveEmploymentType);
 root.querySelector('[data-msp-employment]')?.addEventListener('change',e=>{
  if(state.employmentTypeReady)return;
  const note=root.querySelector('[data-msp-type-msg]');if(!note)return;
  note.className='msp-type-note msp-state info';
  note.textContent=e.target.value
   ?'Đã chọn '+employmentTypeLabel(e.target.value)+' để xem trước. CHƯA LƯU: cần triển khai chức năng FT/PT trên database.'
   :'Chưa phân loại. Bạn có thể chọn FT/PT để xem trước, nhưng chưa thể lưu vào database.';
 });
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
 let typeResult;
 try{typeResult=await client().rpc('list_employee_employment_types_v1')}catch(e){typeResult={error:e}}
 state.employmentTypeReady=!typeResult.error&&Array.isArray(typeResult.data);
 state.employmentTypes=new Map((state.employmentTypeReady?typeResult.data:[]).filter(x=>x&&x.employee_id).map(x=>[String(x.employee_id),String(x.employment_type||'').toUpperCase()]));
 state.rows=rows;state.error=null;render();
}
async function saveEmploymentType(){
 const editor=document.querySelector('[data-msp-editor]');if(!editor||busy||!state.employmentTypeReady)return;
 const employeeId=editor.dataset.mspEditor,value=editor.querySelector('[data-msp-employment]')?.value||'',msg=editor.querySelector('[data-msp-type-msg]'),btn=editor.querySelector('[data-msp-type-save]');
 if(!['FULL_TIME','PART_TIME'].includes(value)){if(msg){msg.textContent='Hãy chọn Full-time hoặc Part-time.';msg.className='msp-type-note msp-state error'}return}
 busy=true;if(btn)btn.disabled=true;
 if(msg){msg.textContent='Đang lưu phân loại vào hệ thống…';msg.className='msp-type-note msp-state info'}
 try{
  const updated=await client().rpc('set_employee_employment_type_v1',{p_employee_id:employeeId,p_employment_type:value});
  if(updated.error)throw updated.error;
  const verified=await client().rpc('list_employee_employment_types_v1');
  if(verified.error)throw verified.error;
  const persisted=(Array.isArray(verified.data)?verified.data:[]).find(x=>String(x.employee_id)===String(employeeId));
  if(String(persisted?.employment_type||'').toUpperCase()!==value)throw Error('EMPLOYMENT_TYPE_PERSISTENCE_NOT_VERIFIED');
  state.employmentTypes=new Map(verified.data.filter(x=>x&&x.employee_id).map(x=>[String(x.employee_id),String(x.employment_type||'').toUpperCase()]));
  render();
  const current=document.querySelector('[data-msp-type-msg]');
  if(current){current.className='msp-type-note msp-state ok';current.textContent='Đã lưu '+employmentTypeLabel(value)+' vào dữ liệu nhân viên. Lịch nháp mới sẽ đọc phân loại đã lưu.'}
  document.dispatchEvent(new CustomEvent('magasin:employment-type-saved',{detail:{employeeId,employmentType:value}}));
 }catch(e){if(msg?.isConnected){msg.textContent='Không thể lưu FT/PT. Mã: '+errorCode(e);msg.className='msp-type-note msp-state error'}}
 finally{busy=false;const current=document.querySelector('[data-msp-type-save]');if(current)current.disabled=!state.employmentTypeReady}
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
 if(busy||!ensureUi())return;
 // Reloading the staff list closes a previous inline editor without persisting draft choices.
 state.editId=null;busy=true;
 try{if(!state.stores.length)await loadStores();busy=false;await loadRows()}
 catch(e){busy=false;state.loading=false;state.rows=[];state.error=errorCode(e);render()}
}
document.addEventListener('click',e=>{if(e.target.closest?.('[data-view="staff"]'))setTimeout(()=>refresh(),0)},true);
window.MAGASIN_MANAGER_STAFF_PROJECTION={refresh,getState:()=>({rows:state.rows.map(x=>({...x})),stores:state.stores.map(x=>({...x})),loading:state.loading,error:state.error})};
})();
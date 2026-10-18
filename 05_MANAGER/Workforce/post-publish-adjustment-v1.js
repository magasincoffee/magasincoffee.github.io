(()=>{'use strict';
if(window.__MAGASIN_POST_PUBLISH_ADJUSTMENT_V1__)return;
window.__MAGASIN_POST_PUBLISH_ADJUSTMENT_V1__=true;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const hm=v=>String(v||'').slice(0,5);
const api=()=>window.MAGASIN_MANAGER_OFFICIAL_SCHEDULE;
const client=()=>window.MAGASIN_MANAGER_WORKFORCE_CONTEXT?.client?.();
const root=()=>document.querySelector('#view-schedule');
const today=()=>{const p=Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()).map(x=>[x.type,x.value]));return p.year+'-'+p.month+'-'+p.day};
const state={mode:'',scheduleId:null,people:[],busy:false,returnFocus:null};
const css=String.raw`
.mpp-actions{display:flex;gap:6px;flex-wrap:wrap}.mpp-open{margin:4px 9px 10px;font-size:11px}.mpp-layer{position:fixed;inset:0;z-index:12000;display:flex;align-items:center;justify-content:center;padding:12px}.mpp-backdrop{position:absolute;inset:0;background:rgba(15,23,42,.55)}.mpp-dialog{position:relative;width:min(560px,100%);max-height:calc(100dvh - 24px);overflow:auto;background:white;border-radius:15px;padding:18px;box-shadow:0 20px 60px #0004}.mpp-dialog h3{margin:0 0 9px}.mpp-dialog p{font-size:12px;color:#64748b}.mpp-grid{display:grid;grid-template-columns:1fr 1fr;gap:9px}.mpp-field{display:grid;gap:5px;margin:9px 0;font-size:12px;font-weight:700}.mpp-field select,.mpp-field input,.mpp-field textarea{width:100%;padding:9px;border:1px solid #bdcbd8;border-radius:8px;background:white;min-width:0}.mpp-field textarea{min-height:70px;resize:vertical}.mpp-dialog-actions{display:flex;gap:8px;justify-content:flex-end;margin-top:12px}.mpp-error{font-size:12px;color:#9a3838;white-space:pre-wrap}.mpp-audit{font-size:12px;margin:8px 0;padding:9px;border:1px solid #dce5ee;border-radius:8px}.mpp-dialog :focus-visible{outline:2px solid #0f7690;outline-offset:2px}@media(max-width:550px){.mpp-grid{grid-template-columns:1fr}}
`;
function ensureCss(){if(document.querySelector('#mppStyles'))return;const el=document.createElement('style');el.id='mppStyles';el.textContent=css;document.head.appendChild(el)}
function selectStores(selected){const ss=api()?.getState()?.stores||[];return ss.map(s=>'<option value="'+esc(s.id)+'"'+(String(selected||'')===String(s.id)?' selected':'')+'>'+esc(s.code||s.name)+' · '+esc(s.name||s.code)+'</option>').join('')}
function availableStaff(storeId){return state.people.filter(p=>String(p.profile_status||'').toUpperCase()==='ACTIVE'&&Array.isArray(p.priority_store_ids)&&p.priority_store_ids.some(id=>String(id)===String(storeId||'')))}
function fillStaff(){const d=document.querySelector('#mppDialog'),sel=d?.querySelector('#mppEmployee');if(!sel)return;const store=d.querySelector('#mppStore')?.value||'';const people=availableStaff(store);sel.innerHTML='<option value="">— Chọn nhân viên —</option>'+people.map(p=>'<option value="'+esc(p.employee_id)+'">'+esc(p.full_name||p.username||'Nhân viên')+'</option>').join('');d.querySelector('#mppStaffHint').textContent=people.length?people.length+' nhân viên đang làm việc, có quyền tại chi nhánh.':'Không có nhân viên đủ điều kiện tại chi nhánh này.'}
function close(){const lay=document.querySelector('#mppLayer');lay?.remove();state.mode='';state.scheduleId=null;state.busy=false;state.returnFocus?.focus?.();state.returnFocus=null}
function shell(title){ensureCss();const layer=document.createElement('div');layer.id='mppLayer';layer.className='mpp-layer';layer.innerHTML='<div class="mpp-backdrop" data-mpp-close></div><section id="mppDialog" class="mpp-dialog" role="dialog" aria-modal="true" aria-labelledby="mppTitle" tabindex="-1"><h3 id="mppTitle">'+esc(title)+'</h3><div id="mppBody"></div><p class="mpp-error" id="mppError" role="alert"></p><div class="mpp-dialog-actions"><button type="button" class="btn" data-mpp-close>Đóng</button></div></section>';document.body.appendChild(layer);layer.querySelectorAll('[data-mpp-close]').forEach(b=>b.addEventListener('click',close));layer.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();close()}if(e.key==='Tab'){const focusables=[...layer.querySelectorAll('button:not([disabled]),select:not([disabled]),input:not([disabled]),textarea:not([disabled])')];if(!focusables.length)return;const first=focusables[0],last=focusables.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}}});layer.querySelector('#mppDialog').focus();return layer.querySelector('#mppDialog')}
function showError(message){const x=document.querySelector('#mppError');if(x)x.textContent=String(message||'Không thể thực hiện thao tác.')}
async function fetchStaff(){const c=client();if(!c)throw Error('MANAGER_CONTEXT_NOT_READY');const r=await c.rpc('list_employee_workforce_profiles_v1');if(r.error)throw r.error;if(!Array.isArray(r.data))throw Error('EMPLOYEE_PROJECTION_INVALID');state.people=r.data}
async function open(mode,scheduleId){if(document.querySelector('#mppLayer'))return;state.returnFocus=document.activeElement;state.mode=mode;state.scheduleId=scheduleId||null;const data=api()?.getState();const row=data?.rows?.find(r=>String(r.schedule_id)===String(scheduleId));if(mode==='REASSIGN'&&!row)return;
 const dlg=shell(mode==='AUDIT'?'Lịch sử điều động':mode==='REASSIGN'?'Thay nhân viên sau phát hành':'Bổ sung ca sau phát hành');
 const body=dlg.querySelector('#mppBody');body.innerHTML='<p>Đang tải dữ liệu nhân viên và quyền chi nhánh…</p>';
 try{
  if(mode!=='AUDIT')await fetchStaff();
  if(!document.querySelector('#mppLayer'))return;
  const stores=data?.stores||[];
  const chosen=row?.store_id||data?.storeId||stores[0]?.id||'';
  if(!stores.length){showError('Tài khoản không có chi nhánh được phép.');return}
  if(mode==='AUDIT'){
   body.innerHTML='<label class="mpp-field">Chi nhánh<select id="mppStore">'+selectStores(chosen)+'</select></label><div id="mppAuditItems">Đang tải lịch sử…</div>';
   body.querySelector('#mppStore').addEventListener('change',loadAudit);await loadAudit();return;
  }
  const begin=String(data?.week||today()).slice(0,10),date=row?.work_date|| (begin>today()?begin:today());
  body.innerHTML='<p>'+(mode==='REASSIGN'?'Thay người của ca đã phát hành. Thời gian và chi nhánh không bị thay đổi.':'Tạo thêm ca chính thức trong tuần đã phát hành, không ghi đè ca hiện có.')+'</p>'
   +'<label class="mpp-field">Chi nhánh<select id="mppStore"'+(mode==='REASSIGN'?' disabled':'')+'>'+selectStores(chosen)+'</select></label>'
   +(mode==='ADD'?'<div class="mpp-grid"><label class="mpp-field">Ngày<input id="mppDate" type="date" min="'+today()+'" value="'+esc(date)+'" required></label><label class="mpp-field">Bắt đầu<input id="mppStart" type="time" value="08:00" required></label></div><label class="mpp-field">Kết thúc<input id="mppEnd" type="time" value="12:00" required></label>':'<p>'+esc(String(row.work_date).slice(0,10))+' · '+esc(hm(row.start_time))+'–'+esc(hm(row.end_time))+' · Nhân viên hiện tại: '+esc(row.employee_name||'')+'</p>')
   +'<label class="mpp-field">Nhân viên<select id="mppEmployee" required></select></label><p id="mppStaffHint"></p>'
   +'<label class="mpp-field">Lý do điều động<textarea id="mppReason" maxlength="300" minlength="3" required placeholder="Ví dụ: Bổ sung nhân sự cho ca còn thiếu"></textarea></label>'
   +'<div class="mpp-dialog-actions"><button id="mppSubmit" class="btn primary" type="button">Lưu điều động</button></div>';
  fillStaff();body.querySelector('#mppStore').addEventListener('change',fillStaff);
  body.querySelector('#mppSubmit').addEventListener('click',submit);
 }catch(e){showError(e?.message||e)}
}
async function loadAudit(){const box=document.querySelector('#mppAuditItems'),store=document.querySelector('#mppStore')?.value,week=api()?.getState()?.week;if(!box||!store||!week)return;box.textContent='Đang tải lịch sử…';try{const r=await client().rpc('list_manager_post_publish_audit_v1',{p_store_id:store,p_week_start:week});if(r.error)throw r.error;const rows=Array.isArray(r.data)?r.data:[];box.innerHTML=rows.length?rows.map(a=>'<div class="mpp-audit"><b>'+esc(a.action==='ADD'?'Bổ sung ca':'Thay nhân viên')+'</b> · '+esc(a.work_date)+'<div>'+esc(a.reason||'')+'</div><small>'+esc(a.changed_at||'')+'</small></div>').join(''):'<p>Chưa có lịch sử điều động trong tuần này.</p>'}catch(e){box.textContent='Không tải được lịch sử: '+String(e?.message||e)}}
async function submit(){if(state.busy)return;const d=document.querySelector('#mppDialog');if(!d)return;const emp=d.querySelector('#mppEmployee')?.value,reason=String(d.querySelector('#mppReason')?.value||'').trim(),store=d.querySelector('#mppStore')?.value;
 if(!emp||!store)return showError('Hãy chọn chi nhánh và nhân viên.');
 if(reason.length<3||reason.length>300)return showError('Lý do phải có từ 3 đến 300 ký tự.');
 let fn,payload;
 if(state.mode==='ADD'){
  const date=d.querySelector('#mppDate')?.value,start=d.querySelector('#mppStart')?.value,end=d.querySelector('#mppEnd')?.value;
  if(!date||!start||!end||start>=end)return showError('Ngày hoặc giờ ca không hợp lệ.');
  fn='add_published_shift_v1';payload={p_store_id:store,p_work_date:date,p_start_time:start,p_end_time:end,p_employee_id:emp,p_reason:reason};
 }else if(state.mode==='REASSIGN'){fn='reassign_published_shift_v1';payload={p_schedule_id:state.scheduleId,p_employee_id:emp,p_reason:reason}}
 else return;
 if(!confirm('Lưu điều động vào lịch chính thức và ghi lịch sử thay đổi?'))return;
 state.busy=true;const btn=d.querySelector('#mppSubmit');btn.disabled=true;showError('');
 try{const result=await client().rpc(fn,payload);if(result.error)throw result.error;if(!result.data?.saved)throw Error('ADJUSTMENT_NOT_SAVED');close();await api()?.refresh?.();document.dispatchEvent(new CustomEvent('magasin:post-publish-adjusted',{detail:{action:fn,storeId:store}}))}
 catch(e){showError('Điều động thất bại: '+String(e?.message||e))}
 finally{state.busy=false;if(btn.isConnected)btn.disabled=false}
}
function sync(){const v=root();if(!v||!v.querySelector('.mos-head')||v.querySelector('#mppToolbar'))return;const ctl=v.querySelector('.mos-controls');if(!ctl)return;ensureCss();const tool=document.createElement('div');tool.id='mppToolbar';tool.className='mpp-actions';tool.innerHTML='<button type="button" class="btn primary" id="mppAdd">+ Bổ sung ca</button><button type="button" class="btn" id="mppHistory">Lịch sử điều động</button>';ctl.appendChild(tool);tool.querySelector('#mppAdd').addEventListener('click',()=>open('ADD'));tool.querySelector('#mppHistory').addEventListener('click',()=>open('AUDIT'));v.querySelectorAll('.mos-shift[data-schedule-id]').forEach(shift=>{const id=shift.dataset.scheduleId;if(!id)return;const b=document.createElement('button');b.type='button';b.className='btn mpp-open';b.textContent='Thay nhân viên';b.setAttribute('aria-label','Thay nhân viên cho ca đã phát hành');b.addEventListener('click',()=>open('REASSIGN',id));shift.appendChild(b)})}
function boot(){const v=root();if(!v){setTimeout(boot,150);return}new MutationObserver(sync).observe(v,{subtree:true,childList:true});sync()}
window.MAGASIN_POST_PUBLISH_ADJUSTMENT={open,close};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
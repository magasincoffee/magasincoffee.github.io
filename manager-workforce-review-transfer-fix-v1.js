(()=>{'use strict';
const U='https://menvbzlsncmpuvnaifxa.supabase.co',K='sb_publishable_HsvCS6HDZnCDInd9PUoh0g_V34wJVqx';
const PANEL='#panel-review';
const DAYS=['T2','T3','T4','T5','T6','T7','CN'];
const pad=n=>String(n).padStart(2,'0');
const dateUTC=s=>new Date(`${String(s).slice(0,10)}T00:00:00Z`);
const add=(s,n)=>{const d=dateUTC(s);d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10)};
const monday=d=>{const x=new Date(Date.UTC(d.getFullYear(),d.getMonth(),d.getDate())),day=x.getUTCDay()||7;x.setUTCDate(x.getUTCDate()-day+1);return x.toISOString().slice(0,10)};
const hm=v=>String(v||'').slice(0,5);
const mins=v=>{const x=hm(v);return Number(x.slice(0,2))*60+Number(x.slice(3,5))};
const esc=s=>String(s??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
const statusClass=v=>{const s=String(v||'').toUpperCase();return s==='PREFERRED'?'preferred':s==='CONFLICT'?'conflict':s==='APPROVED'?'approved':'available'};
const timeOptions=sel=>{let out='';for(let m=300;m<=1320;m+=30){const v=`${pad(Math.floor(m/60))}:${pad(m%60)}`;out+=`<option value="${v}"${v===hm(sel)?' selected':''}>${v}</option>`}return out};
const CSS=`<style id="mwr-transfer-fix-css">
.mwrx-wrap{display:grid;gap:10px;margin-top:12px}.mwrx-filter{display:flex;align-items:center;gap:8px}.mwrx-filter label{font-size:11px;font-weight:800;color:var(--muted)}.mwrx-filter select{height:40px;min-width:260px;border:1px solid var(--border);border-radius:9px;padding:0 10px;background:#fff;color:var(--text);font-weight:700}.mwrx-transfer-card{border:1px solid var(--border);border-radius:12px;padding:12px;background:#f8fafd}.mwrx-transfer-head{display:flex;justify-content:space-between;gap:10px;align-items:flex-start}.mwrx-transfer-title{font-weight:800}.mwrx-transfer-meta{font-size:11px;color:var(--muted);margin-top:3px}.mwrx-actions{display:flex;gap:6px;flex-wrap:wrap}.mwrx-actions .btn{min-height:34px;padding:0 11px}.mwrx-approve{background:#0f9f8d!important;color:#fff!important;border-color:#0f9f8d!important}.mwrx-reject{color:#a33b35!important;border-color:#e9b2ad!important}.mwrx-pending{display:inline-flex;align-items:center;padding:4px 7px;border-radius:999px;background:#fff3b0;color:#6e5a00;font-size:10px;font-weight:800}
</style>`;
async function boot(){
 if(!window.supabase?.createClient)return;let panel;for(let i=0;i<80;i++){panel=document.querySelector(PANEL);if(panel)break;await new Promise(r=>setTimeout(r,150))}if(!panel)return;
 if(!document.getElementById('mwr-transfer-fix-css'))document.head.insertAdjacentHTML('beforeend',CSS);
 const sb=window.supabase.createClient(U,K,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
 const roleQ=await sb.rpc('current_user_role');const role=String(roleQ.data||'').toUpperCase();if(!['OWNER','STORE_MANAGER'].includes(role))return;
 const storesQ=await sb.rpc('get_manager_accessible_stores');const stores=storesQ.data||[];if(!stores.length)return;
 const week=monday(new Date());
 const state={selectedStoreId:String(stores[0].id)};
 const byCode=id=>{const s=stores.find(x=>String(x.id)===String(id));return s?String(s.code||''):''};
 const byName=id=>{const s=stores.find(x=>String(x.id)===String(id));return s?String(s.name||''):''};
 const info=(text,type='ok')=>{let el=panel.querySelector('#mwrxInfo');if(!el){el=document.createElement('div');el.id='mwrxInfo';panel.appendChild(el)}el.className=`mwr2-status ${type}`;el.hidden=false;el.textContent=text};
 const findAvailability=async(meta)=>{const q=await sb.rpc('get_manager_weekly_availability',{p_store_id:state.selectedStoreId,p_week_start:week});if(q.error)return null;const rows=q.data||[];return rows.find(r=>String(r.work_date).slice(0,10)===meta.date&&String(r.employee_name||'')===meta.name&&hm(r.start_time)===meta.start&&hm(r.end_time)===meta.end)||null};
 const pending=async()=>{const q=await sb.rpc('get_manager_transfer_requests',{p_week_start:week});return q.error?[]:(q.data||[]).filter(r=>String(r.status||'').toUpperCase()==='PENDING' && String(r.target_store_code||'')===byCode(state.selectedStoreId))};
 const renderPending=async()=>{const list=await pending();let box=panel.querySelector('#mwrxPending');if(!box){box=document.createElement('div');box.id='mwrxPending';box.className='mwrx-wrap';panel.querySelector('.mwr2-card')?.appendChild(box)}box.innerHTML='';if(!list.length){box.style.display='none';return}box.style.display='grid';box.innerHTML=`<div class="mwrx-transfer-title">Yêu cầu chuyển chi nhánh chờ duyệt · ${esc(byCode(state.selectedStoreId))}</div>`+list.map(r=>`<div class="mwrx-transfer-card" data-request="${esc(r.id)}"><div class="mwrx-transfer-head"><div><div class="mwrx-transfer-title">${esc(r.employee_name||'Nhân viên')}</div><div class="mwrx-transfer-meta">${esc(r.work_date)} · ${hm(r.start_time)}–${hm(r.end_time)} · ${esc(r.source_store_code||'?')} → ${esc(r.target_store_code||'?')}</div><div class="mwrx-transfer-meta">${esc(r.note||'Chuyển chi nhánh')}</div></div><span class="mwrx-pending">CHỜ DUYỆT</span></div><div class="mwrx-actions" style="margin-top:8px"><button class="btn mwrx-approve" data-approve="${esc(r.id)}">Duyệt chuyển</button><button class="btn mwrx-reject" data-reject="${esc(r.id)}">Từ chối</button></div></div>`).join('');
 box.querySelectorAll('[data-approve]').forEach(b=>b.addEventListener('click',async()=>{b.disabled=true;const q=await sb.rpc('review_store_transfer_request',{p_request_id:b.dataset.approve,p_approve:true,p_review_note:null});if(q.error){b.disabled=false;info('Duyệt chuyển thất bại: '+(q.error.message||q.error.code||'UNKNOWN'),'error');return}info('Đã duyệt chuyển chi nhánh. Nhân viên sẽ được cập nhật sang chi nhánh đích.','ok');await renderPending();await refreshReview()}));
 box.querySelectorAll('[data-reject]').forEach(b=>b.addEventListener('click',async()=>{const note=window.prompt('Lý do từ chối (có thể để trống):','');if(note===null)return;b.disabled=true;const q=await sb.rpc('review_store_transfer_request',{p_request_id:b.dataset.reject,p_approve:false,p_review_note:note});if(q.error){b.disabled=false;info('Từ chối thất bại: '+(q.error.message||q.error.code||'UNKNOWN'),'error');return}info('Đã từ chối yêu cầu chuyển chi nhánh.','ok');await renderPending();await refreshReview()}));
 };
 const refreshReview=async()=>{const q=await sb.rpc('get_manager_weekly_availability',{p_store_id:state.selectedStoreId,p_week_start:week});if(q.error)return;const rows=q.data||[];panel.querySelectorAll('.mwr2-shift').forEach(el=>el.remove());panel.querySelectorAll('.mwr2-day').forEach(day=>{const d=day.dataset.date;if(!d)return});};
 // Capture the existing review edit button before the legacy v2 save handler can run.
 document.addEventListener('click',async e=>{
   const edit=e.target.closest?.('[data-edit]');if(edit){
     const card=edit.closest('.mwr2-shift');const day=card?.closest('.mwr2-day');const name=card?.querySelector('.mwr2-name')?.textContent?.trim()||'';const tm=card?.querySelector('.mwr2-time')?.textContent?.trim()||'';const dayTitle=day?.querySelector('.mwr2-day-title b')?.textContent||'';const m=dayTitle.match(/(T2|T3|T4|T5|T6|T7|CN)\s*-\s*(\d{2})\/(\d{2})/);if(card&&m){const year=String(new Date().getFullYear());const date=`${year}-${m[3]}-${m[2]}`;const parts=tm.split('–').map(x=>x.trim());const row=await findAvailability({date,name,start:parts[0],end:parts[1]});if(row){card.dataset.availabilityId=row.availability_id;card.dataset.sourceStoreId=row.preferred_store_id||'';card.dataset.sourceStoreCode=row.preferred_store_code||byCode(state.selectedStoreId)}}return;
   }
   const save=e.target.closest?.('[data-save]');if(!save)return;
   e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
   const box=save.closest('.mwr2-shift');if(!box)return;
   const id=box.dataset.availabilityId;
   if(!id){info('Không xác định được bản ghi đăng ký. Hãy đóng chỉnh sửa và bấm ✎ lại một lần rồi Lưu.','error');return}
   const start=box.querySelector('[data-k="start_time"]')?.value||'';const end=box.querySelector('[data-k="end_time"]')?.value||'';const target=box.querySelector('[data-k="preferred_store_id"]')?.value||'';const note=box.querySelector('[data-k="note"]')?.value.trim()||'';const transfer=!!box.querySelector('[data-k="transfer"]')?.checked;const source=box.dataset.sourceStoreId||state.selectedStoreId;
   if(mins(end)<=mins(start)){info('Giờ kết thúc phải sau giờ bắt đầu.','error');return}
   if(String(target)!==String(source) && !transfer){info('Bạn đang đổi chi nhánh. Hãy tích “Chuyển chi nhánh” để gửi yêu cầu duyệt, không đổi trực tiếp.','error');return}
   save.disabled=true;
   if(transfer){
     if(!target||String(target)===String(source)){save.disabled=false;info('Hãy chọn một chi nhánh khác để chuyển.','error');return}
     const finalNote=note||`Chuyển chi nhánh ${box.dataset.sourceStoreCode||byCode(source)} → ${byCode(target)} để hỗ trợ thiếu nhân sự`;
     const q=await sb.rpc('create_store_transfer_request',{p_availability_id:id,p_target_store_id:target,p_start_time:start,p_end_time:end,p_note:finalNote});
     if(q.error){save.disabled=false;info('Gửi yêu cầu chuyển thất bại: '+(q.error.message||q.error.code||'UNKNOWN'),'error');return}
     info(`Đã gửi yêu cầu chuyển ${box.dataset.sourceStoreCode||byCode(source)} → ${byCode(target)}. Chờ ${byCode(target)} duyệt.`,'ok');
     box.innerHTML=`<div class="mwr2-view"><div><div class="mwr2-time">${esc(start)}–${esc(end)}</div><div class="mwr2-name">${esc(box.dataset.employeeName||'Nhân viên')}</div><div class="mwr2-meta">${esc(box.dataset.sourceStoreCode||byCode(source))} · PENDING TRANSFER → ${esc(byCode(target))}</div></div><div class="mwr2-side"><span class="mwrx-pending">CHỜ DUYỆT</span></div></div>`;
     await renderPending();return;
   }
   const q=await sb.rpc('manager_update_employee_availability',{p_availability_id:id,p_start_time:start,p_end_time:end,p_preferred_store_id:target||null,p_note:note||null});
   if(q.error){save.disabled=false;info('Lưu chỉnh sửa thất bại: '+(q.error.message||q.error.code||'UNKNOWN'),'error');return}
   info('Đã lưu chỉnh sửa ca đăng ký.','ok');save.disabled=false;await renderPending();
 },true);
 const addSelector=()=>{const p=document.querySelector(PANEL),a=p?.querySelector('.mwr2-actions');if(!a||a.querySelector('#mwrxStore'))return;if(!stores.length)return;const wrap=document.createElement('div');wrap.className='mwrx-filter';wrap.innerHTML='<label>Chi nhánh review</label><select id="mwrxStore"></select>';a.insertBefore(wrap,a.firstChild);const s=wrap.querySelector('select');s.innerHTML=stores.map(x=>`<option value="${esc(x.id)}">${esc(x.code)} · ${esc(x.name)}</option>`).join('');s.value=state.selectedStoreId;s.addEventListener('change',async()=>{state.selectedStoreId=s.value;await renderPending()})};
 const observer=new MutationObserver(()=>{addSelector();renderPending()});
 addSelector();renderPending();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();

(()=>{'use strict';
const U='https://menvbzlsncmpuvnaifxa.supabase.co',K='sb_publishable_HsvCS6HDZnCDInd9PUoh0g_V34wJVqx';
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const hm=v=>String(v||'').slice(0,5);
const mins=v=>{const s=hm(v);return Number(s.slice(0,2))*60+Number(s.slice(3,5))};
const timeOptions=selected=>{let out='';for(let m=300;m<=1320;m+=30){const v=`${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`;out+=`<option value="${v}"${v===hm(selected)?' selected':''}>${v}</option>`}return out};
const css=`<style id="manager-schedule-draft-editor-css">
.msd{margin-top:0}.msd-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}.msd-actions{display:flex;gap:7px;flex-wrap:wrap}.msd-summary{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}.msd-pill{font-size:11px;font-weight:800;padding:5px 8px;border-radius:999px;background:#eef5ff;color:#235dba}.msd-warning{background:#fff6d8;color:#876900}.msd-ok{background:#e8f5ed;color:#23754a}.msd-list{display:grid;gap:9px;margin-top:14px}.msd-row{display:grid;grid-template-columns:minmax(180px,1.5fr) 125px 125px 90px;gap:8px;align-items:end;padding:10px;border:1px solid var(--border);border-radius:12px;background:#fff}.msd-field{display:grid;gap:4px}.msd-field label{font-size:10px;font-weight:800;color:var(--muted)}.msd-input{height:38px;border:1px solid #ccd9e4;border-radius:8px;background:#fff;padding:0 8px;color:var(--text);min-width:0}.msd-meta{font-size:11px;color:var(--muted);margin-top:3px}.msd-add{margin-top:14px;padding:12px;border:1px dashed #cbd7e4;border-radius:12px;background:#f8fafd;display:grid;grid-template-columns:1fr auto;gap:8px;align-items:end}.msd-status{margin-top:12px;padding:10px 12px;border-radius:10px;background:#eef6ff;color:#235dba;font-size:12px;white-space:pre-wrap}.msd-status.error{background:#fbeaea;color:#9a3838}.msd-status.ok{background:#e8f5ed;color:#23754a}.msd-empty{padding:24px;text-align:center;color:var(--muted);border:1px dashed #d8e2eb;border-radius:11px;margin-top:12px}@media(max-width:900px){.msd-row{grid-template-columns:1fr 1fr}.msd-add{grid-template-columns:1fr}.msd-head{flex-direction:column}}
</style>`;
let sb=null,state={generationId:null,storeId:null,week:null,assignments:[],availability:[],robotResult:null,busy:false};
const panel=()=>document.querySelector('#panel-publish');
function client(){if(sb)return sb;if(!window.supabase?.createClient)throw new Error('SUPABASE_CLIENT_NOT_READY');sb=window.supabase.createClient(U,K,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});return sb}
function status(text,type=''){const e=panel()?.querySelector('#msdStatus');if(!e)return;e.className='msd-status'+(type?' '+type:'');e.textContent=text||''}
function activate(){const view=document.querySelector('#view-workforce');if(!view)return;view.querySelectorAll('.tabs button[data-tab]').forEach(b=>b.classList.toggle('active',b.dataset.tab==='publish'));view.querySelectorAll('.panel').forEach(p=>p.classList.toggle('active',p.id==='panel-publish'))}
const availTypeOk=r=>['AVAILABLE','PREFERRED'].includes(String(r.availability_type||'').toUpperCase());
const availCovers=(r,a)=>String(r.work_date).slice(0,10)===String(a.work_date).slice(0,10)&&mins(r.start_time)<=mins(a.start_time)&&mins(r.end_time)>=mins(a.end_time)&&availTypeOk(r);
function candidates(a){
 const map=new Map();
 for(const r of state.availability){if(!r.user_id||!availCovers(r,a))continue;if(!map.has(String(r.user_id)))map.set(String(r.user_id),r)}
 const current=state.assignments.find(x=>String(x.id||'')===String(a.id||''))||a;
 if(current.user_id&&!map.has(String(current.user_id)))map.set(String(current.user_id),{user_id:current.user_id,employee_name:current.full_name||current.username||'Nhân viên hiện tại',preferred_store_code:current.store_code||''});
 return [...map.values()];
}
function cleanAssignment(a){return{
 user_id:a.user_id,
 store_id:state.storeId,
 work_date:String(a.work_date).slice(0,10),
 start_time:hm(a.start_time),
 end_time:hm(a.end_time),
 skill_code:a.skill_code||null,
 skill_level:Number(a.skill_level||0),
 score:Number(a.score||0),
 warning:a.warning||null,
 status:'DRAFT',
 note:a.note||null
}}
async function loadDraft(){
 const c=client();
 const [aq,vq]=await Promise.all([
  c.rpc('get_schedule_generation_assignments',{p_generation_id:state.generationId}),
  c.rpc('get_manager_weekly_availability',{p_store_id:null,p_week_start:state.week})
 ]);
 if(aq.error)throw aq.error;if(vq.error)throw vq.error;
 state.assignments=(Array.isArray(aq.data)?aq.data:[]).map(x=>({...x,status:'DRAFT'}));
 state.availability=Array.isArray(vq.data)?vq.data:[];
}
function availabilityOptions(){
 return state.availability.filter(availTypeOk).map((r,i)=>`<option value="${i}">${esc(r.employee_name||r.username||r.user_id)} · ${esc(String(r.work_date).slice(0,10))} · ${esc(hm(r.start_time))}–${esc(hm(r.end_time))} · ${esc(r.preferred_store_code||'Chưa chọn CN')}</option>`).join('');
}
function render(){
 const p=panel();if(!p)return;
 if(!document.getElementById('manager-schedule-draft-editor-css'))document.head.insertAdjacentHTML('beforeend',css);
 activate();
 const shortages=Array.isArray(state.robotResult?.minimum_shortages)?state.robotResult.minimum_shortages:[];
 p.innerHTML=`<section class="card msd"><div class="msd-head"><div><h2 style="margin:0">Robot xếp lịch · Lịch nháp</h2><div class="muted" style="margin-top:5px">Generation ${esc(state.generationId||'—')} · tuần ${esc(state.week||'—')} · chỉ DRAFT mới được chỉnh</div></div><div class="msd-actions"><button class="btn" id="msdReload">Tải lại</button><button class="btn" id="msdValidate">Kiểm tra</button><button class="btn primary" id="msdSave">Lưu lịch nháp</button></div></div><div class="msd-summary"><span class="msd-pill">${state.assignments.length} phân bổ</span><span class="msd-pill ${shortages.length?'msd-warning':'msd-ok'}">${shortages.length} thiếu tối thiểu từ Robot</span><span class="msd-pill">Không tự Publish</span></div>${state.assignments.length?`<div class="msd-list">${state.assignments.map((a,i)=>{const cs=candidates(a);return `<div class="msd-row" data-msd-row="${i}"><div class="msd-field"><label>Nhân viên</label><select class="msd-input" data-f="user_id">${cs.map(r=>`<option value="${esc(r.user_id)}"${String(r.user_id)===String(a.user_id)?' selected':''}>${esc(r.employee_name||r.username||r.user_id)}${r.preferred_store_code?' · '+esc(r.preferred_store_code):''}</option>`).join('')}</select><div class="msd-meta">${esc(String(a.work_date).slice(0,10))} · ${esc(a.skill_code||'Tổng hợp')} · ${esc(a.warning||'')}</div></div><div class="msd-field"><label>Bắt đầu</label><select class="msd-input" data-f="start_time">${timeOptions(a.start_time)}</select></div><div class="msd-field"><label>Kết thúc</label><select class="msd-input" data-f="end_time">${timeOptions(a.end_time)}</select></div><button class="btn" data-remove="${i}" type="button">Bỏ</button></div>`}).join('')}</div>`:'<div class="msd-empty">Robot chưa tạo assignment. Có thể thêm từ đăng ký hợp lệ bên dưới.</div>'}<div class="msd-add"><div class="msd-field"><label>Thêm phân bổ từ đăng ký nhân viên</label><select class="msd-input" id="msdAddAvailability"><option value="">Chọn đăng ký…</option>${availabilityOptions()}</select></div><button class="btn" id="msdAdd" type="button">+ Thêm vào draft</button></div><div id="msdStatus" class="msd-status">Robot chỉ tạo DRAFT. Hãy review/chỉnh, lưu và kiểm tra trước bước REVIEWED/PUBLISH.</div></section>`;
 bind();
}
function syncRowsFromDom(){
 panel()?.querySelectorAll('[data-msd-row]').forEach(row=>{
  const i=Number(row.dataset.msdRow),a=state.assignments[i];if(!a)return;
  a.user_id=row.querySelector('[data-f="user_id"]')?.value||a.user_id;
  a.start_time=row.querySelector('[data-f="start_time"]')?.value||a.start_time;
  a.end_time=row.querySelector('[data-f="end_time"]')?.value||a.end_time;
 });
}
async function validate(){
 if(!state.generationId)return;
 status('Đang kiểm tra lịch nháp…');
 const q=await client().rpc('validate_schedule_generation_v1',{p_generation_id:state.generationId});
 if(q.error){status('Validation thất bại: '+(q.error.message||q.error.code||'UNKNOWN'),'error');return q}
 const violations=Array.isArray(q.data?.violations)?q.data.violations:[],warnings=Array.isArray(q.data?.warnings)?q.data.warnings:[];
 const lines=[q.data?.valid?'✓ Lịch nháp hợp lệ.':'✗ Lịch nháp chưa hợp lệ.',`${violations.length} lỗi · ${warnings.length} cảnh báo`];
 if(violations.length)lines.push(...violations.slice(0,8).map(x=>'• '+(x.code||JSON.stringify(x))));
 if(warnings.length)lines.push(...warnings.slice(0,5).map(x=>'⚠ '+(x.code||JSON.stringify(x))));
 status(lines.join('\n'),q.data?.valid?'ok':'error');return q
}
async function save(){
 if(state.busy||!state.generationId)return;syncRowsFromDom();
 for(const a of state.assignments){if(!a.user_id||mins(a.end_time)<=mins(a.start_time)){status('Có phân bổ thiếu nhân viên hoặc giờ kết thúc không sau giờ bắt đầu.','error');return}}
 state.busy=true;status('Đang lưu lịch nháp…');
 try{
  const payload=state.assignments.map(cleanAssignment);
  const q=await client().rpc('replace_schedule_generation_assignments',{p_generation_id:state.generationId,p_assignments:payload});
  if(q.error)throw q.error;
  status(`Đã lưu ${Number(q.data??payload.length)} phân bổ. Đang chạy validation…`,'ok');
  await loadDraft();render();await validate();
 }catch(e){status('Lưu lịch nháp thất bại: '+(e.message||e.code||e),'error')}
 finally{state.busy=false}
}
function addFromAvailability(){
 const sel=panel()?.querySelector('#msdAddAvailability');if(!sel?.value)return status('Hãy chọn một đăng ký để thêm.','error');
 const r=state.availability.filter(availTypeOk)[Number(sel.value)];if(!r)return status('Không tìm thấy đăng ký đã chọn.','error');
 state.assignments.push({id:null,generation_id:state.generationId,user_id:r.user_id,full_name:r.employee_name||r.username,store_id:state.storeId,store_code:r.preferred_store_code||'',work_date:String(r.work_date).slice(0,10),start_time:hm(r.start_time),end_time:hm(r.end_time),skill_code:null,skill_level:0,score:0,warning:null,status:'DRAFT',note:'MANUAL_FROM_AVAILABILITY'});
 render();status('Đã thêm vào bản nháp cục bộ. Bấm “Lưu lịch nháp” để ghi qua server RPC.')
}
function bind(){
 const p=panel();if(!p)return;
 p.querySelector('#msdReload')?.addEventListener('click',async()=>{try{await loadDraft();render()}catch(e){status('Không tải được draft: '+(e.message||e),'error')}});
 p.querySelector('#msdValidate')?.addEventListener('click',validate);
 p.querySelector('#msdSave')?.addEventListener('click',save);
 p.querySelector('#msdAdd')?.addEventListener('click',addFromAvailability);
 p.querySelectorAll('[data-remove]').forEach(b=>b.addEventListener('click',()=>{syncRowsFromDom();state.assignments.splice(Number(b.dataset.remove),1);render();status('Đã bỏ khỏi bản nháp cục bộ. Bấm “Lưu lịch nháp” để ghi thay đổi.')}))
}
async function robot(detail){
 const storeId=detail?.storeId,week=detail?.week;if(!storeId||!week)return;
 const p=panel();if(!p)return;
 activate();p.innerHTML='<section class="card"><h2>Robot xếp lịch</h2><div class="msd-status">Đang tạo lịch nháp…</div></section>';
 try{
  const q=await client().rpc('auto_generate_schedule_generation',{p_store_id:storeId,p_week_start:week,p_algorithm_version:'GREEDY_V1'});
  if(q.error)throw q.error;
  if(!q.data?.generation_id)throw new Error('ROBOT_GENERATION_ID_MISSING');
  state={...state,generationId:q.data.generation_id,storeId,week,robotResult:q.data};
  await loadDraft();render();
 }catch(e){if(panel())panel().innerHTML=`<section class="card"><h2>Robot xếp lịch</h2><div class="msd-status error">Không tạo được lịch nháp: ${esc(e.message||e.code||e)}</div></section>`}
}
document.addEventListener('magasin:schedule-robot-request',e=>robot(e.detail));
window.MAGASIN_MANAGER_SCHEDULE_DRAFT={robot,validate,save,getState:()=>({...state,assignments:state.assignments.map(x=>({...x}))})};
})();
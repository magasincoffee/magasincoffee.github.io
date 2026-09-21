(()=>{'use strict';
const U='https://menvbzlsncmpuvnaifxa.supabase.co',K='sb_publishable_HsvCS6HDZnCDInd9PUoh0g_V34wJVqx';
const DAYS=['T2','T3','T4','T5','T6','T7','CN'];
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const hm=v=>String(v||'').slice(0,5);
const mins=v=>{const s=hm(v);return Number(s.slice(0,2))*60+Number(s.slice(3,5))};
const toDate=s=>new Date(String(s).slice(0,10)+'T00:00:00Z');
const add=(s,n)=>{const d=toDate(s);d.setUTCDate(d.getUTCDate()+Number(n||0));return d.toISOString().slice(0,10)};
const monday=s=>{const d=toDate(s),day=d.getUTCDay()||7;d.setUTCDate(d.getUTCDate()-day+1);return d.toISOString().slice(0,10)};
function todayVN(){
 if(/^\d{4}-\d{2}-\d{2}$/.test(String(window.__MAGASIN_WORKFORCE_TODAY__||'')))return String(window.__MAGASIN_WORKFORCE_TODAY__);
 const parts={};for(const p of new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()))if(p.type!=='literal')parts[p.type]=p.value;
 return `${parts.year}-${parts.month}-${parts.day}`;
}
const targetWeek=()=>add(monday(todayVN()),7);
const timeOptions=selected=>{let out='';for(let m=300;m<=1320;m+=30){const v=`${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`;out+=`<option value="${v}"${v===hm(selected)?' selected':''}>${v}</option>`}return out};
const css=`<style id="manager-schedule-draft-editor-css">
.msd{margin-top:0}.msd-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}.msd-actions{display:flex;gap:7px;flex-wrap:wrap;align-items:center}.msd-summary{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}.msd-pill{font-size:11px;font-weight:800;padding:5px 8px;border-radius:999px;background:#eef5ff;color:#235dba}.msd-warning{background:#fff6d8;color:#876900}.msd-ok{background:#e8f5ed;color:#23754a}.msd-layout{display:grid;grid-template-columns:minmax(260px,.75fr) minmax(560px,2fr);gap:12px;margin-top:14px}.msd-source,.msd-board-wrap{border:1px solid var(--border);border-radius:13px;background:#fff;padding:12px}.msd-source-list{display:grid;gap:8px;margin-top:10px;max-height:620px;overflow:auto}.msd-source-row{padding:10px;border:1px solid #d8e5ef;border-radius:10px;background:#f8fcfd}.msd-source-time{font-weight:800;color:#0f4778}.msd-source-name{font-weight:800;margin-top:3px}.msd-source-meta{font-size:11px;color:var(--muted);margin-top:3px}.msd-source-row .btn{margin-top:8px;width:100%}.msd-board{display:grid;grid-template-columns:repeat(7,minmax(190px,1fr));gap:9px;overflow:auto}.msd-day{border:1px solid #dce5f0;border-radius:11px;min-height:230px;overflow:hidden}.msd-day-title{padding:9px;background:#f8fafd;border-bottom:1px solid #eef2f6;display:flex;justify-content:space-between}.msd-card{margin:8px;padding:9px;border:1px solid #cadce9;border-radius:9px;background:#fff}.msd-field{display:grid;gap:4px;margin-top:6px}.msd-field label{font-size:10px;font-weight:800;color:var(--muted)}.msd-input{height:35px;border:1px solid #ccd9e4;border-radius:8px;background:#fff;padding:0 7px;color:var(--text);min-width:0;width:100%}.msd-time-row{display:grid;grid-template-columns:1fr 1fr;gap:5px}.msd-meta{font-size:10px;color:var(--muted);margin-top:4px}.msd-empty{padding:20px 10px;text-align:center;color:var(--muted);font-size:12px}.msd-status{margin-top:12px;padding:10px 12px;border-radius:10px;background:#eef6ff;color:#235dba;font-size:12px;white-space:pre-wrap}.msd-status.error{background:#fbeaea;color:#9a3838}.msd-status.ok{background:#e8f5ed;color:#23754a}.msd-downstream{margin-top:12px;border-top:1px solid var(--border);padding-top:10px}.msd-downstream summary{cursor:pointer;font-weight:700;color:var(--muted)}@media(max-width:980px){.msd-head{flex-direction:column}.msd-layout{grid-template-columns:1fr}.msd-board{grid-template-columns:repeat(7,minmax(220px,1fr))}}
</style>`;

let sb=null,state={generationId:null,storeId:null,week:null,stores:[],assignments:[],availability:[],generationStatus:'NONE',generationOrigin:null,duplicateDrafts:0,busy:false};
const panel=()=>document.querySelector('#panel-publish');
function client(){if(sb)return sb;if(!window.supabase?.createClient)throw new Error('SUPABASE_CLIENT_NOT_READY');sb=window.supabase.createClient(U,K,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});return sb}
function status(text,type=''){const e=panel()?.querySelector('#msdStatus');if(!e)return;e.className='msd-status'+(type?' '+type:'');e.textContent=text||''}
function errorText(e){
 const raw=String(e?.message||e?.code||e||'UNKNOWN');
 const known=[
  ['GENERATION_VERSION_CONFLICT','Có nhiều lịch nháp đang tồn tại cho cùng cửa hàng/tuần. Hệ thống đã khóa thao tác để tránh ghi đè.'],
  ['GENERATION_ALREADY_REVIEWED','Tuần này đã có lịch ở trạng thái REVIEWED. Không tạo thêm lịch nháp mới.'],
  ['GENERATION_ALREADY_PUBLISHED','Tuần này đã được Publish. Không tạo thêm lịch cạnh tranh.'],
  ['COMPETING_GENERATION_EXISTS','Có lịch cạnh tranh cho cùng cửa hàng/tuần. Cần xử lý phiên bản trước khi tiếp tục.'],
  ['OFFICIAL_STORE_WEEK_ALREADY_EXISTS','Cửa hàng/tuần này đã có lịch chính thức; không được append lịch mới im lặng.'],
  ['ASSIGNMENT_OVERLAP','Một nhân viên đang bị xếp ca trùng giờ.'],
  ['MAX_TWO_ASSIGNMENTS_PER_EMPLOYEE_DAY','Một nhân viên vượt quá tối đa 2 ca trong ngày.'],
  ['EMPLOYEE_INACTIVE','Nhân viên không còn ACTIVE.'],
  ['EMPLOYEE_NOT_STAFF','Người được chọn không thuộc vai trò STAFF đủ điều kiện xếp ca.'],
  ['ASSIGNMENT_OUTSIDE_GENERATION_WEEK','Ca nằm ngoài tuần Monday→Sunday đang xếp.'],
  ['ASSIGNMENT_STORE_MISMATCH','Ca không thuộc cửa hàng của lịch nháp.'],
  ['STORE_NOT_ALLOWED','Tài khoản không có quyền trên cửa hàng này.'],
  ['STORE_NOT_ACTIVE','Cửa hàng không còn ACTIVE.'],
  ['AVAILABILITY_MISMATCH','Ca không nằm trọn trong availability AVAILABLE/PREFERRED của nhân viên.'],
  ['OFFICIAL_SCHEDULE_OVERLAP','Ca bị trùng với lịch PENDING/APPROVED hiện hữu.'],
  ['ASSIGNMENT_PAYLOAD_MALFORMED','Dữ liệu ca gửi lên server không hợp lệ.'],
  ['ASSIGNMENT_REQUIRED_FIELDS_MISSING','Dữ liệu ca còn thiếu trường bắt buộc.'],
  ['ASSIGNMENT_EMPLOYEE_NOT_FOUND','Không tìm thấy nhân viên hợp lệ.'],
  ['GENERATION_NOT_DRAFT','Lịch không còn ở DRAFT nên không thể sửa.'],
  ['GENERATION_MUST_BE_REVIEWED','Lịch phải ở REVIEWED trước khi Publish.'],
  ['GENERATION_VALIDATION_FAILED','Lịch chưa đạt validation nên chưa thể duyệt.']
 ];
 const hit=known.find(([code])=>raw.includes(code));
 return hit?hit[1]+' ('+hit[0]+')':raw;
}
function activate(){const view=document.querySelector('#view-workforce');if(!view)return;view.querySelectorAll('.tabs button[data-tab]').forEach(b=>b.classList.toggle('active',b.dataset.tab==='publish'));view.querySelectorAll('.panel').forEach(p=>p.classList.toggle('active',p.id==='panel-publish'))}
const availTypeOk=r=>['AVAILABLE','PREFERRED'].includes(String(r.availability_type||'').toUpperCase());
const availCovers=(r,a)=>String(r.work_date).slice(0,10)===String(a.work_date).slice(0,10)&&mins(r.start_time)<=mins(a.start_time)&&mins(r.end_time)>=mins(a.end_time)&&availTypeOk(r);
function candidates(a){
 const map=new Map();
 for(const r of state.availability){if(!r.user_id||!availCovers(r,a))continue;if(!map.has(String(r.user_id)))map.set(String(r.user_id),r)}
 const current=state.assignments.find(x=>String(x.id||'')===String(a.id||''))||a;
 if(current.user_id&&!map.has(String(current.user_id)))map.set(String(current.user_id),{user_id:current.user_id,employee_name:current.employee_name||current.full_name||current.username||'Nhân viên hiện tại',preferred_store_code:current.store_code||''});
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
 note:a.note||'MANAGER_DIRECT_FROM_AVAILABILITY'
}}
function selectedStore(){return state.stores.find(s=>String(s.id)===String(state.storeId||''))||null}
async function loadStores(){
 const q=await client().rpc('get_manager_accessible_stores');
 if(q.error)throw q.error;
 state.stores=(Array.isArray(q.data)?q.data:[]).filter(s=>s?.id&&String(s.status||'ACTIVE').toUpperCase()==='ACTIVE');
 if(!state.storeId&&state.stores.length)state.storeId=state.stores[0].id;
 if(state.storeId&&!state.stores.some(s=>String(s.id)===String(state.storeId)))state.storeId=state.stores[0]?.id||null;
}
async function loadAvailability(){
 if(!state.week)state.week=targetWeek();
 if(!state.storeId){state.availability=[];return}
 const q=await client().rpc('get_manager_weekly_availability',{p_store_id:state.storeId,p_week_start:state.week});
 if(q.error)throw q.error;
 state.availability=(Array.isArray(q.data)?q.data:[]).filter(availTypeOk);
}
async function listDrafts(){
 if(!state.storeId||!state.week)return [];
 const q=await client().rpc('list_schedule_generations',{p_store_id:state.storeId,p_week_start:state.week});
 if(q.error)throw q.error;
 return (Array.isArray(q.data)?q.data:[]).filter(r=>String(r.status||'').toUpperCase()==='DRAFT');
}
async function loadDraftAssignments(){
 if(!state.generationId){state.assignments=[];return}
 const q=await client().rpc('get_schedule_generation_assignments',{p_generation_id:state.generationId});
 if(q.error)throw q.error;
 state.assignments=(Array.isArray(q.data)?q.data:[]).map(x=>({...x,status:'DRAFT'}));
}
async function resumeOnly(){
 if(state.busy)return;
 state.busy=true;
 try{
  await loadAvailability();
  const drafts=await listDrafts();
  state.duplicateDrafts=Math.max(0,drafts.length-1);
  if(drafts.length>1){
   state.generationId=null;state.generationStatus='CONFLICT';state.generationOrigin=null;state.assignments=[];
   render();status('Có '+drafts.length+' DRAFT cùng store/week. Hệ thống fail-closed; không tự chọn hoặc ghi đè bản nào.','error');return;
  }
  if(drafts.length===1){
   const d=drafts[0];state.generationId=d.id;state.generationStatus='DRAFT';state.generationOrigin=d.algorithm_version||'UNKNOWN';
   await loadDraftAssignments();
  }else{
   state.generationId=null;state.generationStatus='NONE';state.generationOrigin=null;state.assignments=[];
  }
  render();
 }catch(e){render();status('Không tải được bảng xếp lịch: '+errorText(e),'error')}
 finally{state.busy=false}
}
async function startOrResume(){
 if(state.busy||!state.storeId||!state.week)return;
 state.busy=true;status('Đang tạo/resume lịch nháp qua server gate…');
 try{
  const q=await client().rpc('create_schedule_generation',{p_store_id:state.storeId,p_week_start:state.week,p_algorithm_version:'MANAGER_DIRECT_V1'});
  if(q.error)throw q.error;
  if(!q.data)throw new Error('DIRECT_DRAFT_ID_MISSING');
  state.generationId=q.data;state.generationStatus='DRAFT';state.duplicateDrafts=0;
  const listed=await client().rpc('list_schedule_generations',{p_store_id:state.storeId,p_week_start:state.week});
  if(listed.error)throw listed.error;
  const run=(Array.isArray(listed.data)?listed.data:[]).find(x=>String(x.id)===String(state.generationId));
  state.generationOrigin=run?.algorithm_version||'MANAGER_DIRECT_V1';
  await Promise.all([loadAvailability(),loadDraftAssignments()]);
  render();status('Server đã tạo hoặc resume đúng một DRAFT canonical.','ok');
 }catch(e){
  state.generationId=null;state.generationStatus='CONFLICT';state.assignments=[];
  render();status('Không thể tạo/resume lịch nháp: '+errorText(e),'error');
 } finally{state.busy=false}
}
function sourceHtml(){
 if(!state.availability.length)return '<div class="msd-empty">Không có availability cho cửa hàng/tuần này.</div>';
 return '<div class="msd-source-list">'+state.availability.map((r,i)=>`<div class="msd-source-row"><div class="msd-source-time">${esc(String(r.work_date).slice(0,10))} · ${esc(hm(r.start_time))}–${esc(hm(r.end_time))}</div><div class="msd-source-name">${esc(r.employee_name||r.username||r.user_id)}</div><div class="msd-source-meta">${esc(r.preferred_store_code||'Không ưu tiên cửa hàng')} · ${esc(r.availability_type||'AVAILABLE')}</div><button class="btn" type="button" data-add-av="${i}"${state.generationId&&state.generationStatus==='DRAFT'?'':' disabled'}>+ Thêm vào lịch nháp</button></div>`).join('')+'</div>';
}
function boardHtml(){
 const days=Array.from({length:7},(_,i)=>add(state.week,i)),map=Object.fromEntries(days.map(d=>[d,[]]));
 state.assignments.forEach((a,i)=>{const k=String(a.work_date).slice(0,10);if(map[k])map[k].push({a,i})});
 return `<div class="msd-board">${days.map((day,di)=>`<div class="msd-day"><div class="msd-day-title"><b>${DAYS[di]}</b><span>${day.slice(8,10)}/${day.slice(5,7)}</span></div>${map[day].length?map[day].map(({a,i})=>{const cs=candidates(a);return `<div class="msd-card" data-msd-row="${i}"><div class="msd-field"><label>Nhân viên</label><select class="msd-input" data-f="user_id">${cs.map(r=>`<option value="${esc(r.user_id)}"${String(r.user_id)===String(a.user_id)?' selected':''}>${esc(r.employee_name||r.username||r.user_id)}</option>`).join('')}</select></div><div class="msd-time-row"><div class="msd-field"><label>Bắt đầu</label><select class="msd-input" data-f="start_time">${timeOptions(a.start_time)}</select></div><div class="msd-field"><label>Kết thúc</label><select class="msd-input" data-f="end_time">${timeOptions(a.end_time)}</select></div></div><div class="msd-meta">${esc(a.note||'MANAGER_DIRECT')}</div><button class="btn" data-remove="${i}" type="button" style="margin-top:7px;width:100%">Bỏ</button></div>`}).join(''):'<div class="msd-empty">Chưa có assignment</div>'}</div>`).join('')}</div>`;
}
function render(){
 const p=panel();if(!p)return;
 if(!document.getElementById('manager-schedule-draft-editor-css'))document.head.insertAdjacentHTML('beforeend',css);
 activate();
 const store=selectedStore(),stage=String(state.generationStatus||'NONE').toUpperCase();
 p.innerHTML=`<section class="card msd"><div class="msd-head"><div><h2 style="margin:0">Xếp lịch tuần · Manager Direct</h2><div class="muted" style="margin-top:5px">Availability → lịch nháp · không cần staffing demand hoặc Robot để bắt đầu.</div></div><div class="msd-actions"><select class="btn" id="msdStore">${state.stores.map(s=>`<option value="${esc(s.id)}"${String(s.id)===String(state.storeId)?' selected':''}>${esc(s.code)} · ${esc(s.name)}</option>`).join('')}</select><button class="btn" data-msd-week="prev">←</button><button class="btn" data-msd-week="target">Tuần sau</button><button class="btn" data-msd-week="next">→</button><span class="badge blue">${esc(state.week||'—')}</span><button class="btn" id="msdStart">${state.generationId?'Mở lại draft':'Tạo lịch nháp'}</button><button class="btn" id="msdReload">Tải lại</button><button class="btn primary" id="msdSave"${stage==='DRAFT'?'':' disabled'}>Lưu draft</button></div></div><div class="msd-summary"><span class="msd-pill">${esc(store?.code||'—')}</span><span class="msd-pill">${state.availability.length} availability</span><span class="msd-pill">${state.assignments.length} assignment</span><span class="msd-pill ${stage==='DRAFT'?'msd-ok':''}">${esc(stage)}</span><span class="msd-pill">Manager direct</span>${state.duplicateDrafts?`<span class="msd-pill msd-warning">Có ${state.duplicateDrafts+1} DRAFT cùng store/week · đang resume bản mới nhất</span>`:''}</div><div class="msd-layout"><div class="msd-source"><b>Employee Availability</b><div class="muted" style="margin-top:4px">Nguồn đăng ký của nhân viên · bấm Thêm để tạo assignment trong draft.</div>${sourceHtml()}</div><div class="msd-board-wrap"><b>Monday → Sunday Schedule Board</b><div class="muted" style="margin:4px 0 10px">Generation ${esc(state.generationId||'chưa tạo')} · origin ${esc(state.generationOrigin||'—')}</div>${boardHtml()}</div></div><details class="msd-downstream"><summary>Review / Publish hiện hữu — downstream, không phải prerequisite để tạo/lưu draft</summary><div class="msd-actions" style="margin-top:9px"><button class="btn" id="msdValidate"${state.generationId?'':' disabled'}>Kiểm tra hiện tại</button><button class="btn" id="msdReview"${stage==='DRAFT'?'':' disabled'}>Duyệt lịch</button><button class="btn" id="msdPublish"${stage==='REVIEWED'?'':' disabled'}>Publish lịch</button></div></details><div id="msdStatus" class="msd-status">${state.generationId?'Draft đã sẵn sàng chỉnh sửa.':'Chọn cửa hàng/tuần rồi tạo hoặc resume lịch nháp.'}</div></section>`;
 bind();
}
function syncRowsFromDom(){
 panel()?.querySelectorAll('[data-msd-row]').forEach(row=>{const i=Number(row.dataset.msdRow),a=state.assignments[i];if(!a)return;a.user_id=row.querySelector('[data-f="user_id"]')?.value||a.user_id;a.start_time=row.querySelector('[data-f="start_time"]')?.value||a.start_time;a.end_time=row.querySelector('[data-f="end_time"]')?.value||a.end_time});
}
function addFromAvailability(index){
 if(!state.generationId||state.generationStatus!=='DRAFT')return status('Hãy tạo/mở lịch nháp trước.','error');
 const r=state.availability[Number(index)];if(!r)return status('Không tìm thấy availability đã chọn.','error');
 const candidate={id:null,generation_id:state.generationId,user_id:r.user_id,employee_name:r.employee_name||r.username,store_id:state.storeId,store_code:r.preferred_store_code||selectedStore()?.code||'',work_date:String(r.work_date).slice(0,10),start_time:hm(r.start_time),end_time:hm(r.end_time),skill_code:null,skill_level:0,score:0,warning:null,status:'DRAFT',note:'MANAGER_DIRECT_FROM_AVAILABILITY'};
 const duplicate=state.assignments.some(a=>String(a.user_id)===String(candidate.user_id)&&String(a.work_date).slice(0,10)===candidate.work_date&&hm(a.start_time)===candidate.start_time&&hm(a.end_time)===candidate.end_time);
 if(duplicate)return status('Assignment này đã có trong draft.','error');
 state.assignments.push(candidate);render();status('Đã thêm vào draft cục bộ. Bấm “Lưu draft” để ghi qua server RPC.');
}
async function save(){
 if(state.busy||!state.generationId||state.generationStatus!=='DRAFT')return;
 syncRowsFromDom();
 for(const a of state.assignments){if(!a.user_id||mins(a.end_time)<=mins(a.start_time)){status('Có assignment thiếu nhân viên hoặc giờ kết thúc không sau giờ bắt đầu.','error');return}}
 state.busy=true;status('Đang lưu lịch nháp…');
 try{
  const payload=state.assignments.map(cleanAssignment);
  const q=await client().rpc('replace_schedule_generation_assignments',{p_generation_id:state.generationId,p_assignments:payload});
  if(q.error)throw q.error;
  await loadDraftAssignments();render();status(`Đã lưu ${Number(q.data??payload.length)} assignment. Không auto-review, không auto-publish.`,'ok');
 }catch(e){status('Lưu draft thất bại: '+(e.message||e.code||e),'error')}
 finally{state.busy=false}
}
async function validate(){
 if(!state.generationId)return;
 status('Đang chạy validation hiện hữu…');
 const q=await client().rpc('validate_schedule_generation_v1',{p_generation_id:state.generationId});
 if(q.error){status('Validation thất bại: '+(q.error.message||q.error.code||'UNKNOWN'),'error');return q}
 const violations=Array.isArray(q.data?.violations)?q.data.violations:[],warnings=Array.isArray(q.data?.warnings)?q.data.warnings:[];
 status(`${q.data?.valid?'✓':'✗'} validation hiện hữu · ${violations.length} lỗi · ${warnings.length} cảnh báo`,q.data?.valid?'ok':'error');return q
}
async function review(){
 if(state.busy||!state.generationId||state.generationStatus!=='DRAFT')return;
 state.busy=true;status('Đang duyệt lịch qua RPC hiện hữu…');
 try{const q=await client().rpc('review_schedule_generation',{p_generation_id:state.generationId,p_decision:'APPROVED'});if(q.error)throw q.error;state.generationStatus=q.data?.status||'REVIEWED';render();status('Đã chuyển sang REVIEWED.','ok')}catch(e){status('Duyệt lịch thất bại: '+(e.message||e.code||e),'error')}finally{state.busy=false}
}
async function publish(){
 if(state.busy||!state.generationId||state.generationStatus!=='REVIEWED')return;
 if(!confirm('Phát hành lịch REVIEWED thành lịch chính thức APPROVED?'))return;
 state.busy=true;status('Đang phát hành lịch chính thức…');
 try{const q=await client().rpc('publish_schedule_generation',{p_generation_id:state.generationId});if(q.error)throw q.error;if(!q.data?.published)throw new Error(q.data?.error_code||'PUBLISH_NOT_COMPLETED');state.generationStatus='PUBLISHED';const detail={generationId:state.generationId,storeId:state.storeId,weekStart:state.week,insertedScheduleCount:Number(q.data.inserted_schedule_count||0)};document.dispatchEvent(new CustomEvent('magasin:schedule-published',{detail}));render();status('Đã phát hành '+detail.insertedScheduleCount+' ca chính thức.','ok')}catch(e){status('Publish thất bại: '+(e.message||e.code||e),'error')}finally{state.busy=false}
}
function bind(){
 const p=panel();if(!p)return;
 p.querySelector('#msdStore')?.addEventListener('change',async e=>{state.storeId=e.target.value||null;state.generationId=null;state.generationStatus='NONE';state.assignments=[];await resumeOnly()});
 p.querySelectorAll('[data-msd-week]').forEach(b=>b.addEventListener('click',async()=>{const a=b.dataset.msdWeek;state.week=a==='prev'?add(state.week,-7):a==='next'?add(state.week,7):targetWeek();state.generationId=null;state.generationStatus='NONE';state.assignments=[];await resumeOnly()}));
 p.querySelector('#msdStart')?.addEventListener('click',startOrResume);
 p.querySelector('#msdReload')?.addEventListener('click',resumeOnly);
 p.querySelector('#msdSave')?.addEventListener('click',save);
 p.querySelector('#msdValidate')?.addEventListener('click',validate);
 p.querySelector('#msdReview')?.addEventListener('click',review);
 p.querySelector('#msdPublish')?.addEventListener('click',publish);
 p.querySelectorAll('[data-add-av]').forEach(b=>b.addEventListener('click',()=>addFromAvailability(b.dataset.addAv)));
 p.querySelectorAll('[data-remove]').forEach(b=>b.addEventListener('click',()=>{syncRowsFromDom();state.assignments.splice(Number(b.dataset.remove),1);render();status('Đã bỏ assignment khỏi draft cục bộ. Bấm “Lưu draft” để ghi thay đổi.')}))
}
async function openDirect(detail={}){
 activate();
 if(detail.storeId)state.storeId=detail.storeId;
 if(detail.week)state.week=detail.week;
 await loadStores();
 if(!state.week)state.week=targetWeek();
 await resumeOnly();
}
async function boot(){
 let tries=0;while(!panel()&&tries++<60)await new Promise(r=>setTimeout(r,150));if(!panel())return;
 try{await loadStores();state.week=targetWeek();await resumeOnly()}catch(e){render();status('Không khởi tạo được bảng xếp lịch: '+(e.message||e.code||e),'error')}
}
document.addEventListener('magasin:manager-schedule-open',e=>openDirect(e.detail));
window.MAGASIN_MANAGER_SCHEDULE_DRAFT={openDirect,startOrResume,refresh:resumeOnly,validate,save,review,publish,getState:()=>({...state,stores:state.stores.map(x=>({...x})),assignments:state.assignments.map(x=>({...x})),availability:state.availability.map(x=>({...x}))})};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
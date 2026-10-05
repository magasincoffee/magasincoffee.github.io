(()=>{'use strict';
const U='https://menvbzlsncmpuvnaifxa.supabase.co',K='sb_publishable_HsvCS6HDZnCDInd9PUoh0g_V34wJVqx';
const DAYS=['T2','T3','T4','T5','T6','T7','CN'];
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const hm=v=>String(v||'').slice(0,5);
const mins=v=>{const s=hm(v);return Number(s.slice(0,2))*60+Number(s.slice(3,5))};
const shiftBand=v=>window.MAGASIN_CORE?.time?.shiftKind?.(v)||'neutral';
const bandClass=v=>'msd-band-'+shiftBand(v);
function applyBandClass(el,value){
 if(!el)return;
 el.classList.remove('msd-band-morning','msd-band-afternoon','msd-band-evening','msd-band-neutral');
 el.classList.add(bandClass(value));
}
const toDate=s=>new Date(String(s).slice(0,10)+'T00:00:00Z');
const add=(s,n)=>{const d=toDate(s);d.setUTCDate(d.getUTCDate()+Number(n||0));return d.toISOString().slice(0,10)};
const monday=s=>{const d=toDate(s),day=d.getUTCDay()||7;d.setUTCDate(d.getUTCDate()-day+1);return d.toISOString().slice(0,10)};
function todayVN(){
 if(/^\d{4}-\d{2}-\d{2}$/.test(String(window.__MAGASIN_WORKFORCE_TODAY__||'')))return String(window.__MAGASIN_WORKFORCE_TODAY__);
 const parts={};for(const p of new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()))if(p.type!=='literal')parts[p.type]=p.value;
 return `${parts.year}-${parts.month}-${parts.day}`;
}
const targetWeek=()=>add(monday(todayVN()),7);
const actorRole=()=>String(window.__MAGASIN_SCHEDULING_ACTOR__||'MANAGER').toUpperCase();
const actorCopy=()=>actorRole()==='OWNER'
 ? {title:'Giám sát xếp lịch',subtitle:'Chủ hệ thống theo dõi theo cửa hàng đã chọn; mọi thay đổi vẫn đi qua cùng quy trình xếp lịch.',source:'Thời gian có thể làm là dữ liệu đầu vào; không tạo lịch song song.'}
 : {title:'Xếp lịch theo cửa hàng',subtitle:'Chọn một cửa hàng để xem toàn bộ tuần, chỉnh bản nháp rồi Kiểm tra → Duyệt → Phát hành.',source:'Thời gian có thể làm là lúc nhân viên có thể nhận ca; ưu tiên cửa hàng do Quản lý thiết lập trong hồ sơ nhân viên.'};
const timeOptions=selected=>{let out='';for(let m=300;m<=1320;m+=30){const v=`${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`;out+=`<option value="${v}"${v===hm(selected)?' selected':''}>${v}</option>`}return out};
const css=`<style id="manager-schedule-draft-editor-css">
.msd{margin-top:0;min-width:0;max-width:100%;overflow:hidden}.msd-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}.msd-actions{display:flex;gap:7px;flex-wrap:wrap;align-items:center}.msd-summary{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}.msd-pill{font-size:11px;font-weight:800;padding:5px 8px;border-radius:999px;background:#eef5ff;color:#235dba}.msd-warning{background:#fff6d8;color:#876900}.msd-ok{background:#e8f5ed;color:#23754a}.msd-layout{display:grid;grid-template-columns:minmax(260px,.75fr) minmax(0,2fr);gap:12px;margin-top:14px;min-width:0;max-width:100%}.msd-source,.msd-board-wrap{border:1px solid var(--border);border-radius:13px;background:#fff;padding:12px;min-width:0;max-width:100%}.msd-board-wrap{overflow-x:auto;overflow-y:hidden;overscroll-behavior-x:contain}.msd-source-list{display:grid;gap:8px;margin-top:10px;max-height:620px;overflow:auto}.msd-source-row{padding:10px;border:1px solid #d8e5ef;border-radius:10px;background:#f8fcfd}.msd-source-time{font-weight:800;color:#0f4778}.msd-source-name{font-weight:800;margin-top:3px}.msd-source-meta{font-size:11px;color:var(--muted);margin-top:3px}.msd-source-row .btn{margin-top:8px;width:100%}.msd-pool{display:grid;gap:10px;margin-top:10px}.msd-pool-group{border:1px solid #dce5f0;border-radius:11px;background:#fbfcfe;padding:10px}.msd-pool-group>h3{font-size:12px;margin:0;color:#344054}.msd-pool-help{font-size:10px;color:var(--muted);margin-top:3px}.msd-pool-list{display:grid;gap:7px;margin-top:8px}.msd-pool-row{padding:9px;border:1px solid #d8e5ef;border-radius:9px;background:#fff}.msd-pool-row.blocked{background:#f7f7f8;color:#667085}.msd-pool-row .btn{width:100%;margin-top:7px}.msd-pool-tags{display:flex;gap:5px;flex-wrap:wrap;margin-top:5px}.msd-pool-tag{display:inline-flex;padding:3px 6px;border-radius:999px;background:#eef5ff;color:#235dba;font-size:9px;font-weight:900}.msd-pool-tag.manual{background:#fff2cc;color:#7a5300}.msd-pool-tag.blocked{background:#fbeaea;color:#9a3838}.msd-manual-picker{padding:10px;border:1px solid #c7d7eb;border-radius:10px;background:#f8fbff}.msd-manual-grid{display:grid;grid-template-columns:1.4fr 1fr 1fr 1fr;gap:6px;margin-top:8px}.msd-manual-picker .btn{margin-top:8px;width:100%}.msd-source-separator{margin:12px 0 6px;font-size:11px;font-weight:900;color:var(--muted);text-transform:uppercase}.msd-override{display:inline-block;padding:3px 6px;border-radius:999px;background:#fff2cc;color:#7a5300;font-weight:800}@media(max-width:700px){.msd-manual-grid{grid-template-columns:1fr 1fr}}.msd-board{display:grid;grid-template-columns:repeat(7,minmax(190px,1fr));gap:9px;min-width:1386px;width:max-content}.msd-day{border:1px solid #dce5f0;border-radius:11px;min-height:230px;overflow:hidden}.msd-day-title{padding:9px;background:#f8fafd;border-bottom:1px solid #eef2f6;display:flex;justify-content:space-between}.msd-card{margin:8px;padding:9px;border:1px solid #cadce9;border-radius:9px;background:#fff}.msd-shortage-card{margin:8px;padding:10px;border:2px solid #8b5cf6;border-radius:10px;background:#f3efff;color:#4c1d95}.msd-shortage-head{display:flex;align-items:center;gap:6px;font-weight:900}.msd-shortage-icon{display:inline-grid;place-items:center;width:20px;height:20px;border-radius:999px;background:#6d28d9;color:#fff;font-size:12px}.msd-shortage-time{margin-top:5px;font-size:13px;font-weight:900}.msd-shortage-meta{margin-top:3px;font-size:10px;color:#5b21b6}.msd-shortage-card .btn{margin-top:8px;width:100%;border-color:#7c3aed;color:#5b21b6;background:#fff}.msd-source-target{margin:0 0 10px;padding:9px 10px;border:2px solid #8b5cf6;border-radius:10px;background:#f7f3ff;color:#4c1d95;font-size:11px}.msd-source-target .btn{margin-top:7px}.msd-band-morning{background:var(--m-shift-morning-bg,#FFF4CC)!important;border-color:var(--m-shift-morning-border,#E7B84B)!important}.msd-band-afternoon{background:var(--m-shift-afternoon-bg,#FDE7E7)!important;border-color:var(--m-shift-afternoon-border,#E39C9C)!important}.msd-band-evening{background:var(--m-shift-evening-bg,#E8F3FF)!important;border-color:var(--m-shift-evening-border,#9EC7F1)!important}.msd-band-neutral{background:#fff!important}.msd-field{display:grid;gap:4px;margin-top:6px}.msd-field label{font-size:10px;font-weight:800;color:var(--muted)}.msd-input{height:35px;border:1px solid #ccd9e4;border-radius:8px;background:#fff;padding:0 7px;color:var(--text);min-width:0;width:100%}.msd-time-row{display:grid;grid-template-columns:1fr 1fr;gap:5px}.msd-meta{font-size:10px;color:var(--muted);margin-top:4px}.msd-empty{padding:20px 10px;text-align:center;color:var(--muted);font-size:12px}.msd-status{margin-top:12px;padding:10px 12px;border-radius:10px;background:#eef6ff;color:#235dba;font-size:12px;white-space:pre-wrap}.msd-status.error{background:#fbeaea;color:#9a3838}.msd-status.ok{background:#e8f5ed;color:#23754a}.msd-official-grid{display:grid;gap:8px;margin-top:10px}.msd-official-row{display:flex;justify-content:space-between;gap:12px;align-items:center;padding:9px 10px;border:1px solid #d7e6dc;border-radius:10px;background:#fff}.msd-official-name{font-weight:800}.msd-official-meta{font-size:11px;color:var(--muted);margin-top:3px}.msd-downstream{margin-top:12px;border-top:1px solid var(--border);padding-top:10px}.msd-downstream summary{cursor:pointer;font-weight:700;color:var(--muted)}@media(max-width:980px){.msd-head{flex-direction:column;min-width:0}.msd-head .msd-actions{max-width:100%}.msd-layout{grid-template-columns:minmax(0,1fr);width:100%}.msd-source{min-width:0}.msd-board-wrap{width:100%}.msd-board{grid-template-columns:repeat(7,minmax(220px,1fr));min-width:1594px}}

.msd-branches{display:grid;gap:10px;margin-top:12px}
.msd-branch{border:1px solid #dfe5ec;border-radius:13px;background:#fff;overflow:hidden}
.msd-branch.open{border-color:#a9c8e7;box-shadow:0 1px 3px rgba(16,24,40,.06)}
.msd-branch-toggle{width:100%;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 14px;border:0;background:#f8fafc;color:#101828;text-align:left;cursor:pointer}
.msd-branch.open .msd-branch-toggle{background:#f2f8ff;border-bottom:1px solid #d8e5f4}
.msd-branch-identity{display:grid;gap:3px;min-width:0}
.msd-branch-identity b{font-size:14px;line-height:20px}
.msd-branch-identity span{font-size:11px;line-height:17px;color:#667085}
.msd-branch-chip{flex:0 0 auto;padding:5px 8px;border-radius:999px;background:#eef5ff;color:#235dba;font-size:10px;font-weight:900}
.msd-branch-panel{padding:12px}
.msd-branch-actions{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-top:10px;padding:10px;border:1px solid #dfe5ec;border-radius:11px;background:#fbfcfe}
.msd-branch-actions .btn{min-height:40px}
.msd-global-summary{margin-top:10px}
.msd-global-overview{margin-top:12px;border:1px solid #dfe5ec;border-radius:13px;background:#fff;overflow:hidden}
.msd-global-overview>summary{cursor:pointer;list-style:none;padding:12px 14px;font-weight:800;color:#344054;background:#fbfcfe}
.msd-global-overview>summary::-webkit-details-marker{display:none}
.msd-global-overview>summary::after{content:'▾';float:right;color:#667085}
.msd-global-overview[open]>summary::after{content:'▴'}
.msd-global-overview #xstoreMasterMount{padding:0 12px 12px}
.msd-dirty-note{background:#fff1c6!important;color:#795700!important}
.msd-single-store{display:grid;gap:10px;margin-top:10px;min-width:0}
.msd-store-switcher{display:flex;gap:6px;align-items:center;overflow-x:auto;padding:2px 0 4px;scrollbar-width:thin}
.msd-store-switch{flex:0 0 auto;min-height:38px;padding:0 13px;border:1px solid #d0d5dd;border-radius:999px;background:#fff;color:#344054;font-weight:800;cursor:pointer}
.msd-store-switch[aria-pressed="true"]{border-color:#84adff;background:#eff6ff;color:#175cd3;box-shadow:0 0 0 2px rgba(47,111,222,.08)}
.msd-workspace{border:1px solid #dfe5ec;border-radius:14px;background:#fff;min-width:0;overflow:hidden}
.msd-workspace-toolbar{position:sticky;top:0;z-index:5;display:flex;justify-content:space-between;gap:12px;align-items:center;padding:10px 12px;border-bottom:1px solid #e4e7ec;background:rgba(255,255,255,.97);backdrop-filter:blur(6px)}
.msd-workspace-title{display:grid;gap:2px;min-width:0}.msd-workspace-title b{font-size:15px}.msd-workspace-title span{font-size:11px;color:#667085}
.msd-workspace-state{flex:0 0 auto;padding:5px 8px;border-radius:999px;background:#eef5ff;color:#235dba;font-size:10px;font-weight:900}
.msd-workspace-body{padding:10px;min-width:0}
.msd-workspace .msd-summary{margin:0 0 8px}
.msd-calendar-primary{min-width:0}
.msd-calendar-primary .msd-board-wrap{max-height:calc(100vh - 330px);min-height:360px;overflow:auto;overscroll-behavior:contain;border-width:1px}
.msd-calendar-primary .msd-board{grid-template-columns:repeat(7,minmax(0,1fr));min-width:0;width:100%;align-items:start}
.msd-calendar-primary .msd-day-title{position:sticky;top:0;z-index:2}
.msd-people-secondary{margin-top:10px;border:1px solid #dfe5ec;border-radius:12px;background:#fbfcfe;overflow:hidden}
.msd-people-secondary>summary{cursor:pointer;padding:10px 12px;font-size:12px;font-weight:800;color:#475467;list-style:none}
.msd-people-secondary>summary::-webkit-details-marker{display:none}.msd-people-secondary>summary::after{content:'▾';float:right}.msd-people-secondary[open]>summary::after{content:'▴'}
.msd-people-secondary .msd-source{border:0;border-top:1px solid #e4e7ec;border-radius:0;background:#fff}
.msd-workspace-actions{display:flex;gap:7px;flex-wrap:wrap;align-items:center;margin-bottom:8px}
.msd-workspace-actions .btn{min-height:38px}
.msd-downstream{margin-top:10px}
@media(max-width:1100px){.msd-calendar-primary .msd-board{grid-template-columns:repeat(7,minmax(150px,1fr));min-width:1080px;width:max-content}.msd-calendar-primary .msd-board-wrap{overflow:auto}}
@media(max-width:700px){.msd-workspace-toolbar{align-items:flex-start}.msd-workspace-body{padding:8px}.msd-calendar-primary .msd-board-wrap{max-height:62vh;min-height:420px}.msd-store-switch{min-height:42px}.msd-workspace-actions{display:grid;grid-template-columns:1fr 1fr}.msd-workspace-actions .btn{width:100%;min-height:44px}}
@media(max-width:600px){.msd-branch-toggle{align-items:flex-start}.msd-branch-panel{padding:10px}.msd-branch-actions{display:grid;grid-template-columns:1fr}.msd-branch-actions .btn{width:100%}}

</style>`;

let sb=null,state={generationId:null,storeId:null,week:null,stores:[],assignments:[],availability:[],eligibleEmployees:[],weeklyPlan:[],requirements:[],shortages:[],shortageSource:'NONE',supplementTarget:null,officialRows:[],generationStatus:'NONE',generationOrigin:null,duplicateDrafts:0,lastValidation:null,busy:false,dirty:false};
const panel=()=>document.querySelector('#panel-publish');
function client(){const ctx=window.MAGASIN_MANAGER_WORKFORCE_CONTEXT;if(!ctx?.client)throw new Error('MANAGER_CONTEXT_NOT_READY');return ctx.client()}
function ensurePolish(){
 const d=document;
 d.documentElement.dataset.schedulingRole=actorRole().toLowerCase();
 if(d.getElementById('workforce-scheduling-polish-v1-css'))return;
 const link=d.createElement('link');
 link.id='workforce-scheduling-polish-v1-css';
 link.rel='stylesheet';
 link.href='/02_CORE/ui/workforce-scheduling-polish-v1.css?v=20261001-ui-unified1';
 d.head.appendChild(link);
}
function status(text,type=''){const e=panel()?.querySelector('#msdStatus');if(!e)return;e.className='msd-status'+(type?' '+type:'');e.setAttribute('role',type==='error'?'alert':'status');e.setAttribute('aria-live',type==='error'?'assertive':'polite');e.textContent=text||''}
function lockControls(on){
 const p=panel();if(!p)return;
 p.setAttribute('aria-busy',on?'true':'false');
 p.querySelectorAll('button,select').forEach(el=>{
  if(on){if(!el.disabled){el.dataset.msdBusy='1';el.disabled=true}}
  else if(el.dataset.msdBusy==='1'){el.disabled=false;delete el.dataset.msdBusy}
 });
}
function errorText(e){
 const raw=String(e?.message||e?.code||e||'UNKNOWN');
 const known=[
  ['GENERATION_VERSION_CONFLICT','Có nhiều bản nháp đang cùng tồn tại cho cửa hàng và tuần này. Thao tác tạm khóa để tránh ghi đè.'],
  ['GENERATION_ALREADY_REVIEWED','Lịch tuần này đã được duyệt và đang chờ phát hành.'],
  ['GENERATION_ALREADY_PUBLISHED','Lịch tuần này đã được phát hành.'],
  ['COMPETING_GENERATION_EXISTS','Đang có một bản nháp khác cho cùng cửa hàng và tuần.'],
  ['OFFICIAL_STORE_WEEK_ALREADY_EXISTS','Cửa hàng/tuần này đã có lịch chính thức.'],
  ['ASSIGNMENT_OVERLAP','Một nhân viên đang bị xếp ca trùng giờ.'],
  ['CROSS_STORE_ASSIGNMENT_OVERLAP','Nhân viên đã có ca trùng giờ ở một cửa hàng khác.'],
  ['STORE_NOT_ELIGIBLE','Nhân viên không được Quản lý cấu hình làm tại cửa hàng này.'],
  ['MAX_TWO_ASSIGNMENTS_PER_EMPLOYEE_DAY','Một nhân viên vượt quá tối đa 2 ca trong ngày.'],
  ['EMPLOYEE_INACTIVE','Nhân viên đã ngừng hoạt động nên không thể xếp ca.'],
  ['EMPLOYEE_NOT_STAFF','Người được chọn không thuộc nhóm nhân viên đủ điều kiện xếp ca.'],
  ['ASSIGNMENT_OUTSIDE_GENERATION_WEEK','Có ca nằm ngoài tuần đang xếp.'],
  ['ASSIGNMENT_STORE_MISMATCH','Có ca không thuộc cửa hàng đang xếp lịch.'],
  ['STORE_NOT_ALLOWED','Tài khoản không có quyền xếp lịch cho cửa hàng này.'],
  ['STORE_NOT_ACTIVE','Cửa hàng hiện không hoạt động.'],
  ['MANAGER_AVAILABILITY_OVERRIDE','Quản lý điều động ngoài thời gian đăng ký.'],
  ['AVAILABILITY_MISMATCH','Có ca nằm ngoài thời gian nhân viên đã đăng ký có thể làm.'],
  ['OFFICIAL_SCHEDULE_OVERLAP','Có ca bị trùng với lịch chính thức hiện hữu.'],
  ['ASSIGNMENT_PAYLOAD_MALFORMED','Dữ liệu ca làm chưa hợp lệ.'],
  ['ASSIGNMENT_REQUIRED_FIELDS_MISSING','Có ca còn thiếu thông tin bắt buộc.'],
  ['ASSIGNMENT_EMPLOYEE_NOT_FOUND','Không tìm thấy nhân viên hợp lệ cho ca làm.'],
  ['GENERATION_NOT_DRAFT','Lịch không còn ở trạng thái bản nháp nên không thể chỉnh sửa.'],
  ['GENERATION_MUST_BE_REVIEWED','Lịch cần được duyệt trước khi phát hành.'],
  ['EMPTY_GENERATION','Lịch nháp chưa có ca nào. Hãy tạo lịch nháp tự động trước.'],
  ['GENERATION_VALIDATION_FAILED','Lịch còn xung đột nên chưa thể duyệt.'],
  ['ASSIGNMENT_VALIDATION_FAILED','Lịch còn xung đột nên chưa thể lưu bản nháp.']
 ];
 const hit=known.find(([code])=>raw.includes(code));
 return hit?hit[1]:'Không thể hoàn tất thao tác. Hãy tải lại dữ liệu và thử lại.';
}
const codeLabel=code=>errorText({message:String(code||'')});
function activate(){const view=document.querySelector('#view-workforce');if(!view)return;view.querySelectorAll('.tabs button[data-tab]').forEach(b=>b.classList.toggle('active',b.dataset.tab==='publish'));view.querySelectorAll('.panel').forEach(p=>p.classList.toggle('active',p.id==='panel-publish'))}
const availTypeOk=r=>['AVAILABLE','PREFERRED'].includes(String(r.availability_type||'').toUpperCase());
const availCovers=(r,a)=>String(r.work_date).slice(0,10)===String(a.work_date).slice(0,10)&&mins(r.start_time)<=mins(a.start_time)&&mins(r.end_time)>=mins(a.end_time)&&availTypeOk(r);
function employeeName(r){return r?.employee_name||r?.full_name||r?.username||r?.user_id||r?.employee_id||'Nhân viên'}
function priorityForStore(r){
 const ids=Array.isArray(r?.priority_store_ids)?r.priority_store_ids.map(String):[];
 const i=ids.indexOf(String(state.storeId||''));
 return i>=0?i+1:999;
}

function activeRequirements(){
 return state.requirements.filter(r=>String(r.store_id||'')===String(state.storeId||'')&&Number(r.day_of_week)>=1&&Number(r.day_of_week)<=7&&mins(r.end_time)>mins(r.start_time)&&Number(r.target_headcount)>0);
}
function recalculateShortagesLocal(){
 if(!state.generationId||!['DRAFT','REVIEWED'].includes(String(state.generationStatus||'').toUpperCase())){state.shortages=[];state.shortageSource='NONE';return state.shortages}
 const out=[];
 for(const r of activeRequirements()){
  const workDate=add(state.week,Number(r.day_of_week)-1),start=mins(r.start_time),end=mins(r.end_time),target=Number(r.target_headcount||0);
  const overlaps=state.assignments.filter(a=>String(a.work_date).slice(0,10)===workDate&&mins(a.end_time)>mins(a.start_time)&&mins(a.start_time)<end&&start<mins(a.end_time)).map((a,i)=>({
   user_id:String(a.user_id||('__row_'+i)),
   start:Math.max(start,mins(a.start_time)),
   end:Math.min(end,mins(a.end_time))
  }));
  const boundaries=[start,end,...overlaps.flatMap(a=>[a.start,a.end])].filter(x=>Number.isFinite(x)&&x>=start&&x<=end).sort((a,b)=>a-b).filter((x,i,a)=>i===0||x!==a[i-1]);
  for(let i=0;i<boundaries.length-1;i++){
   const segStart=boundaries[i],segEnd=boundaries[i+1];if(segEnd<=segStart)continue;
   const assigned=new Set(overlaps.filter(a=>a.start<=segStart&&a.end>=segEnd).map(a=>a.user_id)).size;
   if(assigned>=target)continue;
   const shortage={requirement_id:r.requirement_id||r.id||null,store_id:state.storeId,store_code:selectedStore()?.code||r.store_code||'',work_date:workDate,shortage_start:`${String(Math.floor(segStart/60)).padStart(2,'0')}:${String(segStart%60).padStart(2,'0')}`,shortage_end:`${String(Math.floor(segEnd/60)).padStart(2,'0')}:${String(segEnd%60).padStart(2,'0')}`,target_headcount:target,assigned_headcount:assigned,missing_headcount:target-assigned};
   const prev=out.at(-1);
   if(prev&&String(prev.requirement_id||'')===String(shortage.requirement_id||'')&&prev.work_date===shortage.work_date&&hm(prev.shortage_end)===hm(shortage.shortage_start)&&Number(prev.assigned_headcount)===assigned&&Number(prev.missing_headcount)===target-assigned)prev.shortage_end=shortage.shortage_end;
   else out.push(shortage);
  }
 }
 state.shortages=out;state.shortageSource='LOCAL';
 if(state.supplementTarget&&!out.some(x=>x.work_date===state.supplementTarget.work_date&&hm(x.shortage_start)===hm(state.supplementTarget.shortage_start)&&hm(x.shortage_end)===hm(state.supplementTarget.shortage_end)))state.supplementTarget=null;
 return out;
}
function profileCandidate(r,a){
 const userId=r.employee_id||r.user_id;
 const probe={...a,user_id:userId};
 const availabilityMatch=state.availability.some(x=>String(x.user_id)===String(userId)&&availCovers(x,probe));
 return {user_id:userId,employee_name:employeeName(r),username:r.username||'',priority_store_ids:r.priority_store_ids||[],priority:priorityForStore(r),availability_match:availabilityMatch};
}
function candidates(a){
 const map=new Map();
 for(const r of state.eligibleEmployees){
  const x=profileCandidate(r,a);
  if(x.user_id&&!map.has(String(x.user_id)))map.set(String(x.user_id),x);
 }
 const current=state.assignments.find(x=>String(x.id||'')===String(a.id||''))||a;
 if(current.user_id&&!map.has(String(current.user_id)))map.set(String(current.user_id),{user_id:current.user_id,employee_name:current.employee_name||current.full_name||current.username||'Nhân viên hiện tại',priority:999,availability_match:state.availability.some(x=>String(x.user_id)===String(current.user_id)&&availCovers(x,current))});
 return [...map.values()].sort((x,y)=>Number(y.availability_match)-Number(x.availability_match)||Number(x.priority)-Number(y.priority)||String(x.employee_name).localeCompare(String(y.employee_name),'vi'));
}
function assignmentMeta(a){
 if(String(a.warning||'').toUpperCase()==='MANAGER_AVAILABILITY_OVERRIDE')return '<span class="msd-override">Quản lý điều động ngoài thời gian đăng ký</span>';
 return 'Ca trong bản nháp · chưa phải lịch chính thức.';
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
 state.stores=await window.MAGASIN_MANAGER_WORKFORCE_CONTEXT.stores();
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
async function loadWeeklyPlan(){
 if(!state.week){state.weeklyPlan=[];return}
 const q=await client().rpc('get_cross_store_weekly_plan_v1',{p_week_start:state.week});
 if(q.error)throw q.error;
 state.weeklyPlan=Array.isArray(q.data)?q.data.map(x=>({...x})):[];
}
async function loadEligibleEmployees(){
 if(!state.storeId){state.eligibleEmployees=[];return}
 const q=await client().rpc('list_employee_workforce_profiles_v1');
 if(q.error)throw q.error;
 state.eligibleEmployees=(Array.isArray(q.data)?q.data:[]).filter(r=>
  String(r.profile_status||'').toUpperCase()==='ACTIVE'
  && ['STAFF','EMPLOYEE'].includes(String(r.employee_role||'').toUpperCase())
  && Array.isArray(r.priority_store_ids)
  && r.priority_store_ids.map(String).includes(String(state.storeId))
 );
}
async function loadRequirements(){
 const q=await client().rpc('list_workforce_recurring_staffing_requirements_v1',{});
 if(q.error)throw q.error;
 state.requirements=Array.isArray(q.data)?q.data.map(x=>({...x})):[];
}
async function loadAuthoritativeShortages(){
 if(!state.generationId||!['DRAFT','REVIEWED'].includes(String(state.generationStatus||'').toUpperCase())){state.shortages=[];state.shortageSource='NONE';return}
 const q=await client().rpc('list_cross_store_staffing_shortages_v1',{p_week_start:state.week});
 if(q.error)throw q.error;
 state.shortages=(Array.isArray(q.data)?q.data:[]).filter(x=>String(x.store_id||'')===String(state.storeId||'')).map(x=>({...x,shortage_start:hm(x.shortage_start),shortage_end:hm(x.shortage_end)}));
 state.shortageSource='SERVER';
 if(state.supplementTarget&&!state.shortages.some(x=>x.work_date===state.supplementTarget.work_date&&hm(x.shortage_start)===hm(state.supplementTarget.shortage_start)&&hm(x.shortage_end)===hm(state.supplementTarget.shortage_end)))state.supplementTarget=null;
}
async function listGenerations(){
 if(!state.storeId||!state.week)return [];
 const q=await client().rpc('list_schedule_generations',{p_store_id:state.storeId,p_week_start:state.week});
 if(q.error)throw q.error;
 return (Array.isArray(q.data)?q.data:[]).filter(r=>['DRAFT','REVIEWED','PUBLISHED'].includes(String(r.status||'').toUpperCase()));
}
async function loadOfficialRows(){
 if(!state.storeId||!state.week){state.officialRows=[];return}
 const q=await client().rpc('get_manager_weekly_schedule',{p_store_id:state.storeId,p_week_start:state.week});
 if(q.error)throw q.error;
 state.officialRows=(Array.isArray(q.data)?q.data:[]).filter(r=>String(r.status||'APPROVED').toUpperCase()==='APPROVED');
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
  await Promise.all([loadAvailability(),loadEligibleEmployees(),loadWeeklyPlan(),loadRequirements()]);
  const runs=await listGenerations();
  state.duplicateDrafts=Math.max(0,runs.length-1);
  state.lastValidation=null;
  if(runs.length>1){
   state.generationId=null;state.generationStatus='CONFLICT';state.generationOrigin=null;state.assignments=[];state.shortages=[];state.shortageSource='NONE';state.supplementTarget=null;state.officialRows=[];
   render();status('Có nhiều bản nháp cùng hoạt động cho cửa hàng và tuần này. Thao tác tạm khóa để tránh ghi đè.','error');return;
  }
  if(runs.length===1){
   const run=runs[0];
   state.generationId=run.id;
   state.generationStatus=String(run.status||'DRAFT').toUpperCase();
   state.generationOrigin=run.algorithm_version||'MANAGER_DIRECT_V1';
   await loadDraftAssignments();
   if(state.generationStatus==='PUBLISHED'){await loadOfficialRows();state.shortages=[];state.shortageSource='NONE'}else{state.officialRows=[];await loadAuthoritativeShortages()}
  }else{
   state.generationId=null;state.generationStatus='NONE';state.generationOrigin=null;state.assignments=[];state.shortages=[];state.shortageSource='NONE';state.supplementTarget=null;state.officialRows=[];
  }
  state.dirty=false;render();
  if(state.generationStatus==='PUBLISHED')status('Lịch đã phát hành. Dữ liệu chính thức đã được tải lại từ hệ thống.','ok');
  else if(state.generationStatus==='REVIEWED')status('Lịch đã được duyệt và sẵn sàng phát hành.','ok');
 }catch(e){render();status('Không tải được bảng xếp lịch. '+errorText(e),'error')}
 finally{state.busy=false;lockControls(false)}
}
async function startOrResume(){
 if(state.busy||!state.storeId||!state.week)return;
 if(state.generationId&&state.generationStatus!=='DRAFT')return resumeOnly();
 state.busy=true;lockControls(true);status('Đang tạo hoặc mở bản nháp…');
 try{
  const q=await client().rpc('create_schedule_generation',{p_store_id:state.storeId,p_week_start:state.week,p_algorithm_version:'MANAGER_DIRECT_V1'});
  if(q.error)throw q.error;
  if(!q.data)throw new Error('DIRECT_DRAFT_ID_MISSING');
  state.generationId=q.data;state.generationStatus='DRAFT';state.duplicateDrafts=0;state.lastValidation=null;state.officialRows=[];
  const listed=await client().rpc('list_schedule_generations',{p_store_id:state.storeId,p_week_start:state.week});
  if(listed.error)throw listed.error;
  const run=(Array.isArray(listed.data)?listed.data:[]).find(x=>String(x.id)===String(state.generationId));
  state.generationOrigin=run?.algorithm_version||'MANAGER_DIRECT_V1';
  await Promise.all([loadAvailability(),loadEligibleEmployees(),loadWeeklyPlan(),loadRequirements(),loadDraftAssignments()]);
  await loadAuthoritativeShortages();
  state.dirty=false;render();status('Đã mở đúng một bản nháp cho chi nhánh và tuần đã chọn.','ok');
 }catch(e){
  const raw=String(e?.message||e?.code||e||'');
  if(raw.includes('GENERATION_ALREADY_REVIEWED')||raw.includes('GENERATION_ALREADY_PUBLISHED')){
   state.busy=false;
   await resumeOnly();
   return;
  }
  state.generationId=null;state.generationStatus='CONFLICT';state.assignments=[];state.officialRows=[];
  render();status('Không thể mở bản nháp. '+errorText(e),'error');
 } finally{state.busy=false;lockControls(false)}
}
function planSource(r){return String(r?.plan_source||'DRAFT').toUpperCase()}
function currentWeeklyPlanRows(){
 const out=(Array.isArray(state.weeklyPlan)?state.weeklyPlan:[])
  .filter(r=>!(state.generationId&&String(r.generation_id||'')===String(state.generationId)&&planSource(r)==='DRAFT'))
  .map(r=>({...r,start_time:hm(r.start_time),end_time:hm(r.end_time),work_date:String(r.work_date||'').slice(0,10)}));
 if(state.generationId&&['DRAFT','REVIEWED'].includes(String(state.generationStatus||'').toUpperCase())){
  for(const a of state.assignments)out.push({
   plan_source:'DRAFT',generation_id:state.generationId,generation_status:state.generationStatus,
   assignment_id:a.id||null,store_id:a.store_id||state.storeId,store_code:a.store_code||selectedStore()?.code||'',
   user_id:a.user_id,employee_name:a.employee_name||a.full_name||a.username||'',
   work_date:String(a.work_date||'').slice(0,10),start_time:hm(a.start_time),end_time:hm(a.end_time),row_status:'DRAFT'
  });
 }
 return out;
}
function subtractInterval(parts,blockStart,blockEnd){
 const bs=mins(blockStart),be=mins(blockEnd),out=[];
 for(const part of parts){
  const ps=mins(part.start_time),pe=mins(part.end_time);
  if(be<=ps||bs>=pe){out.push(part);continue}
  if(bs>ps)out.push({...part,end_time:hm(blockStart)});
  if(be<pe)out.push({...part,start_time:hm(blockEnd)});
 }
 return out.filter(x=>mins(x.end_time)>mins(x.start_time));
}
function remainingAvailabilityWindows(userId){
 const uid=String(userId||'');
 const draft=currentWeeklyPlanRows().filter(r=>planSource(r)==='DRAFT'&&String(r.user_id||'')===uid);
 const out=[];
 for(const av of state.availability.filter(r=>String(r.user_id||'')===uid&&availTypeOk(r))){
  let parts=[{...av,work_date:String(av.work_date).slice(0,10),start_time:hm(av.start_time),end_time:hm(av.end_time)}];
  for(const row of draft.filter(r=>String(r.work_date).slice(0,10)===String(av.work_date).slice(0,10)))parts=subtractInterval(parts,row.start_time,row.end_time);
  out.push(...parts);
 }
 return out.sort((a,b)=>String(a.work_date).localeCompare(String(b.work_date))||mins(a.start_time)-mins(b.start_time));
}
function hardConflictFor(userId,workDate,startTime,endTime){
 const uid=String(userId||''),date=String(workDate||'').slice(0,10),start=mins(startTime),end=mins(endTime);
 if(!uid||!date||end<=start)return {code:'INVALID_INTERVAL',reason:'Ngày hoặc khung giờ chưa hợp lệ.'};
 const rows=currentWeeklyPlanRows().filter(r=>String(r.user_id||'')===uid&&String(r.work_date||'').slice(0,10)===date);
 const overlap=rows.find(r=>mins(r.start_time)<end&&start<mins(r.end_time));
 if(overlap){
  const source=planSource(overlap);
  return {code:source==='OFFICIAL'?'OFFICIAL_SCHEDULE_OVERLAP':'CROSS_STORE_ASSIGNMENT_OVERLAP',reason:(source==='OFFICIAL'?'Trùng lịch chính thức':'Trùng lịch nháp')+' '+esc(overlap.store_code||'cửa hàng khác')+' · '+esc(hm(overlap.start_time))+'–'+esc(hm(overlap.end_time))};
 }
 if(rows.length>=2)return {code:'MAX_TWO_ASSIGNMENTS_PER_EMPLOYEE_DAY',reason:'Đã có 2 ca trong ngày này.'};
 return null;
}
function poolCandidate(profile,target=state.supplementTarget){
 const userId=profile.employee_id||profile.user_id;
 const draftRows=currentWeeklyPlanRows().filter(r=>planSource(r)==='DRAFT'&&String(r.user_id||'')===String(userId));
 const remaining=remainingAvailabilityWindows(userId);
 const targetDate=target?String(target.work_date).slice(0,10):'';
 const targetStart=target?hm(target.shortage_start):'';
 const targetEnd=target?hm(target.shortage_end):'';
 const targetAvailable=target
  ? remaining.some(r=>String(r.work_date).slice(0,10)===targetDate&&mins(r.start_time)<=mins(targetStart)&&mins(r.end_time)>=mins(targetEnd))
  : remaining.length>0;
 const conflict=target?hardConflictFor(userId,targetDate,targetStart,targetEnd):null;
 return {profile,user_id:userId,employee_name:employeeName(profile),priority:priorityForStore(profile),week_assigned:draftRows.length,unassigned:draftRows.length===0,remaining,targetAvailable,conflict,manual:!targetAvailable&&!conflict};
}
function supplementalPoolGroups(target=state.supplementTarget){
 const rows=state.eligibleEmployees.map(r=>poolCandidate(r,target)).sort((a,b)=>
  Number(Boolean(b.targetAvailable))-Number(Boolean(a.targetAvailable))
  ||Number(a.priority)-Number(b.priority)
  ||String(a.employee_name).localeCompare(String(b.employee_name),'vi')
 );
 if(target)return {
  unassigned:rows.filter(x=>x.unassigned&&!x.conflict),
  remaining:rows.filter(x=>!x.unassigned&&x.targetAvailable&&!x.conflict),
  manual:rows.filter(x=>!x.unassigned&&!x.targetAvailable&&!x.conflict),
  blocked:rows.filter(x=>x.conflict)
 };
 return {
  unassigned:rows.filter(x=>x.unassigned),
  remaining:rows.filter(x=>!x.unassigned&&x.remaining.length>0),
  manual:rows.filter(x=>!x.unassigned&&x.remaining.length===0),
  blocked:[]
 };
}
function poolRowHtml(item,target,blocked=false){
 const remain=item.remaining.slice(0,2).map(r=>String(r.work_date).slice(5)+' '+hm(r.start_time)+'–'+hm(r.end_time)).join(' · ');
 const availabilityTag=item.targetAvailable?'<span class="msd-pool-tag">Trong thời gian còn trống</span>':'<span class="msd-pool-tag manual">Điều động thủ công · ngoài Availability</span>';
 const assignedTag=item.unassigned?'<span class="msd-pool-tag">Chưa có ca trong tuần</span>':'<span class="msd-pool-tag">'+esc(item.week_assigned)+' ca đã xếp</span>';
 const blockedTag=blocked?'<span class="msd-pool-tag blocked">'+esc(item.conflict?.reason||'Có xung đột')+'</span>':'';
 const action=target
  ? '<button class="btn" type="button" data-msd-pool-user="'+esc(item.user_id)+'"'+(blocked||!state.generationId||state.generationStatus!=='DRAFT'?' disabled aria-disabled="true"':'')+'>'+(item.targetAvailable?'+ Xếp vào khoảng thiếu':'+ Điều động thủ công')+'</button>'
  : '';
 return '<div class="msd-pool-row'+(blocked?' blocked':'')+'" data-msd-pool-candidate="'+esc(item.user_id)+'"><div class="msd-source-name">'+esc(item.employee_name)+' · Ưu tiên '+esc(item.priority)+'</div><div class="msd-source-meta">'+(remain?'Thời gian còn có thể xếp: '+esc(remain):'Không còn Availability trống trong tuần.')+'</div><div class="msd-pool-tags">'+assignedTag+availabilityTag+blockedTag+'</div>'+action+'</div>';
}
function poolGroupHtml(key,title,help,items,target,blocked=false){
 return '<section class="msd-pool-group" data-msd-pool-group="'+esc(key)+'"><h3>'+esc(title)+' · '+items.length+'</h3><div class="msd-pool-help">'+esc(help)+'</div>'+(items.length?'<div class="msd-pool-list">'+items.map(x=>poolRowHtml(x,target,blocked)).join('')+'</div>':'<div class="msd-empty">Không có nhân viên trong nhóm này.</div>')+'</section>';
}
function supplementalPoolHtml(){
 const target=state.supplementTarget,groups=supplementalPoolGroups(target);
 const intro=target
  ? 'Đã lọc theo '+String(target.work_date).slice(0,10)+' · '+hm(target.shortage_start)+'–'+hm(target.shortage_end)+' tại '+(selectedStore()?.code||'chi nhánh đang mở')+'.'
  : 'Bấm “+ Bổ sung người” tại một khoảng thiếu để lọc và xếp hạng ứng viên đúng chi nhánh, ngày và giờ.';
 return '<div class="msd-source-separator">Nhóm nhân sự bổ sung</div><div class="msd-source-meta">'+esc(intro)+'</div><div class="msd-pool">'
  +poolGroupHtml('unassigned','Chưa được xếp ca nào','Nhân viên chưa có ca đang xếp hoặc ca đã duyệt nào trong tuần.',groups.unassigned,target)
  +poolGroupHtml('remaining','Còn thời gian có thể xếp','Thời gian còn có thể làm sau khi trừ các ca đang xếp hoặc đã duyệt.',groups.remaining,target)
  +poolGroupHtml('manual','Có thể điều động thủ công','Nhân viên đủ Store Priority nhưng khoảng cần bổ sung nằm ngoài Availability; khi thêm sẽ có cảnh báo/audit marker.',groups.manual,target)
  +(target&&groups.blocked.length?poolGroupHtml('blocked','Không thể chọn do xung đột','Ứng viên bị khóa vì trùng ca hoặc đã đủ giới hạn ca trong ngày.',groups.blocked,target,true):'')
  +'</div>';
}
function addSupplementCandidate(userId){
 const target=state.supplementTarget;
 if(!target)return status('Hãy chọn “+ Bổ sung người” tại một khoảng thiếu trước.','error');
 if(!state.generationId||state.generationStatus!=='DRAFT')return status('Hãy tạo/mở lịch nháp trước.','error');
 const profile=state.eligibleEmployees.find(r=>String(r.employee_id||r.user_id)===String(userId));
 if(!profile)return status('Nhân viên không còn đủ Store Priority cho cửa hàng này.','error');
 const workDate=String(target.work_date).slice(0,10),startTime=hm(target.shortage_start),endTime=hm(target.shortage_end);
 const conflict=hardConflictFor(userId,workDate,startTime,endTime);
 if(conflict)return status('Không thể chọn nhân viên này: '+conflict.reason,'error');
 const remaining=remainingAvailabilityWindows(userId);
 const hasAvailability=remaining.some(r=>String(r.work_date).slice(0,10)===workDate&&mins(r.start_time)<=mins(startTime)&&mins(r.end_time)>=mins(endTime));
 const candidate={id:null,generation_id:state.generationId,user_id:userId,employee_name:employeeName(profile),store_id:state.storeId,store_code:selectedStore()?.code||'',work_date:workDate,start_time:startTime,end_time:endTime,skill_code:null,skill_level:0,score:0,warning:null,status:'DRAFT',note:'XSTORE_018_SUPPLEMENT_POOL'};
 if(!hasAvailability){candidate.warning='MANAGER_AVAILABILITY_OVERRIDE';candidate.note+=' | MANAGER_AVAILABILITY_OVERRIDE'}
 state.assignments.push(candidate);state.dirty=true;recalculateShortagesLocal();state.supplementTarget=null;render();
 status(hasAvailability?'Đã bổ sung nhân viên theo Availability còn trống. Bấm “Lưu bản nháp” để lưu.':'Đã thêm điều động thủ công ngoài Availability; hệ thống sẽ giữ cảnh báo/audit marker khi lưu.');
}
function manualPickerHtml(){
 if(!state.eligibleEmployees.length)return '<div class="msd-empty">Không có nhân viên ACTIVE nào đủ Store Priority cho cửa hàng này.</div>';
 const days=Array.from({length:7},(_,i)=>add(state.week,i)),target=state.supplementTarget;
 const selectedDate=target?.work_date||days[0],selectedStart=hm(target?.shortage_start||'06:00'),selectedEnd=hm(target?.shortage_end||'12:00');
 const options=state.eligibleEmployees
  .slice()
  .sort((a,b)=>priorityForStore(a)-priorityForStore(b)||String(employeeName(a)).localeCompare(String(employeeName(b)),'vi'))
  .map(r=>{const conflict=target?hardConflictFor(r.employee_id,selectedDate,selectedStart,selectedEnd):null;return '<option value="'+esc(r.employee_id)+'"'+(conflict?' disabled':'')+'>'+esc(employeeName(r))+' · Ưu tiên '+esc(priorityForStore(r))+(conflict?' · '+esc(conflict.reason):'')+'</option>'})
  .join('');
 return '<div class="msd-manual-picker" id="msdManualPicker"><div class="msd-source-name">Điều động thủ công theo giờ tự chọn</div><div class="msd-source-meta">Chỉ nhân viên ACTIVE có Store Priority tại '+esc(selectedStore()?.code||'cửa hàng đã chọn')+'. Hệ thống chặn trùng ca/giới hạn ca trước khi thêm và gắn cảnh báo nếu nằm ngoài Availability.</div><div class="msd-manual-grid"><select class="msd-input" id="msdManualEmployee" aria-label="Nhân viên">'+options+'</select><select class="msd-input" id="msdManualDate" aria-label="Ngày">'+days.map((d,i)=>'<option value="'+esc(d)+'"'+(d===selectedDate?' selected':'')+'>'+DAYS[i]+' · '+d.slice(8,10)+'/'+d.slice(5,7)+'</option>').join('')+'</select><select class="msd-input" id="msdManualStart" aria-label="Bắt đầu">'+timeOptions(selectedStart)+'</select><select class="msd-input" id="msdManualEnd" aria-label="Kết thúc">'+timeOptions(selectedEnd)+'</select></div><button class="btn" type="button" id="msdManualAdd"'+(state.generationId&&state.generationStatus==='DRAFT'?'':' disabled')+'>+ Thêm ca thủ công</button></div>';
}
function sourceHtml(){
 const target=state.supplementTarget;
 const targetHtml=target?'<div class="msd-source-target" role="status"><b>Đang bổ sung cho khoảng thiếu:</b> '+esc(target.work_date)+' · '+esc(hm(target.shortage_start))+'–'+esc(hm(target.shortage_end))+' · thiếu '+esc(target.missing_headcount)+' người.<br>Pool bên dưới đã lọc theo đúng ngày/giờ và kiểm tra xung đột toàn 4 cửa hàng.<br><button class="btn" type="button" data-msd-supplement-clear>Hủy chọn khoảng thiếu</button></div>':'';
 return targetHtml+supplementalPoolHtml()+manualPickerHtml();
}
function officialRowsHtml(){
 if(!state.officialRows.length)return '<div class="msd-empty">Chưa có ca chính thức cho cửa hàng/tuần này.</div>';
 const rows=[...state.officialRows].sort((a,b)=>String(a.work_date).localeCompare(String(b.work_date))||mins(a.start_time)-mins(b.start_time)||String(a.employee_name||'').localeCompare(String(b.employee_name||''),'vi'));
 return '<div class="msd-official-grid">'+rows.map(r=>`<div class="msd-official-row ${bandClass(r.start_time)}"><div><div class="msd-official-name">${esc(r.employee_name||r.username||'Nhân viên')}</div><div class="msd-official-meta">${esc(String(r.work_date).slice(0,10))} · ${esc(hm(r.start_time))}–${esc(hm(r.end_time))} · ${esc(r.store_code||selectedStore()?.code||'')}</div></div><span class="msd-pill msd-ok">ĐÃ PHÁT HÀNH</span></div>`).join('')+'</div>';
}
function boardHtml(){
 const days=Array.from({length:7},(_,i)=>add(state.week,i)),map=Object.fromEntries(days.map(d=>[d,[]])),shortageMap=Object.fromEntries(days.map(d=>[d,[]]));
 state.assignments.forEach((a,i)=>{const k=String(a.work_date).slice(0,10);if(map[k])map[k].push({a,i})});
 state.shortages.forEach((s,i)=>{const k=String(s.work_date).slice(0,10);if(shortageMap[k])shortageMap[k].push({s,i})});
 return `<div class="msd-board">${days.map((day,di)=>{
  const assignments=map[day].map(({a,i})=>{const cs=candidates(a);return `<div class="msd-card ${bandClass(a.start_time)}" data-msd-row="${i}"><div class="msd-field"><label>Nhân viên</label><select class="msd-input" data-f="user_id">${cs.map(r=>`<option value="${esc(r.user_id)}"${String(r.user_id)===String(a.user_id)?' selected':''}>${esc(r.employee_name||r.username||r.user_id)} · ${r.availability_match?'trong đăng ký':'ngoài đăng ký'}${Number(r.priority)<999?' · ƯT '+esc(r.priority):''}</option>`).join('')}</select></div><div class="msd-time-row"><div class="msd-field"><label>Bắt đầu</label><select class="msd-input" data-f="start_time">${timeOptions(a.start_time)}</select></div><div class="msd-field"><label>Kết thúc</label><select class="msd-input" data-f="end_time">${timeOptions(a.end_time)}</select></div></div><div class="msd-meta">${assignmentMeta(a)}</div><button class="btn" data-remove="${i}" type="button" aria-label="Bỏ ca khỏi lịch nháp" style="margin-top:7px;width:100%">Bỏ ca khỏi lịch nháp</button></div>`}).join('');
  const shortages=shortageMap[day].map(({s,i})=>`<div class="msd-shortage-card" data-msd-shortage="${i}" role="status" aria-label="Thiếu nhân sự ${esc(hm(s.shortage_start))} đến ${esc(hm(s.shortage_end))}"><div class="msd-shortage-head"><span class="msd-shortage-icon" aria-hidden="true">!</span><span>Thiếu ${esc(s.missing_headcount)} người</span></div><div class="msd-shortage-time">${esc(hm(s.shortage_start))}–${esc(hm(s.shortage_end))}</div><div class="msd-shortage-meta">Cần ${esc(s.target_headcount)} · hiện có ${esc(s.assigned_headcount)} · ${state.shortageSource==='LOCAL'?'đang tính theo thay đổi chưa lưu':'đã đối chiếu hệ thống'}</div><button class="btn" type="button" data-msd-supplement="${i}">+ Bổ sung người</button></div>`).join('');
  return `<div class="msd-day" data-msd-date="${day}"><div class="msd-day-title"><b>${DAYS[di]}</b><span>${day.slice(8,10)}/${day.slice(5,7)}</span></div>${assignments||(!shortages?'<div class="msd-empty">Chưa có ca</div>':'')}${shortages}</div>`;
 }).join('')}</div>`;
}
function stageLabel(stage){
 return stage==='DRAFT'?'LỊCH NHÁP':stage==='REVIEWED'?'ĐÃ DUYỆT':stage==='PUBLISHED'?'ĐÃ PHÁT HÀNH':stage==='CONFLICT'?'CẦN XỬ LÝ':'CHƯA TẠO';
}
function confirmDiscardChanges(){
 if(!state.dirty)return true;
 return confirm('Chi nhánh hiện tại có thay đổi chưa lưu. Nếu chuyển chi nhánh hoặc tuần, các thay đổi này sẽ bị bỏ. Tiếp tục?');
}
function resetBranchProjection(){
 state.generationId=null;state.generationStatus='NONE';state.generationOrigin=null;state.duplicateDrafts=0;
 state.assignments=[];state.availability=[];state.eligibleEmployees=[];state.weeklyPlan=[];state.requirements=[];state.shortages=[];state.shortageSource='NONE';state.supplementTarget=null;state.officialRows=[];state.lastValidation=null;state.dirty=false;
}
function storeSwitcherHtml(){
 return '<nav class="msd-store-switcher" aria-label="Chọn cửa hàng">'+state.stores.map(s=>{
  const selected=String(s.id)===String(state.storeId||'');
  return '<button class="msd-store-switch" type="button" data-msd-branch="'+esc(s.id)+'" aria-pressed="'+(selected?'true':'false')+'">'+esc(s.code||s.name||'Cửa hàng')+'</button>';
 }).join('')+'</nav>';
}
function singleStoreWorkspaceHtml(stage,officialHtml,actionHelp){
 const s=selectedStore();
 if(!s)return '<div class="msd-empty">Chưa có cửa hàng khả dụng để xếp lịch.</div>';
 const dirty=state.dirty?'<span class="msd-pill msd-dirty-note">CHƯA LƯU</span>':'';
 const summary='<div class="msd-summary"><span class="msd-pill">'+esc(s.code||'—')+'</span><span class="msd-pill">'+state.assignments.length+' ca</span><span class="msd-pill">'+state.availability.length+' đăng ký thời gian</span>'+(state.shortages.length?'<span class="msd-pill msd-shortage-pill">'+state.shortages.length+' khoảng thiếu</span>':'')+'<span class="msd-pill '+(stage==='PUBLISHED'?'msd-ok':stage==='CONFLICT'?'msd-warning':'')+'">'+stageLabel(stage)+'</span>'+dirty+(state.duplicateDrafts?'<span class="msd-pill msd-warning">Có nhiều bản nháp cùng cửa hàng và tuần · thao tác đang tạm khóa</span>':'')+'</div>';
 const draftActions='<div class="msd-actions msu2-draft-actions msd-workspace-actions"><button class="btn" type="button" id="msdStart" aria-describedby="msdActionHelp"'+(stage==='REVIEWED'||stage==='PUBLISHED'?' disabled aria-disabled="true"':'')+'>'+(state.generationId?'Mở lại bản nháp':'Tạo bản nháp')+'</button><button class="btn" type="button" id="msdReload">Tải lại</button><button class="btn primary" type="button" id="msdSave" aria-describedby="msdActionHelp"'+(stage==='DRAFT'?'':' disabled aria-disabled="true"')+'>Lưu bản nháp</button></div>';
 const calendar='<div class="msd-calendar-primary"><div class="msd-board-wrap" tabindex="0" role="region" aria-label="Lịch tuần '+esc(s.code||'')+' từ Thứ Hai đến Chủ Nhật"><b>Lịch tuần · Thứ Hai → Chủ Nhật</b><div class="muted" style="margin:4px 0 10px">Một cửa hàng · một lịch tuần. Ca và khoảng thiếu hiển thị trực tiếp theo ngày.</div>'+boardHtml()+'</div></div>';
 const people='<details class="msd-people-secondary"><summary>Nhân viên · '+state.eligibleEmployees.length+' người đủ điều kiện</summary><div class="msd-source"><b>Nhân viên đủ điều kiện xếp ca</b><div class="muted" style="margin-top:4px">Vùng này chỉ mở khi cần thêm/bổ sung người. XSTORE-019C sẽ chuyển luồng này thành drawer theo đúng ngày/giờ.</div>'+sourceHtml()+'</div></details>';
 const downstream='<div class="msd-downstream"><div class="muted" style="margin-bottom:4px">Sau khi lưu bản nháp: kiểm tra xung đột → duyệt → phát hành.</div><div id="msdActionHelp" class="muted" style="margin-bottom:8px">'+esc(actionHelp)+'</div><div class="msd-actions"><button class="btn" type="button" id="msdValidate" aria-describedby="msdActionHelp"'+(!state.generationId||stage==='PUBLISHED'||state.assignments.length===0||state.dirty?' disabled aria-disabled="true"':'')+'>Kiểm tra xung đột</button><button class="btn" type="button" id="msdReview" aria-describedby="msdActionHelp"'+(stage==='DRAFT'&&state.assignments.length>0&&!state.dirty?'':' disabled aria-disabled="true"')+'>Duyệt lịch</button><button class="btn primary" type="button" id="msdPublish" aria-describedby="msdActionHelp"'+(stage==='REVIEWED'&&state.assignments.length>0&&!state.dirty?'':' disabled aria-disabled="true"')+'>Phát hành</button></div></div>';
 const stateText=state.dirty?'Có thay đổi chưa lưu. Bấm “Lưu bản nháp” trước khi chuyển cửa hàng, tuần, kiểm tra hoặc duyệt.':state.generationId?(stage==='PUBLISHED'?'Lịch chính thức đã sẵn sàng.':stage==='REVIEWED'?'Lịch đã duyệt; kiểm tra lần cuối rồi phát hành.':'Bản nháp sẵn sàng chỉnh sửa.'):'Tạo hoặc mở bản nháp cho cửa hàng đang chọn.';
 return '<div class="msd-single-store">'+storeSwitcherHtml()+'<section class="msd-workspace" data-msd-active-store="'+esc(s.id)+'"><div class="msd-workspace-toolbar"><div class="msd-workspace-title"><b>'+esc(s.code)+' · '+esc(s.name)+'</b><span>Tuần '+esc(state.week||'—')+' · chỉ hiển thị cửa hàng đang chọn</span></div><span class="msd-workspace-state">'+stageLabel(stage)+'</span></div><div class="msd-workspace-body">'+summary+draftActions+calendar+people+downstream+officialHtml+'<div id="msdStatus" class="msd-status" role="status" aria-live="polite">'+stateText+'</div></div></section></div>';
}
function render(){
 const p=panel();if(!p)return;
 ensurePolish();
 if(!document.getElementById('manager-schedule-draft-editor-css'))document.head.insertAdjacentHTML('beforeend',css);
 activate();
 const stage=String(state.generationStatus||'NONE').toUpperCase(),copy=actorCopy();
 const officialAction=actorRole()==='OWNER'?'':'<div class="msd-actions" style="margin-top:8px"><button class="btn primary" id="msdOfficial" type="button">Mở lịch chính thức</button></div>';
 const officialHtml=stage==='PUBLISHED'?'<div class="msd-status ok" role="status" aria-live="polite"><b>Lịch chính thức đã phát hành</b><br>'+state.officialRows.length+' ca chính thức đang hiển thị bên dưới.'+officialRowsHtml()+officialAction+'</div>':'';
 const actionHelp=state.dirty?'Có thay đổi chưa lưu. Hãy lưu bản nháp trước khi kiểm tra, duyệt hoặc chuyển cửa hàng.':stage==='NONE'?'Tạo hoặc mở lịch nháp cho cửa hàng đang chọn để thêm ca, lưu và kiểm tra.':stage==='DRAFT'&&state.assignments.length===0?'Bản nháp đang rỗng. Hãy tạo lịch nháp tự động hoặc thêm ca trước khi kiểm tra/duyệt.':stage==='DRAFT'?'Bạn có thể chỉnh ca, lưu bản nháp rồi kiểm tra trước khi duyệt.':stage==='REVIEWED'?'Lịch đã duyệt nên phần chỉnh sửa bị khóa; bước tiếp theo là phát hành.':stage==='PUBLISHED'?'Lịch đã phát hành nên các thao tác chỉnh sửa bị khóa.':'Có nhiều bản nháp cho cùng cửa hàng và tuần; thao tác tạm khóa cho đến khi dữ liệu được xử lý.';
 const globalActions='<div class="msd-actions msd-global-actions"><button class="btn" type="button" data-msd-week="prev" aria-label="Tuần trước">←</button><button class="btn" type="button" data-msd-week="target">Tuần này</button><button class="btn" type="button" data-msd-week="next" aria-label="Tuần kế tiếp">→</button><span class="badge blue">'+esc(state.week||'—')+'</span></div>';
 p.innerHTML='<section class="card msd" data-scheduling-actor="'+esc(actorRole())+'"><div class="msd-head"><div><h2 style="margin:0">'+esc(copy.title)+'</h2><div class="muted" style="margin-top:5px">'+esc(copy.subtitle)+'</div></div>'+globalActions+'</div><div id="xstoreAutomationMount"></div>'+singleStoreWorkspaceHtml(stage,officialHtml,actionHelp)+'<details class="msd-global-overview"><summary>Tổng quan 4 cửa hàng · mở khi cần</summary><div id="xstoreMasterMount"></div></details></section>';
 bind();
}
function syncRowsFromDom(){
 panel()?.querySelectorAll('[data-msd-row]').forEach(row=>{const i=Number(row.dataset.msdRow),a=state.assignments[i];if(!a)return;a.user_id=row.querySelector('[data-f="user_id"]')?.value||a.user_id;a.start_time=row.querySelector('[data-f="start_time"]')?.value||a.start_time;a.end_time=row.querySelector('[data-f="end_time"]')?.value||a.end_time});
}
function addFromAvailability(index){
 if(!state.generationId||state.generationStatus!=='DRAFT')return status('Hãy tạo/mở lịch nháp trước.','error');
 const r=state.availability[Number(index)];if(!r)return status('Không tìm thấy khoảng thời gian có thể làm đã chọn.','error');
 const candidate={id:null,generation_id:state.generationId,user_id:r.user_id,employee_name:r.employee_name||r.username,store_id:state.storeId,store_code:r.preferred_store_code||selectedStore()?.code||'',work_date:String(r.work_date).slice(0,10),start_time:hm(r.start_time),end_time:hm(r.end_time),skill_code:null,skill_level:0,score:0,warning:null,status:'DRAFT',note:'MANAGER_DIRECT_FROM_AVAILABILITY'};
 const duplicate=state.assignments.some(a=>String(a.user_id)===String(candidate.user_id)&&String(a.work_date).slice(0,10)===candidate.work_date&&hm(a.start_time)===candidate.start_time&&hm(a.end_time)===candidate.end_time);
 if(duplicate)return status('Ca này đã có trong lịch nháp.','error');
 state.assignments.push(candidate);state.dirty=true;state.supplementTarget=null;recalculateShortagesLocal();render();status('Đã thêm ca vào lịch nháp. Bấm “Lưu bản nháp” để lưu thay đổi.');
}
function addManualAssignment(){
 if(!state.generationId||state.generationStatus!=='DRAFT')return status('Hãy tạo/mở lịch nháp trước.','error');
 const p=panel();
 const userId=p?.querySelector('#msdManualEmployee')?.value||'';
 const workDate=p?.querySelector('#msdManualDate')?.value||'';
 const startTime=p?.querySelector('#msdManualStart')?.value||'';
 const endTime=p?.querySelector('#msdManualEnd')?.value||'';
 if(!userId||!workDate||!startTime||!endTime||mins(endTime)<=mins(startTime))return status('Hãy chọn nhân viên, ngày và khung giờ hợp lệ.','error');
 const profile=state.eligibleEmployees.find(r=>String(r.employee_id)===String(userId));
 if(!profile)return status('Nhân viên không còn đủ điều kiện Store Priority cho cửa hàng này.','error');
 const conflict=hardConflictFor(userId,workDate,startTime,endTime);
 if(conflict)return status('Không thể thêm nhân viên này: '+conflict.reason,'error');
 const candidate={id:null,generation_id:state.generationId,user_id:userId,employee_name:employeeName(profile),store_id:state.storeId,store_code:selectedStore()?.code||'',work_date:workDate,start_time:hm(startTime),end_time:hm(endTime),skill_code:null,skill_level:0,score:0,warning:null,status:'DRAFT',note:'MANAGER_MANUAL_PICKER_V1'};
 const hasAvailability=remainingAvailabilityWindows(userId).some(r=>String(r.work_date).slice(0,10)===workDate&&mins(r.start_time)<=mins(startTime)&&mins(r.end_time)>=mins(endTime));
 if(!hasAvailability){candidate.warning='MANAGER_AVAILABILITY_OVERRIDE';candidate.note='MANAGER_MANUAL_PICKER_V1 | MANAGER_AVAILABILITY_OVERRIDE'}
 state.assignments.push(candidate);state.dirty=true;state.supplementTarget=null;recalculateShortagesLocal();
 render();
 status(hasAvailability?'Đã thêm ca thủ công trong Availability. Bấm “Lưu bản nháp” để lưu.':'Đã thêm ca ngoài Availability. Khi lưu, hệ thống sẽ gắn cảnh báo “Quản lý điều động ngoài thời gian đăng ký”.');
}
function openSupplement(index){
 const target=state.shortages[Number(index)];if(!target)return;
 state.supplementTarget={...target};render();
 setTimeout(()=>{
  const details=panel()?.querySelector('.msd-people-secondary');if(details)details.open=true;
  const source=panel()?.querySelector('.msd-source');source?.scrollIntoView?.({block:'nearest'});
  panel()?.querySelector('[data-msd-pool-user]:not([disabled])')?.focus();
 },0);
}
function clearSupplement(){state.supplementTarget=null;render()}
async function save(){
 if(state.busy||!state.generationId||state.generationStatus!=='DRAFT')return;
 syncRowsFromDom();
 for(const a of state.assignments){if(!a.user_id||mins(a.end_time)<=mins(a.start_time)){status('Có ca thiếu nhân viên hoặc giờ kết thúc không sau giờ bắt đầu.','error');return}}
 state.busy=true;lockControls(true);status('Đang lưu lịch nháp…');
 try{
  const payload=state.assignments.map(cleanAssignment);
  const q=await client().rpc('replace_schedule_generation_assignments',{p_generation_id:state.generationId,p_assignments:payload});
  if(q.error)throw q.error;
  await loadDraftAssignments();await loadWeeklyPlan();await loadAuthoritativeShortages();state.dirty=false;state.lastValidation=null;state.officialRows=[];render();status(`Đã lưu ${Number(q.data??payload.length)} ca vào bản nháp. Hãy kiểm tra xung đột trước khi duyệt.`,'ok');
 }catch(e){status('Lưu lịch nháp thất bại: '+errorText(e),'error')}
 finally{state.busy=false;lockControls(false)}
}
async function validate(){
 if(state.busy||!state.generationId||state.generationStatus==='PUBLISHED')return;
 if(state.dirty)return status('Hãy lưu các thay đổi của lịch nháp trước khi kiểm tra.','error');
 if(state.assignments.length===0){state.lastValidation='INVALID';render();status('Lịch nháp chưa có ca nào. Hãy tạo lịch nháp tự động trước khi kiểm tra.','error');return}
 state.busy=true;lockControls(true);status('Đang kiểm tra lịch…');
 try{
  const q=await client().rpc('validate_schedule_generation_v1',{p_generation_id:state.generationId});
  if(q.error)throw q.error;
  const violations=Array.isArray(q.data?.violations)?q.data.violations:[],warnings=Array.isArray(q.data?.warnings)?q.data.warnings:[];
  state.lastValidation=q.data?.valid?'VALID':'INVALID';
  render();
  const lines=[q.data?.valid?'✓ Lịch không có xung đột chặn phát hành.':'Lịch còn '+violations.length+' vấn đề cần xử lý.'];
  if(violations.length)lines.push(...violations.slice(0,8).map(x=>'• '+codeLabel(x?.code)));
  if(warnings.length)lines.push(...warnings.slice(0,5).map(x=>'• '+codeLabel(x?.code)));
  status(lines.join('\n'),q.data?.valid?'ok':'error');
  return q;
 }catch(e){state.lastValidation='INVALID';render();status('Không thể kiểm tra lịch. '+errorText(e),'error')}
 finally{state.busy=false;lockControls(false)}
}
async function review(){
 if(state.busy||!state.generationId||!['DRAFT','REVIEWED'].includes(state.generationStatus))return;
 if(state.dirty)return status('Hãy lưu các thay đổi của lịch nháp trước khi duyệt.','error');
 if(state.assignments.length===0){state.lastValidation='INVALID';render();status('Không thể duyệt lịch rỗng. Hãy tạo lịch nháp tự động trước.','error');return}
 state.busy=true;lockControls(true);status('Đang kiểm tra lại và duyệt lịch…');
 try{
  const q=await client().rpc('review_schedule_generation',{p_generation_id:state.generationId,p_decision:'APPROVED'});
  if(q.error)throw q.error;
  state.generationStatus=q.data?.status||'REVIEWED';state.lastValidation='VALID';
  render();status(q.data?.already_reviewed?'Lịch đã được duyệt trước đó; thao tác lặp không tạo thay đổi mới.':'Đã kiểm tra lại và chuyển lịch sang trạng thái đã duyệt.','ok');
 }catch(e){status('Duyệt lịch thất bại: '+errorText(e),'error')}finally{state.busy=false;lockControls(false)}
}
async function publish(){
 if(state.busy||!state.generationId||!['REVIEWED','PUBLISHED'].includes(state.generationStatus))return;
 if(state.dirty)return status('Hãy lưu các thay đổi của lịch nháp trước khi phát hành.','error');
 if(state.assignments.length===0){state.lastValidation='INVALID';render();status('Không thể phát hành lịch rỗng. Hãy quay lại tạo lịch nháp tự động.','error');return}
 if(state.generationStatus==='REVIEWED'&&!confirm('Phát hành lịch đã duyệt thành lịch làm chính thức?'))return;
 state.busy=true;lockControls(true);status(state.generationStatus==='PUBLISHED'?'Đang kiểm tra thao tác phát hành lặp…':'Đang kiểm tra lại và phát hành lịch chính thức…');
 try{
  const q=await client().rpc('publish_schedule_generation',{p_generation_id:state.generationId});
  if(q.error)throw q.error;
  if(!q.data?.published){
   state.generationStatus=q.data?.status||'DRAFT';state.lastValidation='INVALID';
   render();
   const violations=Array.isArray(q.data?.validation?.violations)?q.data.validation.violations:[];
   status('Chưa thể phát hành. '+(violations.length?violations.slice(0,4).map(x=>codeLabel(x?.code)).join(' '):'Lịch đã thay đổi và cần được kiểm tra lại.'),'error');
   return q;
  }
  state.generationStatus='PUBLISHED';state.lastValidation='VALID';
  const detail={generationId:state.generationId,storeId:state.storeId,weekStart:state.week,insertedScheduleCount:Number(q.data.inserted_schedule_count||0)};
  await loadOfficialRows();
  if(!q.data?.already_published)document.dispatchEvent(new CustomEvent('magasin:schedule-published',{detail}));
  render();
  status(q.data?.already_published?'Lịch đã được phát hành trước đó; thao tác lặp không tạo ca trùng.':'Đã phát hành '+detail.insertedScheduleCount+' ca chính thức và tải lại lịch từ hệ thống.','ok');
  return q;
 }catch(e){status('Phát hành lịch thất bại: '+errorText(e),'error')}finally{state.busy=false;lockControls(false)}
}
function bind(){
 const p=panel();if(!p)return;
 p.querySelectorAll('[data-msd-branch]').forEach(b=>b.addEventListener('click',async()=>{
  const next=b.dataset.msdBranch||null;
  if(!next||String(next)===String(state.storeId||''))return;
  syncRowsFromDom();
  if(!confirmDiscardChanges())return;
  state.storeId=next;resetBranchProjection();render();status('Đang tải lịch của chi nhánh đã mở…');await resumeOnly();
 }));
 p.querySelectorAll('[data-msd-week]').forEach(b=>b.addEventListener('click',async()=>{
  syncRowsFromDom();
  if(!confirmDiscardChanges())return;
  const a=b.dataset.msdWeek;
  state.week=a==='prev'?add(state.week,-7):a==='next'?add(state.week,7):targetWeek();
  resetBranchProjection();render();status('Đang tải dữ liệu tuần đã chọn…');await resumeOnly();
 }));
 p.querySelector('#msdStart')?.addEventListener('click',startOrResume);
 p.querySelector('#msdReload')?.addEventListener('click',async()=>{syncRowsFromDom();if(!confirmDiscardChanges())return;state.dirty=false;await resumeOnly()});
 p.querySelector('#msdSave')?.addEventListener('click',save);
 p.querySelector('#msdValidate')?.addEventListener('click',validate);
 p.querySelector('#msdReview')?.addEventListener('click',review);
 p.querySelector('#msdPublish')?.addEventListener('click',publish);
 p.querySelector('#msdOfficial')?.addEventListener('click',()=>document.querySelector('.sidebar [data-view="schedule"], [data-view="schedule"]')?.click());
 p.querySelectorAll('[data-add-av]').forEach(b=>b.addEventListener('click',()=>addFromAvailability(b.dataset.addAv)));
 p.querySelector('#msdManualAdd')?.addEventListener('click',addManualAssignment);
 p.querySelectorAll('[data-msd-supplement]').forEach(b=>b.addEventListener('click',()=>openSupplement(b.dataset.msdSupplement)));
 p.querySelectorAll('[data-msd-pool-user]').forEach(b=>b.addEventListener('click',()=>addSupplementCandidate(b.dataset.msdPoolUser)));
 p.querySelector('[data-msd-supplement-clear]')?.addEventListener('click',clearSupplement);
 p.querySelectorAll('[data-msd-row] select[data-f]').forEach(el=>el.addEventListener('change',()=>{syncRowsFromDom();state.dirty=true;recalculateShortagesLocal();render();status('Có thay đổi chưa lưu. Bấm “Lưu bản nháp” trước khi chuyển chi nhánh hoặc duyệt.')}))
 p.querySelectorAll('[data-remove]').forEach(b=>b.addEventListener('click',()=>{syncRowsFromDom();state.assignments.splice(Number(b.dataset.remove),1);state.dirty=true;recalculateShortagesLocal();render();status('Đã bỏ ca khỏi lịch nháp. Bấm “Lưu bản nháp” để lưu thay đổi.')}))
}
async function openDirect(detail={}){
 activate();
 const changingStore=detail.storeId&&String(detail.storeId)!==String(state.storeId||'');
 const changingWeek=detail.week&&String(detail.week)!==String(state.week||'');
 if((changingStore||changingWeek)&&state.dirty){
  syncRowsFromDom();
  if(!confirmDiscardChanges())return false;
 }
 if(detail.storeId)state.storeId=detail.storeId;
 if(detail.week)state.week=detail.week;
 resetBranchProjection();
 await loadStores();
 if(!state.week)state.week=targetWeek();
 await resumeOnly();
 return true;
}
async function boot(){
 let tries=0;while(!panel()&&tries++<60)await new Promise(r=>setTimeout(r,150));if(!panel())return;
 try{await loadStores();state.week=targetWeek();await resumeOnly()}catch(e){console.warn('[MANAGER_SCHEDULE_BOOT]',e);render();status('Không khởi tạo được bảng xếp lịch. Vui lòng tải lại và thử lại.','error')}
}
document.addEventListener('magasin:manager-schedule-open',e=>openDirect(e.detail));
document.addEventListener('magasin:owner-schedule-open',e=>openDirect(e.detail));
window.MAGASIN_MANAGER_SCHEDULE_DRAFT={openDirect,startOrResume,refresh:resumeOnly,validate,save,review,publish,getState:()=>({...state,stores:state.stores.map(x=>({...x})),assignments:state.assignments.map(x=>({...x})),availability:state.availability.map(x=>({...x})),eligibleEmployees:state.eligibleEmployees.map(x=>({...x})),weeklyPlan:state.weeklyPlan.map(x=>({...x})),requirements:state.requirements.map(x=>({...x})),shortages:state.shortages.map(x=>({...x})),supplementTarget:state.supplementTarget?{...state.supplementTarget}:null})};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
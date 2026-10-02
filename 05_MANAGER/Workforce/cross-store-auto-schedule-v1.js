(()=>{'use strict';
if(window.__MAGASIN_XSTORE_AUTO_SCHEDULE_V1__)return;
window.__MAGASIN_XSTORE_AUTO_SCHEDULE_V1__=true;

const DAYS=[
 {id:1,label:'T2',name:'Thứ 2'},
 {id:2,label:'T3',name:'Thứ 3'},
 {id:3,label:'T4',name:'Thứ 4'},
 {id:4,label:'T5',name:'Thứ 5'},
 {id:5,label:'T6',name:'Thứ 6'},
 {id:6,label:'T7',name:'Thứ 7'},
 {id:7,label:'CN',name:'Chủ nhật'}
];
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const hm=v=>String(v||'').slice(0,5);
const minuteOf=v=>{const m=String(v||'').match(/^(\d{1,2}):(\d{2})/);return m?Number(m[1])*60+Number(m[2]):-1};
const shiftBand=v=>window.MAGASIN_CORE?.time?.shiftKind?.(v)||'neutral';
const bandClass=v=>'xsa-band-'+shiftBand(v);
function applyBandClass(el,value){
 if(!el)return;
 el.classList.remove('xsa-band-morning','xsa-band-afternoon','xsa-band-evening','xsa-band-neutral');
 el.classList.add(bandClass(value));
}
const client=()=>{const ctx=window.MAGASIN_MANAGER_WORKFORCE_CONTEXT;if(!ctx?.client)throw Error('MANAGER_CONTEXT_NOT_READY');return ctx.client()};
const scheduleApi=()=>window.MAGASIN_MANAGER_SCHEDULE_DRAFT;
const state={week:null,stores:[],requirements:[],editing:false,editorCell:null,surface:'week',setupFocus:null,loading:false,busy:false,loaded:false,message:'',messageType:'',unconfiguredEmployeeCount:0,shortages:[],assignmentCount:null};
const mount=()=>document.getElementById('xstoreAutomationMount');
const validBlock=r=>r.store_id&&Number(r.day_of_week)>=1&&Number(r.day_of_week)<=7&&r.start_time&&r.end_time&&Number(r.target_headcount)>0;
const configuredStoreIds=()=>new Set(state.requirements.filter(validBlock).map(r=>String(r.store_id)));
const configuredStoreCount=()=>state.stores.filter(s=>configuredStoreIds().has(String(s.id))).length;

function ensureCss(){
 if(document.getElementById('xstore-auto-schedule-v1-css'))return;
 const s=document.createElement('style');s.id='xstore-auto-schedule-v1-css';
 s.textContent=`
.xsa{
  width:100%;
  max-width:100%;
  min-width:0;
  margin-top:var(--m-space-4,16px);
  border:1px solid var(--m-border-default,#EAECF0);
  border-radius:var(--m-radius-xl,16px);
  background:var(--m-color-surface,#fff);
  padding:var(--m-space-4,16px);
  box-shadow:var(--m-shadow-sm,0 1px 2px rgba(16,24,40,.06));
  color:var(--m-color-neutral-950,#101828);
  font-family:var(--m-font-sans,"Segoe UI",Roboto,Arial,sans-serif)
}
.xsa *{box-sizing:border-box}
.xsa-head{display:flex;justify-content:space-between;gap:16px;align-items:flex-start;flex-wrap:wrap}
.xsa-head h4{margin:0;font-size:18px;line-height:26px;font-weight:700;color:var(--m-color-neutral-950,#101828)}
.xsa-kicker{font-size:11px;line-height:16px;font-weight:700;letter-spacing:.02em;color:var(--m-color-brand-700,#08747F);margin-bottom:4px}
.xsa-actions{display:flex;gap:8px;flex-wrap:wrap}
.xsa-ia-nav{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:14px;padding:4px;border:1px solid var(--m-border-default,#EAECF0);border-radius:12px;background:var(--m-color-neutral-50,#F9FAFB);width:max-content;max-width:100%}
.xsa-ia-nav button{min-height:40px;border:0;border-radius:9px;background:transparent;color:var(--m-color-neutral-700,#344054);padding:0 14px;font-size:12px;font-weight:800;cursor:pointer}
.xsa-ia-nav button[aria-selected="true"]{background:#fff;color:var(--m-color-neutral-950,#101828);box-shadow:0 1px 3px rgba(16,24,40,.10)}
.xsa-surface{min-width:0}
.xsa-week-note{margin-top:12px;padding:10px 12px;border:1px solid #d8e5f4;border-radius:10px;background:#F7FBFF;color:var(--m-color-neutral-700,#344054);font-size:12px;line-height:18px}
.xsa-inline-link{display:inline-flex;align-items:center;min-height:34px;margin-top:8px;border:1px solid var(--m-color-neutral-300,#D0D5DD);border-radius:8px;background:#fff;color:var(--m-color-brand-700,#08747F);padding:0 10px;font-size:11px;font-weight:800;cursor:pointer}
.xsa-setup-grid{display:grid;gap:12px;margin-top:14px}
.xsa-setup-card{min-width:0;max-width:100%;border:1px solid var(--m-border-default,#EAECF0);border-radius:12px;background:#fff;padding:13px}
.xsa-setup-card.targeted{border-color:#9EC7F1;box-shadow:0 0 0 3px rgba(47,111,222,.08)}
.xsa-setup-card h5{margin:0;font-size:14px;line-height:20px;color:var(--m-color-neutral-950,#101828)}
.xsa-setup-card p{margin:4px 0 0;font-size:12px;line-height:18px;color:var(--m-color-neutral-500,#667085)}
.xsa-setup-card .xsa-actions{margin-top:10px}
.xsa-guide{margin-top:14px;border:1px solid var(--m-border-default,#EAECF0);border-radius:14px;background:#fff;padding:13px}
.xsa-guide-steps{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:7px;margin:0;padding:0;list-style:none}
.xsa-guide-step{min-height:42px;display:flex;align-items:center;justify-content:center;padding:8px;border:1px solid var(--m-border-default,#EAECF0);border-radius:9px;background:var(--m-color-neutral-50,#F9FAFB);color:var(--m-color-neutral-500,#667085);font-size:11px;line-height:16px;font-weight:800;text-align:center}
.xsa-guide-step.done{border-color:#B7DFC5;background:var(--m-color-success-soft,#ECFDF3);color:var(--m-color-success,#217653)}
.xsa-guide-step.current{border-color:#9EC7F1;background:var(--m-color-info-soft,#EFF6FF);color:#235DBA}
.xsa-next{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:14px;align-items:center;margin-top:10px;padding:12px;border:1px solid #D8E5F4;border-radius:11px;background:#F7FBFF}
.xsa-next-copy{display:grid;gap:3px}
.xsa-next-kicker{font-size:10px;line-height:14px;font-weight:900;letter-spacing:.06em;text-transform:uppercase;color:#667085}
.xsa-next-copy strong{font-size:14px;line-height:20px;color:var(--m-color-neutral-950,#101828)}
.xsa-next-copy p{margin:0;font-size:12px;line-height:18px;color:var(--m-color-neutral-500,#667085)}
.xsa-next .btn.primary{min-width:190px;min-height:44px}
.xsa-next[data-disabled="true"]{border-color:#E8D194;background:#FFFAEB}
.xsa-next[data-disabled="true"] .xsa-next-copy strong{color:#805B08}
.xsa-summary{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}
.xsa-pill{font-size:12px;line-height:18px;font-weight:700;padding:5px 9px;border-radius:999px;background:var(--m-color-info-soft,#EFF6FF);color:var(--m-color-info,#2F6FDE)}
.xsa-pill.ok{background:var(--m-color-success-soft,#ECFDF3);color:var(--m-color-success,#217653)}
.xsa-pill.warn{background:var(--m-color-warning-soft,#FFFAEB);color:var(--m-color-warning,#8A5A00)}
.xsa-recurring-note{margin-top:14px;padding:11px 13px;border:1px solid var(--m-border-default,#EAECF0);border-radius:10px;background:var(--m-color-neutral-50,#F9FAFB);color:var(--m-color-neutral-700,#344054);font-size:12px;line-height:18px}
.xsa-board-wrap{width:100%;max-width:100%;min-width:0;overflow:auto;margin-top:12px;border:1px solid var(--m-border-default,#EAECF0);border-radius:12px;background:#fff;overscroll-behavior-x:contain;scrollbar-gutter:stable}
.xsa-board{width:100%;border-collapse:collapse;min-width:1160px;table-layout:fixed}
.xsa-board th,.xsa-board td{border-right:1px solid var(--m-color-neutral-200,#EAECF0);border-bottom:1px solid var(--m-color-neutral-200,#EAECF0);padding:8px;vertical-align:top}
.xsa-board th{background:var(--m-color-neutral-50,#F9FAFB);color:var(--m-color-neutral-700,#344054);font-size:11px;line-height:16px;text-align:left;white-space:nowrap}
.xsa-board th:first-child,.xsa-board td:first-child{position:sticky;left:0;z-index:2;background:#fff;width:180px;min-width:180px}
.xsa-store-name{font-size:12px;line-height:18px;font-weight:700;color:var(--m-color-neutral-950,#101828)}
.xsa-store-sub{font-size:11px;line-height:16px;color:var(--m-color-neutral-500,#667085);margin-top:2px}
.xsa-workspace{display:block;width:100%;max-width:100%;min-width:0}\n.xsa-workspace.has-editor{display:grid;grid-template-columns:minmax(0,1fr) minmax(360px,420px);gap:12px;align-items:start}
.xsa-workspace>.xsa-board-wrap{margin-top:12px}
.xsa-cell{width:140px;min-width:140px;padding:0!important}
.xsa-cell-open{display:block;width:100%;min-height:72px;padding:8px;border:0;background:transparent;color:inherit;text-align:left;cursor:pointer}
.xsa button:focus-visible,.xsa input:focus-visible,.xsa select:focus-visible,.xsa-editor-panel:focus-visible{outline:2px solid var(--m-color-info,#2F6FDE);outline-offset:2px}
.xsa-cell-open:hover,.xsa-cell-open:focus-visible{background:#F8FBFE;outline:2px solid var(--m-color-info,#2F6FDE);outline-offset:-2px}
.xsa-cell-open[aria-expanded="true"]{background:#F4F9FF;box-shadow:inset 0 0 0 2px #9EC7F1}
.xsa-empty{font-size:12px;color:var(--m-color-neutral-500,#667085);padding:7px 2px}
.xsa-block{display:block;margin:0 0 6px;padding:8px;border:1px solid var(--m-border-default,#EAECF0);border-radius:8px;font-size:12px;line-height:18px;font-weight:700}
.xsa-editor-panel{position:sticky;top:12px;margin-top:12px;border:1px solid var(--m-border-default,#EAECF0);border-radius:14px;background:#fff;padding:14px;box-shadow:0 10px 28px rgba(16,24,40,.10)}
.xsa-editor-head{display:flex;justify-content:space-between;gap:10px;align-items:flex-start;margin-bottom:12px}
.xsa-editor-head h5{margin:0;font-size:16px;line-height:22px;color:var(--m-color-neutral-950,#101828)}
.xsa-editor-head p{margin:3px 0 0;font-size:12px;line-height:18px;color:var(--m-color-neutral-500,#667085)}
.xsa-editor-block{display:grid;grid-template-columns:1fr;gap:10px;margin-bottom:10px;padding:12px;border:1px solid var(--m-border-default,#EAECF0);border-radius:10px}
.xsa-band-morning{background:var(--m-shift-morning-bg,#FFF4CC)!important;border-color:var(--m-shift-morning-border,#E7B84B)!important;color:var(--m-shift-morning-text,#6B5100)!important}
.xsa-band-afternoon{background:var(--m-shift-afternoon-bg,#FDE7E7)!important;border-color:var(--m-shift-afternoon-border,#E39C9C)!important;color:var(--m-shift-afternoon-text,#8A2C2C)!important}
.xsa-band-evening{background:var(--m-shift-evening-bg,#E8F3FF)!important;border-color:var(--m-shift-evening-border,#9EC7F1)!important;color:var(--m-shift-evening-text,#235DBA)!important}
.xsa-band-neutral{background:#fff!important;color:var(--m-color-neutral-950,#101828)!important}
.xsa-band-legend{display:flex;gap:8px;flex-wrap:wrap;margin-top:8px}
.xsa-band-legend span{display:inline-flex;align-items:center;gap:6px;font-size:11px;line-height:16px;color:var(--m-color-neutral-700,#344054)}
.xsa-band-dot{width:12px;height:12px;border-radius:4px;border:1px solid transparent;flex:0 0 auto}
.xsa-band-dot.morning{background:var(--m-shift-morning-bg,#FFF4CC);border-color:var(--m-shift-morning-border,#E7B84B)}
.xsa-band-dot.afternoon{background:var(--m-shift-afternoon-bg,#FDE7E7);border-color:var(--m-shift-afternoon-border,#E39C9C)}
.xsa-band-dot.evening{background:var(--m-shift-evening-bg,#E8F3FF);border-color:var(--m-shift-evening-border,#9EC7F1)}
.xsa-field{display:grid;grid-template-columns:1fr;gap:5px}
.xsa-field>span{font-size:11px;line-height:16px;font-weight:700;color:var(--m-color-neutral-700,#344054)}
.xsa-editor-block input,.xsa-editor-block select{width:100%;min-width:0;min-height:44px;border:1px solid var(--m-color-neutral-300,#D0D5DD);border-radius:8px;padding:0 10px;background:#fff;color:var(--m-color-neutral-950,#101828);font:inherit;font-size:13px}
.xsa-editor-block .magasin-time-select{width:100%!important;min-width:0!important;max-width:100%!important}
.xsa-remove{width:100%;min-height:42px;padding:8px 10px;border:1px solid #F0C7C7;border-radius:8px;background:#fff;color:var(--m-color-danger,#A33D32);cursor:pointer;font-size:12px;font-weight:700}
.xsa-add-block{width:100%;min-height:44px;border:1px dashed #9CB7C7;border-radius:8px;background:#fff;color:var(--m-color-brand-700,#08747F);font-size:12px;font-weight:700;cursor:pointer}
.xsa-editor-actions{display:flex;justify-content:flex-end;gap:8px;align-items:center;flex-wrap:wrap;margin-top:12px;padding-top:12px;border-top:1px solid var(--m-border-default,#EAECF0)}
.xsa-editor-actions .btn{min-height:44px}
.xsa-status{margin-top:10px;padding:10px 12px;border-radius:9px;background:var(--m-color-info-soft,#EFF6FF);color:#235DBA;font-size:12px;line-height:18px;white-space:pre-wrap}
.xsa-status.ok{background:var(--m-color-success-soft,#ECFDF3);color:var(--m-color-success,#217653)}
.xsa-status.error{background:var(--m-color-danger-soft,#FEF3F2);color:var(--m-color-danger,#A33D32)}
@media(max-width:1024px){
 .xsa-guide-steps{grid-template-columns:repeat(2,minmax(0,1fr))}
 .xsa-guide-step:last-child{grid-column:1/-1}
 .xsa-next{grid-template-columns:1fr}
 .xsa-next .btn.primary{width:100%;min-width:0}
 .xsa-actions{width:100%}
 .xsa-actions .btn{flex:1 1 180px;min-height:44px}
 .xsa-board{min-width:1100px}
}
@media(max-width:1024px){
 .xsa button,.xsa input,.xsa select{min-height:44px}
}
@media(max-width:760px){
 .xsa-workspace,.xsa-workspace.has-editor{display:flex;flex-direction:column;gap:12px}
 .xsa-editor-panel{position:static;order:-1;left:auto;right:auto;bottom:auto;top:auto;z-index:auto;width:100%;max-height:none;overflow:visible;margin:0;padding:14px;border-radius:14px;box-shadow:0 4px 16px rgba(16,24,40,.06)}
}
@media(max-width:600px){
 .xsa{padding:12px}
 .xsa-head{gap:12px}
 .xsa-actions{display:grid;grid-template-columns:1fr;width:100%}
 .xsa-actions .btn{width:100%}
 .xsa-ia-nav{display:grid;grid-template-columns:1fr 1fr;width:100%}
 .xsa-ia-nav button{min-height:44px;padding:0 10px}
 .xsa-board-wrap{overflow:visible;border:0;background:transparent;scrollbar-gutter:auto}
 .xsa-board{display:block;width:100%;min-width:0;border-collapse:separate}
 .xsa-board thead{display:none}
 .xsa-board tbody{display:grid;gap:12px}
 .xsa-board tr{display:grid;grid-template-columns:1fr;gap:8px;padding:12px;border:1px solid var(--m-border-default,#EAECF0);border-radius:12px;background:#fff;box-shadow:0 2px 10px rgba(16,24,40,.04)}
 .xsa-board td,.xsa-board th{display:block;border:0;padding:0}
 .xsa-board th:first-child,.xsa-board td:first-child{position:static;left:auto;z-index:auto;width:auto;min-width:0;padding:0 0 8px!important;border-bottom:1px solid var(--m-border-default,#EAECF0)!important;background:transparent}
 .xsa-cell{width:auto;min-width:0;padding:0!important}
 .xsa-cell-open{min-height:64px;padding:10px;border:1px solid var(--m-border-default,#EAECF0);border-radius:10px;background:#fff}
 .xsa-cell-open::before{content:attr(data-xsa-day-label);display:block;margin-bottom:6px;color:var(--m-color-neutral-500,#667085);font-size:10px;line-height:14px;font-weight:900;letter-spacing:.05em;text-transform:uppercase}
 .xsa-editor-actions{display:grid;grid-template-columns:1fr}
 .xsa-editor-actions .btn{width:100%;min-height:44px}
}
`;
 document.head.appendChild(s);
}

function normalizeRequirement(r={}){return{
 requirement_id:r.requirement_id||null,
 store_id:r.store_id||'',
 store_code:r.store_code||'',
 store_name:r.store_name||'',
 day_of_week:Number(r.day_of_week||0),
 start_time:hm(r.start_time),
 end_time:hm(r.end_time),
 target_headcount:Number(r.target_headcount||1)
}}

function workflowModel(priorityReady,staffingReady){
 const scheduling=scheduleApi()?.getState?.()||{};
 const stage=String(scheduling.generationStatus||'NONE').toUpperCase();
 const validation=String(scheduling.lastValidation||'').toUpperCase();
 let model={stage,validation,current:1,doneAll:false,action:'setup-priority',label:'Thiết lập ưu tiên cửa hàng',title:'Hoàn thiện dữ liệu chuẩn bị',reason:'Cần có ưu tiên cửa hàng và nhu cầu nhân sự cố định trước khi tạo lịch nháp.',disabled:false};
 if(!state.week){
  model={...model,action:'blocked',label:'Chưa thể tạo lịch',title:'Chưa xác định tuần xếp lịch',reason:'Hệ thống cần xác định tuần vận hành trước khi tiếp tục.',disabled:true};
 }else if(!priorityReady){
  model={...model,action:'setup-priority',label:'Thiết lập ưu tiên cửa hàng',title:'Hoàn thiện ưu tiên cửa hàng',reason:'Còn '+state.unconfiguredEmployeeCount+' nhân viên chưa có ưu tiên cửa hàng. Chưa thể tạo lịch nháp tự động.',disabled:false};
 }else if(!staffingReady){
  model={...model,action:'setup-requirements',label:'Thiết lập nhu cầu nhân sự',title:'Hoàn thiện nhu cầu nhân sự cố định',reason:'Cần cấu hình nhu cầu nhân sự cho đủ các cửa hàng trước khi tạo lịch nháp tự động.',disabled:false};
 }else if(stage==='CONFLICT'){
  model={...model,current:4,action:'blocked',label:'Đang khóa thao tác',title:'Cần xử lý nhiều bản nháp cùng tuần',reason:'Có nhiều bản nháp cho cùng cửa hàng và tuần. Các thao tác tạo, duyệt và phát hành tạm khóa để tránh ghi đè.',disabled:true};
 }else if(stage==='NONE'){
  model={...model,current:2,action:'auto',label:'Tạo lịch nháp tự động',title:'Tạo lịch nháp',reason:'Dữ liệu chuẩn bị đã sẵn sàng. Hệ thống sẽ áp dụng cấu hình cố định vào tuần đang chọn.',disabled:false};
 }else if(stage==='DRAFT'&&validation==='VALID'){
  model={...model,current:5,action:'review',label:'Duyệt lịch',title:'Duyệt lịch đã kiểm tra',reason:'Lịch đã qua kiểm tra xung đột. Bước tiếp theo là duyệt trước khi phát hành.',disabled:false};
 }else if(stage==='DRAFT'){
  model={...model,current:3,action:'validate',label:validation==='INVALID'?'Kiểm tra lại lịch':'Kiểm tra lịch',title:'Chỉnh lịch nháp rồi kiểm tra',reason:validation==='INVALID'?'Lịch còn vấn đề cần xử lý. Chỉnh ca ở bảng lịch rồi kiểm tra lại.':'Bạn có thể chỉnh ca trực tiếp ở bảng lịch bên dưới; khi xong hãy kiểm tra xung đột.',disabled:false};
 }else if(stage==='REVIEWED'){
  model={...model,current:5,action:'publish',label:'Phát hành lịch',title:'Phát hành lịch đã duyệt',reason:'Lịch đã được duyệt và sẵn sàng chuyển thành lịch làm chính thức.',disabled:false};
 }else if(stage==='PUBLISHED'){
  model={...model,current:5,doneAll:true,action:'official',label:'Mở lịch chính thức',title:'Lịch tuần đã phát hành',reason:'Quy trình tuần này đã hoàn tất. Bạn có thể mở lịch chính thức để kiểm tra.',disabled:false};
 }
 const busy=state.loading||state.busy||scheduling.busy===true;
 if(busy)model={...model,disabled:true,label:'Đang cập nhật…',reason:'Hệ thống đang xử lý dữ liệu. Thao tác tiếp theo sẽ mở lại khi hoàn tất.'};
 return model;
}

function workflowHtml(model,summary){
 const labels=['Chuẩn bị','Tạo lịch nháp','Chỉnh lịch','Kiểm tra','Duyệt & phát hành'];
 const steps='<ol class="xsa-guide-steps" aria-label="Tiến trình xếp lịch">'+labels.map((label,i)=>{
  const n=i+1,kind=model.doneAll||n<model.current?'done':n===model.current?'current':'idle';
  return '<li class="xsa-guide-step '+kind+'" data-xsa-guide-step="'+n+'" aria-current="'+(kind==='current'?'step':'false')+'">'+n+'. '+label+'</li>';
 }).join('')+'</ol>';
 const action='<section class="xsa-next" data-disabled="'+model.disabled+'" data-xsa-guide-stage="'+esc(model.stage)+'"><div class="xsa-next-copy"><span class="xsa-next-kicker">Việc cần làm tiếp theo</span><strong>'+esc(model.title)+'</strong><p>'+esc(model.reason)+'</p></div><button class="btn primary" type="button" id="xsaNextAction" data-xsa-next-action="'+esc(model.action)+'"'+(model.disabled?' disabled aria-disabled="true"':'')+'>'+esc(model.label)+'</button></section>';
 return '<div class="xsa-guide">'+steps+action+'<div class="xsa-summary">'+summary.join('')+'</div></div>';
}

function setMessage(text,type=''){state.message=text||'';state.messageType=type;render()}

function cellRows(storeId,day){
 return state.requirements.map((r,index)=>({r,index})).filter(x=>String(x.r.store_id)===String(storeId)&&Number(x.r.day_of_week)===Number(day));
}

function cellHtml(store,day){
 const rows=cellRows(store.id,day.id);
 const attr=esc(String(store.id)+'-'+day.id);
 const selected=state.editing&&String(state.editorCell?.storeId||'')===String(store.id)&&Number(state.editorCell?.day||0)===Number(day.id);
 const label='Chỉnh '+String(store.code||store.name||'cửa hàng')+' · '+day.name;
 return '<td class="xsa-cell" data-xsa-cell="'+attr+'"><button class="xsa-cell-open" type="button" data-xsa-open-store="'+esc(store.id)+'" data-xsa-open-day="'+day.id+'" data-xsa-day-label="'+esc(day.label+' · '+day.name)+'" aria-label="'+esc(label)+'" aria-expanded="'+(selected?'true':'false')+'">'
  +(rows.length?rows.map(({r})=>'<span class="xsa-block '+bandClass(r.start_time)+'">'+esc(hm(r.start_time))+'–'+esc(hm(r.end_time))+' · '+esc(r.target_headcount)+' người</span>').join(''):'<span class="xsa-empty">Chưa cấu hình</span>')
  +'</button></td>';
}

function boardHtml(){
 if(!state.stores.length)return '<div class="xsa-status">Chưa có cửa hàng trong phạm vi quản lý.</div>';
 return '<div class="xsa-board-wrap"><table class="xsa-board"><thead><tr><th>Cửa hàng</th>'+DAYS.map(d=>'<th>'+esc(d.label)+'<br><span style="font-weight:500">'+esc(d.name)+'</span></th>').join('')+'</tr></thead><tbody>'
  +state.stores.map(store=>'<tr><td><div class="xsa-store-name">'+esc(store.code)+' · '+esc(store.name)+'</div><div class="xsa-store-sub">Cấu hình cố định hàng tuần</div></td>'+DAYS.map(day=>cellHtml(store,day)).join('')+'</tr>').join('')
  +'</tbody></table></div>';
}

function editorHtml(){
 if(!state.editing||!state.editorCell)return '';
 const store=state.stores.find(s=>String(s.id)===String(state.editorCell.storeId||''));
 const day=DAYS.find(d=>Number(d.id)===Number(state.editorCell.day||0));
 if(!store||!day)return '';
 const rows=cellRows(store.id,day.id);
 const blocks=rows.map(({r,index})=>
  '<div class="xsa-editor-block '+bandClass(r.start_time)+'" data-xsa-block="'+index+'">'
   +'<label class="xsa-field"><span>Bắt đầu</span><input type="time" aria-label="Bắt đầu" data-xsa-f="start_time" value="'+esc(r.start_time)+'"></label>'
   +'<label class="xsa-field"><span>Kết thúc</span><input type="time" aria-label="Kết thúc" data-xsa-f="end_time" value="'+esc(r.end_time)+'"></label>'
   +'<label class="xsa-field"><span>Số người</span><input type="number" min="1" max="20" step="1" aria-label="Số người" data-xsa-f="target_headcount" value="'+esc(r.target_headcount||1)+'"></label>'
   +'<button class="xsa-remove" type="button" data-xsa-remove="'+index+'" aria-label="Xóa khung giờ '+esc(day.name)+' của '+esc(store.code||store.name||'cửa hàng')+'">Xóa khung giờ này</button>'
  +'</div>'
 ).join('');
 return '<aside class="xsa-editor-panel" role="region" aria-labelledby="xsaEditorTitle" tabindex="-1">'
  +'<div class="xsa-editor-head"><div><div class="xsa-kicker">Chỉnh một ngày</div><h5 id="xsaEditorTitle">'+esc(store.code)+' · '+esc(store.name)+'</h5><p>'+esc(day.name)+' · Cấu hình cố định hàng tuần</p></div></div>'
  +(blocks||'<div class="xsa-empty">Chưa có khung giờ cho ngày này.</div>')
  +'<button class="xsa-add-block" type="button" id="xsaAddBlock">+ Thêm khung</button>'
  +'<div class="xsa-editor-actions"><button class="btn" type="button" id="xsaCancel">Hủy thay đổi</button><button class="btn primary" type="button" id="xsaSave">Lưu nhu cầu hàng tuần</button></div>'
  +'</aside>';
}

function shortagesHtml(){
 if(!state.shortages.length)return '';
 return '<div class="xsa-status">'+state.shortages.slice(0,12).map(x=>{
  const store=state.stores.find(s=>String(s.id)===String(x.store_id||''));
  return esc((x.store_code||store?.code||'CN')+' · '+String(x.work_date||'').slice(0,10)+' · '+hm(x.start_time)+'–'+hm(x.end_time)+' · thiếu '+Number(x.missing||0));
 }).join('<br>')+'</div>';
}

function render(){
 const m=mount();if(!m)return;
 ensureCss();
 const storeCount=configuredStoreCount();
 const totalStores=state.stores.length;
 const priorityReady=state.unconfiguredEmployeeCount===0;
 const requirementsReady=state.requirements.length>0;
 const complete=requirementsReady&&totalStores>0&&storeCount===totalStores;
 const workflow=workflowModel(priorityReady,complete);
 const surface=state.surface==='setup'?'setup':'week';
 const liveMessage=state.loading?'Đang tải nhu cầu nhân sự hàng tuần…':state.busy?'Đang xử lý thay đổi…':state.message;
 const liveType=(state.loading||state.busy)?'':state.messageType;
 const liveHtml=liveMessage?'<div class="xsa-status '+esc(liveType)+'" role="'+(liveType==='error'?'alert':'status')+'" aria-live="'+(liveType==='error'?'assertive':'polite')+'">'+esc(liveMessage)+'</div>':'';
 const summary=[
  '<span class="xsa-pill">'+state.requirements.length+' khung cố định</span>',
  '<span class="xsa-pill '+(storeCount===totalStores&&totalStores?'ok':'warn')+'">'+storeCount+'/'+totalStores+' CN đã cấu hình</span>'
 ];
 if(state.unconfiguredEmployeeCount)summary.push('<span class="xsa-pill warn">'+state.unconfiguredEmployeeCount+' NV chưa có ưu tiên CN</span>');
 if(state.assignmentCount!==null)summary.push('<span class="xsa-pill ok">'+state.assignmentCount+' ca đã được xếp tự động</span>');

 const nav='<div class="xsa-ia-nav" role="tablist" aria-label="Khu vực xếp lịch">'
  +'<button id="xsaTabWeek" type="button" role="tab" data-xsa-nav="week" aria-controls="xsaSurfaceWeek" aria-selected="'+(surface==='week')+'" tabindex="'+(surface==='week'?'0':'-1')+'">Lập lịch tuần</button>'
  +'<button id="xsaTabSetup" type="button" role="tab" data-xsa-nav="setup" aria-controls="xsaSurfaceSetup" aria-selected="'+(surface==='setup')+'" tabindex="'+(surface==='setup'?'0':'-1')+'">Thiết lập xếp lịch</button>'
  +'</div>';

 const weekSurface='<div id="xsaSurfaceWeek" class="xsa-surface" data-xsa-surface="week" role="tabpanel" aria-labelledby="xsaTabWeek">'
  +'<div class="xsa-head"><div><div class="xsa-kicker">Vận hành tuần</div><h4>Lập lịch tuần</h4><div class="muted" style="margin-top:5px">Theo một luồng duy nhất từ chuẩn bị đến phát hành. Cấu hình cố định chỉ cần mở khi có thay đổi.</div></div>'
  +'<div class="xsa-actions"><button class="btn" type="button" id="xsaSetupOpen">Thiết lập xếp lịch</button></div></div>'
  +workflowHtml(workflow,summary)
  +'<div class="xsa-week-note">Các số lượng phía trên chỉ là thông tin hỗ trợ. Hãy dùng <b>Việc cần làm tiếp theo</b> làm hành động chính cho trạng thái hiện tại.</div>'
  +shortagesHtml()
  +liveHtml
  +'</div>';

 const priorityTarget=state.setupFocus==='priority'?' targeted':'';
 const requirementTarget=state.setupFocus==='requirements'?' targeted':'';
 const setupSurface='<div id="xsaSurfaceSetup" class="xsa-surface" data-xsa-surface="setup" role="tabpanel" aria-labelledby="xsaTabSetup">'
  +'<div class="xsa-head"><div><div class="xsa-kicker">Cấu hình dùng lại</div><h4>Thiết lập xếp lịch</h4><div class="muted" style="margin-top:5px">Quản lý ưu tiên cửa hàng và nhu cầu nhân sự cố định tại đây. Những thiết lập này được dùng lại cho các tuần sau cho đến khi bạn thay đổi.</div></div>'
  +'<div class="xsa-actions"><button class="btn" type="button" id="xsaWeekOpen">← Lập lịch tuần</button></div></div>'
  +'<div class="xsa-setup-grid">'
  +'<section class="xsa-setup-card'+priorityTarget+'" data-xsa-setup-section="priority" tabindex="-1"><h5>Ưu tiên cửa hàng</h5><p>'+(priorityReady?'Tất cả nhân viên hiện đã có ưu tiên cửa hàng.':'Còn '+state.unconfiguredEmployeeCount+' nhân viên chưa có ưu tiên cửa hàng.')+' Phần chỉnh sửa vẫn dùng màn hình Nhân viên hiện có.</p><div class="xsa-actions"><button class="btn" type="button" id="xsaStaff">Mở ưu tiên cửa hàng</button></div></section>'
  +'<section class="xsa-setup-card'+requirementTarget+'" data-xsa-setup-section="requirements" tabindex="-1"><div class="xsa-head"><div><h5>Nhu cầu nhân sự cố định hàng tuần</h5><p>Cấu hình một lần theo cửa hàng × thứ trong tuần × khung giờ × số người; không chọn ngày lịch và không cần nhập lại mỗi tuần.</p></div><div class="xsa-actions"><button class="btn" type="button" id="xsaConfig">Chỉnh nhu cầu hàng tuần</button></div></div>'
  +'<div class="xsa-summary">'+summary.join('')+'</div>'
  +'<div class="xsa-recurring-note"><b>Cấu hình cố định hàng tuần:</b> hệ thống không tự đoán số người.<div class="xsa-band-legend" aria-label="Khung giờ nhân sự"><span><i class="xsa-band-dot morning" aria-hidden="true"></i>Ca sáng · 05:00–12:00</span><span><i class="xsa-band-dot afternoon" aria-hidden="true"></i>Ca chiều · 12:00–17:00</span><span><i class="xsa-band-dot evening" aria-hidden="true"></i>Ca tối · 17:00–22:00</span></div></div>'
  +'<div class="xsa-workspace'+(state.editing?' has-editor':'')+'">'+boardHtml()+editorHtml()+'</div>'
  +'</section></div>'
  +liveHtml
  +'</div>';

 m.innerHTML='<section class="xsa" data-xsa-active-surface="'+surface+'">'+nav+(surface==='setup'?setupSurface:weekSurface)+'</section>';
 bind();
}
function syncFromDom(){
 const m=mount();if(!m)return;
 m.querySelectorAll('[data-xsa-block]').forEach(block=>{
  const i=Number(block.dataset.xsaBlock);
  const r=state.requirements[i];
  if(!r)return;
  const get=f=>block.querySelector('[data-xsa-f="'+f+'"]')?.value||'';
  r.start_time=get('start_time');
  r.end_time=get('end_time');
  r.target_headcount=Number(get('target_headcount')||0);
 });
}

function validateLocal(){
 const keys=new Set();
 for(const r of state.requirements){
  if(!r.store_id||Number(r.day_of_week)<1||Number(r.day_of_week)>7||!r.start_time||!r.end_time||!Number(r.target_headcount))return 'Mỗi khung phải có cửa hàng, thứ trong tuần, giờ bắt đầu, giờ kết thúc và số người.';
  if(r.end_time<=r.start_time)return 'Giờ kết thúc phải sau giờ bắt đầu.';
  if(Number(r.target_headcount)<1||Number(r.target_headcount)>20)return 'Số người cần phải từ 1 đến 20.';
  const key=[r.store_id,r.day_of_week,r.start_time,r.end_time].join('|');
  if(keys.has(key))return 'Có hai khung trùng cửa hàng/thứ/giờ.';
  keys.add(key);
 }
 return '';
}

async function loadRequirements(){
 if(state.loading)return;
 state.loading=true;render();
 try{
  const q=await client().rpc('list_workforce_recurring_staffing_requirements_v1',{});
  if(q.error)throw q.error;
  state.requirements=(Array.isArray(q.data)?q.data:[]).map(normalizeRequirement);
  state.loaded=true;state.message='';state.messageType='';
 }catch(e){
  console.warn('[XSTORE_STAFFING_LOAD]',e);state.requirements=[];state.loaded=false;state.message='Không tải được nhu cầu nhân sự hàng tuần. Vui lòng tải lại và thử lại.';state.messageType='error';
 }finally{state.loading=false;render()}
}

async function saveRequirements(){
 if(state.busy)return;
 syncFromDom();
 const error=validateLocal();if(error)return setMessage(error,'error');
 state.busy=true;render();
 try{
  const payload=state.requirements.map(r=>({
   store_id:r.store_id,
   day_of_week:Number(r.day_of_week),
   start_time:r.start_time,
   end_time:r.end_time,
   target_headcount:Number(r.target_headcount)
  }));
  const q=await client().rpc('replace_workforce_recurring_staffing_requirements_v1',{p_requirements:payload});
  if(q.error)throw q.error;
  const restore={storeId:String(state.editorCell?.storeId||''),day:Number(state.editorCell?.day||0)};
  state.editing=false;state.editorCell=null;state.loaded=false;
  await loadRequirements();
  setTimeout(()=>[...(mount()?.querySelectorAll('[data-xsa-open-store]')||[])].find(x=>String(x.dataset.xsaOpenStore||'')===restore.storeId&&Number(x.dataset.xsaOpenDay||0)===restore.day)?.focus(),0);
  state.message='Đã lưu '+Number(q.data?.requirement_count??payload.length)+' khung nhu cầu hàng tuần. Cấu hình này được dùng lại cho mọi tuần cho đến khi bạn chỉnh và lưu.';state.messageType='ok';render();
 }catch(e){console.warn('[XSTORE_STAFFING_SAVE]',e);state.message='Không thể lưu nhu cầu nhân sự lúc này. Vui lòng kiểm tra dữ liệu và thử lại.';state.messageType='error';render()}
 finally{state.busy=false;render()}
}

async function callAuto(replaceExisting){
 const q=await client().rpc('auto_generate_cross_store_schedule_v1',{
  p_week_start:state.week,
  p_replace_existing:!!replaceExisting,
  p_algorithm_version:'XSTORE_GLOBAL_RECURRING_V1'
 });
 if(q.error)throw q.error;
 return q.data||{};
}

async function autoSchedule(){
 if(state.busy)return;
 if(!state.week)return setMessage('Chưa xác định tuần cần xếp lịch.','error');
 const priorityReady=state.unconfiguredEmployeeCount===0;
 const complete=state.requirements.length>0&&state.stores.length>0&&configuredStoreCount()===state.stores.length;
 if(!priorityReady)return setMessage('Cần thiết lập ưu tiên cửa hàng cho tất cả nhân viên trước khi xếp lịch tự động.','error');
 if(!complete)return setMessage('Cần cấu hình nhu cầu nhân sự cho đủ các cửa hàng trước khi xếp lịch tự động.','error');
 state.busy=true;state.shortages=[];state.assignmentCount=null;render();
 try{
  let result;
  try{result=await callAuto(false)}
  catch(e){
   const raw=String(e?.message||e?.code||e||'');
   if(!raw.includes('EXISTING_DRAFT_REQUIRES_CONFIRMATION'))throw e;
   if(!confirm('Tuần này đã có bản nháp. Xếp tự động sẽ thay thế các ca trong lịch nháp hiện tại của các cửa hàng trong phạm vi. Lịch đã duyệt/phát hành không bị thay đổi. Tiếp tục?')){
    state.message='Đã giữ nguyên bản nháp hiện tại.';state.messageType='';return;
   }
   result=await callAuto(true);
  }
  state.assignmentCount=Number(result.assignment_count||0);
  state.shortages=Array.isArray(result.shortages)?result.shortages:[];
  state.message=state.shortages.length
   ? 'Hệ thống đã áp dụng nhu cầu hàng tuần và tạo lịch nháp nhưng còn '+state.shortages.length+' khung thiếu người. Quản lý cần kiểm tra và chỉnh trước khi duyệt.'
   : 'Hệ thống đã áp dụng nhu cầu hàng tuần vào tuần đang chọn và tạo lịch nháp. Quản lý hãy kiểm tra, chỉnh sửa trước khi duyệt và phát hành.';
  state.messageType=state.shortages.length?'':'ok';
  await scheduleApi()?.refresh?.();
  setTimeout(()=>window.MAGASIN_CROSS_STORE_MASTER?.refresh?.(),0);
 }catch(e){
  const raw=String(e?.message||e?.code||e||'UNKNOWN');
  const friendly=raw.includes('STAFFING_REQUIREMENT_INCOMPLETE')?'Chưa cấu hình nhu cầu nhân sự cho đủ các cửa hàng.'
   :raw.includes('OFFICIAL_WEEK_ALREADY_EXISTS')?'Tuần này đã có lịch chính thức; hệ thống không được ghi đè.'
   :raw.includes('NON_DRAFT_GENERATION_EXISTS')?'Có lịch đã duyệt hoặc phát hành trong tuần; hãy xử lý lịch hiện tại trước khi xếp tự động.'
   :raw.includes('STAFFING_REQUIREMENT_EMPTY')?'Chưa có nhu cầu nhân sự hàng tuần để xếp lịch tự động.'
   :'Không thể xếp lịch tự động lúc này. Vui lòng kiểm tra dữ liệu và thử lại.';
  state.message=friendly;state.messageType='error';
 }finally{state.busy=false;render()}
}

function bind(){
 const m=mount();if(!m)return;
 if(m.dataset.xsaBandBound!=='1'){
  m.dataset.xsaBandBound='1';
  m.addEventListener('change',e=>{
   const field=e.target?.closest?.('[data-xsa-f="start_time"]');
   if(!field)return;
   applyBandClass(field.closest('[data-xsa-block]'),field.value);
  });
 }
 const openSurface=(surface,focus=null)=>{
  if(state.editing&&state.surface==='setup')syncFromDom();
  state.surface=surface==='setup'?'setup':'week';
  state.setupFocus=focus;
  render();
 };
 m.querySelectorAll('[data-xsa-nav]').forEach(b=>{
  b.addEventListener('click',()=>openSurface(b.dataset.xsaNav));
  b.addEventListener('keydown',e=>{
   if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;
   e.preventDefault();
   const tabs=[...m.querySelectorAll('[data-xsa-nav]')],i=tabs.indexOf(b);
   const next=e.key==='Home'?tabs[0]:e.key==='End'?tabs[tabs.length-1]:tabs[(i+(e.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length];
   const target=next?.dataset?.xsaNav||'week';
   openSurface(target);
   setTimeout(()=>mount()?.querySelector('[data-xsa-nav="'+target+'"]')?.focus(),0);
  });
 });
 m.querySelector('#xsaSetupOpen')?.addEventListener('click',()=>openSurface('setup'));
 m.querySelector('#xsaWeekOpen')?.addEventListener('click',()=>openSurface('week'));
 m.querySelectorAll('[data-xsa-go-setup]').forEach(b=>b.addEventListener('click',()=>openSurface('setup',b.dataset.xsaGoSetup||null)));
 m.querySelector('#xsaStaff')?.addEventListener('click',()=>document.querySelector('[data-view="staff"]')?.click());
 m.querySelector('#xsaConfig')?.addEventListener('click',()=>{
  const first=m.querySelector('[data-xsa-open-store]');
  if(first){first.focus();first.scrollIntoView?.({block:'nearest',inline:'nearest'});}
  state.message='Chọn một ô cửa hàng/ngày trong bảng để chỉnh nhu cầu.';state.messageType='';
  const status=m.querySelector('.xsa-status');if(!status)render();
 });
 m.querySelectorAll('[data-xsa-open-store]').forEach(b=>b.addEventListener('click',()=>{
  if(state.editing)syncFromDom();
  state.editing=true;
  state.editorCell={storeId:b.dataset.xsaOpenStore||'',day:Number(b.dataset.xsaOpenDay||0)};
  state.message='';state.messageType='';render();
  setTimeout(()=>{
   const editor=mount()?.querySelector('.xsa-editor-panel');
   editor?.focus({preventScroll:true});
   if(window.matchMedia?.('(max-width:760px)').matches)editor?.scrollIntoView?.({block:'start'});
  },0);
 }));
 m.querySelector('#xsaCancel')?.addEventListener('click',()=>{
  const restore={storeId:String(state.editorCell?.storeId||''),day:Number(state.editorCell?.day||0)};
  state.editing=false;state.editorCell=null;state.loaded=false;
  void loadRequirements().finally(()=>setTimeout(()=>{
   [...(mount()?.querySelectorAll('[data-xsa-open-store]')||[])].find(x=>String(x.dataset.xsaOpenStore||'')===restore.storeId&&Number(x.dataset.xsaOpenDay||0)===restore.day)?.focus();
  },0));
 });
 m.querySelector('#xsaSave')?.addEventListener('click',saveRequirements);
 m.querySelector('#xsaNextAction')?.addEventListener('click',async e=>{
  const action=e.currentTarget?.dataset?.xsaNextAction||'';
  if(action==='setup-priority')return openSurface('setup','priority');
  if(action==='setup-requirements')return openSurface('setup','requirements');
  if(action==='auto')return autoSchedule();
  if(action==='validate')return scheduleApi()?.validate?.();
  if(action==='review')return scheduleApi()?.review?.();
  if(action==='publish')return scheduleApi()?.publish?.();
  if(action==='official')return document.querySelector('.sidebar [data-view="schedule"], [data-view="schedule"]')?.click();
 });
 m.querySelector('#xsaAddBlock')?.addEventListener('click',()=>{
  if(!state.editorCell)return;
  syncFromDom();
  state.requirements.push({requirement_id:null,store_id:state.editorCell.storeId||'',day_of_week:Number(state.editorCell.day||0),start_time:'',end_time:'',target_headcount:1});
  render();
 });
 m.querySelectorAll('[data-xsa-remove]').forEach(b=>b.addEventListener('click',()=>{
  syncFromDom();state.requirements.splice(Number(b.dataset.xsaRemove),1);
  state.message='Đã bỏ khung giờ khỏi thay đổi đang chỉnh. Bấm “Lưu nhu cầu hàng tuần” để lưu thay đổi.';state.messageType='';
  render();
 }));
 if(state.surface==='setup'&&state.setupFocus){
  const focus=state.setupFocus;state.setupFocus=null;
  const target=m.querySelector('[data-xsa-setup-section="'+focus+'"]');
  if(target)setTimeout(()=>{target.focus({preventScroll:true});target.scrollIntoView?.({block:'nearest'});},0);
 }
}
async function onMaster(detail={}){
 const nextWeek=detail.week||null;
 const weekChanged=String(nextWeek||'')!==String(state.week||'');
 state.week=nextWeek;
 if(weekChanged){state.assignmentCount=null;state.shortages=[];state.message='';state.messageType=''}
 state.stores=Array.isArray(detail.stores)?detail.stores.map(x=>({...x})):[];
 state.unconfiguredEmployeeCount=Number(detail.unconfiguredEmployeeCount||0);
 render();
 if(!state.loaded)await loadRequirements();
}

document.addEventListener('magasin:xstore-master-rendered',e=>void onMaster(e.detail||{}));
document.addEventListener('magasin:manager-scheduling-ui-state',()=>{if(state.surface==='week')render()});
window.MAGASIN_XSTORE_AUTO_SCHEDULE={
 refresh:loadRequirements,
 getState:()=>({...state,stores:state.stores.map(x=>({...x})),requirements:state.requirements.map(x=>({...x})),shortages:state.shortages.map(x=>({...x}))})
};
ensureCss();
})();
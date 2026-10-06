(()=>{'use strict';
if(window.__MAGASIN_MANAGER_SCHEDULING_UI2_012__)return;
window.__MAGASIN_MANAGER_SCHEDULING_UI2_012__=true;

const PANEL='#panel-publish';
const root=()=>document.querySelector(PANEL+' .msd[data-scheduling-actor="MANAGER"], '+PANEL+' .msd[data-scheduling-actor="OWNER"]');
const scheduleApi=()=>window.MAGASIN_MANAGER_SCHEDULE_DRAFT;
const css=`<style id="manager-scheduling-ui2-012-css">
.msd.msd-ui2-012{overflow:hidden;background:transparent;box-shadow:none}
.msd-ui2-012 .msd-head{display:grid;gap:14px;align-items:stretch}
.msd-ui2-012 .msu2-title h2{font-size:25px;line-height:32px;color:#101828;letter-spacing:-.01em}
.msd-ui2-012 .msu2-title .muted{max-width:760px;font-size:12px;line-height:18px}
.msu2-context-bar{display:grid;grid-template-columns:minmax(0,1fr);gap:10px}
.msu2-control-group,.msu2-draft-actions{border:1px solid #dfe5ec;border-radius:12px;background:#fff;padding:10px}
.msu2-draft-actions{background:#fbfcfe}.msu2-draft-actions .btn{background:#fff;color:#475467;border-color:#d0d5dd;box-shadow:none}.msu2-draft-actions .btn:hover{background:#f8fafc}.msu2-draft-actions .btn.primary{background:#fff;color:#475467;border-color:#d0d5dd;box-shadow:none}
.msu2-control-label,.msu2-section-kicker{display:block;margin-bottom:5px;color:#667085;font-size:10px;font-weight:900;letter-spacing:.08em;text-transform:uppercase}
.msu2-control-group .btn{width:100%;min-width:0}
.msu2-week-controls{display:grid;grid-template-columns:42px minmax(112px,1fr) 42px auto;gap:6px;align-items:center}
.msu2-week-controls .badge{display:flex;align-items:center;justify-content:center;min-height:40px;white-space:nowrap}
.msu2-draft-actions{display:flex;gap:8px;justify-content:flex-end;align-items:end;margin-top:10px}
.msu2-draft-actions .btn{min-height:40px}
.msu2-draft-actions #msdSave{min-width:150px}
.msu2-state-banner{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;margin-top:10px;padding:12px 14px;border:1px solid #d8e1ea;border-radius:12px;background:#fff}
.msu2-state-copy{display:grid;gap:3px}.msu2-state-copy strong{font-size:13px;color:#101828}.msu2-state-copy span{font-size:11px;line-height:17px;color:#667085}
.msu2-state-chip{flex:0 0 auto;padding:6px 9px;border-radius:999px;background:#f2f4f7;color:#475467;font-size:10px;font-weight:900;letter-spacing:.05em}
.msu2-state-banner[data-tone="draft"]{border-color:#b9d4ee;background:#f7fbff}.msu2-state-banner[data-tone="draft"] .msu2-state-chip{background:#e8f3ff;color:#225e9b}
.msu2-state-banner[data-tone="reviewed"]{border-color:#e8d194;background:#fffaf0}.msu2-state-banner[data-tone="reviewed"] .msu2-state-chip{background:#fff1c6;color:#795700}
.msu2-state-banner[data-tone="published"]{border-color:#badfc8;background:#f6fbf7}.msu2-state-banner[data-tone="published"] .msu2-state-chip{background:#e8f5ed;color:#23754a}
.msu2-state-banner[data-tone="conflict"]{border-color:#efc0bc;background:#fff8f7}.msu2-state-banner[data-tone="conflict"] .msu2-state-chip{background:#fee4e2;color:#912018}
.msu2-state-banner[data-tone="busy"]{border-style:dashed;background:#f8fafc}
.msu2-state-summary{display:flex!important;gap:7px!important;flex-wrap:wrap!important;margin-top:10px!important}
.msd-ui2-012 .msd-layout{display:grid;grid-template-columns:minmax(0,1fr);gap:12px;margin-top:12px}
.msd-ui2-012 .msd-source,.msd-ui2-012 .msd-board-wrap{padding:14px;border-radius:13px;border-color:#dfe5ec;box-shadow:0 1px 2px rgba(16,24,40,.03)}
.msd-ui2-012 .msd-source{background:#fbfdff;border-style:dashed}.msd-ui2-012 .msd-board-wrap{background:#fff;border-width:2px}.msu2-section-help{margin:2px 0 10px;color:#667085;font-size:11px;line-height:17px}
.msd-ui2-012 .msd-source-list{display:grid;grid-auto-flow:column;grid-auto-columns:minmax(220px,260px);grid-template-columns:none;gap:8px;max-height:none;overflow-x:auto;overflow-y:hidden;padding-bottom:3px;scrollbar-gutter:stable}
.msd-ui2-012 .msd-source-row{min-width:0;background:#fff}
.msd-ui2-012 .msd-board-wrap{overflow:auto;overscroll-behavior:contain;scrollbar-gutter:stable;max-height:calc(100vh - 330px)}
.msd-ui2-012 .msd-board{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:6px;min-width:0;width:100%}
.msd-ui2-012 .msd-day{min-width:0;border-radius:10px;background:#fcfdff}
.msd-ui2-012 .msd-day-title{position:sticky;left:0;padding:9px 8px;background:#f4f7fb}
.msd-ui2-012 .msd-card{margin:6px;padding:8px}
.msd-ui2-012 .msd-time-row{grid-template-columns:1fr;gap:3px}
.msd-ui2-012 .msd-input{height:38px}
.msd-ui2-012 .msd-empty{min-height:72px;display:grid;place-items:center;border:1px dashed #dce5f0;border-radius:9px;margin:6px;color:#667085;background:#fff}
.msd-ui2-012 .msd-downstream{margin-top:12px;padding:14px;border:1px solid #dfe5ec;border-radius:13px;background:#fff}
.msd-ui2-012 .msd-downstream .msd-actions{gap:8px;align-items:center}.msd-ui2-012 .msd-downstream .btn{min-width:140px}
.msu2-final-action{font-weight:800}.msu2-final-action.primary{box-shadow:0 1px 2px rgba(16,24,40,.08)}
.msu2-conflict-resolution{display:none;align-items:flex-start;justify-content:space-between;gap:12px;margin-top:10px;padding:10px 12px;border:1px solid #efc0bc;border-radius:10px;background:#fff8f7}.msu2-conflict-resolution strong{display:block;color:#912018;font-size:12px}.msu2-conflict-resolution span{display:block;margin-top:3px;color:#667085;font-size:11px;line-height:17px}.msu2-conflict-resolution .btn{flex:0 0 auto;min-width:150px}.msu2-conflict-resolution[data-visible="1"]{display:flex}
.msd-ui2-012 .msd-downstream #msdStatus{margin-top:10px}
.msd-ui2-012 #msdStatus{role:status}
.msd-ui2-012 .msd-status{border:1px solid #d8e5f4}
.msd-ui2-012 .msd-status.error{border-color:#efc0bc}.msd-ui2-012 .msd-status.ok{border-color:#badfc8}
.msd-ui2-012 .msd-official-row{min-height:48px}
.msd-ui2-012 button:focus-visible,.msd-ui2-012 select:focus-visible,.msd-ui2-012 input:focus-visible,.msd-ui2-012 .msd-board-wrap:focus-visible{outline:2px solid #2f6fde!important;outline-offset:2px!important}
@media(max-width:900px){
 .msd-ui2-012 .msd-board{grid-template-columns:repeat(7,minmax(156px,1fr));min-width:1128px;width:max-content}
}
@media(max-width:1024px){
 .msu2-context-bar{grid-template-columns:minmax(0,1fr)}
 .msu2-week-controls{grid-template-columns:44px minmax(112px,1fr) 44px}
 .msu2-week-controls .badge{grid-column:1/-1}
 .msu2-draft-actions{display:grid;grid-template-columns:1fr 1fr;margin-top:8px}
 .msu2-draft-actions #msdSave{grid-column:1/-1;min-width:0}
 .msd-ui2-012 button:not(.msd-resize-handle),.msd-ui2-012 select{min-height:44px!important}
 .msu2-draft-actions .btn,.msu2-control-group .btn,.msu2-week-controls .btn,.msd-ui2-012 .msd-source-row .btn,.msd-ui2-012 .msd-downstream .btn{min-height:44px!important}
 .msd-ui2-012 .msd-input{min-height:44px!important;height:44px!important}
 .msd-ui2-012 .msd-source-list{grid-auto-flow:row;grid-auto-columns:auto;grid-template-columns:repeat(2,minmax(0,1fr));overflow:visible}
 .msd-ui2-012 .msd-downstream .msd-actions{display:grid;grid-template-columns:1fr 1fr}
 .msd-ui2-012 .msd-downstream .btn{min-width:0}
 .msd-ui2-012 .msd-downstream #msdPublish{grid-column:1/-1}
}
@media(max-width:600px){
 .msd-ui2-012 .msu2-title h2{font-size:22px;line-height:28px}
 .msu2-state-banner{display:grid}
 .msu2-state-chip{justify-self:start}
 .msu2-draft-actions{grid-template-columns:1fr}
 .msu2-draft-actions #msdSave{grid-column:auto}
 .msd-ui2-012 .msd-source,.msd-ui2-012 .msd-board-wrap,.msd-ui2-012 .msd-downstream{padding:12px}
 .msd-ui2-012 .msd-source-list{grid-template-columns:1fr}
 .msd-ui2-012 .msd-board-wrap{overflow:auto;scrollbar-gutter:stable;max-height:62vh}
 .msd-ui2-012 .msd-board{grid-template-columns:repeat(7,minmax(150px,1fr));min-width:1080px;width:max-content;gap:6px}
 .msd-ui2-012 .msd-day{min-height:220px;min-width:0}
 .msd-ui2-012 .msd-day-title{position:sticky;top:0;z-index:2}
 .msd-ui2-012 .msd-time-row{grid-template-columns:1fr}
 .msd-ui2-012 .msd-downstream .msd-actions{grid-template-columns:1fr}
 .msd-ui2-012 .msd-downstream #msdPublish{grid-column:auto}
 .msu2-conflict-resolution{display:none;grid-template-columns:1fr}
 .msu2-conflict-resolution[data-visible="1"]{display:grid}
 .msu2-conflict-resolution .btn{width:100%;min-width:0}
}
</style>`;

function injectCss(){
 if(document.getElementById('manager-scheduling-ui2-012-css'))return;
 document.head.insertAdjacentHTML('beforeend',css);
}
function group(className,label){
 const box=document.createElement('div');box.className=className;
 if(label){const l=document.createElement('span');l.className='msu2-control-label';l.textContent=label;box.appendChild(l)}
 return box;
}
function stageModel(state,busy){
 const stage=String(state?.generationStatus||'NONE').toUpperCase();
 if(busy)return {tone:'busy',chip:'ĐANG CẬP NHẬT',title:'Đang cập nhật dữ liệu',detail:'Giữ nguyên cửa hàng và tuần hiện tại; thao tác tạm khóa cho đến khi hoàn tất.'};
 if(stage==='DRAFT')return {tone:'draft',chip:'LỊCH NHÁP',title:'Đang soạn lịch tuần',detail:'Chỉnh các ca, lưu lịch nháp rồi kiểm tra xung đột trước khi duyệt.'};
 if(stage==='REVIEWED')return {tone:'reviewed',chip:'ĐÃ DUYỆT',title:'Đã duyệt · chờ phát hành',detail:'Lịch nháp đã được duyệt. Bước tiếp theo là phát hành lịch làm chính thức.'};
 if(stage==='PUBLISHED')return {tone:'published',chip:'ĐÃ PHÁT HÀNH',title:'Đã phát hành',detail:'Lịch làm chính thức đã sẵn sàng để xem bên dưới.'};
 if(stage==='CONFLICT')return {tone:'conflict',chip:'CẦN XỬ LÝ',title:'Có nhiều bản nháp cùng cửa hàng và tuần',detail:'Tạm khóa chỉnh sửa để tránh ghi đè. Tải lại sau khi dữ liệu trùng được xử lý.'};
 return {tone:'none',chip:'CHƯA TẠO',title:'Chưa có lịch nháp',detail:'Mở chi nhánh cần xếp ngay bên dưới, sau đó tạo hoặc mở lịch nháp của chi nhánh đó.'};
}
function structure(r){
 if(r.dataset.ui2SchedulingEnhanced==='1')return;
 r.dataset.ui2SchedulingEnhanced='1';
 r.dataset.ui2ScheduleBoard='1';
 r.classList.add('msd-ui2-012');
 const head=r.querySelector('.msd-head');
 const title=head?.firstElementChild;
 if(title)title.classList.add('msu2-title');
 const actions=head?.querySelector(':scope > .msd-actions');
 if(head&&actions){
  const context=document.createElement('div');context.className='msu2-context-bar';
  const weekGroup=group('msu2-control-group','Tuần vận hành · Asia/Ho_Chi_Minh');
  const weekControls=document.createElement('div');weekControls.className='msu2-week-controls';
  const weekButtons=[...actions.querySelectorAll('[data-msd-week]')];
  const badge=actions.querySelector('.badge');
  for(const b of weekButtons)weekControls.appendChild(b);
  if(badge)weekControls.appendChild(badge);
  weekGroup.appendChild(weekControls);
  context.append(weekGroup);
  actions.remove();
  head.append(context);
 }
 const banner=document.createElement('div');
 banner.className='msu2-state-banner';
 banner.setAttribute('role','status');
 banner.setAttribute('aria-live','polite');
 banner.innerHTML='<div class="msu2-state-copy"><strong></strong><span></span></div><span class="msu2-state-chip"></span>';
 head?.after(banner);
 const supportingSummary=r.querySelector(':scope > .msd-summary');
 if(supportingSummary)supportingSummary.classList.add('msu2-state-summary');
 for(const id of ['msdStart','msdReload','msdSave']){const el=r.querySelector('#'+id);if(el){el.classList.remove('primary');el.classList.add('msu2-secondary-action')}}

 const source=r.querySelector('.msd-source');
 const sourceTitle=source?.querySelector(':scope > b');
 if(sourceTitle&&!source.querySelector(':scope > .msu2-section-kicker')){
  const k=document.createElement('span');k.className='msu2-section-kicker';k.textContent='Nhóm nhân sự bổ sung';sourceTitle.before(k);
  const h=document.createElement('div');h.className='msu2-section-help';h.textContent='Nhân viên được chia theo trạng thái chưa có ca, còn Availability sau khi trừ lịch nháp, hoặc có thể điều động thủ công. Khi xử lý thiếu người, danh sách được lọc đúng chi nhánh/ngày/giờ.';sourceTitle.after(h);
  source.dataset.msu2Section='supplemental-employee-pool';
 }
 const board=r.querySelector('.msd-board-wrap');
 const boardTitle=board?.querySelector(':scope > b');
 if(boardTitle&&!board.querySelector(':scope > .msu2-section-kicker')){
  const k=document.createElement('span');k.className='msu2-section-kicker';k.textContent='Lịch nháp đang chỉnh';boardTitle.before(k);
  const h=document.createElement('div');h.className='msu2-section-help';h.textContent='Đây là vùng chỉnh sửa ca của tuần đang chọn. Lưu bản nháp trước khi kiểm tra và duyệt.';boardTitle.after(h);
  board.dataset.msu2Section='draft-editor';
 }
 if(board){
  board.tabIndex=0;
  board.setAttribute('role','region');
  board.setAttribute('aria-label','Bảng lịch nháp 7 ngày; có thể cuộn ngang ở màn hình hẹp');
 }
 const downstream=r.querySelector('.msd-downstream');
 if(downstream&&!downstream.querySelector(':scope > .msu2-section-kicker')){
  const k=document.createElement('span');k.className='msu2-section-kicker';k.textContent='Bước cuối · duyệt và phát hành';downstream.prepend(k);
 }
 if(downstream&&!downstream.querySelector('.msu2-conflict-resolution')){
  const conflict=document.createElement('div');conflict.className='msu2-conflict-resolution';conflict.innerHTML='<div><strong>Cần xử lý nhiều bản nháp cùng tuần</strong><span>Giữ nguyên dữ liệu hiện tại. Sau khi dữ liệu trùng được xử lý, tải lại trạng thái để tiếp tục.</span></div><button class="btn" type="button" data-msu2-conflict-reload>Tải lại trạng thái</button>';downstream.appendChild(conflict);
  conflict.querySelector('[data-msu2-conflict-reload]')?.addEventListener('click',()=>r.querySelector('#msdReload')?.click());
 }
 const status=r.querySelector('#msdStatus');
 if(status){status.setAttribute('role','status');status.setAttribute('aria-live','polite');if(downstream&&status.parentElement!==downstream)downstream.appendChild(status)}
}
let lastSchedulingSignal='';
function sync(){
 const r=root();if(!r)return false;
 injectCss();structure(r);
 const state=scheduleApi()?.getState?.()||{};
 const panel=document.querySelector(PANEL);
 const busy=String(panel?.getAttribute('aria-busy')||'false')==='true'||state.busy===true;
 const stage=String(state.generationStatus||'NONE').toUpperCase();
 r.dataset.ui2SchedulingState=stage;
 r.dataset.ui2SchedulingBusy=String(busy);
 const model=stageModel(state,busy);
 const banner=r.querySelector('.msu2-state-banner');
 if(banner){
  if(banner.dataset.tone!==model.tone)banner.dataset.tone=model.tone;
  const title=banner.querySelector('strong'),detail=banner.querySelector('.msu2-state-copy span'),chip=banner.querySelector('.msu2-state-chip');
  if(title&&title.textContent!==model.title)title.textContent=model.title;
  if(detail&&detail.textContent!==model.detail)detail.textContent=model.detail;
  if(chip&&chip.textContent!==model.chip)chip.textContent=model.chip;
 }
 const validate=r.querySelector('#msdValidate'),review=r.querySelector('#msdReview'),publish=r.querySelector('#msdPublish');
 for(const el of [validate,review,publish])if(el){el.classList.remove('primary','msu2-final-action');el.hidden=false}
 if(validate)validate.classList.add('msu2-final-action');
 if(review)review.classList.add('msu2-final-action');
 if(publish)publish.classList.add('msu2-final-action');
 if(stage==='DRAFT'){
  if(review)review.classList.add('primary');
  if(publish)publish.hidden=true;
 }else if(stage==='REVIEWED'){
  if(validate)validate.hidden=true;
  if(review)review.hidden=true;
  if(publish)publish.classList.add('primary');
 }else if(stage==='PUBLISHED'||stage==='NONE'){
  if(validate)validate.hidden=true;if(review)review.hidden=true;if(publish)publish.hidden=true;
 }else if(stage==='CONFLICT'){
  for(const id of ['msdStart','msdSave','msdValidate','msdReview','msdPublish']){
   const el=r.querySelector('#'+id);if(el){el.disabled=true;el.setAttribute('aria-disabled','true')}
  }
  if(validate)validate.hidden=true;if(review)review.hidden=true;if(publish)publish.hidden=true;
 }
 const conflict=r.querySelector('.msu2-conflict-resolution');if(conflict)conflict.dataset.visible=stage==='CONFLICT'?'1':'0';
 const signal=[stage,busy?1:0,String(state.lastValidation||''),Number(state.assignments?.length||0)].join('|');
 if(signal!==lastSchedulingSignal){
  lastSchedulingSignal=signal;
  document.dispatchEvent(new CustomEvent('magasin:manager-scheduling-ui-state',{detail:{stage,busy,lastValidation:state.lastValidation||null,assignmentCount:Number(state.assignments?.length||0)}}));
 }
 return true;
}
function boot(){
 injectCss();
 const p=document.querySelector(PANEL);
 if(!p){setTimeout(boot,80);return}
 sync();
 const observer=new MutationObserver(()=>sync());
 observer.observe(p,{childList:true,subtree:true,attributes:true,attributeFilter:['aria-busy']});
 window.MAGASIN_MANAGER_SCHEDULING_UI2_012={refresh:sync};
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
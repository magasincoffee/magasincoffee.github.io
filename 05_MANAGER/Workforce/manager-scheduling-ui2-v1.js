(()=>{'use strict';
if(window.__MAGASIN_MANAGER_SCHEDULING_UI2_012__)return;
window.__MAGASIN_MANAGER_SCHEDULING_UI2_012__=true;

const PANEL='#panel-publish';
const root=()=>document.querySelector(PANEL+' .msd[data-scheduling-actor="MANAGER"]');
const scheduleApi=()=>window.MAGASIN_MANAGER_SCHEDULE_DRAFT;
const css=`<style id="manager-scheduling-ui2-012-css">
.msd.msd-ui2-012{overflow:hidden;background:transparent;box-shadow:none}
.msd-ui2-012 .msd-head{display:grid;gap:14px;align-items:stretch}
.msd-ui2-012 .msu2-title h2{font-size:25px;line-height:32px;color:#101828;letter-spacing:-.01em}
.msd-ui2-012 .msu2-title .muted{max-width:760px;font-size:12px;line-height:18px}
.msu2-context-bar{display:grid;grid-template-columns:minmax(240px,.8fr) minmax(360px,1.2fr);gap:10px}
.msu2-control-group,.msu2-draft-actions{border:1px solid #dfe5ec;border-radius:12px;background:#fff;padding:10px}
.msu2-control-label,.msu2-section-kicker{display:block;margin-bottom:5px;color:#667085;font-size:10px;font-weight:900;letter-spacing:.08em;text-transform:uppercase}
.msu2-control-group .btn{width:100%;min-width:0}
.msu2-week-controls{display:grid;grid-template-columns:42px minmax(112px,1fr) 42px auto;gap:6px;align-items:center}
.msu2-week-controls .badge{display:flex;align-items:center;justify-content:center;min-height:40px;white-space:nowrap}
.msu2-draft-actions{display:flex;gap:8px;justify-content:flex-end;align-items:end;margin-top:10px}
.msu2-draft-actions .btn{min-height:40px}
.msu2-draft-actions #msdSave{min-width:150px}
.msu2-stage-rail{display:grid!important;grid-template-columns:repeat(5,minmax(0,1fr));gap:7px!important;margin-top:14px!important}
.msu2-stage-rail .msd-pill{display:flex;align-items:center;justify-content:center;min-height:36px;text-align:center;border:1px solid #dce5f0;background:#f8fafc;color:#667085}
.msu2-stage-rail .msd-pill.msd-warning{border-color:#f2d58a;background:#fff8e1;color:#805b08}
.msu2-stage-rail .msd-pill.msd-ok{border-color:#b7dfc5;background:#edf8f1;color:#256d43}
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
.msd-ui2-012 .msd-source{background:#fbfdff}
.msd-ui2-012 .msd-source-list{display:grid;grid-auto-flow:column;grid-auto-columns:minmax(220px,260px);grid-template-columns:none;gap:8px;max-height:none;overflow-x:auto;overflow-y:hidden;padding-bottom:3px;scrollbar-gutter:stable}
.msd-ui2-012 .msd-source-row{min-width:0;background:#fff}
.msd-ui2-012 .msd-board-wrap{overflow-x:auto;overflow-y:hidden;overscroll-behavior-x:contain;scrollbar-gutter:stable}
.msd-ui2-012 .msd-board{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:6px;min-width:0;width:100%}
.msd-ui2-012 .msd-day{min-width:0;border-radius:10px;background:#fcfdff}
.msd-ui2-012 .msd-day-title{position:sticky;left:0;padding:9px 8px;background:#f4f7fb}
.msd-ui2-012 .msd-card{margin:6px;padding:8px}
.msd-ui2-012 .msd-time-row{grid-template-columns:1fr;gap:3px}
.msd-ui2-012 .msd-input{height:38px}
.msd-ui2-012 .msd-empty{min-height:72px;display:grid;place-items:center;border:1px dashed #dce5f0;border-radius:9px;margin:6px;color:#667085;background:#fff}
.msd-ui2-012 .msd-downstream{margin-top:12px;padding:14px;border:1px solid #dfe5ec;border-radius:13px;background:#fff}
.msd-ui2-012 .msd-downstream .msd-actions{gap:8px}
.msd-ui2-012 .msd-downstream .btn{min-width:140px}
.msd-ui2-012 #msdStatus{role:status}
.msd-ui2-012 .msd-status{border:1px solid #d8e5f4}
.msd-ui2-012 .msd-status.error{border-color:#efc0bc}.msd-ui2-012 .msd-status.ok{border-color:#badfc8}
.msd-ui2-012 .msd-official-row{min-height:48px}
.msd-ui2-012 button:focus-visible,.msd-ui2-012 select:focus-visible,.msd-ui2-012 .msd-board-wrap:focus-visible{outline:2px solid #2f6fde!important;outline-offset:2px!important}
@media(max-width:1100px){
 .msd-ui2-012 .msd-board{grid-template-columns:repeat(7,minmax(156px,1fr));min-width:1128px;width:max-content}
}
@media(max-width:1024px){
 .msu2-context-bar{grid-template-columns:minmax(0,1fr)}
 .msu2-week-controls{grid-template-columns:44px minmax(112px,1fr) 44px}
 .msu2-week-controls .badge{grid-column:1/-1}
 .msu2-draft-actions{display:grid;grid-template-columns:1fr 1fr;margin-top:8px}
 .msu2-draft-actions #msdSave{grid-column:1/-1;min-width:0}
 .msd-ui2-012 button,.msd-ui2-012 select{min-height:44px!important}
 .msu2-draft-actions .btn,.msu2-control-group .btn,.msu2-week-controls .btn,.msd-ui2-012 .msd-source-row .btn,.msd-ui2-012 .msd-downstream .btn{min-height:44px!important}
 .msd-ui2-012 .msd-input{min-height:44px!important;height:44px!important}
 .msd-ui2-012 .msd-source-list{grid-auto-flow:row;grid-auto-columns:auto;grid-template-columns:repeat(2,minmax(0,1fr));overflow:visible}
 .msd-ui2-012 .msd-downstream .msd-actions{display:grid;grid-template-columns:1fr 1fr}
 .msd-ui2-012 .msd-downstream .btn{min-width:0}
 .msd-ui2-012 .msd-downstream #msdPublish{grid-column:1/-1}
}
@media(max-width:520px){
 .msd-ui2-012 .msu2-title h2{font-size:22px;line-height:28px}
 .msu2-stage-rail{grid-template-columns:repeat(2,minmax(0,1fr))}
 .msu2-stage-rail .msd-pill:last-child{grid-column:1/-1}
 .msu2-state-banner{display:grid}
 .msu2-state-chip{justify-self:start}
 .msd-ui2-012 .msd-source-list{grid-template-columns:1fr}
 .msd-ui2-012 .msd-downstream .msd-actions{grid-template-columns:1fr}
 .msd-ui2-012 .msd-downstream #msdPublish{grid-column:auto}
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
 if(busy)return {tone:'busy',chip:'ĐANG ĐỒNG BỘ',title:'Đang cập nhật canonical state',detail:'Giữ nguyên store/week hiện tại; thao tác được khóa trong lúc server xử lý.'};
 if(stage==='DRAFT')return {tone:'draft',chip:'DRAFT',title:'Đang soạn lịch tuần',detail:'Chỉnh assignment, lưu draft rồi kiểm tra xung đột trước khi duyệt.'};
 if(stage==='REVIEWED')return {tone:'reviewed',chip:'REVIEWED',title:'Đã duyệt · chờ phát hành',detail:'Draft đã qua review. Phát hành sẽ tạo lịch chính thức qua canonical writer.'};
 if(stage==='PUBLISHED')return {tone:'published',chip:'PUBLISHED',title:'Đã phát hành',detail:'Official Schedule bên dưới được đọc lại từ canonical work_schedules.'};
 if(stage==='CONFLICT')return {tone:'conflict',chip:'CONFLICT',title:'Khóa do nhiều phiên cùng store/week',detail:'Không cho authoring tiếp tục cho tới khi canonical generation conflict được giải quyết.'};
 return {tone:'none',chip:'NONE',title:'Chưa có phiên xếp lịch',detail:'Chọn cửa hàng và tuần, sau đó tạo hoặc mở đúng một canonical draft.'};
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
  const storeGroup=group('msu2-control-group','Cửa hàng đang xếp');
  const weekGroup=group('msu2-control-group','Tuần vận hành · Asia/Ho_Chi_Minh');
  const weekControls=document.createElement('div');weekControls.className='msu2-week-controls';
  const store=actions.querySelector('#msdStore');
  const weekButtons=[...actions.querySelectorAll('[data-msd-week]')];
  const badge=actions.querySelector('.badge');
  if(store)storeGroup.appendChild(store);
  for(const b of weekButtons)weekControls.appendChild(b);
  if(badge)weekControls.appendChild(badge);
  weekGroup.appendChild(weekControls);
  context.append(storeGroup,weekGroup);

  const draftActions=group('msu2-draft-actions','Phiên nháp');
  for(const id of ['msdStart','msdReload','msdSave']){const el=actions.querySelector('#'+id);if(el)draftActions.appendChild(el)}
  actions.remove();
  head.append(context,draftActions);
 }
 const summaries=[...r.querySelectorAll(':scope > .msd-summary')];
 if(summaries[0]){
  summaries[0].classList.add('msu2-stage-rail');
  summaries[0].setAttribute('role','list');
  summaries[0].querySelectorAll('.msd-pill').forEach(x=>x.setAttribute('role','listitem'));
  const banner=document.createElement('div');
  banner.className='msu2-state-banner';
  banner.innerHTML='<div class="msu2-state-copy"><strong></strong><span></span></div><span class="msu2-state-chip"></span>';
  summaries[0].after(banner);
 }
 if(summaries[1])summaries[1].classList.add('msu2-state-summary');

 const source=r.querySelector('.msd-source');
 const sourceTitle=source?.querySelector(':scope > b');
 if(sourceTitle&&!source.querySelector(':scope > .msu2-section-kicker')){
  const k=document.createElement('span');k.className='msu2-section-kicker';k.textContent='Nguồn vào';sourceTitle.before(k);
 }
 const board=r.querySelector('.msd-board-wrap');
 const boardTitle=board?.querySelector(':scope > b');
 if(boardTitle&&!board.querySelector(':scope > .msu2-section-kicker')){
  const k=document.createElement('span');k.className='msu2-section-kicker';k.textContent='Bảng nháp 7 ngày';boardTitle.before(k);
 }
 if(board){
  board.tabIndex=0;
  board.setAttribute('role','region');
  board.setAttribute('aria-label','Bảng lịch nháp 7 ngày; có thể cuộn ngang ở màn hình hẹp');
 }
 const downstream=r.querySelector('.msd-downstream');
 if(downstream&&!downstream.querySelector(':scope > .msu2-section-kicker')){
  const k=document.createElement('span');k.className='msu2-section-kicker';k.textContent='Tiến trình phát hành';downstream.prepend(k);
 }
 const status=r.querySelector('#msdStatus');
 if(status){status.setAttribute('role','status');status.setAttribute('aria-live','polite')}
}
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
 if(stage==='CONFLICT'){
  for(const id of ['msdStart','msdSave','msdValidate','msdReview','msdPublish']){
   const el=r.querySelector('#'+id);if(el){el.disabled=true;el.setAttribute('aria-disabled','true')}
  }
 }
 return true;
}
function boot(){
 injectCss();
 const p=document.querySelector(PANEL);
 if(!p){setTimeout(boot,80);return}
 sync();
 const observer=new MutationObserver(()=>sync());
 observer.observe(p,{childList:true,subtree:true,attributes:true,attributeFilter:['aria-busy','class']});
 window.MAGASIN_MANAGER_SCHEDULING_UI2_012={refresh:sync};
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
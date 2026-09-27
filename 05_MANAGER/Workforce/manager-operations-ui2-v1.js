(()=>{'use strict';
if(window.__MAGASIN_MANAGER_OPERATIONS_UI2_013__)return;
window.__MAGASIN_MANAGER_OPERATIONS_UI2_013__=true;

const MODULES={
 swap:{root:'#view-swap',api:'MAGASIN_MANAGER_SHIFT_CHANGE',label:'Đổi / cho ca',scope:false,head:':scope > .row',controls:':scope > .row .actions'},
 attendance:{root:'#view-attendance',api:'MAGASIN_MANAGER_ATTENDANCE_REVIEW',label:'Chấm công',scope:true,head:'.mar-head',controls:'.mar-actions'},
 staff:{root:'#view-staff',api:'MAGASIN_MANAGER_STAFF_PROJECTION',label:'Nhân viên',scope:true,head:'.msp-head',controls:'.msp-actions'},
 payroll:{root:'#view-payroll-self-check',api:'MAGASIN_MANAGER_PAYROLL_SELF_CHECK',label:'Công / Lương',scope:true,head:'.mgr-payroll-head',controls:'.mgr-payroll-actions'}
};
const css=`<style id="manager-operations-ui2-013-css">
.mui2-module{min-width:0;max-width:100%;overflow:hidden}
.mui2-module>*{min-width:0;max-width:100%}
.mui2-module-head{display:grid!important;grid-template-columns:minmax(0,1fr) auto;gap:14px!important;align-items:start!important;margin-bottom:0!important}
.mui2-module-head h2{margin:0!important;color:#101828;font-size:24px;line-height:31px;letter-spacing:-.01em}
.mui2-module-head .muted{max-width:760px;font-size:12px;line-height:18px;color:#667085}
.mui2-module-controls{display:flex;gap:7px!important;align-items:center;flex-wrap:wrap;padding:9px;border:1px solid #e1e6ed;border-radius:12px;background:#fff}
.mui2-module-controls select{min-width:210px}
.mui2-state-banner{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;margin:12px 0;padding:12px 14px;border:1px solid #d9e1ea;border-radius:12px;background:#fff}
.mui2-state-copy{display:grid;gap:3px;min-width:0}.mui2-state-copy strong{color:#101828;font-size:13px;line-height:18px}.mui2-state-copy span{color:#667085;font-size:11px;line-height:17px}
.mui2-state-chip{flex:0 0 auto;padding:6px 9px;border-radius:999px;background:#f2f4f7;color:#475467;font-size:10px;font-weight:900;letter-spacing:.05em}
.mui2-state-banner[data-state="LOADING"]{border-style:dashed;background:#f8fafc}.mui2-state-banner[data-state="LOADING"] .mui2-state-chip{background:#eef2f6}
.mui2-state-banner[data-state="ERROR"]{border-color:#efc0bc;background:#fff8f7}.mui2-state-banner[data-state="ERROR"] .mui2-state-chip{background:#fee4e2;color:#912018}
.mui2-state-banner[data-state="ACTION_REQUIRED"]{border-color:#e7cf91;background:#fffaf0}.mui2-state-banner[data-state="ACTION_REQUIRED"] .mui2-state-chip{background:#fff1c6;color:#795700}
.mui2-state-banner[data-state="READY"]{border-color:#badfc8;background:#f6fbf7}.mui2-state-banner[data-state="READY"] .mui2-state-chip{background:#e8f5ed;color:#23754a}
.mui2-state-banner[data-state="EMPTY"]{background:#fbfcfd}.mui2-state-banner[data-state="EMPTY"] .mui2-state-chip{background:#f2f4f7;color:#667085}
.mui2-module .card,.mui2-module .mar-card,.mui2-module .item{border-color:#dfe5ec!important;border-radius:13px!important;box-shadow:0 1px 2px rgba(16,24,40,.035)}
.mui2-module section.card{margin-top:12px!important;padding:14px!important}
.mui2-module section.card>h3,.mui2-module section.card>.row h3{color:#344054;font-size:14px;line-height:20px}
.mui2-module .actions,.mui2-module .mar-buttons{gap:8px!important}
.mui2-module [class*="state"],.mui2-module #mSwapMsg{line-height:18px}
.mui2-table-region,.mui2-module .mar-reviewed,.mui2-module .msp-table-wrap,.mui2-module .mgr-payroll-table-wrap{max-width:100%;overflow-x:auto!important;overflow-y:hidden;overscroll-behavior-x:contain;scrollbar-gutter:stable}
.mui2-module table{max-width:none}
.mui2-module button:focus-visible,.mui2-module select:focus-visible,.mui2-module input:focus-visible,.mui2-table-region:focus-visible,.mui2-module .mar-reviewed:focus-visible,.mui2-module .msp-table-wrap:focus-visible,.mui2-module .mgr-payroll-table-wrap:focus-visible{outline:2px solid #2f6fde!important;outline-offset:2px!important}
#view-swap.mui2-module .item>.row{align-items:center!important}
#view-swap.mui2-module .item .actions{flex:0 0 auto}
#view-swap.mui2-module .msw-state{padding:16px;border:1px dashed #d8e1ea;border-radius:10px;background:#fbfcfd;color:#667085;font-size:12px}
#view-swap.mui2-module .msw-state.error{border-color:#efc0bc;background:#fff8f7;color:#912018}
#view-attendance.mui2-module .mar-summary{margin-top:0}
#view-attendance.mui2-module .mar-card-head{align-items:center}
#view-attendance.mui2-module .mar-state,#view-staff.mui2-module .msp-state,#view-payroll-self-check.mui2-module .mgr-payroll-status,#view-payroll-self-check.mui2-module .mgr-payroll-note{border:1px solid #dfe5ec}
#view-staff.mui2-module .msp-table-wrap,#view-payroll-self-check.mui2-module .mgr-payroll-table-wrap{margin-top:10px}
@media(max-width:900px){
 .mui2-module-head{grid-template-columns:minmax(0,1fr)}
 .mui2-module-controls{width:100%;display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))}
 .mui2-module-controls select{min-width:0;width:100%;grid-column:1/-1}
 .mui2-module button,.mui2-module select,.mui2-module input{min-height:44px!important}
 .mui2-module .btn{min-height:44px!important}
 #view-swap.mui2-module .item>.row{align-items:flex-start!important}
 #view-swap.mui2-module .item .actions{display:grid;grid-template-columns:1fr 1fr;width:100%;margin-top:10px}
 #view-attendance.mui2-module .mar-buttons{display:grid;grid-template-columns:1fr 1fr}
 #view-attendance.mui2-module .mar-buttons [data-review="REJECT"]{grid-column:1/-1}
}
@media(max-width:520px){
 .mui2-module-head h2{font-size:22px;line-height:28px}
 .mui2-state-banner{display:grid}.mui2-state-chip{justify-self:start}
 .mui2-module-controls{grid-template-columns:1fr}
 .mui2-module-controls select{grid-column:auto}
 #view-swap.mui2-module .item>.row{display:grid!important}
 #view-swap.mui2-module .item .actions{grid-template-columns:1fr}
 #view-attendance.mui2-module .mar-buttons{grid-template-columns:1fr}
 #view-attendance.mui2-module .mar-buttons [data-review="REJECT"]{grid-column:auto}
 #view-attendance.mui2-module .mar-summary{grid-template-columns:1fr!important}
 .mui2-module section.card{padding:12px!important}
}
</style>`;

function injectCss(){
 if(document.getElementById('manager-operations-ui2-013-css'))return;
 document.head.insertAdjacentHTML('beforeend',css);
}
function stateOf(key,data){
 if(data?.loading)return {state:'LOADING',title:'Đang tải canonical state',detail:'Dữ liệu hiện tại được khóa theo reader của module trong lúc làm mới.'};
 if(data?.error)return {state:'ERROR',title:'Không tải được dữ liệu',detail:'Không sử dụng dữ liệu cũ. Hãy làm mới module để đọc lại canonical state.'};
 if(key==='swap'){
  const n=(data?.swaps||[]).length+(data?.gives||[]).length;
  return n?{state:'ACTION_REQUIRED',title:n+' yêu cầu chờ Manager',detail:'Chỉ các yêu cầu đã qua bước Employee mới có hành động Manager.'}:{state:'EMPTY',title:'Không có yêu cầu chờ xử lý',detail:'Không có Swap/Give đủ điều kiện Manager action trong reader hiện tại.'};
 }
 if(key==='attendance'){
  const rows=data?.rows||[],pending=rows.filter(r=>['NORMAL','NEEDS_REVIEW'].includes(String(r?.status||'').toUpperCase())).length;
  if(pending)return {state:'ACTION_REQUIRED',title:pending+' attendance cần review',detail:'APPROVE / ADJUST / REJECT vẫn đi qua canonical review_attendance_v1.'};
  return rows.length?{state:'READY',title:'Không còn attendance chờ review',detail:'Các bản ghi hiển thị bên dưới là canonical reviewed state.'}:{state:'EMPTY',title:'Không có attendance trong phạm vi',detail:'Không có raw attendance hoặc reviewed row cho store/week hiện tại.'};
 }
 const rows=data?.rows||[];
 if(key==='staff')return rows.length?{state:'READY',title:rows.length+' nhân viên trong projection',detail:'Read-only canonical profile projection theo store scope.'}:{state:'EMPTY',title:'Không có nhân viên trong phạm vi',detail:'Projection hiện tại không trả về row cho cửa hàng đã chọn.'};
 return rows.length?{state:'READY',title:rows.length+' payroll entry',detail:'Read-only confirmed-work projection; không có monetary hay state-transition authority.'}:{state:'EMPTY',title:'Không có payroll entry',detail:'Reader hiện tại không trả về payroll row cho cửa hàng đã chọn.'};
}
function setText(el,text){if(el&&el.textContent!==text)el.textContent=text}
function enhance(key,spec){
 const root=document.querySelector(spec.root);if(!root)return;
 root.classList.add('mui2-module');root.dataset.ui2OperationsModule=key;
 const head=root.querySelector(spec.head);
 if(head){
  head.classList.add('mui2-module-head');
  const controls=root.querySelector(spec.controls);if(controls)controls.classList.add('mui2-module-controls');
  if(spec.scope){
   const select=controls?.querySelector('select');
   if(select&&!select.getAttribute('aria-label'))select.setAttribute('aria-label','Cửa hàng trong phạm vi Manager');
  }
  let banner=root.querySelector('.mui2-state-banner');
  if(!banner){
   banner=document.createElement('div');banner.className='mui2-state-banner';banner.setAttribute('role','status');banner.setAttribute('aria-live','polite');
   banner.innerHTML='<div class="mui2-state-copy"><strong></strong><span></span></div><span class="mui2-state-chip"></span>';
   head.after(banner);
  }
 }
 root.querySelectorAll('.mar-reviewed,.msp-table-wrap,.mgr-payroll-table-wrap').forEach(el=>{
  el.classList.add('mui2-table-region');el.tabIndex=0;el.setAttribute('role','region');el.setAttribute('aria-label','Bảng dữ liệu có thể cuộn ngang khi cần');
 });
 root.querySelectorAll('#mSwapMsg,.mar-state,.msp-state,.mgr-payroll-status').forEach(el=>{el.setAttribute('role','status');el.setAttribute('aria-live','polite')});
}
function syncOne(key,spec){
 enhance(key,spec);
 const root=document.querySelector(spec.root);if(!root)return;
 let data={};
 try{data=window[spec.api]?.getState?.()||{}}catch(e){data={error:String(e?.message||e)}}
 const model=stateOf(key,data);
 root.dataset.ui2OperationsState=model.state;
 const banner=root.querySelector('.mui2-state-banner');if(!banner)return;
 if(banner.dataset.state!==model.state)banner.dataset.state=model.state;
 setText(banner.querySelector('.mui2-state-copy strong'),model.title);
 setText(banner.querySelector('.mui2-state-copy span'),model.detail);
 setText(banner.querySelector('.mui2-state-chip'),model.state);
}
let raf=0;
function syncAll(){
 if(raf)return;
 raf=requestAnimationFrame(()=>{raf=0;injectCss();for(const [key,spec] of Object.entries(MODULES))syncOne(key,spec)});
}
function boot(){
 injectCss();syncAll();
 const observer=new MutationObserver(syncAll);
 observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class','aria-busy','disabled']});
 document.addEventListener('click',()=>setTimeout(syncAll,0),true);
 document.addEventListener('change',()=>setTimeout(syncAll,0),true);
 window.MAGASIN_MANAGER_OPERATIONS_UI2_013={refresh:syncAll,getState:()=>Object.fromEntries(Object.entries(MODULES).map(([key,spec])=>[key,document.querySelector(spec.root)?.dataset.ui2OperationsState||'NOT_READY']))};
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
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
const client=()=>{const ctx=window.MAGASIN_MANAGER_WORKFORCE_CONTEXT;if(!ctx?.client)throw Error('MANAGER_CONTEXT_NOT_READY');return ctx.client()};
const state={week:null,stores:[],requirements:[],editing:false,loading:false,busy:false,loaded:false,message:'',messageType:'',unconfiguredEmployeeCount:0,shortages:[],assignmentCount:null};
const mount=()=>document.getElementById('xstoreAutomationMount');
const validBlock=r=>r.store_id&&Number(r.day_of_week)>=1&&Number(r.day_of_week)<=7&&r.start_time&&r.end_time&&Number(r.target_headcount)>0;
const configuredStoreIds=()=>new Set(state.requirements.filter(validBlock).map(r=>String(r.store_id)));
const configuredStoreCount=()=>state.stores.filter(s=>configuredStoreIds().has(String(s.id))).length;

function ensureCss(){
 if(document.getElementById('xstore-auto-schedule-v1-css'))return;
 const s=document.createElement('style');s.id='xstore-auto-schedule-v1-css';
 s.textContent=`
.xsa{
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
.xsa-flow{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-top:14px}
.xsa-step{border:1px solid var(--m-border-default,#EAECF0);border-radius:12px;background:var(--m-color-neutral-50,#F9FAFB);padding:12px}
.xsa-step b{display:block;font-size:13px;line-height:18px}
.xsa-step span{display:block;margin-top:4px;font-size:12px;line-height:18px;color:var(--m-color-neutral-500,#667085)}
.xsa-step.ready{border-color:#B7DFC5;background:var(--m-color-success-soft,#ECFDF3)}
.xsa-step.warn{border-color:#E8D194;background:var(--m-color-warning-soft,#FFFAEB)}
.xsa-summary{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}
.xsa-pill{font-size:12px;line-height:18px;font-weight:700;padding:5px 9px;border-radius:999px;background:var(--m-color-info-soft,#EFF6FF);color:var(--m-color-info,#2F6FDE)}
.xsa-pill.ok{background:var(--m-color-success-soft,#ECFDF3);color:var(--m-color-success,#217653)}
.xsa-pill.warn{background:var(--m-color-warning-soft,#FFFAEB);color:var(--m-color-warning,#8A5A00)}
.xsa-recurring-note{margin-top:14px;padding:11px 13px;border:1px solid var(--m-border-default,#EAECF0);border-radius:10px;background:var(--m-color-neutral-50,#F9FAFB);color:var(--m-color-neutral-700,#344054);font-size:12px;line-height:18px}
.xsa-board-wrap{overflow:auto;margin-top:12px;border:1px solid var(--m-border-default,#EAECF0);border-radius:12px;background:#fff;overscroll-behavior-x:contain;scrollbar-gutter:stable}
.xsa-board{width:100%;border-collapse:collapse;min-width:1160px;table-layout:fixed}
.xsa-board th,.xsa-board td{border-right:1px solid var(--m-color-neutral-200,#EAECF0);border-bottom:1px solid var(--m-color-neutral-200,#EAECF0);padding:8px;vertical-align:top}
.xsa-board th{background:var(--m-color-neutral-50,#F9FAFB);color:var(--m-color-neutral-700,#344054);font-size:11px;line-height:16px;text-align:left;white-space:nowrap}
.xsa-board th:first-child,.xsa-board td:first-child{position:sticky;left:0;z-index:2;background:#fff;width:180px;min-width:180px}
.xsa-store-name{font-size:12px;line-height:18px;font-weight:700;color:var(--m-color-neutral-950,#101828)}
.xsa-store-sub{font-size:11px;line-height:16px;color:var(--m-color-neutral-500,#667085);margin-top:2px}
.xsa-cell{width:140px;min-width:140px}
.xsa-empty{font-size:12px;color:var(--m-color-neutral-500,#667085);padding:7px 2px}
.xsa-block{display:block;margin:0 0 6px;padding:8px;border-radius:8px;background:var(--m-color-info-soft,#EFF6FF);color:#174D82;font-size:12px;line-height:18px;font-weight:700}
.xsa-block-edit{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:6px;margin-bottom:7px;padding:7px;border:1px solid var(--m-border-default,#EAECF0);border-radius:9px;background:#fff}
.xsa-block-edit input,.xsa-block-edit select{width:100%;min-width:0;height:38px;border:1px solid var(--m-color-neutral-300,#D0D5DD);border-radius:8px;padding:0 7px;background:#fff;color:var(--m-color-neutral-950,#101828);font:inherit;font-size:12px}
.xsa-block-edit input[data-xsa-f="target_headcount"]{grid-column:1/2}
.xsa-block-edit .xsa-remove{grid-column:2/3}
.xsa-block-edit .magasin-time-select{width:100%!important;min-width:0!important;max-width:100%!important}
.xsa-remove{height:38px;padding:0 10px;border:1px solid #F0C7C7;border-radius:8px;background:#fff;color:var(--m-color-danger,#A33D32);cursor:pointer;font-size:16px}
.xsa-add-block{width:100%;min-height:38px;border:1px dashed #9CB7C7;border-radius:8px;background:#fff;color:var(--m-color-brand-700,#08747F);font-size:12px;font-weight:700;cursor:pointer}
.xsa-editor-actions{display:flex;justify-content:flex-end;gap:8px;align-items:center;flex-wrap:wrap;margin-top:12px}
.xsa-status{margin-top:10px;padding:10px 12px;border-radius:9px;background:var(--m-color-info-soft,#EFF6FF);color:#235DBA;font-size:12px;line-height:18px;white-space:pre-wrap}
.xsa-status.ok{background:var(--m-color-success-soft,#ECFDF3);color:var(--m-color-success,#217653)}
.xsa-status.error{background:var(--m-color-danger-soft,#FEF3F2);color:var(--m-color-danger,#A33D32)}
@media(max-width:1024px){
 .xsa-flow{grid-template-columns:1fr}
 .xsa-actions{width:100%}
 .xsa-actions .btn{flex:1 1 180px;min-height:44px}
 .xsa-board{min-width:1100px}
}
@media(max-width:600px){
 .xsa{padding:12px}
 .xsa-head{gap:12px}
 .xsa-actions{display:grid;grid-template-columns:1fr;width:100%}
 .xsa-actions .btn{width:100%}
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

function setMessage(text,type=''){state.message=text||'';state.messageType=type;render()}

function cellRows(storeId,day){
 return state.requirements.map((r,index)=>({r,index})).filter(x=>String(x.r.store_id)===String(storeId)&&Number(x.r.day_of_week)===Number(day));
}

function cellHtml(store,day){
 const rows=cellRows(store.id,day.id);
 const attr=esc(String(store.id)+'-'+day.id);
 if(!state.editing){
  return '<td class="xsa-cell" data-xsa-cell="'+attr+'">'+(rows.length?rows.map(({r})=>'<span class="xsa-block">'+esc(hm(r.start_time))+'–'+esc(hm(r.end_time))+' · '+esc(r.target_headcount)+' người</span>').join(''):'<div class="xsa-empty">—</div>')+'</td>';
 }
 const editors=rows.map(({r,index})=>
  '<div class="xsa-block-edit" data-xsa-block="'+index+'">'
   +'<input type="time" aria-label="Bắt đầu" data-xsa-f="start_time" value="'+esc(r.start_time)+'">'
   +'<input type="time" aria-label="Kết thúc" data-xsa-f="end_time" value="'+esc(r.end_time)+'">'
   +'<input type="number" min="1" max="20" step="1" aria-label="Số người" data-xsa-f="target_headcount" value="'+esc(r.target_headcount||1)+'">'
   +'<button class="xsa-remove" type="button" data-xsa-remove="'+index+'" aria-label="Xóa khung">×</button>'
  +'</div>'
 ).join('');
 return '<td class="xsa-cell" data-xsa-cell="'+attr+'">'+editors+'<button class="xsa-add-block" type="button" data-xsa-add-store="'+esc(store.id)+'" data-xsa-add-day="'+day.id+'">+ Khung</button></td>';
}

function boardHtml(){
 if(!state.stores.length)return '<div class="xsa-status">Chưa có cửa hàng trong phạm vi quản lý.</div>';
 return '<div class="xsa-board-wrap"><table class="xsa-board"><thead><tr><th>Cửa hàng</th>'+DAYS.map(d=>'<th>'+esc(d.label)+'<br><span style="font-weight:500">'+esc(d.name)+'</span></th>').join('')+'</tr></thead><tbody>'
  +state.stores.map(store=>'<tr><td><div class="xsa-store-name">'+esc(store.code)+' · '+esc(store.name)+'</div><div class="xsa-store-sub">Cấu hình cố định hàng tuần</div></td>'+DAYS.map(day=>cellHtml(store,day)).join('')+'</tr>').join('')
  +'</tbody></table></div>';
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
 const summary=[
  '<span class="xsa-pill">'+state.requirements.length+' khung cố định</span>',
  '<span class="xsa-pill '+(storeCount===totalStores&&totalStores?'ok':'warn')+'">'+storeCount+'/'+totalStores+' CN đã cấu hình</span>'
 ];
 if(state.unconfiguredEmployeeCount)summary.push('<span class="xsa-pill warn">'+state.unconfiguredEmployeeCount+' NV chưa có ưu tiên CN</span>');
 if(state.assignmentCount!==null)summary.push('<span class="xsa-pill ok">'+state.assignmentCount+' ca đã được xếp tự động</span>');
 m.innerHTML='<section class="xsa">'
  +'<div class="xsa-head"><div><div class="xsa-kicker">Nhân sự · Nhiều cửa hàng</div><h4>Nhu cầu nhân sự hàng tuần</h4><div class="muted" style="margin-top:5px">Cấu hình một lần theo cửa hàng × thứ trong tuần × khung giờ × số người. Giá trị được dùng lại cho các tuần sau cho đến khi Quản lý chỉnh và lưu.</div></div>'
  +'<div class="xsa-actions"><button class="btn" type="button" id="xsaStaff">Thiết lập ưu tiên nhân viên</button><button class="btn" type="button" id="xsaConfig">'+(state.editing?'Đang chỉnh':'Chỉnh nhu cầu hàng tuần')+'</button><button class="btn primary" type="button" id="xsaAuto"'+(!complete||state.loading||state.busy?' disabled':'')+'>Tạo lịch nháp tự động</button></div></div>'
  +'<div class="xsa-flow"><div class="xsa-step '+(priorityReady?'ready':'warn')+'"><b>1. Ưu tiên cửa hàng</b><span>'+(priorityReady?'Đã sẵn sàng':'Còn '+state.unconfiguredEmployeeCount+' nhân viên chưa được gán ưu tiên CN')+'</span></div>'
  +'<div class="xsa-step '+(requirementsReady?'ready':'warn')+'"><b>2. Nhu cầu nhân sự hàng tuần</b><span>'+(requirementsReady?'Đang dùng cấu hình cố định hàng tuần':'Chưa có cấu hình; Quản lý cần nhập dữ liệu thực tế')+'</span></div>'
  +'<div class="xsa-step '+(complete?'ready':'warn')+'"><b>3. Xếp lịch tự động</b><span>'+(complete?'Sẵn sàng áp dụng nhu cầu hàng tuần vào tuần đang chọn và tạo lịch nháp':'Cần cấu hình nhu cầu nhân sự cho đủ các cửa hàng trước khi xếp lịch tự động')+'</span></div></div>'
  +'<div class="xsa-summary">'+summary.join('')+'</div>'
  +'<div class="xsa-recurring-note"><b>Cấu hình cố định hàng tuần:</b> không chọn ngày lịch và không cần nhập lại mỗi tuần. Hệ thống không tự đoán số người.</div>'
  +boardHtml()
  +(state.editing?'<div class="xsa-editor-actions"><button class="btn" type="button" id="xsaCancel">Hủy thay đổi</button><button class="btn primary" type="button" id="xsaSave">Lưu nhu cầu hàng tuần</button></div>':'')
  +shortagesHtml()
  +(state.message?'<div class="xsa-status '+esc(state.messageType)+'">'+esc(state.message)+'</div>':'')
  +'</section>';
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
  state.requirements=[];state.loaded=false;state.message='Không tải được cấu hình nhu cầu hàng tuần: '+String(e?.message||e?.code||'UNKNOWN');state.messageType='error';
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
  state.editing=false;state.loaded=false;
  await loadRequirements();
  state.message='Đã lưu '+Number(q.data?.requirement_count??payload.length)+' khung nhu cầu hàng tuần. Cấu hình này được dùng lại cho mọi tuần cho đến khi bạn chỉnh và lưu.';state.messageType='ok';render();
 }catch(e){state.message='Lưu cấu hình nhu cầu thất bại: '+String(e?.message||e?.code||'UNKNOWN');state.messageType='error';render()}
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
 const complete=state.requirements.length>0&&state.stores.length>0&&configuredStoreCount()===state.stores.length;
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
  setTimeout(()=>window.MAGASIN_CROSS_STORE_MASTER?.refresh?.(),0);
 }catch(e){
  const raw=String(e?.message||e?.code||e||'UNKNOWN');
  const friendly=raw.includes('STAFFING_REQUIREMENT_INCOMPLETE')?'Chưa cấu hình nhu cầu nhân sự cho đủ các cửa hàng.'
   :raw.includes('OFFICIAL_WEEK_ALREADY_EXISTS')?'Tuần này đã có lịch chính thức; hệ thống không được ghi đè.'
   :raw.includes('NON_DRAFT_GENERATION_EXISTS')?'Có lịch đã duyệt hoặc phát hành trong tuần; hãy xử lý lịch hiện tại trước khi xếp tự động.'
   :raw.includes('STAFFING_REQUIREMENT_EMPTY')?'Chưa có nhu cầu nhân sự hàng tuần để xếp lịch tự động.'
   :'Xếp tự động thất bại: '+raw;
  state.message=friendly;state.messageType='error';
 }finally{state.busy=false;render()}
}

function bind(){
 const m=mount();if(!m)return;
 m.querySelector('#xsaStaff')?.addEventListener('click',()=>document.querySelector('[data-view="staff"]')?.click());
 m.querySelector('#xsaConfig')?.addEventListener('click',()=>{if(state.editing)syncFromDom();state.editing=!state.editing;state.message='';state.messageType='';render()});
 m.querySelector('#xsaCancel')?.addEventListener('click',()=>{state.editing=false;state.loaded=false;void loadRequirements()});
 m.querySelector('#xsaSave')?.addEventListener('click',saveRequirements);
 m.querySelector('#xsaAuto')?.addEventListener('click',autoSchedule);
 m.querySelectorAll('[data-xsa-add-store]').forEach(b=>b.addEventListener('click',()=>{
  syncFromDom();
  state.requirements.push({requirement_id:null,store_id:b.dataset.xsaAddStore||'',day_of_week:Number(b.dataset.xsaAddDay||0),start_time:'',end_time:'',target_headcount:1});
  render();
 }));
 m.querySelectorAll('[data-xsa-remove]').forEach(b=>b.addEventListener('click',()=>{
  syncFromDom();state.requirements.splice(Number(b.dataset.xsaRemove),1);render();
 }));
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
window.MAGASIN_XSTORE_AUTO_SCHEDULE={
 refresh:loadRequirements,
 getState:()=>({...state,stores:state.stores.map(x=>({...x})),requirements:state.requirements.map(x=>({...x})),shortages:state.shortages.map(x=>({...x}))})
};
ensureCss();
})();
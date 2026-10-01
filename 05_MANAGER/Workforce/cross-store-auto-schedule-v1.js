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
const state={week:null,stores:[],requirements:[],editing:false,loading:false,busy:false,loaded:false,message:'',messageType:'',unconfiguredEmployeeCount:0};
const mount=()=>document.getElementById('xstoreAutomationMount');
const validBlock=r=>r.store_id&&Number(r.day_of_week)>=1&&Number(r.day_of_week)<=7&&r.start_time&&r.end_time&&Number(r.target_headcount)>0;
const configuredStoreIds=()=>new Set(state.requirements.filter(validBlock).map(r=>String(r.store_id)));
const configuredStoreCount=()=>state.stores.filter(s=>configuredStoreIds().has(String(s.id))).length;

function ensureCss(){
 if(document.getElementById('xstore-auto-schedule-v1-css'))return;
 const s=document.createElement('style');s.id='xstore-auto-schedule-v1-css';
 s.textContent='.xsa{margin-top:14px;border:2px solid #69c7d2;border-radius:15px;background:linear-gradient(180deg,#f3fdff 0%,#fff 100%);padding:16px;box-shadow:0 8px 24px rgba(24,105,118,.08)}.xsa-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;flex-wrap:wrap}.xsa-head h4{margin:0;font-size:18px}.xsa-kicker{font-size:10px;font-weight:900;letter-spacing:.08em;color:#0b8190;text-transform:uppercase;margin-bottom:4px}.xsa-actions{display:flex;gap:8px;flex-wrap:wrap}.xsa-flow{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-top:12px}.xsa-step{border:1px solid #cfe4e8;border-radius:10px;background:#fff;padding:10px}.xsa-step b{display:block;font-size:12px}.xsa-step span{display:block;margin-top:3px;font-size:10px;color:#667085}.xsa-step.ready{border-color:#9bd7ad;background:#f1fbf4}.xsa-step.warn{border-color:#efd28c;background:#fff9e8}.xsa-step.locked{border-color:#cbd5e1;background:#f8fafc}.xsa-summary{display:flex;gap:7px;flex-wrap:wrap;margin-top:9px}.xsa-pill{font-size:10px;font-weight:900;padding:5px 8px;border-radius:999px;background:#eef5ff;color:#235dba}.xsa-pill.ok{background:#e7f5ec;color:#24724b}.xsa-pill.warn{background:#fff5d6;color:#825f00}.xsa-recurring-note{margin-top:12px;padding:10px 12px;border:1px solid #cfe4e8;border-radius:10px;background:#f7fcfd;color:#315b63;font-size:11px}.xsa-board-wrap{overflow:auto;margin-top:12px;border:1px solid #dce7ef;border-radius:11px;background:#fff}.xsa-board{width:100%;border-collapse:collapse;min-width:1180px}.xsa-board th,.xsa-board td{border-right:1px solid #eef2f6;border-bottom:1px solid #eef2f6;padding:8px;vertical-align:top}.xsa-board th{background:#f8fafc;color:#475467;font-size:10px;text-align:left;white-space:nowrap}.xsa-board th:first-child,.xsa-board td:first-child{position:sticky;left:0;z-index:2;background:#fff;min-width:150px}.xsa-store-name{font-size:11px;font-weight:900;color:#172b4d}.xsa-store-sub{font-size:9px;color:#667085;margin-top:3px}.xsa-cell{min-width:135px}.xsa-empty{font-size:10px;color:#98a2b3;padding:6px 2px}.xsa-block{display:block;margin:0 0 6px;padding:7px;border-radius:8px;background:#eef7ff;color:#174d82;font-size:10px;font-weight:900}.xsa-block-edit{display:grid;grid-template-columns:1fr 1fr 62px 30px;gap:4px;margin-bottom:6px;padding:6px;border:1px solid #d7e2ec;border-radius:8px;background:#fff}.xsa-block-edit input{width:100%;min-width:0;height:32px;box-sizing:border-box;border:1px solid #cad8e4;border-radius:6px;padding:0 5px;font-size:10px}.xsa-remove{height:32px;padding:0;border:1px solid #f0c7c7;border-radius:6px;background:#fff;color:#a33;cursor:pointer}.xsa-add-block{width:100%;height:30px;border:1px dashed #9cb7c7;border-radius:7px;background:#f8fcff;color:#296271;font-size:10px;font-weight:900;cursor:pointer}.xsa-editor-actions{display:flex;justify-content:flex-end;gap:8px;align-items:center;flex-wrap:wrap;margin-top:10px}.xsa-status{margin-top:10px;padding:9px 11px;border-radius:9px;background:#eef6ff;color:#235dba;font-size:11px;white-space:pre-wrap}.xsa-status.ok{background:#e8f5ed;color:#23754a}.xsa-status.error{background:#fbeaea;color:#9a3838}@media(max-width:900px){.xsa-flow{grid-template-columns:1fr}.xsa-actions{width:100%}.xsa-actions .btn{flex:1}}';
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

function render(){
 const m=mount();if(!m)return;
 ensureCss();
 const storeCount=configuredStoreCount();
 const totalStores=state.stores.length;
 const priorityReady=state.unconfiguredEmployeeCount===0;
 const requirementsReady=state.requirements.length>0;
 const summary=[
  '<span class="xsa-pill">'+state.requirements.length+' khung cố định</span>',
  '<span class="xsa-pill '+(storeCount===totalStores&&totalStores?'ok':'warn')+'">'+storeCount+'/'+totalStores+' CN đã cấu hình</span>'
 ];
 if(state.unconfiguredEmployeeCount)summary.push('<span class="xsa-pill warn">'+state.unconfiguredEmployeeCount+' NV chưa có ưu tiên CN</span>');
 m.innerHTML='<section class="xsa">'
  +'<div class="xsa-head"><div><div class="xsa-kicker">Workforce · Cross-store</div><h4>NHU CẦU NHÂN SỰ HÀNG TUẦN</h4><div class="muted" style="margin-top:5px">Cấu hình một lần theo cửa hàng × thứ trong tuần × khung giờ × số người. Giá trị được dùng lại cho các tuần sau cho đến khi Quản lý chỉnh và lưu.</div></div>'
  +'<div class="xsa-actions"><button class="btn" type="button" id="xsaStaff">Thiết lập ưu tiên nhân viên</button><button class="btn" type="button" id="xsaConfig">'+(state.editing?'Đang chỉnh':'Chỉnh nhu cầu tuần mẫu')+'</button><button class="btn primary" type="button" id="xsaAuto" disabled title="Chờ XSTORE-C04 chuyển Robot sang recurring staffing">Tạo DRAFT tự động · Chờ C04</button></div></div>'
  +'<div class="xsa-flow"><div class="xsa-step '+(priorityReady?'ready':'warn')+'"><b>1. Store Priority</b><span>'+(priorityReady?'Đã sẵn sàng':'Còn '+state.unconfiguredEmployeeCount+' nhân viên chưa được gán ưu tiên CN')+'</span></div>'
  +'<div class="xsa-step '+(requirementsReady?'ready':'warn')+'"><b>2. Nhu cầu nhân sự recurring</b><span>'+(requirementsReady?'Đang dùng cấu hình cố định hàng tuần':'Chưa có cấu hình; Quản lý cần nhập dữ liệu thực tế')+'</span></div>'
  +'<div class="xsa-step locked"><b>3. Auto Schedule</b><span>Đang tạm khóa đến XSTORE-C04 để Robot không đọc staffing truth date-bound cũ.</span></div></div>'
  +'<div class="xsa-summary">'+summary.join('')+'</div>'
  +'<div class="xsa-recurring-note"><b>Tuần mẫu cố định:</b> không chọn ngày lịch và không cần nhập lại mỗi tuần. Hệ thống không tự đoán số người.</div>'
  +boardHtml()
  +(state.editing?'<div class="xsa-editor-actions"><button class="btn" type="button" id="xsaCancel">Hủy thay đổi</button><button class="btn primary" type="button" id="xsaSave">Lưu cấu hình tuần mẫu</button></div>':'')
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

function autoSchedule(){
 setMessage('Auto Schedule đang tạm khóa đến XSTORE-C04 để tránh dùng staffing truth theo ngày/tuần cũ.','');
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
 state.week=detail.week||null;
 state.stores=Array.isArray(detail.stores)?detail.stores.map(x=>({...x})):[];
 state.unconfiguredEmployeeCount=Number(detail.unconfiguredEmployeeCount||0);
 render();
 if(!state.loaded)await loadRequirements();
}

document.addEventListener('magasin:xstore-master-rendered',e=>void onMaster(e.detail||{}));
window.MAGASIN_XSTORE_AUTO_SCHEDULE={
 refresh:loadRequirements,
 getState:()=>({...state,stores:state.stores.map(x=>({...x})),requirements:state.requirements.map(x=>({...x}))})
};
ensureCss();
})();
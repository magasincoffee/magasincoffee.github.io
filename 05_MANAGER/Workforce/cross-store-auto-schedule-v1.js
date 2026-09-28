(()=>{'use strict';
if(window.__MAGASIN_XSTORE_AUTO_SCHEDULE_V1__)return;
window.__MAGASIN_XSTORE_AUTO_SCHEDULE_V1__=true;

const U='https://menvbzlsncmpuvnaifxa.supabase.co',K='sb_publishable_HsvCS6HDZnCDInd9PUoh0g_V34wJVqx';
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const hm=v=>String(v||'').slice(0,5);
let sb=null;
const client=()=>sb||(sb=window.supabase.createClient(U,K,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}}));
const state={week:null,stores:[],requirements:[],editing:false,loading:false,busy:false,message:'',messageType:'',shortages:[],assignmentCount:null,unconfiguredEmployeeCount:0};
const mount=()=>document.getElementById('xstoreAutomationMount');
const storeById=id=>state.stores.find(s=>String(s.id)===String(id||''))||null;
const configuredStoreIds=()=>new Set(state.requirements.filter(r=>r.store_id&&r.work_date&&r.start_time&&r.end_time&&Number(r.target_headcount)>0).map(r=>String(r.store_id)));
const missingStores=()=>state.stores.filter(s=>!configuredStoreIds().has(String(s.id)));

function ensureCss(){
 if(document.getElementById('xstore-auto-schedule-v1-css'))return;
 const s=document.createElement('style');s.id='xstore-auto-schedule-v1-css';
 s.textContent='.xsa{margin-top:12px;border:1px solid #cfe0eb;border-radius:12px;background:#f8fcfd;padding:12px}.xsa-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;flex-wrap:wrap}.xsa-head h4{margin:0;font-size:15px}.xsa-actions{display:flex;gap:8px;flex-wrap:wrap}.xsa-summary{display:flex;gap:7px;flex-wrap:wrap;margin-top:9px}.xsa-pill{font-size:10px;font-weight:900;padding:5px 8px;border-radius:999px;background:#eef5ff;color:#235dba}.xsa-pill.ok{background:#e7f5ec;color:#24724b}.xsa-pill.warn{background:#fff5d6;color:#825f00}.xsa-editor{margin-top:12px;border-top:1px solid #dce7ef;padding-top:12px}.xsa-row{display:grid;grid-template-columns:minmax(170px,1.4fr) 145px 105px 105px 90px 44px;gap:7px;align-items:end;margin:7px 0}.xsa-field{display:grid;gap:4px}.xsa-field label{font-size:9px;font-weight:900;color:#667085;text-transform:uppercase}.xsa-field select,.xsa-field input{height:38px;border:1px solid #cad8e4;border-radius:8px;background:#fff;padding:0 8px;min-width:0}.xsa-remove{height:38px}.xsa-editor-actions{display:flex;justify-content:space-between;gap:8px;align-items:center;flex-wrap:wrap;margin-top:10px}.xsa-status{margin-top:10px;padding:9px 11px;border-radius:9px;background:#eef6ff;color:#235dba;font-size:11px;white-space:pre-wrap}.xsa-status.ok{background:#e8f5ed;color:#23754a}.xsa-status.error{background:#fbeaea;color:#9a3838}.xsa-shortage{margin-top:8px;padding:8px;border:1px solid #f1d79b;border-radius:8px;background:#fff9e8;color:#785a09;font-size:11px}@media(max-width:900px){.xsa-row{grid-template-columns:1fr 1fr 1fr}.xsa-remove{width:100%}}@media(max-width:560px){.xsa-row{grid-template-columns:1fr 1fr}.xsa-actions{width:100%}.xsa-actions .btn{flex:1}.xsa-field:first-child{grid-column:1/-1}}';
 document.head.appendChild(s);
}

function normalizeRequirement(r={}){return{
 requirement_id:r.requirement_id||null,
 store_id:r.store_id||'',
 work_date:String(r.work_date||'').slice(0,10),
 start_time:hm(r.start_time),
 end_time:hm(r.end_time),
 target_headcount:Number(r.target_headcount||1)
}}

function setMessage(text,type=''){state.message=text||'';state.messageType=type;render()}

function rowHtml(r,i){
 const storeOptions='<option value="">— Chọn cửa hàng —</option>'+state.stores.map(s=>'<option value="'+esc(s.id)+'"'+(String(s.id)===String(r.store_id||'')?' selected':'')+'>'+esc(s.code)+' · '+esc(s.name)+'</option>').join('');
 return '<div class="xsa-row" data-xsa-row="'+i+'">'
  +'<div class="xsa-field"><label>Cửa hàng</label><select data-xsa-f="store_id">'+storeOptions+'</select></div>'
  +'<div class="xsa-field"><label>Ngày</label><input type="date" data-xsa-f="work_date" value="'+esc(r.work_date)+'"></div>'
  +'<div class="xsa-field"><label>Bắt đầu</label><input type="time" data-xsa-f="start_time" value="'+esc(r.start_time)+'"></div>'
  +'<div class="xsa-field"><label>Kết thúc</label><input type="time" data-xsa-f="end_time" value="'+esc(r.end_time)+'"></div>'
  +'<div class="xsa-field"><label>Số người cần</label><input type="number" min="1" max="20" step="1" data-xsa-f="target_headcount" value="'+esc(r.target_headcount||1)+'"></div>'
  +'<button class="btn xsa-remove" type="button" data-xsa-remove="'+i+'" aria-label="Xóa dòng">×</button>'
  +'</div>';
}

function shortagesHtml(){
 if(!state.shortages.length)return '';
 return '<div class="xsa-shortage"><b>Robot chưa phủ đủ '+state.shortages.length+' khung:</b><br>'+state.shortages.slice(0,12).map(x=>{
   const store=state.stores.find(s=>String(s.id)===String(x.store_id||''));return esc((x.store_code||store?.code||'CN')+' · '+String(x.work_date||'').slice(0,10)+' · '+hm(x.start_time)+'–'+hm(x.end_time)+' · thiếu '+Number(x.missing||0));
 }).join('<br>')+'</div>';
}

function render(){
 const m=mount();if(!m)return;
 ensureCss();
 const missing=missingStores();
 const complete=state.stores.length>0&&missing.length===0&&state.requirements.length>0;
 const summary=[
   '<span class="xsa-pill">'+state.requirements.length+' khung nhu cầu</span>',
   '<span class="xsa-pill '+(complete?'ok':'warn')+'">'+(complete?'Đủ cấu hình 4 CN':'Thiếu '+missing.length+' CN')+'</span>'
 ];
 if(state.unconfiguredEmployeeCount)summary.push('<span class="xsa-pill warn">'+state.unconfiguredEmployeeCount+' NV chưa có ưu tiên CN</span>');
 if(state.assignmentCount!==null)summary.push('<span class="xsa-pill ok">'+state.assignmentCount+' ca Robot đã xếp</span>');
 const editor=state.editing
  ? '<div class="xsa-editor"><div class="muted">Nhập đúng nhu cầu thực tế cho từng cửa hàng/ngày/khung giờ. Hệ thống không tự đoán số người.</div>'
    +(state.requirements.length?state.requirements.map(rowHtml).join(''):'<div class="xsa-status">Chưa có khung nhu cầu. Bấm “+ Thêm khung”.</div>')
    +'<div class="xsa-editor-actions"><button class="btn" type="button" id="xsaAdd">+ Thêm khung</button><div><button class="btn" type="button" id="xsaCancel">Đóng</button> <button class="btn primary" type="button" id="xsaSave">Lưu nhu cầu tuần</button></div></div></div>'
  :'';
 m.innerHTML='<section class="xsa"><div class="xsa-head"><div><h4>Nhu cầu nhân sự & Xếp tự động</h4><div class="muted" style="margin-top:4px">Manager khai báo số người cần. Robot dùng Availability + Store Priority để tạo DRAFT tổng 4 cửa hàng.</div></div><div class="xsa-actions"><button class="btn" type="button" id="xsaConfig">'+(state.editing?'Đang cấu hình':'Cấu hình nhu cầu')+'</button><button class="btn primary" type="button" id="xsaAuto"'+(!complete||state.loading||state.busy?' disabled':'')+'>Xếp tự động</button></div></div><div class="xsa-summary">'+summary.join('')+'</div>'+editor+shortagesHtml()+(state.message?'<div class="xsa-status '+esc(state.messageType)+'">'+esc(state.message)+'</div>':'')+'</section>';
 bind();
}

function syncFromDom(){
 const m=mount();if(!m)return;
 const next=[];
 m.querySelectorAll('[data-xsa-row]').forEach(row=>{
   const get=f=>row.querySelector('[data-xsa-f="'+f+'"]')?.value||'';
   next.push({
     requirement_id:null,
     store_id:get('store_id'),
     work_date:get('work_date'),
     start_time:get('start_time'),
     end_time:get('end_time'),
     target_headcount:Number(get('target_headcount')||0)
   });
 });
 state.requirements=next;
}

function validateLocal(){
 if(!state.week)return 'Chưa xác định tuần.';
 const keys=new Set();
 for(const r of state.requirements){
   if(!r.store_id||!r.work_date||!r.start_time||!r.end_time||!Number(r.target_headcount))return 'Mỗi dòng phải có cửa hàng, ngày, giờ bắt đầu, giờ kết thúc và số người.';
   if(r.end_time<=r.start_time)return 'Giờ kết thúc phải sau giờ bắt đầu.';
   if(Number(r.target_headcount)<1||Number(r.target_headcount)>20)return 'Số người cần phải từ 1 đến 20.';
   const key=[r.store_id,r.work_date,r.start_time,r.end_time].join('|');
   if(keys.has(key))return 'Có hai dòng nhu cầu trùng cửa hàng/ngày/khung giờ.';
   keys.add(key);
 }
 return '';
}

async function loadRequirements(){
 if(!state.week)return;
 state.loading=true;render();
 try{
  const q=await client().rpc('list_cross_store_staffing_requirements_v1',{p_week_start:state.week});
  if(q.error)throw q.error;
  state.requirements=(Array.isArray(q.data)?q.data:[]).map(normalizeRequirement);
  state.message='';state.messageType='';
 }catch(e){
  state.requirements=[];state.message='Không tải được nhu cầu nhân sự: '+String(e?.message||e?.code||'UNKNOWN');state.messageType='error';
 }finally{state.loading=false;render()}
}

async function saveRequirements(){
 if(state.busy)return;
 syncFromDom();
 const error=validateLocal();if(error)return setMessage(error,'error');
 state.busy=true;render();
 try{
  const payload=state.requirements.map(r=>({store_id:r.store_id,work_date:r.work_date,start_time:r.start_time,end_time:r.end_time,target_headcount:Number(r.target_headcount)}));
  const q=await client().rpc('replace_cross_store_staffing_requirements_v1',{p_week_start:state.week,p_requirements:payload});
  if(q.error)throw q.error;
  state.editing=false;
  await loadRequirements();
  state.message='Đã lưu '+Number(q.data?.requirement_count??payload.length)+' khung nhu cầu. Robot chỉ sử dụng các dòng này.';state.messageType='ok';render();
 }catch(e){state.message='Lưu nhu cầu thất bại: '+String(e?.message||e?.code||'UNKNOWN');state.messageType='error';render()}
 finally{state.busy=false;render()}
}

async function callAuto(replaceExisting){
 const q=await client().rpc('auto_generate_cross_store_schedule_v1',{p_week_start:state.week,p_replace_existing:!!replaceExisting,p_algorithm_version:'XSTORE_GLOBAL_V1'});
 if(q.error)throw q.error;
 return q.data||{};
}

async function autoSchedule(){
 if(state.busy)return;
 state.busy=true;state.shortages=[];state.assignmentCount=null;render();
 try{
  let result;
  try{result=await callAuto(false)}
  catch(e){
    const raw=String(e?.message||e?.code||e||'');
    if(!raw.includes('EXISTING_DRAFT_REQUIRES_CONFIRMATION'))throw e;
    if(!confirm('Tuần này đã có bản nháp. Xếp tự động sẽ thay thế các assignment DRAFT hiện tại của 4 cửa hàng. Lịch đã duyệt/phát hành không bị thay đổi. Tiếp tục?')){state.message='Đã giữ nguyên bản nháp hiện tại.';state.messageType='';return}
    result=await callAuto(true);
  }
  state.assignmentCount=Number(result.assignment_count||0);
  state.shortages=Array.isArray(result.shortages)?result.shortages:[];
  state.message=state.shortages.length
   ? 'Robot đã tạo DRAFT nhưng còn '+state.shortages.length+' khung thiếu người. Quản lý cần kiểm tra và chỉnh trước khi duyệt.'
   : 'Robot đã tạo DRAFT tổng 4 cửa hàng. Quản lý hãy kiểm tra/chỉnh sửa trước khi duyệt và phát hành.';
  state.messageType=state.shortages.length?'':'ok';
  setTimeout(()=>window.MAGASIN_CROSS_STORE_MASTER?.refresh?.(),0);
 }catch(e){
  const raw=String(e?.message||e?.code||e||'UNKNOWN');
  const friendly=raw.includes('STAFFING_REQUIREMENT_INCOMPLETE')?'Chưa cấu hình nhu cầu cho đủ các cửa hàng.'
   :raw.includes('OFFICIAL_WEEK_ALREADY_EXISTS')?'Tuần này đã có lịch chính thức; Robot không được ghi đè.'
   :raw.includes('NON_DRAFT_GENERATION_EXISTS')?'Có lịch đã duyệt/phát hành trong tuần; hãy xử lý lịch hiện tại trước khi chạy Robot.'
   :raw.includes('STAFFING_REQUIREMENT_EMPTY')?'Chưa có nhu cầu nhân sự để Robot xếp.'
   :'Xếp tự động thất bại: '+raw;
  state.message=friendly;state.messageType='error';
 }finally{state.busy=false;render()}
}

function bind(){
 const m=mount();if(!m)return;
 m.querySelector('#xsaConfig')?.addEventListener('click',()=>{state.editing=!state.editing;render()});
 m.querySelector('#xsaAdd')?.addEventListener('click',()=>{syncFromDom();state.requirements.push({requirement_id:null,store_id:'',work_date:'',start_time:'',end_time:'',target_headcount:1});render()});
 m.querySelector('#xsaCancel')?.addEventListener('click',()=>{state.editing=false;void loadRequirements()});
 m.querySelector('#xsaSave')?.addEventListener('click',saveRequirements);
 m.querySelector('#xsaAuto')?.addEventListener('click',autoSchedule);
 m.querySelectorAll('[data-xsa-remove]').forEach(b=>b.addEventListener('click',()=>{syncFromDom();state.requirements.splice(Number(b.dataset.xsaRemove),1);render()}));
}

async function onMaster(detail={}){
 const week=detail.week||null;
 const changed=String(week||'')!==String(state.week||'');
 state.week=week;
 state.stores=Array.isArray(detail.stores)?detail.stores.map(x=>({...x})):[];
 state.unconfiguredEmployeeCount=Number(detail.unconfiguredEmployeeCount||0);
 state.assignmentCount=null;state.shortages=[];
 render();
 if(changed||!state.requirements.length)await loadRequirements();
}

document.addEventListener('magasin:xstore-master-rendered',e=>void onMaster(e.detail||{}));
window.MAGASIN_XSTORE_AUTO_SCHEDULE={
 refresh:loadRequirements,
 getState:()=>({...state,stores:state.stores.map(x=>({...x})),requirements:state.requirements.map(x=>({...x})),shortages:state.shortages.map(x=>({...x}))})
};
ensureCss();
})();
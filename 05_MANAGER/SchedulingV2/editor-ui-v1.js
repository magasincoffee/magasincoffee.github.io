(()=>{'use strict';
if(window.MAGASIN_SCHEDULING_V2_EDITOR_PREVIEW_ENABLED!==true||!new URLSearchParams(location.search).has('draft-editor'))return;
const table=document.getElementById('sv2Table'),store=document.getElementById('sv2Store'),week=document.getElementById('sv2Week'),refresh=document.getElementById('sv2Refresh');
if(!table||!store||!week||!refresh)return;
const weekNav=window.MAGASIN_SCHEDULING_V2_WEEK_NAV;
if(!weekNav?.weekStart||!weekNav?.dateOffset)throw Error('WEEK_NAV_NOT_READY');
const errorText=(e,shift={})=>{
 const message=String(e?.message||e||'');
 const date=String(shift.work_date||'').slice(0,10);
 const span=[shift.start_time,shift.end_time].map(x=>String(x||'').slice(0,5));
 const at=date&&span.every(x=>/^[0-9]{2}:[0-9]{2}$/.test(x))?' ('+date+', '+span.join('–')+')':'';
 if(/AVAILABILITY_MISMATCH/.test(message))return 'Ca làm việc'+at+' không nằm trọn trong thời gian nhân viên đã đăng ký có thể làm. Hãy xem mục Đăng ký lịch làm việc và chọn khoảng phù hợp. Không thể bỏ qua quy tắc kiểm tra.';
 if(/STORE_NOT_ALLOWED|FORBIDDEN|ROLE_NOT_ALLOWED/.test(message))return 'Bạn không được cấp quyền chỉnh lịch của chi nhánh này.';
 if(/DRAFT_LOCKED|PUBLISHED|WEEK_LOCKED/.test(message))return 'Lịch tuần này không còn cho phép sửa bản nháp.';
 if(/INVALID_TIME_SLOT|INVALID_SHIFT|INVALID_ASSIGNMENT/.test(message))return 'Giờ ca phải nằm trong khoảng 05:00–22:00 và chia hết cho 30 phút.';
 return 'Không lưu được ca. Vui lòng kiểm tra đăng ký của nhân viên, chi nhánh và tuần đang chọn, sau đó thử lại.';
};
const context=()=>window.MAGASIN_SCHEDULING_V2_CONTEXT;
async function employees(){const ctx=context();if(!ctx?.client||!ctx?.actor)throw Error('MANAGER_CONTEXT_NOT_READY');await ctx.actor({force:true});const result=await ctx.client().rpc('list_employee_workforce_profiles_v1');if(result.error)throw result.error;return (Array.isArray(result.data)?result.data:[]).filter(p=>String(p.profile_status||'').toUpperCase()==='ACTIVE'&&['STAFF','EMPLOYEE'].includes(String(p.employee_role||'').toUpperCase())&&Array.isArray(p.priority_store_ids)&&p.priority_store_ids.map(String).includes(String(store.value))).map(p=>({id:String(p.employee_id||p.user_id||''),name:String(p.full_name||p.employee_name||p.display_name||p.employee_id||p.user_id||'Nhân viên')})).filter(p=>p.id)}
function openDialog(node){if(document.getElementById('sv2ShiftLayer'))return;const editing=!!node,idx=editing?Number(node.dataset.sv2DraftIndex):-1;
if(editing&&(!Number.isInteger(idx)||idx<0))return;
const layer=document.createElement('div');layer.className='sv2-editor-layer';layer.id='sv2ShiftLayer';layer.innerHTML='<form class="sv2-editor-dialog" role="dialog" aria-modal="true" aria-label="Chỉnh ca nháp"><h2>Ca làm việc</h2><p>Thêm, thay đổi hoặc xóa ca nháp. Không sửa lịch chính thức.</p><label>Ngày <input type="date" name="date" required></label><label>Nhân viên <select name="employee" required><option value="">Đang tải danh sách…</option></select></label><label>Bắt đầu <select name="start" required aria-label="Giờ bắt đầu (24 giờ)"></select></label><label>Kết thúc <select name="end" required aria-label="Giờ kết thúc (24 giờ)"></select></label><p role="alert" data-error></p><div class="sv2-editor-actions"><button type="button" data-close>Hủy</button><button type="button" data-remove hidden>Xóa ca</button><button type="submit" data-save>Lưu bản nháp</button></div></form>';
document.body.appendChild(layer);const form=layer.querySelector('form'),save=layer.querySelector('[data-save]'),remove=layer.querySelector('[data-remove]'),err=layer.querySelector('[data-error]'),close=()=>{layer.remove();(node||document.getElementById('sv2AddShift'))?.focus()};
// Render explicit Vietnam business clock options; native time inputs can show SA/CH by browser locale.
for(const [name,first,last] of [['start',300,1290],['end',330,1320]]){
 const select=form.elements[name];
 for(let minute=first;minute<=last;minute+=30){
  const hh=String(Math.floor(minute/60)).padStart(2,'0');
  const mm=String(minute%60).padStart(2,'0');
  const option=document.createElement('option');option.value=hh+':'+mm;option.textContent=option.value;select.appendChild(option);
 }
}
const monday=()=>weekNav.weekStart(week.value);
const scopeAtOpen={storeId:store.value,weekStart:monday()};
if(!scopeAtOpen.weekStart){layer.remove();return;}
const dateInput=form.elements.date;
dateInput.min=scopeAtOpen.weekStart;
dateInput.max=weekNav.dateOffset(scopeAtOpen.weekStart,6);
const expected=editing?{id:node.dataset.sv2ShiftId||null,user_id:node.dataset.sv2UserId,work_date:node.dataset.sv2Date,start_time:node.dataset.sv2Start,end_time:node.dataset.sv2End}:null;
form.elements.date.value=editing?expected.work_date:week.value;form.elements.start.value=editing?String(expected.start_time||'').slice(0,5):'06:00';form.elements.end.value=editing?String(expected.end_time||'').slice(0,5):'10:00';remove.hidden=!editing;save.disabled=true;
layer.querySelector('[data-close]').addEventListener('click',close);layer.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();close()}});
employees().then(items=>{if(!layer.isConnected)return;const select=form.elements.employee;select.replaceChildren();for(const p of items){const o=document.createElement('option');o.value=p.id;o.textContent=p.name;select.appendChild(o)}if(editing){if(!items.some(p=>p.id===expected.user_id)){const o=document.createElement('option');o.value=expected.user_id;o.textContent='Nhân viên hiện tại (không đủ điều kiện mới)';select.appendChild(o)}select.value=expected.user_id}save.disabled=!items.length;form.elements.employee.focus()}).catch(e=>{err.textContent='Không thể tải nhân viên: '+errorText(e)});
function validSlot(){const m=x=>{const r=/^(\d{2}):(\d{2})$/.exec(x);return r?Number(r[1])*60+Number(r[2]):NaN};const a=m(form.elements.start.value),b=m(form.elements.end.value);return Number.isInteger(a)&&Number.isInteger(b)&&a>=300&&b<=1320&&a<b&&a%30===0&&b%30===0}
async function commit(operation){if(operation!=='remove'&&!validSlot())throw Error('Ca phải nằm trong 05:00–22:00, mỗi mốc cách nhau 30 phút.');
if(operation!=='remove'&&(dateInput.value<scopeAtOpen.weekStart||dateInput.value>dateInput.max))throw Error('Ca phải nằm trong tuần đang chọn.');const ops=window.MAGASIN_SCHEDULING_V2_DRAFT_OPERATIONS;if(!ops?.apply)throw Error('Bộ chỉnh ca chưa sẵn sàng');if(store.value!==scopeAtOpen.storeId||monday()!==scopeAtOpen.weekStart)throw Error('Chi nhánh hoặc tuần đã thay đổi. Đóng cửa sổ và mở lại.');const input={...scopeAtOpen,operation,index:idx,expected,assignment:{user_id:form.elements.employee.value,work_date:form.elements.date.value,start_time:form.elements.start.value,end_time:form.elements.end.value}};return ops.apply(input)}
function inputForError(){return {work_date:form.elements.date.value,start_time:form.elements.start.value,end_time:form.elements.end.value}}
async function registeredWindows(){
 try{
  const q=await context()?.client?.()?.rpc('get_manager_weekly_availability',{p_store_id:scopeAtOpen.storeId,p_week_start:scopeAtOpen.weekStart});
  if(q?.error||!Array.isArray(q?.data))return '';
  const id=String(form.elements.employee.value),day=String(dateInput.value);
  const hm=t=>/^([01][0-9]|2[0-3]):[0-5][0-9]/.exec(String(t||''))?.[0]||'';
  const bands=q.data.filter(r=>String(r.user_id)===id&&String(r.work_date).slice(0,10)===day).map(r=>[hm(r.start_time),hm(r.end_time)]).filter(a=>a.every(Boolean)).map(a=>a.join('–'));
  return bands.length?' Khoảng đã đăng ký trong ngày: '+[...new Set(bands)].join(', ')+'.':' Không tìm thấy khoảng đăng ký của nhân viên trong ngày này.';
 }catch(_){return ''}
}
async function execute(operation){save.disabled=true;remove.disabled=true;err.textContent='';try{if(!confirm(operation==='remove'?'Xóa ca khỏi bản nháp?':'Lưu thay đổi vào bản nháp và kiểm tra xung đột?'))return;const result=await commit(operation);close();refresh.click();if(!result.valid){const issues=JSON.stringify(result.violations||[]);if(/AVAILABILITY_MISMATCH/.test(issues))alert(errorText('AVAILABILITY_MISMATCH',inputForError())+await registeredWindows());else alert('Đã lưu bản nháp nhưng còn '+(result.violations?.length||0)+' lỗi cần xử lý.')}}catch(e){err.textContent='Không thể lưu: '+errorText(e,inputForError())+(/AVAILABILITY_MISMATCH/.test(String(e?.message||e))?await registeredWindows():'')}finally{if(layer.isConnected){save.disabled=false;remove.disabled=false}}}
form.addEventListener('submit',e=>{e.preventDefault();execute(editing?'replace':'add')});remove.addEventListener('click',()=>execute('remove'))}
table.addEventListener('click',e=>{const node=e.target.closest('[data-sv2-draft-index]');if(node)openDialog(node)});table.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target.closest('[data-sv2-draft-index]')){e.preventDefault();openDialog(e.target.closest('[data-sv2-draft-index]'))}});
const add=document.createElement('button');add.id='sv2AddShift';add.type='button';add.textContent='Thêm ca nháp';add.className='sv2-add-shift';add.addEventListener('click',()=>openDialog(null));document.querySelector('.sv2-bar')?.appendChild(add);
})();
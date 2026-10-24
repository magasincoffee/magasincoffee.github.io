(()=>{'use strict';
if(window.MAGASIN_WORKFORCE_AVAILABILITY_SUMMARY)return;
const DAY_NAMES=['Thứ 2','Thứ 3','Thứ 4','Thứ 5','Thứ 6','Thứ 7','Chủ nhật'];
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;':'&quot;',"'":'&#39;'}[c]));
const dayAdd=(s,n)=>{const d=new Date(String(s).slice(0,10)+'T00:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10)};
const monday=s=>{const d=new Date(String(s).slice(0,10)+'T00:00:00Z');return dayAdd(s,-((d.getUTCDay()+6)%7))};
function vietnamToday(){
 const p={};for(const item of new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()))if(item.type!=='literal')p[item.type]=item.value;
 return p.year+'-'+p.month+'-'+p.day;
}
const time=v=>String(v??'').slice(0,5);
const dateLabel=v=>String(v).slice(8,10)+'/'+String(v).slice(5,7);
const isActive=p=>String(p.profile_status||'').toUpperCase()==='ACTIVE'&&['STAFF','EMPLOYEE'].includes(String(p.employee_role||'').toUpperCase());
function css(){
 if(document.getElementById('availability-summary-487-css'))return;
 const style=document.createElement('style');style.id='availability-summary-487-css';
 style.textContent='.as487{min-width:0;color:#16243a}.as487-head{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;flex-wrap:wrap}.as487-head h2{margin:0;font-size:22px}.as487-desc{font-size:12px;color:#667085;margin-top:5px;line-height:1.6}.as487-controls{display:flex;gap:9px;flex-wrap:wrap;align-items:end;margin:14px 0}.as487-field{display:grid;gap:4px;font-size:12px;font-weight:700;color:#475467}.as487-field select,.as487-field input{min-height:44px;min-width:125px;border:1px solid #cbd5e1;border-radius:9px;background:#fff;padding:8px 10px;color:#101828;max-width:100%}.as487-actions{display:flex;gap:6px;align-items:center;flex-wrap:wrap}.as487 button{min-height:44px;border:1px solid #cbd5e1;border-radius:9px;background:#fff;color:#344054;padding:8px 12px;font-weight:750;cursor:pointer}.as487 button:focus-visible,.as487 select:focus-visible,.as487 input:focus-visible,.as487 summary:focus-visible{outline:2px solid #2563eb;outline-offset:2px}.as487-metrics{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin:14px 0}.as487-metric{border:1px solid #dce5ee;border-radius:12px;background:#fff;padding:14px}.as487-metric strong{font-size:23px;display:block;margin-bottom:4px}.as487-metric span{font-size:11px;color:#667085}.as487-table-wrap{max-width:100%;overflow:auto;border:1px solid #dfe6ee;border-radius:12px;background:#fff}.as487-table{width:100%;min-width:1080px;border-collapse:collapse}.as487-table th,.as487-table td{text-align:left;padding:10px;border-bottom:1px solid #edf2f7;vertical-align:top;font-size:12px}.as487-table th{background:#f8fafc;white-space:nowrap}.as487-table td:first-child{min-width:210px;position:sticky;left:0;background:#fff}.as487-time{display:block;padding:4px 6px;background:#edf7ff;border-radius:6px;margin-bottom:5px;font-variant-numeric:tabular-nums}.as487-empty{color:#98a2b3}.as487-detail summary{cursor:pointer;min-height:44px;display:flex;align-items:center;font-weight:800}.as487-detail p{font-size:11px;font-weight:400;color:#667085}.as487-state{padding:16px;border:1px dashed #d0d5dd;border-radius:12px;color:#475467;margin:14px 0}.as487-state.error{border-color:#efb2b2;color:#9b1c1c;background:#fff5f5}.as487-note{font-size:12px;color:#667085;line-height:1.5;margin-top:12px}@media(max-width:700px){.as487-metrics{grid-template-columns:repeat(3,minmax(0,1fr))}.as487-metric{padding:10px}.as487-metric strong{font-size:19px}.as487-controls{display:grid;grid-template-columns:repeat(2,minmax(0,1fr))}.as487-field input,.as487-field select{min-width:0;width:100%}.as487-actions{grid-column:1/-1}.as487-head h2{font-size:19px}}';
 document.head.appendChild(style);
}
function mount(target,{mode='MANAGER'}={}){
 const root=typeof target==='string'?document.querySelector(target):target;
 if(!root)return null;if(root.__as487)return root.__as487;
 css();
 const state={week:dayAdd(monday(vietnamToday()),7),stores:[],storeId:'',profiles:[],types:new Map(),rows:[],loading:false,ready:false,error:null,search:'',typeFilter:'ALL',statusFilter:'ALL',mode};
 let inFlight=0;
 const ctx=()=>window.MAGASIN_MANAGER_WORKFORCE_CONTEXT;
 const storeScope=()=>state.storeId?state.stores.filter(s=>String(s.id)===String(state.storeId)):state.stores;
 function staff(){
  const ids=new Set(storeScope().map(s=>String(s.id)));
  return state.profiles.filter(p=>isActive(p)&&Array.isArray(p.priority_store_ids)&&p.priority_store_ids.some(id=>ids.has(String(id))));
 }
 function groupedRows(){
  const out=new Map();for(const r of state.rows){
   if(!r?.user_id||!r.work_date)continue;
   const key=String(r.user_id)+'|'+String(r.work_date).slice(0,10);
   if(!out.has(key))out.set(key,[]);
   out.get(key).push(r);
  }return out;
 }
 function render(){
  const dates=Array.from({length:7},(_,i)=>dayAdd(state.week,i)),weekEnd=dates[6];
  const registered=new Set(state.rows.map(r=>String(r.user_id)));
  const people=staff();
  const eligible=people.filter(p=>{
   const kind=state.types.get(String(p.employee_id))||'UNKNOWN';
   const has=registered.has(String(p.employee_id));
   return (state.typeFilter==='ALL'||state.typeFilter===kind)
    &&(state.statusFilter==='ALL'||(state.statusFilter==='REGISTERED'?has:!has))
    &&(String(p.full_name||p.username||'').toLocaleLowerCase('vi').includes(state.search.toLocaleLowerCase('vi')));
  });
  const grouped=groupedRows(),filteredReg=eligible.filter(p=>registered.has(String(p.employee_id))).length,unreg=eligible.length-filteredReg;
  const stores='<option value="">Tất cả chi nhánh được phép</option>'+state.stores.map(s=>'<option value="'+esc(s.id)+'"'+(String(state.storeId)===String(s.id)?' selected':'')+'>'+esc(s.code)+' · '+esc(s.name)+'</option>').join('');
  root.innerHTML='<section class="as487" aria-label="Tổng hợp đăng ký lịch làm việc">'+
   '<div class="as487-head"><div><h2>Đăng ký lịch làm việc</h2><div class="as487-desc">Tổng hợp các khoảng nhân viên đăng ký <strong>có thể làm</strong>; không phải lịch đã phân ca hoặc giờ công.</div></div><div class="as487-actions"><button type="button" data-as487-prev aria-label="Tuần trước">← Tuần trước</button><button type="button" data-as487-nextweek>Tuần sau</button><button type="button" data-as487-next aria-label="Tuần tiếp theo">Tuần sau →</button><button type="button" data-as487-reload>Làm mới</button></div></div>'+
   '<div class="as487-controls"><label class="as487-field">Chi nhánh<select data-as487-store>'+stores+'</select></label>'+
   '<label class="as487-field">Tìm nhân viên<input data-as487-search type="search" value="'+esc(state.search)+'" placeholder="Tên nhân viên…"></label>'+
   '<label class="as487-field">Loại nhân viên<select data-as487-type><option value="ALL">Tất cả FT / PT</option><option value="FULL_TIME"'+(state.typeFilter==='FULL_TIME'?' selected':'')+'>Full-time</option><option value="PART_TIME"'+(state.typeFilter==='PART_TIME'?' selected':'')+'>Part-time</option><option value="UNKNOWN"'+(state.typeFilter==='UNKNOWN'?' selected':'')+'>Chưa phân loại</option></select></label>'+
   '<label class="as487-field">Trạng thái đăng ký<select data-as487-status><option value="ALL">Tất cả</option><option value="REGISTERED"'+(state.statusFilter==='REGISTERED'?' selected':'')+'>Đã đăng ký</option><option value="UNREGISTERED"'+(state.statusFilter==='UNREGISTERED'?' selected':'')+'>Chưa đăng ký</option></select></label></div>'+
   '<p class="as487-desc">Tuần '+esc(dateLabel(state.week))+'–'+esc(dateLabel(weekEnd))+' ('+esc(state.week)+' → '+esc(weekEnd)+') · Asia/Ho_Chi_Minh · 24 giờ (HH:mm)</p>'+
   (state.loading?'<div class="as487-state" role="status">Đang tải dữ liệu đăng ký của nhân viên…</div>':
    state.error?'<div class="as487-state error" role="alert">Không tải được đầy đủ dữ liệu đăng ký hoặc phạm vi quyền. '+esc(state.error)+' Không thể kết luận nhân viên chưa đăng ký. <button data-as487-retry>Thử lại</button></div>':
    !state.ready?'<div class="as487-state">Chưa có dữ liệu xác minh.</div>':
    '<div class="as487-metrics"><div class="as487-metric"><strong>'+eligible.length+'</strong><span>Nhân viên thuộc bộ lọc</span></div><div class="as487-metric"><strong>'+filteredReg+'</strong><span>Đã đăng ký</span></div><div class="as487-metric"><strong>'+unreg+'</strong><span>Chưa đăng ký</span></div></div>'+
    (eligible.length?
    '<div class="as487-table-wrap" tabindex="0" aria-label="Bảng 7 ngày đăng ký khả dụng"><table class="as487-table"><thead><tr><th>Nhân viên</th>'+dates.map((d,i)=>'<th>'+DAY_NAMES[i]+'<div>'+dateLabel(d)+'</div></th>').join('')+'</tr></thead><tbody>'+
    eligible.map(p=>{
     const id=String(p.employee_id),full=p.full_name||p.username||'Nhân viên',kind=state.types.get(id)||'UNKNOWN',typ=kind==='FULL_TIME'?'FT':kind==='PART_TIME'?'PT':'Chưa phân loại';
     const mine=state.rows.filter(r=>String(r.user_id)===id);
     const detail=mine.map(r=>'<p>'+esc(dateLabel(r.work_date))+' · '+esc(time(r.start_time))+'–'+esc(time(r.end_time))+(r.note?' · '+esc(r.note):'')+'</p>').join('');
     return '<tr data-as487-employee="'+esc(id)+'"><td><details class="as487-detail"><summary>'+esc(full)+'</summary><div>'+esc(typ)+(detail||'<p>Chưa đăng ký trong tuần.</p>')+'</div></details><small>'+esc(typ)+' · '+(mine.length?'Đã đăng ký':'Chưa đăng ký')+'</small></td>'+
     dates.map(d=>{const windows=grouped.get(id+'|'+d)||[];return '<td>'+(windows.length?windows.map(r=>'<span class="as487-time">'+esc(time(r.start_time))+'–'+esc(time(r.end_time))+'</span>').join(''):'<span class="as487-empty">—</span>')+'</td>'}).join('')+'</tr>';
    }).join('')+'</tbody></table></div>':
    '<div class="as487-state">Không có nhân viên phù hợp bộ lọc trong phạm vi được phép.</div>')+
    '<p class="as487-note">Đăng ký khả dụng có thể được áp dụng cho nhiều chi nhánh trong danh sách ưu tiên, nhưng không tạo ca làm việc. “Chưa đăng ký” chỉ dựa trên dữ liệu đã tải thành công cho tuần và phạm vi đang xem.</p>')+
   '</section>';
  root.querySelector('[data-as487-store]')?.addEventListener('change',e=>{state.storeId=e.target.value;void refresh({reloadProfiles:false})});
  root.querySelector('[data-as487-search]')?.addEventListener('input',e=>{state.search=e.target.value;render()});
  root.querySelector('[data-as487-type]')?.addEventListener('change',e=>{state.typeFilter=e.target.value;render()});
  root.querySelector('[data-as487-status]')?.addEventListener('change',e=>{state.statusFilter=e.target.value;render()});
  root.querySelector('[data-as487-prev]')?.addEventListener('click',()=>{state.week=dayAdd(state.week,-7);void refresh({reloadProfiles:false})});
  root.querySelector('[data-as487-next]')?.addEventListener('click',()=>{state.week=dayAdd(state.week,7);void refresh({reloadProfiles:false})});
  root.querySelector('[data-as487-nextweek]')?.addEventListener('click',()=>{state.week=dayAdd(monday(vietnamToday()),7);void refresh({reloadProfiles:false})});
  for(const b of root.querySelectorAll('[data-as487-reload],[data-as487-retry]'))b.addEventListener('click',()=>void refresh({reloadProfiles:true}));
 }
 async function refresh({reloadProfiles=true}={}){
  const run=++inFlight;state.loading=true;state.error=null;render();
  try{
   const api=ctx();if(!api?.client||!api?.stores)throw Error('Không có kết nối Workforce.');
   const stores=await api.stores({force:reloadProfiles});if(run!==inFlight)return;
   state.stores=(stores||[]).filter(s=>s?.id&&String(s.status||'ACTIVE').toUpperCase()==='ACTIVE');
   if(!state.stores.length)throw Error('Không có chi nhánh được cấp quyền.');
   if(state.storeId&&!state.stores.some(s=>String(s.id)===String(state.storeId)))state.storeId='';
   const sb=api.client();
   if(reloadProfiles||!state.profiles.length){
    const [p,t]=await Promise.all([sb.rpc('list_employee_workforce_profiles_v1'),sb.rpc('list_employee_employment_types_v1')]);
    if(p.error||t.error)throw Error('Lỗi tải hồ sơ nhân viên/FT-PT.');
    if(!Array.isArray(p.data)||!Array.isArray(t.data))throw Error('Dữ liệu hồ sơ không hợp lệ.');
    state.profiles=p.data;state.types=new Map(t.data.map(r=>[String(r.employee_id),String(r.employment_type||'UNKNOWN').toUpperCase()]));
   }
   const calls=await Promise.all(storeScope().map(store=>sb.rpc('get_manager_weekly_availability',{p_store_id:store.id,p_week_start:state.week})));
   if(run!==inFlight)return;
   if(calls.some(q=>q.error||!Array.isArray(q.data)))throw Error('Lỗi tải đăng ký từ một hoặc nhiều chi nhánh.');
   const map=new Map();for(const q of calls)for(const r of q.data){
    const key=String(r.availability_id||[r.user_id,r.work_date,r.start_time,r.end_time].join('|'));
    if(!map.has(key))map.set(key,r);
   }
   state.rows=[...map.values()];state.error=null;state.ready=true;
  }catch(e){if(run!==inFlight)return;state.rows=[];state.ready=false;state.error=String(e.message||'Lỗi tải dữ liệu.')}
  finally{if(run===inFlight){state.loading=false;render()}}
 }
 const controller={refresh,getState:()=>({...state,profiles:state.profiles.map(p=>({...p})),rows:state.rows.map(r=>({...r})),stores:state.stores.map(s=>({...s}))})};
 root.__as487=controller;void refresh();
 return controller;
}
window.MAGASIN_WORKFORCE_AVAILABILITY_SUMMARY=Object.freeze({mount});
function autoMount(){
 const el=document.getElementById('view-availability');
 if(el)mount(el,{mode:'MANAGER'});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',autoMount,{once:true});else autoMount();
})();
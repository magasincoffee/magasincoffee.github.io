(()=>{'use strict';
const $=id=>document.getElementById(id);
const weekNav=window.MAGASIN_SCHEDULING_V2_WEEK_NAV;
if(!weekNav)throw Error('WEEK_NAV_NOT_READY');
const weekStart=weekNav.weekStart,dateOffset=weekNav.dateOffset;
const timeBand=time=>{const h=Number(String(time||'').slice(0,2)),m=Number(String(time||'').slice(3,5));if(!Number.isInteger(h)||!Number.isInteger(m))return 'other';const n=h*60+m;return n>=300&&n<720?'morning':n>=720&&n<1020?'afternoon':n>=1020&&n<=1320?'evening':'other'};
const status=msg=>{$('sv2Status').textContent=msg};
let requestSerial=0;
const td=(text,cls)=>{const node=document.createElement('td');if(cls)node.className=cls;node.textContent=String(text??'');return node};
function render(rows,week,stage){const body=$('sv2Rows');body.replaceChildren();const groups=new Map();for(const r of rows){const id=String(r.user_id||r.employee_id||'');if(!id)continue;if(!groups.has(id))groups.set(id,{name:String(r.employee_name||r.full_name||'Nhân viên'),days:Array.from({length:7},()=>[])});const date=String(r.work_date||'').slice(0,10);for(let i=0;i<7;i++)if(date===dateOffset(week,i)){groups.get(id).days[i].push({time:String(r.start_time||'').slice(0,5)+'–'+String(r.end_time||'').slice(0,5),source:String(r.source||'OFFICIAL'),draftIndex:Number(r.draftIndex),userId:id,date,shiftId:r.id||r.schedule_id||null});break}}
$('sv2Employees').textContent=groups.size;$('sv2Shifts').textContent=rows.length;$('sv2Stage').textContent=stage||'Chỉ xem';
if(!groups.size){const tr=document.createElement('tr');const cell=td('Tuần này chưa có ca được phân công.');cell.colSpan=8;tr.appendChild(cell);body.appendChild(tr);return}
for(const item of [...groups.values()].sort((a,b)=>a.name.localeCompare(b.name,'vi'))){const tr=document.createElement('tr');tr.appendChild(td(item.name));for(const shifts of item.days){const cell=document.createElement('td');for(const shift of shifts){const span=document.createElement('span');span.className='sv2-shift '+(shift.source==='DRAFT'?'sv2-draft':'sv2-official')+' sv2-band-'+timeBand(shift.time.split('–')[0]);span.textContent=shift.time+(shift.source==='DRAFT'?' · Nháp':' · Chính thức');if(shift.source==='DRAFT'){span.dataset.sv2DraftIndex=String(shift.draftIndex);if(shift.shiftId)span.dataset.sv2ShiftId=String(shift.shiftId);span.dataset.sv2UserId=shift.userId;span.dataset.sv2Date=shift.date;span.dataset.sv2Start=shift.time.split('–')[0];span.dataset.sv2End=shift.time.split('–')[1];span.tabIndex=0;span.setAttribute('role','button');span.setAttribute('aria-label','Chỉnh ca nháp '+shift.time)}if(shift.source==='OFFICIAL'&&shift.shiftId){span.dataset.sv2OfficialId=String(shift.shiftId);span.tabIndex=0;span.setAttribute('role','button');span.setAttribute('aria-label','Điều động ca chính thức '+shift.time)}cell.appendChild(span)}tr.appendChild(cell)}body.appendChild(tr)}}
function getAdapter(){const a=window.MAGASIN_SCHEDULING_V2_READ_ADAPTER;return a&&typeof a.stores==='function'&&typeof a.week==='function'?a:null}
function updateWeekUI(){
  const selected=weekStart($('sv2Week').value);
  const range=$('sv2WeekRange');
  range.textContent=weekNav.rangeLabel(selected);
  if(!selected)return '';
  $('sv2Week').value=selected;
  const headers=$('sv2Table').querySelectorAll('thead th');
  for(let i=1;i<=7;i++){
    const date=dateOffset(selected,i-1);
    if(headers[i])headers[i].textContent=['T2','T3','T4','T5','T6','T7','CN'][i-1]+' '+date.slice(8,10)+'/'+date.slice(5,7);
  }
  return selected;
}
async function refresh(){const currentRequest=++requestSerial;const week=updateWeekUI();const adapter=getAdapter();if(!adapter){status('V2 chưa được kết nối với phiên đăng nhập Manager. Không hiển thị dữ liệu giả.');return}const store=$('sv2Store').value;if(!store||!week){status('Hãy chọn chi nhánh và tuần để xem lịch.');return}$('sv2Refresh').disabled=true;status('Đang tải lịch tuần…');try{const result=await adapter.week(store,week);if(currentRequest!==requestSerial)return;if(!result||!Array.isArray(result.rows))throw Error('Dữ liệu lịch không hợp lệ');render(result.rows,week,result.stage);status('Đã tải '+Number(result.draftCount||0)+' ca nháp và '+Number(result.officialCount||0)+' ca chính thức.');document.dispatchEvent(new CustomEvent('magasin:scheduling-v2-week-loaded',{detail:{storeId:store,weekStart:week,stage:result.stage,draftCount:Number(result.draftCount||0),officialCount:Number(result.officialCount||0)}}))}catch(e){if(currentRequest!==requestSerial)return;$('sv2Rows').replaceChildren();$('sv2Employees').textContent='—';$('sv2Shifts').textContent='—';$('sv2Stage').textContent='—';status('Không tải được lịch: '+String(e?.message||e))}finally{if(currentRequest===requestSerial)$('sv2Refresh').disabled=false}}
async function init(){
  // Managers plan next week's schedule; the current week remains one tap away.
  $('sv2Week').value=weekNav.nextWeek();
  updateWeekUI();
  const moveTo=week=>{
    if(!week)return;
    $('sv2Week').value=week;
    refresh();
  };
  $('sv2PrevWeek').addEventListener('click',()=>moveTo(weekNav.shiftWeek($('sv2Week').value,-1)));
  $('sv2NextWeek').addEventListener('click',()=>moveTo(weekNav.shiftWeek($('sv2Week').value,1)));
  $('sv2CurrentWeek').addEventListener('click',()=>moveTo(weekNav.currentWeek()));
  $('sv2UpcomingWeek').addEventListener('click',()=>moveTo(weekNav.nextWeek()));$('sv2Week').addEventListener('change',refresh);$('sv2Store').addEventListener('change',refresh);$('sv2Refresh').addEventListener('click',refresh);const adapter=getAdapter();if(!adapter){status('Bản nền tảng chỉ đọc chưa kết nối Manager. V1 không bị ảnh hưởng.');return}try{const stores=await adapter.stores();if(!Array.isArray(stores))throw Error('Danh sách chi nhánh không hợp lệ');const select=$('sv2Store');select.replaceChildren();for(const store of stores){const opt=document.createElement('option');opt.value=String(store.id);opt.textContent=String(store.code||store.name||'Chi nhánh');select.appendChild(opt)}if(stores.length)await refresh();else status('Tài khoản không có chi nhánh được phép xem.')}catch(e){status('Không thể tải chi nhánh: '+String(e?.message||e))}}
document.addEventListener('DOMContentLoaded',init);
})();
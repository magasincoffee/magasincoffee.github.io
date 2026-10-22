(()=>{'use strict';
const $=id=>document.getElementById(id),store=$('sv2DemandStore'),body=$('sv2DemandRows'),status=$('sv2DemandStatus'),save=$('sv2DemandSave'),retry=$('sv2DemandRetry'),add=$('sv2AddBand');
const ctx=()=>{const x=window.MAGASIN_SCHEDULING_V2_CONTEXT;if(!x?.client||!x?.actor||!x?.stores)throw Error('MANAGER_CONTEXT_NOT_READY');return x};
const hm=t=>String(t||'').slice(0,5),min=t=>{const m=hm(t).match(/^(\d{2}):(\d{2})$/);return m?Number(m[1])*60+Number(m[2]):NaN};
const norm=r=>({store_id:String(r.store_id||''),day_of_week:Number(r.day_of_week),start_time:hm(r.start_time),end_time:hm(r.end_time),target_headcount:Number(r.target_headcount||0)});
const fingerprint=rows=>JSON.stringify(rows.map(norm).sort((a,b)=>a.store_id.localeCompare(b.store_id)||a.day_of_week-b.day_of_week||a.start_time.localeCompare(b.start_time)||a.end_time.localeCompare(b.end_time)||a.target_headcount-b.target_headcount));
let all=[],baseline='',bands=[],selected='',dirty=false,busy=false;const writable=()=>window.MAGASIN_SCHEDULING_V2_DEMAND_PREVIEW_ENABLED===true&&new URLSearchParams(window.location.search).has('demand-preview');
const announce=text=>{status.textContent=text};
const timed=(promise,ms=20000)=>{let timer;return Promise.race([
  promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('REQUEST_TIMEOUT')),ms)})
]).finally(()=>clearTimeout(timer))};
const messageFor=e=>{const msg=String(e?.message||e);
 if(msg==='REQUEST_TIMEOUT')return 'Kết nối quá thời gian chờ. Vui lòng nhấn Tải lại.';
 if(msg==='AUTH_REQUIRED'||msg.includes('JWT'))return 'Phiên đăng nhập cần được xác thực lại. Mở trang Quản lý rồi tải lại.';
 if(msg==='STORE_NOT_ALLOWED')return 'Tài khoản chưa được phân quyền tới chi nhánh hoạt động nào.';
 return 'Không tải được dữ liệu: '+msg;
};
const validBand=(start,end)=>Number.isFinite(min(start))&&Number.isFinite(min(end))&&min(start)>=300&&min(end)<=1320&&min(end)>min(start)&&min(start)%30===0&&min(end)%30===0;
const bandClass=start=>min(start)<720?'sv2-band-morning':min(start)<1020?'sv2-band-afternoon':'sv2-band-evening';
function rowsForStore(){return bands.flatMap(b=>Array.from({length:7},(_,i)=>({store_id:selected,day_of_week:i+1,start_time:b.start,end_time:b.end,target_headcount:b.values[i]})).filter(r=>r.target_headcount>0))}
function setDirty(){dirty=true;save.disabled=!writable();announce('Chưa lưu thay đổi. Nhấn Lưu nhu cầu nhân sự khi hoàn tất.')}
function render(){body.replaceChildren();if(!bands.length){const tr=document.createElement('tr');const td=document.createElement('td');td.colSpan=8;td.textContent='Chưa thiết lập khung giờ. Chọn giờ bắt đầu, giờ kết thúc và nhấn Thêm khung giờ.';tr.appendChild(td);body.appendChild(tr);return}
 for(const b of bands){const tr=document.createElement('tr'),td=document.createElement('th');td.scope='row';const wrap=document.createElement('span');wrap.className='sv2-demand-band '+bandClass(b.start);const title=document.createElement('span');title.textContent=b.start+'–'+b.end;const remove=document.createElement('button');remove.type='button';remove.textContent='×';remove.title='Xóa khung '+title.textContent;remove.setAttribute('aria-label',remove.title);remove.addEventListener('click',()=>{if(!window.confirm('Xóa khung '+title.textContent+' khỏi cả bảy ngày (chưa lưu)?'))return;bands=bands.filter(x=>x!==b);setDirty();render()});wrap.append(title,remove);td.appendChild(wrap);tr.appendChild(td);
 for(let i=0;i<7;i++){const cell=document.createElement('td');const input=document.createElement('input');input.type='number';input.min='0';input.max='20';input.step='1';input.value=String(b.values[i]);input.setAttribute('aria-label','Số người cần, thứ '+(i+2)+', khung '+b.start+' đến '+b.end);input.addEventListener('change',()=>{const n=Number(input.value);if(!Number.isInteger(n)||n<0||n>20){input.value=String(b.values[i]);announce('Số người cần phải là số nguyên từ 0 đến 20.');return}b.values[i]=n;setDirty()});cell.appendChild(input);tr.appendChild(cell)}body.appendChild(tr)}
}
function selectStore(id){selected=String(id||'');const arr=all.filter(r=>String(r.store_id)===selected);const map=new Map();for(const raw of arr){const r=norm(raw);if(!validBand(r.start_time,r.end_time)||r.day_of_week<1||r.day_of_week>7)continue;const key=r.start_time+'|'+r.end_time;if(!map.has(key))map.set(key,{start:r.start_time,end:r.end_time,values:Array(7).fill(0)});map.get(key).values[r.day_of_week-1]=r.target_headcount}bands=[...map.values()].sort((a,b)=>min(a.start)-min(b.start)||min(a.end)-min(b.end));dirty=false;save.disabled=true;render();announce('Đang xem định mức của chi nhánh đang chọn.')}
async function load(){
 const c=ctx();
 announce('Đang xác minh quyền quản lý và danh sách chi nhánh…');
 await c.actor({force:true});
 const accessible=await c.stores();
 if(!Array.isArray(accessible)||!accessible.length)throw Error('STORE_NOT_ALLOWED');
 announce('Đã tải '+accessible.length+' chi nhánh. Đang đọc định mức nhân sự…');
 const response=await c.client().rpc('list_workforce_recurring_staffing_requirements_v1',{});
 if(response.error)throw response.error;
 all=Array.isArray(response.data)?response.data.map(norm):[];
 baseline=fingerprint(all);
 return accessible;
}
let loading=false;
async function start(){
 if(loading)return;
 loading=true;
 retry.hidden=true;
 store.disabled=true;add.disabled=true;save.disabled=true;
 store.replaceChildren();
 const waiting=document.createElement('option');waiting.value='';waiting.textContent='Đang tải chi nhánh…';store.appendChild(waiting);
 announce('Đang tải chi nhánh được phân quyền…');
 try{
  const stores=await timed(load());
  store.replaceChildren();
  for(const s of stores){const opt=document.createElement('option');opt.value=String(s.id);opt.textContent=String(s.code||s.name||s.id);store.appendChild(opt)}
  store.disabled=false;add.disabled=false;
  selectStore(store.value);
 }catch(e){
  store.replaceChildren();
  const failed=document.createElement('option');failed.value='';failed.textContent='Không thể tải chi nhánh';store.appendChild(failed);
  selected='';bands=[];dirty=false;render();
  retry.hidden=false;
  announce(messageFor(e));
 }finally{loading=false}
}
store.addEventListener('change',()=>{const desired=store.value;if(dirty&&!window.confirm('Bỏ các thay đổi chưa lưu để chuyển chi nhánh?')){store.value=selected;return}selectStore(desired)});
add.addEventListener('click',()=>{if(!selected){announce('Chưa chọn được chi nhánh. Nhấn Tải lại để thử kết nối.');return}const start=hm($('sv2BandStart').value),end=hm($('sv2BandEnd').value);if(!validBand(start,end)){announce('Chỉ dùng mốc giờ 05:00–22:00, bước 30 phút và giờ kết thúc sau giờ bắt đầu.');return}if(bands.some(b=>b.start===start&&b.end===end)){announce('Khung giờ này đã tồn tại.');return}bands.push({start,end,values:Array(7).fill(0)});bands.sort((a,b)=>min(a.start)-min(b.start));setDirty();render()});
save.addEventListener('click',async()=>{if(!writable()){announce('Cài đặt nhu cầu hiện ở chế độ xem. Chưa bật quyền chỉnh sửa V2.');return}if(busy||!dirty||!selected)return;if(!window.confirm('Lưu nhu cầu nhân sự cố định cho chi nhánh '+store.selectedOptions[0]?.textContent+'? Các chi nhánh khác sẽ được giữ nguyên.'))return;
 busy=true;save.disabled=true;store.disabled=true;announce('Đang kiểm tra và lưu…');
 try{const c=ctx();await c.actor({force:true});const allowed=await c.stores();if(!allowed.some(x=>String(x.id)===selected))throw Error('STORE_NOT_ALLOWED');const latest=await c.client().rpc('list_workforce_recurring_staffing_requirements_v1',{});if(latest.error)throw latest.error;const fresh=Array.isArray(latest.data)?latest.data:[];if(fingerprint(fresh)!==baseline)throw Error('Nhu cầu đã thay đổi bởi người khác. Hãy tải lại để tránh ghi đè.');
 const payload=[...fresh.map(norm).filter(r=>r.store_id!==selected),...rowsForStore()];if(payload.some(r=>r.target_headcount<1||r.target_headcount>20||!validBand(r.start_time,r.end_time)))throw Error('INVALID_REQUIREMENTS');
 const result=await c.client().rpc('replace_workforce_recurring_staffing_requirements_v1',{p_requirements:payload});if(result.error)throw result.error;
 const updated=await c.client().rpc('list_workforce_recurring_staffing_requirements_v1',{});if(updated.error)throw updated.error;all=Array.isArray(updated.data)?updated.data.map(norm):[];baseline=fingerprint(all);selectStore(selected);announce('Đã lưu nhu cầu nhân sự. Các tuần xếp lịch sau sẽ sử dụng cấu hình mới.')
 }catch(e){announce('Lưu thất bại: '+String(e?.message||e));save.disabled=false}finally{busy=false;store.disabled=false;if(dirty)save.disabled=!writable()}});
// Read-only interface to unsaved local changes. Never exposes a write bypass.
window.MAGASIN_MANAGER_EDIT_STATE=Object.freeze({isDirty:()=>dirty||busy,scope:()=>({storeId:selected})});
window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue=''}});
retry.addEventListener('click',start);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
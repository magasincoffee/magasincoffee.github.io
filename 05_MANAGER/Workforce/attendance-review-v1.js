(()=>{'use strict';
const U='https://menvbzlsncmpuvnaifxa.supabase.co',K='sb_publishable_HsvCS6HDZnCDInd9PUoh0g_V34wJVqx';
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const hm=v=>String(v||'').slice(0,5);
const toDate=s=>new Date(String(s).slice(0,10)+'T00:00:00Z');
const add=(s,n)=>{const d=toDate(s);d.setUTCDate(d.getUTCDate()+Number(n||0));return d.toISOString().slice(0,10)};
const monday=s=>{const d=toDate(s),day=d.getUTCDay()||7;d.setUTCDate(d.getUTCDate()-day+1);return d.toISOString().slice(0,10)};
function todayVN(){
 if(/^\d{4}-\d{2}-\d{2}$/.test(String(window.__MAGASIN_WORKFORCE_TODAY__||'')))return String(window.__MAGASIN_WORKFORCE_TODAY__);
 const parts={};for(const p of new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()))if(p.type!=='literal')parts[p.type]=p.value;
 return `${parts.year}-${parts.month}-${parts.day}`;
}
const weekStart=()=>monday(todayVN());
const statusText=s=>({
 NORMAL:'Bình thường · chờ xác nhận',
 NEEDS_REVIEW:'Cần quản lý xem xét',
 APPROVED:'Đã xác nhận',
 ADJUSTED:'Đã điều chỉnh',
 REJECTED:'Đã từ chối'
}[String(s||'').toUpperCase()]||String(s||''));
const errorMap=[
 ['ATTENDANCE_ALREADY_REVIEWED','Bản ghi này đã được xử lý bằng một quyết định khác. Dữ liệu đã được làm mới.'],
 ['ATTENDANCE_REVIEW_STATE_NOT_ALLOWED','Bản ghi không còn ở trạng thái có thể review.'],
 ['ATTENDANCE_REVIEW_SCHEDULE_SNAPSHOT_CHANGED','Lịch chính thức đã thay đổi; không thể xác nhận từ dữ liệu cũ.'],
 ['ATTENDANCE_NOT_CURRENT_OWNER','Quyền sở hữu ca đã thay đổi; không thể review bản ghi cũ.'],
 ['ATTENDANCE_REVIEW_MANAGER_INACTIVE','Tài khoản quản lý hiện không ACTIVE.'],
 ['ATTENDANCE_REVIEW_ROLE_NOT_ALLOWED','Tài khoản hiện không có quyền review chấm công.'],
 ['STORE_NOT_ALLOWED','Tài khoản không có quyền trên cửa hàng này.'],
 ['ATTENDANCE_ADJUST_CONFIRMED_TIME_REQUIRED','Cần nhập đủ giờ bắt đầu/kết thúc đã điều chỉnh.'],
 ['ATTENDANCE_CONFIRMED_RANGE_INVALID','Giờ kết thúc xác nhận phải sau giờ bắt đầu.'],
 ['ATTENDANCE_CONFIRMED_TIME_MINUTE_PRECISION_REQUIRED','Giờ xác nhận chỉ hỗ trợ độ chính xác đến phút.'],
 ['ATTENDANCE_REVIEW_SUBMISSION_INVALID','Bản ghi raw attendance không còn hợp lệ để review.'],
 ['AUTH_REQUIRED','Phiên đăng nhập không còn hợp lệ.']
];
const errorText=e=>{const raw=String(e?.message||e?.code||e||'UNKNOWN');const hit=errorMap.find(([code])=>raw.includes(code));return hit?hit[1]+' ('+hit[0]+')':raw};
const css=`<style id="manager-attendance-review-v1-css">
.mar-shell{display:grid;gap:14px;min-width:0;max-width:100%}.mar-shell>*{min-width:0;max-width:100%}.mar-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;min-width:0}.mar-actions{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.mar-actions select,.mar-actions button{min-height:40px}.mar-summary{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.mar-summary>div{padding:12px;border:1px solid var(--border);border-radius:12px;background:#fff}.mar-summary b{display:block;font-size:18px}.mar-summary span{display:block;margin-top:4px;color:var(--muted);font-size:11px}.mar-list{display:grid;gap:10px}.mar-card{border:1px solid var(--border);border-radius:14px;padding:14px;background:#fff}.mar-card-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}.mar-name{font-weight:800;font-size:14px}.mar-meta{font-size:11px;color:var(--muted);margin-top:4px}.mar-times{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-top:12px}.mar-times>div{border:1px solid #e3eaf1;border-radius:10px;padding:9px}.mar-times span{display:block;font-size:10px;color:var(--muted)}.mar-times strong{display:block;margin-top:4px}.mar-adjust{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px}.mar-adjust label{display:grid;gap:4px;font-size:10px;font-weight:800;color:var(--muted)}.mar-adjust input{height:38px;border:1px solid var(--border);border-radius:9px;padding:0 9px;background:#fff}.mar-buttons{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}.mar-buttons .danger{border-color:#ecc5c5;color:#9a3838;background:#fff5f5}.mar-state{margin-top:10px;padding:10px 12px;border-radius:10px;background:#eef6ff;color:#235dba;font-size:12px}.mar-state.ok{background:#e8f5ed;color:#23754a}.mar-state.error{background:#fbeaea;color:#9a3838}.mar-empty{padding:22px;text-align:center;color:var(--muted);border:1px dashed var(--border);border-radius:12px}.mar-reviewed{overflow:auto;min-width:0;max-width:100%}.mar-reviewed table{width:100%;border-collapse:collapse;min-width:760px}.mar-reviewed th,.mar-reviewed td{padding:10px;border-bottom:1px solid #edf1f5;text-align:left;font-size:11px}.mar-reviewed th{background:#f8fafc;color:var(--muted)}@media(max-width:760px){.mar-head{flex-direction:column}.mar-summary,.mar-times,.mar-adjust{grid-template-columns:1fr}.mar-buttons .btn{flex:1 1 100%}}
</style>`;

let sb=null,busy=false;
let state={stores:[],storeId:null,week:weekStart(),rows:[],loading:false,error:null,message:''};
const view=()=>document.querySelector('#view-attendance');
const client=()=>sb||(sb=window.supabase.createClient(U,K,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}}));
const reviewed=r=>['APPROVED','ADJUSTED','REJECTED'].includes(String(r.status||'').toUpperCase());
const pending=r=>['NORMAL','NEEDS_REVIEW'].includes(String(r.status||'').toUpperCase());

function reviewedTable(rows){
 if(!rows.length)return '<div class="mar-empty">Chưa có bản ghi đã review trong tuần này.</div>';
 return `<div class="mar-reviewed"><table><thead><tr><th>Ngày</th><th>Nhân viên</th><th>Actual</th><th>Kết quả</th><th>Confirmed</th><th>Phút xác nhận</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${esc(r.work_date)}</td><td>${esc(r.employee_name||'Nhân viên')}</td><td>${esc(hm(r.actual_start))}–${esc(hm(r.actual_end))}</td><td>${esc(statusText(r.status))}</td><td>${r.confirmed_start?`${esc(hm(r.confirmed_start))}–${esc(hm(r.confirmed_end))}`:'—'}</td><td>${r.confirmed_minutes==null?'—':esc(r.confirmed_minutes)}</td></tr>`).join('')}</tbody></table></div>`;
}
function pendingCard(r){
 return `<article class="mar-card" data-attendance-id="${esc(r.attendance_id)}"><div class="mar-card-head"><div><div class="mar-name">${esc(r.employee_name||'Nhân viên')}</div><div class="mar-meta">${esc(r.work_date)} · ${esc(r.store_code||r.store_name||'Cửa hàng')}</div>${r.note?`<div class="mar-meta">Ghi chú nhân viên: ${esc(r.note)}</div>`:''}</div><span class="badge yellow">${esc(statusText(r.status))}</span></div><div class="mar-times"><div><span>Lịch chính thức</span><strong>${esc(hm(r.planned_start))}–${esc(hm(r.planned_end))}</strong></div><div><span>Nhân viên khai</span><strong>${esc(hm(r.actual_start))}–${esc(hm(r.actual_end))}</strong></div><div><span>Confirmed work time</span><strong>Chưa có</strong></div></div><div class="mar-adjust"><label>Giờ xác nhận bắt đầu<input data-confirmed-start type="time" step="60" value="${esc(hm(r.actual_start))}"></label><label>Giờ xác nhận kết thúc<input data-confirmed-end type="time" step="60" value="${esc(hm(r.actual_end))}"></label></div><div class="mar-buttons"><button class="btn primary" data-review="APPROVE">Xác nhận actual</button><button class="btn" data-review="ADJUST">Xác nhận giờ đã điều chỉnh</button><button class="btn danger" data-review="REJECT">Từ chối bản ghi</button></div></article>`;
}
function render(){
 const root=view();if(!root)return;
 if(!document.getElementById('manager-attendance-review-v1-css'))document.head.insertAdjacentHTML('beforeend',css);
 const pend=state.rows.filter(pending),done=state.rows.filter(reviewed);
 const storeOptions=state.stores.map(s=>`<option value="${esc(s.id)}"${String(s.id)===String(state.storeId||'')?' selected':''}>${esc(s.code)} · ${esc(s.name)}</option>`).join('');
 root.innerHTML=`<div class="mar-shell"><div class="mar-head"><div><h2 style="margin:0">Review chấm công</h2><div class="muted" style="margin-top:5px">Raw attendance không phải giờ công xác nhận. Manager review explicit trước khi tạo confirmed work time.</div></div><div class="mar-actions"><select class="btn" id="marStore">${storeOptions||'<option value="">Không có cửa hàng được phép</option>'}</select><button class="btn" data-mar-week="prev">←</button><button class="btn" data-mar-week="today">Tuần này</button><button class="btn" data-mar-week="next">→</button><button class="btn" id="marRefresh">Làm mới</button></div></div><div class="mar-summary"><div><b>${pend.length}</b><span>Cần review</span></div><div><b>${done.filter(r=>r.status==='APPROVED'||r.status==='ADJUSTED').length}</b><span>Đã có confirmed work time</span></div><div><b>${done.filter(r=>r.status==='REJECTED').length}</b><span>Đã từ chối</span></div></div><section class="card"><div class="row" style="justify-content:space-between"><div><h3 style="margin:0">Chờ xử lý</h3><div class="muted" style="margin-top:4px">${esc(state.week)} → ${esc(add(state.week,6))}</div></div></div><div class="mar-list" style="margin-top:12px">${state.loading?'<div class="mar-empty">Đang tải attendance từ máy chủ…</div>':state.error?`<div class="mar-state error">${esc(state.error)}</div>`:pend.length?pend.map(pendingCard).join(''):'<div class="mar-empty">Không có attendance cần review.</div>'}</div><div id="marStatus" class="mar-state${state.error?' error':state.message?' ok':''}">${esc(state.error||state.message||'Server sẽ revalidate Manager scope, schedule owner và attendance state tại thời điểm review.')}</div></section><section class="card"><h3 style="margin-top:0">Đã review</h3>${reviewedTable(done)}</section></div>`;
 root.querySelector('#marStore')?.addEventListener('change',async e=>{state.storeId=e.target.value||null;await loadRows()});
 root.querySelector('#marRefresh')?.addEventListener('click',()=>loadRows());
 root.querySelectorAll('[data-mar-week]').forEach(b=>b.addEventListener('click',async()=>{const a=b.dataset.marWeek;state.week=a==='prev'?add(state.week,-7):a==='next'?add(state.week,7):weekStart();await loadRows()}));
 root.querySelectorAll('[data-review]').forEach(b=>b.addEventListener('click',()=>act(b.closest('[data-attendance-id]'),b.dataset.review)));
}
async function loadStores(){
 const q=await client().rpc('get_manager_accessible_stores');if(q.error)throw q.error;
 state.stores=(Array.isArray(q.data)?q.data:[]).filter(s=>s?.id&&String(s.status||'ACTIVE').toUpperCase()==='ACTIVE');
 if(!state.storeId||!state.stores.some(s=>String(s.id)===String(state.storeId)))state.storeId=state.stores[0]?.id||null;
}
async function loadRows(message=''){
 if(!state.storeId){state.rows=[];state.error=null;state.message=message;render();return}
 state.loading=true;state.error=null;state.message=message;render();
 const q=await client().rpc('list_manager_attendance_review_v1',{p_store_id:state.storeId,p_from_date:state.week,p_to_date:add(state.week,6)});
 state.loading=false;
 if(q.error){state.rows=[];state.error=errorText(q.error);render();return}
 state.rows=Array.isArray(q.data)?q.data:[];state.error=null;render();
}
async function refresh(message=''){
 try{if(!state.stores.length)await loadStores();await loadRows(message)}
 catch(e){state.loading=false;state.rows=[];state.error=errorText(e);render()}
}
async function act(card,decision){
 if(busy||!card)return;
 const id=card.dataset.attendanceId;if(!id)return;
 const start=card.querySelector('[data-confirmed-start]')?.value||null;
 const end=card.querySelector('[data-confirmed-end]')?.value||null;
 busy=true;card.querySelectorAll('button,input').forEach(x=>x.disabled=true);
 try{
  const args={p_attendance_id:id,p_decision:decision,p_confirmed_start:null,p_confirmed_end:null};
  if(decision==='ADJUST'){args.p_confirmed_start=start;args.p_confirmed_end=end}
  const q=await client().rpc('review_attendance_v1',args);
  if(q.error)throw q.error;
  const msg=q.data?.already_reviewed?'Bản ghi đã được xử lý trước đó; giữ nguyên cùng một kết quả review.':decision==='REJECT'?'Đã từ chối attendance. Không tạo confirmed work time.':'Đã lưu confirmed work time từ review của Manager.';
  await loadRows(msg);
 }catch(e){
  const raw=String(e?.message||e?.code||e||'');
  const shouldRefresh=/ATTENDANCE_ALREADY_REVIEWED|ATTENDANCE_REVIEW_STATE_NOT_ALLOWED|ATTENDANCE_REVIEW_SCHEDULE|ATTENDANCE_NOT_CURRENT_OWNER|STORE_NOT_ALLOWED/.test(raw);
  if(shouldRefresh)await loadRows(errorText(e));else{state.error=errorText(e);render()}
 }finally{busy=false}
}
function capture(e){if(e.target.closest?.('[data-view="attendance"]'))setTimeout(()=>refresh(),0)}
document.addEventListener('click',capture,true);
async function boot(){if(!view()||!window.supabase?.createClient)return;await refresh()}
window.MAGASIN_MANAGER_ATTENDANCE_REVIEW={refresh,getState:()=>({storeId:state.storeId,week:state.week,rows:state.rows.map(x=>({...x})),loading:state.loading,error:state.error,message:state.message,busy})};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
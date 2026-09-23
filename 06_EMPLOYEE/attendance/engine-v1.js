(()=>{'use strict';
const C=globalThis.MAGASIN_CORE;if(!C)return;
const host=()=>document.getElementById('employeeApp'),doc=()=>host()?.contentDocument||null;
const esc=C.security.escapeHtml,hm=C.time.time5,fmt=C.date.formatDate,add=C.date.addDays,mon=C.date.monday,mins=C.time.minutes;
const CANONICAL_STATUSES=new Set(['SUBMITTED','NORMAL','NEEDS_REVIEW','APPROVED','ADJUSTED','REJECTED']);
const RECONCILE_ERRORS=new Set(['ATTENDANCE_NOT_CURRENT_OWNER','ATTENDANCE_SCHEDULE_NOT_FOUND','ATTENDANCE_SCHEDULE_NOT_APPROVED','ATTENDANCE_EMPLOYEE_INACTIVE','ATTENDANCE_EMPLOYEE_NOT_STAFF','ATTENDANCE_ACTIVE_SUBMISSION_EXISTS']);
const ERROR_COPY={
  AUTH_REQUIRED:'Phiên đăng nhập không còn hợp lệ.',
  ATTENDANCE_FIELDS_REQUIRED:'Vui lòng chọn ca và nhập đủ giờ bắt đầu/kết thúc.',
  ATTENDANCE_ACTUAL_RANGE_INVALID:'Giờ kết thúc phải sau giờ bắt đầu.',
  ATTENDANCE_SCHEDULE_NOT_FOUND:'Ca này không còn tồn tại trong lịch hiện tại.',
  ATTENDANCE_SCHEDULE_NOT_APPROVED:'Ca này không còn ở trạng thái được phát hành.',
  ATTENDANCE_NOT_CURRENT_OWNER:'Ca này đã được chuyển cho người khác. Lịch của bạn đã được làm mới.',
  ATTENDANCE_EMPLOYEE_INACTIVE:'Tài khoản nhân viên hiện không đủ điều kiện chấm công.',
  ATTENDANCE_EMPLOYEE_NOT_STAFF:'Tài khoản hiện không có quyền chấm công nhân viên.',
  ATTENDANCE_SCHEDULE_IN_FUTURE:'Chưa thể gửi giờ làm cho ca trong tương lai.',
  ATTENDANCE_SHIFT_NOT_FINISHED:'Ca làm chưa kết thúc nên chưa thể gửi giờ thực tế.',
  ATTENDANCE_ACTIVE_SUBMISSION_EXISTS:'Ca này đã có bản ghi chấm công. Dữ liệu đã được làm mới.'
};
let state={week:mon(),schedules:[],history:[],loading:false,error:null,submitting:false,selectedScheduleId:null,ready:false};
let requestSeq=0,pending=null;
function errorCode(e){
  const s=String(e?.message||'')+' '+String(e?.code||'');
  for(const k of Object.keys(ERROR_COPY))if(s.includes(k))return k;
  const c=String(e?.code||'').trim();
  return /^[A-Z0-9_]{3,80}$/.test(c)?c:'ATTENDANCE_REQUEST_FAILED';
}
function statusText(s){
  const m={SUBMITTED:'Đã gửi',NORMAL:'Đã gửi · Bình thường',NEEDS_REVIEW:'Đã gửi · Cần quản lý xem xét',APPROVED:'Đã xác nhận',ADJUSTED:'Đã điều chỉnh',REJECTED:'Bị từ chối',COMPLETED:'Đã hoàn tất · dữ liệu cũ',OPEN:'Đang mở · dữ liệu cũ'};
  return m[String(s||'').toUpperCase()]||String(s||'Chưa gửi');
}
function panel(){return doc()?.querySelector('#view-attendance .attendance-entry-grid .panel:first-child')}
function injectCss(d){
  if(!d||d.getElementById('employee-attendance-v1-css'))return;
  const s=d.createElement('style');s.id='employee-attendance-v1-css';
  s.textContent='.employee-attendance-v1 .attendance-week-nav{display:flex;gap:6px;flex-wrap:wrap;margin:12px 0}.employee-attendance-v1 .attendance-week-nav button{border:1px solid #dbe4ef;border-radius:9px;background:#fff;padding:8px 10px;font:inherit;font-weight:700;cursor:pointer}.employee-attendance-v1 .attendance-form-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.employee-attendance-v1 .attendance-form-grid .wide{grid-column:1/-1}.employee-attendance-v1 .attendance-status{margin-top:12px;padding:11px 13px;border:1px solid #d8e5f4;background:#f2f7fd;border-radius:11px;font-size:12px}.employee-attendance-v1 .attendance-actions{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:12px}.employee-attendance-v1 .attendance-help{margin-top:8px;font-size:12px;color:#718199}.employee-attendance-v1 select,.employee-attendance-v1 input,.employee-attendance-v1 textarea{width:100%}.employee-attendance-v1 textarea{min-height:74px;resize:vertical}.employee-attendance-v1 button[disabled]{opacity:.55;cursor:not-allowed}@media(max-width:600px){.employee-attendance-v1 .attendance-form-grid{grid-template-columns:1fr}.employee-attendance-v1 .attendance-form-grid .wide{grid-column:auto}}';
  d.head.appendChild(s);
}
function setMessage(text,type='info',code=''){
  const p=panel();if(!p)return;
  let e=p.querySelector('#employeeAttendanceMessage');
  if(!e){e=p.ownerDocument.createElement('div');e.id='employeeAttendanceMessage';e.setAttribute('role','status');e.style.cssText='margin-top:10px;padding:10px 12px;border-radius:10px;font-size:12px';p.appendChild(e)}
  e.textContent=text;
  if(code)e.dataset.errorCode=code;else delete e.dataset.errorCode;
  const tones={success:['#e3f3ea','#176d49'],error:['#fff0f0','#9a3838'],info:['#eef7ff','#235dba']};
  const t=tones[type]||tones.info;e.style.background=t[0];e.style.color=t[1];
}
function historyFor(scheduleId){return state.history.find(r=>String(r.schedule_id||'')===String(scheduleId||''))||null}
function renderHistory(d){
  const table=d?.getElementById('attendanceHistoryTable');if(!table)return;
  table.innerHTML='<thead><tr><th>Ngày</th><th>Ca theo lịch</th><th>Cửa hàng</th><th>Trạng thái</th></tr></thead><tbody></tbody>';
  const body=table.querySelector('tbody');
  if(!state.history.length){body.innerHTML='<tr><td colspan="4"><div class="empty">Chưa có bản ghi chấm công trong tuần này.</div></td></tr>';return}
  body.innerHTML=state.history.map(r=>'<tr><td>'+esc(fmt(r.work_date))+'</td><td>'+esc(hm(r.planned_start))+'–'+esc(hm(r.planned_end))+'</td><td>'+esc(r.store_code||r.store_name||'Cửa hàng')+'</td><td>'+esc(statusText(r.status))+'</td></tr>').join('');
}
function render(){
  const d=doc(),p=panel();if(!d||!p)return;
  injectCss(d);
  const legacyReport=d.querySelector('#view-attendance .attendance-report-wrap > .panel:first-child');if(legacyReport)legacyReport.style.display='none';
  p.classList.add('employee-attendance-v1');
  if(state.loading){p.innerHTML='<div class="section-title">Chấm công theo lịch làm</div><div class="empty" data-attendance-loading="1">Đang tải lịch và trạng thái chấm công…</div>';renderHistory(d);return}
  if(state.error){p.innerHTML='<div class="section-title">Chấm công theo lịch làm</div><div class="empty" data-attendance-error="1"><b>Không tải được dữ liệu chấm công.</b><div style="margin-top:5px">'+esc(state.error)+'</div><button class="btn secondary" type="button" data-attendance-retry style="margin-top:10px">Thử lại</button></div>';renderHistory(d);return}
  const selected=state.schedules.find(r=>String(r.schedule_id)===String(state.selectedScheduleId))||state.schedules[0]||null;
  state.selectedScheduleId=selected?.schedule_id||null;
  const persisted=selected?historyFor(selected.schedule_id):null;
  const already=!!persisted&&CANONICAL_STATUSES.has(String(persisted.status||'').toUpperCase());
  const legacy=!!persisted&&!already;
  const options=state.schedules.map((r,i)=>'<option value="'+i+'"'+(r.schedule_id===state.selectedScheduleId?' selected':'')+'>'+esc(fmt(r.work_date))+' · '+esc(hm(r.start_time))+'–'+esc(hm(r.end_time))+' · '+esc(r.store_code||r.store_name||'Cửa hàng')+'</option>').join('');
  const status=already?statusText(persisted.status):legacy?statusText(persisted.status):'Chưa gửi giờ làm thực tế';
  p.innerHTML='<div class="section-title"><span>Chấm công theo lịch làm</span></div>'+
    '<div class="muted" style="margin-top:6px">Chọn ca hiện có trong lịch được phát hành và nhập giờ làm thực tế. Dữ liệu gửi đi chưa phải giờ công đã xác nhận.</div>'+
    '<div class="attendance-week-nav"><button type="button" data-att-week="prev">← Tuần trước</button><button type="button" data-att-week="today">Tuần này</button><button type="button" data-att-week="next">Tuần sau →</button></div>'+
    (state.schedules.length?
      '<div class="attendance-form-grid"><div class="field wide"><label>Ca làm</label><select id="employeeAttendanceSchedule">'+options+'</select></div>'+
      '<div class="field"><label>Giờ bắt đầu thực tế</label><input id="employeeAttendanceStart" type="time" step="60" autocomplete="off"'+(already||legacy?' disabled':'')+'></div>'+
      '<div class="field"><label>Giờ kết thúc thực tế</label><input id="employeeAttendanceEnd" type="time" step="60" autocomplete="off"'+(already||legacy?' disabled':'')+'></div>'+
      '<div class="field wide"><label>Ghi chú (không bắt buộc)</label><textarea id="employeeAttendanceNote"'+(already||legacy?' disabled':'')+'></textarea></div></div>'+
      '<div class="attendance-status"><b>Trạng thái:</b> '+esc(status)+'</div>'+
      '<div class="attendance-actions"><button class="btn primary" id="employeeAttendanceSubmit" type="button"'+(already||legacy||state.submitting?' disabled':'')+'>'+(state.submitting?'Đang gửi…':'Gửi giờ làm thực tế')+'</button><span class="muted">Tuần '+esc(fmt(state.week))+'–'+esc(fmt(add(state.week,6)))+'</span></div>'+
      '<div class="attendance-help">Hệ thống máy chủ sẽ kiểm tra lại quyền sở hữu ca tại thời điểm gửi. Give/Swap có thể làm thay đổi ca hiện tại.</div>'
      :'<div class="empty" data-attendance-empty="1">Không có ca được phát hành cho bạn trong tuần này.</div>'+
       '<div class="attendance-help">Nếu ca vừa được Give/Swap, hãy làm mới hoặc chuyển tuần để lấy lịch hiện tại từ máy chủ.</div>');
  renderHistory(d);
}
async function loadWeek(){
  const requestedWeek=state.week,seq=++requestSeq;
  state.loading=true;state.error=null;render();
  const run=(async()=>{
    const [sq,hq]=await Promise.all([
      C.supabase.rpc('list_my_approved_schedules_v2',{p_week_start:requestedWeek}),
      C.supabase.rpc('get_my_attendance_v2',{p_from_date:requestedWeek,p_to_date:add(requestedWeek,6)})
    ]);
    if(seq!==requestSeq||requestedWeek!==state.week)return;
    if(sq.error)throw sq.error;if(hq.error)throw hq.error;
    const previous=state.selectedScheduleId;
    state.schedules=Array.isArray(sq.data)?sq.data:[];
    state.history=Array.isArray(hq.data)?hq.data:[];
    state.selectedScheduleId=state.schedules.some(r=>String(r.schedule_id)===String(previous))?previous:(state.schedules[0]?.schedule_id||null);
    state.loading=false;state.error=null;state.ready=true;render();
  })().catch(e=>{
    if(seq!==requestSeq||requestedWeek!==state.week)return;
    state.schedules=[];state.history=[];state.loading=false;state.error=ERROR_COPY[errorCode(e)]||'Không thể tải dữ liệu từ máy chủ.';render();
  });
  pending={week:requestedWeek,promise:run};try{return await run}finally{if(pending?.promise===run)pending=null}
}
async function refresh(){
  const d=doc();if(!d?.body)return;
  bind(d);
  if(pending?.week===state.week)return pending.promise;
  return loadWeek();
}
async function submit(){
  if(state.submitting)return;
  const d=doc();if(!d)return;
  const selected=state.schedules.find(r=>String(r.schedule_id)===String(state.selectedScheduleId));
  const start=d.getElementById('employeeAttendanceStart')?.value||'',end=d.getElementById('employeeAttendanceEnd')?.value||'',note=d.getElementById('employeeAttendanceNote')?.value||'';
  if(!selected||!start||!end)return setMessage('Vui lòng chọn ca và nhập đủ giờ bắt đầu/kết thúc.','error','ATTENDANCE_FIELDS_REQUIRED');
  if(mins(end)<=mins(start))return setMessage('Giờ kết thúc phải sau giờ bắt đầu.','error','ATTENDANCE_ACTUAL_RANGE_INVALID');
  state.submitting=true;
  const button=d.getElementById('employeeAttendanceSubmit');
  if(button){button.disabled=true;button.textContent='Đang gửi…'}
  const q=await C.supabase.rpc('submit_manual_time_attendance_v1',{p_schedule_id:selected.schedule_id,p_actual_start:start,p_actual_end:end,p_note:note||null});
  state.submitting=false;
  if(q.error){
    const code=errorCode(q.error),copy=ERROR_COPY[code]||'Không thể gửi giờ làm thực tế.';
    if(RECONCILE_ERRORS.has(code))await loadWeek();
    else if(button){button.disabled=false;button.textContent='Gửi giờ làm thực tế'}
    setMessage(copy,'error',code);
    return;
  }
  await loadWeek();
  const retry=!!q.data?.already_submitted;
  setMessage(retry?'Bản ghi đã tồn tại; hệ thống giữ nguyên cùng một lần chấm công.':'Đã gửi giờ làm thực tế. Trạng thái hiện tại được lấy lại từ máy chủ.','success',retry?'ALREADY_SUBMITTED':'ATTENDANCE_SUBMITTED');
}
function bind(d){
  if(!d?.body||d.body.dataset.employeeAttendanceEngine==='1')return;
  d.body.dataset.employeeAttendanceEngine='1';
  d.addEventListener('click',e=>{
    const week=e.target.closest?.('[data-att-week]');if(week){const a=week.dataset.attWeek;state.week=a==='prev'?add(state.week,-7):a==='next'?add(state.week,7):mon();state.selectedScheduleId=null;void loadWeek();return}
    if(e.target.closest?.('[data-attendance-retry]')){void loadWeek();return}
    if(e.target.closest?.('#employeeAttendanceSubmit')){void submit()}
  },true);
  d.addEventListener('change',e=>{
    if(e.target?.id!=='employeeAttendanceSchedule')return;
    const i=Number(e.target.value),r=state.schedules[i];state.selectedScheduleId=r?.schedule_id||null;render();
  },true);
}
function boot(attempt=0){const d=doc();if(!d?.body){if(attempt<20)setTimeout(()=>boot(attempt+1),25);return}void refresh()}
function init(){const f=host();if(!f||f.dataset.attendanceEngine==='1')return;f.dataset.attendanceEngine='1';f.addEventListener('load',()=>boot(),{once:false});boot()}
globalThis.MAGASIN_EMPLOYEE=globalThis.MAGASIN_EMPLOYEE||{};
globalThis.MAGASIN_EMPLOYEE.attendance={refresh,getWeek:()=>state.week,getRows:()=>state.schedules.slice()};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
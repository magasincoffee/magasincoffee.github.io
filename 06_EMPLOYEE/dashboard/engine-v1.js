(()=>{'use strict';
const C=globalThis.MAGASIN_CORE;if(!C)return;
const host=()=>document.getElementById('employeeApp'),d=()=>host()?.contentDocument||null,esc=C.security.escapeHtml,hm=C.time.time5,mins=C.time.minutes;
const DAY_SHORT=['T2','T3','T4','T5','T6','T7','CN'];
const APPROVED='APPROVED';

function identity(x){
  const p=globalThis.MAGASIN_EMPLOYEE?.profile;if(!p||!x)return;
  const n=p.full_name||p.username||'Nhân viên';
  const r=C.roles.label[String(p.role||'STAFF').toUpperCase()]||String(p.role||'STAFF');
  const a=x.querySelector('.header-user-text strong');if(a)a.textContent=n;
  const b=x.querySelector('.header-user-text span');if(b)b.textContent=r;
  const av=x.querySelector('.header-avatar');if(av)av.textContent=n.charAt(0).toUpperCase();
  const greeting=x.getElementById('employeeTodayGreeting');if(greeting)greeting.textContent='Chào '+n;
}

function todayContext(){
  const key=C.date.dateKey();
  const week=C.date.weekDays(C.date.monday(key));
  const i=Math.max(0,week.indexOf(key));
  return (i===6?'Chủ Nhật':'Thứ '+(i+2))+' · '+C.date.formatDate(key);
}

function currentMinutes(){
  try{
    const parts={};
    new Intl.DateTimeFormat('en-GB',{timeZone:C.TZ||'Asia/Ho_Chi_Minh',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date()).forEach(p=>{parts[p.type]=p.value});
    return Number(parts.hour)*60+Number(parts.minute);
  }catch(_){
    const now=new Date();return now.getHours()*60+now.getMinutes();
  }
}

function sourceState(x){
  const api=globalThis.MAGASIN_EMPLOYEE?.schedule;
  if(!api)return {kind:'error',error:'Lịch làm chưa sẵn sàng.',rows:[],todayRows:[],week:null,currentWeek:C.date.monday()};
  const state=api.getState?.()||{};
  const currentWeek=C.date.monday();
  const week=api.getWeek?.()||currentWeek;
  const wrongWeek=String(week)!==String(currentWeek);
  const rows=wrongWeek?[]:(api.getRows?.()||[]).filter(r=>String(r?.status||APPROVED).toUpperCase()===APPROVED);
  const todayRows=wrongWeek?[]:(api.getTodayRows?.()||[]).filter(r=>String(r?.status||APPROVED).toUpperCase()===APPROVED);
  const loadingMarker=x?.querySelector('#view-schedule [data-schedule-loading="1"]');
  const errorMarker=x?.querySelector('#view-schedule [data-schedule-error="1"]');
  const emptyMarker=x?.querySelector('#view-schedule [data-schedule-empty="1"]');
  const renderedShift=x?.querySelector('#view-schedule [data-schedule-id]');
  const error=state.error||errorMarker?.textContent?.trim()||null;
  const settled=!!error||!!emptyMarker||!!renderedShift||rows.length>0;
  if(state.loading||loadingMarker||(!settled&&!wrongWeek))return {kind:'loading',rows:[],todayRows:[],week,currentWeek,state};
  if(error)return {kind:'error',error,rows:[],todayRows:[],week,currentWeek,state};
  if(wrongWeek)return {kind:'wrong-week',rows:[],todayRows:[],week,currentWeek,state};
  return {kind:rows.length?'ready':'empty',rows,todayRows,week,currentWeek,state};
}

function shiftContext(rows){
  if(!rows.length)return {kind:'empty',row:null};
  const sorted=rows.slice().sort((a,b)=>mins(a.start_time)-mins(b.start_time)||mins(a.end_time)-mins(b.end_time));
  const now=currentMinutes();
  const current=sorted.find(r=>mins(r.start_time)<=now&&now<mins(r.end_time));
  if(current)return {kind:'current',row:current};
  const next=sorted.find(r=>mins(r.start_time)>now);
  if(next)return {kind:'next',row:next};
  return {kind:'ended',row:sorted[sorted.length-1]};
}

function navigate(x,view){
  const source=x?.querySelector('.nav [data-view="'+CSS.escape(String(view))+'"]');
  if(source){source.click();return}
  x?.defaultView?.showView?.(view);
}

function setBadge(x,text,tone='info'){
  const badge=x?.getElementById('employeeTodayShiftBadge');if(!badge)return;
  badge.textContent=text;
  badge.className='m-badge employee-today-status m-status-badge--'+tone;
}

function actionButton(label,action,variant='secondary',id=''){
  return '<button type="button" '+(id?'id="'+id+'" ':'')+'class="m-button m-button--'+variant+'" data-today-action="'+esc(action)+'">'+esc(label)+'</button>';
}

function renderShift(x,snapshot){
  const box=x?.getElementById('employeeTodayShiftBody'),empty=x?.getElementById('todayNoShift'),heading=x?.getElementById('employeeTodayShiftHeading');
  if(!box||!empty||!heading)return;
  empty.hidden=true;
  box.hidden=false;

  if(snapshot.kind==='loading'){
    x.body.dataset.employeeTodayState='loading';heading.textContent='Đang tải lịch làm';setBadge(x,'Đang tải','info');
    box.innerHTML='<div class="employee-today-shift-skeleton" data-today-loading="1"><span class="m-skeleton"></span><span class="m-skeleton"></span><span class="m-skeleton"></span></div>';
    return;
  }
  if(snapshot.kind==='error'){
    x.body.dataset.employeeTodayState='error';heading.textContent='Không tải được lịch';setBadge(x,'Cần tải lại','danger');
    box.innerHTML='<div class="m-error-state employee-today-state employee-today-error" data-today-error="1"><div class="employee-today-state__copy"><strong>Không thể xác định ca hiện tại.</strong><span>'+esc(snapshot.error||'Không thể tải lịch làm lúc này.')+'</span></div>'+actionButton('Thử tải lại','retry-schedule','secondary')+'</div>';
    return;
  }
  if(snapshot.kind==='wrong-week'){
    x.body.dataset.employeeTodayState='unavailable';heading.textContent='Cần mở lại tuần này';setBadge(x,'Chưa có dữ liệu','warning');
    box.innerHTML='<div class="m-empty-state employee-today-state employee-today-empty" data-today-unavailable="1"><div class="employee-today-state__copy"><strong>Lịch đang mở ở tuần khác.</strong><span>Today không suy đoán ca từ dữ liệu ngoài tuần hiện tại.</span></div>'+actionButton('Mở Lịch','route:schedule','secondary')+'</div>';
    return;
  }

  const context=shiftContext(snapshot.todayRows);
  if(context.kind==='empty'){
    x.body.dataset.employeeTodayState='empty';heading.textContent='Hôm nay không có ca';setBadge(x,'Không có ca','info');
    box.hidden=true;empty.hidden=false;return;
  }

  const row=context.row;
  const label=context.kind==='current'?'Đang trong ca':context.kind==='next'?'Ca tiếp theo':'Ca gần nhất hôm nay';
  const status=context.kind==='current'?'Đang diễn ra':context.kind==='next'?'Sắp tới':'Đã kết thúc';
  const tone=context.kind==='current'?'success':context.kind==='next'?'info':'warning';
  const note=context.kind==='current'?'Ca chính thức đang thuộc về bạn.':context.kind==='next'?'Ca chính thức tiếp theo trong hôm nay.':'Ca chính thức hôm nay đã qua giờ kết thúc.';
  const cta=context.kind==='current'
    ?actionButton('Chấm công','attendance:'+String(row.schedule_id||''),'primary','employeeDashboardAttendance')
    :context.kind==='next'
      ?actionButton('Xem lịch','route:schedule','secondary')
      :actionButton('Xem giờ công','route:attendance','secondary');

  x.body.dataset.employeeTodayState='ready';heading.textContent=label;setBadge(x,status,tone);
  box.innerHTML='<div id="employeeDashboardLegacyToday" class="employee-today-shift-main" data-today-shift-kind="'+context.kind+'" data-schedule-id="'+esc(row.schedule_id||'')+'">'+
    '<div class="employee-today-shift-time">'+esc(hm(row.start_time))+'–'+esc(hm(row.end_time))+'</div>'+
    '<div class="employee-today-shift-store">'+esc(row.store_code||row.store_name||'Cửa hàng')+'</div>'+
    '<div class="employee-today-shift-date">'+esc(C.date.formatDate(row.work_date||C.date.dateKey()))+' · Lịch đã phát hành</div>'+
    '<div class="employee-today-shift-note">'+esc(note)+'</div>'+
    '<div class="employee-today-shift-actions">'+cta+'</div>'+
  '</div>';
}

function queueItem({icon,title,detail,label,action,variant='secondary'}){
  return '<article class="employee-today-action" data-today-queue-action="'+esc(action)+'">'+
    '<div class="employee-today-action__icon" aria-hidden="true">'+icon+'</div>'+
    '<div class="employee-today-action__copy"><strong>'+esc(title)+'</strong><span>'+esc(detail)+'</span></div>'+
    actionButton(label,action,variant)+
  '</article>';
}

function renderQueue(x,snapshot){
  const list=x?.getElementById('taskList'),empty=x?.getElementById('noTaskState'),badge=x?.getElementById('taskBadge');
  if(!list||!empty)return;
  const actions=[];
  if(snapshot.kind==='loading'){
    list.innerHTML='<div class="employee-today-shift-skeleton" data-today-queue-loading="1"><span class="m-skeleton"></span><span class="m-skeleton"></span><span class="m-skeleton"></span></div>';
    empty.hidden=true;if(badge)badge.textContent='Đang xác định';return;
  }
  if(snapshot.kind==='error'){
    actions.push({icon:'↻',title:'Tải lại lịch làm',detail:'Không thể xác định việc cần làm khi lịch chưa tải được.',label:'Thử lại',action:'retry-schedule'});
  }else if(snapshot.kind==='wrong-week'){
    actions.push({icon:'▦',title:'Mở lại lịch tuần này',detail:'Today chỉ dùng dữ liệu của tuần hiện tại.',label:'Mở Lịch',action:'route:schedule'});
  }else{
    const current=shiftContext(snapshot.todayRows);
    if(current.kind==='current'&&current.row?.schedule_id){
      actions.push({icon:'◷',title:'Chấm công ca hiện tại',detail:hm(current.row.start_time)+'–'+hm(current.row.end_time)+' · '+(current.row.store_code||current.row.store_name||'Cửa hàng'),label:'Chấm công',action:'attendance:'+String(current.row.schedule_id),variant:'primary'});
    }else if(current.kind==='next'){
      actions.push({icon:'▦',title:'Kiểm tra ca tiếp theo',detail:hm(current.row.start_time)+'–'+hm(current.row.end_time)+' · '+(current.row.store_code||current.row.store_name||'Cửa hàng'),label:'Xem lịch',action:'route:schedule'});
    }else if(current.kind==='ended'){
      actions.push({icon:'◷',title:'Kiểm tra giờ công hôm nay',detail:'Ca hôm nay đã qua giờ kết thúc.',label:'Xem công',action:'route:attendance'});
    }else if(current.kind==='empty'){
      actions.push({icon:'▦',title:'Xem lịch làm trong tuần',detail:'Hôm nay chưa có ca chính thức.',label:'Xem lịch',action:'route:schedule'});
    }
  }

  const availability=globalThis.MAGASIN_EMPLOYEE?.availability;
  if(availability?.getRegistrationState?.()==='REGISTRATION_OPEN'){
    actions.push({icon:'＋',title:'Đăng ký Availability tuần sau',detail:'Gửi thời gian bạn có thể nhận ca; đây chưa phải lịch chính thức.',label:'Đăng ký',action:'availability'});
  }
  if(snapshot.state?.notice){
    actions.push({icon:'!',title:'Lịch vừa có thay đổi',detail:String(snapshot.state.notice),label:'Xem lịch',action:'route:schedule'});
  }

  list.innerHTML=actions.map(queueItem).join('');
  empty.hidden=actions.length>0;
  if(badge)badge.textContent=actions.length?actions.length+' việc':'Không có việc';
}

function renderWeek(x,snapshot){
  const root=x?.getElementById('employeeTodayWeekSummary');if(!root)return;
  if(snapshot.kind==='loading'){
    root.innerHTML='<div class="employee-today-week-skeleton" data-today-week-loading="1">'+Array.from({length:7},()=>'<span class="m-skeleton"></span>').join('')+'</div>';return;
  }
  if(snapshot.kind==='error'){
    root.innerHTML='<div class="employee-today-error" data-today-week-error="1"><strong>Không tải được lịch tuần này.</strong><div style="margin-top:4px">Today không hiển thị dữ liệu cũ khi nguồn lịch lỗi.</div></div>';return;
  }
  if(snapshot.kind==='wrong-week'){
    root.innerHTML='<div class="employee-today-empty" data-today-week-unavailable="1"><strong>Chưa có dữ liệu tuần hiện tại.</strong><div class="muted" style="margin-top:4px">Mở Lịch để quay về tuần này.</div></div>';return;
  }
  const days=C.date.weekDays(snapshot.currentWeek);
  const today=C.date.dateKey();
  root.innerHTML='<div class="employee-today-week-grid" data-today-week-ready="1">'+days.map((date,i)=>{
    const count=snapshot.rows.filter(r=>String(r.work_date||'').slice(0,10)===date).length;
    return '<div class="employee-today-day" data-date="'+esc(date)+'" data-today="'+String(date===today)+'">'+
      '<span class="employee-today-day__dow">'+DAY_SHORT[i]+'</span>'+
      '<span class="employee-today-day__date">'+esc(C.date.formatDate(date))+'</span>'+
      '<span class="employee-today-day__count">'+(count?count+' ca':'—')+'</span>'+
    '</div>';
  }).join('')+'</div>';
}

function render(){
  const x=d();if(!x)return;
  identity(x);
  const context=x.getElementById('employeeTodayContext');if(context)context.textContent=todayContext()+' · Lịch và việc cần làm từ nguồn đã xác minh';
  const snapshot=sourceState(x);
  renderShift(x,snapshot);
  renderQueue(x,snapshot);
  renderWeek(x,snapshot);
}

function bind(x){
  if(!x?.body||x.body.dataset.employeeTodayEngine==='1')return;
  x.body.dataset.employeeTodayEngine='1';
  x.addEventListener('click',e=>{
    const action=e.target.closest?.('[data-today-action]')?.dataset?.todayAction;
    if(action){
      if(action==='retry-schedule'){void globalThis.MAGASIN_EMPLOYEE?.schedule?.refresh?.().finally?.(render);return}
      if(action==='availability'){globalThis.MAGASIN_EMPLOYEE?.availability?.open?.();return}
      if(action.startsWith('route:')){navigate(x,action.slice(6));return}
      if(action.startsWith('attendance:')){
        const id=action.slice('attendance:'.length);
        if(id)void globalThis.MAGASIN_EMPLOYEE?.schedule?.openAction?.('attendance',id);
        return;
      }
    }
    const route=e.target.closest?.('[data-today-route]')?.dataset?.todayRoute;
    if(route)navigate(x,route);
  },true);
}

function init(){
  const f=host();if(!f||f.dataset.dashboardEngine==='1')return;
  f.dataset.dashboardEngine='1';
  f.addEventListener('load',()=>{const x=f.contentDocument;bind(x);render()});
  document.addEventListener('magasin:schedule-loaded',render);
  if(f.contentDocument){bind(f.contentDocument);render()}
}
globalThis.MAGASIN_EMPLOYEE=globalThis.MAGASIN_EMPLOYEE||{};
globalThis.MAGASIN_EMPLOYEE.dashboard={refresh:render};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
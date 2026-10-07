(()=>{'use strict';
if(window.__MAGASIN_EMPLOYEE_PRESENTATION_V4__)return;
window.__MAGASIN_EMPLOYEE_PRESENTATION_V4__=true;
const PRESETS=Object.freeze({
 morning:{label:'Ca sáng',start:'05:00',end:'12:00'},
 afternoon:{label:'Ca chiều',start:'12:00',end:'17:00'},
 evening:{label:'Ca tối',start:'17:00',end:'22:00'},
 all:{label:'Cả ngày',start:'05:00',end:'22:00'}
});
const byId=id=>document.getElementById(id);
function setHeader(title,sub){const h=byId('headerPageTitle'),s=byId('pageSub');if(h)h.textContent=title;if(s)s.textContent=sub}
function syncHeader(){
 const schedule=byId('view-schedule'),panel=byId('weeklyRegistrationPanel'),open=!!panel?.classList.contains('open');
 document.body.dataset.x19hRegistrationView=open?'1':'0';
 const active=document.querySelector('.page-view.active[id^="view-"]');
 let primary=active?.id?.replace(/^view-/,'')||'dashboard';
 if(primary==='schedule'&&open)primary='availability';
 document.body.dataset.x19hPrimaryView=primary;
 if(schedule?.classList.contains('active')){
  if(open)setHeader('Đăng ký lịch tuần','Chọn ngày và giờ bạn có thể làm');
  else setHeader('Lịch của tôi','Lịch làm chính thức đã được phát hành');
 }
}
function ensureSourceMarkers(){
 document.querySelector('#view-schedule .employee-schedule-secondary')?.setAttribute('data-x19h-source','availability');
 document.querySelector('#view-schedule .schedule-main-panel')?.setAttribute('data-x19h-source','published');
}
function ensurePresets(){
 const panel=byId('weeklyRegistrationPanel'),form=panel?.querySelector('.employee-availability-form');if(!panel||!form||panel.querySelector('[data-x19h-presets]'))return;
 const box=document.createElement('div');box.className='x19h-availability-presets';box.dataset.x19hPresets='1';box.setAttribute('aria-label','Gợi ý khung giờ nhanh');
 box.innerHTML='<div class="x19h-preset-copy"><strong>Gợi ý nhanh</strong><span>Chỉ điền sẵn giờ; bạn vẫn có thể chỉnh Bắt đầu/Kết thúc trước khi đăng ký.</span></div><div class="x19h-preset-buttons">'+Object.entries(PRESETS).map(([key,p])=>'<button class="m-button m-button--secondary" type="button" data-x19h-preset="'+key+'">'+p.label+' · '+p.start+'–'+p.end+'</button>').join('')+'</div>';
 form.insertAdjacentElement('afterend',box);
}
function applyPreset(key){
 const p=PRESETS[key],start=byId('quickRegStart'),end=byId('quickRegEnd');if(!p||!start||!end)return false;
 start.value=p.start;end.value=p.end;
 const msg=byId('quickRegMsg');if(msg)msg.textContent='Đã chọn gợi ý '+p.label+' '+p.start+'–'+p.end+'. Bạn vẫn có thể chỉnh giờ chính xác trước khi đăng ký.';
 start.dispatchEvent(new Event('change',{bubbles:true}));end.dispatchEvent(new Event('change',{bubbles:true}));
 return true;
}
function ensureAttendanceGuide(){
 const view=byId('view-attendance');if(!view||view.querySelector('[data-x19h-attendance-modes]'))return;
 const box=document.createElement('section');box.className='x19h-attendance-modes';box.dataset.x19hAttendanceModes='1';box.setAttribute('aria-label','Hai trường hợp chấm công');
 box.innerHTML='<article class="x19h-attendance-mode" data-x19h-attendance-path="published"><span class="x19h-mode-badge">Theo lịch đã phát hành</span><strong>Chấm công ca đã được xếp</strong><p>Chọn ca chính thức và nhập giờ bắt đầu/kết thúc thực tế. Luồng hiện có tiếp tục xử lý theo authority chấm công canonical.</p></article><article class="x19h-attendance-mode" data-x19h-attendance-path="outside"><span class="x19h-mode-badge warning">Ngoài lịch phát hành</span><strong>Cần quản lý xác nhận</strong><p>Nếu bạn làm ngoài lịch đã phát hành, đây là trường hợp riêng và phải được quản lý xác nhận; màn hình này không tự biến thời gian ngoài lịch thành ca chính thức.</p></article>';
 view.prepend(box);
}
function routePrimary(key){
 const b=document.querySelector('[data-employee-primary-view="'+key+'"]');
 if(b){b.click();return true}
 if(key==='availability'){globalThis.parent?.MAGASIN_EMPLOYEE?.availability?.open?.();return true}
 return false;
}
function ensureDashboardActions(){
 const shift=byId('view-dashboard')?.querySelector('.employee-today-card--shift');
 if(shift&&!shift.querySelector('[data-x19h-home-shift-actions]')){
  const a=document.createElement('div');a.className='x19h-home-shift-actions';a.dataset.x19hHomeShiftActions='1';
  a.innerHTML='<button type="button" class="m-button m-button--primary" data-x19h-route="attendance">◷ Chấm công vào ca</button><button type="button" class="m-button m-button--secondary" data-x19h-route="schedule">▦ Xem lịch tuần</button>';
  shift.appendChild(a);
 }
 const layout=byId('view-dashboard')?.querySelector('.employee-today-layout');
 if(layout&&!layout.querySelector('[data-x19h-home-registration]')){
  const card=document.createElement('section');card.className='m-card x19h-home-registration';card.dataset.x19hHomeRegistration='1';
  card.innerHTML='<div><span class="x19h-home-registration-icon" aria-hidden="true">▣</span><div><strong>Đăng ký lịch tuần</strong><span>Chọn ngày và giờ bạn có thể làm cho tuần kế tiếp.</span></div></div><button type="button" class="m-button m-button--primary" data-x19h-route="availability">Đăng ký ngay →</button>';
  const shift=layout.querySelector('.employee-today-card--shift');
  if(shift)shift.insertAdjacentElement('afterend',card);else layout.prepend(card);
 }
}
function ensureWeekListActions(){
 const panel=byId('weeklyRegistrationPanel');if(!panel)return;
 panel.querySelectorAll('.availability-calendar-day').forEach(day=>{
  const header=day.querySelector(':scope > header'),date=day.dataset.avDay||'';
  if(header&&!header.querySelector('[data-x19h-day-add]')){
   const b=document.createElement('button');b.type='button';b.className='x19h-day-add';b.dataset.x19hDayAdd=date;b.setAttribute('aria-label','Thêm giờ cho '+(header.textContent||date));b.textContent='+';
   header.appendChild(b);
  }
  day.dataset.x19hHasRanges=day.querySelector('.availability-calendar-card')?'1':'0';
 });
}
function observeWeekList(){
 const box=byId('weeklyRegistrationPanel')?.querySelector('.week-summary');if(!box||box.dataset.x19hObserved)return;
 box.dataset.x19hObserved='1';new MutationObserver(()=>queueMicrotask(ensureWeekListActions)).observe(box,{childList:true,subtree:true});
 ensureWeekListActions();
}
function syncDashboardBand(){
 const card=byId('view-dashboard')?.querySelector('.employee-today-card--shift');if(!card)return;
 const text=card.querySelector('.employee-today-shift-time')?.textContent||'';
 const m=text.match(/(\d{2}):(\d{2})/);if(!m){delete card.dataset.x19hBand;return}
 const min=Number(m[1])*60+Number(m[2]);
 card.dataset.x19hBand=min<720?'morning':min<1020?'afternoon':'evening';
}
function compactScheduleDays(){
 const names=['T2','T3','T4','T5','T6','T7','CN'];
 document.querySelectorAll('#view-schedule .employee-schedule-engine .day').forEach((day,i)=>{
  const d=day.querySelector('.dow');if(!d)return;
  if(!d.dataset.x19hFullLabel)d.dataset.x19hFullLabel=d.textContent.trim();
  d.textContent=names[i]||d.textContent;
  d.setAttribute('title',d.dataset.x19hFullLabel);
 });
}
function observeVisualSurfaces(){
 const dashboard=byId('view-dashboard'),schedule=byId('view-schedule');
 const refresh=()=>{syncDashboardBand();compactScheduleDays();syncHeader()};
 if(dashboard)new MutationObserver(refresh).observe(dashboard,{childList:true,subtree:true,characterData:true});
 if(schedule)new MutationObserver(refresh).observe(schedule,{childList:true,subtree:true,attributes:true,attributeFilter:['class','aria-hidden']});
 refresh();
}
function bind(){
 document.body.dataset.x19hEmployeePresentation='1';document.body.dataset.x19hVisual='owner-mockup-v3';ensureSourceMarkers();ensurePresets();ensureAttendanceGuide();ensureDashboardActions();observeWeekList();observeVisualSurfaces();syncHeader();
 const panel=byId('weeklyRegistrationPanel');if(panel&&!panel.dataset.x19hModeObserved){panel.dataset.x19hModeObserved='1';new MutationObserver(()=>{syncHeader();ensureWeekListActions()}).observe(panel,{attributes:true,attributeFilter:['class','aria-hidden']})}
 document.addEventListener('click',e=>{
   const preset=e.target.closest?.('[data-x19h-preset]');if(preset){e.preventDefault();applyPreset(preset.dataset.x19hPreset);return}
   const add=e.target.closest?.('[data-x19h-day-add]');if(add){e.preventDefault();const day=byId('quickRegDay');if(day){day.value=add.dataset.x19hDayAdd;day.dispatchEvent(new Event('change',{bubbles:true}))}byId('quickRegStart')?.focus?.({preventScroll:true});byId('weeklyRegistrationPanel')?.querySelector('.employee-availability-form')?.scrollIntoView?.({behavior:'smooth',block:'center'});return}
   const route=e.target.closest?.('[data-x19h-route]');if(route){e.preventDefault();routePrimary(route.dataset.x19hRoute);return}
   if(e.target.closest?.('[data-employee-primary-view],.nav [data-view]'))setTimeout(syncHeader,0);
 },true);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
window.MAGASIN_EMPLOYEE_PRESENTATION_V4=Object.freeze({version:'20261007-xstore-019h-visual3',applyPreset,syncHeader,PRESETS});
})();
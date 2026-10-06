(()=>{'use strict';
if(window.__MAGASIN_EMPLOYEE_PRESENTATION_V4__)return;
window.__MAGASIN_EMPLOYEE_PRESENTATION_V4__=true;
const PRESETS=Object.freeze({
 morning:{label:'Sáng',start:'05:00',end:'12:00'},
 afternoon:{label:'Chiều',start:'12:00',end:'17:00'},
 evening:{label:'Tối',start:'17:00',end:'22:00'},
 all:{label:'Cả ngày',start:'05:00',end:'22:00'}
});
const byId=id=>document.getElementById(id);
function setHeader(title,sub){const h=byId('headerPageTitle'),s=byId('pageSub');if(h)h.textContent=title;if(s)s.textContent=sub}
function syncHeader(){
 const schedule=byId('view-schedule'),panel=byId('weeklyRegistrationPanel');
 if(!schedule?.classList.contains('active'))return;
 if(panel?.classList.contains('open'))setHeader('Đăng ký lịch làm','Chọn chính xác ngày và giờ có thể làm');
 else setHeader('Lịch của tôi','Lịch làm chính thức đã được phát hành');
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
function bind(){
 document.body.dataset.x19hEmployeePresentation='1';ensureSourceMarkers();ensurePresets();ensureAttendanceGuide();syncHeader();
 const panel=byId('weeklyRegistrationPanel');if(panel&&!panel.dataset.x19hObserved){panel.dataset.x19hObserved='1';new MutationObserver(syncHeader).observe(panel,{attributes:true,attributeFilter:['class','aria-hidden']})}
 document.addEventListener('click',e=>{
   const preset=e.target.closest?.('[data-x19h-preset]');if(preset){e.preventDefault();applyPreset(preset.dataset.x19hPreset);return}
   if(e.target.closest?.('[data-employee-primary-view],.nav [data-view]'))setTimeout(syncHeader,0);
 },true);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
window.MAGASIN_EMPLOYEE_PRESENTATION_V4=Object.freeze({version:'20261006-xstore-019h',applyPreset,syncHeader,PRESETS});
})();
(()=>{'use strict';
if(window.__MAGASIN_MANAGER_WORKFORCE_UI_CONSOLIDATED_V1__)return;
window.__MAGASIN_MANAGER_WORKFORCE_UI_CONSOLIDATED_V1__=true;
const labels={dashboard:'🏠 Hôm nay',staff:'👥 Nhân viên',workforce:'📅 Xếp lịch',schedule:'🗓 Lịch làm',swap:'🔄 Đổi / cho ca',attendance:'⏱ Chấm công','payroll-self-check':'💰 Công / Lương'};
const allowed=new Set(['dashboard','staff','workforce','schedule','swap','attendance','payroll-self-check']);
const alias={'cham-cong':'attendance','doi-ca':'swap','nhan-su':'staff','cong-luong':'payroll-self-check','payroll':'payroll-self-check'};
function normalize(v){const s=String(v||'').replace(/^#/,'').trim().toLowerCase();return alias[s]||s}
function renameNav(){for(const [view,label] of Object.entries(labels)){const b=document.querySelector('[data-view="'+view+'"]');if(b)b.textContent=label}}
function hideDeprecated(){
 for(const view of ['kpi','academy']){const b=document.querySelector('[data-view="'+view+'"]');if(b){b.hidden=true;b.setAttribute('aria-hidden','true');b.tabIndex=-1}}
 document.querySelector('[data-tab="demand"]')?.remove();
 document.getElementById('panel-demand')?.remove();
}
function rewriteToday(){
 const root=document.getElementById('view-dashboard');if(!root||root.dataset.workforceTodayCanonical==='1')return;
 root.dataset.workforceTodayCanonical='1';
 root.innerHTML='<section class="card"><div class="row" style="justify-content:space-between;align-items:flex-start"><div><h2 style="margin:0">Hôm nay</h2><div class="muted" style="margin-top:5px">Đi thẳng tới các ngoại lệ và thao tác Workforce V1; không hiển thị số liệu demo làm business truth.</div></div><span class="badge blue">Workforce V1</span></div><div class="grid2" style="margin-top:16px"><button class="btn" data-workforce-jump="workforce">📅 Xếp lịch tuần</button><button class="btn" data-workforce-jump="swap">🔄 Đổi / cho ca</button><button class="btn" data-workforce-jump="attendance">⏱ Review chấm công</button><button class="btn" data-workforce-jump="staff">👥 Nhân viên</button><button class="btn" data-workforce-jump="payroll-self-check">💰 Công / Lương</button><button class="btn" data-workforce-jump="schedule">🗓 Lịch đã phát hành</button></div></section>';
}
function activate(view){
 const v=normalize(view);if(!allowed.has(v))return false;
 const b=document.querySelector('[data-view="'+v+'"]');if(!b)return false;
 b.click();return true;
}
function applyHash(attempt=0){
 const v=normalize(location.hash);if(!v)return;
 if(!allowed.has(v)){history.replaceState(null,'',location.pathname+location.search);return}
 if(!activate(v)&&attempt<12)setTimeout(()=>applyHash(attempt+1),60);
}
function consolidate(){renameNav();hideDeprecated();rewriteToday();applyHash()}
document.addEventListener('click',e=>{
 const jump=e.target.closest?.('[data-workforce-jump]');if(jump){e.preventDefault();activate(jump.dataset.workforceJump)}
 const nav=e.target.closest?.('[data-view]');if(nav&&allowed.has(normalize(nav.dataset.view)))history.replaceState(null,'','#'+normalize(nav.dataset.view));
},true);
window.addEventListener('hashchange',()=>applyHash());
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',consolidate,{once:true});else consolidate();
for(const ms of [50,250,1000])setTimeout(consolidate,ms);
})();
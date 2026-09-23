(()=>{'use strict';
if(window.__MAGASIN_EMPLOYEE_WORKFORCE_UI_CONSOLIDATED_V1__)return;
window.__MAGASIN_EMPLOYEE_WORKFORCE_UI_CONSOLIDATED_V1__=true;
const host=()=>document.getElementById('employeeApp'),doc=()=>host()?.contentDocument||null;
const allowed=new Set(['dashboard','schedule','attendance','swap','payroll','profile']);
const alias={'hom-nay':'dashboard','lich-lam':'schedule','cham-cong':'attendance','doi-ca':'swap','cho-ca':'swap','luong':'payroll','ca-nhan':'profile'};
const normalize=v=>{const s=String(v||'').replace(/^#/,'').trim().toLowerCase();return alias[s]||s};
function relabel(d){
 const labels={dashboard:'🏠 Hôm nay',schedule:'📅 Lịch làm',attendance:'⏱ Chấm công',swap:'🔄 Đổi / cho ca',payroll:'💰 Lương',profile:'👤 Cá nhân'};
 for(const [view,label] of Object.entries(labels)){const a=d.querySelector('.nav [data-view="'+view+'"]');if(a)a.textContent=label}
 const legacy=d.querySelector('#view-attendance .attendance-report-wrap > .panel:first-child');
 if(legacy){legacy.hidden=true;legacy.setAttribute('aria-hidden','true');legacy.style.display='none'}
}
function activate(attempt=0){
 const d=doc();if(!d)return;
 relabel(d);
 const v=normalize(location.hash);if(!v||!allowed.has(v))return;
 const link=d.querySelector('.nav [data-view="'+v+'"]');
 if(link)link.click();else if(attempt<12)setTimeout(()=>activate(attempt+1),60);
}
function init(){
 const f=host();if(!f)return;
 f.addEventListener('load',()=>{activate();setTimeout(()=>activate(),80)},{once:false});
 if(f.contentDocument)activate();
}
window.addEventListener('hashchange',()=>activate());
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
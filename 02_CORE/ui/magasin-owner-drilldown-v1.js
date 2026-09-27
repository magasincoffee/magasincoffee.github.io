/*
 * MAGASIN Owner drill-down presentation adapter — UI2-015
 * Adds presentation-only Owner module context and an explicit non-routable Finance reservation.
 */
(()=>{'use strict';
const FINANCE_TEXT='Chưa có runtime được chấp nhận';
function mountFinanceReserved(){
  if(document.querySelector('[data-owner-finance-reserved]'))return true;
  const nav=document.querySelector('#magasinUiV2Shell .m-shell-v2-nav');
  if(!nav)return false;
  const section=document.createElement('section');
  section.className='m-owner-finance-reserved';
  section.dataset.ownerFinanceReserved='1';
  section.setAttribute('role','status');
  section.setAttribute('aria-label','Tài chính chưa có runtime');
  section.innerHTML='<span class="m-owner-finance-reserved__label">Reserved · no route</span><strong>Tài chính</strong><small>'+FINANCE_TEXT+'. Không có reader, KPI hoặc nguồn dữ liệu được tạo bởi UI2-015.</small><span data-owner-finance-state>NOT CONNECTED</span>';
  nav.appendChild(section);
  return true;
}
function syncModuleTabs(){
  const tablist=document.querySelector('.owner-module-tabs');
  if(!tablist)return;
  tablist.setAttribute('role','tablist');
  const apply=()=>tablist.querySelectorAll('[data-tab]').forEach(button=>{
    button.setAttribute('role','tab');
    button.setAttribute('aria-selected',button.classList.contains('active')?'true':'false');
  });
  apply();
  tablist.addEventListener('click',()=>setTimeout(apply,0));
}
function reconcileProcurementRole(){
  const user=document.querySelector('#userName');
  if(!user)return;
  const apply=()=>{
    if(!/Kế toán/i.test(user.textContent||''))return;
    document.getElementById('magasinUiV2Shell')?.remove();
    document.body.removeAttribute('data-magasin-shell-v2');
    document.body.removeAttribute('data-magasin-shell-role');
    document.body.style.setProperty('--m-shell-topbar-height','0px');
    document.body.dataset.ownerDrilldownV1='';
  };
  apply();
  new MutationObserver(apply).observe(user,{childList:true,subtree:true,characterData:true});
}
function install(){
  if(!document.body)return;
  document.body.dataset.ownerDrilldownV1='';
  const context=document.querySelector('[data-owner-module-context]');
  if(context)context.dataset.ownerModuleContextReady='true';
  syncModuleTabs();
  reconcileProcurementRole();
  if(String(document.body.dataset.magasinShellRole||'').toLowerCase()!=='owner')return;
  if(mountFinanceReserved())return;
  const obs=new MutationObserver(()=>{if(mountFinanceReserved())obs.disconnect()});
  obs.observe(document.documentElement,{childList:true,subtree:true});
  setTimeout(()=>obs.disconnect(),10000);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
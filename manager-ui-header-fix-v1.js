/* MAGASIN Manager header dedupe V1 */
(function(window,document){
  'use strict';
  if(window.MAGASIN_MANAGER_HEADER_FIX_V1)return;
  window.MAGASIN_MANAGER_HEADER_FIX_V1=true;
  function fix(){
    const header=document.querySelector('.header');
    if(!header)return false;
    const left=header.querySelector('.header-left');
    const right=header.querySelector('.header-right');
    if(!left||!right)return false;
    const menus=Array.from(left.querySelectorAll('button'));
    const keepMenu=left.querySelector('.manager-v2-menu')||menus[0];
    if(keepMenu){
      keepMenu.classList.add('manager-v2-menu');
      menus.forEach(b=>{if(b!==keepMenu)b.style.display='none';});
    }
    const bells=Array.from(right.querySelectorAll('button'));
    const keepBell=right.querySelector('.manager-v2-bell')||bells.find(b=>/🔔|notification|thông báo/i.test(b.textContent||b.getAttribute('aria-label')||b.title||''));
    if(keepBell){
      keepBell.classList.add('manager-v2-bell');
      bells.forEach(b=>{if(b!==keepBell)b.style.display='none';});
    }
    return true;
  }
  function boot(){let n=0;const tick=()=>{if(fix())return;if(++n<50)setTimeout(tick,200)};tick()}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})(window,document);

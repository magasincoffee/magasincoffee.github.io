/* MAGASIN Manager header dedupe V2 */
(function(window,document){
  'use strict';
  if(window.MAGASIN_MANAGER_HEADER_FIX_V2)return;
  window.MAGASIN_MANAGER_HEADER_FIX_V2=true;
  let scheduled=false;
  const isMenu=b=>b===document.querySelector('#menuBtn')||b.classList.contains('manager-v2-menu')||/☰|menu|mở menu/i.test((b.textContent||'')+' '+(b.getAttribute('aria-label')||'')+' '+(b.title||''));
  const isBell=b=>b.classList.contains('manager-v2-bell')||/🔔|notification|thông báo/i.test((b.textContent||'')+' '+(b.getAttribute('aria-label')||'')+' '+(b.title||''));
  function fix(){
    const header=document.querySelector('.header');
    if(!header)return false;
    const left=header.querySelector('.header-left');
    const right=header.querySelector('.header-right');
    if(!left||!right)return false;
    const menuButtons=Array.from(left.querySelectorAll('button')).filter(isMenu);
    const keepMenu=menuButtons.find(b=>b.id==='menuBtn')||menuButtons.find(b=>b.classList.contains('manager-v2-menu'))||menuButtons[0];
    if(keepMenu){keepMenu.classList.add('manager-v2-menu');menuButtons.forEach(b=>{if(b!==keepMenu)b.style.display='none';});}
    const bellButtons=Array.from(right.querySelectorAll('button')).filter(isBell);
    let keepBell=bellButtons.find(b=>b.classList.contains('manager-v2-bell'))||bellButtons[0];
    if(!keepBell){
      keepBell=document.createElement('button');
      keepBell.type='button';keepBell.className='manager-v2-bell';keepBell.title='Thông báo';keepBell.setAttribute('aria-label','Thông báo');keepBell.textContent='🔔';
      const avatar=right.querySelector('#headerAvatar,.avatar,.badge');
      if(avatar)right.insertBefore(keepBell,avatar);else right.appendChild(keepBell);
    }
    bellButtons.forEach(b=>{if(b!==keepBell)b.style.display='none';});
    Array.from(right.childNodes).forEach(n=>{if(n.nodeType===Node.TEXT_NODE&&/🔔/.test(n.nodeValue||''))n.nodeValue='';});
    return true;
  }
  function run(){scheduled=false;fix()}
  function schedule(){if(scheduled)return;scheduled=true;setTimeout(run,0)}
  function boot(){
    fix();
    const header=document.querySelector('.header');
    if(header){const mo=new MutationObserver(schedule);mo.observe(header,{childList:true,subtree:true});}
    let n=0;const tick=()=>{fix();if(++n<40)setTimeout(tick,250)};tick();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})(window,document);

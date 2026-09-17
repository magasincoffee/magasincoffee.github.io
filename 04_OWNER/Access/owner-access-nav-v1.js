/* MAGASIN — Owner account permissions navigation */
(()=>{'use strict';
function install(){
  const nav=document.querySelector('.sidebar .nav, nav.nav');
  if(!nav||nav.querySelector('[data-owner-access-nav]'))return false;
  const btn=document.createElement('button');
  btn.type='button';
  btn.dataset.ownerAccessNav='1';
  btn.innerHTML='🔐 Phân quyền tài khoản';
  btn.addEventListener('click',e=>{
    e.preventDefault();
    const target='/04_OWNER/Access/';
    try{window.top.location.assign(target)}catch(_){location.assign(target)}
  });
  const settings=nav.querySelector('[data-view="settings"]');
  if(settings)nav.insertBefore(btn,settings);else nav.appendChild(btn);
  return true;
}
if(!install()){
  const obs=new MutationObserver(()=>{if(install())obs.disconnect()});
  obs.observe(document.documentElement,{childList:true,subtree:true});
  setTimeout(()=>obs.disconnect(),10000);
}
})();

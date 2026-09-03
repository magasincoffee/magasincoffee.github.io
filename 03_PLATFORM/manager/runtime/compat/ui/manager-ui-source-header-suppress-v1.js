/* MAGASIN Manager source-header suppression V1
 * The base manager-v11 page already contains a legacy mobile menu button and
 * a text-node notification icon. manager-ui-shell-v2 owns the header now,
 * so suppress the legacy elements BEFORE the shell boots.
 */
(function(window,document){
  'use strict';
  if(window.MAGASIN_MANAGER_SOURCE_HEADER_SUPPRESS_V1)return;
  window.MAGASIN_MANAGER_SOURCE_HEADER_SUPPRESS_V1=true;

  function suppress(){
    const menu=document.querySelector('#menuBtn');
    if(menu)menu.style.setProperty('display','none','important');

    const right=document.querySelector('.header-right');
    if(right){
      Array.from(right.childNodes).forEach(node=>{
        if(node.nodeType===Node.TEXT_NODE && /🔔/.test(node.nodeValue||'')){
          node.nodeValue='';
        }
      });
    }
    return !!menu || !!right;
  }

  function boot(){
    suppress();
    const observer=new MutationObserver(()=>suppress());
    observer.observe(document.documentElement,{childList:true,subtree:true,characterData:true});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})(window,document);

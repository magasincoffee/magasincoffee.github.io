(()=>{'use strict';
const PANEL='#panel-review';
const STYLE_ID='mwr-edit-cleanup-v1-css';
const clean=panel=>{
  if(!panel)return;
  panel.querySelectorAll('.mwr2-transfer').forEach(el=>el.remove());
  panel.querySelectorAll('.mwr2-field').forEach(field=>{
    const label=field.querySelector('label');
    if(label && /^Nội dung ghi chú$/i.test((label.textContent||'').trim())) field.remove();
  });
};
const boot=()=>{
  const panel=document.querySelector(PANEL); if(!panel)return;
  if(!document.getElementById(STYLE_ID)){
    const s=document.createElement('style');s.id=STYLE_ID;s.textContent='.mwr2-transfer,.mwr2-field:has(label){ }';document.head.appendChild(s);
  }
  clean(panel);
  const observer=new MutationObserver(()=>requestAnimationFrame(()=>clean(panel)));
  observer.observe(panel,{childList:true,subtree:true});
};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,0),{once:true});else setTimeout(boot,0);
})();

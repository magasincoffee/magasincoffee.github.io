/* MAGASIN — Preserve the existing Employee V40 attendance form. UI-only. */
(function(window, document){
  'use strict';
  const TEMPLATE_URL='/employee-v40.html?attendance-ui-template=20260901-v1';
  const outerFrameId='app', innerFrameId='employeeApp';
  const entrySelector='#view-attendance .attendance-entry-grid .panel:first-child';
  let originalHtml='', armed=false;
  async function loadTemplate(){
    try{
      const r=await fetch(TEMPLATE_URL,{cache:'no-store',credentials:'same-origin'});
      if(!r.ok)return false;
      const d=new DOMParser().parseFromString(await r.text(),'text/html');
      const e=d.querySelector(entrySelector);
      if(!e)return false;
      originalHtml=e.innerHTML;
      return true;
    }catch(_){return false;}
  }
  function v40Doc(){
    const r=document.getElementById(outerFrameId)?.contentDocument;
    const i=r?.getElementById(innerFrameId);
    return i?.contentDocument||null;
  }
  function guardEntry(entry){
    if(!entry||entry.__magasinV40Guard)return;
    const desc=Object.getOwnPropertyDescriptor(Element.prototype,'innerHTML');
    if(!desc)return;
    Object.defineProperty(entry,'innerHTML',{
      configurable:true,
      get(){return desc.get.call(this);},
      set(v){
        if(armed&&originalHtml&&v!==originalHtml){desc.set.call(this,originalHtml);return;}
        desc.set.call(this,v);
      }
    });
    entry.__magasinV40Guard=true;
    const mo=new MutationObserver(()=>{
      if(armed&&originalHtml&&entry.innerHTML!==originalHtml)entry.innerHTML=originalHtml;
    });
    mo.observe(entry,{childList:true,subtree:true,characterData:true});
  }
  function arm(){
    const doc=v40Doc();
    const entry=doc?.querySelector(entrySelector);
    if(!entry||!originalHtml)return;
    armed=true;
    guardEntry(entry);
    if(entry.innerHTML!==originalHtml)entry.innerHTML=originalHtml;
  }
  function bind(){
    const outer=document.getElementById(outerFrameId);
    if(!outer)return;
    outer.addEventListener('load',()=>{
      const r=outer.contentDocument;
      const inner=r?.getElementById(innerFrameId);
      if(inner&&!inner.__magasinGuardBound){
        inner.addEventListener('load',arm,{once:false});
        inner.__magasinGuardBound=true;
      }
      arm();
    },{once:false});
    arm();
  }
  async function start(){
    if(!(await loadTemplate()))return;
    bind();
    setInterval(arm,1000);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})(window,document);

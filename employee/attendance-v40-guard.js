(function(window, document){
  'use strict';
  const TEMPLATE_URL='/employee-v40.html?attendance-ui-template=v1';
  const outerFrameId='app';
  const innerFrameId='employeeApp';
  const entrySelector='#view-attendance .attendance-entry-grid .panel:first-child';
  let originalHtml='';
  let armed=false;

  async function loadTemplate(){
    try{
      const res=await fetch(TEMPLATE_URL,{cache:'no-store',credentials:'same-origin'});
      if(!res.ok)return false;
      const parsed=new DOMParser().parseFromString(await res.text(),'text/html');
      const source=parsed.querySelector(entrySelector);
      if(!source)return false;
      originalHtml=source.innerHTML;
      return true;
    }catch(_){return false;}
  }

  function getV40Document(){
    const runtime=document.getElementById(outerFrameId)?.contentDocument;
    const inner=runtime?.getElementById(innerFrameId);
    return inner?.contentDocument||null;
  }

  function protect(entry){
    if(!entry||entry.dataset.attendanceUiProtected==='1')return;
    const nativeSetter=Object.getOwnPropertyDescriptor(Element.prototype,'innerHTML')?.set;
    if(!nativeSetter)return;
    Object.defineProperty(entry,'innerHTML',{
      configurable:true,
      get(){return Object.getOwnPropertyDescriptor(Element.prototype,'innerHTML').get.call(this);},
      set(value){
        if(armed&&originalHtml&&value!==originalHtml){nativeSetter.call(this,originalHtml);return;}
        nativeSetter.call(this,value);
      }
    });
    entry.dataset.attendanceUiProtected='1';
    new MutationObserver(()=>{
      if(armed&&originalHtml&&entry.innerHTML!==originalHtml)nativeSetter.call(entry,originalHtml);
    }).observe(entry,{childList:true,subtree:true,characterData:true});
  }

  function arm(){
    if(!originalHtml)return;
    const doc=getV40Document();
    const entry=doc?.querySelector(entrySelector);
    if(!entry)return;
    armed=true;
    protect(entry);
    if(entry.innerHTML!==originalHtml)entry.innerHTML=originalHtml;
  }

  function bind(){
    const outer=document.getElementById(outerFrameId);
    if(!outer)return;
    const runtime=outer.contentDocument;
    const inner=runtime?.getElementById(innerFrameId);
    if(inner&&!inner.dataset.attendanceGuardBound){
      inner.addEventListener('load',arm,{once:false});
      inner.dataset.attendanceGuardBound='1';
    }
    arm();
  }

  async function start(){
    if(!(await loadTemplate()))return;
    bind();
    setInterval(bind,1000);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})(window,document);

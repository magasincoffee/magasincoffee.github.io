/* MAGASIN — Preserve the existing Employee V40 attendance form.
 * UI-only guard. This file intentionally does not read/write Attendance RPCs.
 */
(function(window, document){
  'use strict';
  const TEMPLATE_URL='/employee-v40.html?attendance-ui-template=20260901-v1';
  const runtimeFrameId='app';
  const innerFrameId='employeeApp';
  const entrySelector='#view-attendance .attendance-entry-grid .panel:first-child';
  let originalHtml=''; let armed=false; let observer=null;
  async function loadTemplate(){try{const res=await fetch(TEMPLATE_URL,{cache:'no-store',credentials:'same-origin'});if(!res.ok)return false;const parsed=new DOMParser().parseFromString(await res.text(),'text/html');const source=parsed.querySelector(entrySelector);if(!source)return false;originalHtml=source.innerHTML;return true;}catch(_){return false;}}
  function getRuntimeDocument(){return document.getElementById(runtimeFrameId)?.contentDocument||null;}
  function getV40Document(){const runtimeDoc=getRuntimeDocument();const inner=runtimeDoc?.getElementById(innerFrameId);return inner?.contentDocument||null;}
  function installSetterGuard(entry){if(entry.__magasinAttendanceGuardInstalled)return;const desc=Object.getOwnPropertyDescriptor(Element.prototype,'innerHTML');if(!desc?.get||!desc?.set)return;Object.defineProperty(entry,'innerHTML',{configurable:true,enumerable:false,get(){return desc.get.call(this);},set(value){if(armed&&originalHtml&&value!==originalHtml){desc.set.call(this,originalHtml);return;}desc.set.call(this,value);}});entry.__magasinAttendanceGuardInstalled=true;}
  function arm(){if(!originalHtml)return false;const doc=getV40Document();const entry=doc?.querySelector(entrySelector);if(!entry)return false;installSetterGuard(entry);armed=true;if(entry.innerHTML!==originalHtml)entry.innerHTML=originalHtml;if(observer)observer.disconnect();observer=new MutationObserver(()=>{if(armed&&originalHtml&&entry.innerHTML!==originalHtml)entry.innerHTML=originalHtml;});observer.observe(entry,{childList:true,subtree:true,characterData:true});entry.dataset.magasinAttendanceGuard='v1';return true;}
  function watchFrames(){const outer=document.getElementById(runtimeFrameId);if(!outer)return;const runtimeDoc=outer.contentDocument;const inner=runtimeDoc?.getElementById(innerFrameId);if(inner&&!inner.__magasinGuardBound){inner.addEventListener('load',()=>{setTimeout(arm,0);setTimeout(arm,250);},{once:false});inner.__magasinGuardBound=true;}setTimeout(arm,0);setTimeout(arm,250);setTimeout(arm,1000);}
  async function start(){if(!(await loadTemplate()))return;document.getElementById(runtimeFrameId)?.addEventListener('load',watchFrames,{once:false});watchFrames();setInterval(watchFrames,1000);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})(window,document);

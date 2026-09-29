(()=>{'use strict';
/*
 * SCHED-05 compatibility wrapper.
 * This legacy Owner publish asset no longer owns scheduling mutations.
 * It routes any remaining compatibility load to the shared canonical writer.
 */
window.__MAGASIN_SCHEDULING_ACTOR__='OWNER';
if(window.MAGASIN_MANAGER_SCHEDULE_DRAFT){
  document.dispatchEvent(new CustomEvent('magasin:owner-schedule-open',{detail:{}}));
  return;
}
const writerSrc='/05_MANAGER/Workforce/draft-publish-v1.js?v=20260929-mer003';
const contextSrc='/05_MANAGER/Workforce/manager-context-v1.js?v=20260929-mer003';
function loadWriter(){
  if([...document.scripts].some(s=>(s.src||'').includes('/05_MANAGER/Workforce/draft-publish-v1.js')))return;
  const s=document.createElement('script');s.src=writerSrc;s.async=false;(document.body||document.documentElement).appendChild(s);
}
if(window.MAGASIN_MANAGER_WORKFORCE_CONTEXT){loadWriter();return}
if([...document.scripts].some(s=>(s.src||'').includes('/05_MANAGER/Workforce/manager-context-v1.js'))){setTimeout(loadWriter,0);return}
const ctx=document.createElement('script');ctx.src=contextSrc;ctx.async=false;ctx.onload=loadWriter;(document.body||document.documentElement).appendChild(ctx);
})();
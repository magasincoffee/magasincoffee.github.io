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
const src='/05_MANAGER/Workforce/draft-publish-v1.js?v=20260924-sched05';
if([...document.scripts].some(s=>(s.src||'').includes('/05_MANAGER/Workforce/draft-publish-v1.js')))return;
const s=document.createElement('script');s.src=src;s.async=false;(document.body||document.documentElement).appendChild(s);
})();
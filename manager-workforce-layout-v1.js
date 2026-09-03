/* MAGASIN Owner Workforce layout V1
 * Compact the Workforce hierarchy:
 * 1) Hide duplicate Workforce page heading/subtitle/week badge.
 * 2) Keep one compact week-range bar above the tabs.
 * 3) Move week navigation beside the store selector.
 * 4) Remove the redundant time-color legend row.
 * 5) Re-bind safely after Workforce re-renders so controls are not duplicated.
 */
(()=>{'use strict';
const VIEW='#view-workforce';
const CSS=`<style id="owner-workforce-layout-v1-css">
#owner-workforce-layout-v1-bar{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 14px;margin:0 0 10px;border:1px solid var(--border);border-radius:12px;background:#f8fafd}
#owner-workforce-layout-v1-bar .owf-week-title{font-size:14px;font-weight:800;color:var(--text);white-space:nowrap}
#owner-workforce-layout-v1-bar .owf-hint{font-size:11px;color:var(--muted);white-space:nowrap}
#view-workforce > .owf-moved-header{display:none!important}
#view-workforce .tabs{margin-top:0!important;margin-bottom:12px!important}
#view-workforce .wfd4{margin-top:0!important}
#view-workforce .wfd4-head{align-items:flex-end!important}
#view-workforce .wfd4-controls{display:flex!important;align-items:flex-end!important;gap:8px!important;flex-wrap:wrap!important}
#view-workforce .wfd4-nav{display:flex!important;gap:6px!important;margin:0!important}
#view-workforce .wfd4-nav .btn{min-height:40px!important;padding:0 12px!important}
#view-workforce .wfd4-week{display:none!important}
#view-workforce .wfd4-legend{display:none!important}
@media(max-width:900px){
  #owner-workforce-layout-v1-bar{align-items:flex-start;flex-direction:column}
  #view-workforce .wfd4-controls{width:100%!important;align-items:stretch!important}
  #view-workforce .wfd4-store{flex:1 1 220px!important}
  #view-workforce .wfd4-nav{flex:1 0 100%!important;display:grid!important;grid-template-columns:repeat(3,1fr)!important}
}
</style>`;
function inject(){if(!document.getElementById('owner-workforce-layout-v1-css'))document.head.insertAdjacentHTML('beforeend',CSS)}
function apply(){
  const view=document.querySelector(VIEW); if(!view)return false;
  inject();

  // Remove the duplicate page-level Workforce heading/subtitle/week badge.
  [...view.children].filter(el=>el.matches('.row')&&/Workforce/i.test(el.textContent||'')).forEach(row=>row.classList.add('owf-moved-header'));

  const tabs=view.querySelector('.tabs');
  const demand=view.querySelector('#panel-demand');
  if(!tabs||!demand)return false;

  // Create one compact page-level week indicator above the Workforce tabs.
  let bar=document.getElementById('owner-workforce-layout-v1-bar');
  if(!bar){
    bar=document.createElement('div');
    bar.id='owner-workforce-layout-v1-bar';
    tabs.parentNode.insertBefore(bar,tabs);
  }
  const title=demand.querySelector('.wfd4-week-title');
  if(title){
    bar.innerHTML='<div class="owf-week-title">'+String(title.textContent||'').replace(/</g,'&lt;')+'</div><div class="owf-hint">Tuần làm việc</div>';
  }

  // Move the freshly-rendered navigation out of the week row and place it with the store selector.
  const week=demand.querySelector('.wfd4-week');
  const navInWeek=week?.querySelector('.wfd4-nav');
  const controls=demand.querySelector('.wfd4-controls');
  if(controls&&navInWeek){
    controls.querySelectorAll('.wfd4-nav').forEach(existing=>{if(existing!==navInWeek)existing.remove()});
    controls.appendChild(navInWeek);
  }

  // The legacy row now contains no controls; remove it completely.
  if(week&&!week.querySelector('.wfd4-nav'))week.remove();
  return true;
}
function boot(){
  let n=0;
  const tick=()=>{apply();if(++n<80)setTimeout(tick,150)};
  tick();
  const obs=new MutationObserver(()=>{requestAnimationFrame(apply)});
  const start=()=>{const v=document.querySelector(VIEW);if(v)obs.observe(v,{childList:true,subtree:true})};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();

/* MAGASIN Owner Workforce layout V2
 * Desired hierarchy from owner reference screenshot:
 * - Remove the duplicate page-level week bar entirely.
 * - Keep the page title/header as provided by the shell.
 * - Keep Workforce tabs directly above the demand card.
 * - In Nhu cầu nhân sự, keep Cửa hàng on the left of the control cluster.
 * - Put the week range ABOVE the Trước/Tuần này/Sau navigation.
 * - Keep the week range + navigation visually grouped on the right.
 * - Remove redundant legend.
 * - Re-bind safely after Workforce re-renders.
 */
(()=>{'use strict';
const VIEW='#view-workforce';
const CSS=`<style id="owner-workforce-layout-v2-css">
#owner-workforce-layout-v2-range{font-size:12px;font-weight:800;color:var(--text);white-space:nowrap;text-align:right;line-height:1.2;margin:0 0 5px 0}
#owner-workforce-layout-v2-nav-wrap{display:flex;flex-direction:column;align-items:flex-end;gap:0}
#view-workforce .wfd4-head{align-items:flex-end!important}
#view-workforce .wfd4-controls{display:flex!important;align-items:flex-end!important;gap:8px!important;flex-wrap:nowrap!important}
#view-workforce .wfd4-controls > .wfd4-store{flex:0 0 auto!important}
#view-workforce .wfd4-nav{display:flex!important;gap:6px!important;margin:0!important}
#view-workforce .wfd4-nav .btn{min-height:40px!important;padding:0 12px!important}
#view-workforce .wfd4-week{display:none!important}
#view-workforce .wfd4-legend{display:none!important}
#owner-workforce-layout-v1-bar{display:none!important}
@media(max-width:900px){
  #view-workforce .wfd4-head{align-items:stretch!important}
  #view-workforce .wfd4-controls{width:100%!important;align-items:stretch!important;flex-wrap:wrap!important}
  #view-workforce .wfd4-store{flex:1 1 220px!important}
  #owner-workforce-layout-v2-nav-wrap{margin-left:auto;align-items:flex-end}
}
@media(max-width:560px){
  #owner-workforce-layout-v2-nav-wrap{width:100%;align-items:stretch}
  #owner-workforce-layout-v2-range{text-align:left}
  #view-workforce .wfd4-nav{width:100%;display:grid!important;grid-template-columns:repeat(3,1fr)!important}
  #view-workforce .wfd4-nav .btn{width:100%!important}
}
</style>`;
function inject(){if(!document.getElementById('owner-workforce-layout-v2-css'))document.head.insertAdjacentHTML('beforeend',CSS)}
function apply(){
  const view=document.querySelector(VIEW); if(!view)return false;
  inject();
  // Hide the previously injected V1 page-level week bar, including stale versions.
  view.querySelectorAll('#owner-workforce-layout-v1-bar').forEach(el=>el.remove());

  const tabs=view.querySelector('.tabs');
  const demand=view.querySelector('#panel-demand');
  if(!tabs||!demand)return false;

  const week=demand.querySelector('.wfd4-week');
  const title=week?.querySelector('.wfd4-week-title');
  const nav=week?.querySelector('.wfd4-nav');
  const controls=demand.querySelector('.wfd4-controls');
  if(!controls||!nav)return false;

  let wrap=document.getElementById('owner-workforce-layout-v2-nav-wrap');
  if(!wrap){
    wrap=document.createElement('div');
    wrap.id='owner-workforce-layout-v2-nav-wrap';
    const range=document.createElement('div');
    range.id='owner-workforce-layout-v2-range';
    wrap.appendChild(range);
    controls.appendChild(wrap);
  }

  const range=wrap.querySelector('#owner-workforce-layout-v2-range');
  if(range && title) range.textContent=title.textContent||'';

  // Always move the current freshly-rendered navigation into the right-side wrapper.
  if(nav.parentElement!==wrap)wrap.appendChild(nav);
  // Remove any duplicated navigation wrappers left by previous renders.
  controls.querySelectorAll('.wfd4-nav').forEach(n=>{if(n!==nav&&n.parentElement!==wrap)n.remove()});

  // The legacy week row is no longer needed.
  if(week)week.remove();
  return true;
}
function boot(){
  let n=0;
  const tick=()=>{apply();if(++n<100)setTimeout(tick,150)};
  tick();
  const obs=new MutationObserver(()=>requestAnimationFrame(apply));
  const start=()=>{const v=document.querySelector(VIEW);if(v)obs.observe(v,{childList:true,subtree:true})};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();

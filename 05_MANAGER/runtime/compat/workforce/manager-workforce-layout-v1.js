/* MAGASIN Owner Workforce layout V3
 * Remove the redundant page-level Workforce intro block.
 * Keep tabs directly above the demand/review/publish content.
 * Keep the week range above the week navigation inside the demand controls.
 * Remove redundant legend and prevent duplicate controls after re-render.
 */
(()=>{'use strict';
const VIEW='#view-workforce';
const CSS=`<style id="owner-workforce-layout-v3-css">
/* The global Workforce intro is redundant because the shell already identifies the page. */
#view-workforce > .owf-page-intro,
#view-workforce > .row:first-child{display:none!important}
#view-workforce .tabs{margin-top:0!important;margin-bottom:12px!important}
#view-workforce .wfd4{margin-top:0!important}
#view-workforce .wfd4-head{align-items:flex-end!important}
#view-workforce .wfd4-controls{display:flex!important;align-items:flex-end!important;gap:8px!important;flex-wrap:nowrap!important}
#view-workforce .wfd4-controls > .wfd4-store{flex:0 0 auto!important}
#owner-workforce-layout-v3-nav-wrap{display:flex;flex-direction:column;align-items:flex-end;gap:0}
#owner-workforce-layout-v3-range{font-size:12px;font-weight:800;color:var(--text);white-space:nowrap;text-align:right;line-height:1.2;margin:0 0 5px}
#view-workforce .wfd4-nav{display:flex!important;gap:6px!important;margin:0!important}
#view-workforce .wfd4-nav .btn{min-height:40px!important;padding:0 12px!important}
#view-workforce .wfd4-week{display:none!important}
#view-workforce .wfd4-legend{display:none!important}
#owner-workforce-layout-v1-bar{display:none!important}
@media(max-width:900px){
  #view-workforce .wfd4-head{align-items:stretch!important}
  #view-workforce .wfd4-controls{width:100%!important;align-items:stretch!important;flex-wrap:wrap!important}
  #view-workforce .wfd4-store{flex:1 1 220px!important}
  #owner-workforce-layout-v3-nav-wrap{margin-left:auto;align-items:flex-end}
}
@media(max-width:560px){
  #owner-workforce-layout-v3-nav-wrap{width:100%;align-items:stretch}
  #owner-workforce-layout-v3-range{text-align:left}
  #view-workforce .wfd4-nav{width:100%;display:grid!important;grid-template-columns:repeat(3,1fr)!important}
  #view-workforce .wfd4-nav .btn{width:100%!important}
}
</style>`;
function inject(){if(!document.getElementById('owner-workforce-layout-v3-css'))document.head.insertAdjacentHTML('beforeend',CSS)}
function apply(){
  const view=document.querySelector(VIEW); if(!view)return false;
  inject();

  // Remove any older injected page-level week bar.
  view.querySelectorAll('#owner-workforce-layout-v1-bar').forEach(el=>el.remove());

  // The first direct row is the redundant Workforce title/subtitle + week badge.
  const intro=[...view.children].find(el=>el.matches('.row')&&/Workforce/i.test(el.textContent||''));
  if(intro){intro.classList.add('owf-page-intro');intro.setAttribute('aria-hidden','true')}

  const tabs=view.querySelector('.tabs');
  const demand=view.querySelector('#panel-demand');
  if(!tabs||!demand)return false;

  const week=demand.querySelector('.wfd4-week');
  const title=week?.querySelector('.wfd4-week-title');
  const nav=week?.querySelector('.wfd4-nav');
  const controls=demand.querySelector('.wfd4-controls');
  if(!controls||!nav)return false;

  let wrap=document.getElementById('owner-workforce-layout-v3-nav-wrap');
  if(!wrap){
    wrap=document.createElement('div');
    wrap.id='owner-workforce-layout-v3-nav-wrap';
    const range=document.createElement('div');
    range.id='owner-workforce-layout-v3-range';
    wrap.appendChild(range);
    controls.appendChild(wrap);
  }

  const range=wrap.querySelector('#owner-workforce-layout-v3-range');
  if(range&&title)range.textContent=title.textContent||'';
  if(nav.parentElement!==wrap)wrap.appendChild(nav);
  controls.querySelectorAll('.wfd4-nav').forEach(n=>{if(n!==nav&&n.parentElement!==wrap)n.remove()});
  if(week)week.remove();
  return true;
}
function boot(){
  let n=0;
  const tick=()=>{apply();if(++n<120)setTimeout(tick,150)};
  tick();
  const obs=new MutationObserver(()=>requestAnimationFrame(apply));
  const start=()=>{const v=document.querySelector(VIEW);if(v)obs.observe(v,{childList:true,subtree:true})};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();

/* MAGASIN Owner Workforce layout V3 — single deterministic controller
 * Clean page hierarchy:
 * - Remove redundant Workforce intro row.
 * - Keep tabs directly above content.
 * - Keep exactly one week range and exactly one week navigation.
 * - Range always follows the currently rendered week.
 * - Remove legacy V1/V3 wrappers and all duplicate navigation nodes.
 */
(()=>{'use strict';
const VIEW='#view-workforce';
const ROOT_ID='owf-clean-layout';
const CSS=`<style id="owf-clean-layout-css">
#view-workforce > .owf-page-intro{display:none!important}
#view-workforce .tabs{margin-top:0!important;margin-bottom:12px!important}
#view-workforce .wfd4{margin-top:0!important}
#view-workforce .wfd4-head{align-items:flex-end!important}
#view-workforce .wfd4-controls{display:flex!important;align-items:flex-end!important;gap:10px!important;flex-wrap:nowrap!important}
#view-workforce .wfd4-controls>.wfd4-store{flex:0 0 285px!important;min-width:285px!important}
#owf-clean-layout{display:flex!important;flex-direction:column!important;align-items:flex-end!important;gap:0!important;flex:0 0 auto!important}
#owf-clean-range{font-size:13px!important;font-weight:800!important;color:var(--text)!important;white-space:nowrap!important;text-align:right!important;line-height:1.2!important;margin:0 0 6px!important}
#owf-clean-layout .wfd4-nav{display:flex!important;gap:6px!important;margin:0!important}
#owf-clean-layout .wfd4-nav .btn{min-height:40px!important;padding:0 12px!important;white-space:nowrap!important}
#view-workforce .wfd4-week{display:none!important}
#view-workforce .wfd4-legend{display:none!important}
@media(max-width:900px){
 #view-workforce .wfd4-head{align-items:stretch!important}
 #view-workforce .wfd4-controls{width:100%!important;align-items:stretch!important;flex-wrap:wrap!important}
 #view-workforce .wfd4-controls>.wfd4-store{flex:1 1 220px!important;min-width:0!important}
 #owf-clean-layout{margin-left:auto!important;align-items:flex-end!important}
}
@media(max-width:560px){
 #owf-clean-layout{width:100%!important;align-items:stretch!important}
 #owf-clean-range{text-align:left!important}
 #owf-clean-layout .wfd4-nav{width:100%!important;display:grid!important;grid-template-columns:repeat(3,1fr)!important}
 #owf-clean-layout .wfd4-nav .btn{width:100%!important}
}
</style>`;
function inject(){if(!document.getElementById('owf-clean-layout-css'))document.head.insertAdjacentHTML('beforeend',CSS)}
function textOf(el){return String(el?.textContent||'').replace(/\s+/g,' ').trim()}
function removeLegacy(view){
  view.querySelectorAll('#owner-workforce-layout-v1-bar,#owner-workforce-layout-v2-nav-wrap,#owner-workforce-layout-v3-nav-wrap,#owner-workforce-layout-v1-bar,.owf-old-layout').forEach(el=>el.remove());
  view.querySelectorAll('.owf-page-intro').forEach(el=>el.classList.remove('owf-page-intro'));
  // Remove the redundant page-level Workforce intro by semantic content, not fragile class names.
  [...view.children].forEach(el=>{
    if(el.id===ROOT_ID) return;
    const h=el.querySelector?.('h1,h2,h3');
    if(h && /^Workforce$/i.test(textOf(h))){el.remove();return;}
  });
}
function apply(){
  const view=document.querySelector(VIEW); if(!view)return false;
  inject();
  removeLegacy(view);
  const tabs=view.querySelector('.tabs');
  const demand=view.querySelector('#panel-demand');
  if(!tabs||!demand)return false;
  const controls=demand.querySelector('.wfd4-controls');
  const week=demand.querySelector('.wfd4-week');
  if(!controls||!week)return false;
  const currentNav=week.querySelector('.wfd4-nav');
  const currentRange=week.querySelector('.wfd4-week-title');
  if(!currentNav||!currentRange)return false;
  // Remove every stale/duplicate nav outside the current source before moving one canonical nav.
  const allNavs=[...demand.querySelectorAll('.wfd4-nav')];
  allNavs.forEach(n=>{if(n!==currentNav && n.parentElement!==controls.querySelector('#'+ROOT_ID))n.remove()});
  let root=controls.querySelector('#'+ROOT_ID);
  if(!root){
    root=document.createElement('div');
    root.id=ROOT_ID;
    const range=document.createElement('div');
    range.id='owf-clean-range';
    root.appendChild(range);
    controls.appendChild(root);
  }
  const range=root.querySelector('#owf-clean-range');
  if(range)range.textContent=currentRange.textContent||'';
  if(currentNav.parentElement!==root)root.appendChild(currentNav);
  // After attaching the canonical nav, remove any other nav nodes anywhere inside the demand panel.
  demand.querySelectorAll('.wfd4-nav').forEach(n=>{if(n!==currentNav)n.remove()});
  week.remove();
  return true;
}
function boot(){
  let n=0;
  const tick=()=>{apply();if(++n<120)setTimeout(tick,150)};
  tick();
  const attach=()=>{const v=document.querySelector(VIEW);if(!v)return;const obs=new MutationObserver(()=>requestAnimationFrame(apply));obs.observe(v,{childList:true,subtree:true})};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',attach,{once:true});else attach();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
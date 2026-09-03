/* MAGASIN Owner Workforce layout V2
 * Single source for Workforce page layout.
 * - Remove redundant page-level Workforce intro.
 * - Remove legacy week bar and legend.
 * - Show exactly one week range for the currently selected week.
 * - Show exactly one navigation group: Trước / Tuần này / Sau.
 * - Keep week range ABOVE navigation.
 * - Reconcile DOM after Workforce re-renders.
 */
(()=>{'use strict';
const VIEW='#view-workforce';
const CSS=`<style id="owner-workforce-layout-v2-css">
#view-workforce > .owf-page-intro,
#view-workforce > .row:first-child{display:none!important}
#view-workforce .tabs{margin-top:0!important;margin-bottom:12px!important}
#view-workforce .wfd4{margin-top:0!important}
#view-workforce .wfd4-head{align-items:flex-end!important}
#view-workforce .wfd4-controls{display:flex!important;align-items:flex-end!important;gap:8px!important;flex-wrap:nowrap!important}
#view-workforce .wfd4-controls > .wfd4-store{flex:0 0 auto!important}
#owf-layout-v2-nav{display:flex!important;flex-direction:column!important;align-items:flex-end!important;gap:0!important;margin:0!important}
#owf-layout-v2-range{font-size:12px!important;font-weight:800!important;color:var(--text)!important;white-space:nowrap!important;text-align:right!important;line-height:1.2!important;margin:0 0 5px!important}
#owf-layout-v2-nav .wfd4-nav{display:flex!important;gap:6px!important;margin:0!important}
#owf-layout-v2-nav .wfd4-nav .btn{min-height:40px!important;padding:0 12px!important}
#view-workforce .wfd4-week{display:none!important}
#view-workforce .wfd4-legend{display:none!important}
@media(max-width:900px){
 #view-workforce .wfd4-head{align-items:stretch!important}
 #view-workforce .wfd4-controls{width:100%!important;align-items:stretch!important;flex-wrap:wrap!important}
 #view-workforce .wfd4-store{flex:1 1 220px!important}
 #owf-layout-v2-nav{margin-left:auto!important;align-items:flex-end!important}
}
@media(max-width:560px){
 #owf-layout-v2-nav{width:100%!important;align-items:stretch!important}
 #owf-layout-v2-range{text-align:left!important}
 #owf-layout-v2-nav .wfd4-nav{width:100%!important;display:grid!important;grid-template-columns:repeat(3,1fr)!important}
 #owf-layout-v2-nav .wfd4-nav .btn{width:100%!important}
}
</style>`;
function inject(){if(!document.getElementById('owner-workforce-layout-v2-css'))document.head.insertAdjacentHTML('beforeend',CSS)}
function removeLegacy(){
 document.querySelectorAll('#owner-workforce-layout-v1-bar,#owner-workforce-layout-v2-nav-wrap,#owner-workforce-layout-v3-nav-wrap').forEach(el=>el.remove());
 document.querySelectorAll('[id="owf-page-intro"]').forEach(el=>el.remove());
 const view=document.querySelector(VIEW); if(view)view.querySelectorAll('.owf-page-intro').forEach(el=>el.remove());
}
function apply(){
 const view=document.querySelector(VIEW); if(!view)return false;
 inject();
 removeLegacy();
 const tabs=view.querySelector('.tabs');
 const demand=view.querySelector('#panel-demand');
 if(!tabs||!demand)return false;
 const week=demand.querySelector('.wfd4-week');
 if(!week)return false;
 const sourceRange=week.querySelector('.wfd4-week-title');
 const sourceNav=week.querySelector('.wfd4-nav');
 const controls=demand.querySelector('.wfd4-controls');
 if(!sourceRange||!sourceNav||!controls)return false;
 let wrap=controls.querySelector('#owf-layout-v2-nav');
 if(!wrap){
   wrap=document.createElement('div');
   wrap.id='owf-layout-v2-nav';
   const range=document.createElement('div');
   range.id='owf-layout-v2-range';
   wrap.appendChild(range);
   controls.appendChild(wrap);
 }
 const range=wrap.querySelector('#owf-layout-v2-range');
 if(range)range.textContent=sourceRange.textContent||'';
 // Remove any other nav copies before attaching the current one.
 controls.querySelectorAll('.wfd4-nav').forEach(n=>{
   if(n!==sourceNav && n.parentElement!==wrap)n.remove();
 });
 if(sourceNav.parentElement!==wrap)wrap.appendChild(sourceNav);
 // Remove the source week row after moving its live nav.
 if(week.parentElement)week.remove();
 return true;
}
function boot(){
 let n=0;
 const tick=()=>{apply();if(++n<80)setTimeout(tick,200)};
 tick();
 const start=()=>{
   const v=document.querySelector(VIEW); if(!v)return;
   const obs=new MutationObserver(()=>requestAnimationFrame(apply));
   obs.observe(v,{childList:true,subtree:true});
 };
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
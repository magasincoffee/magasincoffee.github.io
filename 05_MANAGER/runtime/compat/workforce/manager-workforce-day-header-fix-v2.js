/* MAGASIN Workforce day header final fix V2 */
(()=>{
  'use strict';
  if(window.MAGASIN_WFD_DAY_HEADER_FIX_V2)return;
  window.MAGASIN_WFD_DAY_HEADER_FIX_V2=true;
  const apply=()=>{
    document.querySelectorAll('.wfd4-day-main').forEach(el=>{
      const day=el.querySelector('strong');
      const date=el.querySelector('span');
      if(!day||!date)return;
      const d=(date.textContent||'').trim();
      const t=(day.textContent||'').trim();
      const label=t+' - '+d;
      if(day.dataset.wfdFinalLabel!==label){
        day.textContent=label;
        day.dataset.wfdFinalLabel=label;
      }
      day.style.fontSize='16px';
      day.style.fontWeight='800';
      day.style.color='var(--text)';
      day.style.whiteSpace='nowrap';
      date.remove();
    });
  };
  const boot=()=>{
    apply();
    const root=document.querySelector('#panel-demand')||document.body;
    new MutationObserver(apply).observe(root,{childList:true,subtree:true});
    let n=0;const tick=()=>{apply();if(++n<30)setTimeout(tick,250)};tick();
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();

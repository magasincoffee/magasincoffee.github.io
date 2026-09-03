/* MAGASIN Manager route persistence V2 — always bind to the top-level /manager/ URL */
(function(window, document){
  'use strict';
  if(window.MAGASIN_MANAGER_ROUTE_STATE_V2) return;
  window.MAGASIN_MANAGER_ROUTE_STATE_V2 = true;

  const MAP = {
    dashboard: '',
    staff: 'Nhan-su',
    workforce: 'Workforce',
    schedule: 'Lich-lam',
    tasks: 'Cong-viec',
    kpi: 'KPI',
    swap: 'Doi-ca',
    attendance: 'Cham-cong',
    academy: 'Academy',
    settings: 'Cai-dat'
  };
  const reverse = Object.fromEntries(Object.entries(MAP).filter(([,slug])=>slug).map(([view,slug])=>[slug.toLowerCase(),view]));
  let syncing = false;

  function topWindow(){
    let w=window;
    for(let i=0;i<8;i++){
      try{
        if(!w.parent || w.parent===w) return w;
        // Same-origin is required for reading/writing location/history. This app is same-origin.
        void w.parent.location.href;
        w=w.parent;
      }catch(_){
        return w;
      }
    }
    return w;
  }

  function topPath(){
    try{return String(topWindow().location.pathname||'/manager/');}
    catch(_){return '/manager/';}
  }

  function routeView(){
    const raw=topPath().replace(/^\/+|\/+$/g,'');
    const parts=raw.split('/');
    if(parts[0].toLowerCase()!=='manager' || !parts[1]) return 'dashboard';
    return reverse[String(parts[1]).toLowerCase()] || 'dashboard';
  }

  function routeFor(view){
    const slug=MAP[view]||'';
    return slug ? `/manager/${slug}/` : '/manager/';
  }

  function setRoute(view, replace){
    const w=topWindow();
    const next=routeFor(view);
    try{
      if(String(w.location.pathname||'')===next) return;
      const fn=replace ? w.history.replaceState.bind(w.history) : w.history.pushState.bind(w.history);
      fn({},'',next);
      // Notify the page shell without triggering a full navigation.
      w.dispatchEvent(new PopStateEvent('popstate'));
    }catch(_){ }
  }

  function sourceButtons(){
    return Array.from(document.querySelectorAll('.sidebar [data-view]'));
  }

  function activate(view){
    const btn=sourceButtons().find(b=>b.dataset.view===view);
    if(!btn) return false;
    if(syncing) return true;
    syncing=true;
    try{btn.click();}catch(_){ }
    setTimeout(()=>{syncing=false;},0);
    return true;
  }

  function bind(){
    const btns=sourceButtons();
    if(!btns.length) return false;

    btns.forEach(btn=>{
      if(btn.dataset.routeStateV2Bound==='1') return;
      btn.dataset.routeStateV2Bound='1';
      btn.addEventListener('click',()=>{
        if(!syncing) setRoute(btn.dataset.view,false);
      },{capture:true});
    });

    const initial=routeView();
    activate(initial);

    const tw=topWindow();
    if(!tw.__MAGASIN_ROUTE_POPSTATE_V2){
      tw.__MAGASIN_ROUTE_POPSTATE_V2=true;
      tw.addEventListener('popstate',()=>activate(routeView()));
    }
    return true;
  }

  function boot(){
    let n=0;
    const tick=()=>{
      if(bind()) return;
      if(++n<60) setTimeout(tick,150);
    };
    tick();
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})(window,document);

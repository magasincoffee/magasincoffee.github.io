/* MAGASIN Manager route persistence */
(function(window, document){
  'use strict';
  if(window.MAGASIN_MANAGER_ROUTE_STATE_V1) return;
  window.MAGASIN_MANAGER_ROUTE_STATE_V1 = true;

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
  const reverse = Object.fromEntries(Object.entries(MAP).map(([k,v])=>[v.toLowerCase(),k]));
  let suppress = false;

  function parentWindow(){
    try{return window.parent && window.parent !== window ? window.parent : window;}catch(_){return window;}
  }
  function parentPath(){
    try{return String(parentWindow().location.pathname||'');}catch(_){return '/manager/';}
  }
  function routeView(){
    const p=parentPath().replace(/^\/+/,'').replace(/\/+$/,'');
    const parts=p.split('/');
    if(parts[0].toLowerCase()!=='manager' || !parts[1]) return 'dashboard';
    return reverse[String(parts[1]).toLowerCase()] || 'dashboard';
  }
  function routeFor(view){
    const slug=MAP[view]||'';
    return slug ? `/manager/${slug}/` : '/manager/';
  }
  function setParentRoute(view, replace){
    const p=routeFor(view), w=parentWindow();
    try{
      if(String(w.location.pathname||'')!==p){
        (replace?w.history.replaceState:w.history.pushState).call(w,{},'',p);
      }
    }catch(_){ }
  }
  function sourceButtons(){return Array.from(document.querySelectorAll('.sidebar [data-view]'));}
  function activate(view){
    const btn=sourceButtons().find(b=>b.dataset.view===view);
    if(!btn) return false;
    suppress=true;
    try{btn.click();}catch(_){ }
    setTimeout(()=>{suppress=false; setParentRoute(view,false);},0);
    return true;
  }
  function bind(){
    const btns=sourceButtons();
    if(!btns.length) return false;
    btns.forEach(btn=>{
      if(btn.dataset.routeStateBound==='1') return;
      btn.dataset.routeStateBound='1';
      btn.addEventListener('click',()=>{
        if(!suppress) setParentRoute(btn.dataset.view,false);
      });
    });
    const initial=routeView();
    activate(initial);
    try{
      const w=parentWindow();
      if(!w.__MAGASIN_ROUTE_POPSTATE_V1){
        w.__MAGASIN_ROUTE_POPSTATE_V1=true;
        w.addEventListener('popstate',()=>{suppress=true;activate(routeView());setTimeout(()=>suppress=false,20);});
      }
    }catch(_){ }
    return true;
  }
  function boot(){let n=0;const tick=()=>{if(bind())return;if(++n<40)setTimeout(tick,150)};tick();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})(window,document);

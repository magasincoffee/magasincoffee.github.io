/* MAGASIN Manager route persistence */
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
  const reverse = Object.fromEntries(Object.entries(MAP).map(([k,v])=>[v.toLowerCase(),k]));
  let suppress = false;

  function rootWindow(){
    try{return window.top || window;}catch(_){return window;}
  }
  function rootPath(){
    try{return String(rootWindow().location.pathname||'');}catch(_){return '/manager/';}
  }
  function routeView(){
    const p=rootPath().replace(/^\/+/, '').replace(/\/+$/, '');
    const parts=p.split('/');
    if(parts[0].toLowerCase()!=='manager' || !parts[1]) return 'dashboard';
    return reverse[String(parts[1]).toLowerCase()] || 'dashboard';
  }
  function routeFor(view){
    const slug=MAP[view]||'';
    return slug ? `/manager/${slug}/` : '/manager/';
  }
  function setRootRoute(view, replace){
    const p=routeFor(view), w=rootWindow();
    try{
      if(String(w.location.pathname||'')!==p){
        (replace ? w.history.replaceState : w.history.pushState).call(w,{},'',p);
      }
    }catch(_){ }
  }
  function sourceButtons(){return Array.from(document.querySelectorAll('.sidebar [data-view]'));}
  function activate(view, updateUrl){
    const btn=sourceButtons().find(b=>b.dataset.view===view);
    if(!btn) return false;
    suppress=true;
    try{btn.click();}catch(_){ }
    setTimeout(()=>{suppress=false;if(updateUrl)setRootRoute(view,false);},0);
    return true;
  }
  function bind(){
    const btns=sourceButtons();
    if(!btns.length) return false;
    btns.forEach(btn=>{
      if(btn.dataset.routeStateBound==='1') return;
      btn.dataset.routeStateBound='1';
      btn.addEventListener('click',()=>{
        if(!suppress) setRootRoute(btn.dataset.view,false);
      });
    });
    activate(routeView(),false);
    try{
      const w=rootWindow();
      if(!w.__MAGASIN_ROUTE_POPSTATE_V2){
        w.__MAGASIN_ROUTE_POPSTATE_V2=true;
        w.addEventListener('popstate',()=>activate(routeView(),false));
      }
    }catch(_){ }
    return true;
  }
  function boot(){let n=0;const tick=()=>{if(bind())return;if(++n<60)setTimeout(tick,150)};tick();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})(window,document);

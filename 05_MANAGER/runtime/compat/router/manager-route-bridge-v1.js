/* MAGASIN Manager route bridge V1 — numbered compatibility to clean canonical URLs */
(function(window, document){
  'use strict';
  if(window.MAGASIN_MANAGER_ROUTE_BRIDGE_V1) return;
  window.MAGASIN_MANAGER_ROUTE_BRIDGE_V1 = true;

  const PREFIX='/05_MANAGER';
  const MAP={
    dashboard:'',staff:'Nhan-su',workforce:'Workforce',schedule:'Lich-lam',tasks:'Cong-viec',
    kpi:'KPI',swap:'Doi-ca',attendance:'Cham-cong',academy:'Academy',settings:'Cai-dat'
  };
  const REVERSE=Object.fromEntries(Object.entries(MAP).filter(([,v])=>v).map(([k,v])=>[v.toLowerCase(),k]));
  const ALLOWED=new Set([...Object.keys(MAP),'payroll-self-check']);
  let frame=null, applying=false;

  function top(){
    try{return window.top || window.parent || window;}catch(_){return window.parent||window;}
  }
  function routeView(){
    const w=top();
    const path=String(w.location.pathname||PREFIX+'/');
    const p=path.toLowerCase().replace(/\/+$/,'')||'/';
    const hash=String(w.location.hash||'').replace(/^#/,'').toLowerCase();
    if(p==='/manager/scheduling') return 'workforce';
    if(p==='/manager/schedule') return 'schedule';
    if(p==='/manager') return ALLOWED.has(hash)?hash:'dashboard';
    const parts=path.replace(/^\/+|\/+$/g,'').split('/');
    if(parts[0]?.toLowerCase()===PREFIX.slice(1).toLowerCase()){
      return REVERSE[String(parts[1]||'').toLowerCase()]||(ALLOWED.has(hash)?hash:'dashboard');
    }
    return ALLOWED.has(hash)?hash:'dashboard';
  }
  function routeFor(view){
    const key=ALLOWED.has(view)?view:'dashboard';
    if(key==='dashboard')return '/manager/';
    if(key==='workforce')return '/manager/scheduling/';
    if(key==='schedule')return '/manager/schedule/';
    return '/manager/#'+key;
  }
  function setRoute(view,replace){
    const w=top(), next=routeFor(view);
    try{
      const current=String(w.location.pathname||'')+String(w.location.hash||'');
      if(current===next) return;
      (replace?w.history.replaceState.bind(w.history):w.history.pushState.bind(w.history))({},'',next);
    }catch(_){ }
  }
  function clickView(view){
    if(!frame?.contentDocument) return;
    const b=frame.contentDocument.querySelector(`.sidebar [data-view="${CSS.escape(view)}"]`);
    if(!b) return;
    applying=true;
    try{b.click();}catch(_){ }
    setTimeout(()=>{applying=false;},0);
  }
  function syncFromLocation(replace){
    const view=routeView();
    clickView(view);
    setRoute(view,replace);
  }
  function bindFrame(){
    if(!frame) return;
    const doc=frame.contentDocument;
    if(!doc) return;
    if(doc.documentElement.dataset.routeBridgeBound==='1'){
      syncFromLocation(true);
      return;
    }
    doc.documentElement.dataset.routeBridgeBound='1';
    doc.addEventListener('click',e=>{
      const target=e.target?.closest?.('[data-view]');
      if(!target||!doc.contains(target)) return;
      const view=target.dataset.view;
      if(!view||applying) return;
      setRoute(view,false);
    },true);
    const sidebar=doc.querySelector('.sidebar');
    if(sidebar&&!doc.documentElement.dataset.routeBridgeObserverBound){
      doc.documentElement.dataset.routeBridgeObserverBound='1';
      let scheduled=false;
      const reconcile=()=>{
        scheduled=false;
        if(applying)return;
        const wanted=routeView();
        const active=sidebar.querySelector('[data-view].active')?.dataset.view||'';
        if(active&&active!==wanted)clickView(wanted);
      };
      const observer=new MutationObserver(()=>{
        if(scheduled)return;
        scheduled=true;
        setTimeout(reconcile,0);
      });
      observer.observe(sidebar,{subtree:true,attributes:true,attributeFilter:['class']});
    }
    syncFromLocation(true);
  }
  function bind(){
    frame=document.getElementById('app');
    if(!frame) return false;
    frame.addEventListener('load',bindFrame);
    if(frame.contentDocument?.readyState==='complete') bindFrame();
    const w=top();
    if(!w.__MAGASIN_MANAGER_ROUTE_BRIDGE_POPSTATE){
      w.__MAGASIN_MANAGER_ROUTE_BRIDGE_POPSTATE=true;
      w.addEventListener('popstate',()=>clickView(routeView()));
    }
    return true;
  }
  function boot(){let n=0;const tick=()=>{if(bind())return;if(++n<60)setTimeout(tick,150)};tick();}
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot,{once:true}); else boot();
})(window,document);

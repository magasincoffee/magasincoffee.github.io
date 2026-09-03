/* MAGASIN Owner route bridge V1 */
(function(window, document){
  'use strict';
  if(window.MAGASIN_OWNER_ROUTE_BRIDGE_V1) return;
  window.MAGASIN_OWNER_ROUTE_BRIDGE_V1 = true;
  const MAP={dashboard:'',staff:'Nhan-su',workforce:'Workforce',schedule:'Lich-lam',tasks:'Cong-viec',kpi:'KPI',swap:'Doi-ca',attendance:'Cham-cong',academy:'Academy',settings:'Cai-dat'};
  const REVERSE=Object.fromEntries(Object.entries(MAP).filter(([,v])=>v).map(([k,v])=>[v.toLowerCase(),k]));
  let frame=null, applying=false;
  function top(){ try{return window.top||window.parent||window;}catch(_){return window.parent||window;} }
  function routeView(){
    const p=String(top().location.pathname||'/owner/').replace(/^\/+|\/+$/g,'').split('/');
    if(p[0]?.toLowerCase()!=='owner'||!p[1]) return 'dashboard';
    return REVERSE[String(p[1]).toLowerCase()]||'dashboard';
  }
  function routeFor(view){ return MAP[view]?`/owner/${MAP[view]}/`:'/owner/'; }
  function setRoute(view,replace){
    const w=top(), next=routeFor(view);
    try{ if(w.location.pathname===next) return; (replace?w.history.replaceState.bind(w.history):w.history.pushState.bind(w.history))({},'',next); }catch(_){ }
  }
  function clickView(view){
    if(!frame?.contentDocument) return;
    const b=frame.contentDocument.querySelector(`.sidebar [data-view="${CSS.escape(view)}"]`);
    if(!b) return;
    applying=true;
    try{b.click();}catch(_){ }
    setTimeout(()=>{applying=false;},0);
  }
  function bindFrame(){
    if(!frame) return;
    const doc=frame.contentDocument;
    if(!doc) return;
    if(doc.documentElement.dataset.ownerRouteBridgeBound==='1'){ clickView(routeView()); return; }
    doc.documentElement.dataset.ownerRouteBridgeBound='1';
    doc.addEventListener('click',e=>{
      const target=e.target?.closest?.('[data-view]');
      if(!target||!doc.contains(target)) return;
      const view=target.dataset.view;
      if(!view||applying) return;
      setRoute(view,false);
    },true);
    clickView(routeView());
  }
  function bind(){
    frame=document.getElementById('app');
    if(!frame) return false;
    frame.addEventListener('load',bindFrame);
    if(frame.contentDocument?.readyState==='complete') bindFrame();
    const w=top();
    if(!w.__MAGASIN_OWNER_ROUTE_BRIDGE_POPSTATE){
      w.__MAGASIN_OWNER_ROUTE_BRIDGE_POPSTATE=true;
      w.addEventListener('popstate',()=>clickView(routeView()));
    }
    return true;
  }
  function boot(){let n=0;const tick=()=>{if(bind())return;if(++n<60)setTimeout(tick,150)};tick();}
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot,{once:true}); else boot();
})(window,document);

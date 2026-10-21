(()=>{'use strict';
const params=new URLSearchParams(window.location.search),live=params.get('mode')==='live';
if(!live)return;
// This is a user-interface rollout switch, not authorization. The Supabase RPCs
// continue to enforce authenticated Manager/Owner store scope and hard conflicts.
window.MAGASIN_SCHEDULING_V2_EDITOR_PREVIEW_ENABLED=true;
window.MAGASIN_SCHEDULING_V2_RELEASE_PREVIEW_ENABLED=true;
window.MAGASIN_SCHEDULING_V2_AUTO_PREVIEW_ENABLED=true;
window.MAGASIN_SCHEDULING_V2_POST_PUBLISH_PREVIEW_ENABLED=true;
window.MAGASIN_SCHEDULING_V2_DEMAND_PREVIEW_ENABLED=true;
const onDemand=window.location.pathname.includes('/SchedulingV2/Demand/');
const demand=onDemand?document.querySelector('.sv2-demand-back'):document.querySelector('.sv2-bar .sv2-demand-back');
if(demand){
  demand.href=onDemand?'/manager/scheduling/':'./Demand/index.html?mode=live&demand-preview';
  if(onDemand)demand.target='_top';
}
const pill=document.querySelector('.sv2-pill');if(pill)pill.textContent='05:00–22:00 · 30 phút';
const footer=document.querySelector('footer');if(footer&&!onDemand)footer.textContent='MAGASIN · Lịch chính thức chỉ thay đổi sau khi bạn xác nhận.';
})();
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
const demand=onDemand?document.querySelector('.sv2-demand-back'):document.querySelector('a[href="./Demand/index.html"]');
if(demand)demand.href=onDemand?'../index.html?mode=live&draft-editor&release-preview&auto-preview&post-publish-preview':'./Demand/index.html?mode=live&demand-preview';
const pill=document.querySelector('.sv2-pill');if(pill)pill.textContent='V2';
const footer=document.querySelector('footer');if(footer&&!onDemand){footer.textContent='Scheduling V2 · Lịch chính thức chỉ thay đổi khi bạn xác nhận thao tác.';const fallback=document.createElement('a');fallback.href='/05_MANAGER/Workforce/#workforce';fallback.textContent='Mở V1 dự phòng';fallback.style.marginLeft='12px';/* V1 UI is retired from the live Scheduling V2 navigation. */}
})();
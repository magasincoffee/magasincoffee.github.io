(()=>{'use strict';
const C=window.MAGASIN_CORE,CTX=window.MAGASIN_MANAGER_WORKFORCE_CONTEXT;
if(!C||!CTX)return;

const root=()=>document.querySelector('#view-workforce');
const panel=()=>document.querySelector('#panel-publish');
const esc=C.security.escapeHtml;
const add=C.date.addDays;
const fmt=C.date.formatDate;
let state={week:null,stores:[],cards:[],selectedStoreId:null,loading:false,error:null};

function targetWeek(){return add(C.date.monday(),7)}
function statusFor(runs,availabilityCount){
  const list=(Array.isArray(runs)?runs:[]).filter(r=>['DRAFT','REVIEWED','PUBLISHED'].includes(String(r?.status||'').toUpperCase()));
  if(list.length>1)return {key:'attention',label:'Cần kiểm tra',detail:'Có nhiều phiên xếp lịch cho cùng cửa hàng và tuần.'};
  const status=String(list[0]?.status||'').toUpperCase();
  if(status==='PUBLISHED')return {key:'published',label:'Đã phát hành',detail:'Lịch chính thức đã được phát hành.'};
  if(status==='REVIEWED')return {key:'reviewed',label:'Đã duyệt',detail:'Lịch đã duyệt và đang chờ phát hành.'};
  if(status==='DRAFT')return {key:'draft',label:'Đang xếp lịch',detail:'Có bản nháp đang được chỉnh sửa.'};
  if(availabilityCount>0)return {key:'ready',label:'Sẵn sàng xếp lịch',detail:'Đã có thời gian nhân viên có thể làm.'};
  return {key:'waiting',label:'Chưa có thời gian đăng ký',detail:'Chưa có dữ liệu thời gian có thể làm cho tuần này.'};
}
function css(){
  if(document.getElementById('owner-scheduling-overview-v1-css'))return;
  document.head.insertAdjacentHTML('beforeend',`<style id="owner-scheduling-overview-v1-css">
  .oso{display:grid;gap:14px;margin-bottom:14px}.oso-head{display:flex;justify-content:space-between;gap:16px;align-items:flex-end;padding:16px;border:1px solid #d8e4ee;border-radius:16px;background:#fff}.oso-head h2{margin:0;font-size:22px}.oso-head p{margin:5px 0 0;color:var(--muted);font-size:12px;line-height:1.5}.oso-week{font-size:12px;font-weight:800;padding:7px 10px;border:1px solid #d5e1eb;border-radius:999px;background:#f8fbfd;white-space:nowrap}.oso-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}.oso-card{appearance:none;text-align:left;width:100%;min-height:154px;padding:14px;border:1px solid #dce5ee;border-radius:15px;background:#fff;color:var(--text);cursor:pointer;display:flex;flex-direction:column;gap:9px}.oso-card:hover{border-color:#9fc5d8;box-shadow:0 8px 20px rgba(31,73,96,.08)}.oso-card:focus-visible,.oso-back:focus-visible{outline:2px solid #2f6fde;outline-offset:2px}.oso-store{font-size:15px;font-weight:850}.oso-name{font-size:11px;color:var(--muted);min-height:30px}.oso-state{align-self:flex-start;padding:5px 8px;border-radius:999px;font-size:10px;font-weight:850;background:#eef3f7;color:#496276}.oso-state[data-state="ready"]{background:#e8f5ed;color:#23754a}.oso-state[data-state="draft"]{background:#fff4da;color:#8a6116}.oso-state[data-state="reviewed"]{background:#e9f1ff;color:#285b9a}.oso-state[data-state="published"]{background:#e7f6f2;color:#16705b}.oso-state[data-state="attention"],.oso-state[data-state="error"]{background:#fbeaea;color:#9a3838}.oso-detail{font-size:11px;line-height:1.45;color:#536b80}.oso-meta{margin-top:auto;font-size:11px;font-weight:750;color:#315e76}.oso-loading,.oso-error{padding:16px;border:1px dashed #cedbe6;border-radius:14px;background:#fff;color:var(--muted)}.oso-detail-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px;padding:10px 12px;border:1px solid #dce5ee;border-radius:13px;background:#fff}.oso-detail-head strong{font-size:13px}.oso-back{min-height:44px;border:1px solid #cfdce7;border-radius:10px;background:#fff;padding:0 12px;font:inherit;font-weight:800;color:#31506a;cursor:pointer}
  @media(max-width:1050px){.oso-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
  @media(max-width:620px){.oso-head{align-items:flex-start;flex-direction:column}.oso-grid{grid-template-columns:1fr}.oso-card{min-height:132px}.oso-detail-head{align-items:flex-start;flex-direction:column}.oso-back{width:100%}}
  </style>`);
}
function ensureLayout(){
  const view=root(),p=panel();if(!view||!p)return null;
  css();
  let overview=view.querySelector('#ownerSchedulingOverview');
  if(!overview){
    overview=document.createElement('section');
    overview.id='ownerSchedulingOverview';
    overview.className='oso';
    overview.setAttribute('aria-labelledby','ownerSchedulingOverviewTitle');
    const tabs=view.querySelector('.tabs');
    (tabs||p).before(overview);
  }
  let detail=view.querySelector('#ownerSchedulingDetailHeader');
  if(!detail){
    detail=document.createElement('div');
    detail.id='ownerSchedulingDetailHeader';
    detail.className='oso-detail-head';
    detail.hidden=true;
    detail.innerHTML='<div><strong id="ownerSchedulingDetailTitle">Chi tiết xếp lịch</strong><div class="muted" id="ownerSchedulingDetailWeek"></div></div><button class="oso-back" type="button" data-owner-overview-back>← Tổng quan cửa hàng</button>';
    p.before(detail);
    detail.querySelector('[data-owner-overview-back]')?.addEventListener('click',()=>void showOverview({refresh:true}));
  }
  return {view,p,overview,detail,tabs:view.querySelector('.tabs')};
}
async function readStore(store){
  const api=CTX.client();
  const [avQ,runQ]=await Promise.all([
    api.rpc('get_manager_weekly_availability',{p_store_id:store.id,p_week_start:state.week}),
    api.rpc('list_schedule_generations',{p_store_id:store.id,p_week_start:state.week})
  ]);
  if(avQ.error)throw avQ.error;
  if(runQ.error)throw runQ.error;
  const availability=Array.isArray(avQ.data)?avQ.data:[];
  const runs=Array.isArray(runQ.data)?runQ.data:[];
  return {...store,availabilityCount:availability.length,...statusFor(runs,availability.length)};
}
function render(){
  const layout=ensureLayout();if(!layout)return;
  const {overview}=layout;
  overview.dataset.ownerOverviewState=state.loading?'loading':state.error?'error':'ready';
  if(state.loading){
    overview.innerHTML='<div class="oso-loading" role="status">Đang tải trạng thái xếp lịch các cửa hàng…</div>';
    return;
  }
  if(state.error){
    overview.innerHTML='<div class="oso-error" role="alert">Không tải được tổng quan xếp lịch. Vui lòng tải lại trang.</div>';
    return;
  }
  overview.innerHTML=`<div class="oso-head"><div><h2 id="ownerSchedulingOverviewTitle">Tổng quan xếp lịch ${state.stores.length} cửa hàng</h2><p>Xem trạng thái từng cửa hàng trước, sau đó chọn một cửa hàng để mở chi tiết lập lịch tuần.</p></div><span class="oso-week">Tuần ${esc(fmt(state.week))} – ${esc(fmt(add(state.week,6)))}</span></div><div class="oso-grid">${state.cards.map(card=>`<button type="button" class="oso-card" data-owner-store-open="${esc(card.id)}"><span class="oso-store">${esc(card.code||'Cửa hàng')}</span><span class="oso-name">${esc(card.name||'')}</span><span class="oso-state" data-state="${esc(card.key)}">${esc(card.label)}</span><span class="oso-detail">${esc(card.detail)}</span><span class="oso-meta">${card.availabilityCount} khoảng thời gian có thể làm · Mở lịch tuần →</span></button>`).join('')}</div>`;
  overview.querySelectorAll('[data-owner-store-open]').forEach(b=>b.addEventListener('click',()=>void openStore(b.dataset.ownerStoreOpen)));
}
async function refresh(){
  if(state.loading)return;
  state.loading=true;state.error=null;state.week=targetWeek();render();
  try{
    state.stores=(await CTX.stores({force:true})).slice().sort((a,b)=>String(a.code||'').localeCompare(String(b.code||''),'vi',{numeric:true}));
    const cards=[];
    for(const store of state.stores){
      try{cards.push(await readStore(store))}
      catch(_){cards.push({...store,availabilityCount:0,key:'error',label:'Không tải được trạng thái',detail:'Không thể đọc trạng thái xếp lịch của cửa hàng này.'})}
    }
    state.cards=cards;
  }catch(e){state.error=e;state.cards=[]}
  finally{state.loading=false;render()}
}
async function openStore(storeId){
  const layout=ensureLayout();if(!layout)return;
  const store=state.stores.find(s=>String(s.id)===String(storeId));if(!store)return;
  state.selectedStoreId=store.id;
  layout.overview.hidden=true;
  if(layout.tabs)layout.tabs.hidden=false;
  layout.detail.hidden=false;
  layout.p.hidden=false;
  layout.p.classList.add('active');
  layout.detail.querySelector('#ownerSchedulingDetailTitle').textContent=`Lập lịch tuần · ${store.code} · ${store.name}`;
  layout.detail.querySelector('#ownerSchedulingDetailWeek').textContent=`Tuần ${fmt(state.week)} – ${fmt(add(state.week,6))}`;
  await window.MAGASIN_MANAGER_SCHEDULE_DRAFT?.openDirect?.({storeId:store.id,week:state.week});
}
async function showOverview({refresh:shouldRefresh=false}={}){
  const layout=ensureLayout();if(!layout)return;
  state.selectedStoreId=null;
  layout.overview.hidden=false;
  layout.detail.hidden=true;
  layout.p.hidden=true;
  layout.p.classList.remove('active');
  if(layout.tabs)layout.tabs.hidden=true;
  if(shouldRefresh)await refresh();
}
async function boot(){
  let tries=0;
  while((!root()||!panel()||!window.MAGASIN_MANAGER_SCHEDULE_DRAFT)&&tries++<100)await new Promise(r=>setTimeout(r,80));
  if(!root()||!panel()||!window.MAGASIN_MANAGER_SCHEDULE_DRAFT)return;
  const layout=ensureLayout();if(!layout)return;
  layout.p.hidden=true;
  if(layout.tabs)layout.tabs.hidden=true;
  await refresh();
}
document.addEventListener('magasin:schedule-published',()=>{if(!state.selectedStoreId)void refresh()});
window.MAGASIN_OWNER_SCHEDULING_OVERVIEW={refresh,openStore,showOverview,getState:()=>({...state,stores:state.stores.map(x=>({...x})),cards:state.cards.map(x=>({...x}))})};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else void boot();
})();
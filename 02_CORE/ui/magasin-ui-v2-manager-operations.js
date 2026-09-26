/* MAGASIN UI V2 — Manager operations shell + Today Action Center · UI2-011 */
(()=>{
  'use strict';
  if(window.MAGASIN_MANAGER_UI2_011)return;

  const ROUTES=Object.freeze([
    ['dashboard','⌂','Hôm nay'],
    ['staff','◎','Nhân viên'],
    ['workforce','▦','Xếp lịch'],
    ['schedule','▤','Lịch làm'],
    ['swap','⇄','Đổi / Cho ca'],
    ['attendance','◷','Chấm công'],
    ['payroll-self-check','₫','Công / Lương']
  ]);
  const META=Object.freeze({
    dashboard:['Hôm nay','Action Center · ngoại lệ canonical cần xử lý'],
    staff:['Nhân viên','Projection vận hành theo phạm vi cửa hàng'],
    workforce:['Xếp lịch','Availability → Draft → Validate → Review → Publish'],
    schedule:['Lịch làm','Lịch chính thức đã phát hành'],
    swap:['Đổi / Cho ca','Review yêu cầu đã qua Employee acceptance'],
    attendance:['Chấm công','Review giờ công theo lịch chính thức'],
    'payroll-self-check':['Công / Lương','Đối soát read-only theo phạm vi cửa hàng']
  });
  const PENDING_ATTENDANCE=new Set(['NORMAL','NEEDS_REVIEW']);
  let actionState={phase:'idle',sources:{},actions:[],lastRefresh:null};

  const esc=v=>String(v??'').replace(/[&<>"']/g,ch=>({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[ch]));

  function sourceButton(view){
    return document.querySelector('.sidebar [data-view="'+CSS.escape(view)+'"]');
  }
  function activeView(){
    return document.querySelector('.sidebar [data-view].active')?.dataset.view||
      document.querySelector('.view.active[id^="view-"]')?.id?.replace(/^view-/,'')||
      'dashboard';
  }
  function activate(view){
    if(!ROUTES.some(([key])=>key===view))return false;
    const b=sourceButton(view);if(!b)return false;
    b.click();return true;
  }
  function syncMeta(view=activeView()){
    const meta=META[view]||['MAGASIN Manager','Vận hành cửa hàng'];
    const title=document.querySelector('[data-shell-page-title]');
    const sub=document.querySelector('[data-shell-page-subtitle]');
    if(title)title.textContent=meta[0];
    if(sub)sub.textContent=meta[1];
  }
  function syncNav(){
    const shell=document.getElementById('magasinUiV2Shell');
    if(!shell)return false;
    document.body.dataset.managerUi2='011';
    const nav=shell.querySelector('.m-shell-v2-nav');
    const groups=[...nav.querySelectorAll('.m-shell-v2-nav__group')];
    if(!nav||!groups.length)return false;
    const primary=groups[0].querySelector('.m-shell-v2-nav__items');
    if(!primary)return false;
    const itemByKey=new Map([...nav.querySelectorAll('.m-shell-v2-nav__item[data-shell-key]')].map(x=>[x.dataset.shellKey,x]));
    ROUTES.forEach(([key,icon,label])=>{
      const item=itemByKey.get(key);if(!item)return;
      item.hidden=false;item.removeAttribute('aria-hidden');item.tabIndex=0;
      const spans=item.querySelectorAll('span');
      if(spans[0])spans[0].textContent=icon;
      if(spans[1])spans[1].textContent=label;
      primary.appendChild(item);
    });
    [...itemByKey.entries()].forEach(([key,item])=>{
      if(!ROUTES.some(([allowed])=>allowed===key)){
        item.hidden=true;item.setAttribute('aria-hidden','true');item.tabIndex=-1;
      }
    });
    const label=groups[0].querySelector('.m-shell-v2-nav__label');if(label)label.textContent='Vận hành';
    groups.slice(1).forEach(group=>group.hidden=true);
    syncMeta();
    return true;
  }

  function apiSnapshot(){
    const shift=window.MAGASIN_MANAGER_SHIFT_CHANGE;
    const attendance=window.MAGASIN_MANAGER_ATTENDANCE_REVIEW;
    const scheduling=window.MAGASIN_MANAGER_SCHEDULE_DRAFT;
    const availability=window.MAGASIN_MANAGER_AVAILABILITY;
    const read=(api)=>api&&typeof api.getState==='function'?api.getState():null;
    return {
      shift:{connected:!!shift&&typeof shift.refresh==='function',api,state:read(shift)},
      attendance:{connected:!!attendance&&typeof attendance.refresh==='function',api:attendance,state:read(attendance)},
      scheduling:{connected:!!scheduling&&typeof scheduling.refresh==='function',api:scheduling,state:read(scheduling)},
      availability:{connected:!!availability&&typeof availability.refresh==='function',api:availability,state:read(availability)}
    };
  }

  function buildActions(sources){
    const actions=[];
    const shift=sources.shift?.state;
    if(shift&&!shift.error){
      const swaps=Array.isArray(shift.swaps)?shift.swaps.length:0;
      const gives=Array.isArray(shift.gives)?shift.gives.length:0;
      const pending=swaps+gives;
      if(pending>0)actions.push({
        route:'swap',priority:'high',title:pending+' yêu cầu đổi / cho ca chờ quản lý',
        detail:swaps+' đổi ca · '+gives+' cho ca · nguồn canonical hiện tại'
      });
    }
    const attendance=sources.attendance?.state;
    if(attendance&&!attendance.error){
      const pending=(Array.isArray(attendance.rows)?attendance.rows:[])
        .filter(r=>PENDING_ATTENDANCE.has(String(r.status||'').toUpperCase())).length;
      if(pending>0)actions.push({
        route:'attendance',priority:'high',title:pending+' attendance cần review',
        detail:'Chỉ các trạng thái NORMAL / NEEDS_REVIEW từ reader Manager canonical'
      });
    }
    const scheduling=sources.scheduling?.state;
    if(scheduling){
      const status=String(scheduling.generationStatus||'NONE').toUpperCase();
      if(status==='DRAFT')actions.push({
        route:'workforce',priority:'medium',title:'Lịch tuần mục tiêu đang ở DRAFT',
        detail:'Cần tiếp tục validate / review bằng workflow hiện hữu trước khi publish'
      });
      if(status==='REVIEWED')actions.push({
        route:'workforce',priority:'high',title:'Lịch tuần mục tiêu đã REVIEWED',
        detail:'Mở Xếp lịch để kiểm tra và publish bằng canonical handler hiện hữu'
      });
      if(status==='NONE')actions.push({
        route:'workforce',priority:'medium',title:'Chưa có schedule generation canonical cho tuần mục tiêu',
        detail:'Action Center không suy diễn ca thiếu; mở Xếp lịch để xem nguồn availability và trạng thái thật'
      });
    }
    return actions;
  }

  function sourceError(source){
    const error=source?.state?.error;
    return error?String(error):'';
  }
  function monitorCopy(name,source){
    if(!source?.connected)return 'NOT_CONNECTED';
    if(sourceError(source))return 'ERROR · '+sourceError(source);
    const s=source.state||{};
    if(name==='shift'){
      if(s.loading)return 'LOADING';
      return ((s.swaps?.length||0)+(s.gives?.length||0))+' pending';
    }
    if(name==='attendance'){
      if(s.loading)return 'LOADING';
      return (s.rows||[]).filter(r=>PENDING_ATTENDANCE.has(String(r.status||'').toUpperCase())).length+' cần review';
    }
    if(name==='scheduling')return String(s.generationStatus||'UNKNOWN');
    if(name==='availability')return Array.isArray(s.rows)?s.rows.length+' availability rows':'UNKNOWN';
    return 'UNKNOWN';
  }

  function stateLabel(sources,actions,phase){
    if(phase==='loading')return {label:'Đang tải',tone:'neutral'};
    const disconnected=Object.values(sources).filter(x=>!x.connected).length;
    const errors=Object.values(sources).filter(x=>sourceError(x)).length;
    if(errors)return {label:'Có nguồn lỗi',tone:'danger'};
    if(disconnected)return {label:'NOT_CONNECTED',tone:'warning'};
    if(actions.length)return {label:actions.length+' ưu tiên',tone:'warning'};
    return {label:'Không có ngoại lệ',tone:'neutral'};
  }

  function todayRoot(){
    return document.getElementById('managerActionCenterRoot');
  }
  function renderToday(){
    const root=todayRoot();if(!root)return;
    const sources=actionState.sources||{};
    const actions=actionState.actions||[];
    const badge=stateLabel(sources,actions,actionState.phase);
    const errors=Object.entries(sources).filter(([,s])=>sourceError(s));
    const disconnected=Object.entries(sources).filter(([,s])=>!s.connected);
    const list=actionState.phase==='loading'
      ? '<div class="manager-action-center__loading" role="status">Đang làm mới các reader canonical hiện hữu…</div>'
      : [
          ...errors.map(([name,s])=>'<div class="manager-action-center__error" role="alert"><strong>'+esc(name)+'</strong> · '+esc(sourceError(s))+'</div>'),
          ...actions.map(a=>'<article class="manager-action" data-priority="'+esc(a.priority)+'"><div class="manager-action__copy"><strong>'+esc(a.title)+'</strong><span>'+esc(a.detail)+'</span></div><button type="button" class="m-button m-button--secondary" data-manager-action-route="'+esc(a.route)+'">Mở '+esc(META[a.route]?.[0]||a.route)+'</button></article>'),
          !errors.length&&!actions.length&&!disconnected.length?'<div class="manager-action-center__empty"><strong>Không có ngoại lệ canonical cần xử lý trong các nguồn đã kết nối.</strong><br>Action Center không tạo KPI, deadline hoặc pending count ngoài dữ liệu reader hiện hữu.</div>':'',
          disconnected.length?'<div class="manager-action-center__not-connected"><strong>NOT_CONNECTED:</strong> '+esc(disconnected.map(([name])=>name).join(', '))+'. Không suy diễn trạng thái hoặc số lượng khi reader chưa sẵn sàng.</div>':''
        ].join('');
    root.innerHTML=
      '<div class="manager-action-center__head"><div><h3>Ưu tiên cần xử lý</h3><p>Read-only summary; mọi thao tác được delegate sang module canonical.</p></div><span class="manager-action-center__state" data-tone="'+esc(badge.tone)+'">'+esc(badge.label)+'</span></div>'+
      '<div class="manager-action-center__list">'+list+'</div>'+
      '<div class="manager-source-monitor" style="margin-top:14px">'+
        ['shift','attendance','scheduling','availability'].map(name=>'<div class="manager-source-monitor__item"><span>'+esc(name)+'</span><strong>'+esc(monitorCopy(name,sources[name]))+'</strong></div>').join('')+
      '</div>';
  }

  function mountToday(){
    const view=document.getElementById('view-dashboard');if(!view)return false;
    if(view.dataset.managerTodayUi2==='011')return true;
    view.dataset.managerTodayUi2='011';
    view.dataset.workforceTodayCanonical='1';
    view.innerHTML=
      '<div class="manager-today-v2">'+
        '<section class="manager-today-v2__hero"><div><div class="manager-today-v2__eyebrow">Manager · Operations</div><h2>Action Center</h2><p>Chỉ hiển thị ngoại lệ từ các reader Manager canonical đã có. Không dùng KPI demo, doanh thu giả lập, task/SOP chưa kết nối hoặc số pending suy diễn.</p></div><button type="button" class="m-button m-button--secondary manager-today-v2__refresh" data-manager-action-refresh>Làm mới</button></section>'+
        '<section class="manager-action-center" id="managerActionCenterRoot" data-manager-action-center-state="idle" aria-live="polite"></section>'+
      '</div>';
    view.addEventListener('click',event=>{
      const route=event.target.closest?.('[data-manager-action-route]')?.dataset.managerActionRoute;
      if(route){event.preventDefault();activate(route);return}
      if(event.target.closest?.('[data-manager-action-refresh]')){event.preventDefault();void refreshActionCenter()}
    });
    renderToday();
    return true;
  }

  async function waitForSources(max=30){
    for(let i=0;i<max;i++){
      const s=apiSnapshot();
      if(Object.values(s).every(x=>x.connected))return s;
      await new Promise(r=>setTimeout(r,100));
    }
    return apiSnapshot();
  }

  async function refreshActionCenter(){
    mountToday();
    actionState={phase:'loading',sources:apiSnapshot(),actions:[],lastRefresh:actionState.lastRefresh};
    const root=todayRoot();if(root)root.dataset.managerActionCenterState='loading';
    renderToday();
    const sources=await waitForSources();
    const refreshes=Object.values(sources)
      .filter(x=>x.connected&&typeof x.api.refresh==='function')
      .map(x=>Promise.resolve().then(()=>x.api.refresh()));
    await Promise.allSettled(refreshes);
    const fresh=apiSnapshot();
    actionState={phase:'ready',sources:fresh,actions:buildActions(fresh),lastRefresh:new Date().toISOString()};
    const finalRoot=todayRoot();if(finalRoot){
      const hasError=Object.values(fresh).some(x=>sourceError(x));
      const hasMissing=Object.values(fresh).some(x=>!x.connected);
      finalRoot.dataset.managerActionCenterState=hasError?'error':hasMissing?'not-connected':actionState.actions.length?'ready':'empty';
    }
    renderToday();
    return actionState;
  }

  function bind(){
    document.addEventListener('click',event=>{
      const nav=event.target.closest?.('.sidebar [data-view]');
      if(nav){
        const view=nav.dataset.view;
        setTimeout(()=>{syncNav();syncMeta(view);if(view==='dashboard')void refreshActionCenter()},0);
      }
    },true);
    for(const event of ['magasin:shift-swap-resolved','magasin:shift-give-resolved','magasin:schedule-published']){
      document.addEventListener(event,()=>{if(activeView()==='dashboard')void refreshActionCenter()});
    }
    window.addEventListener('hashchange',()=>setTimeout(()=>{syncNav();syncMeta();if(activeView()==='dashboard')void refreshActionCenter()},0));
  }

  function boot(){
    if(String(document.body?.dataset?.magasinShellRole||'').toLowerCase()!=='manager')return;
    mountToday();bind();
    let tries=0;
    const tick=()=>{
      syncNav();syncMeta();
      if(++tries<40&&!document.getElementById('magasinUiV2Shell'))setTimeout(tick,100);
    };
    tick();
    setTimeout(()=>{if(activeView()==='dashboard')void refreshActionCenter()},250);
  }

  window.MAGASIN_MANAGER_UI2_011={
    version:'2.11',
    routes:ROUTES.map(x=>x[0]),
    mountToday,
    refreshActionCenter,
    syncNav,
    activate,
    getState:()=>JSON.parse(JSON.stringify({phase:actionState.phase,actions:actionState.actions,lastRefresh:actionState.lastRefresh,sources:Object.fromEntries(Object.entries(actionState.sources||{}).map(([k,v])=>[k,{connected:v.connected,state:v.state||null}]))}))
  };

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();

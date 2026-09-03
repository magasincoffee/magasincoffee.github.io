/* MAGASIN UI Shell V3 — clean professional navigation */
(function(window, document){
  'use strict';
  if(window.MAGASIN_UI_SHELL_V3) return;
  window.MAGASIN_UI_SHELL_V3 = true;

  const css = `
  .manager-v3-source-sidebar{display:none!important}
  .manager-v3-header{height:68px!important;background:#fff!important;border-bottom:1px solid #dfe6ef!important;display:flex!important;align-items:center!important;justify-content:space-between!important;padding:0 22px!important;position:sticky!important;top:0!important;z-index:900!important}
  .manager-v3-header-left{display:flex!important;align-items:center!important;gap:14px!important;min-width:0!important}
  .manager-v3-menu{width:42px!important;height:42px!important;border:1px solid #dce5f0!important;border-radius:11px!important;background:#f5f8fb!important;color:#102a43!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;font-size:21px!important;font-weight:900!important;cursor:pointer!important;flex:none!important}
  .manager-v3-menu:hover{background:#edf4fa!important}
  .manager-v3-page-pill{display:inline-flex!important;align-items:center!important;height:42px!important;padding:0 16px!important;border-radius:11px!important;background:#e9f1ff!important;color:#235dba!important;font-size:20px!important;font-weight:800!important;white-space:nowrap!important;max-width:48vw!important;overflow:hidden!important;text-overflow:ellipsis!important}
  .manager-v3-header-right{display:flex!important;align-items:center!important;gap:8px!important}
  .manager-v3-bell{width:40px!important;height:40px!important;border:0!important;border-radius:10px!important;background:transparent!important;color:#6e7d92!important;font-size:18px!important;cursor:pointer!important}
  .manager-v3-bell:hover{background:#f2f6fa!important}
  .manager-v3-avatar{width:40px!important;height:40px!important;border-radius:50%!important;background:#e9f1ff!important;color:#235dba!important;display:flex!important;align-items:center!important;justify-content:center!important;font-weight:900!important}
  .manager-v3-backdrop{position:fixed!important;inset:68px 0 0 0!important;background:rgba(16,42,67,.34)!important;z-index:1000!important;opacity:0!important;visibility:hidden!important;transition:opacity .18s ease,visibility .18s ease!important}
  .manager-v3-backdrop.open{opacity:1!important;visibility:visible!important}
  .manager-v3-drawer{position:fixed!important;left:0!important;top:68px!important;bottom:0!important;width:292px!important;background:#102a43!important;color:#fff!important;z-index:1001!important;transform:translateX(-102%)!important;transition:transform .22s ease!important;box-shadow:14px 0 34px rgba(0,0,0,.18)!important;display:flex!important;flex-direction:column!important;overflow:hidden!important}
  .manager-v3-drawer.open{transform:translateX(0)!important}
  .manager-v3-brand{padding:22px 20px 18px!important;border-bottom:1px solid rgba(255,255,255,.08)!important}
  .manager-v3-brand-name{font-size:22px!important;line-height:1.1!important;font-weight:900!important;letter-spacing:-.2px!important}
  .manager-v3-brand-role{margin-top:5px!important;font-size:12px!important;color:#abc0d6!important}
  .manager-v3-nav{flex:1!important;overflow:auto!important;padding:14px 12px 10px!important}
  .manager-v3-group-label{padding:11px 10px 6px!important;color:#8ea8c1!important;font-size:10px!important;line-height:1!important;font-weight:800!important;letter-spacing:.7px!important;text-transform:uppercase!important}
  .manager-v3-group{display:grid!important;gap:4px!important;margin-bottom:5px!important}
  .manager-v3-nav-btn{width:100%!important;border:0!important;background:transparent!important;color:#dbe7f3!important;text-align:left!important;padding:11px 12px!important;border-radius:10px!important;font-weight:700!important;font-size:14px!important;display:flex!important;align-items:center!important;gap:11px!important;cursor:pointer!important;transition:background .15s ease,color .15s ease!important}
  .manager-v3-nav-btn:hover{background:rgba(255,255,255,.07)!important;color:#fff!important}
  .manager-v3-nav-btn.active{background:#1d4167!important;color:#67e1e5!important;box-shadow:inset 3px 0 0 #19b7c5!important}
  .manager-v3-nav-icon{width:20px!important;text-align:center!important;font-size:17px!important;line-height:1!important;flex:none!important}
  .manager-v3-footer{padding:12px!important;border-top:1px solid rgba(255,255,255,.08)!important;background:#0e253c!important}
  .manager-v3-account{padding:9px 10px 8px!important}
  .manager-v3-account-name{font-size:13px!important;font-weight:800!important;color:#fff!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important}
  .manager-v3-account-meta{margin-top:3px!important;font-size:11px!important;color:#9fb5cb!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important}
  .manager-v3-logout{width:100%!important;height:40px!important;border:1px solid rgba(255,255,255,.1)!important;border-radius:9px!important;background:#163451!important;color:#e7eff7!important;font-size:13px!important;font-weight:800!important;cursor:pointer!important}
  .manager-v3-logout:hover{background:#1b3d60!important}
  .main{margin:0!important;width:100%!important;max-width:none!important;padding:0!important}
  .content{padding:24px!important;max-width:1560px!important;margin:0 auto!important}
  @media(max-width:760px){
    .manager-v3-header{height:62px!important;padding:0 12px!important}
    .manager-v3-page-pill{height:42px!important;font-size:17px!important;padding:0 14px!important;max-width:55vw!important}
    .manager-v3-drawer{top:62px!important;width:min(86vw,320px)!important}
    .manager-v3-backdrop{inset:62px 0 0 0!important}
    .content{padding:14px!important}
  }`;

  const groups = [
    {label:'Điều hành', items:[['dashboard','🏠','Tổng quan'],['kpi','📊','KPI']]},
    {label:'Nhân sự', items:[['staff','👥','Nhân sự'],['workforce','📅','Workforce'],['schedule','🗓','Lịch làm'],['swap','🔄','Đổi ca']]},
    {label:'Vận hành', items:[['tasks','✅','Công việc'],['attendance','⏱','Chấm công']]},
    {label:'Hệ thống', items:[['academy','🎓','Academy'],['settings','⚙️','Cài đặt']]}
  ];

  function injectStyle(){
    if(document.getElementById('manager-v3-shell-css')) return;
    const s=document.createElement('style');s.id='manager-v3-shell-css';s.textContent=css;(document.head||document.documentElement).appendChild(s);
  }
  function closeDrawer(){
    document.getElementById('managerV3Drawer')?.classList.remove('open');
    document.getElementById('managerV3Backdrop')?.classList.remove('open');
  }
  function sourceButton(view){return document.querySelector('.sidebar [data-view="'+CSS.escape(view)+'"]')}
  function syncActive(view){document.querySelectorAll('#managerV3Drawer [data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===view));}
  function build(){
    injectStyle();
    const header=document.querySelector('.header'), source=document.querySelector('.sidebar');
    if(!header||!source) return false;
    source.classList.add('manager-v3-source-sidebar');
    header.classList.add('manager-v3-header');
    const left=header.querySelector('.header-left')||header.firstElementChild;
    const right=header.querySelector('.header-right')||header.lastElementChild;
    if(!left||!right) return false;
    left.classList.add('manager-v3-header-left');right.classList.add('manager-v3-header-right');
    const legacyMenu=header.querySelector('#menuBtn'); if(legacyMenu) legacyMenu.style.display='none';
    Array.from(right.childNodes).forEach(n=>{if(n.nodeType===Node.TEXT_NODE&&/🔔/.test(n.nodeValue||''))n.nodeValue=''});
    let menu=header.querySelector('.manager-v3-menu');
    if(!menu){menu=document.createElement('button');menu.className='manager-v3-menu';menu.type='button';menu.setAttribute('aria-label','Mở menu');menu.textContent='☰';left.prepend(menu)}
    const title=header.querySelector('#pageTitle');if(title)title.classList.add('manager-v3-page-pill');
    let bell=header.querySelector('.manager-v3-bell');
    if(!bell){bell=document.createElement('button');bell.className='manager-v3-bell';bell.type='button';bell.title='Thông báo';bell.setAttribute('aria-label','Thông báo');bell.textContent='🔔';right.prepend(bell)}
    const avatar=header.querySelector('#headerAvatar,.avatar,.badge');if(avatar){avatar.classList.add('manager-v3-avatar');avatar.classList.remove('avatar','badge','blue')}
    if(!document.getElementById('managerV3Backdrop')){
      const back=document.createElement('div');back.id='managerV3Backdrop';back.className='manager-v3-backdrop';document.body.appendChild(back);back.addEventListener('click',closeDrawer);
    }
    if(!document.getElementById('managerV3Drawer')){
      const drawer=document.createElement('aside');drawer.id='managerV3Drawer';drawer.className='manager-v3-drawer';
      const brand=document.createElement('div');brand.className='manager-v3-brand';
      const ownerMode=/\/owner(?:\/|$)/i.test((window.top||window).location.pathname||'');
      brand.innerHTML='<div class="manager-v3-brand-name">MAGASIN</div><div class="manager-v3-brand-role">'+(ownerMode?'OWNER · Chủ hệ thống':'Quản lý cửa hàng')+'</div>';
      drawer.appendChild(brand);
      const nav=document.createElement('div');nav.className='manager-v3-nav';
      groups.forEach(g=>{
        const gl=document.createElement('div');gl.className='manager-v3-group-label';gl.textContent=g.label;nav.appendChild(gl);
        const wrap=document.createElement('div');wrap.className='manager-v3-group';
        g.items.forEach(([view,icon,label])=>{
          const b=document.createElement('button');b.type='button';b.className='manager-v3-nav-btn';b.dataset.view=view;
          b.innerHTML='<span class="manager-v3-nav-icon">'+icon+'</span><span>'+label+'</span>';
          b.addEventListener('click',()=>{const original=sourceButton(view);if(original)original.click();syncActive(view);closeDrawer()});
          wrap.appendChild(b);
        });nav.appendChild(wrap);
      });
      drawer.appendChild(nav);
      const foot=document.createElement('div');foot.className='manager-v3-footer';
      const name=source.querySelector('#profileName')?.textContent||'Chủ hệ thống';
      const meta=source.querySelector('#profileMeta')?.textContent||(ownerMode?'OWNER':'Tài khoản quản lý');
      foot.innerHTML='<div class="manager-v3-account"><div class="manager-v3-account-name">'+String(name).replace(/</g,'&lt;')+'</div><div class="manager-v3-account-meta">'+String(meta).replace(/</g,'&lt;')+'</div></div><button type="button" class="manager-v3-logout">Đăng xuất</button>';
      drawer.appendChild(foot);document.body.appendChild(drawer);
      foot.querySelector('.manager-v3-logout')?.addEventListener('click',()=>source.querySelector('#logoutBtn')?.click());
    }
    if(menu.dataset.managerV3Bound!=='1'){menu.dataset.managerV3Bound='1';menu.addEventListener('click',()=>{document.getElementById('managerV3Drawer')?.classList.add('open');document.getElementById('managerV3Backdrop')?.classList.add('open')})}
    source.querySelectorAll('[data-view]').forEach(b=>{if(b.dataset.managerV3Bound)return;b.dataset.managerV3Bound='1';b.addEventListener('click',()=>syncActive(b.dataset.view))});
    syncActive(source.querySelector('.nav button.active')?.dataset.view||'dashboard');
    return true;
  }
  function boot(){let n=0;const tick=()=>{if(build())return;if(++n<40)setTimeout(tick,200)};tick()}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})(window,document);

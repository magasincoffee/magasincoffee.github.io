/* MAGASIN Manager UI Shell V2 — shared visual shell with Employee V40 */
(function(window, document){
  'use strict';
  if(window.MAGASIN_MANAGER_UI_V2) return;
  window.MAGASIN_MANAGER_UI_V2 = true;

  const css = `
    .manager-v2-sidebar-source{display:none!important}
    .manager-v2-header{height:68px!important;background:#fff!important;border-bottom:1px solid #dfe6ef!important;display:flex!important;align-items:center!important;justify-content:space-between!important;padding:0 22px!important;position:sticky!important;top:0!important;z-index:900!important}
    .manager-v2-header-left{display:flex!important;align-items:center!important;gap:14px!important;min-width:0!important}
    .manager-v2-menu{width:42px!important;height:42px!important;border:0!important;border-radius:10px!important;background:#eef3f8!important;color:#10213b!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;font-size:21px!important;font-weight:900!important;cursor:pointer!important;flex:none!important}
    .manager-v2-menu:hover{background:#e5edf6!important}
    .manager-v2-page-pill{display:inline-flex!important;align-items:center!important;height:42px!important;padding:0 16px!important;border-radius:10px!important;background:#e7f0ff!important;color:#235dba!important;font-size:20px!important;font-weight:800!important;white-space:nowrap!important;max-width:48vw!important;overflow:hidden!important;text-overflow:ellipsis!important}
    .manager-v2-page-sub{display:none!important}
    .manager-v2-header-right{display:flex!important;align-items:center!important;gap:10px!important}
    .manager-v2-bell{width:38px!important;height:38px!important;border:0!important;border-radius:10px!important;background:transparent!important;color:#6e7d92!important;font-size:18px!important;cursor:pointer!important}
    .manager-v2-bell:hover{background:#eef3f8!important}
    .manager-v2-avatar{width:38px!important;height:38px!important;border-radius:50%!important;background:#18b7c5!important;color:#fff!important;display:flex!important;align-items:center!important;justify-content:center!important;font-weight:900!important}
    .manager-v2-drawer-backdrop{position:fixed!important;inset:68px 0 0 0!important;background:rgba(16,33,59,.30)!important;z-index:1000!important;opacity:0!important;visibility:hidden!important;transition:.2s!important}
    .manager-v2-drawer-backdrop.open{opacity:1!important;visibility:visible!important}
    .manager-v2-drawer{position:fixed!important;left:0!important;top:68px!important;bottom:0!important;width:270px!important;background:#10213b!important;color:#fff!important;z-index:1001!important;transform:translateX(-100%)!important;transition:transform .22s ease!important;box-shadow:10px 0 28px rgba(0,0,0,.16)!important;padding:20px 14px!important;overflow:auto!important}
    .manager-v2-drawer.open{transform:translateX(0)!important}
    .manager-v2-drawer .brand{font-size:22px!important;font-weight:900!important;padding:0 8px!important}
    .manager-v2-drawer .brand-sub{font-size:12px!important;color:#aec0d7!important;padding:3px 8px 22px!important}
    .manager-v2-drawer .nav{display:grid!important;gap:5px!important}
    .manager-v2-drawer .nav button{width:100%!important;border:0!important;background:transparent!important;color:#dce7f5!important;text-align:left!important;padding:12px 13px!important;border-radius:10px!important;font-weight:750!important;cursor:pointer!important}
    .manager-v2-drawer .nav button.active,.manager-v2-drawer .nav button:hover{background:#1b3558!important;color:#5fe0e5!important}
    .manager-v2-drawer-footer{margin-top:22px!important;padding-top:14px!important;border-top:1px solid #263c59!important}
    .manager-v2-drawer-user{font-size:12px!important;color:#fff!important}
    .manager-v2-drawer-user strong{display:block!important;font-size:13px!important}
    .manager-v2-drawer-user span{display:block!important;color:#adc0d6!important;margin-top:3px!important}
    .manager-v2-logout{width:100%!important;border:0!important;background:#172d4b!important;color:#dce7f5!important;border-radius:10px!important;padding:10px!important;font-weight:800!important;cursor:pointer!important;margin-top:12px!important}
    .main{margin:0!important;width:100%!important;max-width:none!important;padding:0!important}
    .content{padding:24px!important;max-width:1560px!important;margin:0 auto!important}
    @media(max-width:760px){
      .manager-v2-header{height:62px!important;padding:0 12px!important}
      .manager-v2-page-pill{height:42px!important;font-size:17px!important;padding:0 14px!important;max-width:55vw!important}
      .manager-v2-drawer{top:62px!important;width:84vw!important;max-width:300px!important}
      .manager-v2-drawer-backdrop{inset:62px 0 0 0!important}
      .content{padding:14px!important}
    }
  `;

  function injectStyle(){
    if(document.getElementById('manager-v2-shell-css')) return;
    const s=document.createElement('style');
    s.id='manager-v2-shell-css';
    s.textContent=css;
    (document.head||document.documentElement).appendChild(s);
  }

  function closeDrawer(){
    document.getElementById('managerV2Drawer')?.classList.remove('open');
    document.getElementById('managerV2Backdrop')?.classList.remove('open');
  }

  function syncActive(view){
    const drawer=document.getElementById('managerV2Drawer');
    if(!drawer) return;
    drawer.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===view));
  }

  function build(){
    injectStyle();
    const header=document.querySelector('.header');
    const sourceSidebar=document.querySelector('.sidebar');
    if(!header || !sourceSidebar) return false;

    sourceSidebar.classList.add('manager-v2-sidebar-source');

    header.classList.add('manager-v2-header');
    const left=header.querySelector('.header-left') || header.firstElementChild;
    const right=header.querySelector('.header-right') || header.lastElementChild;
    if(!left || !right) return false;
    left.classList.add('manager-v2-header-left');
    right.classList.add('manager-v2-header-right');

    let menu=header.querySelector('.manager-v2-menu');
    if(!menu){
      menu=document.createElement('button');
      menu.className='manager-v2-menu';
      menu.type='button';
      menu.setAttribute('aria-label','Mở menu');
      menu.textContent='☰';
      left.prepend(menu);
    }

    const title=header.querySelector('#pageTitle');
    const sub=header.querySelector('#pageSub');
    if(title){
      title.classList.add('manager-v2-page-pill');
      title.parentElement?.classList.add('manager-v2-page-wrap');
    }
    if(sub) sub.classList.add('manager-v2-page-sub');

    let bell=header.querySelector('.manager-v2-bell');
    if(!bell){
      bell=document.createElement('button');
      bell.className='manager-v2-bell';
      bell.type='button';
      bell.title='Thông báo';
      bell.textContent='🔔';
      right.prepend(bell);
    }

    const existingAvatar=header.querySelector('.avatar');
    if(existingAvatar){
      existingAvatar.classList.add('manager-v2-avatar');
      existingAvatar.classList.remove('avatar');
    }

    if(!document.getElementById('managerV2Backdrop')){
      const backdrop=document.createElement('div');
      backdrop.id='managerV2Backdrop';
      backdrop.className='manager-v2-drawer-backdrop';
      document.body.appendChild(backdrop);
      backdrop.addEventListener('click',closeDrawer);
    }

    if(!document.getElementById('managerV2Drawer')){
      const drawer=document.createElement('aside');
      drawer.id='managerV2Drawer';
      drawer.className='manager-v2-drawer';
      const clone=sourceSidebar.cloneNode(true);
      clone.removeAttribute('id');
      clone.classList.remove('sidebar');
      clone.classList.add('manager-v2-clone');
      drawer.innerHTML='';
      drawer.appendChild(clone);
      const footer=document.createElement('div');
      footer.className='manager-v2-drawer-footer';
      const name=sourceSidebar.querySelector('#profileName')?.textContent || 'Quản lý';
      const meta=sourceSidebar.querySelector('#profileMeta')?.textContent || 'Tài khoản quản lý';
      footer.innerHTML='<div class="manager-v2-drawer-user"><strong>'+name.replace(/</g,'&lt;')+'</strong><span>'+meta.replace(/</g,'&lt;')+'</span></div><button type="button" class="manager-v2-logout">Đăng xuất</button>';
      drawer.appendChild(footer);
      document.body.appendChild(drawer);

      drawer.querySelectorAll('[data-view]').forEach(btn=>{
        btn.addEventListener('click',function(){
          const original=sourceSidebar.querySelector('[data-view="'+CSS.escape(btn.dataset.view)+'"]');
          if(original) original.click();
          syncActive(btn.dataset.view);
          closeDrawer();
        });
      });
      drawer.querySelector('.manager-v2-logout')?.addEventListener('click',function(){
        sourceSidebar.querySelector('#logoutBtn')?.click();
      });
    }

    menu.addEventListener('click',function(){
      document.getElementById('managerV2Drawer')?.classList.add('open');
      document.getElementById('managerV2Backdrop')?.classList.add('open');
    });

    const originalNav=sourceSidebar.querySelectorAll('[data-view]');
    originalNav.forEach(btn=>{
      if(btn.dataset.managerV2Bound) return;
      btn.dataset.managerV2Bound='1';
      btn.addEventListener('click',()=>syncActive(btn.dataset.view));
    });

    syncActive(sourceSidebar.querySelector('.nav button.active')?.dataset.view || 'dashboard');
    return true;
  }

  function boot(){
    let n=0;
    const tick=()=>{
      if(build()) return;
      if(++n<25) setTimeout(tick,200);
    };
    tick();
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})(window,document);

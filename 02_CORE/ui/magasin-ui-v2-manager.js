/*
 * MAGASIN UI V2 — Manager operations shell adapter
 * UI2-011 · presentation/navigation only
 */
(function(window,document){
  'use strict';
  if(window.MAGASIN_MANAGER_UI2_SHELL) return;

  const ALLOWED=Object.freeze([
    'dashboard','staff','workforce','schedule','swap','attendance','payroll-self-check'
  ]);
  const HIDDEN_SOURCE=Object.freeze(['tasks','kpi','academy','settings']);

  function sourceButton(view){
    return document.querySelector('.sidebar [data-view="'+CSS.escape(view)+'"]');
  }

  function hideLegacyPresentation(){
    for(const view of HIDDEN_SOURCE){
      const node=sourceButton(view);
      if(!node) continue;
      node.hidden=true;
      node.setAttribute('aria-hidden','true');
      node.tabIndex=-1;
    }
  }

  function group(label,keys,links){
    const section=document.createElement('section');
    section.className='m-shell-v2-nav__group';
    const heading=document.createElement('div');
    heading.className='m-shell-v2-nav__label';
    heading.textContent=label;
    section.appendChild(heading);
    const items=document.createElement('div');
    items.className='m-shell-v2-nav__items';
    for(const key of keys){
      const node=links.get(key);
      if(node) items.appendChild(node);
    }
    section.appendChild(items);
    return section;
  }

  function organizeNav(shell){
    const nav=shell.querySelector('.m-shell-v2-nav');
    if(!nav||nav.dataset.managerUi2Organized==='1') return;
    const links=new Map(
      [...nav.querySelectorAll('.m-shell-v2-nav__item[data-shell-key]')]
        .map(node=>[node.dataset.shellKey,node])
    );
    for(const [key,node] of links){
      if(!ALLOWED.includes(key)) node.remove();
    }
    nav.replaceChildren(
      group('Điều hành',['dashboard'],links),
      group('Workforce',['workforce','schedule','swap','attendance'],links),
      group('Nhân sự',['staff','payroll-self-check'],links)
    );
    nav.dataset.managerUi2Organized='1';
    nav.setAttribute('aria-label','Điều hướng vận hành Manager');
  }

  function decorate(shell){
    if(!document.body) return false;
    hideLegacyPresentation();
    document.body.dataset.managerUi2Shell='operations';
    const sidebar=shell.querySelector('.m-shell-v2-sidebar');
    if(sidebar) sidebar.setAttribute('aria-label','Điều hướng vận hành Manager');
    organizeNav(shell);
    const title=shell.querySelector('[data-shell-page-title]');
    if(title) title.setAttribute('aria-live','polite');
    const menu=shell.querySelector('[data-shell-menu]');
    if(menu){
      menu.setAttribute('aria-label','Mở điều hướng vận hành');
      menu.setAttribute('aria-haspopup','true');
    }
    const account=shell.querySelector('.m-shell-v2-user');
    if(account) account.setAttribute('aria-label','Tài khoản Manager hiện tại');
    let marker=shell.querySelector('[data-manager-ui2-status]');
    if(!marker){
      marker=document.createElement('span');
      marker.className='m-badge m-status-badge--info';
      marker.dataset.managerUi2Status='canonical';
      marker.textContent='Vận hành canonical';
      const right=shell.querySelector('.m-shell-v2-topbar__right');
      if(right) right.prepend(marker);
    }
    return true;
  }

  function boot(){
    let attempts=0;
    const tick=()=>{
      const shell=document.getElementById('magasinUiV2Shell');
      if(shell&&decorate(shell)){
        window.MAGASIN_MANAGER_UI2_SHELL=Object.freeze({
          version:'2.11',
          allowedViews:ALLOWED,
          refresh:()=>decorate(shell)
        });
        return;
      }
      if(++attempts<80) setTimeout(tick,100);
    };
    tick();
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})(window,document);

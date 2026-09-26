/* MAGASIN UI V2 — Manager authenticated operations shell · UI2-011 */
(function(window,document){
'use strict';
if(window.MAGASIN_MANAGER_UI_V2_011)return;
window.MAGASIN_MANAGER_UI_V2_011=true;
const allowed=['dashboard','staff','workforce','schedule','swap','attendance','payroll-self-check'];
const css=`
body[data-magasin-shell-role="manager"]{--manager-nav-w:232px;background:var(--m-color-neutral-50,#f8fafc)!important}
body[data-magasin-shell-role="manager"] .manager-v2-sidebar-source{position:fixed!important;inset:0 auto 0 0!important;width:var(--manager-nav-w)!important;padding:18px 12px!important;background:#10213b!important;border:0!important;color:#fff!important;z-index:850!important;display:flex!important;flex-direction:column!important;transform:none!important}
body[data-magasin-shell-role="manager"] .manager-v2-sidebar-source .brand{color:#fff!important;font-size:22px!important;font-weight:900!important}
body[data-magasin-shell-role="manager"] .manager-v2-sidebar-source .brand-sub{color:#9fb2c9!important}
body[data-magasin-shell-role="manager"] .manager-v2-sidebar-source .nav{display:grid!important;gap:5px!important}
body[data-magasin-shell-role="manager"] .manager-v2-sidebar-source .nav button{min-height:42px!important;width:100%!important;padding:10px 12px!important;border:0!important;border-radius:10px!important;background:transparent!important;color:#dce7f5!important;text-align:left!important;font-weight:750!important;cursor:pointer!important}
body[data-magasin-shell-role="manager"] .manager-v2-sidebar-source .nav button:hover{background:#172d4b!important}
body[data-magasin-shell-role="manager"] .manager-v2-sidebar-source .nav button.active,body[data-magasin-shell-role="manager"] .manager-v2-sidebar-source .nav button:focus-visible{background:#1b3558!important;color:#67e3e6!important}
body[data-magasin-shell-role="manager"] .manager-v2-sidebar-source .nav button:focus-visible,
body[data-magasin-shell-role="manager"] .manager-v2-header button:focus-visible,
body[data-magasin-shell-role="manager"] .manager-v2-drawer button:focus-visible{outline:2px solid #7edfe5!important;outline-offset:2px!important}
body[data-magasin-shell-role="manager"] .manager-v2-sidebar-source [data-view="tasks"],
body[data-magasin-shell-role="manager"] .manager-v2-sidebar-source [data-view="kpi"],
body[data-magasin-shell-role="manager"] .manager-v2-sidebar-source [data-view="academy"],
body[data-magasin-shell-role="manager"] .manager-v2-sidebar-source [data-view="settings"]{display:none!important}
body[data-magasin-shell-role="manager"].manager-shared-shell-ready .manager-v2-sidebar-source{display:none!important}
body[data-magasin-shell-role="manager"].manager-shared-shell-ready .manager-v2-header{display:none!important}
body[data-magasin-shell-role="manager"].manager-shared-shell-ready .main{margin-left:0!important;width:100%!important}
body[data-magasin-shell-role="manager"] .m-shell-v2-nav__item[data-shell-key="tasks"],body[data-magasin-shell-role="manager"] .m-shell-v2-nav__item[data-shell-key="settings"]{display:none!important}
body[data-magasin-shell-role="manager"] .m-shell-v2-nav__item{min-height:42px!important}
body[data-magasin-shell-role="manager"] .m-shell-v2-nav__item:focus-visible,body[data-magasin-shell-role="manager"] [data-shell-menu]:focus-visible{outline:2px solid #2f6fde!important;outline-offset:2px!important}
body[data-magasin-shell-role="manager"] .main{margin-left:var(--manager-nav-w)!important;width:calc(100% - var(--manager-nav-w))!important;max-width:none!important;padding:0!important}
body[data-magasin-shell-role="manager"] .manager-v2-header{height:68px!important;background:#fff!important;border-bottom:1px solid var(--m-border-default,#e4e7ec)!important;display:flex!important;align-items:center!important;justify-content:space-between!important;padding:0 22px!important;position:sticky!important;top:0!important;z-index:800!important}
body[data-magasin-shell-role="manager"] .manager-v2-header-left,body[data-magasin-shell-role="manager"] .manager-v2-header-right{display:flex!important;align-items:center!important;gap:12px!important;min-width:0!important}
body[data-magasin-shell-role="manager"] .manager-v2-menu{display:none!important;width:44px!important;height:44px!important;border:1px solid var(--m-border-default,#e4e7ec)!important;border-radius:10px!important;background:#fff!important;color:#101828!important;align-items:center!important;justify-content:center!important;font-size:21px!important;cursor:pointer!important}
body[data-magasin-shell-role="manager"] .manager-v2-title-wrap{min-width:0!important}
body[data-magasin-shell-role="manager"] .manager-v2-page-pill{display:block!important;color:#101828!important;font-size:20px!important;line-height:26px!important;font-weight:800!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important}
body[data-magasin-shell-role="manager"] .manager-v2-page-sub{display:block!important;color:#667085!important;font-size:12px!important;line-height:18px!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important}
body[data-magasin-shell-role="manager"] .manager-v2-account{display:flex!important;align-items:center!important;gap:9px!important;min-height:42px!important;padding:5px 8px!important;border:1px solid var(--m-border-default,#e4e7ec)!important;border-radius:12px!important;background:#fff!important}
body[data-magasin-shell-role="manager"] .manager-v2-avatar{width:32px!important;height:32px!important;border-radius:50%!important;display:grid!important;place-items:center!important;background:var(--m-color-brand-600,#0f8f9c)!important;color:#fff!important;font-weight:900!important}
body[data-magasin-shell-role="manager"] .content{max-width:1480px!important;margin:0 auto!important;padding:24px!important}
body[data-magasin-shell-role="manager"] .manager-v2-drawer-backdrop{position:fixed!important;inset:62px 0 0!important;background:rgba(16,24,40,.36)!important;z-index:1000!important;opacity:0!important;visibility:hidden!important}
body[data-magasin-shell-role="manager"] .manager-v2-drawer-backdrop.open{opacity:1!important;visibility:visible!important}
body[data-magasin-shell-role="manager"] .manager-v2-drawer{position:fixed!important;left:0!important;top:62px!important;bottom:0!important;width:min(86vw,310px)!important;padding:16px 12px!important;background:#10213b!important;color:#fff!important;z-index:1001!important;transform:translateX(-102%)!important;transition:transform .2s ease!important;overflow:auto!important}
body[data-magasin-shell-role="manager"] .manager-v2-drawer.open{transform:translateX(0)!important}
body[data-magasin-shell-role="manager"] .manager-v2-drawer .brand{color:#fff!important;font-size:20px!important;font-weight:900!important}
body[data-magasin-shell-role="manager"] .manager-v2-drawer .brand-sub{color:#9fb2c9!important}
body[data-magasin-shell-role="manager"] .manager-v2-drawer .nav{display:grid!important;gap:5px!important}
body[data-magasin-shell-role="manager"] .manager-v2-drawer .nav button{min-height:44px!important;border:0!important;border-radius:10px!important;background:transparent!important;color:#dce7f5!important;text-align:left!important;font-weight:750!important;padding:11px 12px!important}
body[data-magasin-shell-role="manager"] .manager-v2-drawer .nav button.active{background:#1b3558!important;color:#67e3e6!important}
@media(max-width:900px){
 body[data-magasin-shell-role="manager"] .manager-v2-sidebar-source{display:none!important}
 body[data-magasin-shell-role="manager"] .main{margin-left:0!important;width:100%!important}
 body[data-magasin-shell-role="manager"] .manager-v2-menu{display:inline-flex!important}
 body[data-magasin-shell-role="manager"] .content{padding:18px!important}
}
@media(max-width:520px){
 body[data-magasin-shell-role="manager"] .manager-v2-header{height:62px!important;padding:0 12px!important}
 body[data-magasin-shell-role="manager"] .manager-v2-page-pill{font-size:17px!important}
 body[data-magasin-shell-role="manager"] .manager-v2-page-sub{display:none!important}
 body[data-magasin-shell-role="manager"] .manager-v2-account span:not(.manager-v2-avatar){display:none!important}
 body[data-magasin-shell-role="manager"] .content{padding:14px!important}
}
`;
function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function injectStyle(){if(document.getElementById('manager-v2-shell-css'))return;const s=document.createElement('style');s.id='manager-v2-shell-css';s.textContent=css;document.head.appendChild(s)}
function closeDrawer(){document.getElementById('managerV2Drawer')?.classList.remove('open');document.getElementById('managerV2Backdrop')?.classList.remove('open');document.querySelector('.manager-v2-menu')?.setAttribute('aria-expanded','false')}
function syncActive(view){for(const root of [document.querySelector('.manager-v2-sidebar-source'),document.getElementById('managerV2Drawer')])root?.querySelectorAll('[data-view]').forEach(b=>{const active=b.dataset.view===view;b.classList.toggle('active',active);if(active)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current')})}
function filterNav(root){root?.querySelectorAll('[data-view]').forEach(b=>{if(!allowed.includes(b.dataset.view)){b.hidden=true;b.setAttribute('aria-hidden','true');b.tabIndex=-1}})}
function build(){
 injectStyle();document.body.dataset.managerUi2Shell='1';
 const header=document.querySelector('.header'),source=document.querySelector('.sidebar');if(!header||!source)return false;
 source.classList.add('manager-v2-sidebar-source');filterNav(source);
 header.classList.add('manager-v2-header');
 const left=header.querySelector('.header-left'),right=header.querySelector('.header-right');if(!left||!right)return false;
 left.classList.add('manager-v2-header-left');right.classList.add('manager-v2-header-right');
 const title=header.querySelector('#pageTitle'),sub=header.querySelector('#pageSub'),wrap=title?.parentElement;if(wrap)wrap.classList.add('manager-v2-title-wrap');title?.classList.add('manager-v2-page-pill');sub?.classList.add('manager-v2-page-sub');
 let menu=header.querySelector('.manager-v2-menu');if(!menu){menu=document.createElement('button');menu.type='button';menu.className='manager-v2-menu';menu.setAttribute('aria-label','Mở điều hướng quản lý');menu.setAttribute('aria-expanded','false');menu.textContent='☰';left.prepend(menu)}
 const avatar=header.querySelector('#headerAvatar');avatar?.classList.add('manager-v2-avatar');
 if(!right.querySelector('.manager-v2-account')){const account=document.createElement('button');account.type='button';account.className='manager-v2-account';account.setAttribute('aria-label','Tài khoản quản lý');account.innerHTML='<span class="manager-v2-avatar">'+esc(avatar?.textContent||'M')+'</span><span>Quản lý</span>';right.replaceChildren(account)}
 if(!document.getElementById('managerV2Backdrop')){const b=document.createElement('div');b.id='managerV2Backdrop';b.className='manager-v2-drawer-backdrop';document.body.appendChild(b);b.addEventListener('click',closeDrawer)}
 if(!document.getElementById('managerV2Drawer')){
   const drawer=document.createElement('aside');drawer.id='managerV2Drawer';drawer.className='manager-v2-drawer';drawer.setAttribute('aria-label','Điều hướng quản lý');
   const clone=source.cloneNode(true);clone.removeAttribute('id');clone.classList.remove('sidebar','manager-v2-sidebar-source');filterNav(clone);drawer.appendChild(clone);document.body.appendChild(drawer);
   drawer.querySelectorAll('[data-view]').forEach(btn=>btn.addEventListener('click',()=>{source.querySelector('[data-view="'+CSS.escape(btn.dataset.view)+'"]')?.click();syncActive(btn.dataset.view);closeDrawer()}));
 }
 if(menu.dataset.bound!=='1'){menu.dataset.bound='1';menu.addEventListener('click',()=>{const drawer=document.getElementById('managerV2Drawer'),back=document.getElementById('managerV2Backdrop'),open=!drawer.classList.contains('open');drawer.classList.toggle('open',open);back.classList.toggle('open',open);menu.setAttribute('aria-expanded',String(open));if(open)drawer.querySelector('[data-view]:not([hidden])')?.focus()})}
 document.addEventListener('keydown',e=>{if(e.key==='Escape')closeDrawer()},{once:false});
 source.querySelectorAll('[data-view]').forEach(btn=>{if(btn.dataset.v2Bound)return;btn.dataset.v2Bound='1';btn.addEventListener('click',()=>syncActive(btn.dataset.view))});
 syncActive(source.querySelector('.nav button.active')?.dataset.view||'dashboard');
 return true;
}
function syncSharedShell(){
 const shared=document.getElementById('magasinUiV2Shell')||document.querySelector('.m-shell-v2-sidebar');
 if(!shared)return false;
 document.body.classList.add('manager-shared-shell-ready');
 for(const key of ['tasks','settings'])document.querySelectorAll('.m-shell-v2-nav__item[data-shell-key="'+key+'"]').forEach(x=>{x.setAttribute('aria-hidden','true');x.tabIndex=-1});
 return true;
}
function boot(){
 let n=0;const tick=()=>{build();syncSharedShell();if(++n<40)setTimeout(tick,150)};tick();
 const observer=new MutationObserver(()=>syncSharedShell());observer.observe(document.documentElement,{childList:true,subtree:true});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})(window,document);

/* MAGASIN Owner Workforce Review · Store filter V2
 * Owner has multiple branches. Review is scoped to one selected branch.
 * The selector is integrated into the review header; the existing review engine stays unchanged.
 */
(()=>{'use strict';
const U='https://menvbzlsncmpuvnaifxa.supabase.co',K='sb_publishable_HsvCS6HDZnCDInd9PUoh0g_V34wJVqx';
const PANEL='#panel-review';
const STYLE_ID='mwr-store-filter-v2-css';
let stores=[];
let selectedStoreId='';
let loaded=false;
let observerStarted=false;

const esc=s=>String(s??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
function selectedCode(){const s=stores.find(x=>String(x.id)===String(selectedStoreId));return s?String(s.code||''):''}
function selectedName(){const s=stores.find(x=>String(x.id)===String(selectedStoreId));return s?String(s.name||''):''}

function injectCss(){
 if(document.getElementById(STYLE_ID))return;
 const css=document.createElement('style');css.id=STYLE_ID;css.textContent=`
 .mwr-store-filter-inline{display:flex;align-items:center;gap:7px}
 .mwr-store-filter-inline label{font-size:10px;font-weight:800;color:var(--muted);white-space:nowrap}
 .mwr-store-filter-inline select{height:38px;min-width:250px;border:1px solid var(--border);border-radius:9px;background:#fff;color:var(--text);padding:0 10px;font-weight:700}
 .mwr-store-hidden{display:none!important}
 .mwr-store-empty{padding:18px 10px;text-align:center;color:var(--muted);font-size:12px}
 @media(max-width:760px){
  .mwr-store-filter-inline{width:100%;align-items:stretch;flex-direction:column;gap:5px}
  .mwr-store-filter-inline select{width:100%;min-width:0}
 }
 `;document.head.appendChild(css);
}

function getMetaStoreCode(shift){
 const meta=shift.querySelector('.mwr2-meta');
 if(!meta)return '';
 return ((meta.textContent||'').split('·')[0]||'').trim();
}

function ensureSelector(panel){
 if(!stores.length)return;
 const actions=panel.querySelector('.mwr2-actions');
 if(!actions)return;
 let wrap=actions.querySelector('.mwr-store-filter-inline');
 if(!wrap){
   wrap=document.createElement('div');
   wrap.className='mwr-store-filter-inline';
   const label=document.createElement('label');label.textContent='Chi nhánh review';
   const select=document.createElement('select');select.id='mwrStoreFilter';
   select.setAttribute('aria-label','Chọn chi nhánh để review lịch đăng ký');
   wrap.append(label,select);
   actions.insertBefore(wrap,actions.firstChild);
   select.addEventListener('change',()=>{selectedStoreId=select.value;applyFilter(panel)});
 }
 const select=wrap.querySelector('#mwrStoreFilter');
 if(select&&!select.options.length){
   select.innerHTML=stores.map(s=>`<option value="${esc(s.id)}">${esc(s.code)} · ${esc(s.name)}</option>`).join('');
 }
 if(!selectedStoreId&&stores[0])selectedStoreId=String(stores[0].id);
 if(select&&String(select.value)!==String(selectedStoreId))select.value=String(selectedStoreId);
}

function applyFilter(panel){
 ensureSelector(panel);
 const code=selectedCode();
 const shifts=[...panel.querySelectorAll('.mwr2-shift')];
 shifts.forEach(shift=>{
   // Keep the single row currently in edit mode visible even though its meta line is temporarily absent.
   const editing=!!shift.querySelector('.mwr2-edit-grid');
   const visible=editing||getMetaStoreCode(shift)===code;
   shift.classList.toggle('mwr-store-hidden',!visible);
 });
 const visible=shifts.filter(s=>!s.classList.contains('mwr-store-hidden'));
 const people=new Set();
 visible.forEach(s=>{const name=s.querySelector('.mwr2-name')?.textContent?.trim();if(name)people.add(name)});
 const badge=panel.querySelector('.mwr2-actions > .badge');
 if(badge)badge.textContent=`${visible.length} ca · ${people.size} nhân viên`;
 const selectorLabel=panel.querySelector('.mwr-store-filter-inline label');
 if(selectorLabel)selectorLabel.textContent=`Chi nhánh review · ${code||'Chưa chọn'}${selectedName()?` · ${selectedName()}`:''}`;
 panel.querySelectorAll('.mwr2-day').forEach(day=>{
   const matching=[...day.querySelectorAll('.mwr2-shift')].filter(s=>!s.classList.contains('mwr-store-hidden'));
   let empty=day.querySelector('.mwr-store-empty');
   if(!matching.length){
     if(!empty){empty=document.createElement('div');empty.className='mwr-store-empty';empty.textContent='Không có đăng ký tại chi nhánh này';day.appendChild(empty)}
   }else if(empty)empty.remove();
   // Hide the original generic empty marker once store filtering is active.
   day.querySelectorAll('.mwr2-empty:not(.mwr-store-empty)').forEach(e=>{if(!matching.length)e.classList.add('mwr-store-hidden');else e.classList.remove('mwr-store-hidden')});
 });
}

async function loadStores(){
 if(loaded)return true;
 const sb=window.supabase?.createClient?window.supabase.createClient(U,K,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}}):null;
 if(!sb)return false;
 const q=await sb.rpc('get_manager_accessible_stores');
 if(q.error||!Array.isArray(q.data)||!q.data.length)return false;
 stores=q.data.slice();loaded=true;return true;
}

async function boot(){
 for(let i=0;i<100;i++){
   const panel=document.querySelector(PANEL);
   if(panel)break;
   await new Promise(r=>setTimeout(r,150));
 }
 await loadStores();
 injectCss();
 const apply=()=>{const panel=document.querySelector(PANEL);if(panel)applyFilter(panel)};
 apply();
 if(observerStarted)return;observerStarted=true;
 const panel=document.querySelector(PANEL);
 if(panel){const observer=new MutationObserver(()=>requestAnimationFrame(apply));observer.observe(panel,{childList:true,subtree:true});}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();

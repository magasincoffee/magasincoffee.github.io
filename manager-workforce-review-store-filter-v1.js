/* MAGASIN Owner Workforce Review · Store filter V1
 * Purpose: Owner has multiple branches. Review must be scoped to one selected branch.
 * Keeps the existing review engine, but presents only registrations for the selected store.
 */
(()=>{'use strict';
const U='https://menvbzlsncmpuvnaifxa.supabase.co',K='sb_publishable_HsvCS6HDZnCDInd9PUoh0g_V34wJVqx';
const PANEL='#panel-review';
const STYLE_ID='mwr-store-filter-v1-css';
let stores=[];
let selectedStoreId='';
let loaded=false;

const esc=s=>String(s??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));

function injectCss(){
 if(document.getElementById(STYLE_ID))return;
 const css=document.createElement('style');css.id=STYLE_ID;css.textContent=`
 .mwr-store-filter{display:flex;align-items:flex-end;gap:10px;margin-bottom:12px;padding:10px 12px;border:1px solid var(--border);border-radius:12px;background:#f8fafd}
 .mwr-store-filter-field{display:grid;gap:5px;min-width:280px;flex:1 1 320px}
 .mwr-store-filter-field label{font-size:11px;font-weight:800;color:var(--muted)}
 .mwr-store-filter-field select{height:40px;border:1px solid var(--border);border-radius:9px;background:#fff;color:var(--text);padding:0 11px;font-weight:700}
 .mwr-store-filter-help{font-size:11px;color:var(--muted);white-space:nowrap;padding-bottom:11px}
 .mwr-shift-store-hidden{display:none!important}
 @media(max-width:760px){.mwr-store-filter{align-items:stretch;flex-direction:column}.mwr-store-filter-field{min-width:0}.mwr-store-filter-help{padding-bottom:0}}
 `;document.head.appendChild(css);
}

function getStoreCode(id){
 const s=stores.find(x=>String(x.id)===String(id));
 return s?String(s.code||'') : '';
}

function ensureSelector(panel){
 if(!stores.length)return;
 let box=panel.querySelector('.mwr-store-filter');
 if(!box){
   const card=panel.querySelector('.mwr2-card');
   if(!card)return;
   box=document.createElement('div');box.className='mwr-store-filter';
   const field=document.createElement('label');field.className='mwr-store-filter-field';
   const title=document.createElement('span');title.textContent='Cửa hàng đang review';
   const select=document.createElement('select');select.id='mwrStoreFilter';
   field.append(title,select);
   const help=document.createElement('div');help.className='mwr-store-filter-help';help.textContent='Chọn từng chi nhánh để sắp xếp và duyệt nhân sự';
   box.append(field,help);
   card.parentNode.insertBefore(box,card);
   select.addEventListener('change',()=>{selectedStoreId=select.value;applyFilter(panel)});
 }
 const select=box.querySelector('#mwrStoreFilter');
 if(select && !select.options.length){
   select.innerHTML=stores.map(s=>`<option value="${esc(s.id)}">${esc(s.code)} · ${esc(s.name)}</option>`).join('');
 }
 if(select && selectedStoreId && select.value!==String(selectedStoreId))select.value=String(selectedStoreId);
 if(select && !selectedStoreId && stores[0]){selectedStoreId=String(stores[0].id);select.value=selectedStoreId;}
}

function cardStoreCode(shift){
 const meta=shift.querySelector('.mwr2-meta');
 if(!meta)return '';
 const text=(meta.textContent||'').trim();
 const first=(text.split('·')[0]||'').trim();
 return first;
}

function applyFilter(panel){
 ensureSelector(panel);
 const code=getStoreCode(selectedStoreId);
 const shifts=[...panel.querySelectorAll('.mwr2-shift')];
 shifts.forEach(shift=>{
   const ownerCode=cardStoreCode(shift);
   const visible=ownerCode===code;
   shift.classList.toggle('mwr-shift-store-hidden',!visible);
 });
 // Update the summary count to reflect only the selected store.
 const visible=shifts.filter(s=>!s.classList.contains('mwr-shift-store-hidden'));
 const people=new Set();
 visible.forEach(s=>{const name=s.querySelector('.mwr2-name')?.textContent?.trim();if(name)people.add(name)});
 const badge=panel.querySelector('.mwr2-actions .badge');
 if(badge)badge.textContent=`${visible.length} ca · ${people.size} nhân viên · ${code||'Chưa chọn CN'}`;
 // Replace empty-day text for days with no matching registrations.
 panel.querySelectorAll('.mwr2-day').forEach(day=>{
   const normal=[...day.querySelectorAll('.mwr2-shift:not(.mwr-shift-store-hidden)')];
   const empties=day.querySelectorAll('.mwr2-empty');
   if(normal.length===0){
      if(!empties.length){const e=document.createElement('div');e.className='mwr2-empty mwr-store-empty';e.textContent='Không có đăng ký tại chi nhánh này';day.appendChild(e)}
   }else empties.forEach(e=>{if(e.classList.contains('mwr-store-empty'))e.remove()});
 }
}

async function loadStores(){
 if(loaded)return;
 const sb=window.supabase?.createClient?window.supabase.createClient(U,K,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}}):null;
 if(!sb)return;
 const q=await sb.rpc('get_manager_accessible_stores');
 if(!q.error && Array.isArray(q.data) && q.data.length){stores=q.data.slice();loaded=true;}
}

async function boot(){
 for(let i=0;i<80;i++){
   if(document.querySelector(PANEL))break;
   await new Promise(r=>setTimeout(r,150));
 }
 await loadStores();
 injectCss();
 const apply=()=>{const panel=document.querySelector(PANEL);if(panel)applyFilter(panel)};
 apply();
 const observer=new MutationObserver(()=>requestAnimationFrame(apply));
 const panel=document.querySelector(PANEL);
 if(panel)observer.observe(panel,{childList:true,subtree:true});
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();

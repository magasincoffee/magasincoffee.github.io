(()=>{'use strict';
const PANEL='#panel-review';
const STYLE_ID='mwr-edit-cleanup-v2-css';

const getReviewStoreId=panel=>panel?.querySelector('#mwrStoreFilter, #mwrxStore')?.value||'';

const clean=panel=>{
  if(!panel)return;

  // Keep the edit form intentionally minimal: time + working branch + actions.
  panel.querySelectorAll('.mwr2-transfer').forEach(el=>el.remove());
  panel.querySelectorAll('.mwr2-field').forEach(field=>{
    const label=field.querySelector('label');
    if(label && /^Nội dung ghi chú$/i.test((label.textContent||'').trim())) field.remove();
  });

  // The selected review branch is the source branch. It must never be offered
  // as a transfer target, so reviewing CN1 only allows CN2/CN3/CN4.
  const sourceStoreId=getReviewStoreId(panel);
  if(!sourceStoreId)return;
  panel.querySelectorAll('.mwr2-edit-grid select[data-k="preferred_store_id"]').forEach(select=>{
    const sourceOption=[...select.options].find(option=>String(option.value)===String(sourceStoreId));
    if(!sourceOption)return;
    const wasSelected=String(select.value)===String(sourceStoreId);
    sourceOption.remove();
    if(wasSelected){
      const firstTarget=[...select.options].find(option=>String(option.value)!=='');
      select.value=firstTarget?.value||'';
    }
  });
};

const boot=()=>{
  const panel=document.querySelector(PANEL);if(!panel)return;
  if(!document.getElementById(STYLE_ID)){
    const s=document.createElement('style');
    s.id=STYLE_ID;
    document.head.appendChild(s);
  }
  clean(panel);
  const observer=new MutationObserver(()=>requestAnimationFrame(()=>clean(panel)));
  observer.observe(panel,{childList:true,subtree:true});
};

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,0),{once:true});
else setTimeout(boot,0);
})();

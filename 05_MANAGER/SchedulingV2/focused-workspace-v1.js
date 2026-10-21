(()=>{
'use strict';
// Presentation-only controller: existing scheduling modules retain all data and RPC authority.
const bar=document.querySelector('.sv2-bar');
const roster=document.querySelector('.sv2-roster');
if(!bar||!roster)return;
const primary=document.createElement('button');
primary.type='button';primary.className='sv2-primary-action';
primary.id='sv2PrimaryAction';
primary.textContent='Xem bảng lịch';
primary.addEventListener('click',()=>{
  const add=document.getElementById('sv2AddShift');
  if(add&&!add.disabled){add.click();return;}
  roster.scrollIntoView({behavior:'smooth',block:'start'});
  roster.querySelector('h2')?.focus({preventScroll:true});
});
const advanced=document.createElement('details');
advanced.className='sv2-advanced';
advanced.innerHTML='<summary>Công cụ nâng cao</summary><div class="sv2-advanced-content" aria-label="Công cụ xếp lịch bổ sung"></div>';
const content=advanced.querySelector('.sv2-advanced-content');
bar.append(primary,advanced);
const demand=bar.querySelector('.sv2-demand-back');
if(demand)content.appendChild(demand);
const refresh=document.getElementById('sv2Refresh');
if(refresh)content.appendChild(refresh);
const moveExtras=()=>{
  const extras=[...bar.children].filter(el=>el!==primary&&el!==advanced&&el.id!=='sv2Store'&&
    !el.matches('label,.sv2-week-picker') &&
    (el.matches('button,a')||el.classList.contains('sv2-action')));
  for(const el of extras)content.appendChild(el);
  const add=document.getElementById('sv2AddShift');
  const canAdd=!!add&&!add.disabled;
  primary.textContent=canAdd?'Xếp ca':'Xem bảng lịch';
  if(add)primary.setAttribute('aria-label',canAdd?'Mở cửa sổ xếp ca nháp':'Xem bảng lịch tuần');
};
const observer=new MutationObserver(moveExtras);
observer.observe(bar,{childList:true});
moveExtras();
document.addEventListener('magasin:scheduling-v2-week-loaded',moveExtras);
document.addEventListener('click',event=>{
  if(advanced.open&&!advanced.contains(event.target))advanced.open=false;
});
roster.querySelector('h2')?.setAttribute('tabindex','-1');
})();
(()=>{'use strict';
const MIN=300,MAX=1320,STEP=30;
const pad=n=>String(n).padStart(2,'0');
const TIMES=[];
for(let m=MIN;m<=MAX;m+=STEP)TIMES.push(`${pad(Math.floor(m/60))}:${pad(m%60)}`);

function validHm(v){return /^([01]\d|2[0-3]):[0-5]\d$/.test(String(v||''))}
function copyAttributes(input,select){
  for(const attr of [...input.attributes]){
    if(attr.name==='type'||attr.name==='value')continue;
    select.setAttribute(attr.name,attr.value);
  }
}
function addOption(select,value,label=value){
  const o=document.createElement('option');
  o.value=value;
  o.textContent=label;
  select.appendChild(o);
}
function replaceInput(input){
  if(input.dataset.magasinTimePicker==='1')return;
  const value=String(input.value||'').slice(0,5);
  const select=document.createElement('select');
  copyAttributes(input,select);
  select.dataset.magasinTimePicker='1';
  select.classList.add('magasin-time-select');

  if(!validHm(value))addOption(select,'','Chọn giờ');
  const options=[...TIMES];
  if(validHm(value)&&!options.includes(value))options.push(value);
  options.sort();
  for(const t of options)addOption(select,t);

  select.value=validHm(value)?value:'';
  input.replaceWith(select);
}
function scan(root=document){root.querySelectorAll?.('input[type="time"]').forEach(replaceInput)}
function boot(){
  scan();
  new MutationObserver(muts=>muts.forEach(m=>m.addedNodes.forEach(n=>{if(n.nodeType===1)scan(n)})))
    .observe(document.documentElement,{subtree:true,childList:true});
  const style=document.createElement('style');
  style.id='magasin-time-picker-24h-style';
  style.textContent='.magasin-time-select{appearance:auto;min-width:0;max-width:100%;font:inherit}.wfd-time .magasin-time-select{width:100%;min-height:40px;border:1px solid var(--border);border-radius:8px;padding:0 8px;background:#fff;color:var(--text)}';
  document.head.appendChild(style);
}
document.readyState==='loading'?document.addEventListener('DOMContentLoaded',boot,{once:true}):boot();
})();
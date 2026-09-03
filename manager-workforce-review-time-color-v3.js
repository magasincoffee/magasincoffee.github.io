(()=>{'use strict';
const PANEL='#panel-review';
const STYLE='mwr-time-color-v3-css';
const mins=v=>{const s=String(v||'').slice(0,5).split(':').map(Number);return (s[0]||0)*60+(s[1]||0)};
const kindFromMinutes=m=>m<720?'morning':m<1020?'afternoon':'evening';
const cleanupLegends=panel=>{
  if(!panel)return;
  panel.querySelectorAll('.mwr2-legend,.mwr2-legend-item').forEach(el=>el.remove());
  [...panel.querySelectorAll('*')].forEach(el=>{
    const text=(el.textContent||'').replace(/\s+/g,' ').trim();
    if(/^Quy ước màu\b/i.test(text) && el.children.length>0){
      // Only remove the legend-like block, never a normal heading.
      const hasStatus=/PREFERRED|AVAILABLE|CONFLICT|APPROVED|Không đăng ký/i.test(text);
      if(hasStatus || el.className?.toString().includes('legend')) el.remove();
    }
  });
};
const applyColors=panel=>{
  if(!panel)return;
  panel.querySelectorAll('.mwr2-shift').forEach(card=>{
    const select=card.querySelector('select[data-k="start_time"]');
    const time=card.querySelector('.mwr2-time');
    let start=select?.value||'';
    if(!start && time) start=(time.textContent||'').split(/\s*[–-]\s*/)[0].trim();
    const kind=kindFromMinutes(mins(start));
    card.classList.remove('morning','afternoon','evening','preferred','available','conflict','approved');
    card.classList.add(kind);
    const badge=card.querySelector('.mwr2-badge');
    if(badge){badge.textContent=kind==='morning'?'Sáng':kind==='afternoon'?'Trưa/chiều':'Tối'}
  });
};
const inject=()=>{
  if(document.getElementById(STYLE))return;
  const s=document.createElement('style');s.id=STYLE;s.textContent=`
.mwr2-shift.morning{background:#fff8dc!important;border-color:#ead97c!important}.mwr2-shift.morning .mwr2-badge{background:#ffe98b!important;color:#695800!important}
.mwr2-shift.afternoon{background:#fff0f0!important;border-color:#efb7b7!important}.mwr2-shift.afternoon .mwr2-badge{background:#f5caca!important;color:#8e3838!important}
.mwr2-shift.evening{background:#edfafa!important;border-color:#a6dede!important}.mwr2-shift.evening .mwr2-badge{background:#c6eeee!important;color:#176f70!important}
`;document.head.appendChild(s);
};
const run=()=>{const panel=document.querySelector(PANEL);if(!panel)return false;inject();cleanupLegends(panel);applyColors(panel);return true};
const boot=()=>{
  if(run()){
    const observer=new MutationObserver(()=>requestAnimationFrame(run));
    const panel=document.querySelector(PANEL);observer.observe(panel,{childList:true,subtree:true});
    setInterval(run,1000);
  }
};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{setTimeout(boot,0);setTimeout(boot,500);setTimeout(boot,1500)},{once:true});else{boot();setTimeout(boot,500);setTimeout(boot,1500)}
})();

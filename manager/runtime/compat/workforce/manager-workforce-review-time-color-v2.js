(()=>{'use strict';
const PANEL='#panel-review';
const STYLE='mwr-time-color-v2-css';
const mins=v=>{const s=String(v||'').slice(0,5).split(':').map(Number);return (s[0]||0)*60+(s[1]||0)};
const kindFromMinutes=m=>m<720?'morning':m<1020?'afternoon':'evening';
const apply=panel=>{
 if(!panel)return;
 // The review legend is intentionally removed: colors are self-explanatory and follow the shift start time, same as Workforce demand.
 panel.querySelectorAll('.mwr2-legend').forEach(el=>el.remove());
 panel.querySelectorAll('.mwr2-shift').forEach(card=>{
   const time=card.querySelector('.mwr2-time');
   const select=card.querySelector('select[data-k="start_time"]');
   const start=select?.value || time?.textContent?.split(/[–-]/)[0]?.trim() || '';
   const kind=kindFromMinutes(mins(start));
   card.classList.remove('morning','afternoon','evening','preferred','available','conflict','approved');
   card.classList.add(kind);
 });
};
const inject=()=>{if(document.getElementById(STYLE))return;const s=document.createElement('style');s.id=STYLE;s.textContent=`
.mwr2-shift.morning{background:#fff8dc!important;border-color:#ead97c!important}.mwr2-shift.morning:before{background:#d6bd3f!important}.mwr2-shift.morning .mwr2-badge{background:#ffe98b!important;color:#695800!important}
.mwr2-shift.afternoon{background:#fff0f0!important;border-color:#efb7b7!important}.mwr2-shift.afternoon:before{background:#de7777!important}.mwr2-shift.afternoon .mwr2-badge{background:#f5caca!important;color:#8e3838!important}
.mwr2-shift.evening{background:#edfafa!important;border-color:#a6dede!important}.mwr2-shift.evening:before{background:#34afb1!important}.mwr2-shift.evening .mwr2-badge{background:#c6eeee!important;color:#176f70!important}
.mwr2-shift .mwr2-badge{font-size:0}.mwr2-shift.morning .mwr2-badge:after{content:'Sáng';font-size:10px}.mwr2-shift.afternoon .mwr2-badge:after{content:'Trưa/chiều';font-size:10px}.mwr2-shift.evening .mwr2-badge:after{content:'Tối';font-size:10px}
`;document.head.appendChild(s)};
const boot=()=>{const panel=document.querySelector(PANEL);if(!panel)return false;inject();apply(panel);if(panel.dataset.mwrTimeColor==='2')return true;panel.dataset.mwrTimeColor='2';const observer=new MutationObserver(()=>requestAnimationFrame(()=>apply(panel)));observer.observe(panel,{childList:true,subtree:true});return true};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{setTimeout(boot,0);setTimeout(boot,500)}, {once:true});else{boot();setTimeout(boot,500)}
})();
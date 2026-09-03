(()=>{'use strict';
const PANEL='#panel-review', STYLE='mwr-time-color-v1-css';
const timeKind=s=>{const m=String(s||'').slice(0,5),h=Number(m.slice(0,2)),min=Number(m.slice(3,5)),v=h*60+min;return v<720?'morning':v<1020?'afternoon':'evening'};
const ensureStyle=()=>{
 if(document.getElementById(STYLE))return;
 const s=document.createElement('style');s.id=STYLE;s.textContent=`
/* Review color is based on shift time, not availability status. */
.mwr2-legend{display:none!important}
.mwr2-shift.mwr-time-morning{background:#fff8dc!important;border-color:#ead97c!important}
.mwr2-shift.mwr-time-morning::before{background:#d6bd3f!important}
.mwr2-shift.mwr-time-afternoon{background:#fff0f0!important;border-color:#efb7b7!important}
.mwr2-shift.mwr-time-afternoon::before{background:#de7777!important}
.mwr2-shift.mwr-time-evening{background:#edfafa!important;border-color:#a6dede!important}
.mwr2-shift.mwr-time-evening::before{background:#34afb1!important}
.mwr2-shift.mwr-time-morning .mwr2-badge{background:#ffe98b!important;color:#695800!important}
.mwr2-shift.mwr-time-afternoon .mwr2-badge{background:#f5caca!important;color:#8e3838!important}
.mwr2-shift.mwr-time-evening .mwr2-badge{background:#c6eeee!important;color:#176f70!important}
`;
 document.head.appendChild(s);
};
const apply=panel=>{
 if(!panel)return;
 ensureStyle();
 panel.querySelectorAll('.mwr2-legend').forEach(el=>el.remove());
 panel.querySelectorAll('.mwr2-shift').forEach(card=>{
   const time=card.querySelector('[data-k="start_time"]')?.value||card.querySelector('.mwr2-time')?.textContent||'';
   const start=String(time).match(/\b(\d{1,2}:\d{2})/);
   const k=timeKind(start?start[1]:'');
   card.classList.remove('mwr-time-morning','mwr-time-afternoon','mwr-time-evening');
   if(k)card.classList.add(`mwr-time-${k}`);
 });
};
const boot=()=>{
 const panel=document.querySelector(PANEL);if(!panel)return;
 apply(panel);
 const observer=new MutationObserver(()=>requestAnimationFrame(()=>apply(panel)));
 observer.observe(panel,{childList:true,subtree:true});
};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,0),{once:true});else setTimeout(boot,0);
})();

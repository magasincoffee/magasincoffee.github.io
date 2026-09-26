(()=>{'use strict';
const U='https://menvbzlsncmpuvnaifxa.supabase.co',K='sb_publishable_HsvCS6HDZnCDInd9PUoh0g_V34wJVqx';
const DAYS=['T2','T3','T4','T5','T6','T7','CN'];
const esc=s=>String(s??'').replace(/[&<>\\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\\"':'&quot;',"'":'&#39;'}[c]));
const hm=v=>String(v||'').slice(0,5);
const toDate=s=>new Date(String(s).slice(0,10)+'T00:00:00Z');
const add=(s,n)=>{const d=toDate(s);d.setUTCDate(d.getUTCDate()+Number(n||0));return d.toISOString().slice(0,10)};
const monday=s=>{const d=toDate(s),day=d.getUTCDay()||7;d.setUTCDate(d.getUTCDate()-day+1);return d.toISOString().slice(0,10)};
function todayVN(){
 if(/^\d{4}-\d{2}-\d{2}$/.test(String(window.__MAGASIN_WORKFORCE_TODAY__||'')))return String(window.__MAGASIN_WORKFORCE_TODAY__);
 const parts={};for(const p of new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()))if(p.type!=='literal')parts[p.type]=p.value;
 return `${parts.year}-${parts.month}-${parts.day}`;
}
const targetWeek=()=>add(monday(todayVN()),7);
const css=`<style id="mw-review-v3-css">
.mwr3-card{margin-top:0}.mwr3-top{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}.mwr3-actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap}.mwr3-board{display:grid;grid-template-columns:repeat(7,minmax(210px,1fr));gap:10px;overflow:auto;margin-top:14px;padding-bottom:4px}.mwr3-day{border:1px solid var(--border);border-radius:14px;background:#fff;min-height:190px;overflow:hidden}.mwr3-day-title{padding:10px;background:#f8fafd;border-bottom:1px solid #eef2f6;display:flex;justify-content:space-between}.mwr3-shift{margin:9px;padding:10px;border:1px solid #cfe1eb;border-radius:10px;background:#f7fcfd}.mwr3-time{font-weight:800;color:#0f4778}.mwr3-name{font-weight:800;margin-top:4px}.mwr3-meta,.mwr3-note{font-size:11px;color:var(--muted);margin-top:3px}.mwr3-note{color:#876900}.mwr3-empty{padding:18px 10px;text-align:center;color:var(--muted);font-size:12px}.mwr3-status{margin-top:12px;padding:10px 12px;border-radius:10px;background:#eef6ff;color:#235dba;font-size:12px}.mwr3-status.error{background:#fbeaea;color:#9a3838}@media(max-width:760px){.mwr3-top{flex-direction:column}.mwr3-board{grid-template-columns:repeat(7,minmax(245px,1fr))}}
</style>`;

async function boot(){
 if(!window.supabase?.createClient)return;
 let tries=0,panel;while(!(panel=document.querySelector('#panel-review'))&&tries++<60)await new Promise(r=>setTimeout(r,150));if(!panel)return;
 if(!document.getElementById('mw-review-v3-css'))document.head.insertAdjacentHTML('beforeend',css);
 const sb=window.supabase.createClient(U,K,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
 let week=targetWeek(),storeId=null,stores=[],rows=[],loading=true,error=null,scopeReady=false;
 async function load(){
  if(!scopeReady){loading=false;return []}
  loading=true;error=null;
  const q=await sb.rpc('get_manager_weekly_availability',{p_store_id:storeId||null,p_week_start:week});
  if(q.error){loading=false;error=q.error.message||q.error.code||'UNKNOWN';panel.innerHTML=`<section class="card"><div class="mwr3-status error">Không tải được availability: ${esc(error)}</div></section>`;return []}
  rows=Array.isArray(q.data)?q.data:[];
  loading=false;error=null;
  render();
  return rows;
 }
 window.MAGASIN_MANAGER_AVAILABILITY={refresh:load,getState:()=>({week,storeId,rows:rows.map(x=>({...x})),stores:stores.map(x=>({...x})),loading,error})};
 const storesQ=await sb.rpc('get_manager_accessible_stores');
 if(storesQ.error){loading=false;error=storesQ.error.message||storesQ.error.code||'UNKNOWN';panel.innerHTML=`<section class="card"><div class="mwr3-status error">Không tải được phạm vi cửa hàng: ${esc(error)}</div></section>`;return}
 stores=(Array.isArray(storesQ.data)?storesQ.data:[]).filter(s=>s?.id&&String(s.status||'ACTIVE').toUpperCase()==='ACTIVE');
 if(stores.length===1)storeId=stores[0].id;
 scopeReady=true;loading=false;error=null;
 function render(){
  const days=Array.from({length:7},(_,i)=>add(week,i)),map=Object.fromEntries(days.map(d=>[d,[]]));
  rows.forEach(r=>{const k=String(r.work_date).slice(0,10);if(map[k])map[k].push(r)});
  panel.innerHTML=`<section class="card mwr3-card"><div class="mwr3-top"><div><h2 style="margin:0">Đăng ký / Availability</h2><div class="muted" style="margin-top:5px">Employee sở hữu availability · Manager dùng làm nguồn để xếp lịch, không sửa đăng ký tại đây.</div></div><div class="mwr3-actions"><select class="btn" id="mwr3Store"><option value="">Tất cả cửa hàng được phép</option>${stores.map(s=>`<option value="${esc(s.id)}"${String(s.id)===String(storeId||'')?' selected':''}>${esc(s.code)} · ${esc(s.name)}</option>`).join('')}</select><button class="btn" data-mwr3-week="prev">←</button><button class="btn" data-mwr3-week="target">Tuần sau</button><button class="btn" data-mwr3-week="next">→</button><span class="badge blue">${esc(week)}</span><button class="btn primary" id="mwr3OpenSchedule">Xếp lịch tuần này</button></div></div><div class="mwr3-board">${days.map((day,i)=>`<div class="mwr3-day"><div class="mwr3-day-title"><b>${DAYS[i]}</b><span>${day.slice(8,10)}/${day.slice(5,7)}</span></div>${map[day].length?map[day].map(r=>`<div class="mwr3-shift"><div class="mwr3-time">${esc(hm(r.start_time))}–${esc(hm(r.end_time))}</div><div class="mwr3-name">${esc(r.employee_name||r.username||'Nhân viên')}</div><div class="mwr3-meta">${esc(r.preferred_store_code||'Không ưu tiên cửa hàng')} · ${esc(r.availability_type||'AVAILABLE')}</div>${r.note?`<div class="mwr3-note">${esc(r.note)}</div>`:''}</div>`).join(''):'<div class="mwr3-empty">Không có đăng ký</div>'}</div>`).join('')}</div><div id="mwr3Status" class="mwr3-status">Tuần mặc định = tuần kế tiếp theo Asia/Ho_Chi_Minh.</div></section>`;
  panel.querySelector('#mwr3Store')?.addEventListener('change',async e=>{storeId=e.target.value||null;await load()});
  panel.querySelectorAll('[data-mwr3-week]').forEach(b=>b.addEventListener('click',async()=>{const a=b.dataset.mwr3Week;week=a==='prev'?add(week,-7):a==='next'?add(week,7):targetWeek();await load()}));
  panel.querySelector('#mwr3OpenSchedule')?.addEventListener('click',()=>{
   const info=panel.querySelector('#mwr3Status');
   if(!storeId){info.className='mwr3-status error';info.textContent='Hãy chọn một cửa hàng cụ thể trước khi mở bảng xếp lịch.';return}
   document.dispatchEvent(new CustomEvent('magasin:manager-schedule-open',{detail:{storeId,week}}));
  });
 }
 await load();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
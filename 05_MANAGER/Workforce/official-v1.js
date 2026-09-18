(()=>{'use strict';
const U='https://menvbzlsncmpuvnaifxa.supabase.co',K='sb_publishable_HsvCS6HDZnCDInd9PUoh0g_V34wJVqx';
const DAYS=['Thứ Hai','Thứ Ba','Thứ Tư','Thứ Năm','Thứ Sáu','Thứ Bảy','Chủ Nhật'];
const pad=n=>String(n).padStart(2,'0');
const localDate=s=>{const p=String(s).slice(0,10).split('-').map(Number);return new Date(p[0],p[1]-1,p[2])};
const iso=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const monday=d=>{const x=new Date(d.getFullYear(),d.getMonth(),d.getDate()),day=x.getDay()||7;x.setDate(x.getDate()-day+1);return iso(x)};
const add=(s,n)=>{const d=localDate(s);d.setDate(d.getDate()+n);return iso(d)};
const fmt=s=>{const p=String(s).slice(0,10).split('-');return p.length===3?`${p[2]}/${p[1]}/${p[0]}`:String(s||'')};
const hm=v=>String(v||'').slice(0,5);
const mins=v=>{const t=hm(v);return Number(t.slice(0,2))*60+Number(t.slice(3,5))};
const kind=v=>mins(v)<720?'m':mins(v)<1020?'a':'e';
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
let sb=null,state={week:monday(new Date()),storeId:null,stores:[],rows:[],loading:false,lastError:null};
const view=()=>document.querySelector('#view-schedule');
const client=()=>{if(sb)return sb;if(!window.supabase?.createClient)throw Error('SUPABASE_CLIENT_NOT_READY');sb=window.supabase.createClient(U,K,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});return sb};
const css=`<style id="manager-official-schedule-css">
.mos-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-end;flex-wrap:wrap}.mos-title h2{margin:0}.mos-controls{display:flex;gap:7px;align-items:end;flex-wrap:wrap}.mos-field{display:grid;gap:4px;font-size:10px;font-weight:800;color:var(--muted)}.mos-field select{min-width:230px;height:40px;border:1px solid var(--border);border-radius:10px;background:#fff;padding:0 10px}.mos-meta{margin-top:12px;display:flex;gap:8px;flex-wrap:wrap}.mos-board{display:grid;grid-template-columns:repeat(7,minmax(190px,1fr));gap:10px;overflow:auto;margin-top:14px}.mos-day{border:1px solid var(--border);border-radius:14px;background:#fff;min-height:220px;overflow:hidden}.mos-day-head{padding:11px;background:#f8fafd;border-bottom:1px solid #eef2f6}.mos-day-head strong{display:block}.mos-day-head span{display:block;color:var(--muted);font-size:11px;margin-top:2px}.mos-shift{margin:9px;padding:10px;border:1px solid;border-radius:10px}.mos-shift.m{background:#fff9d8;border-color:#f0e6a3;color:#725f00}.mos-shift.a{background:#fbe4e4;border-color:#edbaba;color:#9a3838}.mos-shift.e{background:#ddf8f8;border-color:#a3dfdf;color:#08777a}.mos-shift b{display:block}.mos-shift small{display:block;margin-top:4px}.mos-empty{padding:34px 12px;text-align:center;color:var(--muted);font-size:12px}.mos-error{margin-top:14px;padding:12px;border-radius:11px;background:#fbeaea;color:#9a3838}.mos-note{margin-top:12px;padding:10px 12px;border:1px solid var(--border);border-radius:11px;background:#f8fafd;color:var(--muted);font-size:12px}@media(max-width:800px){.mos-controls{width:100%}.mos-field{width:100%}.mos-field select{min-width:0;width:100%}.mos-board{grid-template-columns:repeat(7,minmax(235px,1fr))}}
</style>`;
function ensureCss(){if(!document.getElementById('manager-official-schedule-css'))document.head.insertAdjacentHTML('beforeend',css)}
async function loadStores(){
 if(state.stores.length)return;
 const q=await client().rpc('get_manager_accessible_stores');
 if(q.error)throw q.error;
 state.stores=Array.isArray(q.data)?q.data:[];
 if(state.storeId && !state.stores.some(s=>String(s.id)===String(state.storeId)))state.storeId=null;
}
async function loadRows(){
 const q=await client().rpc('get_manager_weekly_schedule',{p_store_id:state.storeId||null,p_week_start:state.week});
 if(q.error)throw q.error;
 state.rows=Array.isArray(q.data)?q.data:[];
}
function render(){
 const root=view();if(!root)return;
 ensureCss();
 const days=Array.from({length:7},(_,i)=>add(state.week,i));
 const groups=Object.fromEntries(days.map(d=>[d,[]]));
 for(const r of state.rows){const k=String(r.work_date).slice(0,10);if(groups[k])groups[k].push(r)}
 Object.values(groups).forEach(rows=>rows.sort((a,b)=>mins(a.start_time)-mins(b.start_time)||String(a.employee_name||'').localeCompare(String(b.employee_name||''),'vi')));
 const people=new Set(state.rows.map(r=>r.user_id)).size;
 const storesInRows=new Set(state.rows.map(r=>r.store_id)).size;
 root.innerHTML=`<section class="card"><div class="mos-head"><div class="mos-title"><h2>Lịch làm chính thức</h2><div class="muted" style="margin-top:5px">Chỉ hiển thị ca APPROVED từ server · không dùng dữ liệu demo</div></div><div class="mos-controls"><label class="mos-field">Chi nhánh<select id="mosStore"><option value="">Tất cả chi nhánh được phép</option>${state.stores.map(s=>`<option value="${esc(s.id)}"${String(s.id)===String(state.storeId||'')?' selected':''}>${esc(s.code)} · ${esc(s.name)}</option>`).join('')}</select></label><button class="btn" data-mos-week="prev">← Tuần trước</button><button class="btn" data-mos-week="today">Tuần này</button><button class="btn" data-mos-week="next">Tuần sau →</button><button class="btn" id="mosRefresh">↻ Tải lại</button><button class="btn primary" id="mosWorkforce">Điều phối lịch</button></div></div><div class="mos-meta"><span class="badge blue">Tuần ${esc(fmt(state.week))} – ${esc(fmt(add(state.week,6)))}</span><span class="badge green">${state.rows.length} ca APPROVED</span><span class="badge blue">${people} nhân viên</span><span class="badge blue">${storesInRows} chi nhánh có lịch</span></div><div class="mos-board">${days.map((d,i)=>`<article class="mos-day"><div class="mos-day-head"><strong>${DAYS[i]}</strong><span>${fmt(d)}</span></div>${groups[d].length?groups[d].map(r=>`<div class="mos-shift ${kind(r.start_time)}" data-schedule-id="${esc(r.schedule_id||'')}"><b>${esc(hm(r.start_time))}–${esc(hm(r.end_time))}</b><small>${esc(r.employee_name||'Nhân viên')}</small><small>${esc(r.store_code||r.store_name||'Cửa hàng')} · ${esc(r.origin||'OFFICIAL')}</small></div>`).join(''):'<div class="mos-empty">Chưa có ca APPROVED</div>'}</article>`).join('')}</div><div class="mos-note">Muốn chỉnh/phân bổ lịch mới: vào <b>Điều phối lịch</b> để tạo/chỉnh DRAFT, validate, review rồi publish. Lịch chính thức không được sửa trực tiếp từ browser.</div>${state.lastError?`<div class="mos-error">${esc(state.lastError)}</div>`:''}</section>`;
 bind();
}
function bind(){
 const root=view();if(!root)return;
 root.querySelector('#mosStore')?.addEventListener('change',async e=>{state.storeId=e.target.value||null;await refresh()});
 root.querySelectorAll('[data-mos-week]').forEach(b=>b.addEventListener('click',async()=>{const a=b.dataset.mosWeek;state.week=a==='prev'?add(state.week,-7):a==='next'?add(state.week,7):monday(new Date());await refresh()}));
 root.querySelector('#mosRefresh')?.addEventListener('click',refresh);
 root.querySelector('#mosWorkforce')?.addEventListener('click',()=>{document.querySelector('.sidebar [data-view="workforce"]')?.click();const tab=document.querySelector('#view-workforce [data-tab="review"]');document.querySelectorAll('#view-workforce [data-tab]').forEach(x=>x.classList.remove('active'));document.querySelectorAll('#view-workforce .panel').forEach(x=>x.classList.remove('active'));tab?.classList.add('active');document.querySelector('#panel-review')?.classList.add('active')});
}
async function refresh(){
 const root=view();if(!root||state.loading)return;
 state.loading=true;state.lastError=null;
 try{await loadStores();await loadRows();render()}
 catch(e){state.lastError=e?.message||e?.code||String(e);state.rows=[];render()}
 finally{state.loading=false}
}
function capture(e){
 const b=e.target.closest?.('[data-view="schedule"]');if(!b)return;
 setTimeout(refresh,0);
}
document.addEventListener('click',capture,true);
document.addEventListener('magasin:schedule-published',e=>{const detail=e.detail||{};if(detail.weekStart)state.week=String(detail.weekStart).slice(0,10);if(detail.storeId)state.storeId=detail.storeId;if(view()?.classList.contains('active'))refresh()});
document.addEventListener('magasin:shift-swap-resolved',()=>{if(view()?.classList.contains('active'))refresh()});
document.addEventListener('magasin:shift-give-resolved',()=>{if(view()?.classList.contains('active'))refresh()});
function boot(){if(view()?.classList.contains('active'))refresh()}
window.MAGASIN_MANAGER_OFFICIAL_SCHEDULE={refresh,getState:()=>({...state,stores:state.stores.map(x=>({...x})),rows:state.rows.map(x=>({...x}))})};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
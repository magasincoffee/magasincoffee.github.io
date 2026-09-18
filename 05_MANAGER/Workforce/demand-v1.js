(()=>{'use strict';
const U='https://menvbzlsncmpuvnaifxa.supabase.co',K='sb_publishable_HsvCS6HDZnCDInd9PUoh0g_V34wJVqx';
const D=['T2','T3','T4','T5','T6','T7','CN'];
const esc=v=>String(v??'').replace(/[&<>\"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[m]));
const t=v=>String(v||'').slice(0,5);
const toDate=s=>new Date(String(s).slice(0,10)+'T00:00:00Z');
const add=(s,n)=>{const d=toDate(s);d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10)};
const monday=d=>{const x=new Date(Date.UTC(d.getFullYear(),d.getMonth(),d.getDate())),day=x.getUTCDay()||7;x.setUTCDate(x.getUTCDate()-day+1);return x.toISOString().slice(0,10)};
async function boot(){
 let tries=0,panel;while(!(panel=document.querySelector('#panel-demand'))&&tries++<60)await new Promise(r=>setTimeout(r,150));
 if(!panel||!window.supabase?.createClient)return;
 const sb=window.supabase.createClient(U,K,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
 let week=monday(new Date()),storeId=null;
 const sq=await sb.rpc('get_manager_accessible_stores');const stores=sq.data||[];
 const load=async()=>{
  const q=await sb.rpc('get_workforce_staffing_requirements',{p_store_id:storeId||null,p_week_start:week});
  if(q.error){panel.innerHTML='<section class="card"><div class="muted">Không tải được nhu cầu: '+esc(q.error.message||q.error.code||'UNKNOWN')+'</div></section>';return}
  const rows=q.data||[],days=Array.from({length:7},(_,i)=>add(week,i)),map=Object.fromEntries(days.map(d=>[d,[]]));
  rows.forEach(r=>{const d=String(r.work_date).slice(0,10);if(map[d])map[d].push(r)});
  let html='<section class="card"><div class="row" style="justify-content:space-between;gap:10px;align-items:flex-start"><div><h2 style="margin:0">Nhu cầu nhân sự</h2><div class="muted" style="margin-top:5px">Nguồn server đã xác minh · Manager hiện chỉ đọc</div></div><div class="actions"><select id="mwdStore" class="btn"><option value="">Tất cả chi nhánh được phép</option>';
  for(const s of stores)html+='<option value="'+esc(s.id)+'"'+(String(s.id)===String(storeId||'')?' selected':'')+'>'+esc(s.code)+' · '+esc(s.name)+'</option>';
  html+='</select><button class="btn" data-mwd-week="prev">← Trước</button><button class="btn" data-mwd-week="today">Tuần này</button><button class="btn" data-mwd-week="next">Sau →</button><span class="badge blue">'+week+'</span></div></div>';
  html+='<div style="margin-top:12px;padding:10px 12px;border:1px solid #ead97c;background:#fff9df;border-radius:10px;color:#6c5a00;font-size:12px">Five-Step fail-closed: RPC ghi/xóa staffing demand hiện <b>OWNER_ONLY</b>. Manager không direct-write table để lách quyền.</div>';
  html+='<div class="schedule" style="margin-top:12px">';
  for(let i=0;i<days.length;i++){const d=days[i];html+='<div class="day"><h4>'+D[i]+'<span>'+d.slice(8,10)+'/'+d.slice(5,7)+'</span></h4>';if(map[d].length){for(const r of map[d])html+='<div class="shift"><b>'+t(r.start_time)+'–'+t(r.end_time)+'</b><small>'+esc(r.store_code||r.store_name||'')+' · Min '+Number(r.minimum_headcount||0)+' · Target '+Number(r.target_headcount||0)+'</small></div>'}else html+='<div class="muted" style="padding:10px">Chưa có nhu cầu</div>';html+='</div>'}
  html+='</div></section>';panel.innerHTML=html;
  panel.querySelector('#mwdStore').onchange=async e=>{storeId=e.target.value||null;await load()};
  panel.querySelectorAll('[data-mwd-week]').forEach(b=>b.onclick=async()=>{week=b.dataset.mwdWeek==='prev'?add(week,-7):b.dataset.mwdWeek==='next'?add(week,7):monday(new Date());await load()});
 };
 await load();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
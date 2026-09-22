(()=>{'use strict';
const U='https://menvbzlsncmpuvnaifxa.supabase.co',K='sb_publishable_HsvCS6HDZnCDInd9PUoh0g_V34wJVqx';
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const hm=v=>String(v||'').slice(0,5);
let sb=null,busy=false;
const client=()=>sb||(sb=window.supabase.createClient(U,K,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}}));
const view=()=>document.querySelector('#view-swap');

function swapRows(rows){
 return rows.length?rows.map(r=>`<div class="item"><div class="row" style="justify-content:space-between;gap:12px;align-items:flex-start"><div><b>${esc(r.requester_name||'Nhân viên')} ↔ ${esc(r.target_user_name||'Nhân viên')}</b><span>${esc(String(r.requester_date||''))} · ${esc(hm(r.requester_start))}–${esc(hm(r.requester_end))} ↔ ${esc(hm(r.target_start))}–${esc(hm(r.target_end))}</span><span>${esc(r.store_code||'')} · Người nhận đã đồng ý · ${esc(r.reason||'')}</span></div><div class="actions"><button class="btn js-swap-reject" data-id="${esc(r.id)}">Từ chối</button><button class="btn primary js-swap-approve" data-id="${esc(r.id)}">Duyệt đổi ca</button></div></div></div>`).join(''):'<div class="muted">Không có yêu cầu đổi ca đã được người nhận đồng ý.</div>';
}
function giveRows(rows){
 return rows.length?rows.map(r=>`<div class="item"><div class="row" style="justify-content:space-between;gap:12px;align-items:flex-start"><div><b>${esc(r.giver_name||'Nhân viên')} → ${esc(r.recipient_name||'Nhân viên')}</b><span>${esc(String(r.work_date||''))} · ${esc(hm(r.start_time))}–${esc(hm(r.end_time))}</span><span>${esc(r.store_code||'')} · Người nhận đã đồng ý · ${esc(r.reason||'')}</span></div><div class="actions"><button class="btn js-give-reject" data-id="${esc(r.id)}">Từ chối</button><button class="btn primary js-give-approve" data-id="${esc(r.id)}">Duyệt cho ca</button></div></div></div>`).join(''):'<div class="muted">Không có yêu cầu cho ca chờ quản lý.</div>';
}
function render(swaps,gives,msg=''){
 const root=view();if(!root)return;
 root.innerHTML=`<div class="row" style="justify-content:space-between;gap:12px"><div><h2 style="margin:0">Yêu cầu đổi / cho ca</h2><div class="muted" style="margin-top:5px">Manager chỉ xử lý Swap/Give sau khi người nhận đã đồng ý.</div></div><span class="badge ${swaps.length+gives.length?'red':'green'}">${swaps.length+gives.length} chờ xử lý</span></div><div id="mSwapMsg" class="muted" style="margin-top:12px">${esc(msg)}</div><section class="card" style="margin-top:16px"><h3>Đổi ca</h3><div class="list">${swapRows(swaps)}</div></section><section class="card" style="margin-top:16px"><h3>Cho ca</h3><div class="list">${giveRows(gives)}</div></section>`;
 root.querySelectorAll('.js-swap-approve').forEach(b=>b.onclick=()=>actSwap('approve_shift_swap',b.dataset.id));
 root.querySelectorAll('.js-swap-reject').forEach(b=>b.onclick=()=>actSwap('reject_shift_swap',b.dataset.id));
 root.querySelectorAll('.js-give-approve').forEach(b=>b.onclick=()=>actGive('approve_shift_give',b.dataset.id));
 root.querySelectorAll('.js-give-reject').forEach(b=>b.onclick=()=>actGive('reject_shift_give',b.dataset.id));
}
async function load(msg=''){
 if(!window.supabase?.createClient)return;
 const [swapQ,giveQ]=await Promise.all([
   client().rpc('list_shift_swap_requests_v1',{p_store_id:null,p_status:'PEER_ACCEPTED'}),
   client().rpc('list_shift_give_requests_v1',{p_store_id:null,p_status:'PENDING_MANAGER'})
 ]);
 const errors=[swapQ.error,giveQ.error].filter(Boolean);
 if(errors.length){render([],[],'Không tải được yêu cầu: '+errors.map(e=>e.message||e.code||'UNKNOWN').join(' · '));return}
 render(Array.isArray(swapQ.data)?swapQ.data:[],Array.isArray(giveQ.data)?giveQ.data:[],msg);
}
async function actSwap(fn,id){
 if(busy||!id)return;busy=true;
 try{
  const args={p_swap_id:id};
  if(fn==='reject_shift_swap')args.p_note=window.prompt('Ghi chú từ chối:')||null;
  const q=await client().rpc(fn,args);if(q.error)throw q.error;
  const status=fn==='approve_shift_swap'?'APPROVED':'REJECTED';
  document.dispatchEvent(new CustomEvent('magasin:shift-swap-resolved',{detail:{swapId:id,status,result:q.data||null}}));
  await load(status==='APPROVED'?'Đã duyệt đổi ca và cập nhật lịch atomically.':'Đã từ chối đổi ca.');
 }catch(e){await load('Xử lý đổi ca thất bại: '+(e.message||e.code||e))}
 finally{busy=false}
}
async function actGive(fn,id){
 if(busy||!id)return;busy=true;
 try{
  const args={p_give_id:id};
  if(fn==='reject_shift_give')args.p_note=window.prompt('Ghi chú từ chối:')||null;
  const q=await client().rpc(fn,args);if(q.error)throw q.error;
  const status=fn==='approve_shift_give'?'APPROVED':'REJECTED_MANAGER';
  document.dispatchEvent(new CustomEvent('magasin:shift-give-resolved',{detail:{giveId:id,status,result:q.data||null}}));
  await load(status==='APPROVED'?'Đã duyệt cho ca và chuyển lịch cho người nhận.':'Đã từ chối cho ca.');
 }catch(e){await load('Xử lý cho ca thất bại: '+(e.message||e.code||e))}
 finally{busy=false}
}
function capture(e){if(e.target.closest?.('[data-view="swap"]'))setTimeout(()=>load(),0)}
document.addEventListener('click',capture,true);
function boot(){if(view())load()}
window.MAGASIN_MANAGER_SHIFT_CHANGE={refresh:load};
window.MAGASIN_MANAGER_SWAP_APPROVAL={refresh:load};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
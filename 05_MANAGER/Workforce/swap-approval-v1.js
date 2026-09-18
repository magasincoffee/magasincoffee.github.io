(()=>{'use strict';
const U='https://menvbzlsncmpuvnaifxa.supabase.co',K='sb_publishable_HsvCS6HDZnCDInd9PUoh0g_V34wJVqx';
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const hm=v=>String(v||'').slice(0,5);
let sb=null,busy=false;
const client=()=>sb||(sb=window.supabase.createClient(U,K,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}}));
const view=()=>document.querySelector('#view-swap');
function render(rows,msg=''){
 const root=view();if(!root)return;
 root.innerHTML=`<div class="row" style="justify-content:space-between;gap:12px"><div><h2 style="margin:0">Yêu cầu đổi ca</h2><div class="muted" style="margin-top:5px">Swap trên lịch APPROVED · Manager duyệt qua server RPC</div></div><span class="badge ${rows.length?'red':'green'}">${rows.length} chờ xử lý</span></div><section class="card" style="margin-top:16px"><div id="mSwapMsg" class="muted" style="margin-bottom:10px">${esc(msg)}</div><div class="list">${rows.length?rows.map(r=>`<div class="item"><div class="row" style="justify-content:space-between;gap:12px;align-items:flex-start"><div><b>${esc(r.requester_name||'Nhân viên')} ↔ ${esc(r.target_user_name||'Nhân viên')}</b><span>${esc(String(r.requester_date||''))} · ${esc(hm(r.requester_start))}–${esc(hm(r.requester_end))} ↔ ${esc(hm(r.target_start))}–${esc(hm(r.target_end))}</span><span>${esc(r.store_code||'')} · ${esc(r.reason||'')}</span></div><div class="actions"><button class="btn js-reject" data-id="${esc(r.id)}">Từ chối</button><button class="btn primary js-approve" data-id="${esc(r.id)}">Duyệt</button></div></div></div>`).join(''):'<div class="muted">Không có yêu cầu đổi ca đang chờ.</div>'}</div></section>`;
 root.querySelectorAll('.js-approve').forEach(b=>b.onclick=()=>act('approve_shift_swap',b.dataset.id));
 root.querySelectorAll('.js-reject').forEach(b=>b.onclick=()=>act('reject_shift_swap',b.dataset.id));
}
async function load(msg=''){
 if(!window.supabase?.createClient)return;
 const q=await client().rpc('list_shift_swap_requests_v1',{p_store_id:null,p_status:'PENDING'});
 if(q.error){render([], 'Không tải được yêu cầu đổi ca: '+(q.error.message||q.error.code||'UNKNOWN'));return}
 render(Array.isArray(q.data)?q.data:[],msg);
}
async function act(fn,id){
 if(busy||!id)return;busy=true;
 try{
  const args={p_swap_id:id};
  if(fn==='reject_shift_swap')args.p_note=window.prompt('Ghi chú từ chối:')||null;
  const q=await client().rpc(fn,args);
  if(q.error)throw q.error;
  const status=fn==='approve_shift_swap'?'APPROVED':'REJECTED';
  document.dispatchEvent(new CustomEvent('magasin:shift-swap-resolved',{detail:{swapId:id,status,result:q.data||null}}));
  await load(status==='APPROVED'?'Đã duyệt và cập nhật lịch atomically.':'Đã từ chối yêu cầu.');
 }catch(e){await load('Xử lý đổi ca thất bại: '+(e.message||e.code||e))}
 finally{busy=false}
}
function capture(e){if(e.target.closest?.('[data-view="swap"]'))setTimeout(()=>load(),0)}
document.addEventListener('click',capture,true);
function boot(){if(view())load()}
window.MAGASIN_MANAGER_SWAP_APPROVAL={refresh:load};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
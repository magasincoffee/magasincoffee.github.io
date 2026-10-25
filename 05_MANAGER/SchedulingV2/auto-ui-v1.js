(()=>{'use strict';
if(window.MAGASIN_SCHEDULING_V2_AUTO_PREVIEW_ENABLED!==true||!new URLSearchParams(location.search).has('auto-preview'))return;
const host=document.querySelector('.sv2-bar'),store=document.getElementById('sv2Store'),week=document.getElementById('sv2Week'),refresh=document.getElementById('sv2Refresh');if(!host||!store||!week)return;
const monday=()=>{const d=new Date(String(week.value)+'T12:00:00');if(!Number.isFinite(d.getTime()))return '';d.setDate(d.getDate()-(d.getDay()+6)%7);return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')};
const newButton=(title,fn)=>{const b=document.createElement('button');b.textContent=title;b.type='button';b.className='sv2-action';b.addEventListener('click',fn);host.appendChild(b);return b};
const scope=()=>({storeId:store.value,weekStart:monday()});
function show(label){let overlay=document.getElementById('sv2AutoLayer');if(overlay)return;overlay=document.createElement('section');overlay.id='sv2AutoLayer';overlay.className='sv2-editor-layer';overlay.innerHTML='<div class="sv2-editor-dialog sv2-auto-dialog" role="dialog" aria-modal="true" aria-label="Đề xuất lịch theo chi nhánh"><h2>Đề xuất nhân sự</h2><p class="sv2-auto-note">Chỉ áp dụng cho chi nhánh đang chọn. Ca đề xuất V2 không còn khớp đăng ký hoặc ưu tiên chi nhánh sẽ được loại khỏi bản nháp. Ca xếp thủ công giữ nguyên.</p><p data-autostatus role="status">Đang phân tích…</p><div data-summary></div><div class="sv2-editor-actions"><button type="button" data-cancel>Đóng</button><button type="button" data-apply disabled>Áp dụng lịch đề xuất</button></div></div>';document.body.appendChild(overlay);const status=overlay.querySelector('[data-autostatus]'),summary=overlay.querySelector('[data-summary]'),apply=overlay.querySelector('[data-apply]'),close=()=>overlay.remove();overlay.querySelector('[data-cancel]').addEventListener('click',close);overlay.addEventListener('keydown',e=>{if(e.key==='Escape')close()});const start=scope(),planner=window.MAGASIN_SCHEDULING_V2_STORE_PLANNER;let proposal=null;
planner.preview(start).then(p=>{if(!overlay.isConnected)return;proposal=p;status.textContent='Thêm '+p.proposals.length+' ca; loại '+p.obsoleteAutoCount+' ca V2 tự động không còn phù hợp; còn '+p.shortages.length+' khung thiếu người.';const registration=document.createElement('p');registration.className='sv2-auto-note';registration.textContent=p.registrationOrderStatus==='VERIFIED_CREATED_AT'?'Ưu tiên Full-time trước Part-time. Trong cùng nhóm, ưu tiên đăng ký sớm nhất theo thời điểm tạo đăng ký do máy chủ xác thực. Chỉ là đề xuất nháp; quản lý kiểm tra trước khi công bố.':'Ưu tiên Full-time trước Part-time. Thứ tự đăng ký sớm nhất chưa được xác minh từ hệ thống; quản lý cần kiểm tra khi có nhiều ứng viên cùng nhóm.';const message=document.createElement('p');message.textContent=p.shortages.length?'Thiếu người chỉ là cảnh báo. Bạn vẫn có thể tạo bản nháp và phát hành sau khi qua kiểm tra bắt buộc.':'Không còn thiếu người trong các khung nhu cầu được đề xuất.';const manualWarning=document.createElement('p');manualWarning.className='sv2-auto-note';manualWarning.textContent=p.manualStoreExceptionCount>0?'Có '+p.manualStoreExceptionCount+' ca thủ công của nhân viên hiện không thuộc chi nhánh ưu tiên. Những ca này được giữ nguyên và cần quản lý xem xét.':'';summary.replaceChildren(registration,message,manualWarning);apply.disabled=!(p.proposals.length||p.obsoleteAutoCount)}).catch(e=>{status.textContent='Không tạo được đề xuất: '+String(e?.message||e)});
apply.addEventListener('click',async()=>{if(!proposal||scope().storeId!==start.storeId||scope().weekStart!==start.weekStart){status.textContent='Chi nhánh hoặc tuần đã thay đổi. Hãy mở lại đề xuất.';return}if(!window.confirm('Tính lại theo đăng ký mới nhất: loại '+proposal.obsoleteAutoCount+' ca V2 tự động không còn hợp lệ và thêm '+proposal.proposals.length+' ca đề xuất? Ca xếp thủ công được giữ nguyên, kể cả khi ưu tiên chi nhánh đã thay đổi.'))return;apply.disabled=true;try{const r=await planner.apply(proposal,{confirmed:true});status.textContent=r.saved?'Đã loại '+r.removed+' ca cũ và thêm '+r.added+' ca. '+(r.valid?'Lịch không có lỗi chặn.':'Còn lỗi cần kiểm tra.'): 'Không có thay đổi cần áp dụng.';refresh.click()}catch(e){status.textContent='Lưu đề xuất thất bại: '+String(e?.message||e)}finally{apply.disabled=false}});
}

// #533: The production automatic action is global across all four stores.
// The legacy local planner remains available ONLY to isolated QA fixtures
// where MAGASIN_SCHEDULING_GLOBAL_533_ENABLED is not enabled.
async function showGlobal(){
 const begin=scope(),overlay=document.createElement('section');
 overlay.id='sv2GlobalAuto533';overlay.className='sv2-editor-layer';
 overlay.innerHTML='<div class="sv2-editor-dialog sv2-auto-dialog" role="dialog" aria-modal="true" aria-label="Đề xuất lịch toàn bộ bốn chi nhánh"><h2>Đề xuất xếp lịch toàn hệ thống</h2><p class="sv2-auto-note">Xét cùng lúc bốn chi nhánh theo thứ tự ưu tiên FT trước PT. Lịch chỉ được tạo ở trạng thái nháp; không tự duyệt hoặc phát hành.</p><p data-global-status role="status">Đang đọc lịch nháp hiện tại…</p><div class="sv2-editor-actions"><button type="button" data-global-close>Đóng</button><button type="button" data-global-apply disabled>Tính lại lịch nháp 4 chi nhánh</button></div></div>';
 document.body.appendChild(overlay);
 const status=overlay.querySelector('[data-global-status]'),apply=overlay.querySelector('[data-global-apply]');
 const close=()=>overlay.remove();
 overlay.querySelector('[data-global-close]').addEventListener('click',close);
 overlay.addEventListener('keydown',e=>{if(e.key==='Escape')close()});
 const c=window.MAGASIN_SCHEDULING_V2_CONTEXT;
 if(!c?.client||!c?.actor){status.textContent='Chưa có phiên Manager hợp lệ.';return;}
 let snapshot=null;
 try{
  await c.actor({force:true});
  const response=await c.client().rpc('get_workforce_global_week_snapshot_533',{p_week_start:begin.weekStart});
  if(response.error)throw response.error;
  const data=response.data||{};
  if(data.revision!=='533_GLOBAL_FT8'||data.active_store_count!==4||!data.fingerprint)throw Error('GLOBAL_533_VERSION_REQUIRED');
  if(data.is_draft_only!==true||data.official_exists===true)throw Error('PUBLISHED_OR_REVIEWED_WEEK_LOCKED');
  snapshot=data;
  status.textContent='Phạm vi: cả 4 chi nhánh, tuần '+begin.weekStart+'. Có '+Number(data.v2_auto_draft_count||0)+' ca V2 tự động có thể được tính lại; '+Number(data.manual_or_unclassified_count||0)+' ca không thuộc nhóm tự động được giữ nguyên. Hệ thống đọc dữ liệu đăng ký và nhu cầu mới nhất trước khi xếp.';
  apply.disabled=false;
 }catch(e){status.textContent='Chưa thể lập lịch chung: '+String(e?.message||e);}
 apply.addEventListener('click',async()=>{
  if(!snapshot||scope().weekStart!==begin.weekStart){status.textContent='Tuần đã thay đổi; hãy mở lại đề xuất.';return;}
  const ok=window.confirm('Tính lại lịch nháp cho CẢ 4 chi nhánh theo dữ liệu mới nhất? Chỉ thay ca do hệ thống tạo. Ca thủ công và lịch đã phát hành được giữ nguyên. Bạn vẫn phải kiểm tra trước khi duyệt/phát hành.');
  if(!ok)return;
  apply.disabled=true;
  try{
   const result=await c.client().rpc('auto_generate_cross_store_schedule_533',{
    p_week_start:begin.weekStart,p_expected_fingerprint:snapshot.fingerprint,p_confirmed:true
   });
   if(result.error)throw result.error;
   const d=result.data||{};
   if(d.revision!=='533_GLOBAL_FT8'||d.published!==false)throw Error('GLOBAL_533_RESULT_INVALID');
   status.textContent='Đã tạo lịch NHÁP cho 4 chi nhánh. Đã tính lại '+Number(d.v2_auto_replaced||0)+' ca V2 tự động. Kiểm tra lịch và các cảnh báo thiếu người trước khi duyệt; không có lịch nào được tự công bố.';
   refresh?.click();
  }catch(e){status.textContent='Không lưu đề xuất: '+String(e?.message||e)+'. Không tự thử lại khi bản nháp đã thay đổi.';}
  finally{apply.disabled=false;}
 });
}
if(window.MAGASIN_SCHEDULING_GLOBAL_533_ENABLED===true){
 newButton('Đề xuất xếp lịch',()=>{if(!document.getElementById('sv2GlobalAuto533'))showGlobal()});
}else{
 newButton('Đề xuất xếp lịch',()=>show());
}

newButton('Tạo bản nháp trống',async()=>{if(!window.confirm('Tạo bản nháp trống cho chi nhánh này? Chỉ dùng khi có nhu cầu nhân sự đã cấu hình.'))return;const session=window.MAGASIN_SCHEDULING_V2_DRAFT_SESSION;try{const r=await session.create({...scope(),confirmed:true});window.alert('Đã tạo bản nháp '+r.generationId+'. Bạn có thể xếp ca sau.');refresh.click()}catch(e){window.alert('Không tạo được bản nháp: '+String(e?.message||e))}});
})();
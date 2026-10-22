(()=>{'use strict';
const core=window.MAGASIN_SCHEDULING_V2_COVERAGE_CORE;
const roster=document.querySelector('.sv2-roster'),store=document.getElementById('sv2Store'),week=document.getElementById('sv2Week');
if(!core||!roster||!store||!week||window.MAGASIN_SCHEDULING_V2_COVERAGE)return;
const inline=!!document.getElementById('sv2Table');
const panel=document.createElement('section');panel.className='sv2-coverage';panel.id='sv2Coverage';
panel.setAttribute('aria-label','Thiếu đủ dư nhân sự từng 30 phút');
panel.innerHTML='<header><div><h2>Đối chiếu nhân sự · mỗi 30 phút</h2><p>So sánh nhu cầu hiệu lực (mẫu tuần + điều chỉnh riêng tuần) với ca thuộc đúng trạng thái lịch đang xem. Không phải chấm công.</p></div><button type="button" id="sv2CoverageReload">Tải lại đối chiếu</button></header>'+
'<p id="sv2CoverageStatus" role="status" aria-live="polite">Đang chờ dữ liệu chi nhánh và tuần.</p>'+
'<div id="sv2CoverageSummary" class="sv2-coverage-summary" aria-live="polite"></div><div class="sv2-coverage-scroll"><table id="sv2CoverageTable"><thead><tr><th scope="col">Giờ</th><th scope="col">T2</th><th scope="col">T3</th><th scope="col">T4</th><th scope="col">T5</th><th scope="col">T6</th><th scope="col">T7</th><th scope="col">CN</th></tr></thead><tbody id="sv2CoverageBody"></tbody></table></div>'+
'<p class="sv2-coverage-key">Mỗi ô: <strong>đã xếp / nhu cầu</strong>. “—” = chưa cấu hình nhu cầu; “!” = các khung nhu cầu chồng nhau, cần kiểm tra. Ô ghi <strong>0/0</strong> là nhu cầu 0 được thiết lập rõ.</p>';
if(inline){
  // One actual roster table: no detached 34x7 comparison table on Scheduling.
  panel.innerHTML='<p id="sv2CoverageStatus" role="status" aria-live="polite">Đang chờ dữ liệu nhu cầu.</p>'+
    '<div id="sv2CoverageSummary" class="sv2-coverage-summary" aria-live="polite"></div>'+
    '<button type="button" id="sv2CoverageReload">Tải lại trạng thái nhân sự</button>';
  panel.classList.add('sv2-coverage-inline');
  roster.querySelector('.sv2-heading')?.append(panel);
}else roster.insertAdjacentElement('afterend',panel);
const $=id=>document.getElementById(id),status=$('sv2CoverageStatus'),
  body=inline?$('sv2Rows'):$('sv2CoverageBody'),summary=$('sv2CoverageSummary');
const clearCells=()=>{
  if(inline)body?.querySelectorAll('[data-sv2-coverage-row]').forEach(el=>el.remove());
  else body?.replaceChildren();
};
let serial=0;
const scope=()=>({storeId:store.value,weekStart:window.MAGASIN_SCHEDULING_V2_WEEK_NAV?.weekStart?.(week.value)||''});
const names={DRAFT:'Nháp',OFFICIAL:'Chính thức',NONE:'Chưa có ca'};
function reset(message){clearCells();summary.replaceChildren();status.textContent=message}
function render(result){
 clearCells();summary.replaceChildren();
 status.textContent='Đã tải · '+names[result.mode]+' · Tuần '+result.weekStart+' · Giờ Việt Nam · chỉ đọc.';
 if(!result.hasDemand){status.textContent+=' Chưa có nhu cầu được cấu hình; không thể kết luận thiếu/đủ/dư.';}
 const s=result.summary;
 for(const [label,n] of [['Thiếu',s.shortage],['Đủ',s.enough],['Dư',s.excess],['Nhu cầu chồng',s.conflict],['Chưa cấu hình',s.notConfigured]]){
  const span=document.createElement('span');span.textContent=label+': '+n;summary.append(span);
 }
 if(inline){
  // One coverage row inside the existing weekly roster: seven days, 34 half-hour
  // cells per day. Source data is calculated with the existing scoped, read-only RPCs.
  const tr=document.createElement('tr');tr.dataset.sv2CoverageRow='true';
  tr.className='sv2-roster-coverage-row';
  const label=document.createElement('th');label.scope='row';
  label.innerHTML='<strong>Nhu cầu / ca</strong><small>Từng 30 phút · 05:00–22:00</small>';
  tr.append(label);
  for(let day=0;day<7;day++){
   const td=document.createElement('td'),stack=document.createElement('div');
   stack.className='sv2-roster-coverage-slots';
   stack.setAttribute('aria-label','Nhu cầu theo từng 30 phút '+['T2','T3','T4','T5','T6','T7','CN'][day]);
   for(const slot of result.rows){
    const cell=slot.days[day],chip=document.createElement('span');
    chip.className='sv2-roster-coverage-chip';chip.dataset.coverage=cell.status;
    chip.dataset.coverageStart=slot.start;chip.dataset.coverageDay=String(day);
    const value=cell.status==='CONFLICT'?'!':cell.status==='UNCONFIGURED'?'—':cell.assigned+'/'+cell.target;
    const missing=cell.status==='SHORTAGE'?' · Thiếu '+(cell.target-cell.assigned):'';
    chip.textContent=slot.start+' '+value+missing;
    chip.title=cell.date+' '+slot.start+'–'+slot.end+' · '+cell.status+
      ' · xếp '+cell.assigned+' · nhu cầu '+(cell.target??'chưa cấu hình')+
      (cell.demandSource==='WEEK_OVERRIDE'?' · riêng tuần':'')+
      (cell.status==='SHORTAGE'?' · vị trí chưa được phân loại theo dữ liệu hiện tại':'');
    chip.setAttribute('aria-label',chip.title);
    stack.append(chip);
   }
   td.append(stack);tr.append(td);
  }
  body.prepend(tr);
  return;
 }
 const headings=$('sv2CoverageTable').querySelectorAll('thead th');
 for(let i=0;i<7;i++){const date=result.rows[0].days[i].date;headings[i+1].textContent=['T2','T3','T4','T5','T6','T7','CN'][i]+' '+date.slice(8)+'/'+date.slice(5,7)}
 for(const slot of result.rows){
  const tr=document.createElement('tr'),th=document.createElement('th');th.scope='row';th.textContent=slot.start+'–'+slot.end;tr.append(th);
  for(const cell of slot.days){
   const td=document.createElement('td');td.dataset.coverage=cell.status;
   const value=cell.status==='CONFLICT'?'!':cell.status==='UNCONFIGURED'?(cell.assigned?'?':'—'):cell.assigned+'/'+cell.target;
   td.textContent=value;
   td.title=cell.date+' '+slot.start+'–'+slot.end+' · '+cell.status+' · xếp '+cell.assigned+' · nhu cầu '+(cell.target??'chưa cấu hình')+(cell.demandSource==='WEEK_OVERRIDE'?' · điều chỉnh tuần':'');
   td.setAttribute('aria-label',td.title);
   tr.append(td);
  }
  body.append(tr);
 }
}
async function load(){
 const my=++serial,s=scope();reset(s.storeId&&s.weekStart?'Đang tải nhu cầu hiệu lực và lịch theo chi nhánh…':'Hãy chọn chi nhánh và tuần.');
 if(!s.storeId||!s.weekStart)return;
 try{
  const ctx=window.MAGASIN_SCHEDULING_V2_CONTEXT,reader=window.MAGASIN_SCHEDULING_V2_READ_ADAPTER;
  if(!ctx?.actor||!ctx?.stores||!ctx?.client||!reader?.week)throw Error('CONTEXT_NOT_READY');
  await ctx.actor({force:true});const stores=await ctx.stores({force:true});
  if(!stores.some(x=>String(x.id)===String(s.storeId)))throw Error('STORE_NOT_ALLOWED');
  const [demand,shifts]=await Promise.all([
   ctx.client().rpc('list_workforce_effective_weekly_staffing_v1',{p_store_id:s.storeId,p_week_start:s.weekStart}),
   reader.week(s.storeId,s.weekStart)
  ]);
  if(my!==serial||scope().storeId!==s.storeId||scope().weekStart!==s.weekStart)return;
  if(demand.error)throw demand.error;
  const result=core.calculate({storeId:s.storeId,weekStart:s.weekStart,demand:demand.data,shifts:shifts.rows,stage:shifts.stage});
  render(result);
 }catch(e){if(my!==serial)return;reset('Không thể đối chiếu nhân sự. Kiểm tra quyền, dữ liệu nhu cầu hoặc tải lại; không hiển thị kết quả ước đoán.');}
}
for(const select of [store,week])select.addEventListener('change',()=>{serial++;reset('Đang đổi phạm vi. Đợi lịch tuần tải xong…')});
document.addEventListener('magasin:scheduling-v2-week-loaded',load);
document.addEventListener('magasin:workforce-weekly-demand-saved',load);
$('sv2CoverageReload').addEventListener('click',load);
window.MAGASIN_SCHEDULING_V2_COVERAGE=Object.freeze({reload:load,mode:'authorized-read-only-30m'});
})();
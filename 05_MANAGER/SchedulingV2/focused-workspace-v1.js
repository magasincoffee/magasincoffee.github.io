(()=>{
'use strict';
// Presentation-only controller: existing scheduling modules retain all data and RPC authority.
const bar=document.querySelector('.sv2-bar');
const roster=document.querySelector('.sv2-roster');
if(!bar||!roster)return;
const primary=document.createElement('button');
primary.type='button';primary.className='sv2-primary-action';
primary.id='sv2PrimaryAction';
primary.textContent='Xem bảng lịch';
primary.addEventListener('click',()=>{
  const add=document.getElementById('sv2AddShift');
  if(add&&!add.disabled){add.click();return;}
  roster.scrollIntoView({behavior:'smooth',block:'start'});
  roster.querySelector('h2')?.focus({preventScroll:true});
});
const advanced=document.createElement('details');
advanced.className='sv2-advanced';
advanced.innerHTML='<summary>Công cụ nâng cao</summary><div class="sv2-advanced-content" aria-label="Công cụ xếp lịch bổ sung"></div>';
const content=advanced.querySelector('.sv2-advanced-content');
bar.append(primary,advanced);
const demand=bar.querySelector('.sv2-demand-back');
if(demand)content.appendChild(demand);
const refresh=document.getElementById('sv2Refresh');
if(refresh)content.appendChild(refresh);
const moveExtras=()=>{
  const extras=[...bar.children].filter(el=>el!==primary&&el!==advanced&&el.id!=='sv2Store'&&
    !el.matches('label,.sv2-week-picker') &&
    (el.matches('button,a')||el.classList.contains('sv2-action')));
  for(const el of extras)content.appendChild(el);
  const add=document.getElementById('sv2AddShift');
  const canAdd=!!add&&!add.disabled;
  primary.textContent=canAdd?'Xếp ca':'Xem bảng lịch';
  if(add)primary.setAttribute('aria-label',canAdd?'Mở cửa sổ xếp ca nháp':'Xem bảng lịch tuần');
};
const observer=new MutationObserver(moveExtras);
observer.observe(bar,{childList:true});
moveExtras();
document.addEventListener('magasin:scheduling-v2-week-loaded',moveExtras);
document.addEventListener('click',event=>{
  if(advanced.open&&!advanced.contains(event.target))advanced.open=false;
});
roster.querySelector('h2')?.setAttribute('tabindex','-1');

// Mockup C: roster-first tools use the already-rendered schedule. No new reads or writes.
const heading=roster.querySelector('.sv2-heading');
const scroller=roster.querySelector('.sv2-scroll');
const shiftTable=document.getElementById('sv2Table');
if(heading&&scroller&&shiftTable){
  const find=document.createElement('label');
  find.className='sv2-roster-search';
  find.innerHTML='<span>Tìm nhân viên</span><input id="sv2RosterSearch" type="search" autocomplete="off" placeholder="Nhập tên nhân viên" aria-controls="sv2Table">';
  heading.appendChild(find);
  const inspector=document.createElement('aside');
  inspector.className='sv2-shift-inspector';
  inspector.setAttribute('aria-label','Chi tiết ca làm');
  inspector.innerHTML='<h3>Chi tiết ca làm</h3><p class="sv2-inspector-hint">Chọn một ca trong bảng tuần để xem thông tin.</p><dl class="sv2-inspector-fields" hidden><div><dt>Nhân viên</dt><dd data-shift-employee></dd></div><div><dt>Ngày</dt><dd data-shift-date></dd></div><div><dt>Thời gian</dt><dd data-shift-time></dd></div><div><dt>Trạng thái</dt><dd data-shift-state></dd></div></dl><p class="sv2-inspector-note" hidden>Việc chỉnh ca và công bố lịch chỉ thực hiện qua công cụ được phân quyền.</p>';
  roster.appendChild(inspector);
  const hint=inspector.querySelector('.sv2-inspector-hint');
  const fields=inspector.querySelector('.sv2-inspector-fields');
  const note=inspector.querySelector('.sv2-inspector-note');
  const rows=()=>[...shiftTable.querySelectorAll('tbody tr')];
  const filterRows=()=>{
    const term=find.querySelector('input').value.trim().toLocaleLowerCase('vi');
    for(const row of rows()){
      // Staffing coverage is a summary row, not an employee search result.
      if(row.matches('[data-sv2-coverage-row]')){row.hidden=false;continue;}
      const name=row.querySelector('td:first-child')?.textContent||'';
      // The no-data placeholder must never disappear.
      if(row.children.length<=1)continue;
      row.hidden=!!term&&!name.toLocaleLowerCase('vi').includes(term);
    }
  };
  find.querySelector('input').addEventListener('input',filterRows);
  const resetInspector=()=>{
    hint.hidden=false;fields.hidden=true;note.hidden=true;
  };
  const describe=target=>{
    const shift=target.closest('.sv2-shift');
    if(!shift||!shiftTable.contains(shift))return;
    const row=shift.closest('tr'),cell=shift.closest('td');
    if(!row||!cell)return;
    const employee=row.querySelector('td:first-child')?.textContent?.trim()||'—';
    const day=shiftTable.querySelectorAll('thead th')[cell.cellIndex]?.textContent?.trim()||'—';
    const status=shift.classList.contains('sv2-draft')?'Bản nháp':'Đã công bố';
    const time=shift.textContent?.split('·')[0]?.trim()||'—';
    inspector.querySelector('[data-shift-employee]').textContent=employee;
    inspector.querySelector('[data-shift-date]').textContent=day;
    inspector.querySelector('[data-shift-time]').textContent=time;
    inspector.querySelector('[data-shift-state]').textContent=status;
    hint.hidden=true;fields.hidden=false;note.hidden=false;
  };
  shiftTable.addEventListener('click',event=>describe(event.target));
  shiftTable.addEventListener('focusin',event=>describe(event.target));
  document.addEventListener('magasin:scheduling-v2-week-loaded',()=>{
    filterRows();resetInspector();
  });
}
})();
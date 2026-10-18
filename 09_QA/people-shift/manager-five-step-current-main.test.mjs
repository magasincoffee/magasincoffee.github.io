import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(p,'utf8');
const source=read('05_MANAGER/Workforce/manager-five-board-v4.js');
const loader=read('05_MANAGER/Workforce/engine-v1.js');
test('five-step Manager navigation is present and preserves canonical writer',()=>{
  assert.ok(loader.includes('manager-five-board-v4.js?v=20261018-demand-settings-v1'));
  for(const step of ['Chuẩn bị','Tạo lịch nháp','Chỉnh lịch','Kiểm tra','Duyệt & phát hành'])
    assert.ok(source.includes(step),step);
  for(const protectedWriter of ['replace_schedule_generation_assignments','validate_schedule_generation_v1','review_schedule_generation','publish_schedule_generation','.from(','createClient('])
    assert.ok(!source.includes(protectedWriter),'five step presentation must not write: '+protectedWriter);
});

test('guided scheduling keeps step focus, navigation bounds and accessible state',()=>{
  assert.ok(source.includes("guide.setAttribute('role','status')"),'step guidance must be announced');
  assert.ok(source.includes("b.setAttribute('aria-current',selected?'step':'false')"),'active step must be exposed');
  assert.ok(source.includes("b.setAttribute('aria-pressed',String(selected))"),'step buttons must expose selection');
  assert.ok(source.includes("b.hidden=focused&&b.dataset.x19gBoard!==picked"),'focus mode hides other boards');
  assert.ok(source.includes("focusBtn.setAttribute('aria-pressed',String(focused))"),'focus toggle exposes state');
  assert.ok(source.includes("if(prev)prev.disabled=index<=0"),'previous disabled on first step');
  assert.ok(source.includes("if(next)next.disabled=index>=STEPS.length-1"),'next disabled on last step');
  for(const action of ['data-x19g-focus-toggle','data-x19g-prev','data-x19g-next']){
    assert.ok(source.includes(action),action+' control must exist');
  }
});

test('Staffing shortages are advisory, not a publish blocker in Manager messaging',async()=>{
 const auto=await read('05_MANAGER/Workforce/cross-store-auto-schedule-v1.js');
 assert.match(auto,/Thiếu người không chặn phát hành/);
 assert.match(auto,/cảnh báo vận hành, không chặn duyệt hay phát hành/);
 assert.doesNotMatch(auto,/Quản lý cần kiểm tra và chỉnh trước khi duyệt/);
});

test('Prepare has one guided workflow and branch-scoped, readable inputs',async()=>{
 const js=await read('05_MANAGER/Workforce/manager-five-board-v4.js');
 assert.match(js,/data-x19g-prep-stores/);
 assert.match(js,/function syncPrepareStores\(/);
 assert.match(js,/canonical\.click\(\)/);
 assert.match(js,/Khung nhu cầu của chi nhánh/);
 assert.match(js,/Lượt đăng ký thời gian trong tuần/);
 assert.match(js,/Thiếu người vẫn được tạo và phát hành lịch/);
 assert.match(js,/editorArea\.appendChild\(legacyBranches\)/);
 assert.match(js,/\.msd-summary\[aria-label="Tiến trình xếp lịch"\]\{display:none!important\}/);
 assert.doesNotMatch(js,/Nếu có mục chưa sẵn sàng, hãy hoàn tất trước khi tạo lịch/);
});

test('Prepare staffing demand preview is read-only and settings are separate',async()=>{
 const js=await read('05_MANAGER/Workforce/manager-five-board-v4.js');
 assert.match(js,/demandRow\.dataset\.x19gDemandOpen='1'/);
 assert.match(js,/data-x19g-demand-table/);
 assert.match(js,/Chỉ xem · Không thể chỉnh sửa trong Bước 1/);
 assert.match(js,/settingButton\.textContent='Cài đặt nhu cầu nhân sự'/);
 assert.match(js,/data-x19g-demand-editor/);
 assert.match(js,/if\(am\)settings\.querySelector/);
 assert.doesNotMatch(js,/data-x19g-staff='1'/);
 assert.match(js,/function demandPreview\(sh\)/);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(p,'utf8');
const source=read('05_MANAGER/Workforce/manager-five-board-v4.js');
const loader=read('05_MANAGER/Workforce/engine-v1.js');
test('five-step Manager navigation is present and preserves canonical writer',()=>{
  assert.ok(loader.includes('manager-five-board-v4.js?v=20261018-guided-v2'));
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

import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(p,'utf8');
const source=read('05_MANAGER/Workforce/manager-five-board-v4.js');
const loader=read('05_MANAGER/Workforce/engine-v1.js');
test('five-step Manager navigation is present and preserves canonical writer',()=>{
  assert.ok(loader.includes('manager-five-board-v4.js?v=20261018-five-step-v1'));
  for(const step of ['Chuẩn bị','Tạo lịch nháp','Chỉnh lịch','Kiểm tra','Duyệt & phát hành'])
    assert.ok(source.includes(step),step);
  for(const protectedWriter of ['replace_schedule_generation_assignments','validate_schedule_generation_v1','review_schedule_generation','publish_schedule_generation','.from(','createClient('])
    assert.ok(!source.includes(protectedWriter),'five step presentation must not write: '+protectedWriter);
});

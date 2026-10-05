import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read=p=>fs.readFileSync(p,"utf8");
const draft=read("05_MANAGER/Workforce/draft-publish-v1.js");
const engine=read("05_MANAGER/Workforce/engine-v1.js");
const ui=read("05_MANAGER/Workforce/manager-scheduling-ui2-v1.js");

test("XSTORE-018 exposes the three actionable supplemental employee groups",()=>{
  for(const label of ["Chưa được xếp ca nào","Còn thời gian có thể xếp","Có thể điều động thủ công"])assert.ok(draft.includes(label),label);
  assert.doesNotMatch(draft,/Nguồn tham khảo/i);
  assert.doesNotMatch(ui,/Nguồn tham khảo/i);
  assert.match(ui,/Nhân sự có thể bổ sung/);
  assert.match(draft,/function supplementalPool\(\)/);
  assert.match(draft,/assigned\.length===0&&exact/);
  assert.match(draft,/assigned\.length>0&&exact/);
});

test("XSTORE-018 computes remaining Availability after DRAFT assignments",()=>{
  assert.match(draft,/function remainingAvailability\(userId\)/);
  assert.match(draft,/segments=segments\.flatMap/);
  assert.match(draft,/userAssignments\(userId\)/);
  assert.match(draft,/source_index/);
});

test("XSTORE-018 shortage target filters exact interval and blocks known DRAFT overlap",()=>{
  assert.match(draft,/target\?hasDraftConflict\(userId,target\.work_date,target\.shortage_start,target\.shortage_end\):false/);
  assert.match(draft,/out\.blocked\.push\(entry\)/);
  assert.match(draft,/nhân viên đang có ca trùng đúng khoảng thiếu nên không thể chọn/i);
  assert.match(draft,/if\(hasDraftConflict\(userId,workDate,startTime,endTime\)\)return status/);
});

test("XSTORE-018 manual candidates remain explicit warning-path candidates",()=>{
  assert.match(draft,/manual_override:!exact/);
  assert.match(draft,/Ngoài đăng ký hiện còn/);
  assert.match(draft,/điều động thủ công/);
  assert.match(draft,/MANAGER_AVAILABILITY_OVERRIDE/);
  assert.match(draft,/replace_schedule_generation_assignments/);
});

test("XSTORE-018 pool action reuses the canonical manual picker",()=>{
  assert.match(draft,/data-msd-pool-user/);
  assert.match(draft,/function selectPoolCandidate\(userId\)/);
  assert.match(draft,/msdManualEmployee/);
  assert.match(draft,/\+ Thêm ca thủ công/);
  assert.doesNotMatch(draft,/insert\s+into\s+work_schedules/i);
});

test("XSTORE-018 cache chain points at supplemental-pool runtime",()=>{
  assert.ok(engine.includes("draft-publish-v1.js?v=20261005-xstore-018"));
  assert.ok(engine.includes("manager-scheduling-ui2-v1.js?v=20261005-xstore-018"));
});

console.log("XSTORE_018_SUPPLEMENTAL_POOL_STATIC=PASS");

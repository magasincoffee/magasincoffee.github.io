import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read=p=>fs.readFileSync(p,"utf8");
const draft=read("05_MANAGER/Workforce/draft-publish-v1.js");
const ui2=read("05_MANAGER/Workforce/manager-scheduling-ui2-v1.js");
const engine=read("05_MANAGER/Workforce/engine-v1.js");
const fixture=read("09_QA/people-shift/manager-workforce-canonical-fixture.html");

test("XSTORE-018 derives the supplemental pool from canonical four-store plan authority",()=>{
  assert.match(draft,/get_cross_store_weekly_plan_v1/);
  assert.match(draft,/weeklyPlan:\[\]/);
  assert.match(draft,/function currentWeeklyPlanRows\(\)/);
  assert.match(draft,/function remainingAvailabilityWindows\(userId\)/);
  assert.match(draft,/function subtractInterval\(/);
  assert.match(fixture,/setCrossStorePlan/);
});

test("XSTORE-018 exposes the three owner-approved actionable employee groups",()=>{
  assert.match(draft,/Chưa được xếp ca nào/);
  assert.match(draft,/Còn thời gian có thể xếp/);
  assert.match(draft,/Có thể điều động thủ công/);
  assert.match(draft,/data-msd-pool-group/);
  assert.match(draft,/data-msd-pool-user/);
  assert.doesNotMatch(ui2,/Nguồn tham khảo/);
  assert.match(ui2,/Nhóm nhân sự bổ sung/);
  assert.match(ui2,/supplemental-employee-pool/);
});

test("XSTORE-018 shortage action filters exact date/time and ranks Availability before manual override",()=>{
  assert.match(draft,/targetDate=target\?String\(target\.work_date\)/);
  assert.match(draft,/targetStart=target\?hm\(target\.shortage_start\)/);
  assert.match(draft,/targetEnd=target\?hm\(target\.shortage_end\)/);
  assert.match(draft,/Number\(Boolean\(b\.targetAvailable\)\)-Number\(Boolean\(a\.targetAvailable\)\)/);
  assert.match(draft,/XSTORE_018_SUPPLEMENT_POOL/);
  assert.match(draft,/MANAGER_AVAILABILITY_OVERRIDE/);
});

test("XSTORE-018 blocks cross-store, official and max-two hard conflicts before selection",()=>{
  assert.match(draft,/function hardConflictFor\(/);
  assert.match(draft,/CROSS_STORE_ASSIGNMENT_OVERLAP/);
  assert.match(draft,/OFFICIAL_SCHEDULE_OVERLAP/);
  assert.match(draft,/MAX_TWO_ASSIGNMENTS_PER_EMPLOYEE_DAY/);
  assert.match(draft,/disabled aria-disabled="true"/);
  assert.match(draft,/Không thể chọn do xung đột/);
  assert.match(draft,/Không thể thêm nhân viên này/);
});

test("XSTORE-018 keeps the canonical DRAFT writer and bumps runtime lineage",()=>{
  assert.match(draft,/replace_schedule_generation_assignments/);
  assert.doesNotMatch(draft,/insert\s+into\s+work_schedules/i);
  assert.ok(engine.includes("draft-publish-v1.js?v=20261007-xstore-019j-workspace2"));
  assert.ok(engine.includes("manager-scheduling-ui2-v1.js?v=20261005-xstore-019"));
});

console.log("XSTORE_018_SUPPLEMENTAL_POOL_STATIC=PASS");

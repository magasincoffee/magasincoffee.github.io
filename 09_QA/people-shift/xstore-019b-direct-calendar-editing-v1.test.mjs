import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const draft=fs.readFileSync("05_MANAGER/Workforce/draft-publish-v1.js","utf8");
const rpc=s=>[...s.matchAll(/\.rpc\(['"]([^'"]+)/g)].map(m=>m[1]);
const rpcSet=s=>[...new Set(rpc(s))].sort();

test("XSTORE-019B exposes direct create move resize delete duplicate calendar primitives",()=>{
  for(const marker of [
    "function openCalendarCreate(",
    "function commitCalendarCreate(",
    "function applyAssignmentMutation(",
    "function duplicateAssignmentDirect(",
    "function removeAssignmentDirect(",
    "function applyCalendarDrop(",
    "data-msd-slot-date",
    "data-msd-drag-index",
    "data-msd-resize-start",
    "data-msd-resize-end",
    "data-msd-duplicate",
    "data-msd-apply-edit"
  ]) assert.ok(draft.includes(marker),marker);
});

test("XSTORE-019B hard-conflict guard can exclude only the row being edited",()=>{
  assert.match(draft,/function hardConflictFor\(userId,workDate,startTime,endTime,ignoreAssignmentIndex=null\)/);
  assert.match(draft,/assignment_index:assignmentIndex/);
  assert.match(draft,/Number\(r\.assignment_index\)===Number\(ignoreAssignmentIndex\)/);
  assert.match(draft,/hardConflictFor\(next\.user_id,next\.work_date,next\.start_time,next\.end_time,i\)/);
});

test("XSTORE-019B save consumes guarded state and keeps one canonical writer",()=>{
  const save=draft.slice(draft.indexOf("async function save(){"),draft.indexOf("async function validate(){"));
  assert.doesNotMatch(save,/syncRowsFromDom\(\)/);
  assert.match(save,/state\.assignments\.map\(cleanAssignment\)/);
  assert.match(save,/replace_schedule_generation_assignments/);
  assert.deepEqual(rpcSet(draft),[
    "create_schedule_generation",
    "get_cross_store_weekly_plan_v1",
    "get_manager_weekly_availability",
    "get_manager_weekly_schedule",
    "get_schedule_generation_assignments",
    "list_cross_store_staffing_shortages_v1",
    "list_employee_workforce_profiles_v1",
    "list_schedule_generations",
    "list_workforce_recurring_staffing_requirements_v1",
    "publish_schedule_generation",
    "replace_schedule_generation_assignments",
    "review_schedule_generation",
    "validate_schedule_generation_v1"
  ]);
  assert.doesNotMatch(draft,/client\(\)\.from\(|sb\.from\(|insert\s+into\s+work_schedules/i);
});

test("XSTORE-019B keeps accessible keyboard touch fallback alongside drag gestures",()=>{
  assert.match(draft,/data-f="work_date"/);
  assert.match(draft,/data-f="start_time"/);
  assert.match(draft,/data-f="end_time"/);
  assert.match(draft,/Áp dụng chỉnh sửa/);
  assert.match(draft,/Sao chép ca/);
  assert.match(draft,/Xóa ca/);
  assert.match(draft,/@media\(max-width:700px\)[\s\S]*min-height:34px/);
});

test("XSTORE-019B preserves canonical time-band classes and availability override audit",()=>{
  assert.match(draft,/msd-band-morning/);
  assert.match(draft,/msd-band-afternoon/);
  assert.match(draft,/msd-band-evening/);
  assert.match(draft,/MANAGER_AVAILABILITY_OVERRIDE/);
  assert.match(draft,/refreshAssignmentWarning\(next\)/);
  assert.match(draft,/recalculateShortagesLocal\(\)/);
});

console.log("XSTORE_019B_DIRECT_CALENDAR_STATIC=PASS");

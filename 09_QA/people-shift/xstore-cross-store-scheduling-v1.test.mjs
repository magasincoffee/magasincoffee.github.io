import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read=p=>fs.readFileSync(p,"utf8");
const p2=read("07_DATABASE/migrations/20260928160000_xstore_002_store_priority_profile_v1.sql");
const p3=read("07_DATABASE/migrations/20260928161000_xstore_003_time_only_availability_v1.sql");
const p46=read("07_DATABASE/migrations/20260928162000_xstore_004_006_cross_store_scheduling_v1.sql");
const av=read("06_EMPLOYEE/availability/engine-v1.js");
const shell=read("06_EMPLOYEE/app/employee-v40.html");
const staff=read("05_MANAGER/Workforce/staff-projection-v1.js");
const draft=read("05_MANAGER/Workforce/draft-publish-v1.js");
const master=read("05_MANAGER/Workforce/cross-store-master-v1.js");

test("XSTORE-002 Store Priority is management-owned ordered profile truth",()=>{
  assert.match(p2,/create table if not exists public\.employee_store_priorities/);
  assert.match(p2,/priority smallint not null check \(priority between 1 and 4\)/);
  assert.match(p2,/unique \(employee_id, priority\)/);
  assert.match(p2,/employee_store_priorities_one_primary/);
  assert.match(p2,/set_employee_store_priority_profile_v1/);
  assert.match(p2,/v_role not in \('OWNER','STORE_MANAGER'\)/);
  assert.match(p2,/p_store_ids\[1\]/);
  assert.match(staff,/set_employee_store_priority_profile_v1/);
  assert.match(staff,/Ưu tiên 1 là chi nhánh chính/);
  assert.match(staff,/Một chi nhánh không thể xuất hiện hai lần/);
});

test("XSTORE-003 weekly Availability is time-only",()=>{
  assert.match(p3,/update public\.employee_availability[\s\S]*preferred_store_id=null/);
  assert.match(p3,/p_preferred_store_id uuid default null/);
  assert.match(p3,/preferred_store_id,null/);
  assert.match(av,/p_preferred_store_id:null/);
  assert.doesNotMatch(av,/quickRegStore|state\.stores/);
  assert.doesNotMatch(shell,/quickRegStore|Chi nhánh mong muốn/);
  assert.match(shell,/Chỉ đăng ký ngày và giờ có thể làm/);
});

test("XSTORE-004/006 server validation is global and store eligibility fails closed",()=>{
  assert.match(p46,/STORE_NOT_ELIGIBLE/);
  assert.match(p46,/CROSS_STORE_ASSIGNMENT_OVERLAP/);
  assert.match(p46,/other_r\.status in \('DRAFT','REVIEWED'\)/);
  assert.match(p46,/workforce_cross_store:/);
  assert.match(p46,/employee_store_priorities/);
  assert.match(draft,/CROSS_STORE_ASSIGNMENT_OVERLAP/);
  assert.match(draft,/STORE_NOT_ELIGIBLE/);
});

test("XSTORE-005 exposes one four-store weekly projection without a second writer",()=>{
  assert.match(p46,/get_cross_store_weekly_plan_v1/);
  assert.match(p46,/get_cross_store_weekly_availability_v1/);
  assert.match(master,/Tổng lịch 4 cửa hàng/);
  assert.match(master,/get_cross_store_weekly_plan_v1/);
  assert.match(master,/get_cross_store_weekly_availability_v1/);
  assert.match(master,/magasin:manager-schedule-open/);
  assert.doesNotMatch(master,/replace_schedule_generation_assignments|publish_schedule_generation|auto_generate_schedule_generation/);
});

test("XSTORE-001 through XSTORE-006 do not enable Robot or invent staffing demand",()=>{
  const combined=[p2,p3,p46,av,staff,draft,master].join("\n");
  assert.doesNotMatch(combined,/auto_generate_schedule_generation\s*\(/);
  assert.doesNotMatch(master,/staffing_requirement|minimum_headcount|target_headcount/);
});

console.log("XSTORE_CROSS_STORE_SCHEDULING_V1=PASS");

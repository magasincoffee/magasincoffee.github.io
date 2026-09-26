import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read=p=>fs.readFileSync(p,"utf8");
const app=read("06_EMPLOYEE/app/employee-v40.html");
const availability=read("06_EMPLOYEE/availability/engine-v1.js");
const swap=read("06_EMPLOYEE/swap/engine-v1.js");
const schedule=read("06_EMPLOYEE/schedule/engine-v1.js");
const runtime=read("06_EMPLOYEE/runtime/employee-runtime-v1.html");
const index=read("06_EMPLOYEE/index.html");
const css=read("02_CORE/ui/magasin-ui-v2-employee-secondary.css");
const shell=read("02_CORE/ui/magasin-ui-v2-employee-shell.js");

test("UI2-008 loads one namespaced Employee secondary presentation layer",()=>{
  assert.ok(app.includes("/02_CORE/ui/magasin-ui-v2-employee-secondary.css?v=20260926-ui2-008"));
  assert.match(css,/body\[data-magasin-employee-shell-v2\] #view-schedule/);
  assert.match(css,/body\[data-magasin-employee-shell-v2\] #view-swap/);
  assert.match(css,/min-height:\s*44px/);
  assert.match(css,/:focus-visible/);
  assert.match(css,/@media \(max-width:760px\)/);
  assert.match(css,/@media \(max-width:430px\)/);
  assert.match(css,/safe-area-inset-bottom/);
  assert.doesNotMatch(css,/(^|\n)\s*:root\s*\{/m);
});

test("Availability is secondary under Schedule and exposes explicit V2 states",()=>{
  const scheduleIndex=app.indexOf('id="view-schedule"');
  const availabilityIndex=app.indexOf('id="weeklyRegistrationPanel"');
  const dashboardEnd=app.indexOf('id="view-schedule"');
  assert.ok(scheduleIndex>=0&&availabilityIndex>scheduleIndex);
  assert.ok(!app.slice(0,dashboardEnd).includes('id="weeklyRegistrationPanel"'));
  for(const marker of [
    'id="availabilityWeekLabel"',
    'id="availabilityPolicyLabel"',
    'data-availability-state="idle"',
    'data-availability-retry',
    "setUiState('loading'",
    "setUiState('submitting'",
    "setUiState('success'",
    "setUiState('error'",
    "setUiState('readonly'"
  ]) assert.ok(app.includes(marker)||availability.includes(marker),marker);
  assert.match(schedule,/showView\?\.\('schedule'\)/);
  assert.doesNotMatch(schedule,/openAvailability\(\)[\s\S]{0,160}showView\?\.\('dashboard'\)/);
});

test("Availability keeps exact canonical RPC boundary and no direct DML",()=>{
  const names=[...availability.matchAll(/\.rpc\(['"]([^'"]+)/g)].map(m=>m[1]);
  assert.deepEqual(names,["get_my_availability","save_my_availability","delete_my_availability"]);
  assert.doesNotMatch(availability,/C\.supabase\.from|createClient\(|\.from\(['\"](?:employee_availability|work_schedules|shift_swaps|shift_gives)['\"]\)/);
  assert.match(availability,/p_availability_id:null/);
  assert.match(availability,/p_availability_type:'AVAILABLE'/);
  assert.match(availability,/p_preferred_store_id:target\.id/);
  assert.match(availability,/p_note:null/);
});

test("Swap Give retains canonical handlers RPC names and state-machine statuses",()=>{
  for(const name of [
    "list_my_approved_schedules_v2",
    "list_shift_swap_candidates_v1",
    "list_shift_give_candidates_v1",
    "submit_shift_swap_request",
    "submit_shift_give_request",
    "respond_shift_swap_request",
    "respond_shift_give_request",
    "list_my_shift_swaps_v2",
    "list_my_incoming_shift_swaps_v1",
    "list_my_shift_gives_v1"
  ]) assert.ok(swap.includes(name),name);
  for(const status of ["PENDING_RECIPIENT","PENDING_MANAGER","APPROVED","REJECTED_RECIPIENT","REJECTED_MANAGER","PENDING","PEER_ACCEPTED","REJECTED","CANCELLED"])assert.ok(swap.includes(status),status);
  assert.doesNotMatch(swap,/C\.supabase\.from|createClient\(|\.from\(['\"](?:employee_availability|work_schedules|shift_swaps|shift_gives)['\"]\)/);
  assert.match(swap,/p_requester_schedule_id:req\.value,p_target_schedule_id:target\.value,p_reason:reasonText/);
  assert.match(swap,/p_schedule_id:req\.value,p_recipient_user_id:target\.value,p_reason:reasonText/);
  assert.match(swap,/p_swap_id:id,p_accept:!!accept/);
  assert.match(swap,/p_give_id:id,p_accept:!!accept/);
});

test("Swap Give V2 shows canonical shift identity eligibility history incoming and retry states",()=>{
  for(const marker of [
    "swapShiftSummary",
    "data-swap-ui-state",
    "data-swap-eligibility",
    "data-swap-retry",
    "employee-swap-ui-state",
    "renderSelectedShift",
    "setEligibility(state.candidates.length?'eligible':'ineligible')",
    "setEligibility('ineligible')",
    "state.incomingSwaps",
    "state.giveHistory",
    "state.swapHistory"
  ]) assert.ok(app.includes(marker)||swap.includes(marker),marker);
  assert.match(swap,/statusLabel\(row\.status\|\|'APPROVED'\)/);
  assert.match(swap,/Ca này không còn thuộc lịch chính thức của bạn/);
});

test("UI2-007 Schedule delegation stays canonical while Availability routing remains under Schedule",()=>{
  assert.match(schedule,/attendance\?\.openSchedule\?\./);
  assert.match(schedule,/api\?\.openGive\?\./);
  assert.match(schedule,/api\?\.openSwap\?\./);
  assert.match(schedule,/globalThis\.MAGASIN_EMPLOYEE\?\.availability\?\.open\?\.\(\)/);
  const scheduleRpcs=[...schedule.matchAll(/\.rpc\(['"]([^'"]+)/g)].map(m=>m[1]);
  assert.deepEqual(scheduleRpcs,["list_my_approved_schedules_v2"]);
  assert.doesNotMatch(schedule,/\.from\(|createClient\(/);
});

test("UI2-005 shell UI2-006 Today UI2-007 Schedule remain present and runtime cache advances only",()=>{
  for(const label of ["Hôm nay","Lịch","Công","Lương","Tôi"])assert.ok(shell.includes("'"+label+"'"));
  assert.ok(app.includes("/02_CORE/ui/magasin-ui-v2-employee-today.css?v=20260925-ui2-006"));
  assert.ok(app.includes("/02_CORE/ui/magasin-ui-v2-employee-schedule.css?v=20260926-ui2-007"));
  assert.match(runtime,/employee-v40\.html\?ui=v45-ui2-008&runtime=engine/);
  assert.match(runtime,/schedule\/engine-v1\.js\?v=20260926-ui2-008/);
  assert.match(runtime,/availability\/engine-v1\.js\?v=20260926-ui2-008/);
  assert.match(runtime,/swap\/engine-v1\.js\?v=20260926-ui2-008/);
  assert.match(index,/employee-runtime-v1\.html\?v=20260926-ui2-008/);
});

console.log("UI2_008_EMPLOYEE_SECONDARY_CONTRACT=PASS");

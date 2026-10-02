import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read=p=>fs.readFileSync(p,"utf8");
const swap=read("05_MANAGER/Workforce/swap-approval-v1.js");
const attendance=read("05_MANAGER/Workforce/attendance-review-v1.js");
const staff=read("05_MANAGER/Workforce/staff-projection-v1.js");
const payroll=read("05_MANAGER/Workforce/payroll-self-check-v1.js");
const ui=read("05_MANAGER/Workforce/manager-operations-ui2-v1.js");
const today=read("05_MANAGER/Workforce/ui-consolidation-v1.js");
const engine=read("05_MANAGER/Workforce/engine-v1.js");
const runtime=read("05_MANAGER/runtime/manager-runtime-v1.html");
const managerIndex=read("05_MANAGER/index.html");
const workforceIndex=read("05_MANAGER/Workforce/index.html");
const legacySchedule=read("05_MANAGER/Lich-lam/index.html");
const ownerRuntime=read("04_OWNER/Workforce/runtime/owner-workforce-runtime.html");
const gate=read("09_QA/people-shift/browser-e2e.mjs");
const rpc=s=>[...s.matchAll(/\.rpc\(['"]([^'"]+)/g)].map(m=>m[1]);
const set=s=>[...new Set(rpc(s))].sort();

test("UI2-013 shared Manager presentation layer is read-only glue over exactly four existing module APIs",()=>{
 for(const selector of ["#view-swap","#view-attendance","#view-staff","#view-payroll-self-check"])assert.ok(ui.includes(selector),selector);
 for(const api of ["MAGASIN_MANAGER_SHIFT_CHANGE","MAGASIN_MANAGER_ATTENDANCE_REVIEW","MAGASIN_MANAGER_STAFF_PROJECTION","MAGASIN_MANAGER_PAYROLL_SELF_CHECK"])assert.ok(ui.includes(api),api);
 for(const state of ["LOADING","ERROR","EMPTY","READY","ACTION_REQUIRED"])assert.ok(ui.includes(state),state);
 assert.equal(rpc(ui).length,0);
 assert.doesNotMatch(ui,/createClient\s*\(|\.from\s*\(|\.(?:insert|update|delete|upsert)\s*\(/);
 assert.doesNotMatch(ownerRuntime,/manager-operations-ui2-v1/);
});

test("UI2-013 Swap Give preserves peer/recipient gates and existing approve reject RPC delegation",()=>{
 assert.deepEqual(set(swap),["list_shift_give_requests_v1","list_shift_swap_requests_v1"]);
 assert.match(swap,/p_status:'PEER_ACCEPTED'/);
 assert.match(swap,/p_status:'PENDING_MANAGER'/);
 for(const action of ["approve_shift_swap","reject_shift_swap","approve_shift_give","reject_shift_give"])assert.ok(swap.includes(action),action);
 assert.match(swap,/if\(fn==='reject_shift_swap'\).*p_note/s);
 assert.match(swap,/if\(fn==='reject_shift_give'\).*p_note/s);
 assert.match(swap,/state\.loading=true;state\.error=null;render/);
 assert.doesNotMatch(swap,/\.from\s*\(/);
});

test("UI2-013 Attendance keeps canonical reader review state machine and explicit APPROVE ADJUST REJECT controls",()=>{
 assert.deepEqual(set(attendance),["list_manager_attendance_review_v1","review_attendance_v1"].sort());
 for(const decision of ["APPROVE","ADJUST","REJECT"])assert.match(attendance,new RegExp('data-review="'+decision+'"'));
 assert.match(attendance,/\['NORMAL','NEEDS_REVIEW'\]/);
 assert.match(attendance,/p_confirmed_start:null,p_confirmed_end:null/);
 assert.match(attendance,/if\(decision==='ADJUST'\)/);
 assert.match(attendance,/ATTENDANCE_ALREADY_REVIEWED\|ATTENDANCE_REVIEW_STATE_NOT_ALLOWED\|ATTENDANCE_REVIEW_SCHEDULE/);
 assert.doesNotMatch(attendance,/\.from\(['"]attendance['"]\)|\.from\(['"]work_schedules['"]\)/);
});

test("UI2-013 Employees remains RPC-only while XSTORE adds bounded management-owned Store Priority writer",()=>{
 assert.deepEqual(set(staff),["list_employee_workforce_profiles_v1","set_employee_store_priority_profile_v1"].sort());
 for(const field of ["full_name","username","phone","profile_status","priority_store_codes"])assert.ok(staff.includes(field),field);
 assert.match(staff,/Ưu tiên 1 là chi nhánh chính/);
 assert.doesNotMatch(staff,/\.from\s*\(|\.insert\s*\(|\.update\s*\(|\.delete\s*\(|save_employee|update_employee/i);
});

test("UI2-013 Payroll remains read-only scoped projection without monetary or transition authority",()=>{
 assert.deepEqual(set(payroll),["list_scoped_payroll_self_check_v1"].sort());
 assert.match(payroll,/loading:state\.loading/);
 assert.match(payroll,/confirmed_work_minutes/);
 assert.match(payroll,/confirmed_work_item_count/);
 assert.match(payroll,/PAYROLL_REVIEW và mọi state transition vẫn yêu cầu explicit permission riêng/);
 assert.doesNotMatch(payroll,/review_payroll|finalize_payroll|mark_payroll_paid|PAYROLL_AUTHORIZED|\.from\s*\(/i);
});

test("UI2-013 responsive presentation contract is operations-first and touch keyboard safe",()=>{
 assert.match(ui,/mui2-module-head/);
 assert.match(ui,/mui2-module-controls/);
 assert.match(ui,/mui2-state-banner/);
 assert.match(ui,/mui2-table-region/);
 assert.match(ui,/overflow-x:auto/);
 assert.match(ui,/overscroll-behavior-x:contain/);
 assert.match(ui,/@media\(max-width:1024px\)/);
 assert.match(ui,/@media\(max-width:520px\)/);
 assert.match(ui,/min-height:44px!important/);
 assert.match(ui,/:focus-visible/);
 assert.match(ui,/outline:2px solid/);
});

test("UI2-013 preserves Today getState compatibility and does not redesign scheduling",()=>{
 for(const api of ["MAGASIN_MANAGER_SHIFT_CHANGE","MAGASIN_MANAGER_ATTENDANCE_REVIEW","MAGASIN_MANAGER_STAFF_PROJECTION","MAGASIN_MANAGER_PAYROLL_SELF_CHECK"])assert.ok(today.includes(api),api);
 for(const source of [swap,attendance,staff,payroll])assert.match(source,/getState:/);
 assert.match(engine,/manager-scheduling-ui2-v1\.js\?v=(?:20260927-ui2-016|20261001-ui-unified1)/);
 assert.doesNotMatch(ui,/msd-ui2-012|Bảng nháp 7 ngày|publish_schedule_generation/);
});

test("UI2-013 complete Manager cache chain loads changed assets while Owner path stays untouched",()=>{
 const v="20260927-ui2-013";
 const entryV="20261002-sched-ui-003";
 assert.match(engine,/swap-approval-v1\.js\?v=20260929-mer003/);
 assert.match(engine,/payroll-self-check-v1\.js\?v=20260929-mer003/);
 assert.match(engine,/manager-operations-ui2-v1\.js\?v=20260927-ui2-016/);
 assert.ok(runtime.includes("engine-v1.js?v="+entryV));
 assert.ok(managerIndex.includes("manager-runtime-v1.html?v="+entryV));
 assert.ok(workforceIndex.includes("manager-runtime-v1.html?v="+entryV));
 assert.ok(legacySchedule.includes("manager-runtime-v1.html?v="+entryV+"#workforce"));
 assert.doesNotMatch(ownerRuntime,new RegExp(v));
});

test("UI2-013 bounded browser gate is integrated into People Shift Day-10 aggregate",()=>{
 assert.match(gate,/ui2-013-manager-operations-browser\.mjs/);
});

console.log("UI2_013_MANAGER_OPERATIONS_CONTRACT=PASS");

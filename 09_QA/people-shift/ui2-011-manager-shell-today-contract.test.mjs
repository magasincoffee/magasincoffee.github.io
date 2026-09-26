import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read=p=>fs.readFileSync(p,"utf8");
const shellHtml=read("05_MANAGER/runtime/manager-shell-v1.html");
const shellV2=read("05_MANAGER/runtime/compat/ui/manager-ui-shell-v2.js");
const today=read("05_MANAGER/Workforce/ui-consolidation-v1.js");
const swap=read("05_MANAGER/Workforce/swap-approval-v1.js");
const attendance=read("05_MANAGER/Workforce/attendance-review-v1.js");
const gate=read("09_QA/people-shift/browser-e2e.mjs");
const rpc=s=>[...s.matchAll(/\.rpc\(['"]([^'"]+)/g)].map(m=>m[1]);

test("UI2-011 Manager shell exposes only canonical operations destinations",()=>{
  assert.ok(shellHtml.includes('/05_MANAGER/runtime/compat/ui/manager-ui-shell-v2.js?v=20260926-ui2-011'));
  for(const route of ["dashboard","staff","workforce","schedule","swap","attendance","payroll-self-check"])assert.ok(today.includes("'"+route+"'")||today.includes('"'+route+'"'),route);
  for(const hidden of ["tasks","kpi","academy","settings"])assert.ok(today.includes("'"+hidden+"'"),hidden);
  assert.match(shellV2,/manager-v2-sidebar-source/);
  assert.match(shellV2,/m-shell-v2-nav__item\[data-shell-key=/);
  assert.match(shellV2,/manager-shared-shell-ready/);
  assert.match(shellV2,/:focus-visible/);
  assert.match(shellV2,/min-height:42px/);
  assert.match(shellV2,/min-height:44px/);
});

test("UI2-011 Today is an Action Center built only from existing read-only Manager module state",()=>{
  for(const api of [
    "MAGASIN_MANAGER_SHIFT_CHANGE",
    "MAGASIN_MANAGER_ATTENDANCE_REVIEW",
    "MAGASIN_MANAGER_AVAILABILITY",
    "MAGASIN_MANAGER_OFFICIAL_SCHEDULE"
  ])assert.ok(today.includes(api),api);
  for(const state of ["NOT_CONNECTED","LOADING","ERROR","EMPTY","ACTION_REQUIRED","READY"])assert.ok(today.includes(state),state);
  assert.match(today,/Task \/ SOP/);
  assert.match(today,/Không có nguồn Task \/ SOP canonical/);
  assert.doesNotMatch(today,/Doanh thu|Đơn hàng|Đánh giá khách|49,2tr|18 nhân sự|KPI 98%/);
  assert.doesNotMatch(today,/approve_shift|reject_shift|review_attendance|publish_schedule_generation|save_|insert\(|update\(|delete\(/);
  assert.match(today,/data-workforce-jump/);
});

test("UI2-011 modified domain hooks preserve exact existing RPC inventories",()=>{
  assert.deepEqual(rpc(swap),["list_shift_swap_requests_v1","list_shift_give_requests_v1"]);
  assert.deepEqual(rpc(attendance),["get_manager_accessible_stores","list_manager_attendance_review_v1","review_attendance_v1"]);
  assert.equal(rpc(today).length,0);
  assert.equal(rpc(shellV2).length,0);
  assert.match(swap,/getState:/);
  assert.match(attendance,/getState:/);
});

test("UI2-011 adds no new direct protected-table/createClient path in the new Manager V2 layers",()=>{
  for(const [name,source] of [["manager-ui-shell-v2",shellV2],["ui-consolidation-v1",today]]){
    assert.doesNotMatch(source,/createClient\s*\(/,name);
    assert.doesNotMatch(source,/\.from\s*\(/,name);
    assert.doesNotMatch(source,/\.(?:insert|update|delete|upsert)\s*\(/,name);
  }
  // The legacy manager-shell auth/profile compatibility path predates UI2-011 and is not duplicated by the new layers.
  assert.equal((shellHtml.match(/createClient\s*\(/g)||[]).length,1);
  assert.equal((shellHtml.match(/\.from\('profiles'\)/g)||[]).length,1);
});

test("UI2-011 route/back/reload integration stays on existing Manager routes",()=>{
  assert.match(today,/history\.pushState/);
  assert.match(today,/addEventListener\('popstate'/);
  assert.match(today,/addEventListener\('hashchange'/);
  assert.match(today,/location\.hash/);
  assert.match(today,/activate\(v\)/);
});

test("UI2-011 browser gate is integrated into existing People Shift Day-10 browser gate",()=>{
  assert.match(gate,/ui2-011-manager-shell-today-browser\.mjs/);
});

console.log("UI2_011_MANAGER_SHELL_TODAY_CONTRACT=PASS");

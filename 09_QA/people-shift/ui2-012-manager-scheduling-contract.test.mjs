import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read=p=>fs.readFileSync(p,"utf8");
const draft=read("05_MANAGER/Workforce/draft-publish-v1.js");
const ui=read("05_MANAGER/Workforce/manager-scheduling-ui2-v1.js");
const engine=read("05_MANAGER/Workforce/engine-v1.js");
const runtime=read("05_MANAGER/runtime/manager-runtime-v1.html");
const managerIndex=read("05_MANAGER/index.html");
const workforceIndex=read("05_MANAGER/Workforce/index.html");
const legacySchedule=read("05_MANAGER/Lich-lam/index.html");
const ownerRuntime=read("04_OWNER/Workforce/runtime/owner-workforce-runtime.html");
const gate=read("09_QA/people-shift/browser-e2e.mjs");
const rpc=s=>[...s.matchAll(/\.rpc\(['"]([^'"]+)/g)].map(m=>m[1]);
const rpcSet=s=>[...new Set(rpc(s))].sort();

test("UI2-012 presentation layer is shared by Manager and Owner over the existing canonical scheduling writer",()=>{
  assert.match(engine,/draft-publish-v1\.js\?v=(?:20260924-sched05|20260928-xstore005|20260929-xstore-livefix1|20260929-mer003|20261001-ui-unified1|20261002-sched-ui-005|20261004-xstore-012|20261004-xstore-015|20261004-xstore-016|20261005-xstore-017|20261005-xstore-018|20261005-xstore-019|20261007-xstore-019j-workspace2|20261007-xstore-019j-cluster1)/);
  assert.match(engine,/manager-scheduling-ui2-v1\.js\?v=(?:20260927-ui2-016|20261001-ui-unified1|20261002-sched-ui-003|20261002-sched-ui-004|20261004-xstore-016|20261005-xstore-018|20261005-xstore-019)/);
  assert.match(ui,/data-scheduling-actor="MANAGER"[\s\S]*data-scheduling-actor="OWNER"/);
  assert.match(ui,/dataset\.ui2ScheduleBoard='1'/);
  assert.match(ui,/classList\.add\('msd-ui2-012'\)/);
  assert.match(ui,/data-scheduling-actor="OWNER"/);
  assert.doesNotMatch(ui,/\.rpc\(/);
  assert.equal(rpc(ui).length,0);
  assert.doesNotMatch(ui,/createClient\s*\(|\.from\s*\(|\.(?:insert|update|delete|upsert)\s*\(/);
  assert.match(ownerRuntime,/manager-scheduling-ui2-v1/);
  assert.match(ownerRuntime,/__MAGASIN_SCHEDULING_ACTOR__='OWNER'/);
});

test("UI2-012 preserves the canonical Manager scheduling RPC inventory and writer boundaries",()=>{
  assert.match(draft,/MAGASIN_MANAGER_WORKFORCE_CONTEXT/);
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
  assert.doesNotMatch(draft,/auto_generate_schedule_generation|get_workforce_staffing_requirements/);
  assert.doesNotMatch(draft,/client\(\)\.from\(|sb\.from\(|supabase[^\n]*\.from\(/);
  assert.match(draft,/p_algorithm_version:'MANAGER_DIRECT_V1'/);
  assert.match(draft,/targetWeek\(\)/);
  assert.match(draft,/timeZone:'Asia\/Ho_Chi_Minh'/);
});

test("UI2-012 hierarchy keeps global week context and branch-local authoring progression explicit",()=>{
  for(const token of [
    "Tuần vận hành · Asia/Ho_Chi_Minh",
    "Nhóm nhân sự bổ sung",
    "Lịch nháp đang chỉnh",
    "Bước cuối · duyệt và phát hành"
  ])assert.ok(ui.includes(token),token);
  for(const id of ["msdStart","msdReload","msdSave","msdValidate","msdReview","msdPublish"])assert.ok(ui.includes(id),id);
  assert.doesNotMatch(draft,/id="msdStore"/);
  assert.match(draft,/data-msd-branch/);
  assert.match(draft,/msd-global-overview/);
  assert.match(ui,/Bảng lịch nháp 7 ngày; có thể cuộn ngang ở màn hình hẹp/);
  assert.doesNotMatch(ui,/msu2-stage-rail/);
  assert.match(ui,/magasin:manager-scheduling-ui-state/);
  assert.match(ui,/msu2-state-banner/);
  assert.match(ui,/Nhóm nhân sự bổ sung/);
  assert.match(ui,/Lịch nháp đang chỉnh/);
  assert.match(ui,/Bước cuối · duyệt và phát hành/);
  assert.match(ui,/msu2-conflict-resolution/);
});

test("UI2-012 explicitly represents NONE DRAFT REVIEWED PUBLISHED CONFLICT and busy states",()=>{
  for(const state of ["NONE","DRAFT","REVIEWED","PUBLISHED","CONFLICT"])assert.ok(ui.includes(state),state);
  for(const copy of [
    "Chưa có lịch nháp",
    "Đang soạn lịch tuần",
    "Đã duyệt · chờ phát hành",
    "Đã phát hành",
    "Có nhiều bản nháp cùng cửa hàng và tuần",
    "Đang cập nhật dữ liệu"
  ])assert.ok(ui.includes(copy),copy);
  assert.match(ui,/if\(stage==='CONFLICT'\)/);
  assert.match(ui,/el\.disabled=true/);
});

test("UI2-012 responsive contract follows approved narrow one-day calendar without page overflow",()=>{
  const board=read("05_MANAGER/Workforce/manager-five-board-v4.js");
  assert.match(board,/syncDayWindow/);
  assert.match(board,/data-x19g-active-day/);
  assert.match(board,/overflow-x:hidden!important/);
  assert.match(board,/grid-template-columns:repeat\(7,minmax\(0,1fr\)\)!important/);
  assert.match(ui,/:focus-visible/);
  assert.match(ui,/outline:2px solid/);
});

test("UI2-012 presentation is shared while Owner and Manager retain the canonical XSTORE-019 writer",()=>{
  const managerV="20261005-xstore-019";
  const managerEntryV="20261009-xstore-019j-compact3";
  assert.ok(runtime.includes("engine-v1.js?v="+managerEntryV));
  assert.ok(managerIndex.includes("manager-runtime-v1.html?v="+managerEntryV));
  assert.ok(workforceIndex.includes("manager-runtime-v1.html?v="+managerEntryV));
  assert.ok(legacySchedule.includes("manager-runtime-v1.html?v="+managerEntryV+"#workforce"));
  assert.match(engine,/manager-scheduling-ui2-v1\.js\?v=(?:20260927-ui2-016|20261001-ui-unified1|20261002-sched-ui-003|20261002-sched-ui-004|20261004-xstore-016|20261005-xstore-018|20261005-xstore-019)/);
  assert.ok(ownerRuntime.includes("/05_MANAGER/Workforce/draft-publish-v1.js?v="+managerV));
  assert.match(ownerRuntime,/\/05_MANAGER\/Workforce\/manager-scheduling-ui2-v1\.js\?v=20261006-xstore-019e/);
});

test("UI2-012 bounded browser gate is integrated into the existing People Shift Day-10 gate",()=>{
  assert.match(gate,/ui2-012-manager-scheduling-browser\.mjs/);
});

console.log("UI2_012_MANAGER_SCHEDULING_CONTRACT=PASS");

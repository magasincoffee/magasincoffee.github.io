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

test("UI2-012 is a Manager-only presentation layer over the existing canonical scheduling writer",()=>{
  assert.match(engine,/draft-publish-v1\.js\?v=(?:20260924-sched05|20260928-xstore005|20260929-xstore-livefix1|20260929-mer003|20261001-ui-unified1|20261002-sched-ui-005|20261004-xstore-012|20261004-xstore-015|20261004-xstore-016)/);
  assert.match(engine,/manager-scheduling-ui2-v1\.js\?v=(?:20260927-ui2-016|20261001-ui-unified1|20261002-sched-ui-003|20261002-sched-ui-004|20261004-xstore-016)/);
  assert.match(ui,/\.msd\[data-scheduling-actor="MANAGER"\]/);
  assert.match(ui,/dataset\.ui2ScheduleBoard='1'/);
  assert.match(ui,/classList\.add\('msd-ui2-012'\)/);
  assert.doesNotMatch(ui,/OWNER|Owner Scheduling|enterprise oversight/i);
  assert.equal(rpc(ui).length,0);
  assert.doesNotMatch(ui,/createClient\s*\(|\.from\s*\(|\.(?:insert|update|delete|upsert)\s*\(/);
  assert.doesNotMatch(ownerRuntime,/manager-scheduling-ui2-v1/);
});

test("UI2-012 preserves the canonical Manager scheduling RPC inventory and writer boundaries",()=>{
  assert.match(draft,/MAGASIN_MANAGER_WORKFORCE_CONTEXT/);
  assert.deepEqual(rpcSet(draft),[
    "create_schedule_generation",
    "get_manager_weekly_availability",
    "get_manager_weekly_schedule",
    "get_schedule_generation_assignments",
    "list_employee_workforce_profiles_v1",
    "list_schedule_generations",
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
    "Nguồn tham khảo",
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
  assert.match(ui,/Nguồn tham khảo/);
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

test("UI2-012 responsive contract keeps tablet board scroll and stacks phone draft days",()=>{
  assert.match(ui,/@media\(max-width:1100px\)/);
  assert.match(ui,/@media\(max-width:1024px\)/);
  assert.match(ui,/@media\(max-width:600px\)/);
  assert.match(ui,/min-height:44px/);
  assert.match(ui,/overflow-x:auto/);
  assert.match(ui,/overscroll-behavior-x:contain/);
  assert.match(ui,/@media\(max-width:600px\)[\s\S]*\.msd-ui2-012 \.msd-board-wrap\{overflow:visible;scrollbar-gutter:auto\}/);
  assert.match(ui,/@media\(max-width:600px\)[\s\S]*\.msd-ui2-012 \.msd-board\{grid-template-columns:1fr;min-width:0;width:100%;gap:10px\}/);
  assert.match(ui,/@media\(max-width:600px\)[\s\S]*\.msd-ui2-012 \.msd-day-title\{position:static\}/);
  assert.match(ui,/:focus-visible/);
  assert.match(ui,/outline:2px solid/);
});

test("UI2-012 Manager asset cache chain advances while Owner runtime remains on its existing path",()=>{
  const v="20260927-ui2-012";
  const managerV="20261003-sched-ui-017";
  const managerEntryV="20261003-sched-ui-017";
  assert.ok(runtime.includes("engine-v1.js?v="+managerV));
  assert.ok(managerIndex.includes("manager-runtime-v1.html?v="+managerEntryV));
  assert.ok(workforceIndex.includes("manager-runtime-v1.html?v="+managerV));
  assert.ok(legacySchedule.includes("manager-runtime-v1.html?v="+managerV+"#workforce"));
  assert.match(engine,/manager-scheduling-ui2-v1\.js\?v=(?:20260927-ui2-016|20261001-ui-unified1|20261002-sched-ui-003|20261002-sched-ui-004|20261004-xstore-016)/);
  assert.doesNotMatch(ownerRuntime,new RegExp(managerV));
});

test("UI2-012 bounded browser gate is integrated into the existing People Shift Day-10 gate",()=>{
  assert.match(gate,/ui2-012-manager-scheduling-browser\.mjs/);
});

console.log("UI2_012_MANAGER_SCHEDULING_CONTRACT=PASS");

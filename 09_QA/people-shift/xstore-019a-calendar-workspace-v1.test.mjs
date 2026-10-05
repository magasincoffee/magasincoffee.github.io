import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read=p=>fs.readFileSync(p,"utf8");
const draft=read("05_MANAGER/Workforce/draft-publish-v1.js");
const ui=read("05_MANAGER/Workforce/manager-scheduling-ui2-v1.js");

const rpc=s=>[...s.matchAll(/\.rpc\(['"]([^'"]+)/g)].map(m=>m[1]);
const rpcSet=s=>[...new Set(rpc(s))].sort();

test("XSTORE-019A renders one selected-store calendar workspace instead of accordion editors",()=>{
  assert.match(draft,/function storeSwitcherHtml\(\)/);
  assert.match(draft,/function singleStoreWorkspaceHtml\(/);
  assert.match(draft,/msd-store-switcher/);
  assert.match(draft,/data-msd-active-store/);
  assert.match(draft,/msd-calendar-primary/);
  assert.doesNotMatch(draft,/function branchRowsHtml\(/);
  assert.doesNotMatch(draft,/id="msdStore"/);
});

test("XSTORE-019A keeps all seven days visible in the primary calendar and confines scrolling",()=>{
  assert.match(draft,/grid-template-columns:repeat\(7,minmax\(0,1fr\)\)/);
  assert.match(draft,/max-height:calc\(100vh - 330px\)/);
  assert.match(draft,/\.msd-calendar-primary \.msd-board-wrap\{[^}]*overflow:auto/);
  assert.match(ui,/\.msd-ui2-012 \.msd-board-wrap\{overflow:auto;overscroll-behavior:contain/);
  assert.match(ui,/@media\(max-width:600px\)[\s\S]*grid-template-columns:repeat\(7,minmax\(150px,1fr\)\)/);
});

test("XSTORE-019A sticky headers never block calendar-adjacent controls and mobile store switches are touchable",()=>{
  assert.match(draft,/\.msd-calendar-primary \.msd-day-title\{position:sticky;top:0;z-index:2;pointer-events:none\}/);
  assert.match(draft,/@media\(max-width:700px\)[\s\S]*\.msd-store-switch\{min-height:44px\}/);
});

test("XSTORE-019A makes employee candidate lists conditional and keeps them after the calendar",()=>{
  assert.ok(draft.includes("calendar+people+downstream"));
  assert.match(draft,/target\?supplementalPoolHtml\(\):''/);
  assert.match(draft,/Danh sách ứng viên chỉ xuất hiện khi xử lý một khoảng thiếu/);
  assert.match(draft,/class="msd-people-secondary"/);
});

test("XSTORE-019A preserves exact shortage and secondary four-store overview",()=>{
  assert.match(draft,/data-msd-shortage/);
  assert.match(draft,/data-msd-supplement/);
  assert.match(draft,/msd-global-overview/);
  assert.match(draft,/Tổng quan 4 cửa hàng · mở khi cần/);
});

test("XSTORE-019A preserves unsaved-change guard when switching store/week",()=>{
  assert.match(draft,/function confirmDiscardChanges\(\)/);
  assert.match(draft,/if\(!confirmDiscardChanges\(\)\)return/);
  assert.match(draft,/data-msd-branch/);
  assert.match(draft,/data-msd-week/);
  assert.match(draft,/state\.dirty=true/);
});

test("XSTORE-019A does not introduce a second scheduling authority",()=>{
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

console.log("XSTORE_019A_CALENDAR_WORKSPACE_STATIC=PASS");

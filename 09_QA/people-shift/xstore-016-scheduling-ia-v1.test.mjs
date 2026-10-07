import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read=p=>fs.readFileSync(p,"utf8");
const draft=read("05_MANAGER/Workforce/draft-publish-v1.js");
const master=read("05_MANAGER/Workforce/cross-store-master-v1.js");
const ui=read("05_MANAGER/Workforce/manager-scheduling-ui2-v1.js");
const engine=read("05_MANAGER/Workforce/engine-v1.js");

test("XSTORE-016 historical accordion is superseded by XSTORE-019A single-store workspace",()=>{
  assert.doesNotMatch(draft,/id="msdStore"/);
  assert.match(draft,/function storeSwitcherHtml\(\)/);
  assert.match(draft,/function singleStoreWorkspaceHtml\(/);
  assert.match(draft,/msd-store-switcher/);
  assert.match(draft,/data-msd-active-store/);
  assert.match(draft,/msd-calendar-primary/);
  assert.doesNotMatch(draft,/function branchRowsHtml\(/);
});

test("XSTORE-019A keeps exactly one selected-store editor with compact store navigation",()=>{
  assert.match(draft,/data-msd-branch/);
  assert.match(draft,/aria-pressed/);
  assert.match(draft,/Một cửa hàng · một lịch tuần/);
  assert.match(draft,/chỉ hiển thị cửa hàng đang chọn/);
  assert.match(draft,/id="msdStart"/);
  assert.match(draft,/id="msdReload"/);
  assert.match(draft,/id="msdSave"/);
  assert.doesNotMatch(ui,/actions\.querySelector\('#msdStore'\)/);
  assert.doesNotMatch(ui,/Cửa hàng đang xếp/);
});

test("XSTORE-019A keeps the calendar primary while XSTORE-019C moves candidates to an on-demand overlay",()=>{
  assert.ok(
    draft.includes("calendar+people+downstream"),
    "calendar must remain the primary workspace before any on-demand candidate UI"
  );
  assert.match(draft,/const people=candidateDrawerHtml\(\)/);
  assert.match(draft,/\.msd-people-overlay\{[^}]*position:fixed[^}]*z-index:1200/);
  assert.match(draft,/id="msdOpenCandidateDrawer"/);
  assert.match(draft,/target\?supplementalPoolHtml\(\):''/);
  assert.match(draft,/max-height:calc\(100vh - 330px\)/);
  assert.match(draft,/overflow:auto/);
  assert.match(draft,/grid-template-columns:repeat\(7,minmax\(0,1fr\)\)/);
});

test("XSTORE-019A preserves global Auto Schedule and collapsed four-store overview",()=>{
  assert.match(draft,/id="xstoreAutomationMount"/);
  assert.match(draft,/<details class="msd-global-overview">/);
  assert.match(draft,/Tổng quan 4 cửa hàng · mở khi cần/);
  assert.doesNotMatch(master,/id="xstoreAutomationMount"/);
  assert.match(master,/Tổng lịch 4 cửa hàng · tổng quan/);
});

test("XSTORE-019A preserves unsaved-change safety for store and week navigation",()=>{
  assert.match(draft,/dirty:false/);
  assert.match(draft,/function confirmDiscardChanges\(\)/);
  assert.match(draft,/Chi nhánh hiện tại có thay đổi chưa lưu/);
  assert.match(draft,/state\.dirty=true/);
  assert.match(draft,/if\(!confirmDiscardChanges\(\)\)return/);
  assert.match(draft,/state\.dirty=false/);
});

test("XSTORE-019A keeps the existing canonical runtime chain",()=>{
  assert.match(engine,/draft-publish-v1\.js\?v=(?:2026100[45]-xstore-01[6789]|20261005-xstore-019)/);
  for(const token of [
    "cross-store-master-v1.js?v=20261007-xstore-019j-weekfix1",
    "manager-scheduling-ui2-v1.js?v=20261005-xstore-019"
  ])assert.ok(engine.includes(token),token);
  assert.match(engine,/cross-store-auto-schedule-v1\.js\?v=(?:2026100[45]-xstore-01[279]|20261005-xstore-019|20261006-xstore-019g-r1)/);
});

console.log("XSTORE_016_SUPERSESSION_019A_STATIC=PASS");

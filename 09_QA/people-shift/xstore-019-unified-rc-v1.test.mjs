import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read=p=>fs.readFileSync(p,"utf8");
const managerEntry=read("05_MANAGER/index.html");
const managerWorkforceEntry=read("05_MANAGER/Workforce/index.html");
const managerRuntime=read("05_MANAGER/runtime/manager-runtime-v1.html");
const engine=read("05_MANAGER/Workforce/engine-v1.js");
const draft=read("05_MANAGER/Workforce/draft-publish-v1.js");
const review=read("05_MANAGER/Workforce/review-v1.js");
const official=read("05_MANAGER/Workforce/official-v1.js");
const auto=read("05_MANAGER/Workforce/cross-store-auto-schedule-v1.js");
const ui2=read("05_MANAGER/Workforce/manager-scheduling-ui2-v1.js");
const consolidation=read("05_MANAGER/Workforce/ui-consolidation-v1.js");
const ownerEntry=read("04_OWNER/Workforce/index.html");
const ownerRuntime=read("04_OWNER/Workforce/runtime/owner-workforce-runtime.html");
const coldReload=read("09_QA/ui2-cross-role/ui2-017-cold-reload-closure-browser.mjs");

const RC="20261005-xstore-019";
const X19G_AUTO="20261006-xstore-019g-r1";
const X19G_FIVE="20261009-xstore-019j-compact3";
const MANAGER_VISUAL="20261009-xstore-019j-compact3";
const MASTER_VISUAL="20261007-xstore-019j-weekfix1";
const RC_QUALIFICATION="POST_UI2_015_REPAIR_3";
const forbiddenWriters=[
  "replace_schedule_generation_assignments",
  "validate_schedule_generation_v1",
  "review_schedule_generation",
  "publish_schedule_generation"
];

test("XSTORE-019 keeps canonical RC entrypoints while XSTORE-019G uses bounded task cache-busts",()=>{
  assert.ok(managerEntry.includes("/05_MANAGER/runtime/manager-runtime-v1.html?v="+MANAGER_VISUAL));
  assert.ok(managerWorkforceEntry.includes("/05_MANAGER/runtime/manager-runtime-v1.html?v="+MANAGER_VISUAL));
  assert.ok(managerRuntime.includes("/05_MANAGER/Workforce/engine-v1.js?v="+MANAGER_VISUAL));
  for(const asset of [
    "review-v1.js?v="+RC,
    "draft-publish-v1.js?v=20261007-xstore-019j-cluster1",
    "cross-store-master-v1.js?v="+MASTER_VISUAL,
    "manager-scheduling-ui2-v1.js?v="+RC,
    "ui-consolidation-v1.js?v="+RC
  ]) assert.ok(engine.includes(asset),asset);
  assert.ok(engine.includes("cross-store-auto-schedule-v1.js?v="+X19G_AUTO));
  assert.ok(engine.includes("manager-five-board-v4.js?v="+X19G_FIVE));
  assert.ok(ownerEntry.includes("/04_OWNER/Workforce/runtime/owner-workforce-runtime.html?v="+RC));
  assert.ok(ownerRuntime.includes("/05_MANAGER/Workforce/draft-publish-v1.js?v="+RC));
  assert.ok(ownerRuntime.includes("/04_OWNER/Workforce/owner-scheduling-overview-v1.js?v="+RC));
  assert.ok(coldReload.includes("/05_MANAGER/runtime/manager-runtime-v1.html?v="+MANAGER_VISUAL));
  assert.ok(coldReload.includes("/04_OWNER/Workforce/runtime/owner-workforce-runtime.html?v="+RC));
});

test("XSTORE-019 keeps one canonical Manager/Owner DRAFT to publish writer path",()=>{
  for(const rpc of forbiddenWriters) assert.ok(draft.includes(rpc),rpc);
  for(const source of [review,official]){
    for(const rpc of forbiddenWriters) assert.ok(!source.includes(rpc),"parallel writer found: "+rpc);
  }
  assert.ok(auto.includes("auto_generate_cross_store_schedule_v1"));
  for(const rpc of ["replace_schedule_generation_assignments","review_schedule_generation","publish_schedule_generation"]){
    assert.ok(!auto.includes(rpc),"Auto Schedule must not become a parallel publish writer: "+rpc);
  }
  assert.ok(!draft.match(/insert\s+into\s+work_schedules/i));
});

test("XSTORE-019 integrates global summary, shortages, supplemental pool and canonical final actions",()=>{
  for(const marker of [
    "msd-global-summary",
    "xstoreAutomationMount",
    "msd-global-overview",
    "data-msd-supplement",
    "Chưa được xếp ca nào",
    "Còn thời gian có thể xếp",
    "Có thể điều động thủ công",
    "msdValidate",
    "msdReview",
    "msdPublish"
  ]) assert.ok(draft.includes(marker),marker);
  assert.ok(ui2.includes("supplemental-employee-pool"));
  assert.ok(ui2.includes("draft-editor"));
  assert.ok(ui2.includes("LỊCH NHÁP"));
  assert.ok(ui2.includes("ĐÃ DUYỆT"));
  assert.ok(ui2.includes("ĐÃ PHÁT HÀNH"));
});

test("XSTORE-019 hides superseded staffing-demand UI instead of adding a second scheduling path",()=>{
  assert.match(consolidation,/querySelector\('\[data-tab="demand"\]'\)\?\.remove\(\)/);
  assert.match(consolidation,/getElementById\('panel-demand'\)\?\.remove\(\)/);
  assert.ok(ownerRuntime.includes("demand.replaceChildren()"));
  assert.ok(ownerRuntime.includes("demand.hidden=true"));
  assert.ok(ownerRuntime.includes("review.hidden=true"));
});

test("XSTORE-019 cold reload regression explicitly rejects stale pre-RC scheduling tokens",()=>{
  for(const token of [
    "engine-v1.js?v=20261003-sched-ui-017",
    "draft-publish-v1.js?v=20261005-xstore-018",
    "manager-scheduling-ui2-v1.js?v=20261005-xstore-018",
    "owner-scheduling-overview-v1.js?v=20261003-sched-ui-008"
  ]) assert.ok(coldReload.includes(token),"missing stale-token guard: "+token);
});

assert.equal(RC_QUALIFICATION,"POST_UI2_015_REPAIR_3");
console.log("XSTORE_019_UNIFIED_RC_STATIC=PASS");

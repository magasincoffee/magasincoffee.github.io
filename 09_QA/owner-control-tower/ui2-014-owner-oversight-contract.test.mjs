import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read=p=>fs.readFileSync(p,"utf8");
const home=read("04_OWNER/index.html");
const control=read("04_OWNER/ControlTower/index.html");
const css=read("04_OWNER/ControlTower/control-tower-v1.css");
const js=read("04_OWNER/ControlTower/control-tower-v1.js");
const snapshot=read("04_OWNER/ControlTower/snapshot-v1.mjs");
const isolation=read("04_OWNER/ControlTower/source-isolation-v1.mjs");
const access=read("04_OWNER/ControlTower/access-v1.mjs");
const ownerWorkforce=read("04_OWNER/Workforce/runtime/owner-workforce-runtime.html");

function assertOrder(source,fragments){
 let last=-1;
 for(const fragment of fragments){
  const at=source.indexOf(fragment);
  assert.ok(at>last,fragment);
  last=at;
 }
}

test("UI2-014 Owner home and Control Tower both render oversight before module entry",()=>{
 for(const source of [home,control]){
  assertOrder(source,['id="overview"','id="attention"','id="operatingSnapshot"','id="ownerModules"']);
  assert.match(source,/(?:What needs Owner attention now\?|Việc nào cần Owner xem ngay\?)/);
  assert.match(source,/Bối cảnh báo cáo & độ tin cậy nguồn/);
  assert.match(source,/Đi tới (?:module|khu vực) khi cần xử lý sâu/);
  assert.doesNotMatch(source,/<select\b/i);
 }
 assert.match(home,/data-magasin-shell-current="overview"/);
 assert.match(control,/data-magasin-shell-current="attention"/);
});

test("UI2-014 complete Owner presentation cache chain uses the new version on both entry routes",()=>{
 const v="20260927-ui2-014";
 for(const source of [home,control]){
  assert.ok(source.includes("/04_OWNER/ControlTower/control-tower-v1.css?v="+v));
  assert.ok(source.includes("/04_OWNER/ControlTower/control-tower-v1.js?v="+v));
  assert.ok(source.includes("/02_CORE/shared/shared-core-v1.js?v="+v));
 }
});

test("UI2-014 reuses canonical snapshot, isolation and access contracts without widening quality state",()=>{
 for(const imported of ["normalizeControlTowerSnapshot","loadSectionSafely","requireOwnerAccess","loadProcurementPayables","loadWorkforceAttention","loadReconciledRevenue"])assert.ok(js.includes(imported),imported);
 assert.match(snapshot,/ACTUAL/);
 assert.match(snapshot,/ESTIMATE/);
 assert.match(snapshot,/GAP/);
 assert.match(snapshot,/NOT_CONNECTED/);
 assert.doesNotMatch(snapshot,/STUB/);
 assert.doesNotMatch(js,/\.rpc\s*\(|\.from\s*\(|createClient\s*\(/);
 assert.doesNotMatch(js,/\.insert\s*\(|\.update\s*\(|\.delete\s*\(|\.upsert\s*\(/);
 assert.match(isolation,/loadSectionSafely/);
 assert.match(access,/requireOwnerAccess/);
});

test("UI2-014 Attention Center is factual and only drills into existing canonical routes",()=>{
 assert.match(js,/payables-overdue/);
 assert.match(js,/workforce-attention/);
 assert.match(js,/section\.quality === "GAP"/);
 assert.match(js,/section\.quality === "ESTIMATE"/);
 assert.match(js,/payables: "\/nhap-hang\/"/);
 assert.match(js,/workforce: "\/owner\/scheduling\/"/);
 assert.doesNotMatch(js,/severity|priority|deadline|assigned_to|owner_id/i);
 assert.doesNotMatch(js,/Math\.random|fake|mock/i);
});

test("UI2-014 NOT_CONNECTED remains explicit quality context and is not coerced into trusted zero",()=>{
 assert.match(js,/quality: "NOT_CONNECTED"/);
 assert.match(js,/Nguồn tồn kho chưa được kết nối/);
 assert.match(js,/Nguồn Task \/ SOP chưa được kết nối/);
 assert.match(snapshot,/const metricsTrusted = quality === "ACTUAL" \|\| quality === "ESTIMATE"/);
 assert.match(snapshot,/section\[field\] = metricsTrusted \? nullableNumber\(raw\[field\]\) : null/);
});

test("UI2-014 refresh clears prior factual projection before parallel isolated source reads",()=>{
 const clearAt=js.indexOf("clearLoadedSectionsForRefresh()");
 const loadingRenderAt=js.indexOf("render(normalizeControlTowerSnapshot(rawState), { loading: true })",clearAt);
 const promiseAt=js.indexOf("Promise.all([",loadingRenderAt);
 assert.ok(clearAt>=0&&loadingRenderAt>clearAt&&promiseAt>loadingRenderAt);
 assert.match(js,/rawState\.revenue = undefined/);
 assert.match(js,/rawState\.payables = undefined/);
 assert.match(js,/rawState\.workforce = undefined/);
 assert.match(js,/attentionLoading/);
 assert.match(js,/list\.innerHTML = ""/);
});

test("UI2-014 keeps explicit Owner auth loading denied allowed ordering",()=>{
 const bootAt=js.indexOf("async function boot()");
 const authAt=js.indexOf("await requireOwnerAccess",bootAt);
 const showAt=js.indexOf('app.classList.remove("hidden")',authAt);
 const refreshAt=js.indexOf("await refreshAll(core)",showAt);
 assert.ok(bootAt>=0&&authAt>bootAt&&showAt>authAt&&refreshAt>showAt);
 for(const source of [home,control]){
  assert.match(source,/id="loading"/);
  assert.match(source,/id="denied"/);
  assert.match(source,/id="app"/);
 }
});

test("UI2-014 responsive Owner presentation has explicit touch focus and containment rules",()=>{
 assert.match(css,/@media\(max-width:800px\)/);
 assert.match(css,/@media\(max-width:520px\)/);
 assert.match(css,/min-height:44px/);
 assert.match(css,/:focus-visible/);
 assert.match(css,/overflow-x:hidden/);
 assert.match(css,/grid-template-columns:1fr/);
});

test("UI2-014 does not redesign Owner scheduling writer surface",()=>{
 assert.match(ownerWorkforce,/05_MANAGER\/Workforce\/draft-publish-v1\.js/);
 assert.match(ownerWorkforce,/04_OWNER\/Workforce\/owner-scheduling-overview-v1\.js/);
 assert.doesNotMatch(ownerWorkforce,/01-demand\/engine-v1\.js|02-review\/engine-v1\.js|03-publish\/engine-v1\.js/);
 assert.doesNotMatch(js,/publish_schedule_generation|replace_schedule_generation_assignments|create_schedule_generation/);
});

console.log("UI2_014_OWNER_OVERSIGHT_CONTRACT=PASS");

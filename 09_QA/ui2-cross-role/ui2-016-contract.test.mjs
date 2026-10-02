import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read=p=>fs.readFileSync(p,"utf8");

test("UI2-016 shared drawer breakpoint uses canonical 44px touch token",()=>{
  const css=read("02_CORE/ui/magasin-ui-v2-shell.css");
  const tablet=css.match(/@media \(max-width: 1024px\) \{([\s\S]*?)\n\}/)?.[1]||"";
  assert.match(tablet,/\.m-shell-v2-menu[\s\S]*var\(--m-control-touch-height\)/);
  assert.match(tablet,/\.m-shell-v2-nav__item[\s\S]*min-height:\s*var\(--m-control-touch-height\)/);
  assert.match(tablet,/\.m-shell-v2-logout[\s\S]*min-height:\s*var\(--m-control-touch-height\)/);
});

test("UI2-016 Manager authenticated shell enters touch drawer at 1024",()=>{
  const js=read("05_MANAGER/runtime/compat/ui/manager-ui-shell-v2.js");
  assert.match(js,/@media\(max-width:1024px\)/);
  assert.match(js,/\.manager-v2-drawer button\{min-height:44px!important\}/);
  assert.match(js,/\.manager-v2-header button\{min-width:44px!important;min-height:44px!important\}/);
});

test("UI2-016 Manager Today Scheduling Operations use 1024 touch breakpoints",()=>{
  for(const p of [
    "05_MANAGER/Workforce/ui-consolidation-v1.js",
    "05_MANAGER/Workforce/manager-scheduling-ui2-v1.js",
    "05_MANAGER/Workforce/manager-operations-ui2-v1.js"
  ]) assert.match(read(p),/@media\(max-width:1024px\)/,p);
  const engine=read("05_MANAGER/Workforce/engine-v1.js");
  assert.ok(engine.includes("ui-consolidation-v1.js?v=20261001-ui-unified1"));
  assert.ok(engine.includes("manager-scheduling-ui2-v1.js?v=20261001-ui-unified1"));
  assert.ok(engine.includes("manager-operations-ui2-v1.js?v=20260927-ui2-016"));
});

test("UI2-016 shared visual vocabulary remains canonical",()=>{
  const tokens=read("02_CORE/ui/magasin-ui-v2-tokens.css");
  const primitives=read("02_CORE/ui/magasin-ui-v2-primitives.css");
  assert.match(tokens,/--m-font-sans:\s*"Segoe UI", Roboto, "Helvetica Neue", Arial/);
  assert.match(tokens,/--m-control-touch-height:\s*44px/);
  assert.match(tokens,/--m-focus-outline:/);
  assert.match(primitives,/\.m-button:focus-visible/);
  assert.match(primitives,/\.m-table-shell[\s\S]*overflow:\s*auto/);
});

test("UI2-016 shell cache chain is bumped without moving the Owner path",()=>{
  const managerRuntime=read("05_MANAGER/runtime/manager-runtime-v1.html");
  assert.match(managerRuntime,/magasin-ui-v2-shell\.css\?v=20261001-ui-unified1/);
  assert.doesNotMatch(managerRuntime,/magasin-ui-v2-shell\.css\?v=20260925-ui2-004/);

  for(const p of [
    "04_OWNER/index.html",
    "04_OWNER/ControlTower/index.html",
    "04_OWNER/Workforce/runtime/owner-workforce-runtime.html",
    "04_OWNER/Procurement/index.html",
    "04_OWNER/Access/index.html"
  ]){
    const owner=read(p);
    if(owner.includes("magasin-ui-v2-shell.css"))assert.match(owner,/magasin-ui-v2-shell\.css\?v=20260927-ui2-016/,p);
    assert.doesNotMatch(owner,/20261001-ui-unified1/,p);
  }

  assert.match(read("05_MANAGER/index.html"),/manager-runtime-v1\.html\?v=(?:20261001-ui-unified1|20261002-sched-ui-001)/);
  assert.match(managerRuntime,/manager-shell-v1\.html\?v=20261001-ui-unified1&host=manager/);
  assert.match(read("04_OWNER/Workforce/runtime/owner-workforce-runtime.html"),/manager-shell-v1\.html\?v=20260927-ui2-016&host=owner/);
  assert.match(read("05_MANAGER/runtime/manager-shell-v1.html"),/manager-ui-shell-v2\.js\?v=20260927-ui2-016/);
  assert.match(read("04_OWNER/Workforce/index.html"),/owner-workforce-runtime\.html\?v=20260927-ui2-016/);
});

test("UI2-016 Finance boundary remains no-runtime/no-route",()=>{
  assert.equal(fs.existsSync("04_OWNER/Finance"),false);
  for(const p of ["04_OWNER/index.html","04_OWNER/ControlTower/index.html","04_OWNER/Procurement/index.html","04_OWNER/Access/index.html"]){
    assert.doesNotMatch(read(p),/href=["'][^"']*\/04_OWNER\/Finance\//,p);
  }
});

console.log("UI2_016_CROSS_ROLE_CONTRACT=PASS");

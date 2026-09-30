import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read=p=>fs.readFileSync(p,"utf8");
const BASE="f98cfb15a47bbb66ad39c71348bb2668cf174364";

test("UI2-017 role routing contract remains canonical",()=>{
  const auth=read("03_PLATFORM/01_AUTH/auth-runtime-v2.js");
  assert.match(auth,/role === 'OWNER'\) location\.replace\('\/04_OWNER\/'\)/);
  assert.match(auth,/\['STAFF', 'EMPLOYEE'\]\.includes\(role\)\) location\.replace\('\/06_EMPLOYEE\/'\)/);
  assert.match(auth,/role === 'STORE_MANAGER'\) location\.replace\('\/05_MANAGER\/'\)/);
  assert.match(auth,/else location\.replace\('\/03_PLATFORM\/01_AUTH\/role-unavailable\.html'\)/);
  const employee=read("06_EMPLOYEE/index.html");
  const manager=read("05_MANAGER/index.html");
  assert.match(employee,/employee-runtime-v1\.html\?v=(?:20260926-ui2-008|20260928-xstore003|20260929-mer005|20260930-emlive001|20260930-emlive002|20260930-emlive003)/);
  assert.match(manager,/manager-runtime-v1\.html\?v=(?:20260927-ui2-016|20260928-xstore006|20260929-xstore-livefix2|20260929-mer005)/);
});

test("UI2-017 exact UI2-016 cache chain remains canonical",()=>{
  const engine=read("05_MANAGER/Workforce/engine-v1.js");
  for(const p of ["ui-consolidation-v1.js","manager-scheduling-ui2-v1.js","manager-operations-ui2-v1.js"])
    assert.ok(engine.includes(p+"?v=20260927-ui2-016"),p);
  assert.match(read("05_MANAGER/runtime/manager-runtime-v1.html"),/manager-shell-v1\.html\?v=20260927-ui2-016/);
  assert.match(read("05_MANAGER/runtime/manager-shell-v1.html"),/manager-ui-shell-v2\.js\?v=20260927-ui2-016/);
  const owner=read("04_OWNER/Workforce/runtime/owner-workforce-runtime.html");
  assert.match(owner,/manager-shell-v1\.html\?v=20260927-ui2-016&host=owner/);
  assert.match(owner,/magasin-ui-v2-shell\.css\?v=20260927-ui2-016/);
});

test("UI2-017 Procurement friendly route and Owner Finance boundary remain unchanged",()=>{
  const friendly=read("nhap-hang/index.html");
  assert.match(friendly,/const friendlyPath = '\/nhap-hang\/'/);
  assert.match(friendly,/const sourcePath = '\/04_OWNER\/Procurement\/'/);
  assert.equal(fs.existsSync("04_OWNER/Finance"),false);
  for(const p of ["04_OWNER/index.html","04_OWNER/ControlTower/index.html","04_OWNER/Procurement/index.html","04_OWNER/Access/index.html"])
    assert.doesNotMatch(read(p),/href=["'][^"']*\/04_OWNER\/Finance\//,p);
});

test("UI2-017 closure evidence is correlated to exact main and all task IDs",()=>{
  const evidence=read("01_DOCS/MAGASIN/05_SYSTEM/MAGASIN_UI_UX_V2_UI2_017_CLOSURE_EVIDENCE.md");
  assert.ok(evidence.includes(BASE));
  for(let i=1;i<=17;i++)assert.ok(evidence.includes("UI2-"+String(i).padStart(3,"0")),"UI2-"+i);
  for(const pr of [307,308,309,310,311,312,313,314,315,316,318,319,320,321,322,323,324])assert.ok(evidence.includes("#"+pr),"PR #"+pr);
  assert.match(evidence,/PLANNER-ACCEPTED/);
  assert.ok(evidence.includes("**Track status:** **PLANNER-ACCEPTED / PR #324 CLOSURE MERGE — CLOSED WHEN PRESENT ON MAIN**"));
  assert.doesNotMatch(evidence,/AWAITING PLANNER VERIFY|NOT YET CLOSED/);
});

console.log("UI2_017_CLOSURE_CONTRACT=PASS");

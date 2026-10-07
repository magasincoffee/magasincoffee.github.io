import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

const root=new URL("../../",import.meta.url);
const read=p=>fs.readFile(new URL(p,root),"utf8");

test("SCHED-UI-010 Auth routes active roles to clean entrypoints",async()=>{
  const auth=await read("03_PLATFORM/01_AUTH/auth-runtime-v2.js");
  assert.match(auth,/role === 'OWNER'\) location\.replace\('\/owner\/'\)/);
  assert.match(auth,/role === 'STORE_MANAGER'\) location\.replace\('\/manager\/'\)/);
  assert.match(auth,/\['STAFF', 'EMPLOYEE'\]\.includes\(role\)\) location\.replace\('\/employee\/'\)/);
});

test("SCHED-UI-010 numbered roots consume bounded canonical markers without replacing runtimes",async()=>{
  const manager=await read("05_MANAGER/index.html");
  const employee=await read("06_EMPLOYEE/index.html");
  const owner=await read("04_OWNER/index.html");
  const ownerScheduling=await read("04_OWNER/Workforce/index.html");
  assert.match(manager,/manager-scheduling/);
  assert.match(manager,/location\.pathname==='\/05_MANAGER\/'/);
  assert.match(manager,/history\.replaceState/);
  assert.match(manager,/manager-runtime-v1\.html\?v=(?:20261003-sched-ui-017|20261005-xstore-019|20261007-xstore-019g-visual1|20261007-xstore-019g-visual3|20261007-xstore-019j-weekfix1)/);
  assert.match(employee,/employee-attendance/);
  assert.match(employee,/location\.pathname==='\/06_EMPLOYEE\/'/);
  assert.match(employee,/history\.replaceState/);
  assert.match(employee,/employee-runtime-v1\.html\?v=(?:20261003-sched-ui-007|20261006-xstore-019d|20261006-xstore-019h|20261007-xstore-019h-visual3)/);
  assert.match(owner,/owner-root/);
  assert.match(owner,/history\.replaceState\([^\n]*\/owner\//);
  assert.match(ownerScheduling,/owner-scheduling/);
  assert.match(ownerScheduling,/owner-workforce-runtime\.html\?v=(?:20261003-sched-ui-008|20261005-xstore-019)/);
});

test("SCHED-UI-010 navigation prefers clean paths while keeping legacy path readers",async()=>{
  const managerRoute=await read("05_MANAGER/runtime/compat/router/manager-route-state-v2.js");
  const managerRuntime=await read("05_MANAGER/runtime/manager-runtime-v1.html");
  const managerBridge=await read("05_MANAGER/runtime/compat/router/manager-route-bridge-v1.js");
  const employeeShell=await read("02_CORE/ui/magasin-ui-v2-employee-shell.js");
  const globalShell=await read("02_CORE/ui/magasin-ui-v2-shell.js");
  const controlTower=await read("04_OWNER/ControlTower/control-tower-v1.js");
  assert.match(managerRoute,/\/manager\/scheduling\//);
  assert.match(managerRoute,/\/manager\/schedule\//);
  assert.match(managerRoute,/LEGACY_PREFIX='\/05_MANAGER'/);
  assert.match(managerRoute,/ancestorBridgeOwnsUrl/);
  assert.match(managerRoute,/MAGASIN_MANAGER_ROUTE_BRIDGE_V1/);
  assert.match(managerRuntime,/['"]tasks['"]/);
  assert.match(managerRuntime,/['"]settings['"]/);
  assert.match(managerRoute,/if\(ancestorBridgeOwnsUrl\(\)\)return/);
  assert.match(managerBridge,/routeBridgeObserverBound/);
  assert.match(managerBridge,/active&&active!==wanted/);
  for(const p of ["/employee/schedule/","/employee/attendance/","/employee/payroll/"])assert.ok(employeeShell.includes(p),p);
  assert.ok(globalShell.includes("['overview', '⌂', 'Tổng quan', '/owner/']"));
  assert.ok(globalShell.includes("['workforce', '▦', 'Nhân sự', '/owner/scheduling/']"));
  assert.match(controlTower,/workforce: "\/owner\/scheduling\/"/);
});

test("SCHED-UI-010 clean adapter uses fixed bridge markers and fail-closed role checks",async()=>{
  const helper=await read("02_CORE/navigation/canonical-role-route-v1.js");
  assert.match(helper,/canonical=manager-scheduling/);
  assert.match(helper,/canonical=employee-attendance/);
  assert.match(helper,/canonical=owner-scheduling/);
  assert.match(helper,/role-unavailable\.html/);
});
console.log("SCHED_UI_010_AUTH_NAVIGATION_CONTRACT=PASS");

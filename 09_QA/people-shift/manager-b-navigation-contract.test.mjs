import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read = file => fs.readFileSync(file, "utf8");
const shell = read("02_CORE/ui/magasin-ui-v2-shell.js");
const managerRoute = read("manager/scheduling/index.html");
const schedule = read("05_MANAGER/SchedulingV2/index.html");
const demand = read("05_MANAGER/SchedulingV2/Demand/index.html");
const managerShell = read("05_MANAGER/runtime/manager-shell-v1.html");
const managerRuntime = read("05_MANAGER/runtime/manager-runtime-v1.html");
const managerEntry = read("05_MANAGER/index.html");
const canonical = read("02_CORE/navigation/canonical-role-route-v1.js");
const bridge = read("05_MANAGER/runtime/compat/router/manager-route-bridge-v1.js");
const state = read("05_MANAGER/runtime/compat/router/manager-route-state-v2.js");
const shellIndex = read("manager/index.html");
const directNav = read("05_MANAGER/SchedulingV2/manager-navigation-v2.js");

test("Manager B sidebar follows approved primary order and preserves operational routes", () => {
  const manager = shell.slice(shell.indexOf("const MANAGER_NAV"),shell.indexOf("const OWNER_NAV"));
  const keys = [...manager.matchAll(/\['([^']+)',\s*'[^']+',\s*'[^']+'(?:,\s*'[^']+')?\]/g)].map(x=>x[1]);
  assert.deepEqual(keys,[
    "dashboard","staff","demand","workforce","attendance","tasks","reports","settings",
    "swap","schedule","payroll-self-check"
  ]);
  for (const label of ["Tổng quan","Nhân viên","Nhu cầu nhân sự","Xếp lịch","Chấm công","Công việc","Báo cáo","Cài đặt"]) {
    assert.ok(manager.includes(label),label);
  }
  assert.match(shell,/['"]\/manager\/scheduling\/\?section=demand['"]/);
  assert.match(shell,/data-shell-view/);
  assert.match(shell,/new URLSearchParams\(topLocation\.search\)\.get\('section'\)/);
});

test("Demand uses one role-checked Manager shell with dedicated routed content", () => {
  const roleGate=managerRoute.indexOf("role!=='STORE_MANAGER'");
  const decision=managerRoute.indexOf("const demand=new URLSearchParams");
  assert.ok(roleGate>=0 && decision>roleGate,"role gate precedes demand route selection");
  assert.match(managerRoute,/SchedulingV2\/Demand\/index\.html/);
  assert.match(managerRoute,/magasin-ui-v2-shell\.js\?v=20261021-manager-nav-b3/);
  assert.match(managerRoute,/data[sS]et\.magasinShellMode='standalone'/);
  assert.match(schedule,/href="\/manager\/scheduling\/\?section=demand" target="_top"/);
  assert.match(demand,/href="\/manager\/scheduling\/" target="_top"/);
  assert.match(directNav,/const current = demandPage \? 'demand' : 'workforce'/);
});

test("Manager reports remain honest until a verified report reader exists", () => {
  assert.match(managerShell,/id="view-reports"/);
  assert.match(managerShell,/data-report-source-state="NOT_CONNECTED"/);
  assert.match(managerShell,/Chưa có nguồn doanh thu, đơn hàng và khách hàng đã xác minh/);
  for (const s of [managerEntry,managerRuntime,canonical,bridge,state])
    assert.match(s,/['"]reports['"]/);
  assert.match(shellIndex,/canonical-role-route-v1\.js\?v=20261021-manager-nav-b3/);
  assert.match(managerRuntime,/manager-shell-v1\.html\?v=20261021-manager-nav-b3/);
  assert.match(managerRuntime,/magasin-ui-v2-shell\.js\?v=20261021-manager-nav-b3/);
});

test("Owner navigation and Employee routes remain unchanged in the B sidebar change", () => {
  const owner=shell.slice(shell.indexOf("const OWNER_NAV"),shell.indexOf("const MANAGER_META"));
  assert.match(owner,/\/owner\//);
  assert.match(owner,/\/nhap-hang\//);
  assert.doesNotMatch(owner,/['"]demand['"]|['"]reports['"]/);
  const employee=canonical.slice(canonical.indexOf("'employee-root'"),canonical.indexOf("'owner-root'"));
  assert.match(employee,/employee\/schedule/);
  assert.doesNotMatch(employee,/manager\/scheduling/);
});

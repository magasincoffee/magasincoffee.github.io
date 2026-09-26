import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read=p=>fs.readFileSync(p,"utf8");
const runtime=read("05_MANAGER/runtime/manager-runtime-v1.html");
const shell=read("05_MANAGER/runtime/manager-shell-v1.html");
const managerUi=read("02_CORE/ui/magasin-ui-v2-manager.js");
const managerCss=read("02_CORE/ui/magasin-ui-v2-manager.css");
const consolidation=read("05_MANAGER/Workforce/ui-consolidation-v1.js");
const engine=read("05_MANAGER/Workforce/engine-v1.js");
const swap=read("05_MANAGER/Workforce/swap-approval-v1.js");
const attendance=read("05_MANAGER/Workforce/attendance-review-v1.js");
const entry=read("05_MANAGER/index.html");
const rpcs=s=>[...s.matchAll(/\.rpc\(['"]([^'"]+)/g)].map(m=>m[1]);

test("UI2-011 loads a namespaced Manager shell layer on the accepted authenticated shell",()=>{
  assert.match(runtime,/magasin-ui-v2-shell\.css\?v=20260925-ui2-004/);
  assert.match(runtime,/magasin-ui-v2-manager\.css\?v=20260926-ui2-011/);
  assert.match(runtime,/magasin-ui-v2-shell\.js\?v=20260925-ui2-004/);
  assert.match(runtime,/magasin-ui-v2-manager\.js\?v=20260926-ui2-011/);
  assert.match(managerCss,/body\[data-magasin-shell-v2\]\[data-magasin-shell-role="manager"\]/);
  assert.match(managerUi,/managerUi2Shell='operations'/);
  assert.doesNotMatch(managerUi,/\.rpc\(|\.from\s*\(|createClient\s*\(/);
});

test("UI2-011 V2 Manager navigation exposes only the seven canonical operational destinations",()=>{
  for(const view of ["dashboard","staff","workforce","schedule","swap","attendance","payroll-self-check"])assert.ok(managerUi.includes("'"+view+"'"),view);
  assert.match(managerUi,/group\('Điều hành',\['dashboard'\]/);
  assert.match(managerUi,/group\('Workforce',\['workforce','schedule','swap','attendance'\]/);
  assert.match(managerUi,/group\('Nhân sự',\['staff','payroll-self-check'\]/);
  assert.match(consolidation,/const allowed=new Set\(\['dashboard','staff','workforce','schedule','swap','attendance','payroll-self-check'\]\)/);
  assert.match(entry,/new Set\(\['dashboard','staff','workforce','schedule','swap','attendance','payroll-self-check'\]\)/);
});

test("UI2-011 Manager Today supersedes demo KPI hierarchy with fail-closed Action Center bootstrap",()=>{
  const start=shell.indexOf('<section class="view active manager-today-v2" id="view-dashboard"');
  const end=shell.indexOf('<section class="view" id="view-staff"',start);
  assert.ok(start>=0&&end>start);
  const dashboard=shell.slice(start,end);
  assert.match(dashboard,/Đang kết nối Action Center với các nguồn vận hành canonical/);
  for(const fake of ["49,2tr","2.410","4,7 / 5","18 nhân sự","1 request đổi ca","3 nhân viên chưa đăng ký"])assert.ok(!dashboard.includes(fake),fake);
  assert.match(consolidation,/Action Center/);
  assert.match(consolidation,/NOT_CONNECTED/);
  assert.match(consolidation,/managerTodayState/);
  assert.match(consolidation,/phase='loading'/);
  assert.match(consolidation,/phase=errors\.length\?'error':todayState\.missing\.length\?'not-connected':'ready'/);
});

test("UI2-011 Today delegates only to existing readers and source navigation, never writers",()=>{
  for(const api of ["MAGASIN_MANAGER_SHIFT_CHANGE","MAGASIN_MANAGER_ATTENDANCE_REVIEW","MAGASIN_MANAGER_SCHEDULE_DRAFT"])assert.ok(consolidation.includes(api),api);
  assert.match(consolidation,/await api\.refresh\(\)/);
  assert.match(consolidation,/const b=sourceButton\(v\)/);
  assert.match(consolidation,/b\.click\(\)/);
  assert.doesNotMatch(consolidation,/\.rpc\(|\.from\s*\(|createClient\s*\(/);
  assert.doesNotMatch(consolidation,/approve_shift|reject_shift|review_attendance|publish_schedule_generation|replace_schedule_generation_assignments/);
});

test("UI2-011 preserves Manager domain module RPC inventories and derives Today state read-only",()=>{
  assert.deepEqual(rpcs(swap),["list_shift_swap_requests_v1","list_shift_give_requests_v1"]);
  for(const writer of ["approve_shift_swap","reject_shift_swap","approve_shift_give","reject_shift_give"])assert.ok(swap.includes("'"+writer+"'"),writer);
  assert.deepEqual(rpcs(attendance),["get_manager_accessible_stores","list_manager_attendance_review_v1","review_attendance_v1"]);
  assert.equal((swap.match(/createClient\s*\(/g)||[]).length,1);
  assert.equal((attendance.match(/createClient\s*\(/g)||[]).length,1);
  assert.doesNotMatch(swap,/\.from\s*\(/);
  assert.doesNotMatch(attendance,/\.from\s*\(/);
  assert.match(consolidation,/function shiftSnapshot\(\)/);
  assert.match(consolidation,/function attendanceSnapshot\(\)/);
  assert.match(consolidation,/\.js-swap-approve/);
  assert.match(consolidation,/\.js-give-approve/);
});

test("UI2-011 loader changes are cache/presentation-only and add no business RPC",()=>{
  assert.deepEqual(rpcs(engine),[]);
  assert.match(engine,/swap-approval-v1\.js\?v=20260918-task032/);
  assert.match(engine,/attendance-review-v1\.js\?v=20260922-task100/);
  assert.match(engine,/ui-consolidation-v1\.js\?v=20260926-ui2-011/);
  assert.match(runtime,/manager-shell-v1\.html\?v=20260926-ui2-011/);
  assert.match(runtime,/engine-v1\.js\?v=20260926-ui2-011/);
});

test("UI2-011 accessibility presentation contract is desktop/tablet/phone safe",()=>{
  assert.match(managerCss,/min-height: 42px/);
  assert.match(managerCss,/:focus-visible/);
  assert.match(managerCss,/@media \(max-width: 1024px\)/);
  assert.match(managerCss,/@media \(min-width: 720px\) and \(max-width: 1024px\)/);
  assert.match(managerCss,/transform: none !important/);
  assert.match(managerCss,/@media \(max-width: 600px\)/);
  assert.match(managerCss,/min-height: 44px/);
  assert.match(managerCss,/grid-template-columns: minmax\(0, 1\.35fr\) minmax\(280px, \.65fr\)/);
  assert.match(managerCss,/grid-template-columns: 1fr/);
  assert.doesNotMatch(managerCss,/(^|\n)\s*:root\s*\{/m);
});

console.log("UI2_011_MANAGER_SHELL_TODAY_CONTRACT=PASS");

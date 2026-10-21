import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read = path => fs.readFileSync(path, "utf8");

const app = read("06_EMPLOYEE/app/employee-v40.html");
const engine = read("06_EMPLOYEE/dashboard/engine-v1.js");
const todayCss = read("02_CORE/ui/magasin-ui-v2-employee-today.css");
const schedule = read("06_EMPLOYEE/schedule/engine-v1.js");
const availability = read("06_EMPLOYEE/availability/engine-v1.js");

test("UI2-006 Today engine parses and remains read/presentation only", () => {
  assert.doesNotThrow(() => new Function(engine));
  assert.doesNotMatch(engine, /C\.supabase|\.rpc\(|createClient\(|\.insert\(|\.update\(|\.delete\(/);
  for (const hook of [
    "api.getState?.()",
    "api.getRows?.()",
    "api.getWeek?.()",
    "api.getTodayRows?.()",
    "schedule?.openAction",
    "availability?.getRegistrationState",
    "availability?.open"
  ]) {
    assert.ok(engine.includes(hook), hook);
  }
});

test("Today app hierarchy is V2 and keeps canonical shell navigation separate", () => {
  assert.ok(app.includes("/02_CORE/ui/magasin-ui-v2-employee-today.css"));
  assert.ok(app.includes('id="employeeTodayGreeting"'));
  assert.ok(app.includes('id="employeeTodayShiftBody"'));
  assert.ok(app.includes('id="taskList"'));
  assert.ok(app.includes('id="employeeTodayWeekSummary"'));
  assert.ok(app.includes('data-today-route="schedule"'));
  assert.ok(app.includes('data-today-route="attendance"'));
  // Quick actions use existing engines. Payroll remains in the canonical five-item primary nav.
  assert.ok(app.includes('data-today-action="availability"'));
  assert.ok(app.includes('data-today-action="route:notice"'));
  assert.ok(app.includes('/02_CORE/ui/magasin-ui-v2-employee-mockup-d.css?v=20261021-mockup-d1'));
  assert.ok(app.includes('data-today-route="schedule"'));
  assert.ok(app.includes('id="weeklyRegistrationPanel"'));
  assert.ok(app.includes("dashboard:['Hôm nay','Ca và việc cần làm']"));
  assert.doesNotMatch(app, /id="employeeV2PrimaryNav"/);
});

test("Today current/next/ended/empty/loading/error states are explicit and fail closed", () => {
  for (const marker of [
    "kind:'loading'",
    "kind:'error'",
    "kind:'wrong-week'",
    "kind:'empty'",
    "kind:'current'",
    "kind:'next'",
    "kind:'ended'",
    "data-today-loading",
    "data-today-error",
    "data-today-week-error"
  ]) assert.ok(engine.includes(marker), marker);
  assert.ok(engine.includes("Màn hình Hôm nay không suy đoán ca từ dữ liệu ngoài tuần hiện tại."));
  assert.ok(engine.includes("Màn hình Hôm nay không hiển thị dữ liệu cũ khi nguồn lịch đang lỗi."));
});

test("Việc cần làm maps only to canonical existing states/actions", () => {
  for (const action of [
    "attendance:",
    "route:schedule",
    "route:attendance",
    "retry-schedule",
    "availability"
  ]) assert.ok(engine.includes(action), action);
  assert.ok(app.includes("Chưa có nguồn công việc hoặc quy trình riêng được xác minh"));
  assert.doesNotMatch(engine, /route:inventory/);
  assert.doesNotMatch(engine, /route:settings/);
});

test("week-at-a-glance uses canonical current-week schedule rows only", () => {
  assert.ok(engine.includes("api.getRows?.()"));
  assert.ok(engine.includes("api.getWeek?.()"));
  assert.ok(engine.includes("const currentWeek=C.date.monday()"));
  assert.ok(engine.includes("const wrongWeek=String(week)!==String(currentWeek)"));
  assert.ok(engine.includes("snapshot.rows.filter"));
  assert.doesNotMatch(engine, /fetch\(|XMLHttpRequest|localStorage|sessionStorage|C\.supabase/);
});

test("Schedule and Availability canonical APIs still expose the reused contracts", () => {
  assert.ok(schedule.includes("getRows:()=>state.rows.map"));
  assert.ok(schedule.includes("getWeek:()=>state.week"));
  assert.ok(schedule.includes("getTodayRows:()=>state.rows.filter"));
  assert.ok(schedule.includes("openAction,"));
  assert.ok(availability.includes("getRegistrationState:()=>state.registration"));
  assert.ok(availability.includes("getRows:()=>state.rows.slice()"));
});

test("Today phone presentation is touch-first and locally namespaced", () => {
  assert.match(todayCss, /#view-dashboard \.employee-today-v2/);
  assert.match(todayCss, /min-height:\s*44px/);
  assert.match(todayCss, /@media \(max-width: 760px\)/);
  assert.match(todayCss, /@media \(max-width: 430px\)/);
  assert.match(todayCss, /:focus-visible/);
  assert.doesNotMatch(todayCss, /(^|\n)\s*:root\s*\{/m);
});

test("Mockup D mobile board honors existing authoritative route and hour-band boundaries", () => {
  const css=read("02_CORE/ui/magasin-ui-v2-employee-mockup-d.css");
  assert.match(css, /body\\[data-magasin-employee-shell-v2\\]/);
  assert.match(css, /grid-template-columns:repeat\\(4,minmax\\(0,1fr\\)\\)/);
  assert.match(css, /employee-today-card--shift/);
  assert.match(css, /employee-today-week/);
  assert.match(css, /employee-today-queue/);
  assert.match(css, /@media\\(max-width:390px\\)/);
  assert.match(css, /:focus-visible/);
  assert.doesNotMatch(css, /\\.rpc\\(|createClient\\(|\\.from\\(|\\.insert\\(|\\.update\\(|\\.delete\\(/);
  const shortcuts=app.match(/<nav class="employee-today-shortcuts"[\\s\\S]*?<\\/nav>/)?.[0]||"";
  assert.equal((shortcuts.match(/<button /g)||[]).length,4);
  for(const key of ['data-today-action="availability"','data-today-route="schedule"','data-today-route="attendance"','data-today-action="route:notice"'])assert.ok(shortcuts.includes(key),key);
});
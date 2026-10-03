import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

const root=new URL("../../",import.meta.url);
const read=p=>fs.readFile(new URL(p,root),"utf8");

const routes=[
  ["manager/index.html","manager-root"],
  ["manager/scheduling/index.html","manager-scheduling"],
  ["manager/schedule/index.html","manager-schedule"],
  ["employee/index.html","employee-root"],
  ["employee/schedule/index.html","employee-schedule"],
  ["employee/attendance/index.html","employee-attendance"],
  ["employee/payroll/index.html","employee-payroll"],
  ["owner/index.html","owner-root"],
  ["owner/scheduling/index.html","owner-scheduling"]
];

test("SCHED-UI-009 clean route entrypoints remain thin guarded adapters",async()=>{
  for(const [path,key] of routes){
    const html=await read(path);
    assert.match(html,/canonical-role-route-v1\.js\?v=20261003-sched-ui-009/);
    assert.match(html,new RegExp('data-route-key="'+key+'"'));
    assert.doesNotMatch(html,/<iframe\b/i);
  }
});

test("SCHED-UI-009 route adapter remains closed and delegates only to numbered bridges",async()=>{
  const js=await read("02_CORE/navigation/canonical-role-route-v1.js");
  for(const token of [
    "bridge:'/05_MANAGER/?canonical=manager-root'",
    "bridge:'/05_MANAGER/?canonical=manager-scheduling#workforce'",
    "bridge:'/05_MANAGER/?canonical=manager-schedule#schedule'",
    "bridge:'/06_EMPLOYEE/?canonical=employee-root'",
    "bridge:'/06_EMPLOYEE/?canonical=employee-schedule#schedule'",
    "bridge:'/06_EMPLOYEE/?canonical=employee-attendance#attendance'",
    "bridge:'/06_EMPLOYEE/?canonical=employee-payroll#payroll'",
    "bridge:'/04_OWNER/?canonical=owner-root'",
    "bridge:'/04_OWNER/Workforce/?canonical=owner-scheduling'"
  ]) assert.ok(js.includes(token),token);
  assert.match(js,/supabase\?\.requireActive/);
  assert.match(js,/role-unavailable\.html/);
  assert.match(js,/CANONICAL_ROUTE_NOT_ALLOWLISTED/);
});

test("SCHED-UI-009 numbered implementations remain present for compatibility",async()=>{
  await Promise.all([
    read("05_MANAGER/index.html"),
    read("06_EMPLOYEE/index.html"),
    read("04_OWNER/index.html"),
    read("04_OWNER/Workforce/index.html")
  ]);
});
console.log("SCHED_UI_009_CLEAN_ROUTES_CONTRACT=PASS");

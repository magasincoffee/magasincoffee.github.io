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

test("SCHED-UI-009 clean route entrypoints are thin guarded adapters",async()=>{
  for(const [path,key] of routes){
    const html=await read(path);
    assert.match(html,/canonical-role-route-v1\.js\?v=20261003-sched-ui-009/);
    assert.match(html,new RegExp('data-route-key="'+key+'"'));
    assert.match(html,/shared-core-v1\.js\?v=20261003-sched-ui-009/);
    assert.doesNotMatch(html,/<iframe\b/i);
    assert.doesNotMatch(html,/draft-publish-v1|employee-runtime-v1|manager-runtime-v1|owner-workforce-runtime/i);
  }
});

test("SCHED-UI-009 helper uses a closed route map and fail-closed role checks",async()=>{
  const js=await read("02_CORE/navigation/canonical-role-route-v1.js");
  for(const token of [
    "'manager-root':{roles:['STORE_MANAGER'],target:'/05_MANAGER/'}",
    "'manager-scheduling':{roles:['STORE_MANAGER'],target:'/05_MANAGER/#workforce'}",
    "'manager-schedule':{roles:['STORE_MANAGER'],target:'/05_MANAGER/#schedule'}",
    "'employee-root':{roles:['STAFF','EMPLOYEE'],target:'/06_EMPLOYEE/'}",
    "'employee-schedule':{roles:['STAFF','EMPLOYEE'],target:'/06_EMPLOYEE/#schedule'}",
    "'employee-attendance':{roles:['STAFF','EMPLOYEE'],target:'/06_EMPLOYEE/#attendance'}",
    "'employee-payroll':{roles:['STAFF','EMPLOYEE'],target:'/06_EMPLOYEE/#payroll'}",
    "'owner-root':{roles:['OWNER'],target:'/04_OWNER/'}",
    "'owner-scheduling':{roles:['OWNER'],target:'/04_OWNER/Workforce/'}"
  ]) assert.ok(js.includes(token),token);
  assert.match(js,/supabase\?\.requireActive/);
  assert.match(js,/role-unavailable\.html/);
  assert.match(js,/CANONICAL_ROUTE_NOT_ALLOWLISTED/);
});

test("SCHED-UI-009 preserves numbered implementations and does not cut Auth over yet",async()=>{
  await Promise.all([
    read("05_MANAGER/index.html"),
    read("06_EMPLOYEE/index.html"),
    read("04_OWNER/index.html"),
    read("04_OWNER/Workforce/index.html")
  ]);
  const auth=await read("03_PLATFORM/01_AUTH/index.html");
  assert.doesNotMatch(auth,/["']\/manager\//);
  assert.doesNotMatch(auth,/["']\/employee\//);
  assert.doesNotMatch(auth,/["']\/owner\//);
});
console.log("SCHED_UI_009_CLEAN_ROUTES_CONTRACT=PASS");

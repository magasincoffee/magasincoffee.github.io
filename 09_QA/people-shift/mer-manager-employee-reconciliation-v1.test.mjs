import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read=p=>fs.readFileSync(p,"utf8");
const mer1=read("07_DATABASE/migrations/20260929131500_mer_001_canonical_employee_workforce_profile.sql");
const mer2=read("07_DATABASE/migrations/20260929133000_mer_002_public_workforce_profile_readers.sql");
const managerEngine=read("05_MANAGER/Workforce/engine-v1.js");
const managerContext=read("05_MANAGER/Workforce/manager-context-v1.js");
const staff=read("05_MANAGER/Workforce/staff-projection-v1.js");
const employeeProfile=read("06_EMPLOYEE/profile/engine-v1.js");
const managerRuntime=read("05_MANAGER/runtime/manager-runtime-v1.html");
const employeeApp=read("06_EMPLOYEE/app/employee-v40.html");
const managerEntry=read("05_MANAGER/Workforce/index.html");

const managerModules=[
 "review-v1.js",
 "draft-publish-v1.js",
 "official-v1.js",
 "swap-approval-v1.js",
 "attendance-review-v1.js",
 "staff-projection-v1.js",
 "payroll-self-check-v1.js",
 "cross-store-master-v1.js",
 "cross-store-auto-schedule-v1.js"
].map(name=>read("05_MANAGER/Workforce/"+name));

test("MER-001: one canonical Employee Workforce Profile owns store priority projection",()=>{
 assert.match(mer1,/create or replace function public\.employee_workforce_profile_projection_v1/);
 assert.match(mer1,/priority_store_ids uuid\[\]/);
 assert.match(mer1,/store_priority_updated_at timestamptz/);
 assert.doesNotMatch(mer1,/max\(esp\.store_id\)/);
 assert.match(mer1,/create or replace function public\.list_employee_store_priority_profiles_v1/);
 assert.match(mer1,/create or replace function public\.get_my_store_priority_profile_v1/);
 assert.match(mer1,/create or replace function public\.get_cross_store_weekly_availability_v1/);
 assert.match(mer1,/employee_workforce_profile_projection_v1\(auth\.uid\(\)\)/);
});

test("MER-002: Manager and Employee surfaces consume the same public profile contract",()=>{
 assert.match(mer2,/create or replace function public\.get_my_employee_workforce_profile_v1/);
 assert.match(mer2,/create or replace function public\.list_employee_workforce_profiles_v1/);
 assert.match(staff,/rpc\('list_employee_workforce_profiles_v1'\)/);
 assert.match(employeeProfile,/rpc\('get_my_employee_workforce_profile_v1'\)/);
 assert.doesNotMatch(employeeProfile,/get_my_store_priority_profile_v1/);
 assert.doesNotMatch(employeeProfile,/spq\.error\?null/);
});

test("MER-003: Manager Workforce modules share one context/client and store scope",()=>{
 assert.match(managerEngine,/manager-context-v1\.js\?v=20260929-mer003/);
 assert.match(managerContext,/MAGASIN_MANAGER_WORKFORCE_CONTEXT/);
 assert.match(managerContext,/get_manager_accessible_stores/);
 assert.match(managerContext,/\['OWNER','STORE_MANAGER'\]/);
 for(const module of managerModules){
   assert.match(module,/MAGASIN_MANAGER_WORKFORCE_CONTEXT/);
   assert.doesNotMatch(module,/window\.supabase\.createClient\(/);
 }
});

test("MER-004/005: cross-role UI state and role boundary are explicit",()=>{
 assert.match(managerRuntime,/workforce-cross-role-v1\.css\?v=20260929-mer004/);
 assert.match(employeeApp,/workforce-cross-role-v1\.css\?v=20260929-mer004/);
 assert.match(staff,/wf-state/);
 assert.match(employeeProfile,/wf-state/);
 assert.match(employeeProfile,/backend|Workforce Profile|canonical/i);
 assert.match(managerEntry,/role!=='STORE_MANAGER'/);
 assert.match(managerEntry,/role==='OWNER'/);
});

console.log("MANAGER_EMPLOYEE_RECONCILIATION_V1=PASS");

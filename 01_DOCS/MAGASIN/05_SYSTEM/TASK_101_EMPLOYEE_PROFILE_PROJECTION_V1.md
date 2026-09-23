# TASK-101 — Employee Profile Projection V1

Date: 2026-09-23  
Track: Workforce Operations V1  
Execution mode: MANUAL_WORK  
Workforce Robot: DISABLED

## 1. Result

**TASK-101 = DONE.**

Employee Profile Projection V1 is implemented as a read-only, server-authorized operational projection.

**E2E-14 = PARTIAL / PROFILE SIDE CLOSED.**

TASK-101 proves the profile authorization side:
- Employee reads only own profile projection;
- Employee cross-user profile authority is denied by the canonical role contract;
- Manager profile projection requires ACTIVE STORE_MANAGER authority and canonical requested-store scope;
- Owner uses a separate enterprise scope;
- only operational profile fields are projected;
- missing canonical sources remain unset instead of inferred.

E2E-14 is **not** fully closed because payroll authorization is intentionally downstream in TASK-102/TASK-104.

## 2. Canonical starting point

Required starting main:

`efc50ac50514d23815737679b06bfa643e6f05d6`

At TASK-101 start, main was exactly that SHA and the implementation branch was created from it.

Canonical handoff at start:
- TASK-100 = DONE
- E2E-09 = CLOSED
- E2E-10 = CLOSED
- Workforce current = TASK-101
- Workforce next = TASK-102
- TASK-101 = READY / MANUAL_WORK
- Workforce Robot = DISABLED
- PFC = TASK-068 → TASK-069 unchanged

No valid change from TASK-098→100 or another track was reset/reverted.

## 3. Canonical TASK-101 contract

Source:
- `WORKFORCE_OPERATIONS_V1_EXECUTION_PLAN.md`
- `WORKFORCE_OPERATIONS_V1_ARCHITECTURE.md`
- `WORKFORCE_OPERATIONS_V1_E2E_ACCEPTANCE_CONTRACT.md`
- `02_CORE/contracts/workforce-operations-v1.json`
- `02_CORE/shared/workforce-operations-v1.mjs`

Canonical title:

**Employee Profile Projection V1**

Canonical gate:

**role / scope / privacy tests**

Canonical access model:
- Employee → own profile only;
- Manager → scoped employees only;
- Owner → enterprise scope;
- operational fields only.

Canonical E2E trace:
- E2E-14 Profile/payroll authorization.

TASK-101 closes the profile side only. Payroll truth/authorization is not pulled forward.

## 4. QUESTION — pre-implementation truth

Read-only repository and production inventory established:
- Employee “Thông tin cá nhân” existed but contained static/read-only placeholders;
- the active Employee runtime had no canonical profile engine/reader;
- `profiles` contains username, full_name, email, phone, role, status, access_scope, created_at, updated_at;
- `employee_constraints` is the existing employee primary/allowed-store primitive;
- `employee_grades` is the existing employee-level primitive;
- `employee_constraints.user_id` is unique/primary;
- `employee_grades.user_id` is unique;
- there was no canonical join-date field;
- there was no canonical pay-rule-reference field;
- production at audit time had 7 profiles, 0 employee_constraints and 0 employee_grades.

Therefore TASK-101 does not:
- reinterpret account `created_at` as join date;
- reinterpret `hourly_rate` as a pay-rule reference;
- infer a primary store when no canonical employee constraint exists;
- expose email/access_scope/hourly rate merely because those columns exist.

## 5. Five-Step result

### QUESTION
The authorization contract existed in shared canonical code, but there was no production profile projection RPC or Employee UI binding.

### DELETE
TASK-101 does not introduce:
- Employee cross-user reader;
- client-supplied employee authority for self profile;
- direct browser profile mutation;
- anon profile RPC authority;
- email/access_scope/hourly-rate leakage;
- invented join-date/pay-rule semantics;
- payroll calculation or payroll state.

### SIMPLIFY
One operational projection primitive is reused by:
- Employee self reader;
- Manager/Owner scoped reader.

### ACCELERATE
Reuses:
- `profiles`;
- ACTIVE `employee_constraints`;
- ACTIVE `employee_grades`;
- existing `can_access_store` Manager scope primitive;
- canonical `authorizeWorkforceAccess` role contract.

### AUTOMATE
Only read/reconcile behavior:
- server authorization;
- fail-closed scope;
- UI loading/error/reload reconciliation.

No business mutation or autonomous workflow is added.

## 6. Production migration

Canonical migration:

`07_DATABASE/migrations/20260923061225_task_101_employee_profile_projection_v1.sql`

Production migration:
- version: **20260923061225**
- name: **task_101_employee_profile_projection_v1**

Before production apply, the exact SQL passed live rollback-only validation:

`TASK_101_ROLLBACK_VALIDATION_OK`

Production was applied only after PR-head executable evidence was green.

The provisional Git filename was then reconciled to the exact production version without changing the SQL body, and all final PR-head gates were rerun.

## 7. Server projection primitives

### Internal row primitive

`employee_profile_projection_row_v1(p_user_id)`

Properties:
- SECURITY DEFINER;
- fixed `search_path=public`;
- postgres-only;
- subject role restricted to STAFF/EMPLOYEE;
- read-only.

Operational fields:
- employee_id;
- username;
- full_name;
- phone;
- role;
- profile status;
- primary store from ACTIVE employee_constraints;
- employee level from ACTIVE employee_grades;
- join_date = NULL until a canonical source exists;
- pay_rule_reference = NULL until a canonical source exists.

Not projected:
- email;
- access_scope;
- hourly_rate;
- credentials/secrets;
- payroll amount/state.

### Employee self reader

`get_my_employee_profile_v1()`

Authority:
- uses `auth.uid()`;
- no subject employee parameter;
- profile must exist;
- profile must be ACTIVE;
- role must be STAFF/EMPLOYEE.

Privileges:
- anon: NO
- authenticated: YES
- postgres: YES

### Manager/Owner projection reader

`list_employee_profile_projection_v1(p_store_id)`

Authority:
- actor must exist and be ACTIVE;
- actor role must be STORE_MANAGER or OWNER;
- STORE_MANAGER must provide a store;
- supplied store must pass canonical `can_access_store`;
- STORE_MANAGER subject visibility requires ACTIVE employee_constraints that includes the requested store;
- OWNER may use NULL store for enterprise scope;
- missing employee scope data fails closed instead of being inferred.

Privileges:
- anon: NO
- authenticated: YES
- postgres: YES

## 8. Employee UI

New canonical engine:

`06_EMPLOYEE/profile/engine-v1.js`

Wired into:
- `06_EMPLOYEE/runtime/employee-runtime-v1.html`
- `06_EMPLOYEE/app/employee-v40.html`

Behavior:
- only calls `get_my_employee_profile_v1`;
- no direct `.from('profiles')` path;
- no service-role credential;
- loading/error state clears stale values;
- refresh/reload converges to server truth;
- operational fields render into the existing CÁ NHÂN surface;
- absent primary store/level/join-date sources are visibly marked “Chưa có nguồn chuẩn” rather than fabricated.

## 9. Deterministic authorization/privacy coverage

`09_QA/people-shift/employee-profile-projection-v1.test.mjs` proves:
- Employee self PROFILE_READ allowed;
- Employee cross-user PROFILE_READ denied;
- Manager PROFILE_READ store-scoped;
- Owner profile scope enterprise;
- Employee RPC is self-only and ACTIVE Employee-only;
- Manager reader is ACTIVE-role/store authorized;
- operational allowlist excludes email/access_scope/hourly_rate;
- join_date/pay_rule_reference are deliberately unset;
- all TASK-101 functions have fixed search_path;
- no TASK-101 anon RPC authority;
- no profile/constraint/grade mutation;
- Employee UI is RPC-only.

## 10. Browser E2E

Dedicated browser:

`09_QA/people-shift/employee-profile-projection-browser.mjs`

Marker:

`TASK_101_EMPLOYEE_PROFILE_PROJECTION=PASS`

Executable checks:
1. own operational profile renders;
2. no email/access_scope/hourly-rate/pay-rule internals render;
3. only the parameterless self RPC is used;
4. direct table call count = 0;
5. backend denial clears stale profile state;
6. recovery refresh returns canonical data;
7. reload converges without cross-user state;
8. 390px mobile viewport has no horizontal overflow;
9. browser diagnostics = 0.

The QA fixture uses only local fictional test data and creates no production row.

## 11. One deterministic test defect caught and repaired

Initial branch run:
- run: **35825286039**
- job: **107065540020**

Result:
- 87 tests total;
- 86 passed;
- 1 TASK-101 test failed before browser execution.

Root cause:
- the test expected Owner scope at `result.scope`;
- canonical `authorizeWorkforceAccess` returns success details at `result.detail.scope`.

Repair:
- test assertion aligned to the existing canonical helper shape;
- no business/security implementation was changed;
- no acceptance assertion was removed or weakened.

Reconciled branch push:
- run: **35825450000**
- job: **107066044047**
- Node v20.20.2
- People Shift deterministic: **87/87 PASS**
- TASK-098: PASS
- TASK-099: PASS
- TASK-100: PASS
- TASK-101 marker: PASS
- Manager Workforce: PASS
- Day-10 browser: PASS
- Control Tower: PASS
- failures: 0

## 12. Final PR-head gates

Implementation PR:

**#264 — TASK-101: Employee Profile Projection V1**

Final PR head:

`2c7e85085b75f87698ea2b2215b4055a1f94f23c`

Final PR-event People Shift:
- run: **35825729194**
- job: **107066905980**
- runtime: **Node v20.20.2**
- People Shift deterministic: **87/87 PASS**
- `TASK_098_E2E_08=PASS`
- `TASK_099_EMPLOYEE_ATTENDANCE_UI=PASS`
- `TASK_100_MANAGER_ATTENDANCE_REVIEW=PASS`
- `TASK_101_EMPLOYEE_PROFILE_PROJECTION=PASS`
- Manager Workforce: PASS
- Day-10 browser: PASS
- Control Tower: PASS
- failures: 0

Final PR-event SOP:
- run: **35825729181**
- job: **107066905798**
- SUCCESS

Final push gate on the same head:
- People Shift run: **35825728358**
- job: **107066903030**
- SUCCESS

## 13. Implementation merge

Implementation merge SHA:

`84775ef2f0999953c5189a8c87ef0c45aecf549e`

## 14. Exact post-merge gates

Exact implementation-main People Shift:
- run: **35825868255**
- job: **107067327121**
- exact main SHA: `84775ef2f0999953c5189a8c87ef0c45aecf549e`
- Node v20.20.2
- People Shift deterministic: **87/87 PASS**
- TASK-098: PASS
- TASK-099: PASS
- TASK-100: PASS
- TASK-101: PASS
- Manager Workforce: PASS
- Day-10 browser: PASS
- Control Tower: PASS
- failures: 0

Exact-main SOP:
- run: **35825868158**
- job: **107067326659**
- SUCCESS

Exact-main public asset gates:
- Validate MAGASIN GitHub Pages source: run **35825868079** — SUCCESS
- Pages build/deployment: run **35825868300**
  - build job **107067331460** — SUCCESS
  - deploy job **107067361422** — SUCCESS
  - report job **107067361435** — SUCCESS

## 15. Final production read-only reconciliation

Final observation:

**2026-09-23 06:16:25 UTC / 13:16:25 ICT**

Observed:
- profiles: **7** pre-existing rows;
- ACTIVE profiles: **4**;
- employee_constraints: **0**;
- employee_grades: **0**;
- ACTIVE constraints: **0**;
- ACTIVE grades: **0**;
- TASK-101 functions present: **3**;
- TASK-101 anon executable functions: **0**;
- authenticated direct profile INSERT: **NO**;
- authenticated direct profile UPDATE: **NO**;
- authenticated direct profile DELETE: **NO**.

No persistent production Employee/profile/constraint/grade fixture was created by TASK-101.

## 16. Security Advisor

Pre-apply baseline:
- RLS-enabled/no-policy INFO: **10**;
- mutable search_path WARN: **1**;
- anon SECURITY DEFINER executable WARN: **18**;
- authenticated SECURITY DEFINER executable WARN: **72**.

Post-apply:
- RLS-enabled/no-policy: **10**;
- mutable search_path: **1**, no TASK-101 function;
- anon SECURITY DEFINER executable: **18**, no TASK-101 function;
- authenticated SECURITY DEFINER executable: **74**.

The +2 authenticated SECURITY DEFINER findings are exactly the intended operational read RPCs:
- `get_my_employee_profile_v1`;
- `list_employee_profile_projection_v1`.

Both have fixed search_path and internal authorization. The internal row helper remains postgres-only.

No TASK-101 anon-execution or mutable-search-path regression was introduced.

## 17. Scope boundaries preserved

TASK-101 does **not**:
- define payroll truth;
- calculate payroll;
- expose hourly wage;
- finalize/review payroll;
- implement Employee payroll self-check;
- invent join date;
- invent pay rule;
- create profile mutation/editing authority;
- start TASK-102;
- enable Workforce Robot;
- change PFC.

## 18. Canonical handoff

After closure:
- TASK-101 = **DONE**
- E2E-14 = **PARTIAL / PROFILE SIDE CLOSED**
- payroll side of E2E-14 remains TASK-102/TASK-104
- TASK-102 = **READY / MANUAL_WORK**
- Workforce current task = **TASK-102**
- Workforce next task = **TASK-103**
- Workforce Robot = **DISABLED**
- TASK-102 has **not** started
- PFC current task = **TASK-068**
- PFC next task = **TASK-069**
- PFC state = **UNCHANGED**

The canonical docs/state closure merge SHA is recorded in the closure PR / Work return because a merge commit cannot self-contain its own future SHA.

## TASK-101 result

**DONE / E2E-14 PARTIAL — PROFILE SIDE CLOSED / POST-MERGE GREEN**

# TASK-106 — Workforce Cross-Flow Browser E2E Pack

Date: 2026-09-23  
Track: Workforce Operations V1  
Execution mode: MANUAL_WORK  
Workforce Robot: DISABLED

## 1. Canonical contract

Title: **Workforce Cross-Flow Browser E2E Pack**

Execution-plan goal:

**full availability→publish→swap/give→attendance→payroll scenarios**

Queue gate:

**E2E-01→E2E-16**

TASK-106 is the integration/cross-flow task. Under the canonical handoff from TASK-105, the unresolved payroll cross-flow ownership is:
- E2E-12 Payroll draft source;
- E2E-13 Payroll state / Employee self-check.

TASK-106 does not take E2E-14 authorization/failure-security ownership away from TASK-107. TASK-106 also does not own the final cold/reload release gate reserved for TASK-108.

## 2. Starting point

Required canonical main:

`8397f1707a2b140b37747911061eeedb0958de05`

Starting state:
- TASK-105 = DONE;
- Workforce current = TASK-106;
- Workforce next = TASK-107;
- TASK-106 = READY / MANUAL_WORK;
- E2E-12 = PARTIAL / TASK-102+103 SOURCE+INTEGRATION SIDE CLOSED;
- E2E-13 = PARTIAL / TASK-102+104 STATE+SELF-CHECK SIDE CLOSED;
- E2E-14 = PARTIAL / TASK-101+104 PROFILE+PAYROLL-AUTH READ SIDE CLOSED;
- Workforce Robot = DISABLED;
- PFC = TASK-068 → TASK-069 unchanged.

## 3. Pre-implementation truth

Repository audit established:
- TASK-100 already persists canonical confirmed work time in reviewed attendance;
- TASK-103 production builder `build_payroll_estimate_v1` consumes only reviewed APPROVED/ADJUSTED confirmed attendance and creates ESTIMATED only;
- raw SUBMITTED / NORMAL / NEEDS_REVIEW / REJECTED attendance is excluded;
- builder requires a validated opaque pay-rule reference;
- builder is server-only and browser roles cannot execute it;
- exact payroll logical identity + unchanged source retry returns the existing entry;
- changed source under the same revision fails closed;
- no monetary evaluator/rate semantics exist;
- TASK-104 Employee payroll reader is parameterless/auth.uid self-only;
- TASK-104 Manager reader is store-scoped read-only;
- PAYROLL state contract is ESTIMATED→REVIEWED→FINALIZED→PAID under abstract actor `PAYROLL_AUTHORIZED`;
- live mapping of `PAYROLL_AUTHORIZED` remains explicitly unresolved and MUST NOT be invented.

Production read-only audit before implementation:
- attendance = 0;
- confirmed attendance = 0;
- rejected attendance = 0;
- payroll_entries = 0;
- employee_constraints = 0;
- `build_payroll_estimate_v1`: anon NO / authenticated NO / service_role YES;
- payroll self/scoped readers: anon NO / authenticated YES;
- browser roles have no SELECT/INSERT/UPDATE/DELETE on `payroll_entries`;
- targeted Security Advisor database counts remain 11 / 1 / 18 / 76;
- no TASK-106 migration is required.

## 4. Implementation

TASK-106 adds deterministic cross-flow QA only:
- `09_QA/people-shift/workforce-payroll-cross-flow-fixture.html`
- `09_QA/people-shift/workforce-payroll-cross-flow-fixture.mjs`
- `09_QA/people-shift/workforce-payroll-cross-flow-v1.test.mjs`
- `09_QA/people-shift/workforce-payroll-cross-flow-browser.mjs`
- People Shift CI runs the new browser flow on every relevant push/PR.

The fixture reuses the actual:
- Employee attendance UI engine from TASK-099;
- Manager attendance review UI from TASK-100;
- Employee payroll self-check UI from TASK-104;
- Manager scoped payroll read UI from TASK-104.

The deterministic Node gate reuses canonical TASK-102 helpers:
- `buildPayrollEstimateBasisV1`;
- `validatePayrollTruthTransition`.

The browser fixture loads the canonical JSON contract for PAYROLL state transitions. It does not import the Node-only helper into the browser.

## 5. Executable cross-flow

Sanitized deterministic flow:

1. Employee submits four raw attendance rows.
2. All four begin as NEEDS_REVIEW with no confirmed work time.
3. Manager APPROVE creates 355 confirmed minutes.
4. Manager ADJUST creates 295 revised confirmed minutes.
5. Manager REJECT creates no confirmed work time.
6. One raw NEEDS_REVIEW row remains unconfirmed.
7. Unvalidated pay-rule build fails with `PAY_RULE_NOT_VALIDATED` and creates no payroll entry.
8. Validated payroll build consumes exactly the APPROVED + ADJUSTED rows:
   - item count = 2;
   - confirmed minutes = 650;
   - raw/rejected rows excluded;
   - state = ESTIMATED;
   - monetary amount = NULL.
9. Exact retry returns the same logical payroll entry; no duplicate is created.
10. Employee self-check renders ESTIMATED as **Ước tính**, not FINALIZED.
11. Manager scoped read sees the same ESTIMATED / 650-minute truth read-only.
12. Illegal ESTIMATED→FINALIZED transition is rejected.
13. Sequential contract transitions ESTIMATED→REVIEWED→FINALIZED→PAID are exercised and each state is rendered exactly by the Employee self-check reader/UI.
14. Browser performs no direct table access and never calls the production server-only builder.
15. No rate/formula/monetary semantics are rendered.
16. Abstract `PAYROLL_AUTHORIZED` contract is exercised only as a contract actor; live role mapping remains unresolved/not tested.

## 6. Defects caught during implementation

### Browser helper import defect

First full-head browser attempt:

- run **35869581068**
- job **107209840086**
- failure: TASK-106 browser fixture timed out before initialization.

Root cause:
- the browser fixture imported `02_CORE/shared/workforce-operations-v1.mjs`;
- that canonical helper is intentionally Node-only and imports `node:fs`.

Repair:
- browser fixture now loads `02_CORE/contracts/workforce-operations-v1.json` through the local QA origin;
- deterministic Node tests continue to use the canonical helper directly;
- no production code or guardrail was changed.

### Stale static assertion

After the browser repair, run **35870060407** / job **107211494791** caught one stale test assertion that still expected the old helper-call syntax `actor:"PAYROLL_AUTHORIZED"`.

Repair:
- assertion now verifies the browser contract checks `transition.actors.includes("PAYROLL_AUTHORIZED")`;
- the guard against inventing STORE_MANAGER/OWNER→PAYROLL_AUTHORIZED mapping remains intact.

## 7. Implementation and PR-head evidence

Implementation branch:

`task-106-workforce-cross-flow-e2e`

First fully green executable head before evidence-only commit:

`11de7ffbea01a366cfd096aa7bb6a9e28597323a`

Branch People Shift:
- run **35870261238**
- job **107212193521**
- SUCCESS
- deterministic = **279/279**
- `TASK_106_WORKFORCE_PAYROLL_CROSS_FLOW=PASS`

Implementation PR:

**#274 — TASK-106: Workforce Cross-Flow Browser E2E Pack**

Final implementation PR head:

`4a802119851ad27a3fc3070bfd3c4885a490b264`

PR-head People Shift:
- run **35870574516**
- job **107213262792**
- SUCCESS
- deterministic = **279/279**
- full browser pack = PASS

Implementation merge:

`6b49a9f4fa1e23aede7dae11801db30072a498ed`

## 8. Exact-main failure caught and repaired

The first exact-main People Shift recheck after implementation merge:

- run **35870752068**
- job **107213885698**
- conclusion: **FAILURE**

All deterministic tests and all browser suites before Employee availability were green. The Employee availability suite passed every functional assertion but its browser diagnostics caught:

`TypeError: Cannot read properties of null (reading 'dataset')`

Root cause:
- `host().contentDocument` can exist during an iframe lifecycle transition before `contentDocument.body` exists;
- `availability/engine-v1.js bind()` checked the document object but dereferenced `x.body.dataset` without a body guard;
- this was a pre-existing lifecycle race exposed by the required exact-main full regression, not a payroll/cross-flow semantic failure.

TASK-106 repaired the exact failure rather than rerunning blindly.

Repair:
- `bind()` now fails safely when `!x?.body`;
- the availability semantics, week policy, RPC boundaries and mutation rules are unchanged;
- deterministic regression now locks the body-null guard.

Repair PR:

**#275 — TASK-106: Repair availability iframe lifecycle race**

Repair final PR head:

`d8a7a7480fdb5ea32cd607c2d75764740981e7e4`

Repair branch:
- run **35871043750**
- job **107214911030**
- SUCCESS

Repair PR-head:
- run **35871305342**
- job **107215792737**
- SUCCESS

Repair merge / final executable main:

`52ea11a1f61a05806661b9082f6ffa4e18bf1bef`

## 9. Final exact-main gates

Final exact-main People Shift:
- run **35871619679**
- job **107216860337**
- SUCCESS

Final deterministic totals:
- Workforce contract = **77/77**
- schedule-first = **9/9**
- People Shift = **120/120**
- Control Tower = **74/74**
- total = **280/280**
- failures = **0**

Final browser markers:
- `EMPLOYEE_AVAILABILITY_CANONICAL_BROWSER=PASS`
- `TASK_100_MANAGER_ATTENDANCE_REVIEW=PASS`
- `TASK_104_EMPLOYEE_PAYROLL_SELF_CHECK=PASS`
- `TASK_106_WORKFORCE_PAYROLL_CROSS_FLOW=PASS`
- `MANAGER_WORKFORCE_CANONICAL_BROWSER=PASS`
- `PEOPLE_SHIFT_DAY10_BROWSER_E2E=PASS`
- `CONTROL_TOWER_BROWSER_E2E=PASS`

TASK-106 cross-flow exact-main assertions:
- Employee submits four raw NEEDS_REVIEW rows and zero confirmed work time exists before Manager review;
- Manager APPROVE creates **355** minutes;
- Manager ADJUST creates **295** revised minutes;
- Manager REJECT creates no confirmed work time;
- one raw NEEDS_REVIEW row remains non-confirmed;
- unvalidated pay rule → `PAY_RULE_NOT_VALIDATED`, no payroll persistence;
- payroll basis consumes exactly **2** confirmed/revised items = **650 minutes**;
- raw + rejected attendance is excluded;
- monetary amount remains NULL;
- exact payroll-build retry is idempotent;
- Employee self-check renders ESTIMATED as **Ước tính**, not FINALIZED;
- Manager scoped reader sees the same ESTIMATED / 650-minute truth read-only;
- ESTIMATED→FINALIZED direct skip is rejected;
- REVIEWED, FINALIZED and PAID render exactly through Employee self-check;
- abstract PAYROLL_AUTHORIZED contract is exercised without a live role mapping;
- 0 direct browser table calls;
- 0 browser calls to production `build_payroll_estimate_v1`;
- no rate/formula/monetary output;
- 0 page/console/request/5xx errors.

Pages:
- validation run **35871619719**
- validation job **107216861675**
- SUCCESS
- build/deployment run **35871619799**
- build job **107216870522**
- deploy job **107216948777**
- SUCCESS

## 10. Final production read-only reconciliation

After the final executable merge:
- attendance = **0**
- confirmed attendance = **0**
- rejected attendance = **0**
- payroll_entries = **0**
- employee_constraints = **0**

Privileges:
- `build_payroll_estimate_v1`: anon EXECUTE = NO; authenticated EXECUTE = NO; service_role EXECUTE = YES;
- `get_my_payroll_self_check_v1`: anon NO; authenticated YES;
- `list_scoped_payroll_self_check_v1`: anon NO; authenticated YES;
- `review_attendance_v1`: anon NO; authenticated YES;
- `list_manager_attendance_review_v1`: anon NO; authenticated YES;
- anon/authenticated SELECT/INSERT/UPDATE/DELETE on `payroll_entries` = NO.

Targeted database Security Advisor counts remain:
- RLS enabled/no policy = **11**
- mutable function search_path = **1**
- anon-executable SECURITY DEFINER = **18**
- authenticated-executable SECURITY DEFINER = **76**

An unrelated leaked-password-protection Auth configuration warning remains present and is outside TASK-106 scope.

TASK-106 created no production fixture row, no migration, no production schema mutation and no production data mutation.

## 11. E2E result

### E2E-12 — CLOSED

TASK-106 closes E2E-12 because the executable cross-flow proves:
- raw/rejected attendance does not contribute;
- only reviewed confirmed/revised work time contributes;
- exact source = 355 + 295 = **650 minutes**;
- validated opaque pay-rule evidence is required;
- production payroll builder remains server-only;
- exact retry is idempotent;
- no monetary semantics are invented.

### E2E-13 — CLOSED

TASK-106 closes E2E-13 because the same executable cross-flow proves:
- Employee self-check consumes the payroll truth created from the confirmed-work basis;
- ESTIMATED never renders as FINALIZED;
- invalid state skipping fails closed;
- REVIEWED / FINALIZED / PAID are rendered exactly under the canonical state contract;
- Manager sees the same scoped payroll truth read-only.

The REVIEWED/FINALIZED/PAID transition exercise is a deterministic canonical-contract/backend-mock transition, as allowed by the E2E acceptance contract. TASK-106 does **not** claim a live production payroll state-mutation RPC or a live PAYROLL_AUTHORIZED actor mapping.

### E2E-14 — remains PARTIAL

E2E-14 remains:

**PARTIAL / TASK-101+104 PROFILE+PAYROLL-AUTH READ SIDE CLOSED / TASK-107 PENDING**

TASK-107 retains failure/recovery/security and authorization-negative ownership.

## 12. Scope boundaries preserved

TASK-106 did not:
- add a payroll state mutation RPC;
- map PAYROLL_AUTHORIZED to STORE_MANAGER, OWNER or another live role;
- invent monetary formula or pay rate;
- invent payroll cadence;
- invent overtime/break/rounding;
- invent allowance/bonus/deduction;
- create persistent production fixture rows;
- create/apply a migration;
- start TASK-107;
- enable Workforce Robot;
- modify PFC.

## 13. Canonical handoff

After closure:
- TASK-106 = **DONE**
- E2E-12 = **CLOSED**
- E2E-13 = **CLOSED**
- E2E-14 = **PARTIAL / TASK-101+104 PROFILE+PAYROLL-AUTH READ SIDE CLOSED / TASK-107 PENDING**
- TASK-107 = **READY / MANUAL_WORK**
- Workforce current = **TASK-107**
- Workforce next = **TASK-108**
- TASK-107 has **not** started
- Workforce Robot = **DISABLED**
- PFC current = **TASK-068**
- PFC next = **TASK-069**
- PFC = **UNCHANGED**

The closure merge SHA is recorded in the closure PR / Work return because a commit cannot contain its own future merge SHA.

## TASK-106 result

**DONE / E2E-12 CLOSED / E2E-13 CLOSED / E2E-14 REMAINS PARTIAL FOR TASK-107 / FINAL EXACT-MAIN GREEN**

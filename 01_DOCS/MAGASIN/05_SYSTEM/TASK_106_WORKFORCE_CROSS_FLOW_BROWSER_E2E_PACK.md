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

## 7. Final branch-head executable evidence

Final branch implementation head before PR evidence commit:

`11de7ffbea01a366cfd096aa7bb6a9e28597323a`

People Shift run:
- run **35870261238**
- job **107212193521**
- SUCCESS

Deterministic totals:
- Workforce contract = **77/77**
- schedule-first = **9/9**
- People Shift = **119/119**
- Control Tower = **74/74**
- total = **279/279**
- failures = **0**

Browser markers:
- `TASK_100_MANAGER_ATTENDANCE_REVIEW=PASS`
- `TASK_104_EMPLOYEE_PAYROLL_SELF_CHECK=PASS`
- `TASK_106_WORKFORCE_PAYROLL_CROSS_FLOW=PASS`
- `MANAGER_WORKFORCE_CANONICAL_BROWSER=PASS`
- `PEOPLE_SHIFT_DAY10_BROWSER_E2E=PASS`
- `CONTROL_TOWER_BROWSER_E2E=PASS`

TASK-106 cross-flow browser assertions:
- 4 raw NEEDS_REVIEW rows / zero confirmed before Manager review;
- APPROVED 355 + ADJUSTED 295;
- REJECTED/raw excluded from payroll;
- invalid pay-rule rejected before persistence;
- 2 confirmed/revised items = 650 minutes;
- exact payroll build retry idempotent;
- ESTIMATED self-check not rendered FINALIZED;
- Manager read-only projection sees the same truth;
- illegal state skip rejected;
- REVIEWED / FINALIZED / PAID rendered exactly;
- live PAYROLL_AUTHORIZED mapping remains unresolved/not tested;
- 0 direct table calls;
- 0 browser calls to `build_payroll_estimate_v1`;
- no rate/formula/monetary output;
- 0 page/console/request/5xx browser diagnostics.

## 8. E2E interpretation

On the executable evidence above:

**E2E-12 candidate result: CLOSED pending PR-head + exact-main confirmation.**

Reason:
- same cross-flow begins from real TASK-099/100 UI primitives;
- confirmed/revised work truth is the only accepted payroll source;
- raw and rejected attendance demonstrably do not contribute;
- valid opaque pay-rule evidence is required;
- server build retry is idempotent;
- production builder authority remains server-only.

**E2E-13 candidate result: CLOSED pending PR-head + exact-main confirmation.**

Reason:
- Employee self-check consumes the payroll entry produced by the same cross-flow;
- ESTIMATED is visibly distinct from FINALIZED;
- canonical state machine rejects invalid skip;
- sequential REVIEWED / FINALIZED / PAID states are rendered exactly;
- the test does not claim or invent a live PAYROLL_AUTHORIZED role mapping.

E2E-14 remains **PARTIAL / TASK-101+104 PROFILE+PAYROLL-AUTH READ SIDE CLOSED / TASK-107 PENDING**.

## 9. Scope boundaries preserved

TASK-106 does not:
- add a payroll state mutation RPC;
- map PAYROLL_AUTHORIZED to STORE_MANAGER, OWNER or another live role;
- invent monetary formula or pay rate;
- invent payroll cadence;
- invent overtime/break/rounding;
- invent allowance/bonus/deduction;
- create production fixture rows;
- create/apply a migration;
- start TASK-107;
- enable Workforce Robot;
- modify PFC.

## 10. Closure evidence

Final PR head, implementation PR, merge SHA, exact post-merge gates, final production read-only reconciliation, canonical SoT handoff and closure SHA are recorded at closure.

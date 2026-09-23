# TASK-107 — Workforce Failure / Recovery / Security E2E

Date: 2026-09-23  
Track: Workforce Operations V1  
Execution mode: MANUAL_WORK  
Workforce Robot: DISABLED

## 1. Result

**TASK-107 = DONE.**

Canonical title: **Workforce Failure / Recovery / Security E2E**

TASK-107 closes the remaining E2E-14 authorization/failure-security scope for Employee Profile + Payroll Authorization read paths.

**E2E-14 = CLOSED.**

TASK-108 remains the final Workforce regression/post-merge/cold-reload stability gate and is not started by TASK-107.

## 2. Canonical starting point

Required starting main:

`7c17e11803da60eefd8b129afbe2acddc55a9266`

At release:
- TASK-106 = DONE;
- E2E-12 = CLOSED;
- E2E-13 = CLOSED;
- E2E-14 = PARTIAL / TASK-101+104 PROFILE+PAYROLL-AUTH READ SIDE CLOSED / TASK-107 PENDING;
- Workforce current = TASK-107;
- Workforce next = TASK-108;
- Workforce Robot = DISABLED;
- PFC = TASK-068 → TASK-069 unchanged.

## 3. Canonical responsibility and scope guard

Execution-plan goal:

**reload, retry, idempotency, permission, failure isolation, timezone/week-boundary**

E2E-14 acceptance:

- Employee A cannot read Employee B profile/payroll;
- Manager reads only allowed store scope;
- Owner scope remains separate;
- invalid/stale/unresolved read data fails closed;
- refresh/reload recovers canonical read truth without stale or cross-user state;
- browser remains RPC-only for the protected profile/payroll read flow;
- no live `PAYROLL_AUTHORIZED` role mapping is invented;
- no pay rate, monetary formula, payroll cadence, overtime, break, rounding, allowance, bonus or deduction rule is invented.

TASK-107 does not start TASK-108, enable Workforce Robot, or change the PFC queue.

## 4. Reuse-first implementation

TASK-107 reuses TASK-101/104/106 primitives and adds only the failure/recovery/security delta.

Changed read surfaces now reject malformed canonical projections before rendering:
- `06_EMPLOYEE/profile/engine-v1.js`;
- `06_EMPLOYEE/payroll/engine-v1.js`;
- `05_MANAGER/Workforce/staff-projection-v1.js`;
- `05_MANAGER/Workforce/payroll-self-check-v1.js`.

New deterministic/browser evidence:
- `09_QA/people-shift/workforce-failure-recovery-security-v1.test.mjs`;
- `09_QA/people-shift/workforce-failure-recovery-security-browser.mjs`;
- `09_QA/people-shift/workforce-failure-recovery-security-fixture.html`;
- `09_QA/people-shift/workforce-failure-recovery-security-fixture.js`.

People Shift CI now runs the TASK-107 browser gate.

No database migration was required.

## 5. Deterministic security contract

Executable deterministic evidence proves:
- Employee PROFILE_READ/PAYROLL_READ is self-only;
- cross-user Employee access returns `CROSS_USER_DENY`;
- Manager PROFILE_READ/PAYROLL_READ is store-scoped;
- cross-store Manager access returns `STORE_SCOPE_DENY`;
- Owner read scope is separate enterprise scope;
- Manager PAYROLL_REVIEW remains `EXPLICIT_PERMISSION_REQUIRED`;
- self readers derive subject from `auth.uid()`;
- scoped readers retain `can_access_store`;
- target RPCs remain anon-denied and authenticated-enabled;
- read UIs contain no `service_role`, no direct `profiles`/`payroll_entries` fallback, and no `PAYROLL_AUTHORIZED` mapping;
- payroll projection accepts only ESTIMATED/REVIEWED/FINALIZED/PAID with valid nonnegative confirmed-work counts;
- unresolved profile fields remain explicit;
- monetary/pay semantics remain absent;
- Asia/Ho_Chi_Minh Monday→Sunday and next-week semantics remain unchanged.

## 6. Browser E2E evidence

The sanitized in-memory TASK-107 fixture proves:
1. normal Employee self + Manager store-scoped reads;
2. Employee cannot supply another subject id to self readers;
3. Manager cross-store reads fail closed;
4. Owner scope remains separate;
5. Employee profile read failure clears stale profile only and does not corrupt payroll state;
6. malformed Employee profile projection fails closed and recovers on refresh;
7. unresolved profile fields stay explicit;
8. malformed/unknown Employee payroll state fails closed and recovers;
9. Manager cross-store denial clears stale profile/payroll rows and allowed-store refresh recovers;
10. malformed Manager profile/payroll projections fail closed;
11. repeated refresh is idempotent/read-only;
12. reload re-reads canonical scoped state with no cross-user/stale leakage;
13. browser diagnostics report zero page, console, request and HTTP-5xx failures.

Browser marker:

`TASK_107_WORKFORCE_FAILURE_RECOVERY_SECURITY=PASS`

No persistent production fixture is used.

## 7. Implementation PR and PR-head gate

Implementation PR:

**#277 — TASK-107: Workforce Failure / Recovery / Security E2E**

Final implementation PR head:

`3cd3ed9571b29ac69e9892012e42d1a47be821ff`

PR-head People Shift:
- run **35874674906**;
- job **107227400674**;
- conclusion **SUCCESS**;
- TASK-107 browser step **SUCCESS**;
- full relevant browser/regression pack **SUCCESS**.

Implementation merge:

`313efd034980819772ab19ac44582a67eb087dd5`

## 8. Exact post-merge executable gates

Exact implementation-main People Shift:
- SHA: `313efd034980819772ab19ac44582a67eb087dd5`;
- run **35875096691**;
- job **107228834872**;
- conclusion **SUCCESS**.

Deterministic exact-main totals:
- Workforce contract: **77/77**;
- schedule-first: **9/9**;
- People Shift: **126/126**;
- Control Tower: **74/74**;
- total: **286/286**;
- failures: **0**.

Relevant exact-main browser markers:
- `TASK_101_EMPLOYEE_PROFILE_PROJECTION=PASS`;
- `TASK_104_EMPLOYEE_PAYROLL_SELF_CHECK=PASS`;
- `TASK_106_WORKFORCE_PAYROLL_CROSS_FLOW=PASS`;
- `TASK_107_WORKFORCE_FAILURE_RECOVERY_SECURITY=PASS`;
- `MANAGER_WORKFORCE_CANONICAL_BROWSER=PASS`.

Pages:
- source validation run **35875096700** — **SUCCESS**;
- build/deployment run **35875095130** — **SUCCESS**.

## 9. Live production read-only reconciliation

Live audit performed after implementation merge with no mutation.

Observed:
- profiles = **7**;
- ACTIVE profiles = **4**;
- employee_constraints = **0**;
- payroll_entries = **0**;
- attendance = **0**.

Target readers:
- `get_my_employee_profile_v1`: SECURITY DEFINER, fixed `search_path=public`, anon execute = false, authenticated execute = true;
- `list_employee_profile_projection_v1`: same execution boundary;
- `get_my_payroll_self_check_v1`: same execution boundary;
- `list_scoped_payroll_self_check_v1`: same execution boundary.

Base-table observation:
- `payroll_entries`: anon/authenticated SELECT and authenticated INSERT/UPDATE/DELETE are denied;
- `profiles`: authenticated SELECT exists under pre-existing RLS; `profiles_select` allows only `id = auth.uid()` or Owner; authenticated INSERT/DELETE are denied and UPDATE is Owner-gated by RLS.
- canonical TASK-107 browser read path still uses only the server-authorized RPC projections and never falls back to direct table access.

No production fake Employee/profile/payroll/attendance row was created.

## 10. Security Advisor reconciliation

Post-implementation live Security Advisor baseline:
- RLS enabled / no policy: **11**;
- mutable search_path: **1**;
- anon-executable SECURITY DEFINER: **18**;
- authenticated-executable SECURITY DEFINER: **76**;
- leaked-password-protection warning: **1**.

This is unchanged from the TASK-104/105/106 targeted baseline for TASK-107. The existing unrelated findings are not claimed as resolved.

No TASK-107 migration, new RPC, anon authority, or database privilege delta was introduced.

## 11. E2E-14 closure

TASK-101 established profile projection authorization.  
TASK-104 established payroll self/scoped read authorization.  
TASK-107 adds executable cross-role failure/recovery/security proof over both paths.

Therefore:

**E2E-14 = CLOSED — SELF / STORE / OWNER SEPARATION + FAILURE/RECOVERY/INVALID-STATE + RPC-ONLY SECURITY BOUNDARY EXECUTABLY PROVEN.**

TASK-108 still owns the final Workforce-wide regression, exact-main recheck and cold/reload stability gate. This does not reopen E2E-14.

## 12. Canonical handoff

After TASK-107 closure:
- TASK-107 = **DONE**;
- E2E-12 = **CLOSED**;
- E2E-13 = **CLOSED**;
- E2E-14 = **CLOSED**;
- TASK-108 = **READY / MANUAL_WORK**;
- TASK-108 = **NOT STARTED**;
- Workforce Robot = **DISABLED**;
- PFC current = **TASK-068**;
- PFC next = **TASK-069**;
- PFC = **UNCHANGED**.

The documentation/source-of-truth closure merge SHA is recorded by the closure PR because a commit cannot contain its own future merge SHA.

## TASK-107 result

**DONE / E2E-14 CLOSED / EXACT POST-MERGE EXECUTABLE GREEN / LIVE READ-ONLY SECURITY RECONCILED**

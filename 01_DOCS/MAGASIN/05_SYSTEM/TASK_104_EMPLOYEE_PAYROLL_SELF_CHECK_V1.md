# TASK-104 — Employee Payroll Self-Check V1

Date: 2026-09-23  
Track: Workforce Operations V1  
Execution mode: MANUAL_WORK  
Workforce Robot: DISABLED

## 1. Result

**TASK-104 = DONE.**

TASK-104 implements the canonical payroll self-check/read authorization boundary without inventing monetary payroll policy or payroll state-transition authority.

Canonical behavior now proven:

- Employee payroll read is self-only and derives the subject from `auth.uid()`;
- Employee cannot supply another employee id to the self reader;
- Manager payroll read is read-only and store-scoped;
- Owner read scope remains separate/enterprise-capable;
- Manager PAYROLL_REVIEW remains explicitly permission-gated and is not granted by TASK-104;
- no PAYROLL_AUTHORIZED live-role mapping is created;
- ESTIMATED is rendered distinctly from FINALIZED;
- browser surfaces do not directly access `payroll_entries`;
- no monetary value, pay rate, allowance, bonus, deduction, overtime, break, rounding or payroll cadence is invented.

E2E status after TASK-104:

- **E2E-13 = PARTIAL / TASK-102+104 STATE+SELF-CHECK SIDE CLOSED**
- full cross-role proof remains TASK-106
- **E2E-14 = PARTIAL / TASK-101+104 PROFILE+PAYROLL-AUTH READ SIDE CLOSED**
- failure/recovery/security completion remains TASK-107
- E2E-12 remains **PARTIAL / TASK-102+103 SOURCE+INTEGRATION SIDE CLOSED**
- E2E-12 cross-flow proof remains TASK-106

TASK-104 does not claim E2E-13 or E2E-14 fully CLOSED.

## 2. Canonical starting point

Required starting main:

`02f867c475efda19b0c0119fae6d350aa72bfd10`

At start:

- TASK-103 = DONE
- E2E-12 = PARTIAL / TASK-102+103 SOURCE+INTEGRATION SIDE CLOSED
- E2E-13 = PARTIAL / STATE-CONTRACT SIDE CLOSED
- E2E-14 = PARTIAL / PROFILE SIDE CLOSED
- Workforce current = TASK-104
- Workforce next = TASK-105
- TASK-104 = READY / MANUAL_WORK
- Workforce Robot = DISABLED
- PFC = TASK-068 → TASK-069 unchanged

The latest main was exactly the required TASK-103 closure SHA before the TASK-104 implementation branch was created.

## 3. Canonical TASK-104 contract

Canonical title:

**Employee Payroll Self-Check V1**

Execution-plan goal:

**employee sees own hours/pay states; Manager sees scoped review; no cross-user leak**

TASK-104 ownership is authorization + read/self-check visibility. It does not own monetary calculation or payroll state mutation.

Canonical state machine remains:

- ESTIMATED
- REVIEWED
- FINALIZED
- PAID

TASK-104 renders those states exactly and never coerces ESTIMATED into FINALIZED.

## 4. Pre-implementation repository/live truth

Repository evidence from TASK-091→103 established:

- Employee has canonical `PAYROLL_READ` self authority;
- Manager `PAYROLL_REVIEW` is explicit-permission-gated;
- TASK-103 persists canonical ESTIMATED payroll basis in `payroll_entries`;
- TASK-103 builder is server-only;
- legacy attendance.amount and rate-like fields are not payroll truth;
- canonical monetary evaluator remains unresolved.

Live read-only audit before implementation found:

- `payroll_entries = 0`;
- `employee_constraints = 0`;
- no TASK-104 payroll read projection functions;
- anon/authenticated had no direct payroll table DML;
- existing TASK-103 builder remained server-only.

No production fixture was required or created.

## 5. Five-Step result

### QUESTION

What is the smallest TASK-104 implementation that proves self/scoped payroll visibility without inventing payroll policy?

Answer:

- one parameterless Employee self reader;
- one Manager/Owner scoped read-only reader;
- exact-state UI projection;
- fail-closed stale-data clearing;
- executable deterministic/browser evidence.

### DELETE

TASK-104 does not add:

- monetary formula;
- pay-rate semantics;
- payroll cadence;
- overtime;
- breaks;
- rounding;
- allowances;
- bonuses;
- deductions;
- PAYROLL_AUTHORIZED mapping;
- REVIEWED/FINALIZED/PAID mutation;
- direct browser payroll table access;
- duplicate payroll persistence.

### SIMPLIFY

Two server-authorized read projections over the existing TASK-103 `payroll_entries` truth.

### ACCELERATE

Reuse:

- TASK-091 role/access contract;
- TASK-101 `employee_constraints` and store-scope model;
- existing `can_access_store`;
- TASK-102 payroll state semantics;
- TASK-103 payroll persistence;
- existing Employee and Manager runtime shells.

### AUTOMATE

Only safe read-side behavior:

- self-only subject derivation;
- scoped Manager/Owner filtering;
- exact-state display;
- stale-row clearing on server denial;
- deterministic/browser regression gates.

## 6. Canonical contract delta

`02_CORE/contracts/workforce-operations-v1.json`

Added TASK-104 self-check contract while preserving historical TASK-102 provenance fields.

Locked semantics:

- Employee reader = `get_my_payroll_self_check_v1`;
- scoped reader = `list_scoped_payroll_self_check_v1`;
- Employee authority = ACTIVE STAFF/EMPLOYEE + auth.uid self-only;
- Manager authority = ACTIVE STORE_MANAGER + `can_access_store` + ACTIVE employee scope;
- Owner authority = separate enterprise/store-filtered read-only;
- monetary fields = absent until canonical monetary evaluator exists;
- state display = exact canonical state;
- TASK-104 mutation authority = NONE;
- Manager review authority = not granted.

The shared pure access helper now recognizes Manager `PAYROLL_READ` as store-scoped while keeping `PAYROLL_REVIEW` explicit-permission-gated.

## 7. Production migration

Canonical repository migration:

`07_DATABASE/migrations/20260923110608_task_104_employee_payroll_self_check_v1.sql`

Production migration:

**20260923110608_task_104_employee_payroll_self_check_v1**

New read-only functions:

### `get_my_payroll_self_check_v1()`

- requires `auth.uid()`;
- profile must exist;
- profile status must be ACTIVE;
- role must be STAFF/EMPLOYEE;
- employee id is never accepted from the client;
- reads only rows where `payroll_entries.employee_id = auth.uid()`;
- SECURITY DEFINER;
- fixed `search_path=public`;
- anon execute = false;
- authenticated execute = true.

### `list_scoped_payroll_self_check_v1(p_store_id uuid)`

- requires `auth.uid()`;
- actor profile must exist and be ACTIVE;
- actor role must be STORE_MANAGER or OWNER;
- STORE_MANAGER requires a store id;
- supplied store id must pass canonical `can_access_store`;
- Employee subjects are constrained through ACTIVE `employee_constraints`;
- Owner may use enterprise scope with null store;
- SECURITY DEFINER;
- fixed `search_path=public`;
- anon execute = false;
- authenticated execute = true.

Neither function mutates payroll state.

## 8. Projection allowlist

Employee projection exposes:

- payroll_entry_id;
- period_start;
- period_end;
- payroll_revision;
- state;
- confirmed_work_item_count;
- confirmed_work_minutes;
- updated_at.

Scoped Manager projection additionally exposes:

- employee_id;
- employee_name.

It does not expose:

- pay_rule_reference;
- pay_rule_validated;
- confirmed_work_source_revision;
- monetary amount;
- rate internals;
- payroll mutation authority.

## 9. Employee UI

Canonical implementation:

`06_EMPLOYEE/payroll/engine-v1.js`

Runtime wiring:

`06_EMPLOYEE/runtime/employee-runtime-v1.html`

Behavior:

- adds Employee payroll self-check surface;
- uses only `get_my_payroll_self_check_v1()`;
- self RPC has no subject employee parameter;
- distinguishes ESTIMATED / REVIEWED / FINALIZED / PAID;
- explicitly states ESTIMATED is not FINALIZED;
- does not display a synthetic monetary amount;
- empty payroll set is valid;
- server denial clears stale rows;
- refresh/recovery re-reads canonical server truth;
- no direct `payroll_entries` browser table call.

## 10. Manager UI

Canonical implementation:

`05_MANAGER/Workforce/payroll-self-check-v1.js`

Wiring:

`05_MANAGER/Workforce/engine-v1.js`

Behavior:

- uses existing accessible-store selector;
- calls only `list_scoped_payroll_self_check_v1(p_store_id)`;
- renders read-only payroll state + confirmed work summary;
- scope denial clears stale rows;
- does not expose review/finalize/paid mutation controls;
- explicitly warns that PAYROLL_REVIEW/state transition authority is not granted;
- no direct payroll table browser access.

## 11. Deterministic tests

TASK-104 targeted test:

`09_QA/people-shift/employee-payroll-self-check-v1.test.mjs`

It proves:

- Employee PAYROLL_READ self-only;
- cross-user Employee deny;
- Manager PAYROLL_READ store-scoped;
- Owner PAYROLL_READ enterprise scope;
- Manager PAYROLL_REVIEW still requires explicit permission;
- Employee reader uses auth.uid and no subject parameter;
- scoped reader uses role/status/store authority;
- projections hide monetary/pay-rule internals;
- migration is read-only;
- UI is RPC-only;
- canonical state display is preserved;
- E2E-13/E2E-14 task ownership remains explicit.

Final deterministic post-merge counts:

- Workforce contract: **77/77**
- schedule-first: **9/9**
- People Shift: **105/105**
- Control Tower: **74/74**
- total: **265/265**
- failures: **0**

## 12. Browser E2E

Fixture:

- `09_QA/people-shift/employee-payroll-self-check-fixture.html`
- `09_QA/people-shift/employee-payroll-self-check-fixture.js`

Browser gate:

`09_QA/people-shift/employee-payroll-self-check-browser.mjs`

Executable acceptance proves:

- Employee self reader is parameterless/RPC-only;
- ESTIMATED and FINALIZED render distinctly;
- no monetary or pay-rule internals render;
- Employee server denial clears stale payroll rows and recovery converges;
- Manager reader supplies store id and is RPC-only;
- STORE_NOT_ALLOWED clears stale Manager payroll rows;
- Manager UI has no transition controls;
- 390px mobile layout has no horizontal overflow;
- browser diagnostics are clean.

Marker:

`TASK_104_EMPLOYEE_PAYROLL_SELF_CHECK=PASS`

## 13. Failures caught and repaired before final PR head

### Failure 1 — historical TASK-102 provenance rewrite

Run:

- People Shift **35851656012**
- job **107150515923**

The first TASK-104 contract edit changed a TASK-102-owned provenance field.

Repair:

- restored the exact historical TASK-102 value;
- kept TASK-104 semantics in the new self-check contract.

No authority was weakened.

### Failure 2 — browser fixture did not navigate to the new view

Run:

- People Shift **35851816414**
- job **107151039275**

The view existed but remained hidden because the QA scenario had not exercised the navigation control.

Repair:

- browser E2E now clicks the real Employee/Manager payroll navigation controls before asserting visibility.

### Failure 3 — test-only false positives

Run:

- People Shift **35851989000**
- job **107151599958**

Causes:

- overly broad Unicode money scanner;
- explanatory text mentioning review/finalize was incorrectly treated as a mutation control.

Repair:

- scanner now detects numeric money output;
- mutation test inspects actual button controls.

No backend authority or production migration behavior changed.

## 14. Rollback-only migration validation

Before persistent apply, the exact migration SQL was executed inside a transaction and rolled back.

Inside transaction:

- Employee reader existed;
- scoped reader existed;
- both had anon execute = false;
- both had authenticated execute = true.

After rollback:

- both TASK-104 functions were absent;
- `payroll_entries` remained 0.

No persistent validation row/schema was left behind.

## 15. Implementation PR

Implementation PR:

**#270 — TASK-104: Employee Payroll Self-Check V1**

Final PR head after production-version filename reconciliation:

`0ebccd1ef6857d3ec3d230c2349ff137b11e122c`

Final PR-head gates:

- Business OS run **35852662444**
- job **107153751813**
- SUCCESS

- People Shift run **35852662604**
- job **107153752386**
- SUCCESS

PR-head relevant checks:

- Node v20.20.2;
- 77/77 Workforce contract;
- 9/9 schedule-first;
- 105/105 People Shift;
- 74/74 Control Tower;
- 265/265 deterministic total;
- `TASK_104_EMPLOYEE_PAYROLL_SELF_CHECK=PASS`;
- full relevant browser pack PASS;
- failures 0.

Implementation merge SHA:

`7fe4ed6be08c32cebc4772eccb7c45a6178bed33`

## 16. Production apply + live read-only reconciliation

Production migration applied successfully as:

**20260923110608_task_104_employee_payroll_self_check_v1**

Final read-only reconciliation at:

**2026-09-23 12:54:53 UTC / 19:54:53 ICT**

Observed:

- payroll_entries = **0**;
- payroll state counts = empty;
- employee_constraints = **0**;
- active employee_constraints = **0**;
- Employee reader SECURITY DEFINER = true;
- Employee reader search_path = public;
- Employee reader anon execute = false;
- Employee reader authenticated execute = true;
- Employee reader uses auth.uid;
- scoped reader SECURITY DEFINER = true;
- scoped reader search_path = public;
- scoped reader anon execute = false;
- scoped reader authenticated execute = true;
- scoped reader uses auth.uid;
- scoped reader uses `can_access_store`;
- scoped reader uses `employee_constraints`;
- anon payroll table SELECT/INSERT/UPDATE/DELETE = false;
- authenticated payroll table SELECT/INSERT/UPDATE/DELETE = false.

No fake production payroll row was created.

## 17. Security Advisor

Pre-TASK-104 scoped baseline:

- RLS-enabled/no-policy = 11;
- mutable search_path = 1;
- anon SECURITY DEFINER executable = 18;
- authenticated SECURITY DEFINER executable = 74.

Post-TASK-104:

- RLS-enabled/no-policy = 11;
- mutable search_path = 1;
- anon SECURITY DEFINER executable = 18;
- authenticated SECURITY DEFINER executable = 76;
- leaked password protection warning = 1.

Expected scoped delta:

- authenticated SECURITY DEFINER executable **+2** for the two intended TASK-104 authenticated read RPCs.

No anon execution regression and no mutable-search-path regression was introduced.

Existing unrelated Security Advisor debt remains open and is not claimed as resolved.

## 18. Exact post-merge main gates

Exact implementation main:

`7fe4ed6be08c32cebc4772eccb7c45a6178bed33`

Post-merge gates:

- Business OS run **35863208963**
- job **107188248870**
- SUCCESS

- People Shift run **35863209080**
- job **107188249831**
- SUCCESS

- Pages source validation run **35863208908**
- job **107188248939**
- SUCCESS

- Pages build/deployment run **35863207656**
- build job **107188249666**
- deploy job **107188311389**
- SUCCESS

Exact-main People Shift markers:

- TASK_099_EMPLOYEE_ATTENDANCE_UI=PASS
- TASK_100_MANAGER_ATTENDANCE_REVIEW=PASS
- TASK_101_EMPLOYEE_PROFILE_PROJECTION=PASS
- TASK_104_EMPLOYEE_PAYROLL_SELF_CHECK=PASS
- MANAGER_WORKFORCE_CANONICAL_BROWSER=PASS
- PEOPLE_SHIFT_DAY10_BROWSER_E2E=PASS
- CONTROL_TOWER_BROWSER_E2E=PASS

## 19. E2E ownership after TASK-104

### E2E-13 — Payroll state / employee self-check

TASK-104 now has executable evidence that:

- Employee self-check reads own payroll only;
- ESTIMATED/REVIEWED/FINALIZED/PAID are rendered distinctly;
- ESTIMATED is not rendered as FINALIZED.

TASK-106 still owns full cross-role chain evidence.

Therefore:

**E2E-13 remains PARTIAL / TASK-102+104 STATE+SELF-CHECK SIDE CLOSED / TASK-106 PENDING.**

### E2E-14 — Profile/payroll authorization

TASK-101 + TASK-104 now have executable evidence for:

- Employee self-only profile/payroll boundaries;
- Manager scoped profile/payroll reads;
- separate Owner scope;
- server-enforced authorization;
- no direct browser payroll DML.

TASK-107 still owns failure/recovery/security E2E completion.

Therefore:

**E2E-14 remains PARTIAL / TASK-101+104 PROFILE+PAYROLL-AUTH READ SIDE CLOSED / TASK-107 PENDING.**

## 20. Scope boundaries preserved

TASK-104 does not:

- calculate monetary payroll;
- infer pay rates;
- invent pay-rule semantics;
- invent payroll cadence;
- invent overtime/break/rounding;
- invent allowance/bonus/deduction;
- map PAYROLL_AUTHORIZED to a live role;
- implement payroll review/finalize/paid mutation;
- start TASK-105;
- enable Workforce Robot;
- modify PFC.

## 21. Canonical handoff

After closure:

- TASK-104 = **DONE**
- E2E-12 = **PARTIAL / TASK-102+103 SOURCE+INTEGRATION SIDE CLOSED / TASK-106 PENDING**
- E2E-13 = **PARTIAL / TASK-102+104 STATE+SELF-CHECK SIDE CLOSED / TASK-106 PENDING**
- E2E-14 = **PARTIAL / TASK-101+104 PROFILE+PAYROLL-AUTH READ SIDE CLOSED / TASK-107 PENDING**
- TASK-105 = **READY / MANUAL_WORK**
- Workforce current = **TASK-105**
- Workforce next = **TASK-106**
- TASK-105 has **not** started
- Workforce Robot = **DISABLED**
- PFC current = **TASK-068**
- PFC next = **TASK-069**
- PFC = **UNCHANGED**

The closure merge SHA is recorded in the closure PR/return because a commit cannot contain its own future merge SHA.

## TASK-104 result

**DONE / E2E-13 TASK-102+104 STATE+SELF-CHECK SIDE CLOSED / E2E-14 TASK-101+104 PROFILE+PAYROLL-AUTH READ SIDE CLOSED / POST-MERGE GREEN**

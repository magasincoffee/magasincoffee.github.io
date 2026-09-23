# TASK-103 — Payroll Calculation Integration V1

Date: 2026-09-23  
Track: Workforce Operations V1  
Execution mode: MANUAL_WORK  
Workforce Robot: DISABLED

## 1. Result

**TASK-103 = DONE.**

Payroll Calculation Integration V1 now persists a canonical **ESTIMATED payroll calculation basis** from reviewed confirmed work time plus an explicitly validated opaque pay-rule reference.

TASK-103 deliberately does **not** invent or calculate a monetary payroll amount because the canonical pay-rate/pay-rule evaluator remains unresolved.

E2E status:
- **E2E-12 = PARTIAL / TASK-102+103 SOURCE+INTEGRATION SIDE CLOSED**
- cross-flow E2E proof remains TASK-106
- **E2E-13 = PARTIAL / STATE-CONTRACT SIDE CLOSED**
- Employee self-check remains TASK-104/TASK-106
- **E2E-14 = PARTIAL / PROFILE SIDE CLOSED**
- payroll authorization/self-check remains TASK-104/TASK-107

TASK-103 is an E2E-12 closing task. It is not an E2E-13 or E2E-14 closing task.

## 2. Canonical starting point

Required starting main:

`0e425d66d2bab65308c16120efa8cc9f40ee2117`

At start:
- TASK-102 = DONE
- E2E-12 = PARTIAL / TRUTH-CONTRACT SIDE CLOSED
- E2E-13 = PARTIAL / STATE-CONTRACT SIDE CLOSED
- E2E-14 = PARTIAL / PROFILE SIDE CLOSED
- Workforce current = TASK-103
- Workforce next = TASK-104
- TASK-103 = READY / MANUAL_WORK
- Workforce Robot = DISABLED
- PFC = TASK-068 → TASK-069 unchanged

Main was exactly the required SHA before the TASK-103 branch was created.

## 3. Canonical TASK-103 contract

Canonical title:

**Payroll Calculation Integration V1**

Execution-plan goal:

**deterministic payroll draft only from confirmed work time + valid pay rule**

Gate:

**confirmed-work-time only**

Canonical payroll prerequisites inherited from TASK-102:
- PAYROLL_PERIOD
- VALID_PAY_RULE
- CONFIRMED_WORK_TIME

Canonical states:
- ESTIMATED
- REVIEWED
- FINALIZED
- PAID

TASK-103 integrates draft calculation input and ESTIMATED persistence only.

## 4. QUESTION — pre-implementation truth

Repository evidence from TASK-090/091/102 established:
- no Workforce payroll table/RPC/module existed;
- legacy attendance.amount is not payroll truth;
- legacy attendance.hourly_rate is not payroll truth;
- legacy attendance.hours_worked is not payroll truth;
- employee_grades.hourly_rate is not a canonical pay-rule reference;
- confirmed work time from TASK-100 is the required attendance-side payroll source;
- TASK-102 locked the pay-rule reference as opaque and required an explicit validity fact;
- payroll rates/allowances/bonuses/deductions remain unresolved configurable gaps.

Live read-only audit at 2026-09-23 09:51:08 UTC found:
- profiles = 7;
- attendance = 0;
- employee_grades = 0;
- employee_constraints = 0;
- no Workforce payroll persistence/function existed.

Therefore a monetary calculation would have required inventing unsupported business semantics.

## 5. Five-Step result

### QUESTION
What can TASK-103 integrate without inventing payroll policy?

Answer:
- confirmed-work-time aggregation;
- period identity;
- opaque validated pay-rule reference;
- deterministic ESTIMATED revision identity;
- server-only persistence;
- retry/concurrency semantics.

### DELETE
TASK-103 does not use:
- attendance.amount;
- attendance.hourly_rate;
- attendance.hours_worked;
- employee_grades.hourly_rate;
- raw submitted attendance;
- rejected attendance;
- planned schedule as payroll truth;
- browser payroll mutation;
- automatic finalization;
- PAYROLL_AUTHORIZED live-role mapping;
- overtime rules;
- break rules;
- rounding rules;
- allowance rules;
- bonus rules;
- deduction rules;
- invented payroll cadence.

### SIMPLIFY
One canonical `payroll_entries` persistence surface and one server-only ESTIMATED builder.

### ACCELERATE
Reuse:
- TASK-100 confirmed work time;
- TASK-102 period contract;
- TASK-102 opaque pay-rule reference;
- TASK-102 revision identity;
- existing canonical Payroll state machine.

### AUTOMATE
Only:
- deterministic confirmed-minute aggregation;
- deterministic source fingerprint;
- advisory lock;
- idempotent exact retry;
- fail-closed revision conflict detection.

## 6. Canonical contract delta

`02_CORE/contracts/workforce-operations-v1.json`

TASK-103 adds `payroll_boundary.calculation_integration_contract`.

Key semantics:
- draft table = `payroll_entries`;
- draft builder = `build_payroll_estimate_v1`;
- TASK-103 draft state = ESTIMATED only;
- browser execution = false;
- server execution = service_role/postgres;
- source = CONFIRMED_WORK_TIME only;
- accepted reviewed attendance source:
  - APPROVED + APPROVE
  - ADJUSTED + ADJUST
- required confirmed/review fields must be present;
- raw/rejected attendance is excluded;
- legacy payroll-like attendance fields are forbidden;
- deterministic aggregate = item count + confirmed minutes + source revision;
- same revision/same source is idempotent;
- changed source under same payroll revision is a conflict;
- changed source requires a new payroll revision;
- monetary amount is not derived without a canonical evaluator;
- no auto-finalization.

TASK-102 provenance fields were preserved unchanged.

## 7. Pure deterministic helper

`02_CORE/shared/workforce-operations-v1.mjs`

Added:

`buildPayrollEstimateBasisV1(...)`

It:
- validates canonical payroll identity;
- validates opaque pay-rule reference;
- requires explicit pay_rule_validated=true;
- requires at least one confirmed-work-time row;
- requires all rows belong to the same employee;
- requires dates inside the payroll period;
- accepts only CONFIRMED/REVISED work-time states;
- requires nonnegative integer confirmed_minutes;
- requires unique source revision identities;
- sorts inputs deterministically;
- aggregates confirmed minutes;
- emits ESTIMATED basis;
- emits monetary_amount = NULL;
- emits reason `CANONICAL_PAY_RULE_EVALUATOR_UNRESOLVED`.

The helper performs no database, RPC, browser or network write.

## 8. Production migration

Repository migration:

`07_DATABASE/migrations/20260923100426_task_103_payroll_calculation_integration_v1.sql`

Production version:

**20260923100426**

Production name:

**task_103_payroll_calculation_integration_v1**

### payroll_entries

New canonical persistence stores:
- id;
- employee_id;
- period_start;
- period_end;
- payroll_revision;
- state;
- pay_rule_reference;
- pay_rule_validated;
- source_type;
- confirmed_work_item_count;
- confirmed_work_minutes;
- confirmed_work_source_revision;
- created_at;
- updated_at.

Logical uniqueness:

`period_start + period_end + employee_id + payroll_revision`

Constraints:
- period_start <= period_end;
- revision nonempty;
- states restricted to canonical Payroll states;
- pay-rule reference nonempty;
- pay_rule_validated=true;
- source_type=CONFIRMED_WORK_TIME;
- item count > 0;
- confirmed minutes >= 0;
- source revision nonempty.

There is deliberately **no monetary amount column**.

RLS is enabled.

PUBLIC / anon / authenticated table privileges are revoked.

## 9. Server-only ESTIMATED builder

`build_payroll_estimate_v1(...)`

Properties:
- SECURITY DEFINER;
- fixed `search_path=public`;
- anon execute = NO;
- authenticated execute = NO;
- service_role execute = YES;
- postgres execute = YES.

It validates:
- employee_id;
- payroll period;
- payroll revision;
- pay-rule reference;
- explicit pay-rule validity fact.

It takes an advisory transaction lock on the payroll logical identity.

It reads only attendance rows that are:
- same employee;
- inside period;
- linked to a schedule;
- submitted;
- reviewed by a reviewer;
- reviewed at a timestamp;
- APPROVED/APPROVE or ADJUSTED/ADJUST;
- confirmed_start/end/minutes present.

It never reads:
- attendance.amount;
- attendance.hourly_rate;
- attendance.hours_worked;
- employee_grades.hourly_rate.

It calculates:
- confirmed-work row count;
- confirmed-work total minutes;
- deterministic source fingerprint.

It does not calculate money.

## 10. Concurrency / idempotency

Identity:

`period_start:period_end:employee_id:payroll_revision`

Under the advisory lock:
- same identity + same pay-rule reference + same source fingerprint/count/minutes returns the existing entry;
- changed source or pay-rule under the same revision raises `PAYROLL_REVISION_CONFLICT`;
- changed source requires a new payroll revision.

No duplicate ESTIMATED truth can be created for the same logical revision.

TASK-103 does not implement REVIEWED/FINALIZED/PAID mutation.

## 11. Deterministic tests

Workforce canonical contract tests increased to **77/77 PASS**.

TASK-103 helper tests prove:
- confirmed/revised source only;
- deterministic order independence;
- raw/rejected/submitted states rejected;
- missing confirmed work rejected;
- invalid pay-rule fact rejected;
- cross-employee source rejected;
- out-of-period source rejected;
- duplicate source revision rejected;
- invalid confirmed minutes rejected;
- monetary amount remains unresolved;
- E2E closing-task ownership is preserved.

People Shift TASK-103 migration tests:
- **9/9 PASS**

They prove:
- canonical persistence + unique identity;
- server-only authority;
- reviewed confirmed source only;
- no executable legacy payroll-like field use;
- explicit validated opaque pay-rule reference;
- advisory lock;
- idempotency and conflict semantics;
- ESTIMATED-only mutation;
- no monetary calculation.

## 12. Pre-PR failures caught and repaired

### Failure 1 — TASK-102 provenance regression

Run:
- People Shift **35845991469**
- job **107132170365**

Cause:
TASK-103 initially replaced a TASK-102 provenance field that canonically remained `TASK-103`.

Repair:
- restored the historical TASK-102 field exactly;
- recorded TASK-103 monetary-evaluator limitation in a new TASK-103 contract field.

No business authority was weakened.

### Failure 2 — forbidden-field static scanner documentation false positive

Run:
- People Shift **35846044650**
- job **107132343174**

Cause:
the static scanner matched `attendance.amount` in a SQL documentation comment, not executable SQL.

### Failure 3 — escaped scanner regex

Run:
- People Shift **35846118927**
- job **107132593690**

Cause:
the first scanner fix wrote the JS regex as a literal escaped character class.

Repair:
- corrected the scanner to strip COMMENT ON blocks before inspecting executable SQL.

No production migration logic was changed to bypass the rule.

## 13. Final branch validation

Business OS:
- run **35846044641**
- job **107132342955**
- SUCCESS.

Final People Shift branch run:
- run **35846176389**
- job **107132788074**
- SUCCESS
- Node v20.20.2
- contract 77/77
- schedule-first 9/9
- People Shift 96/96
- Control Tower 74/74
- total deterministic = **256/256**
- all relevant browser suites PASS
- failures 0.

## 14. Rollback-only production validation

Before persistent apply, the exact migration SQL was run inside a transaction and rolled back.

Inside transaction:
- payroll_entries table existed;
- build_payroll_estimate_v1 function existed;
- anon execute = false;
- authenticated execute = false;
- service_role execute = true.

After rollback:
- table absent;
- function absent.

No persistent row/schema remained from validation.

## 15. Implementation PR

PR:

**#268 — TASK-103: Payroll Calculation Integration V1**

Final implementation head:

`73e83d5a547587a47ec12e3c34aa546b4722f4df`

Final PR-head:
- Business OS run **35846750036**
- job **107134628838**
- SUCCESS
- People Shift run **35846750072**
- job **107134628953**
- SUCCESS
- Node v20.20.2
- contract 77/77
- schedule-first 9/9
- People Shift 96/96
- Control Tower 74/74
- total deterministic **256/256**
- full relevant browser pack PASS
- failures 0.

## 16. Production apply + post-apply reconciliation

Production migration applied successfully as:

**20260923100426_task_103_payroll_calculation_integration_v1**

Post-apply observation:
- payroll_entries = 0;
- attendance = 0;
- confirmed attendance = 0;
- no monetary amount column;
- RLS enabled;
- anon table SELECT/INSERT/UPDATE/DELETE = false;
- authenticated table SELECT/INSERT/UPDATE/DELETE = false;
- builder anon execute = false;
- builder authenticated execute = false;
- builder service_role/postgres execute = true;
- builder fixed search_path=public.

No fake production payroll/attendance row was created.

## 17. Implementation merge

Implementation merge SHA:

`034e0f1d0718382765ee387d10de4e016073bd9c`

## 18. Exact implementation-main verification

Business OS:
- run **35846919733**
- job **107135180637**
- SUCCESS

People Shift:
- run **35846919757**
- job **107135180395**
- exact SHA `034e0f1d0718382765ee387d10de4e016073bd9c`
- Node v20.20.2
- contract 77/77
- schedule-first 9/9
- People Shift 96/96
- Control Tower 74/74
- total deterministic **256/256**
- full relevant browser pack PASS
- failures 0.

Public source/deploy:
- Pages source validation **35846919692** — SUCCESS
- Pages build/deployment **35846917909** — SUCCESS
  - build **107135179722**
  - deploy **107135237289**
  - report **107135237374**

## 19. Final production read-only reconciliation

Observation:

**2026-09-23 10:08:46 UTC / 17:08:46 ICT**

Observed:
- payroll_entries = **0**
- payroll state counts = **empty**
- attendance = **0**
- confirmed attendance = **0**
- amount/pay_amount/gross_pay/net_pay column = **absent**
- authenticated direct payroll DML = **none**
- builder anon/authenticated execution = **false**
- builder service_role/postgres execution = **true**
- builder search_path = **public**

No persistent fake production data exists.

## 20. Security Advisor

Pre-TASK-103:
- RLS-enabled/no-policy = 10
- mutable search_path = 1
- anon SECURITY DEFINER executable = 18
- authenticated SECURITY DEFINER executable = 74

Post-TASK-103:
- RLS-enabled/no-policy = 11
- mutable search_path = 1
- anon SECURITY DEFINER executable = 18
- authenticated SECURITY DEFINER executable = 74

Delta:
- +1 INFO `rls_enabled_no_policy` from the new server-only payroll_entries table;
- no mutable-search-path regression;
- no anon executable regression;
- no authenticated SECURITY DEFINER execution regression.

The table intentionally has no browser policy because browser table access is revoked and TASK-104 has not yet defined the Employee payroll projection.

## 21. Scope boundaries preserved

TASK-103 does not:
- define a monetary payroll formula;
- infer hourly rates;
- use attendance.amount;
- use employee_grades.hourly_rate;
- define payroll cadence;
- define overtime;
- define breaks;
- define rounding;
- define allowances;
- define bonuses;
- define deductions;
- implement payroll review/finalization authorization;
- implement Employee payroll UI;
- map PAYROLL_AUTHORIZED to a live role;
- start TASK-104;
- enable Workforce Robot;
- modify PFC.

## 22. Canonical handoff

After closure:
- TASK-103 = **DONE**
- E2E-12 = **PARTIAL / TASK-102+103 SOURCE+INTEGRATION SIDE CLOSED**
- E2E-12 cross-flow proof remains TASK-106
- E2E-13 = **PARTIAL / STATE-CONTRACT SIDE CLOSED**
- E2E-13 self-check remains TASK-104/TASK-106
- E2E-14 = **PARTIAL / PROFILE SIDE CLOSED**
- E2E-14 payroll authorization/self-check remains TASK-104/TASK-107
- TASK-104 = **READY / MANUAL_WORK**
- Workforce current = **TASK-104**
- Workforce next = **TASK-105**
- TASK-104 has **not** started
- Workforce Robot = **DISABLED**
- PFC current = **TASK-068**
- PFC next = **TASK-069**
- PFC = **UNCHANGED**

The closure merge SHA is recorded in the closure PR/return because a commit cannot contain its own future merge SHA.

## TASK-103 result

**DONE / E2E-12 TASK-102+103 SOURCE+INTEGRATION SIDE CLOSED / E2E-13 UNCHANGED PARTIAL / E2E-14 UNCHANGED PARTIAL / POST-MERGE GREEN**

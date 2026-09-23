# TASK-102 — Payroll Truth Contract V1

Date: 2026-09-23  
Track: Workforce Operations V1  
Execution mode: MANUAL_WORK  
Workforce Robot: DISABLED

## 1. Result

**TASK-102 = DONE.**

Payroll Truth Contract V1 is executable as a pure, deterministic, fail-closed truth-contract layer.

No payroll amount calculation, persistence table, production payroll RPC or live payroll authorization mapping was introduced.

E2E status:
- **E2E-12 = PARTIAL / TRUTH-CONTRACT SIDE CLOSED**
- **E2E-13 = PARTIAL / STATE-CONTRACT SIDE CLOSED**
- **E2E-14 = PARTIAL / PROFILE SIDE CLOSED — UNCHANGED**

TASK-102 is not an E2E-14 closing task. Payroll authorization/self-check remains TASK-104/TASK-107.

## 2. Canonical starting point

Required starting main:

`2b3fb8caf4b0951102b684bb88bfe98cd1109695`

At start:
- TASK-101 = DONE
- E2E-14 = PARTIAL / PROFILE SIDE CLOSED
- Workforce current = TASK-102
- Workforce next = TASK-103
- TASK-102 = READY / MANUAL_WORK
- Workforce Robot = DISABLED
- PFC = TASK-068 → TASK-069 unchanged

Main was exactly the required starting SHA when the TASK-102 branch was created.

## 3. Canonical TASK-102 contract

Title:

**Payroll Truth Contract V1**

Canonical goal from `WORKFORCE_OPERATIONS_V1_EXECUTION_PLAN.md`:
- payroll period;
- pay-rule reference;
- confirmed-work-time input;
- ESTIMATED → REVIEWED → FINALIZED → PAID truth semantics.

Canonical payroll boundary requires:
- CONFIRMED_WORK_TIME;
- VALID_PAY_RULE;
- PAYROLL_PERIOD.

Calculation implementation remains TASK-103.

## 4. E2E traceability

Canonical E2E contract:
- E2E-12 Payroll draft source: closing tasks TASK-102, TASK-103, TASK-106.
- E2E-13 Payroll state / employee self-check: closing tasks TASK-102, TASK-104, TASK-106.
- E2E-14 Profile/payroll authorization: closing tasks TASK-101, TASK-104, TASK-107.

Therefore TASK-102:
- closes only the truth-contract responsibility of E2E-12;
- closes only the state-contract responsibility of E2E-13;
- does not change the E2E-14 claim.

## 5. QUESTION — pre-implementation truth

Read-only live audit at 2026-09-23 06:51:45 UTC found:
- attendance rows = 0;
- confirmed attendance rows = 0;
- employee_grades rows = 0;
- Workforce payroll-like tables = 0;
- Workforce payroll-like functions = 0.

Existing live fields:
- attendance.confirmed_start / confirmed_end / confirmed_minutes from TASK-100;
- legacy attendance.hourly_rate;
- legacy attendance.hours_worked;
- legacy attendance.amount;
- employee_grades.hourly_rate.

Canonical rules already stated:
- attendance.amount is legacy non-payroll truth;
- raw/rejected attendance is not payroll input;
- confirmed work time is a separate truth family;
- payroll consumes confirmed work time + valid pay rule only;
- ESTIMATED != FINALIZED;
- FINALIZED must be immutable or revision-controlled;
- PAID is not inferred from FINALIZED.

The missing delta was executable validation of period, pay-rule-reference evidence, combined input readiness and revision identity.

## 6. Five-Step result

### QUESTION
The semantic rules existed in TASK-091 canonical JSON, but the TASK-102 payroll truth boundary was not yet executable as one dedicated input/state contract.

### DELETE
TASK-102 does not introduce:
- payroll table;
- payroll amount field;
- payroll calculation;
- payroll RPC;
- payroll browser surface;
- automatic payroll finalization;
- pay-rate semantics;
- allowances/bonus/deduction semantics;
- overtime/break/rounding semantics;
- live role mapping for PAYROLL_AUTHORIZED;
- production DB migration.

### SIMPLIFY
Extend the existing canonical Workforce contract/helper rather than create a second payroll module.

### ACCELERATE
Reuse:
- existing payroll state machine;
- existing validatePayrollSource;
- existing validateTransition;
- TASK-100 confirmed-work-time truth;
- existing authorization contract.

### AUTOMATE
Only pure deterministic validation and logical identity derivation.

No mutation exists, so concurrent/repeated evaluation converges to the same result.

## 7. Canonical contract additions

`02_CORE/contracts/workforce-operations-v1.json`

Payroll boundary now explicitly defines:

### Period contract
Required:
- period_start;
- period_end.

Rules:
- date only;
- start <= end;
- cadence unspecified / do not infer.

TASK-102 does not invent weekly, biweekly or monthly payroll cadence.

### Pay-rule-reference contract
Required:
- pay_rule_reference;
- explicit pay_rule_validated fact.

Reference semantics:

**OPAQUE_CANONICAL_REFERENCE_ONLY**

Must not infer pay rule from:
- attendance.hourly_rate;
- attendance.amount;
- employee_grades.hourly_rate.

TASK-102 does not decide whether a rate/rule is valid. A future authorized pay-rule source must provide the validity fact.

### Confirmed-work-time input
Accepted source:
- source_type = CONFIRMED_WORK_TIME;
- state = CONFIRMED or REVISED.

Rejected:
- raw submitted attendance;
- rejected attendance;
- planned schedule;
- attendance.amount.

Current live projection is TASK-100 terminal attendance APPROVED/ADJUSTED with confirmed_start, confirmed_end and confirmed_minutes present.

### Revision identity
Required fields:
- period_start;
- period_end;
- employee_id;
- payroll_revision.

Logical identity is deterministic and is the basis for retry/idempotency semantics.

### Authorization boundary
- finalization actor remains abstract PAYROLL_AUTHORIZED;
- live actor mapping = UNRESOLVED_DO_NOT_INVENT_IN_TASK_102;
- Employee payroll read remains SELF_ONLY at canonical contract level;
- Manager payroll review still requires explicit permission in a later task.

### Persistence/calculation
Both remain TASK-103 responsibility.

## 8. Executable pure validators

`02_CORE/shared/workforce-operations-v1.mjs`

Added:
- `validatePayrollPeriod(...)`
- `validatePayRuleReference(...)`
- `validatePayrollTruthInput(...)`
- `payrollRevisionIdentity(...)`
- `validatePayrollTruthTransition(...)`

These functions:
- perform no DB access;
- perform no RPC;
- perform no browser access;
- perform no network access;
- perform no mutation;
- are deterministic and fail closed.

## 9. TASK-102 deterministic tests

`09_QA/business-os/workforce-operations-v1.test.mjs`

New tests prove:
1. payroll period is date-only and ordered;
2. no cadence is invented;
3. pay rule requires explicit reference;
4. pay rule requires explicit validation fact;
5. legacy hourly_rate/amount cannot become pay-rule truth;
6. payroll input accepts only confirmed/revised confirmed work time;
7. raw/rejected/planned inputs fail closed;
8. revision identity is deterministic and complete;
9. ESTIMATED cannot skip REVIEWED;
10. REVIEWED cannot skip directly to PAID;
11. FINALIZED→PAID is an explicit transition;
12. non-PAYROLL_AUTHORIZED actor fails transition authorization;
13. persistence/calculation remain TASK-103;
14. live PAYROLL_AUTHORIZED mapping remains unresolved;
15. TASK-102 is not an E2E-14 closing task.

Canonical Workforce contract tests become **69/69 PASS**.

## 10. Full Workforce gate

People Shift workflow was updated only so changes to:
- workforce canonical contract;
- workforce canonical helper;
- workforce canonical contract tests

trigger the same full regression gate already used by TASK-098→101.

No Workforce executable UI/domain behavior was changed by this workflow update.

## 11. Initial full-gate lifecycle race

Branch People Shift run:
- run **35828942217**
- attempt 1 job **107076845095**

Deterministic tests passed.

The run failed later in Employee availability browser diagnostics:
- every functional availability assertion passed;
- diagnostics observed a TypeError in `availability/engine-v1.js` during iframe/document lifecycle;
- TASK-102 did not change availability source or test.

The same unchanged branch head was rerun.

Attempt 2:
- job **107077196160**
- SUCCESS
- availability canonical browser = PASS.

No TASK-102 code was altered to hide or weaken the regression.

## 12. Branch validation

Business OS push on final contract/test code:
- run **35828937544**
- job **107076830604**
- Workforce canonical contract **69/69 PASS**
- failures 0.

Full branch People Shift:
- run **35828942217**
- attempt 2
- job **107077196160**
- Node v20.20.2
- contract **69/69**
- schedule-first **9/9**
- People Shift **87/87**
- Control Tower **74/74**
- total deterministic **239/239**
- all relevant browser regressions PASS
- failures 0.

## 13. Implementation PR-head

Implementation PR:

**#266 — TASK-102: Payroll Truth Contract V1**

Final implementation head:

`d8ffda60616077b67e874d50e065685846ee5cfd`

PR-head Business OS:
- run **35829214563**
- job **107077704167**
- SUCCESS

PR-head People Shift:
- run **35829214534**
- job **107077703887**
- Node v20.20.2
- contract **69/69**
- schedule-first **9/9**
- People Shift **87/87**
- Control Tower **74/74**
- total deterministic **239/239**
- availability canonical browser PASS
- TASK-098 PASS
- TASK-099 PASS
- TASK-100 PASS
- TASK-101 PASS
- Manager Workforce PASS
- Day-10 browser PASS
- Control Tower browser PASS
- failures 0.

## 14. Implementation merge

Implementation merge SHA:

`713301753877d2cf165bd96a6e1d07cd83780139`

## 15. Exact implementation-main verification

Business OS:
- run **35829366561**
- job **107078183654**
- SUCCESS

People Shift:
- run **35829366627**
- job **107078183937**
- exact SHA `713301753877d2cf165bd96a6e1d07cd83780139`
- Node v20.20.2
- contract **69/69**
- schedule-first **9/9**
- People Shift **87/87**
- Control Tower **74/74**
- total deterministic **239/239**
- all relevant browser regressions PASS
- failures 0.

Public source/deploy gates:
- Pages source validation **35829366552** — SUCCESS
- Pages build/deployment **35829365696** — SUCCESS
  - build job **107078184662**
  - report job **107078217664**
  - deploy job **107078217684**

## 16. Production migration

**NOT REQUIRED / NOT APPLIED**

TASK-102 is contract-only.

Creating a payroll table/RPC before:
- a canonical pay-rule source;
- TASK-103 calculation integration;
- explicit authorization mapping

would invent semantics outside TASK-102.

## 17. Final production read-only reconciliation

Observation:

**2026-09-23 07:00:40 UTC / 14:00:40 ICT**

Observed:
- attendance rows = **0**;
- confirmed attendance rows = **0**;
- employee_grades rows = **0**;
- Workforce payroll-like tables = **0**;
- Workforce payroll-like functions = **0**.

No production payroll/schema/data mutation was performed.

## 18. Security Advisor

Pre-TASK-102:
- RLS-enabled/no-policy = 10;
- mutable search_path = 1;
- anon SECURITY DEFINER executable = 18;
- authenticated SECURITY DEFINER executable = 74.

Post-TASK-102:
- RLS-enabled/no-policy = 10;
- mutable search_path = 1;
- anon SECURITY DEFINER executable = 18;
- authenticated SECURITY DEFINER executable = 74.

Security delta = **ZERO**.

## 19. Scope boundaries preserved

TASK-102 does not:
- calculate payroll;
- persist payroll drafts;
- define pay rate;
- define allowances;
- define bonus;
- define deduction;
- define overtime;
- define break treatment;
- define rounding;
- define payroll cadence;
- auto-finalize payroll;
- create payroll UI;
- map PAYROLL_AUTHORIZED to a live role;
- start TASK-103;
- enable Workforce Robot;
- change PFC.

## 20. Canonical handoff

After closure:
- TASK-102 = **DONE**
- E2E-12 = **PARTIAL / TRUTH-CONTRACT SIDE CLOSED**
- E2E-13 = **PARTIAL / STATE-CONTRACT SIDE CLOSED**
- E2E-14 = **PARTIAL / PROFILE SIDE CLOSED — UNCHANGED**
- TASK-103 = **READY / MANUAL_WORK**
- Workforce current task = **TASK-103**
- Workforce next task = **TASK-104**
- TASK-103 has **not** started
- Workforce Robot = **DISABLED**
- PFC current = **TASK-068**
- PFC next = **TASK-069**
- PFC state = **UNCHANGED**

The closure merge SHA is recorded in the closure PR / Work return because a merge commit cannot contain its own future SHA.

## TASK-102 result

**DONE / E2E-12 CONTRACT SIDE CLOSED / E2E-13 STATE-CONTRACT SIDE CLOSED / E2E-14 UNCHANGED / POST-MERGE GREEN**

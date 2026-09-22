# TASK-099 — Employee Attendance Entry UI V1

**Track:** WORKFORCE_OPERATIONS_V1  
**Execution mode:** OWNER_DIRECT_TO_WORK / MANUAL_WORK  
**Date:** 2026-09-22  
**Status:** DONE / E2E-09 CLOSED / POST-MERGE GREEN  
**E2E-09:** CLOSED — Employee manual-time normal path executable through canonical UI  
**E2E-10:** PENDING — Manager exception review / confirmed work time belongs TASK-100  
**Production schema migration:** NONE  
**Production persistent test-data mutation:** NONE  
**Workforce Robot:** DISABLED  
**PFC cursor mutation:** NONE  
**TASK-100:** READY / MANUAL_WORK after canonical closure — NOT STARTED

## 1. Canonical starting point

TASK-099 started from exact canonical main:

`f965dab40264ea82b0c9862a1e5222ed661cd09c`

Main was verified identical to that SHA before branching.

Starting Workforce cursor:

- TASK-098 = DONE / E2E-08 CLOSED
- TASK-099 = READY / MANUAL_WORK
- TASK-100 = staged
- Workforce Robot = DISABLED
- PFC = TASK-068 → TASK-069 unchanged

No valid parallel-track change was reset or reverted.

## 2. QUESTION / live-safe inventory

Repository and read-only production inspection established:

- Employee attendance UI still actively exposed realtime `clock_in_for_schedule` / `clock_out_attendance`;
- the same UI also exposed legacy `manual_attendance_from_schedule`;
- canonical TASK-098 mutation already existed as `submit_manual_time_attendance_v1`;
- canonical current schedule reader already existed as `list_my_approved_schedules_v2`;
- persisted Employee attendance status was readable through `get_my_attendance_v2`;
- `work_schedules.user_id` remains attendance authority source-of-truth;
- backend mutation revalidates current owner at mutation time and returns `ATTENDANCE_NOT_CURRENT_OWNER` for stale owner;
- canonical raw submission remains `SUBMITTED / NEEDS_REVIEW` and does not create confirmed work time;
- production had 0 attendance rows and 0 work_schedules at final read-only audit;
- browser roles had no direct attendance table SELECT/INSERT/UPDATE/DELETE privilege.

No new backend authority or reader RPC was required.

## 3. Five-Step result

### DELETE

Removed from the active Employee UI mutation surface:

- realtime clock-in;
- realtime clock-out;
- legacy manual attendance mutation;
- any active UI dependency on automatic attendance;
- legacy hours/income presentation as the primary attendance entry authority surface.

The legacy backend RPCs remain compatibility-only under TASK-098 hardening; TASK-099 does not drop them.

### SIMPLIFY

The Employee UI now uses one canonical flow:

`list_my_approved_schedules_v2 → get_my_attendance_v2 → submit_manual_time_attendance_v1`

Client responsibilities are limited to presentation, required-field validation and start/end order validation.

The client does not decide:

- final current owner;
- employee ACTIVE/STAFF authority;
- schedule approval/eligibility;
- future/unfinished shift policy;
- confirmed work time;
- review threshold;
- payroll semantics.

### ACCELERATE

Reused existing schedule and attendance RPCs, existing Employee iframe/runtime, existing People Shift fixture infrastructure and existing CI workflow.

No parallel Attendance engine, table mutation API or duplicate authority store was created.

### AUTOMATE

Only safe UI reconciliation was automated:

- request de-duplication while loading;
- submit button disabled while a request is active;
- backend exact-idempotency remains authoritative;
- persisted attendance status reload after submit;
- stale-owner/active-submission errors trigger server-truth refresh;
- no auto-submit;
- no auto clock-in/out;
- no auto review/approve.

## 4. Employee UI behavior

`06_EMPLOYEE/attendance/engine-v1.js` now:

- reads Employee-owned APPROVED schedules for the selected week from the server;
- lets Employee select a schedule without rendering internal UUIDs as UI text;
- accepts actual start/end using minute-precision time inputs;
- accepts optional note without inventing a client-only length/policy limit;
- submits only through `submit_manual_time_attendance_v1`;
- maps known canonical backend errors to Employee-readable messages while preserving the canonical error identity;
- reloads persisted status after submission;
- renders raw `NEEDS_REVIEW` as submitted/pending review, not confirmed work time;
- disables a second UI submission when server history already shows an active attendance record;
- fails closed and refreshes current schedules on ownership transfer.

No rounding, grace period, late threshold, overtime, break, payroll or confirmed-minute rule was introduced.

## 5. Legacy compatibility result

Active Employee mutation UI no longer calls:

- `clock_in_for_schedule`;
- `clock_out_attendance`;
- `manual_attendance_from_schedule`;
- `auto_attendance_from_approved_schedules`.

Backend compatibility RPCs are not removed by TASK-099 because executable removal of those server surfaces is outside this UI-only task and could break remaining historical compatibility consumers.

There is only one active Employee Attendance mutation path in this UI: `submit_manual_time_attendance_v1`.

## 6. Deterministic + browser evidence

Updated:

- `09_QA/people-shift/employee-attendance-schedule-linked.test.mjs`
- `09_QA/people-shift/employee-attendance-schedule-linked-fixture.html`
- `09_QA/people-shift/employee-attendance-schedule-linked-browser.mjs`
- `09_QA/business-os/published-schedule-feedback-loop.test.mjs`
- `.github/workflows/people-shift-tests.yml`

Executable browser evidence proves:

1. Employee B currently owns schedule X and sees X in the attendance UI;
2. B enters actual start/end and submits through canonical Manual-Time V1;
3. persisted state is `SUBMITTED / NEEDS_REVIEW`;
4. confirmed_start / confirmed_minutes remain null;
5. double-click produces one canonical mutation;
6. reload shows persisted status and does not create a duplicate;
7. when X is transferred away while the UI is stale, submit returns `ATTENDANCE_NOT_CURRENT_OWNER`;
8. UI refresh removes X from B's current schedule truth;
9. there is no direct table path and no legacy attendance mutation RPC call;
10. 390px mobile viewport has no horizontal overflow;
11. browser diagnostics have 0 page/console/request/5xx failures.

## 7. Implementation PR and PR-head gates

Implementation PR:

**#259 — TASK-099: Employee Attendance Entry UI V1**

Final PR head:

`6cf5a186e06e5a73c84169ca84461ffad69a85b3`

### PR-head Business OS

- run: **35743617244**
- job: **106799408132**
- conclusion: **SUCCESS**
- failures: **0**

### PR-head People Shift

- run: **35743617316**
- job: **106799408008**
- runtime: **Node v20.20.2**
- TASK-091 Workforce contract: **61/61 PASS**
- schedule-first compatibility: **9/9 PASS**
- People Shift deterministic: **73/73 PASS**
- Control Tower deterministic: **74/74 PASS**
- deterministic total: **217/217 PASS**
- browser suites: **12/12 PASS**
- TASK-099 marker: **TASK_099_EMPLOYEE_ATTENDANCE_UI=PASS**
- failures: **0**

The first implementation attempt exposed a stale schedule-first regression assertion that still required realtime clock-in/out in the active Employee engine. It was corrected to enforce the canonical Workforce V1 rule instead: Manual-Time V1 required, realtime/legacy attendance mutation paths forbidden. No production or TASK-098 guardrail was weakened.

## 8. Implementation merge / exact-main gates

Implementation merge SHA:

`57ea0f6b84fe3a70a6c7fd395adbb508cd597061`

Main was verified identical to this SHA before closure branching.

### Exact post-merge Business OS

- run: **35743790505**
- job: **106800004115**
- conclusion: **SUCCESS**
- failures: **0**

### Exact post-merge People Shift

- run: **35743790428**
- job: **106800003976**
- exact main SHA: `57ea0f6b84fe3a70a6c7fd395adbb508cd597061`
- runtime: **Node v20.20.2**
- TASK-091 Workforce contract: **61/61 PASS**
- schedule-first compatibility: **9/9 PASS**
- People Shift deterministic: **73/73 PASS**
- Control Tower deterministic: **74/74 PASS**
- deterministic total: **217/217 PASS**
- browser suites: **12/12 PASS**
- TASK-099 marker: **TASK_099_EMPLOYEE_ATTENDANCE_UI=PASS**
- failures: **0**

Exact-main Pages collateral:

- Validate MAGASIN GitHub Pages source: run **35743790560**, job **106800009318** — **SUCCESS**
- Pages build/deployment: run **35743786944** — build **106799998505**, deploy **106800104345**, report **106800104359** — **SUCCESS**

## 9. Final production/security reconciliation

Read-only final observation around **2026-09-22 21:56 ICT**:

- attendance rows: **0**
- work_schedules: **0**
- persistent fake Employee/schedule/Give/Swap/attendance/notification created by TASK-099: **0**
- anon execute on `submit_manual_time_attendance_v1`: **false**
- authenticated execute on canonical submit: **true**
- authenticated direct attendance SELECT: **false**
- authenticated direct attendance INSERT: **false**
- authenticated direct attendance UPDATE: **false**
- authenticated direct attendance DELETE: **false**

TASK-099 added no DDL and no new SECURITY DEFINER function.

Final Security Advisor still reports pre-existing repository/database findings, including unrelated anon SECURITY DEFINER functions and authenticated SECURITY DEFINER operational RPCs. TASK-099 introduced no new advisor finding/surface. The canonical TASK-098 attendance submit remains authenticated-only and internally authorizes current APPROVED schedule ownership + ACTIVE STAFF.

No production row was inserted, updated or deleted during TASK-099 verification.

## 10. E2E status

Canonical E2E acceptance contract defines:

- **E2E-09** = Employee selects actual_start/actual_end for own published assignment and submits; no realtime clock-in/out required.
- **E2E-10** = abnormal submitted time → Manager approve/adjust/reject → confirmed work time.

Therefore:

**E2E-09 = CLOSED.**

TASK-099 does not claim E2E-10, Manager review, confirmed work time or payroll integration.

Raw attendance remains raw submission truth and cannot be relabeled as confirmed work time.

## 11. Scope boundaries preserved

TASK-099 did not:

- implement Manager attendance review;
- define deviation threshold;
- produce confirmed_start/end/minutes;
- calculate payroll/overtime/breaks;
- define Give CANCELLED/EXPIRED semantics;
- alter TASK-098 authority;
- add direct browser table DML;
- enable Workforce Robot;
- change PFC;
- start TASK-100.

## 12. Canonical handoff

After docs/state closure merge:

- TASK-099 = **DONE**
- E2E-09 = **CLOSED**
- TASK-100 = **READY / MANUAL_WORK**
- Workforce current task = **TASK-100**
- Workforce next task = **TASK-101**
- Workforce Robot = **DISABLED**
- PFC current task = **TASK-068**
- PFC next task = **TASK-069**
- PFC state = **UNCHANGED**
- TASK-100 has **not** been started
- E2E-10 / Manager review / confirmed work time = **PENDING**

The canonical closure merge SHA is recorded in the Work return because a merge commit cannot self-contain its own future SHA.

## TASK-099 result

**DONE / E2E-09 CLOSED / POST-MERGE GREEN**

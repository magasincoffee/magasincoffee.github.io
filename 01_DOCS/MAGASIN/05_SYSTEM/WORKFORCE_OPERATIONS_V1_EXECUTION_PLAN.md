# MAGASIN — Workforce Operations V1 Execution Plan

**Plan ID:** WORKFORCE_OPERATIONS_V1  
**Date:** 2026-09-21  
**Architecture:** `WORKFORCE_OPERATIONS_V1_ARCHITECTURE.md`  
**Status:** OWNER APPROVED ARCHITECTURE / STAGED / WAIT_OWNER_RELEASE  
**Execution policy:** reuse-first, no duplicate module, Five-Step on every task.

## Operating rule

Every task:
```text
QUESTION → DELETE → SIMPLIFY → ACCELERATE → AUTOMATE
```

Before coding, reconcile existing implementation and prove the smallest required delta.

## Wave 0 — Reconcile / delete duplicate paths

| Task | Title | Goal |
|---|---|---|
| TASK-090 | Workforce V1 Current-System Reconciliation | map existing Employee/Manager/Owner flows, RPCs, tables, tests; identify reuse/deprecate/delete |
| TASK-091 | Workforce V1 Canonical State + Rule Contract | lock weekly lifecycle, role authority, availability/schedule/attendance/payroll states, audit boundaries |

## Wave A — Weekly scheduling

| Task | Title | Goal |
|---|---|---|
| TASK-092 | Availability Weekly Cycle Hardening | Employee registers next-week availability; registration period/week boundaries correct |
| TASK-093 | Manager Sunday Schedule Board V1 | simplify Manager scheduling around actual availability; no staffing-gap-first UX |
| TASK-094 | Schedule Validation + Publish Gate | overlap, max-2/day, ACTIVE employee, scope, availability, atomic publish/audit |
| TASK-095 | Employee Published Weekly Schedule V1 | Monday-ready schedule visibility, week navigation, publish notifications |

## Wave B — Shift changes

| Task | Title | Goal |
|---|---|---|
| TASK-096 | Swap Lifecycle Reconciliation + Hardening | reuse existing swap; verify peer/manager/server rules and assignment refresh |
| TASK-097 | Give Lifecycle Reconciliation + Hardening | reuse existing Give rule recipient-accepts-then-manager-approves; verify assignment transfer |

## Wave C — Attendance manual-time model

| Task | Title | Goal |
|---|---|---|
| TASK-098 | Manual-Time Attendance Contract + Migration Path | replace active realtime check-in/out semantics with employee-selected actual start/end linked to assignment |
| TASK-099 | Employee Attendance Entry UI V1 | employee selects actual start/end, submits safely, sees status |
| TASK-100 | Manager Attendance Exception Review V1 | NORMAL vs NEEDS_REVIEW, approve/adjust/reject, confirmed work time |

## Wave D — Employee profile + payroll self-service

| Task | Title | Goal |
|---|---|---|
| TASK-101 | Employee Profile Projection V1 | own-profile / manager-scoped / owner-scope permissions with only operational fields |
| TASK-102 | Payroll Truth Contract V1 | payroll period, pay-rule reference, confirmed-work-time input, ESTIMATED→FINALIZED semantics |
| TASK-103 | Payroll Calculation Integration V1 | deterministic payroll draft only from confirmed work time + valid pay rule |
| TASK-104 | Employee Payroll Self-Check V1 | employee sees own hours/pay states; Manager sees scoped review; no cross-user leak |

## Wave E — Simplification / integration

| Task | Title | Goal |
|---|---|---|
| TASK-105 | Employee + Manager Workforce UI Consolidation | keep only canonical V1 surfaces; remove/hide duplicate/deprecated active paths |
| TASK-106 | Workforce Cross-Flow Browser E2E Pack | full availability→publish→swap/give→attendance→payroll scenarios |
| TASK-107 | Workforce Failure / Recovery / Security E2E | reload, retry, idempotency, permission, failure isolation, timezone/week-boundary |
| TASK-108 | Workforce Final Regression + Post-Merge E2E Recheck | full QA, exact-main rerun, cold/reload rerun, docs/state handoff |

## Critical invariants

- Employee registration = availability, not official shift.
- Manager owns final schedule decision.
- Sunday publish prepares next Monday.
- “missing shift / enough shift” is not canonical V1 status.
- Published assignment is canonical attendance anchor.
- Swap/Give mutate ownership only through server-validated lifecycle.
- No realtime check-in/check-out in active V1.
- Attendance uses employee-selected actual times.
- Raw submitted time != confirmed work time.
- Payroll uses confirmed work time only.
- Employee can read only own profile/payroll.
- Browser does not directly mutate protected canonical tables.
- Every mutation is auditable/idempotent.
- Asia/Ho_Chi_Minh week/date semantics are deterministic.

## Mandatory QA strategy

Each implementation task:
1. targeted unit/contract tests;
2. relevant integration regression;
3. static forbidden-path/security checks where applicable;
4. browser E2E for any changed user flow;
5. remote CI PR-head green;
6. exact post-merge green.

Final TASK-108 cannot close on unit tests alone.

## Final stability gate

Required:
- all targeted suites green;
- full relevant People/Shift + Schedule-first + SOP/Task regressions green;
- E2E-01→E2E-16 in canonical E2E contract green;
- zero unexpected browser console/page/request failures;
- exact post-merge main E2E green;
- cold browser/reload E2E recheck green;
- no duplicate attendance/payroll mutations under retry/double-submit;
- no stale employee ownership after Swap/Give;
- no cross-user profile/payroll leak;
- no production/private fixture committed.

## Release semantics

Current status:
`STAGED / WAIT_OWNER_RELEASE`.

TASK-090→108 must **not** AUTO_CONTINUE until Owner explicitly releases `WORKFORCE_OPERATIONS_V1`.

Current PFC cursor remains authoritative and unchanged until separate Owner reprioritization/release.

# MAGASIN — Workforce Operations V1 Execution Plan

**Plan ID:** WORKFORCE_OPERATIONS_V1  
**Date:** 2026-09-21  
**Architecture:** `WORKFORCE_OPERATIONS_V1_ARCHITECTURE.md`  
**Status:** CLOSED / TASK-090→108 DONE / SCHED-01→09 CANONICAL_CLOSED  
**Execution policy:** reuse-first, no duplicate module, Five-Step on every task.

## Owner production-readiness override — 2026-09-23 — CLOSED

The Owner has activated:

`WORKFORCE_SCHEDULING_PRODUCTION_READINESS_V1_SOURCE_OF_TRUTH.md`

as a **hard release gate**.

Closure state:
- scheduling across Employee / Manager / Owner completed the production-readiness hard gate;
- `SCHED-01 → SCHED-09` are DONE / CANONICAL_CLOSED;
- `TASK-090 → TASK-108` are DONE / CLOSED;
- TASK-108 Gate A/B/C are PASS / ACCEPTED on qualified executable SHA `8fd8a446d6722871af0be4171b5e129d2f6eea40`;
- Workforce Robot remains DISABLED;
- closure does not authorize an automatic next Workforce task or a new Workforce generation;
- PFC remains independently authoritative unless separately reprioritized by Owner;
- one canonical scheduling truth, explicit old/new lineage and no overlapping active mutation authority remain permanent invariants.

Canonical closure cursor:

```text
priority_gate = WORKFORCE_SCHEDULING_PRODUCTION_READINESS_V1
SCHED-01 → SCHED-09 = DONE / CANONICAL_CLOSED
TASK-090 → TASK-108 = DONE / CLOSED
TASK-108_GATE_A = PASS / ACCEPTED
TASK-108_GATE_B = PASS / ACCEPTED
TASK-108_GATE_C = PASS / ACCEPTED
Workforce Robot = DISABLED
automatic_next_workforce_task = NONE
PFC = UNCHANGED
```

The former hard-gate instructions are historical execution provenance and no longer represent an active blocker or cursor.

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
| TASK-108 | Workforce Final Regression + Post-Merge E2E Recheck | full QA, exact-main rerun, cold/reload rerun, docs/state handoff; **DONE / CLOSED** |

## Production-readiness scheduling gate

Detailed SoT:

`WORKFORCE_SCHEDULING_PRODUCTION_READINESS_V1_SOURCE_OF_TRUTH.md`

| Task | Title | Goal |
|---|---|---|
| SCHED-01 | Production blocker audit + repair | fix live Workforce Publish / ambiguous store scope blocker; restore canonical scheduling load |
| SCHED-02 | Role + authority lock | Employee self, Manager store scope, Owner enterprise scope; server-authorized |
| SCHED-03 | Employee Schedule UI V1 | professional Availability + own schedule + week navigation + Give/Swap entry |
| SCHED-04 | Manager Scheduling V1 | Availability → DRAFT → REVIEWED → PUBLISH end-to-end |
| SCHED-05 | Owner Scheduling V1 | enterprise/store scheduling oversight and canonical intervention |
| SCHED-06 | Three-role synchronization | one schedule identity stays consistent through publish/Give/Swap across all roles |
| SCHED-07 | Professional UI/UX + responsive pass | MAGASIN design consistency, mobile/desktop polish, complete states |
| SCHED-08 | Live three-role E2E acceptance | Employee → Manager → Owner real acceptance + scope/security/reload |
| SCHED-09 | Production reconciliation + canonical closure | clean data, version/deprecation proof, exact-main QA/security/Pages closure |

Planning range: **33–51 working hours**, typically **4–6 working days**, with contingency up to **7 working days** for legacy defects.

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
- Scheduling uses one canonical truth across Employee / Manager / Owner.
- No permanent dual-write or overlapping active scheduling authority.
- Old/new version lineage and deprecation status must be explicit.
- A technically functional but visibly unfinished scheduling UI is not production-ready.

## Mandatory QA strategy

Each implementation task:
1. targeted unit/contract tests;
2. relevant integration regression;
3. static forbidden-path/security checks where applicable;
4. browser E2E for any changed user flow;
5. remote CI PR-head green;
6. exact post-merge green.

Final TASK-108 cannot close on unit tests alone.

The scheduling hard gate additionally requires live-safe three-role acceptance and clean production reconciliation before SCHED-09 can close.

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
- no production/private fixture committed;
- SCHED-01→09 CLOSED;
- live Employee/Manager/Owner scheduling acceptance PASS;
- one canonical scheduling truth;
- old/new scheduling paths reconciled without parallel write authority;
- scheduling UI professionally finished and responsive.

## Release semantics

Current status:

`WORKFORCE_OPERATIONS_V1 = CLOSED`.

- TASK-090→TASK-108 are DONE / CLOSED.
- SCHED-01→SCHED-09 are DONE / CANONICAL_CLOSED.
- TASK-108 Gate A/B/C are PASS / ACCEPTED.
- Workforce Robot remains DISABLED.
- No next Workforce task is implied by closure.
- Any Workforce V2, new capability generation or autonomous Workforce execution requires a new explicit Owner release.
- Current PFC cursor remains independently authoritative and unchanged until separate Owner reprioritization/release.

## Post-closure canonical reconciliation — 2026-09-29

`MANAGER_EMPLOYEE_SYSTEM_RECONCILIATION_V1` completed after this execution plan had already closed.

It is recorded as a post-closure reconciliation, not a reopened Workforce task generation:
- one canonical Employee Workforce Profile projection is shared by Manager/Owner, Employee self and scheduler readers;
- Store Priority is Manager/Owner-write and Employee-read-only;
- Manager Workforce modules use shared `manager-context-v1.js` for actor/client/store scope;
- cross-role browser and production-safe rollback smoke acceptance passed;
- permanent evidence: `MANAGER_EMPLOYEE_SYSTEM_RECONCILIATION_V1_ACCEPTANCE.md`.

This addendum does not create a next Workforce task. `WORKFORCE_OPERATIONS_V1` remains CLOSED and the independent `WORKFORCE_CROSS_STORE_SCHEDULING_V1` XSTORE-011 live-configuration gate remains separately authoritative.

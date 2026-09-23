# MAGASIN — Workforce Operations V1 Execution Plan

**Plan ID:** WORKFORCE_OPERATIONS_V1  
**Date:** 2026-09-21  
**Architecture:** `WORKFORCE_OPERATIONS_V1_ARCHITECTURE.md`  
**Status:** OWNER RELEASED / SCHEDULING PRODUCTION-READINESS HARD GATE ACTIVE  
**Execution policy:** reuse-first, no duplicate module, Five-Step on every task.

## Owner production-readiness override — 2026-09-23

The Owner has activated:

`WORKFORCE_SCHEDULING_PRODUCTION_READINESS_V1_SOURCE_OF_TRUTH.md`

as a **hard release gate**.

Current rule:
- scheduling across Employee / Manager / Owner must be production-ready before unrelated new Workforce work resumes;
- execute `SCHED-01 → SCHED-09` sequentially;
- only one SCHED task active at a time;
- `TASK-108` is paused behind this gate;
- Workforce Robot remains DISABLED;
- PFC remains unchanged unless separately reprioritized by Owner;
- data must remain clean with one canonical scheduling truth, explicit old/new version lineage, no overlapping active mutation authority, and professional production-grade UI/UX.

The already-merged Auth Password Reset hotfix is completed prerequisite context and does not supersede this scheduling gate.

Canonical scheduling gate cursor:

```text
priority_gate = WORKFORCE_SCHEDULING_PRODUCTION_READINESS_V1
current_sched_task = SCHED-01
next_sched_task = SCHED-02
SCHED-01 = READY / MANUAL_WORK
TASK-108 = PAUSED_BEHIND_SCHED_GATE
unrelated_workforce_progression = BLOCKED_UNTIL_SCHED_GATE_CLOSED
Workforce Robot = DISABLED
PFC = UNCHANGED
```

This override takes precedence over older release wording in this plan until `SCHED-09` closes.

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
| TASK-108 | Workforce Final Regression + Post-Merge E2E Recheck | full QA, exact-main rerun, cold/reload rerun, docs/state handoff; **PAUSED until SCHED-01→09 gate closes** |

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

`OWNER RELEASED / SCHEDULING PRODUCTION-READINESS HARD GATE ACTIVE`.

TASK-090→107 canonical work remains valid.

`TASK-108` and unrelated new Workforce work are blocked until:

`WORKFORCE_SCHEDULING_PRODUCTION_READINESS_V1 = CLOSED`.

Current PFC cursor remains authoritative and unchanged until separate Owner reprioritization/release.

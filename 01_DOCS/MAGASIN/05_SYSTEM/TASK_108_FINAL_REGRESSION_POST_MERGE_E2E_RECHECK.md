# TASK-108 — Workforce Final Regression + Post-Merge E2E Recheck

**Track:** WORKFORCE_OPERATIONS_V1  
**Task:** TASK-108  
**Gate:** A — PR head  
**Branch baseline:** `a4eee395a670c949db26de13551f45c75faef68b`  
**SCHED-09 final merge SHA:** `a4eee395a670c949db26de13551f45c75faef68b`  
**SCHED-09 final closure:** Brain ACCEPTED  
**Task state:** IN_PROGRESS / MANUAL_WORK  
**Workforce Robot:** DISABLED  
**Production mutation:** NONE  
**Production runtime change:** NONE  
**Database change:** NONE

## 1. Gate A objective

Gate A requires the full existing Workforce regression/browser/security pack to remain green on one exact reviewable PR head, plus executable cold/reload evidence appropriate to the canonical E2E acceptance contract.

This task does not merge the PR and does not execute Gate B or Gate C.

## 2. Reuse-first coverage audit

Existing People Shift CI already runs:
- Workforce canonical deterministic contract regression;
- Schedule-first compatibility + published-schedule feedback-loop regression;
- all People Shift deterministic tests;
- Control Tower regression tests;
- Availability browser regression;
- Employee published schedule;
- Manager scheduling/validate/review/publish;
- Swap lifecycle;
- Give lifecycle;
- ownership→Attendance;
- manual-time Attendance;
- Manager Attendance review;
- notification/outbox;
- Employee profile/payroll;
- TASK-106 payroll cross-flow;
- TASK-107 failure/recovery/security;
- Manager Workforce canonical route;
- Employee/People Shift browser route pack;
- Control Tower browser regression.

Existing browser suites already contain reload/idempotency/no-stale assertions, but Gate A previously lacked one executable aggregate proof that explicitly maps fresh browser/direct-route/reload execution to core E2E-01→E2E-13.

Therefore the smallest acceptance delta is:
- new QA orchestrator: `09_QA/people-shift/task-108-gate-a-cold-reload-browser.mjs`;
- one People Shift workflow step invoking it.

No production runtime fixture or business runtime is changed.

## 3. Gate A cold/reload executable mapping

The dedicated Gate A recheck launches each selected existing browser suite in a separate Node process; each child suite launches a fresh Chromium browser and loads its fixture by direct route.

| Core scenario | Reused executable browser proof |
|---|---|
| E2E-01 Availability | `employee-availability-canonical-browser.mjs` |
| E2E-02 Manager scheduling | `sched-04-manager-scheduling-browser.mjs` |
| E2E-03 Validation | `sched-04-manager-scheduling-browser.mjs` + full deterministic validation regression |
| E2E-04 Publish → Employee visibility | `employee-published-weekly-schedule-browser.mjs` |
| E2E-05 Publish idempotency | `sched-04-manager-scheduling-browser.mjs` |
| E2E-06 Swap | `shift-swap-lifecycle-browser.mjs` |
| E2E-07 Give | `shift-give-lifecycle-browser.mjs` |
| E2E-08 transferred ownership → Attendance | `task-098-attendance-authority-browser.mjs` |
| E2E-09 manual-time Attendance | `employee-attendance-schedule-linked-browser.mjs` |
| E2E-10 Attendance exception/review | `manager-attendance-review-browser.mjs` |
| E2E-11 Attendance retry/reload idempotency | `employee-attendance-schedule-linked-browser.mjs` |
| E2E-12 payroll confirmed-work source | `workforce-payroll-cross-flow-browser.mjs` |
| E2E-13 payroll state/self-check | `workforce-payroll-cross-flow-browser.mjs` |

TASK-107 failure/recovery/security browser is also rerun as the stale-state/recovery safety supplement.

The orchestrator refuses PASS unless:
- every selected suite contains and executes a fresh Chromium browser launch;
- every selected suite directly loads its QA route;
- reload-designated suites expose executed reload PASS evidence;
- all E2E-01→13 identifiers are covered;
- every child suite exits successfully with its canonical PASS marker.

Expected aggregate markers:
- `TASK_108_GATE_A_FRESH_BROWSER_SESSIONS=10`;
- `TASK_108_GATE_A_DIRECT_ROUTE_LOADS=10`;
- `TASK_108_GATE_A_RELOAD_SUITES=9`;
- `TASK_108_GATE_A_CORE_E2E_01_13=PASS`;
- `TASK_108_GATE_A_IDEMPOTENCY_NO_STALE_STATE=PASS`;
- `TASK_108_GATE_A_DIAGNOSTICS=PASS`;
- `TASK_108_GATE_A_COLD_RELOAD=PASS`.

## 4. Acceptance boundary

Gate A is PASS only when the exact final PR head reports:
- full deterministic regression GREEN;
- all existing relevant browser/security steps GREEN;
- dedicated TASK-108 cold/reload step GREEN;
- zero unexpected page/console/request/HTTP-5xx diagnostics in the deterministic browser path.

Any reproducible regression failure is fail-closed and must not be repaired by weakening assertions or changing production runtime inside this task.

## 5. State

```text
SCHED-09 final merge SHA = a4eee395a670c949db26de13551f45c75faef68b
SCHED-09 Brain acceptance = SATISFIED
TASK-108 = IN_PROGRESS / MANUAL_WORK / GATE_A
Workforce Robot = DISABLED
PR merge = FORBIDDEN_IN_GATE_A
Gate B = NOT_STARTED
Gate C = NOT_STARTED
```

PR-head run/job IDs and terminal conclusions are returned in the Gate-A execution evidence after CI completes on the final PR head.

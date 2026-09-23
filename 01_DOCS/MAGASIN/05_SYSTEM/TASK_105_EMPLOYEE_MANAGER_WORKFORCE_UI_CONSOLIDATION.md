# TASK-105 — Employee + Manager Workforce UI Consolidation

Date: 2026-09-23  
Track: Workforce Operations V1  
Execution mode: MANUAL_WORK  
Workforce Robot: DISABLED

## 1. Canonical contract

Title: **Employee + Manager Workforce UI Consolidation**

Execution-plan goal: **keep only canonical V1 surfaces; remove/hide duplicate/deprecated active paths**

Queue gate: **canonical routes only + regression**

TASK-105 owns UI/routing consolidation only. It does not own payroll monetary calculation, pay-rate semantics, payroll cadence, payroll state transition authority, PAYROLL_AUTHORIZED mapping, overtime/break/rounding, allowance/bonus/deduction rules, TASK-106 cross-flow E2E, or TASK-107 failure/recovery/security E2E.

## 2. Starting point

Required canonical main: `f7f7a9b14489de5d63df1f0eae96b8103b2e30fb`.

At start:
- TASK-104 = DONE;
- E2E-12 = PARTIAL / TASK-102+103 SOURCE+INTEGRATION SIDE CLOSED;
- E2E-13 = PARTIAL / TASK-102+104 STATE+SELF-CHECK SIDE CLOSED;
- E2E-14 = PARTIAL / TASK-101+104 PROFILE+PAYROLL-AUTH READ SIDE CLOSED;
- TASK-105 = READY / MANUAL_WORK;
- next = TASK-106;
- Workforce Robot = DISABLED;
- PFC remains TASK-068 → TASK-069.

## 3. Pre-implementation audit

Repository audit found:
- canonical Manager runtime loads `05_MANAGER/Workforce/engine-v1.js` and no compat Workforce engine;
- staffing-demand module remains source-controlled for compatibility but is not loaded by the canonical engine;
- legacy Manager deep links `Cham-cong`, `Doi-ca`, `Nhan-su` still routed through `manager-v13-runtime.html`;
- Manager shell still exposed static/demo Staff, KPI and Academy paths and hidden staffing-demand DOM;
- Employee attendance active engine already uses `submit_manual_time_attendance_v1` and hides the legacy attendance-income report;
- Employee profile and payroll active engines already reuse TASK-101 and TASK-104 canonical readers.

Live read-only production audit before implementation:
- TASK-101/104 profile/payroll readers and TASK-100 attendance reader remain anon-denied / authenticated-enabled;
- Security Advisor baseline remains RLS-no-policy=11, mutable-search-path=1, anon SECURITY DEFINER executable=18, authenticated SECURITY DEFINER executable=76;
- no TASK-105 database migration is required because TASK-105 changes no server authority or data model.

## 4. Implementation

Implementation is intentionally UI/routing-only:
- legacy Manager deep links route to authenticated canonical `/05_MANAGER/` entry with allowlisted canonical hashes;
- nested Manager/Employee runtimes propagate only allowlisted hashes;
- Manager active Workforce navigation removes staffing-demand, hides KPI/Academy from active V1 navigation, converts Home to exception/action-first canonical links, and uses canonical labels;
- Manager Staff surface is replaced with a read-only TASK-101 projection using `list_employee_profile_projection_v1`;
- Employee active navigation is relabeled to Hôm nay / Lịch làm / Chấm công / Đổi-cho ca / Lương / Cá nhân and the legacy attendance-income panel remains explicitly hidden;
- compatibility source files remain in the repository but are no longer active canonical routes.

No production data is written and no migration is introduced by TASK-105.

## 5. E2E ownership

TASK-105 does **not** close E2E-12, E2E-13 or E2E-14.

Expected post-TASK-105 status:
- E2E-12 remains PARTIAL / TASK-102+103 SOURCE+INTEGRATION SIDE CLOSED / TASK-106 pending;
- E2E-13 remains PARTIAL / TASK-102+104 STATE+SELF-CHECK SIDE CLOSED / TASK-106 pending;
- E2E-14 remains PARTIAL / TASK-101+104 PROFILE+PAYROLL-AUTH READ SIDE CLOSED / TASK-107 pending.

## 6. Closure evidence

Implementation head / PR / merge / exact post-merge CI and final live read-only reconciliation are recorded at closure.

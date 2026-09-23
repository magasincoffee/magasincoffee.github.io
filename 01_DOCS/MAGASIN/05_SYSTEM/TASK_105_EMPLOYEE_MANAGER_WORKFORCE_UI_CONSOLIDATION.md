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

## 6. Implementation identity

Implementation branch: `task-105-workforce-ui-consolidation-v1`

Final implementation / PR head:

`df969a3dfadfbe7ed304375169db26de9108d252`

Implementation PR:

**#272 — TASK-105: Employee + Manager Workforce UI Consolidation**

Implementation merge:

`a07e2c5ac61855e2cc24e208e4800bdd1e3a2d48`

No migration was created or applied.

## 7. PR-head gates

PR-head People Shift:
- run **35866302477**
- job **107198647432**
- SUCCESS

PR-head SOP:
- run **35866302481**
- job **107198647595**
- SUCCESS

All deterministic regressions passed before merge and the browser pack remained green.

## 8. Exact post-merge main gates

Exact implementation main:

`a07e2c5ac61855e2cc24e208e4800bdd1e3a2d48`

Exact-main People Shift:
- run **35866459893**
- job **107199178920**
- SUCCESS

Exact-main SOP:
- run **35866459899**
- job **107199178990**
- SUCCESS

Exact-main deterministic totals:
- Workforce contract: **77/77**
- schedule-first: **9/9**
- People Shift: **112/112**
- Control Tower: **74/74**
- total: **272/272**
- failures: **0**

Browser evidence includes:
- `MANAGER_WORKFORCE_CANONICAL_BROWSER=PASS`
- `task105_canonical_ui_removes_legacy_demand_route=PASS`
- legacy demand tab count = 0
- legacy demand panel count = 0
- Manager label = `📅 Xếp lịch`
- Swap/Give label = `🔄 Đổi / cho ca`
- all TASK-095→104 browser regressions remained PASS
- page/console/request/5xx diagnostics remained 0 in the canonical Manager browser.

Pages:
- source validation run **35866459728** / job **107199178097** — SUCCESS
- build/deployment run **35866458141**
- build job **107199179263** — SUCCESS
- deploy job **107199274782** — SUCCESS

The public crawler could not inspect the authenticated Manager deep-route response directly. Therefore live static-asset evidence is bounded to exact-main source + successful GitHub Pages validation/deployment; no authenticated browser behavior is inferred from crawler access.

## 9. Final production read-only reconciliation

At approximately **2026-09-23 20:24 +07**:
- profiles = **7**
- ACTIVE profiles = **4**
- employee_constraints = **0**
- payroll_entries = **0**
- attendance = **0**
- `get_my_employee_profile_v1`: anon EXECUTE = NO; authenticated EXECUTE = YES
- `list_employee_profile_projection_v1`: anon EXECUTE = NO; authenticated EXECUTE = YES
- `get_my_payroll_self_check_v1`: anon EXECUTE = NO; authenticated EXECUTE = YES
- `list_scoped_payroll_self_check_v1`: anon EXECUTE = NO; authenticated EXECUTE = YES
- `list_manager_attendance_review_v1`: anon EXECUTE = NO; authenticated EXECUTE = YES.

Targeted database Security Advisor counts remain:
- RLS enabled/no policy = **11**
- mutable function search_path = **1**
- anon-executable SECURITY DEFINER = **18**
- authenticated-executable SECURITY DEFINER = **76**

An additional leaked-password-protection Auth configuration warning is currently present. TASK-105 does not touch Auth configuration and does not claim that unrelated warning as introduced or resolved.

No persistent fake production data was created. No production schema or data mutation was performed by TASK-105.

## 10. Scope boundaries preserved

TASK-105 did not:
- invent monetary formula or pay-rate semantics;
- invent payroll cadence;
- invent PAYROLL_AUTHORIZED mapping;
- invent overtime/break/rounding;
- invent allowance/bonus/deduction semantics;
- mutate payroll state;
- re-enable staffing demand as a canonical Workforce prerequisite;
- start TASK-106;
- enable Workforce Robot;
- modify PFC.

## 11. Canonical handoff

After closure:
- TASK-105 = **DONE**
- E2E-12 = **PARTIAL / TASK-102+103 SOURCE+INTEGRATION SIDE CLOSED / TASK-106 PENDING**
- E2E-13 = **PARTIAL / TASK-102+104 STATE+SELF-CHECK SIDE CLOSED / TASK-106 PENDING**
- E2E-14 = **PARTIAL / TASK-101+104 PROFILE+PAYROLL-AUTH READ SIDE CLOSED / TASK-107 PENDING**
- TASK-106 = **READY / MANUAL_WORK**
- Workforce current = **TASK-106**
- Workforce next = **TASK-107**
- TASK-106 has **not** started
- Workforce Robot = **DISABLED**
- PFC current = **TASK-068**
- PFC next = **TASK-069**
- PFC = **UNCHANGED**

The closure merge SHA is recorded in the closure PR / Work return because a commit cannot contain its own future merge SHA.

## TASK-105 result

**DONE / CANONICAL ROUTES ONLY + REGRESSION GREEN / E2E-12+13+14 REMAIN PARTIAL AS CANONICALLY OWNED / POST-MERGE GREEN**

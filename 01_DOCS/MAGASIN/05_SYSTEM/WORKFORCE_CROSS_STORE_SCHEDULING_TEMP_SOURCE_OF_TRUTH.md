# MAGASIN — Workforce Cross-Store Scheduling — TEMP SOURCE OF TRUTH

**Search key:** `WORKFORCE-CROSS-STORE`  
**Track ID:** `WORKFORCE_CROSS_STORE_SCHEDULING_V1`  
**Created:** 2026-09-28  
**Status:** XSTORE-001→010 IMPLEMENTED / EXACT-MAIN GREEN / XSTORE-C01→C02 DONE / XSTORE-C03 READY / XSTORE-C04→C05 REQUIRED BEFORE XSTORE-011 / XSTORE-011 BLOCKED  
**Repository:** `magasincoffee/magasincoffee.github.io`  
**Lifecycle:** TEMPORARY — delete this file after implementation is fully accepted and the proven rules are reconciled into canonical Workforce documentation.

> New-chat bootstrap: search for **WORKFORCE-CROSS-STORE**, read this file first, then reconcile current repository state before changing Workforce code. Do not reopen or rewrite the already-closed Workforce Operations V1 history.

## 0. Structural audit — 2026-09-28

A live Manager-page check exposed a production authority mismatch that must be resolved before cross-store scheduling implementation.

Verified findings:

1. **Manager route and backend role model disagree.**
   - `/05_MANAGER/` currently admits any ACTIVE non-Employee account instead of enforcing one canonical Manager authority set.
   - Workforce RPCs such as `get_manager_accessible_stores`, `get_manager_weekly_availability`, `get_manager_weekly_schedule` and generation readers accept only `OWNER` or `STORE_MANAGER`.
   - Production currently has no ACTIVE `STORE_MANAGER`; there is an ACTIVE manager-family role that is not accepted by Workforce RPCs.
   - Result: the page loads, but the server correctly fails closed with `ROLE_NOT_ALLOWED`.

2. **Store scope is not established for the live Manager path.**
   - `can_access_store` requires `STORE_MANAGER` plus exact store codes in `profiles.access_scope`.
   - A Manager-facing account without that canonical scope cannot load Workforce data even if the UI route opens.

3. **The Manager shell is still a prototype container with static/demo business content in source.**
   - canonical JS replaces/hides some surfaces at runtime;
   - however hard-coded KPI/staff/swap/attendance examples remain in `manager-shell-v1.html`;
   - production architecture should not depend on later scripts successfully hiding prototype business data.

4. **Manager modules do not share one authority/context service.**
   - Availability, Staff, Official Schedule and other modules independently create Supabase clients and independently resolve store scope;
   - one role/scope mismatch therefore appears in multiple screens with inconsistent UX.

5. **Current employee store model is not sufficient for the approved cross-store logic.**
   - `employee_constraints` already has one `preferred_store_id` plus `allowed_store_ids[]`, but production currently has no rows;
   - it does not represent an ordered store ranking such as `CN3 > CN2 > CN4 > CN1`;
   - a canonical ordered management-owned Store Priority model is still required.

6. **Availability is still store-coupled.**
   - `employee_availability.preferred_store_id` exists;
   - the active Employee UI requires choosing a store for each registration;
   - this contradicts the newly approved time-only Availability rule and must be migrated safely rather than merely hidden in UI.

7. **Scheduling draft state is currently store-centric.**
   - `schedule_generation_runs` is operated as one store/week generation;
   - the cross-store target requires one Manager operating view and global conflict checks across CN1–CN4;
   - keep `work_schedules` as final canonical schedule truth, but design a safe enterprise planning/orchestration layer rather than reactivating deprecated legacy auto-scheduling blindly.

8. **Staffing requirement data already exists but is not yet trusted as the new robot authority.**
   - production contains existing `staffing_requirement_templates` data;
   - SCHED-02 revoked/deprecated browser mutation authority for the old demand path;
   - XSTORE-007 must reconcile this existing data against the Owner-approved real staffing rule before Auto Schedule can use it.

9. **Previous Manager readiness evidence was incomplete for real production identity.**
   - SCHED-02 explicitly recorded that production had no ACTIVE `STORE_MANAGER`;
   - Manager authority was proven with fixtures/security tests, not a real active Manager identity;
   - final XSTORE acceptance must include a real production-safe Manager role/scope smoke.

### Immediate architecture gate

Before XSTORE profile/scheduling changes, the project must define one canonical Manager authority model:

```text
AUTHENTICATED USER
→ role / capability
→ allowed stores
→ Manager Context
→ Workforce readers/writers
```

Do not fix `ROLE_NOT_ALLOWED` by broadly allowing every Manager-family role. Inventory, finance and Workforce authority must remain explicit.

## 0.1 Role split — Owner decision 2026-09-28

Canonical role distinction is locked:

- `OWNER` = Chủ hệ thống.
- `STORE_MANAGER` = **Quản lý cửa hàng** — Workforce/store operations role.
- `INVENTORY_MANAGER` = **Quản lý kho** — separate future inventory role; out of scope for this Workforce track.
- `STAFF / EMPLOYEE` = Nhân viên.

For the approved shared-workforce model, `STORE_MANAGER` receives `access_scope = ALL` so the Manager scheduling surface can operate CN1–CN4 together.

Owner Access implementation:
- role label is now **Quản lý cửa hàng** for `STORE_MANAGER`;
- role label is now **Quản lý kho** for `INVENTORY_MANAGER`;
- saving `STORE_MANAGER` sets `access_scope = ALL`;
- moving a non-Owner account away from `STORE_MANAGER` clears the Workforce store scope so old Workforce authority is not retained;
- production migration `xstore_001_store_manager_access_scope_owner_grant` grants only bounded `access_scope` UPDATE privilege to authenticated; existing Owner-only RLS remains the authorization boundary.

Do not use `INVENTORY_MANAGER` as a substitute for `STORE_MANAGER` in Workforce.  
Do not implement Inventory/Warehouse functionality in this track.

Current production acceptance:
- one ACTIVE `STORE_MANAGER` is present with `access_scope = ALL`;
- the live Manager Workforce page loads real Availability data under that authority;
- `INVENTORY_MANAGER` remains separate and is not accepted as Workforce authority;
- XSTORE-001 is CLOSED.

## 0.2 Owner correction — 2026-10-01 — recurring weekly staffing requirement

A post-implementation Owner review found that the XSTORE-007 weekly staffing-input model is not the desired real operating model.

### Correct business rule

Staffing demand is a **recurring weekly operating configuration**, not transaction data that a Manager must re-enter for each calendar week.

Canonical meaning:

```text
Weekly Staffing Template = how many people each store normally needs by weekday/time block
Availability             = when employees can work in a specific target week
Schedule DRAFT            = proposed employee assignments for a specific target week
work_schedules            = published official schedule truth
```

Manager/Owner configures the staffing template once using:

```text
store + day_of_week + start_time + end_time + target_headcount
```

Example:

```text
CN1 · Monday · 07:00–12:00 · 2 people
```

The same rule is reused for future weeks until management explicitly changes and saves it. Manager must **not** have to recreate identical requirements for every new week.

### Required UX

The Manager staffing-requirement surface must be presented as a weekly operating board, visually aligned with the official scheduling board:

- CN1–CN4 in one coherent operating view;
- Monday→Sunday columns;
- one or more time blocks per day/store;
- target headcount visible directly in each block;
- explicit edit/save flow;
- saved values persist as the default recurring weekly configuration;
- no technical fields such as `authority_source`, migration names or legacy minimum/maximum semantics shown to normal users.

### Authority correction

The already-implemented XSTORE-007 model stores Robot authority in date-bound `staffing_requirements` rows tagged `authority_source='XSTORE_V1'`. That implementation history remains valid evidence, but this model is **superseded for final production acceptance** by the recurring weekly configuration described above.

The legacy table `staffing_requirement_templates` demonstrates an earlier recurring-week concept, but it must **not** be blindly reactivated as final authority. Reconcile and design one clean canonical recurring authority that preserves current role/scope/security rules and avoids parallel truths.

### Execution gate

Do **not** execute XSTORE-011 real-data acceptance using the current weekly/date-bound staffing input.

Complete XSTORE-C01→C05 first. Only then may XSTORE-011 resume.

## 1. Purpose

Extend the closed Workforce Operations V1 scheduling flow so MAGASIN can operate the real shared-workforce model across CN1, CN2, CN3 and CN4.

The target operating flow is:

```text
Manager-owned employee store priorities
+
Employee weekly time availability
+
4-store staffing requirements
↓
Cross-store schedule draft
↓
Manager review/edit
↓
Validate
↓
Publish
```

Robot/automation may create a **DRAFT only**. Manager remains the final scheduling decision-maker.

## 2. Owner-approved business rules

### 2.1 Store priority belongs to Employee Profile

Each employee has an ordered list of stores determined by management.

Example:

```text
Như Huỳnh
1. CN3 — primary
2. CN2
3. CN4
4. CN1
```

Meaning:
- CN3 is the primary/highest-priority store;
- CN2, CN4, CN1 are secondary stores in descending priority;
- a store absent from the allowed list is NOT_ELIGIBLE, not merely low priority.

Manager/Owner controls this profile. Employee may view it but cannot change it.

The primary store remains a separate business fact for contract/profile/reporting purposes. The ordered store-priority list is used by scheduling.

### 2.2 Weekly Availability becomes time-only

Normal Employee weekly registration answers:

```text
"When can I work?"
```

not:

```text
"Which store do I choose this week?"
```

Therefore the normal Availability flow should remove the per-registration store selector after the new profile-level store-priority authority is implemented safely.

Availability and Store Priority are separate truths:

```text
Availability     = when the employee can work
Store Priority   = where management prefers the employee to work
Schedule         = where/when the employee is actually assigned
```

No temporary weekly store-exclusion feature is approved in this track yet. Do not invent one without a later Owner decision.

### 2.3 One enterprise schedule view across four stores

Scheduling must be understandable as one weekly MAGASIN plan, not four isolated scheduling decisions.

Owner/authorized scheduling management should be able to see the four store schedules together in the same weekly context, similar to the real operating schedule sheet:

```text
CN1
employee × Mon..Sun

CN2
employee × Mon..Sun

CN3
employee × Mon..Sun

CN4
employee × Mon..Sun
```

Useful filters/views may include all stores, one store, and employee-centric view, but they must project one canonical scheduling truth.

### 2.4 Cross-store safety

An employee assigned at one store for a time window must not appear as free for an overlapping assignment at another store.

The system must validate cross-store conflicts globally, including:
- same employee / overlapping time;
- existing max-shift/day rules;
- ACTIVE employee authority;
- store eligibility from the management-owned profile;
- current canonical schedule ownership.

Cross-store assignment does not change the employee's primary store.

### 2.5 Auto Schedule

Auto Schedule is a management aid, not an autonomous publisher.

```text
Availability + Store Priority + Staffing Requirements
→ AUTO SCHEDULE
→ DRAFT
→ Manager review/edit
→ Validate
→ Publish
```

The scheduler should consider all four stores together rather than filling CN1, then CN2, then CN3, then CN4 independently.

Priority order is a strong scheduling preference, not permission to violate hard constraints.

The automatic scheduler must not be implemented until the staffing-requirement input is explicitly defined and approved.

## 3. Affected product surfaces

Only the discussed scheduling surfaces are in this track:

1. **Employee Profile**
   - primary store;
   - ordered allowed-store priority;
   - Manager/Owner write authority;
   - Employee read-only projection.

2. **Employee Availability**
   - remove normal weekly store selection;
   - keep date/time availability registration;
   - preserve week/timezone and existing safety semantics.

3. **Manager / Owner Scheduling**
   - shared workforce pool;
   - four-store weekly master view;
   - cross-store assignment/editing;
   - global conflict visibility.

4. **Auto Schedule**
   - global four-store DRAFT proposal;
   - respects eligibility, priority and scheduling constraints;
   - never auto-publishes.

Out of scope unless explicitly added later:
- payroll formula/rates;
- attendance redesign;
- Swap/Give redesign;
- recruiting;
- KPI/performance;
- temporary weekly store exclusion;
- AI making final staffing decisions.

## 4. Implementation plan

| ID | Work | Result | Gate |
|---|---|---|---|
| XSTORE-001 | Store Manager authority + current implementation reconciliation | `STORE_MANAGER + ALL` live; Manager page loads real Workforce data | **DONE** |
| XSTORE-002 | Store Priority Profile contract | Ordered primary/allowed stores; Manager/Owner write; Employee read-only | **DONE / FEATURE READY** |
| XSTORE-003 | Availability simplification | Employee Availability is time-only; legacy per-registration store values cleared | **DONE** |
| XSTORE-004 | Cross-store scheduling contract | Shared pool + global overlap/eligibility validation while preserving canonical schedule truth | **DONE** |
| XSTORE-005 | Four-store master scheduling view | CN1–CN4 visible together in one weekly operating view | **DONE** |
| XSTORE-006 | Cross-store manual assignment | Eligible staff can be assigned across stores; invalid/overlap cases fail closed | **DONE** |
| XSTORE-007 | Staffing Requirement rule | Manager/Owner explicitly enters weekly store/date/time/headcount requirements; only `XSTORE_V1` rows are Robot authority | **DONE / FEATURE READY** |
| XSTORE-008 | Auto Schedule DRAFT engine | Global four-store DRAFT from Availability + Store Priority + explicit requirements; shortages returned; no auto-publish | **DONE / FEATURE READY / REAL INPUT PENDING** |
| XSTORE-009 | Review/edit/publish integration | Robot hands off to existing per-store edit + Validate → Review → Publish canonical state machine | **DONE** |
| XSTORE-010 | Full regression + production-safe acceptance | Exact-main static/browser/cross-role/pages regression | **DONE / EXACT-MAIN GREEN** |
| XSTORE-C01 | Recurring Staffing architecture lock | Reconcile current date-bound XSTORE requirement model, legacy recurring template, role/scope/security boundaries, and lock one recurring weekly authority | **DONE / ARCHITECTURE LOCKED** |
| XSTORE-C02 | Recurring Staffing schema + RPC authority | Implement canonical `store + day_of_week + start + end + target_headcount` persistence/read/write authority; preserve Manager/Owner scope and remove weekly re-entry requirement | **DONE / EXACT-MAIN GREEN** |
| XSTORE-C03 | Manager weekly staffing board UX | Replace row-based weekly/date input with CN1–CN4 Monday→Sunday staffing board; edit once, save, reuse until changed | **READY / NEXT AUTHORITATIVE TASK** |
| XSTORE-C04 | Auto Schedule recurring projection | Auto Schedule projects the saved recurring template into the requested calendar week without creating a second staffing truth | **BLOCKED BY C02/C03** |
| XSTORE-C05 | Regression + production-safe correction acceptance | Prove persistence across weeks, Manager edit/save, Robot projection, security, browser/reload and exact-main gates; no fake staffing/schedule business data | **BLOCKED BY C04** |
| XSTORE-011 | Canonical reconciliation + temp cleanup | Real Manager configuration using the corrected recurring weekly model → Auto Schedule → review/edit → Validate → Review → Publish → permanent-doc reconciliation → delete TEMP SOT | **BLOCKED BY XSTORE-C01→C05** |

## 5. Recommended execution order

```text
XSTORE-001 DONE
→ XSTORE-002 DONE
→ XSTORE-003 DONE
→ XSTORE-004 DONE
→ XSTORE-005 DONE
→ XSTORE-006 DONE
→ XSTORE-007 DONE
→ XSTORE-008 DONE
→ XSTORE-009 DONE
→ XSTORE-010 DONE
→ XSTORE-C01 DONE / recurring staffing architecture locked
→ XSTORE-C02 DONE / recurring staffing schema + RPC authority
→ XSTORE-C03 READY / Manager weekly staffing board UX
→ XSTORE-C04
→ XSTORE-C05
→ XSTORE-011 / real business configuration + live acceptance + cleanup
```

Do not jump to the Robot before profile authority, Availability semantics and cross-store manual scheduling are proven.

## 6. Current Owner boundary

Already approved:
- management owns store priority;
- priority belongs to Employee Profile, not weekly Availability;
- Employee weekly registration becomes time-only;
- four stores share workforce;
- scheduling should expose the total four-store weekly picture;
- Robot/Auto Schedule creates a draft only;
- Manager reviews/edits and publishes.

Staffing Requirement semantics from XSTORE-007 are now **historical implementation state and must be corrected before final acceptance**.

Owner-approved final operating semantics as of 2026-10-01:

- Manager/Owner configures a recurring weekly requirement as **store + weekday + start time + end time + target headcount**;
- the configuration is saved once and reused for later weeks until management edits and saves it;
- Manager must not re-enter the same demand for every calendar week;
- the system must not infer or invent headcount;
- Auto Schedule must project the recurring authority into the selected target week rather than treating date-bound copies as a second authority;
- existing `XSTORE_V1` date-bound rows and legacy template structures are migration/reconciliation inputs only until XSTORE-C01 locks the final canonical authority.

Current execution boundary:
- XSTORE-001→010 are implemented and remain historical accepted implementation lineage;
- XSTORE-C01→C02 are **DONE**; XSTORE-C03 is the **next authoritative task**;
- accepted executable main for XSTORE-007→010: `2429183e30dcc3760327e70a3e8a62019d13d2b0`;
- acceptance evidence: `05_SYSTEM/XSTORE_007_010_STAFFING_AUTO_DRAFT_ACCEPTANCE.md`;
- production currently has 0 Store Priority rows and 0 `XSTORE_V1` Staffing Requirement rows; management must enter real business values;
- no Store Priority, staffing demand, draft assignment or official schedule was fabricated during implementation;
- XSTORE-011 remains open until a real Manager-configured week is exercised end-to-end and accepted.\n- Live preflight on 2026-09-30 reconfirmed: Store Priority rows = 0, XSTORE_V1 Staffing Requirement rows = 0, draft assignments = 0, official schedules = 0.\n- Preflight evidence: `05_SYSTEM/XSTORE_011_LIVE_PREFLIGHT_EVIDENCE_2026_09_30.md`.\n- Current gate is `XSTORE-C03 READY`; real business configuration remains deferred until XSTORE-C03→C05 are complete.

## 6.0.1 XSTORE-C01 recurring staffing architecture lock — 2026-10-01

XSTORE-C01 is **DONE / ARCHITECTURE LOCKED**.

Canonical decision:
- corrected staffing-demand authority will be a new recurring-only persistence: `public.workforce_recurring_staffing_requirements`;
- business contract is exactly `store_id + day_of_week + start_time + end_time + target_headcount`;
- existing date-bound `staffing_requirements` / `authority_source='XSTORE_V1'` rows are historical/reconciliation input only and will not be dual-written;
- legacy `staffing_requirement_templates` remains legacy/reconciliation input only; its deprecated writer is not re-enabled;
- browser direct table access remains denied; ACTIVE `OWNER` / `STORE_MANAGER` use bounded RPCs with `can_access_store` enforcement;
- XSTORE-C04 will project recurring weekday blocks directly into the selected calendar week without persisting date-bound staffing copies;
- `work_schedules` remains the sole official schedule truth.

Canonical C01 evidence:

`05_SYSTEM/XSTORE_C01_RECURRING_STAFFING_ARCHITECTURE_LOCK.md`

Safe cutover order:
```text
C02 add recurring schema/RPC authority
→ C03 switch Manager staffing board
→ C04 switch Robot to recurring projection + revoke/deprecate date-bound XSTORE staffing RPCs
→ C05 regression/production-safe acceptance
```

No production staffing values or schedules are created by C01.

## 6.0.2 XSTORE-C02 recurring staffing schema + RPC authority — 2026-10-01

XSTORE-C02 is **DONE / EXACT-MAIN GREEN**.

Implementation:
- migration: `20261001172500_xstore_c02_recurring_staffing_authority_v1.sql`;
- canonical recurring table: `public.workforce_recurring_staffing_requirements`;
- canonical reader: `list_workforce_recurring_staffing_requirements_v1()`;
- canonical writer: `replace_workforce_recurring_staffing_requirements_v1(jsonb)`;
- direct browser table access is revoked;
- ACTIVE `OWNER` / `STORE_MANAGER` only, with `can_access_store` enforcement;
- no import or dual-write from date-bound `XSTORE_V1` rows or legacy `staffing_requirement_templates`;
- no production staffing values were fabricated.

Canonical evidence:

`05_SYSTEM/XSTORE_C02_RECURRING_STAFFING_SCHEMA_RPC_ACCEPTANCE.md`

Implementation PR #354:
- head `0e4e8f563e01e0a42b2699809b4098c685e32f9e`;
- merge / executable main `e77f8fe630d4dcfba16b3344b11eeaa66e18bfaf`.

Exact-main gates:
- Validate MAGASIN GitHub Pages source `36849502939` = **SUCCESS**;
- UI2 Cross Role Acceptance `36849502941` = **SUCCESS**;
- People Shift Day-10 Tests `36849502990` = **SUCCESS**;
- Pages build/deployment `36849502031` = **SUCCESS**.

XSTORE-C03 is now the next authoritative task. C03 owns the Manager weekly staffing board UX only; C04 owns Robot recurring projection/cutover.

## 6.1 XSTORE-001→006 implementation acceptance — 2026-09-28

Accepted executable main:

`88f59398eca38605e7af599315c425dab2cba33e`

Evidence:
- People Shift Day-10 run `36455322621` = **SUCCESS**;
- UI2 Cross Role Acceptance run `36455322637` = **SUCCESS**;
- Pages source validation run `36455322652` = **SUCCESS**;
- Pages build/deployment run `36455321577` = **SUCCESS**;
- Manager Workforce canonical browser = PASS;
- XSTORE four-store master browser = PASS;
- TASK-107 failure/recovery/security = PASS;
- TASK-108 cold/reload executable recheck = PASS.

Production reconciliation:
- ACTIVE `STORE_MANAGER` with `access_scope = ALL`: present;
- Employee Availability rows: 17;
- Availability rows retaining legacy `preferred_store_id`: 0;
- Employee Store Priority rows: 0 — intentionally not fabricated; management input is still required;
- draft assignments: 0;
- official schedules: 0;
- browser grants on `employee_store_priorities`: none;
- XSTORE reader/writer RPCs are authenticated-executable and retain internal role/scope validation;
- Security Advisor categories are unchanged; authenticated SECURITY DEFINER count increased from 66 to 71 because exactly five XSTORE authenticated RPCs were added.

Implementation result:
- Store Priority management surface is live;
- Employee profile has read-only Store Priority projection;
- Employee Availability is time-only;
- Manager works from the shared employee pool;
- four-store weekly master view is live;
- manual cross-store scheduling uses global safety validation;
- `work_schedules` remains the sole official schedule truth;
- no Robot/Auto Schedule writer has been activated.

## 6.2 XSTORE-007→010 implementation acceptance — 2026-09-29

Accepted executable main:

`2429183e30dcc3760327e70a3e8a62019d13d2b0`

Canonical evidence:

`05_SYSTEM/XSTORE_007_010_STAFFING_AUTO_DRAFT_ACCEPTANCE.md`

Exact-main gates:
- People Shift Day-10 run `36498812008` = **SUCCESS**;
- UI2 Cross Role Acceptance run `36498812066` = **SUCCESS**;
- Pages source validation run `36498811986` = **SUCCESS**;
- Pages build/deployment run `36498811328` = **SUCCESS**;
- XSTORE four-store master browser E2E = PASS;
- XSTORE staffing/Robot static contracts = PASS.

Implementation result:
- Manager can enter real weekly staffing requirements for CN1–CN4;
- legacy staffing data is not Robot authority;
- Robot solves the shared four-store pool using Availability + ordered Store Priority;
- Robot creates DRAFT only and reports shortages;
- Manager remains responsible for edit, Validate, Review and Publish;
- legacy `auto_generate_schedule_generation` remains browser-revoked;
- `work_schedules` remains the sole official schedule truth.

Production remains intentionally free of fabricated business inputs:
- Store Priority rows = 0;
- `XSTORE_V1` Staffing Requirement rows = 0;
- draft assignments = 0;
- official schedules = 0.

## 7. Definition of Done

This track is complete only when:

1. management can set each employee's primary store and ordered allowed-store priorities;
2. Employee cannot modify those priorities;
3. normal weekly Availability no longer requires Employee to choose a store;
4. the scheduler uses one cross-store workforce pool without duplicate/overlapping assignments;
5. Owner/authorized scheduling management can review CN1–CN4 together;
6. manual cross-store assignment is safe and validated;
7. recurring weekly staffing-requirement semantics are implemented: Manager configures once by store/weekday/time/headcount and the saved configuration persists until explicitly changed;
8. Auto Schedule generates a reviewable four-store DRAFT only;
9. Manager can edit, validate and publish through the canonical scheduling path;
10. full relevant regression/E2E/security/reload checks are green;
11. permanent canonical Workforce docs/state contain the proven final rules;
12. **this TEMP Source of Truth is deleted**.

## 8. Closure rule

Do not leave this temporary file as a second permanent source of truth.

At XSTORE-011, only after XSTORE-C01→C05 are complete and the corrected recurring model is exact-main green:
- Manager sets real Store Priority values for employees;
- Manager configures the real recurring weekly staffing template for CN1–CN4 once (weekday/time/headcount), and verifies it persists/reuses across target weeks;
- Manager runs Auto Schedule and reviews any shortages;
- Manager adjusts the DRAFT as needed;
- canonical Validate → Review → Publish succeeds on a real target week;
- reconcile final rules into permanent Workforce architecture/state/evidence;
- record closure evidence;
- remove temporary-track pointers;
- delete `WORKFORCE_CROSS_STORE_SCHEDULING_TEMP_SOURCE_OF_TRUTH.md`.

Until then, this file is the single temporary authority for the cross-store scheduling extension.

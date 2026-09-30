# MAGASIN — Workforce Cross-Store Scheduling — TEMP SOURCE OF TRUTH

**Search key:** `WORKFORCE-CROSS-STORE`  
**Track ID:** `WORKFORCE_CROSS_STORE_SCHEDULING_V1`  
**Created:** 2026-09-28  
**Status:** XSTORE-001→010 IMPLEMENTED / EXACT-MAIN GREEN / XSTORE-011 BLOCKED / OWNER_REQUIRED — REAL BUSINESS CONFIGURATION  
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
| XSTORE-011 | Canonical reconciliation + temp cleanup | Live real-data acceptance, permanent-doc reconciliation, then delete TEMP Source of Truth | **BLOCKED / OWNER_REQUIRED — REAL BUSINESS CONFIGURATION** |

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
→ XSTORE-011 BLOCKED / OWNER_REQUIRED / real business configuration + live acceptance + cleanup
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

Staffing Requirement semantics are now resolved for V1:

- Manager/Owner explicitly enters weekly requirements as **store + date + start time + end time + target headcount**;
- the system does not infer or invent headcount;
- only rows tagged `authority_source='XSTORE_V1'` are consumed by the new Robot;
- legacy staffing templates/rows remain historical/compatibility data and are not new Robot authority.

Current execution boundary:
- XSTORE-001→010 are implemented;
- accepted executable main for XSTORE-007→010: `2429183e30dcc3760327e70a3e8a62019d13d2b0`;
- acceptance evidence: `05_SYSTEM/XSTORE_007_010_STAFFING_AUTO_DRAFT_ACCEPTANCE.md`;
- production currently has 0 Store Priority rows and 0 `XSTORE_V1` Staffing Requirement rows; management must enter real business values;
- no Store Priority, staffing demand, draft assignment or official schedule was fabricated during implementation;
- XSTORE-011 remains open until a real Manager-configured week is exercised end-to-end and accepted.\n- Live preflight on 2026-09-30 reconfirmed: Store Priority rows = 0, XSTORE_V1 Staffing Requirement rows = 0, draft assignments = 0, official schedules = 0.\n- Preflight evidence: `05_SYSTEM/XSTORE_011_LIVE_PREFLIGHT_EVIDENCE_2026_09_30.md`.\n- Current gate is `BLOCKED / OWNER_REQUIRED — REAL BUSINESS CONFIGURATION`; this is not a code/schema/production-health blocker.

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
7. staffing-requirement semantics are explicitly approved;
8. Auto Schedule generates a reviewable four-store DRAFT only;
9. Manager can edit, validate and publish through the canonical scheduling path;
10. full relevant regression/E2E/security/reload checks are green;
11. permanent canonical Workforce docs/state contain the proven final rules;
12. **this TEMP Source of Truth is deleted**.

## 8. Closure rule

Do not leave this temporary file as a second permanent source of truth.

At XSTORE-011, only after real-data live acceptance:
- Manager sets real Store Priority values for employees;
- Manager enters real weekly staffing requirements for CN1–CN4;
- Manager runs Auto Schedule and reviews any shortages;
- Manager adjusts the DRAFT as needed;
- canonical Validate → Review → Publish succeeds on a real target week;
- reconcile final rules into permanent Workforce architecture/state/evidence;
- record closure evidence;
- remove temporary-track pointers;
- delete `WORKFORCE_CROSS_STORE_SCHEDULING_TEMP_SOURCE_OF_TRUTH.md`.

Until then, this file is the single temporary authority for the cross-store scheduling extension.

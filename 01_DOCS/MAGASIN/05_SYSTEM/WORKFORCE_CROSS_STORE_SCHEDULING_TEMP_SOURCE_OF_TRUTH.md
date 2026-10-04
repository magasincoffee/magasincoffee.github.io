# MAGASIN — Workforce Cross-Store Scheduling — TEMP SOURCE OF TRUTH

**Search key:** `WORKFORCE-CROSS-STORE`  
**Track ID:** `WORKFORCE_CROSS_STORE_SCHEDULING_V1`  
**Created:** 2026-09-28  
**Status:** XSTORE-001→010 IMPLEMENTED / EXACT-MAIN GREEN / XSTORE-C01→C05 DONE / XSTORE-012 RELEASED / XSTORE-013→015 DONE / EXACT-MAIN GREEN / XSTORE-016 READY / XSTORE-011 PAUSED UNTIL XSTORE-013→020 COMPLETE  
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
| XSTORE-C03 | Manager weekly staffing board UX | Replace row-based weekly/date input with CN1–CN4 Monday→Sunday staffing board; edit once, save, reuse until changed | **DONE / EXACT-MAIN GREEN** |
| XSTORE-C04 | Auto Schedule recurring projection | Auto Schedule projects the saved recurring template into the requested calendar week without creating a second staffing truth | **DONE / EXACT-MAIN GREEN / LIVE CUTOVER VERIFIED** |
| XSTORE-C05 | Regression + production-safe correction acceptance | Prove persistence across weeks, Manager edit/save, Robot projection, security, browser/reload and exact-main gates; no fake staffing/schedule business data | **DONE / EXACT-MAIN GREEN / PRODUCTION-SAFE ACCEPTANCE** |
| XSTORE-011 | Canonical reconciliation + temp cleanup | Real Manager configuration using the corrected recurring weekly model → Auto Schedule → review/edit → Validate → Review → Publish → permanent-doc reconciliation → delete TEMP SOT | **PAUSED / RESUME AFTER XSTORE-020** |
| XSTORE-012 | Empty DRAFT production hotfix | Empty DRAFT routes back to Auto Schedule; zero-assignment generation fails validation/review/publish; regression + production release | **DONE / RELEASED / EXACT-MAIN GREEN** |
| XSTORE-013 | Coverage semantics + shortage interval engine | Staffing Requirement means continuous required coverage; multiple employees may combine to cover one requirement; shortage output must identify exact uncovered intervals | **DONE / EXACT-MAIN GREEN** |
| XSTORE-014 | Auto Schedule interval composition | Auto Schedule composes compatible employee intervals into continuous coverage instead of requiring one employee to cover the whole requirement block; still DRAFT-only | **DONE / EXACT-MAIN GREEN** |
| XSTORE-015 | Manager manual Availability override + employee picker | Manager/Owner may manually assign an ACTIVE store-eligible employee even without matching Availability; save DRAFT succeeds with an explicit warning/audit marker | **DONE / EXACT-MAIN GREEN** |
| XSTORE-016 | Scheduling information architecture + branch accordion | Weekly global header only; CN1–CN4 become collapsible branch sections; branch identity and editable DRAFT stay in the same section; four-store overview is secondary/collapsible | **READY / NEXT TASK** |
| XSTORE-017 | Inline shortage visualization + direct resolution | Show shortage directly in the exact day/time cell using a dedicated warning color; click shortage to open filtered candidate flow and remove warning immediately when coverage is restored | **PENDING XSTORE-016** |
| XSTORE-018 | Supplemental employee pool semantics | Replace “Nguồn tham khảo” with actionable employee groups: chưa được xếp / còn thời gian có thể xếp / không đăng ký nhưng có thể điều động | **PENDING XSTORE-017** |
| XSTORE-019 | Unified workflow integration + regression qualification | Integrate global summary, per-store edit/save, manual override, shortage recalculation, Validate/Review/Publish; static/browser/security/Postgres/exact-RC gates GREEN | **PENDING XSTORE-018** |
| XSTORE-020 | Live production acceptance + permanent reconciliation | Owner/Manager runs real target week end-to-end, confirms CN1–CN4 UX and coverage, then reconcile permanent docs and resume/close XSTORE-011 | **PENDING XSTORE-019** |

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
→ XSTORE-C03 DONE / Manager weekly staffing board UX
→ XSTORE-C04 DONE / Auto Schedule recurring projection
→ XSTORE-C05 DONE / exact-main green / production-safe acceptance
→ XSTORE-012 DONE / empty-DRAFT production repair released
→ XSTORE-013 DONE / exact-main green / continuous coverage + exact shortage intervals
→ XSTORE-014 DONE / exact-main green / interval-composed Auto Schedule
→ XSTORE-015 DONE / exact-main green / Manager Availability override + all eligible employee picker
→ XSTORE-016 READY / scheduling information architecture + CN accordion
→ XSTORE-017 / inline shortage cells + direct resolution
→ XSTORE-018 / supplemental employee pool
→ XSTORE-019 / integrated regression + exact-RC qualification
→ XSTORE-020 / live production acceptance + permanent reconciliation
→ XSTORE-011 RESUME / final live closure + TEMP SOT deletion
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
- XSTORE-001→010 and XSTORE-C01→C05 remain accepted implementation lineage;
- XSTORE-012 is **DONE / RELEASED / EXACT-MAIN GREEN**;
- real Store Priority and recurring staffing business inputs now exist and have already been exercised during the XSTORE-012 production investigation;
- Owner has approved the Scheduling V3 architecture in section 6.0.9 below;
- XSTORE-013 is **DONE / EXACT-MAIN GREEN**;
- XSTORE-014 is **DONE / EXACT-MAIN GREEN**;
- XSTORE-015 is **DONE / EXACT-MAIN GREEN**;
- **XSTORE-016 is the sole next executable task**;
- XSTORE-011 is intentionally **PAUSED** until XSTORE-013→020 are completed, because publishing a real week before correcting continuous coverage, manual override and Manager UX would accept superseded behavior;
- no task may relax cross-store overlap, ACTIVE employee, store eligibility, official overlap or other existing hard safety boundaries;
- Store Priority remains a hard eligibility boundary in this track: Manager may override Availability, but may not assign an employee to a store absent from that employee's Store Priority profile;
- Auto Schedule must continue to create DRAFT only; Manager/Owner remains final review/publish authority.

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

## 6.0.3 XSTORE-C03 recurring weekly staffing board UX — 2026-10-01

XSTORE-C03 is **DONE / EXACT-MAIN GREEN**.

Implementation:
- Manager staffing input is now a CN1–CN4 × Monday→Sunday recurring weekly board;
- the board uses only `list_workforce_recurring_staffing_requirements_v1()` and `replace_workforce_recurring_staffing_requirements_v1(jsonb)`;
- recurring saves use `store_id + day_of_week + start_time + end_time + target_headcount`;
- the Manager staffing UX no longer sends `work_date` or `p_week_start`;
- date-bound staffing reader/writer RPCs are no longer called by this UI;
- Auto Schedule is intentionally disabled/fail-closed until XSTORE-C04 switches Robot projection to recurring authority;
- no production staffing values or schedules were fabricated by C03.

Canonical evidence:

`05_SYSTEM/XSTORE_C03_RECURRING_STAFFING_BOARD_ACCEPTANCE.md`

Implementation PR #356:
- head `0ab23a8ba98fadc07e9d5059d85fd219712f51bf`;
- merge / executable main `12fda81c2209837bc649e8755b92198449b3c749`.

Exact-main gates:
- Validate MAGASIN GitHub Pages source `36851309700` = **SUCCESS**;
- UI2 Cross Role Acceptance `36851309494` = **SUCCESS**;
- People Shift Day-10 Tests `36851309615` = **SUCCESS**;
- Pages build/deployment `36851308669` = **SUCCESS**.

XSTORE-C04 is now the next authoritative task. C04 owns Robot recurring projection/cutover; XSTORE-C05 remains the full regression and production-safe correction acceptance gate.

## 6.0.4 XSTORE-C04 Auto Schedule recurring projection — 2026-10-01

XSTORE-C04 is **DONE / EXACT-MAIN GREEN / LIVE CUTOVER VERIFIED**.

Implementation:
- Auto Schedule reads only the canonical recurring staffing authority;
- recurring weekday blocks are projected directly into the selected target week using `p_week_start + (day_of_week - 1)`;
- no date-bound staffing rows are materialized or dual-written;
- Manager UI uses `XSTORE_GLOBAL_RECURRING_V1`;
- Robot assignments remain DRAFT-only;
- browser EXECUTE is revoked from the superseded date-bound staffing reader/writer RPCs;
- no production staffing values, draft assignments or official schedules were fabricated.

Production reconciliation:
- missing live C02 recurring authority was reconciled using the already accepted C02 migration;
- C04 live migration `xstore_c04_recurring_auto_projection_v1` is applied;
- recurring staffing rows = 0;
- date-bound `XSTORE_V1` staffing rows = 0;
- draft assignment rows = 0;
- official schedule rows = 0.

Canonical evidence:

`05_SYSTEM/XSTORE_C04_RECURRING_AUTO_PROJECTION_ACCEPTANCE.md`

Implementation PR #358:
- head `1264a44663a175c10747aaa5056bf3953b81dc37`;
- merge / executable main `5256400601b328006e25b0d820fa2d0c02ec9304`.

Exact-main gates:
- Validate MAGASIN GitHub Pages source `36853279404` = **SUCCESS**;
- UI2 Cross Role Acceptance `36853279359` = **SUCCESS**;
- People Shift Day-10 Tests `36853279603` = **SUCCESS**;
- Pages build/deployment `36853279239` = **SUCCESS**.

XSTORE-C05 is now the next authoritative task and owns the full recurring-model regression, security, persistence/reload and production-safe acceptance gate before XSTORE-011.

## 6.0.5 XSTORE-C05 recurring regression + production-safe correction acceptance — 2026-10-01

XSTORE-C05 is **DONE / EXACT-MAIN GREEN / PRODUCTION-SAFE ACCEPTANCE**.

Acceptance:
- recurring Manager save/read/edit/read semantics were proven using an existing ACTIVE `STORE_MANAGER` identity inside a transaction;
- the same recurring staffing configuration was projected into two distinct target weeks;
- both Robot results remained `DRAFT`, `published=false`, with `staffing_authority=RECURRING_WEEKLY_V1`;
- no date-bound `XSTORE_V1` staffing rows were materialized;
- no official `work_schedules` rows were created;
- all transactional test values and temporary generation runs were rolled back;
- post-rollback production returned to recurring rows = 0, XSTORE date-bound rows = 0, assignments = 0, official schedules = 0;
- browser regression proves recurring edit persistence across reload and reuse after changing target week;
- recurring direct browser CRUD remains denied;
- old date-bound staffing RPC browser execution remains revoked.

Canonical evidence:

`05_SYSTEM/XSTORE_C05_RECURRING_REGRESSION_ACCEPTANCE.md`

Acceptance PR #360:
- head `38a9760bccd80ba4f8795850646179846f24d229`;
- merge / executable main `adeeee59bcec573f81d03a273a2d93babc0583dd`.

Exact-main gates:
- Validate MAGASIN GitHub Pages source `36855243385` = **SUCCESS**;
- UI2 Cross Role Acceptance `36855243424` = **SUCCESS**;
- People Shift Day-10 Tests `36855243411` = **SUCCESS**;
- Pages build/deployment `36855242031` = **SUCCESS**.

XSTORE-011 is now the next authoritative task. It owns real Manager business configuration, real Auto Schedule review/edit/Validate/Review/Publish acceptance, permanent Workforce documentation reconciliation, and deletion of this TEMP SOT.

## 6.0.6 XSTORE-011 live preflight blocker — 2026-10-01

XSTORE-011 is **BLOCKED / OWNER INPUT REQUIRED**.

Live production preflight:
- ACTIVE employees = 4;
- Store Priority rows = 0;
- employees with Store Priority = 0;
- ACTIVE stores = 4;
- recurring staffing rows = 0;
- stores with recurring staffing = 0;
- draft assignment rows = 0;
- official `work_schedules` rows = 0.

Candidate real target week `2026-10-05 → 2026-10-11` already has real Availability:
- Availability rows = 10;
- employees with Availability = 2.

Owner/Manager must provide or enter two real business inputs before XSTORE-011 may resume:
1. ordered Store Priority for each participating employee;
2. recurring weekly staffing blocks for CN1–CN4 using `store + weekday + start_time + end_time + target_headcount`.

These values must not be inferred from primary store, Availability, legacy templates, historical schedules, or date-bound staffing.

Canonical blocker evidence:

`05_SYSTEM/XSTORE_011_OWNER_INPUT_BLOCKER_2026_10_01.md`

After the two business inputs exist in production, XSTORE-011 resumes with real Auto Schedule → Manager review/edit → Validate → Review → Publish, then permanent-document reconciliation and deletion of this TEMP SOT.

No Store Priority, staffing demand, draft assignment or official schedule was fabricated during this blocked attempt.

## 6.0.7 XSTORE-012 empty-DRAFT production blocker — 2026-10-04

XSTORE-012 is **IN DEVELOPMENT / PRODUCTION RELEASE NOT YET AUTHORIZED**.

Owner resumed XSTORE-011 with real production inputs. Direct production reconciliation for target week `2026-10-05 → 2026-10-11` found:

- recurring staffing requirements = 103 blocks across 4 stores, total target headcount = 120;
- Availability = 100 rows from 17 employees;
- Store Priority = 98 rows across 26 employees and all 4 stores;
- current target-week generation = one CN1 `DRAFT` created by `MANAGER_DIRECT_V1`;
- target-week generation assignments = 0;
- official `work_schedules` rows = 0;
- pre-scheduler eligibility check found 96/103 staffing blocks with at least one eligible employee; therefore a completely empty schedule is not explained by missing Availability alone.

Production defect:

```text
existing empty DRAFT
→ guided workflow treats DRAFT as already generated
→ Auto Schedule action is skipped
→ zero-assignment validator produces zero violations
→ empty schedule can appear VALID
→ Review/Publish can become reachable
```

Required repair:

1. four-store master must expose persisted global DRAFT/official row counts to the guided workflow;
2. `DRAFT + globalDraftCount = 0` must route back to **Tạo lịch nháp tự động**;
3. browser Validate / Review / Publish controls must fail closed when the selected generation has zero assignments;
4. `validate_schedule_generation_v1` must return `EMPTY_GENERATION` for a zero-assignment generation;
5. existing Review and Publish RPCs remain canonical and inherit the server guard through their existing validator call;
6. changed runtime assets must receive a new cache-busting version;
7. regression coverage must prove the empty-DRAFT recovery and server fail-closed contract.

Release authority:

- this is production-impacting and must follow `PRODUCTION_RELEASE_GOVERNANCE_V1_SOURCE_OF_TRUTH.md`;
- development occurs only on a non-production branch;
- backend migration requires isolated/staging proof before production;
- exact RC SHA, rollback SHA, green QA and Owner approval are required before release;
- normal release window remains 00:00 Asia/Ho_Chi_Minh unless Owner explicitly authorizes a same-conversation exception after reviewing the exact RC.

## 6.0.8 XSTORE-012 emergency production release — 2026-10-04

XSTORE-012 is **DONE / RELEASED / EXACT-MAIN GREEN**.

Owner explicitly approved emergency release before the normal 00:00 Asia/Ho_Chi_Minh window for exact RC:

`abd9c973f9a7f7fa84dbf1da57fa8439597a113c`

Release evidence:

- PR #383 merged with expected-head guard;
- production merge/main SHA: `308401f914034795c23412076446e976af2538fe`;
- rollback baseline: `883ee6eda6e2d769d8a0da47ddb2eb43af12e740`;
- production migration `xstore_012_empty_draft_validation_guard_v1` applied successfully;
- production validator definition contains `EMPTY_GENERATION`;
- Validate MAGASIN GitHub Pages source run `37195716193` = **SUCCESS**;
- XSTORE-012 Backend Hotfix QA run `37195716109` = **SUCCESS**;
- UI2 Cross Role Acceptance run `37195716148` = **SUCCESS**;
- People Shift Day-10 Tests run `37195716156` = **SUCCESS**;
- Pages build/deployment run `37195715408` = **SUCCESS**.

Production-safe smoke:

- an authenticated Owner-context transaction called the exact production Auto Schedule for target week `2026-10-05 → 2026-10-11` with replacement enabled;
- inside the transaction Auto Schedule produced **87 DRAFT assignments across all 4 stores**;
- the transaction produced **0 official schedule rows**;
- the transaction was rolled back;
- after rollback production returned to the pre-smoke state: **0 draft assignments, 1 pre-existing empty target-week generation, 0 official rows**.

This proves the repaired production path can now move the existing empty DRAFT back through Auto Schedule without persisting test business truth.

Next XSTORE-011 live action:

```text
Manager opens target week 2026-10-05
→ guided action shows Tạo lịch nháp tự động for the empty DRAFT
→ Manager runs Auto Schedule
→ review the generated CN1–CN4 DRAFT and shortages
→ edit as needed
→ Validate
→ Review
→ Publish
```

Do not mark XSTORE-011 complete until the real Manager-approved schedule is published and final permanent-doc reconciliation/temp cleanup is complete.

## 6.0.9 Scheduling V3 architecture lock — Owner approved 2026-10-04

This section is the **authoritative temporary implementation contract** for XSTORE-013→020.

### A. Staffing Requirement means continuous operating coverage

A recurring Staffing Requirement such as:

```text
CN1 · Monday · 06:00–12:00 · target_headcount=1
```

means:

> At every moment inside 06:00–12:00, at least one eligible employee must be present at that store.

It does **not** mean one employee must personally work the entire 06:00–12:00 block.

Valid coverage example:

```text
Requirement: 06:00–12:00 · need 1
A:           06:00–09:00
B:           09:00–12:00
Result:      FULLY COVERED
```

Invalid coverage example:

```text
Requirement: 06:00–12:00 · need 1
A:           06:00–08:00
B:           08:30–12:00
Result:      SHORTAGE 08:00–08:30 · missing 1
```

For target headcount 2, every instant inside the requirement must have at least 2 active assignments.

The scheduler/shortage engine must therefore operate on interval coverage, not whole-block employee matching.

### B. Auto Schedule interval composition

Auto Schedule must:
- read recurring Staffing Requirement + Employee Availability + Store Priority;
- consider CN1–CN4 globally;
- compose multiple compatible employee availability intervals to satisfy one requirement when necessary;
- preserve all existing overlap/day/store/official hard safety rules;
- prefer higher Store Priority and reasonable shift continuity;
- avoid unnecessary fragmentation when equivalent full coverage can be produced with fewer/cleaner shifts;
- return exact uncovered intervals, target, assigned coverage and missing headcount;
- create DRAFT only;
- never automatically Review or Publish.

Auto Schedule must continue to respect registered Availability. The Availability override in section C is Manager-only.

### C. Manager manual Availability override

Availability is a planning input, not a hard prohibition on Manager manual assignment.

Manager/Owner may manually select an employee who did not register the selected time when real operations require calling/dispatching that person.

Canonical rule:

```text
Auto Schedule + Availability mismatch     => NOT ELIGIBLE for automatic assignment
Manager manual + Availability mismatch    => ALLOWED DRAFT + explicit warning/audit
```

Manager employee selection must not be availability-only.

For the selected store and interval, the picker should classify employees:

1. **Đã đăng ký phù hợp** — registered Availability covers the interval.
2. **Còn thời gian có thể xếp** — employee has Availability remaining around existing assignments.
3. **Có thể điều động thủ công** — no matching Availability, but ACTIVE + store-eligible + no hard conflict.
4. **Không thể chọn** — hard conflict or hard authority failure.

When Manager manually assigns outside Availability:
- DRAFT save succeeds;
- assignment receives a canonical warning/audit marker such as `MANAGER_AVAILABILITY_OVERRIDE`;
- UI shows a human label such as **“Quản lý điều động ngoài thời gian đăng ký”**;
- Validate/Review/Publish treat the Availability mismatch as a warning only for this explicit Manager override;
- non-manual writers may not silently bypass Availability.

### D. Hard blocks that remain fail-closed

The new manual flexibility must **not** weaken these boundaries:

- employee must exist and be ACTIVE;
- employee role must be scheduling-eligible;
- target store must be present in the employee's management-owned Store Priority profile;
- assignment must be inside the target week;
- end time must be after start time;
- same employee may not overlap within the same store;
- same employee may not overlap across different stores;
- assignment may not overlap official schedule truth;
- max assignment/day and other accepted hard Workforce safety rules remain enforced;
- REVIEWED/PUBLISHED/official state cannot be silently overwritten.

**Store Priority override is NOT approved in XSTORE-013→020.**
Manager may override Availability only. A store absent from Store Priority remains `STORE_NOT_ELIGIBLE`.

### E. Scheduling page information architecture

The Manager scheduling page must follow this hierarchy:

```text
GLOBAL WEEK HEADER
→ BRANCH DRAFT ACCORDIONS
→ ACTIVE BRANCH EDITOR + INLINE SHORTAGES
→ EMPLOYEES AVAILABLE TO SUPPLEMENT
→ COLLAPSIBLE FOUR-STORE OVERVIEW
→ VALIDATE / REVIEW / PUBLISH
```

#### Global week header

The top of the page contains only system-wide weekly context.

Example:

```text
XẾP LỊCH TUẦN 05/10–11/10/2026

4 cửa hàng · 87 ca nháp · 7 khoảng thiếu người · Chưa phát hành

[Tạo lịch tự động] [Kiểm tra] [Duyệt] [Phát hành]
```

Do not place the CN1/CN2/CN3/CN4 selector in the global header.

#### Branch DRAFT accordion

Each store is a collapsible row.

Example:

```text
▶ CN1 · 24 ca · thiếu 2 khoảng
▶ CN2 · 22 ca · đủ nhân sự
▶ CN3 · 20 ca · thiếu 1 khoảng
▼ CN4 · 21 ca · đủ nhân sự
```

Only the branch being edited needs to be expanded.

Inside CN4:

```text
CN4 · MAGASIN COFFEE CN4
LỊCH NHÁP ĐANG CHỈNH
Tuần 05/10–11/10/2026

T2 | T3 | T4 | T5 | T6 | T7 | CN
...
[Lưu thay đổi]
```

The branch selector/context and its editor must remain in the same visual block.

### F. Inline shortage visualization

Do not create a separate long **“Cần xử lý”** list above the calendar.

A shortage must appear directly inside the affected day/time cell.

Example:

```text
⚠ THIẾU 1 NHÂN VIÊN
06:00–08:00
Nhu cầu: 2
Đã xếp: 1
[+ Bổ sung người]
```

Shortage calculation must use the exact uncovered interval. If only 08:00–09:00 is uncovered inside a 06:00–12:00 requirement, show 08:00–09:00, not the entire requirement block.

When Manager restores sufficient coverage, the shortage card must disappear immediately after local recalculation/save refresh.

#### Time colors

Existing canonical assignment colors remain:

- `05:00–<12:00` → yellow;
- `12:00–<17:00` → light red;
- `17:00–22:00` → light blue.

Shortage uses a **dedicated high-salience warning color** distinct from all three time-band colors. Use the purple/indigo warning family with accessible contrast, plus:
- warning icon;
- explicit **THIẾU N NHÂN VIÊN** text.

Never communicate shortage by color alone.

### G. “Nguồn tham khảo” is removed

The current technical label **Nguồn tham khảo / Thời gian nhân viên có thể làm** is superseded.

Use an actionable section:

**NHÂN VIÊN CÓ THỂ BỔ SUNG**

Classify rows/cards by real Manager action:

#### 1. Chưa được xếp ca nào
Employee registered Availability but has no DRAFT assignment in the target week/available interval.

#### 2. Còn thời gian có thể xếp
Employee already has an assignment, but part of registered Availability remains unused.

Example:

```text
Đăng ký: 06:00–17:00
Đã xếp: 06:00–12:00
Còn có thể xếp: 12:00–17:00
```

#### 3. Có thể điều động thủ công
Employee has no matching Availability but is ACTIVE, store-eligible and free of hard conflicts.

When Manager clicks **+ Bổ sung người** on a shortage cell, filter/rank this pool for the exact store/date/time shortage:

```text
1. registered and matching
2. registered with remaining usable time
3. manual dispatch candidate
4. hard-conflict employees unavailable/disabled
```

### H. Four-store overview becomes secondary

The large four-store matrix must not sit between store selection and the editable DRAFT.

Replace it with a collapsed secondary section:

```text
▶ TỔNG QUAN 4 CỬA HÀNG
```

Expand only when Manager explicitly wants enterprise overview.

### I. Canonical Manager workflow

```text
Open target week
→ Auto Schedule
→ see CN1–CN4 accordion summaries
→ open only the branch needing review
→ inspect/edit shifts in that branch
→ shortage appears directly in exact calendar cell
→ click + Bổ sung người
→ choose matching / remaining / manual-dispatch employee
→ save DRAFT
→ recalculated shortage disappears when covered
→ Validate hard conflicts
→ Review
→ Publish
```

Availability override warnings may remain visible through Validate/Review/Publish but do not block those transitions when the override was explicitly created by Manager/Owner and no hard rule is violated.

### J. Robot task plan and acceptance gates

#### XSTORE-013 — Continuous coverage + exact shortage engine

Scope:
- implement reusable interval-coverage evaluation for recurring requirement blocks;
- calculate exact uncovered sub-intervals and missing headcount;
- preserve current recurring requirement authority;
- do not change Auto Schedule assignment composition yet except where required to expose/test coverage primitives.

Acceptance:
- split shifts can fully satisfy one requirement;
- a real time gap yields only that gap as shortage;
- target_headcount > 1 is evaluated at every interval boundary;
- deterministic SQL/unit regression covers boundaries and adjacent intervals;
- no production business data fabricated.

#### XSTORE-014 — Interval-composed Auto Schedule

Scope:
- update `auto_generate_cross_store_schedule_v1` to use continuous coverage instead of full-block candidate coverage;
- combine multiple employee intervals when required;
- preserve Store Priority, cross-store overlap, official overlap and DRAFT-only authority;
- minimize unnecessary fragmentation when feasible.

Acceptance:
- the 06:00–09:00 + 09:00–12:00 case can satisfy a 06:00–12:00 requirement;
- no gap/overlap corruption;
- shortages returned as exact uncovered intervals;
- Auto Schedule still rejects employees outside registered Availability;
- four-store global safety remains fail-closed.

#### XSTORE-015 — Manager Availability override + full eligible employee picker

Scope:
- Manager manual picker reads all ACTIVE employees eligible for the selected store;
- matching Availability is ranking/status metadata, not the only candidate source;
- DRAFT writer tags explicit manual out-of-Availability assignment;
- validator converts that tagged Availability mismatch to warning;
- existing hard conflicts remain violations.

Acceptance:
- Manager can save out-of-Availability DRAFT;
- warning survives reload;
- Validate/Review/Publish can proceed with warning and no hard violations;
- Auto Schedule remains Availability-bound;
- employee outside Store Priority remains blocked.

#### XSTORE-016 — Scheduling IA + branch accordion editor

Scope:
- global header contains week/global summary/actions only;
- remove global branch selector from header;
- CN1–CN4 DRAFTs become accordion rows;
- active branch editor is rendered inside its branch;
- four-store master moves to collapsed secondary overview;
- preserve Tabler/shared UI conventions and responsive behavior.

Acceptance:
- Manager never needs to remember a branch selected far above the editor;
- only one branch editor is open at a time unless explicit product behavior says otherwise;
- switching branches preserves unsaved-change safety;
- mobile/desktop browser gates pass.

#### XSTORE-017 — Inline shortage cells + direct supplement action

Scope:
- render exact shortage cards inside affected calendar day/time cells;
- use dedicated shortage warning token distinct from the 3 time-band colors;
- provide **+ Bổ sung người** from shortage card;
- locally/authoritatively recalculate shortage after edit/save.

Acceptance:
- exact shortage interval is visually colocated with the affected schedule;
- shortage is not duplicated in a separate long “Cần xử lý” list;
- fully repaired coverage removes the warning;
- accessibility does not depend on color alone.

#### XSTORE-018 — Supplemental employee pool

Scope:
- remove “Nguồn tham khảo” wording;
- derive and show:
  - Chưa được xếp ca nào;
  - Còn thời gian có thể xếp;
  - Có thể điều động thủ công;
- shortage action filters/ranks the pool to exact branch/date/time.

Acceptance:
- already-assigned employee is not mislabeled “Chưa được xếp”;
- remaining availability is computed after DRAFT assignments;
- manual candidates are clearly marked;
- hard-conflict candidates cannot be selected.

#### XSTORE-019 — Unified workflow integration + RC qualification

Scope:
- integrate XSTORE-013→018 with global summary and canonical Validate→Review→Publish;
- remove/hide superseded scheduling UI paths without creating parallel writers;
- add regression for exact runtime cache versions and reload behavior;
- backend migration tests on isolated PostgreSQL;
- browser cross-role/responsive/pages qualification;
- create exact RC and rollback evidence.

Required gates:
- People Shift GREEN;
- UI2 Cross Role GREEN;
- Pages source validation GREEN;
- Pages build/deployment GREEN;
- new XSTORE coverage/manual-override/browser tests GREEN;
- isolated backend migration proof GREEN;
- no production release before exact-RC Owner approval under production release governance.

#### XSTORE-020 — Live production acceptance + canonical reconciliation

Scope:
- after Owner approves exact RC, release using production governance;
- live target-week Auto Schedule;
- Manager confirms branch accordion, exact shortages and supplemental employee flow;
- exercise a real Manager manual Availability override only if actually needed;
- Validate→Review→Publish real approved schedule;
- reconcile proven rules into permanent Workforce docs;
- resume/finalize XSTORE-011;
- delete this TEMP SOT only after closure evidence is complete.

### K. Robot execution control

The robot must execute tasks in strict order:

```text
XSTORE-013
→ XSTORE-014
→ XSTORE-015
→ XSTORE-016
→ XSTORE-017
→ XSTORE-018
→ XSTORE-019
→ XSTORE-020
→ resume XSTORE-011 closure
```

Rules:
- one authoritative task per execution turn;
- re-read this TEMP SOT before validating any task ID;
- do not skip a PENDING dependency;
- do not invent new business rules when the task can proceed from this locked architecture;
- if a real Owner decision is required, mark the current task BLOCKED and record the exact decision required in this SOT;
- implementation must occur on non-production branch/PR;
- production-impacting work follows `PRODUCTION_RELEASE_GOVERNANCE_V1_SOURCE_OF_TRUTH.md`;
- do not merge/release when required gates are red;
- after every merge, verify exact-main evidence before advancing the task status;
- update this TEMP SOT after each completed task so the next robot/chat can derive state from source alone.

Machine handoff:

```text
MAGASIN_TASK_CONTROL_V1
STATUS=READY
TASK_ID=NONE
NEXT_TASK_ID=XSTORE-016
CHECK_AFTER_SECONDS=0
END_MAGASIN_TASK_CONTROL_V1
```

## 6.0.10 XSTORE-013 continuous coverage + exact shortage engine acceptance — 2026-10-04

XSTORE-013 is **DONE / EXACT-MAIN GREEN**.

Implementation:
- migration `20261004220500_xstore_013_continuous_coverage_shortage_v1.sql` adds reusable `evaluate_workforce_coverage_shortages_v1(...)`;
- coverage is evaluated at every assignment boundary;
- adjacent split shifts from different employees may jointly satisfy one requirement;
- shortage output returns only exact uncovered intervals with assigned and missing headcount;
- one employee is deduplicated across overlapping assignment rows;
- bounded `list_cross_store_staffing_shortages_v1(date)` reads canonical recurring staffing requirements plus current DRAFT/REVIEWED assignments;
- recurring staffing authority remains unchanged;
- Auto Schedule assignment composition remains unchanged and is owned by XSTORE-014;
- no production business data was fabricated.

Implementation PR #385:
- initial implementation head `39975814fb5ac335fabb702e8b50441c9f2e518b`;
- repair head `12da2320cf300400c94f3a5175010e0735e6cf8d`;
- merge / executable main `1d8b750de7cde569017b810959f725c7bbd2d530`.

Exact-main gates for `1d8b750de7cde569017b810959f725c7bbd2d530`:
- XSTORE-013 Coverage QA run `37211610254` = **SUCCESS**;
- People Shift Day-10 Tests run `37211610355` = **SUCCESS**;
- UI2 Cross Role Acceptance run `37211610085` = **SUCCESS**;
- Validate MAGASIN GitHub Pages source run `37211610198` = **SUCCESS**;
- Pages build/deployment run `37211609496` = **SUCCESS**.

PostgreSQL exact-main proof:
- adjacent split coverage = PASS;
- exact 08:00–08:30 gap detection = PASS;
- target_headcount > 1 boundary evaluation = PASS;
- overlapping rows for the same employee are deduplicated = PASS;
- bounded recurring shortage reader exact-interval test = PASS.

XSTORE-014 is now the sole next executable task and owns interval-composed Auto Schedule. XSTORE-011 remains paused until XSTORE-013→020 are complete.

## 6.0.11 XSTORE-014 interval-composed Auto Schedule acceptance — 2026-10-04

XSTORE-014 is **DONE / EXACT-MAIN GREEN**.

Implementation:
- migration `20261004222500_xstore_014_interval_composed_auto_schedule_v1.sql` replaces whole-block candidate matching with continuous interval composition;
- Auto Schedule repeatedly fills exact under-covered intervals using the XSTORE-013 coverage primitive;
- multiple employees with adjacent registered Availability may jointly satisfy one recurring requirement;
- candidate assignments remain clipped to registered Availability;
- Store Priority, DRAFT/REVIEWED cross-store overlap, official schedule overlap, max assignment/day and hour limits remain fail-closed;
- longer compatible intervals are preferred when the same earliest shortage boundary can be covered, reducing avoidable fragmentation;
- returned shortages use exact uncovered intervals with assigned and missing headcount;
- Auto Schedule remains DRAFT-only and does not implement the Manager Availability override owned by XSTORE-015;
- no production business data was fabricated.

Implementation PR #386:
- implementation head `79c13fbbe13f1d30959b20ba6fd61d631eef23e9`;
- merge / executable main `bf762d5d91af0fbd57c947cb120290f8b807895c`.

Exact-main gates for `bf762d5d91af0fbd57c947cb120290f8b807895c`:
- XSTORE-014 Interval Auto Schedule QA run `37213221680` = **SUCCESS**;
- People Shift Day-10 Tests run `37213221617` = **SUCCESS**;
- UI2 Cross Role Acceptance run `37213221594` = **SUCCESS**;
- Validate MAGASIN GitHub Pages source run `37213221599` = **SUCCESS**;
- Pages build/deployment run `37213220928` = **SUCCESS**.

PostgreSQL exact-main proof:
- adjacent 06:00–09:00 + 09:00–12:00 Availability composes one 06:00–12:00 requirement = PASS;
- a real gap is returned only as the exact uncovered interval = PASS;
- target_headcount boundary evaluation = PASS;
- cross-store overlap remains fail-closed = PASS;
- exact XSTORE-013 coverage primitive + XSTORE-014 migration apply cleanly on PostgreSQL 17 = PASS.

XSTORE-015 is complete and exact-main green. XSTORE-016 is now the sole next executable task and owns the scheduling information architecture + branch accordion editor. XSTORE-011 remains paused until XSTORE-013→020 are complete.


## 6.0.12 XSTORE-015 Manager Availability override + eligible employee picker acceptance — 2026-10-04

XSTORE-015 is **DONE / EXACT-MAIN GREEN**.

Implementation:
- migration `20261004224500_xstore_015_manager_availability_override_v1.sql` replaces the canonical DRAFT writer/validator contract for explicit Manager/Owner Availability override;
- canonical audit marker is `MANAGER_AVAILABILITY_OVERRIDE`;
- human-facing warning is **Quản lý điều động ngoài thời gian đăng ký**;
- the Manager picker reads the full canonical ACTIVE scheduling-eligible employee pool and filters by Store Priority for the selected store;
- registered Availability is ranking/status metadata for manual selection rather than the only candidate source;
- an explicit out-of-Availability manual DRAFT is server-tagged with the override marker and remains warning-only through validation;
- untagged Availability mismatch remains a hard validation violation;
- Store Priority, ACTIVE/role eligibility, generation/store/week integrity, same/cross-store overlap, official schedule overlap, max/day rules and reviewed/published overwrite protection remain fail-closed;
- Auto Schedule remains strictly Availability-bound and DRAFT-only;
- Manager/Owner final review/publish authority is unchanged.

Implementation PR #387:
- final implementation / repair head `d252e5b56c1f83f50a8fe4a0c90b271a37dfb09d`;
- merge / executable main `21921175b8160a920993c80ef074616c159a5e12`.

Exact-main gates for `21921175b8160a920993c80ef074616c159a5e12`:
- XSTORE-015 Manager Override QA run `37217850100` = **SUCCESS**;
- People Shift Day-10 Tests run `37217850095` = **SUCCESS**;
- UI2 Cross Role Acceptance run `37217850098` = **SUCCESS**;
- Validate MAGASIN GitHub Pages source run `37217850084` = **SUCCESS**;
- Pages build/deployment run `37217849367` = **SUCCESS**.

PostgreSQL exact-main proof:
- explicit manual out-of-Availability DRAFT persists `MANAGER_AVAILABILITY_OVERRIDE` and validates with warning-only = PASS;
- warning remains valid at REVIEWED validation stage = PASS;
- employee outside Store Priority remains hard-blocked = PASS;
- untagged non-manual Availability bypass remains `AVAILABILITY_MISMATCH` violation = PASS.

Browser/regression proof:
- Manager/Owner employee pool loads through `list_employee_workforce_profiles_v1`;
- legacy fixtures were reconciled to the canonical Store Priority employee reader;
- registered Availability add path, DRAFT save, Validate → Review → Publish, employee approved schedule projection and cross-role responsive gates all pass;
- no production business data was fabricated.

XSTORE-016 is now the sole next executable task and owns the scheduling information architecture + CN1–CN4 branch accordion editor. XSTORE-011 remains paused until XSTORE-013→020 are complete.

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
8. Auto Schedule generates a reviewable four-store DRAFT only and can compose multiple employee intervals into continuous requirement coverage;
9. shortage output identifies exact uncovered time intervals/headcount and is rendered directly in the affected branch calendar cell;
10. Manager can manually assign an ACTIVE store-eligible employee outside registered Availability with an explicit warning/audit marker;
11. Availability override does not relax Store Priority, overlap, ACTIVE employee, official schedule or other hard safety rules;
12. Manager scheduling UX uses global week header + CN1–CN4 accordions + colocated branch editor + actionable supplemental employee pool;
13. “Nguồn tham khảo” is removed from the canonical scheduling UX;
14. Manager can edit, validate and publish through the canonical scheduling path;
15. full relevant regression/E2E/security/reload checks are green;
16. XSTORE-020 real production acceptance is complete;
17. permanent canonical Workforce docs/state contain the proven final rules;
18. **this TEMP Source of Truth is deleted**.

## 8. Closure rule

Do not leave this temporary file as a second permanent source of truth.

At final closure, only after XSTORE-C01→C05, XSTORE-012 and XSTORE-013→020 are complete and the corrected Scheduling V3 model is exact-main/live accepted:
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

# MAGASIN — Workforce Cross-Store Scheduling — TEMP SOURCE OF TRUTH

**Search key:** `WORKFORCE-CROSS-STORE`  
**Track ID:** `WORKFORCE_CROSS_STORE_SCHEDULING_V1`  
**Created:** 2026-09-28  
**Status:** XSTORE-001→010 IMPLEMENTED / EXACT-MAIN GREEN / XSTORE-C01→C05 DONE / XSTORE-012 RELEASED / XSTORE-013→018 DONE / XSTORE-019A→019D DONE / EXACT-HEAD GREEN / XSTORE-019E READY / XSTORE-011 PAUSED UNTIL XSTORE-013→020 COMPLETE  
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
| XSTORE-016 | Historical scheduling IA + branch accordion | Exact-main implementation evidence remains valid, but the accordion information architecture is superseded by the Owner calendar-first decision dated 2026-10-05 | **DONE / HISTORICAL UI SUPERSEDED** |
| XSTORE-017 | Inline shortage visualization + direct resolution | Show shortage directly in the exact day/time cell using a dedicated warning color; click shortage to open filtered candidate flow and remove warning immediately when coverage is restored | **DONE / EXACT-MAIN GREEN** |
| XSTORE-018 | Historical supplemental employee pool semantics | Candidate derivation/ranking remains canonical, but the always-visible long employee pool is superseded; the same data must move into an on-demand drawer/picker | **DONE / HISTORICAL UI SUPERSEDED** |
| XSTORE-019 | Previous unified RC qualification | PR #392 exact RC `1301678dbf6ffeef88cd5ced59ffa1c10d6bfae4` passed automation but was explicitly rejected by Owner for scheduling display/interaction architecture; do not merge this RC | **CHANGES_REQUESTED / RC INVALIDATED** |
| XSTORE-019A | Manager single-store calendar workspace | Calendar-first weekly workspace; only one selected store is open; remove branch accordion stack and long always-visible employee pool | **DONE / EXACT-HEAD GREEN** |
| XSTORE-019B | Direct calendar shift editing | Add/edit/move/resize/delete/duplicate DRAFT shifts directly on the weekly calendar while preserving canonical writer and hard safety | **DONE / EXACT-HEAD GREEN** |
| XSTORE-019C | On-demand employee drawer + shortage resolution | Employee candidates appear only when Manager requests add/supplement; exact store/day/time filtering and canonical ranking/manual override semantics | **DONE / EXACT-HEAD GREEN** |
| XSTORE-019D | Employee Availability calendar parity | Employee registers weekly time-only Availability directly on a calendar using the same visual/time interaction model | **DONE / EXACT-HEAD GREEN** |
| XSTORE-019E | Owner calendar parity + responsive workspace | Owner reuses the same single-store calendar workflow; optimize desktop/mobile viewport and preserve role authority | **READY / NEXT TASK** |
| XSTORE-019F | Integrated RC qualification + Owner preview packet | Exact-head regression/browser/backend/cache qualification; freeze new RC and prepare Owner review without production merge | **PENDING XSTORE-019E** |
| XSTORE-020 | Live production acceptance + permanent reconciliation | Only after Owner approves the new exact RC; release via production governance, run real target-week acceptance, reconcile permanent docs and resume XSTORE-011 closure | **PENDING OWNER APPROVAL AFTER XSTORE-019F** |

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
→ XSTORE-C01 DONE
→ XSTORE-C02 DONE
→ XSTORE-C03 DONE
→ XSTORE-C04 DONE
→ XSTORE-C05 DONE
→ XSTORE-012 DONE
→ XSTORE-013 DONE
→ XSTORE-014 DONE
→ XSTORE-015 DONE
→ XSTORE-016 DONE / historical accordion UI superseded
→ XSTORE-017 DONE
→ XSTORE-018 DONE / candidate semantics retained, always-visible pool superseded
→ XSTORE-019 CHANGES_REQUESTED / RC 1301678d... invalidated by Owner
→ XSTORE-019A DONE / exact-head GREEN / single-store calendar workspace
→ XSTORE-019B DONE / exact-head GREEN / direct shift editing
→ XSTORE-019C DONE / exact-head GREEN / on-demand employee drawer + shortage resolution
→ XSTORE-019D DONE / exact-head GREEN / Employee Availability calendar
→ XSTORE-019E READY / Owner parity + responsive workspace
→ XSTORE-019F / integrated qualification + new exact RC
→ OWNER APPROVAL OF NEW EXACT RC
→ XSTORE-020 / midnight production release + live acceptance + reconciliation
→ XSTORE-011 RESUME / final live closure + TEMP SOT deletion
```

XSTORE-019A→019F are implementation tasks and must continue automatically without Owner input unless a genuinely new business decision is required. The robot must not stop merely because the previous PR #392 RC was rejected; that rejection is already resolved by this locked architecture.

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

### E. Calendar-first single-store scheduling architecture — Owner locked 2026-10-05

The previous **CN1–CN4 accordion + always-visible supplemental employee pool** layout is superseded.

The canonical Manager scheduling page is now a **single-store weekly calendar workspace**, visually and interactively similar to a Google Calendar-style schedule editor.

Core rule:

```text
SELECT ONE STORE
→ SHOW THAT STORE'S WEEKLY CALENDAR AS THE PRIMARY SCREEN
→ EDIT DIRECTLY ON THE CALENDAR
→ OPEN EMPLOYEE PICKER/DRAWER ONLY WHEN NEEDED
→ VALIDATE / REVIEW / PUBLISH THROUGH THE EXISTING CANONICAL WORKFLOW
```

When CN1 is selected, the main workspace shows CN1 only. CN2/CN3/CN4 must not consume vertical screen space. Changing store switches the workspace.

The top bar is compact/sticky and contains:
- selected store: CN1 / CN2 / CN3 / CN4;
- target week with previous/current/next navigation;
- DRAFT/REVIEWED/PUBLISHED status;
- Auto Schedule where applicable;
- Save;
- Validate;
- Review;
- Publish.

Do not render the old five-step chips as a large multi-row block. Do not render a long employee list above or below the calendar by default.

The calendar is the dominant viewport:
- columns: T2 → CN;
- vertical time axis: 05:00 → 22:00;
- day header remains visible while the calendar scrolls internally;
- on normal desktop/laptop the seven-day week and selected-store context must remain readable without a page-level horizontal detour;
- vertical time scrolling belongs inside the calendar workspace rather than forcing the user to scroll past unrelated employee cards;
- opening/closing a drawer must return the user to the same store/week/time context.

### F. Direct calendar editing

Manager/Owner must be able to manipulate DRAFT shifts directly on the calendar.

Required interactions:
- click/drag an empty time range to create a shift;
- click an existing shift to edit employee/start/end;
- drag a shift to another day/time;
- resize the shift start/end from its edges;
- delete directly from the shift editor;
- duplicate/copy a shift to another day when requested by the Manager;
- preserve unsaved-change protection when changing store/week;
- all mutations continue through the existing canonical DRAFT writer; do not create a second writer.

A shift card must show the employee name and exact time clearly enough to scan the week without opening a secondary list.

Canonical time-band colors remain:
- `05:00–<12:00` → yellow;
- `12:00–<17:00` → light red;
- `17:00–22:00` → light blue.

### G. Inline shortage + on-demand employee drawer

Shortage stays directly inside the affected day/time cell. Do not create a separate long **Cần xử lý** list.

Example:

```text
⚠ THIẾU 1 NHÂN VIÊN
06:00–08:00
[+ Bổ sung nhân viên]
```

Shortage uses the existing purple/indigo warning family with icon + text and must remain distinct from the three time-band colors.

The old always-visible **NHÓM NHÂN SỰ BỔ SUNG / 25 nhân viên...** area is no longer allowed on the primary scheduling screen.

Employee candidates appear only when the Manager:
- creates a shift;
- edits the employee on a shift; or
- clicks **+ Bổ sung nhân viên** on an exact shortage.

Open a right-side drawer/picker (or equivalent compact overlay) scoped to the exact store/date/time. Canonical ranking remains:

```text
1. Đúng thời gian đăng ký
2. Còn thời gian có thể xếp
3. Có thể điều động thủ công
4. Không thể chọn do hard conflict
```

The third group preserves the accepted `MANAGER_AVAILABILITY_OVERRIDE` warning/audit semantics. Hard-conflict candidates remain disabled.

Closing the picker returns to the full calendar without losing the current store/week/time position.

### H. Employee Availability uses the same calendar mental model

Employee weekly Availability must no longer depend on a form/list interaction that feels unrelated to Manager scheduling.

Canonical Employee model:
- weekly, time-only Availability;
- columns T2 → CN;
- time axis 05:00 → 22:00;
- click/drag empty time to add Availability;
- click/resize/move to edit;
- delete directly;
- no store selection in weekly Availability;
- keep existing Store Priority management authority separate and read-only to Employee.

Availability is visually lighter than an assigned shift so **có thể làm** cannot be confused with **đã được xếp ca**.

Employee and Manager therefore share the same time/calendar mental model while retaining different permissions.

### I. Owner parity, secondary four-store view and canonical workflow

Owner scheduling must reuse the same single-store calendar workspace and canonical DRAFT writer. Owner must not receive a separate technical scheduling UI.

The four-store overview remains available only as a secondary/collapsed summary. It must not sit between store selection and the editable calendar.

Canonical Manager/Owner workflow:

```text
Open target week
→ select CN1/CN2/CN3/CN4
→ calendar for only that store becomes the primary workspace
→ Auto Schedule may create/refresh DRAFT
→ inspect/edit shifts directly on calendar
→ exact shortage appears inside affected calendar cell
→ click + Bổ sung nhân viên only when needed
→ choose registered / remaining / manual-dispatch employee
→ save DRAFT
→ Validate hard conflicts
→ Review
→ Publish
```

Availability override warnings may remain visible through Validate/Review/Publish but do not block those transitions when the override was explicitly created by Manager/Owner and no hard rule is violated.

The previous PR #392 exact RC `1301678dbf6ffeef88cd5ced59ffa1c10d6bfae4` is **not Owner-approved**. It is retained only as automation/evidence history and must not be merged as the release candidate.

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

#### XSTORE-016 — Scheduling IA + branch accordion editor (historical; superseded by XSTORE-019A)

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

#### XSTORE-018 — Supplemental employee pool (historical semantics retained; primary-screen layout superseded by XSTORE-019C)

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

#### XSTORE-019 — Previous RC qualification — CHANGES_REQUESTED

Historical result:
- PR #392;
- exact RC `1301678dbf6ffeef88cd5ced59ffa1c10d6bfae4`;
- automated gates GREEN;
- Owner explicitly rejected the display/interaction architecture after local review on 2026-10-05;
- prior RC approval is invalid/not granted;
- **DO NOT MERGE OR RELEASE THIS EXACT RC**.

The remediation is decomposed into XSTORE-019A→XSTORE-019F.

#### XSTORE-019A — Manager single-store calendar workspace — DONE / EXACT-HEAD GREEN

Scope:
- replace CN1–CN4 accordion stack with one selected-store weekly calendar workspace;
- compact sticky store/week/status/action header;
- calendar is the primary viewport;
- remove the always-visible long supplemental employee list from the primary screen;
- retain inline shortage cards and canonical DRAFT state;
- retain secondary four-store summary only as an optional collapsed view.

Acceptance:
- selecting CN1 shows only CN1 editor/calendar as the main workspace;
- seven-day week and store context are immediately visible;
- employee list does not push the calendar below the fold;
- calendar owns internal time scrolling;
- switching store/week preserves unsaved-change safety;
- no new writer/RPC authority is introduced.

#### XSTORE-019B — Direct calendar shift editing

Scope:
- create DRAFT shift by direct click/drag on empty calendar time;
- edit employee/start/end from the shift;
- drag to move day/time;
- resize start/end;
- delete;
- duplicate/copy when explicitly invoked;
- keep shortage recomputation and canonical save path.

Acceptance:
- add/edit/move/resize/delete all persist through canonical DRAFT authority;
- hard conflicts remain fail-closed;
- assigned employee/time are readable directly on the calendar;
- time-band colors remain canonical;
- keyboard/touch accessible fallback exists for operations that cannot rely on drag alone.

#### XSTORE-019C — On-demand employee drawer + shortage resolution

Scope:
- remove always-visible `NHÓM NHÂN SỰ BỔ SUNG` from the main scheduling workspace;
- open candidate drawer/picker only from add/edit/shortage actions;
- scope/rank candidates to exact store/date/time;
- preserve registered / remaining / manual-dispatch / hard-conflict grouping;
- close picker without losing calendar context.

Acceptance:
- exact-shortage `+ Bổ sung nhân viên` opens the correctly filtered candidate set;
- manual out-of-Availability selection keeps `MANAGER_AVAILABILITY_OVERRIDE`;
- hard-conflict candidate remains disabled;
- selecting a candidate updates the DRAFT calendar and shortage state;
- calendar returns to full usable width after drawer closes.

#### XSTORE-019D — Employee Availability calendar parity

Scope:
- replace/augment Employee weekly Availability interaction with the same weekly calendar mental model;
- direct add/edit/move/resize/delete for time-only Availability;
- no store choice in Employee Availability;
- keep management-owned Store Priority separate.

Acceptance:
- Employee can register and edit weekly time ranges directly on the calendar;
- no store priority authority is leaked to Employee;
- Availability styling is visibly distinct from assigned-shift styling;
- existing Availability persistence/validation contracts remain unchanged;
- mobile and desktop browser regressions cover direct interaction.

#### XSTORE-019E — Owner parity + responsive calendar workspace

Scope:
- Owner scheduling reuses the same selected-store calendar workspace/canonical writer;
- no separate Owner technical scheduling implementation;
- optimize desktop/laptop/mobile layout so calendar remains the primary workspace;
- sticky context/actions; internal calendar scrolling; drawer overlay/side panel without page sprawl.

Acceptance:
- Owner and Manager see the same scheduling mental model with role-correct authority;
- desktop/laptop calendar is readable with all seven day columns and selected-store context;
- mobile remains operable without long technical lists;
- no horizontal/page overflow regression;
- no duplicate scheduling writer.

#### XSTORE-019F — Integrated qualification + new exact RC

Scope:
- integrate XSTORE-019A→019E;
- run static/browser/security/cache/reload regressions;
- run XSTORE-013→018 compatibility gates;
- run People Shift + UI2 Cross Role + Owner Control Tower;
- run isolated PostgreSQL proof where backend contracts are touched;
- create exact RC + rollback packet;
- provide local/preview review target for Owner;
- stop at Owner approval gate; do not merge production.

Required gates before `RC_READY`:
- XSTORE calendar interaction/browser coverage GREEN;
- People Shift GREEN;
- UI2 Cross Role GREEN;
- Owner Control Tower GREEN;
- relevant XSTORE-013→018 gates GREEN;
- isolated backend proof GREEN where applicable;
- branch source/cache/reload qualification GREEN;
- exact RC SHA + rollback SHA recorded.

#### XSTORE-020 — Live production acceptance + canonical reconciliation

Scope:
- only after Owner explicitly approves the new exact RC from XSTORE-019F;
- wait for production governance release window;
- merge/deploy exact approved RC;
- verify Pages source + Pages deployment on exact-main;
- live target-week Auto Schedule;
- Manager confirms selected-store calendar, direct shift editing, exact shortages and on-demand candidate drawer;
- Employee confirms calendar Availability registration;
- Owner confirms calendar parity;
- exercise a real Manager manual Availability override only if actually needed;
- Validate→Review→Publish real approved schedule;
- reconcile proven rules into permanent Workforce docs;
- resume/finalize XSTORE-011;
- delete this TEMP SOT only after closure evidence is complete.

### K. Robot execution control

The robot must execute remaining tasks in strict order:

```text
XSTORE-019B
→ XSTORE-019C
→ XSTORE-019D
→ XSTORE-019E
→ XSTORE-019F
→ OWNER APPROVAL OF NEW EXACT RC
→ XSTORE-020
→ resume XSTORE-011 closure
```

Rules:
- one authoritative task per execution turn;
- re-read this TEMP SOT before validating any task ID;
- XSTORE-019A→019F are executable without further Owner input under the locked calendar-first architecture;
- do not stop on the old PR #392 Owner gate; that RC was rejected and is no longer a valid release candidate;
- do not invent new business rules;
- if a genuinely new Owner decision is required, mark the current task BLOCKED and record the exact decision required in this SOT;
- implementation must occur on a non-production branch/PR;
- PR #392 / branch `xstore-019-unified-rc-v1` may be reused for the remediation chain if the robot keeps the PR state/body synchronized and treats every implementation commit as invalidating the previous RC SHA;
- production-impacting work follows `PRODUCTION_RELEASE_GOVERNANCE_V1_SOURCE_OF_TRUTH.md`;
- do not merge/release before XSTORE-019F is GREEN and Owner explicitly approves the new exact RC;
- after production merge, verify exact-main evidence before advancing XSTORE-020;
- update this TEMP SOT after each completed task so the next robot/chat can derive state from source alone.

Machine handoff:

```text
MAGASIN_TASK_CONTROL_V1
STATUS=READY
TASK_ID=NONE
NEXT_TASK_ID=XSTORE-019E
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

XSTORE-016 is complete and exact-main green. XSTORE-017 is now the sole next executable task and owns inline shortage visualization + direct resolution. XSTORE-011 remains paused until XSTORE-013→020 are complete.

## 6.0.13 XSTORE-016 scheduling IA + branch accordion acceptance — 2026-10-05

XSTORE-016 is **DONE / EXACT-MAIN GREEN**.

Implementation:
- PR #388 moved the Manager/Owner scheduling information architecture to one global weekly header plus CN1–CN4 branch accordions;
- the old global branch selector was removed;
- exactly one branch editor is active at a time and is colocated with its branch identity;
- branch/week navigation preserves unsaved-change safety through an explicit discard confirmation;
- Auto Schedule remains a global weekly operation outside the branch editor and four-store master;
- the four-store master is now a collapsed secondary overview instead of sitting between branch selection and DRAFT editing;
- Manager scheduling UI2 was reconciled to the accordion topology without creating a second writer;
- DRAFT row edits sync DOM values before rerender so edited employee/time values persist into the canonical save payload;
- the global Auto Schedule container is responsive with border-box sizing and does not create page overflow;
- legacy People Shift/UI2 browser regressions and fixtures were reconciled to the canonical XSTORE-016 topology;
- no production business data was fabricated.

Implementation PR #388:
- final implementation / repair head `4ca577a3ae799ff4237d047071df093deec5585d`;
- merge / executable main `8e55e0c2e9b9ee15d5577014a107b8c1d545e814`.

Exact-main gates for `8e55e0c2e9b9ee15d5577014a107b8c1d545e814`:
- XSTORE-016 Scheduling IA QA run `37222094775` = **SUCCESS**;
- XSTORE-015 Manager Override QA run `37222094944` = **SUCCESS**;
- People Shift Day-10 Tests run `37222094840` = **SUCCESS**;
- UI2 Cross Role Acceptance run `37222094773` = **SUCCESS**;
- Validate MAGASIN GitHub Pages source run `37222094835` = **SUCCESS**;
- Pages build/deployment run `37222094131` = **SUCCESS**.

Browser/regression proof:
- branch accordion desktop/mobile coverage passes at 1440px and 390px;
- exactly one branch editor is open and the global `#msdStore` selector is absent;
- unsaved branch switching is guarded and preserves DRAFT safety;
- XSTORE recurring setup remains responsive with no page horizontal overflow;
- People Shift and UI2 cross-role/cold-reload regressions pass on exact main.

XSTORE-017 is now the sole next executable task and owns inline shortage cells + direct supplement action. XSTORE-011 remains paused until XSTORE-013→020 are complete.

## 6.0.14 XSTORE-017 inline shortage cells + direct supplement acceptance — 2026-10-05

XSTORE-017 is **DONE / EXACT-MAIN GREEN**.

Implementation:
- PR #389 renders exact staffing shortages directly inside the affected branch day/time cell;
- shortage warning uses a dedicated purple/indigo visual token distinct from the canonical morning/afternoon/evening time-band colors;
- every shortage card includes visible text plus icon/status semantics so accessibility does not depend on color alone;
- **+ Bổ sung người** opens the existing canonical Manager manual-assignment path prefilled to the exact shortage date/time instead of introducing a second writer;
- unsaved DRAFT edits recalculate shortage locally from the canonical recurring staffing requirements plus current DRAFT assignments;
- after save/reload, shortage is re-read from server authority through `list_cross_store_staffing_shortages_v1`;
- fully repaired coverage removes the inline warning immediately;
- the old detailed global “Cần xử lý” shortage list is replaced by concise branch guidance so the shortage is not duplicated away from its schedule cell;
- legacy People Shift, UI2, SCHED-01/SCHED-05 and cache-lineage fixtures were reconciled to the legitimate XSTORE-017 read-only readers without weakening Store Priority, overlap, role/scope or publish safeguards;
- no production business data was fabricated.

Implementation PR #389:
- final implementation / repair head `7cb312530089db49ae4ec9085538c7ed883c424e`;
- squash merge / executable main `2e6d42d2f4055078c6346ba1f570e75037d1b7cf`.

Exact-main gates for `2e6d42d2f4055078c6346ba1f570e75037d1b7cf`:
- XSTORE-017 Inline Shortage QA run `37226307710` = **SUCCESS**;
- XSTORE-016 Scheduling IA QA run `37226307733` = **SUCCESS**;
- XSTORE-015 Manager Override QA run `37226307811` = **SUCCESS**;
- People Shift Day-10 Tests run `37226307692` = **SUCCESS**;
- UI2 Cross Role Acceptance run `37226307723` = **SUCCESS**;
- Validate MAGASIN GitHub Pages source run `37226307751` = **SUCCESS**;
- Pages build/deployment run `37226307392` = **SUCCESS**.

Browser/regression proof:
- exact shortage interval appears in the correct day cell;
- warning token is visually distinct and includes non-color status text/icon semantics;
- direct supplement action preselects the exact shortage date/start/end;
- full Availability coverage removes the warning;
- partial coverage recalculates to only the remaining exact interval;
- save refreshes shortage from server authority;
- Manager/Owner branch switching, DRAFT save, Validate → Review → Publish and employee schedule regressions remain green;
- desktop/mobile XSTORE-017 browser checks remain green.

XSTORE-018 is now the sole next executable task and owns the actionable supplemental employee pool. XSTORE-011 remains paused until XSTORE-013→020 are complete.

## 6.0.15 XSTORE-018 supplemental employee pool acceptance — 2026-10-05

XSTORE-018 is **DONE / EXACT-MAIN GREEN**.

Implementation:
- PR #391 removes the old “Nguồn tham khảo” scheduling wording and replaces it with an actionable supplemental employee pool;
- the pool derives and displays **Chưa được xếp ca nào**, **Còn thời gian có thể xếp** and **Có thể điều động thủ công** from canonical four-store schedule/Availability authority;
- the shortage action filters candidates to the exact branch/date/time and ranks Availability-covered candidates before Manager manual-override candidates;
- employees already assigned in the week are not mislabeled as unassigned;
- remaining Availability is recalculated after current DRAFT assignments;
- manual candidates outside Availability are explicitly marked for Manager override/audit semantics;
- cross-store overlap, official-schedule overlap and max-two-per-day hard conflicts remain non-selectable;
- the existing canonical Manager DRAFT writer remains the only scheduling mutation path;
- People Shift Day-10 and legacy regression fixtures were reconciled to the current read-only weekly-plan reader and canonical manual picker without weakening production validation;
- no production business data was fabricated.

Implementation PR #391:
- final implementation / repair head `c462aa7ccdcbaf9c73f783122b51261c68c344b5`;
- squash merge / executable main `083a025159873993aa8afc647795950f0ed5e196`.

Exact-main gates for `083a025159873993aa8afc647795950f0ed5e196`:
- XSTORE-018 Supplemental Pool QA run `37260372281` = **SUCCESS**;
- XSTORE-017 Inline Shortage QA run `37260372257` = **SUCCESS**;
- XSTORE-016 Scheduling IA QA run `37260372271` = **SUCCESS**;
- XSTORE-015 Manager Override QA run `37260372276` = **SUCCESS**;
- People Shift Day-10 Tests run `37260372287` = **SUCCESS**;
- UI2 Cross Role Acceptance run `37260372932` = **SUCCESS**;
- Validate MAGASIN GitHub Pages source run `37260372229` = **SUCCESS**;
- Pages build/deployment run `37260371800` = **SUCCESS**.

Browser/regression proof:
- the three actionable supplemental groups render without the retired reference wording;
- exact-shortage ranking clearly separates Availability-covered and manual-override candidates;
- an employee with an existing DRAFT assignment moves out of the unassigned group and shows only remaining Availability;
- hard-conflict candidates are visibly blocked from selection;
- save continues through `replace_schedule_generation_assignments` and refreshes the canonical weekly plan/shortage readers;
- People Shift canonical create → manual add → save → Validate → Review → Publish regression is green;
- desktop/mobile supplemental-pool browser checks remain green.

The original XSTORE-019 RC was later rejected by Owner for display/interaction architecture. XSTORE-019A is now the sole next executable task under the 2026-10-05 calendar-first architecture. XSTORE-011 remains paused until XSTORE-019A→020 are complete.

## 6.0.16 Owner calendar-first scheduling decision / PR #392 RC rejection — 2026-10-05

Owner reviewed the local XSTORE-019 candidate and explicitly **did not approve** the scheduling display structure.

Rejected exact RC:
- PR #392;
- commit `1301678dbf6ffeef88cd5ced59ffa1c10d6bfae4`;
- automation result before rejection: GREEN;
- release approval: **NOT GRANTED**;
- state: **CHANGES_REQUESTED / RC INVALIDATED**.

Owner-locked replacement architecture:
- calendar-first, Google Calendar-style weekly interaction;
- one selected store workspace at a time;
- CN1 selected => CN1 calendar is the primary screen; other stores do not occupy vertical editor space;
- direct add/edit/move/resize/delete shift interactions on calendar;
- exact shortage stays inside the affected time cell;
- employee candidates open only on demand in a scoped drawer/picker;
- no long always-visible employee list on the primary screen;
- Employee weekly Availability uses the same calendar mental model;
- Owner scheduling uses the same calendar mental model and canonical writer;
- canonical time colors remain yellow / light red / light blue; shortage remains distinct purple/indigo;
- four-store overview remains secondary/collapsed;
- Validate → Review → Publish and backend authority remain unchanged.

XSTORE-019A completed GREEN on exact PR #392 head `a849c71e925e46a50287c3866098c3448f841bcb`. Execution handoff is XSTORE-019B. No additional Owner decision is required to run XSTORE-019B→019F.

## 6.0.17 XSTORE-019A single-store calendar workspace acceptance — 2026-10-05

XSTORE-019A is **DONE / EXACT-HEAD GREEN**.

Implementation branch / PR:
- PR #392: `xstore-019-unified-rc-v1`;
- exact completed head: `a849c71e925e46a50287c3866098c3448f841bcb`;
- production merge/release: **NOT PERFORMED**.

Accepted result:
- Manager scheduling no longer renders stacked CN1–CN4 accordion editors;
- one selected-store weekly calendar is the primary workspace;
- selected-store switcher remains compact while the other stores do not consume editor height;
- seven-day week and store context are visible in the primary calendar workspace;
- calendar owns internal time scrolling;
- the long supplemental employee pool is not rendered by default;
- canonical Availability and eligible employee data still load before DRAFT without exposing the long pool;
- inline shortage behavior remains compatible;
- four-store overview remains secondary/collapsed;
- store/week navigation keeps unsaved-change protection;
- canonical DRAFT writer/RPC authority is unchanged;
- Owner shares the same selected-store scheduling runtime without a second writer.

Exact-head terminal GREEN evidence:
- `XSTORE-019A Calendar Workspace QA` run `37276090363` → success;
- `People Shift Day-10 Tests` run `37276090380` → success;
- `UI2 Cross Role Acceptance` run `37276090274` → success;
- `XSTORE-019 Unified RC QA` run `37276090451` → success;
- `XSTORE-013 Coverage QA` run `37276090328` → success;
- `XSTORE-014 Interval Auto Schedule QA` run `37276090329` → success;
- `XSTORE-015 Manager Override QA` run `37276090460` → success;
- `XSTORE-016 Scheduling IA QA` run `37276090377` → success;
- `XSTORE-017 Inline Shortage QA` run `37276090394` → success;
- `XSTORE-018 Supplemental Pool QA` run `37276090308` → success;
- `Owner Control Tower Tests` run `37276090365` → success;
- `SOP Task Tests` run `37276090291` → success;
- `Procurement QA Robot` run `37276090338` → success.

XSTORE-019A must not be re-executed unless a future regression explicitly reopens it.

## 6.0.18 XSTORE-019B direct calendar shift editing acceptance — 2026-10-05

XSTORE-019B is **DONE / EXACT-HEAD GREEN**.

Implementation branch / PR:
- PR #392: `xstore-019-unified-rc-v1`;
- exact accepted head: `82f1ba9fa3919a9ea10a90d6ae6e0cd78f769dfb`;
- production merge/release: **NOT PERFORMED**.

Accepted result:
- Manager can create DRAFT shifts directly from empty calendar time and edit employee/date/start/end from the shift card;
- DRAFT shifts can be moved by drag while preserving duration;
- start/end resizing remains available with bounded resize hitboxes that do not intercept neighboring shift actions;
- explicit delete and duplicate/copy actions are available directly from the calendar shift;
- short shifts have a dedicated move grip so drag remains reachable without hiding edit/delete controls;
- keyboard/touch fallback remains available through the shift editor for operations that cannot rely on drag alone;
- Manager Availability override remains warning/audit-only when explicitly marked, while untagged Availability mismatch and all hard conflicts remain fail-closed;
- shortage recalculation remains tied to the current DRAFT and canonical recurring staffing requirements;
- `replace_schedule_generation_assignments` remains the only DRAFT persistence writer; no second scheduling writer/RPC authority was introduced;
- canonical morning / afternoon / evening time-band colors and existing Validate → Review → Publish authority remain unchanged;
- UI2 responsive touch-target QA excludes the 8px drag-only resize affordance while still requiring normal actionable controls to keep the 44px touch target and requiring start/end editor fallback.

Repair evidence on PR #392:
- exact accepted head `82f1ba9fa3919a9ea10a90d6ae6e0cd78f769dfb` supersedes earlier repair candidates;
- dedicated XSTORE-019B browser acceptance proves create/edit/move/resize/delete/duplicate plus canonical save behavior;
- prior pointer-interception regressions were resolved by bounding resize handles and separating the move grip from action controls;
- stale responsive QA was reconciled to the locked XSTORE-019B contract instead of weakening product behavior.

Exact-head terminal GREEN evidence:
- XSTORE-019B Direct Calendar Editing QA run `37339020181` → **SUCCESS**;
- XSTORE-019 Unified RC QA run `37339020139` → **SUCCESS**;
- UI2 Cross Role Acceptance run `37339020314` → **SUCCESS**;
- People Shift Day-10 Tests run `37339020321` → **SUCCESS**;
- XSTORE-019A Calendar Workspace QA run `37339020265` → **SUCCESS**;
- XSTORE-013 Coverage QA run `37339020233` → **SUCCESS**;
- XSTORE-014 Interval Auto Schedule QA run `37339020112` → **SUCCESS**;
- XSTORE-015 Manager Override QA run `37339020320` → **SUCCESS**;
- XSTORE-016 Scheduling IA QA run `37339020256` → **SUCCESS**;
- XSTORE-017 Inline Shortage QA run `37339020375` → **SUCCESS**;
- XSTORE-018 Supplemental Pool QA run `37339020119` → **SUCCESS**;
- Owner Control Tower Tests run `37339020183` → **SUCCESS**;
- SOP Task Tests run `37339020101` → **SUCCESS**;
- Procurement QA Robot run `37339020152` → **SUCCESS**.

PR #392 remains open and must **not** be merged or released yet. XSTORE-019F plus explicit Owner approval remain the release gate.

XSTORE-019C was the next authoritative task after this acceptance and is now accepted in §6.0.19. XSTORE-019B must not be re-executed unless a future regression explicitly reopens it.


## 6.0.19 XSTORE-019C on-demand employee drawer + shortage resolution acceptance — 2026-10-06

XSTORE-019C is **DONE / EXACT-HEAD GREEN**.

Implementation branch / PR:
- PR #392: `xstore-019-unified-rc-v1`;
- exact accepted head: `ed88004a0aa4bffc9deabed7ad6152a5de243415`;
- production merge/release: **NOT PERFORMED**.

Accepted result:
- the always-visible supplemental employee pool is removed from the primary scheduling workspace;
- Manager/Owner opens the candidate UI only from explicit add or exact-shortage actions;
- exact-shortage `+ Bổ sung nhân viên` scopes the candidate set to the selected store/date/time and preserves registered / remaining / manual-dispatch / hard-conflict grouping;
- manual out-of-Availability selection retains `MANAGER_AVAILABILITY_OVERRIDE`;
- hard-conflict candidates remain non-selectable;
- candidate selection updates the current DRAFT and recalculates inline shortage state without introducing a second writer;
- `replace_schedule_generation_assignments` remains the canonical DRAFT persistence writer;
- closing the candidate drawer restores the same calendar viewport immediately and re-applies it on the next animation frame so the calendar does not jump to the top or flash through a stale scroll position;
- Manager/Owner canonical Validate → Review → Publish authority and backend/RPC boundaries remain unchanged;
- PR #392 remains open and unmerged.

Repair evidence:
- stale XSTORE-017 persistent-picker contract was reconciled to the XSTORE-019C on-demand drawer authority;
- SCHED-02 and SCHED-05 browser flows were reconciled to open the candidate drawer before interacting with manual employee controls;
- People Shift Day-10 owner flow was reconciled to create/open DRAFT before opening the candidate drawer;
- the candidate-drawer workflow path filter now includes its XSTORE-017 dependency contract;
- repeated calendar-context failures were resolved by changing runtime strategy from frame-only restore to immediate restore plus animation-frame re-apply;
- no backend schema/RPC authority change and no production business data mutation were introduced.

Exact-head terminal GREEN evidence for `ed88004a0aa4bffc9deabed7ad6152a5de243415`:
- XSTORE-019C Candidate Drawer QA push run `37408701575` → **SUCCESS**;
- XSTORE-019C Candidate Drawer QA PR run `37408705641` → **SUCCESS**;
- People Shift Day-10 Tests push run `37408701377` → **SUCCESS**;
- People Shift Day-10 Tests PR run `37408705496` → **SUCCESS**;
- UI2 Cross Role Acceptance push run `37408701424` → **SUCCESS**;
- UI2 Cross Role Acceptance PR run `37408705492` → **SUCCESS**;
- XSTORE-019 Unified RC QA push run `37408701430` → **SUCCESS**;
- XSTORE-019 Unified RC QA PR run `37408705502` → **SUCCESS**;
- XSTORE-019A Calendar Workspace QA push run `37408701428` → **SUCCESS**;
- XSTORE-019A Calendar Workspace QA PR run `37408705485` → **SUCCESS**;
- XSTORE-019B Direct Calendar Editing QA push run `37408701387` → **SUCCESS**;
- XSTORE-019B Direct Calendar Editing QA PR run `37408705638` → **SUCCESS**;
- XSTORE-013 Coverage QA PR run `37408705494` → **SUCCESS**;
- XSTORE-014 Interval Auto Schedule QA PR run `37408705495` → **SUCCESS**;
- XSTORE-015 Manager Override QA push run `37408701371` → **SUCCESS**;
- XSTORE-015 Manager Override QA PR run `37408705505` → **SUCCESS**;
- XSTORE-016 Scheduling IA QA push run `37408701395` → **SUCCESS**;
- XSTORE-016 Scheduling IA QA PR run `37408705786` → **SUCCESS**;
- XSTORE-017 Inline Shortage QA push run `37408701444` → **SUCCESS**;
- XSTORE-017 Inline Shortage QA PR run `37408705482` → **SUCCESS**;
- XSTORE-018 Supplemental Pool QA push run `37408701344` → **SUCCESS**;
- XSTORE-018 Supplemental Pool QA PR run `37408705471` → **SUCCESS**;
- Owner Control Tower Tests PR run `37408705647` → **SUCCESS**;
- SOP Task Tests PR run `37408705477` → **SUCCESS**;
- Procurement QA Robot PR run `37408705490` → **SUCCESS**.

PR #392 remains open and must **not** be merged or released yet. XSTORE-019F plus explicit Owner approval remain the release gate.

The next authoritative executable task after XSTORE-019C was XSTORE-019D; XSTORE-019D is now accepted in §6.0.20. XSTORE-019C must not be re-executed unless a future regression explicitly reopens it.

## 6.0.20 XSTORE-019D Employee Availability calendar parity acceptance — 2026-10-06

XSTORE-019D is **DONE / EXACT-HEAD GREEN**.

Implementation branch / PR:
- PR #392: `xstore-019-unified-rc-v1`;
- exact accepted head: `0cd1594e7352e17c0fcd6fe14b46799d546fd90c`;
- production merge/release: **NOT PERFORMED**.

Accepted result:
- Employee Availability now uses one seven-day weekly calendar mental model for the target week;
- Employee can add Availability from a calendar slot, edit an existing interval through an explicit 44px `Sửa` control, move an interval, resize start/end, and delete directly from the calendar workflow;
- calendar writes remain time-only: Employee receives no Store Priority control and every save keeps `p_preferred_store_id = null`;
- `get_my_availability`, `save_my_availability`, and `delete_my_availability` remain the only Availability RPC boundary; no second writer or direct table mutation was introduced;
- edit/move/resize reuse the existing row id through `p_availability_id`; create continues to use `null`;
- Availability cards retain canonical time-band recognition but are visibly distinct from assigned shifts through dashed styling and the `CÓ THỂ LÀM` label;
- desktop supports direct drag/move/resize and mobile keeps the same calendar with internal horizontal scrolling plus the existing day/start/end editor fallback;
- mutation overlap remains fail-safe: add/edit/move/resize controls are disabled while a save transaction is pending;
- PR #392 remains open and unmerged.

Repair / strategy evidence:
- historical cache-lineage contracts were reconciled to the XSTORE-019D Employee asset version without weakening their authority assertions;
- direct-DML static checks were narrowed so `Array.from(...)` is not misclassified as Supabase `.from(...)`;
- a save/edit race was removed by resetting editor mode before the final refresh and by preventing card mutation while `savePending`;
- repeated card-edit ambiguity was resolved by adding an explicit `Sửa` action while retaining card-click as a secondary interaction;
- repeated Playwright `dragTo()` hit-test timeouts on overlapping grid layers were resolved by testing the actual HTML5 `DragEvent` + `DataTransfer` contract in Chromium; product drag/drop handlers and canonical persistence were not weakened;
- no database schema/RPC authority change and no production business data mutation were introduced.

Exact-head terminal GREEN evidence for `0cd1594e7352e17c0fcd6fe14b46799d546fd90c`:
- XSTORE-019D Employee Availability Calendar QA push run `37414775860` → **SUCCESS**;
- XSTORE-019D Employee Availability Calendar QA PR run `37414779245` → **SUCCESS**;
- People Shift Day-10 Tests push run `37414775791` → **SUCCESS**;
- People Shift Day-10 Tests PR run `37414779085` → **SUCCESS**;
- UI2 Cross Role Acceptance push run `37414775780` → **SUCCESS**;
- UI2 Cross Role Acceptance PR run `37414779163` → **SUCCESS**;
- XSTORE-019 Unified RC QA push run `37414775883` → **SUCCESS**;
- XSTORE-019 Unified RC QA PR run `37414779191` → **SUCCESS**;
- XSTORE-019A Calendar Workspace QA PR run `37414779126` → **SUCCESS**;
- XSTORE-019B Direct Calendar Editing QA PR run `37414779080` → **SUCCESS**;
- XSTORE-019C Candidate Drawer QA PR run `37414779134` → **SUCCESS**;
- XSTORE-013 Coverage QA PR run `37414779213` → **SUCCESS**;
- XSTORE-014 Interval Auto Schedule QA PR run `37414779229` → **SUCCESS**;
- XSTORE-015 Manager Override QA PR run `37414779166` → **SUCCESS**;
- XSTORE-016 Scheduling IA QA PR run `37414779152` → **SUCCESS**;
- XSTORE-017 Inline Shortage QA PR run `37414779098` → **SUCCESS**;
- XSTORE-018 Supplemental Pool QA PR run `37414779154` → **SUCCESS**;
- Owner Control Tower Tests PR run `37414779118` → **SUCCESS**;
- SOP Task Tests PR run `37414779087` → **SUCCESS**;
- Procurement QA Robot PR run `37414779190` → **SUCCESS**.

Observed non-XSTORE smoke:
- AUTH-PROD Regression Contract PR run `37414779148` failed in the credentialed production username resolver before any Employee Availability assertion; XSTORE-019D did not touch auth/RBAC/session/backend auth paths, so this run is not used as XSTORE-019D acceptance evidence and remains owned by the AUTH-PROD track.

PR #392 remains open and must **not** be merged or released yet. XSTORE-019F plus explicit Owner approval remain the release gate.

The next authoritative executable task is **XSTORE-019E**. XSTORE-019D must not be re-executed unless a future regression explicitly reopens it.

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
12. Manager scheduling UX is calendar-first: one selected store workspace, direct calendar shift editing, inline shortages and an on-demand employee drawer/picker; no stacked CN1–CN4 accordion editor and no long always-visible employee pool;
13. “Nguồn tham khảo” is removed from the canonical scheduling UX;
14. Manager/Owner can add, edit, move, resize and delete DRAFT shifts directly on the calendar, then Validate/Review/Publish through the canonical scheduling path;
15. full relevant regression/E2E/security/reload checks are green;
16. Employee weekly Availability uses the same calendar interaction model while remaining time-only and Store Priority remains management-owned;
17. XSTORE-020 real production acceptance is complete;
18. permanent canonical Workforce docs/state contain the proven final rules;
19. **this TEMP Source of Truth is deleted**.

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

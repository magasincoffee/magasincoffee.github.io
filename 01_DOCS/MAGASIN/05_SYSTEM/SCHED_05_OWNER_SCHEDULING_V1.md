# SCHED-05 — Owner Scheduling V1

**Baseline:** `3d7d819969f605df826b91e0e69df7bf62e2d3a0`  
**Gate:** `WORKFORCE_SCHEDULING_PRODUCTION_READINESS_V1`  
**Execution mode:** MANUAL_WORK  
**Scope:** Owner Scheduling only  
**Database migration:** NONE  
**Production fixture:** NONE  
**Implementation status:** DONE / POST-MERGE GREEN / PRODUCTION ASSETS DEPLOYED

## Objective

Owner Scheduling is an enterprise oversight/exception projection over the **same** scheduling engine used by Manager:

```text
Employee Availability
  → create_schedule_generation
  → replace_schedule_generation_assignments
  → validate_schedule_generation_v1
  → review_schedule_generation
  → publish_schedule_generation
  → work_schedules
```

`work_schedules` remains the single official/current assignment truth. Owner does not get a second scheduler, writer, table path, or bypass.

## Pre-change repository audit

The pre-SCHED-05 Owner runtime loaded three Owner-specific modules:

- `01-demand/engine-v1.js`
- `02-review/engine-v1.js`
- `03-publish/engine-v1.js`

The legacy publish engine implemented its own publish UI and still contained calls to `auto_generate_schedule_generation`, `review_schedule_generation`, and `publish_schedule_generation`. SCHED-02 had already revoked browser EXECUTE on `auto_generate_schedule_generation`, so this UI was server-dead but still represented an obsolete parallel client path.

The review and demand engines still contain historical calls to revoked mutation RPCs such as:

- `manager_update_employee_availability`
- `create_store_transfer_request`
- `review_store_transfer_request`
- `upsert_workforce_staffing_requirement`
- `delete_workforce_staffing_requirement`

SCHED-05 does not restore any of those authorities.

## Canonical implementation

The active Owner runtime now:

1. loads the existing Manager shell for shared layout only;
2. sets `__MAGASIN_SCHEDULING_ACTOR__='OWNER'`;
3. opens a single Owner Scheduling surface;
4. hides/removes active demand/review legacy tabs;
5. loads **exactly** `05_MANAGER/Workforce/draft-publish-v1.js`;
6. uses the same store/week selector and canonical RPC set as Manager;
7. keeps Owner copy explicit about enterprise oversight and selected-store intervention.

The shared writer remains one file. SCHED-05 adds only role-aware presentation and stronger store/week stale-state clearing; it does not fork write behavior.

## OLD / NEW inventory

| Asset | SCHED-05 classification | Result |
|---|---|---|
| `04_OWNER/Workforce/runtime/owner-workforce-runtime.html` | **REPLACE/WIRE** | one Owner Scheduling projection over shared writer |
| `04_OWNER/Workforce/03-publish/engine-v1.js` | **WRAP / DEPRECATE** | compatibility loader only; no mutation RPC implementation |
| `04_OWNER/Workforce/02-review/engine-v1.js` | **DEPRECATE ACTIVE UI** | historical file retained, not loaded by Owner runtime |
| `04_OWNER/Workforce/01-demand/engine-v1.js` | **DEPRECATE ACTIVE UI** | historical file retained, not loaded by Owner runtime |
| `05_MANAGER/Workforce/draft-publish-v1.js` | **REUSE / SHARED** | sole Owner/Manager browser scheduling writer |
| canonical scheduling RPC set | **REUSE** | same Owner/Manager state machine |
| `work_schedules` | **KEEP** | one official/current truth |

Historical files remain for lineage; they must not be reactivated as browser mutation paths.

## Shared UI behavior

The canonical writer now supports an Owner presentation context without changing authority:

- Owner heading: enterprise oversight + intervention;
- selected store and week remain explicit;
- Availability is clearly input, not official schedule;
- DRAFT / validation / review / publish stages are human-readable;
- published rows are rendered back from canonical `work_schedules` after publish/reload;
- technical generation IDs, raw SQL/RPC errors, and internal algorithm labels are not displayed;
- store/week switching clears Availability, DRAFT, official rows, and validation state before refetch to prevent stale cross-store mixing;
- controls retain bounded double-submit behavior;
- seven-day board scroll remains contained at 390px.

Manager default presentation remains unchanged in meaning and continues to use the same writer.

## Pre-change live production read-only reconciliation — 2026-09-24 ICT

No production mutation was performed.

- profiles: 7 total / 4 ACTIVE;
- ACTIVE OWNER: **1**;
- ACTIVE STORE_MANAGER: **0**;
- ACTIVE stores: **4**;
- Availability rows: **7**;
- generation rows: **4** = 3 DRAFT + 1 CANCELLED;
- generation assignments: **0**;
- official `work_schedules`: **0**;
- duplicate active generation store/week groups: **0**.

Authority surface:

- canonical create/replace/validate/review/publish EXECUTE for authenticated: **YES**;
- `auto_generate_schedule_generation` EXECUTE for authenticated: **NO**;
- authenticated direct `work_schedules` SELECT/INSERT/UPDATE: **NO / NO / NO**.

Latest scheduling migration remains:

`20260923163337_sched_02_three_role_scheduling_authority_lock_v1`

SCHED-05 requires no database migration.

## Executable acceptance

Dedicated Owner browser E2E proves:

- all four active stores are selectable;
- store A/B/C/D switching clears stale Availability/DRAFT/official projections;
- Owner uses the shared canonical writer;
- double-submit create is bounded;
- full DRAFT → Validate → Review → Publish works in fixture;
- official rows are reread from the canonical official reader path;
- publish retry is idempotent;
- reload is deterministic;
- a stale Employee at publish time is server-revalidated and publish returns to DRAFT without official rows;
- an out-of-enterprise store fails closed;
- no legacy Owner mutation RPC is called;
- no direct table access occurs;
- no UUID/raw backend/algorithm identifiers appear in normal UI;
- 390px viewport has no page horizontal overflow;
- browser diagnostics are clean.

The existing full Workforce suite remains responsible for Manager/Employee/Give/Swap/Attendance/security regressions.

## Scope guard

Not included:

- SCHED-06 full three-role synchronization;
- SCHED-07 global design-system polish;
- TASK-108;
- Workforce Robot enablement;
- PFC changes;
- fake production Manager/Employee/schedule rows.

## Final implementation lineage

- baseline main: `3d7d819969f605df826b91e0e69df7bf62e2d3a0`
- implementation PR: **#289**
- final PR head: `870fe55f1ad76f0c8a3f3ee0280d87b6882ac690`
- implementation merge: `47a8a0da64ac68e50839023e47b584f1b8b97e18`
- database migration: **NONE**

Final PR-head:
- People Shift `35937446131 / 107437565949` — **SUCCESS**
- deterministic regression: **322/322**
- `SCHED_05_OWNER_SCHEDULING_BROWSER=PASS`
- SCHED-01→04, Manager/Employee, Give/Swap/Attendance, TASK-095→107, Day-10 and Control Tower browser pack — **PASS**

Exact implementation-main:
- People Shift `35938947897 / 107442311642` — **SUCCESS**
- deterministic regression: **322/322** = 77 Workforce + 9 schedule-first + 162 People Shift + 74 Control Tower
- `SCHED_05_OWNER_SCHEDULING_BROWSER=PASS`
- `SCHED_04_MANAGER_SCHEDULING_BROWSER=PASS`
- `TASK_107_WORKFORCE_FAILURE_RECOVERY_SECURITY=PASS`
- `MANAGER_WORKFORCE_CANONICAL_BROWSER=PASS`
- `PEOPLE_SHIFT_DAY10_BROWSER_E2E=PASS`
- `CONTROL_TOWER_BROWSER_E2E=PASS`

Exact implementation-main Pages:
- source validation `35938948068 / 107442312757` — **SUCCESS**
- build `35938946623 / 107442310788` — **SUCCESS**
- deploy `35938946623 / 107442356690` — **SUCCESS**
- report `35938946623 / 107442356803` — **SUCCESS**

## Final production read-only reconciliation

No production mutation was used for closure.

Per-store production truth:
- CN1: 3 Availability rows, 4 generation rows, 0 generation assignments, 0 official schedules;
- CN2: 0 Availability rows, 0 generation rows, 0 generation assignments, 0 official schedules;
- CN3: 0 Availability rows, 0 generation rows, 0 generation assignments, 0 official schedules;
- CN4: 0 Availability rows, 0 generation rows, 0 generation assignments, 0 official schedules.

Global truth:
- profiles: 7 total / 4 ACTIVE;
- ACTIVE OWNER: **1**;
- ACTIVE STORE_MANAGER: **0**;
- ACTIVE stores: **4**;
- Availability rows: **7**;
- generations: **4** = 3 DRAFT + 1 CANCELLED;
- generation assignments: **0**;
- official `work_schedules`: **0**;
- duplicate active generation store/week groups: **0**;
- canonical create/replace/validate/review/publish RPCs: authenticated allowed;
- legacy `auto_generate_schedule_generation`: authenticated denied;
- direct authenticated `work_schedules` SELECT/INSERT/UPDATE: denied.

No fake Owner/Manager/Employee, generation assignment, official schedule or SCHED-05 database migration was created.

## Closure / handoff

`SCHED-05 = DONE`.

Canonical Owner Scheduling V1 now has:
- enterprise oversight + selected-store intervention;
- one shared Owner/Manager browser writer;
- the same canonical server state machine and one official `work_schedules` truth;
- all 4 active stores selectable;
- deterministic store/week switching with stale projections cleared before reload;
- DRAFT → Validate → Review → Publish full flow;
- post-publish official reread;
- idempotent publish retry;
- stale publish revalidation;
- out-of-enterprise fail-closed behavior;
- legacy Owner publish compatibility-only;
- no parallel Owner mutation path;
- no browser direct table DML;
- no raw UUID/SQL/backend error exposure;
- 390px no-horizontal-overflow acceptance.

Next:
- `SCHED-06 = READY / MANUAL_WORK`
- `SCHED-07 = BLOCKED`
- TASK-108 remains `PAUSED_BEHIND_SCHED_GATE`
- Workforce Robot remains **DISABLED**
- PFC remains unchanged at `TASK-068 → TASK-069`

SCHED-06 is not started by this closure.

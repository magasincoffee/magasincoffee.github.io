# SCHED-04 — Manager Scheduling V1

**Baseline:** `d4e23a7f27f4ff4e2f641c53c27717bcbf1b4403`  
**Gate:** WORKFORCE_SCHEDULING_PRODUCTION_READINESS_V1  
**Scope:** Manager Scheduling only  
**Database migration:** NONE  
**Production fixture:** NONE  
**Implementation status:** DONE / POST-MERGE GREEN / PRODUCTION ASSETS DEPLOYED

## Objective

Complete the Manager scheduling operating path without introducing a second scheduling truth:

```text
Employee Availability
  → create/resume canonical generation
  → edit DRAFT assignments
  → validate
  → REVIEWED
  → publish
  → work_schedules
  → Manager official reader / Employee canonical reader
```

`work_schedules` remains the single official/current assignment truth. Generation runs and assignments remain pre-publish working state only.

## Reuse-first audit

Canonical writer retained:

- `05_MANAGER/Workforce/draft-publish-v1.js`

Canonical server primitives retained:

- `get_manager_accessible_stores`
- `get_manager_weekly_availability`
- `list_schedule_generations`
- `create_schedule_generation`
- `get_schedule_generation_assignments`
- `replace_schedule_generation_assignments`
- `validate_schedule_generation_v1`
- `review_schedule_generation`
- `publish_schedule_generation`
- `get_manager_weekly_schedule`

No new scheduling writer, no browser table DML, no staffing-demand prerequisite and no Robot generation path were added.

## OLD / NEW inventory

| Surface | SCHED-04 classification |
|---|---|
| `draft-publish-v1.js` | REUSE + HARDEN — sole active Manager writer |
| `review-v1.js` | REUSE — Availability read-only input |
| `official-v1.js` | REUSE — canonical official schedule reader |
| `engine-v1.js` | REUSE + version current SCHED-04 assets |
| `/05_MANAGER/Workforce/` | WRAP canonical Manager runtime |
| `/05_MANAGER/Lich-lam/` | REDIRECT/WRAP canonical `#workforce` surface; no writer authority |
| staffing demand / auto-generation UI | DEPRECATED from active Manager scheduling path |
| legacy browser table mutation | DENIED / no authority |

## Manager UX/state hardening

SCHED-04 makes the operational stages explicit:

1. Availability
2. Bản nháp
3. Kiểm tra
4. Duyệt
5. Phát hành

Key behavior:

- clear store/week context;
- Availability is explicitly labeled as input, not official schedule;
- Manager may add/edit/remove assignments only while DRAFT;
- save uses canonical replacement RPC;
- validate/review/publish remain explicit separate actions;
- server is authoritative for all validation;
- active generation reload now resumes DRAFT, REVIEWED or PUBLISHED;
- after publish, Manager reloads official APPROVED rows through `get_manager_weekly_schedule`;
- repeat publish remains idempotent;
- technical generation IDs and raw RPC/SQL diagnostics are not shown to normal users;
- controls are guarded against duplicate submits;
- mobile/desktop layouts remain responsive;
- static demo scheduling truth was removed from the Manager shell so the canonical runtime is the only visible schedule source.

## Server invariants preserved

Existing canonical server gates continue to enforce at mutation/review/publish time:

- ACTIVE actor;
- exact authorized store scope;
- ACTIVE STAFF employee;
- generation week/store identity;
- Availability coverage;
- overlap prevention;
- official schedule overlap prevention;
- maximum two assignments per employee/day;
- active generation version conflict prevention;
- review and publish revalidation;
- published lineage and idempotent retry.

SCHED-04 does not weaken or duplicate these rules client-side.

## Live production read-only reconciliation — 2026-09-24 ICT

No production mutation was performed.

- profiles: 7 total / 4 ACTIVE;
- ACTIVE STORE_MANAGER: **0**;
- active stores: **4**;
- Availability rows: **7**;
- generation rows: **4** = 3 DRAFT + 1 CANCELLED + 0 REVIEWED + 0 PUBLISHED;
- generation assignment rows: **0**;
- official `work_schedules`: **0**;
- duplicate active generation store/week groups: **0**.

Authority surface:

- authenticated direct `work_schedules` SELECT/INSERT/UPDATE: denied;
- authenticated direct generation INSERT: denied;
- authenticated direct generation-assignment INSERT: denied;
- canonical create/replace/validate/review/publish RPC EXECUTE: authenticated=yes;
- the same canonical mutation RPCs: anon=no.

Latest production scheduling migration remains:

`20260923163337_sched_02_three_role_scheduling_authority_lock_v1`

Therefore SCHED-04 needs no production migration and must not create a fake Manager.

## Executable acceptance

Dedicated SCHED-04 regression covers:

- scoped store/week Availability input;
- bounded double-submit create;
- add/edit/save DRAFT;
- validate → review → publish full UI path;
- publish creates one official projection;
- reload after PUBLISHED reads official server truth;
- repeat publish creates no duplicate official rows;
- cross-store request tampering fails closed;
- normal UI contains no generation ID/raw backend code;
- 390px mobile page has no horizontal overflow;
- no browser direct table access;
- clean browser diagnostics.

The existing Manager/People Shift packs continue to cover stale publish revalidation, inactive/non-STAFF rejection, availability mismatch, overlap, max-two/day, malformed payload, version conflicts, Give/Swap and official schedule regressions.

## Scope guard

Not included:

- SCHED-05 Owner Scheduling UX;
- full SCHED-06 three-role synchronization;
- TASK-108;
- Workforce Robot enablement;
- PFC changes;
- fake production Manager or scheduling rows.


## Final implementation lineage

- baseline main: `d4e23a7f27f4ff4e2f641c53c27717bcbf1b4403`
- implementation PR: **#287**
- final PR head: `67374dd48597f7241559c11091c3496641f32f4f`
- implementation merge: `398f8164d676068a8bd7a8d14426e31ed948cba3`
- database migration: **NONE**

Final PR-head:
- People Shift `35897139899 / 107303772936` — **SUCCESS**
- SOP `35897139919` — **SUCCESS**
- dedicated SCHED-04 browser flow — **PASS**
- SCHED-01→03 browser regressions and full Workforce browser pack — **PASS**

Exact implementation-main:
- People Shift `35897358395 / 107304500565` — **SUCCESS**
- deterministic regression: **316/316** = 77 Workforce + 9 schedule-first + 156 People Shift + 74 Control Tower
- `SCHED_04_MANAGER_SCHEDULING_BROWSER=PASS`
- `TASK_107_WORKFORCE_FAILURE_RECOVERY_SECURITY=PASS`
- `MANAGER_WORKFORCE_CANONICAL_BROWSER=PASS`
- `PEOPLE_SHIFT_DAY10_BROWSER_E2E=PASS`
- `CONTROL_TOWER_BROWSER_E2E=PASS`
- SOP `35897358299 / 107304499985` — **SUCCESS**

Exact implementation-main Pages:
- source validation `35897358345 / 107304500738` — **SUCCESS**
- build `35897357114 / 107304501913` — **SUCCESS**
- deploy `35897357114 / 107304574534` — **SUCCESS**
- report `35897357114 / 107304574618` — **SUCCESS**

## Final production read-only reconciliation

No production mutation was used for closure.

- ACTIVE STORE_MANAGER: **0**
- ACTIVE stores: **4**
- Availability rows: **7**
- generation runs: **4** = 3 DRAFT + 1 CANCELLED
- generation assignments: **0**
- official `work_schedules`: **0**
- duplicate active generation store/week groups: **0**
- authenticated direct `work_schedules` SELECT/INSERT/UPDATE: **DENIED**
- authenticated direct generation INSERT: **DENIED**
- canonical create/replace/validate/review/publish RPCs: **authenticated allowed / anon denied**
- latest scheduling migration remains `20260923163337_sched_02_three_role_scheduling_authority_lock_v1`

No fake Manager, generation assignment, official schedule or SCHED-04 database migration was created.

## Closure / handoff

`SCHED-04 = DONE`.

Canonical Manager Scheduling V1 now has:
- one active Manager writer;
- exact-store scoped server authority;
- Availability as input only;
- generation state as pre-publish working state only;
- explicit DRAFT → Validate → Review → Publish stages;
- server-side revalidation at mutation/review/publish;
- idempotent publish;
- deterministic reload of DRAFT / REVIEWED / PUBLISHED;
- post-publish re-read of official `work_schedules`;
- friendly diagnostics without UUID/SQL/raw RPC leakage;
- bounded double-submit;
- mobile 390px and desktop coverage;
- no legacy parallel writer.

Next:
- `SCHED-05 = READY / MANUAL_WORK`
- `SCHED-06 = BLOCKED`
- TASK-108 remains `PAUSED_BEHIND_SCHED_GATE`
- Workforce Robot remains **DISABLED**
- PFC remains unchanged at `TASK-068 → TASK-069`

SCHED-05 is not started by this closure.

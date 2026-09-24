# SCHED-06 — Three-role Scheduling Synchronization V1

**Track:** WORKFORCE_SCHEDULING_PRODUCTION_READINESS_V1  
**Task:** SCHED-06  
**Status:** DONE / CANONICAL CLOSURE CANDIDATE  
**Execution mode:** OWNER_DIRECT_TO_WORK / MANUAL_WORK  
**Date:** 2026-09-24  
**Starting canonical main:** `1919cbab4e05cb5fc4af07b5df6b62a9f029c05c`  
**Implementation branch:** `sched-06/three-role-synchronization-v1`  
**Implementation PR:** #292  
**Final implementation PR head:** `b5e34647c3df689d19e0812a5a6a356561a56c0e`  
**Implementation merge SHA / exact implementation main:** `c1fde945dfc706d728718d1c6fa68a5752f38786`  
**DB migration:** NONE  
**Latest scheduling migration remains:** `20260923163337_sched_02_three_role_scheduling_authority_lock_v1`  
**PFC:** UNCHANGED  
**Workforce Robot:** DISABLED  
**Next task after canonical closure:** SCHED-07 READY / MANUAL_WORK — DO NOT AUTO-RUN

## 1. Five-Step

### QUESTION

SCHED-06 first reconciled the exact main drift between the SCHED-05 closure SHA
`14d39f537733ec759ad3e4a234b102b5912a2dd0` and the dispatch baseline
`1919cbab4e05cb5fc4af07b5df6b62a9f029c05c`.

The drift is merged PR #291 / MIG-007 final cleanup. It removes the legacy embedded Supervisor from the Business OS repository and updates Supervisor migration/project-state evidence. It does not modify:

- Workforce Scheduling Source of Truth;
- Employee Scheduling runtime;
- Manager Scheduling runtime;
- Owner Scheduling runtime;
- Give / Swap runtime;
- Attendance runtime;
- scheduling SQL migrations;
- canonical scheduling RPC semantics.

Therefore the SCHED-05 scheduling baseline remains semantically intact at the SCHED-06 starting SHA.

### DELETE

No new production writer, table, API, state machine or schedule identity was added.

SCHED-06 deletes the need for any proposed synchronization layer by proving that existing canonical primitives already converge:

```text
publish
→ one work_schedules identity
→ Employee / Manager / Owner readers
→ Give/Swap updates current owner on that same identity
→ Attendance revalidates current owner
```

### SIMPLIFY

SCHED-06 uses the existing canonical truth only:

- `work_schedules` = official/current assignment truth;
- Employee reader = `list_my_approved_schedules_v2`;
- Manager/Owner official reader = `get_manager_weekly_schedule`;
- Manager/Owner writer = shared `05_MANAGER/Workforce/draft-publish-v1.js`;
- Give = existing TASK-097 canonical lifecycle;
- Swap = existing TASK-096 canonical lifecycle;
- Attendance = existing TASK-098/099 current-owner authority.

### ACCELERATE

No DB migration was needed. SCHED-06 added only deterministic synchronization proof, browser E2E coverage, and CI wiring.

### AUTOMATE

No autonomous Workforce mutation authority was enabled.

Workforce Robot remains DISABLED. SCHED-07 remains manual Owner-authorized work.

## 2. Canonical flow proved

The active flow remains:

```text
Employee Availability
→ generation DRAFT
→ Validate
→ Review
→ Publish
→ work_schedules
→ Employee Schedule
→ Give / Swap
→ same work_schedules identity with current owner
→ Attendance
```

No second official/current schedule truth exists in SCHED-06.

## 3. OLD / NEW / KEEP / WRAP / DEPRECATE inventory

### KEEP — canonical active

- `public.work_schedules` — single official/current assignment truth.
- `05_MANAGER/Workforce/draft-publish-v1.js` — shared Manager/Owner writer UI.
- `05_MANAGER/Workforce/official-v1.js` — scoped official schedule projection.
- `06_EMPLOYEE/schedule/engine-v1.js` — Employee self-only official reader.
- `06_EMPLOYEE/swap/engine-v1.js` — Employee Give/Swap entry.
- `05_MANAGER/Workforce/swap-approval-v1.js` — Manager scoped Give/Swap approval.
- `06_EMPLOYEE/attendance/engine-v1.js` — Attendance client on server current-owner authority.
- TASK-094 publish primitives — create/replace/validate/review/publish.
- TASK-096 Swap primitives.
- TASK-097 Give primitives.
- TASK-098/099 Attendance primitives.

### WRAP / DEPRECATE — compatibility only

- `04_OWNER/Workforce/03-publish/engine-v1.js` remains a compatibility wrapper that loads the shared Manager writer. It contains no Owner-only scheduling mutation implementation.
- Owner legacy demand/review scheduling engines are not loaded by the active Owner Scheduling runtime.
- legacy Manager schedule compatibility routes remain wrappers only and are not parallel canonical writers.

### NEW — proof only

- `09_QA/people-shift/sched-06-three-role-synchronization.test.mjs`
- `09_QA/people-shift/sched-06-three-role-synchronization-browser.mjs`
- additive test-only Manager/Owner official projection support in `shift-give-lifecycle-fixture.html`
- one People Shift CI step for the SCHED-06 browser gate.

### DELETE

None in SCHED-06. No valid history was deleted.

## 4. Publish identity invariant

TASK-094 publish remains the only generation → official schedule materialization path.

The server publish primitive:

- revalidates REVIEWED generation state;
- writes official rows to `work_schedules`;
- records `source_generation_id` and `source_generation_assignment_id`;
- has a unique source-generation-assignment constraint;
- returns `already_published=true` for same-generation retry;
- contains one canonical `insert into public.work_schedules` path.

SCHED-06 deterministic proof confirms repeated publish does not create a second logical assignment identity.

## 5. Three-role official schedule synchronization

Dedicated browser E2E uses the existing Employee Give engine and Manager Give approval engine against one shared deterministic canonical server fixture.

Initial state:

```text
Employee A  → schedule_id=sch-give owner=u-a
Manager     → schedule_id=sch-give owner=u-a
Owner       → schedule_id=sch-give owner=u-a
```

After canonical Give A→B:

```text
Employee A  → no longer reads sch-give
Employee B  → schedule_id=sch-give owner=u-b
Manager     → schedule_id=sch-give owner=u-b
Owner       → schedule_id=sch-give owner=u-b
```

The schedule identity never changes and no competing schedule row is created.

## 6. Give exact-once ownership transfer

Existing TASK-097 semantics are reused.

Browser evidence:

- A submits Give;
- B accepts;
- Manager approves;
- `sch-give` changes owner A→B exactly once;
- `transferCount=1`;
- two repeated Manager approval retries return the stable already-applied path;
- ownership does not reverse;
- no duplicate schedule identity appears.

Server contract evidence retains:

- shared schedule lock namespace;
- row locking;
- current giver ownership check;
- recipient consent gate;
- final revalidation;
- one `update public.work_schedules set user_id=recipient`;
- terminal APPROVED idempotency.

TASK-096 Swap regression also remains PASS in the same full Workforce gate.

## 7. Attendance follows current owner

Existing TASK-098/099 authority is reused.

After Give A→B:

- A submission → `ATTENDANCE_NOT_CURRENT_OWNER`;
- B submission → ALLOW / `NEEDS_REVIEW`;
- exact B retry → same attendance identity / `already_submitted=true`;
- reload does not restore A's authority.

Attendance continues to lock/re-read canonical `work_schedules` current ownership server-side before persistence.

## 8. Stale / reload / retry / concurrency evidence

Dedicated SCHED-06 browser assertions PASS:

- stale A snapshot does not authorize Attendance after transfer;
- reload preserves B as current owner;
- repeated Manager Give approval cannot reverse transfer;
- concurrent/repeated terminal approval converges to one transfer;
- B Attendance retry converges to one attendance identity;
- Manager and Owner reread the same current owner after transfer;
- cross-store Manager and Owner read attempts fail with `STORE_NOT_ALLOWED`;
- browser path uses RPC projections/mutations and does not directly mutate protected tables.

Existing regressions also remain PASS for:
- Swap stale ownership and duplicate active request handling;
- Give recipient consent, retry and exact-once transfer;
- Employee stale schedule refresh;
- Attendance stale ownership reconciliation;
- Workforce failure recovery/security.

## 9. Production read-only reconciliation

Live project: MAGASIN-NOIBO / Supabase ref `menvbzlsncmpuvnaifxa`.

Read-only aggregate snapshot before SCHED-06 production mutation proof:

```text
profiles_total          = 7
profiles_active         = 4
owners_active           = 1
store_managers_active   = 0
stores_active           = 4
availability_rows       = 7
generation_rows         = 4
generation_assignments  = 0
official_schedules      = 0
shift_gives_total       = 0
shift_swaps_total       = 0
attendance_total        = 0
```

Because production currently has:
- no ACTIVE STORE_MANAGER;
- no official schedules;
- no Give/Swap rows;
- no Attendance rows;

SCHED-06 correctly uses executable deterministic fixtures for destructive lifecycle proof and live production read-only checks instead of creating fake production identities or schedule rows.

Persistent fake production residue introduced by SCHED-06: **ZERO**.

## 10. Implementation PR and CI

Implementation PR: **#292**  
Branch: `sched-06/three-role-synchronization-v1`  
Final PR head: `b5e34647c3df689d19e0812a5a6a356561a56c0e`  
Merge SHA: `c1fde945dfc706d728718d1c6fa68a5752f38786`

PR-head People Shift:
- run **35948344813**
- job **107471249024**
- conclusion **SUCCESS**

PR-head deterministic:
- Workforce canonical: **77/77 PASS**
- Schedule-first: **9/9 PASS**
- People Shift: **165/165 PASS**
- Control Tower: **74/74 PASS**
- total deterministic: **325/325 PASS**

Dedicated browser:
- `SCHED_06_THREE_ROLE_SYNCHRONIZATION_BROWSER=PASS`
- all checks PASS;
- page/console/request/5xx diagnostics = 0.

## 11. Exact implementation-main verification

Exact implementation main:
`c1fde945dfc706d728718d1c6fa68a5752f38786`

People Shift:
- run **35948615268**
- job **107472066171**
- conclusion **SUCCESS**

Exact-main deterministic:
- Workforce canonical: **77/77 PASS**
- Schedule-first: **9/9 PASS**
- People Shift: **165/165 PASS**
- Control Tower: **74/74 PASS**
- total deterministic: **325/325 PASS**

Exact-main browser markers include:

```text
SCHED_01_THREE_ROLE_BROWSER_SMOKE=PASS
SCHED_02_THREE_ROLE_AUTHORITY_BROWSER=PASS
SCHED_03_EMPLOYEE_SCHEDULE_UI=PASS
SCHED_04_MANAGER_SCHEDULING_BROWSER=PASS
SCHED_05_OWNER_SCHEDULING_BROWSER=PASS
SCHED_06_THREE_ROLE_SYNCHRONIZATION_BROWSER=PASS
SHIFT_SWAP_LIFECYCLE_BROWSER=PASS
SHIFT_GIVE_LIFECYCLE_BROWSER=PASS
TASK_099_EMPLOYEE_ATTENDANCE_UI=PASS
TASK_100_MANAGER_ATTENDANCE_REVIEW=PASS
TASK_107_WORKFORCE_FAILURE_RECOVERY_SECURITY=PASS
MANAGER_WORKFORCE_CANONICAL_BROWSER=PASS
PEOPLE_SHIFT_DAY10_BROWSER_E2E=PASS
CONTROL_TOWER_BROWSER_E2E=PASS
```

Exact-main Pages source validation:
- run **35948615433**
- job **107472067094**
- conclusion **SUCCESS**

Exact-main Pages build/deployment:
- run **35948614728**
- build job **107472067415** — SUCCESS
- report-build-status job **107472094401** — SUCCESS
- deploy job **107472094550** — SUCCESS

SCHED-06 changed QA/workflow assets only; no production browser runtime file or DB migration changed.

## 12. Security / authority conclusion

PASS:

- one official/current schedule truth = `work_schedules`;
- one shared Manager/Owner scheduling writer;
- Employee self-only official read;
- Manager store scope;
- Owner enterprise/selected-store scope;
- Give/Swap server-authorized current-owner mutation;
- Attendance current-owner authority;
- cross-store denial;
- retry/idempotency;
- stale ownership fail closed;
- no direct protected-table browser mutation introduced;
- no dual-write;
- no DB migration;
- no fake production residue.

## 13. SCHED-06 closure verdict

SCHED-06 Definition of Done:

- A) Availability → DRAFT → Validate → Review → Publish: PASS through existing canonical SCHED-04/05 path and exact-main regression.
- B) Employee sees exact published assignment: PASS.
- C) Manager and Owner resolve the same exact official assignment/current owner: PASS.
- D) Give A→B updates ownership exactly once without competing schedule truth: PASS.
- E) reload converges A absent / B current owner across all three roles: PASS.
- F) Attendance A=DENY / B=ALLOW: PASS.
- G) retry/reload/stale/concurrency creates no duplicate/stale resurrection/split-brain: PASS.
- H) cross-store isolation: PASS.
- I) no active parallel mutation path remains: PASS.
- J) production data reconciliation clean: PASS.

Canonical result:

```text
SCHED-06 = DONE
SCHED-07 = READY / MANUAL_WORK
SCHED-08 = BLOCKED
TASK-108 = PAUSED_BEHIND_SCHED_GATE
Workforce Robot = DISABLED
PFC = UNCHANGED
```

Do not auto-start SCHED-07.

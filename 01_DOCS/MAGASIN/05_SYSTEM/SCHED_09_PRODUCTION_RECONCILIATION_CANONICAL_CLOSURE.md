# SCHED-09 — Production Reconciliation + Canonical Closure Candidate

**Track:** WORKFORCE_SCHEDULING_PRODUCTION_READINESS_V1  
**Task:** SCHED-09  
**Candidate status:** IN_PROGRESS / CLOSURE_CANDIDATE / PENDING_EXACT_MAIN  
**Execution mode:** MANUAL_WORK  
**Repository baseline:** `5d73dee7fa41e4aa67ec12161350e0e7b0e69475`  
**Production project:** MAGASIN-NOIBO / `menvbzlsncmpuvnaifxa`  
**Fresh read-only production audit:** `2026-09-25T07:54:23.968Z` UTC  
**Fresh advisor observation:** `2026-09-25T07:54:50Z` UTC  
**Production reconciliation:** **CLEAN**  
**Final gate status:** **NOT CLOSED — merge + exact-main post-merge gates + canonical closure SHA still required**

## 1. Scope and candidate boundary

This file records the SCHED-09 closure **candidate** only. It consolidates the accepted read-only audit/reconciliation evidence and reconciles canonical state surfaces before final exact-main closure.

This candidate does **not**:
- merge itself;
- mark `WORKFORCE_SCHEDULING_PRODUCTION_READINESS_V1` CLOSED;
- release or start TASK-108;
- enable Workforce Robot;
- modify runtime, SQL, migration, RPC, RLS, grants, or production data.

TASK-108 remains `PAUSED_BEHIND_SCHED_GATE` until the candidate is merged, relevant exact-main post-merge gates pass, Brain accepts the evidence, and the canonical closure SHA is recorded.

## 2. Fresh read-only production reconciliation

Fresh production snapshot:

| Dimension | Result |
|---|---:|
| stores total / ACTIVE | 4 / **4** |
| profiles total / ACTIVE / PENDING | 7 / **4** / **3** |
| ACTIVE OWNER | **1** |
| ACTIVE STORE_MANAGER | **0** |
| all STORE_MANAGER profiles | **0** |
| ACTIVE STAFF | **1** |
| PENDING STAFF | **3** |
| Availability | **7** |
| schedule generations | **4** |
| generation status DRAFT / CANCELLED / REVIEWED / PUBLISHED | **3 / 1 / 0 / 0** |
| generation assignments | **0** |
| official `work_schedules` | **0** |
| Give | **0** |
| Swap | **0** |
| Attendance | **0** |

Comparison with the SCHED-08 final zero-residue baseline: **no unexplained drift**.

## 3. Duplicate / orphan / invalid-reference checks

Fresh read-only SQL returned zero for every required integrity check:

- duplicate active generation `(store_id, week_start)` groups = **0**;
- duplicate generation-assignment logical identity groups = **0**;
- duplicate APPROVED official schedule logical groups = **0**;
- duplicate official `source_generation_assignment_id` groups = **0**;
- Availability missing Employee/profile = **0**;
- Availability missing preferred store = **0**;
- assignment missing generation/user/store = **0**;
- assignment invalid Employee = **0**;
- assignment/generation store mismatch = **0**;
- schedule missing user/store/source generation/source assignment = **0**;
- schedule invalid Employee = **0**;
- schedule/source-generation store mismatch = **0**;
- Give missing schedule/giver/recipient/store = **0**;
- Swap missing requester schedule/target schedule/requester/target user/store = **0**;
- Attendance missing schedule/user/store = **0**;
- Attendance stale-owner mismatch = **0**.

## 4. SCHED-08 temporary residue

Fresh production state remains consistent with the SCHED-08 rollback audit:

- temporary official schedule residue = **0**;
- temporary generation-assignment residue = **0**;
- temporary Give residue = **0**;
- temporary Swap residue = **0**;
- temporary Attendance residue = **0**;
- ACTIVE STORE_MANAGER residue = **0**;
- STAFF population restored to 1 ACTIVE + 3 PENDING;
- Owner population remains 1 ACTIVE.

Persistent SCHED-08 QA/business-data residue: **ZERO**.

## 5. Required production migrations

All required scheduling migrations are present in production migration history:

- `20260923160755_sched_01_production_blocker_repair_v1`;
- `20260923163337_sched_02_three_role_scheduling_authority_lock_v1`;
- `20260925033927_sched_08_live_validator_alias_fix_v1`.

## 6. Authority and grant reconciliation

Fresh PostgreSQL catalog/privilege inspection confirms deprecated paths remain non-authoritative.

For both `anon` and `authenticated`, EXECUTE remains denied on the inspected deprecated paths:

- `auto_generate_schedule_generation`;
- `cancel_schedule_generation`;
- `manager_update_employee_availability`;
- `create_store_transfer_request`;
- `review_store_transfer_request`;
- `upsert_workforce_staffing_requirement`;
- `delete_workforce_staffing_requirement`;
- legacy `get_my_schedule`;
- legacy `list_my_approved_schedules_v1`.

Canonical scheduling RPC observations remain:
- `anon EXECUTE = false`;
- `authenticated EXECUTE = true`;

for:
- `create_schedule_generation`;
- `replace_schedule_generation_assignments`;
- `validate_schedule_generation_v1`;
- `review_schedule_generation`;
- `publish_schedule_generation`;
- `list_my_approved_schedules_v2`;
- `get_manager_weekly_schedule`;
- `get_manager_weekly_availability`.

Direct browser table privileges remain denied for both `anon` and `authenticated` across SELECT/INSERT/UPDATE/DELETE on:
- `employee_availability`;
- `schedule_generation_runs`;
- `schedule_generation_assignments`;
- `work_schedules`.

No active deprecated mutation path or protected-table browser DML regression was observed.

## 7. Advisor continuity

Fresh security advisor counts:
- RLS enabled/no policy = **11**;
- mutable function search path = **1**;
- anon-executable SECURITY DEFINER = **13**;
- authenticated-executable SECURITY DEFINER = **66**;
- leaked-password protection = **1**.

Fresh performance advisor counts:
- unindexed foreign keys = **35**;
- auth/RLS init-plan = **16**;
- unused indexes = **13**;
- multiple permissive policies = **12**.

These counts match the SCHED-08 recorded baseline. No SCHED-09 security/performance advisor drift was observed.

## 8. Prior CI / browser / security evidence carried into the candidate

The last executable scheduling implementation main before this docs/state-only candidate is SCHED-08 merge `2e03cb2226813073f1e1449e03347a9210922534`.

Exact-main evidence:
- People Shift `36091508147 / 107934735123` — SUCCESS;
- Pages validation `36091508122 / 107934735211` — SUCCESS;
- Pages build/deploy/report `36091507559 / 107934736273 / 107934768302 / 107934768275` — SUCCESS;
- deterministic regression = **331/331 / 0 fail**;
- SCHED-01→SCHED-07 browser gates = PASS;
- Give/Swap/Attendance/Profile/Payroll/Failure-Recovery/Manager/Day-10/Control-Tower regressions = PASS;
- `TASK_107_WORKFORCE_FAILURE_RECOVERY_SECURITY=PASS`;
- `MANAGER_WORKFORCE_CANONICAL_BROWSER=PASS`;
- `PEOPLE_SHIFT_DAY10_BROWSER_E2E=PASS`;
- browser diagnostics contain no unexplained production error.

SCHED-08 live production marker `SCHED08_FINAL_ROLLBACK_PASS` proved scoped Manager publish, same schedule identity across Employee/Owner/Give transfer, current-owner Attendance authority, retry idempotency, and cross-store/cross-user fail-closed behavior.

## 9. Version / deprecation mapping

Canonical active scheduling truth and paths remain:

- official/current assignment truth = `public.work_schedules`;
- draft working state = `schedule_generation_runs` + `schedule_generation_assignments`;
- Employee official reader = `list_my_approved_schedules_v2`;
- Manager/Owner official reader = `get_manager_weekly_schedule`;
- shared Manager/Owner writer = `05_MANAGER/Workforce/draft-publish-v1.js`;
- canonical mutation lifecycle = create → replace → validate → review → publish;
- Give/Swap retain ownership on existing canonical schedule identities;
- Attendance authority follows current `work_schedules.user_id`.

Deprecated/compatibility-only paths remain documented and non-authoritative:
- legacy Employee V1 readers = DEPRECATE / DELETE-LATER;
- legacy Owner publish asset = compatibility WRAP only;
- Owner legacy demand/review engines = not loaded by active Owner Scheduling runtime;
- auto-generation/staffing-demand mutation path = deprecated as active scheduling authority;
- browser direct protected-table DML = FORBIDDEN.

Historical assets may remain for lineage, but current grants and active runtime loading do not provide parallel mutation authority.

## 10. Candidate state and finalization requirement

Candidate state:

```text
WORKFORCE_SCHEDULING_PRODUCTION_READINESS_V1 = HARD_GATE_ACTIVE
SCHED-09 = IN_PROGRESS / CLOSURE_CANDIDATE / PENDING_EXACT_MAIN
PRODUCTION_RECONCILIATION = CLEAN
TASK-108 = PAUSED_BEHIND_SCHED_GATE
Workforce Robot = DISABLED
PFC = UNCHANGED
```

This candidate may proceed to final closure only after all of the following are independently evidenced:

1. this candidate PR is reviewed and merged;
2. the resulting exact `main` SHA is recorded;
3. relevant exact-main post-merge deterministic/browser/security/pages gates are green;
4. no contradictory canonical state is introduced by merge;
5. Brain accepts the final evidence;
6. only then may the canonical gate be changed from HARD_GATE_ACTIVE to CLOSED and TASK-108 be reconsidered.

Until those conditions are met:

**SCHED_GATE_FINAL_CLOSED=NO**  
**TASK_108_STARTED=NO**  
**PRODUCTION_MUTATION=NONE**  
**RUNTIME_CHANGE=NONE**

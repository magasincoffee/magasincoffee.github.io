# SCHED-09 — Production Reconciliation + Canonical Closure

**Track:** WORKFORCE_SCHEDULING_PRODUCTION_READINESS_V1  
**Task:** SCHED-09  
**Target status:** DONE / CANONICAL_CLOSED  
**Execution mode:** MANUAL_WORK  
**Fresh production read-only audit:** `2026-09-25T07:54:23.968Z` UTC  
**Production reconciliation:** **CLEAN**  
**Qualified canonical closure basis SHA:** `3d736b47bbeec669e628eb3c6a832077931737a3`  
**Exact-main qualification SHA:** `3d736b47bbeec669e628eb3c6a832077931737a3`  
**Exact-main qualification:** **PASS**  
**Last fully-green executable scheduling main:** `2e03cb2226813073f1e1449e03347a9210922534`  
**Future final-close PR merge SHA:** intentionally not claimed before merge

## 1. Closure meaning and boundary

SCHED-09 closes the Scheduling Production Readiness V1 gate on the exact qualified basis SHA `3d736b47bbeec669e628eb3c6a832077931737a3`.

That SHA is the **qualified canonical closure basis / exact-main qualification SHA**. It is not a prediction of the future docs-only final-close PR merge SHA.

This closure records that all SCHED-01→SCHED-09 acceptance criteria are satisfied. It does **not**:
- start or dispatch TASK-108;
- enable Workforce Robot;
- change PFC;
- mutate production;
- change runtime, workflow, tests, SQL, migration, RPC, RLS, or grants.

TASK-108 remains **NOT_STARTED** and **PAUSED_PENDING_BRAIN_ACCEPTANCE_OF_MERGED_SCHED_09_CLOSURE**. Workforce Robot remains **DISABLED**. No downstream task may start from this PR result alone.

## 2. Fresh production reconciliation — CLEAN

Fresh production snapshot:

| Dimension | Result |
|---|---:|
| stores total / ACTIVE | 4 / **4** |
| profiles total / ACTIVE / PENDING | 7 / **4** / **3** |
| ACTIVE OWNER | **1** |
| all / ACTIVE STORE_MANAGER | **0 / 0** |
| ACTIVE STAFF | **1** |
| PENDING STAFF | **3** |
| Availability | **7** |
| schedule generations | **4** |
| DRAFT / CANCELLED / REVIEWED / PUBLISHED | **3 / 1 / 0 / 0** |
| generation assignments | **0** |
| official `work_schedules` | **0** |
| Give | **0** |
| Swap | **0** |
| Attendance | **0** |

No unexplained drift exists versus the SCHED-08 rollback baseline.

Integrity reconciliation:
- duplicate active generation store/week groups = **0**;
- duplicate generation-assignment logical identity groups = **0**;
- duplicate approved official schedule logical groups = **0**;
- duplicate schedule source-assignment groups = **0**;
- orphan/invalid Availability, assignment, schedule, Give, Swap, Attendance references = **0**;
- stale-owner Attendance mismatch = **0**;
- SCHED-08 persistent QA/business-data residue = **0**;
- ACTIVE STORE_MANAGER residue = **0**.

## 3. Required production migrations

Present in production migration history:
- `20260923160755_sched_01_production_blocker_repair_v1`;
- `20260923163337_sched_02_three_role_scheduling_authority_lock_v1`;
- `20260925033927_sched_08_live_validator_alias_fix_v1`.

## 4. Authority / grants / security continuity

Fresh catalog/privilege inspection proved:
- inspected deprecated scheduling mutation RPCs remain EXECUTE-denied to `anon` and `authenticated`;
- canonical scheduling RPCs remain anon-denied/authenticated-enabled;
- direct SELECT/INSERT/UPDATE/DELETE on protected scheduling tables remains denied to both browser roles;
- no active deprecated mutation authority or protected-table browser DML regression was observed.

Security advisor continuity:
- RLS enabled/no policy = **11**;
- mutable search path = **1**;
- anon-executable SECURITY DEFINER = **13**;
- authenticated-executable SECURITY DEFINER = **66**;
- leaked-password protection finding = **1**.

Performance advisor continuity:
- unindexed foreign keys = **35**;
- auth/RLS init-plan = **16**;
- unused indexes = **13**;
- multiple permissive policies = **12**.

No SCHED-09 security-authority regression was observed.

## 5. Prior full executable qualification

The last fully-qualified executable scheduling main is:

`2e03cb2226813073f1e1449e03347a9210922534`

People Shift:
- run `36091508147`;
- job `107934735123`;
- head SHA = `2e03cb2226813073f1e1449e03347a9210922534`;
- status = COMPLETED;
- conclusion = **SUCCESS**;
- deterministic regression = **331/331**.

Relevant browser/security steps were all SUCCESS, including:
- SCHED-01 authority/browser smoke;
- SCHED-02 authority smoke;
- SCHED-03 Employee Scheduling;
- SCHED-04 Manager Scheduling;
- SCHED-05 Owner Scheduling;
- SCHED-06 synchronization;
- SCHED-07 responsive/UI;
- Give / Swap / Attendance lifecycle regressions;
- TASK-107 failure/recovery/security;
- Manager Workforce canonical browser;
- People Shift Day-10 browser;
- Control Tower browser.

Observed PASS markers include:
- `SCHED_04_MANAGER_SCHEDULING_BROWSER=PASS`;
- `SCHED_05_OWNER_SCHEDULING_BROWSER=PASS`;
- `SCHED_06_THREE_ROLE_SYNCHRONIZATION_BROWSER=PASS`;
- `SCHED_07_UI_RESPONSIVE=PASS`;
- `TASK_107_WORKFORCE_FAILURE_RECOVERY_SECURITY=PASS`;
- `MANAGER_WORKFORCE_CANONICAL_BROWSER=PASS`;
- `PEOPLE_SHIFT_DAY10_BROWSER_E2E=PASS`;
- `CONTROL_TOWER_BROWSER_E2E=PASS`.

## 6. Exact-main executable-equivalence qualification

Read-only qualification compared `2e03cb2226813073f1e1449e03347a9210922534` → `3d736b47bbeec669e628eb3c6a832077931737a3`.

Exact Git diff between those SHAs contains only six documentation/canonical-state files:
- `01_DOCS/MAGASIN/00_CURRENT_STATE.md`;
- `01_DOCS/MAGASIN/00_PROJECT_STATE.json`;
- `01_DOCS/MAGASIN/00_TASK_QUEUE.md`;
- `01_DOCS/MAGASIN/05_SYSTEM/SCHED_08_LIVE_THREE_ROLE_E2E_ACCEPTANCE.md`;
- `01_DOCS/MAGASIN/05_SYSTEM/SCHED_09_PRODUCTION_RECONCILIATION_CANONICAL_CLOSURE.md`;
- `01_DOCS/MAGASIN/05_SYSTEM/WORKFORCE_SCHEDULING_PRODUCTION_READINESS_V1_SOURCE_OF_TRUTH.md`.

There are **zero runtime/workflow/test/database executable changes**.

Recursive tree/blob qualification covered **207 relevant blobs** with **0 mismatches**, including:
- `.github/workflows/people-shift-tests.yml`;
- `04_OWNER/Workforce/**`;
- `05_MANAGER/Workforce/**`;
- `05_MANAGER/runtime/**`;
- `05_MANAGER/Lich-lam/**`;
- `06_EMPLOYEE/**`;
- required `02_CORE/shared/**` and Workforce contracts;
- required Business OS scheduling tests;
- `09_QA/people-shift/**`;
- `04_OWNER/ControlTower/**`;
- `09_QA/owner-control-tower/**`;
- `07_DATABASE/migrations/**`.

People Shift workflow exact blob identity:

```text
base blob = b24b24923857f0fb3fcc9aa8dae20be67e92da07
head blob = b24b24923857f0fb3fcc9aa8dae20be67e92da07
BYTE/BLOB IDENTICAL = YES
```

Therefore prior People Shift executable/browser/security evidence carries forward to `3d736b47bbeec669e628eb3c6a832077931737a3` without crossing an executable/test/workflow/database change.

**EXACT_MAIN_QUALIFICATION=PASS**

## 7. Exact-main Pages gates

On exact qualification SHA `3d736b47bbeec669e628eb3c6a832077931737a3`:

Pages source validation:
- run `36118165507`;
- job `108017056130`;
- head SHA = `3d736b47bbeec669e628eb3c6a832077931737a3`;
- status = COMPLETED;
- conclusion = **SUCCESS**.

Pages build/deployment:
- run `36118164405`;
- head SHA = `3d736b47bbeec669e628eb3c6a832077931737a3`;
- status = COMPLETED;
- conclusion = **SUCCESS**;
- build job `108017057281` = SUCCESS;
- deploy job `108017103429` = SUCCESS;
- report-build-status job `108017103572` = SUCCESS.

## 8. Final old/new/deprecation conclusion

Canonical production scheduling remains:
- official/current assignment truth = `public.work_schedules`;
- draft working state = `schedule_generation_runs` + `schedule_generation_assignments`;
- Employee official reader = `list_my_approved_schedules_v2`;
- Manager/Owner official reader = `get_manager_weekly_schedule`;
- shared Manager/Owner browser writer = `05_MANAGER/Workforce/draft-publish-v1.js`;
- server lifecycle = create → replace → validate → review → publish;
- Give/Swap retain canonical schedule identities;
- Attendance authority follows current `work_schedules.user_id`.

Legacy/deprecated paths remain compatibility/history only and non-authoritative:
- legacy Employee schedule readers = deprecated;
- legacy Owner publish asset = compatibility wrapper only;
- inactive Owner demand/review engines = not active scheduling writers;
- deprecated auto-generation/staffing mutation paths = no active scheduling authority;
- browser direct protected-table DML = forbidden.

**Final version/deprecation conclusion:** one canonical scheduling truth, one active writer path, no duplicate active mutation authority, and historical assets retained only where required for compatibility/lineage.

## 9. Canonical closure state

Target canonical state of this final-close PR:

```text
WORKFORCE_SCHEDULING_PRODUCTION_READINESS_V1 = CLOSED
SCHED-01 = DONE
SCHED-02 = DONE
SCHED-03 = DONE
SCHED-04 = DONE
SCHED-05 = DONE
SCHED-06 = DONE
SCHED-07 = DONE
SCHED-08 = DONE
SCHED-09 = DONE / CANONICAL_CLOSED

qualified_canonical_closure_basis_sha = 3d736b47bbeec669e628eb3c6a832077931737a3
exact_main_qualification_sha = 3d736b47bbeec669e628eb3c6a832077931737a3
EXACT_MAIN_QUALIFICATION = PASS
PRODUCTION_RECONCILIATION = CLEAN

TASK-108 = PAUSED_PENDING_BRAIN_ACCEPTANCE_OF_MERGED_SCHED_09_CLOSURE
TASK_108_STARTED = NO
Workforce Robot = DISABLED
PFC = UNCHANGED
```

The gate closure does not itself dispatch the next task. TASK-108 may only be reconsidered after Brain verifies and ACCEPTS the merged final closure. The future final-close PR merge SHA is intentionally not predeclared here.

**PRODUCTION_MUTATION=NONE**  
**RUNTIME_CHANGE=NONE**  
**WORKFLOW_DISPATCH=NONE**  
**TASK_108_STARTED=NO**  
**WORKFORCE_ROBOT_ENABLED=NO**

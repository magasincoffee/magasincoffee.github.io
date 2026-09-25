# SCHED-08 — Live Three-Role E2E Acceptance

**Track:** WORKFORCE_SCHEDULING_PRODUCTION_READINESS_V1  
**Task:** SCHED-08  
**Status:** DONE / CANONICAL CLOSED  
**Execution mode:** OWNER_DIRECT_TO_WORK / MANUAL_WORK  
**Date:** 2026-09-25  
**Starting canonical main:** `fca86c8e0630e08a834c147a9279802beef6b743`  
**Implementation branch:** `sched-08/live-three-role-e2e`  
**Implementation PR:** #299  
**Final implementation PR head:** `287a5214c28f233e20f823f0b9fffc94247f4455`  
**Implementation merge SHA / exact implementation main:** `2e03cb2226813073f1e1449e03347a9210922534`  
**Production migration:** `20260925033927_sched_08_live_validator_alias_fix_v1`  
**PFC:** UNCHANGED  
**Workforce Robot:** DISABLED  
**Next task after canonical closure:** SCHED-09 READY / MANUAL_WORK — DO NOT AUTO-RUN

## 1. Acceptance requirement

SCHED-08 had to prove the mandatory live-safe three-role sequence against the real production database/server authority, not only deterministic fixture HTML:

1. Employee A registers Availability.
2. Manager Store X sees canonical Availability.
3. Manager assigns and publishes through the canonical generation flow.
4. Employee A reloads and sees exactly the published shift.
5. Owner sees the same schedule identity/current owner/status.
6. Employee A initiates Give to Employee B.
7. B accepts and Manager approves.
8. The same schedule identity moves to B.
9. A loses Attendance authority.
10. B sees the shift and gains canonical Attendance authority.
11. Manager and Owner both converge on B as current owner.
12. Retry/reload remains idempotent with no duplicate schedule.
13. Cross-store/cross-user unauthorized actions fail closed.
14. No unexplained production path error is accepted.

## 2. Live production precondition reconciliation

Production project: MAGASIN-NOIBO.

Before SCHED-08 acceptance:

- 4 ACTIVE stores;
- 1 ACTIVE OWNER;
- 0 ACTIVE STORE_MANAGER;
- 1 ACTIVE STAFF;
- 3 PENDING STAFF;
- 7 existing historical Availability rows;
- 4 schedule generations: 3 DRAFT + 1 CANCELLED;
- 0 schedule generation assignments;
- 0 official `work_schedules`;
- 0 Give;
- 0 Swap;
- 0 Attendance.

The required live A/B/Manager combination therefore did not exist as an operational production state.

SCHED-08 did **not** create new auth users or persistent fake scheduling data.

Instead, live acceptance used existing Supabase Auth identities with historical sign-in evidence and a rollback-isolated production transaction:

- one existing signed-in QA account was temporarily projected as scoped STORE_MANAGER for CN1;
- one existing signed-in PENDING STAFF identity was temporarily activated as Employee B;
- existing ACTIVE STAFF was Employee A;
- existing ACTIVE OWNER was Owner;
- every temporary profile/data mutation remained inside the acceptance transaction;
- the transaction ended with an intentional terminal PASS exception, forcing PostgreSQL rollback;
- a separate post-transaction audit proved all temporary state was restored.

This allowed real production RPC/RLS/authority code to execute without persistent fixture residue.

## 3. Real production blocker discovered

The first live Manager assignment save failed in:

`public.validate_schedule_generation_v1(uuid)`

with PostgreSQL:

`42702: column reference "a.user_id" is ambiguous`

Root cause:

- the PL/pgSQL function declared record variable `a`;
- the daily assignment-count SQL query also used table alias `a`;
- PostgreSQL could not resolve `a.user_id` / `a.work_date` in that nested query.

This was a production server defect that fixture-only E2E had not exposed.

## 4. Repair

Production function was first repaired through direct SQL iteration, then the exact fix was recorded as migration:

`20260925033927_sched_08_live_validator_alias_fix_v1`

Repository migration:

`07_DATABASE/migrations/20260925033927_sched_08_live_validator_alias_fix_v1.sql`

The repair changes only the daily-count SQL alias:

- old SQL alias: `a`;
- new SQL alias: `asg`.

Preserved unchanged:

- all scheduling validation business rules;
- role/store authorization;
- `SECURITY DEFINER`;
- fixed `search_path = public`;
- authenticated RPC grant;
- Availability validation;
- overlap validation;
- max-two-assignments-per-day rule;
- official schedule overlap protection.

No table, RLS policy, scheduling authority or production business data was changed by the migration.

Regression:

`09_QA/people-shift/sched-08-live-validator-alias-fix.test.mjs`

The test explicitly fails if the ambiguous daily-count alias pattern returns.

## 5. First post-repair live transaction

After direct function repair, the complete production RPC sequence passed with terminal marker:

`SCHED08_ROLLBACK_PASS`

Verified in the live transaction:

- real Auth identities existed and had historical sign-in evidence;
- Manager was scoped to CN1 only;
- cross-store Manager read failed closed;
- A/B Availability was visible to Manager;
- Manager DRAFT → Validate → Review → Publish succeeded;
- publish retry returned already-published semantics and inserted zero duplicate schedules;
- Employee A read exactly the published identity;
- Owner read the same identity/current owner;
- Give A→B used the same schedule identity;
- B accept retry was idempotent;
- Manager approve retry was already-applied / non-reversing;
- Manager and Owner converged on B as current owner;
- A no longer saw the schedule;
- stale A Attendance failed with current-owner authority denial;
- stale/cross-user Give action failed closed;
- B saw the same schedule identity;
- B Attendance submission succeeded;
- exact Attendance retry reused the same Attendance identity.

Post-rollback audit:

- temporary Manager profile change restored;
- temporary Employee B activation restored;
- temporary Availability residue = 0;
- temporary generation assignment residue = 0;
- temporary official schedule residue = 0;
- temporary Give residue = 0;
- temporary Attendance residue = 0;
- total official schedules remained 0;
- total Give remained 0;
- total Attendance remained 0;
- target pre-existing generation returned to DRAFT.

## 6. Implementation PR qualification

Implementation PR #299:

- final head: `287a5214c28f233e20f823f0b9fffc94247f4455`;
- PR-head People Shift run `36091391453 / 107934392499` — SUCCESS;
- same-head push People Shift run `36091373142 / 107934335314` — SUCCESS;
- SCHED-01→07 browser gates remained PASS;
- Give/Swap/Attendance/Profile/Payroll/Failure-Recovery/Manager/Day-10/Control-Tower browser regressions remained PASS.

PR #299 merged as:

`2e03cb2226813073f1e1449e03347a9210922534`

## 7. Exact-main acceptance

Exact implementation main:

`2e03cb2226813073f1e1449e03347a9210922534`

Exact-main gates:

- People Shift `36091508147 / 107934735123` — SUCCESS;
- Pages source validation `36091508122 / 107934735211` — SUCCESS;
- Pages build `36091507559 / 107934736273` — SUCCESS;
- Pages deploy `36091507559 / 107934768302` — SUCCESS;
- Pages report `36091507559 / 107934768275` — SUCCESS.

Deterministic exact-main checks:

- Workforce canonical contract: 77/77;
- schedule-first compatibility: 9/9;
- People Shift regression: 171/171;
- Control Tower regression: 74/74;
- aggregate deterministic checks: **331/331 / 0 fail**.

## 8. Final post-merge live production acceptance

After implementation merge and exact-main CI success, the complete production transaction was executed again against the formally versioned production migration.

Terminal marker:

`SCHED08_FINAL_ROLLBACK_PASS`

Final production acceptance proved:

- migration `20260925033927_sched_08_live_validator_alias_fix_v1` is live;
- real existing Auth identities were used;
- Manager scope resolved to CN1 only;
- cross-store access failed closed;
- Employee A/B Availability reached Manager;
- Manager canonical publish succeeded;
- publish retry was idempotent with one logical official identity;
- A reload saw the exact published identity;
- Owner saw the same identity and A as initial owner;
- Give A→B kept that same identity;
- B recipient accept retry was idempotent;
- Manager approve retry was idempotent/non-reversing;
- Manager and Owner both saw B as current owner;
- A stale schedule disappeared;
- A stale Attendance authority failed closed;
- stale cross-user Give action failed closed;
- B saw the same schedule identity;
- B Attendance submission succeeded;
- Attendance retry reused the same Attendance identity.

The test transaction deliberately raised the PASS marker after all assertions, which atomically rolled back every temporary mutation.

## 9. Final zero-residue audit

Separate read-only audit after the final PASS transaction:

- production migration live = true;
- QA profile restored to ACCOUNTANT / ACTIVE / original empty scope;
- Employee B restored to STAFF / PENDING;
- SCHED-08 Availability residue = 0;
- SCHED-08 assignment residue = 0;
- SCHED-08 official schedule residue = 0;
- SCHED-08 Give residue = 0;
- SCHED-08 Attendance residue = 0;
- total official schedules = 0;
- total Give = 0;
- total Attendance = 0;
- total generation assignments = 0;
- target pre-existing generation status = DRAFT.

Persistent fake production residue introduced by SCHED-08: **ZERO**.

## 10. Advisor reconciliation

Supabase advisors were rerun after the formal migration.

Security advisor counts remain existing platform/debt findings:

- RLS enabled without policy: 11 INFO;
- mutable function search path: 1 WARN;
- anonymous-executable SECURITY DEFINER functions: 13 WARN;
- authenticated-executable SECURITY DEFINER functions: 66 WARN;
- leaked-password protection setting: 1 WARN.

Performance advisor counts:

- unindexed foreign keys: 35 INFO;
- auth/RLS init-plan findings: 16 WARN;
- unused indexes: 13 INFO;
- multiple permissive policies: 12 WARN.

The SCHED-08 alias-only migration did not introduce a new table, RLS policy, index or callable function surface. These advisor findings are pre-existing and are not a SCHED-08 regression.

## 11. Authority and truth invariants

SCHED-08 preserves:

- `work_schedules` as the only official/current schedule truth;
- Employee self-reader `list_my_approved_schedules_v2`;
- Manager/Owner official reader `get_manager_weekly_schedule`;
- shared Manager/Owner create/replace/validate/review/publish writer;
- canonical Give ownership transfer;
- Attendance current-owner authority;
- cross-store Manager denial;
- cross-user Employee denial;
- retry/idempotency behavior.

No second schedule truth or mutation path was added.

## 12. Closure

SCHED-08 is **DONE / CANONICAL CLOSED**.

Next sequential gate:

`SCHED-09 — Production reconciliation + canonical closure = READY / MANUAL_WORK`

SCHED-09 is not started by this closure.

Still blocked:

- TASK-108 behind the Scheduling Production Readiness gate;
- unrelated Workforce progression until SCHED-09 closes the overall gate.

Workforce Robot remains DISABLED. PFC remains unchanged.

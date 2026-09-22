# TASK-098 — Manual-Time Attendance V1 / Attendance Authority

**Track:** WORKFORCE_OPERATIONS_V1  
**Execution mode:** OWNER_DIRECT_TO_WORK / MANUAL_WORK  
**Date:** 2026-09-22  
**Status:** PENDING_FINAL_REMOTE_GATES  
**E2E-08:** STRONG on reconciled executable branch head; final CLOSED claim waits for PR-head + exact post-merge  
**E2E-09:** PARTIAL — backend contract/migration prepared; Employee Attendance Entry UI belongs TASK-099  
**Production migration:** `20260922142225_task_098_manual_time_attendance_authority_v1` — APPLIED  
**Production persistent test-data mutation:** NONE  
**Workforce Robot:** DISABLED  
**PFC cursor mutation:** NONE  
**TASK-099:** NOT STARTED

## 1. Canonical starting point

TASK-098 started only after TASK-097 canonical closure.

Starting main:

`f8d5ba609f3802c09d7b9dfa230ee362fb5f9ee8`

Before branching, main was verified identical to this SHA.

Canonical cursor at start:

- TASK-097 = DONE / E2E-07 STRONG / POST-MERGE GREEN
- TASK-098 = READY / MANUAL_WORK
- TASK-099 = staged
- Workforce Robot = DISABLED
- PFC = TASK-068 → TASK-069 unchanged

No valid parallel-track change was reset or reverted.

## 2. Five-Step

### QUESTION

Read-only repository + live production inventory showed that the canonical assignment spine was already strong, but Attendance still had legacy authority semantics:

- `work_schedules.user_id` is the final current assignment owner;
- Give/Swap apply already mutate that owner atomically;
- Employee attendance runtime still exposes realtime `clock_in_for_schedule` / `clock_out_attendance`;
- legacy `manual_attendance_from_schedule` immediately writes `COMPLETED`, hours and amount;
- `auto_attendance_from_approved_schedules` could still be called by authenticated users and synthesize attendance from planned schedules;
- Attendance had no canonical raw-submission / review / confirmed-time fields;
- `clock_out_attendance` did not revalidate current schedule ownership;
- legacy attendance mutations did not share the Give/Swap schedule lock namespace;
- legacy `get_my_attendance()` remained anon executable;
- active browser table DML was already effectively absent by grants, but the boundary was not explicitly restated in TASK-098.

The canonical TASK-091 contract requires:

`final current assignment owner → manual actual-time Attendance → reviewed/confirmed work time`

and specifically:

- old owner loses Attendance authority after Give/Swap APPLIED;
- new owner gains Attendance authority;
- stale UI cannot override current server truth;
- raw Attendance submission is not confirmed work time;
- missing review policy fails closed to NEEDS_REVIEW;
- no canonical realtime CHECKED_IN/CHECKED_OUT state.

### DELETE

TASK-098 removes or blocks these authority paths:

- old-owner attendance mutation after ownership transfer;
- stale cached/client ownership as authority;
- auto-attendance execution by authenticated users;
- anonymous execution of the legacy attendance reader;
- browser direct table DML authority;
- transfer-vs-attendance races where both paths could pass stale checks independently;
- automatic interpretation of raw submission as confirmed work time;
- automatic interpretation of raw submission as payroll truth.

TASK-098 does **not** delete historical attendance rows.

Legacy realtime RPCs remain temporarily callable because TASK-099 owns the Employee Attendance Entry UI migration, but TASK-098 hardens them to current-owner truth and the same schedule lock namespace. Therefore they can no longer preserve old-owner authority across a transfer.

### SIMPLIFY

One authority spine only:

`work_schedules.id + work_schedules.user_id + APPROVED`

No parallel assignment-ownership table was created.

The existing `attendance.schedule_id` remains canonical assignment identity.

Legacy attendance columns remain compatibility evidence:

- `check_in`
- `check_out`
- `OPEN`
- `COMPLETED`
- `hours_worked`
- `amount`

They are not reinterpreted as canonical confirmed work time.

### ACCELERATE

Reused:

- `work_schedules`;
- `attendance`;
- `uq_attendance_schedule_active`;
- Give/Swap `shift_swap_schedule:<schedule_id>` advisory-lock namespace;
- Employee/Manager Give lifecycle browser fixture;
- existing notification outbox;
- existing People Shift workflow.

No parallel Attendance engine or redundant CI workflow was created.

### AUTOMATE

Only deterministic safety was added:

- per-schedule transaction lock;
- current-owner revalidation at mutation time;
- ACTIVE STAFF revalidation;
- retry/idempotency handling;
- one-active-attendance identity;
- fail-closed NEEDS_REVIEW when no review threshold is configured;
- submission/needs-review notification event keys.

No automatic clock-in, clock-out, attendance approval, Manager review, confirmed-work-time creation or payroll finalization was added.

## 3. Live baseline before mutation

Read-only pre-apply observation:

**2026-09-22 14:21:52 UTC / 21:21:52 ICT**

- attendance total: 0
- attendance by status: {}
- work_schedules: 0
- active attendance duplicate schedule groups: 0
- attendance notifications: 0
- duplicate attendance notification event-key groups: 0
- active Gives: 0
- active Swaps: 0

Earlier schema inventory also found zero attendance and zero schedules.

No Employee name, Employee UUID, HR record, salary record, token, secret or service-role credential was read into evidence or committed.

## 4. Pre-existing attendance architecture

Before TASK-098, live `attendance` contained legacy fields including:

- work_date
- user_id
- store_id
- schedule_id
- check_in
- check_out
- status
- late_minutes
- early_minutes
- grade
- hourly_rate
- hours_worked
- amount
- planned_start
- planned_end

Legacy status constraint:

- OPEN
- COMPLETED
- DELETED
- DELETED_BY_MANAGER

Existing one-active-attendance-per-schedule protection:

`uq_attendance_schedule_active`

The Employee runtime still used the legacy realtime attendance RPC family.

## 5. Canonical raw-submission fields

TASK-098 adds nullable, backward-compatible fields:

- `actual_start`
- `actual_end`
- `submitted_at`
- `submission_status`
- `reviewed_by`
- `reviewed_at`
- `review_decision`
- `confirmed_start`
- `confirmed_end`
- `confirmed_minutes`

Historical rows are not rewritten.

Canonical V1 states are added alongside legacy compatibility states:

- DRAFT
- SUBMITTED
- NORMAL
- NEEDS_REVIEW
- APPROVED
- ADJUSTED
- REJECTED

Shape constraints require canonical active Attendance rows to carry schedule identity, actual time and submission metadata.

APPROVED/ADJUSTED rows cannot exist without confirmed-time fields.

TASK-098 itself does not create APPROVED/ADJUSTED or confirmed work time.

## 6. Attendance authority validator

New internal function:

`validate_attendance_assignment_authority_v1(schedule_id, employee_id)`

It proves from current server truth:

1. schedule exists;
2. schedule is APPROVED;
3. `work_schedules.user_id = employee_id`;
4. profile exists;
5. profile is ACTIVE;
6. profile role is STAFF.

Fail-closed diagnostics include:

- ATTENDANCE_SCHEDULE_NOT_FOUND
- ATTENDANCE_SCHEDULE_NOT_APPROVED
- ATTENDANCE_NOT_CURRENT_OWNER
- ATTENDANCE_EMPLOYEE_INACTIVE
- ATTENDANCE_EMPLOYEE_NOT_STAFF

It is SECURITY DEFINER with fixed `search_path=public`.

EXECUTE:

- anon: NO
- authenticated: NO
- postgres: YES

It is an internal primitive, not a browser RPC.

## 7. Canonical submit RPC

New operational RPC:

`submit_manual_time_attendance_v1(schedule_id, actual_start, actual_end, note)`

Server boundary:

- auth required;
- actual start/end required and ordered;
- acquires the exact shared Give/Swap per-schedule advisory lock;
- locks the official schedule row;
- revalidates current owner / APPROVED / ACTIVE STAFF;
- rejects a future schedule;
- preserves the existing safe current-day “shift must be finished” boundary;
- rechecks active attendance under the lock;
- converges an exact retry to the same attendance identity;
- fails closed if another active attendance already exists.

Successful raw submit writes:

- same canonical schedule_id;
- current owner as user_id;
- planned start/end from official schedule;
- raw actual start/end from Employee submission;
- submitted_at;
- submission_status=SUBMITTED;
- status=NEEDS_REVIEW.

It does **not** populate:

- confirmed_start;
- confirmed_end;
- confirmed_minutes;
- final payroll truth.

It also does not derive canonical work time from planned schedule alone.

## 8. Missing review policy behavior

TASK-091 leaves the numeric attendance deviation threshold unresolved.

TASK-098 therefore does not invent:

- 5-minute threshold;
- 10-minute threshold;
- 15-minute threshold;
- auto-normal threshold;
- auto-approval threshold.

A new submission fails closed to:

`NEEDS_REVIEW`

This satisfies the canonical missing-policy rule without stealing TASK-100 review scope.

## 9. Concurrency with Give / Swap

Attendance submission uses:

`pg_advisory_xact_lock(hashtextextended('shift_swap_schedule:' || schedule_id, 0))`

This is the same lock namespace introduced by TASK-096/097.

Therefore transfer and attendance authority checks on the same schedule cannot independently pass stale ownership truth concurrently.

The new submission also row-locks the official schedule before authority validation.

## 10. Transitional legacy RPC hardening

TASK-099 owns the active Employee Attendance Entry UI migration.

TASK-098 does not steal that scope.

However, the still-active compatibility RPCs were hardened now so they cannot violate current owner truth:

### clock_in_for_schedule

Now:

- acquires shared schedule lock;
- locks schedule row;
- revalidates current owner / APPROVED / ACTIVE STAFF before attendance insert.

### clock_out_attendance

Now:

- resolves schedule identity;
- acquires shared schedule lock;
- locks attendance row;
- revalidates current current-owner authority before closing legacy OPEN attendance.

### manual_attendance_from_schedule

Now:

- resolves exact schedule;
- acquires shared schedule lock;
- locks official schedule;
- revalidates current owner before legacy insert.

These remain transitional compatibility functions until TASK-099 switches Employee UI to Manual-Time V1.

## 11. Automatic attendance authority removed from Employee surface

`auto_attendance_from_approved_schedules(date,date)`

is now:

- anon executable: NO
- authenticated executable: NO
- postgres executable: YES

Live inventory found:

- no cron schema;
- no other public function body referencing this function.

Thus there is no live configured automatic caller found.

TASK-098 does not drop the historical function because destructive cleanup is unnecessary; it removes it from Employee operational authority.

## 12. Direct table authority

TASK-098 explicitly revokes attendance table privileges from:

- PUBLIC
- anon
- authenticated

Post-apply verification:

- anon SELECT/INSERT/UPDATE: NO
- authenticated SELECT/INSERT/UPDATE/DELETE: NO

Attendance mutation is RPC/server-authoritative.

## 13. Legacy reader security

Before TASK-098, legacy `get_my_attendance()` was anon executable.

TASK-098 revokes PUBLIC/anon EXECUTE and keeps:

- authenticated: YES
- postgres: YES.

Security Advisor anon SECURITY DEFINER findings dropped from 19 before TASK-098 to 18 after TASK-098.

## 14. Notification semantics

Canonical raw submission now emits stable event keys for:

- ATTENDANCE_SUBMITTED → submitting Employee;
- ATTENDANCE_NEEDS_REVIEW → scoped Store Managers.

Because no auto-normal/auto-approval policy exists, the new path does not emit ATTENDANCE_CONFIRMED.

Historical realtime clock event branches remain compatibility-only for legacy rows and are not reached by new Manual-Time V1 submission rows.

Historical pending CLOCK_OUT_REMINDER records for a submitted schedule may still be cancelled; TASK-098 creates no new reminder.

## 15. Migration safety

Source migration:

`07_DATABASE/migrations/20260922142225_task_098_manual_time_attendance_authority_v1.sql`

Before apply, the exact migration body passed live-schema validation inside:

`BEGIN → exact migration SQL → ROLLBACK`

Result:

`TASK_098_ROLLBACK_VALIDATION_OK`

No persistent test row was created.

Production migration was then applied.

Supabase assigned production version:

`20260922142225`

The provisional Git filename was reconciled to this exact version without changing the SQL body.

## 16. Post-apply live reconciliation

Read-only observation:

**2026-09-22 14:23:40 UTC / 21:23:40 ICT**

- attendance total: 0
- attendance by status: {}
- work_schedules: 0
- active attendance duplicate schedule groups: 0
- attendance notifications: 0
- duplicate attendance event-key groups: 0
- active Gives: 0
- active Swaps: 0

No production Employee, schedule, Give, Swap, attendance or notification fixture was created.

## 17. Exact live function-source reconciliation

All six new/changed TASK-098 function bodies byte-match the exact Git migration source:

1. `validate_attendance_assignment_authority_v1`
2. `submit_manual_time_attendance_v1`
3. `clock_in_for_schedule`
4. `clock_out_attendance`
5. `manual_attendance_from_schedule`
6. `notification_attendance_trigger_v1`

The initial comparison incorrectly excluded the final newline contained inside the SQL dollar-quoted body, producing a one-character length mismatch. Repeating the comparison with the delimiter boundary represented correctly produced:

- expected MD5 = live MD5 for 6/6;
- expected length = live length for 6/6;
- byte_exact = true for 6/6.

This was a comparison-method issue, not production drift.

## 18. Security boundary

All TASK-098 changed/new functions use fixed:

`search_path=public`

Targeted live grants:

- validator: postgres only;
- canonical submit: authenticated + postgres;
- notification trigger: postgres only;
- auto attendance: postgres only;
- legacy clock/manual compatibility mutation RPCs: authenticated + postgres, with new internal current-owner validation;
- legacy get_my_attendance: authenticated + postgres;
- no targeted TASK-098 function is anon executable.

Security Advisor after migration:

- `function_search_path_mutable`: existing unrelated `magasin_normalize_name` only;
- `anon_security_definer_function_executable`: 18 legacy findings, down from 19;
- TASK-098 canonical submit is an intentional authenticated operational SECURITY DEFINER RPC with internal auth/current-owner/role validation;
- unrelated legacy advisor debt remains out of scope.

## 19. E2E-08 executable acceptance

Dedicated browser:

`09_QA/people-shift/task-098-attendance-authority-browser.mjs`

It reuses the existing TASK-097 multi-role Give fixture and real Employee Give + Manager Give UI engines.

Scenario:

1. Schedule X initially belongs to Employee A.
2. A opens Give and offers X to B.
3. B accepts.
4. Manager approves.
5. Same schedule_id X transfers A → B.
6. Old owner A attempts Manual-Time Attendance.
7. Server-contract fixture returns ATTENDANCE_NOT_CURRENT_OWNER.
8. No attendance row is created for A.
9. New owner B submits actual time.
10. Submission is bound to same schedule_id and B.
11. status=NEEDS_REVIEW.
12. submission_status=SUBMITTED.
13. confirmed work time remains absent.
14. exact retry returns same attendance identity with already_submitted=true.
15. reload preserves B as owner.
16. stale A remains denied after reload.
17. ATTENDANCE_SUBMITTED and ATTENDANCE_NEEDS_REVIEW are emitted once by logical event key.
18. new path creates no ATTENDANCE_CLOCKED_IN/OUT event.
19. browser diagnostics have no page/console/request/5xx failure.

Marker:

`TASK_098_E2E_08=PASS`

This closes the attendance-authority side left deliberately open by TASK-097.

## 20. Deterministic coverage

New deterministic suite:

`09_QA/people-shift/manual-time-attendance-authority-v1.test.mjs`

It proves:

- raw/review/confirmed schema separation;
- no historical attendance rewrite;
- current-owner server validation;
- shared Give/Swap lock namespace;
- ACTIVE STAFF requirement;
- NEEDS_REVIEW fail-closed semantics;
- no raw→confirmed/payroll mutation;
- retry idempotency;
- unique active attendance handling;
- legacy RPC transfer-race hardening;
- auto attendance removal from authenticated authority;
- no browser table DML authority;
- no anon legacy reader authority;
- fixed search_path / least privilege;
- canonical notification semantics;
- E2E-08 fixture contract.

## 21. Reconciled executable branch gate

Final executable/reconciled head before evidence-only documentation:

`e4a52c307fec1b0614ed5c15fb52f7c986df57f8`

People Shift run:

- run: **35739913105**
- job: **106786670297**
- runtime: Node v20.20.2
- TASK-091 Workforce contract: 61/61 PASS
- schedule-first compatibility: 9/9 PASS
- People Shift deterministic: 73/73 PASS
- Control Tower deterministic: 74/74 PASS
- deterministic total: **217/217 PASS**
- TASK-096 Swap browser: PASS
- TASK-097 Give browser: PASS
- TASK-098 E2E-08 attendance-authority browser: PASS
- Employee notification: PASS
- TASK-095 published schedule: PASS
- Employee availability: PASS
- legacy Employee attendance regression: PASS
- Manager Workforce: PASS
- People Shift Day-10 browser: PASS
- Control Tower browser: PASS
- failures: 0

A prior green branch gate at `6d122ff2...` proved the same executable behavior before the production-version filename reconciliation. It is not used as the final executable authority because the migration provenance filename subsequently changed.

## 22. Scope boundaries preserved

TASK-098 does not:

- start TASK-099;
- replace Employee Attendance UI;
- invent attendance deviation threshold;
- auto-approve NORMAL attendance;
- implement Manager review UI/workflow;
- create confirmed work time;
- calculate payroll;
- interpret attendance.amount as payroll truth;
- define Give CANCELLED timing;
- define Give EXPIRED cutoff;
- change TASK-097 lifecycle;
- enable Workforce Robot;
- change PFC.

Therefore:

- E2E-08 may be closed after final remote/post-merge gates;
- E2E-09 remains PARTIAL and continues into TASK-099;
- Manager review / confirmed work time remain TASK-100+.

## 23. Production safety

Confirmed:

- no persistent fake Employee;
- no persistent fake schedule;
- no persistent fake Give;
- no persistent fake Swap;
- no persistent fake attendance;
- no persistent fake notification;
- no historical attendance rewrite;
- no private HR data committed;
- no production UUID committed;
- no salary data committed;
- no secret/token/service-role credential committed.

## 24. Final-gate placeholders

The following remain pending until PR/merge closure:

- implementation PR number;
- final PR head;
- PR-head People Shift run/job;
- merge SHA;
- exact post-merge People Shift run/job;
- exact-main collateral Pages gates;
- final post-merge read-only audit;
- canonical source-of-truth closure PR/SHA.

TASK-098 is not marked DONE in canonical project state until these remote gates complete.

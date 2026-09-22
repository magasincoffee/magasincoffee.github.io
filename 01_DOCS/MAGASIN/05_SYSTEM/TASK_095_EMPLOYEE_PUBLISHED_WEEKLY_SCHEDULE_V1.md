# TASK-095 — Employee Published Weekly Schedule V1

**Track:** WORKFORCE_OPERATIONS_V1  
**Execution mode:** OWNER_DIRECT_TO_WORK / MANUAL_WORK  
**Date:** 2026-09-22  
**Status:** PENDING_FINAL_GATE  
**Production migration:** `20260922015212_task_095_employee_published_weekly_schedule_v1` — APPLIED  
**Production test data mutation:** NONE  
**Private Employee data committed:** NONE  
**Workforce Robot:** DISABLED  
**PFC cursor mutation:** NONE  
**Next task:** TASK-096 remains STAGED until TASK-095 final closure

## 1. Five-Step decisions

### QUESTION

TASK-095 asks for one canonical Employee published weekly schedule path:

```text
Manager Publish
→ APPROVED work_schedules
→ Employee weekly schedule
→ week navigation
→ reload/direct route stability
→ SCHEDULE_PUBLISHED notification
```

Exact live inventory proved the existing reader `list_my_approved_schedules_v2(p_week_start)` already satisfies the canonical Employee read contract and must be reused rather than replaced.

The live schedule-notification trigger, however, still created `CLOCK_OUT_REMINDER` from legacy realtime attendance semantics. Workforce V1 explicitly deprecates that behavior, so TASK-095 minimally replaces the trigger function while preserving all canonical schedule notification events and security characteristics.

### DELETE

Removed from the active Workforce V1 schedule flow:

- new `CLOCK_OUT_REMINDER` creation from schedule publish;
- new `CLOCK_OUT_REMINDER` creation after schedule transfer;
- new `CLOCK_OUT_REMINDER` creation after schedule date/time/store change;
- current-week-only assumptions in Employee schedule rendering;
- stale prior-week rows shown after a failed request;
- duplicate same-week in-flight RPC reads;
- iframe/document/body readiness assumptions.

Not removed:

- historical `CLOCK_OUT_REMINDER` rows;
- cancellation of historical pending reminders when the related schedule transfers or is cancelled;
- historical TASK-032 evidence;
- attendance RPCs or attendance history;
- Swap/Give lifecycle behavior.

### SIMPLIFY

Canonical Employee schedule path remains:

```text
APPROVED work_schedules
→ list_my_approved_schedules_v2(p_week_start)
→ 06_EMPLOYEE/schedule/engine-v1.js
→ Employee weekly schedule
```

No second Employee schedule engine and no second notification subsystem were created.

### ACCELERATE

Reused:

- `list_my_approved_schedules_v2`;
- `list_my_notifications_v1`;
- `notification_outbox`;
- unique `event_key`;
- `enqueue_notification_v1`;
- existing `trg_notification_work_schedules`;
- existing Employee schedule and notification engines.

### AUTOMATE

Only deterministic safety is automatic:

- Asia/Ho_Chi_Minh week identity;
- bounded iframe body bootstrap retry;
- same-week concurrent read dedupe;
- stale-response suppression;
- explicit loading/error states;
- stale-success clearing after a failed week read;
- stable notification event-key upsert.

No external calendar, email-provider activation, Robot scheduling, attendance automation, payroll or TASK-096/097 lifecycle behavior is added.

---

## 2. Canonical source baseline

Brain dispatch baseline was `88ed8f721ed7a96090bff5a16e4663da7c45a684`.

Before implementation, canonical main had advanced through a parallel Supervisor migration track to:

`04157dc1b052ac0dfed368e2ef8f9500212e54a0`

TASK-095 uses that newer canonical main and does not reset/revert MIG-004 changes.

Final pre-evidence implementation branch:

`task-095-employee-published-weekly-schedule-v1`

Final executable head before evidence:

`a2fd0e24f5e59aa268daecc17834e13260543a7b`

Branch relation to canonical main:

- ahead: **19 commits**
- behind: **0**
- rebase/reconcile needed: **NO**

---

## 3. Exact live Employee reader inventory

### Preferred canonical RPC

`list_my_approved_schedules_v2(p_week_start date)`

Live characteristics:

- language: `plpgsql`
- volatility: STABLE
- `SECURITY DEFINER`
- `search_path=public`
- executable by: authenticated + postgres
- no PUBLIC/anon execute

Canonical semantics verified from the exact live function definition:

1. `auth.uid()` is required;
2. if `p_week_start` is null, week derives from `now() at time zone 'Asia/Ho_Chi_Minh'`;
3. supplied/default week must be Monday;
4. non-Monday input raises `WEEK_START_MUST_BE_MONDAY`;
5. query is constrained to `ws.user_id=auth.uid()`;
6. query is constrained to `ws.status='APPROVED'`;
7. exact range is `v_week_start ... v_week_start + 6`;
8. store projection is limited to store id/code/name;
9. ordering is deterministic: work_date, start_time, end_time, id.

Decision:

**REUSE_AS_IS.**

TASK-094 lineage columns do not affect this reader.

### Legacy RPC

`get_my_schedule()` still exists and is broader legacy behavior:

- own-user scoped;
- no canonical APPROVED-only filter;
- no exact-week parameter;
- currently executable by PUBLIC/authenticated/postgres.

TASK-095 does not use it. The canonical Employee engine has a static regression proving `get_my_schedule` is absent and no direct table `.from(...)` read is used.

Legacy RPC hardening outside the active canonical path is not expanded into this task.

---

## 4. work_schedules live boundary

Relevant live fields include:

- id;
- work_date;
- start_time;
- end_time;
- store_id;
- user_id;
- status;
- approver_id;
- approved_at;
- note;
- origin;
- created_at;
- updated_at;
- source_generation_id;
- source_generation_assignment_id.

TASK-094 lineage therefore remains intact.

RLS is enabled with authenticated SELECT/INSERT/UPDATE policies. Employee SELECT policy can see own rows, but TASK-095 browser does not read the table directly; the canonical RPC additionally enforces APPROVED-only exact-week semantics.

---

## 5. Exact notification inventory before migration

### Reader

`list_my_notifications_v1(p_limit integer)`

Verified live semantics:

- auth required;
- USER audience requires `recipient_user_id=auth.uid()`;
- STORE_MANAGER audience requires Manager role + store access;
- OWNER audience requires OWNER role;
- CANCELLED email-state rows are excluded;
- only rows with `available_at<=now()`;
- deterministic newest-first ordering;
- limit bounded to 1..100.

Employee notification UI reuses this reader.

### Outbox

`notification_outbox` has:

- unique non-null `event_key`;
- USER/STORE_MANAGERS/OWNER audience contract;
- recipient/store/entity/schedule projection;
- provider-neutral email state;
- RLS select policy scoped to the current audience.

Unique index:

`notification_outbox_event_key_key(event_key)`

### enqueue_notification_v1

Exact live semantics use:

`INSERT ... ON CONFLICT(event_key) DO UPDATE`

Therefore the stable publish key:

`schedule:<work_schedule_id>:published`

is idempotent for the same official schedule.

If an existing event was already email `SENT`, enqueue preserves SENT rather than falsely re-marking it pending.

---

## 6. Legacy notification trigger finding

Before TASK-095, live `notification_schedule_trigger_v1` generated canonical schedule events **and** legacy `CLOCK_OUT_REMINDER`.

It created reminders:

- on APPROVED insert/status transition;
- after Employee transfer;
- after work date/time/store change.

That conflicts with Workforce V1, where realtime check-in/check-out semantics are not active.

TASK-095 therefore owns removing **new reminder creation** from this schedule trigger.

---

## 7. TASK-095 production migration

Canonical Git migration:

`07_DATABASE/migrations/20260922015212_task_095_employee_published_weekly_schedule_v1.sql`

Production migration history:

- version: **20260922015212**
- name: `task_095_employee_published_weekly_schedule_v1`
- status: **APPLIED**

The migration uses only:

`CREATE OR REPLACE FUNCTION public.notification_schedule_trigger_v1()`

and preserves:

- trigger return type;
- `plpgsql`;
- `SECURITY DEFINER`;
- `search_path=public`;
- existing trigger binding;
- schedule publication/change/cancel/transfer events.

It preserves event creation for:

- `SCHEDULE_PUBLISHED`;
- `SCHEDULE_CHANGED`;
- `SCHEDULE_CANCELLED`;
- `SCHEDULE_TRANSFERRED_IN`;
- `SCHEDULE_TRANSFERRED_OUT`.

It creates **no new**:

- `CLOCK_OUT_REMINDER`.

Historical pending reminder cancellation remains in transfer/cancel branches so stale legacy reminder rows can safely be cancelled if they exist.

No historical row is deleted or backfilled.

### Production/source drift verification

Final live `pg_proc.prosrc` was compared against the exact `$function$` body in the canonical branch migration.

Result:

**EXACT BODY MATCH**

Live metadata:

- `SECURITY DEFINER = true`
- `search_path=public`

Live privilege after apply:

- postgres EXECUTE only;
- no PUBLIC;
- no anon;
- no authenticated.

Trigger binding remains:

`trg_notification_work_schedules AFTER INSERT OR UPDATE ON work_schedules FOR EACH ROW EXECUTE FUNCTION notification_schedule_trigger_v1()`

---

## 8. Security Advisor

Security Advisor was recorded before and after TASK-095 migration.

Post-apply counts remain:

- `rls_enabled_no_policy`: 10 INFO
- `function_search_path_mutable`: 1 WARN
- `anon_security_definer_function_executable`: 19 WARN
- `authenticated_security_definer_function_executable`: 68 WARN
- `auth_leaked_password_protection`: 1 WARN

There is **no finding referencing `notification_schedule_trigger_v1`** after the migration.

These remaining findings are pre-existing/unrelated to the TASK-095 trigger replacement and were not broadened into this task.

---

## 9. Employee schedule engine hardening

Canonical engine remains:

`06_EMPLOYEE/schedule/engine-v1.js`

TASK-095 hardens it without introducing a second engine.

### Week request state

Each request captures `requestedWeek`.

The engine:

- uses only `list_my_approved_schedules_v2`;
- sends `p_week_start=requestedWeek`;
- dedupes concurrent same-week refresh;
- assigns a request sequence;
- ignores stale responses when week/request sequence changed.

### Loading / error / stale data

When loading a new week:

- current rows are cleared;
- explicit loading state renders.

On request failure:

- rows remain empty;
- explicit error state renders;
- stale prior-week shifts cannot remain visible as successful current-week data.

A valid empty response renders daily `Không có ca`, not an inferred error.

### iframe lifecycle

TASK-095 audits the same class of iframe readiness boundary found during TASK-094 attendance final gate.

Schedule engine now:

- requires document + body before binding;
- stores a single body binding marker;
- uses bounded `bootFrame(attempt)` retry when body is not yet ready;
- binds again after iframe load without duplicate listener setup;
- reload remains deterministic.

---

## 10. Asia/Ho_Chi_Minh week semantics

Shared Core remains the source of date primitives.

`dateKey()` explicitly derives the local calendar date with:

`timeZone='Asia/Ho_Chi_Minh'`

TASK-095 changes date-only arithmetic to operate on `YYYY-MM-DDT00:00:00Z` identities rather than mixing a `+07:00` Date with UTC getters.

Deterministic proof:

### Sunday boundary

Timestamp:

`2026-09-27T16:30:00Z`

is:

`2026-09-27 23:30 Asia/Ho_Chi_Minh`

Therefore:

- local date = 2026-09-27;
- “Tuần này” = 2026-09-21 → 2026-09-27;
- “Tuần sau” = 2026-09-28 → 2026-10-04.

### Monday rollover

Timestamp:

`2026-09-27T17:30:00Z`

is:

`2026-09-28 00:30 Asia/Ho_Chi_Minh`

Therefore:

- local date = 2026-09-28;
- “Tuần này” = 2026-09-28 → 2026-10-04.

The Sunday next-week identity and Monday current-week identity are equal.

---

## 11. E2E-04 — Publish → Monday visibility

Final dedicated browser result:

**E2E-04 STRONG / PASS**

Final branch run:

- run: **35677433581**
- job: **106586778400**
- exact branch head: `a2fd0e24f5e59aa268daecc17834e13260543a7b`
- runtime: **Node v20.20.2**
- failures: **0**

E2E-04 proves:

1. Sunday “Tuần này” is 2026-09-21 and does not display target next-week rows.
2. Canonical Manager publish fixture creates stable `SCHEDULE_PUBLISHED` keys.
3. Two publish attempts do not duplicate event keys.
4. No `CLOCK_OUT_REMINDER` is generated.
5. Email state remains PENDING, never fake SENT.
6. Sunday “Tuần sau” calls reader with `p_week_start=2026-09-28`.
7. Employee sees exactly own APPROVED rows for 2026-09-28→2026-10-04.
8. Other Employee row is absent.
9. PENDING row is absent.
10. CANCELLED row is absent.
11. out-of-week row is absent.
12. correct date/time/store values render.
13. two concurrent same-week refresh calls create one effective reader RPC.
14. failed future-week read clears prior success and shows explicit error.
15. recovery does not cross-wire weeks.
16. iframe reload preserves target week and rows.
17. body binding marker remains single.
18. Employee notification reader shows the two own SCHEDULE_PUBLISHED events.
19. backend fixture contains another Employee’s event, but it is not rendered to current Employee.
20. notification keys are unique.
21. Monday 2026-09-28 “Tuần này” shows the exact same schedule ids previously seen under Sunday “Tuần sau”.
22. no browser direct official schedule mutation.
23. zero console error.
24. zero page error.
25. zero unexpected request failure.
26. zero HTTP 5xx.

---

## 12. Final branch regression gate

Final branch People Shift gate:

- run: **35677433581**
- job: **106586778400**
- Node: **v20.20.2**
- TASK-091 Workforce contract: **61/61 PASS**
- Schedule-first + Published Schedule Feedback: **9/9 PASS**
- People Shift deterministic: **43/43 PASS**
- Control Tower deterministic: **74/74 PASS**
- deterministic total: **187/187 PASS**
- browser suites/markers: **9/9 PASS**
- failures: **0**

Browser PASS:

- Employee Swap
- Employee Give
- Employee notification
- TASK-095 Employee Published Weekly Schedule
- Employee availability
- Employee attendance
- Manager Workforce
- People Shift Day-10
- Control Tower

TASK-092/093/094 compatibility remains green through those suites.

---

## 13. Production safety

Read-only pre-migration observation at **2026-09-22 08:45:11 ICT**:

- work_schedules total: 0
- notification_outbox total: 0
- SCHEDULE_PUBLISHED events: 0
- CLOCK_OUT_REMINDER events: 0
- duplicate event_key groups: 0

Post-migration read-only observation at **2026-09-22 08:52:47 ICT**:

- work_schedules total: 0
- notification_outbox total: 0
- SCHEDULE_PUBLISHED events: 0
- CLOCK_OUT_REMINDER events: 0

TASK-095 created no persistent fake:

- Employee;
- schedule;
- generation;
- notification;
- attendance.

No private Employee name/UUID, HR data, salary, token, secret or service-role key is committed.

---

## 14. Files changed before evidence

1. `.github/workflows/people-shift-tests.yml`
2. `02_CORE/shared/shared-core-v1.js`
3. `06_EMPLOYEE/schedule/engine-v1.js`
4. `07_DATABASE/migrations/20260922015212_task_095_employee_published_weekly_schedule_v1.sql`
5. `09_QA/people-shift/employee-published-weekly-schedule-v1.test.mjs`
6. `09_QA/people-shift/employee-published-weekly-schedule-fixture.html`
7. `09_QA/people-shift/employee-published-weekly-schedule-browser.mjs`

No generated QA artifact is committed.

---

## 15. Remaining TASK-096 boundary

TASK-095 does not redesign Swap.

TASK-096 remains responsible for:

**Swap Lifecycle Reconciliation + Hardening**

TASK-095 only proves existing Swap regression remains green and preserves schedule/notification compatibility.

The TASK-094 explicit supersede/version workflow also remains Owner-undefined and is not solved here.

---

## 16. Final-gate placeholders

The following are intentionally not invented before remote PR/merge gates complete:

- PR number: **PENDING_FINAL_GATE**
- final PR head: **PENDING_FINAL_GATE**
- PR-head People Shift run/job: **PENDING_FINAL_GATE**
- collateral PR workflows: **PENDING_FINAL_GATE**
- merge SHA: **PENDING_FINAL_GATE**
- exact post-merge People Shift run/job: **PENDING_FINAL_GATE**
- exact post-merge collateral workflows: **PENDING_FINAL_GATE**
- post-merge live reconciliation: **PENDING_FINAL_GATE**
- source-of-truth closure: **PENDING_FINAL_GATE**

TASK-095 is not DONE until all required gates are green.

# TASK-100 — Manager Attendance Review + Confirmed Work Time V1

Date: 2026-09-22  
Track: Workforce Operations V1  
Execution mode: MANUAL_WORK  
Workforce Robot: DISABLED

## 1. Result

**TASK-100 = DONE.**

Manager Attendance Review V1 is implemented on the canonical TASK-098/099 attendance authority.

**E2E-09 = CLOSED.**

The lifecycle is now executable end-to-end:

Employee owns current APPROVED schedule
→ Employee submits Manual-Time Attendance through TASK-099
→ raw attendance persists as SUBMITTED / NEEDS_REVIEW
→ scoped Manager reads the review queue
→ explicit Manager review
→ confirmed work time is persisted exactly once for APPROVE / ADJUST
→ REJECT produces no confirmed work time
→ retry/reload converges to canonical truth
→ stale/unauthorized review fails closed.

**E2E-10 = CLOSED for the canonical exception-review path.**

The numeric deviation threshold remains intentionally CONFIGURABLE_UNRESOLVED. TASK-100 does not invent a threshold; TASK-098 continues to fail new raw submissions closed to NEEDS_REVIEW until policy is configured. Manager explicit review is therefore the authoritative confirmation path.

## 2. Canonical starting point

Required starting main:

`0b5622a9c43ee24d47442dce44b5331402b74ecb`

At TASK-100 start, main was exactly that SHA.

Canonical handoff at start:

- TASK-099 = DONE
- Employee Attendance Entry UI V1 = CLOSED
- E2E-09 = PARTIAL / EMPLOYEE SIDE CLOSED
- Workforce current = TASK-100
- Workforce next = TASK-101
- Workforce Robot = DISABLED
- PFC = TASK-068 → TASK-069 unchanged

No valid change from another track was reset or reverted.

## 3. QUESTION — current truth before implementation

Read-only repository and production inventory established:

- TASK-098 already added `actual_start`, `actual_end`, submission metadata, reviewer fields and `confirmed_start/end/minutes` to `attendance`;
- there was no separate confirmed-work-time table;
- the canonical contract permits the reviewed `attendance.confirmed_*` projection as confirmed work time;
- TASK-099 already closed Employee Manual-Time UI;
- no canonical Manager attendance review RPC/UI existed;
- legacy realtime attendance compatibility was not suitable as Manager review authority;
- production had 0 attendance and 0 work_schedules rows;
- browser direct attendance table DML was already revoked;
- TASK-098 current-owner validator and shared Give/Swap lock namespace were already canonical.

Conclusion: **reuse one canonical attendance row; do not create a parallel confirmed-work-time table.**

## 4. Five-Step implementation

### QUESTION

Manager review/confirmation authority was missing while raw submission authority was already hardened.

### DELETE

TASK-100 does not permit:

- Employee/client self-confirmation;
- direct browser INSERT/UPDATE/SELECT/DELETE on attendance;
- stale Manager review without current schedule revalidation;
- duplicate/conflicting terminal review;
- silent auto-confirm;
- automatic threshold invention;
- raw attendance to become payroll truth;
- a second confirmed-work-time storage family.

### SIMPLIFY

Canonical spine:

`work_schedules current APPROVED owner`
→ `attendance raw submission`
→ explicit scoped Manager review
→ `attendance.confirmed_*`.

### ACCELERATE

Reused:

- TASK-098 attendance schema;
- TASK-098 `validate_attendance_assignment_authority_v1`;
- shared `shift_swap_schedule:<schedule_id>` advisory-lock namespace;
- existing Manager ACTIVE role/store-scope primitives;
- existing notification outbox;
- existing Manager Workforce shell;
- TASK-099 Employee Attendance UI in cross-role browser evidence.

### AUTOMATE

Only deterministic safety automation was added:

- lock/revalidation;
- exact retry idempotency;
- stable confirmed notification event key;
- UI refresh/reconcile.

There is no auto-approve, auto-adjust, auto-reject, auto-clock or payroll calculation.

## 5. Production migration

Canonical migration:

`07_DATABASE/migrations/20260922160120_task_100_manager_attendance_review_confirmed_work_time_v1.sql`

Production migration version:

`20260922160120`

Migration name:

`task_100_manager_attendance_review_confirmed_work_time_v1`

Before production apply, the exact SQL passed live-schema rollback validation:

`BEGIN → exact migration SQL → marker → ROLLBACK`

Marker:

`TASK_100_ROLLBACK_VALIDATION_OK`

After apply, the provisional Git filename was reconciled to the exact production migration version without changing the SQL body, then all PR-head executable gates were rerun.

## 6. Canonical review states and shape

TASK-100 preserves the existing storage state family.

Review decisions:

- `APPROVE`
- `ADJUST`
- `REJECT`

Terminal status mapping:

- APPROVE → `APPROVED`
- ADJUST → `ADJUSTED`
- REJECT → `REJECTED`

New shape constraints ensure:

- terminal reviewed rows carry `reviewed_by`, `reviewed_at`, `review_decision`;
- status and decision agree;
- APPROVED / ADJUSTED carry confirmed start/end/minutes;
- REJECTED carries no confirmed time;
- unconfirmed raw states cannot silently carry confirmed fields.

No rename-only migration was introduced.

## 7. Manager authority

New internal validator:

`validate_manager_attendance_review_authority_v1(store_id)`

It requires server truth:

1. authenticated user exists;
2. profile exists;
3. profile status = ACTIVE;
4. role is STORE_MANAGER or OWNER;
5. STORE_MANAGER has canonical store access.

Client-supplied manager identity is never trusted.

Privileges:

- anon: NO
- authenticated: NO
- postgres: YES

It is internal to the operational RPCs.

## 8. Manager review reader

New operational reader:

`list_manager_attendance_review_v1(store_id, from_date, to_date)`

It:

- reuses the Manager authority validator;
- only returns canonical submitted attendance in the requested store/date scope;
- exposes raw planned/actual data plus review/confirmed state needed by Manager UI;
- includes reviewed terminal rows for reload/reconciliation;
- does not expose direct table authority.

Privileges:

- anon: NO
- authenticated: YES
- postgres: YES

## 9. Review mutation

New canonical mutation:

`review_attendance_v1(attendance_id, decision, confirmed_start, confirmed_end)`

At mutation time it:

1. resolves the attendance schedule identity;
2. acquires the same `shift_swap_schedule:<schedule_id>` advisory lock used by Give/Swap/Attendance;
3. row-locks attendance;
4. row-locks official schedule;
5. revalidates Manager role/status/store scope;
6. calls TASK-098 current assignment authority validator for the attendance Employee;
7. confirms schedule identity/store/date/planned-time snapshot has not drifted;
8. confirms the raw attendance submission is valid and reviewable;
9. performs exactly one terminal transition.

This prevents stale browser review and transfer/review split-brain.

## 10. Confirmed work time semantics

### APPROVE

Manager explicitly chooses APPROVE.

Confirmed values are exactly:

- confirmed_start = actual_start
- confirmed_end = actual_end
- confirmed_minutes = exact elapsed minutes

The client cannot supply replacement confirmed times to APPROVE.

### ADJUST

Manager explicitly chooses ADJUST and supplies:

- confirmed_start
- confirmed_end

The server requires:

- both present;
- end > start;
- minute precision.

`confirmed_minutes` is the exact elapsed minute difference.

No rounding, grace period, break deduction, lateness penalty, overtime premium or payroll rule is applied.

### REJECT

Manager explicitly chooses REJECT.

Result:

- status = REJECTED
- reviewer identity/time persisted
- confirmed_start = null
- confirmed_end = null
- confirmed_minutes = null

Therefore rejected raw attendance cannot become confirmed work time.

## 11. Payroll boundary preserved

TASK-100 does not write:

- legacy `hours_worked`;
- legacy `amount`;
- payroll rows;
- wage/rate truth;
- overtime truth;
- settlement/export data.

Confirmed work time is now available for later payroll tasks, but TASK-100 does not consume it into payroll.

## 12. Idempotency and concurrency

Exact terminal retry behavior:

- same APPROVE after APPROVED → returns same canonical truth with `already_reviewed=true`;
- same ADJUST with identical confirmed times after ADJUSTED → same truth;
- same REJECT after REJECTED → same truth.

Conflicting terminal action:

`ATTENDANCE_ALREADY_REVIEWED`

Thus a timeout/double-click cannot double-confirm or rewrite a different terminal decision.

The shared schedule lock plus row locks serialize review against Give/Swap ownership transfer and attendance mutation authority.

## 13. Auditability

Review persists canonical audit fields already added by TASK-098:

- `reviewed_by`
- `reviewed_at`
- `review_decision`

No parallel review audit truth was created.

## 14. Notification semantics

TASK-100 extends the existing attendance notification trigger only for successful confirmed work time.

APPROVED / ADJUSTED transition emits:

- event type: `ATTENDANCE_CONFIRMED`
- stable event key: `attendance:<attendance_id>:confirmed`
- recipient: Employee
- payload: work date, status, confirmed start/end/minutes, store

The event fires only when status changes into APPROVED/ADJUSTED and confirmed fields exist.

Exact retry therefore does not emit a duplicate confirmed event.

No new rejection taxonomy/event was invented.

## 15. Manager UI

Canonical UI:

`05_MANAGER/Workforce/attendance-review-v1.js`

Loaded by:

`05_MANAGER/Workforce/engine-v1.js`

Manager experience includes:

- accessible-store selector;
- current-week navigation;
- loading/error/empty states;
- pending review list;
- planned vs Employee actual comparison;
- explicit APPROVE;
- explicit ADJUST with minute time inputs;
- explicit REJECT;
- reviewed history;
- double-submit prevention;
- server refresh after mutation;
- stale/authority error reconciliation;
- mobile containment;
- no direct attendance/work_schedules table call;
- no service-role credential.

The Manager UI sends only intent/data. Backend remains authority.

## 16. Deterministic coverage

New deterministic suite:

`09_QA/people-shift/manager-attendance-review-v1.test.mjs`

It proves:

- review decision/status shape;
- no parallel confirmed-work-time table;
- ACTIVE Manager + store scope;
- internal authority validator privilege;
- shared Give/Swap lock namespace;
- current schedule/owner revalidation;
- schedule snapshot revalidation;
- APPROVE exact actual-time confirmation;
- ADJUST explicit time confirmation;
- REJECT no confirmed truth;
- minute-precision deterministic calculation;
- no payroll/amount/hours_worked mutation;
- exact retry idempotency;
- conflicting terminal review fail-closed;
- no anon operational RPC;
- fixed search_path;
- direct attendance DML remains revoked;
- stable ATTENDANCE_CONFIRMED event key;
- Manager UI RPC-only boundary.

Final deterministic total:

- TASK-091 Workforce contract: 61/61
- schedule-first compatibility: 9/9
- People Shift deterministic: 81/81
- Control Tower deterministic: 74/74
- **total: 225/225 PASS**

## 17. Browser E2E

Dedicated browser:

`09_QA/people-shift/manager-attendance-review-browser.mjs`

It uses the real TASK-099 Employee Attendance UI plus the new TASK-100 Manager review UI.

Executable scenario proves:

1. Employee submits raw attendance;
2. raw row is SUBMITTED / NEEDS_REVIEW;
3. confirmed fields are absent;
4. Manager queue displays the pending row from canonical reader;
5. Manager double-click APPROVE results in one transition;
6. APPROVE confirms actual 06:10–12:05 = 355 minutes;
7. exact retry returns same truth;
8. conflicting REJECT after APPROVED fails closed;
9. ATTENDANCE_CONFIRMED appears once;
10. Employee refresh sees APPROVED;
11. separate ADJUST confirms 12:20–17:15 = 295 minutes;
12. separate REJECT leaves confirmed fields null;
13. unauthorized Manager fails STORE_NOT_ALLOWED;
14. stale schedule ownership fails ATTENDANCE_NOT_CURRENT_OWNER;
15. raw row remains unchanged on failed review;
16. browser direct table calls = 0;
17. Employee + Manager reload converge to APPROVED / ADJUSTED / REJECTED terminal truth;
18. 390px mobile viewport has no horizontal overflow;
19. page/console/request/5xx errors = 0.

Marker:

`TASK_100_MANAGER_ATTENDANCE_REVIEW=PASS`

## 18. One caught browser defect and repair

Initial branch browser run:

- run: **35750927373**
- job: **106824524716**

All review logic checks passed, but the 390px mobile gate caught horizontal document overflow caused by the reviewed-history table min-width propagating through an unconstrained CSS grid item.

The fix added layout containment only.

No business assertion, security assertion or acceptance threshold was weakened.

Reconciled run after the fix was green, followed by final production-version provenance runs.

## 19. Final PR-head gates

Implementation PR:

**#262 — TASK-100: Manager attendance review and confirmed work time V1**

Final PR head:

`0436b25e6e4f8a5cb3d40b02f3624b0061aaa165`

Final PR-event People Shift:

- run: **35751372880**
- job: **106826077993**
- runtime: **Node v20.20.2**
- deterministic: **225/225 PASS**
- TASK-098 E2E-08: PASS
- TASK-099 Employee Attendance UI: PASS
- TASK-100 Manager Attendance Review: PASS
- Manager Workforce canonical browser: PASS
- People Shift Day-10 browser: PASS
- Control Tower browser: PASS
- failures: **0**

A concurrent final push gate on the same head also succeeded:

- run: **35751435027**
- job: **106826297212**

## 20. Implementation merge

Implementation merge SHA:

`289960e8f9a035334ab2ef5c9b16a9d63f5f1684`

## 21. Exact post-merge gates

Exact implementation-main People Shift:

- run: **35751662491**
- job: **106827084456**
- exact main SHA: `289960e8f9a035334ab2ef5c9b16a9d63f5f1684`
- runtime: **Node v20.20.2**
- deterministic: **225/225 PASS**
- TASK-098: PASS
- TASK-099: PASS
- TASK-100: PASS
- Manager Workforce: PASS
- Day-10 browser: PASS
- Control Tower browser: PASS
- failures: **0**

Exact-main public asset gates:

- Validate MAGASIN GitHub Pages source: run **35751662562**, job **106827084376** — SUCCESS
- Pages build/deployment: run **35751661324**
  - build job **106827090608** — SUCCESS
  - report job **106827191766** — SUCCESS
  - deploy job **106827191998** — SUCCESS

## 22. Final production read-only reconciliation

Final observation:

**2026-09-22 16:06:28 UTC / 23:06:28 ICT**

Observed:

- attendance: **0**
- reviewable NORMAL/NEEDS_REVIEW: **0**
- confirmed APPROVED/ADJUSTED: **0**
- rejected: **0**
- work_schedules: **0**
- active Give: **0**
- active Swap: **0**
- attendance notifications: **0**
- duplicate ATTENDANCE_CONFIRMED event-key groups: **0**

No persistent production Employee, schedule, attendance, review or notification fixture was created.

## 23. Final live privileges

`validate_manager_attendance_review_authority_v1`

- fixed `search_path=public`
- anon: NO
- authenticated: NO
- postgres: YES

`list_manager_attendance_review_v1`

- fixed `search_path=public`
- anon: NO
- authenticated: YES
- postgres: YES

`review_attendance_v1`

- fixed `search_path=public`
- anon: NO
- authenticated: YES
- postgres: YES

`notification_attendance_trigger_v1`

- fixed `search_path=public`
- anon: NO
- authenticated: NO
- postgres: YES

Direct attendance table privileges for anon and authenticated:

- SELECT: NO
- INSERT: NO
- UPDATE: NO
- DELETE: NO

## 24. Security Advisor

Pre-apply baseline:

- RLS-enabled/no-policy INFO: 10 existing unrelated findings;
- mutable search_path WARN: 1 existing unrelated `magasin_normalize_name`;
- anon SECURITY DEFINER executable WARN: 18 existing legacy findings;
- authenticated SECURITY DEFINER executable WARN: 70.

Post-apply:

- RLS-enabled/no-policy remains 10;
- mutable search_path remains 1, no TASK-100 function;
- anon SECURITY DEFINER executable remains 18, no TASK-100 function;
- authenticated SECURITY DEFINER executable becomes 72 because the two intended operational RPCs `list_manager_attendance_review_v1` and `review_attendance_v1` are callable by authenticated users.

Those two RPCs are intentionally SECURITY DEFINER because direct browser table privileges remain revoked. Each performs internal ACTIVE-role/store/current-schedule authorization with fixed `search_path`.

Internal validator and notification trigger are postgres-only.

No TASK-100 anon execution or mutable-search-path regression was introduced.

## 25. Scope boundaries preserved

TASK-100 does **not**:

- calculate payroll;
- create payroll payout/settlement;
- set wages/hourly rate;
- apply overtime premium;
- export salary/timesheet period data;
- turn raw attendance into payroll truth;
- invent attendance deviation threshold;
- invent rounding/grace/break rules;
- change Give CANCELLED/EXPIRED;
- start TASK-101;
- enable Workforce Robot;
- change PFC.

## 26. Canonical handoff

After closure:

- TASK-100 = **DONE**
- E2E-09 = **CLOSED**
- E2E-10 = **CLOSED**
- TASK-101 = **READY / MANUAL_WORK**
- Workforce current task = **TASK-101**
- Workforce next task = **TASK-102**
- Workforce Robot = **DISABLED**
- TASK-101 has **not** been started
- PFC current task = **TASK-068**
- PFC next task = **TASK-069**
- PFC state = **UNCHANGED**

The canonical docs/state closure merge SHA is recorded in the closure PR / Work return because a merge commit cannot self-contain its own future SHA.

## TASK-100 result

**DONE / E2E-09 CLOSED / E2E-10 CLOSED / POST-MERGE GREEN**

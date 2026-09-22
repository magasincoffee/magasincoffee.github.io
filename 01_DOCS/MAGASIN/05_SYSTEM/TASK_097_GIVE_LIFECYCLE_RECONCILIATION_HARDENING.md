# TASK-097 — Give Lifecycle Reconciliation + Hardening

**Track:** WORKFORCE_OPERATIONS_V1  
**Execution mode:** OWNER_DIRECT_TO_WORK / MANUAL_WORK  
**Date:** 2026-09-22  
**Status:** DONE / E2E-07 STRONG / POST-MERGE GREEN  
**E2E-07:** STRONG / CLOSED  
**E2E-08:** PARTIAL / OWNERSHIP SIDE PROVEN ONLY  
**Production migration:** `20260922134157_task_097_give_lifecycle_reconciliation_hardening` — APPLIED  
**Production test-data mutation:** NONE  
**Workforce Robot:** DISABLED  
**PFC cursor mutation:** NONE  
**Next task:** TASK-098 READY / MANUAL_WORK — DO NOT AUTO-RUN

## 1. Five-Step

### QUESTION

TASK-097 began by re-reading the canonical Workforce architecture, TASK-090→TASK-096 evidence, current Give production runbook, Employee/Manager surfaces, source-controlled Give migration, notification outbox, TASK-096 Swap hardening and exact live production definitions.

The current Give implementation was already close to canonical:

```text
PENDING_RECIPIENT
→ PENDING_MANAGER
→ APPROVED + ownership transfer in one transaction
```

Strong primitives already existed:

- dedicated Give table and RPCs;
- recipient consent before Manager action;
- Manager queue on `PENDING_MANAGER`;
- schedule ownership transfer in `approve_shift_give`;
- attendance-presence blocking;
- availability and overlap validation;
- legacy daily/weekly hour caps;
- one-active-Give partial unique index;
- Give notification ordering and idempotent notification event keys.

The live gaps were narrow and concrete:

1. recipient ACTIVE but not explicitly STAFF;
2. giver ACTIVE/STAFF not explicitly enforced by validator;
3. Give only blocked Swap `PENDING`, not TASK-096 `PEER_ACCEPTED`;
4. no canonical resulting max-two-assignments/day check;
5. Give and Swap conflict checks were not serialized on one schedule lock namespace;
6. recipient accept/reject retry had no stable response;
7. Manager second approve had no stable already-applied response/integrity check.

### DELETE

Deleted/prevented from active Give semantics:

- treating ACTIVE as sufficient without STAFF role;
- Give transfer while a Swap is `PEER_ACCEPTED`;
- relying on hour caps as a substitute for max-two/day;
- a submit race where Give and Swap can independently pass conflict checks;
- retry behavior that can create UI retry ambiguity;
- any possibility of a second Manager approval changing ownership again;
- client-only validation as authority.

No historical Give row was deleted, rewritten or renamed.

### SIMPLIFY

Storage mapping remains unchanged:

```text
PENDING_RECIPIENT
= OFFERED / waiting recipient

PENDING_MANAGER
= RECIPIENT_ACCEPTED / waiting Manager

APPROVED
= Manager approval + ownership transfer APPLIED atomically

REJECTED_RECIPIENT
= recipient rejected

REJECTED_MANAGER
= Manager rejected
```

No `MANAGER_APPROVED` intermediate state was introduced.

No rename-only migration was performed.

`CANCELLED` and `EXPIRED` remain future/Owner-undefined semantics and were not added merely to mirror conceptual labels.

### ACCELERATE

Reused:

- `shift_gives`;
- `validate_shift_give_v1`;
- `list_shift_give_candidates_v1`;
- `submit_shift_give_request`;
- `respond_shift_give_request`;
- `list_my_shift_gives_v1`;
- `list_shift_give_requests_v1`;
- `approve_shift_give`;
- `reject_shift_give`;
- `notification_shift_give_trigger_v1`;
- notification outbox/event-key subsystem;
- official `work_schedules` ownership;
- Employee `06_EMPLOYEE/swap/engine-v1.js`;
- Manager `05_MANAGER/Workforce/swap-approval-v1.js`.

No Give V2 engine was created.

### AUTOMATE

Only deterministic safety was strengthened:

- shared per-schedule advisory lock with TASK-096 Swap;
- revalidation at recipient acceptance;
- revalidation immediately before Manager apply;
- ACTIVE STAFF checks;
- active Swap PENDING + PEER_ACCEPTED checks;
- max-two/day resulting-state check;
- stable recipient retry responses;
- stable Manager approval/rejection retry responses;
- exact ownership integrity check on already-approved retry.

No automatic recipient acceptance, Manager approval, cancellation or expiration was created.

---

## 2. Live Give architecture before TASK-097

Live `shift_gives` status CHECK:

- `PENDING_RECIPIENT`
- `PENDING_MANAGER`
- `APPROVED`
- `REJECTED_RECIPIENT`
- `REJECTED_MANAGER`

There was no `cancel_shift_give` function.

Columns already included:

- `giver_id`
- `recipient_id`
- `schedule_id`
- `store_id`
- `reason`
- `status`
- `recipient_responded_at`
- `manager_id`
- `resolved_at`
- `manager_note`
- timestamps.

Active Give uniqueness was already enforced by:

`uq_shift_gives_pending_schedule`

covering:

`PENDING_RECIPIENT + PENDING_MANAGER`

RLS was enabled. The existing SELECT policy allowed giver/recipient, Owner or scoped Store Manager.

Authenticated browser roles had no direct `shift_gives` table grants; canonical mutation already flowed through RPCs.

Notification trigger binding:

- AFTER INSERT
- AFTER UPDATE
- `shift_gives`
- `notification_shift_give_trigger_v1()`

---

## 3. Pre-apply live aggregate audit

Read-only production audit before migration found:

- total `shift_gives`: **0**
- PENDING_RECIPIENT: **0**
- PENDING_MANAGER: **0**
- APPROVED: **0**
- REJECTED_RECIPIENT: **0**
- REJECTED_MANAGER: **0**
- duplicate active Give schedule groups: **0**
- `work_schedules`: **0**
- `attendance`: **0**
- active Swap PENDING: **0**
- active Swap PEER_ACCEPTED: **0**
- SHIFT_GIVE notifications: **0**
- duplicate Give event keys: **0**

The initial aggregate query did not include DB `now()`; the observation occurred before any TASK-097 production mutation in this Work session.

No private Employee name, UUID, HR data or salary data was queried or committed.

---

## 4. Migration and version reconciliation

Canonical production migration:

`20260922134157_task_097_give_lifecycle_reconciliation_hardening`

Canonical Git source:

`07_DATABASE/migrations/20260922134157_task_097_give_lifecycle_reconciliation_hardening.sql`

Before production apply, the exact migration SQL was executed against the live schema inside:

```sql
BEGIN;
-- exact TASK-097 migration body
ROLLBACK;
```

The rollback-only validation completed without persistent mutation.

The migration was then applied only after the first fully green executable branch gate.

Because the Supabase migration API assigned the actual production version `20260922134157`, the pre-apply Git timestamp filename was reconciled to that exact version without changing the SQL body. A fresh branch CI gate was then required and passed on the reconciled filename.

No status CHECK rewrite was required. No historical Give data was rewritten.

---

## 5. ACTIVE STAFF hardening

`validate_shift_give_v1` now independently verifies:

### Giver

- profile exists;
- `status='ACTIVE'`;
- `role='STAFF'`;
- still owns the schedule;
- schedule remains APPROVED.

Fail-closed codes include:

- `GIVER_INACTIVE`
- `GIVER_NOT_STAFF`
- `GIVER_SCHEDULE_NOT_OWNED`
- `SCHEDULE_NOT_APPROVED`

### Recipient

- `status='ACTIVE'`;
- `role='STAFF'`;
- recipient != giver.

Fail-closed codes include:

- `RECIPIENT_INACTIVE`
- `RECIPIENT_NOT_STAFF`
- `SAME_EMPLOYEE_GIVE`

ACTIVE no longer silently implies STAFF.

---

## 6. Active Swap compatibility

TASK-096 made the active Swap lifecycle:

`PENDING + PEER_ACCEPTED`

TASK-097 Give validator now blocks a schedule participating as either Swap side when:

```sql
shift_swaps.status IN ('PENDING','PEER_ACCEPTED')
```

Violation:

`SCHEDULE_HAS_ACTIVE_SWAP`

This closes the integration gap where a peer-accepted Swap could previously coexist with Give validation.

---

## 7. Canonical max-two/day resulting-state proof

Recipient resulting state is computed from:

1. existing official `PENDING/APPROVED` assignments on the Give schedule date;
2. excluding the transferred schedule identity itself;
3. adding exactly one incoming transferred assignment.

If resulting count is >2:

`RECIPIENT_MAX_TWO_ASSIGNMENTS_PER_DAY`

This is independent from and in addition to existing:

- `RECIPIENT_DAILY_HOURS_LIMIT`
- `RECIPIENT_WEEKLY_HOURS_LIMIT`

The established hour caps were preserved; no new hours limit was invented.

---

## 8. Attendance / availability / overlap protection

The hardened validator preserves:

### Attendance

Any non-deleted attendance linked to the schedule:

`ATTENDANCE_ALREADY_EXISTS`

This remains a fail-closed compatibility guard only. TASK-097 does not redesign Attendance.

### Availability

Recipient must have AVAILABLE or PREFERRED coverage for the full assignment:

`RECIPIENT_NOT_AVAILABLE`

Explicit overlapping UNAVAILABLE:

`RECIPIENT_UNAVAILABLE`

`preferred_store_id` is not promoted to a new hard restriction.

### Overlap

Any resulting recipient assignment overlap:

`RECIPIENT_RESULTING_OVERLAP`

---

## 9. Candidate eligibility

`list_shift_give_candidates_v1` now requires:

- caller owns the APPROVED schedule;
- schedule is not already in an active Give;
- candidate is ACTIVE;
- candidate role is STAFF;
- full hardened `validate_shift_give_v1` passes.

Therefore candidate display naturally excludes:

- inactive/non-STAFF users;
- unavailable users;
- explicit UNAVAILABLE conflicts;
- overlap;
- max-two/day failure;
- configured hour-cap failure;
- attendance conflict;
- active Swap PENDING/PEER_ACCEPTED;
- invalid schedule state.

Projection remains operational only.

---

## 10. Submit concurrency and Give↔Swap serialization

`submit_shift_give_request` now acquires:

`pg_advisory_xact_lock(hashtextextended('shift_swap_schedule:' || schedule_id,0))`

This deliberately reuses TASK-096's schedule lock namespace.

Result:

A Give and a Swap touching the same assignment cannot both pass their active-conflict checks concurrently.

Submit also:

- row-locks the schedule;
- verifies current ownership;
- verifies APPROVED state;
- runs full Give validation;
- checks active Give again;
- maps partial-unique-index race to stable `SHIFT_GIVE_ALREADY_PENDING`.

The existing partial unique index remains authoritative for one active Give per schedule.

---

## 11. Recipient response revalidation and retry

`respond_shift_give_request(p_give_id,p_accept)` remains recipient-authoritative.

It verifies:

- authenticated caller;
- exact `recipient_id = auth.uid()`;
- current state;
- schedule lock using the shared Give/Swap namespace;
- current giver ownership;
- schedule APPROVED;
- full hardened validation before ACCEPT.

ACCEPT:

`PENDING_RECIPIENT → PENDING_MANAGER`

REJECT:

`PENDING_RECIPIENT → REJECTED_RECIPIENT`

Stable retries:

- ACCEPT when already PENDING_MANAGER → `already_accepted=true`;
- peer REJECT retry on REJECTED_RECIPIENT → `already_rejected=true`.

No repeated state transition means no duplicate transition notification.

---

## 12. Manager queue

Canonical Manager UI already requested:

`p_status='PENDING_MANAGER'`

and already displayed:

**Người nhận đã đồng ý**

No Manager UI redesign was required.

Raw `PENDING_RECIPIENT` Give is not actionable.

Manager role remains Owner or scoped Store Manager.

---

## 13. Manager approval atomicity and idempotency

`approve_shift_give` now verifies:

- authenticated actor;
- active Owner / Store Manager profile;
- Store Manager store scope;
- Give row locked;
- shared schedule advisory lock;
- schedule row locked;
- recipient consent timestamp exists;
- current giver ownership;
- schedule remains APPROVED;
- full hardened validator passes.

Apply transaction:

```text
lock Give
→ lock shared schedule namespace
→ lock work_schedule
→ validate
→ work_schedule.user_id giver → recipient
→ shift_give PENDING_MANAGER → APPROVED
→ commit
```

If any step fails, the transaction rolls back.

### Critical retry guard

If Give is already APPROVED:

- server verifies schedule owner == intended recipient;
- returns:
  - `status='APPROVED'`
  - `transferred=false`
  - `already_applied=true`

No second ownership update occurs.

If Give says APPROVED but schedule ownership is inconsistent:

`SHIFT_GIVE_APPROVED_OWNERSHIP_MISMATCH`

The server fails closed rather than masking integrity drift.

---

## 14. Manager rejection

Manager rejection remains:

`PENDING_MANAGER → REJECTED_MANAGER`

It requires recipient consent to have existed and does not alter schedule ownership.

Retry on `REJECTED_MANAGER` returns stable:

`already_rejected=true`

APPROVED cannot be rewritten to rejected.

---

## 15. Employee UI

Reused:

`06_EMPLOYEE/swap/engine-v1.js`

No Give engine V2 was created.

Existing giver/recipient controls remain:

- select own approved schedule;
- select eligible recipient;
- required reason;
- submit;
- recipient ACCEPT / REJECT.

Status copy is now explicit:

- PENDING_RECIPIENT → **Chờ người nhận**
- PENDING_MANAGER → **Đã đồng ý nhận ca · Chờ quản lý duyệt**
- APPROVED → **Đã duyệt**

Employee browser still never calls Manager approval RPC.

The same existing Employee refresh path rehydrates official schedule ownership after transfer.

---

## 16. Notification lifecycle / idempotency

No notification trigger rewrite was required because the existing state-transition trigger already matches canonical ordering.

### OFFERED

PENDING_RECIPIENT INSERT:

- `SHIFT_GIVE_REQUESTED` → recipient

### RECIPIENT ACCEPTED

PENDING_MANAGER transition:

- `SHIFT_GIVE_RECIPIENT_ACCEPTED` → giver
- `SHIFT_GIVE_MANAGER_REVIEW` → Store Manager audience

### RECIPIENT REJECTED

- `SHIFT_GIVE_RECIPIENT_REJECTED` → giver

### MANAGER APPROVED/APPLIED

- `SHIFT_GIVE_APPROVED` → giver
- `SHIFT_GIVE_APPROVED` → recipient

### MANAGER REJECTED

- `SHIFT_GIVE_REJECTED_MANAGER` → giver
- `SHIFT_GIVE_REJECTED_MANAGER` → recipient

The work_schedule ownership trigger continues to emit useful:

- `SCHEDULE_TRANSFERRED_OUT`
- `SCHEDULE_TRANSFERRED_IN`

Stable event keys and the notification outbox upsert make retries idempotent.

---

## 17. E2E-07 — Give Full Lifecycle

Dedicated multi-role browser/server fixture:

`09_QA/people-shift/shift-give-lifecycle-fixture.html`

Browser:

`09_QA/people-shift/shift-give-lifecycle-browser.mjs`

The scenario uses the real canonical Employee Give engine and real Manager shift-change approval engine against one deterministic shared backend fixture.

Happy path proves:

1. Employee A owns APPROVED assignment X.
2. A opens Give.
3. B is an eligible recipient.
4. A enters required reason.
5. A submits.
6. Give = PENDING_RECIPIENT.
7. ownership remains A.
8. Manager queue has zero actionable Give.
9. browser reloads as B.
10. B sees incoming Give.
11. B accepts.
12. Give = PENDING_MANAGER.
13. A sees accepted/waiting Manager.
14. Manager review event exists once.
15. Manager sees Give only after recipient consent.
16. Manager approves.
17. server revalidates.
18. schedule ownership changes A → B.
19. Give = APPROVED/APPLIED.
20. old owner refresh no longer sees assignment.
21. new owner refresh sees the same schedule_id.
22. Manager approve retry does not transfer again.
23. notification order is correct.
24. reload preserves APPROVED + new ownership.
25. browser uses RPC-only canonical mutation.
26. zero page errors.
27. zero console errors.
28. zero unexpected request failures.
29. zero HTTP 5xx.

### Negative matrix

Proven cases include:

- wrong recipient cannot accept;
- giver cannot self-act as recipient;
- Manager cannot approve before recipient acceptance;
- recipient rejection blocks Manager approval;
- recipient inactive;
- recipient non-STAFF;
- giver inactive;
- giver non-STAFF;
- attendance exists;
- missing availability;
- explicit UNAVAILABLE;
- resulting overlap;
- resulting >2 assignments/day;
- configured daily-hours cap;
- configured weekly-hours cap;
- active Swap PENDING;
- active Swap PEER_ACCEPTED;
- recipient = giver;
- duplicate active Give;
- stale giver ownership;
- schedule becomes non-APPROVED;
- Manager outside store scope;
- nonexistent schedule.

### First final-gate failure and root cause

Run `35734613166` / job `106768536167` failed only in the new E2E-07 harness.

Root cause:

Playwright `locator.waitFor()` defaults to visible-state semantics, while HTML `<option>` nodes existed correctly but are not independently considered visible.

Business/server behavior, ownership transfer, notification ordering and the negative matrix were otherwise passing.

Fix:

- wait for the parent `<select>`;
- assert option existence/count/value instead of option visibility.

No business rule, validator or guardrail was weakened.

---

## 18. E2E-08 contribution

TASK-097 proves the ownership side only:

```text
Before Give apply:
schedule_id X owner = A

After Give apply:
same schedule_id X owner = B
```

The E2E-07 browser verifies:

- A refresh no longer exposes X;
- B refresh exposes the same X;
- reload preserves B as owner.

Therefore:

**E2E-08 = PARTIAL / OWNERSHIP SIDE PROVEN**

TASK-097 does **not** claim old/new owner Attendance authorization. That belongs to TASK-098+.

---

## 19. Branch QA gates

### First fully green executable gate before production apply

Head:

`a152ce5f9c772e5a3094cc629493c5d947737de2`

People Shift:

- run **35734881103**
- job **106769455814**
- Node **v20.20.2**
- TASK-091 contract: **61/61 PASS**
- Schedule-first + published feedback: **9/9 PASS**
- People Shift deterministic: **64/64 PASS**
- Control Tower deterministic: **74/74 PASS**
- deterministic total: **208/208 PASS**
- browser suites: **11/11 PASS**
- E2E-07: **PASS**
- failures: **0**

Production migration was applied only after this green gate.

### Migration-version reconciled final executable gate

Final executable head:

`d2f5819d4506552d3b4d158b9be384ff9a4575a5`

The only executable difference from the prior green head was migration filename reconciliation to exact production version; SQL body was unchanged.

Fresh People Shift:

- run **35735519401**
- job **106771635651**
- Node **v20.20.2**
- TASK-091 contract: **61/61 PASS**
- Schedule-first + published feedback: **9/9 PASS**
- People Shift deterministic: **64/64 PASS**
- Control Tower deterministic: **74/74 PASS**
- deterministic total: **208/208 PASS**
- browser suites: **11/11 PASS**
- E2E-07: **PASS**
- failures: **0**

Browser markers:

1. Employee Swap
2. Employee Give legacy regression
3. TASK-096 Swap full lifecycle
4. TASK-097 Give full lifecycle
5. Employee notification
6. TASK-095 published weekly schedule
7. Employee availability
8. current Employee attendance regression
9. Manager Workforce
10. People Shift Day-10
11. Control Tower

---

## 20. Post-apply live audit

Read-only observation:

**2026-09-22 20:42:19 ICT**  
(**2026-09-22 13:42:19 UTC**)

Observed:

- Give rows: **0**
- PENDING_RECIPIENT: **0**
- PENDING_MANAGER: **0**
- APPROVED: **0**
- work_schedules: **0**
- attendance rows: **0**
- active Swap PENDING: **0**
- active Swap PEER_ACCEPTED: **0**
- SHIFT_GIVE notifications: **0**
- duplicate Give event keys: **0**
- duplicate active Give schedule groups: **0**

No production test row was created.

---

## 21. Exact source/live reconciliation

After production apply and migration-filename reconciliation:

All **6 changed TASK-097 function bodies** exact-match canonical Git migration source:

1. `validate_shift_give_v1`
2. `list_shift_give_candidates_v1`
3. `submit_shift_give_request`
4. `respond_shift_give_request`
5. `approve_shift_give`
6. `reject_shift_give`

Every changed function is:

- `SECURITY DEFINER`;
- fixed `search_path=public`.

Grant boundary:

- validator: postgres only;
- Employee/Manager operational RPCs: authenticated + postgres;
- no changed TASK-097 function is anon executable;
- notification Give trigger remains postgres only.

`trg_notification_shift_gives` remains bound AFTER INSERT/UPDATE to `notification_shift_give_trigger_v1()`.

---

## 22. Security Advisor

Post-apply Security Advisor counts:

- `rls_enabled_no_policy`: 10 INFO
- `function_search_path_mutable`: 1 WARN
- `anon_security_definer_function_executable`: 19 WARN
- `authenticated_security_definer_function_executable`: 70 WARN
- `auth_leaked_password_protection`: 1 WARN

TASK-097 findings:

- **0 anon-executable changed TASK-097 functions**
- **0 mutable-search-path changed TASK-097 functions**

The generic authenticated SECURITY DEFINER advisor flags the intentionally authenticated API surfaces:

- `list_shift_give_candidates_v1`
- `submit_shift_give_request`
- `respond_shift_give_request`
- `approve_shift_give`
- `reject_shift_give`

These are intentional browser/API entrypoints and contain internal authentication, ownership, role/state/store-scope validation.

`validate_shift_give_v1` remains postgres-only.

Unrelated pre-existing advisor findings remain outside TASK-097.

---

## 23. Files changed before PR

Executable/source:

1. `07_DATABASE/migrations/20260922134157_task_097_give_lifecycle_reconciliation_hardening.sql`
2. `06_EMPLOYEE/swap/engine-v1.js`
3. `09_QA/people-shift/give-lifecycle-v1.test.mjs`
4. `09_QA/people-shift/shift-give-lifecycle-fixture.html`
5. `09_QA/people-shift/shift-give-lifecycle-browser.mjs`
6. `.github/workflows/people-shift-tests.yml`

Evidence:

7. `01_DOCS/MAGASIN/05_SYSTEM/TASK_097_GIVE_LIFECYCLE_RECONCILIATION_HARDENING.md`

Manager runtime code required no change because it already had the correct `PENDING_MANAGER` queue and recipient-consent wording.

No generated QA artifact, production UUID, private Employee record, HR field, salary, token or service-role secret is committed.

---

## 24. Remaining semantic boundaries

### CANCELLED

No current Give cancellation primitive exists and Owner has not defined its transition timing.

TASK-097 does not invent cancellation semantics.

### EXPIRED

No expiration duration/cutoff is Owner-defined.

TASK-097 does not create a timer, cron or expiration rule.

### Attendance authority

Give ownership projection is proven.

Manual-Time Attendance authorization remains TASK-098+ and E2E-08 is not overclaimed.

---

## 25. Production safety

Confirmed:

- no fake Employee;
- no fake Give;
- no fake work_schedule;
- no fake attendance;
- no fake notification;
- no historical Give rewrite;
- no destructive cleanup;
- no private identity committed;
- no salary/HR data committed;
- no secret committed;
- no TASK-098 implementation;
- no PFC cursor mutation;
- Workforce Robot remains disabled.

---

## 26. Final PR / exact post-merge gates

Implementation PR:

**#255 — TASK-097: Give lifecycle reconciliation and hardening**

Final executable head:

`d2f5819d4506552d3b4d158b9be384ff9a4575a5`

Final PR head:

`bbc24e7dca05c6a33c5ca95e732a00bcc5e17a86`

The commit after the executable head adds only TASK-097 evidence Markdown. No executable source, migration, workflow, fixture or test changed.

### PR-head People Shift

- run: **35735967911**
- job: **106773167923**
- runtime: **Node v20.20.2**
- TASK-091 Workforce contract: **61/61 PASS**
- Schedule-first + Published Schedule Feedback: **9/9 PASS**
- People Shift deterministic: **64/64 PASS**
- Control Tower deterministic: **74/74 PASS**
- deterministic total: **208/208 PASS**
- browser suites/markers: **11/11 PASS**
- TASK-097 Give lifecycle browser: **PASS**
- failures: **0**

### Merge

Merge SHA:

`4cf2d5c9ac07806be1c6748b2e992d7ea8201a7b`

Exact post-merge People Shift:

- run: **35736247975**
- job: **106774124118**
- exact main SHA: `4cf2d5c9ac07806be1c6748b2e992d7ea8201a7b`
- runtime: **Node v20.20.2**
- TASK-091 Workforce contract: **61/61 PASS**
- Schedule-first + Published Schedule Feedback: **9/9 PASS**
- People Shift deterministic: **64/64 PASS**
- Control Tower deterministic: **74/74 PASS**
- deterministic total: **208/208 PASS**
- browser suites/markers: **11/11 PASS**
- TASK-097 Give lifecycle browser: **PASS**
- failures: **0**

Exact-merge collateral workflows:

- Validate MAGASIN GitHub Pages source: run **35736248255** — SUCCESS
- Pages build and deployment: run **35736245765** — SUCCESS

No exact-main failure required repair.

---

## 27. Final post-merge live reconciliation

Read-only observation:

**2026-09-22 20:53:04 ICT**  
(**2026-09-22 13:53:04 UTC**)

Observed:

- Give rows: **0**
- PENDING_RECIPIENT: **0**
- PENDING_MANAGER: **0**
- APPROVED: **0**
- work_schedules: **0**
- attendance rows: **0**
- active Swap PENDING: **0**
- active Swap PEER_ACCEPTED: **0**
- SHIFT_GIVE notifications: **0**
- duplicate Give event keys: **0**
- duplicate active Give schedule groups: **0**

Migration remains present:

`20260922134157_task_097_give_lifecycle_reconciliation_hardening`

All **6 changed TASK-097 function bodies** exact-match the migration on exact merged main:

1. `validate_shift_give_v1`
2. `list_shift_give_candidates_v1`
3. `submit_shift_give_request`
4. `respond_shift_give_request`
5. `approve_shift_give`
6. `reject_shift_give`

Every changed function remains `SECURITY DEFINER` with fixed `search_path=public`.

Grant boundary remains:

- validator: postgres only;
- Give notification trigger: postgres only;
- operational Employee/Manager Give RPCs: authenticated + postgres;
- no changed TASK-097 function is anon executable.

Security Advisor remains:

- `rls_enabled_no_policy`: 10 INFO
- `function_search_path_mutable`: 1 WARN
- `anon_security_definer_function_executable`: 19 WARN
- `authenticated_security_definer_function_executable`: 70 WARN
- `auth_leaked_password_protection`: 1 WARN

The authenticated TASK-097 findings are the intentional operational SECURITY DEFINER RPC surfaces and remain bounded by internal auth/ownership/role/store-scope validation. No TASK-097 function appears in anon-executable or mutable-search-path findings.

No production row was inserted, updated or deleted during final reconciliation.

---

## 28. Final source-of-truth handoff

TASK-097 Definition of Done is satisfied:

1. Give still follows recipient accepts THEN Manager approves.
2. Manager cannot approve before recipient consent.
3. giver and recipient must remain ACTIVE STAFF.
4. Give blocks active Swap PENDING + PEER_ACCEPTED.
5. attendance conflict blocks.
6. availability mismatch blocks.
7. explicit UNAVAILABLE blocks.
8. resulting overlap blocks.
9. resulting >2 assignments/day blocks.
10. established daily/weekly hour caps remain enforced.
11. duplicate active Give is prevented.
12. candidate list matches hardened server eligibility.
13. recipient response revalidates current truth.
14. Manager approval revalidates immediately before transfer.
15. ownership transfer A→B remains atomic.
16. repeated Manager approval cannot transfer twice.
17. old Employee schedule projection loses the assignment.
18. new Employee schedule projection gains the same schedule_id.
19. notifications follow recipient-first lifecycle.
20. retry does not duplicate Manager/approval notification event keys.
21. E2E-07 is STRONG / CLOSED.
22. E2E-08 is PARTIAL / OWNERSHIP SIDE PROVEN and not overclaimed.
23. E2E-01→06 regressions remain green.
24. Swap regression remains green.
25. current Attendance regression remains green.
26. PR-head CI is green.
27. merge is complete.
28. exact post-merge CI is green.
29. final evidence is complete.

Known unresolved semantics remain intentionally outside TASK-097:

- Give CANCELLED transition timing is Owner-undefined;
- Give EXPIRED duration/cutoff is Owner-undefined;
- old/new owner Manual-Time Attendance authority belongs TASK-098+;
- E2E-08 remains partial until Attendance migration closes that side.

Canonical handoff after docs/state closure merges:

- TASK-097 = **DONE**
- TASK-098 = **READY / MANUAL_WORK**
- Workforce current task = **TASK-098**
- Workforce next task = **TASK-099**
- Workforce Robot = **DISABLED**
- PFC current task = **TASK-068**
- PFC next task = **TASK-069**
- PFC state = **UNCHANGED**
- TASK-098 has **not** been started

## TASK-097 result

**DONE / E2E-07 STRONG / POST-MERGE GREEN**

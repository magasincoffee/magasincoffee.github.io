# TASK-096 — Swap Lifecycle Reconciliation + Hardening

**Track:** WORKFORCE_OPERATIONS_V1  
**Execution mode:** OWNER_DIRECT_TO_WORK / MANUAL_WORK  
**Date:** 2026-09-22  
**Status:** PENDING_FINAL_GATE  
**E2E-06:** STRONG on final branch gate  
**Production migration:** `20260922124821_task_096_swap_lifecycle_reconciliation_hardening` — APPLIED  
**Production test-data mutation:** NONE  
**Workforce Robot:** DISABLED  
**PFC cursor mutation:** NONE  
**Next task:** TASK-097 remains STAGED until TASK-096 full PR/merge/post-merge closure

## 1. Five-Step

### QUESTION

TASK-096 started by inspecting the exact live Swap schema, RPCs, trigger, indexes, RLS, grants and aggregate production state.

The existing Swap implementation already had strong reusable primitives:

- requester owns requester schedule;
- both schedules must be APPROVED;
- employees must differ and remain ACTIVE;
- same-store / same-date compatibility restriction;
- attendance conflict;
- active Give conflict;
- availability compatibility;
- resulting overlap validation;
- legacy daily/weekly hour-cap validation;
- Manager/Owner store-scope enforcement;
- deterministic row-lock order;
- atomic two-schedule ownership exchange;
- final Swap status update in the same transaction.

The missing canonical gap was not the atomic swap. It was the **peer-accept stage** and the resulting lifecycle authority.

### DELETE

Deleted from active canonical Swap semantics:

- Manager approval directly from raw `PENDING`;
- Manager notification immediately on requester submit;
- target Employee as notification-only participant;
- ambiguous PENDING UI;
- client-only/fake peer acceptance;
- approval without final server revalidation;
- duplicate active Swap requests across REQUESTED/peer-accepted stages;
- double Manager approval that could ever reapply ownership exchange.

No historical Swap row was deleted or rewritten.

### SIMPLIFY

Minimal canonical storage mapping:

```text
PENDING
= canonical REQUESTED / waiting target Employee

PEER_ACCEPTED
= target Employee accepted / waiting Manager

APPROVED
= Manager approved + ownership exchange APPLIED atomically

REJECTED
= peer rejection or Manager rejection
  (approver_id / peer_responded_at distinguish resolution source)

CANCELLED
= requester cancelled before peer acceptance
```

No separate `MANAGER_APPROVED` database state was created because Manager approval and APPLIED ownership exchange occur atomically.

`EXPIRED` remains future/Owner-undefined and is not invented.

### ACCELERATE

Reused:

- `shift_swaps`;
- `validate_shift_swap_v1`;
- `list_shift_swap_candidates_v1`;
- `submit_shift_swap_request`;
- `list_my_shift_swaps_v2`;
- `list_shift_swap_requests_v1`;
- `approve_shift_swap`;
- `reject_shift_swap`;
- `cancel_shift_swap`;
- notification outbox/event-key subsystem;
- work_schedule ownership transfer trigger;
- Employee Swap engine;
- Manager Swap approval engine.

Only the missing server state/authority/read model and targeted hardening were added.

### AUTOMATE

Automation remains deterministic safety only:

- serialize submit/peer/apply by schedule advisory locks;
- reject stale ownership;
- revalidate at peer acceptance;
- revalidate again immediately before Manager apply;
- unique active Swap guards across PENDING + PEER_ACCEPTED;
- notification event-key idempotency;
- stable already-accepted / already-applied retry responses.

No automatic peer acceptance, Manager approval or expiration rule was added.

---

## 2. Live architecture before TASK-096

Read-only production inventory proved the pre-TASK-096 status constraint:

```text
PENDING
APPROVED
CANCELLED
REJECTED
```

Pre-task lifecycle:

```text
submit_shift_swap_request
→ PENDING
→ Manager approve_shift_swap
→ atomic work_schedule ownership exchange
→ APPROVED
```

There was no target Employee response RPC.

`list_my_shift_swaps_v2` projected requester history only.

Manager reader defaulted to PENDING and active Manager UI requested PENDING.

Notification trigger on INSERT/PENDING:

1. notified target Employee;
2. notified Manager immediately.

That behavior violated the canonical peer-first lifecycle.

---

## 3. Live aggregate audit before production migration

Read-only pre-apply observation:

**2026-09-22 19:48:06 ICT**  
(**2026-09-22 12:48:06 UTC**)

Observed:

- total `shift_swaps`: **0**
- PENDING swaps: **0**
- PEER_ACCEPTED swaps: **0**
- schedules involved in multiple active Swaps: **0**
- `work_schedules`: **0**
- active Gives: **0**

Earlier inventory also confirmed:

- target_user_id null legacy rows: **0**
- missing requester/target schedule refs: **0**
- active attendance-conflict Swap rows: **0**
- active Give-conflict Swap rows: **0**

No private Employee record/UUID/name was read or committed.

Because there were zero Swap rows, adding PEER_ACCEPTED to the status CHECK and replacing active partial indexes required no historical cleanup or rewrite.

---

## 4. Migration

Applied migration:

`20260922124821_task_096_swap_lifecycle_reconciliation_hardening`

Canonical Git source:

`07_DATABASE/migrations/20260922124821_task_096_swap_lifecycle_reconciliation_hardening.sql`

Before apply, the SQL was executed inside:

```sql
BEGIN;
-- exact migration
ROLLBACK;
```

against the live production schema and completed successfully with no persistent mutation.

The migration was then applied through the migration API.

### Additive schema

Added:

`shift_swaps.peer_responded_at timestamptz NULL`

Expanded existing status CHECK to preserve every historical status plus:

`PEER_ACCEPTED`

No existing status was removed.

### Active Swap indexes

Old PENDING-only unique indexes were replaced with:

- `uq_shift_swaps_active_requester_schedule`
- `uq_shift_swaps_active_target_schedule`

Both cover:

`status IN ('PENDING','PEER_ACCEPTED')`

Additional target read index:

`idx_shift_swaps_target_user_status`

The server RPC additionally performs a cross-role active-conflict query because separate requester/target partial indexes alone do not prevent one schedule from being requester-side in one active Swap and target-side in another.

Authenticated browser roles no longer receive direct canonical-table DML privileges on `shift_swaps`; Swap mutations are RPC-only.

---

## 5. Canonical peer acceptance

New server authority:

`respond_shift_swap_request(p_swap_id, p_accept)`

Server verifies:

- authenticated caller;
- caller is exactly `target_user_id`;
- request remains PENDING;
- both schedule references exist;
- requester still owns requester schedule;
- target still owns target schedule;
- both remain APPROVED;
- deterministic advisory/row locks;
- full Swap validation before acceptance;
- no competing active Swap.

ACCEPT:

`PENDING → PEER_ACCEPTED`

and records `peer_responded_at`.

REJECT:

`PENDING → REJECTED`

and records peer response.

Retry semantics:

- repeated ACCEPT on PEER_ACCEPTED → `already_accepted=true`;
- repeated peer REJECT on peer-rejected terminal → `already_rejected=true`;
- requester cannot self-accept;
- Manager cannot impersonate peer acceptance.

---

## 6. Incoming Employee read model

New permissioned reader:

`list_my_incoming_shift_swaps_v1()`

Authority:

`where shift_swaps.target_user_id = auth.uid()`

Projection is operational only:

- request ID;
- status;
- reason;
- requested/peer-response timestamps;
- store display;
- requester display name;
- requester/target schedule IDs;
- requester/target date/time.

It does not expose phone, salary, pay rate, access scope or unrelated profile/history fields.

Employee browser continues to use RPCs; there is no direct `shift_swaps` table read/write.

---

## 7. Employee UI

Reused:

`06_EMPLOYEE/swap/engine-v1.js`

No swap-v2 engine was created.

Requester status copy:

- PENDING → **Chờ người kia đồng ý**
- PEER_ACCEPTED → **Người kia đã đồng ý · Chờ quản lý**

Target Employee now sees incoming Swap:

`[Requester] wants to swap ... with your shift`

Actions:

- **Từ chối**
- **Đồng ý đổi ca**

After acceptance:

**Đã đồng ý · Chờ quản lý duyệt**

Employee UI calls `respond_shift_swap_request`; it never calls Manager approval RPC.

The public Employee Swap refresh path now reloads own official schedules as well as history so ownership changes appear in the same existing surface after apply.

---

## 8. Manager queue

Reused:

`05_MANAGER/Workforce/swap-approval-v1.js`

Canonical active Manager query now requests:

`p_status='PEER_ACCEPTED'`

Raw PENDING/REQUESTED Swaps are not actionable in Manager UI.

Server approval independently enforces:

`status = PEER_ACCEPTED`

so manually invoking Manager approval before peer acceptance also fails closed.

Manager UI explicitly shows:

**Người nhận đã đồng ý**

before approval controls.

Give lifecycle remains unchanged and continues to use `PENDING_MANAGER`.

---

## 9. Validation matrix

`validate_shift_swap_v1` preserves existing rules and adds canonical resulting-state max-two/day.

| Invariant | Result |
|---|---|
| requester owns requester schedule | enforced |
| target schedule exists | enforced |
| both official schedules APPROVED | enforced |
| employees differ | enforced |
| requester ACTIVE | enforced |
| target ACTIVE | enforced |
| requester/target STAFF | enforced |
| same store compatibility | fail closed |
| same date compatibility | fail closed |
| attendance exists on either assignment | rejected |
| active Give on either assignment | rejected |
| requester availability covers resulting target shift | enforced |
| target availability covers resulting requester shift | enforced |
| UNAVAILABLE overlap | rejected |
| requester resulting overlap | rejected |
| target resulting overlap | rejected |
| requester resulting assignments/day >2 | rejected |
| target resulting assignments/day >2 | rejected |
| legacy configured daily hour caps | preserved |
| legacy configured weekly hour caps | preserved |

### Max-two/day proof

For each resulting Employee state, the validator:

1. counts effective PENDING/APPROVED schedules on the resulting work date;
2. excludes both schedules being exchanged;
3. adds exactly the one incoming exchanged assignment;
4. rejects when resulting count > 2.

The two exchange rows are therefore not double-counted.

---

## 10. Submit concurrency

`submit_shift_swap_request` now:

- requires auth + reason + both schedule IDs;
- acquires schedule advisory locks in deterministic UUID order;
- row-locks both official schedules;
- validates current requester ownership;
- runs canonical Swap validator;
- searches conflicts across both requester and target columns for both active statuses;
- inserts PENDING only after all checks;
- maps unique-index race to `SHIFT_SWAP_ALREADY_ACTIVE`.

This prevents uncontrolled duplicate active Swap creation under retry/concurrency.

---

## 11. Manager apply atomicity and idempotency

Existing two-schedule row-lock/atomic exchange is reused and elevated.

First apply requires:

`PEER_ACCEPTED`

Immediately before mutation it verifies:

- active authorized Manager/Owner;
- store scope;
- schedule references;
- current requester ownership;
- current target ownership;
- full canonical validation;
- no competing active Swap.

Transaction order:

```text
lock Swap
→ lock both work_schedules
→ validate
→ update schedule X user_id
→ update schedule Y user_id
→ update Swap PEER_ACCEPTED → APPROVED
→ commit
```

No final status is written before both ownership updates.

### Critical double-approval guard

If Swap is already APPROVED:

```json
{
  "status": "APPROVED",
  "swapped": false,
  "already_applied": true
}
```

No schedule row is changed.

This explicitly proves a second Manager approval can never swap ownership back.

---

## 12. Cancel/reject semantics

Requester cancellation remains intentionally narrow:

- PENDING → CANCELLED;
- retry on CANCELLED → stable `already_cancelled=true`;
- cancellation after PEER_ACCEPTED → fail closed;
- cancellation after terminal/apply → fail closed.

Manager rejection:

- only PEER_ACCEPTED is actionable;
- Manager rejection → REJECTED;
- retry on terminal REJECTED → stable result.

No new broad cancellation policy was invented.

`EXPIRED` remains unresolved because no expiration duration/cutoff is Owner-defined.

---

## 13. Notifications

Existing notification outbox/event-key upsert is reused.

### REQUESTED

PENDING INSERT:

- target Employee receives `SHIFT_SWAP_REQUESTED`;
- **Manager receives nothing yet**.

### PEER_ACCEPTED

Transition to PEER_ACCEPTED:

- requester receives `SHIFT_SWAP_PEER_ACCEPTED`;
- Store Manager audience receives `SHIFT_SWAP_MANAGER_REVIEW`.

### PEER REJECTED

Requester receives:

`SHIFT_SWAP_PEER_REJECTED`

### MANAGER REJECTED

Both relevant Employees receive:

`SHIFT_SWAP_REJECTED`

### APPROVED/APPLIED

Both relevant Employees receive:

`SHIFT_SWAP_APPROVED`

The existing work_schedule ownership trigger remains active, so useful:

- `SCHEDULE_TRANSFERRED_OUT`
- `SCHEDULE_TRANSFERRED_IN`

events are preserved.

Stable event keys make retry/upsert notification delivery idempotent.

Manager review notification key:

`swap:<swap_id>:manager_review`

is only produced after peer acceptance.

---

## 14. Trigger/RLS/grant verification after apply

`trg_notification_shift_swaps` remains bound:

- AFTER INSERT;
- AFTER UPDATE;
- table: `shift_swaps`;
- function: `notification_shift_swap_trigger_v1()`.

RLS remains enabled on `shift_swaps`.

Existing policies remain source-compatible, but authenticated browser roles no longer have direct table DML grants, so canonical browser access is via permissioned RPCs.

Exact post-apply routine privileges:

- validator: postgres only;
- notification trigger: postgres only;
- Employee/Manager operational RPCs: authenticated + postgres;
- no anon execution on changed/new TASK-096 RPCs;
- no PUBLIC mutation access.

Every changed/new TASK-096 function is `SECURITY DEFINER` with fixed:

`search_path=public`

and validates caller authority inside the function.

---

## 15. Security Advisor disposition

Post-migration Security Advisor summary:

- `rls_enabled_no_policy`: 10 INFO
- `function_search_path_mutable`: 1 WARN
- `anon_security_definer_function_executable`: 19 WARN
- `authenticated_security_definer_function_executable`: 70 WARN
- `auth_leaked_password_protection`: 1 WARN

TASK-096 introduced two intentionally authenticated per-user API functions:

- `list_my_incoming_shift_swaps_v1`
- `respond_shift_swap_request`

They are flagged by the generic authenticated SECURITY DEFINER advisor because authenticated EXECUTE is intentional. Both are fixed-search-path and internally auth/target scoped.

No TASK-096 function is anon executable.

The pre-existing legacy `get_my_shift_swaps()` remains flagged for anon/authenticated SECURITY DEFINER execution; it is not used by the canonical V1 Employee Swap engine and remains out of TASK-096 scope.

Other pre-existing authenticated Swap RPC advisor findings remain intentional canonical API surfaces with internal role/ownership validation.

TASK-096 did not widen grants to fix unrelated advisor findings.

---

## 16. Exact source/live drift verification

After apply, live `pg_proc.prosrc` was compared against the exact migration bodies in Git.

Exact body match = **TRUE** for:

1. `validate_shift_swap_v1`
2. `list_shift_swap_candidates_v1`
3. `submit_shift_swap_request`
4. `list_my_incoming_shift_swaps_v1`
5. `respond_shift_swap_request`
6. `approve_shift_swap`
7. `reject_shift_swap`
8. `cancel_shift_swap`
9. `notification_shift_swap_trigger_v1`

Migration history contains exact version:

`20260922124821`

No live/source function drift exists at this checkpoint.

---

## 17. Post-apply live aggregate audit

Read-only observation:

**2026-09-22 19:50:02 ICT**  
(**2026-09-22 12:50:02 UTC**)

Observed:

- total Swap rows: **0**
- PENDING: **0**
- PEER_ACCEPTED: **0**
- APPROVED: **0**
- REJECTED: **0**
- CANCELLED: **0**
- schedules in multiple active Swaps: **0**
- `work_schedules`: **0**
- Swap notification rows: **0**
- duplicate Swap notification event-key groups: **0**

No fake production Swap, schedule, attendance, Give or notification row was created.

The migration changed schema/functions only.

---

## 18. E2E-06 — Full Swap lifecycle

Dedicated multi-role deterministic browser:

`09_QA/people-shift/shift-swap-lifecycle-browser.mjs`

Fixture uses the actual canonical:

- Employee Swap engine;
- Manager Swap approval engine;

against a sanitized shared deterministic server-contract mock.

### Happy path PASS

1. Employee A owns approved assignment A.
2. Employee B owns approved assignment B.
3. A submits Swap with required reason.
4. state = PENDING/REQUESTED.
5. Manager queue contains no actionable raw PENDING Swap.
6. B sees incoming Swap.
7. B accepts.
8. state = PEER_ACCEPTED.
9. peer-accept retry returns already accepted.
10. Manager review notification exists exactly once.
11. A sees peer accepted / waiting Manager.
12. Manager sees only PEER_ACCEPTED request.
13. Manager approves.
14. server revalidates.
15. assignment A owner becomes B.
16. assignment B owner becomes A.
17. atomic apply count = 1.
18. second Manager approval returns already applied.
19. second approval does not swap ownership back.
20. A official schedule source refreshes to B's old assignment.
21. B official schedule source refreshes to A's old assignment.
22. old ownership is absent.
23. peer-first notifications are ordered.
24. schedule transfer notifications are preserved.
25. reload preserves APPROVED history and swapped ownership.
26. public Employee refresh rehydrates current owner schedule after reload.
27. no direct protected-table browser mutation.
28. page errors = 0.
29. console errors = 0.
30. unexpected request failures = 0.
31. HTTP 5xx = 0.

### Negative matrix PASS

- non-target requester cannot accept;
- Manager cannot approve before peer acceptance;
- peer rejection prevents Manager apply;
- cancelled request cannot be accepted;
- stale requester ownership fails;
- inactive requester fails;
- inactive target fails;
- attendance conflict fails;
- active Give conflict fails;
- resulting overlap fails;
- resulting >2/day fails;
- availability mismatch fails;
- duplicate active Swap fails;
- nonexistent schedule fails closed;
- Manager outside store scope fails.

### Browser harness corrections during implementation

The first final-head E2E attempt exposed a test-harness issue: Playwright's default `waitFor()` requires visibility for `<option>` nodes, while valid SELECT options are layout-hidden. Assertions were changed to `state:'attached'`; ownership assertions were not removed.

The second attempt proved current ownership refresh but revealed reload was incorrectly expecting the lazy Swap form selector to auto-open. The final reload assertion now proves:

- history auto-loads APPROVED state immediately after reload;
- persisted backend ownership is correct;
- public Swap refresh rehydrates the current owner's schedule source.

No business or server guardrail was weakened.

---

## 19. Final branch gate before PR

Final branch head at exact migration filename checkpoint:

`3ea9e0fd100f90851b89d0348d5a95040640482f`

People Shift push:

- run: **35729475503**
- job: **106751181938**
- runtime: **Node v20.20.2**
- TASK-091 Workforce contract: **61/61 PASS**
- Schedule-first + published feedback: **9/9 PASS**
- People Shift deterministic: **53/53 PASS**
- Control Tower deterministic: **74/74 PASS**
- deterministic total: **197/197 PASS**
- browser suites/markers: **10/10 PASS**
- E2E-06 dedicated Swap lifecycle: **PASS**
- failures: **0**

Browser suites:

1. Employee Swap
2. Employee Give
3. TASK-096 Swap lifecycle
4. Employee notification
5. TASK-095 Employee published weekly schedule
6. Employee availability
7. Employee attendance current regression
8. Manager Workforce
9. People Shift Day-10
10. Control Tower

---

## 20. Files changed before PR

Executable/source scope:

1. `07_DATABASE/migrations/20260922124821_task_096_swap_lifecycle_reconciliation_hardening.sql`
2. `06_EMPLOYEE/swap/engine-v1.js`
3. `05_MANAGER/Workforce/swap-approval-v1.js`
4. `09_QA/people-shift/swap-lifecycle-v1.test.mjs`
5. `09_QA/people-shift/shift-swap-lifecycle-fixture.html`
6. `09_QA/people-shift/shift-swap-lifecycle-browser.mjs`
7. `09_QA/people-shift/employee-swap-regression.test.mjs`
8. `09_QA/people-shift/manager-workforce-canonical-fixture.html`
9. `09_QA/people-shift/manager-workforce-canonical-browser.mjs`
10. `.github/workflows/people-shift-tests.yml`

Evidence:

11. `01_DOCS/MAGASIN/05_SYSTEM/TASK_096_SWAP_LIFECYCLE_RECONCILIATION_HARDENING.md`

No private UUID/name/HR data or generated QA artifact is committed.

---

## 21. Known semantic gaps / compatibility boundaries

### EXPIRED

Canonical architecture includes EXPIRED, but no expiration duration/cutoff is Owner-defined.

TASK-096 does not invent a timer/cron/expiry rule.

### Cross-store / cross-date Swap

Existing live validator already rejected:

- STORE_MISMATCH
- DATE_MISMATCH

No Owner-approved broader rule exists.

TASK-096 preserves this fail-closed compatibility restriction.

### Attendance ownership integration

TASK-096 keeps current attendance-presence blocking.

E2E-08 — transferred ownership to manual-time attendance authority — remains downstream and is not claimed complete.

### Give

TASK-097 owns Give lifecycle hardening.

TASK-096 changes Give only as a read-only conflict predicate for active `PENDING_RECIPIENT/PENDING_MANAGER`.

---

## 22. Production safety

Confirmed:

- no fake Employee created;
- no fake work_schedule created;
- no fake Swap created;
- no fake Give created;
- no fake attendance created;
- no fake notification created;
- no historical Swap status rewritten;
- no historical row cleanup;
- no private Employee record/UUID committed;
- no salary/HR data committed;
- no token/service-role key committed;
- no TASK-097 implementation;
- no PFC cursor mutation;
- Workforce Robot remains disabled.

---

## 23. Final-gate placeholders

The following values are intentionally not invented before remote gates complete:

- PR number: **PENDING_FINAL_GATE**
- final PR head: **PENDING_FINAL_GATE**
- PR-head People Shift run/job: **PENDING_FINAL_GATE**
- merge SHA: **PENDING_FINAL_GATE**
- exact post-merge People Shift run/job: **PENDING_FINAL_GATE**
- exact post-merge collateral workflows: **PENDING_FINAL_GATE**
- final post-merge live reconciliation timestamp: **PENDING_FINAL_GATE**
- canonical TASK-096→TASK-097 source-of-truth closure: **PENDING_FINAL_GATE**

TASK-096 is not DONE until PR-head, merge, exact post-merge, final live reconciliation and state closure are green.

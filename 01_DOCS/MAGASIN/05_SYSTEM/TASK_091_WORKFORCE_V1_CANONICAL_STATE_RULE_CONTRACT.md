# TASK-091 — Workforce V1 Canonical State + Rule Contract

**Track:** WORKFORCE_OPERATIONS_V1  
**Execution mode:** OWNER_DIRECT_TO_WORK / MANUAL_WORK  
**Date:** 2026-09-21  
**Scope:** semantic contract + pure validator + deterministic tests only  
**Production mutation:** NONE  
**DB / attendance migration:** NONE  
**Payroll calculation/table creation:** NONE  
**PFC cursor mutation:** NONE  
**TASK-092 execution:** NOT STARTED

## 1. Five-Step

### QUESTION

TASK-090 proved that MAGASIN already has reusable Workforce primitives but several current runtime/storage states do not match the newly locked V1 semantics. TASK-091 therefore locks one semantic model before TASK-092→108 so later UI, RPC and migration work cannot invent incompatible rules.

### DELETE

The canonical target excludes:

- staffing-gap / “thiếu ca - đủ ca” as a core Workforce state;
- realtime CHECKED_IN / CHECKED_OUT attendance;
- GPS/geofence;
- AI schedule decision;
- Robot generation as a Manager scheduling prerequisite;
- Owner as the daily scheduler;
- automatic payroll finalization;
- automatic disciplinary action or deduction;
- attendance.amount as payroll truth.

Legacy names may remain in compatibility evidence but are not promoted to canonical target states.

### SIMPLIFY

One semantic spine:

Employee next-week availability
→ Manager schedule DRAFT / REVIEWED / PUBLISHED
→ official assignment ownership
→ Swap / Give
→ final current assignment owner
→ manual actual-time Attendance
→ confirmed work time
→ Payroll state
→ Employee self-check.

### ACCELERATE

Reuse existing storage and RPC semantics when they are equivalent. Do not migrate merely to rename a status.

### AUTOMATE

TASK-091 automates only pure validation of contract/state/actor/week semantics. It contains no DB, Supabase, browser, external API, schedule allocation or payroll calculation path.

---

## 2. Canonical executable artifacts

- `02_CORE/contracts/workforce-operations-v1.json`
- `02_CORE/shared/workforce-operations-v1.mjs`
- `09_QA/business-os/workforce-operations-v1.test.mjs`

The helper can only:

- expose the canonical contract;
- calculate Asia/Ho_Chi_Minh week identity;
- validate canonical states and transitions;
- validate actor/scope authority;
- expose compatibility mappings;
- validate final-assignment attendance authority;
- validate that Payroll input is confirmed work time;
- return fail-closed attendance-policy diagnostics;
- validate minimum contract shape.

It has no operational write path.

---

## 3. Week / timezone semantics

Canonical timezone: **Asia/Ho_Chi_Minh**.

Canonical week: **MONDAY → SUNDAY**.

- Monday→Saturday: Employee registration targets NEXT WEEK.
- Sunday: registration lifecycle is closed; Manager scheduling target is NEXT WEEK.
- Next Monday: published schedule becomes active.
- Current week and next week are separate identities.
- No exact Sunday clock-time cutoff is invented.
- DST behavior is delegated to IANA timezone semantics; no foreign timezone/fixed-offset rule is imported.

The deterministic helper returns current Monday and next Monday from a local date or zoned timestamp.

---

## 4. Role / authority matrix

| Actor | Canonical authority |
|---|---|
| Employee | own profile, availability, schedule, attendance submit, payroll read |
| Manager | store-scoped profile/availability/schedule; schedule review/publish; shift-change approval; attendance review |
| Owner | enterprise policy / exception / authority; not daily scheduler |
| System | deterministic validation, time lifecycle and atomic apply after authorized approval |
| Robot | optional proposal only after stable rules; not a scheduling prerequisite; disabled on this track |

Manager payroll review remains future permission-gated rather than silently granted.

Unknown actor/capability/scope fails closed.

---

## 5. Canonical state machines

### Availability

`REGISTRATION_OPEN → SUBMITTED → REGISTRATION_CLOSED`

SUBMITTED may be re-submitted/edited by the same Employee while registration remains open.

Availability means “can work”; it is not an official assignment.

### Schedule

`DRAFT → REVIEWED → PUBLISHED → ACTIVE → COMPLETED`

`SUPERSEDED` is the explicit terminal/version replacement semantic for a published/active schedule that is replaced through an audited path.

Only Manager can publish. System owns time-based activation/completion.

### Swap

`REQUESTED → PEER_ACCEPTED → MANAGER_APPROVED → APPLIED`

Terminal: `REJECTED / CANCELLED / EXPIRED`.

Peer acceptance is mandatory canonical target semantics. Current implementation is not declared compliant with this stage.

### Give

`OFFERED → RECIPIENT_ACCEPTED → MANAGER_APPROVED → APPLIED`

Terminal: `REJECTED / CANCELLED / EXPIRED`.

Current `PENDING_RECIPIENT → PENDING_MANAGER → APPROVED` is compatible. Current APPROVED is written in the same atomic transaction that transfers ownership, so it maps to canonical APPLIED without a rename-only migration.

### Attendance

`DRAFT → SUBMITTED → NORMAL or NEEDS_REVIEW → APPROVED / ADJUSTED / REJECTED`.

No canonical CHECKED_IN or CHECKED_OUT state exists.

Missing review policy fails closed to NEEDS_REVIEW.

NORMAL does not imply automatic payroll.

### Confirmed Work Time

`ABSENT → CONFIRMED → REVISED`.

Confirmed work time is a separate truth object, not an alias for Attendance COMPLETED.

### Payroll

`ESTIMATED → REVIEWED → FINALIZED → PAID`.

ESTIMATED is never FINALIZED. PAID is never inferred merely from FINALIZED.

---

## 6. Assignment ownership invariants

The official assignment/work_schedules concept remains the ownership spine.

Canonical rules include:

- exactly one active owner for an assignment at a time;
- Employee must be ACTIVE;
- Manager/store scope must be valid;
- no employee assignment overlap;
- maximum two assignments per employee per day;
- availability compatibility when the canonical policy requires it;
- published mutation must be explicit and audited;
- publish retry/double-click/reload must not duplicate official assignments;
- official assignment logical identity must be deterministic.

After Swap/Give APPLIED:

- old owner loses attendance authority;
- new owner gains attendance authority;
- stale UI cannot override server ownership;
- repeated apply cannot transfer/exchange twice.

TASK-094 / TASK-096 / TASK-097 / TASK-098 close server enforcement; TASK-091 only locks semantics.

---

## 7. Compatibility map summary

| Domain | Current implementation | Canonical mapping | Result |
|---|---|---|---|
| Availability | employee_availability + save/get | SUBMITTED | EXACT |
| Availability lifecycle open/closed | implicit UI/time lifecycle | REGISTRATION_OPEN/CLOSED | PARTIAL / GAP |
| Generation | DRAFT / REVIEWED / PUBLISHED | same conceptual states | EXACT |
| Official schedule | work_schedules APPROVED | PUBLISHED/ACTIVE official assignment | COMPATIBLE |
| Swap request | shift_swaps PENDING | REQUESTED | PARTIAL |
| Swap peer acceptance | not proven | PEER_ACCEPTED | GAP |
| Swap approve RPC | approval + atomic exchange together | MANAGER_APPROVED + APPLIED | PARTIAL / COMPATIBLE |
| Give PENDING_RECIPIENT | existing | OFFERED | COMPATIBLE |
| Give PENDING_MANAGER | existing after recipient accept | RECIPIENT_ACCEPTED | COMPATIBLE |
| Give APPROVED + transfer | same transaction | APPLIED | EXACT |
| Attendance manual RPC | immediately writes COMPLETED/hours/amount | SUBMITTED/reviewed attendance | CONFLICT |
| NORMAL / NEEDS_REVIEW | not canonical today | target states | GAP |
| Confirmed Work Time | not found | separate truth object | GAP |
| Payroll | no Workforce payroll primitive found | ESTIMATED→PAID | GAP |
| Schedule notification | SCHEDULE_PUBLISHED | SCHEDULE_PUBLISHED | EXACT |
| Legacy attendance notification | CLOCKED_IN / CLOCKED_OUT / CLOCK_OUT_REMINDER | submitted/review/confirmed events | CONFLICT |

Migration is required only where semantics/storage genuinely differ. Different vocabulary alone is not a migration reason.

---

## 8. Attendance truth separation

TASK-091 locks three separate layers:

`RAW SUBMISSION != CONFIRMED WORK TIME != PAYROLL`.

Raw attendance fields:

- employee_id;
- schedule_assignment_id;
- work_date;
- scheduled_start/end;
- actual_start/end;
- submitted_at;
- submission_status;
- note.

Review fields:

- reviewed_by;
- reviewed_at;
- review_decision.

Confirmed fields:

- confirmed_start;
- confirmed_end;
- confirmed_minutes.

Legacy `COMPLETED`, check_in/check_out, hours_worked and amount are compatibility evidence only.

**Legacy COMPLETED does not equal confirmed work time.**

**attendance.amount is explicitly legacy non-payroll truth.**

---

## 9. Confirmed-work-time boundary

Minimum canonical truth:

- assignment_id;
- employee_id;
- work_date;
- confirmed_start;
- confirmed_end;
- confirmed_minutes;
- confirmation_source;
- confirmed_by;
- confirmed_at;
- revision_identity.

Rules:

- confirmed_minutes >= 0;
- source must be reviewed/accepted Attendance V1 or explicit authorized adjustment;
- not generated from planned schedule alone;
- not generated from raw legacy clock events alone;
- not generated from raw SUBMITTED attendance alone;
- not generated from attendance.amount.

TASK-098/TASK-100 close implementation.

---

## 10. Payroll dependency boundary

Payroll requires all three:

`CONFIRMED_WORK_TIME + VALID_PAY_RULE + PAYROLL_PERIOD`.

Locked rules:

- raw SUBMITTED attendance cannot contribute;
- NEEDS_REVIEW cannot contribute;
- REJECTED cannot contribute;
- attendance.amount is not final payroll;
- FINALIZED must be immutable or revision-controlled;
- PAID requires its own state transition.

Pay-rate/allowance/bonus/deduction details remain TASK-102+ configuration, not invented in TASK-091.

---

## 11. Idempotency + audit

Canonical mutation families with explicit logical identity and retry behavior:

1. availability save;
2. schedule publish;
3. Swap accept/approve/apply;
4. Give accept/approve/apply;
5. attendance submit;
6. attendance review;
7. payroll finalize.

Every audited state mutation must carry the semantic equivalent of:

- logical identity;
- actor;
- actor role;
- timestamp;
- previous state;
- next state;
- reason/note when applicable;
- source revision.

TASK-091 creates no new DB audit ledger.

---

## 12. Notification / legacy deprecation

Canonical minimum events:

- AVAILABILITY_SUBMITTED
- SCHEDULE_PUBLISHED
- SWAP_REQUESTED
- SWAP_PEER_ACCEPTED
- SWAP_APPLIED
- GIVE_OFFERED
- GIVE_ACCEPTED
- GIVE_APPLIED
- ATTENDANCE_SUBMITTED
- ATTENDANCE_NEEDS_REVIEW
- ATTENDANCE_CONFIRMED
- PAYROLL_FINALIZED

Legacy/deprecate from active Workforce V1:

- `clock_in_for_schedule`
- `clock_out_attendance`
- `ATTENDANCE_CLOCKED_IN`
- `ATTENDANCE_CLOCKED_OUT`
- `CLOCK_OUT_REMINDER`

TASK-091 does not delete production notification code.

---

## 13. Unresolved configurable business rules

No synthetic default is created for:

- exact Sunday registration cutoff clock time;
- attendance deviation threshold;
- auto-normal / auto-approval threshold;
- payroll pay rates;
- allowance rules;
- bonus rules;
- deduction rules.

All are `CONFIGURABLE_GAP / default=NONE`.

Missing attendance review configuration routes to NEEDS_REVIEW. Missing pay-rule evidence cannot create final payroll.

---

## 14. E2E-01→16 traceability

The machine-readable contract maps every E2E-01→E2E-16 to:

- involved state families;
- canonical invariant IDs;
- closing implementation tasks.

Closing sequence remains:

- E2E-01 → TASK-092/106
- E2E-02 → TASK-093/106
- E2E-03/05 → TASK-094/106/107
- E2E-04 → TASK-095/106
- E2E-06 → TASK-096/106
- E2E-07 → TASK-097/106
- E2E-08 → TASK-096/097/098/106
- E2E-09 → TASK-098/099/106
- E2E-10 → TASK-100/106
- E2E-11 → TASK-098/099/100/107
- E2E-12 → TASK-102/103/106
- E2E-13 → TASK-102/104/106
- E2E-14 → TASK-101/104/107
- E2E-15 → TASK-092→095/107
- E2E-16 → TASK-107/108.

TASK-091 does not run the full browser E2E pack.

---

## 15. Deterministic test coverage

The targeted contract test proves, at minimum:

- Monday week start;
- Sunday→next Monday target;
- availability != official assignment;
- Employee cannot publish;
- Manager scoped publish;
- max 2/day and no overlap invariants;
- staffing-gap absent from core;
- Swap peer acceptance ordering;
- Give recipient acceptance ordering;
- current Give APPROVED compatibility with APPLIED;
- old/new owner attendance authority;
- no realtime Attendance V1 states;
- raw attendance != confirmed time;
- missing attendance policy fail-closed;
- NEEDS_REVIEW / REJECTED excluded from payroll;
- confirmed work time separate truth;
- attendance.amount legacy;
- ESTIMATED != FINALIZED;
- Employee cross-user profile/payroll deny;
- Manager store scope;
- unknown actor/state/transition fail closed;
- publish/attendance/Swap/Give/payroll idempotency rules;
- legacy clock events deprecated;
- deterministic/idempotent helper behavior;
- all E2E-01→16 traced;
- no synthetic Sunday/attendance/payroll configuration;
- helper has no DB/Supabase/browser/external write path;
- TASK-091 safety, PFC preservation and TASK-092 no-auto-start.

CI additionally runs existing schedule-first, published-feedback, Swap, Give and notification deterministic regressions.

---

## 16. Exact gaps passed forward

- **TASK-092:** availability lifecycle boundary/reload/Sunday semantics.
- **TASK-093:** direct Manager Sunday schedule board independent of demand/Robot.
- **TASK-094:** server publish validation, max-2, scope, overlap, version/audit/idempotency.
- **TASK-095:** Manager publish → Employee published week visibility.
- **TASK-096:** missing Swap PEER_ACCEPTED lifecycle and exact-once atomic apply.
- **TASK-097:** integrated Give hardening/ownership tests; no rename-only migration needed.
- **TASK-098:** attendance semantic migration and final-owner authorization.
- **TASK-099:** Employee manual actual-time entry UI.
- **TASK-100:** Manager review → confirmed work time.
- **TASK-101:** self/scoped profile projection and RBAC.
- **TASK-102:** Payroll truth/pay-rule contract.
- **TASK-103:** confirmed-work-time-only calculation integration.
- **TASK-104:** Employee own-payroll self-check.
- **TASK-105:** route/UI/event consolidation after semantics are stable.
- **TASK-106:** full cross-role E2E-01→16.
- **TASK-107:** failure/recovery/idempotency/security.
- **TASK-108:** final PR-head/exact-main/cold-reload regression.

---

## 17. Safety confirmation

TASK-091 introduces no:

- production mutation;
- DB migration;
- attendance migration;
- payroll table;
- fake employee;
- raw salary data;
- private Employee data;
- secret/token;
- Drive data;
- operational browser/API writer.

PFC remains the independently authoritative `TASK-068 → TASK-069` cursor and is not modified by this Workforce track.

Workforce Robot remains disabled.

TASK-092 is not started.

## TASK-091 handoff

After the required PR-head and exact post-merge CI gates are green:

- TASK-091 = DONE
- TASK-092 = READY / MANUAL_WORK
- Robot = DISABLED
- PFC cursor = UNCHANGED

Do not auto-start TASK-092.

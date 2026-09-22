# TASK-099 — Employee Attendance Entry UI V1

Date: 2026-09-22  
Track: Workforce Operations V1  
Execution mode: MANUAL_WORK  
Workforce Robot: DISABLED

## 1. Result

**TASK-099 = DONE.**

Employee-side Manual-Time Attendance V1 is implemented and executable on the canonical TASK-098 backend authority.

**E2E-09 = PARTIAL / EMPLOYEE SIDE CLOSED.**

This task closes only the Employee submission side. Manager exception review and confirmed work time remain TASK-100+ and are not claimed here.

## 2. Canonical starting point

Required baseline:

`f965dab40264ea82b0c9862a1e5222ed661cd09c`

Before implementation, main was exactly that baseline. TASK-099 implementation PR #259 started from it.

The implementation merge is a direct descendant of the required baseline:

`f965dab40264ea82b0c9862a1e5222ed661cd09c`
→ TASK-099 PR head
→ `57ea0f6b84fe3a70a6c7fd395adbb508cd597061`

No valid work from another track was reset or reverted.

## 3. Implementation PR

Implementation PR:

**#259 — TASK-099: Employee Attendance Entry UI V1**

Final PR head:

`6cf5a186e06e5a73c84169ca84461ffad69a85b3`

Implementation merge SHA:

`57ea0f6b84fe3a70a6c7fd395adbb508cd597061`

Implementation changed only the Employee attendance UI/test/workflow surface needed for TASK-099:

- `06_EMPLOYEE/attendance/engine-v1.js`
- `09_QA/people-shift/employee-attendance-schedule-linked-browser.mjs`
- `09_QA/people-shift/employee-attendance-schedule-linked-fixture.html`
- `09_QA/people-shift/employee-attendance-schedule-linked.test.mjs`
- `09_QA/business-os/published-schedule-feedback-loop.test.mjs`
- `.github/workflows/people-shift-tests.yml`

No TASK-099 database migration was required.

## 4. Five-Step result

### QUESTION

The previous active Employee attendance surface still exposed realtime clock-in/clock-out and a legacy manual attendance mutation path, while TASK-098 had already made Manual-Time V1 the canonical backend authority.

### DELETE

The active Employee UI no longer calls:

- `clock_in_for_schedule`
- `clock_out_attendance`
- `manual_attendance_from_schedule`
- `auto_attendance_from_approved_schedules`
- direct browser table mutation for `attendance`
- direct browser table mutation for `work_schedules`

Legacy backend RPCs remain compatibility-only and retain TASK-098 current-owner hardening. They are not a parallel Employee UI mutation authority.

### SIMPLIFY

Employee UI now uses only:

- `list_my_approved_schedules_v2` for current published schedule truth;
- `get_my_attendance_v2` for persisted Employee attendance truth;
- `submit_manual_time_attendance_v1` for Manual-Time V1 submission.

### ACCELERATE

The flow reuses the existing Employee app shell, shared core helpers, canonical schedule identity and existing TASK-098 RPC boundary rather than creating a second client authority model.

### AUTOMATE

Automation is limited to safe refresh/reconciliation and bounded duplicate-submit prevention.

TASK-099 does **not** auto-submit, auto-clock-in, auto-clock-out, auto-approve, auto-review or derive confirmed work time.

## 5. Employee UI behavior

The active UI:

- loads only server-returned current APPROVED schedules for the signed-in Employee;
- lets the Employee select a schedule and enter actual start/end at minute precision;
- allows an optional note;
- validates required fields and start-before-end as UX validation only;
- submits schedule identity + actual start/end + optional note to the canonical RPC;
- disables submit while the request is active;
- reloads current schedule and persisted attendance truth after success;
- renders persisted SUBMITTED / NEEDS_REVIEW and other server statuses;
- explicitly states that submitted data is not confirmed work time;
- exposes understandable Employee-facing error text while retaining a stable canonical error code for debugging;
- has explicit loading, empty, error, retry and submitted states;
- is responsive at the 390px browser acceptance viewport.

No rounding, grace period, lateness threshold, overtime rule, break rule, payroll calculation or confirmed-minutes rule was invented.

## 6. Stale ownership / Give / Swap safety

The client never decides assignment ownership.

At mutation time the TASK-098 backend revalidates current APPROVED `work_schedules.user_id` ownership under the shared transfer lock namespace.

If a Give/Swap moves the schedule while a stale Employee UI is open:

1. stale submit fails closed with `ATTENDANCE_NOT_CURRENT_OWNER` or another canonical reconciliation error;
2. UI refreshes current server truth;
3. transferred schedule disappears from the old owner's attendance authority;
4. the client does not blindly retry the mutation.

This preserves the TASK-098 authority boundary.

## 7. Idempotency / concurrency

Executable coverage proves:

- double-click is bounded to one canonical mutation;
- exact retry converges to persisted attendance truth;
- reload does not create a duplicate;
- stale ownership transfer is denied;
- refresh cannot resurrect old-owner authority;
- raw submission remains separate from confirmed work time.

## 8. PR-head executable gates

Exact PR head:

`6cf5a186e06e5a73c84169ca84461ffad69a85b3`

### People Shift Day-10 Tests

- run: **35743617316**
- job: **106799408008**
- runtime: **Node v20.20.2**
- TASK-091 Workforce contract: **61/61 PASS**
- schedule-first compatibility: **9/9 PASS**
- People Shift deterministic: **73/73 PASS**
- Control Tower deterministic: **74/74 PASS**
- deterministic total: **217/217 PASS**
- browser suites: **12/12 PASS**
- TASK-099 browser marker: **TASK_099_EMPLOYEE_ATTENDANCE_UI=PASS**
- failures: **0**

Dedicated TASK-099 browser assertions:

- Manual-Time UI replaces active realtime/legacy Employee mutation controls;
- current canonical schedule is rendered;
- double-click produces one canonical submit;
- persisted SUBMITTED / NEEDS_REVIEW survives reload;
- stale owner is rejected and UI reconciles current truth;
- direct table mutation count is zero;
- legacy attendance mutation RPC count is zero;
- 390px mobile viewport has no horizontal overflow;
- page/console/request/5xx diagnostics are zero.

### Business OS Contract Tests

- run: **35743617244**
- job: **106799408132**
- conclusion: **SUCCESS**

## 9. Exact post-merge gates

Exact implementation merge:

`57ea0f6b84fe3a70a6c7fd395adbb508cd597061`

Exact-main gates:

- People Shift Day-10 Tests: run **35743790428**, job **106800003976** — **SUCCESS**
- Business OS Contract Tests: run **35743790505**, job **106800004115** — **SUCCESS**
- Validate MAGASIN GitHub Pages source: run **35743790560**, job **106800009318** — **SUCCESS**
- Pages build and deployment: run **35743786944** — **SUCCESS**

The exact-main People Shift run again produced:

`TASK_099_EMPLOYEE_ATTENDANCE_UI=PASS`

with the same Employee Manual-Time lifecycle, stale-owner, idempotency, no-legacy/direct-DML, mobile and browser-diagnostic assertions green.

## 10. Production read-only reconciliation

Final read-only observation:

**2026-09-22 15:12:19 UTC / 22:12:19 ICT**

Observed production truth:

- attendance rows: **0**
- work_schedules rows: **0**
- active Give rows: **0**
- active Swap rows: **0**
- duplicate active-attendance schedule groups: **0**

No production Employee, schedule, Give, Swap, attendance or notification fixture was created by TASK-099 closure.

## 11. Live authority / security boundary

Read-only catalog privilege inspection confirms:

### Canonical Employee RPCs

`list_my_approved_schedules_v2`

- anon execute: **NO**
- authenticated execute: **YES**
- fixed `search_path=public`

`get_my_attendance_v2`

- anon execute: **NO**
- authenticated execute: **YES**
- fixed `search_path=public`

`submit_manual_time_attendance_v1`

- anon execute: **NO**
- authenticated execute: **YES**
- postgres execute: **YES**
- SECURITY DEFINER with fixed `search_path=public`
- internal auth/current-owner/ACTIVE STAFF validation remains TASK-098 authority.

### Internal / automatic authority

- `validate_attendance_assignment_authority_v1`: postgres only
- `notification_attendance_trigger_v1`: postgres only
- `auto_attendance_from_approved_schedules`: postgres only

### Browser table authority

For both `anon` and `authenticated`, direct `attendance` table:

- SELECT: **NO**
- INSERT: **NO**
- UPDATE: **NO**
- DELETE: **NO**

TASK-099 therefore adds no browser table authority and no anonymous attendance RPC authority.

## 12. Security Advisor reconciliation

Final advisor observation on 2026-09-22 shows no new TASK-099 database surface because TASK-099 has no database migration.

Existing unrelated debt remains:

- RLS-enabled/no-policy INFO findings on unrelated tables;
- one mutable-search-path WARN for unrelated `magasin_normalize_name`;
- legacy anon SECURITY DEFINER findings unrelated to TASK-099;
- authenticated SECURITY DEFINER findings include intentional existing operational RPCs and remain governed by their internal authorization contracts.

TASK-099 does not widen those findings.

## 13. E2E-09 status

Employee-side lifecycle is executable and closed:

current Employee owns schedule X
→ Employee opens attendance UI
→ X is loaded from current server truth
→ Employee enters actual start/end
→ canonical Manual-Time submit succeeds
→ raw status is persisted
→ reload renders persisted status
→ retry/double-click does not duplicate
→ Give/Swap transfer away from Employee invalidates stale submit
→ refresh removes stale attendance authority.

Therefore:

**E2E-09 = PARTIAL / EMPLOYEE SIDE CLOSED.**

Full Workforce attendance/review lifecycle is **not** claimed closed because TASK-100 still owns:

- Manager attendance exception review;
- approve / adjust / reject semantics;
- confirmed start/end/minutes truth;
- any policy-controlled attendance deviation evaluation required by the canonical queue.

## 14. Scope boundaries preserved

TASK-099 does **not**:

- start TASK-100;
- implement Manager attendance review;
- invent numeric review thresholds;
- create confirmed work time;
- calculate payroll;
- make raw attendance payroll truth;
- define Give CANCELLED / EXPIRED semantics;
- enable Workforce Robot;
- change PFC.

PFC remains:

- current task: TASK-068
- next task: TASK-069

## 15. Canonical handoff

After canonical closure:

- TASK-099 = **DONE**
- E2E-09 = **PARTIAL / EMPLOYEE SIDE CLOSED**
- TASK-100 = **READY / MANUAL_WORK**
- Workforce current task = **TASK-100**
- Workforce next task = **TASK-101**
- Workforce Robot = **DISABLED**
- PFC current task = **TASK-068**
- PFC next task = **TASK-069**
- PFC state = **UNCHANGED**
- TASK-100 has **not** been started

The canonical docs/state closure merge SHA is recorded in the closure PR / Work return because a merge commit cannot self-contain its own future SHA.

## TASK-099 result

**DONE / E2E-09 PARTIAL — EMPLOYEE SIDE CLOSED / POST-MERGE GREEN**

# SCHED-03 — Employee Schedule UI V1

**Task:** SCHED-03  
**Baseline:** `78653a591d86784c8a16cdcbcb24ac82ce8a9447`  
**Scheduling gate:** `WORKFORCE_SCHEDULING_PRODUCTION_READINESS_V1`  
**Execution mode:** MANUAL_WORK  
**Implementation status:** DONE / POST-MERGE GREEN / PRODUCTION ASSETS DEPLOYED  
**Scope guard:** no SCHED-04 Manager board; no SCHED-05 Owner UX; no TASK-108; Workforce Robot DISABLED; PFC unchanged.

## 1. Canonical truth preserved

```text
Employee Availability = scheduling input
Manager/Owner canonical state machine = build/review/publish
work_schedules = single official/current assignment truth
Employee list_my_approved_schedules_v2 = own APPROVED current projection
```

SCHED-03 introduces no scheduling writer, no alternate cache authority and no schema/migration.

## 2. Pre-change UI audit

The baseline Employee schedule engine already used the canonical V2 reader, but the presentation/integration had gaps:

1. Fixed seven-column presentation was weak on narrow screens.
2. Loading was only a text pill; no dedicated skeleton.
3. Empty/error states were generic and backend errors could be rendered raw.
4. Official Schedule and Availability were not explicitly distinguished.
5. Schedule cards did not expose a professional Give/Swap/Attendance entry.
6. Give/Swap independently initialized its own current-week schedule selection, which could drift from the Schedule surface selected week/shift.
7. Attendance had correct server revalidation but displayed technical error codes to Employee.
8. No Schedule action preflight re-read existed before handing a schedule identity to downstream actions.
9. Legacy `get_my_schedule()` / V1 reader were already server-deactivated by SCHED-02 but the UI inventory had not yet recorded the V2 surface as the only active Employee schedule truth.

## 3. SCHED-03 UI behavior

The canonical Schedule surface now provides:

- professional MAGASIN schedule header and official-status context;
- today context;
- relative previous/current/next week navigation;
- exact date, start/end time, store and employee-facing published status;
- loading skeleton;
- full-week empty state;
- sanitized retry/error state;
- explicit Availability explanation: Availability is input, not an official schedule;
- one hidden `schedule_id` binding per rendered shift card;
- Attendance action for current/past eligible published shifts;
- Give/Swap entry for current/future eligible published shifts;
- fresh V2 server preflight before every downstream action;
- stale transfer reconciliation: if the shift no longer belongs to the Employee, it is removed before opening Give/Swap/Attendance;
- responsive single-column layout at 390px/mobile and seven-column desktop week without horizontal overflow;
- no UUID, SQL, raw backend error, `work_schedules`, `APPROVED` or DRAFT/generation internals rendered to Employee.

## 4. Downstream ownership binding

### Attendance

Existing `submit_manual_time_attendance_v1` authority remains unchanged.

SCHED-03 adds `attendance.openSchedule(schedule_id, week)` as a UI wrapper:
1. set requested canonical schedule identity;
2. re-read the week from server truth;
3. retain the selection only when the Employee still owns the published shift;
4. otherwise fail closed with friendly text.

Server-side Attendance authority remains the final enforcement boundary.

### Give / Swap

Existing Give/Swap RPC lifecycle remains unchanged.

SCHED-03 wraps the existing Employee Swap engine so `openGive(schedule_id, week)` and `openSwap(schedule_id, week)` begin from the Schedule surface canonical identity. The engine then reloads `list_my_approved_schedules_v2` for that week and clears the anchor if ownership changed.

No new Give/Swap mutation RPC or direct table path was created.

## 5. OLD / NEW UI inventory

| Surface/path | Baseline | SCHED-03 classification | Result |
|---|---|---|---|
| `06_EMPLOYEE/schedule/engine-v1.js` | canonical V2 reader, basic UI | **KEEP + HARDEN** | one professional official Schedule surface |
| `list_my_approved_schedules_v2(date)` | canonical own APPROVED reader | **KEEP** | only active schedule reader |
| `get_my_schedule()` | legacy | **DEPRECATE / DELETE-LATER** | SCHED-02 already revoked browser EXECUTE; no Employee UI usage |
| `list_my_approved_schedules_v1()` | legacy | **DEPRECATE / DELETE-LATER** | SCHED-02 already revoked browser EXECUTE; no Employee UI usage |
| Availability engine | canonical Employee self input | **KEEP + LINK** | visually separate input surface |
| Swap/Give engine | existing canonical lifecycle | **WRAP / REUSE** | schedule/week anchor from current published card + server reload |
| Attendance engine | existing canonical schedule-linked lifecycle | **WRAP / REUSE** | schedule/week anchor + server reload, technical code hidden |
| Dashboard Today | existing consumer of Schedule engine | **KEEP** | continues consuming canonical schedule projection |
| direct `work_schedules` browser read/DML | forbidden | **FORBIDDEN** | zero new direct table path |
| DRAFT/generation Employee UI | forbidden | **FORBIDDEN** | not introduced |
| client cache | presentation only | **NON-AUTHORITATIVE** | every mutation handoff preflights server truth |

## 6. Data cleanliness / production pre-audit

Read-only production audit used the real ACTIVE Staff identity and created no fake rows.

Pre-implementation live truth:
- ACTIVE Employee/Staff identity available: YES
- current week: `2026-09-21`
- own current-week published schedules: 0
- own next-week published schedules: 0
- own next-week Availability rows: 0
- total official `work_schedules` rows: 0
- duplicate schedule identity groups: 0
- canonical V2 Employee reader authenticated: YES
- legacy `get_my_schedule()` authenticated: NO
- legacy V1 schedule reader authenticated: NO
- direct authenticated `work_schedules` SELECT: NO

Because production has no official Employee shift rows, SCHED-03 does **not** create a fake production schedule merely to exercise action buttons. Shift binding/transfer behavior is covered by deterministic executable browser fixtures.

No database migration was created for SCHED-03.

## 7. Executable QA

Targeted SCHED-03 browser E2E proves:

- own APPROVED rows only; other Employee and DRAFT rows absent;
- Employee-visible UI hides raw IDs/status/database vocabulary;
- Availability is explicitly distinguished from official schedule;
- Attendance/Give/Swap use hidden current `schedule_id`;
- every downstream handoff performs a fresh V2 server read;
- transfer-away removes stale old-owner shift and does not open downstream action;
- raw backend error is sanitized and retry recovers;
- week navigation and iframe reload are deterministic;
- 390px mobile has no horizontal overflow;
- desktop has seven-column week and no horizontal overflow;
- zero direct table calls and zero legacy schedule reader;
- zero browser diagnostics.

Compatibility fixes caught during gating:
- restored Saturday label in the seven-day week;
- relative week navigation preserved the TASK-095 previous/next contract;
- Day-10 publish fixture was corrected to include the canonical `schedule_id` required by V2/downstream identity.

Branch-head People Shift gate:
- head: `3d9fae8cb49f6504885a82cd68180fb1d4ee2058`
- run: `35893723447`
- job: `107292312592`
- conclusion: **SUCCESS**
- deterministic checks: **308/308**
  - Workforce: 77/77
  - schedule-first: 9/9
  - People Shift: 148/148
  - Control Tower: 74/74
- `SCHED_03_EMPLOYEE_SCHEDULE_CONTRACT=PASS`
- `SCHED_03_EMPLOYEE_SCHEDULE_UI=PASS`
- `EMPLOYEE_PUBLISHED_WEEKLY_SCHEDULE_BROWSER=PASS`
- `TASK_099_EMPLOYEE_ATTENDANCE_UI=PASS`
- `TASK_107_WORKFORCE_FAILURE_RECOVERY_SECURITY=PASS`
- `MANAGER_WORKFORCE_CANONICAL_BROWSER=PASS`
- `PEOPLE_SHIFT_DAY10_BROWSER_E2E=PASS`
- `CONTROL_TOWER_BROWSER_E2E=PASS`

## 8. Final implementation lineage

- baseline main: `78653a591d86784c8a16cdcbcb24ac82ce8a9447`
- implementation PR: **#285**
- final PR head: `336319b5fb3cd68e4f5a38cb157d4c834fc429cb`
- implementation merge: `e96098f8484685f224a13ea5a5bbee5887b9dbb4`
- database migration: **NONE**

Final PR-head:
- People Shift run `35894008824`
- job `107293276082`
- conclusion **SUCCESS**
- deterministic regression: **308/308**
- targeted SCHED-03 Employee Schedule browser: PASS
- full Give/Swap/Attendance/TASK-095→107/Manager/Day-10/Control Tower browser pack: PASS

Exact implementation-main:
- People Shift `35894187738 / 107293880804` — **SUCCESS**
- deterministic regression: **308/308** = 77 Workforce + 9 schedule-first + 148 People Shift + 74 Control Tower
- `SCHED_03_EMPLOYEE_SCHEDULE_CONTRACT=PASS`
- `SCHED_03_EMPLOYEE_SCHEDULE_UI=PASS`
- `EMPLOYEE_PUBLISHED_WEEKLY_SCHEDULE_BROWSER=PASS`
- `TASK_099_EMPLOYEE_ATTENDANCE_UI=PASS`
- `TASK_107_WORKFORCE_FAILURE_RECOVERY_SECURITY=PASS`
- `MANAGER_WORKFORCE_CANONICAL_BROWSER=PASS`
- `PEOPLE_SHIFT_DAY10_BROWSER_E2E=PASS`
- `CONTROL_TOWER_BROWSER_E2E=PASS`

Exact implementation-main Pages:
- source validation `35894187653 / 107293880794` — **SUCCESS**
- build `35894185846 / 107293881251` — **SUCCESS**
- deploy `35894185846 / 107293956273` — **SUCCESS**
- report `35894185846 / 107293956262` — **SUCCESS**

### Production read-only reconciliation

After the implementation merge, using a real ACTIVE Staff identity:
- current-week own published rows: 0
- next-week own published rows: 0
- total official `work_schedules`: 0
- Availability rows: 7
- generation runs: 4
- generation assignments: 0
- active Give requests: 0
- active Swap requests: 0
- canonical V2 Employee reader authenticated: YES
- legacy `get_my_schedule()` authenticated: NO
- legacy V1 schedule reader authenticated: NO
- direct authenticated `work_schedules` SELECT/INSERT/UPDATE: NO / NO / NO
- latest database migration remains `20260923163337_sched_02_three_role_scheduling_authority_lock_v1`

Security Advisor database profile is unchanged from SCHED-02:
- RLS enabled/no policy: 11
- mutable search_path: 1
- anon SECURITY DEFINER executable: 13
- authenticated SECURITY DEFINER executable: 66
- leaked-password protection warning: 1, unrelated auth configuration

No fake Employee, Availability, published schedule, Give or Swap row was created by SCHED-03.

### Production Pages smoke

Public production assets after deployment confirm:
- unauthenticated `/06_EMPLOYEE/` correctly redirects to canonical Auth;
- `/06_EMPLOYEE/runtime/employee-runtime-v1.html?v=20260923-sched03` is served;
- `/06_EMPLOYEE/schedule/engine-v1.js?v=20260923-sched03` is served with the SCHED-03 official Schedule shell, mobile breakpoints, seven-day labels, V2 reader, stale preflight and downstream bindings.

Production has no official Employee shifts, so a live authenticated shift-card mutation test was intentionally not fabricated. Current-owner/stale-transfer action behavior is proven through executable deterministic browser fixtures and existing lifecycle regressions.

## 9. Closure / handoff

`SCHED-03 = DONE`.

Canonical Employee Schedule UI is now:
- one active V2 reader;
- own published/current schedule projection only;
- Availability visibly separated as input;
- current schedule identity bound privately to each shift;
- Give/Swap/Attendance revalidated against server truth before handoff;
- stale transferred shift removed before downstream action;
- mobile 390px+ and desktop responsive;
- technical backend identifiers/errors hidden from Employee;
- no new scheduling writer, migration or client-side authority.

Next:
- `SCHED-04 = READY / MANUAL_WORK`
- `SCHED-05 = BLOCKED_BEHIND_SCHED_04`
- TASK-108 remains `PAUSED_BEHIND_SCHED_GATE`
- Workforce Robot remains DISABLED
- PFC remains unchanged at `TASK-068 → TASK-069`

The canonical closure SHA is recorded after the state-only closure PR is merged.

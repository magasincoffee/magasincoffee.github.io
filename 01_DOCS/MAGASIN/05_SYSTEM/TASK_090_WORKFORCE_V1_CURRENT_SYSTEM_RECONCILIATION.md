# TASK-090 — Workforce V1 Current-System Reconciliation

**Track:** WORKFORCE_OPERATIONS_V1  
**Execution mode:** DIRECT MANUAL WORK  
**Date:** 2026-09-21  
**Status:** DONE / RECONCILIATION_COMPLETE  
**Production writes:** NONE  
**Production migrations:** NONE  
**Private employee/payroll data committed:** NONE  
**Next task:** TASK-091 READY / MANUAL_WORK — DO NOT AUTO-RUN

## 1. Five-Step decisions

### QUESTION

The repository already contains a substantial People / Shift implementation. The correct question is not “how do we build Workforce V1 from scratch?” but:

> Which existing capabilities can remain canonical, which must be hardened to the newly locked Workforce Operations V1 semantics, and which active legacy semantics must be removed from the path?

Repository inspection confirms that a rebuild is unnecessary.

### DELETE

Do not continue the following as Workforce V1 canonical behavior:

- realtime Employee check-in/check-out using clock_in_for_schedule / clock_out_attendance;
- attendance semantics where raw check_in/check_out immediately becomes COMPLETED and immediately produces hours_worked / amount;
- staffing-gap / staffing-demand-first Manager UX as the center of weekly scheduling;
- Robot-generation as a required prerequisite for Manager to create a weekly schedule;
- Owner Workforce as a duplicate daily scheduling owner;
- inactive Manager compat renderers as alternate business engines;
- legacy deep links that still route through manager-v13-runtime;
- CLOCK_OUT_REMINDER and ATTENDANCE_CLOCKED_IN/OUT wording after manual-time attendance becomes canonical;
- any future payroll calculation sourced from raw submitted attendance amount;
- static/demo Manager Staff / Attendance data as business truth;
- Dashboard, KPI, Academy or full-HRM expansion inside this V1 track.

TASK-090 does not physically delete production/runtime code. These are deprecation candidates only.

### SIMPLIFY

Use one canonical capability path per business capability:

1. employee profile / identity projection;
2. next-week availability;
3. official weekly schedule;
4. official schedule assignment ownership;
5. Swap;
6. Give;
7. manual-time attendance;
8. confirmed work time;
9. payroll;
10. notification / audit.

Existing server-owned schedule truth remains the spine. Role UIs are projections and actions over that truth.

### ACCELERATE

The shortest path is to retain the existing Employee engines, Manager canonical Workforce module, work_schedules ownership, Give primitive and notification outbox; then replace only the semantics that conflict with Workforce V1.

The largest true gaps are:

- Manager direct Sunday schedule board independent of staffing demand;
- max-two-shifts/day and publish/idempotency hardening;
- Swap peer-consent/state reconciliation;
- manual-time attendance with NORMAL / NEEDS_REVIEW;
- confirmed work time;
- payroll truth + employee self-check;
- end-to-end cross-role regression.

### AUTOMATE

No new business automation is justified in TASK-090.

Later automation may be used only after the deterministic state/rule contracts are stable. Manager remains the final schedule publisher and attendance exception reviewer. Payroll finalization remains explicit.

---

## 2. Current-system capability inventory

| Capability | Canonical current implementation | Current result |
|---|---|---|
| EMPLOYEE_PROFILE | employee runtime session profile via shared-core getProfile / requireActive; profile shell in 06_EMPLOYEE/app/employee-v40.html | partial projection only |
| AVAILABILITY | 06_EMPLOYEE/availability/engine-v1.js | strong reusable canonical slice |
| WEEKLY_SCHEDULE | Employee schedule engine + Manager Workforce generation/review/publish/official engines | reusable server truth; Manager creation path needs V1 simplification |
| SCHEDULE_ASSIGNMENT | public.work_schedules read by approved schedule RPCs | strong server-owned concept; base schema is live dependency |
| SWAP | Employee swap engine + Manager swap approval + live shift-swap RPC surface | working but state/lifecycle needs V1 reconciliation |
| GIVE | shift_gives migration + Employee Give UI + Manager approval | strongest fully source-controlled shift-change capability |
| MANUAL_TIME_ATTENDANCE | Employee attendance engine + manual_attendance_from_schedule | existing primitive has wrong V1 semantics |
| CONFIRMED_WORK_TIME | no canonical source-controlled model found | true gap |
| PAYROLL | no Workforce payroll table/RPC/module found; attendance amount is not payroll | true gap / possible live dependency unknown |
| NOTIFICATION_AUDIT | notification_outbox migration + Employee notification projection | reusable; attendance event semantics need change |

---

## 3. Canonical-path map

### Employee

~~~text
06_EMPLOYEE/runtime/employee-runtime-v1.html
  -> session + ACTIVE STAFF/EMPLOYEE gate
  -> 06_EMPLOYEE/availability/engine-v1.js
  -> 06_EMPLOYEE/schedule/engine-v1.js
  -> 06_EMPLOYEE/swap/engine-v1.js
  -> 06_EMPLOYEE/attendance/engine-v1.js   [semantic migration required]
  -> 06_EMPLOYEE/notification/engine-v1.js
  -> employee profile shell                [projection hardening required]
  -> payroll surface                       [GAP]
~~~

### Manager

~~~text
05_MANAGER/runtime/manager-runtime-v1.html
  -> 05_MANAGER/Workforce/engine-v1.js
       -> review-v1.js
       -> draft-publish-v1.js
       -> official-v1.js
       -> swap-approval-v1.js
       -> demand-v1.js                     [de-canonicalize from core V1]
  -> Attendance review                     [GAP]
  -> scoped Employee projection            [partial/static]
  -> payroll review/finalization           [GAP]
~~~

### Server truth

~~~text
employee_availability
  -> schedule draft/allocation container
  -> work_schedules APPROVED
  -> ownership mutation by Swap / Give
  -> attendance raw submitted actual time
  -> confirmed work time
  -> payroll period / payroll entry
~~~

The last three stages do not yet exist with the locked Workforce V1 semantics.

---

## 4. REUSE / HARDEN / DEPRECATE / GAP matrix

| Capability | Preferred path | Status | Reason / required delta |
|---|---|---|---|
| EMPLOYEE_PROFILE | shared-core session profile + Employee profile view | REUSE_AND_HARDEN | self identity exists; profile fields/projection/privacy tests incomplete |
| AVAILABILITY | 06_EMPLOYEE/availability/engine-v1.js | REUSE_AS_IS | already targets next week and uses permissioned RPCs; harden boundary/reload tests only |
| WEEKLY_SCHEDULE | 05_MANAGER/Workforce + 06_EMPLOYEE/schedule | REUSE_AND_HARDEN | official schedule path is good; creation is still demand/robot-first |
| SCHEDULE_ASSIGNMENT | work_schedules | REUSE_AND_HARDEN | correct official ownership concept; source-controlled base schema incomplete |
| SWAP | Employee swap + Manager approval | REUSE_AND_HARDEN | atomic Manager resolution exists, but current UI/lifecycle does not prove peer acceptance state |
| GIVE | shift_gives + shared Employee/Manager surfaces | REUSE_AND_HARDEN | recipient acceptance + Manager approval + revalidation + atomic transfer exist; state naming must reconcile APPROVED vs canonical APPLIED |
| MANUAL_TIME_ATTENDANCE | attendance table + schedule link | REUSE_AND_HARDEN | current manual RPC requires exact planned times and writes COMPLETED/amount immediately; realtime buttons remain active |
| CONFIRMED_WORK_TIME | none | GAP | required before payroll |
| PAYROLL | none in Workforce source tree | GAP | attendance.amount is legacy estimate, not payroll truth |
| NOTIFICATION_AUDIT | notification_outbox | REUSE_AND_HARDEN | schedule/swap/give events are useful; realtime clock events/reminders conflict with target attendance |
| STAFFING_DEMAND_CORE | demand-v1 + staffing requirements | DEPRECATE_FROM_ACTIVE_FLOW | may remain optional planning input, not V1 core or precondition |
| OWNER_DAILY_SCHEDULER | 04_OWNER/Workforce | DEPRECATE_FROM_ACTIVE_FLOW | Owner is policy/exception, Manager is daily schedule owner |
| MANAGER_COMPAT_ENGINES | 05_MANAGER/runtime/compat/workforce/* | DEPRECATE_FROM_ACTIVE_FLOW | canonical manager runtime no longer loads these |
| LEGACY_MANAGER_DEEP_LINKS | Cham-cong / Doi-ca / Nhan-su legacy runtime redirects | DEPRECATE_FROM_ACTIVE_FLOW | consolidate to canonical Manager runtime in TASK-105 |

---

## 5. Employee UI — current vs target

### Current

Employee canonical runtime loads schedule, attendance, availability, swap/give, notification and dashboard engines.

Working pieces:

- next-week availability registration;
- current/previous/next official schedule week navigation;
- Swap and Give from one shift-change surface;
- own session identity;
- notification list;
- attendance history.

Mismatch with V1:

- Attendance still exposes realtime “start shift / end shift” behavior through clock_in_for_schedule and clock_out_attendance.
- Manual attendance exists but asks for date/store/start/end and only succeeds when entered start/end exactly equal planned schedule.
- Attendance history shows check_in/check_out, hours_worked and amount as though those are final work/pay outputs.
- There is no canonical “Lương” surface or payroll state display.
- Profile shell contains readonly fields, but no dedicated canonical profile projection engine populating the full V1 operational profile was found.

### Target

Keep the same Employee app shell and canonical engines where possible.

Replace only:

- realtime attendance action -> select actual_start + actual_end for owned final assignment;
- legacy “income from attendance” -> payroll self-check projection;
- profile shell -> bounded self-profile projection;
- old attendance event language -> submission/review/confirmation language.

---

## 6. Manager UI — current vs target

### Current

Canonical runtime correctly loads one 05_MANAGER/Workforce module stack. Old compat Workforce scripts are not loaded by manager-runtime-v1.html.

Working pieces:

- Manager reads employee availability;
- Robot can create a DRAFT generation;
- Manager can edit assignment draft;
- server validation exists;
- Manager explicitly reviews and publishes;
- official schedule projection reads from server;
- Manager resolves Swap and Give;
- official schedule refreshes after shift-change resolution.

Mismatch with V1:

- Workforce UI still starts from “Nhu cầu nhân sự”.
- draft creation is triggered through auto_generate_schedule_generation and therefore requires staffing_requirements as generation input.
- “Robot xếp lịch” is treated as the path to the draft board instead of an optional accelerator.
- Manager Attendance surface in the shell is static/demo rather than a NORMAL / NEEDS_REVIEW exception queue.
- Manager Staff surface is static/demo rather than a scoped projection.
- no payroll review/finalization surface exists.

### Target

Reuse the Manager Workforce shell and assignment editor, but allow Manager to create/edit the week directly from Employee availability without staffing demand being a prerequisite.

Robot/demand may remain optional assistance after the direct board is correct.

---

## 7. Schedule — current vs target

### Current verified characteristics

- Employee availability state starts at next Monday.
- Manager weekly availability RPC uses Asia/Ho_Chi_Minh and requires Monday week_start.
- official Employee schedule uses list_my_approved_schedules_v2.
- official Manager schedule uses get_manager_weekly_schedule.
- review/publish are explicit Manager actions.
- Robot auto generation:
  - uses ACTIVE employees;
  - requires availability coverage;
  - rejects overlap against draft assignments and existing PENDING/APPROVED work_schedules;
  - respects employee daily/weekly hour caps when configured.
- no source-controlled proof was found that “maximum 2 shifts/day” is enforced by the current publish boundary.
- base work_schedules schema and several scheduling RPC definitions are not reproduced by the migration folder.

### Target delta

TASK-093 should reuse the current assignment editor and generation container if possible, but create a Manager-direct draft without depending on staffing_requirements.

TASK-094 must source-control or otherwise deterministically prove at the server boundary:

- no overlap;
- maximum two assignments/day;
- ACTIVE employee;
- valid manager/store scope;
- availability rule when enforced;
- published schedule mutation policy + audit;
- publish idempotency / duplicate prevention.

Sunday -> Monday is an operating semantic and must be explicitly tested; it must not rely on the UI clock alone.

---

## 8. Swap — current vs target

### Current

Employee:

- selects own APPROVED schedule;
- loads server candidate schedule;
- requires reason;
- submits submit_shift_swap_request.

Manager:

- loads PENDING requests;
- approve/reject through server RPC;
- approval is documented as atomic ownership exchange;
- official schedule refresh event exists.

Server validation evidence is partially source-controlled through the Give migration’s replacement validation logic for Swap, including:

- both schedules APPROVED;
- both employees ACTIVE;
- existing attendance blocks mutation;
- pending Give blocks Swap;
- resulting overlap checks;
- daily/weekly hours caps.

### Gap

No active Employee peer-accept step was found. Current request goes from requester to Manager PENDING flow.

The locked Workforce architecture defines a PEER_ACCEPTED stage. TASK-091 must lock the exact compatibility mapping and TASK-096 must implement/harden only the missing lifecycle delta without replacing the existing atomic server exchange.

---

## 9. Give — current vs target

### Current

Give is not fake Swap. It has its own source-controlled table and RPC lifecycle:

~~~text
Giver submits
-> PENDING_RECIPIENT
-> recipient accepts
-> server revalidates
-> PENDING_MANAGER
-> Manager approves
-> server revalidates
-> work_schedules.user_id changes atomically
-> shift_gives.status = APPROVED
-> official schedule refresh
~~~

Validation includes:

- schedule APPROVED;
- giver ownership;
- recipient ACTIVE;
- recipient availability;
- UNAVAILABLE blocking;
- overlap blocking;
- attendance-existing blocking;
- pending Swap/Give conflict protection;
- daily/weekly hours cap checks.

### Delta

The architecture uses an explicit APPLIED final concept while current implementation writes APPROVED at the same transaction that transfers ownership.

Do not rebuild this. TASK-091/TASK-097 should choose a single canonical compatibility interpretation, preferably treating current APPROVED-with-transfer as the already-applied terminal state unless a separate APPLIED state is required for audit clarity.

---

## 10. Attendance — current vs target

### Current active Employee path

06_EMPLOYEE/attendance/engine-v1.js actively calls:

- get_my_today_schedules;
- clock_in_for_schedule(schedule_id);
- clock_out_attendance(attendance_id);
- get_my_attendance_v2.

This is incompatible with the newly locked Workforce V1 rule: no realtime check-in/check-out.

### Existing manual primitive

manual_attendance_from_schedule exists in a source-controlled migration, but its semantics are not the target semantics:

- input names are p_check_in / p_check_out;
- it finds an APPROVED work_schedule only when entered times exactly equal work_schedules.start_time/end_time;
- it rejects future dates and duplicate attendance for the schedule;
- it immediately inserts attendance status COMPLETED;
- it immediately computes hours_worked and amount from employee_grades.hourly_rate;
- it stores planned_start / planned_end.

Therefore the current manual primitive is useful evidence and schema reuse, but not the V1 contract.

### Reusable current attendance fields

Repository evidence proves the existing attendance table has at least:

- work_date;
- user_id;
- store_id;
- schedule_id;
- check_in;
- check_out;
- status;
- late_minutes;
- early_minutes;
- note;
- grade;
- hourly_rate;
- hours_worked;
- amount;
- planned_start;
- planned_end.

### Missing target fields / semantics

No source-controlled evidence was found for:

- actual_start / actual_end as raw submitted values independent of planned time;
- submitted_at;
- NORMAL / NEEDS_REVIEW;
- reviewed_by / reviewed_at;
- confirmed_start / confirmed_end / confirmed_minutes;
- manager APPROVE / ADJUST / REJECT;
- payroll consuming confirmed time only.

### Minimal backward-compatible migration path for TASK-098

Do not rewrite or reinterpret historical attendance rows.

Preferred minimum path:

1. preserve attendance.schedule_id, planned_start/planned_end and legacy check_in/check_out columns;
2. add explicit raw-submission/review/confirmed semantics, either as nullable columns on attendance or a narrowly bounded companion truth object;
3. new submit RPC must derive employee ownership from the final APPROVED schedule_assignment/work_schedule on the server;
4. old owner after Swap/Give must fail authorization; new owner must pass;
5. raw submitted time must never populate payroll-final fields directly;
6. legacy OPEN/COMPLETED rows stay historical/legacy and are not silently classified as CONFIRMED;
7. deprecate realtime clock RPCs from the active Employee UI before declaring V1 attendance complete;
8. preserve old readers only as compatibility until TASK-105 cleanup;
9. update notification outbox semantics away from CLOCK_OUT_REMINDER / CLOCKED_IN / CLOCKED_OUT.

No attendance migration is applied in TASK-090.

---

## 11. Employee profile — current vs target

### Current

- shared-core getProfile reads own id, full_name, username, role, status.
- employee-runtime-v1.html requires ACTIVE STAFF/EMPLOYEE.
- Employee shell contains readonly profile fields.
- header identity is populated from the logged-in profile.

### Gaps

- no source-controlled dedicated Employee profile read model with all V1 operational fields was found;
- no evidence that profile store, grade, join date and contact fields are populated through the canonical profile shell;
- Manager “Nhân sự” surface in current shell contains static example rows, not a verified scoped data projection.

### TASK-101 scope

Build only the bounded projection and RBAC:

- Employee reads self only;
- Manager reads employees inside accessible store scope;
- Owner enterprise scope;
- no full HRM lifecycle in Workforce V1.

---

## 12. Payroll — current vs target

### Repository finding

No Workforce source path, table migration, contract, RPC or canonical Employee payroll module was found under payroll/salary/luong naming.

The current Employee attendance page displays “Tổng tiền nhận” from attendance.amount. That value is produced by the legacy attendance function from raw/legacy hours_worked × hourly_rate.

This is not acceptable as Payroll V1 truth because the locked architecture requires:

~~~text
confirmed work time
+ valid effective-dated pay rule
-> payroll period
-> payroll entry
-> ESTIMATED / REVIEWED / FINALIZED / PAID
~~~

### Classification

- confirmed work time: GAP;
- payroll truth contract: GAP;
- source-controlled payroll storage/RPC: GAP;
- live-schema payroll primitive: UNKNOWN_LIVE_DEPENDENCY until explicitly inventoried;
- Employee payroll self-check: GAP;
- attendance.amount: legacy/compat estimate only, never FINALIZED payroll.

### TASK-102→104

- TASK-102: truth/state/pay-rule contract;
- TASK-103: calculation from confirmed work time only;
- TASK-104: Employee own-payroll projection + privacy.

No auto deduction, auto penalty or auto finalization.

---

## 13. DB / RPC dependency map

| Domain | Repository-defined evidence | Live/schema dependency |
|---|---|---|
| Employee availability | get_manager_weekly_availability migration; Employee engines call get/save/delete availability | base employee_availability table and Employee save/read/delete RPC definitions not fully source-controlled |
| Manager scope | get_manager_accessible_stores migration | profiles/access_scope/stores base objects pre-exist |
| Staffing demand | staffing requirement migrations + demand engine | deprecated as V1 core |
| Schedule generation | auto_schedule_generation migration + Manager engines | base generation tables + several create/review/publish RPC definitions are live dependencies |
| Official schedule | Employee/Manager reader engines | work_schedules base table + reader/publish definitions not fully in migration folder |
| Swap | UI + live RPC usage; validation patched in Give migration | base shift_swaps table/RPC definitions are not fully source-controlled |
| Give | 20260918112940_shift_give_v1.sql | source-controlled enough for V1 reuse |
| Attendance | manual_attendance_from_schedule migration | attendance base table + realtime RPCs/readers pre-exist live |
| Notification | notification_outbox migration | source-controlled outbox; provider activation remains separate |
| Profile | shared-core own profile read | base profiles schema is live dependency |
| Payroll | none found | unknown live dependency / true implementation gap |

---

## 14. Live-schema dependencies not reproducible from migrations

Existing People / Shift documentation already records that several active Workforce RPCs are live-schema dependencies not fully reproduced in 07_DATABASE/migrations.

TASK-090 confirms that remains true.

Important examples include the definitions for:

- employee_availability base table and Employee availability RPC set;
- work_schedules base table;
- schedule generation base tables and parts of review/publish RPC set;
- official schedule reader RPCs;
- attendance base table;
- get_my_today_schedules;
- get_my_attendance_v2;
- clock_in_for_schedule;
- clock_out_attendance;
- base shift_swaps objects/RPCs;
- profiles / employee_grades / employee_constraints base schema.

Rule for TASK-091→108:

> Do not invent a replacement migration merely because source-controlled history is incomplete. Inventory exact live definitions before any migration that changes those objects.

---

## 15. QA / E2E coverage matrix — E2E-01→E2E-16

Coverage labels here are intentionally strict. Unit/static/browser-fixture coverage is not called full E2E unless the whole scenario is proven.

| E2E | Scenario | Existing evidence | Coverage | Missing assertion | Close in |
|---|---|---|---|---|---|
| 01 | next-week availability save/reload | Employee availability static + browser tests | PARTIAL | actual reload persistence + Sunday boundary | TASK-092, 106 |
| 02 | Sunday Manager sees availability and builds schedule without staffing-gap semantics | Manager canonical browser tests | PARTIAL | direct Manager board independent of staffing demand/Robot | TASK-093, 106 |
| 03 | overlap/inactive/store/scope/availability/max-2 validation | generation SQL + Give/Swap validators | PARTIAL | unified publish gate; explicit max-2/day; invalid scope E2E | TASK-094, 106 |
| 04 | publish then Monday Employee sees only published schedule | Day-10 Owner-flow E2E + Manager official test | PARTIAL | Manager-publish -> Employee cross-role V1 path | TASK-095, 106 |
| 05 | publish idempotency | no matching full scenario | GAP | double-click/retry/reload/competing draft prevention | TASK-094, 106, 107 |
| 06 | full Swap lifecycle | Employee submit + Manager approval browser regressions | PARTIAL | peer acceptance + one cross-role lifecycle + both Employee views | TASK-096, 106 |
| 07 | full Give lifecycle | giver + recipient browser; Manager approval browser; DB static test | PARTIAL_STRONG | one integrated cross-role lifecycle + final-state compatibility | TASK-097, 106 |
| 08 | post Swap/Give attendance ownership | no target test | GAP | old owner blocked; new owner allowed | TASK-096, 097, 098, 106 |
| 09 | manual actual-time attendance normal path | current test proves realtime clock path | GAP_TARGET | actual_start/end submit; no realtime dependency | TASK-098, 099, 106 |
| 10 | abnormal attendance -> NEEDS_REVIEW -> confirmed time | none | GAP | Manager approve/adjust/reject + final confirmed time | TASK-100, 106 |
| 11 | attendance idempotency | old duplicate schedule attendance guard exists | PARTIAL_LEGACY | target double-submit/reload/retry semantic | TASK-098→100, 107 |
| 12 | payroll draft uses confirmed time only | none | GAP | raw/rejected rows excluded; pay-rule validity | TASK-102, 103, 106 |
| 13 | payroll state + Employee self-check | none | GAP | ESTIMATED != FINALIZED; PAID state | TASK-102, 104, 106 |
| 14 | profile/payroll authorization | session role gate exists | PARTIAL | Employee A cannot read B; Manager scope; payroll privacy | TASK-101, 104, 107 |
| 15 | timezone/week boundary | Asia/Ho_Chi_Minh used in core/browser tests | PARTIAL | Sunday→Monday transition, reload, week cross-wire | TASK-092→095, 107 |
| 16 | failure/recovery | generic browser diagnostics exist | PARTIAL | injected RPC failure, safe retry, no duplicates, preserve confirmed state | TASK-107, 108 |

### Existing tests that must change

The current attendance regression explicitly asserts:

- clock_in_for_schedule exists in Employee active engine;
- clock_out_attendance exists in Employee active engine;
- browser clicking check-in/out produces COMPLETED attendance and amount.

Those assertions intentionally protect the old semantic and must be replaced during TASK-098→100.

---

## 16. Duplication / patch-chain map

### Already inactive but still present

Under 05_MANAGER/runtime/compat/workforce there are many historical renderers/fixes, including:

- manager-workforce-live.js;
- manager-workforce-review-v2.js;
- manager-workforce-demand-v*.js;
- manager-workforce-auto.js;
- manager-workforce-tabs-v*.js;
- manager-workforce layout/time-color patches;
- shift-swap-workforce-ui.js;
- attendance-workforce-ui.js;
- workforce-ui.js.

Manager canonical runtime no longer loads the old scheduling compatibility files. Keep them inactive; do not revive them.

### Route debt

The canonical routes:

- 05_MANAGER/Workforce/index.html;
- 05_MANAGER/Lich-lam/index.html;

already use manager-runtime-v1.html.

However legacy route wrappers such as:

- 05_MANAGER/Cham-cong/index.html;
- 05_MANAGER/Doi-ca/index.html;
- 05_MANAGER/Nhan-su/index.html;

still reference manager-v13-runtime.html. These are TASK-105 consolidation candidates.

### Owner duplication

04_OWNER/Workforce/01-demand, 02-review and 03-publish remain repository assets, but Owner is no longer the canonical daily scheduler. Do not use them as the active Workforce V1 scheduling engine.

---

## 17. Risks

### R1 — Attendance semantic migration risk — HIGH

Historical attendance rows may represent realtime OPEN/COMPLETED behavior or manual exact-planned attendance. Silent reinterpretation as confirmed work time would corrupt payroll truth.

Mitigation: preserve legacy rows; add explicit new truth semantics; migrate by compatibility, not reinterpretation.

### R2 — Payroll truth contamination — HIGH

attendance.amount currently looks like pay to the Employee UI but is generated before manager confirmation.

Mitigation: stop treating attendance.amount as payroll final output; payroll reads confirmed work time only.

### R3 — Manager scheduling depends on deprecated demand-first model — MEDIUM/HIGH

auto_generate_schedule_generation requires staffing_requirements.

Mitigation: reuse draft assignment container/editor, but add direct Manager weekly draft creation independent of demand.

### R4 — Live schema reproducibility — HIGH

Multiple canonical RPCs/tables are not fully represented by migrations.

Mitigation: exact live inventory before schema changes; fail closed on unknown definitions.

### R5 — Swap lifecycle semantic mismatch — MEDIUM

Current UI has no proven peer-accept stage.

Mitigation: lock compatibility states in TASK-091, harden in TASK-096 without replacing atomic exchange.

### R6 — Give final state naming — LOW/MEDIUM

Current APPROVED is also the transaction that applies ownership, while architecture names APPLIED separately.

Mitigation: define state mapping before modifying storage.

### R7 — legacy routes/static UI may mislead — MEDIUM

Manager shell contains static Staff/Attendance/demo metrics, and several deep links point to older runtime.

Mitigation: TASK-105 canonical route/surface consolidation after new logic is stable.

### R8 — notification semantics drift — MEDIUM

Outbox schedules CLOCK_OUT_REMINDER and attendance CLOCKED_IN/OUT events.

Mitigation: preserve outbox infrastructure but change event vocabulary when manual-time attendance lands.

---

## 18. Shortest implementation path TASK-091→108

### TASK-091 — Canonical State + Rule Contract

Lock compatibility mappings before code:

- legacy schedule/give/swap/attendance status -> V1 state;
- Give APPROVED terminal applied semantics;
- Swap peer-accept requirement;
- attendance raw vs confirmed truth;
- payroll states;
- role/scope matrix.

### TASK-092 — Availability Weekly Cycle Hardening

Reuse existing Employee engine. Add only:

- next-week boundary;
- reload persistence;
- Sunday→Monday handling;
- multiple intervals/delete regression.

### TASK-093 — Manager Sunday Schedule Board V1

Reuse Manager Workforce review + assignment editor.

Remove staffing demand/Robot as required precondition. Manager must be able to create a week directly from availability. Robot may be optional acceleration only.

### TASK-094 — Schedule Validation + Publish Gate

Harden server validation/publish:

- overlap;
- max 2/day;
- ACTIVE;
- store/scope;
- availability;
- no silent published mutation;
- audit;
- publish idempotency.

### TASK-095 — Employee Published Weekly Schedule V1

Reuse current approved schedule engine. Close Manager publish -> Employee visibility and Monday/week-navigation E2E.

### TASK-096 — Swap Hardening

Keep existing atomic server exchange. Add only missing peer consent/state mapping/revalidation and cross-role E2E.

### TASK-097 — Give Hardening

Reuse current Give primitive. Reconcile final state naming and add cross-role ownership/attendance-precondition tests.

### TASK-098 — Manual-Time Attendance Contract + Migration Path

This is the main semantic migration:

- new raw actual time;
- NORMAL / NEEDS_REVIEW;
- reviewer fields;
- confirmed work time;
- ownership from final assignment;
- legacy compatibility.

Do not apply migration before exact live schema inventory.

### TASK-099 — Employee Attendance Entry

Replace active realtime buttons with actual_start/end selection against owned published assignment.

### TASK-100 — Manager Attendance Review

Build exception queue and explicit approve/adjust/reject producing confirmed work time.

### TASK-101 — Employee Profile Projection

Bounded self/scoped profile only. No HRM expansion.

### TASK-102 — Payroll Truth Contract

Define pay rule, period, entry and ESTIMATED/REVIEWED/FINALIZED/PAID truth.

### TASK-103 — Payroll Calculation Integration

Consume confirmed work time only. Exclude raw/rejected attendance.

### TASK-104 — Employee Payroll Self-Check

Own-payroll only with clear state labeling.

### TASK-105 — UI / route consolidation

After business semantics are stable:

- remove demand-first from V1 core surface;
- canonicalize Cham-cong / Doi-ca / Nhan-su routes;
- retire old realtime attendance UI;
- leave old compat code inactive or archive safely.

### TASK-106 — Cross-Flow E2E

Implement E2E-01→16 as real cross-role flows, not isolated fixture assertions only.

### TASK-107 — Failure / Recovery / Security E2E

Retry/reload/idempotency/RBAC/fail-closed faults.

### TASK-108 — Final Regression

PR-head -> exact merged main -> cold/reload E2E recheck. No known P0/P1 defect.

---

## 19. Explicit DELETE / deprecation candidates

Do not physically delete in TASK-090. Candidate list for later gated cleanup:

1. active Employee realtime clock-in/check-out controls;
2. Employee attendance tests whose required semantic is realtime check-in/out;
3. CLOCK_OUT_REMINDER for the new attendance model;
4. ATTENDANCE_CLOCKED_IN / ATTENDANCE_CLOCKED_OUT event naming after migration;
5. demand-v1 as a core Workforce V1 navigation prerequisite;
6. Robot generation as mandatory entry to Manager schedule board;
7. Owner Workforce as daily scheduler;
8. 05_MANAGER/runtime/compat/workforce patch chain as alternate engine;
9. legacy manager-v13 deep-link wrappers;
10. static/demo Manager Staff and Attendance data as if operational;
11. attendance.amount as Employee “final pay” representation;
12. any fake Give-as-Swap path — no active canonical instance found;
13. Dashboard/KPI/Academy expansion from this Workforce V1 critical path.

---

## 20. No-production-write confirmation

TASK-090 performed repository inspection and documentation/state-queue reconciliation only.

Confirmed:

- no production employee data was created or modified;
- no attendance row was written;
- no payroll row was written;
- no production migration was applied;
- no destructive migration was run;
- no secret/token was committed;
- no fake production employee was created;
- no Employee private data or salary row was committed;
- no feature code was changed;
- no active Workforce runtime was changed.

## TASK-090 result

**RESULT: DONE / RECONCILIATION_COMPLETE**

The repository already contains enough working Workforce primitives that a rebuild is not justified.

### Keep / reuse

- Employee next-week availability;
- official Employee/Manager schedule readers;
- server-owned work_schedules assignment concept;
- Manager explicit review/publish structure;
- Give primitive;
- existing Swap atomic exchange core;
- notification outbox;
- Employee/Manager canonical runtime shells.

### Harden

- Manager direct scheduling independent of demand;
- schedule rule/publish idempotency;
- Swap lifecycle;
- Give final-state mapping;
- profile projection/RBAC;
- notification semantics.

### Replace active semantics

- realtime attendance;
- raw attendance -> immediate hours/amount as payroll-like truth.

### Build true gaps

- confirmed work time;
- Manager attendance exception review;
- Payroll truth/calculation/self-check;
- full cross-role E2E + recovery/security pack.

### Queue handoff

- TASK-090: DONE
- TASK-091: READY / MANUAL_WORK
- TASK-091 must NOT auto-run.
- Robot remains disabled for WORKFORCE_OPERATIONS_V1.
- PFC queue remains independently authoritative.

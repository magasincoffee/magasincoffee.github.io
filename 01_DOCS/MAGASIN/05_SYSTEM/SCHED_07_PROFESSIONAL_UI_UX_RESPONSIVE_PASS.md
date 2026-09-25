# SCHED-07 — Professional UI/UX + Responsive Pass

**Track:** WORKFORCE_SCHEDULING_PRODUCTION_READINESS_V1  
**Task:** SCHED-07  
**Status:** DONE / CANONICAL CLOSED  
**Execution mode:** OWNER_DIRECT_TO_WORK / MANUAL_WORK  
**Date:** 2026-09-25  
**Starting canonical main:** `6752948290140fbe62f85944f5151ffd66afb66e`  
**Implementation branch:** `sched-07/professional-ui-responsive`  
**Implementation PR:** #297  
**Final implementation PR head:** `6a83e44f8a5b87a07d1f2573f01b7dbfe9cd7021`  
**Implementation merge SHA / exact implementation main:** `7977a5b80dea853e0ee2997656aa6157035fb633`  
**DB migration:** NONE  
**Latest scheduling migration remains:** `20260923163337_sched_02_three_role_scheduling_authority_lock_v1`  
**PFC:** UNCHANGED  
**Workforce Robot:** DISABLED  
**Next task after canonical closure:** SCHED-08 READY / MANUAL_WORK — DO NOT AUTO-RUN

## 1. Five-Step

### QUESTION

SCHED-07 audited the three canonical scheduling surfaces already proven by SCHED-03→06:

- Employee published schedule surface;
- Manager canonical scheduling board;
- Owner enterprise scheduling oversight using the same Manager writer.

The remaining production-readiness gap was presentation and operational usability, not scheduling truth or server authority.

### DELETE

No new scheduling writer, RPC, table, state machine, database truth or business rule was added.

The implementation avoids a second role-specific visual stack by introducing one shared presentation layer for the canonical scheduling surfaces.

### SIMPLIFY

One shared stylesheet now provides the common MAGASIN scheduling visual language while the role-specific engines retain their existing authority:

- `02_CORE/ui/workforce-scheduling-polish-v1.css`;
- Employee keeps `06_EMPLOYEE/schedule/engine-v1.js` and `list_my_approved_schedules_v2`;
- Manager and Owner keep `05_MANAGER/Workforce/draft-publish-v1.js` and the existing create/replace/validate/review/publish RPC sequence;
- `work_schedules` remains the only official/current assignment truth.

### ACCELERATE

The shared layer standardizes:

- touch targets;
- keyboard focus;
- spacing, cards, states and role-shell treatment;
- 390px mobile behavior;
- one-column Manager/Owner scheduling board on narrow screens;
- seven-column operational board on desktop;
- reduced-motion support.

A dedicated SCHED-07 browser gate reuses the existing Employee/Manager/Owner fixtures rather than creating a duplicate product implementation.

### AUTOMATE

The SCHED-07 static contract and three-role Playwright gate are wired into People Shift CI.

Workforce Robot remains DISABLED. SCHED-08 is released for manual work only after this canonical closure.

## 2. Implementation

### Shared visual system

Added:

`02_CORE/ui/workforce-scheduling-polish-v1.css`

The shared layer provides:

- unified MAGASIN scheduling tokens;
- minimum 44px actionable controls on the scheduling surfaces;
- visible `:focus-visible` treatment;
- consistent shell/nav/card/state presentation;
- polished Employee schedule hero/context/week/actions;
- polished Manager/Owner scheduler header, controls, source list, board and downstream state;
- responsive one-column scheduling board at mobile width;
- no page-level horizontal overflow target;
- reduced-motion support.

### Employee

Production Employee shell loads the shared stylesheet statically:

`06_EMPLOYEE/app/employee-v40.html`

The Employee schedule engine keeps its reload-safe local scheduling CSS and adds:

- scheduling role marker;
- 44px week navigation controls;
- explicit keyboard focus treatment.

This preserves SCHED-03 iframe/reload behavior without introducing a fetch-abort diagnostic during deterministic fixture reload.

### Manager / Owner

The shared canonical writer:

`05_MANAGER/Workforce/draft-publish-v1.js`

now attaches the same polish layer and role marker for both:

- STORE_MANAGER → manager;
- OWNER → owner.

No writer or RPC behavior changed.

## 3. Responsive and accessibility evidence

Dedicated exact-main browser evidence:

`SCHED_07_UI_RESPONSIVE=PASS`

Assertions:

- Employee mobile touch target = 44px;
- Employee keyboard focus = visible;
- Employee fixture viewport = 374/374, no horizontal overflow;
- Manager mobile board = 1 column;
- Manager start control = 44px;
- Manager viewport = 390/390, no horizontal overflow;
- Owner store control = 44px;
- Owner viewport = 390/390, no horizontal overflow;
- Manager desktop board = 7 columns;
- desktop viewport = 1440/1440, no horizontal overflow;
- browser page/console/request/5xx diagnostics = 0.

## 4. Failure found and repaired during PR qualification

The first PR run exposed an SCHED-03 diagnostic failure when an externally injected stylesheet request was aborted during intentional iframe `srcdoc` reload.

All functional SCHED-03 assertions were already PASS; only the aborted stylesheet request failed diagnostics.

Repair:

- removed asynchronous shared stylesheet injection from the reloadable Employee schedule engine;
- moved shared stylesheet ownership to the production Employee shell;
- retained role-specific touch/focus polish in the reload-safe engine CSS;
- did not weaken SCHED-03 diagnostics.

After repair, SCHED-03 returned to PASS and all downstream browser gates executed successfully.

A second PR run exposed a real Manager 390px overflow of 6px caused by content-box sizing on the legacy/fixture shell.

Repair:

- applied `box-sizing:border-box` to the shared Manager/Owner scheduler surface;
- preserved the strict no-horizontal-overflow acceptance criterion.

After repair, Manager mobile measured exactly 390/390.

## 5. PR-head acceptance

Implementation PR #297 final head:

`6a83e44f8a5b87a07d1f2573f01b7dbfe9cd7021`

PR-head gates:

- People Shift run `36089098140`, job `107927389563` — SUCCESS;
- SOP Task run `36089098130`, job `107927389606` — SUCCESS;
- SCHED-01→SCHED-07 browser gates — PASS;
- full Swap/Give/Attendance/Profile/Payroll/Failure-Recovery/Manager/Day-10/Control-Tower browser regressions — PASS.

## 6. Exact-main acceptance

Implementation merged as:

`7977a5b80dea853e0ee2997656aa6157035fb633`

Exact-main gates:

- People Shift run `36089225109`, job `107927784809` — SUCCESS;
- SOP Task run `36089225147`, job `107927784498` — SUCCESS;
- Pages source validation run `36089225189`, job `107927784732` — SUCCESS;
- Pages build/deploy/report run `36089224309`:
  - build job `107927784558` — SUCCESS;
  - deploy job `107927816143` — SUCCESS;
  - report job `107927816183` — SUCCESS.

Deterministic exact-main checks:

- Workforce canonical contract: 77/77;
- schedule-first compatibility: 9/9;
- People Shift static regression: 169/169;
- Control Tower regression: 74/74;
- aggregate deterministic checks: **329/329 / 0 fail**.

Dedicated SCHED-07 browser:

- `SCHED_07_UI_RESPONSIVE=PASS`;
- 6/6 dedicated browser assertions PASS.

## 7. Authority and data invariants

SCHED-07 is presentation-only.

Unchanged:

- `work_schedules` = sole official/current schedule truth;
- Employee reader = `list_my_approved_schedules_v2`;
- Manager/Owner official reader = `get_manager_weekly_schedule`;
- Manager/Owner writer = shared canonical draft/validate/review/publish engine;
- Give/Swap ownership and Attendance authority semantics from SCHED-06;
- server-side role/store authorization;
- no browser protected-table direct DML.

SCHED-07 adds:

- no migration;
- no database schema change;
- no production fixture;
- no production business-data mutation;
- no new mutation authority.

Production scheduling reconciliation therefore remains governed by the SCHED-06 canonical truth until SCHED-08 live acceptance / SCHED-09 final reconciliation.

## 8. OLD / NEW / KEEP mapping

### KEEP

- Employee/Manager/Owner canonical scheduling engines and RPCs;
- all SCHED-06 synchronization semantics;
- existing role navigation authority;
- existing friendly error mapping.

### NEW

- shared scheduling polish stylesheet;
- SCHED-07 static UI/responsive contract;
- SCHED-07 three-role browser responsive gate;
- one People Shift CI step.

### WRAP

- Owner continues to use the shared Manager scheduling writer; no Owner-only writer is introduced.

### DELETE / DEPRECATE

No new active legacy path. No valid history deleted.

## 9. Closure

SCHED-07 is **DONE / CANONICAL CLOSED**.

Next sequential gate:

`SCHED-08 — Live three-role E2E acceptance = READY / MANUAL_WORK`

SCHED-08 is not started by this closure.

Still blocked:

- SCHED-09;
- TASK-108 behind the Scheduling Production Readiness gate.

Workforce Robot remains DISABLED. PFC remains unchanged.

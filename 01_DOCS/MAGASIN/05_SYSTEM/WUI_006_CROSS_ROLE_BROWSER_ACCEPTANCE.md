# WUI-006 — Cross-Role Browser Regression Acceptance

**Track:** WORKFORCE_UI_UX_UNIFICATION_V1  
**Task:** WUI-006  
**Accepted product PR:** #363  
**Accepted head:** `9c4a4ccbeaa420c12b335c89c4d52dbee370c354`  
**Date:** 2026-10-02  
**Result:** PASS

## Scope

This acceptance verifies the bounded cross-role browser regression required by WUI-006 for the accepted PR #363 head:

- Manager shell;
- Employee shell;
- recurring staffing editor;
- add/remove/save/reload;
- target-week change;
- four-store weekly overview;
- DRAFT scheduling surface;
- Employee published schedule;
- navigation/back/reload hooks;
- representative responsive widths.

Existing QA fixtures/mocks are used where business values are required for rendering. No Owner production business values are required by this UI track.

No production business data, staffing demand, Store Priority value, draft assignment, official schedule, schema, RPC authority, auth boundary or scheduling authority was created or changed.

## People Shift browser gate

Workflow: **People Shift Day-10 Tests**  
PR run: `36959280988`  
Job: `110689129792` / `day10-browser-gate`  
Conclusion: **SUCCESS**

Artifact:

- ID `11206584841`;
- name `people-shift-day10-e2e-36959280988`;
- not expired at acceptance time.

### Manager scheduling

Concrete browser evidence includes:

- `SCHED_04_MANAGER_SCHEDULING_BROWSER=PASS`;
- publish/reload reads canonical official truth — PASS;
- mobile `390px` page width remains bounded — PASS;
- browser diagnostics: `0 page/console/request/5xx errors`;
- Manager canonical browser: `MANAGER_WORKFORCE_CANONICAL_BROWSER=PASS`;
- reload resumes the same DRAFT without duplicate creation — PASS;
- Sunday defaults to the exact next week without creating a draft — PASS;
- Manager sees next-week availability before creating a draft — PASS.

### Recurring staffing editor

- `XSTORE_RECURRING_STABLE_EDITOR_BROWSER=PASS`;
- static C05 acceptance confirms save persistence across reload and reuse in another week;
- recurring authority/projection contracts remain green;
- time-editor behavior previously accepted in WUI-002 remains covered by the same active browser fixture.

This validates the bounded sequence required by the SOT:

1. edit existing block;
2. add block;
3. remove block;
4. save;
5. reload;
6. change target week;
7. preserve recurring configuration.

### Four-store weekly overview

Static/canonical contract evidence remains green:

- `XSTORE_CROSS_STORE_SCHEDULING_V1=PASS`;
- XSTORE-005 exposes one four-store weekly projection without a second writer — PASS.

The browser flow also proves store switching clears stale projections before reload for `store-a/b/c/d`.

### Employee published schedule

- `EMPLOYEE_PUBLISHED_WEEKLY_SCHEDULE_BROWSER=PASS`;
- next-week reader returns only the exact target week and own APPROVED rows — PASS;
- failed future-week load clears stale success and recovers — PASS;
- iframe reload preserves target week and rows without duplicate binding — PASS;
- browser diagnostics: `0 console/page/request/5xx errors`.

### Navigation / back / reload

Representative PASS evidence:

- Employee schedule direct reload/back keeps the shell route;
- Employee Today direct reload/back keeps dashboard active;
- secondary Employee route reload/back refreshes canonical truth;
- Manager/Employee reload paths converge to current canonical state;
- TASK-108 cold/reload gate — PASS;
- `TASK_108_GATE_A_RELOAD_SUITES=9`;
- `TASK_108_GATE_A_COLD_RELOAD=PASS`.

### Responsive coverage

`SCHED_07_UI_RESPONSIVE=PASS`.

Representative widths covered include:

- Employee: `360 / 390 / 430 / 768 / 1440`;
- Manager: desktop and responsive scheduling surfaces including `390 / 768 / 1024 / 1440`.

Representative evidence:

- Employee schedule desktop week smoke: 7 columns, `1440=1440`, desktop rail `208px`;
- Manager desktop operational week board: 7 columns, `1440=1440`;
- Employee responsive surfaces use `44px` minimum touch targets and no horizontal page overflow;
- Manager scheduling remains page-contained while wide boards use internal scrolling;
- SCHED-07 browser diagnostics: `0 page/console/request/5xx errors`.

## UI2 cross-role browser gate

Workflow: **UI2 Cross Role Acceptance**  
PR run: `36959280994`  
Job: `110689129556` / `cross-role-browser-gate`  
Conclusion: **SUCCESS**

Artifact:

- ID `11207601281`;
- name `ui2-016-cross-role-36959280994`;
- not expired at acceptance time.

### Manager scheduling matrix

UI2-012 PASS evidence covers:

- `1440`: page/client width `1440`;
- `1024`: page/client `1024`; scheduling board `1949 > 925` internal scroll;
- `768`: page/client `768`; scheduling board `1949 > 677` internal scroll;
- `390`: page/client `390`;
- touch minimum `44px` at responsive widths;
- add/edit/remove/save delegates to the existing writer;
- validation failure is explicit;
- review/publish confirmation and idempotent retry pass;
- official schedule entry delegates to the existing route;
- store/week navigation clears stale projection then reloads;
- duplicate-generation conflict locks authoring;
- `0 direct table / page / console / request / 5xx errors`.

### Employee cross-role matrix

Representative PASS evidence covers:

- Employee hash/back/reload navigation;
- Today direct route/back/reload;
- Employee schedule week navigation and loading/empty/error/recovery states;
- schedule action delegation to existing handlers;
- schedule desktop week at `1440`;
- responsive Employee surfaces at `360 / 390 / 430 / 768`;
- no horizontal overflow on tested responsive surfaces.

### Cold reload closure

- `UI2_017_COLD_RELOAD_CLOSURE=PASS`;
- `UI2_016_CROSS_ROLE_MATRIX=PASS`.

## Console / page error acceptance

The changed Workforce UI surfaces emit clean browser diagnostics in the accepted runs.

Explicit evidence includes:

- Manager SCHED-04: `0 page/console/request/5xx errors`;
- Manager Workforce canonical: `0 page/console/request/5xx errors`;
- Employee published schedule: `0 console/page/request/5xx errors`;
- SCHED-07 responsive suite: `0 page/console/request/5xx errors`;
- UI2-012 Manager scheduling: `0 direct table/page/console/request/5xx errors`;
- UI2 supplemental diagnostics: `0 page/console/relevant-request/5xx errors`.

## Conclusion

WUI-006 acceptance criteria are satisfied on PR #363 head `9c4a4ccbeaa420c12b335c89c4d52dbee370c354`.

The required Manager + Employee browser regression is green across navigation, scheduling, recurring time editing, add/remove/save/reload, target-week changes, four-store projection, DRAFT scheduling, Employee published schedule and representative responsive widths.

No changed UI surface shows unhandled page/console/request/5xx errors in the accepted browser gates.

Next task under the TEMP SOT after this evidence is merged to `main`: `WUI-007`.

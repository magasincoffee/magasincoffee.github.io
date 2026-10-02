# WORKFORCE UI/UX UNIFICATION — TEMP SOURCE OF TRUTH

**Track ID:** `WORKFORCE_UI_UX_UNIFICATION_V1`  
**Lifecycle:** TEMPORARY — delete this file after WUI-009 completes.  
**Created:** 2026-10-01  
**Status:** WUI-001 DONE / WUI-002 DONE / WUI-003 DONE / WUI-004 DONE / WUI-005 DONE / WUI-006 DONE / WUI-007 DONE / WUI-008 DONE / WUI-009 READY  
**Repository:** `magasincoffee/magasincoffee.github.io`

## 0. Authority boundary

This file is the **sole execution authority for the temporary Workforce UI/UX correction track only**.

It does **not** replace, amend, override, or reinterpret:

`01_DOCS/MAGASIN/05_SYSTEM/WORKFORCE_CROSS_STORE_SCHEDULING_TEMP_SOURCE_OF_TRUTH.md`

The primary XSTORE SOT remains authoritative for scheduling architecture, business data and XSTORE-011. At the time this temporary track was created, the primary track remains:

`XSTORE-011 BLOCKED / OWNER INPUT REQUIRED`

This UI/UX track must never fabricate, infer or enter:

- Store Priority business values;
- recurring staffing demand;
- draft schedule assignments;
- official schedules;
- staffing headcount;
- any other Owner/Manager business decision.

No database schema/RPC/authority change belongs to this track unless a concrete UI regression proves that the already-approved UI cannot function without one; if that occurs, stop and mark the task BLOCKED rather than silently expanding scope.

This TEMP SOT is intentionally **not linked into the primary XSTORE SOT**. Deleting this file after closure must not change the meaning or authority of the primary XSTORE SOT.

## 1. Owner correction / UX requirements

The Owner reported the following production-facing problems on 2026-10-01:

1. Manager layout is visually compressed/forced into one side of the viewport.
2. Employee layout shows the same class of width/alignment inconsistency.
3. Font, color, spacing and component styling are inconsistent between modules.
4. In recurring staffing configuration, adding a new time block can cause previously entered values to reset to `05:00 / 05:00 / 1`.
5. User-facing guidance exposes implementation language and mixed English/Vietnamese.
6. User-facing copy must be plain Vietnamese.
7. The system must be easier to use without requiring knowledge of internal architecture terms.
8. Scheduling time blocks must use a visual time-band rule consistently across Manager + Employee views.

### 1.1 Canonical time-band visual rule

Classify a shift/block by its **start time**:

- `05:00 <= start < 12:00` → **vàng**
- `12:00 <= start < 17:00` → **đỏ nhạt**
- `17:00 <= start <= 22:00` → **xanh dương nhạt**

Canonical design-token targets:

- morning background `#FFF4CC`
- afternoon background `#FDE7E7`
- evening background `#E8F3FF`

Exact border/text colors may be adjusted for contrast, but the three visual categories must remain immediately distinguishable.

The same classification must be used in:

- recurring staffing requirement board;
- recurring staffing edit state;
- Manager DRAFT scheduling board;
- Manager four-store weekly overview;
- Manager official schedule projection where applicable;
- Employee published schedule.

New empty blocks must not receive a fake/default time color. They remain neutral until a valid start time is selected.

## 2. User-facing language rule

User-visible operational UI must use natural Vietnamese.

Do not expose implementation terms such as:

- `canonical`
- `server`
- `browser`
- `RPC`
- `Store Priority`
- `Availability`
- `DRAFT`
- `REVIEWED`
- `PUBLISHED`
- `APPROVED`
- `Robot`
- `Auto Schedule`
- `Task / SOP`
- `NOT CONNECTED`

Preferred user-facing concepts:

- `Ưu tiên cửa hàng`
- `Thời gian có thể làm`
- `Lịch nháp`
- `Đã duyệt`
- `Đã phát hành`
- `Xếp lịch tự động`
- `Công việc / Quy trình`
- `Chưa kết nối`

Internal identifiers, database statuses, RPC names and test labels may remain English in source code and QA as long as they are not rendered to users.

## 3. Visual system lock

The Workforce surfaces must converge on one shared foundation:

### Typography

Canonical stack:

`"Segoe UI", Roboto, "Helvetica Neue", Arial, system-ui, -apple-system, sans-serif`

### Neutral palette

- primary text: `#101828`
- secondary text: `#667085`
- border: `#EAECF0`
- surface: `#FFFFFF`
- page background: `#F9FAFB`
- brand: `#0F8F9C`

### Layout

Desktop:

- sidebar keeps its fixed navigation width;
- main content uses the **entire remaining viewport width**;
- internal page content may center within a sensible max width only where the module is not a wide scheduling board;
- wide scheduling tables scroll **inside their own container**, never by forcing the whole page sideways.

Tablet/mobile:

- controls become touch-safe;
- 1024px is the shared Manager touch/drawer boundary;
- primary actions must remain usable without horizontal page overflow;
- wide schedule data may become an internal horizontal scroll area or a one-column mobile representation.

### Components

Use shared V2 tokens for:

- buttons;
- inputs/selects;
- cards;
- pills/badges;
- focus states;
- borders;
- radii;
- shadows;
- success/warning/error/info states.

Do not introduce another module-specific visual system if shared tokens already cover the requirement.

## 4. Known implementation state when this TEMP SOT was created

Existing in-progress PR:

`#363 — Workforce UI: unify Manager/Employee layout and fix staffing time state`

Latest head at source creation:

`0bab60a6ee36054b8e487a5f573a6087394f43e4`

Scope already implemented or partially implemented in PR #363 includes:

- preservation of `data-*` state when the 24h time picker replaces a time input;
- empty new blocks show `Chọn giờ` rather than silently defaulting to 05:00;
- Manager/Employee layout-width normalization;
- shared font/palette normalization;
- Vietnamese user-facing copy cleanup;
- recurring staffing board density/responsive work;
- time-band visual tokens and application to Manager/Employee schedule surfaces;
- browser/static regression additions.

PR #363 is **not accepted yet**.

Latest durable PR qualification at source creation:

- `AUTH-PROD Regression Contract` — SUCCESS;
- `Owner Control Tower Tests` — SUCCESS;
- `People Shift Day-10 Tests` — FAILURE;
- `UI2 Cross Role Acceptance` — FAILURE;
- `SOP Task Tests` — FAILURE.

Known failure pattern is predominantly stale contract assertions that still pin old cache versions or old user-facing wording. The robot must distinguish:

1. a stale assertion caused by an intentional accepted UI wording/cache change; versus
2. a real functional/security regression.

Never weaken an authority/security contract merely to make CI green.

### WUI-001 reconciled qualification — 2026-10-01

Accepted PR #363 head for WUI-001:

`b257b16f3f1490c4189215d185fd90b80b386990`

All relevant qualification gates are green on that exact head:

- People Shift Day-10 Tests — run `36884997422` — SUCCESS;
- UI2 Cross Role Acceptance — run `36884997603` — SUCCESS;
- SOP Task Tests — run `36884997402` — SUCCESS;
- Owner Control Tower Tests — run `36884997771` — SUCCESS;
- AUTH-PROD Regression Contract — run `36884997637`, attempt 2 — SUCCESS.

The first AUTH-PROD attempt was cancelled during Playwright system-package download, not by a test failure. The cancelled job was rerun directly and passed.

Permanent WUI-001 acceptance evidence:

`01_DOCS/MAGASIN/05_SYSTEM/WUI_001_REGRESSION_TRIAGE_ACCEPTANCE.md`

PR #363 remains open. Merge and exact-main qualification remain reserved for `WUI-007`.

## 5. Task table

| Task ID | Task | Required outcome | State |
|---|---|---|---|
| WUI-001 | Regression triage + contract reconciliation | Classify every current PR #363 failure; update only stale expectations; fix real regressions if any; no safety/authority weakening | **DONE / PR #363 QUALIFICATION GREEN** |
| WUI-002 | Recurring staffing editor state acceptance | Prove existing time/headcount survives +Khung/remove/save/reload/week change; new block starts empty; no 05:00 reset | **DONE / ACCEPTANCE GREEN** |
| WUI-003 | Manager + Employee layout foundation acceptance | Prove full remaining viewport usage, correct sidebar/main relationship, contained board scrolling, responsive/touch behavior | **DONE / ACCEPTANCE GREEN** |
| WUI-004 | Typography / palette / time-band visual acceptance | Prove one font/palette foundation and yellow/red/light-blue start-time rule across all required scheduling surfaces | **DONE / ACCEPTANCE GREEN** |
| WUI-005 | Vietnamese UX copy acceptance | Remove user-visible technical/mixed-language terms from primary Manager/Employee Workforce surfaces; keep internal identifiers internal | **DONE / ACCEPTANCE GREEN** |
| WUI-006 | Cross-role browser regression | Run bounded Manager + Employee browser regression for navigation, scheduling, time editor, colors, reload and responsive states | **DONE / ACCEPTANCE GREEN** |
| WUI-007 | PR merge + exact-main qualification | PR #363 or superseding PR green → merge → exact-main source/UI2/People Shift/SOP/Auth/Owner/Pages gates green | **DONE / EXACT-MAIN GREEN** |
| WUI-008 | Production-safe UI acceptance | Verify deployed Manager + Employee UI, cache cutover, no stale 05:00 reset, Vietnamese copy and color rule; no business data fabricated | **DONE / PRODUCTION-SAFE GREEN** |
| WUI-009 | Closure evidence + TEMP cleanup | Write permanent acceptance evidence, verify primary XSTORE SOT unchanged, then delete this TEMP SOT in the closure PR | **READY / NEXT AUTHORITATIVE TASK** |

Execution order is strict:

`WUI-001 → WUI-002 → WUI-003 → WUI-004 → WUI-005 → WUI-006 → WUI-007 → WUI-008 → WUI-009`

Do not execute more than one task ID per robot execution turn.

## 6. Detailed task contracts

### WUI-001 — Regression triage + contract reconciliation

Goal: make the in-progress UI correction branch testable without diluting existing contracts.

Required:

1. Re-read this TEMP SOT from the beginning.
2. Inspect PR #363 current head and all failed GitHub Actions jobs.
3. Produce an explicit list of failed tests.
4. For each failure, classify:
   - stale cache-version expectation;
   - stale wording expectation;
   - real functional regression;
   - real authority/security regression.
5. Update stale test expectations to the new accepted assets/copy.
6. If behavior is wrong, fix product code instead of changing the test.
7. Preserve:
   - auth boundaries;
   - role boundaries;
   - no fake Task data;
   - scheduling writer authority;
   - XSTORE recurring authority;
   - no direct table/browser authority expansion.
8. Re-run affected CI.

DONE evidence:

- all failures have classification;
- no known real regression is hidden by an assertion change;
- affected tests progress to green or expose a newly identified concrete product bug.

WUI-001 closure:

- initial PR qualification exposed 33 failing tests, with later browser stages exposing additional stale assertions/fixture drift;
- all discovered failures were reconciled without relaxing auth, role, scheduling-writer, recurring-staffing or direct-table authority;
- confirmed functional regressions hidden by assertion changes: 0;
- confirmed authority/security regressions hidden by assertion changes: 0;
- exact accepted PR head: `b257b16f3f1490c4189215d185fd90b80b386990`;
- all relevant PR qualification gates are green;
- acceptance evidence: `01_DOCS/MAGASIN/05_SYSTEM/WUI_001_REGRESSION_TRIAGE_ACCEPTANCE.md`;
- next task: `WUI-002`.

### WUI-002 — Recurring staffing editor state acceptance

Goal: close the bug seen by Owner where adding a block resets existing values.

Acceptance flow:

1. open recurring staffing editor;
2. set an existing block to a non-default time and headcount;
3. click `+ Khung`;
4. existing block remains unchanged;
5. new block shows `Chọn giờ` for start/end;
6. new block has no fake start/end time;
7. remove the temporary block;
8. existing block still remains unchanged;
9. save;
10. reload;
11. saved values persist;
12. change target week;
13. recurring configuration remains the same.

Required browser assertion:

- production time-picker code is loaded in the fixture;
- replacement select preserves `data-xsa-f` and other relevant attributes;
- no `select.value = TIMES[0]` style fallback exists.

DONE evidence:

- static contract green;
- browser test green;
- no regression in C02/C04/C05 recurring-authority tests.

WUI-002 closure:

- accepted PR #363 head: `b257b16f3f1490c4189215d185fd90b80b386990`;
- People Shift Day-10 Tests run `36884997422`, job `110445912700` — SUCCESS;
- static evidence: `WORKFORCE_UI_UNIFIED_V1=PASS`;
- time-picker static assertion preserving business-field attributes and forbidding the 05:00 fallback — PASS;
- browser evidence: `XSTORE_RECURRING_STABLE_EDITOR_BROWSER=PASS`;
- recurring authority regressions: `XSTORE_C02_RECURRING_STAFFING_AUTHORITY=PASS`, `XSTORE_C04_RECURRING_PROJECTION=PASS`, `XSTORE_C05_RECURRING_ACCEPTANCE=PASS`;
- acceptance flow proves existing `07:00–12:00 / 3` survives add/remove/save/reload and reuse in the next target week while a new block starts with empty start/end and `Chọn giờ`;
- durable acceptance evidence: `01_DOCS/MAGASIN/05_SYSTEM/WUI_002_RECURRING_STAFFING_EDITOR_ACCEPTANCE.md`;
- no production business data, schema, RPC authority or scheduling authority was changed;
- next task: `WUI-003`.

### WUI-003 — Manager + Employee layout foundation acceptance

Manager:

- sidebar fixed correctly;
- main content uses remaining viewport;
- no arbitrary narrow/max-width wrapper forcing the schedule to one side;
- recurring board and seven-day schedule scroll internally as needed.

Employee:

- desktop rail/sidebar relationship correct;
- main region uses remaining viewport;
- normal cards may center inside page wrap;
- schedule view never causes page-level horizontal overflow.

Responsive:

- 1024px shared Manager breakpoint preserved;
- touch controls >= 44px where required;
- mobile actions remain reachable.

DONE evidence:

- static CSS contract green;
- UI2 cross-role layout contract green;
- browser screenshots/artifacts for representative desktop + responsive widths.

WUI-003 closure:

- accepted PR #363 head: `b257b16f3f1490c4189215d185fd90b80b386990`;
- People Shift Day-10 Tests run `36884997422`, job `110445912700` — SUCCESS;
- UI2 Cross Role Acceptance run `36884997603`, job `110445911251` — SUCCESS;
- static evidence proves Manager and Employee desktop content use the remaining viewport instead of a forced side column;
- Manager shell/browser evidence is green at `1440/1024/768/390`, with the shared `1024px` touch/drawer boundary preserved;
- seven-day Manager scheduling browser evidence proves page width remains bounded while board overflow is internal at `1024` and `768`;
- Employee desktop evidence proves a fixed `208px` rail with main content beginning at `208px`, and Employee mobile/tablet schedule surfaces remain no-overflow/touch-safe;
- recurring staffing source keeps `.xsa-board-wrap{overflow:auto}` with a bounded wide table rather than widening the page;
- durable browser artifacts: `11174157312` and `11174261324`;
- durable acceptance evidence: `01_DOCS/MAGASIN/05_SYSTEM/WUI_003_LAYOUT_FOUNDATION_ACCEPTANCE.md`;
- no production business data, schema, RPC authority or scheduling authority was changed;
- next task: `WUI-004`.

### WUI-004 — Typography / palette / time-band visual acceptance

Required:

- shared font stack is the canonical Workforce font;
- Manager + Employee use same neutral/brand palette;
- no conflicting local palette on primary scheduling surfaces;
- recurring staffing, Manager DRAFT, cross-store overview and Employee schedule use the same time-band classification.

Boundary acceptance:

- `07:00` → morning/yellow;
- `12:00` → afternoon/red;
- `17:00` → evening/light-blue;
- empty start time → neutral.

Changing start time in an editor must update the visual band immediately.

DONE evidence:

- static color-token contract green;
- browser test proves live class transition;
- Employee published schedule contract still green.

WUI-004 closure:

- accepted PR #363 head: `b257b16f3f1490c4189215d185fd90b80b386990`;
- People Shift Day-10 Tests run `36884997422`, job `110445912700` — SUCCESS;
- static evidence: `WORKFORCE_UI_UNIFIED_V1=PASS`;
- typography/palette contract and `shift colors follow one visual rule across Manager and Employee scheduling` — PASS;
- canonical background tokens remain `#FFF4CC`, `#FDE7E7`, `#E8F3FF`;
- recurring staffing, Manager DRAFT/official projection, four-store overview and Employee published schedule are wired to the shared time-band system;
- browser evidence: `XSTORE_RECURRING_STABLE_EDITOR_BROWSER=PASS` with live morning → afternoon → evening class transitions at the required boundaries;
- boundary acceptance: `07:00` morning, `12:00` afternoon, `17:00` evening, empty recurring start neutral;
- Employee schedule regressions remain green: `SCHED_03_EMPLOYEE_SCHEDULE_CONTRACT=PASS`, `UI2_007_EMPLOYEE_SCHEDULE_CONTRACT=PASS`, `EMPLOYEE_PUBLISHED_WEEKLY_SCHEDULE_BROWSER=PASS`;
- durable artifact: `11174261324`;
- durable acceptance evidence: `01_DOCS/MAGASIN/05_SYSTEM/WUI_004_VISUAL_TIME_BAND_ACCEPTANCE.md`;
- no production business data, schema, RPC authority or scheduling authority was changed;
- next task: `WUI-005`.

### WUI-005 — Vietnamese UX copy acceptance

Audit primary visible surfaces:

Manager:

- Hôm nay;
- Xếp lịch;
- recurring staffing configuration;
- four-store weekly overview;
- availability/source list;
- DRAFT editor;
- validate/review/publish flow;
- official schedule;
- fallback shell/error state.

Employee:

- Hôm nay;
- Lịch làm;
- Availability entry/launch;
- attendance;
- swap/give;
- Task source-not-connected state;
- fallback/loading/error states.

Required:

- operational copy plain Vietnamese;
- no raw technical error appended to user message;
- raw error may go to `console.warn/error`;
- internal statuses may remain in code/test only.

DONE evidence:

- static negative-term audit green;
- SOP fail-closed semantics remain intact while display label becomes `CHƯA KẾT NỐI`;
- no fake Task/SOP facts introduced.

WUI-005 closure:

- final accepted PR #363 head: `9c4a4ccbeaa420c12b335c89c4d52dbee370c354`;
- real user-facing defects corrected: Manager `server` wording, Manager `revalidate` wording, implementation-facing ID guidance, raw Manager scheduling/bootstrap diagnostics, raw four-store overview diagnostics, raw official-schedule diagnostics, and Employee `publish` wording;
- raw technical diagnostics on corrected paths now go to `console.warn`, while users receive plain Vietnamese fallbacks;
- first qualification head `b322540cbd8f1e2f2a93e2e59aadac39914b42a3` exposed exactly two stale SCHED-04 wording assertions; only those wording expectations were reconciled, with server-side conflict/idempotency and scheduling-authority assertions preserved;
- People Shift Day-10 PR run `36959280988`, job `110689129792`: static/canonical regressions SUCCESS, SCHED-03 Employee Schedule browser SUCCESS, SCHED-04 Manager Scheduling browser SUCCESS;
- SOP Task Tests run `36959281027`, job `110689129844` — SUCCESS, including fail-closed browser regression;
- user-visible disconnected Task/SOP label remains `CHƯA KẾT NỐI`; internal `NOT_CONNECTED` remains internal;
- AUTH-PROD Regression Contract run `36959280949` — SUCCESS;
- Owner Control Tower Tests run `36959281093` — SUCCESS;
- durable acceptance evidence: `01_DOCS/MAGASIN/05_SYSTEM/WUI_005_VIETNAMESE_UX_COPY_ACCEPTANCE.md`;
- no fake Task/SOP facts, production business data, schema, RPC authority, auth boundary or scheduling authority was changed;
- next task: `WUI-006`.

### WUI-006 — Cross-role browser regression

Run bounded browser coverage for:

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

Do not require real Owner business data for this UI track. Use existing QA fixtures/mocks where business values are needed for rendering.

DONE evidence:

- People Shift browser gate green;
- UI2 cross-role browser gate green;
- no console/page errors from changed UI assets.

WUI-006 closure:

- accepted PR #363 head: `9c4a4ccbeaa420c12b335c89c4d52dbee370c354`;
- People Shift Day-10 Tests PR run `36959280988`, job `110689129792` — SUCCESS;
- UI2 Cross Role Acceptance PR run `36959280994`, job `110689129556` — SUCCESS;
- People Shift artifact `11206584841` and UI2 artifact `11207601281` are present and not expired at acceptance time;
- `SCHED_04_MANAGER_SCHEDULING_BROWSER=PASS`, `MANAGER_WORKFORCE_CANONICAL_BROWSER=PASS`, `XSTORE_RECURRING_STABLE_EDITOR_BROWSER=PASS`, `EMPLOYEE_PUBLISHED_WEEKLY_SCHEDULE_BROWSER=PASS`, `SCHED_07_UI_RESPONSIVE=PASS`;
- add/remove/save/reload and recurring target-week reuse remain green;
- four-store weekly projection contract remains single-reader/no-second-writer and store switching clears stale projections before reload;
- Employee schedule direct navigation/back/reload and target-week reader behavior remain green;
- TASK-108 cold/reload closure is green across 9 suites;
- UI2 Manager scheduling matrix remains green at `1440/1024/768/390`; Employee representative responsive coverage remains green at `360/390/430/768/1440`;
- browser diagnostics for changed Workforce surfaces report zero unhandled page/console/request/5xx errors;
- durable acceptance evidence: `01_DOCS/MAGASIN/05_SYSTEM/WUI_006_CROSS_ROLE_BROWSER_ACCEPTANCE.md`;
- no production business data, staffing demand, Store Priority value, schema, RPC authority, auth boundary or scheduling authority was changed;
- next task: `WUI-007`.

### WUI-007 — PR merge + exact-main qualification

Before merge:

- all relevant PR gates green;
- PR scope contains only intended UI/UX/QA changes;
- no migration/schema/RPC business-authority change;
- no fabricated production business rows.

Merge with exact expected head SHA.

Then require exact-main green for all workflows triggered by changed paths, including at minimum:

- Validate MAGASIN GitHub Pages source;
- Pages build/deployment;
- UI2 Cross Role Acceptance;
- People Shift Day-10 Tests;
- SOP Task Tests;
- AUTH-PROD Regression Contract;
- Owner Control Tower Tests.

If a workflow does not trigger because no relevant path changed, record that explicitly rather than inventing a run.

WUI-007 closure:

- PR #363 final accepted head: `9c4a4ccbeaa420c12b335c89c4d52dbee370c354`;
- PR #363 merged with exact expected head;
- qualified product exact-main / merge SHA: `d11c0b9905ad702e637d8d3329419bef7300b231`;
- pre-merge scope audit: 57 changed files, limited to UI/UX/runtime entry assets/QA/docs; no migration/schema/RPC business-authority change and no fabricated production business rows;
- exact-main Validate MAGASIN GitHub Pages source run `36963178725` — SUCCESS;
- exact-main pages build and deployment run `36963178154` — SUCCESS;
- exact-main UI2 Cross Role Acceptance run `36963178685`, job `110701118755` — SUCCESS;
- exact-main People Shift Day-10 Tests run `36963178766`, job `110701119121` — SUCCESS;
- exact-main SOP Task Tests run `36963178744`, job `110701119037` — SUCCESS;
- exact-main AUTH-PROD Regression Contract run `36963178721` — SUCCESS;
- exact-main Owner Control Tower Tests run `36963178739`, job `110701119114` — SUCCESS;
- exact-main artifacts: People Shift `11208927581`, UI2 `11208252442`, SOP `11208222445`, Owner `11209041341`;
- durable acceptance evidence: `01_DOCS/MAGASIN/05_SYSTEM/WUI_007_EXACT_MAIN_QUALIFICATION_ACCEPTANCE.md`;
- primary XSTORE SOT/business authority remains outside this UI/UX track;
- next task: `WUI-008`.

### WUI-008 — Production-safe UI acceptance

After exact-main deploy:

Manager:

- correct full-width layout;
- no forced-side-column defect;
- recurring editor preserves values when adding a block;
- new block does not auto-populate 05:00;
- time-band colors change correctly;
- primary guidance is Vietnamese.

Employee:

- correct desktop/main alignment;
- consistent font/color foundation;
- published shift colors follow the same visual bands;
- primary guidance is Vietnamese.

Use existing real production state only. Do not create Store Priority, staffing demand, draft assignments or official schedules merely to satisfy this UI acceptance.

If production has no data for a specific visual state, verify that state through the already-green browser fixture and record production as `NO_REAL_DATA_TO_RENDER`, not as failure and not by fabricating data.

WUI-008 closure:

- production-safe verification date: 2026-10-02;
- qualified product exact-main remains `d11c0b9905ad702e637d8d3329419bef7300b231`; subsequent main commit `199d0652163cb691f9ae2b407279ae9e4481d112` changed only WUI-007 evidence/SOT;
- read-only production browser run `df2e14a4-5314-49f3-8e65-a37135ee7823`; no login and no state-changing control used;
- Manager direct runtime rendered full desktop shell with right-side main workspace using the remaining viewport; primary visible guidance was Vietnamese;
- live deployed Manager/Employee shared tokens are `#FFF4CC`, `#FDE7E7`, `#E8F3FF` with canonical shared font stack;
- live Manager shell CSS has `width:auto`, `max-width:none` and sidebar-offset main/content rules;
- live Employee shell CSS has a `208px` desktop rail, `width:auto`, `max-width:none` and rail-offset main;
- live time-picker code uses `Chọn giờ` and no empty → `05:00` fallback;
- live recurring editor calls `syncFromDom()` before add/remove and creates new blocks with empty start/end values;
- live Employee schedule CSS/engine use the same morning/afternoon/evening shift tokens and Vietnamese published-schedule copy;
- authenticated recurring/Employee schedule business states were not rendered because no authenticated production browser profile was available; these states are explicitly `NO_REAL_DATA_TO_RENDER`;
- protected data-dependent states rely only on exact-main fixture evidence already green in People Shift run `36963178766` and UI2 run `36963178685`;
- no Store Priority value, staffing demand, draft assignment, official schedule, staffing headcount or other production business data was created, modified or inferred;
- durable acceptance evidence: `01_DOCS/MAGASIN/05_SYSTEM/WUI_008_PRODUCTION_SAFE_UI_ACCEPTANCE.md`;
- next task: `WUI-009`.

### WUI-009 — Closure evidence + TEMP cleanup

Create permanent evidence:

`01_DOCS/MAGASIN/05_SYSTEM/WORKFORCE_UI_UX_UNIFICATION_ACCEPTANCE_2026_10_01.md`

Evidence must record:

- Owner problem statement;
- root cause of the 05:00 reset;
- final layout/typography/palette rules;
- final time-band color rule;
- Vietnamese UX rule;
- PR/merge SHA;
- exact-main workflow IDs/conclusions;
- production-safe verification;
- confirmation that no business data was fabricated;
- confirmation that primary XSTORE SOT remained unchanged by this track.

Then:

1. verify permanent evidence exists on branch;
2. verify all WUI-001→008 DONE;
3. delete this TEMP SOT in the same closure PR;
4. merge closure PR;
5. verify on `main`:
   - permanent acceptance evidence exists;
   - this TEMP SOT no longer exists;
   - primary XSTORE SOT still exists and still owns XSTORE-011.

WUI-009 is complete only after deletion is verified on `main`.

## 7. Robot control rules

For bootstrap/discovery:

- read this file from the beginning;
- this file is sole authority for this UI/UX subtrack;
- identify exactly one next task already present here;
- never jump over task order.

For execution:

- validate the supplied task ID against this file;
- execute only that task;
- inspect/modify PR #363 when appropriate;
- verify concrete evidence before COMPLETE;
- after completion, update this TEMP SOT task state before advancing to the next task;
- use branch → PR → merge → exact-main where the task changes repository content;
- never report COMPLETE from local reasoning alone.

For check:

- inspect the durable GitHub/Supabase/browser evidence belonging to the same task;
- RUNNING if CI/deploy is still in progress;
- BLOCKED if Owner/business input is unexpectedly required;
- COMPLETE only after acceptance evidence is concrete.

## 8. Time budget

This is a practical remaining-work budget from the state recorded above, not a promise that CI cannot expose another defect.

Expected elapsed work:

| Task | Practical time |
|---|---:|
| WUI-001 regression triage/reconciliation | 45–90 min |
| WUI-002 state bug acceptance | 20–35 min |
| WUI-003 layout acceptance | 20–40 min |
| WUI-004 visual/color acceptance | 20–35 min |
| WUI-005 Vietnamese copy acceptance | 20–40 min |
| WUI-006 browser regression | 25–45 min |
| WUI-007 merge + exact-main | 30–60 min |
| WUI-008 production-safe verification | 20–40 min |
| WUI-009 evidence + TEMP deletion | 20–30 min |

Because several implementation changes already exist in PR #363, the tasks overlap in actual robot execution. The realistic **remaining elapsed time** if no new functional regression appears is:

**3.5–5 hours**

If the red workflows expose a real behavior/security regression rather than stale expectations, reserve:

**up to ~6 hours**

Do not compress the estimate by skipping exact-main or production verification.

## 9. Current next task

`WUI-001` is **DONE**.

`WUI-002` is **DONE**.

`WUI-003` is **DONE**.

`WUI-004` is **DONE**.

`WUI-005` is **DONE**.

`WUI-006` is **DONE**.

`WUI-007` is **DONE**.

`WUI-008` is **DONE**.

`WUI-009` is the only authoritative next executable task.

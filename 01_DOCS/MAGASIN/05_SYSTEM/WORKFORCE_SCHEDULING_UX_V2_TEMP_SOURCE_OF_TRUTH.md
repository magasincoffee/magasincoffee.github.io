# MAGASIN — Workforce Scheduling UX V2 — TEMP SOURCE OF TRUTH

**Track:** WORKFORCE_SCHEDULING_UX_V2  
**Task prefix:** SCHED-UI  
**Lifecycle:** TEMPORARY — delete only after SCHED-UI-019 closes and permanent acceptance exists.  
**Owner report date:** 2026-10-02  
**Design approval date:** 2026-10-02  
**Status:** SCHED-UI-000 DONE / SCHED-UI-001 DONE / SCHED-UI-002 DONE / SCHED-UI-003 DONE / SCHED-UI-004 DONE / SCHED-UI-005 DONE / SCHED-UI-006 DONE / SCHED-UI-007 DONE / SCHED-UI-008 DONE / SCHED-UI-009 DONE / SCHED-UI-010 DONE / SCHED-UI-011 DONE / SCHED-UI-012 DONE / SCHED-UI-013 DONE / SCHED-UI-014 DONE / SCHED-UI-015 DONE / SCHED-UI-016 DONE — CHANGES_REQUESTED / SCHED-UI-017 READY — OWNER CORRECTION REQUIRED / SCHED-UI-018→019 BLOCKED BY RELEASE ORDER

## 0. Authority and precedence

This TEMP SOT is the sole task-state authority for the Scheduling UX V2 implementation track.

It combines:

- **Cách A** — implementation planning/task decomposition;
- **Cách B** — Owner-approved UX/design lock.

Durable design authority:

`WORKFORCE_SCHEDULING_UX_V2_DESIGN_LOCK.md`

This SOT does **not** replace:

1. `WORKFORCE_CROSS_STORE_SCHEDULING_TEMP_SOURCE_OF_TRUTH.md`
   - owns XSTORE scheduling business authority, recurring staffing semantics, Store Priority semantics, Auto Schedule business behavior and XSTORE-011;

2. `PRODUCTION_RELEASE_GOVERNANCE_V1_SOURCE_OF_TRUTH.md`
   - owns Preview/Staging, Owner approval, exact RC freeze, 00:00 Asia/Ho_Chi_Minh release, rollback and production smoke;

3. Auth / Employee Registration / Workforce canonical authorities outside this UX scope.

If this SOT conflicts with XSTORE business semantics, XSTORE wins.

If this SOT conflicts with production release governance, Production Release Governance wins.

## 1. Owner-approved design decisions

The Owner approved the proposed Scheduling UX V2 direction on 2026-10-02.

Locked decisions:

- recurring staffing weekly grid stays as a scan/read surface;
- editing a staffing day moves to a wide dedicated editor instead of cramped controls inside 140px cells;
- Manager separates `Lập lịch tuần` from `Thiết lập xếp lịch`;
- Manager uses one visible guided workflow instead of multiple competing progress systems;
- one primary next action per state;
- shared time-band rule:
  - `05:00 <= start < 12:00` → yellow;
  - `12:00 <= start < 17:00` → light red;
  - `17:00 <= start <= 22:00` → light blue;
  - invalid/outside range → neutral;
- Employee registration may still default to `06:00–12:00`, but a real 05:00 shift is yellow;
- Employee next-week availability registration becomes a prominent primary scheduling action;
- availability remains distinct from official published schedule;
- current immediate-save behavior remains; no fake final-submit step;
- Owner uses the same scheduling truth/components as Manager, with overview-first enterprise scope;
- Owner-facing technical language such as canonical/writer/DML/Enterprise/DRAFT/Validate/Review/Publish is removed from normal UI;
- canonical visible routes:
  - `/manager/`
  - `/manager/scheduling/`
  - `/manager/schedule/`
  - `/employee/`
  - `/employee/schedule/`
  - `/employee/attendance/`
  - `/employee/payroll/`
  - `/owner/`
  - `/owner/scheduling/`
- numbered implementation folders may remain internally during compatibility cutover;
- mobile gets deliberate card/accordion layouts rather than compressed desktop grids.

## 2. Original Owner-reported problems

This track must close all six:

1. recurring staffing time controls are clipped/hard to read;
2. Auto Schedule information hierarchy is confusing;
3. Employee scheduling colors are not consistently visible;
4. Employee availability registration is too easy to miss;
5. user-facing URLs expose `04_` / `05_` / `06_` implementation paths;
6. Owner scheduling is not yet visually/language synchronized.

Additional issue found during source audit:

7. Owner scheduling still exposes developer/system terminology.

## 3. Hard safety boundaries

The robot must not fabricate or decide:

- Store Priority values;
- real recurring staffing demand;
- staffing headcount;
- employee availability;
- draft assignments;
- official schedules;
- payroll/attendance truth;
- other real Owner/Manager business values.

Do not change schema/RPC/RLS/business authority merely for UI convenience.

Do not create production business data for visual acceptance.

Use fixtures/mocks/staging/read-only data where appropriate.

Do not merge production-impacting product work to `main` before the release task.

## 4. Overnight robot execution model

The Owner intends to run the robot continuously overnight.

Therefore the task plan is designed so **Owner-only decision gates are near the end**.

Execution rules:

1. execute one task ID at a time;
2. after completion, update this SOT with concrete evidence;
3. expose exactly one next authoritative executable task;
4. continue through SCHED-UI-001→015 without asking the Owner for ordinary visual preferences already resolved by the Design Lock;
5. if a new non-critical Owner preference appears, append it to `DEFERRED_OWNER_QUEUE` and continue independent work;
6. do not invent a choice if it changes business authority, security, data integrity or irreversible production semantics;
7. those critical cases may still BLOCK immediately;
8. normal Owner visual acceptance is intentionally deferred to SCHED-UI-016;
9. no production release occurs without Owner Preview approval.

Default machine continuation after each completed technical task:

`NEXT_TASK_ID=<next task>`  
`CHECK_AFTER_SECONDS=0`

## 5. Deferred Owner queue

Current deferred items:

- **OWNER-GATE-001:** integrated Preview review completed on 2026-10-03 with result `CHANGES_REQUESTED`.
- **OWNER-CORRECTION-001:** Manager scheduling overview at `/manager/scheduling/`, specifically the `Đăng ký thời gian có thể làm` cross-employee weekly overview shown in the Owner review, does not visibly follow the locked shared time-band colors. Implement in SCHED-UI-017, rebuild Preview, then return the corrected visible surface to Owner review before release.

No other Owner decision is currently unresolved.

If the robot discovers another non-critical preference question:

- record `OWNER-DEFERRED-###`;
- document the exact question and the implementation-safe default used;
- continue only if the default is already supported by the Design Lock and does not change business authority;
- surface the queue in SCHED-UI-016.

## 6. Task graph

Primary technical chain:

`000 → 001 → 002 → 003 → 004 → 005 → 006 → 007 → 008 → 009 → 010 → 011 → 012 → 013 → 014 → 015`

Owner/release chain:

`015 → 016 → 017 → 018 → 019`

| Task | Scope | Current state |
|---|---|---|
| SCHED-UI-000 | Owner-approved Design Lock / Cách B | **DONE / OWNER APPROVED** |
| SCHED-UI-001 | Recurring staffing readable view + dedicated editor | **DONE / VERIFIED ON PR #381** |
| SCHED-UI-002 | Manager information architecture: Lập lịch tuần vs Thiết lập xếp lịch | **DONE / VERIFIED ON PR #381** |
| SCHED-UI-003 | Guided Auto Schedule “next action” workflow | **DONE / VERIFIED ON PR #381** |
| SCHED-UI-004 | Draft → edit → check → approve → publish visual simplification | **DONE / VERIFIED ON PR #381** |
| SCHED-UI-005 | Shared canonical time-band classifier | **DONE / VERIFIED ON PR #381** |
| SCHED-UI-006 | Employee official schedule time-band integration | **DONE / VERIFIED ON PR #381** |
| SCHED-UI-007 | Employee availability CTA + editor UX | **DONE / VERIFIED ON PR #381** |
| SCHED-UI-008 | Owner overview/drill-down scheduling parity + language cleanup | **DONE / VERIFIED ON PR #381** |
| SCHED-UI-009 | Canonical clean role/deep-route scaffolding | **DONE / VERIFIED ON PR #381** |
| SCHED-UI-010 | Auth/navigation migration + old-route compatibility | **DONE / VERIFIED ON PR #381** |
| SCHED-UI-011 | Responsive/mobile scheduling redesign | **DONE / VERIFIED ON PR #381** |
| SCHED-UI-012 | Accessibility, states and Vietnamese copy hardening | **DONE / VERIFIED ON PR #381** |
| SCHED-UI-013 | Focused regression tests for changed scheduling contracts | **DONE / VERIFIED ON PR #381** |
| SCHED-UI-014 | Integrated cross-role browser qualification on release branch | **DONE / VERIFIED ON PR #381** |
| SCHED-UI-015 | Preview/Staging build + automated RC qualification packet | **DONE / VERIFIED / PREVIEW_READY** |
| SCHED-UI-016 | Deferred Owner Preview review / all Owner-only questions | **DONE / CHANGES_REQUESTED / OWNER-CORRECTION-001 RECORDED** |
| SCHED-UI-017 | Apply Owner corrections if any + freeze exact RC | **DONE / VERIFIED / OWNER APPROVED / RC FROZEN** |
| SCHED-UI-018 | Midnight production release | **READY / NEXT AUTHORITATIVE TASK · EXECUTE ONLY IN ELIGIBLE 00:00 RELEASE WINDOW** |
| SCHED-UI-019 | Production smoke + permanent acceptance + TEMP deletion | **BLOCKED BY 018** |

## 7. SCHED-UI-000 — Design Lock

**DONE / OWNER APPROVED**

Durable artifact:

`WORKFORCE_SCHEDULING_UX_V2_DESIGN_LOCK.md`

No product code changed in SCHED-UI-000.

## 8. SCHED-UI-001 — Recurring staffing readable view + dedicated editor

Problem:

Current day cells are ~140px wide and directly contain two time controls plus headcount/delete, causing clipped time values.

Implement:

- keep store × weekday weekly scan table in view mode;
- render compact blocks as `05:00–08:00 · 1 người`;
- clicking/selecting a store/day opens a dedicated editor;
- desktop editor uses side/detail panel with full-width controls;
- mobile uses full-width sheet/panel;
- clear labels: Bắt đầu / Kết thúc / Số người / Xóa;
- multiple blocks stack predictably;
- `+ Thêm khung`;
- save/cancel actions separated from destructive action.

Regression requirements:

- existing values survive add/remove;
- new block start/end blank;
- no empty → 05:00 regression;
- save/reload/week reuse green;
- no real business values invented.


Completion evidence — 2026-10-02:

- implementation branch: `sched-ui-001-recurring-editor`;
- PR: `#381` — `SCHED-UI-001: dedicated recurring staffing day editor`;
- verified head: `4d0e3b760a60de4b28bf4757464a43239c556e9d`;
- PR remains open and unmerged; no production-impacting product code from this task was merged to `main`;
- recurring staffing weekly grid remains the scan/read surface; store/day selection opens a dedicated full-width editor on desktop and full-width sheet on mobile;
- editor labels and actions cover Bắt đầu / Kết thúc / Số người / Xóa, `+ Thêm khung`, cancel, and save;
- regression coverage verifies add/remove preservation, blank new start/end values, no empty→05:00 fallback, save/reload, next-week reuse, and mobile editor width;
- `SOP Task Tests` run `37004964969`: SUCCESS;
- `UI2 Cross Role Acceptance` PR run `37004964896`: SUCCESS;
- `People Shift Day-10 Tests` PR run `37004964955`: SUCCESS;
- `UI2 Cross Role Acceptance` push run `37004958809`: SUCCESS;
- no Owner input is required to close this technical task.

## 9. SCHED-UI-002 — Manager scheduling information architecture

Separate normal weekly operation from recurring configuration.

Required UI structure:

### Lập lịch tuần

Default operational surface.

### Thiết lập xếp lịch

Contains:

- ưu tiên cửa hàng;
- nhu cầu nhân sự cố định hàng tuần.

Requirements:

- weekly scheduling must not force the Manager to read the recurring configuration board every week;
- prerequisites may link the Manager directly to the relevant setup section;
- no second business writer;
- existing XSTORE semantics preserved.


Completion evidence — 2026-10-02:

- implementation continued on branch `sched-ui-001-recurring-editor` / PR `#381`;
- verified head: `39b50be7e77d9b96764de3e92ac012bf8af1aaff`;
- `Lập lịch tuần` is the default operational surface;
- `Thiết lập xếp lịch` contains the recurring setup areas for `Ưu tiên cửa hàng` and `Nhu cầu nhân sự cố định hàng tuần`;
- the recurring staffing board is not rendered on the default weekly surface and appears only inside scheduling setup;
- prerequisite links can open the relevant setup section directly;
- recurring staffing continues to use the existing `replace_workforce_recurring_staffing_requirements_v1` writer; no second business writer was introduced;
- existing XSTORE Auto Schedule semantics and RPC authority remain unchanged;
- Manager cache chain advanced to `20261002-sched-ui-002` so the IA update is exercised by qualification;
- `SOP Task Tests` PR run `37006504099`: SUCCESS;
- `People Shift Day-10 Tests` PR run `37006504060`: SUCCESS;
- `UI2 Cross Role Acceptance` PR run `37006504044`: SUCCESS;
- push qualification runs `37006498638` and `37006498630`: SUCCESS;
- PR remains open and unmerged; no production-impacting product code from this task was merged to `main`;
- no Owner input is required to close this technical task.

## 10. SCHED-UI-003 — Guided Auto Schedule next-action workflow

Replace competing progress/status cards with one visible workflow:

1. Chuẩn bị
2. Tạo lịch nháp
3. Chỉnh lịch
4. Kiểm tra
5. Duyệt & phát hành

Required:

- one `Việc cần làm tiếp theo` block;
- one primary CTA;
- disabled action explains the blocker;
- summary counts are supporting metadata only;
- no duplicate stepper from another module;
- no Auto Schedule execution when prerequisites are incomplete;
- technical state may remain internal.

Completion evidence — 2026-10-02:

- implementation continued on branch `sched-ui-001-recurring-editor` / PR `#381`;
- verified exact head: `854d8a2ec7cd4d83948d27f7f88a40c445af7e12`;
- one five-step visible workflow is present: Chuẩn bị → Tạo lịch nháp → Chỉnh lịch → Kiểm tra → Duyệt & phát hành;
- one `Việc cần làm tiếp theo` block and one state-driven primary CTA are used; prerequisite blockers explain what must be configured before automatic draft generation;
- Store Priority and recurring staffing prerequisites gate automatic draft generation; no Auto Schedule execution occurs before prerequisites are complete;
- the Manager scheduling duplicate step rail was removed and summary counts remain supporting metadata only;
- existing scheduling authority is preserved: no new writer/RPC was introduced, and the existing `auto_generate_cross_store_schedule_v1` / `XSTORE_GLOBAL_RECURRING_V1` path remains authoritative;
- user-facing technical `Auto Schedule` copy was removed while internal technical state remains unchanged;
- XSTORE browser qualification verifies prerequisite transition persistence across reload and next-week navigation;
- `SOP Task Tests` PR run `37010910483`: SUCCESS;
- `UI2 Cross Role Acceptance` PR run `37010910576`: SUCCESS;
- `People Shift Day-10 Tests` PR run `37010910437`: SUCCESS;
- push qualification runs `37010902535` and `37010902531`: SUCCESS;
- `XSTORE four-store master browser E2E`, `UI2-016 static contract`, accepted role static regressions, and `UI2-017 cold reload closure gate`: SUCCESS on the verified exact head;
- PR remains open and unmerged; no production-impacting product code from this task was merged to `main`;
- no Owner input is required to close this technical task.

## 11. SCHED-UI-004 — Draft/review/publish visual simplification

Preserve business state machine but simplify user presentation.

Required:

- draft editing clearly separated from source availability;
- store/week selector remains discoverable;
- reload/reopen/save are secondary controls;
- conflict results appear next to resolution action;
- REVIEWED state maps to user-facing `Đã duyệt`;
- PUBLISHED maps to `Đã phát hành`;
- final step exposes `Duyệt lịch` then `Phát hành lịch` as appropriate;
- idempotent existing behavior preserved.

Completion evidence — 2026-10-02:

- implementation continued on branch `sched-ui-001-recurring-editor` / PR `#381`;
- verified exact head: `adbc215f789e1fd393e629f7eace64150842731c`;
- source availability is visually separated from the editable weekly draft surface;
- store/week context remains discoverable while reopen/reload/save are secondary draft utilities;
- DRAFT makes `Duyệt lịch` the primary final action, REVIEWED maps to user-facing `Đã duyệt` and makes `Phát hành lịch` primary, and PUBLISHED maps to `Đã phát hành`;
- conflict presentation keeps the conflict result beside a `Tải lại trạng thái` recovery action;
- existing Manager scheduling RPC inventory, writer boundary, server validation, review/publish state machine, and idempotent publish semantics remain unchanged;
- Manager cache chain advanced to `20261002-sched-ui-004` and cold-reload expectations were aligned to the same exact cache version;
- a presentation-layer MutationObserver feedback loop was removed by observing `aria-busy` instead of class mutations while retaining child-list synchronization;
- `SOP Task Tests` PR run `37015278341`: SUCCESS;
- `UI2 Cross Role Acceptance` PR run `37015278397`: SUCCESS;
- `People Shift Day-10 Tests` PR run `37015278485`: SUCCESS;
- `UI2 Cross Role Acceptance` push run `37015272789`: SUCCESS;
- job-level qualification on the verified exact head: Manager responsive matrix, UI2-017 cold reload closure gate, People Shift regression tests, SCHED-01 three-role scheduling browser smoke, and XSTORE four-store master browser E2E: SUCCESS;
- PR remains open and unmerged; no production-impacting product code from this task was merged to `main`;
- no Owner input is required to close this technical task.

## 12. SCHED-UI-005 — Shared canonical time-band classifier

Current source contains divergent implementations:

- Manager local helpers classify from 05:00;
- shared core currently classifies all values before 12:00 as morning.

Implement one canonical classifier:

- 05:00–<12:00 morning;
- 12:00–<17:00 afternoon;
- 17:00–22:00 evening;
- otherwise neutral.

Migrate scheduling callers where practical.

Required tests:

- 04:59 neutral;
- 05:00 morning;
- 11:59 morning;
- 12:00 afternoon;
- 16:59 afternoon;
- 17:00 evening;
- 22:00 evening;
- >22:00 neutral;
- blank/invalid neutral.

Completion evidence — 2026-10-02:

- implementation continued on branch `sched-ui-001-recurring-editor` / PR `#381`;
- verified exact head: `77ac194d421fc07b6435784f2af2bc17baf79111`;
- `MAGASIN_CORE.time.shiftKind()` is now the canonical classifier and Shared Core advanced to version `1.2.2`;
- canonical boundaries are enforced exactly: 05:00–<12:00 morning, 12:00–<17:00 afternoon, 17:00–22:00 evening, otherwise neutral;
- blank, malformed and out-of-range values fail neutral instead of being coerced into a visual band;
- Manager draft/publish, recurring staffing Auto Schedule, and cross-store master surfaces delegate to the shared canonical helper rather than maintaining local minute-threshold classifiers;
- Manager runtime loads Shared Core before the Workforce scheduling engine and waits for both Supabase and `MAGASIN_CORE.time.shiftKind` before scheduling modules load;
- Manager runtime/entry and affected scheduling asset cache chain advanced to `20261002-sched-ui-005` without changing unchanged presentation assets unnecessarily;
- QA fixtures were aligned so Manager/XSTORE browser qualification uses the canonical Shared Core classifier instead of a divergent local mock;
- dedicated contract `09_QA/people-shift/sched-ui-005-time-band-contract.test.mjs` verifies 04:59 neutral, 05:00 morning, 11:59 morning, 12:00 afternoon, 16:59 afternoon, 17:00 evening, 22:00 evening, 22:01 neutral, blank/invalid neutral, and 24:00 neutral;
- durable job log records `SCHED_UI_005_TIME_BAND_CONTRACT=PASS`;
- `SOP Task Tests` PR run `37023817893`: SUCCESS;
- `UI2 Cross Role Acceptance` PR run `37023818090`: SUCCESS;
- `People Shift Day-10 Tests` PR run `37023817728`: SUCCESS;
- `UI2 Cross Role Acceptance` push run `37023811128`: SUCCESS;
- job-level qualification on the verified exact head includes UI2-016 static contract, Manager responsive matrix, UI2-017 cold reload closure gate, People Shift regression tests, SCHED-01 three-role scheduling browser smoke, and XSTORE four-store master browser E2E: SUCCESS;
- PR remains open and unmerged; no production-impacting product code from this task was merged to `main`;
- no Owner input is required to close this technical task.

## 13. SCHED-UI-006 — Employee official schedule time-band integration

Required:

- published shifts visibly use canonical shared colors;
- full time remains readable;
- same time gives same color as Manager/Owner;
- empty week remains neutral;
- desktop/tablet/mobile acceptance;
- existing schedule reader/RPC/state machine unchanged unless necessary for shared presentation helper.

Completion evidence — 2026-10-02:

- implementation continued on branch `sched-ui-001-recurring-editor` / PR `#381`;
- verified exact head: `a04c0f1dec27267d52c5674ab02c58bf2822d33e`;
- Employee official published shifts now delegate visual band classification to canonical `MAGASIN_CORE.time.shiftKind()` rather than maintaining a divergent local time classifier;
- Employee presentation maps all four canonical states explicitly: morning → yellow, afternoon → light red, evening → light blue, and neutral → neutral; neutral no longer falls through to evening;
- published shift cards expose `data-time-band` for durable semantic qualification while preserving the full visible time range;
- Employee runtime loads Shared Core cache `20261002-sched-ui-005` and Employee Schedule cache `20261002-sched-ui-006`;
- existing canonical schedule reader `list_my_approved_schedules_v2`, APPROVED-only projection, ownership preflight, attendance/give/swap actions, and scheduling state machine remain unchanged;
- SCHED-03 QA fixture was aligned to the canonical four-state classifier and opted into the same canonical UI token scope used by the real Employee app;
- durable browser log records `SCHED_03_EMPLOYEE_SCHEDULE_UI=PASS`;
- SCHED-03 mobile qualification verifies canonical morning/evening token colors and full readable times `06:00–12:00` and `17:00–22:00`;
- next-week qualification verifies `12:00–17:00` as canonical afternoon;
- tablet 820px qualification verifies two-column fit, canonical bands, no horizontal overflow, and an empty week with no shift/time-band styling;
- desktop qualification verifies a seven-column week with no horizontal overflow;
- canonical-reader qualification verifies V2 reader only with no direct table or legacy schedule reader;
- `People Shift Day-10 Tests` PR run `37034586626`: SUCCESS;
- `UI2 Cross Role Acceptance` PR run `37034586547`: SUCCESS;
- `SOP Task Tests` PR run `37034586636`: SUCCESS;
- `AUTH-PROD Regression Contract` PR run `37034586616`: SUCCESS;
- `People Shift Day-10 Tests` push run `37034581326`: SUCCESS;
- `UI2 Cross Role Acceptance` push run `37034581385`: SUCCESS;
- job-level qualification: People Shift job `110929515638` and UI2 cross-role job `110929516582`: SUCCESS;
- job-level gates include People Shift regression tests, SCHED-01 three-role scheduling browser smoke, SCHED-03 Employee Schedule UI browser E2E, XSTORE four-store master browser E2E, UI2-016 static contract, accepted role static regressions, Employee responsive matrix, Manager responsive matrix, and UI2-017 cold reload closure gate: SUCCESS;
- PR remains open and unmerged; no production-impacting product code from this task was merged to `main`;
- no Owner input is required to close this technical task.

## 14. SCHED-UI-007 — Employee availability CTA + editor UX

Promote next-week registration to the top scheduling action when relevant.

Required CTA states:

- no saved intervals → `Đăng ký ngay`;
- saved → `Xem / sửa đăng ký`;
- closed → `Xem thời gian đã đăng ký`.

Required editor behavior:

- keep immediate-save authority;
- remove misleading final-submit semantics;
- replace unnecessary `Xong` concept with clear close/back behavior;
- weekly saved intervals receive canonical band colors;
- open/closed/read-only states obvious;
- distinguish `Thời gian có thể làm` from `Lịch làm chính thức`;
- mobile CTA visible without hunting through the page.

Completion evidence — 2026-10-03:

- implementation continued on branch `sched-ui-001-recurring-editor` / PR `#381`;
- verified exact head: `093def2390edfe3b2f022c973caa8861d986bbb6`;
- CTA state contract is verified end-to-end: no saved intervals → `Đăng ký ngay`, saved intervals → `Xem / sửa đăng ký`, closed/read-only → `Xem thời gian đã đăng ký`;
- Employee scheduling distinguishes `Thời gian có thể làm` from `Lịch làm chính thức`, and the availability action is promoted as a visible scheduling action rather than hidden in the page;
- the editor keeps immediate-save authority with no fake final-submit step; explicit close/back behavior replaces the old `Xong` concept;
- all availability CTA surfaces now share the same dynamic state/copy contract, including the CTA inserted by the official schedule shell;
- availability readiness is synchronized before the engine exposes its ready marker, eliminating iframe/bootstrap timing ambiguity;
- saved availability intervals use canonical `MAGASIN_CORE.time.shiftKind()` bands; durable browser evidence verifies morning and evening bands;
- mobile qualification verifies the CTA is visible without horizontal hunting or page-level horizontal overflow;
- canonical availability authority remains unchanged: `get_my_availability`, `save_my_availability`, and `delete_my_availability`; save continues with `p_preferred_store_id:null`; no schema/RPC/RLS/business-authority change or second writer was introduced;
- integrated Day-10 regression was updated to wait for the explicit availability readiness contract and to accept synchronized duplicate CTA surfaces without weakening the actual state/copy assertion;
- `SOP Task Tests` PR run `37056347521`: SUCCESS;
- `AUTH-PROD Regression Contract` PR run `37056347421`: SUCCESS;
- `UI2 Cross Role Acceptance` PR run `37056347500`: SUCCESS;
- `People Shift Day-10 Tests` PR run `37056347425`: SUCCESS;
- `UI2 Cross Role Acceptance` push run `37056342952`: SUCCESS;
- `People Shift Day-10 Tests` push run `37056342939`: SUCCESS;
- People Shift job `111001882867`: SUCCESS with no failed steps;
- dedicated SCHED-UI-007 browser evidence passes `Đăng ký ngay`, close/back without final-submit semantics, mobile CTA visibility, saved `Xem / sửa đăng ký`, and canonical time-band rendering;
- integrated `PEOPLE_SHIFT_DAY10_BROWSER_E2E=PASS` and `employee_availability_registration` PASS with `06:00–12:00`, `preferred_store_id:null`;
- integrated diagnostics report `console_errors=0`, `page_errors=0`, `request_failures=0`, and `http_5xx=0` for the Day-10 flow;
- PR remains open and unmerged; no production-impacting product code from this task was merged to `main`;
- no Owner input is required to close this technical task.

## 15. SCHED-UI-008 — Owner scheduling parity + language cleanup

Owner entry:

- overview CN1–CN4 first;
- each store indicates scheduling readiness/state;
- selecting a store opens shared Manager scheduling concepts/components.

Remove normal user-facing technical text:

- Enterprise oversight;
- canonical;
- writer;
- direct table DML;
- untranslated Availability;
- DRAFT / Validate / Review / Publish labels.

Use Vietnamese UX copy.

Do not create an Owner-specific scheduling writer.

Completion evidence — 2026-10-03:

- implementation continued on branch `sched-ui-001-recurring-editor` / PR `#381`;
- verified exact head: `36489c0c80665015864ca39fc545463bd0fa783e`;
- Owner scheduling is overview-first: CN1–CN4 are shown before detail, with per-store readiness/state derived through the existing scheduling readers;
- selecting a store opens the shared Manager scheduling surface through the existing shared scheduling component/API; no Owner-specific scheduling writer, schema, RPC, or parallel mutation authority was introduced;
- normal Owner scheduling UX uses Vietnamese operational copy and removes the specified technical labels/phrases from normal presentation;
- shared scheduling detail and tabs remain hidden before store selection, with explicit keyboard focus and mobile-safe controls on the overview/drill-down path;
- historical SCHED-01, SCHED-02, SCHED-05, SCHED-07, UI2-015, UI2-016, and UI2-017 regression contracts were advanced to the overview-first Owner presentation while retaining canonical reader/writer and role-authority assertions;
- successful exact-head durable CI: Procurement QA Robot PR `37064009841`, SOP Task Tests PR `37064010017`, AUTH-PROD Regression Contract PR `37064009849`, UI2 Cross Role Acceptance PR `37064009850`, People Shift Day-10 Tests PR `37064010001`, Owner Control Tower Tests PR `37064010013`, UI2 Cross Role Acceptance push `37064004875`, People Shift Day-10 Tests push `37064004912`;
- PR remains open and unmerged; no production-impacting product code from this task was merged to `main`;
- no Owner input is required to close this technical task.

## 16. SCHED-UI-009 — Canonical clean route scaffolding

Create safe user-facing route entrypoints:

- `/manager/`
- `/manager/scheduling/`
- `/manager/schedule/`
- `/employee/`
- `/employee/schedule/`
- `/employee/attendance/`
- `/employee/payroll/`
- `/owner/`
- `/owner/scheduling/`

At this task:

- scaffold canonical routes;
- preserve numbered internal implementations;
- route guards stay fail-closed;
- direct links and reload must resolve;
- no Auth cutover yet unless required by the scaffold.

Completion evidence — 2026-10-03:

- implementation continued on branch `sched-ui-001-recurring-editor` / PR `#381`;
- verified exact head: `cfec0e5d62c17da7b29bc4cd21da18375f96a040`;
- clean guarded entrypoints exist for `/manager/`, `/manager/scheduling/`, `/manager/schedule/`, `/employee/`, `/employee/schedule/`, `/employee/attendance/`, `/employee/payroll/`, `/owner/`, and `/owner/scheduling/`;
- all clean routes delegate to preserved numbered implementations through one allowlisted shared route adapter; no duplicate Manager, Employee, Owner, scheduling runtime, or scheduling writer was introduced;
- route guards remain fail-closed: logged-out access returns to Auth and wrong-role access resolves to the existing role-unavailable path;
- direct clean-route HTTP entry and repeat direct reload were qualified by the SCHED-UI-009 browser gate;
- Auth role routing was intentionally not migrated in this task and remains reserved for SCHED-UI-010;
- SCHED-UI-009 static contract and browser gate were added to the UI2 Cross Role workflow, including workflow path coverage for the new clean route directories and shared route adapter;
- exact-head SCHED-UI-009 clean route browser step passed in UI2 Cross Role Acceptance PR run `37065482177`, job `111032131471`, step 16;
- successful exact-head durable CI: Procurement QA Robot PR `37065482015`, SOP Task Tests PR `37065481937`, AUTH-PROD Regression Contract PR `37065481936`, Owner Control Tower Tests PR `37065482287`, UI2 Cross Role Acceptance PR `37065482177`, People Shift Day-10 Tests PR `37065482003`, UI2 Cross Role Acceptance push `37065475077`;
- PR remains open and unmerged; no production-impacting product code from this task was merged to `main`;
- no Owner input is required to close this technical task.

## 17. SCHED-UI-010 — Auth/navigation migration + compatibility

Update:

- Auth role routing;
- Manager navigation;
- Employee navigation;
- Owner navigation;
- cross-links.

Canonical visible URLs become preferred.

Old numbered entrypoints remain compatibility redirects/bridges during this track.

Required:

- no redirect loop;
- authenticated role separation preserved;
- back/forward/reload green;
- old bookmarks remain safe;
- unauthorized access remains denied.

Completion evidence — 2026-10-03:

- implementation completed on branch `sched-ui-001-recurring-editor` / PR `#381`;
- verified exact head: `ca3e1155374f178de2a21fc81b1402eb23ef2954`;
- Auth role routing now prefers clean role entrypoints for Owner, Store Manager and Staff/Employee while preserving fail-closed role handling;
- Manager, Employee and Owner navigation/cross-links prefer canonical visible URLs, including `/manager/`, `/manager/scheduling/`, `/manager/schedule/`, `/manager/#tasks`, `/employee/`, `/employee/schedule/`, `/employee/attendance/`, `/employee/payroll/`, `/owner/`, and `/owner/scheduling/`;
- numbered Manager, Employee and Owner entrypoints remain compatibility bridges and migrate old bookmarks to clean canonical URLs after role validation without replacing the existing numbered runtimes;
- Manager route ownership was hardened so the canonical bridge is the single browser-history owner and late shell/bootstrap updates cannot revert the active view; Manager Task legacy entry also seeds `#tasks` into the preserved runtime;
- Employee clean-route rewriting is scoped to app roots so standalone inner-runtime fixtures remain stable;
- unauthorized/wrong-role access remains denied or redirected to the existing role-unavailable/Auth flow;
- dedicated SCHED-UI-010 static contract passed in UI2 Cross Role Acceptance PR run `37073201522`;
- dedicated `Run SCHED-UI-010 Auth/navigation compatibility gate` passed in UI2 Cross Role Acceptance PR run `37073201522`, job `111057180770`, step 17, covering clean routes, back/forward/reload, numbered-bookmark migration and unauthorized-role denial;
- Manager Task deep-link browser smoke passed in SOP Task Tests PR run `37073201516`, job `111057180595`, step 7, verifying stable `/manager/#tasks` after bootstrap;
- Owner Control Tower browser E2E passed in PR run `37073201490`, job `111057180612`, step 7;
- successful exact-head durable CI: Procurement QA Robot PR `37073201537`, SOP Task Tests PR `37073201516`, AUTH-PROD Regression Contract PR `37073201553`, Auth Password Reset Hotfix PR `37073201489`, UI2 Cross Role Acceptance PR `37073201522`, People Shift Day-10 Tests PR `37073201482`, Owner Control Tower Tests PR `37073201490`, and UI2 Cross Role Acceptance push `37073196648`;
- PR remains open and unmerged; no production merge/release was performed;
- no Owner input is required to close this technical task.

## 18. SCHED-UI-011 — Responsive/mobile scheduling redesign

Required widths:

- representative phone ~360/390/430;
- tablet ~768/1024;
- desktop ~1440 and wide.

Rules:

- no page-level horizontal overflow;
- recurring staffing editing becomes card/panel on phone;
- draft schedule becomes readable stacked/day layout where needed;
- 44px minimum touch targets for primary interactive controls;
- sticky/fixed UI must not cover actions;
- desktop may use internal board scroll only where necessary.

Completion evidence — 2026-10-03:

- implementation completed on branch `sched-ui-001-recurring-editor` / PR `#381`;
- verified exact head: `6b967461fc03f0ac39ca763d8ef72478b8a7a446`;
- representative widths qualified: phone `360/390/430`, tablet `768/1024`, desktop `1440+`;
- Manager draft scheduling stacks to one-day/one-column presentation on phone, retains contained internal board scrolling on tablet, and restores the seven-day board on desktop;
- recurring staffing setup becomes store/day cards on phone with an inline, non-fixed editor; tablet retains a contained internal board scroll and desktop remains non-overflowing;
- primary scheduling controls meet the `44px` touch-target contract at tablet/phone sizes;
- page-level horizontal overflow is prevented across the required responsive widths, including the corrected recurring staffing containment path at `1024px`;
- sticky/fixed scheduling UI no longer covers phone actions; recurring editor is inline at phone widths;
- responsive browser qualification preserves required XSTORE RPC evidence across fixture reloads without weakening required/forbidden RPC contracts;
- `SCHED_UI_011_RESPONSIVE_CONTRACT=PASS`;
- `SCHED_UI_011_RECURRING_RESPONSIVE=PASS` and `XSTORE_RECURRING_STABLE_EDITOR_BROWSER=PASS` in People Shift Day-10 PR run `37078473617`, job `111073547870`, step 35;
- `SCHED_UI_011_DRAFT_RESPONSIVE=PASS` and `UI2_012_MANAGER_SCHEDULING_BROWSER=PASS` in People Shift Day-10 PR run `37078473617`, job `111073547870`, and UI2 Cross Role Acceptance PR run `37078473647`, job `111073548127`, step 13;
- successful exact-head durable CI: Procurement QA Robot PR `37078473752`, Auth Password Reset Hotfix PR `37078473684`, SOP Task Tests PR `37078473610`, AUTH-PROD Regression Contract PR `37078473701`, Owner Control Tower Tests PR `37078473750`, UI2 Cross Role Acceptance PR `37078473647`, People Shift Day-10 Tests PR `37078473617`, UI2 Cross Role Acceptance push `37078470138`, and People Shift Day-10 Tests push `37078470243`;
- PR remains open and unmerged; no production merge/release was performed;
- no Owner input is required to close this technical task.

## 19. SCHED-UI-012 — Accessibility, states and Vietnamese copy

Audit all changed scheduling surfaces for:

- focus-visible;
- keyboard reachability;
- disabled reason text;
- loading;
- empty;
- error;
- success;
- destructive action clarity;
- color-independent labels;
- Vietnamese user language.

No normal user-facing:

- canonical;
- RPC;
- writer;
- DML;
- server;
- implementation-state jargon.

Completion evidence — 2026-10-03:

- implementation completed on branch `sched-ui-001-recurring-editor` / PR `#381`;
- verified exact head: `3a7d2c10817510001c342b277f324d1593a7df89`;
- recurring staffing now has keyboard-reachable tab navigation, focus-visible treatment, explicit loading/error/success live regions, explicit empty copy, clear destructive wording, focus restoration, and color-independent `Ca sáng / Ca chiều / Ca tối` labels;
- Manager draft/publish scheduling now exposes disabled-action reason text, accessible week navigation labels, clearer destructive copy, live status semantics, and user-facing `bản nháp / lịch nháp` language instead of implementation-state wording;
- Manager scheduling state banner uses accessible live status semantics and user-facing conflict/busy wording;
- Owner scheduling overview now includes explicit loading, empty, retryable error and focus-return behavior without creating a parallel scheduling writer;
- Employee schedule temporarily disabled actions now explain the reason while current shift state is revalidated;
- changed normal-user scheduling surfaces were qualified against prohibited implementation jargon: `canonical`, `RPC`, `writer`, `DML`, `server`;
- `SCHED_UI_012_ACCESSIBILITY_COPY_CONTRACT=PASS` in People Shift Day-10 PR run `37092582111`, job `111115856027`, and UI2 Cross Role Acceptance PR run `37092582118`, job `111115856095`;
- `UI2_012_MANAGER_SCHEDULING_BROWSER=PASS` on both exact-head PR runs after aligning NONE/busy/conflict copy and waiting for settled published state before idempotent retry;
- Employee schedule UI browser, Manager scheduling browser, Owner scheduling browser, responsive qualification and full People Shift Day-10 browser E2E all passed on exact head;
- successful exact-head durable CI: Procurement QA Robot PR `37092582097`, Auth Password Reset Hotfix PR `37092582110`, SOP Task Tests PR `37092582109`, Owner Control Tower Tests PR `37092582128`, AUTH-PROD Regression Contract PR `37092582117`, UI2 Cross Role Acceptance PR `37092582118`, People Shift Day-10 Tests PR `37092582111`, UI2 Cross Role Acceptance push `37092578746`, and People Shift Day-10 Tests push `37092578770`;
- PR remains open and unmerged; no production merge/release was performed;
- no Owner input is required to close this technical task.

## 20. SCHED-UI-013 — Focused regression hardening

Add/update tests covering:

- recurring editor add/remove/save/reload;
- no clipped-time DOM contract where testable;
- shared time-band boundaries;
- employee schedule bands;
- employee availability CTA states;
- availability immediate-save semantics;
- Owner copy/overview contract;
- canonical routes;
- old-route compatibility;
- Auth route destinations;
- responsive overflow/touch targets;
- cold reload/back-forward.

Do not weaken existing authority/security tests to make the UI pass.

Completion evidence — 2026-10-03:

- focused regression hardening completed on branch `sched-ui-001-recurring-editor` / PR `#381`;
- verified exact head: `9b093608d4521e9c55bdd6cd0ed2907da50c83b3`;
- added aggregate focused regression contract covering recurring add/remove/save/reload, shared time-band boundaries, Employee schedule bands, Employee availability CTA/immediate-save semantics, Owner overview/copy authority, canonical routes, old-route compatibility, Auth destinations, responsive overflow/touch targets, and cold reload/back-forward;
- recurring browser qualification now fails if visible recurring time text is clipped at representative responsive widths and preserves the existing recurring add/remove/save/reload lifecycle evidence;
- `SCHED_UI_013_FOCUSED_REGRESSION_CONTRACT=PASS` in People Shift Day-10 PR run `37094311373`, job `111120980794`, and UI2 Cross Role Acceptance PR run `37094311438`, job `111120981243`;
- `SCHED_UI_013_RECURRING_EDITOR_REGRESSION=PASS`, `SCHED_UI_011_RECURRING_RESPONSIVE=PASS`, and `XSTORE_RECURRING_STABLE_EDITOR_BROWSER=PASS` in People Shift Day-10 PR run `37094311373`;
- `SCHED_03_EMPLOYEE_SCHEDULE_UI=PASS` and `EMPLOYEE_AVAILABILITY_CANONICAL_BROWSER=PASS` verified Employee official schedule bands, availability CTA states, immediate-save semantics and reload/delete behavior;
- `SCHED_UI_010_AUTH_NAVIGATION_BROWSER=PASS` and `UI2_017_COLD_RELOAD_CLOSURE=PASS` verified canonical/compatibility routes plus reload/back-forward behavior;
- all exact-head durable CI succeeded: Procurement QA Robot PR `37094311358`, Auth Password Reset Hotfix PR `37094311351`, SOP Task Tests PR `37094311359`, Owner Control Tower Tests PR `37094311315`, AUTH-PROD Regression Contract PR `37094311339`, UI2 Cross Role Acceptance PR `37094311438`, People Shift Day-10 Tests PR `37094311373`, UI2 Cross Role Acceptance push `37094308833`, and People Shift Day-10 Tests push `37094308840`;
- existing authority/security and fail-closed tests were preserved; no product authority was weakened to satisfy UI qualification;
- PR remains open and unmerged; no production merge/release was performed;
- no Owner input is required to close this technical task.

## 21. SCHED-UI-014 — Integrated cross-role browser qualification

Use exact candidate branch/head.

Qualify together:

- Manager recurring staffing;
- Manager guided weekly scheduling;
- Auto Schedule prerequisites;
- draft/edit/check/review/publish;
- Employee official schedule;
- Employee availability registration;
- Owner overview/drill-down;
- canonical routes;
- old compatibility routes;
- representative responsive widths;
- console/page/request/5xx diagnostics.

No production merge.

Completion evidence — 2026-10-03:

- integrated cross-role qualification completed on branch `sched-ui-001-recurring-editor` / PR `#381`;
- exact candidate head verified: `c00c29ba45e31a5ee0ce76722f6210ac22064021`;
- UI2 Cross Role Acceptance PR run `37094932202`, job `111122814169`, explicitly checked out the pull-request head SHA and passed step `Run SCHED-UI-014 exact-head integrated cross-role qualification`;
- integrated runner verified candidate SHA equality before execution and emitted `SCHED_UI_014_CANDIDATE_SHA=c00c29ba45e31a5ee0ce76722f6210ac22064021`;
- `SCHED_UI_014_INTEGRATED_CROSS_ROLE_BROWSER=PASS`;
- integrated cases passed together for: Manager recurring staffing + Auto Schedule prerequisites; Manager guided weekly scheduling + draft/edit/check/review/publish; Employee official schedule; Employee availability registration; Owner overview/drill-down; canonical routes; compatibility/Auth routes; representative responsive widths/touch targets; console/page/request/5xx diagnostics;
- supporting exact-head markers included `SCHED_07_UI_RESPONSIVE=PASS`, `UI2_012_MANAGER_SCHEDULING_BROWSER=PASS`, `SCHED_UI_009_CLEAN_ROUTES_BROWSER=PASS`, and `SCHED_UI_010_AUTH_NAVIGATION_BROWSER=PASS`;
- integrated qualification artifact `ui2-016-cross-role-37094932202` was produced for the successful PR run;
- all exact-head durable CI succeeded: Procurement QA Robot PR `37094932201`, Auth Password Reset Hotfix PR `37094932198`, SOP Task Tests PR `37094932203`, Owner Control Tower Tests PR `37094932239`, AUTH-PROD Regression Contract PR `37094932358`, UI2 Cross Role Acceptance PR `37094932202`, People Shift Day-10 Tests PR `37094932204`, and UI2 Cross Role Acceptance push `37094929353`;
- PR remains open and unmerged; no production merge/release was performed;
- no Owner input is required to close this technical task.

## 22. SCHED-UI-015 — Preview/Staging + automated RC qualification packet

Create a real pre-production inspection target under Production Release Governance.

Required packet:

- release ID;
- branch;
- PR;
- exact candidate SHA;
- Preview/Staging URL or equivalent isolated browser target;
- required workflow run IDs/conclusions;
- known limitations;
- deferred Owner queue;
- current production rollback SHA candidate;
- planned 00:00 release window.

Required gates where path-relevant:

- Validate MAGASIN GitHub Pages source;
- UI2 Cross Role Acceptance;
- People Shift Day-10;
- SOP Task Tests;
- AUTH-PROD Regression Contract;
- Auth Password Reset;
- Owner Control Tower;
- Procurement only if affected;
- XSTORE/domain-specific regression.

Successful result:

`PREVIEW_READY / OWNER_REVIEW_REQUIRED`

Robot stops only at the Owner gate after all possible technical work is complete.

Completion evidence — 2026-10-03:

- release ID: `REL-20261003-01`;
- product branch: `sched-ui-001-recurring-editor`;
- product PR: `#381`;
- exact product candidate SHA: `c00c29ba45e31a5ee0ce76722f6210ac22064021`;
- isolated preview-infrastructure branch: `preview/sched-ui-015-rel-20261003-01`;
- Preview/RC workflow run: `37095865407`, job `111125539606`, conclusion `success`;
- equivalent isolated Preview target/evidence: GitHub Actions run `37095865407` plus downloadable artifact `sched-ui-015-preview-site-37095865407` (artifact ID `11264047273`);
- RC packet/evidence artifact: `sched-ui-015-rc-packet-37095865407` (artifact ID `11264441792`);
- exact candidate verification marker: `SCHED_UI_015_CANDIDATE_SHA=c00c29ba45e31a5ee0ce76722f6210ac22064021`;
- GitHub Pages source qualification: `SCHED_UI_015_PAGES_SOURCE_VALIDATION=PASS`;
- required exact-head workflow evidence: `SCHED_UI_015_REQUIRED_WORKFLOWS=PASS`;
- isolated Preview artifact build: `SCHED_UI_015_PREVIEW_ARTIFACT_BUILD=PASS`;
- isolated browser target: `SCHED_UI_015_ISOLATED_BROWSER_TARGET=READY`;
- exact-candidate integrated cross-role browser qualification: `SCHED_UI_014_INTEGRATED_CROSS_ROLE_BROWSER=PASS`;
- RC packet marker: `SCHED_UI_015_RC_PACKET=PASS`;
- final automated result: `PREVIEW_READY / OWNER_REVIEW_REQUIRED` and `SCHED_UI_015_PREVIEW_RC=PREVIEW_READY_OWNER_REVIEW_REQUIRED`;
- exact-head required workflows recorded by the RC packet were successful: UI2 Cross Role Acceptance `37094932202`; People Shift Day-10 Tests `37094932204`; SOP Task Tests `37094932203`; AUTH-PROD Regression Contract `37094932358`; Auth Password Reset Hotfix `37094932198`; Owner Control Tower Tests `37094932239`; Procurement QA Robot `37094932201`;
- current production rollback SHA candidate recorded at qualification time: `1ff161f3cb97a54e502560314b791c1cd7d16524`;
- PR #381 has no `07_DATABASE`, migration, RPC, RLS or Supabase changes, so dedicated backend staging is not applicable for this candidate;
- planned normal release window: `2026-10-04 00:00 Asia/Ho_Chi_Minh`; if Owner approval / RC freeze is not complete before that window, use the next eligible 00:00 window;
- known limitation: this track uses the SOT-authorized equivalent isolated browser target and downloadable exact-candidate Preview artifact rather than a public hosted staging URL;
- deferred Owner queue for SCHED-UI-016: Manager recurring/guided weekly flow; Employee official schedule/availability; Owner overview/drill-down; canonical URLs/compatibility; mobile/responsive behavior; exact candidate/release summary;
- no production business truth was mutated during Preview qualification; no production merge/release occurred.

## 23. SCHED-UI-016 — Deferred Owner Preview review

**This is intentionally near the end.**

Present to Owner:

- Preview URL;
- Manager flow;
- Employee flow;
- Owner flow;
- canonical URLs;
- mobile behavior;
- deferred Owner queue, if any;
- release summary.

Possible result:

- `APPROVED`
- `CHANGES_REQUESTED`

Owner review result — 2026-10-03:

- result: `CHANGES_REQUESTED`;
- Owner generally approved the integrated Scheduling UX V2 direction;
- one visible correction remains before final approval: the Manager scheduling overview at `/manager/scheduling/`, tab/surface `Đăng ký thời gian có thể làm`, currently presents employee availability cards with effectively uniform styling instead of the locked shared time-band colors;
- this correction is `OWNER-CORRECTION-001` and is executable under SCHED-UI-017;
- after the corrected Preview is rebuilt, return this visible Manager surface to Owner review because the change is materially visible.

Do not release without explicit Owner approval of the corrected Preview/exact candidate.

## 24. SCHED-UI-017 — Owner corrections + exact RC freeze

**Current state: DONE / VERIFIED / OWNER APPROVED / RC FROZEN**

Required correction for this cycle — `OWNER-CORRECTION-001`:

- target the Manager scheduling overview at `/manager/scheduling/`, specifically the cross-employee weekly `Đăng ký thời gian có thể làm` cards visible in the 2026-10-03 Owner Preview review;
- apply the existing shared canonical start-time classifier to these Manager overview cards; do not add another local/divergent classifier;
- visible color mapping must be:
  - `05:00 <= start < 12:00` → yellow;
  - `12:00 <= start < 17:00` → light red;
  - `17:00 <= start <= 22:00` → light blue;
  - invalid/outside range → neutral;
- classification is by **start time**, consistent with the locked shared rule; therefore a cross-band availability such as `06:00–22:00` is a morning/yellow card, while `12:00–22:00` is light red and `17:00–22:00` is light blue;
- preserve readable time/name text, accessibility, mobile behavior and all existing scheduling/business authority;
- add or extend regression coverage proving Manager overview rendering for representative morning/afternoon/evening boundaries and at least one cross-band interval;
- verify the corrected surface in the integrated browser qualification and produce a new exact-candidate Preview for Owner re-review.

If Owner requested changes:

- implement corrections off main;
- rerun affected QA;
- update Preview;
- return to Owner review if visible behavior materially changed.

When approved:

- freeze exact RC SHA;
- record all green gates;
- record rollback production SHA;
- prepare release packet.

No silent change after freeze.

Completion evidence — 2026-10-03:

- Owner explicitly approved the corrected SCHED-UI-017 local review after checking the candidate with real MAGASIN authentication and role/data reads; the local review guard blocked production data mutations;
- exact frozen RC SHA: `1f6f6cf0646aba66e9f73fab123f87a182cb17c1`;
- PR `#381` remains open/unmerged and its head is exactly the frozen RC SHA;
- production product baseline at freeze: `7007ed773fe37a25950f819278eec080811a6412`; post-freeze authority-only commits are permitted only when their diff from this baseline is confined to this SOT file;
- exact-head required workflows on the frozen RC are all GREEN:
  - `Auth Password Reset Hotfix` run `37134581020`: SUCCESS;
  - `SOP Task Tests` run `37134581077`: SUCCESS;
  - `Owner Control Tower Tests` run `37134581043`: SUCCESS;
  - `AUTH-PROD Regression Contract` run `37134581106`: SUCCESS;
  - `UI2 Cross Role Acceptance` run `37134581060`: SUCCESS;
  - `People Shift Day-10 Tests` run `37134581111`: SUCCESS;
  - `Procurement QA Robot` run `37134581109`: SUCCESS;
- integrated exact-head cross-role/browser qualification inside `UI2 Cross Role Acceptance` is GREEN;
- corrected exact-candidate Preview run `37134994384`: SUCCESS;
- Preview artifact: `sched-ui-017-preview-site-37134994384` (artifact id `11278591594`);
- RC/evidence artifact: `sched-ui-017-rc-packet-37134994384` (artifact id `11278571703`);
- OWNER-CORRECTION-001 is accepted: Manager `Đăng ký thời gian có thể làm` uses the canonical start-time band mapping, including the cross-band start-time rule;
- RC is now frozen. No code, test, cache-token or release-packet change may be added to this RC without returning to Owner review.

## 25. SCHED-UI-018 — Midnight production release

**Current state: READY — NEXT AUTHORITATIVE TASK · RELEASE ONLY IN ELIGIBLE 00:00 ASIA/HO_CHI_MINH WINDOW**

Frozen release inputs from SCHED-UI-017:

- approved RC SHA: `1f6f6cf0646aba66e9f73fab123f87a182cb17c1`;
- approved product PR: `#381`;
- product baseline at freeze: `7007ed773fe37a25950f819278eec080811a6412`;
- immediately before merge, set the rollback SHA to the then-current `main` only after proving all post-freeze drift from the product baseline is confined to this SOT file; any other main drift is unexpected and blocks release;
- corrected Preview run: `37134994384`;
- Owner approval: recorded 2026-10-03;
- any RC SHA drift, any product-code drift on `main`, or any post-freeze change outside this SOT file invalidates the release and requires stop/re-review.

Governed by:

`PRODUCTION_RELEASE_GOVERNANCE_V1_SOURCE_OF_TRUTH.md`

Normal window:

`00:00 Asia/Ho_Chi_Minh`

Before merge:

- confirm RC unchanged;
- confirm required gates green;
- confirm rollback SHA;
- confirm production baseline has not unexpectedly moved;
- merge/deploy exact approved candidate.

No unreviewed “small fix” may be bundled.

## 26. SCHED-UI-019 — Production smoke + permanent acceptance + TEMP cleanup

Verify exact-main:

- Pages source;
- Pages deployment;
- Manager scheduling;
- Employee schedule/availability;
- Owner scheduling;
- canonical routes;
- compatibility routes;
- Auth routing;
- affected QA;
- console/page/request/5xx;
- no unexpected business mutation.

Create:

`01_DOCS/MAGASIN/05_SYSTEM/WORKFORCE_SCHEDULING_UX_V2_ACCEPTANCE_2026_10_02.md`

Permanent acceptance records:

- original 6 Owner issues + discovered technical-language issue;
- final design;
- final time-band rule;
- canonical route map;
- Preview URL;
- Owner approval;
- RC SHA;
- rollback SHA;
- production merge SHA;
- workflow/run IDs;
- production smoke;
- confirmation XSTORE business authority was not replaced.

Then delete this TEMP SOT in the same closure PR and verify permanent evidence on main.

## 27. Robot discovery/execution protocol

### Discovery

Re-read this file from the beginning.

Use this file as the sole task-state authority for `WORKFORCE_SCHEDULING_UX_V2`.

Identify exactly one executable task ID.

### Execution

For a supplied task ID:

- validate against live SOT;
- execute only that task;
- verify concrete completion evidence;
- update SOT;
- use branch/PR;
- keep production-impacting product work off main until SCHED-UI-018.

### Status semantics

- `READY` — task can execute now;
- `RUNNING` — durable CI/preview process genuinely still running;
- `COMPLETE` — task evidence verified and SOT updated;
- `BLOCKED` — only for real unresolved dependency/authority issue;
- `DONE` — entire track closed.

### Owner deferral rule

Do not stop technical work for preferences already answered by the Design Lock.

Do not repeatedly ask the Owner questions during SCHED-UI-001→015.

Collect non-critical new Owner-only questions for SCHED-UI-016.

## 28. Current authoritative next state

`SCHED-UI-000 = DONE / OWNER APPROVED`

`SCHED-UI-001 = DONE / VERIFIED`

`SCHED-UI-002 = DONE / VERIFIED`

`SCHED-UI-003 = DONE / VERIFIED`

`SCHED-UI-004 = DONE / VERIFIED`

`SCHED-UI-005 = DONE / VERIFIED`

`SCHED-UI-006 = DONE / VERIFIED`

`SCHED-UI-007 = DONE / VERIFIED`

`SCHED-UI-008 = DONE / VERIFIED`

`SCHED-UI-009 = DONE / VERIFIED`

`SCHED-UI-010 = DONE / VERIFIED`

`SCHED-UI-011 = DONE / VERIFIED`

`SCHED-UI-012 = DONE / VERIFIED`

`SCHED-UI-013 = DONE / VERIFIED`

`SCHED-UI-014 = DONE / VERIFIED`

`SCHED-UI-015 = DONE / VERIFIED / PREVIEW_READY`

`SCHED-UI-016 = DONE / CHANGES_REQUESTED / OWNER-CORRECTION-001 RECORDED`

`SCHED-UI-017 = DONE / VERIFIED / OWNER APPROVED / RC FROZEN`

`SCHED-UI-018 = READY / NEXT AUTHORITATIVE TASK / EXECUTE ONLY IN ELIGIBLE 00:00 RELEASE WINDOW`

`SCHED-UI-019 = BLOCKED BY 018`

Robot must execute only SCHED-UI-018 next, and only in an eligible `00:00 Asia/Ho_Chi_Minh` production release window. Before merge/deploy, re-confirm the frozen RC SHA, all required GREEN gates, rollback SHA and unchanged production baseline. Merge/deploy only the exact Owner-approved candidate; do not bundle any unreviewed fix.

Do not execute SCHED-UI-011 or later before SCHED-UI-010 is complete.

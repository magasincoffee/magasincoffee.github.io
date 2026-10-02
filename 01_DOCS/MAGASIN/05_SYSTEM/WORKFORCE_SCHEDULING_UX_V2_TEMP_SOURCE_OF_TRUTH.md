# MAGASIN — Workforce Scheduling UX V2 — TEMP SOURCE OF TRUTH

**Track:** WORKFORCE_SCHEDULING_UX_V2  
**Task prefix:** SCHED-UI  
**Lifecycle:** TEMPORARY — delete only after SCHED-UI-019 closes and permanent acceptance exists.  
**Owner report date:** 2026-10-02  
**Design approval date:** 2026-10-02  
**Status:** SCHED-UI-000 DONE / SCHED-UI-001 DONE / SCHED-UI-002 DONE / SCHED-UI-003 DONE / SCHED-UI-004 DONE / SCHED-UI-005 READY / SCHED-UI-006→015 BLOCKED BY DEPENDENCY / SCHED-UI-016 DEFERRED OWNER GATE / SCHED-UI-017→019 BLOCKED BY RELEASE ORDER

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

- **OWNER-GATE-001:** inspect integrated Preview and approve/request changes — handled by SCHED-UI-016.

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
| SCHED-UI-005 | Shared canonical time-band classifier | **READY / NEXT AUTHORITATIVE TASK** |
| SCHED-UI-006 | Employee official schedule time-band integration | **BLOCKED BY 005** |
| SCHED-UI-007 | Employee availability CTA + editor UX | **BLOCKED BY 006** |
| SCHED-UI-008 | Owner overview/drill-down scheduling parity + language cleanup | **BLOCKED BY 007** |
| SCHED-UI-009 | Canonical clean role/deep-route scaffolding | **BLOCKED BY 008** |
| SCHED-UI-010 | Auth/navigation migration + old-route compatibility | **BLOCKED BY 009** |
| SCHED-UI-011 | Responsive/mobile scheduling redesign | **BLOCKED BY 010** |
| SCHED-UI-012 | Accessibility, states and Vietnamese copy hardening | **BLOCKED BY 011** |
| SCHED-UI-013 | Focused regression tests for changed scheduling contracts | **BLOCKED BY 012** |
| SCHED-UI-014 | Integrated cross-role browser qualification on release branch | **BLOCKED BY 013** |
| SCHED-UI-015 | Preview/Staging build + automated RC qualification packet | **BLOCKED BY 014** |
| SCHED-UI-016 | Deferred Owner Preview review / all Owner-only questions | **DEFERRED OWNER GATE / BLOCKED BY 015** |
| SCHED-UI-017 | Apply Owner corrections if any + freeze exact RC | **BLOCKED BY 016** |
| SCHED-UI-018 | Midnight production release | **BLOCKED BY 017 / RELEASE WINDOW** |
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

## 13. SCHED-UI-006 — Employee official schedule time-band integration

Required:

- published shifts visibly use canonical shared colors;
- full time remains readable;
- same time gives same color as Manager/Owner;
- empty week remains neutral;
- desktop/tablet/mobile acceptance;
- existing schedule reader/RPC/state machine unchanged unless necessary for shared presentation helper.

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

Do not release without explicit Owner approval of the Preview/exact candidate.

## 24. SCHED-UI-017 — Owner corrections + exact RC freeze

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

## 25. SCHED-UI-018 — Midnight production release

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

`SCHED-UI-005 = READY / NEXT AUTHORITATIVE TASK`

All later technical tasks remain blocked by dependency until their predecessor closes.

Owner approval is intentionally deferred to SCHED-UI-016 after Preview and automated qualification are complete.

Do not execute SCHED-UI-006 or later before SCHED-UI-005 is complete.

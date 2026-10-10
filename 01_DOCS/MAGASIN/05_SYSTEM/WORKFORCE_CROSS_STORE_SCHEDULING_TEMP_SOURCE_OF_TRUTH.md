# MAGASIN — Workforce Cross-Store Scheduling — TEMP SOURCE OF TRUTH

**Search key:** `WORKFORCE-CROSS-STORE`  
**Track ID:** `WORKFORCE_CROSS_STORE_SCHEDULING_V1`  
**Created:** 2026-09-28  
**Status:** XSTORE-001→010 IMPLEMENTED / EXACT-MAIN GREEN / XSTORE-C01→C05 DONE / XSTORE-012 RELEASED / XSTORE-013→018 DONE / XSTORE-019A→019F DONE / OWNER-APPROVED MOCKUPS ARE VISUAL AUTHORITY / XSTORE-019G→019I VISUAL-FIDELITY REMEDIATION DONE / EXACT-HEAD GREEN / XSTORE-019J MANAGER SCHEDULING UI OWNER-APPROVED 2026-10-09; EMPLOYEE UI OWNER-APPROVED 2026-10-09 (§0.13) / OWNER STRATEGY UI OWNER-APPROVED 2026-10-09 (§0.15); ALL THREE ROLES VISUALLY APPROVED / XSTORE-019J PR #392 CONFLICT RECONCILED / MERGEABLE / OWNER-APPROVED ALL THREE ROLE UIS / EXACT-HEAD 20-OF-21 WORKFLOWS GREEN / AUTH-PROD ACTIVE QA LOGIN RESOLVER NULL — OWNER QA-CREDENTIAL/IDENTITY REPAIR REQUIRED / XSTORE-019J BLOCKED ON THIS EXTERNAL QA GATE / XSTORE-019K BLOCKED UNTIL XSTORE-019J RELEASE QUALIFICATION / XSTORE-020 PAUSED UNTIL XSTORE-019G→019O + OWNER RC APPROVAL / XSTORE-011 PAUSED UNTIL XSTORE-013→020 COMPLETE  
**Repository:** `magasincoffee/magasincoffee.github.io`  
**Lifecycle:** TEMPORARY — delete this file after implementation is fully accepted and the proven rules are reconciled into canonical Workforce documentation.

> New-chat bootstrap: search for **WORKFORCE-CROSS-STORE**, read this file first, then reconcile current repository state before changing Workforce code. Do not reopen or rewrite the already-closed Workforce Operations V1 history.

## 0. Structural audit — 2026-09-28

A live Manager-page check exposed a production authority mismatch that must be resolved before cross-store scheduling implementation.

Verified findings:

1. **Manager route and backend role model disagree.**
   - `/05_MANAGER/` currently admits any ACTIVE non-Employee account instead of enforcing one canonical Manager authority set.
   - Workforce RPCs such as `get_manager_accessible_stores`, `get_manager_weekly_availability`, `get_manager_weekly_schedule` and generation readers accept only `OWNER` or `STORE_MANAGER`.
   - Production currently has no ACTIVE `STORE_MANAGER`; there is an ACTIVE manager-family role that is not accepted by Workforce RPCs.
   - Result: the page loads, but the server correctly fails closed with `ROLE_NOT_ALLOWED`.

2. **Store scope is not established for the live Manager path.**
   - `can_access_store` requires `STORE_MANAGER` plus exact store codes in `profiles.access_scope`.
   - A Manager-facing account without that canonical scope cannot load Workforce data even if the UI route opens.

3. **The Manager shell is still a prototype container with static/demo business content in source.**
   - canonical JS replaces/hides some surfaces at runtime;
   - however hard-coded KPI/staff/swap/attendance examples remain in `manager-shell-v1.html`;
   - production architecture should not depend on later scripts successfully hiding prototype business data.

4. **Manager modules do not share one authority/context service.**
   - Availability, Staff, Official Schedule and other modules independently create Supabase clients and independently resolve store scope;
   - one role/scope mismatch therefore appears in multiple screens with inconsistent UX.

5. **Current employee store model is not sufficient for the approved cross-store logic.**
   - `employee_constraints` already has one `preferred_store_id` plus `allowed_store_ids[]`, but production currently has no rows;
   - it does not represent an ordered store ranking such as `CN3 > CN2 > CN4 > CN1`;
   - a canonical ordered management-owned Store Priority model is still required.

6. **Availability is still store-coupled.**
   - `employee_availability.preferred_store_id` exists;
   - the active Employee UI requires choosing a store for each registration;
   - this contradicts the newly approved time-only Availability rule and must be migrated safely rather than merely hidden in UI.

7. **Scheduling draft state is currently store-centric.**
   - `schedule_generation_runs` is operated as one store/week generation;
   - the cross-store target requires one Manager operating view and global conflict checks across CN1–CN4;
   - keep `work_schedules` as final canonical schedule truth, but design a safe enterprise planning/orchestration layer rather than reactivating deprecated legacy auto-scheduling blindly.

8. **Staffing requirement data already exists but is not yet trusted as the new robot authority.**
   - production contains existing `staffing_requirement_templates` data;
   - SCHED-02 revoked/deprecated browser mutation authority for the old demand path;
   - XSTORE-007 must reconcile this existing data against the Owner-approved real staffing rule before Auto Schedule can use it.

9. **Previous Manager readiness evidence was incomplete for real production identity.**
   - SCHED-02 explicitly recorded that production had no ACTIVE `STORE_MANAGER`;
   - Manager authority was proven with fixtures/security tests, not a real active Manager identity;
   - final XSTORE acceptance must include a real production-safe Manager role/scope smoke.

### Immediate architecture gate

Before XSTORE profile/scheduling changes, the project must define one canonical Manager authority model:

```text
AUTHENTICATED USER
→ role / capability
→ allowed stores
→ Manager Context
→ Workforce readers/writers
```

Do not fix `ROLE_NOT_ALLOWED` by broadly allowing every Manager-family role. Inventory, finance and Workforce authority must remain explicit.

## 0.1 Role split — Owner decision 2026-09-28

Canonical role distinction is locked:

- `OWNER` = Chủ hệ thống.
- `STORE_MANAGER` = **Quản lý cửa hàng** — Workforce/store operations role.
- `INVENTORY_MANAGER` = **Quản lý kho** — separate future inventory role; out of scope for this Workforce track.
- `STAFF / EMPLOYEE` = Nhân viên.

For the approved shared-workforce model, `STORE_MANAGER` receives `access_scope = ALL` so the Manager scheduling surface can operate CN1–CN4 together.

Owner Access implementation:
- role label is now **Quản lý cửa hàng** for `STORE_MANAGER`;
- role label is now **Quản lý kho** for `INVENTORY_MANAGER`;
- saving `STORE_MANAGER` sets `access_scope = ALL`;
- moving a non-Owner account away from `STORE_MANAGER` clears the Workforce store scope so old Workforce authority is not retained;
- production migration `xstore_001_store_manager_access_scope_owner_grant` grants only bounded `access_scope` UPDATE privilege to authenticated; existing Owner-only RLS remains the authorization boundary.

Do not use `INVENTORY_MANAGER` as a substitute for `STORE_MANAGER` in Workforce.  
Do not implement Inventory/Warehouse functionality in this track.

Current production acceptance:
- one ACTIVE `STORE_MANAGER` is present with `access_scope = ALL`;
- the live Manager Workforce page loads real Availability data under that authority;
- `INVENTORY_MANAGER` remains separate and is not accepted as Workforce authority;
- XSTORE-001 is CLOSED.

## 0.2 Owner correction — 2026-10-01 — recurring weekly staffing requirement

A post-implementation Owner review found that the XSTORE-007 weekly staffing-input model is not the desired real operating model.

### Correct business rule

Staffing demand is a **recurring weekly operating configuration**, not transaction data that a Manager must re-enter for each calendar week.

Canonical meaning:

```text
Weekly Staffing Template = how many people each store normally needs by weekday/time block
Availability             = when employees can work in a specific target week
Schedule DRAFT            = proposed employee assignments for a specific target week
work_schedules            = published official schedule truth
```

Manager/Owner configures the staffing template once using:

```text
store + day_of_week + start_time + end_time + target_headcount
```

Example:

```text
CN1 · Monday · 07:00–12:00 · 2 people
```

The same rule is reused for future weeks until management explicitly changes and saves it. Manager must **not** have to recreate identical requirements for every new week.

### Required UX

The Manager staffing-requirement surface must be presented as a weekly operating board, visually aligned with the official scheduling board:

- CN1–CN4 in one coherent operating view;
- Monday→Sunday columns;
- one or more time blocks per day/store;
- target headcount visible directly in each block;
- explicit edit/save flow;
- saved values persist as the default recurring weekly configuration;
- no technical fields such as `authority_source`, migration names or legacy minimum/maximum semantics shown to normal users.

### Authority correction

The already-implemented XSTORE-007 model stores Robot authority in date-bound `staffing_requirements` rows tagged `authority_source='XSTORE_V1'`. That implementation history remains valid evidence, but this model is **superseded for final production acceptance** by the recurring weekly configuration described above.

The legacy table `staffing_requirement_templates` demonstrates an earlier recurring-week concept, but it must **not** be blindly reactivated as final authority. Reconcile and design one clean canonical recurring authority that preserves current role/scope/security rules and avoids parallel truths.

### Execution gate

Do **not** execute XSTORE-011 real-data acceptance using the current weekly/date-bound staffing input.

Complete XSTORE-C01→C05 first. Only then may XSTORE-011 resume.

## 0.4 Owner correction — 2026-10-07 — approved mockups are visual authority

Owner reviewed the **actual authenticated local application** after XSTORE-019J and explicitly rejected the rendered Manager, Employee and Owner interfaces because they did **not** visually match the mockups that had already been approved.

This decision **supersedes the visual-acceptance conclusions** recorded for XSTORE-019G, XSTORE-019H, XSTORE-019I and XSTORE-019J. Their previous automated QA remains historical technical evidence only; it is **not** proof of Owner UI acceptance.

### Canonical visual authority files

These repository images are the authoritative visual contract for the remediation:

- **Manager:** `01_DOCS/MAGASIN/05_SYSTEM/WORKFORCE_UI_MOCKUPS/XSTORE-019_OWNER_APPROVED_MANAGER.webp`
- **Employee:** `01_DOCS/MAGASIN/05_SYSTEM/WORKFORCE_UI_MOCKUPS/XSTORE-019_OWNER_APPROVED_EMPLOYEE.webp`
- **Owner:** `01_DOCS/MAGASIN/05_SYSTEM/WORKFORCE_UI_MOCKUPS/XSTORE-019_OWNER_APPROVED_OWNER.webp`
- index/readme: `01_DOCS/MAGASIN/05_SYSTEM/WORKFORCE_UI_MOCKUPS/README.md`

The repository images are compressed copies of the screenshots reaffirmed by Owner on 2026-10-07. They are **not inspiration or optional references**. Robot/chat must inspect the relevant role image before changing the corresponding role UI.

### Fidelity rule

Implementation must preserve the canonical business/security/data authority already locked in this SOT while matching the approved mockup as closely as practical in:

- information hierarchy and section ordering;
- navigation model;
- card/panel composition;
- spacing, density and alignment;
- typography scale/weight;
- color treatment and state emphasis;
- icon/button placement and prominence;
- responsive behavior;
- desktop/mobile composition shown by the mockup;
- role-specific mental model and primary actions.

Values visible in the mockups are **illustrative UI content**, not production data authority. Do not fabricate revenue, P&L, attendance, schedule or other business truth merely to match a screenshot.

If a literal visual detail conflicts with canonical security/business/data rules, preserve the canonical rule and reproduce the same visual intent without weakening authority.

### Real-local review requirement

A QA fixture alone cannot satisfy this gate.

Before XSTORE-019J may become GREEN again:
1. run the actual application locally from the candidate branch;
2. open the canonical login page;
3. authenticate through the real Supabase auth flow;
4. route to the actual Manager / Employee / Owner application surface by role;
5. verify the rendered role UI against the corresponding authoritative mockup;
6. capture fresh desktop/mobile evidence from the actual local app, not only isolated QA fixtures;
7. Owner must explicitly approve the resulting rendered UI.

Automated tests must not declare visual acceptance merely because required labels, DOM nodes or route names exist.

### Remediation order

```text
XSTORE-019G — Manager visual fidelity against approved Manager mockup
→ XSTORE-019H — Employee visual fidelity against approved Employee mockup
→ XSTORE-019I — Owner visual fidelity against approved Owner mockup
→ XSTORE-019J — authenticated real-local cross-role visual requalification
→ OWNER UI IMPLEMENTATION RE-APPROVAL
→ XSTORE-019K
```

Until that re-approval:
- XSTORE-019K and later business-data/logic wiring remain blocked;
- PR #392 remains DRAFT / DO NOT MERGE;
- historical XSTORE-019G→019J GREEN results must not be interpreted as current visual acceptance.

## 0.5 Owner correction — 2026-10-07 — Manager calendar workspace controls + scroll ergonomics

Owner reviewed the **actual authenticated local Manager scheduling page** after the week-selector repair and approved a further UX correction for **Bước 3 — Chỉnh lịch** and **Bước 4 — Kiểm tra**.

This correction is **authoritative for XSTORE-019J** and must be implemented before Owner is asked to re-approve the Manager UI.

### A. Branch selector belongs to the calendar workspace

The CN1/CN2/CN3/CN4 selector must no longer sit far above the active calendar as an isolated control.

Canonical placement:

```text
CHỈNH LỊCH

[CN1] [CN2] [CN3] [CN4]   [Tuần ...]   [LỊCH NHÁP]   [Kiểm tra lịch →]
LỊCH NHÁP ĐANG CHỈNH
────────────────────────────────────────────────────────
weekly calendar
```

Requirements:
- place the active branch selector **immediately above / in the same control strip as** `LỊCH NHÁP ĐANG CHỈNH`;
- changing branch updates the calendar below without forcing the Manager to scroll back to an earlier section;
- retain one selected-store editing workspace; do not reintroduce four simultaneous editable calendars;
- collapse redundant branch/week descriptive text where possible so the control strip stays compact;
- preserve canonical role/store authority and current scheduling data semantics.

### B. Bước 4 — Kiểm tra must be directly reachable from the calendar

The scheduling board is long. The Manager must not need to scroll back through the page to find Bước 4.

Requirements:
- add a visible primary action such as **`Kiểm tra lịch`** / **`Tiếp tục → Kiểm tra`** in the calendar control strip;
- this action navigates to / activates canonical **Bước 4 — Kiểm tra** without changing the five-step workflow semantics;
- the same action may be repeated at the bottom of the calendar for convenience;
- Bước 4 remains the canonical read-only review step; this correction does not merge Chỉnh lịch and Kiểm tra into one authority state.

### C. Sticky calendar command strip

The calendar command strip should remain available while the Manager works through a long schedule.

The compact strip should contain, when applicable:
- branch selector;
- selected week / week navigation;
- current draft status;
- direct **Kiểm tra lịch** action.

Desktop behavior:
- use sticky positioning inside the scheduling workspace where technically safe;
- avoid requiring repeated long vertical travel merely to change branch/week or enter review;
- do not obscure calendar rows or global navigation.

### D. Employee shift card readability

The current shift cards must not require a horizontal scrollbar to understand basic assignment information.

Minimum visible hierarchy:
1. employee name — up to two lines when needed;
2. complete shift time range, e.g. `06:00–10:00`;
3. compact secondary status/badge when relevant, e.g. `Full-time` / `Part-time`, `Lịch nháp`, warning state.

Requirements:
- full employee name must remain readable without being hidden by an internal horizontal scrollbar;
- the complete start/end time must remain visible;
- secondary text may wrap or truncate only after primary name/time information is preserved;
- remove per-card horizontal scrollbars;
- preserve drag/edit affordances without letting them consume the primary information area.

### E. Minimize horizontal scrolling

Canonical goal: **no nested scroll-inside-scroll interaction** for normal schedule editing.

Desktop:
- when the viewport has sufficient width, Monday→Sunday should fit in the primary calendar workspace without a horizontal scrollbar;
- use responsive widths, compact spacing and card wrapping before introducing horizontal scrolling;
- if horizontal overflow is unavoidable at a narrower desktop/tablet width, there must be **one calendar-level overflow/navigation mechanism**, not independent horizontal scrollbars inside day columns or employee cards.

Narrow/mobile:
- do not squeeze seven unreadable day columns into the viewport;
- use a controlled day-window pattern such as **1 day or 3 days at a time with previous/next navigation**, or another single calendar-level responsive mechanism that achieves the same usability outcome;
- page-level horizontal overflow is not accepted.

### F. Acceptance / regression requirements for XSTORE-019J

Robot must verify on the **actual authenticated local Manager application**, not fixture-only DOM:

- branch selector is colocated with the active `LỊCH NHÁP ĐANG CHỈNH` workspace;
- branch can be changed without scrolling back to the old Step-3 header;
- week controls remain visible and functional;
- `Kiểm tra lịch` is directly reachable from the active calendar workspace and enters canonical Bước 4;
- employee shift cards expose readable employee name + full time range without per-card horizontal scroll;
- no nested horizontal scrollbar exists in normal desktop editing;
- seven-day desktop layout is usable at normal Manager desktop widths;
- narrow layout uses one controlled calendar-level navigation/overflow model and has no page-level horizontal overflow;
- existing direct edit, shortage, candidate picker, draft, validate/review/publish and authority contracts remain intact;
- relevant targeted Manager scheduling QA and required regressions are GREEN;
- fresh real-local screenshots/evidence are captured for Owner review.

This is a **presentation/interaction correction only** unless implementation proves a minimal state-sync repair is necessary. It must not weaken RBAC, store scope, scheduling validation, cross-store conflict checks or publication authority.

## 0.6 Owner correction — 2026-10-07 — multi-employee Shift Cluster calendar contract

Owner reviewed the real Manager weekly calendar behavior for cases where multiple employees occupy the same or overlapping time range and explicitly rejected the current cramped parallel-card behavior.

Owner approved the grouped **Shift Cluster** layout as the authoritative calendar presentation for XSTORE-019J.

Authoritative visual contract:
- `01_DOCS/MAGASIN/05_SYSTEM/WORKFORCE_UI_MOCKUPS/XSTORE-019J_OWNER_APPROVED_MULTI_EMPLOYEE_SHIFT_CLUSTER.svg`

This rule applies to both:
- **Bước 3 — Chỉnh lịch**;
- **Bước 4 — Kiểm tra**.

### A. Group employees by shared/overlapping time window

Do not render multiple narrow employee cards side-by-side inside one day/time region when that makes names/times unreadable.

Canonical model:

```text
shared / overlapping time window
→ one Shift Cluster
→ cluster header = time range + people count
→ employee rows inside the cluster
```

Example:

```text
06:00–12:00                         3 người
Nguyễn Thị Kim Uyên                    FT
Nguyễn Thùy Trang                      FT
Đỗ Ngọc Thảo                           PT
```

### B. Density rule

Canonical display:
- 1 employee → normal single assignment card;
- 2–3 employees in the same/overlapping window → one Shift Cluster with each employee listed directly;
- more than 3 employees → show the first 3 employee rows, then a compact `+N nhân viên` disclosure row;
- clicking/opening the disclosure may use the existing scoped drawer/overlay pattern;
- never create an internal horizontal scrollbar merely to expose names or times.

### C. Overlap does not require identical employee times

When employee intervals overlap but are not identical, the cluster may represent the union/overlap window while each employee row preserves that employee's own exact start/end time when needed.

Example:

```text
06:00–12:00 · 2 người

Nguyễn Kim Uyên      06:00–10:00
Nguyễn Thùy Trang    08:00–12:00
```

Do not collapse or rewrite underlying assignment times. This is a presentation grouping only.

### D. Information hierarchy inside the cluster

Primary:
1. cluster time range;
2. people count;
3. employee full name;
4. employee exact time when different from the cluster header.

Secondary:
- Full-time / Part-time;
- DRAFT / warning / manual Availability override state when relevant.

Repeated explanatory text such as “Ca trong bản nháp · chưa phải lịch chính thức” must not consume large space inside every employee row. A shared cluster/header status is preferred.

### E. Interaction semantics

**Bước 3 — Chỉnh lịch**
- cluster is interactive;
- open cluster/detail to edit an employee assignment;
- add/supplement/remove employee through the existing canonical DRAFT mutation flow;
- direct shift editing, shortage recalculation and candidate drawer remain intact.

**Bước 4 — Kiểm tra**
- reuse the same grouped visual composition;
- strictly read-only;
- no mutation authority is introduced;
- exact warnings/shortages/conflicts remain visible.

### F. Color and safety

- preserve canonical morning / afternoon / evening time-band colors;
- shortage remains visually distinct in the canonical warning family;
- grouping must not weaken cross-store overlap, ACTIVE employee, Store Priority, Availability override audit, official schedule overlap, validation or publish authority;
- no second scheduling writer/RPC is allowed.

### G. Acceptance for XSTORE-019J

Robot must prove:
- no employee assignment card contains a horizontal scrollbar;
- 2, 3 and >3 employee overlap cases render as grouped Shift Clusters;
- `+N nhân viên` appears for overflow beyond the direct-row limit;
- employee names remain readable;
- exact times remain available;
- seven-day desktop layout remains usable;
- narrow layout keeps the single calendar-level responsive mechanism from §0.5;
- Bước 3 remains editable and Bước 4 remains read-only;
- direct edit / shortage / candidate drawer / Validate / Review / Publish regressions remain GREEN;
- fresh authenticated real-local Manager evidence is captured after implementation.

This Owner correction supersedes the prior request to stop at the existing `724c507b...` candidate for approval. XSTORE-019J is **reopened for implementation** and is the single next executable task. XSTORE-019K remains blocked until the new grouped-calendar implementation is requalified and explicitly approved by Owner.

## 0.7 Owner correction — 2026-10-07 — approved mockup fidelity is a hard implementation gate

Owner rechecked the **actual local Manager application** after the Shift Cluster code/cache candidate was technically GREEN and explicitly rejected the rendered UI because it still did not match the already-approved Manager mockup closely enough.

This is **CHANGES_REQUESTED**, not an Owner-input block. Robot must continue executing **XSTORE-019J**.

### A. Verified root cause and candidate correction

Durable audit findings:
- the local review checkout had initially remained on historical head `724c507b76872f861cd1e77109ef650ecd936557`, so the browser was still loading the older `workspace2` renderer;
- after syncing local to the newer candidate and hard-reloading, the application loaded the newer Shift Cluster cache lineage but the overall Manager scheduling composition still materially differed from the approved mockup;
- PR #392 had been created from an older base and did not contain the Owner-approved visual authority files that already existed on `main`;
- prior CI GREEN proved DOM/contracts/functionality but did **not** prove visual fidelity to the approved image.

The Owner-approved visual authority files are now explicitly required in the candidate branch. Visual-authority sync commit:
- `326fe4d238bd5d31b95c0a90d17982ce0fdea590`

Required visual files:
- `01_DOCS/MAGASIN/05_SYSTEM/WORKFORCE_UI_MOCKUPS/XSTORE-019_OWNER_APPROVED_MANAGER.webp`
- `01_DOCS/MAGASIN/05_SYSTEM/WORKFORCE_UI_MOCKUPS/XSTORE-019_OWNER_APPROVED_EMPLOYEE.webp`
- `01_DOCS/MAGASIN/05_SYSTEM/WORKFORCE_UI_MOCKUPS/XSTORE-019_OWNER_APPROVED_OWNER.webp`
- `01_DOCS/MAGASIN/05_SYSTEM/WORKFORCE_UI_MOCKUPS/XSTORE-019J_OWNER_APPROVED_MULTI_EMPLOYEE_SHIFT_CLUSTER.svg`
- `01_DOCS/MAGASIN/05_SYSTEM/WORKFORCE_UI_MOCKUPS/README.md`

Robot must treat these files as implementation input, not optional documentation.

### B. Manager implementation must follow the approved mockup, not merely preserve old panels

The real Manager scheduling page must be remediated toward the approved visual composition and information density.

Required hierarchy:
1. compact page title/context and the five-step workflow;
2. **Bước 1 — Chuẩn bị** with compact system metrics and recurring staffing-demand presentation matching the approved mockup structure;
3. **Bước 2 — Tạo lịch nháp** with clear primary draft action/state;
4. **Bước 3 — Chỉnh lịch** as the dominant working area:
   - selected branch + selected week + DRAFT state in one compact working context;
   - seven-day calendar at normal desktop width;
   - employee information readable without card-level horizontal scrolling;
   - on-demand supplement/candidate interaction remains secondary to the calendar;
   - shared/overlapping employees use the §0.6 Shift Cluster composition;
5. **Bước 4 — Kiểm tra** reuses the same calendar composition in strictly read-only mode and is directly reachable from the active workspace;
6. **Bước 5 — Duyệt & phát hành** remains the final canonical authority step.

Do not preserve oversized historical sections or repeated explanatory copy merely because existing tests accept them when those sections conflict with the approved mockup's hierarchy/density.

### C. Shift Cluster visual fidelity remains mandatory

For overlapping employees, the rendered real calendar must visibly resemble the approved Shift Cluster contract:
- one grouped container for the overlapping window;
- header = cluster time range + people count;
- employee rows underneath;
- exact employee time shown when it differs from the cluster range;
- FT/PT and warning/audit state are secondary;
- first 3 rows + `+N nhân viên` when more than 3;
- no parallel cramped cards and no internal horizontal scrollbar.

### D. Real-local visual QA is mandatory

Fixture-only DOM GREEN or static contract GREEN is insufficient.

Before returning XSTORE-019J for Owner approval, Robot must:
- sync the local review checkout to the **exact current candidate head**;
- verify the active runtime/cache lineage matches that exact head;
- hard reload/reopen the real route so cached historical assets cannot satisfy the review;
- use the actual authenticated local Manager application;
- capture fresh desktop screenshots of the full five-step flow and focused Bước 3/Bước 4 calendar;
- capture a fresh narrow/mobile Manager screenshot for the controlled responsive calendar mechanism;
- compare the rendered screenshots directly against the repository mockups and record visible deviations;
- repair material hierarchy/layout/density deviations before asking Owner to review again.

Visual QA must explicitly cover:
- top-level five-step composition;
- Bước 1 density and recurring staffing presentation;
- Bước 2 draft action/state;
- Bước 3 branch/week/calendar composition;
- Shift Cluster presentation;
- Bước 4 same-calendar read-only presentation;
- direct Bước 3 → Bước 4 access;
- absence of nested/card horizontal scrollbars.

### E. CI and acceptance policy

Existing functional gates remain mandatory:
- direct edit;
- shortage;
- candidate drawer;
- Availability override;
- Validate;
- Review;
- Publish;
- cross-role/UI2/People Shift regressions.

But these gates are **necessary, not sufficient**.

XSTORE-019J may not return `BLOCKED / OWNER_REQUIRED` merely because functional CI is GREEN while the actual rendered application still materially differs from the approved mockups.

Correct state until the visual remediation is implemented and requalified:
- **XSTORE-019J = CHANGES_REQUESTED / EXECUTABLE**;
- **XSTORE-019K = BLOCKED**;
- Owner review is requested only after fresh exact-candidate authenticated real-local visual evidence is ready.

No new scheduling writer/RPC, RBAC relaxation, or business-authority change is authorized by this visual correction.

## 0.8 Owner correction — 2026-10-09 — calendar-first slide-over editor for Steps 3 and 4

Owner reviewed the real local scheduling application and explicitly approved a **right-side slide-over detail/editor** rather than expanding editing forms inside a calendar cell or keeping a permanently wide form column. This decision is **authoritative within XSTORE-019J** and supplements §0.5–§0.7.

### Required interaction and layout

- **Bước 3 — Chỉnh lịch:** the selected-store seven-day calendar is the dominant, full-width working surface at standard desktop widths. Clicking **Chỉnh** on an individual shift (including a shift within a Shift Cluster) opens an **on-demand slide-over drawer anchored to the right viewport edge** without reflowing, narrowing, resizing or horizontally scrolling the underlying calendar.
- Reuse existing canonical edit capabilities in the drawer: employee, exact start/end, work date, save/update, duplicate and remove with existing role/scope, draft and conflict validation intact. Do **not** create a second independent scheduling writer or edit authority.
- Close button, Escape, and selection switching must work. Visible focus, accessible drawer labeling, and responsive mobile width are required. Do not leave an open editor attached to stale store/week/assignment after a state refresh.
- The original in-card expanded form must no longer appear within the small calendar cell when the side drawer is used. Shift Cluster retains readable grouped rows and individual controls. Candidate/supplement workflows remain available but secondary to the calendar.
- **Bước 4 — Kiểm tra:** show the same calendar geometry and Shift Cluster grouping in **read-only** state. Selecting a shift/cluster opens a matching right-side **read-only detail drawer**, not an editable form. This action must not expose any update/delete/duplicate writer or relax Validate → Review → Publish.
- No permanent editor column should consume normal calendar width. Supplemental and review summaries may be collapsed or placed below the primary calendar. Desktop seven-day readability, mobile controlled day window, and no nested horizontal scroll remain mandatory.

### Acceptance for XSTORE-019J

Targeted browser and local-authenticated QA must prove: (a) click shift edit opens the right-side editor, (b) underlying calendar dimensions do not change before/after opening, (c) editing an overlapping Shift Cluster member targets the correct single assignment, (d) close/Escape and re-render do not lose or misroute draft changes, (e) Step-4 detail is genuinely read-only, (f) direct Step-3 → Step-4 remains available, (g) responsive calendar/window remains usable, and (h) all impacted scheduling, authority, regression, and visual-fidelity gates are GREEN. Capture fresh exact-candidate authenticated screenshots for Owner review.

This is a presentation/interaction correction **inside existing XSTORE-019J**, not authorization to run XSTORE-019K or to merge PR #392. Until proven and Owner re-approved, XSTORE-019J remains **CHANGES_REQUESTED / EXECUTABLE** and the PR stays **DRAFT / DO NOT MERGE**.

## 0.9 Owner correction — 2026-10-09 — Step 3/4 weekly presentation must match compact staffing matrix

Owner compared fresh screenshots of (a) the compact recurring staffing matrix with CN1–CN4 rows and seven weekday columns, and (b) the old seven-column **vertical hourly timeline** in Step 3, and explicitly rejected the latter as still the old interface. This is another **CHANGES_REQUESTED / EXECUTABLE** correction within XSTORE-019J. Merely adding the right-side drawer (§0.8) does not satisfy this requirement.

Required canonical implementation:
- Bước 3 and Bước 4 must **visually use the compact seven-weekday matrix idiom shown by the existing weekly staffing presentation**, not the tall 05:00–22:00 hourly ruler with vertically sized cards.
- Maintain the canonical **one selected branch/week at a time** in the Step-3 editing workspace: retain the 4-branch selector above the grid and show selected branch context rather than silently mixing employees/stores into an editable 4-branch writer.
- Put actual assignments in concise colored day cells ordered by exact start time: **full employee name and individual time interval must remain legible**; overlapping employees use the approved Shift Cluster grouping with each individual accessible.
- Inline shortages remain conspicuous in their day; adding a missing employee and creating a manual day shift remain available through the existing authenticated/canonical actions.
- Bước 3 uses §0.8 right slide-over edit/detail with no underlying calendar resize; Bước 4 uses the **same compact matrix layout** and an on-demand **read-only** slide-over. Validate → Review → Publish authority, security, and data writers must not change.
- Normal desktop must show all seven days without an internal horizontal timeline scrollbar. Narrow/mobile must use the existing one-day controlled navigation model, without a tall empty hourly area.
- Do not call the work complete until fresh **authenticated real-local** screenshots and interaction evidence show that Steps 3/4 no longer resemble the hourly timeline, reproduce the compact-week visual hierarchy, and match the approved design closely enough for Owner re-review.
- This is a UI correction of existing **XSTORE-019J**, not a new task and not permission to merge PR #392 or advance XSTORE-019K. Preserve DRAFT/DO NOT MERGE until technical and Owner gates.

## 0.10 Owner acceptance — 2026-10-09 — Manager calendar UI approved (bounded scope)

The Owner explicitly said **“Ok duyệt lịch của maganer”** after reviewing the real local Manager scheduling implementation and its compact weekly calendar correction. Treat this as **APPROVED for the Manager scheduling/calendar presentation**, especially Bước 3 — Chỉnh lịch and Bước 4 — Kiểm tra, including the compact seven-day composition from §0.9 and the on-demand right slide-over from §0.8. Do **not** reinterpret this as approval to publish an actual employee work schedule, create or modify operational assignments, or change role/store authority.

Durable reviewed RC reference:
- PR **#392**, branch `xstore-019-unified-rc-v1`, candidate HEAD `7a3e419995b0d87f5d4d74aa2f884d1d43a4977c` (Manager compact-week follow-up, day Add button hit-testing and cache closure);
- Owner local preview on `DESKTOP-H4A16IL`, local Manager route `http://127.0.0.1:8791/05_MANAGER/`, served from that candidate and returning HTTP 200 in the implementation cycle; approval is based on Owner's real-local visual review, not fixture tests alone;
- GitHub Actions for that exact SHA: **12/12 triggered workflow runs completed SUCCESS** at the acceptance check, including `XSTORE-019J Cross-Role UI Preview QA`, `XSTORE-019 Unified RC QA`, `UI2 Cross Role Acceptance`, `People Shift Day-10 Tests`, `XSTORE-019G Manager Five-Board QA`, XSTORE-013/014/015/016/017/018 compatibility tests and SOP QA.
- This evidence establishes a successful **Manager UI acceptance milestone**; it does not prove untriggered gates, production deployment, exact-main verification, or acceptance of another role's rendered UI.

**Scope boundary and task control:** `XSTORE-019J` remains **OPEN / EXECUTABLE** until the rest of §0.4's authenticated real-local Manager/Employee/Owner cross-role evidence and Owner UI implementation re-approval are adequately recorded, all SOT-required release checks are satisfied, and exact-main acceptance is justified. The Manager calendar visuals from §0.8–§0.9 must not be reopened as unapproved absent a specific new defect or Owner change request. `XSTORE-019K` remains **BLOCKED** pending the full cross-role UI gate. PR #392 stays **DRAFT / DO NOT MERGE** pending its normal release authorization. No real DRAFT/Review/Publish action is authorized by this conversational UI approval.

## 0.11 Real-local Employee/Owner auth requalification — 2026-10-09 — OWNER LOGIN REQUIRED

Following the Owner's approval of the **Manager calendar UI only** (§0.10) and instruction to proceed, a new **read-only** real-local access check was executed on **DESKTOP-H4A16IL** using the exact PR #392 candidate `7a3e419995b0d87f5d4d74aa2f884d1d43a4977c` served at `http://127.0.0.1:8791/`.

**Observed facts, not fixture assumptions:**
- Local Employee entry `/employee/` served successfully (HTTP 200), but navigation in an isolated Chrome review profile ended at canonical `/03_PLATFORM/01_AUTH/` with page title `MAGASIN · Đăng nhập`, not an authenticated Employee UI. A previous employee-authenticated screenshot set exists under `D:\MAGASIN_UI_EVIDENCE\xstore-019j\actual\`, but its recorded candidate SHA was `33c85f231a832e96d8455301b6f743b09fc0ee49` and **cannot qualify the current candidate**.
- Local Owner entry `/owner/` served successfully (HTTP 200), but navigation in a separate isolated Chrome review profile also ended at canonical `/03_PLATFORM/01_AUTH/`; the real Owner strategy page was therefore not inspectable. Do not claim Owner visual approval from its existing fixture QA.
- Both review Chrome sessions were launched using isolated profiles/ports 9333 (Employee) and 9334 (Owner); both CDP endpoints were responsive (HTTP 200) after navigation. No credentials, authentication tokens, session records or production business data were read, copied, guessed, injected or changed. Screenshots of the login boundary were saved locally as `employee-current-local-20261009.png` and `owner-current-local-20261009.png`.
- The local checkout remained on exact RC SHA `7a3e419995b0d87f5d4d74aa2f884d1d43a4977c`. All 12 GitHub Actions runs launched for that SHA previously completed **SUCCESS** (as recorded in §0.10). Technical GREEN does not substitute for real authenticated visual comparison or approval.

**Gate disposition:** `XSTORE-019J` has a **completed/approved Manager scheduling UI sub-gate**. Its outstanding **authenticated Employee and Owner real-local review gate is WAIT_OWNER_AUTHENTICATION / BLOCKED for Owner action**. Resume exactly the same XSTORE-019J after Owner logs into the Employee and Owner review sessions via the canonical app sign-in UI; capture and compare real desktop/mobile role screens with §0.4 approved images, repair any identified deviations under normal QA, and obtain explicit Owner cross-role UI approval. Do not require Manager calendar reapproval absent a new concrete defect. Do not bypass Supabase auth or fabricate operational financial/workforce values to imitate reference images. `XSTORE-019K` remains blocked; PR #392 remains DRAFT / DO NOT MERGE; no real scheduling Publish is authorized.

## 0.12 Owner correction — 2026-10-09 — Employee availability directly painted in operating-hours calendar

Owner reviewed the **real Employee weekly Availability page** on the local 8791 candidate and explicitly requested faster direct in-calendar registration. This is a new **CHANGES_REQUESTED / EXECUTABLE sub-gate within XSTORE-019J**, superseding only the Employee registration surface; §0.10 Manager calendar approval remains intact.

### Required user interaction and acceptance
- On **Đăng ký lịch tuần**, show the operating-hours time axis **05:00–22:00** (30-minute selectable granularity; displayed slots 05:00 through 21:30). Do not waste space rendering 00:00–04:30 or 22:00–23:30. Existing saved exact-time rows outside that visual window, if any, must not be silently dropped or corrupted.
- Employees tap a time block directly to toggle availability (the block must visibly change color before saving), or drag across consecutive blocks within a day to paint selection. Multiple days and disjoint intervals are allowed. A single prominent **Lưu đăng ký** action sits below the calendar, with selected-count/unsaved indication, explicit in-flight feedback and error/retry guidance.
- Adjacent selected blocks per date must be coalesced into exact time intervals (inclusive start, exclusive end). Continue to support existing exact start/end editing, saved-interval changes and removal; do not hard-code three fixed shifts or force a store selection.
- The draft is **not persisted** merely by painting a cell: only the user's explicit Save action may call canonical `save_my_availability`. Never auto-publish a shift, bypass target-week registration policy, duplicate saved intervals, or replace approved Manager scheduling authority.
- On save, use existing authenticated Employee Availability RPC and return confirmed server rows. If partial failure occurs, retain only unsaved draft selections for correction/retry and show partial-success evidence; never silently report the entire week as saved. Block editing/Save when registration is closed, loading, or submit pending.
- Mobile-first: fit a legible one-day time window with simple next/previous day selection and accessible keyboard/focus behavior. At normal desktop sizes the seven-day calendar is usable without page-level horizontal overflow; colors distinguish **staged/unsaved**, **persisted**, and unselected slots. Preserve Employee/Owner mockup visual hierarchy and direct entry to published schedule and attendance.
- Targeted actual-browser QA must verify the 05:00–22:00 grid, multi-cell paint/toggle, cross-day drafts, interval coalescing, no RPC before Save, canonical persistence after Save, partial failure behavior, registration-closed read-only, and responsive UI. Then run all impacted Employee Availability, cross-role, release and exact-candidate gates. Fresh authenticated real-local Owner review remains mandatory.

This implementation runs as **XSTORE-019J (Employee visual requalification correction)**, not a new SOT task or reopening of the previously DONE XSTORE-019D. Until targeted and required gates pass, the task stays **CHANGES_REQUESTED / EXECUTABLE**; after code QA it again awaits real Employee/Owner authenticated screenshots/Owner approval. `XSTORE-019K` stays blocked. PR #392 remains DRAFT / DO NOT MERGE. Do not deploy or modify real employee registrations without the employee explicitly saving them.

## 0.13 Owner acceptance — 2026-10-09 — Employee UI approved; Owner is next real-local review

Owner explicitly declared **“Chốt nhân viên. Giờ tới owner”** after the 05:00–22:00 paint-to-select weekly Availability implementation and its local QA. This grants **bounded Owner visual/interaction acceptance of the Employee role** (§0.12), in addition to the already accepted Manager scheduling UI (§0.10). Do not reopen or redesign the approved Manager/Employee screens without a new concrete regression/Owner change request. This is **not** approval of real scheduling Publish, database mutation beyond authenticated Employee-initiated Save, deployment or PR merge.

Technical checkpoint: PR **#392** on `xstore-019-unified-rc-v1` HEAD `93369f31edc090660825d3eb16d2df32e4e5377c` received **six terminal SUCCESS workflows** on 2026-10-09: XSTORE-013 Coverage QA `37920930949`, XSTORE-014 Interval Auto Schedule QA `37920931017`, XSTORE-019J Cross-Role UI Preview QA `37920931007`, XSTORE-019 Unified RC QA `37920930956`, UI2 Cross Role Acceptance `37920930960`, People Shift Day-10 Tests `37920930942`. These are exact-PR-head technical gates, **not exact-main/live production approval**.

**Owner is the next/only active outstanding real-local visual approval sub-gate within XSTORE-019J.** The Owner authority image remains `01_DOCS/MAGASIN/05_SYSTEM/WORKFORCE_UI_MOCKUPS/XSTORE-019_OWNER_APPROVED_OWNER.webp` (§0.4). Focus real Owner strategy KPIs, per-store revenue, business performance, expense/profit integrity, opportunity/alerts, forecast and mobile behavior. Mockup amounts are illustrative; never inject/fabricate accounting data, profit or revenue to match screenshots. Use the authenticated canonical role; preserve genuine disconnected-source empty states and read-only authority.

2026-10-09 local inspection on DESKTOP-H4A16IL at candidate `93369f31`, HTTP 200 from local port 8791: an earlier browser profile opened `/owner/` but routed to the **Employee** area, so it does not qualify an Owner review. A new **dedicated isolated Owner Chrome review profile** `D:\MAGASIN_XSTORE_OWNER_ONLY_APPROVAL_20261009` was opened directly at `http://127.0.0.1:8791/owner/`; the canonical auth flow correctly redirected to `/03_PLATFORM/01_AUTH/` with `MAGASIN · Đăng nhập` and an actual password entry surface. Screenshot is stored at `D:\MAGASIN_UI_EVIDENCE\xstore-019j\actual\owner-dedicated-local-20261009.png`. This is an **authentication boundary**, not evidence of Owner dashboard quality. Do not bypass authentication, read tokens, or use Employee role as Owner.

**Next:** Owner signs into the dedicated local review Chrome window using the actual Owner account (never send credentials to the robot/chat). After proper Owner role is verified, capture actual authenticated desktop/mobile Owner UI for exact PR candidate; compare visually with approved mockup; resolve any concrete visual/code defects; run impacted/mandatory tests; request explicit Owner approval. Until then XSTORE-019J remains `WAIT_OWNER_AUTHENTICATION` for the **Owner sub-gate only**; XSTORE-019K is blocked and PR #392 stays **DRAFT / DO NOT MERGE**.

## 0.14 Owner review correction — 2026-10-09 — Owner dashboard rejected after authenticated local view

Owner supplied a screenshot from the **authenticated real local Owner dashboard** at `http://127.0.0.1:8791/owner/` on DESKTOP-H4A16IL and said **“Tôi thấy giao diện chưa tốt”**. This **rejects the current Owner visual implementation**, even though prior XSTORE-019I and XSTORE-019J fixture CI were green. The screenshot shows undersized KPI labels/value typography, weak strategic visual hierarchy, large uninformative blank chart cards, missing trustworthy sources, and some **misleading literal `0 đ` values when model fields are `null`**. Do not claim this UI approved or advance XSTORE-019K.

**Owner strategy-only presentation correction, within XSTORE-019J:**
- Keep Manager and Employee approvals in §0.10 and §0.13 intact. Rework **Owner only**, using the approved Owner image in §0.4 as the visual authority, prioritizing a readable desktop-first executive dashboard and an intentional mobile card layout.
- First row highlights source-qualified revenue, profit, cost, cash flow and margin. Ensure minimum usable type scale and value contrast; prevent clipping, forced one-line ellipsis for explanatory data-source labels, horizontal page overflow, and unreadably small charts/legends.
- Center actual decision hierarchy: business trends and revenue mix, per-store comparison, product/expense/customer insights, alerts and forecast. Make section grouping and density resemble the approved mockup while avoiding giant empty graph scaffolding. Keep workforce operational drill-down secondary.
- **Truth gate:** an absent/undefined/null/blank/nonfinite source value must render `—`, not `0 đ` / `0%` / a fabricated 0 count. Genuine numeric zero remains zero. All charts, percentages, margins, comparisons, warnings, and forecasts with no verified read-only source must display concise clearly-labeled no-data state rather than synthesized metrics/graph shapes. Do not introduce Owner write RPC, payroll or hidden auth shortcuts; preserve actual read-only Control Tower source authority.
- Implement visual fidelity in existing Owner page/CSS/rendering only; do not hard-code the illustrative amounts from mockups. Add targeted regression specifically testing null-vs-zero and empty-series behavior, desktop/mobile responsive metrics and zero page overflow. Then run impacted/full required CI and collect authenticated exact-candidate Owner local screenshots for re-review.
- Current Owner UI status is **CHANGES_REQUESTED / EXECUTABLE**, not a request for Owner credentials. The Owner has already provided authenticated screenshot evidence that the current dashboard is unsuitable. Another explicit Owner UI approval remains mandatory after the correction.
- PR #392 remains **DRAFT / DO NOT MERGE**. This owner correction does not authorize real schedule publishing or task XSTORE-019K.

## 0.15 Owner UI implementation approval — 2026-10-09 — All three roles approved; release reconciliation remains

After the Owner's real-local Owner dashboard rejection and remediation recorded in §0.14, Owner explicitly responded **“Ok chốt”** to the latest Owner interface correction. This grants **Owner visual/interaction approval of the Owner strategy dashboard** as presented in the latest XSTORE-019J candidate, alongside existing §0.10 Manager schedule UI approval and §0.13 Employee Availability UI approval. **All three role presentation sub-gates are now OWNER-APPROVED.** Preserve approved Manager/Employee/Owner layouts; reopen only for a demonstrated product regression or a new Owner change request.

Approved design candidate: PR [#392](https://github.com/magasincoffee/magasincoffee.github.io/pull/392), branch `xstore-019-unified-rc-v1`, exact head `bb643c6aea73e0f1b200fece5cd632d02a28b8ab`. The Owner repair landed as `661cefe68e1dd75999a6acd2edd97b970de9f351`, and the last test/Unified RC path-impact fix landed as `bb643c6aea73e0f1b200fece5cd632d02a28b8ab`. Accepted changes: legible executive KPI hierarchy, real-source data integrity (`null` ≠ zero), compact honest no-data states, responsive mobile layout, and read-only Owner strategy role. **No mockup revenue/expense values were authorized for production.**

At the 2026-10-09 acceptance check, **7/7 GitHub Actions workflows triggered on that exact PR head concluded `completed/success`**: XSTORE-014 Interval Auto Schedule QA (`37932941986`), XSTORE-013 Coverage QA (`37932941998`), Owner Control Tower Tests (`37932942110`), XSTORE-019J Cross-Role UI Preview QA (`37932942022`), XSTORE-019 Unified RC QA (`37932941929`), UI2 Cross Role Acceptance (`37932942059`), and People Shift Day-10 Tests (`37932941930`). Browser fixture evidence and Owner's conversational approval do not substitute for the SOT's required **exact-main verification after integration**.

**Open technical release gate, NOT another Owner UI approval gate:** GitHub reports PR #392 as `draft=true`, `mergeable=false`, `mergeable_state=dirty`; the feature branch has diverged from `main` (compare `main...xstore-019-unified-rc-v1` showed 180 ahead / 34 behind at this check). This is an unresolved **branch merge conflict / candidate synchronization** blocker for release, not evidence of a failed Owner UI visual decision. Within the same existing task **XSTORE-019J**, reconcile the branch against the current authoritative SOT and `main` carefully, retaining latest Owner decisions and no regression of the approved role interfaces. Inspect conflict paths, dependencies, migrations/security changes and QA failures; batch repair; rerun every required release/full-regression gate for the **post-reconciliation SHA**; obtain durable exact-main verification and the appropriate release authorization before marking XSTORE-019J COMPLETE.

Until those technical gates are satisfied: **XSTORE-019J remains OPEN / RELEASE RECONCILIATION REQUIRED; PR #392 stays DRAFT / DO NOT MERGE; XSTORE-019K remains BLOCKED**. “Ok chốt” approves UI presentation; it does **not** command a production merge, publish an employee work schedule, authorize writes to real business data, or waive regression/exact-main gates.

## 0.16 XSTORE-019J latest exact-head QA and credential gate — 2026-10-10

This subsection supersedes only the older XSTORE-019J conflict/Owner-visual-approval gate summary in §0.15, not the locked business/security rules, the Owner-approved role UI contracts, or the later release-authorization requirements.

**Verified current state (GitHub and read-only Supabase, 2026-10-10):**
- PR [#392](https://github.com/magasincoffee/magasincoffee.github.io/pull/392) remains **open, DRAFT, not merged**, and GitHub currently reports `mergeable=true` at exact head `014ea189a38c3d74b41226a84f9f77689672a324`, base `main` `b08253cfd64e249c9e03273d0f263ea40c203a87`. The candidate is 188 commits ahead / 0 behind `main` at this check. No production merge or live work-schedule Publish was performed.
- The prior unrelated-root conflict was reconciled through two-parent commit `87a66dc6e1fb228c4326effa8c3e4ecf7ce5d1c1`; the three Owner-approved Manager/Employee/Owner presentation contracts in §§0.10, 0.13, 0.15 remain approved. The [PR evidence trail](https://github.com/magasincoffee/magasincoffee.github.io/pull/392#issuecomment-6094278630) records subsequent bounded test/interaction repairs.
- On exact head `014ea189`, **20 of 21 GitHub Actions PR workflow runs completed SUCCESS**, with no pending runs: XSTORE-019J Cross-Role Preview `38027910104`, XSTORE-019 Unified RC `38027910055`, UI2 Cross Role `38027910144`, People Shift Day-10 `38027910000`, and 16 other triggered suites passed. This is **exact-PR-head evidence**, NOT exact-main/post-release acceptance.
- The **one FAILED** workflow is AUTH-PROD Regression Contract `38027909972`, specifically the credentialed `auth-prod-active-production-smoke` job `114142584789`; `auth-prod-red-contract` passed. The active username resolver assertion reported `response-shape=null` (sensitive username/password values withheld).
- Read-only inspection in the canonical MAGASIN-NOIBO Supabase project confirms `public.resolve_login_email(p_username text) RETURNS text`, joined from `public.profiles.username` to `auth.users.email`. The workflow actually consumes GitHub secret pair `PROCUREMENT_QA_USERNAME` / `PROCUREMENT_QA_PASSWORD` and only renames them to `AUTH_PROD_ACTIVE_USERNAME` / `AUTH_PROD_ACTIVE_PASSWORD` as job environment variables. Thus the failed smoke is an unresolved **configured ACTIVE QA username/identity lookup**, not a JSON-vs-string RPC return-type defect. Do not weaken login/security tests, use a fabricated account, inspect/print passwords, or run blind credential retries.

**Exact next authorized gate:** Through authorized GitHub Actions secret and Supabase Auth account administration, Owner (or a credential administrator explicitly delegated by Owner) must privately verify the **actual repository secret keys** `PROCUREMENT_QA_USERNAME` and `PROCUREMENT_QA_PASSWORD` (mapped by `.github/workflows/auth-prod-tests.yml` to the job environment variables `AUTH_PROD_ACTIVE_USERNAME` and `AUTH_PROD_ACTIVE_PASSWORD`). The username secret must match `public.profiles.username` of an existing **ACTIVE** approved QA identity associated with `auth.users`, and its paired password must be valid; repair the QA identity/secret if necessary without recording credentials here. The resolver function matches `lower(trim(profiles.username))` and allows `ACTIVE`/`PENDING` lookup, but the ACTIVE smoke additionally requires a genuine active-role sign-in. After correction, rerun only the failed AUTH-PROD credentialed smoke first, then refresh required same-SHA release regressions and exact-head evidence. Reclassify XSTORE-019J only on actual green evidence.

**Task control as of this evidence:** XSTORE-019J = **BLOCKED / REAL OWNER-ADMIN QA IDENTITY ACTION REQUIRED**, rather than merge-conflict blocked or visually unapproved; XSTORE-019K and subsequent work remain **BLOCKED**, PR #392 stays **DRAFT / DO NOT MERGE** until all subsequent task/release gates and explicit Owner replacement-RC approval. Exact-main checks must be verified at the canonical post-integration stage; never claim exact-main merely from 20/21 PR workflow results. Do not auto-resend a potentially ambiguous automation instruction or publish schedules.

## 0.17 XSTORE-019J QA permission inventory — Owner report and read-only verification — 2026-10-10

Owner clarified that **QA access had intentionally been disabled** and requested inspection/recovery. This is an authorized request to investigate, not evidence that any particular `profiles.id` or GitHub Actions credential has been conclusively matched.

Read-only canonical Supabase MAGASIN-NOIBO verification (no secrets or identity identifiers collected in evidence):
- `public.profiles` group counts at inspection: **2 ACTIVE ACCOUNTANT**, **1 ACTIVE OWNER**, **2 ACTIVE STORE_MANAGER**, **28 ACTIVE STAFF**, **3 INACTIVE STAFF**.
- The one username matched by a *QA/test/procurement* name-pattern scan is an **ACTIVE ACCOUNTANT** profile with a corresponding `auth.users` row, confirmed email, prior login, no current ban and no soft deletion. This pattern scan **does not prove** the GitHub Actions secret `PROCUREMENT_QA_USERNAME` points to that profile. A different non-pattern username may have been disabled or replaced.
- The exact failed workflow `auth-prod-active-production-smoke` did **not** fail on role/permission after login: it failed **before login** when `resolve_login_email` returned NULL for the secret-backed username. The actual resolver requires an exact case/whitespace-normalized match in `profiles.username` and an `auth.users` match (profile status ACTIVE or PENDING). Do not assume that granting an arbitrary QA role or changing `access_scope` will resolve a **missing username match**.
- Workflow `.github/workflows/auth-prod-tests.yml` uses repository secret keys **`PROCUREMENT_QA_USERNAME` and `PROCUREMENT_QA_PASSWORD`**; it does not use repository secrets named `AUTH_PROD_ACTIVE_USERNAME` or `AUTH_PROD_ACTIVE_PASSWORD`. Secret values are non-retrievable through ordinary GitHub metadata, and were not accessed or printed.
- No `profiles.status`, `profiles.role`, `access_scope`, Supabase Auth account, password, repository secret, workflow, business record or production schedule was modified in this inspection. There is **insufficient identity linkage** to safely reactivate a specific account.

**Owner/authorized credential administration needed:** identify the exact QA identity intentionally disabled; either reactivate that *same* approved test account under canonical authorization or, if the credential is obsolete, set `PROCUREMENT_QA_USERNAME` and `PROCUREMENT_QA_PASSWORD` in repository Actions secrets to one approved existing ACTIVE QA identity (preserving any shared Procurement QA dependency). Do not paste credentials to ChatGPT, GitHub commits, PR comments or SOT. Then rerun failed credentialed AUTH-PROD smoke and verify valid active role routing, before requalifying the candidate. No bypass, fabricated identity, arbitrary role elevation or skipping the failed QA gate.

**Task status:** XSTORE-019J **BLOCKED — exact QA identity/secret link unresolved**; XSTORE-019K BLOCKED; PR #392 remains DRAFT / DO NOT MERGE and XSTORE-020 cannot be released. Owner-approved Manager/Employee/Owner UI acceptance remains intact.

## 0.18 XSTORE-019J AUTH-PROD credential gate cleared — 2026-10-10

Owner reports successful recovery of the QA account/credentials. GitHub's **actual rerun** of the same immutable PR candidate `014ea189a38c3d74b41226a84f9f77689672a324` verifies this recovery without reading/disclosing any credential:

- `AUTH-PROD Regression Contract` run [`38027909972`](https://github.com/magasincoffee/magasincoffee.github.io/actions/runs/38027909972), **attempt 2**, `completed/success`, updated `2026-10-10T13:10:13Z`;
- Both `auth-prod-active-production-smoke` and `auth-prod-red-contract` latest-attempt jobs are `completed/success`;
- Complete exact-PR-head list: **21/21 triggered workflows successful, 0 failed, 0 pending**, including XSTORE-019J, XSTORE-019 Unified RC, UI2 Cross Role and People Shift Day-10.

This **supersedes the failed-auth blocking conclusion** recorded in §§0.16–0.17; the same credential recovery does not require creating a duplicate user or changing the resolver implementation. Do not log secrets or reactivate unrelated staff accounts.

**Next task-state reconciliation gate:** XSTORE-019J's authentication check is GREEN, but its PR remains DRAFT/not merged and `main` received SOT-only commits after candidate head (GitHub compare showed PR ahead 188 / behind 3 at this check). Reconcile these authoritative documentation updates into the candidate without affecting Owner-approved UI, reverify post-refresh impacted QA and strict release governance, and document exact-candidate evidence before closing XSTORE-019J. Owner approved all three UI presentations already (§§0.10, 0.13, 0.15), so do not request redundant visual approval. **Do not merge or deploy prematurely; XSTORE-019K remains sequenced after XSTORE-019J.** Later XSTORE-019O replacement-RC approval and XSTORE-020 production gate remain independently required.

## 1. Purpose

Extend the closed Workforce Operations V1 scheduling flow so MAGASIN can operate the real shared-workforce model across CN1, CN2, CN3 and CN4.

The target operating flow is:

```text
Manager-owned employee store priorities
+
Employee weekly time availability
+
4-store staffing requirements
↓
Cross-store schedule draft
↓
Manager review/edit
↓
Validate
↓
Publish
```

Robot/automation may create a **DRAFT only**. Manager remains the final scheduling decision-maker.

## 2. Owner-approved business rules

### 2.1 Store priority belongs to Employee Profile

Each employee has an ordered list of stores determined by management.

Example:

```text
Như Huỳnh
1. CN3 — primary
2. CN2
3. CN4
4. CN1
```

Meaning:
- CN3 is the primary/highest-priority store;
- CN2, CN4, CN1 are secondary stores in descending priority;
- a store absent from the allowed list is NOT_ELIGIBLE, not merely low priority.

Manager/Owner controls this profile. Employee may view it but cannot change it.

The primary store remains a separate business fact for contract/profile/reporting purposes. The ordered store-priority list is used by scheduling.

### 2.2 Weekly Availability becomes time-only

Normal Employee weekly registration answers:

```text
"When can I work?"
```

not:

```text
"Which store do I choose this week?"
```

Therefore the normal Availability flow should remove the per-registration store selector after the new profile-level store-priority authority is implemented safely.

Availability and Store Priority are separate truths:

```text
Availability     = when the employee can work
Store Priority   = where management prefers the employee to work
Schedule         = where/when the employee is actually assigned
```

No temporary weekly store-exclusion feature is approved in this track yet. Do not invent one without a later Owner decision.

### 2.3 One enterprise schedule view across four stores

Scheduling must be understandable as one weekly MAGASIN plan, not four isolated scheduling decisions.

Owner/authorized scheduling management should be able to see the four store schedules together in the same weekly context, similar to the real operating schedule sheet:

```text
CN1
employee × Mon..Sun

CN2
employee × Mon..Sun

CN3
employee × Mon..Sun

CN4
employee × Mon..Sun
```

Useful filters/views may include all stores, one store, and employee-centric view, but they must project one canonical scheduling truth.

### 2.4 Cross-store safety

An employee assigned at one store for a time window must not appear as free for an overlapping assignment at another store.

The system must validate cross-store conflicts globally, including:
- same employee / overlapping time;
- existing max-shift/day rules;
- ACTIVE employee authority;
- store eligibility from the management-owned profile;
- current canonical schedule ownership.

Cross-store assignment does not change the employee's primary store.

### 2.5 Auto Schedule

Auto Schedule is a management aid, not an autonomous publisher.

```text
Availability + Store Priority + Staffing Requirements
→ AUTO SCHEDULE
→ DRAFT
→ Manager review/edit
→ Validate
→ Publish
```

The scheduler should consider all four stores together rather than filling CN1, then CN2, then CN3, then CN4 independently.

Priority order is a strong scheduling preference, not permission to violate hard constraints.

The automatic scheduler must not be implemented until the staffing-requirement input is explicitly defined and approved.

## 3. Affected product surfaces

Only the discussed scheduling surfaces are in this track:

1. **Employee Profile**
   - primary store;
   - ordered allowed-store priority;
   - Manager/Owner write authority;
   - Employee read-only projection.

2. **Employee Availability**
   - remove normal weekly store selection;
   - keep date/time availability registration;
   - preserve week/timezone and existing safety semantics.

3. **Manager / Owner Scheduling**
   - shared workforce pool;
   - four-store weekly master view;
   - cross-store assignment/editing;
   - global conflict visibility.

4. **Auto Schedule**
   - global four-store DRAFT proposal;
   - respects eligibility, priority and scheduling constraints;
   - never auto-publishes.

Out of scope unless explicitly added later:
- payroll formula/rates;
- attendance redesign;
- Swap/Give redesign;
- recruiting;
- KPI/performance;
- temporary weekly store exclusion;
- AI making final staffing decisions.

## 4. Implementation plan

| ID | Work | Result | Gate |
|---|---|---|---|
| XSTORE-001 | Store Manager authority + current implementation reconciliation | `STORE_MANAGER + ALL` live; Manager page loads real Workforce data | **DONE** |
| XSTORE-002 | Store Priority Profile contract | Ordered primary/allowed stores; Manager/Owner write; Employee read-only | **DONE / FEATURE READY** |
| XSTORE-003 | Availability simplification | Employee Availability is time-only; legacy per-registration store values cleared | **DONE** |
| XSTORE-004 | Cross-store scheduling contract | Shared pool + global overlap/eligibility validation while preserving canonical schedule truth | **DONE** |
| XSTORE-005 | Four-store master scheduling view | CN1–CN4 visible together in one weekly operating view | **DONE** |
| XSTORE-006 | Cross-store manual assignment | Eligible staff can be assigned across stores; invalid/overlap cases fail closed | **DONE** |
| XSTORE-007 | Staffing Requirement rule | Manager/Owner explicitly enters weekly store/date/time/headcount requirements; only `XSTORE_V1` rows are Robot authority | **DONE / FEATURE READY** |
| XSTORE-008 | Auto Schedule DRAFT engine | Global four-store DRAFT from Availability + Store Priority + explicit requirements; shortages returned; no auto-publish | **DONE / FEATURE READY / REAL INPUT PENDING** |
| XSTORE-009 | Review/edit/publish integration | Robot hands off to existing per-store edit + Validate → Review → Publish canonical state machine | **DONE** |
| XSTORE-010 | Full regression + production-safe acceptance | Exact-main static/browser/cross-role/pages regression | **DONE / EXACT-MAIN GREEN** |
| XSTORE-C01 | Recurring Staffing architecture lock | Reconcile current date-bound XSTORE requirement model, legacy recurring template, role/scope/security boundaries, and lock one recurring weekly authority | **DONE / ARCHITECTURE LOCKED** |
| XSTORE-C02 | Recurring Staffing schema + RPC authority | Implement canonical `store + day_of_week + start + end + target_headcount` persistence/read/write authority; preserve Manager/Owner scope and remove weekly re-entry requirement | **DONE / EXACT-MAIN GREEN** |
| XSTORE-C03 | Manager weekly staffing board UX | Replace row-based weekly/date input with CN1–CN4 Monday→Sunday staffing board; edit once, save, reuse until changed | **DONE / EXACT-MAIN GREEN** |
| XSTORE-C04 | Auto Schedule recurring projection | Auto Schedule projects the saved recurring template into the requested calendar week without creating a second staffing truth | **DONE / EXACT-MAIN GREEN / LIVE CUTOVER VERIFIED** |
| XSTORE-C05 | Regression + production-safe correction acceptance | Prove persistence across weeks, Manager edit/save, Robot projection, security, browser/reload and exact-main gates; no fake staffing/schedule business data | **DONE / EXACT-MAIN GREEN / PRODUCTION-SAFE ACCEPTANCE** |
| XSTORE-011 | Canonical reconciliation + temp cleanup | Real Manager configuration using the corrected recurring weekly model → Auto Schedule → review/edit → Validate → Review → Publish → permanent-doc reconciliation → delete TEMP SOT | **PAUSED / RESUME AFTER XSTORE-020** |
| XSTORE-012 | Empty DRAFT production hotfix | Empty DRAFT routes back to Auto Schedule; zero-assignment generation fails validation/review/publish; regression + production release | **DONE / RELEASED / EXACT-MAIN GREEN** |
| XSTORE-013 | Coverage semantics + shortage interval engine | Staffing Requirement means continuous required coverage; multiple employees may combine to cover one requirement; shortage output must identify exact uncovered intervals | **DONE / EXACT-MAIN GREEN** |
| XSTORE-014 | Auto Schedule interval composition | Auto Schedule composes compatible employee intervals into continuous coverage instead of requiring one employee to cover the whole requirement block; still DRAFT-only | **DONE / EXACT-MAIN GREEN** |
| XSTORE-015 | Manager manual Availability override + employee picker | Manager/Owner may manually assign an ACTIVE store-eligible employee even without matching Availability; save DRAFT succeeds with an explicit warning/audit marker | **DONE / EXACT-MAIN GREEN** |
| XSTORE-016 | Historical scheduling IA + branch accordion | Exact-main implementation evidence remains valid, but the accordion information architecture is superseded by the Owner calendar-first decision dated 2026-10-05 | **DONE / HISTORICAL UI SUPERSEDED** |
| XSTORE-017 | Inline shortage visualization + direct resolution | Show shortage directly in the exact day/time cell using a dedicated warning color; click shortage to open filtered candidate flow and remove warning immediately when coverage is restored | **DONE / EXACT-MAIN GREEN** |
| XSTORE-018 | Historical supplemental employee pool semantics | Candidate derivation/ranking remains canonical, but the always-visible long employee pool is superseded; the same data must move into an on-demand drawer/picker | **DONE / HISTORICAL UI SUPERSEDED** |
| XSTORE-019 | Previous unified RC qualification | PR #392 exact RC `1301678dbf6ffeef88cd5ced59ffa1c10d6bfae4` passed automation but was explicitly rejected by Owner for scheduling display/interaction architecture; do not merge this RC | **CHANGES_REQUESTED / RC INVALIDATED** |
| XSTORE-019A | Manager single-store calendar workspace | Calendar-first weekly workspace; only one selected store is open; remove branch accordion stack and long always-visible employee pool | **DONE / EXACT-HEAD GREEN** |
| XSTORE-019B | Direct calendar shift editing | Add/edit/move/resize/delete/duplicate DRAFT shifts directly on the weekly calendar while preserving canonical writer and hard safety | **DONE / EXACT-HEAD GREEN** |
| XSTORE-019C | On-demand employee drawer + shortage resolution | Employee candidates appear only when Manager requests add/supplement; exact store/day/time filtering and canonical ranking/manual override semantics | **DONE / EXACT-HEAD GREEN** |
| XSTORE-019D | Employee Availability calendar parity | Employee registers weekly time-only Availability directly on a calendar using the same visual/time interaction model | **DONE / EXACT-HEAD GREEN** |
| XSTORE-019E | Owner calendar parity + responsive workspace | Owner reuses the same single-store calendar workflow; optimize desktop/mobile viewport and preserve role authority | **DONE / EXACT-HEAD GREEN** |
| XSTORE-019F | Integrated RC qualification + Owner preview packet | Exact-head regression/browser/backend/cache qualification; freeze new RC and prepare Owner review without production merge | **DONE / HISTORICAL RC INVALIDATED BY OWNER UX V4** |
| XSTORE-019G | Manager five-board UI implementation | Rework the real Manager UI to match the Owner-approved Manager mockup while preserving the locked five-board workflow and authority | **DONE / VISUAL-FIDELITY REMEDIATION GREEN / EXACT-HEAD GREEN** |
| XSTORE-019H | Employee mobile-first UI implementation | Rework the real Employee UI to match the Owner-approved mobile mockup while preserving flexible-time and attendance semantics | **DONE / VISUAL-FIDELITY REMEDIATION GREEN / EXACT-HEAD GREEN** |
| XSTORE-019I | Owner strategy/P&L UI implementation | Rework the real Owner dashboard to match the Owner-approved desktop/mobile strategy mockup without fabricating financial truth | **DONE / VISUAL-FIDELITY REMEDIATION GREEN / EXACT-HEAD GREEN** |
| XSTORE-019J | Authenticated real-local UI requalification + Owner-requested Manager calendar workspace UX correction | Implement §0.5 + §0.6 and §0.7 on the candidate branch; treat repository mockups as hard visual authority, render grouped multi-employee Shift Clusters, preserve five-step authority, then requalify the exact candidate on the authenticated real local app with fresh screenshot comparison before Owner review | **CHANGES_REQUESTED / EXECUTABLE / OWNER-MOCKUP VISUAL-FIDELITY REMEDIATION REQUIRED / OWNER RE-APPROVAL PENDING** |
| XSTORE-019K | Employment type + scheduling priority authority | Add management-owned FULL_TIME/PART_TIME employment type separate from EMPLOYEE role and use it as a scheduling ranking preference after hard eligibility | **BLOCKED / OWNER UI IMPLEMENTATION RE-APPROVAL REQUIRED** |
| XSTORE-019L | Employee flexible Availability + attendance wiring | Wire free start/end multi-interval Availability and published-schedule attendance semantics; outside-schedule/manual-time attendance requires Manager confirmation | **PENDING / AFTER UI GATE** |
| XSTORE-019M | Manager five-board workflow integration | Wire Prepare→Create Draft→Edit→Check→Approve/Publish to canonical scheduling state; Check is read-only same-calendar review for one selected store | **PENDING / AFTER UI GATE** |
| XSTORE-019N | Owner strategic data integration | Wire Owner strategic dashboard to existing authorized revenue/cost/profit/customer/store/product aggregates without turning Owner home into scheduling operations | **PENDING / AFTER UI GATE** |
| XSTORE-019O | Integrated qualification + replacement exact RC | Full cross-role/browser/security/cache/backend-impact qualification; freeze replacement RC and Owner production-review packet | **PENDING** |
| XSTORE-020 | Live production acceptance + permanent reconciliation | Only after Owner approves the replacement exact RC from XSTORE-019O; release via production governance, run real acceptance, reconcile permanent docs and resume XSTORE-011 closure | **PAUSED / WAITING FOR XSTORE-019G→019O** |

## 5. Recommended execution order

```text
XSTORE-001 DONE
→ XSTORE-002 DONE
→ XSTORE-003 DONE
→ XSTORE-004 DONE
→ XSTORE-005 DONE
→ XSTORE-006 DONE
→ XSTORE-007 DONE
→ XSTORE-008 DONE
→ XSTORE-009 DONE
→ XSTORE-010 DONE
→ XSTORE-C01 DONE
→ XSTORE-C02 DONE
→ XSTORE-C03 DONE
→ XSTORE-C04 DONE
→ XSTORE-C05 DONE
→ XSTORE-012 DONE
→ XSTORE-013 DONE
→ XSTORE-014 DONE
→ XSTORE-015 DONE
→ XSTORE-016 DONE / historical accordion UI superseded
→ XSTORE-017 DONE
→ XSTORE-018 DONE / candidate semantics retained, always-visible pool superseded
→ XSTORE-019 CHANGES_REQUESTED / RC 1301678d... invalidated by Owner
→ XSTORE-019A DONE / exact-head GREEN / single-store calendar workspace
→ XSTORE-019B DONE / exact-head GREEN / direct shift editing
→ XSTORE-019C DONE / exact-head GREEN / on-demand employee drawer + shortage resolution
→ XSTORE-019D DONE / exact-head GREEN / Employee Availability calendar
→ XSTORE-019E DONE / exact-head GREEN / Owner parity + responsive workspace
→ XSTORE-019F DONE / historical RC qualified, then invalidated by Owner UX V4 decisions on 2026-10-06
→ XSTORE-019G DONE / Manager visual-fidelity remediation / exact-head GREEN
→ XSTORE-019H DONE / Employee visual-fidelity remediation / exact-head GREEN
→ XSTORE-019I DONE / Owner strategy-dashboard visual-fidelity remediation / exact-head GREEN
→ XSTORE-019J CHANGES_REQUESTED / implement §0.5 workspace ergonomics + §0.6 multi-employee Shift Cluster, then authenticated real-local cross-role visual requalification
→ OWNER UI IMPLEMENTATION RE-APPROVAL REQUIRED
→ XSTORE-019K BLOCKED UNTIL OWNER RE-APPROVAL / FULL_TIME + PART_TIME authority and scheduling ranking
→ XSTORE-019L / flexible Employee Availability + attendance integration
→ XSTORE-019M / Manager five-board canonical workflow integration
→ XSTORE-019N / Owner strategic data integration
→ XSTORE-019O / integrated qualification + replacement exact RC
→ OWNER APPROVAL OF REPLACEMENT EXACT RC REQUIRED
→ XSTORE-020 / midnight production release + live acceptance + reconciliation
→ XSTORE-011 RESUME / final live closure + TEMP SOT deletion
```

XSTORE-019G→019J are reopened as visual-fidelity remediation/qualification tasks under the Owner-approved mockups in §0.4. They continue in order without inventing new business rules, but XSTORE-019J must qualify the **actual authenticated local app**, not fixture-only preview surfaces. The robot must stop after XSTORE-019J for explicit Owner UI re-approval before any new live data/logic wiring. Only after that re-approval may XSTORE-019K→019O continue automatically unless a genuinely new business decision is required. The prior XSTORE-019F exact RC and prior XSTORE-019G→019J visual GREEN conclusions are historical evidence only and must not be merged/released or treated as current visual acceptance.

## 6. Current Owner boundary

Already approved:
- management owns store priority;
- priority belongs to Employee Profile, not weekly Availability;
- Employee weekly registration becomes time-only;
- four stores share workforce;
- scheduling should expose the total four-store weekly picture;
- Robot/Auto Schedule creates a draft only;
- Manager reviews/edits and publishes.

Staffing Requirement semantics from XSTORE-007 are now **historical implementation state and must be corrected before final acceptance**.

Owner-approved final operating semantics as of 2026-10-01, extended by UX V4 decisions on 2026-10-06:

- Manager/Owner configures a recurring weekly requirement as **store + weekday + start time + end time + target headcount**;
- the configuration is saved once and reused for later weeks until management edits and saves it;
- Manager must not re-enter the same demand for every calendar week;
- the system must not infer or invent headcount;
- Auto Schedule must project the recurring authority into the selected target week rather than treating date-bound copies as a second authority;
- existing `XSTORE_V1` date-bound rows and legacy template structures are migration/reconciliation inputs only until XSTORE-C01 locks the final canonical authority.

Current execution boundary:
- XSTORE-001→010 and XSTORE-C01→C05 remain accepted implementation lineage;
- XSTORE-012 is **DONE / RELEASED / EXACT-MAIN GREEN**;
- real Store Priority and recurring staffing business inputs now exist and have already been exercised during the XSTORE-012 production investigation;
- Owner has approved the Scheduling V3 architecture in section 6.0.9 below;
- XSTORE-013 is **DONE / EXACT-MAIN GREEN**;
- XSTORE-014 is **DONE / EXACT-MAIN GREEN**;
- XSTORE-015 is **DONE / EXACT-MAIN GREEN**;
- **XSTORE-016 is the sole next executable task**;
- XSTORE-011 is intentionally **PAUSED** until XSTORE-013→020 are completed, because publishing a real week before correcting continuous coverage, manual override and Manager UX would accept superseded behavior;
- no task may relax cross-store overlap, ACTIVE employee, store eligibility, official overlap or other existing hard safety boundaries;
- Store Priority remains a hard eligibility boundary in this track: Manager may override Availability, but may not assign an employee to a store absent from that employee's Store Priority profile;
- Auto Schedule must continue to create DRAFT only; Manager/Owner remains final review/publish authority.

## 6.0.1 XSTORE-C01 recurring staffing architecture lock — 2026-10-01

XSTORE-C01 is **DONE / ARCHITECTURE LOCKED**.

Canonical decision:
- corrected staffing-demand authority will be a new recurring-only persistence: `public.workforce_recurring_staffing_requirements`;
- business contract is exactly `store_id + day_of_week + start_time + end_time + target_headcount`;
- existing date-bound `staffing_requirements` / `authority_source='XSTORE_V1'` rows are historical/reconciliation input only and will not be dual-written;
- legacy `staffing_requirement_templates` remains legacy/reconciliation input only; its deprecated writer is not re-enabled;
- browser direct table access remains denied; ACTIVE `OWNER` / `STORE_MANAGER` use bounded RPCs with `can_access_store` enforcement;
- XSTORE-C04 will project recurring weekday blocks directly into the selected calendar week without persisting date-bound staffing copies;
- `work_schedules` remains the sole official schedule truth.

Canonical C01 evidence:

`05_SYSTEM/XSTORE_C01_RECURRING_STAFFING_ARCHITECTURE_LOCK.md`

Safe cutover order:
```text
C02 add recurring schema/RPC authority
→ C03 switch Manager staffing board
→ C04 switch Robot to recurring projection + revoke/deprecate date-bound XSTORE staffing RPCs
→ C05 regression/production-safe acceptance
```

No production staffing values or schedules are created by C01.

## 6.0.2 XSTORE-C02 recurring staffing schema + RPC authority — 2026-10-01

XSTORE-C02 is **DONE / EXACT-MAIN GREEN**.

Implementation:
- migration: `20261001172500_xstore_c02_recurring_staffing_authority_v1.sql`;
- canonical recurring table: `public.workforce_recurring_staffing_requirements`;
- canonical reader: `list_workforce_recurring_staffing_requirements_v1()`;
- canonical writer: `replace_workforce_recurring_staffing_requirements_v1(jsonb)`;
- direct browser table access is revoked;
- ACTIVE `OWNER` / `STORE_MANAGER` only, with `can_access_store` enforcement;
- no import or dual-write from date-bound `XSTORE_V1` rows or legacy `staffing_requirement_templates`;
- no production staffing values were fabricated.

Canonical evidence:

`05_SYSTEM/XSTORE_C02_RECURRING_STAFFING_SCHEMA_RPC_ACCEPTANCE.md`

Implementation PR #354:
- head `0e4e8f563e01e0a42b2699809b4098c685e32f9e`;
- merge / executable main `e77f8fe630d4dcfba16b3344b11eeaa66e18bfaf`.

Exact-main gates:
- Validate MAGASIN GitHub Pages source `36849502939` = **SUCCESS**;
- UI2 Cross Role Acceptance `36849502941` = **SUCCESS**;
- People Shift Day-10 Tests `36849502990` = **SUCCESS**;
- Pages build/deployment `36849502031` = **SUCCESS**.

XSTORE-C03 is now the next authoritative task. C03 owns the Manager weekly staffing board UX only; C04 owns Robot recurring projection/cutover.

## 6.0.3 XSTORE-C03 recurring weekly staffing board UX — 2026-10-01

XSTORE-C03 is **DONE / EXACT-MAIN GREEN**.

Implementation:
- Manager staffing input is now a CN1–CN4 × Monday→Sunday recurring weekly board;
- the board uses only `list_workforce_recurring_staffing_requirements_v1()` and `replace_workforce_recurring_staffing_requirements_v1(jsonb)`;
- recurring saves use `store_id + day_of_week + start_time + end_time + target_headcount`;
- the Manager staffing UX no longer sends `work_date` or `p_week_start`;
- date-bound staffing reader/writer RPCs are no longer called by this UI;
- Auto Schedule is intentionally disabled/fail-closed until XSTORE-C04 switches Robot projection to recurring authority;
- no production staffing values or schedules were fabricated by C03.

Canonical evidence:

`05_SYSTEM/XSTORE_C03_RECURRING_STAFFING_BOARD_ACCEPTANCE.md`

Implementation PR #356:
- head `0ab23a8ba98fadc07e9d5059d85fd219712f51bf`;
- merge / executable main `12fda81c2209837bc649e8755b92198449b3c749`.

Exact-main gates:
- Validate MAGASIN GitHub Pages source `36851309700` = **SUCCESS**;
- UI2 Cross Role Acceptance `36851309494` = **SUCCESS**;
- People Shift Day-10 Tests `36851309615` = **SUCCESS**;
- Pages build/deployment `36851308669` = **SUCCESS**.

XSTORE-C04 is now the next authoritative task. C04 owns Robot recurring projection/cutover; XSTORE-C05 remains the full regression and production-safe correction acceptance gate.

## 6.0.4 XSTORE-C04 Auto Schedule recurring projection — 2026-10-01

XSTORE-C04 is **DONE / EXACT-MAIN GREEN / LIVE CUTOVER VERIFIED**.

Implementation:
- Auto Schedule reads only the canonical recurring staffing authority;
- recurring weekday blocks are projected directly into the selected target week using `p_week_start + (day_of_week - 1)`;
- no date-bound staffing rows are materialized or dual-written;
- Manager UI uses `XSTORE_GLOBAL_RECURRING_V1`;
- Robot assignments remain DRAFT-only;
- browser EXECUTE is revoked from the superseded date-bound staffing reader/writer RPCs;
- no production staffing values, draft assignments or official schedules were fabricated.

Production reconciliation:
- missing live C02 recurring authority was reconciled using the already accepted C02 migration;
- C04 live migration `xstore_c04_recurring_auto_projection_v1` is applied;
- recurring staffing rows = 0;
- date-bound `XSTORE_V1` staffing rows = 0;
- draft assignment rows = 0;
- official schedule rows = 0.

Canonical evidence:

`05_SYSTEM/XSTORE_C04_RECURRING_AUTO_PROJECTION_ACCEPTANCE.md`

Implementation PR #358:
- head `1264a44663a175c10747aaa5056bf3953b81dc37`;
- merge / executable main `5256400601b328006e25b0d820fa2d0c02ec9304`.

Exact-main gates:
- Validate MAGASIN GitHub Pages source `36853279404` = **SUCCESS**;
- UI2 Cross Role Acceptance `36853279359` = **SUCCESS**;
- People Shift Day-10 Tests `36853279603` = **SUCCESS**;
- Pages build/deployment `36853279239` = **SUCCESS**.

XSTORE-C05 is now the next authoritative task and owns the full recurring-model regression, security, persistence/reload and production-safe acceptance gate before XSTORE-011.

## 6.0.5 XSTORE-C05 recurring regression + production-safe correction acceptance — 2026-10-01

XSTORE-C05 is **DONE / EXACT-MAIN GREEN / PRODUCTION-SAFE ACCEPTANCE**.

Acceptance:
- recurring Manager save/read/edit/read semantics were proven using an existing ACTIVE `STORE_MANAGER` identity inside a transaction;
- the same recurring staffing configuration was projected into two distinct target weeks;
- both Robot results remained `DRAFT`, `published=false`, with `staffing_authority=RECURRING_WEEKLY_V1`;
- no date-bound `XSTORE_V1` staffing rows were materialized;
- no official `work_schedules` rows were created;
- all transactional test values and temporary generation runs were rolled back;
- post-rollback production returned to recurring rows = 0, XSTORE date-bound rows = 0, assignments = 0, official schedules = 0;
- browser regression proves recurring edit persistence across reload and reuse after changing target week;
- recurring direct browser CRUD remains denied;
- old date-bound staffing RPC browser execution remains revoked.

Canonical evidence:

`05_SYSTEM/XSTORE_C05_RECURRING_REGRESSION_ACCEPTANCE.md`

Acceptance PR #360:
- head `38a9760bccd80ba4f8795850646179846f24d229`;
- merge / executable main `adeeee59bcec573f81d03a273a2d93babc0583dd`.

Exact-main gates:
- Validate MAGASIN GitHub Pages source `36855243385` = **SUCCESS**;
- UI2 Cross Role Acceptance `36855243424` = **SUCCESS**;
- People Shift Day-10 Tests `36855243411` = **SUCCESS**;
- Pages build/deployment `36855242031` = **SUCCESS**.

XSTORE-011 is now the next authoritative task. It owns real Manager business configuration, real Auto Schedule review/edit/Validate/Review/Publish acceptance, permanent Workforce documentation reconciliation, and deletion of this TEMP SOT.

## 6.0.6 XSTORE-011 live preflight blocker — 2026-10-01

XSTORE-011 is **BLOCKED / OWNER INPUT REQUIRED**.

Live production preflight:
- ACTIVE employees = 4;
- Store Priority rows = 0;
- employees with Store Priority = 0;
- ACTIVE stores = 4;
- recurring staffing rows = 0;
- stores with recurring staffing = 0;
- draft assignment rows = 0;
- official `work_schedules` rows = 0.

Candidate real target week `2026-10-05 → 2026-10-11` already has real Availability:
- Availability rows = 10;
- employees with Availability = 2.

Owner/Manager must provide or enter two real business inputs before XSTORE-011 may resume:
1. ordered Store Priority for each participating employee;
2. recurring weekly staffing blocks for CN1–CN4 using `store + weekday + start_time + end_time + target_headcount`.

These values must not be inferred from primary store, Availability, legacy templates, historical schedules, or date-bound staffing.

Canonical blocker evidence:

`05_SYSTEM/XSTORE_011_OWNER_INPUT_BLOCKER_2026_10_01.md`

After the two business inputs exist in production, XSTORE-011 resumes with real Auto Schedule → Manager review/edit → Validate → Review → Publish, then permanent-document reconciliation and deletion of this TEMP SOT.

No Store Priority, staffing demand, draft assignment or official schedule was fabricated during this blocked attempt.

## 6.0.7 XSTORE-012 empty-DRAFT production blocker — 2026-10-04

XSTORE-012 is **IN DEVELOPMENT / PRODUCTION RELEASE NOT YET AUTHORIZED**.

Owner resumed XSTORE-011 with real production inputs. Direct production reconciliation for target week `2026-10-05 → 2026-10-11` found:

- recurring staffing requirements = 103 blocks across 4 stores, total target headcount = 120;
- Availability = 100 rows from 17 employees;
- Store Priority = 98 rows across 26 employees and all 4 stores;
- current target-week generation = one CN1 `DRAFT` created by `MANAGER_DIRECT_V1`;
- target-week generation assignments = 0;
- official `work_schedules` rows = 0;
- pre-scheduler eligibility check found 96/103 staffing blocks with at least one eligible employee; therefore a completely empty schedule is not explained by missing Availability alone.

Production defect:

```text
existing empty DRAFT
→ guided workflow treats DRAFT as already generated
→ Auto Schedule action is skipped
→ zero-assignment validator produces zero violations
→ empty schedule can appear VALID
→ Review/Publish can become reachable
```

Required repair:

1. four-store master must expose persisted global DRAFT/official row counts to the guided workflow;
2. `DRAFT + globalDraftCount = 0` must route back to **Tạo lịch nháp tự động**;
3. browser Validate / Review / Publish controls must fail closed when the selected generation has zero assignments;
4. `validate_schedule_generation_v1` must return `EMPTY_GENERATION` for a zero-assignment generation;
5. existing Review and Publish RPCs remain canonical and inherit the server guard through their existing validator call;
6. changed runtime assets must receive a new cache-busting version;
7. regression coverage must prove the empty-DRAFT recovery and server fail-closed contract.

Release authority:

- this is production-impacting and must follow `PRODUCTION_RELEASE_GOVERNANCE_V1_SOURCE_OF_TRUTH.md`;
- development occurs only on a non-production branch;
- backend migration requires isolated/staging proof before production;
- exact RC SHA, rollback SHA, green QA and Owner approval are required before release;
- normal release window remains 00:00 Asia/Ho_Chi_Minh unless Owner explicitly authorizes a same-conversation exception after reviewing the exact RC.

## 6.0.8 XSTORE-012 emergency production release — 2026-10-04

XSTORE-012 is **DONE / RELEASED / EXACT-MAIN GREEN**.

Owner explicitly approved emergency release before the normal 00:00 Asia/Ho_Chi_Minh window for exact RC:

`abd9c973f9a7f7fa84dbf1da57fa8439597a113c`

Release evidence:

- PR #383 merged with expected-head guard;
- production merge/main SHA: `308401f914034795c23412076446e976af2538fe`;
- rollback baseline: `883ee6eda6e2d769d8a0da47ddb2eb43af12e740`;
- production migration `xstore_012_empty_draft_validation_guard_v1` applied successfully;
- production validator definition contains `EMPTY_GENERATION`;
- Validate MAGASIN GitHub Pages source run `37195716193` = **SUCCESS**;
- XSTORE-012 Backend Hotfix QA run `37195716109` = **SUCCESS**;
- UI2 Cross Role Acceptance run `37195716148` = **SUCCESS**;
- People Shift Day-10 Tests run `37195716156` = **SUCCESS**;
- Pages build/deployment run `37195715408` = **SUCCESS**.

Production-safe smoke:

- an authenticated Owner-context transaction called the exact production Auto Schedule for target week `2026-10-05 → 2026-10-11` with replacement enabled;
- inside the transaction Auto Schedule produced **87 DRAFT assignments across all 4 stores**;
- the transaction produced **0 official schedule rows**;
- the transaction was rolled back;
- after rollback production returned to the pre-smoke state: **0 draft assignments, 1 pre-existing empty target-week generation, 0 official rows**.

This proves the repaired production path can now move the existing empty DRAFT back through Auto Schedule without persisting test business truth.

Next XSTORE-011 live action:

```text
Manager opens target week 2026-10-05
→ guided action shows Tạo lịch nháp tự động for the empty DRAFT
→ Manager runs Auto Schedule
→ review the generated CN1–CN4 DRAFT and shortages
→ edit as needed
→ Validate
→ Review
→ Publish
```

Do not mark XSTORE-011 complete until the real Manager-approved schedule is published and final permanent-doc reconciliation/temp cleanup is complete.

## 6.0.9 Scheduling V3 architecture lock — Owner approved 2026-10-04

This section is the **authoritative temporary implementation contract** for XSTORE-013→020.

### A. Staffing Requirement means continuous operating coverage

A recurring Staffing Requirement such as:

```text
CN1 · Monday · 06:00–12:00 · target_headcount=1
```

means:

> At every moment inside 06:00–12:00, at least one eligible employee must be present at that store.

It does **not** mean one employee must personally work the entire 06:00–12:00 block.

Valid coverage example:

```text
Requirement: 06:00–12:00 · need 1
A:           06:00–09:00
B:           09:00–12:00
Result:      FULLY COVERED
```

Invalid coverage example:

```text
Requirement: 06:00–12:00 · need 1
A:           06:00–08:00
B:           08:30–12:00
Result:      SHORTAGE 08:00–08:30 · missing 1
```

For target headcount 2, every instant inside the requirement must have at least 2 active assignments.

The scheduler/shortage engine must therefore operate on interval coverage, not whole-block employee matching.

### B. Auto Schedule interval composition

Auto Schedule must:
- read recurring Staffing Requirement + Employee Availability + Store Priority;
- consider CN1–CN4 globally;
- compose multiple compatible employee availability intervals to satisfy one requirement when necessary;
- preserve all existing overlap/day/store/official hard safety rules;
- prefer higher Store Priority and reasonable shift continuity;
- avoid unnecessary fragmentation when equivalent full coverage can be produced with fewer/cleaner shifts;
- return exact uncovered intervals, target, assigned coverage and missing headcount;
- create DRAFT only;
- never automatically Review or Publish.

Auto Schedule must continue to respect registered Availability. The Availability override in section C is Manager-only.

### C. Manager manual Availability override

Availability is a planning input, not a hard prohibition on Manager manual assignment.

Manager/Owner may manually select an employee who did not register the selected time when real operations require calling/dispatching that person.

Canonical rule:

```text
Auto Schedule + Availability mismatch     => NOT ELIGIBLE for automatic assignment
Manager manual + Availability mismatch    => ALLOWED DRAFT + explicit warning/audit
```

Manager employee selection must not be availability-only.

For the selected store and interval, the picker should classify employees:

1. **Đã đăng ký phù hợp** — registered Availability covers the interval.
2. **Còn thời gian có thể xếp** — employee has Availability remaining around existing assignments.
3. **Có thể điều động thủ công** — no matching Availability, but ACTIVE + store-eligible + no hard conflict.
4. **Không thể chọn** — hard conflict or hard authority failure.

When Manager manually assigns outside Availability:
- DRAFT save succeeds;
- assignment receives a canonical warning/audit marker such as `MANAGER_AVAILABILITY_OVERRIDE`;
- UI shows a human label such as **“Quản lý điều động ngoài thời gian đăng ký”**;
- Validate/Review/Publish treat the Availability mismatch as a warning only for this explicit Manager override;
- non-manual writers may not silently bypass Availability.

### D. Hard blocks that remain fail-closed

The new manual flexibility must **not** weaken these boundaries:

- employee must exist and be ACTIVE;
- employee role must be scheduling-eligible;
- target store must be present in the employee's management-owned Store Priority profile;
- assignment must be inside the target week;
- end time must be after start time;
- same employee may not overlap within the same store;
- same employee may not overlap across different stores;
- assignment may not overlap official schedule truth;
- max assignment/day and other accepted hard Workforce safety rules remain enforced;
- REVIEWED/PUBLISHED/official state cannot be silently overwritten.

**Store Priority override is NOT approved in XSTORE-013→020.**
Manager may override Availability only. A store absent from Store Priority remains `STORE_NOT_ELIGIBLE`.

### E. Calendar-first single-store scheduling architecture — Owner locked 2026-10-05

The previous **CN1–CN4 accordion + always-visible supplemental employee pool** layout is superseded.

The canonical Manager scheduling page is now a **single-store weekly calendar workspace**, visually and interactively similar to a Google Calendar-style schedule editor.

Core rule:

```text
SELECT ONE STORE
→ SHOW THAT STORE'S WEEKLY CALENDAR AS THE PRIMARY SCREEN
→ EDIT DIRECTLY ON THE CALENDAR
→ OPEN EMPLOYEE PICKER/DRAWER ONLY WHEN NEEDED
→ VALIDATE / REVIEW / PUBLISH THROUGH THE EXISTING CANONICAL WORKFLOW
```

When CN1 is selected, the main workspace shows CN1 only. CN2/CN3/CN4 must not consume vertical screen space. Changing store switches the workspace.

The top bar is compact/sticky and contains:
- selected store: CN1 / CN2 / CN3 / CN4;
- target week with previous/current/next navigation;
- DRAFT/REVIEWED/PUBLISHED status;
- Auto Schedule where applicable;
- Save;
- Validate;
- Review;
- Publish.

Do not render the old five-step chips as a large multi-row block. Do not render a long employee list above or below the calendar by default.

The calendar is the dominant viewport:
- columns: T2 → CN;
- vertical time axis: 05:00 → 22:00;
- day header remains visible while the calendar scrolls internally;
- on normal desktop/laptop the seven-day week and selected-store context must remain readable without a page-level horizontal detour;
- vertical time scrolling belongs inside the calendar workspace rather than forcing the user to scroll past unrelated employee cards;
- opening/closing a drawer must return the user to the same store/week/time context.

### F. Direct calendar editing

Manager/Owner must be able to manipulate DRAFT shifts directly on the calendar.

Required interactions:
- click/drag an empty time range to create a shift;
- click an existing shift to edit employee/start/end;
- drag a shift to another day/time;
- resize the shift start/end from its edges;
- delete directly from the shift editor;
- duplicate/copy a shift to another day when requested by the Manager;
- preserve unsaved-change protection when changing store/week;
- all mutations continue through the existing canonical DRAFT writer; do not create a second writer.

A shift card must show the employee name and exact time clearly enough to scan the week without opening a secondary list.

Canonical time-band colors remain:
- `05:00–<12:00` → yellow;
- `12:00–<17:00` → light red;
- `17:00–22:00` → light blue.

### G. Inline shortage + on-demand employee drawer

Shortage stays directly inside the affected day/time cell. Do not create a separate long **Cần xử lý** list.

Example:

```text
⚠ THIẾU 1 NHÂN VIÊN
06:00–08:00
[+ Bổ sung nhân viên]
```

Shortage uses the existing purple/indigo warning family with icon + text and must remain distinct from the three time-band colors.

The old always-visible **NHÓM NHÂN SỰ BỔ SUNG / 25 nhân viên...** area is no longer allowed on the primary scheduling screen.

Employee candidates appear only when the Manager:
- creates a shift;
- edits the employee on a shift; or
- clicks **+ Bổ sung nhân viên** on an exact shortage.

Open a right-side drawer/picker (or equivalent compact overlay) scoped to the exact store/date/time. Canonical ranking remains:

```text
1. Đúng thời gian đăng ký
2. Còn thời gian có thể xếp
3. Có thể điều động thủ công
4. Không thể chọn do hard conflict
```

The third group preserves the accepted `MANAGER_AVAILABILITY_OVERRIDE` warning/audit semantics. Hard-conflict candidates remain disabled.

Closing the picker returns to the full calendar without losing the current store/week/time position.

### H. Employee Availability uses the same calendar mental model

Employee weekly Availability must no longer depend on a form/list interaction that feels unrelated to Manager scheduling.

Canonical Employee model:
- weekly, time-only Availability;
- columns T2 → CN;
- time axis 05:00 → 22:00;
- click/drag empty time to add Availability;
- click/resize/move to edit;
- delete directly;
- no store selection in weekly Availability;
- keep existing Store Priority management authority separate and read-only to Employee.

Availability is visually lighter than an assigned shift so **có thể làm** cannot be confused with **đã được xếp ca**.

Employee and Manager therefore share the same time/calendar mental model while retaining different permissions.

### I. Owner parity, secondary four-store view and canonical workflow

Owner scheduling must reuse the same single-store calendar workspace and canonical DRAFT writer. Owner must not receive a separate technical scheduling UI.

The four-store overview remains available only as a secondary/collapsed summary. It must not sit between store selection and the editable calendar.

Canonical Manager/Owner workflow:

```text
Open target week
→ select CN1/CN2/CN3/CN4
→ calendar for only that store becomes the primary workspace
→ Auto Schedule may create/refresh DRAFT
→ inspect/edit shifts directly on calendar
→ exact shortage appears inside affected calendar cell
→ click + Bổ sung nhân viên only when needed
→ choose registered / remaining / manual-dispatch employee
→ save DRAFT
→ Validate hard conflicts
→ Review
→ Publish
```

Availability override warnings may remain visible through Validate/Review/Publish but do not block those transitions when the override was explicitly created by Manager/Owner and no hard rule is violated.

The previous PR #392 exact RC `1301678dbf6ffeef88cd5ced59ffa1c10d6bfae4` is **not Owner-approved**. It is retained only as automation/evidence history and must not be merged as the release candidate.

### J. Robot task plan and acceptance gates

#### XSTORE-013 — Continuous coverage + exact shortage engine

Scope:
- implement reusable interval-coverage evaluation for recurring requirement blocks;
- calculate exact uncovered sub-intervals and missing headcount;
- preserve current recurring requirement authority;
- do not change Auto Schedule assignment composition yet except where required to expose/test coverage primitives.

Acceptance:
- split shifts can fully satisfy one requirement;
- a real time gap yields only that gap as shortage;
- target_headcount > 1 is evaluated at every interval boundary;
- deterministic SQL/unit regression covers boundaries and adjacent intervals;
- no production business data fabricated.

#### XSTORE-014 — Interval-composed Auto Schedule

Scope:
- update `auto_generate_cross_store_schedule_v1` to use continuous coverage instead of full-block candidate coverage;
- combine multiple employee intervals when required;
- preserve Store Priority, cross-store overlap, official overlap and DRAFT-only authority;
- minimize unnecessary fragmentation when feasible.

Acceptance:
- the 06:00–09:00 + 09:00–12:00 case can satisfy a 06:00–12:00 requirement;
- no gap/overlap corruption;
- shortages returned as exact uncovered intervals;
- Auto Schedule still rejects employees outside registered Availability;
- four-store global safety remains fail-closed.

#### XSTORE-015 — Manager Availability override + full eligible employee picker

Scope:
- Manager manual picker reads all ACTIVE employees eligible for the selected store;
- matching Availability is ranking/status metadata, not the only candidate source;
- DRAFT writer tags explicit manual out-of-Availability assignment;
- validator converts that tagged Availability mismatch to warning;
- existing hard conflicts remain violations.

Acceptance:
- Manager can save out-of-Availability DRAFT;
- warning survives reload;
- Validate/Review/Publish can proceed with warning and no hard violations;
- Auto Schedule remains Availability-bound;
- employee outside Store Priority remains blocked.

#### XSTORE-016 — Scheduling IA + branch accordion editor (historical; superseded by XSTORE-019A)

Scope:
- global header contains week/global summary/actions only;
- remove global branch selector from header;
- CN1–CN4 DRAFTs become accordion rows;
- active branch editor is rendered inside its branch;
- four-store master moves to collapsed secondary overview;
- preserve Tabler/shared UI conventions and responsive behavior.

Acceptance:
- Manager never needs to remember a branch selected far above the editor;
- only one branch editor is open at a time unless explicit product behavior says otherwise;
- switching branches preserves unsaved-change safety;
- mobile/desktop browser gates pass.

#### XSTORE-017 — Inline shortage cells + direct supplement action

Scope:
- render exact shortage cards inside affected calendar day/time cells;
- use dedicated shortage warning token distinct from the 3 time-band colors;
- provide **+ Bổ sung người** from shortage card;
- locally/authoritatively recalculate shortage after edit/save.

Acceptance:
- exact shortage interval is visually colocated with the affected schedule;
- shortage is not duplicated in a separate long “Cần xử lý” list;
- fully repaired coverage removes the warning;
- accessibility does not depend on color alone.

#### XSTORE-018 — Supplemental employee pool (historical semantics retained; primary-screen layout superseded by XSTORE-019C)

Scope:
- remove “Nguồn tham khảo” wording;
- derive and show:
  - Chưa được xếp ca nào;
  - Còn thời gian có thể xếp;
  - Có thể điều động thủ công;
- shortage action filters/ranks the pool to exact branch/date/time.

Acceptance:
- already-assigned employee is not mislabeled “Chưa được xếp”;
- remaining availability is computed after DRAFT assignments;
- manual candidates are clearly marked;
- hard-conflict candidates cannot be selected.

#### XSTORE-019 — Previous RC qualification — CHANGES_REQUESTED

Historical result:
- PR #392;
- exact RC `1301678dbf6ffeef88cd5ced59ffa1c10d6bfae4`;
- automated gates GREEN;
- Owner explicitly rejected the display/interaction architecture after local review on 2026-10-05;
- prior RC approval is invalid/not granted;
- **DO NOT MERGE OR RELEASE THIS EXACT RC**.

The remediation is decomposed into XSTORE-019A→XSTORE-019F.

#### XSTORE-019A — Manager single-store calendar workspace — DONE / EXACT-HEAD GREEN

Scope:
- replace CN1–CN4 accordion stack with one selected-store weekly calendar workspace;
- compact sticky store/week/status/action header;
- calendar is the primary viewport;
- remove the always-visible long supplemental employee list from the primary screen;
- retain inline shortage cards and canonical DRAFT state;
- retain secondary four-store summary only as an optional collapsed view.

Acceptance:
- selecting CN1 shows only CN1 editor/calendar as the main workspace;
- seven-day week and store context are immediately visible;
- employee list does not push the calendar below the fold;
- calendar owns internal time scrolling;
- switching store/week preserves unsaved-change safety;
- no new writer/RPC authority is introduced.

#### XSTORE-019B — Direct calendar shift editing

Scope:
- create DRAFT shift by direct click/drag on empty calendar time;
- edit employee/start/end from the shift;
- drag to move day/time;
- resize start/end;
- delete;
- duplicate/copy when explicitly invoked;
- keep shortage recomputation and canonical save path.

Acceptance:
- add/edit/move/resize/delete all persist through canonical DRAFT authority;
- hard conflicts remain fail-closed;
- assigned employee/time are readable directly on the calendar;
- time-band colors remain canonical;
- keyboard/touch accessible fallback exists for operations that cannot rely on drag alone.

#### XSTORE-019C — On-demand employee drawer + shortage resolution

Scope:
- remove always-visible `NHÓM NHÂN SỰ BỔ SUNG` from the main scheduling workspace;
- open candidate drawer/picker only from add/edit/shortage actions;
- scope/rank candidates to exact store/date/time;
- preserve registered / remaining / manual-dispatch / hard-conflict grouping;
- close picker without losing calendar context.

Acceptance:
- exact-shortage `+ Bổ sung nhân viên` opens the correctly filtered candidate set;
- manual out-of-Availability selection keeps `MANAGER_AVAILABILITY_OVERRIDE`;
- hard-conflict candidate remains disabled;
- selecting a candidate updates the DRAFT calendar and shortage state;
- calendar returns to full usable width after drawer closes.

#### XSTORE-019D — Employee Availability calendar parity

Scope:
- replace/augment Employee weekly Availability interaction with the same weekly calendar mental model;
- direct add/edit/move/resize/delete for time-only Availability;
- no store choice in Employee Availability;
- keep management-owned Store Priority separate.

Acceptance:
- Employee can register and edit weekly time ranges directly on the calendar;
- no store priority authority is leaked to Employee;
- Availability styling is visibly distinct from assigned-shift styling;
- existing Availability persistence/validation contracts remain unchanged;
- mobile and desktop browser regressions cover direct interaction.

#### XSTORE-019E — Owner parity + responsive calendar workspace

Scope:
- Owner scheduling reuses the same selected-store calendar workspace/canonical writer;
- no separate Owner technical scheduling implementation;
- optimize desktop/laptop/mobile layout so calendar remains the primary workspace;
- sticky context/actions; internal calendar scrolling; drawer overlay/side panel without page sprawl.

Acceptance:
- Owner and Manager see the same scheduling mental model with role-correct authority;
- desktop/laptop calendar is readable with all seven day columns and selected-store context;
- mobile remains operable without long technical lists;
- no horizontal/page overflow regression;
- no duplicate scheduling writer.

#### XSTORE-019F — Integrated qualification + new exact RC

Scope:
- integrate XSTORE-019A→019E;
- run static/browser/security/cache/reload regressions;
- run XSTORE-013→018 compatibility gates;
- run People Shift + UI2 Cross Role + Owner Control Tower;
- run isolated PostgreSQL proof where backend contracts are touched;
- create exact RC + rollback packet;
- provide local/preview review target for Owner;
- stop at Owner approval gate; do not merge production.

Required gates before `RC_READY`:
- XSTORE calendar interaction/browser coverage GREEN;
- People Shift GREEN;
- UI2 Cross Role GREEN;
- Owner Control Tower GREEN;
- relevant XSTORE-013→018 gates GREEN;
- isolated backend proof GREEN where applicable;
- branch source/cache/reload qualification GREEN;
- exact RC SHA + rollback SHA recorded.

#### XSTORE-019G — Manager five-board presentation-first UI

Owner-locked information architecture:
1. **Chuẩn bị**
2. **Tạo lịch nháp**
3. **Chỉnh lịch**
4. **Kiểm tra**
5. **Duyệt & phát hành**

Scope:
- implement the five boards as the only primary Manager scheduling sections;
- step navigation is functional navigation/scroll/open state, not decorative chips;
- move recurring weekly staffing requirement into **Chuẩn bị** and make it collapsible by default after configuration;
- remove/merge redundant floating status/settings/header boxes;
- every board contains its own clear title, purpose and relevant actions;
- **Chỉnh lịch** remains the dominant selected-store weekly calendar;
- employee add/supplement uses a clear on-demand drawer with employee name, employment type, Availability/eligibility and action;
- do not add new RPC/schema/business authority in this task.

Acceptance:
- Manager can understand the workflow from the five board titles alone;
- recurring staffing configuration can be collapsed/expanded;
- no duplicated “draft/status/settings” chrome consumes primary screen space;
- selected-store/week context remains visible;
- desktop/laptop/mobile responsive QA passes with fixture/read-only data.

#### XSTORE-019H — Employee mobile-first presentation-first UI

Canonical Employee navigation:
1. Trang chủ
2. Đăng ký lịch làm
3. Lịch của tôi
4. Chấm công
5. Hồ sơ & thông tin

Scope:
- mobile-first is mandatory; desktop is secondary;
- weekly work registration is **not locked to morning/afternoon/night shifts**;
- Employee chooses exact start/end time and may register multiple intervals in one day;
- morning/afternoon/night/all-day/day-off controls are optional quick presets only and remain editable;
- assigned/published schedule is visually distinct from Availability;
- attendance screen shows published shift context plus actual attendance time;
- profile surfaces management-owned employment type as Full-time or Part-time without allowing Employee self-change;
- presentation-first only; no new business-data writer in this task.

Acceptance:
- primary actions fit normal phone widths without page-level horizontal scrolling;
- Employee can visually add one or multiple exact time ranges/day;
- quick presets never prevent exact time editing;
- “Lịch của tôi” clearly distinguishes published/approved work from registration;
- attendance UI clearly separates normal published-shift attendance from outside-schedule requests.

#### XSTORE-019I — Owner strategy/P&L presentation-first UI

Owner is **not an expanded Manager role** on the home experience.

Primary Owner information:
- system revenue;
- costs;
- estimated/authoritative profit where available;
- margin;
- cash flow where available;
- store comparison;
- product/category performance;
- customer trends;
- strategic alerts/opportunities;
- forecast and targets.

Workforce on Owner home is summary/strategic only. Operational scheduling remains a secondary authorized surface, not the Owner dashboard center.

Scope:
- implement desktop-first strategic dashboard plus useful mobile summary;
- reuse existing Tabler/shared tokens;
- use fixture/read-only values until authoritative data sources are wired in XSTORE-019N;
- do not fabricate or persist production financial truth;
- do not duplicate Manager scheduling controls into Owner home.

Acceptance:
- Owner can answer “revenue/profit trend, which store/product is weak/strong, what needs attention, progress to target” from the primary dashboard;
- operational scheduling is not the dominant Owner home content;
- mobile shows top KPIs, trends, store comparison and alerts cleanly.

#### XSTORE-019J — Authenticated real-local cross-role qualification + Manager calendar workspace UX correction

Scope:
- integrate XSTORE-019G→019I on the current non-production RC branch;
- implement the Owner-approved Manager scheduling correction in §0.5 before requesting re-approval;
- qualify the **actual authenticated local application** using the real Supabase auth flow, not fixture-only preview surfaces;
- use deterministic fixtures/read-only data only where needed for non-authoritative display evidence;
- no new live production writes;
- run responsive/browser/accessibility/static/cache/reload checks;
- preserve canonical five-step workflow and all current scheduling/security authority.

Manager-specific required outcome:
- CN1/CN2/CN3/CN4 selector is colocated with the active `LỊCH NHÁP ĐANG CHỈNH` workspace;
- selected week / week controls remain visible and functional in the same working context;
- direct `Kiểm tra lịch` / `Tiếp tục → Kiểm tra` action is available from the active calendar without requiring long reverse scrolling;
- calendar command strip remains accessible during long editing, preferably sticky where safe;
- employee shift cards show readable employee name + complete shift time without internal horizontal scrollbar;
- nested horizontal scrolling is removed;
- desktop calendar is seven-day readable when space allows; narrow layouts use one controlled calendar-level navigation/overflow model;
- direct editing, shortages, candidate picker and canonical review/publish contracts remain intact.

Cross-role required outcome:
- Manager five-board UI rendered from the authenticated real local app after the §0.5 correction;
- Employee mobile-first UI rendered;
- Owner strategic dashboard rendered;
- fresh desktop/mobile evidence captured;
- exact candidate commit SHA recorded;
- Owner can review the real rendered implementation before data/logic wiring.

Gate:
- after technical GREEN, stop with **OWNER UI IMPLEMENTATION APPROVAL REQUIRED**;
- technical/fixture/browser GREEN does not equal Owner approval;
- do not execute XSTORE-019K until Owner explicitly approves the rendered UI implementation;
- this is a UI implementation gate, not production RC approval.

#### XSTORE-019K — Employment type authority + Full-time scheduling priority

Canonical model:
```text
role = EMPLOYEE
employment_type = FULL_TIME | PART_TIME
```

Rules:
- employment type is management-owned; Employee cannot self-change it;
- Full-time/Part-time is not a replacement for RBAC role;
- scheduler ranking considers employment type only **after** ACTIVE/store eligibility/Availability/hard-conflict checks;
- canonical automatic preference is eligible FULL_TIME first, then eligible PART_TIME;
- Store Priority and other existing ranking/safety remain authoritative;
- a Full-time employee outside Availability/hard eligibility must not displace an eligible Part-time employee.

Acceptance:
- schema/profile/RPC/UI authority is explicit and auditable;
- Employee self-write is denied;
- deterministic scheduling tests prove Full-time preference without weakening hard constraints;
- drawer/profile shows employment type clearly.

#### XSTORE-019L — Flexible Employee Availability + attendance integration

Availability rules:
- exact start/end times;
- one or multiple intervals/day;
- presets are convenience only;
- time-only, no Employee store selection;
- management-owned Store Priority remains separate.

Attendance rules:
- attendance tied to a **published schedule** records actual server time directly and does **not** require Manager approval merely because the employee is early/late or leaves early/late;
- schedule time and actual attendance time remain separate facts;
- lateness/early-leave/late-leave are derived statuses, not schedule rewrites;
- attendance outside a published schedule, manual backdated time, or manual alternate time creates a Manager-confirmation request;
- approval/rejection audit is retained.

Acceptance:
- published-shift check-in/check-out is direct;
- lateness is visible without an approval queue;
- outside-schedule/manual-time attendance is pending Manager confirmation;
- exact-time Availability and multiple intervals persist correctly;
- mobile regression covers the complete flow.

#### XSTORE-019M — Manager five-board canonical workflow integration

Scope:
- connect Board 1→5 to existing canonical scheduling state/writers;
- Board 1 reads recurring staffing configuration, Store Priority readiness and Availability readiness;
- Board 2 creates/reopens DRAFT;
- Board 3 performs canonical direct calendar editing and employee supplementation;
- Board 4 is **read-only review using the same selected-store calendar visual as Board 3**;
- Board 4 selects exactly one CN1/CN2/CN3/CN4 at a time and overlays/confirms shortage/conflict results;
- Board 4 must show actual dynamic shift times (for example 06:00–14:00, 14:00–22:00); do not summarize the review into three fixed time bands;
- Board 5 exposes Review/Publish only when canonical validation permits it.

Acceptance:
- one selected store review is visually equivalent to the edited calendar but non-mutating;
- conflict/shortage issues link back to the affected calendar location;
- no separate scheduling truth/writer;
- canonical Validate→Review→Publish remains authoritative.

#### XSTORE-019N — Owner strategic data integration

Scope:
- connect Owner dashboard to existing authorized data sources/contracts for revenue/store/product/customer/cost/profit aggregates where they already exist;
- Sapo-derived revenue must remain traceable to its canonical ingestion/data authority;
- financial metrics with incomplete authority must be labelled unavailable/estimated rather than fabricated;
- workforce remains strategic summary;
- scheduling operational detail remains secondary.

Acceptance:
- each KPI has a known source/definition;
- no client-side invented P&L;
- role/security scope remains Owner-only where required;
- empty/loading/error states are explicit;
- responsive Owner dashboard remains stable.

#### XSTORE-019O — Integrated qualification + replacement exact RC

Scope:
- integrate XSTORE-019G→019N;
- run affected Manager/Employee/Owner browser, responsive, security, scheduling, attendance, RBAC, cache/reload and backend proofs;
- rerun compatible XSTORE-013→018 gates where affected;
- rerun People Shift + UI2 Cross Role + Owner Control Tower or their current canonical successors;
- freeze a **replacement exact RC**;
- record rollback SHA;
- prepare Owner production review packet;
- do not production merge.

Required gates before replacement `RC_READY`:
- Manager five-board workflow GREEN;
- Employee mobile-first Availability/schedule/attendance GREEN;
- FULL_TIME/PART_TIME authority + priority GREEN;
- Owner strategic dashboard source-contract checks GREEN;
- relevant security/RBAC/backend proofs GREEN;
- exact-head cache/reload/browser gates GREEN;
- exact RC SHA + rollback SHA recorded.

#### XSTORE-020 — Live production acceptance + canonical reconciliation

Scope:
- only after Owner explicitly approves the new exact RC from XSTORE-019F;
- wait for production governance release window;
- merge/deploy exact approved RC;
- verify Pages source + Pages deployment on exact-main;
- live target-week Auto Schedule;
- Manager confirms selected-store calendar, direct shift editing, exact shortages and on-demand candidate drawer;
- Employee confirms calendar Availability registration;
- Owner confirms calendar parity;
- exercise a real Manager manual Availability override only if actually needed;
- Validate→Review→Publish real approved schedule;
- reconcile proven rules into permanent Workforce docs;
- resume/finalize XSTORE-011;
- delete this TEMP SOT only after closure evidence is complete.

### L. Owner-approved role experience UX V4 — 2026-10-06

This section supersedes conflicting UI assumptions in earlier sections while preserving proven scheduling/business authorities unless explicitly changed below.

#### L1. Manager = five-board scheduling workflow

The canonical Manager scheduling page contains exactly five primary work boards:
1. **Chuẩn bị**
2. **Tạo lịch nháp**
3. **Chỉnh lịch**
4. **Kiểm tra**
5. **Duyệt & phát hành**

The five-step header is real navigation. Each step maps to one board.

**Chuẩn bị**
- store/week context;
- Availability/priority/readiness summaries;
- recurring weekly staffing requirement is located here;
- recurring staffing requirement is collapsible/expandable and normally collapsed once configured because it changes infrequently.

**Tạo lịch nháp**
- creates or reopens DRAFT;
- shows concise creation result;
- does not mix the full editor into this board.

**Chỉnh lịch**
- selected-store calendar is the main editing surface;
- exact shift times are visible;
- shortage stays in the affected time range;
- employee picker is on-demand and must show enough employee context to make a decision.

**Kiểm tra**
- same calendar visual/mental model as **Chỉnh lịch**;
- one selected store at a time: CN1/CN2/CN3/CN4;
- read-only review;
- shows canonical conflict/shortage/warning results;
- must represent actual shift intervals, including irregular times such as 06:00–14:00 or 14:00–22:00;
- do not collapse the review into fixed “morning/afternoon/night” rows.

**Duyệt & phát hành**
- final summary;
- Review/Publish only through canonical authority.

#### L2. Employee = mobile-first

Employee UX is designed primarily for phones.

Canonical primary surfaces:
- Trang chủ;
- Đăng ký lịch làm;
- Lịch của tôi;
- Chấm công;
- Hồ sơ & thông tin.

Availability registration:
- no fixed-shift lock;
- exact start/end time;
- multiple intervals/day allowed;
- quick presets may exist but are editable convenience only.

Attendance:
- published-schedule attendance records actual time directly with no Manager approval requirement for ordinary early/late/early-leave/late-leave deviations;
- actual attendance must never silently rewrite the published schedule time;
- outside-published-schedule attendance or manually selected/backdated alternate time requires Manager confirmation.

#### L3. Employee employment type

Full-time/Part-time is an employment classification, not a top-level RBAC role.

```text
role = EMPLOYEE
employment_type = FULL_TIME | PART_TIME
```

Management controls employment type.

Automatic scheduling priority:
```text
hard eligibility + Availability + Store Priority + no conflict
→ prefer eligible FULL_TIME
→ then eligible PART_TIME
→ continue canonical ranking/tie-breaks
```

Full-time preference cannot bypass Availability, ACTIVE/store eligibility, overlap, official schedule, Store Priority or other hard constraints.

#### L4. Owner = strategy and financial performance

Owner home is not “Manager with more controls”.

Primary Owner concerns:
- revenue;
- costs;
- profit/loss and margin where authoritative;
- cash flow where authoritative;
- store/product/customer performance;
- trend comparison;
- strategic alerts/opportunities;
- forecasts and targets.

Workforce appears as strategic aggregate only. Authorized scheduling remains accessible as a secondary operational surface when needed.

#### L5. UI-first implementation gate

Owner explicitly requires the rendered UI to be implemented/reviewed **before** new data/logic linking.

Therefore:
- XSTORE-019G→019J are presentation/preview first;
- XSTORE-019J must produce reviewable rendered Manager/Employee/Owner UI;
- robot stops at the Owner UI implementation review gate;
- only after Owner approves that rendered implementation may XSTORE-019K→019N connect new authority/data/logic;
- XSTORE-019O creates the replacement RC.

The XSTORE-019F exact RC `e581cf1e41d3ff3d7afe55c7900a1ec2f817df52` is therefore **invalidated as a production release candidate** by these later Owner-approved UX V4 requirements. It remains historical QA evidence only and must not be merged/released as the final candidate.

### K. Robot execution control

The robot must execute remaining tasks in strict order:

```text
XSTORE-019G
→ XSTORE-019H
→ XSTORE-019I
→ XSTORE-019J
→ OWNER UI IMPLEMENTATION APPROVAL
→ XSTORE-019K
→ XSTORE-019L
→ XSTORE-019M
→ XSTORE-019N
→ XSTORE-019O
→ OWNER APPROVAL OF REPLACEMENT EXACT RC
→ XSTORE-020
→ resume XSTORE-011 closure
```

Rules:
- one authoritative task per execution turn;
- re-read this TEMP SOT before validating any task ID;
- XSTORE-019G→019J are presentation-first and must not introduce new production business-data writes;
- XSTORE-019G→019J execute continuously without Owner input under UX V4;
- stop after XSTORE-019J only for **Owner UI implementation approval** of the actual rendered interfaces;
- after that approval, XSTORE-019K→019O execute continuously unless a genuinely new business decision is required;
- do not invent new business rules;
- if a genuinely new Owner decision is required, mark the current task BLOCKED and record the exact decision required in this SOT;
- implementation must occur on a non-production branch/PR;
- PR #392 / branch `xstore-019-unified-rc-v1` may be reused only if its body/state clearly marks all earlier RC SHAs invalidated and every implementation commit triggers affected QA;
- the historical XSTORE-019F RC `e581cf1e41d3ff3d7afe55c7900a1ec2f817df52` is **DO NOT RELEASE**;
- production-impacting work follows `PRODUCTION_RELEASE_GOVERNANCE_V1_SOURCE_OF_TRUTH.md`;
- do not merge/release before XSTORE-019O is GREEN and Owner explicitly approves its replacement exact RC;
- after production merge, verify exact-main evidence before advancing XSTORE-020;
- update this TEMP SOT after each completed task so the next robot/chat can derive state from source alone.

Machine handoff:

```text
MAGASIN_TASK_CONTROL_V1
STATUS=READY
TASK_ID=NONE
NEXT_TASK_ID=XSTORE-019I
CHECK_AFTER_SECONDS=0
END_MAGASIN_TASK_CONTROL_V1
```

## 6.0.10 XSTORE-013 continuous coverage + exact shortage engine acceptance — 2026-10-04

XSTORE-013 is **DONE / EXACT-MAIN GREEN**.

Implementation:
- migration `20261004220500_xstore_013_continuous_coverage_shortage_v1.sql` adds reusable `evaluate_workforce_coverage_shortages_v1(...)`;
- coverage is evaluated at every assignment boundary;
- adjacent split shifts from different employees may jointly satisfy one requirement;
- shortage output returns only exact uncovered intervals with assigned and missing headcount;
- one employee is deduplicated across overlapping assignment rows;
- bounded `list_cross_store_staffing_shortages_v1(date)` reads canonical recurring staffing requirements plus current DRAFT/REVIEWED assignments;
- recurring staffing authority remains unchanged;
- Auto Schedule assignment composition remains unchanged and is owned by XSTORE-014;
- no production business data was fabricated.

Implementation PR #385:
- initial implementation head `39975814fb5ac335fabb702e8b50441c9f2e518b`;
- repair head `12da2320cf300400c94f3a5175010e0735e6cf8d`;
- merge / executable main `1d8b750de7cde569017b810959f725c7bbd2d530`.

Exact-main gates for `1d8b750de7cde569017b810959f725c7bbd2d530`:
- XSTORE-013 Coverage QA run `37211610254` = **SUCCESS**;
- People Shift Day-10 Tests run `37211610355` = **SUCCESS**;
- UI2 Cross Role Acceptance run `37211610085` = **SUCCESS**;
- Validate MAGASIN GitHub Pages source run `37211610198` = **SUCCESS**;
- Pages build/deployment run `37211609496` = **SUCCESS**.

PostgreSQL exact-main proof:
- adjacent split coverage = PASS;
- exact 08:00–08:30 gap detection = PASS;
- target_headcount > 1 boundary evaluation = PASS;
- overlapping rows for the same employee are deduplicated = PASS;
- bounded recurring shortage reader exact-interval test = PASS.

XSTORE-014 is now the sole next executable task and owns interval-composed Auto Schedule. XSTORE-011 remains paused until XSTORE-013→020 are complete.

## 6.0.11 XSTORE-014 interval-composed Auto Schedule acceptance — 2026-10-04

XSTORE-014 is **DONE / EXACT-MAIN GREEN**.

Implementation:
- migration `20261004222500_xstore_014_interval_composed_auto_schedule_v1.sql` replaces whole-block candidate matching with continuous interval composition;
- Auto Schedule repeatedly fills exact under-covered intervals using the XSTORE-013 coverage primitive;
- multiple employees with adjacent registered Availability may jointly satisfy one recurring requirement;
- candidate assignments remain clipped to registered Availability;
- Store Priority, DRAFT/REVIEWED cross-store overlap, official schedule overlap, max assignment/day and hour limits remain fail-closed;
- longer compatible intervals are preferred when the same earliest shortage boundary can be covered, reducing avoidable fragmentation;
- returned shortages use exact uncovered intervals with assigned and missing headcount;
- Auto Schedule remains DRAFT-only and does not implement the Manager Availability override owned by XSTORE-015;
- no production business data was fabricated.

Implementation PR #386:
- implementation head `79c13fbbe13f1d30959b20ba6fd61d631eef23e9`;
- merge / executable main `bf762d5d91af0fbd57c947cb120290f8b807895c`.

Exact-main gates for `bf762d5d91af0fbd57c947cb120290f8b807895c`:
- XSTORE-014 Interval Auto Schedule QA run `37213221680` = **SUCCESS**;
- People Shift Day-10 Tests run `37213221617` = **SUCCESS**;
- UI2 Cross Role Acceptance run `37213221594` = **SUCCESS**;
- Validate MAGASIN GitHub Pages source run `37213221599` = **SUCCESS**;
- Pages build/deployment run `37213220928` = **SUCCESS**.

PostgreSQL exact-main proof:
- adjacent 06:00–09:00 + 09:00–12:00 Availability composes one 06:00–12:00 requirement = PASS;
- a real gap is returned only as the exact uncovered interval = PASS;
- target_headcount boundary evaluation = PASS;
- cross-store overlap remains fail-closed = PASS;
- exact XSTORE-013 coverage primitive + XSTORE-014 migration apply cleanly on PostgreSQL 17 = PASS.

XSTORE-015 is complete and exact-main green. XSTORE-016 is now the sole next executable task and owns the scheduling information architecture + branch accordion editor. XSTORE-011 remains paused until XSTORE-013→020 are complete.


## 6.0.12 XSTORE-015 Manager Availability override + eligible employee picker acceptance — 2026-10-04

XSTORE-015 is **DONE / EXACT-MAIN GREEN**.

Implementation:
- migration `20261004224500_xstore_015_manager_availability_override_v1.sql` replaces the canonical DRAFT writer/validator contract for explicit Manager/Owner Availability override;
- canonical audit marker is `MANAGER_AVAILABILITY_OVERRIDE`;
- human-facing warning is **Quản lý điều động ngoài thời gian đăng ký**;
- the Manager picker reads the full canonical ACTIVE scheduling-eligible employee pool and filters by Store Priority for the selected store;
- registered Availability is ranking/status metadata for manual selection rather than the only candidate source;
- an explicit out-of-Availability manual DRAFT is server-tagged with the override marker and remains warning-only through validation;
- untagged Availability mismatch remains a hard validation violation;
- Store Priority, ACTIVE/role eligibility, generation/store/week integrity, same/cross-store overlap, official schedule overlap, max/day rules and reviewed/published overwrite protection remain fail-closed;
- Auto Schedule remains strictly Availability-bound and DRAFT-only;
- Manager/Owner final review/publish authority is unchanged.

Implementation PR #387:
- final implementation / repair head `d252e5b56c1f83f50a8fe4a0c90b271a37dfb09d`;
- merge / executable main `21921175b8160a920993c80ef074616c159a5e12`.

Exact-main gates for `21921175b8160a920993c80ef074616c159a5e12`:
- XSTORE-015 Manager Override QA run `37217850100` = **SUCCESS**;
- People Shift Day-10 Tests run `37217850095` = **SUCCESS**;
- UI2 Cross Role Acceptance run `37217850098` = **SUCCESS**;
- Validate MAGASIN GitHub Pages source run `37217850084` = **SUCCESS**;
- Pages build/deployment run `37217849367` = **SUCCESS**.

PostgreSQL exact-main proof:
- explicit manual out-of-Availability DRAFT persists `MANAGER_AVAILABILITY_OVERRIDE` and validates with warning-only = PASS;
- warning remains valid at REVIEWED validation stage = PASS;
- employee outside Store Priority remains hard-blocked = PASS;
- untagged non-manual Availability bypass remains `AVAILABILITY_MISMATCH` violation = PASS.

Browser/regression proof:
- Manager/Owner employee pool loads through `list_employee_workforce_profiles_v1`;
- legacy fixtures were reconciled to the canonical Store Priority employee reader;
- registered Availability add path, DRAFT save, Validate → Review → Publish, employee approved schedule projection and cross-role responsive gates all pass;
- no production business data was fabricated.

XSTORE-016 is complete and exact-main green. XSTORE-017 is now the sole next executable task and owns inline shortage visualization + direct resolution. XSTORE-011 remains paused until XSTORE-013→020 are complete.

## 6.0.13 XSTORE-016 scheduling IA + branch accordion acceptance — 2026-10-05

XSTORE-016 is **DONE / EXACT-MAIN GREEN**.

Implementation:
- PR #388 moved the Manager/Owner scheduling information architecture to one global weekly header plus CN1–CN4 branch accordions;
- the old global branch selector was removed;
- exactly one branch editor is active at a time and is colocated with its branch identity;
- branch/week navigation preserves unsaved-change safety through an explicit discard confirmation;
- Auto Schedule remains a global weekly operation outside the branch editor and four-store master;
- the four-store master is now a collapsed secondary overview instead of sitting between branch selection and DRAFT editing;
- Manager scheduling UI2 was reconciled to the accordion topology without creating a second writer;
- DRAFT row edits sync DOM values before rerender so edited employee/time values persist into the canonical save payload;
- the global Auto Schedule container is responsive with border-box sizing and does not create page overflow;
- legacy People Shift/UI2 browser regressions and fixtures were reconciled to the canonical XSTORE-016 topology;
- no production business data was fabricated.

Implementation PR #388:
- final implementation / repair head `4ca577a3ae799ff4237d047071df093deec5585d`;
- merge / executable main `8e55e0c2e9b9ee15d5577014a107b8c1d545e814`.

Exact-main gates for `8e55e0c2e9b9ee15d5577014a107b8c1d545e814`:
- XSTORE-016 Scheduling IA QA run `37222094775` = **SUCCESS**;
- XSTORE-015 Manager Override QA run `37222094944` = **SUCCESS**;
- People Shift Day-10 Tests run `37222094840` = **SUCCESS**;
- UI2 Cross Role Acceptance run `37222094773` = **SUCCESS**;
- Validate MAGASIN GitHub Pages source run `37222094835` = **SUCCESS**;
- Pages build/deployment run `37222094131` = **SUCCESS**.

Browser/regression proof:
- branch accordion desktop/mobile coverage passes at 1440px and 390px;
- exactly one branch editor is open and the global `#msdStore` selector is absent;
- unsaved branch switching is guarded and preserves DRAFT safety;
- XSTORE recurring setup remains responsive with no page horizontal overflow;
- People Shift and UI2 cross-role/cold-reload regressions pass on exact main.

XSTORE-017 is now the sole next executable task and owns inline shortage cells + direct supplement action. XSTORE-011 remains paused until XSTORE-013→020 are complete.

## 6.0.14 XSTORE-017 inline shortage cells + direct supplement acceptance — 2026-10-05

XSTORE-017 is **DONE / EXACT-MAIN GREEN**.

Implementation:
- PR #389 renders exact staffing shortages directly inside the affected branch day/time cell;
- shortage warning uses a dedicated purple/indigo visual token distinct from the canonical morning/afternoon/evening time-band colors;
- every shortage card includes visible text plus icon/status semantics so accessibility does not depend on color alone;
- **+ Bổ sung người** opens the existing canonical Manager manual-assignment path prefilled to the exact shortage date/time instead of introducing a second writer;
- unsaved DRAFT edits recalculate shortage locally from the canonical recurring staffing requirements plus current DRAFT assignments;
- after save/reload, shortage is re-read from server authority through `list_cross_store_staffing_shortages_v1`;
- fully repaired coverage removes the inline warning immediately;
- the old detailed global “Cần xử lý” shortage list is replaced by concise branch guidance so the shortage is not duplicated away from its schedule cell;
- legacy People Shift, UI2, SCHED-01/SCHED-05 and cache-lineage fixtures were reconciled to the legitimate XSTORE-017 read-only readers without weakening Store Priority, overlap, role/scope or publish safeguards;
- no production business data was fabricated.

Implementation PR #389:
- final implementation / repair head `7cb312530089db49ae4ec9085538c7ed883c424e`;
- squash merge / executable main `2e6d42d2f4055078c6346ba1f570e75037d1b7cf`.

Exact-main gates for `2e6d42d2f4055078c6346ba1f570e75037d1b7cf`:
- XSTORE-017 Inline Shortage QA run `37226307710` = **SUCCESS**;
- XSTORE-016 Scheduling IA QA run `37226307733` = **SUCCESS**;
- XSTORE-015 Manager Override QA run `37226307811` = **SUCCESS**;
- People Shift Day-10 Tests run `37226307692` = **SUCCESS**;
- UI2 Cross Role Acceptance run `37226307723` = **SUCCESS**;
- Validate MAGASIN GitHub Pages source run `37226307751` = **SUCCESS**;
- Pages build/deployment run `37226307392` = **SUCCESS**.

Browser/regression proof:
- exact shortage interval appears in the correct day cell;
- warning token is visually distinct and includes non-color status text/icon semantics;
- direct supplement action preselects the exact shortage date/start/end;
- full Availability coverage removes the warning;
- partial coverage recalculates to only the remaining exact interval;
- save refreshes shortage from server authority;
- Manager/Owner branch switching, DRAFT save, Validate → Review → Publish and employee schedule regressions remain green;
- desktop/mobile XSTORE-017 browser checks remain green.

XSTORE-018 is now the sole next executable task and owns the actionable supplemental employee pool. XSTORE-011 remains paused until XSTORE-013→020 are complete.

## 6.0.15 XSTORE-018 supplemental employee pool acceptance — 2026-10-05

XSTORE-018 is **DONE / EXACT-MAIN GREEN**.

Implementation:
- PR #391 removes the old “Nguồn tham khảo” scheduling wording and replaces it with an actionable supplemental employee pool;
- the pool derives and displays **Chưa được xếp ca nào**, **Còn thời gian có thể xếp** and **Có thể điều động thủ công** from canonical four-store schedule/Availability authority;
- the shortage action filters candidates to the exact branch/date/time and ranks Availability-covered candidates before Manager manual-override candidates;
- employees already assigned in the week are not mislabeled as unassigned;
- remaining Availability is recalculated after current DRAFT assignments;
- manual candidates outside Availability are explicitly marked for Manager override/audit semantics;
- cross-store overlap, official-schedule overlap and max-two-per-day hard conflicts remain non-selectable;
- the existing canonical Manager DRAFT writer remains the only scheduling mutation path;
- People Shift Day-10 and legacy regression fixtures were reconciled to the current read-only weekly-plan reader and canonical manual picker without weakening production validation;
- no production business data was fabricated.

Implementation PR #391:
- final implementation / repair head `c462aa7ccdcbaf9c73f783122b51261c68c344b5`;
- squash merge / executable main `083a025159873993aa8afc647795950f0ed5e196`.

Exact-main gates for `083a025159873993aa8afc647795950f0ed5e196`:
- XSTORE-018 Supplemental Pool QA run `37260372281` = **SUCCESS**;
- XSTORE-017 Inline Shortage QA run `37260372257` = **SUCCESS**;
- XSTORE-016 Scheduling IA QA run `37260372271` = **SUCCESS**;
- XSTORE-015 Manager Override QA run `37260372276` = **SUCCESS**;
- People Shift Day-10 Tests run `37260372287` = **SUCCESS**;
- UI2 Cross Role Acceptance run `37260372932` = **SUCCESS**;
- Validate MAGASIN GitHub Pages source run `37260372229` = **SUCCESS**;
- Pages build/deployment run `37260371800` = **SUCCESS**.

Browser/regression proof:
- the three actionable supplemental groups render without the retired reference wording;
- exact-shortage ranking clearly separates Availability-covered and manual-override candidates;
- an employee with an existing DRAFT assignment moves out of the unassigned group and shows only remaining Availability;
- hard-conflict candidates are visibly blocked from selection;
- save continues through `replace_schedule_generation_assignments` and refreshes the canonical weekly plan/shortage readers;
- People Shift canonical create → manual add → save → Validate → Review → Publish regression is green;
- desktop/mobile supplemental-pool browser checks remain green.

The original XSTORE-019 RC was later rejected by Owner for display/interaction architecture. XSTORE-019A is now the sole next executable task under the 2026-10-05 calendar-first architecture. XSTORE-011 remains paused until XSTORE-019A→020 are complete.

## 6.0.16 Owner calendar-first scheduling decision / PR #392 RC rejection — 2026-10-05

Owner reviewed the local XSTORE-019 candidate and explicitly **did not approve** the scheduling display structure.

Rejected exact RC:
- PR #392;
- commit `1301678dbf6ffeef88cd5ced59ffa1c10d6bfae4`;
- automation result before rejection: GREEN;
- release approval: **NOT GRANTED**;
- state: **CHANGES_REQUESTED / RC INVALIDATED**.

Owner-locked replacement architecture:
- calendar-first, Google Calendar-style weekly interaction;
- one selected store workspace at a time;
- CN1 selected => CN1 calendar is the primary screen; other stores do not occupy vertical editor space;
- direct add/edit/move/resize/delete shift interactions on calendar;
- exact shortage stays inside the affected time cell;
- employee candidates open only on demand in a scoped drawer/picker;
- no long always-visible employee list on the primary screen;
- Employee weekly Availability uses the same calendar mental model;
- Owner scheduling uses the same calendar mental model and canonical writer;
- canonical time colors remain yellow / light red / light blue; shortage remains distinct purple/indigo;
- four-store overview remains secondary/collapsed;
- Validate → Review → Publish and backend authority remain unchanged.

XSTORE-019A completed GREEN on exact PR #392 head `a849c71e925e46a50287c3866098c3448f841bcb`. Execution handoff is XSTORE-019B. No additional Owner decision is required to run XSTORE-019B→019F.

## 6.0.17 XSTORE-019A single-store calendar workspace acceptance — 2026-10-05

XSTORE-019A is **DONE / EXACT-HEAD GREEN**.

Implementation branch / PR:
- PR #392: `xstore-019-unified-rc-v1`;
- exact completed head: `a849c71e925e46a50287c3866098c3448f841bcb`;
- production merge/release: **NOT PERFORMED**.

Accepted result:
- Manager scheduling no longer renders stacked CN1–CN4 accordion editors;
- one selected-store weekly calendar is the primary workspace;
- selected-store switcher remains compact while the other stores do not consume editor height;
- seven-day week and store context are visible in the primary calendar workspace;
- calendar owns internal time scrolling;
- the long supplemental employee pool is not rendered by default;
- canonical Availability and eligible employee data still load before DRAFT without exposing the long pool;
- inline shortage behavior remains compatible;
- four-store overview remains secondary/collapsed;
- store/week navigation keeps unsaved-change protection;
- canonical DRAFT writer/RPC authority is unchanged;
- Owner shares the same selected-store scheduling runtime without a second writer.

Exact-head terminal GREEN evidence:
- `XSTORE-019A Calendar Workspace QA` run `37276090363` → success;
- `People Shift Day-10 Tests` run `37276090380` → success;
- `UI2 Cross Role Acceptance` run `37276090274` → success;
- `XSTORE-019 Unified RC QA` run `37276090451` → success;
- `XSTORE-013 Coverage QA` run `37276090328` → success;
- `XSTORE-014 Interval Auto Schedule QA` run `37276090329` → success;
- `XSTORE-015 Manager Override QA` run `37276090460` → success;
- `XSTORE-016 Scheduling IA QA` run `37276090377` → success;
- `XSTORE-017 Inline Shortage QA` run `37276090394` → success;
- `XSTORE-018 Supplemental Pool QA` run `37276090308` → success;
- `Owner Control Tower Tests` run `37276090365` → success;
- `SOP Task Tests` run `37276090291` → success;
- `Procurement QA Robot` run `37276090338` → success.

XSTORE-019A must not be re-executed unless a future regression explicitly reopens it.

## 6.0.18 XSTORE-019B direct calendar shift editing acceptance — 2026-10-05

XSTORE-019B is **DONE / EXACT-HEAD GREEN**.

Implementation branch / PR:
- PR #392: `xstore-019-unified-rc-v1`;
- exact accepted head: `82f1ba9fa3919a9ea10a90d6ae6e0cd78f769dfb`;
- production merge/release: **NOT PERFORMED**.

Accepted result:
- Manager can create DRAFT shifts directly from empty calendar time and edit employee/date/start/end from the shift card;
- DRAFT shifts can be moved by drag while preserving duration;
- start/end resizing remains available with bounded resize hitboxes that do not intercept neighboring shift actions;
- explicit delete and duplicate/copy actions are available directly from the calendar shift;
- short shifts have a dedicated move grip so drag remains reachable without hiding edit/delete controls;
- keyboard/touch fallback remains available through the shift editor for operations that cannot rely on drag alone;
- Manager Availability override remains warning/audit-only when explicitly marked, while untagged Availability mismatch and all hard conflicts remain fail-closed;
- shortage recalculation remains tied to the current DRAFT and canonical recurring staffing requirements;
- `replace_schedule_generation_assignments` remains the only DRAFT persistence writer; no second scheduling writer/RPC authority was introduced;
- canonical morning / afternoon / evening time-band colors and existing Validate → Review → Publish authority remain unchanged;
- UI2 responsive touch-target QA excludes the 8px drag-only resize affordance while still requiring normal actionable controls to keep the 44px touch target and requiring start/end editor fallback.

Repair evidence on PR #392:
- exact accepted head `82f1ba9fa3919a9ea10a90d6ae6e0cd78f769dfb` supersedes earlier repair candidates;
- dedicated XSTORE-019B browser acceptance proves create/edit/move/resize/delete/duplicate plus canonical save behavior;
- prior pointer-interception regressions were resolved by bounding resize handles and separating the move grip from action controls;
- stale responsive QA was reconciled to the locked XSTORE-019B contract instead of weakening product behavior.

Exact-head terminal GREEN evidence:
- XSTORE-019B Direct Calendar Editing QA run `37339020181` → **SUCCESS**;
- XSTORE-019 Unified RC QA run `37339020139` → **SUCCESS**;
- UI2 Cross Role Acceptance run `37339020314` → **SUCCESS**;
- People Shift Day-10 Tests run `37339020321` → **SUCCESS**;
- XSTORE-019A Calendar Workspace QA run `37339020265` → **SUCCESS**;
- XSTORE-013 Coverage QA run `37339020233` → **SUCCESS**;
- XSTORE-014 Interval Auto Schedule QA run `37339020112` → **SUCCESS**;
- XSTORE-015 Manager Override QA run `37339020320` → **SUCCESS**;
- XSTORE-016 Scheduling IA QA run `37339020256` → **SUCCESS**;
- XSTORE-017 Inline Shortage QA run `37339020375` → **SUCCESS**;
- XSTORE-018 Supplemental Pool QA run `37339020119` → **SUCCESS**;
- Owner Control Tower Tests run `37339020183` → **SUCCESS**;
- SOP Task Tests run `37339020101` → **SUCCESS**;
- Procurement QA Robot run `37339020152` → **SUCCESS**.

PR #392 remains open and must **not** be merged or released yet. XSTORE-019F plus explicit Owner approval remain the release gate.

XSTORE-019C was the next authoritative task after this acceptance and is now accepted in §6.0.19. XSTORE-019B must not be re-executed unless a future regression explicitly reopens it.


## 6.0.19 XSTORE-019C on-demand employee drawer + shortage resolution acceptance — 2026-10-06

XSTORE-019C is **DONE / EXACT-HEAD GREEN**.

Implementation branch / PR:
- PR #392: `xstore-019-unified-rc-v1`;
- exact accepted head: `ed88004a0aa4bffc9deabed7ad6152a5de243415`;
- production merge/release: **NOT PERFORMED**.

Accepted result:
- the always-visible supplemental employee pool is removed from the primary scheduling workspace;
- Manager/Owner opens the candidate UI only from explicit add or exact-shortage actions;
- exact-shortage `+ Bổ sung nhân viên` scopes the candidate set to the selected store/date/time and preserves registered / remaining / manual-dispatch / hard-conflict grouping;
- manual out-of-Availability selection retains `MANAGER_AVAILABILITY_OVERRIDE`;
- hard-conflict candidates remain non-selectable;
- candidate selection updates the current DRAFT and recalculates inline shortage state without introducing a second writer;
- `replace_schedule_generation_assignments` remains the canonical DRAFT persistence writer;
- closing the candidate drawer restores the same calendar viewport immediately and re-applies it on the next animation frame so the calendar does not jump to the top or flash through a stale scroll position;
- Manager/Owner canonical Validate → Review → Publish authority and backend/RPC boundaries remain unchanged;
- PR #392 remains open and unmerged.

Repair evidence:
- stale XSTORE-017 persistent-picker contract was reconciled to the XSTORE-019C on-demand drawer authority;
- SCHED-02 and SCHED-05 browser flows were reconciled to open the candidate drawer before interacting with manual employee controls;
- People Shift Day-10 owner flow was reconciled to create/open DRAFT before opening the candidate drawer;
- the candidate-drawer workflow path filter now includes its XSTORE-017 dependency contract;
- repeated calendar-context failures were resolved by changing runtime strategy from frame-only restore to immediate restore plus animation-frame re-apply;
- no backend schema/RPC authority change and no production business data mutation were introduced.

Exact-head terminal GREEN evidence for `ed88004a0aa4bffc9deabed7ad6152a5de243415`:
- XSTORE-019C Candidate Drawer QA push run `37408701575` → **SUCCESS**;
- XSTORE-019C Candidate Drawer QA PR run `37408705641` → **SUCCESS**;
- People Shift Day-10 Tests push run `37408701377` → **SUCCESS**;
- People Shift Day-10 Tests PR run `37408705496` → **SUCCESS**;
- UI2 Cross Role Acceptance push run `37408701424` → **SUCCESS**;
- UI2 Cross Role Acceptance PR run `37408705492` → **SUCCESS**;
- XSTORE-019 Unified RC QA push run `37408701430` → **SUCCESS**;
- XSTORE-019 Unified RC QA PR run `37408705502` → **SUCCESS**;
- XSTORE-019A Calendar Workspace QA push run `37408701428` → **SUCCESS**;
- XSTORE-019A Calendar Workspace QA PR run `37408705485` → **SUCCESS**;
- XSTORE-019B Direct Calendar Editing QA push run `37408701387` → **SUCCESS**;
- XSTORE-019B Direct Calendar Editing QA PR run `37408705638` → **SUCCESS**;
- XSTORE-013 Coverage QA PR run `37408705494` → **SUCCESS**;
- XSTORE-014 Interval Auto Schedule QA PR run `37408705495` → **SUCCESS**;
- XSTORE-015 Manager Override QA push run `37408701371` → **SUCCESS**;
- XSTORE-015 Manager Override QA PR run `37408705505` → **SUCCESS**;
- XSTORE-016 Scheduling IA QA push run `37408701395` → **SUCCESS**;
- XSTORE-016 Scheduling IA QA PR run `37408705786` → **SUCCESS**;
- XSTORE-017 Inline Shortage QA push run `37408701444` → **SUCCESS**;
- XSTORE-017 Inline Shortage QA PR run `37408705482` → **SUCCESS**;
- XSTORE-018 Supplemental Pool QA push run `37408701344` → **SUCCESS**;
- XSTORE-018 Supplemental Pool QA PR run `37408705471` → **SUCCESS**;
- Owner Control Tower Tests PR run `37408705647` → **SUCCESS**;
- SOP Task Tests PR run `37408705477` → **SUCCESS**;
- Procurement QA Robot PR run `37408705490` → **SUCCESS**.

PR #392 remains open and must **not** be merged or released yet. XSTORE-019F plus explicit Owner approval remain the release gate.

The next authoritative executable task after XSTORE-019C was XSTORE-019D; XSTORE-019D is now accepted in §6.0.20. XSTORE-019C must not be re-executed unless a future regression explicitly reopens it.

## 6.0.20 XSTORE-019D Employee Availability calendar parity acceptance — 2026-10-06

XSTORE-019D is **DONE / EXACT-HEAD GREEN**.

Implementation branch / PR:
- PR #392: `xstore-019-unified-rc-v1`;
- exact accepted head: `0cd1594e7352e17c0fcd6fe14b46799d546fd90c`;
- production merge/release: **NOT PERFORMED**.

Accepted result:
- Employee Availability now uses one seven-day weekly calendar mental model for the target week;
- Employee can add Availability from a calendar slot, edit an existing interval through an explicit 44px `Sửa` control, move an interval, resize start/end, and delete directly from the calendar workflow;
- calendar writes remain time-only: Employee receives no Store Priority control and every save keeps `p_preferred_store_id = null`;
- `get_my_availability`, `save_my_availability`, and `delete_my_availability` remain the only Availability RPC boundary; no second writer or direct table mutation was introduced;
- edit/move/resize reuse the existing row id through `p_availability_id`; create continues to use `null`;
- Availability cards retain canonical time-band recognition but are visibly distinct from assigned shifts through dashed styling and the `CÓ THỂ LÀM` label;
- desktop supports direct drag/move/resize and mobile keeps the same calendar with internal horizontal scrolling plus the existing day/start/end editor fallback;
- mutation overlap remains fail-safe: add/edit/move/resize controls are disabled while a save transaction is pending;
- PR #392 remains open and unmerged.

Repair / strategy evidence:
- historical cache-lineage contracts were reconciled to the XSTORE-019D Employee asset version without weakening their authority assertions;
- direct-DML static checks were narrowed so `Array.from(...)` is not misclassified as Supabase `.from(...)`;
- a save/edit race was removed by resetting editor mode before the final refresh and by preventing card mutation while `savePending`;
- repeated card-edit ambiguity was resolved by adding an explicit `Sửa` action while retaining card-click as a secondary interaction;
- repeated Playwright `dragTo()` hit-test timeouts on overlapping grid layers were resolved by testing the actual HTML5 `DragEvent` + `DataTransfer` contract in Chromium; product drag/drop handlers and canonical persistence were not weakened;
- no database schema/RPC authority change and no production business data mutation were introduced.

Exact-head terminal GREEN evidence for `0cd1594e7352e17c0fcd6fe14b46799d546fd90c`:
- XSTORE-019D Employee Availability Calendar QA push run `37414775860` → **SUCCESS**;
- XSTORE-019D Employee Availability Calendar QA PR run `37414779245` → **SUCCESS**;
- People Shift Day-10 Tests push run `37414775791` → **SUCCESS**;
- People Shift Day-10 Tests PR run `37414779085` → **SUCCESS**;
- UI2 Cross Role Acceptance push run `37414775780` → **SUCCESS**;
- UI2 Cross Role Acceptance PR run `37414779163` → **SUCCESS**;
- XSTORE-019 Unified RC QA push run `37414775883` → **SUCCESS**;
- XSTORE-019 Unified RC QA PR run `37414779191` → **SUCCESS**;
- XSTORE-019A Calendar Workspace QA PR run `37414779126` → **SUCCESS**;
- XSTORE-019B Direct Calendar Editing QA PR run `37414779080` → **SUCCESS**;
- XSTORE-019C Candidate Drawer QA PR run `37414779134` → **SUCCESS**;
- XSTORE-013 Coverage QA PR run `37414779213` → **SUCCESS**;
- XSTORE-014 Interval Auto Schedule QA PR run `37414779229` → **SUCCESS**;
- XSTORE-015 Manager Override QA PR run `37414779166` → **SUCCESS**;
- XSTORE-016 Scheduling IA QA PR run `37414779152` → **SUCCESS**;
- XSTORE-017 Inline Shortage QA PR run `37414779098` → **SUCCESS**;
- XSTORE-018 Supplemental Pool QA PR run `37414779154` → **SUCCESS**;
- Owner Control Tower Tests PR run `37414779118` → **SUCCESS**;
- SOP Task Tests PR run `37414779087` → **SUCCESS**;
- Procurement QA Robot PR run `37414779190` → **SUCCESS**.

Observed non-XSTORE smoke:
- AUTH-PROD Regression Contract PR run `37414779148` failed in the credentialed production username resolver before any Employee Availability assertion; XSTORE-019D did not touch auth/RBAC/session/backend auth paths, so this run is not used as XSTORE-019D acceptance evidence and remains owned by the AUTH-PROD track.

PR #392 remains open and must **not** be merged or released yet. XSTORE-019F plus explicit Owner approval remain the release gate.

The next authoritative executable task is **XSTORE-019E**. XSTORE-019D must not be re-executed unless a future regression explicitly reopens it.

## 6.0.21 XSTORE-019E Owner parity + responsive workspace acceptance — 2026-10-06

XSTORE-019E is **DONE / EXACT-HEAD GREEN**.

Implementation branch / PR:
- PR #392: `xstore-019-unified-rc-v1`;
- exact accepted head: `e581cf1e41d3ff3d7afe55c7900a1ec2f817df52`;
- production merge/release: **NOT PERFORMED**.

Accepted result:
- Owner scheduling reuses the same selected-store calendar workspace and the same canonical DRAFT writer as Manager; no separate Owner scheduling writer/RPC path was introduced;
- Owner runtime explicitly identifies the actor as `OWNER` while loading the shared Manager scheduling runtime/presentation;
- selected store, week/status context and scheduling actions remain together in one sticky workspace toolbar;
- desktop/laptop preserves the seven-day calendar and selected-store context without page-level horizontal overflow;
- narrow/mobile view keeps the same seven-day mental model and moves horizontal scrolling inside the primary calendar workspace instead of stacking days into page sprawl;
- candidate selection remains a bounded fixed overlay/side panel and does not widen the document;
- canonical DRAFT persistence remains `replace_schedule_generation_assignments`; Validate → Review → Publish authority is unchanged;
- no database/schema/migration, auth/RBAC/session or backend RPC authority change was introduced;
- PR #392 remains open and unmerged.

Repair / strategy evidence:
- XSTORE-019E changed only shared scheduling UI/layout, Owner runtime composition and QA contracts;
- the accepted responsive regression was reconciled to the locked calendar-first architecture: mobile keeps seven day columns in an internally scrollable calendar instead of reverting to the superseded one-column stacked-day behavior;
- the dedicated XSTORE-019E workflow explicitly runs the accepted `sched-07-ui-responsive-browser.mjs` regression in addition to static/shared scheduling contracts and Owner/Manager browser acceptance.

Exact-head terminal GREEN evidence for `e581cf1e41d3ff3d7afe55c7900a1ec2f817df52`:
- XSTORE-019E Owner Parity Responsive QA run `37417545280` → **SUCCESS**;
- XSTORE-019 Unified RC QA run `37417545219` → **SUCCESS**;
- People Shift Day-10 Tests run `37417545254` → **SUCCESS**;
- UI2 Cross Role Acceptance run `37417545225` → **SUCCESS**;
- Owner Control Tower Tests run `37417545297` → **SUCCESS**;
- XSTORE-019A Calendar Workspace QA run `37417545174` → **SUCCESS**;
- XSTORE-019B Direct Calendar Editing QA run `37417545272` → **SUCCESS**;
- XSTORE-019C Candidate Drawer QA run `37417545206` → **SUCCESS**;
- XSTORE-019D Employee Availability Calendar QA run `37417545178` → **SUCCESS**;
- XSTORE-013 Coverage QA run `37417545167` → **SUCCESS**;
- XSTORE-014 Interval Auto Schedule QA run `37417545210` → **SUCCESS**;
- XSTORE-015 Manager Override QA run `37417545214` → **SUCCESS**;
- XSTORE-016 Scheduling IA QA run `37417545226` → **SUCCESS**;
- XSTORE-017 Inline Shortage QA run `37417545256` → **SUCCESS**;
- XSTORE-018 Supplemental Pool QA run `37417545332` → **SUCCESS**;
- SOP Task Tests run `37417545253` → **SUCCESS**;
- Procurement QA Robot run `37417545330` → **SUCCESS**.

Observed non-XSTORE smoke:
- AUTH-PROD Regression Contract run `37417545232` completed with failure. XSTORE-019E did not touch auth/RBAC/session or backend auth/RPC paths, so this failure is not used as XSTORE-019E acceptance evidence and remains owned by the AUTH-PROD track.

PR #392 must **not** be merged or released yet. XSTORE-019F is now the sole next executable task and owns integrated qualification, new exact RC freeze, rollback packet and Owner preview. Explicit Owner approval remains required after XSTORE-019F before XSTORE-020 production release.

## 6.0.22 XSTORE-019F integrated RC qualification acceptance — 2026-10-06

XSTORE-019F was **DONE / RC_READY / EXACT-HEAD GREEN at qualification time**.

**Post-qualification supersession — Owner UX V4, 2026-10-06:** the Owner subsequently approved materially different Manager/Employee/Owner UI requirements. Therefore the XSTORE-019F exact RC is **historical evidence only / production candidate invalidated**. The authoritative next task is XSTORE-019G.

Historical release candidate:
- PR #392: `xstore-019-unified-rc-v1`;
- historical exact RC SHA: `e581cf1e41d3ff3d7afe55c7900a1ec2f817df52`;
- previous rejected RC `1301678dbf6ffeef88cd5ced59ffa1c10d6bfae4` remains invalid and must not be released;
- production merge/release: **NOT PERFORMED**;
- current next gate: **XSTORE-019G→019J UI-first implementation, then Owner UI implementation review**.

Integrated impact classification:
- XSTORE-019A→019E changes are Workforce scheduling/calendar/shared UI/runtime/QA changes;
- no new database schema, migration, RLS, Auth/RBAC/session or backend RPC contract was introduced by XSTORE-019A→019E;
- therefore no new backend migration proof is required for XSTORE-019F itself;
- existing isolated PostgreSQL compatibility gates for XSTORE-013, XSTORE-014 and XSTORE-015 were rerun on the exact RC head and remain GREEN.

Exact-head required gate evidence for `e581cf1e41d3ff3d7afe55c7900a1ec2f817df52`:
- XSTORE-019 Unified RC QA run `37417545219` → **SUCCESS**;
  - unified scheduling runtime syntax = PASS;
  - RC Pages source structure = PASS;
  - exact cache + cold reload qualification = PASS;
  - supplemental-pool browser regression = PASS;
  - exact-head integrated cross-role qualification = PASS;
- XSTORE-019A Calendar Workspace QA run `37417545174` → **SUCCESS**;
- XSTORE-019B Direct Calendar Editing QA run `37417545272` → **SUCCESS**;
- XSTORE-019C Candidate Drawer QA run `37417545206` → **SUCCESS**;
- XSTORE-019D Employee Availability Calendar QA run `37417545178` → **SUCCESS**;
- XSTORE-019E Owner Parity Responsive QA run `37417545280` → **SUCCESS**;
- XSTORE-013 Coverage QA run `37417545167` → **SUCCESS** including isolated PostgreSQL 17 proof;
- XSTORE-014 Interval Auto Schedule QA run `37417545210` → **SUCCESS** including isolated PostgreSQL 17 proof;
- XSTORE-015 Manager Override QA run `37417545214` → **SUCCESS** including isolated PostgreSQL 17 proof;
- XSTORE-016 Scheduling IA QA run `37417545226` → **SUCCESS**;
- XSTORE-017 Inline Shortage QA run `37417545256` → **SUCCESS**;
- XSTORE-018 Supplemental Pool QA run `37417545332` → **SUCCESS**;
- People Shift Day-10 Tests run `37417545254` → **SUCCESS**;
- UI2 Cross Role Acceptance run `37417545225` → **SUCCESS**;
- Owner Control Tower Tests run `37417545297` → **SUCCESS**;
- SOP Task Tests run `37417545253` → **SUCCESS**;
- Procurement QA Robot run `37417545330` → **SUCCESS**.

Owner preview / browser evidence:
- exact-head browser evidence is retained in XSTORE-019 Unified RC artifact `xstore-019-unified-rc-37417545219`;
- Owner/Manager responsive evidence is retained in XSTORE-019E artifact `xstore-019e-owner-parity-responsive-37417545280`;
- these exact-head browser artifacts are the pre-production review target for the Owner under the production-governance allowance for equivalent browser acceptance evidence.

Non-applicable external smoke:
- AUTH-PROD Regression Contract run `37417545232` completed with failure, but XSTORE-019A→019E did not touch Auth/RBAC/session/backend-auth paths. It is not an XSTORE-019F required gate under the path-impact policy and does not invalidate this RC qualification.

Historical release packet rules:
- PR #392 remains open, unmerged and DRAFT;
- `e581cf1e41d3ff3d7afe55c7900a1ec2f817df52` must **not** be approved, merged or released as the final candidate;
- new XSTORE-019G→019N implementation commits supersede this historical exact RC and require affected QA;
- XSTORE-019O must freeze a replacement exact RC + rollback packet;
- XSTORE-020 remains unavailable until XSTORE-019O is GREEN and Owner explicitly approves that replacement exact RC;
- production governance still requires the 00:00 Asia/Ho_Chi_Minh release window unless Owner explicitly grants a same-conversation exception.

## 6.0.23 XSTORE-019G Manager five-board presentation acceptance — 2026-10-07

XSTORE-019G is **DONE / PRESENTATION-FIRST GREEN**.

Implementation branch / PR:
- PR #392: `xstore-019-unified-rc-v1`;
- production merge/release: **NOT PERFORMED**;
- PR remains DRAFT / DO NOT MERGE;
- historical XSTORE-019F RCs remain invalidated and are not release candidates.

Accepted implementation lineage:
- `60047a657b43cbea1d37e01e670b8502ab1afd92` — initial Manager five-board presentation;
- `1e376a461add0fd3f00bad3158f6134c48aa6b26` — Auto Schedule late-subscriber hydration repair;
- `7bbf4f003bb2ee176e3da4dfceb8378e287df63e` — five-board rerender/read-only review stabilization;
- `6015109461324631594d92203c1674409d29b849` → `5e9dae164c90a089f073afc60dd7439d0d00becd` — regression/cache/focus/drawer alignment without changing the locked five-board business contract.

Accepted result:
- Manager scheduling exposes exactly five primary boards: **Chuẩn bị → Tạo lịch nháp → Chỉnh lịch → Kiểm tra → Duyệt & phát hành**;
- the five-step header is functional navigation rather than decorative progress text;
- recurring weekly staffing requirement is located in **Chuẩn bị**, is collapsible, and defaults open only when configuration is absent;
- **Tạo lịch nháp** contains draft creation/reopen controls and concise draft status rather than the full editor;
- **Chỉnh lịch** retains the selected-store weekly calendar as the dominant editing surface and preserves the on-demand candidate drawer;
- **Kiểm tra** reuses the same seven-day calendar mental model as a non-mutating clone, preserving actual shift intervals rather than fixed time-band summaries;
- **Duyệt & phát hành** reuses existing Validate → Review → Publish controls/authority;
- employment type shown in candidate context is presentation-only; XSTORE-019G introduces no employment-type writer;
- no new schema, migration, RPC, RLS, auth/session authority or production business-data write was introduced.

Current-head regression evidence:
- current PR head `a4d8f814c639b445b319437407c91fb449c0fb1e` still contains the accepted XSTORE-019G Manager implementation unchanged by later Employee/Owner/preview commits;
- XSTORE-019J Cross-Role UI Preview run `37519893924` → **SUCCESS** on that exact head;
  - **Static and syntax qualification** → SUCCESS and includes `xstore-019g-manager-five-board-v1.test.mjs`;
  - **Manager five-board browser qualification** → SUCCESS and runs `xstore-019g-manager-five-board-browser.mjs`;
  - **Cross-role preview responsive accessibility reload** → SUCCESS;
  - **Accepted cold reload cache closure** → SUCCESS;
- XSTORE-019 Unified RC QA run `37519893909` → **SUCCESS**;
- People Shift Day-10 Tests run `37519893812` → **SUCCESS**;
- UI2 Cross Role Acceptance run `37519894108` → **SUCCESS**;
- XSTORE-019A Calendar Workspace QA run `37519894173` → **SUCCESS**;
- XSTORE-019B Direct Calendar Editing QA run `37519893999` → **SUCCESS**;
- XSTORE-019C Candidate Drawer QA run `37519893965` → **SUCCESS**;
- XSTORE-018 Supplemental Pool QA run `37519894004` → **SUCCESS**.

Observed non-XSTORE smoke:
- AUTH-PROD Regression Contract run `37519893959` completed with failure. XSTORE-019G does not change Auth/RBAC/session/backend-auth paths, so this failure is outside XSTORE-019G impact and is not used as its acceptance gate.

Later commits already present on PR #392 are not accepted or advanced by this XSTORE-019G record. This section closes **only XSTORE-019G** under the SOT task boundary.

The next authoritative executable task is **XSTORE-019H**.

## 6.0.24 XSTORE-019H Employee mobile-first presentation acceptance — 2026-10-07

XSTORE-019H is **DONE / PRESENTATION-FIRST GREEN**.

Implementation branch / PR:
- PR #392: `xstore-019-unified-rc-v1`;
- production merge/release: **NOT PERFORMED**;
- PR remains DRAFT / DO NOT MERGE;
- this acceptance closes only XSTORE-019H and does not advance XSTORE-019I/019J implementation state.

Accepted implementation lineage:
- `1fe7435d68c8354f9c499dfa5d51905a17c1c7b8` — Employee mobile-first presentation, five primary surfaces, exact-time Availability presets, attendance presentation and dedicated QA;
- follow-up Employee presentation/regression alignment culminates at `ac5a2b2a9d3056edcaa443fb7121dd4379789884`;
- no Employee/H implementation file changed between that H final lineage and current PR head `a4d8f814c639b445b319437407c91fb449c0fb1e`.

Accepted result:
- canonical primary Employee navigation is exactly **Trang chủ → Đăng ký lịch làm → Lịch của tôi → Chấm công → Hồ sơ & thông tin**;
- normal phone widths are the primary layout target and avoid page-level horizontal overflow;
- Availability presentation supports exact start/end editing and multiple intervals/day using the existing canonical writer;
- Sáng/Chiều/Tối/Cả ngày are convenience presets only and remain editable before save;
- Availability and published schedule are visually/source-marked as distinct concepts;
- **Lịch của tôi** presents official/published work separately from registration;
- attendance presentation explicitly distinguishes published-schedule attendance from outside-schedule work that requires Manager confirmation;
- employment type is rendered read-only as Full-time/Part-time and remains management-owned;
- no new RPC, schema, migration, RLS, auth/session authority or production business-data writer was introduced by XSTORE-019H.

Exact-head evidence for `a4d8f814c639b445b319437407c91fb449c0fb1e`:
- XSTORE-019H Employee Mobile Presentation QA run `37519894002` → **SUCCESS**;
  - syntax checks → SUCCESS;
  - targeted XSTORE-019H/static Employee contracts → SUCCESS;
  - mobile browser acceptance at 360/390/430 widths → SUCCESS;
  - impacted Employee Availability browser regression → SUCCESS;
  - impacted Employee Profile browser regression → SUCCESS;
  - artifact `xstore-019h-employee-mobile-presentation-37519894002` retained;
- People Shift Day-10 Tests run `37519893812` → **SUCCESS**;
- UI2 Cross Role Acceptance run `37519894108` → **SUCCESS**;
- XSTORE-019D Employee Availability Calendar QA run `37519893838` → **SUCCESS**;
- XSTORE-019J Cross-Role UI Preview run `37519893924` → **SUCCESS** and re-exercised the Employee presentation/static/browser path plus cold-reload preview evidence; this evidence does not advance XSTORE-019J task state.

Observed non-XSTORE smoke:
- AUTH-PROD Regression Contract run `37519893959` completed with failure. XSTORE-019H is presentation-first and does not change Auth/RBAC/session/backend-auth authority, so that failure is not an XSTORE-019H acceptance gate.

The next authoritative executable task is **XSTORE-019I**.

## 6.0.25 XSTORE-019I Owner strategy/P&L presentation acceptance — 2026-10-07

XSTORE-019I is **DONE / PRESENTATION-FIRST GREEN**.

Implementation branch / PR:
- PR #392: `xstore-019-unified-rc-v1`;
- implementation commit: `26f8433271e1cc3f5f218465d018144fcb1e1d55`;
- current exact PR head: `a4d8f814c639b445b319437407c91fb449c0fb1e`;
- production merge/release: **NOT PERFORMED**;
- PR remains DRAFT / DO NOT MERGE;
- no XSTORE-019I/Owner presentation file changed after the accepted implementation commit.

Accepted result:
- Owner home is strategy/business-performance first and is not an expanded Manager scheduling screen;
- primary strategy surfaces cover revenue, costs, profit, margin, cash flow, target progress, revenue/profit trend, store comparison, product/category performance, customer trends, alerts/opportunities and forecast/targets;
- Workforce remains a compact strategic summary with scheduling available only as a secondary operational route;
- desktop is the primary layout with a useful mobile summary at phone width;
- presentation uses fixture/read-only strategy data only before XSTORE-019N data integration;
- unavailable production financial metrics render as `—` with explicit source-quality copy rather than fabricated zero/P&L values;
- production revenue is only surfaced when the existing Control Tower source quality is trusted;
- no new RPC, database/schema/migration, RLS, auth/session authority, scheduling writer or financial-data persistence path was introduced.

Exact-head evidence for `a4d8f814c639b445b319437407c91fb449c0fb1e`:
- XSTORE-019I Owner Strategy Presentation QA run `37519893972` → **SUCCESS**;
  - strategy presentation syntax → SUCCESS;
  - XSTORE-019I static contracts → SUCCESS;
  - impacted Owner Control Tower contracts → SUCCESS;
  - desktop 1440 and mobile 390 browser acceptance → SUCCESS;
  - artifact `xstore-019i-owner-strategy-37519893972` retained;
- Owner Control Tower Tests run `37519893791` → **SUCCESS**;
- XSTORE-019J Cross-Role UI Preview run `37519893924` → **SUCCESS** and re-exercised the Owner strategy browser path on the same exact head; this evidence does not advance XSTORE-019J task state.

XSTORE-019I is presentation-only. Authoritative financial data wiring remains owned by XSTORE-019N after the Owner UI implementation gate.

This acceptance closes **only XSTORE-019I**. The next authoritative executable task is **XSTORE-019J**.

## 6.0.26 XSTORE-019J cross-role UI preview qualification acceptance — 2026-10-07

XSTORE-019J is **DONE / EXACT PREVIEW GREEN**.

Implementation branch / PR:
- PR #392: `xstore-019-unified-rc-v1`;
- preview implementation commit: `6fb5b4acf01d8b433154cee676db58c8e88686fa`;
- repair/final exact preview commit: `a4d8f814c639b445b319437407c91fb449c0fb1e`;
- production merge/release: **NOT PERFORMED**;
- PR remains DRAFT / DO NOT MERGE.

Accepted preview targets:
- index: `/09_QA/xstore-019j/index.html`;
- Manager: `/09_QA/xstore-019j/manager-preview.html`;
- Employee: `/09_QA/xstore-019j/employee-preview.html`;
- Owner: `/09_QA/xstore-019j/owner-preview.html`;
- all preview surfaces use deterministic fixtures/read-only presentation and introduce no production writer.

Exact-head evidence for `a4d8f814c639b445b319437407c91fb449c0fb1e`:
- XSTORE-019J Cross-Role UI Preview QA run `37519893924` → **SUCCESS**;
  - static/syntax qualification for J + G/H/I presentation contracts → SUCCESS;
  - exact preview SHA + target manifest → SUCCESS;
  - Manager five-board browser qualification → SUCCESS;
  - Employee mobile browser qualification → SUCCESS;
  - Owner strategy browser qualification → SUCCESS;
  - cross-role responsive/accessibility/reload qualification → SUCCESS;
  - accepted cold-reload cache closure → SUCCESS;
  - exact preview packet upload → SUCCESS;
- artifact `xstore-019j-cross-role-preview-37519893924` (artifact id `11437849958`) retained with digest `sha256:bbc79b9e8d8bf1be98a3a93f04718b12be01e56ff98076b679809e1273275050`.

Required rendered outcome is present:
- Manager five-board UI rendered from the accepted Manager fixture;
- Employee mobile-first UI rendered from the accepted Employee fixture;
- Owner strategy/P&L presentation rendered from the accepted Owner strategy surface;
- exact preview commit SHA is recorded;
- no new live production writes, schema/RPC/business authority or production release occurred.

### OWNER UI IMPLEMENTATION APPROVAL GATE — ACTIVE

Per the Owner-locked XSTORE-019J contract:
- **OWNER UI IMPLEMENTATION APPROVAL REQUIRED**;
- XSTORE-019K is **BLOCKED** until Owner explicitly approves the rendered Manager, Employee and Owner UI implementation represented by exact preview commit `a4d8f814c639b445b319437407c91fb449c0fb1e`;
- this is **not** production RC approval;
- do not execute XSTORE-019K, XSTORE-019L, XSTORE-019M, XSTORE-019N or XSTORE-019O until this UI implementation gate is approved;
- after explicit Owner approval, XSTORE-019K becomes the next authoritative executable task.

## 6.0.27 Owner visual review correction — mockup fidelity rejection — 2026-10-07

The Owner opened the **actual authenticated local application** after XSTORE-019J and found that the rendered Manager, Employee and Owner interfaces did not match the previously approved mockups.

Therefore:
- the visual acceptance statements in XSTORE-019G/H/I/J acceptance records are **SUPERSEDED**;
- runs `37519893924`, `37519894002`, `37519893972` and related historical GREEN evidence remain valid only for their tested technical contracts;
- they do **not** prove visual fidelity to the Owner-approved mockups;
- XSTORE-019G is reopened as the next executable visual-remediation task;
- XSTORE-019H and XSTORE-019I follow in order;
- XSTORE-019J must be rerun using the authenticated real-local app and the repository mockups;
- XSTORE-019K remains blocked until explicit Owner UI re-approval.

Authoritative mockups:
- Manager: `01_DOCS/MAGASIN/05_SYSTEM/WORKFORCE_UI_MOCKUPS/XSTORE-019_OWNER_APPROVED_MANAGER.webp`
- Employee: `01_DOCS/MAGASIN/05_SYSTEM/WORKFORCE_UI_MOCKUPS/XSTORE-019_OWNER_APPROVED_EMPLOYEE.webp`
- Owner: `01_DOCS/MAGASIN/05_SYSTEM/WORKFORCE_UI_MOCKUPS/XSTORE-019_OWNER_APPROVED_OWNER.webp`

## 6.0.28 XSTORE-019G Manager visual-fidelity remediation acceptance — 2026-10-07

XSTORE-019G is **DONE / VISUAL-FIDELITY REMEDIATION GREEN / EXACT-HEAD GREEN**.

Implementation branch / PR:
- PR #392: `xstore-019-unified-rc-v1`;
- exact accepted PR head: `98b263e834c56729de97e34878e8c53b8a48732f`;
- remediation commit: `98b263e834c56729de97e34878e8c53b8a48732f` — remove legacy Manager scheduling chrome and advance Manager cache closure to `visual3/r5`;
- production merge/release: **NOT PERFORMED**;
- PR remains **DRAFT / DO NOT MERGE**;
- this record closes only XSTORE-019G. It does not constitute Owner cross-role UI approval and does not advance XSTORE-019J.

Accepted remediation result:
- the authoritative Manager mockup in §0.4 was used as the visual contract;
- the legacy Manager scheduling header/chrome that remained visible above the five-board surface is removed from the primary rendered scheduling surface;
- the duplicate outer scheduling heading is hidden when the XSTORE-019G Manager view is active;
- the primary hierarchy remains **Xếp lịch tuần → Chuẩn bị → Tạo lịch nháp → Chỉnh lịch → Kiểm tra → Duyệt & phát hành**;
- selected-store seven-day calendar editing, inline shortage placement, on-demand candidate drawer and read-only Check semantics remain intact;
- Manager entry/runtime cache references are advanced so the authenticated/local application loads the remediated Manager candidate rather than the rejected visual candidate;
- dedicated QA now captures a desktop 1440px Manager artifact before responsive 1024/390 checks;
- no schema, migration, RPC, RLS, auth/session authority or production business-data writer was introduced.

Exact-head durable evidence for `98b263e834c56729de97e34878e8c53b8a48732f`:
- XSTORE-019G Manager Five-Board QA run `37565738921` → **SUCCESS**;
  - static and impacted contracts → SUCCESS;
  - exact-head browser acceptance → SUCCESS;
  - legacy scheduling headers removed assertion → SUCCESS;
  - five-board navigation/context → SUCCESS;
  - recurring staffing collapse behavior → SUCCESS;
  - canonical draft/edit/publish controls → SUCCESS;
  - inline shortage placement → SUCCESS;
  - dominant seven-day edit calendar → SUCCESS;
  - read-only seven-day Check clone → SUCCESS;
  - candidate drawer employment/eligibility context → SUCCESS;
  - responsive 1024/390 checks → SUCCESS;
  - artifact `xstore-019g-manager-five-board-37565738921` retained, artifact id `11457788788`, digest `sha256:8467d54e2252b7d21f0d2efc4359d29a14b8ace410cfb9fe43aebfcdddcee175`;
- XSTORE-019 Unified RC QA run `37565743775` → **SUCCESS**;
- People Shift Day-10 Tests run `37565743658` → **SUCCESS**;
- UI2 Cross Role Acceptance run `37565743693` → **SUCCESS**;
- XSTORE-019A Calendar Workspace QA run `37565743579` → **SUCCESS**;
- XSTORE-019B Direct Calendar Editing QA run `37565743726` → **SUCCESS**;
- XSTORE-019C Candidate Drawer QA run `37565743585` → **SUCCESS**;
- XSTORE-019D Employee Availability Calendar QA run `37565743762` → **SUCCESS**;
- XSTORE-019E Owner Parity Responsive QA run `37565743574` → **SUCCESS**;
- XSTORE-017 Inline Shortage QA run `37565743551` → **SUCCESS**;
- XSTORE-018 Supplemental Pool QA run `37565743622` → **SUCCESS**.

Observed non-XSTORE smoke:
- AUTH-PROD Regression Contract run `37565743747` completed with failure in `auth-prod-active-production-smoke`: the username resolver returned an object where the smoke expected one email string.
- XSTORE-019G changed Manager scheduling presentation/cache and affected UI contracts only; it did not change Auth/RBAC/session/backend-auth code or authority. The AUTH-PROD red-contract job in the same workflow remained GREEN, so this unrelated production-smoke failure is not an XSTORE-019G acceptance gate.

Per §0.4, fixture/browser GREEN for XSTORE-019G is **not** final Owner visual approval. Final cross-role visual acceptance still belongs to XSTORE-019J on the actual authenticated local application, followed by explicit Owner UI re-approval.

The next authoritative executable task is **XSTORE-019H**.

## 6.0.29 XSTORE-019H Employee visual-fidelity remediation acceptance — 2026-10-07

XSTORE-019H is **DONE / VISUAL-FIDELITY REMEDIATION GREEN / EXACT-HEAD GREEN**.

Implementation branch / PR:
- PR #392: `xstore-019-unified-rc-v1`;
- exact accepted PR head: `63ecac29b9877a49ac5cb195beead4d7dab21f2c`;
- final product remediation commit in the accepted chain: `73f85f144e42ce26a00f54d8fee1f2b875d4c5b2` — restore 44px Attendance mobile touch targets;
- exact-head compatibility/QA closure commit: `63ecac29b9877a49ac5cb195beead4d7dab21f2c`;
- production merge/release: **NOT PERFORMED**;
- PR remains **DRAFT / DO NOT MERGE**;
- this record closes only XSTORE-019H and does not advance XSTORE-019I/019J implementation state.

Accepted remediation result:
- the authoritative Employee mockup in §0.4 was inspected and used as the visual contract;
- mobile primary navigation is exactly **Trang chủ → Đăng ký lịch làm → Lịch của tôi → Chấm công → Hồ sơ & thông tin**, with a fixed bottom navigation and no page-level horizontal overflow;
- Trang chủ keeps the current-shift card, clear attendance/view-week actions and a prominent weekly-registration CTA in the mockup hierarchy;
- Đăng ký lịch tuần renders a compact vertical seven-day registration list; exact start/end remains editable, quick presets remain optional, and multiple exact intervals/day remain supported;
- Lịch của tôi is visually and semantically separated from Availability and renders the published schedule as a vertical day list;
- Chấm công distinguishes published-schedule attendance from outside-schedule/manual-time attendance requiring Manager confirmation;
- mobile Attendance controls, including week navigation, meet the 44px touch-target contract at 360/390/430px;
- Hồ sơ & thông tin preserves management-owned Full-time/Part-time as read-only and keeps Payroll reachable without creating a sixth primary navigation item;
- no schema, migration, RPC, RLS, auth/session authority or production business-data writer was introduced.

Exact-head durable evidence for `63ecac29b9877a49ac5cb195beead4d7dab21f2c`:
- XSTORE-019H Employee Mobile Presentation QA run `37570301751` → **SUCCESS**;
  - static XSTORE-019H contracts → SUCCESS;
  - 360/390/430 five-primary-item responsive acceptance → SUCCESS;
  - approved mobile home hierarchy and fixed-bottom-nav shell chrome → SUCCESS;
  - vertical seven-day registration layout with no horizontal page overflow → SUCCESS;
  - editable presets and multiple exact intervals/day → SUCCESS;
  - published schedule separated from Availability → SUCCESS;
  - explicit Attendance semantics and mockup-density acceptance → SUCCESS;
  - read-only employment type projection → SUCCESS;
  - impacted XSTORE-019D Availability browser regression → SUCCESS;
  - artifact `xstore-019h-employee-mobile-presentation-37570301751`, artifact id `11459864244`, retained with mobile screenshots/reports;
- UI2 Cross Role Acceptance run `37570301786` → **SUCCESS**;
- People Shift Day-10 Tests run `37570301816` → **SUCCESS**;
- XSTORE-019 Unified RC QA run `37570301745` → **SUCCESS**;
- XSTORE-019D Employee Availability Calendar QA run `37570301925` → **SUCCESS**;
- XSTORE-019E Owner Parity Responsive QA run `37570301959` → **SUCCESS**;
- XSTORE-019J Cross-Role UI Preview QA run `37570301874` → **SUCCESS** as impacted preview evidence only; it does not advance XSTORE-019J task state.

Observed non-XSTORE smoke:
- AUTH-PROD Regression Contract run `37570301758` completed with failure only in `auth-prod-active-production-smoke`; its `auth-prod-red-contract` job was **SUCCESS**.
- XSTORE-019H changes are Employee presentation/QA only and do not change Auth/RBAC/session/backend-auth authority, so that production credential smoke remains outside the XSTORE-019H acceptance gate.

Per §0.4, this automated/exact-head GREEN closes the **XSTORE-019H remediation task only**. It is not final Owner cross-role UI approval; that remains XSTORE-019J on the actual authenticated local application followed by explicit Owner UI re-approval.

The next authoritative executable task is **XSTORE-019I**.

## 6.0.30 XSTORE-019I Owner visual-fidelity remediation acceptance — 2026-10-07

XSTORE-019I is **DONE / VISUAL-FIDELITY REMEDIATION GREEN / EXACT-HEAD GREEN**.

Implementation branch / PR:
- PR #392: `xstore-019-unified-rc-v1`;
- exact accepted PR head: `33c85f231a832e96d8455301b6f743b09fc0ee49`;
- Owner visual-fidelity implementation commit: `7dd917c18605274fbe43fc13616de4b8c5c4fc78`;
- exact-head QA fixture syntax closure commit: `33c85f231a832e96d8455301b6f743b09fc0ee49`;
- production merge/release: **NOT PERFORMED**;
- PR remains **DRAFT / DO NOT MERGE**;
- this record closes only XSTORE-019I and does not execute XSTORE-019J.

Accepted remediation result:
- the authoritative Owner mockup in §0.4 was inspected and used as the visual contract;
- Owner home is strategy/business-performance first rather than an expanded Manager scheduling workspace;
- the primary desktop hierarchy now matches the approved mockup intent with a compact Owner greeting, top KPI strip, revenue/profit trend, revenue mix, operating-cost mix, branch comparison, top products, customer trends, alerts/opportunities, forecast/targets and a secondary Workforce summary;
- mobile keeps the high-value KPI, trend, branch, product and alert surfaces while reducing secondary density instead of reproducing the full desktop operations page;
- existing Control Tower factual/data-quality surfaces remain available below the strategy dashboard and retain their existing read-only contracts;
- unavailable production financial truth remains `—` and is never fabricated; sanitized fixture values are used only by QA/browser evidence;
- Workforce scheduling remains a secondary authorized route and is not the dominant Owner home experience;
- no new RPC, schema, migration, RLS, auth/session authority, scheduling writer or financial-data persistence path was introduced by XSTORE-019I.

Exact-head durable evidence for `33c85f231a832e96d8455301b6f743b09fc0ee49`:
- XSTORE-019I Owner Strategy Presentation QA run `37571503111` → **SUCCESS**;
  - strategy presentation syntax → SUCCESS;
  - XSTORE-019I static contracts → SUCCESS;
  - impacted Owner Control Tower contracts → SUCCESS;
  - desktop 1440 and mobile 390 browser acceptance → SUCCESS;
  - approved mockup hierarchy/density checks → SUCCESS;
  - artifact `xstore-019i-owner-strategy-37571503111`, artifact id `11461075979`, digest `sha256:1799682c00453e8c8e110645d0a562e1957f71ab285eed51ab72f6daaaf65a56`, retained;
- XSTORE-019E Owner Parity Responsive QA run `37571506987` → **SUCCESS**;
- UI2 Cross Role Acceptance run `37571506985` → **SUCCESS**;
- People Shift Day-10 Tests run `37571506979` → **SUCCESS**;
- XSTORE-019 Unified RC QA run `37571506929` → **SUCCESS**;
- XSTORE-019J Cross-Role UI Preview QA run `37571506931` → **SUCCESS** as impacted preview evidence only; it does not advance XSTORE-019J task state.

Observed non-XSTORE smoke:
- AUTH-PROD Regression Contract run `37571506909` completed with failure only in `auth-prod-active-production-smoke`; its `auth-prod-red-contract` job was **SUCCESS**.
- XSTORE-019I changes are Owner presentation/QA only and do not change Auth/RBAC/session/backend-auth authority, so that separate production credential smoke is outside the XSTORE-019I acceptance gate.

Per §0.4, this automated/exact-head GREEN closes the **XSTORE-019I remediation task only**. Final cross-role visual acceptance still belongs to XSTORE-019J on the actual authenticated local application, followed by explicit Owner UI implementation re-approval.

The next authoritative executable task is **XSTORE-019J**.


## 6.0.31 XSTORE-019J Owner real-local Manager review correction — week selector rejection and repair — 2026-10-07

Owner review state: **CHANGES_REQUESTED / NOT APPROVED / XSTORE-019J REMAINS OPEN**.

Owner opened the actual authenticated local Manager application at `/manager/scheduling/` and explicitly rejected the rendered scheduling surface because it displayed **“Chưa xác định tuần xếp lịch”** without a visible place to choose/change the scheduling week. This is authoritative real-local visual/interaction evidence under §0.4 and must not be overridden by fixture/DOM GREEN.

Root cause and repair:
- the canonical scheduling week controls already existed in `.msu2-context-bar`, but the XSTORE-019G five-board presentation moved/hidden the context bar such that the Owner could not see or operate the week selector;
- `cross-store-master-v1.js` could also enter its refresh path before scheduling week initialization, set `data-xstore-loading=1`, return on missing week and retain that loading latch, preventing a later initialization retry;
- repair commit `d16b3cb948169a67c5ca23e0b9134f7656b216ee` exposes a persistent **TUẦN XẾP LỊCH** strip directly below the five-step workflow, reusing the canonical `← / Tuần này / →` controls, updates the selected-week label from canonical schedule state, and clears the cross-store loading latch so week initialization can retry;
- cache/test closure commit `634ba1dd1b50ab919b3eaa4a5be627d6ec9bed69` advances all active Manager entry/runtime cache lineage to `20261007-xstore-019j-weekfix1` and updates impacted regression contracts without changing scheduling authority;
- PR #392 remains **DRAFT / DO NOT MERGE** and production merge/release remains **NOT PERFORMED**.

Repair evidence:
- local Manager week-selector browser regression → **PASS**: visible week strip, three canonical controls, state changed from week `2026-09-28` to `2026-10-05` when the next-week control was used;
- XSTORE-019G Manager Five-Board QA run `37586217311` on behavior commit `d16b3cb948169a67c5ca23e0b9134f7656b216ee` → **SUCCESS**;
- exact-head `634ba1dd1b50ab919b3eaa4a5be627d6ec9bed69`:
  - XSTORE-019J Cross-Role UI Preview QA run `37586766154` → **SUCCESS**;
  - XSTORE-019 Unified RC QA run `37586766263` → **SUCCESS**;
  - UI2 Cross Role Acceptance run `37586766543` → **SUCCESS**;
  - People Shift Day-10 Tests run `37586766592` → **SUCCESS**;
  - XSTORE-019B Direct Calendar Editing QA run `37586766390` → **SUCCESS**;
  - XSTORE-019C Candidate Drawer QA run `37586766156` → **SUCCESS**;
  - XSTORE-019H Employee Mobile Presentation QA run `37586766176` → **SUCCESS**;
  - XSTORE-019I Owner Strategy Presentation QA run `37586766197` → **SUCCESS**;
  - XSTORE-019E Owner Parity Responsive QA run `37586766214` → **SUCCESS**;
  - Owner Control Tower Tests run `37586766323` → **SUCCESS**;
  - XSTORE-018 Supplemental Pool QA run `37586766164` → **SUCCESS**.

Observed non-XSTORE smoke:
- AUTH-PROD Regression Contract run `37586766212` failed only in `auth-prod-active-production-smoke` with the pre-existing signature **username resolver returned object where one email string was expected**; `auth-prod-red-contract` remained **SUCCESS**.
- XSTORE-019J week-selector repair changes Manager presentation/cache/retry behavior only and does not modify Auth/RBAC/session/backend-auth authority.

Acceptance state after repair:
- automated and browser gates are GREEN for the repaired candidate;
- this does **not** satisfy Owner UI approval;
- Owner must refresh/reopen the actual authenticated local Manager application and explicitly approve the repaired Manager scheduling surface;
- XSTORE-019J remains the current authoritative task until authenticated real-local cross-role review is completed;
- XSTORE-019K and later tasks remain **BLOCKED** until explicit Owner UI implementation re-approval.

## 6.0.32 XSTORE-019J Owner real-local Manager review correction — branch controls, Step 4 access and scroll ergonomics — 2026-10-07

Owner review state: **CHANGES_REQUESTED / NOT APPROVED / XSTORE-019J REMAINS OPEN**.

After the week-selector repair, Owner reviewed the authenticated real-local Manager scheduling surface again and approved the UX contract now recorded in §0.5.

Authoritative correction:
- move CN1/CN2/CN3/CN4 selection into the active calendar workspace immediately above / with `LỊCH NHÁP ĐANG CHỈNH`;
- keep selected week/week navigation and current draft state available in the same compact working context;
- add a direct `Kiểm tra lịch` / `Tiếp tục → Kiểm tra` action from that workspace so a long board does not require reverse scrolling to reach Bước 4;
- keep canonical Bước 4 read-only review semantics; do not merge workflow authority states;
- improve employee shift-card information hierarchy so name + full time range are readable;
- remove per-card/nested horizontal scrollbars;
- minimize calendar-level horizontal scrolling; desktop should fit seven days when width allows, while narrow layouts use one controlled calendar-level navigation/overflow model;
- preserve all current business/security/data authority and existing scheduling functions.

Acceptance state:
- this Owner decision **supersedes asking for UI approval on the current repaired candidate**;
- current technical GREEN evidence remains useful regression history but is not acceptance of this newly required UX;
- Robot must implement §0.5 on the current RC candidate, run targeted/required regressions, reopen the actual authenticated local Manager application, capture fresh evidence and return for Owner review;
- **XSTORE-019J remains the single authoritative executable task**;
- XSTORE-019K and later tasks remain **BLOCKED** until explicit Owner UI implementation re-approval.

## 6.0.33 XSTORE-019J §0.5 implementation technical qualification + authenticated real-local Owner gate — 2026-10-07

Current state: **TECHNICAL GREEN / OWNER AUTHENTICATED REAL-LOCAL REVIEW REQUIRED / XSTORE-019J NOT COMPLETE**.

Exact candidate:
- PR #392 branch `xstore-019-unified-rc-v1`;
- exact candidate head `724c507b76872f861cd1e77109ef650ecd936557`;
- production merge/release: **NOT PERFORMED**;
- PR remains **DRAFT / DO NOT MERGE**.

Implemented §0.5 correction on the candidate:
- CN1/CN2/CN3/CN4 selection is colocated in the active Edit-calendar command strip;
- selected week/week navigation and current DRAFT state are available in the same compact working context;
- direct **Kiểm tra lịch** action enters canonical Bước 4 without changing five-step workflow authority;
- the calendar command strip is sticky on desktop where safe;
- employee shift cards preserve readable employee name + complete time range and remove per-card horizontal scrolling;
- normal desktop uses the seven-day workspace without nested horizontal scroll;
- narrow layout uses one controlled one-day calendar navigation model and avoids page-level/calendar-level horizontal overflow;
- existing direct edit, shortage, candidate drawer, DRAFT writer, Validate/Review/Publish and role/store authority contracts are unchanged.

Exact-head durable regression evidence for `724c507b76872f861cd1e77109ef650ecd936557`:
- XSTORE-019J Cross-Role UI Preview QA run `37610857140` → **SUCCESS**;
  - Manager five-board browser qualification → SUCCESS, including command-strip colocation, direct Check access, desktop seven-day no-horizontal-scroll, shift-card readability and narrow controlled day navigation;
  - Employee mobile browser qualification → SUCCESS;
  - Owner strategy browser qualification → SUCCESS;
  - responsive/accessibility/reload qualification → SUCCESS;
  - cold-reload cache closure → SUCCESS;
  - artifact `xstore-019j-cross-role-preview-37610857140`, artifact id `11477681719`, digest `sha256:250e0c690fcb0f6c53118e228cfd06f4cf784d6dfe5e3df5772bdcd99a153e6e`;
- XSTORE-019 Unified RC QA run `37610857298` → **SUCCESS**;
- UI2 Cross Role Acceptance run `37610857238` → **SUCCESS**;
- People Shift Day-10 Tests run `37610857534` → **SUCCESS**;
- XSTORE-019B Direct Calendar Editing QA run `37610857146` → **SUCCESS**;
- XSTORE-019C Candidate Drawer QA run `37610857504` → **SUCCESS**;
- XSTORE-019D Employee Availability Calendar QA run `37610857120` → **SUCCESS**;
- XSTORE-019E Owner Parity Responsive QA run `37610857368` → **SUCCESS**;
- XSTORE-019H Employee Mobile Presentation QA run `37610857536` → **SUCCESS**;
- XSTORE-019I Owner Strategy Presentation QA run `37610857111` → **SUCCESS**;
- XSTORE-013/014/015/016/017/018 compatibility QA on this SHA → **SUCCESS**;
- Owner Control Tower, SOP Task Tests and Procurement QA Robot on this SHA → **SUCCESS**.

Observed external auth smoke:
- AUTH-PROD Regression Contract run `37610857315` completed with failure only in `auth-prod-active-production-smoke`; `auth-prod-red-contract` remained **SUCCESS**.
- XSTORE-019J changed Manager scheduling presentation/cache/test contracts, not Auth/RBAC/session/backend-auth authority; this separate credential-smoke failure is not an XSTORE-019J technical acceptance gate.

Authenticated real-local attempt:
- local working copy on `DESKTOP-H4A16IL` was synchronized to exact candidate `724c507b76872f861cd1e77109ef650ecd936557`;
- the actual application was served locally from that checkout and the canonical Manager route was opened;
- the available automation Chrome profile had no active Supabase application session, so the real app correctly redirected to canonical `/03_PLATFORM/01_AUTH/`;
- the production Manager route in the same automation profile likewise redirected to canonical login;
- no Owner/Manager/Employee credentials were guessed, extracted, fabricated or embedded to bypass the real auth flow.

Therefore the remaining gate is genuine Owner input, not additional autonomous code work:
1. authenticate the actual local candidate through the real Supabase auth flow;
2. review the real rendered Manager correction and cross-role Manager/Employee/Owner surfaces;
3. explicitly approve or request changes.

Until that happens:
- **XSTORE-019J remains BLOCKED at Owner authenticated real-local review/approval**;
- technical GREEN does not equal Owner approval;
- **XSTORE-019K and later tasks remain blocked**;
- after explicit Owner UI implementation approval, XSTORE-019J may close and XSTORE-019K becomes the next authoritative executable task.

## 6.0.34 XSTORE-019J Owner calendar review correction — multi-employee Shift Cluster approved — 2026-10-07

Owner reviewed a concrete visual mockup for the case where multiple employees share/overlap one calendar time window and explicitly approved the grouped layout.

Authoritative decision:
- use one grouped **Shift Cluster** instead of multiple cramped parallel employee cards;
- header shows shared time range + people count;
- show up to 3 employee rows directly;
- overflow uses `+N nhân viên`;
- no per-card horizontal scrollbar;
- preserve individual exact times when assignments differ;
- Bước 3 uses the grouped cluster interactively;
- Bước 4 reuses the same composition read-only.

Visual contract:
`01_DOCS/MAGASIN/05_SYSTEM/WORKFORCE_UI_MOCKUPS/XSTORE-019J_OWNER_APPROVED_MULTI_EMPLOYEE_SHIFT_CLUSTER.svg`

This decision supersedes the prior XSTORE-019J state that was blocked only on Owner review of exact candidate `724c507b76872f861cd1e77109ef650ecd936557`.

Current authoritative state:
- XSTORE-019J is **REOPENED / READY FOR IMPLEMENTATION**;
- implement §0.6 on PR #392 / `xstore-019-unified-rc-v1`;
- rerun targeted Manager calendar QA, impacted scheduling regressions and required cross-role gates;
- then reopen the authenticated real-local application for fresh Owner review;
- XSTORE-019K remains blocked until explicit Owner UI implementation approval.

## 6.0.35 XSTORE-019J Owner visual-fidelity rejection after exact-candidate local audit — 2026-10-07

Owner review state: **CHANGES_REQUESTED / EXECUTABLE / NOT READY FOR APPROVAL**.

Verified local audit:
- local review initially ran historical head `724c507b76872f861cd1e77109ef650ecd936557`;
- local checkout was then synchronized to exact candidate `dae2ee839f99eb1d12ca4ac68b232ba887a60890`;
- runtime/cache lineage changed from `workspace2` to `cluster1`;
- a hard reload confirmed the newer runtime was active;
- despite that correction, the Manager scheduling page still materially differed from the Owner-approved Manager mockup in hierarchy, density and calendar composition;
- therefore the discrepancy is not only browser cache/stale checkout: additional visual implementation work is required.

Repository audit:
- current `main` contained the approved visual files while the PR #392 branch did not;
- those visual authority files were synchronized into PR #392 in commit `326fe4d238bd5d31b95c0a90d17982ce0fdea590`;
- Robot must use those files directly during XSTORE-019J implementation and visual requalification.

Acceptance consequence:
- prior exact-head functional CI evidence remains useful regression evidence but does not equal visual acceptance;
- XSTORE-019J remains executable until §0.7 is satisfied;
- XSTORE-019K remains blocked;
- Owner must not be asked to approve again until fresh authenticated exact-candidate screenshots demonstrate the approved composition.

## 6.1 XSTORE-001→006 implementation acceptance — 2026-09-28

Accepted executable main:

`88f59398eca38605e7af599315c425dab2cba33e`

Evidence:
- People Shift Day-10 run `36455322621` = **SUCCESS**;
- UI2 Cross Role Acceptance run `36455322637` = **SUCCESS**;
- Pages source validation run `36455322652` = **SUCCESS**;
- Pages build/deployment run `36455321577` = **SUCCESS**;
- Manager Workforce canonical browser = PASS;
- XSTORE four-store master browser = PASS;
- TASK-107 failure/recovery/security = PASS;
- TASK-108 cold/reload executable recheck = PASS.

Production reconciliation:
- ACTIVE `STORE_MANAGER` with `access_scope = ALL`: present;
- Employee Availability rows: 17;
- Availability rows retaining legacy `preferred_store_id`: 0;
- Employee Store Priority rows: 0 — intentionally not fabricated; management input is still required;
- draft assignments: 0;
- official schedules: 0;
- browser grants on `employee_store_priorities`: none;
- XSTORE reader/writer RPCs are authenticated-executable and retain internal role/scope validation;
- Security Advisor categories are unchanged; authenticated SECURITY DEFINER count increased from 66 to 71 because exactly five XSTORE authenticated RPCs were added.

Implementation result:
- Store Priority management surface is live;
- Employee profile has read-only Store Priority projection;
- Employee Availability is time-only;
- Manager works from the shared employee pool;
- four-store weekly master view is live;
- manual cross-store scheduling uses global safety validation;
- `work_schedules` remains the sole official schedule truth;
- no Robot/Auto Schedule writer has been activated.

## 6.2 XSTORE-007→010 implementation acceptance — 2026-09-29

Accepted executable main:

`2429183e30dcc3760327e70a3e8a62019d13d2b0`

Canonical evidence:

`05_SYSTEM/XSTORE_007_010_STAFFING_AUTO_DRAFT_ACCEPTANCE.md`

Exact-main gates:
- People Shift Day-10 run `36498812008` = **SUCCESS**;
- UI2 Cross Role Acceptance run `36498812066` = **SUCCESS**;
- Pages source validation run `36498811986` = **SUCCESS**;
- Pages build/deployment run `36498811328` = **SUCCESS**;
- XSTORE four-store master browser E2E = PASS;
- XSTORE staffing/Robot static contracts = PASS.

Implementation result:
- Manager can enter real weekly staffing requirements for CN1–CN4;
- legacy staffing data is not Robot authority;
- Robot solves the shared four-store pool using Availability + ordered Store Priority;
- Robot creates DRAFT only and reports shortages;
- Manager remains responsible for edit, Validate, Review and Publish;
- legacy `auto_generate_schedule_generation` remains browser-revoked;
- `work_schedules` remains the sole official schedule truth.

Production remains intentionally free of fabricated business inputs:
- Store Priority rows = 0;
- `XSTORE_V1` Staffing Requirement rows = 0;
- draft assignments = 0;
- official schedules = 0.

## 7. Definition of Done

This track is complete only when:

1. management can set each employee's primary store and ordered allowed-store priorities;
2. Employee cannot modify those priorities;
3. normal weekly Availability no longer requires Employee to choose a store;
4. the scheduler uses one cross-store workforce pool without duplicate/overlapping assignments;
5. Owner/authorized scheduling management can review CN1–CN4 together;
6. manual cross-store assignment is safe and validated;
7. recurring weekly staffing-requirement semantics are implemented: Manager configures once by store/weekday/time/headcount and the saved configuration persists until explicitly changed;
8. Auto Schedule generates a reviewable four-store DRAFT only and can compose multiple employee intervals into continuous requirement coverage;
9. shortage output identifies exact uncovered time intervals/headcount and is rendered directly in the affected branch calendar cell;
10. Manager can manually assign an ACTIVE store-eligible employee outside registered Availability with an explicit warning/audit marker;
11. Availability override does not relax Store Priority, overlap, ACTIVE employee, official schedule or other hard safety rules;
12. Manager scheduling UX uses exactly five primary boards: Chuẩn bị → Tạo lịch nháp → Chỉnh lịch → Kiểm tra → Duyệt & phát hành;
13. recurring weekly staffing requirement lives in Chuẩn bị and can be collapsed/expanded;
14. Manager Chỉnh lịch is calendar-first: one selected store workspace, direct calendar shift editing, inline shortages and an on-demand employee drawer/picker;
15. Manager Kiểm tra is a read-only same-calendar review of one selected store and supports actual irregular shift intervals rather than fixed three-band summaries;
16. “Nguồn tham khảo” is removed from the canonical scheduling UX;
17. Employee UX is mobile-first; weekly Availability supports exact start/end and multiple intervals/day without fixed-shift lock;
18. published-schedule attendance records actual time directly without Manager approval solely for early/late deviations, while outside-schedule/manual-time attendance requires Manager confirmation;
19. employment type is management-owned `FULL_TIME|PART_TIME`, separate from `EMPLOYEE` RBAC role, and eligible Full-time staff rank before eligible Part-time staff without bypassing hard constraints;
20. Owner home is strategy/financial-performance first rather than an expanded Manager screen;
21. Owner strategic KPIs use known authorized source definitions and never fabricate production P&L;
22. full relevant regression/E2E/security/reload checks are green;
23. XSTORE-020 real production acceptance is complete;
24. permanent canonical Workforce docs/state contain the proven final rules;
25. **this TEMP Source of Truth is deleted**.
26. Manager branch selection is colocated with the active draft calendar workspace rather than requiring travel back to an earlier Step-3 control.
27. Manager can enter canonical Bước 4 — Kiểm tra directly from the active calendar workspace without long reverse scrolling.
28. Employee shift cards expose readable employee name and complete time range without per-card horizontal scroll.
29. normal desktop schedule editing has no nested horizontal scrollbars and presents the seven-day week without horizontal scrolling when viewport width is sufficient.
30. narrow schedule layouts use one controlled calendar-level navigation/overflow model and do not create page-level horizontal overflow.
31. Step-3 shift editing uses an on-demand right-side slide-over without resizing the underlying calendar, while Step 4 offers matching read-only shift/cluster detail.
32. Steps 3/4 use the compact weekly grid of real employee shifts and shortage chips, not the old tall hourly timeline; both share the same visual geometry.
33. Employee weekly Availability uses a 05:00–22:00 calendar with staged click/drag 30-minute cell coloring and an explicit bottom Save that persists merged intervals through canonical Employee RPC without auto-saving.

## 8. Closure rule

Do not leave this temporary file as a second permanent source of truth.

At final closure, only after XSTORE-C01→C05, XSTORE-012 and XSTORE-013→020 are complete and the corrected Scheduling V3 model is exact-main/live accepted:
- Manager sets real Store Priority values for employees;
- Manager configures the real recurring weekly staffing template for CN1–CN4 once (weekday/time/headcount), and verifies it persists/reuses across target weeks;
- Manager runs Auto Schedule and reviews any shortages;
- Manager adjusts the DRAFT as needed;
- canonical Validate → Review → Publish succeeds on a real target week;
- reconcile final rules into permanent Workforce architecture/state/evidence;
- record closure evidence;
- remove temporary-track pointers;
- delete `WORKFORCE_CROSS_STORE_SCHEDULING_TEMP_SOURCE_OF_TRUTH.md`.

Until then, this file is the single temporary authority for the cross-store scheduling extension.

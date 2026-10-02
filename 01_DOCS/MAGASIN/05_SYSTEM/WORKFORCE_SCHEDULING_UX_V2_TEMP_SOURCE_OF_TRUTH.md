# MAGASIN — Workforce Scheduling UX V2 — TEMP SOURCE OF TRUTH

**Track:** WORKFORCE_SCHEDULING_UX_V2  
**Task prefix:** SCHED-UI  
**Lifecycle:** TEMPORARY — delete this file only after SCHED-UI-009 closes and permanent acceptance exists.  
**Owner report date:** 2026-10-02  
**Status:** SCHED-UI-000 BLOCKED / OWNER DESIGN SESSION REQUIRED / SCHED-UI-001→009 BLOCKED BY ORDER

## 0. Authority and precedence

This TEMP SOT owns only the Scheduling UX V2 correction track described here.

It does **not** replace:

1. `WORKFORCE_CROSS_STORE_SCHEDULING_TEMP_SOURCE_OF_TRUTH.md`
   - owns XSTORE scheduling business authority, recurring staffing authority, Store Priority semantics, Auto Schedule business behavior and XSTORE-011 real-data acceptance;

2. `PRODUCTION_RELEASE_GOVERNANCE_V1_SOURCE_OF_TRUTH.md`
   - owns Preview/Staging, Owner approval, exact RC freeze, 00:00 Asia/Ho_Chi_Minh release window, rollback and production-smoke rules;

3. existing Auth / Employee Registration / Workforce canonical authorities outside this UX scope.

If this UX SOT conflicts with XSTORE business semantics, XSTORE wins.

If this UX SOT conflicts with production-delivery rules, Production Release Governance wins.

This track may change presentation, navigation, visual hierarchy and route presentation. It must not invent new staffing/business authority.

## 1. Why this track exists

The Owner reviewed the live Scheduling experience on 2026-10-02 and identified six production UX problems.

### Owner issue 1 — recurring staffing time blocks are hard to read

Current recurring staffing cells are too narrow.

Observed problems:

- start/end time values are visually truncated;
- controls are crowded;
- start/end/headcount/delete do not scan as one clear row;
- multiple time blocks in one day become difficult to read quickly.

Required outcome:

A Manager/Owner can read each staffing block immediately as:

`Bắt đầu → Kết thúc → Số người → Xóa`

without clipped time text or ambiguous controls.

### Owner issue 2 — Auto Schedule flow is visually confusing

The current Auto Schedule area exposes too many status cards/actions at once.

The user cannot quickly answer:

- What step am I on?
- What must I do first?
- Why is Auto Schedule unavailable?
- What is the single next action?
- When am I editing a draft versus checking versus approving/publishing?

Required outcome:

Scheduling must behave like a guided workflow with one clearly dominant next action and explicit prerequisites.

### Owner issue 3 — employee schedule does not visibly share the time-band system

Manager and Employee schedule-related surfaces are not visually consistent enough.

The Owner currently requests time bands described as:

- 06:00–12:00;
- 12:00–17:00;
- 17:00–22:00.

However, the previously accepted WUI rule used:

- 05:00–12:00;
- 12:00–17:00;
- 17:00–22:00.

This is an **intentional unresolved design/business presentation boundary**.

Do not guess the 05:00–06:00 treatment.

SCHED-UI-000 must obtain an explicit Owner decision and then define one shared rule for Manager + Employee + Owner.

### Owner issue 4 — Employee availability registration is too easy to miss

The current “Đăng ký thời gian có thể làm” experience is visually secondary and may require scrolling/searching.

Required outcome:

Employees should immediately see:

- whether next-week registration is open;
- the target week;
- whether they have registered;
- one clear CTA to register or edit;
- the weekly status without needing to hunt through the page.

### Owner issue 5 — production URL exposes internal numbered directories

Visible URLs such as:

- `/06_EMPLOYEE/`;
- `/05_MANAGER/`;
- `/04_OWNER/`;

look like implementation structure rather than production product routes.

Required outcome:

Expose professional canonical role routes without numeric/internal folder prefixes.

Candidate route family to be confirmed in SCHED-UI-000:

- `/employee/`;
- `/manager/`;
- `/owner/`.

Old numbered paths must remain compatible/redirected until route regression proves the new canonical paths are safe.

### Owner issue 6 — Owner scheduling view must be synchronized

Owner scheduling presentation must use the same scheduling language and visual system as Manager/Employee where the underlying semantics are the same.

Required outcome:

Owner sees the same:

- shift/time-band meaning;
- workflow-state language;
- week/date presentation;
- published/draft distinction;
- scheduling visual hierarchy;

without creating a second scheduling authority.

## 2. Non-goals / hard safety boundaries

This UX track must not fabricate or decide:

- Store Priority values;
- real recurring staffing demand;
- staffing headcount;
- employee availability;
- draft schedule assignments;
- official schedules;
- payroll/attendance truth;
- real Owner/Manager business decisions.

Do not alter schema/RPC/RLS/business authority merely to simplify UI.

If a UX requirement cannot be implemented safely without changing business authority:

`STATUS=BLOCKED`

and return to the relevant business SOT.

Do not perform Owner-visible production changes directly on `main`.

Do not use production as the first visual acceptance environment.

## 3. Design-first rule

The Owner explicitly chose:

1. **Cách A first:** create the authoritative implementation plan;
2. **Cách B second:** review/propose the actual visual redesign.

Therefore no product task SCHED-UI-001 or later may execute before SCHED-UI-000 is completed.

SCHED-UI-000 is the design-lock session corresponding to “Cách B”.

The design lock must define the visible behavior before robot implementation starts.

## 4. Planned product architecture

The implementation should converge on:

### Manager

- recurring staffing editor optimized for readable weekly scanning;
- guided scheduling workflow;
- prerequisites shown near the action they block;
- one primary action per step;
- consistent time-band visuals.

### Employee

- schedule/availability hierarchy that makes next-week availability registration immediately visible;
- same shift-color semantics as Manager/Owner;
- professional canonical URL.

### Owner

- shared scheduling visual vocabulary;
- oversight/editing surfaces aligned with Manager semantics;
- no duplicate scheduling truth.

### Routing

Visible browser routes should be separated from implementation folder names.

The underlying repository may retain internal numbered directories if required for compatibility, but the user-facing route should not expose those names after SCHED-UI-005 is accepted.

## 5. Task order and authoritative state

Tasks execute strictly in this order:

`SCHED-UI-000 → 001 → 002 → 003 → 004 → 005 → 006 → 007 → 008 → 009`

Only one task may execute per robot/chat execution turn unless this SOT explicitly changes that rule.

| Task | Scope | Required result | Current state |
|---|---|---|---|
| SCHED-UI-000 | Owner design lock / Cách B | Visual hierarchy, time-band boundary, canonical route naming and cross-role scheduling presentation explicitly approved | **BLOCKED / OWNER DESIGN SESSION REQUIRED** |
| SCHED-UI-001 | Recurring staffing block legibility | Full readable start/end/headcount controls; no clipped times; stable add/remove/save behavior preserved | **BLOCKED BY SCHED-UI-000** |
| SCHED-UI-002 | Guided Auto Schedule workflow | Clear step flow, explicit prerequisites, one dominant next CTA, reduced status noise | **BLOCKED BY ORDER** |
| SCHED-UI-003 | Shared time-band visual system | Manager + Employee + Owner use the one Owner-approved boundary/color contract | **BLOCKED BY ORDER** |
| SCHED-UI-004 | Employee availability CTA prominence | Registration state/week/action visible and prominent on Employee schedule | **BLOCKED BY ORDER** |
| SCHED-UI-005 | Professional canonical routes | New clean role URLs with safe compatibility redirects and route regression | **BLOCKED BY ORDER** |
| SCHED-UI-006 | Owner scheduling parity | Owner scheduling visuals/state language aligned without new scheduling authority | **BLOCKED BY ORDER** |
| SCHED-UI-007 | Integrated Preview + cross-role QA | Exact candidate available in Preview/Staging; required QA green; no production mutation | **BLOCKED BY ORDER** |
| SCHED-UI-008 | Owner acceptance + RC freeze + midnight release | Owner approves exact RC SHA; rollback recorded; release only in approved 00:00 window | **BLOCKED BY SCHED-UI-007 / OWNER APPROVAL / RELEASE WINDOW** |
| SCHED-UI-009 | Production smoke + permanent acceptance + TEMP cleanup | Exact-main green; permanent evidence written; this TEMP SOT deleted | **BLOCKED BY SCHED-UI-008** |

## 6. SCHED-UI-000 — Owner design lock / Cách B

This task is intentionally interactive.

Do not let a robot invent the final design.

Required Owner decisions:

### A. Recurring staffing row design

Lock:

- card/row structure;
- minimum readable width for time controls;
- labels for `Bắt đầu`, `Kết thúc`, `Số người`;
- add/remove interaction;
- desktop/mobile presentation;
- how multiple blocks in one day stack.

### B. Guided Auto Schedule layout

Lock the exact flow and information hierarchy for:

1. staffing prerequisites;
2. draft creation;
3. Manager editing;
4. conflict validation;
5. review/approval;
6. publish.

Decide what is:

- primary CTA;
- secondary CTA;
- status only;
- blocking warning;
- expandable detail.

### C. Time-band rule

Resolve the explicit conflict:

Prior accepted:
- `05:00 <= start < 12:00` morning.

Latest Owner request:
- `06:00–12:00` morning.

Owner must state what happens to a shift starting from `05:00` to before `06:00`.

After lock, one rule must be used everywhere.

### D. Employee registration prominence

Lock:

- top-of-page placement;
- card/banner design;
- registration-open badge;
- target-week display;
- CTA wording;
- completed/empty/closed states.

### E. Canonical URLs

Confirm the visible route names.

Default proposal:

- `/employee/`;
- `/manager/`;
- `/owner/`.

Do not cut over until Owner confirms route naming.

### F. Owner scheduling presentation

Lock what Owner sees versus Manager:

- shared components;
- read/edit actions;
- oversight-only information;
- what must remain role-specific.

### Required durable artifact

Create:

`01_DOCS/MAGASIN/05_SYSTEM/WORKFORCE_SCHEDULING_UX_V2_DESIGN_LOCK.md`

SCHED-UI-000 becomes DONE only after Owner-approved decisions are recorded there.

## 7. SCHED-UI-001 — Recurring staffing block legibility

Scope:

- Manager recurring staffing weekly board;
- Owner equivalent if it uses the same editor component.

Required acceptance:

- start time fully visible;
- end time fully visible;
- headcount fully visible;
- labels or structure make each field unambiguous;
- delete control cannot be mistaken for another input;
- no horizontal clipping at supported widths;
- multiple blocks stack predictably;
- existing values are preserved when adding/removing another block;
- new block still starts with blank start/end values;
- no regression to the historic empty → 05:00 bug;
- save/reload/week reuse still passes.

No business-value creation is allowed for visual acceptance.

## 8. SCHED-UI-002 — Guided Auto Schedule workflow

Replace the current visually noisy presentation with the Owner-approved guided workflow from SCHED-UI-000.

Required acceptance:

- user always knows the current step;
- one clearly dominant next action;
- disabled actions explain why;
- prerequisites are adjacent to the blocked action;
- “Ưu tiên cửa hàng”, “Nhu cầu nhân sự”, draft state and publish state are not mixed as equal competing cards;
- draft/edit/check/review/publish are visually distinct;
- no technical implementation terms in normal user copy;
- existing XSTORE business semantics remain unchanged;
- no Auto Schedule call executes without required business inputs.

## 9. SCHED-UI-003 — Shared time-band visual system

Apply one approved time-band classification to scheduling-relevant surfaces across:

- Manager recurring staffing;
- Manager draft scheduling;
- Manager official schedule;
- Manager four-store overview;
- Employee published schedule;
- Employee availability registration where a registered time block is visualized;
- Owner scheduling/oversight surfaces.

Required acceptance:

- one helper/contract where practical instead of divergent role-local rules;
- same time → same visual meaning across roles;
- neutral state for empty/invalid start time;
- boundary tests include the Owner-approved 05:00/06:00 decision, 12:00 and 17:00;
- accessibility/contrast remains readable.

Do not execute until SCHED-UI-000 resolves the morning boundary.

## 10. SCHED-UI-004 — Employee availability CTA prominence

Required acceptance:

- Employee can see next-week registration state without hunting through the page;
- target week is visible;
- open/closed registration status is visible;
- primary CTA is visually dominant;
- registered state changes CTA to an edit/review action;
- weekly registration summary remains visible;
- mobile layout keeps the CTA reachable;
- the UI clearly distinguishes “thời gian có thể làm” from “lịch làm chính thức”;
- no employee availability authority change.

## 11. SCHED-UI-005 — Professional canonical routes

Goal:

Hide numbered implementation directories from the user-facing URL.

Required acceptance:

- Owner-approved canonical role URLs exist;
- role entrypoints and deep links resolve correctly;
- old numbered paths remain safe compatibility redirects during cutover;
- no redirect loops;
- Auth role routing targets canonical user-facing paths;
- Manager/Employee/Owner internal navigation uses canonical paths;
- reload/direct-link/back-forward behavior passes;
- production entrypoints remain fail-closed for unauthorized roles;
- Pages deployment supports the route shape;
- old compatibility paths may be removed only after route evidence proves they are no longer required.

This task changes route presentation, not role authority.

## 12. SCHED-UI-006 — Owner scheduling parity

Required acceptance:

- Owner scheduling uses the same approved time-band contract;
- same scheduling states use the same Vietnamese labels;
- week navigation/date representation is consistent;
- published/draft/review concepts are not redefined for Owner;
- Owner does not create a parallel scheduling writer;
- XSTORE remains the business-authority source;
- role-specific Owner oversight may remain richer than Manager, but shared concepts must look and mean the same.

## 13. SCHED-UI-007 — Integrated Preview + cross-role QA

This is the first full integrated candidate.

Requirements:

- non-production release branch;
- real Preview/Staging URL or equivalent isolated browser target;
- exact candidate SHA recorded;
- no production business mutation merely for Preview;
- fixture/mock/staging data used where needed;
- Manager + Employee + Owner reviewed together;
- desktop/mobile responsive checks;
- route checks;
- time-band boundary checks;
- recurring editor regression;
- Auto Schedule guided-flow regression;
- Employee availability CTA regression.

Required gates where path-relevant include:

- Validate MAGASIN GitHub Pages source;
- UI2 Cross Role Acceptance;
- People Shift Day-10 Tests;
- SOP Task Tests;
- AUTH-PROD Regression Contract;
- Auth Password Reset Hotfix;
- Owner Control Tower Tests;
- Procurement QA Robot if affected;
- domain-specific XSTORE regression.

Do not merge the product candidate to `main` in this task.

Successful result:

`PREVIEW_READY / OWNER_REVIEW`

## 14. SCHED-UI-008 — Owner acceptance + RC freeze + midnight release

This task is governed by:

`PRODUCTION_RELEASE_GOVERNANCE_V1_SOURCE_OF_TRUTH.md`

Before release:

- Owner has inspected Preview;
- all requested corrections are complete;
- exact RC SHA is frozen;
- required QA is green;
- current production rollback SHA is recorded;
- release packet exists;
- release window is 00:00 Asia/Ho_Chi_Minh unless Owner explicitly authorizes another window in that release conversation.

If Owner requests another change:

`STATUS=BLOCKED / CHANGES_REQUESTED`

and return to Preview; previous approval is invalid.

At release:

- verify RC SHA unchanged;
- merge exact approved candidate with expected-head guard where supported;
- do not bundle unreviewed changes.

## 15. SCHED-UI-009 — Production smoke + closure

After production deployment:

- verify exact-main SHA;
- Pages source validation green;
- Pages deployment green;
- affected cross-role gates green;
- smoke Manager scheduling;
- smoke Employee schedule/availability;
- smoke Owner scheduling;
- verify canonical routes;
- verify old compatibility routes behave as designed;
- verify no console/page/request/5xx regression;
- verify no unexpected business mutation.

Create permanent acceptance:

`01_DOCS/MAGASIN/05_SYSTEM/WORKFORCE_SCHEDULING_UX_V2_ACCEPTANCE_2026_10_02.md`

Permanent evidence must record:

- the six Owner-reported problems;
- final Owner-approved design decisions;
- final time-band rule;
- canonical routes;
- Preview/RC SHA;
- Owner acceptance;
- rollback SHA;
- production merge SHA;
- workflow/run IDs;
- production-safe smoke evidence;
- confirmation that XSTORE business authority was not replaced.

Then:

1. reconcile any durable rule into canonical Workforce docs if required;
2. delete this TEMP SOT in the same closure PR;
3. verify permanent evidence exists on `main`;
4. verify this TEMP SOT no longer exists;
5. verify XSTORE SOT remains authoritative for XSTORE-011 unless that separate track has independently closed.

## 16. Robot execution protocol

For task discovery:

- re-read this file from the beginning;
- use this SOT as the sole task-state authority for WORKFORCE_SCHEDULING_UX_V2;
- also read Production Release Governance before any Preview/RC/release task;
- read XSTORE SOT before any change that could affect scheduling business semantics.

Do not select a task that is blocked by order.

Do not execute a different task from the requested task ID.

Before declaring a product task complete:

- verify concrete code/browser evidence;
- update this SOT;
- use branch → PR;
- do not merge production-impacting product work to `main` before SCHED-UI-008.

Documentation-only SOT/evidence updates may follow the release-governance documentation exception.

## 17. Current authoritative next state

Cách A is complete when this TEMP SOT is merged and indexed.

Current product execution state after plan creation:

`SCHED-UI-000 BLOCKED / OWNER DESIGN SESSION REQUIRED`

Reason:

The Owner explicitly wants Cách B after Cách A, and Cách B must resolve the visual design and the 05:00 versus 06:00 morning boundary before robot implementation.

Do not execute SCHED-UI-001 or later until SCHED-UI-000 is DONE.

# TASK-019 — People / Shift Current-System Gap Review + Acceptance Contract

**Status:** DAY-10 GATE PASSED  
**Date:** 2026-09-18  
**Milestone:** Day 8–10 People / Shift.

## 1. Question

What is the smallest verified delta required to satisfy the V1 People / Shift slice without rebuilding working Workforce functionality or inventing new business rules?

## 2. Evidence boundary

This review uses repository evidence only.

Existing verified implementation:

- Owner Workforce Demand: store/week staffing demand add/edit/delete through `get_workforce_staffing_requirements`, `upsert_workforce_staffing_requirement` and `delete_workforce_staffing_requirement`.
- Owner Workforce Review: employee weekly availability review, time edit and store-transfer request/review.
- Owner Workforce Publish: generation → review → publish workflow using the existing schedule-generation RPC surface.
- Employee: availability registration, approved schedule, attendance and shift-swap engines already exist.
- Staffing-demand templates and automatic schedule generation are source-controlled in database migrations.
- `auto_generate_schedule_generation` already defines shortage semantics: a requirement is short when assigned headcount is below `minimum_headcount`.
- Owner Control Tower already exposes unresolved Workforce attention, but deliberately keeps staffing gap as `—` because no verified read-only shortage adapter exists.
- Existing browser E2E covers Control Tower navigation and fail-closed behavior, not the actual People / Shift operating flow.
- Several Workforce RPCs consumed by active clients are live-schema dependencies not fully reproduced by the current migration folder; therefore no production schema rewrite is justified by this task.

## 3. Five-step scope reduction

### Question

The Day 8–10 slice must prove that the current People / Shift system can surface staffing gaps and complete the existing scheduling flow safely.

### Delete

Do not rebuild:

- Owner Demand / Review / Publish UI;
- Employee availability / schedule / attendance / swap UI;
- scheduling policy;
- transfer policy;
- payroll;
- KPI scoring;
- recruitment;
- Manager portal architecture.

### Simplify

Use existing read RPCs and existing generation semantics. Add only the missing read-side staffing-gap calculation and deterministic QA.

### Accelerate

Implement the gap reader as a pure/read-only adapter first, integrate it into the Control Tower second, then run a browser E2E gate across the existing People / Shift flow.

### Automate

Automate only read-side shortage calculation and QA. Existing schedule generation/review/publish remains the owning workflow.

## 4. Verified gaps

### GAP-PS-01 — Staffing gap has no verified read-only adapter

The scheduler computes `minimum_shortages` during generation, but that result is transient. The Control Tower adapter currently returns `staffingGapCount: null`.

Required delta:

- derive shortage count from existing read RPCs;
- mirror the existing generation shortage rule;
- never invoke schedule-generation/review/publish writes;
- return no numeric gap when the required source set is unavailable.

### GAP-PS-02 — No Day-10 People / Shift browser E2E

Current browser E2E proves the Control Tower only.

Required delta:

- deterministic browser test for the existing Owner Workforce and Employee scheduling surfaces;
- sanitized/mocked data only;
- verify availability → generation/review/publish → approved schedule visibility at the contract level;
- verify no unexpected console/page/network errors;
- do not touch production.

### GAP-PS-03 — Live Workforce RPC surface is not fully reproducible from current migrations

Active frontend code calls read/write RPCs whose definitions are not all present in the source-controlled migration directory.

Required handling:

- treat those RPCs as existing live-schema dependencies for V1;
- add no speculative production migration;
- record the dependency in tests/docs;
- any production schema replacement/backfill remains a separate YELLOW action requiring live-schema inventory and Owner approval.

This is not a blocker for read-only adapter and mocked E2E work.

## 5. Acceptance contract for Day 8–10

The People / Shift slice is accepted when:

1. Existing Owner and Employee Workforce engines remain the owning workflows; no duplicate module is created.
2. Staffing-gap logic reuses the existing `minimum_headcount` shortage semantics.
3. A pure/read-only adapter can calculate gap count from staffing requirements + selected schedule-generation assignments.
4. Selection of a generation mirrors the current Publish engine: first DRAFT/REVIEWED row returned, otherwise first row.
5. Missing generation/source/error never becomes a fabricated zero.
6. Control Tower displays a staffing-gap count only when the read-side source is verified; otherwise it remains fail-closed.
7. Workforce source failure remains section-local and does not blank other Control Tower sections.
8. Adapter tests prove no write RPC is called.
9. Browser E2E verifies the existing People / Shift flow with sanitized mocks and no production writes.
10. Existing Owner Control Tower regression/E2E remains green.
11. No new scheduling, transfer, attendance, payroll or KPI business rule is introduced.
12. Production schema changes are not applied as part of this slice.

## 6. Minimal implementation queue

- **TASK-020 — Staffing-gap read adapter + unit/regression contract**
  - Read-only.
  - Gate: unit tests + forbidden-write assertion.
- **TASK-021 — Control Tower staffing-gap integration**
  - Extend existing Workforce attention adapter only.
  - Gate: adapter/integration regression + Control Tower browser E2E.
- **TASK-022 — People / Shift browser E2E + Day-10 usability gate**
  - Exercise existing Owner/Employee flow with deterministic mocks.
  - Gate: browser E2E + regression + state/docs update.

No additional Day 8–10 task is opened unless one of these tests reveals a reproducible defect.

## 7. Deferred / explicitly out of scope

- Manager Workforce refactor.
- Full payroll.
- Employee KPI.
- Recruitment.
- New shift-allocation policy.
- Production schema cleanup/rebaseline.
- Production migration/backfill.
- Attendance redesign.
- Shift-swap redesign.

## 8. TASK-019 gate result

**PASS — current system inventory, verified gaps and minimal implementation queue are defined.**

No Owner decision is required before TASK-020.

## 9. Day-10 closure — TASK-020 to TASK-022

**Result: PASS.**

- GAP-PS-01 is closed by TASK-020/TASK-021: staffing-gap read adapter is read-only, mirrors the existing `minimum_headcount` shortage semantics, fails closed on missing source, and is integrated into Control Tower with section-local isolation.
- GAP-PS-02 is closed by TASK-022: deterministic Playwright browser E2E loads the canonical Owner Publish, Employee Availability and Employee Schedule engines against sanitized in-memory mocks.
- Verified browser sequence uses the same target week: employee next-week availability save → Owner next-week generation `DRAFT` → review `REVIEWED` → publish `PUBLISHED` → Employee navigates to that week and sees the approved schedule.
- Browser diagnostics: unexpected console errors 0; page errors 0; request failures 0; HTTP 5xx 0; external network requests 0.
- Existing Owner Control Tower unit/regression and browser E2E remain green.
- GAP-PS-03 remains a documented deferred live-schema reproducibility dependency; no speculative production migration/backfill was applied.
- No new scheduling, transfer, attendance, payroll or KPI business rule was introduced.
- `BUG-PS-001` was reproduced by hardening the E2E to a same-week contract: Employee Schedule had no week navigation even though availability registration targets next week and Owner Publish can publish that week. The existing schedule engine was minimally fixed with previous/current/next week navigation and the browser regression passes.
- No unresolved reproducible defect remains, so no additional Day 8–10 task is opened.

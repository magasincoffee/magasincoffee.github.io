# TASK-019 — People/Shift Current-System Gap Review + Acceptance Contract

**Status:** ACCEPTANCE DEFINED  
**Date:** 2026-09-18  
**Milestone:** Day 8–10 People / Shift slice.

## 1. Question

What is the smallest People/Shift slice that can be accepted from the system already in the repository, and which verified gaps must be closed without rebuilding working Workforce flows or inventing new HR/KPI rules?

## 2. Evidence boundary

This review uses repository evidence only. It does not claim that the source-controlled migrations reproduce the live Supabase database.

Verified current surfaces:

- active account identity and role/status live in the existing profile/auth model;
- Employee has working engines for availability registration, approved schedule, shift swap and attendance;
- Manager/Owner can read weekly availability;
- Owner Workforce can define recurring staffing demand, review/edit registrations, request/approve store transfers, generate a schedule, review it and publish it;
- the current generator considers availability, store scope, constraints, skills and existing schedules;
- the generator already defines a shortage when assigned headcount is below `minimum_headcount`;
- published schedules are readable by Employee;
- Control Tower currently reads pending transfers and unpublished generations, but intentionally returns `staffingGapCount: null`;
- the repository database baseline is partial, so new production DDL/backfill remains outside this review.

## 3. Current-system inventory

| Area | Verified implementation | Day 8–10 disposition |
|---|---|---|
| Employee identity/access | Shared auth/profile role + status; Owner Access can list accounts | REUSE for basic identity; not a full HR master |
| Availability | `get_my_availability`, `save_my_availability`; Employee weekly registration UI | REUSE |
| Manager review | `get_manager_weekly_availability`; review/edit + transfer flow | REUSE |
| Staffing demand | recurring weekday templates + `get/upsert/delete_workforce_staffing_requirement` | REUSE |
| Auto scheduling | `auto_generate_schedule_generation` with availability/constraint/skill checks | REUSE |
| Schedule review/publish | generation list/assignments + review + publish workflow | REUSE |
| Employee schedule | `list_my_approved_schedules_v2` | REUSE |
| Shift swap | Employee swap engine and RPCs | KEEP, but not a blocker for Day 8–10 |
| Attendance | Employee attendance engine and RPCs | KEEP, but not expanded in this slice |
| People roster | Manager shell contains prototype/static staff data; Owner Access is an access-management screen | GAP — needs a trusted minimal read surface |
| Staffing gap | shortage exists only in generation-time result; no stable read model consumed by Control Tower | GAP — needs a trusted read model |
| Browser E2E | Control Tower E2E mocks Workforce attention; no dedicated People/Shift flow gate | GAP |

## 4. Verified defects found during review

### 4.1 Manager Workforce direct route drift

`/05_MANAGER/Workforce/` still referenced removed root paths `/manager-v13-runtime.html` and `/employee/`.

The numbered canonical paths are:

- Manager runtime: `/05_MANAGER/runtime/manager-runtime-v1.html`
- Employee entry: `/06_EMPLOYEE/`

TASK-019 repairs this route and adds a regression assertion.

### 4.2 Workforce color documentation drift

The old top-level color note described availability-status colors. The current canonical Workforce module uses time-of-day shift classification:

- 05:00–11:59 — Sáng
- 12:00–16:59 — Trưa/chiều
- 17:00–23:59 — Tối

TASK-019 aligns the top-level note with the current canonical module and leaves historical copies only under `99_LEGACY`.

## 5. Five-Step scope reduction

### Question

Day 8–10 must answer four operational questions:

1. Who is an active employee available to the system?
2. When can each employee work?
3. What staffing is required and where is the verified shortage?
4. What schedule has been reviewed/published and what does each employee see?

### Delete

Do not build in this slice:

- payroll;
- recruitment;
- performance scoring/KPI;
- Academy progress scoring;
- disciplinary scoring;
- full HR records;
- advanced leave management;
- forecasting;
- new shift-swap or attendance semantics;
- a second scheduling engine.

Static prototype KPI, Academy, headcount and revenue numbers in the Manager shell are not accepted as business truth.

### Simplify

Reuse the existing profile/auth, availability, demand and generation/publish flows. Add only the missing trusted read surfaces and E2E gate.

### Accelerate

Close verified gaps in three bounded implementation tasks.

### Automate

Automate read-only People/Shift summaries and deterministic tests only after source semantics are explicit.

## 6. Staffing-gap semantics for V1

The existing scheduling generator is the evidence source for shortage semantics.

For V1:

`minimum staffing gap = max(minimum_headcount - qualified_assigned_headcount, 0)`

A gap is reported only for an active staffing requirement and only when the assigned workers satisfy the same store/time/skill boundary used by the scheduling flow.

Important:

- do not silently reinterpret `target_headcount` as the shortage threshold;
- current Owner Demand UI intentionally writes one requested quantity to minimum/target/maximum, so the three values are often equal today;
- if source rows or schedule/generation state are incomplete, return `GAP/ESTIMATE` rather than a fabricated zero;
- a stable read model must work after page reload; it must not depend only on the transient JSON returned by the Generate button.

## 7. Minimal People roster contract

Day 8–10 requires only a trusted operational roster, not HR.

Minimum safe fields:

- stable employee/profile id;
- display name / username;
- role;
- active/inactive status;
- store scope only when a verified source exists.

Do not expose or invent KPI, Academy score, salary, private HR notes or unverified branch assignment.

Manager access must remain store/access scoped. Owner may use the existing broader access convention.

## 8. Acceptance criteria

The Day 8–10 People/Shift slice is usable when:

1. `/05_MANAGER/Workforce/` opens the canonical numbered Manager runtime and activates Workforce; STAFF/EMPLOYEE is redirected to `/06_EMPLOYEE/`.
2. Employee can load and submit next-week availability through the existing availability contract.
3. Manager/Owner can read weekly registrations within authorized store scope.
4. Owner can maintain staffing demand using the existing recurring template contract.
5. A trusted minimal People roster replaces any People decision that would otherwise rely on static prototype staff rows.
6. Auto-generation continues to use existing availability/constraint/skill/store checks.
7. Staffing gap is readable after reload with explicit source/quality metadata and uses the existing `minimum_headcount` shortage boundary.
8. Owner can generate → review → publish; Employee can read the resulting approved schedule.
9. Missing/partial People or staffing sources fail closed; no synthetic employee count/KPI/coverage value is presented as ACTUAL.
10. Role/store access boundaries are preserved.
11. Desktop and narrow-width browser E2E covers the core People/Shift path with sanitized fixtures and no production writes.
12. Existing shift-swap/attendance behavior is not regressed.
13. No production migration/backfill is bundled into the Day 8–10 acceptance gate.

## 9. Minimal implementation queue

- **TASK-020 — Trusted People roster read adapter + prototype-data guard**  
  Build the smallest scoped read adapter for operational employee identity/status and ensure active People surfaces do not treat Manager-shell sample staff/KPI data as truth.

- **TASK-021 — Staffing-gap read model + Control Tower integration**  
  Expose stable minimum-headcount shortage with source quality; connect the verified result to Workforce/Control Tower without changing scheduling rules.

- **TASK-022 — People/Shift integration + browser E2E + Day-10 gate**  
  Verify availability → review/demand → generation/review/publish → employee schedule, access denial, partial-source behavior, responsive layout and regression of swap/attendance entry points.

No broader People/HR queue is opened until these three tasks produce field evidence.

## 10. TASK-019 gate result

**PASS — current-system inventory, verified gaps and acceptance are defined.**

No Owner business decision is required before TASK-020. Production schema apply remains a separate approval boundary if a later task proves it necessary.

# XSTORE-007→010 — Staffing Requirement + Auto Schedule DRAFT — Acceptance Evidence

**Date:** 2026-09-29  
**Track:** WORKFORCE_CROSS_STORE_SCHEDULING_V1  
**Executable main:** `2429183e30dcc3760327e70a3e8a62019d13d2b0`  
**Status:** IMPLEMENTED / EXACT-MAIN REGRESSION GREEN / REAL BUSINESS CONFIGURATION PENDING

## Implemented

### XSTORE-007 — Staffing Requirement rule

The business rule is now explicit and Manager-owned:

- Manager/Owner enters the real weekly staffing need;
- each row is `store + date + start + end + number of people needed`;
- the system does not infer or invent headcount;
- requirements are stored in `public.staffing_requirements` with `authority_source='XSTORE_V1'`;
- legacy staffing rows/templates are preserved but are not Robot authority;
- a complete Auto Schedule run requires at least one explicit XSTORE requirement for every active store in the Manager's scope.

Canonical RPCs:

- `list_cross_store_staffing_requirements_v1(date)`
- `replace_cross_store_staffing_requirements_v1(date,jsonb)`

### XSTORE-008 — Global Auto Schedule DRAFT

New canonical Robot RPC:

- `auto_generate_cross_store_schedule_v1(date,boolean,text)`

Properties:

- solves the shared workforce pool across the four stores in one week;
- uses Employee Availability;
- requires Employee Store Priority eligibility;
- sorts Store Priority from highest to lowest;
- avoids cross-store overlapping assignments;
- respects the existing maximum-two-assignments/day guard;
- respects configured max daily/weekly hours when employee constraints exist;
- creates/reuses canonical per-store DRAFT generations under the existing state machine;
- never reviews;
- never publishes;
- returns shortages when target headcount cannot be filled;
- refuses to overwrite existing DRAFT assignments without explicit Manager confirmation;
- refuses to run over REVIEWED/PUBLISHED or official schedules.

The legacy `auto_generate_schedule_generation` writer remains revoked for browser execution.

### XSTORE-009 — Manager review/edit/publish integration

The four-store master view now exposes:

- Staffing Requirement configuration;
- Auto Schedule;
- Robot result / shortage feedback;
- existing per-store editor links.

After Robot output, Manager still follows the canonical flow:

```text
AUTO DRAFT
→ Manager review/edit
→ Validate
→ Review
→ Publish
→ work_schedules
```

No second official schedule writer was introduced.

### XSTORE-010 — Regression

Exact-main checks on `2429183e30dcc3760327e70a3e8a62019d13d2b0`:

- People Shift Day-10 Tests — run `36498812008` — SUCCESS;
- UI2 Cross Role Acceptance — run `36498812066` — SUCCESS;
- Validate MAGASIN GitHub Pages source — run `36498811986` — SUCCESS;
- Pages build/deployment — run `36498811328` — SUCCESS;
- XSTORE four-store master browser E2E — PASS;
- new XSTORE staffing/Robot static contracts — PASS;
- legacy Workforce/SCHED/TASK-108 browser regressions remained green.

A browser QA finding where Robot-result badges disappeared after same-week master refresh was corrected before acceptance.

## Production reconciliation

After migration `xstore_007_009_staffing_auto_draft_v1`:

- ACTIVE STORE_MANAGER authority remains available;
- XSTORE requirement reader EXECUTE for authenticated: YES;
- XSTORE requirement writer EXECUTE for authenticated: YES, with internal role/store scope checks;
- XSTORE Auto Schedule EXECUTE for authenticated: YES, with internal role/store scope checks;
- legacy `auto_generate_schedule_generation` authenticated EXECUTE: NO;
- Store Priority rows: 0;
- XSTORE_V1 Staffing Requirement rows: 0;
- draft assignments: 0;
- official schedules: 0.

No real staffing values, employee priorities or schedules were fabricated during implementation.

## Remaining closure gate

XSTORE-011 cannot close yet because production still requires real Manager business input.

Required live sequence:

1. Manager configures Store Priority for real employees;
2. Manager enters real weekly staffing requirements for CN1–CN4;
3. Manager runs Auto Schedule on a real target week;
4. verify Robot output/shortages;
5. Manager manually reviews/edits;
6. validate/review/publish through the canonical path;
7. reconcile permanent Workforce docs;
8. delete the temporary Cross-Store Source of Truth.

Until those steps are accepted, the TEMP Source of Truth remains active.

# XSTORE-011 — Owner Input Blocker — 2026-10-01

**Track:** `WORKFORCE_CROSS_STORE_SCHEDULING_V1`  
**Task:** `XSTORE-011`  
**Status:** BLOCKED / OWNER INPUT REQUIRED

## Why XSTORE-011 cannot execute yet

XSTORE-011 requires a **real Manager-configured** end-to-end acceptance:

```text
Real Store Priority
+ Real recurring staffing configuration
+ Real weekly Availability
→ Auto Schedule DRAFT
→ Manager review/edit
→ Validate
→ Review
→ Publish
→ permanent-doc reconciliation
→ delete TEMP SOT
```

The first two inputs are management-owned business decisions and must not be inferred or fabricated.

## Live production preflight — 2026-10-01

Verified on `MAGASIN-NOIBO`:

- ACTIVE employees = 4;
- Store Priority rows = 0;
- employees with Store Priority = 0;
- ACTIVE stores = 4;
- recurring staffing rows = 0;
- stores with recurring staffing = 0;
- draft assignment rows = 0;
- official `work_schedules` rows = 0.

Real Availability does exist for the candidate week:

`2026-10-05 → 2026-10-11`

- Availability rows = 10;
- employees with Availability = 2.

Existing generation-run history includes one DRAFT run for week `2026-10-05`, but there are 0 generation assignments. This is not accepted as real staffing/business configuration and does not satisfy XSTORE-011.

## Required Owner / Manager business input

Before execution can resume, management must provide or enter in the live Manager UI:

### 1. Store Priority for each employee

For every employee participating in scheduling, management must set the ordered allowed-store list, for example:

```text
Employee A: CN3 > CN2 > CN4 > CN1
Employee B: CN1 > CN3
```

A store omitted from the list means NOT_ELIGIBLE.

The system must not infer this ordering from primary store, prior schedules, Availability, or legacy data.

### 2. Recurring weekly staffing configuration for CN1–CN4

Management must configure the real recurring demand:

```text
store + weekday + start_time + end_time + target_headcount
```

Example format only:

```text
CN1 · Monday · 07:00–12:00 · 2 people
```

The project must not infer headcount from historical schedules, legacy `staffing_requirement_templates`, date-bound `XSTORE_V1` rows, or Availability.

## What happens after Owner input

Once the two real business inputs above exist in production, XSTORE-011 can resume on a real target week and execute:

1. verify recurring configuration persists/reuses;
2. run Auto Schedule;
3. inspect shortages and DRAFT;
4. Manager review/edit as required;
5. Validate;
6. Review;
7. Publish;
8. verify `work_schedules` official truth;
9. reconcile permanent Workforce docs/state;
10. record closure evidence;
11. remove temporary pointers;
12. delete `WORKFORCE_CROSS_STORE_SCHEDULING_TEMP_SOURCE_OF_TRUTH.md`.

## Safety boundary

No Store Priority, staffing demand, draft assignment, or official schedule was fabricated during this XSTORE-011 attempt.

The TEMP SOT must remain in place until the real business configuration and publish acceptance are complete.

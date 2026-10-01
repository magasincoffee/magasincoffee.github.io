# XSTORE-C03 — Manager Recurring Weekly Staffing Board — Acceptance Evidence

**Date:** 2026-10-01  
**Track:** `WORKFORCE_CROSS_STORE_SCHEDULING_V1`  
**Task:** `XSTORE-C03`  
**Status:** DONE / EXACT-MAIN GREEN

## Implemented

Manager staffing input was changed from the superseded date-bound row editor to the Owner-approved recurring weekly operating board.

Canonical Manager surface:

`05_MANAGER/Workforce/cross-store-auto-schedule-v1.js`

The board now presents:

- CN1–CN4 as coherent store rows;
- Monday→Sunday columns (`T2..CN`);
- one or more recurring time blocks per store/day;
- visible `start_time → end_time → target_headcount`;
- explicit edit/cancel/save flow;
- no calendar date selector;
- no per-week staffing re-entry requirement.

Recurring staffing browser authority is exclusively:

- `list_workforce_recurring_staffing_requirements_v1()`;
- `replace_workforce_recurring_staffing_requirements_v1(jsonb)`.

Save payload contains only:

```text
store_id
day_of_week
start_time
end_time
target_headcount
```

The Manager UI does not send `work_date` or `p_week_start` for recurring staffing configuration.

## Transition safety before XSTORE-C04

XSTORE-C03 does not implement Robot recurring projection.

To avoid running the historical date-bound Robot path against a new recurring Manager truth, Auto Schedule is intentionally fail-closed/disabled until XSTORE-C04.

During C03:

- Manager can view/edit/save recurring staffing requirements;
- UI does not call `list_cross_store_staffing_requirements_v1`;
- UI does not call `replace_cross_store_staffing_requirements_v1`;
- UI does not call `auto_generate_cross_store_schedule_v1`;
- Robot publication remains impossible from this surface;
- `work_schedules` remains the sole official published schedule truth.

## QA coverage

Updated/added coverage:

- `09_QA/people-shift/xstore-auto-schedule-v1.test.mjs`;
- `09_QA/people-shift/xstore-cross-store-browser-fixture.html`;
- `09_QA/people-shift/xstore-cross-store-browser.mjs`.

Browser qualification verifies:

- four-store recurring board exists;
- Monday→Sunday columns render;
- recurring blocks render by store/day;
- edit/save changes recurring headcount;
- save payload has `day_of_week` and no `work_date`;
- save request has no `p_week_start`;
- old date-bound staffing RPCs are not called;
- Auto Schedule is disabled until C04;
- no legacy or publication writer is called.

## Pull request and qualification

Implementation PR:

- PR #356 — **MERGED**
- PR head: `0ab23a8ba98fadc07e9d5059d85fd219712f51bf`
- merge / executable main: `12fda81c2209837bc649e8755b92198449b3c749`

PR/branch qualification:

- UI2 Cross Role Acceptance PR run `36850819860` — **SUCCESS**;
- People Shift Day-10 Tests PR run `36850820074` — **SUCCESS**;
- UI2 Cross Role Acceptance branch run `36850788143` — **SUCCESS**;
- People Shift Day-10 Tests branch run `36850788160` — **SUCCESS**.

Exact-main qualification on `12fda81c2209837bc649e8755b92198449b3c749`:

- Validate MAGASIN GitHub Pages source run `36851309700` — **SUCCESS**;
- UI2 Cross Role Acceptance run `36851309494` — **SUCCESS**;
- People Shift Day-10 Tests run `36851309615` — **SUCCESS**;
- Pages build and deployment run `36851308669` — **SUCCESS**.

## Completion result

XSTORE-C03 is complete and exact-main green.

The next authoritative task is **XSTORE-C04 — Auto Schedule recurring projection**.

XSTORE-C04 owns Robot projection/cutover only; XSTORE-C05 remains the regression/production-safe correction acceptance gate.

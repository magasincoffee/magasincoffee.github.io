# XSTORE-C05 — Recurring Staffing Regression + Production-Safe Acceptance

**Date:** 2026-10-01  
**Track:** `WORKFORCE_CROSS_STORE_SCHEDULING_V1`  
**Task:** `XSTORE-C05`  
**Status:** DONE / EXACT-MAIN GREEN / PRODUCTION-SAFE ACCEPTANCE

## Scope

XSTORE-C05 verifies the corrected recurring staffing model after XSTORE-C01→C04. It does not enter real business staffing demand, create official schedules, or execute XSTORE-011.

Acceptance scope:

- recurring staffing edit/save/read persistence;
- reuse of the same recurring configuration across target weeks;
- Robot projection into the selected calendar week;
- DRAFT-only behavior;
- browser reload/week-change regression;
- security/privilege cutover;
- full People Shift / UI2 / Pages exact-main qualification;
- no fabricated staffing or schedule business data.

## Repository regression implementation

PR #360 added acceptance-only QA coverage. Product logic and database schema were not changed.

Changed QA files:

- `09_QA/people-shift/xstore-c05-recurring-acceptance-v1.test.mjs`;
- `09_QA/people-shift/xstore-cross-store-browser-fixture.html`;
- `09_QA/people-shift/xstore-cross-store-browser.mjs`.

The browser regression proves:

- Manager recurring save payload remains week-independent and contains no `work_date`;
- edited recurring staffing survives browser reload in the acceptance fixture;
- the same recurring configuration is reused after changing from week `2026-10-05` to `2026-10-12`;
- Auto Schedule receives the selected week and `XSTORE_GLOBAL_RECURRING_V1`;
- superseded date-bound staffing RPCs are not called;
- publish/review RPCs are not called by the Auto Schedule surface.

## Production-safe transactional smoke

A live SQL smoke was executed against `MAGASIN-NOIBO` inside a single transaction using the existing ACTIVE `STORE_MANAGER` identity as the request JWT subject. The actor resolved as `STORE_MANAGER` and had access to all four ACTIVE stores.

The smoke inserted only temporary recurring staffing values inside the transaction and then executed `ROLLBACK`.

### Save/read/edit/read

Initial save:

- 4 stores;
- one Monday block per store;
- `09:00–10:00`;
- target headcount = 2.

Results:

- save requirement count = 4;
- read requirement count = 4.

Edit:

- exactly one store changed to target headcount = 3;
- remaining three stores stayed at target headcount = 2.

Results:

- edited row count = 1;
- unchanged row count = 3;
- read requirement count remained 4.

This verifies Manager edit/save/read semantics without persisting test business values.

### Same recurring configuration projected into two weeks

The same recurring configuration was projected into two distinct future Mondays:

- `2036-09-15`;
- `2036-09-22`.

For both target weeks:

- returned status = `DRAFT`;
- `staffing_authority = RECURRING_WEEKLY_V1`;
- `published = false`;
- generation count = 4;
- shortage count = 4;
- projected shortage dates matched the selected target Monday;
- no assignment rows were produced because no real Store Priority business data was fabricated.

Inside the transaction:

- 8 temporary generation runs were created across the two weeks;
- no `XSTORE_V1` date-bound staffing rows were materialized;
- no official `work_schedules` rows were created.

The transaction was then rolled back.

## Post-rollback production baseline

After `ROLLBACK`, live production was rechecked and returned to baseline:

- recurring staffing rows = `0`;
- date-bound `XSTORE_V1` staffing rows = `0`;
- schedule generation runs = `6` historical rows;
- schedule generation assignments = `0`;
- official `work_schedules` rows = `0`.

No test staffing, draft assignments or official schedules remain in production.

## Security / authority verification

Live production verification after C05:

- direct `authenticated` SELECT on `workforce_recurring_staffing_requirements` = denied;
- direct INSERT = denied;
- direct UPDATE = denied;
- direct DELETE = denied;
- `authenticated` Auto Schedule EXECUTE = enabled;
- `anon` Auto Schedule EXECUTE = disabled;
- authenticated date-bound staffing reader EXECUTE = disabled;
- authenticated date-bound staffing writer EXECUTE = disabled.

The browser path therefore continues to use bounded recurring RPC authority rather than direct table access or the superseded date-bound staffing APIs.

## PR qualification

Implementation / acceptance PR #360:

- head `38a9760bccd80ba4f8795850646179846f24d229`;
- merge / executable main `adeeee59bcec573f81d03a273a2d93babc0583dd`.

Pre-merge qualification:

- UI2 Cross Role Acceptance `36854746362` — **SUCCESS**;
- People Shift Day-10 Tests `36854746363` — **SUCCESS**;
- UI2 branch run `36854709071` — **SUCCESS**;
- People Shift branch run `36854710653` — **SUCCESS**.

## Exact-main qualification

On merge commit `adeeee59bcec573f81d03a273a2d93babc0583dd`:

- Validate MAGASIN GitHub Pages source `36855243385` — **SUCCESS**;
- UI2 Cross Role Acceptance `36855243424` — **SUCCESS**;
- People Shift Day-10 Tests `36855243411` — **SUCCESS**;
- Pages build and deployment `36855242031` — **SUCCESS**.

## Completion boundary

XSTORE-C05 is complete.

The corrected recurring staffing model has now passed architecture, schema/RPC, Manager board, Robot projection, browser/reload, security and production-safe regression gates.

No real business Store Priority, recurring staffing demand, Robot draft assignment or official schedule has been fabricated by C05.

The next authoritative task is:

`XSTORE-011 — Canonical reconciliation + temp cleanup`.

XSTORE-011 owns the real Manager-configured end-to-end acceptance and final TEMP SOT cleanup.

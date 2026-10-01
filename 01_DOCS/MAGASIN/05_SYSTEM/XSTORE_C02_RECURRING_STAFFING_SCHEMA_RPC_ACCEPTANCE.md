# XSTORE-C02 — Recurring Staffing Schema + RPC Authority — Acceptance Evidence

**Date:** 2026-10-01  
**Track:** `WORKFORCE_CROSS_STORE_SCHEDULING_V1`  
**Task:** `XSTORE-C02`  
**Status:** DONE / EXACT-MAIN GREEN

## Implemented

Canonical migration:

`07_DATABASE/migrations/20261001172500_xstore_c02_recurring_staffing_authority_v1.sql`

Canonical recurring persistence:

`public.workforce_recurring_staffing_requirements`

Business contract:

```text
store_id + day_of_week + start_time + end_time + target_headcount
```

Schema invariants:

- ISO weekday `1..7`;
- `end_time > start_time`;
- `target_headcount between 1 and 20`;
- unique slot by `store_id + day_of_week + start_time + end_time`;
- server-managed audit fields;
- browser direct table privileges revoked.

Browser-facing RPCs:

- `list_workforce_recurring_staffing_requirements_v1()`;
- `replace_workforce_recurring_staffing_requirements_v1(jsonb)`.

Authority rules:

- authenticated actor required;
- ACTIVE profile required;
- role restricted to `OWNER` or `STORE_MANAGER`;
- store scope enforced through `can_access_store`;
- inaccessible store rows are never replaced;
- complete payload is validated before mutation;
- duplicate slots, inactive/inaccessible stores, invalid weekday/time/headcount fail closed;
- canonical board replacement is serialized by advisory lock to avoid overlapping Owner/Manager lost updates.

## No parallel truth introduced

XSTORE-C02 intentionally does not import, copy or dual-write values from:

- `public.staffing_requirements` / `authority_source='XSTORE_V1'`;
- `public.staffing_requirement_templates`.

No real staffing values are fabricated by this migration.

XSTORE-C03 will move the Manager UX onto the recurring RPCs.  
XSTORE-C04 will switch Auto Schedule to recurring projection and retire browser authority for the old date-bound XSTORE staffing RPCs.

## QA contract

Static contract:

`09_QA/people-shift/xstore-c02-recurring-staffing-authority.test.mjs`

The test verifies:

- one recurring-only table;
- no legacy skill/min/max semantics;
- no legacy/date-bound insert path;
- RPC-only browser authority;
- ACTIVE role/store scope enforcement;
- full validation before mutation;
- scoped replacement;
- canonical-board serialization.

## Pull request and exact-main qualification

Implementation PR:

- PR #354 — **MERGED**
- PR head: `0e4e8f563e01e0a42b2699809b4098c685e32f9e`
- merge / executable main: `e77f8fe630d4dcfba16b3344b11eeaa66e18bfaf`

PR-head qualification:

- UI2 Cross Role Acceptance run `36848995914` — **SUCCESS**;
- People Shift Day-10 Tests run `36848996020` — **SUCCESS**.

Exact-main qualification on `e77f8fe630d4dcfba16b3344b11eeaa66e18bfaf`:

- Validate MAGASIN GitHub Pages source run `36849502939` — **SUCCESS**;
- UI2 Cross Role Acceptance run `36849502941` — **SUCCESS**;
- People Shift Day-10 Tests run `36849502990` — **SUCCESS**;
- Pages build and deployment run `36849502031` — **SUCCESS**.

## Completion result

XSTORE-C02 is complete and exact-main green.

The next authoritative task is **XSTORE-C03 — Manager weekly staffing board UX**.

XSTORE-C04, XSTORE-C05 and XSTORE-011 remain blocked by the SOT sequence.

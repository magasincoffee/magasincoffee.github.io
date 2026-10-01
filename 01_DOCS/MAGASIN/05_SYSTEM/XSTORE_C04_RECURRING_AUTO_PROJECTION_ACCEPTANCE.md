# XSTORE-C04 — Auto Schedule Recurring Projection — Acceptance Evidence

**Date:** 2026-10-01  
**Track:** `WORKFORCE_CROSS_STORE_SCHEDULING_V1`  
**Task:** `XSTORE-C04`  
**Status:** DONE / EXACT-MAIN GREEN / LIVE CUTOVER VERIFIED

## Implementation

Migration:

`07_DATABASE/migrations/20261001175825_xstore_c04_recurring_auto_projection_v1.sql`

Canonical Auto Schedule RPC remains:

`public.auto_generate_cross_store_schedule_v1(date, boolean, text)`

The Robot now reads the canonical recurring staffing authority:

`public.workforce_recurring_staffing_requirements`

and projects each recurring block directly into the requested target week:

```text
work_date = p_week_start + (day_of_week - 1)
```

No date-bound staffing copy is materialized and the Robot function no longer reads `public.staffing_requirements` as staffing authority.

The algorithm marker used by the Manager UI / Robot is:

`XSTORE_GLOBAL_RECURRING_V1`

Generated assignments remain DRAFT-only and are labelled:

`AUTO_XSTORE_GLOBAL_RECURRING_V1`

The RPC returns:

`staffing_authority = RECURRING_WEEKLY_V1`

and:

`published = false`

## Date-bound staffing browser cutover

After C04:

- `list_cross_store_staffing_requirements_v1(date)` — browser EXECUTE revoked;
- `replace_cross_store_staffing_requirements_v1(date,jsonb)` — browser EXECUTE revoked;
- `auto_generate_cross_store_schedule_v1(date,boolean,text)` remains available to `authenticated` and enforces internal role/status/store-scope checks.

The recurring table still has no direct `authenticated` SELECT/INSERT/UPDATE/DELETE privileges.

## Production prerequisite reconciliation

During C04 execution, production drift was discovered: the previously accepted XSTORE-C02 recurring migration existed in repository/main but had not yet been applied to the live `MAGASIN-NOIBO` Supabase project.

Before C04 cutover, the already accepted C02 migration was applied unchanged:

- live migration name: `xstore_c02_recurring_staffing_authority_v1`;
- live migration version: `20261001105718`;
- recurring table/RPC authority appeared successfully;
- recurring staffing row count remained `0`;
- no business staffing values were created.

## PR and exact-main qualification

Implementation PR #358:

- head: `1264a44663a175c10747aaa5056bf3953b81dc37`;
- merge / executable main: `5256400601b328006e25b0d820fa2d0c02ec9304`.

Pre-merge qualification:

- UI2 Cross Role Acceptance `36852764111` — **SUCCESS**;
- People Shift Day-10 Tests `36852764145` — **SUCCESS**;
- People Shift branch run `36852720868` — **SUCCESS**.

Exact-main qualification:

- Validate MAGASIN GitHub Pages source `36853279404` — **SUCCESS**;
- UI2 Cross Role Acceptance `36853279359` — **SUCCESS**;
- People Shift Day-10 Tests `36853279603` — **SUCCESS**;
- Pages build and deployment `36853279239` — **SUCCESS**.

## Live production cutover verification

The merged C04 migration was applied to `MAGASIN-NOIBO`:

- live migration name: `xstore_c04_recurring_auto_projection_v1`;
- live migration version: `20261001111134`.

Verified live function properties:

- authentication guard present;
- OWNER / STORE_MANAGER role guard present;
- ACTIVE actor guard present;
- `can_access_store` guard present;
- recurring staffing table is the Robot staffing source;
- weekday projection into `p_week_start` is present;
- no date-bound staffing source is read;
- DRAFT-only return marker is present;
- recurring assignment marker is present.

Verified live privileges:

- authenticated Auto Schedule EXECUTE = enabled;
- anon Auto Schedule EXECUTE = disabled;
- authenticated old date-bound reader EXECUTE = disabled;
- authenticated old date-bound writer EXECUTE = disabled;
- anon old date-bound reader/writer EXECUTE = disabled.

Verified production business rows after cutover:

- recurring staffing rows = `0`;
- date-bound `XSTORE_V1` staffing rows = `0`;
- schedule-generation assignment rows = `0`;
- official `work_schedules` rows = `0`.

No production staffing values, draft assignments or official schedules were fabricated by C04.

## Security advisor note

The post-DDL Security Advisor still reports project-wide historical findings, including intentional `authenticated` exposure of bounded SECURITY DEFINER Workforce RPCs and RLS-enabled tables with no direct table policies. For the C04-specific path:

- Auto Schedule remains intentionally executable by authenticated users but validates auth, role, ACTIVE status and store scope internally;
- anon EXECUTE is denied;
- recurring staffing direct table privileges remain denied;
- old date-bound staffing RPC browser access is revoked.

Full correction-track regression/security acceptance belongs to XSTORE-C05.

## Completion

XSTORE-C04 is complete.

The next authoritative task is:

`XSTORE-C05 — Regression + production-safe correction acceptance`.

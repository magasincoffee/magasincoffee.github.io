# Workforce #487 / PR #503 — registration timestamp gate

**2026-10-22 Asia/Ho_Chi_Minh. Status: STAGED / DRAFT — NOT DEPLOYED.**

## Scope and implementation
- Existing authenticated Manager `get_manager_weekly_availability` is unchanged and remains the authoritative scoped availability reader.
- New additive RPC `public.list_workforce_registration_order_v1(uuid,date)` returns only `availability_id` and immutable row `created_at` as `registered_at`; no employee profile fields or DML.
- `auth.uid()` must be non-null; active OWNER/STORE_MANAGER required. The store must exist **and be ACTIVE**, and `public.can_access_store` must allow it. Each row must belong to an active employee with membership in that store and within the requested Monday–Sunday week.
- The live `can_access_store` grants OWNER a true result for unknown store UUIDs. The RPC has an **independent existence/ACTIVE test** to avoid that scope discrepancy.
- Ranking order: FULL_TIME first, PART_TIME second; within each group use earlier validated `created_at`; subsequent fallback preference/load/branch preference. Draft only; never auto-publish.
- A missing RPC (`PGRST202` / `42883`) leaves existing UNVERIFIED warning; any real auth/server or mixed-ID error stops the preview, not a silent success.

## Verified evidence (no production DDL)
- Supabase MAGASIN-NOIBO read-only metadata: `employee_availability.created_at timestamptz` on 320/320 rows; live Manager weekly RPC does not expose it.
- Isolated GitHub Actions [signed-JWT DB gate](https://github.com/magasincoffee/magasincoffee.github.io/actions/workflows/workforce-registration-order-jwt-db-qa.yml) provisions **synthetic** PostgreSQL 16 + PostgREST 12.2.3. It tests valid HMAC-signed JWT identity, Owner/Manager/Employee/inactive/unknown, store/weekday/next-week boundaries, tampered signature, denied direct table SELECT and fake store UUID.
- CI is an isolated fixture, **not** evidence that production permissions or current authentic sessions are accepted.
- All CI runs must match **exact PR head**; stale PASS from earlier SHA cannot be reused.

## Mandatory pre-production gates
1. Reviewer reads the live (read-only) definitions of `can_access_store`, `current_user_role`, `get_manager_weekly_availability` and table/role grants. Confirm no drift from fixture assumptions.
2. Exact-head isolated signed-JWT DB gate + People Shift, UI2 Cross Role, Scheduling Foundation must all pass; migration source must be inspected for PUBLIC/anon EXECUTE denial.
3. Explicit Owner approval for DB rollout and prepared backup/rollback. Verify whether migration auto-deploy hooks exist; avoid surprise execution. Production SQL changes are not authorized merely by a green CI.
4. If approved, apply new **additive** function via migration as a separate controlled deployment. Query `pg_proc` definition/privileges and API schema cache; test real signed-in Owner/Manager read and Employee/forbidden-store denials **read-only**, with no real schedule writes.
5. Only then merge UI/source against approved exact-head, verify exact-main GitHub Pages and authenticated Employee/Manager/Owner browsers. Owner accepts visual ranking explanation. Actual draft -> publish -> Employee read-through must use **authorized test data/controlled pilot**, not real staff shifts without consent.
6. Rollout through one branch with published rollback plan; do not imply attendance/payroll is ready.

## Rollback (only after confirming no downstream dependencies)
- First revert/deploy the frontend PR if it was merged, or use the client’s already supported missing-RPC warning.
- In a controlled migration rollback, `DROP FUNCTION IF EXISTS public.list_workforce_registration_order_v1(uuid,date);` **only** after verifying permissions/dependents and having approval.
- Removing the RPC returns draft priority to UNVERIFIED; neither removes old availability records nor affects schedules.
- Preserve source/main SHA, time, execution log, tested role/scope, and actual Owner acceptance in Issue #487.

## Still open / separate
- [#499](https://github.com/magasincoffee/magasincoffee.github.io/pull/499): server enforcement of Sunday 12:00 ICT availability lock and Swap >=24h; never merge/apply merely because #503 passes.
- Actual 4-store authenticated workflow, attendance OPEN choices, 24/10 read-only recheck and Owner signoff. Keep #487 OPEN.

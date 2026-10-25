# Issue #529 / PR #530 — Release gates and rollback review (staging only)

Status: **HOLD**. This file is a checklist, not permission to deploy, publish shifts, or modify production.

Source of truth: issue #487 (Owner decisions), issue #529 (P0 acceptance), PR #530. Branch `fix/529-autoschedule-refresh-ft8-safe-draft`.

## Preconditions — all required

- [ ] Rebase/merge the **latest** `main` into this candidate branch without losing #487 decisions; resolve all conflicts; rerun exact-head CI. Do not force-push over unreviewed work.
- [ ] Isolated PG17/JWT E2E is green for the **exact PR HEAD**, including Owner/Manager allowed and Staff denied, 4-store non-overlap, FT8, PT fallback, changed availability/priority, zero weekly override and safe rerun twice.
- [ ] GitHub-hosted job `hosted-synthetic-ui-guard` succeeds on the **exact PR HEAD**, using synthetic Chrome DOM assertions. No local H4 machine is required.
- [ ] Separately, verify **signed-in** Owner/Manager/Staff behavior on a safe QA deployment, using a browser on any machine (prefer automated Playwright where feasible): controls, branch/week switching, inline shortage, FT8/missing-FT/PT explanations, permission separation. The synthetic Chrome fixture is not an authenticated UX test. If safe authenticated QA is unavailable, mark this gate **HOLD** instead of requiring H4 or testing by writing live schedules.
- [ ] Manager validates `AVAILABILITY_MISMATCH` as blocking while a **shortage-only** draft may proceed through review/publish. This must be confirmed in the actual authoritative server validation, not by bypassing it.
- [ ] No published/official shifts are overwritten; only known tagged auto-generated DRAFT assignments can be replaced. Unknown/manual notes are preserved. Unsaved UI draft is protected on navigation.
- [ ] Check the migration dependencies and RLS/role permissions, resource limits, execution time and the four active stores. Get explicit release authorization **after** these gates pass.

## Deployment sequence — only after explicit authorization

1. Record reviewed commit SHA, operator, date/time (Asia/Ho_Chi_Minh), and isolated QA run IDs. Freeze changes for this deployment.
2. Before any change, securely export the **current production function definitions**, especially `public.auto_generate_cross_store_schedule_v1(date,boolean,text)`, with `pg_get_functiondef`, as well as current EXECUTE grants. Keep the export in restricted operational storage, **not** in the public GitHub repository or CI logs.
3. Confirm schema dependencies `employee_employment_types_v1`, `list_workforce_effective_weekly_staffing_v1`, generated draft ownership/tags and version compatibility. Use a dedicated staging/QA database for rehearsal.
4. Review a reversible database change plan with the current, real migration state. Roll out reviewed backend functions/capability handshake first; deploy Manager UI only when the versioned RPC/capabilities actually exist.
5. Run **read-only** permission and UI smoke checks. Do not run real Auto Suggest, overwrite any employee shifts, or publish to "test" the deployment. Those write paths must have been tested in isolated fixtures.

## Rollback decision and isolation

- If the backend change fails, disable new UI entry points and restore the **verified pre-change function DDL and grants**, including the legacy `auto_generate_cross_store_schedule_v1` body. The migration is a `CREATE OR REPLACE` of an existing RPC: simply dropping `auto_generate_cross_store_schedule_529` **does not** restore the old implementation.
- If the UI change fails, revert the UI deployment to the verified prior SHA; leave production schedules untouched. Do not assume a UI rollback automatically reverts database functions.
- The helper RPC `get_workforce_auto_scheduler_capabilities_529` must not claim revision 529 when the safe backend is absent. Review whether to revoke/drop versioned RPCs after restoring the baseline; preserve dependency ordering.
- Reconfirm grants/RLS, official-week protections, absence of unintended data changes and employee/Manager visibility. An unsuccessful or unverified rollback means **HOLD** and escalation, not force-publish.

## Evidence to record

- Exact-head PG17+JWT and 4-store fixture result; GitHub-hosted synthetic Chrome result; separate authenticated QA-browser role acceptance on any authorized device (not H4-specific); rollback rehearsal reference; reviewer approval.
- Explicit declaration: **No changes to real employee schedules, published records, or production SQL during PR staging and QA.**

This runbook is deliberately non-executable. Never use production shift data as a writable test fixture.

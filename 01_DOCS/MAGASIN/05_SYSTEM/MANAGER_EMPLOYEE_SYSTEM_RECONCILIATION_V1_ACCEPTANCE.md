# MANAGER_EMPLOYEE_SYSTEM_RECONCILIATION_V1 — Acceptance Evidence

**Date:** 2026-09-29  
**Repository:** `magasincoffee/magasincoffee.github.io`  
**Track:** `MANAGER_EMPLOYEE_SYSTEM_RECONCILIATION_V1`  
**Status:** CLOSED / ACCEPTED

## Scope

This record preserves the accepted Manager ↔ Employee Workforce reconciliation after the temporary execution Source of Truth is removed.

The track unified:
- Manager/Owner employee Workforce profile reads and Store Priority writes;
- Employee read-only self profile;
- cross-store scheduler profile/priority projection;
- shared Manager Workforce actor/client/store-scope context;
- cross-role browser/error-state semantics.

It did not reopen closed Workforce Operations V1 execution history and does not close the independent XSTORE live-configuration track.

## Canonical implementation

- SQL projection: `employee_workforce_profile_projection_v1(uuid)`.
- Manager/Owner reader: `list_employee_workforce_profiles_v1()`.
- Employee self reader: `get_my_employee_workforce_profile_v1()`.
- Manager/Owner Store Priority writer: `set_employee_store_priority_profile_v1(uuid,uuid[])`.
- Scheduler reader: `get_cross_store_weekly_availability_v1(date)`.
- Store Priority authority: `public.employee_store_priorities`.
- Shared Manager context: `05_MANAGER/Workforce/manager-context-v1.js`.
- Manager UI: `05_MANAGER/Workforce/staff-projection-v1.js`.
- Employee UI: `06_EMPLOYEE/profile/engine-v1.js`.

## Production-safe acceptance

Production reconciliation used existing active role identities without recording private identity data here.

Read-only evidence:
- an active `STORE_MANAGER` successfully read `list_employee_workforce_profiles_v1()`;
- an active `STAFF` successfully read `get_my_employee_workforce_profile_v1()`;
- the historical UUID aggregate failure was absent from the canonical readers.

Bounded write/read smoke:
1. start an explicit database transaction;
2. under real active Manager authority, temporarily set an ordered Store Priority for an active Staff profile;
3. Manager reader observed the same primary/ordered priority;
4. Employee self reader observed the same primary/ordered priority;
5. scheduler weekly availability observed the same primary/ordered priority;
6. roll back the transaction;
7. verify the qualification Store Priority rows were not persisted.

The temporary order used for this bounded smoke was `CN3 → CN2 → CN4 → CN1`. It is acceptance data only and was never committed as real employee business configuration.

Auto Schedule reconciliation confirmed:
- it reads `public.employee_store_priorities`;
- candidates use ascending priority order;
- it produces DRAFT only;
- it requires Manager review and does not publish automatically.

## Browser / CI acceptance

MER-006 candidate acceptance:
- UI2 Cross Role Acceptance #317 — SUCCESS;
- People Shift Day-10 Tests #1094 — SUCCESS.

Final authoritative PR head acceptance:
- candidate head: `57ef30248d690553542e88722a4e1d9384c7eea1`;
- UI2 Cross Role Acceptance #320 — SUCCESS;
- People Shift Day-10 Tests #1097 — SUCCESS.

MER browser checks included:
- Manager save → reload same canonical truth;
- Employee reads the same ordered Store Priority;
- scheduler reads the same priority;
- canonical contract inventory;
- clean browser diagnostics.

During acceptance, three historical QA fixtures were reconciled to the already-deployed MER architecture instead of weakening product assertions:
- UI2-017 runtime cache expectations → current `20260929-mer005` runtime;
- TASK-107 fixture → canonical Workforce Profile RPCs + shared Manager context;
- Day-10 scheduler fixture → shared Manager Workforce Context.

## Merge

MER-006 was merged through PR #341.

- merge commit: `d55e4a25bef8f5e51a6bdb8f6fa927e27829654b`;
- no persistent production Store Priority was fabricated;
- no production schedule was generated or published by qualification.

## Permanent invariants

- Manager/Owner WRITE; Employee READ-ONLY for Store Priority.
- Priority 1 is primary for Workforce scheduling; absent store = `NOT_ELIGIBLE`.
- no duplicate primary-store scheduling authority from legacy `employee_constraints.preferred_store_id`.
- backend failures fail closed and are never displayed as “not configured”.
- Manager Workforce modules consume shared Manager Context.
- Auto Schedule remains DRAFT-only and subordinate to Manager review/publish.
- `work_schedules` remains official schedule truth.

## Independent XSTORE boundary

`WORKFORCE_CROSS_STORE_SCHEDULING_V1` remains open at XSTORE-011 until real Manager-entered Store Priority + Staffing Requirement values are exercised through live Auto Schedule and canonical publish acceptance.

Closing this reconciliation must not be interpreted as completing that separate live business-configuration gate.

# MAGASIN — Manager ↔ Employee System Reconciliation — TEMP SOURCE OF TRUTH

**Search key:** `MANAGER-EMPLOYEE-RECONCILIATION`  
**Track ID:** `MANAGER_EMPLOYEE_SYSTEM_RECONCILIATION_V1`  
**Created:** 2026-09-29  
**Status:** MER-001→006 DONE / MER-007 CURRENT / CANONICAL RECONCILIATION  
**Repository:** `magasincoffee/magasincoffee.github.io`  
**Lifecycle:** TEMPORARY — delete after the reconciled architecture is accepted, permanent docs are updated, and production cross-role smoke passes.

> New-chat bootstrap: search for **MANAGER-EMPLOYEE-RECONCILIATION**, read this file first, then reconcile current main before changing Manager/Employee Workforce code. This track does not reopen closed Workforce Operations V1 history.

## 1. Owner-approved architecture

Manager and Employee Workforce must be one system with one canonical data contract, not separate page-specific truths.

```text
AUTH / ROLE
      ↓
Manager Context
      ↓
Canonical Employee Workforce Profile
      ↓
┌─────────────────────────────┐
│ Basic employee profile      │
│ Primary Store               │
│ Ordered Store Priority      │
│ Status                      │
│ Availability                │
└─────────────────────────────┘
      ↓                 ↓
Manager UI            Employee UI
WRITE authority       READ-ONLY
      ↓                 ↓
      └──── same canonical truth ────┘
                     ↓
            Cross-store Scheduler
                     ↓
                Auto DRAFT
```

## 2. Current production defects to close

1. `list_employee_store_priority_profiles_v1()` fails with:
   `function max(uuid) does not exist`.
2. `get_my_store_priority_profile_v1()` fails with the same UUID aggregate bug.
3. `get_cross_store_weekly_availability_v1(date)` fails with the same UUID aggregate bug.
4. Employee profile UI currently converts Store Priority reader failure into a misleading “Chưa được Quản lý thiết lập” state.
5. Manager Workforce modules independently create clients / resolve store scope instead of using one shared Manager Workforce Context.
6. Manager and Employee use separate UI shells/state patterns, so loading/error/empty behavior and visual hierarchy drift across roles.
7. Cross-role acceptance does not yet prove:
   Manager save → Manager reload → Employee read-only projection → Scheduler reads the same priority truth.

## 3. Canonical rules

### 3.1 Employee Workforce Profile
One canonical projection must own:
- employee identity;
- role/status;
- phone;
- primary store;
- ordered store-priority list;
- optional employee level / join date where canonical sources exist;
- profile/store-priority revision timestamp.

Manager list, Employee self-profile and Cross-store scheduler must project from the same underlying contract.

### 3.2 Store Priority
- Manager/Owner WRITE.
- Employee READ-ONLY.
- Priority 1 = primary store.
- Stores absent from the priority list = NOT_ELIGIBLE.
- No page may derive a second primary-store truth from legacy `employee_constraints.preferred_store_id`.

### 3.3 Manager Workforce Context
A single context service resolves:
- authenticated actor;
- canonical role;
- active state;
- accessible stores;
- shared Supabase client;
- store scope cache / refresh.

Manager Workforce modules consume this context instead of independently deriving authority.

### 3.4 Cross-role UI state
Manager and Employee must share:
- loading/error/empty/ready state semantics;
- common card/form/table/state primitives;
- same terminology for Primary Store and Store Priority;
- fail-closed error display — backend reader failure must never be rendered as “not configured”.

Role differences remain:
- Manager can edit operational profile authority.
- Employee can only read it.

### 3.5 Scheduler consistency
Cross-store Availability / Auto Schedule must read the same canonical Store Priority truth used by Manager and Employee profile surfaces.

## 4. Implementation plan

| ID | Work | Result | Status |
|---|---|---|---|
| MER-001 | Canonical Employee Workforce Profile SQL contract | One projection; remove UUID aggregate bug and duplicated profile truth | DONE |
| MER-002 | Rewire Store Priority Manager/Employee/Scheduler readers | All three surfaces use canonical profile truth | DONE |
| MER-003 | Manager Workforce Context | Shared actor/client/store-scope context for Manager modules | DONE |
| MER-004 | Shared cross-role UI primitives/state semantics | Manager + Employee loading/error/empty/ready become consistent | DONE |
| MER-005 | Manager Employee profile UX | Manager can list/edit priorities reliably; Employee sees same read-only revision | DONE |
| MER-006 | Cross-role E2E + production smoke | Manager save → Employee read → Scheduler read proves one truth | DONE |
| MER-007 | Canonical reconciliation + TEMP cleanup | Update permanent docs, close track, delete this file | CURRENT |

## 5. MER-006 acceptance evidence — 2026-09-29

Candidate production reconciliation was performed against `main @ 44fb85af5ae8fc9d83c199b0ecce305af03cfc20`.

Production role/read evidence:

- production Supabase contains one `ACTIVE STORE_MANAGER` and four `ACTIVE STAFF` profiles;
- under a real active STORE_MANAGER auth context, `list_employee_workforce_profiles_v1()` returned the employee pool without the historical UUID aggregate failure;
- under a real active STAFF auth context, `get_my_employee_workforce_profile_v1()` returned an `ACTIVE STAFF` canonical profile;
- production currently has no persisted Store Priority configuration for the Manager-visible employee pool, so MER-006 qualification MUST NOT manufacture a persistent production state.

Bounded transactional cross-role smoke:

1. begin a database transaction;
2. use the real active STORE_MANAGER auth context;
3. call `set_employee_store_priority_profile_v1()` for a real active STAFF who has availability in week `2026-10-05`;
4. assign temporary Store Priority `CN3 → CN2 → CN4 → CN1`;
5. Manager `list_employee_workforce_profiles_v1()` returned the same Primary Store + ordered priority;
6. switch to the real STAFF auth context in the same transaction;
7. Employee `get_my_employee_workforce_profile_v1()` returned the same Primary Store + ordered priority;
8. switch back to STORE_MANAGER;
9. `get_cross_store_weekly_availability_v1('2026-10-05')` returned the same priority truth for that employee, with seven availability rows in the week;
10. `ROLLBACK` the transaction;
11. post-rollback verification confirmed zero persisted Store Priority rows for the qualification employee.

Therefore the production smoke exercised the real canonical writer/readers while leaving production data unchanged.

Auto Schedule reconciliation:

- production `auto_generate_cross_store_schedule_v1()` consumes `public.employee_store_priorities` directly;
- candidate selection is ordered by `esp.priority ASC`;
- generated rows remain `DRAFT`;
- the result explicitly requires Manager review and reports `published=false`;
- this preserves Manager as the final scheduling decision-maker and uses the same Store Priority authority proven by Manager/Employee/Scheduler smoke.

Regression acceptance completed on PR #341 candidate `9ec81b84b7b7b9e52b15b23b42701fa95b09abb2`:

- UI2 Cross Role Acceptance #317 — SUCCESS;
- People Shift Day-10 Tests #1094 — SUCCESS;
- MER canonical profile browser E2E passed in both workflows;
- TASK-107 failure-recovery fixture was reconciled to `get_my_employee_workforce_profile_v1`, `list_employee_workforce_profiles_v1`, and shared `MAGASIN_MANAGER_WORKFORCE_CONTEXT`;
- UI2-017 and Day-10 historical fixtures were reconciled to the current MER-005 runtime/context rather than weakening assertions;
- final People Shift regression continued through TASK-108, Manager Workforce canonical browser, XSTORE four-store master, Day-10 browser E2E, and Control Tower.

MER-006 is therefore DONE. MER-007 is the only current task.

## 6. Execution order

```text
MER-001
→ MER-002
→ MER-003
→ MER-004
→ MER-005
→ MER-006
→ MER-007
```

Do not bypass MER-001 with frontend-only workarounds.

## 7. Safety / non-goals

- Do not fabricate employee Store Priority.
- Do not modify Inventory/Warehouse scope.
- Do not change payroll formulas/rates.
- Do not create a second schedule truth.
- Do not auto-publish schedules.
- Preserve `work_schedules` as official schedule truth.
- Preserve Manager as final scheduling decision-maker.

## 8. Definition of Done

This track closes only when:

1. all canonical Manager Workforce readers smoke-pass under a real active `STORE_MANAGER`;
2. Employee self-profile reader smoke-passes under a real active `STAFF`;
3. Manager Employee list renders without `PROFILE_VIEW_FAILED`;
4. Manager can save Store Priority;
5. Employee reload shows the same Primary Store + ordered priority;
6. Cross-store Availability returns the same priority data;
7. Auto Schedule consumes the same canonical priority truth;
8. backend failures render as failures, never as “not configured”;
9. Manager/Employee shared UI-state contract is applied;
10. cross-role regression/E2E is green;
11. permanent Workforce docs are reconciled;
12. this TEMP file is deleted.

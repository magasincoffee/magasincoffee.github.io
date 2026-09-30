# MANAGER ↔ EMPLOYEE WORKFORCE — OWNER DECISION MEMO

**Decision date:** 2026-09-30  
**Track:** `MANAGER_EMPLOYEE_SYSTEM_RECONCILIATION_V1`  
**Purpose:** short memory record for future chats.  
**Authority note:** this memo is NOT a second Source of Truth. Permanent acceptance/evidence remains `MANAGER_EMPLOYEE_SYSTEM_RECONCILIATION_V1_ACCEPTANCE.md` and canonical Workforce architecture/state documents.

## Locked architecture

MAGASIN Workforce must be treated as one system across Manager and Employee.

```text
AUTH / ROLE
    ↓
Manager Workforce Context
    ↓
Canonical Employee Workforce Profile
    ├─ identity / status
    ├─ primary store
    ├─ ordered Store Priority
    └─ operational profile fields
    ↓
Manager UI ── WRITE Store Priority
Employee UI ─ READ-ONLY same profile
Scheduler   ─ READ same profile/priority
```

## Locked business rules

- `STORE_MANAGER` = Quản lý cửa hàng.
- `INVENTORY_MANAGER` = Quản lý kho; separate future scope.
- Manager/Owner owns employee Store Priority.
- Priority 1 = primary store for Workforce scheduling.
- Missing store in priority list = NOT_ELIGIBLE.
- Employee can view priority but cannot edit it.
- Availability answers only **when** an employee can work.
- Store Priority answers **where** management prefers that employee to work.
- Schedule answers **where + when** the employee is actually assigned.
- Auto Schedule may create **DRAFT only**.
- Manager remains final edit / validate / review / publish authority.
- `work_schedules` remains official schedule truth.

## Canonical implementation contract

- profile projection: `employee_workforce_profile_projection_v1(uuid)`
- Manager reader: `list_employee_workforce_profiles_v1()`
- Employee reader: `get_my_employee_workforce_profile_v1()`
- Manager writer: `set_employee_store_priority_profile_v1(uuid,uuid[])`
- Scheduler projection: `get_cross_store_weekly_availability_v1(date)`
- priority table: `employee_store_priorities`
- shared Manager context: `05_MANAGER/Workforce/manager-context-v1.js`

Do not reintroduce:
- split Manager/Employee Store Priority readers;
- `max(uuid)` Store Priority aggregation;
- frontend behavior that converts backend failure into “Chưa thiết lập”;
- per-module independent Manager Supabase clients/store-scope resolution;
- Employee authority to edit Store Priority.

## UI rule

Manager and Employee may have different navigation/actions by role, but they should share:
- state semantics: LOADING / READY / EMPTY / ERROR;
- typography/card/form/table primitives;
- canonical data contracts;
- consistent error behavior;
- same Workforce profile revision.

Do not redesign one role in isolation if the change affects shared Workforce profile/state.

## Verification rule

Any future change touching employee profile, Store Priority, Availability or scheduler must prove:

```text
Manager save
→ Manager reload same truth
→ Employee reads same truth
→ Scheduler reads same truth
→ cold/reload remains stable
```

## Current implementation state

The reconciliation track is implemented and accepted in repository history.

Permanent evidence:
`01_DOCS/MAGASIN/05_SYSTEM/MANAGER_EMPLOYEE_SYSTEM_RECONCILIATION_V1_ACCEPTANCE.md`

The independent Cross-Store live business-configuration gate remains separate until real Store Priority + Staffing Requirement values are entered and exercised end-to-end.

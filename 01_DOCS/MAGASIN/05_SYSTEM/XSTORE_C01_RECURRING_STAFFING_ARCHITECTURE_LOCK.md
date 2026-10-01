# XSTORE-C01 — Recurring Staffing Architecture Lock

**Date:** 2026-10-01  
**Track:** `WORKFORCE_CROSS_STORE_SCHEDULING_V1`  
**Task:** `XSTORE-C01`  
**Status:** DONE — ARCHITECTURE LOCKED  
**Scope:** architecture/reconciliation only; no production business values are created or changed by this task.

## 1. Decision

The canonical staffing-demand authority for the corrected cross-store scheduling flow will be a **new recurring-only Workforce persistence**, not either existing staffing model.

Canonical persistence to implement in XSTORE-C02:

`public.workforce_recurring_staffing_requirements`

Canonical business key:

```text
store_id + day_of_week + start_time + end_time
```

Canonical business value:

```text
target_headcount
```

`day_of_week` is ISO weekday `1..7` (Monday..Sunday).

The persistence may contain audit metadata such as IDs, actor IDs and timestamps, but no legacy skill/minimum/maximum semantics are part of the normal recurring Workforce contract.

## 2. Why neither existing model becomes canonical

### 2.1 Current XSTORE-007 date-bound model

Current implementation:

- table: `public.staffing_requirements`;
- Robot authority: rows where `authority_source='XSTORE_V1'`;
- key includes a concrete `work_date`;
- browser RPCs:
  - `list_cross_store_staffing_requirements_v1(date)`;
  - `replace_cross_store_staffing_requirements_v1(date,jsonb)`;
- current Robot `auto_generate_cross_store_schedule_v1` reads those date-bound rows.

This is incompatible with the Owner-approved operating model because identical demand must not be re-entered for every calendar week.

Therefore:

- existing `XSTORE_V1` rows remain historical/reconciliation input only;
- they are **not** the corrected recurring authority;
- no recurring save may dual-write into them;
- after the Robot cutover in XSTORE-C04, the date-bound list/replace RPCs must lose browser execution authority and be marked deprecated for this track.

### 2.2 Legacy recurring template

Legacy implementation:

- table: `public.staffing_requirement_templates`;
- recurring fields already include `store_id + day_of_week + start_time + end_time`;
- it also carries legacy `skill_code`, `min_skill_level`, `minimum_headcount`, `maximum_headcount` semantics;
- legacy writer `upsert_workforce_staffing_requirement(...)` was Owner-only;
- SCHED-02 revoked browser execution for that writer and revoked direct table access.

This table proves that recurring-week storage existed historically, but it is not reactivated as the new authority because doing so would silently restore deprecated semantics and old authority behavior.

Therefore:

- legacy rows are preserved as historical/reconciliation input;
- no automatic migration promotes them into canonical recurring values;
- no legacy writer is re-enabled;
- the table remains non-authoritative for the corrected XSTORE flow.

## 3. Canonical authority boundary

The corrected recurring model preserves the existing Workforce authority chain:

```text
authenticated actor
→ ACTIVE profile
→ role in OWNER | STORE_MANAGER
→ can_access_store(store_id)
→ recurring staffing RPC
→ canonical recurring table
```

Rules:

- `OWNER`: allowed within canonical Owner store access.
- `STORE_MANAGER`: allowed only where `can_access_store(store_id)=true`; current shared-workforce configuration remains `access_scope=ALL`.
- `INVENTORY_MANAGER`: denied.
- `STAFF/EMPLOYEE`: denied.
- inactive profiles: denied.
- browser direct SELECT/INSERT/UPDATE/DELETE on the canonical recurring table: denied.
- browser access is through bounded SECURITY DEFINER RPCs with internal role/status/store checks.
- no broadened "manager-family" role shortcut is permitted.

## 4. XSTORE-C02 contract

XSTORE-C02 must implement the new recurring persistence and bounded RPC authority.

Required table invariants:

- `store_id` references an ACTIVE store at write time;
- `day_of_week between 1 and 7`;
- `end_time > start_time`;
- `target_headcount between 1 and 20`;
- unique slot: `store_id + day_of_week + start_time + end_time`;
- audit metadata is server-managed.

Required browser-facing RPCs:

- `list_workforce_recurring_staffing_requirements_v1()`;
- `replace_workforce_recurring_staffing_requirements_v1(jsonb)`.

The replace RPC is an atomic board save for the actor's accessible store scope:

1. authenticate and validate ACTIVE role;
2. validate the complete payload before mutation;
3. reject inaccessible/inactive stores, malformed intervals, duplicate slots and invalid headcount;
4. replace only rows inside the actor's accessible store scope;
5. never mutate inaccessible store rows;
6. return a deterministic saved-row count / scope summary.

The implementation must not copy data automatically from either existing staffing table. Management remains responsible for confirming the real recurring operating values in the corrected UI.

## 5. XSTORE-C03 cutover rule

The Manager surface must stop presenting date-bound weekly staffing rows and instead show one persistent weekly board:

```text
CN1–CN4 × Monday–Sunday × time blocks × target_headcount
```

Normal users must not see:

- `authority_source`;
- migration identifiers;
- legacy minimum/maximum headcount fields;
- legacy skill fields.

C03 reads/writes only the new recurring RPCs.

Because the Robot is not switched until C04, the Auto Schedule action must not rely on stale date-bound requirements during the intermediate C03 state.

## 6. XSTORE-C04 projection rule

The Robot must project recurring rows into the requested target week in memory/query scope:

```text
work_date = p_week_start + (day_of_week - 1)
```

The projection is **not persisted** into `staffing_requirements` and does not create a second staffing truth.

`auto_generate_cross_store_schedule_v1` remains a DRAFT-only scheduling aid and must keep all existing hard safety boundaries:

- Store Priority eligibility;
- Employee Availability;
- global cross-store overlap protection;
- daily/weekly hour constraints;
- existing official schedule protection;
- Manager review/edit;
- Validate → Review → Publish;
- `work_schedules` remains the only official schedule truth.

After the recurring Robot path is live, browser execution on these date-bound XSTORE staffing RPCs must be revoked/deprecated:

- `list_cross_store_staffing_requirements_v1(date)`;
- `replace_cross_store_staffing_requirements_v1(date,jsonb)`.

The already-revoked legacy `auto_generate_schedule_generation` remains revoked.

## 7. No parallel truth rule

After XSTORE-C04:

| Object | Role |
|---|---|
| `workforce_recurring_staffing_requirements` | **SOLE staffing-demand authority** |
| `staffing_requirements` / `XSTORE_V1` date rows | historical/reconciliation only |
| `staffing_requirement_templates` | legacy/reconciliation only |
| `schedule_generation_runs/assignments` | DRAFT planning state |
| `work_schedules` | sole official published schedule truth |

There is no dual-write and no date-bound materialized staffing copy.

## 8. Evidence reconciled for this lock

Repository evidence read for XSTORE-C01:

- `07_DATABASE/migrations/20260929063000_xstore_007_009_staffing_auto_draft_v1.sql`;
- `07_DATABASE/migrations/20260902_add_recurring_staffing_demand_templates.sql`;
- `07_DATABASE/migrations/20260923163337_sched_02_three_role_scheduling_authority_lock_v1.sql`;
- `07_DATABASE/migrations/20260928153000_xstore_001_store_manager_access_scope_owner_grant.sql`;
- `05_MANAGER/Workforce/manager-context-v1.js`;
- `05_MANAGER/Workforce/cross-store-auto-schedule-v1.js`;
- `01_DOCS/MAGASIN/05_SYSTEM/XSTORE_007_010_STAFFING_AUTO_DRAFT_ACCEPTANCE.md`;
- current TEMP Source of Truth.

Verified reconciliation:

- current XSTORE staffing truth is date-bound;
- old recurring table exists but its writer is deprecated/revoked and its semantics are broader than the approved rule;
- canonical Manager context accepts only ACTIVE `OWNER` / `STORE_MANAGER`;
- store access remains enforced by `can_access_store`;
- current XSTORE Robot is DRAFT-only and legacy auto writer remains revoked;
- no production staffing business value is fabricated by this architecture lock.

## 9. Completion result

XSTORE-C01 is complete.

The next executable task is **XSTORE-C02 — Recurring Staffing schema + RPC authority**.

XSTORE-011 remains blocked until XSTORE-C02→C05 are complete.

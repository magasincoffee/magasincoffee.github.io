# TASK-010 — Database Baseline / Migration Plan V1

**Status:** PLAN COMPLETE  
**Date:** 2026-09-18  
**Scope:** repository-grounded database baseline review and non-destructive migration strategy for the Store/Product foundation.

## 1. Baseline finding

The repository does **not** currently contain a full reproducible Supabase baseline.

Source-controlled migrations show:

- workforce functions depend on pre-existing tables such as `public.stores`, `public.profiles`, `public.work_schedules`, `public.attendance`, staffing/schedule tables and access helpers;
- the repository contains no source-controlled creation migration for several of those dependencies;
- procurement is comparatively self-contained and creates `procurement_products`, `procurement_product_packages`, supplier/order/payment/audit structures;
- current procurement receiving location is still a text value rather than a canonical location FK.

Therefore, the next production-safe database change must **not** assume that replaying `07_DATABASE/migrations` from an empty database reproduces production.

## 2. Evidence boundary

This plan is based on:

- TASK-009 Store/Product foundation review and contract;
- repository migration inventory;
- current workforce/store references;
- current procurement DDL;
- C107 current-database baseline;
- C108 data-object scope;
- C109 data ownership.

It does **not** claim to be a live production schema snapshot.

## 3. Five-Step migration strategy

### Step 1 — Question

What is the fastest safe path from the current mixed/partial schema to a shared Store/Product foundation without breaking workforce or procurement?

### Step 2 — Delete

Do not:

- rebuild production from scratch;
- rename/drop existing tables in the first migration;
- copy Google Sheets structure table-for-table;
- replace all workforce/procurement FKs in one release;
- auto-classify ambiguous legacy product categories;
- backfill production without row-level validation;
- combine Sales/Inventory/Finance schema work into this foundation migration.

### Step 3 — Simplify

Use **expand → map → migrate consumers → contract**.

No destructive contract step is part of the initial V1 foundation release.

### Step 4 — Accelerate

Split work into independently testable migration slices.

### Step 5 — Automate

Automate schema checks, row-count/mapping validation and rollback verification before any production apply.

## 4. Current known schema surface

### 4.1 Existing core dependencies referenced by migrations

Repository migrations reference at least:

- `public.stores`
- `public.profiles`
- `public.work_schedules`
- `public.attendance`
- `public.employee_availability`
- `public.employee_constraints`
- `public.employee_skills`
- `public.employee_grades`
- `public.staffing_requirements`
- `public.schedule_generation_runs`
- `public.schedule_generation_assignments`

Their complete creation history is not present in the current migration folder.

### 4.2 Existing procurement-owned tables

Source-controlled procurement currently includes:

- `procurement_products`
- `procurement_product_packages`
- `procurement_suppliers`
- `procurement_purchase_orders`
- `procurement_purchase_order_items`
- `procurement_supplier_payments`
- `procurement_supplier_payment_allocations`
- `procurement_price_references`
- `procurement_audit_log`

Procurement product taxonomy is narrower than the enterprise Store/Product foundation.

## 5. Required pre-migration baseline gate

Before any production DDL from the Store/Product foundation is applied:

1. Obtain a **read-only live schema inventory** from Supabase.
2. Compare live objects with repository migrations.
3. Record table/column/constraint/index/RLS/function dependencies involving:
   - stores;
   - procurement products/packages;
   - workforce store FKs;
   - access helpers.
4. Record row counts only; do not export private row content into this public repository.
5. Identify every FK/function/view that would be affected by a future canonical cutover.
6. Store only sanitized schema metadata in Git.

If live schema access is unavailable, migration implementation remains additive/draft-only and production apply is blocked.

## 6. Migration sequence

### M0 — Baseline snapshot / drift register

Output:

- sanitized schema inventory;
- missing-from-repo object list;
- migration drift register;
- dependency graph for Store/Product surfaces.

Side effect: read-only.

### M1 — Canonical product master, additive

Create a shared `products` master with the TASK-009 invariants:

- immutable UUID identity;
- stable code;
- name;
- enterprise item type;
- base unit;
- active/inactive lifecycle;
- audit timestamps/actors where platform conventions support them.

Do **not** remove `procurement_products`.

### M2 — Product legacy mapping, additive

Create an explicit mapping between current procurement product identity and canonical product identity.

Rules:

- `MATERIAL → MATERIAL`
- `PACKAGING → PACKAGING`
- `OTHER → OTHER`
- `GOODS` is **not** silently mapped; it must be classified using actual business data before canonical cutover.

This avoids inventing whether a legacy `GOODS` row is a sellable product, topping, asset or another item.

### M3 — Shared unit conversion, additive

Create shared unit/package conversion semantics:

`product_id + unit label + base_qty_per_unit > 0`

Then map compatible `procurement_product_packages` rows.

No procurement package table is dropped in this step.

### M4 — Location registry, additive

Because existing workforce code already depends on `public.stores`, the first migration must preserve it.

Introduce a canonical location registry or equivalent mapping layer that can represent:

- `STORE`
- `WAREHOUSE`

Store identities should preserve the existing store UUID where technically possible.

No existing workforce FK is repointed until dependency tests pass.

### M5 — Consumer migration, one domain at a time

Suggested order:

1. procurement receiving location;
2. inventory foundation;
3. sales ingestion;
4. workforce only if a common location FK is actually beneficial.

Each consumer migration must be independently reversible.

### M6 — Compatibility / contract cleanup

Only after all consumers and field validation pass:

- retire duplicate legacy columns/tables;
- replace compatibility paths;
- remove obsolete mappings.

This phase is explicitly **not** part of the initial foundation release.

## 7. Production safety rules

Every production migration must satisfy:

- additive first;
- no hard delete of Store/Product masters;
- transaction where PostgreSQL permits;
- idempotent or precondition-checked DDL;
- pre/post row counts;
- FK orphan checks;
- uniqueness checks for codes;
- category mapping counts including unresolved rows;
- RLS/access review;
- rollback or forward-fix procedure;
- no private data dump committed to Git;
- Owner approval for production migration/backfill.

## 8. Rollback model

Initial foundation migrations should be rollback-safe because legacy paths remain intact.

Rollback for M1–M4:

1. stop new writes to the new foundation path;
2. keep legacy tables untouched;
3. remove only newly added consumers/mappings after dependency check;
4. preserve audit evidence;
5. never delete legacy data as part of rollback.

## 9. Definition of done for the next SQL implementation task

A Store/Product SQL migration draft is ready for field review only when:

- live schema metadata has been compared, or the migration is clearly labeled offline/draft;
- no existing workforce/procurement object is dropped;
- ambiguous `GOODS` rows remain explicitly unresolved;
- tests can run against an empty/sandbox PostgreSQL/Supabase-compatible environment or static SQL contract checks;
- migration has preconditions and verification queries;
- production apply is not bundled with code review.

## 10. TASK-010 gate result

**PASS — migration plan is defined.**

No production change was performed.

Next:

**TASK-011 — Owner Control Tower vertical-slice plan**

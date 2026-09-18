# TASK-009 — Store / Product Canonical Foundation Review

**Status:** FOUNDATION REVIEW COMPLETE  
**Date:** 2026-09-18  
**Scope:** minimum master-data foundation required by the 21-day V1 overlay.  
**Important:** this is not a final P4 Data Model approval. It is a bounded foundation contract derived from existing Discovery/Decision evidence so implementation can proceed without inventing business rules.

## 1. Question

What is the minimum stable Store/Product foundation MAGASIN needs now so later Sales, Inventory, People and Owner Control Tower slices can share identity without copying Google Sheets structure into Supabase?

## 2. Evidence used

### Store / operating network

Repository evidence establishes:

- MAGASIN currently operates **4 stores + 1 warehouse**.
- The stores use the same selling model/menu at baseline level.
- Branch data ownership is GM; warehouse/stock ownership is GM.
- Current Sheets manage branch master data.
- Current implementation already references a `public.stores` relation with UUID `id`, `code`, `name`, `status`; that is implementation evidence, not automatically the target business model.

Sources: P0 Gate Review; C106; C109; current workforce migration.

### Product / item master

Repository evidence establishes:

- Current Sheets manage products and recipes as master data.
- Product/Recipe business ownership is Owner.
- Data object scope includes sold products, raw materials, toppings, packaging, tools/assets and other items.
- Unit conversion exists operationally: examples include bottle→ml, kg→g, box→piece.
- Current COGS knowledge depends on recipe + purchase price + conversion + packaging + topping.
- Existing procurement implementation has `procurement_products` and `procurement_product_packages`, but its categories and base units are narrower than the enterprise discovery scope.

Sources: C86; C93; C106–C109; procurement migration.

## 3. Five-Step review

### Step 1 — Question

The foundation must solve shared identity first. It does **not** need to solve full menu pricing, stock valuation, recipe costing, channel catalog or asset accounting in this task.

### Step 2 — Delete

Deleted from TASK-009 scope:

- price history;
- channel-specific prices;
- store-specific menu overrides;
- stock balances;
- supplier terms;
- purchase-order logic;
- sales-order logic;
- full recipe versioning;
- asset depreciation;
- final KPI definitions.

These are separate domain slices and should not be smuggled into master data.

### Step 3 — Simplify

Use only four foundation concepts:

1. **Business Location** — stable identity for a physical operating location.
2. **Product/Item** — stable identity for anything MAGASIN sells, consumes, packages or tracks as an item.
3. **Unit Conversion / Package** — converts a purchase/handling unit into an item's base unit.
4. **Recipe Relationship** — declares that a sellable item consumes component items; final versioning/costing rules remain deferred.

### Step 4 — Accelerate

The foundation contract is machine-readable and intentionally small. TASK-010 can map current implementation tables to this contract without a full business migration.

### Step 5 — Automate

Only validation of the foundation contract is automated now. No production migration or data backfill is authorized by this review.

## 4. Candidate canonical foundation

### 4.1 Business Location

Candidate minimum fields:

| Field | Purpose | Evidence / rationale |
|---|---|---|
| `id` | immutable internal identity | current implementation already uses UUID; C107 confirms current Sheets lack unique IDs |
| `code` | stable human-readable identifier | current `stores` implementation uses code; useful for integration mapping |
| `name` | operator-facing name | current implementation and branch master data |
| `location_type` | `STORE` or `WAREHOUSE` | 4 stores + 1 warehouse baseline |
| `status` | `ACTIVE` / `INACTIVE` | preserves history instead of current Sheet deletion behavior |

Design note: using one parent Location identity is a technical simplification, not a claim that store and warehouse business processes are identical.

### 4.2 Product / Item

Candidate minimum fields:

| Field | Purpose | Evidence / rationale |
|---|---|---|
| `id` | immutable internal identity | C107 identity gap |
| `code` | stable business/integration identifier | existing procurement implementation; migration mapping |
| `name` | canonical item name | current product master |
| `item_type` | see type list below | C108 enterprise object scope |
| `base_unit` | smallest operational stock/recipe unit | C86 |
| `status` | `ACTIVE` / `INACTIVE` | required to retain historical references |

Candidate `item_type` values:

- `SELLABLE`
- `MATERIAL`
- `TOPPING`
- `PACKAGING`
- `ASSET`
- `OTHER`

These values mirror C108 scope. They are a foundation taxonomy, not final accounting classification.

### 4.3 Unit Conversion / Package

Minimum relationship:

`item → purchase/handling unit → base quantity per unit`

Examples supported by evidence:

- bottle → ml;
- kg → g;
- box → piece.

The current procurement package table is useful implementation evidence, but TASK-010 must review whether it should remain procurement-specific or become a shared master-data relationship.

### 4.4 Recipe Relationship

Minimum relationship:

`sellable item → component item → quantity in component base unit`

Only identity and quantity linkage are in scope here. Deferred:

- effective dates/versioning;
- optional toppings;
- recipe variants/sizes;
- yield/waste factors;
- channel-specific recipes;
- costing policy.

## 5. Explicit non-decisions / open items

No Owner decision is required to complete this review because these items can remain deferred safely:

1. Store addresses/codes are not re-invented here; import mapping will use authoritative current data.
2. Menu pricing and channel pricing remain Sales/Finance scope.
3. Store-specific availability is deferred because current baseline says the same selling model/menu across stores and no material exception is documented.
4. Recipe versioning remains deferred until recipe/process rules are mature enough.
5. Asset lifecycle/depreciation is outside V1 foundation.
6. Base-unit vocabulary beyond currently evidenced examples must remain extensible.
7. Whether `STORE` and `WAREHOUSE` ultimately share one physical table or use typed tables is a TASK-010 migration/architecture decision; business identity semantics above are the invariant.

## 6. Existing implementation conflicts to preserve during migration planning

### `public.stores`

Known current surface:

`id uuid, code text, name text, status text`

This is compatible with Store identity but does not represent warehouse identity.

### `public.procurement_products`

Known current categories:

`MATERIAL | PACKAGING | GOODS | OTHER`

Discovery scope is broader and uses different semantics:

`SELLABLE | MATERIAL | TOPPING | PACKAGING | ASSET | OTHER`

Therefore procurement category must **not** be silently promoted into the enterprise product taxonomy.

### `public.procurement_product_packages`

The existing relationship already represents purchase-unit conversion and may be reusable after TASK-010 mapping review.

### `receiving_location text`

Current procurement orders use a text receiving location. This is not a canonical location FK and is a migration-risk item.

## 7. Foundation invariants

TASK-010 must preserve these invariants:

1. New master objects have immutable internal IDs.
2. Human-readable codes are stable integration keys, not primary business history.
3. Historical transactions must never depend on hard-deleting a Store/Product.
4. Store and warehouse identities must be addressable by inventory flows.
5. Product taxonomy must cover the C108 enterprise scope, not only procurement.
6. Unit conversion must be explicit and positive.
7. Current implementation tables are migration inputs, not the business source of truth.
8. No production mutation occurs without a reviewed migration plan and appropriate approval.

## 8. TASK-009 gate result

**PASS.**

The repository now has enough bounded Store/Product foundation semantics to proceed to:

**TASK-010 — Database baseline / migration plan**

without inventing pricing, stock, sales or full recipe rules.

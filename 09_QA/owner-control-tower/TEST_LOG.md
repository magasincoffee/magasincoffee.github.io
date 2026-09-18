# Owner Control Tower QA Test Log

## 2026-09-18 — TASK-012 shell + normalized fixture contract

- Branch: `feat/control-tower-shell`
- Route: `/04_OWNER/ControlTower/`
- Snapshot model: `04_OWNER/ControlTower/snapshot-v1.mjs`
- Workflow: `Owner Control Tower Tests`
- Run: `35310065240`
- Result: **PASS**
- Healthy fixture normalization: PASS.
- Partial-source normalization: PASS.
- Source-local error behavior: PASS.
- Empty actual values remain distinct from unavailable values: PASS.
- Invalid quality state fails closed to `GAP`: PASS.
- Missing numbers render as `—`; no synthetic values are introduced.
- Default browser shell starts with NOT_CONNECTED/GAP-safe state and does not perform production writes.
- Gate: TASK-012 **DONE**; TASK-013 may proceed.

## 2026-09-18 — TASK-013 Owner home navigation + route/auth integration

- Branch: `feat/control-tower-route-auth`
- Workflow: `Owner Control Tower Tests`
- Regression/integration run: `35310598259`
- Result: **PASS**
- Owner home exposes canonical `/04_OWNER/ControlTower/` route: PASS.
- Control Tower loads existing Supabase + `MAGASIN_CORE` auth conventions: PASS.
- Active `OWNER` gate executes before dashboard render: PASS.
- Explicit loading/denied/app states: PASS.
- Denied state returns to canonical auth route: PASS.
- BUG-CT-001 untrusted-number regression: PASS; `GAP`/`NOT_CONNECTED` redact numeric metrics.
- Missing source quality defaults to `NOT_CONNECTED`: PASS.
- Production writes: none.
- Gate: TASK-013 **DONE**; TASK-014 may proceed.

## 2026-09-18 — TASK-014 Procurement/payables read adapter

- Branch: `feat/control-tower-payables`
- Workflow: `Owner Control Tower Tests`
- Adapter/regression run: `35310936375`
- Result: **PASS**
- Trusted read models: `v_procurement_supplier_payables` + `v_procurement_order_summary`.
- Total payable / overdue payable aggregation: PASS.
- Open / overdue purchase-order counts: PASS.
- Cancelled orders excluded from attention counts: PASS.
- Empty trusted source returns ACTUAL zeroes: PASS.
- Source failure returns section-local GAP and no numeric metrics: PASS.
- UI integration after Owner auth: PASS.
- Production writes: none.
- BUG-CT-002 stale test contract: VERIFIED.
- Gate: TASK-014 **DONE**; TASK-015 may proceed.

## 2026-09-18 — TASK-015 Workforce attention read adapter

- Branch: `feat/control-tower-workforce`
- Workflow: `Owner Control Tower Tests`
- Adapter/integration run: `35311316383`
- Result: **PASS**
- Read-only sources: `get_manager_transfer_requests` + `list_schedule_generations`.
- Pending transfer requests counted as unresolved attention: PASS.
- DRAFT/REVIEWED schedule generations counted as unresolved attention: PASS.
- PUBLISHED/CANCELLED items excluded: PASS.
- Partial source failure returns `ESTIMATE` with a verified lower-bound count: PASS.
- Complete source failure returns `GAP`: PASS.
- Staffing gap remains `—` because no verified read-only shortage model exists; no KPI is invented.
- No schedule-generation/review/publish write RPC is invoked.
- UI integration after Owner auth: PASS.
- Gate: TASK-015 **DONE**; TASK-016 may proceed.

## 2026-09-18 — TASK-016 Revenue read-adapter + reconciliation quality gate

- Branch: `feat/control-tower-revenue-contract`
- Workflow: `Owner Control Tower Tests`
- Contract/integration run: `35311584686`
- Result: **PASS**
- `RECONCILED` + finite amount → `ACTUAL`: PASS.
- Explicit trusted `ESTIMATE` → `ESTIMATE`: PASS.
- `PENDING / UNRECONCILED / GROSS / RAW / REVIEW_REQUIRED` → `GAP` and amount hidden: PASS.
- Missing production provider → `NOT_CONNECTED` and no revenue number: PASS.
- Provider failure → section-local `GAP`: PASS.
- Control Tower does not query a gross marketplace source directly.
- Current repository has no verified production reconciled-revenue provider, therefore production shell remains NOT_CONNECTED until such a provider is connected.
- Production writes: none.
- Gate: TASK-016 **DONE**; TASK-017 may proceed.

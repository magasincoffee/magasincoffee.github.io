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

- Branch: `feat/control-tower-revenue-gate`
- Workflow: `Owner Control Tower Tests`
- Contract/regression run: `35315205100`
- Result: **PASS**
- Trusted + `RECONCILED` + reporting-date match returns `ACTUAL`: PASS.
- Reconciled zero revenue remains a valid ACTUAL zero: PASS.
- Unreconciled/gross candidate fails closed to `GAP` and exposes no amount: PASS.
- Reconciled but untrusted source fails closed: PASS.
- Wrong reporting date fails closed: PASS.
- Missing verified production reader returns `NOT_CONNECTED`; no marketplace/Sapo gross value is substituted.
- Reader failure remains section-local `GAP`: PASS.
- BUG-CT-003 regression: Revenue `ESTIMATE` cannot retain a numeric amount.
- Current repository has no source-controlled verified revenue read model, so production integration intentionally stays fail-closed until a reconciled source is connected.
- Production writes: none.
- Gate: TASK-016 **DONE**; TASK-017 may proceed.


## 2026-09-18 — TASK-017 Partial-source/error-state integration

- Branch: `fix/control-tower-partial-source-isolation`
- Workflow: `Owner Control Tower Tests`
- Regression/integration run: `35315663580`
- Result: **PASS**
- Unexpected source exception becomes section-local `GAP`: PASS.
- Healthy sections continue loading after another source throws: PASS.
- Partial Workforce `ESTIMATE` remains explicit while healthy Payables stays `ACTUAL`: PASS.
- Revenue failure remains fail-closed with no numeric amount: PASS.
- Owner auth denial boundary is completed before Revenue/Payables/Workforce source loading begins: PASS.
- Source exception details are not leaked into UI fallback messages: PASS.
- Existing Revenue/Payables/Workforce/Auth regression suite: PASS.
- Production writes: none.
- BUG-CT-004: VERIFIED.
- Gate: TASK-017 **DONE**; TASK-018 may proceed.

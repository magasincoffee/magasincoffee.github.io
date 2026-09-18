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


## 2026-09-18 — Post-TASK-016 revenue blank-amount regression

- Branch: `fix/control-tower-revenue-blank-amount`
- Workflow: `Owner Control Tower Tests`
- Regression run: `35315530551`
- Result: **PASS**
- Trusted + RECONCILED row with `amount: null`, empty string or whitespace now fails closed to `GAP`: PASS.
- Genuine numeric zero remains valid ACTUAL revenue: PASS.
- BUG-CT-004: VERIFIED.
- Project task state unchanged; TASK-017 remains current.

## 2026-09-18 — TASK-017 Partial-source/error-state integration

- Branch: `feat/control-tower-source-isolation`
- Workflow: `Owner Control Tower Tests`
- Pre-fix regression run: `35315562834` — **FAIL as expected** against the old controller.
- Fixed HEAD regression/integration run: `35315590063` — **PASS**.
- Unexpected source exceptions are converted to section-local `GAP`: PASS.
- Source exception details are not exposed in the fallback section: PASS.
- Malformed source results fail closed: PASS.
- One failed source preserves healthy sibling source results: PASS.
- Owner authentication remains the only path that can show the permission-denied screen: PASS.
- Revenue / Payables / Workforce loaders all run behind the source-isolation boundary: PASS.
- BUG-CT-005: VERIFIED.
- Production writes: none.
- Gate: TASK-017 **DONE**; TASK-018 may proceed.


## 2026-09-18 — TASK-018 Control Tower browser E2E + Day-7 usability gate

- Branch: `test/control-tower-browser-e2e`
- Workflow: `Owner Control Tower Tests`
- Initial browser run: `35316203307` — **FAIL** only because the harness counted the expected non-Owner denial diagnostic as an unexpected console error.
- Fixed regression/browser run: `35316292673` — **PASS**.
- Owner Home → Control Tower browser navigation: PASS.
- Active Owner identity + reporting context: PASS.
- Revenue without a verified reader remains `NOT CONNECTED` and numeric value stays hidden: PASS.
- Payables trusted read fixture renders `ACTUAL`: PASS.
- Workforce trusted read fixture renders `ACTUAL`; staffing-gap remains `—` because no verified shortage read model exists: PASS.
- Inventory and Task/SOP not-yet-connected states remain explicit: PASS.
- Non-Owner is denied before any data-source read: PASS.
- One Payables source failure leaves Workforce healthy and keeps the dashboard visible: PASS.
- Drill-down links target existing Mua hàng and Workforce modules: PASS.
- Browser path exercised only read models/read RPCs: PASS; production writes: none.
- Mobile 390px viewport: PASS; no horizontal overflow.
- Unexpected console errors: 0; page errors: 0; request failures: 0; HTTP 5xx: 0.
- BUG-CT-006 harness false positive: VERIFIED.
- Day-7 Owner Control Tower usability gate: **PASS** for the current explicitly partial/read-only V1 slice.
- Gate: TASK-018 **DONE**; Day 8–10 People/Shift review may proceed.

## 2026-09-18 — TASK-020 Staffing-gap read adapter + unit/regression contract

- Branch: `feat/task-020-staffing-gap-read-adapter`
- Workflow: `Owner Control Tower Tests`
- Regression/browser run: `35317933172`
- Result: **PASS**
- Generation selection mirrors current Publish engine: first DRAFT/REVIEWED row, otherwise first returned row.
- Staffing shortage mirrors existing generator semantics: assigned headcount below `minimum_headcount`.
- Missing generation/source/malformed requirement fails closed; no fabricated zero.
- Existing generation with zero active requirements returns verified ACTUAL zero gaps, matching generator semantics.
- Skill-bound requirement coverage regression: PASS.
- Adapter RPC surface is read-only: `list_schedule_generations`, `get_workforce_staffing_requirements`, `get_schedule_generation_assignments`.
- Forbidden schedule/transfer write RPC regression: PASS.
- Existing Control Tower browser E2E: PASS.
- Production writes/migrations: none.
- Gate: TASK-020 **DONE**; TASK-021 may proceed.

## 2026-09-18 — TASK-021 Control Tower staffing-gap integration

- Branch: `feat/task-021-control-tower-staffing-gap`
- Workflow: `Owner Control Tower Tests`
- Adapter/integration/browser run: `35318311909`
- Result: **PASS**
- Workforce attention consumes the verified staffing-gap read adapter: PASS.
- Existing generation rows are reused; `list_schedule_generations` is not duplicated per store: PASS.
- Full scoped source returns ACTUAL staffing-gap count: PASS.
- Partial/missing store generation redacts staffing gap instead of synthesizing zero: PASS.
- Existing unresolved attention (PENDING transfer + DRAFT/REVIEWED generation) remains intact: PASS.
- Browser E2E renders a verified staffing gap fixture: PASS.
- Browser path remains read-only; added RPCs are read-only requirements/assignment reads only.
- One unrelated source failure still leaves Workforce usable: PASS.
- Production writes/migrations: none.
- Gate: TASK-021 **DONE**; TASK-022 may proceed.

## 2026-09-18 — TASK-021 Control Tower staffing-gap integration

- Branch: `feat/task-021-control-tower-staffing-gap`
- Workflow: `Owner Control Tower Tests`
- Implementation regression/browser run: `35318333955`
- Result: **PASS**
- Workforce attention reuses the verified TASK-020 staffing-gap reader: PASS.
- Existing generation rows are passed into the gap reader; no duplicate `list_schedule_generations` call per store: PASS.
- Staffing gaps aggregate only when every accessible store has verified `ACTUAL` gap data: PASS.
- Any missing generation/requirements/assignments source redacts the aggregate staffing-gap number instead of fabricating zero: PASS.
- Pending transfer + DRAFT/REVIEWED unresolved attention remains available as a verified lower bound under partial-source failure: PASS.
- Deterministic browser fixture renders Workforce `ACTUAL`, staffing gap `1`, unresolved `2`: PASS.
- Payables-source degradation still leaves Workforce healthy and dashboard usable: PASS.
- Browser/adapter RPC surface remains read-only; schedule generation/review/publish/transfer-review writes are not invoked.
- Production writes/migrations: none.
- Gate: TASK-021 **DONE**; TASK-022 may proceed.


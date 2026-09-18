# Business OS QA Test Log

## 2026-09-18 — TASK-009 Store/Product canonical foundation review

- Branch: `feat/store-product-foundation-review`
- Contract: `02_CORE/contracts/store-product-foundation.v1.json`
- Review: `01_DOCS/MAGASIN/04_DATA_MODEL/STORE_PRODUCT_FOUNDATION_REVIEW.md`
- Workflow: `Business OS Contract Tests`
- Run: `35309405194`
- Result: **PASS**
- Location scope `STORE | WAREHOUSE`: PASS.
- Product/item scope covers `SELLABLE | MATERIAL | TOPPING | PACKAGING | ASSET | OTHER`: PASS.
- Unit conversion positive-factor invariant: PASS.
- Scope-leak guards for price/stock/supplier/channel fields: PASS.
- Production mutation/backfill: none.
- Gate: TASK-009 **DONE**; TASK-010 may proceed.

## 2026-09-18 — TASK-010 Database baseline/migration plan

- Branch: `docs/database-baseline-migration-plan`
- Plan: `07_DATABASE/BASELINE_MIGRATION_PLAN_V1.md`
- Contract: `02_CORE/contracts/database-baseline-plan.v1.json`
- Contract regression run: `35309647967`
- Result: **PASS**
- Expand→Map→Migrate→Contract strategy: PASS.
- Production apply requires Owner: PASS.
- Read-only live schema inventory required before production: PASS.
- Ambiguous legacy `GOODS` remains unresolved instead of auto-classified: PASS.
- Initial destructive Store/Product operations forbidden: PASS.
- CI regression BUG-BOS-001 fixed; all Business OS contract tests now execute.
- Production mutation/backfill: none.
- Gate: TASK-010 **DONE**; TASK-011 may proceed.

## 2026-09-18 — TASK-011 Owner Control Tower vertical-slice plan

- Branch: `docs/owner-control-tower-v1-plan`
- Plan: `01_DOCS/MAGASIN/05_SYSTEM/OWNER_CONTROL_TOWER_V1_PLAN.md`
- Contract: `02_CORE/contracts/owner-control-tower.v1.json`
- Contract run: `35309847981`
- Result: **PASS**
- Owner-only read attention layer: PASS.
- Partial-source tolerance: PASS.
- No synthetic-number invariant: PASS.
- Revenue reconciliation/data-quality gate: PASS.
- No new write action in initial shell: PASS.
- Healthy/partial/error/empty + browser navigation acceptance requirements present.
- Gate: TASK-011 **DONE**; implementation queue TASK-012–TASK-018 derived.

## 2026-09-18 — TASK-023 SOP/Task current-system gap review

- Branch: `docs/task-023-sop-task-gap-review-final`
- Review: `01_DOCS/MAGASIN/05_SYSTEM/SOP_TASK_V1_GAP_REVIEW.md`
- Contract: `02_CORE/contracts/sop-task-gap-plan.v1.json`
- Workflow: `Business OS Contract Tests`
- Run: `35320970148`
- Result: **PASS**
- Existing SOP workspace classified as registry/index skeleton: PASS.
- Manager hard-coded Task examples classified as prototype, not operational facts: PASS.
- Employee Task indefinite-loading placeholder recorded as unconnected: PASS.
- Owner Control Tower Task/SOP source remains NOT_CONNECTED until a verified reader exists: PASS.
- Stale Manager `/05_MANAGER/Cong-viec/` legacy-runtime target recorded as technical gap: PASS.
- Read-only live `public` schema structural inventory found no named Task/SOP/Checklist/Exception/Corrective table/view/routine: PASS.
- Production writes/DDL/migration/backfill during inventory: none.
- New exception/corrective/overdue/verify-close Business Rules: none.
- Owner decision boundary is explicit before write-capable SOP/Task workflow.
- Gate: TASK-023 **DONE**; TASK-024 may proceed.

## 2026-09-18 — TASK-026 SOP/Task rule decision + migration boundary

- Branch: `docs/task-026-sop-task-decision-pack`
- Decision pack: `01_DOCS/MAGASIN/05_SYSTEM/SOP_TASK_RULE_DECISION_PACK_V1.md`
- Contract: `02_CORE/contracts/sop-task-rule-decision-pack.v1.json`
- Workflow: `Business OS Contract Tests`
- Verified run: `35324873334`
- Result: **PASS**
- Six Owner decisions present and ordered DST-001..DST-006: PASS.
- Every decision remains `OWNER_INPUT_REQUIRED`: PASS.
- Every `selected_option` remains null: PASS.
- Decision-independent data core separated from policy automation: PASS.
- Production apply disabled and Owner-gated: PASS.
- Task writes / auto exception / auto corrective / auto escalation disabled: PASS.
- RLS required for exposed tables: PASS.
- Production mutation/backfill: none.
- Gate: TASK-026 **WAIT_USER** pending Owner answers DST-001..DST-006.

## 2026-09-18 — TASK-027 Schedule priority + completion contract

- Branch: `feat/schedule-v1-completion`
- Decision: `DEC-003`
- Plan: `01_DOCS/MAGASIN/05_SYSTEM/SCHEDULE_V1_COMPLETION_PLAN.md`
- Contract: `02_CORE/contracts/schedule-v1-completion-plan.v1.json`
- Source evidence: sanitized structure/rules from `Lịch Đk Tuần` + `Lịch làm hàng tuần`; repository Workforce; read-only live RPC inventory.
- Private employee rows committed: **none**.
- TASK-026: **DEFERRED_BY_OWNER**; DST-001..DST-006 remain unresolved.
- Production schema/backfill: none.
- Gate target: Business OS Contract Tests + Supervisor state regression.

## 2026-09-18 — TASK-028 Manager registration review hardening

- Branch: `feat/schedule-v1-completion`
- Static regression: **PASS**.
- Manager registration Playwright regression: **PASS**.
- Existing Employee Swap browser regression: **PASS**.
- Existing People/Shift Day-10 browser E2E: **PASS**.
- Existing Control Tower browser regression: **PASS**.
- Manager week navigation: PASS.
- Manager accessible-store filter forwarding to `get_manager_weekly_availability`: PASS.
- Edit write path uses `manager_update_employee_availability`: PASS.
- Direct `employee_availability` browser update: **forbidden / absent**.
- Production schema/backfill: none.
- Gate: TASK-028 **DONE**; TASK-029 may proceed.

## 2026-09-18 — TASK-029 Robot draft + Manager assignment editor

- Branch: `feat/schedule-v1-completion`
- Manager Robot DRAFT Playwright regression: **PASS**.
- Robot requires concrete store: PASS.
- `auto_generate_schedule_generation`: PASS in sanitized browser fixture.
- Assignment edit/add/remove → `replace_schedule_generation_assignments`: PASS.
- Server `validate_schedule_generation_v1` after save: PASS.
- Auto `review_schedule_generation`: **forbidden / absent**.
- Auto `publish_schedule_generation`: **forbidden / absent**.
- Existing Manager registration review browser regression: PASS.
- Existing Employee Swap browser regression: PASS.
- Existing People/Shift Day-10 E2E: PASS.
- Existing Control Tower browser regression: PASS.
- Production writes/schema/backfill during QA: none; sanitized mocks only.
- Gate: TASK-029 **DONE**; TASK-030 may proceed.

## 2026-09-18 — TASK-030 Employee weekly registration V2

- Branch: `feat/schedule-v1-completion`
- Implementation commit series culminated at `43de2bf3cc22e935df8b244cb735462eab6f6c67`.
- Business OS Contract Tests run `35328605839`: **PASS**.
- People Shift Day-10 Tests run `35328605806`: **PASS**.
- Supervisor Tests run `35328605763`: **PASS**.
- SOP Task regressions run `35328605777`: **PASS**.
- Multiple availability windows on same day: PASS.
- AVAILABLE / PREFERRED / UNAVAILABLE: PASS.
- UNAVAILABLE stores no preferred store: PASS.
- Delete refreshes saved state immediately: PASS.
- Week navigation re-queries the server contract: PASS.
- Exact “Cả Ngày” semantics not invented: PASS.
- Production schema/backfill: none.
- Gate: TASK-030 **DONE**; TASK-031 may proceed.

## 2026-09-18 — TASK-031 Manager official schedule workspace

- Branch: `feat/schedule-v1-completion`
- People Shift workflow run: `35332605981`
- Result: **PASS**.
- Manager official schedule browser regression: PASS.
- Employee Availability V2 browser regression: PASS.
- Existing People/Shift Day-10 E2E: PASS.
- Existing Control Tower browser regression: PASS.
- Deep-link `/05_MANAGER/Lich-lam/` uses canonical runtime: PASS.
- Official rows load through `get_manager_weekly_schedule`: PASS.
- Store/week scoped reader: PASS.
- Explicit Manager `DRAFT → REVIEWED → PUBLISHED`: PASS.
- Robot auto-review / auto-publish: forbidden.
- BUG fixed during gate: published week/store context was initially lost when official view was opened after publish; regression now preserves `weekStart` + `storeId`.
- Direct browser write to `work_schedules`: absent.
- Production schema/backfill: none.
- Gate: TASK-031 **DONE**; TASK-032 may proceed.

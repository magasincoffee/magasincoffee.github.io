# MAGASIN UI/UX V2 — UI2-017 EXACT-MAIN CLOSURE EVIDENCE

**Task:** UI2-017 — Full UI V2 exact-main regression + cold/reload + closure evidence  
**Assignment:** UI2-017-A001  
**Exact baseline:** `main @ f98cfb15a47bbb66ad39c71348bb2668cf174364`  
**Execution branch:** `ui2/ui2-017-exact-main-closure`  
**Track status:** **CLOSURE-READY CANDIDATE / AWAITING PLANNER VERIFY / NOT YET CLOSED**  
**Authority:** only Planner/Owner may ACCEPT UI2-017 and declare the UI/UX V2 track CLOSED.

## 1. Scope and boundary

UI2-017 is a closure/regression task. It does not create a feature, route, module, writer, state machine, RPC/API, data source, RLS/schema/migration, protected-table browser DML, business rule, role scope or store authority.

The exact-main post-merge executable baseline is the UI2-016 merge commit:

`f98cfb15a47bbb66ad39c71348bb2668cf174364`

The UI2-017 branch is required to remain executable-equivalent to that SHA. UI2-017 changes are limited to QA/workflow/closure documentation unless a bounded UI-only defect is reproduced. No bounded production defect was required before this evidence document was created.

## 2. Canonical UI2 task ledger

| Task | Canonical PR | Reviewed head | Merge commit | Evidence status |
|---|---:|---|---|---|
| UI2-001 | #307 | `14f110090ac7afea7dbb09e27767604477800b6a` | `54066b4586923b5e4edd8ea6c6c5ed77e9b0a89f` | ACCEPTED / MERGED — presentation audit + migration map |
| UI2-002 | #308 | `80b48432df46ff0b93da3b295c6179d218b7f334` | `b213cf86171d69011d3d1980767dd467da5dd46c` | ACCEPTED / MERGED — shared tokens + primitives |
| UI2-003 | #309 | `f6b1ac06512ffb608efe13144e10f8eefccb9542` | `d66e112f1f41d96d0236ed9fabdd315b9f5ec374` | ACCEPTED / MERGED — canonical Auth UI V2 |
| UI2-004 | #310 | `57fa7d2e4a61e3ddfc31632011e7dd88e99e7283` | `6bd7f74abe0535050bf66ac64204ab34d0790468` | ACCEPTED / MERGED — shared Manager/Owner shell |
| UI2-005 | #311 | `308ff241ffdfa3d242ddd68841673ffce6117ade` | `ca2b4cb2c2ee9fcc55c8029dc2df63f7987d6705` | ACCEPTED / MERGED — Employee mobile shell |
| UI2-006 | #312 | `6bc427723032a413e50a9adc2966747b440352af` | `c6eea7fd67d1432675707539164e7ed006e6fd39` | ACCEPTED / MERGED — Employee Today |
| UI2-007 | #313 | `3caf3462fba961b01571e3f40ca842b6ab89b97c` | `c4fae1ac7ae9f6ee33acac7ecf19749d8353fa88` | ACCEPTED / MERGED — Employee Schedule |
| UI2-008 | #314 | `0ba34b4ba335e7729c5a05b09fce04170125db59` | `b6d5d0f86907c6d2d69dc6b1e94e187dba3940a4` | ACCEPTED / MERGED — Availability + Swap/Give |
| UI2-009 | #315 | `f0bbbbc292cc949fd9a93631ac850f4bf3bdcf44` | `c49d84d968163b788f9434ddece75dd49c87a252` | ACCEPTED / MERGED — Attendance + Payroll + Profile |
| UI2-010 | #316 | `7a2dd020efb3cc5a334bdfd5f4826cfb0bd969f1` | `0d1927d12f5bb948ebe42fe2915f71d0ffe02cba` | ACCEPTED / MERGED — Employee 360/390/430 acceptance |
| UI2-011 | #318 | `8524f8d6e91b680e8bd56fc825245cefd7477ab9` | `7a567cda2d0e3e7c781db97ec2ef47db995db3da` | ACCEPTED / MERGED — Manager shell + Today; #317 is a superseded unmerged attempt and is non-canonical |
| UI2-012 | #319 | `5200257348ee71695c4150cab0ecc9aac7cc4adf` | `2ee36084211f5577ab4613d48c49e43d7c9311cf` | ACCEPTED / MERGED — Manager scheduling |
| UI2-013 | #320 | `626771dd32e17ad8e483033e806b79f79481c044` | `11f8a932b87ff1e10356142d2a1a195ac23f0625` | ACCEPTED / MERGED — Manager operations |
| UI2-014 | #321 | `7716b17012bd1f74d49fe0a749bff68b45f39c7a` | `2a341ad8aaecb67feab35731f660ffb28fa17bf6` | ACCEPTED / MERGED — Owner Overview + Attention |
| UI2-015 | #322 | `f6bada0df5bcfb88a3c84b0716694a06ab5713c4` | `329e0797e313328db5834459d49cff3e99fd77fd` | ACCEPTED / MERGED — Owner drill-down workspace |
| UI2-016 | #323 | `3fc5389513edab8d1415ed0417f3632caa3da7db` | `f98cfb15a47bbb66ad39c71348bb2668cf174364` | ACCEPTED / MERGED — cross-role responsive/a11y consistency |
| UI2-017 | #324 | branch `ui2/ui2-017-exact-main-closure` | **NOT MERGED** | EXECUTOR CLOSURE EVIDENCE IN PROGRESS / AWAITING PLANNER VERIFY |

No later UI2 task exists after UI2-017.

## 3. Fresh exact-main runs after UI2-016 merge

All rows below executed with `head_sha=f98cfb15a47bbb66ad39c71348bb2668cf174364`.

| Gate | Run | Job | Result |
|---|---:|---:|---|
| UI2 Cross Role Acceptance | `36298559714` | `108561827063` | **SUCCESS** |
| People Shift Day-10 Tests | `36298559753` | `108561826883` | **SUCCESS** |
| Owner Control Tower Tests | `36298559691` | `108561826750` | **SUCCESS** |
| SOP Task Tests | `36298559682` | `108561826793` | **SUCCESS** |
| Validate MAGASIN GitHub Pages source | `36298559710` | see Actions run | **SUCCESS** |
| Procurement QA Robot | `36298559701` | `108561827024` | **FAILURE — known external data drift only; UI/static/route/diagnostics PASS** |

Exact-main UI2 Cross Role artifact: `ui2-016-cross-role-36298559714` (artifact `10924098045`).  
Exact-main People Shift artifact: `people-shift-day10-e2e-36298559753` (artifact `10925057091`).  
Exact-main Owner artifact: `owner-control-tower-e2e-36298559691` (artifact `10925156355`).  
Exact-main Procurement artifact: `procurement-qa-36298559701` (artifact `10924597306`).

### Exact-main cross-role matrix

- Auth: 390 / 768 / 1280 — PASS.
- Employee: 360 / 390 / 430 / 768 — PASS.
- Manager: 1440 / 1024 / 768 / 390 — PASS.
- Owner: 1280 / 768 / 390 — PASS.
- Manager 1024 shell/Today: page width 1024/1024, shell and Today touch minima 44px, visible focus, 310px drawer, coherent keyboard/ESC behavior.
- Manager Scheduling 1024: page width 1024/1024, touch minimum 44px, seven-day board horizontally contained inside its region.
- Manager Operations 1024: Swap/Attendance/Employees/Payroll all page-contained with touch minimum 44px.
- Owner 768/390: touch minimum 44px; Workforce/Procurement/Access remain contained.
- Auth 390: page width 390/390, touch minimum 44px, visible focus.
- Employee 360/390/430: page width equals viewport, bottom navigation remains bounded, primary controls >=44px.
- UI2 browser diagnostics: no unexpected page errors, console errors, relevant request failures or HTTP 5xx in accepted UI2 cross-role/People Shift/Owner gates.

## 4. Procurement external data issue — deliberately not masked

The exact-main Procurement workflow is overall red because the production dataset is currently **51 reference-priced items out of 82 catalog items**, while the historical browser integrity expectation is the older 51/55 shape.

Exact-main run `36298559701` proved:

- `PROCUREMENT_STATIC_QA=PASS`;
- production source route `/04_OWNER/Procurement/` responds correctly;
- friendly route `/nhap-hang/` responds correctly;
- app loaded, all five domain tabs, report refresh, dialogs, reference price prefill/conversion, order total, canonical units and DB validity checks passed;
- `console_errors=PASS`;
- `page_errors=PASS`;
- relevant request diagnostics passed;
- `http_5xx=PASS`.

The only failing assertions are the pre-existing reference coverage/missing-set expectations caused by the 82-item catalog with 31 items lacking reference price rows. UI2-017 does **not** change this data, does not weaken the integrity assertion and does not manufacture a green Procurement workflow.

This is an external data/integrity issue outside UI/UX V2 presentation closure.

## 5. UI2-017 cold/new-context/reload contract

UI2-017 adds a bounded browser closure gate that runs on an executable-equivalent branch derived from exact main and must prove:

1. fresh browser context Login → Employee routing;
2. fresh browser context Login → Manager routing;
3. fresh browser context Login → Owner routing;
4. Employee direct deep link → hard reload → second deep link → browser Back → hard reload, preserving canonical runtime/hash;
5. Manager direct deep link → hard reload → second deep link → browser Back → hard reload, preserving canonical runtime/hash;
6. Owner Workforce fresh entry + hard reload preserving the canonical UI2-016 runtime;
7. UI2-016 cache-busted shared/Manager/Owner assets return successfully with exact `v=20260927-ui2-016` references;
8. affected cache chain contains no stale UI2-011/012/013/shared-shell previous-version reference;
9. browser diagnostics remain clear.

The existing exact-main accepted UI2-015 report separately proves:

- Owner Workforce reload/deep-link state;
- `/nhap-hang/` friendly source reload/back compatibility;
- Access → Overview → Access → Attention → Access round trip;
- Finance has zero clickable route and zero runtime.

## 6. Canonical authority boundaries

Closure evidence preserves all accepted authority contracts:

- Auth role routing remains OWNER → `/04_OWNER/`, STAFF/EMPLOYEE → `/06_EMPLOYEE/`, Manager-class roles → `/05_MANAGER/`.
- Employee continues using existing canonical Schedule, Availability, Swap/Give, Attendance, Payroll and Profile readers/writers.
- Manager scheduling continues using the existing canonical scheduling writer/state machine; UI2 adds presentation only.
- Owner Workforce reuses the same Manager scheduling truth/writer; there is no Owner parallel scheduling truth.
- Procurement domain behavior and `/nhap-hang/` compatibility remain unchanged.
- Owner Finance remains reserved **NOT CONNECTED**, with no route/runtime/reader/KPI.
- No UI2-017 runtime/domain/schema/data migration is authorized.

## 7. State reconciliation decision

`01_DOCS/MAGASIN/00_CURRENT_STATE.md` and `01_DOCS/MAGASIN/00_PROJECT_STATE.json` intentionally remain unchanged in UI2-017 Executor work because they carry independent PFC/Workforce state and UI2-017 has not yet been Planner-ACCEPTED.

The P0 execution plan is updated only to mark UI2-001→016 as accepted/merged and UI2-017 as a closure-ready candidate awaiting Planner verification.

If Planner ACCEPTS UI2-017 and merges its PR, Planner/Owner may then declare the UI/UX V2 track CLOSED without rewriting or superseding independent PFC/Workforce state.

## 8. STOP boundary

Executor must stop with the UI2-017 PR OPEN and unmerged.

**Current closure verdict in this document:** CLOSURE-READY CANDIDATE / **AWAITING PLANNER VERIFY**.  
This document does not self-ACCEPT UI2-017 and does not declare the project CLOSED.

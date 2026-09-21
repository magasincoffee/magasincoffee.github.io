# MAGASIN Business OS — Task Queue

**Plan:** BOS V1 / 21 days  
**Rule:** mỗi implementation task mục tiêu <= ~20 phút active work; lớn hơn phải chia.

| ID | Task | Est. | Gate | Status |
|---|---|---:|---|---|
| TASK-001 | Supervisor Robot discovery + bootstrap contract | 20m | spec + safe stop rules | DONE |
| TASK-002 | Supervisor project-state reader | 15m | unit tests | DONE |
| TASK-003 | Supervisor continuation decision engine | 20m | unit + regression | DONE |
| TASK-004 | Supervisor ChatGPT UI adapter spike | 20m | local non-destructive smoke | DONE |
| TASK-005 | Supervisor reconnect/retry policy | 15m | simulated failure tests | DONE |
| TASK-006 | Supervisor action executor: Continue / safe Retry | 20m | unit + local dry-run | DONE |
| TASK-007 | Supervisor START/STOP launcher + kill switch | 20m | local smoke | DONE |
| TASK-008 | Supervisor autonomy E2E loop | 20m | live bounded E2E | DONE |
| TASK-009 | Store/product canonical model review | 20m | discovery trace | DONE |
| TASK-010 | Database baseline/migration plan | 20m | schema review | DONE |
| TASK-011 | Owner Control Tower vertical-slice plan | 20m | acceptance defined | DONE |

| TASK-012 | Control Tower shell + normalized fixture contract | 20m | unit/fixture tests | DONE |
| TASK-013 | Owner home navigation + route/auth integration | 15m | integration test | DONE |
| TASK-014 | Procurement/payables read adapter | 20m | adapter tests | DONE |
| TASK-015 | Workforce attention read adapter | 20m | adapter tests | DONE |
| TASK-016 | Revenue read-adapter + reconciliation quality gate | 20m | contract tests | DONE |
| TASK-017 | Partial-source/error-state integration | 20m | regression tests | DONE |
| TASK-018 | Control Tower browser E2E + Day-7 usability gate | 20m | browser E2E | DONE |

| TASK-019 | People/Shift current-system gap review + acceptance contract | 20m | discovery/contract | DONE |

| TASK-020 | Staffing-gap read adapter + unit/regression contract | 20m | unit + forbidden-write regression | DONE |
| TASK-021 | Control Tower staffing-gap integration | 20m | adapter/integration + browser regression | DONE |
| TASK-022 | People/Shift browser E2E + Day-10 usability gate | 20m | browser E2E | DONE |

| TASK-023 | SOP/Task current-system gap review + acceptance contract | 20m | discovery/contract | DONE |
| TASK-024 | Manager Task route canonicalization + smoke regression | 15m | route/static + browser smoke | DONE |
| TASK-025 | SOP/Task fail-closed UI integrity gate | 20m | static/unit + browser regression | DONE |
| TASK-026 | SOP/Task rule decision pack + data/migration plan | 20m | traceability/contract + Owner boundary | DEFERRED |
| TASK-027 | Control Panel local GitHub Runner lifecycle + reboot recovery | 20m | PowerShell syntax + control regression | DONE |
| TASK-028 | Five-Step architecture reset + delete/defer map | 20m | architecture/source-of-truth review | DONE |
| TASK-029 | Schedule-first canonical flow contract | 20m | QUESTION/DELETE map + canonical ownership/data/RPC contract | DONE |
| TASK-030 | Employee weekly availability canonical slice | 20m | unit + browser regression | DONE |
| TASK-031 | Manager allocation + robot proposal + publish slice | 20m | integration + browser E2E | DONE |
| TASK-032 | Published schedule → attendance/swap/notification integration gate | 20m | end-to-end operating-loop gate + SFB-001/SFB-002 Owner boundary | DONE |
| TASK-033 | Give Shift production primitive | 20m | migration/RLS/RPC + browser E2E | DONE |
| TASK-034 | Notification event-outbox production | 20m | migration/RLS/triggers + SQL/integration tests | DONE |
| TASK-035 | MAGASIN email adapter/config | 20m | Gmail OAuth adapter + secret-store activation gate | DEFERRED |

| TASK-036 | Schedule-first closure regression + recovery gate | 20m | full canonical-flow regression + fail-closed external-email check + recovery/resume evidence | DONE |

TASK-026 remains a valid Owner decision pack but is deferred; it no longer blocks the enterprise queue. Architecture execution is now schedule-first under `00_ARCHITECTURE_5_STEP_RESET.md`. Every new task must pass QUESTION → DELETE → SIMPLIFY → ACCELERATE → AUTOMATE before implementation.

## Execution rule

Task tiếp theo chỉ chạy khi task hiện tại đạt Definition of Done hoặc được chuyển rõ sang `WAIT_USER` / `BLOCKED`.

Supervisor chỉ auto-continue khi `00_PROJECT_STATE.json` cho phép.
| TASK-037 | Windows auto-reboot/logon recovery | 75m | runner + Supervisor + Business Chrome autostart / Owner STOP latch | DONE |
| TASK-038 | Night-run persistence | 35m | deadline + cursor + lease + checkpoint + hard-stop contract | DONE |
| TASK-039 | Business OS Robot V2 project registry | 60m | two-project registry + project adapter contract | DONE |
| TASK-040 | Business OS Robot V2 portfolio scheduler | 55m | project isolation + WAIT_USER skip policy | DONE |
| TASK-041 | Business OS Robot V2 recovery engine | 45m | crash/reboot/reconnect/stale lease/duplicate suppression | DONE |
| TASK-042 | SaydiVoiceProvider production adapter offline | 90m | request/result + preflight + one-attempt + timeout/error/unit tests | DONE |
| TASK-043 | Cross-project handoff integration | 50m | Business OS → Media Robot → Business OS state isolation | DONE |
| TASK-044 | Portfolio-aware diagnostics | 45m | project/task/checkpoint/error privacy-safe logs | DONE |
| TASK-045 | Restart/resume simulation | 50m | kill/restart/reconcile/resume regression | DONE |
| TASK-046 | Night full QA | 35m | both-project regression + bounded fixes | DONE |
| TASK-047 | Night docs / evidence / PR prep | 20m | changelog/test logs/reviewable PRs | DONE |
| TASK-048 | Night final checkpoint | 10m | background hard-stop only; preserve later Owner task | DONE |
| TASK-049 | Supervisor Three-Lane owner-bound Brain/Work orchestration | 120m | 3 fixed lanes + Owner Brain URLs + Robot-managed Work URLs + screenshot/full-text relay + full-only Work rollover + auto-upgrade | PAUSED — no further expansion during architecture discussion |

| TASK-050 | Canonical enterprise architecture locked — Profitability & Cash first | Owner detailing | Apply Five-Step continuously across every aspect; derive implementation queue from canonical architecture; Robot release requires explicit Owner approval | WAIT_USER / ARCHITECTURE_LOCKED / ROBOT_PAUSED |

| TASK-051 | PFC source inventory + delete/defer map | 20m | verified existing financial sources + trust/quality classification + explicit non-goals | DONE |
| TASK-052 | Financial Truth contract v1 | 20m | canonical period/scope/quality/source/as-of/lineage contract; no synthetic zero | DONE |

TASK-051 restart completion evidence: `01_DOCS/MAGASIN/02_PROFITABILITY_CASH/TASK_051_PFC_SOURCE_INVENTORY_EVIDENCE_V1.md`. Missing external sources remain explicit GAP/NOT_CONNECTED and do not block AUTO_CONTINUE.
TASK-052 reconciliation repair is closed. Canonical evidence: `01_DOCS/MAGASIN/02_PROFITABILITY_CASH/TASK_052_FINANCIAL_TRUTH_CONTRACT_V1_EVIDENCE.md`. Business OS Contract Tests run `35446467271` completed successfully on Node v20.20.2; TASK-053 is released.
TASK-053 completion evidence: `01_DOCS/MAGASIN/02_PROFITABILITY_CASH/TASK_053_MONTHLY_REVENUE_BASELINE_V1_EVIDENCE.md`. Remote Business OS Contract Tests run `35447380002` succeeded on Node v20.20.2; TASK-054 is released.
TASK-054 completion evidence: `01_DOCS/MAGASIN/02_PROFITABILITY_CASH/TASK_054_REVENUE_BASELINE_INTEGRATION_EVIDENCE.md`. Final-head Owner Control Tower Tests run `35448195046` and collateral People Shift Day-10 run `35448195053` both succeeded on Node v20.20.2; Business OS remote workflow was NOT_APPLICABLE because no Core/business-os trigger path changed. TASK-055 is released.
TASK-055 completion evidence: `01_DOCS/MAGASIN/02_PROFITABILITY_CASH/TASK_055_CASH_BRIDGE_CONTRACT_V1_EVIDENCE.md`. Final PR-head Business OS Contract Tests run `35449121493` and post-merge run `35449153835` both succeeded on Node v20.20.2; TASK-056 is released.
TASK-056 completion evidence: `01_DOCS/MAGASIN/02_PROFITABILITY_CASH/TASK_056_CASH_BRIDGE_CALCULATOR_V1_EVIDENCE.md`. Calculator PR #179 final-head run `35450713132` and merge run `35450750950` succeeded on Node v20.20.2. Recovery corrected one stale TASK-055 contract assertion without changing calculator semantics; same-branch final PR #180 run `35450826348` and exact post-merge run `35450894238` also succeeded on Node v20.20.2. TASK-057 remains released.
TASK-057 completion evidence: `01_DOCS/MAGASIN/02_PROFITABILITY_CASH/TASK_057_PROCUREMENT_FINANCIAL_TRUTH_MAPPING_V1_EVIDENCE.md`. Final PR-head Business OS Contract Tests run `35451826117` and exact post-merge run `35451862102` both succeeded on Node v20.20.2; TASK-058 is released.
TASK-058 completion evidence: `01_DOCS/MAGASIN/02_PROFITABILITY_CASH/TASK_058_PARTIAL_FINANCIAL_BASELINE_V1_EVIDENCE.md`. Final PR-head Business OS Contract Tests run `35453217344` and exact post-merge run `35453257400` both succeeded on Node v20.20.2; TASK-059 is released.
TASK-059 completion evidence: `01_DOCS/MAGASIN/02_PROFITABILITY_CASH/TASK_059_PFC_3H_FINAL_HANDOFF_EVIDENCE.md`. Fresh regression reused executable-equivalent workflows without code churn: Business OS run `35453257400` attempt 2 = 214/214 logical checks green on Node v20.20.2; Owner Control Tower run `35448195046` attempt 2 = 74/74 + browser E2E green. PFC_3H_V1_RESTART_01 is COMPLETE. TASK-060 is planned only and requires a new explicit Owner release.
| TASK-053 | Monthly Revenue baseline contract + aggregator | 20m | trusted RECONCILED revenue aggregation with quality/lineage propagation | DONE |
| TASK-054 | Revenue baseline adapter tests/integration | 20m | fail-closed ACTUAL/GAP/NOT_CONNECTED + partial-source regression | DONE |
| TASK-055 | Cash event taxonomy + Cash Bridge contract v1 | 20m | opening/inflow/outflow/ending/variance categories; missing stays GAP | DONE |
| TASK-056 | Cash Bridge pure calculator + fixtures/tests | 20m | deterministic evidence-aware calculator; no bank/MoMo assumptions | DONE |
| TASK-057 | Procurement payment/AP → financial truth mapping | 20m | supplier payment cash-outflow + AP mapping; purchase != COGS | DONE |
| TASK-058 | Partial Financial Baseline snapshot v1 | 20m | Revenue + known Cash/AP + explicit missing sources in one normalized truth object | DONE |
| TASK-059 | PFC 3-hour regression + docs/state handoff | 20m | affected tests + evidence + state/docs reconciliation + next non-owner task | DONE |
| TASK-060 | Actual Cash Opening/Ending Source Truth V1 | planned | evidenced opening/observed ending balances + explicit source/account coverage; no payment-method inference | DONE |
| TASK-061 | Cash Balance Financial Truth Contract | 20m | canonical point-balance truth by account/scope/time | DONE |
| TASK-062 | Cash Balance Source Mapper | 20m | read-only evidence → canonical balance truth | DONE |
| TASK-063 | Cash Source Coverage V1 | 20m | COMPLETE/PARTIAL/NOT_CONNECTED by source/account/period | DONE |
| TASK-064 | Cash Bridge Source Integration | 20m | proven balances + coverage → Cash Bridge | DONE |
| TASK-065 | Cash Truth Regression & Evidence | 20m | cash truth regression + fail-closed proof | DONE |
| TASK-066 | OPEX Source Inventory V1 | 20m | payroll/rent/utilities/platform/marketing/OPEX source map | DONE |
| TASK-067 | Operating Cost Truth Contract | 20m | recognized cost != cash paid | DONE |
| TASK-068 | Payroll Cost Mapper | 20m | period labor-cost truth behind actuality gate | READY / AUTO_CONTINUE |
| TASK-069 | Rent / Utilities / Other OPEX Mapper | 20m | fixed/shared OPEX truth without invented allocation | QUEUED / AUTO_CONTINUE |
| TASK-070 | FoodApp Settlement & Fee Truth | 20m | gross vs fee/promo/net settlement separation | QUEUED / AUTO_CONTINUE |
| TASK-071 | Operating Cost Baseline V1 | 20m | canonical period operating-cost truth | QUEUED / AUTO_CONTINUE |
| TASK-072 | Consumption/COGS Source Coverage Map | 20m | inventory/recipe/purchase/waste evidence map | QUEUED / AUTO_CONTINUE |
| TASK-073 | Canonical COGS Input Contract | 20m | quantity/unit conversion/unit cost/packaging/topping truth | QUEUED / AUTO_CONTINUE |
| TASK-074 | Inventory Consumption Mapper | 20m | opening + inbound - ending in proven scope | QUEUED / AUTO_CONTINUE |
| TASK-075 | Recipe / Standard Cost Mapper | 20m | standard cost remains standard | QUEUED / AUTO_CONTINUE |
| TASK-076 | Consumption-based COGS Calculator V1 | 20m | COGS only with proven quantity/cost/coverage | QUEUED / AUTO_CONTINUE |
| TASK-077 | COGS Baseline Integration | 20m | canonical COGS → Partial Financial Baseline | QUEUED / AUTO_CONTINUE |
| TASK-078 | Owner Movement Truth V1 | 20m | structured contribution/withdrawal truth | QUEUED / AUTO_CONTINUE |
| TASK-079 | Debt / Capex / Working-Capital Classification | 20m | financing/capex/WC separated from Profit | QUEUED / AUTO_CONTINUE |
| TASK-080 | Profit ↔ Cash Reconciliation Contract | 20m | canonical reconciliation semantics | QUEUED / AUTO_CONTINUE |
| TASK-081 | Profit ↔ Cash Reconciliation Calculator | 20m | explain ΔCash from Profit + non-P&L movements | QUEUED / AUTO_CONTINUE |
| TASK-082 | Monthly Financial Baseline V2 | 20m | Revenue + COGS + OPEX + Profit + Cash + AP + reconciliation | QUEUED / AUTO_CONTINUE |
| TASK-083 | 8-hour Final Regression & Handoff | 20m | full QA + state/docs handoff | QUEUED / AUTO_CONTINUE |
| TASK-084 | Live Reconciled Revenue Reader Readiness | overflow | live/read-only readiness if evidence boundary exists | OVERFLOW / AUTO_CONTINUE_IF_TIME_REMAINS |
| TASK-085 | Financial Data Freshness & Coverage Contract | overflow | stale/missing/current financial data truth | OVERFLOW / AUTO_CONTINUE_IF_TIME_REMAINS |
| TASK-086 | Owner Daily Financial Brief V1 | overflow | READ → SUMMARIZE → ALERT only | OVERFLOW / AUTO_CONTINUE_IF_TIME_REMAINS |
| TASK-087 | Cash Leakage / Exception Rules V1 | overflow | detection/alert only | OVERFLOW / AUTO_CONTINUE_IF_TIME_REMAINS |
| TASK-088 | Profitability Readiness by Branch/Channel | overflow | readiness without synthetic contribution | OVERFLOW / AUTO_CONTINUE_IF_TIME_REMAINS |
| TASK-089 | Extended Regression + Next-Priority Handoff | overflow | close overflow scope safely | OVERFLOW / AUTO_CONTINUE_IF_TIME_REMAINS |

TASK-049 partial acceptance checkpoint (does not close the task):
- **E2 ACCEPTED** — PR #141 / merge `f076779c4d1e3afd709385f0558a7185caeabf51`; Vietnamese Owner UI, evidence-backed live Worker status, fixed UTC+7 display, mutually exclusive recovery controls.
- **F ACCEPTED** — Supervisor Autostart Install run `35414750942`: **212/212 PASS**, install + verify-survival success; no `WORKER_RETRY_REQUIRED` or `TECHNICAL_RECOVERY_STUCK`; Supervisor / Brain-Worker / Robot Chrome survived post-job verification.
- Overall TASK-049 remains **IN_PROGRESS** until the other acceptance items are independently reconciled.


## Owner architecture handoff gate

While TASK-050 is `ARCHITECTURE_LOCKED / ROBOT_PAUSED`:

- source-of-truth remains `WAIT_USER / PAUSED`;
- Supervisor/Brain/Work must not start implementation tasks;
- silence or an old queued task is not approval;
- no new automation expansion is allowed merely to make Robot more autonomous;
- Profitability & Cash is the enterprise critical path;
- Robot may resume only after Owner explicitly releases execution, the implementation queue traces to the canonical architecture, and `00_PROJECT_STATE.json` is explicitly returned to `READY / AUTO_CONTINUE`.

Canonical architecture: `00_ENTERPRISE_ARCHITECTURE_5_STEP_PROFIT_CASH.md` — mandatory first read.


## Profitability & Cash 3-hour autonomous queue

Canonical runbook: `02_PROFITABILITY_CASH/THREE_HOUR_EXECUTION_QUEUE_V1.md`.

TASK-051 → TASK-059 are deliberately restricted to work that does not require Owner business decisions, secrets, private production exports or destructive actions. The queue must stop at a true Owner/security boundary only. Owner explicitly released Robot on 2026-09-19. That released execution scope is now COMPLETE. TASK-060 is outside the completed release and remains `PLANNED / WAIT_OWNER_RELEASE`; Robot must stay PAUSED until a new explicit Owner release.


Execution generation: `PFC_3H_V1_RESTART_01` — Owner officially restarted and released the queue from TASK-051 on 2026-09-19. Previous partial execution evidence is historical only and must not advance the cursor.


## PFC 8-hour V2 staged queue

Owner approved plan is staged at `02_PROFITABILITY_CASH/PFC_8H_V2_EXECUTION_PLAN.md`. TASK-060 → TASK-083 are the primary 8-hour queue; TASK-084 → TASK-089 are overflow only if time remains. Owner explicitly released PFC_8H_V2 on 2026-09-20. TASK-060 is active; TASK-061 → TASK-083 may AUTO_CONTINUE; TASK-084 → TASK-089 are overflow only if time remains. Five-Step is mandatory on every task with special emphasis on SIMPLIFY → ACCELERATE → AUTOMATE.


Execution generation: `PFC_8H_V2_RUN_01` — Owner explicitly released PFC_8H_V2 on 2026-09-20. Stop only at a true Owner/security boundary or queue completion.
TASK-060 completion evidence: `01_DOCS/MAGASIN/02_PROFITABILITY_CASH/TASK_060_ACTUAL_CASH_BALANCE_SOURCE_TRUTH_V1_EVIDENCE.md`. Source discovery found no verified OBSERVED_BALANCE source in bounded Drive evidence; internal monthly cash reporting is COMPUTED_BALANCE + MOVEMENT_ONLY, while physical till, Bank, MoMo, COD, Owner-held cash and provider account balances remain NOT_CONNECTED. Google Drive remained READ-ONLY. TASK-061 is released.
TASK-061 completion evidence: `01_DOCS/MAGASIN/02_PROFITABILITY_CASH/TASK_061_CASH_BALANCE_FINANCIAL_TRUTH_CONTRACT_V1_EVIDENCE.md`. Cash Balance Truth contract/helper merged in PR #186 as `a9313eadc4492f144ca3c08b1021d1aa51f31a0b`; required PR-head run `35467911185` and exact post-merge run `35467940997` succeeded on Node v20.20.2 with TASK-061 40/40 and full Business OS 254 logical checks / 0 fail. TASK-062 is released.
TASK-062 completion evidence: `01_DOCS/MAGASIN/02_PROFITABILITY_CASH/TASK_062_CASH_BALANCE_SOURCE_MAPPER_V1_EVIDENCE.md`. Source mapper merged in PR #187 as `cf8b24715c3f6b3ed2368f5d6f568bd331130a0d`; final PR-head run `35472567129` and exact post-merge run `35472597015` succeeded on Node v20.20.2 with mapper 47/47 and full Business OS 301 logical checks / 0 fail. TASK-063 is released.
TASK-063 completion evidence: `01_DOCS/MAGASIN/02_PROFITABILITY_CASH/TASK_063_CASH_SOURCE_COVERAGE_V1_EVIDENCE.md`. Coverage contract/helper merged in PR #188 as `bc30eafa6305a9350bebd9658395f408f9f59299`; required PR-head run `35474386474` and exact post-merge run `35474418160` succeeded on Node v20.20.2 with TASK-063 35/35 and full Business OS 330 logical checks / 0 fail. TASK-064 is released.
TASK-064 completion evidence: `01_DOCS/MAGASIN/02_PROFITABILITY_CASH/TASK_064_CASH_BRIDGE_SOURCE_INTEGRATION_V1_EVIDENCE.md`. Pure source integration helper merged in PR #189 as `f00279e99ed3d1bdc4e4b0ed9c7f26a3e6f3f177`; final PR-head run `35480729934` and exact post-merge run `35480761123` succeeded on Node v20.20.2 with TASK-064 24/24 and full Business OS 354 logical checks / 0 fail. Existing Cash Bridge arithmetic remained unchanged; current TASK-060→063 source profile remains fail-closed. TASK-065 is released.
TASK-065 completion evidence: `01_DOCS/MAGASIN/02_PROFITABILITY_CASH/TASK_065_CASH_TRUTH_REGRESSION_AND_EVIDENCE.md`. Wave-A closure found NO EXECUTABLE DRIFT after TASK-064; fresh Business OS rerun `35480761123` attempt 2 / job `106005068731` succeeded on Node v20.20.2 with Financial Truth 16/16, Cash Bridge 29/29 + 46/46, Cash Balance Truth 40/40, mapper 47/47, coverage 35/35, integration 24/24 and full Business OS 354/354 / 0 fail. Static scan of six Cash/PFC helpers found no operational write/RPC/external API/Drive calls. Cash Truth Stack V1 is implemented, but live observed opening/ending and full enterprise source/account coverage remain incomplete. Wave A is CLOSED; TASK-066 is released READY / AUTO_CONTINUE.

TASK-066 completion evidence: `01_DOCS/MAGASIN/02_PROFITABILITY_CASH/TASK_066_OPEX_SOURCE_INVENTORY_V1_EVIDENCE.md`. Drive READ_ONLY bounded inventory separated RECOGNITION_SOURCE / PAYMENT_SOURCE / SETTLEMENT_SOURCE / ALLOCATION_CONTEXT / BUDGET_CONTEXT / NOT_CONNECTED. Payroll is a PARTIAL bounded recognition candidate behind actuality/rate gates; current rent/utilities/marketing/bank-fee recognition remains GAP/NOT_CONNECTED; exact historical ShopeeFood settlement fields are usable only for covered provider/date/store and current September remains incomplete; branch cash/operating ledgers remain payment/reconciliation evidence unless category + business nature + period prove recognition. Procurement purchases/payments remain outside OPEX recognition by default. No executable code/workflow was added. TASK-066 DONE; TASK-067 READY / AUTO_CONTINUE.

TASK-067 completion evidence: `01_DOCS/MAGASIN/02_PROFITABILITY_CASH/TASK_067_OPERATING_COST_TRUTH_CONTRACT_V1_EVIDENCE.md`. Source-agnostic Operating Cost Truth V1 reuses Financial Truth and separates exact recognized cost from payment, settlement proceeds, allocation context and budget context. ACTUAL exact items require actuality/period/amount/scope proof; ACTUAL PERIOD_AGGREGATE requires COMPLETE proven coverage; shared-company branch allocation requires explicit approval; historical source periods cannot become current ACTUAL. Existing Partial Financial Baseline compatibility is proven without changing Profit formula. PR #204 final head `4c9bbc2b99dd272a6f707ce2ebd422988cef9223`, merge `6233fc587921ba44a0b61a662b6b316ade8292c2`; PR-head run `35515915305` and exact post-merge run `35515946855` succeeded on Node v20.20.2 with TASK-067 31/31 and full Business OS 385/385 / 0 fail. TASK-067 DONE; TASK-068 READY / AUTO_CONTINUE.


## Workforce Operations V1 — MANUAL_WORK RELEASED / ROBOT DISABLED

Canonical architecture: `05_SYSTEM/WORKFORCE_OPERATIONS_V1_ARCHITECTURE.md`  
Execution plan: `05_SYSTEM/WORKFORCE_OPERATIONS_V1_EXECUTION_PLAN.md`  
E2E acceptance: `05_SYSTEM/WORKFORCE_OPERATIONS_V1_E2E_ACCEPTANCE_CONTRACT.md`

> Architecture is Owner-approved. Owner released Workforce Operations V1 for DIRECT MANUAL WORK execution only. Robot remains disabled for this track. TASK-090 and TASK-091 are DONE. TASK-092 Availability Weekly Cycle Hardening is DONE with evidence at 05_SYSTEM/TASK_092_AVAILABILITY_WEEKLY_CYCLE_HARDENING.md. TASK-093 is READY / MANUAL_WORK but MUST NOT auto-run; TASK-094→108 remain staged until Brain accepts each prior result. Current PFC queue remains independently authoritative.

| ID | Task | Est. | Gate | Status |
|---|---|---:|---|---|
| TASK-090 | Workforce V1 Current-System Reconciliation | 20m | reuse/delete map + no duplicate path | DONE |
| TASK-091 | Workforce V1 Canonical State + Rule Contract | 20m | state/role/rule contract | DONE |
| TASK-092 | Availability Weekly Cycle Hardening | 20m | next-week registration tests | DONE |
| TASK-093 | Manager Sunday Schedule Board V1 | 20m | Manager scheduling browser gate | READY / MANUAL_WORK |
| TASK-094 | Schedule Validation + Publish Gate | 20m | overlap/max-2/scope/publish regression | STAGED / WAIT_OWNER_RELEASE |
| TASK-095 | Employee Published Weekly Schedule V1 | 20m | publish→employee visibility E2E | STAGED / WAIT_OWNER_RELEASE |
| TASK-096 | Swap Lifecycle Reconciliation + Hardening | 20m | full swap lifecycle regression/E2E | STAGED / WAIT_OWNER_RELEASE |
| TASK-097 | Give Lifecycle Reconciliation + Hardening | 20m | full give lifecycle regression/E2E | STAGED / WAIT_OWNER_RELEASE |
| TASK-098 | Manual-Time Attendance Contract + Migration Path | 20m | no active realtime check-in/out semantics | STAGED / WAIT_OWNER_RELEASE |
| TASK-099 | Employee Attendance Entry UI V1 | 20m | manual-time submit browser E2E | STAGED / WAIT_OWNER_RELEASE |
| TASK-100 | Manager Attendance Exception Review V1 | 20m | review/adjust/confirmed-time E2E | STAGED / WAIT_OWNER_RELEASE |
| TASK-101 | Employee Profile Projection V1 | 20m | role/scope/privacy tests | STAGED / WAIT_OWNER_RELEASE |
| TASK-102 | Payroll Truth Contract V1 | 20m | estimated/finalized truth contract | STAGED / WAIT_OWNER_RELEASE |
| TASK-103 | Payroll Calculation Integration V1 | 20m | confirmed-work-time only | STAGED / WAIT_OWNER_RELEASE |
| TASK-104 | Employee Payroll Self-Check V1 | 20m | own-payroll authorization E2E | STAGED / WAIT_OWNER_RELEASE |
| TASK-105 | Employee + Manager Workforce UI Consolidation | 20m | canonical routes only + regression | STAGED / WAIT_OWNER_RELEASE |
| TASK-106 | Workforce Cross-Flow Browser E2E Pack | 20m | E2E-01→E2E-16 | STAGED / WAIT_OWNER_RELEASE |
| TASK-107 | Workforce Failure / Recovery / Security E2E | 20m | retry/reload/idempotency/RBAC | STAGED / WAIT_OWNER_RELEASE |
| TASK-108 | Workforce Final Regression + Post-Merge E2E Recheck | 20m | PR-head + exact-main + cold/reload E2E | STAGED / WAIT_OWNER_RELEASE |


## Supervisor Independent Repository Migration V1

Owner approved the independent Supervisor repository architecture and explicitly released migration execution on 2026-09-21.

Canonical migration plan: `08_AUTONOMY/SUPERVISOR_REPOSITORY_MIGRATION_V1.md`

| ID | Task | Gate | Status |
|---|---|---|---|
| MIG-001 | Freeze Baseline + Migration Bootstrap | exact baseline inventory + migration contract + target repo bootstrap plan; zero production cutover | DONE |
| MIG-002 | Extract Supervisor Platform to independent repository | source/test/windows/docs/workflows/scripts parity | READY / RESUME AFTER OWNER REPO CREATE |
| MIG-003 | Decouple Business OS-specific paths/state | platform build/test/release self-contained | QUEUED |
| MIG-004 | New-repo CI / lifecycle parity | tests + integrity + lifecycle acceptance green | QUEUED |
| MIG-005 | Single-authority production cutover | preserve lane targets/latches; no split-brain | QUEUED / OWNER-SAFE-GATE |
| MIG-006 | New-repo RBT-009 exact-SHA 8h soak | uninterrupted Tier B + privacy/exact-once evidence | QUEUED |
| MIG-007 | Deprecate old embedded Supervisor copy | rollback window closed + pointer docs only | QUEUED |

Migration invariant: the existing production Supervisor remains authoritative until MIG-005 explicitly proves cutover. RBT-009 remains IMPLEMENTATION CANDIDATE / FINAL 8H SOAK PENDING and may not be relabeled RELEASED during repository migration.


### MIG-002 owner/auth boundary

MIG-002 extraction has **not started**. Target repository `magasincoffee/magasin-supervisor` is not present. Repository creation requires an Owner-authenticated GitHub session or repository-create capability; current GitHub connector does not expose repository creation. Do not substitute another repository name and do not bypass login/MFA/CAPTCHA. Resume MIG-002 from the existing frozen baseline/map after the exact empty target repository exists. No re-freeze is required.

`ZERO_PRODUCTION_MUTATION=true`


### MIG-002 owner/auth boundary resolved

Owner created the exact target repository `magasincoffee/magasin-supervisor`. GitHub verification confirms it is public, size 0, and empty. Resume MIG-002 from frozen baseline `4f76b929c5fedc44b451abd823f0f1f7fb3e50fe` and the existing 137-record map. Do not re-freeze or substitute moving main.

`ZERO_PRODUCTION_MUTATION=true`

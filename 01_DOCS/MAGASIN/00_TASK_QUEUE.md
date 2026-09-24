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


## Workforce Scheduling Production Readiness V1 — HARD GATE ACTIVE

Canonical SoT: `05_SYSTEM/WORKFORCE_SCHEDULING_PRODUCTION_READINESS_V1_SOURCE_OF_TRUTH.md`

| ID | Scope | Status |
|---|---|---|
| SCHED-01 | Production blocker repair + canonical reconciliation | **DONE** |
| SCHED-02 | Role + authority lock | **DONE** |
| SCHED-03 | Employee Schedule UI V1 | **DONE** |
| SCHED-04 | Manager Scheduling V1 | **DONE** |
| SCHED-05 | Owner Scheduling V1 | **DONE** |
| SCHED-06 | Three-role synchronization | **READY / MANUAL_WORK** |
| SCHED-07 | Professional UI/UX + responsive pass | BLOCKED |
| SCHED-08 | Live three-role E2E acceptance | BLOCKED |
| SCHED-09 | Production reconciliation + canonical closure | BLOCKED |

SCHED-01 evidence: `05_SYSTEM/SCHED_01_PRODUCTION_BLOCKER_REPAIR_CANONICAL_RECONCILIATION.md`. Implementation PR #281 merged as `d0f0069ec4060dacf2de4ca6f695b969066b517f`; production migration `20260923160755_sched_01_production_blocker_repair_v1` is live; exact-main People Shift `35887441525 / 107271085777` and Pages gates are green; live duplicate active generation groups = 0.

SCHED-02 evidence: `05_SYSTEM/SCHED_02_THREE_ROLE_SCHEDULING_AUTHORITY_LOCK.md`. Production migration `20260923163337_sched_02_three_role_scheduling_authority_lock_v1` is live; implementation PR #283 final head `0c0cda8e011755ef9e580742e1ec92d908440012` merged as `a01d8bdb940c443fb2b3abc42275a0827db2b71a`; PR-head People Shift `35890338421 / 107280905324`, exact-main People Shift `35890519746 / 107281516643`, Pages validation `35890519568 / 107281515853` and deployment `35890518178 / 107281586624` are SUCCESS. Authority is self/store/enterprise, legacy duplicate writers are server-denied, browser protected-table DML is zero, and live data counts remain clean.

SCHED-03 evidence: `05_SYSTEM/SCHED_03_EMPLOYEE_SCHEDULE_UI_V1.md`. Implementation PR #285 final head `336319b5fb3cd68e4f5a38cb157d4c834fc429cb` merged as `e96098f8484685f224a13ea5a5bbee5887b9dbb4`; PR-head People Shift `35894008824 / 107293276082`, exact-main People Shift `35894187738 / 107293880804`, Pages validation `35894187653 / 107293880794` and deployment `35894185846 / 107293956273` are SUCCESS. Employee Schedule now uses one V2 own-APPROVED reader, server-preflights Give/Swap/Attendance identity, reconciles stale ownership, is 390px+/desktop responsive, and introduced no DB migration or fake production schedule.

SCHED-04 evidence: `05_SYSTEM/SCHED_04_MANAGER_SCHEDULING_V1.md`. Implementation PR #287 final head `67374dd48597f7241559c11091c3496641f32f4f` merged as `398f8164d676068a8bd7a8d14426e31ed948cba3`; PR-head People Shift `35897139899 / 107303772936`, exact-main People Shift `35897358395 / 107304500565` with 316/316 deterministic checks, SOP `35897358299 / 107304499985`, Pages validation `35897358345 / 107304500738`, and Pages deployment `35897357114 / 107304574534` are SUCCESS. Manager now completes one canonical Availability → DRAFT → Validate → Review → Publish flow through the existing RPC writer; publish is idempotent, reload re-reads official `work_schedules`, cross-store tampering is denied, legacy Lich-lam only wraps the canonical surface, and no DB migration/fake Manager/fake production schedule was created.

SCHED-05 evidence: `05_SYSTEM/SCHED_05_OWNER_SCHEDULING_V1.md`. Implementation PR #289 final head `870fe55f1ad76f0c8a3f3ee0280d87b6882ac690` merged as `47a8a0da64ac68e50839023e47b584f1b8b97e18`; PR-head People Shift `35937446131 / 107437565949`, exact-main People Shift `35938947897 / 107442311642` with 322/322 deterministic checks, Pages validation `35938948068 / 107442312757`, and Pages deployment `35938946623 / 107442356690` are SUCCESS. Owner Scheduling is now enterprise oversight / selected-store control over the same Manager canonical writer and RPC state machine; four-store switching clears stale projections, publish/reload/idempotency and stale revalidation pass, legacy Owner publish is compatibility-only, no direct table DML exists, and no DB migration/fake production scheduling data was created.

Current scheduling cursor: **SCHED-06 → SCHED-07**. TASK-108 remains **PAUSED_BEHIND_SCHED_GATE**. Workforce Robot remains **DISABLED**. PFC remains unchanged.

## Workforce Operations V1 — MANUAL_WORK RELEASED / ROBOT DISABLED

Canonical architecture: `05_SYSTEM/WORKFORCE_OPERATIONS_V1_ARCHITECTURE.md`  
Execution plan: `05_SYSTEM/WORKFORCE_OPERATIONS_V1_EXECUTION_PLAN.md`  
E2E acceptance: `05_SYSTEM/WORKFORCE_OPERATIONS_V1_E2E_ACCEPTANCE_CONTRACT.md`

> Architecture is Owner-approved. Owner released Workforce Operations V1 for DIRECT MANUAL WORK execution only. Robot remains disabled for this track. TASK-090→TASK-107 are DONE. TASK-107 Workforce Failure / Recovery / Security E2E is DONE with evidence at 05_SYSTEM/TASK_107_WORKFORCE_FAILURE_RECOVERY_SECURITY_E2E.md. E2E-12 is CLOSED; E2E-13 is CLOSED; E2E-14 is CLOSED. TASK-108 is PAUSED_BEHIND_SCHED_GATE / MANUAL_WORK, has not started, and MUST NOT auto-run. Current PFC queue remains independently authoritative.

| ID | Task | Est. | Gate | Status |
|---|---|---:|---|---|
| TASK-090 | Workforce V1 Current-System Reconciliation | 20m | reuse/delete map + no duplicate path | DONE |
| TASK-091 | Workforce V1 Canonical State + Rule Contract | 20m | state/role/rule contract | DONE |
| TASK-092 | Availability Weekly Cycle Hardening | 20m | next-week registration tests | DONE |
| TASK-093 | Manager Sunday Schedule Board V1 | 20m | Manager scheduling browser gate | DONE |
| TASK-094 | Schedule Validation + Publish Gate | 20m | overlap/max-2/scope/publish regression | DONE |
| TASK-095 | Employee Published Weekly Schedule V1 | 20m | publish→employee visibility E2E | DONE |
| TASK-096 | Swap Lifecycle Reconciliation + Hardening | 20m | full swap lifecycle regression/E2E | DONE |
| TASK-097 | Give Lifecycle Reconciliation + Hardening | 20m | full give lifecycle regression/E2E | DONE |
| TASK-098 | Manual-Time Attendance Contract + Migration Path | 20m | no active realtime check-in/out semantics | DONE |
| TASK-099 | Employee Attendance Entry UI V1 | 20m | manual-time submit browser E2E | DONE |
| TASK-100 | Manager Attendance Exception Review V1 | 20m | review/adjust/confirmed-time E2E | DONE |
| TASK-101 | Employee Profile Projection V1 | 20m | role/scope/privacy tests | DONE |
| TASK-102 | Payroll Truth Contract V1 | 20m | estimated/finalized truth contract | DONE |
| TASK-103 | Payroll Calculation Integration V1 | 20m | confirmed-work-time only | DONE |
| TASK-104 | Employee Payroll Self-Check V1 | 20m | own-payroll authorization E2E | DONE |
| TASK-105 | Employee + Manager Workforce UI Consolidation | 20m | canonical routes only + regression | DONE |
| TASK-106 | Workforce Cross-Flow Browser E2E Pack | 20m | E2E-01→E2E-16 | DONE |
| TASK-107 | Workforce Failure / Recovery / Security E2E | 20m | retry/reload/idempotency/RBAC | DONE |
| TASK-108 | Workforce Final Regression + Post-Merge E2E Recheck | 20m | PR-head + exact-main + cold/reload E2E | PAUSED_BEHIND_SCHED_GATE / MANUAL_WORK |

TASK-094 completion evidence: `05_SYSTEM/TASK_094_SCHEDULE_VALIDATION_PUBLISH_GATE_V1.md`. Implementation PR #239 merged as `083606b268c0da4026c3637c150481ac422e6581`; exact post-merge gate exposed an attendance iframe lifecycle race, repaired on the same TASK-094 branch in PR #240 and merged as `2ed75c6e3237b91fb4cb403a237015541a39d956`. Final exact-main People Shift run `35635895604` / job `106453100188` succeeded on Node v20.20.2 with 182/182 deterministic checks, all 8 browser suites, E2E-03 STRONG, E2E-05 STRONG and 0 failures. Final live reconciliation retained the legacy duplicate DRAFT group fail-closed without cleanup. TASK-094 DONE; TASK-095 READY / MANUAL_WORK. Workforce Robot remains disabled; PFC remains TASK-068 → TASK-069.
TASK-095 completion evidence: `05_SYSTEM/TASK_095_EMPLOYEE_PUBLISHED_WEEKLY_SCHEDULE_V1.md`. Implementation PR #245 final head `d08fa9fef785755b309384a8247fac737fa663c1` merged as `6e5617bae5cea60473f4aa1546295016ee0f174b`. PR-head People Shift run `35677658047` / job `106587440586` and exact post-merge run `35677762865` / job `106587761948` both succeeded on Node v20.20.2 with 187/187 deterministic checks, all 9 browser suites, E2E-04 STRONG and 0 failures. Production migration `20260922015212_task_095_employee_published_weekly_schedule_v1` remains live; canonical Employee reader is own-user/APPROVED/exact-week scoped; schedule notification trigger creates no new CLOCK_OUT_REMINDER and has no new security-advisor finding. TASK-095 DONE; TASK-096 READY / MANUAL_WORK. Workforce Robot remains disabled; PFC remains TASK-068 → TASK-069.
TASK-096 completion evidence: `05_SYSTEM/TASK_096_SWAP_LIFECYCLE_RECONCILIATION_HARDENING.md`. Implementation PR #253 final head `4e2536a6851324776e0b2d0870d0220ee0eeb928` merged as `b166241aea681a5d8429a6f6efce0a03fe53de2b`. PR-head People Shift run `35730001119` / job `106752923813` and exact post-merge run `35730242009` / job `106753715304` both succeeded on Node v20.20.2 with 197/197 deterministic checks, all 10 browser suites, E2E-06 STRONG and 0 failures. Production migration `20260922124821_task_096_swap_lifecycle_reconciliation_hardening` remains live and exact-source matched across 9 changed/new function bodies. Peer acceptance is server-authoritative; Manager acts only on PEER_ACCEPTED; atomic apply is idempotent and cannot swap ownership back on retry. TASK-096 DONE; TASK-097 READY / MANUAL_WORK. Workforce Robot remains disabled; PFC remains TASK-068 → TASK-069.
TASK-097 completion evidence: `05_SYSTEM/TASK_097_GIVE_LIFECYCLE_RECONCILIATION_HARDENING.md`. Implementation PR #255 final head `bbc24e7dca05c6a33c5ca95e732a00bcc5e17a86` merged as `4cf2d5c9ac07806be1c6748b2e992d7ea8201a7b`. PR-head People Shift run `35735967911` / job `106773167923` and exact post-merge run `35736247975` / job `106774124118` both succeeded on Node v20.20.2 with 208/208 deterministic checks, all 11 browser suites, E2E-07 STRONG and 0 failures. Production migration `20260922134157_task_097_give_lifecycle_reconciliation_hardening` remains live and exact-source matched across all 6 changed function bodies. Give preserves recipient-first consent, requires ACTIVE STAFF, blocks active Swap PENDING + PEER_ACCEPTED, enforces resulting max-two/day and makes Manager approval retry idempotent. E2E-08 ownership side is proven only; Attendance authority remains TASK-098+. TASK-097 DONE; TASK-098 READY / MANUAL_WORK. Workforce Robot remains disabled; PFC remains TASK-068 → TASK-069.
TASK-098 completion evidence: `05_SYSTEM/TASK_098_MANUAL_TIME_ATTENDANCE_AUTHORITY_V1.md`. Implementation PR #257 final head `95a62be5ec86cc10d3c2222b45eccf35f02eaf87` merged as `8ce968fdd03461a06ed57072d2ecad40c657fe63`. PR-head People Shift run `35740470718` / job `106788598596` and exact post-merge run `35740641347` / job `106789194421` both succeeded on Node v20.20.2 with 217/217 deterministic checks, all 12 browser suites, E2E-08 CLOSED and 0 failures. Production migration `20260922142225_task_098_manual_time_attendance_authority_v1` remains live and byte-exact source matched across all 6 changed/new function bodies. Attendance authority follows the final current APPROVED assignment owner, old-owner authority is denied after Give/Swap apply, new-owner manual-time submission is idempotent, and missing review policy fails closed to NEEDS_REVIEW without creating confirmed work time. E2E-09 remains PARTIAL pending TASK-099 UI. TASK-098 DONE; TASK-099 READY / MANUAL_WORK. Workforce Robot remains disabled; PFC remains TASK-068 → TASK-069.
TASK-099 completion evidence: `05_SYSTEM/TASK_099_EMPLOYEE_ATTENDANCE_ENTRY_UI_V1.md`. Implementation PR #259 final head `6cf5a186e06e5a73c84169ca84461ffad69a85b3` merged as `57ea0f6b84fe3a70a6c7fd395adbb508cd597061`. PR-head People Shift run `35743617316` / job `106799408008` and exact post-merge run `35743790428` / job `106800003976` both succeeded on Node v20.20.2 with 217/217 deterministic checks, all 12 browser suites, `TASK_099_EMPLOYEE_ATTENDANCE_UI=PASS` and 0 failures. Exact-main Business OS run `35743790505`, Pages validation `35743790560` and Pages deployment `35743786944` are SUCCESS. Employee UI now uses canonical schedule + attendance readers and only `submit_manual_time_attendance_v1`; double-submit/reload are idempotent, stale ownership fails closed and reconciles server truth, no direct table/legacy mutation path is active, and mobile 390px has no overflow. Production read-only reconciliation found 0 attendance/work-schedule/active Give/active Swap rows and 0 duplicate active-attendance schedule groups. E2E-09 is PARTIAL overall / EMPLOYEE SIDE CLOSED; Manager review + confirmed work time remain TASK-100+. TASK-099 DONE; TASK-100 READY / MANUAL_WORK and not started. Workforce Robot remains disabled; PFC remains TASK-068 → TASK-069.
TASK-100 completion evidence: `05_SYSTEM/TASK_100_MANAGER_ATTENDANCE_REVIEW_CONFIRMED_WORK_TIME_V1.md`. Implementation PR #262 final head `0436b25e6e4f8a5cb3d40b02f3624b0061aaa165` merged as `289960e8f9a035334ab2ef5c9b16a9d63f5f1684`. Final PR-head People Shift run `35751372880` / job `106826077993` and exact post-merge run `35751662491` / job `106827084456` both succeeded on Node v20.20.2 with 225/225 deterministic checks and full browser regressions, including `TASK_100_MANAGER_ATTENDANCE_REVIEW=PASS`. Production migration `20260922160120_task_100_manager_attendance_review_confirmed_work_time_v1` remains live. APPROVE confirms exact actual time, ADJUST confirms explicit Manager time, REJECT produces no confirmed truth; retries are idempotent, conflicting terminal review fails closed, Manager authority is ACTIVE-role/store/current-schedule server-side, and raw attendance remains non-payroll truth. Exact-main Pages validation run `35751662562` and Pages build/deployment run `35751661324` succeeded. Final production read-only reconciliation found 0 attendance/reviewable/confirmed/rejected rows, 0 work schedules, 0 active Give/Swap and 0 attendance notifications; targeted anon execution and browser attendance DML remain 0. E2E-09 and E2E-10 are CLOSED. TASK-100 DONE; TASK-101 READY / MANUAL_WORK and not started. Workforce Robot remains disabled; PFC remains TASK-068 → TASK-069.
TASK-101 completion evidence: `05_SYSTEM/TASK_101_EMPLOYEE_PROFILE_PROJECTION_V1.md`. Implementation PR #264 final head `2c7e85085b75f87698ea2b2215b4055a1f94f23c` merged as `84775ef2f0999953c5189a8c87ef0c45aecf549e`. Final PR-head People Shift run `35825729194` / job `107066905980` and exact post-merge run `35825868255` / job `107067327121` both succeeded on Node v20.20.2 with 231/231 total deterministic checks, 87/87 People Shift checks, `TASK_101_EMPLOYEE_PROFILE_PROJECTION=PASS` and 0 failures. Production migration `20260923061225_task_101_employee_profile_projection_v1` is live. Employee profile is server-projected: self-only for Employee, store-scoped for Manager, enterprise-scoped for Owner, operational allowlist only; email/access_scope/hourly_rate are not projected and unresolved join-date/pay-rule sources remain NULL. Exact-main SOP run `35825868158`, Pages validation `35825868079` and Pages deployment `35825868300` are SUCCESS. Final production read-only reconciliation found 7 pre-existing profiles, 0 employee_constraints, 0 employee_grades, 0 TASK-101 anon-executable functions and no authenticated direct profile INSERT/UPDATE/DELETE authority. E2E-14 is PARTIAL overall / PROFILE SIDE CLOSED; payroll authorization remains TASK-102/TASK-104. TASK-101 DONE; TASK-102 READY / MANUAL_WORK and not started. Workforce Robot remains disabled; PFC remains TASK-068 → TASK-069.
TASK-102 completion evidence: `05_SYSTEM/TASK_102_PAYROLL_TRUTH_CONTRACT_V1.md`. Implementation PR #266 final head `d8ffda60616077b67e874d50e065685846ee5cfd` merged as `713301753877d2cf165bd96a6e1d07cd83780139`. Final PR-head Business OS run `35829214563` / job `107077704167` and People Shift run `35829214534` / job `107077703887`, plus exact post-merge Business OS run `35829366561` / job `107078183654` and People Shift run `35829366627` / job `107078183937`, are SUCCESS on Node v20.20.2. Exact Workforce regression is 239/239 deterministic checks with full browser pack green. TASK-102 adds only pure payroll-truth validators: valid date-range period without cadence invention, opaque explicitly validated pay-rule reference, confirmed/revised-work-time-only source, deterministic payroll revision identity, and canonical ESTIMATED→REVIEWED→FINALIZED→PAID transitions. No payroll table/RPC/migration/calculation or live PAYROLL_AUTHORIZED mapping was created. Final production read-only audit found 0 attendance, 0 confirmed attendance, 0 employee_grades, 0 payroll tables and 0 payroll functions; security advisor delta is zero. E2E-12 is PARTIAL / TRUTH-CONTRACT SIDE CLOSED; E2E-13 is PARTIAL / STATE-CONTRACT SIDE CLOSED; E2E-14 remains PARTIAL / PROFILE SIDE CLOSED unchanged. TASK-102 DONE; TASK-103 READY / MANUAL_WORK and not started. Workforce Robot remains disabled; PFC remains TASK-068 → TASK-069.
TASK-103 completion evidence: `05_SYSTEM/TASK_103_PAYROLL_CALCULATION_INTEGRATION_V1.md`. Implementation PR #268 final head `73e83d5a547587a47ec12e3c34aa546b4722f4df` merged as `034e0f1d0718382765ee387d10de4e016073bd9c`. Production migration `20260923100426_task_103_payroll_calculation_integration_v1` is live. Final PR-head Business OS `35846750036` / job `107134628838` and People Shift `35846750072` / job `107134628953`, plus exact post-merge Business OS `35846919733` / job `107135180637` and People Shift `35846919757` / job `107135180395`, succeeded on Node v20.20.2 with 256/256 deterministic checks and full browser regressions. TASK-103 persists server-only ESTIMATED payroll basis from reviewed confirmed work time + an explicitly validated opaque pay-rule reference; exact retries are idempotent and changed source under the same revision fails closed. No attendance.amount/hourly_rate/hours_worked or employee_grades.hourly_rate is consumed. Monetary amount remains absent because canonical rate/evaluator semantics are unresolved. Final production read-only audit found 0 payroll entries, 0 attendance, 0 confirmed attendance, no monetary amount column and no authenticated payroll DML. E2E-12 is PARTIAL / TASK-102+103 SOURCE+INTEGRATION SIDE CLOSED with TASK-106 cross-flow pending; E2E-13 and E2E-14 remain PARTIAL. TASK-103 DONE; TASK-104 READY / MANUAL_WORK and not started. Workforce Robot remains disabled; PFC remains TASK-068 → TASK-069.
TASK-104 completion evidence: `05_SYSTEM/TASK_104_EMPLOYEE_PAYROLL_SELF_CHECK_V1.md`. Implementation PR #270 final head `0ebccd1ef6857d3ec3d230c2349ff137b11e122c` merged as `7fe4ed6be08c32cebc4772eccb7c45a6178bed33`. Production migration `20260923110608_task_104_employee_payroll_self_check_v1` is live. Final PR-head Business OS `35852662444` / job `107153751813` and People Shift `35852662604` / job `107153752386`, plus exact post-merge Business OS `35863208963` / job `107188248870` and People Shift `35863209080` / job `107188249831`, succeeded on Node v20.20.2 with 265/265 deterministic checks and full browser regressions including `TASK_104_EMPLOYEE_PAYROLL_SELF_CHECK=PASS`; Pages validation `35863208908` and deployment `35863207656` are GREEN. Employee payroll read is parameterless auth.uid self-only; Manager payroll read is read-only/store-scoped; PAYROLL_REVIEW remains explicit-permission-gated; no PAYROLL_AUTHORIZED mapping or monetary formula was invented. Final production read-only audit at 2026-09-23 19:54:53 +07 found 0 payroll entries, 0 employee constraints, no anon/authenticated direct payroll DML, fixed search_path readers, and the expected Security Advisor delta authenticated SECURITY DEFINER 74→76 for exactly two intended read RPCs. E2E-13 is PARTIAL / TASK-102+104 STATE+SELF-CHECK SIDE CLOSED with TASK-106 pending; E2E-14 is PARTIAL / TASK-101+104 PROFILE+PAYROLL-AUTH READ SIDE CLOSED with TASK-107 pending. TASK-104 DONE; TASK-105 READY / MANUAL_WORK and not started. Workforce Robot remains disabled; PFC remains TASK-068 → TASK-069.
TASK-105 completion evidence: `05_SYSTEM/TASK_105_EMPLOYEE_MANAGER_WORKFORCE_UI_CONSOLIDATION.md`. Implementation PR #272 final head `df969a3dfadfbe7ed304375169db26de9108d252` merged as `a07e2c5ac61855e2cc24e208e4800bdd1e3a2d48`. PR-head People Shift `35866302477` / job `107198647432` and SOP `35866302481` / job `107198647595`, plus exact post-merge People Shift `35866459893` / job `107199178920` and SOP `35866459899` / job `107199178990`, are SUCCESS. Exact-main deterministic regression is 272/272 (77 Workforce + 9 schedule-first + 112 People Shift + 74 Control Tower); Manager canonical browser reports `task105_canonical_ui_removes_legacy_demand_route=PASS`; Pages validation `35866459728` and deployment `35866458141` are SUCCESS. No migration/schema/data write occurred. Legacy Manager deep links now enter the authenticated canonical `/05_MANAGER/` route with allowlisted hashes; Manager Staff uses TASK-101 read-only projection; demand/KPI/Academy are not active Workforce V1 paths. Production read-only reconciliation found 7 profiles / 4 ACTIVE, 0 employee constraints, 0 payroll entries and 0 attendance; TASK-101/104/100 readers remain anon-denied/authenticated-enabled and targeted Security Advisor database counts remain 11/1/18/76. E2E-12/13/14 remain PARTIAL exactly as before. TASK-105 DONE; TASK-106 READY / MANUAL_WORK and not started. Workforce Robot remains disabled; PFC remains TASK-068 → TASK-069.
TASK-106 completion evidence: `05_SYSTEM/TASK_106_WORKFORCE_CROSS_FLOW_BROWSER_E2E_PACK.md`. Implementation PR #274 final head `4a802119851ad27a3fc3070bfd3c4885a490b264` merged as `6b49a9f4fa1e23aede7dae11801db30072a498ed`. PR-head People Shift run `35870574516` / job `107213262792` succeeded with 279/279 deterministic checks and full browser pack. First exact-main run `35870752068` / job `107213885698` exposed a pre-existing Employee availability iframe body-null lifecycle race after all functional availability assertions passed; repair PR #275 final head `d8a7a7480fdb5ea32cd607c2d75764740981e7e4` hardened the bind guard without changing availability semantics and merged as `52ea11a1f61a05806661b9082f6ffa4e18bf1bef`. Final exact-main People Shift run `35871619679` / job `107216860337` is SUCCESS with 280/280 deterministic checks and full browser pack including `TASK_106_WORKFORCE_PAYROLL_CROSS_FLOW=PASS`; Pages validation `35871619719` and deployment `35871619799` are SUCCESS. The cross-flow proves raw/rejected attendance never contributes, approved+adjusted confirmed work contributes exactly 650 minutes, an unvalidated pay rule fails before persistence, exact payroll build retry is idempotent, ESTIMATED is not rendered as FINALIZED, invalid state skip fails closed, and REVIEWED→FINALIZED→PAID render exactly through Employee self-check. No live PAYROLL_AUTHORIZED role mapping or monetary/rate/cadence semantics were invented. Production read-only reconciliation remains 0 attendance / 0 payroll entries; builder remains server-only; browser payroll DML remains denied; targeted Security Advisor database counts remain 11/1/18/76. E2E-12 CLOSED; E2E-13 CLOSED; E2E-14 remains PARTIAL for TASK-107. TASK-106 DONE; TASK-107 READY / MANUAL_WORK and not started. Workforce Robot remains disabled; PFC remains TASK-068 → TASK-069.
TASK-107 completion evidence: `05_SYSTEM/TASK_107_WORKFORCE_FAILURE_RECOVERY_SECURITY_E2E.md`. Implementation PR #277 final head `3cd3ed9571b29ac69e9892012e42d1a47be821ff` merged as `313efd034980819772ab19ac44582a67eb087dd5`. PR-head People Shift run `35874674906` / job `107227400674` and exact post-merge People Shift run `35875096691` / job `107228834872` are SUCCESS. Exact-main deterministic regression is 286/286 (77 Workforce + 9 schedule-first + 126 People Shift + 74 Control Tower) with `TASK_107_WORKFORCE_FAILURE_RECOVERY_SECURITY=PASS`; Pages validation `35875096700` and deployment `35875095130` are SUCCESS. Executable E2E proves Employee self-only, Manager store-scoped, Owner separate scope, cross-user/cross-store denial, malformed/stale projection fail-closed, refresh/reload recovery, idempotent RPC-only retries and zero browser diagnostics. Live read-only audit found 7 profiles / 4 ACTIVE, 0 employee constraints, 0 payroll entries and 0 attendance; all four TASK-101/104 readers remain anon-denied/authenticated-enabled with fixed search_path, and targeted Security Advisor baseline remains 11/1/18/76. No migration or production data mutation occurred; no PAYROLL_AUTHORIZED mapping or monetary/rate/cadence semantics were invented. E2E-14 CLOSED. TASK-107 DONE; TASK-108 READY / MANUAL_WORK and not started. Workforce Robot remains disabled; PFC remains TASK-068 → TASK-069.


## Supervisor Independent Repository Migration V1

Owner approved the independent Supervisor repository architecture and explicitly released migration execution on 2026-09-21.

Canonical migration plan: `08_AUTONOMY/SUPERVISOR_REPOSITORY_MIGRATION_V1.md`

| ID | Task | Gate | Status |
|---|---|---|---|
| MIG-001 | Freeze Baseline + Migration Bootstrap | exact baseline inventory + migration contract + target repo bootstrap plan; zero production cutover | DONE |
| MIG-002 | Extract Supervisor Platform to independent repository | source/test/windows/docs/workflows/scripts parity | DONE |
| MIG-003 | Decouple Business OS-specific paths/state | platform build/test/release self-contained | DONE |
| MIG-004 | New-repo CI / lifecycle parity | tests + integrity + lifecycle acceptance green | DONE |
| MIG-005 | Single-authority production cutover | preserve lane targets/latches; no split-brain | DONE |
| MIG-006 | New-repo RBT-009 exact-SHA 8h soak | uninterrupted Tier B + privacy/exact-once evidence | ACTIVE / TIER B IN PROGRESS |
| MIG-007 | Deprecate old embedded Supervisor copy | rollback window closed + pointer docs only | QUEUED |

Migration invariant: MIG-005 has completed the single-ownership handoff. The independent `magasin-supervisor` runtime candidate now owns production autostart authority; runtime processes remain intentionally quiescent because all three lanes are disabled. The old state/rollback source is retained and inactive. RBT-009 remains IMPLEMENTATION CANDIDATE / FINAL 8H SOAK PENDING and may not be relabeled RELEASED until MIG-006 completes.


### MIG-002 completion

MIG-002 extraction is complete in `magasincoffee/magasin-supervisor`.

- target bootstrap main: `815fc10bbc1814ed46f73b63391b9e67e29aa446`
- extraction PR #1 merge: `e67ae8101c391fc0a77b41ae6190bb615356be99`
- extraction-safe CI PR #2 merge: `07160cfab6943d647661f732590a0ce45e2f92a5`
- docs-only closure PR #3 merge: `64371bedc7b9c976047224152dba820c12a0674c`
- parity: 137/137 represented, missing=0, duplicate=0
- MOVE byte-equivalent: 90/90
- REWRITE provenance: 47/47
- production cutover: false
- production authority: UNCHANGED_EXISTING_SUPERVISOR
- RBT-009 remains IMPLEMENTATION CANDIDATE / FINAL 8H SOAK PENDING

Next task is MIG-003 READY / NOT STARTED. Do not self-start MIG-003 from MIG-002 closure.

`ZERO_PRODUCTION_MUTATION=true`


### MIG-002 owner/auth boundary resolved

Owner created the exact target repository `magasincoffee/magasin-supervisor`. GitHub verification confirms it is public, size 0, and empty. Resume MIG-002 from frozen baseline `4f76b929c5fedc44b451abd823f0f1f7fb3e50fe` and the existing 137-record map. Do not re-freeze or substitute moving main.

`ZERO_PRODUCTION_MUTATION=true`


### MIG-003 completion

MIG-003 decoupling is complete in `magasincoffee/magasin-supervisor`.

- exact implementation base: `64371bedc7b9c976047224152dba820c12a0674c`
- canonical implementation PR #5 head: `f7fe79e22660c8a9fc0c1e3feecfcf90d282298a`
- implementation merge: `aec7db9a715ceb41066af6636a4c91d34553eed5`
- docs-only target closure PR #6 merge: `7691bafd1571039be363d3edf760270756b5c7c6`
- project adapter: `supervisor-project-adapter.v1`
- state-root contract: `supervisor-state-root.v1`
- direct Business OS PROJECT_STATE/TASK_QUEUE/CURRENT_STATE defaults removed from generic platform core
- old repository identity removed from generic defaults
- root-native workflows/tests established
- MIG-002 mapped paths preserved 137/137
- self-hosted production workflows remain inert/fail-closed
- production cutover remains false
- production authority remains UNCHANGED_EXISTING_SUPERVISOR
- RBT-009 remains IMPLEMENTATION CANDIDATE / FINAL 8H SOAK PENDING

Next task is MIG-004 READY / NOT STARTED. MIG-003 does not start or certify MIG-004.

`ZERO_PRODUCTION_MUTATION=true`

### MIG-004 Owner release

Owner explicitly released MIG-004. Exact target base: `magasincoffee/magasin-supervisor@63b955f59d7558a42311b3d47d58acc60a503dca`.

Scope is new-repository CI/integrity/lifecycle parity and release-gate qualification only. Production cutover remains forbidden and the embedded Business OS Supervisor remains the sole production authority. MIG-004 may exercise safe validation paths but must not create a second production mutation authority or begin the final 8-hour RBT-009 soak.

MIG-004 must STOP after evidence/closure and must not self-start MIG-005.


### MIG-004 completion

MIG-004 new-repository CI / lifecycle parity is complete in `magasincoffee/magasin-supervisor`.

- Exact implementation base: `63b955f59d7558a42311b3d47d58acc60a503dca`
- Canonical implementation PR #8 merge: `19e0cab9318f9293409ebbc8237aeb299c548d77`
- Target closure PR #9 merge: `a67b6ea19e7e10b4b63b56f9e7b5274a94135ca2`
- Exact-main Tests: run `35686650024` — 567/567 PASS
- Integrity: run `35686650049` — independent-repo/static green; runtime audit SKIPPED fail-closed
- Lifecycle A-L isolated: run `35686650107` — 52/52 PASS
- Autostart/install isolated contract: run `35686650035` — 25/25 PASS; production jobs SKIPPED
- RBT-009 Tier A synthetic: run `35686650070` — 9/9 PASS; Tier B 480m SKIPPED / NOT RUN
- MIG-002 provenance remains 137/137.
- `production_cutover=false`
- `production_authority=UNCHANGED_EXISTING_SUPERVISOR`
- `ZERO_PRODUCTION_MUTATION=true`

MIG-005 is **READY / OWNER-SAFE-GATE** only. MIG-004 does not authorize or start production cutover, does not clear Owner STOP, does not mutate live lane state/autostart, and does not run the final RBT-009 8-hour soak.


### MIG-005 Owner-safe release

Owner explicitly released MIG-005 from the **old machine control console**. Exact target candidate at release: `magasincoffee/magasin-supervisor@a67b6ea19e7e10b4b63b56f9e7b5274a94135ca2`.

Release means **begin preflight and controlled cutover orchestration**, not immediate authority switch. The existing Supervisor remains authoritative until the new-machine execution host/runner, candidate SHA, target/latch preservation, rollback path, and single-authority conditions are verified.

Hard invariant: production mutation authority instances must remain exactly **1**. Never start the new production authority while the old production authority is still active. If new-machine readiness or rollback safety cannot be proven, STOP fail-closed without changing production authority.

MIG-005 may complete cutover only after preflight passes. MIG-006 final 8-hour RBT-009 soak is explicitly forbidden during MIG-005. STOP after MIG-005; do not self-start MIG-006.


### MIG-005 Controlled state transfer authorization

Owner explicitly authorized **controlled state transfer** for MIG-005 after the new repository runner was verified on the new machine.

Verified new-machine probe at authorization checkpoint:
- runner accepted repository jobs;
- Node major 24;
- Supervisor process inactive;
- production autostart absent;
- pending reboot false;
- state files absent;
- lane count 0;
- registry lane count 0;
- Owner STOP observed blocked;
- machine role remains blocked until preserved production state is transferred and verified.

Authorization is narrowly scoped: preserve existing production state/targets/latches/Owner STOP, perform final old-authority capture, enforce old STOP -> zero authority -> preserved state transfer -> hash/3-lane verification -> new START -> exactly-one-authority verification. No state reset/reinitialization, no private state committed to GitHub, no overlap, no MIG-006 Tier B soak during MIG-005. If safe transport or rollback cannot be proven, STOP fail-closed and request the minimum Owner action.


### MIG-005 completion

MIG-005 single-authority production cutover is complete.

- target PR #10 runtime candidate: `218f330ee86eea4f0fb79ef9293bd43cf96a45de`
- target PR #10 merge: `cca403faf0704d52ca488d7fecf3c72809a52291`
- package candidate: `dc0b5f369f6a9c3ae89d821f1ddf603e1135f51e`
- package SHA256: `b2a67e3c7ae568454c09386b2ceb4f7cc7cfba650e3a37243dea89a2ebfe5753`
- transfer blob identity: `abf72af4ee51a06bf49af669cd4f590bd68a9aa7` at both package/runtime candidates
- old pre-handoff state: `ALL_DISABLED_QUIESCENT`
- old runtime authority: 0
- old autostart ownership: released
- old state root + rollback record: retained
- imported topology: 3 config lanes / 3 registry lanes / enabled=0
- Brain/Work targets: preserved
- dispatch/relay latches: preserved
- Owner STOP semantics: preserved false
- browser profile: untouched
- GitHub runner: untouched
- exact runtime candidate installed: true
- new autostart ownership: present
- new runtime authority process: inactive because all lanes are disabled
- production ownership authority instances: 1
- ownership state: `NEW_AUTHORITY_OWNERSHIP_ACTIVE_ALL_DISABLED_RUNTIME_QUIESCENT`
- split-brain: false
- RBT-009 Tier B 480m: NOT RUN

Exact-head gates before activation:
- Supervisor Tests run `35711190701` / job `106691919524`: 588/588 PASS
- Integrity run `35711190753` / job `106692010441`: SUCCESS
- Lifecycle isolated run `35711190610` / job `106692198176`: 52/52 PASS
- Autostart isolated run `35711190671` / job `106691966754`: 25/25 PASS
- RBT Tier A run `35711190642` / job `106691974263`: SUCCESS
- MIG-005 preflight run `35711190628` / hosted job `106693086802`: 21/21 + 16/16 PASS
- fresh machine probes `106693404916`, `106693404967`, `106693404995`, `106693405039`: 4/4 SUCCESS
- production-capable jobs remained SKIPPED
- final 8h Tier B remained NOT_RUN

Canonical evidence: `08_AUTONOMY/MIG_005_SINGLE_AUTHORITY_CUTOVER_EVIDENCE.md`.

MIG-005 is **DONE**. MIG-006 is **READY / NOT STARTED** and must not auto-start. The final RBT-009 Tier B soak must run from zero on exact runtime candidate `218f330ee86eea4f0fb79ef9293bd43cf96a45de` only after explicit release.


### MIG-006 Owner release

Owner explicitly released MIG-006 final RBT-009 Tier B qualification.

Locked runtime candidate under test:
- `218f330ee86eea4f0fb79ef9293bd43cf96a45de`
- target main merge containing MIG-005 closure: `cca403faf0704d52ca488d7fecf3c72809a52291`
- required duration: **480 continuous minutes from zero**
- previous historical partial credit: **forbidden**
- current production ownership: **NEW_REPO_AUTOSTART_OWNERSHIP_ALL_DISABLED_RUNTIME_QUIESCENT**
- current runtime processes: **0 by design because enabled_lane_count=0**

Release authorizes preparation and execution of the exact-SHA soak only after the release workflow is corrected/qualified for the new platform state root and all-disabled semantics. It does not authorize enabling lanes, changing Brain/Work targets, clearing Owner STOP, creating a second authority, or redefining the runtime candidate.

Tier B is not considered started until the self-hosted runner begins the 480-minute monitor on the exact locked runtime candidate. If interrupted, the attempt is non-qualifying and restarts from zero. STOP after MIG-006; do not self-start MIG-007.


### MIG-006 Tier B live execution

Tier B final qualification is **IN PROGRESS** on the locked runtime candidate.

- target workflow run: `35717673431`
- Tier B job: `106713284935`
- control-plane SHA: `819f6461188f894327ec67feaf75f768ce881fce`
- runtime candidate SHA: `218f330ee86eea4f0fb79ef9293bd43cf96a45de`
- Tier B step start UTC: `2026-09-22T10:46:39Z`
- required continuous duration: 480 minutes / 28,800 seconds
- start-from-zero: true
- partial-duration credit: 0
- execution branch frozen: true
- MIG-007 remains blocked until MIG-006 qualifies

This is bookkeeping only. It does not modify the target execution branch or production runtime.

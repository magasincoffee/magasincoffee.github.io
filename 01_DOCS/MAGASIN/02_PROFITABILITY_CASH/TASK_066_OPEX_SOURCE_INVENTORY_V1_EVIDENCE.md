# TASK-066 — OPEX Source Inventory V1 Evidence

Date: 2026-09-20  
Execution generation: PFC_8H_V2_RUN_01  
Wave: B — OPERATING COST TRUTH  
Status: DONE / SOURCE_INVENTORY_COMPLETE / DOCS_ONLY

TASK-066 is source inventory and semantic classification only. It does not create the TASK-067 Operating Cost Truth contract, does not calculate an OPEX total, and does not claim Profit or P&L close.

Google Drive was used READ_ONLY with bounded, schema-first reads. No Drive locator, account/payment identifier, employee salary row, employee/customer/vendor personal data, raw private financial value, credential or secret is stored in this public repository evidence.

## Five-Step

### QUESTION

Identify exactly which current evidence can support Operating Cost recognition by period/scope and which evidence proves only payment, settlement, allocation context or budget context.

The central accounting boundary is:

~~~text
recognized cost != cash paid
~~~

### DELETE

TASK-066 deliberately does not add:

- an Operating Cost calculator or contract;
- a new Drive reader or external connector;
- Bank/MoMo/COD integration;
- database, migration, RPC, write path, UI or dashboard;
- synthetic OPEX;
- payment-to-expense promotion;
- supplier-payment-to-OPEX promotion;
- purchase-to-COGS/OPEX promotion;
- FoodApp gross-to-fee inference;
- payroll schedule/calculation-to-ACTUAL without actuality proof;
- unapproved rent/shared-cost allocation;
- budget/plan-to-ACTUAL promotion;
- a new CI workflow merely to create activity.

### SIMPLIFY

Use six source roles only:

| Role | Meaning |
|---|---|
| RECOGNITION_SOURCE | Can support that a cost belongs to a period when its actuality, service/work period and amount semantics are proven |
| PAYMENT_SOURCE | Proves money was paid; does not by itself prove the expense recognition period |
| SETTLEMENT_SOURCE | Provider settlement evidence with explicit gross/fee/promo/tax/net semantics for exact covered provider/date/store scope |
| ALLOCATION_CONTEXT | Can support allocation only after an approved allocation rule exists |
| BUDGET_CONTEXT | Plan, model, quote or estimate; never ACTUAL merely because it exists |
| NOT_CONNECTED | No sufficiently evidenced source is currently connected for the required semantics |

A single source may have more than one role, but recognition and payment remain separate facts.

### ACCELERATE

TASK-066 started from TASK-051 and re-read only sources needed to tighten Operating Cost semantics/freshness. Once a candidate was proven payment-only, budget-only, historical-only or non-OPEX, broad scanning stopped.

### AUTOMATE

No automation was added. Existing repository Financial Truth and Partial Financial Baseline remain the downstream canonical primitives. Missing source evidence stays GAP/NOT_CONNECTED and does not pause PFC_8H_V2.

## Repository semantic boundary

Existing executable semantics already protect the Wave-B boundary:

- Partial Financial Baseline expects a canonical OPEX period component; without it, operating costs remain GAP with OPERATING_COST_TRUTH_NOT_AVAILABLE.
- Profit is derived only from compatible Revenue + COGS + Operating Costs.
- Cash Bridge and AP are not Profit dependencies.
- Procurement supplier payments are Cash events only.
- Purchase/order/AP records do not become Operating Cost recognition.
- No duplicate OPEX truth path exists in Core today.

TASK-067 should reuse Financial Truth and the existing Partial Financial Baseline OPEX input rather than create a competing financial truth system.

## Detailed source matrix

Coverage below refers to the current bounded Operating Cost use case, primarily September 2026. COMPLETE is never inferred from file existence, modification time or row presence.

| Privacy-safe source class / label | Cost family candidate | Source role(s) | Exists? | Period / freshness | Dimensions | Actuality / recognition semantics | Payment semantics | Amount semantics | Coverage | Quality implication | Usable now for TASK-067? | Conflict / ambiguity | Next action |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| PAYROLL_ATTENDANCE_CALC — current payroll/attendance workbooks | PAYROLL_LABOR | RECOGNITION_SOURCE | YES | Current September surfaces exist, but bounded re-read is inconsistent: daily summary reaches 15/09, detailed payroll rows reverified through 14/09; an earlier TASK-051 verification recorded later dated attendance through 19/09 but TASK-066 did not reproduce that across the inspected tabs | date, branch, employee, worked hours, grade/rate-derived amount | Exact worked rows can be recognition candidates only after worked-actuality + valid effective rate/calculation + period gate | No canonical payroll-payment proof found in these inspected payroll tabs | worked hours, rate/grade-derived labor amount; some calculated cells contain errors | PARTIAL | ACTUAL only for exact rows that pass actuality/rate gates; full-period aggregate remains GAP | YES, bounded recognition candidate only | summary/detail freshness conflict; pre-entered or calculated rows may exist; calculation error cells; payment is separate | TASK-068 must establish canonical detail surface, actuality gate, effective-rate semantics and period completeness |
| MONTHLY_CASH_OPERATING_LEDGER — September operating cash workbook | PAYROLL_LABOR / RENT / UTILITIES / DELIVERY_COST / OTHER_BRANCH_OPEX / other payments where explicitly categorized | PAYMENT_SOURCE | YES | Bounded current September read contains dated cash/payment rows through 16/09/2026 | date, branch cash inflow columns, company/store outflow columns, free-text note | Cash row alone is not recognition. Recognition requires separate category/business nature plus service/work period proof | Strong for exact evidenced payment movement within covered rows | paid amount / transfer amount / free-text purpose | PARTIAL | ACTUAL for exact evidenced payment movement; OPEX recognition remains GAP unless independently proven | YES as payment/reconciliation source only | mixes ingredients, tools, transfers and operating payments; notes are not a complete cost taxonomy | TASK-067 must never turn this ledger into an OPEX total by itself |
| CONSOLIDATED_OPERATING_LOG — consolidated store operations | OTHER_BRANCH_OPEX / DELIVERY context | PAYMENT_SOURCE, limited recognition candidate where business nature is explicit | YES | Existing TASK-051 verified current operating rows into September; TASK-066 revalidated schema but did not infer completeness from grid size | timestamp/date, branch, type, inflow/outflow fields, app/store operating fields | Explicit categorized branch expense with proven business nature and period may become a bounded recognition candidate; generic Thu-Chi does not | Can support exact recorded store payment/outflow rows | total in/out and operating fields; ship/customer-charge fields require interpretation | PARTIAL | ACTUAL for exact proven rows; otherwise GAP/UNCLASSIFIED | YES, row-level only | overlaps monthly cash ledger and derived P&L; customer ship charge is not rider/provider cost | TASK-067 needs identity/dedup and recognition-category gates |
| SHOPEEFOOD_SETTLEMENT_EXPORT — provider merchant income detail | PLATFORM_FEES_PROMOTIONS | SETTLEMENT_SOURCE, RECOGNITION_SOURCE candidate for explicit fee/promo/tax rows | YES | Exact exports identified for 25/02, 23/07 and latest 05/08/2026; no September 2026 settlement export verified | order, provider store, completion/cancel time | Fee/promo/tax recognition is usable only for exact covered provider/date/store rows and explicit field semantics | Net settlement/payout fact is separate from fee recognition; export does not prove destination-account balance | order value, merchant promotion, service fee, shipping paid to merchant, discount, withholding tax, net received | PARTIAL for provider history; MISSING for current September target | ACTUAL for exact covered export rows; current September remains GAP | YES for TASK-067 semantics and historical covered rows; not for current September aggregate | can overlap finance workbook/P&L estimates; gross must not be treated as fee; net payout must not be treated as account balance | TASK-070 maps exact fields and seeks current-period provider coverage |
| GRAB_GROSS_SALES_EXPORT — historical Grab item sales surface | PLATFORM_FEES_PROMOTIONS | none for OPEX recognition; operating sales context only | YES | Historical item-gross evidence inspected, not current settlement | date, provider/store, item, units, gross sales | Gross sales do not prove commission/service fee expense | No payout proof | item gross sales only | MISSING for fee recognition | GAP for OPEX | NO | gross sales can be double-counted against settlement if misused | TASK-070 requires actual Grab settlement/fee source |
| PROVIDER_MARKETING_CONTRACT_CONTEXT — Grab/Vinamarket service documents | MARKETING_ADVERTISING / PLATFORM service | RECOGNITION_SOURCE candidate only when executed/applicable, BUDGET_CONTEXT | YES | Multiple historical/current-year contract templates/context found; current MAGASIN execution date, signed applicability and service-period coverage were not proven in TASK-066 | service/package, stated duration, contractual fee terms | Executed contract + actual service period could support recognition; template or unsigned/blank context cannot | Payment method/timing remains separate | contractual package/service fee, advertising responsibilities | MISSING for current recognized cost | GAP; possible ESTIMATE/context only | NO current ACTUAL | documents include template/private fields and may overlap provider settlement/ad spend; public Git must not reproduce private details | TASK-069/070 should use only executed privacy-safe evidence if applicability is proven |
| FINANCE_COST_MODEL — branch finance model | RENT / PAYROLL_LABOR / UTILITIES / MARKETING_ADVERTISING / SHARED_COMPANY_OPEX | BUDGET_CONTEXT, ALLOCATION_CONTEXT | YES | Cost model exists but contains modeled monthly/day costs, assumptions and allocation notes rather than current-period actual evidence | branch, modeled cost category, monthly/day amount, some shared-allocation percentages | Not ACTUAL recognition without underlying contract/invoice/work evidence | Does not prove payment | planned/model amounts and allocation percentages | PARTIAL context; MISSING as current ACTUAL source | ESTIMATE/GAP | YES as taxonomy/context only | modeled rent/labor/utilities/marketing can duplicate real sources; some shared allocation is assumption-based | TASK-067 must reject plan/model values as ACTUAL |
| BRANCH_PNL_RECONCILIATION — CN3 bounded analysis | PAYROLL_LABOR / OTHER_BRANCH_OPEX / PLATFORM_FEES_PROMOTIONS / RENT / UTILITIES / SHARED_COMPANY_OPEX | ALLOCATION_CONTEXT, BUDGET_CONTEXT, secondary reconciliation | YES | Explicitly bounded 01/09/2026–13/09/2026 | branch, period, cost category | Useful to reconcile source gaps: labor/branch spend are linked to upstream sources; platform fee is explicitly estimated; rent/shared cost unallocated; utilities unavailable for current period | Does not independently prove payment | derived P&L/reconciliation values | PARTIAL | Mixed: upstream exact evidence may be ACTUAL; estimates remain ESTIMATE; missing fixed/shared costs remain GAP | YES as secondary reconciliation only | must not become canonical source or be summed with upstream payroll/operating ledger; estimated provider fee must not replace settlement | TASK-067 uses only upstream canonical sources and may use this as QA/gap evidence |
| HISTORICAL_UTILITY_LEDGER — electricity/water tab | UTILITIES | RECOGNITION_SOURCE candidate for its exact historical periods | YES historical | Inspected records are mainly 2024, not September 2026 | branch, month, meter readings/usage, amount | Meter/service-period evidence may support historical recognition if validated; it cannot be backfilled into current September ACTUAL | Historical payment timing is not established by meter table alone | meter before/after, usage, utility amount | MISSING for current September | GAP current; historical exact rows may be ACTUAL after validation | NO for current period | historical average must remain ESTIMATE; one branch/month does not prove all branches | TASK-069 must locate current bills/service-period evidence |
| HISTORICAL_DISBURSEMENT_LEDGER — old purchase/disbursement sheet | OTHER_BRANCH_OPEX / utilities/rent context plus materials/CCDC | PAYMENT_SOURCE, historical context | YES historical | Sampled records are 2023; includes received date vs payment date and mixed classifications | date received, payment date, branch, classification, item | Payment/purchase classification does not automatically establish current-period OPEX recognition | Supports historical payment timing for exact rows | quantity, unit price, amount, stock movement | MISSING current | GAP current | NO current | mixes ingredients/CCDC and occasional combined rent/utility descriptions; major COGS/OPEX double-count risk | Keep historical reconciliation only; do not feed current OPEX |
| ACCOUNTING_BUDGET_TAXONOMY — accounting summary/model | PAYROLL_LABOR / RENT / OTHER_BRANCH_OPEX / MARKETING_ADVERTISING / depreciation/tax context | BUDGET_CONTEXT | YES | Generic planning/taxonomy surface; no current actual period proof from inspected range | cost family, ratios/model headings | Not a recognition source | No payment proof | ratios/plan categories | MISSING as ACTUAL | ESTIMATE/GAP | YES as taxonomy only | may look like P&L but lacks current actual lineage | TASK-067 may reuse category names, not values |
| HISTORICAL_COST_SUMMARY — historical cost report | PAYROLL_LABOR / RENT / UTILITIES / MARKETING_ADVERTISING / SHARED_COMPANY_OPEX | BUDGET_CONTEXT, historical reconciliation | YES historical | 2024 monthly/quarterly categories | month/quarter, cost category | Historical recognized-cost candidate only if underlying lineage is later proven; not current 2026 truth | No current payment proof | category totals | MISSING current | GAP current | NO current | totals may overlap underlying ledgers; no current period | historical reference only |
| PROCUREMENT_PURCHASE_LEDGER — current procurement receipt/detail model | ingredients/packaging/inventory purchases | none for OPEX by default | YES | Repository/current model plus Drive history | supplier, date, item, quantity/unit, purchase price/value | Purchase is not COGS and not OPEX merely because bought | Payment is separate from purchase | purchase quantity/value | NOT_APPLICABLE to Operating Cost recognition | no OPEX quality | NO | severe COGS/OPEX double-count risk | Keep in Procurement/COGS path unless a future canonical business rule proves an OPEX item |
| PROCUREMENT_SUPPLIER_PAYMENT — repository canonical payment path | supplier cash payment | PAYMENT_SOURCE | YES | Current executable semantics | payment date, amount, method, status/order link | Never recognition by itself | Canonical cash-outflow evidence for active proven payment | paid amount | source-specific coverage only | ACTUAL Cash when proven; OPEX remains GAP unless separate recognition | YES as reconciliation source only | payment can settle inventory, asset or expense; payment method does not classify cost nature | TASK-067 must keep payment out of Operating Cost recognition |
| DELIVERY_PAYMENT_EVIDENCE — explicit delivery payment row within cash ledger | DELIVERY_COST | PAYMENT_SOURCE | YES, bounded | One explicit current-September delivery-payment note was found within the bounded payment ledger | payment date, payment note; branch/service scope may be incomplete | Could become recognized delivery cost only when service/provider/business purpose and service period are linked | Proves an exact payment event | paid delivery amount | PARTIAL | ACTUAL payment; recognition remains GAP until linkage | YES as payment candidate only | customer shipping charge and COD-held cash are different facts | TASK-069 should define delivery recognition evidence and dedup with branch operating rows |
| CURRENT_RENT_RECOGNITION | RENT | NOT_CONNECTED | NO sufficient current source verified | No current September branch lease/rent schedule with proven period applicability was established; CN3 P&L explicitly leaves rent unallocated | required branch/property/service period | Needs executed lease/schedule + period applicability; enterprise/shared rent needs explicit scope | Cash payment alone is timing only | rent by applicable period | NOT_CONNECTED / MISSING | GAP/NOT_CONNECTED | NO | finance model contains assumed/model rent and unapproved allocation context | TASK-069 locate current lease/rent schedule and approved scope/allocation |
| CURRENT_UTILITY_BILL_SOURCE | UTILITIES | NOT_CONNECTED | NO sufficient current source verified | Historical utility records exist, but no September 2026 bill/service-period source was verified | branch, service period, utility type | Needs current bill/meter/service period | Payment separately reconciles cash timing | bill/service amount | NOT_CONNECTED / MISSING | GAP/NOT_CONNECTED | NO | historical usage/average cannot become current ACTUAL | TASK-069 locate current electricity/water/internet evidence |
| CURRENT_MARKETING_SPEND_SOURCE | MARKETING_ADVERTISING | NOT_CONNECTED, with BUDGET_CONTEXT candidates | No current actual spend/invoice source verified | Plans, quotes and provider marketing context exist; current September ad-platform invoice/spend was not verified | campaign/provider, service period, branch/channel where applicable | Needs ad-platform spend/invoice or evidenced service period | Bank/cash payment alone is payment timing | spend/invoice/service fee | NOT_CONNECTED / MISSING | GAP current; plans remain ESTIMATE/context | NO current ACTUAL | strong double-count risk with provider service contracts and FoodApp promotion fields | TASK-069/070 locate exact current spend/service evidence |
| CURRENT_SHARED_OPEX_SOURCE | SHARED_COMPANY_OPEX | NOT_CONNECTED / ALLOCATION_CONTEXT only | No complete canonical current recognition source verified | Shared management/marketing/warehouse context exists but current complete recognition and approved branch allocation do not | enterprise/shared category; branch only after rule | Enterprise cost may be recognized separately if source is proven; branch allocation requires approved rule | Payment remains separate | category/service amount | MISSING | GAP | NO complete | cannot allocate by revenue/headcount/store count without Owner-approved rule | TASK-067 keeps shared component separate; TASK-069 handles evidenced shared sources/rules |
| BANK_FEE_SOURCE | BANK_PAYMENT_FEES | NOT_CONNECTED | No real bank-fee statement/transaction source verified | Current search found context/plans but no actual bank statement fee evidence | bank account, fee date/type | Needs actual bank statement/fee transaction semantics | Same source may prove cash timing if connected, but not assumed | fee amount/type | NOT_CONNECTED | NOT_CONNECTED | NO | transfer/payment method does not imply a bank fee | connect real read-only bank fee evidence later; do not infer |

## Recognition versus payment separation

### Payroll

~~~text
worked attendance / actual service period
+ valid effective rate/calculation
= labor-recognition candidate

payroll calculation summary alone
!= worked actual

salary payment
= payment timing
!= labor recognition period
~~~

Gross pay, deductions, advances and paid amount must remain separate fields when TASK-068 maps payroll.

### Rent

~~~text
executed lease / rent schedule
+ applicable service period
= rent-recognition candidate

bank/cash payment
= payment timing only
~~~

No branch allocation is authorized from revenue, headcount or store count merely because a model contains such a percentage.

### Utilities

~~~text
bill / meter / service-period evidence
= utility-recognition candidate

payment transaction
= payment timing only
~~~

Historical 2024 utility rows do not become September-2026 ACTUAL. A historical average, if later used, remains ESTIMATE.

### FoodApp / platform

~~~text
gross order value
!= platform fee expense

explicit settlement fee / merchant promo / tax field
= recognition candidate for exact covered provider/date/store

net settlement / payout
= settlement cash fact
!= fee recognition
!= account balance
~~~

Current September provider coverage remains incomplete.

### Delivery

~~~text
shipping charge billed to customer
!= delivery cost

COD held cash
!= delivery expense

explicit rider/provider cost or service evidence
+ period/business-purpose proof
= delivery-cost recognition candidate

delivery payment
= payment timing until linked
~~~

### Marketing

~~~text
campaign plan / budget / quote
= BUDGET_CONTEXT / ESTIMATE

ad-platform spend / invoice / proven service period
= recognition candidate

cash/bank payment
= payment timing
~~~

### Other / shared OPEX

A branch cash or operating-ledger row may be an ACTUAL cash movement. It becomes recognized OPEX only when cost category, business nature and applicable period are proven.

Ambiguous/unclassified rows remain GAP/UNCLASSIFIED context. Shared enterprise OPEX remains separate until an approved allocation rule exists.

## Freshness and coverage map

| Source | TASK-066 bounded evidence | Current-period coverage conclusion |
|---|---|---|
| Payroll/attendance | Direct re-read found detail rows through 14/09 and daily summary through 15/09; TASK-051 had previously recorded a later bounded verification through 19/09, which TASK-066 did not reproduce across inspected tabs | PARTIAL; tab/freshness contradiction blocks COMPLETE |
| Monthly cash operating ledger | Current September payment rows directly re-read through 16/09 | PARTIAL |
| Consolidated operating log | Schema revalidated; prior TASK-051 current operating verification reached September 19 | PARTIAL for OPEX because category/recognition completeness is not proven |
| CN3 branch P&L reconciliation | 01/09–13/09 | PARTIAL, secondary only |
| ShopeeFood settlement export | latest exact export identified 05/08/2026; older July/February exports also exist | PARTIAL historical; MISSING current September |
| Grab gross sales | historical gross-only evidence | MISSING for fee recognition |
| Historical utilities | mainly 2024 in inspected utility surface | MISSING current September |
| Historical disbursement ledger | sampled 2023 | MISSING current |
| Finance/accounting models | models/taxonomy without current actual lineage | MISSING as ACTUAL |
| Current rent source | no current applicable verified source | NOT_CONNECTED/MISSING |
| Current utility bills | no current service-period source verified | NOT_CONNECTED/MISSING |
| Current marketing spend/invoice | no current actual spend/invoice source verified | NOT_CONNECTED/MISSING |
| Bank payment fees | no actual bank-fee source verified | NOT_CONNECTED |

The payroll discrepancy is intentionally preserved as a GAP rather than resolved by choosing the latest date observed in any one surface. TASK-068 must establish the canonical actuality/completeness rule.

## Sources usable now

### Recognition candidates

1. Payroll/attendance exact worked rows, only after actuality + rate + period gates; current aggregate coverage is PARTIAL.
2. ShopeeFood settlement explicit fee/promo/tax fields for exact covered historical provider/date/store rows only.
3. Explicitly categorized branch operating-cost rows where business nature and period can be independently proven; this remains row-level, not a total.

### Payment / reconciliation sources

1. Current monthly cash operating ledger for exact evidenced payments through its bounded coverage.
2. Consolidated operating Thu-Chi/outflow rows for exact evidenced store movements.
3. Repository Procurement supplier payments as Cash only.
4. Historical disbursement ledger for historical reconciliation only.

### Context only

- branch finance cost model;
- accounting budget/taxonomy;
- historical cost summary;
- CN3 P&L/monitor as secondary reconciliation;
- marketing plans/quotes and provider service contract context unless current execution/service period is proven.

## Overlap and double-count risks

| Risk | Rule |
|---|---|
| Payroll attendance/calculation vs salary payment | recognize labor from actual worked/rate semantics; payment reconciles Cash; do not sum both as two costs |
| Payroll detail vs payroll summaries | choose a canonical detail surface in TASK-068; summaries are reconciliation projections |
| ShopeeFood fee fields vs finance/P&L provider-fee estimates | explicit settlement field wins for exact covered rows; do not add estimate on top |
| Provider settlement fee vs net payout | fee expense and payout Cash are separate facts |
| Branch operating log vs monthly cash workbook | likely overlapping cash/payment evidence; dedup identity/date/category before any cost aggregation |
| Branch source rows vs derived CN3 P&L | P&L is secondary; never sum it with its upstream sources |
| Rent/utility models vs actual contract/bill | model is ESTIMATE/context until actual source exists |
| Marketing quote/contract vs ad-platform spend vs payment | recognize only the proven service/spend once; other sources reconcile, not add |
| Procurement purchase vs supplier payment vs COGS | purchase is not OPEX/COGS automatically; supplier payment is Cash; consumption/COGS is a later Wave C path |
| Customer ship charge vs rider/provider cost | revenue/charge and delivery cost are separate |
| Shared cost vs branch cost | no allocation without approved rule; enterprise shared amount can remain separate if recognized |

## GAP / NOT_CONNECTED by major OPEX family

| Cost family | Current state |
|---|---|
| PAYROLL_LABOR | PARTIAL recognition evidence; exact rows usable after actuality/rate gate; full period not proven |
| RENT | current recognition source GAP/NOT_CONNECTED; models/derived P&L are insufficient |
| UTILITIES | historical evidence exists; current September recognition source GAP/NOT_CONNECTED |
| PLATFORM_FEES_PROMOTIONS | exact historical ShopeeFood settlement semantics available; current September/provider completeness GAP |
| DELIVERY_COST | one bounded payment candidate exists; recognition linkage and full coverage GAP |
| MARKETING_ADVERTISING | plans/contracts/context exist; current actual spend/invoice recognition source GAP/NOT_CONNECTED |
| OTHER_BRANCH_OPEX | PARTIAL row-level operating/payment evidence; complete category universe not proven |
| SHARED_COMPANY_OPEX | GAP; complete current recognition source and approved branch-allocation rule missing |
| BANK_PAYMENT_FEES | NOT_CONNECTED; no actual fee source verified |
| ingredients/packaging/inventory purchases | intentionally excluded from OPEX by default; route to COGS/consumption unless a later canonical rule proves otherwise |

## Recommended canonical source order for TASK-067

For each Operating Cost component:

1. Use a direct RECOGNITION_SOURCE with compatible period/scope and explicit amount semantics.
2. For platform costs, use exact SETTLEMENT_SOURCE fields for covered provider/date/store.
3. Accept row-level operating evidence only when category, business nature and recognition period are proven.
4. Use PAYMENT_SOURCE only to reconcile Cash timing; never as the recognition trigger by itself.
5. Use ALLOCATION_CONTEXT only after an explicit approved allocation rule.
6. Use BUDGET_CONTEXT only as ESTIMATE/context.
7. If recognition evidence is absent, emit GAP/NOT_CONNECTED/null, never zero.

Recommended quality rule:

~~~text
direct valid recognition evidence -> ACTUAL or ESTIMATE according to evidence
budget/model only                 -> ESTIMATE at most
missing recognition semantics     -> GAP
source not connected              -> NOT_CONNECTED
payment-only evidence             -> no recognition value
~~~

TASK-067 should not hard-code every source family as universally required. The required source universe must be cost-family/scope/period specific.

## Handoff — TASK-068 Payroll Cost Mapper

TASK-068 should:

- identify the canonical detailed attendance/work surface;
- reconcile the current payroll tab/date inconsistency before claiming complete coverage;
- separate schedule/pre-entry from worked actuality;
- require branch + worked date/service period + actual hours + valid effective rate/calculation;
- keep gross pay, deductions, advances and paid amount semantically separate if present;
- reject calculation-error cells and incomplete rate identity;
- aggregate only after per-row actuality and period/scope compatibility;
- use payroll payment only for reconciliation/Cash;
- preserve employee privacy in public evidence.

Current state entering TASK-068:

~~~text
PAYROLL_LABOR = PARTIAL / bounded recognition candidate
full current-period labor cost = GAP
~~~

## Handoff — TASK-069 Rent / Utilities / Other OPEX Mapper

TASK-069 should prioritize:

1. current executed rent/lease schedules by branch/property and applicable service period;
2. current electricity/water/internet bills or meter/service-period evidence;
3. explicit delivery rider/provider cost evidence;
4. explicit branch operating expense categories with business-nature proof;
5. current shared/company OPEX evidence.

Rules:

- payment date never substitutes for service/recognition period;
- historical utility rows cannot become current ACTUAL;
- no branch allocation for rent/shared management/marketing without approved rule;
- ambiguous cash notes remain reconciliation context;
- COGS/inventory purchases stay outside OPEX unless a canonical business rule says otherwise.

## Handoff — TASK-070 FoodApp Settlement & Fee Truth

TASK-070 should:

- use provider exports with explicit field semantics, starting from the exact ShopeeFood settlement structure already verified;
- distinguish gross order, merchant-funded promo, service/commission fee, shipping amount, tax/adjustment and net settlement;
- prove provider/store/date coverage before aggregate ACTUAL;
- locate current September provider exports; absent coverage remains GAP;
- locate a real Grab settlement/fee source; historical Grab gross-sales data is insufficient;
- keep fee recognition separate from payout Cash and bank/account balance;
- deduplicate against finance workbook/P&L estimates.

## Financial Baseline implication

TASK-066 does not make Operating Costs complete.

The Partial Financial Baseline may continue to show Revenue/Cash/AP components independently, but:

~~~text
operating_costs = GAP/null
profit = GAP/null
~~~

for a target scope/period whenever the required OPEX recognition sources are incomplete.

A subset such as exact payroll rows or exact provider fees may become component ACTUAL later without implying that the complete Operating Cost total is ACTUAL.

## Google Drive and privacy confirmation

~~~text
Google Drive mode = READ_ONLY
broad blind scan = NO
bounded schema/range reads = YES
Drive writes/deletes/shares = NONE
public Git Drive IDs/URLs = NONE
public Git raw employee salary rows = NONE
public Git private financial rows/values = NONE
public Git credentials/secrets = NONE
~~~

Private raw rows observed during read-only discovery were used only to classify source semantics and were not copied into this evidence.

## DoD

PASS.

TASK-066 can answer without guessing:

- which source may support recognition;
- which source proves payment only;
- which source has settlement semantics;
- exact bounded freshness/coverage status;
- overlap/double-count risks;
- what is usable now;
- what remains GAP/NOT_CONNECTED for every major OPEX family.

No OPEX total was calculated. No synthetic zero was created. No unapproved allocation was applied. No executable code/workflow was added.

Canonical next step:

~~~text
TASK-066 = DONE
TASK-067 = READY / AUTO_CONTINUE
current_task = TASK-067
current_task_title = Operating Cost Truth Contract
next_task = TASK-068
status = READY
autonomy = AUTO_CONTINUE
blocked = false
requires_user = false
~~~

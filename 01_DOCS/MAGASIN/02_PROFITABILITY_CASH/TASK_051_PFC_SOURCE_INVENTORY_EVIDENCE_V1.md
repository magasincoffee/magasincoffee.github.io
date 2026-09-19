# TASK-051 — PFC Source Inventory + DELETE/Defer Map

Date: 2026-09-19  
Generation: PFC_3H_V1_RESTART_01  
Status: DONE / DoD MET

This evidence is intentionally privacy-safe for a public repository. Google Drive was inspected READ-ONLY. No Drive ID/URL, raw employee/customer record, raw financial transaction, credential, or secret is stored here.

## Five-Step

### QUESTION
Identify the minimum real sources that can support Revenue, Cash, Procurement/AP and later COGS without inventing financial truth.

### DELETE
Delete/defer from the current path:
- new finance dashboard, KPI engine, AI forecast, pricing engine, full ERP;
- duplicate AP/purchase ledgers;
- speculative Bank/MoMo/COD integrations;
- gross FoodApp substituted for settlement cash;
- purchase value substituted for COGS;
- net-profit claims before fixed/shared cost and consumption truth;
- autonomous financial writes;
- Drive cleanup/migration.

DELETE here applies to requirements/duplicate truth paths, not source files.

### SIMPLIFY
Use existing Procurement/AP read models, one Revenue reconciliation gate, recorded cash evidence, provider settlement exports, period-bounded payroll, and inventory/recipe evidence. Missing external sources stay GAP/NOT_CONNECTED.

### ACCELERATE
TASK-052 can start from this verified source map and define one shared quality/lineage contract instead of repeating source discovery.

### AUTOMATE
No financial action automated. Only later deterministic read/aggregation/test automation is allowed after the contract is stable.

## Source inventory

| Source class | Exists? | Period / freshness | Dimensions | Trust | Quality | Usable now? | Conflict / gap | Next action |
|---|---|---|---|---|---|---|---|---|
| Revenue — consolidated operating records | YES | verified through 2026-09-18 | date, branch CN1–CN4, direct/app indicators | MEDIUM-HIGH | ACTUAL | YES as reconciliation input | raw operating data is not yet repository-reconciled Revenue | define lineage in TASK-052; reconcile in TASK-053 |
| Revenue — repository reconciled adapter | YES, contract | current code | reporting date, amount, source, as-of, reconciliation state | HIGH semantic gate | NOT_CONNECTED | NO live amount | Control Tower has no reader wired; fail-closed works | reuse gate; connect only trusted RECONCILED reader |
| Procurement / Purchases — repository | YES | current live-query design | date, supplier, invoice, product, quantity/unit, purchase price/value | HIGH | ACTUAL | YES | purchase is not COGS | reuse existing read models |
| Procurement — Drive history | YES | mixed history; evidence through 2026-08 | date, material, supplier, quantity, price, amount | MEDIUM | ACTUAL | history/reconciliation only | overlaps repository ownership; variable freshness | do not create second canonical purchase ledger |
| Supplier Payments — repository | YES | current live-query design | payment date, amount, method, order link, status/reference | HIGH | ACTUAL | YES | BANK/CASH/MOMO method does not prove account balance | map active payments to cash outflow in TASK-057 |
| AP — repository views | YES | current live-query design | supplier, purchase/paid/balance, overdue, order status | HIGH | ACTUAL | YES | must fail closed on runtime read error | reuse existing AP views |
| Cash — monthly operating cash workbook | YES | history from 2024; current September 2026 source updated 2026-09-18 | date, branch, opening carry, recorded cash in/out | MEDIUM-HIGH | ACTUAL | YES for recorded cash | not Bank/MoMo reconciliation; coverage can be incomplete | use in Cash Bridge with explicit lineage |
| Bank account truth | NO verified source | none current identified | none verified | NONE | NOT_CONNECTED | NO | BANK-tagged supplier payment is not a bank statement | locate real statement/read-only feed later |
| MoMo account truth | NO verified source | none current identified | none verified | NONE | NOT_CONNECTED | NO | MOMO payment method is classification only | locate real wallet export later |
| COD / delivery settlement | NO verified source | none current identified | none verified | NONE | NOT_CONNECTED | NO | delivery/ship operating fields do not prove COD settlement | locate settlement source later |
| FoodApp provider settlement/fees | YES, partial | dated 2026 provider exports; not continuous through current September | order, branch/store, completion state, gross, fee/discount/tax, net | HIGH for covered export | ACTUAL | YES for covered dates/provider | incomplete by date/provider | reconcile only matching covered periods; carry rest GAP |
| FoodApp gross operating sales | YES | current through 2026-09-18 | date, branch, app gross | MEDIUM-HIGH | ACTUAL | YES for gross evidence | gross is not settlement/net cash | reconcile gross to provider settlement |
| Payroll / labor | YES | recorded rows verified through 2026-09-18 | date, branch, hours, pay calculation | MEDIUM-HIGH | ACTUAL | YES, bounded to recorded period | open period can be incomplete | preserve missing attendance as GAP |
| Rent / Utilities | PARTIAL historical only | current 2026 source not verified | some historical branch fields | LOW current-period | GAP | NO for current period | active PFC period lacks verified fixed-cost source | establish current fixed-cost evidence |
| Other branch OPEX | YES, partial | current operating/cash records through 2026-09-18 | date, branch, recorded operating expense | MEDIUM | ACTUAL | YES for recorded rows | company/shared OPEX taxonomy incomplete | map evidenced rows; unclassified/shared remains GAP |
| Debt | YES, management schedule | updated September 2026 | debt category, paid/remaining management fields | MEDIUM-LOW | ESTIMATE | context only | not independently reconciled financing truth | keep ESTIMATE until linked to payment/account evidence |
| Capex | NO complete current source | none verified for active period | none verified | NONE | GAP | NO | historical/opening-cost evidence is not a canonical capex ledger | identify evidenced capex events later |
| Owner contribution / withdrawal | NO structured source | current movement ledger not verified | none verified | NONE | GAP | NO | free-text cash notes cannot be promoted to structured Owner movement | identify explicit evidenced events later |
| Inventory counts / standards | YES | current standardized source updated September 2026 | material, unit/conversion, location, book/physical count, variance | MEDIUM-HIGH | ACTUAL | YES where populated | company-wide transaction coverage not yet proven | retain as inventory lineage |
| Inventory consumption | PARTIAL | bounded branch evidence for September 2026 | branch, period, material, opening, purchases, ending, consumption | MEDIUM-HIGH scoped | ACTUAL | YES only for proven scope | not company-wide | expand only when count/purchase coverage is proven |
| Recipe / formula | YES | active recipe standards updated September 2026 | product, ingredient, unit, size, packaging/prep context | HIGH standard | ACTUAL | YES | standard recipe is not actual consumption | reuse after unit normalization; do not call recipe cost ACTUAL COGS alone |

## Repository facts confirmed

- Revenue adapter exposes ACTUAL only when the candidate is trusted, reporting-date matched and RECONCILED; without a reader it returns NOT_CONNECTED.
- Procurement/AP already uses `v_procurement_order_summary` and `v_procurement_supplier_payables`.
- Supplier payments are recorded separately through active payment records and a payment RPC; purchase and payment are distinct.
- Procurement reporting reads active supplier-payment amounts separately from purchase value.
- Control Tower payables read model excludes cancelled orders from active order counts.

## Sources usable now

Usable within their verified scope:
1. Procurement purchases/order read models.
2. Active supplier-payment records.
3. AP/payables views.
4. Consolidated operating records for Revenue reconciliation input.
5. Recorded cash workbook.
6. Provider settlement exports for covered dates/provider.
7. Period-bounded payroll/attendance.
8. Recorded branch OPEX.
9. Inventory standards/count evidence where populated.
10. Bounded consumption evidence where opening + purchases - ending coverage is proven.
11. Recipe/formula standards.

The Revenue adapter is usable now as a quality gate, not yet as a connected live amount source.

## Gaps carried forward

- Revenue reader not connected.
- Bank truth not connected.
- MoMo truth not connected.
- COD/delivery settlement not connected.
- FoodApp settlement coverage incomplete.
- Current rent/utilities missing.
- Shared/company-wide OPEX incomplete.
- Debt remains estimate-level until reconciled.
- Capex source incomplete.
- Structured Owner movements missing.
- Company-wide consumption coverage not proven.
- Recipe + purchase must never be promoted directly to ACTUAL COGS.
- Profit/net profit remains GAP until required cost and consumption inputs are valid.

## DoD

PASS. Required source classes, quality, usability, conflicts/gaps and next actions are explicit. Missing remains GAP/NOT_CONNECTED; assumptions remain estimates; purchase remains distinct from COGS. No Owner/security boundary was encountered.

Next execution task: TASK-052 — Financial Truth contract v1.  
Autonomy: AUTO_CONTINUE.

# TASK-060 — Actual Cash Opening/Ending Source Truth V1 Evidence

Date: 2026-09-20  
Execution generation: `PFC_8H_V2_RUN_01`  
Status: DONE / SOURCE_TRUTH_DISCOVERY_COMPLETE / DOCS_ONLY

This task is source-truth discovery and classification only. It does not define the detailed TASK-061 contract and does not create a live balance connector.

Google Drive was used READ-ONLY. Repository evidence below intentionally excludes Drive IDs/URLs, raw bank/wallet balances, customer/employee records, secrets and raw private operating rows.

## Five-Step

### QUESTION

Which real sources can currently prove:

- opening cash balance;
- observed ending cash balance;
- account/location scope;
- branch scope;
- point-in-time semantics;
- source coverage;

without deriving observed balance from transaction movement?

### DELETE

The following were explicitly rejected as balance evidence:

- payment method CASH/BANK/MOMO;
- Revenue;
- purchase/payment/AP rows;
- first transaction of a period;
- total inflow - total outflow without an observed anchor;
- free-text Owner notes;
- FoodApp gross sales;
- order-level settlement amount as an account balance;
- synthetic zero;
- current balance backdated into a historical boundary.

No Drive write, database/migration/RPC/write path, dashboard/UI or fake connector was created.

### SIMPLIFY

The task uses only five source classifications:

`OBSERVED_BALANCE | COMPUTED_BALANCE | MOVEMENT_ONLY | CONTEXT_ONLY | NOT_CONNECTED`

Every candidate source is classified by:

- existence;
- source type;
- account/location;
- scope;
- timestamp/date semantics;
- period availability;
- opening candidate;
- ending candidate;
- trust;
- Financial Truth quality implication;
- usability now;
- coverage limitation;
- privacy-safe lineage;
- next gap.

### ACCELERATE

Discovery was schema-first and bounded.

Priority reads focused on:
- internal monthly cash reporting;
- operating transaction/summary sheets;
- Finance/P&L sheets;
- FoodApp settlement exports;
- Bank/MoMo/COD/till-count search terms;
- branch operations sheets.

Once a source class was proven to contain only movement/context semantics, deeper raw-data scanning stopped.

### AUTOMATE

No financial action was automated.

No executable helper, workflow, mapper or connector was added in TASK-060.

---

## Canonical source-truth rule

`OBSERVED_BALANCE` requires a source that directly records a balance/count at a specific point in time.

Examples of acceptable future evidence:
- physical till count at a named branch and timestamp;
- bank statement/app balance at an account and timestamp;
- wallet balance snapshot/export at a timestamp;
- structured COD-held-cash ledger balance at a timestamp;
- structured Owner-held-company-cash balance snapshot.

A movement ledger alone is not an observed balance.

A computed balance may be useful, but it must remain `COMPUTED_BALANCE` and must not be relabeled observed.

---

## Source matrix

| Source class | Exists? | Classification | Account / location | Scope | Time semantics / availability | Opening candidate? | Ending candidate? | Trust | Quality implication | Usable now? | Coverage limitation / next gap |
|---|---|---|---|---|---|---|---|---|---|---|---|
| INTERNAL_MONTHLY_CASH_COMPUTED_BALANCE | YES | COMPUTED_BALANCE | internal operating cash pool | multi-branch operational workbook; **not proven ALL** | monthly sheets available from 2024 through Sep-2026; current bounded read contains entries through 2026-09-16 | YES — computed carry-forward only | YES — computed formula only | MEDIUM | ESTIMATE candidate for computed balance; **observed opening/ending remain GAP** | YES, as downstream computed candidate only | no physical count/statement anchor; current period movement coverage incomplete after 2026-09-16; aggregate account coverage unproven |
| INTERNAL_MONTHLY_CASH_MOVEMENTS | YES | MOVEMENT_ONLY | operational receipts/outflows | branch columns CN1-CN4 plus shared outflows; not canonical enterprise ALL | dated movement rows; current bounded read verified through 2026-09-16 | NO | NO | MEDIUM-HIGH for exact recorded rows | ACTUAL only for exact evidenced movement rows; cannot become balance | YES, as Cash Bridge event/source-coverage input | completeness of all cash/bank/wallet movements is not proven |
| STORE_OPERATING_SUMMARY | YES | MOVEMENT_ONLY | branch operations | explicit branch on rows where present | historical operating records with Total Thu/Chi, app/transfer fields | NO | NO | MEDIUM | ACTUAL candidate only for exact evidenced movements | YES for movement semantics, not balance | no opening/closing balance field; payment/channel mix does not prove cash location balance |
| PROCUREMENT_POS_INVENTORY_DATA | YES | CONTEXT_ONLY | procurement/POS/inventory | scoped operating records | transaction/inventory state, not point cash balance | NO | NO | HIGH for its own domain | no Cash balance quality | NO for TASK-061 balance truth | purchase/AP/inventory/POS facts cannot be converted to opening/ending cash |
| FINANCE_PNL_BUDGET_SHEETS | YES | CONTEXT_ONLY | planning / P&L / cost models | branch/company context varies | budgets, costs, revenue/COGS/P&L analysis | NO | NO | MEDIUM for planning/context | ESTIMATE/CONTEXT only; not balance | NO for balance truth | planning numbers, costs and P&L do not prove liquidity point balance |
| FOODAPP_PROVIDER_SETTLEMENT_EXPORT | PARTIAL | MOVEMENT_ONLY | provider settlement stream | exact provider/store/date where export exists | order-level gross/fees/net settlement semantics; latest identified provider exports are partial rather than current complete coverage | NO | NO | HIGH for exact covered export rows | ACTUAL candidate for exact covered settlement movement; not an account balance | YES for later settlement movement coverage | payout receipt/account balance and complete current provider coverage are not proven |
| PHYSICAL_STORE_TILL_COUNT | NO structured source verified | NOT_CONNECTED | cash drawer/safe per store | must be branch-specific | requires direct count + timestamp | YES when observed at/near start boundary | YES when observed at end boundary | potentially HIGH once structured | NOT_CONNECTED now | NO | no structured timestamped CN1-CN4 till/safe count found |
| BANK_ACCOUNT_BALANCE_STATEMENT | NO business balance evidence verified | NOT_CONNECTED | business bank account(s) | account-specific; branch attribution only if proven | requires statement/app/export point balance | YES | YES | potentially HIGH once connected | NOT_CONNECTED now | NO | employee/QR/account-reference material exists but is CONTEXT_ONLY and is not a balance statement |
| MOMO_WALLET_BALANCE | NO balance/history export verified | NOT_CONNECTED | business MoMo/wallet | wallet-specific | requires wallet balance/history point evidence | YES | YES | potentially HIGH once connected | NOT_CONNECTED now | NO | payment method references do not prove wallet balance |
| COD_DELIVERY_HELD_CASH | NO structured held-cash ledger verified | NOT_CONNECTED | internal/third-party delivery-held cash | ledger/account/collector-specific | requires outstanding/held/remitted state + timestamp | YES if a historical structured state exists | YES | potentially HIGH once structured | NOT_CONNECTED now | NO | delivery/ship fields alone do not prove money still held or not remitted |
| OWNER_HELD_COMPANY_CASH | NO structured balance snapshot verified | NOT_CONNECTED | Owner-held company cash/account if such source exists | account/location-specific | requires structured company-cash balance + timestamp | YES | YES | potentially HIGH once evidenced | NOT_CONNECTED now | NO | free-text notes/budget context are insufficient |
| PROVIDER_ACCOUNT_BALANCE | NO provider wallet/account balance verified | NOT_CONNECTED | FoodApp/provider account if balance-bearing | provider-specific | requires explicit provider balance or payout-account statement | YES only if balance-bearing source exists | YES | potentially HIGH | NOT_CONNECTED now | NO | order settlement rows are movement evidence, not provider/bank account balance |

---

## Key discovery — internal monthly cash workbook

The strongest currently available balance-like source is the internal monthly cash workbook.

Bounded formula inspection proved:

1. the current month has a labeled prior-month ending amount used as a carry-forward opening;
2. the prior month's ending is calculated from:
   - branch receipt columns;
   - shared cash outflow columns;
   - prior carry-forward;
3. the current-month opening equals that prior computed ending;
4. the monthly `Còn Lại` value is a formula over movement totals plus carry-forward;
5. no separate physical till count / bank statement / wallet observed-balance field was found in the inspected schema;
6. current September dated movement evidence was verified through 2026-09-16, while this task runs on 2026-09-20.

Therefore:

```text
monthly carry-forward opening = COMPUTED_BALANCE candidate
monthly Còn Lại              = COMPUTED_BALANCE candidate

neither is OBSERVED_BALANCE
```

The workbook is valuable and should be normalized later, but it cannot by itself prove observed opening or observed ending.

Historical labels are not used as sufficient timestamp evidence. A label such as "prior month ending" is weaker than an observed balance snapshot with explicit point time/account scope.

---

## Opening-balance semantics for TASK-061/062

An opening balance may be trusted only when one of these paths is evidenced:

### Path A — direct observed opening

A real balance/count exists at the target start boundary with:
- account/location;
- branch/scope;
- timestamp;
- source;
- lineage.

### Path B — computed opening from earlier observed anchor

A trusted observed snapshot exists before the target start, and every relevant movement between that snapshot and the exact target start is proven complete.

The result is a **COMPUTED_BALANCE**, not a direct observed opening.

Forbidden:
- use first sale/payment as opening;
- use zero because no prior row exists;
- backdate a current balance.

---

## Ending-balance semantics for TASK-061/062

### Observed ending

Requires a direct point-in-time count/balance at the accepted end boundary.

Examples:
- closing till count;
- bank statement/app point balance;
- wallet point balance;
- COD held-cash ledger state.

### Computed ending

May be calculated from:

```text
trusted opening anchor
+ complete evidenced inflows
- complete evidenced outflows
```

but remains `COMPUTED_BALANCE`.

It must never be relabeled `OBSERVED_BALANCE`.

The existing internal monthly `Còn Lại` formula is in this class.

---

## Usable-now sources

### 1. Internal monthly cash workbook — usable now, bounded

Use now for:
- recorded cash-movement semantics;
- historical monthly movement lineage;
- a computed carry-forward balance candidate.

Do not use now for:
- observed physical cash;
- bank balance;
- MoMo balance;
- COD balance;
- enterprise ALL liquidity;
- observed ending balance.

### 2. Operating summary data — usable for movement/context

Branch-level Total Thu/Chi and payment/app/transfer fields may support later movement coverage.

They do not create account balances.

### 3. FoodApp provider settlement exports — usable for exact covered settlement movement

Net settlement fields can support provider/date-scoped cash-movement evidence when reconciliation requirements are met.

They do not prove:
- payout received into bank;
- current bank balance;
- provider account balance;
- complete current provider coverage.

---

## Movement-only sources

The following must stay movement-only unless a future source adds explicit point balance:

- internal daily/monthly cash movement rows;
- branch operating Total Thu/Chi;
- POS/payment-method summaries;
- FoodApp settlement rows;
- Procurement supplier-payment events.

Movement presence never implies COMPLETE balance-source coverage.

---

## NOT_CONNECTED balance sources

No structured point-balance evidence was verified for:

- physical till/safe count by branch;
- business bank account balance/statement;
- MoMo/wallet balance/history;
- COD/delivery-held cash outstanding state;
- Owner-held company cash balance;
- provider account/payout destination balance.

These remain `NOT_CONNECTED`, not zero.

---

## Enterprise / ALL rule

The current internal cash workbook spans multiple branches, but that does **not** prove enterprise ALL liquidity.

Enterprise/consolidated balance can only be proven when the required account classes and branches are explicit and coverage proves them all.

Missing Bank/MoMo/COD/physical till/Owner-held cash prevents an automatic `ALL / aggregate_proven=true` upgrade.

---

## Exact gaps carried forward

1. No observed opening anchor was verified for the current enterprise cash scope.
2. No observed ending cash snapshot was verified.
3. Current internal cash movement workbook is not fresh beyond 2026-09-16 in the bounded read.
4. Completeness of every movement needed to compute current liquidity is not proven.
5. No structured CN1-CN4 till/safe counts were found.
6. No business bank balance/statement export was found.
7. No MoMo wallet balance/history export was found.
8. No structured COD outstanding/held-cash ledger was found.
9. FoodApp settlement movement exists only for partial provider/date coverage; payout/bank-receipt truth is separate.
10. No structured Owner-held-company-cash point balance was verified.
11. Multi-branch workbook scope does not prove enterprise ALL account coverage.
12. Historical point balances require historical snapshots; current values cannot be backdated.

---

## OWNER TOMORROW FIELD CHECK

These checks are **not required to continue the night run**. They are the highest-value real-world checks for Owner after returning.

### A. Physical cash — CN1, CN2, CN3, CN4

At one agreed boundary time for each store:
- physically count drawer/safe cash;
- record branch;
- exact timestamp;
- whether this is before open / after close;
- whether cash has already been removed/deposited;
- whether any hand-off to another person is pending.

Do not merge four branch counts into ALL until every required location is covered.

### B. Internal cash workbook semantics

Confirm with the person who maintains the cash workbook:
- whether CN1-CN4 columns are cash collected, total direct sales, or another measure;
- whether every relevant cash outflow is recorded;
- whether bank transfers and wallet movements are included or excluded;
- why current dated entries stop at the latest recorded date;
- whether there is any separate physical count that is not currently in the workbook.

### C. Business bank

For every business account actually used by MAGASIN:
- identify account class/owner;
- confirm whether historical statements can be exported;
- capture a point balance at an agreed timestamp;
- verify whether start/end month historical balances are available;
- do not use QR/account-reference data as balance evidence.

### D. MoMo / wallet

For every business wallet:
- capture current balance at timestamp;
- verify transaction-history/export availability;
- verify historical point-balance availability if any.

### E. COD / self-delivery held cash

Confirm:
- whether any internal or external delivery person can hold customer cash before remittance;
- where that outstanding amount is recorded;
- who owns the ledger;
- whether held/remitted status and timestamp exist.

If no ledger exists, COD remains NOT_CONNECTED.

### F. FoodApp settlement

For each provider:
- identify actual payout destination;
- verify payout/settlement history;
- distinguish order net settlement from actual payout received;
- determine whether current September coverage exists beyond the historical exports already found.

### G. Owner-held company cash

If Owner personally holds company cash outside store drawers/bank/wallet:
- identify the cash/account class;
- create a structured point snapshot with timestamp;
- do not rely on free-text notes.

---

## Recommended normalization order — TASK-061 / TASK-062

### Priority 1 — generic balance truth

TASK-061 should first define the minimum canonical point-balance semantics that work for:
- physical cash;
- bank;
- wallet;
- COD-held cash;
- Owner-held company cash;
- computed balance.

The contract must explicitly distinguish:

`OBSERVED_BALANCE` vs `COMPUTED_BALANCE`.

### Priority 2 — internal computed cash workbook

TASK-062 can normalize the existing monthly cash workbook first because it is available now.

Rules:
- movement rows remain movement evidence;
- carry-forward/remaining formula remains COMPUTED_BALANCE;
- quality cannot be upgraded to observed;
- scope cannot become ALL without external account coverage;
- stale/incomplete period coverage stays explicit.

### Priority 3 — physical till observed snapshots

Once field evidence exists, normalize CN1-CN4 physical cash count as the first direct observed cash source.

### Priority 4 — bank statement/app balances

Normalize only after a real business account balance/statement source exists.

### Priority 5 — MoMo/wallet

Normalize only from actual wallet balance/history evidence.

### Priority 6 — COD held-cash ledger

Normalize only if structured outstanding/remittance state exists.

### Priority 7 — provider settlement movement/account evidence

Keep order settlement movement separate from bank/provider account balance.

---

## Source classification summary

### OBSERVED_BALANCE

**None verified in current bounded Drive discovery.**

### COMPUTED_BALANCE

Verified:
- internal monthly cash carry-forward opening;
- internal monthly calculated remaining/ending balance.

Both are computed candidates only.

### MOVEMENT_ONLY

Verified:
- internal cash movement rows;
- branch operating receipt/outflow summaries;
- FoodApp settlement exports;
- supplier-payment movement semantics from the existing canonical Procurement path.

### CONTEXT_ONLY

Verified:
- finance/P&L/budget models;
- procurement/inventory/POS context where no point cash balance exists;
- account-reference / QR material without balance semantics;
- branch profitability analysis.

### NOT_CONNECTED

Current point-balance truth:
- physical till/safe;
- bank;
- MoMo/wallet;
- COD-held cash;
- Owner-held company cash;
- provider payout/account balance.

---

## DoD

PASS.

TASK-061 can now define the Cash Balance Financial Truth Contract without guessing:

- the only currently verified balance-like source is computed, not observed;
- no observed source is silently promoted;
- movement-only/context-only sources are explicitly separated;
- every missing balance source remains GAP/NOT_CONNECTED rather than zero;
- point-time and scope rules are explicit;
- Owner field checks are isolated from tonight's autonomous execution;
- Google Drive remained READ-ONLY;
- no private raw financial values or Drive locators were committed.

Next task:

**TASK-061 — Cash Balance Financial Truth Contract**

Autonomy:

`AUTO_CONTINUE`

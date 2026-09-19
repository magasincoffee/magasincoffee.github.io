# TASK-062 — Cash Balance Source Mapper V1 Evidence

Date: 2026-09-20  
Execution generation: `PFC_8H_V2_RUN_01`  
Status: DONE / DoD MET / REMOTE_CI_GREEN

Google Drive remained READ-ONLY. TASK-062 did not scan broadly or write to Drive. No raw balance, account number, Drive ID/URL, private row, credential or secret is committed.

## Five-Step

### QUESTION

Map TASK-060 source classifications into canonical `cash-balance-truth.v1` wrappers without upgrading provenance, inventing balance evidence or confusing movements with point balances.

### DELETE

TASK-062 adds no:
- live Bank/MoMo/COD connector;
- Drive write;
- DB/migration/RPC/write path;
- UI/dashboard;
- Cash Bridge arithmetic;
- enterprise/account coverage engine;
- synthetic zero;
- first-transaction opening;
- current-balance backdating;
- Revenue/purchase/AP/FoodApp gross/payment-method → balance conversion.

### SIMPLIFY

Created one pure mapper only:

- `02_CORE/shared/cash-balance-source-mapper-v1.mjs`

and one targeted test suite:

- `09_QA/business-os/cash-balance-source-mapper.test.mjs`

No new enterprise contract was created.

The mapper reuses:
- `normalizeCashBalanceTruth()`;
- `cash-balance-truth.v1`;
- Financial Truth V1;
- existing Cash Bridge compatibility surfaces.

### ACCELERATE

Mapping order:
1. internal monthly cash workbook;
2. future direct observed point facts;
3. NOT_CONNECTED source families;
4. MOVEMENT_ONLY / CONTEXT_ONLY guards;
5. direct Cash Bridge compatibility.

### AUTOMATE

Only deterministic pure mapping, tests and CI were added.

No financial action is automated.

---

## Mapper API / result shape

Primary functions:

```text
mapCashBalanceSourceFact(...)
mapInternalMonthlyCashOpening(...)
mapInternalMonthlyCashRemainder(...)
mapObservedCashPoint(...)
mapUnavailableCashBalanceSource(...)
mapNonBalanceSourceFact(...)
isCurrentlyUnconnectedBalanceSource(...)
```

Output shape:

```text
mapper_version
source_class
classification
balance
source_status
coverage_hint
diagnostics
lineage
```

Important rule:

**No numeric side-channel exists outside `balance.truth.value`.**

`balance` is always the canonical TASK-061 wrapper or a fail-closed/null truth wrapper produced through TASK-061 semantics.

---

## Source classes

Mapper recognizes:

```text
INTERNAL_MONTHLY_CASH_WORKBOOK
PHYSICAL_STORE_TILL_COUNT
BANK_ACCOUNT_BALANCE_STATEMENT
MOMO_WALLET_BALANCE
COD_DELIVERY_HELD_CASH
OWNER_HELD_COMPANY_CASH
PROVIDER_ACCOUNT_BALANCE
INTERNAL_CASH_MOVEMENT_ROWS
STORE_OPERATING_SUMMARY
FOODAPP_PROVIDER_SETTLEMENT_EXPORT
PROCUREMENT_SUPPLIER_PAYMENT
POS_INVENTORY_FACT
FINANCE_PNL_BUDGET_CONTEXT
```

Classifications remain exactly:

```text
OBSERVED_BALANCE
COMPUTED_BALANCE
MOVEMENT_ONLY
CONTEXT_ONLY
NOT_CONNECTED
```

TASK-062 does not create a second taxonomy.

---

## Internal monthly cash workbook mapping

### Carry-forward

Monthly carry-forward maps only as:

```text
balance_role  = OPENING
balance_basis = COMPUTED_BALANCE
source_class  = INTERNAL_MONTHLY_CASH_WORKBOOK
```

The mapper does **not** set these proof fields automatically:

```text
anchor_observed
computation_proven
movement_coverage
dependency_qualities
computation_lineage
```

Therefore the current real-source semantics from TASK-060 remain fail-closed because:
- no observed anchor is proven;
- Sep-2026 movement evidence was only verified through 2026-09-16;
- movement completeness is not proven.

Current-source-style mapping yields:

```text
classification = COMPUTED_BALANCE
quality        = GAP
value          = null
```

even when a raw carry-forward formula exists.

### Fully proven hypothetical computed opening

If a future caller supplies:
- observed anchor proof;
- `computation_proven=true`;
- movement coverage `COMPLETE`;
- compatible scope/time;
- canonical dependency qualities;
- privacy-safe lineage;

the mapper passes the value into TASK-061 computed-opening gates.

An ESTIMATE dependency caps result quality at ESTIMATE.

### Monthly calculated `Còn Lại`

Calculated remainder is never mapped as observed ending.

Attempting to map it to observed ending yields fail-closed semantics plus:

`COMPUTED_REMAINDER_NOT_OBSERVED_ENDING`

No current calculated remainder is backdated or promoted to observed truth.

---

## Future observed point mapping

The same generic observed mapper supports future direct evidence for:

- PHYSICAL_STORE_TILL_COUNT;
- BANK_ACCOUNT_BALANCE_STATEMENT;
- MOMO_WALLET_BALANCE;
- COD_DELIVERY_HELD_CASH;
- OWNER_HELD_COMPANY_CASH;
- PROVIDER_ACCOUNT_BALANCE.

Numeric OBSERVED_BALANCE is possible only when caller already provides:
- explicit source class;
- valid account class + privacy-safe logical label;
- explicit branch/channel scope;
- point date/timezone/timestamp;
- `boundary_proven=true`;
- `observed_proven=true`;
- canonical source/as-of/reconciliation/lineage;
- finite value.

The mapper does not infer proof flags.

Explicit observed zero is preserved.

Finite generic negative balance remains allowed by TASK-061.

Missing/NaN/Infinity fail closed.

---

## NOT_CONNECTED mapping

The source families currently missing direct point-balance evidence are mapped explicitly to:

```text
balance_basis = NOT_CONNECTED
quality       = NOT_CONNECTED
value         = null
source_status = NOT_CONNECTED
```

Covered source families:
- physical till/safe;
- business Bank;
- MoMo/wallet;
- COD held cash;
- Owner-held company cash;
- provider account balance.

No zero placeholder is used.

---

## MOVEMENT_ONLY / CONTEXT_ONLY rejection

These remain non-balance sources:

### MOVEMENT_ONLY

- internal cash movement rows;
- store/branch Thu-Chi operating summaries;
- FoodApp provider settlement export;
- Procurement supplier payment.

They map to canonical GAP/null balance wrappers with:

`MOVEMENT_ONLY_IS_NOT_BALANCE`

### CONTEXT_ONLY

- POS/inventory facts;
- finance/P&L/budget context.

They map to GAP/null with:

`CONTEXT_ONLY_IS_NOT_BALANCE`

First transaction amount cannot become opening balance.

Payment-method metadata cannot prove account balance.

---

## Numeric parsing

Spreadsheet-like numeric parsing is strict.

Accepted:
- finite JS number;
- plain decimal string such as `120.50`.

Rejected:
- blank;
- whitespace-only;
- null;
- undefined;
- NaN;
- Infinity;
- grouped/localized ambiguous forms such as `1,000`, `1.000.000`, `12 000`;
- malformed alphanumeric strings.

The mapper never relies on `Number("")`, so blank cannot become zero.

---

## Scope / time / privacy

The mapper does not choose target dates/timezones.

TASK-061 validation remains authoritative for:
- point date/timezone/timestamp;
- historical backdating protection;
- branch/channel compatibility;
- Financial Truth ALL proof;
- account ALL proof.

One branch/account cannot become enterprise ALL.

Privacy-unsafe source metadata, account-number-like labels and unsafe lineage fail closed or are removed through canonical privacy handling.

No Drive locators or raw account identities exist in source code/fixtures.

---

## Coverage boundary

TASK-062 carries only a `coverage_hint`:

```text
COMPLETE
PARTIAL
MISSING
NOT_CONNECTED
```

It is metadata only.

A coverage hint cannot upgrade:
- balance quality;
- computed-opening proof;
- enterprise Cash coverage.

Presence of rows never implies COMPLETE.

TASK-063 owns the source/account coverage engine.

---

## Pre-mapped envelope hardening

Initial implementation supported mapper-output idempotence by trusting an input carrying `mapper_version`.

Audit identified that as a semantic bypass risk: a caller could forge a pre-mapped envelope and attempt to bypass source/classification dispatch.

Before merge, the dispatcher was hardened to:
1. re-run `normalizeCashBalanceTruth()` on the embedded canonical balance;
2. verify source_class ↔ classification ↔ balance_basis compatibility;
3. reject incompatible pre-mapped envelopes as fail-closed CONTEXT_ONLY;
4. emit `PREMAPPED_BALANCE_PROVENANCE_MISMATCH`.

Valid canonical mapper output remains idempotent.

This was a real TASK-062 hardening fix, not a test-only change.

---

## Cash Bridge compatibility

Cash Bridge production helper remains unchanged.

Valid mapped wrappers flow through:

`cashBalanceTruthForBridge(...)`

and then into existing:

`calculateCashBridge(...)`

Tests prove:
- valid future observed opening/ending wrappers are accepted unchanged;
- current internal workbook mapping does **not** make computed ending ACTUAL because opening proof/coverage remain insufficient.

No balance source mapper performs Cash Bridge arithmetic.

---

## Tests

Final TASK-062 targeted suite:

**47 / 47 PASS / 0 FAIL**

Coverage includes:
- source enums/classifications;
- current internal carry-forward computed-only mapping;
- current real-source fail-closed state;
- PARTIAL movement coverage;
- fully proven computed opening;
- ESTIMATE cap;
- monthly remainder not observed ending;
- backdating block;
- physical till observed;
- Bank observed;
- MoMo/COD/Owner/provider observed;
- explicit observed zero;
- generic negative balance;
- all NOT_CONNECTED source families;
- internal movement rejection;
- branch summary rejection;
- FoodApp settlement rejection;
- supplier payment rejection;
- POS/inventory context rejection;
- P&L/budget context rejection;
- first transaction rejection;
- payment-method rejection;
- strict decimal strings;
- blank/null/undefined never zero;
- malformed numeric;
- NaN/Infinity;
- scope/time mismatch;
- unknown/unproven ALL;
- privacy/account labels;
- coverage_hint cannot upgrade truth;
- deterministic mapping;
- true idempotence;
- pre-mapped provenance bypass rejection;
- Cash Bridge compatibility;
- current workbook cannot produce trusted bridge ending;
- no write/external API calls;
- no embedded Drive/account identity.

Full Business OS suite:

**301 logical checks / 0 FAIL**

---

## CI / PR chronology

Earlier final implementation head before hardening:

`4e1f9a1c5940481cdc91e3c98bff4e1bf231395c`

Push:
- run `35471804559`;
- job `105973979945`;
- Node v20.20.2;
- mapper 45/45;
- full suite green.

PR-head:
- run `35471845089`;
- job `105974090906`;
- Node v20.20.2;
- mapper 45/45;
- full suite green.

These were superseded by final provenance hardening.

### Final required PR-head gate

Final PR head:

`fdf378ac5216db9cb4356d5176cde89a344d3afc`

PR:
`#187`

Business OS Contract Tests:
- run `35472567129`;
- job `105976091343`;
- Node `v20.20.2`;
- mapper: **47/47 PASS**;
- Cash Balance Truth: 40/40;
- Financial Truth: 16/16;
- Cash taxonomy: 29/29;
- Cash calculator: 46/46;
- Procurement Financial Truth: 34/34;
- Partial Financial Baseline: 37/37;
- full Business OS: **301 logical checks / 0 fail**;
- conclusion: `success`.

### Merge

PR #187 merged as:

`cf8b24715c3f6b3ed2368f5d6f568bd331130a0d`

### Exact post-merge gate

Business OS Contract Tests:
- run `35472597015`;
- job `105976172672`;
- Node `v20.20.2`;
- mapper: **47/47 PASS**;
- full Business OS: **301 logical checks / 0 fail**;
- conclusion: `success`.

Collateral exact-merge workflows:
- Validate MAGASIN GitHub Pages source `35472597049`: success;
- Pages build/deployment `35472596518`: success.

---

## Files changed

Created:
- `02_CORE/shared/cash-balance-source-mapper-v1.mjs`;
- `09_QA/business-os/cash-balance-source-mapper.test.mjs`.

Updated:
- `.github/workflows/business-os-contract-tests.yml`.

Not changed:
- Cash Bridge calculator;
- Cash Balance Truth contract/helper;
- DB/migrations;
- Procurement production;
- Owner UI;
- Drive.

---

## Implementation commits

Key branch commits:
- `13794bbee6f596d3b2add68f6f84dc1f8fe7f79a` — initial source mapper;
- `ecf9e1150b936d622f6343d7a81d74ef8d050b6b` — preserve payment-method guard;
- `8f89fd2e794c6e2dbd6b0b90f4235aa6ac173e0d` — explicit payment metadata through failures;
- `8ddc037ece429c040e7da4b582d32bc04abd993a` — mapper idempotence;
- `9edfb73e459c0cd8286cdff823abdc39b3cb4d85` — preserve movement-only rejection;
- `d7dccded69102a5eca7a897a4b79e39e42e62a59` — targeted suite;
- `4e1f9a1c5940481cdc91e3c98bff4e1bf231395c` — CI gate;
- `be665e73f47491a6bad84a0fdadf4cc53aa6f953` — pre-mapped envelope revalidation;
- `fdf378ac5216db9cb4356d5176cde89a344d3afc` — final provenance-bypass regressions.

PR:
`#187`

Merge:
`cf8b24715c3f6b3ed2368f5d6f568bd331130a0d`

---

## Carried gaps

TASK-062 does not create new source evidence.

Current direct observed point-balance sources remain NOT_CONNECTED for:
- physical till/safe;
- Bank balance/statement;
- MoMo/wallet;
- COD held cash;
- Owner-held company cash;
- provider account balance.

Internal monthly cash source remains:
- COMPUTED_BALANCE candidate for opening;
- MOVEMENT_ONLY for rows;
- current bounded Sep evidence only verified through 2026-09-16;
- not proven COMPLETE;
- not OBSERVED_ENDING;
- not enterprise ALL.

TASK-063 must now determine explicit source/account/period coverage without changing these provenance facts.

---

## DoD

PASS.

TASK-062 cannot upgrade TASK-060 source truth:
- current workbook remains computed-only and fail-closed without anchor/coverage;
- no observed ending is synthesized;
- unconnected sources remain null;
- movement/context sources remain non-balance;
- future direct observed facts have a canonical path;
- strict numeric/privacy/scope/time guards apply;
- forged pre-mapped envelopes cannot bypass provenance;
- required PR-head and exact post-merge Node 20 gates are green.

Next task:

**TASK-063 — Cash Source Coverage V1**

Autonomy:

`AUTO_CONTINUE`

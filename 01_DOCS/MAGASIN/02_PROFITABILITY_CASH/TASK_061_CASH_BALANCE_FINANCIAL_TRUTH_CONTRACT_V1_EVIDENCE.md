# TASK-061 — Cash Balance Financial Truth Contract V1 Evidence

Date: 2026-09-20  
Execution generation: `PFC_8H_V2_RUN_01`  
Status: DONE / DoD MET / REMOTE_CI_GREEN

Google Drive remained READ-ONLY and was not re-scanned for this contract task. No raw balance, account number, Drive locator, customer/employee record, credential or secret is stored here.

## Five-Step

### QUESTION

Define the smallest canonical, source-agnostic wrapper that can represent one Cash point-balance truth by:
- role;
- provenance basis;
- point date/timezone/timestamp;
- account/location;
- Financial Truth scope;
- evidence quality;

while preserving the hard distinction:

```text
OBSERVED_BALANCE != COMPUTED_BALANCE
MOVEMENT_ONLY != BALANCE
CONTEXT_ONLY != BALANCE
```

and remaining directly compatible with Cash Bridge opening/observed-ending inputs.

### DELETE

TASK-061 does not add:
- source-specific reader/mapper;
- Google Drive reader;
- Bank/MoMo connector;
- DB/migration/RPC/write path;
- UI/dashboard;
- Cash movement arithmetic;
- balance coverage engine;
- duplicate Financial Truth;
- duplicate Cash Bridge calculation;
- balance inference from payment method, Revenue, purchase/AP or FoodApp gross;
- synthetic zero;
- automatic ALL aggregation;
- current-balance backdating.

### SIMPLIFY

Created exactly one contract and one pure helper:

- `02_CORE/contracts/cash-balance-truth.v1.json`
- `02_CORE/shared/cash-balance-truth-v1.mjs`

The numeric balance remains exclusively inside a canonical `financial-truth.v1` record with:

`group=CASH`

No competing quality vocabulary was introduced.

### ACCELERATE

The helper validates provenance, point, account, scope and quality before TASK-062 maps real sources.

It also exposes the inner canonical Financial Truth record directly to existing Cash Bridge without changing `calculateCashBridge()`.

### AUTOMATE

Only deterministic validation/tests/CI were added.

No financial action is automated.

---

## Contract shape

```text
schema_version
balance_role
balance_basis
point
account
truth
proof
diagnostics
```

### balance_role

Exact enum:

```text
OPENING
OBSERVED_ENDING
```

Metric mapping:

```text
OPENING         -> cash_opening_balance
OBSERVED_ENDING -> cash_observed_ending_balance
```

Role/metric mismatch fails closed.

### balance_basis

Exact TASK-060 source taxonomy:

```text
OBSERVED_BALANCE
COMPUTED_BALANCE
MOVEMENT_ONLY
CONTEXT_ONLY
NOT_CONNECTED
```

### account classes

```text
PHYSICAL_CASH
BANK
MOMO_WALLET
COD_HELD_CASH
OWNER_HELD_COMPANY_CASH
PROVIDER_ACCOUNT
OTHER_EVIDENCED_CASH
```

The label is a privacy-safe logical label, not an account number/token.

Account label `ALL` requires `account.aggregate_proven=true`.

Financial Truth branch/channel `ALL` separately requires its canonical `aggregate_proven=true`.

One branch/account cannot be silently promoted to enterprise ALL.

---

## Point semantics

`point` contains:

```text
date
timezone
timestamp
boundary_proven
```

Rules:
- date must be explicit ISO date;
- timezone is explicit;
- timestamp is exact zoned ISO timestamp;
- timestamp must represent the same local date in the declared timezone;
- numeric balance requires `boundary_proven=true`;
- Financial Truth period is exactly:
  `start=end=point.date`;
- helper never chooses a business opening/closing clock window;
- optional caller `targetPoint` is validated exactly;
- current point cannot be backdated to a historical target.

---

## OBSERVED_BALANCE gates

A numeric observed balance requires:
- `balance_basis=OBSERVED_BALANCE`;
- `proof.observed_proven=true`;
- `point.boundary_proven=true`;
- explicit valid account;
- explicit valid Financial Truth scope;
- valid point date/timezone/timestamp;
- valid source;
- valid as-of;
- non-UNKNOWN reconciliation;
- non-empty privacy-safe lineage;
- finite numeric value.

Observed balance may carry ACTUAL or ESTIMATE according to caller evidence.

Canonical reconciliation values such as:
- RECONCILED;
- PARTIAL;
- UNRECONCILED;
- NOT_APPLICABLE

are not arbitrarily rejected by TASK-061.

`UNKNOWN` cannot carry numeric truth.

Explicit proven observed zero is valid.

Missing/NaN/Infinity remain GAP/null.

Finite negative generic balance is allowed because account-specific overdraft/physical-cash policy is outside TASK-061.

`-0` normalizes to `0` through Financial Truth V1.

### MOVEMENT_ONLY / CONTEXT_ONLY

They can never carry a numeric point balance.

They fail closed as GAP/null.

### NOT_CONNECTED

Always remains:

```text
quality = NOT_CONNECTED
value   = null
```

Missing source never becomes zero.

---

## COMPUTED_BALANCE gates

Computed provenance is deliberately distinct from observed provenance.

TASK-061 allows numeric COMPUTED_BALANCE only for:

`balance_role=OPENING`

Required proof:

```text
computation_proven = true
anchor_observed = true
movement_coverage = COMPLETE
dependency_qualities = canonical qualities
computation_lineage = non-empty privacy-safe lineage
```

TASK-061 validates a caller-provided computed value and proof only.

It does **not** calculate anchor + movements.

### Quality propagation

For computed opening:
- explicit dependency NOT_CONNECTED -> NOT_CONNECTED/null;
- GAP dependency -> GAP/null;
- missing/incomplete proof -> GAP/null;
- PARTIAL/MISSING movement coverage -> GAP/null;
- any ESTIMATE dependency -> output at most ESTIMATE;
- ACTUAL is possible only when requested truth and dependencies support ACTUAL.

### Observed ending prohibition

```text
OBSERVED_ENDING + COMPUTED_BALANCE
-> GAP/null
-> OBSERVED_ENDING_REQUIRES_OBSERVED_BALANCE
```

Therefore a calculated closing number can never be relabeled as Cash Bridge observed ending.

---

## Non-balance evidence guard

The helper fails closed when caller presents payment-method-like/non-balance evidence as balance proof.

This guard does not map any source.

It prevents semantic promotion of:
- payment method;
- Revenue;
- purchase;
- AP;
- FoodApp gross;
- movement-only evidence

into a point balance.

TASK-062 remains responsible for source-specific mapping.

---

## Privacy

Numeric truth fails closed on privacy-unsafe balance evidence.

Guarded surfaces include:
- account label;
- source;
- evidence;
- lineage;
- message/reason;
- computed proof lineage.

URLs / Drive locators and obvious account-number-like labels cannot become canonical numeric balance truth.

The public repository uses sanitized logical labels only.

---

## Cash Bridge compatibility

No change was made to:

`02_CORE/shared/cash-bridge-v1.mjs`

Compatibility is provided by:

`cashBalanceTruthForBridge(balance, expectedRole)`

For a valid wrapper:
- `OPENING.truth` passes directly to existing `openingBalance`;
- `OBSERVED_ENDING.truth` passes directly to existing `observedEndingBalance`.

Targeted integration test passes both inner Financial Truth records into existing `calculateCashBridge()`.

With complete event coverage and no movements:
- opening is preserved;
- computed ending is preserved;
- observed ending is preserved;
- variance evaluates correctly.

No Cash Bridge arithmetic or semantic path was duplicated.

---

## Tests

Targeted TASK-061 suite:

**40 / 40 PASS / 0 FAIL**

Coverage includes:
- exact contract enums;
- observed opening ACTUAL;
- observed ending ACTUAL;
- explicit observed zero;
- NOT_CONNECTED/null;
- MOVEMENT_ONLY rejection;
- CONTEXT_ONLY rejection;
- payment-method-like evidence rejection;
- computed opening full provenance;
- missing observed anchor;
- PARTIAL/MISSING/NOT_CONNECTED movement coverage;
- ESTIMATE dependency cap;
- GAP dependency;
- computed ending prohibition;
- role/metric mismatch;
- point date mismatch;
- target date/backdating mismatch;
- timezone mismatch;
- scope mismatch;
- unknown branch/channel;
- unproven Financial Truth ALL;
- unproven account ALL;
- proven account/Financial Truth ALL;
- boundary proof;
- observed proof;
- missing/NaN/Infinity;
- negative finite balance;
- -0 normalization;
- privacy unsafe source/lineage;
- account-number-like label;
- PARTIAL reconciliation allowed;
- UNKNOWN reconciliation rejected;
- deterministic normalization;
- true normalize(normalize(x)) idempotence;
- direct Cash Bridge compatibility;
- role-confusion protection;
- static no reader/write guard;
- no source-family inference.

### Full Business OS suite

Final suite:

**254 logical checks / 0 FAIL**

This is the previous 214-check suite plus 40 TASK-061 tests.

---

## CI chronology

### Initial targeted failure — test construction only

Run:
`35467748594`

Targeted Cash Balance:
39/40.

The failing "missing value" fixture called a JavaScript function parameter with `undefined`, which activated its default value `100`.

No contract/helper numeric defect was found.

Repair:
the test now deletes `truth.value` explicitly to create a real missing-value case.

### Stale full-suite regressions

After targeted TASK-061 became green, full regression exposed historical state assertions in:

`09_QA/business-os/five-step-schedule-first.test.mjs`

Stale assumptions included:
- hard-coded prepared queue id `PFC_3H_V1`;
- current-state wording such as "conversation-aware handoff";
- current-state phrase "financial truth spine".

These conflicted with the already canonical released `PFC_8H_V2` state, not with TASK-061 business logic.

Bounded future-safe repairs:
- current queue id must be a canonical `PFC_*` id rather than one frozen generation;
- handoff architecture remains tested in its canonical handoff document;
- current state is tested through canonical architecture/Financial Baseline references rather than stale prose.

No production financial semantics were changed for these repairs.

### Final push gate

Head:

`3fb765f537171b9901168aa3b2ad8a22a4576ce4`

Run:
`35467887723`

Job:
`105963446151`

Node:
`v20.20.2`

Conclusion:
`success`

- Cash Balance targeted: 40/40;
- Financial Truth: 16/16;
- Cash taxonomy: 29/29;
- Cash calculator: 46/46;
- Procurement Financial Truth: 34/34;
- Partial Financial Baseline: 37/37;
- full Business OS: 254 logical checks / 0 fail.

### Required PR-head gate

PR:
`#186`

Final PR head:

`3fb765f537171b9901168aa3b2ad8a22a4576ce4`

Business OS Contract Tests:
- run: `35467911185`;
- job: `105963509793`;
- Node: `v20.20.2`;
- conclusion: `success`;
- TASK-061 targeted: 40/40;
- full Business OS: 254 logical checks / 0 fail.

### Merge

PR #186 merge commit:

`a9313eadc4492f144ca3c08b1021d1aa51f31a0b`

### Exact post-merge gate

Business OS Contract Tests:
- run: `35467940997`;
- job: `105963589708`;
- Node: `v20.20.2`;
- conclusion: `success`;
- TASK-061 targeted: 40/40;
- full Business OS: 254 logical checks / 0 fail.

Collateral workflows on exact merge commit:
- Validate MAGASIN GitHub Pages source `35467941013`: success;
- Pages build/deployment `35467940524`: success.

---

## Files changed

Created:
- `02_CORE/contracts/cash-balance-truth.v1.json`;
- `02_CORE/shared/cash-balance-truth-v1.mjs`;
- `09_QA/business-os/cash-balance-truth.test.mjs`.

Updated:
- `.github/workflows/business-os-contract-tests.yml`;
- `09_QA/business-os/five-step-schedule-first.test.mjs` — bounded stale-QA repair only.

Cash Bridge production helper:
**UNCHANGED**

No DB/migration/Procurement/Owner UI path changed.

---

## Implementation commits

- contract: `00ac23216732226e1b8ed02ef24e189bc140c6ec`;
- helper: `55e6067502696d1be14d0ed7dca24564b2ec38ea`;
- targeted tests: `c3a1c7fc9c9a775d11866db0957478d5bf624ae8`;
- CI gate: `78cc6a7d0d6accd40568a05a5dbad396303fd906`;
- explicit missing fixture repair: `dc157ccfb8c86a6e63edaff904426f7de9a26c24`;
- true idempotence regression: `8a57e042ffaf241651896036d4a2ec038e2e94a8`;
- first stale PFC state regression repair: `3f2053e30bef7c54cdcf22ed1109a3e2f51977f7`;
- final stale wording repair / final head: `3fb765f537171b9901168aa3b2ad8a22a4576ce4`;
- PR: `#186`;
- merge: `a9313eadc4492f144ca3c08b1021d1aa51f31a0b`.

---

## Carried-forward gaps from TASK-060

TASK-061 defines semantics; it does not create missing evidence.

Still NOT_CONNECTED for direct observed balance until mapped/evidenced:
- physical till/safe;
- business Bank balance/statement;
- MoMo/wallet;
- COD held cash;
- Owner-held company cash;
- provider payout/account balance.

The internal monthly cash workbook remains:
- COMPUTED_BALANCE candidate;
- MOVEMENT_ONLY for movement rows;
- not direct OBSERVED_BALANCE;
- not automatically enterprise ALL.

TASK-062 must map real/sanitized source evidence into this contract without upgrading provenance.

---

## DoD

PASS.

The contract/helper now ensures:
- OBSERVED and COMPUTED balances cannot be confused;
- computed value cannot become observed ending;
- missing never becomes zero;
- account/branch/time are explicit;
- Financial Truth V1 remains canonical numeric truth;
- no source mapping is embedded;
- no coverage engine is embedded;
- Cash Bridge compatibility is proven without changing Cash Bridge;
- required PR-head and exact post-merge Node 20 CI gates are green.

Next task:

**TASK-062 — Cash Balance Source Mapper**

Autonomy:

`AUTO_CONTINUE`

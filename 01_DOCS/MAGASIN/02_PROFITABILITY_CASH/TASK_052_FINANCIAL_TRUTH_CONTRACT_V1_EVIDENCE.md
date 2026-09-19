# TASK-052 — Financial Truth Contract V1 Evidence

Date: 2026-09-19  
Generation: PFC_3H_V1_RESTART_01  
Status: DONE / DoD MET

This evidence is privacy-safe for the public repository. No Drive ID/URL, raw financial/employee/customer record, credential, or secret is stored here.

## Five-Step decisions

### QUESTION
Define one minimal canonical financial truth record that Revenue, Cash, AP and later financial metrics can share without inventing truth or creating a new ledger/database/dashboard.

### DELETE
Deleted/deferred from TASK-052:
- new financial database/ledger;
- migration/RPC/write path;
- finance dashboard/UI;
- new competing quality states;
- source-specific truth shapes;
- synthetic zero defaults;
- implicit enterprise scope;
- raw/private source locators;
- overbuilt JSON Schema and integration work.

### SIMPLIFY
Reuse the existing Control Tower quality vocabulary exactly:

`ACTUAL / ESTIMATE / GAP / NOT_CONNECTED`

Use one canonical record with period, scope, metric identity, value, quality, source, as-of, reconciliation status, privacy-safe evidence/lineage and message/reason.

### ACCELERATE
Provide one pure deterministic normalizer that TASK-053 Revenue and TASK-055/056 Cash Bridge can reuse with metric-specific policies instead of reimplementing fail-closed rules.

### AUTOMATE
Only deterministic contract tests and CI path coverage were added. No financial action, write integration, migration, UI, RPC or autonomous decision was added.

## Canonical contract

Contract:
`02_CORE/contracts/financial-truth.v1.json`

Runtime normalization primitive:
`02_CORE/shared/financial-truth-v1.mjs`

Canonical output shape:

```text
schema_version
period.start / period.end / period.timezone
scope.branch / scope.channel / scope.aggregate_proven
group / metric
value
quality
source.class / source.label
as_of
reconciliation_status
evidence[]
lineage[]
message
reason
```

Control Tower remains a projection. Financial Truth V1 is the shared canonical financial truth contract.

## Normalization rules

1. `ACTUAL` and `ESTIMATE` may expose a numeric value only when:
   - value is a finite number;
   - metric/group are explicit;
   - reporting start/end/timezone are valid;
   - branch/channel scope is explicit;
   - source class + privacy-safe label are present;
   - as-of is an ISO-8601 timestamp with timezone;
   - reconciliation status is explicit and valid;
   - privacy-safe lineage is present.
2. `GAP` and `NOT_CONNECTED` always emit `value=null`.
3. Missing numeric value never becomes zero.
4. Explicit zero remains zero when the source proves zero and all trusted-value metadata is valid.
5. Missing quality fails closed to `NOT_CONNECTED`; invalid quality fails closed to `GAP`, matching existing Control Tower semantics.
6. Unknown branch/channel remains `null`; it never becomes `ALL`.
7. `ALL` is accepted only when `aggregate_proven=true`.
8. Generic finite negative values are allowed because some financial metrics can be negative; a metric policy can forbid negatives.
9. Metric policy can require allowed reconciliation states. Revenue can require `RECONCILED`; Cash/AP can use the same generic contract with their appropriate reconciliation status.
10. URL-like source/evidence/lineage text is not accepted as trusted source metadata.
11. Normalization is pure, deterministic and idempotent.

## Tests

Executable contract tests:
`09_QA/business-os/financial-truth.test.mjs`

Local affected test run:
```text
node --test 09_QA/business-os/financial-truth.test.mjs
16 tests / 16 PASS / 0 FAIL
```

Targeted compatibility regression against existing Control Tower quality + Revenue semantics:
```text
node --test 09_QA/business-os/financial-truth.test.mjs <targeted Control Tower regression>
20 tests / 20 PASS / 0 FAIL
```

Covered behaviors include:
- valid ACTUAL;
- valid ESTIMATE;
- GAP => null;
- NOT_CONNECTED => null;
- missing value != zero;
- explicit zero ACTUAL preserved;
- NaN/Infinity rejected;
- finite negative generic-valid and policy-rejectable;
- missing/invalid quality fail closed;
- missing source/as-of fail closed;
- unknown scope != ALL;
- unproven ALL rejected;
- lineage preservation;
- privacy-unsafe source rejection;
- deterministic/idempotent normalization;
- Revenue RECONCILED policy reuse;
- Cash/AP generic contract reuse.

Business OS contract CI was also updated so changes to the Financial Truth helper trigger the existing contract test workflow. No new workflow was created.

## Files / implementation commits

- `02_CORE/contracts/financial-truth.v1.json` — commit `c09e8c58f411ee2bdb6b85f473a414fe8ab14faf`
- `02_CORE/shared/financial-truth-v1.mjs` — commit `f39bcb3c290dff43921a14cd3017af385bf162ef`
- `09_QA/business-os/financial-truth.test.mjs` — commit `06d98b682bf2621cef14fcb4a06b76f9f7695e2a`
- `.github/workflows/business-os-contract-tests.yml` helper path coverage — commit `b2c94a8f165be75d34fde4a9a2c7d9c676771d80`

## Gaps / follow-up

- No live Revenue reader is connected yet; TASK-053 must build the Revenue baseline using this contract and require trusted `RECONCILED` inputs.
- Existing Control Tower snapshot code predates this canonical contract and can default missing branch scope to `ALL`. TASK-052 does not modify that projection/UI path; any future Financial Truth projection must map through the canonical scope rule instead of relying on that legacy default.
- Bank, MoMo, COD settlement and other TASK-051 source gaps remain unchanged; this contract preserves them as GAP/NOT_CONNECTED rather than fabricating values.
- This task intentionally does not define COGS, cash taxonomy, profitability formulas, database persistence or UI.

## DoD

PASS.

One canonical shared Financial Truth V1 contract exists; fail-closed numeric, scope, quality, source/as-of and lineage semantics are executable and tested; Control Tower quality states are reused rather than duplicated; no financial write path or private source locator was introduced.

Next execution task: TASK-053 — Monthly Revenue baseline contract + aggregator.  
Autonomy: AUTO_CONTINUE.

# TASK-063 — Cash Source Coverage V1 Evidence

Date: 2026-09-20
Execution generation: PFC_8H_V2_RUN_01
Status: DONE / DoD MET / REMOTE_CI_GREEN

Google Drive remained READ-ONLY and was not re-scanned. TASK-063 evaluates coverage only; it does not change source provenance, Financial Truth quality, balance basis, mapper classification or Cash event quality.

## Five-Step

QUESTION — Prove source/account/period coverage for Cash without confusing opening point coverage, movement interval coverage and observed ending point coverage.

DELETE — No source reader, Drive mapper, Bank/MoMo/COD connector, DB/migration/RPC/write path, UI/dashboard, balance arithmetic, event arithmetic, synthetic zero, implicit enterprise ALL or source-quality upgrade.

SIMPLIFY — Created one canonical contract, one pure helper and one targeted test suite:
- 02_CORE/contracts/cash-source-coverage.v1.json
- 02_CORE/shared/cash-source-coverage-v1.mjs
- 09_QA/business-os/cash-source-coverage.test.mjs

ACCELERATE — Generic evaluator normalizes target period/scope, required account/source universe, per-source proof, point/interval coverage and deterministic aggregate status.

AUTOMATE — Only pure deterministic QA/CI was added.

## Coverage roles and states

Roles: OPENING_BALANCE, MOVEMENT_EVENTS, OBSERVED_ENDING_BALANCE.
Aggregate states: COMPLETE, PARTIAL, MISSING.
Per-source states: COMPLETE, PARTIAL, MISSING, NOT_CONNECTED.

Canonical shape: schema_version, coverage_role, target_period, scope, account_universe, source_coverage[], status, required_not_connected, universe_proven, as_of, lineage, diagnostics.

account_universe contains universe_proven, aggregate_proven, empty_universe_proven, accounts[] and privacy-safe lineage.

## COMPLETE / PARTIAL / MISSING

COMPLETE is possible only when target period/scope are valid, required universe is explicitly proven, every required universe member is represented, every required member is COMPLETE, no required source is NOT_CONNECTED, and aggregate targets have separately proven aggregate universe semantics.

Row presence, known-source presence, mapper coverage_hint=COMPLETE or a caller-declared COMPLETE source state are never sufficient by themselves.

PARTIAL means useful bounded evidence exists but required full coverage is not proven.

MISSING means no valid useful proof exists, including invalid/missing source status, invalid point, no target-overlapping interval, missing canonical balance, unproven empty universe, or privacy-invalid metadata.

## Universe/account guardrails

universe_proven=true is mandatory before aggregate COMPLETE.
Known source list is not a proven required-source universe.
One concrete branch/account cannot prove enterprise ALL.
For enterprise ALL, target scope aggregate proof and account-universe aggregate proof are separate requirements.
Multiple explicit required branch/account members can collectively prove aggregate coverage when the required universe is proven.
An account label ALL requires its own account aggregate proof.

Empty required universe defaults to MISSING. It can become COMPLETE only with explicit empty_universe_proven=true, universe_proven=true, no required members, privacy-safe proof lineage and valid target scope/period.

## MOVEMENT_EVENTS

Movement coverage is interval coverage over the whole target period.
Per-source COMPLETE requires coverage_proven=true, valid source/account/scope, valid status/as-of/lineage, and explicit intervals whose normalized union covers every target date.
Overlapping or contiguous intervals merge deterministically.
Interval gaps prevent COMPLETE.
Intervals outside target are ignored.
Sparse transaction rows never infer missing dates.
A declared COMPLETE status is reduced when interval proof is incomplete.

## OPENING_BALANCE

Opening coverage is a target-start point rule.
Valid canonical OBSERVED_BALANCE or COMPUTED_BALANCE can satisfy the point only when TASK-061 already validates provenance and the source/account/scope point matches.
Coverage never upgrades GAP to ACTUAL, ESTIMATE to ACTUAL, or COMPUTED_BALANCE to OBSERVED_BALANCE.
Current internal computed opening remains incomplete because the observed anchor and complete movement proof are absent.

## OBSERVED_ENDING_BALANCE

Ending coverage is a target-end point rule.
It requires role OBSERVED_ENDING and basis OBSERVED_BALANCE with valid numeric canonical Financial Truth at the exact target date/timezone/account/scope.
Computed monthly remainder cannot satisfy observed-ending coverage.
A current point cannot satisfy a historical target.

## Duplicate identity / deterministic behavior

Coverage identity is source_class + account class + logical account label + branch + channel.
Identical stable entries dedupe.
Conflicting duplicate identities fail closed with CONFLICTING_DUPLICATE_COVERAGE_IDENTITY.
Input order does not affect output.
evaluateCashSourceCoverage is idempotent.

## Privacy

Drive/web URLs, account-number-like labels, secrets/tokens and unsafe lineage are rejected.
No raw private financial number is required in the contract or evidence.

## Current September profile

Internal monthly Cash movement evidence is bounded only through 2026-09-16. Against a later September target its source status is PARTIAL, not COMPLETE.

Internal monthly carry-forward remains a COMPUTED_BALANCE candidate. Current TASK-060/062 mapping lacks observed-anchor proof and complete movement proof, so opening coverage is not COMPLETE and value remains GAP/null.

No direct observed ending source is verified. Physical till, Bank, MoMo, COD-held cash, Owner-held company cash and provider-account point balances remain NOT_CONNECTED where declared relevant.

Therefore current enterprise Cash coverage cannot become COMPLETE.

## Cash Bridge adapter

cashSourceCoverageForBridge(coverage) accepts only canonical MOVEMENT_EVENTS coverage.
It returns exactly status, source_coverage, as_of and lineage.
Per-source bridge entries preserve source identity, status, required flag, NOT_CONNECTED, as-of and lineage.
OPENING_BALANCE and OBSERVED_ENDING_BALANCE remain separate dependencies and are never disguised as event coverage.
No change was made to calculateCashBridge().
Tests prove current partial movement coverage keeps existing Cash Bridge computed ending GAP/null.

## QA

Final TASK-063 targeted tests: 35/35 PASS / 0 FAIL.
Full Business OS suite: 330 logical checks / 0 FAIL.

Coverage includes complete/unknown universes, coverage_hint rejection, current Sep-through-16 partial evidence, interval merge/gaps, required/optional NOT_CONNECTED, aggregate ALL, multiple-account aggregate proof, opening and ending point semantics, computed provenance, historical mismatch, empty universe, dedupe/conflicts, malformed status/period/scope, privacy, deterministic/order-independent/idempotent behavior, no source-truth mutation, exact bridge adapter, current real profile non-COMPLETE, and static no-write/no-external-API guards.

## CI chronology

Early run 35474312917 exposed one test-fixture identity mismatch: the computed-opening universe declared OTHER_EVIDENCED_CASH / INTERNAL_CASH_POOL while the point-entry fixture accidentally used PHYSICAL_CASH / CN1_TILL. The engine correctly returned PARTIAL. The fixture was corrected; no coverage rule was weakened.

Final push head: 0920d8c343c876228ccd9cfe604dd4823665aef6.
Push run 35474355084, job 105980913873, Node v20.20.2: TASK-063 35/35; full Business OS 330/330; conclusion success.

Required PR-head gate: PR #188, run 35474386474, job 105980996192, Node v20.20.2: TASK-063 35/35; full Business OS 330/330; conclusion success.

Merge commit: bc30eafa6305a9350bebd9658395f408f9f59299.

Exact post-merge gate: run 35474418160, job 105981077298, Node v20.20.2: TASK-063 35/35; full Business OS 330/330; conclusion success.

Collateral exact-merge workflows: Validate MAGASIN GitHub Pages source 35474418159 success; Pages build/deployment 35474417604 success.

## Files changed

Created: cash-source-coverage.v1.json, cash-source-coverage-v1.mjs, cash-source-coverage.test.mjs.
Updated: .github/workflows/business-os-contract-tests.yml.
Unchanged: Cash Bridge calculator, Cash Balance Truth helper, Cash Balance Source Mapper, DB/migrations/UI/Drive.

## Implementation commits

- 9513c2c202946020ab9782179324104096802da2 — contract
- 20fce522edd9e7b8bb1f603fe15773ad3bb4bd37 — pure evaluator
- 72c6ef38fc69ae7dc2a953f30dbd64aeac8c6bb5 — aggregate target/account scope guard
- 912aa242c0911e5b81ae132cb2eb6ff5fd19320c — targeted tests
- 172dcb4055497eafdec0dc6b66d0e5504ee2a64b — CI gate
- 0920d8c343c876228ccd9cfe604dd4823665aef6 — computed-opening fixture identity correction / final head
- PR #188
- merge bc30eafa6305a9350bebd9658395f408f9f59299

## Remaining gaps

Coverage engine does not create missing sources. Direct till/safe, Bank, MoMo, COD, Owner-held cash and provider account balances remain unavailable. Internal current movement evidence is only bounded through 2026-09-16. Internal computed opening still lacks observed anchor and complete movement proof. Enterprise required source/account universe is not yet evidenced for current operations.

These remain MISSING / PARTIAL / NOT_CONNECTED and do not pause PFC_8H_V2.

## DoD

PASS. COMPLETE cannot arise by omission; source/account universe is explicit; point and interval coverage remain separate; current real profile remains non-COMPLETE; coverage does not upgrade source provenance/Financial Truth; MOVEMENT_EVENTS coverage feeds existing Cash Bridge without semantic upgrade; required PR-head and exact post-merge Node 20 gates are green.

Next task: TASK-064 — Cash Bridge Source Integration.
Autonomy: AUTO_CONTINUE.

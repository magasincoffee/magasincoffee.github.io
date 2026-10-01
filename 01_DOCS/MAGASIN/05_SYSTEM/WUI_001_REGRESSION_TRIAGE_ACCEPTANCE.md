# WUI-001 — Regression triage + contract reconciliation acceptance

**Track:** `WORKFORCE_UI_UX_UNIFICATION_V1`  
**Task:** `WUI-001`  
**Date:** 2026-10-01  
**PR under qualification:** #363  
**Accepted PR head:** `b257b16f3f1490c4189215d185fd90b80b386990`

## Result

WUI-001 is accepted as DONE.

The first failing qualification on PR #363 exposed 33 failing tests across People Shift, UI2 Cross Role and SOP Task. Those failures were triaged individually. The initial failures were stale cache-version, stale copy/font expectations or stale fixture assumptions caused by the intentional Manager/Employee UI correction already present in PR #363.

Subsequent browser stages exposed additional stale assertions and fixture drift that were hidden behind the first failing assertions. Those were also reconciled without weakening product authority.

Final classification:

- confirmed functional regression hidden by test relaxation: **0**
- confirmed auth/role/security regression: **0**
- authority expansion: **0**
- direct browser/table authority expansion: **0**
- scheduling writer authority change: **0**
- XSTORE recurring authority change: **0**
- fake Task business data introduced: **0**

## Preserved contracts

The reconciliation keeps these contracts intact:

- authentication and role boundaries;
- Employee/Manager/Owner route separation;
- Task fail-closed internal state `NOT_CONNECTED`;
- no fake Task/SOP business data;
- canonical scheduling writer authority;
- DRAFT → validate → review → publish semantics;
- published schedule truth remains server-backed;
- no direct table writes added to browser surfaces;
- XSTORE recurring staffing remains the recurring staffing authority;
- Auto Schedule still does not auto-publish;
- Owner Workforce runtime/cache path is not moved by the Manager/Employee UI cache cutover.

Internal machine identifiers such as `NOT_CONNECTED`, `NONE`, `DRAFT`, `REVIEWED`, `PUBLISHED` and `CONFLICT` remain unchanged where they are part of runtime contracts. Only accepted user-facing labels were translated.

## Final PR qualification

All relevant PR qualification gates are green on the exact accepted head `b257b16f3f1490c4189215d185fd90b80b386990`:

- People Shift Day-10 Tests — run `36884997422` — **SUCCESS**
- UI2 Cross Role Acceptance — run `36884997603` — **SUCCESS**
- SOP Task Tests — run `36884997402` — **SUCCESS**
- Owner Control Tower Tests — run `36884997771` — **SUCCESS**
- AUTH-PROD Regression Contract — run `36884997637`, attempt 2 — **SUCCESS**

AUTH-PROD attempt 1 was cancelled while Playwright system packages were being downloaded; it did not fail a test. The cancelled `auth-prod-red-contract` job was rerun directly. On attempt 2:

- `auth-prod-red-contract` — job `110457393316` — **SUCCESS**
- `auth-prod-active-production-smoke` — job `110457395775` — **SUCCESS**

## Important boundary

PR #363 remains open after WUI-001.

WUI-001 only closes regression triage and test-contract reconciliation. It does **not** authorize PR merge. PR merge and exact-main qualification remain exclusively under `WUI-007`.

The next authoritative task is `WUI-002`.

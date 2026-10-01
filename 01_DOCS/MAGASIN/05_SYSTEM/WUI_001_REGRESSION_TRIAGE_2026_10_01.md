# WUI-001 — Regression triage and contract reconciliation

**Track:** `WORKFORCE_UI_UX_UNIFICATION_V1`  
**Task:** `WUI-001`  
**Date:** 2026-10-01  
**PR:** #363  
**Classification basis head:** `0bab60a6ee36054b8e487a5f573a6087394f43e4`

## Safety conclusion

The initial failed PR qualification contained **33 failing tests**.

Classification:

- stale cache/version expectations: **20**
- stale user-facing wording/font expectations: **13**
- confirmed functional regression: **0**
- confirmed auth/role/authority/security regression: **0**

The already-running authority/security suites supported the same conclusion:

- AUTH-PROD Regression Contract: SUCCESS
- Owner Control Tower Tests: SUCCESS

No RPC inventory, role boundary, authentication boundary, direct-DML prohibition, scheduling writer authority, recurring staffing authority or Task fail-closed state was weakened to reconcile the tests.

Internal state identifiers such as `NOT_CONNECTED`, `DRAFT`, `REVIEWED`, `PUBLISHED` remain valid implementation/test contracts. Only user-visible labels were translated.

## Failure inventory and classification

### SOP Task Tests

1. `Manager Task surface fails closed instead of presenting prototype task facts`
   - classification: stale user-visible wording
   - old display expectation: `NOT CONNECTED`
   - accepted display: `CHƯA KẾT NỐI`
   - fail-closed state remains `data-task-quality="NOT_CONNECTED"`.

2. `Employee Task surface is explicit NOT_CONNECTED, not loading or false-empty`
   - classification: stale user-visible wording
   - same fail-closed preservation as Manager.

### UI2 Cross Role Acceptance

3. `UI2-016 Manager Today Scheduling Operations use 1024 touch breakpoints`
   - classification: stale Manager asset cache expectation.
   - touch breakpoint assertion remains unchanged.

4. `UI2-016 shared visual vocabulary remains canonical`
   - classification: stale font expectation.
   - old `Inter, system-ui` expectation replaced by approved Workforce stack:
     `"Segoe UI", Roboto, "Helvetica Neue", Arial, system-ui, -apple-system, sans-serif`.
   - 44px touch and focus contracts remain unchanged.

5. `UI2-016 shell cache chain is bumped for all production consumers`
   - classification: stale Manager cache expectation.
   - Manager advances to `20261001-ui-unified1`.
   - Owner path remains pinned to its accepted pre-existing UI2 cache; explicit negative assertion prevents accidental Owner cutover.

6. `UI2-017 role routing contract remains canonical`
   - classification: stale Manager/Employee runtime cache expectation.
   - role-routing assertions remain unchanged.

7. `UI2-017 exact UI2-016 cache chain remains canonical`
   - classification: stale Manager asset cache expectation.
   - Owner path remains unchanged.

### People Shift Day-10 Tests

8. `EMLIVE-002 runtime cache points browsers at the reconciled Schedule and Attendance assets`
   - classification: stale Employee entry cache expectation.

9. `EMLIVE-003 runtime cache serves reconciled assets`
   - classification: stale Employee shell/app cache expectation.

10. `EMLIVE-004 keeps the accepted EMLIVE-003 runtime and user-facing semantics`
    - classification: stale Employee shell/app cache expectation.

11. `TASK-100 Manager UI sends intent by RPC only and exposes approve adjust reject controls`
    - classification: stale Manager attendance asset cache expectation.
    - RPC-only assertion remains unchanged.

12. `Canonical Workforce shell opens scheduling, keeps Demand hidden, and labels Manager as scheduler`
    - classification: stale user-facing wording.
    - Demand-hidden and canonical module assertions remain unchanged.

13. `Manager direct board supports source availability plus add remove edit save and resume`
    - classification: stale user-facing wording.
    - source/add/remove/edit/save/resume behavior assertions remain unchanged.

14. `SCHED-04 legacy Lich-lam route wraps canonical Workforce surface only`
    - classification: stale Manager runtime cache expectation.

15. `SCHED-03 keeps one active Employee runtime path`
    - classification: stale Employee runtime entry cache expectation.

16. `SCHED-04 keeps exactly one canonical Manager scheduling writer surface`
    - classification: stale Manager writer/presentation asset cache expectation.
    - single-writer/RPC/direct-DML restrictions remain unchanged.

17. `SCHED-04 Manager shell no longer contains fake schedule truth`
    - classification: stale Vietnamese/technical wording expectation.
    - fake schedule data prohibitions remain unchanged.

18. `SCHED-05 shared writer is role-aware but retains one canonical RPC set`
    - classification: stale Owner explanatory copy expectation.
    - shared writer and RPC inventory remain unchanged.

19. `SCHED-05 store/week changes clear stale projections before server reload`
    - classification: stale technical wording expectation.
    - stale-state clearing assertions remain unchanged.

20. `Today current/next/ended/empty/loading/error states are explicit and fail closed`
    - classification: stale Vietnamese wording expectation.
    - state-machine/fail-closed markers remain unchanged.

21. `Việc cần làm maps only to canonical existing states/actions`
    - classification: stale Task/SOP wording expectation.
    - no invented route/action assertions remain unchanged.

22. `UI2-007 loads a namespaced V2 Schedule presentation layer`
    - classification: stale Employee schedule CSS cache expectation.

23. `UI2-005 shell and UI2-006 Today remain canonical while cache entry advances`
    - classification: stale Employee app/runtime cache expectation.

24. `UI2-007 Schedule presentation remains bounded after UI2-008 adds a separate secondary layer`
    - classification: stale Employee schedule CSS cache expectation.

25. `UI2-005 shell UI2-006 Today UI2-007 Schedule remain present and runtime cache advances only`
    - classification: stale Employee schedule/app/runtime cache expectation.

26. `UI2-009 loads one namespaced Employee People presentation layer and keeps prior UI2 surfaces`
    - classification: stale prior-surface schedule CSS cache expectation.

27. `UI2-009 direct route/back/reload authority stays delegated to the existing shell/runtime refresh hooks`
    - classification: stale Employee app cache expectation.
    - route/back/reload authority assertions remain unchanged.

28. `UI2-011 Today is an Action Center built only from existing read-only Manager module state`
    - classification: stale `Task / SOP` user-facing wording.
    - read-only module state assertions remain unchanged.

29. `UI2-012 is a Manager-only presentation layer over the existing canonical scheduling writer`
    - classification: stale Manager writer/presentation asset cache expectation.
    - Manager-only and owner-exclusion assertions remain unchanged.

30. `UI2-012 Manager asset cache chain advances while Owner runtime remains on its existing path`
    - classification: stale Manager cache expectation.
    - Owner negative cache assertion remains unchanged.

31. `UI2-013 preserves Today getState compatibility and does not redesign scheduling`
    - classification: stale Manager scheduling-presentation cache expectation.
    - Today `getState` and no-publish authority assertions remain unchanged.

32. `UI2-013 complete Manager cache chain loads changed assets while Owner path stays untouched`
    - classification: stale Manager runtime entry cache expectation.
    - Owner path remains explicitly excluded.

33. `C04 Manager UI calls recurring Robot and still never publishes`
    - classification: stale recurring Auto Schedule asset cache expectation.
    - no-publish assertion remains unchanged.

## Reconciliation policy applied

For every stale failure:

- change only the expected cache version or accepted user-facing Vietnamese wording;
- keep exact RPC/security/direct-DML/role/state assertions;
- keep Owner-path negative assertions;
- keep Task fail-closed internal state;
- keep schedule writer single-authority assertions;
- keep Auto Schedule no-publish assertion.

No product business rule was changed as part of WUI-001 reconciliation.

## Completion gate

WUI-001 is not complete until the reconciled PR head receives fresh CI and:

- SOP Task Tests are green;
- UI2 Cross Role Acceptance is green;
- People Shift Day-10 Tests are green;

or a newly exposed failure is classified as a concrete product bug and recorded for correction within WUI-001.

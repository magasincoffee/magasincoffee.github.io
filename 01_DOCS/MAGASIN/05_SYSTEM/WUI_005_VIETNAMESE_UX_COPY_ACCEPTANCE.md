# WUI-005 — Vietnamese UX Copy Acceptance

**Track:** WORKFORCE_UI_UX_UNIFICATION_V1  
**Task:** WUI-005  
**Accepted product PR:** #363  
**Accepted head:** `9c4a4ccbeaa420c12b335c89c4d52dbee370c354`  
**Date:** 2026-10-02  
**Result:** PASS

## Scope

This acceptance verifies only the Vietnamese user-facing copy requirements for primary Manager + Employee Workforce surfaces.

Internal identifiers, status constants, RPC names and QA labels remain unchanged where they are not rendered to users.

No production business data, Store Priority value, staffing requirement, draft assignment, official schedule, schema, RPC authority, auth boundary or scheduling authority was created or changed.

## Product corrections applied in WUI-005

The WUI-005 audit found real user-facing copy defects still present on the previously accepted PR #363 head and corrected them before acceptance.

### Manager scheduling

`05_MANAGER/Workforce/draft-publish-v1.js`:

- removed user-facing `server` wording from create/open and validation status messages;
- replaced user-facing `revalidate` wording with plain Vietnamese;
- removed the implementation-facing sentence `Không hiển thị ID kỹ thuật`;
- startup failure no longer appends `e.message/e.code` to the UI;
- raw startup diagnostics now go to `console.warn('[MANAGER_SCHEDULE_BOOT]', e)`;
- fallback shown to users is plain Vietnamese.

### Manager four-store overview

`05_MANAGER/Workforce/cross-store-master-v1.js`:

- load failure no longer appends raw backend error text;
- raw diagnostics go to `console.warn('[XSTORE_MASTER_LOAD]', e)`;
- user-facing fallback is `Không tải được tổng lịch 4 cửa hàng. Vui lòng tải lại và thử lại.`.

### Manager official schedule

`05_MANAGER/Workforce/official-v1.js`:

- raw `e.message/e.code` is no longer copied into `state.lastError`;
- raw diagnostics go to `console.warn('[MANAGER_OFFICIAL_LOAD]', e)`;
- user-facing fallback is `Không tải được lịch làm chính thức. Vui lòng tải lại và thử lại.`.

### Employee published schedule

`06_EMPLOYEE/schedule/engine-v1.js`:

- `Khi quản lý publish lịch...` was replaced by `Khi quản lý phát hành lịch...`.

## Negative-term static audit

`09_QA/people-shift/workforce-ui-unified-v1.test.mjs` was extended to cover:

- no `server` / `revalidate` wording in Manager scheduling UI copy;
- no implementation-facing `ID kỹ thuật` sentence;
- Manager scheduling startup failure uses a friendly Vietnamese fallback;
- four-store overview does not append raw backend diagnostics;
- official schedule does not expose raw backend diagnostics;
- Employee schedule no longer renders `publish`;
- existing checks still reject visible `NOT CONNECTED`, `canonical`, `Employee Availability`, `Store Priority`, `Robot`, `Auto Schedule` and other mixed/technical copy where applicable.

Internal strings such as `DRAFT`, `REVIEWED`, `PUBLISHED`, `APPROVED`, RPC names and data-quality identifiers remain valid implementation contracts and are not banned from source code when they are not user-visible.

## Stale assertion reconciliation

The first product-copy commit moved PR #363 to:

`b322540cbd8f1e2f2a93e2e59aadac39914b42a3`

The first push qualification exposed two stale SCHED-04 copy assertions that still required the removed sentence `Không hiển thị ID kỹ thuật`.

Those failures were classified as **stale user-facing wording expectations**, not functional or authority regressions.

Only those copy expectations were updated:

- `09_QA/people-shift/manager-workforce-canonical.test.mjs`;
- `09_QA/people-shift/sched-04-manager-scheduling-v1.test.mjs`.

Server-side conflict, idempotency, generation-state and scheduling-authority assertions remained intact.

Final accepted PR #363 head for WUI-005:

`9c4a4ccbeaa420c12b335c89c4d52dbee370c354`

## People Shift evidence

Pull-request workflow: **People Shift Day-10 Tests**  
Run: `36959280988`  
Job: `110689129792` / `day10-browser-gate`

Concrete completed steps on the accepted head:

- Verify People Shift acceptance contract — SUCCESS;
- Workforce canonical contract regression — SUCCESS;
- Schedule-first compatibility regression — SUCCESS;
- People Shift regression tests — SUCCESS;
- Control Tower regression tests — SUCCESS;
- SCHED-01 browser smoke — SUCCESS;
- SCHED-02 authority smoke — SUCCESS;
- SCHED-03 Employee Schedule UI browser E2E — SUCCESS;
- SCHED-04 Manager Scheduling V1 browser E2E — SUCCESS.

The static WUI-005 negative-term audit runs inside the successful People Shift regression step.

Broader People Shift browser coverage continues into WUI-006 and is intentionally not used to expand WUI-005 scope.

## SOP fail-closed evidence

Pull-request workflow: **SOP Task Tests**  
Run: `36959281027`  
Job: `110689129844` / `sop-task-route-gate`  
Conclusion: **SUCCESS**

Completed evidence:

- SOP Task static regressions — SUCCESS;
- Manager Task deep-link browser smoke — SUCCESS;
- SOP Task fail-closed browser regression — SUCCESS.

The user-visible Task/SOP disconnected state remains Vietnamese `CHƯA KẾT NỐI`, while the internal data-quality identifier `NOT_CONNECTED` remains internal.

No fake Task/SOP facts were introduced.

## Additional safety regression evidence

On the same accepted head:

- AUTH-PROD Regression Contract run `36959280949` — SUCCESS;
- Owner Control Tower Tests run `36959281093` — SUCCESS.

These are supporting evidence that WUI-005 copy changes did not weaken authentication or Owner control contracts.

## Conclusion

WUI-005 acceptance criteria are satisfied on PR #363 head `9c4a4ccbeaa420c12b335c89c4d52dbee370c354`.

Primary Manager + Employee Workforce guidance is now plain Vietnamese for the audited surfaces, raw technical errors are not appended to user messages on the corrected paths, SOP fail-closed semantics remain intact, and no Task/SOP facts or business data were fabricated.

Next task under the TEMP SOT after this evidence is merged to `main`: `WUI-006`.

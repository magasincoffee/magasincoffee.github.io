# WUI-002 — Recurring Staffing Editor State Acceptance

**Track:** WORKFORCE_UI_UX_UNIFICATION_V1  
**Task:** WUI-002  
**Accepted PR:** #363  
**Accepted head:** `b257b16f3f1490c4189215d185fd90b80b386990`  
**Date:** 2026-10-02  
**Result:** PASS

## Acceptance scope

This evidence closes only the recurring staffing editor state bug reported by the Owner. No production staffing values, Store Priority values, draft assignments, official schedules, database schema, RPC authority, or business data were created or changed.

## Product-state checks

On PR #363 head `b257b16f3f1490c4189215d185fd90b80b386990`:

- `02_CORE/ui/app-time-picker-24h.js` copies all input attributes except `type` and `value` to the replacement `select`, preserving `data-xsa-f` and other relevant attributes.
- An invalid/empty time receives the neutral `Chọn giờ` option.
- The picker assigns `select.value=validHm(value)?value:''`.
- No `select.value=TIMES[0]` fallback remains.
- `+ Khung` first synchronizes the live DOM back into state before appending a new empty-time block.
- Removing a block also synchronizes the live DOM before mutation.

## Static contract evidence

GitHub Actions workflow: **People Shift Day-10 Tests**  
Run: `36884997422`  
Job: `110445912700` / `day10-browser-gate`  
Conclusion: **SUCCESS**

Observed log evidence:

- `WORKFORCE_UI_UNIFIED_V1=PASS`
- `24h time picker preserves business field attributes and never defaults a new block to 05:00` — PASS
- `XSTORE_AUTO_SCHEDULE_V1=PASS`

## Browser acceptance evidence

Same workflow run/job:

- `XSTORE_RECURRING_STABLE_EDITOR_BROWSER=PASS`

The browser acceptance executes the required sequence:

1. edit an existing recurring block to `07:00–12:00`, headcount `3`;
2. add `+ Khung`;
3. verify the existing block remains unchanged;
4. verify the new start/end are empty and render `Chọn giờ`;
5. remove the temporary block;
6. verify the original block is still unchanged;
7. save;
8. verify persistence in fixture storage;
9. reload and verify `07:00–12:00 · 3 người` remains;
10. load target week `2026-10-12` and verify the same recurring configuration is reused.

## Recurring-authority regression evidence

Same workflow run/job:

- `XSTORE_C02_RECURRING_STAFFING_AUTHORITY=PASS`
- `XSTORE_C04_RECURRING_PROJECTION=PASS`
- `XSTORE_C05_RECURRING_ACCEPTANCE=PASS`

Relevant C05 browser contract explicitly passes save persistence across reload and reuse in another week.

## Conclusion

WUI-002 acceptance criteria are satisfied on the accepted PR #363 head. The reported `05:00 / 05:00 / 1` reset path is covered by static and browser regression evidence without weakening recurring staffing authority.

Next task under the TEMP SOT after this evidence is merged to `main`: `WUI-003`.

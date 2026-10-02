# WUI-004 — Typography / Palette / Time-Band Visual Acceptance

**Track:** WORKFORCE_UI_UX_UNIFICATION_V1  
**Task:** WUI-004  
**Accepted product PR:** #363  
**Accepted head:** `b257b16f3f1490c4189215d185fd90b80b386990`  
**Date:** 2026-10-02  
**Result:** PASS

## Scope

This acceptance verifies only the shared Workforce typography/palette foundation and the canonical start-time visual bands required by WUI-004.

No production business data, staffing requirement, Store Priority value, draft assignment, official schedule, schema, RPC authority, or scheduling authority was created or changed.

## Shared typography and neutral palette

On PR #363 head `b257b16f3f1490c4189215d185fd90b80b386990`, `02_CORE/ui/magasin-ui-v2-tokens.css` defines the shared Workforce foundation:

- font: `"Segoe UI", Roboto, "Helvetica Neue", Arial, system-ui, -apple-system, sans-serif`;
- primary text: `#101828`;
- secondary text: `#667085`;
- border: `#EAECF0`;
- page background: `#F9FAFB`;
- brand: `#0F8F9C`.

The recurring staffing and cross-store overview modules explicitly use the shared `--m-font-sans` token. Manager scheduling surfaces inherit the shared shell foundation and use shared neutral/semantic variables. Employee schedule presentation uses the same V2 neutral and shift tokens.

## Canonical shift-band tokens

The same token file defines:

- morning background: `#FFF4CC`;
- afternoon background: `#FDE7E7`;
- evening background: `#E8F3FF`.

The matching shared border/text tokens are also defined there.

## Start-time classification

Recurring staffing, Manager draft and cross-store overview all classify by start time using the same boundaries:

- `05:00 <= start < 12:00` → morning/yellow;
- `12:00 <= start < 17:00` → afternoon/light-red;
- `17:00 <= start <= 22:00` → evening/light-blue;
- invalid/empty recurring-editor start → neutral.

### Recurring staffing editor

`05_MANAGER/Workforce/cross-store-auto-schedule-v1.js` uses:

- `xsa-band-morning`;
- `xsa-band-afternoon`;
- `xsa-band-evening`;
- `xsa-band-neutral`.

A delegated `change` handler calls `applyBandClass(...)` immediately when the start-time control changes.

New blocks begin with empty start/end times and therefore receive the neutral band until a valid start time is selected.

### Manager DRAFT / official projection

`05_MANAGER/Workforce/draft-publish-v1.js` uses the same minute boundaries and applies:

- `msd-band-morning`;
- `msd-band-afternoon`;
- `msd-band-evening`;
- `msd-band-neutral`.

The classification is applied to DRAFT cards, availability/source rows and the official projection rendered by that scheduling surface.

### Manager four-store weekly overview

`05_MANAGER/Workforce/cross-store-master-v1.js` uses the same minute boundaries and renders `xsm-band-*` classes for DRAFT/OFFICIAL shift rows.

### Employee published schedule

`06_EMPLOYEE/schedule/engine-v1.js` maps the canonical shared time kind to:

- `morning-yellow`;
- `afternoon-red`;
- `evening-cyan`.

`02_CORE/ui/magasin-ui-v2-employee-schedule.css` maps those classes to the shared `--m-shift-*-bg/border/text` tokens.

## Static CI evidence

GitHub Actions workflow: **People Shift Day-10 Tests**  
Run: `36884997422`  
Job: `110445912700` / `day10-browser-gate`  
Conclusion: **SUCCESS**

Observed PASS evidence:

- `WORKFORCE_UI_UNIFIED_V1=PASS`;
- `one typography and neutral palette foundation is used across Workforce shells` — PASS;
- `shift colors follow one visual rule across Manager and Employee scheduling` — PASS;
- `SCHED_03_EMPLOYEE_SCHEDULE_CONTRACT=PASS`;
- `UI2_007_EMPLOYEE_SCHEDULE_CONTRACT=PASS`.

The static visual contract explicitly checks the three canonical background tokens and confirms the recurring staffing, cross-store overview, Manager draft and Employee schedule surfaces are wired to the shared time-band system.

## Browser live-transition evidence

Same workflow run/job:

- `XSTORE_RECURRING_STABLE_EDITOR_BROWSER=PASS`.

The browser test proves live visual class transitions on the recurring staffing editor:

1. existing `06:00` block is `xsa-band-morning`;
2. selecting `12:00` changes it to `xsa-band-afternoon`;
3. selecting `17:00` changes it to `xsa-band-evening`;
4. the editor continues with `07:00` as morning.

The same browser fixture also proves that a new empty block has no fake time value, matching the neutral-until-valid-start rule.

Artifact:

- ID `11174261324`;
- name `people-shift-day10-e2e-36884997422`;
- contains `people-shift/xstore-recurring-stable-editor.png` and Employee/Manager schedule screenshots.

## Employee published schedule regression evidence

Same People Shift run remains green for the canonical Employee schedule:

- `SCHED_03_EMPLOYEE_SCHEDULE_CONTRACT=PASS`;
- `UI2_007_EMPLOYEE_SCHEDULE_CONTRACT=PASS`;
- `EMPLOYEE_PUBLISHED_WEEKLY_SCHEDULE_BROWSER=PASS`.

The published-schedule browser gate continues to pass with the accepted Employee schedule reader and UI presentation.

## Boundary acceptance

- `07:00` → morning/yellow: PASS;
- `12:00` → afternoon/light-red: PASS;
- `17:00` → evening/light-blue: PASS;
- empty start time → neutral: PASS by static classification plus empty-block browser state.

## Conclusion

WUI-004 acceptance criteria are satisfied on PR #363 head `b257b16f3f1490c4189215d185fd90b80b386990`.

The Manager and Employee Workforce surfaces share the accepted typography/neutral palette foundation, and all required scheduling surfaces use the same visual time-band meaning without changing scheduling authority or fabricating business data.

Next task under the TEMP SOT after this evidence is merged to `main`: `WUI-005`.

# WUI-003 — Manager + Employee Layout Foundation Acceptance

**Track:** WORKFORCE_UI_UX_UNIFICATION_V1  
**Task:** WUI-003  
**Accepted product PR:** #363  
**Accepted head:** `b257b16f3f1490c4189215d185fd90b80b386990`  
**Date:** 2026-10-02  
**Result:** PASS

## Scope

This acceptance verifies only the Manager + Employee layout foundation required by WUI-003:

- desktop sidebar/rail relationship;
- main content use of the remaining viewport;
- no arbitrary narrow wrapper forcing scheduling surfaces to one side;
- scheduling-board overflow contained inside the board;
- responsive/touch behavior at representative widths;
- browser artifacts/screenshots.

No production business data, schema, RPC authority, scheduling authority, Store Priority value, staffing demand, draft assignment, or official schedule was created or changed.

## Static layout contract

On PR #363 head `b257b16f3f1490c4189215d185fd90b80b386990`:

### Manager shell

`02_CORE/ui/magasin-ui-v2-shell.css` keeps the desktop sidebar width in `--m-shell-sidebar-width`, while legacy Manager main content uses:

- `width: auto !important`;
- `max-width: none !important`;
- `margin-left: var(--m-shell-sidebar-width) !important`;
- `min-width: 0`.

The shared Manager drawer/touch boundary remains `@media (max-width: 1024px)`.

### Employee shell

`02_CORE/ui/magasin-ui-v2-employee-shell.css` uses:

- desktop rail width `--m-employee-desktop-rail: 208px`;
- desktop main `width: auto !important`, `max-width: none`, `margin-left: var(--m-employee-desktop-rail) !important`;
- normal page content `.page-wrap { width: min(100%, 1440px); margin-inline: auto; }`;
- shell overflow containment and touch-safe controls.

### Recurring staffing board

`05_MANAGER/Workforce/cross-store-auto-schedule-v1.js` defines:

- `.xsa-board-wrap { overflow: auto; ... }`;
- `.xsa-board { width:100%; min-width:1160px; table-layout:fixed; }`;
- `@media(max-width:1024px)` with a bounded internal board width rule.

This keeps wide recurring staffing data inside its own scroll container instead of forcing page-level horizontal overflow.

### Seven-day scheduling board

`09_QA/people-shift/ui2-012-manager-scheduling-contract.test.mjs` asserts:

- responsive breakpoints including `1024px`;
- `min-height:44px` touch targets;
- `overflow-x:auto` for the scheduling board.

## Static CI evidence

GitHub Actions workflow: **People Shift Day-10 Tests**  
Run: `36884997422`  
Job: `110445912700` / `day10-browser-gate`  
Conclusion: **SUCCESS**

Observed PASS evidence includes:

- `WORKFORCE_UI_UNIFIED_V1=PASS`;
- `Manager recurring staffing editor is compact responsive and uses the shared design foundation`;
- `Manager and Employee desktop content use the remaining viewport instead of a forced side column`;
- `SCHED-07 enforces touch, focus and responsive mobile board contracts`.

Artifact:

- ID `11174261324`;
- name `people-shift-day10-e2e-36884997422`;
- contains `people-shift/xstore-recurring-stable-editor.png` and representative Manager/Employee screenshots.

## UI2 cross-role browser evidence

GitHub Actions workflow: **UI2 Cross Role Acceptance**  
Run: `36884997603`  
Job: `110445911251` / `cross-role-browser-gate`  
Conclusion: **SUCCESS**

Artifact:

- ID `11174157312`;
- name `ui2-016-cross-role-36884997603`.

### Manager shell

Browser PASS metrics:

- `ui2_011_1440_shell_today_layout_focus_nav`: viewport/client/scroll all `1440`;
- `ui2_011_1024_shell_today_layout_focus_nav`: viewport/client/scroll all `1024`, touch targets `44px`;
- `ui2_011_768_shell_today_layout_focus_nav`: viewport/client/scroll all `768`, touch targets `44px`;
- `ui2_011_390_shell_today_layout_focus_nav`: viewport/client/scroll all `390`, touch targets `44px`.

The same gate proves the Manager drawer is keyboard/touch safe at `1024/768/390`.

### Manager seven-day scheduling board

`ui2-012-manager-scheduling-report.json` is PASS with no page, console, request or HTTP errors.

Representative metrics:

- 1440: page `scrollWidth=1440`, `clientWidth=1440`;
- 1024: page `scrollWidth=1024`, `clientWidth=1024`, while board `scrollWidth=1949`, `clientWidth=925`;
- 768: page `scrollWidth=768`, `clientWidth=768`, while board `scrollWidth=1949`, `clientWidth=677`;
- 390: page `scrollWidth=390`, `clientWidth=390`;
- touch minimum is `44px` at `1024/768/390`.

The `1024` and `768` metrics directly prove horizontal overflow remains inside the scheduling board instead of expanding the page.

The artifact contains screenshots:

- `people-shift/ui2-012-manager-scheduling-1440.png`;
- `people-shift/ui2-012-manager-scheduling-1024.png`;
- `people-shift/ui2-012-manager-scheduling-768.png`;
- `people-shift/ui2-012-manager-scheduling-390.png`.

### Employee shell and schedule

Browser PASS metrics include:

- `ui2_005_employee_desktop_rail_expansion`: viewport/client/scroll `1440`, rail width `208`, rail left `0`, main left `208`, rail position fixed;
- `ui2_005_employee_360/390/430/768_bottom_nav_bounds_touch_and_no_overflow`: document width equals viewport and navigation remains touch-safe;
- `ui2_007_employee_schedule_360/390/430/768_responsive_touch_no_collision`: document width equals viewport, minimum button height `44px`, no collision.

The artifact contains representative screenshots including:

- `people-shift/ui2-005-employee-desktop-1440.png`;
- `people-shift/ui2-005-employee-phone-390.png`;
- `people-shift/ui2-007-employee-schedule-desktop-1440.png`;
- `people-shift/ui2-007-employee-schedule-phone-390.png`.

## Conclusion

WUI-003 acceptance criteria are satisfied on PR #363 head `b257b16f3f1490c4189215d185fd90b80b386990`.

The Manager and Employee shells use the intended remaining viewport, the recurring and seven-day scheduling surfaces contain wide data rather than widening the page, the Manager `1024px` touch/drawer boundary remains intact, and representative desktop/mobile browser artifacts are green.

Next task under the TEMP SOT after this evidence is merged to `main`: `WUI-004`.

# WUI-008 — Production-Safe UI Acceptance

**Track:** WORKFORCE_UI_UX_UNIFICATION_V1  
**Task:** WUI-008  
**Qualified product merge SHA:** `d11c0b9905ad702e637d8d3329419bef7300b231`  
**Current main at verification start:** `199d0652163cb691f9ae2b407279ae9e4481d112`  
**Date:** 2026-10-02  
**Result:** PASS

## Safety boundary

This task was executed read-only against the deployed GitHub Pages production site.

No login credentials were entered. No Save, Publish, Auto Schedule or other state-changing control was used. No Store Priority value, staffing demand, draft assignment, official schedule, staffing headcount or other Owner/Manager business data was created, modified or inferred.

There was no authenticated TinyFish/browser profile for the production site. Therefore protected data-dependent visual states that could not be rendered safely are recorded as `NO_REAL_DATA_TO_RENDER` and are accepted only together with the already-green exact-main browser fixtures, as required by the TEMP SOT.

## Deployed production inspection

Production host:

`https://magasincoffee.github.io`

A production-safe browser run was executed read-only:

- run ID: `df2e14a4-5314-49f3-8e65-a37135ee7823`;
- no authentication;
- no state-changing clicks;
- Manager runtime and Employee runtime inspected directly;
- screenshots/snapshots captured by the browser run.

### Manager live runtime

Direct runtime:

`/05_MANAGER/runtime/manager-runtime-v1.html?v=20261001-ui-unified1`

Observed production state:

- runtime rendered without an auth redirect at the direct runtime URL;
- full desktop shell rendered with dark left navigation and right-side main workspace;
- main content occupied the remaining viewport rather than a narrow forced side column;
- primary navigation/guidance was Vietnamese;
- visible labels included `Hôm nay`, `Xếp lịch`, `Đổi / Cho ca`, `Chấm công`, `Nhân viên`, `Công / Lương`, `Lịch đã phát hành`, `Quản lý cửa hàng`, `CHƯA KẾT NỐI` and `Đăng xuất`.

This is a production visual PASS for:

- full-width Manager shell;
- no forced-side-column defect;
- primary Vietnamese guidance.

### Employee live runtime

Direct runtime:

`/06_EMPLOYEE/runtime/employee-runtime-v1.html?v=20261001-ui-unified1`

Observed public production state:

- runtime rendered without top-level redirect;
- because there was no authenticated production session, only the safe logged-out state `Chưa đăng nhập.` was visible;
- no Employee schedule/business rows were rendered.

Therefore the authenticated Employee desktop shell and published schedule are recorded as:

`NO_REAL_DATA_TO_RENDER`

This is not classified as a layout regression because the protected Employee UI is intentionally data/session dependent and no authenticated production profile was available. No login was attempted merely to satisfy this UI task.

## Production asset cutover verification

All checks below fetched the live GitHub Pages assets with cache bypass/freshness requested.

### Shared typography and visual tokens

Live production asset:

`/02_CORE/ui/magasin-ui-v2-tokens.css?v=20261001-ui-unified1`

Observed deployed tokens:

- `--m-font-sans: "Segoe UI", Roboto, "Helvetica Neue", Arial, system-ui, -apple-system, sans-serif`;
- `--m-shift-morning-bg: #FFF4CC`;
- `--m-shift-afternoon-bg: #FDE7E7`;
- `--m-shift-evening-bg: #E8F3FF`.

### Manager full-width shell

Live production asset:

`/02_CORE/ui/magasin-ui-v2-shell.css?v=20261001-ui-unified1`

Observed deployed rules include:

- legacy Manager main `width: auto !important`;
- `max-width: none !important`;
- `margin-left: var(--m-shell-sidebar-width) !important`;
- legacy Manager content `max-width: none !important`.

This independently confirms the production CSS cutover for the Manager no-compression correction.

### Employee desktop alignment

Live production asset:

`/02_CORE/ui/magasin-ui-v2-employee-shell.css?v=20261001-ui-unified1`

Observed deployed rules include:

- `--m-employee-desktop-rail: 208px`;
- desktop main `width: auto !important`;
- `max-width: none`;
- `margin-left: var(--m-employee-desktop-rail) !important`;
- centered `.page-wrap` retained for normal inner content.

Authenticated live Employee shell: `NO_REAL_DATA_TO_RENDER`.

Exact-main UI2 browser fixture remains the acceptance evidence for the authenticated layout state.

## Recurring staffing value preservation / no fake 05:00

Live production assets:

- `/02_CORE/ui/app-time-picker-24h.js?v=20261001-ui-unified1`;
- `/05_MANAGER/Workforce/cross-store-auto-schedule-v1.js?v=20261001-ui-unified1`.

Observed deployed behavior in source:

- the time picker copies input attributes;
- invalid/empty value receives `Chọn giờ`;
- selection uses `select.value=validHm(value)?value:''`;
- there is no fallback that forces an empty time field to `05:00`;
- adding a recurring block first calls `syncFromDom()`;
- the new block is created with `start_time:''` and `end_time:''`;
- removing a block also calls `syncFromDom()` before mutation.

Real recurring staffing rows were not opened or edited in production because doing so could expose or modify Owner/Manager business state.

Production real-row state:

`NO_REAL_DATA_TO_RENDER`

Accepted behavioral evidence remains the exact-main People Shift browser run:

- run `36963178766` — SUCCESS;
- `XSTORE_RECURRING_STABLE_EDITOR_BROWSER=PASS`;
- add/remove/save/reload/week reuse verified;
- no stale 05:00 reset.

## Time-band colors

### Manager

Live production Manager assets use the shared shift tokens for recurring, draft and four-store projections.

The live `cross-store-master-v1.js` contains:

- `xsm-band-morning` → `--m-shift-morning-bg`;
- `xsm-band-afternoon` → `--m-shift-afternoon-bg`;
- `xsm-band-evening` → `--m-shift-evening-bg`;
- neutral fallback for no valid start time.

Real production schedule/recurring rows were not modified to force examples.

Production real-row state:

`NO_REAL_DATA_TO_RENDER`

Fixture evidence on exact-main remains green for live class transitions and the required boundaries.

### Employee

Live production asset:

`/02_CORE/ui/magasin-ui-v2-employee-schedule.css?v=20261001-ui-unified1`

Observed deployed mappings:

- `.morning-yellow` → `--m-shift-morning-bg`;
- `.afternoon-red` → `--m-shift-afternoon-bg`;
- `.evening-cyan` → `--m-shift-evening-bg`.

Live production Employee engine:

`/06_EMPLOYEE/schedule/engine-v1.js?v=20261001-ui-unified1`

Observed deployed logic maps shared start-time kinds to those same three classes and uses Vietnamese visible labels such as `Lịch làm chính thức`, `Đã phát hành` and `Khi quản lý phát hành lịch, ca chính thức của bạn sẽ xuất hiện tại đây.`.

Authenticated Employee published rows:

`NO_REAL_DATA_TO_RENDER`

Accepted fixture evidence:

- exact-main People Shift run `36963178766` — SUCCESS;
- `EMPLOYEE_PUBLISHED_WEEKLY_SCHEDULE_BROWSER=PASS`;
- exact-main UI2 Cross Role run `36963178685` — SUCCESS.

## Vietnamese user-facing copy

Production-safe inspection and live asset reads confirm:

Manager:

- primary visible navigation and guidance are Vietnamese;
- deployed Manager scheduling startup fallback is `Không khởi tạo được bảng xếp lịch. Vui lòng tải lại và thử lại.`;
- deployed four-store fallback is `Không tải được tổng lịch 4 cửa hàng. Vui lòng tải lại và thử lại.`;
- deployed official-schedule fallback is `Không tải được lịch làm chính thức. Vui lòng tải lại và thử lại.`;
- raw backend errors are not appended to these corrected user messages.

Employee:

- logged-out production state displays `Chưa đăng nhập.`;
- deployed schedule engine uses Vietnamese primary guidance and no `publish lịch` wording;
- Task disconnected visible label remains `CHƯA KẾT NỐI`.

## Exact-main fixture support

The required protected/data-dependent states are supported by the already-qualified product exact-main:

`d11c0b9905ad702e637d8d3329419bef7300b231`

Exact-main gates:

- Validate MAGASIN GitHub Pages source `36963178725` — SUCCESS;
- pages build and deployment `36963178154` — SUCCESS;
- UI2 Cross Role Acceptance `36963178685` — SUCCESS;
- People Shift Day-10 Tests `36963178766` — SUCCESS;
- SOP Task Tests `36963178744` — SUCCESS;
- AUTH-PROD Regression Contract `36963178721` — SUCCESS;
- Owner Control Tower Tests `36963178739` — SUCCESS.

Key artifacts:

- People Shift `11208927581`;
- UI2 Cross Role `11208252442`;
- SOP Task `11208222445`;
- Owner Control Tower `11209041341`.

## Acceptance matrix

| Requirement | Production-safe result |
|---|---|
| Manager full-width layout | PASS — live runtime + deployed CSS |
| Manager no forced side column | PASS — live runtime + deployed CSS |
| Recurring values preserved on add | NO_REAL_DATA_TO_RENDER + deployed logic + exact-main fixture PASS |
| New recurring block does not auto-fill 05:00 | PASS deployed logic; NO_REAL_DATA_TO_RENDER for real business row |
| Manager time-band colors | NO_REAL_DATA_TO_RENDER + deployed tokens/classes + exact-main fixture PASS |
| Manager primary guidance Vietnamese | PASS — live runtime/assets |
| Employee desktop/main alignment | NO_REAL_DATA_TO_RENDER + deployed CSS + exact-main UI2 fixture PASS |
| Employee font/color foundation | PASS — deployed shared production assets |
| Employee published shift colors | NO_REAL_DATA_TO_RENDER + deployed CSS/engine + exact-main fixture PASS |
| Employee primary guidance Vietnamese | PASS deployed assets; logged-out live state is Vietnamese |
| No business data fabricated | PASS |

## Conclusion

WUI-008 is complete.

The deployed production assets contain the accepted Manager/Employee layout, typography, Vietnamese copy, recurring editor state protection and shared time-band system. Manager full-width presentation was observed directly in production.

Where authenticated real business rows were unavailable, the state is explicitly recorded as `NO_REAL_DATA_TO_RENDER` and accepted only with the already-green exact-main browser fixture evidence. No production business data was created or modified for acceptance.

Next authoritative task after this evidence is merged to `main`: `WUI-009`.

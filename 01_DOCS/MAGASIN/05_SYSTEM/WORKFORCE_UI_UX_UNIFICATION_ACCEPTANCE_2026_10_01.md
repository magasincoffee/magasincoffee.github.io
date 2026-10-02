# WORKFORCE UI/UX UNIFICATION — PERMANENT ACCEPTANCE

**Track:** WORKFORCE_UI_UX_UNIFICATION_V1  
**Closure task:** WUI-009  
**Original Owner correction date:** 2026-10-01  
**Closure date:** 2026-10-02  
**Repository:** `magasincoffee/magasincoffee.github.io`  
**Product PR:** #363  
**Final accepted product head before merge:** `9c4a4ccbeaa420c12b335c89c4d52dbee370c354`  
**Qualified product merge SHA:** `d11c0b9905ad702e637d8d3329419bef7300b231`  
**Result:** ACCEPTED / COMPLETE

## 1. Owner problem statement

The Workforce UI/UX correction track was created after the Owner reported production-facing issues across Manager and Employee Workforce surfaces:

1. Manager layout appeared compressed / forced into one side of the viewport.
2. Employee layout showed the same class of width/alignment inconsistency.
3. Font, color, spacing and component styling were inconsistent between modules.
4. In recurring staffing configuration, adding a new time block could cause previously entered values to reset to `05:00 / 05:00 / 1`.
5. User-facing guidance exposed implementation language and mixed English/Vietnamese.
6. User-facing copy needed to be plain Vietnamese.
7. The system needed to be easier to use without knowledge of internal architecture terms.
8. Scheduling time blocks needed one consistent visual start-time color rule across Manager + Employee surfaces.

This UI/UX track was intentionally separate from the primary XSTORE scheduling authority and was never allowed to invent Owner/Manager business values.

## 2. Root cause of the 05:00 reset

The legacy 24-hour time-picker replacement used the first generated option as a fallback:

`select.value = TIMES.includes(value) ? value : TIMES[0]`

Because `TIMES[0]` is `05:00`, an empty/new time input was converted to `05:00` instead of remaining unset.

The old replacement also copied only a hard-coded subset of attributes rather than preserving all business `data-*` markers used by the recurring staffing editor. In addition, recurring-editor add/remove operations needed to synchronize the current DOM values before mutating the in-memory block list.

The accepted correction:

- preserves input attributes except `type` / `value`;
- shows `Chọn giờ` for an empty/invalid value;
- uses `select.value=validHm(value)?value:''`;
- removes the empty → `05:00` fallback;
- calls `syncFromDom()` before add/remove;
- creates a new recurring block with `start_time:''` and `end_time:''`;
- preserves already-edited time/headcount values through add/remove/save/reload/week-change flows.

WUI-002 static and browser regressions permanently cover this path.

## 3. Final layout foundation

### Manager

Desktop Manager layout now uses the remaining viewport beside the fixed navigation instead of a narrow forced wrapper.

Accepted shared shell rules include:

- main `width:auto !important`;
- `max-width:none !important`;
- `margin-left:var(--m-shell-sidebar-width) !important`;
- Manager content `max-width:none !important`;
- wide scheduling boards scroll inside their own container;
- shared Manager responsive/touch boundary remains `1024px`;
- touch controls remain at least `44px` where required.

### Employee

Accepted desktop Employee shell rules include:

- desktop rail `208px`;
- main `width:auto !important`;
- `max-width:none`;
- `margin-left:var(--m-employee-desktop-rail) !important`;
- normal `.page-wrap` content may center within the available page;
- schedule surfaces do not create page-level horizontal overflow.

Representative browser coverage remained green at desktop and responsive widths including `1440 / 1024 / 768 / 430 / 390 / 360` as applicable.

## 4. Final typography and palette

Canonical Workforce font stack:

`"Segoe UI", Roboto, "Helvetica Neue", Arial, system-ui, -apple-system, sans-serif`

Canonical shared neutral/brand palette:

- primary text: `#101828`;
- secondary text: `#667085`;
- border: `#EAECF0`;
- surface: `#FFFFFF`;
- page background: `#F9FAFB`;
- brand: `#0F8F9C`.

These tokens are shared by the accepted Manager/Employee Workforce presentation.

## 5. Final time-band visual rule

Classification is based on **start time**:

- `05:00 <= start < 12:00` → morning / yellow;
- `12:00 <= start < 17:00` → afternoon / light red;
- `17:00 <= start <= 22:00` → evening / light blue;
- empty/invalid start → neutral.

Canonical backgrounds:

- morning: `#FFF4CC`;
- afternoon: `#FDE7E7`;
- evening: `#E8F3FF`.

Accepted boundary checks:

- `07:00` → morning;
- `12:00` → afternoon;
- `17:00` → evening;
- empty recurring start → neutral.

The same visual meaning is used by:

- recurring staffing editor;
- Manager DRAFT scheduling;
- Manager official projection;
- four-store weekly overview;
- Employee published schedule.

Browser acceptance proves live class transitions when the recurring start time changes.

## 6. Vietnamese UX rule

Primary user-facing Workforce guidance must use plain Vietnamese and must not require knowledge of internal implementation architecture.

Corrections include removal/replacement of visible terms such as:

- `server`;
- `revalidate`;
- `publish`;
- technical ID guidance;
- raw backend `e.message/e.code` output.

Friendly fallbacks are shown to users while raw diagnostics remain available through `console.warn` on the corrected paths.

Task/SOP fail-closed semantics remain intact:

- visible label: `CHƯA KẾT NỐI`;
- internal quality/state identifier: `NOT_CONNECTED`.

Internal identifiers such as `DRAFT`, `REVIEWED`, `PUBLISHED`, `APPROVED`, RPC names and schema identifiers may remain internal and are not treated as visible UX copy.

## 7. Task acceptance summary

- WUI-001 — regression triage + contract reconciliation: DONE.
- WUI-002 — recurring staffing editor state acceptance: DONE.
- WUI-003 — Manager + Employee layout foundation acceptance: DONE.
- WUI-004 — typography / palette / time-band visual acceptance: DONE.
- WUI-005 — Vietnamese UX copy acceptance: DONE.
- WUI-006 — cross-role browser regression: DONE.
- WUI-007 — PR merge + exact-main qualification: DONE.
- WUI-008 — production-safe UI acceptance: DONE.
- WUI-009 — permanent evidence + TEMP cleanup: this closure.

Durable intermediate evidence remains available in:

- `WUI_001_REGRESSION_TRIAGE_ACCEPTANCE.md`;
- `WUI_002_RECURRING_STAFFING_EDITOR_ACCEPTANCE.md`;
- `WUI_003_LAYOUT_FOUNDATION_ACCEPTANCE.md`;
- `WUI_004_VISUAL_TIME_BAND_ACCEPTANCE.md`;
- `WUI_005_VIETNAMESE_UX_COPY_ACCEPTANCE.md`;
- `WUI_006_CROSS_ROLE_BROWSER_ACCEPTANCE.md`;
- `WUI_007_EXACT_MAIN_QUALIFICATION_ACCEPTANCE.md`;
- `WUI_008_PRODUCTION_SAFE_UI_ACCEPTANCE.md`.

## 8. PR and exact-main qualification

Product PR #363 merged the accepted UI/UX implementation.

Final pre-merge product head:

`9c4a4ccbeaa420c12b335c89c4d52dbee370c354`

Qualified product merge SHA:

`d11c0b9905ad702e637d8d3329419bef7300b231`

All required exact-main workflows completed SUCCESS on that product merge SHA:

| Workflow | Run | Conclusion |
|---|---:|---|
| Validate MAGASIN GitHub Pages source | `36963178725` | SUCCESS |
| pages build and deployment | `36963178154` | SUCCESS |
| UI2 Cross Role Acceptance | `36963178685` | SUCCESS |
| People Shift Day-10 Tests | `36963178766` | SUCCESS |
| SOP Task Tests | `36963178744` | SUCCESS |
| AUTH-PROD Regression Contract | `36963178721` | SUCCESS |
| Owner Control Tower Tests | `36963178739` | SUCCESS |

Representative exact-main artifacts:

- People Shift: `11208927581`;
- UI2 Cross Role: `11208252442`;
- SOP Task: `11208222445`;
- Owner Control Tower: `11209041341`.

## 9. Production-safe verification

WUI-008 verified the deployed GitHub Pages production assets read-only.

Production-safe browser run:

`df2e14a4-5314-49f3-8e65-a37135ee7823`

Observed directly:

- Manager runtime rendered the accepted full-width desktop shell;
- primary Manager visible guidance was Vietnamese;
- deployed production assets contained the accepted Manager/Employee layout and shared visual tokens;
- deployed time-picker code had no empty → `05:00` fallback;
- deployed recurring editor synchronized current DOM values before add/remove and created new blocks with empty time values;
- deployed Employee schedule CSS/engine used the same shared time bands and Vietnamese published-schedule guidance.

No authenticated production browser profile was available for protected Employee/recurring real-data states.

Those states were explicitly recorded as:

`NO_REAL_DATA_TO_RENDER`

They were accepted only with already-green exact-main fixture evidence, as required by the temporary SOT.

No login was performed merely to satisfy UI acceptance.

## 10. No fabricated business data

This track did not create, infer or modify:

- Store Priority business values;
- recurring staffing demand;
- staffing headcount;
- draft schedule assignments;
- official schedules;
- any other Owner/Manager business decision.

No schema/RPC scheduling authority was changed by this UI/UX track.

## 11. Primary XSTORE Source of Truth preservation

Primary XSTORE authority remains:

`01_DOCS/MAGASIN/05_SYSTEM/WORKFORCE_CROSS_STORE_SCHEDULING_TEMP_SOURCE_OF_TRUTH.md`

Primary XSTORE blob SHA immediately before WUI-009 closure:

`22fd961ee24c056d2bc0f33e75ccd54fa2bc2042`

Its authoritative status at closure remains:

`XSTORE-001→010 IMPLEMENTED / EXACT-MAIN GREEN / XSTORE-C01→C05 DONE / XSTORE-011 BLOCKED / OWNER INPUT REQUIRED`

It still states that `XSTORE-011` owns the real Manager business configuration and real end-to-end Auto Schedule → review/edit → Validate → Review → Publish acceptance.

The Workforce UI/UX track does not amend or reinterpret that authority.

## 12. TEMP Source of Truth cleanup

The temporary execution authority:

`01_DOCS/MAGASIN/05_SYSTEM/WORKFORCE_UI_UX_UNIFICATION_TEMP_SOURCE_OF_TRUTH.md`

is deleted in the same WUI-009 closure PR that adds this permanent acceptance document.

After that closure PR merges, this permanent file is the durable acceptance record for the completed UI/UX correction track, while the primary XSTORE SOT continues to own `XSTORE-011`.

## Final conclusion

WORKFORCE_UI_UX_UNIFICATION_V1 is complete.

The Owner-reported layout, recurring-time-state, visual consistency and user-facing copy issues have been corrected and qualified through PR, exact-main CI and production-safe verification without fabricating business data or weakening XSTORE scheduling authority.

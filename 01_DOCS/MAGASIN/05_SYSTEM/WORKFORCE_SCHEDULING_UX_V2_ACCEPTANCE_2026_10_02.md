# WORKFORCE SCHEDULING UX V2 — PERMANENT ACCEPTANCE

**Track:** WORKFORCE_SCHEDULING_UX_V2  
**Closed by:** SCHED-UI-019  
**Production release date:** 2026-10-04  
**Release governance:** `PRODUCTION_RELEASE_GOVERNANCE_V1_SOURCE_OF_TRUTH.md`

## 1. Acceptance result

Status: **ACCEPTED / RELEASED / PRODUCTION SMOKE GREEN**

The Scheduling UX V2 track is permanently accepted after:

- Owner Preview review and correction cycle;
- exact RC freeze;
- midnight production release;
- successful GitHub Pages deployment;
- exact-main production smoke;
- credentialed production Auth smoke;
- verification that the release did not replace XSTORE business authority.

The temporary task SOT is removed by the same closure PR that creates this permanent record.

## 2. Original Owner issues and closure

The track was opened to close these Owner-reported issues:

1. recurring staffing time controls were clipped / hard to read;
2. Auto Schedule information hierarchy was confusing;
3. Employee scheduling colors were not consistently visible;
4. Employee availability registration was too easy to miss;
5. user-facing URLs exposed numbered implementation paths such as `04_`, `05_`, `06_`;
6. Owner scheduling was not visually/language synchronized with Manager/Employee scheduling.

One additional issue was found during the source audit:

7. Owner scheduling exposed developer/system terminology in normal UI.

Closure result:

- recurring weekly staffing remains a readable scan surface, with editing moved to a dedicated wide editor;
- Manager weekly scheduling and recurring scheduling setup are separated;
- guided weekly scheduling exposes one visible next action at a time;
- Manager / Employee / Owner scheduling use the same locked time-band semantics;
- Employee next-week availability is promoted as a primary scheduling action;
- clean canonical user-facing routes are available;
- Owner scheduling is aligned with the shared scheduling truth and user-facing Vietnamese language;
- technical/developer terminology is removed from normal Owner-facing scheduling UI where covered by this track;
- mobile/responsive, accessibility and loading/empty/error states were hardened and qualified.

## 3. Final Scheduling UX design

The accepted design is:

- recurring staffing weekly grid is a scan/read surface;
- editing a staffing day uses a dedicated wide editor rather than cramped controls inside narrow cells;
- Manager separates `Lập lịch tuần` from `Thiết lập xếp lịch`;
- Manager uses one visible guided workflow:
  1. Chuẩn bị
  2. Tạo lịch nháp
  3. Chỉnh lịch
  4. Kiểm tra
  5. Duyệt & phát hành
- one primary next action is shown per workflow state;
- availability is distinct from official published schedule;
- Employee availability keeps immediate-save semantics and does not add a fake final-submit step;
- Owner uses the same scheduling truth/components as Manager with overview-first enterprise scope;
- mobile uses deliberate cards/accordion/sheet layouts rather than compressed desktop grids.

## 4. Final time-band rule

Classification is by **shift/availability start time**:

- `05:00 <= start < 12:00` → yellow / morning;
- `12:00 <= start < 17:00` → light red / afternoon;
- `17:00 <= start <= 22:00` → light blue / evening;
- invalid or outside range → neutral.

Cross-band examples remain classified by start time:

- `06:00–22:00` → morning / yellow;
- `12:00–22:00` → afternoon / light red;
- `17:00–22:00` → evening / light blue.

The accepted shared implementation authority is `MAGASIN_CORE.time.shiftKind()`; Manager overview cards use the same canonical classifier and do not introduce a divergent local time-band rule.

## 5. Canonical route map

Accepted visible routes:

- Owner:
  - `/owner/`
  - `/owner/scheduling/`
- Manager:
  - `/manager/`
  - `/manager/scheduling/`
  - `/manager/schedule/`
- Employee:
  - `/employee/`
  - `/employee/schedule/`
  - `/employee/attendance/`
  - `/employee/payroll/`

Numbered implementation folders remain internal compatibility paths where required; they are not the preferred user-facing navigation contract.

## 6. Owner approval and Release Candidate

Owner correction cycle:

- SCHED-UI-016 result: `CHANGES_REQUESTED`;
- correction: `OWNER-CORRECTION-001`;
- affected surface: Manager `/manager/scheduling/` → cross-employee `Đăng ký thời gian có thể làm`;
- final corrected behavior: Manager availability cards use the canonical start-time color classifier.

Owner final approval was recorded on 2026-10-03 after local review using real MAGASIN authentication and role/data reads with production mutation blocked.

Frozen exact RC SHA:

`1f6f6cf0646aba66e9f73fab123f87a182cb17c1`

Product PR:

`#381`

Corrected Preview / isolated acceptance evidence:

- Preview run: `37134994384`;
- Preview artifact: `sched-ui-017-preview-site-37134994384` / artifact `11278591594`;
- RC/evidence artifact: `sched-ui-017-rc-packet-37134994384` / artifact `11278571703`.

## 7. Midnight production release

Release executed in the approved `00:00 Asia/Ho_Chi_Minh` window on 2026-10-04.

Rollback SHA recorded immediately before merge:

`3835ddd7461ec188a14339634e2e0058470ad061`

Production merge SHA:

`cb2371b997c4bd8e6d0526553ced9d62a1c9175a`

PR `#381` was merged with an expected-head guard against the exact frozen RC.

GitHub Pages release:

- Pages build/deployment run `37138925970`: SUCCESS;
- build job: SUCCESS;
- report-build-status job: SUCCESS;
- deploy job: SUCCESS.

Required exact-RC gates before release:

- Auth Password Reset Hotfix `37134581020`: SUCCESS;
- SOP Task Tests `37134581077`: SUCCESS;
- Owner Control Tower Tests `37134581043`: SUCCESS;
- AUTH-PROD Regression Contract `37134581106`: SUCCESS;
- UI2 Cross Role Acceptance `37134581060`: SUCCESS;
- People Shift Day-10 Tests `37134581111`: SUCCESS;
- Procurement QA Robot `37134581109`: SUCCESS.

Exact production-merge scheduling/auth gates:

- AUTH-PROD Regression Contract `37138935772`: SUCCESS;
- Validate MAGASIN GitHub Pages source `37138935763`: SUCCESS;
- Owner Control Tower Tests `37138935796`: SUCCESS;
- SOP Task Tests `37138935817`: SUCCESS;
- Auth Password Reset Hotfix `37138935777`: SUCCESS;
- UI2 Cross Role Acceptance `37138935792`: SUCCESS;
- People Shift Day-10 Tests `37138935805`: SUCCESS.

## 8. Production smoke

Dedicated SCHED-UI-019 production smoke:

- workflow run: `37139658007`;
- job: `production-smoke` / `111251269665`;
- conclusion: SUCCESS;
- evidence artifact: `sched-ui-019-production-smoke-37139658007`;
- artifact id: `11279554159`;
- artifact digest: `sha256:522925cbac2f4e099926efb701c758457451d37630f10dbf8fef1dc9b0952389`.

Verified markers:

- `SCHED_UI_019_EXACT_MAIN=PASS`;
- `SCHED_UI_019_PRODUCTION_HTTP_ROUTES=PASS`;
- `SCHED_UI_019_PRODUCTION_CORRECTION_ASSET=PASS`;
- `SCHED_UI_019_CANONICAL_TIME_BAND_ASSET=PASS`;
- `SCHED_UI_019_PRODUCTION_BROWSER_DIAGNOSTICS=PASS`;
- `SCHED_UI_019_NO_BUSINESS_MUTATION=PASS`;
- `SCHED_UI_019_PRODUCTION_SMOKE=PASS`;
- `SCHED_UI_019_CREDENTIALED_AUTH=PASS`.

Credentialed production Auth smoke additionally verified:

- ACTIVE username login: PASS;
- ACTIVE logout: PASS;
- ACTIVE email login: PASS;
- overall ACTIVE production smoke: PASS.

Production smoke covered:

- Pages source and deployed route availability;
- Manager scheduling routes;
- Employee schedule route;
- Owner scheduling route;
- canonical clean routes;
- compatibility implementation routes;
- Auth entrypoint;
- released Manager correction asset;
- canonical shared time-band asset;
- browser console/page/request/HTTP-5xx diagnostics;
- no Scheduling business mutation.

## 9. Procurement QA non-scope evidence

The production-merge push also triggered Procurement QA run `37138935861`, which failed because production Procurement reference data had 31 items without reference price/spec coverage.

This is recorded rather than hidden.

Evidence that it is pre-existing and outside this Scheduling UX release scope:

- prior main Procurement runs `37067115455`, `36968536459`, and `36932667520` were already failing before this release;
- release-run Procurement diagnostics still reported:
  - app loaded: PASS;
  - console errors: PASS;
  - page errors: PASS;
  - request failures: PASS;
  - HTTP 5xx: PASS;
- failure was the Procurement reference-coverage dataset, not Scheduling runtime behavior;
- this Scheduling UX track did not change Procurement business truth to make an unrelated gate pass.

## 10. Business authority preserved

This release changes Scheduling UX and presentation contracts. It does **not** replace the business authority owned by:

`WORKFORCE_CROSS_STORE_SCHEDULING_TEMP_SOURCE_OF_TRUTH.md`

XSTORE remains authoritative for:

- Store Priority semantics;
- recurring staffing business semantics;
- cross-store scheduling behavior;
- Auto Schedule business behavior;
- XSTORE scheduling authority and RPC/business-writer semantics.

No new competing business writer was introduced for this UX track.

## 11. Permanent closure

The Scheduling UX V2 implementation chain is complete:

`SCHED-UI-000 → ... → SCHED-UI-019 = DONE`

Permanent acceptance lives in this file.

The temporary task-state SOT:

`WORKFORCE_SCHEDULING_UX_V2_TEMP_SOURCE_OF_TRUTH.md`

is deleted in the same closure PR after production smoke is verified.

No further task remains in this Scheduling UX V2 track.

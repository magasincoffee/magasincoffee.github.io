# MAGASIN UI/UX V2 — UI2-001 PRESENTATION AUDIT + MIGRATION MAP

**Task:** `UI2-001`  
**Status:** AUDIT COMPLETE / PENDING BRAIN VERIFY  
**Audit base:** `main@51da75b1351541894ec910e13fc20112970638e6`  
**Architecture:** `MAGASIN_OPERATIONS_UI_V2`  
**Canonical references:**  
- `01_DOCS/MAGASIN/05_SYSTEM/MAGASIN_UI_UX_V2_SOURCE_OF_TRUTH.md`
- `01_DOCS/MAGASIN/05_SYSTEM/MAGASIN_UI_UX_V2_P0_EXECUTION_PLAN.md`

This document is a presentation-layer audit and migration contract only. It does not implement UI, change routing semantics, change auth, change RPC/RLS/business logic, or supersede domain contracts.

---

## 1. Audit rules and terminology

A surface is classified **ACTIVE/CANONICAL** only when it is traceable from the current product entry, a current role entry wrapper, or a script injected by those wrappers on the audited main SHA.

A file is classified **COMPATIBILITY/LEGACY** when it still exists or is directly routable but the current canonical shell hides/supersedes it, or its direct-entry implementation diverges from the current runtime. Such files SHALL NOT be treated as the V2 design source merely because the route exists.

UI V2 migration SHALL preserve:
- current authenticated role resolution;
- current canonical Workforce writers/readers;
- current route outcomes unless a separately approved routing task changes them;
- current RPC/RLS/store/role authority;
- reload/back canonical truth.

---

## 2. Active entrypoint and runtime matrix

### 2.1 Login / Auth

| Public route / state | Classification | Exact active files | Trace |
|---|---|---|---|
| `/` | ACTIVE ENTRY | `index.html` | Immediately `location.replace('/03_PLATFORM/01_AUTH/')`. |
| `/03_PLATFORM/01_AUTH/` | ACTIVE/CANONICAL | `03_PLATFORM/01_AUTH/index.html`; `03_PLATFORM/01_AUTH/auth-runtime-v2.js` | Login, registration, forgot password, recovery checking, invalid recovery and reset are one auth surface. |
| pending access | ACTIVE/CANONICAL | `03_PLATFORM/01_AUTH/pending-access.html` | `auth-runtime-v2.js` redirects inactive/pending access here. |

Current authenticated role routing in `auth-runtime-v2.js`:
- `OWNER` → `/04_OWNER/`;
- `ACCOUNTANT` → `/nhap-hang/`;
- `STAFF` / `EMPLOYEE` → `/06_EMPLOYEE/`;
- other active internal roles → `/05_MANAGER/`.

**V2 rule:** UI2-003 may change auth presentation and state styling, but SHALL NOT change this role resolution contract.

### 2.2 Employee

| Layer | Classification | Exact active files | Responsibility |
|---|---|---|---|
| role entry | ACTIVE/CANONICAL | `06_EMPLOYEE/index.html` | Active-profile + Employee/Staff guard; loads Employee runtime. |
| runtime host | ACTIVE/CANONICAL | `06_EMPLOYEE/runtime/employee-runtime-v1.html` | Loads iframe app plus profile/payroll/schedule/attendance/availability/swap/notification/dashboard engines. |
| base presentation | ACTIVE/CANONICAL | `06_EMPLOYEE/app/employee-v40.html` | Current header, drawer/nav, page views, base tokens/layout/forms/cards/tables. |
| consolidation | ACTIVE/CANONICAL | `06_EMPLOYEE/workforce-ui-consolidation-v1.js` | Normalizes canonical Workforce route hashes and relabels current nav. |
| schedule presentation | ACTIVE/CANONICAL | `06_EMPLOYEE/schedule/engine-v1.js`; `02_CORE/ui/workforce-scheduling-polish-v1.css` | Canonical published-schedule phone/read states and shared scheduling polish. |
| availability | ACTIVE/CANONICAL | `06_EMPLOYEE/availability/engine-v1.js` | Next-week availability panel and status/toast behavior. |
| Swap/Give | ACTIVE/CANONICAL | `06_EMPLOYEE/swap/engine-v1.js` | Swap/Give forms, history, incoming actions and status badges. |
| Attendance | ACTIVE/CANONICAL | `06_EMPLOYEE/attendance/engine-v1.js` | Schedule-linked manual-time UI, error/empty/retry/history. |
| Payroll | ACTIVE/CANONICAL | `06_EMPLOYEE/payroll/engine-v1.js` | Injects `payroll` nav/view and read-only payroll table/status states. |
| Profile | ACTIVE/CANONICAL | `06_EMPLOYEE/profile/engine-v1.js` | Canonical profile projection state. |
| Today | ACTIVE/CANONICAL | `06_EMPLOYEE/dashboard/engine-v1.js` | Current shift + action shortcuts. |
| Notifications | ACTIVE/CANONICAL | `06_EMPLOYEE/notification/engine-v1.js` | Notification timeline opened from header. |

Current top-level Employee hash allowlist is:
`dashboard`, `schedule`, `attendance`, `swap`, `payroll`, `profile`.

The base app still contains legacy/static primary nav entries for `inventory` and `settings`, plus a `notice` view opened from the header. UI2-001 does **not** classify those extra destinations as part of the locked V2 five-item primary mobile navigation. Their business behavior must not be deleted by shell work; they must be moved to an appropriate secondary/overflow location or explicitly handled by a later accepted UI task.

### 2.3 Manager

Canonical runtime chain:

```text
/05_MANAGER/
  -> 05_MANAGER/index.html
  -> 05_MANAGER/runtime/manager-runtime-v1.html
  -> 05_MANAGER/runtime/manager-shell-v1.html
  -> injected compat shell/router
  -> 05_MANAGER/Workforce/engine-v1.js
  -> canonical Workforce presentation modules
```

Exact active presentation/runtime files:

- `05_MANAGER/index.html`
- `05_MANAGER/runtime/manager-runtime-v1.html`
- `05_MANAGER/runtime/manager-shell-v1.html`
- `05_MANAGER/runtime/compat/ui/manager-ui-source-header-suppress-v1.js`
- `05_MANAGER/runtime/compat/ui/manager-ui-shell-v2.js`
- `05_MANAGER/runtime/compat/ui/manager-ui-header-fix-v1.js`
- `05_MANAGER/runtime/compat/ui/manager-drawer-fix.css`
- `05_MANAGER/runtime/compat/router/manager-route-state-v2.js`
- `05_MANAGER/Workforce/engine-v1.js`
- `05_MANAGER/Workforce/ui-consolidation-v1.js`
- `05_MANAGER/Workforce/review-v1.js`
- `05_MANAGER/Workforce/draft-publish-v1.js`
- `05_MANAGER/Workforce/official-v1.js`
- `05_MANAGER/Workforce/swap-approval-v1.js`
- `05_MANAGER/Workforce/attendance-review-v1.js`
- `05_MANAGER/Workforce/payroll-self-check-v1.js`
- `05_MANAGER/Workforce/staff-projection-v1.js`
- `02_CORE/ui/workforce-scheduling-polish-v1.css`

Current Manager consolidation exposes/uses these operational surfaces:
- `dashboard` → Hôm nay;
- `staff` → Nhân viên;
- `workforce` → Xếp lịch;
- `schedule` → Lịch làm;
- `swap` → Đổi / cho ca;
- `attendance` → Chấm công;
- injected `payroll-self-check` → Công / Lương.

The base shell also carries `tasks` and `settings`; `kpi` and `academy` are explicitly hidden by `ui-consolidation-v1.js`.

Route-state mapping currently knows:
- `/05_MANAGER/` → dashboard;
- `/05_MANAGER/Nhan-su/` → staff;
- `/05_MANAGER/Workforce/` → workforce;
- `/05_MANAGER/Lich-lam/` → schedule in the route-state map;
- `/05_MANAGER/Cong-viec/` → tasks;
- `/05_MANAGER/KPI/` → kpi;
- `/05_MANAGER/Doi-ca/` → swap;
- `/05_MANAGER/Cham-cong/` → attendance;
- `/05_MANAGER/Academy/` → academy;
- `/05_MANAGER/Cai-dat/` → settings.

**Compatibility finding:** several physical route wrappers predate the current canonical runtime. `KPI/`, `Academy/`, and `Cai-dat/` still load an older `manager-v13-runtime.html` direct wrapper, while KPI/Academy are hidden by the current canonical consolidation. `Lich-lam/index.html` currently loads the canonical runtime with `#workforce`, which is not identical to the route-state `schedule` slug mapping. These are deep-link/refresh compatibility risks, not V2 design sources. UI2-004 must preserve current accepted route behavior and may only rationalize these aliases if Brain explicitly includes that routing scope.

### 2.4 Owner

| Active route | Classification | Exact presentation/runtime files | Current model |
|---|---|---|---|
| `/04_OWNER/` | ACTIVE/CANONICAL entry | `04_OWNER/index.html` | Standalone module-card landing grid. |
| `/04_OWNER/ControlTower/` | ACTIVE/CANONICAL | `04_OWNER/ControlTower/index.html`; `control-tower-v1.css`; `control-tower-v1.js` | Read-only attention/quality overview. |
| `/04_OWNER/Workforce/` | ACTIVE/CANONICAL | `04_OWNER/Workforce/index.html`; `04_OWNER/Workforce/runtime/owner-workforce-runtime.html`; Manager shell source + `manager-ui-shell-v3.js`; `04_OWNER/Access/owner-access-nav-v1.js`; `05_MANAGER/Workforce/draft-publish-v1.js`; scheduling polish CSS | Owner scheduling oversight reuses canonical Manager scheduling truth and writer. |
| `/nhap-hang/` | ACTIVE/CANONICAL friendly route | `nhap-hang/index.html` → fetches `04_OWNER/Procurement/index.html`; `04_OWNER/Procurement/procurement-v2.css` | Procurement/payables/reporting app. |
| `/04_OWNER/Access/` | ACTIVE/CANONICAL | `04_OWNER/Access/index.html`; `04_OWNER/Access/owner-access-nav-v1.js` when injected into Owner Workforce | Account/role administration. |

No dedicated Owner `Finance` or Owner `Settings` runtime route is traceable from the current Owner entry in this audit. Procurement contains payable/reporting functions, but UI2-001 SHALL NOT invent a standalone Finance route. The V2 Owner information architecture may reserve a Finance destination, but implementation must bind it only to an actual accepted runtime source in UI2-015 or a later explicit contract.

---

## 3. Current visual-system inventory and duplication

| Surface | Current visual system | Evidence / values | Main gap |
|---|---|---|---|
| Auth | inline auth-specific tokens | brand `#16b7c5`, brand-dark `#0f8f9c`, ink `#17304c`, line `#dce5f0`; 22px auth card radius | Separate palette/scale; system-font-first rather than canonical Inter-first. |
| Employee base | inline app tokens | brand `#18b7c5`, navy `#10213b`, blue `#2f6fda`, line `#dbe4ef`, card radius 18px | Desktop/drawer vocabulary; no global focus contract; inconsistent 40px controls. |
| Employee schedule | engine CSS + shared scheduling polish | separate `--sch-*` and `--sched-*` tokens; focus-visible and many 44px controls | Better accessibility than base app, but duplicates base tokens and overrides them. |
| Manager base | inline manager tokens | primary `#16b7c5`, text `#102a43`, border `#dce5f0`; 16px cards; 40px buttons | No base focus styles; shell is later overridden by compat JS. |
| Manager shell V2/V3 | JS-injected CSS, extensive `!important` | duplicated header/drawer/nav tokens and 42px controls | Style stacking makes hierarchy and future maintenance fragile. |
| Manager Workforce modules | module-local injected CSS | staff/payroll/attendance/schedule each define table/status/control CSS | Same primitives repeated per module. |
| Owner landing | standalone inline CSS | hard-coded `#17365d`, 18px cards, hover lift | Disconnected landing-card architecture conflicts with target attention-first Owner shell. |
| Owner Control Tower | standalone CSS | hard-coded cards/topbar/quality chips | Own visual system; no shared shell/tokens. |
| Owner Access | inline tokens | navy `#17365d`, cyan `#16b7c5`, blue `#2f6fde`; 40/42px controls | Separate table/form/button vocabulary. |
| Procurement | external local CSS | navy `#163a63`, blue `#2f67aa`, radius 14px; several modal/table primitives | High-quality local system but not shared; primary buttons can be 40px. |
| Shared core | imperative toast | `02_CORE/shared/shared-core-v1.js` creates inline-styled `#sharedCoreToast` | Reusable behavior exists, but presentation cannot inherit a shared component vocabulary. |

### Duplication findings

1. Brand colors drift between `#18b7c5`, `#16b7c5`, `#0f8f9c`, `#17365d`, `#163a63`.
2. Text/neutral palettes use multiple unrelated ink/muted/border scales.
3. Radius values are ad hoc: 8/9/10/11/12/13/14/16/18/22px plus pills.
4. Shadows are defined independently per auth, employee, scheduling, Owner and Procurement surface.
5. Button heights vary from 31/32/36/38/40/42/44/47/49px.
6. Focus treatment is strong in auth/procurement/scheduling but absent in base Employee and base Manager primitives.
7. Modal patterns split between Manager custom overlay, Procurement native `<dialog>`, Employee custom panels/drawer, and simple full-page states.
8. Empty/error/loading states are hand-built repeatedly.
9. Employee/Manager/Owner headers and drawers are separate DOM/CSS implementations.
10. Manager and Owner Workforce are already structurally coupled through the Manager shell, which makes a shared shell migration preferable to another role-specific shell fork.

---

## 4. Canonical shared token migration map

The following token contract is the UI2-001 target for UI2-002. Token names are proposed canonical names; they do not exist yet.

### 4.1 Color

| Target token | Canonical value / semantics | Migrates current values |
|---|---|---|
| `--m-color-brand-600` | `#0F8F9C` | `#16b7c5`, `#18b7c5`, scheduling cyan variants |
| `--m-color-brand-700` | `#08747F` | auth `#0f8f9c`, scheduling `#0f8996` |
| `--m-color-neutral-950` | `#101828` | `#10213b`, `#102a43`, `#172033`, `#17263c` |
| `--m-color-neutral-700` | `#344054` | current secondary dark text |
| `--m-color-neutral-500` | `#667085` | `#617793`, `#718199`, `#697789` |
| `--m-color-neutral-300` | `#D0D5DD` | strong control borders |
| `--m-color-neutral-200` | `#EAECF0` | default borders/dividers |
| `--m-color-neutral-100` | `#F2F4F7` | soft control backgrounds |
| `--m-color-neutral-50` | `#F9FAFB` | page/soft surfaces |
| `--m-color-surface` | `#FFFFFF` | all current white cards |
| `--m-color-success` | semantic green; implementation target `#217653` | current `#176d49`, `#23754a`, `#2d9665` |
| `--m-color-warning` | semantic amber; implementation target `#8A5A00` | current `#876900`, `#936000`, `#b18700` |
| `--m-color-danger` | semantic red; implementation target `#A33D32` | current `#9a3838`, `#b34b4b`, `#a44739` |
| `--m-color-info` | semantic blue; implementation target `#2F6FDE` | current `#2f6fda`, `#2f67aa` |

Semantic colors SHALL indicate state/meaning, not decorative module identity.

### 4.2 Typography

Canonical family:
`Inter, system-ui, -apple-system, "Segoe UI", sans-serif`.

Canonical scale from the locked source of truth:
- page title: 28/32 semibold;
- section title: 18/26 semibold;
- body: 14/20 regular;
- small: 12/18 regular;
- interactive label: 14 semibold.

All current one-off 9/10/10.5/11/11.5/12.5px labels must be migrated only where density remains readable and accessible; compact metadata may remain 12px but not create another scale.

### 4.3 Spacing

Canonical scale for shared components:
`4, 8, 12, 16, 20, 24, 32, 40, 48px`.

Target tokens:
`--m-space-1` through `--m-space-9`.

Current 5/6/7/9/10/11/13/14/15/18/22px values may remain temporarily inside feature-specific layouts, but shared primitives SHALL consume the canonical scale.

### 4.4 Radius

Target:
- `--m-radius-sm: 8px`
- `--m-radius-md: 10px`
- `--m-radius-lg: 12px`
- `--m-radius-xl: 16px`
- `--m-radius-2xl: 20px`
- `--m-radius-pill: 999px`

Auth 22px and Employee 18px card radii migrate to 20px/16px according to hierarchy rather than preserving role-specific radii.

### 4.5 Shadow and border

Target:
- `--m-border-default: #EAECF0`
- `--m-border-strong: #D0D5DD`
- `--m-shadow-sm: 0 1px 2px rgba(16,24,40,.05)`
- `--m-shadow-md: 0 8px 24px rgba(16,24,40,.08)`
- `--m-shadow-lg: 0 18px 48px rgba(16,24,40,.12)`

Shadows SHALL communicate elevation only; ordinary cards default to border + small/no shadow.

### 4.6 Interactive/focus/status semantics

- Primary touch target: minimum `44×44 CSS px` on Employee core controls.
- Shared controls default to minimum 40px desktop and 44px in phone-primary contexts.
- Focus-visible: 2px brand/info outline + 2px offset; optional 3px translucent focus ring.
- Disabled: visible disabled semantics, no pointer interaction, not color-only.
- Loading: control-level busy state + Skeleton/Spinner where content is pending.
- Success/warning/danger/info use semantic tokens consistently.
- Hover is enhancement only; no action may be discoverable solely by hover.
- Error copy is adjacent/readable and not encoded only by border color.

---

## 5. Canonical component migration matrix

Proposed shared implementation targets for later tasks:
- `02_CORE/ui/magasin-ui-v2-tokens.css`
- `02_CORE/ui/magasin-ui-v2-primitives.css`
- `02_CORE/ui/magasin-ui-v2-components.js`
- `02_CORE/ui/magasin-ui-v2-shell.css`
- `02_CORE/ui/magasin-ui-v2-shell.js`

These are **target filenames**, not files created by UI2-001.

| Component | Current sources / duplication | V2 target | Primary implementation task |
|---|---|---|---|
| Button / IconButton | Auth inline `.btn`; Employee `.btn`, header/drawer buttons; Manager base + injected shell; Access; Procurement; scheduling polish | one size/variant/focus/disabled contract | UI2-002 |
| Input | Auth `.input`; Employee/Attendance/Profile; Access; Procurement | shared text input + field/error help | UI2-002 |
| Select | Employee fields; Manager StoreSwitcher/module selectors; Procurement; Access role selector | shared Select with phone 44px mode | UI2-002 |
| Card | Auth card, Employee panel/card, Manager card, Owner landing/ControlTower/Access/Procurement | shared Card surface/elevation hierarchy | UI2-002 |
| Panel | Employee page panels; Manager `.panel`; scheduling panels | shared Panel/Section primitive distinct from Card | UI2-002 |
| Table | Employee payroll/attendance; Manager staff/payroll/base; Owner Access/Procurement | shared responsive table shell + overflow policy | UI2-002 then role tasks |
| List | Employee timeline/history; Manager Swap/Give; Control Tower quality list | shared List/RecordRow pattern | UI2-002 |
| Tabs | Manager Workforce tabs; Procurement top tabs | shared Tabs with keyboard/focus states | UI2-002 |
| Badge / StatusBadge | Employee/Manager/Owner each define own pill colors | semantic StatusBadge contract | UI2-002 |
| Modal | Manager custom `.modal`; Procurement native `<dialog>`; Employee custom panels | shared Dialog on desktop, Drawer/full-height sheet option on phone | UI2-002 |
| Drawer | Employee app drawer; Manager shell V2/V3 drawers | shared drawer behavior/backdrop/focus/escape contract | UI2-004/005 |
| Toast | `02_CORE/shared/shared-core-v1.js` inline `sharedCoreToast` | preserve `C.ui.toast` API; move visuals into shared Toast component/class | UI2-002 |
| EmptyState | Employee schedule/attendance/payroll; Manager staff/payroll; Access/Procurement | shared EmptyState with optional CTA | UI2-002 |
| ErrorState | Auth messages; Employee engines; Manager module status boxes; Owner denied screens | shared ErrorState + retry/action slots | UI2-002 |
| Skeleton / Spinner | Auth spinner; Employee schedule skeleton; module “Đang tải…” boxes | shared Skeleton/Spinner/loading contract | UI2-002 |
| Topbar | Employee inline header; Manager base + V2/V3 injected header; ControlTower/Procurement topbars | shared authenticated Topbar slots | UI2-004/005 |
| Sidebar | Manager base/sidebar + compat drawers; Employee drawer | shared desktop Sidebar; Employee does not use it as phone primary nav | UI2-004/005 |
| PageHeader | Employee header page pill; Manager pageTitle/pageSub; Owner topbar headings | shared PageHeader title/subtitle/actions | UI2-004 |
| StoreSwitcher | `msdStore`; `mspStore`; `mgrPayrollStore`; Owner Workforce same canonical scheduling source | shared StoreSwitcher visual shell, same existing data source/authority | UI2-002/004 |
| ScheduleCell | Employee schedule day; Manager `msd-day` board columns | shared visual anatomy with role-specific interaction density | UI2-007/012 |
| ShiftCard | Employee `.shift`; Manager `msd-card`; Swap/Give records | shared shift identity/time/store/status/action structure | UI2-007/008/012 |
| EmployeeChip | Current employee names are plain text/select rows across schedule/staff/swap | shared compact EmployeeChip identity pattern | UI2-002 then Manager tasks |
| ActionQueue | Manager Today shortcut card + Swap/Give/Attendance queues; Owner Control Tower attention data | shared queue row/status/priority/action anatomy | UI2-011/014 |

---

## 6. Role shell and navigation migration map

### 6.1 Employee — phone primary

**Current:** sticky top header + hamburger drawer copied from desktop navigation; no canonical bottom navigation; route/view vocabulary is split between base app and consolidation scripts.

**Target phone shell:**
- bottom nav: **Hôm nay** → `dashboard`
- bottom nav: **Lịch** → `schedule`
- bottom nav: **Công** → `attendance`
- bottom nav: **Lương** → `payroll`
- bottom nav: **Tôi** → `profile`

Secondary actions under **Lịch**:
- Availability;
- Swap;
- Give.

Notifications remain a topbar/action-center affordance, not another primary tab.

Current `inventory` and `settings` functionality must not be deleted by UI2-005. They are not part of the locked five-item primary nav and therefore move to a secondary/overflow/profile destination unless a later contract assigns them differently.

### 6.2 Manager — operations first

Target Manager primary information architecture:
- Hôm nay / Action Center;
- Xếp lịch;
- Swap/Give review;
- Attendance review;
- Nhân viên;
- Công/Lương.

Current `tasks` and `settings` remain secondary operational/system destinations. Hidden KPI/Academy legacy routes are not promoted into the V2 primary shell by UI2-001.

Manager shell target:
- desktop/tablet Sidebar + Topbar;
- page-level PageHeader;
- explicit StoreSwitcher where store scope matters;
- ActionQueue anatomy for actionable exceptions;
- bounded phone drawer for monitoring/quick actions.

### 6.3 Owner — oversight first

Target Owner primary information architecture:
- Tổng quan;
- Cần chú ý;
- Workforce;
- Mua hàng;
- Tài chính when backed by a traced canonical runtime;
- Phân quyền;
- Cấu hình when backed by a traced canonical runtime.

Current `04_OWNER/index.html` disconnected card grid is a migration source, not the target shell.

Control Tower is the closest current source for Overview/Attention. Owner Workforce SHALL continue to reuse the canonical Manager scheduling writer/read truth. Procurement and Access become destinations inside the shared Owner shell without changing their domain authority.

---

## 7. Employee phone-risk matrix

| Risk | 360px | 390px | 430px | Evidence / migration requirement |
|---|---|---|---|---|
| No bottom navigation | HIGH | HIGH | HIGH | Current app uses hamburger/drawer. UI2-005 must implement locked 5-item bottom nav. |
| Safe-area handling | HIGH | HIGH | HIGH | Active Employee app and scheduling polish contain no `env(safe-area-inset-*)`; wrapper has `viewport-fit=cover` but no CSS safe-area consumption. |
| Primary touch target <44px | HIGH | HIGH | MEDIUM | Base fields are 40px; drawer close is 36px; schedule engine mobile shift actions are 38px before shared polish override; several ad-hoc buttons use padding only. |
| Horizontal overflow | MEDIUM | MEDIUM | MEDIUM | Payroll tables use nowrap inside overflow wrappers; legacy/base tables and week grids need page-level overflow verification. Schedule engine improves phone days to one column. |
| Nested iframe viewport/chrome | MEDIUM | MEDIUM | MEDIUM | Employee entry → runtime iframe → app iframe; outer layers use `overflow:hidden`. Bottom fixed UI must be proven against browser chrome. |
| Modal/drawer suitability | HIGH | HIGH | HIGH | Availability uses a custom open/close panel; app uses left drawer. There is no shared mobile Dialog/Drawer focus/safe-area contract. |
| Hover-only risk | LOW/MEDIUM | LOW/MEDIUM | LOW/MEDIUM | Employee nav has hover styling, but current actions are clickable. V2 must keep hover cosmetic only and expose all actions to touch/keyboard. |
| Focus consistency | HIGH | HIGH | HIGH | Base Employee primitives have no global focus-visible contract; schedule sub-surface does. |
| Dense schedule/shift controls | MEDIUM | MEDIUM | LOW/MEDIUM | Schedule engine has phone-specific single-column rendering, but current secondary actions and week controls must maintain 44px minimum and no clipping. |
| Error/loading/empty consistency | MEDIUM | MEDIUM | MEDIUM | States exist per engine but use separate styles/markup. Shared components required. |

**Employee acceptance invariant:** UI2-005 and subsequent Employee slices must treat 390px as the implementation reference and preserve explicit 360px/430px checks for the final Employee acceptance gate.

---

## 8. Manager and Owner responsive priorities / risks

### Manager

Canonical priority: 1440px → 1024px → tablet → phone monitoring/quick action.

Current findings:
- Manager base schedule is a seven-column board with minimum 170px columns.
- Current direct scheduling editor uses `min-width:1386px`, becoming `1594px` below 980px, intentionally contained in a horizontal board wrapper.
- Shell V2/V3 only introduces a major breakpoint at 760px, so there is no coherent 1024px shell-density contract yet.
- base Manager controls are commonly 40/42px; base shell has no focus styles.
- Manager V2/V3 uses JS-injected `!important` CSS over the base shell.
- custom Manager modal has no shared dialog/focus contract.

V2 target: preserve the dense board on desktop/tablet, explicitly contain board scrolling, reduce shell chrome at 1024px, and provide phone monitoring/bounded actions without forcing full seven-day authoring into phone width.

### Owner

Canonical priority: desktop → tablet → phone overview/attention.

Current findings:
- Owner landing is a 1080px card grid, not an oversight shell.
- Control Tower becomes one column below 760px and already models attention/data-quality concepts.
- Owner Workforce reuses the Manager board and therefore inherits its width/scroll behavior.
- Access has a table with `min-width:900px` in an overflow wrapper.
- Procurement has tables with `min-width:880px` and mobile full-screen dialog behavior, but uses its own token system.
- no unified Owner Topbar/Sidebar/PageHeader/StoreSwitcher contract exists across landing, Control Tower, Workforce, Procurement and Access.

V2 target: Overview/Attention first, explicit cross-store context, consistent drill-down, and responsive bounded actions; no Owner-only parallel Workforce writer.

---

## 9. Exact candidate-file map by next implementation task

This is a migration candidate map, not authorization to modify these files in UI2-001.

### UI2-002 — shared tokens + foundational primitives

**Proposed new shared targets**
- `02_CORE/ui/magasin-ui-v2-tokens.css`
- `02_CORE/ui/magasin-ui-v2-primitives.css`
- `02_CORE/ui/magasin-ui-v2-components.js`

**Current sources to migrate/consume**
- `02_CORE/shared/shared-core-v1.js` — preserve `C.ui.toast` API, migrate Toast presentation.
- `02_CORE/ui/workforce-scheduling-polish-v1.css`
- `03_PLATFORM/01_AUTH/index.html`
- `06_EMPLOYEE/app/employee-v40.html`
- `05_MANAGER/runtime/manager-shell-v1.html`
- `04_OWNER/ControlTower/control-tower-v1.css`
- `04_OWNER/Access/index.html`
- `04_OWNER/Procurement/procurement-v2.css`

UI2-002 must not refactor domain engines merely to consume tokens if doing so exceeds a bounded presentation-only change.

### UI2-003 — Login/register/recovery/reset

Candidate files:
- `03_PLATFORM/01_AUTH/index.html`
- `03_PLATFORM/01_AUTH/pending-access.html`
- `03_PLATFORM/01_AUTH/auth-runtime-v2.js` only for presentation-state hooks if required; role routing semantics must remain byte-for-byte equivalent in outcome.
- shared UI2-002 token/primitives targets.

### UI2-004 — shared authenticated shell + role-aware navigation

Candidate files:
- proposed `02_CORE/ui/magasin-ui-v2-shell.css`
- proposed `02_CORE/ui/magasin-ui-v2-shell.js`
- `05_MANAGER/runtime/manager-shell-v1.html`
- `05_MANAGER/runtime/compat/ui/manager-ui-shell-v2.js`
- `05_MANAGER/runtime/compat/ui/manager-ui-shell-v3.js`
- `05_MANAGER/runtime/compat/ui/manager-ui-header-fix-v1.js`
- `05_MANAGER/runtime/compat/ui/manager-ui-source-header-suppress-v1.js`
- `05_MANAGER/runtime/compat/ui/manager-drawer-fix.css`
- `05_MANAGER/runtime/compat/router/manager-route-state-v2.js` only if DOM integration requires it; no routing semantic change by default.
- `04_OWNER/index.html`
- `04_OWNER/ControlTower/index.html`
- `04_OWNER/ControlTower/control-tower-v1.css`
- `04_OWNER/Workforce/runtime/owner-workforce-runtime.html`
- `04_OWNER/Access/owner-access-nav-v1.js`
- `04_OWNER/Access/index.html`
- `04_OWNER/Procurement/index.html`
- `04_OWNER/Procurement/procurement-v2.css`
- `nhap-hang/index.html` is a friendly-route compatibility wrapper and should be changed only if required to host the shared shell without changing its routing behavior.

### UI2-005 — Employee mobile shell + bottom navigation

Candidate files:
- `06_EMPLOYEE/index.html`
- `06_EMPLOYEE/runtime/employee-runtime-v1.html`
- `06_EMPLOYEE/app/employee-v40.html`
- `06_EMPLOYEE/workforce-ui-consolidation-v1.js`
- `02_CORE/ui/workforce-scheduling-polish-v1.css`
- UI2-002 shared token/primitives targets
- UI2-004 shared shell targets where Employee consumes common Topbar/Drawer/PageHeader behavior.

No Employee domain engine should be changed in UI2-005 unless the change is a presentation hook strictly required for the shell.

---

## 10. Later-slice source impact map

| Task | Presentation source files expected to be touched |
|---|---|
| UI2-006 Employee Today | `06_EMPLOYEE/app/employee-v40.html`; `06_EMPLOYEE/dashboard/engine-v1.js`; `06_EMPLOYEE/notification/engine-v1.js` |
| UI2-007 Employee Schedule | `06_EMPLOYEE/app/employee-v40.html`; `06_EMPLOYEE/schedule/engine-v1.js`; `02_CORE/ui/workforce-scheduling-polish-v1.css` |
| UI2-008 Availability + Swap/Give | `06_EMPLOYEE/availability/engine-v1.js`; `06_EMPLOYEE/swap/engine-v1.js`; schedule presentation hooks where actions originate |
| UI2-009 Attendance + Payroll + Profile | `06_EMPLOYEE/attendance/engine-v1.js`; `06_EMPLOYEE/payroll/engine-v1.js`; `06_EMPLOYEE/profile/engine-v1.js`; base app containers |
| UI2-011 Manager shell + Action Center | `05_MANAGER/runtime/manager-shell-v1.html`; Manager shell compat files; `05_MANAGER/Workforce/ui-consolidation-v1.js` |
| UI2-012 Manager scheduling | `05_MANAGER/Workforce/review-v1.js`; `draft-publish-v1.js`; `official-v1.js`; `02_CORE/ui/workforce-scheduling-polish-v1.css` |
| UI2-013 Manager operational modules | `05_MANAGER/Workforce/swap-approval-v1.js`; `attendance-review-v1.js`; `staff-projection-v1.js`; `payroll-self-check-v1.js`; `ui-consolidation-v1.js` |
| UI2-014 Owner Overview + Attention | `04_OWNER/index.html`; `04_OWNER/ControlTower/index.html`; `control-tower-v1.css`; `control-tower-v1.js` |
| UI2-015 Owner module integration | `04_OWNER/Workforce/index.html`; `04_OWNER/Workforce/runtime/owner-workforce-runtime.html`; `04_OWNER/Access/index.html`; `owner-access-nav-v1.js`; `04_OWNER/Procurement/index.html`; `procurement-v2.css`; `nhap-hang/index.html` only as needed for shell integration |

These are presentation migration candidates. Existing RPC/domain code remains authoritative and is not implicitly in scope.

---

## 11. App-shell target contract

The shared authenticated shell SHALL provide:
- common brand identity;
- common Topbar;
- common PageHeader;
- desktop/tablet Sidebar primitive;
- phone Drawer primitive;
- role-aware navigation configuration;
- user/account slot;
- notification slot;
- StoreSwitcher slot where the role/view has canonical store scope;
- content-width and page-padding primitives;
- consistent focus/keyboard behavior;
- safe-area variables;
- loading/error shell states.

Role-specific composition:
- Employee: Topbar + five-item bottom nav; drawer/overflow only for secondary destinations.
- Manager: Topbar + desktop/tablet Sidebar; phone Drawer.
- Owner: Topbar + oversight Sidebar; phone Drawer/attention-first overview.

The shell SHALL NOT contain or duplicate business-state machines.

---

## 12. Audit conclusions / locked migration decisions

1. Keep the current HTML/JS architecture; no framework migration is justified by this audit.
2. Build one shared token/primitives layer before role redesign.
3. Do not use current Auth, Employee, Manager, Owner local palettes as separate future design systems.
4. Employee bottom navigation is a hard target and is not satisfied by the current drawer.
5. Manager V2/V3 injected shell stacking should converge toward one shared shell rather than another compatibility layer.
6. Owner Control Tower concepts become the basis for Overview/Attention; the current Owner landing-card grid is not the V2 target.
7. Owner Workforce must continue using the same canonical scheduling truth as Manager.
8. Current legacy/direct Manager wrappers are compatibility risks and must not be promoted as canonical design sources.
9. No dedicated current Owner Finance route was traced; do not invent one during presentation migration.
10. `C.ui.toast` is an existing shared behavior API worth preserving while migrating its styling to the shared component layer.
11. Employee safe-area/focus/touch-target work is required before mobile shell acceptance.
12. Every later UI slice must keep exact business/domain regression boundaries from the P0 plan.

---

## 13. UI2-001 safety statement

```text
UI2_001_AUDIT_BASE_MAIN_SHA=51da75b1351541894ec910e13fc20112970638e6
RUNTIME_CODE_CHANGED=FALSE
APP_HTML_CSS_JS_CHANGED=FALSE
TESTS_CHANGED=FALSE
WORKFLOWS_CHANGED=FALSE
RPC_RLS_BUSINESS_LOGIC_CHANGED=FALSE
AUTH_ROLE_ROUTING_CHANGED=FALSE
UI_IMPLEMENTATION_STARTED=FALSE
UI2_002_STARTED=FALSE
```

UI2-001 ends with this audit/migration contract. Implementation begins only after Brain accepts this task and explicitly dispatches the next task.

# MAGASIN UI/UX V2 — SOURCE OF TRUTH

**Status:** OWNER APPROVED / ARCHITECTURE LOCKED  
**Effective date:** 2026-09-25  
**Architecture id:** `MAGASIN_OPERATIONS_UI_V2`  
**Scope:** Login → Employee → Manager → Owner presentation and interaction layer  
**Canonical implementation rule:** Preserve existing business logic, server authority, RPC contracts, RLS, canonical data models, and accepted Workforce behavior unless a later Owner-approved contract explicitly changes them.

---

## 1. Product decision

MAGASIN UI/UX V2 SHALL behave as one coherent operations product after login, not as separate visually unrelated websites for each role.

Canonical flow:

```text
MAGASIN LOGIN
    ↓
AUTH + ROLE RESOLUTION
    ↓
┌────────────┬────────────┬────────────┐
│ EMPLOYEE   │ MANAGER    │ OWNER      │
│ mobile     │ operations │ oversight  │
│ primary    │ workspace  │ workspace  │
└────────────┴────────────┴────────────┘
```

All roles share one design language, component vocabulary, typography, spacing system, status semantics, loading/error states, and interaction conventions.

Role differences are intentional information architecture differences, not separate design systems.

---

## 2. Non-negotiable constraints

### 2.1 Employee is 100% phone-primary

Owner confirms that employees use the webapp on phones as their primary device.

Therefore:

- Employee UX is **mobile-first, not merely responsive**.
- Employee acceptance starts at phone widths before desktop.
- Required reference widths: **360px, 390px, 430px**; 768px is the tablet expansion reference.
- No Employee core flow may require desktop to complete.
- No horizontal page overflow is allowed on Employee core flows.
- Primary touch targets SHALL be at least **44×44 CSS px**.
- Bottom navigation SHALL be preferred for primary Employee destinations.
- Core actions SHALL be reachable without precision pointer interactions, hover-only controls, or dense desktop tables.
- Important content must remain legible under one-handed phone use and normal browser zoom.
- Employee pages SHALL account for mobile safe areas and browser chrome.
- Loading, offline/network failure, empty, stale, and retry states must be understandable on phone.

### 2.2 Preserve accepted operating truth

UI V2 is a presentation-layer redesign.

By default it SHALL NOT:

- replace or fork canonical Workforce business logic;
- create parallel scheduling truth;
- bypass server authority;
- add protected browser table DML;
- weaken role/store scope;
- change accepted RPC semantics;
- change RLS merely to make the UI easier;
- duplicate Manager/Owner scheduling engines;
- break existing Employee/Manager/Owner synchronization.

Existing accepted canonical behavior remains authoritative.

### 2.3 No framework rewrite by default

A visual redesign is not justification for a framework migration.

Default implementation strategy:

- retain the current HTML/JavaScript delivery model where practical;
- introduce shared design tokens, shared shell primitives, and reusable UI components;
- use Tailwind-style utility discipline and Shadcn-inspired visual language where helpful;
- do not migrate the product to React solely for appearance.

Any future framework migration requires a separate Owner-approved architecture decision.

---

## 3. Visual direction

Canonical direction: **Quiet Professional Operations Software**.

Reference influences are conceptual, not mandatory runtime dependencies:

1. **Shadcn Admin visual language**
   - clean hierarchy;
   - restrained surfaces;
   - professional forms, navigation, dialog/drawer patterns;
   - accessible interaction states.

2. **TailAdmin layout/component discipline**
   - predictable dashboard shell;
   - consistent tables, cards, forms, charts, auth, profile patterns;
   - useful reference for HTML/Tailwind-compatible implementation.

3. **Twenty-style Owner information architecture**
   - dense information without visual noise;
   - strong record/list/detail hierarchy;
   - attention-first enterprise oversight.

MAGASIN SHALL NOT visually clone any one reference product. It owns one coherent design system.

---

## 4. Shared MAGASIN design system

### 4.1 Brand and neutral palette

Primary:
- `#0F8F9C`
- dark: `#08747F`

Neutral reference:
- 950 `#101828`
- 700 `#344054`
- 500 `#667085`
- 300 `#D0D5DD`
- 200 `#EAECF0`
- 100 `#F2F4F7`
- 50 `#F9FAFB`

Semantic colors are reserved for meaning:
- success = green;
- warning = amber;
- danger = red;
- information = blue.

Do not assign unrelated bright colors to modules solely for decoration.

### 4.2 Typography

Default UI family: **Inter** with system fallbacks.

Reference scale:
- page title: 28/32 semibold;
- section title: 18/26 semibold;
- body: 14/20;
- small: 12/18;
- button/interactive label: 14 semibold.

### 4.3 Shared component vocabulary

At minimum:

- Button / IconButton
- Input / Select / Search
- DatePicker / TimePicker
- Card / Panel
- Table / List
- Tabs
- Badge / StatusBadge
- Avatar
- Modal / Drawer / Popover / Tooltip
- Toast / Alert
- EmptyState / ErrorState / Skeleton / Spinner
- Topbar / Sidebar / PageHeader / Breadcrumb
- StoreSwitcher
- ScheduleCell / ShiftCard / EmployeeChip
- ActionQueue

Role pages must reuse these primitives rather than creating independent ad-hoc CSS systems.

---

## 5. Login architecture

Login is the single product entry.

Requirements:

- one MAGASIN identity;
- user signs in once;
- role is resolved from authenticated truth;
- user is routed to the correct workspace automatically;
- do not ask users to manually choose Employee / Manager / Owner when system authority already knows the role;
- login, register, password recovery, reset, pending/error states use the same MAGASIN design language.

Desktop may use a split-brand/login composition. Mobile prioritizes the auth form with minimal decorative content.

---

## 6. Employee workspace — MOBILE FIRST

Employee is not a reduced admin dashboard.

Primary questions the UI must answer quickly:

1. What shift do I work today?
2. What is my schedule this week?
3. When am I available next week?
4. Do I need to swap/give a shift?
5. What attendance/work-time/pay information do I need to review?

### 6.1 Primary navigation

Phone primary navigation:

- **Hôm nay**
- **Lịch**
- **Công**
- **Lương**
- **Tôi**

Schedule-related secondary actions live under **Lịch**:
- weekly schedule;
- next-week availability;
- Swap;
- Give.

Do not create a crowded primary nav for every primitive.

### 6.2 Employee home

Priority order:

1. next/current shift;
2. required actions;
3. week-at-a-glance;
4. attendance/pay notices;
5. recent status.

The home screen should be useful in a few seconds with one hand.

### 6.3 Employee mobile acceptance

Every Employee core flow must be proven at phone viewport before acceptance:

- 360px;
- 390px;
- 430px.

Required:
- zero page-level horizontal overflow;
- no clipped primary CTA;
- no hover-only functionality;
- 44px minimum touch target for primary controls;
- visible focus states;
- readable validation/error messages;
- modal behavior converted to mobile-safe dialog/drawer where needed;
- week/schedule content must adapt without forcing unusable desktop tables;
- browser back/reload must not create stale UI truth.

Desktop Employee UI is an expansion of the mobile experience, not a separate architecture.

---

## 7. Manager workspace — OPERATIONS

Manager home is an **Action Center**, not a decorative KPI dashboard.

Primary areas:

- Hôm nay / việc cần xử lý
- Xếp lịch
- Swap/Give review
- Attendance review
- Nhân viên
- Công/Lương

Manager scheduling should emphasize a weekly operational board with rapid edit/review/publish, using canonical scheduling authority already implemented.

Desktop/tablet are preferred for complex scheduling. Phone must remain functional for monitoring and bounded quick actions, but full dense schedule authoring is not required to be phone-optimal if a safer mobile interaction is provided.

---

## 8. Owner workspace — OVERSIGHT

Owner is not “Manager with more permissions.”

Owner workspace is an enterprise oversight and exception surface.

Primary areas:

- Tổng quan
- Cần chú ý
- Workforce
- Mua hàng
- Tài chính
- Phân quyền
- Cấu hình

Owner landing page SHALL answer:

> What needs Owner attention now?

Owner should see cross-store state, data-quality/exception signals, and drill-down paths. Existing Manager daily authority remains unchanged unless a separate contract says otherwise.

Desktop/tablet are the primary high-density experience. Phone must support overview, attention review, and bounded actions responsively.

---

## 9. Responsive strategy

### Employee
Priority:
1. 390px phone reference;
2. 360px lower bound verification;
3. 430px large phone;
4. tablet;
5. desktop.

### Manager
Priority:
1. 1440px;
2. 1024px;
3. tablet;
4. phone monitoring/quick action.

### Owner
Priority:
1. desktop;
2. tablet;
3. phone overview/attention review.

Responsive does not mean identical layout at every breakpoint. Information priority may change while business truth remains identical.

---

## 10. Implementation sequence

These are architecture phases, not automatically dispatched Robot tasks. Brain must split them into bounded implementation tasks.

### UI-01 — Design System
- tokens;
- typography;
- spacing;
- controls;
- surfaces;
- status semantics;
- shared responsive primitives.

### UI-02 — Login + Global Shell
- auth visual redesign;
- shared shell;
- role-aware navigation;
- topbar/user/notification patterns;
- responsive shell behavior.

### UI-03 — Employee App
- Today;
- Schedule;
- Availability;
- Swap/Give;
- Attendance;
- Payroll;
- Profile;
- phone-first acceptance.

### UI-04 — Manager App
- Action Center;
- schedule board;
- review queues;
- attendance;
- employees;
- payroll/self-check presentation.

### UI-05 — Owner App
- overview;
- Attention Center;
- Workforce;
- procurement;
- finance;
- access/settings presentation.

---

## 11. Definition of Done for UI V2 work

A UI V2 implementation slice is not DONE solely because it “looks better.”

It must prove, where applicable:

1. correct canonical data and server authority remain unchanged;
2. role/store access remains correct;
3. accepted business-flow regression stays green;
4. Employee phone widths are explicitly tested when Employee surfaces change;
5. no unexpected horizontal overflow;
6. keyboard/focus/basic accessibility states exist;
7. loading/empty/error/retry states are intentional;
8. reload/back navigation does not present stale canonical state;
9. screenshots or browser evidence demonstrate the target breakpoint(s);
10. no new parallel UI writer or alternate business truth was introduced.

---

## 12. Explicit DO NOT list

Do not:

- perform a wholesale React rewrite as part of UI polish;
- mix multiple unrelated visual systems;
- create role-specific design tokens without a justified semantic need;
- make Employee desktop-first;
- use emoji as production navigation icons;
- overload screens with decorative KPI cards;
- make Owner choose modules from a disconnected landing-card grid as the final V2 architecture;
- make Manager scheduling depend on long per-employee forms when a safer schedule-board interaction is possible;
- rewrite accepted Workforce backend logic during presentation redesign;
- bypass existing regression gates.

---

## 13. Source-of-truth precedence and execution gate

This document is the canonical UI/UX V2 architecture decision for presentation and interaction.

It does not supersede canonical business/domain contracts for Workforce, Finance, Procurement, Auth, RLS, or data authority.

Where presentation preference conflicts with a domain safety/authority contract, the domain contract wins unless Owner explicitly approves a new architecture change.

**Execution sequencing:** this architecture is Owner-approved and staged. It does not implicitly skip an already active Brain gate/task. UI V2 implementation begins only when the current active task is formally closed/accepted and Brain dispatches the first dependency-correct UI implementation task.

---

## 14. Locked Owner decisions

As of 2026-09-25:

- MAGASIN UI/UX V2 architecture is approved.
- Employee is 100% phone-primary in real use.
- Employee mobile optimization is a hard product requirement.
- One coherent MAGASIN design system is required across Login, Employee, Manager, Owner.
- Business logic/backend rewrite is not part of this UI decision.
- Current HTML/JS architecture may be retained; framework migration is not required.

# MAGASIN — Workforce Scheduling UX V2 — DESIGN LOCK

**Track:** WORKFORCE_SCHEDULING_UX_V2  
**Design task:** SCHED-UI-000  
**Owner approval date:** 2026-10-02  
**Status:** APPROVED / LOCKED  
**Scope:** Manager + Employee + Owner scheduling experience and canonical route presentation

## 1. Owner approval

The Owner reviewed the current live Scheduling UI, the repository implementation, and the proposed UX redesign.

Owner decision:

> Chốt thiết kế UX theo phương án đã đề xuất. Lập kế hoạch để robot triển khai liên tục; các Owner-only approval points phải được dời về cuối dự án thay vì chặn chuỗi kỹ thuật giữa chừng.

This file is the durable design authority for SCHED-UI-001 and later implementation tasks.

## 2. Global UX principle

Scheduling must answer three questions immediately:

1. Tôi đang ở đâu?
2. Còn thiếu điều gì?
3. Tôi phải làm gì tiếp theo?

The UI must prioritize the next user action over implementation/system status.

Rules:

- one screen = one dominant goal;
- one workflow = one visible step model;
- one state = one Vietnamese user-facing label;
- technical architecture language is not user-facing copy;
- colors must have stable meaning;
- mobile is a deliberate layout, not a compressed desktop table;
- repeated business configuration is separated from weekly operational work.

## 3. Manager information architecture

The Manager scheduling area is divided into two conceptual areas.

### A. Lập lịch tuần

This is the normal recurring operational workflow and the default Manager scheduling experience.

Visible workflow:

1. Chuẩn bị
2. Tạo lịch nháp
3. Chỉnh lịch
4. Kiểm tra
5. Duyệt & phát hành

The underlying scheduling authority may still use separate DRAFT / validation / REVIEWED / PUBLISHED states. The UI groups them into the human workflow above without changing business semantics.

At every state, show exactly one primary next action.

Examples:

- missing prerequisites → `Hoàn tất thiết lập`;
- ready → `Tạo lịch nháp tự động`;
- draft exists → `Kiểm tra lịch`;
- conflicts exist → `Xem và xử lý xung đột`;
- valid draft → `Duyệt lịch`;
- reviewed → `Phát hành lịch`.

Secondary actions such as reload, reopen draft, or detailed status must not compete visually with the primary action.

### B. Thiết lập xếp lịch

Contains configuration that is not expected to be re-entered every week:

- ưu tiên cửa hàng của nhân viên;
- nhu cầu nhân sự cố định hàng tuần.

This area is not the main weekly scheduling screen.

Normal weekly use should not require the Manager to read or edit recurring configuration unless something changed or a prerequisite is missing.

## 4. Recurring staffing design

### View mode

Keep the weekly store × weekday overview because it is valuable for scanning.

Each configured time block is rendered as a compact readable chip/card:

`05:00–08:00 · 1 người`

Do not render editable controls directly inside a narrow 140px day cell.

Multiple blocks stack vertically with consistent spacing.

### Edit mode

Selecting a store/day opens a dedicated editing surface.

Desktop:

- side drawer / detail panel with enough width for full fields.

Mobile:

- full-width sheet/panel; no forced 7-column editing table.

Each row contains clear labels and full values:

- Bắt đầu
- Kết thúc
- Số người
- Xóa

Actions:

- `+ Thêm khung`
- `Hủy thay đổi`
- `Lưu nhu cầu`

Existing stability requirements remain:

- adding a block must not reset existing values;
- new block start/end remain blank until selected;
- no historic empty → 05:00 regression;
- save/reload/week reuse remains stable.

## 5. Time-band contract

The Owner approves this shared visual classification:

- `05:00 <= start < 12:00` → Morning / **Vàng**
- `12:00 <= start < 17:00` → Afternoon / **Đỏ nhạt**
- `17:00 <= start <= 22:00` → Evening / **Xanh dương nhạt**
- empty / invalid / outside approved presentation range → **Neutral**

Canonical colors remain:

- morning background `#FFF4CC`;
- afternoon background `#FDE7E7`;
- evening background `#E8F3FF`.

Important:

- Employee registration may default a new interval to `06:00–12:00`;
- that default does **not** redefine the shared color boundary;
- a real shift starting at 05:00 is still Morning / yellow.

Implementation rule:

Create/use one shared time-band classifier where practical.

Manager, Employee and Owner must not keep divergent local boundary logic.

Color never replaces readable time text.

## 6. Employee schedule hierarchy

When next-week availability registration is open, the first important scheduling action on the Employee schedule screen is a prominent registration card/banner.

The card shows:

- `Đăng ký thời gian có thể làm tuần sau`;
- exact target week;
- registration status;
- number/summary of saved intervals where available;
- one clear CTA.

CTA states:

- no saved intervals → `Đăng ký ngay`;
- saved intervals → `Xem / sửa đăng ký`;
- registration closed → `Xem thời gian đã đăng ký`.

Remove the concept/copy that labels this as a secondary action.

The Employee screen hierarchy becomes:

1. việc cần làm / availability registration;
2. lịch làm chính thức;
3. expanded registration editor/details when opened.

Terminology must remain explicit:

- `Thời gian có thể làm` = employee input;
- `Lịch làm chính thức` = Manager-published schedule.

Do not call availability itself “lịch làm chính thức”.

## 7. Employee availability editor

The editor keeps the current immediate-save business behavior.

Therefore:

- pressing `Đăng ký` saves that interval;
- there is no fake final-submit step;
- remove/relabel the current `Xong` behavior so users do not think data is only committed at the end;
- `Đóng` is sufficient after saved state is clear.

Weekly saved intervals use the same time-band color contract.

The UI must expose:

- day;
- full start time;
- full end time;
- saved state;
- delete action when allowed;
- read-only state when registration is closed.

## 8. Auto Schedule guided workflow

Remove the current effect where multiple independent progress/status systems compete on the same screen.

There is one primary workflow model.

### Status presentation

Use one “Việc cần làm tiếp theo” block.

Examples:

#### Not ready

**Chưa thể tạo lịch**

`CN2, CN3, CN4 chưa có nhu cầu nhân sự.`

Primary CTA:

`Hoàn tất nhu cầu nhân sự`

#### Ready

**Sẵn sàng xếp lịch tuần 05/10–11/10**

Supporting facts are concise:

`4/4 cửa hàng đã có nhu cầu · thời gian nhân viên đã được tải`

Primary CTA:

`Tạo lịch nháp tự động`

#### Draft

**Lịch nháp đã sẵn sàng**

Primary CTA:

`Kiểm tra lịch`

#### Conflict

**Lịch còn xung đột cần xử lý**

Primary CTA:

`Xem và xử lý xung đột`

#### Reviewed

**Lịch đã duyệt, sẵn sàng phát hành**

Primary CTA:

`Phát hành lịch`

Summary counts may remain as small supporting metadata but not as equal-weight competing cards.

## 9. Owner scheduling design

Owner uses the same canonical scheduling truth and shared components as Manager.

Do not build a second Owner scheduling writer.

Owner entry experience:

### Overview first

Show one cross-store overview for CN1–CN4.

Each store card/row should answer:

- recurring staffing ready?
- availability ready?
- draft exists?
- conflicts?
- reviewed?
- published?

The Owner can identify which store needs attention without opening each one.

### Drill-down second

Selecting a store opens the same scheduling concepts/components used by Manager, adapted for Owner scope.

Owner may have broader oversight and intervention rights, but shared concepts must look and mean the same.

## 10. Owner language cleanup

Remove developer/system language from Owner-facing UI.

Do not show normal users terms such as:

- Enterprise oversight;
- canonical;
- canonical writer;
- One canonical writer;
- No direct table DML;
- Availability as an untranslated technical noun;
- DRAFT / Validate / Review / Publish as implementation-state labels.

Use Vietnamese user language, e.g.:

- `Xếp lịch toàn hệ thống`;
- `Theo dõi và xử lý lịch của các cửa hàng`;
- `Thời gian có thể làm`;
- `Lịch nháp`;
- `Kiểm tra`;
- `Đã duyệt`;
- `Đã phát hành`.

Technical status may remain in code, logs, tests and developer evidence.

## 11. Canonical route design

The Owner approves clean visible role routes.

### Canonical role roots

- `/manager/`
- `/employee/`
- `/owner/`

### Canonical scheduling/deep routes

Manager:

- `/manager/scheduling/`
- `/manager/schedule/`

Employee:

- `/employee/schedule/`
- `/employee/attendance/`
- `/employee/payroll/`

Owner:

- `/owner/scheduling/`

The repository may keep numbered internal implementation folders:

- `04_OWNER`;
- `05_MANAGER`;
- `06_EMPLOYEE`.

They are implementation details and must not remain the preferred visible browser route.

During cutover:

- old numbered routes remain compatibility entrypoints/redirects;
- Auth routes to canonical role roots;
- internal navigation uses canonical URLs;
- direct-link / reload / back / forward must work;
- no redirect loops;
- authorization remains fail-closed.

## 12. Responsive behavior

### Desktop

Use the available content width.

Wide scheduling boards may use internal horizontal scrolling only where the information architecture genuinely requires it.

### Tablet

Preserve readable controls and one clear action hierarchy.

### Mobile

Do not shrink the 7-day desktop grid until controls become unreadable.

Recurring staffing becomes store/day accordion/cards or a day-focused editor.

Scheduling draft may become day cards/stacked shifts.

All primary controls must be at least 44px touch-friendly.

No page-level horizontal overflow.

## 13. Accessibility and interaction rules

- color is never the only status signal;
- full time text remains visible;
- focus-visible states remain;
- keyboard navigation works for controls;
- disabled primary actions explain the blocking reason;
- loading, empty, error and success states are explicit;
- destructive actions use clear labels/confirmation where needed;
- repeated actions must be idempotent where the existing business flow requires it.

## 14. Production delivery

All implementation happens off `main`.

Before production:

- integrated Preview/Staging;
- cross-role browser QA;
- Owner checks the real Preview;
- exact RC SHA frozen;
- rollback SHA recorded;
- normal release at 00:00 Asia/Ho_Chi_Minh;
- production smoke after deploy.

Authority:

`PRODUCTION_RELEASE_GOVERNANCE_V1_SOURCE_OF_TRUTH.md`

## 15. Owner-dependent work placement

The implementation plan must not stop midway for ordinary visual choices already resolved by this design lock.

If a new non-critical Owner preference is discovered:

- record it in the TEMP SOT deferred Owner queue;
- continue all independent technical tasks;
- present the deferred queue near final Preview acceptance.

Only security, data-integrity, business-authority or logically impossible implementation ambiguity may block an earlier technical task.

## 16. Design lock result

SCHED-UI-000 acceptance:

- recurring staffing view/edit model locked;
- single guided scheduling workflow locked;
- 05:00 morning boundary locked;
- Employee availability prominence locked;
- Employee immediate-save UX locked;
- canonical URLs locked;
- Owner overview/drill-down model locked;
- technical-language cleanup locked;
- responsive principles locked;
- production delivery boundary preserved.

**SCHED-UI-000 = DONE / OWNER APPROVED.**

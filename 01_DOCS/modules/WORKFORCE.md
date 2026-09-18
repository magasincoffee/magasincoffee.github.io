# Workforce

Workforce là **một business capability dùng chung**, không phải một hệ thống riêng của từng role.

Canonical schedule chain được định nghĩa tại:

- `01_DOCS/MAGASIN/05_SYSTEM/SCHEDULE_FIRST_CANONICAL_FLOW_V1.md`
- `02_CORE/contracts/schedule-first-flow.v1.json`

## Role ownership

- **Employee:** khai báo availability, xem lịch chính thức, attendance, shift-change.
- **Manager:** **daily scheduling owner** — review/edit availability, demand, allocation, Robot proposal, review và publish.
- **Owner:** policy / exception / attention; không vận hành lịch hằng ngày như một scheduler thứ hai.
- **Robot:** tạo proposal/DRAFT trong rule đã được xác minh; không tự review/publish.

## Canonical server data

```text
employee_availability
→ staffing_requirements
→ schedule_generation_runs
→ schedule_generation_assignments
→ work_schedules
→ shift_swaps / attendance
```

Role UI chỉ project/call capability qua permissioned RPC; không sở hữu business truth riêng.

## Demand

Purpose: xác định số người thực sự cần cho từng cửa hàng, ngày và khoảng giờ.

UI hiện dùng một số lượng `Số lượng: X người`. Các semantics minimum/target/maximum hiện hữu phải được giữ cho đến khi business rule khác được Owner phê duyệt.

## Review

Purpose: Manager review đăng ký nhân viên theo cửa hàng/tuần, chỉnh trong permission boundary và xử lý hỗ trợ chéo chi nhánh.

Browser direct-write vào business table không phải canonical khi RPC tương ứng đã tồn tại.

## Proposal / allocation / publish

Canonical flow:

```text
Robot DRAFT
→ Manager adjust
→ validate
→ Manager review
→ Manager publish
→ work_schedules APPROVED
```

Robot không auto-publish.

## Current color rule

Colors biểu diễn phân loại ca theo thời gian, không phải availability status:

- `05:00–11:59` — Sáng — yellow
- `12:00–16:59` — Trưa/chiều — red/pink
- `17:00–23:59` — Tối — cyan/teal

Rule dùng `MAGASIN_CORE.time.shiftKind`.

## Transitional implementation note

`04_OWNER/Workforce/**` và `05_MANAGER/runtime/compat/workforce/**` hiện chứa implementation/reference lịch sử. TASK-031 sẽ consolidate daily scheduling ownership vào Manager sau khi regression/E2E xanh. Không tạo thêm một implementation song song trong thời gian chuyển tiếp.

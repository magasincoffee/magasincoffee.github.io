# TASK-030 — Employee Weekly Availability Canonical Slice

**Phase:** P1_SCHEDULE_FIRST_CORE_FLOW  
**Date:** 2026-09-18  
**Status:** VERIFIED / DONE

## QUESTION

Employee cần làm gì để đẩy critical path sang Manager scheduling?

1. mở đăng ký tuần kế tiếp;
2. thêm một hoặc nhiều khoảng availability;
3. thấy ngay state đã lưu;
4. sửa sai tối thiểu bằng cách xóa khoảng đã lưu;
5. mọi write đi qua canonical Employee availability RPC.

Không mở thêm policy về ưu tiên ca, “Cả Ngày”, giới hạn giờ hoặc approval.

## DELETE

- Không tạo availability engine thứ hai.
- Không đưa RPC logic vào `employee-v40.html`.
- Không dùng `99_LEGACY/**`.
- Không direct-write bảng từ browser.
- Không đổi schedule/publish/attendance trong task này.

## SIMPLIFY

Canonical projection:

- `06_EMPLOYEE/availability/engine-v1.js`

UI shell:

- `06_EMPLOYEE/app/employee-v40.html` — markup + delegate shims only.

Runtime:

- `06_EMPLOYEE/runtime/employee-runtime-v1.html` — load canonical engine exactly once.

Server boundary:

- `get_my_availability`
- `save_my_availability`
- `delete_my_availability`

## ACCELERATE

Regression bắt buộc:

- single canonical owner;
- shell không chứa availability RPC logic;
- save một khoảng;
- save nhiều khoảng cùng ngày;
- immediate saved-state visibility;
- delete một khoảng;
- immediate refresh sau delete;
- no direct table access;
- existing People/Shift E2E vẫn xanh.

## AUTOMATE

Không thêm automation mới. Employee action vẫn explicit.

## Change

Thêm nút `Xóa` vào từng khoảng availability đã lưu. Delete gọi `delete_my_availability`, yêu cầu xác nhận, sau đó reload canonical state.

## Definition of Done

- canonical ownership test PASS;
- browser regression PASS;
- existing People/Shift regression + Day-10 E2E PASS;
- no production schema/data/backfill/permission mutation;
- source-of-truth có thể chuyển sang TASK-031.

## Verification

- People Shift Day-10 Tests run `35334004755`: **PASS**.
- Canonical availability browser regression: PASS.
- Existing People/Shift Day-10 E2E: PASS.
- Existing Control Tower browser regression: PASS.
- Production mutation outside normal Employee availability RPC calls: none.

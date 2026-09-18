# MAGASIN — Kế hoạch hoàn thiện Lịch làm V1

**Task:** TASK-027  
**Ngày:** 2026-09-18  
**Trạng thái:** APPROVED BY OWNER / SCHEDULE PRIORITY  
**Decision:** DEC-003

## 1. Quyết định ưu tiên

Owner quyết định **chưa triển khai phần Công việc / SOP / Task ở giai đoạn hiện tại**. Các quyết định DST-001..DST-006 vẫn chưa được chọn và không được tự suy diễn.

Ưu tiên mới là hoàn thiện domain **People / Shift / Schedule / Attendance** dựa trên:

- thực tế vận hành hiện tại;
- hai bảng tính vận hành `Lịch Đk Tuần` và `Lịch làm hàng tuần`;
- Workforce/Employee engines hiện hữu trong repository;
- live Supabase RPC surface đã được kiểm tra chỉ đọc ngày 2026-09-18.

TASK-026 được giữ nguyên như một decision pack chưa giải quyết và chuyển sang **DEFERRED_BY_OWNER**. Không mở write-capable SOP/Task workflow cho đến khi Owner quay lại scope đó.

## 2. Evidence từ hai bảng tính

Chỉ ghi nhận cấu trúc/quy tắc vận hành; **không commit dữ liệu nhân viên thật vào repository public**.

### Lịch Đk Tuần

Cấu trúc hiện hành cho thấy:

- đăng ký theo tuần;
- có chi nhánh gắn với đăng ký;
- mỗi nhân viên khai báo khả năng làm theo từng ngày Thứ Hai → Chủ Nhật;
- có thể có nhiều dòng đăng ký của cùng một nhân viên trong cùng tuần;
- dữ liệu thực tế dùng nhiều loại khoảng thời gian, ví dụ ca ngắn, ca dài, Off và Cả Ngày;
- workbook có lịch sử thay đổi cấu trúc, do đó app không được sao chép cứng layout Excel thành data model.

### Lịch làm hàng tuần

Cấu trúc hiện hành cho thấy:

- lịch chính thức được chia theo nhiều chi nhánh;
- một nhân viên có thể xuất hiện ở nhiều khoảng giờ;
- có quy trình **hỗ trợ chéo chi nhánh** khi một cửa hàng thiếu người;
- nhân viên hỗ trợ từ chi nhánh khác phải vẫn được nhận diện rõ trong lịch được công bố.

Các workbook là **evidence/legacy operating source**, không trở thành database canonical song song với Business OS.

## 3. Live system đã xác minh

Live Supabase hiện có các nhóm dữ liệu/RPC đủ để tiếp tục mà chưa cần tạo hệ thống lịch thứ hai:

- employee availability;
- staffing requirements;
- schedule generation runs + assignments;
- official work schedules;
- shift swaps;
- attendance;
- manager weekly availability/schedule readers;
- employee availability save/delete;
- schedule auto-generation;
- generation assignment replacement;
- generation validation/review/publish;
- employee approved schedule reader;
- swap validation/submit/approve/reject;
- attendance clock-in/clock-out.

Các bảng Workforce liên quan đang bật RLS. Production schema replacement/backfill vẫn là YELLOW action và không nằm trong TASK-027.

## 4. Workflow canonical mục tiêu

```text
NHÂN VIÊN ĐĂNG KÝ KHẢ DỤNG
        ↓
QUẢN LÝ XEM TOÀN BỘ ĐĂNG KÝ TRONG PHẠM VI
        ↓
NHU CẦU NHÂN SỰ / CỬA HÀNG / KHUNG GIỜ
        ↓
ROBOT TẠO LỊCH NHÁP
        ↓
QUẢN LÝ REVIEW + CHỈNH / PHÂN BỔ THỦ CÔNG
        ↓
VALIDATE
        ↓
REVIEWED
        ↓
PUBLISH LỊCH CHÍNH THỨC
        ↓
LỊCH HIỂN THỊ TRÊN GIAO DIỆN NHÂN VIÊN
        ↓
NHẮC CA / CHẤM CÔNG
        ↓
CHO CA / ĐỔI CA
        ↓
CẬP NHẬT LỊCH + THÔNG BÁO NGƯỜI LIÊN QUAN
```

Robot **chỉ tạo đề xuất/lịch nháp**. Workflow hiện hữu yêu cầu quản lý review/validate/publish; không tự publish lịch chính thức.

## 5. Quyền và hành vi V1

### Nhân viên

- đăng ký nhiều khoảng thời gian trong tuần;
- xem lại đăng ký đã lưu ngay trên giao diện;
- xem lịch chính thức theo tuần;
- xem thay đổi lịch sau khi workflow được duyệt;
- chấm công theo ca;
- gửi yêu cầu cho ca / đổi ca;
- nhận thông báo khi lịch hoặc yêu cầu có thay đổi.

### Quản lý

Trong phạm vi cửa hàng được cấp quyền:

- xem toàn bộ đăng ký của nhân viên theo tuần;
- lọc theo cửa hàng;
- chỉnh giờ / cửa hàng ưu tiên bằng server RPC đã phân quyền;
- đặt nhu cầu nhân sự;
- chạy robot xếp lịch nháp;
- xem và chỉnh/phân bổ assignment của lịch nháp;
- validate → review → publish;
- xử lý yêu cầu cho ca / đổi ca;
- xem lịch chính thức và trạng thái attendance liên quan.

Không dùng direct table update từ browser khi đã có RPC phân quyền tương ứng.

## 6. Notification + Calendar target

V1 cần một lớp event/notification thống nhất cho ít nhất:

- lịch mới được publish;
- lịch đã được thay đổi;
- yêu cầu cho ca / đổi ca được gửi;
- yêu cầu được duyệt / từ chối;
- sắp đến giờ vào ca;
- đến thời điểm cần ra ca/chấm công;
- thay đổi có ảnh hưởng tới quản lý hoặc nhân viên liên quan.

Calendar/email được thiết kế dưới dạng connector/outbox. Không commit credential. Việc bật provider email/calendar thật hoặc secret trên production là YELLOW action riêng.

## 7. Guardrails

1. Repository public: không commit tên/SĐT/email/lịch cá nhân thật từ workbook.
2. Không tạo database lịch song song nếu live Workforce schema đã đáp ứng.
3. Không auto-publish lịch robot.
4. Manager write phải qua RPC/permission boundary đã xác minh.
5. Chỉnh assignment của generation phải validate trước review/publish.
6. Không tự định nghĩa rule chưa đủ evidence, ví dụ giới hạn giờ/tuần mới, ưu tiên nhân sự, fairness score hoặc exact semantics của “Cả Ngày”.
7. Production DDL/backfill/permission changes cần Owner approval riêng.
8. Notification failure không được làm rollback một schedule mutation đã commit thành công; phải có trạng thái gửi riêng khi implementation đến bước đó.

## 8. Micro-task queue

- **TASK-027 — Schedule priority + completion contract**  
  Source-of-truth pivot, evidence normalization, queue/contract/tests.
- **TASK-028 — Manager registration review hardening**  
  Week/store navigation, all registrations in scope, replace direct table update by `manager_update_employee_availability`, regression.
- **TASK-029 — Robot draft + Manager assignment editor**  
  Auto-generate → assignment review/edit → replace assignments → validate.
- **TASK-030 — Employee weekly registration V2**  
  Registration UX aligned with real weekly workflow; immediate saved-state visibility; multi-window/day regression.
- **TASK-031 — Manager official schedule workspace**  
  Store/week schedule reader, publish result visibility and controlled schedule operations.
- **TASK-032 — Give/Swap V2**  
  Complete give/swap semantics, approval, atomic schedule refresh and impacted-user refresh.
- **TASK-033 — Attendance + shift reminders**  
  Clock-in/out lifecycle and checkout reminder event contract.
- **TASK-034 — Notification / Calendar / Email connector**  
  Event outbox/adapter; production provider activation remains Owner-gated if credentials/config are required.
- **TASK-035 — Full Schedule E2E gate**  
  Availability → robot draft → manual edit → validate/review/publish → employee view → attendance → give/swap → notification contract.

## 9. Definition of Done cho slice

Slice Lịch làm hoàn thiện khi:

1. Workbook evidence cases không bị mất: multi-window, nhiều kiểu ca, 4 chi nhánh, hỗ trợ chéo chi nhánh.
2. Manager có workspace thật, không phụ thuộc hard-coded demo.
3. Robot draft chạy trên live contract hiện hữu và không tự publish.
4. Manager có thể chỉnh/phân bổ draft trước publish.
5. Employee registration và official schedule là hai trạng thái khác nhau, hiển thị rõ.
6. Give/swap cập nhật lịch theo server workflow và mọi bên liên quan được refresh/notify.
7. Attendance gắn với official schedule.
8. Notification/calendar/email có contract rõ và fail-safe.
9. Browser E2E dùng sanitized mocks, không production writes.
10. Existing People/Shift + Control Tower regressions vẫn xanh.

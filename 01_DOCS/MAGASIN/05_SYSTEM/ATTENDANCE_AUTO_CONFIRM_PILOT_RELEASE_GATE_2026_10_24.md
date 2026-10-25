# MAGASIN — P0 Chấm công khớp ca: cổng phát hành/pilot an toàn (24/10/2026)

**Trạng thái:** PR #523 Draft, chỉ phát hành khi Owner chấp thuận. Đây không phải hướng dẫn tự động chạy SQL trên production.

## Quy tắc và phạm vi

- Nhân viên có **ca chính thức**, nhập đủ giờ bắt đầu/kết thúc **khớp chính xác**, không ghi chú ngoại lệ **và chi nhánh đã được bật pilot** → `AUTO_CONFIRMED`, `confirmed_minutes` lấy từ thời lượng ca, không tạo `reviewed_by` giả.
- Lệch một trong hai đầu giờ, có ghi chú ngoại lệ, hoặc chi nhánh chưa bật chính sách → `NEEDS_REVIEW`; Manager đúng chi nhánh duyệt/điều chỉnh/từ chối.
- Không có ca chính thức → hệ thống hiện từ chối tạo chấm công; phải thực hiện **luồng yêu cầu ngoại lệ ngoài lịch riêng**, chưa được phép bịa ca/lương (issue #487 vẫn OPEN).
- Không xác thực sự hiện diện vật lý: giờ công do nhân viên khai báo; chính sách này **không thay thế** kiểm tra có mặt nếu Owner muốn bổ sung sau.
- Pilot **mặc định OFF toàn bộ chi nhánh**. Chỉ có record `attendance_auto_confirm_policy_v1.enabled = true` do quản trị có thẩm quyền tạo mới cho phép auto.
- Không có bảng so sánh 238 ô/không kiểm tra skill/vị trí.

## Bằng chứng đã nghiệm thu trên PostgreSQL/PostgREST cô lập

- `Employee Availability Deadline Isolated DB QA`: SQL migration có version, signed JWT qua PostgREST, Employee thao tác UI thật ở 390px, Manager thao tác UI thật, Owner đọc lịch sử, Employee nhận lại kết quả; đúng ca tự xác nhận, lệch ca chờ duyệt, bị sai role/store từ chối.
- `AUTH-PROD`, `UI2 Cross Role`, `People Shift` phải cùng PASS **trên exact head SHA của PR**, không dùng kết quả từ commit cũ.
- SQL xác nhận auto 240 phút, ca lệch được Manager duyệt thêm 210 phút thành 450 phút; không nhân đôi, rollback về baseline 0 bản ghi.
- Nhánh ngoài pilot cần có ca khớp 06:00–10:00 nhưng vẫn `NEEDS_REVIEW`, chứng minh không tự bật cho bốn chi nhánh.

## Thủ tục phát hành (chỉ sau Owner sign-off)

1. Xem và lưu bằng chứng CI exact-head; kiểm tra diff migration [`07_DATABASE/migrations/20261024015515_workforce_attendance_exact_auto_confirm_v1.sql`](../../../07_DATABASE/migrations/20261024015515_workforce_attendance_exact_auto_confirm_v1.sql), không cho bất kỳ workflow GitHub nào âm thầm deploy SQL.
2. Có bản sao lưu có thể phục hồi; xác nhận dữ liệu chấm công và nghiệp vụ payroll hiện trạng. Chạy **preflight chỉ đọc** [`09_QA/people-shift/attendance-exact-auto-hosted-preflight.sql`](../../../09_QA/people-shift/attendance-exact-auto-hosted-preflight.sql). Nếu phát hiện đổi hàm/constraint/RLS thì STOP và đối chiếu lại.
3. Người có quyền triển khai tạo transaction/migration đúng phiên bản trên Supabase được chỉ định. Tại thời điểm cài đặt bảng pilot **không có chi nhánh nào bật**, nên giờ công gửi tiếp tục cần duyệt; không triển khai frontend trước backend.
4. Kiểm tra sau triển khai: bảng chính sách tồn tại, không có record `enabled = true`; API không cấp quyền `anon`, user không có direct DML; UI/Employee/Manager/Owner không lỗi; chu trình chờ duyệt của cửa hàng chưa bật giữ nguyên.
5. Owner **chọn một chi nhánh cụ thể** để pilot; chỉ thao tác admin service-role, không dùng key này trong browser:
   `INSERT INTO public.attendance_auto_confirm_policy_v1(store_id,enabled) VALUES ('<approved-store-uuid>'::uuid,true) ON CONFLICT(store_id) DO UPDATE SET enabled=true,updated_at=now();`
   Phải xác minh UUID thuộc chi nhánh đã phê duyệt, không tự suy luận. Không bật hàng loạt.
6. Thử ít trường hợp ca hoàn tất tại pilot: khớp, lệch, có ghi chú, đổi ca, gửi trùng, quyền sai; so sánh phút công đã xác nhận và nguồn payroll. Owner kiểm tra bằng giao diện.
7. Nếu sai lệch: `UPDATE public.attendance_auto_confirm_policy_v1 SET enabled=false,updated_at=now() WHERE store_id='<approved-store-uuid>'::uuid;`. Nếu phải dừng **toàn hệ thống**, cân nhắc chạy [emergency write-behavior rollback](../../../09_QA/people-shift/attendance-exact-auto-write-rollback.sql): dừng tự xác nhận mới, **không xóa** `AUTO_CONFIRMED` cũ/điều kiện payroll. Không tự giảm quyền hoặc xóa lịch sử.
8. Chỉ sau pilot, đối soát, Owner nghiệm thu và các ca ngoại lệ ngoài lịch được thiết kế đúng mới triển khai dần các chi nhánh còn lại.

## Tiêu chí chưa đạt / điểm dừng

- Hosted production thực chưa có migration; bản sao staging của GitHub Actions chỉ chứa tập schema/RPC cần thiết, chưa thay thế full hosted staging.
- **Ngoài lịch không có `schedule_id`** chưa có RPC và quy trình duyệt/khôi phục an toàn; không tự tạo payroll.
- Không dùng tài khoản/đơn thật để kiểm thử; không phát sinh dự án Supabase trả phí.
- Không được đánh dấu đóng #487/#506 khi Owner chưa sign-off pilot, quyền và rollback.

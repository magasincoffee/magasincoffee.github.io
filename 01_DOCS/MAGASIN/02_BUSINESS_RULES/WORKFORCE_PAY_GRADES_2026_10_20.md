# MAGASIN Coffee — Bậc nhân viên, lương giờ và ưu tiên giao diện quản lý

- **Ngày xác nhận nghiệp vụ:** 2026-10-20
- **Trạng thái:** xác nhận từ trao đổi trực tiếp với chủ hệ thống; **chưa phải bằng chứng tính năng đã triển khai**
- **Phạm vi hiện tại:** lưu nghiệp vụ và ưu tiên; không thay đổi dữ liệu lương, quyền hoặc runtime đang chạy.

## 1. Bậc nhân viên — CONFIRMED

Có đúng **ba bậc nhân viên**: bậc 1 thấp nhất, bậc 3 cao nhất.

| Bậc | Lương thường |
| --- | ---: |
| 1 | 16.000 VND/giờ |
| 2 | 17.000 VND/giờ |
| 3 | 19.000 VND/giờ |

## 2. Ca đặc biệt buổi sáng — CONFIRMED

- **Ca 05:00–08:00 sáng:** mức lương **21.000 VND/giờ**.
- **Áp dụng ngang nhau cho bậc 1, 2 và 3**; không dùng lương thường của bậc trong ca này.
- Người vận hành nói rõ đây là mức riêng **chỉ cho ca đặc biệt này**, không áp dụng mặc định sang những giờ khác.

**CHƯA CHỐT:** nếu ca dài hơn hoặc giao nhau một phần với 05:00–08:00, tính 21.000 VND/giờ theo *toàn ca được định nghĩa là ca đặc biệt* hay chỉ cho *số giờ thực tế trong khung 05:00–08:00*? Không tự chọn cách tính khi triển khai. Ngày hiệu lực mức lương, quy định làm tròn, tăng ca, nghỉ và phụ cấp khác cũng chưa xác nhận.

## 3. Thứ tự ưu tiên triển khai — CONFIRMED (đổi ý theo lời chủ)

**Ưu tiên màn hình QUẢN LÝ trước màn hình NHÂN VIÊN.** Người vận hành đã đổi quyết định từ “nhân viên trước” sang “quản lý trước”; quyết định sau cùng này có hiệu lực.

- **P1 — Quản lý:** hoàn thiện kiểm tra chấm công/ngoại lệ công, đối chiếu công theo lịch đã công bố, nghiệp vụ kiểm tra và duyệt lương theo bậc cùng quy tắc ca đặc biệt; UI một luồng gọn, dễ hiểu, hiển thị trạng thái chính xác.
- **P2 — Nhân viên:** hoàn thiện đăng ký lịch, chấm công và xem công/lương theo dữ liệu đã xác nhận.
- **Sau đó:** phần mở rộng order, tồn kho và đóng gói app tiếp tục theo lộ trình riêng.
- Quy tắc lịch và chấm công đã xác nhận: xem `WORKFORCE_SCHEDULING_ATTENDANCE_2026_10_20.md`.

## 4. Ranh giới an toàn với hệ thống đang chạy

- File `05_MANAGER/Workforce/payroll-self-check-v1.js` ở thời điểm rà soát chỉ cung cấp **PAYROLL_READ** (read-only), hiển thị phút công và trạng thái; **chưa có quyền PAYROLL_REVIEW**, chưa hiển thị số tiền hay rate.
- Không thêm nút “Duyệt lương” giả, không cho client tự ghi/xác nhận lương khi backend chưa có RPC và quyền phù hợp. Phải đối chiếu schema, RLS, approval flow và kiểm thử tài khoản quản lý trước khi triển khai.
- Tách dữ liệu giờ công thực tế, lương ước tính, lương đã kiểm tra/chốt và khoản thực trả; không mặc định lịch được phân công chính là giờ công thực tế.
- Không commit dữ liệu cá nhân của nhân viên, lương thực tế từng người hay bí mật truy cập vào repository công khai.

## 5. Quyền theo mô hình 4 vai trò — định hướng đã trao đổi

- **Owner/chủ hệ thống:** quyền tối cao, dashboard tài chính và chiến lược, quản lý phân quyền.
- **Quản lý tổng:** quyền vận hành đầy đủ trên cả bốn chi nhánh, trong giới hạn không thay thế quyền tối cao của chủ.
- **Quản lý cửa hàng:** nghiệp vụ vận hành và xét duyệt trong phạm vi chi nhánh được giao.
- **Nhân viên:** đăng ký lịch, chấm công, xem lịch/công/lương và thao tác nghiệp vụ được cấp.

**Chưa xác minh:** backend hiện đã hỗ trợ đủ phân vai và quyền phê duyệt lương hay chưa. Đây là yêu cầu triển khai, không phải tuyên bố chức năng đã có.

## 6. Tiêu chí chấp nhận khi triển khai

1. Mỗi nhân viên có bậc 1/2/3 và mức lương hiệu lực được tính ở phía máy chủ; truy cập có phân quyền và log thay đổi.
2. Test cả ba bậc theo mức 16.000 / 17.000 / 19.000 VND/giờ ở ca bình thường.
3. Test ca 05:00–08:00 trả 21.000 VND/giờ cho cả ba bậc; trường hợp giao ca/chéo khung giờ chỉ test theo cách tính đã được chủ xác nhận.
4. Quản lý thấy được giờ công, ngoại lệ, trạng thái đối chiếu và hành động được quyền thực hiện; không hiển thị hành động không có thẩm quyền.
5. Phê duyệt lương phải là mutation có xác thực, quyền, audit và xử lý idempotency; không dựa vào nút UI thuần.
6. Một shell/sidebar quản lý duy nhất, không chạy song song các trang cũ và mới; kiểm thử desktop và mobile.

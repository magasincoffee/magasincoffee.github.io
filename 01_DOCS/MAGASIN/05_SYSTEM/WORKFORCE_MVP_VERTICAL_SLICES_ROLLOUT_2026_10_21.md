# MAGASIN Business OS — Workforce MVP: UI + nghiệp vụ theo từng luồng hoàn chỉnh

- **Ngày yêu cầu:** 2026-10-21 (Asia/Ho_Chi_Minh).
- **Nguồn:** yêu cầu trực tiếp của Owner trong hội thoại; ưu tiên sử dụng thực tế đăng ký thời gian làm việc, xếp lịch và chấm công; các phân hệ khác triển khai dần.
- **Trạng thái:** DELIVERY PLAN / NOT IMPLEMENTED / NOT ACCEPTED. Tài liệu này không phải bằng chứng đã sửa mã, CI đạt, phát hành hay vận hành thực tế.
- **Phạm vi:** 4 chi nhánh; Employee, Manager, Owner; chỉ mở rộng dần theo nghiệp vụ.
- **Theo dõi:** [Epic #487](https://github.com/magasincoffee/magasincoffee.github.io/issues/487).
- **Nguồn chuẩn không được thay thế:** `WORKFORCE_SCHEDULING_ATTENDANCE_2026_10_20.md` (nghiệp vụ); `MAGASIN_UI_UX_V2_SOURCE_OF_TRUTH.md` (UI, mục 16 Tabler); canonical schedule-first + RLS/RPC hiện có; `00_ENTERPRISE_ARCHITECTURE_5_STEP_PROFIT_CASH.md`.

## 1. Quyết định triển khai: không chọn "nghiệp vụ trước toàn bộ" hoặc "giao diện trước toàn bộ"

**Thực hiện theo vertical slices**: một luồng hoàn chỉnh = dữ liệu có thẩm quyền + phân quyền + nghiệp vụ + UI dễ dùng + thông báo/trạng thái + kiểm thử E2E + kiểm chứng phát hành. Chỉ chuyển sang luồng tiếp theo khi các điều kiện phụ thuộc của luồng trước được kiểm chứng. Có thể xây shell/components nền tảng ở đầu nhưng **không làm lại toàn bộ dashboard trước khi vận hành luồng Workforce**.

Ưu tiên:
1. **M0 — nền móng tối thiểu (UI/UX + technical audit).** Chốt khung điều hướng, role projections, reuse components, inventory routes/shell/legacy, source of truth, permission, browser fixtures; không viết lại framework. Mockup/preview vai trò phải được so với màn thực tế.
2. **M1 — Khả dụng nhân viên → Nhu cầu chi nhánh → Lịch nháp → Công bố → Nhân viên xem lịch.** Đây là luồng tác nghiệp đầu tiên phải chạy xuyên Employee → Manager → Employee. Mỗi màn hình trong luồng dùng đúng Tabler/MAGASIN Design System, không phải giao diện tạm khó dùng.
3. **M2 — Chấm công theo lịch công bố → Manager xử lý chấm công ngoài lịch → Owner xem tổng hợp.** Thực hiện sau khi hợp đồng chấm công chưa chốt được xác định; không tự chế quy tắc tính công/lương.
4. **M3 — Pilot có kiểm soát rồi mở 4 chi nhánh.** Nghiệm thu bằng tài khoản/phiên thực và các ca kiểm thử, theo dõi vấn đề, có rollback; chưa phê duyệt vận hành thực tế chỉ vì Pages/CI xanh.
5. **Backlog sau MVP:** nâng cao cho/đổi ca, lương, bán hàng, tồn kho, mua hàng, tài chính và các phân hệ khác theo ưu tiên Owner; không lẫn vào MVP nếu không phải dependency bắt buộc. Các luồng đang hoạt động không bị xóa/giáng cấp chỉ vì chưa nằm trong MVP.

> Đây là thứ tự `dependency-correct`, không phải thời gian cam kết hay lệnh khởi chạy Supervisor/Robot. Không thay `00_PROJECT_STATE.json` hoặc tự cấp quyền production.

## 2. App Shell và nguyên tắc "mở ứng dụng là biết bấm gì"

**Một sản phẩm, một design system**, Tabler (mẫu A) là tham chiếu visual; Manager scheduling theo mockup C; Employee mobile-first theo mockup D. Tái sử dụng HTML/CSS/JS, shared tokens/components hiện có, không tự thêm thư viện hoặc thay framework.

- **Global:** topbar nhận diện MAGASIN, chọn chi nhánh khi được cấp quyền, thông báo có badge đếm công việc thực (không số minh họa), user menu, trạng thái loading/empty/error/success; menu định tuyến ổn định, không trùng sidebar hay đổi giao diện cũ.
- **Employee (phone):** bottom navigation giữ contract đã chốt: **Hôm nay | Lịch | Công | Lương | Tôi**; **Thông báo** ở topbar và chỉ hiện số chưa đọc thật. Trong `Lịch` có Xem lịch, Đăng ký khả dụng; các hành động cho/đổi ca theo quyền/trạng thái. CTA chính rõ ràng, không giải thích dài trên màn hình, trợ giúp ngắn theo ngữ cảnh sau dấu `?`.
- **Manager:** sidebar cố định theo tác vụ: Hôm nay/Cần xử lý, Nhân viên, Nhu cầu nhân sự, Xếp lịch tuần, Chấm công và ngoại lệ, phần khác theo scope; mở menu chỉ thay vùng nội dung. Màn xếp lịch là board tác nghiệp riêng với tuần, chi nhánh, nhu cầu, coverage thiếu/đủ/dư, nhân viên khả dụng, lịch nháp và công bố.
- **Owner:** Tổng quan 4 chi nhánh, Cần chú ý, Workforce summary, drill-down theo phạm vi cho phép, KPI và ngoại lệ; không bắt Owner xếp ca, duyệt chấm công hằng ngày.
- **Bố cục chuẩn:** tên trang + chi nhánh/tuần + trạng thái + **một CTA chính**, các thao tác phụ qua menu hợp lý; icon kèm nhãn rõ; chỉ hiển thị hướng dẫn nếu cần. Không đưa ghi chú developer, fixture, placeholder hoặc mô tả kỹ thuật ra production.
- **Responsive & accessibility:** Employee 360/390/430px, nút chạm >=44x44 px, safe area, không tràn ngang; Manager 1024/1440px và kiểm tra phone actions; Owner desktop và mobile overview; keyboard/focus/error/reload/back được thử.

## 3. Contract nghiệp vụ cần bảo vệ

### M1A — Employee đăng ký khả năng làm
- Chỉ đăng ký **tuần sau, thứ Hai–Chủ nhật**; sửa được trước **12:00 Chủ nhật** ngay trước tuần đăng ký theo **Asia/Ho_Chi_Minh**, hạn khóa phải do server thực thi (không chỉ ẩn nút ở frontend).
- Calendar **05:00–22:00**, bước **30 phút**, chạm chọn/kéo chọn trên điện thoại; sao chép nhanh giữa ngày/tuần nếu được kiểm chứng; không ép ca sáng/chiều/tối cố định.
- Availability không phải lịch đã xếp, không phải attendance. Sau lưu/gửi phải có trạng thái xác thực và Manager thấy dữ liệu mới.

### M1B — Manager nhu cầu nhân sự và xếp lịch
- Chọn đúng chi nhánh trong phạm vi được cấp quyền; mẫu nhu cầu **lặp hằng tuần** cài một lần, đọc đúng mọi tuần; **override riêng từng tuần** không tác động mẫu gốc và các tuần khác.
- Phân công theo availability, nhu cầu từng 30 phút, ưu tiên **full-time trước part-time**, trong cùng nhóm ưu tiên thứ tự đăng ký; đối chiếu ưu tiên chi nhánh đã cấu hình và điều kiện thực tế. Không tự quyết định bù thiếu ngoài quyền.
- Hỗ trợ lịch **nháp** trước hạn đăng ký, đánh dấu ảnh hưởng khi nhân viên sửa khả dụng; công bố **chỉ bởi Manager đủ quyền**, không tự công bố khi chuyển tuần, giữ tách bạch draft và lịch chính thức.
- Nhân viên chỉ xem lịch **đã công bố** làm căn cứ đi làm/chấm công. Sau công bố, đồng bộ qua role; Owner chỉ thấy tổng hợp và cảnh báo cần chú ý.

### M2 — Chấm công
- Gắn attendance với lịch **đã công bố**; thời gian làm thực tế tách khỏi `work_schedules`; trong lịch không bắt Manager duyệt từng lượt; ngoài lịch phải qua Manager duyệt.
- **OPEN, chặn release M2 cho đến khi Owner chốt và được triển khai/test:** chấm công bằng giờ hệ thống khi bấm vào/ra hay cho phép tự nhập; xử lý đến sớm/về muộn, qua đêm, nghỉ giữa ca, chỉnh công, trùng lặp. Không tự suy ra giờ công đã duyệt hoặc tính lương từ lịch.
- Nếu M1 hoàn tất trước M2: chỉ cho phép sử dụng đăng ký/xếp lịch/xem lịch trong phạm vi nghiệm thu; không tuyên bố chấm công đã sẵn sàng.

## 4. Ma trận hành trình bắt buộc

| Hành trình | Employee | Manager | Owner | Kiểm chứng |
|---|---|---|---|---|
| Khả dụng tuần sau | Chọn/sửa/gửi giờ được làm | Thấy cập nhật và cảnh báo draft | Tổng quan tỷ lệ đăng ký | Giờ ICT, khóa hạn ở server, dữ liệu đồng bộ |
| Nhu cầu nhân sự | Không được sửa | Tạo mẫu lặp + override tuần/chi nhánh | Xem coverage | Ba tuần: mẫu/một override/tuần trở lại mẫu |
| Xếp và công bố | Chỉ xem khi công bố | Draft/edit/publish đúng quyền | Thấy tổng quan thiếu/đủ | Không công bố tự động, không lộ draft |
| Chấm công | In/out theo contract duyệt | Duyệt ngoại lệ ngoài lịch | Theo dõi ngoại lệ | Không dùng schedule làm attendance, không duyệt thay |
| Điều hướng | Mobile đơn giản, status rõ | Sidebar một bản, giữ week/branch | Drill-down 4 chi nhánh | 360/390/430/1024/1440, back/reload/cold |

## 5. Gate chấp nhận theo từng mốc

**M0 gate:** inventory UI/routes/legacy, mockup Tabler cho ba vai trò và map token/component, ma trận quyền; không tạo mới screen cạnh tranh.

**M1 gate:** E2E nhân viên → quản lý → nhân viên với role/branch thực hoặc fixture test-safe và test quyền phủ định 4 chi nhánh; đăng ký đúng hạn Asia/Ho_Chi_Minh, nhu cầu lặp + override, FT-first, 30 phút, draft/publish, status/notification; ảnh chứng minh desktop + phone; QA CI ở exact-head; kết quả trên exact-main và GitHub Pages; nghiệm thu tay của Owner. Không coi QA fixture là bằng chứng dữ liệu production.

**M2 gate:** Owner ký duyệt các điểm chấm công OPEN → triển khai server/RLS/RPC phù hợp qua quy trình kiểm soát → E2E attendance trong lịch + ngoài lịch phê duyệt → đối soát role → đảm bảo không tạo ghi nhận trùng/sai; không thay dữ liệu thật hoặc rules lương khi chưa phê duyệt.

**M3 gate:** pilot một chi nhánh được Owner chọn và có rollback / đối soát, sau đó mới mở lần lượt 4 chi nhánh khi kết quả thực tế đạt; không tự tuyên bố `DONE` trước xác nhận vận hành.

### Kỷ luật GitHub / phát hành
- Mỗi slice có issue/PR riêng, ghi scope, acceptance criteria, file/code thay đổi, SHA, CI, evidence screenshot/recording, link staging/exact-main, status: `PLANNED / IMPLEMENTING / QA PASS / DEPLOYED / OWNER ACCEPTED`.
- Phân biệt **UI preview ≠ E2E pass ≠ production deployed ≠ operational acceptance**.
- Không sửa trực tiếp main để thử nghiệm lớn; ưu tiên PR nhỏ, có reviewer/CI/rollback. Không commit dữ liệu nhân viên, OAuth tokens, thông tin nội bộ hoặc secrets.
- Không thay schema/RPC/RLS, payroll hoặc quyền production khi chưa có approved migration, xác thực và recovery plan.
- Kế hoạch này hướng triển khai **đăng ký + xếp lịch + chấm công trước**, nhưng vẫn tuân thủ kiến trúc enterprise và giữ các workstream khác không bị ghi đè trạng thái.

## 6. Việc tiếp theo cho coding agent

1. Audit code đang có so với M0/M1; gắn nhãn `REUSE / REPAIR / RETIRE AFTER VERIFIED` cho route, shell, widget, API, RPC; xác định ba lỗi gốc có mức ảnh hưởng lớn nhất, đặc biệt lựa chọn chi nhánh, lưu nhu cầu nhân sự, timezone và 30 phút.
2. Tạo bản xem trước (desktop Manager/Owner; phone Employee) dùng dữ liệu kiểm thử, đối chiếu Tabler; khóa mẫu UI để tránh drift.
3. Triển khai và test M1 end-to-end, **không đợi làm đẹp tất cả phân hệ khác**; khi đạt mới cho dùng thật M1.
4. Chuẩn bị phương án M2; hỏi Owner đúng các quyết định attendance OPEN trước khi xử lý server hoặc bật tính năng thật.
5. Báo cáo có bằng chứng cho từng mốc và cập nhật #487; chỉ chuyển status khi thực sự đạt gate.

**Nguyên tắc kết thúc:** Employee thao tác dễ và nhanh; Manager điều phối được đầy đủ trên màn hình tác nghiệp; Owner thấy tình hình, ngoại lệ và ra quyết định. Không có chuyện màn hình trông hoàn thiện nhưng không lưu được nghiệp vụ thực tế.

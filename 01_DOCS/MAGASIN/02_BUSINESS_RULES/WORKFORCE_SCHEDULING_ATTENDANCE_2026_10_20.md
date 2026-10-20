# MAGASIN Coffee — Workforce: Đăng ký, xếp lịch, cho/đổi ca và chấm công

- **Ngày xác nhận trao đổi:** 2026-10-20
- **Domain:** People / Workforce
- **Nguồn:** quyết định nghiệp vụ do người vận hành MAGASIN nêu trực tiếp trong hội thoại, không phải suy đoán từ UI hiện hành.
- **Mục đích:** nguồn yêu cầu nghiệp vụ chung cho ChatGPT/coding agent ở các phiên làm việc khác.
- **Phạm vi thay đổi:** tài liệu nghiệp vụ; KHÔNG phải bằng chứng rằng phần mềm đã triển khai.
- **Ưu tiên xử lý:** quy tắc `CONFIRMED` là yêu cầu nghiệp vụ; `PROPOSED` cần xác nhận; `OPEN` không được tự đặt mặc định thành luật.

## 1. Thuật ngữ chuẩn

| Thuật ngữ tiếng Việt | Canonical English | Ý nghĩa |
|---|---|---|
| Khả năng làm việc / đăng ký lịch | Employee availability | Các khoảng nhân viên CÓ THỂ làm; không phải ca đã được phân công. |
| Nhu cầu nhân sự | Staffing demand / requirements | Số người chi nhánh cần ở mỗi ngày/khoảng giờ. |
| Mẫu nhu cầu cố định hằng tuần | Recurring weekly staffing template | Cài một lần cho chi nhánh; tự áp dụng lặp lại hằng tuần. |
| Điều chỉnh nhu cầu riêng một tuần | Weekly staffing override | Chỉ ghi đè khung giờ của đúng tuần được chọn, không ảnh hưởng mẫu hoặc tuần khác. |
| Lịch nháp | Draft schedule | Phân công tạm để quản lý chỉnh; chưa ràng buộc nhân viên. |
| Lịch chính thức | Published/approved work schedule | Ca đã được quản lý duyệt/công bố; căn cứ đi làm và chấm công. |
| Cho ca / nhường ca | Shift give-away / handover | Nhân viên A đề nghị nhường ca đã phân công cho B nhận; KHÔNG có ca đối ứng. |
| Đổi ca | Shift swap | A và B trao đổi hai ca đã phân công cho nhau. |
| Chấm công trong lịch | Scheduled attendance | Ghi nhận chấm công tương ứng với lịch chính thức. |
| Chấm công ngoài lịch | Out-of-schedule attendance | Chấm công khi không có ca phù hợp hoặc nằm ngoài phạm vi lịch; cần manager duyệt. |
| Quản lý | Manager | Vai trò vận hành xếp lịch và phê duyệt. |
| Chủ sở hữu | Owner | Vai trò chính sách/ngoại lệ, không phải người xếp lịch hằng ngày. |

**Ranh giới dữ liệu bất biến:** `employee_availability` ≠ `staffing_requirements` ≠ lịch nháp ≠ `work_schedules` (lịch công bố) ≠ `attendance` (thời gian làm thực tế). Không tự quy đổi thời gian rảnh hay thời gian theo lịch thành giờ công thực tế.

## 2. Đăng ký khả năng làm việc — CONFIRMED

- Đăng ký toàn bộ tuần sau, từ thứ Hai tới Chủ nhật.
- Cửa sổ đăng ký: **thứ Hai → 12:00 trưa Chủ nhật** (giờ Việt Nam, Asia/Ho_Chi_Minh), ngay trước tuần được đăng ký.
- Nhân viên được chỉnh sửa đăng ký không giới hạn lần đến đúng hạn. Sau 12:00 Chủ nhật, khóa đăng ký/sửa cho tuần tới bằng quyền nhân viên.
- Nhân viên chỉ khai báo **thời gian có thể làm**. Ví dụ chọn 07:00–17:00 thì quản lý có thể phân công 07:00–11:00, 07:00–12:00, 12:00–17:00 hoặc khoảng hợp lệ khác trong cửa sổ; không mặc nhiên xếp đủ 10 giờ.
- Không có hệ thống ca sáng/chiều/tối cố định bắt buộc phải dùng.
- Giao diện nhân viên mong muốn: lịch tuần dạng calendar, từ 05:00 tới 22:00, bước 30 phút; thao tác chạm chọn điểm bắt đầu/kết thúc hoặc kéo chọn; thao tác điện thoại nhanh; có thể sao chép giữa ngày/tuần.
- Tự lưu nháp và nút gửi đăng ký tuần là **đề xuất UX**, không phải đã triển khai.

## 3. Nhu cầu nhân sự theo chi nhánh — CONFIRMED (làm rõ 2026-10-20)

**QUY TẮC CỐT LÕI: Thiết lập một lần, áp dụng lặp lại vô thời hạn theo tuần; KHÔNG yêu cầu quản lý thiết lập/cập nhật thủ công từng tuần.** Đây là hiệu chỉnh trực tiếp của người dùng đối với cách diễn đạt trước đó có thể bị hiểu nhầm thành “cài nhu cầu mỗi tuần”.

- Mỗi chi nhánh có **mẫu nhu cầu nhân sự cố định hằng tuần** (recurring weekly staffing template), xác định số nhân viên cần cho từng thứ trong tuần và từng khoảng giờ, có thể khác nhau giữa các chi nhánh.
- Mẫu cố định được cài **một lần** và tự động áp dụng khi mở/xếp lịch bất kỳ tuần tiếp theo; nếu quản lý không thao tác, nhu cầu tuần đó **vẫn được điền đúng mẫu mặc định**, không trở thành trống/chưa cài.
- **Chỉ khi tuần cụ thể có khác biệt** do lễ, Tết, chương trình, dự kiến đông/vắng khách... quản lý mới vào sửa **đúng tuần đó**, tạo **weekly staffing override** cho ngày/khoảng giờ tương ứng. Các ô không sửa vẫn kế thừa mẫu cố định.
- Override chỉ có hiệu lực đối với tuần được chọn. Không tự sửa mẫu cố định và **không kéo sang các tuần sau**. Tuần tiếp theo không có override thì tự trở lại đúng mẫu hằng tuần (không cần người quản lý đặt lại).
- Ví dụ: mẫu cố định thứ Hai 18:00–22:00 cần 2 người. Tuần có chương trình, quản lý tăng riêng thứ Hai tuần đó lên 4. Tuần kế tiếp tự trở về 2, trừ khi chính tuần kế tiếp cũng được sửa riêng.
- Xếp lịch đối chiếu nhu cầu **đã tính từ mẫu + override của tuần đang chọn** với nhân sự thực tế từng khung 30 phút và thể hiện thiếu/đủ/dư.
- **Gợi ý triển khai (PROPOSED):** giao diện cho phép “Sửa mẫu cố định” tách biệt rõ với “Chỉ sửa tuần này”; tránh vô ý ghi đè mẫu. Cách lưu và schema phải đối chiếu source hiện tại trước khi thay đổi.

**Acceptance criteria cho agent:** (1) tạo mẫu một lần rồi mở 3 tuần khác nhau không thao tác: đều có cùng mẫu nhu cầu theo thứ/ngày; (2) override duy nhất tuần thứ hai, chỉ tuần hai đổi, tuần một/ba giữ mẫu; (3) đổi tuần trong màn hình xếp lịch không tạo/đòi lưu lại mẫu; (4) rõ chi nhánh và múi giờ; (5) sửa tuần không âm thầm đổi mẫu gốc.

## 4. Xếp lịch — CONFIRMED

- Manager là người sở hữu nghiệp vụ xếp, chỉnh, duyệt và công bố lịch hằng ngày. Công cụ/Robot có thể gợi ý hoặc tạo **DRAFT**, không tự công bố.
- Quản lý có thể **xếp nháp ngay trong tuần** khi đăng ký của nhân viên chưa khóa. Khi đăng ký đổi, hệ thống cần cảnh báo những phân công nháp bị ảnh hưởng.
- **12:00 Chủ nhật:** khóa thời gian đăng ký tuần sau. **Chiều/tối Chủ nhật:** quản lý hoàn thiện và công bố lịch chính thức để nhân viên làm từ thứ Hai.
- Không có ca chuẩn cứng. **Ưu tiên ca >= 4 giờ**; ca 2–3 giờ là ngoại lệ có thể bố trí khi thực tế cần, không mặc định cấm.
- **Thứ tự ưu tiên ứng viên:** full-time trước part-time; cùng nhóm ưu tiên thời điểm đăng ký sớm hơn, do hiện chưa có chỉ số đánh giá nhân viên. Không được hiểu đây là quyền tự được phân ca bất chấp nhu cầu/điều kiện.
- Giao diện manager mong muốn: **một màn hình điều phối theo chi nhánh và tuần**, nhìn nhu cầu, ca, người đã xếp, thiếu/đủ/dư, sắp các giờ từ sáng tới tối; chỉnh tại chỗ, tránh hành trình 5 bước và tránh tải lại toàn trang.
- Sidebar quản lý **thống nhất, ổn định**; vào Xếp lịch chỉ đổi vùng nội dung. Hiện tượng sidebar thay đổi, chồng phiên bản/giao diện cũ và các mục dư (ví dụ Công việc/Cài đặt xuất hiện sai chỗ) là lỗi cần đánh giá/dọn sạch có kiểm thử trước khi thay mã.
- Các ý về chi tiết trình bày và thao tác là tiêu chí thiết kế, không phải xác nhận đã sửa xong phần mềm.

## 5. Đổi ca (SHIFT_SWAP) — CONFIRMED

- Hai nhân viên **tự thỏa thuận**; yêu cầu đổi ca được tạo trên hệ thống.
- Yêu cầu phải được gửi **trước ít nhất một ngày/24 giờ so với thời điểm ca liên quan bắt đầu** (quy tắc đã được diễn giải thành >=24 giờ trong trao đổi; cần kiểm thử rõ mốc nếu qua đêm).
- Quản lý nhận thông báo và **duyệt hoặc từ chối**.
- **Chỉ khi quản lý duyệt** mới thực hiện trao đổi hai ca trên lịch chính thức của A và B. Trước duyệt, lịch gốc vẫn hiệu lực.
- Lịch được duyệt là căn cứ để nhân viên chấm công, không chấm công theo đề xuất đổi ca chưa duyệt.
- Việc cả hai phải xác nhận trong ứng dụng hay xác nhận ngoài đời vẫn là chi tiết UX cần chốt.

## 6. Cho ca/nhường ca (SHIFT_GIVE_AWAY) — PROPOSED, CHƯA CHỐT

- Khác với đổi ca: A nhường **một** ca cho B, B không cần đưa ca khác cho A.
- Luồng **đề xuất để thảo luận**: A chọn ca đã công bố → gửi đề nghị cho ca → B đồng ý nhận → quản lý kiểm tra điều kiện và duyệt/từ chối → nếu duyệt mới chuyển phân công trên lịch chính thức, thông báo cả hai.
- Trước phê duyệt, A vẫn chịu trách nhiệm theo lịch gốc. Nếu không ai nhận hoặc quản lý từ chối, ca giữ nguyên.
- Kiểm tra đề xuất: B không bị trùng giờ lịch chính thức, đủ điều kiện ở chi nhánh, không tạo thiếu người hoặc phân công vô lý.
- **CHƯA CHỐT:** Cho ca có bắt buộc B nhận trước khi gửi quản lý hay cho phép đăng công khai để người khác nhận? Giới hạn gửi trước 24 giờ có áp dụng cho cho ca không? Có cho phép manager phân công trực tiếp khi thiếu người không?

## 7. Chấm công (ATTENDANCE) — CONFIRMED + OPEN

- Nhân viên chấm công trên cơ sở **lịch làm việc đã được xếp/công bố**, và được chọn giờ chấm công theo luồng thao tác sẽ thiết kế.
- **Trong lịch chính thức:** nhân viên chấm công, **không cần quản lý duyệt từng lần**.
- **Ngoài lịch:** được phép gửi ghi nhận/yêu cầu chấm công, nhưng **cần quản lý duyệt** thì mới được xác nhận thành giờ công hợp lệ.
- Không tự coi `work_schedules` là bằng chứng đã làm việc; attendance là sự kiện/ghi nhận riêng.
- **CHƯA CHỐT:** "chọn giờ chấm công" là bấm vào/ra theo đồng hồ thực tế hay nhân viên tự nhập giờ đã làm? Đi sớm/về muộn trong biên ca được xử lý thế nào? Quy tắc qua đêm, chỉnh công, nghỉ giữa ca và chống ghi nhận trùng cần hỏi tiếp; không tự đặt luật tính lương.

## 8. Ranh giới hệ thống và nguồn tham chiếu

- Nguồn chuẩn kỹ thuật đã tồn tại: `01_DOCS/MAGASIN/05_SYSTEM/SCHEDULE_FIRST_CANONICAL_FLOW_V1.md`, `01_DOCS/modules/WORKFORCE.md`, `02_CORE/contracts/schedule-first-flow.v1.json`.
- Server-owned shared Workforce; UI Employee/Manager/Owner chỉ là projections. Không tạo nguồn dữ liệu song song trong từng trang.
- Hiện có các RPC được ghi nhận trong tài liệu kỹ thuật: `submit_shift_swap_request`, `approve_shift_swap`, `reject_shift_swap`, `clock_in_for_schedule`, `clock_out_attendance`. Việc có RPC **không chứng minh** trải nghiệm đã phù hợp nghiệp vụ mới.
- Luồng phê duyệt cho ca cần kiểm chứng với schema/RPC hiện hữu; không được giả định `shift_swaps` đã đủ hỗ trợ cho ca.
- Không commit dữ liệu nhân viên thực, dữ liệu riêng tư, secrets vào repository public.
- **Chưa có yêu cầu triển khai chức năng trong vòng trao đổi này.** Tài liệu là bàn giao nghiệp vụ cho các phiên khác; lập kế hoạch, thực hiện thay đổi và QA riêng sau khi được yêu cầu.

## 9. Hướng dẫn cho ChatGPT / coding agent mở phiên mới

1. Đọc `01_DOCS/MAGASIN/00_CHATGPT_CONTEXT.md`, tài liệu này, rồi đối chiếu canonical flow và code/schema hiện hành.
2. Phân biệt quy tắc `CONFIRMED`, thiết kế `PROPOSED`, câu hỏi `OPEN`; không tự nâng PROPOSED thành chính sách.
3. Bảo tồn luồng từ đăng ký → nhu cầu → nháp → quản lý công bố → lịch thực tế → đổi/cho ca → chấm công → phê duyệt ngoại lệ.
4. Nếu tiếp tục trò chuyện nghiệp vụ, cập nhật file này sau mỗi quyết định được xác nhận; không làm biến đổi runtime chỉ vì bổ sung tài liệu.
5. Khi triển khai, yêu cầu QA trên cả vai trò Employee/Manager/Owner, bao gồm sidebar, state transitions, phân quyền, ca giao nhau và thời hạn tuần.

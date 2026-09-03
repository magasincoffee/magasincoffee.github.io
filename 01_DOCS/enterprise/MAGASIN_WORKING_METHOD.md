# MAGASIN — WORKING METHOD

Version: 1.0  
Status: ACTIVE  
Purpose: Quy chuẩn cách Owner làm việc với AI trong toàn bộ quá trình xây dựng, vận hành và phát triển MAGASIN.

---

## 1. MỤC ĐÍCH CỦA TÀI LIỆU

Tài liệu này là **hướng dẫn làm việc dành cho Owner**, không phải tài liệu kỹ thuật.

Mục tiêu là giúp Owner:

- biết khi nào cần cung cấp thông tin;
- biết khi nào cần yêu cầu AI phân tích;
- biết khi nào được yêu cầu AI thực hiện;
- biết khi nào phải kiểm tra và nghiệm thu;
- biết khi nào thông tin phải được lưu thành tài liệu chính thức;
- biết trạng thái của từng công việc;
- tránh tình trạng AI tự suy diễn nghiệp vụ rồi viết code sai;
- duy trì một nguồn sự thật thống nhất cho toàn doanh nghiệp.

Nguyên tắc tối cao:

> **Không xây phần mềm trước khi hiểu đúng doanh nghiệp. Không coi code là nguồn sự thật về nghiệp vụ. Business Rule đã được Owner xác nhận mới là căn cứ để thiết kế SOP, dữ liệu, phần mềm và automation.**

---

# 2. MÔ HÌNH LÀM VIỆC TỔNG THỂ

Mọi công việc lớn nhỏ của MAGASIN đi theo vòng đời:

```text
OBSERVE
  ↓
DISCOVER
  ↓
DEFINE
  ↓
VALIDATE
  ↓
DESIGN
  ↓
IMPLEMENT
  ↓
TEST
  ↓
ACCEPT
  ↓
DOCUMENT
  ↓
OPERATE
  ↓
REVIEW
  ↺
```

Có nghĩa:

1. Quan sát thực tế.
2. Khai thác thông tin còn thiếu.
3. Xác định quy tắc và mục tiêu.
4. Owner xác nhận hiểu đúng.
5. Thiết kế cách giải quyết.
6. Thực hiện.
7. Kiểm thử.
8. Owner nghiệm thu.
9. Lưu lại thành tài liệu chính thức.
10. Đưa vào vận hành.
11. Định kỳ xem lại và cải tiến.

---

# 3. 5 LOẠI YÊU CẦU OWNER CÓ THỂ GỬI CHO AI

## TYPE A — HỎI / KHÁM PHÁ

Dùng khi Owner chưa biết rõ vấn đề hoặc muốn AI nghiên cứu.

Mẫu:

```text
KHÁM PHÁ
Chủ đề: [x]
Mục tiêu: [tôi muốn hiểu điều gì]
Phạm vi: [doanh nghiệp / cửa hàng / nhân sự / tài chính / công nghệ...]
Hãy nghiên cứu và cho tôi các phát hiện, benchmark và đề xuất.
Chưa thực hiện thay đổi.
```

AI chỉ nghiên cứu, không sửa hệ thống.

---

## TYPE B — CUNG CẤP THÔNG TIN THỰC TẾ

Dùng khi Owner muốn nói cho AI biết MAGASIN đang vận hành như thế nào.

Mẫu:

```text
BỐI CẢNH THỰC TẾ
Chủ đề: [x]
Thực tế hiện tại:
- ...
- ...
- ...
Ngoại lệ:
- ...
Điều tôi chưa chắc:
- ...
```

AI phải:

1. đọc và phân loại thông tin;
2. chỉ ra điểm còn thiếu/mâu thuẫn;
3. diễn đạt lại cách hiểu;
4. chưa tự biến thành business rule nếu Owner chưa xác nhận.

---

## TYPE C — YÊU CẦU THIẾT KẾ

Dùng khi nghiệp vụ đã đủ rõ và Owner muốn AI đề xuất cách tổ chức.

Mẫu:

```text
THIẾT KẾ
Dựa trên các Business Rule đã CONFIRMED trong repository,
hãy đề xuất mô hình [quy trình / dữ liệu / SOP / UI / automation / hệ thống].
Chưa triển khai.
```

AI phải dựa trên tài liệu đã được xác nhận, không tự thay đổi business rule.

---

## TYPE D — YÊU CẦU THỰC HIỆN

Chỉ dùng khi Owner đã quyết định làm.

Mẫu:

```text
THỰC HIỆN
Mục tiêu: [x]
Đối tượng: [module / quy trình / cửa hàng / tài liệu]
Căn cứ: [Business Rule / Design đã CONFIRMED]
Phạm vi thay đổi: [x]
Yêu cầu:
- ...
- ...
Kiểm tra sau thực hiện:
- ...
Hãy thực hiện và cập nhật repository.
```

AI được phép sửa code/tài liệu/database trong phạm vi đã được xác định.

---

## TYPE E — NGHIỆM THU / KIỂM TRA

Dùng khi một công việc đã được thực hiện.

Mẫu:

```text
NGHIỆM THU
Đối tượng: [x]
Expected Result:
- ...
- ...
Hãy kiểm tra thực tế, đối chiếu tài liệu và báo cáo:
PASS / FAIL / NEED REVISION.
Chưa sửa nếu tôi chưa yêu cầu sửa.
```

AI phải kiểm tra độc lập với implementation.

---

# 4. 10 BƯỚC CHUẨN CHO MỖI CÔNG VIỆC

## BƯỚC 1 — XÁC ĐỊNH MỤC TIÊU

Owner phải nói rõ:

- đang muốn đạt kết quả gì;
- vấn đề gì đang tồn tại;
- vì sao vấn đề quan trọng;
- phạm vi ảnh hưởng.

Không cần nói cách code.

### Trạng thái
`REQUESTED`

---

## BƯỚC 2 — THU THẬP THỰC TẾ

AI hỏi những gì còn thiếu.

Nguồn có thể gồm:

- Owner;
- nhân viên;
- SOP;
- dữ liệu hiện tại;
- báo cáo;
- database;
- code;
- benchmark bên ngoài.

### Trạng thái
`DISCOVERY`

---

## BƯỚC 3 — DIỄN ĐẠT LẠI

AI phải viết:

> “Tôi đang hiểu MAGASIN như sau…”

và biến thông tin thành:

- facts;
- assumptions;
- constraints;
- business rules;
- open questions.

### Trạng thái
`DRAFT`

---

## BƯỚC 4 — OWNER CHỐT

Owner sửa nếu sai.

Chỉ khi Owner xác nhận:

`CONFIRMED`

thì nội dung mới trở thành nguồn sự thật chính thức.

---

## BƯỚC 5 — LƯU BUSINESS RULE

Mọi nội dung có giá trị lâu dài phải được lưu vào repository.

Ví dụ:

```text
BR-001
BR-002
BR-003
```

Không chỉ để lại trong chat.

### Trạng thái
`DOCUMENTED`

---

## BƯỚC 6 — THIẾT KẾ GIẢI PHÁP

AI mới được đề xuất:

- process;
- SOP;
- org model;
- data model;
- UI;
- automation;
- webapp;
- AI workflow.

### Trạng thái
`DESIGNED`

---

## BƯỚC 7 — RA LỆNH THỰC HIỆN

Owner phải chuyển từ “trao đổi” sang “yêu cầu thực hiện”.

Câu khởi đầu khuyến nghị:

> **THỰC HIỆN THEO DESIGN ĐÃ CHỐT**

Khi đó AI hiểu rằng đây là execution, không phải brainstorming.

### Trạng thái
`IN_PROGRESS`

---

## BƯỚC 8 — KIỂM TRA

AI phải kiểm tra:

1. implementation;
2. business rule;
3. regression;
4. dữ liệu;
5. quyền truy cập;
6. các trường hợp bình thường;
7. các trường hợp ngoại lệ.

### Trạng thái
`TESTING`

---

## BƯỚC 9 — OWNER NGHIỆM THU

Owner xác nhận:

`ACCEPTED`

hoặc:

`REVISION_REQUIRED`

Không được đánh dấu hoàn thành chỉ vì code đã commit.

---

## BƯỚC 10 — ĐÓNG CÔNG VIỆC

Sau nghiệm thu:

- cập nhật tài liệu;
- cập nhật version;
- cập nhật changelog nếu cần;
- đánh dấu completion;
- ghi rõ commit/version;
- ghi rõ các việc còn lại.

### Trạng thái cuối
`COMPLETED`

---

# 5. KHI NÀO PHẢI LƯU TÀI LIỆU?

Phải lưu vào GitHub khi thông tin có ít nhất một trong các tính chất:

- ảnh hưởng đến cách doanh nghiệp vận hành;
- ảnh hưởng đến quyền quyết định;
- ảnh hưởng đến tiền/lợi nhuận;
- ảnh hưởng đến khách hàng;
- ảnh hưởng đến nhân sự;
- ảnh hưởng đến SOP;
- ảnh hưởng đến database;
- ảnh hưởng đến phần mềm;
- có thể cần sử dụng lại trong tương lai;
- cần AI khác/phiên chat khác hiểu được.

Thông tin tạm thời chỉ dùng để thảo luận có thể chưa cần lưu.

---

# 6. KHI NÀO ĐƯỢC ĐÁNH DẤU “HOÀN THÀNH”?

Một công việc chỉ được đánh dấu `COMPLETED` khi đủ cả 5 điều kiện:

```text
[1] Scope đã rõ
[2] Business Rule đã CONFIRMED
[3] Implementation đã hoàn tất
[4] Testing đã PASS
[5] Documentation đã cập nhật
```

Thiếu một điều kiện thì chưa hoàn thành.

---

# 7. QUY TẮC QUẢN LÝ TRẠNG THÁI

```text
REQUESTED
   ↓
DISCOVERY
   ↓
DRAFT
   ↓
CONFIRMED
   ↓
DOCUMENTED
   ↓
DESIGNED
   ↓
IN_PROGRESS
   ↓
TESTING
   ↓
ACCEPTED
   ↓
COMPLETED
```

Có thể quay lại:

```text
TESTING → REVISION_REQUIRED → IN_PROGRESS
CONFIRMED → DRAFT
OPERATING → REVIEW
```

Không được nhảy thẳng từ ý tưởng sang `COMPLETED`.

---

# 8. QUY TẮC “ĐỪNG CODE”

Nếu Owner yêu cầu sửa hệ thống nhưng business rule chưa rõ, AI phải dừng ở bước discovery và hỏi lại.

AI không được:

- tự quyết định nghiệp vụ quan trọng;
- tự đặt policy tài chính;
- tự thay đổi quyền hạn;
- tự thay đổi luồng phê duyệt;
- tự thay đổi dữ liệu quan trọng;
- lấy code cũ làm business truth khi tài liệu mới mâu thuẫn.

---

# 9. QUY TẮC “READ FIRST” CHO KHUNG CHAT MỚI

Khi mở một khung chat mới về MAGASIN, Owner có thể gửi:

```text
Đây là công việc của MAGASIN.
Hãy đọc trước:
1. docs/enterprise/MAGASIN_MASTER_OBJECTIVE.md
2. docs/enterprise/MAGASIN_BOS_FRAMEWORK.md
3. docs/enterprise/MAGASIN_AI_CONTEXT.md
4. docs/enterprise/MAGASIN_WORKING_METHOD.md
5. tài liệu module liên quan

Sau khi đọc, hãy tóm tắt:
- mục tiêu tối thượng;
- bối cảnh liên quan;
- Business Rule hiện có;
- trạng thái công việc;
- những gì chưa rõ.

Chưa thực hiện thay đổi cho đến khi tôi ra yêu cầu thực hiện.
```

---

# 10. CẤU TRÚC MỘT YÊU CẦU TỐT

Owner không cần dùng thuật ngữ kỹ thuật. Chỉ cần trả lời 7 câu:

```text
1. Tôi muốn đạt gì?
2. Hiện tại đang có vấn đề gì?
3. Thực tế MAGASIN đang làm thế nào?
4. Kết quả tôi mong muốn là gì?
5. Có giới hạn/quy tắc đặc biệt nào không?
6. Tôi muốn bạn nghiên cứu / thiết kế / thực hiện / kiểm tra?
7. Khi nào tôi xem là đạt?
```

AI chịu trách nhiệm chuyển 7 câu này thành cấu trúc kỹ thuật phù hợp.

---

# 11. MẪU “YÊU CẦU THỰC HIỆN” CHÍNH THỨC

```text
MAGASIN EXECUTION REQUEST

Task ID: [TASK-XXX]
Domain: [DOMAIN]
Goal: [mục tiêu]
Business Context: [bối cảnh]
Confirmed Rules: [BR-XXX, BR-XXX]
Expected Result: [kết quả phải đạt]
Scope: [phạm vi]
Out of Scope: [không làm]
Implementation: [được phép sửa gì]
Verification: [kiểm tra gì]
Acceptance Criteria: [điều kiện nghiệm thu]

Lệnh:
THỰC HIỆN.
```

---

# 12. MẪU “CHỐT” CỦA OWNER

Khi đồng ý với một kết luận:

```text
CHỐT BR-XXX
Nội dung đúng.
Lưu thành Business Rule chính thức.
```

Khi chưa đúng:

```text
CHƯA CHỐT BR-XXX
Sai ở: ...
Sửa thành: ...
```

Khi cần bổ sung:

```text
BỔ SUNG BR-XXX
Thêm quy tắc: ...
```

---

# 13. CÁCH OWNER KIỂM SOÁT TOÀN BỘ DOANH NGHIỆP

Owner không cần theo dõi từng dòng code.

Chỉ cần quản lý 5 lớp:

```text
1. OBJECTIVE
2. BUSINESS RULES
3. PROCESS / SOP
4. KPI / CONTROL
5. SYSTEM / AUTOMATION
```

Nếu 5 lớp này nhất quán, phần mềm là công cụ thực thi.

---

# 14. “AI KHÔNG ĐƯỢC TỰ Ý THAY ĐỔI MỤC TIÊU”

Mọi công việc phải quy về mục tiêu tối thượng của MAGASIN trong:

`docs/enterprise/MAGASIN_MASTER_OBJECTIVE.md`

Nếu một yêu cầu kỹ thuật làm hệ thống tiện hơn nhưng đi ngược mục tiêu về:

- profitability;
- operational consistency;
- scalability;
- control;
- customer experience;
- sustainable growth;

thì phải nêu xung đột trước khi thực hiện.

---

# 15. QUY TẮC LƯU TRỮ

Có 2 tầng tài liệu:

## Human-readable

Ngôn ngữ dễ đọc cho Owner và đội ngũ.

Mục đích:

- đào tạo;
- quản trị;
- kiểm soát;
- SOP;
- ra quyết định.

## AI-readable

Ngôn ngữ có cấu trúc, ID rõ ràng, trạng thái rõ ràng, dependency rõ ràng.

Mục đích:

- AI đọc nhanh;
- tránh suy diễn;
- truy xuất rule;
- kiểm tra consistency;
- tiếp tục công việc giữa các khung chat.

Một nội dung quan trọng nên tồn tại ở cả hai lớp khi cần.

---

# 16. DASHBOARD KIỂM SOÁT CÔNG VIỆC

Mỗi domain nên có trạng thái:

```text
NOT STARTED
DISCOVERY
RULES CONFIRMED
DESIGN
IMPLEMENTATION
TESTING
COMPLETED
OPERATING
REVIEW DUE
```

Owner chỉ cần nhìn dashboard để biết:

- đang nghiên cứu gì;
- cái gì đã chốt;
- cái gì đang làm;
- cái gì chưa nghiệm thu;
- cái gì đã hoàn thành;
- cái gì cần review lại.

---

# 17. NGUYÊN TẮC CUỐI CÙNG

```text
DO NOT GUESS.
DO NOT CODE BEFORE UNDERSTANDING.
DO NOT CALL SOMETHING COMPLETE BEFORE ACCEPTANCE.
DO NOT KEEP IMPORTANT KNOWLEDGE ONLY IN CHAT.
DO NOT LET LEGACY CODE OVERRIDE CONFIRMED BUSINESS RULES.
ALWAYS TRACE EXECUTION BACK TO THE MASTER OBJECTIVE.
```

### Câu lệnh cốt lõi

> **Hiểu đúng → Chốt đúng → Lưu đúng → Thiết kế đúng → Thực hiện đúng → Kiểm tra đúng → Nghiệm thu → Đánh dấu hoàn thành.**

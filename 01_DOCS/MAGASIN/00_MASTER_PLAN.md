# MAGASIN Enterprise Discovery & Operating System Master Plan

## 1. Mục tiêu

Xây dựng một bộ **Enterprise Operating Source of Truth** của MAGASIN từ chính thực tế vận hành, sau đó chuyển hóa có kiểm soát thành Business Rules → SOP → Data Model → System → Webapp.

Tài liệu này là **bảng kế hoạch điều hành** để theo dõi tiến độ. Kết quả đã chốt được lưu trong chính thư mục `01_DOCS/MAGASIN/`.

## 2. Luồng chuẩn

```text
ENTERPRISE DISCOVERY
        ↓
BUSINESS RULES
        ↓
SOP
        ↓
DATA MODEL
        ↓
SYSTEM ARCHITECTURE
        ↓
WEBAPP / AUTOMATION
        ↓
FIELD VALIDATION
        ↓
GOVERNANCE / CONTINUOUS IMPROVEMENT
```

## 3. Bảng kế hoạch tổng thể

| ID | Phase | Nội dung chính | Mục tiêu đầu ra | Trạng thái | Điều kiện hoàn thành |
|---|---|---|---|---|---|
| P0 | Enterprise Baseline | Xác định MAGASIN hiện tại: mô hình kinh doanh, tổ chức, cửa hàng, công cụ, nguồn dữ liệu, phạm vi | `Enterprise Baseline` | 🔵 Đang chuẩn bị | Các fact nền được xác nhận; assumptions được tách riêng |
| P1 | Enterprise Discovery | Khám phá cách MAGASIN thật sự vận hành theo từng domain | `Discovery Records` | ⚪ Chưa bắt đầu | Các quy trình chính được mô tả bằng FACT; ngoại lệ quan trọng được ghi nhận |
| P2 | Business Rules | Chuyển FACT và DECISION thành quy tắc nghiệp vụ rõ ràng | `Business Rules Register` | ⚪ Chưa bắt đầu | Rule có ID, phạm vi, actor, điều kiện, hành động, ngoại lệ |
| P3 | SOP | Biến Business Rules thành quy trình thực thi cho con người | `SOP Library` | ⚪ Chưa bắt đầu | SOP có người thực hiện, trigger, bước, kiểm tra, đầu ra |
| P4 | Data Model | Xác định dữ liệu cần lưu và quan hệ dữ liệu | `Data Model + Data Dictionary` | ⚪ Chưa bắt đầu | Mỗi entity/field có lý do nghiệp vụ; PK/FK/constraint được chốt |
| P5 | System | Thiết kế hệ thống, permission, workflow, engine, RPC/API theo nghiệp vụ đã chốt | `System Specification` | ⚪ Chưa bắt đầu | Kiến trúc không tạo ngược Business Rules từ giới hạn code |
| P6 | Webapp | Implement các module theo System Specification | `Production Webapp` | ⚪ Chưa bắt đầu | Code/UI bám rule, SOP và data model; không patch-chain |
| P7 | Field Validation | Đưa hệ thống vào thử nghiệm thực tế tại MAGASIN và đối chiếu nghiệp vụ | `Validation Findings` | ⚪ Chưa bắt đầu | Các sai lệch được phân loại theo Discovery/Rule/SOP/Data/System/UI |
| P8 | Governance | Quản lý thay đổi và duy trì source of truth | `Change Control` | ⚪ Chưa bắt đầu | Mọi thay đổi nghiệp vụ có traceability xuyên các tầng |

## 4. Thứ tự Enterprise Discovery

| ID | Domain | Câu hỏi trọng tâm | Trạng thái |
|---|---|---|---|
| D01 | Enterprise Baseline | MAGASIN là doanh nghiệp gì, đang kinh doanh và vận hành trong phạm vi nào? | 🔵 Đang chuẩn bị |
| D02 | Organization | Ai làm gì? Quyền hạn và trách nhiệm thực tế ra sao? | ⚪ |
| D03 | Store Operation | Một cửa hàng vận hành từ mở cửa đến đóng cửa như thế nào? | ⚪ |
| D04 | Workforce | Nhân sự được tuyển, phân công, đăng ký, điều phối và quản lý như thế nào? | ⚪ |
| D05 | Schedule | Lịch làm được tạo, kiểm tra, chỉnh sửa và công bố như thế nào? | ⚪ |
| D06 | Attendance | Nhân viên vào ca, chấm công, xác nhận và xử lý sai lệch như thế nào? | ⚪ |
| D07 | Inventory | Hàng hóa đi từ mua/nhập đến kho, cửa hàng, tiêu hao và kiểm kê như thế nào? | ⚪ |
| D08 | Sales | Đơn hàng, thanh toán, giao hàng và doanh thu phát sinh như thế nào? | ⚪ |
| D09 | Finance | Doanh thu, giá vốn, lương, chi phí, lợi nhuận và dòng tiền được quản lý như thế nào? | ⚪ |
| D10 | Customer & Marketing | Khách hàng, thành viên, voucher, promotion và retention vận hành ra sao? | ⚪ |
| D11 | Management | KPI, báo cáo, kiểm soát và quyết định quản trị được thực hiện như thế nào? | ⚪ |
| D12 | Technology | MAGASIN đang sử dụng những hệ thống nào, dữ liệu nằm ở đâu và luồng tích hợp thế nào? | ⚪ |

## 5. Phương pháp Discovery chuẩn

Mỗi vấn đề phải được khảo sát theo chuỗi:

```text
WHO → WHEN → TRIGGER → WHAT → HOW → DATA → DECISION → EXCEPTION → OUTPUT
```

Mỗi phát hiện phải được gắn trạng thái:

```text
FACT / ASSUMPTION / RULE / DECISION
```

Không nâng một ASSUMPTION thành RULE nếu chưa được MAGASIN xác nhận.

## 6. Tiêu chuẩn chuyển Phase

### P0 → P1
Enterprise Baseline đủ để biết phạm vi Discovery và các đối tượng cần xác minh.

### P1 → P2
Các quy trình thực tế chính đã được khám phá, các FACT quan trọng đã xác nhận và assumptions còn tồn tại được đánh dấu.

### P2 → P3
Business Rules được chốt và có traceability về Discovery/Decision.

### P3 → P4
SOP đủ chi tiết để xác định actor, sự kiện, trạng thái và dữ liệu phát sinh.

### P4 → P5
Data Model được chốt ở mức nghiệp vụ; không còn phụ thuộc vào UI hiện tại.

### P5 → P6
System Specification đã xác định permission, workflow, engines, integrations và acceptance criteria.

### P6 → P7
Webapp chạy được trong môi trường kiểm thử/thực tế.

### P7 → P8
Các phát hiện thực địa đã được xử lý hoặc chuyển thành change request có kiểm soát.

## 7. Quy tắc thay đổi

Khi phát hiện webapp không phù hợp thực tế, không mặc định sửa UI trước. Truy ngược:

```text
UI
↑
SYSTEM
↑
DATA
↑
SOP
↑
BUSINESS RULE
↑
DISCOVERY
```

Xác định tầng sai trước khi chỉnh sửa.

## 8. Định nghĩa trạng thái kế hoạch

- 🔵 **Đang chuẩn bị / đang thực hiện**
- 🟡 **Chờ xác nhận**
- 🟢 **Đã chốt**
- 🔴 **Có vấn đề / cần xử lý**
- ⚪ **Chưa bắt đầu**

## 9. Nhật ký tiến độ

| Ngày | Công việc | Kết quả | Người xác nhận | Ghi chú |
|---|---|---|---|---|
| 2026-09-04 | Khởi tạo Enterprise Discovery framework | Tạo thư mục `MAGASIN/` và Master Plan | Owner / MAGASIN | Bắt đầu từ P0 |

## 10. Quy tắc cuối cùng

**MAGASIN thực tế là nguồn gốc.**

Code hiện tại chỉ là implementation hiện hữu và có thể sai. Database hiện tại chỉ là cấu trúc hiện hữu và có thể thiếu/thừa. UI hiện tại chỉ là giao diện hiện hữu.

Mọi hệ thống tương lai phải trace ngược được về Discovery → Business Rule → SOP → Data Model.

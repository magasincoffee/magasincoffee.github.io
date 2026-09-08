# ED-001 — Câu 107: Database MAGASIN hiện đang xây dựng

## 1. Purpose

Ghi nhận evidence do Owner xác nhận về hiện trạng Google Sheets “database tạm” và định hướng Supabase tương lai.

**Lưu ý:** Đây là discovery evidence. Nội dung chưa tự động trở thành Business Rule, Data Model hay System Specification.

## 2. Evidence — Owner confirmed

| # | Nội dung | Evidence xác nhận | Classification |
|---|---|---|---|
| 1 | Cấu trúc file hiện tại | Kết hợp file theo nghiệp vụ + chi nhánh | FACT |
| 2 | Kết nối dữ liệu | IMPORTRANGE, QUERY, FILTER, VLOOKUP/XLOOKUP, ARRAYFORMULA và kết hợp nhiều cách | FACT |
| 3 | ID duy nhất | Chưa có ID duy nhất cho các đối tượng | FACT / DATA GAP |
| 4 | Master Data hiện có | Nhân viên, Sản phẩm, Công thức, Ca làm | FACT |
| 5 | Tạo/thêm Master Data | Chủ | FACT |
| 6 | Xóa Master Data | Chủ | FACT |
| 7 | Đối tượng ngừng sử dụng | Xóa khỏi Sheet | FACT / HISTORY GAP |
| 8 | Lịch sử giao dịch | Chỉ lưu trạng thái cuối cùng | FACT / AUDIT GAP |
| 9 | Lịch sử tồn kho | Ví dụ 20 → 18: chỉ còn 18 | FACT / AUDIT GAP |
| 10 | Lịch sử bậc nhân viên | Ví dụ bậc 1 → bậc 2: chỉ lưu bậc hiện tại | FACT / AUDIT GAP |
| 11 | Khóa dữ liệu sau chốt | Không khóa | FACT / CONTROL GAP |
| 12 | Sửa dữ liệu lịch sử | Sửa trực tiếp dữ liệu cũ | FACT / AUDIT GAP |
| 13 | Data dictionary / catalog | Chưa có danh sách bảng/Sheet + ý nghĩa + owner | FACT / DATA GOVERNANCE GAP |
| 14 | Chiến lược chuyển sang Supabase | Thiết kế lại từ nghiệp vụ thực tế | OWNER DIRECTION |
| 15 | Mục tiêu Supabase | Backend + Single Source of Truth + tích hợp hệ thống | OWNER DIRECTION |

## 3. Key implications surfaced by discovery

### 3.1 Current-state architecture

Google Sheets đang đóng vai trò dữ liệu vận hành chính nhưng cấu trúc phân tán theo nghiệp vụ/chi nhánh và liên kết bằng nhiều lớp công thức.

### 3.2 Identity gap

Chưa có ID duy nhất cho nhân viên, chi nhánh, sản phẩm, nhà cung cấp, đơn hàng và các giao dịch. Đây là khoảng trống quan trọng cần được xử lý trước khi thiết kế Data Model chuẩn.

### 3.3 History / audit gap

Hiện tại dữ liệu chủ yếu lưu trạng thái cuối cùng; không có lịch sử nghiệp vụ chuẩn cho tồn kho, thay đổi bậc nhân viên, sửa dữ liệu lịch sử hay đóng kỳ.

### 3.4 Master-data governance gap

Master Data hiện chỉ tập trung ở một số đối tượng; chưa có catalog/data dictionary; quyền tạo/xóa tập trung ở Owner; đối tượng ngừng sử dụng hiện được xóa khỏi Sheet thay vì giữ trạng thái lịch sử.

### 3.5 Future-state direction

Owner xác nhận không muốn bê nguyên logic Google Sheets sang Supabase. Định hướng là thiết kế lại dựa trên nghiệp vụ thực tế, trong đó Supabase phục vụ đồng thời backend, Single Source of Truth và tích hợp hệ thống.

## 4. Discovery classification

- **FACT:** hiện trạng Google Sheets, công thức kết nối, thiếu ID, cách lưu Master Data, quyền Owner, cách sửa/xóa, trạng thái lịch sử và khóa dữ liệu.
- **DATA GAP:** thiếu định danh chuẩn, audit/history, data dictionary, lifecycle cho master data.
- **CONTROL GAP:** chưa có khóa sau chốt và sửa trực tiếp dữ liệu lịch sử.
- **OWNER DIRECTION:** Supabase sẽ được thiết kế lại từ nghiệp vụ thực tế và trở thành backend + SSOT + integration layer.

## 5. Gate implication

C107 củng cố rằng **Data Model và System Architecture chưa được phép chốt** ở thời điểm này. Discovery cần tiếp tục làm rõ:

1. Toàn bộ object/master data cần quản lý.
2. Các ID nghiệp vụ cần tồn tại.
3. Transaction/history/audit cần lưu.
4. Lifecycle active/inactive của master data.
5. Quy tắc chốt kỳ và chỉnh sửa sau chốt.
6. Nguồn sự thật theo từng domain trong giai đoạn chuyển tiếp.

**Current phase:** P0 — Enterprise Baseline / Enterprise Discovery #001

**Status:** OPEN — discovery tiếp tục.

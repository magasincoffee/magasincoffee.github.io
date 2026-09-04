# ED-001 — MAGASIN Enterprise Baseline

## 1. Purpose

Thiết lập baseline ban đầu cho Enterprise Discovery #001. Tài liệu này **không thiết kế giải pháp phần mềm** và chưa tạo Business Rule.

Trạng thái hiện tại của toàn bộ record là `OPEN` cho đến khi MAGASIN/Owner xác nhận.

## 2. Discovery scope

| ID | Domain | Statement | Type | Actor | Trigger | Process | Data | Decision | Exception | Evidence | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|
| ED-001-01 | Enterprise Baseline | MAGASIN COFFEE là doanh nghiệp F&B tại Cần Thơ, cần số hóa hoạt động vận hành nội bộ. | ASSUMPTION | Owner / Management | Bắt đầu chương trình chuyển đổi số | Chưa xác minh đầy đủ phạm vi pháp lý, mô hình vận hành và đơn vị kinh doanh | Thông tin doanh nghiệp | Owner xác nhận phạm vi Enterprise | Có thể tồn tại nhiều pháp nhân/đơn vị vận hành | Owner-provided project context; cần xác minh trực tiếp | OPEN |
| ED-001-02 | Enterprise Baseline | MAGASIN vận hành nhiều cửa hàng/chi nhánh và có hoạt động kho/điều phối liên quan. | ASSUMPTION | Owner / Store teams | Hoạt động kinh doanh thường nhật | Cần xác minh số lượng store, kho, vai trò và quan hệ vận hành | Store, warehouse, organization | Xác định network thực tế | Cửa hàng có thể thay đổi theo thời gian | Existing project context; cần xác minh | OPEN |
| ED-001-03 | Enterprise Baseline | Hoạt động vận hành gồm tối thiểu Workforce, Store Operation, Inventory, Sales, Finance, Customer/Marketing và Management. | ASSUMPTION | Owner / Functional owners | Enterprise Discovery | Xác định domain và phạm vi từng domain | Quy trình, master data, transactions | Xác định domain nào thuộc scope hệ thống | Một số chức năng có thể nằm ngoài hệ thống | Master Plan domain map; cần xác minh scope thực tế | OPEN |
| ED-001-04 | Enterprise Baseline | MAGASIN hiện đang sử dụng nhiều công cụ/hệ thống thay vì một nguồn dữ liệu duy nhất. | ASSUMPTION | Owner / Staff | Phát sinh nghiệp vụ | Ghi nhận hệ thống, file, ứng dụng và nơi lưu dữ liệu | System, account, file, database | Xác định system-of-record theo từng dữ liệu | Dữ liệu có thể trùng lặp hoặc lệch nhau | Existing project context; cần inventory thực tế | OPEN |
| ED-001-05 | Enterprise Baseline | Nguồn sự thật nghiệp vụ phải là thực tế MAGASIN; code/UI/database hiện tại chỉ là implementation hiện hữu. | FACT | Owner / Project governance | Khi phát hiện sai lệch | Truy ngược UI → System → Data → SOP → Business Rule → Discovery | Discovery records, decisions, change log | Tầng nào là nguồn gây sai lệch | Có thể cần giữ compatibility trong hệ thống cũ | DEC-001; Master Plan; Current State | VALIDATED |
| ED-001-06 | Enterprise Baseline | Chuỗi chuyển hóa của dự án là Discovery → Business Rules → SOP → Data Model → System → Webapp. | FACT | Owner / Project governance | Mọi thay đổi nghiệp vụ | Hoàn thành tầng trước rồi mới chuyển tầng sau | Discovery, Rule, SOP, Model, System, Webapp | Gate chuyển phase | Không bỏ qua gate | DEC-001; Master Plan | VALIDATED |

## 3. Baseline verification checklist

### 3.1 Enterprise identity

- Tên pháp lý / tên thương hiệu thực tế.
- Mô hình kinh doanh và các đơn vị kinh doanh thuộc scope.
- Địa bàn hoạt động.
- Người có quyền chốt nghiệp vụ và người chịu trách nhiệm từng domain.

### 3.2 Organization

- Owner / Management / Store Manager / Employee thực tế.
- Quyền quyết định khác nhau giữa các vai trò.
- Người được phép phê duyệt, thay đổi hoặc hủy dữ liệu ở từng nghiệp vụ.

### 3.3 Operating network

- Số cửa hàng đang hoạt động.
- Cửa hàng nào có manager riêng.
- Kho trung tâm / kho cửa hàng.
- Giờ hoạt động thực tế và các khung vận hành đặc biệt.

### 3.4 Systems and data

- POS hiện dùng.
- Kênh đặt hàng/delivery.
- Google Sheets / Excel / Forms / Drive hoặc công cụ khác.
- Database hiện tại.
- Integration hiện có.
- System-of-record của: nhân sự, lịch, chấm công, tồn kho, đơn hàng, doanh thu, khách hàng, khuyến mãi.

### 3.5 Financial baseline

- Doanh thu được ghi nhận ở đâu.
- Giá vốn, lương, chi phí vận hành và lợi nhuận được xác định như thế nào.
- Chu kỳ chốt số và người chịu trách nhiệm.

## 4. Evidence standard

Một statement chỉ được nâng từ `ASSUMPTION` thành `FACT` khi có bằng chứng từ MAGASIN, ví dụ:

- Owner/functional owner xác nhận trực tiếp.
- SOP hiện hành của MAGASIN.
- Báo cáo vận hành hoặc dữ liệu thực tế.
- Tài liệu/hợp đồng/hồ sơ nội bộ có thể kiểm chứng.
- Quan sát quy trình thực tế.

Code/UI/database chỉ được xem là **evidence của implementation hiện tại**, không phải tự động là business truth.

## 5. Gate to P1

ED-001 chỉ được coi là hoàn thành khi:

1. Phạm vi Enterprise đã được Owner xác nhận.
2. Organization và operating network tối thiểu đã xác nhận.
3. Các system/data source chính đã được inventory.
4. Các ASSUMPTION còn lại được liệt kê rõ và có owner để xác minh.
5. Có đủ baseline để bắt đầu D02–D12 mà không phải suy đoán phạm vi.

## 6. Next discovery action

**Không viết Business Rules.**

Tiếp tục xác minh các baseline record `OPEN`, ưu tiên theo thứ tự:

`Enterprise identity → Organization → Store network → Systems/Data → Financial baseline`.

Sau khi baseline đủ bằng chứng mới chuyển sang Discovery domain D02–D12.

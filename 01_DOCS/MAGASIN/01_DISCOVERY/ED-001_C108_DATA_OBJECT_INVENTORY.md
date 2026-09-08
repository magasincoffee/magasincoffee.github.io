# ED-001 — C108 Data Object Inventory

## Purpose

Ghi nhận inventory đối tượng dữ liệu do Owner xác nhận trong Enterprise Discovery. Nội dung dưới đây là **discovery evidence**, chưa phải Business Rule và chưa phải Data Model kỹ thuật.

## C108 — Data Object Inventory

### 1. Con người
- Nhân viên
- Quản lý tổng
- Chủ
- Khách hàng
- Nhà cung cấp
- Có đối tượng con người khác chưa định danh cụ thể (`Other`)

### 2. Tổ chức / địa điểm
- Chi nhánh
- Kho
- Có đối tượng khác chưa định danh cụ thể (`Other`)

### 3. Sản phẩm
- Sản phẩm bán
- Nguyên vật liệu
- Topping
- Bao bì
- Dụng cụ / tài sản
- Có đối tượng khác chưa định danh cụ thể (`Other`)

### 4. Vận hành
- Ca làm
- Lịch làm
- Chấm công
- Điều chuyển nhân viên
- Bàn giao ca
- Sự cố
- Kiểm tra chất lượng
- Có đối tượng vận hành khác chưa định danh cụ thể (`Other`)

### 5. Kho
- Phiếu nhập
- Phiếu xuất
- Điều chuyển kho → chi nhánh
- Điều chuyển chi nhánh ↔ chi nhánh
- Tồn kho
- Kiểm kê
- Hao hụt
- Điều chỉnh tồn
- Có đối tượng kho khác chưa định danh cụ thể (`Other`)

### 6. Bán hàng
- Đơn hàng
- Chi tiết đơn hàng
- Thanh toán
- Hủy đơn
- Hoàn tiền
- Giảm giá / khuyến mãi
- Giao hàng
- Có đối tượng bán hàng khác chưa định danh cụ thể (`Other`)

### 7. Tài chính
- Doanh thu
- Chi phí
- Công nợ phải trả
- Lương
- Thưởng
- Phạt / khấu trừ
- Tiền mặt
- Ngân hàng
- MoMo
- Không xác nhận công nợ phải thu là object hiện hữu cần quản lý tại thời điểm C108
- Có đối tượng tài chính khác chưa định danh cụ thể (`Other`)

### 8. Khách hàng / Marketing
- Hồ sơ khách hàng
- Lịch sử mua hàng
- Điểm thành viên
- Thẻ thành viên
- Voucher
- Chương trình khuyến mãi
- Chiến dịch marketing
- Kết quả chiến dịch

### 9. Quản trị dữ liệu
- Người tạo dữ liệu
- Người sửa dữ liệu
- Lịch sử thay đổi
- Nhật ký thao tác
- Chốt kỳ
- Điều chỉnh sau chốt

## Classification

**FACT / DISCOVERY EVIDENCE:** Owner xác nhận các nhóm object trên thuộc phạm vi dữ liệu cần quản lý hoặc được xác định là có tồn tại trong hoạt động MAGASIN.

**GAP:** Các mục `Other` chưa được định danh cụ thể và chưa xác định ranh giới giữa object độc lập, thuộc tính, trạng thái hoặc transaction.

**IMPORTANT:** C108 không quyết định cấu trúc bảng, khóa chính, quan hệ, lifecycle hoặc cách triển khai Supabase. Những nội dung đó chỉ được xác định sau khi discovery và Business Rules đủ chín.

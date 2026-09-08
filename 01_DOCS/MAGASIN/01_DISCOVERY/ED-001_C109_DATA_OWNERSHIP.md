# ED-001 — C109 Data Ownership

## Purpose

Ghi nhận evidence từ Owner trong Enterprise Discovery #001 về người chịu trách nhiệm nghiệp vụ chính đối với các nhóm dữ liệu MAGASIN.

Đây là **discovery evidence**, chưa tự động trở thành Business Rule hoặc permission matrix kỹ thuật.

## C109.1–C109.11 — Data Owner nghiệp vụ

| Data domain | Business Owner | Classification |
|---|---|---|
| Nhân viên | Chủ + Quản lý tổng | FACT |
| Chi nhánh | Quản lý tổng | FACT |
| Kho / tồn kho | Quản lý tổng | FACT |
| Sản phẩm / công thức | Chủ | FACT |
| Lịch làm / chấm công | Quản lý tổng | FACT |
| Đơn hàng / doanh thu | Chủ + Quản lý tổng | FACT |
| Chi phí / công nợ / tiền | Chủ + Quản lý tổng | FACT |
| Khách hàng / thành viên | Chủ + Quản lý tổng | FACT |
| Khuyến mãi / Voucher | Chủ | FACT |
| Marketing / chiến dịch | Chủ | FACT |
| Quản trị dữ liệu / lịch sử / chốt kỳ | Chủ | FACT |

## C109.12 — Quyền chốt cuối khi dữ liệu quan trọng bị sai

**Owner xác nhận: Chủ có quyền chốt cuối** khi dữ liệu quan trọng bị sai và phát sinh tranh chấp hoặc không xác định được cách xử lý.

Classification: **FACT**.

## Boundary

Data Ownership ở đây mô tả **trách nhiệm nghiệp vụ chính và quyền quyết định cuối cùng**, chưa xác định chi tiết quyền `Create / Read / Update / Delete / Approve` cho từng đối tượng dữ liệu.

## Traceability

Nguồn: Owner response — Câu 109 và Câu 109.12 trong Enterprise Discovery session.

Trạng thái: **OPEN** cho đến khi phase gate của Enterprise Discovery xác nhận đầy đủ baseline.

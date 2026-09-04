# 01_DISCOVERY

Khu vực lưu **sự thật vận hành** được khám phá từ MAGASIN.

## Nguyên tắc

Discovery không phải nơi viết giải pháp phần mềm. Mỗi record mô tả MAGASIN đang làm gì hoặc một giả định cần xác minh.

## Record tối thiểu

| Trường | Nội dung |
|---|---|
| ID | `ED-...` |
| Domain | Domain nghiệp vụ |
| Statement | Phát hiện/sự thật cần ghi nhận |
| Type | `FACT` / `ASSUMPTION` |
| Actor | Người/bộ phận liên quan |
| Trigger | Điều làm quy trình bắt đầu |
| Process | Các bước thực tế |
| Data | Dữ liệu phát sinh/sử dụng |
| Decision | Điểm ra quyết định |
| Exception | Trường hợp ngoại lệ |
| Evidence | Căn cứ xác nhận |
| Status | `OPEN` / `VALIDATED` / `REJECTED` |

Chỉ record `VALIDATED FACT` mới được dùng làm nền cho Business Rules, trừ khi một `DECISION` mới được Owner chốt rõ ràng.

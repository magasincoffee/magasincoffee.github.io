# MAGASIN — OWNER WORK CONTROL

## Mục tiêu

Tài liệu này là bảng điều khiển làm việc dành cho Owner để kiểm soát việc khám phá, thiết kế, thực hiện, kiểm tra và hoàn tất các công việc với AI.

## Quy trình chuẩn

```text
1. REQUEST
2. DISCOVER
3. CONFIRM
4. DOCUMENT
5. DESIGN
6. EXECUTE
7. TEST
8. ACCEPT
9. CLOSE
10. OPERATE & REVIEW
```

## Khi nào ra yêu cầu?

### Yêu cầu nghiên cứu
Dùng khi chưa rõ vấn đề hoặc cần benchmark. Không sửa hệ thống.

### Yêu cầu khám phá
Dùng khi AI cần hỏi Owner để hiểu thực tế MAGASIN. Không sửa hệ thống.

### Yêu cầu thiết kế
Chỉ dùng sau khi facts/business rules đã đủ và được xác nhận. Chưa sửa hệ thống.

### Yêu cầu thực hiện
Chỉ dùng sau khi design đã chốt. AI được phép thực hiện trong phạm vi nêu rõ.

### Yêu cầu nghiệm thu
Dùng sau khi implementation hoàn tất. AI phải kiểm tra độc lập và trả PASS/FAIL/REVISION REQUIRED.

## Khi nào lưu?

- Fact quan trọng: lưu khi cần dùng lại hoặc ảnh hưởng quyết định.
- Business Rule: bắt buộc lưu sau khi Owner chốt.
- Design: lưu trước khi execution.
- Execution result: lưu sau khi thực hiện.
- Test result: lưu sau kiểm tra.
- Acceptance: lưu khi Owner nghiệm thu.

## Khi nào đánh dấu hoàn thành?

Chỉ `COMPLETED` khi:

```text
SCOPE CONFIRMED
+ BUSINESS RULE CONFIRMED
+ DESIGN CONFIRMED
+ IMPLEMENTED
+ TEST PASS
+ OWNER ACCEPTED
+ DOCUMENT UPDATED
```

## Trạng thái chuẩn

`REQUESTED` → `DISCOVERY` → `DRAFT` → `CONFIRMED` → `DOCUMENTED` → `DESIGNED` → `IN_PROGRESS` → `TESTING` → `ACCEPTED` → `COMPLETED` → `OPERATING` → `REVIEW`

## Mẫu yêu cầu ngắn cho Owner

```text
[LOẠI] — [CHỦ ĐỀ]

Mục tiêu: ...
Bối cảnh thực tế: ...
Kết quả mong muốn: ...
Phạm vi: ...
Không làm: ...
Căn cứ đã chốt: ...
Kiểm tra phải đạt: ...

Lệnh: NGHIÊN CỨU / KHÁM PHÁ / THIẾT KẾ / THỰC HIỆN / NGHIỆM THU
```

## Mẫu chốt

```text
CHỐT: BR-XXX
Nội dung: ĐÚNG.
Lưu chính thức.
```

```text
NGHIỆM THU: TASK-XXX
Kết quả: ACCEPTED.
Đánh dấu COMPLETED.
```

## Nguyên tắc kiểm soát

1. Không để kiến thức quan trọng chỉ nằm trong chat.
2. Không code từ yêu cầu mơ hồ.
3. Không đánh dấu hoàn thành khi chưa nghiệm thu.
4. Không để code legacy trở thành nguồn sự thật.
5. Mọi thay đổi phải truy được về mục tiêu tối thượng và Business Rule.
6. Một khung chat mới phải đọc tài liệu enterprise trước khi tiếp tục.

## Quy ước Owner → AI

Owner nói **THỰC HIỆN** khi đã có đủ căn cứ và muốn thay đổi hệ thống.
Owner nói **NGHIÊN CỨU** khi muốn biết trước.
Owner nói **KHÁM PHÁ** khi muốn AI hỏi để hiểu doanh nghiệp.
Owner nói **THIẾT KẾ** khi muốn có phương án nhưng chưa triển khai.
Owner nói **NGHIỆM THU** khi muốn kiểm tra một kết quả đã làm.

**Không cần dùng thuật ngữ kỹ thuật. Owner mô tả mục tiêu và thực tế; AI chịu trách nhiệm chuyển thành quy trình, tài liệu, dữ liệu và kỹ thuật phù hợp.**

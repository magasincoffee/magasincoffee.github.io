# ED-001 — Discovery Rebaseline & Stop Condition

## 1. Purpose

Tài liệu này xác định lại phạm vi và điểm kết thúc thực tế của Enterprise Discovery #001 sau khi rà soát toàn bộ project documentation và evidence C01–C114.

Mục tiêu là ngăn Discovery biến thành chuỗi câu hỏi vô hạn hoặc đi quá sâu vào Business Rules / System Design trước Gate.

## 2. Findings

Master Plan xác định P0 chỉ cần đủ Enterprise Baseline để biết phạm vi Discovery, organization/network tối thiểu, system/data sources chính và các assumptions còn lại có owner xác minh. P1 mới là nơi khám phá chi tiết các domain D02–D12. Không cần hoàn tất toàn bộ governance semantics ở P0.

Các câu hỏi trước đây C01–C114 đã thu thập một lượng lớn evidence thuộc D02–D11, mặc dù tài liệu Current State hiện vẫn đánh dấu các domain này là `Not started`. Vì vậy, không được hỏi lại từ đầu. Evidence hiện có phải được tái phân loại vào đúng domain trước khi đặt câu hỏi mới.

## 3. Rebaseline decision

### P0 — Enterprise Baseline

P0 được coi là đã có đủ thông tin để vào `P0 Gate Review` vì hiện đã xác định được:

- Mô hình vận hành cốt lõi và phạm vi doanh nghiệp đang được khảo sát.
- 4 chi nhánh + 1 kho và các actor chính.
- Owner / GM / Employee và nhiều trách nhiệm, quyền quyết định thực tế.
- Hệ thống hiện tại: Sapo, marketplace, Google Sheets/Forms, Zalo, Facebook, TikTok, MoMo, bank và database tương lai.
- Nguồn dữ liệu hiện tại và các điểm phân tán/conflict.
- Phạm vi data object rộng của hệ thống tương lai.
- Data ownership và decision authority cơ bản.
- Target-state audit / close / post-close correction ở mức quản trị.

Các assumptions pháp lý hoặc các chi tiết chưa cần thiết để xác định operational discovery scope phải được giữ `OPEN`, không dùng làm lý do kéo dài questionnaire vô hạn.

## 4. What remains

Không tiếp tục hỏi các vi chi tiết governance trong P0.

Thay vào đó:

1. Thực hiện P0 Gate Review.
2. Tái phân loại C01–C114 vào D02–D12.
3. Mỗi domain D02–D12 chỉ hỏi các **material gap** còn thiếu để mô tả process thực tế theo `WHO → WHEN → TRIGGER → WHAT → HOW → DATA → DECISION → EXCEPTION → OUTPUT`.
4. Khi một domain đạt đủ coverage, đóng domain đó và chuyển domain kế tiếp.
5. Sau khi các domain chính đủ, P1 Gate Review rồi mới chuyển P2 Business Rules.

## 5. Domain discovery exit criteria

Một domain được coi là đủ để đóng khi đã biết tối thiểu:

- actor chính và actor phê duyệt;
- trigger và các trạng thái quan trọng;
- quy trình thực tế end-to-end;
- dữ liệu phát sinh và nguồn dữ liệu hiện tại;
- decision points;
- các exception/material edge cases;
- output hoặc kết quả;
- các GAP/CONFLICT còn lại được ghi rõ.

Không yêu cầu biết trước field-level schema, PK/FK, API, UI hay implementation.

## 6. Question policy from now on

- Mỗi lần chỉ hỏi 1 câu nhóm có mục tiêu rõ.
- Không hỏi lại evidence đã có.
- Không hỏi thiết kế database trong Discovery.
- Không hỏi workflow kỹ thuật trong Discovery.
- Không biến target-state thành current-state FACT.
- Khi đủ coverage thì **đóng domain**, không tiếp tục khai thác vô hạn.

## 7. Current position

C114 đã được ghi nhận riêng. Sau C114, questionnaire tạm dừng để thực hiện rebaseline.

Next action: `P0 Gate Review → evidence mapping C01–C114 → D02–D12 material-gap discovery`.

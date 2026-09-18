# MAGASIN Change Log

Theo dõi thay đổi đối với bộ Enterprise Source of Truth.

| ID | Date | Change | Affected Layer | Reason | Related IDs | Status |
|---|---|---|---|---|---|---|
| CHG-001 | 2026-09-04 | Khởi tạo khu vực `MAGASIN/` và Master Plan | Governance / Documentation | Bắt đầu Enterprise Discovery | DEC-001 | COMPLETED |
| CHG-002 | 2026-09-04 | Thêm `00_CURRENT_STATE.md` và `00_CHATGPT_CONTEXT.md`; cập nhật README để làm chuẩn handoff giữa các session | Governance / Documentation | Duy trì trạng thái và tính nhất quán khi tiếp tục dự án ở chat mới | DEC-001 | COMPLETED |
| CHG-003 | 2026-09-18 | Chốt Business OS V1 21 ngày; thêm Blueprint, machine-readable Project State, Task Queue và Supervisor Robot contract; cập nhật Current State/Master Plan/ChatGPT Context | Governance / Architecture / Delivery | Thực thi liên tục theo micro-task và giảm phụ thuộc Owner phải ngồi chờ từng lượt | DEC-002 | COMPLETED |
| CHG-004 | 2026-09-18 | Hoàn thiện Supervisor Robot V1: real Chrome/CDP, project-state gate, Continue/safe Retry, reconnect, anti-duplicate loop, START/STOP kill switch và persistent local runtime | Automation / Governance / QA | Loại bỏ nhu cầu Owner ngồi chờ và gõ “tiếp tục” sau từng lượt; vẫn giữ approval boundary | DEC-002 | COMPLETED |
| CHG-005 | 2026-09-18 | Thay START/STOP rời rạc bằng một bảng `MAGASIN BUSINESS OS CONTROL`; thêm runtime status privacy-safe cho task/action/UI/error và background START | Automation / Operator UX / Governance | Chuẩn hóa đúng project MAGASIN Business OS và cho Owner theo dõi robot mà không phải mở PowerShell | DEC-002 | COMPLETED |
| CHG-006 | 2026-09-18 | Chốt review nền Store/Product: shared location identity, enterprise item taxonomy, unit conversion và recipe relationship tối thiểu; giữ pricing/stock/full recipe ngoài scope | Discovery / Data Foundation | Tạo identity foundation dùng chung cho các vertical slice mà không bê nguyên Google Sheets/procurement schema thành business truth | DEC-002 / C86 / C93 / C106–C109 | COMPLETED |
| CHG-007 | 2026-09-18 | Chốt database baseline/migration plan cho Store/Product theo expand→map→migrate→contract; production apply cần live schema inventory + Owner approval | Database / Delivery / QA | Giảm migration risk vì repo hiện chưa chứa full reproducible Supabase baseline và procurement taxonomy chưa phải enterprise taxonomy | DEC-002 / TASK-009 | COMPLETED |

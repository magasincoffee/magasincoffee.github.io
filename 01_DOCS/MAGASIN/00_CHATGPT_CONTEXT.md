# MAGASIN — ChatGPT Project Context

## 1. Project identity

- Project: MAGASIN Coffee Digital Transformation
- Business: MAGASIN COFFEE — Cần Thơ, Việt Nam
- Repository: `magasincoffee/magasincoffee.github.io`
- Primary branch: `main`

## 2. Primary objective

Xây dựng hệ thống vận hành số cho MAGASIN theo chuỗi:

`ENTERPRISE DISCOVERY → BUSINESS RULES → SOP → DATA MODEL → SYSTEM → WEBAPP`

Đây là nguyên tắc bắt buộc xuyên suốt dự án.

## 3. Source of truth

**Doanh nghiệp thực tế là nguồn sự thật.**

Không mặc định rằng UI, code hoặc database hiện tại phản ánh đúng nghiệp vụ. Khi phát hiện sai lệch, phải truy ngược từ:

`UI → System → Data → SOP → Business Rule → Discovery`

xác định tầng sai trước khi sửa.

## 4. Information status

- `FACT`: đã xác nhận MAGASIN đang vận hành như vậy.
- `ASSUMPTION`: giả định, chưa xác nhận.
- `RULE`: quy định doanh nghiệp đã được chốt.
- `DECISION`: quyết định quản trị đã được chốt.
- `EXCEPTION`: trường hợp ngoại lệ cần ghi nhận riêng.

Không biến ASSUMPTION thành FACT/RULE nếu chưa được xác nhận.

## 5. Master documentation area

Tất cả kế hoạch, Discovery và dữ liệu nghiệp vụ đã chốt thuộc:

`01_DOCS/MAGASIN/`

Cấu trúc:

```text
01_DOCS/MAGASIN/
├── README.md
├── 00_CURRENT_STATE.md
├── 00_MASTER_PLAN.md
├── 00_CHATGPT_CONTEXT.md
├── 01_DISCOVERY/
├── 02_BUSINESS_RULES/
├── 03_SOP/
├── 04_DATA_MODEL/
├── 05_SYSTEM/
├── 06_DECISION_LOG.md
└── 07_CHANGE_LOG.md
```

## 6. Master plan

Đọc `00_MASTER_PLAN.md` để biết phase, domain, điều kiện hoàn thành và tiến độ.

Current phase:

`P0 — Enterprise Baseline / chuẩn bị Discovery`

Current task:

`Enterprise Discovery #001 — MAGASIN Enterprise Baseline`

## 7. Current repository architecture

Root canonical structure:

```text
.github/
.nojekyll
index.html
01_DOCS/
02_CORE/
03_PLATFORM/
04_OWNER/
05_MANAGER/
06_EMPLOYEE/
07_DATABASE/
08_INTEGRATIONS/
99_LEGACY/
```

Không tạo lại các root folder cũ như `core/`, `docs/`, `employee/`, `manager/`, `owner/`, `supabase/`, `legacy/`.

Không tạo patch-chain kiểu `v2`, `v3`, `v4`, `fix`, `final`, `cleanup` cho implementation canonical.

## 8. Current portals

- Owner: `04_OWNER/`
- Owner Workforce: `04_OWNER/Workforce/`
- Manager: `05_MANAGER/` — hiện còn compatibility layer trong `05_MANAGER/runtime/compat/`, chưa được coi là refactor hoàn chỉnh.
- Employee: `06_EMPLOYEE/`

## 9. Shared Core

Canonical shared core:

`02_CORE/shared/shared-core-v1.js`

Shared Core chỉ chứa cross-system concerns như Auth/Session, Authorization/Role, Supabase, Store, Date/Week, Time, Router và UI primitives. Không đưa business logic riêng của Workforce vào Shared Core.

## 10. Workforce context already discussed

Workforce intent:

- `Demand`: xác định số nhân sự cần theo nhu cầu thực tế.
- `Review`: review employee registrations và xử lý branch transfer.
- `Publish`: tạo official schedule theo từng store.

Employee workflow:

`Register availability → scheduling/review → resolve conflicts → manual adjustment → official schedule`

Các chi tiết Workforce hiện có trong code chỉ là implementation hiện hữu và phải được đối chiếu lại với Enterprise Discovery trước khi được nâng thành business truth.

## 11. Existing important Workforce decisions discussed earlier

- Demand nhập số lượng cần; khi lưu `4` thì mapping hiện tại là `minimum_headcount=4`, `target_headcount=4`, `maximum_headcount=4`.
- Review theo từng chi nhánh.
- Dropdown chuyển chi nhánh không được chứa chi nhánh hiện tại.
- Chuyển chi nhánh chỉ có hiệu lực sau khi yêu cầu được duyệt; khi duyệt thì cập nhật `employee_availability.preferred_store_id`.
- Màu ca dựa theo thời gian, không dựa theo status:
  - 05:00–11:59: Sáng
  - 12:00–16:59: Trưa/Chiều
  - 17:00–22:00: Tối

Các điểm trên là **context của implementation hiện tại**, không phải mặc nhiên là Enterprise Rules cuối cùng nếu Discovery sau này xác định khác.

## 12. Discovery method

Mỗi Discovery phải khảo sát theo:

`WHO → WHEN → TRIGGER → WHAT → HOW → DATA → DECISION → EXCEPTION → OUTPUT`

Mỗi record cần tối thiểu:

`ID, Domain, Statement, Type, Actor, Trigger, Process, Data, Decision, Exception, Evidence, Status`

## 13. Discovery domains

- D01 — Enterprise Baseline
- D02 — Organization
- D03 — Store Operation
- D04 — Workforce
- D05 — Schedule
- D06 — Attendance
- D07 — Inventory
- D08 — Sales
- D09 — Finance
- D10 — Customer & Marketing
- D11 — Management
- D12 — Technology

## 14. Working method for ChatGPT

Khi bắt đầu một session mới:

1. Đọc `00_CURRENT_STATE.md`.
2. Đọc `00_MASTER_PLAN.md`.
3. Đọc `06_DECISION_LOG.md`.
4. Đọc `07_CHANGE_LOG.md`.
5. Đọc `00_CHATGPT_CONTEXT.md`.
6. Đọc tài liệu của phase/domain hiện tại.
7. Tiếp tục đúng task đầu tiên chưa hoàn thành; không khởi động lại dự án nếu không được yêu cầu.

Trước khi thay đổi code/database/UI, phải kiểm tra tài liệu nghiệp vụ hiện hành và repository thực tế.

## 15. GitHub working rules

- Làm việc trên `main` hiện tại.
- Không force reset `main`.
- Trước khi sửa file: inspect source hiện tại, xác định canonical path và dependency.
- Sửa implementation canonical.
- Kiểm tra các đường dẫn/dependency bị ảnh hưởng.
- Commit thay đổi có message rõ nghĩa.
- Ghi lại thay đổi quan trọng trong Change Log và Decision Log khi có quyết định nghiệp vụ.

## 16. First task now

**P0 — Enterprise Baseline**

Không bắt đầu code mới cho Enterprise Discovery #001. Trước hết thu thập và xác minh sự thật nền của MAGASIN.
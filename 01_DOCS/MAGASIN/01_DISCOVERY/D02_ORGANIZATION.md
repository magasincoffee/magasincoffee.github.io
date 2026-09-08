# D02 — Organization Discovery

## 1. Purpose

Xác định tổ chức thực tế của MAGASIN: vai trò, trách nhiệm, quyền hạn, phê duyệt, phân quyền và các ngoại lệ. Tài liệu này chưa tạo Business Rules.

## 2. Evidence already available

| Evidence | Current understanding | Classification |
|---|---|---|
| C11 | 1 Owner, 1 General Manager, 2 Full-time, 30 Part-time; tổng 33 người. | FACT |
| C12 | Đề xuất tương lai: 2 full-time có thể quản lý CN1/CN2 với 70% vận hành + 30% quản lý; hiện chưa có dedicated store manager. | DECISION/PROPOSAL |
| C13 | Hiện nhân viên tự chịu trách nhiệm theo ca; GM chịu trách nhiệm cuối; CN4 có người kiểm tra vệ sinh tạm thời. | FACT |
| C14 | GM đang đồng thời phụ trách HR, vận hành cửa hàng, kho, điều phối giao hàng, doanh thu/thanh toán, lương và nhiều tác vụ quản trị. | FACT |
| C15 | GM có quyền tự quyết trong tuyển/cho nghỉ, lịch, chuyển ca/cửa hàng, sự cố cửa hàng, tồn kho, mua/nhận/xuất, thanh toán/lương, điều phối và xử lý khách; nhiều việc khác là đề xuất. | FACT |
| C16 | Owner quyết định chiến lược, mở/đóng/di dời cửa hàng, giá, promotion, procedure, major spend, manager, hệ thống, supplier quan trọng, đầu tư/vay. | FACT |
| C19 | GM có thể chỉnh dữ liệu nhân sự, lịch, chấm công, tồn kho, đơn, doanh thu, chi phí, lương, công nợ. | FACT |
| C20 | Escalation hiện theo GM/Owner tùy loại sự cố; kênh chính là Zalo cá nhân/group và điện thoại. | FACT |
| C53 | Trách nhiệm vận hành tại các cửa hàng cơ bản giống nhau; CN4 có cleanliness checker tạm thời. | FACT |
| C71–C72 | Tier nhân sự do GM đề xuất/Owner duyệt; termination authority hiện chưa thống nhất hoàn toàn; offboarding một phần chuẩn hóa, một phần thủ công. | FACT / GAP |
| C109 | Target ownership: Employee=Owner+GM; Branch=GM; Warehouse=GM; Product/Recipe=Owner; Schedule/Attendance=GM; Orders/Revenue=Owner+GM; Customer/Membership=Owner+GM; Promotion/Marketing=Owner; Data Governance/Close=Owner. | TARGET / DECISION |

## 3. Current organization map

```text
OWNER
  │
  └── GENERAL MANAGER
        ├── HR / Workforce
        ├── Store Operations (4 stores)
        ├── Warehouse / Inventory
        ├── Finance administration / Payroll / Payments
        └── Delivery dispatch / Customer issue handling

STORE STAFF
  └── Part-time + Full-time staff organized by shift
```

This is the current operating model as evidenced, not a proposed org chart.

## 4. Current authority map (baseline)

| Area | Current primary operator | Final / approval authority | Notes |
|---|---|---|---|
| Strategy / business direction | Owner | Owner | FACT |
| Store open/close/relocate | Owner | Owner | FACT |
| Price | Owner | Owner | FACT |
| Promotion | Owner | Owner | FACT |
| Procedure/SOP change | Owner | Owner | FACT |
| Major spending | GM proposes | Owner | FACT |
| Recruitment | GM | GM within current practice | FACT |
| Termination | GM/Owner/case-by-case | **Unresolved** | GAP |
| Scheduling | GM | GM; Owner can intervene | FACT |
| Store transfer | GM | GM | FACT |
| Stock transfer | GM | GM | FACT |
| Supplier purchasing | GM | GM within current practice | FACT |
| Wages/payment | GM | GM/Owner depending item | FACT |
| Customer operational issue | GM | Owner for unresolved/serious cases | FACT |
| Data governance / historical correction | Current practice GM + Owner | Target: Owner after close | TARGET |

## 5. Material D02 gaps

### G01 — Final role catalog

Need canonical role list for the current organization, including whether Full-time staff are a formal management role or only staff with additional responsibilities.

### G02 — Approval / delegation matrix

Need canonical boundaries for decisions that currently vary by case: spending threshold, recruitment/termination, discipline, supplier action, refunds/compensation, operational exceptions and data correction.

### G03 — Termination and disciplinary authority

Historical evidence contains multiple patterns. This must be resolved before workforce rules and access/offboarding are formalized.

### G04 — Cross-branch accountability

Need a clear answer for who is accountable when an employee is transferred temporarily, supports another store, delivers for another branch, or handles a multi-branch order.

### G05 — Formal management role proposal

Need to distinguish current-state FACT from the future proposal that two Full-time employees may become store-management capacity for CN1/CN2.

## 6. Discovery stop condition for D02

D02 can close when:

1. Current roles are enumerated.
2. Responsibility and authority for each major decision category are unambiguous.
3. Delegation and escalation exceptions are documented.
4. Cross-branch accountability is defined.
5. Current-state FACT is separated from target organizational proposals.

## 7. Next question — only one material gap

**Câu hỏi D02-01:** Khi xảy ra **kỷ luật hoặc cho nhân viên nghỉ việc**, ai là người có **quyền quyết định cuối cùng** trong mô hình hiện tại của MAGASIN?

Chọn một phương án chính:

**A. Owner quyết định cuối cùng**

**B. GM quyết định cuối cùng**

**C. GM đề xuất, Owner phê duyệt**

**D. Tùy mức độ: có ngưỡng/quy tắc cụ thể**

Nếu là D, hãy nêu ngưỡng hoặc ví dụ phân loại; tôi sẽ ghi nhận thành FACT/DECISION và tiếp tục D02 mà không quay lại các câu hỏi nền đã xác định.
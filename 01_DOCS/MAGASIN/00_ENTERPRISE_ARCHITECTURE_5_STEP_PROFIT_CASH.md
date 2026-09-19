# MAGASIN Business OS — Enterprise Architecture Five-Step / Profitability & Cash First

**Date:** 2026-09-19  
**Status:** OWNER APPROVED / CANONICAL ARCHITECTURE / ROBOT HOLD UNTIL EXPLICIT RELEASE  
**Purpose:** kiến trúc canonical của MAGASIN Business OS; mọi session, task, domain và thay đổi phải đọc và áp dụng tài liệu này trước khi thực hiện.

## 1. Owner handoff gate — bắt buộc

Trong giai đoạn Owner đang trao đổi/chốt kiến trúc với ChatGPT:

- Supervisor/Brain/Work **không được chủ động thay Owner triển khai kiến trúc hoặc mở task implementation mới**.
- Source-of-truth phải ở trạng thái `PAUSED / WAIT_USER`.
- Robot chỉ được tiếp tục sau khi Owner **chốt kiến trúc và ra lệnh bàn giao rõ ràng**.
- Việc bàn giao phải đổi source-of-truth về trạng thái cho phép execution trước khi Robot chạy.
- Không được suy diễn im lặng của Owner là approval.
- Không được lấy một task cũ trong queue làm lý do tự tiếp tục khi architecture discussion đang active.

Canonical release condition:

```text
OWNER ARCHITECTURE DISCUSSION
        ↓
ARCHITECTURE LOCKED
        ↓
OWNER EXPLICIT ROBOT RELEASE
        ↓
PROJECT_STATE = READY / AUTO_CONTINUE
        ↓
SUPERVISOR → BRAIN → WORK
```

## 2. North Star

Mục tiêu là xây **MAGASIN Digital Operating System** cho quản trị doanh nghiệp toàn diện, không phải xây một hệ automation tự vận hành vì chính nó.

North Star:

```text
VẬN HÀNH THẬT
→ DỮ LIỆU ĐÚNG
→ FINANCIAL TRUTH
→ QUYẾT ĐỊNH ĐÚNG
→ THỰC THI
→ KIỂM SOÁT
→ CẢI TIẾN
→ PROFIT ↑ / CASH ↑
```

**Profitability & Cash là critical business priority số 1.**

Mọi module khác phải chứng minh nó cải thiện ít nhất một trong các nhóm:

- financial truth;
- operational control;
- decision quality;
- accountability;
- cycle time;
- risk/control;
- profitability;
- cash position.

## 3. Five-Step Algorithm là architecture gate

Thứ tự bắt buộc:

```text
QUESTION → DELETE → SIMPLIFY → ACCELERATE → AUTOMATE
```


### 3.1 Five-Step là operating system liên tục, không phải checklist một lần

Five-Step phải được áp dụng **song song và liên tục ở mọi khía cạnh của MAGASIN Business OS**.

Nguyên tắc:

- mỗi domain/workstream có thể chạy Five-Step song song với domain khác;
- nhưng bên trong mỗi requirement/decision/change, thứ tự **không được đảo**:
  `QUESTION → DELETE → SIMPLIFY → ACCELERATE → AUTOMATE`;
- khi có dữ liệu mới, lỗi mới, thay đổi nghiệp vụ hoặc phản hồi thực địa, vòng Five-Step phải chạy lại;
- không có module nào được coi là “đã qua Five-Step vĩnh viễn”;
- mọi automation cũ phải có thể bị QUESTION/DELETE lại nếu không còn tạo giá trị.

Five-Step áp dụng bắt buộc cho:

```text
ENTERPRISE STRATEGY
→ DOMAIN / CAPABILITY
→ BUSINESS RULE
→ SOP / WORKFLOW
→ DATA / LEDGER / FIELD
→ API / RPC / INTEGRATION
→ UI / SCREEN / REPORT
→ KPI / METRIC / ALERT
→ AUTOMATION / ROBOT / AI
→ TEST / QA / INCIDENT
→ CHANGE REQUEST / RELEASE
```

Mỗi thay đổi phải tự trả lời 5 câu:

1. **QUESTION** — Tại sao cần tồn tại? Ai dùng? Quyết định nào tốt hơn?
2. **DELETE** — Có thể bỏ hẳn requirement, bước, field, report, integration hay automation này không?
3. **SIMPLIFY** — Nếu phải giữ, cấu trúc tối thiểu đúng là gì? Có thể dùng chung canonical capability không?
4. **ACCELERATE** — Làm sao giảm cycle time từ dữ liệu → phát hiện → quyết định → hành động → feedback?
5. **AUTOMATE** — Phần nào đã đủ đúng, rõ, testable và reversible để tự động hóa an toàn?

### 3.2 Five-Step chạy song song theo workstream

Ví dụ trong cùng một thời điểm:

- Profitability & Cash chạy Five-Step trên financial truth;
- Inventory chạy Five-Step trên movement/consumption truth;
- Workforce chạy Five-Step trên staffing/labor truth;
- SOP/Task chạy Five-Step trên execution/control;
- Owner Control Tower chạy Five-Step trên decision surfaces;
- Supervisor/Brain/Work chạy Five-Step trên delivery automation.

Các workstream được phép song song, nhưng **không workstream nào được dùng AUTOMATE để vượt qua QUESTION/DELETE/SIMPLIFY của chính nó**.

### 3.3 Continuous improvement loop

Sau mỗi field validation hoặc management decision:

```text
OBSERVE REALITY
→ QUESTION current design
→ DELETE waste
→ SIMPLIFY truth/flow
→ ACCELERATE feedback
→ AUTOMATE stable parts
→ MEASURE RESULT
→ OBSERVE AGAIN
```

Đây là vòng lặp vận hành thường trực của Business OS.

### Step 1 — QUESTION every requirement

Trước mọi screen, field, table, workflow, integration, alert hoặc AI automation phải trả lời:

1. Ai sử dụng?
2. Quyết định/hành động nào thay đổi vì nó?
3. Nếu không có thì tổn thất hoặc rủi ro thực tế là gì?
4. Nguồn dữ liệu có phải actual/verified không?
5. Có giúp Profitability & Cash hoặc critical operating flow hiện tại không?
6. Đây là business requirement hay chỉ là technical convenience?
7. Có đang giải quyết nguyên nhân gốc hay chỉ che triệu chứng?

Requirement không có verified user + decision + source-of-truth effect thì không implement.

### Step 2 — DELETE aggressively

Delete/defer trước khi tối ưu:

- dashboard không dẫn đến quyết định;
- duplicate business logic giữa Owner / Manager / Employee;
- nhiều “current balance/current stock/current profit” cạnh tranh nhau;
- module mới khi capability đã tồn tại;
- speculative schema;
- automation trước khi manual/canonical flow đúng;
- AI prediction trước khi actual data đáng tin cậy;
- Robot complexity không trực tiếp rút ngắn critical business path;
- UI polish không ảnh hưởng vận hành;
- report không có owner/action;
- KPI khi financial/operational driver chưa đáng tin cậy.

Mục tiêu DELETE: **ít component hơn nhưng quản trị được nhiều hơn**.

### Step 3 — SIMPLIFY the remaining system

Kiến trúc ưu tiên một capability canonical + nhiều role projection.

```text
Business Reality
   ↓
Verified Rule / Event
   ↓
Canonical Contract
   ↓
Canonical Ledger / State
   ↓
Domain Capability
   ↓
Financial Truth / Decision Layer
   ↓
Owner / Manager / Employee Views
```

Không tạo ba hệ thống riêng cho ba role.

## 4. Canonical enterprise architecture

```text
DATA SOURCES / OPERATING EVENTS
├── Sapo / sales
├── FoodApp / channel settlement
├── Purchases / suppliers / AP
├── Inventory movements / recipes / waste
├── Payroll / labor
├── Expenses / rent / utilities / marketing
├── Cash / bank / MoMo / COD
├── Debt / capex / Owner movements
├── People / availability / schedule / attendance
└── SOP / checklist / task events
                ↓
CANONICAL DATA + EVENT / LEDGER LAYER
                ↓
BUSINESS CORE DOMAINS
├── Commercial / Sales
├── Procurement / AP
├── Inventory / Consumption
├── People / Workforce
├── SOP / Task / Control
└── Organization / Access
                ↓
FINANCIAL TRUTH SPINE
├── Revenue
├── COGS
├── Variable Cost
├── Operating / Fixed Cost
├── Cash Inflow / Outflow
├── AP / Debt / Owner Movement
├── Contribution
├── Profitability
└── Break-even
                ↓
DECISION & EXECUTION LAYER
├── Owner Control Tower
├── Manager Workbench
└── Employee Workspace
                ↓
AUTOMATION LAYER — LAST
├── Alerts / Daily Brief
├── Recommendations
├── Approval Queue
├── Business Robot
└── Supervisor / Brain / Work
```

**Financial Truth Spine là trục xuyên domain.**  
Supervisor/Brain/Work là lớp delivery/execution, không được trở thành kiến trúc trung tâm của doanh nghiệp.

## 5. Current critical path — Profitability & Cash

Thứ tự discovery + delivery hiện tại:

### PFC-01 — Revenue truth
- actual revenue;
- branch;
- channel;
- discount/promotion;
- reconciliation quality.

### PFC-02 — Cash truth
- opening cash;
- cash/bank/MoMo/COD inflows;
- supplier/payroll/rent/opex/debt/capex/Owner outflows;
- ending cash;
- unexplained variance.

### PFC-03 — Cost structure / AP
- complete cost taxonomy;
- recognized vs paid;
- supplier payable;
- debt/working-capital pressure.

### PFC-04 — COGS reliability
- recipe;
- unit conversion;
- purchase cost;
- inventory consumption;
- packaging/topping;
- waste/variance.

### PFC-05 — Unit economics
- price;
- variable cost;
- contribution/unit;
- volume;
- contribution total;
- product/channel/branch dimension.

### PFC-06 — Profit ↔ Cash reconciliation
- operating profit;
- non-P&L cash movements;
- working capital;
- debt/capex;
- Owner movements;
- unexplained cash leakage.

### PFC-07 — Break-even / branch economics
- fixed cost;
- contribution margin ratio;
- break-even revenue/orders/units;
- branch operating result.

### PFC-08 — Pricing diagnosis
Pricing decision chỉ sau PFC-01 → PFC-07 đủ evidence.

Không mặc định “thiếu tiền = giá bán thấp”.

## 6. Relationship with existing Schedule-first work

Schedule-first từ TASK-029 → TASK-036 là một **proven vertical-slice pattern**, không còn là enterprise priority số 1.

Giữ lại:

- canonical capability ownership;
- server/RPC boundaries;
- role projection;
- explicit Manager approval;
- deterministic tests;
- E2E operating loop.

Không tiếp tục mở rộng Workforce chỉ để hoàn thiện module nếu không phục vụ critical business path mới.

## 7. ACCELERATE — thin financial/operational slices

Mỗi slice phải tạo được một management answer dùng được, ví dụ:

- “Doanh thu thực tế tháng này là bao nhiêu?”
- “Tiền từ đầu tháng đến hiện tại đã đi đâu?”
- “Chi nhánh nào đang tạo contribution đủ/không đủ?”
- “SKU/kênh nào tạo contribution thấp?”
- “Khoảng cách Profit ↔ Cash nằm ở working capital, debt, capex hay leakage?”
- “Break-even của từng chi nhánh là bao nhiêu?”

Mỗi slice:

```text
Question
→ minimum verified data
→ canonical calculation
→ exception/gap
→ management view
→ field validation
```

Không yêu cầu hoàn thành toàn bộ ERP trước khi tạo giá trị.

## 8. AUTOMATE last

Chỉ automate khi flow thủ công/canonical đã:

1. đúng;
2. observable;
3. testable;
4. có owner rõ;
5. có exception rõ;
6. có rollback/fail-closed boundary.

Automation order:

```text
READ
→ SUMMARIZE
→ ALERT
→ RECOMMEND
→ PREPARE ACTION
→ APPROVAL
→ SAFE AUTOMATION
```

Không nhảy trực tiếp từ raw data sang autonomous action.

## 9. Architecture lock and Robot release

Owner đã chốt kiến trúc nền trong tài liệu này. Robot vẫn chưa được release. Trước khi giao implementation, task queue cụ thể phải trace về kiến trúc này và xác định tối thiểu:

1. enterprise capability map;
2. financial truth spine;
3. source-of-truth/ledger strategy;
4. role boundaries Owner/Manager/Employee;
5. integration boundary với Sapo/Sheets/FoodApp/bank/manual inputs;
6. PFC-01 → PFC-08 sequence;
7. Delete/defer list;
8. V1 acceptance metrics;
9. production/security boundary;
10. explicit Robot handoff.

Khi Owner chốt, update:

- `00_PROJECT_STATE.json`;
- `00_TASK_QUEUE.md`;
- architecture/decision docs;

sau đó mới chuyển `PAUSED → AUTO_CONTINUE`.

## 10. New-session mandatory bootstrap

Mọi ChatGPT/Brain/Work session mới của dự án phải đọc theo thứ tự:

1. **`00_ENTERPRISE_ARCHITECTURE_5_STEP_PROFIT_CASH.md` — READ FIRST / CANONICAL.**
2. `00_CURRENT_STATE.md`.
3. `00_PROJECT_STATE.json`.
4. `00_TASK_QUEUE.md`.
5. `00_MASTER_PLAN.md`.
6. `06_DECISION_LOG.md`.
7. tài liệu domain/task liên quan.
8. repository/PR/CI hiện tại.

Nếu bất kỳ tài liệu cũ nào mâu thuẫn với kiến trúc này, kiến trúc canonical + quyết định Owner mới hơn có ưu tiên cao hơn và phải được reconcile vào source-of-truth.

## 11. Immediate rule

**Kiến trúc đã được Owner chốt. Tiếp tục thảo luận/chi tiết hóa theo kiến trúc này và Five-Step liên tục. Không giao implementation cho Robot cho đến khi Owner ra lệnh release rõ ràng.**


# MAGASIN — Profitability & Cash Architecture

## 1. Purpose

Đây là kiến trúc nghiệp vụ chính thức của **Profitability & Cash Critical Track**. Nó xác định các năng lực tài chính cần có để MAGASIN quản trị giá bán, chi phí, unit economics, profitability và cash.

Tài liệu này là **business architecture**, chưa phải database schema, API specification hoặc UI specification.

## 2. Architecture

```text
                 MAGASIN DIGITAL OPERATING SYSTEM
                              │
       ┌──────────────────────┼──────────────────────┐
       │                      │                      │
       ▼                      ▼                      ▼
   OPERATIONS             FINANCE              MANAGEMENT
       │                      │                      │
       │              ┌───────┴────────┐             │
       │              ▼                ▼             │
       │          COST ENGINE      CASH ENGINE       │
       │              │                │             │
       │              ▼                ▼             │
       │          COGS ENGINE      CASH FLOW         │
       │              │                │             │
       │              └───────┬────────┘             │
       │                      ▼                      │
       │               PRICING ENGINE                │
       │                      │                      │
       │              ┌───────┴────────┐             │
       │              ▼                ▼             │
       │          UNIT ECONOMICS   BREAK-EVEN        │
       │              │                │             │
       │              └───────┬────────┘             │
       │                      ▼                      │
       │              PROFITABILITY ENGINE            │
       │                      │                      │
       └──────────────────────┼──────────────────────┘
                              ▼
                         KPI ENGINE
                              ▼
                    CONTINUOUS IMPROVEMENT
                              ▼
                         PROFIT ↑ / CASH ↑
```

## 3. Capability definitions

### 3.1 Cost Engine

Quản lý toàn bộ cấu trúc chi phí có liên quan đến hoạt động kinh doanh:

- nguyên vật liệu;
- topping;
- bao bì;
- nhân công;
- thuê;
- điện/nước/internet/điện thoại;
- platform/delivery;
- marketing;
- sửa chữa;
- software/tools;
- thuế và các khoản liên quan;
- hao hụt/thất thoát;
- chi phí khác.

### 3.2 COGS Engine

Tính giá vốn theo consumption/recipe đáng tin cậy thay vì mặc định lấy tổng giá trị mua trong kỳ làm actual consumption.

Mỗi SKU quan trọng cần có khả năng xác định:

`Recipe → Quantity → Unit Conversion → Purchase Cost → Product COGS`

Bao gồm topping và packaging khi chúng là thành phần của sản phẩm.

### 3.3 Cash Engine

Quản lý tiền thực tế:

`Opening Cash + Inflows − Outflows = Ending Cash`

Bao gồm cash tại chi nhánh, bank, MoMo, delivery cash, supplier payments, payroll, debt, capex, Owner contribution/withdrawal và các khoản chi chưa ghi nhận.

### 3.4 Pricing Engine

Không dùng công thức đơn giản `Giá bán = Giá vốn × X` như một quy tắc duy nhất.

Pricing phải xem xét:

`Product Cost + Channel Cost + Promotion + Contribution Target + Market/Willingness-to-pay + Operating Constraints`

Đầu ra phải cho phép đánh giá giá bán hiện tại và mô phỏng thay đổi giá.

### 3.5 Unit Economics

Đánh giá economics ở các chiều:

- product/SKU;
- sales channel;
- branch;
- order khi dữ liệu phù hợp.

Tối thiểu cần theo dõi:

`Price → Variable Cost → Contribution/Unit → Volume → Contribution Total`

### 3.6 Break-even Engine

Tính:

- fixed cost;
- contribution margin ratio;
- contribution per unit/order;
- break-even revenue;
- break-even orders/units;
- break-even theo chi nhánh khi dữ liệu đủ tin cậy.

### 3.7 Profitability Engine

Liên kết doanh thu, COGS, operating cost và các khoản liên quan để xác định:

- gross/contribution economics;
- operating result;
- profitability theo sản phẩm;
- profitability theo channel;
- profitability theo branch;
- profitability toàn MAGASIN.

### 3.8 KPI Engine

Kết nối drivers của profitability/cash với KPI quản trị:

`Enterprise Objective → Department KPI → Position KPI → Result → Evaluation → Improvement → Profit/Growth`

KPI chính thức chỉ được thiết kế sau khi các drivers và dữ liệu nguồn đủ đáng tin cậy.

## 4. Profit vs Cash boundary

Profit và Cash là hai mô hình khác nhau nhưng phải reconcile được.

```text
PROFITABILITY
Revenue
− COGS
− Operating/Selling/Admin/other costs
→ PROFIT

CASH
Opening cash
+ Cash inflows
− Cash outflows
→ ENDING CASH
```

Không dùng ending cash để kết luận profit; không dùng profit để kết luận còn bao nhiêu tiền có thể sử dụng.

## 5. Pricing architecture

Pricing decision phải đi qua các lớp:

```text
MARKET / CUSTOMER
        ↓
CURRENT PRICE
        ↓
PRODUCT COST
        ↓
CHANNEL COST
        ↓
PROMOTION / DISCOUNT
        ↓
CONTRIBUTION
        ↓
FIXED / OPERATING COST ABSORPTION
        ↓
TARGET PROFIT
        ↓
PRICE DECISION
```

Một sản phẩm có thể có vai trò khác nhau: traffic, volume, core, profit hoặc upsell. Vì vậy không bắt buộc mọi SKU có cùng margin target.

## 6. Diagnostic principle

Khi MAGASIN không có tiền hoặc lợi nhuận thấp, không mặc định nguyên nhân là giá bán.

Phải kiểm tra ít nhất:

1. price too low;
2. product cost too high;
3. operating cost too high;
4. waste/variance/loss;
5. channel economics;
6. insufficient volume/mix;
7. working-capital pressure;
8. debt/capex/Owner movements;
9. unrecorded expenses/cash leakage.

## 7. Required management views

Khi dữ liệu đủ, Owner/Management phải có khả năng trả lời:

- Sản phẩm nào tạo contribution cao/thấp?
- Kênh nào tạo contribution cao/thấp?
- Chi nhánh nào tạo contribution/profit cao/thấp?
- Giá hiện tại có đủ contribution không?
- Giá tăng/giảm ảnh hưởng gì?
- Break-even là bao nhiêu?
- Chi phí nào đang làm giảm lợi nhuận?
- Tiền đang ở đâu và đã đi đâu?
- Cuối kỳ có bao nhiêu cash có thể sử dụng?
- Muốn tăng thêm X lợi nhuận thì cần thay đổi driver nào?

## 8. Data quality dependency

Architecture này phụ thuộc trực tiếp vào độ tin cậy của:

- sales/revenue;
- recipe;
- purchase price;
- inventory consumption;
- waste/variance;
- labor;
- platform/delivery fees;
- expenses;
- AP/debt;
- cash/bank/MoMo;
- Owner transactions.

Nếu một nguồn chưa đủ tin cậy, output phải được đánh dấu `GAP / ESTIMATE`, không được trình bày như actual financial truth.

## 9. Implementation boundary

Không triển khai Pricing Engine, Profitability Dashboard hoặc KPI automation chỉ từ architecture này.

Thứ tự bắt buộc:

`Discovery → Business Rules → SOP → Data Model → System → Webapp`

Architecture này là mục tiêu nghiệp vụ để các tầng sau trace ngược về.

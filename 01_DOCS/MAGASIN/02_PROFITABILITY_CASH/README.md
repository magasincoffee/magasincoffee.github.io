# MAGASIN — Profitability & Cash Critical Track

## 1. Purpose

Đây là một **critical business track** chạy song song với Enterprise Discovery vì MAGASIN đang có vấn đề cấp thiết về **lợi nhuận và tiền mặt**.

North Star của track này không phải chỉ là tăng doanh thu, mà là xác định và cải thiện khả năng tạo ra **lợi nhuận thực + dòng tiền thực**.

## 2. Business problem

Tình trạng cần được kiểm chứng bằng dữ liệu:

- Doanh nghiệp chưa đạt mức lợi nhuận mong muốn.
- Cuối tháng có thể không còn đủ tiền trong tài khoản.
- Cần phân biệt rõ **profitability** và **cash position**.
- Không được mặc định rằng thiếu tiền = giá bán thấp.

Các nguyên nhân cần được phân tích gồm:

1. Giá bán chưa phù hợp.
2. Giá vốn cao.
3. Chi phí vận hành cao.
4. Hao hụt / thất thoát / sai lệch kiểm soát.
5. Dòng tiền bị hút bởi công nợ, đầu tư, trả nợ, giao dịch Owner hoặc các khoản chi chưa được ghi nhận.
6. Sản lượng / cơ cấu sản phẩm / cơ cấu chi nhánh chưa đủ contribution để hấp thụ fixed cost.

## 3. Pricing principle

MAGASIN không dùng nguyên tắc đơn giản `Giá bán - nguyên liệu = lợi nhuận`.

Mỗi sản phẩm phải được phân tích theo chuỗi:

```text
GIÁ BÁN
  ↓
VARIABLE COST
  ├── Nguyên liệu
  ├── Topping
  ├── Bao bì
  ├── Phí nền tảng
  ├── Delivery/ship liên quan
  └── Promotion/discount liên quan
  ↓
CONTRIBUTION MARGIN
  ↓
Đóng góp vào fixed / operating cost
  ↓
PROFIT
```

## 4. Unit economics

Mỗi SKU quan trọng cần có tối thiểu:

- Giá bán thực tế.
- Giá vốn nguyên liệu theo recipe.
- Topping.
- Bao bì.
- Chi phí biến đổi theo channel nếu có.
- Discount/promotion.
- Contribution margin theo sản phẩm/channel.
- Sản lượng.
- Doanh thu.
- Contribution tổng.

Mục tiêu là biết sản phẩm nào:

- tạo lợi nhuận;
- tạo volume;
- kéo khách;
- tăng AOV;
- hoặc đang làm giảm hiệu quả kinh doanh.

## 5. Branch economics

Không chỉ tính lợi nhuận toàn MAGASIN.

Cần phân tích theo:

```text
MAGASIN
├── CN1
├── CN2
├── CN3
└── CN4
```

Mỗi chi nhánh cần nhìn được tối thiểu:

- Revenue
- Variable cost / contribution
- Labor
- Rent
- Utilities
- Platform/delivery
- Marketing phân bổ nếu có
- Other operating cost
- Branch contribution / operating result
- Break-even requirement

## 6. Profit vs Cash

### Profitability

```text
Revenue
− COGS
− Labor
− Operating expenses
− Selling/admin expenses
− Finance/tax items as applicable
=
Profit
```

### Cash

```text
Opening cash
+ Cash collected
+ Other cash inflows
− Supplier payments
− Payroll
− Rent/utilities
− Delivery/platform
− Other operating payments
− Debt payments
− Investment/capex
− Owner withdrawals
+ Owner contributions
=
Ending cash
```

Hai báo cáo phải được quản lý riêng nhưng liên kết được với nhau.

## 7. Break-even

Cần xác định:

- Fixed cost theo tháng.
- Contribution margin trung bình.
- Break-even revenue.
- Break-even orders.
- Break-even units.
- Break-even theo từng chi nhánh khi đủ dữ liệu.

Công thức nền:

`Break-even sales = Fixed Costs / Contribution Margin Ratio`

và khi phù hợp:

`Break-even units = Fixed Costs / Contribution per Unit`

## 8. Cash control

Track này phải làm rõ:

- tiền mặt từng chi nhánh;
- bank;
- MoMo;
- tiền giao hàng thu hộ;
- tiền phải trả NCC;
- tiền lương;
- khoản vay/nợ;
- Owner withdrawal/contribution;
- khoản chi chưa ghi nhận;
- closing cash;
- cash variance.

Mục tiêu là trả lời được:

> **Tiền đang ở đâu, đã đi đâu, và cuối kỳ còn bao nhiêu tiền có thể sử dụng?**

## 9. Pricing decisions

Không được tăng/giảm giá chỉ dựa trên cảm giác hoặc chỉ dựa trên cost nguyên liệu.

Mỗi quyết định giá trong tương lai cần xem xét:

- customer willingness to pay;
- competitive position;
- unit economics;
- contribution margin;
- volume impact;
- channel fee;
- promotion effect;
- branch economics;
- capacity/operating constraints;
- target profit.

## 10. KPI connection

Profitability & Cash là một nguồn đầu vào quan trọng cho KPI Enterprise.

Chuỗi mục tiêu:

```text
Enterprise Objective
→ Department Objective
→ Department KPI
→ Position KPI
→ Individual Result
→ Evaluation
→ Reward / Development / Handling
→ Improvement Action
→ Profit / Growth Impact
```

Không thiết kế KPI chính thức trước khi các chỉ số tài chính và operational drivers đủ đáng tin cậy.

## 11. Discovery sequence

Track này không thay thế P1. Nó bổ sung các câu hỏi tài chính có tác động trực tiếp đến khả năng sống còn của doanh nghiệp.

Thứ tự:

1. Establish actual monthly revenue.
2. Establish actual cash position and movements.
3. Establish complete cost structure.
4. Establish reliable COGS / consumption basis.
5. Calculate product-level unit economics.
6. Calculate channel economics.
7. Calculate branch economics.
8. Calculate break-even.
9. Identify pricing gaps.
10. Identify cash leakage / working-capital pressure.
11. Define target financial controls.
12. Feed validated drivers into KPI design.

## 12. Stop condition

Track này đạt baseline đủ dùng khi Owner có thể nhìn thấy, trong cùng một logic:

- doanh thu;
- giá vốn;
- contribution;
- fixed/operating costs;
- profit;
- cash inflow/outflow;
- AP/debt/Owner movements;
- ending cash;
- break-even;
- profitability theo sản phẩm và chi nhánh ở mức dữ liệu cho phép.

Nếu dữ liệu chưa đủ, phải ghi rõ `GAP` thay vì ước lượng thành sự thật.

## 13. Governance

Đây là **business discovery / financial management scope**, chưa phải thiết kế database hay webapp.

Các quyết định về giá, cost target, profit target, cash reserve, KPI và thưởng/phạt chỉ được trở thành Business Rule sau khi Discovery và Owner approval hoàn tất.

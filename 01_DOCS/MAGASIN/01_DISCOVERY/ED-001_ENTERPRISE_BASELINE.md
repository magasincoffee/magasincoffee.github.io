# ED-001 — MAGASIN Enterprise Baseline

## 1. Purpose

Thiết lập baseline ban đầu cho Enterprise Discovery #001. Tài liệu này **không thiết kế giải pháp phần mềm** và chưa tạo Business Rule.

Trạng thái hiện tại của toàn bộ record là `OPEN` cho đến khi MAGASIN/Owner xác nhận.

## 2. Discovery scope

| ID | Domain | Statement | Type | Actor | Trigger | Process | Data | Decision | Exception | Evidence | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|
| ED-001-01 | Enterprise Baseline | MAGASIN COFFEE là doanh nghiệp F&B tại Cần Thơ, cần số hóa hoạt động vận hành nội bộ. | ASSUMPTION | Owner / Management | Bắt đầu chương trình chuyển đổi số | Chưa xác minh đầy đủ phạm vi pháp lý, mô hình vận hành và đơn vị kinh doanh | Thông tin doanh nghiệp | Owner xác nhận phạm vi Enterprise | Có thể tồn tại nhiều pháp nhân/đơn vị vận hành | Owner-provided project context; cần xác minh trực tiếp | OPEN |
| ED-001-02 | Enterprise Baseline | MAGASIN vận hành nhiều cửa hàng/chi nhánh và có hoạt động kho/điều phối liên quan. | ASSUMPTION | Owner / Management | Hoạt động kinh doanh thường nhật | Cần xác minh số lượng store, kho, vai trò và quan hệ vận hành | Store, warehouse, organization | Xác định network thực tế | Cửa hàng có thể thay đổi theo thời gian | Existing project context; cần xác minh | OPEN |
| ED-001-03 | Enterprise Baseline | Hoạt động vận hành gồm tối thiểu Workforce, Store Operation, Inventory, Sales, Finance, Customer/Marketing và Management. | ASSUMPTION | Owner / Functional owners | Enterprise Discovery | Xác định domain và phạm vi từng domain | Quy trình, master data, transactions | Xác định domain nào thuộc scope hệ thống | Một số chức năng có thể nằm ngoài hệ thống | Master Plan domain map; cần xác minh scope thực tế | OPEN |
| ED-001-04 | Enterprise Baseline | MAGASIN hiện đang sử dụng nhiều công cụ/hệ thống thay vì một nguồn dữ liệu duy nhất. | ASSUMPTION | Owner / Staff | Phát sinh nghiệp vụ | Ghi nhận hệ thống, file, ứng dụng và nơi lưu dữ liệu | System, account, file, database | Xác định system-of-record theo từng dữ liệu | Dữ liệu có thể trùng lặp hoặc lệch nhau | Existing project context; cần inventory thực tế | OPEN |
| ED-001-05 | Enterprise Baseline | Nguồn sự thật nghiệp vụ phải là thực tế MAGASIN; code/UI/database hiện tại chỉ là implementation hiện hữu. | FACT | Owner / Project governance | Khi phát hiện sai lệch | Truy ngược UI → System → Data → SOP → Business Rule → Discovery | Discovery records, decisions, change log | Tầng nào là nguồn gây sai lệch | Có thể cần giữ compatibility trong hệ thống cũ | DEC-001; Master Plan; Current State | VALIDATED |
| ED-001-06 | Enterprise Baseline | Chuỗi chuyển hóa của dự án là Discovery → Business Rules → SOP → Data Model → System → Webapp. | FACT | Owner / Project governance | Mọi thay đổi nghiệp vụ | Hoàn thành tầng trước rồi mới chuyển tầng sau | Discovery, Rule, SOP, Model, System, Webapp | Gate chuyển phase | Không bỏ qua gate | DEC-001; Master Plan | VALIDATED |

## 3. Baseline verification checklist

### 3.1 Enterprise identity

- Tên pháp lý / tên thương hiệu thực tế.
- Mô hình kinh doanh và các đơn vị kinh doanh thuộc scope.
- Địa bàn hoạt động.
- Người có quyền chốt nghiệp vụ và người chịu trách nhiệm từng domain.

### 3.2 Organization

- Owner / Management / Store Manager / Employee thực tế.
- Quyền quyết định khác nhau giữa các vai trò.
- Người được phép phê duyệt, thay đổi hoặc hủy dữ liệu ở từng nghiệp vụ.

### 3.3 Operating network

- Số cửa hàng đang hoạt động.
- Cửa hàng nào có manager riêng.
- Kho trung tâm / kho cửa hàng.
- Giờ hoạt động thực tế và các khung vận hành đặc biệt.

### 3.4 Systems and data

- POS hiện dùng.
- Kênh đặt hàng/delivery.
- Google Sheets / Excel / Forms / Drive hoặc công cụ khác.
- Database hiện tại.
- Integration hiện có.
- System-of-record của: nhân sự, lịch, chấm công, tồn kho, đơn hàng, doanh thu, khách hàng, khuyến mãi.

### 3.5 Financial baseline

- Doanh thu được ghi nhận ở đâu.
- Giá vốn, lương, chi phí vận hành và lợi nhuận được xác định như thế nào.
- Chu kỳ chốt số và người chịu trách nhiệm.

## 4. Evidence standard

Một statement chỉ được nâng từ `ASSUMPTION` thành `FACT` khi có bằng chứng từ MAGASIN, ví dụ:

- Owner/functional owner xác nhận trực tiếp.
- SOP hiện hành của MAGASIN.
- Báo cáo vận hành hoặc dữ liệu thực tế.
- Tài liệu/hợp đồng/hồ sơ nội bộ có thể kiểm chứng.
- Quan sát quy trình thực tế.

Code/UI/database chỉ được xem là **evidence của implementation hiện tại**, không phải tự động là business truth.

## 5. Gate to P1

ED-001 chỉ được coi là hoàn thành khi:

1. Phạm vi Enterprise đã được Owner xác nhận.
2. Organization và operating network tối thiểu đã xác nhận.
3. Các system/data source chính đã được inventory.
4. Các ASSUMPTION còn lại được liệt kê rõ và có owner để xác minh.
5. Có đủ baseline để bắt đầu D02–D12 mà không phải suy đoán phạm vi.

## 6. Next discovery action

**Không viết Business Rules.**

Tiếp tục xác minh các baseline record `OPEN`, ưu tiên theo thứ tự:

`Enterprise identity → Organization → Store network → Systems/Data → Financial baseline`.

Sau khi baseline đủ bằng chứng mới chuyển sang Discovery domain D02–D12.

## 7. Session evidence log — Câu 81–113

Các dòng dưới đây là **evidence do Owner xác nhận trực tiếp trong Discovery session**. Chúng chưa tự động trở thành Business Rules.

| Câu | Domain | Evidence đã xác nhận | Classification |
|---|---|---|---|
| 81 | Inventory | Nhà cung cấp giao hàng tại kho; Quản lý tổng nhận và kiểm tra tên hàng, số lượng, đơn vị, đối chiếu đơn; ghi nhận Google Sheets; nhận theo số thực tế; thiếu/hỏng/sai thì báo NCC và chỉ nhập số thực nhận. | FACT |
| 82 | Inventory | Quản lý tổng yêu cầu/quyết định số lượng xuất, lập phiếu giấy, tự soạn hàng; nhân viên chi nhánh xác nhận nhận; nếu thực nhận khác phiếu thì Quản lý điều chỉnh theo thực tế; tồn kho cập nhật thủ công; lịch sử điều chuyển lưu Google Sheets. | FACT / GAP |
| 83 | Inventory | Chi nhánh đếm lại toàn bộ; xác nhận bằng Google Form; nhận đủ thì tăng tồn; nhận thiếu thì báo Quản lý và ghi thực nhận; tiêu hao bán hàng không ghi từng lần; chênh lệch tồn được Quản lý kiểm tra và sửa; Quản lý + Chủ có thể sửa; hiện chỉ lưu số mới sau sửa. | FACT / GAP |
| 84 | Inventory | Hao hụt gồm đồ uống pha sai/đổ/khách không nhận, topping hỏng, bao bì hỏng, thất thoát; nhân viên báo Quản lý; chưa có ghi nhận có cấu trúc; đồ uống pha sai thường bị bỏ và nhân viên có xu hướng không báo vì sợ trách nhiệm; Quản lý quyết định hủy; trách nhiệm tùy nguyên nhân; thất thoát quy cho nhân viên; chưa phân biệt hao hụt và chênh lệch tồn; chỉ ước lượng mức hao hụt. | FACT / GAP / CONTROL GAP |
| 85 | Inventory | Nhân viên phải giải thích khi chênh lệch; Quản lý và Chủ tìm nguyên nhân; kiểm tra nhập sai/điều chuyển sai/đếm sai/tiêu hao không ghi nhận/pha sai-đổ/thất thoát/không xác định; nếu tìm được nguyên nhân thì sửa tồn + xử lý trách nhiệm; không tìm được thì nhân viên chịu trách nhiệm; chênh lệch gắn theo chi nhánh; Quản lý duyệt điều chỉnh; chưa biết tổng giá trị chênh lệch tháng. | FACT / GAP |
| 86 | Inventory | Có quy đổi đơn vị mua-tồn; chai→ml, kg→gram, hộp→cái; hệ số lưu Google Sheets; Chủ thiết lập/thay đổi; công thức gram/ml tính trong Sheets; ly/nắp/ống hút quản lý theo cái; 1.000 cái nhưng thực nhận 980 thì ghi 980; Mua→Kho→Pha chế liên kết một phần. | FACT |
| 87 | Purchasing | Quản lý tổng phát hiện và quyết định mua; căn cứ phát hiện chủ yếu theo doanh số; không có tồn tối thiểu; không có dự báo chính thức nhưng có ước lượng thủ công; số lượng mua dựa nhu cầu dự kiến + khả năng tài chính; không cần Chủ duyệt trước; lịch mua không cố định; hàng sắp hết do Quản lý quyết định. | FACT / GAP |
| 88 | Finance/AP | Công nợ NCC ghi số hàng mua, giá trị đơn, số đã trả, còn nợ, hạn và ngày thanh toán; theo dõi Zalo + sổ giấy; Quản lý nhập và kiểm tra; Quản lý chủ động thanh toán; đối chiếu đơn mua; sau thanh toán chưa cập nhật lại; lệch thì Quản lý kiểm tra và liên hệ NCC. | FACT / GAP |
| 89 | Sales/Finance | Nguồn doanh thu: Sapo, ShopeeFood, GrabFood, Green SM, điện thoại, Google Sheets; đơn hoàn tất ghi Sapo; chỉ xem doanh thu theo kênh trên từng app; có theo chi nhánh và ca, không theo nhân viên; hủy/hoàn/giảm giá hiện có phát sinh và xử lý thủ công; cuối ngày quan tâm tiền mặt + chuyển khoản thực nhận; có doanh thu cuối ngày; Quản lý điều chỉnh; lệch nguồn thì Quản lý kiểm tra. | FACT / GAP |
| 90 | Sales/Finance | Nhân viên tự tổng hợp doanh thu ca và nhập Google Form; Form đẩy dữ liệu vào Sheet; Quản lý lấy dữ liệu Sapo, kiểm tra báo cáo, tiền mặt/chuyển khoản, đối chiếu và điều chỉnh; nếu lệch nhân viên nhập thì Quản lý sửa theo tiền thực tế; doanh thu chính thức là số sau đối chiếu; kiểm tra mỗi ca + cuối ngày; sau chốt chỉ sửa khi Quản lý cho phép. | FACT |
| 91 | Sales/Finance | Chênh lệch thường gặp: thiếu tiền mặt, chuyển khoản chưa nhận; thiếu tiền do Quản lý xác định và nhân viên chịu trách nhiệm; thừa tiền chưa có quy trình; chênh lệch không ghi riêng; xác định nguyên nhân thì sửa số liệu + xử lý trách nhiệm; không xác định thì điều chỉnh theo tiền thực tế + nhân viên chịu trách nhiệm; không theo dõi chi tiết; không biết tổng chênh lệch tháng. | FACT / GAP |
| 92 | Finance | Chi phí đang được ghi nhận rõ: nguyên vật liệu, bao bì, lương, thuê, điện, nước, internet/điện thoại; ghi Google Sheets; Chủ + Quản lý nhập; Chủ kiểm tra; duyệt tùy loại; gán theo chi nhánh; lưu số tiền + ngày thanh toán; chỉ một số khoản được đối chiếu; cuối tháng không biết đầy đủ. Một số chi phí khác có phát sinh nhưng chưa ghi nhận chính thức. | FACT / GAP |
| 93 | Finance/COGS | Biết giá vốn từng món; giá vốn gồm công thức + giá mua + quy đổi + bao bì + topping; giá mua cập nhật thủ công; nhiều giá mua dùng giá trung bình; lưu Google Sheets; Chủ cập nhật; giá nguyên liệu tăng chưa tự động cập nhật giá vốn món. | FACT / GAP |
| 94 | Finance/Profit | Lợi nhuận tháng chỉ ước tính; doanh thu sau đối chiếu trừ COGS, lương, thuê, tiện ích, nền tảng, giao hàng, marketing, sửa chữa, phần mềm, thuế/phí và khoản khác; COGS dùng tổng mua trong tháng thay vì tiêu hao thực tế; hao hụt không tính; lương tính đủ; theo dõi theo chi nhánh; lợi nhuận công ty/chi nhánh chỉ ước tính; Owner tính; chưa có kỳ chốt cố định. | FACT / GAP |
| 95 | Finance/Cash | Không có tài khoản ngân hàng doanh nghiệp riêng; có 1 tài khoản ngân hàng cá nhân của Owner dùng cho MAGASIN; có 1 MoMo riêng dùng cho MAGASIN; tiền chưa tách hoàn toàn; Owner có sử dụng tiền MAGASIN cho cá nhân và đưa tiền cá nhân vào MAGASIN nhưng chưa theo dõi riêng; chưa có đối soát cuối tháng đầy đủ; khả dụng tiền mặt chỉ ước tính; Owner kiểm soát. | FACT / CONTROL GAP |
| 96 | Finance/Liability | Công nợ gồm NCC nguyên vật liệu, bao bì, tiền thuê, lương, khoản vay; theo NCC; tổng phải trả xấp xỉ; biết khoản đến hạn trong 7 ngày; GM quyết định ưu tiên khi thiếu tiền; ưu tiên lương, nguyên vật liệu, thuê, tiện ích và khoản đến hạn; đối chiếu khi trả; chưa nắm đầy đủ AP/AR/cash/bank/MoMo/giao dịch Owner/net cash. | FACT / GAP |
| 97 | Finance/AR | Không bán chịu cho khách; đồ uống B2C thu trực tiếp; nếu giao hàng chưa thanh toán trong ngày thì nhắc; không có công nợ khách hàng/overdue. | FACT |
| 98 | Finance/Close | Doanh thu chốt theo ca + ngày; tiền theo ca + ngày; tồn kho hàng ngày; AP NCC khoảng hàng tuần nhưng không cố định; chi phí cuối ngày nhưng không cố định; payroll theo 1–15 và 16–cuối tháng; lợi nhuận không có kỳ cố định; chưa có month close chính thức; chưa có quy định sửa sau month close hoặc ngày khóa tháng. | FACT / GAP |
| 99 | Customer | Chưa thu thập dữ liệu khách hàng; chưa có Customer ID; chưa có lịch sử mua tập trung; biết nhóm sinh viên/nhân viên văn phòng; có thẻ giấy; chưa có CRM tập trung; chưa có người owner CRM; khách mới/thành viên giá trị cao và retention chỉ ước tính. | FACT / GAP |
| 100 | Marketing | Kênh FB, TikTok, ShopeeFood, GrabFood, Green SM; Owner phụ trách FB/TikTok; chưa có content plan cố định; ads 50k–100k/ngày; Owner quyết định; đo chi phí quảng cáo + lượt xem; promo gồm giá cố định + loyalty; Owner quyết định; chưa có record campaign có cấu trúc; sau campaign xem doanh thu + đơn; Owner nói có thể xác định promo tốt nhất nhưng chưa có dữ liệu campaign có cấu trúc. | FACT / GAP / CONFLICT |
| 101 | Systems/Data | Công cụ gồm Sapo, ShopeeFood, GrabFood, Green SM, Google Sheets/Forms, Zalo cá nhân/nhóm, Facebook, TikTok, MoMo, ngân hàng và database MAGASIN đang xây. Có tài khoản dùng chung và tài khoản cá nhân Owner/GM. Employee ở Sheets; schedule Sheets+Form+Zalo; attendance Sheets+Form; inventory Sheets+Form; orders Sapo+marketplace; revenue Sapo+Sheet+marketplace; costs Sheets; customer/marketing chưa tập trung. Có chuẩn offboarding cho một số tool, nhưng một số tool vẫn manual. | FACT / GAP / CONFLICT |
| 102 | Systems/Data | System/source-of-truth hiện tại phân tán theo nghiệp vụ: employee Sheets; schedule Sheets+Zalo; attendance Sheets; inventory Sheets; orders từng hệ thống; revenue Sapo + tiền thực + sau đối chiếu; costs Sheets; AP Zalo + purchase order; cash giấy + Sheets + actual; marketing chưa có official source. Khi lệch nguồn Owner hoặc GM quyết định case-by-case. Owner muốn MAGASIN DB tương lai là single source of truth cho toàn bộ business. | FACT / DECISION |
| 103 | Systems/Data | Final daily revenue lưu Google Sheets; nếu khác closed number GM quyết định; doanh thu đã chốt vẫn có thể được GM/Owner sửa; GM có thể sửa trực tiếp; không có audit history nghiệp vụ; month-end revenue lấy từ Sheets; GM xác nhận chính thức, Owner kiểm tra khi cần. | FACT / GAP |
| 104 | Discovery Verification | Xác nhận lại các điểm: revenue Sheet nhập qua Form→Sheet; bank dùng 1 tài khoản cá nhân Owner cho MAGASIN, không có bank doanh nghiệp riêng; offboarding chỉ chuẩn hóa một số tool và một số manual; final revenue theo tiền thực; cancellation/refund/discount xử lý thủ công; một số chi phí chưa ghi chính thức; wrong drink thường discard/remake không báo; chưa có official employee KPI; Owner muốn KPI cho reward/evaluation/violations; tiếp tục P0/P1 song song với KPI Pilot. | FACT / DECISION / GAP |
| 105 | Database Scope | Google Sheets hiện là “database tạm”; Supabase dự kiến cho tương lai. Các mục chi tiết phạm vi DB còn chưa xác minh đầy đủ. | FACT / GAP |
| 106 | Database/Sheets | Google Sheets đang quản lý employee, branch, schedule, attendance, wages, products, recipes, receiving, issuing, transfers, stock, revenue, costs; chưa quản supplier, orders, AR, customers, promos. Cấu trúc trộn theo process và file; Forms ghi trực tiếp vào Sheets; dữ liệu vào Sheet ngay; Owner+GM có thể edit, staff không delete; có công thức stock/conversion/COGS/payroll/revenue/costs, chưa có AP/KPI; version history của Sheets tồn tại nhưng chưa phải business audit; nhiều file, không có master file; Owner sửa formula; Sheets hiện là official source; automation hiện bằng formulas, chưa Apps Script. | FACT / GAP |
| 107 | Database Architecture | Google Sheets “database tạm” đang kết hợp file theo nghiệp vụ + chi nhánh; kết nối bằng IMPORTRANGE, QUERY, FILTER, VLOOKUP/XLOOKUP, ARRAYFORMULA và kết hợp cách khác. Chưa có ID duy nhất. Master data hiện gồm nhân viên, sản phẩm, công thức, ca làm; Owner tạo/xóa master data. Khi đối tượng ngừng dùng thì hiện xóa khỏi Sheet. Sheets chủ yếu chỉ lưu trạng thái cuối; tồn kho 20→18 chỉ còn 18; nhân viên bậc 1→2 chỉ lưu bậc 2. Không khóa dữ liệu sau chốt; sai lịch sử thường sửa trực tiếp. Chưa có data dictionary. Khi chuyển Supabase, Owner muốn thiết kế lại từ nghiệp vụ thực tế. Supabase tương lai là backend + Single Source of Truth + tích hợp hệ thống. | FACT / GAP / DECISION |
| 108 | Data Object Inventory | Owner xác nhận phạm vi đối tượng dữ liệu rộng gồm: con người (nhân viên, GM, Chủ, khách hàng, NCC và đối tượng khác); tổ chức/địa điểm (chi nhánh, kho và khác); sản phẩm (sản phẩm bán, nguyên vật liệu, topping, bao bì, dụng cụ/tài sản và khác); vận hành (ca, lịch, chấm công, điều chuyển nhân viên, bàn giao ca, sự cố, kiểm tra chất lượng và khác); kho (nhập, xuất, điều chuyển kho→chi nhánh, chi nhánh↔chi nhánh, tồn, kiểm kê, hao hụt, điều chỉnh và khác); bán hàng (đơn, chi tiết đơn, thanh toán, hủy, hoàn tiền, giảm giá/khuyến mãi, giao hàng và khác); tài chính (doanh thu, chi phí, AP, lương, thưởng, phạt/khấu trừ, tiền mặt, ngân hàng, MoMo); customer/marketing (hồ sơ, lịch sử mua, điểm, thẻ, voucher, promo, campaign, campaign result); data governance (người tạo, người sửa, lịch sử thay đổi, nhật ký thao tác, chốt kỳ, điều chỉnh sau chốt). | FACT / SCOPE |
| 109 | Data Ownership | Data owner nghiệp vụ chính: Employee = Chủ + GM; Branch = GM; Warehouse/Stock = GM; Product/Recipe = Chủ; Schedule/Attendance = GM; Order/Revenue = Chủ + GM; Cost/AP/Money = Chủ + GM; Customer/Membership = Chủ + GM; Promotion/Voucher = Chủ; Marketing/Campaign = Chủ; Data Governance/History/Close = Chủ. Khi dữ liệu quan trọng sai và có tranh chấp/không xác định, Chủ có quyền chốt cuối. | FACT / DECISION |
| 110 | Data Audit | Khi dữ liệu quan trọng bị sửa, MAGASIN yêu cầu lưu: người sửa + thời gian sửa + dữ liệu trước/sau + lý do sửa. Áp dụng cho nhân viên, chấm công, lương, tồn kho, doanh thu, chi phí, công nợ, khuyến mãi/voucher, khách hàng và các dữ liệu khác. | TARGET / DECISION |
| 111 | Data Close / Lock | Mục tiêu close: doanh thu chốt ngày + tháng; tiền mặt chốt ngày; tồn kho chốt ngày + cuối tháng; chấm công chốt theo kỳ lương; lương chốt cả hai kỳ 1–15 và 16–cuối tháng; chi phí chốt tháng; công nợ NCC chốt tuần. Sau khi chốt, chỉ Owner được sửa. Quyền chốt thuộc GM + Owner. Đây là target-state; hiện trạng trước đó chưa khóa dữ liệu sau chốt. | TARGET / DECISION |
| 112 | Post-close Correction | Khi dữ liệu đã chốt nhưng phát hiện sai, Owner sửa trực tiếp dữ liệu cũ; hệ thống phải lưu Audit. Khi điều chỉnh, Owner đã xác nhận “Giá trị sau” là thông tin bắt buộc. Không tạo phiếu điều chỉnh trước. Yêu cầu này phải được đọc cùng C110: audit của dữ liệu quan trọng vẫn lưu người sửa, thời gian, trước/sau và lý do; lựa chọn “Giá trị sau” tại C112 phản ánh thông tin bắt buộc của thao tác điều chỉnh, không hủy yêu cầu audit đầy đủ ở C110. | TARGET / DECISION |
| 113 | Data Close / Lock | Khi một kỳ dữ liệu được chốt, chỉ Owner được sửa. Điều này nhất quán với quyền sửa sau chốt tại C111/C112; đây là target governance, không phải hiện trạng Google Sheets. | TARGET / DECISION |

## 8. Open / conflict items surfaced through C113

- C72.7 vs C101.3 vs C104: offboarding access control chỉ chuẩn hóa cho một số tool, một số tool vẫn manual.
- C32/C33/C95 resolved by C95: 0 business bank accounts; 1 personal Owner bank account used for MAGASIN; 1 dedicated MoMo for MAGASIN.
- C100: Owner nói có thể xác định promo tốt nhất, nhưng hiện chưa có structured campaign data → cần xác minh basis.
- C105: database scope ban đầu còn incomplete.
- C105/C106/C107: Google Sheets là official current data source; Supabase là future redesign / Backend + SSOT + Integration.
- C110/C112: cần phân biệt “audit requirement” (trước/sau + người + thời gian + lý do) với “input bắt buộc khi correction” (giá trị sau). Không được coi C112 là giảm yêu cầu audit của C110.
- C111/C113: quyền chốt = GM + Owner; quyền sửa sau chốt = Owner. Workflow thực thi và phạm vi khóa cụ thể cần xác định ở Business Rules/System phase.

## 9. Current discovery position

Evidence hiện đã được thu thập đến **C113**. `P0 — Enterprise Baseline` vẫn **OPEN**.

Chưa chuyển sang Business Rules / SOP / Data Model / System / Webapp.

Immediate next work: tiếp tục xác minh baseline và các open/conflict item; sau khi baseline đủ mới tiến hành P0 Gate Review và mở các domain D02–D12.

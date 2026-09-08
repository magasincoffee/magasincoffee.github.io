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

## 7. Session evidence log — Câu 81–106

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
| 93 | Finance/COGS | Biết giá vốn từng món; giá vốn gồm công thức + giá mua + quy đổi + bao bì + topping; giá mua cập nhật thủ công; nhiều giá mua dùng giá trung bình; lưu Google Sheets; Chủ cập nhật; giá nguyên liệu tăng không tự động đổi giá vốn; chưa biết tổng giá vốn tháng/chi nhánh/tỷ lệ; định lượng thực tế kiểm soát theo công thức chuẩn; bao bì và topping tính vào giá vốn. | FACT / GAP |
| 94 | Finance | Lợi nhuận tháng chỉ ước lượng; doanh thu sau đối chiếu trừ giá vốn, lương, thuê, điện/nước/internet, phí nền tảng, giao hàng, marketing, sửa chữa, phần mềm, thuế/phí và khoản khác; giá vốn hiện dùng tổng giá trị nguyên liệu mua trong tháng; hao hụt chưa tính; lương tính đủ; chi phí được phân bổ chi nhánh; lợi nhuận toàn MAGASIN và từng CN chỉ ước lượng; Chủ đang tổng hợp nhưng chưa có người phụ trách cố định; không có kỳ đánh giá cố định. | FACT / GAP |
| 95 | Finance/Cash | 0 tài khoản doanh nghiệp riêng; 1 tài khoản cá nhân Owner dùng cho MAGASIN; 1 MoMo dùng riêng cho MAGASIN; tiền chưa tách hoàn toàn; Owner lấy tiền MAGASIN dùng cá nhân và bỏ tiền cá nhân vào nhưng không ghi nhận riêng; không đối chiếu tổng thể cuối tháng; tiền có thể dùng kinh doanh chỉ ước lượng; Chủ kiểm soát. | FACT / GAP |
| 96 | Finance/AP | Khoản phải trả gồm NCC nguyên liệu/bao bì, thuê, lương, vay; công nợ NCC theo từng nhà cung cấp; tổng phải trả chỉ ước lượng; biết khoản đến hạn trong 7 ngày; khi thiếu tiền Quản lý quyết định khoản trả trước; ưu tiên lương, nguyên liệu, thuê, điện/nước, khoản đến hạn trước; đối chiếu khi thanh toán; không biết đầy đủ tổng phải trả/phải thu/tiền và dòng tiền. | FACT / GAP |
| 97 | Finance/AR | Không có công nợ khách hàng chính thức; B2C thu tiền trực tiếp khi bán đồ uống mang đi; đơn giao chưa thu ngay thì nhắc thu trong ngày; không có tổng phải thu/không có quá hạn. | FACT |
| 98 | Finance/Closing | Doanh thu chốt cả ca và ngày; tiền mặt chốt ca + ngày; tồn kho kiểm kê hàng ngày; công nợ NCC xu hướng theo tuần nhưng không cố định; chi phí cuối ngày nhưng không cố định; lương 2 kỳ 01–15 và 16–cuối tháng; lợi nhuận không có kỳ cố định; không có người chốt tháng cố định; sửa dữ liệu sau chốt chưa có quy định; không có ngày khóa sổ tháng. | FACT / GAP |
| 99 | Customer | Không thu thập dữ liệu khách hàng; không có mã khách hàng; không có lịch sử mua hàng; nhận biết nhóm sinh viên và nhân viên văn phòng; loyalty là thẻ giấy; không thu thập để CRM; không có người phụ trách; không biết khách mới/tháng; khách mua nhiều/quay lại chỉ ước lượng; không đo retention. | FACT / GAP |
| 100 | Marketing | Kênh: Facebook, TikTok, ShopeeFood, GrabFood, Green SM; Chủ phụ trách Facebook/TikTok; không có kế hoạch nội dung cố định; ads 50k–100k/ngày; Chủ quyết định; đo chi phí ads + lượt xem; khuyến mãi đồng giá + tích điểm; Chủ quyết định; không ghi nhận riêng từng chương trình; sau chương trình xem doanh thu + số đơn; vẫn có thể xác định chương trình tốt nhất theo hiện trạng; ngân sách marketing chưa cố định; chỉ một số chương trình phân bổ theo chi nhánh. | FACT / GAP / POTENTIAL CONFLICT |
| 101 | Technology/Data | Công cụ: Sapo, 3 marketplace apps, Google Sheets/Forms, Zalo, Facebook, TikTok, MoMo, ngân hàng và hệ thống/database đang xây; một số công cụ dùng chung, Chủ và Quản lý có tài khoản riêng; khi nhân viên nghỉ có quy trình khóa/xóa thống nhất (mâu thuẫn với C72, cần xác minh); nhân sự Sheet; lịch Sheet+Form+Zalo; chấm công Sheet+Form; kho Sheet+Form; đơn hàng Sapo+marketplace; doanh thu Sapo+Sheet+marketplace; chi phí Sheet; khách chưa tập trung; marketing không có nơi tổng hợp; nguồn dữ liệu duy nhất đang xây dựng; Chủ quyết định khi nguồn lệch; backup thủ công. | FACT / GAP / CONFLICT |
| 102 | Technology/Data | Source hiện tại: nhân sự Sheet; lịch Sheet+Zalo; chấm công Sheet; tồn Sheet; đơn hàng nhiều hệ thống; doanh thu Sapo + tiền thực tế + số sau đối chiếu; chi phí Sheet; công nợ Zalo + đơn mua; tiền mặt sổ/phiếu + Sheet + tiền thực tế; marketing chưa có SoT; khi nguồn lệch Chủ hoặc Quản lý quyết định; Owner muốn database tương lai làm nguồn sự thật gốc cho toàn bộ nghiệp vụ. | FACT / FUTURE DIRECTION |
| 103 | Sales/Data | Doanh thu sau đối chiếu lưu Google Sheets; lệch Sheet với số đã chốt thì Quản lý quyết định; doanh thu chốt có thể sửa bởi Quản lý/Chủ; Quản lý sửa trực tiếp; không lưu lịch sử sửa; cuối tháng tổng hợp từ Sheet; Quản lý tổng xác nhận chính thức, Chủ kiểm tra khi cần. | FACT / GAP |
| 104 | Enterprise/Data | Đã xác minh conflict: nhân viên nhập Form, Sheet nhận dữ liệu; 1 tài khoản ngân hàng cá nhân Owner dùng cho MAGASIN; offboarding có quy trình cho một số công cụ, số khác xử lý thủ công; doanh thu sau chốt lấy tiền thực tế làm chuẩn; hủy/hoàn/giảm giá có phát sinh và Quản lý xử lý thủ công; một số chi phí phát sinh nhưng chưa ghi nhận chính thức; đồ uống pha sai thường tự bỏ/làm lại không báo; KPI nhân viên chưa có chính thức; Owner muốn KPI dùng cho thưởng + đánh giá + xử lý vi phạm; đồng thời tiếp tục Discovery và tách KPI Pilot. | FACT / GAP / DECISION DIRECTION |
| 105 | Technology/Data | Google Sheets hiện là database tạm theo mô tả Owner; Supabase là định hướng tương lai. Các chi tiết về dữ liệu thực tế, tích hợp, phân quyền, audit, backup chưa được Owner trả lời đầy đủ ở câu này và vẫn OPEN. | FACT / FUTURE DIRECTION / OPEN |
| 106 | Technology/Data | Google Sheets đang quản lý nhân viên, chi nhánh, lịch, chấm công, lương, sản phẩm, công thức, nhập/xuất/điều chuyển/tồn, doanh thu, chi phí; cấu trúc Sheet vừa riêng vừa kết hợp; Google Forms ghi trực tiếp vào Sheets; dữ liệu Form vào Sheet ngay; Chủ + Quản lý có quyền sửa; nhân viên không được xóa; Sheets có công thức tự động cho tồn, quy đổi, giá vốn, lương, doanh thu, chi phí; lịch sử phiên bản có nhưng không quản trị theo nghiệp vụ; Chủ sửa công thức; không có một file Master duy nhất; tổng hợp bằng nhiều file + công thức + thủ công; Google Sheets hiện được coi là nguồn dữ liệu chính thức; tự động hóa hiện có bằng công thức. | FACT |

## 8. Open / conflict items surfaced through C106

- C72.7 vs C101.3: cách xử lý quyền truy cập khi nhân viên nghỉ việc chưa hoàn toàn thống nhất.
- C32/C33/C95: trạng thái tài khoản ngân hàng/MoMo đã được khóa lại ở C95: 0 tài khoản doanh nghiệp riêng, 1 tài khoản cá nhân Owner dùng cho MAGASIN, 1 MoMo dùng riêng cho MAGASIN.
- C100: khả năng xác định khuyến mãi hiệu quả nhất chưa có cách lưu chiến dịch có cấu trúc; cần xác minh căn cứ thực tế.
- C105: phạm vi database hiện đang xây dựng chưa được trả lời đầy đủ.
- C105/C106: cần phân biệt “Google Sheets là nguồn dữ liệu chính thức hiện tại” với “Single Source of Truth tương lai” là hai trạng thái khác nhau.

## 9. Current discovery position

- Session evidence collected through **Câu 106**.
- P0 remains **OPEN**.
- No Business Rules, SOP, Data Model, System or Webapp work is being initiated from these evidence records yet.
- Immediate next work remains completion of P0 Systems/Data baseline, then P0 Gate Review.

## 10. Next discovery action

Ưu tiên tiếp theo là xác minh **Technology/Data ownership, access, backup, integration và database scope**; sau đó kiểm tra các open/conflict items cần thiết cho P0 Gate.

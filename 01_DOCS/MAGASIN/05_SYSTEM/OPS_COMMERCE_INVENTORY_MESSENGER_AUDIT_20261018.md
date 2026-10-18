# MAGASIN OPS — Rà soát Sales / Procurement / Inventory / Messenger integration

**Ngày:** 2026-10-18 (ICT)  
**Trạng thái:** REPOSITORY AUDIT / READ-ONLY / CHƯA XÁC NHẬN PRODUCTION  
**Repository:** `magasincoffee/magasincoffee.github.io`, branch `main` khi đọc  
**Phạm vi:** Bán hàng, nhập hàng, tồn kho thực tế, tích hợp Messenger AI. Không thay đổi nhánh WebApp/XSTORE release, Supabase, hoặc Worker.

## Kết luận

Đã có nền tảng mua hàng và danh mục hàng hóa ở OPS: `procurement_products`, `procurement_product_packages`, `procurement_suppliers`, `procurement_purchase_orders`, `procurement_purchase_order_items`, `procurement_supplier_payments`, `procurement_supplier_payment_allocations`, `procurement_audit_log`; giao diện `04_OWNER/Procurement/procurement-v2-orders.js` thể hiện tạo/sửa đơn nhập, quy đổi số lượng, so sánh giá. Chưa có bằng chứng E2E đảm bảo bán hàng/trừ tồn/giữ hàng/tra cứu tồn khả dụng ở Production. **Không đồng nhất code có mặt với hệ thống đã hoạt động.**

## Nguồn bằng chứng đã đọc

- `01_DOCS/MAGASIN/00_BUSINESS_OS_BLUEPRINT.md`: Sales + Inventory là scope V1; Supabase/PostgreSQL là core; inventory movement ledger; không nhiều nguồn tồn song song.
- `01_DOCS/MAGASIN/04_DATA_MODEL/STORE_PRODUCT_FOUNDATION_REVIEW.md`: TASK-009 foundation PASS nhưng explicitly deferred pricing, stock balances, purchase/sales order logic. Document nêu procurement category không được mặc nhiên thành item taxonomy toàn hệ thống; receiving_location là text, chưa phải location FK.
- `02_CORE/contracts/store-product-foundation.v1.json`: `FOUNDATION_DRAFT`, location STORE/WAREHOUSE, item SELLABLE/MATERIAL/TOPPING/PACKAGING/ASSET/OTHER, unit conversion.
- `07_DATABASE/migrations/20260915183000_procurement_accounting_v1.sql`: bảng procurement, role checks và audit.
- `04_OWNER/Procurement/procurement-v2-orders.js`: UI đơn nhập + validations.
- Git tree `main` (731 paths khi kiểm tra): file migrations Procurement, contract/test foundation và nhiều Workforce; chưa đủ chứng cứ xác định absence của modules ngoài repo hoặc DB production.
- `01_DOCS/MAGASIN/00_CURRENT_STATE.md`: tài liệu current state được cập nhật 2026-09-28, cần so với CI/PR và database ledger mới nhất trước release.

## Ma trận trạng thái

| Domain | Bằng chứng có trong repo | Kết luận |
|---|---|---|
| Product/item foundation | procurement_products + FOUNDATION_DRAFT | Có nền tảng, chưa được coi là catalog bán hoàn chỉnh |
| Unit/package conversion | procurement_product_packages | Có implementation |
| Supplier/purchase order | procurement_suppliers/purchase_orders/items + JS UI | Có implementation, chưa production E2E |
| Procurement payments | payments + allocations | Có implementation, chưa xác minh vận hành |
| Canonical SKU + product variants + sales pricing | Không được chứng minh bởi evidence đã đọc | GAP/UNVERIFIED |
| Warehouse/location mapping | receiving_location text; draft location contract | GAP |
| Inventory movement ledger + on-hand | Blueprint yêu cầu, không được chứng minh bởi evidence đã đọc | GAP/UNVERIFIED |
| Stock reservation + sellable stock | Không được chứng minh | GAP/UNVERIFIED |
| Sales order lifecycle + post/cancel/return atomic stock | Không được chứng minh | GAP/UNVERIFIED |
| Messenger read-only catalog/price/availability API | Không được chứng minh | GAP/UNVERIFIED |

## Quyết định kiến trúc đề nghị

- OPS/Supabase là nguồn dữ liệu kinh doanh chính thức (sản phẩm, đơn mua/bán, giá, biến động kho).
- Messenger bot chạy Cloudflare Worker / Workers AI, kết nối API chỉ đọc của OPS để tra hàng/giá/tồn khả dụng; chuyển cho nhân viên khi thiếu dữ liệu.
- Cloudflare D1 nếu cần chỉ giữ dedup Messenger, lịch sử hội thoại hạn chế, queue; **không tạo kho tồn cạnh tranh**.
- Các hành động đặt hàng cần server-side validation, approval và idempotency; AI không tự thực hiện SQL/raw changes.

## Task backlog (thực hiện tuần tự, chia nhỏ trước khi viết code)

- [ ] **OPS-COM-001 NEXT:** Rà soát đầy đủ code Sales/Inventory, routes/UI, migrations và các PR đang mở; đối chiếu Supabase schema/ledger *read-only* tại đúng project `MAGASIN-NOIBO` / `menvbzlsncmpuvnaifxa`; chứng minh GAP thay vì giả định; không chạm `OPS-WebApp`/ `foclxkjnypjolcwqekku`.
- [ ] OPS-COM-002 Chốt ma trận nguồn sự thật: procurement item vs canonical item, variant/SKU, unit conversion, inventory locations và quyền Owner/Manager.
- [ ] OPS-COM-003 Phân định phân hệ sở hữu và thiết kế migration idempotent + RLS, chỉ test cô lập.
- [ ] OPS-COM-004 Hoàn thiện quản lý danh mục sản phẩm bán và biến thể, giá có hiệu lực và duyệt.
- [ ] OPS-COM-005 Hoàn thiện warehouse/location master và định danh kho nhận.
- [ ] OPS-COM-006 Thiết kế và kiểm thử inventory movement ledger (receipt, issue, transfer, adjustment, return) với transaction atomic/idempotency.
- [ ] OPS-COM-007 Xây on-hand/allocated/available và giữ hàng TTL, chống oversell; test concurrency.
- [ ] OPS-COM-008 Kết nối đơn nhập đã post → ledger; cancel/reverse không làm mất lịch sử.
- [ ] OPS-COM-009 Hoàn thiện sales order draft/confirm/cancel/return → reservation/stock movement.
- [ ] OPS-COM-010 Hoàn thiện UI bán hàng/nhập hàng/kho thân thiện mobile, kiểm thử role + E2E.
- [ ] OPS-COM-011 API read-only sản phẩm, bảng giá và tồn khả dụng qua Supabase Edge Function/RPC có giới hạn, không public service role.
- [ ] OPS-COM-012 Kết nối Cloudflare Messenger AI qua API read-only, không đoán giá/tồn, fallback nhân viên.
- [ ] OPS-COM-013 Bảo mật, load/concurrency, audit, backup/recovery, CI + release approvals, kiểm thử Production theo đúng gates.
- [ ] OPS-COM-014 Cập nhật tài liệu, nghiệm thu và ghi deployment evidence.

## Release constraints

Trước mọi migration/DDL/production data, kiểm tra đúng project target, backup/restore & RLS/ACL, HEAD/CI và phê duyệt Owner theo quy trình của WebApp. Phần audit này không cho phép phát hành. Không commit secrets/PII.

## Continuation prompt

```
Đọc 01_DOCS/MAGASIN/05_SYSTEM/OPS_COMMERCE_INVENTORY_MESSENGER_AUDIT_20261018.md
trên branch docs/ops-commerce-inventory-audit-20261018.
Tiếp tục OPS-COM-001. Đối chiếu code thực tế và schema Supabase MAGASIN-NOIBO ở chế độ read-only,
không coi GAP/UNVERIFIED là bằng chứng tính năng không tồn tại.
Mỗi thay đổi thực thi tạo PR, tests và cập nhật journal.
Không đụng tới OPS-WebApp Supabase sai project hoặc deploy Production chưa được cho phép.
```

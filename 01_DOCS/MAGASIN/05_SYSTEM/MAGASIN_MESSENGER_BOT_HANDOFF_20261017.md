# MAGASIN Messenger AI Bot — BÀN GIAO TRẠNG THÁI & TASK TIẾP THEO

**Ngày ghi nhận:** 2026-10-17 (Asia/Ho_Chi_Minh)  
**Phạm vi:** Bot Facebook Messenger cho Fanpage MAGASIN CUP, **độc lập** với lane WebApp/XSTORE.  
**Nguồn bằng chứng:** Ảnh chụp màn hình Meta, Cloudflare, Messenger do chủ dự án cung cấp trong phiên làm việc ngày 2026-10-17; **không phải kiểm toán trực tiếp trạng thái Cloudflare/Meta tại thời điểm đọc**.  
**Quy tắc:** Chỉ cập nhật trạng thái đã được chứng minh; không suy diễn `PASS` cho những mục chưa test. Không lưu secrets vào GitHub.

## 0. Chỉ dẫn cho chat tiếp theo

1. **Đọc toàn bộ tệp này trước khi hướng dẫn.** Đây là handoff cho riêng Messenger Bot, không thay thế SOT WebApp/XSTORE: `01_DOCS/MAGASIN/05_SYSTEM/MAGASIN_RELEASE_RECOVERY_ATOMIC_EXECUTION_TEMP.md` trên nhánh riêng `docs/xstore-release-recovery-atomic-20261017`.
2. Mục tiêu: hoàn thiện bot AI nhận/trả lời Messenger hoạt động trên **Cloudflare**, ưu tiên hạn mức miễn phí và các bước dễ làm từ UI.
3. Người dùng **không quen lập trình**: cung cấp một tệp `worker.js` **hoàn chỉnh để Ctrl+A, dán, Deploy**; không yêu cầu dò tìm/chỉnh sửa từng đoạn.
4. **NEXT TASK: BOT-035** — tạo Cloudflare D1 tên `magasin-messenger-db`. **DỪNG ở task này** cho đến khi người dùng báo tạo xong hoặc có bằng chứng trong Cloudflare. Không giả định D1 đã tạo.
5. Sau mỗi bước, ghi trạng thái, bằng chứng và NEXT TASK vào tệp handoff. Không thay đổi production bot khi chưa có yêu cầu mới rõ ràng.
6. Không sao chép `VERIFY_TOKEN`, `META_APP_SECRET`, `PAGE_ACCESS_TOKEN`, `OPENAI_API_KEY`, thông tin khách hàng hoặc log chứa dữ liệu cá nhân vào GitHub/chat. **Không cần** OpenAI API có trả phí để bot chạy bằng Workers AI.
7. Không tạo branch/PR/file trùng hoặc trộn lane với recovery/WebApp release. Mã Worker đang được chỉnh trực tiếp ở Cloudflare, **chưa có bằng chứng mã nguồn đã đồng bộ GitHub**.
8. Đánh dấu `DONE` chỉ sau khi có bằng chứng/kiểm thử. Trước khi vận hành rộng rãi, phải xử lý đồng thời giới hạn Meta, bảo mật, trùng lặp, dữ liệu cá nhân, giám sát và nhân viên tiếp nhận.

## 1. Hạ tầng hiện có (đã được ảnh chụp xác nhận)

| Thành phần | Giá trị / tình trạng |
|---|---|
| Meta app | `MAGASIN Commerce Bot`, App ID `1416371830584830`, đang development |
| Fanpage | `Magasin CUP - Ly Nhựa & Bao Bì Cần Thơ`, Page ID `197751883429694` |
| Messenger API | Kết nối Fanpage thành công, đã tạo Page Access Token |
| Webhook | Meta xác minh thành công; đăng ký `messages` và `messaging_postbacks` |
| Cloudflare Worker | `magasin-messenger-bot`, environment `Production` |
| Worker URL | `https://magasin-messenger-bot.bachvantoi1994.workers.dev` |
| Meta Callback URL | `https://magasin-messenger-bot.bachvantoi1994.workers.dev/webhook` |
| Worker Secrets | `VERIFY_TOKEN`, `META_APP_SECRET`, `PAGE_ACCESS_TOKEN`, `META_PAGE_ID` (ảnh xác nhận tồn tại, không kiểm tra được nội dung) |
| OpenAI | `OPENAI_API_KEY` được người dùng báo đã lưu; Billing free trial balance `$0.00`; bản gọi OpenAI API đã trả lời fallback |
| Cloudflare Workers AI | Binding **`AI`** ở Production đã tạo; `Workers AI Catalog` |
| AI model của mã đã dán | `@cf/meta/llama-3.1-8b-instruct-fp8` (theo mã được hướng dẫn) |
| D1 | **CHƯA TẠO / CHƯA CÓ BẰNG CHỨNG** |
| GitHub source code cho Worker | **CHƯA ĐỒNG BỘ / CHƯA XÁC MINH** |

## 2. Đã làm xong (bằng chứng trong chat 2026-10-17)

- [x] BOT-001 Tạo Meta app và chọn Messenger use case.
- [x] BOT-002 Kết nối Fanpage MAGASIN với app.
- [x] BOT-003 Tạo Page Access Token.
- [x] BOT-004 Tạo Cloudflare Worker chạy HTTPS.
- [x] BOT-005 Thay Hello World bằng Webhook GET verify, POST event, HMAC `x-hub-signature-256`, Send API.
- [x] BOT-006 Lưu `VERIFY_TOKEN`, `META_APP_SECRET`, `PAGE_ACCESS_TOKEN`, `META_PAGE_ID` dưới dạng Cloudflare Secrets (tất cả hiển thị `Value encrypted`).
- [x] BOT-007 Xác minh Meta Webhook (dấu tích xanh).
- [x] BOT-008 Đăng ký Page webhook fields `messages` và `messaging_postbacks`.
- [x] BOT-009 Thử tin nhắn với phản hồi tự động cố định thành công.
- [x] BOT-010 Tạo OpenAI API key, lưu Cloudflare Secret theo người dùng; thử OpenAI và gặp fallback; xác nhận số dư Free trial API `$0.00`.
- [x] BOT-011 Chuyển sang Cloudflare Workers AI, tạo binding `AI`.
- [x] BOT-012 Dán/triển khai bản Worker dùng `env.AI.run()`; ảnh Messenger cho thấy **câu trả lời AI tiếng Việt tư vấn ly nhựa 700 ml**. Đây là kiểm thử một lần, không phải chứng nhận production-scale.

## 3. Kế hoạch tiếp theo theo thứ tự (chưa hoàn thành)

- [ ] **BOT-035 [NEXT]** Trong Cloudflare Dashboard: Storage & databases → D1 → Create database → đặt tên `magasin-messenger-db`; chụp ảnh xác nhận. Không tự nhận là đã tạo.
- [ ] BOT-036 Tạo schema D1 có ít nhất `conversations`/`messages` và `processed_events`, khóa unique theo Meta MID, timestamps, indexes; xây quy tắc retention, tối thiểu dữ liệu lưu. SQL cần được cung cấp nguyên khối để người dùng copy/dán.
- [ ] BOT-037 Thêm D1 binding tên **`DB`** vào Worker production, xác nhận `AI` và `DB` đều tồn tại; lưu ý đồng bộ `wrangler.jsonc` khi triển khai từ repo.
- [ ] BOT-038 Thiết kế chống xử lý trùng theo event MID, atomic claim, xử lý retry/failure để không đánh dấu thành công trước khi Send API xác nhận; kiểm tra race, timeout và nhiều POST lặp.
- [ ] BOT-039 Thiết kế lịch sử hội thoại nhiều lượt theo PSID, giới hạn context/retention, chống prompt injection, thời gian lưu/đồng ý và quy trình xóa dữ liệu theo chính sách.
- [ ] BOT-040 Tạo **toàn bộ `worker.js` hoàn chỉnh**, không yêu cầu sửa từng đoạn, có HMAC, GET verify, parsing, dedupe, D1, Workers AI, timeout, error handling, Messenger Send API, không log PII/secret.
- [ ] BOT-041 Deploy, kiểm thử theo kịch bản: hỏi 700ml → hỏi đáy bằng → bot nhớ 700ml và số lượng; lặp lại MID → tối đa một phản hồi; mất AI → trả lời fallback; webhook challenge vẫn thành công.
- [ ] BOT-042 Kết nối danh mục sản phẩm/giá/tồn kho có nguồn dữ liệu thật; không tự bịa. Xác định đúng hệ thống nguồn và quyền read-only trước tích hợp WebApp/SAPO.
- [ ] BOT-043 Handoff nhân viên: ngừng AI khi cần, cơ chế tiếp quản, giờ làm việc, nhãn cuộc hội thoại; kiểm tra hành vi Echo/handover.
- [ ] BOT-044 Tăng cường: quản lý mã/CI/CD GitHub, version pin, rollback, rate limit/chống spam, quan sát errors, chi phí/hạn mức Workers AI, kiểm thử quyền truy cập, bảo mật secrets.
- [ ] BOT-045 Meta App Review / quyền `pages_messaging` nâng cao và những yêu cầu liên quan trước khi phục vụ khách ngoài nhóm test; kiểm thử với tài khoản bên ngoài sau khi được chấp thuận.

## 4. Kỹ thuật / rủi ro cần nhớ

- Bản `worker.js` đang dùng Workers AI, system prompt tiếng Việt cho tư vấn ly nhựa, không có giá/tồn kho thật; được triển khai bằng editor trực tiếp Cloudflare.
- Mã trong chat gọi `ctx.waitUntil(processWebhook(...))`; **chưa** có cơ chế lưu trạng thái bền vững, idempotency, retry và thứ tự hội thoại; xử lý tiếp với D1 cần thiết kế cẩn thận (đừng xem D1 tự động loại hết trùng).
- App còn ở chế độ Development; thử nghiệm thành công **không** chứng minh khách hàng công khai có thể dùng.
- Cần xác nhận trạng thái thực tế của deployment, bindings, schema và token còn hợp lệ tại thời điểm tiếp tục.
- Free tier Workers AI có hạn mức; không được khẳng định dịch vụ luôn miễn phí hoặc vô hạn.
- Thêm D1 lưu nội dung khách hàng là thay đổi lưu trữ dữ liệu cá nhân: cần chính sách retention, hạn chế truy cập và cơ chế xóa.
- Tuyệt đối **không** đưa secrets trong ví dụ SQL, commit, screenshots và HTTP logs.

## 5. Handoff / prompt để chat mới dùng

```text
Đọc toàn bộ hồ sơ trạng thái MAGASIN Messenger AI Bot tại đường dẫn GitHub tôi gửi.
Chỉ dùng hồ sơ này làm điểm bắt đầu cho lane Messenger Bot; không làm thay đổi SOT WebApp/XSTORE.
Xác nhận task tiếp theo là BOT-035 (tạo Cloudflare D1 magasin-messenger-db), chưa được làm.
Hướng dẫn tôi từng thao tác trên giao diện; khi cần code hãy cung cấp toàn bộ đoạn để tôi Ctrl+A/dán/Deploy.
Không yêu cầu tôi tìm/sửa từng dòng. Không hỏi hoặc tiết lộ secrets. Mỗi lần chỉ một bước.
```

## 6. Nhật ký

- **2026-10-17** — Meta + Cloudflare Worker webhook/Send API + Workers AI đã kiểm thử Messenger thành công với câu trả lời tiếng Việt (theo ảnh người dùng); D1 chưa tạo, người dùng tạm dừng để bàn giao qua GitHub; **NEXT BOT-035**.

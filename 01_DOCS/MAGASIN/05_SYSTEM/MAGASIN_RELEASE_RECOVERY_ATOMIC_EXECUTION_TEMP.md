# MAGASIN — ATOMIC RELEASE & RECOVERY EXECUTION — TEMP SOURCE OF TRUTH

**Search key:** `MAGASIN-ATOMIC-RECOVERY-20261017`  
**Version:** 1.0 — 2026-10-17 (Asia/Ho_Chi_Minh)  
**Track:** XSTORE-019O → XSTORE-019K/L/V4 → XSTORE-020 → closure + SAPO/Procurement/security  
**Repository:** `magasincoffee/magasincoffee.github.io`  
**Production:** Supabase `MAGASIN-NOIBO` / `menvbzlsncmpuvnaifxa`; **KHÔNG** dùng `OPS-WebApp`  
**Base main verified:** `3c4a4e7484f1ab161ba8cc3bbb2d49b1eaa855ae` (2026-10-16)  
**Branch riêng chỉ tài liệu:** `docs/xstore-release-recovery-atomic-20261017` — **chưa merge / không deploy Production**  
**Phạm vi:** khắc phục triệt để những lỗi/chức năng MAGASIN nêu trong phiên kiểm tra, không mở thêm sản phẩm hoặc project khác.  
**Status tổng:** PLAN CREATED; EXECUTION NOT STARTED; RELEASE BLOCKED.  
**Tổng:** **287 việc nguyên tử**, chỉ có một luồng thực thi có thứ tự tăng dần.

## 0. HƯỚNG DẪN BẮT BUỘC CHO CHAT/ROBOT MỚI

1. Mở file này từ đúng branch/PR GitHub, **không** giả định bản trên `main` đã được merge.
2. Đọc tài liệu nghiệp vụ gốc `01_DOCS/MAGASIN/05_SYSTEM/WORKFORCE_CROSS_STORE_SCHEDULING_TEMP_SOURCE_OF_TRUTH.md` ở `main`. File này là **checklist điều phối**, KHÔNG thay thế quy tắc bảo mật và nghiệp vụ của SOT gốc.
3. Đối chiếu mới nhất PR #392, #393, #394, #436, #390; GitHub Actions; Supabase metadata trước thao tác. Các SHA và con số ngày 17/10 là baseline lịch sử, không là bằng chứng hôm sau.
4. Đọc journal cuối file và chọn **ID nhỏ nhất chưa PASS mà các tiền đề đã PASS**. Chỉ thực hiện một ID; nếu cần thay đổi để đạt PASS, dùng nhánh/PR chuyên trách, kiểm chứng rồi cập nhật nhật ký.
5. Mỗi ID có trạng thái `TODO` → `DOING` → `PASS` hoặc `BLOCKED`. **Không** tự đánh dấu PASS chỉ vì workflow xanh nếu step quan trọng SKIPPED, không mặc định PASS cho data thiếu.
6. Mỗi lần hoàn thành: sửa đúng checkbox ID bằng commit tài liệu trong **cùng nhánh nguồn này**; ghi nhật ký 1 dòng `[ngày ICT] [ID] [status] [evidence PR/run/SHA/SQL summary] [next]`. Nếu blocker, ghi chính xác blocker cùng ID, không skip hoặc chuyển sang phát hành phụ thuộc.
7. Nếu phát hiện lỗi mới: ghi ID phụ `<số>.a` ngay sau ID liên quan, trước khi chạy task kế tiếp; không đánh lại ID ổn định. Ràng buộc hoàn thành phải có dữ liệu chứng minh.
8. **READ-ONLY mặc định.** Không gọi resolver SAPO có side-effect, không thay đổi hồ sơ nhân viên thật, payroll, schedules hoặc SQL DDL Production để smoke test.
9. Chỉ áp dụng SQL Production, merge/deploy, xuất bản lịch hoặc xoá dữ liệu khi có backup/restore tương đương, roles/RLS/ACL, exact SHA/CI và phê duyệt phù hợp. Chỉ một task phát hành được triển khai tại một thời điểm; thất bại thì STOP.
10. Secrets/JWT/password/PII không ghi vào tài liệu, chat, GitHub logs hoặc PR. Sử dụng account đã được Owner ủy quyền; không giả lập Production identity hay đoán token.
11. Ưu tiên cloud/GitHub/Supabase từ điện thoại; không biến H4 thành tiền đề bắt buộc. Không tạo Supabase staging tính phí mà chưa được phê duyệt chi phí.
12. Chỉ phát hành hẹp PR #394 trước; PR #392 lớn chưa được tự động merge. Directive SOT §0.71 cho phép phát hành 019O khi đủ gate, không chờ nửa đêm **chỉ với phạm vi đó**.
13. Thay đổi kiểm thử riêng trên nhánh tài liệu không đồng nghĩa deploy. Bằng chứng Production phải ghi exact-main + Pages run + migration ledger.
14. Hoàn tất **mọi task** và đồng bộ tài liệu kiến trúc lâu dài trước khi xóa file tạm.

## 1. TÌNH TRẠNG ĐÃ KIỂM CHỨNG / CÁC BLOCKER GỐC

- **Recovery:** run [38863218269](https://github.com/magasincoffee/magasincoffee.github.io/actions/runs/38863218269) FAIL: `REL_ACL`, `FN_ACL`, `REL_EDGES`, `FN_EDGES`, `FN_NULL`, `REL/FN_GRANTOR` lệch; PR [#436](https://github.com/magasincoffee/magasincoffee.github.io/pull/436) là phép chẩn đoán; PR-head green nhưng restore step bị SKIPPED, không phải PASS.
- **Lifecycle:** PR [#394](https://github.com/magasincoffee/magasincoffee.github.io/pull/394) Draft chưa merge, PROD chưa có `set_employee_lifecycle_status_v1` và `list_employee_lifecycle_controls_v1`; UI inline/filters và SQL đã được test cô lập.
- **XSTORE V4:** PR [#392](https://github.com/magasincoffee/magasincoffee.github.io/pull/392) Draft chưa merge; K/L RPC chưa có trên PROD, FT/PT chưa có phân loại thật; XSTORE-020/011 đang PAUSED.
- **SAPO P0:** PR [#393](https://github.com/magasincoffee/magasincoffee.github.io/pull/393) Draft; `public.resolve_sapo_order_branches(date)` là SECURITY DEFINER và `anon` còn quyền gọi trực tiếp (read-only metadata 17/10). Không gọi trực tiếp để test.
- **Hosted role QA:** run [38667486062](https://github.com/magasincoffee/magasincoffee.github.io/actions/runs/38667486062) 3-role READ-ONLY PASS; chưa kiểm chứng lifecycle RPC mới / partial-Manager negative trên schema mới.
- **Procurement:** run [38960113441](https://github.com/magasincoffee/magasincoffee.github.io/actions/runs/38960113441) FAIL tại `reference_coverage_ui`, `reference_missing_badges`, `db_reference_missing_set`; log ghi **51/82** mặt hàng có tham chiếu và **31** badge thiếu. Chưa kết luận sai data hay sai assertion khi chưa so sánh đặc tả.
- **PR #390:** XSTORE-018 vẫn open dù XSTORE-018 có trong PR #392; chống double-merge.
- **Data:** Owner revenue/chi nhánh phải kiểm nguồn ACTUAL; thiếu thì `—`, không dùng dữ liệu giả hoặc coi công nợ là lợi nhuận.
- **Backup:** bản chạy full restore `--no-owner --no-acl` trước đây đạt trong phạm vi giới hạn, **không đủ** chứng minh restore owner/ACL parity. Artifact có hạn sử dụng, bắt buộc kiểm lại.
- **Supabase advisor:** cảnh báo `SECURITY DEFINER` phải phân loại theo caller/guard; không mass-revoke bừa làm hỏng chức năng.
- **Không cam kết một tỷ lệ hoàn thành giả.** Task nào có bằng chứng PASS mới đóng.

## 2. NGUYÊN TẮC PHỤ THUỘC / STOP RULE

- A → B recovery → C SAPO security → D lifecycle security → E phát hành hẹp → F/G/H/I/J/K chức năng và QA → L nghiệm thu toàn hệ → M hard-delete riêng → N đóng dự án.
- Các việc read-only độc lập có thể nghiên cứu riêng nhưng **không** được vượt thứ tự GO/NO-GO phát hành hoặc cập nhật task sai thứ tự; ưu tiên ID nhỏ nhất.
- Nếu một ID thất bại, giữ `BLOCKED` và lặp chu kỳ điều tra → bản vá đúng nguyên nhân → thử lại **chính ID**; không retry mù trên cùng SHA.
- Khác biệt giữa **code implemented**, **isolated QA PASS**, **Production deployed** và **real business accepted** phải giữ nguyên trong mọi báo cáo.

## 3. CHECKLIST NGUYÊN TỬ THEO THỨ TỰ 1 → 287

## A — Đóng băng bằng chứng / thiết lập điều phối

1. [ ] Đọc SHA HEAD hiện tại của `main`; ghi SHA và thời điểm ICT vào Nhật ký.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

2. [ ] Đọc trạng thái PR #436; ghi exact HEAD, Draft và checks.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

3. [ ] Đọc trạng thái PR #393; ghi exact HEAD, Draft và checks.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

4. [ ] Đọc trạng thái PR #394; ghi exact HEAD, Draft và checks.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

5. [ ] Đọc trạng thái PR #392; ghi exact HEAD, Draft và checks.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

6. [ ] Đọc trạng thái PR #390; xác nhận có trùng thay đổi với #392 không.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

7. [ ] Đọc danh sách migration đã áp dụng trên MAGASIN-NOIBO; ghi đúng phiên bản cuối.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

8. [ ] Xác nhận lại MAGASIN-NOIBO là Production; loại OPS-WebApp khỏi mọi lệnh phát hành.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

9. [ ] Đọc SOT Workforce chính và ghi các ràng buộc hiện hành không thể bỏ qua.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

10. [ ] Kiểm tra trạng thái, kết luận và SHA của các run mới nhất liên quan XSTORE.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

11. [ ] Xác nhận không có thay đổi Production không thuộc kế hoạch kể từ baseline.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

12. [ ] Tạo mẫu nhật ký bằng chứng cho từng ID, chỉ cho phép TODO/DOING/PASS/BLOCKED.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

## B — Phục hồi backup, owner, ACL và RLS (đường găng P0)

13. [ ] Đọc log run `38863218269`; ghi đúng fingerprint REL_ACL=FAIL.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

14. [ ] Ghi đúng fingerprint FN_ACL=FAIL từ cùng run.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

15. [ ] Ghi REL_EDGES=FAIL và FN_EDGES=FAIL từ cùng run.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

16. [ ] Ghi FN_NULL=FAIL từ cùng run.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

17. [ ] Ghi REL_GRANTOR=FAIL và FN_GRANTOR=FAIL từ cùng run.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

18. [ ] Xác định nguyên bản encrypted backup mới nhất còn hạn sử dụng; ghi artifact ID/expiry.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

19. [ ] Đối chiếu SHA256 và manifest của backup có quyền sử dụng.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

20. [ ] Kiểm tra khóa giải mã còn dùng được bằng thao tác kiểm chứng không tiết lộ khóa.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

21. [ ] Đối chiếu bản backup với snapshot Production dùng cho phép thử; ghi giới hạn độ mới.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

22. [ ] Đọc các grant-aggregation đã thêm ở PR #436 trên exact HEAD.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

23. [ ] Kiểm tra workflow PR #436 thực sự chạy bước phục hồi hay chỉ chạy source-check.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

24. [ ] Đọc kết quả aggregates role/grantor trên isolated clone, không log định danh nhạy cảm.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

25. [ ] Truy xuất metadata đếm REL privilege edges từ Production ở chế độ chỉ đọc.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

26. [ ] Truy xuất metadata đếm FN privilege edges từ Production ở chế độ chỉ đọc.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

27. [ ] So sánh privilege totals của clone với Production theo role/grantor.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

28. [ ] Khoanh vùng nhóm quyền REL bị thừa trên clone.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

29. [ ] Khoanh vùng nhóm quyền REL bị thiếu trên clone.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

30. [ ] Khoanh vùng nhóm quyền FN bị thừa trên clone.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

31. [ ] Khoanh vùng nhóm quyền FN bị thiếu trên clone.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

32. [ ] So sánh ngữ nghĩa NULL ACL của functions trên hai phía.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

33. [ ] So sánh grantor của các quyền REL sai lệch.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

34. [ ] So sánh grantor của các quyền FN sai lệch.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

35. [ ] Kiểm tra thứ tự replay original object grants và default ACL trong workflow.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

36. [ ] Xác minh không replay lặp default ACL đã sửa tại #435.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

37. [ ] Viết test hồi quy cố định cho từng nhóm sai lệch xác định được.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

38. [ ] Sửa duy nhất đoạn replay quyền gây sai lệch trên nhánh QA chuyên trách.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

39. [ ] Chạy source-check cho chính SHA sửa mới.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

40. [ ] Chạy full initialized recovery trên clone bị ngắt mạng cho chính SHA sửa mới.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

41. [ ] Kiểm tra REL_OWNER=PASS trên clone sau restore.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

42. [ ] Kiểm tra REL_ACL=PASS trên clone sau restore.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

43. [ ] Kiểm tra REL_RLS=PASS trên clone sau restore.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

44. [ ] Kiểm tra FN_OWNER=PASS trên clone sau restore.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

45. [ ] Kiểm tra FN_ACL=PASS trên clone sau restore.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

46. [ ] Kiểm tra FN_DEFINER=PASS trên clone sau restore.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

47. [ ] Kiểm tra POL_ACCESS=PASS trên clone sau restore.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

48. [ ] Kiểm tra POL_PREDICATE=PASS trên clone sau restore.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

49. [ ] Kiểm tra REL/FN/POL object counts đều PASS.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

50. [ ] Chạy kiểm thử truy cập Auth/PostgREST từ clone bằng vai trò QA cô lập.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

51. [ ] Chạy kiểm thử ứng dụng phục hồi sau backup bằng fixture không chứa PII.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

52. [ ] Xác nhận nguồn backup, thời hạn giữ, đường dẫn rollback có thể tái lập.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

53. [ ] Chốt `RECOVERY_PARITY=PASS` với link run chạy thật; nếu lệch, dừng tại bước hỏng.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

## C — Bảo mật SAPO / rủi ro quyền P0 độc lập

54. [ ] Đọc chức năng `resolve_sapo_order_branches` thật trên Production theo metadata, không gọi hàm.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

55. [ ] Kiểm tra quyền EXECUTE của `anon` trên resolver bằng catalog SQL read-only.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

56. [ ] Kiểm tra quyền EXECUTE của `authenticated` trên resolver bằng catalog SQL read-only.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

57. [ ] Xác nhận `ingest_sapo_batch` vẫn kiểm token trước thao tác ghi.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

58. [ ] Rà soát caller SAPO robot hiện hành có gọi wrapper thay vì resolver trực tiếp.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

59. [ ] Rà soát mã nguồn repository để tìm caller lịch sử gọi resolver trực tiếp.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

60. [ ] Đối chiếu SQL migration PR #393 với signature function hiện tại.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

61. [ ] Chạy kiểm tra cú pháp SQL migration PR #393 trên môi trường cô lập.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

62. [ ] Chạy test `anon` không được gọi trực tiếp resolver trên clone.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

63. [ ] Chạy test `authenticated` không được gọi trực tiếp resolver trên clone.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

64. [ ] Chạy test `service_role` có quyền cần thiết trên clone.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

65. [ ] Chạy test wrapper `ingest_sapo_batch` với token hợp lệ trên clone.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

66. [ ] Chạy test wrapper từ chối token sai trên clone.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

67. [ ] Chạy test gọi wrapper lặp lại không tạo attribution trùng trên clone.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

68. [ ] Kiểm tra kế hoạch rollback ACL không khôi phục `PUBLIC EXECUTE` ngoài ý muốn.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

69. [ ] Chạy kiểm thử PostgREST exposure ở môi trường cô lập tương đương.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

70. [ ] Chốt exact SHA migration bảo mật, CI và đường rollback.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

71. [ ] Triển khai migration PR #393 chỉ sau khi điều kiện bảo mật/khôi phục đạt và được cho phép.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

72. [ ] Xác minh lại `anon`/`authenticated` trực tiếp bị từ chối trên Production mà không gọi resolver làm thay đổi dữ liệu.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

73. [ ] Xác minh đường SAPO ingestion token-guard vẫn thông suốt bằng kiểm thử không gây ghi sai.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

74. [ ] Đóng kết quả `SAPO_RESOLVER_P0=PASS` với run và read-only catalog evidence.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

## D — Kiểm thử RPC vòng đời nhân viên cho PR #394

75. [ ] Đối chiếu các file thay đổi trong PR #394 với phạm vi phát hành hẹp đã duyệt.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

76. [ ] Xác nhận PR #394 không chứa migration FT/PT, lịch, lương hoặc xóa cứng.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

77. [ ] Đối chiếu lifecycle SQL trong PR #394 với schema Production cập nhật.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

78. [ ] Kiểm tra tham chiếu FK của `profiles` trên bản clone đủ schema.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

79. [ ] Kiểm tra quyền Owner truy cập lifecycle reader trên clone.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

80. [ ] Kiểm tra quyền Manager `ALL` truy cập lifecycle reader trên clone.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

81. [ ] Kiểm tra Manager giới hạn chi nhánh bị từ chối lifecycle writer trên clone.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

82. [ ] Kiểm tra Staff bị từ chối lifecycle writer trên clone.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

83. [ ] Kiểm tra actor INACTIVE bị từ chối lifecycle writer trên clone.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

84. [ ] Kiểm tra thay đổi trạng thái ACTIVE → INACTIVE trong fixture clone.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

85. [ ] Kiểm tra thay đổi trạng thái INACTIVE → ACTIVE trong fixture clone.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

86. [ ] Kiểm tra không thể ghi lại cùng trạng thái.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

87. [ ] Kiểm tra lý do trống hoặc sai độ dài bị từ chối.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

88. [ ] Kiểm tra audit được ghi atomically đúng một lần.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

89. [ ] Kiểm tra lịch đã xuất bản không bị sửa bởi lifecycle writer.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

90. [ ] Kiểm tra bản nháp lịch không bị sửa bởi lifecycle writer.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

91. [ ] Kiểm tra dữ liệu chấm công không bị sửa bởi lifecycle writer.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

92. [ ] Kiểm tra dữ liệu lương không bị sửa bởi lifecycle writer.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

93. [ ] Kiểm tra Supabase Auth account không bị xóa hoặc chỉnh bởi lifecycle writer.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

94. [ ] Kiểm tra quyền `anon` đối với lifecycle RPC trên clone.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

95. [ ] Kiểm tra quyền `authenticated` đối với các bảng audit gốc trên clone.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

96. [ ] Chạy signed-JWT thực cho Owner vào clone/QA stack tương đương.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

97. [ ] Chạy signed-JWT thực cho Manager ALL vào clone/QA stack tương đương.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

98. [ ] Chạy signed-JWT thực cho Staff vào clone/QA stack tương đương.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

99. [ ] Chạy kiểm thử âm trường hợp Manager partial scope và nhân viên đa chi nhánh.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

100. [ ] Chạy bộ test UI nhân viên ACTIVE/INACTIVE/ALL trên exact PR HEAD.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

101. [ ] Chạy bộ test dòng sửa bằng bút chì và nút `Lưu thay đổi` trên desktop.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

102. [ ] Chạy bộ test dòng sửa bằng bút chì và nút `Lưu thay đổi` trên màn hình 390px.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

103. [ ] Kiểm tra UI báo lỗi thật nếu RPC lifecycle chưa tồn tại (`fail-closed`).
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

104. [ ] Chạy UI2 Cross Role Acceptance trên exact SHA của PR #394.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

105. [ ] Chạy People Shift Day-10 trên exact SHA của PR #394.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

106. [ ] Chạy kiểm thử hồi quy Manager hiện tại trên exact SHA của PR #394.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

107. [ ] Chốt `LIFECYCLE_RELEASE_GATES=PASS` nếu tất cả bước phía trên có bằng chứng.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

## E — Triển khai hẹp vòng đời nhân viên

108. [ ] Rebase hoặc đồng bộ PR #394 với SHA `main` mới nhất mà không lấy chức năng #392.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

109. [ ] So sánh danh sách file thay đổi của PR #394 sau đồng bộ với manifest đã duyệt.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

110. [ ] Chạy lại toàn bộ CI bắt buộc trên exact SHA phát hành mới.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

111. [ ] Chốt SHA ứng viên và SHA rollback mã frontend.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

112. [ ] Xác nhận backup + quyền ownership/ACL/RLS có thể phục hồi ở thời điểm phát hành.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

113. [ ] Kiểm tra kế hoạch rollback database additive và giới hạn phục hồi dữ liệu sau cutover.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

114. [ ] Kiểm tra chính sách phát hành mới nhất của Owner trong SOT §0.71.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

115. [ ] Áp dụng lifecycle migration trên Production chỉ khi toàn bộ gate PASS và có quyền phát hành.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

116. [ ] Xác minh hai lifecycle RPC đã tồn tại qua metadata Production.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

117. [ ] Xác minh RLS, owner, grants của đối tượng lifecycle qua catalog Production.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

118. [ ] Xác minh role/negative-scope production không làm biến đổi nhân viên thật.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

119. [ ] Merge đúng PR #394 theo SHA đã chốt.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

120. [ ] Xác minh GitHub Pages deployed SHA hậu merge.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

121. [ ] Chạy smoke giao diện nhân viên ở Production không kết thúc/khôi phục nhân viên thật.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

122. [ ] Xác minh không có thay đổi đột xuất trong lịch, lương, chấm công Production.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

123. [ ] Ghi `LIFECYCLE_NARROW_RELEASE=PASS` cùng migration ledger và deployment run.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

## F — XSTORE-019K Full-time/Part-time & thứ tự ưu tiên

124. [ ] Đọc `employee_constraints` trên Production ở mức đếm tổng hợp.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

125. [ ] Đọc migration XSTORE-019K exact file trong PR #392.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

126. [ ] Kiểm tra quan hệ/cột `employment_type` hiện tại qua metadata.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

127. [ ] Kiểm tra enum FULL_TIME/PART_TIME/INTERN/OTHER và cách xử lý Unknown.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

128. [ ] Kiểm tra quyền Manager được phép sửa loại nhân viên trên clone.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

129. [ ] Kiểm tra quyền Staff chỉ được xem loại của mình trên clone.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

130. [ ] Kiểm tra Manager ngoài phạm vi bị từ chối sửa loại trên clone.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

131. [ ] Kiểm tra audit khi đổi loại nhân viên trên clone.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

132. [ ] Kiểm tra nhân viên chưa phân loại không bị suy đoán mặc định là PT.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

133. [ ] Kiểm tra Store Priority không bị thay đổi khi chỉ cập nhật FT/PT.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

134. [ ] Kiểm tra FT/PT không bị thay đổi khi chỉ cập nhật Store Priority.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

135. [ ] Kiểm tra UI `Lưu thay đổi` báo partial-save trung thực nếu RPC thứ hai lỗi.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

136. [ ] Kiểm tra FT/PT selector bật được nhưng lưu bị chặn khi RPC chưa phát hành.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

137. [ ] Chạy kiểm thử FT-first/PT-residual với nhân viên đủ điều kiện trên clone.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

138. [ ] Chạy kiểm thử PT chỉ lấp khoảng trống còn lại sau FT hợp lệ.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

139. [ ] Chạy kiểm thử không xếp trùng ca giữa CN1–CN4.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

140. [ ] Chạy migration K trên full-schema clone và xác minh SQL idempotent.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

141. [ ] Chốt quyền thực thi và rollback migration K trước phát hành.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

142. [ ] Triển khai migration K theo cửa phát hành được kiểm soát.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

143. [ ] Xác minh RPC FT/PT qua metadata + role-negative gates Production.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

144. [ ] Phân loại FT/PT cho từng nhân viên thực bằng nghiệp vụ có thẩm quyền, không mass-default.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

145. [ ] Đối chiếu nhân viên còn `UNKNOWN` và không cấp sai ưu tiên.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

146. [ ] Chạy readback FT/PT và xếp lịch thử DRAFT cho 4 chi nhánh.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

## G — XSTORE-019L Availability / chấm công ngoài lịch

147. [ ] Đọc migration L trên exact PR #392.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

148. [ ] Xác minh migration L không đụng vào bảng lương hoặc published schedules.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

149. [ ] Chạy migration L sau migration K trên full-schema clone.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

150. [ ] Kiểm tra Staff gửi yêu cầu ngoài lịch tạo PENDING.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

151. [ ] Kiểm tra Manager đúng phạm vi có thể duyệt PENDING.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

152. [ ] Kiểm tra Staff không tự duyệt yêu cầu.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

153. [ ] Kiểm tra Manager sai chi nhánh không thể duyệt.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

154. [ ] Kiểm tra giờ yêu cầu trùng ca PUBLISHED ở chi nhánh khác bị từ chối.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

155. [ ] Kiểm tra duyệt yêu cầu trùng ca PUBLISHED ở chi nhánh khác bị từ chối.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

156. [ ] Kiểm tra hai yêu cầu ngoài lịch trùng giờ bị từ chối sau duyệt lần đầu.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

157. [ ] Kiểm tra khóa đồng thời per-employee/day chống double approval.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

158. [ ] Kiểm tra yêu cầu ngoài lịch không tự ghi chấm công chính thức/lương.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

159. [ ] Kiểm tra lịch sử review/audit giữ nguyên sau reload.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

160. [ ] Kiểm tra giao diện điện thoại 390px cho gửi/duyệt/hiển thị trạng thái.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

161. [ ] Chốt migration L, role gates và kế hoạch rollback.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

162. [ ] Triển khai migration L theo phát hành được phê duyệt.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

163. [ ] Xác minh RPC ngoài lịch và từ chối quyền sai phạm vi trên Production.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

## H — Manager V4, lịch 5 bảng và cross-store scheduler

164. [ ] Kiểm tra PR #390 với mã XSTORE-018 trong PR #392 để tránh merge trùng.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

165. [ ] Đọc acceptance rules 5 bảng Manager của SOT.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

166. [ ] Chạy browser 1440px cho Manager Boards 1–5.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

167. [ ] Chạy browser 390px cho Manager Boards 1–5.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

168. [ ] Kiểm tra Manager Step 3 gộp cảnh báo thiếu người từng ngày như thiết kế duyệt.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

169. [ ] Kiểm tra Manager Step 4 mặc định chỉ hiện phần tóm tắt cần thiết.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

170. [ ] Kiểm tra drill-down cảnh báo thiếu người mở đúng khoảng ca cần xử lý.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

171. [ ] Kiểm tra phân loại FT/PT/Unknown hiện đúng nhãn trên thẻ ca.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

172. [ ] Kiểm tra danh sách ứng viên theo tiêu chí store scope và Availability.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

173. [ ] Kiểm tra bộ lọc ứng viên loại nhân viên INACTIVE.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

174. [ ] Kiểm tra bộ lọc ứng viên loại người đã có DRAFT overlap.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

175. [ ] Kiểm tra một nhân viên không thể nhận hai ca trùng giờ xuyên CN1–CN4.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

176. [ ] Kiểm tra thao tác chỉnh ca Manager chỉ ghi DRAFT trước Publish.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

177. [ ] Kiểm tra chỉ Manager đúng quyền mới được Validate lịch.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

178. [ ] Kiểm tra Check/Review không tự Publish.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

179. [ ] Kiểm tra Publish chỉ dùng luồng chính thức Validate→Review→Publish.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

180. [ ] Kiểm tra reload/cache không làm mất giá trị thực đã lưu.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

181. [ ] Xác minh Owner duyệt lại giao diện Manager đã bị từ chối ngày 11/10.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

182. [ ] Chạy XSTORE-015 Manager Override QA trên exact candidate.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

183. [ ] Chạy XSTORE-016 Scheduling IA QA trên exact candidate.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

184. [ ] Chạy XSTORE-017 Inline Shortage QA trên exact candidate.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

185. [ ] Chạy XSTORE-018 Supplemental Pool QA trên exact candidate.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

## I — Employee V4

186. [ ] Kiểm tra ô đăng ký Availability bắt đầu 05:00 theo quy tắc.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

187. [ ] Kiểm tra ô đăng ký Availability kết thúc 22:00 theo quy tắc.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

188. [ ] Kiểm tra đăng ký nhiều interval không ghi trước khi bấm Lưu.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

189. [ ] Kiểm tra gộp interval hợp lệ không làm mất phút làm việc.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

190. [ ] Kiểm tra bỏ chọn interval vẫn giữ vùng khác.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

191. [ ] Kiểm tra lưu thất bại phản ánh chính xác interval chưa lưu.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

192. [ ] Kiểm tra ngày đóng đăng ký được hiển thị read-only.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

193. [ ] Kiểm tra lịch đã công bố được đọc từ nguồn chính thức.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

194. [ ] Kiểm tra đồng hồ chấm công dùng thời gian máy chủ.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

195. [ ] Kiểm tra chấm công ngoài lịch phải chờ Manager duyệt.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

196. [ ] Kiểm tra mọi thao tác Employee mobile 390px sau reload.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

197. [ ] Kiểm tra Staff không đọc hoặc sửa hồ sơ người khác.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

## J — Owner V4 / SAPO provenance / lợi nhuận

198. [ ] Xác minh nguồn canonical `loadReconciledRevenue` còn hoạt động.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

199. [ ] Đếm tổng bản ghi SAPO `UNRESOLVED` theo tháng ở chế độ aggregate read-only.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

200. [ ] Đếm đơn SAPO có phiên điểm danh đúng ngày nhưng lệch tên nhân viên.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

201. [ ] Đếm đơn SAPO có đúng tên/ngày và thời gian hợp lệ nhưng còn UNRESOLVED.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

202. [ ] Kiểm tra điều kiện `VALID` của attendance session theo contract resolver.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

203. [ ] Kiểm tra danh sách alias xác thực tồn tại hay chưa bằng tổng hợp.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

204. [ ] Tạo báo cáo sai lệch attribution theo ngày/chi nhánh không xuất PII.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

205. [ ] Xác định vì sao các đơn đủ điều kiện vẫn chưa được materialize mà không gọi resolver thật.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

206. [ ] Kiểm tra thuật toán đối soát nguồn SAPO trên clone với dữ liệu phi định danh.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

207. [ ] Kiểm tra mọi job hiệu chỉnh attribution có tính idempotent trên clone.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

208. [ ] Chỉ chạy sửa attribution thật khi đã có bằng chứng và cho phép ghi cụ thể.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

209. [ ] Kiểm tra daily revenue trả quality=`ACTUAL` chỉ khi đối soát đủ.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

210. [ ] Kiểm tra `ESTIMATE`/`GAP`/`NOT_CONNECTED` không hiển thị như doanh thu thật.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

211. [ ] Kiểm tra công nợ nhà cung cấp không bị tính nhầm thành chi phí hoặc lợi nhuận.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

212. [ ] Kiểm tra các KPI thiếu nguồn chuẩn hiện `—` thay vì số giả.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

213. [ ] Kiểm tra phân tích doanh thu từng chi nhánh không dùng đơn chưa giải quyết attribution.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

214. [ ] Kiểm tra gross sales không bị quảng bá thành profit/cashflow.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

215. [ ] Chạy Owner Strategy source-authority QA.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

216. [ ] Chạy Owner Control Tower QA trên exact candidate.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

217. [ ] Chạy Owner responsive browser 390px và 1440px.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

218. [ ] Chốt owner acceptance cho trạng thái dữ liệu thực/chưa có dữ liệu.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

## K — Procurement QA Robot: xử lý lỗi 51/82 và 31 badges

219. [ ] Đọc đúng log job `117172747663` của run `38960113441`.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

220. [ ] Ghi số liệu baseline QA `51/82` và `31` thiếu badge.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

221. [ ] Đọc danh sách `db_reference_missing_set` từ log thất bại.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

222. [ ] Truy xuất tổng mặt hàng thực tế của bảng procurement qua read-only SQL.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

223. [ ] Truy xuất tổng item có tham chiếu giá/quy cách hợp lệ qua read-only SQL.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

224. [ ] Đối chiếu tập mã hàng thiếu với nguồn giá tham khảo hiện tại.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

225. [ ] Đối chiếu dataset fixture mà robot dùng với hợp đồng dữ liệu đã phê duyệt.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

226. [ ] Xác định trường hợp thất bại do drift dữ liệu thay vì hỏng giao diện.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

227. [ ] Chỉ sửa expected assertions nếu đặc tả cho phép số liệu biến động.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

228. [ ] Chỉ sửa dữ liệu tham chiếu thật bằng quy trình procurement có thẩm quyền nếu dữ liệu thiếu thực.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

229. [ ] Kiểm tra badge thiếu giá vẫn báo đúng ở giao diện.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

230. [ ] Kiểm tra giá thực tế theo hóa đơn không bị thay bởi giá tham khảo giả.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

231. [ ] Chạy lại `reference_coverage_ui` với dữ liệu chuẩn.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

232. [ ] Chạy lại `reference_missing_badges` với dữ liệu chuẩn.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

233. [ ] Chạy lại `db_reference_missing_set` với dữ liệu chuẩn.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

234. [ ] Chạy lại toàn bộ Procurement QA Robot trên exact main.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

235. [ ] Chốt `PROCUREMENT_QA=PASS` với run mới và logic expected được chứng minh.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

## L — XSTORE-019 broad RC và XSTORE-020 Production nghiệm thu

236. [ ] Đồng bộ PR #392 với main mới nhất mà không đưa ngược regression cũ.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

237. [ ] Xác nhận không lấy trùng code từ PR #390 hoặc PR #394 đã phát hành.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

238. [ ] Chạy toàn bộ unit/static suite trên exact PR #392 head.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

239. [ ] Chạy toàn bộ UI2 Cross Role acceptance trên exact head.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

240. [ ] Chạy People Shift Day-10 trên exact head.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

241. [ ] Chạy Owner Control Tower trên exact head.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

242. [ ] Chạy AUTH-PROD trên exact head.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

243. [ ] Chạy XSTORE Unified RC trên exact head.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

244. [ ] Chạy ba vai trò Owner/Manager/Employee có JWT thật với phạm vi xác thực.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

245. [ ] Chạy security/RLS negatives với partial Manager và foreign-store.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

246. [ ] Kiểm tra cache reload của cả ba vai trò.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

247. [ ] Đối chiếu migration lịch/nhân sự còn thiếu trên clone full-schema.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

248. [ ] Xác nhận backup, rollback và trạng thái ACL đúng exact release.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

249. [ ] Đóng gói exact SHA và rollback SHA cùng tất cả report.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

250. [ ] Ghi các khoảng trống dữ liệu kinh doanh còn mở và Owner acceptance cho từng metric.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

251. [ ] Chốt `RC_READY` chỉ khi các tiêu chí còn bắt buộc đều PASS.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

252. [ ] Nhận phê duyệt đúng exact RC theo quyền phát hành đã ghi trong SOT.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

253. [ ] Merge/deploy đúng exact RC sau khi đủ điều kiện.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

254. [ ] Xác nhận Pages source và Pages deploy đều SUCCESS trên exact main mới.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

255. [ ] Kiểm tra Manager đổi chi nhánh CN1→CN4 trên lịch thực.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

256. [ ] Kiểm tra Store Priority thật cho các nhân viên được quản lý.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

257. [ ] Kiểm tra weekly staffing templates của CN1–CN4 đã được lưu chuẩn.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

258. [ ] Kiểm tra Employee Availability trong tuần mục tiêu thực.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

259. [ ] Chạy Auto Schedule cho tuần mục tiêu ở chế độ DRAFT.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

260. [ ] Kiểm tra thiếu người và ứng viên theo từng khoảng giờ ở cả bốn chi nhánh.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

261. [ ] Kiểm tra Manager chỉnh DRAFT theo quyền.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

262. [ ] Kiểm tra Manager Validate lịch mục tiêu.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

263. [ ] Kiểm tra Manager Review lịch mục tiêu.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

264. [ ] Chỉ Publish khi Owner/Manager có thẩm quyền duyệt lịch tuần mục tiêu.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

265. [ ] Xác nhận Employee xem lịch được công bố giống nguồn chính thức.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

266. [ ] Xác nhận Owner thấy lịch nhất quán với Manager và Employee.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

267. [ ] Chốt XSTORE-020 PASS bằng bằng chứng ca thật, actor thật và SHA thật.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

268. [ ] Chốt XSTORE-011 theo đúng điều kiện phụ thuộc XSTORE-020.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

## M — Xóa cứng tài khoản tạo nhầm (luồng riêng, không dùng cho nhân viên nghỉ việc)

269. [ ] Xác định các quan hệ FK tham chiếu `profiles`/`auth.users` trên bản clone.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

270. [ ] Kiểm tra trường hợp có work_schedules phải bị từ chối xóa hẳn.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

271. [ ] Kiểm tra trường hợp có DRAFT assignment phải bị từ chối xóa hẳn.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

272. [ ] Kiểm tra trường hợp có attendance hoặc payroll phải bị từ chối xóa hẳn.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

273. [ ] Kiểm tra trường hợp có audit/compliance phải bị từ chối xóa hẳn.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

274. [ ] Kiểm tra trường hợp chỉ là tài khoản tạo nhầm không có phụ thuộc.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

275. [ ] Thiết kế và kiểm thử RPC Owner-only không có cascade phá dữ liệu.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

276. [ ] Kiểm tra xác nhận lần hai và ghi audit thao tác xóa cứng.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

277. [ ] Chỉ phát hành hard delete sau phê duyệt riêng và test đầy đủ.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

278. [ ] Xác nhận Manager không thấy hành động xóa cứng ngoài quyền.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

## N — Đóng dự án và xóa TEMP SOT đúng điều kiện

279. [ ] Xác nhận mọi task đánh số trong file này có PASS hoặc ngoại lệ được Owner ghi rõ.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

280. [ ] Xác nhận không còn Actions failure chưa phân loại trong phạm vi MAGASIN đã chọn.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

281. [ ] Xác nhận RLS/ACL backup regression chạy GREEN trên exact-main.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

282. [ ] Xác nhận Procurement QA Robot chạy GREEN sau khi chốt dữ liệu.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

283. [ ] Xác nhận trạng thái Production của lifecycle, FT/PT, Attendance, 3-role UI và Owner read models.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

284. [ ] Chuyển các quy tắc đã nghiệm thu vào tài liệu Workforce/Platform vĩnh viễn.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

285. [ ] Ghi bảng truy vết cuối cùng: task ID → PR → commit → run → kiểm thử → trạng thái.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

286. [ ] Xóa TEMP source sau khi các tài liệu vĩnh viễn đã thay thế và Owner chấp nhận đóng.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

287. [ ] Xác nhận trang Production vẫn hoạt động sau giai đoạn đóng.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

## 4. JOURNAL KẾT QUẢ (cập nhật tuần tự trong cùng file)

| Thời điểm ICT | ID | Trạng thái | Bằng chứng chính xác | Chướng ngại / bước kế tiếp |
|---|---:|---|---|---|
| 2026-10-17 | — | PLAN_CREATED | Branch `docs/xstore-release-recovery-atomic-20261017` từ `main 3c4a4e7`; tài liệu chưa merge; không production write | Bắt đầu ID 1 |

## 5. EXIT CRITERIA TOÀN DỰ Á

- Backup/restore **owner+ACL+RLS parity PASS**; SAPO resolver P0 đóng; 3-role scope/JWT/negative RPC PASS.
- PR #394 lifecycle đã phát hành kiểm chứng; FT/PT, L outside attendance, Manager/Employee/Owner V4 phát hành từ exact RC có approval.
- Dữ liệu SAPO/revenue xử lý đúng tính trung thực; Procurement QA GREEN; các luồng lịch thật 4 chi nhánh và XSTORE-020/011 nghiệm thu.
- Không xóa dữ liệu thật để thử nghiệm; không biến cảnh báo bất toàn thành PASS.
- Tất cả ID có bằng chứng, log và tài liệu vĩnh viễn đã đồng bộ, khi đó mới được kết thúc/xóa SOT tạm.

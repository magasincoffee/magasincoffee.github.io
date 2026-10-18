# MAGASIN — ATOMIC RELEASE & RECOVERY EXECUTION — TEMP SOURCE OF TRUTH

**Search key:** `MAGASIN-ATOMIC-RECOVERY-20261017`  
**Version:** 1.0 — 2026-10-17 (Asia/Ho_Chi_Minh)  
**Track:** XSTORE-019O → XSTORE-019K/L/V4 → XSTORE-020 → closure + SAPO/Procurement/security  
**Repository:** `magasincoffee/magasincoffee.github.io`  
**Production:** Supabase `MAGASIN-NOIBO` / `menvbzlsncmpuvnaifxa`; **KHÔNG** dùng `OPS-WebApp`  
**Release-target allowlist / ID 8 (verified 2026-10-17 18:37 ICT):** Mọi lệnh phát hành MAGASIN liên quan Supabase (SQL/migration/DDL/data migration/deploy) phải xác minh tường minh `project_ref=menvbzlsncmpuvnaifxa` và tên `MAGASIN-NOIBO` **trước khi chạy**. `OPS-WebApp` / `foclxkjnypjolcwqekku` = **DENY**; không dùng mặc định/implicit project target; không khớp hoặc thiếu project_ref thì **STOP**, không thực thi. Đây là quy tắc điều phối bắt buộc, không phải chứng nhận đã kiểm toán mọi workflow hoặc script bên ngoài.  
**Base main verified:** `3c4a4e7484f1ab161ba8cc3bbb2d49b1eaa855ae` (2026-10-16)  
**Branch riêng chỉ tài liệu:** `docs/xstore-release-recovery-atomic-20261017` — **chưa merge / không deploy Production**  
**Phạm vi:** khắc phục triệt để những lỗi/chức năng MAGASIN nêu trong phiên kiểm tra, không mở thêm sản phẩm hoặc project khác.  
**Status tổng:** EXECUTION IN PROGRESS; ID 1–10 + ID 12–19 + ID 54–58 PASS (23/287); ID 11 BLOCKED / OWNER-DEFERRED cho điều phối phát triển; RELEASE BLOCKED đối với các hard gate chưa đạt.  
**Tổng:** **287 việc nguyên tử**, chỉ có một luồng thực thi có thứ tự tăng dần.

## 0. HƯỚNG DẪN BẮT BUỘC CHO CHAT/ROBOT MỚI

1. Mở file này từ đúng branch/PR GitHub, **không** giả định bản trên `main` đã được merge.
2. Đọc tài liệu nghiệp vụ gốc `01_DOCS/MAGASIN/05_SYSTEM/WORKFORCE_CROSS_STORE_SCHEDULING_TEMP_SOURCE_OF_TRUTH.md` ở `main`. File này là **checklist điều phối**, KHÔNG thay thế quy tắc bảo mật và nghiệp vụ của SOT gốc.
3. Đối chiếu mới nhất PR #392, #393, #394, #436, #390; GitHub Actions; Supabase metadata trước thao tác. Các SHA và con số ngày 17/10 là baseline lịch sử, không là bằng chứng hôm sau.
4. Đọc journal cuối file và chọn **ID nhỏ nhất chưa PASS mà các tiền đề đã PASS**, **ngoại trừ ID 11 và ID 20–53 được Owner cho phép tạm gác để tiếp tục xây WebApp**. Không được tính ID 11 là PASS; chuyển sang ID 12 rồi ID 13 theo thứ tự. Chỉ thực hiện một ID mỗi lần; nếu sửa để đạt PASS, dùng nhánh/PR chuyên trách, kiểm chứng rồi ghi nhật ký.
5. Mỗi ID có trạng thái `TODO` → `DOING` → `PASS` hoặc `BLOCKED`. **Không** tự đánh dấu PASS chỉ vì workflow xanh nếu step quan trọng SKIPPED, không mặc định PASS cho data thiếu.
6. Mỗi lần hoàn thành: sửa đúng checkbox ID bằng commit tài liệu trong **cùng nhánh nguồn này**; ghi nhật ký 1 dòng `[ngày ICT] [ID] [status] [evidence PR/run/SHA/SQL summary] [next]`. Nếu blocker, ghi đúng blocker, không tự skip hay vượt qua gate; riêng ID 11 và ID 20–53 có **Owner-deferred exception về thứ tự công việc**, KHÔNG phải chứng nhận PASS hoặc miễn gate phát hành.
7. Nếu phát hiện lỗi mới: ghi ID phụ `<số>.a` ngay sau ID liên quan, trước khi chạy task kế tiếp; không đánh lại ID ổn định. Ràng buộc hoàn thành phải có dữ liệu chứng minh.
8. **READ-ONLY mặc định.** Không gọi resolver SAPO có side-effect, không thay đổi hồ sơ nhân viên thật, payroll, schedules hoặc SQL DDL Production để smoke test.
9. Chỉ áp dụng SQL Production, merge/deploy, xuất bản lịch hoặc xoá dữ liệu khi có backup/restore tương đương, roles/RLS/ACL, exact SHA/CI và phê duyệt phù hợp. Chỉ một task phát hành được triển khai tại một thời điểm; thất bại thì STOP.
10. Secrets/JWT/password/PII không ghi vào tài liệu, chat, GitHub logs hoặc PR. Sử dụng account đã được Owner ủy quyền; không giả lập Production identity hay đoán token.
11. Ưu tiên cloud/GitHub/Supabase từ điện thoại; không biến H4 thành tiền đề bắt buộc. Không tạo Supabase staging tính phí mà chưa được phê duyệt chi phí.
12. Chỉ phát hành hẹp PR #394 trước; PR #392 lớn chưa được tự động merge. Directive SOT §0.71 cho phép phát hành 019O khi đủ gate, không chờ nửa đêm **chỉ với phạm vi đó**.
13. Thay đổi kiểm thử riêng trên nhánh tài liệu không đồng nghĩa deploy. Bằng chứng Production phải ghi exact-main + Pages run + migration ledger.
14. Hoàn tất **mọi task** và đồng bộ tài liệu kiến trúc lâu dài trước khi xóa file tạm.
15. **Owner decision — 2026-10-17 20:20:46 ICT:** Mục tiêu ưu tiên là **WebApp MAGASIN thực sự hoàn thiện và sử dụng được**; bản Production hiện tại còn thô sơ, không được coi là nghiệm thu hoàn chỉnh. Owner đồng ý **tạm bỏ qua kiểm toán lịch sử tuyệt đối của ID 11** để tiếp tục phát triển. ID 11 giữ nguyên `[ ]` + `BLOCKED` (theo 4 trạng thái hợp lệ); ghi nhãn **OWNER-DEFERRED** trong phần giải thích, **không tự chuyển thành PASS**. Được phép tiếp tục ID 12→13… trong phạm vi **tài liệu, phân tích, nhánh test và QA cô lập**. Trước bất kỳ production SQL/DDL, merge/deploy, publish lịch hoặc thay đổi dữ liệu thật nào, **không được bỏ qua** backup/restore owner+ACL/RLS, JWT/authorization, exact-HEAD CI và Owner release approval. Không mặc định mở lại ID 11 vì những vòng rà soát không có bằng chứng lịch sử mới; chỉ quay lại ID 11 khi Owner yêu cầu hoặc khi tiêu chí xác minh trạng thái hiện tại được Owner xác nhận rõ. Các task phát hành phải kiểm tra gates độc lập với ID 11.

16. **Owner decision — 2026-10-17 (current instruction, following ID20):** Tạm hoãn nhóm **backup cũ / recovery parity ID20–53** để tập trung hoàn thiện tính năng, giao diện và QA WebApp MAGASIN. Đây là ngoại lệ **chỉ về thứ tự điều phối phát triển**, không phải PASS hoặc xóa nhiệm vụ: giữ mọi checkbox ID20–53 `[ ]`, giữ ID20 `BLOCKED / OWNER-DEFERRED`, ID21–53 `TODO / OWNER-DEFERRED`; được phép tiếp tục các task an toàn độc lập ngoài nhóm recovery, bắt đầu **ID54** (SAPO security read-only), rồi tiến tới kiểm thử/tính năng WebApp ở những ID tiếp theo theo thứ tự SOT. Không tự bỏ qua các gate bảo mật SAPO; bất kỳ task nào đòi Production mutation, merge/deploy, publish lịch, thay dữ liệu thật đều phải STOP đến khi backup/restore owner+ACL/RLS parity, JWT/authorization, exact-head CI và Owner final approval được chứng minh. Không được tính nhóm deferred là PASS; không được xóa/sửa bản backup, secrets hay dữ liệu hiện hành. Mục tiêu là bản WebApp hoàn thiện sử dụng được, không phải bảo tồn giao diện thô sơ. Nếu một task sau phụ thuộc recovery thực sự, phân định an toàn theo từng task và không vượt gate.

17. **Owner decision — 2026-10-17 (after ID58 PASS):** Ưu tiên chuyển ngay đến phần **hoàn thiện WebApp + chuẩn bị phát hành**. Tạm hoãn **ID59–74** chỉ về **thứ tự thực hiện** để bắt đầu **ID75 (review manifest PR #394)** và các task chuẩn bị UI/QA/RC an toàn; giữ ID59–74 `[ ]`/`TODO / OWNER-DEFERRED`, không tính PASS, không xóa hoặc làm sai lệch phát hiện SAPO P0 tại ID55–56. **Đây KHÔNG phải phê duyệt phát hành, KHÔNG miễn kiểm soát resolver SQL ACL, backup/restore owner+ACL+RLS, JWT/RLS/security, exact-HEAD CI, migration/rollback và final Owner RC go/no-go.** Task chuẩn bị có thể thực hiện read-only trên GitHub, test/clone cô lập; bất kỳ Production SQL/DDL/mutation, merge/deploy hoặc publish nào (kể cả ID71, ID115, ID119, ID142, ID162, ID253) phải BLOCKED cho đến khi các gate độc lập được xác minh. ID59–74 phải được giải quyết trước khi đóng SAPO P0 hoặc chứng nhận RC/release phụ thuộc. Chỉ chọn ID75 là task kế tiếp; không tự nhảy qua ID75 hay đánh dấu các ID deferred là PASS.

18. **Owner clarification — 2026-10-18 (ID75):** FT/PT là chức năng đã yêu cầu trước đây nhưng **chưa phát hành**. Cho phép giữ phần **UI/QA FT/PT** trong PR #394 với fail-closed rõ ràng khi `list_employee_employment_types_v1` / `set_employee_employment_type_v1` chưa có; điều chỉnh manifest PR đúng **7 file**. Không coi đây là duyệt triển khai FT/PT backend hay migration K; muốn FT/PT chạy thật phải hoàn thành ID124–146 và các gate bảo mật, restore, exact-SHA CI và release approval. Việc cho phép phạm vi UI không miễn các gate PR #394/Production. Tiếp tục một task mỗi lượt từ ID76.

## 0.B. KẾ HOẠCH TRIỂN KHAI 4 GIAI ĐOẠN — OWNER CHỐT 2026-10-18

**Quyết định Owner:** Chốt 4 giai đoạn hoàn thiện WebApp MAGASIN, lấy khả năng sử dụng thực tế của Owner/Manager/Employee làm tiêu chí đầu ra. Đây là thay đổi **cách điều phối và ưu tiên triển khai**, KHÔNG phải bằng chứng task PASS, KHÔNG phải phê duyệt merge/deploy/DDL hoặc miễn bất cứ release gate nào. Giữ nguyên toàn bộ 287 task ID, nhật ký cũ và các ngoại lệ đã phê duyệt; không xóa/đánh PASS các task còn thiếu. Nhánh này chỉ là tài liệu điều phối; mã sản phẩm phải thay đổi trên PR/nhánh chuyên trách.

| Giai đoạn | Mục tiêu / task liên quan | Điều kiện nghiệm thu |
|---|---|---|
| **1 — Quản lý nhân viên** | Employee lifecycle / UI chỉnh sửa / Store Priority / FT/PT, ID75–146 (các ID chưa PASS). PR #394 ưu tiên lifecycle release hẹp; FT/PT backend theo XSTORE-019K riêng, không tự nhét migration K vào PR #394. | CRUD được phép thực tế qua canonical RPC, quyền Owner/Manager/Staff và negative scope đúng, FT/PT UNKNOWN minh bạch, save/reload chính xác; full-schema clone/QA & JWT, release gates đầy đủ trước khi phát hành. |
| **2 — Manager và Employee** | ID147–197: yêu cầu ngoài lịch, Manager 5 bảng, cross-store FT-first/PT-residual, Availability 05:00–22:00, chấm công/lịch được công bố, desktop/mobile 390px. | Tạo DRAFT → Validate → Review → Publish đúng phân quyền; không trùng giờ CN1–CN4, không ghi nhầm attendance/payroll, UI/reload/negative-role tests PASS. |
| **3 — Owner / SAPO / Procurement** | ID198–235 cùng SAPO security ID59–74 được tạm hoãn trước đây, dữ liệu revenue quality, attribution, Owner KPI và Procurement 51/82 + 31 missing badges. | KPI không bịa số, phân biệt ACTUAL/ESTIMATE/GAP, SAPO resolver khóa quyền không hợp lệ và wrapper được bảo vệ, Procurement QA GREEN, Owner acceptance. |
| **4 — RC / phát hành / nghiệm thu thực tế** | ID236–268, hard gates recovery ID20–53 + release ID107–123/142/162/253 và các hạng mục đóng ID269–287 khi đủ điều kiện. | Exact-head CI, 3-role signed-JWT/negative-scope, backup restore owner+ACL+RLS parity, rollback, Owner final go/no-go, phát hành từng phạm vi, exact deployed SHA, vận hành thật 4 chi nhánh, XSTORE-020/011 và hồ sơ nghiệm thu. |

### 0.B.1. Quy tắc điều phối theo giai đoạn

1. **Điểm bắt đầu hiện tại:** Giai đoạn 1, **ID78 BLOCKED** vì chưa xác minh clone full-schema cô lập. ID75–77 đã PASS theo phạm vi nhật ký; ID79–90 chưa chạy. **NEXT_TASK_ID=NONE khi blocker ID78 còn tồn tại.** Hành động thực tế kế tiếp là lập preflight về môi trường clone an toàn, xác minh quyền vận hành và source full-schema/fixture; không tự gán PASS ID78 hay nhảy sang ID79.
2. Mỗi lượt triển khai chọn **một task nguyên tử đủ tiền đề**, kiểm tra bằng chứng exact SHA và ghi kết quả; các yêu cầu theo lô vẫn phải tôn trọng phụ thuộc và dừng tại blocker. Cho phép làm mã/giao diện và chạy QA **độc lập, cô lập** ở nhánh chuyên trách khi không phụ thuộc task bị chặn; ghi rõ liên hệ ID và lý do độc lập trong nhật ký, không coi đó là PASS của task chặn.
3. **Gates phát hành chạy song song trên checklist, không được bỏ qua:** restore owner/ACL/grantor/default privileges/RLS; SAPO anon/authenticated EXECUTE exposure; JWT và RLS/role negatives; CI exact release HEAD; migration ledger; rollback; Owner final RC approval. Ngoại lệ thứ tự ID11, ID20–53, ID59–74 không áp dụng cho việc cho phép release.
4. **Mỗi giai đoạn xuất một bảng kiểm chứng:** màn hình/luồng đang hoạt động trên Production vs mã trong PR vs còn thiếu; source branch/PR/exact SHA; test run; blocker; kết quả nghiệm thu. Code implemented ≠ isolated QA PASS ≠ CI PASS ≠ Production deployed ≠ Owner accepted.
5. Không tạo bản clone Supabase tính phí khi chưa có duyệt chi phí; không sao chép PII sang QA tùy tiện; không dùng Production để thử thao tác đổi status/xếp lịch/giờ công. Ưu tiên clone PostgreSQL cô lập trong CI/trusted runner với fixture phi định danh và parity chứng minh được.
6. **Không tự gộp #392 rộng vào #394**, không merge chồng #390; thay đổi mới nằm ở PR nhỏ có manifest rõ. UI FT/PT trong #394 được Owner chấp thuận nhưng migration K và functional release riêng. Bắt đầu phase 2/3 có thể chuẩn bị code độc lập, nhưng không tuyên bố phase trước hoàn thành khi acceptance/gates chưa đạt.

19. **Owner clarification — 2026-10-18, Giai đoạn 1:** Để phát triển nhanh, cho phép **tạo mới môi trường QA PostgreSQL cô lập với fixture dữ liệu giả** thay vì bắt buộc phục hồi backup cũ chỉ để chạy test chức năng. KHÔNG xóa bản backup lịch sử/Production; KHÔNG coi fixture tối thiểu là clone full-schema hoặc recovery parity PASS. Phát hành Production vẫn phải chứng minh backup/rollback hợp lệ, owner+ACL+RLS/JWT, exact-SHA CI và Owner go/no-go. Đã tạo PR QA [#439](https://github.com/magasincoffee/magasincoffee.github.io/pull/439) nhánh `qa/xstore-lifecycle-fresh-isolated-20261018` dựa trên PR #394: `lifecycle-fresh-fixture.sql`, `lifecycle-fresh-smoke.sql`, workflow `lifecycle-fresh-isolated-qa.yml` chạy PostgreSQL 17 tạm. Chưa có workflow PASS chứng minh; ID78 vẫn BLOCKED vì chưa đạt yêu cầu clone **đủ schema và FK**, ID79–90 vẫn TODO. Ưu tiên phát triển/test synthetic độc lập, sau đó tăng độ bao phủ theo bản schema hiện hành, không đánh tráo bằng chứng.

20. **Owner decision — 2026-10-18 (product-first):** WebApp đã có bản phát hành; **ưu tiên tiếp tục phát triển tính năng trực tiếp từ `main` và PR nhỏ**, không tiếp tục vòng lặp clone/schema QA của ID78 làm điều kiện chặn việc viết mã. **ID78 giữ `[ ]`, trạng thái `OWNER-DEFERRED / BLOCKED` (không PASS)**; các ID79–90 chưa hoàn thành không được chứng nhận PASS. Được phép thực hiện các task UI/feature độc lập với ID78 trên nhánh riêng, ghi rõ PR/exact SHA và phân biệt committed code với deployed Production. Quyết định này KHÔNG cho phép bỏ kiểm soát bảo mật, sao lưu, rollback, phân quyền hoặc approvals khi thực sự merge/deploy/SQL Production. Không xóa schema/backup/dữ liệu thật; không giả vờ đã kiểm thử. Bắt đầu bằng [PR #440](https://github.com/magasincoffee/magasincoffee.github.io/pull/440) thêm tìm kiếm nhân viên vào Manager trên nền `main` (1 file, no backend change).

21. **Owner decision — 2026-10-18 (complete-and-release, no historical restoration):** Mục tiêu từ đây là hoàn thiện và phát hành WebApp mới dựa trên `main`, **không yêu cầu khôi phục hoặc kiểm thử chức năng của bản legacy không còn sử dụng**. Đóng băng luồng phục hồi lịch sử như một việc `OWNER-DEFERRED` cho phát triển, không giả lập PASS ID11/20–53/78; không xóa backup hoặc dữ liệu Production. Phân biệt **kiểm thử bản cũ** (có thể bỏ) với **kiểm soát tối thiểu trước thay đổi Production mới** (phải duy trì): kiểm tra đúng target, phạm vi diff, phân quyền/RLS của RPC mới, rollback/sao lưu hiện hành phù hợp thay đổi, và kết quả phát hành SHA thật. Các PR `#392`, `#393`, `#394`, `#440` chưa merge theo lần kiểm tra này. Tiếp tục các PR nhỏ độc lập, ưu tiên nhanh UI không đổi DB; riêng PR #392 lớn phải chia nhỏ và xử lý xung đột, không merge mù. Không được tuyên bố đã phát hành khi GitHub Pages `main` chưa nhận commit. Phê duyệt sản phẩm của Owner không phải chứng minh CI/authorization kỹ thuật.

### 0.A. WORKFORCE SOT RÀNG BUỘC HIỆN HÀNH — ID 9 (đọc 2026-10-17 18:42 ICT)

**Nguồn pháp định nghiệp vụ:** [Workforce TEMP SOT ở `main`](https://github.com/magasincoffee/magasincoffee.github.io/blob/3c4a4e7484f1ab161ba8cc3bbb2d49b1eaa855ae/01_DOCS/MAGASIN/05_SYSTEM/WORKFORCE_CROSS_STORE_SCHEDULING_TEMP_SOURCE_OF_TRUTH.md), bản đọc có blob SHA `70097402e12151f3c4786d572bb68e4dba99850d`, 4.191 dòng; `main` HEAD khi đối chiếu `3c4a4e7484f1ab161ba8cc3bbb2d49b1eaa855ae`. Tóm tắt này là **chỉ mục ràng buộc**, không được thay thế SOT; phải đọc lại exact current `main` trước release. Khi lịch sử mâu thuẫn, áp dụng quyết định Owner có hiệu lực mới hơn trong §0.71 và giới hạn phạm vi đi kèm (§§0.20, 0.70).

1. **Ưu tiên phát hành, không mở rộng scope:** Ưu tiên đóng **XSTORE-019O lifecycle PR #394 hẹp** sau khi đủ chứng cứ. Không tự merge/bundling broad PR #392 hoặc PR #390; XSTORE-019K/L, FT/PT scheduler, V4 và XSTORE-020 là các gate riêng. PR #394 chỉ gồm các file lifecycle app/migration/QA được duyệt phạm vi (§§0.49, 0.65, 0.71). Các SHA/số lượng historical phải đối chiếu lại trên GitHub.
2. **Owner release timing precedence:** Chỉ đạo mới nhất §0.71 **bỏ yêu cầu chờ đến nửa đêm chỉ với PR #394 sau khi toàn bộ bảo mật/phục hồi/CI và approval đạt**; không mở rộng ngoại lệ này cho PR #392, release khác hay thao tác SQL chưa được phê duyệt. Quyết định Owner về thứ tự/ưu tiên **không** phải chứng chỉ security PASS hoặc miễn phê duyệt final go/no-go (§§0.20, 0.70–0.71).
3. **Production identity + denylist:** Chỉ `MAGASIN-NOIBO` / `menvbzlsncmpuvnaifxa`; `OPS-WebApp` / `foclxkjnypjolcwqekku` bị chặn (ID 8). Mọi lệnh SQL/DDL/migration/deploy phải kiểm project-ref và exact SHA, không cho implicit default hoặc unapproved Secrets/credential rotation.
4. **Recovery hard gate P0:** Full-backup đã mã hóa, giải mã/manifest/SHA/restore/rollback và parity **owner, relation/function ACL, grantor, default grants, RLS/policy**, khả năng dùng ứng dụng sau restore phải được chứng minh trên môi trường tương đương với Production; bản restore `--no-owner --no-acl` trước đây **không** chứng minh quyền owner/grant hoặc disaster recovery tương đương (§§0.61, 0.64–0.71). Recheck thời hạn artifact (lịch sử: hết hạn **2026-10-21 21:10 ICT**), quyền giải mã và fresh recoverability trước release; **SKIPPED không thành PASS**.
5. **JWT/RBAC/RLS hard gate:** Hosted Auth read-only đã đạt cho Owner, Store Manager `ALL`, Staff trên RPC hiện hành (§0.70), nhưng **chưa** thay thế kiểm chứng quyền của RPC lifecycle mới trên full schema, partial/foreign-store Manager DENY, Employee/inactive actor DENY, direct table/role-escalation DENY. Dùng phiên/JWT thật được ủy quyền; không giả lập production identity, không tiết lộ Secrets/JWT/PII; thiếu bằng chứng thì STOP (§§0.68–0.71).
6. **Employee lifecycle authority:** Chỉ canonical `list_employee_lifecycle_controls_v1` (scope/capability) và `set_employee_lifecycle_status_v1` (ACTIVE↔INACTIVE, lý do, audit, all-store-scope, actor active), **khi đã triển khai chính thức**. Chưa có RPC thì UI phải disable/fail-closed; không update `profiles` trực tiếp để giả lập thành công. Offboard/restore **không** xóa/sửa published schedule, attendance, payroll, Auth và lịch sử; future shifts cần cảnh báo để xử lý thủ công. Hard-delete phải là nhánh độc lập Owner-gated, dependency/FK/history preflight + hai bước xác nhận, không cascade (§§0.44, 0.48–0.49).
7. **Workforce canonical four stores:** CN1–CN4 dùng cùng sự thật lịch tuần; Store Priority có thứ tự do Manager/Owner đặt trong hồ sơ và xác lập nơi làm được phép, khác `primary store`. Employee chỉ đọc, không tự sửa. Availability chỉ trả lời **khi nào** có thể làm; không chọn store từng tuần, thời gian linh hoạt 05:00–22:00, nhiều khoảng; staffing recurring theo store/weekday/time/headcount phải được lưu bền và tái dùng (§§2.1–2.5, 6.0.1–6.0.5).
8. **Lập lịch fail-closed:** Auto Schedule chỉ tạo **DRAFT** trên pool toàn doanh nghiệp; không tự Publish. Ràng buộc cứng: ACTIVE/eligible staff, Store Priority, tuần mục tiêu, giờ hợp lệ, overlap cả trong/giữa chi nhánh, official schedule, daily cap, không ghi đè lịch REVIEWED/PUBLISHED. Manual Manager chỉ được override **Availability** bằng warning/audit; **không** override Store Priority hoặc hard conflict. Canonical flow: Validate → Review → Publish bởi người có thẩm quyền (§§2.4–2.5, 6.0.9 C–D).
9. **FT/PT canonical rule:** `FULL_TIME|PART_TIME` là thuộc tính nghiệp vụ do quản lý thiết lập, **không** phải RBAC role. Lập DRAFT hai lượt toàn bộ 4 chi nhánh/7 ngày: FT đủ điều kiện **toàn cục trước**, PT chỉ điền khoảng/headcount thiếu sau FT; không vượt hard gates hoặc sửa published. `Chưa phân loại` phải hiển thị trung thực, **không** auto coi là PT/FT hoặc tự backfill nhân viên production. FT/PT RPC/migration chưa phát hành phải fail-closed (§§0.40–0.41).
10. **Attendance/payroll truth:** Chấm công ca **đã Publish** ghi thời gian thực bằng canonical clock RPC; đi sớm/muộn không tự động yêu cầu Manager duyệt. Chấm công **ngoài lịch** hoặc manual alternate-time cần quy trình Manager review riêng; một yêu cầu ngoài lịch được APPROVED **không** tự sinh lịch Publish, attendance thật, giờ tính lương hay payment. Không tự thay payroll (§0.24).
11. **UI/Owner acceptance:** Manager dùng 5 bảng Chuẩn bị → Tạo lịch nháp → Chỉnh lịch (calendar-first) → Kiểm tra (read-only cùng calendar) → Duyệt & phát hành; shortage theo interval chính xác, nhóm theo ngày gọn, Shift Cluster, FT/PT label rõ `Chưa phân loại` nếu unknown; Employee mobile Availability rõ ràng; Owner trình bày chiến lược/P&L bằng nguồn xác minh, **không bịa revenue hoặc tính công nợ thành lợi nhuận**. Các acceptance UX lịch sử không tự động bao phủ phần đã bị Owner từ chối/sửa ngày 11/10 (§§0.39–0.40, 0.44–0.48, §7).
12. **Exit/reconciliation:** Trình tự gate hoàn chỉnh: frozen exact PR-head CI/security/recovery + final Owner RC go/no-go → chỉ #394 release hẹp → tiếp tục các track đã được duyệt → XSTORE-020 exact-main/live CN1–CN4 nghiệm thu thực tế → XSTORE-011 → chuyển quy tắc vào tài liệu canonical, xóa TEMP SOT cuối cùng. CI xanh, code implemented, isolated QA, deployed Production và accepted thực tế là **năm trạng thái khác nhau**, tuyệt đối không cộng gộp (§§0.20, 0.71, §7–8).

**Trạng thái ID 9:** PASS chỉ cho việc **đọc và cố định nguyên tắc**; tất cả các điều kiện release thiếu bằng chứng vẫn **BLOCKED**. Không tạo lệnh SQL, không merge/deploy, không publish lịch hay sửa hồ sơ thật.

**ID 11 — BLOCKED, verification at 2026-10-17 18:50 ICT:** baseline GitHub `main` = `3c4a4e7484f1ab161ba8cc3bbb2d49b1eaa855ae` (unchanged); GitHub Pages last returned run [38863217888](https://github.com/magasincoffee/magasincoffee.github.io/actions/runs/38863217888) `completed/success` on this SHA; Supabase `MAGASIN-NOIBO` `menvbzlsncmpuvnaifxa` = `ACTIVE_HEALTHY`, applied migration ledger 80/80 unique with latest `20261007171918`, matching ID 7; pending K/L/O migrations and related lifecycle/FTPT RPCs not deployed. Read-only public metadata confirms `profiles`, `employee_store_priorities`, `work_schedules`, `schedule_generation_assignments`, `employee_constraints` have RLS enabled and canonical catalog objects exist. Supabase unified logs inspected for baseline-to-current in two <=24h windows (2026-10-16T06:47:31Z–2026-10-17T12:00:00Z); postgres event stream has entries but does **not guarantee exhaustive successful DML/DDL, ACL/grant, Auth, Storage or out-of-band operator change coverage**; querying one message field for SQL verbs returning zero cannot prove none occurred. **Blocking gap:** no immutable full-schema/owner/ACL/RLS/role/function and business-data audit baseline plus complete time-scoped audit/deployment/change trail to classify every drift as authorized vs unauthorized. Therefore **no defensible blanket assertion “Production có 0 thay đổi ngoài kế hoạch”**. Require independent baseline parity/change/audit corroboration without exposing PII or modifying Production, then re-evaluate **this same ID 11**; until then ID 11 remains unchecked, ID 12 must NOT begin. No production mutation or release performed.  

**ID 11 — Follow-up catalog evidence / 2026-10-17 18:54 ICT (read-only):** Project `MAGASIN-NOIBO` `menvbzlsncmpuvnaifxa`. Production read-only aggregate values **unchanged from SOT §§0.49/0.68–0.70 historical snapshots**: ACTIVE OWNER=1, ACTIVE STORE_MANAGER=2, ACTIVE STAFF=28, INACTIVE STAFF=3, `employee_store_priorities`=106, `work_schedules`=87, `schedule_generation_assignments`=108, `employee_constraints`=0. Database migration ledger remains 80 with last version `20261007171918`, `main` baseline SHA unchanged. Live public catalog summary: 52 regular relations/views, 114 functions, 54 policies, 35 non-internal triggers, 24 default ACL rows, 30 database roles (raw counts, **not** historical equality proof). **New reproducible snapshot fingerprint** at `2026-10-17 18:53:50.207862 ICT`: 249 catalog entries (public relations/sequences, function owner+security+ACL+definition-hash, public policy definitions, default ACL); sorted `k=value` MD5 = **`cf7e4f277eb92ec43bd408b042e27f7b`**. Fingerprint uses MD5 as drift indicator, **not cryptographic tamper-proof audit**; it establishes **today's** baseline only and cannot retroactively establish past parity. Direct `pg_settings`: `log_statement=ddl`, `log_min_duration_statement=-1`, `pgaudit.log=none`, `log_connections=off`, `log_disconnections=off`; `pg_audit` extension not listed among installed extensions. Supabase `postgres_logs` in windows 2026-10-16T06:47:31Z–2026-10-17T12:00:00Z contain 337 + 32 entries, no SQL-command markers observed using event_message aggregated matching, but their completeness for authenticated DML/SQL Editor, grants, Auth, Storage, policy changes and reversions **is not proven**, and zero matched messages **must not** be interpreted as zero database writes. Historical [real restore run 38863218269](https://github.com/magasincoffee/magasincoffee.github.io/actions/runs/38863218269) explicit `REL_ACL=FAIL`, `FN_ACL=FAIL`, `REL_GRANTOR=FAIL`, `FN_GRANTOR=FAIL` show separate **recovery parity blocker**, not an assertion of live drift. **Decision unchanged: ID 11 BLOCKED** until comparable historical full-catalog/data state and complete authorized change trail can be independently established; do not attempt to manufacture baseline or disable logging, do not bypass audit requirement, do not start ID 12.

**ID 11 — Audit coverage follow-up 2026-10-17 18:59 ICT (READ-ONLY, still BLOCKED):** Queried current Supabase `MAGASIN-NOIBO` `menvbzlsncmpuvnaifxa`: found `auth.audit_log_entries` (Auth activity) and `public.procurement_audit_log` (Procurement row audit), plus SAYDI QC events; `pg_trigger` audit-scope list shows **7 row-audit triggers for Procurement entities** only, none covering the five canonical Workforce tables (`profiles`, `employee_store_priorities`, `work_schedules`, `schedule_generation_assignments`, `employee_constraints`) with an equivalent comprehensive row-change audit. Since baseline `2026-10-16T06:47:33Z`, Auth audit holds **45 entries** (`login`=6, `token_refreshed`=20, `token_revoked`=19), Procurement audit **0 entries**; these are aggregates only without user IDs/IP/secrets, do not by themselves imply an unauthorized modification. PostgreSQL `pg_stat_database.stats_reset=2026-08-25T20:33:23Z`; table insert/update/delete counters are cumulative **since before baseline** and cannot timestamp or attribute individual changes. `pg_stat_statements_info.stats_reset=2026-08-27T13:51:37Z`, 13,171 historical statements matching write/DDL keywords among 983,243 cumulative calls (normalization, reset and time-scope limitations); cannot identify which calls occurred after baseline, and this is **not** proof of a 13,171-write baseline-window incident. `pg_settings`: `log_statement=ddl`, `pgaudit.log=none`; `track_commit_timestamp=off`; missing complete historical all-write audit coverage is corroborated. Current Supabase Edge Functions list = exactly 1 `saydi-tts-worker` ACTIVE version 12, last updated `2026-10-05T09:36:36.978Z` **before** baseline (metadata only; not proof of no other remote systems). GitHub live `main` SHA remains `3c4a4e7484f1ab161ba8cc3bbb2d49b1eaa855ae`, no new GitHub Pages deployment after baseline seen in Actions listing. Historical [GitHub backup/restore workflow 38680192167](https://github.com/magasincoffee/magasincoffee.github.io/actions/runs/38680192167) `completed/failure` before baseline and [latest main isolated restore 38863218269](https://github.com/magasincoffee/magasincoffee.github.io/actions/runs/38863218269) fails ACL parity, so they cannot substitute for an immutable full-schema/full-data baseline + approved write ledger. **ID 11 remains `[ ]` / BLOCKED**. Required to close: trustworthy baseline provenance and scoped historical DML/ACL/audited change evidence allowing comparison to an approved-change register. Do not retroactively assert no off-plan mutations; do not enable production logging/DDL as a smoke test; do not begin ID 12.

**ID 11 — Historical archive execution preflight / read-only 2026-10-17 19:13 ICT (STILL BLOCKED):**

- **Eligible old snapshot source:** [2026-10-15 backup run 38680192167](https://github.com/magasincoffee/magasincoffee.github.io/actions/runs/38680192167) generated artifact **`11946749098`** named `xstore-019o-acl-full-encrypted-38680192167`, 6,251,739 bytes, ZIP SHA-256 `10d30c6b40b1bc14e285385eccfb4d5dd7bc310cbcd2c1f76358da43b71745de`, `expired=false` at readback on 17/10; expiry **2026-10-22 04:13:59 UTC** (= 11:13:59 ICT). This is encrypted historical backup with owner/ACL commands; preserve only in original GitHub encrypted artifact and trusted runner, **never download plaintext or expose credentials/PII**. The old run's `Capture fresh ACL-bearing production backup (read-only)`, `AES-256-GCM encrypt`, `Authenticate fresh archive` and `Store encrypted-only recovery artifact` steps were `SUCCESS`, but `Restore archive WITH owner and ACL` was **FAILURE** (`UNCLASSIFIED_SQL_ERROR; PHASE=CREATE_OBJECT`). The artifact is backed up/encrypted, **not** a complete verified restore.
- **Historical comparison has NOT RUN:** The connected GitHub actions allow read of artifacts/jobs and rerun of existing failed attempt, but **no fresh workflow_dispatch operation** or signed-in browser profile for GitHub; rerunning the original workflow/job at its immutable old HEAD without code repair would recreate the known failed restore path. To compare the backup safely, execute a reviewed trusted-`main` cloud job: pin artifact ID/digest, validate AES-GCM and internal manifest/SHA, restore in disposable network-isolated PostgreSQL without granting network to the restored DB, derive aggregated catalog and row fingerprints inside the job, and compare with fresh **read-only** Production fingerprints. Do not log plaintext, row-level data, credential, or token. This run requires an approved dispatch channel and secure archive decryption secret inside the runner; **not executed in this turn**.
- **Current Production snapshot safely captured:** At `2026-10-17 19:13:10.467441 ICT`, executed read-only aggregate `SELECT count(*), encode(sha256(convert_to(COALESCE(string_agg(to_jsonb(t)::text, E'\\n' ORDER BY to_jsonb(t)::text),''),'UTF8')),'hex')` per canonical table on project `menvbzlsncmpuvnaifxa`. SQL computes hashes server-side and only returns row count + SHA-256 (no business rows/PII). **Exact present-time fingerprints**: `profiles` 36 rows `9bb5814840589488d6cc2064d7983b5be1a29a1c1ec8315527f97632e2af22ea`; `employee_store_priorities` 106 `a8a3f545d38235d021e3b2ee8c001d5a427d934ae40f3d600b2941259802d2e8`; `work_schedules` 87 `37f8047735e580fb97d27092574b08d308f0630a34355fa80b60dab78ab25821`; `schedule_generation_assignments` 108 `1616ec8ae4a39545ff404ea54edf7519bfac169f01bd087fedcc6954d9dcc43f`; `employee_constraints` 0 `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` (SHA-256 of empty string). Note: source SQL is a **current** snapshot, not the unavailable old snapshot; compare only after equivalent canonical serialization/column definitions on historical restore, and re-capture current SHA against same timestamp/window. The hashes alone cannot show which actor changed a record and can change from legitimate business activity.
- **Stop criteria:** historical decrypted restore is not verified and no complete time-addressable write/change audit exists. Even equal historical and current hashes cannot categorically rule out intermediate modifications later reverted. The literal ID 11 claim `no off-plan production changes since baseline` **cannot be certified** from today's metadata alone. Do not lower criteria, mark PASS, dispatch old failing restore blindly, or change Production; return to ID 11 after actual historical restore evidence + authorized change reconciliation, or require explicit Owner approval to change acceptance to bounded **no unexplained state drift**. ID 12 remains untouched.

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
- **Ngoại lệ điều phối Owner cho ID 11 (2026-10-17 20:20:46 ICT):** Không còn là tiền đề chặn các task phát triển; giữ `BLOCKED`, không giả lập PASS. **Các release gates an toàn còn giữ nguyên STOP RULE độc lập**, không cho phép deploy chỉ vì được bỏ qua ID 11.
- Khác biệt giữa **code implemented**, **isolated QA PASS**, **Production deployed** và **real business accepted** phải giữ nguyên trong mọi báo cáo.

## 3. CHECKLIST NGUYÊN TỬ THEO THỨ TỰ 1 → 287

## A — Đóng băng bằng chứng / thiết lập điều phối

1. [x] Đọc SHA HEAD hiện tại của `main`; ghi SHA và thời điểm ICT vào Nhật ký.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

2. [x] Đọc trạng thái PR #436; ghi exact HEAD, Draft và checks.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

3. [x] Đọc trạng thái PR #393; ghi exact HEAD, Draft và checks.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

4. [x] Đọc trạng thái PR #394; ghi exact HEAD, Draft và checks.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

5. [x] Đọc trạng thái PR #392; ghi exact HEAD, Draft và checks.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

6. [x] Đọc trạng thái PR #390; xác nhận có trùng thay đổi với #392 không.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

7. [x] Đọc danh sách migration đã áp dụng trên MAGASIN-NOIBO; ghi đúng phiên bản cuối.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

8. [x] Xác nhận lại MAGASIN-NOIBO là Production; loại OPS-WebApp khỏi mọi lệnh phát hành.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

9. [x] Đọc SOT Workforce chính và ghi các ràng buộc hiện hành không thể bỏ qua.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

10. [x] Kiểm tra trạng thái, kết luận và SHA của các run mới nhất liên quan XSTORE.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

11. [ ] Xác nhận không có thay đổi Production không thuộc kế hoạch kể từ baseline. **OWNER-DEFERRED cho mục đích điều phối phát triển 2026-10-17 20:20:46 ICT; trạng thái BLOCKED, chưa PASS.**
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

12. [x] Tạo mẫu nhật ký bằng chứng cho từng ID, chỉ cho phép TODO/DOING/PASS/BLOCKED.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

## B — Phục hồi backup, owner, ACL và RLS (đường găng P0)

13. [x] Đọc log run `38863218269`; ghi đúng fingerprint REL_ACL=FAIL.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

14. [x] Ghi đúng fingerprint FN_ACL=FAIL từ cùng run.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

15. [x] Ghi REL_EDGES=FAIL và FN_EDGES=FAIL từ cùng run.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

16. [x] Ghi FN_NULL=FAIL từ cùng run.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

17. [x] Ghi REL_GRANTOR=FAIL và FN_GRANTOR=FAIL từ cùng run.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

18. [x] Xác định nguyên bản encrypted backup mới nhất còn hạn sử dụng; ghi artifact ID/expiry.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

19. [x] Đối chiếu SHA256 và manifest của backup có quyền sử dụng.
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

54. [x] Đọc chức năng `resolve_sapo_order_branches` thật trên Production theo metadata, không gọi hàm.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

55. [x] Kiểm tra quyền EXECUTE của `anon` trên resolver bằng catalog SQL read-only.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

56. [x] Kiểm tra quyền EXECUTE của `authenticated` trên resolver bằng catalog SQL read-only.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

57. [x] Xác nhận `ingest_sapo_batch` vẫn kiểm token trước thao tác ghi.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

58. [x] Rà soát caller SAPO robot hiện hành có gọi wrapper thay vì resolver trực tiếp.
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

75. [x] Đối chiếu các file thay đổi trong PR #394 với phạm vi phát hành hẹp đã duyệt.
   - **Trạng thái 2026-10-18:** PASS cho việc đối chiếu manifest/scope: Owner cho phép giữ FT/PT UI/QA trong PR #394, PR body đã cập nhật thành đúng 7 file và nêu rõ FT/PT backend/RPC/migration K/FT-first không phát hành cùng PR này. FT/PT phải fail-closed nếu RPC chưa triển khai; không phải chứng nhận FT/PT runtime PASS. Exact PR HEAD `a776324c65eaf0e444071c2f1ee4ec4b7c65cb2f`. Next ID76.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

76. [x] Xác nhận PR #394 không chứa migration FT/PT, lịch, lương hoặc xóa cứng.
   - **PASS 2026-10-18, scope-only:** PR #394 exact HEAD `a776324c65eaf0e444071c2f1ee4ec4b7c65cb2f` có đúng một migration `20261011224000_xstore_019o_staff_lifecycle_v1.sql`; SQL chỉ tạo audit + helper/read/write RPC lifecycle, writer cập nhật `profiles.status` và audit. Không tạo/sửa migration FT/PT, lịch, lương, xóa cứng hoặc xóa Auth. UI/QA FT/PT được Owner cho phép tại ID75 nhưng backend K riêng chưa phát hành; đây không phải chứng nhận chức năng hoặc an toàn Production. Next ID77.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

77. [x] Đối chiếu lifecycle SQL trong PR #394 với schema Production cập nhật.
   - **PASS 2026-10-18 (read-only metadata compatibility):** exact project `MAGASIN-NOIBO` / `menvbzlsncmpuvnaifxa` ACTIVE_HEALTHY; live `profiles` PK `id uuid`, `role/status/access_scope text`, status CHECK `ACTIVE|PENDING|INACTIVE`; tables/columns `employee_store_priorities(employee_id,store_id uuid)`, `work_schedules(user_id,store_id uuid;work_date date;status text)`, `schedule_generation_assignments(user_id,store_id uuid)` exist; helpers `current_user_role()` and `can_access_store(uuid)` exist. New lifecycle RPCs absent pre-release as expected. No Production DDL/EXECUTE or role runtime test; does not certify migration test/ACL PASS. Next ID78.
   - **PASS khi:** Có link/ID bằng chứng từ hệ thống thật hoặc test cô lập được mô tả; ghi kết quả, exact SHA và thời điểm vào nhật ký; không có sai lệch chưa phân loại.

78. [ ] Kiểm tra tham chiếu FK của `profiles` trên bản clone đủ schema. **OWNER-DEFERRED / BLOCKED, không chặn phát triển UI/feature độc lập theo quyết định §0, mục 20; không tính PASS hoặc bỏ release gates.**
   - **BLOCKED 2026-10-18:** Chưa có bằng chứng/định danh clone full-schema cô lập có owner/ACL/RLS parity đủ điều kiện để kiểm thử FK. Production catalog không thay thế clone. Không chạy migration thử hoặc chỉnh dữ liệu thật; ID79–90 chưa thực hiện.
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

### 4.1 MẪU BẰNG CHỨNG CHUẨN CHO MỌI ID — ID 12 (2026-10-17 20:20:46 ICT)

**Hợp đồng ghi nhật ký có thể kiểm tra:** chỉ sử dụng đúng **bốn trạng thái** cho hàng ID số: `TODO`, `DOING`, `PASS`, `BLOCKED`. `OWNER-DEFERRED`, `RC_NOT_READY` hoặc `RELEASE BLOCKED` là **nhãn giải thích/điều kiện**, không phải trạng thái thứ năm. Hàng `PLAN_CREATED` lịch sử không phải task ID và được giữ nguyên như metadata khởi tạo.

| Trường | Quy tắc điền / kiểm tra |
|---|---|
| `thoi_diem_ict` | `YYYY-MM-DD HH:MM:SS ICT`, không ghi giờ ước đoán; thời điểm đánh giá bằng chứng |
| `id` | Số checklist hiện hành (`1`–`287`) hoặc ID phụ đã được Owner/protocol chấp thuận; không tự đánh lại |
| `status` | Chính xác `TODO`, `DOING`, `PASS` hoặc `BLOCKED` |
| `objective` | Một hành động nguyên tử, phạm vi, sản phẩm bị tác động |
| `environment` | `main` / branch PR / `MAGASIN-NOIBO` / PG cô lập / site, phân biệt QA và Production |
| `evidence` | URL thật tới PR/commit/Actions/run/job, migration version, kết quả SQL dạng tổng hợp không có PII, hoặc nguồn kỹ thuật tương đương đã đọc |
| `exact_revision` | SHA commit đầy đủ, blob SQL, workflow run/attempt, hoặc snapshot timestamp + fingerprint đúng loại bằng chứng |
| `checks` | Danh sách gate liên quan và kết luận chính xác `SUCCESS`/`FAILURE`/`SKIPPED`/chưa chạy; không đánh đồng `SKIPPED` với PASS |
| `decision` | `PASS` chỉ khi tiêu chí của **đúng ID** đạt; `BLOCKED` kèm nguyên nhân, bằng chứng thiếu và tiền đề |
| `next` | Chỉ rõ ID kế tiếp, hoặc giữ nguyên ID nếu bị chặn không được Owner cho tạm gác |
| `safety` | Khẳng định thao tác chỉ đọc/QA cô lập hay ghi nào thực sự thực hiện; nếu không có Production write phải ghi tường minh |

**Mẫu hàng Journal chuẩn** (một ID đã hoàn thành hoặc bị chặn thì append, không sửa lịch sử):

```text
| YYYY-MM-DD HH:MM:SS ICT | <ID> | <TODO|DOING|PASS|BLOCKED> | Mục tiêu=<...>; môi trường=<...>; PR/run/SHA=<liên kết có thật>; bằng chứng=<...>; checks=<...> | Kết luận=<...>; thiếu=<... nếu BLOCKED>; an toàn=<...>; next=<ID> |
```

**Kiểm tra bắt buộc trước commit:** (a) ID + status hợp lệ; (b) thời gian có ICT; (c) PASS có minh chứng đúng gate và không có check bắt buộc FAILURE/SKIPPED; (d) không chép passwords/JWT/PII; (e) source-of-truth/docs branch rõ ràng; (f) không suy diễn triển khai Production từ CI PR; (g) không cập nhật checkbox quá phạm vi task; (h) nếu Owner cho tạm gác một ID, giữ status `BLOCKED` và làm rõ giới hạn **riêng đối với sequencing**, không xóa blocker hoặc miễn bảo mật.

**ID 12 evidence:** hợp đồng/mẫu ở ngay trong file và ghi một hàng `PASS` dưới đây; commit ghi chú ngay trong GitHub. **Không thực hiện ID 13 hoặc bất kỳ deploy nào trong ID 12.**

| Thời điểm ICT | ID | Trạng thái | Bằng chứng chính xác | Chướng ngại / bước kế tiếp |
|---|---:|---|---|---|
| 2026-10-17 | — | PLAN_CREATED | Branch `docs/xstore-release-recovery-atomic-20261017` từ `main 3c4a4e7`; tài liệu chưa merge; không production write | Bắt đầu ID 1 |
| 2026-10-17 18:22:14 ICT | 1 | PASS | [GitHub main branch API](https://api.github.com/repos/magasincoffee/magasincoffee.github.io/branches/main) và [commit](https://github.com/magasincoffee/magasincoffee.github.io/commit/3c4a4e7484f1ab161ba8cc3bbb2d49b1eaa855ae); HEAD `3c4a4e7484f1ab161ba8cc3bbb2d49b1eaa855ae`; checked `2026-10-17 18:22:14 +07:00`; authored main commit `2026-10-16T06:47:31Z` | HEAD khớp baseline được ghi trước đó, không có sai lệch SHA; tiếp tục ID 2 (PR #436), chưa deploy Production |
| 2026-10-17 18:26:42 ICT | 2 | PASS | [PR #436](https://github.com/magasincoffee/magasincoffee.github.io/pull/436) OPEN/DRAFT, base `main`, head `ce47f140e7bca2bdd060c32e2f2c670dffd01451` ([commit](https://github.com/magasincoffee/magasincoffee.github.io/commit/ce47f140e7bca2bdd060c32e2f2c670dffd01451)); checks on exact HEAD: `source-check` SUCCESS, `cross-role-browser-gate` SUCCESS, `day10-browser-gate` SUCCESS, `trusted-main-isolated-recovery` **SKIPPED** ([run 38863694808](https://github.com/magasincoffee/magasincoffee.github.io/actions/runs/38863694808); [UI2](https://github.com/magasincoffee/magasincoffee.github.io/actions/runs/38863694804); [Day10](https://github.com/magasincoffee/magasincoffee.github.io/actions/runs/38863694769)); checked `2026-10-17 18:26:42 +07:00` | PASS chỉ riêng việc đối chiếu PR/checks; Recovery NOT PASS vì step bị SKIPPED; PR chưa merge, không deploy; tiếp tục ID 3 (PR #393) |
| 2026-10-17 18:28:29 ICT | 3 | PASS | [PR #393](https://github.com/magasincoffee/magasincoffee.github.io/pull/393) OPEN/DRAFT, NOT MERGED, head `21d8d372619971494d04f3c0ca6d0ae50818562c` ([commit](https://github.com/magasincoffee/magasincoffee.github.io/commit/21d8d372619971494d04f3c0ca6d0ae50818562c)), branch `security/sapo-branch-resolution-acl-20261011`, base `main`; GitHub exact-head checks API `total_count=1`: `day10-browser-gate` SUCCESS ([run 38115269503](https://github.com/magasincoffee/magasincoffee.github.io/actions/runs/38115269503)); commit statuses API returned empty; verified `2026-10-17 18:28:29 +07:00` | PASS chỉ đối chiếu PR/Draft/HEAD/checks, KHÔNG kết luận SAPO security gate PASS; PR base snapshot SHA `b9f902047032fcd5a804de51e16a968eca3236ea` cũ hơn current `main 3c4a4e7484f1ab161ba8cc3bbb2d49b1eaa855ae` (chênh lệch thời điểm PR, cần đánh giá trước merge); chưa Production write; tiếp tục ID 4 (PR #394) |
| 2026-10-17 18:30:32 ICT | 4 | PASS | [PR #394](https://github.com/magasincoffee/magasincoffee.github.io/pull/394) OPEN/DRAFT, NOT MERGED, mergeable, head `a776324c65eaf0e444071c2f1ee4ec4b7c65cb2f` ([commit](https://github.com/magasincoffee/magasincoffee.github.io/commit/a776324c65eaf0e444071c2f1ee4ec4b7c65cb2f)), branch `release/xstore-019o-staff-lifecycle-20261011`, base `main`. GitHub check-runs API exact HEAD: **8/8 completed SUCCESS** (6 distinct check names, 2 repeated runs): `cross-role-browser-gate` ×2, `day10-browser-gate` ×2, `inline-shortage-browser`, `supplemental-pool-browser`, `branch-accordion-browser`, `postgres17-manager-override`. Runs: [38862028438](https://github.com/magasincoffee/magasincoffee.github.io/actions/runs/38862028438), [38862028405](https://github.com/magasincoffee/magasincoffee.github.io/actions/runs/38862028405), [38862028441](https://github.com/magasincoffee/magasincoffee.github.io/actions/runs/38862028441), [38862028407](https://github.com/magasincoffee/magasincoffee.github.io/actions/runs/38862028407), [38862028337](https://github.com/magasincoffee/magasincoffee.github.io/actions/runs/38862028337), [38862028345](https://github.com/magasincoffee/magasincoffee.github.io/actions/runs/38862028345), [38862024326](https://github.com/magasincoffee/magasincoffee.github.io/actions/runs/38862024326), [38862024401](https://github.com/magasincoffee/magasincoffee.github.io/actions/runs/38862024401); commit statuses API empty; verified `2026-10-17 18:30:32 +07:00` | PASS chỉ PR/HEAD/Draft/check inventory, NOT release/security/Production PASS. PR base snapshot `95a9500e6046e82271ed18c0c053bffd5f2f8373` differs from verified `main 3c4a4e7484f1ab161ba8cc3bbb2d49b1eaa855ae`; must reconcile before any merge. No deployment; next ID 5 (PR #392) |
| 2026-10-17 18:31:40 ICT | 5 | PASS | [PR #392](https://github.com/magasincoffee/magasincoffee.github.io/pull/392) `OPEN`/`DRAFT`, NOT MERGED, mergeable; exact HEAD `a0a039b0f30f97e711cd1675cf9c9c16e10f4bb6` ([commit](https://github.com/magasincoffee/magasincoffee.github.io/commit/a0a039b0f30f97e711cd1675cf9c9c16e10f4bb6)), branch `xstore-019-unified-rc-v1`, base `main`, 259 commits / 157 changed files; GitHub PR-commit workflows **22/22 completed SUCCESS**; commit check-runs **26/26 completed SUCCESS** (some checks repeated on multiple runs; e.g. [Unified RC](https://github.com/magasincoffee/magasincoffee.github.io/actions/runs/38156087487), [Cross Role](https://github.com/magasincoffee/magasincoffee.github.io/actions/runs/38156087574), [Day-10](https://github.com/magasincoffee/magasincoffee.github.io/actions/runs/38156087489), [AUTH-PROD](https://github.com/magasincoffee/magasincoffee.github.io/actions/runs/38156087413), [Procurement QA](https://github.com/magasincoffee/magasincoffee.github.io/actions/runs/38156087571)); statuses API empty; checked `2026-10-17 18:31:40 +07:00` | PASS **chỉ kiểm kê PR/Draft/HEAD/checks**; title explicitly `DO NOT MERGE`. PR base snapshot `b9f902047032fcd5a804de51e16a968eca3236ea` differs from current `main 3c4a4e7484f1ab161ba8cc3bbb2d49b1eaa855ae`; 26/26 check SUCCESS on historical PR HEAD does not imply Production/real-role/recovery RC-ready; no merge/deploy; next ID 6 (PR #390 overlap) |
| 2026-10-17 18:34:43 ICT | 6 | PASS | [PR #390](https://github.com/magasincoffee/magasincoffee.github.io/pull/390): OPEN, non-DRAFT, NOT MERGED, mergeable=false/dirty, HEAD `564f55e78c0516c3bb1cae08e901203f0aea981d` (branch `xstore-018-supplemental-employee-pool`), 21 changed files. [PR #392](https://github.com/magasincoffee/magasincoffee.github.io/pull/392): OPEN/DRAFT/NOT MERGED, HEAD `a0a039b0f30f97e711cd1675cf9c9c16e10f4bb6` (branch `xstore-019-unified-rc-v1`), 157 changed files. GitHub paginated PR-file inventories: **21/21 (100%) PR #390 changed paths overlap #392**; compare exact-head file blob SHAs: **0/21 equal**, so overlap by path/function, NOT exact file identity. [XSTORE-018 QA workflow in #390](https://github.com/magasincoffee/magasincoffee.github.io/pull/390/files) adds workflow + tests; [#392 diff](https://github.com/magasincoffee/magasincoffee.github.io/pull/392/files) modifies those XSTORE-018 QA files for later V4 UX. XSTORE-018 workflow/test/browser files also exist on current `main` (checked GitHub file blobs read-only). Verified `2026-10-17 18:34:43 +07:00` | Double-merge risk CONFIRMED. PR #390 is divergent/stale; **DO NOT separately merge #390** or automatically merge #392. Reconcile code and approvals only at the appropriate future release task; ID 6 is PASS only for overlap inspection, not for release readiness. No Production write; next ID 7 (migration ledger MAGASIN-NOIBO) |
| 2026-10-17 18:36:13 ICT | 7 | PASS | Live Supabase connector `get_project` + `list_migrations` for **MAGASIN-NOIBO**, project `menvbzlsncmpuvnaifxa` (ACTIVE_HEALTHY, PG 17.6), plus read-only SQL `SELECT COUNT(*),MAX(version),COUNT(DISTINCT version) FROM supabase_migrations.schema_migrations` with latest-name lookup. **80 applied versions / 80 distinct**; latest version **`20261007171918`** = **`xstore_013_continuous_coverage_shortage_v1_prod_restore`**; first `20260828000100` = `initial_schema`; DB query timestamp `2026-10-17 18:36:13.066416 ICT`. Project is NOT `OPS-WebApp` (`foclxkjnypjolcwqekku`, INACTIVE). | PASS is migration ledger inventory only; not schema/ACL/security parity or proof of external manual SQL changes. No migration/DDL/data write; keep Production release blocked; next ID 8 |
| 2026-10-17 18:37:35 ICT | 8 | PASS | Live connected Supabase `get_project` on both authorized accounts: **`MAGASIN-NOIBO` / `menvbzlsncmpuvnaifxa`**, `ACTIVE_HEALTHY`, `ap-northeast-2`, PG 17.6; distinct **`OPS-WebApp` / `foclxkjnypjolcwqekku`**, `INACTIVE`, `ap-northeast-1`; cross-checked [MAGASIN production directive](https://github.com/magasincoffee/magasincoffee.github.io/blob/docs/xstore-release-recovery-atomic-20261017/01_DOCS/MAGASIN/05_SYSTEM/MAGASIN_RELEASE_RECOVERY_ATOMIC_EXECUTION_TEMP.md) + repository default-branch indexed code search for `OPS-WebApp` and `foclxkjnypjolcwqekku` (0 matches at inspection). Verified `2026-10-17 18:37:35 +07:00`. | **DENY OPS-WebApp for MAGASIN release operations; allowlist exactly `menvbzlsncmpuvnaifxa` and require per-command preflight fail-closed**. GitHub indexed search is not an exhaustive audit of external workflow secrets, scripts or command history; no deployment attempted. Next ID 9 (Workforce SOT constraints) |
| 2026-10-17 18:42:09 ICT | 9 | PASS | Full read [Workforce Source of Truth](https://github.com/magasincoffee/magasincoffee.github.io/blob/3c4a4e7484f1ab161ba8cc3bbb2d49b1eaa855ae/01_DOCS/MAGASIN/05_SYSTEM/WORKFORCE_CROSS_STORE_SCHEDULING_TEMP_SOURCE_OF_TRUTH.md) (`main` HEAD `3c4a4e7484f1ab161ba8cc3bbb2d49b1eaa855ae`, file blob `70097402e12151f3c4786d572bb68e4dba99850d`, **4191 lines**), especially §§0.20, 0.24, 0.39–0.49, 0.61–0.71, 2.1–2.5, 6.0.9 and §7–8. Added **§0.A** with 12 binding invariant groups: #394 narrow before #392, §0.71 Owner timing override only for qualified #394, production allowlist, full owner/ACL/RLS recovery, real signed JWT/partial Manager foreign-scope negative, lifecycle RPC/audit/no hard-delete, 4-store priority/availability/staffing, draft/publish hard blocks, FT-first PT-residual, attendance/payroll truth, UX/Owner approval, XSTORE-020/011 closure. | PASS = SOT read/constraints recorded only; exact-current facts/evidence must be refreshed at release. `RELEASE BLOCKED` retained; no Production or code write. Next ID 10 (latest XSTORE Actions runs) |
| 2026-10-17 18:47:02 ICT | 10 | PASS | GitHub REST [repository Actions runs](https://github.com/magasincoffee/magasincoffee.github.io/actions): latest XSTORE PR #436 HEAD `ce47f140e7bca2bdd060c32e2f2c670dffd01451` — [Archive Recovery `38863694808`](https://github.com/magasincoffee/magasincoffee.github.io/actions/runs/38863694808) `completed/success` **BUT** job `trusted-main-isolated-recovery` `SKIPPED` and only `source-check` `SUCCESS`; [UI2 `38863694804`](https://github.com/magasincoffee/magasincoffee.github.io/actions/runs/38863694804) `completed/success`; [Day-10 `38863694769`](https://github.com/magasincoffee/magasincoffee.github.io/actions/runs/38863694769) `completed/success` (all on 2026-10-16 UTC). Latest actual **trusted-main Recovery** HEAD `3c4a4e7484f1ab161ba8cc3bbb2d49b1eaa855ae`: [run `38863218269`](https://github.com/magasincoffee/magasincoffee.github.io/actions/runs/38863218269) `completed/failure`, actual isolated restore step **FAILURE**, backup-download/authentication steps `SUCCESS`; on same exact main SHA [UI2 `38863218381`](https://github.com/magasincoffee/magasincoffee.github.io/actions/runs/38863218381) and [Day-10 `38863218394`](https://github.com/magasincoffee/magasincoffee.github.io/actions/runs/38863218394) `completed/success`. Narrow lifecycle PR #394 HEAD `a776324c65eaf0e444071c2f1ee4ec4b7c65cb2f`: 8 most recent PR-branch workflow runs on this SHA all `completed/success`, including [UI2 `38862028438`](https://github.com/magasincoffee/magasincoffee.github.io/actions/runs/38862028438), [Day-10 `38862028405`](https://github.com/magasincoffee/magasincoffee.github.io/actions/runs/38862028405), [XSTORE-018 `38862028407`](https://github.com/magasincoffee/magasincoffee.github.io/actions/runs/38862028407), [XSTORE-015 `38862028345`](https://github.com/magasincoffee/magasincoffee.github.io/actions/runs/38862028345), [XSTORE-016 `38862028337`](https://github.com/magasincoffee/magasincoffee.github.io/actions/runs/38862028337), [XSTORE-017 `38862028441`](https://github.com/magasincoffee/magasincoffee.github.io/actions/runs/38862028441) and two duplicate triggered UI2/Day-10 runs. Broad PR #392 last known HEAD `a0a039b0f30f97e711cd1675cf9c9c16e10f4bb6` (2026-10-11 UTC) has successful triggered QA, but DRAFT/DO NOT MERGE. Latest repository-wide run (separate procurement blocker) [Procurement `38960113441`](https://github.com/magasincoffee/magasincoffee.github.io/actions/runs/38960113441) `completed/failure` on `main` `3c4a4e7484f1ab161ba8cc3bbb2d49b1eaa855ae`, `2026-10-16T20:08:55Z`. Verified inventory `2026-10-17 18:47:02 +07:00`. | **PASS only ACTIONS inventory**, NOT Recovery PASS: source-check SUCCESS != skipped real restore; trusted-main actual restore FAILED. PR #394 CI green != release admitted. Continue ID 11 read-only production-change baseline check; NO merge, deployment or Production write |
| 2026-10-17 18:50:29 ICT | 11 | BLOCKED | GitHub [main](https://github.com/magasincoffee/magasincoffee.github.io/commit/3c4a4e7484f1ab161ba8cc3bbb2d49b1eaa855ae) exact HEAD unchanged; latest GitHub Pages [38863217888](https://github.com/magasincoffee/magasincoffee.github.io/actions/runs/38863217888) same SHA; Supabase project `menvbzlsncmpuvnaifxa` `ACTIVE_HEALTHY`; live migrations **80**, latest `20261007171918`; 0/4 targeted undeployed lifecycle/employment type RPCs; 0/2 targeted new lifecycle/outside-schedule tables; five primary workforce catalog tables have RLS enabled (read-only query at `2026-10-17 18:49:39.588014 ICT`). Supabase logs two windows from `2026-10-16T06:47:31Z` through `2026-10-17T12:00:00Z` confirmed nonempty postgres/auth/edge events but no complete audited successful SQL/DDL/data writes, ownership/grant history or full baseline snapshot. ID 11 examined at `2026-10-17 18:50:29 +07:00`. | **BLOCKED:** no authoritative complete baseline snapshot + immutable/all-writes audit to conclude absence of all off-plan Production changes. No evidence of new GitHub deployment or ledger migration ≠ no other changes. Keep ID 11 `[ ]`, STOP at this ID (do not start ID 12); need independent scoped catalog/ACL and authorized-change audit parity to resolve. No Production write |
| 2026-10-17 18:54:52 ICT | 11 | BLOCKED (follow-up) | Reverified exact `main 3c4a4e7484f1ab161ba8cc3bbb2d49b1eaa855ae`, 80 migrations latest `20261007171918`; current MAGASIN-NOIBO workforce aggregates match historical SOT: 1 active Owner, 2 active Managers, 28 active/3 inactive Staff, 106 priorities, 87 official schedules, 108 draft assignments, 0 employment constraints. Fresh read-only public catalog inventory 249 normalized entries MD5 **`cf7e4f277eb92ec43bd408b042e27f7b`** at `2026-10-17 18:53:50.207862 ICT`. Audit capability check: `log_statement=ddl`, `pgaudit.log=none`, no complete DML/permissions/history audit. Scoped postgres logs 337+32 events with zero aggregated SQL marker matches, **not** complete audit proof. [Recovery run 38863218269](https://github.com/magasincoffee/magasincoffee.github.io/actions/runs/38863218269) confirmed owner/ACL parity FAIL independent of this task. | BLOCKED remains: today's equal counts/new catalog fingerprint cannot prove no earlier off-plan updates, privilege changes or offsetting writes. No migration/production changes, ID 11 still `[ ]`, stop before ID 12; seek genuine historical baseline and auditable approved-change provenance rather than assuming no drift. |
| 2026-10-17 18:59:24 ICT | 11 | BLOCKED (audit coverage follow-up) | Read-only MAGASIN-NOIBO Supabase catalog: 7 Procurement-specific row-audit triggers; no analogous audited trigger on 5 Workforce tables, so partial per-feature audit ≠ complete Production write history. SQL aggregates since `2026-10-16T06:47:33Z`: `auth.audit_log_entries` **45** (6 login, 20 token_refreshed, 19 token_revoked); `procurement_audit_log` **0**. Cumulative pg_stat_database counter reset **2026-08-25**, pg_stat_statements reset **2026-08-27** (historical 13,171 write/DDL-class calls over 983,243 calls); none time-addresses baseline window. `log_statement=ddl`, `pgaudit.log=none`, `track_commit_timestamp=off`; Edge Functions one `saydi-tts-worker` v12 last updated 2026-10-05T09:36:36Z, prebaseline. Current main exact SHA unchanged. | **BLOCKED persists**. Existing counts, specialized audits, cumulative counters, and old backup cannot prove complete post-baseline no-off-plan DML/ACL drift. Await baseline artifact plus authoritative accepted-change evidence; retain ID 11 `[ ]`, ID 12 not started. No Production changes |
| 2026-10-17 19:13 ICT | 11 | BLOCKED (encrypted archive preflight + current data snapshot) | GitHub readback old ACL-bearing encrypted archive [run 38680192167](https://github.com/magasincoffee/magasincoffee.github.io/actions/runs/38680192167) artifact ID `11946749098` digest `sha256:10d30c6b40b1bc14e285385eccfb4d5dd7bc310cbcd2c1f76358da43b71745de`, `expired=false`, expires `2026-10-22T04:13:59Z`. The original `Restore archive WITH owner and ACL` job FAILED; not a verified historical clone. GitHub connector has no workflow_dispatch and TinyFish browser profiles list no recorded GitHub sign-in; did not rerun a known failing old SHA, decrypt external archive or touch Production. Captured server-side SHA-256 only for current production five canonical tables at 2026-10-17 19:13:10 ICT: `profiles` 36/`9bb5814840589488d6cc2064d7983b5be1a29a1c1ec8315527f97632e2af22ea`; `employee_store_priorities` 106/`a8a3f545d38235d021e3b2ee8c001d5a427d934ae40f3d600b2941259802d2e8`; `work_schedules` 87/`37f8047735e580fb97d27092574b08d308f0630a34355fa80b60dab78ab25821`; `schedule_generation_assignments` 108/`1616ec8ae4a39545ff404ea54edf7519bfac169f01bd087fedcc6954d9dcc43f`; `employee_constraints` 0/`e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`. | **BLOCKED**, current snapshot is not past snapshot or complete DML audit. Need trusted isolated runner restore for old artifact plus change approval reconciliation; impossible to certify historical absence of change-and-revert without complete contemporaneous audit. Keep ID11 unchecked, don't start ID12, no Production change. |
| 2026-10-17 20:20:46 ICT | 11 | BLOCKED | **Owner explicit deferral (current conversation, 2026-10-17 20:20:46 ICT):** MAGASIN Production còn thô sơ, ưu tiên hoàn thiện sản phẩm sử dụng được; Owner yêu cầu bỏ qua việc truy hồi chứng cứ lịch sử của ID 11 để tiếp tục những task tạo WebApp. Baseline SHA/migrations và forensic findings các hàng ID 11 trước vẫn nguyên. | **ONLY sequencing waiver**: giữ ID 11 `[ ]`/`BLOCKED`, không coi là PASS, không miễn backup/restore owner/ACL/RLS, 3-role JWT/CI, approved release; cho phép ID 12 tiếp theo, không Production write |
| 2026-10-17 20:20:46 ICT | 12 | PASS | Created **§4.1 evidence log schema** with 4 allowed statuses `TODO/DOING/PASS/BLOCKED`, template fields `ID/time/environment/PR/run/exact SHA/check results/decision/next/safety`, explicit validation gates and proof against interpreting `SKIPPED` as PASS. Synced Owner ID 11 scoped waiver to §0/§2 and checklist without changing prior forensic evidence. Full content checked in docs-only branch `docs/xstore-release-recovery-atomic-20261017`; reference this ID 12 journal commit. | **PASS only documentation template/protocol**. ID11 stays BLOCKED and explicitly deferred for development; release is still BLOCKED until mandatory independent security/recovery gates pass. No app/Production mutation; next **ID13** |
| 2026-10-17 20:27:38 ICT | 13 | PASS | Đọc trực tiếp GitHub Actions [run 38863218269](https://github.com/magasincoffee/magasincoffee.github.io/actions/runs/38863218269) + [job trusted-main-isolated-recovery 116850089837](https://github.com/magasincoffee/magasincoffee.github.io/actions/runs/38863218269/job/116850089837) + raw job logs, `attempt=1`, event=push, `main` exact SHA `3c4a4e7484f1ab161ba8cc3bbb2d49b1eaa855ae`, run `completed/failure`, job `completed/failure`, actual restore step FAILURE (2026-10-16 06:49 UTC). **Fingerprint đúng theo log `2026-10-16T06:49:10.9011832Z`: `XSTORE_019O_PARITY_DIMENSIONS; REL_OWNER=PASS; REL_ACL=FAIL; REL_RLS=PASS; FN_OWNER=PASS; FN_ACL=FAIL; FN_DEFINER=PASS; POL_ACCESS=PASS; POL_PREDICATE=PASS; REL_COUNT=PASS; FN_COUNT=PASS; POL_COUNT=PASS`.** Relation ACL diagnostics at `2026-10-16T06:49:11.0108629Z`: `REL_EDGES=FAIL`, `REL_NULL=PASS`, `REL_SEMANTICS=FAIL`, `REL_GRANTOR=FAIL`. Archived object/grants replay had reported `XSTORE_019O_PUBLIC_ACL_REPLAY=PASS` with `ITEMS=168` but **actual ACL parity FAILED**; `XSTORE_019O_CLI_CLONE_OWNER_ACL_RLS_PARITY=FAIL` exit code 1. | **PASS only for task 13 (read and correctly record REL_ACL=FAIL)**, not recovery success or root-cause remediation. REL_ACL mismatch persists despite replay-success marker; require privilege/grantee/grantor/semantics comparison and isolated repair in upcoming tasks. No rerun, no new code, no Production mutation; ID11 OWNER-DEFERRED BLOCKED, ID14 not started |
| 2026-10-17 20:33:01 ICT | 14 | PASS | GitHub Actions [run #38863218269](https://github.com/magasincoffee/magasincoffee.github.io/actions/runs/38863218269) và [job #116850089837](https://github.com/magasincoffee/magasincoffee.github.io/actions/runs/38863218269/job/116850089837), exact `main` SHA `3c4a4e7484f1ab161ba8cc3bbb2d49b1eaa855ae`, run `completed/failure`. **Log dòng 390 (2026-10-16T06:49:10.9011832Z) xác nhận `FN_ACL=FAIL` trong `XSTORE_019O_PARITY_DIMENSIONS`**, trong khi `FN_OWNER=PASS`, `FN_DEFINER=PASS`, `FN_COUNT=PASS`. Log dòng 391 (2026-10-16T06:49:11.0108629Z) xác nhận function diagnostics `FN_EDGES=FAIL`, `FN_NULL=FAIL`, `FN_SEMANTICS=FAIL`, `FN_GRANTOR=FAIL`. Log dòng 388 `XSTORE_019O_PUBLIC_ACL_REPLAY=PASS` chỉ có nghĩa replay đã chạy, **không** có nghĩa quyền function sau restore đã khớp; log dòng 392 `XSTORE_019O_CLI_CLONE_OWNER_ACL_RLS_PARITY=FAIL`. | PASS **chỉ** phạm vi ID14: ghi đúng fingerprint FN_ACL=FAIL; không phải phục hồi quyền đã thành công, không khẳng định nguyên nhân gốc đã sửa. ID11 tiếp tục OWNER-DEFERRED/BLOCKED, release gates vẫn BLOCKED; không thay đổi mã/Production, không chạy lại workflow; ID15 chưa thực hiện |

| 2026-10-17 20:36:25 ICT | 15 | PASS | [Run 38863218269](https://github.com/magasincoffee/magasincoffee.github.io/actions/runs/38863218269), job 116850089837, exact main SHA 3c4a4e7484f1ab161ba8cc3bbb2d49b1eaa855ae. Log 2026-10-16T06:49:11.0108629Z: REL_EDGES=FAIL; FN_EDGES=FAIL. REL_ACL=FAIL and FN_ACL=FAIL; owner and RLS dimensions PASS. | PASS solely for identifying these two failed diagnostics. Restore gate still blocked, ID 11 still deferred/BLOCKED, ID 16 pending. No Production changes. |

| 2026-10-17 20:40:45 ICT | 16 | PASS | Verified [run 38863218269](https://github.com/magasincoffee/magasincoffee.github.io/actions/runs/38863218269) job 116850089837, attempt 1, exact main SHA `3c4a4e7484f1ab161ba8cc3bbb2d49b1eaa855ae`. Log line 391, `2026-10-16T06:49:11.0108629Z`: `XSTORE_019O_ACL_EFFECTIVE_DIAG; ... REL_NULL=PASS; FN_NULL=FAIL; ...`. Run and restore job `completed/failure`; `PUBLIC_ACL_REPLAY=PASS` did not make function ACL parity PASS. | PASS only for ID16 accurately recording `FN_NULL=FAIL`. Function ACL metadata mismatch remains; no repair, no rerun, no Production change, ID11 OWNER-DEFERRED/BLOCKED and release gates still BLOCKED; next ID17 |

| 2026-10-17 20:41:58 ICT | 17 | PASS | [GitHub Actions run 38863218269](https://github.com/magasincoffee/magasincoffee.github.io/actions/runs/38863218269), [job 116850089837](https://github.com/magasincoffee/magasincoffee.github.io/actions/runs/38863218269/job/116850089837), attempt 1, main SHA `3c4a4e7484f1ab161ba8cc3bbb2d49b1eaa855ae`, completed/failure. Raw job log line 391 at `2026-10-16T06:49:11.0108629Z`: `XSTORE_019O_ACL_EFFECTIVE_DIAG` includes **`REL_GRANTOR=FAIL; FN_GRANTOR=FAIL`**, plus `REL_EDGES=FAIL; FN_EDGES=FAIL`. Line 389 `XSTORE_019O_PUBLIC_RESTORE_GRANTOR=POSTGRES; ISOLATED_ONLY`, line 388 ACL replay PASS, but line 390 REL_ACL/FN_ACL FAIL and line 392 overall parity FAIL. | PASS **chỉ** task ID17 (ghi chính xác hai lỗi grantor); nguyên nhân cụ thể/khắc phục restore chưa được chứng minh; không Production write, merge/deploy hoặc retry; ID11 OWNER-DEFERRED/BLOCKED, next ID18 (encrypted backup metadata) |

| 2026-10-17 20:50 ICT | 18 | PASS | Live GitHub Actions artifact metadata [run 38680192167](https://github.com/magasincoffee/magasincoffee.github.io/actions/runs/38680192167): original encrypted ACL-bearing backup `xstore-019o-acl-full-encrypted-38680192167`, **artifact ID `11946749098`**, size **6,251,739 bytes**, created `2026-10-15T04:14:00Z`, `expired=false` at inspection, expires **`2026-10-22T04:13:59Z`** (`2026-10-22 11:13:59 ICT`), GitHub artifact ZIP digest `sha256:10d30c6b40b1bc14e285385eccfb4d5dd7bc310cbcd2c1f76358da43b71745de`, source run `main` HEAD **`15b737fdca977ca01cb8ae916d9d3be5df91ffe2`**. Rechecked run `38863218269` has no produced artifact; source SOT §§0.B and 11's historical backup reference cross-checked. | PASS is **metadata identification only** for the SOT-known latest eligible encrypted archive, not an exhaustive repository-wide artifact inventory; **not** validated archive-inner manifest/SHA, decryption, successful restore or current Production recovery parity. Original restore job failed. No download/decrypt, secret exposure, Production mutation, CI rerun or release. ID11 OWNER-DEFERRED/BLOCKED. Next ID19 (SHA256 + manifest verification). |

| 2026-10-17 20:5x ICT | 19 | PASS | Downloaded **encrypted-only** [GitHub Actions artifact 11946749098](https://github.com/magasincoffee/magasincoffee.github.io/actions/runs/38680192167) (source exact HEAD `15b737fdca977ca01cb8ae916d9d3be5df91ffe2`), read ZIP entries without decrypting. Locally computed outer ZIP SHA256 `10d30c6b40b1bc14e285385eccfb4d5dd7bc310cbcd2c1f76358da43b71745de` **MATCH** GitHub artifact digest. ZIP contains `production.dump.aes256gcm` (6,249,155 bytes) and `manifest.json` (621 bytes). Independently calculated encrypted member SHA256 `66c8d3f8158b8a41f4f0b4cba4d5b8056d06cc18747acf90c8eb4e8259a50b64` **MATCH** `manifest.encrypted_sha256`; member size **MATCH** `manifest.encrypted_bytes=6249155`; manifest `project_ref=menvbzlsncmpuvnaifxa`, `encrypted_algorithm=AES-256-GCM`, `dump_sha256=94a8cc1c8ba9e8e132c99d64b1b72c1ce760225d506cdb8f364a996ecf4a9f5d`, `dump_bytes=6249106`, `capture_utc=2026-10-15T04:13:19.843Z`. | PASS **only encrypted artifact integrity + manifest cross-check**. Plaintext dump hash is **manifest-declared, not independently recalculated**: decryption/key check belongs to ID20; `archive_catalog_verified=false` and `restore_verified=false` remain explicit; original recovery attempt FAILED. No decryption/plaintext output, Production write, CI rerun or release. ID11 OWNER-DEFERRED/BLOCKED; next ID20. |

| 2026-10-17 ICT | 20 | BLOCKED | Read-only GitHub Actions [run 38680192167](https://github.com/magasincoffee/magasincoffee.github.io/actions/runs/38680192167), job `116242764480`, exact historical HEAD `15b737fdca977ca01cb8ae916d9d3be5df91ffe2`: step `Authenticate fresh archive without exposing data` **SUCCESS**; log at `2026-10-15T04:13:20.0128316Z` states `AES_GCM_AUTHENTICATED_DECRYPT=PASS; RESTORE_STILL_PENDING`. This proves authenticated decryption worked **on 15 October only**, not that the secure decryption secret is still present/usable on 17 October. Archive ID `11946749098` integrity was checked at ID19, but no fresh authorized isolated AES-GCM decrypt/hash attestation was run; no workflow_dispatch tool is available, and rerunning the historical job would re-enter a known failing restore path. | **BLOCKED pending secure authorized fresh key usability check via trusted runner**, with no key/plaintext/log disclosure; retain ID20 `[ ]`, ID21 not started. Owner action/approved dispatch channel required for isolated verify-only job; historical successful step alone cannot be marked current PASS. Production untouched, no CI rerun or release. |

| 2026-10-17 ICT | OWNER directive / ID 20–53 | BLOCKED / OWNER-DEFERRED (sequencing only) | Owner explicitly requests pausing old encrypted-backup recovery checks that do not directly improve the unfinished WebApp and prioritizing feature/UI/QA work. ID20's last failure evidence remains valid; tasks 20–53 still unchecked and unverified, no PASS granted. SOT §0 point 16 records scope of deferral. | Next executable task **ID54** read-only SAPO resolver security audit; security and release gates retained for all Production changes; no Production write, no Secrets, no CI/deploy. |

| 2026-10-17 21:26:41 ICT | 54 | PASS | Authorized Supabase connection `link_6a91c08a73388191a2d9046752677ccb` confirmed exact project `MAGASIN-NOIBO` / `menvbzlsncmpuvnaifxa` ACTIVE_HEALTHY, PostgreSQL 17.6.1.166. **Read-only** SQL over `pg_proc`, `pg_namespace`, `pg_language`, `pg_roles`, `pg_get_function_result`, `pg_get_functiondef` (hash/size only) at `2026-10-17T14:26:41.61432Z`: exactly one `public.resolve_sapo_order_branches(date)`; return `TABLE(resolved_count integer, unresolved_count integer, conflict_count integer)`; language `plpgsql`; owner `postgres`; `SECURITY DEFINER=true`; volatility `v` (VOLATILE); explicit `proacl=NULL`; definition MD5 `650bb0acebcbe0aa5a7ffb2299ee58bf`, 3216 characters. | **PASS only live function catalog inventory**; a NULL explicit ACL does **not** establish safe EXECUTE exposure. No resolver invocation, data mutation, SQL DDL, merge or deploy. ID11 and ID20–53 remain OWNER-DEFERRED; next ID55 catalog read-only `anon` EXECUTE check. |

| 2026-10-17 21:31:07 ICT | 55 | PASS (audit task; SECURITY FINDING OPEN) | Read-only Supabase SQL `pg_proc`/`pg_namespace`/`aclexplode(COALESCE(proacl,acldefault('f',proowner)))` and `has_function_privilege` against confirmed `MAGASIN-NOIBO` project `menvbzlsncmpuvnaifxa`, query timestamp `2026-10-17T14:31:07.267413Z`, exact `public.resolve_sapo_order_branches(p_work_date date)`: `proacl=NULL`; `anon_effective_execute=true`; `anon_schema_usage=true`; `public_execute=true` through default function ACL; `SECURITY DEFINER=true`. Prior narrow identity filter found no rows because identity arguments include parameter name; corrected query confirmed one canonical function. `has_function_privilege('PUBLIC',...)` is invalid because PUBLIC is not a role name, so effective PUBLIC edge was evaluated by ACL expansion instead. | **PASS only for ID55 factual `anon` EXECUTE rights audit; security FAIL remains OPEN, NOT SAPO security gate PASS.** Anonymous invocation risk exists at catalog ACL level; PostgREST exposure and body side effects not tested. DO NOT call resolver or change Production grants under this task. Next ID56 authenticated EXECUTE audit; Production deploy/remediation gated separately by SOT. |

| 2026-10-17 21:35:16 ICT | 56 | PASS (audit task; SECURITY FINDING OPEN) | Confirmed project `MAGASIN-NOIBO` `menvbzlsncmpuvnaifxa`; read-only PostgreSQL catalog SQL at `2026-10-17T14:35:16.181864Z` for exact `public.resolve_sapo_order_branches(p_work_date date)`: `authenticated_effective_execute=true` (`has_function_privilege`), `authenticated_schema_usage=true`, `public_execute=true` (default ACL expanded with `aclexplode(COALESCE(proacl,acldefault('f',proowner)))`), `proacl=NULL`, `SECURITY DEFINER=true`. | **PASS only for ID56 read-only access audit; security vulnerability remains OPEN**, with `anon` and `authenticated` exposure from IDs 55–56. No function call or Production mutation. Next ID57 inspect `ingest_sapo_batch` token guard before writing, read-only. |

| 2026-10-17 21:39:23 ICT | 57 | PASS (read-only code-order audit) | Direct Supabase `MAGASIN-NOIBO` (`menvbzlsncmpuvnaifxa`) Production `pg_get_functiondef` inspection at `2026-10-17T14:39:15.524174Z` of `public.ingest_sapo_batch(text,jsonb,jsonb,jsonb,jsonb)` and at `2026-10-17T14:39:23.844632Z` of `public.magasin_verify_integration_token(text)` showed the FIRST statement in wrapper `begin` is `if not public.magasin_verify_integration_token(p_token) then raise exception 'INVALID_INTEGRATION_TOKEN' using errcode='28000'; end if;`, before `UPDATE integration_api_tokens`, all INSERT/UPSERTs, and resolver call. Verifier is SQL STABLE SECURITY DEFINER, returns EXISTS for active, nonexpired SHA-256 token hash; no write statements in verifier. | Static body inspection PASS only; no RPC invoked, no token disclosed, no Production mutation or integration dynamic test. Resolver public/anon/authenticated EXECUTE exposure from ID55/56 remains OPEN. Next ID58 read-only SAPO robot caller review. |

| 2026-10-17 21:45 ICT | 58 | BLOCKED (current caller unverified) | Read-only GitHub `main` recursive tree inventory of `magasincoffee/magasincoffee.github.io`: 709 paths and `08_INTEGRATIONS/README.md` explicitly says no Production connector is deployed there; repository code search for `ingest_sapo_batch` and `resolve_sapo_order_branches` yielded no indexed matches. Also inspected available `magasincoffee/magasin-media-robot`, `magasincoffee/noibo`, `magasincoffee/magasin-supervisor` `main` tree path metadata, without finding clearly named SAPO caller files. Read-only H4 (`DESKTOP-H4A16IL`) inventory `D:\\MAGASIN_ROBOTS` contained only `control-center` and `supervisor-reinstall-backup-20261017`; scoped content search for both exact SQL RPC names returned zero matches. Supabase project `menvbzlsncmpuvnaifxa` log aggregation in last 24h returned only 1 postgres_logs match, insufficient to establish current robot invocation path. These checks cannot exclude other hosts/hidden paths or demonstrate caller safety. | Preserve ID58 `[ ]` / BLOCKED. **Owner must identify active SAPO ingestion robot's code repository or deployed host/path (or authorize runtime access)** to confirm exact caller (wrapper vs direct resolver). Do not assert PASS or advance to ID59; no RPC call, Production mutation or deploy. |

| 2026-10-17 21:51 ICT | 58 | PASS (H4 scheduled-caller static verification) | Owner identified active SAPO caller host H4. Remote read-only audit on online `DESKTOP-H4A16IL`: Windows Scheduled Tasks `MAGASIN Sapo Nightly` (`--date today`) and `MAGASIN Sapo Reconcile` (`--date yesterday`) both invoke `C:\\Users\\admin\\AppData\\Local\\MAGASIN\\SAPO\\diagnostic_runner.py`. Its source constructs `[sys.executable, str(root/'robot.py'), '--date', target]`; `robot.py` line 17 imports `SupabaseIngestClient` and lines 241–246 instantiate and invoke `client.ingest(...)`; `magasin_sync/supabase_client.py` line 24 sets URL to `/rest/v1/rpc/ingest_sapo_batch` and line 43 calls `requests.post`. Recursive scoped read of deployed `.py` and `.ps1` files found this one RPC endpoint and **no direct** `resolve_sapo_order_branches` invocation. SHA256: `diagnostic_runner.py` `FC04AC70F3A6C20F4523027CFC390270741B44DDC664CC976C25B521A57FA96E`; `robot.py` `9D49DFE606B8F3722AE2E243423827FE976FDE0C527E800852BA57C1389A70D9`; `magasin_sync/supabase_client.py` `94B13A7A71E5F7FD9075229A4C2BFD58309D6505D3C3ADE3571124D31554F5EF`. | Earlier ID58 blocker resolved by Owner H4 identification. PASS **for installed H4 scheduled caller static route only**, not runtime successful ingestion, nor universal absence of unknown callers or security gate PASS. No scheduled task triggered, secret accessed, database mutation or deploy; unresolved public resolver grant from ID55/56 remains open. Next ID59 historical repository caller review. |

| 2026-10-17 ICT | OWNER directive / ID59–74 | TODO / OWNER-DEFERRED (sequencing only) | Owner yêu cầu đi thẳng tới phần hoàn thiện WebApp và phát hành sau khi ID58 PASS. Giữ ID59–74 unchecked; SAPO `anon`/`authenticated` resolver access finding OPEN; không khẳng định các kiểm thử SAPO đã PASS. | Chọn **ID75** (read-only PR #394 manifest/scope review) để chuẩn bị WebApp; mọi phát hành vẫn chặn bởi security/recovery/JWT/CI/approval độc lập. Không Production mutation/deploy. |

| 2026-10-18 ICT | 75 | BLOCKED (scope mismatch, read-only PR audit) | GitHub PR [#394](https://github.com/magasincoffee/magasincoffee.github.io/pull/394) is OPEN/DRAFT, not merged, head `a776324c65eaf0e444071c2f1ee4ec4b7c65cb2f`, base `main` SHA `95a9500e6046e82271ed18c0c053bffd5f2f8373`. Enumerated **7 changed files**: `05_MANAGER/Workforce/engine-v1.js`, `05_MANAGER/Workforce/staff-projection-v1.js`, `07_DATABASE/migrations/20261011224000_xstore_019o_staff_lifecycle_v1.sql`, `09_QA/people-shift/manager-workforce-canonical-fixture.html`, `09_QA/people-shift/ui2-013-manager-operations-contract.test.mjs`, `09_QA/people-shift/xstore-019o-staff-lifecycle-browser.mjs`, `09_QA/people-shift/xstore-019o-staff-lifecycle-v1.test.mjs`. PR body claims **6 files**. Patch of `staff-projection-v1.js` contains FT/PT label, selector and calls `list_employee_employment_types_v1`/`set_employee_employment_type_v1` in addition to intended lifecycle controls; QA contract adds those FT/PT RPCs. Source says missing RPC fails closed, but existence of additional FT/PT UI is **scope expansion vs lifecycle-only narrative**, not equivalent to production FT/PT release. | **ID75 remains `[ ]`/BLOCKED** until exact seven-file manifest is approved/corrected and FT/PT UI explicitly classified as authorized gated addition or removed on dedicated PR branch, then recheck PR exact HEAD; no assumption of scope PASS. Do not execute ID76 or merge/deploy; SAPO/backup/JWT/security gates remain pending. |

| 2026-10-18 ICT | 75 | PASS (manifest/scope reconciliation only) | Owner explicitly reconfirmed earlier FT/PT request and authorized retaining gated FT/PT UI within #394. Updated [PR #394](https://github.com/magasincoffee/magasincoffee.github.io/pull/394) description: accurately says **7 changed files**, names FT/PT UI and RPC fail-closed behavior, and excludes K backend/FT-first deployment. Same head `a776324c65eaf0e444071c2f1ee4ec4b7c65cb2f`, still Draft/unmerged. This supersedes ID75 earlier BLOCKED entry without erasing audit history. | ID75 checklist PASS **only** manifest/scope approval. Next **ID76** validate no FT/PT/schedule/payroll/hard-delete migration in #394. No code change, CI execution, Production write, or release; security/recovery/QA gates remain outstanding. |

| 2026-10-18 ICT | 76 | PASS (narrow migration scope audit) | Re-read [PR #394](https://github.com/magasincoffee/magasincoffee.github.io/pull/394) file inventory, Draft, exact HEAD `a776324c65eaf0e444071c2f1ee4ec4b7c65cb2f`. Of 7 files, the sole SQL migration is `07_DATABASE/migrations/20261011224000_xstore_019o_staff_lifecycle_v1.sql` (146 added lines). Full patch read: additive `employee_lifecycle_audit_v1`, lifecycle scope helper and reader/writer RPC; writer `UPDATE public.profiles SET status` plus audit INSERT, no FT/PT/scheduler/attendance/payroll migration, DELETE FROM profiles/auth.users, or cascade. UI/QA FT/PT scope authorized separately in ID75, not backend deployed. | PASS **ID76 scope classification only**, no SQL applied or functional/security runtime verification. Next **ID77** compare lifecycle SQL with current Production schema. Release stays gated. |

| 2026-10-18 ICT | 77 | PASS (catalog compatibility only) | Supabase read-only verified project `MAGASIN-NOIBO` / `menvbzlsncmpuvnaifxa` ACTIVE_HEALTHY (Postgres 17.6). Live catalog: `profiles` PK UUID, role/status/access_scope text with status CHECK `ACTIVE/PENDING/INACTIVE`; relevant Workforce table columns present and typed; dependencies `public.current_user_role()` and `public.can_access_store(uuid)` exist, lifecycle RPC absent pre-release. Matched dependency references in PR #394 SQL exact HEAD `a776324c65eaf0e444071c2f1ee4ec4b7c65cb2f`. | PASS only schema metadata compatibility; isolated migration execution/ACL/JWT still unverified. Next ID78. |
| 2026-10-18 ICT | 78 | BLOCKED (full-schema clone unverified) | Read-only Production catalog supports preliminary FK awareness, but no verified ready isolated **full-schema clone** with sufficiently representative owner/ACL/RLS and fixture was established in this turn. Using Production to test FK/write behavior would violate SOT. | Leave ID78 unchecked/BLOCKED, ID79–90 TODO, STOP per dependency order. Require verified isolated clone for FK and role/lifecycle fixture tests. No Production changes. |

| 2026-10-18 ICT | OWNER / FOUR-PHASE EXECUTION PLAN | PLAN APPROVED (no task PASS implied) | Owner chốt 4 giai đoạn: 1) nhân viên + lifecycle/FTPT (ID75–146), 2) Manager/Employee (147–197), 3) Owner/SAPO/Procurement (198–235 và security 59–74), 4) RC/release/live acceptance (236–268 + release/recovery/closure prerequisites). §0.B ghi deliverables, mapping, phụ thuộc, acceptance và stop rules. Không đánh lại task, không sửa code Production hay commit lên main. | Phase 1 active; ID78 vẫn BLOCKED do thiếu clone full-schema được xác minh; chỉ bắt đầu preflight clone an toàn, không vượt sang ID79–90 hoặc đánh dấu PASS. |

| 2026-10-18 ICT | 78 | BLOCKED (fresh QA scaffolding, no full-schema clone yet) | Owner authorized **new disposable synthetic QA** instead of old backup restoration for development. Created [PR #439](https://github.com/magasincoffee/magasincoffee.github.io/pull/439) against #394 release branch: synthetic-only PostgreSQL 17 fixture, lifecycle candidate migration smoke within rollback transaction, and independent GitHub Actions workflow. QA head `eddafaab7ec6ea1ddb65d888a28b450d3abb1339`. No secrets, credentials, Production DB connection, or real people fixture. | **Do not mark ID78 PASS**: limited test schema is not full-schema FK/ACL/RLS parity and workflow has not been proven green. Next expand isolated schema/FK fidelity and obtain actual CI run; ID79–90 not certified; Production recovery remains separate hard gate. |

| 2026-10-18 ICT | 78 | BLOCKED (synthetic CI GREEN, full schema still missing) | [PR #439](https://github.com/magasincoffee/magasincoffee.github.io/pull/439) new disposable PostgreSQL 17 workflow on exact SHA `eddafaab7ec6ea1ddb65d888a28b450d3abb1339`: [run 39092324984](https://github.com/magasincoffee/magasincoffee.github.io/actions/runs/39092324984) `completed/success`, job `117571495015` all steps SUCCESS including fixture preparation, applying #394 lifecycle SQL, and rollback-only lifecycle smoke test. This confirms synthetic offboard/restore and audit/schedule-count preservation executed in isolation. | **Not ID78 PASS**: minimal schema, not full-schema FK, actual signed JWT, authorization parity, or production backup recovery parity. Advance QA fidelity toward full-schema test before ID79–90; no production changes. |

| 2026-10-18 ICT | 78 | DOING (expanded synthetic FK topology, exact CI pending) | Read-only Supabase Production catalog enumerated actual `profiles` FK references (including attendance, payroll_entries, employee_availability, approval_requests, employee_skills, Workforce schedules; real database has many additional references). Extended [PR #439](https://github.com/magasincoffee/magasincoffee.github.io/pull/439) fixture with five more synthetic referencing tables and eight FK edges, inserted anonymous fixtures, added assertions that lifecycle offboard preserves related rows and FK topology. Exact QA HEAD `b02a8c93217b2c2704648488bc83c3558f6bf707`; latest [Lifecycle Fresh Isolated QA run 39092510522](https://github.com/magasincoffee/magasincoffee.github.io/actions/runs/39092510522) was `in_progress` at inspection, not PASS. | Leave ID78 `[ ]` BLOCKED until successful exact-head CI plus full-schema FK coverage is established; current fixture still intentionally partial. No Production changes; ID79–90 unverified. |

| 2026-10-18 ICT | 78 | BLOCKED (expanded synthetic FK CI GREEN, still not full clone) | Latest PR #439 QA exact SHA `b02a8c93217b2c2704648488bc83c3558f6bf707`: [Lifecycle Fresh Isolated QA run 39092510522](https://github.com/magasincoffee/magasincoffee.github.io/actions/runs/39092510522) returned `completed/success`. Synthetic fixture now includes attendance, payroll, availability, approval and skills FK rows and assertions alongside schedules, but does not yet reproduce all live `profiles` FK edges, schema ownership, grants or RLS. | Keep ID78 unchecked/BLOCKED pending full schema and security fidelity. Synthetic QA PASS does NOT certify owner/ACL/RLS restore or live release. ID79–90 remain TODO; no Production mutation. |

| 2026-10-18 ICT | 78 | BLOCKED (all live profile FK edges modeled, synthetic auth QA GREEN) | Production read-only catalog found **46 direct profile FK edges across 25 referencing tables**. [QA PR #439](https://github.com/magasincoffee/magasincoffee.github.io/pull/439) synthetic fixture now models each edge with referenced delete behavior, without real Production data. Exact QA SHA `fb893ea9ed171fa42e3d1dca96a610bb3da664b9`; [GitHub Actions run 39092695481](https://github.com/magasincoffee/magasincoffee.github.io/actions/runs/39092695481) job `117572592166` SUCCESS for schema, lifecycle migration, isolated role cases and offboard/restore smoke. Simulated role results: Owner reader ALLOW; Manager ALL reader ALLOW; partial Manager writer DENY; Staff writer DENY; inactive Manager writer DENY. | **ID78 still BLOCKED** under original full-schema-clone criterion: synthetic FK-edge representation is not every column/constraint/trigger, not real signed-JWT, RLS/ACL/ownership, nor backup restore parity. ID79–90 not independently certified and not marked PASS. No Production mutation. Next work: full-schema parity or explicitly owner-approved narrower acceptance for dev-only gate, and deeper role testing. |

| 2026-10-18 ICT | 78 / lifecycle synthetic QA expansion | DOING (exact-head CI pending) | [PR #439](https://github.com/magasincoffee/magasincoffee.github.io/pull/439) SHA `d7066bb7bcbcd1c51499a3ad1750d1be68881a70`: extended synthetic role suite to verify Manager ALL writer ALLOW, same-state no-op DENY, empty and >300-char reason DENY, failure audit zero side effects and two exact audit entries after offboard→restore. [CI run 39092839976](https://github.com/magasincoffee/magasincoffee.github.io/actions/runs/39092839976) triggered, outcome not established at journal time. | Still ID78 BLOCKED for full-schema clone requirement. QA synthetic checks do not substitute signed JWT, RLS/grants, full-schema or recovery parity. Leave ID79–90 unchecked until per-ID evidence. No Production changes. |

| 2026-10-18 ICT | 78 / lifecycle synthetic QA expansion | PASS (isolated smoke subtests only; ID78 still BLOCKED) | PR #439 exact SHA `d7066bb7bcbcd1c51499a3ad1750d1be68881a70`: [Actions run 39092839976](https://github.com/magasincoffee/magasincoffee.github.io/actions/runs/39092839976) synthetic-postgres completed **SUCCESS**, all steps including schema, lifecycle migration, Manager ALL writer, role denials, no-op/reason validation, audit atomicity and offboard/restore smoke SUCCESS. | Keep ID78 `[ ]` because full-schema clone/true role JWT/RLS/ACL equivalence absent; no production changes, no release claim, ID79–90 still not formally PASS. |

| 2026-10-18 ICT | 78 | BLOCKED (profile FK edge count assertion added) | PR #439 SHA `ba3d921d729302fe49b55a531dcc3d92034a17d4`: added explicit assertion that synthetic QA schema contains 46 direct FK edges referencing `profiles`, matching live catalog count verified in prior read-only audit. [CI run 39092995441](https://github.com/magasincoffee/magasincoffee.github.io/actions/runs/39092995441) was in_progress at observation, so no success is claimed. | Full schema clone, triggers, constraints, grants, RLS, real JWT remain unverified. Preserve ID78 unchecked/BLOCKED and all Production/release stop rules; advance only after exact-head evidence. |

| 2026-10-18 ICT | 78 | BLOCKED (exact synthetic 46+2 FK assertion GREEN; full clone still absent) | [PR #439](https://github.com/magasincoffee/magasincoffee.github.io/pull/439) exact SHA `cec1c19fbfdb4b8ad07b6a2b202c413ed6671041`: added invariant 46 existing `profiles` FK relationships + 2 new lifecycle audit FK = 48 on synthetic post-migration database. First [run 39092995441](https://github.com/magasincoffee/magasincoffee.github.io/actions/runs/39092995441) FAILED with mismatch; diagnostic [run 39093078923](https://github.com/magasincoffee/magasincoffee.github.io/actions/runs/39093078923) proved observed 48, showing initial expected 46 neglected the two additive audit FK. Corrected assertion; [run 39093120869](https://github.com/magasincoffee/magasincoffee.github.io/actions/runs/39093120869) job SUCCESS including fixture, migration, synthetic role and lifecycle tests. | Synthetic FK-coverage count PASS, not full-schema clone or real JWT/RLS/ACL parity. ID78 remains `[ ]` BLOCKED, ID79–90 remain unverified, no production mutation. Requires true full-schema clone or explicit scoped dev-only acceptance change before sequencing. |

| 2026-10-18 ICT | 78 | BLOCKED (root cause identified: no reproducible source baseline) | Verified current `main` has 42 incremental SQL files under `07_DATABASE/migrations`; `07_DATABASE/BASELINE_MIGRATION_PLAN_V1.md` explicitly states core `profiles`, `stores`, `work_schedules` and other base table creation migrations are absent. Therefore replaying migrations on empty Postgres is NOT a full-schema clone. [QA PR #439](https://github.com/magasincoffee/magasincoffee.github.io/pull/439) head `b3c61cb4e212d04bd0f0e6badc7aa7ba4eb5e6af` adds `LIFECYCLE_FULL_SCHEMA_BASELINE_GATE.md` documenting a **fresh schema-only** catalog capture on an authorized trusted runner (not old data backup) and `lifecycle-full-schema-preflight.mjs` fail-closed manifest gate. These are design/preflight files; no baseline capture or full restore was executed. | Keep ID78 `[ ]`/BLOCKED until trusted isolated schema-only reconstruction, constraints/triggers/owner+ACL+RLS and signed QA JWT tests actually run successfully; previous synthetic QA green remains valid only in its limited scope. No Production write, no old backup restoration, no release. |

| 2026-10-18 ICT | 78 | BLOCKED (fresh schema-only trusted workflow authored, not executed) | Discovered main workflows `xstore-019o-full-schema-isolated-qa.yml` (historical encrypted archive) and `xstore-019o-platform-clone-preflight.yml`. Created on [PR #439](https://github.com/magasincoffee/magasincoffee.github.io/pull/439) QA head `a497ddf6becf59dd6d8d0b7623a40fd4349bfc38` new `.github/workflows/lifecycle-fresh-full-schema-qa.yml`: manual-only, trusted-main ref, environment gate, explicit project ref in readonly DB secret, fresh `pg_dump --schema-only`, isolated network-disabled PostgreSQL, fail-closed pg_restore, no data-row artifact. No `MAGASIN_SCHEMA_READONLY_DB_URL` credential was supplied/verified; no workflow_dispatch tool or actual full-schema restore performed. This preliminary workflow excludes owner/ACL replay (`--no-owner --no-acl`) and does not certify RLS grants, signed JWT, or Production recovery. | Do not PASS ID78. Before run, qualify environment secrets, tighten platform-role/extension bootstrap and ACL/RLS evidence, obtain trusted main execution, compare schema catalogs and exact SHA. No Production mutation or release. |

| 2026-10-18 ICT | OWNER product-first / phase 1 | FEATURE DEVELOPMENT STARTED; ID78 still BLOCKED/OWNER-DEFERRED | Owner directs to stop QA-first loop and keep developing existing WebApp. Created [PR #440](https://github.com/magasincoffee/magasincoffee.github.io/pull/440), branch `feature/manager-staff-search-20261018`, HEAD `8a67120886fd775165386e2eb8d3d72c77772231` from current main: staff-list local search by name/username/phone, accessible label and empty results. One JavaScript file changed; not merged or deployed. | Next continue independent phase-1 features on feature PRs; do not claim ID78/79–90 PASS. Release gates stay separately enforced; no Production SQL/data changes. |

| 2026-10-18 ICT | OWNER / PRODUCT RELEASE TRACK | DEVELOPMENT CONTINUES; NO RELEASE YET | Owner explicitly opts out of legacy backup restoration/testing for product development, asks to complete and release current WebApp. GitHub re-check: main deployed SHA `3c4a4e7484f1ab161ba8cc3bbb2d49b1eaa855ae`; #440 Draft (1-file UI staff search) CI UI2 and People Shift success; #394 Draft (7 files lifecycle including migration); #392 Draft (157 files broad V4); #393 Draft (2 files SAPO privilege repair). Owner intent recorded in directive #21. | Split release slices; stage UI first, review actual new code safety gates and exact-main deploy. No merge/Production mutation in this journal entry. No legacy restore demanded for dev work. |

| 2026-10-18 ICT | RELEASE SLICE #440 | MERGED INTO MAIN; PAGES DEPLOY RUNNING | Owner product-first approved progressing new app. PR [#440](https://github.com/magasincoffee/magasincoffee.github.io/pull/440) one-file client-side Manager staff search (name, username, phone, empty state) moved Draft→Ready after four green PR checks and **squash merged** to main at `1007fd651377d9ced1cf3bf8e3fc9d256039c22b`. Exact-main source validation run [39094377108](https://github.com/magasincoffee/magasincoffee.github.io/actions/runs/39094377108) SUCCESS; GitHub Pages run [39094376840](https://github.com/magasincoffee/magasincoffee.github.io/actions/runs/39094376840) in_progress at last observation. | Confirm GitHub Pages run SUCCESS and site asset SHA before claiming live deployment. Next prioritize scoped feature PRs; #392/#394/#393 remain gated; no Production DB mutation. |

| 2026-10-18 ICT | RELEASE SLICE #440 | GITHUB PAGES DEPLOY SUCCESS | Exact SHA `1007fd651377d9ced1cf3bf8e3fc9d256039c22b` [GitHub Pages run 39094376840](https://github.com/magasincoffee/magasincoffee.github.io/actions/runs/39094376840) completed/success after PR #440 squash merge. This verifies successful GitHub Pages build/deployment for exact main SHA; browser-level end-to-end usage has not been certified. | Next continue scoped improvements; release gates for sensitive lifecycle/FT/PT backend remain. |

| 2026-10-18 ICT | PHASE 1 / Manager staff view | FEATURE PR OPEN, CI PENDING | From deployed main `1007fd651377d9ced1cf3bf8e3fc9d256039c22b`, created [PR #441](https://github.com/magasincoffee/magasincoffee.github.io/pull/441) Draft HEAD `24eaccfc1398b06161ddb86db16ec951ed302bc6`: filter canonical staff projection by ACTIVE/INACTIVE/PENDING/ALL, composing with already released local name/username/phone search. No SQL, status mutation or Production data write. Actions [People Shift #39094564476](https://github.com/magasincoffee/magasincoffee.github.io/actions/runs/39094564476) and [UI2 #39094564532](https://github.com/magasincoffee/magasincoffee.github.io/actions/runs/39094564532) in_progress at verification. | Do not merge until checks complete successfully. PR #394 lifecycle backend remains Draft/gated; no production mutation/release of #441 yet. |

| 2026-10-18 ICT | PHASE 1 / PR #441 | CI FAILURE FOUND / REPAIR COMMITTED, retest pending | On PR #441 head `24eaccfc1398b06161ddb86db16ec951ed302bc6`, UI2 run `39094564532` and People Shift run `39094553537` failed `ui2_013_*_staff_hierarchy_responsive` because new Employee status dropdown was erroneously counted as a Swap/Give scope selector by generic `.mui2-module-controls select` assertion. Fixed **test selector only** to ignore explicit `#mspStatusFilter` in `09_QA/people-shift/ui2-013-manager-operations-browser.mjs`; new head `53a0a1392079cb4040e94d37a9f282ddaa6e7031`. Exact-head re-runs [UI2 39094752539](https://github.com/magasincoffee/magasincoffee.github.io/actions/runs/39094752539) and [People Shift 39094752535](https://github.com/magasincoffee/magasincoffee.github.io/actions/runs/39094752535) running at observation. | Do NOT mark PR #441 CI green, merge, or claim production deployment before exact-head successful results. Continue PR #394 lifecycle and FT/PT only as separated, safely gated changes. |

| 2026-10-18 ICT | PHASE 1 / PR #441 | MERGED + GITHUB PAGES DEPLOY SUCCESS | PR [#441](https://github.com/magasincoffee/magasincoffee.github.io/pull/441) exact head `53a0a1392079cb4040e94d37a9f282ddaa6e7031` UI2 Cross Role runs [39094754777](https://github.com/magasincoffee/magasincoffee.github.io/actions/runs/39094754777) and [39094752539](https://github.com/magasincoffee/magasincoffee.github.io/actions/runs/39094752539) SUCCESS, People Shift [39094754769](https://github.com/magasincoffee/magasincoffee.github.io/actions/runs/39094754769) and [39094752535](https://github.com/magasincoffee/magasincoffee.github.io/actions/runs/39094752535) SUCCESS. Marked Ready then squash merged `main` SHA `b54825bfc0b4c0b5de3cc7abefd6841c3d45fe15`. [Pages deploy 39094938556](https://github.com/magasincoffee/magasincoffee.github.io/actions/runs/39094938556) completed SUCCESS. Staff status filter is now deployed to GitHub Pages. | Next resume #394 lifecycle and FT/PT backend as separately qualified changes. Do not claim DB migration or lifecycle write deployed; no Production DB change. |

| 2026-10-18 ICT | PHASE 1 / FTPT | BACKEND CANDIDATE READY, ISOLATED QA SUCCESS; NOT RELEASED | Created [PR #442](https://github.com/magasincoffee/magasincoffee.github.io/pull/442) from current `main` `b54825bfc0b4c0b5de3cc7abefd6841c3d45fe15` head `c2abf2a24950bd39be47c8570c2b2067144e2f1c`: proposed `public.employee_employment_types_v1` FULL_TIME/PART_TIME, reader `list_employee_employment_types_v1()`, writer `set_employee_employment_type_v1(uuid,text)` with active actor + Owner/enterprise ALL Manager write policy, no profile status, schedule or payroll mutation. Live Production metadata inspected read-only, confirms no `profiles.employment_type` or matching FT/PT RPC in current schema. Synthetic fixture, PG17 CI and negative scope checks [run 39095484672](https://github.com/magasincoffee/magasincoffee.github.io/actions/runs/39095484672) completed SUCCESS on exact head. | #442 Draft, not merged or deployed; no Production migration applied; FT/PT UI remains not integrated on latest main. Next qualify schema/authorization and join lifecycle/FTPT UI separately, release in scoped order. Old restore/ID78 dev block remains deferred without falsely claiming PASS. |

| 2026-10-18 ICT | PHASE 1 / FTPT integration | QA SUCCESS; UI CI still running / no release | PR #442 head `9060b4398030e5c84aeaf977ae362a0beb06a401` extended beyond initial migration to integrate FT/PT reader and writer with current `main` Manager staff view, fail-closed disabled controls when backend unavailable, update UI2 RPC contract. [Employee FTPT isolated QA run 39095676376](https://github.com/magasincoffee/magasincoffee.github.io/actions/runs/39095676376) completed SUCCESS on exact head. UI2 [39095676374](https://github.com/magasincoffee/magasincoffee.github.io/actions/runs/39095676374) and People Shift [39095676411](https://github.com/magasincoffee/magasincoffee.github.io/actions/runs/39095676411) in_progress on observation. | PR Draft; do NOT merge or claim deployed until all exact-head UI CI green; backend migration not applied to Production and FT/PT not usable there. Lifecycle PR #394 still unresolved; no production data writes. |

| 2026-10-18 ICT | PHASE 1 / FTPT + LIFECYCLE RELEASE | BACKEND PRODUCTION APPLIED / FRONTEND PAGES DEPLOYED; REAL LOGIN ACCEPTANCE NOT YET VERIFIED | PR #442 FTPT merged to main `a65febdf81134c444999405c85fdbd644b17dcdc`, GitHub Pages `39095882127` SUCCESS. PR #443 lifecycle merged to main `a3d4b2327f18712c67c24d6e32370d57c1e448ed`, GitHub Pages [run 39096357959](https://github.com/magasincoffee/magasincoffee.github.io/actions/runs/39096357959) SUCCESS. Exact-head #443 Lifecycle QA [39096146543](https://github.com/magasincoffee/magasincoffee.github.io/actions/runs/39096146543), UI2 [39096146546](https://github.com/magasincoffee/magasincoffee.github.io/actions/runs/39096146546), People Shift [39096146539](https://github.com/magasincoffee/magasincoffee.github.io/actions/runs/39096146539) SUCCESS. Applied **two additive DDL migrations to MAGASIN-NOIBO Production** via Supabase connector: `xstore_employee_ftpt_v1` (source Git blob `119693599f7ac3d8ac5964c9088ba3586a6bd970`) and `xstore_staff_lifecycle_v1` (blob `9b35072c73202ac310f3dbe7df98e189848bef2e`). Verified read-only: FTPT table+reader+writer exist, RLS on, anon direct table read/write execute denied, authenticated RPC write execute allowed, 0 FTPT rows; lifecycle audit table+reader+writer exist, RLS on, anon audit read/write execute denied, authenticated RPC execute allowed, 0 audit rows. No real employee status/employment classification invoked by agent. [PR #444](https://github.com/magasincoffee/magasincoffee.github.io/pull/444) cache-chain refresh head `481395501f24fdbae7f23945d37a7a12d45faf19`, CI in progress; this is needed for immediate browser cache version refresh. | Do not conflate DDL/PAGES success with real authenticated browser acceptance; verify #444 CI/merge/pages and Owner/Manager browser flows without writing real person data. Maintain separate rollback and security constraints; legacy backup restore remains deferred for product development. |

| 2026-10-18 ICT | PHASE 1 / FTPT + LIFECYCLE RELEASE COMPLETE (scoped) | PRODUCTION SCHEMA + PAGES DEPLOY SUCCESS; NO REAL-USER E2E | [PR #444](https://github.com/magasincoffee/magasincoffee.github.io/pull/444) refreshing entry→runtime→engine→staff query cache versions on all Manager routes merged after exact-head CI `0d2699524ec6099c48635da0977114f29926907e`: [UI2 39097013618](https://github.com/magasincoffee/magasincoffee.github.io/actions/runs/39097013618), [People Shift 39097013506](https://github.com/magasincoffee/magasincoffee.github.io/actions/runs/39097013506), lifecycle fresh QA [39097013596](https://github.com/magasincoffee/magasincoffee.github.io/actions/runs/39097013596) and XSTORE scheduler/SOP suites SUCCESS. PR #444 squash main commit `0bdc739c58cbf6210e08ad1ce134c5b62cccc09d`; exact-SHA [GitHub Pages deploy 39097199757](https://github.com/magasincoffee/magasincoffee.github.io/actions/runs/39097199757) completed SUCCESS. Existing FT/PT and lifecycle Production migrations (PR #442/#443 SQL) verified installed with RLS enabled, `anon` cannot execute writer, authenticated roles call functions subject to internal Owner/Manager checks, 0 new classification/audit rows. Supabase security advisor labels no-RLS-policies INFO for new tables, expected because direct access is revoked and only privileged RPCs used; other legacy security advisories remain separate backlog. | This **does not** certify real logged-in Owner/Manager click paths; browser E2E is synthetic; do not edit any real employee solely to test. No historical backup restore required for development. Scoped Phase 1 FT/PT/lifecycle release is deployed, broader four-phase MAGASIN product still not fully completed and SAPO P0 remains security backlog. |

| 2026-10-18 ICT | PHASE 1 / Manager staff modal UX | PR MERGED; PAGES RUN PENDING AT LOG TIME | User screenshot demonstrated inline setup form appeared above long list forcing scroll. Created [PR #445](https://github.com/magasincoffee/magasincoffee.github.io/pull/445) to render centered responsive accessible dialog for Store Priority+FT/PT and separate lifecycle confirmation, with overlay, backdrop/ESC close, focus containment, return focus to opener, maintaining existing RPC writes/authorization. Updated full Manager cache chain. Exact head `d4fe3cd9a79abeffdf83e51891f64b6a3cb63806` CI UI2 [39098179185](https://github.com/magasincoffee/magasincoffee.github.io/actions/runs/39098179185), People Shift [39098179167](https://github.com/magasincoffee/magasincoffee.github.io/actions/runs/39098179167), Lifecycle [39098179177](https://github.com/magasincoffee/magasincoffee.github.io/actions/runs/39098179177) plus XSTORE/SOP suites SUCCESS. Squash merged main `b61ef74f12c94adcb9ea329cb0860b37b3f585ef`. [GitHub Pages run 39098358498](https://github.com/magasincoffee/magasincoffee.github.io/actions/runs/39098358498) in progress at first observation. | Confirm exact-SHA Pages SUCCESS; no Production DB edits or real employee mutations from this UI change. No old backup recovery required. |

| 2026-10-18 ICT | PHASE 1 / Manager staff modal UX | PAGES SUCCESS (exact SHA) | [GitHub Pages run 39098358498](https://github.com/magasincoffee/magasincoffee.github.io/actions/runs/39098358498) completed SUCCESS on `main` SHA `b61ef74f12c94adcb9ea329cb0860b37b3f585ef`; popup dialogs released. | Browser owner/manager manual authenticated acceptance not independently confirmed; no Production DB or employee data changed in PR445. |

| 2026-10-18 ICT | PHASE 1 / Staff modal unified Save | MERGED, PAGES IN PROGRESS AT JOURNAL TIME | Owner screenshot asked to replace separate FT/PT and Store Priority save buttons with one. [PR #446](https://github.com/magasincoffee/magasincoffee.github.io/pull/446), exact head `84781bd3f1209164d2e6f39a8e2c8583dad5d91b`, changed Manager modal to **one `Lưu thay đổi` button**, conditional writes only for modified priority/FTPT, input validation and explicit partial-success error messaging; Manager asset cache updated. [UI2 Cross Role run 39098851349](https://github.com/magasincoffee/magasincoffee.github.io/actions/runs/39098851349), [People Shift 39098851397](https://github.com/magasincoffee/magasincoffee.github.io/actions/runs/39098851397) plus lifecycle/XSTORE/SOP tests SUCCESS. Squash merged main `83059825cd47921de8f5c12abc3644ef67321c07`. [Pages run 39099026358](https://github.com/magasincoffee/magasincoffee.github.io/actions/runs/39099026358) in_progress at journal time. | Both writes are two distinct RPC transactions, not atomic across FT/PT and Store Priority: errors show explicit partial success and require retry. No SQL migration or real employee mutation in this change. |

| 2026-10-18 ICT | PHASE 1 / Staff unified Save release | GITHUB PAGES SUCCESS | [Pages run #39099026358](https://github.com/magasincoffee/magasincoffee.github.io/actions/runs/39099026358) completed SUCCESS on exact main SHA `83059825cd47921de8f5c12abc3644ef67321c07` after PR #446. Single modal Save now published. | Logged-in user confirmation still not independently performed. |

| 2026-10-18 ICT | PHASE 2 / Manager scheduling five steps | PR #447 DRAFT, COMPATIBILITY CI IN PROGRESS | User directed to continue 5-step scheduler. Confirmed source exists in legacy broad Draft PR #392, 70KB `manager-five-board-v4.js` with approved steps Chuẩn bị → Tạo lịch nháp → Chỉnh lịch → Kiểm tra → Duyệt & phát hành. Created narrow [PR #447](https://github.com/magasincoffee/magasincoffee.github.io/pull/447) on current main; ported presentation-only five-board script, loaded after canonical Manager scheduler, added 5-step/read-only writer contract. Exact head `2fbcfcc36e5dd5c4de8d51fb08357a1d0796eb0d`; GitHub Actions People Shift `39112205480`, UI2 `39112205462`, XSTORE scheduler `39112205486` running when recorded. | Do NOT claim live release or PASS until full current-main browser compatibility proven; 5-board presentation may depend on PR #392 features not yet on main. No Production DB modification. Resume integration and repair failing CI before merge. |

| 2026-10-18 ICT | PHASE 2 / Manager five-step compatibility | PR #447 NOT MERGED | Initial exact-head 5-step integration had `SCHED-01` browser failure because the old smoke asserted obsolete legacy headings; updated browser smoke to require 5-step labels (or old complete legacy set) without weakening role/data assertions. New PR #447 exact HEAD `45376565bc12c0e621aa45b5516fd5fa896110ea`, UI2 [39112360867](https://github.com/magasincoffee/magasincoffee.github.io/actions/runs/39112360867) and People Shift [39112360943](https://github.com/magasincoffee/magasincoffee.github.io/actions/runs/39112360943) in_progress. XSTORE suite outcomes awaiting current exact SHA. | Still must verify 1440/390 responsive five boards and authority before merge/release. Original PR #392 remains Draft. No Production writes. |

| 2026-10-18 ICT | PHASE 2 / Manager five-board compatibility | STILL DRAFT | PR #447 initial exact-head SCHED-01 then SCHED-04 browser tests required acceptance update because legacy single-layout headings are hidden by approved five-board shell. Adapted SCHED-01 and SCHED-04 checks to accept five-step structure without dropping existing RPC/publish assertions. Head `71c3ac0d4e8d00a13d2407db2139b63c79da6abf`, [People Shift 39112477028](https://github.com/magasincoffee/magasincoffee.github.io/actions/runs/39112477028), [UI2 39112477022](https://github.com/magasincoffee/magasincoffee.github.io/actions/runs/39112477022) in_progress. | No merge, no release until browser and authority checks complete; finish dependency parity for full V4 board, 1440/390 acceptance. |

| 2026-10-18 ICT | PHASE 2 / Five-board root cause | BLOCKED FOR RELEASE; DRAFT PR #447 | A full 1440/390 direct browser QA on [run 39112612273](https://github.com/magasincoffee/magasincoffee.github.io/actions/runs/39112612273) failed to mount `.x19g-shell`. Inspected exact current-main `draft-publish-v1.js`: it has `.msd-head` but **no `.msd-single-store`**, whereas ported PR #392 `manager-five-board-v4.js` `enhance()` returns false unless `.msd-single-store` is present. Hence the imported 70KB five-board presentation cannot initialize on released main. Do not 'fix' by accepting old text alone. Current PR #447 head `1e85ecc022932b3aae195033cbe69b984758091d` adds detailed browser diagnostics (run [39112781840](https://github.com/magasincoffee/magasincoffee.github.io/actions/runs/39112781840)). | NEXT: adapt current main draft-publish DOM to safe five-board structure **without overwriting FT/PT and lifecycle changes** or develop a smaller feature-flagged 5-step shell; run exact 1440/390 browser acceptance, then only merge and deploy. Production current release unchanged. |

## 5. EXIT CRITERIA TOÀN DỰ Á

- Backup/restore **owner+ACL+RLS parity PASS**; SAPO resolver P0 đóng; 3-role scope/JWT/negative RPC PASS.
- PR #394 lifecycle đã phát hành kiểm chứng; FT/PT, L outside attendance, Manager/Employee/Owner V4 phát hành từ exact RC có approval.
- Dữ liệu SAPO/revenue xử lý đúng tính trung thực; Procurement QA GREEN; các luồng lịch thật 4 chi nhánh và XSTORE-020/011 nghiệm thu.
- Không xóa dữ liệu thật để thử nghiệm; không biến cảnh báo bất toàn thành PASS.
- Tất cả ID có bằng chứng, log và tài liệu vĩnh viễn đã đồng bộ, khi đó mới được kết thúc/xóa SOT tạm.

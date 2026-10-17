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
**Status tổng:** EXECUTION IN PROGRESS; ID 1–10 + ID 12–19 PASS (18/287); ID 11 BLOCKED / OWNER-DEFERRED cho điều phối phát triển; RELEASE BLOCKED đối với các hard gate chưa đạt.  
**Tổng:** **287 việc nguyên tử**, chỉ có một luồng thực thi có thứ tự tăng dần.

## 0. HƯỚNG DẪN BẮT BUỘC CHO CHAT/ROBOT MỚI

1. Mở file này từ đúng branch/PR GitHub, **không** giả định bản trên `main` đã được merge.
2. Đọc tài liệu nghiệp vụ gốc `01_DOCS/MAGASIN/05_SYSTEM/WORKFORCE_CROSS_STORE_SCHEDULING_TEMP_SOURCE_OF_TRUTH.md` ở `main`. File này là **checklist điều phối**, KHÔNG thay thế quy tắc bảo mật và nghiệp vụ của SOT gốc.
3. Đối chiếu mới nhất PR #392, #393, #394, #436, #390; GitHub Actions; Supabase metadata trước thao tác. Các SHA và con số ngày 17/10 là baseline lịch sử, không là bằng chứng hôm sau.
4. Đọc journal cuối file và chọn **ID nhỏ nhất chưa PASS mà các tiền đề đã PASS**, **ngoại trừ ID 11 được Owner cho phép tạm gác ngày 2026-10-17 để tiếp tục xây WebApp**. Không được tính ID 11 là PASS; chuyển sang ID 12 rồi ID 13 theo thứ tự. Chỉ thực hiện một ID mỗi lần; nếu sửa để đạt PASS, dùng nhánh/PR chuyên trách, kiểm chứng rồi ghi nhật ký.
5. Mỗi ID có trạng thái `TODO` → `DOING` → `PASS` hoặc `BLOCKED`. **Không** tự đánh dấu PASS chỉ vì workflow xanh nếu step quan trọng SKIPPED, không mặc định PASS cho data thiếu.
6. Mỗi lần hoàn thành: sửa đúng checkbox ID bằng commit tài liệu trong **cùng nhánh nguồn này**; ghi nhật ký 1 dòng `[ngày ICT] [ID] [status] [evidence PR/run/SHA/SQL summary] [next]`. Nếu blocker, ghi đúng blocker, không tự skip hay vượt qua gate; riêng ID 11 có **Owner-deferred exception về thứ tự công việc**, KHÔNG phải chứng nhận PASS hoặc miễn gate phát hành.
7. Nếu phát hiện lỗi mới: ghi ID phụ `<số>.a` ngay sau ID liên quan, trước khi chạy task kế tiếp; không đánh lại ID ổn định. Ràng buộc hoàn thành phải có dữ liệu chứng minh.
8. **READ-ONLY mặc định.** Không gọi resolver SAPO có side-effect, không thay đổi hồ sơ nhân viên thật, payroll, schedules hoặc SQL DDL Production để smoke test.
9. Chỉ áp dụng SQL Production, merge/deploy, xuất bản lịch hoặc xoá dữ liệu khi có backup/restore tương đương, roles/RLS/ACL, exact SHA/CI và phê duyệt phù hợp. Chỉ một task phát hành được triển khai tại một thời điểm; thất bại thì STOP.
10. Secrets/JWT/password/PII không ghi vào tài liệu, chat, GitHub logs hoặc PR. Sử dụng account đã được Owner ủy quyền; không giả lập Production identity hay đoán token.
11. Ưu tiên cloud/GitHub/Supabase từ điện thoại; không biến H4 thành tiền đề bắt buộc. Không tạo Supabase staging tính phí mà chưa được phê duyệt chi phí.
12. Chỉ phát hành hẹp PR #394 trước; PR #392 lớn chưa được tự động merge. Directive SOT §0.71 cho phép phát hành 019O khi đủ gate, không chờ nửa đêm **chỉ với phạm vi đó**.
13. Thay đổi kiểm thử riêng trên nhánh tài liệu không đồng nghĩa deploy. Bằng chứng Production phải ghi exact-main + Pages run + migration ledger.
14. Hoàn tất **mọi task** và đồng bộ tài liệu kiến trúc lâu dài trước khi xóa file tạm.
15. **Owner decision — 2026-10-17 20:20:46 ICT:** Mục tiêu ưu tiên là **WebApp MAGASIN thực sự hoàn thiện và sử dụng được**; bản Production hiện tại còn thô sơ, không được coi là nghiệm thu hoàn chỉnh. Owner đồng ý **tạm bỏ qua kiểm toán lịch sử tuyệt đối của ID 11** để tiếp tục phát triển. ID 11 giữ nguyên `[ ]` + `BLOCKED` (theo 4 trạng thái hợp lệ); ghi nhãn **OWNER-DEFERRED** trong phần giải thích, **không tự chuyển thành PASS**. Được phép tiếp tục ID 12→13… trong phạm vi **tài liệu, phân tích, nhánh test và QA cô lập**. Trước bất kỳ production SQL/DDL, merge/deploy, publish lịch hoặc thay đổi dữ liệu thật nào, **không được bỏ qua** backup/restore owner+ACL/RLS, JWT/authorization, exact-HEAD CI và Owner release approval. Không mặc định mở lại ID 11 vì những vòng rà soát không có bằng chứng lịch sử mới; chỉ quay lại ID 11 khi Owner yêu cầu hoặc khi tiêu chí xác minh trạng thái hiện tại được Owner xác nhận rõ. Các task phát hành phải kiểm tra gates độc lập với ID 11.


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

## 5. EXIT CRITERIA TOÀN DỰ Á

- Backup/restore **owner+ACL+RLS parity PASS**; SAPO resolver P0 đóng; 3-role scope/JWT/negative RPC PASS.
- PR #394 lifecycle đã phát hành kiểm chứng; FT/PT, L outside attendance, Manager/Employee/Owner V4 phát hành từ exact RC có approval.
- Dữ liệu SAPO/revenue xử lý đúng tính trung thực; Procurement QA GREEN; các luồng lịch thật 4 chi nhánh và XSTORE-020/011 nghiệm thu.
- Không xóa dữ liệu thật để thử nghiệm; không biến cảnh báo bất toàn thành PASS.
- Tất cả ID có bằng chứng, log và tài liệu vĩnh viễn đã đồng bộ, khi đó mới được kết thúc/xóa SOT tạm.

# MAGASIN Business OS — Kiến trúc V1 đã chốt

**Status:** APPROVED / CANONICAL  
**Ngày chốt:** 2026-09-18  
**Mục tiêu:** V1 production trong 21 ngày lịch; Owner Control Tower dùng được khoảng ngày 7.

## 1. Nguyên tắc nguồn sự thật

Thực tế doanh nghiệp MAGASIN là nguồn sự thật.

Luồng chuẩn vẫn giữ:

```text
DISCOVERY → BUSINESS RULE → SOP → DATA MODEL → SYSTEM → WEBAPP/AUTOMATION → FIELD VALIDATION
```

Kế hoạch 21 ngày không cho phép bỏ qua nghiệp vụ. Nó rút ngắn thời gian bằng cách chỉ Discovery phần cần cho từng vertical slice, loại bỏ yêu cầu thừa và đưa từng lát cắt vào test thực tế sớm.

## 2. Phương pháp 5 bước

Mọi yêu cầu phải đi theo thứ tự:

1. **Question** — yêu cầu này phục vụ quyết định/kết quả kinh doanh nào?
2. **Delete** — có thể bỏ yêu cầu/bước/quy trình này không?
3. **Simplify** — phần còn lại có thể đơn giản hơn không?
4. **Accelerate** — chia nhỏ và rút vòng phản hồi thế nào?
5. **Automate** — chỉ tự động hóa quy trình đã đúng và đủ ổn định.

Không được đảo thứ tự và không tự động hóa một quy trình chưa được xác nhận.

## 3. Scope V1 khóa cứng

V1 gồm:

- Sales
- Inventory
- People
- Shift
- SOP / Checklist
- Task
- Owner Dashboard
- Alerts
- Daily Brief
- Business Robot
- Approval Queue
- Google Sheets import/sync
- Media Robot connector
- Audit log
- Backup/recovery cơ bản
- Role/access cơ bản
- Supervisor Robot
- Project state/task queue cho tự động tiếp tục

Ngoài V1:

- full accounting ERP
- payroll hoàn chỉnh
- native mobile app
- CRM nâng cao
- loyalty hoàn chỉnh
- AI forecasting phức tạp
- camera AI
- automation FoodApp toàn diện
- tuyển dụng nâng cao
- UI polish không ảnh hưởng vận hành

Thêm scope mới phải đổi bằng thời gian hoặc bỏ scope khác.

## 4. Kiến trúc V1

```text
MAGASIN BUSINESS OS
│
├── Web Control Center
│   ├── Owner
│   ├── Manager
│   └── Employee
│
├── Business Core
│   └── Supabase / PostgreSQL
│
├── Core Domains
│   ├── Sales
│   ├── Inventory
│   ├── People
│   └── Tasks / SOP
│
├── Business Robot
│   ├── Daily Brief
│   ├── Alerts
│   ├── Anomaly Detection
│   ├── Recommendations
│   └── Approval Queue
│
├── Integrations
│   ├── Google Sheets
│   ├── Sapo
│   ├── magasin-media-robot
│   └── Local Windows Agent
│
└── Autonomy Layer
    ├── GitHub task/state
    ├── Windows self-hosted runner
    └── Supervisor Robot
```

Repo hiện tại tiếp tục dùng cấu trúc canonical:

- `01_DOCS/` — source of truth
- `02_CORE/` — shared technical primitives
- `03_PLATFORM/` — auth/platform
- `04_OWNER/`
- `05_MANAGER/`
- `06_EMPLOYEE/`
- `07_DATABASE/`
- `08_INTEGRATIONS/`
- `09_QA/`

Không tạo root kiến trúc mới song song.

## 5. Bốn domain lõi

### Sales

V1 phải trả lời: hôm nay bán bao nhiêu, theo chi nhánh/sản phẩm/khung thời gian, thay đổi so với baseline gần nhất.

### Inventory

Dùng movement-ledger làm nguồn sự thật:

```text
opening
+ receipt
+ transfer_in
- transfer_out
- usage
- adjustment
= stock
```

Không lưu nhiều “tồn hiện tại” cạnh tranh nhau.

### People

Nhân viên, cửa hàng, availability, shift, lịch, staffing gap và vai trò vận hành cơ bản.

### Tasks / SOP

SOP phải trở thành workflow/checklist thực thi được:

```text
SOP template
→ execution
→ responsible person
→ exception
→ corrective task
→ verify
→ close
```

## 6. Business Robot

Business Robot đọc dữ liệu đã xác minh để:

- tạo Daily Brief;
- phát hiện ngoại lệ;
- cảnh báo tồn/ca/task;
- đưa recommendation có evidence;
- đưa hành động có ảnh hưởng vào Approval Queue.

Robot không được tự suy đoán dữ liệu thiếu thành FACT.

## 7. Quyền tự động hóa

### GREEN — tự động

- đọc repo;
- tạo/sửa code trên branch;
- unit/integration tests;
- build/lint;
- tài liệu;
- diagnostics không phá hủy;
- retry lỗi transient không side effect;
- tiếp tục micro-task kế tiếp.

### YELLOW — chuẩn bị, chờ duyệt nếu ảnh hưởng production

- migration production;
- bật connector mới;
- thay workflow đang dùng;
- backfill dữ liệu;
- thay permissions;
- release thay đổi nghiệp vụ đáng kể.

### RED — luôn cần Owner

- thanh toán/chuyển tiền;
- nhập credential/MFA;
- xóa production không thể hoàn tác;
- purge dữ liệu;
- quyền admin/security escalation;
- quyết định nghiệp vụ mơ hồ.

## 8. Supervisor Robot

Mục tiêu: dự án không dừng chỉ vì ChatGPT kết thúc một lượt, lỗi mạng hoặc UI yêu cầu tiếp tục.

Ưu tiên kỹ thuật:

1. DOM/accessibility/UI automation;
2. semantic controls;
3. screen/image interpretation khi cần;
4. OCR chỉ là phương án cuối.

Supervisor có thể:

- nhận biết trạng thái “continue/retry/network interruption”;
- đọc project state;
- gửi chỉ thị tiếp tục khi state cho phép;
- theo dõi Actions;
- chờ/retry tác vụ không side effect.

Supervisor phải dừng khi:

- login/credential;
- CAPTCHA/MFA;
- quyết định nghiệp vụ;
- hành động RED;
- state = `WAIT_USER`.

Không thu thập password, cookie, token, browser profile hay auth dump.

## 9. Điều khiển local và kill switch

```text
Shell 1: GitHub self-hosted runner
C:\actions-runner
.\run.cmd

Shell 2: Supervisor Robot
```

- đóng Supervisor → ngừng tự điều khiển ChatGPT/UI;
- đóng runner → GitHub không giao job mới xuống máy;
- đóng cả hai → local automation dừng.

Tránh detached process không kiểm soát.

## 10. Micro-task protocol

Một task implementation bình thường không nên vượt khoảng 20 phút active work.

Nếu lớn hơn, phải chia.

Chu trình bắt buộc:

```text
Estimate
→ Implement
→ Unit test
→ Fix
→ Regression
→ Integration
→ E2E khi áp dụng
→ Update docs/state
→ Commit
→ Next task
```

Task chỉ DONE khi code + tests + regression + E2E phù hợp + docs/state + commit đều hoàn tất.

Bug tái hiện được:

```text
FAIL → BUG LOG → ROOT CAUSE → FIX → REGRESSION → PASS
```

## 11. Business rule phải sửa được

Business rules/workflows phải tách khỏi transaction history ở mức hợp lý.

Khi Owner đổi nghiệp vụ:

```text
Change Request
→ Impact Analysis
→ Version Rule/SOP
→ Migration nếu cần
→ Unit
→ Regression
→ E2E
→ Deploy
→ Observe
```

Execution lịch sử phải giữ version rule/SOP đã áp dụng lúc đó.

## 12. Google Sheets strategy

Không block V1 bằng full migration.

```text
Google Sheets hiện tại
→ Import / Sync
→ Supabase/PostgreSQL
→ Business OS
```

Connector phải có source, sync timestamp, result, row/event count, error và idempotency/reference key khi phù hợp.

## 13. Media Robot

`magasin-media-robot` vẫn là hệ thống riêng.

Business OS chỉ phát structured media task sau approval và nhận status/result; không nhúng voice/video/render internals vào Business OS.

## 14. Lịch 21 ngày

### Ngày 1–3 — Foundation + autonomy
- source-of-truth/state/task queue;
- Supervisor foundation;
- DB/auth/basic roles;
- store/product foundation;
- CI + E2E skeleton.

### Ngày 4–7 — Owner Control Tower
- sales ingestion;
- inventory foundation;
- Sheets sync/import;
- Owner dashboard;
- initial alerts.

### Ngày 8–10 — People / Shift
- employees;
- availability/schedule;
- staffing gap;
- E2E.

### Ngày 11–13 — SOP / Task
- SOP templates;
- checklist;
- corrective task;
- overdue/exception.

### Ngày 14–16 — Rules / Daily Brief
- alert rules;
- baseline comparisons;
- Daily Brief;
- management exceptions.

### Ngày 17–18 — Business Robot / Approval
- recommendations;
- evidence;
- approval queue;
- safe action dispatch.

### Ngày 19 — Media Robot connector
- task contract;
- approved handoff;
- status callback.

### Ngày 20 — Full E2E / recovery
- major operating flows;
- connector/network failure;
- checkpoint/resume;
- regression.

### Ngày 21 — Production hardening
- backup;
- access review;
- audit;
- rollback;
- V1 acceptance.

## 15. Milestones bắt buộc

- **Ngày 3:** dữ liệu nền nhìn thấy được.
- **Ngày 7:** Owner Control Tower dùng được.
- **Ngày 14:** alerts + Daily Brief dùng được.
- **Ngày 21:** V1 production acceptance.

## 16. Public repository rule

Repository `magasincoffee.github.io` hiện PUBLIC.

Do đó tuyệt đối không commit:

- credential/token/cookie;
- browser profile;
- private customer/employee records;
- private financial records;
- production exports;
- generated private media;
- secrets/config.local.

Repo chỉ chứa source code, schema không nhạy cảm, tài liệu kiến trúc/quy trình không mật và test fixtures đã sanitize.

Dữ liệu production phải nằm trong hệ thống dữ liệu có access control phù hợp.

## 17. Continuation contract

Chat mới phải đọc theo thứ tự:

1. `01_DOCS/MAGASIN/00_CURRENT_STATE.md`
2. `01_DOCS/MAGASIN/00_PROJECT_STATE.json`
3. `01_DOCS/MAGASIN/00_TASK_QUEUE.md`
4. `01_DOCS/MAGASIN/00_MASTER_PLAN.md`
5. `01_DOCS/MAGASIN/06_DECISION_LOG.md`
6. `01_DOCS/MAGASIN/07_CHANGE_LOG.md`
7. tài liệu domain/task hiện tại
8. repository/PR/CI thực tế

Repository evidence thắng memory/chat cũ khi có mâu thuẫn.

# NÃO MAGASIN COFFEE

**Mục đích:** Bộ tài liệu bootstrap/training cho một **Bộ não MAGASIN COFFEE mới**.

Khi mở một Brain/chat mới, hãy gửi link thư mục này và yêu cầu đọc toàn bộ tài liệu theo đúng thứ tự bên dưới trước khi phân tích, ra quyết định hoặc giao việc cho Work.

## 0. Repository chính

https://github.com/magasincoffee/magasincoffee.github.io

## 1. Canonical Architecture — đọc đầu tiên

https://github.com/magasincoffee/magasincoffee.github.io/blob/main/01_DOCS/MAGASIN/00_ENTERPRISE_ARCHITECTURE_5_STEP_PROFIT_CASH.md

Đây là kiến trúc chuẩn. Mọi quyết định phải trace về đây.

Phương pháp bắt buộc:

```text
QUESTION → DELETE → SIMPLIFY → ACCELERATE → AUTOMATE
```

Đặc biệt liên tục tối ưu:

```text
SIMPLIFY → ACCELERATE → AUTOMATE
```

## 2. Kế hoạch thực thi hiện hành — PFC_8H_V2

https://github.com/magasincoffee/magasincoffee.github.io/blob/main/01_DOCS/MAGASIN/02_PROFITABILITY_CASH/PFC_8H_V2_EXECUTION_PLAN.md

Đây là execution plan cho Profitability & Cash, gồm primary queue và overflow queue.

## 3. Current State

https://github.com/magasincoffee/magasincoffee.github.io/blob/main/01_DOCS/MAGASIN/00_CURRENT_STATE.md

Đọc để biết hệ thống đang ở đâu tại thời điểm hiện tại.

## 4. Project State — source-of-truth cho cursor thực thi

https://github.com/magasincoffee/magasincoffee.github.io/blob/main/01_DOCS/MAGASIN/00_PROJECT_STATE.json

Đây là authority cho:
- current_task;
- next_task;
- status;
- autonomy;
- blocked/requires_user;
- prepared execution queue;
- robot_may_execute.

Không được đoán cursor từ chat cũ nếu file này nói khác.

## 5. Task Queue

https://github.com/magasincoffee/magasincoffee.github.io/blob/main/01_DOCS/MAGASIN/00_TASK_QUEUE.md

Đọc để biết task nào DONE / READY / QUEUED / overflow.

## 6. Financial Baseline

https://github.com/magasincoffee/magasincoffee.github.io/blob/main/01_DOCS/MAGASIN/02_PROFITABILITY_CASH/FINANCIAL_BASELINE.md

Dùng để hiểu Financial Truth hiện tại, phần đã implement và các GAP / NOT_CONNECTED còn tồn tại.

## 7. MAGASIN Lane Directive V1 Protocol

https://github.com/magasincoffee/magasincoffee.github.io/blob/main/01_DOCS/MAGASIN/00_MAGASIN_LANE_DIRECTIVE_V1_PROTOCOL.md

Đây là protocol Brain → Work.

Brain chỉ giao Work bằng envelope đúng protocol và phải reconcile kết quả với GitHub source-of-truth trước khi advance cursor.

## 8. Supervisor Three-Lane Architecture

https://github.com/magasincoffee/magasincoffee.github.io/blob/main/01_DOCS/MAGASIN/00_SUPERVISOR_THREE_LANE_ARCHITECTURE.md

Đọc để hiểu:
- Supervisor;
- Brain;
- Work;
- lane isolation;
- dispatch/result relay;
- owner handoff;
- automation boundaries.

---

# READ ORDER CHO BỘ NÃO MỚI

Đọc theo đúng thứ tự:

```text
1. 00_ENTERPRISE_ARCHITECTURE_5_STEP_PROFIT_CASH.md
2. PFC_8H_V2_EXECUTION_PLAN.md
3. 00_CURRENT_STATE.md
4. 00_PROJECT_STATE.json
5. 00_TASK_QUEUE.md
6. FINANCIAL_BASELINE.md
7. 00_MAGASIN_LANE_DIRECTIVE_V1_PROTOCOL.md
8. 00_SUPERVISOR_THREE_LANE_ARCHITECTURE.md
```

Sau khi đọc:

1. Reconcile current task từ `00_PROJECT_STATE.json`.
2. Kiểm tra queue tương ứng trong `00_TASK_QUEUE.md`.
3. Kiểm tra task có nằm trong execution plan đang release hay không.
4. Không advance chỉ dựa vào lời Work; phải kiểm tra GitHub code/state/CI.
5. Missing data phải giữ `GAP / NOT_CONNECTED`, không synthetic zero.
6. Google Drive nếu được dùng thì READ-ONLY evidence, không commit raw private data.
7. Brain phân tích/chốt/giao việc; Work thực thi.
8. Chỉ dừng khi gặp true Owner/security boundary hoặc queue/rule yêu cầu dừng.

# NORTH STAR

```text
VẬN HÀNH THẬT
→ DỮ LIỆU ĐÚNG
→ FINANCIAL TRUTH
→ QUYẾT ĐỊNH ĐÚNG
→ THỰC THI
→ KIỂM SOÁT
→ CẢI TIẾN
→ PROFIT ↑ / CASH ↑
```

# LƯU Ý

Tài liệu trong thư mục này là **index/bootstrap**, không thay thế các canonical source files gốc.  
Nếu nội dung index này và source-of-truth gốc khác nhau, **source-of-truth gốc thắng**.


## Workforce Operations V1 — operational relief track

Khi Brain/Work xử lý Workforce, phải đọc thêm theo thứ tự:

1. https://github.com/magasincoffee/magasincoffee.github.io/blob/main/01_DOCS/MAGASIN/05_SYSTEM/WORKFORCE_OPERATIONS_V1_ARCHITECTURE.md
2. https://github.com/magasincoffee/magasincoffee.github.io/blob/main/01_DOCS/MAGASIN/05_SYSTEM/WORKFORCE_OPERATIONS_V1_EXECUTION_PLAN.md
3. https://github.com/magasincoffee/magasincoffee.github.io/blob/main/01_DOCS/MAGASIN/05_SYSTEM/WORKFORCE_OPERATIONS_V1_E2E_ACCEPTANCE_CONTRACT.md

Important: architecture is locked, but TASK-090→108 are STAGED / WAIT_OWNER_RELEASE until Owner explicitly releases execution.

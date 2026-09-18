# Owner Workforce

Theo DEC-003 / Five-Step Schedule-first, Owner Workforce **không còn là canonical daily scheduling owner**.

Target responsibility của Owner:

- policy;
- exception;
- attention;
- read-only/attention projection cần cho Owner decision.

Các engine hiện hữu:

- `01-demand/`
- `02-review/`
- `03-publish/`

được giữ tạm như **TRANSITIONAL IMPLEMENTATION REFERENCE** vì đang chứa behavior/RPC usage đã có test. TASK-031 sẽ reuse/consolidate phần cần thiết vào Manager daily scheduling flow trước khi loại các Owner scheduling surfaces khỏi active ownership.

Không thêm business logic scheduling mới vào folder này trong Schedule-first critical path.

Canonical contract:

- `01_DOCS/MAGASIN/05_SYSTEM/SCHEDULE_FIRST_CANONICAL_FLOW_V1.md`
- `02_CORE/contracts/schedule-first-flow.v1.json`

Manager là daily scheduler. Robot chỉ tạo DRAFT/proposal; explicit Manager review/publish mới tạo lịch chính thức.

# MAGASIN — Employee Learning & Compliance — TEMP SOURCE OF TRUTH

**Search key:** `EMPLOYEE-LEARNING-COMPLIANCE`  
**Track ID:** `EMPLOYEE_LEARNING_COMPLIANCE_V1`  
**Created:** 2026-10-05  
**Status:** ARCHITECTURE LOCKED / IMPLEMENTATION READY  
**Repository:** `magasincoffee/magasincoffee.github.io`  
**Lifecycle:** TEMPORARY — keep until implementation is accepted, production behavior is proven, then reconcile durable rules into canonical employee/workforce documentation.

> New-chat bootstrap: search for **EMPLOYEE-LEARNING-COMPLIANCE**, read this file from the beginning, treat it as the sole authority for this track, then reconcile current repository state before changing code. Do not invent a second policy/quiz authority outside this track.

---

## 0. Owner decision — 2026-10-05

Owner approved a new Employee WebApp capability so employees continuously learn, remember and confirm operating rules instead of relying only on verbal reminders.

Approved operating model:

```text
Canonical Regulation Library
        ↓
Daily Task — normally 1 short task/day
        ↓
Weekly Quiz — reinforcement
        ↓
Acknowledgement — for important/new rules
        ↓
Progress + Completion History
        ↓
Manager / Owner compliance visibility
```

The system is intended to improve operating discipline, knowledge retention and onboarding quality.

This module must not become a punitive “exam system”. Normal daily work must remain lightweight and understandable.

---

## 1. Core product principles

### 1.1 One canonical content authority

The **Regulation Library** is the single source of truth for employee-facing policy, procedure and operational guidance.

Daily Task, Weekly Quiz, acknowledgements and reminders must reference a published version from this library.

Do not duplicate business rules in hard-coded quiz text, notification text or separate static pages when they can be sourced from the canonical library.

### 1.2 Daily interaction must be lightweight

Normal rule:

- 1 required Daily Task per employee per day;
- target completion time: 30–60 seconds;
- normally 1 question or 1 read-and-confirm action;
- more than one required task only when a real urgent/new policy needs acknowledgement;
- never create unnecessary repetitive work.

### 1.3 Weekly reinforcement

Once per week:

- normally 5 questions;
- target completion time: approximately 3–5 minutes;
- incorrect answers must teach the correct rule;
- low score triggers relearning/retry, not automatic punishment.

Suggested behavior:

```text
4–5 / 5  = pass
3 / 5    = review wrong answers
0–2 / 5  = review content + retry
```

Exact thresholds may later be configured without changing the architecture.

### 1.4 Spaced repetition

A newly published or newly assigned rule should be reinforced approximately:

```text
Day 1  → read / first exposure
Day 2  → short scenario question
Day 4  → alternate question
Day 7  → Weekly Quiz
Day 30 → retention check
```

Employees who repeatedly answer correctly should see the topic less often.

Employees who answer incorrectly should receive the topic again sooner.

### 1.5 Personalization

Task selection may use:

- employee role;
- employee level;
- store assignment/scope when relevant;
- recently incorrect answers;
- recently published rules;
- incomplete acknowledgements;
- repeated operational mistakes when a canonical source exists;
- onboarding status.

Examples:

```text
Level 1:
"If you are late for work, what should you do?"

Level 3:
"If a team member has not arrived for a shift and gave no notice, what should you do first?"
```

Level 3 content should reflect higher responsibility and leadership expectations without exposing Manager/Owner-only information.

### 1.6 Vietnamese employee UX

Employee-facing content, guidance, states and errors must be Vietnamese unless a later Owner decision explicitly adds another language.

Do not expose internal technical names, database fields, migration names, RPC names or authority internals to employees.

---

## 2. Regulation Library — canonical knowledge warehouse

The system must provide one searchable employee-facing knowledge repository.

### 2.1 Supported content types

Canonical content types:

1. **Quy định** — policy/rule.
2. **Quy trình** — step-by-step operating procedure.
3. **Hướng dẫn** — how-to guidance.
4. **Thông báo bắt buộc xác nhận** — important change requiring acknowledgement.
5. **Kiến thức công việc** — operating knowledge employees must know.
6. **FAQ** — frequently asked questions sourced from an approved rule/procedure.

### 2.2 Initial content categories

The architecture must support at least:

- Đăng ký lịch / Availability.
- Lịch làm việc chính thức.
- Đổi ca / nhường ca / nhận ca.
- Xin nghỉ / báo vắng.
- Đi trễ / vắng ca.
- Chấm công.
- Quy định đồng phục.
- Vệ sinh cá nhân và vệ sinh cửa hàng.
- An toàn thực phẩm.
- Quy trình mở ca.
- Quy trình trong ca.
- Quy trình đóng ca.
- Phục vụ khách hàng.
- Xử lý phản hồi / khiếu nại.
- Quy tắc giao tiếp nội bộ.
- Trách nhiệm theo cấp bậc.
- Hướng dẫn sử dụng Employee WebApp.
- Quy trình báo lỗi hệ thống.
- Quy trình báo sự cố.
- Nội dung onboarding nhân viên mới.
- Các thay đổi vận hành mới.

The library must be extensible without schema redesign.

### 2.3 Employee visibility

“Everything employees can perform” means all approved operational knowledge needed for their work should be discoverable in one place, subject to authorization.

Do **not** expose:

- Owner-only administration;
- Manager-only confidential controls;
- private employee information of other staff;
- secrets/credentials;
- payroll data outside the employee’s authorized personal view;
- internal security architecture;
- unpublished drafts.

### 2.4 Versioning

Every published rule/procedure must be versioned.

Required semantics:

```text
content item
→ immutable published version
→ effective date
→ audience
→ acknowledgement requirement
→ quiz/task references
```

Editing an already-published material must create a new version rather than silently rewriting the historical meaning.

Employee completion history must remain linked to the exact version they read or answered.

### 2.5 Publication states

Minimum states:

- DRAFT
- PUBLISHED
- ARCHIVED

Only PUBLISHED content may be assigned to normal employees.

ARCHIVED content remains auditable but disappears from normal current guidance.

---

## 3. Employee Home integration

The Employee Home page must surface work that needs attention without making the page confusing.

Recommended priority card:

```text
NHIỆM VỤ HÔM NAY
Chưa hoàn thành
~ 1 phút
[Bắt đầu]
```

Home may also show:

```text
Hôm nay
- Nhiệm vụ: 1 chưa hoàn thành
- Lịch hôm nay
- Đăng ký lịch tuần sau
- Thông báo mới
```

Employee Home must not hide core scheduling/attendance functions behind the learning module.

Priority should be understandable:

1. urgent shift/attendance action;
2. mandatory acknowledgement when applicable;
3. Daily Task;
4. Weekly Quiz;
5. library browsing.

---

## 4. Daily Task

### 4.1 Task types

Daily Task may be:

- one multiple-choice question;
- one true/false scenario;
- one read-and-confirm card;
- one short ordering/sequence question;
- one scenario choice.

Free-text grading is out of scope for V1 unless explicitly approved later.

### 4.2 Completion behavior

After answering:

- show correct/incorrect immediately;
- explain the correct rule briefly;
- provide a direct link to the canonical source content;
- record completion;
- never create a second policy truth in the explanation.

Example:

```text
✓ Hoàn thành nhiệm vụ hôm nay

Quy định:
Nếu không thể đi làm theo lịch đã xác nhận, nhân viên phải báo theo quy trình càng sớm càng tốt.

[Xem quy định đầy đủ]
```

### 4.3 Daily generation

The selector should prioritize:

1. required/unread acknowledgement;
2. recently wrong topic;
3. new/high-priority rule;
4. spaced-repetition due topic;
5. general role/level knowledge.

The same question must not be unnecessarily repeated on consecutive days.

---

## 5. Weekly Quiz

Weekly Quiz must draw only from currently applicable published content.

Requirements:

- normally 5 questions;
- mix topics where possible;
- record score and question-level results;
- show correct rule after mistakes;
- allow required retry;
- preserve attempt history;
- support role/level targeting.

A Weekly Quiz is a learning/reinforcement mechanism.

It must not automatically:

- cut shifts;
- deduct wages;
- delay wages;
- change payroll;
- perform formal labor discipline.

Any future formal disciplinary workflow requires a separate explicit Owner decision and legally reviewed governance.

---

## 6. Mandatory acknowledgement

Important published changes may require explicit acknowledgement.

Employee UX:

```text
QUY ĐỊNH MỚI

Từ ngày ... [approved content]

☐ Tôi đã đọc và hiểu nội dung trên.

[Xác nhận]
```

Store:

- employee;
- exact published version;
- acknowledgement timestamp;
- source content;
- device/session metadata only when already permitted by current privacy/security architecture.

A read receipt is evidence of delivery/acknowledgement inside the product. It must not be falsely described in UI as a legal waiver or consent beyond its real meaning.

---

## 7. Completion and compliance history

Employee may view their own history.

Manager/Owner may view authorized team-level status.

Minimum statuses:

- NOT_ASSIGNED
- ASSIGNED
- IN_PROGRESS
- COMPLETED
- OVERDUE
- RETRY_REQUIRED

Manager summary examples:

```text
30 employees assigned
27 completed
2 overdue
1 retry required
```

Useful dimensions:

- by employee;
- by store;
- by role/level;
- by topic;
- by published content version;
- by date/week.

Do not create a public employee ranking/leaderboard for rule failures in V1.

---

## 8. Canonical data model

Final names may be adjusted to existing database conventions, but the authority split must remain.

### 8.1 Content

```text
employee_knowledge_contents
- id
- content_type
- category
- title
- summary
- audience_rule
- status
- current_version_id
- created_by
- created_at
```

```text
employee_knowledge_versions
- id
- content_id
- version_number
- body
- effective_from
- effective_until
- acknowledgement_required
- priority
- published_by
- published_at
```

Published versions are immutable.

### 8.2 Questions

```text
employee_learning_questions
- id
- content_version_id
- question_type
- prompt
- answer_options
- correct_answer
- explanation
- role_target
- level_target
- active
```

Questions always point to a canonical content version.

### 8.3 Assignments

```text
employee_learning_assignments
- id
- employee_id
- assignment_type   # DAILY / WEEKLY / ACK
- due_date
- source_reason
- content_version_id nullable
- status
- assigned_at
- completed_at
```

### 8.4 Responses

```text
employee_learning_responses
- id
- assignment_id
- question_id
- employee_id
- selected_answer
- is_correct
- answered_at
```

### 8.5 Acknowledgements

```text
employee_rule_acknowledgements
- id
- employee_id
- content_version_id
- acknowledged_at
```

Avoid storing duplicate derived progress truth when it can be computed safely from assignments/responses.

---

## 9. Authorization

### Employee

May:

- view PUBLISHED content applicable to them;
- search/browse their authorized Regulation Library;
- complete their own assignments;
- see their own completion/attempt history;
- acknowledge applicable rules.

May not:

- edit canonical content;
- publish rules;
- edit correct answers;
- edit another employee’s completion;
- self-mark completion without answering/acknowledging.

### Store Manager

Within canonical Manager authority:

- view applicable employee completion status;
- see overdue/retry-required employees;
- view published employee content;
- later create/edit draft content only if Owner explicitly delegates that capability.

V1 should default content authority to Owner/admin rather than silently allowing every Manager to publish company policy.

### Owner

May:

- create/edit DRAFT content;
- publish/archive;
- assign audience/priority;
- manage question bank;
- inspect organization-wide completion;
- trigger required acknowledgement;
- review content/version history.

All writes must remain server-authorized and auditable.

---

## 10. Content management UX

Owner/Admin needs a non-technical editor.

Recommended navigation:

```text
Nhân viên
→ Học tập & Quy định
   → Kho quy định
   → Nhiệm vụ hằng ngày
   → Kiểm tra tuần
   → Tiến độ nhân viên
```

Content editor must support:

- title;
- category;
- content type;
- body;
- target audience;
- effective date;
- acknowledgement required yes/no;
- priority;
- question bank;
- preview as Employee;
- save draft;
- publish;
- archive.

No database/JSON fields should be exposed to normal Owner/Manager users.

---

## 11. Search and discoverability

Employee Regulation Library must include:

- keyword search;
- category filter;
- “Mới cập nhật”;
- “Bắt buộc”;
- “Dành cho cấp của tôi”;
- current-only default view.

A regulation/procedure must be reachable independently of Daily Task.

Daily Task is reinforcement, not the only way to access knowledge.

---

## 12. Scheduling integration

The first production use case is Weekly Availability/Scheduling compliance.

Approved business message:

- registration deadline is a canonical published rule;
- WebApp may remind employee before the deadline;
- Daily Task/Weekly Quiz may test this rule;
- completion does not substitute for actual Availability registration;
- Availability status remains authoritative in Workforce scheduling.

Do not mark “schedule registration completed” merely because an employee answered a quiz correctly.

The learning module may detect missed behavior and select a related learning topic, but must not mutate Workforce scheduling data.

---

## 13. Notifications and reminders

V1 should support in-app reminders.

Examples:

- Daily Task not completed;
- Weekly Quiz due;
- new mandatory acknowledgement;
- Availability registration deadline approaching.

Avoid notification spam.

Default concept:

- one prominent Home state;
- bounded reminder cadence;
- no duplicate repeated notification after completion.

Email/push channels are out of scope unless explicitly added later.

---

## 14. Metrics

Owner/Manager operational metrics may include:

- daily completion rate;
- weekly completion rate;
- overdue count;
- acknowledgement completion;
- most-missed topics;
- retention improvement by topic;
- completion by role/level/store.

Do not interpret quiz score alone as employee performance rating.

V1 is a knowledge/compliance signal, not a complete HR performance model.

---

## 15. Safety and governance boundaries

This module may record learning/compliance status.

It must not automatically impose payroll or disciplinary penalties.

Explicitly out of scope for V1:

- wage deduction;
- wage withholding;
- automatic shift reduction as punishment;
- automatic demotion;
- automatic termination;
- legal acknowledgement claims beyond actual product evidence.

Future disciplinary integration requires a separate Owner-approved policy, authority model and legal review.

---

## 16. Implementation plan

| ID | Work | Result | Gate |
|---|---|---|---|
| ELC-001 | Repository reconciliation + architecture contract | Map current Employee Home/Auth/role/Supabase conventions; lock integration points without parallel authority | **READY** |
| ELC-002 | Canonical Regulation Library schema | Versioned content, published state, audience targeting, RLS/authority | PENDING |
| ELC-003 | Owner Regulation Library CRUD | Draft/edit/preview/publish/archive with Vietnamese non-technical UX | PENDING |
| ELC-004 | Employee Regulation Library | Search, category filters, current published content, role/level visibility | PENDING |
| ELC-005 | Question bank schema + Owner editor | Questions bound to exact published content versions | PENDING |
| ELC-006 | Daily Task assignment engine | Normally 1 short task/day with deterministic eligibility and no spam | PENDING |
| ELC-007 | Employee Daily Task UX | Home card, answer, explanation, source-link, completion | PENDING |
| ELC-008 | Spaced repetition + personalization | Day 1/2/4/7/30 concept, wrong-answer priority, role/level targeting | PENDING |
| ELC-009 | Weekly Quiz engine + Employee UX | 5-question weekly reinforcement, retry/review flow | PENDING |
| ELC-010 | Mandatory acknowledgement | Version-bound acknowledgement, Employee UX, history | PENDING |
| ELC-011 | Manager/Owner completion dashboard | Team completion, overdue, retry, topic views under canonical scope | PENDING |
| ELC-012 | Scheduling compliance integration | Availability deadline content/reminders + learning signals without mutating Workforce truth | PENDING |
| ELC-013 | Notifications/reminders | Bounded in-app reminder logic, no duplicates after completion | PENDING |
| ELC-014 | Regression/security/accessibility | RLS, cross-role, page, reload, timezone, exact-main checks | PENDING |
| ELC-015 | Production-safe pilot | Small real employee cohort, verify assignment/completion/history and no schedule/payroll side effects | PENDING |
| ELC-016 | Full rollout + permanent-doc reconciliation | Roll out, reconcile durable rules into canonical docs, remove TEMP SOT when accepted | PENDING |
| ELC-O01 | Real regulation content population | Owner-approved actual MAGASIN policies/procedures/questions; may be progressively supplied after platform exists | **OWNER CONTENT GATE — DO LAST** |

---

## 17. Robot execution rules

Robot may execute ELC-001→ELC-016 continuously when dependencies are satisfied.

Rules:

1. Re-read this SOT before every task.
2. Execute only the authoritative current task.
3. Reconcile current main before changing code.
4. Preserve existing Employee/Manager/Owner authority and canonical Workforce truths.
5. Never introduce demo/fake employee business data into production.
6. Use migrations/RLS/RPC patterns consistent with current Supabase architecture.
7. Keep employee UI Vietnamese and Tabler-aligned with the existing WebApp.
8. Do not expose technical placeholders or internal authority details.
9. Do not auto-publish policy drafts.
10. Do not let quizzes or learning assignments mutate payroll, attendance or scheduling truth.
11. Add regression tests for every new authority/write path.
12. Only merge after required gates are GREEN.
13. Verify exact-main after merge.
14. If real policy wording requires Owner input, defer that content item to ELC-O01 and continue executable platform work instead of blocking the entire track.

---

## 18. V1 acceptance criteria

V1 is accepted only when:

- one canonical versioned Regulation Library exists;
- Employee can browse/search authorized current rules;
- Owner can draft/publish/archive without technical UI;
- Employee Home shows required learning work clearly;
- Daily Task normally takes under one minute;
- Weekly Quiz works with review/retry;
- important rules support explicit acknowledgement;
- completion history is bound to exact content versions;
- Manager/Owner can see authorized completion state;
- Level 3 can receive higher-responsibility questions;
- spaced repetition works without excessive repetition;
- scheduling reminders do not corrupt Workforce authority;
- no payroll/disciplinary automation exists;
- security/RLS/cross-role tests are GREEN;
- production pilot is proven;
- exact-main verification is GREEN.

---

## 19. Owner-approved first content theme

The first real topic should be **Weekly Availability / đăng ký lịch** because the test week showed that missing employee registrations can make staffing coverage and schedule testing incomplete.

Suggested initial learning sequence:

```text
Day 1:
Why weekly Availability must be registered before the deadline.

Day 2:
Scenario: employee forgot to register — what must they do?

Day 4:
Scenario: WebApp has an error — what must the employee do instead of silently skipping?

Day 7:
Weekly Quiz includes Availability rule.

Day 30:
Retention check.
```

Level 3 variant should additionally reinforce responsibility to model correct process and help less experienced employees understand the workflow.

Actual rule wording/deadlines must come from Owner-approved canonical content, not from hard-coded assumptions.

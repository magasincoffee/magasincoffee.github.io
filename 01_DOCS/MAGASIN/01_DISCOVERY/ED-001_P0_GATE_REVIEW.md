# ED-001 — P0 Gate Review & Discovery Map

## 1. Purpose

This document is the formal review of the Enterprise Baseline after the discovery evidence collected through C01–C114.

It does **not** create Business Rules. It determines whether the baseline is sufficient to enter P1 and identifies only material discovery gaps that can affect scope, ownership, process design, data integrity, controls, KPI, or profitability.

## 2. Enterprise objective / North Star

MAGASIN's target is to build a **Digital Operating System** based on real operating processes and data, with clear accountability and KPI by department and position, stronger revenue/cost/profit control, faster management decisions, continuous improvement, and sustainable growth.

Operating chain:

`VẬN HÀNH CHUẨN → DỮ LIỆU ĐÚNG → KPI RÕ → KIỂM SOÁT TỐT → QUYẾT ĐỊNH NHANH → HIỆU QUẢ TĂNG → LỢI NHUẬN TĂNG → TĂNG TRƯỞNG BỀN VỮNG`

KPI is therefore an **enterprise management scope**, not an isolated reporting feature. Formal KPI definitions remain a P1/P2 discovery task; current-state evidence confirms the need but does not yet define the final KPI rules.

## 3. P0 gate criteria review

| Gate criterion | Evidence basis | Assessment |
|---|---|---|
| Enterprise scope known | C01–C07, C14–C16, C30–C33, C95; scope covers 4 stores + warehouse and core operating domains | PASS — baseline scope is sufficiently bounded for discovery |
| Organization/network minimum confirmed | C04–C16, C51–C80 | PASS — current network, roles, responsibilities, authority and operating patterns are known |
| Main systems/data sources inventoried | C17–C20, C101–C107 | PASS — Sapo, delivery apps, Sheets/Forms, Zalo, bank/MoMo, current DB direction are inventoried at baseline level |
| Remaining assumptions identified | C105–C113 plus current ED-001 assumptions | PASS WITH OPEN ITEMS — material gaps are isolated below |
| Enough baseline to start D02–D12 without guessing scope | C01–C114 | PASS — discovery can proceed domain by domain; unresolved items should be treated as explicit GAP/ASSUMPTION, not silently filled |

### P0 gate decision

**P0 BASELINE: READY → ENTER P1.**

The evidence is sufficient to start D02–D12. There is no justification for another broad baseline questionnaire before beginning domain discovery.

Important: READY does not mean that every domain is complete. It means the enterprise boundary, operating network, responsibility model, current system landscape, and major financial/data-control context are sufficient to conduct P1 discovery without inventing scope.

## 4. Discovery map D01–D12

| Domain | Current evidence | Coverage | Material gaps / conflicts | Next layer |
|---|---|---:|---|---|
| D01 Enterprise Baseline | C01–C16, C95, C101–C114 | HIGH | Legal/entity identity is not independently documented; several governance items are target-state rather than current-state | P1 reference only; do not reopen broad baseline |
| D02 Organization | C11–C16, C19–C20, C53, C71–C72, C109 | HIGH | Dedicated store-manager role is proposed, not current; termination authority has historical ambiguity | Discover actual org chart, responsibility boundaries, approval matrix, delegation exceptions |
| D03 Store Operation | C51–C53, C73–C79 | HIGH | Some inspection/issue handover controls remain informal; quality/waste evidence is weak | Discover opening, trading, handover, incident, service recovery, closing flows and exceptions |
| D04 Workforce | C11–C15, C54–C72, C79 | HIGH | Tier governance, leave, offboarding/account deactivation and discipline contain case-by-case/manual behavior | Discover employee lifecycle and workforce decision points |
| D05 Schedule | C54–C66, C79 | HIGH | Shift-time model has overlap/ambiguity at CN1; exceptions and approval hierarchy need explicit handling | Discover scheduling rules, overrides, shortage handling, publication and acknowledgement |
| D06 Attendance | C58–C69 | HIGH | Current form captures manual time; late/early and correction governance partly manual; edit history absent | Discover attendance states, correction workflow, approval and payroll linkage |
| D07 Inventory | C35–C50, C81–C88, C105–C110 | HIGH | No structured waste/variance ledger; consumption not transaction-level; supplier quality/expiry checks limited; transfer and adjustment controls are partly manual | Discover inventory lifecycle, stock states, waste, variance, replenishment and purchasing |
| D08 Sales | C21–C29, C74–C78, C89–C91, C103–C104 | HIGH | Refund/cancellation/discount and delivery-fee treatment are manual; no formal closed-state/audit in current Sheets | Discover order lifecycle, payment states, delivery, cancellation/refund, reconciliation and close |
| D09 Finance | C24–C33, C88–C98, C103–C114 | HIGH | Business/personal money not fully separated; some expenses unrecorded; profit currently estimated from purchases rather than actual consumption; AP post-payment update weak | Discover cash/bank/MoMo, AP, costs, COGS, profit, close and correction flows |
| D10 Customer & Marketing | C07, C17–C18, C99–C100 | MEDIUM | Customer identity/history/CRM absent; campaign structure and promotion effectiveness not formally measured; paper loyalty only | P1 material discovery needed for customer, membership, promotion, voucher and retention processes |
| D11 Management | C14–C16, C67–C80, C103–C114 + North Star | MEDIUM | Formal KPI system absent; management reporting, KPI ownership, targets, scoring, reward/discipline/improvement chain not yet defined | P1 discovery must explicitly map management cadence, KPI and decision workflows |
| D12 Technology | C17–C20, C101–C107 | HIGH | Current source-of-truth is distributed; Supabase is future target; integration boundaries and technical constraints are incomplete | Discover system inventory, ownership, interfaces, data synchronization, security and migration constraints |

## 5. Critical facts already established

1. MAGASIN currently operates **4 stores + 1 warehouse** and no separate office (C04–C05).
2. The same selling model/menu operates across stores; channels include direct store, ShopeeFood, GrabFood, Green SM, Facebook/phone and direct delivery (C06–C08, C21–C24).
3. The General Manager currently combines HR, warehouse, accounting/finance administration, store operations and dispatch responsibilities (C11, C14–C15).
4. Owner retains final authority for strategy, pricing, promotions, procedures, major spend, managers and systems (C16).
5. Current operational data is distributed across Sapo, marketplace apps, Google Sheets/Forms, Zalo, bank and MoMo; there is no single current SSOT (C17–C20, C101–C107).
6. Inventory consumption, waste and variance are not yet captured with sufficient transaction-level structure for reliable actual COGS (C38, C84–C86, C93–C94).
7. Revenue is reconciled by management using Sapo + staff report + actual cash/transfer, but closed-state governance and audit history are not implemented in the current Sheets workflow (C89–C103, C110–C114).
8. Financial separation is incomplete: MAGASIN currently uses one personal Owner bank account plus one dedicated MAGASIN MoMo, with owner personal/business movements not fully separated (C95).
9. Customer/marketing data is not centralized and formal CRM/campaign measurement does not exist yet (C99–C100).
10. KPI is an explicit target of the future operating model, but formal KPI definitions and governance are not yet business rules (North Star; C104, C110–C114).

## 6. Material discovery gaps only

These are the gaps that should be carried into P1. They are **not** a request for another general baseline interview.

### G01 — Organization & authority matrix

Need a final operating view of current roles, responsibility boundaries, approval rights, delegation, and exceptions, especially for store management, discipline, termination and high-impact operational decisions.

### G02 — Store execution and exception handling

Need the real end-to-end execution flow for opening → trading → handover → incident/service recovery → closing, including what must be recorded, what can be silently corrected today, and which exceptions require escalation.

### G03 — Workforce lifecycle governance

Need the authoritative lifecycle for recruitment → trial → tiering → scheduling → evaluation → warning/discipline → resignation/termination → offboarding/account access, including who approves each transition.

### G04 — Schedule/attendance rule clarification

Need one canonical model for shift definitions, CN1 overlapping shifts, late/early cases, overtime, replacement, emergency understaffing, attendance correction and payroll impact.

### G05 — Inventory transaction model

Need the real business flow for receiving, transfer, store receipt, consumption, waste, stocktake, variance, adjustment, replenishment and supplier purchasing. Current gaps make actual consumption and inventory variance unreliable.

### G06 — Sales/payment/reconciliation state model

Need explicit lifecycle and ownership for order states, payment states, cancellation, refund, discount/promotion, delivery fee, direct delivery cash, reconciliation and close/correction.

### G07 — Finance/COGS/profit operating model

Need to distinguish cash control, expense recognition, AP, COGS, operating profit and owner transactions. Current month-end profitability is only an estimate and not yet a closed financial process.

### G08 — Customer/membership/marketing process

Need the intended operational processes for customer identification, loyalty/membership, voucher/promotion issuance and redemption, campaign setup/measurement, retention and ownership of customer data.

### G09 — KPI & management operating system

Need to discover management cadence and decision loops: department objectives → KPI → target → result → evaluation → reward/development/violation handling → improvement action → profit/growth impact. This must be discovered before KPI rules or dashboards are designed.

### G10 — Technology & migration boundaries

Need an implementation-neutral inventory of system responsibilities, interfaces, synchronization direction, authentication/account ownership, current DB boundaries and future migration constraints. Do not design the final architecture from current UI limitations.

## 7. Conflict / control register carried into P1

| ID | Issue | Current interpretation |
|---|---|---|
| X01 | CN1 shift schedule contains overlapping definitions | Treat as unresolved until D05/D06 discovery produces one canonical shift model |
| X02 | Termination authority has several historical answers | Treat as unresolved D02/D04 governance item |
| X03 | Attendance/time form mixes manual time and shift determination | Treat current behavior as implementation; discover intended attendance state model in D06 |
| X04 | Inventory transfer/adjustment history is partly manual/final-state only | Treat as control gap; discover transaction/audit requirements in D07 |
| X05 | Waste may be silently discarded | Treat as control gap; discover structured waste event + responsibility model in D07 |
| X06 | Excess cash has no stable handling rule | Treat as control gap; discover in D08/D09 |
| X07 | Some finance costs are not formally recorded | Treat as current-state gap; discover complete expense taxonomy and close in D09 |
| X08 | Profit uses purchase-based COGS estimate | Treat as current-state calculation limitation; discover target financial model in D09 |
| X09 | Customer/campaign effectiveness is estimated informally | Treat as current-state gap; discover D10 process and data requirements |
| X10 | Audit/close rules are target governance, not current Sheets behavior | Keep C110–C114 classified as target/decision evidence; do not describe as implemented controls |

## 8. Discovery stop condition for P1

P1 for a domain is complete when:

1. The main process can be described by `WHO → WHEN → TRIGGER → WHAT → HOW → DATA → DECISION → EXCEPTION → OUTPUT`.
2. Material variants and exceptions are explicitly recorded.
3. FACT, ASSUMPTION and DECISION are separated.
4. The process owner and decision authority are known.
5. The data produced/consumed by the process is identifiable.
6. No unresolved ambiguity remains that would change the resulting Business Rule, SOP or Data Model.

**No additional discovery question should be created merely to increase question count.** A new question is justified only when the answer can change one of the six conditions above or materially affect KPI/profitability/control design.

## 9. Next execution sequence

Proceed directly in this order:

`D02 Organization → D03 Store Operation → D04 Workforce → D05 Schedule → D06 Attendance → D07 Inventory → D08 Sales → D09 Finance → D10 Customer & Marketing → D11 Management/KPI → D12 Technology`

D01 remains the baseline reference and should not be repeatedly reopened unless new evidence changes enterprise scope.

## 10. Phase status after this review

| Phase | Status |
|---|---|
| P0 Enterprise Baseline | 🟢 READY / GATE PASSED FOR P1 |
| P1 Enterprise Discovery | 🔵 START NEXT |
| P2 Business Rules | ⚪ BLOCKED until relevant P1 domain completion |
| P3 SOP | ⚪ BLOCKED |
| P4 Data Model | ⚪ BLOCKED |
| P5 System | ⚪ BLOCKED |
| P6 Webapp | ⚪ BLOCKED |
| P7 Field Validation | ⚪ BLOCKED |
| P8 Governance | ⚪ BLOCKED |

## 11. Governance note

This gate review is a **discovery management artifact**, not a software specification. It intentionally does not define screens, tables, APIs, RPCs, UI behavior, automation or implementation details.

The governing principle remains:

```text
MAGASIN REALITY
      ↓
DISCOVERY
      ↓
BUSINESS RULE
      ↓
SOP
      ↓
DATA MODEL
      ↓
SYSTEM
      ↓
WEBAPP
```

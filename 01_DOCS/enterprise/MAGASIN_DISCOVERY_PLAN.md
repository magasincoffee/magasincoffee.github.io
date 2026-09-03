# MAGASIN — ENTERPRISE DISCOVERY & DEVELOPMENT PLAN

**Status:** FOUNDATION / IN PROGRESS
**Version:** 0.1

## Objective

Build a complete, evidence-based operating model before making major architectural or functional changes to the webapp.

## Phase 0 — Orientation

Confirm the ultimate objective, business scope, current stores, current systems and ownership model.

**Deliverable:** Master Objective + AI Context Contract.

## Phase 1 — Business Reality Discovery

Document how MAGASIN actually makes money and operates today.

Domains:

- business model;
- customer;
- products/menu;
- pricing;
- sales channels;
- stores;
- organization;
- people;
- suppliers;
- warehouse;
- finance;
- marketing;
- technology;
- decision making.

For each domain capture:

**CURRENT STATE → PAIN → CAUSE → DESIRED STATE → RULE → OWNER → DATA → CONTROL → KPI**

## Phase 2 — Operating Model Design

Design the repeatable model for running a store and the chain.

Outputs:

- organization and decision-rights matrix;
- store operating model;
- standard work / SOP framework;
- management cadence;
- exception/escalation model;
- store lifecycle;
- expansion playbook.

## Phase 3 — Economics & Control Model

Build a management model around profitable growth.

Outputs:

- store P&L model;
- unit economics;
- product economics;
- labor economics;
- channel economics;
- inventory / working-capital controls;
- cash controls;
- budget and forecast logic;
- KPI tree.

## Phase 4 — Data & System Architecture

Translate approved operating rules into a system architecture.

Outputs:

- master-data model;
- source-of-truth map;
- entity/relationship model;
- permissions matrix;
- audit model;
- event / workflow model;
- integrations map.

## Phase 5 — Software Architecture

Refactor or build software according to the approved operating model.

Architecture principles:

- one canonical owner per business capability;
- shared core only for genuinely shared concerns;
- no patch chains;
- no duplicate engines;
- no root-level feature sprawl;
- legacy code isolated and never used as production source-of-truth;
- webapp modules map to business capabilities.

## Phase 6 — Automation

Automate stable, repeatable rules first.

Prioritize:

1. data collection;
2. reconciliation;
3. alerts;
4. routine calculations;
5. recurring workflows;
6. approvals;
7. planning recommendations.

## Phase 7 — AI Decision Support

Introduce AI only after data, rules and workflows are sufficiently reliable.

Use AI for:

- forecasting;
- anomaly detection;
- root-cause analysis;
- scheduling recommendations;
- inventory recommendations;
- marketing analysis;
- management briefings;
- SOP assistance;
- cross-store pattern detection.

AI outputs that affect material money, people or control decisions require explicit authority and auditability.

## Phase 8 — Pilot & Validation

Pilot major capabilities in real stores before system-wide rollout.

Validation loop:

**DESIGN → PILOT → OBSERVE → MEASURE → FIX → STANDARDIZE → SCALE**

## Phase 9 — Replication & Expansion

Turn validated operating practices into repeatable store-opening and store-management playbooks.

The objective is for each new store to inherit the operating system rather than depend on informal knowledge from the Owner.

## Documentation standard

Every enterprise/domain document must have:

- purpose;
- scope;
- owner;
- status;
- version;
- human-readable rules;
- AI-readable contract where applicable;
- examples;
- exceptions;
- source/evidence;
- acceptance criteria;
- change history.

## Discovery question protocol

Questions are asked sequentially or in tightly related batches.

For each question:

1. Ask about real practice, not software.
2. Capture the answer.
3. Re-express it as proposed operating rules.
4. User confirms or corrects it.
5. Only confirmed rules are marked `CONFIRMED`.
6. Store confirmed rules in the appropriate human and AI-readable documents.
7. Continue to the next unresolved dependency.

No production rule should be inferred merely because it seems conventional.

## Quality gate before closing the discovery

Discovery is not complete until we can explain:

- how MAGASIN makes money;
- how one store operates minute-to-minute and day-to-day;
- how stores are managed as economic units;
- how people are hired, trained, scheduled and evaluated;
- how product and cash flow are controlled;
- how exceptions are escalated;
- how management sees the company remotely;
- how decisions are allocated by role;
- what the company measures and why;
- how the system learns and improves;
- how the model scales to more stores.

# MAGASIN — BUSINESS OPERATING SYSTEM FRAMEWORK

**Status:** PROPOSED FOUNDATION
**Version:** 0.1

## Purpose

This document defines the skeleton for discovering, designing, documenting, operating and continuously improving MAGASIN as a multi-store beverage business.

It is deliberately broader than the current webapp. The webapp must implement the approved operating model rather than become a substitute for defining it.

## 1. Enterprise architecture

### A. Strategy & Economics
- Vision and strategic positioning
- Target customer and market
- Business model
- Store-format economics
- Pricing architecture
- Unit economics
- Capital allocation
- Growth thresholds

### B. Customer & Commercial
- Customer segments
- Value proposition
- Menu architecture
- Product lifecycle
- Promotions
- Loyalty / CRM
- Direct and third-party channels
- Demand generation
- Customer feedback and recovery

### C. Store Operating System
- Store opening/closing
- Shift handover
- Beverage production standards
- Service standards
- Food safety / hygiene
- Equipment and maintenance
- Order throughput
- Peak-hour operating model
- Store audit
- Incident management

### D. People Operating System
- Organization design
- Job roles and accountability
- Recruitment
- Onboarding
- Training
- SOP certification
- Availability
- Scheduling
- Attendance
- Performance
- Compensation / incentives
- Employee development
- Discipline / offboarding

### E. Workforce Planning
- Demand forecast
- Required staffing by interval
- Employee availability
- Scheduling constraints
- Fairness / workload balancing
- Cross-store support
- Gap detection
- Manager review
- Publication
- Same-day exception handling

### F. Supply Chain & Inventory
- Procurement
- Supplier management
- Purchase planning
- Warehouse
- Store replenishment
- Stock counts
- Recipe / BOM control
- Yield
- Waste / shrinkage
- Stockout prevention
- Working capital

### G. Finance & Control
- Revenue integrity
- COGS
- Labor cost
- Store operating expenses
- Store contribution / operating profit
- Cash control
- Payment reconciliation
- Budgeting
- Forecasting
- Profit bridge
- Financial approval matrix

### H. Performance Management
- Company scorecard
- Store scorecard
- Manager scorecard
- Employee performance
- Daily/weekly/monthly cadence
- Target setting
- Variance analysis
- Root-cause analysis
- Corrective action
- Follow-up

### I. Governance & Risk
- Decision rights
- Segregation of duties
- Access control
- Audit trail
- Policy management
- Compliance
- Fraud controls
- Exception escalation
- Business continuity
- Change control

### J. Technology & Data
- Master data
- Source systems
- POS integration
- CRM
- Workforce
- Inventory
- Finance
- Reporting
- Notifications
- Workflow engine
- Audit log
- API / integration layer

### K. Automation & AI
- Rule-based automation
- Alerts
- Recommendations
- Forecasting
- Optimization
- AI assistants
- Agentic workflows
- Human approval gates
- Feedback loops
- Model governance

### L. Expansion System
- Site selection
- Store-format validation
- Pre-opening checklist
- Capex planning
- Hiring ramp
- Training ramp
- Supply setup
- Launch playbook
- First-90-day management
- Store maturity model
- Replication

## 2. Management architecture by level

### Owner / HQ
Owns strategy, capital, company economics, standards, risk and network-level performance.

### Operations / Area layer
When scale requires it, owns multiple stores and translates company standards into field execution.

### Store Manager
Owns store performance, people, execution, customer experience, compliance and local corrective action within delegated authority.

### Employee / Frontline
Executes the defined process, reports exceptions, maintains standards and receives only the information required to perform the role.

## 3. Store as the primary economic unit

Every store must eventually be measurable as an operating unit. Company reporting should roll up from store-level data rather than rely only on aggregate revenue.

Minimum store view:

**Sales → transactions / mix → COGS → labor → store OPEX → contribution → cash / working capital → service / quality indicators.**

## 4. Closed-loop management

Every critical process should be designed around:

**STANDARD → PLAN → EXECUTE → CAPTURE DATA → MEASURE → DETECT VARIANCE → ROOT CAUSE → ACTION → VERIFY → IMPROVE → UPDATE STANDARD**

## 5. Technology principle

A module is not complete merely because its screen works. A production capability needs:

- business rule;
- owner of the outcome;
- workflow;
- data source;
- permissions;
- KPI / control;
- exception path;
- audit trail;
- scalability test.

## 6. Reference industry lessons

The framework intentionally borrows principles visible in large restaurant chains. Yum! describes restaurant unit economics and a connected platform spanning ordering, POS, menu, inventory, labor and team-member tools as central to growth. Domino's describes its technology operating model as part of a broader system connecting store operations, supply chain and customer channels. Luckin emphasizes a technology-driven retail model connecting its app, store network, supply chain, inventory and workforce. BCG's restaurant practice explicitly links forecasting, labor scheduling, inventory flow, performance management and AI-enabled operating decisions. These are reference patterns, not instructions to copy any brand.

## 7. Discovery method

Before changing production software for a major domain:

1. Discover real-world practice.
2. Document current state.
3. Identify desired future state.
4. Define business rules.
5. Define roles and decision rights.
6. Define data and source of truth.
7. Design process and controls.
8. Only then design / refactor the software.
9. Pilot.
10. Review actual operating results.
11. Update the standard.

## 8. Documentation policy

For every major domain, maintain two artifacts:

### Human-readable document
Vietnamese, plain business language, examples and operating procedures.

### AI-readable contract
Structured terminology, stable IDs, explicit rules, constraints, entities, relationships, permissions, inputs/outputs, exceptions and acceptance criteria.

The AI-readable contract must not contradict the human-readable source. When a business rule changes, both are updated in the same change set.

## 9. Definition of success

MAGASIN succeeds when additional stores and employees can be added with predictable operating quality and improving economics, while management effort grows slower than store count.

The long-term objective is not maximum automation. It is **maximum controllability and scalability with profitable growth and reduced dependence on the Owner as the operational bottleneck.**

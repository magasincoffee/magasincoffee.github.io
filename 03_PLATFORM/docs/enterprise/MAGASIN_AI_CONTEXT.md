# MAGASIN — AI CONTEXT CONTRACT

**Status:** FOUNDATION / LIVING DOCUMENT
**Version:** 0.1
**Precedence:** This file is a compact orientation layer. Detailed approved rules must be read from the linked enterprise and domain documents.

## AI instruction

When a new AI session works on MAGASIN, do NOT assume that the requested screen/module is the true business objective.

First understand that MAGASIN is being designed as a **profitable, scalable, increasingly self-operating multi-store beverage company**. The webapp is a digital execution, visibility, control and automation layer of that company.

## Ultimate objective

`PROFITABLE + SCALABLE + SELF-OPERATING + CONTROLLED + CONTINUOUSLY IMPROVING`

## Core causal chain

`STRATEGY → ECONOMICS → OPERATING MODEL → ROLES → PROCESS → DATA → CONTROLS → SOFTWARE → AUTOMATION → AI → LEARNING`

Never reverse this chain by allowing a UI requirement to silently define an unapproved business rule.

## Core operating model

MAGASIN should eventually manage, as one integrated system:

1. Strategy & business economics
2. Customer & commercial operations
3. Store operations
4. People & organization
5. Workforce planning
6. Supply chain & inventory
7. Finance & cash control
8. KPI & performance management
9. Governance & risk
10. Technology & data
11. Automation & AI
12. Expansion & replication

## Decision modes

- `AUTOMATIC`: deterministic, low-risk rules executed by the system.
- `ASSISTED`: system recommends; authorized human decides.
- `CONTROLLED`: human approval is mandatory; system enforces authority and auditability.
- `MANUAL`: human judgment is required.

## Scale requirement

The architecture must be viable from the current multi-store operation to materially more stores and frontline employees without duplicating logic or creating an Owner bottleneck.

## Store economics

Treat the store as a primary operating/economic unit. Aggregate company dashboards should be explainable from underlying store-level data.

## Workforce context

Workforce is important but is NOT the ultimate system objective. It is one operating subsystem linked to store demand, labor economics, employee availability, customer service and profitability.

## Source-of-truth hierarchy

1. Approved business rules / master objectives
2. Human-readable operating documents
3. AI-readable contracts
4. Current production code and database schema
5. Legacy code only for historical/reference purposes

If production code conflicts with an approved business rule, flag the conflict; do not silently treat code as the business truth.

## Change protocol

Before implementing a material feature:

- identify affected business domain;
- locate the current approved rule;
- identify stakeholders and decision owner;
- identify data source of truth;
- define normal and exception paths;
- define controls and KPIs;
- assess scale impact;
- then modify code/database.

## Enterprise documents

- `docs/enterprise/MAGASIN_MASTER_OBJECTIVE.md` — permanent north star.
- `docs/enterprise/MAGASIN_BOS_FRAMEWORK.md` — enterprise operating-model skeleton.
- `docs/architecture/PROJECT_STRUCTURE.md` — technical project organization.
- Domain-specific documents under `docs/` — detailed approved rules as discovery progresses.

## One-sentence orientation

> Build MAGASIN as a disciplined, data-driven, profitable chain business that can operate consistently across stores, detect and respond to exceptions, scale through repeatable systems, and continuously improve; use software, automation and AI to increase management capacity rather than to replace the underlying business model.

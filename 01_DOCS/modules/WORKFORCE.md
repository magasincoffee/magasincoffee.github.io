# Workforce

Workforce is an Owner module with three independent engines.

## 01 — Demand

Purpose: define the number of people actually required for each store, day and time interval.

UI uses one number only: `Số lượng: X người`.

When saved, the same quantity is written to `minimum_headcount`, `target_headcount` and `maximum_headcount`.

## 02 — Review

Purpose: review employee registrations for one store and one week.

The Owner can edit start/end time and propose a move to another store. The current store is excluded from the destination list. A transfer request is created first; the destination store/authorized reviewer approves it before the employee's preferred store is changed.

The Review UI does not use the old `PREFERRED / AVAILABLE / CONFLICT / APPROVED` color convention and does not display a color legend, branch-transfer checkbox or note field.

## 03 — Publish

Purpose: generate a draft schedule, review it and publish the official schedule.

## Current color rule

Colors represent time-of-day shift classification, not availability status:

- `05:00–11:59` — Sáng — yellow
- `12:00–16:59` — Trưa/chiều — red/pink
- `17:00–23:59` — Tối — cyan/teal

This rule is shared through `MAGASIN_CORE.time.shiftKind` and must not be replaced by status-based colors.

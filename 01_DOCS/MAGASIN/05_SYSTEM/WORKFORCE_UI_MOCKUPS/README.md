# XSTORE-019 — Owner-approved UI mockups

These repository images are the **visual authority** for the XSTORE-019G→XSTORE-019J remediation cycle.

| Role | Authoritative image | Task |
|---|---|---|
| Manager | `XSTORE-019_OWNER_APPROVED_MANAGER.webp` | XSTORE-019G |
| Employee | `XSTORE-019_OWNER_APPROVED_EMPLOYEE.webp` | XSTORE-019H |
| Owner | `XSTORE-019_OWNER_APPROVED_OWNER.webp` | XSTORE-019I |
| Manager multi-employee schedule | `XSTORE-019J_OWNER_APPROVED_MULTI_EMPLOYEE_SHIFT_CLUSTER.svg` | XSTORE-019J |

The role files are compressed repository copies of screenshots explicitly reaffirmed by Owner on 2026-10-07. The XSTORE-019J Shift Cluster SVG transcribes the additional Owner-approved calendar design for multiple employees sharing/overlapping the same time range. Their visual composition, hierarchy and responsive intent are authoritative.

Rules:
- inspect the relevant role image before editing that role UI;
- treat the image as a visual contract, not as optional inspiration;
- screenshot numbers/names are illustrative UI content and are **not** production business-data authority;
- preserve all canonical SOT security, RBAC, scheduling and data rules even when reproducing the visual design;
- if a literal screenshot detail conflicts with canonical authority, preserve the canonical rule and reproduce the same visual intent safely;
- fixture-only QA cannot close the visual gate;
- XSTORE-019J must requalify the actual locally served application through the canonical login and real role routing;
- explicit Owner UI re-approval is mandatory before XSTORE-019K.

Additional XSTORE-019J rule:
- when multiple employees share or overlap a calendar time window, the approved visual contract is a grouped **Shift Cluster**, not parallel cramped employee cards;
- the cluster header exposes the time range and people count;
- show up to 3 employee rows directly, then `+N nhân viên` for overflow;
- no per-card horizontal scrollbar is allowed;
- Bước 3 uses the cluster interactively; Bước 4 reuses the same composition read-only.

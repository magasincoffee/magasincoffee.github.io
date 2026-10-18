# MAGASIN Product Import V1 — draft-only

## Scope and handoff

Source: Google Sheets `*BẢNG GIÁ VỐN`, spreadsheet ID `1E7sj2w2-vFp7kHvk7eAqIwJ1F8zLDq-Einj2w7SWx_Y`, selected tab `BẢNG BÁO GIÁ MỚI` (gid `696424871`). Read using the connected Google Drive/Sheets application; **never** commit raw prices, cost information or customer data to the public repository.

2026-10-18 preliminary read: 8 tabs; roughly 440 product-shaped rows in selected tab, **not yet validated as unique SKUs**. There are at least two column layouts: B=SKU/C=name near row 9, B=name/C=SKU in a later block. Prices include purchase cost and multiple quotation tiers, with old/new sheets showing differing prices. Status labels `SẴN KHO` and `CHỜ NHẬP HÀNG` do **not** equal counted on-hand inventory.

Implemented in this branch:
- `08_INTEGRATIONS/product-import/stage-sheet.mjs`: side-effect-free parser returning draft products and validation issues; detects two column layouts; parses packages; parses selected first-layout price tiers for review; never publishes.
- `09_QA/business-os/product-import-staging.test.mjs`: deterministic fixture checks without actual confidential prices.
- No database schema mutation, no live imports, no UI, no price publishing and no release.

## Safety/decisions

- **OWNER DECISION REQUIRED**: confirm whether `BẢNG BÁO GIÁ MỚI` is the approved current price source and `BẢNG BÁO GIÁ` is historical.
- Every staged row has `approval_status=DRAFT`, `publishable=false` regardless of sheet status.
- E/F in B-SKU layout represent purchase/package price (not sales); O–T are candidate per-piece quotation tiers by region/quantity, pending owner price approval. U–W unused until confirmed. C-SKU layout prices are **not mapped** and raise `PRICE_LAYOUT_NEEDS_REVIEW`.
- Do not interpret COST sheets as publicly quotable; never send cost, margin or raw sheet rows to Messenger.
- Do not infer inventory quantities from stock labels. Initial on-hand must come from approved stock count/receipt and movement ledger in **MAGASIN-NOIBO** Supabase.
- Verify the correct database project and existing procurement product master before any migration/import; never target `OPS-WebApp` project by default.

## Follow-up tasks

- [x] IMP-001 Read spreadsheet tab metadata, sample ranges, assess irregular headers.
- [x] IMP-002 Create safe draft parser and synthetic fixtures on isolated branch.
- [ ] IMP-003 Run synthetic tests in CI or local node and examine output.
- [ ] IMP-004 Perform full-sheet staging analysis in isolated runtime; report duplicates, malformed units, price irregularities **without publishing private source values**.
- [ ] IMP-005 Confirm authoritative price sheet and mapping for later C-SKU sections, region and print service pricing.
- [ ] IMP-006 Reconcile OPS existing schema, canonical items versus `procurement_products`, and exact Supabase project read-only.
- [ ] IMP-007 Implement import preview UI, per-row errors, differences and approval queue.
- [ ] IMP-008 Build transactional idempotent importer with audit/versioning and least-privilege RLS; dry-run first.
- [ ] IMP-009 Import approved catalog and price tiers; verify correctness with controlled QA; no inventory balances imported from price sheet.
- [ ] IMP-010 Add stock ledger/available stock and read-only catalog API for Cloudflare Messenger AI.
- [ ] IMP-011 E2E including incorrect/freshness/unknown prices and inventory, human fallback.

**Next:** IMP-003. Always re-read this file and PR state. Do not mark tests passed without execution proof.

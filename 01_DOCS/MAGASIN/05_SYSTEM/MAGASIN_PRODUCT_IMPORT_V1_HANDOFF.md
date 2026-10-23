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

## Owner decision — 2026-10-18 (confirmed in ChatGPT)

**AUTHORITATIVE PRICE-SHEET TAB:** `BẢNG BÁO GIÁ MỚI` (gid `696424871`) in spreadsheet `1E7sj2w2-vFp7kHvk7eAqIwJ1F8zLDq-Einj2w7SWx_Y`. Owner explicitly confirms this is the **official price sheet**. Older tab `BẢNG BÁO GIÁ` is **NOT** the active sale-price source; retain for historical comparison only. Hidden COST tabs are internal cost inputs and must never be exposed to customers/Messenger AI.

This decision resolves the source-of-truth question but **does not authorize automatic price publishing**: heterogeneous column layouts, tier definitions, anomalous values, customer/region eligibility and approvals must still be validated. Stock labels do not establish on-hand quantities. Continue draft staging and QA; do not deploy/import to Production solely on this decision.

**Next task remains IMP-003**: run staging parser tests, then IMP-004 full-sheet QA and IMP-005 detailed mapping/approval. Owner source confirmation portion of IMP-005 is complete; layout mapping is not.

## Detailed sheet audit — 2026-10-18

Full selected sheet scanned A1:X601; last nonempty row around 558, 512 nonempty rows and roughly 416 SKU-like rows detected by a broad heuristic, **not an exact imported product count**. Mixed layout is confirmed: in early rows B=SKU/C=name; other portions B=name/C=SKU. Distinct group headers occur around rows 9,18,29,36,59,68,78,95,103,113,117,124,148,171,179,201,218,227,243,255,258,262,272,277,286,295,300,311,316,321. Pricing and policy notes at rows 328-330; plastic lids section at 463-534 with header 464; accessory section at 535-558 with headers 536-537. Group boundaries must be validated rather than globally hardcoded.

Specific QA evidence:
- Row 10 `UKP65-140PP`: 1,000 pieces/bag; E/F are purchase/pack prices, O-Q and R-T show distinct quotation bands.
- `UKP95-700PP`: 1,000 pieces/bag; O-Q 556/546/526, R-T 471/461/441 (VND/piece formatted); **tier applicability requires owner confirmation**.
- `UKP95-PETLID FLAT` appears in multiple price regions; row 465 has U-W `#REF!`. Reject formula errors, never replace with zero or cost.
- Rows 538-555 accessory blocks contain multiple `#REF!` and no dedicated SKU column in some rows; require draft-only/manual code assignment.
- The sheet includes written effective-date, minimum-order, VAT, shipping and bulk-volume conditions around rows 328-330. Bind policies to applicable categories/price lists only after review; **do not apply universally**.
- `SẴN KHO` and `CHỜ NHẬP HÀNG` are source-sheet text statuses, not verified on-hand quantities.
- Broad heuristic saw repeated SKU names across regions: these are candidates for dedup/reconciliation, not proof of duplicate sellable products.

### Recommended normalized OPS ownership

`categories`, canonical `items/products`, `product_variants`, `product_packages`, internal `purchase_costs`, `price_lists`, `price_tiers`, `price_conditions`, `source_import_batches`, `source_import_rows`, `approval_events`, stock movement/reservation tables and images. Reuse/migrate existing procurement tables and canonical contract where possible. **Do not blindly create parallel tables**. Cost/price role separation required; public Messenger API sees only explicitly approved sell prices and availability, never cost or private annotations.

### Import phases

1. Read authorized sheet via connector/service; persist batch metadata and per-row provenance in secure storage, not public GitHub.
2. Detect layout by section and column signatures; assign each row a classification and confidence, flag formula errors, missing SKU, malformed package/unit, duplicate SKU, anomalous price and unresolved region.
3. Build approval preview UI: new/updated/unchanged/conflicted/error counts; allow fixing mappings and SKU before publish.
4. Approved transactional upsert uses stable source mapping + idempotency, maintains immutable historical price versions.
5. Importing a price sheet **must not affect stock ledger**, create sale orders or auto-enable Messenger quotation.

### Follow-up / acceptance criteria

- Update parser: add section-boundary segmentation, separate import of policy notes and no-SKU accessory rows, duplicates, formula detection. Current V1 parser is *only a first-stage heuristic* and cannot ingest all sheet rows correctly.
- Run suite with sanitized representative fixtures from all section layouts, then read-only full-sheet dry-run; report counts and row-level warnings internally.
- Verify no leakage of internal cost fields through sales API and enforce authorized price tiers by region/quantity; add human fallback for ambiguous tier.
- NEXT IMP-003 (execute tests), followed by IMP-004 complete audit & parser improvements. OWNER CONFIRMED `BẢNG BÁO GIÁ MỚI` as official source.

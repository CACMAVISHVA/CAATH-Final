# GST Certification Test Matrix

Date: 2026-06-04

Scope: GST Intelligence pilot certification for GSTR-1, GSTR-3B, purchase register, sales register, ITC reconciliation, and variance detection.

## Certification Summary

GST Intelligence is **conditionally certifiable for a controlled pilot** when GST data is already persisted in the expected operational tables. It is **not yet certified for unrestricted real-world raw-file ingestion**, because uploaded file contents are not currently parsed into durable GST records.

## Test Matrix

| ID | Area | Scenario | Expected Evidence | Current Evidence | Status |
|---|---|---|---|---|---|
| GST-CERT-001 | GSTR-1 | Upload GSTR-1 JSON for a client and period | Raw file stored, parsed, validated, and mapped to GSTR-1 records | Upload session records dataset and filename; parser produces artifact metadata only | FAIL |
| GST-CERT-002 | GSTR-1 | Retrieve persisted GSTR-1 values for variance analysis | `gstr1_data` queried by `client_id` and period | `SupabaseGSTRepository.getGstr1ByPeriod` reads persisted GSTR-1 data | PASS |
| GST-CERT-003 | GSTR-1 | Compare taxable value against GSTR-3B | Variance calculated from persisted filing data | `gstService.getGSTR1Vs3B` calculates variance and severity | PASS |
| GST-CERT-004 | GSTR-3B | Upload GSTR-3B JSON | Raw file stored, parsed, validated, and mapped to GSTR-3B records | Upload lane stores lineage metadata, not parsed return fields | FAIL |
| GST-CERT-005 | GSTR-3B | Retrieve persisted GSTR-3B values | `gstr3b_data` queried by `client_id` and period | `SupabaseGSTRepository.getGstr3bByPeriod` reads persisted GSTR-3B data | PASS |
| GST-CERT-006 | Purchase Register | Upload purchase register CSV/XLSX | File rows parsed into invoice-level purchase records | Parser does not inspect file content; record count is filename-derived | FAIL |
| GST-CERT-007 | Purchase Register | Retrieve persisted purchase invoices | Purchase invoices queried by client and period | `getPurchaseInvoices` reads `purchase_register` | PASS |
| GST-CERT-008 | Sales Register | Upload sales register CSV/XLSX | File rows parsed into sales records | Dataset is registered, but parser emits metadata artifact only | FAIL |
| GST-CERT-009 | ITC Reconciliation | Match GSTR-2B invoices against purchase register | Invoice-level matching by supplier GSTIN and invoice number | `getGSTR2BVsPurchase` matches persisted rows by composite invoice key | PASS |
| GST-CERT-010 | ITC Reconciliation | Detect missing ITC | Missing purchase invoices identified against GSTR-2B | Persisted table path produces `missingITC` | PASS |
| GST-CERT-011 | ITC Reconciliation | Detect excess ITC | Extra GSTR-2B invoices identified against purchase register | Persisted table path produces `extraITC` | PASS |
| GST-CERT-012 | ITC Reconciliation | Detect amount variance on matched invoice keys | Same invoice key with different taxable/tax amounts flagged | Current matching checks presence by key; amount mismatch is not fully certified | PARTIAL |
| GST-CERT-013 | Variance Detection | Detect GSTR-1 vs GSTR-3B taxable value variance | Variance threshold and severity applied | Thresholds exist in `gstService.getGSTR1Vs3B` | PASS |
| GST-CERT-014 | Anomaly Detection | Detect duplicates and vendor mismatch from real invoices | Findings based on invoice contents | Execution engine generates heuristic findings from counts | PARTIAL |
| GST-CERT-015 | Storage | Uploaded file survives refresh | Raw file retrievable after page refresh | Raw GST file is not persisted by upload lane | FAIL |
| GST-CERT-016 | Storage | Uploaded file survives logout/login | Raw file retrievable after new auth session | Validation artifact can persist; raw file cannot | PARTIAL |
| GST-CERT-017 | Tenant Isolation | GST data scoped to firm/client | Cross-firm data inaccessible | Repository scopes clients by firm and GST invoice RLS exists; raw upload isolation unproven | PARTIAL |
| GST-CERT-018 | Resolution Workflow | Findings become actionable workflow items | User can triage findings and persist resolution | Resolution workspace consumes generated results; durable closure is not fully proven | PARTIAL |

## Pilot Certification Dataset Requirements

For a pilot deployment, certification requires representative records for:

| Dataset | Minimum Pilot Fixture |
|---|---|
| GSTR-1 | At least one period with taxable value, GSTIN, and filing metadata |
| GSTR-3B | Matching period with taxable supply and liability fields |
| GSTR-2B | Supplier invoice records with supplier GSTIN, invoice number, date, taxable value |
| Purchase Register | Vendor invoice records with vendor GSTIN, invoice number, period, taxable value |
| Sales Register | Customer invoice records with recipient GSTIN, invoice number, taxable value |
| Reconciliation History | At least one clean match, one missing ITC case, one extra ITC case, and one variance case |

## Certification Decision

Decision: **CERTIFIED FOR CONTROLLED PILOT DEPLOYMENT - CONDITIONAL**

Conditions:

1. Pilot GST data must be loaded into the persisted GST tables before analysis.
2. The raw upload lane must be positioned as lineage and validation capture, not certified import.
3. Pilot users must not be promised that uploaded GST files are parsed into durable records until real parsers and storage are implemented.
4. Tenant isolation must be verified with two real firm contexts before production onboarding.

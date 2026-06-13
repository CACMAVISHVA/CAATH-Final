# GST Analysis Validation

Date: 2026-06-04

Scope: mismatch detection, ITC variance, filing variance, anomaly detection, and workflow integration.

## Analysis Summary

GST analysis has two distinct paths:

1. Persisted operational data analysis through `gstService` and `SupabaseGSTRepository`.
2. GST Intelligence execution findings generated from storage envelope lineage and count-based heuristics.

The persisted operational path is suitable for a controlled pilot. The count-derived execution path is useful as a directional workflow layer, but it is not audit-grade invoice analysis.

## Validation Results

| Capability | Expected Behavior | Current Evidence | Status |
|---|---|---|---|
| GSTR-1 vs GSTR-3B variance | Compare persisted taxable values for same client and period | `getGSTR1Vs3B` compares GSTR-1 taxable value with GSTR-3B taxable supply | PASS |
| Filing variance severity | Classify variance by materiality | Severity thresholds exist in `gstService` | PASS |
| GSTR-2B vs Purchase matching | Match invoice number and supplier/vendor GSTIN | `getGSTR2BVsPurchase` builds composite keys and compares persisted rows | PASS |
| Missing ITC detection | Identify purchase invoices missing from GSTR-2B | Persisted purchase records absent in GSTR-2B become `missingITC` | PASS |
| Extra ITC detection | Identify GSTR-2B invoices absent from purchase register | Persisted GSTR-2B records absent in purchases become `extraITC` | PASS |
| Amount variance on matched invoices | Flag same invoice key with different amount/tax values | Current matching is presence-based; amount variance is not fully certified | PARTIAL |
| Duplicate invoice detection | Detect duplicate invoice rows using invoice-level keys | Execution engine uses count-derived duplicate estimate | PARTIAL |
| Vendor anomaly detection | Detect vendor risk from persisted vendor behavior | Execution engine generates vendor-risk findings heuristically | PARTIAL |
| GST upload-driven analysis | Analyze data from newly uploaded raw files | Upload parser does not create durable GST rows | FAIL |

## Real Analysis Evidence

| Service | Evidence | Value |
|---|---|---|
| `SupabaseGSTRepository.getGstr1ByPeriod` | Reads `gstr1_data` by client and period | Enables GSTR-1 variance checks |
| `SupabaseGSTRepository.getGstr3bByPeriod` | Reads `gstr3b_data` by client and period | Enables GSTR-3B comparison |
| `SupabaseGSTRepository.getPurchaseInvoices` | Reads `purchase_register` by client and period | Enables purchase-side ITC analysis |
| `SupabaseGSTRepository.getGstr2bInvoices` | Reads `gst_invoices` for source `GSTR2B` | Enables GSTR-2B comparison |
| `gstService.getSnapshotReadiness` | Checks presence of required persisted datasets | Prevents analysis when required data is missing |

## Analysis Gaps

| Priority | Gap | Impact |
|---|---|---|
| P0 | Raw uploaded files do not feed analysis records | Pilot users may expect upload-to-analysis and not get it |
| P1 | Matched invoice amount variance is not fully certified | ITC leakage can be missed when invoice key exists but amount differs |
| P1 | Duplicate detection is count-derived | Duplicate claims may not be explainable from invoice evidence |
| P1 | Vendor anomaly findings are synthetic | Vendor risk cannot be presented as audit-grade |
| P2 | Severity thresholds are static | Different firms may require configurable materiality |

## Controlled Pilot Test Pack

| Fixture | Required Expected Result |
|---|---|
| Matching purchase and GSTR-2B invoice | No ITC mismatch |
| Purchase invoice missing from GSTR-2B | Appears in `missingITC` |
| GSTR-2B invoice missing from purchase register | Appears in `extraITC` |
| GSTR-1 taxable value differs from GSTR-3B by more than threshold | GSTR variance mismatch appears |
| Client with no GST data | Snapshot readiness marks missing datasets |

## Analysis Certification Decision

Decision: **CERTIFIED FOR CONTROLLED PERSISTED-DATA PILOT**

Not certified yet:

1. Raw upload to analysis.
2. Audit-grade anomaly claims from uploaded files.
3. Amount-level variance detection on matched invoice keys.

# GST Assumption Audit

Date: 2026-06-04

Purpose: identify hardcoded mappings, placeholder parsers, mock or simulated outputs, and assumptions that affect GST Intelligence pilot certification.

## Executive Summary

GST Intelligence contains a real operational service layer for persisted GST records, but the upload and execution layers still contain assumptions that prevent full raw-file certification.

The highest-risk assumption is that an uploaded GST file is equivalent to parsed GST data. Current upload evidence records dataset selection, filename, lineage, and validation metadata; it does not prove file-content ingestion.

## Hardcoded Mappings

| Area | File | Assumption | Risk |
|---|---|---|---|
| Parser selection | `src/domains/gst-intelligence/parsing-engine/parsingEngine.ts` | Dataset type maps directly to parser name, such as `gstr1-json-normalizer` | Parser name does not mean content parsing exists |
| Dataset schemas | `src/domains/gst-intelligence/dataset-registry/registry.ts` | Accepted formats and schema hints define expected inputs | Registry is declarative; enforcement is incomplete |
| GSTR-1 vs 3B severity | `src/domains/gst/services/gstService.ts` | Variance thresholds determine severity | Thresholds are useful but need firm-specific tolerance controls |
| Duplicate detection | `src/domains/gst-intelligence/validation-engine/validationEngine.ts` | Duplicate scan depends on artifact record counts | Artifact counts are not row-level invoice checks |
| Execution findings | `src/domains/gst-intelligence/execution-engine/executionEngine.ts` | Mismatch, duplicate, vendor, and risk findings are derived from counts | Can produce plausible but non-evidentiary findings |

## Placeholder or Incomplete Parsers

| Dataset | Current Parser Behavior | Certification Impact |
|---|---|---|
| GSTR-1 JSON | Creates parser artifact from filename and dataset type | Not certified for raw GSTR-1 JSON ingestion |
| GSTR-3B JSON | Creates parser artifact from filename and dataset type | Not certified for raw GSTR-3B JSON ingestion |
| Purchase Register | Creates parser artifact from filename and dataset type | Not certified for CSV/XLSX purchase import |
| Sales Register | Creates parser artifact from filename and dataset type | Not certified for CSV/XLSX sales import |
| GSTR-2B / GST invoices | Persisted repository path exists through `gst_invoices` | Certified only when records already exist in database |

## Simulated Outputs

| Output | Evidence | Risk |
|---|---|---|
| Missing ITC findings from execution engine | Synthetic keys such as generated invoice identifiers | Findings can look real without invoice-level source evidence |
| Vendor risks | Generated vendor labels and count-derived scores | Not suitable for client-facing certification without persisted vendor evidence |
| Duplicate risk | Count-derived duplicate estimates | Cannot replace row-level duplicate detection |
| Anomaly score | Heuristic scoring from lineage and validation state | Useful as pilot signal, not audit-grade proof |

## Real Operational Components

| Component | Evidence | Certification Value |
|---|---|---|
| Firm-scoped client lookup | `getClientsByFirm(firmId)` | Supports tenant-aware GST context |
| GSTR filing retrieval | `getFilingsByClient(clientId)` | Enables filing workflow analysis |
| GSTR-1 vs 3B variance | `getGSTR1Vs3B(clientId, period)` | Real persisted-data variance detection |
| GSTR-2B vs purchase reconciliation | `getGSTR2BVsPurchase(clientId, period)` | Real persisted-data ITC reconciliation |
| Validation artifact persistence | `recordGSTValidationArtifact` | Captures certification evidence and lineage metadata |

## Assumption Risk Register

| Risk | Severity | Required Closure |
|---|---|---|
| Uploaded raw GST files are not durably stored by GST upload flow | P0 for full certification | Persist files to firm/client/period-scoped storage |
| Uploaded file contents are not parsed | P0 for full certification | Implement deterministic parsers for JSON/CSV/XLSX GST datasets |
| Parsed upload records are not written to GST operational tables | P0 for full certification | Map parsed rows into `gstr1_data`, `gstr3b_data`, `purchase_register`, and `gst_invoices` |
| Execution engine can create synthetic findings | P1 for pilot trust | Mark generated findings as heuristic or replace with persisted-record analysis |
| Tenant isolation is inferred, not fully tested end-to-end | P1 | Run two-firm retrieval and storage tests |

## Audit Verdict

Verdict: **PARTIAL**

GST Intelligence can support a controlled pilot using preloaded persisted data. It cannot yet be represented as a certified raw GST file ingestion product.

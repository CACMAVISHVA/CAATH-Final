# GST End-to-End Trace

Date: 2026-06-04

Trace path:

Upload -> Storage -> Parsing -> Validation -> Persistence -> Analysis -> Findings -> Resolution Workflow

## Lifecycle Trace

| Step | Expected Production Behavior | Current Implementation Evidence | Status |
|---|---|---|---|
| Upload | User uploads real GSTR and register files, and file content enters the GST ingestion pipeline | `GSTIntelligenceCenter.handleDatasetUpload` calls `uploadDatasetInSession(uploadSession, dataset, file.name)` | PARTIAL |
| Storage | Raw uploaded files are durably stored and retrievable by firm, client, period, and dataset | Upload session stores filename and dataset state; no Supabase Storage write occurs in the GST upload path | FAIL |
| Parsing | JSON/CSV/XLSX contents are parsed into normalized GST records | `parseAndNormalizeSession` creates parser artifacts using dataset type and filename; it does not parse file contents | FAIL |
| Validation | GSTIN, period, schema, duplicate, and content-level checks run against parsed rows | `validateGSTStorageEnvelope` validates context and artifact metadata; duplicate scan depends on artifact record counts | PARTIAL |
| Persistence | Parsed records and validation artifacts persist across refresh and login sessions | Validation artifact can be recorded in `enterprise_activities`; parsed GST rows are not created by the upload lane | PARTIAL |
| Analysis | GST analysis runs against durable operational data | `gstService` reads persisted GSTR-1, GSTR-3B, purchase register, GSTR-2B, and filing data | PASS |
| Findings | Findings identify real mismatches, ITC gaps, filing variances, and anomalies | Persisted table reconciliation produces real missing/extra ITC arrays; execution engine also creates heuristic findings from counts | PARTIAL |
| Resolution Workflow | Findings can be triaged, assigned, resolved, and audited | GST workspace displays result sections and resolution-oriented data; durable resolution closure is not fully proven by the trace | PARTIAL |

## Code Evidence

| Area | File | Evidence |
|---|---|---|
| Upload UI | `src/components/GSTIntelligenceCenter.tsx` | Upload handler records dataset and filename, then builds a storage envelope |
| Upload session | `src/domains/gst-intelligence/upload-orchestrator/uploadOrchestrator.ts` | Session contains dataset status, filename, and messages |
| Parser | `src/domains/gst-intelligence/parsing-engine/parsingEngine.ts` | Parser artifact uses `records: item.fileName ? 1 : 0` |
| Dataset registry | `src/domains/gst-intelligence/dataset-registry/registry.ts` | GST datasets and accepted formats are registered |
| Validation | `src/domains/gst-intelligence/validation-engine/validationEngine.ts` | Validates context and artifact-level conditions |
| Repository | `src/domains/gst/repositories/SupabaseGSTRepository.ts` | Reads persisted GST operational tables |
| GST service | `src/domains/gst/services/gstService.ts` | Performs GSTR-1 vs 3B and GSTR-2B vs purchase analysis |
| Execution engine | `src/domains/gst-intelligence/execution-engine/executionEngine.ts` | Produces some findings from lineage counts and heuristics |
| Validation artifact | `src/services/gstProductionValidationService.ts` | Persists validation artifact into `enterprise_activities` |

## Trace Verdict

GST Intelligence has a usable **analysis path** for persisted GST records, but the **raw upload-to-record ingestion path is incomplete**.

The lifecycle is therefore:

| Certification Mode | Verdict |
|---|---|
| Raw uploaded GST files to finished analysis | FAIL |
| Persisted GST tables to operational analysis | PASS |
| End-to-end pilot with preloaded GST tables and validation artifacts | PARTIAL / CONDITIONAL PASS |

# GST Normalization Pipeline

Date: 2026-05-25

## Purpose
Ensure intelligence runs on normalized structured data, never raw uploads.

## Core Modules
- `src/domains/gst-intelligence/parsing-engine/parsingEngine.ts`
- `src/domains/gst-intelligence/storage/storageContracts.ts`
- `src/domains/gst-intelligence/adaptiveWorkflowOrchestrator.ts`

## Pipeline
`Upload -> Parse -> Normalize -> Validate -> Lineage Envelope -> Intelligence`

## Parsing Strategies
- `gst_json_parser`
- `excel_invoice_parser`
- `csv_tabular_parser`
- `archive_extractor`

## Storage Envelope
Includes tenant/client partitioning, lineage metadata, normalized schemas, and processing stage.

## Outcome
Scalable, auditable GST intelligence preparation architecture aligned to enterprise processing standards.

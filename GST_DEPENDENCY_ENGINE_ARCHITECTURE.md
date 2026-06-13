# GST Dependency Engine Architecture

Date: 2026-05-25

## Purpose
Resolve dataset requirements from selected GST analysis intent, instead of exposing manual upload complexity.

## Core Module
- `src/domains/gst-intelligence/dependency-engine/dependencyEngine.ts`

## Behavior
1. Input: selected preset + enabled modules.
2. Resolve required and optional dataset dependencies.
3. Add module-driven dataset enrichments.
4. Return orchestrated dependency package with rationale.

## Example
- `itc-deep-analysis`
  - Required: `GSTR2B_JSON`, `PURCHASE_REGISTER`
  - Optional: `VENDOR_MASTER`, `RECONCILIATION_HISTORY`

## Outcome
Adaptive analysis-driven ingestion requirements replace static upload design.

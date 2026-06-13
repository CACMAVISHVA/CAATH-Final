# GST Dataset Registry Guide

Date: 2026-05-25

## Purpose
Centralize GST dataset governance with explicit format/parsing/normalization contracts.

## Core Module
- `src/domains/gst-intelligence/dataset-registry/registry.ts`

## Registry Includes
- Dataset type definitions
- Accepted formats (`json`, `xlsx`, `xls`, `csv`, `zip`)
- Supported analysis mappings
- Parsing strategy
- Normalization contract
- Schema hint metadata

## Supported Dataset Types
- `GSTR1_JSON`
- `GSTR2B_JSON`
- `GSTR3B_JSON`
- `PURCHASE_REGISTER`
- `SALES_REGISTER`
- `EWAY_BILL_EXPORT`
- `VENDOR_MASTER`
- `GST_PORTAL_EXPORT`
- `RECONCILIATION_HISTORY`

## Outcome
Dataset behavior is governed and reusable across ingestion, validation, and analysis orchestration.

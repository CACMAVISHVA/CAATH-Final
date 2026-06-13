# GST Storage Validation

Date: 2026-06-04

Scope: uploaded file persistence, retrieval, refresh survival, logout/login survival, and tenant isolation.

## Storage Verdict

| Requirement | Result | Evidence |
|---|---|---|
| Uploaded files survive refresh | FAIL | GST upload session is React/session state; raw file is not written to durable storage |
| Uploaded files survive logout/login | FAIL | Raw file is not retrievable after authentication lifecycle reset |
| Uploaded files can be retrieved later | PARTIAL | Validation artifact can be retrieved from `enterprise_activities`; raw file cannot |
| Parsed GST records persist | PARTIAL | Persisted GST repositories exist, but upload lane does not populate them |
| Tenant isolation | PARTIAL | Persisted GST data uses firm/client scoping and RLS exists for `gst_invoices`; raw file isolation is unproven |

## Current Storage Paths

| Path | What Persists | What Does Not Persist |
|---|---|---|
| GST upload session | Dataset status, filename, period/client context while the component is active | Raw file bytes, parsed records, file retrieval handle |
| GST validation artifact | Envelope, validation result, lineage metadata in `enterprise_activities` | Original uploaded file |
| GST operational repository | Persisted filings, invoices, purchase data, GSTR data where database rows exist | Rows are not created by current upload parser |
| Supabase Storage / document vault | Available elsewhere in the product | Not used by current GST upload flow |

## Refresh Validation

| Test | Expected | Current Result | Status |
|---|---|---|---|
| Upload purchase register, refresh browser, inspect uploaded file list | File remains visible and retrievable | Upload session is lost unless represented by a saved artifact | FAIL |
| Upload GSTR-1 JSON, refresh, run analysis | Analysis uses parsed GSTR-1 rows | Analysis only works if rows already exist in operational tables | PARTIAL |
| Retrieve latest validation artifact after refresh | Artifact can be read by firm/client scope | `getLatestGSTValidationArtifact` supports retrieval | PASS |

## Logout/Login Validation

| Test | Expected | Current Result | Status |
|---|---|---|---|
| Upload GST file, logout, login, retrieve file | Same raw file available | No raw file persistence in GST flow | FAIL |
| Upload GST file, logout, login, view validation evidence | Latest artifact can be retrieved if recorded | Artifact path exists | PARTIAL |
| Login as another firm and retrieve prior firm GST artifact | Access blocked | Firm scoping exists in activity query; full browser test still required | PARTIAL |

## Tenant Isolation Review

| Layer | Evidence | Status |
|---|---|---|
| Clients | Repository reads clients by `firm_id` | PASS |
| GST invoices | Schema/migration evidence indicates firm/client fields and RLS tenant policy | PARTIAL |
| GST artifacts | Validation artifact written with `firm_id`, optional `client_id`, and metadata | PARTIAL |
| Raw GST files | No raw file storage path exists | FAIL |

## Required Storage Closure

| Priority | Item |
|---|---|
| P0 | Store raw uploaded GST files in firm/client/period/dataset scoped storage |
| P0 | Persist parsed upload rows into operational GST tables |
| P1 | Add retrieval UI for previously uploaded GST files and validation artifacts |
| P1 | Run two-firm tenant isolation test for files, artifacts, and GST table rows |
| P2 | Add retention policy and storage usage reporting for GST uploads |

## Storage Certification Decision

Decision: **NOT CERTIFIED FOR RAW GST FILE STORAGE**

Conditional pilot status: **PARTIAL PASS** only when GST files are imported outside this flow or GST operational rows are preloaded before analysis.

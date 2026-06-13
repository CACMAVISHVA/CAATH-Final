# GST Production Certification

Date: 2026-06-04

Objective: determine whether GST Intelligence is ready for pilot deployment using real-world GST data.

## Certification Decision

Decision: **CERTIFIED FOR CONTROLLED PILOT DEPLOYMENT - CONDITIONAL**

GST Intelligence is not certified for unrestricted raw-file ingestion. It is certifiable for a controlled pilot where GST operational records are already persisted in the expected tables and GST upload is used as lineage and validation evidence rather than as the source of parsed records.

## Scorecard

| Category | Score | Status | Rationale |
|---|---:|---|---|
| Upload | 45 / 100 | PARTIAL | User can select datasets and files, but file content is not durably uploaded through the GST flow |
| Storage | 50 / 100 | PARTIAL | Validation artifacts persist; raw files do not |
| Parsing | 35 / 100 | FAIL | Parser artifacts are metadata-level and do not parse JSON/CSV/XLSX contents |
| Persistence | 68 / 100 | PARTIAL | Operational GST repositories persist and retrieve records, but upload lane does not populate them |
| Analysis | 72 / 100 | PARTIAL PASS | Persisted table reconciliation and variance analysis work; heuristic findings remain |
| Workflow Integration | 64 / 100 | PARTIAL | GST workspace can present analysis and findings, but durable resolution closure is not fully proven |

Overall GST Certification Score: **56 / 100**

Controlled Pilot Score With Preloaded GST Tables: **72 / 100**

## PASS / FAIL / PARTIAL Summary

| Stage | Result |
|---|---|
| Upload | PARTIAL |
| Storage | PARTIAL |
| Parsing | FAIL |
| Validation | PARTIAL |
| Persistence | PARTIAL |
| Analysis | PARTIAL PASS |
| Findings | PARTIAL |
| Resolution Workflow | PARTIAL |
| Tenant Isolation | PARTIAL |

## What Is Certified

| Capability | Certification |
|---|---|
| Firm/client-scoped GST operational lookup | Certified for pilot |
| Persisted GSTR-1 vs GSTR-3B variance | Certified for pilot |
| Persisted GSTR-2B vs purchase reconciliation | Certified for pilot |
| Missing and extra ITC detection from persisted rows | Certified for pilot |
| Snapshot readiness for missing GST datasets | Certified for pilot |
| Validation artifact recording | Certified for pilot evidence |

## What Is Not Certified

| Capability | Reason |
|---|---|
| Raw GSTR-1 JSON ingestion | File contents are not parsed into durable records |
| Raw GSTR-3B JSON ingestion | File contents are not parsed into durable records |
| Purchase register CSV/XLSX ingestion | File rows are not parsed into purchase records |
| Sales register CSV/XLSX ingestion | File rows are not parsed into sales records |
| Raw GST file retrieval | GST upload flow does not persist raw files |
| Audit-grade anomaly engine | Some findings are count-derived and synthetic |
| Full tenant isolation proof | Needs two-firm runtime validation for files, artifacts, and GST rows |

## Pilot Certification Conditions

CAATH may run GST Intelligence in a pilot only if:

1. GST data is loaded into operational tables before analysis.
2. Pilot users are told that raw file upload is not yet the certified import path.
3. Every pilot GST finding includes its evidence source: persisted table analysis or heuristic intelligence.
4. Tenant isolation is validated with at least two firms before client onboarding.
5. Pilot scripts include refresh, logout/login, and retrieval checks.

## Required Closure Before Full Certification

| Priority | Item |
|---|---|
| P0 | Persist raw GST uploads to tenant-scoped storage |
| P0 | Implement deterministic parsers for GSTR-1 JSON, GSTR-3B JSON, purchase register, sales register, and GSTR-2B exports |
| P0 | Map parsed rows into operational GST tables |
| P0 | Prove refresh and logout/login retrieval for uploaded files |
| P1 | Add matched-invoice amount variance detection |
| P1 | Replace synthetic anomaly findings with row-level explainable evidence |
| P1 | Run two-firm tenant isolation tests |
| P2 | Add configurable materiality thresholds by firm |

## Final Verdict

GST Intelligence should be presented as:

**Certified for controlled pilot deployment using persisted GST operational data.**

It should not yet be presented as:

**Certified for real-world raw GST file ingestion and audit-grade automated analysis.**

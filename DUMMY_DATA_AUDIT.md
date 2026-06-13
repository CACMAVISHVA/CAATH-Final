# CAATH Dummy Data Audit

Date: 2026-06-04

## Executive Finding

The shell has been hardened to avoid fake live alert counts, but the broader application still requires a full source-of-truth audit before enterprise deployment. Many advanced dashboard/intelligence modules likely contain static arrays, sample records, generated demo snapshots, or deterministic placeholder values based on the current architecture-heavy module set.

## Known Dummy/Static Risk Areas

| Screen/module | Risk level | Reason | Deployment decision |
|---|---|---|---|
| Operations drawer | Low | Static workflow shortcuts only; no fake live metrics after hardening | Acceptable as action launcher |
| Dashboard | High | Executive metrics must be proven live and tenant-scoped | PARTIAL until each widget has data lineage |
| Analytics | High | Trends/metrics must be mapped to real events | PARTIAL |
| AI Copilot | High | Recommendations must be live, governed, auditable | PARTIAL |
| GST Intelligence | Critical | Type failures plus likely generated intelligence snapshots | BLOCKED |
| Governance dashboard | Medium | Governance/audit summaries need event-source verification | PARTIAL |
| Learning/knowledge modules | High | Moved out of primary nav; likely playbook/sample-heavy | MOVE until validated |
| Automation/autonomous/integration modules | High | Not primary deployment scope; may contain scenario/demo data | MOVE |
| Client portal overview | Medium | Must verify client-visible data is real and permission-scoped | PARTIAL |
| GodAdmin dashboard | High | Platform metrics and firm counts must be live | PARTIAL |

## Audit Rules For Dummy Data

Any screen is BLOCKED for production if it uses:

- hardcoded business metrics
- sample clients/tasks/notices
- generated percentages without live source
- `Math.random()` or synthetic trend generation
- static arrays presented as firm data
- local storage for business records
- AI recommendations without auditable source data

## Required Remediation

1. Add data lineage comments or docs for every dashboard metric.
2. Remove sample counters from executive surfaces.
3. Replace static intelligence snapshots with service-backed data.
4. Add empty states when real data is unavailable.
5. Add “not enough data” states instead of fake insights.

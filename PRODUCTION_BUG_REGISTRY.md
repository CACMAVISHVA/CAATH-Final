# Production Bug Registry

Date opened: 2026-06-04

Purpose: track defects discovered during internal pilot operations and classify whether they block a first customer.

## Severity Definitions

| Severity | Definition | Response |
|---|---|---|
| P0 | Blocks first customer, causes data loss, security breach, tenant leakage, broken login, or core workflow failure | Fix before pilot continuation |
| P1 | Must fix before scale; workaround exists but creates operational risk or user mistrust | Fix before external paid rollout |
| P2 | Enhancement, polish, or efficiency improvement | Schedule after pilot stabilization |

## Bug Registry

| ID | Date | Module | Title | Severity | Status | Reproduction | Expected | Actual | Owner |
|---|---|---|---|---|---|---|---|---|---|
| BUG-20260604-001 | 2026-06-04 | GST | Raw GST upload does not persist original file | P0 for full GST certification, P1 for controlled pilot | Open | Upload GST file, refresh, attempt retrieval | File remains retrievable | Only lineage/artifact path is available | Engineering |
| BUG-20260604-002 | 2026-06-04 | GST | Upload parser does not parse file contents into GST records | P0 for full GST certification, P1 for controlled pilot | Open | Upload GSTR/Purchase file and run analysis | Parsed rows feed analysis | Analysis requires preloaded operational tables | Engineering |
| BUG-20260604-003 | 2026-06-04 | GST | Some GST findings are heuristic rather than invoice-evidenced | P1 | Open | Run GST Intelligence execution from lineage counts | Findings link to source rows | Some findings use generated counts/labels | Engineering |
| BUG-20260604-004 | 2026-06-04 | Tenant isolation | Full two-firm GST artifact/file isolation proof not complete | P1 | Open | Validate access across two firm sessions | Cross-tenant access blocked | Evidence is inferred from scoping/RLS, not runtime tested | QA |

## Empty Bug Intake Template

| Field | Value |
|---|---|
| Bug ID |  |
| Date found |  |
| Reporter |  |
| Role |  |
| Module |  |
| Severity |  |
| Environment |  |
| Reproduction steps |  |
| Expected result |  |
| Actual result |  |
| Data affected |  |
| Tenant affected |  |
| Workaround |  |
| Owner |  |
| Target fix date |  |
| Verification evidence |  |

## P0 Closure Rules

A P0 cannot be closed unless:

1. Reproduction steps no longer fail.
2. The fix is verified after refresh.
3. The fix is verified after logout/login if user/session data is involved.
4. Tenant isolation is checked if firm/client data is involved.
5. The workflow owner confirms business acceptance.

# Compliance Engine Architecture

## Foundation
- Types and retention policies under `src/domains/compliance/`.
- Repository interface for append-only audit ingestion.
- Orchestrator for immutable compliance audit append flow.

## Compliance Guarantees
- Audit records are append-oriented.
- Retention policies are explicit and centrally managed.
- Workflow, AI, and security actions can converge into a common compliance trail.

## Future Enhancements
- Cryptographic chain-of-custody signatures
- Regulatory export bundles
- Investigation workspace timelines

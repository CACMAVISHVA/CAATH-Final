# AI Governance Architecture

## Components
- Policies: `src/domains/ai-governance/policies/aiUsagePolicies.ts`
- Masking: `src/domains/ai-governance/masking/sensitiveDataMasker.ts`
- Audit trail: `src/domains/ai-governance/audit/aiGovernanceAuditService.ts`
- Orchestration: `src/domains/ai-governance/services/AIGovernanceOrchestrator.ts`

## Guardrails
- Prompt size enforcement per workflow type.
- Sensitive data masking before provider interaction.
- Explicit allow/block/approval decisions.
- Audit logging for AI decisions and actor context.

## Future AI Roadmap
- Human approval queues for high-impact AI actions.
- Hallucination risk scoring and confidence routing.
- Policy versioning and tenant-specific AI governance packs.

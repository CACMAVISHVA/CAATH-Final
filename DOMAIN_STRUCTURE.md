# Domain Structure

## Domain Boundaries
- `auth`: identity/session lifecycle, auth policy checks.
- `billing`: invoice and monetization flows.
- `gst`: compliance automation and reconciliation.
- `documents`: vault, extraction, lifecycle governance.
- `tickets`: support/escalation workflows.
- `ai`: providers, prompts, policies, workflows, audit.
- `governance`: audit/compliance controls.
- `analytics`: metrics computation and cache pipelines.
- `portal-management`: client portal access and secrets.
- `notifications`: alerts and communication channels.

## Rule
UI modules call services/use-cases; use-cases call repositories/API; infrastructure handles transport and observability.

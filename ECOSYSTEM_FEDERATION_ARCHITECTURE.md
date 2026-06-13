# CAATH Ecosystem Federation Architecture

CAATH ecosystem federation is adapter-based external coordination across government systems, communication providers, workflow webhooks and future enterprise systems.

## Core Domains

- `src/domains/integration-fabric/`: connector contracts, registry, governance policies, runtime safeguards and federation snapshot.
- `src/domains/integration-dashboard/`: operator visibility for health, dependencies, credential governance and external workflow events.
- `src/domains/action-system/`: governed UI execution for validation, credential rotation and circuit reset controls.

## Design Principles

- Use provider adapters, not fragile hardcoded integrations.
- Never expose raw credentials across domains.
- Keep integrations decoupled from workflow state mutation.
- Every external action must carry source workflow, target system, trace and governance lineage.

## Federation Strategy

The fabric represents integrations as governed connectors with lifecycle state, vault references, health scores, rate policies and audit lineage. Workflow systems consume connector state and recommendations rather than owning external credentials directly.

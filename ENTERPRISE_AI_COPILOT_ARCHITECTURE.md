# Enterprise AI Copilot Architecture

CAATH's AI copilot layer is a workflow-native decision assistance system, not a generic chatbot. It connects operational analytics, organizational memory, governance, integrations and workflow surfaces into a governed recommendation runtime.

## Architecture

- `src/domains/ai-copilot/` defines typed AI context, recommendations, executive briefings, governance policies, safeguards and analytics.
- `OperationalCopilotOrchestrator` generates permission-aware recommendations with source workflows, reasoning, confidence and audit lineage.
- `src/domains/ai-command-center/` renders the operational AI command surface for recommendations, executive narratives, policies and AI activity.
- The route `ai-copilot` is exposed through sidebar navigation, role permissions, command palette and the action registry.

## Principles

- AI recommends; operators execute.
- Every recommendation includes reasoning, lineage, governance rationale and confidence.
- Sensitive guidance is permission-scoped.
- Action routing uses existing CAATH command surfaces.
- The copilot does not bypass approval chains, governance checkpoints or workflow ownership.

## Runtime Boundaries

The current implementation is frontend runtime infrastructure. It prepares contracts and UX for future provider/model federation while keeping execution safe, explainable and operator-controlled.

# GST Workflow Intelligence

Date: 2026-05-25

## Workflow Role
GST intelligence now acts as an operational workflow trigger layer for:
- notice response workflows
- task assignment workflows
- audit preparation workflows
- escalation workflows

## Integration Model
- Engine execution emits telemetry (`gst_intelligence_engine_executed`).
- Output risk vectors drive downstream operational decisions.
- AI recommendations are mapped to workflow-oriented actions.

## Recommended Workflow Bridges
1. Create task for high-risk module findings.
2. Create escalation for audit score below threshold.
3. Link mismatch clusters to notice tracking.
4. Push summary into operational dashboard snapshots.

## Realtime Operations
- Context refresh loop updates operational state every 60 seconds.
- Re-run engine after context changes for live risk posture updates.

## Next Steps
- Add one-click command actions from insight cards.
- Add notification runtime adapters for high-priority GST alerts.
- Add collaboration thread links per insight/risk item.
